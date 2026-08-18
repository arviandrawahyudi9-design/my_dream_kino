import sqlite3

class Database:
    def __init__(self, db_file="kino_bot.db"):
        self.db_file = db_file
        self.create_tables()

    def get_connection(self):
        return sqlite3.connect(self.db_file)

    def create_tables(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    phone TEXT,
                    verified INTEGER DEFAULT 0
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS movies (
                    code TEXT PRIMARY KEY,
                    message_id INTEGER,
                    title TEXT,
                    genre TEXT DEFAULT ''
                )
            """)
            # Check if genre exists, if not, add it
            cursor.execute("PRAGMA table_info(movies)")
            columns = [info[1] for info in cursor.fetchall()]
            if 'genre' not in columns:
                cursor.execute("ALTER TABLE movies ADD COLUMN genre TEXT DEFAULT ''")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS downloads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    movie_code TEXT,
                    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS genres (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE
                )
            """)
            conn.commit()

    def add_user(self, user_id):
        with self.get_connection() as conn:
            conn.execute("INSERT OR IGNORE INTO users (user_id) VALUES (?)", (user_id,))

    def set_phone(self, user_id, phone):
        with self.get_connection() as conn:
            conn.execute("UPDATE users SET phone = ?, verified = 1 WHERE user_id = ?", (phone, user_id))

    def is_verified(self, user_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT verified FROM users WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            return bool(row and row[0] == 1)

    def add_movie(self, code, message_id, title="", genre=""):
        with self.get_connection() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO movies (code, message_id, title, genre) VALUES (?, ?, ?, ?)",
                (str(code).strip(), int(message_id), title, genre)
            )

    def get_movie(self, code):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT message_id, title, genre FROM movies WHERE code = ?", (str(code).strip(),))
            return cursor.fetchone()

    def get_all_movies(self, genre=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if genre:
                cursor.execute("SELECT code, message_id, title, genre FROM movies WHERE genre = ? ORDER BY ROWID DESC", (genre,))
            else:
                cursor.execute("SELECT code, message_id, title, genre FROM movies ORDER BY ROWID DESC")
            return cursor.fetchall()

    def delete_movie(self, code):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM movies WHERE code = ?", (str(code).strip(),))

    def get_stats(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users")
            total_users = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM users WHERE verified = 1")
            verified_users = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM movies")
            total_movies = cursor.fetchone()[0]
            return {
                "total_users": total_users,
                "verified_users": verified_users,
                "total_movies": total_movies
            }

    def record_download(self, user_id, movie_code):
        with self.get_connection() as conn:
            conn.execute("INSERT INTO downloads (user_id, movie_code) VALUES (?, ?)", (user_id, str(movie_code).strip()))

    def get_all_users(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT u.user_id, u.phone, COUNT(d.id) as downloads_count
                FROM users u
                LEFT JOIN downloads d ON u.user_id = d.user_id
                GROUP BY u.user_id
                ORDER BY downloads_count DESC
            """)
            return cursor.fetchall()

    def get_user_downloads(self, user_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT m.code, m.title, m.genre, d.downloaded_at
                FROM downloads d
                JOIN movies m ON d.movie_code = m.code
                WHERE d.user_id = ?
                ORDER BY d.downloaded_at DESC
            """, (user_id,))
            return cursor.fetchall()

    def add_genre(self, name):
        with self.get_connection() as conn:
            conn.execute("INSERT OR IGNORE INTO genres (name) VALUES (?)", (name.strip(),))

    def get_all_genres(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name FROM genres ORDER BY name ASC")
            return cursor.fetchall()
            
    def delete_genre(self, genre_id):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM genres WHERE id = ?", (genre_id,))

