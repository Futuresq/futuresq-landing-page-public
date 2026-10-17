/* Sparly Escape – game engine: i18n, state, scenes, close-ups, locks, hints, notebook, timer. */
(function () {
  'use strict';

  const STORE_KEY = 'sparly-escape-v1';
  const LERN_KEY = 'sparly-von-innen-v1'; // the learning world on the same site: name and avatar are offered from there

  // The 20 avatars from the app (src/constants/avatars.ts), as in the learning world.
  const AVATARS = ['😊', '😎', '🤓', '😺', '🦊', '🐶', '🐱', '🐰', '🦄', '🐼', '🦁', '🐸', '🦋', '🌟', '🚀', '⚡', '🎨', '🎵', '🏆', '💎'];

  // Same languages, locales and default currencies as the app and the learning world.
  const LANGS = [
    { code: 'de', label: 'Deutsch', flag: '🇩🇪', locale: 'de-DE', cur: 'EUR' },
    { code: 'en', label: 'English', flag: '🇬🇧', locale: 'en-US', cur: 'USD' },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷', locale: 'tr-TR', cur: 'TRY' },
    { code: 'ro', label: 'Română', flag: '🇷🇴', locale: 'ro-RO', cur: 'RON' },
    { code: 'fr', label: 'Français', flag: '🇫🇷', locale: 'fr-FR', cur: 'EUR' },
    { code: 'pl', label: 'Polski', flag: '🇵🇱', locale: 'pl-PL', cur: 'PLN' },
    { code: 'es', label: 'Español', flag: '🇪🇸', locale: 'es-ES', cur: 'EUR' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹', locale: 'it-IT', cur: 'EUR' },
    { code: 'cs', label: 'Čeština', flag: '🇨🇿', locale: 'cs-CZ', cur: 'CZK' },
    // Serbian in both scripts, as in the app: lang/sr.js is Cyrillic, the Latin texts are derived from it.
    { code: 'sr', label: 'Српски (ћирилица)', flag: '🇷🇸', locale: 'sr-RS', cur: 'RSD', sym: 'дин.' },
    { code: 'sr-Latn', label: 'Srpski (latinica)', flag: '🇷🇸', locale: 'sr-Latn-RS', cur: 'RSD' },
  ];
  const SYMBOLS = { EUR: '€', USD: '$', PLN: 'zł', RON: 'lei', TRY: '₺', CZK: 'Kč', RSD: 'din.' };
  const FALLBACK_LANG = 'en';

  const ROOMS = [];
  const NOTES = {};
  const ITEMS = {};

  /* ------------------------------------------------------------------ */
  /* i18n                                                                */
  /* ------------------------------------------------------------------ */

  const DICT = {};
  let LANG = 'de';

  // Serbian Latin from Serbian Cyrillic, letter for letter, like the app (src/i18n/serbianLatin.ts).
  const SR_LATIN = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i',
    ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
  };
  const isLetter = (ch) => !!ch && ch.toLowerCase() !== ch.toUpperCase();
  const isUpper = (ch) => isLetter(ch) && ch === ch.toUpperCase();
  function toSerbianLatin(text) {
    const chars = Array.from(text);
    return chars.map((ch, i) => {
      const lower = ch.toLowerCase();
      const latin = SR_LATIN[lower];
      if (latin === undefined) return ch;
      if (ch === lower) return latin;
      // Љ, Њ, Џ become "Lj", "Nj", "Dž" in a capitalised word but "LJ", "NJ", "DŽ" in an all-caps one.
      const next = chars[i + 1];
      const allCaps = isUpper(next) || (!isLetter(next) && isUpper(chars[i - 1]));
      return allCaps ? latin.toUpperCase() : latin.charAt(0).toUpperCase() + latin.slice(1);
    }).join('');
  }
  function latinDeep(v) {
    if (typeof v === 'string') return toSerbianLatin(v);
    if (Array.isArray(v)) return v.map(latinDeep);
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = latinDeep(v[k]); return o; }
    return v;
  }

  function addLang(code, obj) {
    DICT[code] = Object.assign(DICT[code] || {}, obj);
    if (code === 'sr') addLang('sr-Latn', latinDeep(obj));
  }
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
  function curFormatter(li, digits) {
    try { return nf(li.locale, { style: 'currency', currency: li.cur, currencyDisplay: 'narrowSymbol', minimumFractionDigits: digits, maximumFractionDigits: digits }); }
    catch { return nf(li.locale, { style: 'currency', currency: li.cur, minimumFractionDigits: digits, maximumFractionDigits: digits }); }
  }
  /** Money in minor units, formatted like the app: the language decides the layout, the app's table the symbol. */
  function money(cents, whole, code) {
    const li = langInfo(code);
    return curFormatter(li, whole ? 0 : 2).formatToParts(cents / 100).map((p) => (p.type === 'currency' ? symbolOf(li) : p.value)).join('');
  }
  /** How the language writes an amount: text before the number, the decimal sign, text after it. */
  function moneyParts(code) {
    const li = langInfo(code);
    const parts = curFormatter(li, 2).formatToParts(12.34);
    let pre = ''; let post = ''; let dec = '.'; let seenNum = false;
    for (const p of parts) {
      const v = p.type === 'currency' ? symbolOf(li) : p.value;
      if (p.type === 'integer') { seenNum = true; continue; }
      if (p.type === 'fraction') continue;
      if (p.type === 'decimal') { dec = v; continue; }
      if (seenNum) post += v; else pre += v;
    }
    return { pre: pre.replace(/\s+/g, ' '), dec, post: post.replace(/\s+/g, ' ') };
  }
  function symbolOf(li) { return li.sym || SYMBOLS[li.cur]; }
  function curSymbol(code) { return symbolOf(langInfo(code)); }
  function numf(n, code) { return nf(langInfo(code).locale, { maximumFractionDigits: 2 }).format(n); }
  function datef(iso, opts, code) {
    const d = typeof iso === 'string' ? new Date(iso + 'T12:00:00') : iso;
    return d.toLocaleDateString(langInfo(code).locale, opts || { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /**
   * Fill placeholders: %{m:1050} money, %{mw:1000} whole money, %{n:10000} number,
   * %{d:2026-03-02} date, %{key} from vars (%{name} defaults to the player's escaped name).
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
  /** A list from the language file, each entry with its placeholders filled. */
  function tl(key, vars) {
    const v = raw(key);
    return Array.isArray(v) ? v.map((s) => (typeof s === 'string' ? fmt(s, vars) : s)) : [];
  }
  function detectLang() {
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']);
    for (const l of list) {
      const c = String(l).split(/[-_]/)[0].toLowerCase();
      if (c === 'sr') return /latn/i.test(l) ? 'sr-Latn' : 'sr';
      if (LANGS.some((x) => x.code === c)) return c;
    }
    return FALLBACK_LANG;
  }
  function applyLang() {
    document.documentElement.lang = LANG;
    document.title = t('ui.title');
  }
  /** Load a language file on demand (only English ships with the page). */
  const langLoads = {};
  function ensureLang(code) {
    if (DICT[code] && DICT[code]['ui.title']) return Promise.resolve();
    if (!langLoads[code]) {
      langLoads[code] = new Promise((resolve) => {
        const el = document.createElement('script');
        el.src = 'lang/' + (code === 'sr-Latn' ? 'sr' : code) + '.js'; // the Latin texts are made from the Cyrillic file
        el.onload = resolve;
        el.onerror = resolve; // fall back to English texts
        document.head.append(el);
      });
    }
    return langLoads[code];
  }
  function withLang(code, fn) {
    if (DICT[code] && DICT[code]['ui.title']) fn();
    else ensureLang(code).then(fn);
  }

  /* ------------------------------------------------------------------ */
  /* State & persistence                                                 */
  /* ------------------------------------------------------------------ */

  function fresh() {
    return {
      v: 1, name: '', avatar: 4, lang: null, sound: true,
      phase: 'onb', story: 0, room: 0,
      f: {}, items: [], notes: [], unread: 0, seen: {}, hints: {}, coins: {},
      time: 0, doneAt: 0, tut: false, best: null, savedAt: 0,
    };
  }
  function migrate(o) {
    const f = fresh();
    if (!o || typeof o !== 'object') return f;
    const s = Object.assign(f, o);
    for (const k of ['f', 'seen', 'hints', 'coins']) if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {};
    for (const k of ['items', 'notes']) if (!Array.isArray(s[k])) s[k] = [];
    if (!['onb', 'story', 'play', 'end'].includes(s.phase)) s.phase = 'onb';
    if (!s.name) s.phase = 'onb';
    return s;
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
  }
  /** Name and avatar from the learning world, if this browser has played it. */
  function lernProfile() {
    try {
      const o = JSON.parse(localStorage.getItem(LERN_KEY) || 'null');
      if (o && typeof o.name === 'string' && o.name.trim()) return { name: o.name.trim().slice(0, 20), avatar: Number(o.avatar) || 0, lang: o.lang };
    } catch { /* ignore */ }
    return null;
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
  function pick(a) { return a && a.length ? a[Math.floor(Math.random() * a.length)] : ''; }
  function name() { return S.name || t('ui.you'); }
  function avatar() { return AVATARS[S.avatar] || '😊'; }
  function live(msg) { const l = $('#live'); if (l) { l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30); } }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function clock(ms) {
    const s = Math.floor(ms / 1000);
    const hh = Math.floor(s / 3600); const mm = Math.floor((s % 3600) / 60); const ss = s % 60;
    const two = (n) => String(n).padStart(2, '0');
    return hh ? hh + ':' + two(mm) + ':' + two(ss) : two(mm) + ':' + two(ss);
  }
  function minutes(ms) { return Math.max(1, Math.round(ms / 60000)); }
  function shakeEl(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 450); }

  /* ------------------------------------------------------------------ */
  /* Icons & Buggy                                                       */
  /* ------------------------------------------------------------------ */

  const ICONS = {
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13M9 7h6M9 10h4"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  };
  function icon(n) { return svg(ICONS[n]); }

  /** Buggy, the bug who locked the app. Moods: grin, angry, shock, sad. */
  function buggy(mood, cls) {
    const m = mood || 'grin';
    const brows = m === 'angry' ? '<path d="M41 30l13 6M79 30l-13 6" stroke="#1B1B2F" stroke-width="4" stroke-linecap="round"/>' : m === 'sad' ? '<path d="M42 35l12-4M78 35l-12-4" stroke="#1B1B2F" stroke-width="4" stroke-linecap="round"/>' : '';
    const mouth = m === 'shock' ? '<ellipse cx="60" cy="58" rx="5" ry="6" fill="#fff"/>'
      : m === 'sad' ? '<path d="M51 60 Q60 53 69 60" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/>'
        : '<path d="M49 54 Q60 64 71 54" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/>';
    const pupils = m === 'shock' ? '<circle cx="50" cy="42" r="2.6" fill="#1B1B2F"/><circle cx="70" cy="42" r="2.6" fill="#1B1B2F"/>' : '<circle cx="52" cy="43" r="4" fill="#1B1B2F"/><circle cx="72" cy="43" r="4" fill="#1B1B2F"/>';
    return svg('<svg class="buggy-svg' + (cls ? ' ' + cls : '') + '" viewBox="0 0 120 120" aria-hidden="true">' +
      '<g stroke="#1B1B2F" stroke-width="5" stroke-linecap="round" fill="none"><path d="M30 72L13 64M28 86L12 95M90 72l17-8M92 86l16 9"/>' +
      '<path d="M52 26Q46 9 34 10M68 26q6-17 18-16"/></g><circle cx="34" cy="10" r="6" fill="#FFD36B"/><circle cx="86" cy="10" r="6" fill="#FFD36B"/>' +
      '<ellipse cx="60" cy="80" rx="35" ry="31" fill="#FF4757"/><path d="M60 52v59" stroke="#1B1B2F" stroke-width="3"/>' +
      '<g fill="#1B1B2F"><circle cx="44" cy="74" r="6"/><circle cx="77" cy="70" r="5"/><circle cx="47" cy="95" r="5"/><circle cx="75" cy="94" r="6"/></g>' +
      '<ellipse cx="60" cy="80" rx="35" ry="31" fill="none" stroke="#B3122A" stroke-width="2"/>' +
      '<circle cx="60" cy="44" r="23" fill="#1B1B2F"/><circle cx="50" cy="42" r="9" fill="#fff"/><circle cx="70" cy="42" r="9" fill="#fff"/>' +
      pupils + brows + mouth + '</svg>');
  }

  /* ------------------------------------------------------------------ */
  /* Sound & effects                                                     */
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
  function tone(c, f, t0, dur, type, vol, f2) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
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
    click: [[520, 0, 0.05, 'triangle', 0.05]],
    tick: [[1200, 0, 0.03, 'triangle', 0.04]],
    item: [[523, 0, 0.1, 'triangle'], [784, 0.08, 0.1, 'triangle'], [1047, 0.16, 0.25, 'triangle']],
    unlock: [[300, 0, 0.06, 'square', 0.05], [900, 0.06, 0.12, 'triangle', 0.09]],
    door: [[140, 0, 0.7, 'sawtooth', 0.025, 70], [523, 0.5, 0.15], [659, 0.62, 0.15], [784, 0.74, 0.35]],
    bug: [[880, 0, 0.06, 'square', 0.025], [660, 0.07, 0.06, 'square', 0.025], [990, 0.14, 0.08, 'square', 0.025]],
    whoosh: [[180, 0, 1.1, 'sine', 0.09, 1800]],
    win: [[392, 0, 0.12], [523, 0.1, 0.12], [659, 0.2, 0.12], [784, 0.3, 0.12], [1047, 0.42, 0.45]],
  };
  function sound(kind) {
    if (!S.sound) return;
    try {
      const c = audio();
      if (!c) return;
      const t0 = c.currentTime + 0.01;
      (SOUNDS[kind] || []).forEach((n) => tone(c, n[0], t0 + n[1], n[2], n[3] || 'sine', n[4] || 0.11, n[5]));
    } catch { /* no audio */ }
  }

  const fx = { parts: [], running: false };
  function confetti(count) {
    if (reduced()) return;
    const cv = $('#fx');
    const ctx = cv && cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#43CEA2', '#4F9CE8', '#F5B323', '#FF5D6C', '#A78BFA', '#34D399', '#FFD36B'];
    for (let i = 0; i < (count || 150); i++) {
      fx.parts.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.5, y: innerHeight * 0.35 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        w: 6 + Math.random() * 7, hgt: 4 + Math.random() * 6, c: pick(colors), round: Math.random() < 0.3, life: 0,
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
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2.4, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.w / 2, -p.hgt / 2, p.w, p.hgt);
        ctx.restore();
      }
      if (fx.parts.length) requestAnimationFrame(step);
      else { fx.running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
  }
  function floater(text, anchor) {
    let x = innerWidth / 2; let y = innerHeight / 2;
    if (anchor && anchor.getBoundingClientRect) {
      const r = anchor.getBoundingClientRect();
      if (r.width) { x = r.left + r.width / 2; y = r.top; }
      if (y < 60 || y > innerHeight - 20) y = innerHeight / 2;
    }
    const el = h('div', { class: 'floater', style: { left: x + 'px', top: y + 'px' } }, text);
    document.body.append(el);
    setTimeout(() => el.remove(), 1300);
  }
  let toastTimer = 0;
  function toast(msg) {
    const old = $('.toast');
    if (old) old.remove();
    const el = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.append(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 2800);
  }

  /* ------------------------------------------------------------------ */
  /* Sheets (close-ups and dialogs)                                      */
  /* ------------------------------------------------------------------ */

  const sheets = [];
  /**
   * Open a card above the game. opts: title, icon, body (element), foot (element), wide, center, opener, onClose.
   * Returns { close, el }.
   */
  function openSheet(opts) {
    const card = h('div', { class: 'sheet' + (opts.wide ? ' wide' : '') + (opts.center ? ' center' : '') + (opts.cls ? ' ' + opts.cls : ''), role: 'dialog', 'aria-modal': 'true' });
    const titleId = 'sh-' + Math.random().toString(36).slice(2, 8);
    if (opts.title) {
      card.setAttribute('aria-labelledby', titleId);
      card.append(h('div', { class: 'sheet-head' },
        opts.icon ? h('span', { class: 'sheet-ico', 'aria-hidden': 'true' }, opts.icon) : null,
        h('h2', { id: titleId }, opts.title),
        opts.noClose ? null : h('button', { class: 'xbtn', type: 'button', 'aria-label': t('ui.close'), title: t('ui.close'), onclick: () => close() }, icon('close'))));
    }
    const scroller = h('div', { class: 'sheet-scroll' }, opts.body || null);
    card.append(scroller);
    if (opts.foot) card.append(opts.foot);
    const bg = h('div', { class: 'sheet-bg' }, card);
    if (!opts.noClose) bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    const entry = { close, bg, onKey };
    function onKey(e) { if (e.key === 'Escape' && sheets[sheets.length - 1] === entry && !opts.noClose) close(); }
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      bg.remove();
      document.removeEventListener('keydown', onKey);
      const i = sheets.indexOf(entry);
      if (i >= 0) sheets.splice(i, 1);
      if (opts.onClose) opts.onClose();
      let back = opts.opener && opts.opener.isConnected ? opts.opener : null;
      if (!back && opts.opener && opts.opener.dataset && opts.opener.dataset.oid) back = document.querySelector('#stage [data-oid="' + opts.opener.dataset.oid + '"]');
      if (back) back.focus({ preventScroll: true });
    }
    document.addEventListener('keydown', onKey);
    document.body.append(bg);
    sheets.push(entry);
    // The content is often drawn right after the sheet opens, so pick the focus target a moment later.
    setTimeout(() => {
      if (closed) return;
      const f = card.querySelector('.sheet-scroll .wval, .sheet-scroll .keypad button, .sheet-scroll input, .sheet-scroll button, .sheet-foot button') || card.querySelector('button');
      if (f) f.focus({ preventScroll: true });
    }, 30);
    return { close, el: card, scroller };
  }
  function closeAllSheets() { while (sheets.length) sheets[sheets.length - 1].close(); }

  /* ------------------------------------------------------------------ */
  /* Buggy's lines                                                       */
  /* ------------------------------------------------------------------ */

  let talk = { text: '', mood: 'grin' };
  function say(text, mood) {
    talk = { text: text || '', mood: mood || 'grin' };
    const el = $('#talk');
    if (el) drawTalk(el, true);
    if (text) sound('bug');
  }
  function sayKey(key, mood, vars) {
    const v = raw(key);
    say(Array.isArray(v) ? fmt(pick(v), vars) : t(key, vars), mood);
  }
  function drawTalk(el, anim) {
    el.replaceChildren(
      h('div', { class: 'talk-ava' + (anim ? ' wiggle' : '') }, buggy(talk.mood)),
      h('div', { class: 'talk-bubble' + (anim ? ' pop' : '') },
        h('b', null, 'Buggy'),
        h('span', { html: talk.text || '…' })));
  }

  /* ------------------------------------------------------------------ */
  /* Rooms, items, notes                                                 */
  /* ------------------------------------------------------------------ */

  const apis = {};
  let lastProgress = Date.now();
  const nudged = {};

  function roomApi(room) {
    if (apis[room.id]) return apis[room.id];
    const A = {
      room,
      t: (k, v) => t('r.' + room.id + '.' + k, v),
      tl: (k, v) => tl('r.' + room.id + '.' + k, v),
      raw: (k) => raw('r.' + room.id + '.' + k),
      f(k, v) {
        const key = room.id + '.' + k;
        if (v === undefined) return S.f[key];
        S.f[key] = v; save(); return v;
      },
      has: (id) => S.items.includes(id),
      got: (id) => !!S.f['got.' + id],
      give(id, anchor) {
        if (S.items.includes(id) || S.f['got.' + id]) return false;
        S.items.push(id); S.f['got.' + id] = true; save();
        progress();
        sound('item');
        floater(ITEMS[id].e, anchor || $('#bag'));
        toast(t('ui.gotItem', { item: ITEMS[id].e + ' ' + t('item.' + id) }));
        live(t('ui.gotItem', { item: t('item.' + id) }));
        refresh();
        return true;
      },
      take(id) { S.items = S.items.filter((x) => x !== id); save(); refresh(); },
      note(id) { return addNote(id); },
      coin(id, anchor) {
        if (S.coins[id]) return false;
        S.coins[id] = Date.now(); save();
        sound('coin'); floater('🪙', anchor); confetti(40);
        toast(t('ui.coinFound', { n: Object.keys(S.coins).length, m: ROOMS.length }));
        refresh();
        return true;
      },
      say, sayKey,
      wrong() { sound('wrong'); sayKey('bug.wrong', 'grin'); },
      solved(msgKey) { progress(); sound('right'); sayKey(msgKey || 'bug.solved', 'angry'); refresh(); },
      done() { roomDone(room); },
      refresh,
      progress,
      // shared building blocks
      h, svg, P: (html, cls) => h('p', { html, class: cls || null }), money, moneyParts, fmt, numf, datef, curSymbol, shuffle, pick, sound, confetti, toast, floater, icon, buggy, esc, shakeEl, live, reduced,
      digitLock, symbolLock, keypad, orderPuzzle, paper,
      T: t, TL: tl, R: raw, lang: () => LANG, LANGS,
    };
    apis[room.id] = A;
    return A;
  }

  function addNote(id) {
    if (S.notes.includes(id)) return false;
    S.notes.push(id); S.unread = (S.unread || 0) + 1; save();
    progress();
    const b = $('#nb-btn');
    if (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    renderTop();
    return true;
  }
  function progress() { lastProgress = Date.now(); }

  function currentStep(room) {
    const A = roomApi(room);
    return room.steps.find((s) => !s.done(A)) || null;
  }
  function hintsUsed() { return Object.values(S.hints).reduce((a, b) => a + (Number(b) || 0), 0); }
  function coinsFound() { return Object.keys(S.coins).length; }

  /** A piece of paper (receipt, note, poster) in the close-up. */
  function paper(cls, kids) { return h('div', { class: 'paper ' + (cls || '') }, kids); }

  /* ------------------------------------------------------------------ */
  /* Locks                                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Number lock with turning wheels. opts: n, answer ('1075'), money (show as an amount), label,
   * onOpen(), onWrong(value), start.
   */
  function digitLock(opts) {
    const n = opts.n || 4;
    const vals = (opts.start || '0'.repeat(n)).split('').map(Number);
    const box = h('div', { class: 'lock digit-lock' });
    const row = h('div', { class: 'wheels' });
    const mp = opts.money ? moneyParts() : null;
    const wheels = vals.map((_, i) => wheel(i));
    if (mp && mp.pre.trim()) row.append(h('span', { class: 'wsym' }, mp.pre.trim()));
    wheels.forEach((w, i) => {
      if (mp && i === n - 2) row.append(h('span', { class: 'wsym dec' }, mp.dec));
      row.append(w);
    });
    if (mp && mp.post.trim()) row.append(h('span', { class: 'wsym' }, mp.post.trim()));
    const btn = h('button', { class: 'btn gold', type: 'button', onclick: tryOpen }, opts.button ? null : icon('lock'), opts.button || t('ui.open'));
    const msg = h('p', { class: 'lock-msg', role: 'status' });
    if (opts.label) box.append(h('div', { class: 'lock-label' }, opts.label));
    box.append(row, msg, h('div', { class: 'lock-btns' }, btn));
    function wheel(i) {
      const val = h('div', { class: 'wval num', tabindex: '0', role: 'spinbutton', 'aria-valuemin': '0', 'aria-valuemax': '9', 'aria-valuenow': String(vals[i]), 'aria-label': t('ui.wheelN', { n: i + 1 }) }, String(vals[i]));
      const set = (v) => { vals[i] = (v + 10) % 10; val.textContent = String(vals[i]); val.setAttribute('aria-valuenow', String(vals[i])); val.classList.remove('roll'); void val.offsetWidth; val.classList.add('roll'); sound('tick'); msg.textContent = ''; };
      val.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); set(vals[i] + 1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); set(vals[i] - 1); }
        else if (/^\d$/.test(e.key)) { set(Number(e.key)); const nx = wheels[i + 1]; if (nx) nx.querySelector('.wval').focus(); }
        else if (e.key === 'Enter') tryOpen();
      });
      return h('div', { class: 'wheel' },
        h('button', { class: 'wbtn', type: 'button', 'aria-label': t('ui.up'), tabindex: '-1', onclick: () => set(vals[i] + 1) }, icon('up')),
        val,
        h('button', { class: 'wbtn', type: 'button', 'aria-label': t('ui.down'), tabindex: '-1', onclick: () => set(vals[i] - 1) }, icon('down')));
    }
    function tryOpen() {
      if (box.classList.contains('open')) return;
      const v = vals.join('');
      if (v === opts.answer) {
        box.classList.add('open');
        btn.disabled = true;
        msg.textContent = t('ui.lockOpen');
        sound('unlock');
        setTimeout(() => opts.onOpen && opts.onOpen(), 450);
      } else {
        shakeEl(row);
        msg.textContent = t('ui.lockWrong');
        sound('wrong');
        sayKey('bug.wrong');
        if (opts.onWrong) opts.onWrong(v);
      }
    }
    return box;
  }

  /** Lock with symbol slots. opts: symbols, answer (indices), labels, onOpen(). */
  function symbolLock(opts) {
    const n = opts.answer.length;
    const vals = new Array(n).fill(-1);
    const box = h('div', { class: 'lock sym-lock' });
    const row = h('div', { class: 'slots' });
    const msg = h('p', { class: 'lock-msg', role: 'status' });
    const btn = h('button', { class: 'btn gold', type: 'button', onclick: tryOpen }, icon('lock'), t('ui.open'));
    const slots = vals.map((_, i) => {
      const face = h('span', { class: 'sface', 'aria-hidden': 'true' }, '?');
      const b = h('button', { class: 'slot', type: 'button', 'aria-label': (opts.labels ? opts.labels[i] + ': ' : '') + t('ui.slotEmpty'), onclick: () => turn(i, 1) }, face, opts.labels ? h('small', null, opts.labels[i]) : null);
      b.addEventListener('keydown', (e) => { if (e.key === 'ArrowUp') { e.preventDefault(); turn(i, 1); } if (e.key === 'ArrowDown') { e.preventDefault(); turn(i, -1); } });
      return { b, face };
    });
    function turn(i, d) {
      vals[i] = vals[i] < 0 ? (d > 0 ? 0 : opts.symbols.length - 1) : (vals[i] + d + opts.symbols.length) % opts.symbols.length;
      slots[i].face.textContent = opts.symbols[vals[i]];
      slots[i].b.setAttribute('aria-label', (opts.labels ? opts.labels[i] + ': ' : '') + (opts.names ? opts.names[vals[i]] : opts.symbols[vals[i]]));
      slots[i].face.classList.remove('roll'); void slots[i].face.offsetWidth; slots[i].face.classList.add('roll');
      sound('tick'); msg.textContent = '';
    }
    slots.forEach((s) => row.append(s.b));
    box.append(h('p', { class: 'lock-hint' }, t('ui.slotHint')), row, h('div', { class: 'sym-legend' }, opts.symbols.map((s, i) => h('span', null, s + (opts.names ? ' ' + opts.names[i] : '')))), msg, h('div', { class: 'lock-btns' }, btn));
    function tryOpen() {
      if (box.classList.contains('open')) return;
      if (vals.every((v, i) => v === opts.answer[i])) {
        box.classList.add('open'); btn.disabled = true; msg.textContent = t('ui.lockOpen'); sound('unlock');
        setTimeout(() => opts.onOpen && opts.onOpen(), 450);
      } else {
        shakeEl(row); msg.textContent = vals.includes(-1) ? t('ui.slotFill') : t('ui.lockWrong'); sound('wrong');
        if (!vals.includes(-1)) sayKey('bug.wrong');
      }
    }
    return box;
  }

  /**
   * PIN keypad with Sparly's waiting times after wrong tries.
   * opts: n, answer, store (flag prefix for fails/wait), onOpen(), onWrong().
   */
  function keypad(opts) {
    const n = opts.n || 4;
    const A = opts.api;
    let entry = '';
    const box = h('div', { class: 'lock pad-lock' });
    const dots = h('div', { class: 'pin-dots', 'aria-hidden': 'true' });
    const shown = h('div', { class: 'sr', 'aria-live': 'polite' });
    const msg = h('p', { class: 'lock-msg', role: 'status' });
    const pad = h('div', { class: 'keypad' });
    const fails = () => Number(A.f(opts.store + 'Fails') || 0);
    function drawDots() { dots.replaceChildren(...Array.from({ length: n }, (_, i) => h('i', { class: i < entry.length ? 'f' : '' }))); shown.textContent = t('ui.pinCount', { a: entry.length, b: n }); }
    function waitLeft() { return Math.max(0, Number(A.f(opts.store + 'Wait') || 0) - Date.now()); }
    let timer = 0;
    function drawWait() {
      clearInterval(timer);
      const left = waitLeft();
      const btns = pad.querySelectorAll('button');
      if (left > 0) {
        btns.forEach((b) => { b.disabled = true; });
        msg.className = 'lock-msg wait';
        msg.textContent = t('ui.pinWait', { s: Math.ceil(left / 1000) });
        timer = setInterval(() => {
          if (!box.isConnected) { clearInterval(timer); return; }
          const l = waitLeft();
          if (l <= 0) { clearInterval(timer); btns.forEach((b) => { b.disabled = false; }); msg.className = 'lock-msg'; msg.textContent = t('ui.pinAgain', { n: fails() }); return; }
          msg.textContent = t('ui.pinWait', { s: Math.ceil(l / 1000) });
        }, 250);
      } else btns.forEach((b) => { b.disabled = false; });
    }
    function press(d) {
      if (waitLeft() > 0 || box.classList.contains('open')) return;
      if (d === 'del') { entry = entry.slice(0, -1); drawDots(); sound('tick'); return; }
      if (entry.length >= n) return;
      entry += d; drawDots(); sound('tick');
      if (entry.length === n) setTimeout(check, 180);
    }
    function check() {
      if (entry === opts.answer) {
        box.classList.add('open'); msg.className = 'lock-msg'; msg.textContent = t('ui.lockOpen'); sound('unlock');
        setTimeout(() => opts.onOpen && opts.onOpen(), 450);
        return;
      }
      const f = fails() + 1;
      A.f(opts.store + 'Fails', f);
      entry = ''; drawDots(); shakeEl(dots); sound('wrong');
      // Sparly's own tiers: tries 1–5 at once, 6–9 after 30 seconds, from 10 after 2 minutes (here capped at 2 minutes).
      const wait = f >= 9 ? 120 : f >= 5 ? 30 : 0;
      if (wait) {
        A.f(opts.store + 'Wait', Date.now() + wait * 1000);
        sayKey('bug.pinWait', 'grin', { s: wait });
        drawWait();
      } else {
        msg.className = 'lock-msg';
        msg.textContent = t('ui.pinWrong', { n: f });
        sayKey('bug.wrong');
      }
      if (opts.onWrong) opts.onWrong(f);
    }
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0'].forEach((d) => {
      pad.append(d === 'del'
        ? h('button', { type: 'button', class: 'del', 'aria-label': t('ui.delete'), onclick: () => press('del') }, '⌫')
        : h('button', { type: 'button', onclick: () => press(d) }, d));
    });
    box.addEventListener('keydown', (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); });
    box.append(dots, shown, pad, msg);
    drawDots();
    if (fails()) msg.textContent = t('ui.pinAgain', { n: fails() });
    drawWait();
    return box;
  }

  /** Tap the steps in the right order. opts: items (texts in order), onDone(), hintLater. */
  function orderPuzzle(opts) {
    const wrap = h('div', { class: 'order' });
    const status = h('p', { class: 'order-status', role: 'status' }, t('ui.orderStart'));
    const list = h('div', { class: 'order-list' });
    let next = 0;
    const order = shuffle(opts.items.map((_, i) => i));
    order.forEach((k) => {
      const b = h('button', { class: 'order-item', type: 'button' }, h('span', { class: 'no' }, '?'), h('span', { html: opts.items[k] }));
      b.addEventListener('click', () => {
        if (b.classList.contains('placed')) return;
        if (k === next) {
          b.classList.add('placed'); b.querySelector('.no').textContent = String(k + 1); b.disabled = true;
          next++; sound('right');
          if (next === opts.items.length) { status.textContent = t('ui.orderDone'); setTimeout(() => opts.onDone && opts.onDone(), 350); }
          else status.textContent = t('ui.orderRight');
        } else {
          shakeEl(b); sound('wrong');
          status.textContent = t('ui.orderLater', { n: next + 1 });
        }
      });
      list.append(b);
    });
    wrap.append(status, list);
    return wrap;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */

  function render() {
    renderTop();
    const a = $('#app');
    a.replaceChildren();
    a.className = 'phase-' + S.phase;
    if (S.phase === 'onb') renderOnb(a);
    else if (S.phase === 'story') renderStory(a);
    else if (S.phase === 'end') renderEnd(a);
    else renderPlay(a);
    renderFoot();
  }

  function renderTop() {
    const top = $('#top');
    if (!top) return;
    const playing = S.phase === 'play';
    const inner = h('div', { class: 'top-in' },
      h('div', { class: 'brand' }, logo(), h('span', { class: 'brand-txt' }, 'Sparly Escape', h('small', null, t('ui.tagline')))),
      playing ? h('ol', { class: 'roomdots', 'aria-label': t('ui.roomsAria') }, ROOMS.map((r, i) => h('li', {
        class: (i < S.room ? 'done' : i === S.room ? 'now' : ''), style: { '--rc': r.color },
        title: t('ui.roomN', { n: i + 1 }) + ': ' + t('r.' + r.id + '.title'),
        'aria-label': t('ui.roomN', { n: i + 1 }) + ': ' + t('r.' + r.id + '.title') + (i < S.room ? t('ui.roomDone') : i === S.room ? t('ui.roomHere') : ''),
      }, i < S.room ? icon('check') : h('span', { 'aria-hidden': 'true' }, r.icon)))) : h('div', { class: 'top-sp' }),
      playing ? h('div', { class: 'timer num', title: t('ui.time'), 'aria-label': t('ui.time') }, icon('clock'), h('span', { id: 'clock' }, clock(S.time))) : null,
      playing ? h('button', { class: 'iconbtn', type: 'button', title: t('ui.hints'), 'aria-label': t('ui.hints'), onclick: openHints }, icon('bulb')) : null,
      playing ? h('button', { class: 'iconbtn', id: 'nb-btn', type: 'button', title: t('ui.notebook'), 'aria-label': t('ui.notebook') + (S.unread ? ' (' + S.unread + ')' : ''), onclick: openNotebook }, icon('book'), S.unread ? h('span', { class: 'cnt' }, S.unread) : null) : null,
      h('button', { class: 'iconbtn langbtn', type: 'button', title: t('ui.language'), 'aria-label': t('ui.language') + ': ' + langInfo().label, onclick: langSheet }, icon('globe'), h('span', { class: 'cnt lang-code' }, LANG.split('-')[0].toUpperCase())),
      h('button', { class: 'iconbtn', type: 'button', title: S.sound ? t('ui.soundOff') : t('ui.soundOn'), 'aria-label': S.sound ? t('ui.soundOff') : t('ui.soundOn'), onclick: () => { S.sound = !S.sound; save(); renderTop(); if (S.sound) sound('click'); } }, icon(S.sound ? 'soundOn' : 'soundOff')));
    top.replaceChildren(inner);
  }

  let gradSeq = 0;
  function logo() {
    const id = 'lg' + (++gradSeq);
    return svg('<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43CEA2"/><stop offset="1" stop-color="#185A9D"/></linearGradient></defs><rect width="40" height="40" rx="12" fill="url(#' + id + ')"/><rect x="11" y="18" width="18" height="14" rx="3" fill="#fff"/><path d="M14.5 18v-3.5a5.5 5.5 0 0 1 11 0V18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M20 22.5v4" stroke="#185A9D" stroke-width="2.6" stroke-linecap="round"/></svg>');
  }

  function renderFoot() {
    const f = $('#foot');
    if (!f) return;
    // Links to the website only make sense where the page is hosted at futuresq.com/sparly/escape/.
    if (window.claude) { f.replaceChildren(); return; }
    f.replaceChildren(h('div', { class: 'wrap foot-in' },
      h('a', { href: '../' }, t('ui.footerSite')),
      h('a', { href: '../lernwelt/' }, t('ui.footerLern')),
      h('a', { href: '../../impressum.html' }, t('ui.footerImprint')),
      h('a', { href: '../../privacy-policy.html' }, t('ui.footerPrivacy')),
      h('span', null, t('ui.footerNote'))));
  }

  function setLang(code) {
    if (!LANGS.some((l) => l.code === code)) return;
    withLang(code, () => { LANG = code; S.lang = code; save(); applyLang(); render(); });
  }
  function langSheet(e) {
    const opener = e && e.currentTarget;
    const sh = openSheet({
      title: t('ui.language'), icon: '🌐', opener, center: true,
      body: h('div', { class: 'lang-grid' }, LANGS.map((l) => h('button', {
        class: 'chip', type: 'button', lang: l.code, 'aria-pressed': String(l.code === LANG),
        onclick: () => { sh.close(); setLang(l.code); },
      }, l.flag + ' ' + l.label))),
    });
  }

  /* ---------- Onboarding ---------- */

  let onbDraft = null;
  function renderOnb(a) {
    const lp = lernProfile();
    const draft = onbDraft || (onbDraft = { name: S.name || (lp ? lp.name : ''), avatar: S.name ? S.avatar : (lp ? lp.avatar : S.avatar) });
    const inp = h('input', { type: 'text', id: 'onb-player', maxlength: '20', autocomplete: 'off', placeholder: t('ui.namePh'), value: draft.name });
    inp.addEventListener('input', () => { draft.name = inp.value; });
    const err = h('p', { class: 'hint', role: 'status' });
    const grid = h('div', { class: 'ava-grid', role: 'group', 'aria-label': t('ui.pickAvatar') });
    AVATARS.forEach((e, i) => grid.append(h('button', {
      type: 'button', 'aria-pressed': String(i === draft.avatar), 'aria-label': t('ui.avatarN', { n: i + 1 }),
      onclick: (ev) => { draft.avatar = i; grid.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); ev.currentTarget.setAttribute('aria-pressed', 'true'); sound('click'); },
    }, e)));
    const langs = h('div', { class: 'lang-grid left', role: 'group', 'aria-label': t('ui.language') }, LANGS.map((l) => h('button', {
      class: 'chip', type: 'button', lang: l.code, 'aria-pressed': String(l.code === LANG),
      onclick: () => withLang(l.code, () => { LANG = l.code; S.lang = l.code; applyLang(); render(); }),
    }, l.flag + ' ' + l.label)));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });
    function start() {
      const n = inp.value.trim().replace(/\s+/g, ' ');
      if (!n) { err.textContent = t('ui.nameErr'); inp.focus(); shakeEl(inp); return; }
      const keep = { sound: S.sound, best: S.best };
      S = Object.assign(fresh(), keep, { name: n.slice(0, 20), avatar: draft.avatar, lang: LANG, phase: 'story', story: 0 });
      save();
      onbDraft = null;
      sound('whoosh');
      render();
      window.scrollTo(0, 0);
    }
    a.append(h('div', { class: 'onb wrap' },
      h('div', { class: 'onb-hero' },
        h('div', { class: 'onb-art', 'aria-hidden': 'true' }, phoneArt(), buggy('grin', 'onb-bug')),
        h('div', null,
          h('div', { class: 'eyebrow' }, t('ui.onbEyebrow')),
          h('h1', null, 'Sparly Escape'),
          h('p', { class: 'lead' }, t('ui.onbLead')),
          h('ul', { class: 'facts' }, tl('ui.onbFacts').map((x) => h('li', { html: x }))))),
      h('div', { class: 'onb-card' },
        h('h2', null, t('ui.language')), langs,
        h('h2', null, h('label', { for: 'onb-player' }, t('ui.yourName'))),
        lp && !S.name ? h('p', { class: 'hint' }, t('ui.fromLern')) : null,
        inp, err,
        h('h2', null, t('ui.pickAvatar')), grid,
        h('div', null, h('button', { class: 'btn gold big', type: 'button', onclick: start }, t('ui.start'))))));
    if (!lp) setTimeout(() => inp.focus({ preventScroll: true }), 50);
  }
  function phoneArt() {
    return svg('<svg class="phone-art" viewBox="0 0 160 240" aria-hidden="true"><defs><linearGradient id="pa1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43CEA2"/><stop offset="1" stop-color="#185A9D"/></linearGradient><radialGradient id="pa2"><stop offset="0" stop-color="#7FE8C6" stop-opacity=".9"/><stop offset="1" stop-color="#7FE8C6" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="80" cy="120" r="110" fill="url(#pa2)" class="pa-glow"/><rect x="22" y="12" width="116" height="216" rx="22" fill="#11161F"/><rect x="29" y="19" width="102" height="202" rx="16" fill="#F5F7FA"/>' +
      '<rect x="38" y="38" width="84" height="46" rx="10" fill="url(#pa1)"/><rect x="48" y="52" width="40" height="7" rx="3" fill="#fff" opacity=".8"/><rect x="48" y="64" width="60" height="10" rx="4" fill="#fff"/>' +
      '<rect x="38" y="94" width="84" height="16" rx="6" fill="#fff" stroke="#E5E7EB"/><rect x="38" y="116" width="84" height="16" rx="6" fill="#fff" stroke="#E5E7EB"/><rect x="38" y="138" width="84" height="16" rx="6" fill="#fff" stroke="#E5E7EB"/>' +
      '<g class="pa-swirl"><path d="M80 170 m-26 0 a26 26 0 1 0 52 0 a20 20 0 1 0 -40 0 a14 14 0 1 0 28 0 a8 8 0 1 0 -16 0" fill="none" stroke="#4F9CE8" stroke-width="4" stroke-linecap="round"/></g>' +
      '<rect x="29" y="198" width="102" height="23" fill="#fff"/><circle cx="80" cy="200" r="11" fill="url(#pa1)"/></svg>');
  }

  /* ---------- Story ---------- */

  function renderStory(a) {
    const panels = raw('story.panels') || [];
    const i = Math.min(S.story || 0, panels.length - 1);
    const last = i === panels.length - 1;
    const art = storyArt(i);
    a.append(h('div', { class: 'story wrap' },
      h('div', { class: 'story-card' },
        h('div', { class: 'story-art s' + i, 'aria-hidden': 'true' }, art),
        h('div', { class: 'story-txt' },
          h('div', { class: 'eyebrow' }, t('ui.storyN', { a: i + 1, b: panels.length })),
          h('p', { html: fmt(panels[i] || '') }),
          h('div', { class: 'story-btns' },
            i > 0 ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { S.story = i - 1; save(); render(); } }, t('ui.back')) : null,
            h('button', { class: 'btn gold', type: 'button', onclick: () => {
              if (last) { S.phase = 'play'; S.room = 0; save(); render(); enterRoom(true); sound('whoosh'); }
              else { S.story = i + 1; save(); render(); sound(i === 0 ? 'whoosh' : 'bug'); }
            } }, last ? t('ui.letsGo') : t('ui.next')))),
        h('div', { class: 'story-dots', 'aria-hidden': 'true' }, panels.map((_, k) => h('i', { class: k === i ? 'on' : '' }))))));
  }
  function storyArt(i) {
    if (i === 0) return h('div', { class: 'sa' }, phoneArt(), h('span', { class: 'sa-ava' }, avatar()));
    if (i === 1) return h('div', { class: 'sa' }, h('div', { class: 'vortex' }), h('span', { class: 'sa-ava spin' }, avatar()));
    if (i === 2) return h('div', { class: 'sa' }, buggy('grin', 'big-bug'), h('span', { class: 'sa-lock' }, '🔒'));
    return h('div', { class: 'sa map' }, ROOMS.map((r, k) => h('span', { class: 'sa-room', style: { '--rc': r.color, '--d': (k * 0.12) + 's' } }, r.icon)), h('span', { class: 'sa-room exit', style: { '--d': (ROOMS.length * 0.12) + 's' } }, '🌀'));
  }

  /* ---------- Play ---------- */

  function renderPlay(a) {
    const room = ROOMS[S.room];
    if (!room) { S.phase = 'end'; save(); renderEnd(a); return; }
    const A = roomApi(room);
    a.append(h('div', { class: 'play wrap', style: { '--rc': room.color } },
      h('div', { class: 'room-head' },
        h('div', { class: 'eyebrow' }, t('ui.roomOf', { n: S.room + 1, m: ROOMS.length })),
        h('h1', null, h('span', { 'aria-hidden': 'true' }, room.icon + ' '), t('r.' + room.id + '.title'))),
      h('div', { class: 'play-grid' },
        h('div', { class: 'stage-col', id: 'stage-col' }, renderStage(room, A)),
        h('aside', { class: 'side' },
          h('div', { class: 'talk', id: 'talk', 'aria-live': 'polite' }),
          h('div', { class: 'goal', id: 'goal' }),
          h('div', { class: 'bag', id: 'bag' })))));
    drawTalk($('#talk'), false);
    drawGoal(room);
    drawBag();
    if (!S.tut) setTimeout(tutorial, 400);
  }

  function renderStage(room, A) {
    const stage = h('div', { class: 'stage' + (room.stageClass ? ' ' + room.stageClass(A) : ''), id: 'stage', style: { '--rc': room.color } });
    stage.append(svg(room.art(A)));
    for (const o of room.objects) {
      if (o.when && !o.when(A)) continue;
      const key = room.id + '.' + o.id;
      const label = o.label ? o.label(A) : A.t('o.' + o.id);
      let el;
      if (o.area) {
        const [x, y, w, hh] = o.area;
        el = h('button', { class: 'area' + (o.chip ? ' chip-area' : ''), type: 'button', style: { left: x + '%', top: y + '%', width: w + '%', height: hh + '%' }, 'aria-label': label, title: label },
          o.chip ? h('span', { class: 'area-chip' }, o.chip(A)) : null);
      } else {
        const e = typeof o.e === 'function' ? o.e(A) : o.e;
        el = h('button', { class: 'obj' + (o.cls ? ' ' + o.cls : ''), type: 'button', style: { left: o.x + '%', top: o.y + '%', '--s': o.s || 1 }, 'aria-label': label, title: label },
          typeof e === 'string' ? h('span', { class: 'e', 'aria-hidden': 'true' }, e) : e);
      }
      const badge = o.badge ? o.badge(A) : null;
      if (badge) el.append(h('span', { class: 'badge', 'aria-hidden': 'true' }, badge));
      if (!S.seen[key] && !o.quiet) el.append(h('span', { class: 'spark', 'aria-hidden': 'true' }));
      el.dataset.oid = o.id;
      el.addEventListener('click', () => openObject(room, o, el));
      stage.append(el);
    }
    const bp = room.buggyAt ? room.buggyAt(A) : null;
    if (bp) {
      const b = h('button', { class: 'buggy-btn' + (bp.cls ? ' ' + bp.cls : ''), type: 'button', style: { left: bp.x + '%', top: bp.y + '%', '--s': bp.s || 1 }, 'aria-label': 'Buggy', title: 'Buggy',
        onclick: () => { sayKey(room.buggyLine ? room.buggyLine(A) : 'bug.poke', bp.mood || 'grin'); } }, buggy(bp.mood || 'grin'));
      stage.append(b);
    }
    return stage;
  }

  function refresh() {
    if (S.phase !== 'play') return;
    const room = ROOMS[S.room];
    if (!room) return;
    const A = roomApi(room);
    const col = $('#stage-col');
    if (col) col.replaceChildren(renderStage(room, A));
    drawGoal(room);
    drawBag();
    renderTop();
  }

  function drawGoal(room) {
    const el = $('#goal');
    if (!el) return;
    const step = currentStep(room);
    el.replaceChildren(
      h('div', { class: 'goal-k' }, t('ui.goal')),
      h('p', { html: step ? t('r.' + room.id + '.' + step.id + '.goal') : t('ui.goalDone') }),
      step ? h('div', { class: 'goal-row' },
        h('button', { class: 'btn small ghost', type: 'button', onclick: openHints }, icon('bulb'), t('ui.hint')),
        h('button', { class: 'btn small ghost', type: 'button', onclick: openNotebook }, icon('book'), t('ui.notebook')))
        : h('div', { class: 'goal-row' }, h('button', { class: 'btn gold', type: 'button', onclick: () => nextRoom() }, S.room === ROOMS.length - 1 ? t('ui.toEnd') : t('ui.nextRoom', { n: S.room + 2 }))));
  }

  function drawBag() {
    const el = $('#bag');
    if (!el) return;
    el.replaceChildren(
      h('div', { class: 'goal-k' }, '🎒 ' + t('ui.bag')),
      S.items.length
        ? h('div', { class: 'bag-items' }, S.items.map((id) => h('button', {
          class: 'item', type: 'button', title: t('item.' + id), 'aria-label': t('item.' + id),
          onclick: (e) => openSheet({ title: t('item.' + id), icon: ITEMS[id].e, opener: e.currentTarget, center: true, body: h('div', null, h('div', { class: 'item-big', 'aria-hidden': 'true' }, ITEMS[id].e), h('p', { html: t('item.' + id + '.desc') }), h('p', { class: 'hint' }, t('ui.itemHow'))) }),
        }, h('span', { 'aria-hidden': 'true' }, ITEMS[id].e), h('small', null, t('item.' + id)))))
        : h('p', { class: 'hint' }, t('ui.bagEmpty')),
      h('div', { class: 'coins-row', title: t('ui.coinsTitle') }, h('span', { 'aria-hidden': 'true' }, '🪙'), t('ui.coinsN', { n: coinsFound(), m: ROOMS.length })));
  }

  /** Close-up of an object: its own content, plus the backpack to try items on it. */
  function openObject(room, o, opener) {
    const A = roomApi(room);
    const key = room.id + '.' + o.id;
    if (!S.seen[key]) { S.seen[key] = 1; save(); const sp = opener && opener.querySelector('.spark'); if (sp) sp.remove(); }
    sound('click');
    const body = h('div', { class: 'cu' });
    const foot = h('div', { class: 'sheet-foot usebar' });
    const ctx = { body, redraw, close: () => sh.close() };
    const e = typeof o.e === 'function' ? o.e(A) : o.e;
    const sh = openSheet({ title: o.label ? o.label(A) : A.t('o.' + o.id), icon: o.icon ? o.icon(A) : (typeof e === 'string' ? e : '🔎'), body, foot, opener, wide: o.wide, onClose: () => { if (ctx.onClose) ctx.onClose(); refresh(); } });
    function redraw() {
      body.replaceChildren();
      o.open(A, ctx);
      drawUse();
    }
    function drawUse() {
      foot.replaceChildren();
      const usable = S.items.filter((id) => ITEMS[id]);
      foot.hidden = !usable.length || o.noUse;
      if (foot.hidden) return;
      foot.append(h('span', { class: 'use-k' }, t('ui.useItem')), ...usable.map((id) => h('button', {
        class: 'chip', type: 'button', 'data-item': id, onclick: (ev) => {
          const fn = o.use && o.use[id];
          if (fn) { fn(A, ctx, ev.currentTarget); refresh(); }
          else { sound('wrong'); shakeEl(ev.currentTarget); sayKey('bug.nofit', 'grin', { item: t('item.' + id) }); toast(t('ui.noFit', { item: t('item.' + id) })); }
        },
      }, ITEMS[id].e + ' ' + t('item.' + id))));
    }
    ctx.drawUse = drawUse;
    redraw();
  }

  /* ---------- Hints & notebook ---------- */

  function openHints(e) {
    const room = ROOMS[S.room];
    if (!room) return;
    const step = currentStep(room);
    const body = h('div', { class: 'hints' });
    const sh = openSheet({ title: t('ui.hints'), icon: '💡', body, opener: e && e.currentTarget, center: true });
    draw();
    function draw() {
      body.replaceChildren();
      if (!step) { body.append(h('p', null, t('ui.goalDone'))); return; }
      const key = room.id + '.' + step.id;
      const list = tl('r.' + room.id + '.' + step.id + '.h', room.hintVars ? room.hintVars(roomApi(room)) : undefined);
      const used = Math.min(S.hints[key] || 0, list.length);
      body.append(h('div', { class: 'goal-k' }, t('ui.goal')), h('p', { class: 'hint-goal', html: t('r.' + room.id + '.' + step.id + '.goal') }));
      const ol = h('ol', { class: 'hint-list' });
      list.slice(0, used).forEach((x, i) => ol.append(h('li', { class: i === list.length - 1 ? 'last' : '' }, h('span', { class: 'hn' }, String(i + 1)), h('span', { html: x }))));
      if (used) body.append(ol);
      if (used < list.length) {
        body.append(h('button', { class: 'btn gold', type: 'button', onclick: () => {
          S.hints[key] = used + 1; save(); sound('click'); draw();
          if (used + 1 === list.length) sayKey('bug.lastHint', 'angry');
        } }, icon('bulb'), used ? t('ui.moreHint', { n: used + 1, m: list.length }) : t('ui.firstHint')),
        used + 1 === list.length ? h('p', { class: 'hint' }, t('ui.lastHintWarn')) : null);
      } else body.append(h('p', { class: 'hint' }, t('ui.noMoreHints')));
      body.append(h('p', { class: 'hint small' }, t('ui.hintNote', { n: hintsUsed() })));
      sh.el.querySelector('.sheet-scroll').scrollTop = 99999;
    }
  }

  function openNotebook(e) {
    S.unread = 0; save(); renderTop();
    const body = h('div', { class: 'notebook' });
    if (!S.notes.length) body.append(h('p', { class: 'hint' }, t('ui.notebookEmpty')));
    ROOMS.forEach((r, i) => {
      const ids = S.notes.filter((id) => NOTES[id] && NOTES[id].room === r.id);
      if (!ids.length) return;
      body.append(h('h3', { class: 'nb-room', style: { '--rc': r.color } }, r.icon + ' ' + t('ui.roomN', { n: i + 1 }) + ': ' + t('r.' + r.id + '.title')));
      ids.forEach((id) => {
        const A = roomApi(r);
        body.append(h('div', { class: 'nb-note' }, h('b', null, t('note.' + id)), NOTES[id].draw(A)));
      });
    });
    openSheet({ title: t('ui.notebook'), icon: '📓', body, opener: e && e.currentTarget, wide: true });
  }

  /* ---------- Tutorial, room flow, ending ---------- */

  function tutorial() {
    if (S.tut || S.phase !== 'play' || sheets.length) return;
    const tips = tl('ui.tutTips');
    let i = 0;
    const body = h('div', { class: 'tut' });
    const sh = openSheet({ title: t('ui.tutTitle'), icon: '🧭', body, center: true, noClose: true });
    draw();
    function draw() {
      body.replaceChildren(
        h('div', { class: 'tut-ico', 'aria-hidden': 'true' }, ['✨', '🎒', '💡'][i] || '✨'),
        h('p', { html: tips[i] || '' }),
        h('div', { class: 'story-dots', 'aria-hidden': 'true' }, tips.map((_, k) => h('i', { class: k === i ? 'on' : '' }))),
        h('div', { class: 'lock-btns' }, h('button', { class: 'btn gold', type: 'button', onclick: () => {
          if (i < tips.length - 1) { i++; draw(); sound('click'); body.querySelector('button').focus(); }
          else { S.tut = true; save(); sh.close(); }
        } }, i < tips.length - 1 ? t('ui.next') : t('ui.tutGo'))));
    }
  }

  function enterRoom(first) {
    const room = ROOMS[S.room];
    if (!room) return;
    const A = roomApi(room);
    progress();
    if (room.onEnter) room.onEnter(A);
    setTimeout(() => sayKey('r.' + room.id + '.intro', first ? 'grin' : 'angry'), first ? 200 : 350);
  }

  function roomDone(room) {
    const A = roomApi(room);
    if (A.f('done')) return;
    A.f('done', true);
    progress();
    closeAllSheets();
    refresh();
    sound('door');
    confetti(170);
    const last = S.room === ROOMS.length - 1;
    say(t(last ? 'bug.escaped' : 'bug.doorOpen'), 'shock');
    setTimeout(() => {
      const sh = openSheet({
        title: last ? t('ui.portalOpen') : t('ui.doorOpen'), icon: last ? '🌀' : '🚪', center: true, noClose: true, cls: 'done-sheet',
        body: h('div', { class: 'done-card' },
          h('div', { class: 'done-big', 'aria-hidden': 'true' }, last ? '🌀' : '🚪'),
          h('p', { html: last ? t('ui.portalText') : t('ui.doorText', { n: S.room + 1, title: t('r.' + room.id + '.title') }) }),
          h('div', { class: 'kv' },
            h('div', null, h('small', null, t('ui.time')), h('b', { class: 'num' }, clock(S.time))),
            h('div', null, h('small', null, t('ui.hintsUsed')), h('b', { class: 'num' }, String(hintsUsed()))),
            h('div', null, h('small', null, t('ui.coinsTitle')), h('b', { class: 'num' }, coinsFound() + ' / ' + ROOMS.length))),
          !S.coins[room.id] ? h('p', { class: 'hint' }, t('ui.coinMissed')) : null,
          h('div', { class: 'lock-btns' },
            !S.coins[room.id] ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { sh.close(); refresh(); } }, t('ui.stay')) : null,
            h('button', { class: 'btn gold big', type: 'button', onclick: () => { sh.close(); nextRoom(); } }, last ? t('ui.toEnd') : t('ui.nextRoom', { n: S.room + 2 })))),
      });
    }, 900);
  }

  function nextRoom() {
    const room = ROOMS[S.room];
    if (!room || !roomApi(room).f('done')) return;
    closeAllSheets();
    S.room++;
    if (S.room >= ROOMS.length) {
      S.phase = 'end'; S.doneAt = Date.now();
      if (!S.best || S.time < S.best) S.best = S.time;
      save(); render(); window.scrollTo(0, 0);
      sound('win'); confetti(260);
      return;
    }
    save(); render(); window.scrollTo(0, 0); enterRoom(false);
    sound('whoosh');
  }

  function stars() { const n = hintsUsed(); return n <= 2 ? 3 : n <= 6 ? 2 : 1; }

  function renderEnd(a) {
    const st = stars();
    const titleKey = 'ui.endTitle' + st;
    const confirm = h('span', { class: 'confirm-row' });
    confirm.append(h('button', { class: 'btn ghost', type: 'button', onclick: () => {
      confirm.replaceChildren(h('b', null, t('ui.resetConfirm')),
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => render() }, t('ui.cancel')),
        h('button', { class: 'btn small', type: 'button', onclick: restart }, t('ui.resetYes')));
    } }, t('ui.playAgain')));
    a.append(h('div', { class: 'wrap end' },
      h('div', { class: 'cert' },
        h('div', { class: 'cert-top', 'aria-hidden': 'true' }, h('span', { class: 'cert-ava' }, avatar()), buggy('sad', 'cert-bug')),
        h('div', { class: 'eyebrow' }, t('ui.certEyebrow')),
        h('h1', null, t('ui.certTitle')),
        h('p', { class: 'lead' }, t('ui.certText', { name: esc(name()) })),
        h('div', { class: 'cert-name' }, avatar() + ' ' + S.name),
        h('div', { class: 'cert-stars', 'aria-label': t('ui.starsAria', { n: st }) }, [0, 1, 2].map((i) => h('span', { class: i < st ? 'on' : '' }, '★'))),
        h('p', { class: 'cert-rank' }, t(titleKey)),
        h('div', { class: 'kv' },
          h('div', null, h('small', null, t('ui.time')), h('b', { class: 'num' }, clock(S.time))),
          h('div', null, h('small', null, t('ui.hintsUsed')), h('b', { class: 'num' }, String(hintsUsed()))),
          h('div', null, h('small', null, t('ui.coinsTitle')), h('b', { class: 'num' }, coinsFound() + ' / ' + ROOMS.length))),
        h('p', { class: 'hint' }, t('ui.certLearned')),
        h('ul', { class: 'learned' }, tl('ui.learnedList').map((x) => h('li', { html: x }))),
        h('p', { class: 'hint small' }, t('ui.certFooter', { date: datef(new Date(S.doneAt || Date.now()), { day: 'numeric', month: 'long', year: 'numeric' }) })),
        h('div', { class: 'end-btns' }, confirm, window.claude ? null : h('a', { class: 'btn', href: '../lernwelt/' }, t('ui.toLern')))),
      h('div', { class: 'talk end-talk' }, h('div', { class: 'talk-ava' }, buggy('sad')), h('div', { class: 'talk-bubble' }, h('b', null, 'Buggy'), h('span', { html: t('bug.final') })))));
  }

  function restart() {
    const keep = { sound: S.sound, best: S.best, name: S.name, avatar: S.avatar, lang: S.lang, tut: true };
    S = Object.assign(fresh(), keep, { phase: 'story', story: 0 });
    Object.keys(apis).forEach((k) => delete apis[k]);
    save(); render(); window.scrollTo(0, 0);
  }

  /* ---------- Timer ---------- */

  let lastTick = Date.now();
  function tick() {
    const now = Date.now();
    const dt = Math.min(now - lastTick, 2000);
    lastTick = now;
    if (S.phase !== 'play' || document.hidden) return;
    S.time += dt;
    const c = $('#clock');
    if (c) c.textContent = clock(S.time);
    if (Math.floor(S.time / 5000) !== Math.floor((S.time - dt) / 5000)) save();
    const room = ROOMS[S.room];
    const step = room && currentStep(room);
    if (step && !sheets.length && now - lastProgress > 150000) {
      const k = room.id + '.' + step.id;
      if (!nudged[k]) { nudged[k] = true; sayKey('bug.idle', 'grin'); }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function boot() {
    const lp = lernProfile();
    const wanted = S.lang && LANGS.some((l) => l.code === S.lang) ? S.lang : (lp && LANGS.some((l) => l.code === lp.lang) ? lp.lang : detectLang());
    withLang(wanted, () => start(wanted));
  }
  function start(code) {
    LANG = code;
    applyLang();
    render();
    if (S.phase === 'play') {
      const room = ROOMS[S.room];
      if (room) setTimeout(() => sayKey('bug.welcomeBack', 'grin'), 300);
    }
    lastTick = Date.now();
    setInterval(tick, 1000);
    document.addEventListener('visibilitychange', () => { lastTick = Date.now(); if (document.hidden) save(); });
  }

  window.Esc = {
    lang: addLang,
    room(def) { ROOMS.push(def); },
    item(id, e) { ITEMS[id] = { e }; },
    note(id, room, draw) { NOTES[id] = { room, draw }; },
    boot,
    snapshot() { return { phase: S.phase, room: S.room }; },
    // for tests and the room file
    t, raw, money, LANGS, state: () => S, setLang, currentLang: () => LANG,
    _debug: { roomApi, ROOMS, refresh, render, nextRoom, openObject, currentStep },
  };
})();
