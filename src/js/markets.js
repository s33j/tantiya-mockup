/* Flow 2: market list, Yes/No and over/under market pages with side bets, odds format sheet. */
const FILTERS = [['all', 'All'], ['fuel', 'Fuel'], ['cpi', 'Inflation'], ['bsp', 'BSP rates'], ['fx', 'FX'], ['wx', 'Weather'], ['closing', 'Closing soon']];

SCR.markets = {
  id: '2.01', title: 'Market list', tab: 'markets', tag: 'chg',
  notes: ['Changed from Core Mockups 01: American lines replace "100 → 237" payouts and the 10% fee.',
    'Llamado = favourite (negative odds), Dehado = underdog (positive). Equal lines get no label.',
    'Pool size and bettor count kept. Each card shows how many side bets the market has.',
    'Status uses colour + icon: green Open, amber Closing (inside 72 h), grey Closed.'],
  mc: ['Amber "Closing" starts 72 hours before close.', 'Bell for notifications and a Leaderboard link in the header.', 'Tab bar: Markets · My bets · Community · Wallet · Account (Watchlist moves to a later version).'],
  render() {
    const f = S.filter;
    const list = S.d.markets.filter((m) => f === 'all' || (f === 'closing' ? marketStatus(m) === 'closing' : m.tpl === f));
    const cards = list.map((m) => {
      const q = mainQ(m), sides = sideQs(m).length;
      return `<article class="card mcard">
        <div class="meta">${statusChip(q)}<span class="b">${tplLabel(m)}</span><span>${closeLine(q)}</span></div>
        <button type="button" class="card tap" style="border:0;padding:0;background:none" data-a="go" data-s="market" data-id="${m.id}"><p class="q">${esc(m.title)}</p></button>
        <div class="outs">${outBtn(q, 0, { slim: true })}${outBtn(q, 1, { slim: true })}</div>
        <div class="foot"><span>Pool <b class="num t2">${n(q.pool)} coins</b></span><span><b class="num t2">${n(q.bettors)}</b> bettors</span>${sides ? `<button type="button" class="btn g sm" style="min-height:24px;padding:0" data-a="go" data-s="market" data-id="${m.id}">+${sides} side bets</button>` : ''}<span>Source: ${esc(m.source.split(' ')[0] === 'Oil' ? 'DOE' : m.source.split(' ')[0])}</span></div>
      </article>`;
    }).join('') || '<p class="muted">No markets match this filter.</p>';
    return {
      hdr: `<div class="hdr"><span class="wmk">Tantiya</span>
        <button type="button" class="bal" data-a="tab" data-t="wallet" aria-label="Balance ${n(S.balance)} coins, open wallet">${n(S.balance)} coins</button>
        <button type="button" class="ib" data-a="go" data-s="leaderboard" aria-label="Leaderboard">${icon('chart')}</button>
        <button type="button" class="ib" data-a="go" data-s="notifs" aria-label="Notifications, ${unread()} unread">${icon('bell')}${unread() ? `<span class="dot">${unread()}</span>` : ''}</button></div>`,
      main: `${blockBanner()}<div class="pills" role="group" aria-label="Filter markets">${FILTERS.map(([k, l]) => `<button type="button" class="pill" aria-pressed="${f === k}" data-a="filter" data-v="${k}">${l}</button>`).join('')}</div>
        <div class="rowline"><span class="xs muted">All times PHT · sample values</span>${fmtChipBtn()}</div>${cards}`,
    };
  },
};
A.filter = (d) => { S.filter = d.v; };

function sideBetRow(m, q) {
  const s = qStatus(q);
  const closedish = !['open', 'closing'].includes(s);
  return `<div class="sbet">
    <div class="rowline"><span class="q">${esc(q.q)}</span>${statusChip(q)}</div>
    <div class="xs muted">${closeLine(q)}</div>
    ${s === 'closedEarly' ? `<div class="reason">${icon('info', 14)} ${esc(q.earlyReason)} Settles after a staff check.</div>` : ''}
    ${s === 'paused' ? '<div class="reason">Paused by staff. Bets already placed stay as they are.</div>' : ''}
    ${closedish ? '' : `<div class="outs">${outBtn(q, 0, { slim: true })}${outBtn(q, 1, { slim: true })}</div>`}
    <div class="xs muted">Pool <span class="num t2">${n(q.pool)} coins</span> · <span class="num t2">${n(q.bettors)}</span> bettors · Answer known: ${esc(q.answerAt)}</div>
  </div>`;
}

SCR.market = {
  id: '2.03', title: 'Market page', tab: 'markets', tag: 'chg',
  notes: ['Changed from Core Mockups 02 (Yes/No) and 04 (numeric bands → over/under line).',
    'The main line sits in the bottom bar. Side bets have their own line, close time, pool and bettor count, and settle on their own.',
    'Close times are set when the market is built and must fall before the answer can become known.',
    'A side bet closes early on its own when its answer becomes known, when staff pause it, or when it is voided. Example: PHP/USD market.',
    'Discussion tab = the Community posts tagged to this market.'],
  mc: ['Chart shows the first outcome’s implied chance from its line over 7 days.', '"100 wins X" helper under each line.'],
  idFor(p) { const m = mById(p.id); return m && m.kind === 'ou' ? '2.04' : '2.03'; },
  titleFor(p) { const m = mById(p.id); return m && m.kind === 'ou' ? 'Over/under market' : 'Yes/No market'; },
  render(p) {
    const m = mById(p.id); const q = mainQ(m);
    const tab = S.marketTab[m.id] || 'market';
    const mine = betsIn(m);
    const posts = S.d.posts.filter((x) => x.mid === m.id && !x.hidden);
    const sides = sideQs(m);
    const ou = m.kind === 'ou';
    let body;
    if (tab === 'discussion') {
      body = `<div class="rowline"><span class="small t2">${posts.length} post${posts.length === 1 ? '' : 's'} about this market</span><button type="button" class="btn s sm" data-a="compose" data-mid="${m.id}">${icon('plus', 16)} New post</button></div>
        ${posts.map((x) => postCard(x, { compact: true })).join('') || '<p class="muted small">No posts yet.</p>'}`;
    } else {
      body = `
      <div class="rowline" style="align-items:flex-end"><div>
        <div class="big"><span class="ocolA">${Odds.fmt(q.odds[0], S.fmt)}</span> <span class="small t2">${q.labels[0]}</span> &nbsp; <span class="ocolB">${Odds.fmt(q.odds[1], S.fmt)}</span> <span class="small t2">${q.labels[1]}</span></div>
        <div class="xs muted">${ou ? 'Line 3.5% · equal odds, so no Llamado/Dehado' : `${q.labels[0]} is ${oddsTag(q, 0)} · opened at ${Odds.fmt(q.open[0], S.fmt)} / ${Odds.fmt(q.open[1], S.fmt)}`}</div></div>${fmtChipBtn()}</div>
      ${chart(m.hist, `${q.labels[0]} implied chance over the past week, from ${m.hist[0]}% to ${m.hist[m.hist.length - 1]}%`)}
      <div class="xs muted">${q.labels[0]} implied chance from the line, past 7 days</div>
      <div class="tiles"><div class="tile"><div class="k">Pool</div><div class="v">${n(q.pool)}</div></div><div class="tile"><div class="k">Bettors</div><div class="v">${n(q.bettors)}</div></div><div class="tile"><div class="k">Closes</div><div class="v">${dateOnly(q.close).replace(', 2026', '')}</div></div></div>
      ${mine.length ? `<button type="button" class="card tap" data-a="tab" data-t="bets"><div class="rowline"><span class="small">You have ${mine.length} bet${mine.length > 1 ? 's' : ''} in this market</span>${icon('chev', 16)}</div></button>` : ''}
      ${sides.length ? `<h2 class="sec">Side bets <span class="muted" style="font-weight:400">· each has its own line and close time, and settles on its own</span></h2>${sides.map((x) => sideBetRow(m, x)).join('')}` : ''}
      <section class="card"><h2 class="small b">How this resolves</h2><p class="small t2" style="margin-top:4px">${esc(m.rules)}</p>
        <p class="xs muted" style="margin-top:6px">Source: ${esc(m.source)} · answer known: ${esc(q.answerAt)}</p></section>
      ${sampleNote()}`;
    }
    return {
      hdr: `<div class="hdr">${backBtn()}<h1 class="sr">${esc(m.title)}</h1><span style="flex:1"></span><button type="button" class="ib" data-a="sheet" data-s="share" data-mid="${m.id}" aria-label="Share">${icon('share')}</button></div>`,
      main: `${blockBanner()}<div class="meta">${statusChip(q)}<span class="b">${tplLabel(m)}</span><span>${closeLine(q)}</span></div>
        <p class="title">${esc(m.title)}</p>
        <nav class="seg" aria-label="Market sections"><button type="button" aria-current="${tab === 'market'}" data-a="mtab" data-id="${m.id}" data-v="market">Market</button><button type="button" aria-current="${tab === 'discussion'}" data-a="mtab" data-id="${m.id}" data-v="discussion">Discussion (${posts.length})</button></nav>
        ${body}`,
      bar: tab === 'market' ? `<div class="bar" style="display:block"><div class="xs muted" style="margin-bottom:6px">Main line · ${closeLine(q)}</div><div class="outs">${outBtn(q, 0)}${outBtn(q, 1)}</div></div>` : '',
    };
  },
};
A.mtab = (d) => { S.marketTab[d.id] = d.v; };

SHEET.fmt = {
  id: '2.02', title: 'Odds format', tag: 'new',
  notes: ['American is the default (decided Nov 27). Decimal and implied % are toggles.', 'Applies everywhere: lists, market pages, bet slip, My bets.'],
  mc: ['Implied % includes the house margin, so both sides add up to more than 100%.'],
  render() {
    const opts = [['american', 'American', '−150 / +130'], ['decimal', 'Decimal', '1.67 / 2.30'], ['implied', 'Implied %', '60% / 43%']];
    return `${opts.map(([k, l, ex]) => `<label class="radio" data-on="${S.fmt === k}"><input type="radio" name="fmt" ${S.fmt === k ? 'checked' : ''} data-a="setfmt" data-v="${k}"><span style="flex:1">${l}</span><span class="small muted num">${ex}</span></label>`).join('')}
      <p class="xs muted">Example: BSP December meeting, sample values. Odds are fixed when you place a bet, whatever format you view them in.</p>
      <button type="button" class="btn p w" data-a="closeSheet">Done</button>`;
  },
};
A.setfmt = (d) => { S.fmt = d.v; };
