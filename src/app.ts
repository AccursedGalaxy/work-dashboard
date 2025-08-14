(function () {
  let config: any;
  let backgroundCycler: { setTheme: (t: string) => void } | null = null;
  // ===== Command DSL helpers =====
  function normalizeSmartQuotes(s: string) {
    return String(s || '')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'");
  }

  function tokenizeCommand(input: string) {
    const text = normalizeSmartQuotes(input);
    const tokens = [];
    let current = '';
    let inSingle = false, inDouble = false, escaped = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === "'" && !inDouble) {
        inSingle = !inSingle;
        continue;
      }
      if (char === '"' && !inSingle) {
        inDouble = !inDouble;
        continue;
      }
      if (!inSingle && !inDouble && /\s/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }
      current += char;
    }
    if (current) tokens.push(current);
    return tokens;
  }

  function buildTokenRegexFromPatternToken(patternToken: string) {
    let out = '';
    let i = 0;
    while (i < patternToken.length) {
      if (patternToken[i] === '{') {
        const close = patternToken.indexOf('}', i);
        if (close === -1) {
          out += patternToken.slice(i);
          break;
        }
        out += '(.+?)';
        i = close + 1;
      } else {
        const char = patternToken[i];
        if (/[.*+?^${}()|[\]\\]/.test(char)) out += '\\' + char;
        else out += char;
        i++;
      }
    }
    return new RegExp('^' + out + '$');
  }

  function matchPattern(pattern: string, inputTokens: string[]) {
    const pTokens = tokenizeCommand(pattern);
    if (pTokens.length > inputTokens.length) return { ok: false };
    
    const vars: any = {};
    for (let j = 0; j < pTokens.length; j++) {
      const regex = buildTokenRegexFromPatternToken(pTokens[j]);
      const m2 = inputTokens[j].match(regex);
      if (!m2) return { ok: false };
      const varNames2 = (pTokens[j].match(/\{([^}]+)\}/g) || []).map(x => x.slice(1, -1).trim());
      for (let k2 = 0; k2 < varNames2.length; k2++) vars[varNames2[k2]] = m2[k2 + 1];
    }
    return { ok: true, vars: vars, usedTokens: pTokens.length };
  }

  function parseCommandSegment(segment: string, cfg: any) {
    const raw = String(segment || '').trim();
    if (!raw) return [];
    
    const dsl = (cfg && cfg.commandDsl) || {};
    const templates = (dsl && dsl.templates) || {};
    const macros = (dsl && dsl.macros) || {};
    const defaults = (dsl && dsl.defaults) || {};
    
    const tokens = tokenizeCommand(raw);
    if (!tokens.length) return [];
    
    // Special: go alias uses existing resolver
    if (tokens[0].toLowerCase() === 'go') {
      const key = tokens.slice(1).join(' ').trim();
      if (!key) return [];
      const href = resolveGoKey(cfg.go || {}, key);
      return [{ kind: 'url', label: 'go ' + key, url: href, icon: '🏷️' }];
    }
    
    // Shorthand: pr NUM using defaultRepo
    if (tokens[0].toLowerCase() === 'pr' && tokens.length === 2 && defaults.defaultRepo) {
      const num = tokens[1];
      const fullCmd = `gh ${defaults.defaultRepo} pr ${num}`;
      const recursed = parseCommandSegment(fullCmd, cfg);
      return recursed.length ? recursed : [];
    }
    
    // Try templates
    for (const pattern of Object.keys(templates)) {
      const result = matchPattern(pattern, tokens);
      if (result.ok && result.usedTokens === tokens.length) {
        let url = templates[pattern];
        for (const varName of Object.keys(result.vars)) {
          const val = result.vars[varName];
          if (varName === 'urlencode') continue; // special function
          url = url.replace(new RegExp(`\\{${varName}\\}`, 'g'), val);
        }
        // Handle urlencode function
        url = url.replace(/\{urlencode\(([^)]+)\)\}/g, (_, expr) => {
          const varName = expr.trim();
          return encodeURIComponent(result.vars[varName] || '');
        });
        return [{ kind: 'url', label: raw, url: url, icon: '🔗' }];
      }
    }
    
    // Try macros
    for (const pattern of Object.keys(macros)) {
      const result = matchPattern(pattern, tokens);
      if (result.ok && result.usedTokens === tokens.length) {
        const expansions = macros[pattern];
        const targets = [];
        for (const expansion of expansions) {
          let expanded = expansion;
          for (const varName of Object.keys(result.vars)) {
            expanded = expanded.replace(new RegExp(`\\{${varName}\\}`, 'g'), result.vars[varName]);
          }
          const subTargets = parseCommandSegment(expanded, cfg);
          targets.push(...subTargets);
        }
        return targets;
      }
    }
    
    return [];
  }

  function parseCommandDsl(raw: string, cfg: any) {
    const text = String(raw || '').trim();
    if (!text) return { targets: [], label: '' };
    
    // Split on '|' while honoring quotes and backslash escapes
    function splitPipes(s: string) {
      const out = [], cur = [''], inS = [false], inD = [false], esc = [false];
      let depth = 0;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (esc[depth]) { cur[depth] += ch; esc[depth] = false; continue; }
        if (ch === '\\') { esc[depth] = true; continue; }
        if (ch === '"' && !inS[depth]) { inD[depth] = !inD[depth]; continue; }
        if (ch === "'" && !inD[depth]) { inS[depth] = !inS[depth]; continue; }
        if (ch === '|' && !inS[depth] && !inD[depth]) {
          out.push(cur[depth].trim());
          cur[depth] = '';
          continue;
        }
        cur[depth] += ch;
      }
      if (cur[depth]) out.push(cur[depth].trim());
      return out.filter(Boolean);
    }
    
    const parts = splitPipes(text);
    const all = [];
    for (const part of parts) {
      const segTargets = parseCommandSegment(part, cfg);
      all.push(...segTargets);
    }
    return { targets: all, label: text };
  }

  function runCommandTargets(cmd: any, openAll: boolean, cfg: any) {
    const targets = (cmd && cmd.targets) || [];
    if (!targets.length) return;
    
    // Analytics for commands
    if ((config as any).analytics && (config as any).analytics.enableLocal) {
      try { 
        incrementLocalCount('cmd:' + (cmd.label || ''));
        
        // Learn partial patterns for smart suggestions
        learnCommandPatterns(cmd.label || '');
      } catch (_) { }
    }
    
    const toOpen = openAll ? targets : [targets[0]];
    for (const t of toOpen) {
      if (!t) continue;
      if (t.kind === 'url') {
        window.open(t.url, '_blank', 'noopener,noreferrer');
      } else if (t.kind === 'action' && t.action === 'timer') {
        startFocusTimer(typeof t.minutes === 'number' ? t.minutes : 25);
      }
    }
  }

  function startFocusTimer(minutes: number) {
    const ms = Math.max(1, Math.floor(minutes)) * 60 * 1000;
    // Timer implementation would go here
    console.log(`Starting ${minutes} minute focus timer`);
  }

  // ===== Smart Pattern Learning =====
  function learnCommandPatterns(commandText: string) {
    if (!commandText || commandText.length < 3) return;
    
    try {
      const patterns = readCommandPatterns();
      const command = commandText.trim();
      const now = Date.now();
      
      // Extract meaningful partial patterns (3+ chars, not just single words)
      const partials = extractPartialPatterns(command);
      
      for (const partial of partials) {
        if (!patterns[partial]) {
          patterns[partial] = [];
        }
        
        // Find existing entry for this command
        let entry = patterns[partial].find((e: any) => e.command === command);
        if (entry) {
          entry.count++;
          entry.lastUsed = now;
        } else {
          patterns[partial].push({
            command: command,
            count: 1,
            lastUsed: now
          });
        }
        
        // Keep only top 5 commands per partial pattern
        patterns[partial].sort((a: any, b: any) => b.count - a.count);
        patterns[partial] = patterns[partial].slice(0, 5);
      }
      
      // Clean up old patterns (older than 30 days with low usage)
      cleanupOldPatterns(patterns);
      
      localStorage.setItem('command-patterns', JSON.stringify(patterns));
    } catch (_) {}
  }

  function extractPartialPatterns(command: string): string[] {
    const partials = new Set<string>();
    const text = command.toLowerCase();
    
    // Extract meaningful substrings
    for (let i = 0; i <= text.length - 3; i++) {
      for (let j = i + 3; j <= text.length; j++) {
        const substring = text.slice(i, j);
        
        // Skip if starts/ends with special chars or spaces
        if (/^[^a-z0-9]|[^a-z0-9]$/.test(substring)) continue;
        
        // Include patterns that are likely search terms
        if (substring.length >= 3 && substring.length <= 15) {
          partials.add(substring);
        }
      }
    }
    
    // Also extract word-based patterns
    const words = text.match(/[a-z0-9]+/g) || [];
    for (const word of words) {
      if (word.length >= 3) {
        partials.add(word);
      }
    }
    
    return Array.from(partials);
  }

  function cleanupOldPatterns(patterns: any) {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    for (const partial of Object.keys(patterns)) {
      patterns[partial] = patterns[partial].filter((entry: any) => {
        // Keep if used recently OR has high usage
        return entry.lastUsed > thirtyDaysAgo || entry.count >= 5;
      });
      
      // Remove empty patterns
      if (patterns[partial].length === 0) {
        delete patterns[partial];
      }
    }
  }

  function readCommandPatterns() {
    try {
      const raw = localStorage.getItem('command-patterns');
      return raw ? JSON.parse(raw) : {};
    } catch (_) { 
      return {}; 
    }
  }

  function getLearnedCommandSuggestions(q: string, cfg: any) {
    const query = String(q || '').trim();
    if (!query) return [];
    
    try {
      const counts = readCounts();
      const patterns = readCommandPatterns();
      const qq = query.toLowerCase();
      const items = [];
      
      // First, check learned patterns for smart suggestions
      const patternSuggestions = getPatternBasedSuggestions(qq, patterns, cfg);
      items.push(...patternSuggestions);
      
      // Then, check traditional command history
      Object.keys(counts).forEach((key) => {
        if (key.indexOf('cmd:') !== 0) return;
        
        const label = key.slice(4);
        if (!label) return;
        
        // Avoid duplicating the exact typed command suggestion
        if (label.toLowerCase() === qq) return;
        
        const parsed = parseCommandDsl(label, cfg);
        if (!parsed || !parsed.targets || !parsed.targets.length) return;
        
        const count = counts[key] | 0;
        const base = label.toLowerCase();
        const score = fuzzyScore(qq, base) + (base.startsWith(qq) ? 2 : 0) + Math.min(5, count / 5);
        
        if (score <= 0) return;
        
        const first = parsed.targets[0];
        items.push({
          id: 'cmd:' + label,
          label: 'Run again: ' + label,
          icon: (first && first.icon) || '⚡',
          url: (first && first.url) || '',
          type: 'cmd',
          section: 'command',
          searchText: base,
          __cmd: parsed,
          __score: score
        });
      });
      
      items.sort((a, b) => (b.__score || 0) - (a.__score || 0));
      
      // Strip internal score before returning and cap to top 3
      return items.slice(0, 3).map((it) => {
        delete it.__score;
        return it;
      });
    } catch (_) {
      return [];
    }
  }

  function getPatternBasedSuggestions(query: string, patterns: any, cfg: any) {
    const suggestions = [];
    const now = Date.now();
    
    // Find patterns that match the query
    for (const partial of Object.keys(patterns)) {
      if (partial.includes(query) || query.includes(partial)) {
        const entries = patterns[partial];
        
        for (const entry of entries) {
          // Calculate pattern-based score
          const recencyBonus = Math.max(0, 5 - (now - entry.lastUsed) / (7 * 24 * 60 * 60 * 1000)); // Decay over 7 days
          const frequencyBonus = Math.min(10, entry.count);
          const matchQuality = partial === query ? 10 : (partial.startsWith(query) ? 5 : 2);
          const score = matchQuality + frequencyBonus + recencyBonus;
          
          // Parse the command to make sure it's still valid
          const parsed = parseCommandDsl(entry.command, cfg);
          if (!parsed || !parsed.targets || !parsed.targets.length) continue;
          
          const first = parsed.targets[0];
          suggestions.push({
            id: 'cmd:' + entry.command,
            label: entry.command,
            icon: (first && first.icon) || '💡',
            url: (first && first.url) || '',
            type: 'cmd',
            section: 'smart',
            searchText: entry.command.toLowerCase(),
            __cmd: parsed,
            __score: score
          });
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Build the runtime configuration by merging defaults, file-level, and user overrides, then initialize the dashboard.
   *
   * This performs the app startup: it composes the final `config` (deep-merged from built-in defaults, a file-provided config, and any user config on window), applies the initial theme, creates and wires the background cycler, renders link sections, binds forms and UI features (Google/Go forms, mini-browser, global shortcuts, quick launcher, keybind help), sets initial focus, and registers PWA/install and service worker hooks. Side effects include writing to global `config` and `backgroundCycler` and attaching many DOM event listeners.
   */
  function start() {
    const defaultConfig = (window as any).DASHBOARD_DEFAULT_CONFIG || {};
    const fileConfig = (window as any).__FILE_CONFIG__ || {};
    const userConfig = (window as any).DASHBOARD_CONFIG || {};
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
    applyUiConfig(config as any);
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

  if ((window as any).__CONFIG_PROMISE__ && typeof (window as any).__CONFIG_PROMISE__.then === 'function') {
    (window as any).__CONFIG_PROMISE__.then(function () { start(); }, function () { start(); });
  } else {
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
  function mergeDeep(...objs: any[]) {
    const result: any = {};
    for (const obj of objs) {
      if (!obj || typeof obj !== 'object') continue;
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (Array.isArray(value)) {
          result[key] = value.slice();
        } else if (value && typeof value === 'object') {
          result[key] = mergeDeep(result[key] || {}, value);
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  }

  function initTheme(preference: string) {
    const saved = localStorage.getItem('theme');
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (preference === 'auto' ? (systemDark ? 'dark' : 'light') : preference);
    setTheme(initial);
  }

  function setTheme(theme: string) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }

  function toggleTheme(backgroundCycler?: { setTheme: (t: string) => void }) {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    if (backgroundCycler) backgroundCycler.setTheme(next);
  }

  function bindThemeToggle(backgroundCycler: { setTheme: (t: string) => void }) {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', function () { toggleTheme(backgroundCycler); });
  }

  function createBackgroundCycler(bgCfg: any) {
    const cfg = Object.assign({ enable: true, cycleMs: 15000, transitionMs: 1200, randomize: true, light: [], dark: [] }, bgCfg || {});
    const container = ensureBackgroundDom(cfg.transitionMs);
    const layers = container.querySelectorAll('.bg-layer') as NodeListOf<HTMLElement>;
    const overlay = container.querySelector('.bg-overlay') as HTMLElement | null;
    let currentTheme = (document.documentElement.getAttribute('data-theme') || 'light');
    let timer: number | null = null;
    let images: string[] = [];
    let index = 0;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resolveList() {
      const list = Array.isArray(cfg[currentTheme]) ? cfg[currentTheme] : [];
      return list.filter(Boolean);
    }

    // Preload the next image to ensure smooth transition
    function preloadNext(src?: string) {
      try { if (!src) return; const img = new Image(); img.decoding = 'async' as any; (img as any).loading = 'eager'; img.src = src; } catch (_) {}
    }

    function applyImage(immediate: boolean) {
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
      (showEl as HTMLElement).style.backgroundImage = url;
      // Preload upcoming image
      const nextIdx = (index + 1) % images.length; preloadNext(images[nextIdx]);
      // Force reflow to ensure transition
      void (showEl as HTMLElement).offsetWidth;
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
      if (timer) clearInterval(timer);
      if (!cfg.enable || images.length === 0) return;
      if (reduceMotion) return; // respect prefers-reduced-motion: do not auto-cycle
      timer = window.setInterval(next, Math.max(3000, cfg.cycleMs | 0));
    }

    function next() {
      if (!images.length) return;
      index = (index + 1) % images.length;
      applyImage(false);
    }

    function setTheme(theme: string) {
      currentTheme = (theme === 'dark') ? 'dark' : 'light';
      images = resolveList();
      if (cfg.randomize) shuffle(images);
      index = 0;
      applyImage(true);
      schedule();
      container.setAttribute('data-theme', currentTheme);
    }

    function start() {
      images = resolveList();
      if (cfg.randomize) shuffle(images);
      index = 0;
      applyImage(true);
      schedule();
      container.setAttribute('data-theme', currentTheme);
    }

    function ensureBackgroundDom(transitionMs: number) {
      let el = document.getElementById('bg');
      if (!el) {
        el = document.createElement('div');
        el.id = 'bg';
        el.innerHTML = '<div class="bg-layer is-showing"></div><div class="bg-layer"></div><div class="bg-overlay"></div>';
        document.body.prepend(el);
      }
      (el as HTMLElement).style.setProperty('--bg-transition-ms', String(Math.max(200, transitionMs | 0)) + 'ms');
      return el as HTMLElement;
    }

    function shuffle(arr: string[]) {
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

  function renderSections(sections: any[]) {
    const grid = document.getElementById('linksGrid');
    if (!grid) return;
    grid.innerHTML = '';
    sections.forEach(section => {
      const card = document.createElement('div');
      card.className = 'card section-card';
      const header = document.createElement('div');
      header.className = 'section-header';
      header.textContent = section.title;
      const list = document.createElement('ul');
      list.className = 'links-list';
      (section.links || []).forEach((link: any) => {
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

        if ((config as any).analytics && (config as any).analytics.enableLocal) {
          a.addEventListener('click', function () {
            try { incrementLocalCount('link:' + (link.label || link.url)); } catch (_) {}
          });
        }
      });
      card.appendChild(header);
      card.appendChild(list);
      grid.appendChild(card);
    });
  }

  function bindGoogleForm(googleCfg: any) {
    const form = document.getElementById('googleForm');
    const input = document.getElementById('googleQuery') as HTMLInputElement | null;
    if (!form || !input) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const q = input.value.trim();
      const url = new URL(googleCfg.baseUrl);
      url.searchParams.set(googleCfg.queryParam || 'q', q);
      // Append any extra params (e.g., igu=1 to hint embeddable UI)
      if (googleCfg.extraParams && typeof googleCfg.extraParams === 'object') {
        Object.keys(googleCfg.extraParams).forEach(function (k) {
          const v = googleCfg.extraParams[k];
          if (v != null) url.searchParams.set(k, String(v));
        });
      }
      const frame = document.getElementById('mb-frame') as HTMLIFrameElement | null;
      const addr = document.getElementById('mb-url') as HTMLInputElement | null;
      const target = document.getElementById('mb-target') as HTMLSelectElement | null;
      const miniEnabled = !((config as any).miniBrowser && (config as any).miniBrowser.enable === false);
      if (target && !miniEnabled) { try { (target as any).value = 'tab'; } catch (_) {} }
      const href = url.toString();
      if (addr && miniEnabled) addr.value = href;
      if (target && target.value === 'tab') {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else if (frame && miniEnabled) {
        frame.src = href;
      } else {
        window.location.href = href;
      }

      if ((config as any).analytics && (config as any).analytics.enableLocal) {
        try { incrementLocalCount('search:google'); } catch (_) {}
      }
    });
  }

  function bindGoForm(goCfg: any) {
    const form = document.getElementById('goForm');
    const input = document.getElementById('goQuery') as HTMLInputElement | null;
    if (!form || !input) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const raw = input.value.trim();
      const frame = document.getElementById('mb-frame') as HTMLIFrameElement | null;
      const addr = document.getElementById('mb-url') as HTMLInputElement | null;
      const target = document.getElementById('mb-target') as HTMLSelectElement | null;
      const miniEnabled = !((config as any).miniBrowser && (config as any).miniBrowser.enable === false);
      if (target && !miniEnabled) { try { (target as any).value = 'tab'; } catch (_) {} }
      function openGoUrl(href: string) {
        if (addr && miniEnabled) addr.value = href;
        if (target && target.value === 'tab') {
          window.open(href, '_blank', 'noopener,noreferrer');
        } else if (frame && miniEnabled) {
          frame.src = href;
        } else {
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
      if ((config as any).analytics && (config as any).analytics.enableLocal) {
        try {
          const matched = findGoKey(goCfg, key);
          if (matched) {
            incrementLocalCount('go:' + matched);
          } else if (goCfg.fallbackSearchUrl) {
            // Count free-text intranet searches under go-search:QUERY
            incrementLocalCount('go-search:' + key);
          }
        } catch (_) {}
      }
      openGoUrl(resolved);
    });
  }

  function resolveGoKey(goCfg: any, key: string) {
    const map = goCfg.keyToUrl || {};
    const foundKey = Object.keys(map).find(k => k.toLowerCase() === key.toLowerCase());
    if (foundKey) return map[foundKey];
    if (goCfg.fallbackSearchUrl) return goCfg.fallbackSearchUrl + encodeURIComponent(key);
    return goCfg.homepageUrl;
  }

  function findGoKey(goCfg: any, key: string) {
    const map = goCfg.keyToUrl || {};
    const foundKey = Object.keys(map).find(function (k) { return k.toLowerCase() === String(key).toLowerCase(); });
    return foundKey || null;
  }

  function navigate(url: string) {
    window.location.href = url;
  }

  function bindMiniBrowser(miniCfg: any) {
    // If explicitly disabled, hide the UI and skip initialization
    if (miniCfg && miniCfg.enable === false) {
      const box = document.getElementById('mini-browser');
      if (box) box.setAttribute('hidden', '');
      return;
    }
    const input = document.getElementById('mb-url') as HTMLInputElement | null;
    const targetSel = document.getElementById('mb-target') as HTMLSelectElement | null;
    const frame = document.getElementById('mb-frame') as HTMLIFrameElement | null;
    const box = document.getElementById('mini-browser') as HTMLElement | null;
    const handleTL = document.getElementById('mb-resize-tl');
    if (!input || !frame) return;

    // Ensure iframe does not capture initial focus or tab order on load
    try { frame.setAttribute('tabindex', '-1'); } catch (_) {}

    // Initialize from config if provided
    if (miniCfg && typeof miniCfg.defaultUrl === 'string' && miniCfg.defaultUrl) {
      input.value = miniCfg.defaultUrl;
      frame.src = miniCfg.defaultUrl;
    }

    // When user presses Enter in the URL bar, open in chosen target
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const raw = input.value.trim();
      try {
        const u = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
        if (targetSel && targetSel.value === 'tab') {
          window.open(u.href, '_blank', 'noopener,noreferrer');
        } else if (frame) {
          frame.src = u.href;
        }
      } catch (err) {
        alert('Invalid URL');
      }
    });

    // Top-left resize handle (drag to resize bigger/smaller)
    if (box && handleTL) {
      let startX = 0, startY = 0, startW = 0, startH = 0;
      function onDown(e: MouseEvent) {
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        const rect = box.getBoundingClientRect();
        startW = rect.width;
        startH = rect.height;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp, { once: true } as any);
      }
      function onMove(e: MouseEvent) {
        const dx = startX - e.clientX; // dragging towards top-left increases dx/dy
        const dy = startY - e.clientY;
        const newW = Math.max(360, startW + dx);
        const newH = Math.max(260, startH + dy);
        (box as HTMLElement).style.width = newW + 'px';
        (box as HTMLElement).style.height = newH + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
      }
      handleTL.addEventListener('mousedown', onDown);
    }
  }

  // Apply optional UI overrides from configuration (non-destructive; keeps HTML defaults when unspecified)
  function applyUiConfig(cfg: any) {
    try {
      const ui = (cfg && (cfg as any).ui) || {};
      // go/ card title
      if (ui && typeof ui.goTitle === 'string' && ui.goTitle.trim()) {
        const form = document.getElementById('goForm');
        const card = form ? form.closest('.card') as HTMLElement | null : null;
        const h2 = card ? card.querySelector('h2') as HTMLElement | null : null;
        if (h2) h2.textContent = ui.goTitle;
      }
    } catch (_) { /* no-op */ }
  }

  // ===== Quick Launcher =====
  function initQuickLauncher(cfg: any) {
    const overlay = document.getElementById('quick-launcher');
    const input = document.getElementById('ql-input') as HTMLInputElement | null;
    const list = document.getElementById('ql-list');
    if (!overlay || !input || !list) return;

    // Memoized index cache must be declared before first use to avoid TDZ issues
    var __qlIndexCache: any[] | null = null;

    const index = getMemoizedQuickLauncherIndex(cfg);
    let currentResults: any[] = [];
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

    function renderResults(items: any[], query: string) {
      const q = query.trim();
      const scored = q ? items.map(function (it) {
        return { item: it, score: fuzzyScore(q, it.searchText) + popularityBoost(it) + prefixBoost(q, it) };
      }).filter(function (r) { return r.score > 0; }) : items.map(function (it) { return { item: it, score: popularityBoost(it) }; });
      scored.sort(function (a, b) { return b.score - a.score; });

      // Get smart command suggestions based on learned patterns
      const learned = q ? getLearnedCommandSuggestions(q, cfg) : [];

      // Dynamic go/ search suggestion
      let suggestion: any = null;
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

      // Combine results: smart suggestions first, then regular results, then go search
      currentResults = [];
      if (learned && learned.length) {
        currentResults = learned.concat(currentResults);
      }
      currentResults = currentResults.concat(scored.slice(0, 50).map(function (r) { return r.item; }));
      if (suggestion) currentResults.push(suggestion);
      selectedIndex = 0;
      list.innerHTML = '';
      currentResults.forEach(function (it, i) {
        const li = document.createElement('li');
        li.className = 'ql-item';
        li.id = 'ql-item-' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === selectedIndex));
        const icon = document.createElement('span'); icon.className = 'ql-icon'; icon.textContent = it.icon || '🔗';
        const label = document.createElement('span'); label.className = 'ql-label'; label.textContent = it.label;
        const meta = document.createElement('span'); meta.className = 'ql-meta'; meta.textContent = it.type === 'go' ? 'go/' : (it.section || ''); (meta as HTMLElement).style.opacity = '0.7'; (meta as HTMLElement).style.fontSize = '12px';
        li.appendChild(icon); li.appendChild(label); li.appendChild(meta);
        li.addEventListener('click', function () { openItem(it); });
        list.appendChild(li);
      });
    }

    function popularityBoost(it: any) {
      if (!((config as any).analytics && (config as any).analytics.enableLocal)) return 0;
      try {
        const map = readCounts();
        let key;
        if (it && typeof it.id === 'string' && it.id.indexOf('go-search:') === 0) {
          key = it.id; // exact query-specific counter for go-search suggestions
        } else if (it && it.type === 'go') {
          key = 'go:' + it.label;
        } else if (it && it.type === 'cmd' && typeof it.id === 'string') {
          key = it.id.replace(/^cmd:/, 'cmd:');
        } else {
          key = 'link:' + it.label;
        }
        const c = (map as any)[key] || 0;
        return Math.min(5, c / 5);
      } catch (_) { return 0; }
    }

    function prefixBoost(q: string, it: any) {
      const qt = q.toLowerCase();
      return (it.searchText.startsWith(qt) ? 2 : 0);
    }

    function openItem(it: any) {
      if ((config as any).analytics && (config as any).analytics.enableLocal) {
        try {
          if (it && it.type === 'go') {
            incrementLocalCount('go:' + it.label);
          } else if (it && it.type === 'go-search' && typeof it.id === 'string') {
            // Count the exact search query used from the Quick Launcher suggestion
            incrementLocalCount(it.id);
          } else if (it && it.type === 'cmd' && it.__cmd) {
            // Handle command execution
            runCommandTargets(it.__cmd, false, cfg);
            close();
            return;
          } else {
            incrementLocalCount('link:' + it.label);
          }
        } catch (_) {}
      }
      
      // Handle command execution even without analytics
      if (it && it.type === 'cmd' && it.__cmd) {
        runCommandTargets(it.__cmd, false, cfg);
        close();
        return;
      }
      
      window.open(it.url, '_blank', 'noopener,noreferrer');
      close();
    }

    const debouncedRender = debounce(function () { renderResults(index, input.value); }, 120);
    input.addEventListener('input', debouncedRender as any);
    input.addEventListener('keydown', function (e) {
      if (matchesKey(e as any, cfg.keybinds.quickLauncherClose)) { e.preventDefault(); close(); return; }
      if (matchesKey(e as any, cfg.keybinds.quickLauncherNext)) { e.preventDefault(); move(1); return; }
      if (matchesKey(e as any, cfg.keybinds.quickLauncherPrev)) { e.preventDefault(); move(-1); return; }
      if (matchesKey(e as any, cfg.keybinds.quickLauncherOpenInTab)) { 
        e.preventDefault(); 
        const sel = currentResults[selectedIndex];
        if (sel) {
          // Handle command execution with shift key (open all targets)
          if (sel.type === 'cmd' && sel.__cmd) {
            runCommandTargets(sel.__cmd, !!e.shiftKey, cfg);
            close();
            return;
          }
          // Otherwise prefer the selection if present
          if (sel) {
            openItem(sel);
            return;
          }
        }
        
        // Fallback: parse and run as command if it resolves
        const q = input.value.trim();
        const parsed = q ? parseCommandDsl(q, cfg) : { targets: [] };
        if (parsed && parsed.targets && parsed.targets.length) {
          runCommandTargets(parsed, !!e.shiftKey, cfg);
          close();
          return;
        }
        
        // Finally, try learned command suggestions based on history
        const learned = getLearnedCommandSuggestions(q, cfg);
        if (learned && learned.length && learned[0] && learned[0].__cmd) {
          runCommandTargets(learned[0].__cmd, !!e.shiftKey, cfg);
          close();
        }
      }
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    function move(delta: number) {
      if (!currentResults.length) return;
      const last = selectedIndex;
      selectedIndex = (selectedIndex + delta + currentResults.length) % currentResults.length;
      const prev = document.getElementById('ql-item-' + last);
      const next = document.getElementById('ql-item-' + selectedIndex);
      if (prev) prev.setAttribute('aria-selected', 'false');
      if (next) { next.setAttribute('aria-selected', 'true'); (next as HTMLElement).scrollIntoView({ block: 'nearest' }); }
    }

    function getMemoizedQuickLauncherIndex(cfg: any) {
      if (__qlIndexCache) return __qlIndexCache;
      __qlIndexCache = buildQuickLauncherIndex(cfg);
      return __qlIndexCache;
    }

    function buildQuickLauncherIndex(cfg: any) {
      const items: any[] = [];
      (cfg.sections || []).forEach(function (section: any) {
        (section.links || []).forEach(function (link: any) {
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
    (window as any).__openQuickLauncher = open;
    (window as any).__closeQuickLauncher = close;
  }

  function fuzzyScore(query: string, text: string) {
    if (!query) return 1;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0, score = 0, streak = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) { score += 1 + streak * 0.2; qi++; streak++; } else { streak = 0; }
    }
    if (qi < q.length) return 0; // not all chars matched in order
    // Prefix and whole-word boost
    if (t.startsWith(q)) score += 2;
    return score;
  }

  // Debounce helper
  function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
    var t: number | null = null;
    return function (this: any) {
      var ctx = this, args = arguments as unknown as Parameters<T>;
      if (t) clearTimeout(t);
      t = window.setTimeout(function () { fn.apply(ctx, args as any); }, Math.max(0, wait | 0));
    } as T;
  }

  function bindGlobalShortcuts(keys: any) {
    document.addEventListener('keydown', function (e) {
      const overlay = document.getElementById('quick-launcher');
      const isQlOpen = !!(overlay && overlay.classList.contains('is-open'));

      // When the Quick Launcher is open, swallow all global shortcuts except its explicit close key
      if (isQlOpen) {
        if (matchesKey(e as any, keys.quickLauncherClose)) {
          e.preventDefault();
          if ((window as any).__closeQuickLauncher) (window as any).__closeQuickLauncher();
        }
        return;
      }

      // Open quick launcher — allow even when typing inside inputs
      if (matchesKey(e, keys.quickLauncherOpen)) {
        if ((e as any).repeat) { e.preventDefault(); return; }
        e.preventDefault();
        if ((window as any).__openQuickLauncher) (window as any).__openQuickLauncher();
        return;
      }
      if (isTypingInInput(e)) return;
      // Focus Google
      if (matchesKey(e, keys.focusGoogle)) {
        const g = document.getElementById('googleQuery');
        if (g) { e.preventDefault(); (g as HTMLElement).focus(); }
        return;
      }
      // Focus go box
      if (matchesKey(e, keys.focusGo)) {
        const go = document.getElementById('goQuery');
        if (go) { e.preventDefault(); (go as HTMLElement).focus(); }
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
  function matchesKey(e: KeyboardEvent, def: string) {
    if (!def) return false;
    const parts = String(def).split('+');
    let needMod = false, needShift = false, needAlt = false, needCtrl = false, needMeta = false;
    let keyPart: string | null = null;
    parts.forEach(function (p) {
      const token = p.trim();
      if (!token) return;
      const low = token.toLowerCase();
      if (low === 'mod') { needMod = true; }
      else if (low === 'shift') { needShift = true; }
      else if (low === 'alt' || low === 'option') { needAlt = true; }
      else if (low === 'ctrl' || low === 'control') { needCtrl = true; }
      else if (low === 'cmd' || low === 'meta') { needMeta = true; }
      else { keyPart = token; }
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

  function normalizeKey(k: string) {
    if (!k) return '';
    const map: any = { 'Esc': 'Escape', 'Spacebar': ' ', 'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown', 'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight' };
    const std = map[k] || k;
    if (std.length === 1) return std.toLowerCase();
    return std;
  }

  function initKeybindsWidget(keys: any) {
    const fab = document.getElementById('kb-fab');
    const overlay = document.getElementById('kb-overlay');
    const closeBtn = document.getElementById('kb-close');
    const list = document.getElementById('kb-list');
    if (!fab || !overlay || !closeBtn || !list) return;

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
      const label = document.createElement('div'); label.className = 'kb-label'; label.textContent = it.label;
      const keysEl = document.createElement('div'); keysEl.className = 'kb-keys'; keysEl.innerHTML = renderCombo(it.combo);
      li.appendChild(label); li.appendChild(keysEl);
      list.appendChild(li);
    });

    function open() { overlay.removeAttribute('hidden'); }
    function close() { overlay.setAttribute('hidden', ''); }

    fab.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) { if (!overlay.hasAttribute('hidden') && e.key === 'Escape') close(); });
  }

  function renderCombo(combo: string) {
    if (!combo) return '';
    return combo.split('+').map(function (p) { return '<kbd>' + escapeHtml(p.trim()) + '</kbd>'; }).join(' + ');
  }

  function escapeHtml(s: string) {
    return String(s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'})[c]; });
  }

  function isTypingInInput(e: Event) {
    const el = e.target as any;
    if (!el) return false;
    const tag = String(el.tagName || '').toLowerCase();
    const editable = !!el.isContentEditable;
    return editable || tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function setInitialFocus() {
    try {
      // Ensure nothing steals focus so global keybinds work immediately
      if (document.activeElement && typeof (document.activeElement as any).blur === 'function') {
        (document.activeElement as any).blur();
      }
      // Make body programmatically focusable and focus it
      if (document.body) {
        if (!document.body.hasAttribute('tabindex')) document.body.setAttribute('tabindex', '-1');
        (document.body as any).focus({ preventScroll: true });
      }
    } catch (_) {}
  }

  // Minimal PWA install prompt button logic
  function initPWAInstallPrompt() {
    try {
      var btn = document.getElementById('pwa-install');
      if (!btn) return;
      var deferred: any;
      window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferred = e;
        btn.removeAttribute('hidden');
      });
      btn.addEventListener('click', function () {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.finally(function () { btn.setAttribute('hidden', ''); deferred = null; });
      });
    } catch (_) {}
  }

  function registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('sw.js').catch(function () {});
        });
      }
    } catch (_) {}
  }

  // ===== Local analytics (optional, localStorage only) =====
  function incrementLocalCount(key: string) {
    const map = readCounts() as any;
    map[key] = (map[key] || 0) + 1;
    localStorage.setItem('analytics:counts', JSON.stringify(map));
  }
  function readCounts() {
    try {
      const raw = localStorage.getItem('analytics:counts');
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  }
})();



