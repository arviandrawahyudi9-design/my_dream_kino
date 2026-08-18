"""Render-hosted API for the Vercel admin panel."""

import os
import re

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from database import Database

load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_URL", "*").split(",")}})
db = Database()


def extract_message_id(url_or_id):
    match = re.search(r"/(\d+)/?$", str(url_or_id).strip())
    if match:
        return int(match.group(1))
    return int(url_or_id) if str(url_or_id).strip().isdigit() else None


@app.get("/")
def health_check():
    return jsonify({"status": "ok", "service": "kino-api"})


@app.get("/api/dashboard")
def dashboard():
    genre = request.args.get("genre") or None
    return jsonify({
        "success": True,
        "stats": db.get_stats(),
        "movies": db.get_all_movies(genre),
        "users": db.get_all_users(),
        "genres": db.get_all_genres(),
    })


@app.post("/api/add-movie")
def add_movie():
    data = request.get_json(silent=True) or request.form
    url_or_id, code = data.get("url_or_id", ""), data.get("code", "")
    if not url_or_id or not code:
        return jsonify(success=False, message="Kino havolasi va kodni kiritish majburiy!"), 400
    message_id = extract_message_id(url_or_id)
    if message_id is None:
        return jsonify(success=False, message="Havoladan Message ID ni ajratib bo'lmadi."), 400
    db.add_movie(code, message_id, data.get("title", ""), data.get("genre", ""))
    return jsonify(success=True, message="Kino muvaffaqiyatli saqlandi!")


@app.route("/api/delete-movie/<code>", methods=["POST", "DELETE"])
def delete_movie(code):
    db.delete_movie(code)
    return jsonify(success=True, message=f"Kod {code} dagi kino o'chirildi!")


@app.post("/api/add-genre")
def add_genre():
    data = request.get_json(silent=True) or request.form
    name = data.get("name", "").strip()
    if not name:
        return jsonify(success=False, message="Janr nomi kiritilmadi!"), 400
    db.add_genre(name)
    return jsonify(success=True, message=f"'{name}' janri qo'shildi!")


@app.route("/api/delete-genre/<int:genre_id>", methods=["POST", "DELETE"])
def delete_genre(genre_id):
    db.delete_genre(genre_id)
    return jsonify(success=True, message="Janr o'chirildi!")


@app.get("/api/user/<int:user_id>/movies")
def user_movies(user_id):
    return jsonify(success=True, movies=db.get_user_downloads(user_id))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
