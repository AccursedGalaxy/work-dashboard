(function () {
    /**
     * Remove a shell/YAML-style comment (`#...`) from a single line, ignoring `#` characters that appear inside single or double quotes.
     *
     * The function preserves quoted text and toggles quote state on unescaped single or double quote characters. It returns the input line truncated at the first `#` that is not inside a quote; if no such `#` exists, the original line is returned unchanged.
     *
     * @param {string} line - A single line of text to strip comments from.
     * @return {string} The line with any unquoted trailing comment removed.
     */
    function stripComments(line) {
        var out = '';
        var inSingle = false;
        var inDouble = false;
        for (var i = 0; i < line.length; i++) {
            var ch = line[i];
            if (ch === "'" && !inDouble) {
                inSingle = !inSingle;
                out += ch;
                continue;
            }
            if (ch === '"' && !inSingle) {
                inDouble = !inDouble;
                out += ch;
                continue;
            }
            if (ch === '#' && !inSingle && !inDouble) {
                break;
            }
            out += ch;
        }
        return out;
    }
    /**
     * Parse a YAML-like scalar token into a JavaScript primitive.
     *
     * Trims whitespace, returns an empty string for blank input, removes surrounding
     * single or double quotes, maps `null` (plus `Null`, `NULL`) and `~` to null,
     * maps common true/false variants to booleans, converts numeric-looking
     * strings to Numbers, and otherwise returns the trimmed string as-is.
     *
     * @param {string} raw - The raw scalar text to parse.
     * @returns {string|number|boolean|null} The parsed primitive value.
     */
    function parseScalar(raw) {
        var s = raw.trim();
        if (!s.length) return '';
        var first = s[0], last = s[s.length - 1];
        if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
            return s.slice(1, -1);
        }
        if (s === 'null' || s === 'Null' || s === 'NULL' || s === '~') return null;
        if (s === 'true' || s === 'True' || s === 'TRUE') return true;
        if (s === 'false' || s === 'False' || s === 'FALSE') return false;
        if (!isNaN(Number(s))) return Number(s);
        return s;
    }
    /**
     * Parse a small, indentation-based YAML-like string into plain JavaScript objects/arrays.
     *
     * This is a lightweight fallback YAML parser (not a full YAML implementation). It supports:
     * - Indentation-based nesting of maps and sequences (maps are plain objects, sequences are arrays).
     * - Sequence items starting with `-`, including inline scalars (e.g. `- value`) and inline mappings (e.g. `- key: value`).
     * - Mapping entries using `key: value` and nested maps when the value is omitted.
     * - Bare scalars assigned to the most recent mapping key.
     * - Stripping of line comments (handled by the surrounding file's `stripComments`).
     *
     * Limitations: does not implement full YAML features (anchors, complex types, multi-line literals, tags, flow collections, etc.).
     *
     * @param {string} text - YAML-like content to parse (CRLF and LF line endings supported).
     * @returns {Object} A plain JavaScript object representing the parsed document. If the top-level document is a sequence, an object of the shape `{ items: [...] }` is returned.
     */
    function parseYamlLite(text) {
        var lines = text.replace(/\r\n?/g, '\n').split('\n');
        var root = {};
        var stack = [{ indent: -1, type: 'map', node: root, key: null }];
        function getTop() { return stack[stack.length - 1]; }
        function ensureChildContainer(parent, key, kind) {
            if (kind === 'seq') {
                parent.node[key] = parent.node[key] && Array.isArray(parent.node[key]) ? parent.node[key] : [];
                return { indent: parent.indent + 2, type: 'seq', node: parent.node[key], key: null };
            } else {
                parent.node[key] = parent.node[key] && typeof parent.node[key] === 'object' && !Array.isArray(parent.node[key]) ? parent.node[key] : {};
                return { indent: parent.indent + 2, type: 'map', node: parent.node[key], key: null };
            }
        }
        for (var idx = 0; idx < lines.length; idx++) {
            var raw = lines[idx];
            if (!raw.trim()) continue;
            var line = stripComments(raw);
            if (!line.trim()) continue;
            var indent = 0;
            while (indent < line.length && line[indent] === ' ') indent++;
            var content = line.slice(indent);
            while (stack.length && indent <= getTop().indent) stack.pop();
            var cur = getTop();
            // Sequence item
            if (content[0] === '-' && (content.length === 1 || content[1] === ' ')) {
                // If current container is map, we need a pending key converted to seq. If there's no prior key, allow root-level seq by converting current map if empty and at root.
                if (cur.type === 'map') {
                    // Find last key from previous line by scanning up the stack; if none, create anonymous array at root (only if root and empty)
                    // Heuristic: create or reuse a special key '__list__' only if at root and it's empty; otherwise, we cannot infer — create anonymous list override
                    if (cur.key && typeof cur.node[cur.key] !== 'object') {
                        cur.node[cur.key] = [];
                    }
                    if (cur.key && !Array.isArray(cur.node[cur.key])) {
                        cur.node[cur.key] = [];
                    }
                    if (!cur.key && Array.isArray(cur.node)) {
                        // already a list
                    } else if (!cur.key) {
                        // anonymous top-level list not expected; create if root empty
                        if (stack.length === 1 && Object.keys(cur.node).length === 0) {
                            // replace root with list
                            var newArr = [];
                            stack[0] = { indent: -1, type: 'seq', node: newArr, key: null };
                            cur = getTop();
                        } else {
                            // fallback: create temp list under "items"
                            cur.node.items = cur.node.items || [];
                            stack.push({ indent: indent - 2, type: 'seq', node: cur.node.items, key: null });
                            cur = getTop();
                        }
                    } else {
                        stack.push({ indent: indent - 2, type: 'seq', node: cur.node[cur.key], key: null });
                        cur = getTop();
                    }
                }
                // Now cur.type is seq
                var afterDash = content.slice(1).trim();
                if (!afterDash) {
                    // Start of nested block item
                    var obj = {};
                    cur.node.push(obj);
                    stack.push({ indent: indent, type: 'map', node: obj, key: null });
                    continue;
                }
                // Inline value or mapping
                if (afterDash.includes(':')) {
                    // Inline mapping like "- key: value"
                    var cidx = afterDash.indexOf(':');
                    var ikey = afterDash.slice(0, cidx).trim();
                    var ival = afterDash.slice(cidx + 1).trim();
                    var itemObj = {};
                    if (ival) itemObj[ikey] = parseScalar(ival);
                    else itemObj[ikey] = {};
                    cur.node.push(itemObj);
                    // If there is no value, expect nested lines to fill the map
                    stack.push({ indent: indent, type: 'map', node: itemObj, key: (ival ? null : ikey) });
                } else {
                    cur.node.push(parseScalar(afterDash));
                }
                continue;
            }
            // Mapping entry
            var colonIdx = content.indexOf(':');
            if (colonIdx !== -1) {
                var key = content.slice(0, colonIdx).trim();
                var rest = content.slice(colonIdx + 1).trim();
                if (rest) {
                    // Inline scalar
                    if (cur.type === 'map') {
                        cur.node[key] = parseScalar(rest);
                        cur.key = key;
                    } else {
                        // In a seq, start a new map element
                        var mapEl = {};
                        mapEl[key] = parseScalar(rest);
                        cur.node.push(mapEl);
                        stack.push({ indent: indent, type: 'map', node: mapEl, key: key });
                    }
                } else {
                    // Will nest
                    if (cur.type === 'map') {
                        cur.node[key] = {};
                        stack.push({ indent: indent, type: 'map', node: cur.node[key], key: key });
                    } else {
                        var mapEl2 = {};
                        cur.node.push(mapEl2);
                        stack.push({ indent: indent, type: 'map', node: mapEl2, key: key });
                    }
                }
                continue;
            }
            // Fallback: bare scalar assigned to last key if any
            if (cur.type === 'map' && cur.key) {
                cur.node[cur.key] = parseScalar(content);
                continue;
            }
        }
        return Array.isArray(stack[0].node) ? { items: stack[0].node } : stack[0].node;
    }
    /**
     * Safely parse a JSON string, returning the parsed value or null on failure.
     * @param {string} text - JSON text to parse.
     * @return {any|null} The parsed value, or null if parsing fails.
     */
    function tryJsonParse(text) {
        try { return JSON.parse(text); } catch (_) { return null; }
    }
    /**
     * Detect whether the global js-yaml library is available.
     *
     * Checks for a `window.jsyaml` object with a callable `load` method.
     * @return {boolean} True if `window.jsyaml.load` exists and is a function, otherwise false.
     */
    function hasJsYaml() {
        return !!(window.jsyaml && typeof window.jsyaml.load === 'function');
    }
    /**
     * Parse YAML text into a JavaScript value, using js-yaml if available.
     *
     * If the global `window.jsyaml.load` function is present this delegates to it;
     * otherwise it uses the built-in lightweight YAML parser. Returns the parsed
     * value (object, array, string, number, etc.) on success. If parsing fails
     * the function returns `null`.
     *
     * @param {string} text - YAML or YAML-like text to parse.
     * @return {*} The parsed value, or `null` if parsing failed.
     */
    function parseYaml(text) {
        try {
    function getJsYaml() {
        if (window.jsyaml && typeof window.jsyaml.load === 'function') return window.jsyaml;
        if (window.jsyaml && typeof window.jsyaml.load === 'function') return window.jsyaml;
        return null;
    }
    function parseYaml(text) {
        try {
            var jsYaml = getJsYaml();
            if (jsYaml) return jsYaml.load(text);
            return parseYamlLite(text);
        } catch (e) {
            console.warn('[config] YAML parse failed; falling back to empty object', e);
            return null;
        }
    }
    /**
     * Fetch text content from a URL, returning null on failure.
     *
     * Attempts a network fetch (cache: 'no-store') and resolves to the response body as a string
     * when the response is OK (2xx). Returns null if the fetch fails, throws, or the response is not OK.
     *
     * @param {string} url - The resource URL to fetch.
     * @returns {Promise<string|null>} The response text on success, or null on failure.
     */
    async function fetchText(url) {
        try {
            var resp = await fetch(url, { cache: 'no-store' });
            if (!resp.ok) return null;
            return await resp.text();
        } catch (_) { return null; }
    }
    /**
     * Load configuration from disk by trying known candidate files and return the first parsed object.
     *
     * Attempts to fetch and parse, in order, `config.json` (JSON), `config.yaml` (YAML), and `config.yml` (YAML).
     * For each candidate: if the file is successfully fetched, the content is parsed according to its type;
     * the first successfully parsed value that is an object is returned. If a file is found but cannot be parsed,
     * a warning is emitted and the loader continues to the next candidate. If none yield an object, an empty
     * object is returned.
     *
     * @returns {Promise<Object>} A promise that resolves to the configuration object (never null; may be an empty object).
     */
    async function loadFileConfig() {
        var candidates = [
            { path: 'config.json', type: 'json' },
            { path: 'config.yaml', type: 'yaml' },
            { path: 'config.yml', type: 'yaml' }
        ];
        for (var i = 0; i < candidates.length; i++) {
            var c = candidates[i];
            var txt = await fetchText(c.path);
            if (!txt) continue;
            var parsed = c.type === 'json' ? tryJsonParse(txt) : parseYaml(txt);
            if (parsed && typeof parsed === 'object') return parsed;
            console.warn('[config] Found', c.path, 'but failed to parse.');
        }
        return {};
    }
    var promise = (async function () {
        var cfg = await loadFileConfig();
        window.__FILE_CONFIG__ = cfg && typeof cfg === 'object' ? cfg : {};
        return window.__FILE_CONFIG__;
    })();
    window.__CONFIG_PROMISE__ = promise;
})();