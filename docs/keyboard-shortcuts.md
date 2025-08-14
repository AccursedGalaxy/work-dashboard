# Keyboard shortcuts

Shortcuts are configurable via `config.keybinds`. The app uses a flexible parser that supports modifier tokens (`Mod`, `Ctrl`, `Cmd`, `Shift`, `Alt`/`Option`) and key names (letters, digits, `Enter`, `Escape`, `ArrowDown`, etc.).

## Defaults

```txt
Open Quick Launcher      Mod+K
Close Quick Launcher     Escape
Next result              ArrowDown
Previous result          ArrowUp
Open selection           Enter
Toggle theme             t
Focus Google             /
Focus go/                g
```

- `Mod` means Ctrl on Windows/Linux and Cmd on macOS
- Single letters are case-insensitive (`'t'` is normalized to lowercase)

## Changing shortcuts

```json
{
  "keybinds": {
    "quickLauncherOpen": "Ctrl+Space",
    "toggleTheme": "Shift+T",
    "focusGoogle": "/",
    "focusGo": "g",
    "quickLauncherClose": "Escape",
    "quickLauncherNext": "ArrowDown",
    "quickLauncherPrev": "ArrowUp",
    "quickLauncherOpenInTab": "Enter"
  }
}
```

The on-type navigation and selection inside the Quick Launcher are handled by these binds; changes apply on reload.