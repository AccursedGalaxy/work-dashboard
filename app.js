(function () {
  const defaultConfig = (window.DASHBOARD_DEFAULT_CONFIG || {});
  const userConfig = (window.DASHBOARD_CONFIG || {});
  const config = mergeDeep({
    theme: 'auto',
    google: { baseUrl: 'https://www.google.com/search', queryParam: 'q' },
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
  bindMiniBrowser();

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
    });
  }

  function bindGoForm(goCfg) {
    const form = document.getElementById('goForm');
    const input = document.getElementById('goQuery');
    if (!form || !input) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const raw = input.value.trim();
      if (!raw || raw === 'go/' || raw.toLowerCase() === 'go') {
        navigate(goCfg.homepageUrl);
        return;
      }
      const key = raw.startsWith('go/') ? raw.slice(3) : raw.startsWith('go ') ? raw.slice(3) : raw;
      const resolved = resolveGoKey(goCfg, key);
      navigate(resolved);
    });
  }

  function resolveGoKey(goCfg, key) {
    const map = goCfg.keyToUrl || {};
    const foundKey = Object.keys(map).find(k => k.toLowerCase() === key.toLowerCase());
    if (foundKey) return map[foundKey];
    if (goCfg.fallbackSearchUrl) return goCfg.fallbackSearchUrl + encodeURIComponent(key);
    return goCfg.homepageUrl;
  }

  function navigate(url) {
    window.location.href = url;
  }

  function bindMiniBrowser() {
    const input = document.getElementById('mb-url');
    const targetSel = document.getElementById('mb-target');
    const frame = document.getElementById('mb-frame');
    const box = document.getElementById('mini-browser');
    const handleTL = document.getElementById('mb-resize-tl');
    if (!input || !frame) return;

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
})();


