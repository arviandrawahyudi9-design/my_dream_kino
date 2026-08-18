"""Existing kino_bot.db recordsini Supabase ga bir marta ko'chirish uchun skript."""

import sqlite3

from database import Database


def main():
    db = Database()
    with sqlite3.connect("kino_bot.db") as source:
        source.row_factory = sqlite3.Row
        for row in source.execute("SELECT user_id, phone, verified FROM users"):
            db.client.table("users").upsert(dict(row), on_conflict="user_id").execute()
        for row in source.execute("SELECT code, message_id, title, genre FROM movies"):
            db.client.table("movies").upsert(dict(row), on_conflict="code").execute()
        for row in source.execute("SELECT name FROM genres"):
            db.client.table("genres").upsert(dict(row), on_conflict="name").execute()
        for row in source.execute("SELECT user_id, movie_code, downloaded_at FROM downloads"):
            db.client.table("downloads").insert(dict(row)).execute()
    print("SQLite ma'lumotlari Supabase ga ko'chirildi.")


if __name__ == "__main__":
    main()
