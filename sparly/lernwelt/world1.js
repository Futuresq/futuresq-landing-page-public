/* World 1 – what Sparly does (features). All texts come from lang/*.js. */
(function () {
  'use strict';
  const L = window.Lern;
  const { h, svg, money, app } = L;
  const R = String.raw;

  /* ---------- Shared phone mock-up (also used by worlds 2 and 3) ---------- */
  function phone(content, tabs, extraClass) {
    return h('div', { class: 'phone' + (extraClass ? ' ' + extraClass : '') },
      h('div', { class: 'screen' }, h('div', { class: 'notch' }, h('i')), content, tabs || null));
  }
  const TABS = [
    { k: 'money', e: '💰' }, { k: 'review', e: '📊' }, { k: 'new', e: '➕', plus: true }, { k: 'wishes', e: '⭐' }, { k: 'badges', e: '🏆' },
  ];
  function tabBar(active, onPick, code) {
    const bar = h('div', { class: 'ph-tabs', role: 'tablist', 'aria-label': 'Tabs' });
    TABS.forEach((tb) => bar.append(h('button', {
      class: 'ph-tab' + (tb.plus ? ' plus' : ''), type: 'button', role: 'tab', 'aria-selected': String(tb.k === active),
      onclick: onPick ? () => onPick(tb.k) : null,
    }, h('span', { 'aria-hidden': 'true' }, tb.e), app('tabs.' + tb.k, null, code))));
    return bar;
  }
  function phRow(e, title, sub, amount, inc, code) {
    return h('div', { class: 'ph-row' },
      h('span', { class: 'e', 'aria-hidden': 'true' }, e),
      h('span', { class: 't' }, title, sub ? h('small', null, sub) : null),
      amount != null ? h('span', { class: 'a ' + (inc ? 'in' : 'out') }, (inc ? '+' : '−') + money(amount, false, code)) : null);
  }
  /** The money tab, in the page language or in `code` (for the language demo). */
  function dashboard(code) {
    const day = (d) => L.datef(new Date(2026, 9, d), { weekday: 'long' }, code);
    return h('div', { class: 'body' },
      h('div', { class: 'ph-hello' }, h('span', { 'aria-hidden': 'true' }, L.avatar()),
        h('div', null, app('dashboard.greeting', { name: L.name() }, code), h('small', null, app('dashboard.welcome_back', null, code)))),
      h('div', { class: 'ph-card' },
        h('small', null, app('dashboard.your_money', null, code)),
        h('b', { class: 'num' }, money(14550, false, code)),
        h('div', { class: 'ph-btns' }, h('span', null, app('dashboard.income', null, code)), h('span', null, app('dashboard.expense', null, code)))),
      h('div', { class: 'ph-h' }, app('dashboard.recent_expenses', null, code)),
      phRow('🎮', L.t('mock.videogame'), day(12), 2500, false, code),
      phRow('🍿', L.t('mock.icecream'), day(6), 450, false, code),
      h('div', { class: 'ph-h' }, app('dashboard.daily_tip', null, code)),
      h('div', { class: 'ph-row' }, h('span', { class: 't', style: { whiteSpace: 'normal' } }, L.raw('app.tips', code)[0])));
  }
  L.phone = phone; L.tabBar = tabBar; L.phRow = phRow; L.dashboard = dashboard;

  /* ---------- Shared savings battery (like PlayfulViz in the app) ---------- */
  function battery() {
    const el = h('div', { style: { display: 'grid', gap: '8px', justifyItems: 'center' } });
    const art = svg('<svg viewBox="0 0 200 64" width="220" style="max-width:100%" role="img" aria-label="' + L.esc(app('review.your_savings')) + '"><rect x="3" y="7" width="176" height="50" rx="10" fill="none" stroke-width="4" class="bat-frame"/><rect x="182" y="22" width="12" height="20" rx="3" class="bat-tip"/><g class="bat-segs"></g><text x="91" y="40" text-anchor="middle" font-size="18" font-weight="800" class="bat-pct" style="font-family: var(--f-display)">0 %</text></svg>');
    const emoji = h('div', { style: { fontSize: '34px', lineHeight: '1' }, 'aria-hidden': 'true' }, '🔌');
    const msg = h('div', { style: { fontWeight: '800', textAlign: 'center' } });
    el.append(emoji, art, msg);
    const segs = art.querySelector('.bat-segs');
    for (let i = 0; i < 10; i++) segs.append(svg('<svg><rect x="' + (10 + i * 16.6) + '" y="14" width="13.6" height="36" rx="3"/></svg>').firstElementChild);
    let raf = 0;
    function paint(v) {
      const pct = Math.round(v);
      const fill = pct >= 50 ? 'var(--green)' : pct >= 20 ? 'var(--gold)' : 'var(--red)';
      art.querySelector('.bat-frame').style.stroke = fill;
      art.querySelector('.bat-tip').style.fill = fill;
      const n = Math.round((Math.max(0, pct) / 100) * 10);
      Array.from(segs.children).forEach((r, i) => { r.style.fill = i < n ? fill : 'var(--bg-deep)'; });
      const label = art.querySelector('.bat-pct');
      label.textContent = L.numf(pct) + ' %';
      label.style.fill = 'var(--ink)';
      emoji.textContent = pct >= 75 ? '⚡' : pct >= 50 ? '🔋' : pct >= 10 ? '💪' : pct > 0 ? '🪫' : '🔌';
    }
    el.set = function (rate, income) {
      const target = Math.min(Math.max(rate, 0), 100);
      msg.textContent = income === 0 && rate === 0 ? app('review.no_data') : rate >= 10 ? app('review.saving_great') : rate > 0 ? app('review.saving_some') : app('review.spending_more');
      msg.style.color = rate >= 10 ? 'var(--green)' : rate > 0 ? 'var(--gold-ink)' : 'var(--red)';
      cancelAnimationFrame(raf);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { paint(target); return; }
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 1200);
        paint(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    return el;
  }
  L.battery = battery;

  function counter(el, from, to, fmt) {
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 500);
      el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  L.counter = counter;

  function chipGroup(values, current, label, onPick) {
    const g = h('div', { class: 'cat-grid', role: 'group', 'aria-label': label || null });
    values.forEach((v) => g.append(h('button', { class: 'chip', type: 'button', 'aria-pressed': String(v[0] === current), onclick: (e) => {
      g.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      e.currentTarget.setAttribute('aria-pressed', 'true');
      L.sound('click');
      onPick(v[0]);
    } }, v[1])));
    return g;
  }
  L.chipGroup = chipGroup;

  /* ======================================================================
     Station 1 – This is Sparly
     ====================================================================== */
  L.defineStation({
    id: 'start', world: 1,
    learn(el, api) {
      api.blocks(el, {
        pro: () => api.pro('tabs', R`const TAB_CONFIG = {
  DashboardTab: { emoji: '💰', labelKey: 'tabs.money' },   // 💰 ` + app('tabs.money') + R`
  ReviewTab:    { emoji: '📊', labelKey: 'tabs.review' },  // 📊 ` + app('tabs.review') + R`
  NewButton:    { emoji: '➕',       labelKey: 'tabs.new' },     // ➕ ` + app('tabs.new') + R`
  WishesTab:    { emoji: '⭐',       labelKey: 'tabs.wishes' },  // ⭐ ` + app('tabs.wishes') + R`
  BadgesTab:    { emoji: '🏆', labelKey: 'tabs.badges' },  // 🏆 ` + app('tabs.badges') + R`
};`),
      });
    },
    play(el, api) {
      const visited = new Set();
      const holder = h('div');
      const infoT = h('h3');
      const infoP = h('p');
      const chips = h('div', { class: 'cat-grid' });
      function screenFor(k) {
        if (k === 'money') return dashboard();
        if (k === 'review') {
          const bars = h('div', { class: 'ph-bars', 'aria-hidden': 'true' });
          [[60, 30], [40, 55], [80, 25], [50, 35]].forEach((p) => bars.append(h('i', { style: { height: p[0] + '%', background: 'var(--ph-income)' } }), h('i', { style: { height: p[1] + '%', background: 'var(--ph-expense)' } })));
          return h('div', { class: 'body' }, h('div', { class: 'ph-h', style: { fontSize: '1.1rem' } }, app('review.title')),
            h('div', { style: { display: 'flex', gap: '4px', fontSize: '.7rem', fontWeight: '800', flexWrap: 'wrap' } }, ['week', 'month', 'year', 'all_time'].map((x, i) => h('span', { style: { padding: '3px 8px', borderRadius: '8px', background: i === 1 ? 'var(--ph-grad-a)' : 'var(--ph-surface)', color: i === 1 ? '#fff' : 'var(--ph-ink)' } }, app('review.' + x)))),
            h('div', { class: 'ph-row', style: { justifyContent: 'center', fontSize: '.9rem' } }, '🔋 ' + app('review.your_savings') + ': 54 %'),
            h('div', { class: 'ph-h' }, app('review.income_vs_expense')), bars);
        }
        if (k === 'new') {
          return h('div', { class: 'body', style: { background: 'rgba(0,0,0,.35)', justifyContent: 'flex-end', paddingBottom: '10px' } },
            h('div', { class: 'ph-menu', style: { background: 'var(--ph-bg)', padding: '12px', borderRadius: '18px' } },
              h('div', { class: 'ph-h', style: { textAlign: 'center' } }, app('newMenu.title')),
              h('div', null, h('span', null, '💵'), app('newMenu.income')),
              h('div', null, h('span', null, '🛒'), app('newMenu.expense')),
              h('div', null, h('span', null, '⭐'), app('newMenu.wish'))));
        }
        if (k === 'wishes') {
          const wish = (e, n, price, pct) => h('div', { class: 'ph-wish' }, h('div', { class: 'row1' }, h('span', null, e + ' ' + n), h('span', null, money(price))), h('div', { class: 'ph-prog' }, h('i', { style: { width: pct + '%' } })), h('small', { style: { color: 'var(--ph-muted)' } }, L.t('mock.affordable', { n: pct })));
          return h('div', { class: 'body' }, h('div', { class: 'ph-h', style: { fontSize: '1.1rem' } }, app('wishes.title')),
            wish('⚽', L.t('mock.football'), 3000, 100), wish('🧱', L.t('mock.lego'), 6000, 75), wish('🎧', L.t('mock.headphones'), 8900, 40));
        }
        const em = ['💵', '🦊', '🎯', '💭', '⭐', '📒', '🏦', '💎', '👑', '🃏', '📸', '📋', '💪', '🦸', '🏅', '🏆'];
        return h('div', { class: 'body' }, h('div', { class: 'ph-h', style: { fontSize: '1.1rem' } }, app('badges.title')), h('small', { style: { color: 'var(--ph-muted)', fontWeight: '700' } }, app('badges.earned_count', { earned: 5, total: 23 })),
          h('div', { class: 'ph-grid', 'aria-hidden': 'true' }, em.map((e, i) => h('div', { class: [0, 1, 3, 4, 14].includes(i) ? '' : 'off' }, e))));
      }
      function show(k, silent) {
        visited.add(k);
        holder.replaceChildren(phone(screenFor(k), tabBar(k, (x) => show(x))));
        infoT.textContent = app('tabs.' + k);
        infoP.textContent = api.t('info.' + k);
        chips.replaceChildren(...TABS.map((tb) => h('span', { class: 'chip', 'aria-pressed': String(visited.has(tb.k)), style: { cursor: 'default' } }, tb.e + ' ' + app('tabs.' + tb.k))));
        if (!silent) L.sound('click');
        if (visited.size === 5) api.challenge(holder);
      }
      el.append(h('div', { class: 'split' }, holder,
        h('div', { class: 'panel' }, infoT, infoP, h('div', { class: 'mini-label' }, api.t('ui.visited')), chips,
          h('p', { class: 'hint', style: { marginTop: '12px' } }, L.t('ui.mockNote')))));
      show('money', true);
    },
    quiz: [{ a: 1 }, { a: 1 }, { type: 'tf', a: false }, { a: 1 }],
  });

  /* ======================================================================
     Station 2 – Money in, money out
     ====================================================================== */
  const INCOME_CATS = [['💰', 'allowance'], ['🎁', 'gift'], ['🎂', 'birthday'], ['💪', 'earned'], ['📦', 'other']];
  const EXPENSE_CATS = [['🍿', 'sweets'], ['🎮', 'toys'], ['👕', 'clothing'], ['📚', 'books'], ['🎬', 'cinema'], ['🎁', 'gifts'], ['🏃', 'sports'], ['📱', 'electronics'], ['📦', 'other']];
  const catName = (type, k) => app('categories.' + type + '.' + k);

  L.defineStation({
    id: 'geld', world: 1,
    learn(el, api) {
      api.blocks(el, {
        cats: () => h('div', { class: 'cols' },
          h('div', null, h('div', { class: 'mini-label' }, api.t('ui.incCats', { n: 5 })), h('div', { class: 'cat-grid' }, INCOME_CATS.map((c) => h('span', { class: 'cat in', style: { cursor: 'default' } }, c[0] + ' ' + catName('income', c[1]))))),
          h('div', null, h('div', { class: 'mini-label' }, api.t('ui.expCats', { n: 9 })), h('div', { class: 'cat-grid' }, EXPENSE_CATS.map((c) => h('span', { class: 'cat out', style: { cursor: 'default' } }, c[0] + ' ' + catName('expense', c[1])))))),
        pro: () => api.pro('rule', R`export async function createTransactionWithValidation(data) {
  const store = useTransactionStore.getState();

  if (data.amount <= 0) {
    return { success: false, error: 'Amount must be greater than 0' };
  }

  if (data.type === 'expense' && data.amount > store.balance) {
    return { success: false, error: 'Insufficient balance' };
  }

  const id = await store.createTransaction(data);
  return { success: true, id };
}`),
      });
    },
    play(el, api) {
      let balance = 0;
      let incSum = 0;
      let expSum = 0;
      let nInc = 0;
      let nExp = 0;
      let amount = 500;
      const balEl = h('b', { class: 'num' }, money(0));
      const incEl = h('div', null, '+ ' + money(0));
      const expEl = h('div', null, '− ' + money(0));
      const card = h('div', { class: 'balance' }, h('div', null, h('small', null, app('dashboard.your_money')), balEl),
        h('div', { style: { textAlign: 'right', fontWeight: '700', fontSize: '.9rem' } }, incEl, expEl));
      const form = h('div', { class: 'formula', style: { fontSize: '1.05rem' } });
      const list = h('div', { class: 'txlist', 'aria-live': 'polite' });
      const warnHolder = h('div');
      const amounts = L.chipGroup([100, 200, 500, 1000, 2000].map((c) => [c, money(c, true)]), amount, api.t('ui.amount'), (v) => { amount = v; });
      function updateFormula() {
        form.innerHTML = '<span>' + L.esc(api.t('ui.balance')) + '</span><span>=</span><span class="plus num">' + money(incSum) + '</span><span>−</span><span class="minus num">' + money(expSum) + '</span><span>=</span><span class="num"><strong>' + money(balance) + '</strong></span>';
        incEl.textContent = '+ ' + money(incSum);
        expEl.textContent = '− ' + money(expSum);
      }
      function book(type, cat, btn) {
        warnHolder.replaceChildren();
        if (type === 'out' && amount > balance) {
          warnHolder.append(h('div', { class: 'warn', role: 'alert' }, '⚠️ ' + app('transactions.insufficient_balance')));
          card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
          L.sound('wrong');
          api.badge('grenze');
          return;
        }
        const old = balance;
        if (type === 'in') { balance += amount; incSum += amount; nInc++; } else { balance -= amount; expSum += amount; nExp++; }
        L.counter(balEl, old, balance, (v) => money(v));
        updateFormula();
        list.prepend(h('div', { class: 'tx' }, h('span', { class: 'e', 'aria-hidden': 'true' }, cat[0]), h('span', { class: 't' }, cat[1]),
          h('span', { class: 'a ' + type }, (type === 'in' ? '+' : '−') + money(amount))));
        while (list.children.length > 6) list.lastChild.remove();
        L.sound(type === 'in' ? 'coin' : 'click');
        if (nInc >= 2 && nExp >= 1) api.challenge(btn);
      }
      updateFormula();
      el.append(h('div', { class: 'panel' },
        h('h3', null, api.t('ui.title')),
        h('p', { class: 'hint' }, api.t('ui.hint')),
        h('div', { style: { marginTop: '14px' } }, card),
        warnHolder,
        h('div', { class: 'mini-label' }, api.t('ui.amount')), amounts,
        h('div', { class: 'mini-label' }, api.t('ui.bookIncome')),
        h('div', { class: 'cat-grid' }, INCOME_CATS.slice(0, 4).map((c) => { const nm = catName('income', c[1]); return h('button', { class: 'cat in', type: 'button', onclick: (e) => book('in', [c[0], nm], e.currentTarget) }, '+ ' + c[0] + ' ' + nm); })),
        h('div', { class: 'mini-label' }, api.t('ui.bookExpense')),
        h('div', { class: 'cat-grid' }, EXPENSE_CATS.slice(0, 6).map((c) => { const nm = catName('expense', c[1]); return h('button', { class: 'cat out', type: 'button', onclick: (e) => book('out', [c[0], nm], e.currentTarget) }, '− ' + c[0] + ' ' + nm); })),
        h('div', { class: 'mini-label' }, api.t('ui.howCalc')), form,
        h('div', { class: 'mini-label' }, api.t('ui.yourTx')), list));
    },
    quiz: [{ type: 'num', a: 8, unit: 'money' }, { a: 1 }, { a: 1 }, { type: 'tf', a: false }],
  });

  /* ======================================================================
     Station 3 – Wishes & savings goals
     ====================================================================== */
  L.defineStation({
    id: 'wuensche', world: 1,
    learn(el, api) {
      api.blocks(el, {
        pro: () => api.pro('buy', R`purchaseGoal: async (goalId, actualAmount, profileId, categoryId) => {
  // 1. %{c1}
  await txStore.createTransaction({
    profile_id: profileId,
    type: 'expense',
    amount: actualAmount,
    category_id: categoryId,
    description: goal?.name,
    date: new Date().toISOString().split('T')[0],
  });

  // 2. %{c2}
  await savingsQueries.markSavingsGoalPurchased(goalId);

  // 3. %{c3}
  if (goal?.wish_id) {
    await useWishStore.getState().markFulfilled(goal.wish_id, profileId);
  }
}`),
      });
    },
    play(el, api) {
      const TARGET = 3000;
      let balance = 4500;
      let saved = 0;
      let bought = false;
      const jar = svg('<svg viewBox="0 0 160 200" width="170" role="img" aria-label="Jar"><defs><clipPath id="jarclip"><path d="M30 46 Q30 36 40 36 L120 36 Q130 36 130 46 L136 170 Q136 190 116 190 L44 190 Q24 190 24 170 Z"/></clipPath></defs>' +
        '<rect x="44" y="16" width="72" height="18" rx="6" class="lid"/>' +
        '<g clip-path="url(#jarclip)"><rect class="fill" x="0" y="190" width="160" height="0"/><path class="wave" d="M0 0 Q20 -6 40 0 T80 0 T120 0 T160 0 V8 H0 Z"/></g>' +
        '<path d="M30 46 Q30 36 40 36 L120 36 Q130 36 130 46 L136 170 Q136 190 116 190 L44 190 Q24 190 24 170 Z" fill="none" stroke-width="5" class="glass"/>' +
        '<text x="80" y="120" text-anchor="middle" font-size="26" font-weight="700" class="pct" style="font-family: var(--f-display)">0 %</text>' +
        '<text x="80" y="148" text-anchor="middle" font-size="22">⚽</text></svg>');
      jar.querySelector('.lid').style.fill = 'var(--ocean)';
      jar.querySelector('.glass').style.stroke = 'var(--ink)';
      jar.querySelector('.fill').style.fill = 'var(--gold)';
      jar.querySelector('.wave').style.fill = 'var(--gold)';
      jar.querySelector('.pct').style.fill = 'var(--ink)';
      const range = h('input', { type: 'range', class: 'range', id: 'jar-range', min: '0', max: String(TARGET), step: '100', value: '0' });
      const kv = h('div', { class: 'kv' });
      const status = h('div', { style: { minHeight: '52px', marginTop: '10px' } });
      const wishState = h('span', { class: 'chip', style: { cursor: 'default' } }, app('wishes.open'));
      function draw() {
        const p = saved / TARGET;
        const top = 190 - p * 154;
        jar.querySelector('.fill').setAttribute('y', String(top + 4));
        jar.querySelector('.fill').setAttribute('height', String(190 - top));
        jar.querySelector('.wave').setAttribute('transform', 'translate(0 ' + (top - 2) + ')');
        jar.querySelector('.wave').style.opacity = p > 0 ? '1' : '0';
        jar.querySelector('.pct').textContent = L.numf(Math.round(p * 100)) + ' %';
        kv.replaceChildren(
          h('div', null, h('small', null, api.t('ui.balance')), h('b', null, money(balance))),
          h('div', null, h('small', null, api.t('ui.inJar')), h('b', null, money(saved))),
          h('div', null, h('small', null, app('dashboard.available')), h('b', null, money(balance - saved))),
          h('div', null, h('small', null, app('savings.remaining_label')), h('b', null, money(Math.max(0, TARGET - saved)))));
      }
      range.addEventListener('input', () => {
        if (bought) return;
        saved = Number(range.value);
        draw();
        if (saved >= TARGET) {
          status.replaceChildren(h('div', { class: 'result' }, app('savings.goal_reached')),
            h('button', { class: 'btn small', type: 'button', style: { marginTop: '10px' }, onclick: buy }, '🛒 ' + app('savings.buy_now')));
          L.confetti(80);
          api.badge('sparschwein');
          api.challenge(jar);
        } else {
          status.replaceChildren(h('p', { class: 'hint' }, api.t('ui.stillNeeded', { v: money(TARGET - saved) })));
        }
      });
      function buy() {
        bought = true;
        balance -= TARGET; saved = 0; range.value = '0'; range.disabled = true;
        draw();
        wishState.textContent = app('wishes.fulfilled') + ' ✓';
        wishState.setAttribute('aria-pressed', 'true');
        status.replaceChildren(h('div', { class: 'tx' }, h('span', { class: 'e' }, '⚽'), h('span', { class: 't' }, L.t('mock.football')), h('span', { class: 'a out' }, '−' + money(TARGET))),
          h('p', { class: 'hint', style: { marginTop: '8px' } }, api.t('ui.boughtNote')),
          h('button', { class: 'btn small ghost', type: 'button', style: { marginTop: '8px' }, onclick: reset }, api.t('ui.again')));
        L.sound('coin');
      }
      function reset() { bought = false; balance = 4500; saved = 0; range.disabled = false; range.value = '0'; wishState.textContent = app('wishes.open'); wishState.setAttribute('aria-pressed', 'false'); status.replaceChildren(); draw(); }
      draw();

      let goal = 6000;
      let months = 3;
      const out = h('div', { class: 'result', style: { background: 'var(--w2-soft)' } });
      function calc() {
        const d = new Date(); d.setMonth(d.getMonth() + months);
        out.textContent = app('savings.per_month', { amount: money(Math.ceil(goal / months)), date: L.datef(d, { day: 'numeric', month: 'long', year: 'numeric' }) });
      }
      calc();
      const monthChips = [[1, app('savings.deadline_1m')], [3, app('savings.deadline_3m')], [6, app('savings.deadline_6m')], [12, app('savings.deadline_1y')]];

      el.append(
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.jarTitle')),
          h('p', { class: 'hint' }, api.t('ui.jarHint', { a: money(4500), b: money(3000) })),
          h('div', { class: 'split', style: { '--split': '190px', marginTop: '12px' } },
            h('div', { style: { display: 'grid', justifyItems: 'center' } }, jar),
            h('div', null,
              h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } }, h('b', { style: { fontFamily: 'var(--f-display)', fontSize: '1.2rem' } }, '⚽ ' + L.t('mock.football') + ' · ' + money(3000)), wishState),
              h('label', { class: 'mini-label', for: 'jar-range', style: { display: 'block' } }, app('savings.assign_money')), range, kv, status))),
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.calcTitle')),
          h('p', { class: 'hint' }, api.t('ui.calcHint')),
          h('div', { class: 'mini-label' }, api.t('ui.target')), L.chipGroup([3000, 6000, 12000].map((v) => [v, money(v, true)]), goal, null, (v) => { goal = v; calc(); }),
          h('div', { class: 'mini-label' }, app('savings.deadline_label')), L.chipGroup(monthChips, months, null, (v) => { months = v; calc(); }),
          h('div', { style: { marginTop: '14px' } }, out)));
    },
    quiz: [{ type: 'num', a: 30, unit: 'money' }, { type: 'num', a: 20, unit: 'money' }, { a: 1 }, { type: 'tf', a: false }],
  });

  /* ======================================================================
     Station 4 – Review & charts
     ====================================================================== */
  // Category → fixed colour (the colour follows the category, never its size).
  const SERIES = { toys: 'var(--s1)', sweets: 'var(--s2)', cinema: 'var(--s3)', books: 'var(--s4)', other: 'var(--s5)' };
  const SERIES_EMOJI = { toys: '🎮', sweets: '🍿', cinema: '🎬', books: '📚', other: '📦' };
  const DATA = {
    week: { inc: [1000, 0, 0, 0, 0, 200, 0], exp: [0, 150, 0, 100, 0, 0, 0], cats: { sweets: 150, books: 100 } },
    month: { inc: [1000, 1500, 1000, 1000], exp: [600, 1500, 450, 800], cats: { toys: 1500, sweets: 900, cinema: 600, books: 350 } },
    year: { inc: [4000, 4000, 4000, 4000, 4000, 12000, 4000, 4000, 4000, 4000, 4000, 14000], exp: [2000, 2500, 2200, 3000, 2600, 4500, 2400, 2800, 2300, 2600, 2100, 3500], cats: { toys: 9800, sweets: 6200, cinema: 4200, books: 2100, other: 10200 } },
  };
  function labelsFor(k, api) {
    if (k === 'week') return [0, 1, 2, 3, 4, 5, 6].map((i) => L.datef(new Date(2026, 9, 12 + i), { weekday: 'short' }));
    if (k === 'month') return [1, 2, 3, 4].map((n) => api.t('ui.weekN', { n }));
    return Array.from({ length: 12 }, (_, i) => new Date(2026, i, 15).toLocaleDateString(L.langInfo().locale, { month: 'short' }));
  }
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  function niceMax(v) {
    const steps = [500, 1000, 2000, 2500, 5000, 10000, 15000, 20000];
    return steps.find((s) => s >= v) || Math.ceil(v / 5000) * 5000;
  }

  function barChart(d, labels, readout, api) {
    const W = 560; const H = 250; const padL = 58; const padB = 30; const padT = 12; const padR = 8;
    const max = niceMax(Math.max(...d.inc, ...d.exp));
    const plotH = H - padB - padT;
    const n = labels.length;
    const groupW = (W - padL - padR) / n;
    const barW = Math.min(22, (groupW - 10) / 2);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + L.esc(app('review.income_vs_expense')) + '">';
    s += '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" style="fill: var(--red)"/><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,.45)" stroke-width="2"/></pattern></defs>';
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i; const y = padT + plotH - (v / max) * plotH;
      s += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y + '" y2="' + y + '" style="stroke: var(--line)" stroke-width="1"/>';
      s += '<text x="' + (padL - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" class="mutedtxt">' + L.esc(money(v, true)) + '</text>';
    }
    const bar = (x, v, fill, cls) => {
      if (v <= 0) return '';
      const hgt = Math.max(2, (v / max) * plotH); const y = padT + plotH - hgt; const r = Math.min(4, barW / 2, hgt);
      return '<path class="grow ' + cls + '" d="M' + x + ' ' + (padT + plotH) + ' V' + (y + r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + ' H' + (x + barW - r) + ' Q' + (x + barW) + ' ' + y + ' ' + (x + barW) + ' ' + (y + r) + ' V' + (padT + plotH) + ' Z" style="fill: ' + fill + '"/>';
    };
    labels.forEach((lab, i) => {
      const gx = padL + i * groupW + (groupW - (barW * 2 + 2)) / 2;
      s += '<g class="grp" data-i="' + i + '" tabindex="0"><rect x="' + (padL + i * groupW) + '" y="' + padT + '" width="' + groupW + '" height="' + plotH + '" fill="transparent"/>';
      s += bar(gx, d.inc[i], 'var(--green)', 'inc') + bar(gx + barW + 2, d.exp[i], 'url(#hatch)', 'exp');
      s += '<text x="' + (padL + i * groupW + groupW / 2) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="12" class="mutedtxt">' + L.esc(lab) + '</text></g>';
    });
    s += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (padT + plotH) + '" y2="' + (padT + plotH) + '" style="stroke: var(--muted)" stroke-width="1.5"/></svg>';
    const wrap = h('div', { class: 'svgbox' });
    wrap.innerHTML = s;
    wrap.querySelectorAll('.grp').forEach((g) => {
      const i = Number(g.getAttribute('data-i'));
      const say = () => { readout.textContent = api.t('ui.readout', { l: labels[i], i: money(d.inc[i]), e: money(d.exp[i]) }); wrap.querySelectorAll('.grp').forEach((x) => { x.style.opacity = x === g ? '1' : '.45'; }); };
      const clear = () => { readout.textContent = api.t('ui.readoutHint'); wrap.querySelectorAll('.grp').forEach((x) => { x.style.opacity = '1'; }); };
      g.addEventListener('mouseenter', say); g.addEventListener('focus', say); g.addEventListener('click', say);
      g.addEventListener('mouseleave', clear); g.addEventListener('blur', clear);
    });
    return wrap;
  }

  function donut(cats, api) {
    const keys = Object.keys(SERIES).filter((k) => cats[k]);
    const total = keys.reduce((n, k) => n + cats[k], 0);
    const r = 70; const C = 2 * Math.PI * r; const gap = 2;
    let off = 0;
    let s = '<svg viewBox="0 0 200 200" role="img" aria-label="' + L.esc(app('review.expenses_by_category')) + '"><g transform="rotate(-90 100 100)">';
    keys.forEach((k) => {
      const len = (cats[k] / total) * C;
      s += '<circle cx="100" cy="100" r="' + r + '" fill="none" stroke-width="34" stroke-dasharray="' + Math.max(0, len - gap) + ' ' + (C - Math.max(0, len - gap)) + '" stroke-dashoffset="' + (-off) + '" style="stroke: ' + SERIES[k] + '"/>';
      off += len;
    });
    s += '</g><text x="100" y="96" text-anchor="middle" font-size="13" class="mutedtxt">' + L.esc(api.t('ui.expenses')) + '</text><text x="100" y="118" text-anchor="middle" font-size="18" font-weight="800" style="font-family: var(--f-display)">' + L.esc(money(total)) + '</text></svg>';
    const wrap = h('div', { style: { display: 'grid', gap: '12px', justifyItems: 'center' } });
    const art = h('div', { class: 'svgbox', style: { maxWidth: '220px' } });
    art.innerHTML = s;
    const legend = h('div', { class: 'legend', style: { display: 'grid', gap: '4px', justifySelf: 'stretch' } });
    keys.forEach((k) => legend.append(h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px' } },
      h('span', null, h('i', { style: { background: SERIES[k] } }), SERIES_EMOJI[k] + ' ' + app('categories.expense.' + k)),
      h('span', { class: 'num', style: { whiteSpace: 'nowrap' } }, Math.round((cats[k] / total) * 100) + ' % · ' + money(cats[k])))));
    wrap.append(art, legend);
    return wrap;
  }

  L.defineStation({
    id: 'rueckblick', world: 1,
    learn(el, api) {
      api.blocks(el, {
        levels: () => h('div', { class: 'cols' }, (api.raw('levels') || []).map((lv) => h('div', { class: 'tcard' }, h('b', null, lv[0]), h('span', null, lv[1])))),
        pro: () => api.pro('emoji', R`const getEmoji = () => {
  if (animatedRate >= 75) return '⚡';
  if (animatedRate >= 50) return '🔋';
  if (animatedRate >= 10) return '💪';
  if (animatedRate > 0) return '🪫';
  return '🔌';
};`),
      });
    },
    play(el, api) {
      let cur = 'month';
      const readout = h('p', { class: 'hint', 'aria-live': 'polite', style: { minHeight: '1.6em' } }, api.t('ui.readoutHint'));
      const chartBox = h('div', { style: { maxWidth: '680px' } });
      const donutBox = h('div');
      const bat = battery();
      const totals = h('div', { class: 'kv' });
      const filter = L.chipGroup(['week', 'month', 'year'].map((k) => [k, app('review.' + k)]), cur, null, (k) => { cur = k; draw(); });
      function draw() {
        const d = DATA[cur];
        const inc = sum(d.inc); const exp = sum(d.exp);
        chartBox.replaceChildren(barChart(d, labelsFor(cur, api), readout, api));
        donutBox.replaceChildren(donut(d.cats, api));
        bat.set(inc > 0 ? Math.min(100, ((inc - exp) / inc) * 100) : 0, inc);
        totals.replaceChildren(
          h('div', null, h('small', null, api.t('ui.incomes')), h('b', { style: { color: 'var(--green)' } }, money(inc))),
          h('div', null, h('small', null, api.t('ui.expenses')), h('b', { style: { color: 'var(--red)' } }, money(exp))),
          h('div', null, h('small', null, api.t('ui.saved')), h('b', null, money(inc - exp))));
      }
      draw();

      const lab = battery();
      const inc = h('input', { type: 'range', class: 'range', id: 'lab-inc', min: '0', max: '5000', step: '100', value: '2000' });
      const exp = h('input', { type: 'range', class: 'range', id: 'lab-exp', min: '0', max: '5000', step: '100', value: '1500' });
      const incL = h('b', { class: 'num' });
      const expL = h('b', { class: 'num' });
      const calc = h('div', { class: 'formula', style: { fontSize: '1rem' } });
      function labDraw() {
        const i = Number(inc.value); const e = Number(exp.value);
        incL.textContent = money(i); expL.textContent = money(e);
        const rate = i > 0 ? Math.min(100, ((i - e) / i) * 100) : e > 0 ? -100 : 0;
        lab.set(rate, i);
        calc.innerHTML = i > 0
          ? '<span>(' + money(i) + ' − ' + money(e) + ')</span><span>÷</span><span>' + money(i) + '</span><span>× 100</span><span>=</span><strong>' + L.numf(Math.round(rate)) + ' %</strong>'
          : '<span>' + L.esc(api.t('ui.noIncome')) + '</span>';
        if (rate >= 75 && i >= 1000) { api.badge('batterie'); api.challenge(lab); }
      }
      let tm = 0;
      [inc, exp].forEach((x) => x.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(labDraw, 120); }));
      labDraw();

      el.append(
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.viewTitle')),
          h('p', { class: 'hint' }, api.t('ui.viewHint')),
          h('div', { style: { marginTop: '10px' } }, filter),
          totals,
          h('div', { class: 'cols', style: { marginTop: '16px', alignItems: 'start' } },
            h('div', null, h('div', { class: 'mini-label' }, app('review.your_savings')), h('div', { style: { marginTop: '10px' } }, bat)),
            h('div', null, h('div', { class: 'mini-label' }, app('review.expenses_by_category')), h('div', { style: { marginTop: '10px' } }, donutBox))),
          h('div', { class: 'mini-label', style: { marginTop: '18px' } }, app('review.income_vs_expense')),
          h('div', { class: 'legend', style: { marginTop: '6px' } },
            h('span', null, h('i', { style: { background: 'var(--green)' } }), api.t('ui.legendInc')),
            h('span', null, h('i', { style: { background: 'repeating-linear-gradient(45deg, var(--red) 0 3px, color-mix(in srgb, var(--red) 55%, #fff) 3px 5px)' } }), api.t('ui.legendExp'))),
          chartBox, readout),
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.labTitle')),
          h('p', { class: 'hint' }, api.t('ui.labHint')),
          h('div', { class: 'cols', style: { marginTop: '12px', alignItems: 'center' } },
            h('div', null,
              h('label', { class: 'mini-label', for: 'lab-inc', style: { display: 'flex', justifyContent: 'space-between' } }, api.t('ui.incomes'), incL), inc,
              h('label', { class: 'mini-label', for: 'lab-exp', style: { display: 'flex', justifyContent: 'space-between' } }, api.t('ui.expenses'), expL), exp,
              h('div', { style: { marginTop: '12px' } }, calc)),
            lab)));
    },
    quiz: [{ type: 'num', a: 25, unit: '%' }, { a: 0 }, { a: 3 }, { a: 0 }],
  });

  /* ======================================================================
     Station 5 – Badges & saving tips
     ====================================================================== */
  const APP_BADGES = [
    ['🚀', 'ten_transactions', 'transaction_count', 10, 'tx'],
    ['📒', 'bookkeeper', 'transaction_count', 50, 'tx'],
    ['💯', 'first_hundred', 'balance_reached', 10000, 'bal'],
    ['🤑', 'thousand_club', 'balance_reached', 100000, 'bal'],
    ['💭', 'wisher', 'first_wish', 1, 'wish'],
    ['📋', 'wishlist_pro', 'wish_count', 5, 'wish'],
    ['🎯', 'goal_reached', 'savings_goal_completed', 1, 'goals'],
    ['💪', 'determined', 'savings_goals_completed', 3, 'goals'],
    ['🦸', 'super_saver', 'savings_goals_completed', 5, 'goals'],
    ['📖', 'tip_reader', 'tips_read', 30, 'tips'],
    ['🔥', 'streak_week', 'daily_streak', 7, 'streak'],
    ['⚡', 'streak_month', 'daily_streak', 30, 'streak'],
  ];

  L.defineStation({
    id: 'abzeichen', world: 1,
    learn(el, api) {
      api.blocks(el, {
        rule: () => L.code(R`{ key: 'bookkeeper', icon: '📒',
  condition_type: 'transaction_count',   // ` + api.t('ui.whatCounted') + R`
  condition_value: 50 }                   // ` + api.t('ui.howMany')),
        pro: () => api.pro('streak', R`// %{c1}
const rows = await db.getAllAsync(
  'SELECT DISTINCT date as day FROM transactions WHERE profile_id = ? ORDER BY date DESC',
  profileId,
);

let streak = 1;
for (let i = 1; i < rows.length; i++) {
  const diff = (prev - curr) / (1000 * 60 * 60 * 24);  // %{c2}
  if (diff === 1) {
    streak++;      // %{c3}
  } else {
    break;         // %{c4}
  }
}`),
      });
    },
    play(el, api) {
      const vals = { tx: 0, bal: 0, wish: 0, goals: 0, tips: 0, streak: 0 };
      const lit = new Set();
      const SL = [['tx', 60, 1, (v) => L.numf(v)], ['bal', 120000, 1000, (v) => money(v, true)], ['wish', 6, 1, (v) => v], ['goals', 6, 1, (v) => v], ['tips', 35, 1, (v) => v], ['streak', 31, 1, (v) => v]];
      const grid = h('div', { class: 'badge-grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' } });
      const cards = APP_BADGES.map((b) => {
        const c = h('div', { class: 'bdg off' },
          h('div', { class: 'e', 'aria-hidden': 'true' }, b[0]), h('b', null, app('badges.' + b[1] + '.name')),
          h('span', { style: { fontFamily: 'var(--f-mono)', fontSize: '.72rem' } }, b[2] + ' ≥ ' + b[3]));
        grid.append(c);
        return c;
      });
      const count = h('b');
      function check(anchor) {
        let fresh = 0;
        APP_BADGES.forEach((b, i) => {
          const ok = vals[b[4]] >= b[3];
          cards[i].classList.toggle('off', !ok);
          if (ok && !lit.has(i)) { lit.add(i); fresh++; cards[i].style.animation = 'none'; void cards[i].offsetWidth; cards[i].style.animation = 'pop .4s ease'; }
          if (!ok) lit.delete(i);
        });
        count.textContent = api.t('ui.count', { n: lit.size });
        if (fresh) L.sound('coin');
        if (lit.size >= 8) { api.badge('regel'); api.challenge(anchor); }
      }
      const sliders = h('div', { style: { display: 'grid', gap: '6px' } });
      SL.forEach(([f, max, step, show]) => {
        const out = h('b', { class: 'num' }, show(0));
        const r = h('input', { type: 'range', class: 'range', id: 'bm-' + f, min: '0', max: String(max), step: String(step), value: '0' });
        r.addEventListener('input', () => { vals[f] = Number(r.value); out.textContent = show(vals[f]); check(r); });
        sliders.append(h('label', { class: 'mini-label', for: 'bm-' + f, style: { display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '6px' } }, api.t('ui.sl.' + f), out), r);
      });
      check(null);

      const tips = L.raw('app.tips') || [];
      let ti = Math.floor(Math.random() * tips.length);
      const tipP = h('p', { style: { fontWeight: '700', fontSize: '1.05rem' } }, tips[ti]);
      el.append(
        h('div', { class: 'panel' },
          h('h3', null, api.t('ui.machineTitle')),
          h('p', { class: 'hint' }, api.t('ui.machineHint')),
          h('div', { class: 'split', style: { marginTop: '12px' } },
            h('div', null, sliders, h('p', { style: { marginTop: '12px' } }, count)),
            grid)),
        h('div', { class: 'panel', style: { background: 'var(--gold-soft)' } },
          h('h3', null, '💡 ' + app('dashboard.daily_tip')),
          tipP,
          h('button', { class: 'btn small ghost', type: 'button', style: { marginTop: '10px' }, onclick: () => { ti = (ti + 1) % tips.length; tipP.textContent = tips[ti]; L.sound('click'); } }, api.t('ui.nextTip')),
          h('p', { class: 'hint', style: { marginTop: '8px' } }, api.t('ui.tipNote'))));
    },
    quiz: [{ a: 1 }, { a: 1 }, { a: 0 }, { type: 'tf', a: false }],
  });
})();
