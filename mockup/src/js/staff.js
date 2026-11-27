/* Flow 6: staff console (desktop, English only). KYC reuses Task 10; the rest is new. */
function audit(what) { (S.audit = S.audit || []).unshift({ at: NOW.toISOString(), who: '[REVIEWER 1]', what }); }
function staffCount(k) {
  if (k === 'kyc') return S.d.kyc.filter((x) => !x.decided).length;
  if (k === 'resolution') return resQueue().length;
  if (k === 'moderation') return S.d.posts.filter((p) => p.reports && !p.hidden && !p.kept).length;
  if (k === 'withdrawals') return S.d.withdrawals.filter((w) => w.done >= 0 && w.done < 3).length;
  return 0;
}
const sampleTag = '<span class="chip neutral">Sample data</span>';

/* ---- KYC (Task 10 S4 + S5) ---- */
const REASONS = [['id_unreadable', 'ID unreadable'], ['id_expired', 'ID expired'], ['id_type_not_accepted', 'ID type not accepted'], ['face_mismatch', 'Selfie doesn’t match the ID'], ['liveness_failed', 'Liveness check failed'], ['under_21', 'Under 21 according to the ID'], ['outside_ph', 'Not in the Philippines'], ['duplicate_person', 'Same person already has an account'], ['document_suspect', 'Document looks altered or fake'], ['other', 'Other (internal note required)']];
STAFF.kyc = {
  id: 'S4', title: 'KYC review queue + decision', tag: 'reuse',
  idFor(p) { return p.id ? 'S5' : 'S4'; },
  notes: ['Reused from Task 10 (built, PR #14): queue oldest first with the 24 h target, then the application detail and decision.', 'Approving #1049 here approves the applicant in flow 1 on the phone.', 'Reason codes are placeholders until replaced (decided Nov 19).'],
  mc: [],
  render(p) {
    const sel = p.id ? S.d.kyc.find((x) => x.id === +p.id) : null;
    const full = !sel;
    const rows = S.d.kyc.map((k) => `<tr class="${sel && sel.id === k.id ? 'sel' : ''}"><td class="num">#${k.id}</td><td>${esc(k.email)}</td><td>${esc(k.doc)}</td>${full ? `<td>${esc(k.verdict)}</td><td class="num">${k.face}</td><td>${esc(k.dup)}</td>` : ''}<td class="num">${k.wait}<div class="xs muted">${k.st}</div></td>
      <td>${k.decided ? `<span class="chip closed">${esc(k.decided)}</span>` : `<button type="button" class="btn s sm" data-a="staff" data-s="kyc" data-id="${k.id}">Review</button>`}</td></tr>`).join('');
    const detail = sel ? `<aside class="sidebox"><div class="rowline"><h2 class="b">Application #${sel.id}</h2>${sel.decided ? `<span class="chip closed">${sel.decided}</span>` : '<span class="chip waiting">Waiting for decision</span>'}</div>
      <div class="kv"><span>ID document</span><span>${esc(sel.doc)} (one ID)</span></div><div class="kv"><span>Didit verdict</span><span>${esc(sel.verdict)}</span></div><div class="kv"><span>Face match / liveness</span><span class="num">${sel.face}</span></div><div class="kv"><span>Duplicate person</span><span>${esc(sel.dup)}</span></div>
      <p class="xs muted">Didit’s verdict is advice. The account stays under review until you decide. ID images stay with Didit.</p>
      <div class="kv"><span>Email</span><span>${esc(sel.email)}</span></div><div class="kv"><span>Declared 21+ and in PH</span><span>Yes, at sign-up</span></div>
      ${sel.decided ? '' : `<button type="button" class="btn p w" data-a="kycApprove" data-id="${sel.id}">Approve account</button><p class="xs muted">Adds the 1,000 starting coins and writes an audit entry.</p>
        <label class="small t2" for="rr">Reject: choose a reason</label><select id="rr" class="inp">${REASONS.map(([c, l]) => `<option value="${c}">${l} (${c})</option>`).join('')}</select>
        <button type="button" class="btn warn w" data-a="kycReject" data-id="${sel.id}">Reject application</button>`}</aside>` : '';
    return `<h1>KYC review</h1><p class="lede">A staff reviewer approves every account. Didit’s verdict is advice, not a decision. ${sampleTag}</p>
      <div class="stats"><div class="stat"><div class="k">Waiting for a decision</div><div class="v">${staffCount('kyc')}</div></div><div class="stat"><div class="k">Oldest waiting</div><div class="v">25 h 18 m</div></div><div class="stat"><div class="k">Decided within 24 h, last 7 days</div><div class="v">92%</div></div></div>
      <div class="${sel ? 'split' : ''}"><div style="overflow:auto"><table class="tbl"><thead><tr><th>Application</th><th>Applicant</th><th>ID document</th>${full ? '<th>Didit verdict</th><th>Face / liveness</th><th>Duplicate</th>' : ''}<th>Waiting</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>${detail}</div>`;
  },
};
A.kycApprove = (d) => {
  const k = S.d.kyc.find((x) => x.id === +d.id); k.decided = 'Approved'; audit(`Approved application #${k.id}`);
  if (k.demo) { S.ph.stack = [{ s: 'su8', p: {} }]; toast('Approved. The phone now shows the approval screen (flow 1).'); } else toast(`Application #${k.id} approved.`);
};
A.kycReject = (d) => { const k = S.d.kyc.find((x) => x.id === +d.id); k.decided = 'Rejected'; audit(`Rejected application #${k.id}`); toast(`Application #${k.id} rejected.`); };

/* ---- Lines and exposure ---- */
STAFF.lines = {
  id: '6.03', title: 'Lines & exposure monitor', tag: 'new',
  notes: ['Lines open from data and move automatically as bets come in. Staff see lines and exposure and can pause, but don’t set odds by hand (decided Nov 27).', 'Pause works per main market and per side bet. A paused question shows "Paused" on the phone and takes no bets.'],
  mc: ['Exposure shown as the house result if each outcome wins (stakes on the other side minus winnings owed).', 'A reason is asked for when pausing.'],
  render() {
    const rows = S.d.markets.map((m) => `<tr class="grp"><td colspan="9">${tplLabel(m)} · ${esc(m.title)}</td></tr>` + m.questions.map((q) => {
      const s = qStatus(q);
      const ifA = q.staked[1] - Odds.toWin(q.staked[0], q.odds[0]);
      const ifB = q.staked[0] - Odds.toWin(q.staked[1], q.odds[1]);
      const canPause = ['open', 'closing', 'paused'].includes(s);
      return `<tr class="sub"><td class="qcol">${q.main ? '<b>Main</b>' : 'Side'} · ${esc(q.main ? q.labels.join(' / ') : q.q)}</td>
        <td class="r num">${Odds.american(q.open[0])} / ${Odds.american(q.open[1])}</td><td class="r num b">${Odds.american(q.odds[0])} / ${Odds.american(q.odds[1])}</td>
        <td class="r num">${q.moves24}</td><td class="r num">${n(q.staked[0])} / ${n(q.staked[1])}</td>
        <td class="r num">${signed(ifA)}</td><td class="r num">${signed(ifB)}</td>
        <td>${statusChip(q)}<div class="xs muted when">${when(q.close)}</div></td>
        <td>${canPause ? `<button type="button" class="btn s sm" data-a="pauseQ" data-q="${q.id}">${s === 'paused' ? 'Resume' : 'Pause'}</button>` : '<span class="xs muted">—</span>'}</td></tr>`;
    }).join('')).join('');
    return `<h1>Lines & exposure</h1><p class="lede">Lines are set automatically: they open from data and move as bets come in. You can pause a main market or a single side bet. ${sampleTag}</p>
      <div class="stats"><div class="stat"><div class="k">Margin</div><div class="v">${ph('MARGIN')}</div></div><div class="stat"><div class="k">Line-move rule</div><div class="v small">${ph('LINE-MOVE RULE')}</div></div><div class="stat"><div class="k">Max stake per bet</div><div class="v">${ph('MAX STAKE')}</div></div><div class="stat"><div class="k">Paused now</div><div class="v">${Object.keys(S.paused).length}</div></div></div>
      <div style="overflow:auto"><table class="tbl"><thead><tr><th>Question</th><th class="r">Opening line</th><th class="r">Current line</th><th class="r">Moves 24 h</th><th class="r">Staked (1st / 2nd)</th><th class="r">House if 1st wins</th><th class="r">House if 2nd wins</th><th>Status · close</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="xs muted">Staked and exposure in coins. "1st" = Yes or Over, "2nd" = No or Under.</p>`;
  },
};
A.pauseQ = (d) => {
  const { m, q } = findQ(d.q);
  if (S.paused[q.id]) { delete S.paused[q.id]; audit(`Resumed ${shortTitle(m, q)}`); toast('Resumed. It takes bets again.'); } else { S.paused[q.id] = true; audit(`Paused ${shortTitle(m, q)}`); toast(`Paused: ${q.main ? 'main market' : 'side bet'} “${q.q}”. The phone shows it as Paused.`); }
};

/* ---- Market builder ---- */
function newBuilder() {
  return { tpl: 'cpi', q: 'PSA December inflation: over or under 3.0%?', kind: 'ou', line: '3.0', src: 'PSA consumer price index release', close: '2027-01-06T23:59', known: '2027-01-07T09:00',
    sides: [{ q: 'Over 3.5%?', close: '2027-01-06T23:59', known: '2027-01-07T09:00', src: 'PSA consumer price index release', early: '' },
      { q: 'Food inflation higher than November?', close: '2027-01-05T17:00', known: '2027-01-07T09:00', src: 'PSA consumer price index release', early: '' }] };
}
function closeCheck(close, known) {
  if (!close || !known) return '<span class="warnline">Set both times</span>';
  return close < known ? `<span class="okline">${icon('check', 14)}Closes before the answer can be known</span>` : `<span class="warnline">${icon('info', 14)}Must close before the answer can be known</span>`;
}
STAFF.builder = {
  id: '6.05', title: 'Market builder', tag: 'new',
  notes: ['Main market plus side bets. Each question has its own close time and resolution source, set when the market is built.', 'Every close time must fall before that question’s answer can become known (the form checks this).', 'The opening line is set automatically from data; staff don’t type odds.'],
  mc: ['Early-close condition per side bet (free text for now).', 'Saved as a draft; publishing needs a second staff member (two-person approval is open).'],
  render() {
    const b = S.builder || (S.builder = newBuilder());
    const side = (s, i) => `<div class="sidebox" style="background:var(--deep)"><div class="rowline"><span class="b">Side bet ${i + 1}</span><button type="button" class="btn g sm" data-a="rmSide" data-i="${i}">Remove</button></div>
      <div class="form2"><div class="field full"><label for="sq${i}">Question (Yes/No)</label><input id="sq${i}" class="inp" value="${esc(s.q)}" data-in="bSide" data-i="${i}" data-k="q"></div>
        <div class="field"><label for="sc${i}">Close time (PHT)</label><input id="sc${i}" class="inp" type="datetime-local" value="${s.close}" data-in="bSide" data-i="${i}" data-k="close"></div>
        <div class="field"><label for="sk${i}">Answer can be known from</label><input id="sk${i}" class="inp" type="datetime-local" value="${s.known}" data-in="bSide" data-i="${i}" data-k="known"></div>
        <div class="full">${closeCheck(s.close, s.known)}</div>
        <div class="field"><label for="ss${i}">Resolution source</label><input id="ss${i}" class="inp" value="${esc(s.src)}" data-in="bSide" data-i="${i}" data-k="src"></div>
        <div class="field"><label for="se${i}">Closes early if… (optional)</label><input id="se${i}" class="inp" placeholder="e.g. the answer becomes known" value="${esc(s.early)}" data-in="bSide" data-i="${i}" data-k="early"></div></div></div>`;
    return `<h1>Market builder</h1><p class="lede">Build a main market from a template, then add side bets. Each question settles on its own. No politics or elections. ${sampleTag}</p>
      <div class="split"><div style="display:flex;flex-direction:column;gap:12px">
        <div class="sidebox"><span class="b">Main market</span><div class="form2">
          <div class="field"><label for="btpl">Template</label><select id="btpl" class="inp" data-in="bTpl">${Object.entries(TPL).map(([k, l]) => `<option value="${k}" ${b.tpl === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="bkind">Type</label><select id="bkind" class="inp" data-in="bKind"><option value="yn" ${b.kind === 'yn' ? 'selected' : ''}>Yes / No</option><option value="ou" ${b.kind === 'ou' ? 'selected' : ''}>Over / under line</option></select></div>
          <div class="field full"><label for="bq">Question</label><input id="bq" class="inp" value="${esc(b.q)}" data-in="bMain" data-k="q"></div>
          ${b.kind === 'ou' ? `<div class="field"><label for="bl">Line</label><input id="bl" class="inp" value="${esc(b.line)}" data-in="bMain" data-k="line"></div><div class="field"><label>Half-point or whole line</label><span class="small t2" style="padding-top:10px">${ph('HALF-POINT LINES VS PUSHES')}</span></div>` : ''}
          <div class="field"><label for="bc">Close time (PHT)</label><input id="bc" class="inp" type="datetime-local" value="${b.close}" data-in="bMain" data-k="close"></div>
          <div class="field"><label for="bk">Answer can be known from</label><input id="bk" class="inp" type="datetime-local" value="${b.known}" data-in="bMain" data-k="known"></div>
          <div class="full">${closeCheck(b.close, b.known)}</div>
          <div class="field full"><label for="bs">Resolution source</label><input id="bs" class="inp" value="${esc(b.src)}" data-in="bMain" data-k="src"></div>
          <div class="field full"><label>Opening line</label><div class="notice">${icon('info', 16)}<span>Set automatically from data when published (${ph('OPENING-LINE SOURCE')}). Margin ${ph('MARGIN')}.</span></div></div></div></div>
        ${b.sides.map(side).join('')}
        <button type="button" class="btn s" data-a="addSide">${icon('plus', 16)} Add side bet</button></div>
      <aside class="sidebox"><span class="b">Preview</span><p class="small b">${esc(b.q)}</p><p class="xs muted">${TPL[b.tpl]} · closes ${esc(b.close.replace('T', ' '))}</p>
        <div class="hr"></div><span class="xs muted">Side bets</span>${b.sides.map((s) => `<div class="small">${esc(s.q || 'Untitled')}<div class="xs muted">closes ${esc(s.close.replace('T', ' '))}</div></div>`).join('') || '<span class="small muted">None</span>'}
        <button type="button" class="btn p" data-a="saveDraft">Save draft</button><button type="button" class="btn s" data-a="resetBuilder">Start over</button>
        <p class="xs muted">Publishing needs a second staff member: ${ph('TWO-PERSON APPROVAL')}.</p></aside></div>`;
  },
};
IN.bMain = (v, el) => { S.builder[el.dataset.k] = v; };
IN.bTpl = (v) => { S.builder.tpl = v; };
IN.bKind = (v) => { S.builder.kind = v; };
IN.bSide = (v, el) => { S.builder.sides[+el.dataset.i][el.dataset.k] = v; };
A.addSide = () => { const b = S.builder; b.sides.push({ q: '', close: b.close, known: b.known, src: b.src, early: '' }); };
A.rmSide = (d) => { S.builder.sides.splice(+d.i, 1); };
A.saveDraft = () => { const b = S.builder; const bad = [b, ...b.sides].some((x) => !(x.close < x.known)); if (bad) { toast('Fix the close times first: each must be before its answer can be known.'); return; } audit('Saved market draft: ' + b.q); toast('Draft saved (mock). Not published.'); };
A.resetBuilder = () => { S.builder = newBuilder(); };

/* ---- Resolution queue ---- */
function resQueue() {
  const out = [];
  for (const m of allMarkets()) for (const q of m.questions) {
    if (q.result !== null && q.result !== undefined) continue;
    const s = qStatus(q);
    if (s === 'closedEarly' || s === 'waiting' || s === 'closed') out.push({ m, q });
  }
  return out;
}
const EVIDENCE = { 'fx-dec4-59': 'BSP reference rate for Mon Nov 30: ₱59.02 per US$ (sample).', 'bsp-oct-una': 'Meeting highlights not published yet. Expected [DATE].' };
STAFF.resolution = {
  id: '6.06', title: 'Resolution queue', tag: 'new',
  notes: ['Questions that have closed (on time or early) and need a result. Each question, main or side bet, settles on its own.', 'Settling here updates the user’s My bets and breakdown and sends the result notification.'],
  mc: ['Evidence note required. Void returns all stakes.', 'Second approver shown as an open decision (proposal: two-person check).'],
  render(p) {
    const list = resQueue();
    const sel = p.id ? list.find((x) => x.q.id === p.id) : list[0];
    const done = (S.audit || []).filter((a) => a.what.startsWith('Settled'));
    const rows = list.map(({ m, q }) => `<tr class="${sel && sel.q.id === q.id ? 'sel' : ''}"><td class="qcol">${q.main ? '<b>Main</b>' : 'Side bet'} · ${esc(q.q)}<div class="xs muted">${tplLabel(m)} · ${esc(m.title)}</div></td><td>${statusChip(q)}</td><td>${esc(q.answerAt || q.resultNote || '')}</td><td><button type="button" class="btn s sm" data-a="staff" data-s="resolution" data-id="${q.id}">Open</button></td></tr>`).join('');
    const r = S.resPick || {};
    const detail = sel ? `<aside class="sidebox"><span class="xs muted">${tplLabel(sel.m)} · ${sel.q.main ? 'main market' : 'side bet'}</span><h2 class="b">${esc(sel.q.q)}</h2>
      <div class="kv"><span>Closed</span><span>${qStatus(sel.q) === 'closedEarly' ? 'Early' : when(sel.q.close)}</span></div>
      <div class="kv"><span>Source</span><span>${esc(sel.m.source)}</span></div>
      <div class="notice">${icon('info', 16)}<span>${esc(EVIDENCE[sel.q.id] || 'Evidence to be attached.')}${sel.q.earlyReason ? ' ' + esc(sel.q.earlyReason) : ''}</span></div>
      <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:6px"><legend class="small t2" style="margin-bottom:6px">Result</legend>
        ${[[0, sel.q.labels[0]], [1, sel.q.labels[1]], ['void', 'Void (return all stakes)']].map(([v, l]) => `<label class="radio" data-on="${r.q === sel.q.id && r.v === String(v)}"><input type="radio" name="res" ${r.q === sel.q.id && r.v === String(v) ? 'checked' : ''} data-a="resPick" data-q="${sel.q.id}" data-v="${v}"><span>${esc(l)}</span>${sel.q.proposed === v ? '<span class="chip neutral" style="margin-left:auto">From the data feed</span>' : ''}</label>`).join('')}</fieldset>
      <div class="kv"><span>Second approver</span><span>${ph('TWO-PERSON APPROVAL')}</span></div>
      <button type="button" class="btn p" data-a="settle" ${r.q === sel.q.id && r.v !== undefined ? '' : 'disabled'}>Settle this question</button></aside>` : '<aside class="sidebox"><p class="small t2">Nothing to resolve.</p></aside>';
    return `<h1>Resolution queue</h1><p class="lede">Closed questions waiting for a result. A side bet settles on its own; losing one doesn’t affect the others. ${sampleTag}</p>
      <div class="split"><div style="overflow:auto"><table class="tbl"><thead><tr><th>Question</th><th>Status</th><th>Answer known</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">Queue is empty.</td></tr>'}</tbody></table>
      ${done.length ? `<h2 class="small b" style="margin-top:16px">Settled in this session</h2><ul class="small t2">${done.map((a) => `<li>${esc(a.what)}</li>`).join('')}</ul>` : ''}</div>${detail}</div>`;
  },
};
A.resPick = (d) => { S.resPick = { q: d.q, v: d.v }; };
A.settle = () => {
  const r = S.resPick; const { m, q } = findQ(r.q);
  const v = r.v === 'void' ? 'void' : +r.v;
  settleQ(q.id, v, v === 'void' ? 'Voided by staff. Stakes returned.' : `Result: ${q.labels[v]} (${EVIDENCE[q.id] || 'staff check'})`);
  audit(`Settled ${shortTitle(m, q)}: ${v === 'void' ? 'Void' : q.labels[v]}`);
  S.resPick = null; S.st.p = {};
  toast('Settled. The user’s My bets and breakdown are updated, and a result notification was sent.');
};

/* ---- Moderation queue ---- */
STAFF.moderation = {
  id: '6.07', title: 'Moderation queue', tag: 'new',
  notes: ['Reported posts from the Community report flow (3.08).', 'Hide removes the post for everyone and leaves a "removed by moderators" note in the feed.'],
  mc: ['Actions: Keep, Hide post, Warn author.', 'Who moderates and the community guidelines are open decisions.'],
  render(p) {
    const list = S.d.posts.filter((x) => x.reports && !x.hidden && !x.kept);
    const sel = list.find((x) => x.id === p.id) || list[0];
    const rows = list.map((x) => `<tr class="${sel && sel.id === x.id ? 'sel' : ''}"><td>${esc(pname(x.by))}</td><td>${esc(x.text.slice(0, 70))}${x.text.length > 70 ? '…' : ''}</td><td class="r num">${x.reports}</td><td>${esc(x.lastReason || 'Spam or selling tips')}</td><td><button type="button" class="btn s sm" data-a="staff" data-s="moderation" data-id="${x.id}">Open</button></td></tr>`).join('');
    return `<h1>Moderation queue</h1><p class="lede">Posts reported by users. Guidelines: ${ph('COMMUNITY GUIDELINES')} · moderators: ${ph('WHO MODERATES')}. ${sampleTag}</p>
      <div class="split"><div style="overflow:auto"><table class="tbl"><thead><tr><th>Author</th><th>Post</th><th class="r">Reports</th><th>Latest reason</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="muted">No reports waiting.</td></tr>'}</tbody></table></div>
      ${sel ? `<aside class="sidebox"><span class="xs muted">Post by ${esc(pname(sel.by))} · ${ago(sel.at)}</span><p>${esc(sel.text)}</p><div class="kv"><span>Reports</span><span class="num">${sel.reports}</span></div>
        <button type="button" class="btn warn" data-a="modHide" data-id="${sel.id}">Hide post</button><button type="button" class="btn s" data-a="modKeep" data-id="${sel.id}">Keep post</button><button type="button" class="btn g" data-a="modWarn" data-id="${sel.id}">Warn author</button></aside>` : ''}</div>`;
  },
};
A.modHide = (d) => { const p = S.d.posts.find((x) => x.id === d.id); p.hidden = true; audit(`Hid post by ${pname(p.by)}`); S.st.p = {}; toast('Post hidden. The feed shows "removed by moderators".'); };
A.modKeep = (d) => { const p = S.d.posts.find((x) => x.id === d.id); p.kept = true; audit(`Kept reported post by ${pname(p.by)}`); S.st.p = {}; toast('Post kept. Reports closed.'); };
A.modWarn = (d) => { const p = S.d.posts.find((x) => x.id === d.id); audit(`Warned ${pname(p.by)}`); toast('Warning sent to the author (mock).'); };

/* ---- Withdrawal approvals ---- */
STAFF.withdrawals = {
  id: '6.08', title: 'Withdrawal approvals', tag: 'new',
  notes: ['Simulated withdrawals wait for a staff decision. Approving moves the user’s status timeline (4.05) on.', 'No money moves: this is a simulation of the flow.'],
  mc: ['Two steps: Approve, then Mark paid (simulated).'],
  render() {
    const st = (w) => w.done < 0 ? 'Rejected' : ['Waiting for review', 'Waiting for review', 'Approved · to mark paid', 'Completed'][w.done];
    const rows = S.d.withdrawals.map((w) => `<tr><td class="num">${w.id}</td><td>${esc(w.who)}${w.mine ? ' <span class="chip teal">Demo user</span>' : ''}</td><td class="r num">${n(w.amt)} coins</td><td>${when(w.at)}</td><td>${st(w)}</td>
      <td>${w.done === 0 ? `<button type="button" class="btn p sm" data-a="wdApprove" data-id="${w.id}">Approve</button> <button type="button" class="btn s sm" data-a="wdReject" data-id="${w.id}">Reject</button>` : w.done === 2 ? `<button type="button" class="btn s sm" data-a="wdPaid" data-id="${w.id}">Mark paid (simulated)</button>` : ''}</td></tr>`).join('');
    return `<h1>Withdrawal approvals</h1><p class="lede">Simulation — no money is charged or paid out. ${sampleTag}</p>
      <table class="tbl"><thead><tr><th>Request</th><th>User</th><th class="r">Amount</th><th>Requested</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      ${S.wd ? '' : '<p class="small t2">Tip: request a withdrawal on the phone (Wallet → Withdraw) to see it arrive here.</p>'}`;
  },
};
function wdSet(id, done) {
  const w = S.d.withdrawals.find((x) => x.id === id); w.done = done;
  if (w.mine && S.wd) {
    S.wd.done = done;
    if (done < 0) { S.balance += w.amt; S.d.history.unshift({ at: NOW.toISOString(), what: 'Simulated withdrawal rejected, coins returned', amt: w.amt }); S.wd = null; }
  }
  return w;
}
A.wdApprove = (d) => { const w = wdSet(d.id, 2); audit(`Approved withdrawal ${w.id}`); toast(w.mine ? 'Approved. The phone’s status timeline moved on.' : 'Approved.'); };
A.wdReject = (d) => { const w = wdSet(d.id, -1); audit(`Rejected withdrawal ${w.id}`); toast('Rejected. Coins returned to the user.'); };
A.wdPaid = (d) => { const w = wdSet(d.id, 3); audit(`Marked withdrawal ${w.id} paid (simulated)`); toast('Marked paid (simulated).'); };

/* ---- Users and audit (Task 10 S7, S8, unchanged) ---- */
STAFF.users = {
  id: 'S7', title: 'Users (Task 10)', tag: 'reuse', notes: ['Built in Task 10 (S7) and unchanged by this sprint. See the Task 9 + 10 canvas.'], mc: [],
  render() {
    return `<h1>Users</h1><p class="lede">Unchanged from Task 10 (S7): search by id or email, see a user’s status, limits and staff actions. ${sampleTag}</p>
      <table class="tbl"><thead><tr><th>User</th><th>Status</th><th>Limits</th><th>Joined</th></tr></thead><tbody>
      <tr><td>ana@example.com</td><td>Approved</td><td>${S.stakeLimit ? 'Stake ' + n(S.stakeLimit) : 'Defaults'}${S.breakUntil ? ' · on a break' : ''}${S.excluded ? ' · self-excluded' : ''}</td><td>Oct 5, 2026</td></tr>
      <tr><td>maria.santos@example.com</td><td>Under review</td><td>Defaults</td><td>Nov 14, 2026</td></tr>
      <tr><td>k.bautista@example.com</td><td>Approved</td><td>Defaults</td><td>Nov 12, 2026</td></tr></tbody></table>`;
  },
};
STAFF.audit = {
  id: 'S8', title: 'Audit log (Task 10)', tag: 'reuse', notes: ['Built in Task 10 (S8). New staff actions from this sprint (pause, settle, hide, withdrawals) show up here as they happen in the demo.'], mc: ['Which new actions are audited.'],
  render() {
    const base = [{ at: '2026-12-01T08:02:00+08:00', who: '[REVIEWER 1]', what: 'Signed in with two-step sign-in' }, { at: '2026-11-30T17:40:00+08:00', who: '[ADMIN]', what: 'Granted kyc_reviewer to [REVIEWER 2]' }];
    const all = (S.audit || []).concat(base);
    return `<h1>Audit log</h1><p class="lede">Every staff action is written here. Admin only. ${sampleTag}</p>
      <table class="tbl"><thead><tr><th>When</th><th>Staff</th><th>Action</th></tr></thead><tbody>${all.map((a) => `<tr><td>${when(a.at)}</td><td>${esc(a.who)}</td><td>${esc(a.what)}</td></tr>`).join('')}</tbody></table>`;
  },
};
