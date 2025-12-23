import sqlite3
from werkzeug.security import check_password_hash
from flask import Flask, g, request, jsonify, make_response, send_from_directory
from flask_cors import CORS # type: ignore
import secrets
from datetime import datetime, timedelta
import os
import re
import shutil
from urllib.parse import urlparse

IMG_SRC_REGEX = r'<img[^>]+src="([^">]+)"'

app = Flask(__name__)
app.config["DATABASE"] = "instance/app.db"
CORS(app, supports_credentials=True)  # allow all origins

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
TMP_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "tmp-uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TMP_UPLOAD_FOLDER, exist_ok=True)

@app.route("/upload", methods=["POST"])
def upload_image():
    user = authorise(request.cookies.get("session_id"))

    if not user:
        return {"error": "Unauthorized"}, 401
    
    if "file" not in request.files:
        return {"error": "No file part"}, 400
    
    file = request.files["file"]
    
    if file.filename == "":
        return {"error": "No selected file"}, 400
    
    # Optional: validate file type
    if not file.filename.lower().endswith((".png", ".jpg", ".jpeg", ".gif")):
        return {"error": "Invalid file type"}, 400

    # Save the file
    filename = secrets.token_hex(16) + os.path.splitext(file.filename)[1]
    file_path = os.path.join(TMP_UPLOAD_FOLDER, filename)
    file.save(file_path)

    # Return URL to access the image
    url = f"http://localhost:5000/tmp-uploads/{filename}"
    return {"url": url}

# Serve uploaded images
@app.route("/tmp-uploads/<filename>")
def tmp_uploaded_file(filename):
    return send_from_directory(TMP_UPLOAD_FOLDER, filename)

@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route("/posts", methods=["POST"])
def upload_post():
    user = authorise(request.cookies.get("session_id"))
    if not user:
        return {"error": "Unauthorized"}, 401

    db = get_db()
    data = request.get_json()

    title = data.get("title")
    content = data.get("content")

    if not title or not content:
        return jsonify({"error": "Missing title or content"}), 400

    # Move images + rewrite HTML
    content = migrate_images(content)
    clear_tmp_uploads()

    created_at = datetime.now()

    cursor = db.execute(
        "INSERT INTO posts (title, content, created_at) VALUES (?, ?, ?)",
        (title, content, created_at),
    )
    db.commit()

    post_id = cursor.lastrowid

    return jsonify({
        "success": True,
        "id": post_id,
        "title": title
    }), 201

@app.route("/posts", methods=["GET"])
def get_posts():
    db = get_db()
    
    # Fetch all posts, order by newest first
    posts = db.execute(
        "SELECT id, title, created_at FROM posts ORDER BY created_at DESC"
    ).fetchall()
    
    # Convert to list of dicts
    posts_list = [
        {
            "id": post["id"],
            "title": post["title"],
            "createdAt": post["created_at"],
        }
        for post in posts
    ]
    
    return jsonify(posts_list)

@app.route("/posts/<int:post_id>", methods=["GET"])
def get_post(post_id):
    db = get_db()
    post = db.execute(
        "SELECT id, title, content, created_at, updated_at FROM posts WHERE id = ?", (post_id,)
    ).fetchone()

    if not post:
        return jsonify({"error": "Post not found"}), 404

    return jsonify({
        "id": post["id"],
        "title": post["title"],
        "content": post["content"],
        "createdAt": post["created_at"],
        "updatedAt": post["updated_at"]
    })

import os
import re

@app.route("/posts/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    user = authorise(request.cookies.get("session_id"))
    if not user:
        return {"error": "Unauthorized"}, 401

    db = get_db()
    
    # Fetch the post content
    post = db.execute("SELECT content FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return {"error": "Post not found"}, 404
    
    content = post["content"]

    # Regex to find all image sources
    img_srcs = re.findall(IMG_SRC_REGEX, content)

    # Delete each image file
    for src in img_srcs:
        try:
            # Only delete files from your uploads folder
            filename = os.path.basename(src)
            file_path = os.path.join(os.path.dirname(__file__), "uploads", filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Failed to delete image {src}: {e}")

    # Now delete the post from the database
    db.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    db.commit()

    return jsonify({"success": True}), 200

@app.route("/posts/<int:post_id>", methods=["PUT"])
def update_post(post_id):
    user = authorise(request.cookies.get("session_id"))
    if not user:
        return {"error": "Unauthorized"}, 401

    db = get_db()
    data = request.get_json()

    title = data.get("title")
    content = data.get("content")

    if not title or not content:
        return jsonify({"error": "Missing title or content"}), 400

    content = migrate_images(content)
    clear_tmp_uploads()
    
    db.execute(
        "UPDATE posts SET title = ?, content = ?, updated_at = ? WHERE id = ?",
        (title, content, datetime.now(), post_id)
    )
    db.commit()

    return jsonify({"success": True, "id": post_id}), 200

@app.route("/uploads/<filename>", methods=["DELETE"])
def delete_upload(filename):
    user = authorise(request.cookies.get("session_id"))
    if not user:
        return {"error": "Unauthorized"}, 401

    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            return jsonify({"success": True}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "File not found"}), 404

def migrate_images(content):
    image_sources = re.findall(IMG_SRC_REGEX, content)

    for src in image_sources:
        parsed = urlparse(src)

        # Only migrate tmp-uploads images
        if not parsed.path.startswith("/tmp-uploads/"):
            continue

        filename = os.path.basename(parsed.path)

        src_path = os.path.join(TMP_UPLOAD_FOLDER, filename)
        dst_path = os.path.join(UPLOAD_FOLDER, filename)

        if os.path.exists(src_path):
            shutil.move(src_path, dst_path)

            # Update HTML to point to /uploads
            content = content.replace(
                f"/tmp-uploads/{filename}",
                f"/uploads/{filename}"
            )

    return content

def clear_tmp_uploads():
    for filename in os.listdir(TMP_UPLOAD_FOLDER):
        file_path = os.path.join(TMP_UPLOAD_FOLDER, filename)
        if os.path.isfile(file_path):
            os.remove(file_path)

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(
            app.config["DATABASE"],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row  # dict-like rows
    return g.db

def cleanup_expired_cookies():
    db = get_db()
    db.execute(
        "DELETE FROM cookies WHERE datetime(created_at, '+7 days') <= CURRENT_TIMESTAMP"
    )
    db.commit()

@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

@app.route("/api/hello")
def hello():
    return jsonify(message="Hello from Flask on Raspberry Pi!")

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    db = get_db()
    user = db.execute(
        "SELECT * FROM users WHERE username = ?", (username,)
    ).fetchone()

    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify(success=False, message="Invalid username or password"), 401
    
    session_id = secrets.token_urlsafe(32)
    db.execute(
        "INSERT INTO cookies (user_id, cookie_value) VALUES (?, ?)",
        (user["id"], session_id)
    )
    db.commit()

    resp = make_response(jsonify({"user_id": user["id"], "message": "Login successful"}))
    resp.set_cookie(
        "session_id",
        session_id,
        httponly=True,
        secure=True,
        samesite="Strict",
        max_age=7*24*60*60
    )
    return resp

@app.route("/logout", methods=["POST"])
def logout():
    resp = make_response({"message": "Logged out"})
    resp.set_cookie("session_id", "", expires=0)  # Clear the cookie
    return resp

@app.route("/me", methods=["GET"])
def me():
    cleanup_expired_cookies()
    session_id = request.cookies.get("session_id")

    if not session_id:
        return jsonify({"logged_in": False}), 401

    user = authorise(session_id)

    if not user:
        return jsonify({"logged_in": False}), 401

    return jsonify({
        "logged_in": True,
        "user": {"id": user["id"], "username": user["username"]}
    })

def authorise(session_id):
    db = get_db()
    user = db.execute(
        "SELECT users.id, users.username FROM users JOIN cookies WHERE cookie_value = ?", (session_id,)
    ).fetchone()

    if not user:
        return None
    return user

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)  # debug enables hot reload
