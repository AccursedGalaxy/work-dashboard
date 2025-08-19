---
title: Testing
description: Current testing status and manual verification steps.
last_updated: 2025-08-19
---

# Testing

## TL;DR (Plain English)
- No automated tests
- Validate manually by running locally and exercising features

## Step-by-step
1. Build and start the app
2. Verify: theme toggle, Quick Launcher open/close and search, Google and go/ forms, mini browser behavior
3. If `analytics.enableLocal` is true, confirm local ranking adjusts with usage

## Technical Details
- TypeScript compile via `tsc` ensures basic type safety

## Common Pitfalls
- SW cache hiding fresh changes → clear site data

## Troubleshooting
| Symptom | Likely Cause | How to Fix |
| --- | --- | --- |
| Feature not updating | Cached app shell | Hard reload / clear caches |

## References
- Scripts: `package.json` 