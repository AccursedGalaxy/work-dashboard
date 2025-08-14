const CACHE = 'work-dashboard-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/config.example.js',
  '/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  // Cache-first for same-origin static assets and wallpapers
  if (url.origin === location.origin) {
    const pathname = url.pathname || '';
    // Always bypass cache for dynamic personal config
    if (pathname.endsWith('/config.js')) {
      event.respondWith(fetch(req).catch(() => caches.match(req)));
      return;
    }
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        // Respect no-store from server
        const cc = res.headers.get('Cache-Control') || '';
        if (!/no-store/i.test(cc)) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }
  // Network-first for cross-origin, fallback to cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});


