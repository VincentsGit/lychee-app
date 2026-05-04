import os
import re
import secrets
import shutil
import sqlite3
import json
import html
from datetime import datetime
from urllib.parse import urlparse

import requests
from flask import Flask, g, jsonify, make_response, request, send_from_directory
from flask_cors import CORS  # type: ignore
from werkzeug.security import check_password_hash, generate_password_hash

IMG_SRC_REGEX = r'<img[^>]+src="([^">]+)"'
DEFAULT_ABOUT = """
<p>Hi! Welcome to my website.</p>
<p>This is where I can write a bit more about myself, keep my blog posts together, and make the site feel more like me.</p>
"""
OLD_DEFAULT_ABOUT = """
<p>Welcome to lychee, a small personal corner of the internet for writing, updates, and notes worth keeping.</p>
<p>This page can now be edited by runitrench from the website.</p>
"""

app = Flask(__name__)
app.config["DATABASE"] = "instance/app.db"
CORS(app, supports_credentials=True)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
TMP_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "tmp-uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TMP_UPLOAD_FOLDER, exist_ok=True)

STEAM_API_KEY = os.environ.get("STEAM_API_KEY", "")
STEAM_ID = os.environ.get("STEAM_ID", "")
STEAM_TIMEOUT = 12
STEAM_STORE_FETCH_LIMIT_PER_COUNTRY = 70


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(
            app.config["DATABASE"],
            detect_types=sqlite3.PARSE_DECLTYPES,
        )
        g.db.row_factory = sqlite3.Row
    return g.db


def column_exists(db, table, column):
    rows = db.execute(f"PRAGMA table_info({table})").fetchall()
    return any(row["name"] == column for row in rows)


TRAVEL_POST_IDS = (15, 33, 34, 35)


def strip_tags(html):
    text = re.sub(r"<br\s*/?>", "\n", html or "", flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def extract_links(html):
    return re.findall(r'href="([^"]+)"', html or "")


def split_travel_content(html):
    blocks = re.findall(r"<p[^>]*>(.*?)</p>", html or "", flags=re.IGNORECASE | re.DOTALL)
    items = []
    notes = []
    fallback_links = extract_links(html)
    for index, block in enumerate(blocks):
        text = strip_tags(block).strip()
        if not text:
            continue
        link_match = re.search(r'href="([^"]+)"', block)
        url = link_match.group(1) if link_match else ""
        title = re.sub(r"^[-\s]+", "", text).strip()
        looks_like_item = text.startswith("-") or url or len(title) <= 120
        if looks_like_item:
            items.append({
                "dayLabel": "",
                "timeLabel": "",
                "title": title[:180],
                "description": "" if url else title[180:],
                "url": url,
                "sortOrder": index,
            })
        else:
            notes.append(text)
    if not items and html:
        items.append({
            "dayLabel": "",
            "timeLabel": "",
            "title": "Original notes",
            "description": strip_tags(html),
            "url": fallback_links[0] if fallback_links else "",
            "sortOrder": 0,
        })
    return "\n\n".join(notes), items


def infer_trip_dates(title):
    title = title or ""
    if "May 22nd" in title:
        return "2026-05-22", "2026-05-25"
    if "May 4th" in title:
        return "2026-05-04", "2026-05-06"
    if "September 2nd" in title:
        return "2026-09-02", "2026-09-04"
    return "", ""


def infer_destination(title):
    if "Cruise" in title:
        return "Canary Islands cruise"
    return re.sub(r"\s+(May|September).*$", "", title or "").strip()


def migrate_travel_posts(db):
    placeholders = ",".join("?" for _ in TRAVEL_POST_IDS)
    posts = db.execute(
        f"SELECT id, title, content, created_at FROM posts WHERE id IN ({placeholders})",
        TRAVEL_POST_IDS,
    ).fetchall()
    for post in posts:
        existing = db.execute(
            "SELECT id FROM travel_plans WHERE source_post_id = ?",
            (post["id"],),
        ).fetchone()
        if existing:
            continue
        notes, items = split_travel_content(post["content"])
        start_date, end_date = infer_trip_dates(post["title"])
        cursor = db.execute(
            """
            INSERT INTO travel_plans (title, destination, start_date, end_date, notes, source_post_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                post["title"],
                infer_destination(post["title"]),
                start_date,
                end_date,
                notes,
                post["id"],
                post["created_at"],
                datetime.now(),
            ),
        )
        plan_id = cursor.lastrowid
        for item in items:
            db.execute(
                """
                INSERT INTO travel_items (plan_id, day_label, time_label, title, description, url, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    plan_id,
                    item["dayLabel"],
                    item["timeLabel"],
                    item["title"],
                    item["description"],
                    item["url"],
                    item["sortOrder"],
                ),
            )
    db.execute(
        f"UPDATE posts SET category = 'travel' WHERE id IN ({placeholders})",
        TRAVEL_POST_IDS,
    )


def init_db():
    db = get_db()
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL
        )
        """
    )
    for statement in [
        ("display_name", "ALTER TABLE users ADD COLUMN display_name TEXT"),
        ("about_me", "ALTER TABLE users ADD COLUMN about_me TEXT DEFAULT ''"),
        ("avatar_url", "ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''"),
        ("created_at", "ALTER TABLE users ADD COLUMN created_at DATETIME"),
    ]:
        if not column_exists(db, "users", statement[0]):
            db.execute(statement[1])

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT NULL,
            status TEXT NOT NULL DEFAULT 'published'
        )
        """
    )
    if not column_exists(db, "posts", "status"):
        db.execute("ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'published'")
    if not column_exists(db, "posts", "category"):
        db.execute("ALTER TABLE posts ADD COLUMN category TEXT NOT NULL DEFAULT 'blog'")
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS cookies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            cookie_value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER,
            FOREIGN KEY (updated_by) REFERENCES users(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS steam_store_cache (
            appid INTEGER NOT NULL,
            country TEXT NOT NULL,
            payload TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (appid, country)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS travel_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            destination TEXT DEFAULT '',
            start_date TEXT DEFAULT '',
            end_date TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            source_post_id INTEGER UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS travel_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id INTEGER NOT NULL,
            day_label TEXT DEFAULT '',
            time_label TEXT DEFAULT '',
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            url TEXT DEFAULT '',
            is_done INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME DEFAULT NULL,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (plan_id) REFERENCES travel_plans(id)
        )
        """
    )
    if not column_exists(db, "travel_items", "is_done"):
        db.execute("ALTER TABLE travel_items ADD COLUMN is_done INTEGER DEFAULT 0")
    if not column_exists(db, "travel_items", "created_at"):
        db.execute("ALTER TABLE travel_items ADD COLUMN created_at DATETIME")
    if not column_exists(db, "travel_items", "completed_at"):
        db.execute("ALTER TABLE travel_items ADD COLUMN completed_at DATETIME")
    db.execute("UPDATE travel_items SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)")
    migrate_travel_posts(db)
    db.execute(
        """
        INSERT OR IGNORE INTO pages (slug, title, content)
        VALUES ('about', 'About', ?)
        """,
        (DEFAULT_ABOUT,),
    )
    db.execute(
        "UPDATE pages SET content = ? WHERE slug = 'about' AND content = ?",
        (DEFAULT_ABOUT, OLD_DEFAULT_ABOUT),
    )
    db.execute(
        """
        UPDATE users
        SET display_name = COALESCE(NULLIF(display_name, ''), username)
        WHERE display_name IS NULL OR display_name = ''
        """
    )
    db.execute("UPDATE users SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)")
    db.commit()


@app.before_request
def before_request():
    init_db()


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def row_to_user(user):
    if not user:
        return None
    return {
        "id": user["id"],
        "username": user["username"],
        "displayName": user["display_name"] or user["username"],
        "aboutMe": user["about_me"] or "",
        "avatarUrl": user["avatar_url"] or "",
        "createdAt": user["created_at"],
    }


def cleanup_expired_cookies():
    db = get_db()
    db.execute("DELETE FROM cookies WHERE datetime(created_at, '+7 days') <= CURRENT_TIMESTAMP")
    db.commit()


def authorise(session_id):
    if not session_id:
        return None
    db = get_db()
    return db.execute(
        """
        SELECT users.id, users.username, users.display_name, users.about_me, users.avatar_url, users.created_at
        FROM users
        JOIN cookies ON users.id = cookies.user_id
        WHERE cookies.cookie_value = ?
        """,
        (session_id,),
    ).fetchone()


def current_user():
    cleanup_expired_cookies()
    return authorise(request.cookies.get("session_id"))


def is_runitrench(user):
    return bool(user and user["username"] == "runitrench")


def save_session(user):
    db = get_db()
    session_id = secrets.token_urlsafe(32)
    db.execute("INSERT INTO cookies (user_id, cookie_value) VALUES (?, ?)", (user["id"], session_id))
    db.commit()
    resp = make_response(jsonify({"user_id": user["id"], "user": row_to_user(user), "message": "Login successful"}))
    resp.set_cookie(
        "session_id",
        session_id,
        httponly=True,
        secure=True,
        samesite="Strict",
        max_age=7 * 24 * 60 * 60,
    )
    return resp


def migrate_images(content):
    image_sources = re.findall(IMG_SRC_REGEX, content or "")
    for src in image_sources:
        parsed = urlparse(src)
        if not parsed.path.startswith("/tmp-uploads/"):
            continue
        filename = os.path.basename(parsed.path)
        src_path = os.path.join(TMP_UPLOAD_FOLDER, filename)
        dst_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(src_path):
            shutil.move(src_path, dst_path)
            content = content.replace(f"/tmp-uploads/{filename}", f"/uploads/{filename}")
    return content


def clear_tmp_uploads():
    for filename in os.listdir(TMP_UPLOAD_FOLDER):
        file_path = os.path.join(TMP_UPLOAD_FOLDER, filename)
        if os.path.isfile(file_path):
            os.remove(file_path)


def normalise_post_payload(data):
    title = (data.get("title") or "").strip()
    content = data.get("content") or ""
    status = data.get("status") or "published"
    if status not in ("draft", "published"):
        status = "published"
    if status == "draft":
        title = title or "Untitled draft"
    return title, content, status


def chunked(items, size):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def steam_get_json(url, params):
    response = requests.get(
        url,
        params=params,
        timeout=STEAM_TIMEOUT,
        headers={
            "Accept": "application/json,text/plain,*/*",
            "Accept-Language": "en-GB,en;q=0.9",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        },
    )
    response.raise_for_status()
    return response.json()


def fetch_owned_steam_games():
    if not STEAM_API_KEY or not STEAM_ID:
        return None, "Steam is not configured. Add STEAM_API_KEY and STEAM_ID to the backend environment."

    data = steam_get_json(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
        {
            "key": STEAM_API_KEY,
            "steamid": STEAM_ID,
            "include_appinfo": 1,
            "include_played_free_games": 1,
            "format": "json",
        },
    )
    games = data.get("response", {}).get("games", [])
    return games, None


def fetch_steam_store_details(appids, country_code):
    db = get_db()
    details = {}
    for appid in appids:
        cached = db.execute(
            "SELECT payload FROM steam_store_cache WHERE appid = ? AND country = ?",
            (appid, country_code),
        ).fetchone()
        if cached:
            details[str(appid)] = json.loads(cached["payload"])

    for group in chunked(appids, 100):
        try:
            data = steam_get_json(
                "https://api.steampowered.com/IStoreBrowseService/GetItems/v1/",
                {
                    "key": STEAM_API_KEY,
                    "input_json": json.dumps({
                        "ids": [{"appid": appid} for appid in group],
                        "context": {
                            "country_code": country_code.upper(),
                            "language": "english",
                        },
                        "data_request": {
                            "include_all_purchase_options": True,
                            "include_basic_info": True,
                            "include_release": True,
                        },
                    }),
                },
            )
            for item in data.get("response", {}).get("store_items", []):
                appid = item.get("appid") or item.get("id")
                if not appid:
                    continue
                payload = store_item_to_details(item, country_code)
                details[str(appid)] = payload
                db.execute(
                    """
                    INSERT INTO steam_store_cache (appid, country, payload, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(appid, country)
                    DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
                    """,
                    (appid, country_code, json.dumps(payload), datetime.now()),
                )
            db.commit()
        except requests.RequestException:
            for appid in group:
                details.setdefault(str(appid), {"success": False})
    return details


def store_item_to_details(item, country_code):
    data = {
        "name": html.unescape(item.get("name") or ""),
        "release_date": {},
    }
    release = item.get("release") or {}
    release_timestamp = release.get("steam_release_date")
    if release_timestamp:
        data["release_date"]["date"] = datetime.utcfromtimestamp(release_timestamp).strftime("%d %b, %Y").lstrip("0")

    option = item.get("best_purchase_option") or {}
    final_cents = option.get("final_price_in_cents")
    if final_cents is not None:
        try:
            final = int(final_cents)
            discount_percent = int(option.get("discount_pct") or option.get("bundle_discount_pct") or 0)
            initial = int(option.get("original_price_in_cents") or option.get("price_before_discount") or final)
            data["price_overview"] = {
                "currency": "ZAR" if country_code.lower() == "za" else "EUR",
                "final": final,
                "initial": initial,
                "discount_percent": discount_percent,
            }
        except (TypeError, ValueError):
            pass

    return {"success": bool(item.get("success", True)), "data": data}


def price_from_details(details):
    if not details or not details.get("success"):
        return None
    price = (details.get("data") or {}).get("price_overview") or {}
    if not price:
        return None
    final = price.get("final")
    initial = price.get("initial")
    if final is None:
        return None
    return {
        "currency": price.get("currency"),
        "final": final / 100,
        "initial": None if initial is None else initial / 100,
        "discountPercent": price.get("discount_percent") or 0,
    }


def release_date_from_details(details):
    data = (details or {}).get("data") or {}
    release = data.get("release_date") or {}
    return release.get("date") or ""


def travel_plan_payload(plan):
    db = get_db()
    items = db.execute(
        """
        SELECT id, day_label, time_label, title, description, url, is_done, created_at, completed_at, sort_order
        FROM travel_items
        WHERE plan_id = ?
        ORDER BY sort_order ASC, id ASC
        """,
        (plan["id"],),
    ).fetchall()
    return {
        "id": plan["id"],
        "title": plan["title"],
        "destination": plan["destination"] or "",
        "startDate": plan["start_date"] or "",
        "endDate": plan["end_date"] or "",
        "notes": plan["notes"] or "",
        "sourcePostId": plan["source_post_id"],
        "createdAt": plan["created_at"],
        "updatedAt": plan["updated_at"],
        "items": [
            {
                "id": item["id"],
                "dayLabel": item["day_label"] or "",
                "timeLabel": item["time_label"] or "",
                "title": item["title"],
                "description": item["description"] or "",
                "url": item["url"] or "",
                "isDone": bool(item["is_done"]),
                "createdAt": item["created_at"],
                "completedAt": item["completed_at"],
                "sortOrder": item["sort_order"],
            }
            for item in items
        ],
    }


def normalise_travel_payload(data):
    title = (data.get("title") or "").strip()
    destination = (data.get("destination") or "").strip()
    start_date = (data.get("startDate") or "").strip()
    end_date = (data.get("endDate") or "").strip()
    notes = (data.get("notes") or "").strip()
    items = []
    for index, item in enumerate(data.get("items") or []):
        item_title = (item.get("title") or "").strip()
        if not item_title:
            continue
        is_done = 1 if item.get("isDone") else 0
        created_at = item.get("createdAt") or datetime.now()
        completed_at = item.get("completedAt") if is_done else None
        if is_done and not completed_at:
            completed_at = datetime.now()
        items.append({
            "dayLabel": (item.get("dayLabel") or "").strip()[:80],
            "timeLabel": (item.get("timeLabel") or "").strip()[:40],
            "title": item_title[:180],
            "description": (item.get("description") or "").strip()[:1200],
            "url": (item.get("url") or "").strip()[:800],
            "isDone": is_done,
            "createdAt": created_at,
            "completedAt": completed_at,
            "sortOrder": index,
        })
    return title, destination, start_date, end_date, notes, items


def fetch_zar_to_eur_rate():
    data = steam_get_json(
        "https://api.frankfurter.dev/v2/rates",
        {"base": "ZAR", "quotes": "EUR"},
    )
    if isinstance(data, list):
        for rate in data:
            if rate.get("quote") == "EUR":
                return rate.get("rate")
    return data.get("rates", {}).get("EUR")


def build_steam_savings_payload():
    owned_games, error = fetch_owned_steam_games()
    if error:
        return None, error

    owned_games = sorted(owned_games, key=lambda game: (game.get("name") or "").lower())
    appids = [game["appid"] for game in owned_games if game.get("appid")]
    es_details = fetch_steam_store_details(appids, "es")
    za_details = fetch_steam_store_details(appids, "za")
    zar_to_eur = fetch_zar_to_eur_rate()

    rows = []
    total_spain_eur = 0
    total_south_africa_eur = 0
    for index, game in enumerate(owned_games, start=1):
        appid = game.get("appid")
        es = es_details.get(str(appid), {})
        za = za_details.get(str(appid), {})
        es_price = price_from_details(es)
        za_price = price_from_details(za)
        eur = es_price["final"] if es_price else None
        zar = za_price["final"] if za_price else None
        converted_zar_eur = round(zar * zar_to_eur, 2) if zar is not None and zar_to_eur else None
        difference = round(eur - converted_zar_eur, 2) if eur is not None and converted_zar_eur is not None else None
        regional_discount_percent = round((difference / eur) * 100, 1) if difference is not None and eur else None

        if eur is not None and converted_zar_eur is not None:
            total_spain_eur += eur
            total_south_africa_eur += converted_zar_eur

        rows.append({
            "number": index,
            "appid": appid,
            "name": html.unescape(game.get("name") or f"App {appid}"),
            "releaseDate": release_date_from_details(es) or release_date_from_details(za),
            "priceZar": zar,
            "priceEur": eur,
            "convertedZarEur": converted_zar_eur,
            "differenceEur": difference,
            "discountPercent": regional_discount_percent,
        })

    total_discount_eur = round(total_spain_eur - total_south_africa_eur, 2)
    total_discount_percent = round((total_discount_eur / total_spain_eur) * 100, 1) if total_spain_eur else 0
    return {
        "rows": rows,
        "summary": {
            "gameCount": len(rows),
            "zarToEurRate": zar_to_eur,
            "totalSpainEur": round(total_spain_eur, 2),
            "totalSouthAfricaEur": round(total_south_africa_eur, 2),
            "totalDiscountEur": total_discount_eur,
            "totalDiscountPercent": total_discount_percent,
            "refreshedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        },
    }, None


def delete_upload_path(upload_url):
    if not upload_url:
        return False
    parsed = urlparse(upload_url)
    if parsed.path.startswith("/uploads/"):
        folder = UPLOAD_FOLDER
    elif parsed.path.startswith("/tmp-uploads/"):
        folder = TMP_UPLOAD_FOLDER
    else:
        return False

    filename = os.path.basename(parsed.path)
    if not filename:
        return False
    file_path = os.path.abspath(os.path.join(folder, filename))
    if not file_path.startswith(os.path.abspath(folder) + os.sep):
        return False
    if os.path.exists(file_path):
        os.remove(file_path)
        return True
    return False


def delete_user_by_id(user_id):
    db = get_db()
    user = db.execute(
        "SELECT id, username, avatar_url FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    if not user:
        return None, "User not found"
    if user["username"] == "runitrench":
        return None, "Cannot delete runitrench"

    delete_upload_path(user["avatar_url"])
    db.execute("DELETE FROM comments WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM cookies WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM users WHERE id = ?", (user_id,))
    db.commit()
    return user, None


def upload_file_to_tmp(file):
    if file.filename == "":
        return None, ("No selected file", 400)
    if not file.filename.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".heic", ".heics", ".webp")):
        return None, ("Invalid file type", 400)
    filename = secrets.token_hex(16) + os.path.splitext(file.filename)[1]
    file_path = os.path.join(TMP_UPLOAD_FOLDER, filename)
    file.save(file_path)
    return f"/tmp-uploads/{filename}", None


@app.route("/upload", methods=["POST"])
def upload_image():
    if not current_user():
        return {"error": "Unauthorized"}, 401
    if "file" not in request.files:
        return {"error": "No file part"}, 400
    url, error = upload_file_to_tmp(request.files["file"])
    if error:
        message, status = error
        return {"error": message}, status
    return {"url": url}


@app.route("/tmp-uploads/<filename>")
def tmp_uploaded_file(filename):
    return send_from_directory(TMP_UPLOAD_FOLDER, filename)


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route("/uploads/<filename>", methods=["DELETE"])
def delete_upload(filename):
    if not current_user():
        return {"error": "Unauthorized"}, 401
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    os.remove(file_path)
    return jsonify({"success": True}), 200


@app.route("/posts", methods=["POST"])
def upload_post():
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    db = get_db()
    data = request.get_json() or {}
    title, content, status = normalise_post_payload(data)
    if status == "published" and (not title or not content):
        return jsonify({"error": "Missing title or content"}), 400
    content = migrate_images(content)
    if status == "published":
        clear_tmp_uploads()
    cursor = db.execute(
        "INSERT INTO posts (title, content, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?)",
        (title, content, datetime.now(), datetime.now(), status),
    )
    db.commit()
    return jsonify({"success": True, "id": cursor.lastrowid, "title": title, "status": status}), 201


@app.route("/posts", methods=["GET"])
def get_posts():
    db = get_db()
    posts = db.execute(
        """
        SELECT posts.id, posts.title, posts.created_at, posts.updated_at, posts.status, COUNT(comments.id) AS comment_count
        FROM posts
        LEFT JOIN comments ON comments.post_id = posts.id
        WHERE posts.category = 'blog'
        GROUP BY posts.id
        ORDER BY COALESCE(posts.updated_at, posts.created_at) DESC
        """
    ).fetchall()
    return jsonify([
        {
            "id": post["id"],
            "title": post["title"],
            "createdAt": post["created_at"],
            "updatedAt": post["updated_at"],
            "status": post["status"],
            "commentCount": post["comment_count"],
        }
        for post in posts
    ])


@app.route("/posts/<int:post_id>", methods=["GET"])
def get_post(post_id):
    db = get_db()
    post = db.execute(
        "SELECT id, title, content, created_at, updated_at, status FROM posts WHERE id = ?",
        (post_id,),
    ).fetchone()
    if not post:
        return jsonify({"error": "Post not found"}), 404
    return jsonify({
        "id": post["id"],
        "title": post["title"],
        "content": post["content"],
        "createdAt": post["created_at"],
        "updatedAt": post["updated_at"],
        "status": post["status"],
    })


@app.route("/posts/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    db = get_db()
    post = db.execute("SELECT content FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return {"error": "Post not found"}, 404
    for src in re.findall(IMG_SRC_REGEX, post["content"]):
        filename = os.path.basename(src)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    db.execute("DELETE FROM comments WHERE post_id = ?", (post_id,))
    db.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    db.commit()
    return jsonify({"success": True}), 200


@app.route("/posts/<int:post_id>", methods=["PUT"])
def update_post(post_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    db = get_db()
    data = request.get_json() or {}
    title, content, status = normalise_post_payload(data)
    if status == "published" and (not title or not content):
        return jsonify({"error": "Missing title or content"}), 400
    content = migrate_images(content)
    if status == "published":
        clear_tmp_uploads()
    result = db.execute(
        "UPDATE posts SET title = ?, content = ?, updated_at = ?, status = ? WHERE id = ?",
        (title, content, datetime.now(), status, post_id),
    )
    if result.rowcount == 0:
        return {"error": "Post not found"}, 404
    db.commit()
    return jsonify({"success": True, "id": post_id, "title": title, "status": status}), 200


@app.route("/posts/<int:post_id>/comments", methods=["GET"])
def get_comments(post_id):
    db = get_db()
    comments = db.execute(
        """
        SELECT comments.id, comments.content, comments.created_at,
               users.id AS user_id, users.username, users.display_name, users.avatar_url
        FROM comments
        JOIN users ON users.id = comments.user_id
        WHERE comments.post_id = ?
        ORDER BY comments.created_at ASC
        """,
        (post_id,),
    ).fetchall()
    return jsonify([
        {
            "id": comment["id"],
            "content": comment["content"],
            "createdAt": comment["created_at"],
            "user": {
                "id": comment["user_id"],
                "username": comment["username"],
                "displayName": comment["display_name"] or comment["username"],
                "avatarUrl": comment["avatar_url"] or "",
            },
        }
        for comment in comments
    ])


@app.route("/posts/<int:post_id>/comments", methods=["POST"])
def create_comment(post_id):
    user = current_user()
    if not user:
        return {"error": "Unauthorized"}, 401
    data = request.get_json()
    content = (data.get("content") or "").strip()
    if not content:
        return {"error": "Comment cannot be empty"}, 400
    db = get_db()
    post = db.execute("SELECT id FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return {"error": "Post not found"}, 404
    cursor = db.execute(
        "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)",
        (post_id, user["id"], content[:1200]),
    )
    db.commit()
    return jsonify({"success": True, "id": cursor.lastrowid}), 201


@app.route("/about", methods=["GET"])
def get_about():
    db = get_db()
    page = db.execute("SELECT title, content, updated_at FROM pages WHERE slug = 'about'").fetchone()
    return jsonify({"title": page["title"], "content": page["content"], "updatedAt": page["updated_at"]})


@app.route("/about", methods=["PUT"])
def update_about():
    user = current_user()
    if not is_runitrench(user):
        return {"error": "Unauthorized"}, 401
    data = request.get_json()
    content = data.get("content")
    title = data.get("title") or "About"
    if not content:
        return {"error": "Missing content"}, 400
    content = migrate_images(content)
    clear_tmp_uploads()
    db = get_db()
    db.execute(
        """
        UPDATE pages
        SET title = ?, content = ?, updated_at = ?, updated_by = ?
        WHERE slug = 'about'
        """,
        (title, content, datetime.now(), user["id"]),
    )
    db.commit()
    return jsonify({"success": True})


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    display_name = (data.get("displayName") or username).strip()
    if not re.match(r"^[A-Za-z0-9_]{3,24}$", username):
        return {"error": "Username must be 3-24 characters using letters, numbers, or underscores"}, 400
    if len(password) < 8:
        return {"error": "Password must be at least 8 characters"}, 400
    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO users (username, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)",
            (username, generate_password_hash(password), display_name, datetime.now()),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return {"error": "Username is already taken"}, 409
    user = db.execute(
        "SELECT id, username, display_name, about_me, avatar_url, created_at FROM users WHERE id = ?",
        (cursor.lastrowid,),
    ).fetchone()
    return save_session(user)


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    db = get_db()
    user = db.execute(
        "SELECT id, username, password_hash, display_name, about_me, avatar_url, created_at FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify(success=False, error="Invalid username or password"), 401
    return save_session(user)


@app.route("/logout", methods=["POST"])
def logout():
    resp = make_response({"message": "Logged out"})
    resp.set_cookie("session_id", "", expires=0)
    return resp


@app.route("/me", methods=["GET"])
def me():
    user = current_user()
    if not user:
        return jsonify({"logged_in": False}), 401
    return jsonify({"logged_in": True, "user": row_to_user(user)})


@app.route("/settings", methods=["PUT"])
def update_settings():
    user = current_user()
    if not user:
        return {"error": "Unauthorized"}, 401
    data = request.get_json()
    display_name = (data.get("displayName") or user["username"]).strip()[:80]
    about_me = (data.get("aboutMe") or "").strip()[:1000]
    avatar_url = data.get("avatarUrl") or ""
    if avatar_url.startswith("/tmp-uploads/"):
        avatar_url = migrate_images(f'<img src="{avatar_url}">')
        match = re.search(IMG_SRC_REGEX, avatar_url)
        avatar_url = match.group(1) if match else ""
        clear_tmp_uploads()
    db = get_db()
    db.execute(
        "UPDATE users SET display_name = ?, about_me = ?, avatar_url = ? WHERE id = ?",
        (display_name, about_me, avatar_url, user["id"]),
    )
    db.commit()
    return jsonify({"success": True})


@app.route("/settings/delete-account", methods=["DELETE"])
def delete_account():
    user = current_user()
    if not user:
        return {"error": "Unauthorized"}, 401
    if user["username"] == "runitrench":
        return {"error": "The owner account cannot be deleted here"}, 403

    data = request.get_json() or {}
    password = data.get("password") or ""
    db = get_db()
    account = db.execute(
        "SELECT id, username, password_hash FROM users WHERE id = ?",
        (user["id"],),
    ).fetchone()
    if not account or not check_password_hash(account["password_hash"], password):
        return {"error": "Password is incorrect"}, 401

    deleted_user, error = delete_user_by_id(user["id"])
    if error:
        return {"error": error}, 400

    resp = make_response(jsonify({"success": True, "deletedUserId": deleted_user["id"]}))
    resp.set_cookie("session_id", "", expires=0)
    return resp


@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    db = get_db()
    user = db.execute(
        "SELECT id, username, display_name, about_me, avatar_url, created_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    if not user:
        return {"error": "User not found"}, 404
    comment = db.execute(
        """
        SELECT comments.id, comments.content, comments.created_at, posts.id AS post_id, posts.title AS post_title
        FROM comments
        JOIN posts ON posts.id = comments.post_id
        WHERE comments.user_id = ?
        ORDER BY comments.created_at DESC
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    payload = row_to_user(user)
    payload["recentComment"] = None if not comment else {
        "id": comment["id"],
        "content": comment["content"],
        "createdAt": comment["created_at"],
        "post": {"id": comment["post_id"], "title": comment["post_title"]},
    }
    return jsonify(payload)


@app.route("/travel-plans", methods=["GET"])
def get_travel_plans():
    db = get_db()
    plans = db.execute(
        """
        SELECT id, title, destination, start_date, end_date, notes, source_post_id, created_at, updated_at
        FROM travel_plans
        ORDER BY COALESCE(NULLIF(start_date, ''), created_at) DESC, id DESC
        """
    ).fetchall()
    return jsonify([travel_plan_payload(plan) for plan in plans])


@app.route("/travel-plans", methods=["POST"])
def create_travel_plan():
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    data = request.get_json() or {}
    title, destination, start_date, end_date, notes, items = normalise_travel_payload(data)
    if not title:
        return {"error": "Title is required"}, 400
    db = get_db()
    cursor = db.execute(
        """
        INSERT INTO travel_plans (title, destination, start_date, end_date, notes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (title, destination, start_date, end_date, notes, datetime.now()),
    )
    plan_id = cursor.lastrowid
    for item in items:
        db.execute(
            """
                INSERT INTO travel_items (plan_id, day_label, time_label, title, description, url, is_done, created_at, completed_at, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            (plan_id, item["dayLabel"], item["timeLabel"], item["title"], item["description"], item["url"], item["isDone"], item["createdAt"], item["completedAt"], item["sortOrder"]),
        )
    db.commit()
    plan = db.execute("SELECT * FROM travel_plans WHERE id = ?", (plan_id,)).fetchone()
    return jsonify(travel_plan_payload(plan)), 201


@app.route("/travel-plans/<int:plan_id>", methods=["PUT"])
def update_travel_plan(plan_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    data = request.get_json() or {}
    title, destination, start_date, end_date, notes, items = normalise_travel_payload(data)
    if not title:
        return {"error": "Title is required"}, 400
    db = get_db()
    result = db.execute(
        """
        UPDATE travel_plans
        SET title = ?, destination = ?, start_date = ?, end_date = ?, notes = ?, updated_at = ?
        WHERE id = ?
        """,
        (title, destination, start_date, end_date, notes, datetime.now(), plan_id),
    )
    if result.rowcount == 0:
        return {"error": "Travel plan not found"}, 404
    db.execute("DELETE FROM travel_items WHERE plan_id = ?", (plan_id,))
    for item in items:
        db.execute(
            """
            INSERT INTO travel_items (plan_id, day_label, time_label, title, description, url, is_done, created_at, completed_at, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (plan_id, item["dayLabel"], item["timeLabel"], item["title"], item["description"], item["url"], item["isDone"], item["createdAt"], item["completedAt"], item["sortOrder"]),
        )
    db.commit()
    plan = db.execute("SELECT * FROM travel_plans WHERE id = ?", (plan_id,)).fetchone()
    return jsonify(travel_plan_payload(plan))


@app.route("/travel-plans/<int:plan_id>", methods=["DELETE"])
def delete_travel_plan(plan_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    db = get_db()
    db.execute("DELETE FROM travel_items WHERE plan_id = ?", (plan_id,))
    result = db.execute("DELETE FROM travel_plans WHERE id = ?", (plan_id,))
    if result.rowcount == 0:
        return {"error": "Travel plan not found"}, 404
    db.commit()
    return jsonify({"success": True})


@app.route("/steam-savings", methods=["GET"])
def steam_savings():
    try:
        payload, error = build_steam_savings_payload()
    except requests.RequestException as exc:
        return {"error": f"Steam pricing refresh failed: {exc}"}, 502
    if error:
        return {"error": error}, 400
    return jsonify(payload)


@app.route("/api/hello")
def hello():
    return jsonify(message="Hello from Flask on Raspberry Pi!")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
