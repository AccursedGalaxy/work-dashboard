# Work Dashboard

Simple static dashboard to quickly access daily links and pages, search Google, and jump to your `go/` intranet shortcuts.

## Features
- Quick links organized in sections (Daily, System Admin Pages, Other)
- Google search box
- `go/` intranet shortcut box (supports `go/`, `go/PAM`, `PAM`)
- Dark/Light theme toggle with local storage
- Optional cycling wallpapers, with separate light/dark sets

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
   - `backgrounds`:
     - `enable`: boolean to turn wallpaper cycler on/off
     - `cycleMs`: milliseconds between wallpaper changes
     - `transitionMs`: crossfade duration
     - `randomize`: shuffle order before cycling
     - `light`: array of image URLs for light theme
     - `dark`: array of image URLs for dark theme

### Wallpapers

Create folders like `wallpapers/light/` and `wallpapers/dark/` next to `index.html` and drop your images there. Then list them in your `config.js`:

```js
window.DASHBOARD_CONFIG = {
  backgrounds: {
    enable: true,
    cycleMs: 20000,
    transitionMs: 1200,
    randomize: true,
    light: [
      'wallpapers/light/01.jpg',
      'wallpapers/light/02.jpg'
    ],
    dark: [
      'wallpapers/dark/01.jpg',
      'wallpapers/dark/02.jpg'
    ]
  }
};
```

The active set switches automatically when you toggle between light/dark.

## Files
- `index.html` – structure and widgets
- `styles.css` – minimal styling (dark/light)
- `config.example.js` – defaults (do not edit)
- `config.js` – your private overrides (git-ignored)
- `app.js` – rendering and behavior

