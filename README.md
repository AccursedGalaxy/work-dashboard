# Work Dashboard

Simple static dashboard to quickly access daily links and pages, search Google, and jump to your `go/` intranet shortcuts.

## Features
- Quick links organized in sections (Daily, System Admin Pages, Other)
- Google search box
- `go/` intranet shortcut box (supports `go/`, `go/PAM`, `PAM`)
- Dark/Light theme toggle with local storage

## Setup
1. Open this folder in a browser directly or via a local server.
   - Easiest: open `index.html` in your browser
   - Or serve the folder: `python3 -m http.server 8000` and visit `http://localhost:8000`
2. Copy the example config and customize your links:
   - Copy `config.example.js` to `config.js`
   - Edit `config.js` to add your links and intranet mappings
   - `config.js` is ignored by git by default

## Customize
- Edit `config.js` to change:
  - `sections`: add or remove categories and links
  - `go.homepageUrl`: where `go/` should take you
  - `go.keyToUrl`: map keys like `PAM` to full URLs
  - `go.fallbackSearchUrl`: optional prefix for unknown keys (e.g. `https://go/search?q=`)
  - `theme`: `'dark' | 'light' | 'auto'`

## Files
- `index.html` – structure and widgets
- `styles.css` – minimal styling (dark/light)
- `config.example.js` – defaults (do not edit)
- `config.js` – your private overrides (git-ignored)
- `app.js` – rendering and behavior

