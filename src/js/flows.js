/* Flow map: drives the start screen and the presenter rail. Each step puts the demo on one screen. */
const ph1 = (s, p = {}, extra) => () => { S.ph.stack = [{ s, p }]; S.ph.sheet = null; S.ph.dialog = null; if (extra) extra(); };
const phStack = (stack, extra) => () => { S.ph.stack = stack.map(([s, p]) => ({ s, p: p || {} })); S.ph.sheet = null; S.ph.dialog = null; if (extra) extra(); };
const stf = (s, p = {}) => () => { S.st = { s, p }; };
const MK = ['markets'];

const FLOWS = [
  { n: 1, title: 'Sign-up to approval', persona: 'new', level: 'clickable', desc: 'Create account, check email, verify identity with one ID on Didit’s hosted pages, under review, approved with 1,000 starting coins. Reuses the Task 9 screens.',
    steps: [
      { id: '1.01', label: 'Create account', set: ph1('su1') },
      { id: '1.02', label: 'Check email', set: ph1('su2') },
      { id: '1.03', label: 'Verify identity (one ID)', set: ph1('su3') },
      { id: '1.03a', label: 'Didit hosted pages (stand-in)', set: ph1('su3a') },
      { id: '1.04', label: 'Under review', set: ph1('su4') },
      { id: 'S4', label: 'Staff: KYC queue', frame: 'staff', set: stf('kyc') },
      { id: '1.08', label: 'Approved, 1,000 coins', set: ph1('su8') },
    ] },
  { n: 2, title: 'Markets and betting', persona: 'returning', level: 'clickable', desc: 'Market list, Yes/No market with lines, pool, bettors and close times, side bets (one closed early), over/under market, bet slip, line moved, bet placed, My bets and the result breakdown.',
    steps: [
      { id: '2.01', label: 'Market list', set: ph1('markets') },
      { id: '2.03', label: 'Yes/No market + side bets', set: phStack([MK, ['market', { id: 'bsp-dec' }]]) },
      { id: '2.03', label: 'Side bet closed early (PHP/USD)', set: phStack([MK, ['market', { id: 'fx-dec4' }]]) },
      { id: '2.04', label: 'Over/under market', set: phStack([MK, ['market', { id: 'cpi-nov' }]]) },
      { id: '2.02', label: 'Odds format', set: phStack([MK, ['market', { id: 'bsp-dec' }]], () => { S.ph.sheet = { s: 'fmt', p: {} }; }) },
      { id: '2.05', label: 'Bet slip', set: phStack([MK, ['market', { id: 'bsp-dec' }]], () => { S.slip = { qid: 'bsp-dec-50', pick: 1, stake: '400', moved: null }; S.ph.sheet = { s: 'slip', p: {} }; }) },
      { id: '2.06', label: 'Line moved', set: phStack([MK, ['market', { id: 'bsp-dec' }]], () => { const { q } = findQ('bsp-dec-main'); if (!S.lineMoveDone) { S.lineMoveDone = true; moveLine(q, -165); } S.slip = { qid: 'bsp-dec-main', pick: 0, stake: '300', moved: { from: -150, to: q.odds[0] } }; S.ph.sheet = { s: 'slip', p: {} }; }) },
      { id: '2.07', label: 'Bet placed', set: () => { if (!S.lastBet) { const { q } = findQ('bsp-dec-main'); S.lineMoveDone = true; placeBet('bsp-dec-main', 0, q.odds[0], 300); } phStack([MK, ['market', { id: 'bsp-dec' }], ['placed']])(); } },
      { id: '2.09', label: 'My bets', set: ph1('bets', {}, () => { S.mbTab = 'open'; }) },
      { id: '2.09', label: 'My bets · settled', set: ph1('bets', {}, () => { S.mbTab = 'settled'; S.mbFilter = 'all'; }) },
      { id: '2.10a', label: 'Breakdown, final', set: phStack([['bets'], ['breakdown', { id: 'cpi-oct' }]], () => { S.mbTab = 'settled'; }) },
      { id: '2.10b', label: 'Breakdown, not final', set: phStack([['bets'], ['breakdown', { id: 'bsp-oct' }]], () => { S.mbTab = 'settled'; }) },
      { id: '2.12', label: 'Result notification', set: phStack([MK, ['notifs']]) },
    ] },
  { n: 3, title: 'Community', persona: 'returning', level: 'clickable', desc: 'Feed, a Discussion tab on each market, composer with an optional market card, post detail with comments and likes, share sheet and card, report, simple profile.',
    steps: [
      { id: '3.01', label: 'Community feed', set: ph1('feed') },
      { id: '3.02', label: 'Market Discussion tab', set: phStack([MK, ['market', { id: 'bsp-dec' }]], () => { S.marketTab['bsp-dec'] = 'discussion'; }) },
      { id: '3.03', label: 'Composer', set: phStack([['feed'], ['compose']], () => { S.draft = { text: 'November rice prices look flat in the PSA price survey, so I am staying with Under.', mid: 'cpi-nov' }; }) },
      { id: '3.04', label: 'Attach a market', set: phStack([['feed'], ['compose']], () => { S.ph.sheet = { s: 'attach', p: {} }; }) },
      { id: '3.05', label: 'Post detail + comments', set: phStack([['feed'], ['post', { id: 'p1' }]]) },
      { id: '3.06', label: 'Share sheet + card', set: phStack([['feed'], ['post', { id: 'p1' }]], () => { S.ph.sheet = { s: 'share', p: { pid: 'p1' } }; }) },
      { id: '3.08', label: 'Report a post', set: phStack([['feed']], () => { S.report = { pid: 'p4', reason: '', note: '', done: false }; S.ph.sheet = { s: 'report', p: { pid: 'p4' } }; }) },
      { id: '3.09', label: 'Profile', set: phStack([['feed'], ['profile', { id: 'rina' }]]) },
    ] },
  { n: 4, title: 'Wallet', persona: 'returning', level: 'clickable', desc: 'Balance, simulated top-up and simulated withdraw with a status timeline. Every screen says “Simulation — no money is charged.”',
    steps: [
      { id: '4.01', label: 'Wallet', set: ph1('wallet') },
      { id: '4.02', label: 'Top up (simulated)', set: phStack([['wallet'], ['topup']]) },
      { id: '4.03', label: 'Top-up done', set: phStack([['wallet'], ['topupDone']], () => { if (!S.lastTopup) { S.lastTopup = 1000; } }) },
      { id: '4.04', label: 'Withdraw (simulated)', set: phStack([['wallet'], ['withdraw']]) },
      { id: '4.05', label: 'Withdrawal status', set: phStack([['wallet'], ['wdStatus']], () => { if (!S.wd) startWithdraw(500); }) },
      { id: '6.08', label: 'Staff: approve withdrawal', frame: 'staff', set: () => { if (!S.wd) startWithdraw(500); S.st = { s: 'withdrawals', p: {} }; } },
    ] },
  { n: 5, title: 'Safer play', persona: 'returning', level: 'static', desc: 'Limits, the 60-minute reality check, cooling-off (take a break) and self-exclusion.',
    steps: [
      { id: '5.00', label: 'Limits and breaks', set: phStack([['account'], ['safer']]) },
      { id: '5.01', label: 'Set a stake limit', set: phStack([['account'], ['safer'], ['limits']]) },
      { id: '5.02', label: '60-minute reality check', set: ph1('markets', {}, () => { S.ph.dialog = { s: 'reality', p: {} }; }) },
      { id: '5.03', label: 'Take a break', set: phStack([['account'], ['safer'], ['cooloff']]) },
      { id: '5.04', label: 'Self-exclusion', set: phStack([['account'], ['safer'], ['selfex']]) },
    ] },
  { n: 6, title: 'Staff console', persona: 'returning', level: 'static', desc: 'KYC queue (Task 10), line and exposure monitor with pause per main market and side bet, market builder, resolution queue, moderation queue, withdrawal approvals.',
    steps: [
      { id: 'S4', label: 'KYC review queue', frame: 'staff', set: stf('kyc') },
      { id: '6.03', label: 'Lines & exposure, pause', frame: 'staff', set: stf('lines') },
      { id: '6.05', label: 'Market builder', frame: 'staff', set: stf('builder') },
      { id: '6.06', label: 'Resolution queue', frame: 'staff', set: stf('resolution') },
      { id: '6.07', label: 'Moderation queue', frame: 'staff', set: stf('moderation') },
      { id: '6.08', label: 'Withdrawal approvals', frame: 'staff', set: stf('withdrawals') },
    ] },
  { n: 7, title: 'Leaderboard and analytics', persona: 'returning', level: 'static', desc: 'The ranking metric under fixed odds is undecided, so it shows as a placeholder.',
    steps: [
      { id: '7.01', label: 'Leaderboard', set: phStack([MK, ['leaderboard']]) },
      { id: '7.02', label: 'My analytics', set: phStack([['account'], ['analytics']]) },
    ] },
];

function renderStart() {
  return `<main class="start"><h1>Tantiya: the whole app flow, clickable</h1>
    <p class="lead">A mockup for the Dec 1, 2026 review. A phone frame for the user app and a desktop frame for the staff console share one set of sample data, so what staff do shows up on the phone. No backend, English only, dark theme. Lines are American odds set automatically from data, with the house margin built in.</p>
    <div class="facts"><span>All numbers are sample values</span><span>Play money: coins, never ₱</span><span>Simulation — no money is charged</span><span>Yellow [BRACKETS] = open decision</span></div>
    <div class="fgrid">${FLOWS.map((f) => `<section class="fcard"><span class="fn">Flow ${f.n} · ${f.steps.length} steps</span><h2>${esc(f.title)}</h2><p>${esc(f.desc)}</p>
      <div class="acts"><button type="button" class="btn p sm" data-a="flow" data-n="${f.n}">Start flow ${f.n}</button></div></section>`).join('')}
      <section class="fcard"><span class="fn">Open questions</span><h2>Decisions board</h2><p>Every open question this mockup raises, with where it shows up. Placeholders in the screens point here.</p>
      <div class="acts"><button type="button" class="btn s sm" data-a="view" data-v="decisions">Open the board</button></div></section></div>
    <section class="strip"><h2>Other sign-up states (Task 9, reused as is)</h2><p class="small t2">States of the Account page the backend can produce. Static screens.</p>
      <div class="acts">${[['su5', '05 ID check not finished'], ['su6', '06 Applications full'], ['su7', '07 Not approved (TENTATIVE)'], ['su9', '09 Receiving your result'], ['su10', '10 Confirm declarations'], ['su11', '11 Couldn’t start ID check']].map(([s, l]) => `<button type="button" class="btn s sm" data-a="state" data-s="${s}">${l}</button>`).join('')}</div></section></main>`;
}
A.state = (d) => { if (S.persona !== 'new') { S = freshState('new'); } S.flow = 1; S.ph.stack = [{ s: d.s, p: {} }]; setView('app'); };
