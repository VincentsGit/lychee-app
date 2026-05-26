import os
import math
import random
import re
import secrets
import shutil
import sqlite3
import json
import html
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlparse

import requests
from flask import Flask, g, jsonify, make_response, request, send_from_directory
from flask_cors import CORS  # type: ignore
from werkzeug.security import check_password_hash, generate_password_hash

IMG_SRC_REGEX = r'<img[^>]+src="([^">]+)"'
DEFAULT_ABOUT = """
<p>Hi! Welcome to my website.</p>
<p>This is where I can write a bit more about myself, keep my blog posts together, and make the site feel more like me.</p>
"""
DEFAULT_SPOTIFY = json.dumps({
    "title": "Spotify",
    "playlists": [],
})
DEFAULT_SOCIALS_OBJECT = {
    "title": "Socials",
    "subtitle": "Follow me on my socials!",
    "links": [
        {"label": "X", "href": "https://x.com/runitrench", "icon": "x"},
        {"label": "Instagram", "href": "https://www.instagram.com/runitrench", "icon": "instagram"},
        {"label": "TikTok", "href": "https://www.tiktok.com/@runitrench", "icon": "tiktok"},
        {"label": "Twitch", "href": "https://www.twitch.tv/runitrench", "icon": "twitch"},
        {"label": "YouTube", "href": "https://www.youtube.com/@runitrench", "icon": "youtube"},
    ],
}
DEFAULT_SOCIALS = json.dumps(DEFAULT_SOCIALS_OBJECT)
DEFAULT_CONCERT_EVENTS = [
    {"artist": "Laufey", "city": "Barcelona", "event_date": "", "date_note": "Jul 24", "openers": "", "status": "cancelled"},
    {"artist": "Tate McRae", "city": "Barcelona", "event_date": "2024-05-20", "date_note": "", "openers": "charlieonafriday", "status": "attended"},
    {"artist": "Olivia Rodrigo", "city": "Barcelona", "event_date": "2024-06-18", "date_note": "", "openers": "Remi Wolf", "status": "attended"},
    {"artist": "Cigarettes After Sex", "city": "Vienna", "event_date": "2024-11-03", "date_note": "", "openers": "", "status": "attended"},
    {"artist": "Wave to Earth", "city": "Berlin", "event_date": "2025-05-04", "date_note": "", "openers": "", "status": "attended"},
    {"artist": "Billie Eilish", "city": "Barcelona", "event_date": "2025-06-15", "date_note": "", "openers": "Tom Odell", "status": "attended"},
    {"artist": "Laufey", "city": "Barcelona", "event_date": "2026-03-22", "date_note": "", "openers": "", "status": "attended"},
    {"artist": "The Neighbourhood", "city": "Zurich", "event_date": "2026-05-05", "date_note": "", "openers": "Night Tapes · Noise Dept", "status": "attended"},
    {"artist": "Twice", "city": "Barcelona", "event_date": "2026-05-12", "date_note": "", "openers": "", "status": "upcoming"},
    {"artist": "Madison Beer", "city": "Barcelona", "event_date": "2026-05-26", "date_note": "", "openers": "Isabel LaRosa", "status": "upcoming"},
    {"artist": "The Weeknd", "city": "Barcelona", "event_date": "2026-09-01", "date_note": "", "openers": "Playboi Carti", "status": "upcoming"},
    {"artist": "Joji", "city": "Milan", "event_date": "2026-09-03", "date_note": "", "openers": "Tommy Richman", "status": "upcoming"},
]
DEFAULT_CONCERT_WISHLIST = ["Keshi", "The Marías", "Clairo", "Chase Atlantic", "Lana Del Rey"]
DEFAULT_HOME_OBJECT = {
    "hero": {
        "chips": [
            {"label": "my blog", "variant": "filled"},
            {"label": "thoughts, memories, comments", "variant": "outlined"},
        ],
        "title": "Welcome to my website!",
        "intro": "This is my little corner of the internet where I can write about whatever I want, keep memories in one place, and share updates without everything disappearing into social media.",
        "primaryButton": {"label": "Read the blog", "to": "/blog"},
        "secondaryButton": {"label": "Leave a comment", "to": "/register"},
        "pandaImage": "bounce",
        "imageAlt": "Bouncing panda",
        "showLavender": True,
        "showFlowers": True,
    },
    "bubbles": [
        {
            "icon": "stories",
            "title": "My little diary",
            "text": "I can keep all my posts in one place, grouped by year and month so they are easy to look back on later.",
        },
        {
            "icon": "comments",
            "title": "Comments are open",
            "text": "Make an account if you want to comment on my posts and have your own cute little profile.",
        },
        {
            "icon": "heart",
            "title": "Made by Vincent",
            "text": "This website was designed and developed by Vincent, my boyfriend, who also captured my lavender colours and cute lychee vibe.",
        },
    ],
}
DEFAULT_HOME = json.dumps(DEFAULT_HOME_OBJECT)
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
STEAM_PAYLOAD_CACHE_HOURS = 12
STEAM_STORE_CACHE_DAYS = 14
_last_cookie_cleanup = None

AVALON_ROLE_COUNTS = {
    5: {"good": 3, "evil": 2},
    6: {"good": 4, "evil": 2},
    7: {"good": 4, "evil": 3},
    8: {"good": 5, "evil": 3},
    9: {"good": 6, "evil": 3},
    10: {"good": 6, "evil": 4},
}
AVALON_QUEST_SIZES = {
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4],
    8: [3, 4, 4, 5, 5],
    9: [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5],
}


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
    current_section = ""
    for index, block in enumerate(blocks):
        text = strip_tags(block).strip()
        if not text:
            continue
        link_match = re.search(r'href="([^"]+)"', block)
        url = link_match.group(1) if link_match else ""
        is_section_heading = (
            bool(re.match(r"^\d+[\).]\s+", text))
            or text.upper().startswith("DAY ")
            or ("<strong" in block.lower() and not url and not text.lstrip().startswith("-") and len(text) <= 140)
        )
        if is_section_heading:
            current_section = text
            continue
        title = re.sub(r"^[-\s]+", "", text).strip()
        looks_like_item = text.startswith("-") or url or len(title) <= 120
        if looks_like_item:
            items.append({
                "dayLabel": "",
                "timeLabel": "",
                "sectionTitle": current_section,
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
            "sectionTitle": "",
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



def seed_default_concerts(db):
    event_count = db.execute("SELECT COUNT(*) AS count FROM concert_events").fetchone()["count"]
    if event_count == 0:
        now = datetime.now()
        for index, event in enumerate(DEFAULT_CONCERT_EVENTS):
            db.execute(
                """
                INSERT INTO concert_events (artist, city, event_date, date_note, openers, status, sort_order, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event["artist"],
                    event["city"],
                    event["event_date"],
                    event["date_note"],
                    event["openers"],
                    event["status"],
                    index,
                    now,
                    now,
                ),
            )

    wishlist_count = db.execute("SELECT COUNT(*) AS count FROM concert_wishlist").fetchone()["count"]
    if wishlist_count == 0:
        now = datetime.now()
        for index, artist in enumerate(DEFAULT_CONCERT_WISHLIST):
            db.execute(
                """
                INSERT INTO concert_wishlist (artist, sort_order, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                """,
                (artist, index, now, now),
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
            parent_id INTEGER,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (parent_id) REFERENCES comments(id)
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
        CREATE TABLE IF NOT EXISTS steam_payload_cache (
            cache_key TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
            section_title TEXT DEFAULT '',
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

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS gallery_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_url TEXT NOT NULL,
            caption TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    for statement in [
        ("image_url", "ALTER TABLE gallery_photos ADD COLUMN image_url TEXT NOT NULL DEFAULT ''"),
        ("caption", "ALTER TABLE gallery_photos ADD COLUMN caption TEXT DEFAULT ''"),
        ("created_at", "ALTER TABLE gallery_photos ADD COLUMN created_at DATETIME"),
        ("updated_at", "ALTER TABLE gallery_photos ADD COLUMN updated_at DATETIME"),
    ]:
        if not column_exists(db, "gallery_photos", statement[0]):
            db.execute(statement[1])
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS concert_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            artist TEXT NOT NULL,
            city TEXT DEFAULT '',
            event_date TEXT DEFAULT '',
            date_note TEXT DEFAULT '',
            openers TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'upcoming',
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    for statement in [
        ("artist", "ALTER TABLE concert_events ADD COLUMN artist TEXT NOT NULL DEFAULT ''"),
        ("city", "ALTER TABLE concert_events ADD COLUMN city TEXT DEFAULT ''"),
        ("event_date", "ALTER TABLE concert_events ADD COLUMN event_date TEXT DEFAULT ''"),
        ("date_note", "ALTER TABLE concert_events ADD COLUMN date_note TEXT DEFAULT ''"),
        ("openers", "ALTER TABLE concert_events ADD COLUMN openers TEXT DEFAULT ''"),
        ("status", "ALTER TABLE concert_events ADD COLUMN status TEXT NOT NULL DEFAULT 'upcoming'"),
        ("sort_order", "ALTER TABLE concert_events ADD COLUMN sort_order INTEGER DEFAULT 0"),
        ("created_at", "ALTER TABLE concert_events ADD COLUMN created_at DATETIME"),
        ("updated_at", "ALTER TABLE concert_events ADD COLUMN updated_at DATETIME"),
    ]:
        if not column_exists(db, "concert_events", statement[0]):
            db.execute(statement[1])

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS concert_wishlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            artist TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    for statement in [
        ("artist", "ALTER TABLE concert_wishlist ADD COLUMN artist TEXT NOT NULL DEFAULT ''"),
        ("sort_order", "ALTER TABLE concert_wishlist ADD COLUMN sort_order INTEGER DEFAULT 0"),
        ("created_at", "ALTER TABLE concert_wishlist ADD COLUMN created_at DATETIME"),
        ("updated_at", "ALTER TABLE concert_wishlist ADD COLUMN updated_at DATETIME"),
    ]:
        if not column_exists(db, "concert_wishlist", statement[0]):
            db.execute(statement[1])
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS watchlist_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_type TEXT NOT NULL DEFAULT 'movie',
            title TEXT NOT NULL,
            release_year TEXT DEFAULT '',
            details TEXT DEFAULT '',
            review TEXT DEFAULT '',
            image_url TEXT DEFAULT '',
            is_watched INTEGER DEFAULT 0,
            rating INTEGER DEFAULT NULL,
            watched_at DATETIME DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS avalon_lobbies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            host_user_id INTEGER NOT NULL,
            password_hash TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'waiting',
            max_players INTEGER DEFAULT 10,
            game_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME,
            finished_at DATETIME,
            expires_at DATETIME,
            FOREIGN KEY (host_user_id) REFERENCES users(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS avalon_lobby_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lobby_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            ready INTEGER DEFAULT 0,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(lobby_id, user_id),
            FOREIGN KEY (lobby_id) REFERENCES avalon_lobbies(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS avalon_games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lobby_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'in_progress',
            player_count INTEGER NOT NULL,
            current_phase TEXT NOT NULL DEFAULT 'roles',
            current_quest_index INTEGER DEFAULT 0,
            current_leader_user_id INTEGER,
            turn_index INTEGER DEFAULT 0,
            rejected_votes INTEGER DEFAULT 0,
            winner TEXT DEFAULT NULL,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            finished_at DATETIME,
            expires_at DATETIME,
            FOREIGN KEY (lobby_id) REFERENCES avalon_lobbies(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS avalon_game_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            team TEXT NOT NULL,
            turn_order INTEGER NOT NULL,
            has_seen_role INTEGER DEFAULT 0,
            continued_after_role INTEGER DEFAULT 0,
            final_result TEXT DEFAULT NULL,
            mmr_before INTEGER DEFAULT 1000,
            mmr_after INTEGER DEFAULT 1000,
            UNIQUE(game_id, user_id),
            FOREIGN KEY (game_id) REFERENCES avalon_games(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS avalon_quests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            quest_index INTEGER NOT NULL,
            team_size INTEGER NOT NULL,
            fail_threshold INTEGER NOT NULL DEFAULT 1,
            leader_user_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'team_selection',
            selected_team_json TEXT DEFAULT '[]',
            result TEXT DEFAULT NULL,
            fail_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            UNIQUE(game_id, quest_index),
            FOREIGN KEY (game_id) REFERENCES avalon_games(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS avalon_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quest_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            vote TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(quest_id, user_id),
            FOREIGN KEY (quest_id) REFERENCES avalon_quests(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS avalon_quest_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quest_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            card TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(quest_id, user_id),
            FOREIGN KEY (quest_id) REFERENCES avalon_quests(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS avalon_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            event_type TEXT NOT NULL,
            message TEXT NOT NULL,
            payload_json TEXT DEFAULT '{}',
            FOREIGN KEY (game_id) REFERENCES avalon_games(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS avalon_user_stats (
            user_id INTEGER PRIMARY KEY,
            games_played INTEGER DEFAULT 0,
            games_won INTEGER DEFAULT 0,
            games_lost INTEGER DEFAULT 0,
            games_as_good INTEGER DEFAULT 0,
            games_as_evil INTEGER DEFAULT 0,
            games_as_merlin INTEGER DEFAULT 0,
            merlin_games_won INTEGER DEFAULT 0,
            games_as_assassin INTEGER DEFAULT 0,
            killed_merlin INTEGER DEFAULT 0,
            mmr INTEGER DEFAULT 1000,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    for statement in [
        ("media_type", "ALTER TABLE watchlist_items ADD COLUMN media_type TEXT NOT NULL DEFAULT 'movie'"),
        ("release_year", "ALTER TABLE watchlist_items ADD COLUMN release_year TEXT DEFAULT ''"),
        ("details", "ALTER TABLE watchlist_items ADD COLUMN details TEXT DEFAULT ''"),
        ("review", "ALTER TABLE watchlist_items ADD COLUMN review TEXT DEFAULT ''"),
        ("image_url", "ALTER TABLE watchlist_items ADD COLUMN image_url TEXT DEFAULT ''"),
        ("is_watched", "ALTER TABLE watchlist_items ADD COLUMN is_watched INTEGER DEFAULT 0"),
        ("rating", "ALTER TABLE watchlist_items ADD COLUMN rating INTEGER DEFAULT NULL"),
        ("watched_at", "ALTER TABLE watchlist_items ADD COLUMN watched_at DATETIME DEFAULT NULL"),
        ("created_at", "ALTER TABLE watchlist_items ADD COLUMN created_at DATETIME"),
        ("updated_at", "ALTER TABLE watchlist_items ADD COLUMN updated_at DATETIME"),
    ]:
        if not column_exists(db, "watchlist_items", statement[0]):
            db.execute(statement[1])
    if not column_exists(db, "travel_items", "is_done"):
        db.execute("ALTER TABLE travel_items ADD COLUMN is_done INTEGER DEFAULT 0")
    if not column_exists(db, "travel_items", "section_title"):
        db.execute("ALTER TABLE travel_items ADD COLUMN section_title TEXT DEFAULT ''")
    if not column_exists(db, "travel_items", "created_at"):
        db.execute("ALTER TABLE travel_items ADD COLUMN created_at DATETIME")
    if not column_exists(db, "travel_items", "completed_at"):
        db.execute("ALTER TABLE travel_items ADD COLUMN completed_at DATETIME")
    db.execute("UPDATE travel_items SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)")
    db.execute("UPDATE watchlist_items SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)")
    db.execute("UPDATE gallery_photos SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)")
    if not column_exists(db, "comments", "parent_id"):
        db.execute("ALTER TABLE comments ADD COLUMN parent_id INTEGER")
    db.execute("UPDATE concert_events SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP), status = COALESCE(NULLIF(status, ''), 'upcoming')")
    db.execute("UPDATE concert_wishlist SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)")
    for statement in [
        "CREATE INDEX IF NOT EXISTS idx_posts_category_created ON posts(category, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_comments_parent_created ON comments(parent_id, created_at ASC)",
        "CREATE INDEX IF NOT EXISTS idx_travel_items_plan_order ON travel_items(plan_id, sort_order ASC, id ASC)",
        "CREATE INDEX IF NOT EXISTS idx_watchlist_status_updated ON watchlist_items(is_watched ASC, updated_at DESC, id DESC)",
        "CREATE INDEX IF NOT EXISTS idx_gallery_created ON gallery_photos(created_at DESC, id DESC)",
        "CREATE INDEX IF NOT EXISTS idx_concert_events_status_order ON concert_events(status, sort_order ASC, id ASC)",
        "CREATE INDEX IF NOT EXISTS idx_concert_wishlist_order ON concert_wishlist(sort_order ASC, id ASC)",
        "CREATE INDEX IF NOT EXISTS idx_cookies_value ON cookies(cookie_value)",
        "CREATE INDEX IF NOT EXISTS idx_cookies_created ON cookies(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_avalon_lobbies_status_created ON avalon_lobbies(status, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_avalon_lobby_players_lobby ON avalon_lobby_players(lobby_id)",
        "CREATE INDEX IF NOT EXISTS idx_avalon_game_players_user ON avalon_game_players(user_id, game_id)",
        "CREATE INDEX IF NOT EXISTS idx_avalon_events_game_created ON avalon_events(game_id, created_at ASC)",
    ]:
        db.execute(statement)
    migrate_travel_posts(db)
    seed_default_concerts(db)
    db.execute(
        """
        INSERT OR IGNORE INTO pages (slug, title, content)
        VALUES ('about', 'About', ?)
        """,
        (DEFAULT_ABOUT,),
    )
    db.execute(
        """
        INSERT OR IGNORE INTO pages (slug, title, content)
        VALUES ('home', 'Home', ?)
        """,
        (DEFAULT_HOME,),
    )
    db.execute(
        """
        INSERT OR IGNORE INTO pages (slug, title, content)
        VALUES ('spotify', 'Spotify', ?)
        """,
        (DEFAULT_SPOTIFY,),
    )
    db.execute(
        """
        INSERT OR IGNORE INTO pages (slug, title, content)
        VALUES ('socials', 'Socials', ?)
        """,
        (DEFAULT_SOCIALS,),
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


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


with app.app_context():
    init_db()


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
    global _last_cookie_cleanup
    now = datetime.utcnow()
    if _last_cookie_cleanup and now - _last_cookie_cleanup < timedelta(hours=6):
        return
    db = get_db()
    db.execute("DELETE FROM cookies WHERE datetime(created_at, '+7 days') <= CURRENT_TIMESTAMP")
    db.commit()
    _last_cookie_cleanup = now


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


def normalise_post_timestamp(data, fallback=None):
    raw = (
        data.get("createdAt")
        or data.get("created_at")
        or data.get("publishedAt")
        or data.get("timestamp")
    )
    if raw is None or str(raw).strip() == "":
        return fallback, None

    value = str(raw).strip().replace(" ", "T", 1)
    if value.endswith("Z"):
        value = f"{value[:-1]}+00:00"

    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None, "Use post timestamps in YYYY-MM-DDTHH:MM format"

    if parsed.tzinfo is not None:
        parsed = parsed.astimezone().replace(tzinfo=None)
    return parsed, None


def spotify_embed_from_value(value):
    raw = (value or "").strip()
    if not raw:
        return "", ""

    iframe_match = re.search(r'<iframe[^>]+src=["\']([^"\']+)["\']', raw, flags=re.IGNORECASE)
    candidate = iframe_match.group(1) if iframe_match else raw
    candidate = html.unescape(candidate).strip()
    parsed = urlparse(candidate)
    if parsed.netloc not in ("open.spotify.com", "spotify.link"):
        return None, None

    path = parsed.path.rstrip("/")
    playlist_match = re.search(r"/(?:embed/)?playlist/([A-Za-z0-9]+)$", path)
    if not playlist_match:
        return None, None

    playlist_id = playlist_match.group(1)
    playlist_url = f"https://open.spotify.com/playlist/{playlist_id}"
    embed_url = f"https://open.spotify.com/embed/playlist/{playlist_id}?utm_source=generator"
    return playlist_url, embed_url



VALID_SOCIAL_ICONS = {"x", "instagram", "tiktok", "twitch", "youtube", "link"}


def normalise_socials_payload(data):
    title = (data.get("title") or "Socials").strip()[:80] or "Socials"
    subtitle = (data.get("subtitle") or "").strip()[:240]
    links = []
    for index, item in enumerate(data.get("links") or []):
        if not isinstance(item, dict):
            continue
        label = (item.get("label") or "").strip()[:80]
        href = (item.get("href") or "").strip()[:600]
        icon = (item.get("icon") or "link").strip().lower()
        if icon not in VALID_SOCIAL_ICONS:
            icon = "link"
        if not label or not href:
            continue
        links.append({"label": label, "href": href, "icon": icon, "sortOrder": len(links)})
    return {"title": title, "subtitle": subtitle, "links": links}


def socials_payload_from_content(content):
    try:
        payload = json.loads(content or "{}")
    except json.JSONDecodeError:
        payload = DEFAULT_SOCIALS_OBJECT
    return normalise_socials_payload(payload if isinstance(payload, dict) else DEFAULT_SOCIALS_OBJECT)

def normalise_spotify_playlist(item, index):
    label = (item.get("label") or item.get("title") or f"Playlist {index + 1}").strip()[:80]
    playlist_url, embed_url = spotify_embed_from_value(item.get("playlistUrl") or item.get("embedUrl") or item.get("embedCode") or "")
    if playlist_url is None:
        return None, "Paste Spotify playlist links or playlist embed codes only"
    if not playlist_url:
        return None, None
    return {
        "label": label or f"Playlist {index + 1}",
        "playlistUrl": playlist_url,
        "embedUrl": embed_url,
        "sortOrder": index,
    }, None


def spotify_payload_from_content(content, fallback_title="Spotify"):
    payload = {}
    try:
        payload = json.loads(content or "{}")
    except json.JSONDecodeError:
        payload = {}

    playlists = payload.get("playlists")
    if not isinstance(playlists, list):
        playlists = []
        if payload.get("playlistUrl") or payload.get("embedUrl"):
            playlist, error = normalise_spotify_playlist({
                "label": payload.get("title") or "Playlist 1",
                "playlistUrl": payload.get("playlistUrl") or payload.get("embedUrl"),
            }, 0)
            if playlist and not error:
                playlists.append(playlist)

    normalised = []
    for index, item in enumerate(playlists):
        if not isinstance(item, dict):
            continue
        playlist, error = normalise_spotify_playlist(item, index)
        if error:
            continue
        if playlist:
            normalised.append(playlist)

    return {
        "title": payload.get("title") or fallback_title or "Spotify",
        "playlists": normalised,
    }


def home_payload_from_content(content):
    try:
        payload = json.loads(content or "{}")
    except json.JSONDecodeError:
        payload = {}
    return normalise_home_payload(payload)


def normalise_home_text(value, fallback="", limit=400):
    text = value if isinstance(value, str) else fallback
    text = (text or fallback or "").strip()
    return text[:limit]


def normalise_home_path(value, fallback="/"):
    path = normalise_home_text(value, fallback, 200)
    if not path.startswith("/"):
        return fallback
    return path


def normalise_home_button(value, fallback):
    value = value if isinstance(value, dict) else {}
    return {
        "label": normalise_home_text(value.get("label"), fallback["label"], 80),
        "to": normalise_home_path(value.get("to"), fallback["to"]),
    }


def normalise_home_payload(data):
    data = data if isinstance(data, dict) else {}
    default = DEFAULT_HOME_OBJECT
    hero = data.get("hero") if isinstance(data.get("hero"), dict) else {}

    chips = []
    for index, chip in enumerate(hero.get("chips") or []):
        if not isinstance(chip, dict):
            continue
        label = normalise_home_text(chip.get("label"), "", 80)
        if not label:
            continue
        chips.append({
            "label": label,
            "variant": "outlined" if chip.get("variant") == "outlined" else "filled",
        })
        if len(chips) >= 4:
            break
    if not chips:
        chips = default["hero"]["chips"]

    bubbles = []
    allowed_icons = {"stories", "comments", "heart"}
    for bubble in data.get("bubbles") or []:
        if not isinstance(bubble, dict):
            continue
        title = normalise_home_text(bubble.get("title"), "", 120)
        text = normalise_home_text(bubble.get("text"), "", 600)
        if not title and not text:
            continue
        bubbles.append({
            "icon": bubble.get("icon") if bubble.get("icon") in allowed_icons else "heart",
            "title": title or "Untitled bubble",
            "text": text,
        })
        if len(bubbles) >= 6:
            break
    if not bubbles:
        bubbles = default["bubbles"]

    return {
        "hero": {
            "chips": chips,
            "title": normalise_home_text(hero.get("title"), default["hero"]["title"], 160),
            "intro": normalise_home_text(hero.get("intro"), default["hero"]["intro"], 700),
            "primaryButton": normalise_home_button(hero.get("primaryButton"), default["hero"]["primaryButton"]),
            "secondaryButton": normalise_home_button(hero.get("secondaryButton"), default["hero"]["secondaryButton"]),
            "pandaImage": hero.get("pandaImage") if hero.get("pandaImage") in {"bounce", "dance", "static"} else "bounce",
            "imageAlt": normalise_home_text(hero.get("imageAlt"), default["hero"]["imageAlt"], 120),
            "showLavender": bool(hero.get("showLavender", True)),
            "showFlowers": bool(hero.get("showFlowers", True)),
        },
        "bubbles": bubbles,
    }


def normalise_watchlist_rating(value):
    if value is None or value == "":
        return None, None
    try:
        rating = int(value)
    except (TypeError, ValueError):
        return None, "Rating must be between 0 and 5"
    if rating < 0 or rating > 5:
        return None, "Rating must be between 0 and 5"
    return rating, None


def is_direct_image_url(value):
    parsed = urlparse(value or "")
    path = (parsed.path or "").lower()
    return parsed.scheme in ("http", "https") and path.endswith((
        ".apng",
        ".avif",
        ".gif",
        ".jpeg",
        ".jpg",
        ".png",
        ".webp",
    ))


def decode_embedded_url(value):
    value = html.unescape(value or "").strip()
    try:
        return json.loads(f'"{value}"')
    except (TypeError, json.JSONDecodeError):
        return value.replace("\\/", "/")


def absolute_preview_url(base_url, value):
    value = decode_embedded_url(value)
    if value.startswith("//"):
        return f"{urlparse(base_url).scheme}:{value}"
    return urljoin(base_url, value)


def image_from_meta_tags(base_url, text):
    wanted = {"og:image", "og:image:url", "twitter:image", "twitter:image:src", "image"}
    for tag in re.findall(r"<meta\b[^>]*>", text or "", flags=re.IGNORECASE):
        name_match = re.search(r'\b(?:property|name)=["\']([^"\']+)["\']', tag, flags=re.IGNORECASE)
        content_match = re.search(r'\bcontent=["\']([^"\']+)["\']', tag, flags=re.IGNORECASE)
        if name_match and content_match and name_match.group(1).lower() in wanted:
            return absolute_preview_url(base_url, content_match.group(1))
    return ""


def image_from_common_page_markup(base_url, text):
    patterns = [
        r'data-old-hires=["\']([^"\']+)["\']',
        r'"hiRes"\s*:\s*"([^"]+)"',
        r'"landingImage"\s*:\s*"([^"]+)"',
        r'"large"\s*:\s*"([^"]+)"',
        r'<link[^>]+rel=["\']image_src["\'][^>]+href=["\']([^"\']+)["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, text or "", flags=re.IGNORECASE)
        if match:
            return absolute_preview_url(base_url, match.group(1))
    return ""


def resolve_watchlist_image_url(value):
    raw = (value or "").strip()
    if not raw or raw.startswith("/uploads/") or raw.startswith("/tmp-uploads/"):
        return raw
    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https"):
        return raw[:500]
    if is_direct_image_url(raw):
        return raw[:500]

    try:
        response = requests.get(
            raw,
            timeout=8,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-GB,en;q=0.9",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                              "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            },
        )
        response.raise_for_status()
    except requests.RequestException:
        return raw[:500]

    content_type = (response.headers.get("content-type") or "").lower()
    if content_type.startswith("image/"):
        return response.url[:500]
    if "html" not in content_type and "xml" not in content_type:
        return raw[:500]

    text = response.text[:2_500_000]
    preview_url = image_from_meta_tags(response.url, text) or image_from_common_page_markup(response.url, text)
    return (preview_url or raw)[:500]


def normalise_watchlist_payload(data):
    data = data if isinstance(data, dict) else {}
    title = (data.get("title") or "").strip()[:160]
    media_type = (data.get("mediaType") or data.get("media_type") or "movie").strip().lower()
    if media_type in ("tv", "show", "series", "tv-show", "tv_show"):
        media_type = "tv"
    elif media_type != "movie":
        media_type = "movie"
    rating, rating_error = normalise_watchlist_rating(data.get("rating"))
    if rating_error:
        return None, rating_error

    image_url = (data.get("imageUrl") or data.get("image_url") or "").strip()[:500]
    if image_url.startswith("/tmp-uploads/"):
        migrated = migrate_images(f'<img src="{image_url}">')
        match = re.search(IMG_SRC_REGEX, migrated)
        image_url = match.group(1) if match else ""
    else:
        image_url = resolve_watchlist_image_url(image_url)

    return {
        "mediaType": media_type,
        "title": title,
        "releaseYear": str(data.get("releaseYear") or data.get("release_year") or "").strip()[:40],
        "details": (data.get("details") or "").strip()[:4000],
        "review": (data.get("review") or "").strip()[:6000],
        "imageUrl": image_url,
        "isWatched": bool(data.get("isWatched") or data.get("is_watched")),
        "rating": rating,
    }, None


def watchlist_item_payload(item):
    return {
        "id": item["id"],
        "mediaType": item["media_type"],
        "title": item["title"],
        "releaseYear": item["release_year"] or "",
        "details": item["details"] or "",
        "review": item["review"] or "",
        "imageUrl": item["image_url"] or "",
        "isWatched": bool(item["is_watched"]),
        "rating": item["rating"] if item["rating"] is not None else None,
        "watchedAt": item["watched_at"],
        "createdAt": item["created_at"],
        "updatedAt": item["updated_at"],
    }


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
    missing_appids = []
    cache_cutoff = datetime.utcnow() - timedelta(days=STEAM_STORE_CACHE_DAYS)
    for appid in appids:
        cached = db.execute(
            "SELECT payload, updated_at FROM steam_store_cache WHERE appid = ? AND country = ?",
            (appid, country_code),
        ).fetchone()
        if cached and datetime.fromisoformat(str(cached["updated_at"])) >= cache_cutoff:
            details[str(appid)] = json.loads(cached["payload"])
        else:
            missing_appids.append(appid)

    for group in chunked(missing_appids[:STEAM_STORE_FETCH_LIMIT_PER_COUNTRY], 100):
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
    for appid in missing_appids[STEAM_STORE_FETCH_LIMIT_PER_COUNTRY:]:
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
        SELECT id, day_label, time_label, section_title, title, description, url, is_done, created_at, completed_at, sort_order
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
                "sectionTitle": item["section_title"] or "",
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


def travel_plan_summary_payload(plan):
    keys = set(plan.keys())
    item_count = plan["item_count"] if "item_count" in keys else 0
    done_count = plan["done_count"] if "done_count" in keys and plan["done_count"] is not None else 0
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
        "itemCount": item_count,
        "doneCount": done_count,
        "items": [],
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
            "sectionTitle": (item.get("sectionTitle") or "").strip()[:120],
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


def get_cached_steam_payload():
    db = get_db()
    cached = db.execute(
        "SELECT payload, updated_at FROM steam_payload_cache WHERE cache_key = ?",
        ("steam-savings",),
    ).fetchone()
    if not cached:
        return None
    updated_at = datetime.fromisoformat(str(cached["updated_at"]))
    if datetime.utcnow() - updated_at > timedelta(hours=STEAM_PAYLOAD_CACHE_HOURS):
        return None
    return json.loads(cached["payload"])


def save_cached_steam_payload(payload):
    db = get_db()
    db.execute(
        """
        INSERT INTO steam_payload_cache (cache_key, payload, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(cache_key)
        DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
        """,
        ("steam-savings", json.dumps(payload), datetime.utcnow()),
    )
    db.commit()


def build_steam_savings_payload(force_refresh=False):
    if not force_refresh:
        cached_payload = get_cached_steam_payload()
        if cached_payload:
            cached_payload["summary"]["fromCache"] = True
            return cached_payload, None

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
    payload = {
        "rows": rows,
        "summary": {
            "gameCount": len(rows),
            "zarToEurRate": zar_to_eur,
            "totalSpainEur": round(total_spain_eur, 2),
            "totalSouthAfricaEur": round(total_south_africa_eur, 2),
            "totalDiscountEur": total_discount_eur,
            "totalDiscountPercent": total_discount_percent,
            "refreshedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "fromCache": False,
        },
    }
    save_cached_steam_payload(payload)
    return payload, None


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



def concert_event_payload(event):
    return {
        "id": event["id"],
        "artist": event["artist"],
        "city": event["city"] or "",
        "eventDate": event["event_date"] or "",
        "dateNote": event["date_note"] or "",
        "openers": event["openers"] or "",
        "status": event["status"] or "upcoming",
        "sortOrder": event["sort_order"] or 0,
        "createdAt": event["created_at"],
        "updatedAt": event["updated_at"],
    }


def concert_wishlist_payload(item):
    return {
        "id": item["id"],
        "artist": item["artist"],
        "sortOrder": item["sort_order"] or 0,
        "createdAt": item["created_at"],
        "updatedAt": item["updated_at"],
    }


def normalise_concert_event_payload(data):
    status = (data.get("status") or "upcoming").strip().lower()
    if status not in ("attended", "upcoming", "cancelled"):
        status = "upcoming"
    event_date = (data.get("eventDate") or data.get("event_date") or "").strip()[:10]
    if event_date and not re.match(r"^\d{4}-\d{2}-\d{2}$", event_date):
        return None, "Use dates in YYYY-MM-DD format"
    return {
        "artist": (data.get("artist") or "").strip()[:160],
        "city": (data.get("city") or "").strip()[:120],
        "eventDate": event_date,
        "dateNote": (data.get("dateNote") or data.get("date_note") or "").strip()[:40],
        "openers": (data.get("openers") or "").strip()[:240],
        "status": status,
    }, None

def gallery_photo_payload(photo):
    return {
        "id": photo["id"],
        "imageUrl": photo["image_url"],
        "caption": photo["caption"] or "",
        "createdAt": photo["created_at"],
        "updatedAt": photo["updated_at"],
    }


def save_gallery_image(file):
    if not file or file.filename == "":
        return None, ("Choose a photo first", 400)
    if not file.filename.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".heic", ".heics", ".webp")):
        return None, ("Invalid file type", 400)
    filename = secrets.token_hex(16) + os.path.splitext(file.filename)[1].lower()
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    return f"/uploads/{filename}", None


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
    created_at, timestamp_error = normalise_post_timestamp(data, fallback=datetime.now())
    if timestamp_error:
        return jsonify({"error": timestamp_error}), 400
    if status == "published" and (not title or not content):
        return jsonify({"error": "Missing title or content"}), 400
    content = migrate_images(content)
    if status == "published":
        clear_tmp_uploads()
    updated_at = datetime.now()
    cursor = db.execute(
        "INSERT INTO posts (title, content, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?)",
        (title, content, created_at, updated_at, status),
    )
    db.commit()
    return jsonify({"success": True, "id": cursor.lastrowid, "title": title, "status": status, "createdAt": created_at.isoformat(sep=" ")}), 201


@app.route("/posts", methods=["GET"])
def get_posts():
    user = current_user()
    can_see_drafts = is_runitrench(user)
    db = get_db()
    posts = db.execute(
        """
        SELECT posts.id, posts.title, posts.created_at, posts.updated_at, posts.status, COUNT(comments.id) AS comment_count
        FROM posts
        LEFT JOIN comments ON comments.post_id = posts.id
        WHERE posts.category = 'blog'
          AND (? OR posts.status = 'published')
        GROUP BY posts.id
        ORDER BY posts.created_at DESC
        """,
        (1 if can_see_drafts else 0,),
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
    if post["status"] == "draft" and not is_runitrench(current_user()):
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
    created_at, timestamp_error = normalise_post_timestamp(data)
    if timestamp_error:
        return jsonify({"error": timestamp_error}), 400
    if status == "published" and (not title or not content):
        return jsonify({"error": "Missing title or content"}), 400
    content = migrate_images(content)
    if status == "published":
        clear_tmp_uploads()
    updated_at = datetime.now()
    if created_at is None:
        result = db.execute(
            "UPDATE posts SET title = ?, content = ?, updated_at = ?, status = ? WHERE id = ?",
            (title, content, updated_at, status, post_id),
        )
    else:
        result = db.execute(
            "UPDATE posts SET title = ?, content = ?, created_at = ?, updated_at = ?, status = ? WHERE id = ?",
            (title, content, created_at, updated_at, status, post_id),
        )
    if result.rowcount == 0:
        return {"error": "Post not found"}, 404
    db.commit()
    post = db.execute("SELECT created_at FROM posts WHERE id = ?", (post_id,)).fetchone()
    return jsonify({"success": True, "id": post_id, "title": title, "status": status, "createdAt": post["created_at"]}), 200


@app.route("/posts/<int:post_id>/comments", methods=["GET"])
def get_comments(post_id):
    sort = (request.args.get("sort") or "newest").lower()
    direction = "ASC" if sort == "oldest" else "DESC"
    db = get_db()
    comments = db.execute(
        f"""
        SELECT comments.id, comments.parent_id, comments.content, comments.created_at,
               users.id AS user_id, users.username, users.display_name, users.avatar_url
        FROM comments
        JOIN users ON users.id = comments.user_id
        WHERE comments.post_id = ?
        ORDER BY comments.created_at {direction}, comments.id {direction}
        """,
        (post_id,),
    ).fetchall()
    return jsonify([
        {
            "id": comment["id"],
            "parentId": comment["parent_id"],
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
    data = request.get_json() or {}
    content = (data.get("content") or "").strip()
    if not content:
        return {"error": "Comment cannot be empty"}, 400
    db = get_db()
    post = db.execute("SELECT id FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return {"error": "Post not found"}, 404

    parent_id = data.get("parentId") or data.get("parent_id")
    if parent_id in ("", 0, "0"):
        parent_id = None
    if parent_id is not None:
        try:
            parent_id = int(parent_id)
        except (TypeError, ValueError):
            return {"error": "Reply target is invalid"}, 400
        parent = db.execute(
            "SELECT id FROM comments WHERE id = ? AND post_id = ?",
            (parent_id, post_id),
        ).fetchone()
        if not parent:
            return {"error": "Reply target not found"}, 404

    cursor = db.execute(
        "INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)",
        (post_id, user["id"], parent_id, content[:1200]),
    )
    db.commit()
    return jsonify({"success": True, "id": cursor.lastrowid, "parentId": parent_id}), 201


@app.route("/home", methods=["GET"])
def get_home():
    db = get_db()
    page = db.execute("SELECT title, content, updated_at FROM pages WHERE slug = 'home'").fetchone()
    if not page:
        return jsonify({**DEFAULT_HOME_OBJECT, "updatedAt": None})
    return jsonify({**home_payload_from_content(page["content"]), "updatedAt": page["updated_at"]})


@app.route("/home", methods=["PUT"])
def update_home():
    user = current_user()
    if not is_runitrench(user):
        return {"error": "Unauthorized"}, 401
    payload = normalise_home_payload(request.get_json() or {})
    db = get_db()
    db.execute(
        """
        UPDATE pages
        SET title = ?, content = ?, updated_at = ?, updated_by = ?
        WHERE slug = 'home'
        """,
        ("Home", json.dumps(payload), datetime.now(), user["id"]),
    )
    db.commit()
    return jsonify({"success": True, **payload})


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



@app.route("/socials", methods=["GET"])
def get_socials():
    db = get_db()
    page = db.execute("SELECT title, content, updated_at FROM pages WHERE slug = 'socials'").fetchone()
    if not page:
        return jsonify({**DEFAULT_SOCIALS_OBJECT, "updatedAt": None})
    payload = socials_payload_from_content(page["content"])
    return jsonify({**payload, "updatedAt": page["updated_at"]})


@app.route("/socials", methods=["PUT"])
def update_socials():
    user = current_user()
    if not is_runitrench(user):
        return {"error": "Unauthorized"}, 401
    payload = normalise_socials_payload(request.get_json() or {})
    db = get_db()
    db.execute(
        """
        UPDATE pages
        SET title = ?, content = ?, updated_at = ?, updated_by = ?
        WHERE slug = 'socials'
        """,
        (payload["title"], json.dumps(payload), datetime.now(), user["id"]),
    )
    db.commit()
    return jsonify({"success": True, **payload})


@app.route("/spotify", methods=["GET"])
def get_spotify():
    db = get_db()
    page = db.execute("SELECT title, content, updated_at FROM pages WHERE slug = 'spotify'").fetchone()
    payload = spotify_payload_from_content(page["content"], page["title"])
    return jsonify({
        "title": payload["title"],
        "playlists": payload["playlists"],
        "updatedAt": page["updated_at"],
    })


@app.route("/spotify", methods=["PUT"])
def update_spotify():
    user = current_user()
    if not is_runitrench(user):
        return {"error": "Unauthorized"}, 401
    data = request.get_json() or {}
    title = (data.get("title") or "Spotify").strip()[:80] or "Spotify"
    playlist_inputs = data.get("playlists")
    if not isinstance(playlist_inputs, list):
        playlist_inputs = [{"label": "Playlist 1", "playlistUrl": data.get("playlistUrl") or data.get("embedCode") or ""}]

    playlists = []
    for index, item in enumerate(playlist_inputs):
        if not isinstance(item, dict):
            continue
        playlist, error = normalise_spotify_playlist(item, index)
        if error:
            return {"error": error}, 400
        if playlist:
            playlists.append(playlist)

    payload = {
        "title": title,
        "playlists": playlists,
    }
    db = get_db()
    db.execute(
        """
        UPDATE pages
        SET title = ?, content = ?, updated_at = ?, updated_by = ?
        WHERE slug = 'spotify'
        """,
        (title, json.dumps(payload), datetime.now(), user["id"]),
    )
    db.commit()
    return jsonify({"success": True, **payload})


def require_user():
    user = current_user()
    if not user:
        return None, ({"error": "Unauthorized"}, 401)
    return user, None


def parse_db_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).replace("Z", "")
    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def avalon_fail_threshold(player_count, quest_index):
    return 2 if player_count >= 7 and quest_index == 3 else 1


def avalon_build_roles(player_count):
    counts = AVALON_ROLE_COUNTS[player_count]
    roles = [
        {"role": "Merlin", "team": "good"},
        {"role": "Assassin", "team": "evil"},
    ]
    roles.extend({"role": "Servant of Arthur", "team": "good"} for _ in range(counts["good"] - 1))
    roles.extend({"role": "Minion of Mordred", "team": "evil"} for _ in range(counts["evil"] - 1))
    random.shuffle(roles)
    return roles


def avalon_user_brief(user_id):
    row = get_db().execute(
        "SELECT id, username, display_name, about_me, avatar_url, created_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    return row_to_user(row) if row else None


def avalon_player_user_payload(player):
    return {
        "id": player["user_id"],
        "username": player["username"],
        "displayName": player["display_name"] or player["username"],
        "aboutMe": player["about_me"] or "",
        "avatarUrl": player["avatar_url"] or "",
        "createdAt": player["created_at"],
    }


def avalon_stats_for_user(user_id):
    db = get_db()
    row = db.execute("SELECT * FROM avalon_user_stats WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        return {
            "gamesPlayed": 0,
            "gamesWon": 0,
            "gamesLost": 0,
            "gamesAsGood": 0,
            "gamesAsEvil": 0,
            "gamesAsMerlin": 0,
            "merlinGamesWon": 0,
            "gamesAsAssassin": 0,
            "killedMerlin": 0,
            "mmr": 1000,
            "winRate": 0,
        }
    played = row["games_played"] or 0
    return {
        "gamesPlayed": played,
        "gamesWon": row["games_won"] or 0,
        "gamesLost": row["games_lost"] or 0,
        "gamesAsGood": row["games_as_good"] or 0,
        "gamesAsEvil": row["games_as_evil"] or 0,
        "gamesAsMerlin": row["games_as_merlin"] or 0,
        "merlinGamesWon": row["merlin_games_won"] or 0,
        "gamesAsAssassin": row["games_as_assassin"] or 0,
        "killedMerlin": row["killed_merlin"] or 0,
        "mmr": row["mmr"] or 1000,
        "winRate": round(((row["games_won"] or 0) / played) * 100) if played else 0,
    }


def avalon_lobby_players(lobby_id):
    rows = get_db().execute(
        """
        SELECT lp.ready, lp.joined_at, users.id, users.username, users.display_name, users.about_me, users.avatar_url, users.created_at
        FROM avalon_lobby_players lp
        JOIN users ON users.id = lp.user_id
        WHERE lp.lobby_id = ?
        ORDER BY lp.joined_at ASC, lp.id ASC
        """,
        (lobby_id,),
    ).fetchall()
    return [{**row_to_user(row), "ready": bool(row["ready"]), "joinedAt": row["joined_at"]} for row in rows]


def avalon_lobby_payload(lobby):
    players = avalon_lobby_players(lobby["id"])
    return {
        "id": lobby["id"],
        "name": lobby["name"],
        "hostUserId": lobby["host_user_id"],
        "host": avalon_user_brief(lobby["host_user_id"]),
        "hasPassword": bool(lobby["password_hash"]),
        "status": lobby["status"],
        "maxPlayers": lobby["max_players"],
        "gameId": lobby["game_id"],
        "createdAt": lobby["created_at"],
        "startedAt": lobby["started_at"],
        "finishedAt": lobby["finished_at"],
        "expiresAt": lobby["expires_at"],
        "players": players,
        "playerCount": len(players),
    }


def avalon_event(game_id, event_type, message, payload=None):
    get_db().execute(
        "INSERT INTO avalon_events (game_id, event_type, message, payload_json) VALUES (?, ?, ?, ?)",
        (game_id, event_type, message, json.dumps(payload or {})),
    )


def avalon_game_players(game_id):
    rows = get_db().execute(
        """
        SELECT gp.*, users.username, users.display_name, users.about_me, users.avatar_url, users.created_at
        FROM avalon_game_players gp
        JOIN users ON users.id = gp.user_id
        WHERE gp.game_id = ?
        ORDER BY gp.turn_order ASC
        """,
        (game_id,),
    ).fetchall()
    return rows


def avalon_current_quest(game_id):
    return get_db().execute(
        "SELECT * FROM avalon_quests WHERE game_id = ? ORDER BY quest_index DESC LIMIT 1",
        (game_id,),
    ).fetchone()


def avalon_create_quest(game, leader_user_id):
    db = get_db()
    quest_index = game["current_quest_index"]
    player_count = game["player_count"]
    team_size = AVALON_QUEST_SIZES[player_count][quest_index]
    fail_threshold = avalon_fail_threshold(player_count, quest_index)
    db.execute(
        """
        INSERT OR IGNORE INTO avalon_quests
        (game_id, quest_index, team_size, fail_threshold, leader_user_id, status)
        VALUES (?, ?, ?, ?, ?, 'team_selection')
        """,
        (game["id"], quest_index, team_size, fail_threshold, leader_user_id),
    )


def avalon_next_leader(game_id, current_leader_id=None):
    players = avalon_game_players(game_id)
    if not players:
        return None, 0
    if current_leader_id is None:
        return players[0]["user_id"], 0
    current_index = next((index for index, player in enumerate(players) if player["user_id"] == current_leader_id), -1)
    next_index = (current_index + 1) % len(players)
    return players[next_index]["user_id"], next_index


def avalon_finish_game(game_id, winner, assassin_user_id=None, assassin_target_user_id=None):
    db = get_db()
    game = db.execute("SELECT * FROM avalon_games WHERE id = ?", (game_id,)).fetchone()
    if not game or game["status"] == "finished":
        return

    players = avalon_game_players(game_id)
    good_players = [player for player in players if player["team"] == "good"]
    evil_players = [player for player in players if player["team"] == "evil"]
    for player in players:
        db.execute(
            "INSERT OR IGNORE INTO avalon_user_stats (user_id, mmr) VALUES (?, 1000)",
            (player["user_id"],),
        )

    stats_rows = {
        row["user_id"]: row
        for row in db.execute(
            "SELECT * FROM avalon_user_stats WHERE user_id IN (%s)" % ",".join("?" for _ in players),
            [player["user_id"] for player in players],
        ).fetchall()
    }
    good_avg = sum(stats_rows[player["user_id"]]["mmr"] for player in good_players) / max(len(good_players), 1)
    evil_avg = sum(stats_rows[player["user_id"]]["mmr"] for player in evil_players) / max(len(evil_players), 1)
    expected_good = 1 / (1 + math.pow(10, (evil_avg - good_avg) / 400))
    expected_by_team = {"good": expected_good, "evil": 1 - expected_good}
    actual_by_team = {"good": 1 if winner == "good" else 0, "evil": 1 if winner == "evil" else 0}

    for player in players:
        stats = stats_rows[player["user_id"]]
        old_mmr = stats["mmr"] or 1000
        k_factor = 32 if (stats["games_played"] or 0) < 20 else 24
        new_mmr = max(100, round(old_mmr + k_factor * (actual_by_team[player["team"]] - expected_by_team[player["team"]])))
        won = player["team"] == winner
        killed_merlin = player["user_id"] == assassin_user_id and assassin_target_user_id and winner == "evil"
        db.execute(
            """
            UPDATE avalon_user_stats
            SET games_played = games_played + 1,
                games_won = games_won + ?,
                games_lost = games_lost + ?,
                games_as_good = games_as_good + ?,
                games_as_evil = games_as_evil + ?,
                games_as_merlin = games_as_merlin + ?,
                merlin_games_won = merlin_games_won + ?,
                games_as_assassin = games_as_assassin + ?,
                killed_merlin = killed_merlin + ?,
                mmr = ?
            WHERE user_id = ?
            """,
            (
                1 if won else 0,
                0 if won else 1,
                1 if player["team"] == "good" else 0,
                1 if player["team"] == "evil" else 0,
                1 if player["role"] == "Merlin" else 0,
                1 if player["role"] == "Merlin" and won else 0,
                1 if player["role"] == "Assassin" else 0,
                1 if killed_merlin else 0,
                new_mmr,
                player["user_id"],
            ),
        )
        db.execute(
            "UPDATE avalon_game_players SET final_result = ?, mmr_before = ?, mmr_after = ? WHERE game_id = ? AND user_id = ?",
            ("victory" if won else "defeat", old_mmr, new_mmr, game_id, player["user_id"]),
        )

    now = datetime.now()
    db.execute(
        "UPDATE avalon_games SET status = 'finished', current_phase = 'finished', winner = ?, finished_at = ? WHERE id = ?",
        (winner, now, game_id),
    )
    db.execute(
        "UPDATE avalon_lobbies SET status = 'finished', finished_at = ? WHERE id = ?",
        (now, game["lobby_id"]),
    )
    avalon_event(game_id, "game_finished", f"{winner.title()} wins", {"winner": winner})


def avalon_expire_game_if_needed(game):
    if not game or game["status"] != "in_progress":
        return game
    expires_at = parse_db_datetime(game["expires_at"])
    if expires_at and datetime.now() > expires_at:
        db = get_db()
        db.execute(
            "UPDATE avalon_games SET status = 'expired', current_phase = 'finished', finished_at = ? WHERE id = ?",
            (datetime.now(), game["id"]),
        )
        db.execute(
            "UPDATE avalon_lobbies SET status = 'expired', finished_at = ? WHERE id = ?",
            (datetime.now(), game["lobby_id"]),
        )
        avalon_event(game["id"], "game_expired", "Game expired after 24 hours")
        db.commit()
        return db.execute("SELECT * FROM avalon_games WHERE id = ?", (game["id"],)).fetchone()
    return game


def avalon_game_payload(game_id, viewer_id=None):
    db = get_db()
    game = db.execute("SELECT * FROM avalon_games WHERE id = ?", (game_id,)).fetchone()
    game = avalon_expire_game_if_needed(game)
    if not game:
        return None

    players = avalon_game_players(game_id)
    player_payloads = []
    viewer_player = next((player for player in players if player["user_id"] == viewer_id), None)
    for player in players:
        player_payload = {
            "user": avalon_player_user_payload(player),
            "turnOrder": player["turn_order"],
            "team": player["team"] if (player["user_id"] == viewer_id or game["status"] == "finished") else None,
            "role": player["role"] if (player["user_id"] == viewer_id or game["status"] == "finished") else None,
            "hasSeenRole": bool(player["has_seen_role"]),
            "continuedAfterRole": bool(player["continued_after_role"]),
            "finalResult": player["final_result"],
            "mmrBefore": player["mmr_before"],
            "mmrAfter": player["mmr_after"],
        }
        player_payloads.append(player_payload)

    quests = db.execute(
        "SELECT * FROM avalon_quests WHERE game_id = ? ORDER BY quest_index ASC",
        (game_id,),
    ).fetchall()
    quest_payloads = []
    current_quest_payload = None
    for quest in quests:
        selected_team = json.loads(quest["selected_team_json"] or "[]")
        votes = db.execute("SELECT user_id, vote FROM avalon_votes WHERE quest_id = ?", (quest["id"],)).fetchall()
        cards = db.execute("SELECT user_id, card FROM avalon_quest_cards WHERE quest_id = ?", (quest["id"],)).fetchall()
        vote_payloads = [{"userId": vote["user_id"], "vote": vote["vote"]} for vote in votes]
        card_payloads = [{"userId": card["user_id"], "submitted": True} for card in cards]
        payload = {
            "id": quest["id"],
            "questIndex": quest["quest_index"],
            "teamSize": quest["team_size"],
            "failThreshold": quest["fail_threshold"],
            "leaderUserId": quest["leader_user_id"],
            "status": quest["status"],
            "selectedTeam": selected_team,
            "result": quest["result"],
            "failCount": quest["fail_count"],
            "votes": vote_payloads,
            "approveCount": sum(1 for vote in votes if vote["vote"] == "approve"),
            "rejectCount": sum(1 for vote in votes if vote["vote"] == "reject"),
            "questCards": card_payloads,
        }
        quest_payloads.append(payload)
        if quest["quest_index"] == game["current_quest_index"]:
            current_quest_payload = payload

    events = db.execute(
        "SELECT id, created_at, event_type, message, payload_json FROM avalon_events WHERE game_id = ? ORDER BY created_at ASC, id ASC",
        (game_id,),
    ).fetchall()
    started_at = parse_db_datetime(game["started_at"])
    finished_at = parse_db_datetime(game["finished_at"]) or datetime.now()
    duration = int((finished_at - started_at).total_seconds()) if started_at else 0
    return {
        "id": game["id"],
        "lobbyId": game["lobby_id"],
        "status": game["status"],
        "playerCount": game["player_count"],
        "currentPhase": game["current_phase"],
        "currentQuestIndex": game["current_quest_index"],
        "currentLeaderUserId": game["current_leader_user_id"],
        "rejectedVotes": game["rejected_votes"],
        "winner": game["winner"],
        "startedAt": game["started_at"],
        "finishedAt": game["finished_at"],
        "expiresAt": game["expires_at"],
        "durationSeconds": max(duration, 0),
        "viewer": {
            "userId": viewer_id,
            "role": viewer_player["role"] if viewer_player else None,
            "team": viewer_player["team"] if viewer_player else None,
            "continuedAfterRole": bool(viewer_player["continued_after_role"]) if viewer_player else False,
            "isLeader": bool(viewer_player and viewer_player["user_id"] == game["current_leader_user_id"]),
        },
        "assassinTargets": [
            avalon_player_user_payload(player)
            for player in players
            if player["team"] == "good" and (game["current_phase"] == "assassin" or game["status"] == "finished")
        ],
        "players": player_payloads,
        "quests": quest_payloads,
        "currentQuest": current_quest_payload,
        "events": [
            {
                "id": event["id"],
                "createdAt": event["created_at"],
                "type": event["event_type"],
                "message": event["message"],
                "payload": json.loads(event["payload_json"] or "{}"),
            }
            for event in events
        ],
    }


def avalon_history_for_user(user_id, limit=20):
    db = get_db()
    games = db.execute(
        """
        SELECT gp.role, gp.team, gp.final_result, gp.mmr_before, gp.mmr_after,
               g.id, g.winner, g.started_at, g.finished_at, g.status
        FROM avalon_game_players gp
        JOIN avalon_games g ON g.id = gp.game_id
        WHERE gp.user_id = ? AND g.status = 'finished'
        ORDER BY g.finished_at DESC, g.id DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    history = []
    for game in games:
        events = db.execute(
            "SELECT id, created_at, event_type, message FROM avalon_events WHERE game_id = ? ORDER BY created_at ASC, id ASC",
            (game["id"],),
        ).fetchall()
        started_at = parse_db_datetime(game["started_at"])
        finished_at = parse_db_datetime(game["finished_at"])
        duration = int((finished_at - started_at).total_seconds()) if started_at and finished_at else 0
        history.append({
            "gameId": game["id"],
            "role": game["role"],
            "team": game["team"],
            "result": game["final_result"],
            "winner": game["winner"],
            "startedAt": game["started_at"],
            "finishedAt": game["finished_at"],
            "durationSeconds": max(duration, 0),
            "mmrBefore": game["mmr_before"],
            "mmrAfter": game["mmr_after"],
            "events": [
                {"id": event["id"], "createdAt": event["created_at"], "type": event["event_type"], "message": event["message"]}
                for event in events
            ],
        })
    return history


@app.route("/avalon/lobbies", methods=["GET"])
def avalon_list_lobbies():
    db = get_db()
    lobbies = db.execute(
        """
        SELECT * FROM avalon_lobbies
        WHERE status IN ('waiting', 'in_progress')
        ORDER BY created_at DESC, id DESC
        LIMIT 50
        """
    ).fetchall()
    return jsonify({"lobbies": [avalon_lobby_payload(lobby) for lobby in lobbies]})


@app.route("/avalon/lobbies", methods=["POST"])
def avalon_create_lobby():
    user, error = require_user()
    if error:
        return error
    data = request.get_json() or {}
    name = (data.get("name") or f"{user['display_name'] or user['username']}'s Avalon lobby").strip()[:80]
    password = (data.get("password") or "").strip()
    max_players = max(5, min(int(data.get("maxPlayers") or 10), 10))
    db = get_db()
    cursor = db.execute(
        "INSERT INTO avalon_lobbies (name, host_user_id, password_hash, max_players) VALUES (?, ?, ?, ?)",
        (name, user["id"], generate_password_hash(password) if password else "", max_players),
    )
    lobby_id = cursor.lastrowid
    db.execute(
        "INSERT INTO avalon_lobby_players (lobby_id, user_id, ready) VALUES (?, ?, 1)",
        (lobby_id, user["id"]),
    )
    db.commit()
    lobby = db.execute("SELECT * FROM avalon_lobbies WHERE id = ?", (lobby_id,)).fetchone()
    return jsonify({"lobby": avalon_lobby_payload(lobby)}), 201


@app.route("/avalon/lobbies/<int:lobby_id>", methods=["GET"])
def avalon_get_lobby(lobby_id):
    lobby = get_db().execute("SELECT * FROM avalon_lobbies WHERE id = ?", (lobby_id,)).fetchone()
    if not lobby:
        return {"error": "Lobby not found"}, 404
    return jsonify({"lobby": avalon_lobby_payload(lobby)})


@app.route("/avalon/lobbies/<int:lobby_id>/join", methods=["POST"])
def avalon_join_lobby(lobby_id):
    user, error = require_user()
    if error:
        return error
    data = request.get_json() or {}
    password = (data.get("password") or "").strip()
    db = get_db()
    lobby = db.execute("SELECT * FROM avalon_lobbies WHERE id = ?", (lobby_id,)).fetchone()
    if not lobby:
        return {"error": "Lobby not found"}, 404
    if lobby["status"] != "waiting":
        return {"error": "This lobby has already started"}, 400
    if lobby["password_hash"] and not check_password_hash(lobby["password_hash"], password):
        return {"error": "Incorrect lobby password"}, 403
    count = db.execute("SELECT COUNT(*) AS count FROM avalon_lobby_players WHERE lobby_id = ?", (lobby_id,)).fetchone()["count"]
    if count >= lobby["max_players"]:
        return {"error": "Lobby is full"}, 400
    db.execute("INSERT OR IGNORE INTO avalon_lobby_players (lobby_id, user_id, ready) VALUES (?, ?, 0)", (lobby_id, user["id"]))
    db.commit()
    lobby = db.execute("SELECT * FROM avalon_lobbies WHERE id = ?", (lobby_id,)).fetchone()
    return jsonify({"lobby": avalon_lobby_payload(lobby)})


@app.route("/avalon/lobbies/<int:lobby_id>/ready", methods=["POST"])
def avalon_set_ready(lobby_id):
    user, error = require_user()
    if error:
        return error
    ready = 1 if (request.get_json() or {}).get("ready", True) else 0
    db = get_db()
    result = db.execute(
        """
        UPDATE avalon_lobby_players
        SET ready = ?
        WHERE lobby_id = ? AND user_id = ?
        """,
        (ready, lobby_id, user["id"]),
    )
    if result.rowcount == 0:
        return {"error": "You are not in this lobby"}, 404
    db.commit()
    lobby = db.execute("SELECT * FROM avalon_lobbies WHERE id = ?", (lobby_id,)).fetchone()
    return jsonify({"lobby": avalon_lobby_payload(lobby)})


@app.route("/avalon/lobbies/<int:lobby_id>/leave", methods=["POST"])
def avalon_leave_lobby(lobby_id):
    user, error = require_user()
    if error:
        return error
    db = get_db()
    lobby = db.execute("SELECT * FROM avalon_lobbies WHERE id = ?", (lobby_id,)).fetchone()
    if not lobby:
        return {"error": "Lobby not found"}, 404
    if lobby["status"] != "waiting":
        return {"error": "Game has already started"}, 400
    db.execute("DELETE FROM avalon_lobby_players WHERE lobby_id = ? AND user_id = ?", (lobby_id, user["id"]))
    remaining = db.execute("SELECT user_id FROM avalon_lobby_players WHERE lobby_id = ? ORDER BY joined_at ASC LIMIT 1", (lobby_id,)).fetchone()
    if not remaining:
        db.execute("UPDATE avalon_lobbies SET status = 'closed' WHERE id = ?", (lobby_id,))
    elif lobby["host_user_id"] == user["id"]:
        db.execute("UPDATE avalon_lobbies SET host_user_id = ? WHERE id = ?", (remaining["user_id"], lobby_id))
    db.commit()
    lobby = db.execute("SELECT * FROM avalon_lobbies WHERE id = ?", (lobby_id,)).fetchone()
    return jsonify({"lobby": avalon_lobby_payload(lobby)})


@app.route("/avalon/lobbies/<int:lobby_id>/start", methods=["POST"])
def avalon_start_lobby(lobby_id):
    user, error = require_user()
    if error:
        return error
    db = get_db()
    lobby = db.execute("SELECT * FROM avalon_lobbies WHERE id = ?", (lobby_id,)).fetchone()
    if not lobby:
        return {"error": "Lobby not found"}, 404
    if lobby["host_user_id"] != user["id"]:
        return {"error": "Only the host can start this lobby"}, 403
    if lobby["status"] != "waiting":
        return {"error": "Lobby has already started"}, 400
    lobby_players = db.execute(
        """
        SELECT lp.ready, users.id, users.username, users.display_name
        FROM avalon_lobby_players lp
        JOIN users ON users.id = lp.user_id
        WHERE lp.lobby_id = ?
        ORDER BY lp.joined_at ASC, lp.id ASC
        """,
        (lobby_id,),
    ).fetchall()
    if len(lobby_players) < 5 or len(lobby_players) > 10:
        return {"error": "Avalon online needs 5 to 10 players"}, 400
    if any(not player["ready"] for player in lobby_players):
        return {"error": "Everyone needs to be ready first"}, 400

    now = datetime.now()
    expires_at = now + timedelta(days=1)
    roles = avalon_build_roles(len(lobby_players))
    turn_order = list(range(len(lobby_players)))
    random.shuffle(turn_order)
    ordered_players = [lobby_players[index] for index in turn_order]
    leader = random.choice(ordered_players)
    cursor = db.execute(
        """
        INSERT INTO avalon_games
        (lobby_id, player_count, current_phase, current_leader_user_id, turn_index, started_at, expires_at)
        VALUES (?, ?, 'roles', ?, 0, ?, ?)
        """,
        (lobby_id, len(lobby_players), leader["id"], now, expires_at),
    )
    game_id = cursor.lastrowid
    for order_index, player in enumerate(ordered_players):
        role = roles[order_index]
        db.execute(
            """
            INSERT INTO avalon_game_players
            (game_id, user_id, role, team, turn_order, mmr_before, mmr_after)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (game_id, player["id"], role["role"], role["team"], order_index, avalon_stats_for_user(player["id"])["mmr"], avalon_stats_for_user(player["id"])["mmr"]),
        )
    db.execute(
        "UPDATE avalon_lobbies SET status = 'in_progress', game_id = ?, started_at = ?, expires_at = ? WHERE id = ?",
        (game_id, now, expires_at, lobby_id),
    )
    avalon_event(game_id, "game_started", "Game started", {"players": [player["id"] for player in ordered_players]})
    avalon_event(game_id, "leader_selected", f"{leader['display_name'] or leader['username']} is the first leader", {"leaderUserId": leader["id"]})
    db.commit()
    return jsonify({"game": avalon_game_payload(game_id, user["id"])})


@app.route("/avalon/games/<int:game_id>", methods=["GET"])
def avalon_get_game(game_id):
    user, error = require_user()
    if error:
        return error
    player = get_db().execute(
        "SELECT id FROM avalon_game_players WHERE game_id = ? AND user_id = ?",
        (game_id, user["id"]),
    ).fetchone()
    if not player:
        return {"error": "You are not in this game"}, 403
    game = avalon_game_payload(game_id, user["id"])
    if not game:
        return {"error": "Game not found"}, 404
    return jsonify({"game": game})


@app.route("/avalon/games/<int:game_id>/continue", methods=["POST"])
def avalon_continue_after_role(game_id):
    user, error = require_user()
    if error:
        return error
    db = get_db()
    game = db.execute("SELECT * FROM avalon_games WHERE id = ?", (game_id,)).fetchone()
    game = avalon_expire_game_if_needed(game)
    if not game or game["status"] != "in_progress":
        return {"error": "Game is not active"}, 400
    if game["current_phase"] != "roles":
        return jsonify({"game": avalon_game_payload(game_id, user["id"])})
    result = db.execute(
        "UPDATE avalon_game_players SET has_seen_role = 1, continued_after_role = 1 WHERE game_id = ? AND user_id = ?",
        (game_id, user["id"]),
    )
    if result.rowcount == 0:
        return {"error": "You are not in this game"}, 403
    pending = db.execute(
        "SELECT COUNT(*) AS count FROM avalon_game_players WHERE game_id = ? AND continued_after_role = 0",
        (game_id,),
    ).fetchone()["count"]
    if pending == 0:
        avalon_create_quest(game, game["current_leader_user_id"])
        db.execute("UPDATE avalon_games SET current_phase = 'team_selection' WHERE id = ?", (game_id,))
        avalon_event(game_id, "roles_confirmed", "Everyone confirmed their role")
    db.commit()
    return jsonify({"game": avalon_game_payload(game_id, user["id"])})


@app.route("/avalon/games/<int:game_id>/team", methods=["POST"])
def avalon_choose_team(game_id):
    user, error = require_user()
    if error:
        return error
    data = request.get_json() or {}
    selected_team = [int(user_id) for user_id in data.get("selectedTeam", [])]
    db = get_db()
    game = avalon_expire_game_if_needed(db.execute("SELECT * FROM avalon_games WHERE id = ?", (game_id,)).fetchone())
    if not game or game["status"] != "in_progress" or game["current_phase"] != "team_selection":
        return {"error": "Team selection is not active"}, 400
    if game["current_leader_user_id"] != user["id"]:
        return {"error": "Only the current leader can choose the team"}, 403
    quest = avalon_current_quest(game_id)
    if not quest:
        avalon_create_quest(game, user["id"])
        quest = avalon_current_quest(game_id)
    if len(set(selected_team)) != quest["team_size"]:
        return {"error": f"Select exactly {quest['team_size']} players"}, 400
    valid_players = {
        row["user_id"]
        for row in db.execute("SELECT user_id FROM avalon_game_players WHERE game_id = ?", (game_id,)).fetchall()
    }
    if any(player_id not in valid_players for player_id in selected_team):
        return {"error": "Selected team contains a player outside this game"}, 400
    db.execute(
        "UPDATE avalon_quests SET selected_team_json = ?, status = 'voting' WHERE id = ?",
        (json.dumps(selected_team), quest["id"]),
    )
    db.execute("DELETE FROM avalon_votes WHERE quest_id = ?", (quest["id"],))
    db.execute("DELETE FROM avalon_quest_cards WHERE quest_id = ?", (quest["id"],))
    db.execute("UPDATE avalon_games SET current_phase = 'voting' WHERE id = ?", (game_id,))
    names = [
        (avalon_user_brief(player_id) or {}).get("displayName") or (avalon_user_brief(player_id) or {}).get("username") or str(player_id)
        for player_id in selected_team
    ]
    avalon_event(game_id, "team_selected", f"{user['display_name'] or user['username']} picked {', '.join(names)}", {"selectedTeam": selected_team})
    db.commit()
    return jsonify({"game": avalon_game_payload(game_id, user["id"])})


@app.route("/avalon/games/<int:game_id>/vote", methods=["POST"])
def avalon_vote_team(game_id):
    user, error = require_user()
    if error:
        return error
    vote = (request.get_json() or {}).get("vote")
    if vote not in ("approve", "reject"):
        return {"error": "Vote must be approve or reject"}, 400
    db = get_db()
    game = avalon_expire_game_if_needed(db.execute("SELECT * FROM avalon_games WHERE id = ?", (game_id,)).fetchone())
    if not game or game["status"] != "in_progress" or game["current_phase"] != "voting":
        return {"error": "Voting is not active"}, 400
    if not db.execute("SELECT id FROM avalon_game_players WHERE game_id = ? AND user_id = ?", (game_id, user["id"])).fetchone():
        return {"error": "You are not in this game"}, 403
    quest = avalon_current_quest(game_id)
    db.execute(
        "INSERT OR REPLACE INTO avalon_votes (quest_id, user_id, vote) VALUES (?, ?, ?)",
        (quest["id"], user["id"], vote),
    )
    vote_count = db.execute("SELECT COUNT(*) AS count FROM avalon_votes WHERE quest_id = ?", (quest["id"],)).fetchone()["count"]
    if vote_count == game["player_count"]:
        votes = db.execute("SELECT vote FROM avalon_votes WHERE quest_id = ?", (quest["id"],)).fetchall()
        approve_count = sum(1 for item in votes if item["vote"] == "approve")
        reject_count = len(votes) - approve_count
        avalon_event(game_id, "vote_result", f"Team vote: {approve_count} approve, {reject_count} reject", {"approve": approve_count, "reject": reject_count})
        if approve_count > reject_count:
            db.execute("UPDATE avalon_quests SET status = 'quest_cards' WHERE id = ?", (quest["id"],))
            db.execute("UPDATE avalon_games SET current_phase = 'quest_cards', rejected_votes = 0 WHERE id = ?", (game_id,))
        else:
            rejected_votes = game["rejected_votes"] + 1
            if rejected_votes >= 5:
                db.execute("UPDATE avalon_games SET rejected_votes = ? WHERE id = ?", (rejected_votes, game_id))
                avalon_event(game_id, "five_rejections", "Five teams were rejected")
                avalon_finish_game(game_id, "evil")
            else:
                leader_user_id, turn_index = avalon_next_leader(game_id, game["current_leader_user_id"])
                db.execute(
                    """
                    UPDATE avalon_games
                    SET current_phase = 'team_selection', current_leader_user_id = ?, turn_index = ?, rejected_votes = ?
                    WHERE id = ?
                    """,
                    (leader_user_id, turn_index, rejected_votes, game_id),
                )
                db.execute(
                    "UPDATE avalon_quests SET status = 'team_selection', selected_team_json = '[]' WHERE id = ?",
                    (quest["id"],),
                )
                avalon_event(game_id, "team_rejected", "Team rejected; leadership passes on", {"leaderUserId": leader_user_id})
    db.commit()
    return jsonify({"game": avalon_game_payload(game_id, user["id"])})


@app.route("/avalon/games/<int:game_id>/quest-card", methods=["POST"])
def avalon_submit_quest_card(game_id):
    user, error = require_user()
    if error:
        return error
    card = (request.get_json() or {}).get("card")
    if card not in ("success", "fail"):
        return {"error": "Quest card must be success or fail"}, 400
    db = get_db()
    game = avalon_expire_game_if_needed(db.execute("SELECT * FROM avalon_games WHERE id = ?", (game_id,)).fetchone())
    if not game or game["status"] != "in_progress" or game["current_phase"] != "quest_cards":
        return {"error": "Quest cards are not active"}, 400
    player = db.execute("SELECT * FROM avalon_game_players WHERE game_id = ? AND user_id = ?", (game_id, user["id"])).fetchone()
    if not player:
        return {"error": "You are not in this game"}, 403
    if player["team"] == "good" and card == "fail":
        return {"error": "Good players can only choose Success"}, 400
    quest = avalon_current_quest(game_id)
    selected_team = json.loads(quest["selected_team_json"] or "[]")
    if user["id"] not in selected_team:
        return {"error": "You are not on this quest"}, 403
    db.execute(
        "INSERT OR REPLACE INTO avalon_quest_cards (quest_id, user_id, card) VALUES (?, ?, ?)",
        (quest["id"], user["id"], card),
    )
    card_count = db.execute("SELECT COUNT(*) AS count FROM avalon_quest_cards WHERE quest_id = ?", (quest["id"],)).fetchone()["count"]
    if card_count == quest["team_size"]:
        cards = db.execute("SELECT card FROM avalon_quest_cards WHERE quest_id = ?", (quest["id"],)).fetchall()
        fail_count = sum(1 for item in cards if item["card"] == "fail")
        result = "fail" if fail_count >= quest["fail_threshold"] else "success"
        db.execute(
            """
            UPDATE avalon_quests
            SET status = 'resolved', result = ?, fail_count = ?, resolved_at = ?
            WHERE id = ?
            """,
            (result, fail_count, datetime.now(), quest["id"]),
        )
        avalon_event(game_id, "quest_result", f"Quest {quest['quest_index'] + 1} {'failed' if result == 'fail' else 'passed'}", {"failCount": fail_count, "result": result})
        totals = db.execute(
            """
            SELECT
                SUM(CASE WHEN result = 'success' THEN 1 ELSE 0 END) AS successes,
                SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) AS fails
            FROM avalon_quests
            WHERE game_id = ? AND result IS NOT NULL
            """,
            (game_id,),
        ).fetchone()
        if (totals["fails"] or 0) >= 3:
            avalon_finish_game(game_id, "evil")
        elif (totals["successes"] or 0) >= 3:
            db.execute("UPDATE avalon_games SET current_phase = 'assassin' WHERE id = ?", (game_id,))
            avalon_event(game_id, "assassin_phase", "Good completed three quests. Assassin chooses Merlin.")
        else:
            next_index = game["current_quest_index"] + 1
            leader_user_id, turn_index = avalon_next_leader(game_id, game["current_leader_user_id"])
            db.execute(
                """
                UPDATE avalon_games
                SET current_phase = 'team_selection', current_quest_index = ?, current_leader_user_id = ?, turn_index = ?, rejected_votes = 0
                WHERE id = ?
                """,
                (next_index, leader_user_id, turn_index, game_id),
            )
            next_game = db.execute("SELECT * FROM avalon_games WHERE id = ?", (game_id,)).fetchone()
            avalon_create_quest(next_game, leader_user_id)
            avalon_event(game_id, "leader_selected", "Leadership passes on", {"leaderUserId": leader_user_id})
    db.commit()
    return jsonify({"game": avalon_game_payload(game_id, user["id"])})


@app.route("/avalon/games/<int:game_id>/assassin-pick", methods=["POST"])
def avalon_assassin_pick(game_id):
    user, error = require_user()
    if error:
        return error
    target_user_id = int((request.get_json() or {}).get("targetUserId") or 0)
    db = get_db()
    game = avalon_expire_game_if_needed(db.execute("SELECT * FROM avalon_games WHERE id = ?", (game_id,)).fetchone())
    if not game or game["status"] != "in_progress" or game["current_phase"] != "assassin":
        return {"error": "Assassin choice is not active"}, 400
    assassin = db.execute(
        "SELECT * FROM avalon_game_players WHERE game_id = ? AND user_id = ? AND role = 'Assassin'",
        (game_id, user["id"]),
    ).fetchone()
    if not assassin:
        return {"error": "Only the Assassin can choose Merlin"}, 403
    target = db.execute(
        "SELECT * FROM avalon_game_players WHERE game_id = ? AND user_id = ? AND team = 'good'",
        (game_id, target_user_id),
    ).fetchone()
    if not target:
        return {"error": "Pick a good player"}, 400
    winner = "evil" if target["role"] == "Merlin" else "good"
    avalon_event(game_id, "assassin_pick", f"Assassin picked {avalon_user_brief(target_user_id)['displayName']}", {"targetUserId": target_user_id, "hitMerlin": target["role"] == "Merlin"})
    avalon_finish_game(game_id, winner, assassin_user_id=user["id"], assassin_target_user_id=target_user_id)
    db.commit()
    return jsonify({"game": avalon_game_payload(game_id, user["id"])})


@app.route("/users/<int:user_id>/avalon-stats", methods=["GET"])
def avalon_user_stats_endpoint(user_id):
    return jsonify({"stats": avalon_stats_for_user(user_id)})


@app.route("/users/<int:user_id>/avalon-history", methods=["GET"])
def avalon_user_history_endpoint(user_id):
    return jsonify({"history": avalon_history_for_user(user_id)})


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


@app.route("/settings/change-password", methods=["POST"])
def change_password():
    user = current_user()
    if not user:
        return {"error": "Unauthorized"}, 401

    data = request.get_json() or {}
    current_password = data.get("currentPassword") or ""
    new_password = data.get("newPassword") or ""
    if not current_password:
        return {"error": "Type your current password first."}, 400
    if len(new_password) < 8:
        return {"error": "New password must be at least 8 characters."}, 400

    db = get_db()
    account = db.execute(
        "SELECT id, password_hash FROM users WHERE id = ?",
        (user["id"],),
    ).fetchone()
    if not account or not check_password_hash(account["password_hash"], current_password):
        return {"error": "Current password is incorrect"}, 401

    db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (generate_password_hash(new_password, method="pbkdf2:sha256"), user["id"]),
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



@app.route("/concerts", methods=["GET"])
def get_concerts():
    db = get_db()
    events = db.execute(
        """
        SELECT id, artist, city, event_date, date_note, openers, status, sort_order, created_at, updated_at
        FROM concert_events
        ORDER BY sort_order ASC, id ASC
        """
    ).fetchall()
    wishlist = db.execute(
        """
        SELECT id, artist, sort_order, created_at, updated_at
        FROM concert_wishlist
        ORDER BY sort_order ASC, id ASC
        """
    ).fetchall()
    return jsonify({
        "events": [concert_event_payload(event) for event in events],
        "wishlist": [concert_wishlist_payload(item) for item in wishlist],
    })


@app.route("/concerts/events", methods=["POST"])
def create_concert_event():
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    data, error = normalise_concert_event_payload(request.get_json() or {})
    if error:
        return {"error": error}, 400
    if not data["artist"]:
        return {"error": "Artist is required"}, 400
    db = get_db()
    next_order = db.execute("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM concert_events").fetchone()["next_order"]
    now = datetime.now()
    cursor = db.execute(
        """
        INSERT INTO concert_events (artist, city, event_date, date_note, openers, status, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (data["artist"], data["city"], data["eventDate"], data["dateNote"], data["openers"], data["status"], next_order, now, now),
    )
    db.commit()
    event = db.execute("SELECT * FROM concert_events WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(concert_event_payload(event)), 201


@app.route("/concerts/events/<int:event_id>", methods=["PUT"])
def update_concert_event(event_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    data, error = normalise_concert_event_payload(request.get_json() or {})
    if error:
        return {"error": error}, 400
    if not data["artist"]:
        return {"error": "Artist is required"}, 400
    db = get_db()
    result = db.execute(
        """
        UPDATE concert_events
        SET artist = ?, city = ?, event_date = ?, date_note = ?, openers = ?, status = ?, updated_at = ?
        WHERE id = ?
        """,
        (data["artist"], data["city"], data["eventDate"], data["dateNote"], data["openers"], data["status"], datetime.now(), event_id),
    )
    if result.rowcount == 0:
        return {"error": "Concert not found"}, 404
    db.commit()
    event = db.execute("SELECT * FROM concert_events WHERE id = ?", (event_id,)).fetchone()
    return jsonify(concert_event_payload(event))


@app.route("/concerts/events/<int:event_id>", methods=["DELETE"])
def delete_concert_event(event_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    db = get_db()
    result = db.execute("DELETE FROM concert_events WHERE id = ?", (event_id,))
    if result.rowcount == 0:
        return {"error": "Concert not found"}, 404
    db.commit()
    return jsonify({"success": True})


@app.route("/concerts/wishlist", methods=["POST"])
def create_concert_wishlist_item():
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    artist = (request.get_json() or {}).get("artist", "").strip()[:160]
    if not artist:
        return {"error": "Artist is required"}, 400
    db = get_db()
    next_order = db.execute("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM concert_wishlist").fetchone()["next_order"]
    now = datetime.now()
    cursor = db.execute(
        "INSERT INTO concert_wishlist (artist, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (artist, next_order, now, now),
    )
    db.commit()
    item = db.execute("SELECT * FROM concert_wishlist WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(concert_wishlist_payload(item)), 201


@app.route("/concerts/wishlist/<int:item_id>", methods=["PUT"])
def update_concert_wishlist_item(item_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    artist = (request.get_json() or {}).get("artist", "").strip()[:160]
    if not artist:
        return {"error": "Artist is required"}, 400
    db = get_db()
    result = db.execute(
        "UPDATE concert_wishlist SET artist = ?, updated_at = ? WHERE id = ?",
        (artist, datetime.now(), item_id),
    )
    if result.rowcount == 0:
        return {"error": "Wishlist item not found"}, 404
    db.commit()
    item = db.execute("SELECT * FROM concert_wishlist WHERE id = ?", (item_id,)).fetchone()
    return jsonify(concert_wishlist_payload(item))


@app.route("/concerts/wishlist/<int:item_id>", methods=["DELETE"])
def delete_concert_wishlist_item(item_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    db = get_db()
    result = db.execute("DELETE FROM concert_wishlist WHERE id = ?", (item_id,))
    if result.rowcount == 0:
        return {"error": "Wishlist item not found"}, 404
    db.commit()
    return jsonify({"success": True})


@app.route("/gallery", methods=["GET"])
def get_gallery_photos():
    db = get_db()
    photos = db.execute(
        """
        SELECT id, image_url, caption, created_at, updated_at
        FROM gallery_photos
        ORDER BY datetime(created_at) DESC, id DESC
        """
    ).fetchall()
    return jsonify([gallery_photo_payload(photo) for photo in photos])


@app.route("/gallery", methods=["POST"])
def create_gallery_photo():
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    image_url, error = save_gallery_image(request.files.get("file"))
    if error:
        message, status = error
        return {"error": message}, status
    caption = (request.form.get("caption") or "").strip()[:500]
    now = datetime.now()
    db = get_db()
    cursor = db.execute(
        """
        INSERT INTO gallery_photos (image_url, caption, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        """,
        (image_url, caption, now, now),
    )
    db.commit()
    photo = db.execute("SELECT * FROM gallery_photos WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(gallery_photo_payload(photo)), 201


@app.route("/gallery/<int:photo_id>", methods=["PUT"])
def update_gallery_photo(photo_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    db = get_db()
    current = db.execute("SELECT * FROM gallery_photos WHERE id = ?", (photo_id,)).fetchone()
    if not current:
        return {"error": "Photo not found"}, 404

    if request.content_type and request.content_type.startswith("multipart/form-data"):
        caption = (request.form.get("caption") or "").strip()[:500]
        image_url = current["image_url"]
        replacement = request.files.get("file")
        if replacement and replacement.filename:
            image_url, error = save_gallery_image(replacement)
            if error:
                message, status = error
                return {"error": message}, status
            delete_upload_path(current["image_url"])
    else:
        data = request.get_json(silent=True) or {}
        caption = (data.get("caption") or "").strip()[:500]
        image_url = current["image_url"]

    db.execute(
        "UPDATE gallery_photos SET image_url = ?, caption = ?, updated_at = ? WHERE id = ?",
        (image_url, caption, datetime.now(), photo_id),
    )
    db.commit()
    photo = db.execute("SELECT * FROM gallery_photos WHERE id = ?", (photo_id,)).fetchone()
    return jsonify(gallery_photo_payload(photo))


@app.route("/gallery/<int:photo_id>", methods=["DELETE"])
def delete_gallery_photo(photo_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    db = get_db()
    photo = db.execute("SELECT * FROM gallery_photos WHERE id = ?", (photo_id,)).fetchone()
    if not photo:
        return {"error": "Photo not found"}, 404
    delete_upload_path(photo["image_url"])
    db.execute("DELETE FROM gallery_photos WHERE id = ?", (photo_id,))
    db.commit()
    return jsonify({"success": True})


@app.route("/users/search", methods=["GET"])
def search_users():
    raw_query = (request.args.get("username") or request.args.get("q") or "").strip()
    username = raw_query.lstrip("@").strip()
    username = re.sub(r"[^A-Za-z0-9_]", "", username)[:24]
    if not username:
        return jsonify({"query": "", "users": []})

    needle = username.lower()
    db = get_db()
    users = db.execute(
        """
        SELECT id, username, display_name, about_me, avatar_url, created_at
        FROM users
        WHERE lower(username) LIKE ?
        ORDER BY
            CASE
                WHEN lower(username) = ? THEN 0
                WHEN lower(username) LIKE ? THEN 1
                ELSE 2
            END,
            lower(username) ASC
        LIMIT 20
        """,
        (f"%{needle}%", needle, f"{needle}%"),
    ).fetchall()
    return jsonify({"query": username, "users": [row_to_user(user) for user in users]})


@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    db = get_db()
    user = db.execute(
        "SELECT id, username, display_name, about_me, avatar_url, created_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    if not user:
        return {"error": "User not found"}, 404
    comments = db.execute(
        """
        SELECT comments.id, comments.parent_id, comments.content, comments.created_at,
               posts.id AS post_id, posts.title AS post_title,
               parent_users.id AS parent_user_id,
               parent_users.username AS parent_username,
               parent_users.display_name AS parent_display_name,
               parent_users.avatar_url AS parent_avatar_url,
               parent_users.created_at AS parent_created_at
        FROM comments
        JOIN posts ON posts.id = comments.post_id
        LEFT JOIN comments AS parent_comments ON parent_comments.id = comments.parent_id
        LEFT JOIN users AS parent_users ON parent_users.id = parent_comments.user_id
        WHERE comments.user_id = ?
        ORDER BY comments.created_at DESC, comments.id DESC
        """,
        (user_id,),
    ).fetchall()
    comment_payloads = [
        {
            "id": comment["id"],
            "parentId": comment["parent_id"],
            "content": comment["content"],
            "createdAt": comment["created_at"],
            "post": {"id": comment["post_id"], "title": comment["post_title"]},
            "replyingTo": None if not comment["parent_user_id"] else {
                "id": comment["parent_user_id"],
                "username": comment["parent_username"],
                "displayName": comment["parent_display_name"] or comment["parent_username"],
                "avatarUrl": comment["parent_avatar_url"] or "",
                "createdAt": comment["parent_created_at"],
            },
        }
        for comment in comments
    ]
    payload = row_to_user(user)
    payload["comments"] = comment_payloads
    payload["recentComment"] = comment_payloads[0] if comment_payloads else None
    payload["avalonStats"] = avalon_stats_for_user(user_id)
    payload["avalonHistory"] = avalon_history_for_user(user_id)
    return jsonify(payload)


@app.route("/travel-plans", methods=["GET"])
def get_travel_plans():
    db = get_db()
    plans = db.execute(
        """
        SELECT travel_plans.id, travel_plans.title, travel_plans.destination, travel_plans.start_date,
               travel_plans.end_date, travel_plans.notes, travel_plans.source_post_id,
               travel_plans.created_at, travel_plans.updated_at,
               COUNT(travel_items.id) AS item_count,
               SUM(CASE WHEN travel_items.is_done = 1 THEN 1 ELSE 0 END) AS done_count
        FROM travel_plans
        LEFT JOIN travel_items ON travel_items.plan_id = travel_plans.id
        GROUP BY travel_plans.id
        ORDER BY COALESCE(NULLIF(travel_plans.start_date, ''), travel_plans.created_at) DESC, travel_plans.id DESC
        """
    ).fetchall()
    return jsonify([travel_plan_summary_payload(plan) for plan in plans])


@app.route("/travel-plans/<int:plan_id>", methods=["GET"])
def get_travel_plan(plan_id):
    db = get_db()
    plan = db.execute(
        "SELECT id, title, destination, start_date, end_date, notes, source_post_id, created_at, updated_at FROM travel_plans WHERE id = ?",
        (plan_id,),
    ).fetchone()
    if not plan:
        return {"error": "Travel plan not found"}, 404
    return jsonify(travel_plan_payload(plan))


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
                INSERT INTO travel_items (plan_id, day_label, time_label, section_title, title, description, url, is_done, created_at, completed_at, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            (plan_id, item["dayLabel"], item["timeLabel"], item["sectionTitle"], item["title"], item["description"], item["url"], item["isDone"], item["createdAt"], item["completedAt"], item["sortOrder"]),
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
            INSERT INTO travel_items (plan_id, day_label, time_label, section_title, title, description, url, is_done, created_at, completed_at, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (plan_id, item["dayLabel"], item["timeLabel"], item["sectionTitle"], item["title"], item["description"], item["url"], item["isDone"], item["createdAt"], item["completedAt"], item["sortOrder"]),
        )
    db.commit()
    plan = db.execute("SELECT * FROM travel_plans WHERE id = ?", (plan_id,)).fetchone()
    return jsonify(travel_plan_payload(plan))


@app.route("/travel-plans/<int:plan_id>/items/<int:item_id>", methods=["PATCH"])
def update_travel_item(plan_id, item_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    data = request.get_json() or {}
    is_done = 1 if data.get("isDone") else 0
    completed_at = datetime.now() if is_done else None
    db = get_db()
    plan = db.execute("SELECT * FROM travel_plans WHERE id = ?", (plan_id,)).fetchone()
    if not plan:
        return {"error": "Travel plan not found"}, 404
    result = db.execute(
        """
        UPDATE travel_items
        SET is_done = ?, completed_at = ?
        WHERE id = ? AND plan_id = ?
        """,
        (is_done, completed_at, item_id, plan_id),
    )
    if result.rowcount == 0:
        return {"error": "Travel item not found"}, 404
    db.execute("UPDATE travel_plans SET updated_at = ? WHERE id = ?", (datetime.now(), plan_id))
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


@app.route("/watchlist", methods=["GET"])
def get_watchlist():
    db = get_db()
    items = db.execute(
        """
        SELECT id, media_type, title, release_year, details, review, image_url, is_watched, rating,
               watched_at, created_at, updated_at
        FROM watchlist_items
        ORDER BY is_watched ASC, COALESCE(watched_at, updated_at, created_at) DESC, id DESC
        """
    ).fetchall()
    return jsonify([watchlist_item_payload(item) for item in items])


@app.route("/watchlist/<int:item_id>", methods=["GET"])
def get_watchlist_item(item_id):
    db = get_db()
    item = db.execute(
        """
        SELECT id, media_type, title, release_year, details, review, image_url, is_watched, rating,
               watched_at, created_at, updated_at
        FROM watchlist_items
        WHERE id = ?
        """,
        (item_id,),
    ).fetchone()
    if not item:
        return {"error": "Watchlist item not found"}, 404
    return jsonify(watchlist_item_payload(item))


@app.route("/watchlist", methods=["POST"])
def create_watchlist_item():
    user = current_user()
    if not is_runitrench(user):
        return {"error": "Unauthorized"}, 401
    data, error = normalise_watchlist_payload(request.get_json() or {})
    if error:
        return {"error": error}, 400
    if not data["title"]:
        return {"error": "Title is required"}, 400

    now = datetime.now()
    watched_at = now if data["isWatched"] else None
    db = get_db()
    cursor = db.execute(
        """
        INSERT INTO watchlist_items
            (media_type, title, release_year, details, review, image_url, is_watched, rating, watched_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data["mediaType"],
            data["title"],
            data["releaseYear"],
            data["details"],
            data["review"],
            data["imageUrl"],
            1 if data["isWatched"] else 0,
            data["rating"],
            watched_at,
            now,
            now,
        ),
    )
    db.commit()
    if data["imageUrl"].startswith("/uploads/"):
        clear_tmp_uploads()
    item = db.execute("SELECT * FROM watchlist_items WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(watchlist_item_payload(item)), 201


@app.route("/watchlist/<int:item_id>", methods=["PUT"])
def update_watchlist_item(item_id):
    user = current_user()
    if not is_runitrench(user):
        return {"error": "Unauthorized"}, 401
    data, error = normalise_watchlist_payload(request.get_json() or {})
    if error:
        return {"error": error}, 400
    if not data["title"]:
        return {"error": "Title is required"}, 400

    db = get_db()
    current = db.execute("SELECT watched_at, is_watched FROM watchlist_items WHERE id = ?", (item_id,)).fetchone()
    if not current:
        return {"error": "Watchlist item not found"}, 404
    now = datetime.now()
    watched_at = current["watched_at"]
    if data["isWatched"] and not current["is_watched"]:
        watched_at = now
    if not data["isWatched"]:
        watched_at = None
    db.execute(
        """
        UPDATE watchlist_items
        SET media_type = ?, title = ?, release_year = ?, details = ?, review = ?, image_url = ?,
            is_watched = ?, rating = ?, watched_at = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            data["mediaType"],
            data["title"],
            data["releaseYear"],
            data["details"],
            data["review"],
            data["imageUrl"],
            1 if data["isWatched"] else 0,
            data["rating"],
            watched_at,
            now,
            item_id,
        ),
    )
    db.commit()
    if data["imageUrl"].startswith("/uploads/"):
        clear_tmp_uploads()
    item = db.execute("SELECT * FROM watchlist_items WHERE id = ?", (item_id,)).fetchone()
    return jsonify(watchlist_item_payload(item))


@app.route("/watchlist/<int:item_id>/watched", methods=["PATCH"])
def update_watchlist_watched(item_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    data = request.get_json() or {}
    is_watched = 1 if data.get("isWatched") else 0
    now = datetime.now()
    watched_at = now if is_watched else None
    db = get_db()
    result = db.execute(
        """
        UPDATE watchlist_items
        SET is_watched = ?, watched_at = ?, updated_at = ?
        WHERE id = ?
        """,
        (is_watched, watched_at, now, item_id),
    )
    if result.rowcount == 0:
        return {"error": "Watchlist item not found"}, 404
    db.commit()
    item = db.execute("SELECT * FROM watchlist_items WHERE id = ?", (item_id,)).fetchone()
    return jsonify(watchlist_item_payload(item))


@app.route("/watchlist/<int:item_id>", methods=["DELETE"])
def delete_watchlist_item(item_id):
    if not is_runitrench(current_user()):
        return {"error": "Unauthorized"}, 401
    db = get_db()
    result = db.execute("DELETE FROM watchlist_items WHERE id = ?", (item_id,))
    if result.rowcount == 0:
        return {"error": "Watchlist item not found"}, 404
    db.commit()
    return jsonify({"success": True})


@app.route("/steam-savings", methods=["GET"])
def steam_savings():
    try:
        payload, error = build_steam_savings_payload(force_refresh=request.args.get("refresh") == "1")
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
