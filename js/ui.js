'use strict';
/* ───────────── icons, dialogs, toasts, small widgets ───────────── */

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5Z"/><path d="M19 17v4H6.5"/>',
  redo: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 2h12a2 2 0 0 1 2 2v12"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  play: '<path d="M7 4v16l13-8Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
  flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/>',
  ref: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="m17 10 5-3v10l-5-3"/>',
  ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>',
  orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 3v4M21 5h-4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  strike: '<circle cx="12" cy="12" r="9"/><path d="M5.6 18.4 18.4 5.6"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9Z"/>',
  bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z"/>',
};
const icon = (name, size = 18, cls = '') => raw(`<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`);
const LOGO = raw(`<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><defs><linearGradient id="lg" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><rect width="32" height="32" rx="10" fill="url(#lg)"/><path d="M9 21.5 14 11l3.2 6.2 2.3-3.7L23.5 21.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="23.2" cy="9.6" r="2.4" fill="#fff"/></svg>`);

function toast(msg, opts = {}) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html`<span>${msg}</span>${opts.action ? html`<button>${opts.action}</button>` : ''}`.s;
  if (opts.action) el.querySelector('button').onclick = () => { opts.onAction(); el.remove(); };
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), opts.ms || 3800);
}

/* modal(content, { wide }) → returns { close }. Content is html``; data-act buttons inside are handled by ACT */
const modals = [];
function modal(content, opts = {}) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = html`<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${content}</div>`.s;
  scrim.addEventListener('mousedown', e => { if (e.target === scrim && !opts.sticky) close(); });
  $('#overlays').appendChild(scrim);
  const m = { el: scrim, close };
  function close() { scrim.remove(); const i = modals.indexOf(m); if (i >= 0) modals.splice(i, 1); if (opts.onClose) opts.onClose(); }
  modals.push(m);
  setTimeout(() => { const f = scrim.querySelector('[autofocus]'); if (f) f.focus(); }, 30);
  return m;
}
const closeModal = () => { const m = modals[modals.length - 1]; if (m) m.close(); };
function confirmBox(title, body, okLabel, onOk, danger) {
  const m = modal(html`<div class="modal-head"><h2 class="h2">${title}</h2></div><p class="muted">${body}</p>
    <div class="modal-foot"><button class="btn ghost" data-act="close-modal">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cb-ok" autofocus>${okLabel}</button></div>`);
  m.el.querySelector('#cb-ok').onclick = () => { m.close(); onOk(); };
}

function ring(frac, size = 120, stroke = 10, color = 'var(--accent)', label = '') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return html`<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(frac, 0, 1))}"/></svg><b>${label}</b></div>`;
}
const bar = (frac, color) => html`<div class="bar"><i style="width:${Math.round(clamp(frac, 0, 1) * 100)}%;${color ? `--c:${color}` : ''}"></i></div>`;
/* a skill's readiness bar; faded while it is only an estimate (no answers yet) */
const skillBar = id => { const r = skillRec(id), sec = secOf(id); return html`<div style="${r && r.n ? '' : 'opacity:.35'}" title="${r && r.n ? pct(mastery(id)) + ' ready' : 'Estimate — not practiced yet'}">${bar(mastery(id), secColor(sec))}</div>`; };
const secChip = sec => html`<span class="chip ${sec}">${SECTIONS[sec].short}</span>`;
const diffChip = d => html`<span class="chip">${['', 'Easy', 'Medium', 'Hard'][d]}</span>`;
const lvlLabel = id => { const [t, c] = LEVELS[level(id)]; return html`<span class="lvl lvl-${c}">${t}</span>`; };
const pips = (id, color) => { const l = level(id); return html`<span class="pips" style="--c:${color}">${[1, 2, 3, 4].map(i => html`<i class="${i <= l ? 'on' : ''}"></i>`)}</span>`; };
const secColor = sec => (sec === 'rw' ? 'var(--rw)' : 'var(--math)');
