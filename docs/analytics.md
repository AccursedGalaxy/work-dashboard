# Local analytics (optional)

When enabled, the app records simple usage counts in `localStorage` on the client to improve Quick Launcher ranking and enable smart command suggestions. No network requests or external analytics are used.

## Enabling

```json
{
  "analytics": { "enableLocal": true }
}
```

## What is stored

- Storage key: `localStorage['analytics:counts']`
- Value: JSON object map of counters
- Keys used:
  - `link:LABEL` — opening a link card
  - `go:KEY` — opening a `go/KEY`
  - `go-search:QUERY` — selecting a dynamic `go/` search suggestion
  - `search:google` — submitting the Google form
  - `cmd:COMMAND` — executing a Command DSL command
  - `learned:COMMAND` — selecting a learned command suggestion

Example value:

```json
{
  "link:Tickets": 12,
  "go:PAM": 8,
  "go-search:datacenter": 3,
  "search:google": 19,
  "cmd:r/unixporn": 5,
  "learned:💡 r/unixporn": 3
}
```

## Smart Command Pattern Learning

When analytics are enabled, the system automatically learns command usage patterns to provide intelligent suggestions:

- Storage key: `localStorage['command-patterns']`
- Tracks partial-to-full command mappings based on usage
- Learns from any command execution via Command DSL
- Provides smart suggestions when typing partial commands

Example pattern storage:

```json
{
  "command-patterns": {
    "unix": [
      { "command": "r/unixporn", "count": 15, "lastUsed": 1640995200000 },
      { "command": "unix-tutorial", "count": 3, "lastUsed": 1640908800000 }
    ],
    "r/u": [
      { "command": "r/unixporn", "count": 15, "lastUsed": 1640995200000 }
    ]
  }
}
```

### How Smart Suggestions Work

1. **Pattern Learning**: When you execute commands like `r/unixporn`, the system learns patterns for `r/`, `r/u`, `r/un`, etc.
2. **Smart Suggestions**: When you type `r/u`, the system suggests `r/unixporn` based on previous usage
3. **Scoring**: Suggestions are ranked by usage frequency, recency, and partial match quality
4. **Decay**: Old patterns gradually lose weight over time (30+ days)

### Visual Indicators

- 💡 **Lightbulb**: Smart learned suggestions
- 🧠 **Brain emoji**: Indicates the suggestion is usage-based
- ⚡ **Lightning**: Live Command DSL parsing

## How it is used

- The Quick Launcher adds a small score boost based on these counts (capped)
- Popular items surface higher in results over time
- Smart command suggestions appear at the top when typing partial commands
- Learned patterns improve accuracy over time with usage

## Resetting counts

- Clear site data via your browser devtools, or run in the console:

```js
localStorage.removeItem('analytics:counts');
localStorage.removeItem('command-patterns');
```

## Privacy

- Data never leaves your browser
- You can keep analytics disabled (default) for zero storage