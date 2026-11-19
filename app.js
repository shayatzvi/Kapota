/* ============================================================
   Kapota Day — UI
   Everything is stored in this browser (localStorage). No server.
   ============================================================ */
(function () {
  'use strict';
  const { hebText, hebDayHe, hebParts, eventsFor, verdictFor, scoreEvent, tierOf, noon, isoOf, fromIso, addDays, buildIndex, byId, MONTH_DISPLAY } = KD;

  /* ---------- storage (safe) ---------- */
  const mem = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem('kapota.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem('kapota.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { delete mem[k]; try { localStorage.removeItem('kapota.' + k); } catch (e) { /* ignore */ } },
  };

  const DEFAULT_PROFILE = { name: '', group: 'chabad', level: 3, stance: 'neutral', yeshiva: 'none', shlichus: 'none', il: false };
  const S = {
    profile: store.get('profile', null),
    worn: store.get('worn', []),
    unlocked: store.get('unlocked', []),
    gate: null,
    tab: 'today',
    viewAs: store.get('viewAs', {}),
    cal: null,
    ev: { cats: Object.keys(CATS).filter((c) => c !== 'shabbat'), q: '', range: 'upcoming' },
    lv: { iso: null, mode: 'level', group: null, stance: 'neutral' },
    wiz: { step: 0, draft: null },
    index: null,
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => noon(new Date());
  const fmtDate = (d, o) => d.toLocaleDateString(undefined, o || { weekday: 'long', month: 'long', day: 'numeric' });
  const evName = (ev, n) => ev.n + (ev.dayLabel ? ' — ' + ev.dayLabel(n) : '');
  const vp = () => Object.assign({}, S.profile || DEFAULT_PROFILE, S.viewAs);
  const isViewingOther = () => Object.keys(S.viewAs).length > 0;
  const gLabel = (id) => byId(GROUPS, id).label;
  const isOpen = (g) => !g.locked || S.unlocked.includes(g.id);
  const openGroups = () => GROUPS.filter(isOpen);

  /* ---------- index (cached in localStorage) ---------- */
  function getIndex() {
    const il = !!(S.profile && S.profile.il);
    if (S.index && S.index.il === il) return S.index;
    const cached = store.get('index', null);
    const t = isoOf(today());
    if (cached && cached.v === 3 && cached.il === il && cached.from <= t && cached.to > isoOf(addDays(today(), 40))) { S.index = cached; return cached; }
    S.index = buildIndex(il, today());
    store.set('index', S.index);
    return S.index;
  }
  const EV_BY_ID = Object.fromEntries(EVENTS.map((x) => [x.id, x]));

  /* ---------- chips / pills ---------- */
  const pill = (tierIdx, extra) => { const t = TIERS[tierIdx]; return `<span class="pill t-${t.key}">${esc(extra || t.short)}</span>`; };
  function reasonChips(why, max) {
    const list = why.filter((w) => Math.abs(w.delta) >= 0.25).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, max || 4);
    if (!list.length) return '';
    return `<div class="why">${list.map((w) => `<span class="chip ${w.delta > 0 ? 'up' : 'down'}">${w.delta > 0 ? '+' : '−'} ${esc(w.label)}</span>`).join('')}</div>`;
  }

  /* ---------- "view as" bar ---------- */
  function viewAsBar() {
    const p = vp();
    const on = isViewingOther();
    return `<details class="viewas ${on ? 'on' : ''}" ${on ? 'open' : ''}>
      <summary>${on ? 'Viewing as: <b>' + esc(gLabel(p.group)) + ' · L' + p.level + (p.group === 'chabad' ? ' · ' + esc(byId(STANCES, p.stance).label) : '') + '</b>' : 'View as someone else'}</summary>
      <div class="viewas-grid">
        <label>Community<select data-va="group">${openGroups().map((g) => `<option value="${g.id}" ${p.group === g.id ? 'selected' : ''}>${esc(g.label)}</option>`).join('')}</select></label>
        <label>Level<select data-va="level">${LEVELS.map((l) => `<option value="${l.v}" ${p.level === l.v ? 'selected' : ''}>${l.v} · ${esc(l.label)}</option>`).join('')}</select></label>
        ${p.group === 'chabad' ? `<label>Stance<select data-va="stance">${STANCES.map((s) => `<option value="${s.id}" ${p.stance === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>` : ''}
        <button class="btn ghost" data-act="va-reset" ${on ? '' : 'disabled'}>Back to me</button>
      </div>
    </details>`;
  }

  /* ============================================================
     VIEW: Today
     ============================================================ */
  function viewToday() {
    const t = today();
    const v = verdictFor(t, vp());
    const tm = verdictFor(addDays(t, 1), vp());
    const worn = S.worn.includes(v.iso);
    const name = S.profile && S.profile.name ? esc(S.profile.name) : '';
    const items = v.items.filter((x) => !x.baseline);
    return `
    ${viewAsBar()}
    <section class="hero t-${v.tierInfo.key}">
      <div class="hero-txt">
        <div class="eyebrow">${name ? name + ' — today' : 'Today'}</div>
        <h1>${esc(v.tierInfo.label)}</h1>
        <p class="quip">${esc(v.quip)}</p>
        ${v.comment ? `<p class="comment">“${esc(v.comment)}”</p>` : ''}
        <div class="outfit"><span>Suggested look</span>${esc(v.outfit)}</div>
        <div class="meter" title="Kapota-meter: ${v.score.toFixed(1)}/10"><i style="width:${Math.max(4, v.score * 10)}%"></i></div>
      </div>
    </section>

    <section class="card">
      <div class="dateline"><b>${esc(fmtDate(t))}</b><span>${esc(hebText(t))} · <span class="he">${esc(hebText(t, 'he'))}</span></span></div>
      ${items.length ? items.map((it) => eventCard(it, v.iso)).join('') : `<div class="empty">Nothing on the calendar — a regular ${esc(fmtDate(t, { weekday: 'long' }))}.</div>`}
      ${reasonChips(v.top.why, 5)}
      <div class="actions">
        ${isViewingOther() ? '' : `<button class="btn ${worn ? 'ok' : ''}" data-act="wore" data-val="${v.iso}">${worn ? 'Marked: wore it today' : 'I wore it today'}</button>`}
        <button class="btn ghost" data-act="levels-for" data-val="${v.iso}">Compare every level</button>
      </div>
    </section>

    <section class="card tomorrow" data-act="day" data-val="${tm.iso}" role="button" tabindex="0">
      <div class="tm-l"><div class="eyebrow">Tomorrow · starts at nightfall tonight</div>
        <b>${esc(fmtDate(addDays(t, 1)))}</b><div class="muted">${esc(hebText(addDays(t, 1)))}</div>
        <div class="muted small">${tm.hasEvents ? esc(tm.items.filter((x) => !x.baseline).map((x) => evName(x.ev, x.n)).join(' · ')) : 'Regular day'}</div></div>
      ${pill(tm.tier)}
    </section>

    ${upcomingStrip()}
    `;
  }

  function eventCard(it, iso) {
    const ev = it.ev, t = TIERS[tierOf(it.score)];
    return `<div class="ev-card" data-act="day" data-val="${iso}">
      <div class="ev-main"><div><b>${esc(evName(ev, it.n))}</b>${ev.note ? `<div class="muted small">${esc(ev.note)}</div>` : ''}</div></div>
      ${pill(tierOf(it.score))}
    </div>`;
  }

  function upcomingStrip() {
    const p = vp(), out = [];
    for (let i = 2; i <= 60 && out.length < 5; i++) {
      const d = addDays(today(), i), info = eventsFor(d, p.il);
      const sc = info.events.filter((x) => !['shabbat', 'general'].includes(x.ev.cat) || x.ev.id === 'chanukah' || x.ev.id === 'purimkatan' || x.ev.id === 'lagbaomer');
      if (!sc.length) continue;
      const best = sc.map((x) => scoreEvent(x.ev, p)).sort((a, b) => b.score - a.score)[0];
      if (best.score < 4.5) continue;
      out.push({ d, ev: best.ev, n: sc.find((x) => x.ev === best.ev).n, tier: tierOf(best.score) });
    }
    if (!out.length) return '';
    return `<section class="card"><h2>Coming up for you</h2>${out.map((o) => `<div class="row" data-act="day" data-val="${isoOf(o.d)}" role="button" tabindex="0">
      <div class="row-d"><b>${o.d.getDate()}</b><small>${esc(o.d.toLocaleDateString(undefined, { month: 'short' }))}</small></div>
      <div class="row-m"><b>${esc(evName(o.ev, o.n))}</b><div class="muted small">${esc(fmtDate(o.d, { weekday: 'long' }))} · ${esc(hebText(o.d))}</div></div>
      ${pill(o.tier)}</div>`).join('')}</section>`;
  }

  /* ============================================================
     VIEW: Calendar (month grid)
     ============================================================ */
  function viewCalendar() {
    if (!S.cal) { const t = today(); S.cal = { y: t.getFullYear(), m: t.getMonth() }; }
    const { y, m } = S.cal, p = vp();
    const first = new Date(y, m, 1, 12), days = new Date(y, m + 1, 0).getDate();
    const hf = hebParts(first), hl = hebParts(new Date(y, m, days, 12));
    const hebTitle = hf.m === hl.m ? `${MONTH_DISPLAY[hf.m] || hf.m} ${hf.y}` : `${MONTH_DISPLAY[hf.m] || hf.m} – ${MONTH_DISPLAY[hl.m] || hl.m} ${hl.y}`;
    const tIso = isoOf(today());
    let cells = '';
    for (let i = 0; i < first.getDay(); i++) cells += '<div class="cell blank"></div>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d, 12), v = verdictFor(date, p);
      const evs = v.items.filter((x) => !x.baseline && x.ev.cat !== 'shabbat' && x.ev.id !== 'rc');
      cells += `<button class="cell t-${v.tierInfo.key} ${v.iso === tIso ? 'today' : ''} ${v.dow === 6 ? 'shabbos' : ''}" data-act="day" data-val="${v.iso}" aria-label="${esc(fmtDate(date))}: ${esc(v.tierInfo.label)}">
        <span class="gd">${d}</span><span class="hd he">${esc(hebDayHe(date))}</span>
        ${evs.length ? `<span class="dot">${evs.length > 1 ? evs.length : '•'}</span>` : ''}</button>`;
    }
    return `
    ${viewAsBar()}
    <section class="card">
      <div class="cal-head">
        <button class="btn ghost sq" data-act="cal-prev" aria-label="Previous month">‹</button>
        <div><b>${esc(new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}</b><div class="muted small">${esc(hebTitle)}</div></div>
        <button class="btn ghost sq" data-act="cal-next" aria-label="Next month">›</button>
      </div>
      <div class="cal-dow">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
      <button class="btn ghost small-btn" data-act="cal-today">Jump to today</button>
      ${legend()}
    </section>`;
  }
  const legend = () => `<div class="legend">${TIERS.map((t) => `<span class="pill t-${t.key}">${t.short}</span>`).join('')}</div>`;

  /* ============================================================
     VIEW: Events list
     ============================================================ */
  function viewEvents() {
    const idx = getIndex(), p = vp(), f = S.ev, t = isoOf(today());
    const range = f.range === 'y0' ? [idx.from, idx.mid] : f.range === 'y1' ? [idx.mid, idx.to] : [t, isoOf(addDays(today(), 365))];
    const q = f.q.trim().toLowerCase();
    const rows = [];
    for (const day of idx.days) {
      if (day.iso < range[0] || day.iso >= range[1]) continue;
      for (const [id, n] of day.events) {
        const ev = EV_BY_ID[id];
        if (!ev || !f.cats.includes(ev.cat)) continue;
        if (q && !(evName(ev, n) + ' ' + CATS[ev.cat].label).toLowerCase().includes(q)) continue;
        rows.push({ iso: day.iso, ev, n });
      }
    }
    let html = '', lastKey = '';
    for (const r of rows) {
      const d = fromIso(r.iso), key = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      if (key !== lastKey) { html += `<h3 class="month-h">${esc(key)}</h3>`; lastKey = key; }
      const sc = scoreEvent(r.ev, p);
      html += `<div class="row ${r.iso === t ? 'is-today' : ''}" data-act="day" data-val="${r.iso}" role="button" tabindex="0">
        <div class="row-d"><b>${d.getDate()}</b><small>${esc(d.toLocaleDateString(undefined, { weekday: 'short' }))}</small></div>
        <div class="row-m"><b>${esc(evName(r.ev, r.n))}</b>
          <div class="muted small">${esc(CATS[r.ev.cat].label)} · ${esc(hebText(d))}</div></div>
        ${pill(tierOf(sc.score))}</div>`;
    }
    const hy = idx.year;
    return `
    ${viewAsBar()}
    <section class="card">
      <h2>All events <span class="muted small">(${rows.length})</span></h2>
      <input class="search" type="search" placeholder="Search events… (Yud Tes Kislev, Purim, Gur…)" value="${esc(f.q)}" data-ev="q">
      <div class="seg">${[['upcoming', 'Next 12 months'], ['y0', 'Hebrew ' + hy], ['y1', 'Hebrew ' + (hy + 1)]].map(([k, l]) => `<button class="${f.range === k ? 'on' : ''}" data-act="range" data-val="${k}">${l}</button>`).join('')}</div>
      <div class="chips">${Object.entries(CATS).map(([k, c]) => `<button class="fchip ${f.cats.includes(k) ? 'on' : ''}" data-act="cat" data-val="${k}">${esc(c.label)}</button>`).join('')}</div>
      ${html || '<div class="empty">No events match.</div>'}
    </section>`;
  }

  /* ============================================================
     VIEW: Levels / Der Velt (compare)
     ============================================================ */
  function viewLevels() {
    const lv = S.lv, base = S.profile || DEFAULT_PROFILE;
    if (!lv.iso) lv.iso = isoOf(today());
    if (!lv.group) lv.group = base.group;
    const date = fromIso(lv.iso), info = eventsFor(date, base.il);
    const mk = (o) => verdictFor(date, Object.assign({}, base, { group: lv.group }, o));
    let table = '';
    if (lv.mode === 'level') {
      const cols = lv.group === 'chabad'
        ? STANCES.map((s) => ({ label: s.label, o: { stance: s.id } }))
        : [{ label: 'Not on shlichus', o: { shlichus: 'none' } }, { label: 'On shlichus / kiruv', o: { shlichus: 'kiruv' } }];
      table = `<div class="matrix" style="--cols:${cols.length}">
        <div class="mh"></div>${cols.map((c) => `<div class="mh">${esc(c.label)}</div>`).join('')}
        ${LEVELS.map((L) => `<div class="ml"><b>${L.v}</b><span>${esc(L.label)}</span></div>${cols.map((c) => { const v = mk(Object.assign({ level: L.v }, c.o)); return `<div class="mc t-${v.tierInfo.key}" title="${esc(v.outfit)}"><span>${esc(v.tierInfo.short)}</span></div>`; }).join('')}`).join('')}
      </div>`;
    } else {
      table = `<div class="matrix" style="--cols:6">
        <div class="mh"></div>${LEVELS.map((L) => `<div class="mh">L${L.v}</div>`).join('')}
        ${openGroups().map((G) => `<div class="ml"><span>${esc(G.label)}</span></div>${LEVELS.map((L) => { const v = verdictFor(date, Object.assign({}, base, { group: G.id, level: L.v, stance: lv.stance })); return `<div class="mc t-${v.tierInfo.key}"><span>${esc(v.tierInfo.short)}</span></div>`; }).join('')}`).join('')}
      </div>`;
    }
    return `
    <section class="card">
      <h2>Compare levels and communities</h2>
      <p class="muted">Pick any day and see how the verdict changes for each level and community.</p>
      <div class="lv-controls">
        <label>Date<input type="date" value="${lv.iso}" data-lv="iso"></label>
        <div class="seg"><button class="${lv.mode === 'level' ? 'on' : ''}" data-act="lvmode" data-val="level">By level</button><button class="${lv.mode === 'group' ? 'on' : ''}" data-act="lvmode" data-val="group">By community</button></div>
        ${lv.mode === 'level'
          ? `<label>Community<select data-lv="group">${openGroups().map((g) => `<option value="${g.id}" ${lv.group === g.id ? 'selected' : ''}>${esc(g.label)}</option>`).join('')}</select></label>`
          : `<label>Chabad stance (for the Chabad row)<select data-lv="stance">${STANCES.map((s) => `<option value="${s.id}" ${lv.stance === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>`}
      </div>
      <div class="dateline"><b>${esc(fmtDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</b><span>${esc(hebText(date))}</span></div>
      <div class="muted small" style="margin-bottom:10px">${info.events.length ? esc(info.events.map((x) => evName(x.ev, x.n)).join(' · ')) : 'No special events — a regular day.'}</div>
      ${table}
      ${legend()}
    </section>`;
  }

  /* ============================================================
     VIEW: Me (profile)
     ============================================================ */
  function viewMe() {
    const p = S.profile, G = byId(GROUPS, p.group);
    const streak = calcStreak();
    const row = (k, label, val, step) => `<div class="kv"><div><small>${label}</small><b>${esc(val)}</b></div><button class="btn ghost small-btn" data-act="wiz" data-val="${step}">Edit</button></div>`;
    return `
    <section class="card">
      <h2>${p.name ? esc(p.name) + '’s' : 'Your'} profile</h2>
      ${row('group', 'Community', G.label, 0)}
      ${row('level', 'Chassidishkeit level', p.level + ' · ' + LEVELS[p.level].label, 1)}
      ${p.group === 'chabad' ? row('stance', 'Stance', byId(STANCES, p.stance).label, 2) : ''}
      ${row('yeshiva', 'Yeshiva', byId(YESHIVAS, p.yeshiva).label, 3)}
      ${row('shlichus', 'Shlichus', byId(SHLICHUS, p.shlichus).label, 4)}
      ${row('il', 'Where you live', p.il ? 'Israel (one-day Yom Tov)' : 'Outside Israel (two-day Yom Tov)', 5)}
    </section>
    <section class="card">
      <h2>Kapota log</h2>
      <div class="stats"><div><b>${S.worn.length}</b><small>days worn</small></div><div><b>${streak}</b><small>day streak</small></div></div>
      <p class="muted small">Saved only in this browser. Nothing is ever sent anywhere.</p>
      <div class="actions"><button class="btn ghost" data-act="export">Copy my data</button><button class="btn danger" data-act="reset">Reset everything</button></div>
    </section>
    <section class="card"><h2>About</h2>
      <p class="muted small">Dates are calculated from the Hebrew calendar built into your browser, so they work every year. The verdicts are lighthearted — a mix of community culture, your level, your yeshiva, shlichus and (for Chabad) your stance. Please verify fast days, Yom Tov times and yahrzeits with your Rov or luach. Install it: use “Add to Home Screen” on your phone and it works offline.</p>
    </section>`;
  }
  function calcStreak() {
    const set = new Set(S.worn); let n = 0, d = today();
    if (!set.has(isoOf(d))) d = addDays(d, -1);
    while (set.has(isoOf(d))) { n++; d = addDays(d, -1); }
    return n;
  }

  /* ============================================================
     Onboarding wizard
     ============================================================ */
  const STEPS = ['group', 'level', 'stance', 'yeshiva', 'shlichus', 'where'];
  function stepsFor(d) {
    return STEPS.filter((s) => s !== 'stance' || d.group === 'chabad');
  }
  const forGroup = (arr, g) => arr.filter((x) => !x.for || x.for.includes(g));

  function viewWizard() {
    const w = S.wiz, d = w.draft, steps = stepsFor(d), key = steps[Math.min(w.step, steps.length - 1)];
    const idx = steps.indexOf(key), G = byId(GROUPS, d.group), flavor = LEVEL_FLAVOR[GROUP_KIND[d.group]];
    const nm = d.name.trim();
    const isChabadish = d.group === 'chabad';
    const opt = (field, val, title, desc) => `<button class="opt ${String(d[field]) === String(val) ? 'on' : ''}" data-act="pick" data-field="${field}" data-val="${val}"><span class="opt-t">${esc(title)}</span>${desc ? `<small>${esc(desc)}</small>` : ''}</button>`;

    // running summary of earlier answers
    const sofar = [];
    steps.slice(0, idx).forEach((k) => {
      if (k === 'group') sofar.push(G.label);
      if (k === 'level') sofar.push('Level ' + d.level + ' · ' + LEVELS[d.level].label);
      if (k === 'stance') sofar.push(byId(STANCES, d.stance).label);
      if (k === 'yeshiva') sofar.push(byId(YESHIVAS, d.yeshiva).label.split(' (')[0].split(' —')[0]);
      if (k === 'shlichus' && d.shlichus !== 'none') sofar.push(byId(SHLICHUS, d.shlichus).label.split(' (')[0].split(' —')[0]);
    });

    let title = '', sub = '', body = '';
    if (key === 'group') {
      title = 'Where do you daven?';
      sub = 'Start with your community. The remaining questions change to fit it.';
      body = `<label class="name">Your name (optional)<input data-wname value="${esc(d.name)}" placeholder="First name" maxlength="30"></label>
        <div class="opts">${GROUPS.map((g) => isOpen(g)
          ? opt('group', g.id, g.label, g.blurb)
          : `<button class="opt locked" data-act="locked" data-val="${g.id}"><span class="opt-t">${esc(g.label)}<em class="eta">ETA</em></span><small>Coming soon. Tap to request early access.</small></button>`).join('')}</div>`;
    } else if (key === 'level') {
      title = nm ? `${nm}, how would you describe your dress?` : 'How would you describe your dress?';
      sub = flavor.sub;
      body = `<div class="opts">${LEVELS.map((l) => opt('level', l.v, l.v + ' · ' + l.label, flavor.descs[l.v])).join('')}</div>`;
    } else if (key === 'stance') {
      title = 'Where do you stand on Moshiach?';
      sub = 'This only affects days centered on the Rebbe. Nothing else changes.';
      body = `<div class="opts">${STANCES.map((s) => opt('stance', s.id, s.label, s.desc)).join('')}</div>`;
    } else if (key === 'yeshiva') {
      const list = forGroup(YESHIVAS, d.group).slice().sort((x, y) => (d.stance === 'detroiter' ? (y.id === 'detroitLub') - (x.id === 'detroitLub') : 0));
      title = 'Which yeshiva are you from?';
      sub = d.group === 'chabad' ? (d.stance === 'detroiter' ? 'The Detroit yeshiva is listed first.' : 'Tomchei Tmimim and other Lubavitch institutions are listed first.')
        : 'Options for ' + G.label + '.';
      body = `<div class="opts">${list.map((y) => opt('yeshiva', y.id, y.label, y.desc)).join('')}</div>`;
    } else if (key === 'shlichus') {
      const list = forGroup(SHLICHUS, d.group);
      title = isChabadish ? 'Are you on shlichus?' : 'Do you work in kiruv or the rabbinate?';
      sub = isChabadish ? 'Public-facing days change what is expected.' : 'Public-facing roles change what is expected.';
      body = `<div class="opts">${list.map((s) => opt('shlichus', s.id, s.label)).join('')}</div>`;
    } else {
      title = 'Where do you live?';
      sub = 'This decides between one-day and two-day Yom Tov.';
      body = `<div class="opts">${opt('il', 'false', 'Outside Israel', 'Two days of Yom Tov')}${opt('il', 'true', 'In Israel', 'One day of Yom Tov')}</div>`;
    }
    const last = idx === steps.length - 1;
    return `<section class="wiz">
      <div class="wiz-top"><div class="dots">${steps.map((s, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</div><span class="muted small">Step ${idx + 1} of ${steps.length}</span></div>
      ${sofar.length ? `<div class="sofar">${sofar.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
      <h1>${esc(title)}</h1><p class="muted">${esc(sub)}</p>
      ${body}
      <div class="wiz-nav">
        ${idx > 0 ? '<button class="btn ghost" data-act="wiz-back">Back</button>' : (S.profile ? '<button class="btn ghost" data-act="wiz-cancel">Cancel</button>' : '<span></span>')}
        <button class="btn primary" data-act="wiz-next">${last ? 'Show my verdict' : 'Continue'}</button>
      </div></section>`;
  }

  function startWizard(step) {
    S.wiz = { step: step || 0, draft: Object.assign({}, DEFAULT_PROFILE, S.profile || {}) };
    S.tab = 'wizard';
    render();
  }
  function stepIndexByName(i) { // from Me page numbers (0 group,1 level,2 stance,3 yeshiva,4 shlichus,5 where)
    const d = S.profile, steps = stepsFor(d), name = STEPS[i];
    return Math.max(0, steps.indexOf(name));
  }

  /* ============================================================
     Day dialog
     ============================================================ */
  function showDay(iso) {
    const date = fromIso(iso), v = verdictFor(date, vp());
    const items = v.items;
    const isToday = iso === isoOf(today());
    $('#dlgBody').innerHTML = `
      <div class="dlg-head t-${v.tierInfo.key}">
        <button class="x" data-act="close" aria-label="Close">✕</button>
        <div class="eyebrow">${esc(fmtDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</div>
        <div class="muted2">${esc(hebText(date))} · <span class="he">${esc(hebText(date, 'he'))}</span></div>
        <h2>${esc(v.tierInfo.label)}</h2>
        <p>${esc(v.quip)}</p>
        ${v.comment ? `<p class="comment">“${esc(v.comment)}”</p>` : ''}
        <div class="outfit"><span>Suggested look</span>${esc(v.outfit)}</div>
      </div>
      <div class="dlg-body">
        ${isViewingOther() ? `<p class="muted small">Viewing as ${esc(gLabel(vp().group))}, level ${vp().level}.</p>` : ''}
        ${items.map((it) => `<div class="ev-card plain"><div class="ev-main"><div><b>${esc(evName(it.ev, it.n || 1))}</b>${it.ev.note ? `<div class="muted small">${esc(it.ev.note)}</div>` : ''}${reasonChips(it.why, 4)}</div></div>${pill(tierOf(it.score), it.score.toFixed(1) + '/10')}</div>`).join('')}
        <div class="actions">
          ${isToday && !isViewingOther() ? `<button class="btn" data-act="wore" data-val="${iso}">${S.worn.includes(iso) ? 'Marked: worn' : 'I wore it'}</button>` : ''}
          <button class="btn ghost" data-act="levels-for" data-val="${iso}">Compare every level</button>
        </div>
      </div>`;
    const dlg = $('#dlg');
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
  }
  const GATE_STEPS = [
    ['Not available yet', 'This community is still being built. ETA: soon.', 'Continue'],
    ['Are you sure?', 'Verdicts for this community have not been reviewed by anyone who actually belongs to it.', 'Yes, continue'],
    ['Last prompt', 'Unlocking adds this community to the form, the calendar and the compare screen.', 'Unlock access'],
  ];
  function showGate() {
    const g = S.gate, G = byId(GROUPS, g.id), st = GATE_STEPS[g.step];
    $('#dlgBody').innerHTML = `<div class="dlg-body gate">
      <div class="eyebrow">${esc(G.label)} · prompt ${g.step + 1} of ${GATE_STEPS.length}</div>
      <h2>${esc(st[0])}</h2><p class="muted">${esc(st[1])}</p>
      <div class="actions"><button class="btn ghost" data-act="close">Cancel</button><button class="btn primary" data-act="gate-next">${esc(st[2])}</button></div></div>`;
    const dlg = $('#dlg');
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
  }
  const closeDlg = () => { const d = $('#dlg'); if (d.close) d.close(); else d.removeAttribute('open'); };

  /* ============================================================
     Render + events
     ============================================================ */
  const TABS = [['today', 'Today'], ['calendar', 'Calendar'], ['events', 'Events'], ['levels', 'Compare'], ['me', 'Me']];

  function render() {
    const view = $('#view'), tabs = $('#tabs');
    $('#topDate').innerHTML = `<b>${esc(hebText(today()))}</b><small class="he">${esc(hebText(today(), 'he'))}</small>`;
    const needsProfile = !S.profile && S.tab !== 'wizard';
    if (needsProfile) { startWizard(0); return; }
    tabs.style.display = S.tab === 'wizard' ? 'none' : '';
    tabs.innerHTML = TABS.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-val="${k}">${l}</button>`).join('');
    const f = { today: viewToday, calendar: viewCalendar, events: viewEvents, levels: viewLevels, me: viewMe, wizard: viewWizard }[S.tab];
    const keepSearch = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.ev;
    view.innerHTML = f();
    if (keepSearch) { const el = $('[data-ev="q"]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
  }
  const go = (tab) => { S.tab = tab; history.replaceState(null, '', '#' + tab); render(); window.scrollTo({ top: 0 }); };

  document.addEventListener('click', (e) => {
    if (e.target === $('#dlg')) { S.gate = null; closeDlg(); return; }
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, val = el.dataset.val;
    switch (act) {
      case 'tab': go(val); break;
      case 'day': showDay(val); break;
      case 'close': S.gate = null; closeDlg(); break;
      case 'locked': S.gate = { id: val, step: 0 }; showGate(); break;
      case 'gate-next': {
        S.gate.step++;
        if (S.gate.step < GATE_STEPS.length) { showGate(); break; }
        S.unlocked.push(S.gate.id); store.set('unlocked', S.unlocked);
        S.wiz.draft.group = S.gate.id; S.gate = null; closeDlg();
        const dr = S.wiz.draft;
        if (!forGroup(YESHIVAS, dr.group).some((y) => y.id === dr.yeshiva)) dr.yeshiva = 'none';
        if (!forGroup(SHLICHUS, dr.group).some((x) => x.id === dr.shlichus)) dr.shlichus = 'none';
        dr.stance = 'neutral'; render(); break;
      }
      case 'levels-for': closeDlg(); S.lv.iso = val; go('levels'); break;
      case 'wore': {
        const set = new Set(S.worn); set.has(val) ? set.delete(val) : set.add(val);
        S.worn = [...set].sort(); store.set('worn', S.worn); closeDlg(); render(); break;
      }
      case 'cal-prev': S.cal.m--; if (S.cal.m < 0) { S.cal.m = 11; S.cal.y--; } render(); break;
      case 'cal-next': S.cal.m++; if (S.cal.m > 11) { S.cal.m = 0; S.cal.y++; } render(); break;
      case 'cal-today': S.cal = null; render(); break;
      case 'range': S.ev.range = val; render(); break;
      case 'cat': { const c = S.ev.cats, i = c.indexOf(val); i >= 0 ? c.splice(i, 1) : c.push(val); render(); break; }
      case 'lvmode': S.lv.mode = val; render(); break;
      case 'va-reset': S.viewAs = {}; store.set('viewAs', S.viewAs); render(); break;
      case 'wiz': startWizard(stepIndexByName(+val)); break;
      case 'wiz-cancel': go('me'); break;
      case 'wiz-back': S.wiz.step = Math.max(0, S.wiz.step - 1); render(); break;
      case 'pick': {
        const field = el.dataset.field;
        S.wiz.draft[field] = field === 'level' ? +val : field === 'il' ? val === 'true' : val;
        if (field === 'group') {
          const dr = S.wiz.draft;
          if (!forGroup(YESHIVAS, dr.group).some((y) => y.id === dr.yeshiva)) dr.yeshiva = 'none';
          if (!forGroup(SHLICHUS, dr.group).some((x) => x.id === dr.shlichus)) dr.shlichus = 'none';
          if (dr.group !== 'chabad') dr.stance = 'neutral';
        }
        const steps = stepsFor(S.wiz.draft);
        if (field === 'group' && S.wiz.step >= steps.length) S.wiz.step = steps.length - 1;
        render(); break;
      }
      case 'wiz-next': {
        const steps = stepsFor(S.wiz.draft);
        if (S.wiz.step >= steps.length - 1) {
          S.profile = S.wiz.draft; store.set('profile', S.profile);
          S.index = null; S.viewAs = {}; store.set('viewAs', {});
          go('today');
        } else { S.wiz.step++; render(); window.scrollTo({ top: 0 }); }
        break;
      }
      case 'export': {
        const txt = JSON.stringify({ profile: S.profile, worn: S.worn }, null, 2);
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => alert('Copied to clipboard.'), () => prompt('Copy your data:', txt));
        break;
      }
      case 'reset':
        if (confirm('Erase your profile, log and cached calendar from this device?')) {
          ['profile', 'worn', 'viewAs', 'index', 'unlocked'].forEach(store.del);
          S.profile = null; S.worn = []; S.viewAs = {}; S.index = null; S.unlocked = []; render();
        }
        break;
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('[data-ev="q"]')) { S.ev.q = t.value; render(); }
    if (t.matches('[data-wname]')) S.wiz.draft.name = t.value;
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.va) {
      const base = S.profile || DEFAULT_PROFILE, k = t.dataset.va;
      S.viewAs[k] = k === 'level' ? +t.value : t.value;
      if (S.viewAs[k] === base[k]) delete S.viewAs[k];
      store.set('viewAs', S.viewAs); render();
      const d = $('.viewas'); if (d) d.open = true;
    }
    if (t.dataset.lv) {
      if (t.dataset.lv === 'iso' && !t.value) return;
      S.lv[t.dataset.lv] = t.value; render();
    }
  });

  /* ---------- boot ---------- */
  const hash = location.hash.replace('#', '');
  if (['today', 'calendar', 'events', 'levels', 'me'].includes(hash)) S.tab = hash;
  render();
  // Refresh at midnight / when the app is brought back to the foreground
  let lastDay = isoOf(today());
  const refresh = () => { if (isoOf(today()) !== lastDay) { lastDay = isoOf(today()); S.cal = null; render(); } };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  setInterval(refresh, 60000);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
