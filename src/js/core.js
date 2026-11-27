/* Helpers, icons and odds maths. Everything here is plain functions. */
// Registries filled by the screen files: phone screens, phone sheets, phone dialogs, staff pages,
// click actions (data-a) and input handlers (data-in).
const SCR = {}, SHEET = {}, DLG = {}, STAFF = {}, A = {}, IN = {};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MINUS = '−';
const n = (x) => Math.round(x).toLocaleString('en-US');
const signed = (x) => (x > 0 ? '+' : x < 0 ? MINUS : '') + n(Math.abs(x));
const coins = (x) => `<span class="num">${n(x)} coins</span>`;
const ph = (t) => `<span class="ph">[${esc(t)}]</span>`; // visible placeholder for an open decision

/* ---- American odds (house margin built in). Display formats: american (default), decimal, implied. ---- */
const Odds = {
  toWin(stake, a) { // whole coins, rounded down (my choice, needs confirmation)
    if (!stake || stake <= 0) return 0;
    return Math.floor(a > 0 ? (stake * a) / 100 : (stake * 100) / -a);
  },
  decimal(a) { return a > 0 ? 1 + a / 100 : 1 + 100 / -a; },
  implied(a) { return a > 0 ? 100 / (a + 100) : -a / (-a + 100); },
  american(a) { return (a > 0 ? '+' : MINUS) + Math.abs(a); },
  fmt(a, f) {
    if (f === 'decimal') return Odds.decimal(a).toFixed(2);
    if (f === 'implied') return Math.round(Odds.implied(a) * 100) + '%';
    return Odds.american(a);
  },
  tag(a, b) { // Llamado = favourite (negative odds), Dehado = underdog (positive). Equal lines: no label (my choice).
    if (a === b) return '';
    return a < b ? 'Llamado' : 'Dehado';
  },
};

/* ---- mock clock: the demo is set on the presentation day ---- */
const NOW = new Date('2026-12-01T10:00:00+08:00');
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function pht(iso) { // Date in Manila time regardless of the viewer's zone
  const d = new Date(iso);
  const m = new Date(d.getTime() + 8 * 3600e3);
  return { y: m.getUTCFullYear(), mo: m.getUTCMonth(), d: m.getUTCDate(), wd: m.getUTCDay(), h: m.getUTCHours(), mi: m.getUTCMinutes() };
}
function clock(p) { const h = p.h % 12 || 12; return `${h}:${String(p.mi).padStart(2, '0')} ${p.h < 12 ? 'AM' : 'PM'}`; }
function when(iso, withYear) {
  const p = pht(iso);
  return `${DAY[p.wd]} ${MON[p.mo]} ${p.d}${withYear ? ', ' + p.y : ''}, ${clock(p)}`;
}
function dateOnly(iso) { const p = pht(iso); return `${MON[p.mo]} ${p.d}, ${p.y}`; }
function hoursLeft(iso) { return (new Date(iso) - NOW) / 3600e3; }
function leftText(iso) {
  const h = hoursLeft(iso);
  if (h <= 0) return 'closed';
  const d = Math.floor(h / 24), hh = Math.floor(h % 24);
  return d ? `${d} d ${hh} h left` : `${hh} h ${Math.floor((h * 60) % 60)} m left`;
}
const CLOSING_HOURS = 72; // amber "closing" inside 72 h (my choice, needs confirmation)

/* ---- icons: inline stroke SVG, aria-hidden ---- */
const ICON_PATHS = {
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  markets: 'M4 19V9M10 19V5M16 19v-7M22 19H2',
  bets: 'M7 4h10a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1zM9 9h6M9 13h4',
  community: 'M4 5h16v10H9l-5 4zM8 9h8M8 12h5',
  wallet: 'M4 7h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4zM4 7l11-3v3M16 13h2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0',
  share: 'M12 15V4M8 8l4-4 4 4M5 13v6h14v-6',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  comment: 'M5 5h14v10H10l-5 4z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  check: 'M5 12l5 5 9-10',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  pause: 'M9 6v12M15 6v12',
  play: 'M8 5l11 7-11 7z',
  dot: 'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  plus: 'M12 5v14M5 12h14',
  chev: 'M9 6l6 6-6 6',
  shield: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z',
  chart: 'M4 20V4M4 20h16M8 16l4-5 3 3 5-6',
  link: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  x2: 'M4 4l16 16',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.4-1.4M5.6 18.4L7 17M17 17l1.4 1.4M5.6 5.6L7 7',
  wait: 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9',
  id: 'M3 6h18v12H3zM7 10h4M7 14h6M15 10h3v4h-3z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
};
function icon(name, size = 22, extra = '') {
  const d = ICON_PATHS[name] || ICON_PATHS.dot;
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}><path d="${d}"/></svg>`;
}
const initials = (name) => name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
