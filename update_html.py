import re

with open('templates/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add CSS
css_addition = """
        .empty-state i {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.3;
        }

        /* Tabs and Modal CSS */
        .tabs {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        .tab-btn {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            color: var(--text-muted);
            padding: 0.8rem 1.5rem;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .tab-btn.active, .tab-btn:hover {
            background: rgba(168, 85, 247, 0.15);
            color: white;
            border-color: var(--accent-purple);
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }
        .modal-overlay.show {
            opacity: 1;
            pointer-events: auto;
        }
        .modal-content {
            background: var(--bg-dark);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            width: 90%;
            max-width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 2rem;
            transform: translateY(20px);
            transition: transform 0.3s ease;
        }
        .modal-overlay.show .modal-content {
            transform: translateY(0);
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        .close-btn {
            background: none; border: none;
            color: var(--text-muted);
            font-size: 1.5rem; cursor: pointer;
        }
        .filter-select {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--card-border);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            outline: none;
        }
    </style>
"""
content = content.replace("        .empty-state i {\n            font-size: 3rem;\n            margin-bottom: 1rem;\n            opacity: 0.3;\n        }\n    </style>", css_addition)


# 2. Add Tabs and rename content grid
content = content.replace('<div class="content-grid">', 
'''<!-- Tabs -->
    <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('movies')"><i class="fa-solid fa-film"></i> Kinolar</button>
        <button class="tab-btn" onclick="switchTab('users')"><i class="fa-solid fa-users"></i> Foydalanuvchilar</button>
    </div>

    <!-- Main Grid -->
    <div id="movies-tab" class="content-grid tab-content active">''')

# 3. Add genre input to form
genre_input = """                <!-- Movie Title -->
                <div class="form-group">
                    <label class="form-label" for="title">Kino Nomi (Ixtiyoriy):</label>
                    <div class="input-wrapper">
                        <i class="fa-solid fa-font"></i>
                        <input type="text" id="title" class="form-input" placeholder="masalan: Mening Kino 5">
                    </div>
                </div>

                <!-- Genre -->
                <div class="form-group">
                    <label class="form-label" for="genre">Janr (Ixtiyoriy):</label>
                    <div class="input-wrapper">
                        <i class="fa-solid fa-masks-theater"></i>
                        <input type="text" id="genre" class="form-input" placeholder="masalan: Jangari, Komediya">
                    </div>
                </div>"""
content = content.replace('                <!-- Movie Title -->\n                <div class="form-group">\n                    <label class="form-label" for="title">Kino Nomi (Ixtiyoriy):</label>\n                    <div class="input-wrapper">\n                        <i class="fa-solid fa-font"></i>\n                        <input type="text" id="title" class="form-input" placeholder="masalan: Mening Kino 5">\n                    </div>\n                </div>', genre_input)

# 4. Filter dropdown in header
panel_header = """            <div class="panel-header">
                <h2 class="panel-title">
                    <i class="fa-solid fa-list-ul"></i>
                    Saqlangan Kinolar Ro'yxati
                </h2>
                <select class="filter-select" onchange="window.location.href='/?genre=' + this.value">
                    <option value="">Barcha Janrlar</option>
                    {% for g in genres %}
                        <option value="{{ g }}" {% if current_genre == g %}selected{% endif %}>{{ g }}</option>
                    {% endfor %}
                </select>
            </div>"""
content = content.replace("""            <div class="panel-header">
                <h2 class="panel-title">
                    <i class="fa-solid fa-list-ul"></i>
                    Saqlangan Kinolar Ro'yxati
                </h2>
            </div>""", panel_header)

# 5. Table columns for genre
content = content.replace("<th>Nomi</th>", "<th>Nomi</th>\n                            <th>Janr</th>")
content = content.replace("<td>{{ m[2] if m[2] else 'Sarlavhasiz' }}</td>", "<td>{{ m[2] if m[2] else 'Sarlavhasiz' }}</td>\n                                <td>{{ m[3] if m[3] else '-' }}</td>")

# 6. Users Tab and Modal
users_tab = """        </div>
    </div> <!-- End Movies Tab -->

    <!-- Users Tab -->
    <div id="users-tab" class="tab-content">
        <div class="glass-panel">
            <div class="panel-header">
                <h2 class="panel-title">
                    <i class="fa-solid fa-users"></i>
                    Foydalanuvchilar va Ularning Kinolari
                </h2>
            </div>
            <div class="table-responsive">
                <table class="movie-table">
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Telefon Raqam</th>
                            <th>Yuklab olingan kinolar</th>
                            <th>Amal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% if users %}
                            {% for u in users %}
                            <tr>
                                <td><span class="badge-code">{{ u[0] }}</span></td>
                                <td>{{ u[1] if u[1] else 'Tasdiqlanmagan' }}</td>
                                <td><span class="badge-id">{{ u[2] }} ta</span></td>
                                <td>
                                    <button class="btn-submit" style="width: auto; padding: 0.5rem 1rem;" onclick="viewUserMovies({{ u[0] }})">
                                        Ko'rish
                                    </button>
                                </td>
                            </tr>
                            {% endfor %}
                        {% else %}
                            <tr>
                                <td colspan="4">
                                    <div class="empty-state">
                                        <i class="fa-solid fa-users-slash"></i>
                                        <p>Foydalanuvchilar topilmadi.</p>
                                    </div>
                                </td>
                            </tr>
                        {% endif %}
                    </tbody>
                </table>
            </div>
        </div>
    </div> <!-- End Users Tab -->

</div>

<!-- Modal -->
<div class="modal-overlay" id="moviesModal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Foydalanuvchi Kinolari</h2>
            <button class="close-btn" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="table-responsive">
            <table class="movie-table">
                <thead>
                    <tr>
                        <th>Kod</th>
                        <th>Nomi</th>
                        <th>Janr</th>
                        <th>Sana</th>
                    </tr>
                </thead>
                <tbody id="userMoviesBody">
                </tbody>
            </table>
        </div>
    </div>
</div>
"""
content = content.replace("        </div>\n    </div>\n</div>\n\n<!-- Toast Notification -->", users_tab + "\n<!-- Toast Notification -->")

# 7. Update JS for addMovieForm
js_add = """    document.getElementById('addMovieForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const url_or_id = document.getElementById('url_or_id').value.trim();
        const code = document.getElementById('code').value.trim();
        const title = document.getElementById('title').value.trim();
        const genre = document.getElementById('genre').value.trim();

        try {
            const res = await fetch('/api/add-movie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url_or_id, code, title, genre })
            });

            const data = await res.json();
            if (data.success) {
                showToast(data.message);
                addTableRow(data.movie.code, data.movie.message_id, data.movie.title, data.movie.genre);
"""
content = content.replace("""    document.getElementById('addMovieForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const url_or_id = document.getElementById('url_or_id').value.trim();
        const code = document.getElementById('code').value.trim();
        const title = document.getElementById('title').value.trim();

        try {
            const res = await fetch('/api/add-movie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url_or_id, code, title })
            });

            const data = await res.json();
            if (data.success) {
                showToast(data.message);
                addTableRow(data.movie.code, data.movie.message_id, data.movie.title);""", js_add)

# 8. Update addTableRow
js_row = """    function addTableRow(code, msgId, title, genre) {
        const tbody = document.getElementById('movieTableBody');
        const noRow = document.getElementById('noMoviesRow');
        if (noRow) noRow.remove();

        // Check if row already exists
        const existingRow = document.getElementById(`row-${code}`);
        if (existingRow) existingRow.remove();

        const tr = document.createElement('tr');
        tr.id = `row-${code}`;
        tr.innerHTML = `
            <td><span class="badge-code">${code}</span></td>
            <td><span class="badge-id">ID: ${msgId}</span></td>
            <td>${title ? title : 'Sarlavhasiz'}</td>
            <td>${genre ? genre : '-'}</td>
            <td>
                <button class="btn-delete" onclick="deleteMovie('${code}')">"""
content = content.replace("""    function addTableRow(code, msgId, title) {
        const tbody = document.getElementById('movieTableBody');
        const noRow = document.getElementById('noMoviesRow');
        if (noRow) noRow.remove();

        // Check if row already exists
        const existingRow = document.getElementById(`row-${code}`);
        if (existingRow) existingRow.remove();

        const tr = document.createElement('tr');
        tr.id = `row-${code}`;
        tr.innerHTML = `
            <td><span class="badge-code">${code}</span></td>
            <td><span class="badge-id">ID: ${msgId}</span></td>
            <td>${title ? title : 'Sarlavhasiz'}</td>
            <td>
                <button class="btn-delete" onclick="deleteMovie('${code}')">""", js_row)

# 9. Append new functions for tabs and modal
js_functions = """
    // Tabs functionality
    function switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        event.currentTarget.classList.add('active');
    }

    // Modal functionality
    async function viewUserMovies(userId) {
        try {
            const res = await fetch(`/api/user/${userId}/movies`);
            const data = await res.json();
            
            const tbody = document.getElementById('userMoviesBody');
            tbody.innerHTML = '';
            
            if (data.movies.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Kino yuklanmagan</td></tr>';
            } else {
                data.movies.forEach(m => {
                    const date = new Date(m.downloaded_at).toLocaleString('uz-UZ');
                    tbody.innerHTML += `
                        <tr>
                            <td><span class="badge-code">${m.code}</span></td>
                            <td>${m.title || '-'}</td>
                            <td>${m.genre || '-'}</td>
                            <td><small>${date}</small></td>
                        </tr>
                    `;
                });
            }
            
            document.getElementById('moviesModal').classList.add('show');
        } catch (e) {
            showToast("Ma'lumotni yuklashda xatolik!", true);
        }
    }
    
    function closeModal() {
        document.getElementById('moviesModal').classList.remove('show');
    }
</script>"""
content = content.replace("</script>", js_functions)

with open('templates/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating index.html")
