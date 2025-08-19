# Command DSL

The Command DSL enables fast navigation via parameterized templates, macros, and shorthands directly in the Quick Launcher.

## Configuration

Add a `commandDsl` section to your `config.json`/`config.yaml` (or `config.js`).

```json
{
  "commandDsl": {
    "templates": {
      "gh {owner}/{repo} i {num}": "https://github.com/{owner}/{repo}/issues/{num}",
      "gh {owner}/{repo} pr {num}": "https://github.com/{owner}/{repo}/pull/{num}",
      "gh code {q}": "https://github.com/search?q={urlencode(q)}&type=code",
      "mdn {q}": "https://developer.mozilla.org/en-US/search?q={urlencode(q)}",
      "so {q}": "https://stackoverflow.com/search?q={urlencode(q)}",
      "r/{sub}": "https://www.reddit.com/r/{sub}/",
      "npm {pkg}": "https://www.npmjs.com/package/{pkg}",
      "unpkg {pkg}": "https://unpkg.com/browse/{pkg}/",
      "bp {pkg}": "https://bundlephobia.com/package/{pkg}",
      "go {key}": ""
    },
    "macros": {
      "pkg {pkg}": ["npm {pkg}", "unpkg {pkg}", "bp {pkg}"]
    },
    "defaults": {
      "defaultRepo": "your-org/your-repo",
      "defaultTrackerPrefix": "ABC-",
      "trackerUrl": "https://your-tracker.example.com/browse/{id}"
    }
  }
}
```

Notes:

- Templates accept variables in `{var}`. Use `urlencode(var)` inside a template to URL-encode user input.
- `go {key}` delegates to the `go` resolver defined in your `go` config section.

## Usage

- **GitHub**: `gh owner/repo i 123` → opens issue 123
- **PR shorthand**: `pr 42` → expands to `gh {defaultRepo} pr 42`
- **Reddit**: `r/learnprogramming`
- **Multi-target search**: `mdn fetch | so "js fetch" | gh code fetch`
  - Press Enter to open the first target
  - Press Shift+Enter to open all targets
- **Packages macro**: `pkg react` → opens npm, unpkg, and bundlephobia
- **Focus timer (built-in)**: `time 25` → starts a 25-minute focus timer
## Common patterns

- **Shorthand commands**: `pr 42`, `ABC-123` (prefix reserved in defaults; tracker shorthand may be added in future)
- **URL encoding**: Use `urlencode(q)` for search queries
- **Pipe syntax**: Combine multiple targets with `|`
- **Open all**: Hold Shift while pressing Enter in the Quick Launcher

