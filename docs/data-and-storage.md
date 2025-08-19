---
title: Data & Storage
description: Local-only data, storage locations, and how to reset.
last_updated: 2025-08-19
---

# Data & Storage

## TL;DR (Plain English)
- No backend or database
- Local-only data in `localStorage` and browser caches
- Config files in project root

## Step-by-step
1. Put `config.json` / `config.yaml` / `config.yml` / `config.js` in the project root
2. To reset, clear site data in the browser

## Technical Details
- localStorage keys:
  - `theme`
  - `analytics:counts` (when `analytics.enableLocal` is true)
  - `command-patterns` (learned command suggestions)
- Service Worker cache name: `work-dashboard-v2`
- Files loaded at runtime: `config.json`, `config.yaml`, `config.yml`, `config.js` (fetched with no-store semantics)

## Common Pitfalls
- Editing config while SW serves cached files → clear site data

## Troubleshooting
| Symptom | Likely Cause | How to Fix |
| --- | --- | --- |
| Old UI still shown | Cached app shell | Hard reload; clear caches |
| Learned commands noisy | `command-patterns` grew | `localStorage.removeItem('command-patterns')` |

## References
- `src/app.ts` lines 1403–1414 (analytics), 221–260 (learning), 316–379 (suggestions)
- `src/sw.ts` for cache behavior 