"""Supabase data-access layer for the Kino Bot and admin API."""

import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()


class Database:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY muhit o'zgaruvchilari sozlanmagan."
            )
        self.client: Client = create_client(url, key)

    def add_user(self, user_id):
        self.client.table("users").upsert({"user_id": user_id}, on_conflict="user_id").execute()

    def set_phone(self, user_id, phone):
        self.client.table("users").update({"phone": phone, "verified": True}).eq("user_id", user_id).execute()

    def is_verified(self, user_id):
        result = self.client.table("users").select("verified").eq("user_id", user_id).maybe_single().execute()
        return bool(result.data and result.data.get("verified"))

    def add_movie(self, code, message_id, title="", genre=""):
        payload = {
            "code": str(code).strip(),
            "message_id": int(message_id),
            "title": title or "",
            "genre": genre or "",
        }
        self.client.table("movies").upsert(payload, on_conflict="code").execute()

    def get_movie(self, code):
        result = self.client.table("movies").select("message_id,title,genre").eq("code", str(code).strip()).maybe_single().execute()
        if not result.data:
            return None
        movie = result.data
        return movie["message_id"], movie.get("title", ""), movie.get("genre", "")

    def get_all_movies(self, genre=None):
        query = self.client.table("movies").select("code,message_id,title,genre,created_at").order("created_at", desc=True)
        if genre:
            query = query.eq("genre", genre)
        result = query.execute()
        return result.data or []

    def delete_movie(self, code):
        self.client.table("movies").delete().eq("code", str(code).strip()).execute()

    def get_stats(self):
        users = self.client.table("users").select("user_id,verified").execute().data or []
        movies = self.client.table("movies").select("code", count="exact").execute()
        return {
            "total_users": len(users),
            "verified_users": sum(1 for user in users if user.get("verified")),
            "total_movies": movies.count or 0,
        }

    def record_download(self, user_id, movie_code):
        self.client.table("downloads").insert({"user_id": user_id, "movie_code": str(movie_code).strip()}).execute()

    def get_all_users(self):
        users = self.client.table("users").select("user_id,phone,downloads(id)").execute().data or []
        return [
            {
                "user_id": user["user_id"],
                "phone": user.get("phone"),
                "downloads_count": len(user.get("downloads") or []),
            }
            for user in sorted(users, key=lambda item: len(item.get("downloads") or []), reverse=True)
        ]

    def get_user_downloads(self, user_id):
        result = (
            self.client.table("downloads")
            .select("movie_code,downloaded_at,movies(code,title,genre)")
            .eq("user_id", user_id)
            .order("downloaded_at", desc=True)
            .execute()
        )
        downloads = []
        for item in result.data or []:
            movie = item.get("movies") or {}
            downloads.append({
                "code": movie.get("code", item["movie_code"]),
                "title": movie.get("title", "Sarlavhasiz"),
                "genre": movie.get("genre", ""),
                "downloaded_at": item["downloaded_at"],
            })
        return downloads

    def add_genre(self, name):
        self.client.table("genres").upsert({"name": name.strip()}, on_conflict="name").execute()

    def get_all_genres(self):
        result = self.client.table("genres").select("id,name").order("name").execute()
        return result.data or []

    def delete_genre(self, genre_id):
        self.client.table("genres").delete().eq("id", genre_id).execute()
