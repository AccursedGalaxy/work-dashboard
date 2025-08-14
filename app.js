(function () {
  const defaultConfig = (window.DASHBOARD_DEFAULT_CONFIG || {});
  const userConfig = (window.DASHBOARD_CONFIG || {});
  const config = mergeDeep({
    theme: 'auto',
    google: { baseUrl: 'https://www.google.com/search', queryParam: 'q' },
    miniBrowser: { defaultUrl: 'https://www.google.com/webhp?igu=1' },
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
  }, defaultConfig, userConfig);

  initTheme(config.theme);
  const backgroundCycler = createBackgroundCycler(config.backgrounds);
  bindThemeToggle(backgroundCycler);
  renderSections(config.sections);
  bindGoogleForm(config.google);
  bindGoForm(config.go);
  bindMiniBrowser(config.miniBrowser);
  bindGlobalShortcuts(config.keybinds);
  initQuickLauncher(config);
  initKeybindsWidget(config.keybinds);
  setInitialFocus();

  function mergeDeep() {
    const result = {};
    for (const obj of arguments) {
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
    if (backgroundCycler) backgroundCycler.setTheme(next);
  }

  function bindThemeToggle(backgroundCycler) {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', function () { toggleTheme(backgroundCycler); });
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
      // Force reflow to ensure transition
      void showEl.offsetWidth;
      showEl.classList.add('is-showing');
      hideEl.classList.remove('is-showing');
      if (immediate) {
        const prevA = a.style.transition;
        const prevB = b.style.transition;
        a.style.transition = 'none';
        b.style.transition = 'none';
        requestAnimationFrame(function () {
          showEl.classList.add('is-showing');
          hideEl.classList.remove('is-showing');
          requestAnimationFrame(function () {
            a.style.transition = prevA;
            b.style.transition = prevB;
          });
        });
      }
    }

    function schedule() {
      if (timer) clearInterval(timer);
      if (!cfg.enable || images.length === 0) return;
      if (reduceMotion) return; // respect prefers-reduced-motion: do not auto-cycle
      timer = setInterval(next, Math.max(3000, cfg.cycleMs | 0));
    }

    function next() {
      if (!images.length) return;
      index = (index + 1) % images.length;
      applyImage(false);
    }

    function setTheme(theme) {
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
      (section.links || []).forEach(link => {
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
            try { incrementLocalCount('link:' + (link.label || link.url)); } catch (_) {}
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
      const frame = document.getElementById('mb-frame');
      const addr = document.getElementById('mb-url');
      const target = document.getElementById('mb-target');
      const href = url.toString();
      if (addr) addr.value = href;
      if (target && target.value === 'tab') {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else if (frame) {
        frame.src = href;
      } else {
        window.location.href = href;
      }

      if (config.analytics && config.analytics.enableLocal) {
        try { incrementLocalCount('search:google'); } catch (_) {}
      }
    });
  }

  function bindGoForm(goCfg) {
    const form = document.getElementById('goForm');
    const input = document.getElementById('goQuery');
    if (!form || !input) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const raw = input.value.trim();
      const frame = document.getElementById('mb-frame');
      const addr = document.getElementById('mb-url');
      const target = document.getElementById('mb-target');
      function openGoUrl(href) {
        if (addr) addr.value = href;
        if (target && target.value === 'tab') {
          window.open(href, '_blank', 'noopener,noreferrer');
        } else if (frame) {
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
      if (config.analytics && config.analytics.enableLocal) {
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

  function resolveGoKey(goCfg, key) {
    const map = goCfg.keyToUrl || {};
    const foundKey = Object.keys(map).find(k => k.toLowerCase() === key.toLowerCase());
    if (foundKey) return map[foundKey];
    if (goCfg.fallbackSearchUrl) return goCfg.fallbackSearchUrl + encodeURIComponent(key);
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

  function bindMiniBrowser(miniCfg) {
    const input = document.getElementById('mb-url');
    const targetSel = document.getElementById('mb-target');
    const frame = document.getElementById('mb-frame');
    const box = document.getElementById('mini-browser');
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

  // ===== Quick Launcher =====
  function initQuickLauncher(cfg) {
    const overlay = document.getElementById('quick-launcher');
    const input = document.getElementById('ql-input');
    const list = document.getElementById('ql-list');
    if (!overlay || !input || !list) return;

    const index = buildQuickLauncherIndex(cfg);
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

      currentResults = (suggestion ? [suggestion] : []).concat(scored.slice(0, 50).map(function (r) { return r.item; }));
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
        const meta = document.createElement('span'); meta.className = 'ql-meta'; meta.textContent = it.type === 'go' ? 'go/' : (it.section || ''); meta.style.opacity = '0.7'; meta.style.fontSize = '12px';
        li.appendChild(icon); li.appendChild(label); li.appendChild(meta);
        li.addEventListener('click', function () { openItem(it); });
        list.appendChild(li);
      });
    }

    function popularityBoost(it) {
      if (!(cfg.analytics && cfg.analytics.enableLocal)) return 0;
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
        const c = map[key] || 0;
        return Math.min(5, c / 5);
      } catch (_) { return 0; }
    }

    function prefixBoost(q, it) {
      const qt = q.toLowerCase();
      return (it.searchText.startsWith(qt) ? 2 : 0);
    }

    function openItem(it) {
      if (cfg.analytics && cfg.analytics.enableLocal) {
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

    input.addEventListener('input', function () { renderResults(index, input.value); });
    input.addEventListener('keydown', function (e) {
      if (matchesKey(e, cfg.keybinds.quickLauncherClose)) { e.preventDefault(); close(); return; }
      if (matchesKey(e, cfg.keybinds.quickLauncherNext)) { e.preventDefault(); move(1); return; }
      if (matchesKey(e, cfg.keybinds.quickLauncherPrev)) { e.preventDefault(); move(-1); return; }
      if (matchesKey(e, cfg.keybinds.quickLauncherOpenInTab)) { e.preventDefault(); if (currentResults[selectedIndex]) openItem(currentResults[selectedIndex]); }
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    function move(delta) {
      if (!currentResults.length) return;
      const last = selectedIndex;
      selectedIndex = (selectedIndex + delta + currentResults.length) % currentResults.length;
      const prev = document.getElementById('ql-item-' + last);
      const next = document.getElementById('ql-item-' + selectedIndex);
      if (prev) prev.setAttribute('aria-selected', 'false');
      if (next) { next.setAttribute('aria-selected', 'true'); next.scrollIntoView({ block: 'nearest' }); }
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

  function bindGlobalShortcuts(keys) {
    document.addEventListener('keydown', function (e) {
      // Open/close quick launcher — allow even when typing inside inputs
      if (matchesKey(e, keys.quickLauncherOpen)) {
        e.preventDefault();
        var overlay = document.getElementById('quick-launcher');
        if (overlay && overlay.classList.contains('is-open')) {
          if (window.__closeQuickLauncher) window.__closeQuickLauncher();
        } else {
          if (window.__openQuickLauncher) window.__openQuickLauncher();
        }
        return;
      }
      if (isTypingInInput(e)) return;
      // Focus Google
      if (matchesKey(e, keys.focusGoogle)) {
        const g = document.getElementById('googleQuery');
        if (g) { e.preventDefault(); g.focus(); }
        return;
      }
      // Focus go box
      if (matchesKey(e, keys.focusGo)) {
        const go = document.getElementById('goQuery');
        if (go) { e.preventDefault(); go.focus(); }
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
    if (!def) return false;
    const parts = String(def).split('+');
    let needMod = false, needShift = false, needAlt = false, needCtrl = false, needMeta = false;
    let keyPart = null;
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

  function normalizeKey(k) {
    if (!k) return '';
    const map = { 'Esc': 'Escape', 'Spacebar': ' ', 'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown', 'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight' };
    const std = map[k] || k;
    if (std.length === 1) return std.toLowerCase();
    return std;
  }

  function initKeybindsWidget(keys) {
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

  function renderCombo(combo) {
    if (!combo) return '';
    return combo.split('+').map(function (p) { return '<kbd>' + escapeHtml(p.trim()) + '</kbd>'; }).join(' + ');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'})[c]; });
  }

  function isTypingInInput(e) {
    const el = e.target;
    if (!el) return false;
    const tag = String(el.tagName || '').toLowerCase();
    const editable = el.isContentEditable;
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
        if (!document.body.hasAttribute('tabindex')) document.body.setAttribute('tabindex', '-1');
        document.body.focus({ preventScroll: true });
      }
    } catch (_) {}
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
    } catch (_) { return {}; }
  }
})();


