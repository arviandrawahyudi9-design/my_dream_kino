import os
from database import Database

db = Database()

def export_to_sql():
    with open("import_to_d1.sql", "w", encoding="utf-8") as f:
        # Export users
        users = db.get_all_users()
        for u in users:
            phone = f"'{u['phone']}'" if u.get('phone') else "NULL"
            f.write(f"INSERT OR IGNORE INTO users (user_id, phone, verified) VALUES ({u['user_id']}, {phone}, 1);\n")
        
        # Export movies
        movies = db.get_all_movies()
        for m in movies:
            title = m['title'].replace("'", "''") if m.get('title') else ""
            genre = m['genre'].replace("'", "''") if m.get('genre') else ""
            created_at = m['created_at'].replace("T", " ")[:19] if m.get('created_at') else "CURRENT_TIMESTAMP"
            f.write(f"INSERT OR IGNORE INTO movies (code, message_id, title, genre, created_at) VALUES ('{m['code']}', {m['message_id']}, '{title}', '{genre}', '{created_at}');\n")
            
        # Export genres
        genres = db.get_all_genres()
        for g in genres:
            name = g['name'].replace("'", "''")
            f.write(f"INSERT OR IGNORE INTO genres (id, name) VALUES ({g['id']}, '{name}');\n")
            
    print("Export tugadi. 'import_to_d1.sql' fayli yaratildi.")

if __name__ == "__main__":
    export_to_sql()
