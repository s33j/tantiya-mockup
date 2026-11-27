/* Flow 5: safer play. Copy and options from Core Mockups 07 ("Limits and breaks"). */
SCR.safer = {
  id: '5.00', title: 'Limits and breaks', tab: 'account', tag: 'chg',
  notes: ['Changed from Core Mockups 07 (layout kept). Proposal safer-play tools: limits, 60-minute reality check, cooling-off, self-exclusion.', 'Lowering a limit works at once; raising one takes effect after 72 hours.'],
  mc: ['Break lengths 24 hours / 7 days / 30 days come from the Core Mockups canvas (placeholders).'],
  render() {
    return {
      hdr: hdr('Limits and breaks'),
      main: `${blockBanner()}<p class="small t2">Lowering a limit works at once. Raising one takes effect after 72 hours.</p>
        <div class="card" style="padding:2px 14px">
          <button type="button" class="listbtn" data-a="go" data-s="limits"><span>Top-up limit<span class="sub">${n(S.topupLimit)} coins a day · ${n(S.topupToday)} used today</span></span><span class="chev">${icon('chev', 16)}</span></button>
          <button type="button" class="listbtn" data-a="go" data-s="limits"><span>Stake limit<span class="sub">${S.stakeLimit ? n(S.stakeLimit) + ' coins a day' : 'Not set'}</span></span><span class="chev">${icon('chev', 16)}</span></button>
          <button type="button" class="listbtn" data-a="dialog" data-s="reality"><span>Time reminder<span class="sub">Every ${S.reminder} minutes, with your net result · preview</span></span><span class="chev">${icon('chev', 16)}</span></button></div>
        <h2 class="sec">Take a break</h2>
        <button type="button" class="card tap" data-a="go" data-s="cooloff"><div class="rowline"><span><span class="small b">Cooling-off</span><span class="xs muted" style="display:block">No betting or top-ups for 24 hours, 7 days or 30 days</span></span>${icon('chev', 16)}</div></button>
        <button type="button" class="card tap" data-a="go" data-s="selfex"><div class="rowline"><span><span class="small b">Self-exclusion</span><span class="xs muted" style="display:block">6 months, 1 year or permanent</span></span>${icon('chev', 16)}</div></button>
        <section class="card"><h2 class="small b">Need to talk to someone?</h2><p class="small t2" style="margin-top:4px">National Problem Gambling Helpline, free and open 24/7: ${ph('HELPLINE NUMBER')}</p></section>`,
    };
  },
};

SCR.limits = {
  id: '5.01', title: 'Set limits', tab: 'account', tag: 'chg',
  notes: ['Changed from Core Mockups 07: an edit screen for the top-up and stake limits.', 'The bet slip checks the stake limit.'],
  mc: ['Stake limit counts coins staked per day.', 'Stake limit vs. max stake per bet is an open decision.'],
  render() {
    const v = S.limDraft ?? (S.stakeLimit ? String(S.stakeLimit) : '');
    return {
      hdr: hdr('Set limits'),
      main: `<div class="field"><label for="tlim">Top-up limit per day</label><div class="stake"><input id="tlim" class="inp" value="${n(S.topupLimit)}" disabled><span class="t2">coins</span></div><span class="xs muted">Proposal default. Lower it at any time.</span></div>
        <div class="field"><label for="slim">Stake limit per day</label><div class="stake"><input id="slim" class="inp" inputmode="numeric" placeholder="Not set" value="${esc(v)}" data-in="slim" autocomplete="off"><span class="t2">coins</span></div><span class="xs muted">Bets above this are refused for the day. Raising it later waits 72 hours.</span></div>
        <button type="button" class="btn p w" data-a="saveLim" ${v ? '' : 'disabled'}>Save stake limit</button>
        ${S.stakeLimit ? '<button type="button" class="btn s w" data-a="clearLim">Remove stake limit (after 72 hours)</button>' : ''}`,
    };
  },
};
IN.slim = (v) => { S.limDraft = v.replace(/[^0-9]/g, '').slice(0, 6); };
A.saveLim = () => { const v = +(S.limDraft ?? ''); if (!v) return; const raising = S.stakeLimit && v > S.stakeLimit; if (!raising) S.stakeLimit = v; S.limDraft = null; A.back(); toast(raising ? 'Raising a limit takes effect in 72 hours.' : `Stake limit set to ${n(v)} coins a day. It works at once.`); };
A.clearLim = () => { S.limDraft = null; A.back(); toast('Your stake limit will be removed in 72 hours.'); };

DLG.reality = {
  id: '5.02', title: '60-minute reality check', tag: 'new',
  notes: ['Proposal: a reminder every 60 minutes with the net result of the session.', 'Opens over whatever screen the user is on.'],
  mc: ['Shows session time, bets placed, staked, returned and net.', 'Sample session numbers.'],
  render() {
    return `<div class="rowline"><h2>You’ve been here for 60 minutes</h2>${icon('clock', 22)}</div>
      <div><div class="kv"><span>Bets placed this session</span><span class="num">4</span></div><div class="kv"><span>Staked</span><span class="num">900 coins</span></div><div class="kv"><span>Returned</span><span class="num">500 coins</span></div><div class="hr"></div><div class="kv"><span>Net this session</span><span class="num">${signed(-400)} coins</span></div></div>
      <p class="xs muted">Sample values. Coins are play money.</p>
      <button type="button" class="btn p w" data-a="closeDialog">Keep going</button>
      <button type="button" class="btn s w" data-a="rcBreak">Take a break</button>
      <button type="button" class="btn g w" data-a="rcLimits">Set limits</button>`;
  },
};
A.rcBreak = () => { S.ph.dialog = null; S.ph.stack = [{ s: 'account', p: {} }, { s: 'safer', p: {} }, { s: 'cooloff', p: {} }]; };
A.rcLimits = () => { S.ph.dialog = null; S.ph.stack = [{ s: 'account', p: {} }, { s: 'safer', p: {} }, { s: 'limits', p: {} }]; };

SCR.cooloff = {
  id: '5.03', title: 'Cooling-off (take a break)', tab: 'account', tag: 'new',
  notes: ['No betting or top-ups until the break ends. It can’t be cancelled early (Core Mockups 07 copy).', 'While it is on, a banner shows on the markets, wallet and bet slip.'],
  mc: ['Community stays readable during a break; posting stays on.'],
  render() {
    const sel = S.coSel || '24h';
    if (S.breakUntil) return { hdr: hdr('Take a break'), main: `<div class="lock">${icon('pause', 32)}<p class="title">Your break is on</p><p class="t2">No betting or top-ups until ${when(S.breakUntil)}. It can’t be cancelled early.</p><p class="xs muted">Bets you already placed stay as they are and settle as usual.</p><button type="button" class="btn s" data-a="endBreak">End break (demo only)</button></div>` };
    return {
      hdr: hdr('Take a break'),
      main: `<p class="t2">No betting or top-ups until the break ends. It can’t be cancelled early.</p>
        ${[['24h', '24 hours'], ['7d', '7 days'], ['30d', '30 days']].map(([k, l]) => `<label class="radio" data-on="${sel === k}"><input type="radio" name="co" ${sel === k ? 'checked' : ''} data-a="coSel" data-v="${k}"><span>${l}</span></label>`).join('')}
        <p class="small t2">Open bets stay as they are and settle as usual. You can still read markets and Community.</p>
        <button type="button" class="btn p w" data-a="dialog" data-s="coConfirm">Start break</button>`,
    };
  },
};
A.coSel = (d) => { S.coSel = d.v; };
DLG.coConfirm = {
  id: '5.03', title: 'Confirm break', tag: 'new', notes: ['Confirmation before a break that can’t be undone.'],
  render() {
    const l = { '24h': '24-hour', '7d': '7-day', '30d': '30-day' }[S.coSel || '24h'];
    return `<h2>Start a ${l} break?</h2><p class="small t2">You won’t be able to bet or top up until it ends, and it can’t be cancelled early.</p>
      <button type="button" class="btn p w" data-a="startBreak">Start ${l} break</button><button type="button" class="btn s w" data-a="closeDialog">Not now</button>`;
  },
};
A.startBreak = () => { const h = { '24h': 24, '7d': 168, '30d': 720 }[S.coSel || '24h']; S.breakUntil = new Date(NOW.getTime() + h * 3600e3).toISOString(); S.ph.dialog = null; };
A.endBreak = () => { S.breakUntil = null; toast('Break ended (demo control).'); };

SCR.selfex = {
  id: '5.04', title: 'Self-exclusion', tab: 'account', tag: 'new',
  notes: ['Self-exclusion lengths 6 months, 1 year, permanent: accepted placeholders (Nov 16).', 'Stronger than a break: the account is locked from betting, top-ups and posting for the whole period.'],
  mc: ['Open bets settle and are returned as usual.', 'Asks the user to type EXCLUDE to confirm.'],
  render() {
    const sel = S.seSel || '6m';
    if (S.excluded) return { hdr: hdr('Self-exclusion'), main: `<div class="lock">${icon('lock', 32)}<p class="title">You’re self-excluded</p><p class="t2">Until ${S.excluded === 'perm' ? 'you contact support (permanent)' : esc(S.excluded)}. Betting, top-ups and posting are off.</p><p class="small t2">Helpline: ${ph('HELPLINE NUMBER')}</p><button type="button" class="btn s" data-a="unexclude">Undo (demo only)</button></div>` };
    return {
      hdr: hdr('Self-exclusion'),
      main: `<p class="t2">Self-exclusion locks betting, top-ups and posting for the whole period. It can’t be shortened.</p>
        ${[['6m', '6 months'], ['1y', '1 year'], ['perm', 'Permanent']].map(([k, l]) => `<label class="radio" data-on="${sel === k}"><input type="radio" name="se" ${sel === k ? 'checked' : ''} data-a="seSel" data-v="${k}"><span>${l}</span></label>`).join('')}
        <div class="field"><label for="seconf">Type EXCLUDE to confirm</label><input id="seconf" class="inp" value="${esc(S.seText || '')}" data-in="seconf" autocomplete="off"></div>
        <button type="button" class="btn warn w" data-a="doExclude" ${(S.seText || '').trim().toUpperCase() === 'EXCLUDE' ? '' : 'disabled'}>Self-exclude</button>
        <section class="card"><p class="small t2">Need to talk to someone? Helpline: ${ph('HELPLINE NUMBER')}</p></section>`,
    };
  },
};
A.seSel = (d) => { S.seSel = d.v; };
IN.seconf = (v) => { S.seText = v.slice(0, 10); };
A.doExclude = () => { const s = S.seSel || '6m'; S.excluded = s === 'perm' ? 'perm' : s === '6m' ? 'Jun 1, 2027' : 'Dec 1, 2027'; S.seText = ''; };
A.unexclude = () => { S.excluded = null; toast('Self-exclusion undone (demo control).'); };
