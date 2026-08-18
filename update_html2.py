import re

with open('templates/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Janrlar tab
tabs_new = """    <!-- Tabs -->
    <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('movies')"><i class="fa-solid fa-film"></i> Kinolar</button>
        <button class="tab-btn" onclick="switchTab('users')"><i class="fa-solid fa-users"></i> Foydalanuvchilar</button>
        <button class="tab-btn" onclick="switchTab('genres')"><i class="fa-solid fa-masks-theater"></i> Janrlar</button>
    </div>"""
content = re.sub(r'<!-- Tabs -->.*?</div>', tabs_new, content, flags=re.DOTALL)

# 2. Update filter loop
filter_old = """                    {% for g in genres %}
                        <option value="{{ g }}" {% if current_genre == g %}selected{% endif %}>{{ g }}</option>
                    {% endfor %}"""
filter_new = """                    {% for g in genres %}
                        <option value="{{ g[1] }}" {% if current_genre == g[1] %}selected{% endif %}>{{ g[1] }}</option>
                    {% endfor %}"""
content = content.replace(filter_old, filter_new)

# 3. Update genre input in Add Movie form
genre_input_old = """                <!-- Genre -->
                <div class="form-group">
                    <label class="form-label" for="genre">Janr (Ixtiyoriy):</label>
                    <div class="input-wrapper">
                        <i class="fa-solid fa-masks-theater"></i>
                        <input type="text" id="genre" class="form-input" placeholder="masalan: Jangari, Komediya">
                    </div>
                </div>"""
genre_input_new = """                <!-- Genre -->
                <div class="form-group">
                    <label class="form-label" for="genre">Janr (Ixtiyoriy):</label>
                    <div class="input-wrapper">
                        <i class="fa-solid fa-masks-theater"></i>
                        <select id="genre" class="form-input" style="appearance: none; -webkit-appearance: none; cursor: pointer;">
                            <option value="">Janrni tanlang...</option>
                            {% for g in genres %}
                                <option value="{{ g[1] }}">{{ g[1] }}</option>
                            {% endfor %}
                        </select>
                    </div>
                </div>"""
content = content.replace(genre_input_old, genre_input_new)

# 4. Add Genres Tab Content before modal
genres_tab = """
    <!-- Genres Tab -->
    <div id="genres-tab" class="tab-content">
        <div class="content-grid">
            <div class="glass-panel">
                <div class="panel-header">
                    <h2 class="panel-title">
                        <i class="fa-solid fa-plus-circle"></i>
                        Yangi Janr Qo'shish
                    </h2>
                </div>
                <form id="addGenreForm">
                    <div class="form-group">
                        <label class="form-label" for="genreName">Janr Nomi:</label>
                        <div class="input-wrapper">
                            <i class="fa-solid fa-masks-theater"></i>
                            <input type="text" id="genreName" class="form-input" placeholder="masalan: Komediya" required>
                        </div>
                    </div>
                    <button type="submit" class="btn-submit">
                        <i class="fa-solid fa-plus"></i> Qo'shish
                    </button>
                </form>
            </div>
            
            <div class="glass-panel">
                <div class="panel-header">
                    <h2 class="panel-title">
                        <i class="fa-solid fa-list"></i>
                        Mavjud Janrlar
                    </h2>
                </div>
                <div class="table-responsive">
                    <table class="movie-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nomi</th>
                                <th>Amal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% if genres %}
                                {% for g in genres %}
                                <tr>
                                    <td><span class="badge-code">{{ g[0] }}</span></td>
                                    <td>{{ g[1] }}</td>
                                    <td>
                                        <button class="btn-delete" onclick="deleteGenre({{ g[0] }})">
                                            <i class="fa-solid fa-trash-can"></i>
                                        </button>
                                    </td>
                                </tr>
                                {% endfor %}
                            {% else %}
                                <tr>
                                    <td colspan="3" style="text-align:center; padding: 2rem; color: var(--text-muted);">
                                        <i class="fa-solid fa-masks-theater" style="font-size:2rem; opacity: 0.3; display:block; margin-bottom:1rem;"></i>
                                        Janrlar mavjud emas
                                    </td>
                                </tr>
                            {% endif %}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div> <!-- End Genres Tab -->
"""
content = content.replace("</div>\n\n<!-- Modal -->", genres_tab + "\n</div>\n\n<!-- Modal -->")

# 5. Add JS for Genres
js_genres = """
    // Genre Scripts
    document.getElementById('addGenreForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('genreName').value.trim();
        try {
            const res = await fetch('/api/add-genre', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message);
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showToast(data.message, true);
            }
        } catch(err) {
            showToast("Xatolik", true);
        }
    });

    async function deleteGenre(id) {
        if (!confirm("Janrni o'chirmoqchimisiz?")) return;
        try {
            const res = await fetch(`/api/delete-genre/${id}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast(data.message);
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch(err) {
            showToast("Xatolik", true);
        }
    }
</script>"""
content = content.replace("</script>", js_genres)

with open('templates/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating index.html with genres tab")
