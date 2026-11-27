/* Flow 1: sign-up to approval. Reuses the Task 9 screens (copy kept), with "one ID" on 1.03.
   The tab bar is hidden until approval (my choice; Task 9 drew it). */
function suHdr() {
  return `<div class="hdr"><span class="wmk">Tantiya</span><span class="pill" aria-pressed="true" style="min-height:30px;padding:2px 10px">EN</span><span class="pill" style="min-height:30px;padding:2px 10px;opacity:.5" title="Filipino is paused for this mockup">FIL</span></div>`;
}
function suSteps(k) { return `<div class="steps" aria-label="Step ${k} of 3">${['Account', 'Identity', 'Review'].map((l, i) => `<span class="${i < k ? 'on' : ''}">${i + 1} ${l}</span>`).join('')}</div>`; }
function suFoot(status) {
  return `<div class="card" style="padding:4px 14px"><div class="kv"><span>Email</span><span>${esc(S.signup.email)}</span></div><div class="kv"><span>Account status</span><span>${esc(status)}</span></div></div>
    <button type="button" class="btn g" data-a="signout">Sign out</button>`;
}
A.signout = () => { toast('Signed out (mock).'); S.ph.stack = [{ s: 'su1', p: {} }]; };
const SU = (o) => Object.assign({ tab: null, tabbar: false, tag: 'reuse', mc: [] }, o);

SCR.su1 = SU({
  id: '1.01', title: 'Create account',
  notes: ['Reused from Task 9 (built). Email and password, plus the two declarations: 21 or older, in the Philippines.', 'Phone number, OTP and biometric login come later (decided Nov 27), so they are not here.'],
  mc: ['Tab bar hidden until the account is approved.'],
  render() {
    const s = S.signup;
    return {
      hdr: suHdr(),
      main: `<p class="title" style="font-size:28px">Create your account</p>
        <div class="field"><label for="em">Email</label><input id="em" class="inp" type="email" value="${esc(s.email)}" data-in="suEmail" autocomplete="off"></div>
        <div class="field"><label for="pw">Password</label><input id="pw" class="inp" type="password" value="password123" autocomplete="off"></div>
        <label class="check"><input type="checkbox" ${s.a21 ? 'checked' : ''} data-in="a21"><span>I am 21 or older.</span></label>
        <label class="check"><input type="checkbox" ${s.inph ? 'checked' : ''} data-in="inph"><span>I am in the Philippines.</span></label>
        ${s.err ? `<p class="small" role="alert" style="color:var(--amber)">${esc(s.err)}</p>` : ''}
        <button type="button" class="btn p w" data-a="signup">Sign up</button>
        <p class="small t2" style="text-align:center">Already have an account? <button type="button" class="btn g sm" data-a="signin">Sign in</button></p>`,
    };
  },
});
IN.suEmail = (v) => { S.signup.email = v; };
IN.a21 = (v) => { S.signup.a21 = v; S.signup.err = ''; };
IN.inph = (v) => { S.signup.inph = v; S.signup.err = ''; };
A.signup = () => { const s = S.signup; if (!s.a21 || !s.inph) { s.err = 'Tick both to continue. Tantiya is for adults 21 and over in the Philippines.'; return; } go('su2'); };
A.signin = () => toast('Sign-in screen exists in the built app; not part of this flow.');

SCR.su2 = SU({
  id: '1.02', title: 'Check email',
  notes: ['Reused from Task 9 (built).'], mc: ['"Open the link" button is a demo shortcut for the email link.'],
  render() {
    return {
      hdr: suHdr(),
      main: `<p class="title" style="font-size:28px">Create your account</p><div class="notice">${icon('mail', 18)}<span>Check <b>${esc(S.signup.email)}</b> for a link to verify your account. If you already have an account, sign in instead.</span></div>
        <button type="button" class="btn s w" data-a="resend">Resend verification email</button>
        <div class="stand"><span class="xs muted">Demo shortcut</span><button type="button" class="btn p w" data-a="go" data-s="su3">Open the verification link (simulated)</button></div>`,
    };
  },
});
A.resend = () => toast('Verification email sent again (mock).');

SCR.su3 = SU({
  id: '1.03', title: 'Verify identity', tag: 'chg',
  notes: ['Changed from Task 9: one government ID (decided Nov 27).', 'Verification runs on Didit’s hosted pages, then the applicant comes back here.'],
  mc: ['Assumes Didit still asks for a selfie and liveness check with the one ID (on the Decisions board).'],
  render() {
    return {
      hdr: suHdr(),
      main: `${suSteps(2)}<p class="title" style="font-size:28px">Verify your identity</p>
        <p class="t2">Tantiya is for adults 21 and over in the Philippines, one account per person. A short ID check confirms both.</p>
        <section class="card"><h2 class="small b">You’ll need</h2><ul class="small t2" style="margin:6px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:4px">
          <li><b>One</b> valid ID: PhilID or ePhilID, passport, driver’s license or UMID</li><li>A selfie and a short liveness check</li><li>Good light and your phone’s camera</li></ul></section>
        <section class="card"><h2 class="small b">How your data is handled</h2><p class="small t2" style="margin-top:4px">Didit, our verification provider, takes the photos and checks them. Tantiya keeps the result, not your ID images. We collect only your ID, selfie and liveness check. No address or income.</p>
          <button type="button" class="btn g sm" style="padding:0" data-a="noop">Read the privacy notice</button></section>
        <button type="button" class="btn p w" data-a="go" data-s="su3a">Start verification</button>
        <p class="xs muted" style="text-align:center">You’ll continue on Didit’s secure page, then come back here.</p>
        <button type="button" class="btn g w" data-a="browseFirst">Browse markets first</button>`,
    };
  },
});
A.noop = () => toast('Not drawn in this mockup.');
A.browseFirst = () => toast('Browsing before approval is read-only (Task 9). Not drawn in this mockup.');

SCR.su3a = SU({
  id: '1.03a', title: 'Didit hosted pages (stand-in)', tag: 'new', banner: false,
  notes: ['Didit’s own hosted screens are not drawn. This placeholder stands in for them.', 'Didit takes a photo of the one ID and a selfie with liveness, then returns the applicant to Tantiya.'],
  render() {
    return {
      hdr: `<div class="hdr"><span class="wmk" style="font-weight:600">verify.didit.me</span></div>`,
      main: `<div class="stand"><p class="b">Didit’s hosted verification</p><p class="small t2">Not drawn in this mockup. In the real flow Didit asks for:</p>
        <ol class="small t2" style="margin:0;padding-left:18px"><li>A photo of one valid ID</li><li>A selfie and a short liveness check</li></ol>
        <p class="xs muted">Then it sends the applicant back to Tantiya. Results reach Tantiya by webhook.</p></div>
        <button type="button" class="btn p w" data-a="diditDone">Finish (simulated)</button>`,
    };
  },
});
A.diditDone = () => { S.ph.stack = [{ s: 'su4', p: {} }]; };

SCR.su4 = SU({
  id: '1.04', title: 'Under review',
  notes: ['Reused from Task 9. A staff member reviews every application (proposal: staff approve every account).', 'The staff side is the KYC queue in the staff console (application #1049 is this applicant).'],
  mc: ['Demo shortcuts to approve from here or from the staff console.'],
  render() {
    return {
      hdr: suHdr(),
      main: `${suSteps(3)}<p class="title" style="font-size:28px">Under review</p><p class="t2">A staff member reviews every application. We’ll email ${esc(S.signup.email)} when it’s decided.</p>
        <ol class="timeline"><li class="done"><span class="dotc">${icon('check', 14)}</span><div><div class="k">Account created</div></div></li>
          <li class="done"><span class="dotc">${icon('check', 14)}</span><div><div class="k">ID check submitted</div></div></li>
          <li class="now"><span class="dotc">${icon('wait', 12)}</span><div><div class="k">Staff review</div><div class="s">Usually within ${ph('REVIEW TIME')}</div></div></li></ol>
        <p class="small t2">Your starting 1,000 coins arrive once you’re approved.</p>
        ${suFoot('Under review')}
        <div class="stand"><span class="xs muted">Demo shortcuts</span><button type="button" class="btn s w" data-a="staff" data-s="kyc" data-id="1049">See it in the staff KYC queue</button><button type="button" class="btn p w" data-a="approveMe">Simulate staff approval</button></div>`,
    };
  },
});
A.approveMe = () => { const k = S.d.kyc.find((x) => x.id === 1049); if (k) k.decided = 'Approved'; S.ph.stack = [{ s: 'su8', p: {} }]; };

SCR.su8 = SU({
  id: '1.08', title: 'Approved, 1,000 starting coins',
  notes: ['Reused from Task 9. Plain confirmation, no celebration.', 'Coins are play money and can’t be bought, cashed out or traded.'],
  render() {
    return {
      hdr: suHdr(),
      main: `<div class="okmark">${icon('check', 26)}</div><p class="title" style="font-size:28px">Your account is approved</p>
        <p class="t2">A staff member reviewed your application. You can now make forecasts.</p>
        <div class="card"><div class="xs muted">Starting coins</div><div class="big num">1,000 <span class="small t2">coins</span></div><div class="xs muted">Added Dec 1, 2026 · Starting grant</div></div>
        <p class="small t2">Play money: coins can’t be bought, cashed out or traded.</p>
        <button type="button" class="btn p w" data-a="tab" data-t="markets">Browse markets</button>
        <button type="button" class="btn s w" data-a="tab" data-t="wallet">View wallet</button>
        ${suFoot('Approved')}`,
    };
  },
});

/* Other Account-page states from Task 9, shown as static screens. */
function suState(id, title, status, step, body) {
  return SU({ id, title, notes: [`Reused from Task 9 (${id.replace('1.', '')}), static.`], render() { return { hdr: suHdr(), main: `${step ? suSteps(step) : ''}${body}${suFoot(status)}` }; } });
}
SCR.su5 = suState('1.05', 'ID check not finished', 'Not yet submitted', 2, `<p class="title" style="font-size:28px">ID check not finished</p><p class="t2">Your application can’t be reviewed until you finish the ID check.</p><button type="button" class="btn p w" data-a="go" data-s="su3a">Continue verification</button>`);
SCR.su6 = suState('1.06', 'Applications full', 'Not yet submitted', 2, `<p class="title" style="font-size:28px">Applications are full this month</p><p class="t2">We can check only a limited number of IDs each month. You can apply from December 1, 2026.</p><div class="card"><div class="small b">Applications reopen December 1, 2026</div><p class="small t2">Your account is saved, so you won’t need to sign up again.</p></div><button type="button" class="btn s w" data-a="browseFirst">Browse markets meanwhile</button>`);
SCR.su7 = suState('1.07', 'Not approved (re-apply TENTATIVE)', 'Not approved', 0, `<p class="title" style="font-size:28px">We couldn’t approve your application</p><div class="card"><div class="small b">Reason</div><p class="small t2">We couldn’t read your ID. The photo was blurred or cut off.</p><div class="small b" style="margin-top:8px">What you can do</div><p class="small t2">Take the ID check again with the whole ID in frame, in good light.</p></div><button type="button" class="btn p w" data-a="go" data-s="su3a">Apply again</button><p class="xs muted">This starts a new ID check on Didit’s page, in English. Questions? Email ${ph('SUPPORT EMAIL')}.</p>`);
SCR.su9 = suState('1.09', 'Receiving your result', 'ID check in progress', 3, `<p class="title" style="font-size:28px">Receiving your result</p><p class="t2">We are still receiving your verification. This page will update in a moment.</p><p class="small t2">You can leave this page. We’ll email ${esc('ana@example.com')} when a staff member has decided.</p>`);
SCR.su10 = suState('1.10', 'Confirm declarations', 'Not yet submitted', 2, `<p class="title" style="font-size:28px">Confirm two things first</p><p class="t2">We need both before the ID check can start.</p><label class="check"><input type="checkbox"><span>I am 21 or older.<span class="xs muted" style="display:block">You must be 21 or older to join.</span></span></label><label class="check"><input type="checkbox"><span>I am in the Philippines.</span></label><button type="button" class="btn p w" data-a="go" data-s="su3">Continue to ID check</button>`);
SCR.su11 = suState('1.11', 'Couldn’t start ID check', 'Not yet submitted', 2, `<p class="title" style="font-size:28px">We couldn’t start the ID check</p><p class="t2">Something went wrong. Try again in a few minutes.</p><p class="small t2">Your account and answers are saved.</p><button type="button" class="btn p w" data-a="go" data-s="su3a">Try again</button><button type="button" class="btn s w" data-a="browseFirst">Browse markets meanwhile</button>`);
