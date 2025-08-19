---
title: Troubleshooting
description: Common issues and fixes when running locally.
last_updated: 2025-08-19
---

# Troubleshooting

## TL;DR (Plain English)
- Most issues are caching or port conflicts

## Step-by-step
1. Hard reload the page
2. Clear site data (application storage) if service worker is active
3. Check the terminal for port conflicts

## Technical Details
- SW name `work-dashboard-v2` caches app shell
- Config files bypass cache via `cache: 'reload'` fetch

## Common Pitfalls
- Editing `config.json` without a server → opening file URLs can break fetch paths; run `npm run start`

## Troubleshooting
| Symptom | Likely Cause | How to Fix |
| --- | --- | --- |
| Config changes not applied | Cached app shell | Clear site data; bump SW cache; hard reload |
| 8000 in use | Another process bound | Change `-p` in `package.json` or kill the process |
| Iframe shows blank | Target site disallows framing | Switch target to New Tab |
| Keyboard shortcuts not working | Focus trapped in input | Press Escape or click outside; open Quick Launcher with its keybind |

## References
- `sw.js` cache and fetch logic; `src/sw.ts`
- `index.html` CSP meta tag 