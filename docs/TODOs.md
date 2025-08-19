---
title: TODOs
description: Open questions and next steps with file references.
last_updated: 2025-08-19
---

# TODOs

- Add automated tests or lint checks
  - Files: `src/app.ts`, `package.json`
- Consider extracting configuration types into a shared `.d.ts` for external typing
  - Files: `src/global.d.ts`
- Tighten CSP by removing `'unsafe-inline'` styles if feasible
  - Files: `index.html` line 6, `styles.css`
- Document any additional UI overrides under `config.ui` as they grow
  - Files: `src/app.ts` lines 903–915 