const sw = self as unknown as ServiceWorkerGlobalScope & typeof globalThis & { skipWaiting: () => void };
const CACHE = 'work-dashboard-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/config/example.js',
  '/config-loader.js',
  '/manifest.webmanifest'
];

sw.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => sw.skipWaiting())
  );
});

sw.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => sw.clients.claim())
  );
});

sw.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
    // Cache-first for same-origin static assets and wallpapers
  if (url.origin === sw.location.origin) {
    const pathname = url.pathname || '';
    // Always bypass cache for dynamic personal config (force network reload)
    if (pathname.endsWith('/config.js') || pathname.endsWith('/config.json') || pathname.endsWith('/config.yaml') || pathname.endsWith('/config.yml')) {
      event.respondWith(fetch(new Request(req, { cache: 'reload' })).catch(() => caches.match(req)));
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


