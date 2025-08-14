# Components guide

This project is a single-page app that binds behavior to elements in `index.html`. Below are the main components and how to customize them.

## Sections grid

- Container: `#linksGrid`
- Populated from `config.sections`
- Each section renders a card with a header and links

Usage: change `config.sections` in your `config.json`/`config.yaml` (or `config.js`).

## Quick Launcher

- Overlay: `#quick-launcher`
- Input: `#ql-input`
- Results list: `#ql-list`
- Opens with the keyboard shortcut in `keybinds.quickLauncherOpen` (default `Mod+K`)
- Closes with `keybinds.quickLauncherClose` (default `Escape`) or overlay click
- Results include cards/links and dynamic `go/` search suggestion when configured

Programmatic control:

```js
window.__openQuickLauncher?.();
window.__closeQuickLauncher?.();
```

## Mini Browser

- Container: `#mini-browser`
- URL input: `#mb-url`
- Target select: `#mb-target` with values `embed` or `tab`
- Iframe: `#mb-frame`
- Resize handle: `#mb-resize-tl` (drag top-left corner)
- Hidden automatically when `miniBrowser.enable === false`

Tip: Set an initial page with `miniBrowser.defaultUrl`.

## Theme toggle

- Button: `#themeToggle`
- Click toggles between light/dark; preference is persisted in `localStorage['theme']`
- Initial theme is resolved from `config.theme` and system preference when `'auto'`

## Background cycler

- Auto-created container: `#bg`
- Two layers: `.bg-layer` elements crossfade between images
- Overlay: `.bg-overlay` for optional shading
- Controlled by `config.backgrounds`
- CSS variable: `--bg-transition-ms` sets transition duration
- Respects `prefers-reduced-motion: reduce` (disables auto-cycling)

## Google search form

- Form: `#googleForm`
- Input: `#googleQuery`
- Behavior controlled by `config.google`
- Submitting opens search in the mini browser (when enabled) or a new tab based on `#mb-target`

## go/ intranet form

- Form: `#goForm`
- Input: `#goQuery`
- Behavior controlled by `config.go`
- Accepts `go/`, `go/KEY`, `go KEY`, or `KEY`

## Keyboard Shortcuts widget

- FAB: `#kb-fab`
- Overlay: `#kb-overlay`
- Close button: `#kb-close`
- List container: `#kb-list`
- The list is generated from the current `config.keybinds`

## PWA install button

- Button: `#pwa-install`
- Appears when the browser fires `beforeinstallprompt`
- Hidden after the choice is made