import sqlite3
from werkzeug.security import check_password_hash
from flask import Flask, g, request, jsonify, make_response, send_from_directory
from flask_cors import CORS # type: ignore
import secrets
from datetime import datetime, timedelta
import os

app = Flask(__name__)
app.config["DATABASE"] = "instance/app.db"
CORS(app, supports_credentials=True)  # allow all origins

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/upload", methods=["POST"])
def upload_image():
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
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    # Return URL to access the image
    url = f"http://localhost:5000/uploads/{filename}"
    return {"url": url}

# Serve uploaded images
@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

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

    db = get_db()
    user = db.execute(
        "SELECT users.id, users.username FROM users JOIN cookies WHERE cookie_value = ?", (session_id,)
    ).fetchone()

    if not user:
        return jsonify({"logged_in": False}), 401

    return jsonify({
        "logged_in": True,
        "user": {"id": user["id"], "username": user["username"]}
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)  # debug enables hot reload
