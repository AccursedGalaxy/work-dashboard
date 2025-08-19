---
title: Getting Started
description: 10-minute quickstart to build, run, and customize your dashboard locally.
last_updated: 2025-08-19
---

# Getting Started

## TL;DR (Plain English)
- Install Node.js and dependencies
- Build the app
- Start a local server at `http://127.0.0.1:8000`
- Add a minimal `config.json` to customize links

## Step-by-step
1. Clone and install

```bash
npm install
```

2. Build

```bash
npm run build
```

3. Run locally (localhost only)

```bash
npm run start
# Open http://127.0.0.1:8000
```

4. Create `config.json` (next to `index.html`)

```json
{
  "sections": [{
    "title": "Daily",
    "links": [
      { "label": "Tickets", "url": "https://tickets.example.com", "icon": "🎫" }
    ]
  }]
}
```

## Technical Details
- Scripts: `build` → tsc compile to `dist/`, postbuild copies `dist/app.js` and `dist/sw.js` to repo root.
- Serve: `http-server -c-1 -p 8000 -a 127.0.0.1 .` (no cache; local-only binding)
- Config sources (merge order): defaults → `config.example.js` → `config.json`/`config.yaml`/`config.yml` → `config.js`

## Common Pitfalls
- Missing build outputs → Run `npm run build` before `start`
- `config.json` not taking effect → Ensure it’s in project root; clear site data if SW cached

## Troubleshooting
| Symptom | Likely Cause | How to Fix |
| --- | --- | --- |
| 404 for `app.js` | Build not run | `npm run build` |
| `config.json` ignored | Wrong location or cached | Place at repo root; hard reload/clear SW cache |

## References
- `package.json` scripts (lines 5–13)
- Config loader: `config-loader.js` lines 246–276
- App startup defaults: `src/app.ts` lines 425–507 