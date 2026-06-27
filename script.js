// ===== SUPABASE SETUP =====
const SUPABASE_URL = 'https://cgylgdcphkraqcrttpym.supabase.co';
const SUPABASE_KEY = 'sb_publishable_b4kOwdEzwx3ovnYlIqPvTQ_5Lnqa9Iq';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== DEFAULT MOVIES FOR NEW USERS =====
const DEFAULT_MOVIES = [
  { title: 'Vikram', genre: 'Action', rating: 5, watched: false, notes: 'Kamal Hassan mass performance' },
  { title: 'Jailer', genre: 'Action', rating: 4, watched: false, notes: 'Rajini superb comeback' },
  { title: '96', genre: 'Romance', rating: 5, watched: false, notes: 'Beautiful love story' },
  { title: 'Kaithi', genre: 'Thriller', rating: 5, watched: false, notes: 'Non stop action no songs' },
  { title: 'Super Deluxe', genre: 'Thriller', rating: 5, watched: false, notes: 'Mind blowing screenplay' },
  { title: 'Ratsasan', genre: 'Thriller', rating: 5, watched: false, notes: 'Best Tamil thriller' },
  { title: 'Soorarai Pottru', genre: 'Drama', rating: 5, watched: false, notes: 'Suriya best performance' },
  { title: 'Interstellar', genre: 'Sci-Fi', rating: 5, watched: false, notes: 'Mind bending space movie' },
  { title: 'The Dark Knight', genre: 'Action', rating: 5, watched: false, notes: 'Best superhero movie' },
  { title: 'Inception', genre: 'Thriller', rating: 5, watched: false, notes: 'Dream within a dream' },
];

// ===== STATE =====
let movies = [];
let currentRating = 0;
let editingId = null;
let currentUser = null;
let activeSection = 'all';
let activeGenre = 'All';
let movieStatus = 'watchlist';

// ===== THEME =====
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.querySelector('.btn-theme').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

function loadTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.querySelector('.btn-theme');
  if (btn) btn.textContent = saved === 'dark' ? '🌙' : '☀️';
}

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===== AUTH CHECK =====
async function checkAuth() {
  loadTheme();
  const { data } = await _supabase.auth.getSession();
  if (!data.session) { window.location.href = 'login.html'; return; }
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

// ===== LOAD MOVIES =====
async function loadMovies() {
  const { data, error } = await _supabase
    .from('movies')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('id', { ascending: false });
  if (error) { console.error('Load error:', error); return; }
  movies = data || [];

  // New user → add default movies
  if (movies.length === 0) {
    await addDefaultMovies();
    return;
  }

  renderMovies();
  fetchMissingPosters();
}

// ===== ADD DEFAULT MOVIES =====
async function addDefaultMovies() {
  showBanner('🎬 Welcome! Adding popular movies for you...', 'loading');
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const moviesData = DEFAULT_MOVIES.map(m => ({
    ...m, user_id: currentUser.id, date: today, watched: false, poster_url: null
  }));

  const { error } = await _supabase.from('movies').insert(moviesData);
  if (error) { console.error(error); return; }

  showBanner('✅ 10 popular movies added! Enjoy CineTrack!', 'success');
  await loadMovies();
}

// ===== SHOW SECTION =====
function showSection(section) {
  activeSection = section;
  activeGenre = 'All';
  document.getElementById('filterGenreTop').value = 'All';

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const titles = {
    'all': 'All Movies',
    'toprated': '⭐ Top Rated (4+)',
    'watched': '✅ Watched',
    'watchlist': '📋 Watchlist'
  };

  document.getElementById('sectionTitle').textContent = titles[section] || 'All Movies';

  const navMap = { 'all': 'nav-dashboard', 'toprated': 'nav-toprated', 'watched': 'nav-watched', 'watchlist': 'nav-watchlist' };
  if (navMap[section]) document.getElementById(navMap[section])?.classList.add('active');

  renderMovies();
}

// ===== FILTER BY GENRE =====
function filterByGenre(genre) {
  activeGenre = genre;
  activeSection = 'all';
  document.getElementById('filterGenreTop').value = genre;
  document.getElementById('sectionTitle').textContent = genre === 'All' ? 'All Movies' : `${getGenreIcon(genre)} ${genre}`;
  renderMovies();
}

// ===== GENRE ICONS & COLORS =====
function getGenreIcon(genre) {
  const icons = { 'Action': '💥', 'Comedy': '😂', 'Drama': '🎭', 'Horror': '👻', 'Romance': '❤️', 'Sci-Fi': '🚀', 'Thriller': '🔪' };
  return icons[genre] || '🎬';
}

function getGenreColor(genre) {
  const colors = { 'Action': '#ff6b6b', 'Comedy': '#ffd93d', 'Drama': '#6bcb77', 'Horror': '#845ec2', 'Romance': '#ff9a9e', 'Sci-Fi': '#4d96ff', 'Thriller': '#f9c74f' };
  return colors[genre] || '#00d4aa';
}

// ===== SHARE LIST =====
function shareList() {
  const shareUrl = `https://arun-r17.github.io/movie-watchlist/share.html?user=${currentUser.id}`;
  document.getElementById('shareLink').value = shareUrl;
  document.getElementById('shareModal').classList.add('active');
}

function copyShareLink() {
  const link = document.getElementById('shareLink').value;
  navigator.clipboard.writeText(link).then(() => {
    showBanner('✅ Link copied! Share பண்ணுங்க!', 'success');
    document.getElementById('shareModal').classList.remove('active');
  });
}

function closeShareModal(e) {
  if (e.target.id === 'shareModal') document.getElementById('shareModal').classList.remove('active');
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
    if (!dataLines.length) { showBanner('❌ CSV empty!', 'error'); return; }

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const moviesData = dataLines.map(line => {
      const values = line.split(',').map(v => v.trim());
      const get = (key) => { const idx = headers.indexOf(key); return idx !== -1 ? values[idx] || '' : ''; };
      return { title: get('title'), genre: get('genre') || 'Action', rating: parseInt(get('rating')) || 0, watched: get('watched').toLowerCase() === 'true', notes: get('notes') || '', date: today, user_id: currentUser.id };
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
  const styles = {
    success: { bg: 'rgba(0,212,170,0.12)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.3)' },
    error:   { bg: 'rgba(255,92,92,0.12)',  color: '#ff5c5c', border: '1px solid rgba(255,92,92,0.3)' },
    loading: { bg: 'rgba(124,106,247,0.12)', color: '#7c6af7', border: '1px solid rgba(124,106,247,0.3)' }
  };
  const s = styles[type] || styles.loading;
  Object.assign(banner.style, { background: s.bg, color: s.color, border: s.border, padding: '12px 24px', textAlign: 'center', fontWeight: '600', maxWidth: '1100px', margin: '12px auto 0', borderRadius: '8px', display: 'block' });
  if (type !== 'loading') setTimeout(() => banner.style.display = 'none', 4000);
}

// ===== RENDER MOVIES =====
function renderMovies() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const genreFilter = document.getElementById('filterGenreTop').value;

  let filtered = movies.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search);
    const matchGenre = genreFilter === 'All' ? (activeGenre === 'All' || m.genre === activeGenre) : m.genre === genreFilter;
    const matchSection =
      activeSection === 'all' ? true :
      activeSection === 'watched' ? m.watched :
      activeSection === 'watchlist' ? !m.watched :
      activeSection === 'toprated' ? m.rating >= 4 : true;
    return matchSearch && matchGenre && matchSection;
  });

  const grid = document.getElementById('movieGrid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '';

  // Top rated → sort by rating
  if (activeSection === 'toprated') filtered.sort((a, b) => b.rating - a.rating);

  if (!filtered.length) { empty.style.display = 'block'; }
  else { empty.style.display = 'none'; filtered.forEach(m => grid.appendChild(createCard(m))); }

  updateStats();
}

// ===== CREATE CARD =====
function createCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  const stars = Array.from({length: 5}, (_, i) => `<span class="${i < movie.rating ? '' : 'empty'}">★</span>`).join('');
  const icon = getGenreIcon(movie.genre);
  const color = getGenreColor(movie.genre);
  const posterContent = movie.poster_url
    ? `<img src="${movie.poster_url}" alt="${movie.title}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'" />`
    : `<div class="card-poster-bg">${icon}</div><span style="font-size:3rem;position:relative;z-index:1">${icon}</span>`;

  card.innerHTML = `
    <div class="card-poster" style="background:linear-gradient(135deg,${color}22,${color}11)">
      ${posterContent}
      <span class="card-watched-badge ${movie.watched ? 'badge-watched' : 'badge-unwatched'}">
        ${movie.watched ? '✅ Watched' : '📋 Watchlist'}
      </span>
    </div>
    <div class="card-body">
      <div class="card-title">${movie.title}</div>
      <div class="card-genre">${icon} ${movie.genre}</div>
      <div class="card-stars">${stars}</div>
      ${movie.notes ? `<div class="card-notes">"${movie.notes}"</div>` : ''}
      <div class="card-date">📅 ${movie.date}</div>
      <div class="card-actions">
        <button class="btn-watch" onclick="toggleWatch(${movie.id},${movie.watched})">
          ${movie.watched ? '📋 Watchlist' : '✅ Watched'}
        </button>
        <button class="btn-edit" onclick="openEdit(${movie.id})">✏️</button>
        <button class="btn-delete" onclick="deleteMovie(${movie.id})">🗑️</button>
      </div>
    </div>`;
  return card;
}

// ===== UPDATE STATS =====
function updateStats() {
  const total = movies.length;
  const watched = movies.filter(m => m.watched).length;
  const watchlist = total - watched;
  const avg = total > 0 ? (movies.reduce((s, m) => s + (m.rating || 0), 0) / total).toFixed(1) : '0';
  document.getElementById('totalCount').textContent = total;
  document.getElementById('watchedCount').textContent = watched;
  document.getElementById('unwatchedCount').textContent = watchlist;
  document.getElementById('ratingAvg').textContent = avg + '⭐';
  document.getElementById('watchedBadge').textContent = watched;
  document.getElementById('watchlistBadge').textContent = watchlist;
}

// ===== MODAL OPEN =====
function openModal() {
  editingId = null; currentRating = 0; movieStatus = 'watchlist';
  document.getElementById('modalTitle').textContent = 'Add Movie';
  document.getElementById('movieTitle').value = '';
  document.getElementById('movieGenre').value = 'Action';
  document.getElementById('movieNotes').value = '';
  setStatus('watchlist');
  updateStarUI(0);
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('movieTitle').focus();
}

// ===== STATUS TOGGLE =====
function setStatus(status) {
  movieStatus = status;
  document.getElementById('btn-watchlist').classList.toggle('active', status === 'watchlist');
  document.getElementById('btn-watched').classList.toggle('active', status === 'watched');
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
  setStatus(movie.watched ? 'watched' : 'watchlist');
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
  const watched = movieStatus === 'watched';

  if (!title) {
    document.getElementById('movieTitle').style.borderColor = '#ff5c5c';
    setTimeout(() => document.getElementById('movieTitle').style.borderColor = '', 1500);
    return;
  }

  showBanner('⏳ Saving...', 'loading');
  const posterUrl = await fetchMoviePoster(title);

  const movieData = {
    title, genre, notes, watched, rating: currentRating,
    user_id: currentUser.id, poster_url: posterUrl,
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  if (editingId) {
    const { error } = await _supabase.from('movies').update(movieData).eq('id', editingId);
    if (error) { showBanner('❌ Update failed!', 'error'); return; }
  } else {
    const { error } = await _supabase.from('movies').insert([movieData]);
    if (error) { showBanner('❌ Save failed!', 'error'); return; }
  }

  closeModal();
  showBanner('✅ Movie saved!', 'success');
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

// ===== WIKIPEDIA POSTER =====
async function fetchMoviePoster(title) {
  const currentYear = new Date().getFullYear();
  const queries = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    queries.push(`${title} (${y} film)`);
    queries.push(`${title} ${y} film`);
  }
  queries.push(`${title} film`, `${title} movie`, title);

  for (const query of queries) {
    try {
      const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`);
      const searchData = await searchRes.json();
      if (!searchData.query.search.length) continue;
      const pageTitle = searchData.query.search[0].title;
      if (!pageTitle.toLowerCase().includes('film') && !pageTitle.toLowerCase().includes('movie') && !pageTitle.toLowerCase().includes(title.toLowerCase())) continue;

      const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&format=json&pithumbsize=500&origin=*`);
      const imgData = await imgRes.json();
      const page = Object.values(imgData.query.pages)[0];
      if (page.thumbnail) return page.thumbnail.source;
      await new Promise(r => setTimeout(r, 300));
    } catch { continue; }
  }
  return null;
}

// ===== AUTO FETCH MISSING POSTERS =====
async function fetchMissingPosters() {
  const missing = movies.filter(m => !m.poster_url);
  if (!missing.length) return;
  for (const movie of missing) {
    const posterUrl = await fetchMoviePoster(movie.title);
    if (posterUrl) {
      await _supabase.from('movies').update({ poster_url: posterUrl }).eq('id', movie.id);
      movie.poster_url = posterUrl;
      renderMovies();
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

// ===== STAR RATING =====
function setRating(val) { currentRating = val; updateStarUI(val); }
function updateStarUI(val) {
  document.querySelectorAll('#starInput span').forEach((s, i) => s.classList.toggle('active', i < val));
}

// ===== KEYBOARD =====
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); document.getElementById('shareModal').classList.remove('active'); } });

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => checkAuth());
