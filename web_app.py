import re
import sys
from flask import Flask, render_template, request, jsonify, redirect, url_for
from database import Database

sys.stdout.reconfigure(encoding='utf-8')

app = Flask(__name__)
db = Database()

def extract_message_id(url_or_id):
    """
    Telegram post havolasidan message_id ni ajratib oladi.
    Masalan: https://t.me/c/3577187745/2 -> 2
    yoki shunchaki "2" kiritilsa -> 2
    """
    url_or_id = str(url_or_id).strip()
    match = re.search(r'/(\d+)/?$', url_or_id)
    if match:
        return int(match.group(1))
    if url_or_id.isdigit():
        return int(url_or_id)
    return None

@app.route('/')
def index():
    genre_filter = request.args.get('genre', '')
    movies = db.get_all_movies(genre=genre_filter if genre_filter else None)
    stats = db.get_stats()
    users = db.get_all_users()
    
    genres = db.get_all_genres()
    
    return render_template('index.html', movies=movies, stats=stats, users=users, genres=genres, current_genre=genre_filter)

@app.route('/api/add-movie', methods=['POST'])
def add_movie():
    data = request.get_json() if request.is_json else request.form
    url_or_id = data.get('url_or_id', '')
    code = data.get('code', '')
    title = data.get('title', '')
    genre = data.get('genre', '')

    if not url_or_id or not code:
        return jsonify({'success': False, 'message': 'Kino havolasi va kodni kiritish majburiy!'}), 400

    msg_id = extract_message_id(url_or_id)
    if msg_id is None:
        return jsonify({'success': False, 'message': "Havoladan Message ID ni ajratib bo'lmadi! Iltimos havolani to'g'ri kiriting."}), 400

    db.add_movie(code=code, message_id=msg_id, title=title, genre=genre)
    return jsonify({
        'success': True,
        'message': f"Kino muvaffaqiyatli saqlandi! Kod: {code}, Message ID: {msg_id}",
        'movie': {'code': code, 'message_id': msg_id, 'title': title, 'genre': genre}
    })

@app.route('/api/delete-movie/<code>', methods=['POST', 'DELETE'])
def delete_movie(code):
    db.delete_movie(code)
    return jsonify({'success': True, 'message': f"Kod {code} dagi kino o'chirildi!"})

@app.route('/api/add-genre', methods=['POST'])
def add_genre():
    data = request.get_json() if request.is_json else request.form
    name = data.get('name', '')
    if not name:
        return jsonify({'success': False, 'message': 'Janr nomi kiritilmadi!'}), 400
    db.add_genre(name)
    return jsonify({'success': True, 'message': f"'{name}' janri qo'shildi!"})

@app.route('/api/delete-genre/<int:genre_id>', methods=['POST', 'DELETE'])
def delete_genre(genre_id):
    db.delete_genre(genre_id)
    return jsonify({'success': True, 'message': "Janr o'chirildi!"})

@app.route('/api/user/<int:user_id>/movies', methods=['GET'])
def get_user_movies(user_id):
    downloads = db.get_user_downloads(user_id)
    result = []
    for d in downloads:
        result.append({
            'code': d[0],
            'title': d[1],
            'genre': d[2],
            'downloaded_at': d[3]
        })
    return jsonify({'success': True, 'movies': result})

if __name__ == '__main__':
    print("Web Admin paneli ishga tushdi: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
