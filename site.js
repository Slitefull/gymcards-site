(function () {
  const root = document.documentElement;
  const LANGS = ['en', 'uk', 'pl', 'de', 'es', 'pt-BR'];
  const THEME_LABELS = {
    en: { dark: 'Switch to dark theme', light: 'Switch to light theme' },
    uk: { dark: 'Увімкнути темну тему', light: 'Увімкнути світлу тему' },
    pl: { dark: 'Włącz ciemny motyw', light: 'Włącz jasny motyw' },
    de: { dark: 'Dunkles Design einschalten', light: 'Helles Design einschalten' },
    es: { dark: 'Activar el tema oscuro', light: 'Activar el tema claro' },
    'pt-BR': { dark: 'Ativar o tema escuro', light: 'Ativar o tema claro' },
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

  function match(tag) {
    const code = String(tag || '').toLowerCase().split('-')[0];
    return LANGS.find((lang) => lang.toLowerCase().split('-')[0] === code);
  }

  function pickLang() {
    const query = match(new URLSearchParams(location.search).get('lang'));
    if (query) return query;
    const hash = location.hash.slice(1);
    if (LANGS.includes(hash)) return hash;
    const saved = load('lang');
    if (LANGS.includes(saved)) return saved;
    for (const tag of navigator.languages || [navigator.language]) {
      const lang = match(tag);
      if (lang) return lang;
    }
    return 'en';
  }

  function applyLang(lang) {
    root.dataset.lang = lang;
    root.lang = lang;
    const title = root.getAttribute('data-title-' + lang);
    if (title) document.title = title;
    for (const select of document.querySelectorAll('[data-set-lang]')) select.value = lang;
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
    toggle.setAttribute('aria-label', THEME_LABELS[root.dataset.lang][next]);
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

  document.addEventListener('change', (event) => {
    const select = event.target instanceof Element ? event.target.closest('[data-set-lang]') : null;
    if (!select || !LANGS.includes(select.value)) return;
    lang = select.value;
    save('lang', lang);
    applyLang(lang);
    applyThemeLabel();
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-toggle-theme]')) {
      const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      save('theme', next);
      applyThemeLabel();
    }
  });
})();
