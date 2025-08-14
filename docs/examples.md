# Examples

Practical snippets you can copy into `config.js`.

## 1) Minimal setup

```js
window.DASHBOARD_CONFIG = {
  sections: [
    { title: 'Daily', links: [
      { label: 'Tickets', url: 'https://tickets.example.com', icon: '🎫' }
    ]}
  ]
};
```

## 2) Enable mini browser with a default page

```js
window.DASHBOARD_CONFIG = {
  miniBrowser: { enable: true, defaultUrl: 'https://example.com' }
};
```

## 3) Configure go/ shortcuts with fallback search

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

## 4) Custom keybinds

```js
window.DASHBOARD_CONFIG = {
  keybinds: {
    quickLauncherOpen: 'Ctrl+Space',
    toggleTheme: 'Shift+T'
  }
};
```

## 5) Background wallpapers

```js
window.DASHBOARD_CONFIG = {
  backgrounds: {
    enable: true,
    cycleMs: 20000,
    transitionMs: 800,
    randomize: true,
    light: [
      'wallpapers/light/sunrise.jpg',
      'wallpapers/light/mountains.jpg'
    ],
    dark: [
      'wallpapers/dark/stars.jpg',
      'wallpapers/dark/city_night.jpg'
    ]
  }
};
```

## 6) Privacy-friendly local analytics

```js
window.DASHBOARD_CONFIG = {
  analytics: { enableLocal: true }
};
```