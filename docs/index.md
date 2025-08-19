---
title: Work Dashboard — Docs Home
description: Overview, quickstart, and links to configuration, running, architecture, CLI, data, troubleshooting, and more.
last_updated: 2025-08-19
---

# Work Dashboard

## TL;DR (Plain English)
- Minimal personal start page (static site)
- Configure via `config.json` / `config.yaml` / `config.js`
- Build with TypeScript, serve locally on port 8000
- Optional mini browser, command palette, go/ shortcuts, wallpapers, and PWA
- No backend; data stays in the browser (localStorage + SW cache)

## Step-by-step
1. Install Node and dependencies
2. Build: `npm run build`
3. Start local server: `npm run start` → open `http://127.0.0.1:8000`
4. Create `config.json` (or `config.yaml` / `config.js`) next to `index.html`
5. Customize sections, keybinds, go/ shortcuts, wallpapers

## Technical Details
- Scripts: `build` (tsc → `dist/` → postbuild copies to root), `watch`, `start` (`http-server -p 8000 -a 127.0.0.1`)
- Config resolution order: built-in defaults → `DASHBOARD_DEFAULT_CONFIG` → file config → `DASHBOARD_CONFIG`
- Local storage: `theme`, `analytics:counts`, `command-patterns`
- Service worker caches app shell and same-origin assets; config files always bypass cache

## Common Pitfalls
- Changes to `config.*` not showing → Clear site data or hard reload; SW may cache app shell
- Port 8000 in use → Change port in `package.json` `start` script
- Mini browser disabled but still visible → Ensure `miniBrowser.enable` is `false`

## Troubleshooting
| Symptom | Likely Cause | How to Fix |
| --- | --- | --- |
| Config changes not applied | Cached app shell | Clear site data or bump SW cache; hard reload |
| 8000 already in use | Another process bound | Edit `package.json` start port or kill process |
| CSP errors on external content | Strict CSP in `index.html` | Open in new tab; adjust CSP if self-hosting |

## References
- Source files: `src/app.ts`, `src/sw.ts`, `config-loader.js`, `package.json`
- See:
  - [Getting Started](./getting-started.md), [Installation](./installation.md)
  - [Configuration](./configuration.md), [Running the App](./running-the-app.md)
  - [Architecture](./architecture.md), [API](./api.md), [CLI](./cli.md)
  - [Data & Storage](./data-and-storage.md), [Service Worker](./service-worker.md)
  - [Components](./components.md), [Keyboard Shortcuts](./keyboard-shortcuts.md)
  - [Local Analytics](./analytics.md), [Examples](./examples.md)
  - [Testing](./testing.md), [Troubleshooting](./troubleshooting.md), [FAQ](./faq.md)
  - [Release Notes](./release-notes.md), [TODOs](./TODOs.md) 