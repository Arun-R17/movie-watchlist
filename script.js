// ===== SUPABASE SETUP =====
const SUPABASE_URL = 'https://xqedaohjcfyljvhseuza.supabase.co';
const SUPABASE_KEY = 'sb_publishable_T2PLIeD0mXsWfL80HHIiFg_zO849l0O';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let movies = [];
let currentRating = 0;
let editingId = null;

// ===== LOAD MOVIES =====
async function loadMovies() {
  const { data, error } = await _supabase
    .from('movies')
    .select('*')
    .order('id', { ascending: false });
  if (error) { console.error('Load error:', error); return; }
  movies = data || [];
  renderMovies();
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

    if (dataLines.length === 0) {
      showBanner('❌ CSV empty-ஆ இருக்கு!', 'error');
      return;
    }

    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    const moviesData = dataLines.map(line => {
      const values = line.split(',').map(v => v.trim());
      const get = (key) => {
        const idx = headers.indexOf(key);
        return idx !== -1 ? values[idx] || '' : '';
      };
      return {
        title:   get('title'),
        genre:   get('genre')  || 'Action',
        rating:  parseInt(get('rating')) || 0,
        watched: get('watched').toLowerCase() === 'true',
        notes:   get('notes')  || '',
        date:    today
      };
    }).filter(m => m.title);

    if (moviesData.length === 0) {
      showBanner('❌ Valid data இல்ல!', 'error');
      return;
    }

    const { error } = await _supabase.from('movies').insert(moviesData);
    event.target.value = '';

    if (error) {
      console.error('CSV error:', error);
      showBanner('❌ Upload failed! ' + error.message, 'error');
      return;
    }

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
  banner.style.padding = '12px 24px';
  banner.style.textAlign = 'center';
  banner.style.fontWeight = '600';
  banner.style.fontSize = '0.95rem';
  banner.style.maxWidth = '1100px';
  banner.style.margin = '12px auto 0';
  banner.style.borderRadius = '8px';

  if (type === 'success') {
    banner.style.background = 'rgba(52,211,153,0.15)';
    banner.style.color = '#34d399';
    banner.style.border = '1px solid #34d399';
    setTimeout(() => banner.style.display = 'none', 4000);
  } else if (type === 'error') {
    banner.style.background = 'rgba(248,113,113,0.15)';
    banner.style.color = '#f87171';
    banner.style.border = '1px solid #f87171';
    setTimeout(() => banner.style.display = 'none', 4000);
  } else {
    banner.style.background = 'rgba(192,132,252,0.15)';
    banner.style.color = '#c084fc';
    banner.style.border = '1px solid #c084fc';
  }
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
  document.getElementById('modalTitle').textContent   = 'Add Movie';
  document.getElementById('movieTitle').value         = '';
  document.getElementById('movieGenre').value         = 'Action';
  document.getElementById('movieNotes').value         = '';
  document.getElementById('movieWatched').checked     = false;
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
  document.getElementById('modalTitle').textContent   = 'Edit Movie';
  document.getElementById('movieTitle').value         = movie.title;
  document.getElementById('movieGenre').value         = movie.genre;
  document.getElementById('movieNotes').value         = movie.notes || '';
  document.getElementById('movieWatched').checked     = movie.watched;
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

// ===== SAVE MOVIE =====
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
    title, genre, notes, watched,
    rating: currentRating,
    date: new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  };

  if (editingId) {
    const { error } = await _supabase.from('movies').update(movieData).eq('id', editingId);
    if (error) { console.error('Update error:', error); return; }
  } else {
    const { error } = await _supabase.from('movies').insert([movieData]);
    if (error) { console.error('Insert error:', error); return; }
  }

  closeModal();
  await loadMovies();
}

// ===== DELETE MOVIE =====
async function deleteMovie(id) {
  if (!confirm('Delete this movie?')) return;
  const { error } = await _supabase.from('movies').delete().eq('id', id);
  if (error) { console.error('Delete error:', error); return; }
  await loadMovies();
}

// ===== TOGGLE WATCH =====
async function toggleWatch(id, currentStatus) {
  const { error } = await _supabase
    .from('movies').update({ watched: !currentStatus }).eq('id', id);
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
