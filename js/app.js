'use strict';
/* ───────────── shell, router, actions, keyboard, welcome ───────────── */

const NAV = [['today', 'Today', 'sun'], ['practice', 'Practice', 'bolt'], ['review', 'Review', 'redo'], ['learn', 'Learn', 'book'], ['vocab', 'Vocabulary', 'cards'], ['tests', 'Practice tests', 'clock'], 'Track', ['progress', 'Progress', 'chart'], ['plan', 'Plan', 'calendar'], ['settings', 'Settings', 'gear']];
const TABS = [['today', 'Today', 'sun'], ['practice', 'Practice', 'bolt'], ['review', 'Review', 'redo'], ['learn', 'Learn', 'book'], ['more', 'More', 'more']];
let route = { view: 'today', arg: '' };
function parseRoute() {
  const [, v, a] = (location.hash || '').match(/^#\/([\w-]+)(?:\/([\w.-]+))?/) || [];
  route = { view: VIEWS[v] ? v : 'today', arg: a || '' };
}
const navCount = v => { if (v === 'review') { const n = dueMistakes().length; return n ? html`<span class="count">${n}</span>` : ''; } if (v === 'vocab') { const n = vocabDue().length; return n ? html`<span class="count">${n}</span>` : ''; } return ''; };

function shell(content) {
  const dtt = daysToTest();
  return html`<div class="shell"><aside class="side"><a class="logo" href="#/today">${LOGO}<div class="logo-name">Studyspace<small>SAT</small></div></a>
    <nav class="nav">${NAV.map(n => typeof n === 'string' ? html`<div class="nav-label">${n}</div>` : html`<a class="nav-item ${route.view === n[0] ? 'on' : ''}" href="#/${n[0]}">${icon(n[2], 18)}<span>${n[1]}</span>${navCount(n[0])}</a>`)}</nav>
    <div class="side-foot">${dtt != null && dtt >= 0 ? html`<div class="side-count">${dtt}</div><div class="tiny faint">days to the SAT · ${fmtDate(testDate())}</div>` : html`<a class="small muted" href="#/plan">${icon('calendar', 14, 'inl')} Set your test date</a>`}</div></aside>
    <main class="main"><div class="view ${_entering ? 'enter' : ''}" id="view">${content}</div></main>
    <nav class="tabbar">${TABS.map(t => t[0] === 'more' ? html`<button data-act="more">${icon(t[2], 20)}${t[1]}</button>` : html`<a class="${route.view === t[0] ? 'on' : ''}" href="#/${t[0]}">${icon(t[2], 20)}${t[1]}</a>`)}</nav></div>`;
}

function renderAll() {
  if (!S.profile.onboarded) { $('#app').innerHTML = welcome().s; renderPlayer(); return; }
  const y = scrollY;
  const key = route.view + '/' + route.arg; _entering = key !== _lastKey; _lastKey = key;
  let body;
  try { body = VIEWS[route.view](route.arg); } catch (e) { console.error(e); body = html`<div class="empty"><div class="h2">Something went wrong on this screen</div><p class="small">${String(e.message)}</p><a class="btn" href="#/today">Back to Today</a></div>`; }
  $('#app').innerHTML = shell(body).s;
  scrollTo(0, _keepScroll ? y : 0); _keepScroll = false;
  renderPlayer();
  document.title = (S.session ? S.session.title + ' · ' : '') + 'Studyspace SAT';
}
let _keepScroll = false, _entering = false, _lastKey = '';
const rerender = () => { _keepScroll = true; renderAll(); };
onChange(rerender);

/* ── welcome ── */
const wz = { step: 0, date: '', target: 1400, rw: '', math: '', minutes: 45, name: '' };
function welcome() {
  const steps = [
    html`<div class="logo" style="padding:0 0 18px">${LOGO}<div class="logo-name">Studyspace<small>SAT</small></div></div>
      <h1 class="h1">A calmer way to get your SAT score up.</h1>
      <p class="muted" style="margin:12px 0 18px;line-height:1.6">One plan for today, sized to your time. Questions that adapt to you. Every mistake comes back until you own it. No points, badges or streak pressure — just the score.</p>
      <div class="col" style="gap:8px">${[['target', 'A daily session built from your weakest, highest-value skills'], ['redo', 'Spaced review of every question you miss'], ['clock', 'Adaptive, timed practice tests with score estimates'], ['book', 'Short lessons plus Khan Academy videos for all 48 skills'], ['orbit', 'Sends your SAT plan to Studyspace Orbit']].map(([i, t]) => html`<div class="row small">${icon(i, 16)}<span>${t}</span></div>`)}</div>
      <div class="modal-foot"><button class="btn ghost" data-act="wz-import">Restore a backup</button><button class="btn primary lg" data-act="wz-next">Get started</button></div>`,
    html`<div class="eyebrow">1 of 3</div><h2 class="h1" style="margin:8px 0 18px">When is your test?</h2>
      <div class="grid g2" style="gap:16px"><label class="field">Test date<input class="input" type="date" id="wz-date" min="${todayStr()}" value="${wz.date}"></label>
      <label class="field">Target score: <b style="color:var(--text)" id="wz-tv">${wz.target}</b><input type="range" min="800" max="1600" step="10" id="wz-target" value="${wz.target}"></label></div>
      <p class="small faint" style="margin-top:10px">Not booked yet? Leave the date empty — you can set it later in Plan.</p>
      <div class="modal-foot"><button class="btn ghost" data-act="wz-back">Back</button><button class="btn primary" data-act="wz-next">Continue</button></div>`,
    html`<div class="eyebrow">2 of 3</div><h2 class="h1" style="margin:8px 0 18px">How much time do you have?</h2>
      <label class="field">Minutes per study day: <b style="color:var(--text)" id="wz-mv">${wz.minutes}</b><input type="range" min="15" max="150" step="5" id="wz-min" value="${wz.minutes}"></label>
      <div class="field" style="margin-top:16px">Study days<div class="daypick">${DAYS.map((d, i) => html`<button class="${S.profile.days.includes(i + 1) ? 'on' : ''}" data-act="toggle-day" data-d="${i + 1}">${d}</button>`)}</div></div>
      <label class="field" style="margin-top:16px">Your first name (optional)<input class="input" id="wz-name" value="${wz.name}" placeholder="Shown on Today"></label>
      <div class="modal-foot"><button class="btn ghost" data-act="wz-back">Back</button><button class="btn primary" data-act="wz-next">Continue</button></div>`,
    html`<div class="eyebrow">3 of 3</div><h2 class="h1" style="margin:8px 0 10px">Where are you starting?</h2>
      <p class="muted" style="margin-bottom:16px">If you have a recent PSAT, SAT or Bluebook practice score, enter it. Otherwise take a 24-question placement check (about 30 minutes) — or skip both and the app learns as you practice.</p>
      <div class="grid g2" style="gap:16px"><label class="field">Reading and Writing (200–800)<input class="input" type="number" min="200" max="800" step="10" id="wz-rw" value="${wz.rw}" placeholder="e.g. 560"></label><label class="field">Math (200–800)<input class="input" type="number" min="200" max="800" step="10" id="wz-math" value="${wz.math}" placeholder="e.g. 590"></label></div>
      <div class="modal-foot"><button class="btn ghost" data-act="wz-back">Back</button><button class="btn" data-act="wz-finish" data-diag="0">Skip for now</button><button class="btn" data-act="wz-finish" data-diag="0" data-scores="1">Use my scores</button><button class="btn primary" data-act="wz-finish" data-diag="1">Take the placement check</button></div>`,
  ];
  return html`<div class="welcome"><div class="card">${steps[wz.step]}</div></div>`;
}
function wzRead() {
  const v = id => { const el = $('#' + id); return el ? el.value : null; };
  if (v('wz-date') != null) wz.date = v('wz-date');
  if (v('wz-target') != null) wz.target = +v('wz-target');
  if (v('wz-min') != null) wz.minutes = +v('wz-min');
  if (v('wz-name') != null) wz.name = v('wz-name').trim().slice(0, 40);
  if (v('wz-rw') != null) wz.rw = v('wz-rw');
  if (v('wz-math') != null) wz.math = v('wz-math');
}
ACT['wz-next'] = () => { wzRead(); wz.step++; renderAll(); };
ACT['wz-back'] = () => { wzRead(); wz.step--; renderAll(); };
ACT['wz-import'] = () => pickFile(t => { const err = importJSON(t); if (err) toast(err); else { parseRoute(); renderAll(); toast('Backup restored.'); } });
ACT['wz-finish'] = el => {
  wzRead();
  const sc = v => { const n = Math.round(+v / 10) * 10; return n >= 200 && n <= 800 ? n : 0; };
  commit(s => {
    Object.assign(s.profile, { testDate: isYmd(wz.date) ? wz.date : '', target: wz.target, minutes: wz.minutes, name: wz.name, onboarded: true });
    if (el.dataset.scores) s.profile.start = { rw: sc(wz.rw), math: sc(wz.math) };
    snapshotPrediction();
  });
  location.hash = '#/today';
  if (el.dataset.diag === '1') startDiagnostic();
};

/* ── actions (event delegation: data-act="name") ── */
Object.assign(ACT, {
  go: el => { location.hash = '#/' + el.dataset.to; },
  ui: el => { const k = el.dataset.k, v = el.dataset.v; ui[k] = /^\d+$/.test(v) ? +v : v; rerender(); },
  'close-modal': () => closeModal(),
  more: () => modal(html`<div class="modal-head"><h2 class="h2">More</h2><button class="btn icon sm ghost" data-act="close-modal">${icon('x', 16)}</button></div><div class="list">${NAV.filter(n => Array.isArray(n) && !TABS.some(t => t[0] === n[0])).map(n => html`<a class="list-row" href="#/${n[0]}" data-act="close-modal">${icon(n[2], 18)}<span class="grow">${n[1]}</span>${navCount(n[0])}</a>`)}</div>`),
  'start-skill': el => startSkill(el.dataset.skill, +el.dataset.n || ui.count, !!el.dataset.spread),
  'start-mix': () => startMix(),
  'start-rw-today': () => { const T = todaySession(); startSession({ title: 'Reading and Writing', items: T.rwParts.flatMap(([id, n]) => pickQuestions(id, n)) }); },
  'start-review': () => startReview(),
  'start-today': () => startToday(),
  'start-test': el => { const f = el.dataset.form, F = TEST_FORMS[f]; confirmBox(`Start: ${F.name}?`, 'The clock runs per module, like the real test. Find a quiet place. You can pause by closing the app — the timer keeps going, as it would on test day.', 'Start', () => startTest(f)); },
  'practice-missed': () => { const R = S.lastResult; const skills = [...new Set(R.items.filter(x => !x.ok).map(x => x.skill))]; const items = shuffle(skills.flatMap(s => pickQuestions(s, Math.max(2, Math.round(10 / skills.length))))).slice(0, 15); startSession({ title: 'Practice what I missed', items }); },
  'orbit-send': () => sendToOrbit(),
  'toggle-day': el => { const d = +el.dataset.d; commit(s => { const has = s.profile.days.includes(d); if (has && s.profile.days.length === 1) return; s.profile.days = has ? s.profile.days.filter(x => x !== d) : [...s.profile.days, d].sort(); }); },
  setting: el => { commit(s => { s.settings[el.dataset.k] = el.dataset.v; }); applyTheme(); },
  reference: () => modal(REFERENCE, { wide: true }),
  export: () => { download(`studyspace-sat-backup-${todayStr()}.json`, exportJSON()); toast('Backup saved.'); },
  import: () => pickFile(t => { const err = importJSON(t); toast(err || 'Backup restored.'); }),
  reset: () => confirmBox('Start over?', 'This deletes all progress, mistakes and test results in this browser. Export a backup first if you might want them back.', 'Delete everything', () => { localStorage.removeItem(STORE_KEY); S = freshState(); wz.step = 0; applyTheme(); renderAll(); }, true),
  flip: () => { ui.vocabFlip = !ui.vocabFlip; rerender(); },
  'grade-word': el => { const cur = vocabQueue(10)[0]; if (!cur) return; ui.vocabFlip = false; commit(() => gradeWord(cur[0], +el.dataset.g)); },
  'open-mistake': el => { const key = el.dataset.key, m = S.mistakes[key]; if (!m) return; const md = showQuestionModal(m.q, null, html`${reasonPicker(key)}<div class="modal-foot"><button class="btn danger" data-act="del-mistake" data-key="${key}">${icon('trash', 14)} Remove</button><button class="btn primary" data-act="review-one" data-key="${key}">${icon('play', 14)} Try it again</button></div>`); bindNotes(md); },
  'set-reason': el => { const m = S.mistakes[el.dataset.key]; if (!m) return; m.reason = m.reason === el.dataset.r ? '' : el.dataset.r; save(); el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.r === m.reason)); },
  'del-mistake': el => { commit(s => { delete s.mistakes[el.dataset.key]; }); closeModal(); toast('Removed from your review list.'); },
  'review-one': el => { closeModal(); startReview([el.dataset.key]); },
  'open-result': el => { const x = S.lastResult.items[+el.dataset.i]; const key = Object.keys(S.mistakes).find(k => S.mistakes[k].q === x.q); const md = showQuestionModal(x.q, x, key ? reasonPicker(key) : ''); if (md) bindNotes(md); },
  'open-test': el => { const t = S.tests.find(x => x.id === el.dataset.id); if (!t) return; S.lastResult = { title: TEST_FORMS[t.form].name, kind: 'test', when: ymd(new Date(t.at)), items: t.items, scores: Object.fromEntries(Object.entries(t.sections).map(([k, v]) => [k, { score: v.score, path: v.path === 'hard' ? 'harder' : 'easier' }])), total: t.total }; location.hash = '#/results'; },
  /* player */
  'p-choose': el => (pui.elimMode ? eliminate(+el.dataset.k) : choose(+el.dataset.k)),
  'p-elim': el => eliminate(+el.dataset.k),
  'p-check': () => check(),
  'p-skip': () => go(1),
  'p-next': () => go(1),
  'p-prev': () => go(-1),
  'p-flag': () => { const r = curResp(); r.flag = !r.flag; save(); renderPlayer(); },
  'p-nav': () => openNav(),
  'p-jump': el => { closeModal(); jump(+el.dataset.i); },
  'p-submit': () => { const s = sess(); closeModal(); const left = s.items.filter((_, i) => { const x = s.resp[i]; return !x || (x.pick == null && !x.input); }).length; if (left) confirmBox(`${plural(left, 'question')} unanswered`, 'Unanswered questions count as wrong. There is no penalty for guessing on the SAT — it is always worth answering.', 'Submit anyway', () => finishSession()); else finishSession(); },
  'p-quit': () => quitSession(),
  'p-calc': () => { pui.calc = !pui.calc; renderPlayer(); },
  'p-hl': () => { pui.hl = !pui.hl; renderPlayer(); if (pui.hl) toast('Select text in the passage to highlight it. Tap a highlight to remove it.'); },
  'p-begin': () => beginModule(),
  'p-showtimer': () => { commit(s => { s.settings.showTimer = true; }, { quiet: true }); renderPlayer(); },
  'p-reason': () => { const it = curItem(); const key = mistakeKey(it.q); if (!S.mistakes[key]) return; const md = modal(html`<div class="modal-head"><h2 class="h2">Why did you miss it?</h2><button class="btn icon sm ghost" data-act="close-modal">${icon('x', 16)}</button></div><p class="small muted">Naming the reason is one of the fastest ways to stop repeating it. It also shows up in Review.</p>${reasonPicker(key)}<div class="modal-foot"><button class="btn primary" data-act="close-modal">Done</button></div>`); bindNotes(md); },
});
function bindNotes(md) { if (!md) return; md.el.querySelectorAll('[data-note]').forEach(t => { t.oninput = () => { const m = S.mistakes[t.dataset.note]; if (m) { m.note = t.value.slice(0, 500); save(); } }; }); }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A' && el.dataset.act === 'close-modal') { closeModal(); return; }
  e.preventDefault();
  fn(el, e);
});
/* inputs bound to settings: data-set="testDate" | "target" | "start.rw" | "settings.showTimer" | "orbit.vocab" | "name" */
document.addEventListener('change', e => {
  const el = e.target; if (!el.dataset || !el.dataset.set) return;
  const k = el.dataset.set, v = el.type === 'checkbox' ? el.checked : el.value;
  commit(s => {
    if (k === 'testDate') s.profile.testDate = isYmd(v) ? v : '';
    else if (k === 'target') s.profile.target = clamp(+v, 400, 1600);
    else if (k === 'minutes') s.profile.minutes = clamp(+v, 15, 300);
    else if (k === 'name') s.profile.name = String(v).trim().slice(0, 40);
    else if (k.startsWith('start.')) { const n = Math.round(+v / 10) * 10; s.profile.start[k.slice(6)] = n >= 200 && n <= 800 ? n : 0; snapshotPrediction(); }
    else if (k.startsWith('settings.')) s.settings[k.slice(9)] = v;
    else if (k.startsWith('orbit.')) s.orbit[k.slice(6)] = v;
  });
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.type === 'range' && el.dataset.set) { const b = el.closest('label') && el.closest('label').querySelector('b'); if (b) b.textContent = el.value; }
  if (el.id === 'wz-target') $('#wz-tv').textContent = el.value;
  if (el.id === 'wz-min') $('#wz-mv').textContent = el.value;
  if (el.dataset && el.dataset.input === 'vocabSearch') { ui.vocabSearch = el.value; const pos = el.selectionStart; rerender(); const n = $('[data-input="vocabSearch"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
});
/* welcome: toggling study days before onboarding finishes should not re-render away typed values */
const _toggleDay = ACT['toggle-day'];
ACT['toggle-day'] = el => { if (!S.profile.onboarded) wzRead(); _toggleDay(el); };

/* ── keyboard ── */
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select';
  if (e.key === 'Escape') { if (modals.length) { closeModal(); e.preventDefault(); } return; }
  if (modals.length) return;
  const s = S.session;
  if (s && !(s.kind === 'test' && s.phase === 'intro')) {
    const q = Q(curItem().q), r = curResp(), learn = s.mode === 'learn';
    if (e.key === 'Enter') { e.preventDefault(); if (learn) { if (r.checked) go(1); else check(); } else go(1); return; }
    if (typing) return;
    const k = 'abcd'.indexOf(e.key.toLowerCase()), n = '1234'.indexOf(e.key);
    if (q.choices && (k >= 0 || n >= 0)) { e.preventDefault(); const i = k >= 0 ? k : n; if (e.shiftKey) eliminate(i); else choose(i); return; }
    if (e.key === 'ArrowRight' && !learn) return go(1);
    if (e.key === 'ArrowLeft' && !learn) return go(-1);
    if (e.key.toLowerCase() === 'f' && !learn) return ACT['p-flag']();
    if (e.key.toLowerCase() === 'c' && q.sec === 'math') return ACT['p-calc']();
    if (e.key.toLowerCase() === 'h' && q.passage) return ACT['p-hl']();
    if (e.key.toLowerCase() === 'r' && q.sec === 'math') return ACT.reference();
    return;
  }
  if (typing) return;
  if (route.view === 'vocab' && vocabQueue(10)[0]) {
    if (e.key === ' ') { e.preventDefault(); ACT.flip(); return; }
    if (ui.vocabFlip && '123'.includes(e.key)) { ACT['grade-word']({ dataset: { g: String(+e.key - 1) } }); }
  }
});

/* ── boot ── */
function boot() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  load();
  if (S.session && S.session.kind === 'test' && S.session.phase === 'run' && S.session.endsAt && S.session.endsAt < Date.now()) setTimeout(() => finishSession(true), 50);
  parseRoute();
  renderAll();
  addEventListener('hashchange', () => { parseRoute(); closeAllModals(); renderAll(); });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { applyTheme(); });
  /* a new day while the app stays open */
  let day = todayStr();
  setInterval(() => { if (todayStr() !== day && !S.session) { day = todayStr(); renderAll(); } }, 60000);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => {});
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
function closeAllModals() { modals.slice().forEach(m => m.close()); }
boot();
