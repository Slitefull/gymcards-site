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
  const UI_LABELS = {
    en: { menu: 'Menu', viewer: 'Screenshot', close: 'Close', prev: 'Previous screenshot', next: 'Next screenshot' },
    uk: { menu: 'Меню', viewer: 'Скріншот', close: 'Закрити', prev: 'Попередній скріншот', next: 'Наступний скріншот' },
    pl: { menu: 'Menu', viewer: 'Zrzut ekranu', close: 'Zamknij', prev: 'Poprzedni zrzut', next: 'Następny zrzut' },
    de: { menu: 'Menü', viewer: 'Screenshot', close: 'Schließen', prev: 'Vorheriger Screenshot', next: 'Nächster Screenshot' },
    es: { menu: 'Menú', viewer: 'Captura', close: 'Cerrar', prev: 'Captura anterior', next: 'Captura siguiente' },
    'pt-BR': { menu: 'Menu', viewer: 'Captura de tela', close: 'Fechar', prev: 'Captura anterior', next: 'Próxima captura' },
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
    for (const button of document.querySelectorAll('[data-menu]')) button.setAttribute('aria-label', ui().menu);
    renderChangelog(lang);
    markShots();
  }

  function ui() {
    return UI_LABELS[root.dataset.lang] || UI_LABELS.en;
  }

  let changelog = null;
  let scrolled = false;

  function changelogData() {
    if (changelog === null) {
      const node = document.getElementById('changelog-data');
      changelog = node ? JSON.parse(node.textContent) : false;
    }
    return changelog;
  }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const child of children || []) node.append(child);
    return node;
  }

  function formatDate(value, lang) {
    const [y, m, d] = value.split('-').map(Number);
    const options = d
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : { month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat(lang, options).format(new Date(y, m - 1, d || 1));
  }

  function fact(value, label) {
    return el('div', { className: 'fact' }, [
      el('b', { textContent: String(value) }),
      el('span', { textContent: label }),
    ]);
  }

  function figure(shot, lang) {
    const caption = shot[lang] || shot.en;
    return el('figure', {}, [
      el('img', { className: 'shot', src: shot.src, alt: caption, loading: 'lazy', width: 540, height: 1174 }),
      el('figcaption', { textContent: caption }),
    ]);
  }

  function release(entry, lang, labels) {
    const text = entry[lang] || entry.en;
    const minor = entry.kind === 'ota';
    let version = entry.id;
    if (minor) version = labels.on.replace('{v}', entry.on);
    else if (entry.build) version += ' · ' + labels.build.replace('{n}', entry.build);
    const when = entry.date
      ? el('time', { dateTime: entry.date, textContent: formatDate(entry.date, lang) })
      : el('span', { className: 'when', textContent: labels.next });
    const body = el('div', {}, [
      el('div', { className: 'release-head' }, [
        el('span', { className: 'version', textContent: version }),
        el('span', { className: 'status ' + entry.kind, textContent: labels[entry.kind] }),
      ]),
      el('h2', { textContent: text.title }),
      when,
      el('ul', { className: 'detail' }, text.notes.map((note) => el('li', { textContent: note }))),
    ]);
    const children = [body];
    if (entry.shots.length > 0) {
      children.push(el('div', { className: 'shots' }, entry.shots.map((shot) => figure(shot, lang))));
    }
    const layout = entry.shots.length > 2 ? ' wide' : '';
    const node = el('section', {
      className: minor ? 'release minor' : 'release' + layout,
      id: 'v' + entry.id.replace(/\./g, '-'),
    }, children);
    node.dataset.kind = entry.kind;
    return node;
  }

  let filter = 'all';

  function updateStrip(strip) {
    strip.classList.toggle('more', strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 4);
  }

  function markStrips() {
    for (const strip of document.querySelectorAll('.release.wide .shots, .release.minor .shots')) {
      updateStrip(strip);
      if (strip.dataset.watched) continue;
      strip.dataset.watched = '1';
      strip.addEventListener('scroll', () => updateStrip(strip), { passive: true });
    }
  }

  addEventListener('resize', markStrips);

  function renderFilters(labels) {
    const bar = document.getElementById('changelog-filters');
    if (!bar) return;
    bar.setAttribute('aria-label', labels.filters);
    const options = [
      ['all', labels.all],
      ['versions', labels.facts.versions],
      ['ota', labels.facts.updates],
    ];
    bar.replaceChildren(
      ...options.map(([value, text]) => {
        const button = el('button', { type: 'button', textContent: text });
        button.dataset.filter = value;
        button.setAttribute('aria-pressed', String(value === filter));
        return button;
      }),
    );
  }

  function applyFilter(value) {
    const list = document.getElementById('changelog');
    if (!list) return;
    filter = value;
    list.dataset.filter = value;
    for (const button of document.querySelectorAll('#changelog-filters [data-filter]')) {
      button.setAttribute('aria-pressed', String(button.dataset.filter === value));
    }
    list.classList.remove('swapped');
    requestAnimationFrame(() => list.classList.add('swapped'));
  }

  function renderChangelog(lang) {
    const data = changelogData();
    const list = document.getElementById('changelog');
    if (!data || !list) return;
    const labels = data.labels[lang] || data.labels.en;
    list.replaceChildren(...data.entries.map((entry) => release(entry, lang, labels)));
    list.dataset.filter = filter;
    renderFilters(labels);
    markStrips();
    const facts = document.getElementById('changelog-facts');
    if (facts) {
      facts.replaceChildren(
        fact(data.entries.filter((entry) => entry.kind !== 'ota').length, labels.facts.versions),
        fact(data.entries.filter((entry) => entry.kind === 'ota').length, labels.facts.updates),
        fact(data.languages.length, labels.facts.languages),
      );
    }
    if (!scrolled) {
      scrolled = true;
      const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
      if (target) target.scrollIntoView();
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
    toggle.setAttribute('aria-label', THEME_LABELS[root.dataset.lang][next]);
  }

  const savedTheme = load('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
  let lang = pickLang();
  root.dataset.lang = lang;
  root.lang = lang;

  function calm() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function tiltDeck(deck) {
    const hero = deck.closest('.hero') || deck;
    let frame = 0;
    hero.addEventListener('pointermove', (event) => {
      const box = hero.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        deck.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
        deck.style.setProperty('--rx', (y * -8).toFixed(2) + 'deg');
      });
    });
    hero.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      deck.style.setProperty('--ry', '0deg');
      deck.style.setProperty('--rx', '0deg');
    });
  }

  function markShots() {
    for (const img of document.querySelectorAll('img.shot:not([tabindex])')) {
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-haspopup', 'dialog');
    }
  }

  const viewer = { items: [], index: 0, busy: false };

  function captionOf(shot) {
    return shot.closest('figure')?.querySelector('figcaption')?.textContent || shot.alt;
  }

  function fullSrc(shot) {
    return shot.getAttribute('src').replace(/^shots\//, 'shots/full/');
  }

  function flight(from, to) {
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`;
  }

  function buildViewer() {
    if (viewer.dialog) return viewer.dialog;
    const button = (className, act) => {
      const node = el('button', { type: 'button', className }, [el('span')]);
      node.dataset.act = act;
      return node;
    };
    viewer.image = el('img', { className: 'viewer-img', alt: '', width: 540, height: 1174, draggable: false });
    viewer.caption = el('p', { className: 'viewer-caption' });
    viewer.close = button('viewer-close', 'close');
    viewer.prev = button('viewer-step prev', 'prev');
    viewer.next = button('viewer-step next', 'next');
    viewer.thumbs = el('div', { className: 'viewer-thumbs' });
    viewer.scrim = el('div', { className: 'viewer-scrim' });
    viewer.stage = el('div', { className: 'viewer-stage' }, [viewer.image]);
    viewer.chrome = [
      el('div', { className: 'viewer-top' }, [viewer.caption, viewer.close]),
      el('div', { className: 'viewer-nav' }, [viewer.prev, viewer.thumbs, viewer.next]),
    ];
    const dialog = el('dialog', { className: 'viewer' }, [viewer.scrim, viewer.chrome[0], viewer.stage, viewer.chrome[1]]);
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeViewer();
    });
    dialog.addEventListener('close', () => {
      for (const part of [viewer.image, viewer.scrim, ...viewer.chrome]) {
        for (const animation of part.getAnimations()) animation.cancel();
        part.style.transform = '';
        part.style.opacity = '';
      }
      const shot = viewer.items[viewer.index];
      viewer.busy = false;
      viewer.items = [];
      shot?.focus({ preventScroll: true });
    });
    dialog.addEventListener('click', (event) => {
      const act = event.target.closest('[data-act]')?.dataset.act;
      if (act === 'close') closeViewer();
      else if (act === 'prev') step(-1);
      else if (act === 'next') step(1);
      else if (act === 'thumb') step(Number(event.target.closest('[data-index]').dataset.index) - viewer.index);
      else if (event.target === dialog || event.target === viewer.stage || event.target === viewer.scrim) closeViewer();
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    });
    swipe(dialog);
    document.body.append(dialog);
    viewer.dialog = dialog;
    return dialog;
  }

  function labelViewer() {
    const labels = ui();
    viewer.dialog.setAttribute('aria-label', labels.viewer);
    viewer.close.setAttribute('aria-label', labels.close);
    viewer.prev.setAttribute('aria-label', labels.prev);
    viewer.next.setAttribute('aria-label', labels.next);
  }

  function show(index) {
    const shot = viewer.items[index];
    viewer.index = index;
    viewer.image.src = shot.currentSrc || shot.src;
    viewer.image.alt = shot.alt;
    viewer.caption.textContent = captionOf(shot);
    viewer.prev.disabled = index === 0;
    viewer.next.disabled = index === viewer.items.length - 1;
    for (const thumb of viewer.thumbs.children) {
      thumb.setAttribute('aria-current', String(Number(thumb.dataset.index) === index));
    }
    const full = new Image();
    full.addEventListener('load', () => {
      if (viewer.items[viewer.index] === shot) viewer.image.src = full.src;
    });
    full.src = fullSrc(shot);
  }

  function openViewer(shot) {
    const scope = shot.closest('.release, section') || document.body;
    const items = [...scope.querySelectorAll('img.shot')].filter((node) => node.getClientRects().length > 0);
    const dialog = buildViewer();
    labelViewer();
    viewer.items = items;
    viewer.thumbs.replaceChildren(
      ...items.map((item, index) => {
        const thumb = el('button', { type: 'button', className: 'viewer-thumb' }, [
          el('img', { src: item.currentSrc || item.src, alt: '', width: 540, height: 1174 }),
        ]);
        thumb.setAttribute('aria-label', captionOf(item));
        thumb.dataset.act = 'thumb';
        thumb.dataset.index = String(index);
        return thumb;
      }),
    );
    dialog.classList.toggle('single', items.length < 2);
    show(items.indexOf(shot));
    dialog.showModal();
    if (calm()) return;
    const options = { duration: 560, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };
    viewer.image.animate([{ transform: flight(shot.getBoundingClientRect(), viewer.image.getBoundingClientRect()) }, { transform: 'none' }], options);
    viewer.scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: 'ease-out' });
    for (const part of viewer.chrome) part.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { ...options, delay: 120, fill: 'backwards' });
  }

  function closeViewer() {
    const dialog = viewer.dialog;
    if (!dialog?.open || viewer.busy) return;
    const shot = viewer.items[viewer.index];
    const done = () => dialog.close();
    shot.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    const target = shot.getBoundingClientRect();
    const visible = target.width > 0 && target.bottom > 0 && target.top < innerHeight;
    if (calm() || !visible) {
      done();
      return;
    }
    viewer.busy = true;
    const options = { duration: 380, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' };
    const start = getComputedStyle(viewer.image).transform;
    viewer.image.style.transform = '';
    const land = viewer.image.animate(
      [{ transform: start === 'none' ? 'none' : start }, { transform: flight(target, viewer.image.getBoundingClientRect()) }],
      options,
    );
    const fades = [viewer.scrim, ...viewer.chrome].map((part) =>
      part.animate([{ opacity: getComputedStyle(part).opacity }, { opacity: 0 }], { ...options, duration: 300 }),
    );
    Promise.all([land, ...fades].map((animation) => animation.finished)).then(done, done);
  }

  function step(delta) {
    const next = viewer.index + delta;
    if (delta === 0 || next < 0 || next >= viewer.items.length) return;
    viewer.image.style.transform = '';
    viewer.scrim.style.opacity = '';
    show(next);
    if (calm()) return;
    viewer.image.animate(
      [{ transform: `translateX(${delta > 0 ? 64 : -64}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
  }

  function swipe(dialog) {
    let start = null;
    const reset = () => {
      viewer.image.style.transform = '';
      viewer.scrim.style.opacity = '';
      start = null;
    };
    dialog.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' || !event.target.closest('.viewer-stage')) return;
      if (window.visualViewport && visualViewport.scale > 1.01) return;
      start = { x: event.clientX, y: event.clientY, t: event.timeStamp, axis: null, id: event.pointerId };
    });
    dialog.addEventListener('pointermove', (event) => {
      if (!start || event.pointerId !== start.id) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (!start.axis && Math.hypot(dx, dy) > 8) start.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (start.axis === 'x') {
        const edge = (dx > 0 && viewer.index === 0) || (dx < 0 && viewer.index === viewer.items.length - 1);
        viewer.image.style.transform = `translateX(${edge ? dx / 3 : dx}px)`;
      } else if (start.axis === 'y' && dy > 0) {
        viewer.image.style.transform = `translateY(${dy}px) scale(${Math.max(0.8, 1 - dy / 1400)})`;
        viewer.scrim.style.opacity = String(Math.max(0.2, 1 - dy / 420));
      }
    });
    const finish = (event) => {
      if (!start || event.pointerId !== start.id) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const fast = event.timeStamp - start.t < 260;
      const axis = start.axis;
      start = null;
      if (axis === 'x' && (Math.abs(dx) > 70 || (fast && Math.abs(dx) > 24))) {
        const delta = dx < 0 ? 1 : -1;
        const next = viewer.index + delta;
        if (next >= 0 && next < viewer.items.length) {
          step(delta);
          return;
        }
      }
      if (axis === 'y' && (dy > 120 || (fast && dy > 40))) {
        closeViewer();
        return;
      }
      if (!calm() && viewer.image.style.transform) {
        viewer.image.animate([{ transform: viewer.image.style.transform }, { transform: 'none' }], {
          duration: 320,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        });
      }
      reset();
    };
    dialog.addEventListener('pointerup', finish);
    dialog.addEventListener('pointercancel', (event) => {
      if (start && event.pointerId === start.id) reset();
    });
  }

  function toggleMenu(button, open) {
    const bar = button.closest('.topbar');
    button.setAttribute('aria-expanded', String(open));
    bar.classList.toggle('open', open);
  }

  document.addEventListener('keydown', (event) => {
    const shot = event.target instanceof Element ? event.target.closest('img.shot') : null;
    if (shot && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openViewer(shot);
    }
    if (event.key === 'Escape') {
      const button = document.querySelector('[data-menu][aria-expanded="true"]');
      if (button) {
        toggleMenu(button, false);
        button.focus();
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    applyLang(lang);
    applyThemeLabel();
    if (!calm() && matchMedia('(pointer: fine)').matches) {
      for (const deck of document.querySelectorAll('[data-deck]')) tiltDeck(deck);
    }
  });

  document.addEventListener('change', (event) => {
    const select = event.target instanceof Element ? event.target.closest('[data-set-lang]') : null;
    if (!select || !LANGS.includes(select.value)) return;
    lang = select.value;
    save('lang', lang);
    applyLang(lang);
    applyThemeLabel();
  });

  function switchTheme(toggle) {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      save('theme', next);
      applyThemeLabel();
    };
    if (!document.startViewTransition || calm()) {
      apply();
      return;
    }
    const box = toggle.getBoundingClientRect();
    root.style.setProperty('--vt-x', box.left + box.width / 2 + 'px');
    root.style.setProperty('--vt-y', box.top + box.height / 2 + 'px');
    document.startViewTransition(apply);
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const toggle = target?.closest('[data-toggle-theme]');
    if (toggle) switchTheme(toggle);
    const option = target?.closest('[data-filter]');
    if (option) applyFilter(option.dataset.filter);
    const menu = target?.closest('[data-menu]');
    if (menu) toggleMenu(menu, menu.getAttribute('aria-expanded') !== 'true');
    else if (!target?.closest('.topbar')) {
      for (const button of document.querySelectorAll('[data-menu][aria-expanded="true"]')) toggleMenu(button, false);
    }
    const shot = target?.closest('img.shot');
    if (shot && !target.closest('.viewer')) openViewer(shot);
  });
})();
