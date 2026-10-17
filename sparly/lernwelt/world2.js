/* World 2 – how Sparly is built (technology). All texts come from lang/*.js. */
(function () {
  'use strict';
  const L = window.Lern;
  const { h, money, app } = L;
  const R = String.raw;

  /* ======================================================================
     Station 6 – The building blocks
     ====================================================================== */
  const LAYERS = [
    { k: 'screen', ico: '📱', tech: 'Screens', lc: 'var(--w1)', ex: 'DashboardScreen, WishesScreen, PinEntryScreen' },
    { k: 'comp', ico: '🧩', tech: 'Components', lc: 'var(--w2)', ex: 'Button, Card, BalanceCard, BadgeCard' },
    { k: 'store', ico: '🧠', tech: 'Stores', lc: 'var(--w3)', ex: 'transactionStore, wishStore, profileStore' },
    { k: 'service', ico: '⚙️', tech: 'Services', lc: 'var(--red)', ex: 'transactionService, badgeService, cryptoService' },
    { k: 'db', ico: '🗄️', tech: 'SQLite', lc: 'var(--violet)', ex: 'taschengeld.db, transactions' },
  ];
  const STACK = ['React Native', 'Expo', 'TypeScript', 'SQLite', 'Zustand', 'i18next', 'Reanimated'];

  L.defineStation({
    id: 'bausteine', world: 2,
    learn(el, api) {
      const detail = h('div', { class: 'layer-detail', 'aria-live': 'polite' });
      const list = h('div', { class: 'layers' });
      const layerName = (l) => api.t('layer.' + l.k + '.name');
      function open(i) {
        const l = LAYERS[i];
        list.querySelectorAll('.layer').forEach((b, k) => b.setAttribute('aria-expanded', String(k === i)));
        detail.replaceChildren(
          h('b', { style: { fontFamily: 'var(--f-display)', fontSize: '1.15rem' } }, l.ico + ' ' + layerName(l) + ' (' + l.tech + ')'),
          h('p', null, api.t('layer.' + l.k + '.what')),
          h('p', null, h('strong', null, api.t('ui.inRestaurant') + ' '), api.t('layer.' + l.k + '.rest')),
          h('p', { style: { fontFamily: 'var(--f-mono)', fontSize: '.82rem', color: 'var(--muted)' } }, api.t('ui.examples') + ' ' + l.ex));
      }
      LAYERS.forEach((l, i) => list.append(h('button', { class: 'layer', type: 'button', style: { '--lc': l.lc }, 'aria-expanded': 'false', onclick: () => { open(i); L.sound('click'); } },
        h('span', { class: 'ico', 'aria-hidden': 'true' }, l.ico),
        h('span', null, h('b', null, layerName(l)), h('small', null, l.tech)))));
      open(0);
      api.blocks(el, {
        layers: () => h('div', { style: { display: 'grid', gap: '10px' } }, list, detail),
        stack: () => h('div', { class: 'term-cards' }, STACK.map((s, i) => h('div', { class: 'tcard' }, h('b', null, s), h('span', null, (api.raw('stack') || [])[i])))),
        pro: () => api.pro('ts', R`interface TransactionRow {
  id: string;
  type: 'income' | 'expense';   // %{c1}
  amount: number;               // %{c2}
  description: string | null;   // %{c3}
}

const t: TransactionRow = {
  id: 'abc',
  type: 'gift',       // ❌ %{c4}
  amount: 'ten',      // ❌ %{c5}
  description: null,
};`),
      });
    },
    play(el, api) {
      const ITEMS = [
        ['DashboardScreen', 'screen'], ['transactions (SQL)', 'db'], ['Button', 'comp'], ['badgeService', 'service'], ['transactionStore', 'store'],
        ['WishesScreen', 'screen'], ['BalanceCard', 'comp'], ['cryptoService', 'service'], ['profileStore', 'store'], ['taschengeld.db', 'db'],
      ];
      let sel = null;
      let placed = 0;
      const pool = h('div', { class: 'pool', role: 'group' });
      const msg = h('p', { class: 'hint', 'aria-live': 'polite', style: { minHeight: '1.6em' } }, api.t('ui.sortStart'));
      const buckets = h('div', { class: 'buckets' });
      L.shuffle(ITEMS).forEach((it) => {
        const chip = h('button', { class: 'card-chip', type: 'button', 'aria-pressed': 'false' }, it[0]);
        chip._layer = it[1];
        chip.addEventListener('click', () => {
          pool.querySelectorAll('.card-chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
          sel = chip; chip.setAttribute('aria-pressed', 'true'); L.sound('click');
          msg.textContent = api.t('ui.sortWhere', { x: it[0] });
        });
        pool.append(chip);
      });
      LAYERS.forEach((l) => {
        const b = h('button', { class: 'bucket', type: 'button', style: { borderColor: l.lc } }, h('b', null, l.ico + ' ' + api.t('layer.' + l.k + '.name')), h('small', { style: { color: 'var(--muted)', fontWeight: '700' } }, l.tech));
        b.addEventListener('click', () => {
          if (!sel) { msg.textContent = api.t('ui.sortPickFirst'); return; }
          if (sel._layer === l.k) {
            b.append(h('span', { class: 'in-chip' }, sel.textContent));
            sel.remove(); sel = null; placed++;
            L.sound('right');
            msg.textContent = placed < ITEMS.length ? api.t('ui.sortRight', { n: ITEMS.length - placed }) : api.t('ui.sortDone');
            if (placed === ITEMS.length) { api.badge('sortier'); api.challenge(buckets); L.confetti(80); }
          } else {
            b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
            L.sound('wrong');
            msg.textContent = api.t('ui.sortHint.' + sel._layer);
          }
        });
        buckets.append(b);
      });
      el.append(h('div', { class: 'panel' },
        h('h3', null, api.t('ui.sortTitle')),
        h('p', { class: 'hint' }, api.t('ui.sortNote')),
        h('div', { class: 'sorter', style: { marginTop: '12px' } }, pool, msg, buckets)));
    },
    quiz: [{ a: 1 }, { a: 0 }, { a: 2 }, { type: 'tf', a: true }],
  });

  /* ======================================================================
     Station 7 – The database
     ====================================================================== */
  const CATS = [
    ['cat_inc_allowance', 'income', 'allowance', '💰'],
    ['cat_inc_gift', 'income', 'gift', '🎁'],
    ['cat_exp_sweets', 'expense', 'sweets', '🍿'],
    ['cat_exp_toys', 'expense', 'toys', '🎮'],
    ['cat_exp_cinema', 'expense', 'cinema', '🎬'],
  ];
  // id, type, amount (minor units), category_id, index into the translated descriptions, date
  const TXS = [
    ['t1', 'income', 1000, 'cat_inc_allowance', 0, '2026-10-01'],
    ['t2', 'income', 500, 'cat_inc_gift', 1, '2026-10-04'],
    ['t3', 'expense', 250, 'cat_exp_sweets', 2, '2026-10-05'],
    ['t4', 'expense', 450, 'cat_exp_cinema', 3, '2026-10-08'],
    ['t5', 'expense', 150, 'cat_exp_sweets', 4, '2026-10-10'],
  ];
  const TABLES = ['profiles', 'transactions', 'categories', 'wishes', 'savings_goals', 'badges', 'earned_badges', 'notifications', 'reminders', 'settings', 'tip_reads', 'family_links'];
  const HELPERS = ['pin_attempts', 'app_settings', '_migrations'];

  L.defineStation({
    id: 'datenbank', world: 2,
    learn(el, api) {
      const desc = api.raw('tables') || {};
      api.blocks(el, {
        tables: () => h('div', { class: 'tables' }, TABLES.map((tb) => h('span', { title: desc[tb] || '' }, tb)), HELPERS.map((tb) => h('span', { class: 'helper', title: desc[tb] || '' }, tb))),
        pro: () => api.pro('schema', R`CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  amount INTEGER NOT NULL CHECK(amount > 0),
  category_id TEXT NOT NULL REFERENCES categories(id),
  description TEXT,
  photo_uri TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`),
      });
    },
    play(el, api) {
      const descs = api.raw('ui.descs') || [];
      const asked = new Set();
      const sqlBox = h('pre', { class: 'code' }, '-- ' + api.t('ui.pickQuestion'));
      const res = h('div', { 'aria-live': 'polite', style: { minHeight: '48px' } });
      const fkMsg = h('p', { class: 'hint', 'aria-live': 'polite' }, api.t('ui.fkTip'));
      const profT = h('table', { class: 'db' });
      profT.innerHTML = '<tr><th>id</th><th>name</th><th>avatar_id</th><th>role</th><th>language</th></tr>';
      profT.append(h('tr', null, h('td', null, "'p1'"), h('td', null, "'" + L.name() + "'"), h('td', null, "'avatar_" + (L.AVATARS.indexOf(L.avatar()) + 1) + "'"), h('td', null, "'child'"), h('td', null, "'" + L.currentLang() + "'")));
      const catT = h('table', { class: 'db' });
      catT.innerHTML = '<tr><th>id</th><th>name</th><th>icon</th><th>type</th></tr>';
      const catRows = {};
      CATS.forEach((c) => { const tr = h('tr', null, h('td', null, "'" + c[0] + "'"), h('td', null, app('categories.' + c[1] + '.' + c[2])), h('td', null, c[3]), h('td', null, "'" + c[1] + "'")); catRows[c[0]] = tr; catT.append(tr); });
      const txT = h('table', { class: 'db' });
      txT.innerHTML = '<tr><th>id</th><th>type</th><th>amount</th><th>category_id</th><th>description</th><th>date</th></tr>';
      const txRows = TXS.map((tx) => {
        const fk = h('td', { class: 'fk', tabindex: '0', role: 'button' }, "'" + tx[3] + "'");
        const amt = h('td', null, String(tx[2]));
        const tr = h('tr', null, h('td', null, "'" + tx[0] + "'"), h('td', null, "'" + tx[1] + "'"), amt, fk, h('td', null, "'" + (descs[tx[4]] || '') + "'"), h('td', null, "'" + tx[5] + "'"));
        const follow = () => {
          clearHl();
          tr.classList.add('hl'); catRows[tx[3]].classList.add('hl');
          const c = CATS.find((x) => x[0] === tx[3]);
          fkMsg.innerHTML = L.esc(api.t('ui.fkFound', { id: tx[3], cat: c[3] + ' ' + app('categories.' + c[1] + '.' + c[2]) }));
          L.sound('click');
        };
        fk.addEventListener('click', follow);
        fk.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); follow(); } });
        tr._amt = amt;
        txT.append(tr);
        return tr;
      });
      function clearHl() {
        [...txRows, ...Object.values(catRows)].forEach((r) => r.classList.remove('hl', 'dim'));
        txRows.forEach((r, i) => { r._amt.textContent = String(TXS[i][2]); });
      }
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      let busy = false;
      const Q = [
        { e: '💰', k: 'q1', sql: "SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)\n  AS balance\nFROM transactions\nWHERE profile_id = 'p1';",
          async run() {
            let total = 0;
            for (let i = 0; i < TXS.length; i++) {
              const sign = TXS[i][1] === 'income' ? 1 : -1;
              total += sign * TXS[i][2];
              txRows[i].classList.add('hl');
              txRows[i]._amt.innerHTML = '<span class="pm" style="color:' + (sign > 0 ? 'var(--green)' : 'var(--red)') + '">' + (sign > 0 ? '+' : '−') + TXS[i][2] + '</span>';
              res.replaceChildren(h('div', { class: 'result', style: { background: 'var(--surface-2)' } }, api.t('ui.subtotal', { n: total })));
              L.sound('click');
              await wait(650);
            }
            res.replaceChildren(h('div', { class: 'result' }, api.t('ui.r1', { n: total, m: money(total) })));
          } },
        { e: '🛒', k: 'q2', sql: "SELECT *\nFROM transactions\nWHERE type = 'expense';",
          async run() {
            for (let i = 0; i < TXS.length; i++) { txRows[i].classList.add(TXS[i][1] === 'expense' ? 'hl' : 'dim'); await wait(250); }
            res.replaceChildren(h('div', { class: 'result' }, api.t('ui.r2', { list: [2, 3, 4].map((i) => descs[i]).join(', ') })));
          } },
        { e: '🔢', k: 'q3', sql: 'SELECT COUNT(*)\nFROM transactions;',
          async run() {
            for (let i = 0; i < TXS.length; i++) { txRows[i].classList.add('hl'); res.replaceChildren(h('div', { class: 'result', style: { background: 'var(--surface-2)' } }, api.t('ui.counted', { n: i + 1 }))); L.sound('click'); await wait(350); }
            res.replaceChildren(h('div', { class: 'result' }, api.t('ui.r3')));
          } },
        { e: '🏅', k: 'q4', sql: "SELECT category_id, SUM(amount) AS total\nFROM transactions\nWHERE type = 'expense'\nGROUP BY category_id\nORDER BY total DESC;",
          async run() {
            for (let i = 0; i < TXS.length; i++) txRows[i].classList.add(TXS[i][1] === 'expense' ? 'hl' : 'dim');
            await wait(500);
            catRows.cat_exp_cinema.classList.add('hl');
            const tb = h('table', { class: 'db', style: { marginTop: '6px' } });
            tb.innerHTML = "<tr><th>category_id</th><th>total</th></tr><tr><td>'cat_exp_cinema'</td><td>450</td></tr><tr><td>'cat_exp_sweets'</td><td>400</td></tr>";
            res.replaceChildren(h('div', { class: 'tbl-wrap' }, tb), h('div', { class: 'result', style: { marginTop: '8px' } },
              api.t('ui.r4', { a: '🎬 ' + app('categories.expense.cinema'), b: '🍿 ' + app('categories.expense.sweets'), ma: money(450), mb: money(400) })));
          } },
      ];
      const qBtns = h('div', { class: 'cat-grid' });
      Q.forEach((q, i) => qBtns.append(h('button', { class: 'chip', type: 'button', onclick: async (e) => {
        if (busy) return;
        busy = true;
        const btn = e.currentTarget;
        qBtns.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        clearHl(); res.replaceChildren();
        sqlBox.innerHTML = L.highlight(q.sql);
        try { await q.run(); } finally { busy = false; }
        asked.add(i);
        L.sound('right');
        if (asked.size === Q.length) { api.badge('detektiv'); api.challenge(btn); }
      } }, q.e + ' ' + api.t('ui.' + q.k))));
      el.append(h('div', { class: 'panel' },
        h('h3', null, api.t('ui.title')),
        h('p', { class: 'hint' }, api.t('ui.hint')),
        h('div', { style: { marginTop: '12px' } }, qBtns),
        h('div', { class: 'dbwrap', style: { marginTop: '14px' } },
          sqlBox, res,
          h('div', { class: 'tbl-wrap' }, h('h4', null, 'transactions'), txT),
          fkMsg,
          h('div', { class: 'cols' },
            h('div', { class: 'tbl-wrap' }, h('h4', null, 'categories'), catT),
            h('div', { class: 'tbl-wrap' }, h('h4', null, 'profiles'), profT)))));
    },
    quiz: [{ a: 1 }, { a: 1 }, { a: 1 }, { type: 'tf', a: false }],
  });

  /* ======================================================================
     Station 8 – Counting in cents
     ====================================================================== */
  const CURRENCIES = [['EUR', '🇪🇺'], ['USD', '🇺🇸'], ['GBP', '🇬🇧'], ['CHF', '🇨🇭'], ['PLN', '🇵🇱'], ['RON', '🇷🇴'], ['TRY', '🇹🇷'], ['CZK', '🇨🇿'], ['RSD', '🇷🇸']];
  /** The app's symbol, in the spelling of the language that uses this locale when it has its own (дин. in Serbian Cyrillic). */
  function symFor(cur, locale) {
    const li = L.LANGS.find((l) => l.locale === locale && l.cur === cur && l.sym);
    return li ? li.sym : L.SYMBOLS[cur];
  }
  function fmtLike(cents, cur, locale) {
    try {
      const f = new Intl.NumberFormat(locale, { style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return f.formatToParts(cents / 100).map((p) => (p.type === 'currency' ? symFor(cur, locale) : p.value)).join('');
    } catch { return (cents / 100).toFixed(2) + ' ' + symFor(cur, locale); }
  }

  L.defineStation({
    id: 'cent', world: 2,
    learn(el, api) {
      api.blocks(el, {
        live: () => h('div', { class: 'formula', style: { fontFamily: 'var(--f-mono)', fontSize: '1.15rem' } }, h('span', null, '0.1 + 0.2 ='), h('strong', { style: { color: 'var(--red)' } }, String(0.1 + 0.2))),
        pro: () => api.pro('format', R`/**
 * Format an amount in minor units (cents) as a currency string.
 * de + EUR → "1.234,50 €",  en + USD → "$1,234.50",  de + USD → "1.234,50 $"
 */
export function formatCurrency(cents, currency = 'EUR', lang = 'de') {
  const amount = cents / 100;          // %{c1}
  ...
}`),
      });
    },
    play(el, api) {
      const floatCol = h('div', { class: 'testres' });
      const centCol = h('div', { class: 'testres' });
      const runBtn = h('button', { class: 'btn small', type: 'button' }, '▶ ' + api.t('ui.addTen', { m: money(10) }));
      runBtn.addEventListener('click', async () => {
        runBtn.disabled = true; floatCol.replaceChildren(); centCol.replaceChildren();
        let f = 0; let c = 0;
        for (let i = 1; i <= 10; i++) {
          f += 0.1; c += 10;
          floatCol.append(h('div', { class: i === 10 ? (f === 1 ? 'pass' : 'fail') : '' }, i + ': ' + f));
          centCol.append(h('div', { class: i === 10 ? 'pass' : '' }, i + ': ' + c));
          L.sound('click');
          await new Promise((r) => setTimeout(r, 180));
        }
        floatCol.append(h('div', { class: 'fail' }, '≠ 1 😬'));
        centCol.append(h('div', { class: 'pass' }, '= ' + money(c) + ' ✓'));
        runBtn.disabled = false;
      });
      const TASKS = [350, 1299, 5];
      const inputs = TASKS.map((_, i) => h('input', { type: 'text', inputmode: 'numeric', id: 'cent-' + i, autocomplete: 'off', style: { width: '130px' } }));
      const fb = h('p', { 'aria-live': 'polite', style: { fontWeight: '800', minHeight: '1.6em' } });
      const check = h('button', { class: 'btn small', type: 'button' }, L.t('ui.check'));
      check.addEventListener('click', () => {
        let ok = 0;
        inputs.forEach((inp, i) => {
          const good = L.parseNum(inp.value) === TASKS[i];
          inp.style.borderColor = good ? 'var(--green)' : 'var(--red)';
          if (good) ok++;
        });
        if (ok === TASKS.length) { fb.style.color = 'var(--green)'; fb.textContent = api.t('ui.allRight'); L.sound('right'); api.badge('cent'); api.challenge(check); }
        else { fb.style.color = 'var(--red)'; fb.textContent = api.t('ui.someRight', { n: ok }); L.sound('wrong'); }
      });
      let cur = L.langInfo().cur;
      let loc = L.langInfo().locale;
      const out = h('div', { class: 'result', style: { fontSize: '1.8rem' } });
      const draw = () => { out.textContent = fmtLike(123450, cur, loc); };
      const curRow = L.chipGroup(CURRENCIES.map((c) => [c[0], c[1] + ' ' + c[0]]), cur, null, (v) => { cur = v; draw(); });
      const locRow = L.chipGroup(L.LANGS.map((l) => [l.locale, l.label]), loc, null, (v) => { loc = v; draw(); });
      draw();

      el.append(
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.floatTitle')),
          h('p', { class: 'hint' }, api.t('ui.floatHint', { m: money(100) })),
          h('div', { style: { marginTop: '12px' } }, runBtn),
          h('div', { class: 'cols', style: { marginTop: '12px' } },
            h('div', null, h('div', { class: 'mini-label' }, api.t('ui.withFloats')), floatCol),
            h('div', null, h('div', { class: 'mini-label' }, api.t('ui.inCents')), centCol))),
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.challengeTitle')),
          h('p', { class: 'hint' }, api.t('ui.challengeHint')),
          h('div', { style: { display: 'grid', gap: '10px', marginTop: '12px' } }, TASKS.map((c, i) => h('div', { class: 'numrow' },
            h('label', { for: 'cent-' + i, style: { minWidth: '90px', fontWeight: '800' } }, money(c) + ' ='), inputs[i], h('b', null, L.t('ui.minorUnit'))))),
          h('div', { style: { marginTop: '12px' } }, check), fb),
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.sameTitle')),
          h('p', { class: 'hint', html: api.t('ui.sameHint') }),
          h('div', { class: 'mini-label' }, L.app('language_select.title')), locRow,
          h('div', { class: 'mini-label' }, api.t('ui.currency')), curRow,
          h('div', { style: { marginTop: '14px' } }, out)));
    },
    quiz: [{ type: 'num', a: 1299, unit: 'minor' }, { a: 1 }, { a: 0 }, { type: 'num', a: 20.5, unit: 'money' }],
  });

  /* ======================================================================
     Station 9 – The journey of an entry
     ====================================================================== */
  const JOURNEY = [['👆', 'NewMenuModal'], ['✍️', 'AddTransactionModal'], ['⚙️', 'createTransactionWithValidation()'], ['🧠', 'transactionStore.createTransaction()'],
    ['🗄️', 'INSERT INTO transactions …'], ['🔄', 'loadTransactions(), loadBalance()'], ['🏆', 'checkBadges()'], ['🎉', 'DashboardScreen']];

  L.defineStation({
    id: 'reise', world: 2,
    learn(el, api) {
      const texts = api.raw('steps') || [];
      const steps = JOURNEY.map((j, i) => h('div', { class: 'pstep' },
        h('div', { class: 'dot', 'aria-hidden': 'true' }, j[0]),
        h('div', { class: 'txt' }, h('b', null, L.fmt((texts[i] || [])[0] || '')), h('small', null, (texts[i] || [])[1] || ''), h('br'), h('code', null, j[1]))));
      let at = -1;
      let timer = 0;
      function setStep(i) {
        at = i;
        steps.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('past', k < i); });
        if (i >= 0) L.sound(i === JOURNEY.length - 1 ? 'win' : 'click');
        if (i === JOURNEY.length - 1) L.confetti(60);
      }
      const play = h('button', { class: 'btn small', type: 'button' }, '▶ ' + api.t('ui.play'));
      const next = h('button', { class: 'btn small ghost', type: 'button' }, api.t('ui.step'));
      play.addEventListener('click', () => {
        clearInterval(timer); setStep(0);
        timer = setInterval(() => { if (at >= JOURNEY.length - 1) { clearInterval(timer); return; } setStep(at + 1); }, 1100);
      });
      next.addEventListener('click', () => { clearInterval(timer); setStep(at >= JOURNEY.length - 1 ? 0 : at + 1); });
      api.blocks(el, {
        pipeline: () => h('div', { class: 'panel' },
          h('h3', null, api.t('ui.slowmo')),
          h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '8px 0 14px' } }, play, next),
          h('div', { class: 'pipeline' }, steps)),
        pro: () => api.pro('store', R`createTransaction: async (data) => {
  const id = await transactionQueries.createTransaction(data);  // → %{c1}
  await get().loadTransactions(data.profile_id);                // %{c2}
  await get().loadBalance(data.profile_id);                     // %{c3}
  checkBadges(data.profile_id);                                 // %{c4}
  scheduleReviewRequest();                                      // %{c5}
  return id;
},`),
      });
    },
    play(el, api) {
      const order = api.raw('order') || [];
      el.append(h('div', { class: 'panel' }, h('h3', null, api.t('ui.orderTitle')),
        L.orderGame(order, api.t('ui.orderDone'), (b) => { api.badge('paket'); api.challenge(b); })));
    },
    quiz: [{ a: 0 }, { a: 1 }, { type: 'tf', a: false }],
  });

  /* ======================================================================
     Station 10 – Sparly speaks 10 languages
     ====================================================================== */
  const KEYS = ['dashboard.greeting', 'dashboard.welcome_back', 'dashboard.your_money', 'dashboard.income', 'dashboard.expense', 'dashboard.recent_expenses', 'dashboard.daily_tip'];

  L.defineStation({
    id: 'sprachen', world: 2,
    learn(el, api) {
      const greet = (c) => '"greeting": "' + app('dashboard.greeting', null, c) + '"';
      api.blocks(el, {
        keys: () => L.code(['de', 'en', 'tr'].map((c) => '// ' + L.langInfo(c).label + '\n' + greet(c)).join('\n\n')),
        pro: () => api.pro('langs', R`export const SUPPORTED_LANGUAGES = [
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪', locale: 'de-DE' },
  { code: 'en', label: 'English',  flag: '🇬🇧', locale: 'en-US' },
  { code: 'tr', label: 'Türkçe',   flag: '🇹🇷', locale: 'tr-TR' },
  { code: 'ro', label: 'Română',   flag: '🇷🇴', locale: 'ro-RO' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', locale: 'fr-FR' },
  { code: 'pl', label: 'Polski',   flag: '🇵🇱', locale: 'pl-PL' },
  { code: 'es', label: 'Español',  flag: '🇪🇸', locale: 'es-ES' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', locale: 'it-IT' },
  { code: 'cs', label: 'Čeština',  flag: '🇨🇿', locale: 'cs-CZ' },
  { code: 'sr', label: 'Српски (ћирилица)', flag: '🇷🇸', locale: 'sr-RS' },
  { code: 'sr-Latn', label: 'Srpski (latinica)', flag: '🇷🇸', locale: 'sr-Latn-RS' },
] as const;`),
      });
    },
    play(el, api) {
      const tried = new Set(api.flag('langs') || []);
      const holder = h('div');
      const tbl = h('table', { class: 'keytbl' });
      const row = h('div', { class: 'lang-row', role: 'group' });
      const counter = h('p', { class: 'hint' });
      // Serbian counts once, whichever script you look at it in.
      const base = (c) => c.split('-')[0];
      const total = new Set(L.LANGS.map((l) => base(l.code))).size;
      function show(code, silent) {
        tried.add(code); api.flag('langs', Array.from(tried));
        holder.replaceChildren(L.phone(L.dashboard(code), L.tabBar('money', null, code)));
        tbl.replaceChildren(...KEYS.map((k) => h('tr', null, h('td', null, k), h('td', null, app(k, null, code)))), h('tr', null, h('td', null, 'tips.tip_0'), h('td', null, L.raw('app.tips', code)[0])));
        row.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b._c === code)));
        const seen = new Set(Array.from(tried, base)).size;
        counter.textContent = api.t('ui.tried', { n: seen, total });
        if (!silent) L.sound('click');
        if (seen === total) { api.badge('weltenbummler'); api.challenge(holder); }
      }
      L.LANGS.forEach((l) => { const b = h('button', { class: 'chip', type: 'button', lang: l.code, onclick: () => show(l.code) }, l.flag + ' ' + l.label); b._c = l.code; row.append(b); });
      show(L.currentLang(), true);
      el.append(h('div', { class: 'panel' },
        h('h3', null, api.t('ui.title')),
        h('p', { class: 'hint' }, api.t('ui.hint')),
        h('div', { style: { marginTop: '12px' } }, row), counter,
        h('div', { class: 'split', style: { marginTop: '14px' } }, holder,
          h('div', null, h('div', { class: 'mini-label' }, api.t('ui.keyText')), h('div', { class: 'tbl-wrap', style: { marginTop: '6px' } }, tbl)))));
    },
    quiz: [{ a: 0 }, { a: 0 }, { type: 'num', a: 20 }, { a: 0 }],
  });
})();
