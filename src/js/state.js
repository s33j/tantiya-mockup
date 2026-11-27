/* Demo state, shared by the phone and the staff console. Lives in memory only; Reset restores it. */
let S;
function freshState(persona = 'returning') {
  const d = makeData();
  const s = {
    view: 'start', persona, fmt: 'american', d,
    balance: 1610, topupToday: 0, topupLimit: 10000, stakeLimit: null, reminder: 60,
    paused: {}, // qid -> true
    ph: { stack: [{ s: 'markets', p: {} }], sheet: null, dialog: null },
    st: { s: 'lines', p: {} },
    slip: null, lineMoveDone: false, lastBet: null,
    draft: { text: '', mid: null }, cdraft: '',
    mbTab: 'open', mbFilter: 'all', feedTab: 'latest', marketTab: {},
    breakUntil: null, excluded: null,
    wd: null, topupAmt: 1000, wdAmt: '500', lastTopup: 0,
    signup: { email: 'ana@example.com', pw: '••••••••••', a21: false, inph: false, err: '' },
    staffSel: {}, builder: null, rc: false, toast: null, filter: 'all',
  };
  if (persona === 'new') {
    s.balance = 1000; d.bets = []; d.notifications = []; d.history = [{ at: '2026-12-01T09:58:00+08:00', what: 'Starting coins', amt: 1000 }];
    d.people.ana.posts = 0; d.people.ana.forecasts = 0;
  }
  return s;
}

const me = 'ana';
const allMarkets = () => S.d.markets.concat(S.d.past);
const mById = (id) => allMarkets().find((m) => m.id === id);
function findQ(qid) {
  for (const m of allMarkets()) { const q = m.questions.find((x) => x.id === qid); if (q) return { m, q }; }
  return {};
}
const mainQ = (m) => m.questions.find((x) => x.main);
const sideQs = (m) => m.questions.filter((x) => !x.main);

/* status: open | closing | closed | closedEarly | paused | waiting | settled */
function qStatus(q) {
  if (S.paused[q.id]) return 'paused';
  if (q.result !== null && q.result !== undefined) return 'settled';
  if (q.state === 'closedEarly') return 'closedEarly';
  if (q.state === 'waiting') return 'waiting';
  const h = hoursLeft(q.close);
  if (h <= 0) return 'closed';
  return h <= CLOSING_HOURS ? 'closing' : 'open';
}
function marketStatus(m) { return qStatus(mainQ(m)); }
function blockReason() {
  if (S.excluded) return 'Self-exclusion is on. Betting is off.';
  if (S.breakUntil) return `You're on a break until ${when(S.breakUntil)}. Betting and top-ups are paused.`;
  return '';
}
const canBet = (q) => ['open', 'closing'].includes(qStatus(q)) && !blockReason();

/* bet outcome: open | waiting | won | lost | push | void */
function betOutcome(b) {
  const { q } = findQ(b.qid);
  if (!q) return { st: 'open', ret: 0 };
  if (q.result === 'push') return { st: 'push', ret: b.stake };
  if (q.result === 'void') return { st: 'void', ret: b.stake };
  if (q.result === 0 || q.result === 1) {
    return b.pick === q.result ? { st: 'won', ret: b.stake + Odds.toWin(b.stake, b.odds) } : { st: 'lost', ret: 0 };
  }
  const s = qStatus(q);
  return { st: ['open', 'closing', 'paused'].includes(s) ? 'open' : 'waiting', ret: 0 };
}
function betsIn(m) { const ids = m.questions.map((x) => x.id); return S.d.bets.filter((b) => ids.includes(b.qid)); }
function summary(m) {
  const bs = betsIn(m);
  let staked = 0, returned = 0, final = true, any = false;
  for (const b of bs) {
    const o = betOutcome(b); staked += b.stake; returned += o.ret;
    if (o.st === 'open' || o.st === 'waiting') final = false; else any = true;
  }
  return { staked, returned, net: returned - staked, final, anySettled: any, count: bs.length };
}
const inPlay = () => S.d.bets.reduce((t, b) => { const o = betOutcome(b); return t + (o.st === 'open' || o.st === 'waiting' ? b.stake : 0); }, 0);

/* ---- actions that change the demo ---- */
function placeBet(qid, pick, odds, stake) {
  const { m, q } = findQ(qid);
  const b = { id: 'b' + (S.d.bets.length + 100), qid, pick, odds, stake, placed: NOW.toISOString(), mine: true };
  S.d.bets.push(b);
  S.balance -= stake;
  q.pool += stake; q.bettors += 1; q.staked[pick] += stake;
  S.d.history.unshift({ at: NOW.toISOString(), what: `Bet · ${shortTitle(m, q)}, ${q.labels[pick]}`, amt: -stake });
  S.d.people.ana.forecasts += 1;
  S.lastBet = b.id;
  return b;
}
function shortTitle(m, q) {
  const base = { 'bsp-dec': 'BSP Dec 10 meeting', 'cpi-nov': 'PSA November inflation', 'fx-dec4': 'PHP/USD Dec 4', 'fuel-dec8': 'Diesel Dec 8', 'wx-dec15': 'Wind signal Dec 15',
    'bsp-oct': 'BSP Oct 22 meeting', 'cpi-oct': 'PSA October inflation', 'fuel-nov24': 'Diesel Nov 24', 'wx-nov15': 'Wind signal Nov 15' }[m.id] || m.title;
  return q.main ? base : `${base} · ${q.q}`;
}
function moveLine(q, toA) { // automatic line move (rule is an open decision); keeps the other side in step
  const fromA = q.odds[0];
  q.odds = [toA, toA < 0 ? Math.abs(toA) - 20 : -(toA + 20)];
  q.moves24 += 1;
  return fromA;
}
function settleQ(qid, result, note) {
  const { m, q } = findQ(qid);
  q.result = result; q.state = 'settled'; q.resultNote = note || q.resultNote;
  let ret = 0, mine = false;
  for (const b of S.d.bets.filter((x) => x.qid === qid)) { mine = true; ret += betOutcome(b).ret; }
  if (ret) { S.balance += ret; S.d.history.unshift({ at: NOW.toISOString(), what: `Returned · ${shortTitle(m, q)}`, amt: ret }); }
  if (mine) {
    const sm = summary(m);
    S.d.notifications.unshift({ id: 'n' + Date.now(), at: NOW.toISOString(), mid: m.id, read: false,
      text: `Result for “${q.q}” (${shortTitle(m, mainQ(m))}): ${result === 'void' ? 'voided, stake returned' : result === 'push' ? 'push, stake returned' : q.labels[result]}.${sm.final ? ' The market total is now final.' : ''}` });
  }
}
const unread = () => S.d.notifications.filter((x) => !x.read).length;
