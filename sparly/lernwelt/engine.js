/* Sparly von innen – game engine: i18n, state, coins, badges, quiz, map, effects. */
(function () {
  'use strict';

  const STORE_KEY = 'sparly-von-innen-v1';

  // The 20 avatars from the app (src/constants/avatars.ts).
  const AVATARS = ['😊', '😎', '🤓', '😺', '🦊', '🐶', '🐱', '🐰', '🦄', '🐼', '🦁', '🐸', '🦋', '🌟', '🚀', '⚡', '🎨', '🎵', '🏆', '💎'];

  // Same languages, locales and default currencies as the app.
  const LANGS = [
    { code: 'de', label: 'Deutsch', flag: '🇩🇪', locale: 'de-DE', cur: 'EUR' },
    { code: 'en', label: 'English', flag: '🇬🇧', locale: 'en-US', cur: 'USD' },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷', locale: 'tr-TR', cur: 'TRY' },
    { code: 'ro', label: 'Română', flag: '🇷🇴', locale: 'ro-RO', cur: 'RON' },
    { code: 'fr', label: 'Français', flag: '🇫🇷', locale: 'fr-FR', cur: 'EUR' },
    { code: 'pl', label: 'Polski', flag: '🇵🇱', locale: 'pl-PL', cur: 'PLN' },
    { code: 'es', label: 'Español', flag: '🇪🇸', locale: 'es-ES', cur: 'EUR' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹', locale: 'it-IT', cur: 'EUR' },
  ];
  const SYMBOLS = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', PLN: 'zł', RON: 'lei', TRY: '₺' };
  const FALLBACK_LANG = 'en';

  const RANK_MIN = [0, 100, 250, 450, 700, 1000, 1400];
  const RANK_EMOJI = ['🐣', '🧭', '🔧', '💻', '🧱', '🏗️', '👑'];

  const WORLDS = [
    { n: 1, wc: 'var(--w1)', ws: 'var(--w1-soft)' },
    { n: 2, wc: 'var(--w2)', ws: 'var(--w2-soft)' },
    { n: 3, wc: 'var(--w3)', ws: 'var(--w3-soft)' },
  ];
  const FINALE_COLORS = { wc: '#0F2D5F', ws: 'var(--gold-soft)' };

  // 23 badges – as many as the app itself has. Names and descriptions live in the language files.
  const BADGES = [
    ['willkommen', '👋'], ['erster_schritt', '🚀'], ['grenze', '🚧'], ['sparschwein', '🐷'], ['batterie', '⚡'], ['regel', '⚙️'],
    ['welt1', '💰'], ['sortier', '🧱'], ['detektiv', '🔎'], ['cent', '🪙'], ['paket', '📦'], ['weltenbummler', '🌍'], ['welt2', '🏗️'],
    ['hacker', '🔐'], ['agent', '🕵️'], ['bug', '🐞'], ['turbo', '🏎️'], ['store', '📲'], ['welt3', '🛡️'],
    ['volltreffer', '🎯'], ['serie', '🔥'], ['sterne', '⭐'], ['meister', '🏆'],
  ].map(([id, e]) => ({ id, e }));

  const STATIONS = [];

  /* ------------------------------------------------------------------ */
  /* i18n                                                                */
  /* ------------------------------------------------------------------ */

  const DICT = {};
  let LANG = 'de';

  function addLang(code, obj) { DICT[code] = Object.assign(DICT[code] || {}, obj); }
  function langInfo(code) { return LANGS.find((l) => l.code === (code || LANG)) || LANGS[0]; }

  /** Raw dictionary value (string, array or object), falling back to English, then German. */
  function raw(key, code) {
    for (const l of [code || LANG, FALLBACK_LANG, 'de']) {
      const d = DICT[l];
      if (d && Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    }
    return undefined;
  }

  const fmtCache = new Map();
  function nf(locale, opts) {
    const k = locale + JSON.stringify(opts);
    if (!fmtCache.has(k)) fmtCache.set(k, new Intl.NumberFormat(locale, opts));
    return fmtCache.get(k);
  }
  /** Money in minor units, formatted like the app: the language decides the layout, the app's table the symbol. */
  function money(cents, whole, code) {
    const li = langInfo(code);
    const digits = whole ? 0 : 2;
    let f;
    try { f = nf(li.locale, { style: 'currency', currency: li.cur, currencyDisplay: 'narrowSymbol', minimumFractionDigits: digits, maximumFractionDigits: digits }); }
    catch { f = nf(li.locale, { style: 'currency', currency: li.cur, minimumFractionDigits: digits, maximumFractionDigits: digits }); }
    return f.formatToParts(cents / 100).map((p) => (p.type === 'currency' ? SYMBOLS[li.cur] : p.value)).join('');
  }
  function curSymbol(code) { return SYMBOLS[langInfo(code).cur]; }
  function numf(n, code) { return nf(langInfo(code).locale, { maximumFractionDigits: 2 }).format(n); }
  function datef(iso, opts, code) {
    const d = typeof iso === 'string' ? new Date(iso + 'T12:00:00') : iso;
    return d.toLocaleDateString(langInfo(code).locale, opts || { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /**
   * Fill placeholders: %{m:1050} money, %{mw:1000} whole money, %{n:10000} number,
   * %{d:2026-02-07} date, %{key} from vars (%{name} defaults to the player's escaped name).
   */
  function fmt(str, vars) {
    if (typeof str !== 'string') return str;
    return str.replace(/%\{(\w+)(?::([^}]*))?\}/g, (m, k, arg) => {
      if (arg !== undefined) {
        if (k === 'm') return money(Number(arg));
        if (k === 'mw') return money(Number(arg), true);
        if (k === 'n') return numf(Number(arg));
        if (k === 'd') return datef(arg);
        return m;
      }
      if (vars && Object.prototype.hasOwnProperty.call(vars, k)) return String(vars[k]);
      if (k === 'name') return esc(name());
      if (k === 'cur') return curSymbol();
      return m;
    });
  }
  function t(key, vars) {
    const v = raw(key);
    if (v === undefined) return key;
    return typeof v === 'string' ? fmt(v, vars) : v;
  }
  /** A string from the app's own translations, with its {{placeholders}} filled. */
  function app(key, vars, code) {
    let v = raw('app.' + key, code);
    if (typeof v !== 'string') return key;
    if (vars) v = v.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    return v;
  }
  function detectLang() {
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']);
    for (const l of list) {
      const c = String(l).split(/[-_]/)[0].toLowerCase();
      if (LANGS.some((x) => x.code === c)) return c;
    }
    return FALLBACK_LANG;
  }
  function applyLang() {
    document.documentElement.lang = LANG;
    document.title = t('ui.title');
  }
  /** Load a language file on demand (only the chosen language and English ship with the page). */
  const langLoads = {};
  function ensureLang(code) {
    if (DICT[code] && DICT[code]['ui.title']) return Promise.resolve();
    if (!langLoads[code]) {
      langLoads[code] = new Promise((resolve) => {
        const el = document.createElement('script');
        el.src = 'lang/' + code + '.js';
        el.onload = resolve;
        el.onerror = resolve; // fall back to English texts
        document.head.append(el);
      });
    }
    return langLoads[code];
  }
  /** Run fn once the language is available – right away if it already is. */
  function withLang(code, fn) {
    if (DICT[code] && DICT[code]['ui.title']) fn();
    else ensureLang(code).then(fn);
  }

  /* ------------------------------------------------------------------ */
  /* State & persistence                                                 */
  /* ------------------------------------------------------------------ */

  function fresh() {
    return { v: 1, name: '', avatar: 4, lang: null, coins: 0, badges: {}, st: {}, streak: 0, flags: {}, sound: true, unlockAll: false, theme: null, savedAt: 0 };
  }
  function migrate(o) {
    const f = fresh();
    if (!o || typeof o !== 'object') return f;
    return Object.assign(f, o, { badges: o.badges || {}, st: o.st || {}, flags: o.flags || {} });
  }
  function loadLocal() {
    try {
      const r = localStorage.getItem(STORE_KEY);
      if (r) return migrate(JSON.parse(r));
    } catch { /* private mode or blocked storage */ }
    return fresh();
  }
  let S = loadLocal();

  function save() {
    S.savedAt = Date.now();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch { /* ignore */ }
    scheduleCloud();
  }

  // Optional, inside the Claude viewer only: progress kept privately per person (db capability).
  const cloud = { db: null, path: '', timer: 0, last: '', chain: Promise.resolve(), on: false };
  async function initCloud() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      cloud.path = 'data/users/' + uid + '/progress';
      const snap = await db.doc(cloud.path).get();
      cloud.db = db;
      cloud.on = true;
      if (snap.exists) {
        const remote = snap.data() && snap.data().state;
        if (remote && typeof remote === 'object') {
          const r = migrate(remote);
          if (r.coins > S.coins || (r.coins === S.coins && r.savedAt > S.savedAt)) {
            S = r;
            try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch { /* ignore */ }
            LANG = S.lang || LANG;
            applyLang(); applyTheme();
            if (!S.name) view = { name: 'onboarding' };
            else if (view.name === 'onboarding') view = { name: 'map' };
            render();
          }
          cloud.last = JSON.stringify(migrate(remote));
        }
      }
      if (view.name === 'map') render();
      scheduleCloud();
    } catch {
      cloud.db = null; cloud.on = false;
    }
  }
  function scheduleCloud() {
    if (!cloud.db) return;
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(pushCloud, 1500);
  }
  function pushCloud() {
    if (!cloud.db || !S.savedAt) return; // only real progress, never on a mere visit
    const json = JSON.stringify(S);
    if (json === cloud.last) return;
    cloud.chain = cloud.chain
      .then(() => cloud.db.doc(cloud.path).set({ state: JSON.parse(json), savedAt: Date.now() }))
      .then(() => { cloud.last = json; })
      .catch((e) => {
        if (e && e.code === 'unavailable') { setTimeout(scheduleCloud, 3000 + Math.random() * 2000); return; }
        cloud.db = null; cloud.on = false;
      });
  }

  function st(id) {
    if (!S.st[id]) S.st[id] = { done: false, q: {}, quiz: false, perfect: false, ch: false };
    return S.st[id];
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  const $ = (sel, root) => (root || document).querySelector(sel);

  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      for (const k of Object.keys(props)) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') {
          for (const sk of Object.keys(v)) {
            if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk];
          }
        } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach((k) => append(el, k)); return; }
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  function svg(markup) {
    const tpl = document.createElement('template');
    tpl.innerHTML = markup.trim();
    return tpl.content.firstElementChild;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  /** Parse a typed number in any of the supported languages ("20,50", "20.5", "10.000", "10,000", "10 000"). */
  function parseNum(input) {
    let s = String(input).replace(/[^\d.,-]/g, '');
    if (!s || !/\d/.test(s)) return null;
    if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
    else {
      const last = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
      if (last >= 0) s = s.slice(0, last).replace(/[.,]/g, '') + '.' + s.slice(last + 1);
    }
    const v = Number(s);
    return Number.isFinite(v) ? v : null;
  }
  function name() { return S.name || t('ui.you'); }
  function avatar() { return AVATARS[S.avatar] || '😊'; }
  function live(msg) { const l = $('#live'); if (l) { l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30); } }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ------------------------------------------------------------------ */
  /* Icons                                                               */
  /* ------------------------------------------------------------------ */

  const ICONS = {
    coin: '<svg class="coin-ico" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#E3A21A"/><circle cx="16" cy="15" r="14" fill="#F5B323"/><circle cx="16" cy="15" r="10.5" fill="#FBD15B" stroke="#C98408" stroke-width="1.4"/><path d="M16 9.5l1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z" fill="#C98408"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M16 5h3v2a3 3 0 0 1-3 3M8 5H5v2a3 3 0 0 0 3 3M12 13v4M8 20h8M9 17h6"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13M9 7h6M9 10h4"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  };
  function icon(n) { return svg(ICONS[n]); }
  function starSvg(on) {
    return svg(on
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.2 1.2-6.5L2.5 9.4l6.6-.9z" fill="#F5B323" stroke="#C98408" stroke-width="1.2" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.2 1.2-6.5L2.5 9.4l6.6-.9z" fill="none" style="stroke: var(--line)" stroke-width="2" stroke-linejoin="round"/></svg>');
  }
  let gradSeq = 0;
  function brandMark() {
    const id = 'bm' + (++gradSeq);
    return svg('<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43CEA2"/><stop offset="1" stop-color="#185A9D"/></linearGradient></defs><rect width="40" height="40" rx="12" fill="url(#' + id + ')"/><circle cx="20" cy="20.5" r="11" fill="#FFFFFF"/><path d="M24 16.2c-.7-1.4-2.1-2.2-4-2.2-2.3 0-3.9 1.2-3.9 2.9 0 4 7.9 2.4 7.9 6.4 0 1.8-1.7 3-4 3-1.9 0-3.4-.8-4.1-2.3" fill="none" stroke="#185A9D" stroke-width="2.4" stroke-linecap="round"/></svg>');
  }

  /* ------------------------------------------------------------------ */
  /* Content building blocks                                             */
  /* ------------------------------------------------------------------ */

  function P(html) { return h('p', { html }); }
  function box(kind, html, title) {
    return h('div', { class: 'box ' + kind }, h('h4', null, title || t('ui.box.' + kind)), h('p', { html }));
  }
  function formula(html) { return h('div', { class: 'formula', html }); }
  const KW = 'const|let|var|function|return|if|else|await|async|export|import|from|new|true|false|null|interface|type|for|of|expect|it|CREATE|TABLE|NOT|NULL|PRIMARY|KEY|REFERENCES|ON|DELETE|CASCADE|CHECK|IN|INTEGER|TEXT|DEFAULT|SELECT|FROM|WHERE|SUM|CASE|WHEN|THEN|ELSE|END|AS|COUNT|GROUP|BY|ORDER|DESC|INSERT|INTO|VALUES|LIMIT';
  const HL = new RegExp('(\\/\\/[^\\n]*|--[^\\n]*|#[^\\n]*)|(\'(?:[^\'\\\\\\n]|\\\\.)*\'|"(?:[^"\\\\\\n]|\\\\.)*"|`(?:[^`\\\\]|\\\\.)*`)|\\b(\\d[\\d_]*(?:\\.\\d+)?)\\b|\\b(' + KW + ')\\b', 'g');
  function highlight(src) {
    let out = '';
    let last = 0;
    src.replace(HL, (m, com, str, num, kw, idx) => {
      out += esc(src.slice(last, idx));
      const cls = com ? 'c' : str ? 's' : num ? 'n' : 'k';
      out += '<span class="' + cls + '">' + esc(m) + '</span>';
      last = idx + m.length;
      return m;
    });
    return out + esc(src.slice(last));
  }
  function code(src) { const pre = h('pre', { class: 'code' }); pre.innerHTML = highlight(src.replace(/^\n/, '')); return pre; }
  function panel(title, hint) {
    return h('div', { class: 'panel' }, title ? h('h3', null, title) : null, hint ? h('p', { class: 'hint', html: hint }) : null);
  }

  /**
   * Render a list of text blocks from the language file: "p|…", "li|…", "h3|…",
   * "formula|…", "merke|…", "stell|…", "fakt|…", or "@widget" for parts drawn by code.
   */
  function blocks(el, key, widgets, vars) {
    const arr = raw(key) || [];
    let ul = null;
    for (const b of arr) {
      if (b.charAt(0) === '@') {
        ul = null;
        const w = widgets && widgets[b.slice(1)];
        if (w) el.append(w());
        continue;
      }
      const i = b.indexOf('|');
      const type = b.slice(0, i);
      const text = fmt(b.slice(i + 1), vars);
      if (type === 'li') {
        if (!ul) { ul = h('ul'); el.append(ul); }
        ul.append(h('li', { html: text }));
        continue;
      }
      ul = null;
      if (type === 'p') el.append(P(text));
      else if (type === 'h3') el.append(h('h3', { style: { fontSize: '1.3rem', marginTop: '6px' }, html: text }));
      else if (type === 'formula') el.append(formula(text));
      else el.append(box(type, text));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Effects: sound, confetti, floating coins, toast, modals             */
  /* ------------------------------------------------------------------ */

  let actx = null;
  function audio() {
    if (!actx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      actx = new C();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(c, f, t0, dur, type, vol) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  const SOUNDS = {
    right: [[660, 0, 0.12], [880, 0.1, 0.2]],
    wrong: [[196, 0, 0.16, 'square', 0.04], [156, 0.12, 0.22, 'square', 0.04]],
    coin: [[988, 0, 0.08, 'triangle'], [1319, 0.07, 0.22, 'triangle']],
    badge: [[523, 0, 0.15], [659, 0.12, 0.15], [784, 0.24, 0.15], [1047, 0.36, 0.4]],
    click: [[520, 0, 0.05, 'triangle', 0.05]],
    win: [[392, 0, 0.12], [523, 0.1, 0.12], [659, 0.2, 0.12], [784, 0.3, 0.12], [1047, 0.42, 0.45]],
  };
  function sound(kind) {
    if (!S.sound) return;
    try {
      const c = audio();
      if (!c) return;
      const t0 = c.currentTime + 0.01;
      (SOUNDS[kind] || []).forEach((n) => tone(c, n[0], t0 + n[1], n[2], n[3] || 'sine', n[4] || 0.11));
    } catch { /* no audio */ }
  }

  const fx = { parts: [], running: false };
  function confetti(count) {
    if (reduced()) return;
    const cv = $('#fx');
    if (!cv) return;
    const ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#43CEA2', '#185A9D', '#F5B323', '#EF4444', '#8B5CF6', '#10B981', '#60A5FA'];
    const n = count || 150;
    for (let i = 0; i < n; i++) {
      fx.parts.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.5,
        y: innerHeight * 0.35 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 4,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        w: 6 + Math.random() * 7, hgt: 4 + Math.random() * 6,
        c: pick(colors), round: Math.random() < 0.3, life: 0,
      });
    }
    if (!fx.running) { fx.running = true; requestAnimationFrame(step); }
    function step() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      fx.parts = fx.parts.filter((p) => p.life < 170 && p.y < innerHeight + 40);
      for (const p of fx.parts) {
        p.life++; p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - p.life / 170);
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2.4, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.hgt / 2, p.w, p.hgt);
        ctx.restore();
      }
      if (fx.parts.length) requestAnimationFrame(step);
      else { fx.running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
  }

  function floater(text, anchor) {
    let x = innerWidth / 2;
    let y = innerHeight / 2;
    if (anchor && anchor.getBoundingClientRect) {
      const r = anchor.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top;
      if (y < 60 || y > innerHeight - 20) y = innerHeight / 2;
    }
    const el = h('div', { class: 'floater', style: { left: x + 'px', top: y + 'px' } }, text);
    document.body.append(el);
    setTimeout(() => el.remove(), 1200);
  }

  let toastTimer = 0;
  function toast(msg) {
    const old = $('.toast');
    if (old) old.remove();
    const el = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.append(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 2600);
  }

  const modalQ = [];
  let modalOpen = false;
  function showModal(build) { modalQ.push(build); if (!modalOpen) nextModal(); }
  function nextModal() {
    const build = modalQ.shift();
    if (!build) { modalOpen = false; return; }
    modalOpen = true;
    let bg = null;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    function close() {
      if (!bg) return;
      bg.remove(); bg = null;
      document.removeEventListener('keydown', onKey);
      nextModal();
    }
    const card = build(close);
    bg = h('div', { class: 'modal-bg', role: 'dialog', 'aria-modal': 'true' }, card);
    bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(bg);
    const f = card.querySelector('button');
    if (f) f.focus();
  }

  /* ------------------------------------------------------------------ */
  /* Coins, ranks, badges, stars                                         */
  /* ------------------------------------------------------------------ */

  function rankIdx(c) { let r = 0; RANK_MIN.forEach((m, i) => { if (c >= m) r = i; }); return r; }
  function rankLabel(i) { return RANK_EMOJI[i] + ' ' + t('rank.' + i); }
  function rankPct(c) {
    const i = rankIdx(c);
    if (i === RANK_MIN.length - 1) return 100;
    return Math.round(((c - RANK_MIN[i]) / (RANK_MIN[i + 1] - RANK_MIN[i])) * 100);
  }
  function rankNextText(c) {
    const i = rankIdx(c);
    if (i === RANK_MIN.length - 1) return t('ui.rankMax');
    return t('ui.rankNext', { n: RANK_MIN[i + 1] - c, rank: rankLabel(i + 1) });
  }

  function addCoins(n, anchor) {
    const before = rankIdx(S.coins);
    S.coins += n;
    save();
    floater('+' + n, anchor);
    renderHUD(true);
    const after = rankIdx(S.coins);
    if (after !== before) {
      showModal((close) => h('div', { class: 'modal' },
        h('div', { class: 'eyebrow' }, t('ui.newRank')),
        h('div', { class: 'big' }, RANK_EMOJI[after]),
        h('h2', null, t('rank.' + after)),
        h('p', { html: t('ui.newRankText', { n: S.coins }) }),
        h('div', { class: 'btns' }, h('button', { class: 'btn', type: 'button', onclick: close }, t('ui.next')))));
      sound('win');
      confetti(90);
    }
  }

  function earnBadge(id) {
    if (S.badges[id]) return false;
    const b = BADGES.find((x) => x.id === id);
    if (!b) return false;
    S.badges[id] = Date.now();
    save();
    showModal((close) => h('div', { class: 'modal' },
      h('div', { class: 'eyebrow' }, app('badges.new_badge')),
      h('div', { class: 'big' }, b.e),
      h('h2', null, t('badge.' + id + '.name')),
      h('p', null, t('badge.' + id + '.desc')),
      h('p', null, h('strong', null, app('badges.congratulations') + ' ' + t('ui.plusCoins', { n: 20 }))),
      h('div', { class: 'btns' },
        h('button', { class: 'btn', type: 'button', onclick: close }, t('ui.super')),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { close(); go('badges'); } }, t('ui.allBadges')))));
    sound('badge');
    confetti();
    addCoins(20, null);
    live(app('badges.new_badge') + ' ' + t('badge.' + id + '.name'));
    return true;
  }

  function starsOf(id) { const s = st(id); return [!!s.quiz, !!s.perfect, !!s.ch]; }
  function learnStations() { return STATIONS.filter((x) => !x.exam); }
  function totalStars() { return learnStations().reduce((n, x) => n + starsOf(x.id).filter(Boolean).length, 0); }
  function checkStars() { if (totalStars() >= 45) earnBadge('sterne'); }
  function doneCount() { return learnStations().filter((x) => st(x.id).done).length; }
  function unlocked(idx) {
    if (S.unlockAll || idx === 0) return true;
    return st(STATIONS[idx - 1].id).done;
  }
  function currentIdx() {
    const i = STATIONS.findIndex((x) => !st(x.id).done);
    return i === -1 ? STATIONS.length - 1 : i;
  }
  function stTitle(sd) { return t('s.' + sd.id + '.title'); }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */

  let view = { name: 'map' };
  let redrawPaths = null;
  let mapRO = null;

  function go(nm, arg) {
    view = { name: nm, arg };
    render();
    window.scrollTo({ top: 0, behavior: 'auto' });
    const a = $('#app');
    if (a) a.focus({ preventScroll: true });
  }

  function render() {
    renderHUD(false);
    const a = $('#app');
    a.replaceChildren();
    a.removeAttribute('style');
    redrawPaths = null;
    if (mapRO) { mapRO.disconnect(); mapRO = null; }
    if (!S.name && view.name !== 'onboarding') view = { name: 'onboarding' };
    switch (view.name) {
      case 'onboarding': renderOnboarding(a); break;
      case 'station': renderStation(a, view.arg); break;
      case 'badges': renderBadges(a); break;
      case 'lexikon': renderLexikon(a); break;
      case 'urkunde': renderUrkunde(a); break;
      default: view = { name: 'map' }; renderMap(a);
    }
    renderFooter();
  }

  function setLang(code) {
    if (!LANGS.some((l) => l.code === code)) return;
    withLang(code, () => { LANG = code; S.lang = code; save(); applyLang(); render(); });
  }
  function langModal() {
    showModal((close) => h('div', { class: 'modal' },
      h('h2', null, app('language_select.title')),
      h('div', { class: 'lang-grid' }, LANGS.map((l) => h('button', {
        class: 'chip', type: 'button', lang: l.code, 'aria-pressed': String(l.code === LANG),
        onclick: () => { close(); setLang(l.code); },
      }, l.flag + ' ' + l.label)))));
  }

  /* ------------------------------------------------------------------ */
  /* HUD & footer                                                        */
  /* ------------------------------------------------------------------ */

  function effectiveDark() {
    const th = document.documentElement.getAttribute('data-theme');
    if (th) return th === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applyTheme() {
    if (S.theme) document.documentElement.setAttribute('data-theme', S.theme);
    else document.documentElement.removeAttribute('data-theme');
  }
  function toggleTheme() {
    S.theme = effectiveDark() ? 'light' : 'dark';
    applyTheme(); save(); renderHUD(false);
    if (redrawPaths) redrawPaths();
  }

  function renderHUD(bump) {
    const hud = $('#hud');
    const onb = !S.name;
    const r = rankIdx(S.coins);
    const earned = Object.keys(S.badges).length;
    const inner = h('div', { class: 'hud-in' },
      h('button', { class: 'brand', type: 'button', onclick: () => S.name && go('map'), 'aria-label': t('ui.toMap') },
        brandMark(),
        h('span', { class: 'brand-txt' }, t('ui.title'), h('small', null, t('ui.brandSub')))),
      h('div', { class: 'hud-sp' }),
      onb ? null : h('div', { class: 'hud-me' },
        h('div', { class: 'hud-ava', 'aria-hidden': 'true' }, avatar()),
        h('div', { class: 'hud-rank' },
          h('b', null, rankLabel(r)),
          h('div', { class: 'bar', title: rankNextText(S.coins) }, h('i', { style: { width: rankPct(S.coins) + '%' } })))),
      onb ? null : h('div', { class: 'coins' + (bump ? ' bump' : ''), title: t('ui.coins'), 'aria-label': t('ui.coinsAria', { n: S.coins }) }, icon('coin'), h('span', { class: 'num' }, S.coins)),
      onb ? null : h('button', { class: 'iconbtn', type: 'button', title: app('badges.title'), 'aria-label': t('ui.badgesAria', { a: earned, b: BADGES.length }), onclick: () => go('badges') },
        icon('trophy'), h('span', { class: 'cnt' }, earned)),
      onb ? null : h('button', { class: 'iconbtn', type: 'button', title: t('ui.lexicon'), 'aria-label': t('ui.lexicon'), onclick: () => go('lexikon') }, icon('book')),
      h('button', { class: 'iconbtn langbtn', type: 'button', title: app('language_select.title'), 'aria-label': app('language_select.title') + ': ' + langInfo().label, onclick: langModal },
        icon('globe'), h('span', { class: 'cnt lang-code' }, LANG.toUpperCase())),
      h('button', { class: 'iconbtn', type: 'button', title: S.sound ? t('ui.soundOff') : t('ui.soundOn'), 'aria-label': S.sound ? t('ui.soundOff') : t('ui.soundOn'), onclick: () => { S.sound = !S.sound; save(); renderHUD(false); if (S.sound) sound('click'); } },
        icon(S.sound ? 'soundOn' : 'soundOff')),
      h('button', { class: 'iconbtn', type: 'button', title: effectiveDark() ? t('ui.themeLight') : t('ui.themeDark'), 'aria-label': effectiveDark() ? t('ui.themeLight') : t('ui.themeDark'), onclick: toggleTheme },
        icon(effectiveDark() ? 'sun' : 'moon')));
    hud.replaceChildren(inner);
  }

  function renderFooter() {
    const f = $('#foot');
    if (!f) return;
    // Links to the website only make sense where the page is hosted at futuresq.com/sparly/lernwelt/.
    if (window.claude) { f.replaceChildren(); return; }
    f.replaceChildren(h('div', { class: 'wrap foot-in' },
      h('a', { href: '../' }, t('ui.footerSite')),
      h('a', { href: '../../impressum.html' }, t('ui.footerImprint')),
      h('a', { href: '../../privacy-policy.html' }, t('ui.footerPrivacy')),
      h('span', null, t('ui.footerNote'))));
  }

  /* ------------------------------------------------------------------ */
  /* Onboarding – like the app: language, name, avatar                  */
  /* ------------------------------------------------------------------ */

  let onbDraft = null;
  function renderOnboarding(a) {
    const draft = onbDraft || (onbDraft = { name: S.name || '', avatar: S.avatar });
    const inp = h('input', { type: 'text', id: 'onb-name', maxlength: '20', autocomplete: 'off', placeholder: t('ui.onbNamePh'), value: draft.name });
    inp.addEventListener('input', () => { draft.name = inp.value; });
    const err = h('p', { class: 'hint', role: 'status' });
    const grid = h('div', { class: 'ava-grid', role: 'group', 'aria-label': app('onboarding.step_avatar') });
    AVATARS.forEach((e, i) => {
      grid.append(h('button', { type: 'button', 'aria-pressed': String(i === draft.avatar), 'aria-label': t('ui.avatarN', { n: i + 1 }), onclick: (ev) => {
        draft.avatar = i;
        grid.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        ev.currentTarget.setAttribute('aria-pressed', 'true');
        sound('click');
      } }, e));
    });
    const langs = h('div', { class: 'lang-grid', role: 'group', 'aria-label': app('language_select.title') }, LANGS.map((l) => h('button', {
      class: 'chip', type: 'button', lang: l.code, 'aria-pressed': String(l.code === LANG),
      onclick: () => withLang(l.code, () => { LANG = l.code; S.lang = l.code; applyLang(); render(); }),
    }, l.flag + ' ' + l.label)));
    const startBtn = h('button', { class: 'btn', type: 'button', onclick: start }, app('onboarding.get_started'));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });
    function start() {
      const n = inp.value.trim().replace(/\s+/g, ' ');
      if (!n) { err.textContent = t('ui.onbNameErr'); inp.focus(); inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 450); return; }
      S.name = n.slice(0, 20); S.avatar = draft.avatar; S.lang = LANG; save();
      onbDraft = null;
      view = { name: 'map' };
      render();
      window.scrollTo(0, 0);
      setTimeout(() => earnBadge('willkommen'), 250);
    }
    a.append(h('div', { class: 'onb' },
      h('div', null,
        h('div', { class: 'eyebrow' }, t('ui.onbEyebrow')),
        h('h1', null, t('ui.onbTitle')),
        h('p', { class: 'lead', style: { marginTop: '10px' } }, t('ui.onbLead'))),
      h('div', { class: 'onb-card' },
        h('h2', null, app('language_select.title')), langs,
        h('h2', null, h('label', { for: 'onb-name' }, app('onboarding.step_name'))),
        inp, err,
        h('h2', null, app('onboarding.step_avatar')),
        grid,
        h('p', { class: 'hint' }, t('ui.onbHint')),
        h('div', null, startBtn))));
    setTimeout(() => inp.focus(), 50);
  }

  /* ------------------------------------------------------------------ */
  /* Map                                                                 */
  /* ------------------------------------------------------------------ */

  const XPOS = [26, 66, 38, 72, 32];

  function renderMap(a) {
    const cur = currentIdx();
    const curSt = STATIONS[cur];
    const r = rankIdx(S.coins);
    const none = doneCount() === 0;
    const allDone = st('finale').done;

    const coinsArt = svg('<svg class="hello-coins" viewBox="0 0 200 160" aria-hidden="true">' +
      [[60, 120], [60, 104], [60, 88], [120, 128], [120, 112], [150, 60]].map((p, i) =>
        '<g transform="translate(' + p[0] + ' ' + p[1] + ')"><ellipse cx="0" cy="6" rx="34" ry="12" fill="#C98408"/><ellipse cx="0" cy="0" rx="34" ry="12" fill="' + (i === 5 ? '#FBD15B' : '#F5B323') + '" stroke="#C98408" stroke-width="2"/></g>').join('') +
      '</svg>');

    a.append(h('div', { class: 'hello' },
      h('div', { class: 'hello-card' },
        h('h1', { html: t('ui.hello') + ' ' + avatar() }),
        h('p', null, allDone ? t('ui.helloDone') : none ? t('ui.helloNew')
          : t('ui.helloNext', { what: curSt.exam ? t('ui.theExam') : t('ui.stationN', { n: cur + 1 }) + ': ' + stTitle(curSt) })),
        allDone
          ? h('button', { class: 'btn', type: 'button', onclick: () => go('urkunde') }, t('ui.viewCert'))
          : h('button', { class: 'btn', type: 'button', onclick: () => openStation(cur) }, none ? app('onboarding.get_started') : t('ui.continue')),
        coinsArt),
      h('div', { class: 'stats' },
        statTile(doneCount() + ' / 15', t('ui.statStations')),
        statTile(totalStars() + ' / 45', t('ui.statStars')),
        statTile(Object.keys(S.badges).length + ' / ' + BADGES.length, t('ui.statBadges')),
        statTile(String(S.coins), t('ui.coins')),
        h('div', { class: 'stat rank' },
          h('div', { class: 'k' }, t('ui.yourRank')),
          h('div', { class: 'v' }, rankLabel(r)),
          h('div', { class: 'bar' }, h('i', { style: { width: rankPct(S.coins) + '%' } })),
          h('div', { class: 'k', style: { marginTop: '6px', fontWeight: '600' } }, rankNextText(S.coins))))));

    const trails = [];
    WORLDS.forEach((w) => {
      const items = STATIONS.map((x, i) => ({ x, i })).filter((o) => o.x.world === w.n);
      const doneHere = items.filter((o) => st(o.x.id).done).length;
      const trail = h('div', { class: 'trail' });
      const pathSvg = svg('<svg class="path" aria-hidden="true"><path class="base" fill="none" style="stroke: var(--line)" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 14"/><path class="prog" fill="none" style="stroke: ' + w.wc + '" stroke-width="6" stroke-linecap="round"/></svg>');
      trail.append(pathSvg);
      items.forEach((o, k) => trail.append(nodeRow(o.x, o.i, XPOS[k % XPOS.length], cur)));
      trails.push({ trail, pathSvg, items });
      a.append(h('section', { class: 'world', style: { '--wc': w.wc, '--wsoft': w.ws }, 'aria-label': t('world.' + w.n + '.tag') },
        h('div', { class: 'world-head' },
          h('div', null,
            h('div', { class: 'eyebrow' }, t('world.' + w.n + '.tag')),
            h('h2', null, t('world.' + w.n + '.title')),
            h('p', null, t('world.' + w.n + '.sub'))),
          h('span', { class: 'world-prog' }, t('ui.worldProgress', { a: doneHere, b: items.length }))),
        trail));
    });

    const fi = STATIONS.findIndex((x) => x.exam);
    if (fi >= 0) {
      const open = unlocked(fi);
      const fdone = st(STATIONS[fi].id).done;
      a.append(h('section', { class: 'world', style: { '--wc': FINALE_COLORS.wc, '--wsoft': FINALE_COLORS.ws } },
        h('div', { class: 'world-head' },
          h('div', null,
            h('div', { class: 'eyebrow' }, t('ui.finaleTag')),
            h('h2', null, t('s.finale.title') + ' 🏆'),
            h('p', null, t('ui.finaleSub'))),
          fdone
            ? h('button', { class: 'btn gold', type: 'button', onclick: () => go('urkunde') }, t('ui.viewCert'))
            : h('button', { class: 'btn' + (open ? ' gold' : ''), type: 'button', disabled: !open, onclick: () => openStation(fi) },
              open ? t('ui.finaleStart') : t('ui.finaleLocked')))));
    }

    const resetBox = h('span', { class: 'confirm-row' });
    resetBox.append(h('button', { class: 'linkbtn', type: 'button', onclick: () => {
      resetBox.replaceChildren(
        h('b', null, t('ui.resetConfirm')),
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => render() }, t('ui.cancel')),
        h('button', { class: 'btn small', type: 'button', onclick: () => {
          const keep = { theme: S.theme, lang: S.lang, sound: S.sound };
          S = Object.assign(fresh(), keep); save(); pushCloud(); go('onboarding');
        } }, t('ui.resetYes')));
    } }, t('ui.reset')));
    a.append(h('div', { class: 'parent' },
      h('div', { style: { flex: '1 1 320px', minWidth: '0' } },
        h('b', null, t('ui.parentTitle') + ' '),
        t('ui.parentText') + ' ' + (cloud.on ? t('ui.savedCloud') : t('ui.savedLocal'))),
      h('label', { style: { display: 'inline-flex', gap: '8px', alignItems: 'center', fontWeight: '700', cursor: 'pointer' } },
        h('input', { type: 'checkbox', id: 'unlock-all', checked: S.unlockAll, onchange: (e) => { S.unlockAll = e.target.checked; save(); render(); } }),
        t('ui.unlockAll')),
      resetBox));

    redrawPaths = () => trails.forEach(drawPath);
    requestAnimationFrame(() => redrawPaths && redrawPaths());
    if (window.ResizeObserver) {
      mapRO = new ResizeObserver(() => redrawPaths && redrawPaths());
      trails.forEach((tr) => mapRO.observe(tr.trail));
    }
  }

  function statTile(v, k) {
    return h('div', { class: 'stat' }, h('div', { class: 'v num' }, v), h('div', { class: 'k' }, k));
  }

  function nodeRow(sd, idx, x, cur) {
    const s = st(sd.id);
    const open = unlocked(idx);
    const isCur = idx === cur && open && !s.done;
    const node = h('button', {
      class: 'node' + (s.done ? ' done' : open ? '' : ' locked') + (isCur ? ' current' : ''), type: 'button', style: { left: x + '%' },
      'aria-label': t('ui.nodeAria', { n: idx + 1, title: stTitle(sd) }) + (s.done ? t('ui.nodeDone') : open ? '' : t('ui.nodeLocked')),
      onclick: (e) => {
        if (!open) {
          const b = e.currentTarget; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 450);
          toast(t('ui.lockedToast', { n: idx })); sound('wrong'); return;
        }
        sound('click'); openStation(idx);
      },
    }, s.done ? icon('check') : open ? String(idx + 1) : icon('lock'));
    if (isCur) node.append(h('span', { class: 'you', 'aria-hidden': 'true' }, avatar()));
    const stars = starsOf(sd.id);
    const lbl = h('div', { class: 'node-lbl ' + (x <= 50 ? 'r' : 'l'), style: x <= 50 ? { left: 'calc(' + x + '% + 54px)', right: '8px' } : { left: '8px', right: 'calc(' + (100 - x) + '% + 54px)' } },
      h('b', null, stTitle(sd)),
      h('span', null, t('s.' + sd.id + '.short')),
      h('span', { class: 'stars', 'aria-label': t('ui.starsAria', { n: stars.filter(Boolean).length }) }, stars.map(starSvg)));
    return h('div', { class: 'row' }, node, lbl);
  }

  function drawPath(tr) {
    const nodes = Array.from(tr.trail.querySelectorAll('.node'));
    if (!nodes.length) return;
    const bx = tr.trail.getBoundingClientRect();
    const pts = nodes.map((n) => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2 - bx.left, r.top + r.height / 2 - bx.top]; });
    const d = (list) => list.reduce((acc, p, i) => {
      if (i === 0) return 'M' + p[0] + ' ' + p[1];
      const q = list[i - 1]; const my = (q[1] + p[1]) / 2;
      return acc + ' C' + q[0] + ' ' + my + ' ' + p[0] + ' ' + my + ' ' + p[0] + ' ' + p[1];
    }, '');
    tr.pathSvg.setAttribute('viewBox', '0 0 ' + bx.width + ' ' + bx.height);
    tr.pathSvg.querySelector('.base').setAttribute('d', d(pts));
    let last = -1;
    tr.items.forEach((o, k) => { if (st(o.x.id).done) last = k; });
    const progPts = pts.slice(0, Math.min(pts.length, last + 2));
    tr.pathSvg.querySelector('.prog').setAttribute('d', progPts.length > 1 ? d(progPts) : '');
  }

  function openStation(idx) {
    const sd = STATIONS[idx];
    if (sd) go('station', sd.id);
  }

  /* ------------------------------------------------------------------ */
  /* Station                                                             */
  /* ------------------------------------------------------------------ */

  function colorsFor(sd) {
    if (sd.exam) return FINALE_COLORS;
    const w = WORLDS[sd.world - 1];
    return { wc: w.wc, ws: w.ws };
  }

  function renderStation(a, id) {
    const idx = STATIONS.findIndex((x) => x.id === id);
    const sd = STATIONS[idx];
    if (!sd || !unlocked(idx)) { view = { name: 'map' }; renderMap(a); return; }
    const c = colorsFor(sd);
    a.style.setProperty('--wc', c.wc);
    a.style.setProperty('--wsoft', c.ws);
    if (sd.exam) { renderExam(a, sd); return; }
    const s = st(sd.id);
    const K = 's.' + sd.id + '.';

    const stepLinks = [['sec-learn', '1', t('ui.stepLearn')], ['sec-play', '2', t('ui.stepPlay')], ['sec-quiz', '3', t('ui.stepQuiz')]];
    const steps = h('nav', { class: 'steps', 'aria-label': t('ui.stepsAria') }, stepLinks.map((l, i) => h('a', {
      href: '#' + l[0], class: (i === 1 && s.ch) || (i === 2 && s.quiz) ? 'ok' : null,
      onclick: (e) => { e.preventDefault(); const tg = document.getElementById(l[0]); if (tg) tg.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); },
    }, h('i', null, l[1]), l[2])));

    a.append(h('header', { class: 'st-head' },
      h('button', { class: 'btn small ghost st-back', type: 'button', onclick: () => go('map') }, icon('back'), t('ui.map')),
      h('div', { class: 'eyebrow' }, t('ui.stationOf', { tag: t('world.' + sd.world + '.tag'), n: idx + 1 })),
      h('div', { class: 'st-title' }, h('div', { class: 'st-badge', 'aria-hidden': 'true' }, String(idx + 1)), h('h1', null, stTitle(sd))),
      h('p', { class: 'lead' }, t(K + 'lead')),
      steps));

    const learn = h('div', { class: 'prose' });
    sd.learn(learn, makeApi(sd, null));
    a.append(section('sec-learn', '1', t('ui.stepLearn'), learn));

    const challenge = t(K + 'challenge');
    const goal = h('div', { class: 'goal' + (s.ch ? ' ok' : '') }, icon(s.ch ? 'check' : 'target'),
      h('span', null, (s.ch ? t('ui.taskDone') : t('ui.task')) + challenge + (s.ch ? '' : t('ui.taskReward'))));
    const play = h('div');
    const api2 = makeApi(sd, goal);
    sd.play(play, api2);
    a.append(section('sec-play', '2', t('ui.stepPlay'), h('div', null, goal, h('div', { style: { marginTop: '14px' } }, play))));

    const doneBar = h('div', { class: 'done-bar' });
    const quizMount = h('div');
    renderQuiz(sd, quizMount, () => { updateDoneBar(); refreshSteps(); });
    a.append(section('sec-quiz', '3', t('ui.stepQuiz'), quizMount));

    const words = raw(K + 'words') || [];
    if (words.length) {
      a.append(h('section', { class: 'sec' },
        h('div', { class: 'sec-h' }, h('h2', null, t('ui.newWords'))),
        h('p', { class: 'hint', style: { color: 'var(--muted)', marginBottom: '12px' } }, t('ui.newWordsHint')),
        h('div', { class: 'term-cards' }, words.map((wd) => h('div', { class: 'tcard' }, h('b', null, fmt(wd[0])), h('span', null, fmt(wd[1])))))));
    }

    a.append(doneBar);
    updateDoneBar();

    function refreshSteps() {
      const as = steps.querySelectorAll('a');
      as[1].classList.toggle('ok', !!st(sd.id).ch);
      as[2].classList.toggle('ok', !!st(sd.id).quiz);
    }
    api2.onChallenge = refreshSteps;

    function updateDoneBar() {
      const s2 = st(sd.id);
      const next = STATIONS[idx + 1];
      if (s2.done) {
        doneBar.replaceChildren(
          h('p', null, t('ui.doneText', { n: starsOf(sd.id).filter(Boolean).length }) + (s2.perfect ? '' : ' ' + t('ui.donePerfectHint'))),
          h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
            h('button', { class: 'btn ghost', type: 'button', onclick: () => go('map') }, t('ui.toMap')),
            next ? h('button', { class: 'btn', type: 'button', onclick: () => openStation(idx + 1) }, next.exam ? t('ui.toExam') : t('ui.nextStation')) : null));
      } else {
        const ready = !!s2.quiz;
        doneBar.replaceChildren(
          h('p', null, ready ? t('ui.readyText') : t('ui.notReadyText')),
          h('button', { class: 'btn gold', type: 'button', disabled: !ready, onclick: (e) => completeStation(sd, idx, e.currentTarget) }, t('ui.complete')));
      }
    }
  }

  function section(id, n, title, body) {
    return h('section', { class: 'sec', id },
      h('div', { class: 'sec-h' }, h('span', { class: 'n' }, n), h('h2', null, title)),
      body);
  }

  function makeApi(sd, goalEl) {
    const K = 's.' + sd.id + '.';
    const api = {
      onChallenge: null,
      /** Station text: t('s.<id>.' + key). */
      t: (key, vars) => t(K + key, vars),
      raw: (key) => raw(K + key),
      blocks: (el, widgets, vars) => blocks(el, K + 'learn', widgets, vars),
      /** "For pros" box: code from the station file, title/note/comments from the language file. */
      pro(nm, src) {
        const cs = raw(K + 'pro.' + nm + '.c') || [];
        const vars = {};
        cs.forEach((c, i) => { vars['c' + (i + 1)] = c; });
        const note = raw(K + 'pro.' + nm + '.note');
        return h('details', { class: 'pro' },
          h('summary', null, t('ui.forPros') + t(K + 'pro.' + nm + '.title')),
          h('div', { class: 'pro-body' }, note ? P(fmt(note)) : null, code(fmt(src, vars))));
      },
      badge: earnBadge,
      done: () => !!st(sd.id).ch,
      flag(k, v) { if (v === undefined) return S.flags[k]; S.flags[k] = v; save(); return v; },
      challenge(anchor) {
        const s = st(sd.id);
        if (s.ch) return false;
        s.ch = true;
        save();
        sound('coin');
        addCoins(15, anchor);
        if (goalEl) {
          goalEl.classList.add('ok');
          goalEl.replaceChildren(icon('check'), h('span', null, t('ui.taskDone') + t(K + 'challenge')));
          goalEl.style.animation = 'pop .4s ease';
        }
        if (api.onChallenge) api.onChallenge();
        checkStars();
        return true;
      },
    };
    return api;
  }

  function completeStation(sd, idx, anchor) {
    const s = st(sd.id);
    if (s.done) return;
    s.done = true;
    save();
    sound('win');
    confetti();
    const next = STATIONS[idx + 1];
    const stars = starsOf(sd.id);
    showModal((close) => h('div', { class: 'modal' },
      h('div', { class: 'eyebrow' }, t('ui.stationDoneEyebrow', { n: idx + 1 })),
      h('div', { class: 'big' }, '✅'),
      h('h2', null, stTitle(sd)),
      h('div', { class: 'stars', style: { gap: '6px' } }, stars.map((on) => { const e = starSvg(on); e.style.width = '34px'; e.style.height = '34px'; return e; })),
      h('p', null, t('ui.stationDoneText', { n: stars.filter(Boolean).length })),
      h('div', { class: 'btns' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { close(); go('map'); } }, t('ui.toMap')),
        next ? h('button', { class: 'btn', type: 'button', onclick: () => { close(); openStation(idx + 1); } }, next.exam ? t('ui.toExam') : t('ui.nextStation')) : null)));
    addCoins(25, anchor);
    if (doneCount() === 1) earnBadge('erster_schritt');
    if (learnStations().filter((x) => x.world === sd.world).every((x) => st(x.id).done)) earnBadge('welt' + sd.world);
    checkStars();
    render();
    const bar = $('.done-bar');
    if (bar) bar.scrollIntoView({ block: 'center' });
  }

  /* ------------------------------------------------------------------ */
  /* Quiz                                                                */
  /* ------------------------------------------------------------------ */

  /** Merge a question's structure (from code) with its texts (from the language file). */
  function mergeQuestions(structure, texts) {
    return structure.map((q, i) => Object.assign({}, q, (texts && texts[i]) || {}));
  }
  function unitText(u) {
    if (u === 'money') return curSymbol();
    if (u === 'minor') return t('ui.minorUnit');
    return u || '';
  }
  function answerText(q) {
    if (q.unit === 'money') return money(Math.round(q.a * 100));
    if (q.unit === 'minor') return numf(q.a) + ' ' + t('ui.minorUnit');
    return numf(q.a) + (q.unit ? ' ' + q.unit : '');
  }

  function renderQuiz(sd, mount, onComplete) {
    const s = st(sd.id);
    const qs = mergeQuestions(sd.quiz, raw('s.' + sd.id + '.quiz'));
    const run = { mistakes: 0, solved: 0 };
    const wrap = h('div', { class: 'quiz' });
    const sum = h('div', { class: 'quiz-sum', role: 'status' });
    if (s.quiz) {
      sum.append(h('span', null, s.perfect ? t('ui.quizAlreadyPerfect') : t('ui.quizAlready')));
      wrap.append(sum);
    }
    qs.forEach((q, i) => {
      wrap.append(questionCard(q, i, qs.length, {
        onAnswer(correct, firstTry, anchor) {
          if (!correct) { run.mistakes++; S.streak = 0; save(); return; }
          run.solved++;
          if (s.q[i] == null) { s.q[i] = firstTry ? 1 : 2; addCoins(firstTry ? 10 : 5, anchor); }
          if (firstTry) { S.streak = (S.streak || 0) + 1; if (S.streak >= 5) earnBadge('serie'); }
          save();
          if (run.solved === qs.length) finish();
        },
      }));
    });
    function finish() {
      const firstTime = !s.quiz;
      s.quiz = true;
      let msg = t('ui.quizDone');
      if (run.mistakes === 0) {
        msg = t('ui.quizPerfect');
        if (!s.perfect) { s.perfect = true; save(); addCoins(10, sum); }
        earnBadge('volltreffer');
      } else if (firstTime) {
        msg = t(run.mistakes === 1 ? 'ui.quizDoneMistake' : 'ui.quizDoneMistakes', { n: run.mistakes });
      }
      save();
      sum.replaceChildren(h('span', null, msg),
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => { mount.replaceChildren(); renderQuiz(sd, mount, onComplete); } }, t('ui.replay')));
      if (!sum.isConnected) wrap.append(sum);
      sound('win');
      checkStars();
      onComplete();
    }
    mount.append(wrap);
  }

  let qSeq = 0;
  function questionCard(q, i, n, cb) {
    const oneShot = !!cb.oneShot;
    const card = h('div', { class: 'q' });
    card.append(h('div', { class: 'qn' }, t('ui.questionN', { n: i + 1, m: n })), h('h3', { html: fmt(q.q) }));
    const fb = h('div', { class: 'fb', role: 'status' });
    let tries = 0;
    let solved = false;

    function good(anchor) {
      solved = true;
      card.classList.add('solved');
      fb.className = 'fb show ok';
      fb.replaceChildren(h('span', null, pick(raw('ui.praise'))), q.why ? h('span', { class: 'why', html: fmt(q.why) }) : null);
      sound('right');
      cb.onAnswer(true, tries === 1, anchor);
    }
    function bad(anchor, reveal) {
      fb.className = 'fb show no';
      if (oneShot) {
        solved = true;
        fb.replaceChildren(h('span', null, t('ui.wrongShot') + (reveal ? ' ' + reveal : '')), q.why ? h('span', { class: 'why', html: fmt(q.why) }) : null);
      } else {
        fb.replaceChildren(h('span', null, q.hint ? fmt(q.hint) : pick(raw('ui.retry'))));
      }
      anchor.classList.add('shake');
      setTimeout(() => anchor.classList.remove('shake'), 450);
      sound('wrong');
      cb.onAnswer(false, false, anchor);
    }

    if (q.type === 'num') {
      const id = 'qn-' + (++qSeq);
      const inp = h('input', { type: 'text', inputmode: 'decimal', id, autocomplete: 'off', 'aria-label': t('ui.yourAnswer') });
      const btn = h('button', { class: 'btn small', type: 'button' }, t('ui.check'));
      const check = () => {
        if (solved) return;
        const v = parseNum(inp.value);
        if (v == null) { fb.className = 'fb show no'; fb.replaceChildren(h('span', null, t('ui.enterNumber'))); return; }
        tries++;
        if (Math.abs(v - q.a) <= (q.tol || 1e-6)) { inp.disabled = true; btn.disabled = true; inp.style.borderColor = 'var(--green)'; good(btn); }
        else {
          if (oneShot) { inp.disabled = true; btn.disabled = true; }
          inp.style.borderColor = 'var(--red)';
          bad(inp, t('ui.correctWas', { v: answerText(q) }));
        }
      };
      btn.addEventListener('click', check);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
      card.append(h('div', { class: 'numrow' }, inp, q.unit ? h('b', null, unitText(q.unit)) : null, btn));
    } else {
      const options = q.type === 'tf' ? [t('ui.true'), t('ui.false')] : (q.o || []);
      const right = q.type === 'tf' ? (q.a ? 0 : 1) : q.a;
      const order = q.type === 'tf' ? [0, 1] : shuffle(options.map((_, k) => k));
      const grid = h('div', { class: 'opts' });
      const btns = [];
      order.forEach((k, pos) => {
        const b = h('button', { class: 'opt', type: 'button' }, h('span', { class: 'l', 'aria-hidden': 'true' }, 'ABCD'[pos]), h('span', { html: fmt(options[k]) }));
        b._k = k;
        b.addEventListener('click', () => {
          if (solved || b.disabled) return;
          tries++;
          if (k === right) {
            b.classList.add('right');
            btns.forEach((x) => { x.disabled = true; });
            good(b);
          } else {
            b.classList.add('wrong');
            b.disabled = true;
            if (oneShot) btns.forEach((x) => { x.disabled = true; if (x._k === right) x.classList.add('right'); });
            bad(b, '');
          }
        });
        btns.push(b);
        grid.append(b);
      });
      card.append(grid);
    }
    card.append(fb);
    return card;
  }

  /* ------------------------------------------------------------------ */
  /* Final exam                                                          */
  /* ------------------------------------------------------------------ */

  function renderExam(a, sd) {
    const s = st(sd.id);
    a.append(h('header', { class: 'st-head' },
      h('button', { class: 'btn small ghost st-back', type: 'button', onclick: () => go('map') }, icon('back'), t('ui.map')),
      h('div', { class: 'eyebrow' }, t('ui.finaleTag')),
      h('div', { class: 'st-title' }, h('div', { class: 'st-badge', 'aria-hidden': 'true' }, '🏆'), h('h1', null, stTitle(sd))),
      h('p', { class: 'lead' }, t('s.finale.lead'))));
    const mount = h('div', { class: 'sec' });
    a.append(mount);
    intro();

    function intro() {
      mount.replaceChildren(h('div', { class: 'panel' },
        h('h3', null, s.done ? t('ui.examAlready') : t('ui.examHow')),
        h('div', { class: 'prose', style: { marginTop: '8px' } },
          h('ul', null, (raw('ui.examRules') || []).map((r) => h('li', null, r))),
          h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
            h('button', { class: 'btn gold', type: 'button', onclick: runExam }, s.done ? t('ui.examPractice') : t('ui.finaleStart')),
            s.done ? h('button', { class: 'btn ghost', type: 'button', onclick: () => go('urkunde') }, t('ui.viewCert')) : null))));
    }

    function runExam() {
      const qs = shuffle(mergeQuestions(sd.pool, raw('s.finale.pool'))).slice(0, 10);
      let answered = 0;
      let right = 0;
      const prog = h('div', { class: 'quiz-sum' }, h('span', null, t('ui.examScore', { n: 0 })));
      const wrap = h('div', { class: 'quiz' }, prog);
      qs.forEach((q, i) => wrap.append(questionCard(q, i, qs.length, {
        oneShot: true,
        onAnswer(ok) {
          answered++;
          if (ok) { right++; S.streak = (S.streak || 0) + 1; if (S.streak >= 5) earnBadge('serie'); } else S.streak = 0;
          save();
          prog.replaceChildren(h('span', null, t('ui.examScore', { n: right })));
          if (answered === qs.length) result();
        },
      })));
      mount.replaceChildren(wrap);
      sound('click');

      function result() {
        const pass = right >= 8;
        const bar = h('div', { class: 'done-bar' });
        if (pass) {
          bar.append(h('p', null, t('ui.examPass', { n: right })),
            h('button', { class: 'btn gold', type: 'button', onclick: () => go('urkunde') }, t('ui.viewCert')));
          const first = !s.done;
          s.done = true;
          if (first) s.doneAt = Date.now();
          save();
          sound('win'); confetti(220);
          if (first) addCoins(100, bar);
          earnBadge('meister');
        } else {
          bar.append(h('p', null, t('ui.examFail', { n: right })),
            h('button', { class: 'btn', type: 'button', onclick: runExam }, t('ui.examNew')));
          sound('wrong');
        }
        mount.append(bar);
        setTimeout(() => bar.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }), 150);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Badges, glossary, certificate                                       */
  /* ------------------------------------------------------------------ */

  function backBar() {
    return h('div', { class: 'st-head' }, h('button', { class: 'btn small ghost st-back', type: 'button', onclick: () => go('map') }, icon('back'), t('ui.map')));
  }

  function renderBadges(a) {
    const earned = Object.keys(S.badges).length;
    a.append(backBar(),
      h('div', { class: 'eyebrow' }, t('ui.collection')),
      h('h1', { style: { fontSize: 'clamp(1.8rem,5vw,2.6rem)' } }, app('badges.title')),
      h('p', { class: 'lead', style: { margin: '8px 0 22px' } }, t('ui.badgesLead', { a: earned, b: BADGES.length })),
      h('div', { class: 'badge-grid' }, BADGES.map((b) => {
        const when = S.badges[b.id];
        return h('div', { class: 'bdg' + (when ? '' : ' off') },
          h('div', { class: 'e', 'aria-hidden': 'true' }, b.e),
          h('b', null, t('badge.' + b.id + '.name')),
          h('span', null, (when ? '' : app('badges.how_to_earn') + ': ') + t('badge.' + b.id + '.desc')),
          h('small', null, when ? app('badges.earned_on', { date: datef(new Date(when), { day: 'numeric', month: 'short', year: 'numeric' }) }) : app('badges.locked')));
      })));
  }

  function renderLexikon(a) {
    const items = [];
    learnStations().forEach((sd) => (raw('s.' + sd.id + '.words') || []).forEach((w) => items.push({ w, sd, on: st(sd.id).done })));
    const got = items.filter((x) => x.on).length;
    a.append(backBar(),
      h('div', { class: 'eyebrow' }, t('ui.lexEyebrow')),
      h('h1', { style: { fontSize: 'clamp(1.8rem,5vw,2.6rem)' } }, t('ui.lexicon')),
      h('p', { class: 'lead', style: { margin: '8px 0 22px' } }, t('ui.lexLead', { a: got, b: items.length })),
      h('div', { class: 'lex-grid' }, items.map((x) => {
        const idx = STATIONS.indexOf(x.sd);
        return x.on
          ? h('div', { class: 'lex', style: { '--wc': WORLDS[x.sd.world - 1].wc } }, h('b', null, fmt(x.w[0])), h('span', null, fmt(x.w[1])), h('small', null, t('ui.lexFrom', { n: idx + 1, title: stTitle(x.sd) })))
          : h('div', { class: 'lex off' }, h('b', null, '???'), h('span', null, t('ui.lexLocked', { n: idx + 1 })));
      })));
  }

  function renderUrkunde(a) {
    if (!st('finale').done) { view = { name: 'map' }; renderMap(a); return; }
    const r = rankIdx(S.coins);
    const date = datef(new Date(st('finale').doneAt || Date.now()), { day: 'numeric', month: 'long', year: 'numeric' });
    const seal = svg('<svg class="seal" viewBox="0 0 120 120" aria-hidden="true"><g fill="#F5B323" stroke="#C98408" stroke-width="2">' +
      Array.from({ length: 16 }, (_, i) => '<circle cx="' + (60 + 50 * Math.cos(i * Math.PI / 8)) + '" cy="' + (60 + 50 * Math.sin(i * Math.PI / 8)) + '" r="10"/>').join('') +
      '<circle cx="60" cy="60" r="48"/></g><circle cx="60" cy="60" r="38" fill="#FBD15B" stroke="#C98408" stroke-width="2"/><text x="60" y="74" text-anchor="middle" font-size="40">🏆</text></svg>');
    a.append(backBar(), h('div', { class: 'urkunde' },
      seal,
      h('div', { class: 'eyebrow' }, t('ui.certEyebrow')),
      h('h1', null, t('badge.meister.name')),
      h('p', null, t('ui.certIntro')),
      h('div', { class: 'who' }, avatar() + ' ' + (S.name || '')),
      h('p', null, t('ui.certText')),
      h('div', { class: 'kv', style: { width: '100%' } },
        h('div', null, h('small', null, t('ui.yourRank')), h('b', null, rankLabel(r))),
        h('div', null, h('small', null, t('ui.coins')), h('b', null, S.coins)),
        h('div', null, h('small', null, t('ui.statStars')), h('b', null, totalStars() + ' / 45')),
        h('div', null, h('small', null, t('ui.statBadges')), h('b', null, Object.keys(S.badges).length + ' / ' + BADGES.length))),
      h('p', { class: 'hint', style: { color: 'var(--muted)' } }, t('ui.certFooter', { date }))));
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function boot(data) {
    const wanted = S.lang && LANGS.some((l) => l.code === S.lang) ? S.lang : detectLang();
    withLang(wanted, () => start(wanted, data));
  }
  function start(code, data) {
    LANG = code;
    applyLang();
    applyTheme();
    const okViews = ['map', 'station', 'badges', 'lexikon', 'urkunde'];
    if (S.name && data && data.view && okViews.includes(data.view.name)) view = data.view;
    else view = S.name ? { name: 'map' } : { name: 'onboarding' };
    render();
    initCloud();
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => { if (!S.theme) { renderHUD(false); if (redrawPaths) redrawPaths(); } };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
  }

  window.Lern = {
    lang: addLang,
    defineStation(def) { STATIONS.push(def); },
    boot,
    snapshot() { return { view }; },
    setLang,
    // for the stations
    t, raw, app, fmt, money, numf, datef, curSymbol, langInfo, LANGS, SYMBOLS, AVATARS,
    currentLang: () => LANG,
    h, svg, P, box, code, panel, formula, esc, highlight, shuffle, pick, parseNum, sound, confetti, toast, floater, icon, starSvg,
    name, avatar, effectiveDark, toggleTheme,
  };
})();
