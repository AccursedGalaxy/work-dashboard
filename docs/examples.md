
## 7) Command DSL templates and macros

```json
{
  "commandDsl": {
    "templates": {
      "gh {owner}/{repo} i {num}": "https://github.com/{owner}/{repo}/issues/{num}",
      "gh {owner}/{repo} pr {num}": "https://github.com/{owner}/{repo}/pull/{num}",
      "mdn {q}": "https://developer.mozilla.org/en-US/search?q={urlencode(q)}",
      "so {q}": "https://stackoverflow.com/search?q={urlencode(q)}",
      "go {key}": ""
    },
    "macros": { "pkg {pkg}": ["npm {pkg}", "unpkg {pkg}"] },
    "defaults": { "defaultRepo": "your-org/your-repo" }
  }
}
```

Usage:

- **GitHub navigation**: `gh owner/repo i 123`
- **Multi-site search**: `mdn fetch | so "js fetch"`
- **Package management macro**: `pkg react`
- **Focus timer**: `time 25`
