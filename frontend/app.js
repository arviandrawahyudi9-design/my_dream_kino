// ── CONFIG ──────────────────────────────────────────────────────────
const baseUrl = (window.KINO_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");

const api = async (path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "So'rov bajarilmadi");
  return data;
};

// UZB vaqt zonasi formatlovchi
const fmtDate = (raw) => {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString("uz-UZ", {
      timeZone: "Asia/Tashkent",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return raw; }
};

const esc = v => String(v ?? "").replace(/[&<>'"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])
);

// ── STATE ────────────────────────────────────────────────────────────
let _data = { movies: [], users: [], genres: [], stats: {} };

// ── STATUS BAR ───────────────────────────────────────────────────────
const $status = document.getElementById("global-status");
const setStatus = (msg, isError = false) => {
  $status.textContent = msg;
  $status.className = isError ? "error" : "";
};

// ── NAVIGATION ───────────────────────────────────────────────────────
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`sec-${btn.dataset.section}`).classList.add("active");
  });
});

// ── LOAD DATA ────────────────────────────────────────────────────────
async function loadData() {
  try {
    setStatus("Yuklanmoqda...");
    const res = await api("/api/dashboard");
    _data = {
      movies:  res.movies  || [],
      users:   res.users   || [],
      genres:  res.genres  || [],
      stats:   res.stats   || {}
    };

    // stats
    document.getElementById("stat-movies").textContent   = _data.stats.total_movies   ?? 0;
    document.getElementById("stat-users").textContent    = _data.stats.total_users    ?? 0;
    document.getElementById("stat-verified").textContent = _data.stats.verified_users ?? 0;

    renderGenres();
    renderMovies();
    renderUsers();
    setStatus("✓ Muvaffaqiyatli yuklandi");
  } catch (err) {
    setStatus(`Xatolik: ${err.message}`, true);
  }
}

// ── GENRES ───────────────────────────────────────────────────────────
function renderGenres() {
  const opts = _data.genres.map(g =>
    `<option value="${esc(g.name)}">${esc(g.name)}</option>`
  ).join("");

  ["m-genre", "filter-genre"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const prev = el.value;
    el.innerHTML = '<option value="">Barcha janrlar</option>' + opts;
    if (id === "m-genre") el.innerHTML = '<option value="">Janrsiz</option>' + opts;
    el.value = prev;
  });

  const chips = document.getElementById("genre-chips");
  if (_data.genres.length === 0) {
    chips.innerHTML = `<span style="color:var(--text3);font-size:12px;">Hali janr qo'shilmagan.</span>`;
    return;
  }
  chips.innerHTML = _data.genres.map(g => `
    <div class="genre-chip">
      <span>${esc(g.name)}</span>
      <button class="del-genre" onclick="deleteGenre(${g.id}, '${esc(g.name)}')" title="O'chirish">×</button>
    </div>
  `).join("");
}

window.addGenre = async () => {
  const input = document.getElementById("genre-input");
  const name = input.value.trim();
  if (!name) return;
  try {
    await api("/api/add-genre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    input.value = "";
    loadData();
  } catch (e) { alert(e.message); }
};

window.deleteGenre = async (id, name) => {
  if (!confirm(`"${name}" janrini o'chirmoqchimisiz?`)) return;
  await api(`/api/delete-genre/${id}`, { method: "POST" });
  loadData();
};

// ── MOVIES ───────────────────────────────────────────────────────────
function renderMovies() {
  const search = (document.getElementById("movie-search")?.value || "").toLowerCase();
  const genre  = document.getElementById("filter-genre")?.value || "";

  let list = _data.movies.filter(m => {
    if (genre && m.genre !== genre) return false;
    if (search && !String(m.title || "").toLowerCase().includes(search) &&
        !String(m.code).toLowerCase().includes(search)) return false;
    return true;
  });

  const tbody = document.getElementById("movies-body");
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-icon">🎞️</div>
          <p>Kinolar topilmadi.</p>
        </div>
      </td></tr>`;
    return;
  }

  const qualityLabel = { '480': '📺 480p', '720': '🎬 720p HD', '1080': '🎥 1080p Full HD', '4k': '✨ 4K' };
  const langLabel = { 'uz': '🇺🇿 O\'z', 'ru': '🇷🇺 Rus', 'en': '🇬🇧 Ing', 'tr': '🇹🇷 Turk', 'ko': '🇰🇷 Kor', 'hi': '🇮🇳 Hind' };

  tbody.innerHTML = list.map(m => `
    <tr>
      <td><code style="background:var(--bg3);padding:3px 8px;border-radius:6px;font-size:12px;color:var(--accent)">${esc(m.code)}</code></td>
      <td style="font-weight:500;">${esc(m.title || '—')}</td>
      <td>${m.year ? `<span class="badge badge-gray" style="font-size:11px">${esc(m.year)}</span>` : '<span style="color:var(--text3)">—</span>'}</td>
      <td>${m.genre ? `<span class="badge badge-blue">${esc(m.genre)}</span>` : `<span class="badge badge-gray">—</span>`}</td>
      <td>${m.quality ? `<span class="badge badge-green" style="font-size:10px">${qualityLabel[m.quality] || m.quality}</span>` : '<span style="color:var(--text3)">—</span>'}</td>
      <td>${m.language ? `<span class="badge badge-yellow" style="font-size:10px">${langLabel[m.language] || m.language}</span>` : '<span style="color:var(--text3)">—</span>'}</td>
      <td style="text-align:right;">
        <button class="btn btn-danger btn-xs" onclick="deleteMovie('${esc(m.code)}')">🗑 O'chirish</button>
      </td>
    </tr>
  `).join("");
}

window.deleteMovie = async (code) => {
  if (!confirm(`"${code}" kinoni o'chirmoqchimisiz?`)) return;
  try {
    await api(`/api/delete-movie/${encodeURIComponent(code)}`, { method: "POST" });
    loadData();
  } catch (e) { alert(e.message); }
};

// ── MOVIE MODAL ───────────────────────────────────────────────────────
const $modal = document.getElementById("movie-modal");

window.openMovieModal = () => {
  document.getElementById("modal-title").textContent = "🎬 Kino qo'shish";
  document.getElementById("m-url").value      = "";
  document.getElementById("m-code").value     = "";
  document.getElementById("m-title").value    = "";
  document.getElementById("m-year").value     = "";
  document.getElementById("m-genre").value    = "";
  document.getElementById("m-quality").value  = "";
  document.getElementById("m-language").value = "";
  $modal.classList.add("open");
};

window.closeModal = () => $modal.classList.remove("open");

window.saveMovie = async () => {
  const url_or_id = document.getElementById("m-url").value.trim();
  const code      = document.getElementById("m-code").value.trim();
  const title     = document.getElementById("m-title").value.trim();
  const year      = document.getElementById("m-year").value.trim();
  const genre     = document.getElementById("m-genre").value;
  const quality   = document.getElementById("m-quality").value;
  const language  = document.getElementById("m-language").value;

  if (!url_or_id || !code) return alert("Majburiy maydonlarni to'ldiring!");
  try {
    setStatus("Saqlanmoqda...");
    await api("/api/add-movie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url_or_id, code, title, year, genre, quality, language })
    });
    closeModal();
    loadData();
  } catch (e) { alert(e.message); }
};

// ── USERS ─────────────────────────────────────────────────────────────
function renderUsers() {
  const search = (document.getElementById("user-search")?.value || "").toLowerCase();

  let list = _data.users.filter(u => {
    if (!search) return true;
    return String(u.user_id).includes(search) ||
           String(u.phone || "").toLowerCase().includes(search);
  });

  const tbody = document.getElementById("users-body");
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-icon">👤</div>
          <p>Foydalanuvchilar topilmadi.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(u => {
    const badge = u.verified
      ? `<span class="badge badge-green">✓ Tasdiqlangan</span>`
      : `<span class="badge badge-yellow">⏳ Tasdiqlanmagan</span>`;
    return `
      <tr data-uid="${u.user_id}">
        <td>
          <button class="btn btn-ghost btn-xs" onclick="toggleExpand(${u.user_id})" title="Ko'rish">
            👁
          </button>
        </td>
        <td style="font-family:monospace;color:var(--accent)">${u.user_id}</td>
        <td>${esc(u.phone || "—")}</td>
        <td>${badge}</td>
        <td>
          <span class="badge badge-blue">📥 ${u.downloads_count || 0} ta</span>
        </td>
      </tr>
    `;
  }).join("");
}

// ── USER DETAIL MODAL ────────────────────────────────────────────────
let _userMovies = [];
let _userGenreFilter = "";

window.toggleExpand = async (userId) => {
  const overlay = document.getElementById("user-detail-modal");
  const body    = document.getElementById("udm-body");
  const title   = document.getElementById("udm-title");
  const genSel  = document.getElementById("udm-genre");

  title.textContent  = `Foydalanuvchi #${userId} — kinolar`;
  body.innerHTML     = `<p style="color:var(--text3);padding:20px;text-align:center">⌛ Yuklanmoqda...</p>`;
  genSel.innerHTML   = `<option value="">Barcha janrlar</option>`;
  _userGenreFilter   = "";
  overlay.classList.add("open");

  try {
    const res = await api(`/api/user/${userId}/movies`);
    _userMovies = res.movies || [];

    // genre options from loaded movies
    const genres = [...new Set(_userMovies.map(m => m.genre).filter(Boolean))];
    genSel.innerHTML = `<option value="">Barcha janrlar</option>` +
      genres.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("");

    renderUserMovies();
  } catch (e) {
    body.innerHTML = `<p style="color:#f87171;padding:20px">${e.message}</p>`;
  }
};

function renderUserMovies() {
  const body = document.getElementById("udm-body");
  const list = _userMovies.filter(m =>
    !_userGenreFilter || m.genre === _userGenreFilter
  );

  if (list.length === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎞️</div>
        <p>Bu janrda kino yo'q.</p>
      </div>`;
    return;
  }

  body.innerHTML = `
    <table class="dl-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Kino kodi</th>
          <th>Nomi</th>
          <th>Yil</th>
          <th>Janr</th>
          <th>Yuklagan vaqti (UZB)</th>
        </tr>
      </thead>
      <tbody>
        ${list.map((m, i) => `
          <tr>
            <td style="color:var(--text3)">${i + 1}</td>
            <td><code style="background:var(--bg4);padding:2px 7px;border-radius:5px;color:var(--accent);font-size:11px">${esc(m.code)}</code></td>
            <td>${esc(m.title || "—")}</td>
            <td>${m.year ? `<span class="badge badge-gray" style="font-size:10px">${esc(m.year)}</span>` : "—"}</td>
            <td>${m.genre ? `<span class="badge badge-blue" style="font-size:10px">${esc(m.genre)}</span>` : "—"}</td>
            <td style="color:var(--text2);font-size:12px">${fmtDate(m.downloaded_at)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

window.closeUserModal = () => {
  document.getElementById("user-detail-modal").classList.remove("open");
  _userMovies = [];
};

document.getElementById("udm-genre").addEventListener("change", e => {
  _userGenreFilter = e.target.value;
  renderUserMovies();
});

// ── SEARCH & FILTER EVENTS ────────────────────────────────────────────
document.getElementById("movie-search").addEventListener("input", renderMovies);
document.getElementById("filter-genre").addEventListener("change", renderMovies);
document.getElementById("user-search").addEventListener("input", renderUsers);

// Enter key on genre input
document.getElementById("genre-input").addEventListener("keydown", e => {
  if (e.key === "Enter") addGenre();
});

// ── INIT ─────────────────────────────────────────────────────────────
loadData();
