/* Language and theme switchers for the Gym Cards pages.
 *
 * Loaded synchronously from <head>, so the saved theme and language are on the
 * <html> element before the first paint — a deferred script would flash the
 * light theme at a reader who chose dark. The buttons are wired once the DOM
 * exists.
 *
 * Without JavaScript nothing here runs: both languages stay on the page, one
 * after the other, and the switchers are hidden by CSS, since they would not
 * work. */
(function () {
  var root = document.documentElement;
  var LANGS = ['en', 'uk'];

  // localStorage throws in some private modes and blocked-storage settings;
  // the page must still work, just without remembering.
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* not remembered */ }
  }

  function pickLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (LANGS.indexOf(q) >= 0) return q;
    // Store listings and older links point at privacy.html#uk.
    if (location.hash === '#uk') return 'uk';
    var saved = load('lang');
    if (LANGS.indexOf(saved) >= 0) return saved;
    return /^uk\b/i.test(navigator.language || '') ? 'uk' : 'en';
  }

  function applyLang(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    var title = root.getAttribute('data-title-' + lang);
    if (title) document.title = title;
    var buttons = document.querySelectorAll('[data-set-lang]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-set-lang') === lang));
    }
  }

  function effectiveTheme() {
    var forced = root.getAttribute('data-theme');
    if (forced === 'light' || forced === 'dark') return forced;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyThemeLabel() {
    var toggle = document.querySelector('[data-toggle-theme]');
    if (!toggle) return;
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    var uk = root.getAttribute('data-lang') === 'uk';
    toggle.setAttribute('aria-label', uk
      ? (next === 'dark' ? 'Увімкнути темну тему' : 'Увімкнути світлу тему')
      : (next === 'dark' ? 'Switch to dark theme' : 'Switch to light theme'));
  }

  // Before first paint.
  var savedTheme = load('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') root.setAttribute('data-theme', savedTheme);
  var lang = pickLang();
  root.setAttribute('data-lang', lang);
  root.setAttribute('lang', lang);

  document.addEventListener('DOMContentLoaded', function () {
    applyLang(lang);
    applyThemeLabel();
  });

  document.addEventListener('click', function (e) {
    var target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    var langButton = target.closest('[data-set-lang]');
    if (langButton) {
      lang = langButton.getAttribute('data-set-lang');
      save('lang', lang);
      applyLang(lang);
      applyThemeLabel();
      return;
    }
    if (target.closest('[data-toggle-theme]')) {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      save('theme', next);
      applyThemeLabel();
    }
  });
})();
