# Work Dashboard Documentation

The Work Dashboard is a minimal, fast, personal start page. This documentation covers all public integration points: configuration options, UI components, global APIs, keyboard shortcuts, and the service worker.

- See the project overview in `README.md` at the repository root
- Default configuration reference lives in `config.example.js`

## Contents

- [Configuration reference](./configuration.md)
- [Components guide](./components.md)
- [JavaScript API](./js-api.md)
- [Service worker](./service-worker.md)
- [Keyboard shortcuts](./keyboard-shortcuts.md)
- [Local analytics](./analytics.md)
- [Examples](./examples.md)

## Quick start

Create a `config.js` next to `index.html` with only the overrides you need:

```js
// config.js (git-ignored)
window.DASHBOARD_CONFIG = {
  theme: 'auto',
  keybinds: { quickLauncherOpen: 'Mod+K' },
  miniBrowser: { enable: false },
  backgrounds: {
    light: ['wallpapers/light/1.jpg'],
    dark: ['wallpapers/dark/1.jpg']
  },
  sections: [
    {
      title: 'Daily',
      links: [
        { label: 'Tickets', url: 'https://tickets.example.com', icon: '🎫' },
        { label: 'Mail', url: 'https://outlook.office.com/mail', icon: '📧' }
      ]
    }
  ]
};
```

Serve the folder (recommended) and open `http://localhost:8000`:

```bash
python3 -m http.server 8000
```