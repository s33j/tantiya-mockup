/* Flow 2: bet slip, line moved, bet placed, My bets, result breakdown, notifications. */
A.slip = (d) => {
  const { q } = findQ(d.q);
  if (!canBet(q)) { toast(blockReason() || 'This question is not taking bets.'); return; }
  S.slip = { qid: d.q, pick: +d.i, stake: '', moved: null, err: '' };
  S.ph.sheet = { s: 'slip', p: {} };
};
IN.stake = (v) => { S.slip.stake = v.replace(/[^0-9]/g, '').slice(0, 6); S.slip.err = ''; };
A.addStake = (d) => { S.slip.stake = String((+S.slip.stake || 0) + +d.v); S.slip.err = ''; };
function slipCheck() {
  const st = +S.slip.stake || 0;
  if (!st) return 'Enter a stake.';
  if (st > S.balance) return `Not enough coins. Your balance is ${n(S.balance)}.`;
  const today = S.d.bets.filter((b) => b.mine).reduce((t, b) => t + b.stake, 0);
  if (S.stakeLimit && today + st > S.stakeLimit) return `Above your daily stake limit: ${n(today)} of ${n(S.stakeLimit)} coins staked today.`;
  return '';
}
A.place = () => {
  const sl = S.slip; const { q } = findQ(sl.qid);
  const err = slipCheck(); if (err) { sl.err = err; return; }
  // Demo script: the first Yes bet on the BSP December market meets a line move, so "Line moved" can be shown.
  if (!S.lineMoveDone && sl.qid === 'bsp-dec-main' && sl.pick === 0) {
    S.lineMoveDone = true;
    const from = moveLine(q, -165);
    sl.moved = { from, to: q.odds[0] };
    return;
  }
  doPlace();
};
A.acceptMove = () => doPlace();
A.cancelSlip = () => { S.slip = null; S.ph.sheet = null; toast('Bet cancelled. Nothing was staked.'); };
function doPlace() {
  const sl = S.slip; const { q } = findQ(sl.qid);
  placeBet(sl.qid, sl.pick, q.odds[sl.pick], +sl.stake);
  S.ph.sheet = null; S.slip = null;
  go('placed', {});
}

SHEET.slip = {
  id: '2.05', title: 'Bet slip', tag: 'chg',
  idFor() { return S.slip && S.slip.moved ? '2.06' : '2.05'; },
  titleFor() { return S.slip && S.slip.moved ? 'Line moved' : 'Bet slip'; },
  notes: ['Changed from Core Mockups 03: stake, To win and Total return replace "Payout" and the fee line.', 'Odds, To win and Total return are fixed when the bet is placed.',
    'Shows the close time of this question (main and side bets close separately).', 'Line moved (03b changed): if the line moves before the bet is placed, the slip shows old and new odds with Accept and Cancel. In this demo the first Yes bet on the BSP market always triggers it.'],
  mc: ['To win is rounded down to whole coins.', 'Max stake is shown as a placeholder until decided.', 'Line moved shows on any move (a threshold is an open decision).'],
  render() {
    const sl = S.slip; const { m, q } = findQ(sl.qid);
    const a = q.odds[sl.pick]; const st = +sl.stake || 0;
    const win = Odds.toWin(st, a); const tag = oddsTag(q, sl.pick);
    const head = `<div class="xs muted">${esc(m.title)}</div>
      ${q.main ? '' : `<div class="small"><span class="chip neutral">Side bet</span> <b>${esc(q.q)}</b></div>`}
      <div class="rowline"><span class="chip ${sl.pick ? '' : ''}" style="background:${sl.pick ? 'rgba(251,146,60,.16)' : 'rgba(96,165,250,.16)'};color:${sl.pick ? 'var(--oranget)' : 'var(--bluet)'}">${esc(q.labels[sl.pick])}${tag ? ' · ' + tag : ''}</span><span class="big num">${Odds.fmt(a, S.fmt)}</span></div>
      <div class="xs muted">${icon('clock', 12)} ${closeLine(q)}</div>`;
    if (sl.moved) {
      const was = Odds.toWin(st, sl.moved.from);
      return `${head}<div class="moved" role="alert"><div class="b">${icon('info', 16)} Line moved</div>
        <p class="small t2">The line changed before your bet was placed. Nothing has been staked yet.</p>
        <div class="cmp"><span class="h"></span><span class="h">Before</span><span class="h">Now</span>
          <span>Odds</span><span class="num">${Odds.fmt(sl.moved.from, S.fmt)}</span><span class="num now">${Odds.fmt(sl.moved.to, S.fmt)}</span>
          <span>To win</span><span class="num">${n(was)}</span><span class="num now">${n(win)}</span>
          <span>Total return</span><span class="num">${n(st + was)}</span><span class="num now">${n(st + win)}</span></div>
        <p class="xs muted">Stake ${n(st)} coins. Lines move automatically as bets come in (the rule is an open decision).</p></div>
        <div class="outs"><button type="button" class="btn s" data-a="cancelSlip">Cancel</button><button type="button" class="btn p" data-a="acceptMove">Accept new odds</button></div>`;
    }
    const err = sl.err;
    return `${head}
      <div class="field"><label for="stake">Stake</label>
        <div class="stake"><input id="stake" class="inp" inputmode="numeric" autocomplete="off" placeholder="Amount" value="${esc(sl.stake)}" data-in="stake" aria-describedby="stakehelp"><span class="t2">coins</span></div>
        <div class="quick">${[50, 100, 500].map((v) => `<button type="button" class="btn s sm" data-a="addStake" data-v="${v}">+ ${v}</button>`).join('')}</div>
        <span id="stakehelp" class="xs muted">Max stake per bet: ${ph('MAX STAKE')} · balance ${n(S.balance)} coins</span></div>
      <div><div class="kv"><span>To win</span><span class="num">${st ? n(win) + ' coins' : '—'}</span></div>
        <div class="kv"><span>Total return</span><span class="num">${st ? n(st + win) + ' coins' : '—'}</span></div>
        <div class="kv"><span>Odds</span><span class="num">${Odds.american(a)} · ${Odds.decimal(a).toFixed(2)} · ${Math.round(Odds.implied(a) * 100)}%</span></div>
        <div class="kv"><span>Balance after bet</span><span class="num">${st ? n(S.balance - st) + ' coins' : '—'}</span></div></div>
      <p class="xs muted">Odds, To win and Total return are fixed when you place the bet. No fee: the house margin is in the line.</p>
      ${err ? `<p class="small" role="alert" style="color:var(--amber)">${esc(err)}</p>` : ''}
      <button type="button" class="btn p w" data-a="place">${st ? `Place bet · ${n(st)} coins` : 'Place bet'}</button>
      <p class="xs muted" style="text-align:center">Today: ${n(S.topupToday)} of ${n(S.topupLimit)} top-up limit used · <button type="button" class="btn g sm" style="min-height:24px;padding:0" data-a="goLimits">Limits</button></p>`;
  },
};
A.goLimits = () => { S.ph.sheet = null; go('limits', {}); };

SCR.placed = {
  id: '2.07', title: 'Bet placed', tab: 'markets', tag: 'new',
  notes: ['A plain confirmation: no celebration, sound or animation.', 'Repeats the fixed terms of the bet.'],
  mc: ['"View in My bets" and "Back to market" as the two next steps.'],
  render() {
    const b = S.d.bets.find((x) => x.id === S.lastBet);
    if (!b) return { hdr: hdr('Bet placed'), main: '<p class="muted">No bet yet.</p>' };
    const { m, q } = findQ(b.qid); const win = Odds.toWin(b.stake, b.odds);
    return {
      hdr: `<div class="hdr"><button type="button" class="ib" data-a="tab" data-t="markets" aria-label="Close">${icon('close')}</button><h1>Bet placed</h1></div>`,
      main: `<div class="okmark">${icon('check', 26)}</div><p class="title">Your bet is placed</p>
        <div class="card"><div class="xs muted">${esc(m.title)}</div>${q.main ? '' : `<div class="small b" style="margin-top:2px">Side bet: ${esc(q.q)}</div>`}
          <div class="kv"><span>Your pick</span><span>${esc(q.labels[b.pick])} at <span class="num">${Odds.fmt(b.odds, S.fmt)}</span></span></div>
          <div class="kv"><span>Stake</span><span class="num">${n(b.stake)} coins</span></div>
          <div class="kv"><span>To win</span><span class="num">${n(win)} coins</span></div>
          <div class="kv"><span>Total return if right</span><span class="num">${n(b.stake + win)} coins</span></div>
          <div class="kv"><span>Closes</span><span>${when(q.close)}</span></div>
          <div class="kv"><span>Balance now</span><span class="num">${n(S.balance)} coins</span></div></div>
        <p class="xs muted">These terms are fixed. You’ll get a breakdown of every bet in this market when it is finalized.</p>
        <button type="button" class="btn p w" data-a="tab" data-t="bets">View in My bets</button>
        <button type="button" class="btn s w" data-a="goMarket" data-id="${m.id}">Back to market</button>`,
    };
  },
};
A.goMarket = (d) => { S.ph.stack = [{ s: 'markets', p: {} }, { s: 'market', p: { id: d.id } }]; };

function betLine(b, opts = {}) {
  const { m, q } = findQ(b.qid); const o = betOutcome(b); const win = Odds.toWin(b.stake, b.odds);
  const net = o.ret - b.stake;
  const s = qStatus(q);
  const stLabel = o.st === 'open' ? statusChip(q) : outcomeChip(o.st === 'waiting' && s === 'closedEarly' ? 'waiting' : o.st);
  return `<div class="bkrow"><span class="q">${q.main ? 'Main bet' : 'Side bet · ' + esc(q.q)}</span>
    <span class="d">${esc(q.labels[b.pick])} at <span class="num">${Odds.fmt(b.odds, S.fmt)}</span> · stake <span class="num">${n(b.stake)}</span></span>
    <span>${stLabel}</span>
    <span class="d xs">${o.st === 'open' || o.st === 'waiting' ? `To win <span class="num">${n(win)}</span> · return <span class="num">${n(b.stake + win)}</span>` : `Returned <span class="num">${n(o.ret)}</span>`}</span>
    <span class="num b">${o.st === 'open' || o.st === 'waiting' ? '' : 'Net ' + signed(net)}</span></div>`;
}

SCR.bets = {
  id: '2.09', title: 'My bets', tab: 'bets', tag: 'new',
  notes: ['Open shows bets still running or waiting for a result. Settled shows each market with its own net total.', 'Filters: Won, Lost, Push/Void. Losses look the same as wins: no colour for winning, no celebration.',
    'Bets are grouped by market: main bet and side bets together.'],
  mc: ['Net per bet = returned − stake.'],
  render() {
    const tab = S.mbTab; const f = S.mbFilter;
    let body = '';
    if (tab === 'open') {
      const open = S.d.bets.filter((b) => ['open', 'waiting'].includes(betOutcome(b).st)).sort((a, b) => new Date(b.placed) - new Date(a.placed));
      const groups = [...new Set(open.map((b) => findQ(b.qid).m.id))].map(mById);
      body = groups.map((m) => `<button type="button" class="card tap" data-a="${S.d.markets.includes(m) ? 'goMarket' : 'goBreak'}" data-id="${m.id}">
          <div class="meta"><span class="b">${tplLabel(m)}</span>${S.d.past.includes(m) ? '<span>Main market settled</span>' : `<span>${closeLine(mainQ(m))}</span>`}</div>
          <p class="b" style="margin:4px 0 2px;line-height:1.35">${esc(m.title)}</p>
          <div class="bk">${open.filter((b) => findQ(b.qid).m === m).map((b) => betLine(b)).join('')}</div></button>`).join('')
        || '<p class="muted small">No open bets. Bets you place show here until they settle.</p>';
      body += `<p class="xs muted">In play: <span class="num">${n(inPlay())}</span> coins</p>`;
    } else {
      const match = (b) => { const st = betOutcome(b).st; return f === 'all' ? !['open'].includes(st) : f === 'pv' ? ['push', 'void'].includes(st) : st === f; };
      const ms = allMarkets().filter((m) => summary(m).anySettled && betsIn(m).some(match));
      body = `<div class="pills" role="group" aria-label="Filter settled bets">${[['all', 'All'], ['won', 'Won'], ['lost', 'Lost'], ['pv', 'Push/Void']].map(([k, l]) => `<button type="button" class="pill" aria-pressed="${f === k}" data-a="mbf" data-v="${k}">${l}</button>`).join('')}</div>`
        + (ms.map((m) => { const sm = summary(m); return `<button type="button" class="card tap" data-a="goBreak" data-id="${m.id}">
          <div class="meta"><span class="b">${tplLabel(m)}</span><span>${m.finalized ? 'Finalized ' + dateOnly(m.finalized) : 'Partly settled'}</span></div>
          <p class="b" style="margin:4px 0 2px;line-height:1.35">${esc(m.title)}</p>
          <div class="bk">${betsIn(m).filter(match).map((b) => betLine(b)).join('')}</div>
          <div class="rowline" style="border-top:1px solid var(--border);padding-top:8px"><span class="small t2">Market net${sm.final ? '' : ' so far'}</span><span class="num bb">${signed(sm.net)} ${sm.final ? '' : '<span class="chip waiting">Not final</span>'}</span></div></button>`; }).join('') || '<p class="muted small">Nothing here for this filter.</p>');
    }
    return {
      hdr: `<div class="hdr"><h1 style="padding-left:8px">My bets</h1>${fmtChipBtn()}</div>`,
      main: `<nav class="seg"><button type="button" aria-current="${tab === 'open'}" data-a="mbt" data-v="open">Open</button><button type="button" aria-current="${tab === 'settled'}" data-a="mbt" data-v="settled">Settled</button></nav>${body}${sampleNote('Sample bet history')}`,
    };
  },
};
A.mbt = (d) => { S.mbTab = d.v; };
A.mbf = (d) => { S.mbFilter = d.v; };
A.goBreak = (d) => go('breakdown', { id: d.id });

SCR.breakdown = {
  id: '2.10', title: 'Result breakdown', tab: 'bets', tag: 'new',
  idFor(p) { const m = mById(p.id); return m && summary(m).final ? '2.10a' : '2.10b'; },
  titleFor(p) { const m = mById(p.id); return m && summary(m).final ? 'Result breakdown (final)' : 'Result breakdown (not final)'; },
  notes: ['For each bet: stake, odds at bet time, result, amount returned, net win or loss.', 'For the market (main + side bets): total staked, total returned, net.',
    'A side bet still waiting shows "Waiting for result", and the market total is marked "Not final".', 'Losses use the same plain style as wins. Also opened from the result notification.'],
  mc: ['Sources and result notes shown under each question.'],
  render(p) {
    const m = mById(p.id); const sm = summary(m);
    const rows = betsIn(m).map((b) => {
      const { q } = findQ(b.qid); const o = betOutcome(b); const pending = o.st === 'open' || o.st === 'waiting';
      return `<div class="card" style="padding:12px"><div class="rowline"><span class="small b">${q.main ? 'Main bet' : 'Side bet · ' + esc(q.q)}</span></div>
        <div class="kv"><span>Your pick</span><span>${esc(q.labels[b.pick])}</span></div>
        <div class="kv"><span>Odds at bet time</span><span class="num">${Odds.fmt(b.odds, S.fmt)}</span></div>
        <div class="kv"><span>Stake</span><span class="num">${n(b.stake)}</span></div>
        <div class="kv"><span>Result</span><span>${pending ? outcomeChip('waiting') : `${esc(resultText(q, q.result))} · ${outcomeLabel[o.st]}`}</span></div>
        <div class="kv"><span>Returned</span><span class="num">${pending ? '—' : n(o.ret)}</span></div>
        <div class="kv"><span>Net</span><span class="num">${pending ? '—' : signed(o.ret - b.stake)}</span></div>
        <p class="xs muted">${esc(pending ? (q.state === 'closedEarly' ? q.earlyReason + ' Settles after a staff check.' : q.resultNote || 'Waiting for the result.') : q.resultNote)}</p></div>`;
    }).join('');
    return {
      hdr: hdr('Result breakdown'),
      main: `<div class="meta"><span class="b">${tplLabel(m)}</span><span>${m.finalized ? 'Finalized ' + when(m.finalized, true) : ''}</span></div>
        <p class="title">${esc(m.title)}</p>
        ${sm.final ? '' : '<div class="notice">' + icon('wait', 16) + '<span>Not final: at least one side bet is waiting for its result. Totals below will change when it settles.</span></div>'}
        <section class="card totals" aria-label="Market total"><h2 class="small b">Your market total${sm.final ? '' : ' so far'}</h2>
          <div class="kv"><span>Total staked</span><span class="num">${n(sm.staked)} coins</span></div>
          <div class="kv"><span>Total returned</span><span class="num">${n(sm.returned)} coins</span></div>
          <div class="hr"></div><div class="kv"><span>Net</span><span class="num net">${signed(sm.net)} coins</span></div>
          ${sm.final ? '<span class="chip closed">' + icon('check', 12) + 'Final</span>' : '<span class="chip waiting">' + icon('wait', 12) + 'Not final</span>'}</section>
        <h2 class="sec">Each bet</h2>${rows}${sampleNote('Sample values')}`,
    };
  },
};

SCR.notifs = {
  id: '2.12', title: 'Notifications', tab: 'markets', tag: 'new',
  notes: ['Result notification opens the same breakdown as My bets.', 'Plain wording for wins and losses.'],
  mc: ['In-app notifications only; email or push is an open decision.'],
  render() {
    const list = S.d.notifications;
    return {
      hdr: hdr('Notifications'),
      main: list.map((x) => `<button type="button" class="card tap" data-a="openNotif" data-id="${x.id}">
        <div class="rowline"><span class="xs muted">${when(x.at)}</span>${x.read ? '' : '<span class="chip teal">New</span>'}</div>
        <p class="small" style="margin-top:4px">${esc(x.text)}</p>
        ${x.mid ? (() => { const sm = summary(mById(x.mid)); return `<p class="xs t2" style="margin-top:6px">Net ${signed(sm.net)} coins${sm.final ? '' : ' so far · not final'} · View breakdown</p>`; })() : ''}</button>`).join('') || '<p class="muted small">No notifications yet.</p>',
    };
  },
};
A.openNotif = (d) => { const x = S.d.notifications.find((y) => y.id === d.id); x.read = true; if (x.mid) go('breakdown', { id: x.mid }); };
