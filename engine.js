/* ============================================================
   Kapota Day — engine (pure logic: Hebrew dates, scoring)
   ============================================================ */
(function (g) {
  const FMT_EN = new Intl.DateTimeFormat('en-u-ca-hebrew-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
  const FMT_HE = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });

  const MONTH_DISPLAY = {
    Tishri: 'Tishrei', Heshvan: 'Cheshvan', Kislev: 'Kislev', Tevet: 'Teves', Shevat: 'Shevat',
    'Adar I': 'Adar I', Adar: 'Adar', Nisan: 'Nissan', Iyar: 'Iyar', Sivan: 'Sivan',
    Tamuz: 'Tammuz', Av: 'Av', Elul: 'Elul',
  };

  function normMonth(m) {
    m = String(m).trim();
    if (m === 'Adar II') return 'Adar';
    if (m === 'Tishrei') return 'Tishri';
    if (m === 'Cheshvan' || m === 'Marcheshvan') return 'Heshvan';
    if (m === 'Teves') return 'Tevet';
    if (m === 'Shvat') return 'Shevat';
    if (m === 'Tammuz') return 'Tamuz';
    return m;
  }

  const hebCache = new Map();
  function hebParts(date) {
    const key = isoOf(date);
    if (hebCache.has(key)) return hebCache.get(key);
    const p = {};
    for (const x of FMT_EN.formatToParts(date)) p[x.type] = x.value;
    const out = { d: +p.day, m: normMonth(p.month), y: +(p.year || p.relatedYear), raw: p.month };
    hebCache.set(key, out);
    return out;
  }
  function hebText(date, lang) {
    if (lang === 'he') return FMT_HE.format(date);
    const h = hebParts(date);
    return h.d + ' ' + (MONTH_DISPLAY[h.m] || h.m) + ' ' + h.y;
  }
  function hebDayHe(date) {
    return new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric' }).format(date);
  }

  /* ---- date helpers (always local noon to dodge DST) ---- */
  function noon(d) { const x = new Date(d); x.setHours(12, 0, 0, 0); return x; }
  function isoOf(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fromIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return noon(x); }

  /* ---- events on a date ---- */
  function eventsFor(date, il) {
    date = noon(date);
    const h = hebParts(date);
    const ctx = { m: h.m, d: h.d, y: h.y, dow: date.getDay(), il: !!il };
    if (h.m === 'Tevet' && h.d <= 3) ctx.kislevLen = hebParts(addDays(date, -h.d)).d;
    const out = [];
    for (const ev of EVENTS) {
      if (ev.il === 'only' && !il) continue;
      if (ev.il === 'not' && il) continue;
      let n = null;
      if (ev.match) n = ev.match(ctx);
      else {
        const ds = Array.isArray(ev.d) ? ev.d : [ev.d];
        if (ev.m === h.m && ds.includes(h.d)) n = ds.indexOf(h.d) + 1;
      }
      if (n) out.push({ ev, n });
    }
    return { date, heb: h, dow: ctx.dow, events: out };
  }

  /* ---- scoring ---- */
  const byId = (arr, id) => arr.find((x) => x.id === id) || arr[arr.length - 1];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // soften the ceiling so the biggest days stay distinguishable from merely big ones
  const squash = (v) => (v > 7 ? 7 + (v - 7) * 0.6 : v);

  function scoreEvent(ev, p) {
    const G = byId(GROUPS, p.group), Y = byId(YESHIVAS, p.yeshiva), SH = byId(SHLICHUS, p.shlichus);
    const L = LEVELS[clamp(p.level, 0, 5)];
    const why = [];
    let s = ev.w;
    const add = (label, delta) => { s += delta; if (Math.abs(delta) >= 0.25) why.push({ label, delta }); };
    const isChabad = p.group === 'chabad';

    if (ev.cat === 'chabad') {
      if (isChabad) add('Your Rebbeim, your day', 1);
      else add(p.level >= 4 ? 'Not your court (but you respect it)' : 'Not your community’s day', p.level >= 4 ? -3 : -4.5);
    } else if (ev.groups) {
      if (ev.groups.includes(p.group)) add('Native to your world', 1.5);
      else if (['chassidic', 'yeshivish'].includes(ev.cat)) add('Another community’s day', -3.5);
    }
    if (ev.bias && ev.bias[p.group] != null) add('Your community’s take on it', ev.bias[p.group]);

    add('Level: ' + L.label, (L.v - 2.5) * 0.95);
    add(G.label + ' wardrobe culture', (G.kapota - 0.6) * 1.5);

    const yAdj = (isChabad && ev.cat === 'chabad') ? Y.chabad : Y.gen;
    add('Yeshiva background', yAdj);

    if (ev.pub) add('Public-facing day on shlichus', SH.pub);
    else if (isChabad && ev.cat === 'chabad') add('Shlichus', SH.chabad);
    else add('Shlichus', SH.gen);

    if (isChabad && p.stance === 'detroiter' && ev.cat === 'chabad' && !(ev.tags && ev.tags.includes('rebbe'))) {
      add('Detroiter: a Chabad date is a reason to farbreng', 0.5);
    }
    if (isChabad && ev.tags) {
      const st = p.stance;
      if (ev.tags.includes('rebbe')) {
        if (st === 'meshichist') add('Meshichist: Rebbe days run extra deep', 1.5);
        if (st === 'anti') add('Anti-meshichist: a quieter observance', -1.5);
        if (st === 'detroiter') add('Detroiter: Rebbe-centered days are not your thing', -2.5);
      }
      if (ev.tags.includes('yechi')) {
        if (st === 'meshichist') add('Meshichist: full-volume celebration', 1.2);
        if (st === 'anti') add('Anti-meshichist: you may skip the Yechi scene', -2);
        if (st === 'detroiter') add('Detroiter: you are skipping the Yechi scene', -3.5);
      }
      if (ev.tags.includes('geulah') && st === 'meshichist') add('Meshichist: Moshiach’s Seudah', 1);
      if (ev.tags.includes('geulah') && st === 'detroiter') add('Detroiter: not your Moshiach’s Seudah', -1.5);
    }
    return { ev, score: squash(clamp(s, 0, 10)), why };
  }

  function baselineScore(p) {
    const G = byId(GROUPS, p.group), L = LEVELS[clamp(p.level, 0, 5)];
    const why = [];
    const s = 1 + 6.5 * G.daily * (0.4 + 0.12 * L.v);
    if (G.daily >= .5) why.push({ label: G.label + ' = weekday coat culture', delta: s - 1 });
    else why.push({ label: 'Regular weekday', delta: 0 });
    why.push({ label: 'Level: ' + L.label, delta: 0 });
    return { ev: { id: 'weekday', n: 'Regular weekday', cat: 'general', w: 1, note: 'Nothing special on the calendar.' }, score: clamp(s, 0, 10), why, baseline: true };
  }

  function tierOf(score) { for (let i = 0; i < TIERS.length; i++) if (score >= TIERS[i].min) return i; return TIERS.length - 1; }

  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  function outfitFor(group, tier) {
    const G = byId(GROUPS, group);
    if (G.kapota >= 0.7) return OUTFITS.kapota[tier];
    if (group === 'sefardi') return OUTFITS.sefardi[tier];
    return OUTFITS.plain[tier];
  }

  /* Full verdict for a date + profile */
  function verdictFor(date, profile) {
    const info = eventsFor(date, profile.il);
    const scored = info.events.map(({ ev, n }) => Object.assign(scoreEvent(ev, profile), { n }));
    const base = baselineScore(profile);
    const all = scored.concat(info.events.length ? [] : [base]).sort((a, b) => b.score - a.score);
    // consider baseline too, in case events are weak (e.g. Rosh Chodesh for Satmar on a weekday)
    if (info.events.length && base.score > all[0].score) all.unshift(base);
    let total = all[0].score;
    let bonus = 0;
    for (let i = 1; i < all.length; i++) if (all[i].score >= 3 && !all[i].baseline) bonus += 0.3;
    total = clamp(total + Math.min(1, bonus), 0, 10);
    const tier = tierOf(total);
    const iso = isoOf(info.date);
    const quips = QUIPS[tier];
    return {
      date: info.date, iso, heb: info.heb, dow: info.dow,
      score: total, tier, tierInfo: TIERS[tier],
      top: all[0], items: all, hasEvents: info.events.length > 0,
      outfit: outfitFor(profile.group, tier),
      quip: quips[hashStr(iso + profile.group) % quips.length],
      comment: (profile.group === 'chabad' && profile.stance === 'detroiter') ? DETROITER_COMMENT : null,
    };
  }

  /* ---- Index of the Hebrew year(s) ---- */
  function findRoshHashana(fromDate, dir) {
    let d = noon(fromDate);
    for (let i = 0; i < 400; i++) {
      const h = hebParts(d);
      if (h.m === 'Tishri' && h.d === 1) return d;
      d = addDays(d, dir);
    }
    return d;
  }

  function buildIndex(il, today) {
    const start = findRoshHashana(today, -1);
    const y = hebParts(start).y;
    const rh1 = findRoshHashana(addDays(start, 350), 1);   // year y+1 (a year is 353-385 days)
    const end = findRoshHashana(addDays(rh1, 350), 1);      // year y+2 (exclusive bound)
    const days = [];
    for (let d = start; d < end; d = addDays(d, 1)) {
      const info = eventsFor(d, il);
      if (info.events.length) days.push({ iso: isoOf(d), events: info.events.map((x) => [x.ev.id, x.n]) });
    }
    return { v: 3, il: !!il, from: isoOf(start), mid: isoOf(rh1), to: isoOf(end), year: y, days };
  }

  g.KD = {
    hebParts, hebText, hebDayHe, MONTH_DISPLAY, eventsFor, verdictFor, scoreEvent, baselineScore,
    tierOf, noon, isoOf, fromIso, addDays, buildIndex, byId, clamp,
  };
})(globalThis);
