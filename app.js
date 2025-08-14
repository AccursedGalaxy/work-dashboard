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
  bindThemeToggle();
  renderSections(config.sections);
  bindGoogleForm(config.google);
  bindGoForm(config.go);

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

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
  }

  function bindThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggleTheme);
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
      window.location.href = url.toString();
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
})();


