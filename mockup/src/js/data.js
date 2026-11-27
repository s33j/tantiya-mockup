/* Sample data. ALL numbers, dates, lines, pools and names are sample values for the mockup.
   Templates follow the proposal: weekly fuel price, PSA inflation, BSP policy rate, PHP/USD reference rate, PAGASA wind signal. */
const TPL = { fuel: 'Fuel', cpi: 'Inflation', bsp: 'BSP rates', fx: 'FX', wx: 'Weather' };

function q(id, text, odds, opts = {}) {
  return Object.assign({ id, q: text, odds: odds.slice(), open: (opts.openLine || odds).slice(), labels: opts.labels || ['Yes', 'No'],
    close: null, pool: 0, bettors: 0, state: 'open', earlyReason: '', result: null, resultNote: '', answerAt: '', main: false,
    moves24: 0, staked: [0, 0] }, opts);
}

function makeData() {
  const markets = [
    {
      id: 'bsp-dec', tpl: 'bsp', kind: 'yn', source: 'BSP Monetary Board statement',
      title: 'Will the BSP cut its policy rate at the Thu Dec 10 meeting?',
      rules: 'Yes if the BSP announces a cut to its target reverse repurchase rate after the Dec 10 Monetary Board meeting. Each side bet settles on its own.',
      hist: [52, 54, 55, 57, 58, 59, 60],
      questions: [
        q('bsp-dec-main', 'Will the BSP cut its policy rate at the Thu Dec 10 meeting?', [-150, 130], { main: true, openLine: [-125, 105], close: '2026-12-10T12:00:00+08:00', answerAt: 'Dec 10, about 3:00 PM (statement)', pool: 48200, bettors: 312, moves24: 2, staked: [31400, 16800] }),
        q('bsp-dec-50', 'Cut of 50 bp or more?', [320, -400], { openLine: [300, -380], close: '2026-12-09T17:00:00+08:00', answerAt: 'Dec 10, about 3:00 PM (statement)', pool: 9800, bettors: 74, staked: [2100, 7700] }),
        q('bsp-dec-una', 'Unanimous decision?', [-120, 100], { openLine: [-120, 100], close: '2026-12-10T12:00:00+08:00', answerAt: 'When the meeting highlights are published, weeks later', pool: 4100, bettors: 41, staked: [2500, 1600] }),
      ],
    },
    {
      id: 'cpi-nov', tpl: 'cpi', kind: 'ou', source: 'PSA consumer price index release',
      title: 'PSA November inflation: over or under 3.5%?',
      rules: 'Over if the headline inflation rate for November 2026 in the PSA release is above 3.5%. PSA reports one decimal, so exactly 3.5% would be a push (stakes returned); half-point lines vs pushes is an open decision.',
      hist: [49, 50, 50, 51, 50, 50, 50],
      questions: [
        q('cpi-nov-main', 'November headline inflation, line 3.5%', [-110, -110], { main: true, labels: ['Over', 'Under'], close: '2026-12-03T23:59:00+08:00', answerAt: 'Dec 4, 9:00 AM (PSA release)', pool: 22600, bettors: 188, staked: [11900, 10700] }),
        q('cpi-nov-4', 'Over 4.0%?', [250, -300], { close: '2026-12-03T23:59:00+08:00', answerAt: 'Dec 4, 9:00 AM (PSA release)', pool: 5300, bettors: 52, staked: [1400, 3900] }),
        q('cpi-nov-up', 'Higher than October (3.7%)?', [-130, 110], { openLine: [-115, -105], close: '2026-12-03T23:59:00+08:00', answerAt: 'Dec 4, 9:00 AM (PSA release)', pool: 6900, bettors: 61, moves24: 1, staked: [4200, 2700] }),
      ],
    },
    {
      id: 'fx-dec4', tpl: 'fx', kind: 'yn', source: 'BSP reference exchange rate',
      title: 'BSP reference rate above ₱58.50 per US$ on Fri Dec 4?',
      rules: 'Yes if the BSP reference rate published for Fri Dec 4 is above ₱58.50 per US dollar.',
      hist: [44, 46, 49, 51, 50, 48, 48],
      questions: [
        q('fx-dec4-main', 'BSP reference rate above ₱58.50 per US$ on Fri Dec 4?', [110, -130], { main: true, close: '2026-12-03T17:00:00+08:00', answerAt: 'Dec 4, after the reference rate is published', pool: 15300, bettors: 120, staked: [6400, 8900] }),
        q('fx-dec4-59', 'Above ₱59.00 on any day this week (Nov 30 – Dec 4)?', [260, -320], { close: '2026-12-03T17:00:00+08:00', state: 'closedEarly', earlyReason: 'Answer known early: the reference rate reached ₱59.02 on Mon Nov 30.', result: null, proposed: 0, answerAt: 'Any day the rate is above ₱59.00', pool: 3700, bettors: 39, staked: [1500, 2200] }),
        q('fx-dec4-58', 'Below ₱58.00 at Friday’s reference rate?', [500, -700], { close: '2026-12-03T17:00:00+08:00', answerAt: 'Dec 4, after the reference rate is published', pool: 2100, bettors: 23, staked: [400, 1700] }),
      ],
    },
    {
      id: 'fuel-dec8', tpl: 'fuel', kind: 'yn', source: 'Oil firms’ Monday price advisories (DOE)',
      title: 'Diesel price adjustment taking effect Tue Dec 8: a hike of more than ₱1.00 per litre?',
      rules: 'Yes if the most common diesel adjustment among the three largest oil firms’ Monday Dec 7 advisories is above ₱1.00 per litre.',
      hist: [55, 57, 60, 62, 63, 64, 64],
      questions: [
        q('fuel-dec8-main', 'Diesel hike of more than ₱1.00 per litre on Tue Dec 8?', [-180, 150], { main: true, openLine: [-140, 120], close: '2026-12-04T17:00:00+08:00', answerAt: 'Mon Dec 7, when advisories come out', pool: 31900, bettors: 264, moves24: 1, staked: [21800, 10100] }),
      ],
    },
    {
      id: 'wx-dec15', tpl: 'wx', kind: 'yn', source: 'PAGASA tropical cyclone bulletins',
      title: 'Wind Signal No. 2 or higher raised over Metro Manila by Tue Dec 15?',
      rules: 'Yes if PAGASA raises Tropical Cyclone Wind Signal No. 2 or higher over any part of Metro Manila by Dec 15, 11:59 PM. Closes early if it is raised before then.',
      hist: [20, 19, 18, 18, 17, 18, 18],
      questions: [
        q('wx-dec15-main', 'Wind Signal No. 2 or higher over Metro Manila by Tue Dec 15?', [450, -600], { main: true, close: '2026-12-14T23:59:00+08:00', answerAt: 'Any PAGASA bulletin up to Dec 15', pool: 6200, bettors: 58, staked: [1300, 4900] }),
      ],
    },
  ];

  // Finalized (or partly finalized) markets that appear in My bets > Settled.
  const past = [
    {
      id: 'bsp-oct', tpl: 'bsp', kind: 'yn', source: 'BSP Monetary Board statement', finalized: '2026-10-22T15:10:00+08:00',
      title: 'Will the BSP cut its policy rate at the Oct 22 meeting?',
      questions: [
        q('bsp-oct-main', 'Will the BSP cut its policy rate at the Oct 22 meeting?', [-150, 130], { main: true, state: 'settled', result: 0, resultNote: 'Cut of 25 bp announced Oct 22', close: '2026-10-22T12:00:00+08:00' }),
        q('bsp-oct-50', 'Cut of 50 bp or more?', [320, -400], { state: 'settled', result: 1, resultNote: 'The cut was 25 bp', close: '2026-10-22T12:00:00+08:00' }),
        q('bsp-oct-una', 'Unanimous decision?', [-120, 100], { state: 'waiting', result: null, resultNote: 'Waits for the meeting highlights', close: '2026-10-22T12:00:00+08:00' }),
      ],
    },
    {
      id: 'cpi-oct', tpl: 'cpi', kind: 'ou', source: 'PSA consumer price index release', finalized: '2026-11-05T09:20:00+08:00',
      title: 'PSA October inflation: over or under 3.5%?',
      questions: [
        q('cpi-oct-main', 'October headline inflation, line 3.5%', [-110, -110], { main: true, labels: ['Over', 'Under'], state: 'settled', result: 0, resultNote: 'PSA: 3.7%', close: '2026-11-04T23:59:00+08:00' }),
        q('cpi-oct-4', 'Over 4.0%?', [250, -300], { state: 'settled', result: 1, resultNote: 'PSA: 3.7%', close: '2026-11-04T23:59:00+08:00' }),
        q('cpi-oct-up', 'Higher than September (3.4%)?', [-130, 110], { state: 'settled', result: 0, resultNote: '3.7% is higher than 3.4%', close: '2026-11-04T23:59:00+08:00' }),
      ],
    },
    {
      id: 'fuel-nov24', tpl: 'fuel', kind: 'ou', source: 'Oil firms’ Monday price advisories (DOE)', finalized: '2026-11-23T18:00:00+08:00',
      title: 'Diesel adjustment on Tue Nov 24: over or under ₱1.00 per litre?',
      questions: [
        q('fuel-nov24-main', 'Diesel adjustment, line ₱1.00 per litre', [-110, -110], { main: true, labels: ['Over', 'Under'], state: 'settled', result: 'push', resultNote: 'Adjustment was exactly ₱1.00: push, stakes returned', close: '2026-11-20T17:00:00+08:00' }),
      ],
    },
    {
      id: 'wx-nov15', tpl: 'wx', kind: 'yn', source: 'PAGASA tropical cyclone bulletins', finalized: '2026-11-12T16:00:00+08:00',
      title: 'Wind Signal No. 1 or higher over Metro Manila by Sun Nov 15?',
      questions: [
        q('wx-nov15-main', 'Wind Signal No. 1 or higher over Metro Manila by Sun Nov 15?', [400, -550], { main: true, state: 'settled', result: 'void', resultNote: 'Voided: the market was published with the wrong deadline. Stakes returned.', close: '2026-11-15T23:59:00+08:00' }),
      ],
    },
  ];

  // The sample returning user's bets. odds = odds at bet time, pick = 0 first outcome, 1 second.
  const bets = [
    { id: 'b1', qid: 'bsp-oct-main', pick: 1, odds: 130, stake: 200, placed: '2026-10-19T20:14:00+08:00' },
    { id: 'b2', qid: 'bsp-oct-50', pick: 1, odds: -400, stake: 400, placed: '2026-10-19T20:16:00+08:00' },
    { id: 'b3', qid: 'bsp-oct-una', pick: 0, odds: -120, stake: 120, placed: '2026-10-19T20:18:00+08:00' },
    { id: 'b4', qid: 'cpi-oct-main', pick: 0, odds: -110, stake: 220, placed: '2026-11-02T08:40:00+08:00' },
    { id: 'b5', qid: 'cpi-oct-4', pick: 1, odds: -300, stake: 300, placed: '2026-11-02T08:41:00+08:00' },
    { id: 'b6', qid: 'cpi-oct-up', pick: 1, odds: 110, stake: 100, placed: '2026-11-02T08:43:00+08:00' },
    { id: 'b7', qid: 'fuel-nov24-main', pick: 0, odds: -110, stake: 110, placed: '2026-11-19T12:05:00+08:00' },
    { id: 'b8', qid: 'wx-nov15-main', pick: 0, odds: 400, stake: 100, placed: '2026-11-10T07:30:00+08:00' },
    { id: 'b9', qid: 'fx-dec4-59', pick: 0, odds: 260, stake: 150, placed: '2026-11-29T21:02:00+08:00' },
    { id: 'b10', qid: 'cpi-nov-main', pick: 1, odds: -110, stake: 220, placed: '2026-11-30T19:45:00+08:00' },
  ];

  const people = {
    paolo: { name: 'Paolo M.', joined: 'Nov 2026', posts: 14, forecasts: 41 },
    rina: { name: 'Rina D.', joined: 'Nov 2026', posts: 22, forecasts: 63 },
    joy: { name: 'Joy C.', joined: 'Nov 2026', posts: 6, forecasts: 18 },
    ben: { name: 'Ben T.', joined: 'Nov 2026', posts: 3, forecasts: 2 },
    ana: { name: 'Ana S.', joined: 'Oct 2026', posts: 2, forecasts: 10 },
  };

  const posts = [
    { id: 'p1', by: 'rina', at: '2026-12-01T08:12:00+08:00', mid: 'bsp-dec', forecast: { qid: 'bsp-dec-main', pick: 0, odds: -150 },
      text: 'The BSP statement usually comes out around 3 PM on decision day, and this market closes at noon, so nobody gets a late-information edge. My read: one more 25 bp cut, then a pause.',
      likes: 41, liked: false, comments: [
        { by: 'paolo', at: '2026-12-01T08:40:00+08:00', text: 'Agree on the timing. The 50 bp side bet looks too long to me though.' },
        { by: 'joy', at: '2026-12-01T09:05:00+08:00', text: 'Unanimous? Last two meetings had one dissent, if I read the highlights right.' },
      ] },
    { id: 'p2', by: 'paolo', at: '2026-11-30T21:30:00+08:00', mid: 'cpi-nov', forecast: { qid: 'cpi-nov-main', pick: 1, odds: -110 },
      text: 'Core inflation eased three months running in my notes. Leaning Under 3.5% for November, but rice and LPG are the wild cards. Source: PSA October release, Table 1.',
      likes: 24, liked: false, comments: [{ by: 'rina', at: '2026-11-30T22:02:00+08:00', text: 'LPG went up in the first week of November. Worth checking DOE’s price watch.' }] },
    { id: 'p3', by: 'joy', at: '2026-11-30T16:20:00+08:00', mid: 'fx-dec4', forecast: null,
      text: 'The “above ₱59.00 any day this week” side bet closed early after Monday’s 59.02. The main Friday market is still open until Thu 5 PM.',
      likes: 12, liked: false, comments: [] },
    { id: 'p4', by: 'ben', at: '2026-11-30T11:00:00+08:00', mid: null, forecast: null,
      text: 'Sure-win picks every week, message me for my list.',
      likes: 0, liked: false, comments: [], reports: 3 },
  ];

  const notifications = [
    { id: 'n1', at: '2026-10-22T15:12:00+08:00', mid: 'bsp-oct', read: false,
      text: 'Results are in for “BSP rate cut at the Oct 22 meeting?”. One side bet is still waiting for its result.' },
    { id: 'n2', at: '2026-11-05T09:22:00+08:00', mid: 'cpi-oct', read: false, text: 'Results are in for “PSA October inflation: over or under 3.5%?”.' },
    { id: 'n3', at: '2026-11-23T18:05:00+08:00', mid: 'fuel-nov24', read: true, text: 'Push on “Diesel adjustment on Tue Nov 24”: your stake was returned.' },
  ];

  const history = [
    { at: '2026-11-30T19:45:00+08:00', what: 'Bet · PSA November inflation, Under', amt: -220 },
    { at: '2026-11-29T21:02:00+08:00', what: 'Bet · PHP/USD above ₱59.00 this week, Yes', amt: -150 },
    { at: '2026-11-25T10:12:00+08:00', what: 'Simulated top-up', amt: 1000 },
    { at: '2026-11-23T18:05:00+08:00', what: 'Push returned · Diesel Nov 24', amt: 110 },
    { at: '2026-11-19T12:05:00+08:00', what: 'Bet · Diesel Nov 24, Over', amt: -110 },
    { at: '2026-11-12T16:02:00+08:00', what: 'Void returned · Wind signal Nov 15', amt: 100 },
    { at: '2026-11-10T07:30:00+08:00', what: 'Bet · Wind signal Nov 15, Yes', amt: -100 },
    { at: '2026-11-05T09:22:00+08:00', what: 'Returned · PSA October inflation', amt: 820 },
    { at: '2026-11-02T08:43:00+08:00', what: 'Bets · PSA October inflation (3)', amt: -620 },
    { at: '2026-10-22T15:12:00+08:00', what: 'Returned · BSP Oct 22 meeting', amt: 500 },
    { at: '2026-10-19T20:18:00+08:00', what: 'Bets · BSP Oct 22 meeting (3)', amt: -720 },
    { at: '2026-10-05T09:00:00+08:00', what: 'Starting coins', amt: 1000 },
  ];

  const kyc = [
    { id: 1038, email: 'j.reyes@example.com', doc: "Driver's license", verdict: 'Declined', face: '41 / 97', dup: 'None found', wait: '25 h 18 m', st: 'Over 24 h' },
    { id: 1040, email: 'a.delacruz@example.com', doc: 'Passport', verdict: 'In Review', face: '88 / 95', dup: 'Possible match', wait: '19 h 48 m', st: 'Due soon' },
    { id: 1043, email: 'maria.santos@example.com', doc: 'PhilID', verdict: 'Approved', face: '96 / 99', dup: 'None found', wait: '13 h 38 m', st: 'On track' },
    { id: 1045, email: 'k.bautista@example.com', doc: 'UMID', verdict: 'Approved', face: '91 / 98', dup: 'None found', wait: '9 h 12 m', st: 'On track' },
    { id: 1049, email: 'ana@example.com', doc: 'PhilID', verdict: 'Approved', face: '95 / 99', dup: 'None found', wait: '0 h 04 m', st: 'On track', demo: true },
  ];

  const withdrawals = [
    { id: 'w-881', who: 'k.bautista@example.com', amt: 800, at: '2026-11-30T14:10:00+08:00', done: 0 },
    { id: 'w-879', who: 'r.garcia@example.com', amt: 2500, at: '2026-11-30T09:02:00+08:00', done: 0 },
  ];

  return { markets, past, bets, people, posts, notifications, history, kyc, withdrawals };
}
