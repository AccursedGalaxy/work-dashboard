(function () {
  let config: any;
  let backgroundCycler: { setTheme: (t: string) => void } | null = null;
  /**
   * Build the runtime configuration by merging defaults, file-level, and user overrides, then initialize the dashboard.
   *
   * This performs the app startup: it composes the final `config` (deep-merged from built-in defaults, a file-provided config, and any user config on window), applies the initial theme, creates and wires the background cycler, renders link sections, binds forms and UI features (Google/Go forms, mini-browser, global shortcuts, quick launcher, keybind help), sets initial focus, and registers PWA/install and service worker hooks. Side effects include writing to global `config` and `backgroundCycler` and attaching many DOM event listeners.
   */
  function start() {
    const defaultConfig = (window as any).DASHBOARD_DEFAULT_CONFIG || {};
    const fileConfig = (window as any).__FILE_CONFIG__ || {};
    const userConfig = (window as any).DASHBOARD_CONFIG || {};
    // Compose the base configuration first (without runtime overrides)
    const baseConfig = mergeDeep({
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
      ]
    }, defaultConfig, fileConfig, userConfig);

    // If a hash-based override is present and valid, persist it and clear the hash; back up pre-override config
    const hashOverride = readConfigFromUrlHash();
    if (hashOverride && isPlainObject(hashOverride)) {
      const { valid, errors } = validateConfigObject(hashOverride);
      if (valid) {
        try { localStorage.setItem('config:backup', JSON.stringify(baseConfig)); } catch (_) {}
        try { localStorage.setItem('config:override', JSON.stringify(hashOverride)); } catch (_) {}
      } else {
        try { console.warn('Ignoring invalid #config override:', errors); } catch (_) {}
      }
      // Always clear any #config to avoid repeated application attempts
      clearConfigHashFromUrl();
    }
    const storedOverride = readStoredOverride();
    config = mergeDeep(baseConfig, storedOverride || {});

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
    initConfigManagementUI();
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
      timer = window.setInterval(next, Math.max(3000, (cfg.cycleMs as any) | 0));
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
      (el as HTMLElement).style.setProperty('--bg-transition-ms', String(Math.max(200, (transitionMs as any) | 0)) + 'ms');
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

      // Show regular results first; put dynamic go-search suggestion after them
      currentResults = scored.slice(0, 50).map(function (r) { return r.item; });
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
          } else {
            incrementLocalCount('link:' + it.label);
          }
        } catch (_) {}
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
      if (matchesKey(e as any, cfg.keybinds.quickLauncherOpenInTab)) { e.preventDefault(); if (currentResults[selectedIndex]) openItem(currentResults[selectedIndex]); }
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

  // ===== Config management (import/export/hash) =====
  function initConfigManagementUI() {
    const statusEl = document.getElementById('cfg-status');
    function setStatus(msg: string, isError?: boolean) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      if (isError) statusEl.classList.add('error'); else statusEl.classList.remove('error');
    }

    const exportFileBtn = document.getElementById('cfg-export-file');
    const exportUrlBtn = document.getElementById('cfg-export-url');
    const exportClipboardBtn = document.getElementById('cfg-export-clipboard');
    const importFileReplaceBtn = document.getElementById('cfg-import-file-replace');
    const importFileMergeBtn = document.getElementById('cfg-import-file-merge');
    const importClipboardReplaceBtn = document.getElementById('cfg-import-clipboard-replace');
    const importClipboardMergeBtn = document.getElementById('cfg-import-clipboard-merge');
    const loadFromUrlBtn = document.getElementById('cfg-load-url');
    const fileInput = document.getElementById('cfg-file-input') as HTMLInputElement | null;

    if (exportFileBtn) exportFileBtn.addEventListener('click', function () {
      try {
        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dashboard-config.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStatus('Config downloaded.');
      } catch (e) {
        setStatus('Export failed.', true);
      }
    });

    if (exportUrlBtn) exportUrlBtn.addEventListener('click', async function () {
      try {
        const json = JSON.stringify(config);
        const b64 = toBase64(json);
        const shareUrl = window.location.origin + window.location.pathname + '#config=' + encodeURIComponent(b64);
        await writeClipboardText(shareUrl);
        setStatus('Shareable URL copied to clipboard.');
      } catch (e) {
        setStatus('Failed to create share URL.', true);
      }
    });

    if (exportClipboardBtn) exportClipboardBtn.addEventListener('click', async function () {
      try {
        await writeClipboardText(JSON.stringify(config, null, 2));
        setStatus('Configuration JSON copied to clipboard.');
      } catch (e) {
        setStatus('Clipboard write failed.', true);
      }
    });

    let pendingMode: 'replace' | 'merge' = 'replace';
    function openFilePicker(mode: 'replace' | 'merge') {
      pendingMode = mode;
      if (!fileInput) return;
      fileInput.value = '';
      fileInput.click();
    }

    if (importFileReplaceBtn) importFileReplaceBtn.addEventListener('click', function () { openFilePicker('replace'); });
    if (importFileMergeBtn) importFileMergeBtn.addEventListener('click', function () { openFilePicker('merge'); });

    if (fileInput) fileInput.addEventListener('change', function () {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const text = String(reader.result || '');
          const obj = JSON.parse(text);
          handleImportedConfig(obj, pendingMode, 'file');
        } catch (e) {
          setStatus('Invalid JSON file.', true);
        }
      };
      reader.readAsText(f);
    });

    if (importClipboardReplaceBtn) importClipboardReplaceBtn.addEventListener('click', async function () {
      try {
        const text = await readClipboardText();
        const obj = JSON.parse(text);
        handleImportedConfig(obj, 'replace', 'clipboard');
      } catch (e) {
        setStatus('Clipboard read or JSON parse failed.', true);
      }
    });

    if (importClipboardMergeBtn) importClipboardMergeBtn.addEventListener('click', async function () {
      try {
        const text = await readClipboardText();
        const obj = JSON.parse(text);
        handleImportedConfig(obj, 'merge', 'clipboard');
      } catch (e) {
        setStatus('Clipboard read or JSON parse failed.', true);
      }
    });

    if (loadFromUrlBtn) loadFromUrlBtn.addEventListener('click', async function () {
      try {
        const found = readConfigFromUrlHash();
        if (found && isPlainObject(found)) {
          const ok = confirm('Apply configuration from current URL?\n\n' + summarizeConfig(found));
          if (ok) {
            applyRuntimeOverride(found, true);
            window.location.reload();
            return;
          }
        } else {
          const input = prompt('Paste URL containing #config=...');
          if (input) {
            const u = new URL(input);
            const parsed = readConfigFromHashString(u.hash || '');
            if (parsed && isPlainObject(parsed)) {
              const ok2 = confirm('Apply configuration from pasted URL?\n\n' + summarizeConfig(parsed));
              if (ok2) {
                applyRuntimeOverride(parsed, true);
                window.location.href = window.location.origin + window.location.pathname; // drop hash
                return;
              }
            } else {
              setStatus('No valid config found in URL.', true);
            }
          }
        }
      } catch (e) {
        setStatus('Failed to load from URL.', true);
      }
    });

    function handleImportedConfig(obj: any, mode: 'replace' | 'merge', source: string) {
      const valid = validateConfigObject(obj);
      if (!valid.valid) {
        setStatus('Validation failed: ' + valid.errors.join('; '), true);
        return;
      }
      const summary = summarizeConfig(obj);
      const ok = confirm((mode === 'replace' ? 'Replace' : 'Merge') + ' current configuration with imported ' + source + ' config?\n\n' + summary);
      if (!ok) return;
      applyRuntimeOverride(obj, mode === 'replace');
      window.location.reload();
    }
  }

  function writeClipboardText(text: string) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
    return Promise.resolve();
  }

  async function readClipboardText(): Promise<string> {
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      return navigator.clipboard.readText();
    }
    throw new Error('Clipboard API unavailable');
  }

  function applyRuntimeOverride(obj: any, replace: boolean) {
    try {
      const currentOverride = readStoredOverride();
      const nextOverride = replace ? obj : mergeDeep(currentOverride || {}, obj);
      try { localStorage.setItem('config:backup', JSON.stringify(config)); } catch (_) {}
      localStorage.setItem('config:override', JSON.stringify(nextOverride));
    } catch (_) {}
  }

  function readStoredOverride() {
    try {
      const raw = localStorage.getItem('config:override');
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function readConfigFromUrlHash(): any | null {
    return readConfigFromHashString(window.location.hash || '');
  }

  function readConfigFromHashString(hash: string): any | null {
    if (!hash) return null;
    const raw = String(hash || '');
    let b64: string | null = null;
    if (raw.indexOf('#config=') === 0) {
      b64 = raw.slice('#config='.length);
    } else if (raw.indexOf('#') === 0 && raw.indexOf('config=') !== -1) {
      const qs = new URLSearchParams(raw.slice(1));
      const v = qs.get('config');
      b64 = v || null;
    }
    if (!b64) return null;
    try {
      const json = fromBase64(decodeURIComponent(b64));
      const obj = JSON.parse(json);
      return obj && typeof obj === 'object' ? obj : null;
    } catch (_) { return null; }
  }

  function clearConfigHashFromUrl() {
    try {
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, document.title, window.location.origin + window.location.pathname + window.location.search);
      } else {
        window.location.hash = '';
      }
    } catch (_) {}
  }

  function toBase64(str: string) {
    try {
      if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(str)));
    } catch (_) {}
    // Fallback
    const utf8 = new TextEncoder().encode(str);
    let s = '';
    for (let i = 0; i < utf8.length; i++) s += String.fromCharCode(utf8[i]);
    return btoa(s);
  }

  function fromBase64(b64: string) {
    try {
      const s = atob(b64);
      // Decode UTF-8
      return decodeURIComponent(escape(s));
    } catch (_) {
      // Fallback
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
  }

  function validateConfigObject(obj: any): { valid: boolean, errors: string[] } {
    const errors: string[] = [];
    if (!obj || typeof obj !== 'object') return { valid: false, errors: ['Config must be an object'] };
    if (obj.theme && !['auto', 'light', 'dark'].includes(String(obj.theme))) errors.push('theme must be auto|light|dark');
    if (obj.google && typeof obj.google !== 'object') errors.push('google must be an object');
    if (obj.miniBrowser && typeof obj.miniBrowser !== 'object') errors.push('miniBrowser must be an object');
    if (obj.analytics && typeof obj.analytics !== 'object') errors.push('analytics must be an object');
    if (obj.keybinds && typeof obj.keybinds !== 'object') errors.push('keybinds must be an object');
    if (obj.go && typeof obj.go !== 'object') errors.push('go must be an object');
    if (obj.backgrounds && typeof obj.backgrounds !== 'object') errors.push('backgrounds must be an object');
    if (obj.sections && !Array.isArray(obj.sections)) errors.push('sections must be an array');
    if (Array.isArray(obj.sections)) {
      obj.sections.forEach(function (s: any, i: number) {
        if (!s || typeof s !== 'object') { errors.push('sections[' + i + '] must be an object'); return; }
        if (typeof s.title !== 'string') errors.push('sections[' + i + '].title must be a string');
        if (!Array.isArray(s.links)) errors.push('sections[' + i + '].links must be an array');
      });
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function summarizeConfig(obj: any) {
    try {
      const sections = Array.isArray(obj && obj.sections) ? obj.sections.length : 0;
      let links = 0;
      if (Array.isArray(obj && obj.sections)) {
        (obj.sections as any[]).forEach(function (s: any) { links += Array.isArray(s.links) ? s.links.length : 0; });
      }
      const theme = (obj && obj.theme) ? String(obj.theme) : 'auto';
      return 'Theme: ' + theme + '\nSections: ' + sections + '\nLinks: ' + links;
    } catch (_) { return 'Config summary unavailable'; }
  }

  function isPlainObject(v: any) { return !!(v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype); }

})();



