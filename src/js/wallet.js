/* Flow 4: wallet with simulated top-up and simulated withdraw. Every screen says "Simulation — no money is charged." */
SCR.wallet = {
  id: '4.01', title: 'Wallet', tab: 'wallet', tag: 'chg',
  notes: ['Changed from Core Mockups 06: same layout, real names of payment methods removed (generic "simulated" methods).', 'Coins, never ₱. "Simulation — no money is charged." on every wallet screen (proposal).'],
  mc: ['History shows the most recent 10 entries.'],
  render() {
    const pend = S.wd && S.wd.done < 3 ? S.wd.amt : 0;
    return {
      hdr: `<div class="hdr"><h1 style="padding-left:8px">Wallet</h1></div>`,
      main: `${simLabel()}${blockBanner()}
        <section class="card"><div class="xs muted">Available to bet or withdraw</div><div class="big num">${n(S.balance)} <span class="small t2">coins</span></div>
          <div class="hr"></div><div class="kv"><span>In play</span><span class="num">${n(inPlay())}</span></div><div class="kv"><span>Pending withdrawal</span><span class="num">${n(pend)}</span></div></section>
        <div class="outs"><button type="button" class="btn p" data-a="topup" ${S.breakUntil || S.excluded ? 'disabled' : ''}>Top up</button><button type="button" class="btn s" data-a="go" data-s="${S.wd && S.wd.done < 3 ? 'wdStatus' : 'withdraw'}">${S.wd && S.wd.done < 3 ? 'Withdrawal status' : 'Withdraw'}</button></div>
        <button type="button" class="card tap" data-a="go" data-s="safer"><div class="rowline"><span><span class="small b">Limits and breaks</span><span class="xs muted" style="display:block">Top-up ${n(S.topupLimit)} a day · stake limit ${S.stakeLimit ? n(S.stakeLimit) : 'not set'}</span></span>${icon('chev', 16)}</div></button>
        <h2 class="sec">History</h2>
        <div class="card" style="padding:2px 14px">${S.d.history.slice(0, 10).map((h) => `<div class="kv" style="border-top:1px solid var(--border)"><span><span style="color:var(--text)">${esc(h.what)}</span><span class="xs muted" style="display:block">${when(h.at)}</span></span><span class="num">${signed(h.amt)}</span></div>`).join('')}</div>
        ${sampleNote('Sample history', false)}`,
    };
  },
};
A.topup = () => { if (blockReason()) { toast(blockReason()); return; } go('topup'); };

SCR.topup = {
  id: '4.02', title: 'Top up (simulated)', tab: 'wallet', tag: 'new',
  notes: ['Simulated top-up from the proposal: an in-app mock, no payment provider, no coin sales.', 'Top-up limit (10,000 a day) from the proposal’s safer-play section, carried from Core Mockups 06/07.'],
  mc: ['Preset amounts 500 / 1,000 / 2,000 / 5,000.', 'A generic "simulated e-wallet" method; no real provider names.'],
  render() {
    const left = S.topupLimit - S.topupToday;
    const amt = S.topupAmt;
    return {
      hdr: hdr('Top up'),
      main: `${simLabel()}<p class="small t2">Choose an amount. Nothing is charged: coins are added for the simulation only.</p>
        <div class="outs" role="group" aria-label="Amount">${[500, 1000, 2000, 5000].map((v) => `<button type="button" class="pill" style="justify-content:center;min-height:48px" aria-pressed="${amt === v}" data-a="tuAmt" data-v="${v}">${n(v)} coins</button>`).join('')}</div>
        <div class="card" style="padding:4px 14px"><div class="kv"><span>Method</span><span>Simulated e-wallet</span></div><div class="kv"><span>Today’s top-up limit</span><span class="num">${n(S.topupToday)} of ${n(S.topupLimit)} used</span></div><div class="kv"><span>Balance after</span><span class="num">${n(S.balance + amt)} coins</span></div></div>
        ${amt > left ? `<p class="small" role="alert" style="color:var(--amber)">Above today’s limit. You can add up to ${n(left)} more today.</p>` : ''}
        <button type="button" class="btn p w" data-a="doTopup" ${amt > left ? 'disabled' : ''}>Add ${n(amt)} coins (simulated)</button>`,
    };
  },
};
A.tuAmt = (d) => { S.topupAmt = +d.v; };
A.doTopup = () => {
  const a = S.topupAmt; S.balance += a; S.topupToday += a; S.lastTopup = a;
  S.d.history.unshift({ at: NOW.toISOString(), what: 'Simulated top-up', amt: a });
  S.ph.stack = [{ s: 'wallet', p: {} }, { s: 'topupDone', p: {} }];
};
SCR.topupDone = {
  id: '4.03', title: 'Top-up done', tab: 'wallet', tag: 'new',
  notes: ['Plain confirmation, still labelled as a simulation.'],
  render() {
    return {
      hdr: `<div class="hdr"><button type="button" class="ib" data-a="tab" data-t="wallet" aria-label="Close">${icon('close')}</button><h1>Top up</h1></div>`,
      main: `<div class="okmark">${icon('check', 26)}</div><p class="title">${n(S.lastTopup || 1000)} coins added</p>${simLabel()}
        <div class="card" style="padding:4px 14px"><div class="kv"><span>New balance</span><span class="num">${n(S.balance)} coins</span></div><div class="kv"><span>Today’s top-up limit</span><span class="num">${n(S.topupToday)} of ${n(S.topupLimit)} used</span></div></div>
        <button type="button" class="btn p w" data-a="tab" data-t="wallet">Back to wallet</button>`,
    };
  },
};

function startWithdraw(amt) {
  S.balance -= amt;
  S.wd = { id: 'w-884', amt, done: 0, at: NOW.toISOString() };
  S.d.withdrawals.unshift({ id: 'w-884', who: 'ana@example.com', amt, at: NOW.toISOString(), done: 0, mine: true });
  S.d.history.unshift({ at: NOW.toISOString(), what: 'Simulated withdrawal requested', amt: -amt });
}
SCR.withdraw = {
  id: '4.04', title: 'Withdraw (simulated)', tab: 'wallet', tag: 'new',
  notes: ['Simulated withdraw from the proposal. No account numbers are asked for.', 'Staff approve it in the staff console (6.08).'],
  mc: ['Staff approval for simulated withdrawals (what "withdraw" means for play coins is an open decision).', 'Minimum 100 coins.'],
  render() {
    const v = +S.wdAmt || 0; const err = v && v < 100 ? 'Minimum 100 coins.' : v > S.balance ? `You have ${n(S.balance)} coins available.` : '';
    return {
      hdr: hdr('Withdraw'),
      main: `${simLabel()}<p class="small t2">Withdrawals are simulated. No money is paid out; the coins leave your balance so the flow can be tested.</p>
        <div class="field"><label for="wamt">Amount</label><div class="stake"><input id="wamt" class="inp" inputmode="numeric" value="${esc(S.wdAmt)}" data-in="wamt" autocomplete="off"><span class="t2">coins</span></div><span class="xs muted">Available ${n(S.balance)} coins</span></div>
        <div class="card" style="padding:4px 14px"><div class="kv"><span>To</span><span>Simulated bank account</span></div><div class="kv"><span>Review</span><span>A staff member approves each one</span></div></div>
        ${err ? `<p class="small" role="alert" style="color:var(--amber)">${esc(err)}</p>` : ''}
        <button type="button" class="btn p w" data-a="doWd" ${!v || err ? 'disabled' : ''}>Request withdrawal (simulated)</button>`,
    };
  },
};
IN.wamt = (v) => { S.wdAmt = v.replace(/[^0-9]/g, '').slice(0, 6); };
A.doWd = () => { startWithdraw(+S.wdAmt); S.ph.stack = [{ s: 'wallet', p: {} }, { s: 'wdStatus', p: {} }]; };

const WD_STEPS = [['Requested', 'You asked to withdraw'], ['Staff review', 'A staff member checks the request'], ['Approved', 'Approved by staff'], ['Completed', 'Marked as paid out (simulated)']];
SCR.wdStatus = {
  id: '4.05', title: 'Withdrawal status', tab: 'wallet', tag: 'new',
  notes: ['Status timeline: Requested → Staff review → Approved → Completed.', 'It moves on when staff act in the staff console (6.08).'],
  mc: ['The four steps and their wording.'],
  render() {
    const w = S.wd;
    if (!w) return { hdr: hdr('Withdrawal status'), main: '<p class="muted">No withdrawal yet.</p>' };
    return {
      hdr: hdr('Withdrawal status'),
      main: `${simLabel()}<div class="card"><div class="xs muted">Withdrawal ${esc(w.id)}</div><div class="big num">${n(w.amt)} <span class="small t2">coins</span></div><div class="xs muted">To a simulated bank account</div></div>
        <ol class="timeline" aria-label="Withdrawal status">${WD_STEPS.map(([k, s], i) => {
          const st = i <= w.done ? 'done' : i === w.done + 1 ? 'now' : '';
          return `<li class="${st}"><span class="dotc">${st === 'done' ? icon('check', 14) : st === 'now' ? icon('wait', 12) : ''}</span><div><div class="k">${k}</div><div class="s">${st === 'done' ? (i === 0 ? when(w.at) : s) : st === 'now' ? 'In progress' : s}</div></div></li>`;
        }).join('')}</ol>
        <p class="xs muted">You’ll get a notification at each step.</p>
        <div class="stand"><span class="xs muted">Demo shortcut</span><button type="button" class="btn s w" data-a="staff" data-s="withdrawals">Open staff withdrawal approvals</button></div>`,
    };
  },
};
