---
title: Running the App
description: Commands to build, run, and watch with notes on ports, caching, and PWA.
last_updated: 2025-08-19
---

# Running the App

## TL;DR (Plain English)
- Build first, then start the local server
- Visit `http://127.0.0.1:8000`
- Service worker may cache the app shell; use hard reload when iterating

## Step-by-step
1. Build

```bash
npm run build
```

2. Start (no cache; localhost-only)

```bash
npm run start
# http://127.0.0.1:8000
```

3. Optional: watch TypeScript

```bash
npm run watch
```

## Technical Details
- `build`: `tsc && node scripts/postbuild.js` → copies `dist/app.js` and `dist/sw.js` to repo root
- `start`: `http-server -c-1 -p 8000 -a 127.0.0.1 .`
- PWA: `src/app.ts` registers `sw.js` on window `load`

## Common Pitfalls
- Port 8000 in use → change `-p` in `package.json` start script
- SW caching surprises → hard reload; clear site data; bump SW `CACHE` version

## Troubleshooting
| Symptom | Likely Cause | How to Fix |
| --- | --- | --- |
| SW not updating | Cache still active | Clear site data; increment `CACHE` in `src/sw.ts`/`sw.js` |
| 403/404 for assets | Wrong working dir | Start server at project root |

## References
- Scripts: `package.json` lines 5–13
- Postbuild: `scripts/postbuild.js`
- SW: `src/sw.ts`, `sw.js` 