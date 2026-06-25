// ===== SUPABASE SETUP =====
const SUPABASE_URL = 'https://cgylgdcphkraqcrttpym.supabase.co';
const SUPABASE_KEY = 'sb_publishable_b4kOwdEzwx3ovnYlIqPvTQ_5Lnqa9Iq';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let movies = [];
let currentRating = 0;
let editingId = null;
let currentUser = null;
let activeGenre = 'All';
let activeStatus = 'All';

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===== AUTH CHECK =====
async function checkAuth() {
  const { data } = await _supabase.auth.getSession();
  if (!data.session) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = data.session.user;
  const email = currentUser.email || '';
  document.getElementById('userEmail').textContent = email;
  document.getElementById('userAvatar').textContent = email.charAt(0).toUpperCase();
  await loadMovies();
}

// ===== LOGOUT =====
async function handleLogout() {
  await _supabase.auth.signOut();
  window.location.href = 'login.html';
}

// ===== AUTO FETCH MISSING POSTERS =====
async function fetchMissingPosters() {
  const missing = movies.filter(m => !m.poster_url);
  if (missing.length === 0) return;

  console.log(`Fetching posters for ${missing.length} movies...`);

  for (const movie of missing) {
    const posterUrl = await fetchMoviePoster(movie.title);
    if (posterUrl) {
      await _supabase
        .from('movies')
        .update({ poster_url: posterUrl })
        .eq('id', movie.id);
      movie.poster_url = posterUrl;
      renderMovies();
    }
    // 2 second delay between each request
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('Poster fetch complete!');
}

// ===== LOAD MOVIES =====
async function loadMovies() {
  const { data, error } = await _supabase
    .from('movies')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('id', { ascending: false });
  if (error) { console.error('Load error:', error); return; }
  movies = data || [];
  renderMovies();
  // Background-ல posters fetch பண்றோம்
  fetchMissingPosters();
}

async function fetchMoviePoster(title) {
  try {
    let response = await fetch(
      `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=5fabe342`
    );

    let data = await response.json();

    // Exact match kidaikkalana search pannu
    if (data.Response !== "True") {
      response = await fetch(
        `https://www.omdbapi.com/?s=${encodeURIComponent(title)}&apikey=5fabe342`
      );

      data = await response.json();

      if (
        data.Response === "True" &&
        data.Search &&
        data.Search.length > 0
      ) {
        return data.Search[0].Poster !== "N/A"
          ? data.Search[0].Poster
          : null;
      }

      return null;
    }

    return data.Poster !== "N/A" ? data.Poster : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

// ===== GENRE ICONS & COLORS =====
function getGenreIcon(genre) {
  const icons = {
    'Action': '💥', 'Comedy': '😂', 'Drama': '🎭',
    'Horror': '👻', 'Romance': '❤️', 'Sci-Fi': '🚀', 'Thriller': '🔪'
  };
  return icons[genre] || '🎬';
}

function getGenreColor(genre) {
  const colors = {
    'Action': '#ff6b6b', 'Comedy': '#ffd93d', 'Drama': '#6bcb77',
    'Horror': '#845ec2', 'Romance': '#ff9a9e', 'Sci-Fi': '#4d96ff', 'Thriller': '#f9c74f'
  };
  return colors[genre] || '#00d4aa';
}

// ===== FILTER BY GENRE =====
function filterByGenre(genre) {
  activeGenre = genre;
  activeStatus = 'All';
  document.getElementById('filterGenreTop').value = genre;
  document.getElementById('sectionTitle').textContent =
    genre === 'All' ? 'All Movies' : `${getGenreIcon(genre)} ${genre}`;
  setActiveNav(genre);
  renderMovies();
}

// ===== FILTER BY STATUS =====
function filterByStatus(status) {
  activeStatus = status;
  activeGenre = 'All';
  document.getElementById('filterGenreTop').value = 'All';
  document.getElementById('sectionTitle').textContent =
    status === 'All' ? 'All Movies' : status === 'Watched' ? '✅ Watched' : '🎞 Unwatched';
  renderMovies();
}

// ===== SET ACTIVE NAV =====
function setActiveNav(genre) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
}

// ===== CSV UPLOAD =====
async function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  showBanner('⏳ Uploading...', 'loading');

  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    const lines = text.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const dataLines = lines.slice(1).filter(l => l.trim());

    if (dataLines.length === 0) { showBanner('❌ CSV empty!', 'error'); return; }

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const moviesData = dataLines.map(line => {
      const values = line.split(',').map(v => v.trim());
      const get = (key) => { const idx = headers.indexOf(key); return idx !== -1 ? values[idx] || '' : ''; };
      return {
        title: get('title'), genre: get('genre') || 'Action',
        rating: parseInt(get('rating')) || 0,
        watched: get('watched').toLowerCase() === 'true',
        notes: get('notes') || '', date: today, user_id: currentUser.id
      };
    }).filter(m => m.title);

    const { error } = await _supabase.from('movies').insert(moviesData);
    event.target.value = '';
    if (error) { showBanner('❌ ' + error.message, 'error'); return; }
    showBanner(`✅ ${moviesData.length} movies added!`, 'success');
    await loadMovies();
  };
  reader.readAsText(file);
}

// ===== BANNER =====
function showBanner(msg, type) {
  const banner = document.getElementById('importBanner');
  banner.textContent = msg;
  banner.style.display = 'block';
  banner.className = 'import-banner';
  if (type === 'success') {
    banner.style.background = 'rgba(0,212,170,0.12)';
    banner.style.color = '#00d4aa';
    banner.style.border = '1px solid rgba(0,212,170,0.3)';
    setTimeout(() => banner.style.display = 'none', 4000);
  } else if (type === 'error') {
    banner.style.background = 'rgba(255,92,92,0.12)';
    banner.style.color = '#ff5c5c';
    banner.style.border = '1px solid rgba(255,92,92,0.3)';
    setTimeout(() => banner.style.display = 'none', 4000);
  } else {
    banner.style.background = 'rgba(124,106,247,0.12)';
    banner.style.color = '#7c6af7';
    banner.style.border = '1px solid rgba(124,106,247,0.3)';
  }
}

// ===== RENDER MOVIES =====
function renderMovies() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const genreFilter = document.getElementById('filterGenreTop').value;

  let filtered = movies.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search);
    const matchGenre = (activeGenre === 'All' && genreFilter === 'All') ||
      (genreFilter !== 'All' ? m.genre === genreFilter : m.genre === activeGenre || activeGenre === 'All');
    const matchStatus = activeStatus === 'All' ||
      (activeStatus === 'Watched' && m.watched) ||
      (activeStatus === 'Unwatched' && !m.watched);
    return matchSearch && matchGenre && matchStatus;
  });

  const grid = document.getElementById('movieGrid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '';

  if (filtered.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    filtered.forEach(m => grid.appendChild(createCard(m)));
  }
  updateStats();
}

// ===== CREATE CARD =====
function createCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';

  const stars = Array.from({length: 5}, (_, i) =>
    `<span class="${i < movie.rating ? '' : 'empty'}">★</span>`
  ).join('');

  const icon = getGenreIcon(movie.genre);
  const color = getGenreColor(movie.genre);
  const posterContent = movie.poster_url
    ? `<img src="${movie.poster_url}" alt="${movie.title}" style="width:100%;height:100%;object-fit:cover;border-radius:0" onerror="this.parentElement.innerHTML='<span style=font-size:3rem>${icon}</span>'" />`
    : `<div class="card-poster-bg">${icon}</div><span style="font-size:3rem;position:relative;z-index:1">${icon}</span>`;

  card.innerHTML = `
    <div class="card-poster" style="background: linear-gradient(135deg, ${color}22, ${color}11)">
      ${posterContent}
      <span class="card-watched-badge ${movie.watched ? 'badge-watched' : 'badge-unwatched'}">
        ${movie.watched ? '✅ Watched' : '🎞 Unwatched'}
      </span>
    </div>
    <div class="card-body">
      <div class="card-title">${movie.title}</div>
      <div class="card-genre">${icon} ${movie.genre}</div>
      <div class="card-stars">${stars}</div>
      ${movie.notes ? `<div class="card-notes">"${movie.notes}"</div>` : ''}
      <div class="card-date">📅 ${movie.date}</div>
      <div class="card-actions">
        <button class="btn-watch" onclick="toggleWatch(${movie.id}, ${movie.watched})">
          ${movie.watched ? '↩ Unwatch' : '✅ Watched'}
        </button>
        <button class="btn-edit" onclick="openEdit(${movie.id})">✏️</button>
        <button class="btn-delete" onclick="deleteMovie(${movie.id})">🗑️</button>
      </div>
    </div>
  `;
  return card;
}

// ===== UPDATE STATS =====
function updateStats() {
  const total = movies.length;
  const watched = movies.filter(m => m.watched).length;
  const unwatched = total - watched;
  const avgRating = total > 0
    ? (movies.reduce((s, m) => s + (m.rating || 0), 0) / total).toFixed(1)
    : '0';

  document.getElementById('totalCount').textContent = total;
  document.getElementById('watchedCount').textContent = watched;
  document.getElementById('unwatchedCount').textContent = unwatched;
  document.getElementById('ratingAvg').textContent = avgRating + '⭐';
  document.getElementById('watchedBadge').textContent = watched;
  document.getElementById('unwatchedBadge').textContent = unwatched;
  renderTopRatedMovies();
}
function renderTopRatedMovies() {
  const container = document.getElementById('topRatedMovies');
  if (!container) return;

  const top = [...movies]
    .sort((a,b) => b.rating - a.rating)
    .slice(0,3);

  container.innerHTML = top.map((m,i)=>`
    <div style="padding:10px;border-bottom:1px solid #333">
      ${i+1}. ${m.title} ⭐ ${m.rating}/5
    </div>
  `).join('');
}

// ===== MODAL OPEN =====
function openModal() {
  editingId = null; currentRating = 0;
  document.getElementById('modalTitle').textContent = 'Add Movie';
  document.getElementById('movieTitle').value = '';
  document.getElementById('movieGenre').value = 'Action';
  document.getElementById('movieNotes').value = '';
  document.getElementById('movieWatched').checked = false;
  updateStarUI(0);
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('movieTitle').focus();
}

// ===== MODAL EDIT =====
function openEdit(id) {
  const movie = movies.find(m => m.id === id);
  if (!movie) return;
  editingId = id; currentRating = movie.rating;
  document.getElementById('modalTitle').textContent = 'Edit Movie';
  document.getElementById('movieTitle').value = movie.title;
  document.getElementById('movieGenre').value = movie.genre;
  document.getElementById('movieNotes').value = movie.notes || '';
  document.getElementById('movieWatched').checked = movie.watched;
  updateStarUI(movie.rating);
  document.getElementById('modalOverlay').classList.add('active');
}

// ===== MODAL CLOSE =====
function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }
function closeModalOutside(e) { if (e.target.id === 'modalOverlay') closeModal(); }

// ===== SAVE MOVIE =====
async function saveMovie() {
  const title = document.getElementById('movieTitle').value.trim();
  const genre = document.getElementById('movieGenre').value;
  const notes = document.getElementById('movieNotes').value.trim();
  const watched = document.getElementById('movieWatched').checked;

  if (!title) {
    document.getElementById('movieTitle').style.borderColor = '#ff5c5c';
    setTimeout(() => document.getElementById('movieTitle').style.borderColor = '', 1500);
    return;
  }

  const posterUrl = await fetchMoviePoster(title);

  const movieData = {
    title, genre, notes, watched, rating: currentRating, user_id: currentUser.id,
    poster_url: posterUrl,
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  if (editingId) {
    const { error } = await _supabase.from('movies').update(movieData).eq('id', editingId);
    if (error) { console.error(error); return; }
  } else {
    const { error } = await _supabase.from('movies').insert([movieData]);
    if (error) { console.error(error); return; }
  }
  closeModal();
  await loadMovies();
}

// ===== DELETE =====
async function deleteMovie(id) {
  if (!confirm('Delete this movie?')) return;
  await _supabase.from('movies').delete().eq('id', id);
  await loadMovies();
}

// ===== TOGGLE WATCH =====
async function toggleWatch(id, status) {
  await _supabase.from('movies').update({ watched: !status }).eq('id', id);
  await loadMovies();
}

// ===== STAR RATING =====
function setRating(val) { currentRating = val; updateStarUI(val); }
function updateStarUI(val) {
  document.querySelectorAll('#starInput span').forEach((s, i) => s.classList.toggle('active', i < val));
}

// ===== KEYBOARD =====
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => checkAuth());
