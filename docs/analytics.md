# Local analytics (optional)

When enabled, the app records simple usage counts in `localStorage` on the client to improve Quick Launcher ranking. No network requests or external analytics are used.

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
  - `cmd:TEXT` — executing a command via the Command DSL (e.g., `cmd:r/unixporn`)

Example value:

```json
{
  "link:Tickets": 12,
  "go:PAM": 8,
  "go-search:datacenter": 3,
  "search:google": 19,
  "cmd:r/unixporn": 7
}
```

## How it is used

- The Quick Launcher adds a small score boost based on these counts (capped)
- Popular items surface higher in results over time
- Frequently used command texts are suggested when typing partial matches, allowing quick re-run of past commands (e.g., type "unix" to see `Run again: r/unixporn`)

## Resetting counts

- Clear site data via your browser devtools, or run in the console:

```js
localStorage.removeItem('analytics:counts');
```

## Privacy

- Data never leaves your browser
- You can keep analytics disabled (default) for zero storage