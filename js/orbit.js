'use strict';
/* ───────────── Studyspace Orbit link ─────────────
   Orbit is the student's planner. This app hands it an "Orbit pack": the SAT as an exam (with readiness per domain),
   the next two weeks of SAT study as tasks, the minutes studied as focus sessions, and optionally the vocabulary deck.
   Every record has a fixed id starting with "sat-", so sending again updates the same records instead of adding copies.

   Delivery:
   • same address as Orbit (e.g. both on the same GitHub Pages site or the same localhost port): the pack is left in
     localStorage under ORBIT_INBOX and Orbit picks it up the next time it is open or focused;
   • anywhere else: a small .json file, which Orbit imports with Settings → Your data → Import file. */

const ORBIT_KEY = 'studyspace.orbit.v1', ORBIT_INBOX = 'studyspace.orbit.inbox';
const ORBIT_URL = 'https://hallimmurodov2-beep.github.io/studyspace-orbit/';

function orbitHere() { try { return !!localStorage.getItem(ORBIT_KEY); } catch (e) { return false; } }

function domainConf(dom) {
  const m = avg(skillsIn(dom), s => mastery(s.id));
  return m < 0.45 ? 0 : m < 0.6 ? 1 : m < 0.75 ? 2 : 3;
}
function orbitPack(opts = {}) {
  const td = testDate(), p = predictTotal(), now = Date.now();
  const subject = { id: 'sat-subject', name: 'SAT', color: '#3d8bff', icon: 'target', teacher: '', room: '' };
  const exams = td ? [{
    id: 'sat-exam', title: 'SAT', subjectId: subject.id, date: td, time: '08:00', room: '',
    notes: `Target ${S.profile.target} · predicted ${p.score} (${p.lo}–${p.hi}) on ${fmtDate(todayStr())}. Readiness per domain comes from Studyspace SAT.`,
    topics: DOMAINS.map(d => ({ id: 'sat-topic-' + d.id, title: `${SECTIONS[d.sec].short}: ${d.name}`, conf: domainConf(d.id) })),
  }] : [];
  const tasks = upcoming(14).filter(x => ['study', 'test', 'rest'].includes(x.kind)).map(x => ({
    id: 'sat-task-' + x.day, title: 'SAT · ' + x.title, subjectId: subject.id, projectId: '', examId: td ? 'sat-exam' : '',
    due: x.day, planned: x.day, priority: x.kind === 'test' ? 2 : 1, est: x.minutes, status: (S.log[x.day] || {}).done ? 'done' : 'todo',
    notes: x.kind === 'study' ? `Open Studyspace SAT → Today. Focus: ${x.focus.map(id => SKILL[id].name).join(' and ')}.` : 'Open Studyspace SAT → Tests.',
    steps: [], repeat: 'none', createdAt: now, doneAt: (S.log[x.day] || {}).done ? now : 0,
  }));
  const sessions = Object.entries(S.log).filter(([d, L]) => isYmd(d) && L.sec >= 60 && diffDays(todayStr(), d) <= 90).map(([d, L]) => {
    const at = pd(d); at.setHours(17, 0, 0, 0);
    return { id: 'sat-sess-' + d, date: d, at: at.getTime(), min: Math.round(L.sec / 60), subjectId: subject.id, taskId: '', kind: 'focus', rating: 0 };
  });
  const decks = [], cards = [];
  if (opts.vocab) {
    decks.push({ id: 'sat-deck-vocab', name: 'SAT vocabulary', subjectId: subject.id });
    VOCAB.forEach(([w, pos, def, ex]) => cards.push({ id: 'sat-card-' + w, deckId: 'sat-deck-vocab', front: w, back: `(${pos}) ${def}\n\n${ex}` }));
  }
  return {
    app: 'studyspace-sat', kind: 'orbit-pack', version: 1, createdAt: now,
    summary: `SAT ${td ? 'on ' + fmtDate(td) : '(no date yet)'} · ${tasks.length} study days · ${sessions.length} days of logged study`,
    subjects: [subject], exams, tasks, sessions, decks, cards,
    /* future SAT tasks that are no longer in the plan may be removed by Orbit (only "sat-task-" ones, only if not done) */
    replace: { prefix: 'sat-task-', from: todayStr() },
  };
}

function sendToOrbit() {
  const pack = orbitPack({ vocab: S.orbit.vocab });
  commit(s => { s.orbit.lastSent = Date.now(); }, { quiet: true });
  if (orbitHere()) {
    try { localStorage.setItem(ORBIT_INBOX, JSON.stringify(pack)); toast('Sent to Orbit — it updates the next time Orbit is open.'); return 'inbox'; }
    catch (e) { /* storage full: fall through to the file */ }
  }
  download(`sat-plan-for-orbit-${todayStr()}.json`, JSON.stringify(pack, null, 1));
  toast('Saved a file for Orbit. In Orbit: Settings → Your data → Import file.');
  return 'file';
}
