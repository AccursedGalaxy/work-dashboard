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

## Configuration Table

| Key | Type | Default | Required | Description | Where used |
|---|---|---|---|---|---|
| theme | 'auto'|'light'|'dark' | 'auto' | no | Initial theme preference; 'auto' follows system | `src/app.ts` lines 430–437, 557–574 |
| google.baseUrl | string | https://www.google.com/search | no | Google search base URL | `src/app.ts` lines 431, 742–750 |
| google.queryParam | string | q | no | Query parameter name | `src/app.ts` lines 431, 742–750 |
| google.extraParams | object | {} | no | Extra query params appended to URL | `src/app.ts` lines 744–750 |
| miniBrowser.enable | boolean | false | no | Hide/show mini browser UI and behavior | `src/app.ts` lines 432, 835–846 |
| miniBrowser.defaultUrl | string | https://www.google.com/webhp?igu=1 | no | Initial URL for mini browser | `src/app.ts` lines 432, 852–856 |
| analytics.enableLocal | boolean | false | no | Local-only counts in `localStorage` to boost ranking | `src/app.ts` lines 433, 1403–1414 |
| keybinds.quickLauncherOpen | string | Mod+K | no | Open Quick Launcher | `src/app.ts` lines 435, 1230–1269 |
| keybinds.toggleTheme | string | t | no | Toggle theme | `src/app.ts` lines 436, 1264–1269 |
| keybinds.focusGoogle | string | / | no | Focus Google input | `src/app.ts` lines 437, 1253–1257 |
| keybinds.focusGo | string | g | no | Focus go/ input | `src/app.ts` lines 438, 1259–1263 |
| keybinds.quickLauncherClose | string | Escape | no | Close Quick Launcher | `src/app.ts` lines 439, 1235–1241 |
| keybinds.quickLauncherNext | string | ArrowDown | no | Next result | `src/app.ts` lines 440, 1115–1121 |
| keybinds.quickLauncherPrev | string | ArrowUp | no | Previous result | `src/app.ts` lines 441, 1116–1121 |
| keybinds.quickLauncherOpenInTab | string | Enter | no | Open selection or run command | `src/app.ts` lines 442, 1118–1149 |
| go.homepageUrl | string | https://go/ | no | Destination for `go/` | `src/app.ts` lines 445, 794–799 |
| go.fallbackSearchUrl | string | '' | no | Fallback search prefix when key not found | `src/app.ts` lines 446, 820–822 |
| go.keyToUrl | object | { PAM: 'https://go/pam' } | no | Case-insensitive mapping of go keys | `src/app.ts` lines 447–450, 825–829 |
| backgrounds.enable | boolean | true | no | Enable background cycler | `src/app.ts` lines 451–458, 582–690 |
| backgrounds.cycleMs | number | 15000 | no | Interval between images (ms) | `src/app.ts` lines 452–454, 632–637 |
| backgrounds.transitionMs | number | 1200 | no | Crossfade duration (ms) | `src/app.ts` lines 454–455, 664–674 |
| backgrounds.randomize | boolean | true | no | Shuffle background order | `src/app.ts` lines 455–456, 648–684 |
| backgrounds.light | string[] | [] | no | Light theme images | `src/app.ts` lines 456–457, 592–599 |
| backgrounds.dark | string[] | [] | no | Dark theme images | `src/app.ts` lines 457–458, 592–599 |
| sections | array | sample | no | Cards and links shown on the page | `src/app.ts` lines 459–480, 692–733 |
| commandDsl.templates | object | multiple | no | Command-to-URL patterns | `src/app.ts` lines 482–497, 114–132 |
| commandDsl.macros | object | { 'pkg {pkg}': [...] } | no | Patterns expanding to multiple templates | `src/app.ts` lines 498–500, 134–151 |
| commandDsl.defaults.defaultRepo | string | '' | no | Default repo for `pr NUM` shorthand | `src/app.ts` lines 501–505, 106–112 |
| commandDsl.defaults.defaultTrackerPrefix | string | '' | no | Reserved for tracker IDs | `src/app.ts` lines 501–505 |
| commandDsl.defaults.trackerUrl | string | '' | no | Reserved for tracker links | `src/app.ts` lines 501–505 |
| ui.goTitle | string | (from HTML) | no | Override card title for go/ section | `src/app.ts` lines 903–915 |

## Type shape

```ts
// Pseudo-types for documentation
export type Theme = 'auto' | 'light' | 'dark';

export interface DashboardConfig {
  theme?: Theme;
  google?: { baseUrl?: string; queryParam?: string; extraParams?: Record<string, string | number | boolean> };
  miniBrowser?: { enable?: boolean; defaultUrl?: string };
  analytics?: { enableLocal?: boolean };
  keybinds?: {
    quickLauncherOpen?: string;
    toggleTheme?: string;
    focusGoogle?: string;
    focusGo?: string;
    quickLauncherClose?: string;
    quickLauncherNext?: string;
    quickLauncherPrev?: string;
    quickLauncherOpenInTab?: string;
  };
  go?: { homepageUrl?: string; fallbackSearchUrl?: string; keyToUrl?: Record<string, string> };
  backgrounds?: { enable?: boolean; cycleMs?: number; transitionMs?: number; randomize?: boolean; light?: string[]; dark?: string[] };
  sections?: Array<{ title: string; links: Array<{ label: string; url: string; icon?: string }> }>;
  commandDsl?: { templates?: Record<string, string>; macros?: Record<string, string[]>; defaults?: { defaultRepo?: string; defaultTrackerPrefix?: string; trackerUrl?: string } };
  ui?: { goTitle?: string };
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
  sections: [ /* sample cards and links shown in the app */ ],
  commandDsl: {
    templates: {
      'gh {owner}/{repo} i {num}': 'https://github.com/{owner}/{repo}/issues/{num}',
      'gh {owner}/{repo} pr {num}': 'https://github.com/{owner}/{repo}/pull/{num}',
      'gh code {q}': 'https://github.com/search?q={urlencode(q)}&type=code',
      'gh {owner}/{repo}': 'https://github.com/{owner}/{repo}',
      'mdn {q}': 'https://developer.mozilla.org/en-US/search?q={urlencode(q)}',
      'so {q}': 'https://stackoverflow.com/search?q={urlencode(q)}',
      'yt {q}': 'https://www.youtube.com/results?search_query={urlencode(q)}',
      'aur {q}': 'https://aur.archlinux.org/packages?K={urlencode(q)}',
      'wiki {q}': 'https://en.wikipedia.org/w/index.php?search={urlencode(q)}',
      'r/{sub}': 'https://www.reddit.com/r/{sub}/',
      'npm {pkg}': 'https://www.npmjs.com/package/{pkg}',
      'unpkg {pkg}': 'https://unpkg.com/browse/{pkg}/',
      'bp {pkg}': 'https://bundlephobia.com/package/{pkg}',
      'go {key}': ''
    },
    macros: { 'pkg {pkg}': ['npm {pkg}', 'unpkg {pkg}', 'bp {pkg}'] },
    defaults: { defaultRepo: '', defaultTrackerPrefix: '', trackerUrl: '' }
  },
  ui: {}
}
```

Note: [`config.example.js`](../config.example.js) provides a documented baseline you can copy into `config.js`. The repository does not include `config.js`; create it by copying the example. Unspecified fields fall back to the built-in values above.

## Examples
- See `docs/examples.md` for ready-to-copy snippets
