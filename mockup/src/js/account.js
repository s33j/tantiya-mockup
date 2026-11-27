/* Account tab, plus flow 7: leaderboard and analytics with the metric as a placeholder. */
SCR.account = {
  id: 'A.01', title: 'Account', tab: 'account', tag: 'chg',
  notes: ['Hub for the profile, safer-play tools, analytics, leaderboard and odds format.', 'Status stays "Approved" after the Task 9 flow.'],
  mc: ['Layout of this hub.'],
  render() {
    const u = S.d.people[me];
    return {
      hdr: `<div class="hdr"><h1 style="padding-left:8px">Account</h1></div>`,
      main: `<div style="display:flex;gap:14px;align-items:center"><span class="av lg" aria-hidden="true">${initials(u.name)}</span><div><p class="title">${esc(u.name)}</p><span class="ver">${icon('check', 12)}Verified · Approved</span></div></div>
        <div class="card" style="padding:2px 14px">
          <button type="button" class="listbtn" data-a="go" data-s="profile" data-id="${me}">${icon('user', 20)}<span>Community profile<span class="sub">${u.posts} posts · ${u.forecasts} forecasts</span></span><span class="chev">${icon('chev', 16)}</span></button>
          <button type="button" class="listbtn" data-a="go" data-s="analytics">${icon('chart', 20)}<span>My analytics</span><span class="chev">${icon('chev', 16)}</span></button>
          <button type="button" class="listbtn" data-a="go" data-s="leaderboard">${icon('list', 20)}<span>Leaderboard</span><span class="chev">${icon('chev', 16)}</span></button>
          <button type="button" class="listbtn" data-a="sheet" data-s="fmt">${icon('gear', 20)}<span>Odds format<span class="sub">${{ american: 'American', decimal: 'Decimal', implied: 'Implied %' }[S.fmt]}</span></span><span class="chev">${icon('chev', 16)}</span></button>
          <button type="button" class="listbtn" data-a="go" data-s="safer">${icon('shield', 20)}<span>Limits and breaks<span class="sub">Limits, time reminder, cooling-off, self-exclusion</span></span><span class="chev">${icon('chev', 16)}</span></button></div>
        <div class="card" style="padding:4px 14px"><div class="kv"><span>Email</span><span>ana@example.com</span></div><div class="kv"><span>Account status</span><span>Approved</span></div><div class="kv"><span>Language</span><span>English (Filipino paused)</span></div></div>
        <button type="button" class="btn g" data-a="noop">Sign out</button>`,
    };
  },
};

const LB = [['Rina D.', 63], ['Paolo M.', 41], ['Mara L.', 55], ['Joy C.', 18], ['Ana S.', 10], ['Ken V.', 27], ['Lea P.', 33]];
SCR.leaderboard = {
  id: '7.01', title: 'Leaderboard', tab: 'markets', tag: 'chg',
  notes: ['The proposal ranks by accuracy (Brier score). Under fixed odds the metric is undecided, so it shows as a placeholder (decision board).', 'Never ranks by coins won.'],
  mc: ['Minimum 10 settled forecasts to appear.', 'Week / Month / All time tabs.'],
  render() {
    return {
      hdr: hdr('Leaderboard'),
      main: `<div class="notice">${icon('info', 16)}<span>Ranking metric: ${ph('LEADERBOARD METRIC')}. Under fixed odds a Brier score needs rethinking, so ranks below are placeholders. Coins won are never ranked.</span></div>
        <nav class="seg"><button type="button" aria-current="true">Month</button><button type="button" aria-current="false">Week</button><button type="button" aria-current="false">All time</button></nav>
        <div>${LB.map(([name, f], i) => `<div class="lb"><span class="num muted">${i + 1}</span><span>${esc(name)}${name === 'Ana S.' ? ' <span class="chip neutral">You</span>' : ''}<span class="xs muted" style="display:block">${f} settled forecasts</span></span><span class="ph">[METRIC]</span></div>`).join('')}</div>
        <p class="xs muted">Sample names. Order is illustrative only.</p>`,
    };
  },
};

SCR.analytics = {
  id: '7.02', title: 'My analytics', tab: 'account', tag: 'chg',
  notes: ['Changed from Core Mockups 08: Brier score removed; accuracy uses the undecided leaderboard metric.', 'Counts and coin totals are factual history, not rewards.'],
  mc: ['Breakdown by template.'],
  render() {
    const settled = S.d.bets.filter((b) => !['open', 'waiting'].includes(betOutcome(b).st));
    const st = settled.reduce((t, b) => t + b.stake, 0), rt = settled.reduce((t, b) => t + betOutcome(b).ret, 0);
    const byT = {};
    for (const b of S.d.bets) { const t = findQ(b.qid).m.tpl; byT[t] = (byT[t] || 0) + 1; }
    const max = Math.max(1, ...Object.values(byT));
    return {
      hdr: hdr('My analytics'),
      main: `<div class="tiles"><div class="tile"><div class="k">Bets</div><div class="v">${S.d.bets.length}</div></div><div class="tile"><div class="k">Settled</div><div class="v">${settled.length}</div></div><div class="tile"><div class="k">Accuracy</div><div class="v small">${ph('METRIC')}</div></div></div>
        <section class="card"><h2 class="small b">Settled bets</h2><div class="kv"><span>Staked</span><span class="num">${n(st)} coins</span></div><div class="kv"><span>Returned</span><span class="num">${n(rt)} coins</span></div><div class="hr"></div><div class="kv"><span>Net</span><span class="num">${signed(rt - st)} coins</span></div></section>
        <section class="card"><h2 class="small b">Bets by template</h2>${Object.entries(byT).map(([t, c]) => `<div style="margin-top:8px"><div class="rowline small"><span>${TPL[t]}</span><span class="num">${c}</span></div><div style="height:8px;border-radius:4px;background:var(--deep)"><div style="height:8px;border-radius:4px;background:var(--blue);width:${(c / max) * 100}%"></div></div></div>`).join('')}</section>
        ${sampleNote('Sample history', false)}`,
    };
  },
};
