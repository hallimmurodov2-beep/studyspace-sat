'use strict';
/* ───────────── the learning engine ─────────────
   • every skill has an ability estimate θ (Elo/IRT style); each question has a difficulty b
   • predicted section scores come from θ, weighted by how much of the test each domain is
   • practice targets questions you answer right about 70% of the time — hard enough to learn from
   • missed questions come back on a spaced schedule until you get them right five times in a row */

const DIFF_B = { 1: -1.2, 2: 0, 3: 1.2 };
const pCorrect = (th, b) => sigmoid(th - b);
const expectedFrac = th => (pCorrect(th, -1.2) + pCorrect(th, 0) + pCorrect(th, 1.2)) / 3;
/* fraction of a typical test answered right → 200–800 section score */
const CURVE = [[0, 200], [0.15, 290], [0.3, 390], [0.45, 470], [0.55, 520], [0.65, 570], [0.75, 630], [0.85, 690], [0.92, 740], [0.97, 780], [1, 800]];
function curve(f) {
  f = clamp(f, 0, 1);
  for (let i = 1; i < CURVE.length; i++) if (f <= CURVE[i][0]) { const [a, sa] = CURVE[i - 1], [b, sb] = CURVE[i]; return sa + (sb - sa) * (f - a) / (b - a); }
  return 800;
}
function uncurve(score) {
  for (let i = 1; i < CURVE.length; i++) if (score <= CURVE[i][1]) { const [a, sa] = CURVE[i - 1], [b, sb] = CURVE[i]; return a + (b - a) * (score - sa) / (sb - sa); }
  return 1;
}
function thetaForFrac(f) { let lo = -4, hi = 4; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (expectedFrac(mid) < f) lo = mid; else hi = mid; } return (lo + hi) / 2; }
/* where a student starts before practicing: their own score if they gave one, otherwise about 500 */
const priorTheta = sec => thetaForFrac(uncurve(clamp(S.profile.start[sec] || 500, 200, 800)));

/* ── skills ── */
const skillRec = id => S.skills[id];
function theta(id) {
  const r = skillRec(id);
  if (r && r.n) return r.th;
  /* not practiced yet: lean on the other skills in the same domain, then on the starting estimate */
  const sib = skillsIn(SKILL[id].dom).map(s => skillRec(s.id)).filter(x => x && x.n);
  const prior = priorTheta(secOf(id));
  return sib.length ? 0.5 * prior + 0.5 * avg(sib, x => x.th) : prior;
}
function recordAnswer(qid, skill, d, ok, secs, mode, noMistake) {
  const r = S.skills[skill] || (S.skills[skill] = { th: theta(skill), n: 0, c: 0, last: 0, recent: [] });
  const k = Math.max(0.28, 1.1 / Math.sqrt(1 + r.n * 0.45));
  r.th = clamp(r.th + k * ((ok ? 1 : 0) - pCorrect(r.th, DIFF_B[d] ?? 0)), -3.5, 3.5);
  r.n++; if (ok) r.c++; r.last = Date.now();
  r.recent = [...(r.recent || []), ok ? 1 : 0].slice(-12);
  S.attempts.push({ q: qid, s: skill, ok, t: Math.round(secs), at: Date.now(), m: mode });
  if (S.attempts.length > 6000) S.attempts.splice(0, S.attempts.length - 6000);
  const day = todayStr(), L = S.log[day] || (S.log[day] = { sec: 0, q: 0, ok: 0, cards: 0, done: false });
  L.sec += Math.min(secs, 300); L.q++; if (ok) L.ok++;
  if (!ok && !noMistake) addMistake(qid, skill);
  snapshotPrediction();
}
const LEVELS = [['Not started', 'none'], ['Learning', 'low'], ['Familiar', 'mid'], ['Proficient', 'good'], ['Mastered', 'top']];
function level(id) {
  const r = skillRec(id); if (!r || !r.n) return 0;
  /* the level needs evidence: a few answers can say "familiar" at most, a handful "proficient" */
  const th = r.th, cap = r.n < 4 ? 2 : r.n < 8 ? 3 : 4;
  const lv = th >= 1.2 ? 4 : th >= 0.4 ? 3 : th >= -0.4 ? 2 : 1;
  return Math.min(lv, cap);
}
const mastery = id => expectedFrac(theta(id));          // 0–1, shown as a bar

/* ── predicted scores ── */
function predictSection(sec) {
  const f = sum(domainsIn(sec), d => d.weight * avg(skillsIn(d.id), s => expectedFrac(theta(s.id))));
  const n = S.attempts.filter(a => SKILL[a.s] && secOf(a.s) === sec).length;
  const score = round10(curve(f));
  const margin = round10(30 + 140 / Math.sqrt(1 + n / 10));
  return { score, lo: Math.max(200, score - margin), hi: Math.min(800, score + margin), n };
}
function predictTotal() {
  const rw = predictSection('rw'), m = predictSection('math');
  return { score: rw.score + m.score, lo: rw.lo + m.lo, hi: rw.hi + m.hi, rw, math: m, n: rw.n + m.n };
}
function snapshotPrediction() {
  const p = predictTotal();
  S.history[todayStr()] = { rw: p.rw.score, math: p.math.score };
}

/* ── question bank access ── */
const RW_IDS = (() => { const c = {}; return RW_BANK.map(q => { c[q.skill] = (c[q.skill] || 0) + 1; return q.id = `rw-${q.skill}-${c[q.skill]}`; }); })();
const RW_BY_ID = Object.fromEntries(RW_BANK.map(q => [q.id, q]));
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/* a question id is either rw-<skill>-<n> or g:<generator>:<seed>:<difficulty> */
function getQ(id) {
  if (id.startsWith('rw-')) {
    const q = RW_BY_ID[id]; if (!q) return null;
    const order = shuffle([0, 1, 2, 3], seeded(hashStr(id)));
    return { id, sec: 'rw', skill: q.skill, d: q.d, passage: q.p, stem: q.q, choices: order.map(i => q.c[i]), answer: order.indexOf(q.a), explain: q.x };
  }
  const [, gid, seedStr, dStr] = id.split(':');
  const g = GENS.find(x => x.id === gid); if (!g) return null;
  const d = +dStr || g.d[0];
  for (let k = 0; k < 12; k++) {
    const rnd = seeded(+seedStr + k * 104729);
    let o; try { o = g.make(rnd, d); } catch (e) { continue; }
    if (!o) continue;
    if (o.spr) return { id, sec: 'math', skill: g.skill, d, stem: o.stem, fig: o.fig, choices: null, answer: o.ans, explain: o.x };
    const wrong = [...new Set((o.wrong || []).map(String))].filter(w => w !== String(o.ans)).slice(0, 3);
    if (wrong.length < 3) continue;
    const choices = shuffle([String(o.ans), ...wrong], rnd);
    return { id, sec: 'math', skill: g.skill, d, stem: o.stem, fig: o.fig, choices, answer: choices.indexOf(String(o.ans)), explain: o.x };
  }
  return null;
}
const isCorrect = (q, resp) => (q.choices ? resp.pick === q.answer : sprMatches(resp.input || '', q.answer));
const answerText = q => (q.choices ? q.choices[q.answer] : nice(q.answer));

/* difficulty that gives about a 70% chance of success at the current ability */
function targetDiff(skill) { const th = theta(skill); return th < -0.3 ? 1 : th < 1.3 ? 2 : 3; }
function seenRecently() { const m = new Map(); S.attempts.forEach((a, i) => m.set(a.q, i)); return m; }
/* within a set, wobble around the target so it never feels like the same question ten times */
const WOBBLE = [0, 0, -1, 0, 1, 0, -1, 1];

function pickQuestions(skill, n, { diff, exclude = new Set(), spread = false } = {}) {
  const out = [], sec = secOf(skill), base = targetDiff(skill);
  const want = i => diff || (spread ? [1, 2, 3][Math.floor(i * 3 / Math.max(1, n))] : clamp(base + WOBBLE[i % WOBBLE.length], 1, 3));
  if (sec === 'rw') {
    const seen = seenRecently();
    const pool = RW_BANK.filter(q => q.skill === skill && !exclude.has(q.id));
    for (let i = 0; i < n && pool.length; i++) {
      const w = want(i), cost = q => (seen.has(q.id) ? 1000 + seen.get(q.id) : 0) + Math.abs(q.d - w) * 400 + Math.random() * 50;
      pool.sort((a, b) => cost(a) - cost(b));
      out.push(pool.shift().id);
    }
    return out;
  }
  const gens = shuffle(GENS.filter(g => g.skill === skill));
  for (let i = 0; i < n; i++) {
    const w = want(i);
    const fit = gens.filter(g => g.d.includes(w)), list = fit.length ? fit : gens, g = list[i % list.length];
    const d = g.d.includes(w) ? w : g.d.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
    out.push(`g:${g.id}:${randSeed()}:${d}`);
  }
  return out;
}

/* which skills to work on: big share of the test × room to improve, plus a nudge to try untouched skills */
function priorities(sec) {
  return SKILLS.filter(s => !sec || secOf(s.id) === sec).map(s => {
    const dom = DOMAIN[s.dom], r = skillRec(s.id);
    const share = dom.weight / skillsIn(s.dom).length;
    const gap = 1 - mastery(s.id);
    const fresh = !r || r.n < 4 ? 0.35 : 0;
    const stale = r && r.last ? Math.min(0.2, (Date.now() - r.last) / (864e5 * 30)) : 0;
    return { id: s.id, score: share * (gap + fresh + stale) * 10 };
  }).sort((a, b) => b.score - a.score);
}
function smartMix(n, sec) {
  const pr = priorities(sec).slice(0, Math.max(3, Math.ceil(n / 3)));
  const per = {}, ids = [];
  for (let i = 0; i < n; i++) { const s = pr[i % pr.length].id; per[s] = (per[s] || 0) + 1; }
  for (const [s, k] of Object.entries(per)) ids.push(...pickQuestions(s, k).map(q => ({ q })));
  return shuffle(ids);
}

/* ── mistakes, reviewed at growing intervals ── */
const BOX_DAYS = [1, 3, 7, 16, 35];
const mistakeKey = qid => (qid.startsWith('g:') ? qid.split(':').slice(0, 2).join(':') + ':' + qid.split(':')[3] + ':' + qid.split(':')[2] : qid);
function addMistake(qid, skill) {
  const key = mistakeKey(qid), m = S.mistakes[key];
  if (m) { m.box = 0; m.due = addDays(todayStr(), 1); m.misses = (m.misses || 1) + 1; m.q = qid; return; }
  S.mistakes[key] = { q: qid, s: skill, added: todayStr(), due: addDays(todayStr(), 1), box: 0, reason: '', note: '', misses: 1 };
}
function reviewResult(key, ok) {
  const m = S.mistakes[key]; if (!m) return;
  if (!ok) { m.box = 0; m.due = addDays(todayStr(), 1); m.misses++; return; }
  m.box++;
  if (m.box >= BOX_DAYS.length) { delete S.mistakes[key]; S.retired++; return; }
  m.due = addDays(todayStr(), BOX_DAYS[m.box]);
}
const dueMistakes = () => Object.entries(S.mistakes).filter(([, m]) => m.due <= todayStr()).map(([k, m]) => ({ key: k, ...m }));
/* the question to show for a review: the exact one the first time, a fresh variant of generated math after that */
function reviewQid(m) {
  if (!m.q.startsWith('g:') || m.box < 1) return m.q;
  const [, gid, , d] = m.q.split(':');
  return `g:${gid}:${randSeed()}:${d}`;
}
const REASONS = [['concept', 'Didn\'t know how'], ['careless', 'Careless slip'], ['misread', 'Misread the question'], ['time', 'Rushed / ran out of time'], ['guess', 'Guessed']];

/* ── vocabulary: five boxes ── */
const VBOX = [0, 1, 3, 7, 16, 40];
function vocabDue() {
  const today = todayStr();
  return VOCAB.filter(([w]) => S.vocab[w] && S.vocab[w].due <= today);
}
function vocabNewToday() { const L = S.log[todayStr()]; return L ? (L.newWords || 0) : 0; }
function vocabQueue(limitNew = 10) {
  const due = vocabDue();
  const fresh = VOCAB.filter(([w]) => !S.vocab[w]).slice(0, Math.max(0, limitNew - vocabNewToday()));
  return [...shuffle(due), ...fresh];
}
function gradeWord(word, grade) {                       // grade: 0 again · 1 hard · 2 good
  const v = S.vocab[word] || { box: 0, due: todayStr(), seen: 0 };
  const isNew = !S.vocab[word];
  v.seen++;
  v.box = grade === 0 ? 0 : grade === 1 ? Math.max(1, v.box) : Math.min(VBOX.length - 1, v.box + 1);
  v.due = addDays(todayStr(), grade === 0 ? 0 : VBOX[v.box] || 1);
  S.vocab[word] = v;
  const L = S.log[todayStr()] || (S.log[todayStr()] = { sec: 0, q: 0, ok: 0, cards: 0, done: false });
  L.cards++; L.sec += 8; if (isNew) L.newWords = (L.newWords || 0) + 1;
}
const wordsKnown = () => Object.values(S.vocab).filter(v => v.box >= 3).length;

/* ── the study plan ── */
const testDate = () => (isYmd(S.profile.testDate) ? S.profile.testDate : '');
const daysToTest = () => (testDate() ? diffDays(testDate(), todayStr()) : null);
const isStudyDay = day => S.profile.days.includes(dow(day));
/* full practice tests: a week before the test, then every two weeks before that, always on the last study day of that week */
function testDays() {
  const td = testDate(); if (!td) return new Set();
  const out = new Set();
  for (let back = 7; back <= 120; back += back < 28 ? 7 : 14) {
    let day = addDays(td, -back);
    for (let k = 0; k < 6 && !isStudyDay(day); k++) day = addDays(day, -1);
    if (day > todayStr()) out.add(day);
    if (back >= 28 && diffDays(td, todayStr()) < back) break;
  }
  return out;
}
function dayPlan(day, idx = 0) {
  const td = testDate(), M = S.profile.minutes;
  if (td && day === td) return { day, kind: 'exam', title: 'SAT test day', minutes: 0 };
  if (td && day > td) return { day, kind: 'after', title: '', minutes: 0 };
  if (td && diffDays(td, day) === 1) return { day, kind: 'rest', title: 'Light review: formulas and mistakes only, then rest', minutes: 20 };
  if (!isStudyDay(day)) return { day, kind: 'off', title: 'Day off', minutes: 0 };
  if (testDays().has(day)) return { day, kind: 'test', title: 'Full practice test (about 2 h 15 min)', minutes: 135 };
  const pr = { rw: priorities('rw'), math: priorities('math') };
  const a = pr.rw[idx % 3], b = pr.math[idx % 3];
  return { day, kind: 'study', title: `${SKILL[b.id].name} + ${SKILL[a.id].name}`, minutes: M, focus: [b.id, a.id] };
}
function upcoming(n = 14) {
  const out = []; let k = 0;
  for (let i = 0; i < n; i++) { const day = addDays(todayStr(), i), p = dayPlan(day, k); if (p.kind === 'study') k++; if (p.kind !== 'after') out.push(p); }
  return out;
}
/* today's session, sized to the minutes you set */
function todaySession() {
  const M = S.profile.minutes, plan = dayPlan(todayStr());
  const due = dueMistakes();
  const nReview = Math.min(due.length, Math.round(M * 0.3 / 1.5));
  const focus = plan.focus || [priorities('math')[0].id, priorities('rw')[0].id];
  const left = Math.max(10, M - nReview * 1.5 - 5);
  const nMath = Math.max(3, Math.round(left * 0.5 / 2.2)), nRw = Math.max(3, Math.round(left * 0.5 / 1.6));
  /* a Reading and Writing skill has a limited bank: top up from the next skill that needs work */
  const bank = id => RW_BANK.filter(q => q.skill === id).length;
  const rwParts = [[focus[1], Math.min(nRw, bank(focus[1]))]];
  for (const p of priorities('rw')) { const have = sum(rwParts, x => x[1]); if (have >= nRw) break; if (p.id !== focus[1]) rwParts.push([p.id, Math.min(nRw - have, bank(p.id))]); }
  return { plan, review: due.slice(0, nReview), focus, nMath, nRw, rwParts, vocab: vocabQueue(10).length };
}
function weekStrip() {
  const out = [];
  for (let i = 6; i >= 0; i--) { const d = addDays(todayStr(), -i), L = S.log[d]; out.push({ d, min: L ? Math.round(L.sec / 60) : 0, q: L ? L.q : 0 }); }
  return out;
}
const minutesToday = () => Math.round(((S.log[todayStr()] || {}).sec || 0) / 60);

/* ── practice tests (adaptive, like the real test: module 2 depends on module 1) ── */
const TEST_FORMS = {
  full: { name: 'Full practice test', secs: ['rw', 'math'], scale: 1 },
  rw: { name: 'Reading and Writing section', secs: ['rw'], scale: 1 },
  math: { name: 'Math section', secs: ['math'], scale: 1 },
  mini: { name: 'Half-length test', secs: ['rw', 'math'], scale: 0.5 },
};
function buildModule(sec, n, path, exclude) {
  /* the test's mix of domains, then of difficulty: module 1 is balanced, module 2 leans easy or hard */
  const doms = domainsIn(sec), counts = doms.map(d => Math.round(d.weight * n));
  while (sum(counts) > n) counts[counts.indexOf(Math.max(...counts))]--;
  while (sum(counts) < n) counts[counts.indexOf(Math.min(...counts))]++;
  const diffs = path === 'hard' ? [2, 3, 3] : path === 'easy' ? [1, 1, 2] : [1, 2, 3];
  const items = [];
  doms.forEach((d, i) => {
    const sk = shuffle(skillsIn(d.id));
    for (let k = 0; k < counts[i]; k++) {
      const skill = sk[k % sk.length].id, want = diffs[k % 3];
      /* when a skill's questions run out, borrow from its domain, then from the whole section, before ever repeating */
      const tries = [skill, ...sk.map(s => s.id), ...shuffle(SKILLS.filter(s => secOf(s.id) === sec)).map(s => s.id)];
      let id = null;
      for (const s of tries) { [id] = pickQuestions(s, 1, { diff: want, exclude }); if (id) break; }
      if (!id) [id] = pickQuestions(skill, 1, { diff: want });
      exclude.add(id); items.push(id);
    }
  });
  /* like the real test: Reading and Writing is grouped by question type (each group easier → harder);
     Math runs roughly from easier to harder */
  const TYPE = ['wic', 'tsp', 'ctc', 'cid', 'coe-t', 'coe-q', 'inf', 'bnd', 'fss', 'tr', 'rs'];
  const rank = x => (sec === 'rw' ? TYPE.indexOf(x.skill) * 10 + x.d : x.d);
  return items.map(id => { const q = getQ(id) || {}; return { id, d: q.d || 2, skill: q.skill }; }).sort((a, b) => rank(a) - rank(b)).map(x => x.id);
}
function sectionScore(c1, n1, c2, n2, path) {
  const c = (c1 + c2) / Math.max(1, n1 + n2);
  const s = path === 'hard' ? 400 + 400 * (c - 0.3) / 0.7 : 200 + 430 * c;
  return clamp(round10(s), 200, 800);
}
