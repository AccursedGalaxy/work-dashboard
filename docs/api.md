---
title: API & Integration Points
description: Public globals and form behaviors you can rely on.
last_updated: 2025-08-19
---

# API & Integration Points

## TL;DR (Plain English)
- No HTTP API; static app only
- Integrate via config and a couple of optional globals

## Step-by-step
1. Configure via `config.json`/`config.yaml`/`config.js`
2. Optionally call `window.__openQuickLauncher()` or `window.__closeQuickLauncher()`

## Technical Details
- Public globals:
  - `window.DASHBOARD_DEFAULT_CONFIG` (from `config/example.js`)
  - `window.__openQuickLauncher()` and `window.__closeQuickLauncher()` are created by `src/app.ts`
- Forms:
  - `#googleForm`: builds URL from `config.google` and opens in mini browser or new tab
  - `#goForm`: resolves `go/KEY` using `config.go` mapping; falls back per `fallbackSearchUrl`

## Common Pitfalls
- Relying on internal functions is unsupported; use config or edit `src/app.ts`

## Troubleshooting
| Symptom | Likely Cause | How to Fix |
| --- | --- | --- |
| Unable to call Quick Launcher | Global not yet initialized | Call after `load` or wrap in `setTimeout` |

## References
- `src/app.ts` lines 1201–1204 (globals), 735–815 (forms)