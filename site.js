(function () {
  const root = document.documentElement;
  const LANGS = ['en', 'uk'];
  const THEME_LABELS = {
    en: { dark: 'Switch to dark theme', light: 'Switch to light theme' },
    uk: { dark: 'Увімкнути темну тему', light: 'Увімкнути світлу тему' },
  };

  function load(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function pickLang() {
    const query = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(query)) return query;
    if (location.hash === '#uk') return 'uk';
    const saved = load('lang');
    if (LANGS.includes(saved)) return saved;
    return /^uk\b/i.test(navigator.language || '') ? 'uk' : 'en';
  }

  function applyLang(lang) {
    root.dataset.lang = lang;
    root.lang = lang;
    const title = root.getAttribute('data-title-' + lang);
    if (title) document.title = title;
    for (const button of document.querySelectorAll('[data-set-lang]')) {
      button.setAttribute('aria-pressed', String(button.dataset.setLang === lang));
    }
  }

  function effectiveTheme() {
    const forced = root.dataset.theme;
    if (forced === 'light' || forced === 'dark') return forced;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyThemeLabel() {
    const toggle = document.querySelector('[data-toggle-theme]');
    if (!toggle) return;
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    const labels = THEME_LABELS[root.dataset.lang === 'uk' ? 'uk' : 'en'];
    toggle.setAttribute('aria-label', labels[next]);
  }

  const savedTheme = load('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
  let lang = pickLang();
  root.dataset.lang = lang;
  root.lang = lang;

  document.addEventListener('DOMContentLoaded', () => {
    applyLang(lang);
    applyThemeLabel();
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const langButton = target?.closest('[data-set-lang]');
    if (langButton) {
      lang = langButton.dataset.setLang;
      save('lang', lang);
      applyLang(lang);
      applyThemeLabel();
      return;
    }
    if (target?.closest('[data-toggle-theme]')) {
      const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      save('theme', next);
      applyThemeLabel();
    }
  });
})();
