const baseUrl = (window.KINO_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
const api = (path, options = {}) => fetch(`${baseUrl}${path}`, options).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.message || "So'rov bajarilmadi"); return data; });
const status = document.querySelector("#status");
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

async function loadDashboard() {
  try {
    const genre = document.querySelector("#filter").value;
    const data = await api(`/api/dashboard${genre ? `?genre=${encodeURIComponent(genre)}` : ""}`);
    document.querySelector("#movies-count").textContent = data.stats.total_movies;
    document.querySelector("#users-count").textContent = data.stats.total_users;
    document.querySelector("#verified-count").textContent = data.stats.verified_users;
    const options = data.genres.map(g => `<option value="${escapeHtml(g.name)}">${escapeHtml(g.name)}</option>`).join("");
    document.querySelector("#genre-select").innerHTML = '<option value="">Janrsiz</option>' + options;
    document.querySelector("#filter").innerHTML = '<option value="">Barcha janrlar</option>' + options;
    document.querySelector("#filter").value = genre;
    document.querySelector("#movies").innerHTML = data.movies.map(m => `<tr><td>${escapeHtml(m.code)}</td><td>${escapeHtml(m.title || "Sarlavhasiz")}</td><td>${escapeHtml(m.genre || "-")}</td><td>${m.message_id}</td><td><button class="delete" onclick="removeMovie('${encodeURIComponent(m.code)}')">O‘chirish</button></td></tr>`).join("") || '<tr><td colspan="5">Kino topilmadi.</td></tr>';
    document.querySelector("#users").innerHTML = data.users.map(u => `<tr><td>${u.user_id}</td><td>${escapeHtml(u.phone || "Tasdiqlanmagan")}</td><td>${u.downloads_count}</td></tr>`).join("") || '<tr><td colspan="3">Foydalanuvchi yo‘q.</td></tr>';
    status.textContent = "";
  } catch (error) { status.textContent = `Xatolik: ${error.message}. frontend/config.js ichida API URL to‘g‘riligini tekshiring.`; status.className = "error"; }
}
window.removeMovie = async code => { if (confirm("Kino o‘chirilsinmi?")) { await api(`/api/delete-movie/${code}`, {method:"POST"}); loadDashboard(); } };
document.querySelector("#movie-form").onsubmit = async e => { e.preventDefault(); await api("/api/add-movie", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))}); e.target.reset(); loadDashboard(); };
document.querySelector("#genre-form").onsubmit = async e => { e.preventDefault(); await api("/api/add-genre", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))}); e.target.reset(); loadDashboard(); };
document.querySelector("#filter").onchange = loadDashboard;
loadDashboard();
