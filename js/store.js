'use strict';
/* ───────────── state: everything lives in this browser (localStorage), nothing is sent anywhere ───────────── */

const STORE_KEY = 'studyspace.sat.v1';

function freshState() {
  return {
    v: 1, createdAt: Date.now(), updatedAt: Date.now(),
    profile: { name: '', testDate: '', target: 1400, start: { rw: 0, math: 0 }, days: [1, 2, 3, 4, 5, 6], minutes: 45, onboarded: false },
    settings: { theme: 'auto', accent: 'blue', showTimer: true, autoNext: false },
    skills: {},          // skillId → { th, n, c, last, recent: [1,0,…] }
    attempts: [],        // { q, s, ok, t, at, m }   (newest last, capped)
    mistakes: {},        // key → { q, s, added, due, box, reason, note, misses }
    retired: 0,          // mistakes answered right 5 reviews in a row
    vocab: {},           // word → { box, due, seen }
    log: {},             // 'YYYY-MM-DD' → { sec, q, ok, cards, done }
    tests: [],           // finished practice tests
    history: {},         // 'YYYY-MM-DD' → { rw, math } predicted scores
    session: null,       // the session in progress (survives a reload)
    orbit: { lastSent: 0, vocab: false },
  };
}

let S = freshState();
let storageOK = true;
let _render = () => {};
const onChange = fn => { _render = fn; };

function normalize(s) {
  const f = freshState(), o = { ...f, ...(s && typeof s === 'object' ? s : {}) };
  o.profile = { ...f.profile, ...(o.profile || {}) };
  o.profile.start = { ...f.profile.start, ...(o.profile.start || {}) };
  o.settings = { ...f.settings, ...(o.settings || {}) };
  o.orbit = { ...f.orbit, ...(o.orbit || {}) };
  for (const k of ['skills', 'mistakes', 'vocab', 'log', 'history']) if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {};
  for (const k of ['attempts', 'tests']) if (!Array.isArray(o[k])) o[k] = [];
  if (!Array.isArray(o.profile.days) || !o.profile.days.length) o.profile.days = f.profile.days;
  return o;
}

function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) S = normalize(JSON.parse(raw)); }
  catch (e) { storageOK = false; console.error('Could not read saved data', e); }
  applyTheme();
}
let _saveT = 0;
function save() {
  clearTimeout(_saveT);
  _saveT = setTimeout(saveNow, 250);
}
function saveNow() {
  clearTimeout(_saveT); _saveT = 0;
  try { S.updatedAt = Date.now(); localStorage.setItem(STORE_KEY, JSON.stringify(S)); storageOK = true; }
  catch (e) { storageOK = false; console.error('Could not save', e); }
}
/* every change: mutate → save → re-render */
function commit(fn, opts = {}) { fn(S); save(); if (!opts.quiet) _render(); }

function applyTheme() {
  let th = S.settings.theme;
  if (th === 'auto') th = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = th;
  document.documentElement.dataset.accent = S.settings.accent;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = th === 'dark' ? '#0b0d13' : '#f3f4f9';
}

addEventListener('storage', e => {
  if (e.key !== STORE_KEY || !e.newValue) return;
  try { const next = normalize(JSON.parse(e.newValue)); next.session = S.session; S = next; applyTheme(); _render(); } catch (err) { /* ignore */ }
});
addEventListener('pagehide', () => { if (_saveT) saveNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && _saveT) saveNow(); });

/* ── backup ── */
function exportJSON() { return JSON.stringify({ app: 'studyspace-sat', version: 1, exportedAt: new Date().toISOString(), state: { ...S, session: null } }, null, 1); }
function importJSON(text) {
  let o; try { o = JSON.parse(text); } catch (e) { return 'That file is not valid JSON.'; }
  if (!o || o.app !== 'studyspace-sat' || !o.state) return 'This is not a Studyspace SAT backup.';
  S = normalize(o.state); S.profile.onboarded = true; applyTheme(); saveNow(); _render();
  return '';
}
