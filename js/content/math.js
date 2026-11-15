'use strict';
/* ───────────── Math question generators ─────────────
   Each generator builds a fresh SAT-style question from a seed, so practice never runs out and a missed
   question can be shown again exactly (same seed) or as a new variant (new seed).
   A generator returns { stem, ans, wrong: [3+ wrong choices] | spr: true, x: explanation, fig?: svg }.
   Math inside text is written [[like this]]; d is the difficulty asked for (1 easy · 2 medium · 3 hard). */

const GENS = [];
const G = (skill, d, make) => GENS.push({ id: skill + '.' + (GENS.filter(g => g.skill === skill).length + 1), skill, d, make });
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const nz = (r, a, b) => { let v = 0; while (!v) v = ri(r, a, b); return v; };
const mm = s => `[[${s}]]`;
/* n/d · π written the way the test does: π, 2π, π/3, 3π/4 */
const piM = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); n /= g; d /= g; const sg = n < 0 ? '-' : '', k = Math.abs(n), top = (k === 1 ? '' : k) + '\\pi'; return sg + (d === 1 ? top : `\\frac{${top}}{${d}}`); };
/* numbers that look like plausible slips, never equal to the answer */
function near(ans, cands, r) {
  const out = [];
  for (const c of [...cands, ans + 1, ans - 1, ans + 2, ans * 2, ans - 2, ans + 3, -ans]) {
    const v = typeof c === 'number' ? Math.round(c * 1000) / 1000 : c;
    if (v !== ans && !out.includes(v) && (typeof v !== 'number' || isFinite(v))) out.push(v);
    if (out.length === 3) break;
  }
  return out;
}

/* ── simple charts as SVG (colors follow the theme) ── */
function barChart(labels, values, { title = '', unit = '', max } = {}) {
  const W = 340, H = 200, L = 40, B = 30, T = 14, n = values.length;
  const top = max || Math.ceil(Math.max(...values) / 10) * 10 || 10, step = top / 5;
  const bw = (W - L - 10) / n;
  let g = '';
  for (let i = 0; i <= 5; i++) { const y = H - B - (H - B - T) * i / 5; g += `<line x1="${L}" x2="${W - 6}" y1="${y}" y2="${y}" class="grid"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${nice(step * i)}</text>`; }
  values.forEach((v, i) => { const h = (H - B - T) * v / top, x = L + i * bw + bw * 0.18; g += `<rect x="${x}" y="${H - B - h}" width="${bw * 0.64}" height="${h}" rx="3" class="bar"/><text x="${x + bw * 0.32}" y="${H - B + 16}" text-anchor="middle">${labels[i]}</text>`; });
  return `<figure class="fig"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">${g}<line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" class="axis"/><line x1="${L}" x2="${W - 6}" y1="${H - B}" y2="${H - B}" class="axis"/></svg><figcaption>${title}${unit ? ` (${unit})` : ''}</figcaption></figure>`;
}
function scatterPlot(pts, line, { title = '', xl = 'x', yl = 'y', xmax, ymax } = {}) {
  const W = 340, H = 230, L = 40, B = 34, T = 12, R = 10;
  const X = xmax || Math.ceil(Math.max(...pts.map(p => p[0])) / 5) * 5, Y = ymax || Math.ceil(Math.max(...pts.map(p => p[1])) / 10) * 10;
  const sx = x => L + (W - L - R) * x / X, sy = y => H - B - (H - B - T) * y / Y;
  let g = '';
  for (let i = 0; i <= 5; i++) { g += `<line x1="${L}" x2="${W - R}" y1="${sy(Y * i / 5)}" y2="${sy(Y * i / 5)}" class="grid"/><text x="${L - 6}" y="${sy(Y * i / 5) + 4}" text-anchor="end">${nice(Y * i / 5)}</text>`; g += `<text x="${sx(X * i / 5)}" y="${H - B + 16}" text-anchor="middle">${nice(X * i / 5)}</text>`; }
  if (line) { const [m, b] = line; g += `<line x1="${sx(0)}" y1="${sy(b)}" x2="${sx(X)}" y2="${sy(m * X + b)}" class="fit"/>`; }
  pts.forEach(([x, y]) => { g += `<circle cx="${sx(x)}" cy="${sy(y)}" r="4" class="pt"/>`; });
  return `<figure class="fig"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">${g}<line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" class="axis"/><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="axis"/><text x="${(W + L) / 2}" y="${H - 4}" text-anchor="middle" class="lab">${xl}</text></svg><figcaption>${title}${yl ? ' — vertical axis: ' + yl : ''}</figcaption></figure>`;
}
const table = (head, rows, cap = '') => `<table class="data">${cap ? `<caption>${cap}</caption>` : ''}<tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;

/* ═════════════ ALGEBRA ═════════════ */
G('lin-eq', [1, 2], (r, d) => {
  if (d === 1) {
    const x = ri(r, -6, 12), a = ri(r, 2, 9), b = nz(r, -15, 15), c = a * x + b;
    return { stem: `If ${mm(`${a}x${signed(b)} = ${c}`)}, what is the value of ${mm('x')}?`, ans: x, wrong: near(x, [(c + b) / a, c - b, x + 2]), x: `Subtract ${b} from both sides: ${mm(`${a}x = ${c - b}`)}. Divide by ${a}: ${mm(`x = ${x}`)}.` };
  }
  const x = ri(r, -5, 9), a = ri(r, 2, 6), k = ri(r, 1, 7), c = ri(r, 1, a + 4);
  const cc = c === a ? c + 1 : c, dd = a * (x - k) - cc * x;
  return { stem: `What value of ${mm('x')} satisfies ${mm(`${a}(x - ${k}) = ${cc}x${signed(dd)}`)}?`, ans: x,
    wrong: near(x, [(dd + k) / (a - cc), (dd + a * k) / (a - cc) + 2, -x]),
    x: `Distribute: ${mm(`${a}x - ${a * k} = ${cc}x${signed(dd)}`)}. Collect ${mm('x')}: ${mm(`${a - cc}x = ${dd + a * k}`)}, so ${mm(`x = ${x}`)}.` };
});
G('lin-eq', [3], (r) => {
  const a = ri(r, 2, 7), b = ri(r, 2, 9), m = ri(r, 2, 5), k = a * m;
  return { spr: true, stem: `In the equation ${mm(`${m}(${a}x + c) = ${k}x + ${m * b}`)}, ${mm('c')} is a constant. If the equation has infinitely many solutions, what is the value of ${mm('c')}?`, ans: b,
    x: `Distribute: ${mm(`${k}x + ${m}c = ${k}x + ${m * b}`)}. The ${mm('x')}-terms already match, so infinitely many solutions require ${mm(`${m}c = ${m * b}`)}, giving ${mm(`c = ${b}`)}.` };
});
G('lin-eq', [3], (r) => {
  const a = ri(r, 2, 8), b = ri(r, 1, 9), c = ri(r, 1, 9) + b;
  return { stem: `For what value of ${mm('k')} does the equation ${mm(`${a}x + ${b} = kx + ${c}`)} have no solution?`, ans: a, wrong: near(a, [-a, c - b, a + b]),
    x: `An equation ${mm('ax + b = kx + c')} has no solution when the ${mm('x')}-coefficients are equal and the constants differ. Here the constants ${b} and ${c} differ, so ${mm(`k = ${a}`)}.` };
});
G('lin-word', [1, 2], (r, d) => {
  const fee = ri(r, 3, 12) * 5, rate = ri(r, 4, 15), n = ri(r, 3, 14), tot = fee + rate * n;
  const ctx = pick([['a gym', 'a one-time sign-up fee', 'per class', 'classes'], ['a bike rental shop', 'a flat fee', 'per hour', 'hours'], ['a plumber', 'a call-out fee', 'per hour of work', 'hours']], r);
  if (d === 1) return { stem: `${ctx[0][0].toUpperCase() + ctx[0].slice(1)} charges ${ctx[1]} of ${money(fee)} plus ${money(rate)} ${ctx[2]}. A customer paid ${money(tot)} in total. For how many ${ctx[3]} did the customer pay?`, ans: n, wrong: near(n, [Math.round(tot / rate), (tot + fee) / rate, n + 2]), x: `Total = fee + rate × ${ctx[3]}: ${mm(`${fee} + ${rate}n = ${tot}`)}. So ${mm(`${rate}n = ${tot - fee}`)} and ${mm(`n = ${n}`)}.` };
  return { stem: `${ctx[0][0].toUpperCase() + ctx[0].slice(1)} charges ${ctx[1]} of ${money(fee)} plus ${money(rate)} ${ctx[2]}. Which equation gives the total cost ${mm('C')}, in dollars, for ${mm('h')} ${ctx[3]}?`,
    ans: mm(`C = ${rate}h + ${fee}`), wrong: [mm(`C = ${fee}h + ${rate}`), mm(`C = ${rate + fee}h`), mm(`C = ${rate}(h + ${fee})`), mm(`C = ${rate}h - ${fee}`), mm(`C = ${fee}h`)], x: `The fee is paid once (the constant, ${fee}); the ${rate} is paid for each of the ${mm('h')} ${ctx[3]} (the slope). So ${mm(`C = ${rate}h + ${fee}`)}.` };
});
G('lin-word', [3], (r) => {
  const a = ri(r, 2, 6), b = ri(r, 7, 14), start = ri(r, 4, 10) * 10, start2 = start + ri(r, 2, 6) * (b - a);
  const w = (start2 - start) / (b - a);
  return { spr: true, stem: `Tank A holds ${start} liters of water and is filled at ${b} liters per minute. Tank B holds ${start2} liters and is filled at ${a} liters per minute. After how many minutes will the two tanks hold the same amount of water?`, ans: w,
    x: `Set the amounts equal: ${mm(`${start} + ${b}t = ${start2} + ${a}t`)}. Then ${mm(`${b - a}t = ${start2 - start}`)}, so ${mm(`t = ${w}`)}.` };
});
G('lin-rel', [1, 2], (r, d) => {
  const b = ri(r, 2, 9) * 10, m = ri(r, 3, 25);
  const ctx = pick([['C', 'h', 'the total cost, in dollars, of renting a boat for', 'hours', 'the cost per hour', 'the cost before any hours'], ['W', 'd', 'the amount of water, in gallons, in a pool after', 'days of filling', 'the gallons added each day', 'the gallons in the pool at the start'], ['S', 'w', 'the total savings, in dollars, after', 'weeks', 'the amount saved each week', 'the savings at the start']], r);
  if (d === 1) return { stem: `The equation ${mm(`${ctx[0]} = ${m}${ctx[1]} + ${b}`)} gives ${ctx[2]} ${mm(ctx[1])} ${ctx[3]}. What is the best interpretation of ${m} in this context?`, ans: `It is ${ctx[4]}.`, wrong: [`It is ${ctx[5]}.`, `It is the total after one ${ctx[3].split(' ')[0].replace(/s$/, '')}.`, `It is the number of ${ctx[3].split(' ')[0]} needed.`], x: `In ${mm('y = mx + b')}, the coefficient of the variable (${m}) is the rate of change: ${ctx[4]}. The constant ${b} is ${ctx[5]}.` };
  const x1 = ri(r, 1, 4), x2 = x1 + ri(r, 2, 5), x3 = x2 + ri(r, 2, 6);
  return { spr: true, stem: `A linear function ${mm('f')} satisfies ${mm(`f(${x1}) = ${m * x1 + b}`)} and ${mm(`f(${x2}) = ${m * x2 + b}`)}. What is the value of ${mm(`f(${x3})`)}?`, ans: m * x3 + b,
    x: `Slope = ${mm(`\\frac{${m * x2 + b} - ${m * x1 + b}}{${x2} - ${x1}} = ${m}`)}. Then ${mm(`f(${x3}) = f(${x2}) + ${m}(${x3 - x2}) = ${m * x3 + b}`)}.` };
});
G('lin-graph', [1, 2], (r, d) => {
  const x1 = ri(r, -5, 4), y1 = ri(r, -6, 6), dx = nz(r, 1, 5), dy = nz(r, -8, 8);
  const x2 = x1 + dx, y2 = y1 + dy;
  if (d === 1) return { stem: `A line passes through the points ${mm(`(${x1}, ${y1})`)} and ${mm(`(${x2}, ${y2})`)}. What is the slope of the line?`, ans: mm(fracM(dy, dx)), wrong: [mm(fracM(dx, dy)), mm(fracM(-dy, dx)), mm(fracM(y2 + y1, x2 + x1 || 1)), mm(fracM(dy + dx, dx)), mm(fracM(dy, dx + 1)), mm(fracM(dy - 2 * dx, dx))],
    x: `Slope = ${mm(`\\frac{y_2 - y_1}{x_2 - x_1} = \\frac{${y2} - ${y1 < 0 ? `(${y1})` : y1}}{${x2} - ${x1 < 0 ? `(${x1})` : x1}} = ${fracM(dy, dx)}`)}.` };
  const A = nz(r, 1, 6), B = nz(r, 1, 6), C = ri(r, 1, 30);
  return { stem: `Line ${mm('k')} is defined by ${mm(`${A}x + ${B}y = ${C}`)}. Line ${mm('j')} is perpendicular to line ${mm('k')}. What is the slope of line ${mm('j')}?`, ans: mm(fracM(B, A)), wrong: [mm(fracM(-A, B)), mm(fracM(A, B)), mm(fracM(-B, A)), mm(fracM(C, B)), mm(fracM(B + A, A)), mm(fracM(-A - B, B))],
    x: `Rewrite: ${mm(`y = ${fracM(-A, B)}x + ${fracM(C, B)}`)}, so line ${mm('k')} has slope ${mm(fracM(-A, B))}. A perpendicular slope is the negative reciprocal: ${mm(fracM(B, A))}.` };
});
G('lin-graph', [3], (r) => {
  const m = nz(r, -4, 4), b = ri(r, -9, 9), xi = ri(r, -6, 6);
  const c = m * xi;
  return { spr: true, stem: `The graph of ${mm(`y = ${m}x + c`)} in the ${mm('xy')}-plane has an ${mm('x')}-intercept at ${mm(`(${xi}, 0)`)}. What is the value of ${mm('c')}?`, ans: -c,
    x: `At the ${mm('x')}-intercept ${mm('y = 0')}: ${mm(`0 = ${m}(${xi}) + c`)}, so ${mm(`c = ${-c}`)}.`, _b: b };
});
G('sys', [1, 2], (r, d) => {
  const x = ri(r, -5, 8), y = ri(r, -5, 8), a = nz(r, 1, 5), b = nz(r, 1, 5), c = nz(r, 1, 5), e = nz(r, -5, 5);
  if (a * e - b * c === 0) return GENS.find(g => g.id === 'sys.1').make(seeded(Math.floor(r() * 1e9)), d);
  const p = a * x + b * y, q = c * x + e * y;
  const want = d === 1 ? 'x' : pick(['y', 'x + y'], r), ans = want === 'x' ? x : want === 'y' ? y : x + y;
  return { stem: `${mm(`${poly([[a, 'x'], [b, 'y']])} = ${p}`)}<br>${mm(`${poly([[c, 'x'], [e, 'y']])} = ${q}`)}<br>If ${mm('(x, y)')} is the solution to the system of equations above, what is the value of ${mm(want)}?`, ans, wrong: near(ans, [want === 'x' ? y : x, x - y, ans + 3]),
    x: `Solving the system (by elimination or substitution) gives ${mm(`x = ${x}`)} and ${mm(`y = ${y}`)}${want === 'x + y' ? `, so ${mm(`x + y = ${x + y}`)}` : ''}. Check: ${mm(`${a}(${x}) + ${b}(${y}) = ${p}`)}.` };
});
G('sys', [3], (r) => {
  const a = ri(r, 2, 6), b = ri(r, 2, 7), m = ri(r, 2, 4), c1 = ri(r, 3, 20), c2 = m * c1 + ri(r, 1, 9);
  return { spr: true, stem: `${mm(`${a}x + ${b}y = ${c1}`)}<br>${mm(`kx + ${m * b}y = ${c2}`)}<br>In the system above, ${mm('k')} is a constant. For what value of ${mm('k')} does the system have no solution?`, ans: m * a,
    x: `No solution means parallel lines: the coefficients must be proportional but the constants not. The ${mm('y')}-coefficient is multiplied by ${m}, so ${mm(`k = ${m} \\cdot ${a} = ${m * a}`)} (and ${mm(`${m} \\cdot ${c1} \\ne ${c2}`)}).` };
});
G('sys-word', [1, 2, 3], (r, d) => {
  const pa = ri(r, 8, 20), pc = ri(r, 3, pa - 2), A = ri(r, 20, 90), C = ri(r, 20, 90), N = A + C, T = pa * A + pc * C;
  const ctx = pick([['adult tickets', 'child tickets', 'A theater sold'], ['large pizzas', 'small pizzas', 'A pizzeria sold'], ['hardcover books', 'paperback books', 'A bookstore sold']], r);
  if (d === 1) return { stem: `${ctx[2]} ${N} items, all ${ctx[0]} or ${ctx[1]}. ${ctx[0][0].toUpperCase() + ctx[0].slice(1)} cost ${money(pa)} each and ${ctx[1]} cost ${money(pc)} each. Which system of equations can be used to find the number of ${ctx[0]}, ${mm('a')}, and ${ctx[1]}, ${mm('c')}, if the total revenue was ${money(T)}?`,
    ans: `${mm(`a + c = ${N}`)} and ${mm(`${pa}a + ${pc}c = ${T}`)}`, wrong: [`${mm(`a + c = ${T}`)} and ${mm(`${pa}a + ${pc}c = ${N}`)}`, `${mm(`${pa}a + ${pc}c = ${N}`)} and ${mm(`a - c = ${T}`)}`, `${mm(`a + c = ${N}`)} and ${mm(`${pc}a + ${pa}c = ${T}`)}`], x: 'One equation counts the items (a + c), the other adds up the money (price × count for each kind).' };
  return { spr: true, stem: `${ctx[2]} ${N} items, all ${ctx[0]} or ${ctx[1]}, for a total of ${money(T)}. ${ctx[0][0].toUpperCase() + ctx[0].slice(1)} cost ${money(pa)} each and ${ctx[1]} cost ${money(pc)} each. How many ${ctx[0]} were sold?`, ans: A,
    x: `${mm(`a + c = ${N}`)} and ${mm(`${pa}a + ${pc}c = ${T}`)}. Multiply the first by ${pc} and subtract: ${mm(`${pa - pc}a = ${T - pc * N}`)}, so ${mm(`a = ${A}`)}.` };
});
G('ineq', [1, 2], (r, d) => {
  const B = ri(r, 6, 20) * 10, f = ri(r, 2, 9) * 5, p = ri(r, 3, 12), n = Math.floor((B - f) / p);
  if (d === 1 || (B - f) % p === 0) return { spr: true, stem: `Maya has at most ${money(B)} to spend at a fair. Entry costs ${money(f)}, and each ride costs ${money(p)}. What is the greatest number of rides she can take?`, ans: n, x: `${mm(`${f} + ${p}r \\le ${B}`)} gives ${mm(`r \\le ${nice((B - f) / p)}`)}. Rides come in whole numbers, so round down: ${n}.` };
  const a = nz(r, -6, -2), b = ri(r, -9, 9), x0 = ri(r, -5, 6), c = a * x0 + b;
  return { stem: `Which of the following is the solution set of ${mm(`${a}x${signed(b)} < ${c}`)}?`, ans: mm(`x > ${x0}`), wrong: [mm(`x < ${x0}`), mm(`x > ${x0 ? -x0 : 2}`), mm(`x < ${x0 ? -x0 : 2}`), mm(`x > ${x0 + 3}`)], x: `Subtract ${b}: ${mm(`${a}x < ${c - b}`)}. Dividing by the negative ${a} flips the sign: ${mm(`x > ${x0}`)}.` };
});
G('ineq', [3], (r) => {
  const w1 = ri(r, 2, 5), w2 = ri(r, 6, 12), cap = ri(r, 30, 60) * 5, small = ri(r, 4, 15);
  const n = Math.floor((cap - w1 * small) / w2);
  return { spr: true, stem: `An elevator can carry at most ${cap} kilograms. A worker loads ${small} boxes weighing ${w1} kilograms each, then adds crates weighing ${w2} kilograms each. What is the maximum number of crates the worker can add?`, ans: n,
    x: `${mm(`${w1}(${small}) + ${w2}c \\le ${cap}`)} → ${mm(`${w2}c \\le ${cap - w1 * small}`)} → ${mm(`c \\le ${nice((cap - w1 * small) / w2)}`)}. The greatest whole number is ${n}.` };
});
G('sys-graph', [1, 2, 3], (r, d) => {
  const m = nz(r, -3, 3), b = ri(r, -4, 4), k = ri(r, -3, 4);
  const ok = ([x, y]) => y > m * x + b && y < k + (d === 3 ? -x : 0) + 6;
  const cands = [];
  for (let i = 0; cands.length < 40 && i < 400; i++) cands.push([ri(r, -6, 6), ri(r, -8, 12)]);
  const good = cands.find(ok), bads = cands.filter(p => !ok(p));
  if (!good || bads.length < 3) return GENS.find(g => g.id === 'lin-eq.1').make(r, 1);
  const pt = p => mm(`(${p[0]}, ${p[1]})`), uniq = [...new Set(bads.map(pt))].filter(s => s !== pt(good));
  return { stem: `${mm(`y > ${poly([[m, 'x'], [b, '']])}`)}<br>${mm(`y < ${d === 3 ? poly([[-1, 'x'], [k + 6, '']]) : k + 6}`)}<br>Which point ${mm('(x, y)')} is a solution to the system of inequalities above?`, ans: pt(good), wrong: uniq.slice(0, 3),
    x: `Test each point in BOTH inequalities. For ${pt(good)}: ${mm(`${good[1]} > ${m * good[0] + b}`)} and ${mm(`${good[1]} < ${d === 3 ? -good[0] + k + 6 : k + 6}`)} — both true. Each other point fails at least one.` };
});

/* ═════════════ PROBLEM SOLVING & DATA ANALYSIS ═════════════ */
G('ratio', [1, 2, 3], (r, d) => {
  if (d === 1) { const a = ri(r, 2, 6), b = ri(r, 3, 9), k = ri(r, 2, 8); return { spr: true, stem: `A recipe uses ${a} cups of flour for every ${b} cups of milk. How many cups of flour are needed with ${b * k} cups of milk?`, ans: a * k, x: `${mm(`\\frac{${a}}{${b}} = \\frac{f}{${b * k}}`)}, so ${mm(`f = ${a * k}`)}.` }; }
  if (d === 2) { const a = ri(r, 2, 7), b = ri(r, 2, 9), k = ri(r, 3, 12), N = (a + b) * k; return { stem: `The ratio of red marbles to blue marbles in a bag is ${a} to ${b}. If the bag holds ${N} marbles, all red or blue, how many are red?`, ans: a * k, wrong: near(a * k, [b * k, Math.round(N * a / b), N - a]), x: `${a} + ${b} = ${a + b} parts, each part = ${N} ÷ ${a + b} = ${k}. Red = ${a} × ${k} = ${a * k}.` }; }
  const t1 = pick([2, 3, 4, 6], r), t2 = pick([3, 4, 6, 12], r); if (t1 === t2) return GENS.find(g => g.id === 'ratio.1').make(r, 2);
  return { stem: `Pipe A fills a tank in ${t1} hours, and pipe B fills it in ${t2} hours. Working together, how many hours do they take to fill the tank?`, ans: mm(fracM(t1 * t2, t1 + t2)), wrong: [mm(String((t1 + t2) / 2)), mm(String(t1 + t2)), mm(fracM(t1 + t2, t1 * t2))].filter((v, i, a) => a.indexOf(v) === i), x: `Rates add: ${mm(`\\frac{1}{${t1}} + \\frac{1}{${t2}} = \\frac{${t1 + t2}}{${t1 * t2}}`)} tank per hour, so time = ${mm(fracM(t1 * t2, t1 + t2))} hours.` };
});
G('units', [1, 2, 3], (r, d) => {
  if (d === 1) { const v = ri(r, 2, 15) * 18; return { spr: true, stem: `A train travels at ${v} kilometers per hour. What is its speed in meters per second? (1 km = 1,000 m)`, ans: v / 3.6, x: `${mm(`${v} \\times \\frac{1000}{3600} = ${nice(v / 3.6)}`)} m/s.` }; }
  if (d === 2) { const c = ri(r, 3, 9), gal = ri(r, 12, 40), mpg = ri(r, 20, 40); return { stem: `A car travels ${mpg} miles per gallon of gas, and gas costs ${money(c / 2)} per gallon. What is the cost of gas, in dollars, to drive ${mpg * gal} miles?`, ans: money(gal * c / 2), wrong: [money(gal * c), money(mpg * c / 2), money(gal * c / 4), money(gal * c / 2 + mpg), money(mpg * gal * c / 2)], x: `${mpg * gal} ÷ ${mpg} = ${gal} gallons; ${gal} × ${money(c / 2)} = ${money(gal * c / 2)}.` }; }
  const a = ri(r, 2, 9), b = ri(r, 2, 6);
  return { spr: true, stem: `A rectangular rug measures ${a} feet by ${b} feet. What is its area in square inches? (1 foot = 12 inches)`, ans: a * b * 144, x: `${a * 12} in × ${b * 12} in = ${a * b * 144} in². (Area converts by ${mm('12^2 = 144')}, not by 12.)` };
});
G('percent', [1, 2, 3], (r, d) => {
  if (d === 1) { const p = pick([5, 12, 15, 20, 25, 30, 40, 35, 60, 75], r), x = ri(r, 2, 30) * 20; return { spr: true, stem: `What is ${p}% of ${x}?`, ans: p * x / 100, x: `${mm(`0.${String(p).padStart(2, '0')} \\times ${x} = ${nice(p * x / 100)}`)}.` }; }
  if (d === 2) { const old = ri(r, 4, 20) * 10, p = pick([10, 15, 20, 25, 30, 40], r) * pick([1, -1], r), nw = old * (1 + p / 100); return { stem: `The price of a jacket changed from ${money(old)} to ${money(nw)}. By what percent did the price change?`, ans: `${p > 0 ? 'Increased' : 'Decreased'} by ${Math.abs(p)}%`, wrong: [`${p > 0 ? 'Decreased' : 'Increased'} by ${Math.abs(p)}%`, `${p > 0 ? 'Increased' : 'Decreased'} by ${Math.round(Math.abs(nw - old) / nw * 1000) / 10}%`, `${p > 0 ? 'Increased' : 'Decreased'} by ${Math.abs(nw - old)}%`, `${p > 0 ? 'Increased' : 'Decreased'} by ${Math.abs(p) + 5}%`, `${p > 0 ? 'Decreased' : 'Increased'} by ${Math.abs(p) + 5}%`], x: `Percent change = (new − old) ÷ old = ${nice(nw - old)} ÷ ${old} = ${p}%.` }; }
  const p = pick([10, 20, 25, 40], r), sale = ri(r, 4, 20) * (100 - p) / 5;
  const orig = sale / (1 - p / 100);
  return { spr: true, stem: `After a ${p}% discount, a pair of shoes costs ${money(sale)}. What was the original price, in dollars?`, ans: orig, x: `Sale = ${mm(`${nice(1 - p / 100)} \\times`)} original, so original = ${sale} ÷ ${nice(1 - p / 100)} = ${nice(orig)}. (Adding ${p}% back to ${sale} would be wrong.)` };
});
G('stats', [1, 2, 3], (r, d) => {
  const n = ri(r, 4, 6), vals = Array.from({ length: n }, () => (d === 3 ? ri(r, 60, 80) : ri(r, 50, 99)));
  if (d === 1) { const s = vals.slice().sort((a, b) => a - b), med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; return { spr: true, stem: `What is the median of the data set ${vals.join(', ')}?`, ans: med, x: `Sort: ${s.join(', ')}. ${n % 2 ? 'The middle value' : 'The average of the two middle values'} is ${nice(med)}.` }; }
  if (d === 2) { const target = ri(r, 70, 90), need = target * (n + 1) - sum(vals); if (need < 0 || need > 100) return GENS.find(g => g.id === 'stats.1').make(r, 1); return { spr: true, stem: `A student's first ${n} test scores are ${vals.join(', ')}. What score on the next test would make the mean of all ${n + 1} scores exactly ${target}?`, ans: need, x: `Needed total = ${target} × ${n + 1} = ${target * (n + 1)}. Current total = ${sum(vals)}. Next score = ${need}.` }; }
  return { stem: `A data set of ${n + 1} values consists of ${vals.join(', ')}, and ${ri(r, 200, 300)}. If the largest value is removed, which statement is true?`, ans: 'The mean decreases more than the median does.', wrong: ['The median decreases more than the mean does.', 'The mean and median both stay the same.', 'The mean increases and the median decreases.'], x: 'The removed value is an outlier far above the rest, so it pulls the mean up a lot; removing it lowers the mean sharply. The median only shifts from one middle value to a neighboring one.' };
});
G('datarep', [1, 2], (r, d) => {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], vals = labels.map(() => ri(r, 2, 18) * 5);
  const fig = barChart(labels, vals, { title: 'Books borrowed from a school library', unit: 'books' });
  if (d === 1) { const i = vals.indexOf(Math.max(...vals)); return { fig, spr: true, stem: 'According to the bar graph, how many books were borrowed on the day with the most borrowing?', ans: vals[i], x: `The tallest bar is ${labels[i]}, at ${vals[i]} books.` }; }
  let best = 1; for (let i = 2; i < 5; i++) if (vals[i] - vals[i - 1] > vals[best] - vals[best - 1]) best = i;
  if (vals[best] - vals[best - 1] <= 0) return GENS.find(g => g.id === 'datarep.1').make(r, 1);
  const pairs = [1, 2, 3, 4].map(i => `From ${labels[i - 1]} to ${labels[i]}`);
  return { fig, stem: 'Between which two consecutive days did the number of books borrowed increase the most?', ans: pairs[best - 1], wrong: pairs.filter((_, i) => i !== best - 1), x: `Compare differences between neighbors: the largest increase is ${labels[best - 1]} → ${labels[best]}, +${vals[best] - vals[best - 1]}.` };
});
G('scatter', [1, 2, 3], (r, d) => {
  const m = ri(r, 2, 6) / 2, b = ri(r, 2, 10);
  const pts = Array.from({ length: 10 }, (_, i) => { const x = i * 2 + 1; return [x, Math.max(0, Math.round((m * x + b + (r() - 0.5) * 6) * 10) / 10)]; });
  const fig = scatterPlot(pts, [m, b], { title: 'Hours studied (horizontal) and quiz score gain (points)', xl: 'Hours studied', yl: 'score gain', xmax: 20, ymax: Math.ceil((m * 20 + b + 4) / 10) * 10 });
  if (d === 1) { const x = pick([6, 10, 14], r); return { fig, spr: true, stem: `The line of best fit is ${mm(`y = ${nice(m)}x + ${b}`)}. Based on the line, what score gain is predicted for a student who studied ${x} hours?`, ans: m * x + b, x: `${mm(`y = ${nice(m)}(${x}) + ${b} = ${nice(m * x + b)}`)}.` }; }
  return { fig, stem: `The line of best fit for the data is ${mm(`y = ${nice(m)}x + ${b}`)}. Which is the best interpretation of ${nice(m)} in this context?`, ans: `For each additional hour studied, the predicted score gain increases by ${nice(m)} points.`, wrong: [`A student who studied 0 hours is predicted to gain ${nice(m)} points.`, `Every student gained exactly ${nice(m)} points per hour studied.`, `The predicted score gain increases by ${b} points per hour studied.`], x: 'The slope of the line of best fit is a predicted rate — not an exact rule for every student. The intercept (not the slope) is the prediction at 0 hours.' };
});
G('growth', [1, 2, 3], (r, d) => {
  const a = ri(r, 2, 9) * 100;
  if (d === 1) { const lin = r() < 0.5, k = ri(r, 2, 5) * 10, g = pick([2, 3], r); const rows = [0, 1, 2, 3].map(t => [t, lin ? a + k * t : a * g ** t]); return { fig: table(['Year', 'Population'], rows), stem: 'Which statement best describes how the population in the table changes?', ans: lin ? `It increases by the same amount, ${k}, each year (linear).` : `It is multiplied by the same factor, ${g}, each year (exponential).`, wrong: lin ? [`It is multiplied by the same factor each year (exponential).`, 'It decreases each year.', 'It increases by a larger amount each year (linear).'] : [`It increases by the same amount each year (linear).`, 'It decreases each year.', `It is multiplied by ${g + 1} each year (exponential).`], x: lin ? `Differences: +${k}, +${k}, +${k}. Constant differences → linear.` : `Ratios: ×${g} each year. Constant ratios → exponential.` }; }
  const p = pick([3, 4, 5, 6, 8, 10], r), t = ri(r, 2, 4);
  if (d === 2) return { stem: `A town's population is ${a.toLocaleString('en-US')} and grows by ${p}% each year. Which expression gives the population after ${mm('t')} years?`, ans: mm(`${a}(1.${String(p).padStart(2, '0')})^t`), wrong: [mm(`${a}(0.${String(p).padStart(2, '0')})^t`), mm(`${a} + ${p}t`), mm(`${a}(1.${String(p).padStart(2, '0')}t)`)], x: `Growing by ${p}% means multiplying by ${mm(`1 + 0.${String(p).padStart(2, '0')}`)} each year: ${mm(`${a}(1.${String(p).padStart(2, '0')})^t`)}.` };
  const v = a * (1 + p / 100) ** t;
  return { spr: true, stem: `A savings account starts with ${money(a)} and earns ${p}% interest compounded once a year. To the nearest dollar, what is the balance after ${t} years?`, ans: Math.round(v), x: `${mm(`${a}(1.${String(p).padStart(2, '0')})^${t} \\approx ${nice(v)}`)}, which rounds to ${Math.round(v)}.` };
});
G('prob', [1, 2, 3], (r, d) => {
  const a = ri(r, 10, 40), b = ri(r, 10, 40), c = ri(r, 10, 40), e = ri(r, 10, 40);
  const fig = table(['', 'Prefers science', 'Prefers art', 'Total'], [['Grade 9', a, b, a + b], ['Grade 10', c, e, c + e], ['Total', a + c, b + e, a + b + c + e]], 'Survey of students');
  const T = a + b + c + e;
  if (d === 1) return { fig, stem: 'If one student is chosen at random from all students surveyed, what is the probability that the student prefers art?', ans: mm(fracM(b + e, T)), wrong: [mm(fracM(b, T)), mm(fracM(b + e, a + c)), mm(fracM(a + c, T)), mm(fracM(e, T)), mm(fracM(b, b + e)), mm(fracM(b + e, T + 10))], x: `Art total ÷ everyone = ${mm(`\\frac{${b + e}}{${T}}`)}.` };
  return { fig, stem: `A student is chosen at random from those in grade 10. What is the probability that the student prefers science?`, ans: mm(fracM(c, c + e)), wrong: [mm(fracM(c, T)), mm(fracM(c, a + c)), mm(fracM(e, c + e)), mm(fracM(a, a + b)), mm(fracM(c + e, T))], x: `Only grade 10 counts: ${c} of ${c + e} students, so ${mm(`\\frac{${c}}{${c + e}}`)}.` };
});
G('infer-data', [1, 2, 3], (r, d) => {
  const n = pick([50, 80, 100, 200, 250], r), k = ri(r, 5, n / 2), N = pick([1200, 2000, 3000, 4500, 5000], r);
  if (d < 3) return { spr: true, stem: `In a random sample of ${n} students at a school of ${N.toLocaleString('en-US')}, ${k} said they bike to school. Based on the sample, about how many students at the school bike to school?`, ans: N * k / n, x: `Sample proportion ${mm(`\\frac{${k}}{${n}}`)} × ${N} = ${nice(N * k / n)}.` };
  const p = ri(r, 30, 70), moe = pick([3, 4, 5], r);
  return { stem: `A random sample of likely voters found that ${p}% support a new park, with a margin of error of ${moe} percentage points. Which conclusion is most appropriate?`, ans: `The percent of all likely voters who support the park is plausibly between ${p - moe}% and ${p + moe}%.`, wrong: [`Exactly ${p}% of all likely voters support the park.`, `Between ${p - moe}% and ${p + moe}% of the people in the sample support the park.`, `The percent of all residents, including those who do not vote, who support the park is between ${p - moe}% and ${p + moe}%.`], x: 'The margin of error gives a plausible range for the whole population that was sampled (likely voters) — not an exact value, and not people outside that population.' };
});
G('claims', [1, 2, 3], (r, d) => {
  const [who, trt, out] = pick([['volunteers from a running club', 'a new stretching routine', 'fewer injuries'], ['students at one high school', 'a vocabulary app', 'higher reading scores'], ['customers of a pharmacy', 'a vitamin supplement', 'fewer colds']], r);
  if (d === 1) return { stem: `Researchers randomly assigned ${who} to use ${trt} or not. The group using ${trt} had significantly ${out}. Which conclusion is best supported?`, ans: `${trt[0].toUpperCase() + trt.slice(1)} likely caused ${out} among people like the participants.`, wrong: [`${trt[0].toUpperCase() + trt.slice(1)} would cause ${out} for everyone in the country.`, 'No conclusion about cause can be made because the groups were assigned at random.', `${trt[0].toUpperCase() + trt.slice(1)} had no effect.`], x: 'Random assignment supports cause and effect, but the participants were not a random sample of everyone, so the result applies only to people like them.' };
  return { stem: `Researchers surveyed ${who}. Those who chose to use ${trt} reported ${out} than those who did not. Which conclusion is best supported?`, ans: `Among ${who}, using ${trt} is associated with ${out}, but cause cannot be concluded.`, wrong: [`${trt[0].toUpperCase() + trt.slice(1)} causes ${out}.`, `${trt[0].toUpperCase() + trt.slice(1)} causes ${out} for all people.`, `There is no relationship between ${trt} and the outcome.`], x: 'People chose whether to use it (no random assignment), so other differences between them could explain the result: only an association is supported.' };
});

/* ═════════════ ADVANCED MATH ═════════════ */
G('factor', [1, 2, 3], (r, d) => {
  if (d === 3) { const a = ri(r, 2, 9); return { stem: `Which expression is equivalent to ${mm(`x^4 - ${a * a * a * a}`)}?`, ans: mm(`(x^2 + ${a * a})(x + ${a})(x - ${a})`), wrong: [mm(`(x^2 - ${a * a})^2`), mm(`(x + ${a})^2(x - ${a})^2`), mm(`(x^2 + ${a * a})(x - ${a})^2`)], x: `Difference of squares twice: ${mm(`(x^2)^2 - (${a * a})^2 = (x^2 + ${a * a})(x^2 - ${a * a}) = (x^2 + ${a * a})(x + ${a})(x - ${a})`)}.` }; }
  const p = nz(r, -9, 9), q = nz(r, -9, 9), k = d === 2 ? ri(r, 2, 4) : 1;
  const f = v => (v < 0 ? `- ${-v}` : `+ ${v}`), b = k * (p + q), c = k * p * q, pre = k > 1 ? k : '';
  return { stem: `Which expression is equivalent to ${mm(poly([[k, 'x^2'], [b, 'x'], [c, '']]))}?`, ans: mm(`${pre}(x ${f(p)})(x ${f(q)})`), wrong: [mm(`${pre}(x ${f(-p)})(x ${f(-q)})`), mm(`${pre}(x ${f(p)})(x ${f(-q)})`), mm(`${pre}(x ${f(p + q)})(x ${f(p * q === p + q ? p * q + 1 : p * q)})`)].filter((v, i, a) => a.indexOf(v) === i && v !== mm(`${pre}(x ${f(p)})(x ${f(q)})`)).concat([mm(`${pre}(x ${f(-p)})(x ${f(q)})`)]),
    x: `${k > 1 ? `Factor out ${k}: ${mm(`${k}(${poly([[1, 'x^2'], [p + q, 'x'], [p * q, '']])})`)}. ` : ''}Find two numbers with product ${p * q} and sum ${p + q}: ${p} and ${q}.` };
});
G('radicals', [1, 2, 3], (r, d) => {
  if (d === 1) { const a = ri(r, 2, 7), b = ri(r, 2, 7); return { stem: `Which expression is equivalent to ${mm(`x^${a} \\cdot x^${b}`)}, for ${mm('x > 0')}?`, ans: mm(`x^${a + b}`), wrong: [mm(`x^${a * b}`), mm(`x^${Math.abs(a - b) || a + b + 1}`), mm(`2x^${a + b}`), mm(`x^${a + b + 1}`), mm(`x^${a + b - 1}`)], x: `Multiplying powers with the same base adds exponents: ${mm(`x^{${a} + ${b}} = x^${a + b}`)}.` }; }
  if (d === 2) { const [base, root] = pick([[8, 3], [27, 3], [16, 4], [4, 2], [9, 2], [32, 5], [25, 2]], r), pw = ri(r, 2, 3), val = Math.round(base ** (1 / root)) ** pw; return { spr: true, stem: `What is the value of ${mm(`${base}^{${pw}/${root}}`)}?`, ans: val, x: `${mm(`${base}^{1/${root}} = ${Math.round(base ** (1 / root))}`)} (the ${root === 2 ? 'square' : root === 3 ? 'cube' : root + 'th'} root), then raise to the ${pw === 2 ? 'second' : 'third'} power: ${val}.` }; }
  const a = ri(r, 2, 5), b = ri(r, 2, 4);
  return { stem: `For ${mm('x > 0')}, which expression is equivalent to ${mm(`\\frac{x^{${a}/${b}}}{x^{-1}}`)}?`, ans: mm(`x^{${fracStr(a + b, b)}}`), wrong: [mm(`x^{${fracStr(a - b, b)}}`), mm(`x^{${fracStr(-a, b)}}`), mm(`x^{${fracStr(a + 1, b + 1)}}`), mm(`x^{${fracStr(a, b + 1)}}`), mm(`x^{${fracStr(a * 2, b)}}`)], x: `Dividing subtracts exponents: ${mm(`\\frac{${a}}{${b}} - (-1) = \\frac{${a + b}}{${b}}`)}.` };
});
G('polyops', [1, 2, 3], (r, d) => {
  const [a, b, c, e, f, g] = [nz(r, 1, 7), nz(r, -9, 9), nz(r, -9, 9), nz(r, 1, 6), nz(r, -9, 9), nz(r, -9, 9)];
  if (d < 3) { const A = mm(poly([[a - e, 'x^2'], [b - f, 'x'], [c - g, '']])); return { stem: `Which expression is equivalent to ${mm(`(${poly([[a, 'x^2'], [b, 'x'], [c, '']])}) - (${poly([[e, 'x^2'], [f, 'x'], [g, '']])})`)}?`, ans: A, wrong: [mm(poly([[a - e, 'x^2'], [b + f, 'x'], [c + g, '']])), mm(poly([[a + e, 'x^2'], [b + f, 'x'], [c + g, '']])), mm(poly([[a - e, 'x^2'], [b - f, 'x'], [c + g, '']])), mm(poly([[a - e, 'x^2'], [b + f, 'x'], [c - g, '']]))].filter((v, i, x) => x.indexOf(v) === i && v !== A), x: `Distribute the minus sign to every term, then combine: ${A}.` }; }
  const p = nz(r, -6, 6), q = nz(r, -6, 6), s = nz(r, 2, 4);
  return { spr: true, stem: `The expression ${mm(`(${s}x ${p < 0 ? '-' : '+'} ${Math.abs(p)})(x ${q < 0 ? '-' : '+'} ${Math.abs(q)})`)} can be written as ${mm('ax^2 + bx + c')}. What is the value of ${mm('b')}?`, ans: s * q + p, x: `Outer + inner: ${mm(`${s}x \\cdot ${q} + ${p} \\cdot x = ${s * q + p}x`)}, so ${mm(`b = ${s * q + p}`)}.` };
});
G('rational', [1, 2, 3], (r, d) => {
  const a = pick([2, 4, 5, 6, 7, 8, 9], r);
  if (d === 1) return { stem: `Which expression is equivalent to ${mm(`\\frac{x^2 - ${a * a}}{x - ${a}}`)}, for ${mm(`x \\ne ${a}`)}?`, ans: mm(`x + ${a}`), wrong: [mm(`x - ${a}`), mm(`x^2 - ${a}`), mm(`x + ${a * a}`)], x: `${mm(`x^2 - ${a * a} = (x - ${a})(x + ${a})`)}; cancel ${mm(`(x - ${a})`)}.` };
  if (d === 2) return { stem: `Which expression is equivalent to ${mm(`\\frac{3}{x} + \\frac{${a}}{x + 1}`)}?`, ans: mm(`\\frac{${a + 3}x + 3}{x(x + 1)}`), wrong: [mm(`\\frac{${a + 3}}{2x + 1}`), mm(`\\frac{${a + 3}}{x(x + 1)}`), mm(`\\frac{${a + 3}x + ${a}}{x(x + 1)}`), mm(`\\frac{${a + 3}x + 3}{2x + 1}`)], x: `Common denominator ${mm('x(x + 1)')}: ${mm(`\\frac{3(x + 1) + ${a}x}{x(x + 1)} = \\frac{${a + 3}x + 3}{x(x + 1)}`)}.` };
  const b = ri(r, 1, 6);
  return { spr: true, stem: `If ${mm(`\\frac{${a}}{x - ${b}} = \\frac{${a * 2}}{x + ${b + 4}}`)}, what is the value of ${mm('x')}?`, ans: 3 * b + 4, x: `Cross-multiply: ${mm(`${a}(x + ${b + 4}) = ${2 * a}(x - ${b})`)} → ${mm(`x + ${b + 4} = 2x - ${2 * b}`)} → ${mm(`x = ${3 * b + 4}`)}.` };
});
G('nonlin-fn', [1, 2, 3], (r, d) => {
  const a = nz(r, -3, 4), b = nz(r, -6, 6), c = ri(r, -9, 9), k = nz(r, -4, 4), f = x => a * x * x + b * x + c;
  if (d < 3) return { spr: true, stem: `The function ${mm('f')} is defined by ${mm(`f(x) = ${poly([[a, 'x^2'], [b, 'x'], [c, '']])}`)}. What is the value of ${mm(`f(${k})`)}?`, ans: f(k), x: `${mm(`${a}(${k})^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}(${k})${signed(c)} = ${a * k * k}${signed(b * k)}${signed(c)} = ${f(k)}`)}.` };
  const m = nz(r, -4, 4), n = ri(r, -5, 5), g = x => m * x + n, z = ri(r, -3, 3);
  return { spr: true, stem: `${mm(`f(x) = ${poly([[a, 'x^2'], [b, 'x'], [c, '']])}`)} and ${mm(`g(x) = ${poly([[m, 'x'], [n, '']])}`)}. What is the value of ${mm(`f(g(${z}))`)}?`, ans: f(g(z)), x: `Inside first: ${mm(`g(${z}) = ${g(z)}`)}. Then ${mm(`f(${g(z)}) = ${f(g(z))}`)}.` };
});
G('isolate', [1, 2, 3], (r, d) => {
  const forms = [
    { eq: 'A = \\frac{1}{2}bh', v: 'h', ans: 'h = \\frac{2A}{b}', wr: ['h = \\frac{A}{2b}', 'h = 2Ab', 'h = \\frac{b}{2A}'], why: 'Multiply both sides by 2, then divide by b.' },
    { eq: 'v = u + at', v: 't', ans: 't = \\frac{v - u}{a}', wr: ['t = \\frac{v + u}{a}', 't = \\frac{v}{a} - u', 't = a(v - u)'], why: 'Subtract u, then divide by a.' },
    { eq: 'P = 2l + 2w', v: 'w', ans: 'w = \\frac{P - 2l}{2}', wr: ['w = P - l', 'w = \\frac{P}{2} - 2l', 'w = \\frac{P + 2l}{2}'], why: 'Subtract 2l, then divide by 2.' },
    { eq: 'F = \\frac{9}{5}C + 32', v: 'C', ans: 'C = \\frac{5}{9}(F - 32)', wr: ['C = \\frac{9}{5}(F - 32)', 'C = \\frac{5}{9}F - 32', 'C = \\frac{5}{9}(F + 32)'], why: 'Subtract 32, then multiply by 5/9.' },
    { eq: 'V = \\pi r^2 h', v: 'r', ans: 'r = \\sqrt{\\frac{V}{\\pi h}}', wr: ['r = \\frac{V}{\\pi h}', 'r = \\sqrt{V \\pi h}', 'r = \\frac{\\sqrt{V}}{\\pi h}'], why: 'Divide by πh, then take the square root.' },
    { eq: 'E = \\frac{1}{2}mv^2', v: 'v', ans: 'v = \\sqrt{\\frac{2E}{m}}', wr: ['v = \\frac{2E}{m}', 'v = \\sqrt{\\frac{E}{2m}}', 'v = 2\\sqrt{Em}'], why: 'Multiply by 2, divide by m, then take the square root.' },
  ];
  const f = forms[d === 1 ? ri(r, 0, 2) : d === 2 ? ri(r, 1, 3) : ri(r, 4, 5)];
  return { stem: `The formula ${mm(f.eq)} is used in physics and geometry. Which equation correctly expresses ${mm(f.v)} in terms of the other variables?`, ans: mm(f.ans), wrong: f.wr.map(mm), x: f.why + ` Result: ${mm(f.ans)}.` };
});
G('quad', [1, 2], (r, d) => {
  const p = ri(r, 1, 9), q = nz(r, -9, -1);
  if (d === 1) return { spr: true, stem: `What is the positive solution to ${mm(poly([[1, 'x^2'], [-(p + q), 'x'], [p * q, '']]) + ' = 0')}?`, ans: p, x: `Factor: ${mm(`(x - ${p})(x + ${-q}) = 0`)}, so ${mm(`x = ${p}`)} or ${mm(`x = ${q}`)}. The positive solution is ${p}.` };
  const a = ri(r, 2, 5), b = nz(r, -12, 12), c = -ri(r, 1, 12);
  return { stem: `What is the sum of the solutions to ${mm(`${a}x^2${signed(b)}x${signed(c)} = 0`)}?`, ans: mm(fracM(-b, a)), wrong: [mm(fracM(b, a)), mm(fracM(c, a)), mm(fracM(-c, a)), mm(String(-b)), mm(fracM(-b, 2 * a)), mm(fracM(b, 2 * a))], x: `For ${mm('ax^2 + bx + c = 0')}, the sum of the solutions is ${mm('-\\frac{b}{a}')} = ${mm(fracM(-b, a))}.` };
});
G('quad', [3], (r) => {
  const b = ri(r, 2, 12) * 2, sh = pick([0, 0, 5, -7, 3], r), c = (b / 2) ** 2 + sh, disc = b * b - 4 * c;
  const n = disc > 0 ? 2 : disc === 0 ? 1 : 0;
  const lbl = ['Zero', 'Exactly one', 'Exactly two', 'Infinitely many'];
  return { stem: `How many distinct real solutions does ${mm(`x^2 - ${b}x + ${c} = 0`)} have?`, ans: lbl[n], wrong: lbl.filter((_, i) => i !== n), x: `Discriminant ${mm(`b^2 - 4ac = ${b * b} - ${4 * c} = ${disc}`)}: ${disc > 0 ? 'positive → two solutions' : disc === 0 ? 'zero → exactly one solution' : 'negative → no real solutions'}.` };
});
G('linquad', [1, 2, 3], (r, d) => {
  const p = ri(r, -4, 6), q = p + ri(r, 1, 6), m = ri(r, -3, 3), n = ri(r, -6, 6);
  const B = -(p + q) + m, C = p * q + n;
  const eqQ = poly([[1, 'x^2'], [B, 'x'], [C, '']]), eqL = poly([[m, 'x'], [n, '']]);
  return { spr: true, stem: `${mm(`y = ${eqQ}`)}<br>${mm(`y = ${eqL}`)}<br>The graphs of the equations intersect at two points. What is the greatest ${mm(d === 3 ? 'y' : 'x')}-coordinate of an intersection point?${d === 3 ? ' (Give the y-coordinate at the intersection with the greater x-coordinate.)' : ''}`, ans: d === 3 ? m * q + n : q,
    x: `Set equal: ${mm(`${eqQ} = ${eqL}`)} → ${mm(poly([[1, 'x^2'], [-(p + q), 'x'], [p * q, '']]) + ' = 0')} → ${mm(`x = ${p}`)} or ${mm(`x = ${q}`)}.${d === 3 ? ` At ${mm(`x = ${q}`)}, ${mm(`y = ${m * q + n}`)}.` : ''}` };
});
G('radeq', [1, 2, 3], (r, d) => {
  if (d === 1) { const b = ri(r, 2, 9), a = ri(r, -10, 10); return { spr: true, stem: `What value of ${mm('x')} satisfies ${mm(`\\sqrt{x${signed(a)}} = ${b}`)}?`, ans: b * b - a, x: `Square both sides: ${mm(`x${signed(a)} = ${b * b}`)}, so ${mm(`x = ${b * b - a}`)}.` }; }
  if (d === 2) { const a = ri(r, -6, 8), b = ri(r, 2, 9); return { spr: true, stem: `What is the sum of all solutions to ${mm(`|x - ${a}| = ${b}`)}?`, ans: 2 * a, x: `${mm(`x - ${a} = ${b}`)} or ${mm(`x - ${a} = -${b}`)}: ${mm(`x = ${a + b}`)} or ${mm(`x = ${a - b}`)}. Sum = ${2 * a}.` }; }
  const s = ri(r, 3, 9), t = ri(r, 1, s - 2);
  /* √(x + c) = x − t is built so that x = s works and the other root of the squared equation is extraneous */
  const c = (s - t) ** 2 - s, x2 = (2 * t + 1) - s;
  return { spr: true, stem: `What is the solution to ${mm(`\\sqrt{x${signed(c)}} = x - ${t}`)}?`, ans: s, x: `Square: ${mm(`x${signed(c)} = x^2 - ${2 * t}x + ${t * t}`)}, giving ${mm(`x = ${s}`)} or ${mm(`x = ${x2}`)}. Check: ${mm(`x = ${x2}`)} makes the right side ${x2 - t} < 0, so it is extraneous. Answer: ${s}.` };
});
G('qe-word', [1, 2, 3], (r, d) => {
  const a = ri(r, 2, 9) * 100, k = pick([75, 80, 85, 90, 95], r);
  if (d === 1) return { stem: `The value, in dollars, of a laptop ${mm('t')} years after purchase is ${mm(`V = ${a * 2}(0.${k})^t`)}. What is the best interpretation of 0.${k}?`, ans: `The value decreases by ${100 - k}% each year.`, wrong: [`The value decreases by ${k}% each year.`, `The value decreases by $${k} each year.`, `The value increases by ${k}% each year.`], x: `A factor of 0.${k} keeps ${k}% each year, so ${100 - k}% is lost each year.` };
  if (d === 2) { const g = pick([2, 3], r), h = pick([3, 4, 5, 6], r), t = h * ri(r, 2, 3); return { spr: true, stem: `A bacteria culture starts with ${a} cells and ${g === 2 ? 'doubles' : 'triples'} every ${h} hours. How many cells are present after ${t} hours?`, ans: a * g ** (t / h), x: `${t} ÷ ${h} = ${t / h} periods; ${mm(`${a} \\cdot ${g}^${t / h} = ${a * g ** (t / h)}`)}.` }; }
  const v = pick([32, 48, 64, 80, 96], r), h0 = ri(r, 0, 10) * 5;
  return { spr: true, stem: `A ball is thrown upward. Its height, in feet, after ${mm('t')} seconds is ${mm(`h(t) = -16t^2 + ${v}t + ${h0}`)}. What is the maximum height of the ball, in feet?`, ans: -16 * (v / 32) ** 2 + v * (v / 32) + h0, x: `The maximum is at ${mm(`t = -\\frac{b}{2a} = \\frac{${v}}{32} = ${v / 32}`)}. ${mm(`h(${v / 32}) = ${-16 * (v / 32) ** 2 + v * (v / 32) + h0}`)}.` };
});
G('quad-graph', [1, 2, 3], (r, d) => {
  const h = nz(r, -6, 6), k = nz(r, -9, 9), a = nz(r, -3, 3);
  if (d === 1) return { stem: `What is the vertex of the graph of ${mm(`y = ${a === 1 ? '' : a === -1 ? '-' : a}(x ${h < 0 ? '+' : '-'} ${Math.abs(h)})^2${signed(k)}`)}?`, ans: mm(`(${h}, ${k})`), wrong: [mm(`(${-h}, ${k})`), mm(`(${h}, ${-k})`), mm(`(${-h}, ${-k})`)], x: `Vertex form ${mm('a(x - h)^2 + k')} has vertex ${mm('(h, k)')}. Here ${mm(`h = ${h}`)}, ${mm(`k = ${k}`)}.` };
  const p = ri(r, -8, 4), q = p + 2 * ri(r, 1, 5);
  if (d === 2) return { spr: true, stem: `The graph of ${mm(`y = ${poly([[a, 'x^2'], [-a * (p + q), 'x'], [a * p * q, '']])}`)} crosses the ${mm('x')}-axis twice. What is the ${mm('x')}-coordinate of its vertex?`, ans: (p + q) / 2, x: `The vertex is halfway between the roots. Roots: ${p} and ${q}, so ${mm(`x = ${(p + q) / 2}`)}. (Or ${mm('-\\frac{b}{2a}')}.)` };
  return { spr: true, stem: `The function ${mm(`f(x) = ${poly([[a, 'x^2'], [-2 * a * h, 'x'], [a * h * h + k, '']])}`)} has ${a > 0 ? 'a minimum' : 'a maximum'} value. What is that value?`, ans: k, x: `Vertex x-coordinate ${mm(`-\\frac{b}{2a} = ${h}`)}. ${mm(`f(${h}) = ${k}`)}.` };
});
G('exp-graph', [1, 2, 3], (r, d) => {
  const a = ri(r, 2, 12), b = pick([2, 3, 4, 0.5], r);
  if (d === 1) return { spr: true, stem: `What is the ${mm('y')}-intercept of the graph of ${mm(`y = ${a}(${b})^x`)}? Give the ${mm('y')}-coordinate.`, ans: a, x: `At ${mm('x = 0')}, ${mm(`${b}^0 = 1`)}, so ${mm(`y = ${a}`)}.` };
  if (d === 2) { const x = ri(r, 2, 4); return { spr: true, stem: `For ${mm(`f(x) = ${a}(${b})^x`)}, what is ${mm(`f(${x})`)}?`, ans: a * b ** x, x: `${mm(`${a} \\cdot ${b}^${x} = ${nice(a * b ** x)}`)}.` }; }
  const k = ri(r, 1, 9);
  return { stem: `Which statement is true about the graph of ${mm(`y = ${a}(${b})^x + ${k}`)}?`, ans: b > 1 ? `It increases as ${mm('x')} increases and approaches ${mm(`y = ${k}`)} as ${mm('x')} decreases.` : `It decreases as ${mm('x')} increases and approaches ${mm(`y = ${k}`)} as ${mm('x')} increases.`,
    wrong: b > 1 ? [`It decreases as ${mm('x')} increases.`, `It approaches ${mm(`y = ${a}`)} as ${mm('x')} decreases.`, `It crosses the ${mm('x')}-axis at ${mm(`x = ${k}`)}.`] : [`It increases as ${mm('x')} increases.`, `It approaches ${mm(`y = ${a}`)} as ${mm('x')} increases.`, `It crosses the ${mm('x')}-axis at ${mm(`x = ${k}`)}.`],
    x: `Base ${b} ${b > 1 ? '> 1 means growth' : '< 1 means decay'}; the added ${k} shifts the horizontal asymptote to ${mm(`y = ${k}`)}.` };
});
G('poly-graph', [1, 2, 3], (r, d) => {
  const [p, q, s] = shuffle([ri(r, -6, -1), ri(r, 1, 6), ri(r, 7, 9) * pick([1, -1], r)], r);
  const f = v => (v < 0 ? `(x + ${-v})` : `(x - ${v})`);
  if (d < 3) return { stem: `The function ${mm('p')} is defined by ${mm(`p(x) = ${f(p)}${f(q)}${f(s)}`)}. At which ${mm('x')}-values does the graph of ${mm('p')} cross the ${mm('x')}-axis?`, ans: [p, q, s].sort((a, b) => a - b).join(', '), wrong: [[-p, -q, -s], [p, q], [-p, q, -s], [p, -q, s], [-p, -q, s], [q, s]].map(z => z.sort((a, b) => a - b).join(', ')), x: `Each factor ${mm('(x - a)')} gives a zero at ${mm('x = a')} — watch the sign flip.` };
  const a = ri(r, 1, 4), c = ri(r, -9, 9), val = a * a * a - 2 * a * a + c;
  return { spr: true, stem: `When ${mm(`p(x) = x^3 - 2x^2${signed(c)}`)} is divided by ${mm(`x - ${a}`)}, what is the remainder?`, ans: val, x: `Remainder theorem: the remainder is ${mm(`p(${a}) = ${a ** 3} - ${2 * a * a}${signed(c)} = ${val}`)}.` };
});

/* ═════════════ GEOMETRY & TRIGONOMETRY ═════════════ */
G('area', [1, 2, 3], (r, d) => {
  if (d === 1) { const b = ri(r, 3, 20), h = ri(r, 2, 15) * 2; return { spr: true, stem: `A triangle has a base of ${b} centimeters and a height of ${h} centimeters. What is its area, in square centimeters?`, ans: b * h / 2, x: `${mm(`\\frac{1}{2} \\cdot ${b} \\cdot ${h} = ${b * h / 2}`)}.` }; }
  if (d === 2) { const rr = ri(r, 2, 9), h = ri(r, 2, 12); return { stem: `A cylinder has a radius of ${rr} inches and a height of ${h} inches. What is its volume, in cubic inches?`, ans: mm(`${rr * rr * h}\\pi`), wrong: [mm(`${2 * rr * h}\\pi`), mm(`${rr * h}\\pi`), mm(`${4 * rr * rr * h}\\pi`), mm(`${2 * rr * rr * h}\\pi`), mm(`${rr * rr * h}`)], x: `${mm(`V = \\pi r^2 h = \\pi(${rr})^2(${h}) = ${rr * rr * h}\\pi`)}.` }; }
  const k = ri(r, 2, 4), v = ri(r, 3, 20);
  return { spr: true, stem: `A cube has a volume of ${v} cubic meters. Each edge of the cube is multiplied by ${k} to make a new cube. What is the volume of the new cube, in cubic meters?`, ans: v * k ** 3, x: `Volume scales by the cube of the length factor: ${mm(`${v} \\times ${k}^3 = ${v * k ** 3}`)}.` };
});
G('angles', [1, 2, 3], (r, d) => {
  if (d === 1) { const a = ri(r, 25, 80), b = ri(r, 25, 150 - a); return { spr: true, stem: `In triangle ${mm('ABC')}, the measure of angle ${mm('A')} is ${a}° and the measure of angle ${mm('B')} is ${b}°. What is the measure, in degrees, of angle ${mm('C')}?`, ans: 180 - a - b, x: `${mm(`180 - ${a} - ${b} = ${180 - a - b}`)}.` }; }
  if (d === 2) { const x = ri(r, 10, 30), k = ri(r, 2, 4), c = 180 - (k + 1) * x; if (c <= 0) return GENS.find(g => g.id === 'angles.1').make(r, 1); return { spr: true, stem: `Two parallel lines are cut by a transversal. One pair of same-side interior angles measures ${mm(`${k}x\\deg`)} and ${mm(`(x + ${c})\\deg`)}. What is the value of ${mm('x')}?`, ans: x, x: `Same-side interior angles add to 180°: ${mm(`${k}x + x + ${c} = 180`)} → ${mm(`${k + 1}x = ${180 - c}`)} → ${mm(`x = ${x}`)}.` }; }
  const s1 = ri(r, 3, 9), k = ri(r, 2, 5), s2 = ri(r, 4, 12);
  return { spr: true, stem: `Triangle ${mm('PQR')} is similar to triangle ${mm('STU')}, where ${mm('P')}, ${mm('Q')}, and ${mm('R')} correspond to ${mm('S')}, ${mm('T')}, and ${mm('U')}. If ${mm(`PQ = ${s1}`)}, ${mm(`ST = ${s1 * k}`)}, and ${mm(`QR = ${s2}`)}, what is ${mm('TU')}?`, ans: s2 * k, x: `Scale factor ${mm(`\\frac{ST}{PQ} = ${k}`)}, so ${mm(`TU = ${k} \\cdot ${s2} = ${s2 * k}`)}.` };
});
G('trig', [1, 2, 3], (r, d) => {
  const [a, b, c] = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15]], r);
  if (d === 1) return { spr: true, stem: `A right triangle has legs of length ${a} and ${b}. What is the length of the hypotenuse?`, ans: c, x: `${mm(`\\sqrt{${a}^2 + ${b}^2} = \\sqrt{${a * a + b * b}} = ${c}`)}.` };
  if (d === 2) return { stem: `In right triangle ${mm('ABC')}, angle ${mm('C')} is the right angle, ${mm(`BC = ${a}`)}, ${mm(`AC = ${b}`)}, and ${mm(`AB = ${c}`)}. What is ${mm('\\sin A')}?`, ans: mm(fracM(a, c)), wrong: [mm(fracM(b, c)), mm(fracM(a, b)), mm(fracM(c, a))], x: `${mm('\\sin A')} = opposite ÷ hypotenuse. The side opposite ${mm('A')} is ${mm('BC')} = ${a}, so ${mm(fracM(a, c))}.` };
  const t = ri(r, 12, 78);
  return { spr: true, stem: `In a right triangle, ${mm(`\\sin(x\\deg) = \\cos(${t}\\deg)`)}, where ${mm('0 < x < 90')}. What is the value of ${mm('x')}?`, ans: 90 - t, x: `Sine of an angle equals cosine of its complement: ${mm(`x = 90 - ${t} = ${90 - t}`)}.` };
});
G('circles', [1, 2, 3], (r, d) => {
  const rr = ri(r, 2, 12), th = pick([30, 45, 60, 90, 120, 135, 150, 240], r);
  if (d === 1) { const deg = pick([30, 45, 60, 90, 120, 135, 150, 180, 270], r); return { stem: `What is ${deg}° in radians?`, ans: mm(piM(deg, 180)), wrong: [mm(piM(180, deg)), mm(piM(deg, 360)), mm(piM(deg * 2, 180))].filter((v, i, x) => x.indexOf(v) === i && v !== mm(piM(deg, 180))).concat([mm(`${deg}\\pi`)]), x: `Multiply by ${mm('\\frac{\\pi}{180}')}: ${mm(piM(deg, 180))}.` }; }
  if (d === 2) return { stem: `A circle has radius ${rr}. What is the length of an arc with a central angle of ${th}°?`, ans: mm(piM(th * 2 * rr, 360)), wrong: [mm(piM(th * rr * rr, 360)), mm(piM(th * rr, 360)), mm(`${2 * rr}\\pi`)].filter((v, i, x) => x.indexOf(v) === i && v !== mm(piM(th * 2 * rr, 360))).concat([mm(piM(th * 4 * rr, 360))]), x: `Arc = ${mm(`\\frac{${th}}{360} \\cdot 2\\pi(${rr}) = ${piM(th * 2 * rr, 360)}`)}.` };
  return { stem: `A circle has radius ${rr}. What is the area of a sector with a central angle of ${th}°?`, ans: mm(piM(th * rr * rr, 360)), wrong: [mm(piM(th * 2 * rr, 360)), mm(`${rr * rr}\\pi`), mm(piM(th * rr * rr, 180))].filter((v, i, x) => x.indexOf(v) === i && v !== mm(piM(th * rr * rr, 360))).concat([mm(piM(th * rr, 360))]), x: `Sector = ${mm(`\\frac{${th}}{360} \\cdot \\pi(${rr})^2 = ${piM(th * rr * rr, 360)}`)}.` };
});
G('unit-circle', [1, 2, 3], (r, d) => {
  const T = [[30, '\\frac{\\sqrt{3}}{2}', '\\frac{1}{2}'], [45, '\\frac{\\sqrt{2}}{2}', '\\frac{\\sqrt{2}}{2}'], [60, '\\frac{1}{2}', '\\frac{\\sqrt{3}}{2}'], [120, '-\\frac{1}{2}', '\\frac{\\sqrt{3}}{2}'], [135, '-\\frac{\\sqrt{2}}{2}', '\\frac{\\sqrt{2}}{2}'], [150, '-\\frac{\\sqrt{3}}{2}', '\\frac{1}{2}'], [210, '-\\frac{\\sqrt{3}}{2}', '-\\frac{1}{2}'], [240, '-\\frac{1}{2}', '-\\frac{\\sqrt{3}}{2}'], [300, '\\frac{1}{2}', '-\\frac{\\sqrt{3}}{2}'], [330, '\\frac{\\sqrt{3}}{2}', '-\\frac{1}{2}']];
  if (d === 1) { const k = pick([1, 2, 3, 4, 5, 6, 7], r), n = pick([2, 3, 4, 6], r); if (gcd(k, n) !== 1) return GENS.find(g => g.id === 'unit-circle.1').make(r, 1); return { spr: true, stem: `What is ${mm(`\\frac{${k}\\pi}{${n}}`)} radians in degrees?`, ans: 180 * k / n, x: `Multiply by ${mm('\\frac{180}{\\pi}')}: ${mm(`\\frac{${k} \\cdot 180}{${n}} = ${180 * k / n}`)}°.` }; }
  const [deg, cs, sn] = pick(d === 2 ? T.slice(0, 3) : T.slice(3), r), fn = pick(['cos', 'sin'], r), ans = fn === 'cos' ? cs : sn, other = fn === 'cos' ? sn : cs;
  const neg = s => (s.startsWith('-') ? s.slice(1) : '-' + s);
  const pool = [other, neg(ans), neg(other), '\\frac{\\sqrt{3}}{3}', '1'].filter((v, i, a) => a.indexOf(v) === i && v !== ans);
  return { stem: `What is the value of ${mm(`\\${fn}(${piM(deg, 180)})`)}?`, ans: mm(ans), wrong: pool.slice(0, 3).map(mm), x: `${mm(piM(deg, 180))} = ${deg}°. On the unit circle the point is ${mm(`(${cs}, ${sn})`)}; ${fn === 'cos' ? 'cosine is the x' : 'sine is the y'}-coordinate.` };
});
G('circle-eq', [1, 2, 3], (r, d) => {
  const h = nz(r, -8, 8), k = nz(r, -8, 8), rr = ri(r, 2, 9);
  const sq = (v, n) => (v < 0 ? `(${n} + ${-v})^2` : `(${n} - ${v})^2`);
  if (d === 1) return { stem: `The equation of a circle is ${mm(`${sq(h, 'x')} + ${sq(k, 'y')} = ${rr * rr}`)}. What are the center and radius of the circle?`, ans: `Center ${mm(`(${h}, ${k})`)}, radius ${rr}`, wrong: [`Center ${mm(`(${-h}, ${-k})`)}, radius ${rr}`, `Center ${mm(`(${h}, ${k})`)}, radius ${rr * rr}`, `Center ${mm(`(${-h}, ${-k})`)}, radius ${rr * rr}`], x: `${mm('(x - h)^2 + (y - k)^2 = r^2')}: center ${mm(`(${h}, ${k})`)}, ${mm(`r = \\sqrt{${rr * rr}} = ${rr}`)}.` };
  const C = h * h + k * k - rr * rr;
  return { spr: true, stem: `The equation ${mm(`x^2 + y^2${signed(-2 * h)}x${signed(-2 * k)}y${C ? signed(C) : ''} = 0`)} defines a circle in the ${mm('xy')}-plane. What is the ${d === 2 ? 'radius' : mm('x') + '-coordinate of the center'} of the circle?`, ans: d === 2 ? rr : h,
    x: `Complete the square: ${mm(`${sq(h, 'x')} + ${sq(k, 'y')} = ${rr * rr}`)}. Center ${mm(`(${h}, ${k})`)}, radius ${rr}.` };
});
