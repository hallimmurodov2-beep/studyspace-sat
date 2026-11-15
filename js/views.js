'use strict';
/* ───────────── screens ───────────── */

const VIEWS = {};
const ACT = {};
const ui = { sec: 'both', count: 10, mode: 'learn', diff: 0, learnSec: 'rw', vocabFlip: false, vocabSearch: '', reviewFilter: 'due', progSec: 'rw' };

const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const countdown = () => { const n = daysToTest(); return n == null ? '' : n > 0 ? `${plural(n, 'day')} to the SAT` : n === 0 ? 'Test day — you are ready' : 'Test date has passed'; };

function scoreCard(compact) {
  const p = predictTotal(), T = S.profile.target;
  const pos = v => ((v - 400) / 1200) * 100;
  return html`<section class="card">
    <div class="card-head"><div><div class="eyebrow">Predicted score</div></div><a class="btn sm ghost" href="#/progress">Details ${icon('right', 14)}</a></div>
    <div class="row" style="align-items:flex-end;gap:14px"><div class="big">${p.score}</div><div class="muted small" style="padding-bottom:6px">likely ${p.lo}–${p.hi}</div></div>
    <div class="score-range" title="Your likely range, with your target marked"><i style="left:${pos(p.lo)}%;right:${100 - pos(p.hi)}%"></i><b style="left:${pos(p.score)}%"></b><u style="left:${pos(T)}%"></u></div>
    <div class="spread tiny faint"><span>400</span><span>Target ${T}${p.score >= T ? ' · on track' : ` · ${T - p.score} to go`}</span><span>1600</span></div>
    ${compact ? '' : html`<hr class="sep"><div class="grid g2" style="gap:12px">
      ${['rw', 'math'].map(sec => html`<div><div class="row small"><span class="dot" style="--c:${secColor(sec)}"></span><b>${SECTIONS[sec].name}</b></div><div class="kpi" style="margin-top:6px"><b>${p[sec].score}</b><span>${p[sec].lo}–${p[sec].hi}</span></div></div>`)}
    </div>
    <p class="tiny faint" style="margin-top:12px">${p.n < 30 ? 'An early estimate: it gets sharper with every question you answer.' : `Based on ${p.n} answers and your practice tests.`}</p>`}
  </section>`;
}

/* ═════ TODAY ═════ */
VIEWS.today = () => {
  const T = todaySession(), plan = T.plan, done = (S.log[todayStr()] || {}).done, mins = minutesToday(), goal = S.profile.minutes;
  const nMist = dueMistakes().length;
  const step = (glyph, color, title, sub, act, isDone, extra = '') => html`<div class="step ${isDone ? 'done' : ''}" style="--c:${color}"><div class="glyph">${icon(isDone ? 'check' : glyph, 20)}</div><div class="grow"><div class="h3">${title}</div><div class="small muted">${sub}</div></div>${extra}${act ? html`<button class="btn sm" ${raw(act)}>${icon('play', 13)} Start</button>` : ''}</div>`;
  let hero;
  if (plan.kind === 'test') hero = html`<section class="card hero"><div class="eyebrow">Today</div><h2 class="h1" style="margin:6px 0 8px">Practice test day</h2><p class="muted" style="max-width:520px">A full, timed, adaptive test: Reading and Writing (2 × 32 min), then Math (2 × 35 min). Find a quiet place and about 2 hours 15 minutes.</p><div class="row wrap" style="margin-top:18px"><button class="btn primary lg" data-act="start-test" data-form="full">${icon('play', 16)} Start the practice test</button><button class="btn ghost" data-act="start-today">Do a normal session instead</button></div></section>`;
  else if (plan.kind === 'exam') hero = html`<section class="card hero"><div class="eyebrow">Today</div><h2 class="h1" style="margin:6px 0 8px">Test day. You've got this.</h2><p class="muted">Bring your admission ticket, ID and a charged device. Read every question twice, flag and move on when stuck, and come back at the end.</p></section>`;
  else hero = html`<section class="card hero">
    <div class="spread"><div><div class="eyebrow">${plan.kind === 'off' ? 'Day off — optional practice' : plan.kind === 'rest' ? 'The day before' : "Today's session"}</div>
      <h2 class="h2" style="margin-top:6px;font-size:22px">${done ? 'Done for today — nice work.' : plan.kind === 'rest' ? 'Keep it light today' : `About ${goal} minutes, built from your weakest skills`}</h2></div>
      ${ring(Math.min(1, mins / goal), 64, 7, 'var(--accent)', '')}</div>
    <div class="small muted" style="margin:4px 0 16px">${mins} of ${goal} min studied today</div>
    <div class="steps">
      ${step('redo', 'var(--warn)', T.review.length ? `Review ${plural(T.review.length, 'missed question')}` : 'Mistakes review', T.review.length ? 'Questions you missed, coming back on schedule' : 'Nothing due — great', T.review.length ? 'data-act="start-review"' : '', !T.review.length)}
      ${step('target', 'var(--math)', `Math · ${SKILL[T.focus[0]].name}`, `${T.nMath} questions · ${LEVELS[level(T.focus[0])][0]}`, `data-act="start-skill" data-skill="${T.focus[0]}" data-n="${T.nMath}"`, false, html`<a class="btn sm ghost hide-sm" href="#/learn/${T.focus[0]}">Lesson</a>`)}
      ${step('book', 'var(--rw)', `Reading & Writing · ${T.rwParts.map(([id]) => SKILL[id].name).join(' + ')}`, `${sum(T.rwParts, x => x[1])} questions · ${LEVELS[level(T.focus[1])][0]}`, 'data-act="start-rw-today"', false, html`<a class="btn sm ghost hide-sm" href="#/learn/${T.focus[1]}">Lesson</a>`)}
      ${step('cards', 'var(--accent)', 'Vocabulary', T.vocab ? `${plural(T.vocab, 'card')} ready` : 'All caught up', T.vocab ? 'data-act="go" data-to="vocab"' : '', !T.vocab)}
    </div>
    <div class="row wrap" style="margin-top:18px"><button class="btn primary lg" data-act="start-today">${icon('play', 16)} ${done ? 'Another round' : 'Start everything in one go'}</button><span class="small faint">Review → Math → Reading & Writing, with explanations after each answer.</span></div>
  </section>`;

  const topPer = sec => { const seen = new Set(); return priorities(sec).filter(p => !seen.has(SKILL[p.id].dom) && seen.add(SKILL[p.id].dom)).slice(0, 2); };
  const pr = [...topPer('math'), ...topPer('rw')];
  const wk = weekStrip(), wmax = Math.max(goal, ...wk.map(x => x.min));
  return html`
  <div class="page-head"><div><h1 class="h1">${greeting()}${S.profile.name ? ', ' + S.profile.name : ''}</h1><div class="sub">${fmtDate(todayStr(), true)}${countdown() ? ' · ' + countdown() : ''}</div></div>
    <div class="row wrap">${nMist ? html`<a class="chip warn" href="#/review">${plural(nMist, 'review')} due</a>` : ''}<button class="btn" data-act="go" data-to="practice">${icon('bolt', 15)} Quick practice</button></div></div>
  <div class="grid g-main">
    <div class="col" style="gap:16px">
      ${hero}
      <section class="card"><div class="card-head"><h2 class="h2">Where your points are</h2><a class="btn sm ghost" href="#/learn">All skills ${icon('right', 14)}</a></div>
        <p class="small muted" style="margin:-6px 0 12px">The skills that would raise your score most right now — weighted by how often they appear on the test.</p>
        <div class="list">${pr.map(p => { const s = SKILL[p.id], sec = secOf(p.id); return html`<a class="list-row" href="#/learn/${s.id}"><span class="dot" style="--c:${secColor(sec)}"></span><div class="grow"><div style="font-weight:600">${s.name}</div><div class="tiny faint">${DOMAIN[s.dom].name}</div></div><div style="width:110px">${skillBar(s.id)}</div>${lvlLabel(s.id)}</a>`; })}</div>
      </section>
    </div>
    <div class="col" style="gap:16px">
      ${scoreCard(false)}
      <section class="card"><div class="card-head"><h2 class="h2">This week</h2><span class="small faint">${sum(wk, x => x.min)} min · ${sum(wk, x => x.q)} questions</span></div>
        <div class="week">${wk.map(x => html`<div class="week-day ${x.d === todayStr() ? 'today' : ''}" title="${x.min} min, ${x.q} questions"><div class="col-bar"><i style="height:${Math.round(100 * x.min / wmax)}%"></i></div>${DAYS[dow(x.d) - 1].slice(0, 2)}</div>`)}</div>
      </section>
      ${orbitCard()}
    </div>
  </div>`;
};

function orbitCard() {
  const here = orbitHere(), last = S.orbit.lastSent;
  return html`<section class="card"><div class="row" style="margin-bottom:8px"><span style="color:var(--accent)">${icon('orbit', 20)}</span><h2 class="h2 grow">Studyspace Orbit</h2>${here ? html`<span class="chip ok">Connected</span>` : ''}</div>
    <p class="small muted">${here ? 'Orbit is on this address: one tap puts your SAT date, readiness and the next two weeks of study into it.' : 'Put your SAT date, readiness and the next two weeks of study into your Orbit planner as a file Orbit can import.'}</p>
    <div class="row wrap" style="margin-top:12px"><button class="btn sm primary" data-act="orbit-send">${icon('send', 14)} ${here ? 'Send to Orbit' : 'Save for Orbit'}</button><a class="btn sm ghost" href="#/plan">Options</a></div>
    ${last ? html`<div class="tiny faint" style="margin-top:8px">Last sent ${relDay(ymd(new Date(last))).toLowerCase()}</div>` : ''}</section>`;
}

/* ═════ PRACTICE ═════ */
VIEWS.practice = () => {
  const seg = (key, opts) => html`<div class="seg">${opts.map(([v, l]) => html`<button class="${ui[key] === v ? 'on' : ''}" data-act="ui" data-k="${key}" data-v="${v}">${l}</button>`)}</div>`;
  const secs = ui.sec === 'both' ? ['rw', 'math'] : [ui.sec];
  return html`
  <div class="page-head"><div><h1 class="h1">Practice</h1><div class="sub">Pick a mix or a single skill. Math questions are generated fresh every time, so you never run out.</div></div></div>
  <section class="card" style="margin-bottom:18px">
    <div class="grid g2" style="gap:18px">
      <label class="field">Section ${seg('sec', [['both', 'Both'], ['rw', 'Reading & Writing'], ['math', 'Math']])}</label>
      <label class="field">Questions ${seg('count', [[5, '5'], [10, '10'], [20, '20'], [27, '27']])}</label>
      <label class="field">Mode ${seg('mode', [['learn', 'Learn — explain each answer'], ['timed', 'Timed — like the test']])}</label>
      <label class="field">Difficulty ${seg('diff', [[0, 'Adaptive'], [1, 'Easy'], [2, 'Medium'], [3, 'Hard']])}</label>
    </div>
    <div class="row wrap" style="margin-top:18px"><button class="btn primary lg" data-act="start-mix">${icon('sparkle', 16)} Smart mix · ${ui.count} questions</button><span class="small faint">Weighted toward the skills that would raise your score most.</span></div>
  </section>
  ${secs.map(sec => html`<h2 class="h2" style="margin:24px 0 12px">${SECTIONS[sec].name}</h2>
    <div class="grid g2">${domainsIn(sec).map(d => html`<section class="card"><div class="spread" style="margin-bottom:10px"><h3 class="h3">${d.name}</h3><span class="tiny faint">${Math.round(d.weight * 100)}% of section</span></div>
      <div class="list">${skillsIn(d.id).map(s => html`<button class="list-row" data-act="start-skill" data-skill="${s.id}"><div class="grow"><div style="font-weight:600">${s.name}</div><div style="max-width:200px;margin-top:6px">${skillBar(s.id)}</div></div>${lvlLabel(s.id)}<span class="faint">${icon('play', 14)}</span></button>`)}</div></section>`)}</div>`)}`;
};

/* ═════ LEARN ═════ */
VIEWS.learn = (arg) => {
  if (arg && SKILL[arg]) return skillPage(SKILL[arg]);
  const sec = ui.learnSec;
  return html`
  <div class="page-head"><div><h1 class="h1">Learn</h1><div class="sub">Every skill on the Digital SAT, how ready you are, a short lesson, and Khan Academy's free videos and practice for it.</div></div>
    <div class="row wrap"><div class="seg">${['rw', 'math'].map(s => html`<button class="${sec === s ? 'on' : ''}" data-act="ui" data-k="learnSec" data-v="${s}">${SECTIONS[s].name}</button>`)}</div><button class="btn" data-act="reference">${icon('ref', 15)} Reference sheet</button></div></div>
  ${domainsIn(sec).map(d => html`<div class="dom"><div class="dom-head"><h2 class="h2">${d.name}</h2><span class="small faint">${Math.round(d.weight * 100)}% of the section · ${pct(avg(skillsIn(d.id), s => mastery(s.id)))} ready</span></div>
    ${skillsIn(d.id).map(s => html`<a class="skill-row" href="#/learn/${s.id}"><div><div style="font-weight:600">${s.name}</div><div class="tiny faint">${raw(M(s.learn.what))}</div></div><div>${skillBar(s.id)}</div>${lvlLabel(s.id)}</a>`)}</div>`)}
  <section class="card"><h2 class="h2" style="margin-bottom:10px">Before you start</h2><p class="small muted" style="margin-bottom:12px">Short official-format guides on Khan Academy.</p>
    <div class="grid g2" style="gap:8px">${GUIDES.map(g => html`<a class="res" href="${g.url}" target="_blank" rel="noopener">${icon('book', 16)}<span>${g.title}</span><span class="faint">${icon('ext', 14)}</span></a>`)}</div></section>`;
};
function skillPage(s) {
  const sec = secOf(s.id), r = skillRec(s.id) || { n: 0, c: 0 }, L = s.learn;
  const recent = S.attempts.filter(a => a.s === s.id).slice(-20);
  const kinds = [['lesson', 'Read', 'book'], ['video', 'Watch', 'video'], ['practice', 'Practice on Khan Academy', 'target']];
  return html`
  <a class="btn sm ghost" href="#/learn" style="margin-bottom:12px">${icon('left', 14)} All skills</a>
  <div class="page-head"><div><div class="row" style="margin-bottom:6px">${secChip(sec)}<span class="small faint">${DOMAIN[s.dom].name}</span></div><h1 class="h1">${s.name}</h1><div class="sub">${raw(M(L.what))}</div></div>
    <div class="row wrap"><button class="btn primary" data-act="start-skill" data-skill="${s.id}" data-n="10">${icon('play', 15)} Practice 10</button><button class="btn" data-act="start-skill" data-skill="${s.id}" data-n="6" data-spread="1">Easy → hard (6)</button></div></div>
  <div class="grid g-main">
    <div class="col" style="gap:16px">
      <section class="card lesson"><h2 class="h2">How to do it</h2><ul>${L.steps.map(x => html`<li>${raw(M(x))}</li>`)}</ul>
        ${L.table ? html`<table>${L.table.map(([a, b]) => html`<tr><td>${a}</td><td>${b}</td></tr>`)}</table>` : ''}
        <h3 class="h3" style="margin-top:18px">Traps the test sets</h3><ul>${L.traps.map(x => html`<li>${raw(M(x))}</li>`)}</ul></section>
      <section class="card"><div class="card-head"><h2 class="h2">Khan Academy</h2><span class="tiny faint">Free · opens in a new tab</span></div>
        ${kinds.map(([k, label, ic]) => { const list = s.ka.filter(x => x.type === k); return list.length ? html`<div class="eyebrow" style="margin:12px 0 8px">${label}</div><div class="col" style="gap:8px">${list.map(x => html`<a class="res" href="${x.url}" target="_blank" rel="noopener">${icon(ic, 16)}<span>${x.title}</span><span class="faint">${icon('ext', 14)}</span></a>`)}</div>` : ''; })}
      </section>
    </div>
    <div class="col" style="gap:16px">
      <section class="card"><div class="eyebrow">Your level</div><div class="row" style="margin:8px 0 10px">${lvlLabel(s.id)}<span class="grow"></span>${pips(s.id, secColor(sec))}</div>${skillBar(s.id)}
        <div class="grid g2" style="gap:10px;margin-top:16px"><div class="kpi"><b>${r.n}</b><span>answered</span></div><div class="kpi"><b>${r.n ? pct(r.c / r.n) : '—'}</b><span>correct</span></div></div>
        ${recent.length ? html`<div class="row" style="gap:4px;margin-top:14px;flex-wrap:wrap" title="Last ${recent.length} answers, oldest first">${recent.map(a => html`<span style="width:10px;height:10px;border-radius:3px;background:${a.ok ? 'var(--ok)' : 'var(--danger)'}"></span>`)}</div>` : html`<p class="small faint" style="margin-top:12px">No answers yet — try a few questions to place yourself.</p>`}
      </section>
      ${Object.values(S.mistakes).some(m => m.s === s.id) ? html`<section class="card"><h3 class="h3">Your missed questions here</h3><p class="small muted" style="margin:6px 0 10px">${plural(Object.values(S.mistakes).filter(m => m.s === s.id).length, 'question')} waiting in your review list.</p><a class="btn sm" href="#/review">Open review</a></section>` : ''}
    </div>
  </div>`;
}

/* ═════ REVIEW ═════ */
VIEWS.review = () => {
  const all = Object.entries(S.mistakes).map(([key, m]) => ({ key, ...m })), due = all.filter(m => m.due <= todayStr());
  const list = (ui.reviewFilter === 'due' ? due : all).sort((a, b) => a.due.localeCompare(b.due));
  const reasons = REASONS.map(([k, l]) => [l, all.filter(m => m.reason === k).length]).filter(x => x[1]);
  return html`
  <div class="page-head"><div><h1 class="h1">Review</h1><div class="sub">Every question you miss comes back after 1, 3, 7, 16 and 35 days. Get it right five times in a row and it retires. Math comes back as a fresh variant, so you learn the method, not the answer.</div></div>
    ${due.length ? html`<button class="btn primary lg" data-act="start-review">${icon('play', 16)} Review ${due.length} due</button>` : ''}</div>
  <div class="grid g3" style="margin-bottom:18px">
    <div class="card"><div class="kpi"><b>${due.length}</b><span>due today</span></div></div>
    <div class="card"><div class="kpi"><b>${all.length}</b><span>in your review list</span></div></div>
    <div class="card"><div class="kpi"><b>${S.retired}</b><span>retired for good</span></div></div>
  </div>
  ${reasons.length ? html`<section class="card" style="margin-bottom:18px"><h3 class="h3" style="margin-bottom:10px">Why you miss questions</h3><div class="col" style="gap:8px">${reasons.map(([l, n]) => html`<div class="row"><span style="width:200px" class="small">${l}</span><div class="grow">${bar(n / all.length)}</div><span class="small faint num" style="width:30px;text-align:right">${n}</span></div>`)}</div></section>` : ''}
  <div class="spread" style="margin-bottom:10px"><div class="seg"><button class="${ui.reviewFilter === 'due' ? 'on' : ''}" data-act="ui" data-k="reviewFilter" data-v="due">Due (${due.length})</button><button class="${ui.reviewFilter === 'all' ? 'on' : ''}" data-act="ui" data-k="reviewFilter" data-v="all">All (${all.length})</button></div></div>
  <section class="card">${list.length ? html`<div class="list">${list.map(m => { const s = SKILL[m.s]; return html`<button class="list-row" data-act="open-mistake" data-key="${m.key}"><span class="dot" style="--c:${secColor(secOf(m.s))}"></span><div class="grow"><div style="font-weight:600">${s ? s.name : m.s}</div><div class="tiny faint">Missed ${relDay(m.added).toLowerCase()}${m.misses > 1 ? ` · ${m.misses} times` : ''}${m.reason ? ' · ' + REASONS.find(r => r[0] === m.reason)[1] : ''}</div></div><span class="pips">${[0, 1, 2, 3, 4].map(i => html`<i class="${i < m.box ? 'on' : ''}"></i>`)}</span><span class="small ${m.due <= todayStr() ? '' : 'faint'}" style="width:80px;text-align:right">${m.due <= todayStr() ? 'Due' : relDay(m.due)}</span></button>`; })}</div>`
    : html`<div class="empty">${icon('check', 30)}<div class="h2">${ui.reviewFilter === 'due' ? 'Nothing due' : 'No missed questions yet'}</div><p>${ui.reviewFilter === 'due' ? 'Come back tomorrow, or practice something new.' : 'Questions you miss in practice land here automatically.'}</p></div>`}</section>`;
};

/* ═════ VOCABULARY ═════ */
VIEWS.vocab = () => {
  const q = vocabQueue(10), cur = q[0];
  const counts = { new: VOCAB.filter(([w]) => !S.vocab[w]).length, learning: Object.values(S.vocab).filter(v => v.box < 3).length, known: wordsKnown() };
  const search = ui.vocabSearch.toLowerCase(), shown = VOCAB.filter(([w, , d]) => !search || w.includes(search) || d.toLowerCase().includes(search));
  return html`
  <div class="page-head"><div><h1 class="h1">Vocabulary</h1><div class="sub">${VOCAB.length} words that show up in Words in Context questions — each with a sentence that shows how it is used. Ten new words a day; the rest come back when you are about to forget them.</div></div></div>
  <div class="grid g-main">
    <section class="card">${cur ? html`
      <div class="spread"><span class="small faint">${plural(q.length, 'card')} left today</span><span class="chip">${S.vocab[cur[0]] ? 'Review' : 'New'}</span></div>
      <div class="flash" data-act="flip">
        <div class="word">${cur[0]}</div><div class="faint small">${cur[1]}</div>
        ${ui.vocabFlip ? html`<div class="def">${cur[2]}</div><div class="ex">“${cur[3]}”</div>` : html`<div class="small faint" style="margin-top:12px">Say what it means, then tap (or press Space)</div>`}
      </div>
      ${ui.vocabFlip ? html`<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap"><button class="btn" data-act="grade-word" data-g="0">Didn't know <kbd>1</kbd></button><button class="btn" data-act="grade-word" data-g="1">Hard <kbd>2</kbd></button><button class="btn primary" data-act="grade-word" data-g="2">Knew it <kbd>3</kbd></button></div>`
        : html`<div class="row" style="justify-content:center"><button class="btn primary" data-act="flip">Show meaning <kbd>Space</kbd></button></div>`}`
      : html`<div class="empty">${icon('check', 30)}<div class="h2">All caught up</div><p>New words unlock tomorrow. ${counts.known} words known so far.</p></div>`}
    </section>
    <section class="card"><div class="grid g3" style="gap:10px"><div class="kpi"><b>${counts.known}</b><span>known</span></div><div class="kpi"><b>${counts.learning}</b><span>learning</span></div><div class="kpi"><b>${counts.new}</b><span>new</span></div></div>
      <hr class="sep"><input class="input" placeholder="Search words or meanings" value="${ui.vocabSearch}" data-input="vocabSearch">
      <div class="list" style="max-height:420px;overflow-y:auto;margin-top:8px">${shown.map(([w, p, d]) => { const v = S.vocab[w]; return html`<div class="list-row"><div class="grow"><b>${w}</b> <span class="tiny faint">${p}</span><div class="small muted">${d}</div></div>${v ? html`<span class="pips">${[1, 2, 3, 4, 5].map(i => html`<i class="${i <= v.box ? 'on' : ''}"></i>`)}</span>` : ''}</div>`; })}</div></section>
  </div>`;
};

/* ═════ TESTS ═════ */
VIEWS.tests = () => {
  const forms = [['full', '2 h 14 min', '98 questions · both sections, adaptive', 'grid'], ['rw', '64 min', '54 questions · 2 modules', 'book'], ['math', '70 min', '44 questions · 2 modules', 'target'], ['mini', '67 min', '50 questions · half-length modules', 'bolt']];
  const past = S.tests.slice().reverse();
  return html`
  <div class="page-head"><div><h1 class="h1">Practice tests</h1><div class="sub">Timed like the Digital SAT: two modules per section, and the second module gets harder or easier depending on how the first went. Scores are estimates. For official tests, use College Board's Bluebook app too.</div></div></div>
  <div class="grid g2" style="margin-bottom:22px">${forms.map(([k, time, sub, ic]) => html`<button class="card" data-act="start-test" data-form="${k}"><div class="row"><div class="step" style="padding:0;border:0;background:none"><div class="glyph">${icon(ic, 20)}</div></div><div class="grow"><div class="h3">${TEST_FORMS[k].name}</div><div class="small muted">${sub}</div></div><span class="chip">${time}</span></div></button>`)}</div>
  <section class="card"><h2 class="h2" style="margin-bottom:10px">Your results</h2>
    ${past.length ? html`<div class="list">${past.map(t => html`<button class="list-row" data-act="open-test" data-id="${t.id}"><div class="grow"><div style="font-weight:600">${TEST_FORMS[t.form].name}</div><div class="tiny faint">${fmtDate(ymd(new Date(t.at)), true)}${t.timedOut ? ' · time ran out' : ''}</div></div>${Object.entries(t.sections).map(([sec, x]) => html`<span class="chip ${sec}">${SECTIONS[sec].short} ${x.score}</span>`)}${t.total ? html`<b class="num" style="width:56px;text-align:right">${t.total}</b>` : ''}</button>`)}</div>`
      : html`<div class="empty">${icon('clock', 28)}<div class="h2">No tests yet</div><p>Take one early to see where you stand, then one every couple of weeks.</p></div>`}
  </section>`;
};

/* ═════ PROGRESS ═════ */
function lineChart(series, { h = 200, min = 400, max = 1600, target } = {}) {
  const W = 640, L = 40, B = 24, T = 10;
  const days = [...new Set(series.flatMap(s => s.pts.map(p => p[0])))].sort();
  if (days.length < 2) return html`<p class="small faint">The chart appears after you have practiced on two different days.</p>`;
  const x = d => L + (W - L - 10) * days.indexOf(d) / (days.length - 1), y = v => h - B - (h - B - T) * (v - min) / (max - min);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = min + (max - min) * i / 4; g += `<line x1="${L}" x2="${W - 10}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`; }
  if (target) g += `<line x1="${L}" x2="${W - 10}" y1="${y(target)}" y2="${y(target)}" stroke="var(--ok)" stroke-dasharray="4 4"/><text x="${W - 12}" y="${y(target) - 5}" text-anchor="end" style="fill:var(--ok)">target ${target}</text>`;
  [days[0], days[days.length - 1]].forEach((d, i) => { g += `<text x="${x(d)}" y="${h - 6}" text-anchor="${i ? 'end' : 'start'}">${fmtDate(d)}</text>`; });
  for (const s of series) {
    if (!s.pts.length) continue;
    g += `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${s.pts.map(p => `${x(p[0])},${y(p[1])}`).join(' ')}"/>`;
    s.pts.forEach(p => { g += `<circle cx="${x(p[0])}" cy="${y(p[1])}" r="${s.dots ? 5 : 2.5}" fill="${s.color}"/>`; });
  }
  return html`<div class="chart">${raw(`<svg viewBox="0 0 ${W} ${h}">${g}</svg>`)}</div>`;
}
VIEWS.progress = () => {
  const hist = Object.entries(S.history).sort(([a], [b]) => a.localeCompare(b));
  const predicted = hist.map(([d, v]) => [d, v.rw + v.math]);
  const tests = S.tests.filter(t => t.form === 'full' || t.form === 'mini').map(t => [ymd(new Date(t.at)), t.total]);
  const last30 = S.attempts.filter(a => a.at > Date.now() - 30 * 864e5);
  const pace = sec => { const xs = last30.filter(a => SKILL[a.s] && secOf(a.s) === sec && a.m !== 'learn'); return xs.length ? Math.round(avg(xs, a => a.t)) : 0; };
  const heat = []; for (let i = 83; i >= 0; i--) { const d = addDays(todayStr(), -i), L = S.log[d]; heat.push([d, L ? L.sec / 60 : 0]); }
  const totalMin = Math.round(sum(Object.values(S.log), L => L.sec) / 60);
  return html`
  <div class="page-head"><div><h1 class="h1">Progress</h1><div class="sub">How your predicted score has moved, where you are strong and where the points are.</div></div></div>
  <div class="grid g3" style="margin-bottom:16px">
    <div class="card"><div class="kpi"><b>${S.attempts.length}</b><span>questions answered</span></div></div>
    <div class="card"><div class="kpi"><b>${S.attempts.length ? pct(S.attempts.filter(a => a.ok).length / S.attempts.length) : '—'}</b><span>correct overall</span></div></div>
    <div class="card"><div class="kpi"><b>${fmtMin(totalMin)}</b><span>studied in total</span></div></div>
  </div>
  <div class="grid g-main">
    <section class="card"><div class="card-head"><h2 class="h2">Score over time</h2><div class="row small"><span class="dot" style="--c:var(--accent)"></span>predicted <span class="dot" style="--c:var(--warn);margin-left:8px"></span>practice tests</div></div>
      ${lineChart([{ pts: predicted, color: 'var(--accent)' }, { pts: tests, color: 'var(--warn)', dots: true }], { target: S.profile.target })}</section>
    ${scoreCard(false)}
  </div>
  <div class="grid g2" style="margin-top:16px">
    ${['rw', 'math'].map(sec => html`<section class="card"><h2 class="h2" style="margin-bottom:14px">${SECTIONS[sec].name}</h2>
      ${domainsIn(sec).map(d => { const m = avg(skillsIn(d.id), s => mastery(s.id)); return html`<div style="margin-bottom:14px"><div class="spread small" style="margin-bottom:6px"><b>${d.name}</b><span class="faint">${pct(m)} · ${Math.round(d.weight * 100)}% of section</span></div>${bar(m, secColor(sec))}</div>`; })}
      <div class="small muted">Average time per question in timed practice: <b>${pace(sec) ? pace(sec) + ' s' : '—'}</b> (test pace ≈ ${SECTIONS[sec].pace} s)</div></section>`)}
  </div>
  <section class="card" style="margin-top:16px"><div class="card-head"><h2 class="h2">Last 12 weeks</h2><span class="small faint">each square is a day</span></div>
    <div class="heat">${heat.map(([d, m]) => html`<i title="${fmtDate(d)}: ${Math.round(m)} min" style="${m ? `background:color-mix(in srgb, var(--accent) ${Math.min(100, 25 + m * 1.5)}%, var(--surface-3))` : ''}"></i>`)}</div></section>`;
};

/* ═════ PLAN ═════ */
VIEWS.plan = () => {
  const P = S.profile, up = upcoming(14), dtt = daysToTest();
  return html`
  <div class="page-head"><div><h1 class="h1">Your plan</h1><div class="sub">Set the date and how much time you have; the daily sessions, review and practice tests adjust around it.</div></div></div>
  <div class="grid g-main">
    <div class="col" style="gap:16px">
      <section class="card"><div class="grid g2" style="gap:16px">
        <label class="field">Test date<input class="input" type="date" value="${P.testDate}" min="${todayStr()}" data-set="testDate"></label>
        <label class="field">Target score: <b style="color:var(--text)">${P.target}</b><input type="range" min="800" max="1600" step="10" value="${P.target}" data-set="target"></label>
        <label class="field">Minutes per study day: <b style="color:var(--text)">${P.minutes}</b><input type="range" min="15" max="150" step="5" value="${P.minutes}" data-set="minutes"></label>
        <div class="field">Study days<div class="daypick">${DAYS.map((d, i) => html`<button class="${P.days.includes(i + 1) ? 'on' : ''}" data-act="toggle-day" data-d="${i + 1}">${d}</button>`)}</div></div>
        <label class="field">Last R&W score (optional)<input class="input" type="number" min="200" max="800" step="10" placeholder="e.g. 560" value="${P.start.rw || ''}" data-set="start.rw"></label>
        <label class="field">Last Math score (optional)<input class="input" type="number" min="200" max="800" step="10" placeholder="e.g. 590" value="${P.start.math || ''}" data-set="start.math"></label>
      </div>
      ${dtt != null && dtt > 0 ? html`<div class="note accent" style="margin-top:16px">${plural(dtt, 'day')} left · about ${plural(Math.round(dtt * P.days.length / 7), 'study day')} · ${fmtMin(Math.round(dtt * P.days.length / 7) * P.minutes)} of practice at this pace.</div>` : ''}</section>
      <section class="card"><div class="card-head"><h2 class="h2">Next two weeks</h2><span class="small faint">recalculated as your skills change</span></div>
        <div class="list">${up.map(x => html`<div class="list-row"><div style="width:96px" class="small ${x.day === todayStr() ? '' : 'muted'}"><b>${relDay(x.day)}</b></div><div class="grow small">${x.kind === 'off' ? html`<span class="faint">Day off</span>` : x.kind === 'test' ? html`<span class="chip warn">Practice test</span>` : x.kind === 'exam' ? html`<span class="chip ok">SAT</span>` : x.title}</div>${x.minutes ? html`<span class="tiny faint">${fmtMin(x.minutes)}</span>` : ''}${(S.log[x.day] || {}).done ? html`<span class="chip ok">${icon('check', 12)} done</span>` : ''}</div>`)}</div></section>
    </div>
    <div class="col" style="gap:16px">
      ${orbitCard()}
      <section class="card"><h3 class="h3">What Orbit receives</h3><ul class="small muted" style="padding-left:18px;margin:8px 0 0;line-height:1.7">
        <li>Subject <b>SAT</b>${testDate() ? html` and the exam on <b>${fmtDate(testDate())}</b> with readiness per domain` : ' (set a test date to add the exam)'}</li>
        <li>The next 14 days of SAT study as tasks with time estimates</li><li>Your study minutes as focus sessions, for Orbit's Insights</li></ul>
        <label class="row small" style="margin-top:12px"><span class="switch"><input type="checkbox" data-set="orbit.vocab" ${S.orbit.vocab ? 'checked' : ''}><span></span></span>Also add the vocabulary deck to Orbit's Flashcards</label>
        <p class="tiny faint" style="margin-top:10px">Sending again updates the same items — nothing is duplicated, and tasks you ticked off in Orbit stay done.</p>
        <a class="btn sm ghost" style="margin-top:8px" href="${ORBIT_URL}" target="_blank" rel="noopener">Open Orbit ${icon('ext', 13)}</a></section>
    </div>
  </div>`;
};

/* ═════ SETTINGS ═════ */
VIEWS.settings = () => html`
  <div class="page-head"><div><h1 class="h1">Settings</h1></div></div>
  <div class="grid g2">
    <section class="card"><h2 class="h2" style="margin-bottom:14px">Look</h2>
      <label class="field">Theme <div class="seg">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => html`<button class="${S.settings.theme === v ? 'on' : ''}" data-act="setting" data-k="theme" data-v="${v}">${l}</button>`)}</div></label>
      <div class="field" style="margin-top:14px">Accent<div class="row wrap">${['blue', 'violet', 'teal', 'green', 'orange', 'pink'].map(a => html`<button data-act="setting" data-k="accent" data-v="${a}" data-accent="${a}" title="${a}" style="width:30px;height:30px;border-radius:50%;background:var(--accent);outline:${S.settings.accent === a ? '2px solid var(--text)' : 'none'};outline-offset:2px"></button>`)}</div></div>
      <label class="row small" style="margin-top:16px"><span class="switch"><input type="checkbox" data-set="settings.showTimer" ${S.settings.showTimer ? 'checked' : ''}><span></span></span>Show the clock during timed questions</label>
      <div class="field" style="margin-top:14px">Your name (optional)<input class="input" value="${S.profile.name}" data-set="name" placeholder="Shown on Today"></div>
    </section>
    <section class="card"><h2 class="h2" style="margin-bottom:6px">Your data</h2><p class="small muted" style="margin-bottom:14px">Everything stays in this browser. Nothing is uploaded. Export a backup now and then, or to move to another device.${storageOK ? '' : ' <b>Saving is not working in this browser right now.</b>'}</p>
      <div class="row wrap"><button class="btn" data-act="export">${icon('download', 15)} Export backup</button><button class="btn" data-act="import">${icon('upload', 15)} Import backup</button><button class="btn danger" data-act="reset">${icon('trash', 15)} Start over</button></div>
      <hr class="sep"><h3 class="h3">Keyboard</h3><p class="small muted" style="margin-top:6px;line-height:1.8"><kbd>A</kbd>–<kbd>D</kbd> choose · <kbd>Enter</kbd> check / next · <kbd>Shift</kbd>+<kbd>A</kbd>–<kbd>D</kbd> cross out · <kbd>F</kbd> flag · <kbd>C</kbd> calculator · <kbd>R</kbd> reference · <kbd>←</kbd><kbd>→</kbd> move in timed sets</p></section>
    <section class="card" style="grid-column:1/-1"><h2 class="h2" style="margin-bottom:6px">About the content</h2><p class="small muted" style="line-height:1.7">The questions, passages, lessons and vocabulary sentences in this app were written for it in the style of the Digital SAT; math questions are generated with worked solutions. Links in Learn go to Khan Academy's free SAT courses (lessons, videos and practice), which belong to Khan Academy. SAT® is a trademark of the College Board, which is not affiliated with this app. Score predictions are estimates, not official scores.</p></section>
  </div>`;

/* ═════ RESULTS (after a session) ═════ */
VIEWS.results = () => {
  const R = S.lastResult;
  if (!R) return html`<div class="empty"><div class="h2">No results to show</div><a class="btn" href="#/today">Back to Today</a></div>`;
  const ok = R.items.filter(x => x.ok).length, n = R.items.length, secs = sum(R.items, x => x.t);
  const skills = [...new Set(R.items.filter(x => !x.ok).map(x => x.skill))];
  return html`
  <div class="page-head"><div><div class="eyebrow">${R.when ? fmtDate(R.when, true) : 'Results'}</div><h1 class="h1">${R.title}</h1></div><div class="row wrap"><a class="btn" href="#/today">Back to Today</a>${skills.length ? html`<button class="btn primary" data-act="practice-missed">${icon('redo', 15)} Practice what I missed</button>` : ''}</div></div>
  <section class="card" style="margin-bottom:16px"><div class="result-hero">${ring(n ? ok / n : 0, 120, 11, ok / Math.max(1, n) >= 0.7 ? 'var(--ok)' : 'var(--accent)', n ? pct(ok / n) : '—')}
    <div class="grid g3 grow" style="gap:16px">
      ${R.scores ? Object.entries(R.scores).map(([sec, x]) => html`<div class="kpi"><b>${x.score}</b><span>${SECTIONS[sec].name} · module 2 ${x.path}</span></div>`) : ''}
      ${R.total ? html`<div class="kpi"><b>${R.total}</b><span>estimated total</span></div>` : ''}
      <div class="kpi"><b>${ok}/${n}</b><span>correct</span></div><div class="kpi"><b>${fmtClock(secs)}</b><span>time · ${n ? Math.round(secs / n) : 0} s per question</span></div>
    </div></div>
    ${R.note ? html`<p class="small muted" style="margin-top:14px">${R.note}</p>` : ''}</section>
  <section class="card"><h2 class="h2" style="margin-bottom:8px">Question by question</h2><p class="small faint" style="margin-bottom:8px">Tap any question to see it again with the explanation.</p>
    ${R.items.map((x, i) => { const s = SKILL[x.skill]; return html`<button class="qrow" style="width:100%;text-align:left" data-act="open-result" data-i="${i}"><span class="qbadge ${x.skipped ? 'skip' : x.ok ? 'ok' : 'no'}">${i + 1}</span><div class="grow" style="min-width:0"><div style="font-weight:600">${s ? s.name : ''}</div><div class="tiny faint">${['', 'Easy', 'Medium', 'Hard'][x.d] || ''} · ${x.t}s${x.skipped ? ' · not answered' : ''}</div></div>${secChip(secOf(x.skill))}</button>`; })}</section>`;
};
