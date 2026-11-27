/* Flow 3: community. Only verified (approved) accounts are in the app, so every user can post. */
const pname = (id) => S.d.people[id].name;
function ago(iso) {
  const h = (NOW - new Date(iso)) / 3600e3;
  if (h < 1) return Math.max(1, Math.round(h * 60)) + ' min ago';
  if (h < 24) return Math.round(h) + ' h ago';
  return dateOnly(iso).replace(', 2026', '');
}
function miniMarket(mid, forecast) {
  const m = mById(mid); if (!m) return '';
  const q = mainQ(m);
  const fq = forecast ? findQ(forecast.qid).q : null;
  return `<button type="button" class="mini" data-a="goMarket" data-id="${m.id}"><span class="mq">${esc(m.title)}</span>
    <span class="ml">${statusChip(q)} &nbsp;${esc(q.labels[0])} <span class="num">${Odds.fmt(q.odds[0], S.fmt)}</span> · ${esc(q.labels[1])} <span class="num">${Odds.fmt(q.odds[1], S.fmt)}</span></span>
    ${forecast ? `<span class="ml">Forecast: <b>${esc(fq.labels[forecast.pick])}</b>${fq.main ? '' : ' on ' + esc(fq.q)}</span>` : ''}</button>`;
}
function postCard(p, opts = {}) {
  if (p.hidden) return `<div class="post"><p class="removed">This post was removed by moderators for breaking the community guidelines.</p></div>`;
  return `<article class="post"><div class="who"><span class="av" aria-hidden="true">${initials(pname(p.by))}</span>
      <div style="flex:1"><button type="button" class="namebtn" data-a="go" data-s="profile" data-id="${p.by}">${esc(pname(p.by))}</button> <span class="ver">${icon('check', 12)}Verified</span><div class="xs muted">${ago(p.at)}</div></div></div>
    ${opts.full ? `<p class="body">${esc(p.text)}</p>` : `<button type="button" class="card tap" style="border:0;padding:0;background:none" data-a="go" data-s="post" data-id="${p.id}"><p class="body">${esc(p.text)}</p></button>`}
    ${p.mid && !opts.compact ? miniMarket(p.mid, p.forecast) : ''}
    ${p.mid && opts.compact && p.forecast ? `<span class="xs muted">Forecast: ${esc(findQ(p.forecast.qid).q.labels[p.forecast.pick])}</span>` : ''}
    <div class="acts"><button type="button" data-a="like" data-id="${p.id}" aria-pressed="${p.liked}" aria-label="Like, ${p.likes} likes">${icon('heart', 18, p.liked ? 'fill="currentColor"' : '')}<span class="num">${p.likes}</span></button>
      <button type="button" data-a="go" data-s="post" data-id="${p.id}" aria-label="${p.comments.length} comments">${icon('comment', 18)}<span class="num">${p.comments.length}</span></button>
      <button type="button" data-a="sheet" data-s="share" data-pid="${p.id}" aria-label="Share">${icon('share', 18)}Share</button>
      <button type="button" class="more" data-a="report" data-id="${p.id}" aria-label="Report post">${icon('flag', 18)}</button></div></article>`;
}
A.like = (d) => { const p = S.d.posts.find((x) => x.id === d.id); p.liked = !p.liked; p.likes += p.liked ? 1 : -1; };
A.report = (d) => { S.report = { pid: d.id, reason: '', note: '', done: false }; S.ph.sheet = { s: 'report', p: { pid: d.id } }; };

SCR.feed = {
  id: '3.01', title: 'Community feed', tab: 'community', tag: 'new',
  notes: ['New, like Kalshi/Polymarket: post, like, comment, share.', 'Only verified users can post. Every account in the app is approved, so posting comes with approval.',
    'Posts can carry a market card with live lines and the author’s forecast, never coins won.'],
  mc: ['Latest / Top tabs.', 'Report from the flag on every post.', '"Verified" mark next to each name.'],
  render() {
    const tab = S.feedTab;
    let posts = S.d.posts.slice();
    if (tab === 'top') posts.sort((a, b) => b.likes - a.likes); else posts.sort((a, b) => new Date(b.at) - new Date(a.at));
    return {
      hdr: `<div class="hdr"><h1 style="padding-left:8px">Community</h1><button type="button" class="btn p sm" data-a="compose">${icon('plus', 16)} Post</button></div>`,
      main: `<nav class="seg"><button type="button" aria-current="${tab === 'latest'}" data-a="feedt" data-v="latest">Latest</button><button type="button" aria-current="${tab === 'top'}" data-a="feedt" data-v="top">Top</button></nav>
        <p class="xs muted">Share forecasts and sources. Be civil, no tips for sale, no politics. ${ph('COMMUNITY GUIDELINES')}</p>
        ${posts.map((p) => postCard(p)).join('')}${sampleNote('Sample posts and names', false)}`,
    };
  },
};
A.feedt = (d) => { S.feedTab = d.v; };
A.compose = (d) => { S.draft = { text: '', mid: d.mid || null }; go('compose', {}); };

SCR.compose = {
  id: '3.03', title: 'Composer', tab: 'community', tag: 'new',
  notes: ['Text plus an optional market card.', 'Your own forecast is added only if you have a bet in that market (side shown, never stake or winnings).'],
  mc: ['500-character limit.', 'No images or links in posts for the POC.'],
  render() {
    const dr = S.draft; const len = dr.text.length;
    const myBet = dr.mid ? S.d.bets.filter((b) => findQ(b.qid).m.id === dr.mid).pop() : null;
    return {
      hdr: `<div class="hdr"><button type="button" class="ib" data-a="back" aria-label="Cancel">${icon('close')}</button><h1>New post</h1><button type="button" class="btn p sm" data-a="post" ${len ? '' : 'disabled'}>Post</button></div>`,
      main: `<div class="who" style="display:flex;gap:8px;align-items:center"><span class="av">${initials(pname(me))}</span><span class="small b">${esc(pname(me))}</span><span class="ver">${icon('check', 12)}Verified</span></div>
        <label for="ptext" class="sr">Post text</label><textarea id="ptext" class="inp" rows="7" maxlength="500" placeholder="Share a forecast, a source or a question" data-in="ptext">${esc(dr.text)}</textarea>
        <div class="rowline"><span class="xs muted num">${len} / 500</span><span class="xs muted">Posts are public to Tantiya members.</span></div>
        ${dr.mid ? `<div>${miniMarket(dr.mid, myBet ? { qid: myBet.qid, pick: myBet.pick } : null)}<button type="button" class="btn g sm" data-a="detach">Remove market</button></div>`
          : `<button type="button" class="btn s w" data-a="sheet" data-s="attach">${icon('plus', 16)} Attach a market</button>`}
        <p class="xs muted">Community guidelines: ${ph('COMMUNITY GUIDELINES')}. Posts may be reviewed by moderators.</p>`,
    };
  },
};
IN.ptext = (v) => { S.draft.text = v.slice(0, 500); };
A.detach = () => { S.draft.mid = null; };
A.post = () => {
  const dr = S.draft; if (!dr.text.trim()) return;
  const myBet = dr.mid ? S.d.bets.filter((b) => findQ(b.qid).m.id === dr.mid).pop() : null;
  S.d.posts.unshift({ id: 'p' + Date.now(), by: me, at: NOW.toISOString(), mid: dr.mid, forecast: myBet ? { qid: myBet.qid, pick: myBet.pick, odds: myBet.odds } : null, text: dr.text.trim(), likes: 0, liked: false, comments: [] });
  S.d.people.ana.posts += 1;
  S.draft = { text: '', mid: null }; S.feedTab = 'latest';
  S.ph.stack = [{ s: 'feed', p: {} }];
  toast('Posted to Community.');
};

SHEET.attach = {
  id: '3.04', title: 'Attach a market', tag: 'new',
  notes: ['Pick an open market to show as a card in the post.'], mc: ['Only open markets can be attached.'],
  render() {
    return S.d.markets.map((m) => `<button type="button" class="mini" data-a="attach" data-id="${m.id}"><span class="mq">${esc(m.title)}</span><span class="ml">${tplLabel(m)} · ${closeLine(mainQ(m))}</span></button>`).join('');
  },
};
A.attach = (d) => { S.draft.mid = d.id; S.ph.sheet = null; };

SCR.post = {
  id: '3.05', title: 'Post detail', tab: 'community', tag: 'new',
  notes: ['Likes and comments. Comments are by verified users, like posts.'], mc: ['Comments are flat (no replies to replies) for the POC.'],
  render(p) {
    const post = S.d.posts.find((x) => x.id === p.id);
    return {
      hdr: hdr('Post'),
      main: `${postCard(post, { full: true })}<h2 class="sec">${post.comments.length} comments</h2>
        <div>${post.comments.map((c) => `<div class="comment"><span class="av" aria-hidden="true">${initials(pname(c.by))}</span><div><div class="small"><button type="button" class="namebtn" data-a="go" data-s="profile" data-id="${c.by}">${esc(pname(c.by))}</button> <span class="xs muted">${ago(c.at)}</span></div><p class="ct">${esc(c.text)}</p></div></div>`).join('') || '<p class="muted small">No comments yet.</p>'}</div>`,
      bar: `<div class="compose"><label for="ctext" class="sr">Comment</label><input id="ctext" class="inp" placeholder="Add a comment" value="${esc(S.cdraft)}" data-in="ctext" autocomplete="off"><button type="button" class="btn p sm" data-a="comment" data-id="${post.id}" ${S.cdraft.trim() ? '' : 'disabled'}>Send</button></div>`,
    };
  },
};
IN.ctext = (v) => { S.cdraft = v.slice(0, 300); };
A.comment = (d) => { const post = S.d.posts.find((x) => x.id === d.id); post.comments.push({ by: me, at: NOW.toISOString(), text: S.cdraft.trim() }); S.cdraft = ''; };

SHEET.share = {
  id: '3.06', title: 'Share', tag: 'new',
  idFor() { return '3.06'; },
  notes: ['Share sheet with a preview of the share card (3.07).', 'The card shows the market and the person’s forecast, never winnings or stakes.'],
  mc: ['Share options: copy link, or save the card as an image. No app logos.', 'Shared links open a public preview page (an open decision).'],
  render(p) {
    const post = p.pid ? S.d.posts.find((x) => x.id === p.pid) : null;
    const mid = post ? post.mid : p.mid;
    const m = mid ? mById(mid) : null;
    let fc = post ? post.forecast : null;
    if (!post && m) { const b = betsIn(m).filter((x) => ['open', 'waiting'].includes(betOutcome(x).st)).pop(); if (b) fc = { qid: b.qid, pick: b.pick, odds: b.odds }; }
    const who = post ? pname(post.by) : pname(me);
    const fq = fc ? findQ(fc.qid).q : null;
    const card = `<figure class="sharecard" style="margin:0" aria-label="Share card preview"><div class="rowline"><span class="wmk">Tantiya</span><span class="xs muted">Play-money forecasting · 21+</span></div>
      ${m ? `<p class="b" style="line-height:1.35">${esc(m.title)}</p>` : `<p class="b">${esc(post.text.slice(0, 90))}${post.text.length > 90 ? '…' : ''}</p>`}
      ${fq ? `<p class="small">${esc(who)}’s forecast: <b class="${fc.pick ? 'ocolB' : 'ocolA'}">${esc(fq.labels[fc.pick])}</b>${fq.main ? '' : ' on “' + esc(fq.q) + '”'}</p>` : `<p class="small t2">Shared by ${esc(who)}</p>`}
      ${m ? `<p class="xs muted">${closeLine(mainQ(m))}</p>` : ''}<p class="xs muted">Sample values</p></figure>`;
    return `<p class="xs muted">Share card (3.07)</p>${card}
      <button type="button" class="listbtn" data-a="copyLink">${icon('link', 20)}<span>Copy link<span class="sub">Anyone with the link sees the card</span></span></button>
      <button type="button" class="listbtn" data-a="saveCard">${icon('copy', 20)}<span>Save card as image<span class="sub">To post anywhere</span></span></button>
      <p class="xs muted">Never shows coins, stakes or winnings.</p>`;
  },
};
A.copyLink = () => { S.ph.sheet = null; toast('Link copied (mock).'); };
A.saveCard = () => { S.ph.sheet = null; toast('Card saved (mock).'); };

const REPORT_REASONS = ['Spam or selling tips', 'Harassment or hate', 'Politics or elections', 'Misleading information', 'Personal information', 'Something else'];
SHEET.report = {
  id: '3.08', title: 'Report post', tag: 'new',
  notes: ['Report reasons, an optional note, then a plain confirmation. Reports go to the staff moderation queue (6.07).'],
  mc: ['The reason list.', 'The reporter stays anonymous to the author.'],
  render() {
    const r = S.report;
    if (r.done) return `<div class="okmark">${icon('check', 26)}</div><p class="b">Thanks, a moderator will review it.</p><p class="small t2">It goes to the staff moderation queue. The author isn’t told who reported it.</p><button type="button" class="btn p w" data-a="closeSheet">Done</button>`;
    return `<p class="small t2">Why are you reporting this post?</p>
      ${REPORT_REASONS.map((x) => `<label class="radio" data-on="${r.reason === x}"><input type="radio" name="rr" ${r.reason === x ? 'checked' : ''} data-a="rreason" data-v="${esc(x)}"><span>${esc(x)}</span></label>`).join('')}
      <div class="field"><label for="rnote">Add a note (optional)</label><textarea id="rnote" class="inp" rows="2" data-in="rnote">${esc(r.note)}</textarea></div>
      <button type="button" class="btn p w" data-a="sendReport" ${r.reason ? '' : 'disabled'}>Send report</button>`;
  },
};
A.rreason = (d) => { S.report.reason = d.v; };
IN.rnote = (v) => { S.report.note = v.slice(0, 300); };
A.sendReport = () => { const p = S.d.posts.find((x) => x.id === S.report.pid); p.reports = (p.reports || 0) + 1; p.lastReason = S.report.reason; S.report.done = true; };

SCR.profile = {
  id: '3.09', title: 'Profile', tab: 'community', tag: 'new',
  notes: ['Simple profile: display name, verified mark, posts and forecasts.', 'No coins, winnings or balances.'],
  mc: ['Display names are chosen by the user; KYC names are never shown.', 'Accuracy uses the leaderboard metric, still a placeholder.'],
  render(p) {
    const u = S.d.people[p.id]; const posts = S.d.posts.filter((x) => x.by === p.id);
    return {
      hdr: hdr(u.name),
      main: `<div style="display:flex;gap:14px;align-items:center"><span class="av lg" aria-hidden="true">${initials(u.name)}</span><div><p class="title">${esc(u.name)}</p><span class="ver">${icon('check', 12)}Verified · joined ${esc(u.joined)}</span></div></div>
        <div class="tiles"><div class="tile"><div class="k">Posts</div><div class="v">${u.posts}</div></div><div class="tile"><div class="k">Forecasts</div><div class="v">${u.forecasts}</div></div><div class="tile"><div class="k">Accuracy</div><div class="v small">${ph('METRIC')}</div></div></div>
        <h2 class="sec">Posts</h2>${posts.map((x) => postCard(x)).join('') || '<p class="muted small">No posts yet.</p>'}`,
    };
  },
};
