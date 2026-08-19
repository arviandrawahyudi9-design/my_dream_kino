const baseUrl = (window.KINO_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
const api = (path, options = {}) => fetch(`${baseUrl}${path}`, options).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.message || "Xatolik"); return data; });

const eStatus = document.getElementById("global-status");
const escapeHtml = v => String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

let _data = { movies: [], users: [], genres: [] };

// Navigation
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`sec-${btn.dataset.section}`).classList.add('active');
  };
});

// Modal
const modal = document.getElementById('movie-modal');
const openAddModal = () => {
  document.getElementById('modal-title').textContent = "Kino qo'shish";
  document.getElementById('m-url').value = '';
  document.getElementById('m-code').value = '';
  document.getElementById('m-title').value = '';
  document.getElementById('m-genre').value = '';
  modal.classList.add('open');
}
const closeModal = () => modal.classList.remove('open');
const saveMovie = async () => {
  const url_or_id = document.getElementById('m-url').value;
  const code = document.getElementById('m-code').value;
  const title = document.getElementById('m-title').value;
  const genre = document.getElementById('m-genre').value;
  if (!url_or_id || !code) return alert("Majburiy maydonlarni to'ldiring!");
  try {
    eStatus.textContent = "Saqlanmoqda...";
    await api("/api/add-movie", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ url_or_id, code, title, genre }) });
    closeModal();
    loadData();
  } catch(e) { alert(e.message); }
}

const deleteMovie = async (code) => {
  if (!confirm("O'chirilsinmi?")) return;
  await api(`/api/delete-movie/${encodeURIComponent(code)}`, { method: "POST" });
  loadData();
}

const addGenre = async () => {
  const val = document.getElementById('genre-input').value.trim();
  if(!val) return;
  await api("/api/add-genre", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ name: val }) });
  document.getElementById('genre-input').value = '';
  loadData();
}

const deleteGenre = async (id) => {
  if (!confirm("Janr o'chirilsinmi?")) return;
  await api(`/api/delete-genre/${id}`, { method: "POST" });
  loadData();
}

async function loadData() {
  try {
    eStatus.textContent = "Yuklanmoqda...";
    eStatus.className = "";
    const res = await api("/api/dashboard");
    _data = res;
    
    // Stats
    document.getElementById("stat-movies").textContent = res.stats.total_movies;
    document.getElementById("stat-users").textContent = res.stats.total_users;
    document.getElementById("stat-verified").textContent = res.stats.verified_users;
    
    renderGenres();
    renderMovies();
    renderUsers();
    
    eStatus.textContent = "Barcha ma'lumotlar yuklandi ✅";
  } catch (error) {
    eStatus.textContent = `Xatolik: ${error.message}`;
    eStatus.className = "error";
  }
}

function renderGenres() {
  const opts = _data.genres.map(g => `<option value="${escapeHtml(g.name)}">${escapeHtml(g.name)}</option>`).join("");
  document.getElementById("m-genre").innerHTML = '<option value="">Janrsiz</option>' + opts;
  document.getElementById("filter-genre").innerHTML = '<option value="">Barcha janrlar</option>' + opts;
  
  document.getElementById("genre-chips").innerHTML = _data.genres.map(g => 
    `<div class="genre-chip"><span>${escapeHtml(g.name)}</span><button onclick="deleteGenre(${g.id})">×</button></div>`
  ).join("");
}

function renderMovies() {
  const sText = document.getElementById('movie-search').value.toLowerCase();
  const sGenre = document.getElementById('filter-genre').value;
  
  let list = _data.movies.filter(m => {
    if (sGenre && m.genre !== sGenre) return false;
    if (sText && !m.title?.toLowerCase().includes(sText) && !m.code.toLowerCase().includes(sText)) return false;
    return true;
  });
  
  const tbody = document.getElementById("movies-body");
  if(list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Kinolar topilmadi.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = list.map(m => `
    <tr>
      <td><b>${escapeHtml(m.code)}</b></td>
      <td>${escapeHtml(m.title || "Sarlavhasiz")}</td>
      <td><span class="badge badge-gray">${escapeHtml(m.genre || "-")}</span></td>
      <td style="color:var(--muted)">${m.message_id}</td>
      <td style="text-align:right;">
        <button class="btn btn-sm btn-danger" onclick="deleteMovie('${escapeHtml(m.code)}')">O'chirish</button>
      </td>
    </tr>
  `).join("");
}

// Expand User logic
async function toggleUser(userId) {
  const tr = document.getElementById(`expand-${userId}`);
  if (tr) {
    tr.remove(); // if already open, close it
    return;
  }
  // Load user downloads
  try {
    const dReq = await api(`/api/user/${userId}/movies`); // Endpoint to be created in backend
    let html = `<table class="dl-table"><thead><tr><th>Kino kodi</th><th>Nomi</th><th>Janr</th><th>Yuklangan vaqti</th></tr></thead><tbody>`;
    if(dReq.movies && dReq.movies.length > 0) {
      dReq.movies.forEach(m => {
         html += `<tr><td>${m.code}</td><td>${m.title}</td><td>${m.genre}</td><td>${new Date(m.downloaded_at).toLocaleString()}</td></tr>`;
      });
    } else {
      html += `<tr><td colspan="4" class="empty">Hali kino yuklamagan.</td></tr>`;
    }
    html += `</tbody></table>`;
    
    const parentTr = document.querySelector(`tr[data-uid="${userId}"]`);
    const newTr = document.createElement('tr');
    newTr.id = `expand-${userId}`;
    newTr.className = 'expand-row';
    newTr.innerHTML = `<td colspan="5"><div class="expand-inner">${html}</div></td>`;
    parentTr.parentNode.insertBefore(newTr, parentTr.nextSibling);
  } catch(e) { alert("Yuklab bo'lmadi: " + e.message); }
}

function renderUsers() {
  const sText = document.getElementById('user-search').value.toLowerCase();
  
  let list = _data.users.filter(u => {
    if (sText && !String(u.user_id).includes(sText) && !(u.phone||"").toLowerCase().includes(sText)) return false;
    return true;
  });
  
  const tbody = document.getElementById("users-body");
  if(list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Foydalanuvchilar yo'q.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = list.map(u => {
    const verified = u.verified ? `<span class="badge badge-green">Tasdiqlangan</span>` : `<span class="badge badge-warn">Kutilmoqda</span>`;
    return `
    <tr data-uid="${u.user_id}">
      <td><button class="btn btn-sm btn-primary" onclick="toggleUser(${u.user_id})">👁 Ko'rish</button></td>
      <td>${u.user_id}</td>
      <td>${escapeHtml(u.phone || "Kiritilmagan")}</td>
      <td>${verified}</td>
      <td><b>${u.downloads_count || 0}</b></td>
    </tr>
  `}).join("");
}

document.getElementById('movie-search').oninput = renderMovies;
document.getElementById('filter-genre').onchange = renderMovies;
document.getElementById('user-search').oninput = renderUsers;

loadData();
