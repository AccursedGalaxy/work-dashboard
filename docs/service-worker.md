# Service worker

The service worker (`sw.js`, built from `src/sw.ts`) provides offline caching for the app shell and same-origin assets.

## Cache details

- Cache name: `work-dashboard-v2` (constant `CACHE`)
- App shell cached on install (`APP_SHELL`):
  - `/`
  - `/index.html`
  - `/styles.css`
  - `/app.js`
  - `/config/example.js`
  - `/config-loader.js`
  - `/manifest.webmanifest`

## Lifecycle

- `install`: opens cache and adds app shell, then calls `skipWaiting()`
- `activate`: removes old caches (anything not named `CACHE`) and calls `clients.claim()`
- `fetch`:
  - Same-origin: cache-first for static assets and wallpapers; always fetch with `cache: 'reload'` for `/config.js`, `/config.json`, `/config.yaml`, `/config.yml`
  - Cross-origin: network-first with cache fallback

## Forcing updates

- Bump the `CACHE` version string (e.g., `work-dashboard-v3`) and deploy
- Clients will fetch fresh assets on the next visit

## Disabling PWA / SW

- Remove the `<link rel="manifest">` tag from `index.html`
- Prevent registration by removing the `registerServiceWorker()` call in `src/app.ts` (or in the built `app.js`)
- Optionally delete `sw.js`

## Development tips

- When testing, you may need to clear application storage (cache + service workers) in your browser devtools to ensure changes are picked up