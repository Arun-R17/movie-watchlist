// ===== SUPABASE SETUP =====
const SUPABASE_URL = 'https://xqedaohjcfyljvhseuza.supabase.co';
const SUPABASE_KEY = 'sb_publishable_T2PLIeD0mXsWfL80HHIiFg_zO849l0O';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let movies = [];
let currentRating = 0;
let editingId = null;

// ===== LOAD MOVIES FROM SUPABASE =====
async function loadMovies() {
  const { data, error } = await _supabase
    .from('movies')
    .select('*')
    .order('id', { ascending: false });

  if (error) { console.error('Load error:', error); return; }
  movies = data || [];
  renderMovies();
}

// ===== RENDER MOVIES =====
function renderMovies() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const genre  = document.getElementById('filterGenre').value;
  const status = document.getElementById('filterStatus').value;

  let filtered = movies.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search);
    const matchGenre  = genre === 'All' || m.genre === genre;
    const matchStatus = status === 'All' ||
      (status === 'Watched' && m.watched) ||
      (status === 'Unwatched' && !m.watched);
    return matchSearch && matchGenre && matchStatus;
  });

  const grid  = document.getElementById('movieGrid');
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

  card.innerHTML = `
    <div class="card-top">
      <div class="movie-title">${movie.title}</div>
      <span class="badge ${movie.watched ? 'badge-watched' : 'badge-unwatched'}">
        ${movie.watched ? '✅ Watched' : '🎞 Unwatched'}
      </span>
    </div>
    <div class="genre-tag">🎭 ${movie.genre}</div>
    <div class="stars">${stars}</div>
    ${movie.notes ? `<div class="notes-text">"${movie.notes}"</div>` : ''}
    <div class="card-date">📅 Added: ${movie.date}</div>
    <div class="card-actions">
      <button class="btn-watch" onclick="toggleWatch(${movie.id}, ${movie.watched})">
        ${movie.watched ? '↩ Mark Unwatched' : '✅ Mark Watched'}
      </button>
      <button class="btn-edit" onclick="openEdit(${movie.id})">✏️</button>
      <button class="btn-delete" onclick="deleteMovie(${movie.id})">🗑️</button>
    </div>
  `;
  return card;
}

// ===== UPDATE STATS =====
function updateStats() {
  const total     = movies.length;
  const watched   = movies.filter(m => m.watched).length;
  const unwatched = total - watched;
  document.getElementById('totalCount').textContent     = total;
  document.getElementById('watchedCount').textContent   = watched;
  document.getElementById('unwatchedCount').textContent = unwatched;
}

// ===== MODAL OPEN (ADD) =====
function openModal() {
  editingId = null;
  currentRating = 0;
  document.getElementById('modalTitle').textContent       = 'Add Movie';
  document.getElementById('movieTitle').value             = '';
  document.getElementById('movieGenre').value             = 'Action';
  document.getElementById('movieNotes').value             = '';
  document.getElementById('movieWatched').checked         = false;
  updateStarUI(0);
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('movieTitle').focus();
}

// ===== MODAL OPEN (EDIT) =====
function openEdit(id) {
  const movie = movies.find(m => m.id === id);
  if (!movie) return;
  editingId = id;
  currentRating = movie.rating;
  document.getElementById('modalTitle').textContent       = 'Edit Movie';
  document.getElementById('movieTitle').value             = movie.title;
  document.getElementById('movieGenre').value             = movie.genre;
  document.getElementById('movieNotes').value             = movie.notes || '';
  document.getElementById('movieWatched').checked         = movie.watched;
  updateStarUI(movie.rating);
  document.getElementById('modalOverlay').classList.add('active');
}

// ===== MODAL CLOSE =====
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

function closeModalOutside(e) {
  if (e.target.id === 'modalOverlay') closeModal();
}

// ===== SAVE MOVIE (CREATE / UPDATE) =====
async function saveMovie() {
  const title   = document.getElementById('movieTitle').value.trim();
  const genre   = document.getElementById('movieGenre').value;
  const notes   = document.getElementById('movieNotes').value.trim();
  const watched = document.getElementById('movieWatched').checked;

  if (!title) {
    document.getElementById('movieTitle').focus();
    document.getElementById('movieTitle').style.borderColor = '#f87171';
    setTimeout(() => document.getElementById('movieTitle').style.borderColor = '', 1500);
    return;
  }

  const movieData = {
    title,
    genre,
    notes,
    watched,
    rating: currentRating,
    date: new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
  };

  if (editingId) {
    // UPDATE
    const { error } = await _supabase
      .from('movies')
      .update(movieData)
      .eq('id', editingId);
    if (error) { console.error('Update error:', error); return; }
  } else {
    // CREATE
    const { error } = await _supabase
      .from('movies')
      .insert([movieData]);
    if (error) { console.error('Insert error:', error); return; }
  }

  closeModal();
  await loadMovies();
}

// ===== DELETE MOVIE =====
async function deleteMovie(id) {
  if (!confirm('Delete this movie?')) return;
  const { error } = await _supabase
    .from('movies')
    .delete()
    .eq('id', id);
  if (error) { console.error('Delete error:', error); return; }
  await loadMovies();
}

// ===== TOGGLE WATCH STATUS =====
async function toggleWatch(id, currentStatus) {
  const { error } = await _supabase
    .from('movies')
    .update({ watched: !currentStatus })
    .eq('id', id);
  if (error) { console.error('Toggle error:', error); return; }
  await loadMovies();
}

// ===== STAR RATING =====
function setRating(val) {
  currentRating = val;
  updateStarUI(val);
}

function updateStarUI(val) {
  const stars = document.querySelectorAll('#starInput span');
  stars.forEach((s, i) => s.classList.toggle('active', i < val));
}

// ===== KEYBOARD =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ===== INIT =====
loadMovies();