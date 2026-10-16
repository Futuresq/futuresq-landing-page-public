/* Sparly Escape – the five rooms. All texts come from lang/*.js; numbers, codes and pictures live here. */
(function () {
  'use strict';
  const E = window.Esc;

  E.item('lupe', '🔍');
  E.item('key', '🔑');
  E.item('card', '🪪');
  E.item('speaker', '🔊');

  /* Small shared pieces ------------------------------------------------ */

  function kv(A, rows) {
    return A.h('div', { class: 'kv' }, rows.map((r) => A.h('div', { class: r[2] || null }, A.h('small', null, r[0]), A.h('b', { class: 'num' }, r[1]))));
  }
  function codeBlock(A, src) { return A.h('pre', { class: 'code' }, src); }
  function doorArt(x, y, w, hgt, open, colors) {
    const c = colors || { frame: '#0A1B2B', leaf: '#2E5E86', panel: '#3B74A6', light: '#FFE9A8' };
    if (open) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hgt + '" rx="8" fill="' + c.frame + '"/>' +
        '<rect x="' + (x + 5) + '" y="' + (y + 5) + '" width="' + (w - 10) + '" height="' + (hgt - 5) + '" rx="5" fill="' + c.light + '" class="door-light"/>' +
        '<path d="M' + (x + 5) + ' ' + (y + 5) + ' L' + (x - 16) + ' ' + (y - 2) + ' L' + (x - 16) + ' ' + (y + hgt + 8) + ' L' + (x + 5) + ' ' + (y + hgt) + ' Z" fill="' + c.leaf + '"/>';
    }
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hgt + '" rx="8" fill="' + c.frame + '"/>' +
      '<rect x="' + (x + 5) + '" y="' + (y + 5) + '" width="' + (w - 10) + '" height="' + (hgt - 5) + '" rx="5" fill="' + c.leaf + '"/>' +
      '<rect x="' + (x + 11) + '" y="' + (y + 14) + '" width="' + (w - 22) + '" height="' + (hgt * 0.32) + '" rx="4" fill="' + c.panel + '"/>' +
      '<rect x="' + (x + 11) + '" y="' + (y + 22 + hgt * 0.32) + '" width="' + (w - 22) + '" height="' + (hgt * 0.42) + '" rx="4" fill="' + c.panel + '"/>' +
      '<circle cx="' + (x + w - 12) + '" cy="' + (y + hgt * 0.56) + '" r="3.5" fill="#FFD36B"/>';
  }

  /* ==================================================================== */
  /* Room 1 – the home screen: bookings and the balance                   */
  /* ==================================================================== */

  // One week of bookings. The video game was refused by Sparly: not enough money at that moment.
  const R1 = [
    { id: 'pig', e: '💰', d: '2026-03-02', amt: 1500, cat: 'pocket' },
    { id: 'wallet', e: '🍦', d: '2026-03-03', amt: -250, cat: 'ice' },
    { id: 'console', e: '🎮', d: '2026-03-04', amt: -1999, cat: 'game', refused: true },
    { id: 'gift', e: '🎂', d: '2026-03-05', amt: 500, cat: 'grandma' },
    { id: 'trash', e: '🎬', d: '2026-03-06', amt: -675, cat: 'cinema' },
  ];
  const R1_CODE = '1075'; // 15,00 − 2,50 + 5,00 − 6,75 = 10,75

  function receipt(A, r) {
    const inc = r.amt > 0;
    return A.h('div', { class: 'rcpt' + (r.refused ? ' refused' : '') },
      A.h('div', { class: 'rc-row' },
        A.h('span', { class: 'rc-e', 'aria-hidden': 'true' }, r.e),
        A.h('span', { class: 'rc-t' }, A.t('rc.' + r.cat), A.h('small', null, A.datef(r.d, { weekday: 'long', day: 'numeric', month: 'long' }))),
        A.h('span', { class: 'rc-a ' + (inc ? 'in' : 'out') }, (inc ? '+' : '−') + A.money(Math.abs(r.amt)))),
      r.refused ? A.h('div', { class: 'rc-warn' }, '⚠️ ' + A.T('app.transactions.insufficient_balance')) : null);
  }
  function findReceipt(A, id, anchor) {
    if (A.f('rc.' + id)) return false;
    A.f('rc.' + id, true);
    A.note('start.receipts');
    A.sound('item');
    const n = R1.filter((r) => A.f('rc.' + r.id)).length;
    A.toast(A.t('foundReceipt', { n, m: R1.length }));
    if (n === R1.length) A.sayKey('r.start.allFound', 'angry');
    A.progress();
    return true;
  }
  function receiptCloseup(A, ctx, id, introKey) {
    const r = R1.find((x) => x.id === id);
    const first = !A.f('rc.' + id);
    ctx.body.append(A.P(A.t(introKey)), receipt(A, r));
    if (r.refused) ctx.body.append(A.P(A.t('o.console.after'), 'hint'));
    if (first) findReceipt(A, id);
  }

  E.note('start.tabs', 'start', (A) => A.h('div', { class: 'tabs-mini' }, TABS.map((tb, i) => A.h('span', null, A.h('i', { 'aria-hidden': 'true' }, tb.e), A.h('b', null, (i + 1) + '. ' + A.T('app.tabs.' + tb.k))))));
  E.note('start.rules', 'start', (A) => A.h('ol', { class: 'rules' }, A.tl('rules').map((x) => A.h('li', { html: x }))));
  E.note('start.receipts', 'start', (A) => {
    const found = R1.filter((r) => A.f('rc.' + r.id));
    return A.h('div', { class: 'rc-list' }, found.map((r) => receipt(A, r)), A.h('p', { class: 'hint' }, A.t('receiptsCount', { n: found.length, m: R1.length })));
  });

  const TABS = [{ k: 'money', e: '💰' }, { k: 'review', e: '📊' }, { k: 'new', e: '➕' }, { k: 'wishes', e: '⭐' }, { k: 'badges', e: '🏆' }];

  E.room({
    id: 'start', icon: '🏠', color: 'var(--r1)',
    steps: [
      { id: 'find', done: (A) => R1.every((r) => A.f('rc.' + r.id)) },
      { id: 'code', done: (A) => !!A.f('done') },
    ],
    onEnter(A) { A.note('start.tabs'); },
    buggyAt: (A) => (A.f('done') ? { x: 60, y: 40, mood: 'shock' } : { x: 74, y: 11 }),
    art(A) {
      const mp = A.moneyParts();
      const q = (mp.pre.trim() ? mp.pre.trim() : '') + '??' + mp.dec + '??' + (mp.post.trim() ? ' ' + mp.post.trim() : '');
      const grid = Array.from({ length: 19 }, (_, i) => '<path d="M' + (i * 22) + ' 0V236"/>').join('') + Array.from({ length: 11 }, (_, i) => '<path d="M0 ' + (i * 22) + 'H400"/>').join('');
      return '<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
        '<linearGradient id="a1w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#103D4C"/><stop offset="1" stop-color="#0B2A3B"/></linearGradient>' +
        '<linearGradient id="a1c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43CEA2"/><stop offset="1" stop-color="#185A9D"/></linearGradient></defs>' +
        '<rect width="400" height="300" fill="url(#a1w)"/><g stroke="#43CEA2" stroke-opacity=".07" stroke-width="1">' + grid + '</g>' +
        '<rect y="236" width="400" height="64" fill="#07202F"/><rect y="234" width="400" height="3" fill="#43CEA2" opacity=".3"/>' +
        // poster with the rules
        '<g transform="rotate(-3 54 78)"><rect x="18" y="32" width="72" height="92" rx="4" fill="#FFF8E7"/><rect x="28" y="44" width="44" height="7" rx="3.5" fill="#43CEA2"/>' +
        '<g fill="#C9BFA3"><rect x="28" y="60" width="52" height="4" rx="2"/><rect x="28" y="70" width="46" height="4" rx="2"/><rect x="28" y="80" width="52" height="4" rx="2"/><rect x="28" y="90" width="38" height="4" rx="2"/><rect x="28" y="100" width="50" height="4" rx="2"/></g>' +
        '<circle cx="54" cy="36" r="3.4" fill="#FF5D6C"/></g>' +
        // balance card, broken by Buggy
        '<rect x="120" y="22" width="160" height="70" rx="16" fill="url(#a1c)"/><rect x="136" y="34" width="54" height="7" rx="3.5" fill="#fff" opacity=".75"/>' +
        '<text x="200" y="78" text-anchor="middle" font-family="Fredoka, Nunito, sans-serif" font-size="26" font-weight="700" fill="#fff">' + A.esc(q) + '</text>' +
        '<path d="M236 22l-10 17 9 8-12 20 8 8-6 17" fill="none" stroke="#FF5D6C" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        // desk with drawer
        '<rect x="104" y="166" width="132" height="9" rx="3" fill="#A87449"/><rect x="110" y="175" width="7" height="61" fill="#7A4E33"/>' +
        '<rect x="178" y="175" width="52" height="46" rx="4" fill="#8A5A3B"/><rect x="186" y="187" width="36" height="20" rx="3" fill="#A87449"/><circle cx="204" cy="197" r="3" fill="#FFD36B"/>' +
        // shelf
        '<rect x="246" y="116" width="90" height="8" rx="3" fill="#A87449"/><path d="M256 124l6 12M326 124l-6 12" stroke="#7A4E33" stroke-width="4"/>' +
        // tab bar on the floor
        '<rect x="70" y="248" width="260" height="40" rx="14" fill="#F5F7FA"/>' +
        '<g font-size="17" text-anchor="middle" dominant-baseline="central"><text x="100" y="268">💰</text><text x="150" y="268">📊</text><text x="250" y="268">⭐</text><text x="300" y="268">🏆</text></g>' +
        '<circle cx="200" cy="262" r="17" fill="url(#a1c)"/><path d="M200 254v16M192 262h16" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>' +
        doorArt(338, 106, 56, 130, !!A.f('done')) + '</svg>';
    },
    objects: [
      { id: 'board', area: [30, 7, 40, 24], icon: () => '💳', open(A, ctx) {
        const mp = A.moneyParts();
        ctx.body.append(A.h('div', { class: 'bal-card broken' }, A.h('small', null, A.T('ui.balance')), A.h('b', null, (mp.pre.trim() || '') + '??' + mp.dec + '??' + (mp.post.trim() ? ' ' + mp.post.trim() : ''))), A.P(A.t('o.board.text')));
      } },
      { id: 'poster', area: [4, 10, 19, 33], icon: () => '📜', open(A, ctx) {
        ctx.body.append(A.paper('poster', [A.h('h3', null, A.t('rulesTitle')), A.h('ol', { class: 'rules' }, A.tl('rules').map((x) => A.h('li', { html: x })))]));
        A.note('start.rules');
      } },
      { id: 'pig', e: '🐷', x: 8, y: 83, s: 1.15, open(A, ctx) { receiptCloseup(A, ctx, 'pig', A.f('rc.pig') ? 'o.pig.again' : 'o.pig.text'); } },
      { id: 'wallet', e: '👛', x: 36, y: 50, open(A, ctx) { receiptCloseup(A, ctx, 'wallet', 'o.wallet.text'); } },
      { id: 'gift', e: '🎁', x: 66, y: 33, open(A, ctx) { receiptCloseup(A, ctx, 'gift', 'o.gift.text'); } },
      { id: 'console', e: '🎮', x: 79, y: 34, open(A, ctx) { receiptCloseup(A, ctx, 'console', 'o.console.text'); } },
      { id: 'trash', e: '🗑️', x: 63, y: 73, open(A, ctx) {
        if (A.f('rc.trash')) { receiptCloseup(A, ctx, 'trash', 'o.trash.read'); return; }
        ctx.body.append(A.P(A.t('o.trash.text')), A.h('div', { class: 'tiny-paper', 'aria-hidden': 'true' }, A.h('span', null, '🎬 ··· −' + A.money(675))));
        if (!A.has('lupe')) ctx.body.append(A.P(A.t('o.trash.need'), 'hint'));
      }, use: {
        lupe(A, ctx) { A.take('lupe'); ctx.body.replaceChildren(); receiptCloseup(A, ctx, 'trash', 'o.trash.read'); ctx.drawUse(); A.sound('right'); },
      } },
      { id: 'drawer', area: [44.5, 60, 13, 14], icon: () => '🗄️', open(A, ctx) {
        if (!A.f('drawer')) {
          A.f('drawer', true);
          ctx.body.append(A.P(A.t('o.drawer.text')), A.h('div', { class: 'item-big', 'aria-hidden': 'true' }, '🔍'));
          A.give('lupe');
        } else ctx.body.append(A.P(A.t('o.drawer.empty')));
      } },
      { id: 'plant', e: '🪴', x: 52, y: 47, quiet: true, open(A, ctx) {
        if (A.coin('start')) ctx.body.append(A.h('div', { class: 'item-big', 'aria-hidden': 'true' }, '🪙'), A.P(A.t('o.plant.coin')));
        else ctx.body.append(A.P(A.t('o.plant.text')));
      } },
      { id: 'tabbar', area: [17.5, 82, 65, 14], icon: () => '📱', open(A, ctx) {
        ctx.body.append(A.P(A.t('o.tabbar.text')), A.h('div', { class: 'tab-info' }, TABS.map((tb) => A.h('div', null, A.h('span', { class: 'ti-e', 'aria-hidden': 'true' }, tb.e), A.h('b', null, A.T('app.tabs.' + tb.k)), A.h('small', null, A.t('tab.' + tb.k))))));
        A.note('start.tabs');
      } },
      { id: 'door', area: [84.5, 35, 14, 44], icon: () => '🚪', badge: (A) => (A.f('done') ? null : '🔒'), open(A, ctx) {
        if (A.f('done')) { ctx.body.append(A.P(A.t('o.door.openText'))); return; }
        ctx.body.append(A.P(A.t('o.door.text')), A.digitLock({ n: 4, money: true, answer: R1_CODE, label: A.t('o.door.lock'), onWrong: (v) => {
          if (v === '0000') return;
          const counted = R1.filter((r) => A.f('rc.' + r.id)).length;
          if (counted < R1.length) A.toast(A.t('o.door.missing', { n: R1.length - counted }));
        }, onOpen: () => A.done() }));
      } },
    ],
  });

  /* ==================================================================== */
  /* Room 2 – the wish workshop: saving jars and the savings battery     */
  /* ==================================================================== */

  const BAL2 = 5000;
  const STEP2 = 500;
  const JARS = [
    { id: 'ball', e: '⚽', goal: 2000, start: 2000 },
    { id: 'lego', e: '🧱', goal: 6000, start: 2500 },
    { id: 'phones', e: '🎧', goal: 3000, start: 0, key: true },
  ];
  // Four weeks: income, expenses. Savings rates 20 %, 80 %, 0 %, 50 %.
  const WEEKS = [[2000, 1600], [2000, 400], [1000, 1000], [2000, 1000]];
  const BATT = ['🔌', '🪫', '💪', '🔋', '⚡'];
  const BATT_ANSWER = [2, 4, 0, 3];

  function jarIn(A, j) { const v = A.f('jar.' + j.id); return v == null ? j.start : v; }
  function jarSvg(fill, open, hasKey) {
    const hgt = Math.round(46 * Math.max(0, Math.min(1, fill)));
    return '<svg viewBox="0 0 60 80" class="jar-svg" aria-hidden="true">' +
      (open ? '<rect x="14" y="2" width="32" height="9" rx="3" fill="#C98408" transform="rotate(-24 14 10)"/>' : '<rect x="13" y="6" width="34" height="9" rx="3" fill="#C98408"/>') +
      '<path d="M10 18h40v50a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8z" fill="#E8F6FF" fill-opacity=".18" stroke="#BFE3F5" stroke-width="2.4"/>' +
      '<rect x="12" y="' + (74 - hgt) + '" width="36" height="' + hgt + '" rx="5" fill="#F5B323"/>' +
      (hasKey ? '<g transform="translate(30 52) rotate(-30)"><circle r="6" fill="none" stroke="#FFD36B" stroke-width="3"/><path d="M6 0h12M14 0v5M18 0v4" stroke="#FFD36B" stroke-width="3" stroke-linecap="round"/></g>' : '') +
      '<path d="M16 24v34" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/></svg>';
  }

  function jarsView(A, ctx) {
    const msg = A.h('p', { class: 'jar-msg', role: 'status' });
    const wrap = A.h('div', { class: 'jars-wrap' });
    function draw(note) {
      const inJars = JARS.reduce((s, j) => s + jarIn(A, j), 0);
      const avail = BAL2 - inJars;
      wrap.replaceChildren(
        kv(A, [[A.T('ui.balance'), A.money(BAL2)], [A.t('inJars'), A.money(inJars)], [A.t('available'), A.money(avail), 'hl']]),
        A.h('div', { class: 'jars' }, JARS.map((j) => {
          const v = jarIn(A, j);
          const full = v >= j.goal;
          const opened = j.key && A.f('jarOpen');
          return A.h('div', { class: 'jar' + (full ? ' full' : '') },
            A.h('div', { class: 'jar-pic', html: jarSvg(v / j.goal, opened, j.key && !A.f('jarOpen')) }),
            A.h('b', null, j.e + ' ' + A.t('wish.' + j.id)),
            A.h('small', null, A.t('goalOf', { m: A.money(j.goal) })),
            A.h('div', { class: 'bar' }, A.h('i', { style: { width: Math.round((v / j.goal) * 100) + '%' } })),
            A.h('div', { class: 'jar-in num' }, A.money(v)),
            full ? A.h('div', { class: 'jar-ok' }, A.T('app.savings.goal_reached')) : null,
            A.h('div', { class: 'jar-btns' },
              A.h('button', { class: 'btn small ghost', type: 'button', 'aria-label': A.t('takeOut', { w: A.t('wish.' + j.id) }), onclick: () => change(j, -STEP2) }, '−' + A.money(STEP2, true)),
              A.h('button', { class: 'btn small', type: 'button', 'aria-label': A.t('putIn', { w: A.t('wish.' + j.id) }), onclick: () => change(j, STEP2) }, '+' + A.money(STEP2, true))));
        })),
        msg);
      if (note) msg.textContent = note;
    }
    function change(j, d) {
      const v = jarIn(A, j);
      const inJars = JARS.reduce((s, x) => s + jarIn(A, x), 0);
      if (d > 0 && v >= j.goal) { A.sound('wrong'); draw(A.t('jarFull')); return; }
      if (d > 0 && BAL2 - inJars < d) { A.sound('wrong'); A.sayKey('r.wishes.noMoney', 'grin'); draw(A.t('notEnough')); return; }
      if (d < 0 && v <= 0) { A.sound('wrong'); draw(A.t('jarEmpty')); return; }
      A.f('jar.' + j.id, v + d);
      A.sound(d > 0 ? 'coin' : 'tick');
      let note = d < 0 ? A.t('backAvailable', { m: A.money(-d) }) : '';
      if (j.key && v + d >= j.goal && !A.f('jarOpen')) {
        A.f('jarOpen', true);
        note = A.t('jarKey');
        A.confetti(80);
        setTimeout(() => A.give('key'), 300);
      }
      draw(note);
    }
    draw();
    ctx.body.append(A.P(A.t('o.shelf.text')), wrap);
  }

  function chartSvg(A) {
    const W = 340; const H = 200; const top = 30; const base = 160; const max = 2000;
    const y = (v) => base - (v / max) * (base - top);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img" aria-label="' + A.esc(A.t('chartAria')) + '"><defs><pattern id="stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#FF6B6B"/><rect width="3" height="6" fill="#FF9B9B"/></pattern></defs>';
    s += '<path d="M20 ' + base + 'H330" stroke="#5B6E9E" stroke-width="2"/>';
    WEEKS.forEach((wk, i) => {
      const x = 34 + i * 76;
      s += '<rect x="' + x + '" y="' + y(wk[0]) + '" width="24" height="' + (base - y(wk[0])) + '" rx="4" fill="#34D399" class="grow"/>';
      s += '<rect x="' + (x + 28) + '" y="' + y(wk[1]) + '" width="24" height="' + (base - y(wk[1])) + '" rx="4" fill="url(#stripes)" class="grow"/>';
      s += '<text x="' + (x + 12) + '" y="' + (y(wk[0]) - 6) + '" text-anchor="middle" class="ct in">' + A.esc(A.money(wk[0], true)) + '</text>';
      s += '<text x="' + (x + 40) + '" y="' + (y(wk[1]) - 6) + '" text-anchor="middle" class="ct out">' + A.esc(A.money(wk[1], true)) + '</text>';
      s += '<text x="' + (x + 26) + '" y="' + (base + 22) + '" text-anchor="middle" class="ct lbl">' + A.esc(A.t('weekN', { n: i + 1 })) + '</text>';
    });
    return s + '</svg>';
  }
  function chartView(A) {
    return A.h('div', { class: 'chart-wrap' },
      A.h('div', { class: 'chart-title' }, '📊 ' + A.T('app.tabs.review')),
      A.h('div', { class: 'svgbox', html: chartSvg(A) }),
      A.h('div', { class: 'legend' }, A.h('span', null, A.h('i', { style: { background: '#34D399' } }), A.t('legendIn')), A.h('span', null, A.h('i', { class: 'striped' }), A.t('legendOut'))));
  }
  function batteryPoster(A) {
    return A.paper('poster', [
      A.h('h3', null, A.t('battTitle')),
      A.h('div', { class: 'formula', html: A.t('battFormula') }),
      A.h('p', { html: A.t('battExample') }),
      A.h('div', { class: 'levels' }, A.tl('levels').map((l, i) => A.h('div', null, A.h('span', { class: 'lv-e' }, BATT[i]), A.h('span', { html: l })))),
    ]);
  }

  E.note('wishes.rules', 'wishes', (A) => A.h('div', null, A.h('div', { class: 'formula', html: A.t('availFormula') }), A.P(A.t('o.board.rule2'))));
  E.note('wishes.chart', 'wishes', (A) => chartView(A));
  E.note('wishes.battery', 'wishes', (A) => batteryPoster(A));

  E.room({
    id: 'wishes', icon: '⭐', color: 'var(--r2)',
    steps: [
      { id: 'key', done: (A) => !!(A.f('cabinet') || A.got('key')) },
      { id: 'cabinet', done: (A) => !!A.f('cabinet') },
      { id: 'door', done: (A) => !!A.f('done') },
    ],
    buggyAt: (A) => (A.f('done') ? { x: 72, y: 62, mood: 'shock' } : A.f('cabinet') ? { x: 75, y: 58, mood: 'angry' } : { x: 54, y: 27 }),
    art(A) {
      const jars = JARS.map((j, i) => {
        const v = jarIn(A, j);
        const x = 26 + i * 46; const fill = Math.max(0, Math.min(1, v / j.goal)); const hh = Math.round(40 * fill);
        return '<g><path d="M' + x + ' 82h36v40a7 7 0 0 1-7 7h-22a7 7 0 0 1-7-7z" fill="#E8F6FF" fill-opacity=".15" stroke="#BFE3F5" stroke-width="2"/>' +
          '<rect x="' + (x + 2) + '" y="' + (127 - hh) + '" width="32" height="' + hh + '" rx="5" fill="#F5B323"/>' +
          (j.key && A.f('jarOpen') ? '<rect x="' + (x + 2) + '" y="72" width="30" height="8" rx="3" fill="#C98408" transform="rotate(-22 ' + (x + 2) + ' 80)"/>' : '<rect x="' + (x + 1) + '" y="75" width="34" height="8" rx="3" fill="#C98408"/>') +
          (j.key && !A.f('jarOpen') ? '<g transform="translate(' + (x + 18) + ' 112) rotate(-30)"><circle r="5" fill="none" stroke="#FFD36B" stroke-width="2.6"/><path d="M5 0h10M12 0v4" stroke="#FFD36B" stroke-width="2.6" stroke-linecap="round"/></g>' : '') +
          '<text x="' + (x + 18) + '" y="148" text-anchor="middle" font-size="15" dominant-baseline="central">' + j.e + '</text></g>';
      }).join('');
      const cab = A.f('cabinet')
        ? '<rect x="176" y="110" width="84" height="152" rx="6" fill="#4A2F1C"/><rect x="182" y="116" width="72" height="140" rx="4" fill="#1C1408"/><rect x="192" y="130" width="52" height="40" rx="3" fill="#FFF8E7"/><path d="M198 160v-10M208 160v-20M218 160v-6M228 160v-14" stroke="#34D399" stroke-width="5"/><path d="M176 112l-22-8v160l22-4z" fill="#7A4E33"/>'
        : '<rect x="176" y="110" width="84" height="152" rx="6" fill="#7A4E33"/><rect x="182" y="116" width="34" height="140" rx="4" fill="#8E5D3D"/><rect x="220" y="116" width="34" height="140" rx="4" fill="#8E5D3D"/><circle cx="218" cy="186" r="5" fill="#FFD36B"/><rect x="216.5" y="186" width="3" height="8" fill="#5B3A22"/><text x="218" y="140" text-anchor="middle" font-size="16">📊</text>';
      return '<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
        '<linearGradient id="a2w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2A4F"/><stop offset="1" stop-color="#2A1E33"/></linearGradient>' +
        '<pattern id="a2p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 40L40 0" stroke="#F5B323" stroke-opacity=".06" stroke-width="10"/></pattern></defs>' +
        '<rect width="400" height="300" fill="url(#a2w)"/><rect width="400" height="250" fill="url(#a2p)"/>' +
        '<rect y="250" width="400" height="50" fill="#5A3B26"/><g stroke="#4A2F1C" stroke-width="2"><path d="M0 266H400M0 283H400M60 250v16M180 250v16M300 250v16M120 266v17M240 266v17M360 266v17"/></g>' +
        // shelf with jars
        '<rect x="14" y="129" width="156" height="8" rx="3" fill="#A87449"/><path d="M26 137l6 12M158 137l-6 12" stroke="#7A4E33" stroke-width="4"/>' + jars +
        // wish board
        '<rect x="20" y="168" width="92" height="70" rx="6" fill="#C79A63"/><rect x="25" y="173" width="82" height="60" rx="4" fill="#D8B07A"/>' +
        '<g><rect x="30" y="180" width="22" height="26" rx="2" fill="#fff" transform="rotate(-6 41 193)"/><rect x="56" y="178" width="22" height="26" rx="2" fill="#fff" transform="rotate(4 67 191)"/><rect x="82" y="182" width="20" height="24" rx="2" fill="#fff" transform="rotate(-3 92 194)"/></g>' +
        '<g font-size="11" text-anchor="middle" dominant-baseline="central"><text x="41" y="192">⚽</text><text x="67" y="191">🧱</text><text x="92" y="194">🎧</text></g>' +
        '<rect x="34" y="214" width="62" height="6" rx="3" fill="#fff" opacity=".7"/>' +
        cab +
        // battery poster
        '<rect x="270" y="30" width="58" height="82" rx="4" fill="#FFF8E7"/><rect x="284" y="40" width="30" height="50" rx="5" fill="none" stroke="#2A2414" stroke-width="3"/><rect x="293" y="35" width="12" height="5" rx="2" fill="#2A2414"/>' +
        '<rect x="288" y="62" width="22" height="24" rx="2" fill="#34D399"/><path d="M301 48l-6 10h6l-4 10" stroke="#F5B323" stroke-width="2.6" fill="none" stroke-linecap="round"/><rect x="280" y="96" width="38" height="5" rx="2.5" fill="#C9BFA3"/>' +
        doorArt(338, 96, 56, 154, !!A.f('done'), { frame: '#24160E', leaf: '#8A5A3B', panel: '#A87449', light: '#FFE9A8' }) +
        // the four battery slots on the door
        (A.f('done') ? '' : '<g>' + [0, 1, 2, 3].map((i) => '<rect x="' + (346 + (i % 2) * 20) + '" y="' + (150 + Math.floor(i / 2) * 22) + '" width="16" height="18" rx="3" fill="#24160E"/>').join('') + '</g>') +
        '</svg>';
    },
    objects: [
      { id: 'shelf', area: [3, 22, 40.5, 30], icon: () => '🫙', wide: true, open: jarsView },
      { id: 'board', area: [4.5, 55, 24, 25], icon: () => '📋', open(A, ctx) {
        ctx.body.append(A.P(A.t('o.board.text')), A.h('div', { class: 'formula', html: A.t('availFormula') }), A.P(A.t('o.board.rule2')));
        A.note('wishes.rules');
      } },
      { id: 'cabinet', area: [44, 36, 21, 52], icon: () => '🗄️', badge: (A) => (A.f('cabinet') ? null : '🔒'), wide: true, open(A, ctx) {
        if (!A.f('cabinet')) { ctx.body.append(A.P(A.t('o.cabinet.text'))); return; }
        ctx.body.append(A.P(A.t('o.cabinet.open')), chartView(A));
        A.note('wishes.chart');
      }, use: {
        key(A, ctx) {
          A.f('cabinet', true); A.take('key'); A.sound('unlock'); A.solved('r.wishes.cabinetOpen');
          ctx.redraw();
        },
      } },
      { id: 'battery', area: [67, 9, 15.5, 29], icon: () => '🔋', wide: true, open(A, ctx) { ctx.body.append(batteryPoster(A)); A.note('wishes.battery'); } },
      { id: 'toolbox', e: '🧰', x: 75, y: 81, quiet: true, open(A, ctx) {
        if (A.coin('wishes')) ctx.body.append(A.h('div', { class: 'item-big', 'aria-hidden': 'true' }, '🪙'), A.P(A.t('o.toolbox.coin')));
        else ctx.body.append(A.P(A.t('o.toolbox.text')));
      } },
      { id: 'door', area: [84.5, 31, 14, 53], icon: () => '🚪', badge: (A) => (A.f('done') ? null : '🔒'), open(A, ctx) {
        if (A.f('done')) { ctx.body.append(A.P(A.t('o.door.openText'))); return; }
        ctx.body.append(A.P(A.t('o.door.text')), A.symbolLock({ symbols: BATT, names: A.tl('levelNames'), answer: BATT_ANSWER, labels: [1, 2, 3, 4].map((n) => A.t('weekN', { n })), onOpen: () => A.done() }));
      } },
    ],
  });

  /* ==================================================================== */
  /* Room 3 – the engine room: layers, the database, translation keys    */
  /* ==================================================================== */

  const LAYERS = [
    { id: 'screen', e: '🖥️' }, { id: 'comp', e: '🧱' }, { id: 'store', e: '🧠' }, { id: 'service', e: '🧑‍🍳' }, { id: 'db', e: '🗄️' },
  ];
  // Floors of the cross-section, in percent of the scene height.
  const FLOORS = [[0, 18.7], [18.7, 36.7], [36.7, 54.7], [54.7, 72.7], [72.7, 100]];
  const TX = [
    [1, 'income', 1000, 'cat_inc_pocket', 'd1'],
    [2, 'expense', 350, 'cat_exp_sweets', 'd2'],
    [3, 'expense', 700, 'cat_exp_cinema', 'd3'],
    [4, 'expense', 425, 'cat_exp_sweets', 'd4'],
    [5, 'income', 500, 'cat_inc_gift', 'd5'],
    [6, 'expense', 500, 'cat_exp_sweets', 'd6'],
    [7, 'expense', 1299, 'cat_exp_toys', 'd7'],
  ];
  const CATS = [['cat_inc_pocket', '💰', 'pocket'], ['cat_inc_gift', '🎁', 'gift'], ['cat_exp_sweets', '🍿', 'sweets'], ['cat_exp_cinema', '🎬', 'cinema'], ['cat_exp_toys', '🧸', 'toys']];
  const SQL_CODE = '1275'; // 350 + 425 + 500
  const SQL = "SELECT SUM(amount)\nFROM transactions\nWHERE category_id = 'cat_exp_sweets';";

  // The tab names from the app's own translation files.
  const TAB_WORDS = {
    de: ['Geld', 'Rückblick', 'Neu', 'Wünsche', 'Abzeichen'],
    en: ['Money', 'Review', 'New', 'Wishes', 'Badges'],
    tr: ['Para', 'Özet', 'Yeni', 'Dilekler', 'Rozetler'],
    ro: ['Bani', 'Rezumat', 'Nou', 'Dorințe', 'Insigne'],
    fr: ['Argent', 'Bilan', 'Nouveau', 'Souhaits', 'Badges'],
    pl: ['Pieniądze', 'Przegląd', 'Nowy', 'Życzenia', 'Odznaki'],
    es: ['Dinero', 'Resumen', 'Nuevo', 'Deseos', 'Medallas'],
    it: ['Soldi', 'Riepilogo', 'Nuovo', 'Desideri', 'Medaglie'],
  };
  const TAB_KEYS = ['tabs.money', 'tabs.review', 'tabs.new', 'tabs.wishes', 'tabs.badges'];
  const FLAG = { de: '🇩🇪', en: '🇬🇧', tr: '🇹🇷', ro: '🇷🇴', fr: '🇫🇷', pl: '🇵🇱', es: '🇪🇸', it: '🇮🇹' };
  /** One foreign word per tab, each from a different language, never in the player's own language. */
  function doorWords(lang) {
    const pool = ['tr', 'pl', 'it', 'ro', 'es', 'fr', 'de', 'en'].filter((l) => l !== lang);
    const own = TAB_WORDS[lang] || TAB_WORDS.en;
    const used = new Set();
    const res = [];
    for (let i = 0; i < 5; i++) {
      for (let k = 0; k < pool.length; k++) {
        const l = pool[(i + k) % pool.length];
        const w = TAB_WORDS[l][i];
        if (used.has(l) || w.toLowerCase() === own[i].toLowerCase()) continue;
        used.add(l); res.push({ i, lang: l, word: w }); break;
      }
    }
    return res;
  }
  const DOOR_ORDER = [2, 4, 0, 3, 1]; // how the five buttons are arranged on the door

  function keysPoster(A) {
    const order = [4, 0, 2, 1, 3]; // alphabetical by key: badges, money, new, review, wishes
    return A.paper('poster wide-paper', [
      A.h('h3', null, A.t('keysTitle')),
      A.P(A.t('keysText'), 'small'),
      A.h('div', { class: 'keycards' }, order.map((i) => A.h('div', { class: 'keycard' },
        A.h('code', null, TAB_KEYS[i]),
        A.h('div', { class: 'kc-words' }, Object.keys(TAB_WORDS).map((l) => A.h('span', { lang: l }, FLAG[l] + ' ' + TAB_WORDS[l][i])))))),
    ]);
  }
  function sqlView(A) {
    const tbl = A.h('table', { class: 'db' },
      A.h('thead', null, A.h('tr', null, ['id', 'type', 'amount', 'category_id', 'description'].map((c) => A.h('th', null, c)))),
      A.h('tbody', null, TX.map((r) => {
        const tr = A.h('tr', { tabindex: '0', title: A.t('rowTip') }, A.h('td', null, String(r[0])), A.h('td', null, r[1]), A.h('td', { class: 'num' }, String(r[2])), A.h('td', null, r[3]), A.h('td', null, A.t('desc.' + r[4])));
        const tog = () => { tr.classList.toggle('mark'); A.sound('tick'); };
        tr.addEventListener('click', tog);
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
        return tr;
      })));
    const cats = A.h('table', { class: 'db' },
      A.h('thead', null, A.h('tr', null, ['id', 'emoji', 'name'].map((c) => A.h('th', null, c)))),
      A.h('tbody', null, CATS.map((c) => A.h('tr', null, A.h('td', null, c[0]), A.h('td', null, c[1]), A.h('td', null, A.t('cat.' + c[2]))))));
    return A.h('div', { class: 'dbwrap' },
      A.h('div', { class: 'term-note' }, A.h('b', null, '🐞 ' + A.t('bugNote')), codeBlock(A, SQL), A.h('button', { class: 'btn small broken-btn', type: 'button', disabled: true }, '▶ ' + A.t('runBroken'))),
      A.h('div', { class: 'sqldict' }, A.h('b', null, '📖 ' + A.t('dictTitle')), A.h('dl', null, A.tl('dict').map((d) => {
        const p = d.split('|');
        return [A.h('dt', null, A.h('code', null, p[0])), A.h('dd', { html: p[1] })];
      }))),
      A.P(A.t('centsNote'), 'hint'),
      A.h('div', { class: 'tbl-wrap' }, A.h('h4', null, 'transactions'), tbl),
      A.h('div', { class: 'tbl-wrap' }, A.h('h4', null, 'categories'), cats),
      A.P(A.t('markTip'), 'hint'));
  }

  E.note('engine.keys', 'engine', (A) => keysPoster(A));
  E.note('engine.sql', 'engine', (A) => A.h('div', null, codeBlock(A, SQL), A.h('div', { class: 'tbl-wrap' }, A.h('table', { class: 'db' }, A.h('tbody', null, TX.map((r) => A.h('tr', null, A.h('td', null, String(r[0])), A.h('td', { class: 'num' }, String(r[2])), A.h('td', null, r[3]))))))));

  E.room({
    id: 'engine', icon: '⚙️', color: 'var(--r3)',
    steps: [
      { id: 'tube', done: (A) => !!(A.f('archive') || A.got('card')) },
      { id: 'archive', done: (A) => !!A.f('archive') },
      { id: 'sql', done: (A) => !!A.f('power') },
      { id: 'door', done: (A) => !!A.f('done') },
    ],
    buggyAt: (A) => (A.f('done') ? { x: 64, y: 86, mood: 'shock' } : A.f('power') ? { x: 88, y: 44, mood: 'angry' } : { x: 88, y: 44 }),
    hintVars: (A) => ({ w: doorWords(A.lang()).sort((a, b) => a.i - b.i).map((x) => x.word).join(' → ') }),
    stageClass: (A) => (A.f('power') ? 'powered' : 'dim'),
    art(A) {
      const tints = ['#16305E', '#1A2B55', '#1C2750', '#20244A', '#141C38'];
      const floors = FLOORS.map((fl, i) => '<rect x="0" y="' + (fl[0] * 3) + '" width="400" height="' + ((fl[1] - fl[0]) * 3) + '" fill="' + tints[i] + '"/><path d="M0 ' + (fl[1] * 3) + 'H400" stroke="#4F9CE8" stroke-opacity=".35" stroke-width="2"/>').join('');
      const cap = A.f('tube') ? 262 : 22;
      const power = !!A.f('power');
      return '<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + floors +
        // tube mail
        '<rect x="13" y="8" width="12" height="284" rx="6" fill="#0B1533" stroke="#4F9CE8" stroke-opacity=".6" stroke-width="2"/>' +
        '<rect x="14" y="' + cap + '" width="10" height="20" rx="5" fill="#F5B323" class="capsule"/>' +
        // screens floor: windows like screens
        '<g opacity=".9"><rect x="150" y="12" width="40" height="30" rx="4" fill="#F5F7FA"/><rect x="154" y="16" width="32" height="8" rx="2" fill="#43CEA2"/><rect x="154" y="28" width="22" height="4" rx="2" fill="#C5CDD8"/></g>' +
        // components: lego bricks
        '<g><rect x="250" y="76" width="30" height="16" rx="2" fill="#FF5D6C"/><rect x="282" y="76" width="30" height="16" rx="2" fill="#4F9CE8"/><rect x="266" y="62" width="30" height="16" rx="2" fill="#F5B323"/></g>' +
        // memory: notepad
        '<g><rect x="250" y="122" width="34" height="34" rx="3" fill="#FFF8E7"/><path d="M256 132h22M256 140h18M256 148h22" stroke="#C9BFA3" stroke-width="3"/></g>' +
        // rules: stove
        '<g><rect x="246" y="186" width="48" height="26" rx="4" fill="#9AA6C0"/><circle cx="260" cy="186" r="7" fill="#FF8A5B" opacity="' + (power ? '1' : '.4') + '"/><circle cx="280" cy="186" r="7" fill="#FF8A5B" opacity="' + (power ? '1' : '.4') + '"/></g>' +
        // database: shelves of files
        '<g><rect x="126" y="226" width="60" height="62" rx="4" fill="' + (A.f('archive') ? '#0B1533' : '#3B4E80') + '"/>' + (A.f('archive') ? '<rect x="132" y="232" width="48" height="52" rx="3" fill="#1A2B55"/>' : '<rect x="132" y="232" width="48" height="52" rx="3" fill="#4A5E94"/><rect x="170" y="252" width="8" height="12" rx="2" fill="#F5B323"/>') + '</g>' +
        '<g><rect x="272" y="236" width="34" height="44" rx="4" fill="#2A3A66"/><path d="M289 244l-7 13h8l-6 13" stroke="' + (power ? '#F5B323' : '#5B6E9E') + '" stroke-width="3" fill="none" stroke-linecap="round"/></g>' +
        doorArt(340, 222, 54, 78, !!A.f('done'), { frame: '#0A1430', leaf: '#2E4A86', panel: '#3B5DA6', light: '#FFE9A8' }) +
        (power && !A.f('done') ? '<g>' + [0, 1, 2, 3, 4].map((i) => '<circle cx="' + (352 + i * 7.5) + '" cy="236" r="2.6" fill="#7FE8C6"/>').join('') + '</g>' : '') +
        '</svg>';
    },
    objects: [
      ...LAYERS.map((ly, i) => ({
        id: 'layer' + i, area: [7, FLOORS[i][0] + (i === 4 ? 3 : 4), 27, 10], chip: (A) => ly.e + ' ' + A.t('layer.' + ly.id), label: (A) => A.t('layer.' + ly.id), quiet: true,
        icon: () => ly.e,
        open(A, ctx) { ctx.body.append(A.P(A.t('layer.' + ly.id + '.what')), A.h('div', { class: 'box rest' }, A.h('b', null, '🍽️ ' + A.t('inRestaurant')), A.h('span', null, A.t('layer.' + ly.id + '.rest')))); },
      })),
      { id: 'panel', e: '🎛️', x: 52, y: 10, wide: true, open(A, ctx) {
        if (A.f('tube')) { ctx.body.append(A.P(A.t('o.panel.done'))); return; }
        ctx.body.append(A.P(A.t('o.panel.text')), A.orderPuzzle({ items: A.tl('order'), onDone: () => travel(A, ctx) }));
      } },
      { id: 'poster', e: '📖', x: 76, y: 9, wide: true, open(A, ctx) { ctx.body.append(keysPoster(A)); A.note('engine.keys'); } },
      { id: 'lego', e: '🧱', x: 56, y: 26, quiet: true, open(A, ctx) {
        if (A.coin('engine')) ctx.body.append(A.h('div', { class: 'item-big', 'aria-hidden': 'true' }, '🪙'), A.P(A.t('o.lego.coin')));
        else ctx.body.append(A.P(A.t('o.lego.text')));
      } },
      { id: 'archive', area: [31, 75, 16, 22], icon: () => '🗄️', badge: (A) => (A.f('archive') ? null : '🪪'), open(A, ctx) {
        ctx.body.append(A.P(A.t(A.f('archive') ? 'o.archive.open' : 'o.archive.text')));
      }, use: {
        card(A, ctx) { A.f('archive', true); A.take('card'); A.sound('unlock'); A.solved('r.engine.archiveOpen'); ctx.redraw(); },
      } },
      { id: 'terminal', e: '💻', x: 54, y: 86, when: (A) => !!A.f('archive'), wide: true, open(A, ctx) { ctx.body.append(sqlView(A)); A.note('engine.sql'); } },
      { id: 'fuse', e: '⚡', x: 72, y: 85, badge: (A) => (A.f('power') ? null : '🔒'), open(A, ctx) {
        if (A.f('power')) { ctx.body.append(A.P(A.t('o.fuse.on'))); return; }
        ctx.body.append(A.P(A.t('o.fuse.text')), A.digitLock({ n: 4, answer: SQL_CODE, label: A.t('o.fuse.lock'), onOpen: () => { A.f('power', true); A.solved('r.engine.powerOn'); ctx.close(); } }));
      } },
      { id: 'door', area: [84, 73, 15, 27], icon: () => '🚪', badge: (A) => (A.f('done') ? null : '🔒'), wide: true, open(A, ctx) {
        if (A.f('done')) { ctx.body.append(A.P(A.t('o.door.openText'))); return; }
        if (!A.f('power')) { ctx.body.append(A.P(A.t('o.door.noPower'))); return; }
        ctx.body.append(A.P(A.t('o.door.text')), langDoor(A));
      } },
    ],
  });

  /** The tube-mail ride after the right order: each layer lights up, then the package arrives. */
  function travel(A, ctx) {
    A.f('tube', true);
    A.refresh();
    const rows = LAYERS.map((ly) => A.h('div', { class: 'pstep' }, A.h('span', { class: 'dot', 'aria-hidden': 'true' }, ly.e), A.h('div', { class: 'txt' }, A.h('b', null, A.t('layer.' + ly.id)))));
    const out = A.h('p', { class: 'result', role: 'status' });
    ctx.body.replaceChildren(A.P(A.t('o.panel.go')), A.h('div', { class: 'pipeline' }, rows), out);
    let i = 0;
    const stepTime = A.reduced() ? 0 : 520;
    (function next() {
      rows.forEach((r, k) => { r.classList.toggle('on', k === i); r.classList.toggle('past', k < i); });
      A.sound('tick');
      if (i < rows.length - 1) { i++; setTimeout(next, stepTime); return; }
      setTimeout(() => {
        out.textContent = A.t('o.panel.arrived');
        A.give('card');
        A.solved('r.engine.tubeDone');
      }, stepTime);
    })();
  }

  function langDoor(A) {
    const words = doorWords(A.lang());
    const box = A.h('div', { class: 'langdoor' });
    const slots = A.h('div', { class: 'ld-slots' });
    const msg = A.h('p', { class: 'lock-msg', role: 'status' });
    let pressed = [];
    function drawSlots() {
      slots.replaceChildren(...[0, 1, 2, 3, 4].map((k) => A.h('span', { class: 'ld-slot' + (pressed[k] != null ? ' on' : '') }, pressed[k] != null ? words.find((w) => w.i === pressed[k]).word : String(k + 1))));
    }
    const pad = A.h('div', { class: 'ld-pad' }, DOOR_ORDER.map((i) => {
      const w = words.find((x) => x.i === i);
      return A.h('button', { class: 'ld-btn', type: 'button', lang: w.lang, onclick: (e) => press(w, e.currentTarget) }, A.h('span', { class: 'ld-flag', 'aria-hidden': 'true' }, FLAG[w.lang]), w.word);
    }));
    function press(w, btn) {
      if (box.classList.contains('open')) return;
      const k = pressed.length;
      if (w.i === k) {
        pressed.push(w.i); drawSlots(); A.sound('right'); btn.disabled = true;
        msg.textContent = '';
        if (pressed.length === 5) {
          box.classList.add('open'); msg.textContent = A.T('ui.lockOpen'); A.sound('unlock');
          setTimeout(() => A.done(), 500);
        }
      } else {
        pressed = []; drawSlots(); A.wrong(); A.shakeEl(slots);
        pad.querySelectorAll('button').forEach((b) => { b.disabled = false; });
        msg.textContent = A.t('o.door.reset');
      }
    }
    drawSlots();
    box.append(A.h('div', { class: 'ld-plate' }, A.t('o.door.plate')), slots, pad, msg);
    return box;
  }

  /* ==================================================================== */
  /* Room 4 – the vault: secret writing, hashing with salt, waiting times */
  /* ==================================================================== */

  const CIPHER = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐸', '🐙'];
  const CIPHER_KEY = 5; // "How many tabs does Sparly have?"
  const DRAWER_CODE = '4296';
  const DRAWER_MSG = DRAWER_CODE.split('').map((d) => CIPHER[(Number(d) + CIPHER_KEY) % 10]);
  const FRUITS = ['🍓', '🍋', '🍇', '🍉', '🍌', '🥝', '🍒', '🍍'];
  const SALT = 7;
  const VAULT_PIN = '3141';
  const PINS = ['1234', '4711', '2580', '9021', '0815', '3141'];
  /** A child-sized hash: easy to compute, hard to turn back. Same PIN + same salt = same smoothie. */
  function toyHash(pin, salt) {
    const p = pin.split('').map(Number);
    return [0, 1, 2, 3].map((i) => FRUITS[(p[i] * 7 + p[(i + 1) % 4] * 3 + salt * (i + 2) + i * 5) % 8]);
  }
  const STORED = toyHash(VAULT_PIN, SALT);
  const DISC_ICON = '<svg class="disc-ico" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#2A2150" stroke="#A78BFA" stroke-width="3"/>' +
    Array.from({ length: 10 }, (_, i) => { const a = (i * 36 - 90) * Math.PI / 180; return '<circle cx="' + (32 + 24 * Math.cos(a)).toFixed(1) + '" cy="' + (32 + 24 * Math.sin(a)).toFixed(1) + '" r="2.6" fill="#F2F6FF"/>'; }).join('') +
    '<circle cx="32" cy="32" r="17" fill="#3D2F73" stroke="#A78BFA" stroke-width="2"/><text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-size="16">🐙</text></svg>';

  function cipherView(A) {
    let r = Number(A.f('shift') || 0);
    const wrap = A.h('div', { class: 'cipher' });
    function draw() {
      const disc = '<svg viewBox="0 0 200 200" class="disc" aria-hidden="true"><circle cx="100" cy="100" r="96" fill="#2A2150" stroke="#A78BFA" stroke-width="3"/>' +
        Array.from({ length: 10 }, (_, d) => {
          const a = (d * 36 - 90) * Math.PI / 180;
          return '<text x="' + (100 + 80 * Math.cos(a)) + '" y="' + (100 + 80 * Math.sin(a)) + '" text-anchor="middle" dominant-baseline="central" class="dd">' + d + '</text>';
        }).join('') +
        '<g class="inner" style="transform: rotate(' + (-r * 36) + 'deg)"><circle cx="100" cy="100" r="62" fill="#3D2F73" stroke="#A78BFA" stroke-width="2"/>' +
        Array.from({ length: 10 }, (_, k) => {
          const a = (k * 36 - 90) * Math.PI / 180;
          return '<text x="' + (100 + 46 * Math.cos(a)) + '" y="' + (100 + 46 * Math.sin(a)) + '" text-anchor="middle" dominant-baseline="central" font-size="18">' + CIPHER[k] + '</text>';
        }).join('') + '</g><circle cx="100" cy="100" r="14" fill="#A78BFA"/></svg>';
      wrap.replaceChildren(
        A.h('div', { class: 'cipher-top' },
          A.h('div', { class: 'svgbox disc-box', html: disc }),
          A.h('div', { class: 'cipher-ctl' },
            A.h('div', { class: 'goal-k' }, A.t('shift')),
            A.h('div', { class: 'shift-row' },
              A.h('button', { class: 'btn small ghost', type: 'button', 'aria-label': A.t('turnLeft'), onclick: () => turn(-1) }, '⟲'),
              A.h('b', { class: 'shift-n num', 'aria-live': 'polite' }, String(r)),
              A.h('button', { class: 'btn small ghost', type: 'button', 'aria-label': A.t('turnRight'), onclick: () => turn(1) }, '⟳')),
            A.P(A.t('o.wheel.sticky'), 'sticky'))),
        A.h('div', { class: 'strip', role: 'table', 'aria-label': A.t('stripAria') },
          A.h('div', { class: 'strip-row', role: 'row' }, A.h('span', { class: 'sk', role: 'rowheader' }, A.t('digit')), Array.from({ length: 10 }, (_, d) => A.h('span', { role: 'cell', class: 'num' }, String(d)))),
          A.h('div', { class: 'strip-row', role: 'row' }, A.h('span', { class: 'sk', role: 'rowheader' }, A.t('animal')), Array.from({ length: 10 }, (_, d) => A.h('span', { role: 'cell', class: DRAWER_MSG.includes(CIPHER[(d + r) % 10]) ? 'hit' : '' }, CIPHER[(d + r) % 10])))));
    }
    function turn(d) { r = (r + d + 10) % 10; A.f('shift', r); A.sound('tick'); draw(); }
    draw();
    return wrap;
  }
  function mixerView(A) {
    const wrap = A.h('div', { class: 'mixer' });
    let salt = Number(A.f('mixSalt') || 0);
    const inp = A.h('input', { type: 'text', id: 'mix-pin', inputmode: 'numeric', maxlength: '4', autocomplete: 'off', placeholder: '0000', 'aria-label': A.t('mixPin') });
    const out = A.h('div', { class: 'mix-out', 'aria-live': 'polite' });
    const saltEl = A.h('b', { class: 'num salt-n' }, String(salt));
    const hist = A.h('div', { class: 'mix-hist' });
    function setSalt(d) { salt = (salt + d + 10) % 10; A.f('mixSalt', salt); saltEl.textContent = String(salt); A.sound('tick'); }
    function drawHist() {
      const list = A.f('mixes') || [];
      hist.replaceChildren(...(list.length ? [A.h('div', { class: 'goal-k' }, A.t('mixHistory'))] : []), ...list.slice().reverse().map((m) => A.h('div', { class: 'mh' + (m.ok ? ' ok' : '') },
        A.h('span', { class: 'num' }, m.pin), A.h('span', null, '🧂' + m.salt), A.h('span', { class: 'fr' }, m.out.join('')), A.h('b', null, m.ok ? '✓' : '✗'))));
    }
    function mix() {
      const pin = inp.value.replace(/\D/g, '');
      if (pin.length !== 4) { out.replaceChildren(A.h('p', { class: 'lock-msg' }, A.t('fourDigits'))); A.shakeEl(inp); return; }
      const res = toyHash(pin, salt);
      const ok = res.join('') === STORED.join('');
      out.replaceChildren(A.h('div', { class: 'blend' + (A.reduced() ? '' : ' spin') }, '🌀'));
      A.sound('whoosh');
      setTimeout(() => {
        out.replaceChildren(
          A.h('div', { class: 'fruits' }, res.map((f, i) => A.h('span', { style: { '--d': (i * 0.08) + 's' } }, f))),
          A.h('div', { class: 'cmp' }, A.h('small', null, A.t('storedShort')), A.h('span', null, STORED.join(''))),
          A.h('p', { class: 'mix-res ' + (ok ? 'ok' : 'no') }, ok ? A.t('mixSame', { pin }) : A.t('mixDiff')));
        const list = (A.f('mixes') || []).filter((m) => !(m.pin === pin && m.salt === salt));
        list.push({ pin, salt, out: res, ok });
        A.f('mixes', list.slice(-12));
        A.note('vault.mixes');
        drawHist();
        if (ok) { A.sound('right'); A.f('found', true); A.sayKey('r.vault.mixFound', 'shock'); } else A.sound('click');
      }, A.reduced() ? 50 : 900);
    }
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') mix(); });
    wrap.append(
      A.h('div', { class: 'mix-in' },
        A.h('label', { for: 'mix-pin' }, A.t('mixPin')), inp,
        A.h('div', { class: 'salt' }, A.h('span', null, '🧂 ' + A.t('salt')),
          A.h('button', { class: 'btn small ghost', type: 'button', 'aria-label': A.t('saltLess'), onclick: () => setSalt(-1) }, '−'), saltEl,
          A.h('button', { class: 'btn small ghost', type: 'button', 'aria-label': A.t('saltMore'), onclick: () => setSalt(1) }, '+')),
        A.h('button', { class: 'btn gold', type: 'button', onclick: mix }, '🥤 ' + A.t('mix'))),
      out, hist);
    drawHist();
    return wrap;
  }
  function storedView(A) {
    return A.h('div', { class: 'tbl-wrap' }, A.h('h4', null, 'profiles'), A.h('table', { class: 'db' },
      A.h('thead', null, A.h('tr', null, ['id', 'name', 'pin_salt', 'pin_hash'].map((c) => A.h('th', null, c)))),
      A.h('tbody', null, A.h('tr', null, A.h('td', null, '7'), A.h('td', null, '🔐 ' + A.t('vaultName')), A.h('td', { class: 'num' }, String(SALT)), A.h('td', { class: 'fr' }, STORED.join(''))))));
  }
  function pinList(A) {
    return A.paper('note-paper', [A.h('b', null, '🐞 ' + A.t('pinListTitle')), A.h('ul', { class: 'pinlist' }, PINS.map((p) => A.h('li', { class: 'num' }, p)))]);
  }

  E.note('vault.poster', 'vault', (A) => A.h('ol', { class: 'rules' }, A.tl('posterList').map((x) => A.h('li', { html: x }))));
  E.note('vault.stored', 'vault', (A) => storedView(A));
  E.note('vault.pins', 'vault', (A) => pinList(A));
  E.note('vault.mixes', 'vault', (A) => A.h('div', { class: 'mix-hist' }, (A.f('mixes') || []).map((m) => A.h('div', { class: 'mh' + (m.ok ? ' ok' : '') }, A.h('span', { class: 'num' }, m.pin), A.h('span', null, '🧂' + m.salt), A.h('span', { class: 'fr' }, m.out.join('')), A.h('b', null, m.ok ? '✓' : '✗')))));
  E.note('vault.secret', 'vault', (A) => A.h('div', null, A.h('div', { class: 'secret' }, DRAWER_MSG.join(' ')), A.P(A.t('o.wheel.sticky'), 'hint')));

  E.room({
    id: 'vault', icon: '🔐', color: 'var(--r4)',
    steps: [
      { id: 'drawer', done: (A) => !!A.f('drawer') },
      { id: 'pin', done: (A) => !!A.f('done') },
    ],
    onEnter(A) { A.note('vault.secret'); },
    buggyAt: (A) => (A.f('done') ? { x: 46, y: 80, mood: 'sad' } : { x: 51, y: 15 }),
    art(A) {
      const open = !!A.f('done');
      const rivets = Array.from({ length: 12 }, (_, i) => '<circle cx="' + (12 + i * 34) + '" cy="10" r="2.5"/>').join('');
      const spokes = [0, 60, 120].map((a) => '<rect x="306" y="88" width="10" height="88" rx="5" fill="#C9CEDF" transform="rotate(' + a + ' 311 132)"/>').join('');
      return '<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
        '<linearGradient id="a4w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2357"/><stop offset="1" stop-color="#1D173E"/></linearGradient>' +
        '<radialGradient id="a4v" cx=".4" cy=".35"><stop offset="0" stop-color="#C9CEDF"/><stop offset="1" stop-color="#7E86A6"/></radialGradient>' +
        '<radialGradient id="a4o"><stop offset="0" stop-color="#FFF3C4"/><stop offset="1" stop-color="#F5B323"/></radialGradient></defs>' +
        '<rect width="400" height="300" fill="url(#a4w)"/><g fill="#A78BFA" opacity=".25">' + rivets + '</g>' +
        '<g stroke="#A78BFA" stroke-opacity=".12" stroke-width="2"><path d="M0 60H230M0 120H230M0 180H230"/></g>' +
        '<rect y="246" width="400" height="54" fill="#15102E"/><ellipse cx="150" cy="272" rx="110" ry="16" fill="#3D2F73" opacity=".7"/>' +
        // poster
        '<rect x="18" y="26" width="70" height="98" rx="4" fill="#FFF8E7"/><text x="53" y="58" text-anchor="middle" font-size="22">🔒</text><g fill="#C9BFA3"><rect x="28" y="76" width="50" height="4" rx="2"/><rect x="28" y="86" width="42" height="4" rx="2"/><rect x="28" y="96" width="50" height="4" rx="2"/><rect x="28" y="106" width="36" height="4" rx="2"/></g>' +
        // desk with drawer and the secret message on it
        '<rect x="62" y="152" width="164" height="9" rx="3" fill="#6B5BB5"/><rect x="70" y="161" width="7" height="85" fill="#4C3F8F"/><rect x="212" y="161" width="7" height="85" fill="#4C3F8F"/>' +
        '<rect x="96" y="172" width="90" height="44" rx="5" fill="#4C3F8F"/><rect x="102" y="178" width="78" height="32" rx="4" fill="' + (A.f('drawer') ? '#1D173E' : '#5D4FA8') + '"/>' +
        (A.f('drawer') ? '<rect x="108" y="184" width="40" height="22" rx="2" fill="#FFF8E7" transform="rotate(-6 128 195)"/>' : '<text x="141" y="196" text-anchor="middle" dominant-baseline="central" font-size="12">' + DRAWER_MSG.join('') + '</text>') +
        // vault door
        (open
          ? '<circle cx="311" cy="132" r="92" fill="#120E26"/><circle cx="311" cy="132" r="80" fill="url(#a4o)" class="door-light"/><g transform="translate(-150 0)" opacity=".95"><circle cx="311" cy="132" r="22" fill="#7E86A6"/></g>'
          : '<circle cx="311" cy="132" r="92" fill="#4A4F6E"/><circle cx="311" cy="132" r="80" fill="url(#a4v)" stroke="#5B6280" stroke-width="4"/><circle cx="311" cy="132" r="56" fill="none" stroke="#9EA6C2" stroke-width="3"/>' + spokes + '<circle cx="311" cy="132" r="16" fill="#5B6280"/>' +
            '<rect x="356" y="196" width="34" height="42" rx="5" fill="#1D173E"/><g fill="#A78BFA">' + [0, 1, 2].map((rr) => [0, 1, 2].map((c) => '<rect x="' + (361 + c * 9) + '" y="' + (202 + rr * 10) + '" width="6" height="6" rx="1.5"/>').join('')).join('') + '</g>') +
        '</svg>';
    },
    objects: [
      { id: 'poster', area: [4, 8, 19, 34], icon: () => '📜', open(A, ctx) {
        ctx.body.append(A.paper('poster', [A.h('h3', null, A.t('posterTitle')), A.h('ol', { class: 'rules' }, A.tl('posterList').map((x) => A.h('li', { html: x })))]));
        A.note('vault.poster');
      } },
      { id: 'wheel', e: (A) => A.svg(DISC_ICON), icon: () => '🔄', x: 20, y: 46, wide: true, open(A, ctx) {
        ctx.body.append(A.P(A.t('o.wheel.text')), A.h('div', { class: 'secret', 'aria-label': A.t('secretAria') }, DRAWER_MSG.join(' ')), cipherView(A));
        A.note('vault.secret');
      } },
      { id: 'monitor', e: '🖥️', x: 31, y: 43, open(A, ctx) { ctx.body.append(A.P(A.t('o.monitor.text')), storedView(A), A.P(A.t('o.monitor.after'), 'hint')); A.note('vault.stored'); } },
      { id: 'mixer', e: '🥤', x: 47, y: 44, wide: true, open(A, ctx) { ctx.body.append(A.P(A.t('o.mixer.text')), mixerView(A)); } },
      { id: 'drawer', area: [23, 56, 25, 17], icon: () => '🗃️', badge: (A) => (A.f('drawer') ? null : '🔒'), open(A, ctx) {
        if (A.f('drawer')) { ctx.body.append(A.P(A.t('o.drawer.open')), pinList(A)); A.note('vault.pins'); return; }
        ctx.body.append(A.P(A.t('o.drawer.text')), A.h('div', { class: 'secret' }, DRAWER_MSG.join(' ')), A.digitLock({ n: 4, answer: DRAWER_CODE, label: A.t('o.drawer.lock'), onOpen: () => {
          A.f('drawer', true); A.solved('r.vault.drawerOpen'); ctx.redraw(); A.note('vault.pins');
        } }));
      } },
      { id: 'cactus', e: '🌵', x: 8, y: 80, quiet: true, open(A, ctx) {
        if (A.coin('vault')) ctx.body.append(A.h('div', { class: 'item-big', 'aria-hidden': 'true' }, '🪙'), A.P(A.t('o.cactus.coin')));
        else ctx.body.append(A.P(A.t('o.cactus.text')));
      } },
      { id: 'vault', area: [56, 10, 42, 78], icon: () => '🔐', badge: (A) => (A.f('done') ? null : '🔒'), open(A, ctx) {
        if (A.f('done')) { ctx.body.append(A.P(A.t('o.vault.openText'))); return; }
        ctx.body.append(A.P(A.t('o.vault.text')), A.keypad({ api: A, n: 4, answer: VAULT_PIN, store: 'pin', onOpen: () => A.done() }),
          A.h('details', { class: 'tiers' }, A.h('summary', null, A.t('tiersTitle')), A.h('div', { class: 'tier' }, A.tl('tiers').map((x) => { const p = x.split('|'); return [A.h('div', null, p[0]), A.h('div', null, p[1])]; }))));
      } },
    ],
  });

  /* ==================================================================== */
  /* Room 5 – the test lab: bug hunt, dark mode, screen reader, release   */
  /* ==================================================================== */

  const TESTS = [['12', 1200], ['3,50', 350], ['0,99', 99], ['7', 700]];
  const FIXES = [
    { code: 'Math.round(parseFloat(text) * 1000)', fn: (s) => Math.round(parseFloat(s) * 1000) },
    { code: "Math.round(parseFloat(text.replace(',', '.')) * 100)", fn: (s) => Math.round(parseFloat(s.replace(',', '.')) * 100), right: true },
    { code: 'Math.round(parseFloat(text))', fn: (s) => Math.round(parseFloat(s)) },
  ];
  const BUGGY_FN = (s) => Math.round(parseFloat(s) * 100);
  const RELEASE = [{ e: '📝' }, { e: '🧪' }, { e: '🔢' }, { e: '🔨' }, { e: '📤' }, { e: '🧐' }, { e: '📲' }];
  const PANEL_ORDER = [3, 0, 5, 2, 6, 1, 4];
  const VERSION_CODE = 5;

  function testsView(A, ctx) {
    const wrap = A.h('div', { class: 'testlab' });
    let last = null;
    function fn() { const f = A.f('fix'); return f == null ? BUGGY_FN : FIXES[f].fn; }
    function src() {
      const f = A.f('fix');
      return 'function toCents(text) {\n  return ' + (f == null ? 'Math.round(parseFloat(text) * 100)' : FIXES[f].code) + ';\n}';
    }
    function run() {
      A.sound('click');
      last = TESTS.map((tc) => { const got = fn()(tc[0]); return { inp: tc[0], want: tc[1], got, ok: got === tc[1] }; });
      const green = last.every((r) => r.ok);
      if (green && !A.f('green')) {
        A.f('green', true);
        A.solved('r.lab.caught');
        A.confetti(120);
      } else if (!green) A.sound('wrong');
      draw();
    }
    function draw() {
      const green = last && last.every((r) => r.ok);
      wrap.replaceChildren(
        A.h('pre', { class: 'code' }, src()),
        A.h('div', { class: 'tests' }, TESTS.map((tc, i) => {
          const r = last && last[i];
          return A.h('div', { class: 'test ' + (r ? (r.ok ? 'pass' : 'fail') : '') },
            A.h('span', { class: 'tdot', 'aria-hidden': 'true' }),
            A.h('code', null, "toCents('" + tc[0] + "')"),
            A.h('span', null, r ? (r.ok ? A.t('expectOk', { w: tc[1] }) : A.t('expectFail', { w: tc[1], g: Number.isNaN(r.got) ? 'NaN' : r.got })) : A.t('expect', { w: tc[1] })));
        })),
        A.h('div', { class: 'lock-btns' }, A.h('button', { class: 'btn gold', type: 'button', onclick: run }, '▶ ' + A.t('runTests'))),
        last ? A.h('p', { class: 'lock-msg ' + (green ? 'ok' : ''), role: 'status' }, green ? A.t('allGreen') : A.f('fix') != null && !FIXES[A.f('fix')].right ? A.t('tryOther') : A.t('someRed')) : null,
        last && !green ? A.h('div', { class: 'fixes' }, A.h('div', { class: 'goal-k' }, A.t('pickFix')), FIXES.map((fx, i) => A.h('button', {
          class: 'fix' + (A.f('fix') === i ? ' on' : ''), type: 'button', onclick: () => { A.f('fix', i); last = null; A.sound('click'); draw(); wrap.querySelector('.tests').insertAdjacentElement('afterend', A.h('p', { class: 'lock-msg', role: 'status' }, A.t('fixIn'))); },
        }, A.h('code', null, fx.code), A.h('small', null, A.t('fixWhy.' + i))))) : null);
    }
    if (A.f('green')) { A.f('fix', 1); last = TESTS.map((tc) => ({ inp: tc[0], want: tc[1], got: tc[1], ok: true })); }
    draw();
    ctx.body.append(A.P(A.t('o.monitor.text')), wrap);
  }

  function speak(A, text) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = (A.LANGS.find((l) => l.code === A.lang()) || {}).locale || 'en-US';
      window.speechSynthesis.speak(u);
    } catch { /* speech not available */ }
  }

  function portalView(A, ctx) {
    const wrap = A.h('div', { class: 'portal-panel' });
    let seq = [];
    const caption = A.h('div', { class: 'caption', 'aria-live': 'polite' });
    const msg = A.h('p', { class: 'lock-msg', role: 'status' });
    const extra = A.h('div', { class: 'portal-extra' });
    const reader = !!A.f('reader');
    const btns = {};
    function draw() {
      wrap.replaceChildren(
        A.h('div', { class: 'pp-grid' }, PANEL_ORDER.map((i) => {
          const done = seq.includes(i);
          const b = A.h('button', { class: 'pp-btn' + (done ? ' lit' : ''), type: 'button', 'aria-label': reader ? A.t('rel.' + i) : A.t('unlabeled'), onclick: () => press(i, b) },
            A.h('span', { class: 'pp-e', 'aria-hidden': 'true' }, RELEASE[i].e), done ? A.h('span', { class: 'pp-n' }, String(seq.indexOf(i) + 1)) : null);
          btns[i] = b;
          return A.h('div', { class: 'pp-cell' }, b, reader ? A.h('button', { class: 'pp-read', type: 'button', 'aria-label': A.t('readAloud') + ': ' + A.t('rel.' + i), onclick: () => { caption.textContent = '🔊 ' + A.t('rel.' + i); speak(A, A.t('rel.' + i)); A.sound('click'); } }, '🔊') : null);
        })),
        caption, msg, extra);
      if (!reader) caption.textContent = A.t('noLabels');
    }
    function press(i, b) {
      if (A.f('done')) return;
      const next = seq.length;
      if (i === next) {
        if (i === 1 && !A.f('green')) { A.sound('wrong'); msg.className = 'lock-msg'; msg.textContent = A.t('testsRed'); A.shakeEl(b); return; }
        if (i === 2 && A.f('vcode') !== true) { askVersion(); return; }
        accept(i);
      } else {
        seq = []; A.wrong(); msg.className = 'lock-msg'; msg.textContent = A.t('wrongOrder'); draw(); extra.replaceChildren();
      }
    }
    function accept(i) {
      seq.push(i); A.sound('right'); msg.className = 'lock-msg ok'; msg.textContent = A.t('relOk.' + i); draw();
      if (seq.length === RELEASE.length) { A.sound('whoosh'); setTimeout(() => A.done(), 700); }
    }
    function askVersion() {
      extra.replaceChildren(A.h('div', { class: 'vbox' }, A.P(A.t('versionAsk')), A.digitLock({ n: 1, answer: String(VERSION_CODE + 1), label: A.t('versionLabel'), button: A.T('ui.next'), onWrong: (v) => {
        A.toast(Number(v) <= VERSION_CODE ? A.t('versionLow') : A.t('versionHigh'));
      }, onOpen: () => { A.f('vcode', true); extra.replaceChildren(); accept(2); } })));
    }
    draw();
    ctx.body.append(A.P(A.t('o.portal.text')), wrap);
  }

  E.note('lab.version', 'lab', (A) => A.h('div', { class: 'glow-note' }, 'Version 1.0.4 · versionCode ' + VERSION_CODE));

  E.room({
    id: 'lab', icon: '🧪', color: 'var(--r5)',
    steps: [
      { id: 'tests', done: (A) => !!A.f('green') },
      { id: 'reader', done: (A) => !!A.f('reader') },
      { id: 'dark', done: (A) => !!A.f('version') },
      { id: 'portal', done: (A) => !!A.f('done') },
    ],
    stageClass: (A) => 'lab' + (A.f('dark') ? ' dark' : ''),
    buggyAt: (A) => (A.f('green') ? { x: 56, y: 75, mood: A.f('done') ? 'sad' : 'angry', cls: 'jailed', s: 0.8 } : { x: 31, y: 15 }),
    buggyLine: (A) => (A.f('green') ? 'r.lab.jailed' : 'bug.poke'),
    art(A) {
      const dark = !!A.f('dark');
      const wall = dark ? '#0F172A' : '#E3EEF7'; const tile = dark ? '#1E293B' : '#CFDDEA'; const floor = dark ? '#111827' : '#B9CADB';
      const tiles = Array.from({ length: 10 }, (_, i) => '<path d="M' + (i * 40) + ' 0V232"/>').join('') + Array.from({ length: 6 }, (_, i) => '<path d="M0 ' + (i * 40) + 'H400"/>').join('');
      const open = !!A.f('done');
      return '<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
        '<radialGradient id="a5p"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#7FE8C6"/><stop offset="1" stop-color="#4F9CE8"/></radialGradient>' +
        '<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
        '<rect width="400" height="300" fill="' + wall + '"/><g stroke="' + tile + '" stroke-width="2">' + tiles + '</g>' +
        '<rect y="232" width="400" height="68" fill="' + floor + '"/>' +
        // lab bench
        '<rect x="40" y="170" width="150" height="10" rx="3" fill="' + (dark ? '#334155' : '#8FA3B8') + '"/><rect x="48" y="180" width="8" height="52" fill="' + (dark ? '#1E293B' : '#7A8FA6') + '"/><rect x="174" y="180" width="8" height="52" fill="' + (dark ? '#1E293B' : '#7A8FA6') + '"/>' +
        // poster: blank in light mode, glowing in the dark
        '<rect x="210" y="28" width="76" height="84" rx="4" fill="' + (dark ? '#1E293B' : '#FFFFFF') + '" stroke="' + (dark ? '#334155' : '#D5E0EA') + '" stroke-width="2"/>' +
        (dark ? '<g filter="url(#glow)" fill="#7FE8C6" font-family="JetBrains Mono, monospace" text-anchor="middle"><text x="248" y="58" font-size="11">Version</text><text x="248" y="76" font-size="15" font-weight="700">1.0.4</text><text x="248" y="96" font-size="9">versionCode ' + VERSION_CODE + '</text></g>' : '') +
        // light switch plate
        '<rect x="180" y="118" width="16" height="24" rx="3" fill="' + (dark ? '#334155' : '#FFFFFF') + '" stroke="' + (dark ? '#475569' : '#B7C7D6') + '"/>' +
        // bug trap jar (after the tests are green)
        (A.f('green') ? '<g><path d="M204 206h40v52a8 8 0 0 1-8 8h-24a8 8 0 0 1-8-8z" fill="#BFE3F5" fill-opacity=".25" stroke="#7FB6D6" stroke-width="2.4"/><rect x="202" y="198" width="44" height="9" rx="3" fill="#34D399"/></g>' : '') +
        // portal
        '<g class="portal' + (open ? ' open' : '') + '"><circle cx="340" cy="140" r="66" fill="' + (dark ? '#0B1533' : '#2B3F6E') + '"/><circle cx="340" cy="140" r="56" fill="url(#a5p)" opacity="' + (open ? '1' : '.35') + '" class="portal-core"/>' +
        '<g class="portal-ring"><circle cx="340" cy="140" r="62" fill="none" stroke="#7FE8C6" stroke-width="5" stroke-dasharray="22 14" stroke-linecap="round"/></g></g>' +
        '<rect x="300" y="216" width="80" height="22" rx="6" fill="' + (dark ? '#1E293B' : '#2B3F6E') + '"/><g fill="#F5B323">' + [0, 1, 2, 3, 4, 5, 6].map((i) => '<circle cx="' + (310 + i * 10) + '" cy="227" r="3"/>').join('') + '</g>' +
        '</svg>';
    },
    objects: [
      { id: 'monitor', e: '🖥️', x: 22, y: 44, wide: true, badge: (A) => (A.f('green') ? '✅' : '❌'), open: testsView },
      { id: 'robot', e: '🤖', x: 36, y: 72, open(A, ctx) {
        if (!A.f('green')) { ctx.body.append(A.P(A.t('o.robot.text'))); return; }
        if (!A.got('speaker')) { ctx.body.append(A.P(A.t('o.robot.give')), A.h('div', { class: 'item-big', 'aria-hidden': 'true' }, '🔊')); A.give('speaker'); return; }
        ctx.body.append(A.P(A.t('o.robot.after')));
      } },
      { id: 'switch', e: (A) => (A.f('dark') ? '☀️' : '🌙'), x: 47, y: 43, label: (A) => A.t(A.f('dark') ? 'o.switch.toLight' : 'o.switch.toDark'), open(A, ctx) {
        const dark = !A.f('dark');
        A.f('dark', dark);
        A.sound(dark ? 'whoosh' : 'click');
        ctx.body.append(A.h('div', { class: 'item-big', 'aria-hidden': 'true' }, dark ? '🌙' : '☀️'), A.P(A.t(dark ? 'o.switch.dark' : 'o.switch.light')));
        if (dark && !A.f('sawDark')) { A.f('sawDark', true); A.sayKey('r.lab.darkOn', 'shock'); }
        A.refresh();
      } },
      { id: 'poster', area: [51.5, 8.5, 20, 30], icon: () => '📜', open(A, ctx) {
        if (!A.f('dark')) { ctx.body.append(A.P(A.t('o.poster.blank'))); return; }
        ctx.body.append(A.h('div', { class: 'glow-note big' }, A.h('span', null, 'Version 1.0.4'), A.h('span', null, 'versionCode ' + VERSION_CODE)), A.P(A.t('o.poster.dark')));
        if (!A.f('version')) { A.f('version', true); A.note('lab.version'); A.solved('r.lab.versionFound'); }
      } },
      { id: 'portal', area: [68, 20, 30, 62], icon: () => '🌀', wide: true, badge: (A) => (A.f('done') ? null : '🌀'), open: portalView, use: {
        speaker(A, ctx) {
          if (A.f('reader')) { A.toast(A.t('readerAlready')); return; }
          A.f('reader', true); A.sound('right'); A.solved('r.lab.readerOn'); ctx.redraw();
        },
      } },
      { id: 'microscope', e: '🔬', x: 9, y: 50, quiet: true, open(A, ctx) {
        if (A.coin('lab')) ctx.body.append(A.h('div', { class: 'item-big', 'aria-hidden': 'true' }, '🪙'), A.P(A.t('o.microscope.coin')));
        else ctx.body.append(A.P(A.t('o.microscope.text')));
      } },
    ],
  });
})();
