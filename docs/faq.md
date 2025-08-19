---
title: FAQ
description: Answers to common questions about configuration, serving, and privacy.
last_updated: 2025-08-19
---

# FAQ

## TL;DR (Plain English)
- Configure with files in the project root
- Local server recommended

## Q&A
- Q: Do I need a server?
  - A: You can open `index.html` directly, but a local server avoids CSP and cache quirks. Use `npm run start`.
- Q: Where do I put private company links?
  - A: In `config.js` (git-ignored).
- Q: Is any data sent to external analytics?
  - A: No. Optional analytics are local-only via `localStorage`.
- Q: How do I change the port?
  - A: Edit the `start` script in `package.json` (flag `-p`).

## References
- `README.md` (root), `docs/configuration.md`, `.gitignore` 