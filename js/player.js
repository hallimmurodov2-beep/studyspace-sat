'use strict';
/* ───────────── the question player ─────────────
   One player for everything: learn mode (check each answer, see the explanation), timed sets, mistake review
   and adaptive practice tests (module 2 is chosen by how module 1 went). The session lives in S.session, so a
   reload — or closing the laptop — picks up exactly where you were, timer included. */

const LETTERS = ['A', 'B', 'C', 'D'];
const qCache = new Map();
const Q = id => { if (!qCache.has(id)) qCache.set(id, getQ(id)); return qCache.get(id); };
const pui = { calc: false, nav: false, elimMode: false, hl: false, calcMode: navigator.onLine === false ? 'basic' : 'desmos', deg: true, calcHist: [] };

/* the calculator panel: Desmos when online (as on the real test), a built-in one that always works */
function calcPane() {
  const tabs = html`<div class="row" style="padding:8px 10px;border-bottom:1px solid var(--line)"><div class="seg"><button class="${pui.calcMode === 'desmos' ? 'on' : ''}" data-act="calc-mode" data-v="desmos">Desmos</button><button class="${pui.calcMode === 'basic' ? 'on' : ''}" data-act="calc-mode" data-v="basic">Basic</button></div>
    ${pui.calcMode === 'basic' ? html`<span class="grow"></span><button class="btn sm ghost" data-act="calc-deg">${pui.deg ? 'Degrees' : 'Radians'}</button>` : ''}</div>`;
  if (pui.calcMode === 'desmos') return html`<div class="calc-pane">${tabs}<iframe src="https://www.desmos.com/calculator?embed" title="Desmos graphing calculator" loading="lazy"></iframe><div class="tiny faint" style="padding:6px 10px">Needs internet. Offline? Switch to <b>Basic</b>. <a href="https://www.desmos.com/calculator" target="_blank" rel="noopener" style="text-decoration:underline">Open Desmos in a tab</a></div></div>`;
  return html`<div class="calc-pane basic-calc">${tabs}
    <div class="calc-hist" id="calc-hist">${pui.calcHist.length ? pui.calcHist.map(h => html`<button class="calc-row" data-act="calc-use" data-v="${h.r}" title="Use this result"><span class="faint">${h.x}</span><b class="${h.err ? 'err' : ''}">${h.err ? h.err : '= ' + h.r}</b></button>`) : html`<p class="small faint" style="padding:14px">Type an expression and press Enter: <span class="m">2(3.5 + 4)^2</span>, <span class="m">sqrt(50)</span>, <span class="m">3pi</span>, <span class="m">sin(30)</span>. Tap a result to reuse it.</p>`}</div>
    <input class="input" id="calc-in" autocomplete="off" spellcheck="false" placeholder="Expression…" style="margin:10px;width:auto;font:500 17px var(--mono)"></div>`;
}
function calcRun() {
  const inp = $('#calc-in'); if (!inp || !inp.value.trim()) return;
  const x = inp.value.trim(); let r = '', err = '';
  try { r = String(calc(x, pui.deg)); } catch (e) { err = e.message; }
  pui.calcHist.push({ x, r, err }); if (pui.calcHist.length > 30) pui.calcHist.shift();
  renderPlayer(); const n = $('#calc-in'); if (n) { n.value = err ? x : ''; n.focus(); } const h = $('#calc-hist'); if (h) h.scrollTop = h.scrollHeight;
}

/* ── highlighter: select text in the passage to mark it (kept per question); tap a mark to remove it ── */
function savePassage() { const p = $('#passage'); if (p && S.session) { curResp().hl = p.innerHTML; save(); } }
function highlightSelection() {
  const p = $('#passage'), sel = getSelection();
  if (!p || !sel || sel.isCollapsed || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (!p.contains(range.commonAncestorContainer) || !range.toString().trim()) return;
  const mark = document.createElement('mark');
  mark.appendChild(range.extractContents());
  mark.querySelectorAll('mark').forEach(m => m.replaceWith(...m.childNodes));          // no marks inside marks
  range.insertNode(mark);
  sel.removeAllRanges(); p.normalize(); savePassage();
}
const onSelectEnd = () => setTimeout(() => { if (pui.hl && S.session) highlightSelection(); }, 10);
document.addEventListener('mouseup', e => { if (e.target.closest && e.target.closest('#passage')) onSelectEnd(); });
document.addEventListener('touchend', e => { if (e.target.closest && e.target.closest('#passage')) setTimeout(onSelectEnd, 250); });
document.addEventListener('click', e => {
  const m = e.target.closest && e.target.closest('#passage mark');
  if (!m || !pui.hl || !getSelection().isCollapsed) return;
  m.replaceWith(...m.childNodes); $('#passage').normalize(); savePassage();
});

/* ── starting sessions ── */
function startSession(o) {
  S.session = { id: uid(), kind: o.kind || 'practice', title: o.title, mode: o.mode || 'learn', items: o.items.map(x => (typeof x === 'string' ? { q: x } : x)).filter(x => x.q && Q(x.q)), i: 0, resp: {}, qStart: Date.now(), startedAt: Date.now(), endsAt: o.minutes ? Date.now() + o.minutes * 60000 : 0 };
  if (!S.session.items.length) { S.session = null; toast('No questions available for that choice.'); return; }
  pui.calc = false; pui.nav = false;
  saveNow(); renderAll();
}
function startSkill(skill, n = 10, spread) {
  const mode = ui.mode, diff = ui.diff || undefined;
  startSession({ title: SKILL[skill].name, mode, items: pickQuestions(skill, n, { diff, spread }), minutes: mode === 'timed' ? Math.ceil(n * SECTIONS[secOf(skill)].pace / 60) : 0 });
}
function startMix() {
  const sec = ui.sec === 'both' ? undefined : ui.sec, n = ui.count;
  let items = smartMix(n, sec);
  if (ui.diff) items = items.map(x => { const q = Q(x.q); return { q: pickQuestions(q.skill, 1, { diff: ui.diff })[0] }; });
  const mins = ui.mode === 'timed' ? Math.ceil(sum(items, x => SECTIONS[Q(x.q).sec].pace) / 60) : 0;
  startSession({ title: `Smart mix · ${sec ? SECTIONS[sec].name : 'both sections'}`, mode: ui.mode, items, minutes: mins });
}
function startReview(keys) {
  const due = keys ? keys.map(k => ({ key: k, ...S.mistakes[k] })).filter(m => m.q) : dueMistakes();
  if (!due.length) { toast('Nothing to review right now.'); return; }
  startSession({ kind: 'review', title: 'Mistakes review', items: due.slice(0, 40).map(m => ({ q: reviewQid(m), key: m.key })) });
}
function startToday() {
  const T = todaySession();
  const items = [...T.review.map(m => ({ q: reviewQid(m), key: m.key })), ...pickQuestions(T.focus[0], T.nMath).map(q => ({ q })), ...T.rwParts.flatMap(([id, n]) => pickQuestions(id, n)).map(q => ({ q }))];
  startSession({ kind: 'today', title: "Today's session", items });
}
function startDiagnostic() {
  const items = [];
  for (const sec of ['rw', 'math']) {
    const doms = domainsIn(sec);
    doms.forEach((d, i) => { const sk = shuffle(skillsIn(d.id)).slice(0, 3); sk.forEach((s, k) => items.push({ q: pickQuestions(s.id, 1, { diff: [1, 2, 3][(i + k) % 3] })[0] })); });
  }
  startSession({ kind: 'diagnostic', title: 'Placement check', items });
}

/* practice tests: S.session.kind === 'test', with modules built one at a time */
function startTest(form) {
  const F = TEST_FORMS[form];
  const plan = F.secs.flatMap(sec => [{ sec, part: 1 }, { sec, part: 2 }]);
  S.session = { id: uid(), kind: 'test', form, title: F.name, plan, mi: -1, modules: [], used: [], i: 0, mode: 'timed', results: {}, timedOut: false };
  nextModule();
}
function nextModule() {
  const T = S.session, F = TEST_FORMS[T.form];
  T.mi++;
  if (T.mi >= T.plan.length) return finishTest();
  const { sec, part } = T.plan[T.mi], n = Math.round(SECTIONS[sec].modQ * F.scale), min = Math.round(SECTIONS[sec].modMin * F.scale);
  let path = 'mixed';
  if (part === 2) { const m1 = T.modules[T.mi - 1]; path = m1.correct / m1.items.length >= 0.6 ? 'hard' : 'easy'; }
  const exclude = new Set(T.used), ids = buildModule(sec, n, path, exclude);
  T.used.push(...ids);
  const mod = { sec, part, path, items: ids.map(q => ({ q })), resp: {}, n, min, correct: 0 };
  T.modules.push(mod);
  T.items = mod.items; T.resp = mod.resp; T.i = 0; T.qStart = Date.now(); T.endsAt = 0; T.phase = 'intro';
  saveNow(); renderAll();
}
function beginModule() { const T = S.session, mod = T.modules[T.mi]; T.phase = 'run'; T.endsAt = Date.now() + mod.min * 60000; T.qStart = Date.now(); saveNow(); renderAll(); }

/* ── answering ── */
const sess = () => S.session;
const curItem = () => sess().items[sess().i];
const curResp = () => { const s = sess(); return s.resp[s.i] || (s.resp[s.i] = { pick: null, input: '', elim: [], flag: false, checked: false, ok: false, t: 0 }); };
function tickTime() { const s = sess(); if (!s || !s.qStart) return; const r = curResp(); r.t = (r.t || 0) + Math.min(600, (Date.now() - s.qStart) / 1000); s.qStart = Date.now(); }
function choose(i) {
  const r = curResp(); if (r.checked) return;
  if (r.elim.includes(i)) r.elim = r.elim.filter(x => x !== i);
  r.pick = r.pick === i && sess().mode !== 'learn' ? null : i;
  save(); renderPlayer();
}
function eliminate(i) { const r = curResp(); if (r.checked) return; r.elim = r.elim.includes(i) ? r.elim.filter(x => x !== i) : [...r.elim, i]; if (r.pick === i) r.pick = null; save(); renderPlayer(); }
function check() {
  const s = sess(), it = curItem(), q = Q(it.q), r = curResp();
  if (r.checked || (q.choices ? r.pick == null : !String(r.input).trim())) return;
  tickTime();
  r.checked = true; r.ok = isCorrect(q, r);
  grade(it, q, r);
  saveNow(); renderPlayer();
}
function grade(it, q, r) {
  const s = sess();
  if (it.key) { recordAnswer(it.q, q.skill, q.d, r.ok, r.t, s.mode, true); reviewResult(it.key, r.ok); }
  else recordAnswer(it.q, q.skill, q.d, r.ok, r.t, s.mode);
}
function go(delta) {
  const s = sess(); tickTime();
  const ni = s.i + delta;
  if (ni < 0) return;
  if (ni >= s.items.length) { if (s.mode === 'learn') return finishSession(); openNav(); return; }
  s.i = ni; save(); renderPlayer();
  const pane = $('#q-pane'); if (pane) pane.scrollTop = 0;
}
function jump(i) { tickTime(); sess().i = i; pui.nav = false; save(); renderPlayer(); }

/* ── finishing ── */
function finishSession(timedOut) {
  const s = sess(); tickTime();
  if (s.kind === 'test') return finishModule(timedOut);
  const items = s.items.map((it, i) => {
    const q = Q(it.q), r = s.resp[i] || { pick: null, input: '', t: 0 };
    const answered = q.choices ? r.pick != null : String(r.input || '').trim() !== '';
    if (!r.checked && answered) { r.ok = isCorrect(q, r); grade(it, q, r); r.checked = true; }
    return { q: it.q, skill: q.skill, d: q.d, ok: !!r.ok && answered, pick: r.pick, input: r.input, t: Math.round(r.t || 0), skipped: !answered };
  }).filter(x => s.mode !== 'learn' || !x.skipped);
  if (s.kind === 'today') { const L = S.log[todayStr()] || (S.log[todayStr()] = { sec: 0, q: 0, ok: 0, cards: 0, done: false }); L.done = true; }
  let note = '';
  if (s.kind === 'diagnostic') { snapshotPrediction(); const p = predictTotal(); note = `Your starting estimate is ${p.score} (R&W ${p.rw.score}, Math ${p.math.score}). Today's plan now targets your weakest skills.`; }
  if (timedOut) note = 'Time ran out — unanswered questions are marked.';
  S.lastResult = { title: s.title, kind: s.kind, when: todayStr(), items, note };
  S.session = null; saveNow();
  if (location.hash !== '#/results') location.hash = '#/results'; else renderAll();
}
function finishModule(timedOut) {
  const T = sess(), mod = T.modules[T.mi];
  mod.items.forEach((it, i) => {
    const q = Q(it.q), r = mod.resp[i] || (mod.resp[i] = { pick: null, input: '', t: 0 });
    const answered = q.choices ? r.pick != null : String(r.input || '').trim() !== '';
    r.ok = answered && isCorrect(q, r); r.skipped = !answered;
    recordAnswer(it.q, q.skill, q.d, r.ok, r.t || 0, 'test');
    if (r.ok) mod.correct++;
  });
  if (timedOut) T.timedOut = true;
  nextModule();
}
function finishTest() {
  const T = sess(), sections = {};
  for (const sec of TEST_FORMS[T.form].secs) {
    const [m1, m2] = T.modules.filter(m => m.sec === sec);
    sections[sec] = { score: sectionScore(m1.correct, m1.items.length, m2.correct, m2.items.length, m2.path), path: m2.path, raw: m1.correct + m2.correct, total: m1.items.length + m2.items.length };
  }
  if (T.form === 'mini') for (const x of Object.values(sections)) x.score = clamp(round10(x.score), 200, 800);
  const total = sections.rw && sections.math ? sections.rw.score + sections.math.score : 0;
  const items = T.modules.flatMap(m => m.items.map((it, i) => { const q = Q(it.q), r = m.resp[i] || {}; return { q: it.q, skill: q.skill, d: q.d, ok: !!r.ok, pick: r.pick, input: r.input, t: Math.round(r.t || 0), skipped: !!r.skipped }; }));
  const rec = { id: uid(), at: Date.now(), form: T.form, sections, total, timedOut: T.timedOut, items };
  S.tests.push(rec);
  if (S.tests.length > 40) S.tests.shift();
  const scores = Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, { score: v.score, path: v.path === 'hard' ? 'harder' : 'easier' }]));
  S.lastResult = { title: TEST_FORMS[T.form].name, kind: 'test', when: todayStr(), items, scores, total, note: 'Scores are estimates from your raw score and which second module you reached. Every question is now in your skill ratings, and missed ones are in Review.' };
  S.session = null; saveNow();
  location.hash = '#/results'; renderAll();
}
function quitSession() {
  const s = sess();
  if (s.kind === 'test') { confirmBox('Leave the test?', 'Your progress in this test will be lost. Answers so far are not scored.', 'Leave test', () => { S.session = null; saveNow(); renderAll(); }, true); return; }
  const answered = Object.values(s.resp).filter(r => r.checked || r.pick != null || r.input).length;
  if (!answered) { S.session = null; saveNow(); renderAll(); return; }
  confirmBox('End this session?', s.mode === 'learn' ? 'Answers you already checked are saved. You will see a summary.' : 'Answered questions will be scored now.', 'End and see results', () => finishSession());
}

/* ── rendering ── */
function questionHTML(q, r, i, reveal) {
  const learn = reveal;
  const choiceState = k => (learn && r.checked ? (k === q.answer ? 'right' : k === r.pick ? 'wrong' : '') : r.pick === k ? 'sel' : '');
  return html`
    <div class="q-meta"><span class="q-num">${i + 1}</span>${secChip(q.sec)}<span class="small faint">${SKILL[q.skill].name}</span>${sess() && sess().kind !== 'test' ? diffChip(q.d) : ''}
      <span class="grow"></span>${sess() && sess().mode !== 'learn' ? html`<button class="btn sm ghost flag-btn ${r.flag ? 'on' : ''}" data-act="p-flag" title="Mark for review (F)">${icon('flag', 14)} ${r.flag ? 'Marked' : 'Mark'}</button>` : ''}</div>
    ${q.fig ? raw(q.fig) : ''}
    <div class="stem">${raw(M(q.stem))}</div>
    ${q.choices ? html`<div class="choices">${q.choices.map((c, k) => html`<div class="choice ${choiceState(k)} ${r.elim.includes(k) ? 'out' : ''}"><button class="choice-btn" data-act="p-choose" data-k="${k}"><span class="letter">${LETTERS[k]}</span><span>${raw(M(c))}</span></button>${r.checked ? '' : html`<button class="elim" data-act="p-elim" data-k="${k}" title="Cross out (Shift+${LETTERS[k]})">${icon('strike', 16)}</button>`}</div>`)}</div>`
      : html`<div class="spr ${learn && r.checked ? (r.ok ? 'right' : 'wrong') : ''}"><input class="input" id="spr" inputmode="decimal" autocomplete="off" placeholder="Your answer" value="${r.input}" ${r.checked ? 'disabled' : ''}><span class="tiny faint">Enter a number, a fraction like 3/4, or a decimal like .75</span></div>`}
    ${learn && r.checked ? html`<div class="feedback ${r.ok ? 'ok' : 'no'}"><div class="h3" style="color:${r.ok ? 'var(--ok)' : 'var(--danger)'}">${icon(r.ok ? 'check' : 'x', 18)} ${r.ok ? 'Correct' : q.choices ? `Not quite — the answer is ${LETTERS[q.answer]}` : `Not quite — the answer is ${nice(q.answer)}`}</div>
      <p>${raw(M(q.explain))}</p>
      <div class="row wrap" style="margin-top:12px">${SKILL[q.skill].ka.filter(x => x.type !== 'practice').slice(0, 2).map(x => html`<a class="btn sm ghost" href="${x.url}" target="_blank" rel="noopener">${icon(x.type === 'video' ? 'video' : 'book', 14)} Khan Academy ${x.type === 'video' ? 'video' : 'lesson'}${x.title === 'Lesson' ? '' : ': ' + x.title}</a>`)}</div></div>` : ''}`;
}

function renderPlayer() {
  const root = $('#player-root'), s = sess();
  if (!s) { root.innerHTML = ''; document.body.style.overflow = ''; return; }
  document.body.style.overflow = 'hidden';
  if (s.kind === 'test' && s.phase === 'intro') { root.innerHTML = moduleIntro().s; return; }
  const it = curItem(), q = Q(it.q), r = curResp(), learn = s.mode === 'learn';
  const hasPassage = !!q.passage, mathQ = q.sec === 'math';
  const answered = s.items.filter((_, i) => { const x = s.resp[i]; return x && (x.pick != null || x.input); }).length;
  const label = s.kind === 'test' ? `${SECTIONS[s.modules[s.mi].sec].name} · Module ${s.modules[s.mi].part}` : s.title;
  const canCheck = q.choices ? r.pick != null : !!String(r.input).trim();
  root.innerHTML = html`<div class="player">
    <div class="p-top"><button class="btn icon sm ghost" data-act="p-quit" title="Leave">${icon('x', 18)}</button>
      <div class="p-title grow">${label}<div class="tiny faint">Question ${s.i + 1} of ${s.items.length}${learn ? '' : ` · ${answered} answered`}</div></div>
      ${s.endsAt && S.settings.showTimer ? html`<span class="p-timer" id="p-timer">${fmtClock((s.endsAt - Date.now()) / 1000)}</span>` : s.endsAt ? html`<button class="btn sm ghost" data-act="p-showtimer">Show time</button>` : ''}
      ${hasPassage ? html`<button class="btn sm ${pui.hl ? 'soft' : 'ghost'}" data-act="p-hl" title="Highlight the passage (H) — select text to mark it, tap a mark to remove it">${icon('pen', 15)}<span class="hide-sm">${pui.hl ? 'Highlighting' : 'Highlight'}</span></button>` : ''}
      ${mathQ ? html`<button class="btn sm ${pui.calc ? 'soft' : 'ghost'}" data-act="p-calc" title="Desmos calculator (C)">${icon('calc', 15)}<span class="hide-sm">Calculator</span></button><button class="btn sm ghost" data-act="reference" title="Reference sheet (R)">${icon('ref', 15)}<span class="hide-sm">Reference</span></button>` : ''}
      ${!learn ? html`<button class="btn sm ghost" data-act="p-nav">${icon('grid', 15)}<span class="hide-sm">Questions</span></button>` : ''}
    </div>
    <div class="p-progress"><i style="width:${Math.round(100 * (s.i + (r.checked ? 1 : 0)) / s.items.length)}%"></i></div>
    <div class="p-body ${hasPassage ? '' : 'single'} ${pui.calc && mathQ ? 'with-calc' : ''} ${pui.calc && mathQ && hasPassage ? 'split' : ''}">
      ${hasPassage ? html`<div class="p-pane"><div class="passage ${pui.hl ? 'hl-on' : ''}" id="passage">${raw(r.hl || q.passage)}</div></div>` : ''}
      <div class="p-pane" id="q-pane">${questionHTML(q, r, s.i, learn)}</div>
      ${pui.calc && mathQ ? calcPane() : ''}
    </div>
    <div class="p-bottom">
      ${learn ? html`<span class="small faint grow hide-sm">${r.checked ? 'Enter for the next question' : 'Pick an answer, then Check (Enter)'}</span>
          ${r.checked && !r.ok && !it.key ? html`<button class="btn sm ghost" data-act="p-reason">${icon('pen', 14)} Why did I miss it?</button>` : ''}
          ${r.checked ? html`<button class="btn primary" data-act="p-next" id="p-main">${s.i === s.items.length - 1 ? 'Finish' : 'Next'} ${icon('right', 15)}</button>` : html`<button class="btn" data-act="p-skip">Skip</button><button class="btn primary" data-act="p-check" id="p-main" ${canCheck ? '' : 'disabled'}>Check</button>`}`
        : html`<button class="btn" data-act="p-prev" ${s.i ? '' : 'disabled'}>${icon('left', 15)} Back</button><span class="grow"></span>
          ${s.i === s.items.length - 1 ? html`<button class="btn primary" data-act="p-nav" id="p-main">Review & submit</button>` : html`<button class="btn primary" data-act="p-next" id="p-main">Next ${icon('right', 15)}</button>`}`}
    </div>
  </div>`.s;
  const inp = $('#spr');
  if (inp) { inp.oninput = () => { curResp().input = inp.value; save(); const b = $('#p-main'); if (b && learn && !r.checked) b.disabled = !inp.value.trim(); }; if (!r.checked && !('ontouchstart' in window)) inp.focus(); }
  if (pui.nav) openNav(true);
}
function moduleIntro() {
  const T = sess(), mod = T.modules[T.mi];
  return html`<div class="player"><div class="p-top"><button class="btn icon sm ghost" data-act="p-quit">${icon('x', 18)}</button><div class="p-title grow">${T.title}</div></div>
    <div class="p-body single"><div class="p-pane" style="display:grid;place-items:center"><div class="card" style="max-width:520px;text-align:center;padding:32px">
      <div class="eyebrow">${T.mi + 1} of ${T.plan.length}</div><h2 class="h1" style="margin:10px 0">${SECTIONS[mod.sec].name}<br>Module ${mod.part}</h2>
      <p class="muted">${mod.n} questions · ${mod.min} minutes${mod.part === 2 ? ` · this module is ${mod.path === 'hard' ? 'the harder one — module 1 went well' : 'the easier one'}` : ''}</p>
      ${T.mi > 0 && T.plan[T.mi - 1].sec !== mod.sec ? html`<p class="note" style="margin-top:16px">On the real test there is a 10-minute break here. Stretch, drink water, then start when you are ready.</p>` : ''}
      <p class="small faint" style="margin-top:16px">You can move between questions and mark them for review. The module ends when time runs out or you submit.${mod.sec === 'math' ? ' A Desmos calculator and the reference sheet are available.' : ''}</p>
      <button class="btn primary lg" style="margin-top:20px" data-act="p-begin">${icon('play', 16)} Start module</button></div></div></div></div>`;
}
function openNav(already) {
  pui.nav = false;
  const s = sess();
  const m = modal(html`<div class="modal-head"><div><h2 class="h2">Questions</h2><p class="small muted">${s.items.filter((_, i) => { const x = s.resp[i]; return x && (x.pick != null || x.input); }).length} of ${s.items.length} answered · red dot = marked for review</p></div><button class="btn icon sm ghost" data-act="close-modal">${icon('x', 16)}</button></div>
    <div class="navgrid">${s.items.map((_, i) => { const x = s.resp[i] || {}; return html`<button class="${x.pick != null || x.input ? 'ans' : ''} ${i === s.i ? 'cur' : ''} ${x.flag ? 'flag' : ''}" data-act="p-jump" data-i="${i}">${i + 1}</button>`; })}</div>
    <div class="modal-foot"><button class="btn" data-act="close-modal">Keep working</button><button class="btn primary" data-act="p-submit">${s.kind === 'test' ? 'Submit module' : 'Submit and see results'}</button></div>`, { wide: true });
  return m;
}
/* the clock: one light timer for the whole app */
setInterval(() => {
  const s = S.session; if (!s || !s.endsAt) return;
  if (s.kind === 'test' && s.phase !== 'run') return;
  const left = (s.endsAt - Date.now()) / 1000, el = $('#p-timer');
  if (el) { el.textContent = fmtClock(left); el.classList.toggle('low', left < 300); }
  if (left <= 0) { modals.slice().forEach(m => m.close()); toast('Time is up.'); finishSession(true); }
}, 1000);

/* a question shown again, read-only, with its explanation (review list, results) */
function showQuestionModal(qid, r, extra = '') {
  const q = Q(qid); if (!q) { toast('That question is no longer available.'); return; }
  const resp = { pick: r ? r.pick : null, input: r ? r.input || '' : '', elim: [], checked: true, ok: r ? r.ok : false };
  const saved = S.session; S.session = null;
  const body = questionHTML(q, resp, 0, true);
  S.session = saved;
  return modal(html`<div class="modal-head"><span></span><button class="btn icon sm ghost" data-act="close-modal">${icon('x', 16)}</button></div>${q.passage ? html`<div class="passage" style="margin-bottom:18px;font-size:16px">${raw(q.passage)}</div>` : ''}${body}${extra}`, { wide: true });
}
function reasonPicker(key) {
  const m = S.mistakes[key]; if (!m) return '';
  return html`<hr class="sep"><div class="eyebrow" style="margin-bottom:8px">Why did you miss it?</div><div class="row wrap">${REASONS.map(([k, l]) => html`<button class="chip ${m.reason === k ? 'on' : ''}" data-act="set-reason" data-key="${key}" data-r="${k}">${l}</button>`)}</div>
    <textarea class="input" style="margin-top:10px" placeholder="A note for next time (optional): what to watch for" data-note="${key}">${m.note}</textarea>`;
}
const REFERENCE = html`<div class="modal-head"><div><h2 class="h2">Reference sheet</h2><p class="small muted">The same facts the test gives you.</p></div><button class="btn icon sm ghost" data-act="close-modal">${icon('x', 16)}</button></div>
  <div class="ref-sheet">${[['Circle', 'A = \\pi r^2,  C = 2\\pi r'], ['Rectangle', 'A = lw'], ['Triangle', 'A = \\frac{1}{2}bh'], ['Pythagorean theorem', 'c^2 = a^2 + b^2'], ['Special right triangles', '30-60-90: x, x\\sqrt{3}, 2x · 45-45-90: s, s, s\\sqrt{2}'], ['Rectangular prism', 'V = lwh'], ['Cylinder', 'V = \\pi r^2 h'], ['Sphere', 'V = \\frac{4}{3}\\pi r^3'], ['Cone', 'V = \\frac{1}{3}\\pi r^2 h'], ['Pyramid', 'V = \\frac{1}{3}lwh']].map(([t, f]) => html`<div><b>${t}</b>${raw(M(`[[${f}]]`))}</div>`)}</div>
  <p class="small muted" style="margin-top:14px">A circle has 360° of arc, which is 2π radians. The angles of a triangle add up to 180°.</p>`;
