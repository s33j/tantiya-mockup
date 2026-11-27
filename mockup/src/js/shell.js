/* Frames, navigation, rendering and events. */
const TABS = [['markets', 'Markets', 'markets'], ['bets', 'My bets', 'bets'], ['community', 'Community', 'community'], ['wallet', 'Wallet', 'wallet'], ['account', 'Account', 'user']];
const TABROOT = { markets: 'markets', bets: 'bets', community: 'feed', wallet: 'wallet', account: 'account' };
const BANNER = '21+ only · Gambling is addictive. Know when to stop.<span style="display:block">Helpline: [HELPLINE NUMBER]</span>';

const cur = () => S.ph.stack[S.ph.stack.length - 1];
function go(s, p = {}) { S.ph.stack.push({ s, p }); S.ph.sheet = null; S.ph.dialog = null; }
function toast(msg) {
  S.toast = { msg, t: Date.now() };
  const t = S.toast.t;
  setTimeout(() => { if (S.toast && S.toast.t === t) { S.toast = null; render(); } }, 2600);
}
A.go = (d) => go(d.s, d.id ? { id: d.id } : {});
A.back = () => { if (S.ph.dialog) S.ph.dialog = null; else if (S.ph.sheet) S.ph.sheet = null; else if (S.ph.stack.length > 1) S.ph.stack.pop(); };
A.tab = (d) => { S.ph.stack = [{ s: TABROOT[d.t], p: {} }]; S.ph.sheet = null; S.ph.dialog = null; };
A.sheet = (d) => { S.ph.sheet = { s: d.s, p: Object.assign({}, d) }; };
A.closeSheet = () => { S.ph.sheet = null; };
A.dialog = (d) => { S.ph.dialog = { s: d.s, p: Object.assign({}, d) }; };
A.closeDialog = () => { S.ph.dialog = null; };
A.view = (d) => setView(d.v);
A.staff = (d) => { S.st = { s: d.s, p: d.id ? { id: d.id } : {} }; if (S.view !== 'staff') setView('staff'); };
A.reset = () => { const v = S.view, f = S.flow; const fl = FLOWS.find((x) => x.n === f); S = freshState(fl ? fl.persona : 'returning'); S.view = v; S.flow = f; if (fl) fl.steps[0].set(); toast('Demo reset.'); };
A.flow = (d) => startFlow(+d.n);
A.step = (d) => { const f = FLOWS.find((x) => x.n === S.flow); const st = f.steps[+d.i]; st.set(); if (st.frame === 'staff') setView('staff'); else if (S.view !== 'app') setView('app'); };
IN.flowsel = (v) => { S.flow = +v; };

function startFlow(nf) {
  const f = FLOWS.find((x) => x.n === nf);
  if (f.persona && S.persona !== f.persona) { const fmt = S.fmt; S = freshState(f.persona); S.fmt = fmt; }
  S.flow = nf;
  f.steps[0].set();
  setView(f.steps[0].frame === 'staff' ? 'staff' : 'app');
}
function setView(v) {
  S.view = v;
  const name = v === 'app' || v === 'staff' ? (S.flow ? 'flow-' + S.flow : v) : v;
  if (location.hash.slice(1) !== name) { try { history.replaceState(null, '', '#' + name); } catch (e) { /* sandboxed */ } }
}
function fromHash() {
  const h = location.hash.slice(1);
  const m = /^flow-(\d)$/.exec(h);
  if (m && FLOWS.find((x) => x.n === +m[1])) { startFlow(+m[1]); return; }
  if (['start', 'app', 'staff', 'decisions'].includes(h)) S.view = h;
}

/* ---- screen info for the presenter rail and notes ---- */
function curInfo() {
  if (S.view === 'staff') { const d = STAFF[S.st.s]; return { id: d.idFor ? d.idFor(S.st.p) : d.id, title: d.title, tag: d.tag, notes: d.notes, mc: d.mc }; }
  const layer = S.ph.dialog ? [DLG[S.ph.dialog.s], S.ph.dialog.p] : S.ph.sheet ? [SHEET[S.ph.sheet.s], S.ph.sheet.p] : [SCR[cur().s], cur().p];
  const [d, p] = layer;
  return { id: d.idFor ? d.idFor(p || {}) : d.id, title: d.titleFor ? d.titleFor(p || {}) : d.title, tag: d.tag, notes: d.notes || [], mc: d.mc || [] };
}
const TAGTXT = { new: ['new', 'New'], chg: ['chg', 'Changed'], reuse: ['', 'Reused'] };

function renderNotes() {
  const i = curInfo(); const [cls, txt] = TAGTXT[i.tag] || TAGTXT.reuse;
  return `<aside class="notes" aria-label="Screen notes"><div class="sid">Screen ${esc(i.id)}</div><h3>${esc(i.title)}</h3><span class="tag ${cls}">${txt}</span>
    <ul>${i.notes.map((x) => `<li>${esc(x)}</li>`).join('')}${i.mc.map((x) => `<li class="mc">${esc(x)} <i>My choice, needs confirmation.</i></li>`).join('')}</ul></aside>`;
}
function renderRail() {
  const f = FLOWS.find((x) => x.n === S.flow) || FLOWS[1];
  const id = curInfo().id;
  return `<nav class="rail" aria-label="Flow steps"><h2>Flow</h2>
    <select aria-label="Choose a flow" data-in="flowsel">${FLOWS.map((x) => `<option value="${x.n}" ${x.n === f.n ? 'selected' : ''}>${x.n} · ${esc(x.title)}</option>`).join('')}</select>
    <ol>${f.steps.map((s, i) => `<li><button type="button" data-a="step" data-i="${i}" ${s.id === id ? 'aria-current="step"' : ''}><span class="sid">${esc(s.id)}</span><span>${esc(s.label)}</span></button></li>`).join('')}</ol>
    <p class="hint">Click inside the phone as a user would, or jump to a step here. ${f.level === 'static' ? 'This flow may be static in places.' : ''}</p>
    <button type="button" class="btn s sm w" style="margin-top:10px" data-a="flow" data-n="${f.n}">Restart this flow</button></nav>`;
}

/* ---- phone ---- */
function renderPhone() {
  const c = cur(); const def = SCR[c.s];
  const r = def.render(c.p || {});
  const tab = def.tab;
  const tabbar = def.tabbar === false ? '' : `<nav class="tabbar" aria-label="Main">${TABS.map(([k, l, ic]) => `<button type="button" data-a="tab" data-t="${k}" ${tab === k ? 'aria-current="page"' : ''}>${icon(ic, 22)}<span>${l}</span></button>`).join('')}</nav>`;
  let layer = '';
  if (S.ph.sheet) {
    const sd = SHEET[S.ph.sheet.s];
    layer += `<div class="sheetwrap"><button type="button" class="scrim" data-a="closeSheet" aria-label="Close"></button><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(sd.titleFor ? sd.titleFor() : sd.title)}"><div class="grab"></div>
      <div class="sh"><h2>${esc(sd.titleFor ? sd.titleFor() : sd.title)}</h2><button type="button" class="ib" data-a="closeSheet" aria-label="Close">${icon('close')}</button></div>
      <div class="sb" data-keep="sheet-${S.ph.sheet.s}">${sd.render(S.ph.sheet.p)}</div></div></div>`;
  }
  if (S.ph.dialog) {
    const dd = DLG[S.ph.dialog.s];
    layer += `<div class="dialogwrap"><div class="scrim"></div><div class="dialog" role="alertdialog" aria-modal="true" aria-label="${esc(dd.title)}">${dd.render(S.ph.dialog.p)}</div></div>`;
  }
  const t = S.toast && S.view === 'app' ? `<div class="toast" role="status">${icon('info', 16)}${esc(S.toast.msg)}</div>` : '';
  return `<div class="phone"><div class="screen">${r.hdr || ''}<div class="main" data-keep="${c.s}-${esc(JSON.stringify(c.p || {}))}">${r.main}</div>${r.bar || ''}
    ${def.banner === false ? '' : `<footer class="foot21">${BANNER}</footer>`}${tabbar}${layer}${t}</div></div>`;
}

/* ---- staff ---- */
const SNAV = [['kyc', 'KYC review'], ['lines', 'Lines & exposure'], ['builder', 'Market builder'], ['resolution', 'Resolution queue'], ['moderation', 'Moderation queue'], ['withdrawals', 'Withdrawal approvals'], ['users', 'Users'], ['audit', 'Audit log']];
function renderDesk() {
  const d = STAFF[S.st.s];
  const t = S.toast && S.view === 'staff' ? `<div class="toast" role="status">${icon('info', 16)}${esc(S.toast.msg)}</div>` : '';
  return `<div class="desk" style="position:relative"><div class="deskbar"><i></i><i></i><i></i><span>Tantiya Staff · separate staff app · ${ph('STAFF URL')}</span></div>
    <div class="sapp"><nav class="snav" aria-label="Staff"><div class="wmk">Tantiya Staff</div><div class="who">[REVIEWER 1] · KYC reviewer + admin · two-step sign-in on</div>
      ${SNAV.map(([k, l]) => `<button type="button" data-a="staff" data-s="${k}" ${S.st.s === k ? 'aria-current="page"' : ''}><span>${l}</span>${staffCount(k) ? `<span class="cnt">${staffCount(k)}</span>` : ''}</button>`).join('')}
      <div class="grp">Sample data · English only</div></nav>
      <main class="sbody" data-keep="staff-${S.st.s}">${d.render(S.st.p || {})}</main></div>${t}</div>`;
}

/* ---- top level ---- */
function renderTop() {
  const nav = [['start', 'Start'], ['app', 'User app'], ['staff', 'Staff console'], ['decisions', 'Decisions board']];
  return `<header class="top"><span class="wm">Tantiya<small>Clickable mockup · Dec 1, 2026 review</small></span>
    <nav class="topnav" aria-label="Views">${nav.map(([k, l]) => `<button type="button" data-a="view" data-v="${k}" ${S.view === k ? 'aria-current="page"' : ''}>${l}</button>`).join('')}</nav>
    <span class="grow"></span><span class="persona">Demo user: ${S.persona === 'new' ? 'new account' : 'Ana S. (sample history)'} · sample values</span>
    <button type="button" class="tb" data-a="reset">Reset demo</button></header>`;
}
function render() {
  const app = document.getElementById('app');
  // keep focus and scroll positions across re-renders
  const ae = document.activeElement; const fid = ae && ae.id; const sel = fid && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  const scrolls = {}; document.querySelectorAll('[data-keep]').forEach((el) => { scrolls[el.dataset.keep] = el.scrollTop; });
  const winY = window.scrollY;
  let body;
  if (S.view === 'start') body = renderStart();
  else if (S.view === 'decisions') body = renderDecisions();
  else if (S.view === 'staff') body = `<div class="stage staffv"><div class="fitbox"><div class="fit" data-w="1280" data-h="832" data-mode="w"><div class="dev">${renderDesk()}</div></div></div>
      <div class="staffnotes" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px">${renderRail()}${renderNotes()}</div></div>`;
  else body = `<div class="stage">${renderRail()}<div class="fitbox"><div class="fit" data-w="410" data-h="864"><div class="dev">${renderPhone()}</div></div></div>${renderNotes()}</div>`;
  app.innerHTML = renderTop() + body;
  fit();
  document.querySelectorAll('[data-keep]').forEach((el) => { if (scrolls[el.dataset.keep] != null) el.scrollTop = scrolls[el.dataset.keep]; });
  window.scrollTo(0, winY);
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* not a text input */ } } } }
}
function fit() {
  document.querySelectorAll('.fit').forEach((el) => {
    const w = +el.dataset.w, h = +el.dataset.h;
    const availW = el.parentElement.clientWidth;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const availH = Math.max(420, window.innerHeight - Math.min(top, 140) - 16);
    let s = Math.min(1, availW / w);
    if (el.dataset.mode !== 'w') s = Math.min(s, availH / h);
    s = Math.max(0.42, s);
    el.style.width = w * s + 'px'; el.style.height = h * s + 'px';
    el.firstElementChild.style.transform = `scale(${s})`;
  });
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.a];
  if (!fn) return;
  if (el.tagName === 'A' || el.type === 'submit') e.preventDefault();
  fn(Object.assign({}, el.dataset), el, e);
  render();
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-in]');
  if (!el) return;
  IN[el.dataset.in](el.type === 'checkbox' ? el.checked : el.value, el);
  render();
});
document.addEventListener('submit', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.view === 'app' && (S.ph.sheet || S.ph.dialog)) { A.back(); render(); }
});
window.addEventListener('resize', fit);
window.addEventListener('hashchange', () => { fromHash(); render(); });

S = freshState();
fromHash();
render();
