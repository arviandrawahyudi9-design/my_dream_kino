// ── CONFIG ──────────────────────────────────────────────────────────
const baseUrl = (window.KINO_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");

const api = async (path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "So'rov bajarilmadi");
  return data;
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

  tbody.innerHTML = list.map(m => `
    <tr>
      <td><code style="background:var(--bg3);padding:3px 8px;border-radius:6px;font-size:12px;color:var(--accent)">${esc(m.code)}</code></td>
      <td style="font-weight:500;">${esc(m.title || "—")}</td>
      <td>${m.genre ? `<span class="badge badge-blue">${esc(m.genre)}</span>` : `<span class="badge badge-gray">Janrsiz</span>`}</td>
      <td style="color:var(--text3);font-size:12px;">${m.message_id}</td>
      <td style="text-align:right;">
        <button class="btn btn-danger btn-xs" onclick="deleteMovie('${esc(m.code)}')">
          🗑 O'chirish
        </button>
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
  document.getElementById("m-url").value   = "";
  document.getElementById("m-code").value  = "";
  document.getElementById("m-title").value = "";
  document.getElementById("m-genre").value = "";
  $modal.classList.add("open");
};

window.closeModal = () => $modal.classList.remove("open");

window.saveMovie = async () => {
  const url_or_id = document.getElementById("m-url").value.trim();
  const code      = document.getElementById("m-code").value.trim();
  const title     = document.getElementById("m-title").value.trim();
  const genre     = document.getElementById("m-genre").value;

  if (!url_or_id || !code) return alert("Majburiy maydonlarni to'ldiring!");
  try {
    setStatus("Saqlanmoqda...");
    await api("/api/add-movie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url_or_id, code, title, genre })
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

// Expand/collapse user downloads
window.toggleExpand = async (userId) => {
  const existingRow = document.getElementById(`expand-${userId}`);
  if (existingRow) {
    existingRow.remove();
    return;
  }

  const parentRow = document.querySelector(`tr[data-uid="${userId}"]`);
  const loadingRow = document.createElement("tr");
  loadingRow.id = `expand-${userId}`;
  loadingRow.className = "expand-row";
  loadingRow.innerHTML = `<td colspan="5"><div class="expand-inner" style="color:var(--text3);font-size:13px;">⌛ Yuklanmoqda...</div></td>`;
  parentRow.after(loadingRow);

  try {
    const res = await api(`/api/user/${userId}/movies`);
    const movies = res.movies || [];

    let tableHtml;
    if (movies.length === 0) {
      tableHtml = `<p style="color:var(--text3);font-size:13px;">Hali hech qanday kino yuklanmagan.</p>`;
    } else {
      tableHtml = `
        <table class="dl-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Kino kodi</th>
              <th>Nomi</th>
              <th>Janr</th>
              <th>Yuklagan vaqti</th>
            </tr>
          </thead>
          <tbody>
            ${movies.map((m, i) => `
              <tr>
                <td style="color:var(--text3)">${i + 1}</td>
                <td><code style="background:var(--bg4);padding:2px 7px;border-radius:5px;color:var(--accent);font-size:11px">${esc(m.code)}</code></td>
                <td>${esc(m.title || "—")}</td>
                <td>${m.genre ? `<span class="badge badge-blue" style="font-size:10px">${esc(m.genre)}</span>` : "—"}</td>
                <td style="color:var(--text3)">${m.downloaded_at ? new Date(m.downloaded_at).toLocaleString("uz-UZ") : "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    loadingRow.innerHTML = `
      <td colspan="5">
        <div class="expand-inner">
          <div class="expand-title">📥 Yuklagan kinolar — ${movies.length} ta</div>
          ${tableHtml}
        </div>
      </td>
    `;
  } catch (e) {
    loadingRow.innerHTML = `<td colspan="5"><div class="expand-inner" style="color:#f87171">Xatolik: ${e.message}</div></td>`;
  }
};

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
