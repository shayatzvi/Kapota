/* ============================================================
   Kapota Day — "Report an issue / suggestion"
   Corner button -> pick any item on the page -> write a note ->
   opens a pre-filled email. Nothing is sent by the app itself.
   ============================================================ */
(function () {
  'use strict';
  const TO = 'shayatzvi@gmail.com';
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let picking = false, hover = null, picked = null;

  /* ---------- UI ---------- */
  const btn = document.createElement('button');
  btn.className = 'fb-btn'; btn.type = 'button'; btn.textContent = 'Feedback';
  btn.setAttribute('aria-label', 'Report an issue or make a suggestion');
  document.body.appendChild(btn);

  const bar = document.createElement('div');
  bar.className = 'fb-bar'; bar.hidden = true;
  bar.innerHTML = '<span>Tap the part you want to report.</span><button type="button" data-fb="general">Not about one item</button><button type="button" data-fb="cancel">Cancel</button>';
  document.body.appendChild(bar);

  const isOurs = (el) => el && el.closest && (el.closest('.fb-btn') || el.closest('.fb-bar') || el.closest('#fbDlg'));

  function startPick() {
    const d = $('#dlg'); if (d && d.open && d.close) d.close();
    picking = true; bar.hidden = false; btn.hidden = true;
    document.body.classList.add('fb-picking');
  }
  function stopPick() {
    picking = false; bar.hidden = true; btn.hidden = false;
    document.body.classList.remove('fb-picking');
    if (hover) { hover.classList.remove('fb-hover'); hover = null; }
  }

  /* ---------- describing an element ---------- */
  function part(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) return s + '#' + el.id;
    const cls = [...el.classList].filter((c) => !c.startsWith('fb-') && !/^t-/.test(c)).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    const p = el.parentElement;
    if (p) { const same = [...p.children].filter((c) => c.tagName === el.tagName); if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(el) + 1) + ')'; }
    return s;
  }
  function pathOf(el) {
    const parts = []; let n = el;
    while (n && n !== document.body && parts.length < 5) { parts.unshift(part(n)); n = n.parentElement; }
    return parts.join(' > ');
  }
  function describe(el) {
    const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const card = el.closest('.card, .hero, .wiz, dialog, .row, .ev-card');
    const heading = card && card.querySelector('h1, h2, h3');
    const tab = document.querySelector('.tabs button.on');
    return {
      text,
      path: pathOf(el),
      heading: heading ? heading.textContent.trim().slice(0, 80) : '',
      screen: tab ? tab.textContent.trim() : (document.querySelector('.wiz') ? 'Setup form' : ''),
    };
  }

  function profileText() {
    try {
      const p = JSON.parse(localStorage.getItem('kapota.profile') || 'null');
      if (!p) return 'No profile saved yet.';
      const g = (typeof byId === 'function') ? '' : '';
      return ['Community: ' + p.group, 'Level: ' + p.level, p.group === 'chabad' ? 'Stance: ' + p.stance : null, 'Yeshiva: ' + p.yeshiva, 'Shlichus: ' + p.shlichus, 'In Israel: ' + p.il].filter(Boolean).join('\n') + g;
    } catch (e) { return 'Profile unavailable.'; }
  }

  /* ---------- form dialog ---------- */
  let dlg = null;
  function openForm() {
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'fbDlg'; document.body.appendChild(dlg); dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); }
    const it = picked;
    dlg.innerHTML = `<form method="dialog" class="fb-form">
      <div class="eyebrow">Report an issue or suggestion</div>
      <h2>${it ? 'About this item' : 'General feedback'}</h2>
      ${it ? `<div class="fb-item"><div class="muted small">${esc([it.screen, it.heading].filter(Boolean).join(' · '))}</div><div>${esc(it.text || '(no text — an icon or empty area)')}</div></div>` : ''}
      <label>What’s wrong, or what would you change?
        <textarea id="fbNote" rows="5" placeholder="Describe the issue or your suggestion"></textarea></label>
      <label class="fb-check"><input type="checkbox" id="fbProfile" checked> Include my community, level and stance</label>
      <div class="actions">
        <button class="btn ghost" type="button" data-fb="close">Cancel</button>
        <button class="btn ghost" type="button" data-fb="repick">Pick a different item</button>
        <button class="btn primary" type="button" data-fb="send">Open email</button>
      </div>
      <p class="muted small">This opens a draft in your email app. You can read and edit it before sending.</p>
    </form>`;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(() => { const n = $('#fbNote'); if (n) n.focus(); }, 50);
  }

  function composeMail() {
    const note = ($('#fbNote') || {}).value || '';
    const withProfile = !!($('#fbProfile') || {}).checked;
    const it = picked;
    const lines = [note.trim() || '(no description)', ''];
    if (it) {
      lines.push('--- Selected item ---', 'Screen: ' + it.screen);
      if (it.heading) lines.push('Section: ' + it.heading);
      lines.push('Text: "' + it.text + '"', 'Element: ' + it.path, '');
    }
    lines.push('--- Context ---', 'Page: ' + location.href.split('#')[0].replace(/^file:.*\//, ''), 'Date: ' + new Date().toString());
    if (withProfile) lines.push(profileText());
    lines.push('Browser: ' + navigator.userAgent);
    const subject = 'Kapota Day feedback' + (it && it.heading ? ' — ' + it.heading : it && it.screen ? ' — ' + it.screen : '');
    let body = lines.join('\n');
    if (body.length > 1800) body = body.slice(0, 1800) + '…';
    return 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  /* ---------- events ---------- */
  window.KFB = { compose: composeMail };
  btn.addEventListener('click', startPick);

  document.addEventListener('click', (e) => {
    const f = e.target.closest && e.target.closest('[data-fb]');
    if (f) {
      const a = f.dataset.fb;
      if (a === 'cancel') stopPick();
      if (a === 'general') { stopPick(); picked = null; openForm(); }
      if (a === 'close' && dlg) dlg.close();
      if (a === 'repick') { if (dlg) dlg.close(); startPick(); }
      if (a === 'send') { window.location.href = composeMail(); }
      return;
    }
    if (!picking || isOurs(e.target)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const el = e.target;
    picked = describe(el);
    stopPick();
    openForm();
  }, true);

  document.addEventListener('mouseover', (e) => {
    if (!picking || isOurs(e.target)) return;
    if (hover) hover.classList.remove('fb-hover');
    hover = e.target; hover.classList.add('fb-hover');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && picking) stopPick(); });
})();
