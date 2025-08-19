---
title: CLI
description: Commands for building, watching, and serving the app locally.
last_updated: 2025-08-19
---

# CLI

## TL;DR (Plain English)
- Use npm scripts

## Commands
- `npm run build`
  - Compiles TS to `dist/` and copies `app.js`/`sw.js` to repo root
- `npm run watch`
  - TypeScript watch mode
- `npm run start`
  - Serve current directory at `http://127.0.0.1:8000` with no cache

## Examples
```bash
npm run build
npm run start
```

## Exit codes
- `build`: non-zero if required outputs missing (see `scripts/postbuild.js`)

## References
- `package.json` lines 5–13
- `scripts/postbuild.js` 