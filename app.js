(function () {
    let config;
    let backgroundCycler = null;
    /**
     * Build the runtime configuration by merging defaults, file-level, and user overrides, then initialize the dashboard.
     *
     * This performs the app startup: it composes the final `config` (deep-merged from built-in defaults, a file-provided config, and any user config on window), applies the initial theme, creates and wires the background cycler, renders link sections, binds forms and UI features (Google/Go forms, mini-browser, global shortcuts, quick launcher, keybind help), sets initial focus, and registers PWA/install and service worker hooks. Side effects include writing to global `config` and `backgroundCycler` and attaching many DOM event listeners.
     */
    function start() {
        const defaultConfig = window.DASHBOARD_DEFAULT_CONFIG || {};
        const fileConfig = window.__FILE_CONFIG__ || {};
        const userConfig = window.DASHBOARD_CONFIG || {};
        config = mergeDeep({
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
                keyToUrl: {
                    PAM: 'https://go/pam'
                }
            },
            backgrounds: {
                enable: true,
                cycleMs: 15000,
                transitionMs: 1200,
                randomize: true,
                light: [],
                dark: []
            },
            sections: [
                {
                    title: 'Daily',
                    links: [
                        { label: 'Ticket Tool', url: 'https://tickets.example.com', icon: '🎫' },
                        { label: 'GitHub Copilot', url: 'https://github.com/copilot', icon: '🤖' },
                        { label: 'Outlook', url: 'https://outlook.office.com/mail', icon: '📧' }
                    ]
                },
                {
                    title: 'System Admin Pages',
                    links: [
                        { label: 'Admin Console', url: 'https://admin.example.com', icon: '🛠️' }
                    ]
                },
                {
                    title: 'Other Pages',
                    links: [
                        { label: 'Company Wiki', url: 'https://wiki.example.com', icon: '📚' }
                    ]
                }
            ],
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
                macros: {
                    'pkg {pkg}': ['npm {pkg}', 'unpkg {pkg}', 'bp {pkg}']
                },
                defaults: {
                    defaultRepo: '',
                    defaultTrackerPrefix: '',
                    trackerUrl: ''
                }
            }
        }, defaultConfig, fileConfig, userConfig);
        initTheme(config.theme);
        backgroundCycler = createBackgroundCycler(config.backgrounds);
        bindThemeToggle(backgroundCycler);
        applyUiConfig(config);
        renderSections(config.sections);
        bindGoogleForm(config.google);
        bindGoForm(config.go);
        bindMiniBrowser(config.miniBrowser);
        bindGlobalShortcuts(config.keybinds);
        initQuickLauncher(config);
        initKeybindsWidget(config.keybinds);
        setInitialFocus();
        initPWAInstallPrompt();
        registerServiceWorker();
    }
    if (window.__CONFIG_PROMISE__ && typeof window.__CONFIG_PROMISE__.then === 'function') {
        window.__CONFIG_PROMISE__.then(function () { start(); }, function () { start(); });
    }
    else {
        start();
    }
    /**
     * Deeply merges multiple plain objects into a new object.
     *
     * Merges enumerable own properties from left-to-right: nested plain objects are merged recursively, arrays are shallow-copied, and primitive values from later arguments override earlier ones. Non-object or falsy arguments are ignored. The function operates on own keys only (no prototype merging) and returns a newly created object.
     *
     * @param objs - Objects to merge (later objects take precedence)
     * @returns A new object containing the merged result
     */
    function mergeDeep(...objs) {
        const result = {};
        for (const obj of objs) {
            if (!obj || typeof obj !== 'object')
                continue;
            for (const key of Object.keys(obj)) {
                const value = obj[key];
                if (Array.isArray(value)) {
                    result[key] = value.slice();
                }
                else if (value && typeof value === 'object') {
                    result[key] = mergeDeep(result[key] || {}, value);
                }
                else {
                    result[key] = value;
                }
            }
        }
        return result;
    }
    function initTheme(preference) {
        const saved = localStorage.getItem('theme');
        const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initial = saved || (preference === 'auto' ? (systemDark ? 'dark' : 'light') : preference);
        setTheme(initial);
    }
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    }
    function toggleTheme(backgroundCycler) {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('theme', next);
        if (backgroundCycler)
            backgroundCycler.setTheme(next);
    }
    function bindThemeToggle(backgroundCycler) {
        const btn = document.getElementById('themeToggle');
        if (btn)
            btn.addEventListener('click', function () { toggleTheme(backgroundCycler); });
    }
    function createBackgroundCycler(bgCfg) {
        const cfg = Object.assign({ enable: true, cycleMs: 15000, transitionMs: 1200, randomize: true, light: [], dark: [] }, bgCfg || {});
        const container = ensureBackgroundDom(cfg.transitionMs);
        const layers = container.querySelectorAll('.bg-layer');
        const overlay = container.querySelector('.bg-overlay');
        let currentTheme = (document.documentElement.getAttribute('data-theme') || 'light');
        let timer = null;
        let images = [];
        let index = 0;
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        function resolveList() {
            const list = Array.isArray(cfg[currentTheme]) ? cfg[currentTheme] : [];
            return list.filter(Boolean);
        }
        // Preload the next image to ensure smooth transition
        function preloadNext(src) {
            try {
                if (!src)
                    return;
                const img = new Image();
                img.decoding = 'async';
                img.loading = 'eager';
                img.src = src;
            }
            catch (_) { }
        }
        function applyImage(immediate) {
            if (!images.length) {
                container.classList.add('bg-hidden');
                return;
            }
            container.classList.remove('bg-hidden');
            const url = 'url("' + images[index] + '")';
            const a = layers[0];
            const b = layers[1];
            const showingA = a.classList.contains('is-showing');
            const showEl = showingA ? b : a;
            const hideEl = showingA ? a : b;
            showEl.style.backgroundImage = url;
            // Preload upcoming image
            const nextIdx = (index + 1) % images.length;
            preloadNext(images[nextIdx]);
            // Force reflow to ensure transition
            void showEl.offsetWidth;
            showEl.classList.add('is-showing');
            hideEl.classList.remove('is-showing');
            if (immediate) {
                // Use a class to disable transitions (reduces inline-style usage for CSP tightening)
                container.classList.add('no-transition');
                requestAnimationFrame(function () {
                    showEl.classList.add('is-showing');
                    hideEl.classList.remove('is-showing');
                    requestAnimationFrame(function () { container.classList.remove('no-transition'); });
                });
            }
        }
        function schedule() {
            if (timer)
                clearInterval(timer);
            if (!cfg.enable || images.length === 0)
                return;
            if (reduceMotion)
                return; // respect prefers-reduced-motion: do not auto-cycle
            timer = window.setInterval(next, Math.max(3000, cfg.cycleMs | 0));
        }
        function next() {
            if (!images.length)
                return;
            index = (index + 1) % images.length;
            applyImage(false);
        }
        function setTheme(theme) {
            currentTheme = (theme === 'dark') ? 'dark' : 'light';
            images = resolveList();
            if (cfg.randomize)
                shuffle(images);
            index = 0;
            applyImage(true);
            schedule();
            container.setAttribute('data-theme', currentTheme);
        }
        function start() {
            images = resolveList();
            if (cfg.randomize)
                shuffle(images);
            index = 0;
            applyImage(true);
            schedule();
            container.setAttribute('data-theme', currentTheme);
        }
        function ensureBackgroundDom(transitionMs) {
            let el = document.getElementById('bg');
            if (!el) {
                el = document.createElement('div');
                el.id = 'bg';
                el.innerHTML = '<div class="bg-layer is-showing"></div><div class="bg-layer"></div><div class="bg-overlay"></div>';
                document.body.prepend(el);
            }
            el.style.setProperty('--bg-transition-ms', String(Math.max(200, transitionMs | 0)) + 'ms');
            return el;
        }
        function shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = arr[i];
                arr[i] = arr[j];
                arr[j] = tmp;
            }
            return arr;
        }
        // Initialize with current theme
        start();
        return { start: start, setTheme: setTheme };
    }
    function renderSections(sections) {
        const grid = document.getElementById('linksGrid');
        if (!grid)
            return;
        grid.innerHTML = '';
        sections.forEach(section => {
            const card = document.createElement('div');
            card.className = 'card section-card';
            const header = document.createElement('div');
            header.className = 'section-header';
            header.textContent = section.title;
            const list = document.createElement('ul');
            list.className = 'links-list';
            (section.links || []).forEach((link) => {
                const li = document.createElement('li');
                li.className = 'link-item';
                const a = document.createElement('a');
                a.href = link.url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                const icon = document.createElement('span');
                icon.className = 'link-icon';
                icon.textContent = link.icon || '🔗';
                const label = document.createElement('span');
                label.className = 'link-label';
                label.textContent = link.label;
                a.appendChild(icon);
                a.appendChild(label);
                li.appendChild(a);
                list.appendChild(li);
                if (config.analytics && config.analytics.enableLocal) {
                    a.addEventListener('click', function () {
                        try {
                            incrementLocalCount('link:' + (link.label || link.url));
                        }
                        catch (_) { }
                    });
                }
            });
            card.appendChild(header);
            card.appendChild(list);
            grid.appendChild(card);
        });
    }
    function bindGoogleForm(googleCfg) {
        const form = document.getElementById('googleForm');
        const input = document.getElementById('googleQuery');
        if (!form || !input)
            return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const q = input.value.trim();
            const url = new URL(googleCfg.baseUrl);
            url.searchParams.set(googleCfg.queryParam || 'q', q);
            // Append any extra params (e.g., igu=1 to hint embeddable UI)
            if (googleCfg.extraParams && typeof googleCfg.extraParams === 'object') {
                Object.keys(googleCfg.extraParams).forEach(function (k) {
                    const v = googleCfg.extraParams[k];
                    if (v != null)
                        url.searchParams.set(k, String(v));
                });
            }
            const frame = document.getElementById('mb-frame');
            const addr = document.getElementById('mb-url');
            const target = document.getElementById('mb-target');
            const miniEnabled = !(config.miniBrowser && config.miniBrowser.enable === false);
            if (target && !miniEnabled) {
                try {
                    target.value = 'tab';
                }
                catch (_) { }
            }
            const href = url.toString();
            if (addr && miniEnabled)
                addr.value = href;
            if (target && target.value === 'tab') {
                window.open(href, '_blank', 'noopener,noreferrer');
            }
            else if (frame && miniEnabled) {
                frame.src = href;
            }
            else {
                window.location.href = href;
            }
            if (config.analytics && config.analytics.enableLocal) {
                try {
                    incrementLocalCount('search:google');
                }
                catch (_) { }
            }
        });
    }
    function bindGoForm(goCfg) {
        const form = document.getElementById('goForm');
        const input = document.getElementById('goQuery');
        if (!form || !input)
            return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const raw = input.value.trim();
            const frame = document.getElementById('mb-frame');
            const addr = document.getElementById('mb-url');
            const target = document.getElementById('mb-target');
            const miniEnabled = !(config.miniBrowser && config.miniBrowser.enable === false);
            if (target && !miniEnabled) {
                try {
                    target.value = 'tab';
                }
                catch (_) { }
            }
            function openGoUrl(href) {
                if (addr && miniEnabled)
                    addr.value = href;
                if (target && target.value === 'tab') {
                    window.open(href, '_blank', 'noopener,noreferrer');
                }
                else if (frame && miniEnabled) {
                    frame.src = href;
                }
                else {
                    window.location.href = href;
                }
            }
            if (!raw || raw === 'go/' || raw.toLowerCase() === 'go') {
                openGoUrl(goCfg.homepageUrl);
                return;
            }
            const key = raw.startsWith('go/') ? raw.slice(3) : raw.startsWith('go ') ? raw.slice(3) : raw;
            const resolved = resolveGoKey(goCfg, key);
            // Local-only analytics: count go/ key or free-text intranet searches to improve Quick Launcher ranking
            if (config.analytics && config.analytics.enableLocal) {
                try {
                    const matched = findGoKey(goCfg, key);
                    if (matched) {
                        incrementLocalCount('go:' + matched);
                    }
                    else if (goCfg.fallbackSearchUrl) {
                        // Count free-text intranet searches under go-search:QUERY
                        incrementLocalCount('go-search:' + key);
                    }
                }
                catch (_) { }
            }
            openGoUrl(resolved);
        });
    }
    function resolveGoKey(goCfg, key) {
        const map = goCfg.keyToUrl || {};
        const foundKey = Object.keys(map).find(k => k.toLowerCase() === key.toLowerCase());
        if (foundKey)
            return map[foundKey];
        if (goCfg.fallbackSearchUrl)
            return goCfg.fallbackSearchUrl + encodeURIComponent(key);
        return goCfg.homepageUrl;
    }
    function findGoKey(goCfg, key) {
        const map = goCfg.keyToUrl || {};
        const foundKey = Object.keys(map).find(function (k) { return k.toLowerCase() === String(key).toLowerCase(); });
        return foundKey || null;
    }
    function navigate(url) {
        window.location.href = url;
    }
    // ===== Command DSL helpers =====
    function normalizeSmartQuotes(s) {
        return String(s || '')
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'");
    }
    function tokenizeCommand(input) {
        var s = normalizeSmartQuotes(input).trim();
        var tokens = [];
        var cur = '';
        var inSingle = false, inDouble = false, esc = false;
        for (var i = 0; i < s.length; i++) {
            var ch = s[i];
            if (esc) { cur += ch; esc = false; continue; }
            if (ch === '\\') { esc = true; continue; }
            if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
            if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
            if (!inSingle && !inDouble && /\s/.test(ch)) {
                if (cur) { tokens.push(cur); cur = ''; }
                continue;
            }
            cur += ch;
        }
        if (cur) tokens.push(cur);
        return tokens;
    }
    function kebabCase(s) {
        return String(s || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/--+/g, '-');
    }
    function applyTransforms(fnName, value) {
        var v = value == null ? '' : String(value);
        var name = String(fnName || '').toLowerCase();
        if (name === 'urlencode') return encodeURIComponent(v);
        if (name === 'lower') return v.toLowerCase();
        if (name === 'kebab') return kebabCase(v);
        return v;
    }
    function evalTemplateExpr(expr, vars) {
        // Supports: varName, func(varName), nested like urlencode(lower(varName))
        var s = expr.trim();
        // Nested function parsing: find outermost function call
        var m = /^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/.exec(s);
        if (m) {
            var fn = m[1];
            var inner = m[2];
            var innerVal = evalTemplateExpr(inner, vars);
            return applyTransforms(fn, innerVal);
        }
        // Plain variable
        var key = s.trim();
        return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : '';
    }
    function interpolateUrl(tpl, vars) {
        return String(tpl).replace(/\{([^}]+)\}/g, function (_, expr) { return evalTemplateExpr(expr, vars); });
    }
    function buildTokenRegexFromPatternToken(patternToken) {
        // Convert a single pattern token (no spaces) into a regex that captures placeholders {var}
        var out = '';
        for (var i = 0; i < patternToken.length; i++) {
            var ch = patternToken[i];
            if (ch === '{') {
                var j = patternToken.indexOf('}', i + 1);
                if (j === -1) { out += '\\{'; continue; }
                var varName = patternToken.slice(i + 1, j).trim();
                // If token contains '/', limit var to any char except '/'; otherwise, no spaces
                var needsSlashAware = patternToken.indexOf('/') !== -1;
                out += needsSlashAware ? '([^/]+)' : '([^\n\r\t ]+)';
                i = j;
            } else {
                // escape regex special chars
                if (/[-/\\^$*+?.()|[\]{}]/.test(ch)) out += '\\' + ch; else out += ch;
            }
        }
        return new RegExp('^' + out + '$');
    }
    function matchPattern(pattern, inputTokens) {
        // Returns { ok: boolean, vars: object, usedTokens: number }
        var p = String(pattern).trim();
        var pTokens = p.split(/\s+/);
        var vars = {};
        // Support last-token rest capture when the last pattern token is a bare placeholder like {q}
        var lastToken = pTokens[pTokens.length - 1] || '';
        var lastBarePlaceholder = /^\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}$/.exec(lastToken);
        if (lastBarePlaceholder) {
            if (inputTokens.length < pTokens.length - 1) return { ok: false };
            for (var i = 0; i < pTokens.length - 1; i++) {
                var re = buildTokenRegexFromPatternToken(pTokens[i]);
                var m = re.exec(inputTokens[i] || '');
                if (!m) return { ok: false };
                // collect vars in order of placeholders
                var varNames = (pTokens[i].match(/\{([^}]+)\}/g) || []).map(function (x) { return x.slice(1, -1).trim(); });
                for (var k = 0; k < varNames.length; k++) vars[varNames[k]] = m[k + 1];
            }
            var rest = inputTokens.slice(pTokens.length - 1).join(' ').trim();
            vars[lastBarePlaceholder[1]] = rest;
            return { ok: true, vars: vars, usedTokens: inputTokens.length };
        } else {
            if (inputTokens.length !== pTokens.length) return { ok: false };
            for (var j = 0; j < pTokens.length; j++) {
                var re2 = buildTokenRegexFromPatternToken(pTokens[j]);
                var m2 = re2.exec(inputTokens[j] || '');
                if (!m2) return { ok: false };
                var varNames2 = (pTokens[j].match(/\{([^}]+)\}/g) || []).map(function (x) { return x.slice(1, -1).trim(); });
                for (var k2 = 0; k2 < varNames2.length; k2++) vars[varNames2[k2]] = m2[k2 + 1];
            }
            return { ok: true, vars: vars, usedTokens: pTokens.length };
        }
    }
    function parseCommandSegment(segment, cfg) {
        var raw = String(segment || '').trim();
        if (!raw) return [];
        var dsl = (cfg && cfg.commandDsl) || {};
        var templates = (dsl && dsl.templates) || {};
        var macros = (dsl && dsl.macros) || {};
        var defaults = (dsl && dsl.defaults) || {};
        var tokens = tokenizeCommand(raw);
        if (!tokens.length) return [];
        // Special: go alias uses existing resolver
        if (tokens[0].toLowerCase() === 'go') {
            var key = tokens.slice(1).join(' ').trim();
            if (!key) return [];
            var href = resolveGoKey(cfg.go || {}, key);
            return [{ kind: 'url', label: 'go ' + key, url: href, icon: '🏷️' }];
        }
        // Shorthand: pr NUM using defaultRepo
        if (/^pr$/i.test(tokens[0]) && tokens[1] && /^\d+$/.test(tokens[1]) && defaults && defaults.defaultRepo) {
            var repo = String(defaults.defaultRepo);
            var url = 'https://github.com/' + repo + '/pull/' + tokens[1];
            return [{ kind: 'url', label: 'PR #' + tokens[1] + ' in ' + repo, url: url, icon: '🔀' }];
        }
        // Shorthand: tracker like ABC-123
        var trackerId = null;
        var joined = tokens.join(' ');
        var prefix = (defaults && defaults.defaultTrackerPrefix) ? String(defaults.defaultTrackerPrefix) : '';
        var trackerUrl = (defaults && defaults.trackerUrl) ? String(defaults.trackerUrl) : '';
        var trackerMatch = /\b([A-Za-z]+-\d+)\b/.exec(joined);
        if (trackerUrl && (trackerMatch || (prefix && joined.toUpperCase().startsWith(prefix.toUpperCase())))) {
            if (trackerMatch) trackerId = trackerMatch[1];
            else trackerId = joined.trim();
            var tid = trackerId.toUpperCase();
            var tUrl = interpolateUrl(trackerUrl, { id: tid });
            return [{ kind: 'url', label: tid, url: tUrl, icon: '🎫' }];
        }
        // Macros expansion
        for (var macroPattern in macros) {
            if (!Object.prototype.hasOwnProperty.call(macros, macroPattern)) continue;
            var r = matchPattern(macroPattern, tokens);
            if (r && r.ok) {
                var expansions = macros[macroPattern] || [];
                var outs = [];
                for (var ei = 0; ei < expansions.length; ei++) {
                    var expanded = interpolateUrl(expansions[ei], r.vars);
                    // Recurse parse expanded into concrete URLs
                    var sub = parseCommandSegment(expanded, cfg);
                    for (var si = 0; si < sub.length; si++) outs.push(sub[si]);
                }
                if (outs.length) return outs;
            }
        }
        // Templates matching
        var candidates = Object.keys(templates);
        for (var i = 0; i < candidates.length; i++) {
            var pat = candidates[i];
            var res = matchPattern(pat, tokens);
            if (res && res.ok) {
                var tpl = templates[pat];
                // Special-case: empty URL signals handler (e.g., go {key})
                if (tpl === '' && /^go\s+\{/.test(pat)) {
                    var key2 = res.vars.key || '';
                    var href2 = resolveGoKey(cfg.go || {}, key2);
                    return [{ kind: 'url', label: 'go ' + key2, url: href2, icon: '🏷️' }];
                }
                var href3 = interpolateUrl(tpl, res.vars);
                return [{ kind: 'url', label: raw, url: href3, icon: '⚡' }];
            }
        }
        // Action: time N (minutes)
        if (/^time$/i.test(tokens[0]) && tokens[1] && /^\d+$/.test(tokens[1])) {
            return [{ kind: 'action', action: 'timer', minutes: parseInt(tokens[1], 10), label: 'Focus ' + tokens[1] + ' min', icon: '⏱️' }];
        }
        return [];
    }
    function parseCommandDsl(raw, cfg) {
        var text = String(raw || '').trim();
        if (!text) return { targets: [], label: '' };
        // Split on '|' while honoring quotes and backslash escapes
        function splitPipes(s) {
            var out = [], cur = '', inS = false, inD = false, esc = false;
            for (var i = 0; i < s.length; i++) {
                var ch = s[i];
                if (esc) { cur += ch; esc = false; continue; }
                if (ch === '\\') { esc = true; continue; }
                if (ch === '"' && !inS) { inD = !inD; continue; }
                if (ch === "'" && !inD) { inS = !inS; continue; }
                if (ch === '|' && !inS && !inD) {
                    out.push(cur.trim());
                    cur = '';
                    continue;
                }
                cur += ch;
            }
            if (cur) out.push(cur.trim());
            return out.filter(Boolean);
        }
        var parts = splitPipes(text);
        var all = [];
        for (var i = 0; i < parts.length; i++) {
            var segTargets = parseCommandSegment(parts[i], cfg);
            for (var j = 0; j < segTargets.length; j++) all.push(segTargets[j]);
        }
        return { targets: all, label: text };
    }
    function runCommandTargets(cmd, openAll, cfg) {
        var targets = (cmd && cmd.targets) || [];
        if (!targets.length) return;
        // analytics for commands
        if (config.analytics && config.analytics.enableLocal) {
            try { incrementLocalCount('cmd:' + (cmd.label || '')); } catch (_) { }
        }
        var toOpen = openAll ? targets : [targets[0]];
        for (var i = 0; i < toOpen.length; i++) {
            var t = toOpen[i];
            if (!t) continue;
            if (t.kind === 'url') {
                window.open(t.url, '_blank', 'noopener,noreferrer');
            } else if (t.kind === 'action' && t.action === 'timer') {
                startFocusTimer(typeof t.minutes === 'number' ? t.minutes : 25);
            }
        }
    }
    function startFocusTimer(minutes) {
        var ms = Math.max(1, minutes | 0) * 60 * 1000;
        // Singleton state stored on the function object
        var state = startFocusTimer.__state || { overlay: null, timerId: 0, endAt: 0 };
        startFocusTimer.__state = state;
        var overlay = state.overlay || document.getElementById('timer-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'timer-overlay';
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.background = 'rgba(0,0,0,0.55)';
            overlay.style.zIndex = '9999';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.backdropFilter = 'blur(2px)';
            var panel = document.createElement('div');
            panel.style.background = 'var(--card-bg, #111)';
            panel.style.color = 'var(--fg, #fff)';
            panel.style.padding = '24px 28px';
            panel.style.borderRadius = '12px';
            panel.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
            panel.style.minWidth = '280px';
            panel.style.textAlign = 'center';
            var title = document.createElement('div');
            title.textContent = 'Focus Timer';
            title.style.fontSize = '18px';
            title.style.fontWeight = '600';
            title.style.marginBottom = '6px';
            var timeEl = document.createElement('div');
            timeEl.id = 'timer-remaining';
            timeEl.style.fontSize = '34px';
            timeEl.style.fontVariantNumeric = 'tabular-nums';
            timeEl.style.letterSpacing = '1px';
            timeEl.style.margin = '6px 0 10px';
            var btns = document.createElement('div');
            btns.style.display = 'flex';
            btns.style.gap = '8px';
            btns.style.justifyContent = 'center';
            var stopBtn = document.createElement('button');
            stopBtn.textContent = 'Stop';
            var add5Btn = document.createElement('button');
            add5Btn.textContent = '+5 min';
            btns.appendChild(stopBtn);
            btns.appendChild(add5Btn);
            panel.appendChild(title);
            panel.appendChild(timeEl);
            panel.appendChild(btns);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
            state.overlay = overlay;
            state.timerId = 0;
            state.endAt = 0;
            function fmt(msLeft) {
                var s = Math.max(0, Math.round(msLeft / 1000));
                var m = Math.floor(s / 60);
                var r = s % 60;
                return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
            }
            function tick() {
                var now = Date.now();
                var left = Math.max(0, state.endAt - now);
                var el = document.getElementById('timer-remaining');
                if (el) el.textContent = fmt(left);
                if (left <= 0) {
                    clearInterval(state.timerId);
                    // flash
                    panel.style.animation = 'none';
                    void panel.offsetWidth;
                    panel.style.animation = 'pulse 0.6s ease 0s 4 alternate';
                    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (_) { }
                }
            }
            function start(msFromNow) {
                state.endAt = Date.now() + msFromNow;
                clearInterval(state.timerId);
                state.timerId = window.setInterval(tick, 250);
                tick();
            }
            stopBtn.addEventListener('click', function () {
                clearInterval(state.timerId);
                overlay.remove();
                state.overlay = null;
            });
            add5Btn.addEventListener('click', function () {
                state.endAt += 5 * 60 * 1000;
                tick();
            });
            overlay.addEventListener('click', function (e) { if (e.target === overlay) { clearInterval(state.timerId); overlay.remove(); state.overlay = null; } });
            document.addEventListener('keydown', function onKey(e) {
                var el = document.getElementById('timer-overlay');
                if (!el) { document.removeEventListener('keydown', onKey); return; }
                if (e.key === 'Escape') { clearInterval(state.timerId); el.remove(); state.overlay = null; }
            });
            // Add minimal keyframes for pulse
            var style = document.createElement('style');
            style.textContent = '@keyframes pulse { from { transform: scale(1); } to { transform: scale(1.03); } }';
            document.head.appendChild(style);
        }
        // Start or restart countdown
        clearInterval(state.timerId);
        state.endAt = Date.now() + ms;
        state.timerId = window.setInterval(function () {
            var now = Date.now();
            var left = Math.max(0, state.endAt - now);
            var el = document.getElementById('timer-remaining');
            if (el) {
                var s = Math.max(0, Math.round(left / 1000));
                var m = Math.floor(s / 60);
                var r = s % 60;
                el.textContent = String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
            }
            if (left <= 0) {
                clearInterval(state.timerId);
            }
        }, 250);
    }
    function bindMiniBrowser(miniCfg) {
        // If explicitly disabled, hide the UI and skip initialization
        if (miniCfg && miniCfg.enable === false) {
            const box = document.getElementById('mini-browser');
            if (box)
                box.setAttribute('hidden', '');
            return;
        }
        const input = document.getElementById('mb-url');
        const targetSel = document.getElementById('mb-target');
        const frame = document.getElementById('mb-frame');
        const box = document.getElementById('mini-browser');
        const handleTL = document.getElementById('mb-resize-tl');
        if (!input || !frame)
            return;
        // Ensure iframe does not capture initial focus or tab order on load
        try {
            frame.setAttribute('tabindex', '-1');
        }
        catch (_) { }
        // Initialize from config if provided
        if (miniCfg && typeof miniCfg.defaultUrl === 'string' && miniCfg.defaultUrl) {
            input.value = miniCfg.defaultUrl;
            frame.src = miniCfg.defaultUrl;
        }
        // When user presses Enter in the URL bar, open in chosen target
        input.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter')
                return;
            e.preventDefault();
            const raw = input.value.trim();
            try {
                const u = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
                if (targetSel && targetSel.value === 'tab') {
                    window.open(u.href, '_blank', 'noopener,noreferrer');
                }
                else if (frame) {
                    frame.src = u.href;
                }
            }
            catch (err) {
                alert('Invalid URL');
            }
        });
        // Top-left resize handle (drag to resize bigger/smaller)
        if (box && handleTL) {
            let startX = 0, startY = 0, startW = 0, startH = 0;
            function onDown(e) {
                e.preventDefault();
                startX = e.clientX;
                startY = e.clientY;
                const rect = box.getBoundingClientRect();
                startW = rect.width;
                startH = rect.height;
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp, { once: true });
            }
            function onMove(e) {
                const dx = startX - e.clientX; // dragging towards top-left increases dx/dy
                const dy = startY - e.clientY;
                const newW = Math.max(360, startW + dx);
                const newH = Math.max(260, startH + dy);
                box.style.width = newW + 'px';
                box.style.height = newH + 'px';
            }
            function onUp() {
                document.removeEventListener('mousemove', onMove);
            }
            handleTL.addEventListener('mousedown', onDown);
        }
    }
    // Apply optional UI overrides from configuration (non-destructive; keeps HTML defaults when unspecified)
    function applyUiConfig(cfg) {
        try {
            const ui = (cfg && cfg.ui) || {};
            // go/ card title
            if (ui && typeof ui.goTitle === 'string' && ui.goTitle.trim()) {
                const form = document.getElementById('goForm');
                const card = form ? form.closest('.card') : null;
                const h2 = card ? card.querySelector('h2') : null;
                if (h2)
                    h2.textContent = ui.goTitle;
            }
        }
        catch (_) { /* no-op */ }
    }
    // ===== Quick Launcher =====
    function initQuickLauncher(cfg) {
        const overlay = document.getElementById('quick-launcher');
        const input = document.getElementById('ql-input');
        const list = document.getElementById('ql-list');
        if (!overlay || !input || !list)
            return;
        // Memoized index cache must be declared before first use to avoid TDZ issues
        var __qlIndexCache = null;
        const index = getMemoizedQuickLauncherIndex(cfg);
        let currentResults = [];
        let selectedIndex = 0;
        function open() {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
            input.value = '';
            renderResults(index, '');
            requestAnimationFrame(function () { input.focus(); });
        }
        function close() {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
        function renderResults(items, query) {
            const q = query.trim();
            const scored = q ? items.map(function (it) {
                return { item: it, score: fuzzyScore(q, it.searchText) + popularityBoost(it) + prefixBoost(q, it) };
            }).filter(function (r) { return r.score > 0; }) : items.map(function (it) { return { item: it, score: popularityBoost(it) }; });
            scored.sort(function (a, b) { return b.score - a.score; });
            // Dynamic go/ search suggestion
            let suggestion = null;
            if (q && cfg.go && cfg.go.fallbackSearchUrl) {
                suggestion = {
                    id: 'go-search:' + q,
                    label: 'Search go/: ' + q,
                    icon: '🔎',
                    url: cfg.go.fallbackSearchUrl + encodeURIComponent(q),
                    type: 'go-search',
                    searchText: 'go ' + q
                };
            }
            // Command DSL suggestion (top)
            let cmd = null;
            if (q) {
                try { cmd = parseCommandDsl(q, cfg); } catch (_) { cmd = null; }
            }
            // Show regular results first; put dynamic go-search suggestion after them
            currentResults = scored.slice(0, 50).map(function (r) { return r.item; });
            // Prepend command if present
            if (cmd && cmd.targets && cmd.targets.length) {
                const first = cmd.targets[0];
                const label = (cmd.targets.length > 1) ? ('Run: ' + q + '  (opens ' + cmd.targets.length + ')') : ('Run: ' + q);
                currentResults.unshift({
                    id: 'cmd:' + q,
                    label: label,
                    icon: first.icon || '⚡',
                    url: first.url || '',
                    type: 'cmd',
                    section: 'command',
                    searchText: q.toLowerCase(),
                    __cmd: cmd
                });
            }
            if (suggestion)
                currentResults.push(suggestion);
            selectedIndex = 0;
            list.innerHTML = '';
            currentResults.forEach(function (it, i) {
                const li = document.createElement('li');
                li.className = 'ql-item';
                li.id = 'ql-item-' + i;
                li.setAttribute('role', 'option');
                li.setAttribute('aria-selected', String(i === selectedIndex));
                const icon = document.createElement('span');
                icon.className = 'ql-icon';
                icon.textContent = it.icon || '🔗';
                const label = document.createElement('span');
                label.className = 'ql-label';
                label.textContent = it.label;
                const meta = document.createElement('span');
                meta.className = 'ql-meta';
                meta.textContent = it.type === 'go' ? 'go/' : (it.type === 'cmd' ? 'command' : (it.section || ''));
                meta.style.opacity = '0.7';
                meta.style.fontSize = '12px';
                li.appendChild(icon);
                li.appendChild(label);
                li.appendChild(meta);
                li.addEventListener('click', function (e) {
                    if (it && it.type === 'cmd' && it.__cmd) {
                        runCommandTargets(it.__cmd, !!(e && e.shiftKey), cfg);
                        close();
                    }
                    else {
                        openItem(it);
                    }
                });
                list.appendChild(li);
            });
        }
        function popularityBoost(it) {
            if (!(config.analytics && config.analytics.enableLocal))
                return 0;
            try {
                const map = readCounts();
                let key;
                if (it && typeof it.id === 'string' && it.id.indexOf('go-search:') === 0) {
                    key = it.id; // exact query-specific counter for go-search suggestions
                }
                else if (it && it.type === 'go') {
                    key = 'go:' + it.label;
                }
                else if (it && it.type === 'cmd' && typeof it.id === 'string') {
                    key = it.id.replace(/^cmd:/, 'cmd:');
                }
                else {
                    key = 'link:' + it.label;
                }
                const c = map[key] || 0;
                return Math.min(5, c / 5);
            }
            catch (_) {
                return 0;
            }
        }
        function prefixBoost(q, it) {
            const qt = q.toLowerCase();
            return (it.searchText.startsWith(qt) ? 2 : 0);
        }
        function openItem(it) {
            if (config.analytics && config.analytics.enableLocal) {
                try {
                    if (it && it.type === 'go') {
                        incrementLocalCount('go:' + it.label);
                    }
                    else if (it && it.type === 'go-search' && typeof it.id === 'string') {
                        // Count the exact search query used from the Quick Launcher suggestion
                        incrementLocalCount(it.id);
                    }
                    else if (it && it.type === 'cmd' && typeof it.id === 'string') {
                        incrementLocalCount(it.id.replace(/^cmd:/, 'cmd:'));
                    }
                    else {
                        incrementLocalCount('link:' + it.label);
                    }
                }
                catch (_) { }
            }
            window.open(it.url, '_blank', 'noopener,noreferrer');
            close();
        }
        const debouncedRender = debounce(function () { renderResults(index, input.value); }, 120);
        input.addEventListener('input', debouncedRender);
        input.addEventListener('keydown', function (e) {
            if (matchesKey(e, cfg.keybinds.quickLauncherClose)) {
                e.preventDefault();
                close();
                return;
            }
            if (matchesKey(e, cfg.keybinds.quickLauncherNext)) {
                e.preventDefault();
                move(1);
                return;
            }
            if (matchesKey(e, cfg.keybinds.quickLauncherPrev)) {
                e.preventDefault();
                move(-1);
                return;
            }
            // Enter handling with Shift modifier for DSL
            if (e.key === 'Enter') {
                e.preventDefault();
                var sel = currentResults[selectedIndex];
                // If a command item is selected, run it (Shift opens all)
                if (sel && sel.type === 'cmd' && sel.__cmd) {
                    runCommandTargets(sel.__cmd, !!e.shiftKey, cfg);
                    close();
                    return;
                }
                // Otherwise prefer the selection if present
                if (sel) {
                    openItem(sel);
                    return;
                }
                // Fallback: parse and run as command if it resolves
                var q = input.value.trim();
                var parsed = q ? parseCommandDsl(q, cfg) : { targets: [] };
                if (parsed && parsed.targets && parsed.targets.length) {
                    runCommandTargets(parsed, !!e.shiftKey, cfg);
                    close();
                }
            }
        });
        overlay.addEventListener('click', function (e) { if (e.target === overlay)
            close(); });
        function move(delta) {
            if (!currentResults.length)
                return;
            const last = selectedIndex;
            selectedIndex = (selectedIndex + delta + currentResults.length) % currentResults.length;
            const prev = document.getElementById('ql-item-' + last);
            const next = document.getElementById('ql-item-' + selectedIndex);
            if (prev)
                prev.setAttribute('aria-selected', 'false');
            if (next) {
                next.setAttribute('aria-selected', 'true');
                next.scrollIntoView({ block: 'nearest' });
            }
        }
        function getMemoizedQuickLauncherIndex(cfg) {
            if (__qlIndexCache)
                return __qlIndexCache;
            __qlIndexCache = buildQuickLauncherIndex(cfg);
            return __qlIndexCache;
        }
        function buildQuickLauncherIndex(cfg) {
            const items = [];
            (cfg.sections || []).forEach(function (section) {
                (section.links || []).forEach(function (link) {
                    items.push({
                        id: 'link:' + (link.label || link.url),
                        label: link.label || link.url,
                        icon: link.icon || '🔗',
                        url: link.url,
                        type: 'link',
                        section: section.title || '',
                        searchText: [(link.label || ''), section.title || '', (link.url || '')].join(' ').toLowerCase()
                    });
                });
            });
            if (cfg.go && cfg.go.keyToUrl) {
                Object.keys(cfg.go.keyToUrl).forEach(function (key) {
                    items.push({
                        id: 'go:' + key,
                        label: key,
                        icon: '🏷️',
                        url: cfg.go.keyToUrl[key],
                        type: 'go',
                        section: 'go/',
                        searchText: ('go ' + key + ' ' + cfg.go.keyToUrl[key]).toLowerCase()
                    });
                });
            }
            return items;
        }
        // Expose for shortcut handler
        window.__openQuickLauncher = open;
        window.__closeQuickLauncher = close;
    }
    function fuzzyScore(query, text) {
        if (!query)
            return 1;
        const q = query.toLowerCase();
        const t = text.toLowerCase();
        let qi = 0, score = 0, streak = 0;
        for (let i = 0; i < t.length && qi < q.length; i++) {
            if (t[i] === q[qi]) {
                score += 1 + streak * 0.2;
                qi++;
                streak++;
            }
            else {
                streak = 0;
            }
        }
        if (qi < q.length)
            return 0; // not all chars matched in order
        // Prefix and whole-word boost
        if (t.startsWith(q))
            score += 2;
        return score;
    }
    // Debounce helper
    function debounce(fn, wait) {
        var t = null;
        return function () {
            var ctx = this, args = arguments;
            if (t)
                clearTimeout(t);
            t = window.setTimeout(function () { fn.apply(ctx, args); }, Math.max(0, wait | 0));
        };
    }
    function bindGlobalShortcuts(keys) {
        document.addEventListener('keydown', function (e) {
            const overlay = document.getElementById('quick-launcher');
            const isQlOpen = !!(overlay && overlay.classList.contains('is-open'));
            // When the Quick Launcher is open, swallow all global shortcuts except its explicit close key
            if (isQlOpen) {
                if (matchesKey(e, keys.quickLauncherClose)) {
                    e.preventDefault();
                    if (window.__closeQuickLauncher)
                        window.__closeQuickLauncher();
                }
                return;
            }
            // Open quick launcher — allow even when typing inside inputs
            if (matchesKey(e, keys.quickLauncherOpen)) {
                if (e.repeat) {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                if (window.__openQuickLauncher)
                    window.__openQuickLauncher();
                return;
            }
            if (isTypingInInput(e))
                return;
            // Focus Google
            if (matchesKey(e, keys.focusGoogle)) {
                const g = document.getElementById('googleQuery');
                if (g) {
                    e.preventDefault();
                    g.focus();
                }
                return;
            }
            // Focus go box
            if (matchesKey(e, keys.focusGo)) {
                const go = document.getElementById('goQuery');
                if (go) {
                    e.preventDefault();
                    go.focus();
                }
                return;
            }
            // Toggle theme
            if (matchesKey(e, keys.toggleTheme)) {
                e.preventDefault();
                toggleTheme(backgroundCycler);
            }
        });
    }
    // Key matching helper: supports 'Mod' (Ctrl/Cmd), Shift, Alt, single keys
    function matchesKey(e, def) {
        if (!def)
            return false;
        const parts = String(def).split('+');
        let needMod = false, needShift = false, needAlt = false, needCtrl = false, needMeta = false;
        let keyPart = null;
        parts.forEach(function (p) {
            const token = p.trim();
            if (!token)
                return;
            const low = token.toLowerCase();
            if (low === 'mod') {
                needMod = true;
            }
            else if (low === 'shift') {
                needShift = true;
            }
            else if (low === 'alt' || low === 'option') {
                needAlt = true;
            }
            else if (low === 'ctrl' || low === 'control') {
                needCtrl = true;
            }
            else if (low === 'cmd' || low === 'meta') {
                needMeta = true;
            }
            else {
                keyPart = token;
            }
        });
        const key = normalizeKey(e.key);
        const expected = keyPart ? normalizeKey(keyPart) : null;
        const modOk = needMod ? (e.ctrlKey || e.metaKey) : true;
        const ctrlOk = needCtrl ? e.ctrlKey : true;
        const metaOk = needMeta ? e.metaKey : true;
        const shiftOk = needShift ? e.shiftKey : true;
        const altOk = needAlt ? e.altKey : true;
        const keyOk = expected ? (key === expected) : true;
        return modOk && ctrlOk && metaOk && shiftOk && altOk && keyOk;
    }
    function normalizeKey(k) {
        if (!k)
            return '';
        const map = { 'Esc': 'Escape', 'Spacebar': ' ', 'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown', 'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight' };
        const std = map[k] || k;
        if (std.length === 1)
            return std.toLowerCase();
        return std;
    }
    function initKeybindsWidget(keys) {
        const fab = document.getElementById('kb-fab');
        const overlay = document.getElementById('kb-overlay');
        const closeBtn = document.getElementById('kb-close');
        const list = document.getElementById('kb-list');
        if (!fab || !overlay || !closeBtn || !list)
            return;
        const items = [
            { label: 'Open quick launcher', combo: keys.quickLauncherOpen },
            { label: 'Close quick launcher', combo: keys.quickLauncherClose },
            { label: 'Next result', combo: keys.quickLauncherNext },
            { label: 'Previous result', combo: keys.quickLauncherPrev },
            { label: 'Open selection', combo: keys.quickLauncherOpenInTab },
            { label: 'Toggle theme', combo: keys.toggleTheme },
            { label: 'Focus Google', combo: keys.focusGoogle },
            { label: 'Focus go/', combo: keys.focusGo }
        ];
        list.innerHTML = '';
        items.forEach(function (it) {
            const li = document.createElement('li');
            const label = document.createElement('div');
            label.className = 'kb-label';
            label.textContent = it.label;
            const keysEl = document.createElement('div');
            keysEl.className = 'kb-keys';
            keysEl.innerHTML = renderCombo(it.combo);
            li.appendChild(label);
            li.appendChild(keysEl);
            list.appendChild(li);
        });
        function open() { overlay.removeAttribute('hidden'); }
        function close() { overlay.setAttribute('hidden', ''); }
        fab.addEventListener('click', open);
        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', function (e) { if (e.target === overlay)
            close(); });
        document.addEventListener('keydown', function (e) { if (!overlay.hasAttribute('hidden') && e.key === 'Escape')
            close(); });
    }
    function renderCombo(combo) {
        if (!combo)
            return '';
        return combo.split('+').map(function (p) { return '<kbd>' + escapeHtml(p.trim()) + '</kbd>'; }).join(' + ');
    }
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]; });
    }
    function isTypingInInput(e) {
        const el = e.target;
        if (!el)
            return false;
        const tag = String(el.tagName || '').toLowerCase();
        const editable = !!el.isContentEditable;
        return editable || tag === 'input' || tag === 'textarea' || tag === 'select';
    }
    function setInitialFocus() {
        try {
            // Ensure nothing steals focus so global keybinds work immediately
            if (document.activeElement && typeof document.activeElement.blur === 'function') {
                document.activeElement.blur();
            }
            // Make body programmatically focusable and focus it
            if (document.body) {
                if (!document.body.hasAttribute('tabindex'))
                    document.body.setAttribute('tabindex', '-1');
                document.body.focus({ preventScroll: true });
            }
        }
        catch (_) { }
    }
    // Minimal PWA install prompt button logic
    function initPWAInstallPrompt() {
        try {
            var btn = document.getElementById('pwa-install');
            if (!btn)
                return;
            var deferred;
            window.addEventListener('beforeinstallprompt', function (e) {
                e.preventDefault();
                deferred = e;
                btn.removeAttribute('hidden');
            });
            btn.addEventListener('click', function () {
                if (!deferred)
                    return;
                deferred.prompt();
                deferred.userChoice.finally(function () { btn.setAttribute('hidden', ''); deferred = null; });
            });
        }
        catch (_) { }
    }
    function registerServiceWorker() {
        try {
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                    navigator.serviceWorker.register('sw.js').catch(function () { });
                });
            }
        }
        catch (_) { }
    }
    // ===== Local analytics (optional, localStorage only) =====
    function incrementLocalCount(key) {
        const map = readCounts();
        map[key] = (map[key] || 0) + 1;
        localStorage.setItem('analytics:counts', JSON.stringify(map));
    }
    function readCounts() {
        try {
            const raw = localStorage.getItem('analytics:counts');
            return raw ? JSON.parse(raw) : {};
        }
        catch (_) {
            return {};
        }
    }
})();
