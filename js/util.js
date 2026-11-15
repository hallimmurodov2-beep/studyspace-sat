'use strict';
/* ───────────── Studyspace SAT · utilities ───────────── */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Safe templating: interpolations are escaped unless they come from html`` or raw().
   Question and lesson text is written by us and contains markup, so views pass it through raw(). */
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC_MAP[c]);
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = s => new Raw(String(s ?? ''));
function hv(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(hv).join('');
  return esc(v);
}
function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += hv(vals[i]) + strings[i + 1];
  return new Raw(out);
}

/* ── numbers & collections ── */
const uid = () => Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 8);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const sum = (arr, fn = x => x) => arr.reduce((n, x) => n + (fn(x) || 0), 0);
const avg = (arr, fn = x => x) => (arr.length ? sum(arr, fn) / arr.length : 0);
const round10 = n => Math.round(n / 10) * 10;
const pct = n => Math.round(n * 100) + '%';
const sigmoid = x => 1 / (1 + Math.exp(-x));
/* deterministic random — the same seed always builds the same generated question */
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const pick = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length)];
const randSeed = () => Math.floor(Math.random() * 2147483647) + 1;
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }

/* ── dates: local calendar days as YYYY-MM-DD ── */
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const isYmd = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(pd(s));
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((pd(a) - pd(b)) / 864e5);
const dow = s => pd(s).getDay() || 7;                 // 1 = Monday … 7 = Sunday
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fmtDate = (s, withDay) => { const d = pd(s); return (withDay ? DAYS[dow(s) - 1] + ', ' : '') + MONTHS[d.getMonth()] + ' ' + d.getDate(); };
function relDay(s) {
  const n = diffDays(s, todayStr());
  if (n === 0) return 'Today'; if (n === 1) return 'Tomorrow'; if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return DAYS[dow(s) - 1];
  return fmtDate(s);
}
const fmtMin = m => { m = Math.round(m); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''); };
const fmtClock = sec => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + pad(sec % 60); };
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));

/* ── math text: a tiny formatter so questions read like the test without a math library ──
   x^2, x^{n+1}, a_1, \frac{a}{b}, \sqrt{x}, \pi, \le, \ge, \ne, \cdot, \times, \theta, \deg, -  →  real typography */
function mx(src) {
  let s = String(src);
  const grab = (str, i) => { let depth = 0, j = i; for (; j < str.length; j++) { if (str[j] === '{') depth++; else if (str[j] === '}') { depth--; if (!depth) break; } } return [str.slice(i + 1, j), j + 1]; };
  const walk = str => {
    let out = '';
    for (let i = 0; i < str.length;) {
      if (str.startsWith('\\frac{', i)) {
        const [a, j] = grab(str, i + 5); const [b, k] = grab(str, j);
        out += `<span class="fr"><span>${walk(a)}</span><span>${walk(b)}</span></span>`; i = k; continue;
      }
      if (str.startsWith('\\sqrt{', i)) { const [a, j] = grab(str, i + 5); out += `<span class="sq">√<span>${walk(a)}</span></span>`; i = j; continue; }
      if (str[i] === '^' || str[i] === '_') {
        const tag = str[i] === '^' ? 'sup' : 'sub';
        if (str[i + 1] === '{') { const [a, j] = grab(str, i + 1); out += `<${tag}>${walk(a)}</${tag}>`; i = j; continue; }
        const m = str.slice(i + 1).match(/^-?[0-9a-zA-Z.]+/);
        if (m) { out += `<${tag}>${walk(m[0])}</${tag}>`; i += 1 + m[0].length; continue; }
      }
      const sym = [['\\pi', 'π'], ['\\le', '≤'], ['\\ge', '≥'], ['\\ne', '≠'], ['\\cdot', '·'], ['\\times', '×'], ['\\theta', 'θ'], ['\\deg', '°'], ['\\pm', '±'], ['\\angle', '∠'], ['\\triangle', '△'], ['\\approx', '≈'], ['\\sin', 'sin'], ['\\cos', 'cos'], ['\\tan', 'tan']].find(([k]) => str.startsWith(k, i));
      if (sym) { out += sym[1]; i += sym[0].length; continue; }
      out += str[i]; i++;
    }
    return out;
  };
  return walk(s).replace(/(^|[\s(=,+−≤≥<>])-(?=[\d\w(√.<])/g, '$1−').replace(/ - /g, ' − ');
}
/* [[...]] inside prose → math formatting with italic letters (dollar signs stay free for prices) */
const italicVars = h => h.split(/(<[^>]+>|&[a-z]+;)/).map(p => (p.startsWith('<') || p.startsWith('&') ? p : p.replace(/(^|[^a-zA-Z])([a-zA-Z])(?![a-zA-Z])/g, '$1<i>$2</i>'))).join('');
const M = s => String(s).replace(/\[\[(.+?)\]\]/g, (_, e) => `<span class="m">${italicVars(mx(e))}</span>`);

/* ── numbers as the test writes them ── */
function fracStr(n, d) {                       // a/b in lowest terms, sign on top
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d); n /= g; d /= g;
  return d === 1 ? String(n) : `${n}/${d}`;
}
const fracM = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : (n < 0 ? '-' : '') + `\\frac{${Math.abs(n)}}{${d}}`; };
const nice = n => { const r = Math.round(n * 1000) / 1000; return Object.is(r, -0) ? '0' : String(r); };
const money = n => '$' + (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2));
const signed = (n, first) => (n < 0 ? (first ? '-' : ' - ') + Math.abs(n) : (first ? '' : ' + ') + n);
/* a·x as a term: 1x → x, -1x → -x */
const term = (c, v, first) => { if (c === 0) return ''; const a = Math.abs(c); const body = (a === 1 && v ? '' : a) + v; return c < 0 ? (first ? '-' : ' - ') + body : (first ? '' : ' + ') + body; };
const poly = parts => { let out = '', first = true; for (const [c, v] of parts) { if (!c) continue; out += term(c, v, first); first = false; } return out || '0'; };

/* ── grid-in answers: "3/4", ".75", "0.75" are all the same number ── */
function parseNum(s) {
  s = String(s).trim().replace(/−/g, '-').replace(/\s+/g, '');
  if (!s) return NaN;
  if (/^-?\d+\/\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return b ? a / b : NaN; }
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return Number(s);
  return NaN;
}
function sprMatches(input, answers) {
  const v = parseNum(input); if (!isFinite(v)) return false;
  return [].concat(answers).some(a => { const t = parseNum(a); return isFinite(t) && Math.abs(v - t) < 0.0015 * Math.max(1, Math.abs(t)); });
}

/* ── download / file pick ── */
function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function pickFile(cb) {
  const inp = $('#file-input');
  inp.value = '';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => cb(String(r.result)); r.readAsText(f); };
  inp.click();
}
