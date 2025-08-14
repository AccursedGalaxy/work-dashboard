# JavaScript API

The app intentionally avoids a large global surface. The primary integration point is configuration via `window.DASHBOARD_CONFIG`. Two helper functions are exposed for the Quick Launcher.

## Global configuration objects

- `window.DASHBOARD_DEFAULT_CONFIG` (optional): project-provided defaults from `config.example.js`
- `window.DASHBOARD_CONFIG` (optional): your overrides from `config.js`

These are read once at startup and deep-merged with the built-in defaults in code.

Example:

```js
// config.js
window.DASHBOARD_CONFIG = {
  theme: 'auto',
  keybinds: { quickLauncherOpen: 'k' },
  sections: [{ title: 'My Links', links: [{ label: 'Docs', url: 'https://wiki.example.com', icon: '📚' }] }]
};
```

## Quick Launcher helpers

- `window.__openQuickLauncher(): void`
- `window.__closeQuickLauncher(): void`

Usage:

```js
// Open programmatically
window.__openQuickLauncher?.();

// Close programmatically
window.__closeQuickLauncher?.();
```

## Other functions

All other functions (theme handling, background cycling, forms, etc.) are scoped inside the app and not exported globally. To customize behavior, use configuration options, edit `src/app.ts`, or open a PR.