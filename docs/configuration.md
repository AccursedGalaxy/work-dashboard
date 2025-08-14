# Configuration reference

Configuration is resolved from these sources and merged in order (later overrides earlier):

1. Built-in defaults (in code)
2. `window.DASHBOARD_DEFAULT_CONFIG` (from `config.example.js`)
3. File-based config: `config.json` or `config.yaml`/`config.yml` (optional)
4. `window.DASHBOARD_CONFIG` (from your `config.js`, optional)

Later sources override earlier ones. Merge strategy:

- Objects are merged recursively
- Arrays are replaced (not concatenated)
- Primitive values are overwritten by the last source
- null in a later source replaces earlier object/array values; omit the field (or use undefined) to inherit from earlier sources

Only specify the fields you need to change in `config.json` or `config.yaml`/`config.yml` (or `config.js`).

## Type shape

```ts
// Pseudo-types for documentation
export type Theme = 'auto' | 'light' | 'dark';

export interface DashboardConfig {
  theme?: Theme;
  google?: {
    baseUrl?: string;          // default https://www.google.com/search
    queryParam?: string;       // default 'q'
    extraParams?: Record<string, string | number | boolean>; // optional extra query params — values are stringified via String(value) and added with URLSearchParams.set; booleans become "true"/"false", numbers are stringified, null/undefined are ignored, arrays are not supported (pre-join or customize to append), and repeated keys are replaced (not appended)
  };
  miniBrowser?: {
    enable?: boolean;          // default false (UI hidden when false)
    defaultUrl?: string;       // default https://www.google.com/webhp?igu=1
  };
  analytics?: {
    enableLocal?: boolean;     // default false (localStorage-only popularity data)
  };
  keybinds?: {
    quickLauncherOpen?: string;       // default 'Mod+K'
    toggleTheme?: string;             // default 't'
    focusGoogle?: string;             // default '/'
    focusGo?: string;                 // default 'g'
    quickLauncherClose?: string;      // default 'Escape'
    quickLauncherNext?: string;       // default 'ArrowDown'
    quickLauncherPrev?: string;       // default 'ArrowUp'
    quickLauncherOpenInTab?: string;  // default 'Enter'
  };
  go?: {
    homepageUrl?: string;             // default 'https://go/'
    fallbackSearchUrl?: string;       // default '' (disabled)
    keyToUrl?: Record<string, string>;// case-insensitive keys (e.g., { PAM: 'https://go/pam' })
  };
  backgrounds?: {
    enable?: boolean;                 // default true
    cycleMs?: number;                 // default 15000
    transitionMs?: number;            // default 1200
    randomize?: boolean;              // default true
    light?: string[];                 // default []
    dark?: string[];                  // default []
  };
  sections?: Array<{
    title: string;
    links: Array<{
      label: string;
      url: string;
      icon?: string; // emoji or text
    }>;
  }>;
}
```

## Defaults (from code)

```js
{
  theme: 'auto',
  google: { baseUrl: 'https://www.google.com/search', queryParam: 'q' },
  miniBrowser: { enable: false, defaultUrl: 'https://www.google.com/webhp?igu=1' },
  analytics: { enableLocal: false },
  keybinds: {
    quickLauncherOpen: 'Mod+K',
    toggleTheme: 't',
    focusGoogle: '/',
    focusGo: 'g',
    quickLauncherClose: 'Escape',
    quickLauncherNext: 'ArrowDown',
    quickLauncherPrev: 'ArrowUp',
    quickLauncherOpenInTab: 'Enter'
  },
  go: {
    homepageUrl: 'https://go/',
    fallbackSearchUrl: '',
    keyToUrl: { PAM: 'https://go/pam' }
  },
  backgrounds: {
    enable: true,
    cycleMs: 15000,
    transitionMs: 1200,
    randomize: true,
    light: [],
    dark: []
  },
  sections: [ /* sample cards and links shown in the app */ ]
}
```

Note: [`config.example.js`](../config.example.js) provides a documented baseline you can copy into `config.js`. The repository does not include `config.js`; create it by copying the example. Unspecified fields fall back to the built-in values above.

## Keybinds syntax

Key strings are parsed with support for modifiers:
- Tokens: `Mod` (Ctrl on Windows/Linux, Cmd on macOS), `Ctrl`/`Control`, `Cmd`/`Meta`, `Shift`, `Alt`/`Option`
- Non-modifier key names: `'Enter'`, `'Escape'`, `'ArrowDown'`, `'ArrowUp'`, letters and digits
- Single-character keys are normalized to lowercase

Examples:
- `'Mod+K'`
- `'/'`
- `'Shift+Alt+P'`

## Backgrounds

- Provide image URLs or paths relative to the site root
- When `enable` is true, the app creates a `#bg` container and crossfades between images
- Honors `prefers-reduced-motion: reduce` by disabling auto-cycling
- CSS variable `--bg-transition-ms` controls the crossfade duration

```js
window.DASHBOARD_CONFIG = {
  backgrounds: {
    enable: true,
    cycleMs: 20000,
    transitionMs: 800,
    light: ['wallpapers/light/1.jpg', 'wallpapers/light/2.jpg'],
    dark: ['wallpapers/dark/1.jpg', 'wallpapers/dark/2.jpg']
  }
};
```

## Google search

```js
window.DASHBOARD_CONFIG = {
  google: {
    baseUrl: 'https://www.google.com/search',
    queryParam: 'q',
    // Optional: append extra params
    extraParams: { igu: 1 }
  }
};
```

## go/ launcher

- `homepageUrl`: opened for `go/` or `go`
- `fallbackSearchUrl`: when a key is not found, open this URL + encoded query
- `keyToUrl`: case-insensitive mapping of keys to URLs

```js
window.DASHBOARD_CONFIG = {
  go: {
    homepageUrl: 'https://go/',
    fallbackSearchUrl: 'https://go/',
    keyToUrl: {
      PAM: 'https://go/pam',
      HR: 'https://go/hr'
    }
  }
};
```

## Sections (cards and links)

```js
window.DASHBOARD_CONFIG = {
  sections: [
    {
      title: 'Daily',
      links: [
        { label: 'Tickets', url: 'https://tickets.example.com', icon: '🎫' },
        { label: 'Mail', url: 'https://outlook.office.com/mail', icon: '📧' }
      ]
    },
    {
      title: 'Engineering',
      links: [
        { label: 'Docs', url: 'https://wiki.example.com', icon: '📚' }
      ]
    }
  ]
};
```

## Mini browser

- When `miniBrowser.enable` is `false`, the mini browser UI is hidden and embedding is disabled
- When enabled, the URL bar uses Enter to open in either the embedded iframe or a new tab depending on the target selector

```js
window.DASHBOARD_CONFIG = {
  miniBrowser: {
    enable: true,
    defaultUrl: 'https://example.com'
  }
};
```

## Analytics (local only)

- Enable by setting `analytics.enableLocal = true`
- Popular items in the Quick Launcher get a small score boost
- Stored under `localStorage['analytics:counts']` as a JSON map
- Keys used: `link:LABEL`, `go:KEY`, `go-search:QUERY`, `search:google`

```js
window.DASHBOARD_CONFIG = { analytics: { enableLocal: true } };
```
