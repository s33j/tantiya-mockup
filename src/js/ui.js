/* Shared building blocks for the phone screens. */
function statusChip(q, opts = {}) {
  const s = qStatus(q);
  const map = {
    open: ['open', 'dot', 'Open'],
    closing: ['closing', 'clock', 'Closing'],
    closed: ['closed', 'lock', 'Closed'],
    closedEarly: ['closed', 'lock', 'Closed early'],
    paused: ['paused', 'pause', 'Paused'],
    waiting: ['waiting', 'wait', 'Waiting for result'],
    settled: ['closed', 'check', 'Settled'],
  };
  const [cls, ic, label] = map[s];
  return `<span class="chip ${cls}">${icon(ic, 12)}${label}</span>`;
}
function closeLine(q) {
  const s = qStatus(q);
  if (s === 'closedEarly') return `Closed early · was set to close ${when(q.close)}`;
  if (s === 'paused') return `Paused by staff · closes ${when(q.close)}`;
  if (s === 'closed' || s === 'waiting' || s === 'settled') return `Closed ${when(q.close)}`;
  return `Closes ${when(q.close)}${s === 'closing' ? ' · ' + leftText(q.close) : ''}`;
}
function oddsTag(q, i) { return Odds.tag(q.odds[i], q.odds[1 - i]); }
/* outcome button: i = 0 (blue, first outcome) or 1 (orange, second) */
function outBtn(q, i, opts = {}) {
  const on = canBet(q);
  const a = q.odds[i];
  const tag = oddsTag(q, i);
  const sub = opts.slim ? (tag || '&nbsp;') : `${tag ? tag + ' · ' : ''}100 wins ${n(Odds.toWin(100, a))}`;
  return `<button type="button" class="out ${i ? 'b' : 'a'}${opts.slim ? ' slim' : ''}" ${on ? '' : 'disabled'}
    data-a="slip" data-q="${q.id}" data-i="${i}" aria-label="${esc(q.labels[i])} at ${esc(Odds.fmt(a, S.fmt))}${tag ? ', ' + tag : ''}">
    <span class="l1"><span>${esc(q.labels[i])}</span><span class="odd">${Odds.fmt(a, S.fmt)}</span></span>
    <span class="l2">${sub}</span></button>`;
}
function tplLabel(m) { return TPL[m.tpl]; }
function sampleNote(t = 'Sample values', lines = true) { return `<p class="xs muted">${esc(t)}.${lines ? ' Lines are set automatically from data and move as bets come in.' : ''}</p>`; }
function fmtChipBtn() {
  const lab = { american: 'American', decimal: 'Decimal', implied: 'Implied %' }[S.fmt];
  return `<button type="button" class="pill" data-a="sheet" data-s="fmt" aria-label="Odds format: ${lab}">${icon('gear', 14)}&nbsp;${lab}</button>`;
}
function chart(hist, label) { // first outcome's implied chance from its line, past 7 days
  const W = 350, H = 96;
  const lo = Math.max(0, Math.floor((Math.min(...hist) - 8) / 10) * 10), hi = Math.min(100, Math.ceil((Math.max(...hist) + 8) / 10) * 10);
  const y = (v) => H - 10 - ((v - lo) / (hi - lo)) * (H - 22);
  const pts = hist.map((v, i) => `${(i * (W - 40)) / (hist.length - 1) + 34},${y(v)}`).join(' ');
  const last = pts.split(' ').pop().split(',');
  return `<svg class="chart" role="img" aria-label="${esc(label)}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${[lo, (lo + hi) / 2, hi].map((g) => `<line x1="30" x2="${W}" y1="${y(g)}" y2="${y(g)}" stroke="#24364f"/><text x="0" y="${y(g) + 4}" font-size="11" fill="#9aa8ba">${g}%</text>`).join('')}
    <polyline points="${pts}" fill="none" stroke="#60a5fa" stroke-width="2"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="#60a5fa"/></svg>`;
}
function backBtn() { return `<button type="button" class="ib" data-a="back" aria-label="Back">${icon('back')}</button>`; }
function hdr(title, right = '') { return `<div class="hdr">${backBtn()}<h1>${esc(title)}</h1>${right}</div>`; }
function blockBanner() {
  const r = blockReason();
  if (!r) return '';
  return `<div class="banner" role="status">${icon('pause', 16)}<span>${esc(r)}</span>${S.breakUntil ? '<button type="button" class="btn g sm" data-a="endBreak">End (demo)</button>' : ''}</div>`;
}
function simLabel() { return `<div class="notice sim" role="note">${icon('info', 16)}<span><b>Simulation — no money is charged.</b> Coins are play money: they can’t be bought, cashed out or traded.</span></div>`; }
function resultText(q, r) {
  if (r === 'push') return 'Push';
  if (r === 'void') return 'Void';
  return q.labels[r];
}
const outcomeLabel = { won: 'Won', lost: 'Lost', push: 'Push', void: 'Void', open: 'Open', waiting: 'Waiting for result' };
function outcomeChip(st) {
  const cls = { won: 'neutral', lost: 'neutral', push: 'void', void: 'void', open: 'open', waiting: 'waiting' }[st];
  const ic = { won: 'check', lost: 'x2', push: 'dot', void: 'dot', open: 'dot', waiting: 'wait' }[st];
  return `<span class="chip ${cls}">${icon(ic, 12)}${outcomeLabel[st]}</span>`;
}
