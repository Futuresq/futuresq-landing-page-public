/* World 3 – what makes Sparly a good app (quality) + final exam. All texts come from lang/*.js. */
(function () {
  'use strict';
  const L = window.Lern;
  const { h, svg, app } = L;
  const R = String.raw;

  const hex = (bytes) => Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const b64 = (bytes) => { let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const hasSubtle = () => !!(window.crypto && window.crypto.subtle);
  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return hex(new Uint8Array(buf));
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Tap the steps in the right order (used by stations 9 and 15). */
  function orderGame(items, doneText, onDone) {
    let next = 0;
    const list = h('div', { class: 'order-list' });
    const msg = h('p', { class: 'hint', 'aria-live': 'polite', style: { minHeight: '1.6em' } });
    function build() {
      next = 0;
      msg.textContent = L.t('ui.orderStart');
      list.replaceChildren();
      L.shuffle(items.map((tx, i) => [tx, i])).forEach(([tx, i]) => {
        const no = h('span', { class: 'no' }, '?');
        const b = h('button', { class: 'order-item', type: 'button' }, no, h('span', null, tx));
        b.addEventListener('click', () => {
          if (b.classList.contains('placed')) return;
          if (i === next) {
            b.classList.add('placed'); no.textContent = String(i + 1); next++;
            L.sound('right');
            if (next === items.length) { msg.textContent = doneText; onDone(b); } else msg.textContent = L.t('ui.orderRight');
          } else {
            b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
            L.sound('wrong');
            msg.textContent = L.t('ui.orderLater', { n: next + 1 });
          }
        });
        list.append(b);
      });
    }
    build();
    return h('div', null, msg, list, h('div', { style: { marginTop: '12px' } }, h('button', { class: 'btn small ghost', type: 'button', onclick: build }, L.t('ui.reshuffle'))));
  }
  L.orderGame = orderGame;

  /* ======================================================================
     Station 11 – PIN, Face ID & privacy
     ====================================================================== */
  function pinDelay(failed) {
    if (failed < 5) return 0;
    if (failed < 9) return 30;
    if (failed < 19) return 120;
    return 300;
  }

  L.defineStation({
    id: 'pin', world: 3,
    learn(el, api) {
      api.blocks(el, {
        tiers: () => h('div', { class: 'panel', style: { padding: '14px 18px' } }, h('div', { class: 'tier' },
          (api.raw('tiers') || []).flatMap((r) => [h('div', null, r[0]), h('div', null, r[1])]))),
        pro: () => api.pro('hash', R`export async function hashPin(pin) {
  const saltBytes = getRandomBytes(16);                  // %{c1}
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, salt + pin);
  return ` + '`${salt}.${hash}`' + R`;                          // %{c2}
}

export function pinAttemptDelayMs(failedCount) {
  if (failedCount < 5) return 0;
  if (failedCount < 9) return 30_000;       // %{c3}
  if (failedCount < 19) return 2 * 60_000;  // %{c4}
  return 5 * 60_000;                        // %{c5}
}`),
      });
    },
    play(el, api) {
      /* --- hash blender --- */
      const blender = svg('<svg class="blender" viewBox="0 0 120 120" aria-hidden="true"><path d="M30 20 H90 L82 92 H38 Z" fill="none" stroke-width="4" class="b-glass"/><g class="blade"><path d="M44 78 L76 78" stroke-width="5" stroke-linecap="round" class="b-blade"/><path d="M60 70 L60 86" stroke-width="5" stroke-linecap="round" class="b-blade"/></g><rect x="32" y="92" width="56" height="20" rx="6" class="b-base"/></svg>');
      blender.querySelector('.b-glass').style.stroke = 'var(--ink)';
      blender.querySelectorAll('.b-blade').forEach((p) => { p.style.stroke = 'var(--muted)'; });
      blender.querySelector('.b-base').style.fill = 'var(--ocean)';
      const pinIn = h('input', { type: 'text', inputmode: 'numeric', maxlength: '4', id: 'hash-pin', autocomplete: 'off', value: '1234', style: { width: '110px', letterSpacing: '.3em' } });
      const out = h('div', { style: { display: 'grid', gap: '8px' } });
      const mixBtn = h('button', { class: 'btn small', type: 'button' }, '🌀 ' + api.t('ui.mix'));
      let stored = null;
      const checkIn = h('input', { type: 'text', inputmode: 'numeric', maxlength: '4', id: 'hash-check', autocomplete: 'off', placeholder: '????', style: { width: '110px', letterSpacing: '.3em' } });
      const checkOut = h('div', { 'aria-live': 'polite' });
      const checkBtn = h('button', { class: 'btn small ghost', type: 'button', disabled: true }, api.t('ui.checkPin'));
      async function mix() {
        const pin = pinIn.value.replace(/\D/g, '').slice(0, 4);
        if (pin.length !== 4) { out.replaceChildren(h('p', { class: 'warn' }, api.t('ui.fourDigits'))); return; }
        if (!hasSubtle()) { out.replaceChildren(h('p', { class: 'warn' }, L.t('ui.noCrypto'))); return; }
        mixBtn.disabled = true;
        blender.classList.add('spin');
        L.sound('click');
        const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
        const hash = await sha256Hex(salt + pin);
        await wait(700);
        blender.classList.remove('spin');
        mixBtn.disabled = false;
        stored = { salt, hash };
        out.replaceChildren(
          h('div', { class: 'mini-label', style: { marginTop: '0' } }, api.t('ui.stored')),
          h('div', { class: 'hashbox' }, h('span', { class: 'salt' }, salt), '.', h('span', { class: 'hash' }, hash)),
          h('p', { class: 'hint', html: api.t('ui.saltHashHint') }));
        checkBtn.disabled = false;
        checkOut.replaceChildren();
        L.sound('coin');
      }
      async function verify() {
        if (!stored) return;
        const guess = checkIn.value.replace(/\D/g, '').slice(0, 4);
        if (guess.length !== 4) { checkOut.replaceChildren(h('p', { class: 'hint' }, api.t('ui.fourDigits'))); return; }
        const hh = await sha256Hex(stored.salt + guess);
        const ok = hh === stored.hash;
        checkOut.replaceChildren(
          h('div', { class: 'hashbox', style: { marginTop: '8px' } }, api.t('ui.remixed') + ' ', h('span', { class: 'hash' }, hh.slice(0, 24) + '…')),
          h('div', { class: 'hashbox', style: { marginTop: '6px' } }, api.t('ui.storedShort') + ' ', h('span', { class: 'hash' }, stored.hash.slice(0, 24) + '…')),
          h('div', { class: ok ? 'result' : 'warn', style: { marginTop: '8px' } }, ok ? api.t('ui.same') : api.t('ui.diff')));
        L.sound(ok ? 'right' : 'wrong');
      }
      mixBtn.addEventListener('click', mix);
      checkBtn.addEventListener('click', verify);
      pinIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') mix(); });
      checkIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') verify(); });

      /* --- PIN cracker --- */
      const newSecret = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      let secret = newSecret();
      let entry = '';
      let failed = 0;
      let waitLeft = 0;
      let timer = 0;
      const dots = h('div', { class: 'pin-dots', 'aria-hidden': 'true' });
      const status = h('div', { 'aria-live': 'polite', style: { textAlign: 'center', fontWeight: '800', minHeight: '3em' } });
      const pad = h('div', { class: 'keypad' });
      const ffBtn = h('button', { class: 'btn small gold', type: 'button', hidden: true }, '⏩ ' + api.t('ui.ff'));
      const tierRows = api.raw('ui.tierRows') || [];
      const tierEl = h('div', { class: 'tier' });
      function tierIdx() { const a = failed + 1; return a <= 5 ? 0 : a <= 9 ? 1 : a <= 19 ? 2 : 3; }
      function drawTier() {
        tierEl.replaceChildren(...tierRows.flatMap((r, i) => {
          const now = i === tierIdx();
          return [h('div', { class: now ? 'now' : '' }, r[0]), h('div', { class: now ? 'now' : '' }, r[1] + (now ? '  ← ' + api.t('ui.youAreHere') : ''))];
        }));
      }
      function drawDots() { dots.replaceChildren(...[0, 1, 2, 3].map((i) => h('i', { class: i < entry.length ? 'f' : '' }))); }
      function setLocked(on) { pad.querySelectorAll('button').forEach((b) => { b.disabled = on; }); }
      function startWait(sec) {
        waitLeft = sec; setLocked(true); ffBtn.hidden = false;
        const tick = () => {
          if (waitLeft <= 0) { clearInterval(timer); setLocked(false); ffBtn.hidden = true; status.textContent = api.t('ui.allowedAgain', { n: failed }); return; }
          const m = Math.floor(waitLeft / 60); const s = waitLeft % 60;
          status.replaceChildren(h('div', { style: { color: 'var(--red)' } }, app('pin.too_many_attempts')),
            h('div', null, app('pin.try_again_in', { time: m ? m + ':' + String(s).padStart(2, '0') + ' min' : s + ' s' })));
          waitLeft--;
        };
        clearInterval(timer); tick(); timer = setInterval(tick, 1000);
      }
      ffBtn.addEventListener('click', () => { waitLeft = 0; });
      function press(d) {
        if (entry.length >= 4) return;
        entry += d; drawDots(); L.sound('click');
        if (entry.length === 4) setTimeout(submit, 180);
      }
      function submit() {
        if (entry === secret) {
          status.textContent = api.t('ui.lucky', { pin: secret });
          L.sound('win'); L.confetti(60);
          entry = ''; drawDots();
          secret = newSecret();
          return;
        }
        failed++;
        dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
        L.sound('wrong');
        entry = '';
        setTimeout(drawDots, 300);
        drawTier();
        if (failed >= 100) { setLocked(true); status.textContent = app('pin.locked_permanent'); return; }
        const d = pinDelay(failed);
        if (d > 0) {
          startWait(d);
          if (failed === 5) { api.badge('hacker'); api.challenge(pad); }
        } else {
          status.textContent = app('pin.wrong_pin') + '. ' + app('pin.try_again') + ' (' + api.t('ui.failedN', { n: failed }) + ')';
        }
      }
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].forEach((k) => {
        if (!k) { pad.append(h('span')); return; }
        pad.append(h('button', { type: 'button', 'aria-label': k === '⌫' ? api.t('ui.del') : k, onclick: () => { if (k === '⌫') { entry = entry.slice(0, -1); drawDots(); } else press(k); } }, k));
      });
      drawDots(); drawTier();
      status.textContent = app('pin.enter_pin');

      el.append(
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.mixerTitle')),
          h('p', { class: 'hint' }, api.t('ui.mixerHint')),
          h('div', { style: { display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' } },
            blender,
            h('div', { style: { display: 'grid', gap: '8px', flex: '1 1 260px', minWidth: '0' } },
              h('label', { for: 'hash-pin', style: { fontWeight: '800' } }, api.t('ui.testPin')),
              h('div', { class: 'numrow' }, pinIn, mixBtn))),
          h('div', { style: { marginTop: '14px' } }, out),
          h('div', { class: 'mini-label' }, api.t('ui.checkTitle')),
          h('div', { class: 'numrow', style: { marginTop: '6px' } }, h('label', { for: 'hash-check', class: 'sr' }, api.t('ui.checkPin')), checkIn, checkBtn),
          checkOut),
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.crackTitle')),
          h('p', { class: 'hint' }, api.t('ui.crackHint')),
          h('div', { class: 'cols', style: { marginTop: '14px', alignItems: 'start' } },
            h('div', null, dots, pad, h('div', { style: { marginTop: '12px' } }, status), h('div', { style: { textAlign: 'center' } }, ffBtn)),
            h('div', null, h('div', { class: 'mini-label', style: { marginTop: '0' } }, api.t('ui.rules')), tierEl,
              h('p', { class: 'hint', style: { marginTop: '10px' } }, api.t('ui.after100'))))));
    },
    quiz: [{ a: 1 }, { a: 0 }, { type: 'num', a: 10000 }, { a: 0 }, { type: 'tf', a: false }],
  });

  /* ======================================================================
     Station 12 – The data vault
     ====================================================================== */
  const ITER = 600000;
  async function deriveKey(password, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  L.defineStation({
    id: 'tresor', world: 3,
    learn(el, api) {
      api.blocks(el, {
        steps: () => h('div', { class: 'pipeline' }, (api.raw('steps') || []).map((s, i) => h('div', { class: 'pstep past' },
          h('div', { class: 'dot', 'aria-hidden': 'true' }, ['🔑', '🔒', '🧷'][i]), h('div', { class: 'txt' }, h('b', null, s[0]), h('p', null, L.fmt(s[1])))))),
        pro: () => api.pro('envelope', R`const PBKDF2_ITERATIONS = 600_000;
const KEY_BYTES = 32;   // AES-256
const SALT_BYTES = 16;
const IV_BYTES = 12;    // GCM

export interface EncryptedEnvelope {
  sparly_encrypted: true;
  format: number;
  kdf: string;          // 'pbkdf2-sha256'
  iterations: number;   // 600000
  salt: string;         // base64
  iv: string;           // base64
  data: string;         // base64: %{c1}
}`),
      });
    },
    play(el, api) {
      const msg = h('textarea', { id: 'vault-msg', rows: '3', style: { width: '100%', resize: 'vertical' } });
      msg.value = api.t('ui.sample');
      const pw = h('input', { type: 'password', id: 'vault-pw', autocomplete: 'new-password', placeholder: api.t('ui.pwPh'), style: { width: '100%' } });
      const encBtn = h('button', { class: 'btn small', type: 'button' }, '🔒 ' + api.t('ui.encrypt'));
      const envOut = h('div', { 'aria-live': 'polite' });
      const pw2 = h('input', { type: 'password', id: 'vault-pw2', autocomplete: 'off', style: { width: '100%' } });
      const decBtn = h('button', { class: 'btn small ghost', type: 'button', disabled: true }, '🔓 ' + api.t('ui.decrypt'));
      const decOut = h('div', { 'aria-live': 'polite' });
      let envelope = null;
      encBtn.addEventListener('click', async () => {
        if (!hasSubtle()) { envOut.replaceChildren(h('p', { class: 'warn' }, L.t('ui.noCrypto'))); return; }
        if (pw.value.length < 4) { envOut.replaceChildren(h('p', { class: 'warn' }, app('export.password_too_short', { min: 4 }))); return; }
        encBtn.disabled = true;
        envOut.replaceChildren(h('p', null, h('span', { class: 'spinner' }), ' ' + api.t('ui.mixing')));
        await wait(30);
        const t0 = performance.now();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(pw.value, salt);
        const ms = Math.round(performance.now() - t0);
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(msg.value)));
        envelope = { sparly_encrypted: true, format: 1, kdf: 'pbkdf2-sha256', iterations: ITER, salt: b64(salt), iv: b64(iv), data: b64(ct) };
        envOut.replaceChildren(
          h('p', { class: 'hint' }, api.t('ui.encDone', { ms: L.numf(ms) })),
          h('div', { class: 'envelope' }, JSON.stringify(envelope, null, 2)));
        encBtn.disabled = false; decBtn.disabled = false;
        L.sound('coin');
      });
      decBtn.addEventListener('click', async () => {
        if (!envelope) return;
        decBtn.disabled = true;
        decOut.replaceChildren(h('p', null, h('span', { class: 'spinner' }), ' ' + api.t('ui.checking')));
        await wait(30);
        try {
          const key = await deriveKey(pw2.value, unb64(envelope.salt));
          const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(envelope.iv) }, key, unb64(envelope.data));
          decOut.replaceChildren(h('div', { class: 'result' }, '✓ ' + api.t('ui.decrypted')), h('pre', { class: 'envelope', style: { marginTop: '8px' } }, new TextDecoder().decode(pt)));
          L.sound('right');
          api.badge('agent'); api.challenge(decBtn);
        } catch {
          decOut.replaceChildren(h('div', { class: 'warn' }, app('export.wrong_password')));
          L.sound('wrong');
        }
        decBtn.disabled = false;
      });

      const CHECKS = [['amount: 350', true], ["type: 'income'", true], ['amount: -5', false], ["id: '../../secret'", false], ["category_id: 'cat_xyz'", false]];
      const why = api.raw('ui.checks') || [];
      const rows = CHECKS.map((c) => h('div', { class: 'tx', style: { animation: 'none' } }, h('span', { class: 'e', 'aria-hidden': 'true' }, '📄'), h('span', { class: 't', style: { fontFamily: 'var(--f-mono)', fontSize: '.85rem' } }, c[0]), h('span', { class: 'a' }, '…')));
      const verdict = h('div', { 'aria-live': 'polite' });
      const doorBtn = h('button', { class: 'btn small', type: 'button' }, '🕴️ ' + api.t('ui.doorBtn'));
      doorBtn.addEventListener('click', async () => {
        doorBtn.disabled = true; verdict.replaceChildren();
        rows.forEach((r) => { const a = r.querySelector('.a'); a.textContent = '…'; a.style.color = 'var(--muted)'; });
        for (let i = 0; i < CHECKS.length; i++) {
          await wait(500);
          const a = rows[i].querySelector('.a');
          a.textContent = (why[i] || '') + (CHECKS[i][1] ? ' ✓' : ' ✗'); a.style.color = CHECKS[i][1] ? 'var(--green)' : 'var(--red)';
          L.sound(CHECKS[i][1] ? 'click' : 'wrong');
        }
        await wait(300);
        verdict.replaceChildren(h('div', { class: 'warn' }, '🚫 ' + api.t('ui.rejected')));
        doorBtn.disabled = false;
      });

      el.append(
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.msgTitle')),
          h('p', { class: 'hint' }, api.t('ui.msgHint')),
          h('div', { style: { display: 'grid', gap: '10px', marginTop: '12px' } },
            h('label', { for: 'vault-msg', style: { fontWeight: '800' } }, api.t('ui.yourMsg')), msg,
            h('label', { for: 'vault-pw', style: { fontWeight: '800' } }, api.t('ui.yourPw')), pw,
            h('div', null, encBtn), envOut)),
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.openTitle')),
          h('p', { class: 'hint' }, api.t('ui.openHint')),
          h('div', { style: { display: 'grid', gap: '10px', marginTop: '12px' } },
            h('label', { for: 'vault-pw2', style: { fontWeight: '800' } }, api.t('ui.pw2')), pw2,
            h('div', null, decBtn), decOut)),
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.doorTitle')),
          h('p', { class: 'hint' }, api.t('ui.doorHint')),
          h('div', { class: 'txlist' }, rows),
          h('div', { style: { marginTop: '12px' } }, doorBtn), verdict));
    },
    quiz: [{ a: 2 }, { a: 0 }, { type: 'tf', a: true }, { a: 0 }],
  });

  /* ======================================================================
     Station 13 – Tests & bug hunt
     ====================================================================== */
  L.defineStation({
    id: 'tests', world: 3,
    learn(el, api) {
      api.blocks(el, {
        test: () => L.code(R`it('` + api.t('ui.testName') + R`', () => {
  expect(parseCentsFromInput('3,50')).toBe(350);
});`),
        photo: () => {
          const cid = h('span', { class: 'cid' }, '0F9A-7C21');
          const oldPath = h('div', null, api.t('ui.stored') + ' file:///…/Application/', h('span', { class: 'cid' }, '0F9A-7C21'), '/Documents/photos/photo_42.jpg');
          const nowPath = h('div', null, api.t('ui.folderNow') + ' file:///…/Application/', cid, '/Documents/photos/');
          const verdict = h('div', { class: 'good' }, '✓ ' + api.t('ui.found'));
          let updated = false;
          let fixed = false;
          const updBtn = h('button', { class: 'btn small', type: 'button' }, '📲 ' + api.t('ui.update'));
          const fixBtn = h('button', { class: 'btn small ghost', type: 'button', disabled: true }, '🔧 ' + api.t('ui.fix'));
          function draw() {
            cid.textContent = updated ? 'B7E2-19D4' : '0F9A-7C21';
            if (fixed) {
              oldPath.replaceChildren(api.t('ui.stored') + ' ', h('strong', null, 'photo_42.jpg'), ' ' + api.t('ui.onlyName'));
              verdict.className = 'good'; verdict.textContent = '✓ ' + api.t('ui.foundFixed');
            } else if (updated) {
              verdict.className = 'bad'; verdict.textContent = '✗ ' + api.t('ui.notFound');
            } else {
              verdict.className = 'good'; verdict.textContent = '✓ ' + api.t('ui.found');
            }
          }
          updBtn.addEventListener('click', () => { updated = true; updBtn.disabled = true; fixBtn.disabled = false; draw(); L.sound('wrong'); });
          fixBtn.addEventListener('click', () => { fixed = true; fixBtn.disabled = true; draw(); L.sound('right'); });
          return h('div', { class: 'panel' },
            h('div', { class: 'pathviz' }, oldPath, nowPath, verdict),
            h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' } }, updBtn, fixBtn));
        },
        pro: () => api.pro('photo', R`/**
 * iOS moves the app's sandbox container to a new UUID path on every update, so
 * a photo URI recorded before an update no longer resolves afterwards.
 */
const FILENAME = 'photo_1700000000000.jpg';
const LEGACY_IOS = ` + '`file:///var/mobile/Containers/Data/Application/0F9A-OLD-UUID/Documents/photos/${FILENAME}`' + R`;

it('reduces a legacy absolute iOS URI to its filename', () => {
  expect(toPhotoRef(LEGACY_IOS)).toBe(FILENAME);
});`),
      });
    },
    play(el, api) {
      const suites = api.raw('suites') || [];
      const grid = h('div', { class: 'suites' }, suites.map((s) => h('div', { class: 'suite' }, h('i'), h('span', null, s))));
      const sum2 = h('p', { style: { fontWeight: '800', marginTop: '10px' }, 'aria-live': 'polite' });
      const runAll = h('button', { class: 'btn small', type: 'button' }, '▶ ' + api.t('ui.runAll'));
      runAll.addEventListener('click', async () => {
        runAll.disabled = true;
        const els = Array.from(grid.children);
        els.forEach((e) => e.classList.remove('pass', 'run'));
        for (let i = 0; i < els.length; i++) {
          els[i].classList.add('run');
          await wait(110);
          els[i].classList.remove('run'); els[i].classList.add('pass');
          sum2.textContent = api.t('ui.running', { n: i + 1, m: els.length });
          if (i % 3 === 0) L.sound('click');
        }
        sum2.textContent = '✓ ' + api.t('ui.allPassed');
        L.sound('right');
        runAll.disabled = false;
      });

      // Bug hunt: the tests really run against the functions below.
      const TESTS = [['3,50', 350], ['12', 1200], ['0,99', 99], ['7,05', 705]];
      const FIXES = [
        { line: 2, label: 'return Math.round(number * 1000);', fn: (s) => Math.round(parseFloat(s) * 1000) },
        { line: 1, label: "const number = parseFloat(text.replace(',', '.'));", fn: (s) => Math.round(parseFloat(s.replace(',', '.')) * 100), ok: true },
        { line: 2, label: 'return number;', fn: (s) => parseFloat(s) },
      ];
      const whyFix = api.raw('ui.fixWhy') || [];
      const lines = ['function parseCents(text) {', '  const number = parseFloat(text);', '  return Math.round(number * 100);', '}'];
      let cur = (s) => Math.round(parseFloat(s) * 100);
      let curLines = lines.slice();
      let lastWhy = '';
      let fixedOk = false;
      const codeBox = h('div');
      const results = h('div', { class: 'testres', 'aria-live': 'polite' });
      const fixBox = h('div', { class: 'fixes' });
      const fixMsg = h('p', { class: 'hint', 'aria-live': 'polite' });
      const drawCode = () => codeBox.replaceChildren(L.code(curLines.join('\n')));
      function runTests() {
        results.replaceChildren();
        let ok = 0;
        TESTS.forEach(([inp, want]) => {
          let got;
          try { got = cur(inp); } catch { got = 'Error'; }
          const pass = got === want;
          if (pass) ok++;
          results.append(h('div', { class: pass ? 'pass' : 'fail' }, (pass ? '✓ ' : '✗ ') + 'parseCents("' + inp + '") → ' + api.t(pass ? 'ui.expectOk' : 'ui.expectFail', { w: want, g: got })));
        });
        L.sound(ok === TESTS.length ? 'right' : 'wrong');
        return ok === TESTS.length;
      }
      const runBtn = h('button', { class: 'btn small', type: 'button' }, '▶ ' + api.t('ui.runTests'));
      runBtn.addEventListener('click', () => {
        const green = runTests();
        if (green && fixedOk) { fixMsg.textContent = api.t('ui.green'); api.badge('bug'); api.challenge(runBtn); }
        else if (!fixBox.children.length) {
          fixMsg.textContent = api.t('ui.red');
          FIXES.forEach((f, i) => fixBox.append(h('button', { class: 'opt', type: 'button', onclick: () => {
            curLines = lines.slice(); curLines[f.line] = '  ' + f.label; cur = f.fn; fixedOk = !!f.ok; lastWhy = whyFix[i] || ''; drawCode();
            fixMsg.textContent = api.t('ui.fixIn');
            L.sound('click');
          } }, h('span', { style: { fontFamily: 'var(--f-mono)', fontSize: '.85rem' } }, f.label))));
        } else if (!green) {
          fixMsg.textContent = lastWhy + ' ' + api.t('ui.tryOther');
        }
      });
      drawCode();

      el.append(
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.labTitle')),
          h('p', { class: 'hint' }, api.t('ui.labHint')),
          h('div', { style: { margin: '12px 0' } }, runAll), grid, sum2),
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.bugTitle')),
          h('p', { class: 'hint' }, api.t('ui.bugHint')),
          h('div', { style: { marginTop: '12px' } }, codeBox),
          h('div', { style: { marginTop: '12px' } }, runBtn),
          results, fixMsg, fixBox));
    },
    quiz: [{ a: 0 }, { a: 2 }, { a: 1 }, { type: 'tf', a: true }],
  });

  /* ======================================================================
     Station 14 – Fast & for everyone
     ====================================================================== */
  L.defineStation({
    id: 'gut', world: 3,
    learn(el, api) {
      api.blocks(el, {
        pro: () => api.pro('dark', R`export const darkColors = {
  background: '#0F172A',     // %{c1}
  surface: '#1E293B',
  textPrimary: '#F1F5F9',    // %{c2}
  income: '#34D399',         // %{c3}
  expense: '#F87171',        // %{c4}
  primary: '#34D399',
  ...
};`),
      });
    },
    play(el, api) {
      let raced = false;
      let darked = false;
      const check = (anchor) => { if (raced && darked) { api.badge('turbo'); api.challenge(anchor); } };
      const turtle = h('span', { class: 'runner', 'aria-hidden': 'true' }, '🐢');
      const rocket = h('span', { class: 'runner', 'aria-hidden': 'true' }, '🚀');
      const res = h('p', { class: 'hint', 'aria-live': 'polite' });
      const startBtn = h('button', { class: 'btn small', type: 'button' }, '🏁 ' + api.t('ui.start'));
      startBtn.addEventListener('click', () => {
        startBtn.disabled = true; res.textContent = '';
        [turtle, rocket].forEach((r) => { r.style.transition = 'none'; r.style.left = '6px'; });
        void turtle.offsetWidth;
        rocket.style.transition = 'left .12s linear'; rocket.style.left = 'calc(100% - 46px)';
        turtle.style.transition = 'left 6s linear'; turtle.style.left = 'calc(100% - 46px)';
        L.sound('coin');
        setTimeout(() => { res.textContent = '🚀 ' + api.t('ui.rocketDone'); }, 400);
        setTimeout(() => { res.textContent = api.t('ui.timelapse'); startBtn.disabled = false; L.sound('right'); raced = true; check(startBtn); }, 6100);
      });
      let dark = false;
      const phHolder = h('div');
      const darkBtn = h('button', { class: 'btn small ghost', type: 'button' }, '🌙 ' + api.t('ui.darkBtn'));
      const drawPhone = () => phHolder.replaceChildren(L.phone(L.dashboard(), L.tabBar('money'), dark ? 'ph-dark' : 'ph-light'));
      darkBtn.addEventListener('click', () => {
        dark = !dark; darkBtn.textContent = dark ? '☀️ ' + api.t('ui.lightBtn') : '🌙 ' + api.t('ui.darkBtn'); drawPhone(); L.sound('click');
        if (dark) { darked = true; check(darkBtn); }
      });
      drawPhone();
      const canSpeak = 'speechSynthesis' in window;
      if (canSpeak) window.speechSynthesis.getVoices(); // Chrome loads the voice list lazily
      const speak = h('button', { class: 'btn small ghost', type: 'button', disabled: !canSpeak }, '🔊 ' + api.t('ui.speak'));
      speak.addEventListener('click', () => {
        try {
          // Only voices that run on the device: some browsers' default voices send the text
          // (which includes the player's name) to an online service.
          const locale = L.langInfo().locale;
          const voices = window.speechSynthesis.getVoices().filter((v) => v.localService);
          const voice = voices.find((v) => v.lang.replace('_', '-') === locale) ||
            voices.find((v) => v.lang.slice(0, 2) === locale.slice(0, 2));
          if (!voice) { L.toast(api.t('ui.speakNo')); return; }
          window.speechSynthesis.cancel();
          const tabs = ['money', 'review', 'new', 'wishes', 'badges'].map((k) => api.t('ui.button') + ': ' + app('tabs.' + k)).join('. ');
          const u = new SpeechSynthesisUtterance(app('dashboard.greeting', { name: L.name() }) + ' ' + app('dashboard.your_money') + ': ' + L.money(14550) + '. ' + tabs + '.');
          u.voice = voice; u.lang = voice.lang; u.rate = 0.95;
          window.speechSynthesis.speak(u);
        } catch { L.toast(api.t('ui.speakNo')); }
      });
      el.append(
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.raceTitle')),
          h('p', { class: 'hint' }, api.t('ui.raceHint')),
          h('div', { class: 'race', style: { marginTop: '12px' } },
            h('div', { class: 'lane' }, turtle, h('span', { class: 'lbl' }, api.t('ui.turtle')), h('span', { class: 'finish' })),
            h('div', { class: 'lane' }, rocket, h('span', { class: 'lbl' }, api.t('ui.rocket')), h('span', { class: 'finish' }))),
          h('div', { style: { marginTop: '12px' } }, startBtn), res),
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.darkTitle')),
          h('p', { class: 'hint' }, api.t('ui.darkHint')),
          h('div', { class: 'split', style: { marginTop: '12px' } }, phHolder,
            h('div', { style: { display: 'grid', gap: '10px', alignContent: 'start' } },
              darkBtn, speak,
              h('p', { class: 'hint' }, canSpeak ? api.t('ui.speakHint') : api.t('ui.speakNo'))))));
    },
    quiz: [{ a: 0 }, { a: 1 }, { a: 0 }, { type: 'tf', a: true }],
  });

  /* ======================================================================
     Station 15 – From code to the app store
     ====================================================================== */
  L.defineStation({
    id: 'release', world: 3,
    learn(el, api) {
      api.blocks(el, {
        timeline: () => h('div', { class: 'panel' }, h('div', { class: 'timeline' }, (api.raw('timeline') || []).map((tl) =>
          h('div', { class: 'tl' }, h('div', { class: 'd' }, L.datef(tl[0])), h('div', { class: 'p' }), h('div', { class: 't' }, h('b', null, tl[1]), h('span', null, tl[2])))))),
        pro: () => api.pro('commits', R`$ git log --oneline
a1b2c3d %{c1}
e4f5a6b %{c2}
c7d8e9f %{c3}
0a1b2c3 %{c4}`),
      });
    },
    play(el, api) {
      el.append(h('div', { class: 'panel' },
        h('h3', null, api.t('ui.orderTitle')),
        orderGame(api.raw('order') || [], api.t('ui.orderDone'), (b) => { api.badge('store'); api.challenge(b); L.confetti(80); })));
    },
    quiz: [{ a: 0 }, { a: 0 }, { a: 2 }, { type: 'tf', a: false }],
  });

  /* ======================================================================
     Final exam – structure only, texts in lang/*.js under s.finale.pool
     ====================================================================== */
  L.defineStation({
    id: 'finale', world: 0, exam: true,
    pool: [
      { type: 'num', a: 7, unit: 'money' }, { a: 0 }, { type: 'num', a: 99, unit: 'minor' }, { a: 0 }, { a: 0 }, { a: 0 }, { a: 0 }, { a: 0 },
      { type: 'num', a: 75, unit: '%' }, { a: 0 }, { a: 0 }, { a: 0 }, { a: 0 }, { a: 0 }, { a: 0 }, { a: 0 }, { a: 1 },
    ],
  });
})();
