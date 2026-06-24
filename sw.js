const CACHE_NAME = 'cinetrack-v3';
const ASSETS = [
  '/movie-watchlist/',
  '/movie-watchlist/index.html',
  '/movie-watchlist/style.css',
  '/movie-watchlist/script.js',
  '/movie-watchlist/manifest.json'
];

// Install — cache files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Activate — old cache clear
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Fetch — cache first, then network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
