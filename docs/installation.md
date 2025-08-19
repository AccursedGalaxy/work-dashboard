---
title: Installation
description: Prerequisites and installation steps for Linux/macOS/Windows.
last_updated: 2025-08-19
---

# Installation

## TL;DR (Plain English)
- Requires Node.js and npm
- Install deps with `npm install`
- No database or backend required

## Step-by-step
1. Install Node.js (use your system package manager or from nodejs.org)
2. In the project directory, run `npm install`
3. Build with `npm run build`

## Technical Details
- Dependencies: TypeScript and `http-server` (dev-only)
- No `engines` field; typical active LTS Node.js works

## Common Pitfalls
- Corporate proxy/firewall blocking npm registry → Configure npm proxy

## Troubleshooting
| Symptom | Likely Cause | How to Fix |
| --- | --- | --- |
| `node: command not found` | Node not installed | Install Node.js |
| `npm ERR! network` | Proxy/Firewall | Set `npm config set proxy`/`https-proxy` |

## References
- `package.json` lines 5–13
- Dev deps: `package.json` lines 10–13 