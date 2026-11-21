/* ERLY Learning Studio v26 — mathematics construction tools.
     equation-balance   Equation Balance Studio: real, exact (fraction) operations on both sides of a linear equation.
     geo-construct      Geometry Construction Studio: points, segments, lines, circles, perpendiculars, parallels,
                        midpoints and intersections that stay true as you drag; live lengths, angles and areas. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, IL = LS.inline, esc = LS.esc;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });

  /* ================= exact fractions ================= */
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const F = (n, d = 1) => { if (d === 0) throw new Error('÷0'); if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; };
  const fromNum = v => { if (Number.isInteger(v)) return F(v); const s = String(v); const k = (s.split('.')[1] || '').length; return F(Math.round(v * 10 ** k), 10 ** k); };
  const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d), sub = (a, b) => add(a, F(-b.n, b.d)), mul = (a, b) => F(a.n * b.n, a.d * b.d), div = (a, b) => F(a.n * b.d, a.d * b.n);
  const isZ = a => a.n === 0, val = a => a.n / a.d;
  const fs = a => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`).replace('-', '−');
  function side(S) { // a·x + b, written naturally
    const parts = [];
    if (!isZ(S.a)) { const c = S.a.d === 1 && Math.abs(S.a.n) === 1 ? (S.a.n < 0 ? '−' : '') : (S.a.d === 1 ? fs(S.a) : `(${fs(S.a)})`); parts.push(c + 'x'); }
    if (!isZ(S.b) || !parts.length) { if (parts.length) parts.push((S.b.n < 0 ? ' − ' : ' + ') + fs(F(Math.abs(S.b.n), S.b.d))); else parts.push(fs(S.b)); }
    return parts.join('');
  }
  // parse "3x + 5 = x - 11", "2(x+3)=10" is not linear-expanded here: brackets are expanded for one level a(bx+c)
  function parseSide(src) {
    let s = String(src).replace(/[−–]/g, '-').replace(/\s+/g, '').toLowerCase(); if (!s) throw new Error(T('One side is empty.', 'أحد الطرفين فارغ.'));
    s = s.replace(/(-?\d*\.?\d*)\(([^()]*)\)/g, (m, k, inner) => { const kk = k === '' ? 1 : k === '-' ? -1 : +k; const t = parseSide(inner); return termStr(F(t.a.n * fromNum(kk).n, t.a.d * fromNum(kk).d)) + 'x' + signStr(mul(t.b, fromNum(kk))); });
    if (!/^[-+]?[0-9x./+-]+$/.test(s)) throw new Error(T('Use numbers, x, +, − and brackets, e.g. 3x + 5 = x − 7.', 'استخدم أرقاماً وx.'));
    let a = F(0), b = F(0); const terms = s.replace(/-/g, '+-').split('+').filter(t => t !== '');
    terms.forEach(t => {
      const xd = /^([+-]?\d*\.?\d*)x\/(\d+\.?\d*)$/.exec(t); if (xd) { const k = xd[1] === '' || xd[1] === '+' ? 1 : xd[1] === '-' ? -1 : +xd[1]; a = add(a, div(fromNum(k), fromNum(+xd[2]))); return; }
      if (t.includes('x')) { if ((t.match(/x/g) || []).length > 1 || !/x$/.test(t)) throw new Error(T('Only terms like 3x or −x/2 are allowed (no x² — this studio solves linear equations).', 'معادلات خطية فقط.')); let c = t.slice(0, -1); let d = 1; if (c.includes('/')) { [c, d] = c.split('/'); d = +d; }
        const k = c === '' || c === '+' ? 1 : c === '-' ? -1 : +c; if (!isFinite(k) || !d) throw new Error(T('I could not read “', 'تعذّر قراءة “') + t + '”.'); a = add(a, div(fromNum(k), fromNum(d))); }
      else if (t.includes('x/')) throw new Error('x/');
      else { let [n, d] = t.split('/'); const k = +n, dd = d == null ? 1 : +d; if (!isFinite(k) || !dd) throw new Error(T('I could not read “', 'تعذّر قراءة “') + t + '”.'); b = add(b, div(fromNum(k), fromNum(dd))); }
    });
    return { a, b };
  }
  const termStr = f => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
  const signStr = f => (f.n < 0 ? '-' : '+') + termStr(F(Math.abs(f.n), f.d));
  function parseEq(src) { const p = String(src).split('='); if (p.length !== 2) throw new Error(T('Write one “=” sign, e.g. 3x + 5 = 20.', 'اكتب علامة يساوي واحدة.')); return { L: parseSide(p[0]), R: parseSide(p[1]) }; }
  const evalS = (S, x) => val(S.a) * x + val(S.b);
  function solution(E) { const a = sub(E.L.a, E.R.a), b = sub(E.R.b, E.L.b); if (isZ(a)) return isZ(b) ? 'all' : 'none'; return div(b, a); }

  /* ================= Equation Balance Studio ================= */
  const PRESETS = ['x + 4 = 9', '3x + 5 = 20', '5x − 7 = 2x + 8', '2(x + 3) = 14', 'x/2 + 1 = 4', '4 − x = 2x − 11', '6x + 2 = 6x − 1'];
  D['equation-balance'] = { wide: true,
    intro: 'An equation is a balance: the two sides are **equal**. Here each side is drawn as weights on a scale — **x-blocks** for the unknown and **unit tiles** for numbers (red tiles are negative).\n\nYou can type any **linear** equation. Then choose an operation. Every operation is applied to **both sides**, so the scale stays level and the solution never changes — until the equation says **x = …**.',
    predict: { q: 'You add 5 to **only the left side** of 3x + 5 = 20. The equation…', options: ['stays true for the same x', 'becomes false for the old solution', 'becomes true for every x', 'cannot be changed'] },
    explore: '- Solve **3x + 5 = 20** with as few steps as you can.\n- Switch on **Apply to the left side only** and add 5: watch the scale tip, and the test value stop working.\n- Type your own equation. Try **6x + 2 = 6x − 1** — what happens when the x terms cancel?',
    explain: 'Doing the **same thing to both sides** keeps an equation true for exactly the same values of x — that is why each step is allowed. To solve a linear equation, first **collect the x terms** on one side (subtract an x term from both sides), then **collect the numbers** on the other, then **divide** both sides by the coefficient of x.\n\nIf the x terms cancel and a false statement is left (like 2 = −1), **no value of x** works; if a true statement is left (like 4 = 4), **every** x works.',
    apply: [
      q('x-eb1', 'To solve 4x − 3 = 13, a good first step is to…', ['subtract 4 from both sides', 'add 3 to both sides', 'divide only the left side by 4', 'subtract 13 from the left'], 1, 'Adding 3 to both sides removes the −3: 4x = 16, then divide by 4: x = 4.'),
      q('x-eb2', '2x + 7 = 2x + 9 has…', ['one solution', 'no solution', 'infinitely many solutions', 'the solution x = 2'], 1, 'Subtracting 2x from both sides leaves 7 = 9, which is never true.'),
      q('x-eb3', 'The solution of 5x − 7 = 2x + 8 is…', ['x = 1/3', 'x = 5', 'x = 15', 'x = 3'], 1, '5x − 2x = 8 + 7 → 3x = 15 → x = 5.')
    ],
    summary: ['An equation is a balance: both sides have the same value.', 'Apply every operation to both sides.', 'Collect x terms on one side, numbers on the other, then divide by the coefficient.', 'x terms cancelling leaves either no solution or all x.'],
    connect: [{ label: 'Line builder', href: '#/exp/line-builder' }, { label: 'Function playground', href: '#/exp/fn-play' }],
    build(host, c) {
      host.innerHTML = `<div class="v26-ws eb">
        <form class="v26-bar eb__in"><label class="sr-only" for="ebIn">${T('Equation', 'المعادلة')}</label><input id="ebIn" class="ls-input" style="flex:1;min-width:200px;font:600 1.05rem var(--f-mono,ui-monospace)" value="3x + 5 = 20" autocomplete="off" spellcheck="false"><button class="v26-tool" type="submit">${T('Start with this equation', 'ابدأ')}</button></form>
        <div class="v26-bar" role="group" aria-label="${T('Examples', 'أمثلة')}">${PRESETS.map(p => `<button type="button" class="v26-tool" data-pre="${esc(p)}">${esc(p)}</button>`).join('')}</div>
        <p class="eb__err ls-fb ls-fb--warn" role="alert" hidden></p>
        <div class="v26-eq" aria-live="polite"></div>
        <svg class="v26-svg eb__svg" viewBox="0 0 900 330" role="img"></svg>
        <div class="v26-grid2"><div class="v26-card"><h3>${T('Operations — applied to both sides', 'العمليات')}</h3>
          <div class="v26-bar"><label class="kx-tog"><input type="checkbox" class="eb__one"><span>${T('Apply to the left side only (to see why we never do this)', 'على الطرف الأيسر فقط')}</span></label></div>
          <div class="v26-bar eb__ops"></div>
          <div class="v26-bar"><label>${T('Your own:', 'عمليتك:')} <select class="ls-input eb__op" style="width:auto"><option value="add">+</option><option value="sub">−</option><option value="mul">×</option><option value="div">÷</option></select></label><input class="ls-input eb__k" style="width:90px" value="2" aria-label="${T('Number or term, e.g. 3 or 2x', 'العدد أو الحد')}"><button type="button" class="v26-tool eb__go">${T('Apply', 'طبّق')}</button><button type="button" class="v26-tool eb__undo">${T('Undo', 'تراجع')}</button></div>
          <p class="v26-hint eb__hint"></p></div>
          <div class="v26-card"><h3>${T('Test a value of x', 'اختبر قيمة')}</h3><label class="kx-range"><span class="kx-range__t">x <output class="eb__xo">0</output></span><input type="range" class="eb__x" min="-10" max="10" step="0.5" value="0" aria-label="x"></label><p class="v26-out eb__test"></p></div></div>
        <div class="v26-card"><h3>${T('Your steps', 'خطواتك')}</h3><ol class="eb__log v26-out"></ol></div></div>`;
      const $ = s => host.querySelector(s); let E = null, X0 = null, hist = [], log = [], tx = 0, tilt = K.spring(0, 9);
      const M = K.motor(c, host, () => draw()).add(tilt);
      function start(src) { const err = $('.eb__err'); try { E = parseEq(src); err.hidden = true; } catch (e) { err.hidden = false; err.textContent = e.message; return; } X0 = solution(E); hist = []; log = [{ eq: E, why: T('Start', 'البداية') }]; refresh(); }
      function apply(op, k, isX, oneSide) {
        if ((op === 'mul' || op === 'div') && isX) { flash(T('Multiplying or dividing by x is not allowed here: x could be 0, and the equation would stop being linear.', 'لا نضرب أو نقسم على x.')); return; }
        if ((op === 'mul' || op === 'div') && isZ(k)) { flash(op === 'div' ? T('You cannot divide by 0.', 'لا قسمة على صفر.') : T('Multiplying both sides by 0 makes 0 = 0 — true for every x, so it throws the information away.', 'الضرب في صفر يُضيّع المعلومة.')); return; }
        const f = S => { const a = { a: S.a, b: S.b }; if (op === 'add') { if (isX) a.a = add(S.a, k); else a.b = add(S.b, k); } if (op === 'sub') { if (isX) a.a = sub(S.a, k); else a.b = sub(S.b, k); } if (op === 'mul') { a.a = mul(S.a, k); a.b = mul(S.b, k); } if (op === 'div') { a.a = div(S.a, k); a.b = div(S.b, k); } return a; };
        hist.push(E); E = { L: f(E.L), R: oneSide ? E.R : f(E.R) };
        const word = { add: T('add', 'أضف'), sub: T('subtract', 'اطرح'), mul: T('multiply by', 'اضرب في'), div: T('divide by', 'اقسم على') }[op];
        const kt = (isX ? (k.d === 1 && Math.abs(k.n) === 1 ? (k.n < 0 ? '−' : '') : fs(k)) + 'x' : fs(k));
        log.push({ eq: E, why: `${word} ${kt} ${oneSide ? T('— LEFT SIDE ONLY', '— الطرف الأيسر فقط') : T('on both sides', 'للطرفين')}`, bad: oneSide }); refresh();
      }
      function flash(msg) { const h = $('.eb__hint'); h.textContent = msg; h.classList.remove('v26-flash'); void h.offsetWidth; h.classList.add('v26-flash'); }
      function suggest() { // a sensible next step, worked out from the equation (shown as a button)
        const ops = [];
        if (!isZ(E.R.a) && !isZ(E.L.a)) ops.push(['sub', E.R.a, true]);
        else if (!isZ(E.R.a) && isZ(E.L.a)) ops.push(['sub', E.R.a, true]);
        const xs = isZ(E.L.a) ? 'R' : 'L', o = xs === 'L' ? 'R' : 'L';
        if (!isZ(E[xs].b) && !(isZ(E.L.a) && isZ(E.R.a))) ops.push([E[xs].b.n > 0 ? 'sub' : 'add', F(Math.abs(E[xs].b.n), E[xs].b.d), false]);
        if (!isZ(E[xs].a) && isZ(E[xs].b) && isZ(E[o].a) && !(E[xs].a.n === 1 && E[xs].a.d === 1)) ops.push(['div', E[xs].a, false]);
        return ops;
      }
      function refresh() {
        const sol = solution(E), one = $('.eb__one').checked;
        $('.v26-eq').innerHTML = `${esc(side(E.L))} <span aria-hidden="true" style="opacity:.6">=</span><span class="sr-only">equals</span> ${esc(side(E.R))}`;
        const solved = (E.L.a.n === 1 && E.L.a.d === 1 && isZ(E.L.b) && isZ(E.R.a)) || (E.R.a.n === 1 && E.R.a.d === 1 && isZ(E.R.b) && isZ(E.L.a));
        const sg = suggest(); const word = { add: '+', sub: '−', mul: '×', div: '÷' };
        $('.eb__ops').innerHTML = sg.map(([op, k, isX]) => `<button type="button" class="v26-tool" data-op="${op}" data-n="${k.n}" data-d="${k.d}" data-x="${isX ? 1 : 0}">${word[op]} ${isX ? (k.d === 1 && Math.abs(k.n) === 1 ? (k.n < 0 ? '−' : '') : fs(k)) + 'x' : fs(k)}</button>`).join('') || `<span class="v26-hint">${T('Use your own operation below.', 'استخدم عمليتك.')}</span>`;
        const h = $('.eb__hint');
        if (sol === 'none') h.innerHTML = IL(T('The x terms are gone and what is left is **false** — this equation has **no solution**.', 'لا حل.'));
        else if (sol === 'all') h.innerHTML = IL(T('What is left is **always true** — **every** value of x is a solution.', 'كل x حل.'));
        else if (solved) h.innerHTML = IL(T(`**Solved: x = ${fs(sol)}.** Check it with the test slider.`, `**تم الحل: x = ${fs(sol)}**`));
        else h.innerHTML = IL(T('Pick a suggested step, or apply your own. Each operation is applied to **both sides**.', 'اختر خطوة.'));
        if (X0 && typeof X0 === 'object' && typeof sol === 'object' && val(sol) !== val(X0) && one) h.innerHTML += ' ' + IL(T(`**The solution changed** from ${fs(X0)} to ${fs(sol)}: changing one side only makes a different equation.`, 'تغيّر الحل.'));
        $('.eb__log').innerHTML = log.map(r => `<li${r.bad ? ' style="color:var(--red,#c0392b)"' : ''}><b>${esc(side(r.eq.L))} = ${esc(side(r.eq.R))}</b> <span class="at-muted">— ${esc(r.why)}</span></li>`).join('');
        $('.eb__undo').disabled = !hist.length;
        // tilt: compare the two sides at the ORIGINAL solution (the value the balance was built for)
        const x = typeof X0 === 'object' ? val(X0) : tx; const dl = evalS(E.L, x) - evalS(E.R, x);
        tilt.set(Math.max(-1, Math.min(1, dl / 6)) * 14); M.kick(); test();
      }
      function test() { const L = evalS(E.L, tx), R = evalS(E.R, tx), eq = Math.abs(L - R) < 1e-9; $('.eb__xo').textContent = K.fmt(tx, 1); $('.eb__test').innerHTML = IL(`x = ${K.fmt(tx, 1)}: left side = **${K.fmt(L, 2)}**, right side = **${K.fmt(R, 2)}** → ${eq ? T('**equal — this x is a solution.**', '**متساويان**') : T('not equal.', 'غير متساويين.')}`); }
      function tiles(S, cx, top) { // x-blocks and unit tiles on a pan; everything not drawn is counted in “+n”, so the pan always shows its true total
        let out = ''; const W = 250;
        const row = (v, w, h, col, label, y) => { const n = Math.abs(v), whole = Math.floor(n + 1e-9), frac = n - whole, per = Math.floor(W / (w + 4)), rowsMax = 2;
          const items = []; for (let i = 0; i < whole; i++) items.push(w); if (frac > 1e-9) items.push(w * frac);
          const shown = Math.min(items.length, per * rowsMax - (items.length > per * rowsMax ? 1 : 0)); let yy = y, used = 0;
          for (let r = 0; r * per < shown; r++) { const cnt = Math.min(per, shown - r * per), wid = items.slice(r * per, r * per + cnt).reduce((s2, x) => s2 + x + 4, -4); let x = cx - wid / 2;
            for (let k = 0; k < cnt; k++) { const iw = items[r * per + k]; out += `<rect x="${x}" y="${yy - h}" width="${iw}" height="${h}" rx="5" fill="${col}"/>${iw > 16 ? `<text x="${x + iw / 2}" y="${yy - h / 2 + 5}" text-anchor="middle" style="fill:#fff;font-size:12px">${label}</text>` : ''}`; x += iw + 4; }
            yy -= h + 4; used++; }
          const rest = items.length - shown; if (rest > 0) out += `<text x="${cx + W / 2 + 4}" y="${y - 4}" style="font-size:13px">+${rest} ${label === 'x' || label === '−x' ? label : (v < 0 ? '(−1)' : 'ones')}</text>`;
          return used ? yy : y; };
        const ax = val(S.a), bx = val(S.b);
        let y = row(ax, 34, 44, ax < 0 ? '#9b3b2f' : '#3c6fd8', ax < 0 ? '−x' : 'x', top);
        row(bx, 20, 20, bx < 0 ? '#d0503b' : '#e0a526', bx < 0 ? '−1' : '1', y);
        return out;
      }
      function draw() {
        const Pl = K.pal(), th = tilt.v * Math.PI / 180, cx = 450, cy = 120, arm = 300;
        const lx = cx - Math.cos(th) * arm, ly = cy - Math.sin(th) * arm, rx = cx + Math.cos(th) * arm, ry = cy + Math.sin(th) * arm;
        const pan = (x, y, S, name) => `<line x1="${x}" y1="${y}" x2="${x - 120}" y2="${y + 150}" stroke="${Pl.muted}" stroke-width="1.5"/><line x1="${x}" y1="${y}" x2="${x + 120}" y2="${y + 150}" stroke="${Pl.muted}" stroke-width="1.5"/><path d="M${x - 140} ${y + 150} h280 q-20 26 -140 26 t-140 -26z" fill="${Pl.line}"/>${tiles(S, x, y + 148)}<text x="${x}" y="${y + 200}" text-anchor="middle">${name}: ${esc(side(S))}</text>`;
        const svg = $('.eb__svg'); svg.setAttribute('aria-label', T(`A balance. Left side ${side(E.L)}, right side ${side(E.R)}. ${Math.abs(tilt.t) < 0.01 ? 'Level.' : 'Tipped.'}`, 'ميزان.'));
        svg.innerHTML = `<path d="M${cx - 60} 320 L${cx} ${cy} L${cx + 60} 320z" fill="${Pl.line}"/><line x1="${lx}" y1="${ly}" x2="${rx}" y2="${ry}" stroke="${Pl.ink}" stroke-width="6" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="9" fill="${Pl.ink}"/>${pan(lx, ly, E.L, T('Left', 'الأيسر'))}${pan(rx, ry, E.R, T('Right', 'الأيمن'))}<text x="${cx}" y="26" text-anchor="middle" style="font-size:14px">${Math.abs(tilt.t) < 0.01 ? T('Level — both sides are equal at the solution', 'متوازن') : T('Tipped — the sides are no longer equal at the old solution', 'مائل')}</text>`;
      }
      host.querySelector('.eb__in').addEventListener('submit', e => { e.preventDefault(); start($('#ebIn').value); });
      host.addEventListener('click', e => {
        const pre = e.target.closest('[data-pre]'); if (pre) { $('#ebIn').value = pre.dataset.pre; start(pre.dataset.pre); return; }
        const b = e.target.closest('[data-op]'); if (b) { apply(b.dataset.op, F(+b.dataset.n, +b.dataset.d), b.dataset.x === '1', $('.eb__one').checked); return; }
        if (e.target.closest('.eb__go')) { const raw = $('.eb__k').value.replace(/[−–]/g, '-').replace(/\s+/g, ''); try { const isX = /x$/.test(raw); const t = parseSide(raw); const k = isX ? t.a : t.b; if (isX && !isZ(t.b)) throw new Error(); apply($('.eb__op').value, k, isX, $('.eb__one').checked); } catch (er) { flash(T('Type a number (like 3 or 1/2) or an x term (like 2x).', 'اكتب عدداً أو حداً.')); } }
        if (e.target.closest('.eb__undo') && hist.length) { E = hist.pop(); log.pop(); refresh(); }
      });
      $('.eb__x').addEventListener('input', e => { tx = +e.target.value; test(); });
      $('.eb__one').addEventListener('change', refresh);
      start('3x + 5 = 20');
      return { play() {}, pause() {}, running: () => false, destroy() { M.pause(); },
        reset() { $('#ebIn').value = '3x + 5 = 20'; $('.eb__one').checked = false; start('3x + 5 = 20'); },
        preset() { this.reset(); },
        observe() { const sol = solution(E); return { text: `Current equation **${side(E.L)} = ${side(E.R)}** after ${log.length - 1} step${log.length === 2 ? '' : 's'}. ${typeof sol === 'object' ? `Its solution is **x = ${fs(sol)}**${typeof X0 === 'object' && val(sol) !== val(X0) ? ` — different from the original equation’s **x = ${fs(X0)}**, because an operation was applied to one side only` : ' — the same as the original equation'}.` : sol === 'none' ? 'It has **no solution**.' : '**Every** x is a solution.'}`, predOk: i => (log.some(r => r.bad) ? i === 1 : null) }; },
        _solve: src => { const e = parseEq(src), s = solution(e); return typeof s === 'object' ? fs(s) : s; }
      };
    }
  };

  /* ================= Geometry Construction Studio ================= */
  // objects: {id, t:'pt', x, y, free} | {t:'mid', a, b} | {t:'seg'|'line'|'ray', a, b} | {t:'circ', c, p} | {t:'perp'|'par', l, p}
  //          | {t:'int', a, b, k} (k-th intersection of two lines/circles) | {t:'ang', a, b, c} (angle ABC) | {t:'poly', pts:[...]}
  const TOOLS = [['move', 'Move'], ['pt', 'Point'], ['seg', 'Segment'], ['line', 'Line'], ['circ', 'Circle'], ['mid', 'Midpoint'], ['perp', 'Perpendicular'], ['par', 'Parallel'], ['int', 'Intersect'], ['ang', 'Angle'], ['poly', 'Polygon'], ['del', 'Delete']];
  const HELP = { move: 'Drag any free point (filled dot). Everything built on it follows.', pt: 'Click to place a point. Click on a line or circle to place a point on it.', seg: 'Click two points (or empty places) for a segment.', line: 'Click two points for a line through both.', circ: 'Click the centre, then a point on the circle.', mid: 'Click two points: their midpoint is constructed.', perp: 'Click a line or segment, then a point: the perpendicular through that point.', par: 'Click a line or segment, then a point: the parallel through that point.', int: 'Click two lines or circles where they cross: the intersection point is constructed.', ang: 'Click three points A, B, C to measure angle ABC.', poly: 'Click points in turn; click the first point again to close the polygon.', del: 'Click an object to delete it (and everything built on it).' };
  D['geo-construct'] = { wide: true,
    intro: 'A ruler-and-compass workshop. Build points, segments, lines, circles, perpendiculars, parallels, midpoints and intersections. **Constructed objects keep their definition:** a perpendicular stays perpendicular and a midpoint stays in the middle while you drag the free points. Lengths, angles and areas update live.',
    predict: { q: 'Construct a triangle and the midpoints of two of its sides, then join them. As you drag the triangle, the joining segment is always…', options: ['the same length as the third side', 'parallel to the third side and half as long', 'perpendicular to the third side', 'unrelated to the third side'] },
    explore: '- **Midpoint theorem:** triangle → two midpoints → segment between them. Measure it against the third side; drag a vertex.\n- **Perpendicular bisector:** segment AB → midpoint → perpendicular through it. Put a point on that line and compare its distances to A and B.\n- **Angle in a semicircle:** circle → a diameter → a point on the circle → measure the angle.\n- Try the **challenge** buttons for guided constructions.',
    explain: 'A construction is a **definition**, not a drawing: “the midpoint of AB” is wherever A and B are. That is why relationships that survive every drag are theorems — the **midpoint theorem** (the segment joining two midpoints is parallel to the third side and half its length), **every point on the perpendicular bisector is equidistant from A and B**, and **the angle in a semicircle is 90°**. Dragging is the experiment; the proof explains why it always works.',
    apply: [
      q('x-gc1', 'P is any point on the perpendicular bisector of AB. Then…', ['PA = PB', 'PA = 2PB', 'P is the midpoint of AB', 'angle APB = 90°'], 0, 'Every point on the perpendicular bisector is the same distance from A and B.'),
      q('x-gc2', 'In triangle ABC, M and N are the midpoints of AB and AC, and BC = 10 cm. MN is…', ['10 cm', '5 cm', '20 cm', 'it depends on the angles'], 1, 'Midpoint theorem: MN is parallel to BC and half its length.'),
      q('x-gc3', 'AB is a diameter of a circle and C is any other point on the circle. Angle ACB is…', ['45°', '60°', '90°', '180°'], 2, 'The angle in a semicircle is always a right angle.')
    ],
    summary: ['Constructed objects keep their definitions when points move.', 'Midpoint theorem: midsegment ∥ third side and half as long.', 'Perpendicular bisector: all points equidistant from both ends.', 'Angle in a semicircle = 90°.'],
    connect: [{ label: 'Transformation explorer', href: '#/exp/transform' }, { label: 'Vector playground', href: '#/exp/vectors' }],
    build(host, c) {
      host.innerHTML = `<div class="v26-ws gc">
        <div class="v26-bar" role="toolbar" aria-label="${T('Construction tools', 'أدوات')}">${TOOLS.map(([k, n]) => `<button type="button" class="v26-tool" data-tool="${k}" aria-pressed="${k === 'pt'}">${n}</button>`).join('')}<span style="flex:1"></span><button type="button" class="v26-tool" data-a="undo">${T('Undo', 'تراجع')}</button><button type="button" class="v26-tool" data-a="clear">${T('Clear', 'امسح')}</button></div>
        <div class="v26-bar" role="group" aria-label="${T('Challenges', 'تحديات')}"><span class="v26-hint">${T('Challenges:', 'تحديات:')}</span><button type="button" class="v26-tool" data-ch="mid">${T('Midpoint theorem', 'نظرية المنتصف')}</button><button type="button" class="v26-tool" data-ch="bis">${T('Perpendicular bisector', 'العمود المنصف')}</button><button type="button" class="v26-tool" data-ch="semi">${T('Angle in a semicircle', 'زاوية نصف الدائرة')}</button><button type="button" class="v26-tool" data-ch="tri">${T('Triangle angle sum', 'مجموع زوايا المثلث')}</button></div>
        <p class="v26-hint gc__help" aria-live="polite"></p>
        <svg class="v26-svg gc__svg" viewBox="0 0 900 520" tabindex="0" role="application" aria-label="${T('Construction board', 'لوحة الإنشاء')}"></svg>
        <div class="v26-card"><h3>${T('Measurements', 'القياسات')}</h3><div class="v26-out gc__out"></div></div></div>`;
      const svg = host.querySelector('.gc__svg'), $ = s => host.querySelector(s);
      let O = [], tool = 'pt', pend = [], drag = null, undo = [], nid = 1, hover = null, sel = null;
      const P = {}; // computed geometry per id
      const nm = i => { const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; return L[i % 26] + (i >= 26 ? Math.floor(i / 26) : ''); };
      let ptCount = 0;
      const mk = o => { o.id = 'o' + nid++; if (['pt', 'mid', 'int', 'on'].includes(o.t)) o.name = nm(ptCount++); O.push(o); return o; };
      const save = () => { undo.push(JSON.stringify({ O, nid, ptCount })); if (undo.length > 80) undo.shift(); };
      /* --- geometry --- */
      function lineOf(o) { const g = P[o.id]; return g && g.L ? g.L : null; } // {x, y, dx, dy, kind, t0, t1}
      function compute() {
        for (const k in P) delete P[k];
        for (const o of O) {
          const pt = id => P[id] && P[id].p; let g = null;
          try {
            if (o.t === 'pt') g = { p: [o.x, o.y] };
            else if (o.t === 'mid') { const a = pt(o.a), b = pt(o.b); if (a && b) g = { p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; }
            else if (o.t === 'seg' || o.t === 'line') { const a = pt(o.a), b = pt(o.b); if (a && b && Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-9) g = { L: { x: a[0], y: a[1], dx: b[0] - a[0], dy: b[1] - a[1], kind: o.t } }; }
            else if (o.t === 'circ') { const cc = pt(o.c), p = pt(o.p); if (cc && p) g = { C: { x: cc[0], y: cc[1], r: Math.hypot(p[0] - cc[0], p[1] - cc[1]) } }; }
            else if (o.t === 'perp' || o.t === 'par') { const L = P[o.l] && P[o.l].L, p = pt(o.p); if (L && p) g = { L: o.t === 'perp' ? { x: p[0], y: p[1], dx: -L.dy, dy: L.dx, kind: 'line' } : { x: p[0], y: p[1], dx: L.dx, dy: L.dy, kind: 'line' } }; }
            else if (o.t === 'on') { const host2 = P[o.on]; if (host2 && host2.L) { const L = host2.L; let s = o.s; if (L.kind === 'seg') s = Math.max(0, Math.min(1, s)); g = { p: [L.x + L.dx * s, L.y + L.dy * s] }; } else if (host2 && host2.C) g = { p: [host2.C.x + host2.C.r * Math.cos(o.s), host2.C.y + host2.C.r * Math.sin(o.s)] }; }
            else if (o.t === 'int') { const pts = inter(P[o.a], P[o.b]); if (pts.length) { const k = Math.min(o.k, pts.length - 1); g = { p: pts[k] }; } }
            else if (o.t === 'ang') { const a = pt(o.a), b = pt(o.b), cc = pt(o.c); if (a && b && cc) g = { A: [a, b, cc] }; }
            else if (o.t === 'poly') { const ps = o.pts.map(pt); if (ps.every(Boolean)) g = { G: ps }; }
          } catch (e) { g = null; }
          if (g) P[o.id] = g;
        }
      }
      function inter(A, B) { // intersections of two lines/segments/circles
        if (!A || !B) return [];
        const LL = (L, M) => { const den = L.dx * M.dy - L.dy * M.dx; if (Math.abs(den) < 1e-9) return []; const t = ((M.x - L.x) * M.dy - (M.y - L.y) * M.dx) / den, u = ((M.x - L.x) * L.dy - (M.y - L.y) * L.dx) / den; if ((L.kind === 'seg' && (t < -1e-9 || t > 1 + 1e-9)) || (M.kind === 'seg' && (u < -1e-9 || u > 1 + 1e-9))) return []; return [[L.x + L.dx * t, L.y + L.dy * t]]; };
        const LC = (L, C) => { const fx = L.x - C.x, fy = L.y - C.y, a = L.dx * L.dx + L.dy * L.dy, b = 2 * (fx * L.dx + fy * L.dy), cc = fx * fx + fy * fy - C.r * C.r, d = b * b - 4 * a * cc; if (d < 0) return []; const s = Math.sqrt(d); return [(-b - s) / (2 * a), (-b + s) / (2 * a)].filter(t => L.kind !== 'seg' || (t >= -1e-9 && t <= 1 + 1e-9)).map(t => [L.x + L.dx * t, L.y + L.dy * t]); };
        const CC = (C, E) => { const d = Math.hypot(E.x - C.x, E.y - C.y); if (d < 1e-9 || d > C.r + E.r || d < Math.abs(C.r - E.r)) return []; const a = (C.r * C.r - E.r * E.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, C.r * C.r - a * a)), mx = C.x + a * (E.x - C.x) / d, my = C.y + a * (E.y - C.y) / d; return [[mx + h * (E.y - C.y) / d, my - h * (E.x - C.x) / d], [mx - h * (E.y - C.y) / d, my + h * (E.x - C.x) / d]]; };
        if (A.L && B.L) return LL(A.L, B.L); if (A.L && B.C) return LC(A.L, B.C); if (A.C && B.L) return LC(B.L, A.C); if (A.C && B.C) return CC(A.C, B.C); return [];
      }
      /* --- hit testing --- */
      const pt = e => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 900, (e.clientY - r.top) / r.height * 520]; };
      function hitPoint(x, y) { let best = null, bd = 14; O.forEach(o => { const g = P[o.id]; if (g && g.p) { const d = Math.hypot(g.p[0] - x, g.p[1] - y); if (d < bd) { bd = d; best = o; } } }); return best; }
      function distToObj(o, x, y) { const g = P[o.id]; if (!g) return 1e9; if (g.L) { const L = g.L, l2 = L.dx * L.dx + L.dy * L.dy; let t = ((x - L.x) * L.dx + (y - L.y) * L.dy) / l2; if (L.kind === 'seg') t = Math.max(0, Math.min(1, t)); return Math.hypot(L.x + L.dx * t - x, L.y + L.dy * t - y); } if (g.C) return Math.abs(Math.hypot(x - g.C.x, y - g.C.y) - g.C.r); return 1e9; }
      function hitCurve(x, y, except) { let best = null, bd = 10; O.forEach(o => { if (o === except || !(P[o.id] && (P[o.id].L || P[o.id].C))) return; const d = distToObj(o, x, y); if (d < bd) { bd = d; best = o; } }); return best; }
      function pointAt(x, y) { // reuse a point, put one on a curve, or make a free one
        const h = hitPoint(x, y); if (h) return h;
        const cv = hitCurve(x, y); if (cv) { const g = P[cv.id]; let s; if (g.L) { const L = g.L; s = ((x - L.x) * L.dx + (y - L.y) * L.dy) / (L.dx * L.dx + L.dy * L.dy); } else s = Math.atan2(y - g.C.y, x - g.C.x); const o = mk({ t: 'on', on: cv.id, s }); compute(); return o; }
        const o = mk({ t: 'pt', x, y }); compute(); return o;
      }
      /* --- drawing --- */
      const COL = { pt: '#1c1b19', mid: '#0d9488', int: '#b45309', on: '#7c3aed' };
      function lineExt(L) { if (L.kind === 'seg') return [L.x, L.y, L.x + L.dx, L.y + L.dy]; const n = Math.hypot(L.dx, L.dy), ux = L.dx / n, uy = L.dy / n; return [L.x - ux * 2000, L.y - uy * 2000, L.x + ux * 2000, L.y + uy * 2000]; }
      function draw() {
        compute(); const Pl = K.pal(); let s = `<defs><pattern id="gcgrid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="${Pl.line}" stroke-width=".6"/></pattern></defs><rect width="900" height="520" fill="url(#gcgrid)"/>`;
        O.forEach(o => { const g = P[o.id]; if (!g) return; const hl = (hover === o || sel === o) ? ' style="stroke:var(--accent,#c8341f)"' : '';
          if (g.G) s += `<polygon points="${g.G.map(p => p.join(',')).join(' ')}" fill="color-mix(in srgb, var(--accent,#c8341f) 12%, transparent)" stroke="${Pl.ink}" stroke-width="1.5"${hl}/>`;
          if (g.L) { const e = lineExt(g.L); s += `<line x1="${e[0]}" y1="${e[1]}" x2="${e[2]}" y2="${e[3]}" stroke="${o.t === 'perp' ? '#0d9488' : o.t === 'par' ? '#7c3aed' : Pl.ink}" stroke-width="${o.t === 'seg' ? 2.4 : 1.6}" ${o.t === 'line' || o.t === 'perp' || o.t === 'par' ? '' : ''}${hl}/>`; }
          if (g.C) s += `<circle cx="${g.C.x}" cy="${g.C.y}" r="${g.C.r}" fill="none" stroke="${Pl.ink}" stroke-width="1.6"${hl}/>`;
          if (g.A) { const [a, b, cc] = g.A, a1 = Math.atan2(a[1] - b[1], a[0] - b[0]), a2 = Math.atan2(cc[1] - b[1], cc[0] - b[0]); let d = a2 - a1; while (d <= -Math.PI) d += 2 * Math.PI; while (d > Math.PI) d -= 2 * Math.PI; const r = 26, deg = Math.abs(d) * 180 / Math.PI; s += Math.abs(deg - 90) < 0.05 ? `<path d="M${b[0] + 18 * Math.cos(a1)} ${b[1] + 18 * Math.sin(a1)} L${b[0] + 18 * Math.cos(a1) + 18 * Math.cos(a2)} ${b[1] + 18 * Math.sin(a1) + 18 * Math.sin(a2)} L${b[0] + 18 * Math.cos(a2)} ${b[1] + 18 * Math.sin(a2)}" fill="none" stroke="#b45309" stroke-width="2"/>` : `<path d="M${b[0] + r * Math.cos(a1)} ${b[1] + r * Math.sin(a1)} A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${b[0] + r * Math.cos(a2)} ${b[1] + r * Math.sin(a2)}" fill="none" stroke="#b45309" stroke-width="2"/>`; s += `<text x="${b[0] + 34 * Math.cos(a1 + d / 2)}" y="${b[1] + 34 * Math.sin(a1 + d / 2) + 5}" text-anchor="middle" style="fill:#b45309">${deg.toFixed(1)}°</text>`; }
        });
        O.forEach(o => { const g = P[o.id]; if (!g || !g.p) return; const free = o.t === 'pt' || o.t === 'on'; s += `<g class="h${sel === o ? ' is-sel' : ''}" data-id="${o.id}"><circle cx="${g.p[0]}" cy="${g.p[1]}" r="${free ? 7 : 5.5}" fill="${free ? COL[o.t] : '#fff'}" stroke="${COL[o.t]}" stroke-width="2.5"/><text x="${g.p[0] + 10}" y="${g.p[1] - 10}">${o.name}</text></g>`; });
        pend.forEach(id => { const g = P[id]; if (g && g.p) s += `<circle cx="${g.p[0]}" cy="${g.p[1]}" r="12" fill="none" stroke="var(--accent,#c8341f)" stroke-width="2" stroke-dasharray="4 3"/>`; });
        svg.innerHTML = s; measure();
      }
      const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]) / 30; // 30 px = 1 unit on the grid
      function measure() {
        const rows = [], N = id => (O.find(o => o.id === id) || {}).name || '?';
        O.forEach(o => { const g = P[o.id]; if (!g) return;
          if (o.t === 'seg') rows.push(`<tr><th>${T('Segment', 'قطعة')} ${N(o.a)}${N(o.b)}</th><td>${len(P[o.a].p, P[o.b].p).toFixed(2)} ${T('units', 'وحدة')}</td></tr>`);
          if (o.t === 'circ') rows.push(`<tr><th>${T('Circle centre', 'دائرة مركزها')} ${N(o.c)}</th><td>r = ${(g.C.r / 30).toFixed(2)}, ${T('circumference', 'المحيط')} ${(2 * Math.PI * g.C.r / 30).toFixed(2)}, ${T('area', 'المساحة')} ${(Math.PI * (g.C.r / 30) ** 2).toFixed(2)}</td></tr>`);
          if (o.t === 'ang') { const [a, b, cc] = g.A; const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [cc[0] - b[0], cc[1] - b[1]]; const deg = Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2))))) * 180 / Math.PI; rows.push(`<tr><th>${T('Angle', 'زاوية')} ${N(o.a)}${N(o.b)}${N(o.c)}</th><td>${deg.toFixed(1)}°</td></tr>`); }
          if (o.t === 'poly') { const ps = g.G; let A = 0, per = 0; ps.forEach((p, i) => { const q2 = ps[(i + 1) % ps.length]; A += p[0] * q2[1] - q2[0] * p[1]; per += len(p, q2); }); rows.push(`<tr><th>${T('Polygon', 'مضلع')} ${o.pts.map(N).join('')}</th><td>${T('area', 'المساحة')} ${(Math.abs(A) / 2 / 900).toFixed(2)} · ${T('perimeter', 'المحيط')} ${per.toFixed(2)}</td></tr>`); }
          if (o.t === 'perp' || o.t === 'par') rows.push(`<tr><th>${o.t === 'perp' ? T('Perpendicular', 'عمودي') : T('Parallel', 'موازٍ')} ${T('through', 'يمر بـ')} ${N(o.p)}</th><td>${T('angle with its line', 'الزاوية مع الخط')}: ${o.t === 'perp' ? '90.0°' : '0.0°'} ${T('(by construction)', '(بالإنشاء)')}</td></tr>`);
        });
        // live distance table between all named points (up to 6) — the evidence for conjectures
        const pts = O.filter(o => P[o.id] && P[o.id].p).slice(0, 7);
        const dist = pts.length >= 2 ? `<details><summary>${T('Distances between points', 'المسافات بين النقاط')}</summary><table><tr><th></th>${pts.map(o => `<th>${o.name}</th>`).join('')}</tr>${pts.map(a => `<tr><th>${a.name}</th>${pts.map(b2 => `<td>${a === b2 ? '·' : len(P[a.id].p, P[b2.id].p).toFixed(2)}</td>`).join('')}</tr>`).join('')}</table></details>` : '';
        $('.gc__out').innerHTML = (rows.length ? `<table>${rows.join('')}</table>` : `<p class="v26-hint">${T('Measurements of segments, circles, angles and polygons appear here and update as you drag.', 'تظهر القياسات هنا.')}</p>`) + dist;
      }
      function setTool(t) { tool = t; pend = []; host.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t))); $('.gc__help').textContent = HELP[t]; draw(); }
      function dependents(id) { const out = new Set([id]); let grew = true; while (grew) { grew = false; O.forEach(o => { if (out.has(o.id)) return; const refs = [o.a, o.b, o.c, o.p, o.l, o.on].concat(o.pts || []); if (refs.some(r => out.has(r))) { out.add(o.id); grew = true; } }); } return out; }
      svg.addEventListener('pointerdown', e => {
        e.preventDefault(); svg.focus({ preventScroll: true }); const [x, y] = pt(e);
        if (tool === 'move') { const h = hitPoint(x, y); if (h && (h.t === 'pt' || h.t === 'on')) { save(); drag = h; sel = h; svg.setPointerCapture(e.pointerId); } return; }
        if (tool === 'del') { const h = hitPoint(x, y) || hitCurve(x, y); if (h) { save(); const d = dependents(h.id); O = O.filter(o => !d.has(o.id)); draw(); } return; }
        save();
        if (tool === 'pt') { pointAt(x, y); draw(); return; }
        if (tool === 'seg' || tool === 'line' || tool === 'circ' || tool === 'mid') { const p = pointAt(x, y); pend.push(p.id); if (pend.length === 2) { if (pend[0] !== pend[1]) mk(tool === 'circ' ? { t: 'circ', c: pend[0], p: pend[1] } : tool === 'mid' ? { t: 'mid', a: pend[0], b: pend[1] } : { t: tool, a: pend[0], b: pend[1] }); pend = []; } draw(); return; }
        if (tool === 'perp' || tool === 'par') { if (!pend.length) { const L = hitCurve(x, y); if (L && P[L.id].L) { pend.push(L.id); } else { undo.pop(); $('.gc__help').textContent = T('First click a line or segment.', 'انقر خطاً أولاً.'); } } else { const p = pointAt(x, y); mk({ t: tool, l: pend[0], p: p.id }); pend = []; } draw(); return; }
        if (tool === 'int') { const a = hitCurve(x, y); if (!a) { undo.pop(); return; } const b = hitCurve(x, y, a); if (!b) { undo.pop(); $('.gc__help').textContent = T('Click exactly where two lines or circles cross.', 'انقر عند التقاطع.'); return; } const pts = inter(P[a.id], P[b.id]); if (!pts.length) { undo.pop(); return; } let k = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; k = i; } }); mk({ t: 'int', a: a.id, b: b.id, k }); draw(); return; }
        if (tool === 'ang') { const p = pointAt(x, y); pend.push(p.id); if (pend.length === 3) { mk({ t: 'ang', a: pend[0], b: pend[1], c: pend[2] }); pend = []; } draw(); return; }
        if (tool === 'poly') { const p = pointAt(x, y); if (pend.length >= 3 && p.id === pend[0]) { const ids = pend.slice(); ids.forEach((id, i) => mk({ t: 'seg', a: id, b: ids[(i + 1) % ids.length] })); mk({ t: 'poly', pts: ids }); pend = []; } else if (!pend.includes(p.id)) pend.push(p.id); draw(); }
      });
      svg.addEventListener('pointermove', e => { const [x, y] = pt(e); if (drag) { const o = drag; if (o.t === 'pt') { o.x = Math.max(4, Math.min(896, x)); o.y = Math.max(4, Math.min(516, y)); } else { const g = P[o.on]; if (g && g.L) { const L = g.L; o.s = ((x - L.x) * L.dx + (y - L.y) * L.dy) / (L.dx * L.dx + L.dy * L.dy); } else if (g && g.C) o.s = Math.atan2(y - g.C.y, x - g.C.x); } draw(); return; } const h = (tool === 'move' || tool === 'del') ? hitPoint(x, y) || (tool === 'del' ? hitCurve(x, y) : null) : null; if (h !== hover) { hover = h; svg.style.cursor = h ? (tool === 'del' ? 'not-allowed' : 'grab') : ''; draw(); } });
      const end = () => { drag = null; }; svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end); svg.addEventListener('lostpointercapture', end);
      // keyboard: Tab to the board, arrow keys nudge the selected free point (N/P choose the next/previous point)
      svg.addEventListener('keydown', e => { const frees = O.filter(o => o.t === 'pt'); if (!frees.length) return; if (e.key === 'n' || e.key === 'p') { const i = frees.indexOf(sel); sel = frees[(i + (e.key === 'n' ? 1 : frees.length - 1) + (i < 0 ? 1 : 0)) % frees.length]; draw(); e.preventDefault(); return; } if (!sel || sel.t !== 'pt') return; const st = e.shiftKey ? 15 : 3; const m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key]; if (m) { e.preventDefault(); sel.x += m[0]; sel.y += m[1]; draw(); } });
      function challenge(k) {
        save(); O = []; nid = 1; ptCount = 0; pend = [];
        if (k === 'mid' || k === 'tri') { const A = mk({ t: 'pt', x: 220, y: 420 }), B = mk({ t: 'pt', x: 700, y: 430 }), C = mk({ t: 'pt', x: 380, y: 110 }); [[A, B], [B, C], [C, A]].forEach(([a, b]) => mk({ t: 'seg', a: a.id, b: b.id }));
          if (k === 'mid') { const M1 = mk({ t: 'mid', a: A.id, b: C.id }), N1 = mk({ t: 'mid', a: B.id, b: C.id }); mk({ t: 'seg', a: M1.id, b: N1.id }); $('.gc__help').textContent = T('Compare the midsegment with AB in Measurements, then drag A, B or C. Is it always half as long — and parallel?', 'قارن.'); }
          else { mk({ t: 'ang', a: B.id, b: A.id, c: C.id }); mk({ t: 'ang', a: C.id, b: B.id, c: A.id }); mk({ t: 'ang', a: A.id, b: C.id, c: B.id }); $('.gc__help').textContent = T('Add the three angles in Measurements. Drag the vertices: does the total ever change?', 'اجمع الزوايا.'); } }
        if (k === 'bis') { const A = mk({ t: 'pt', x: 260, y: 300 }), B = mk({ t: 'pt', x: 640, y: 260 }); const s = mk({ t: 'seg', a: A.id, b: B.id }); const M1 = mk({ t: 'mid', a: A.id, b: B.id }); const pl = mk({ t: 'perp', l: s.id, p: M1.id }); compute(); const Q = mk({ t: 'on', on: pl.id, s: 0.9 }); mk({ t: 'seg', a: Q.id, b: A.id }); mk({ t: 'seg', a: Q.id, b: B.id }); $('.gc__help').textContent = T('Use Move to slide the purple point along the bisector, and drag A or B. Compare its two distances in Measurements.', 'حرّك النقطة.'); }
        if (k === 'semi') { const O1 = mk({ t: 'pt', x: 450, y: 280 }), R = mk({ t: 'pt', x: 650, y: 280 }); const ci = mk({ t: 'circ', c: O1.id, p: R.id }); compute(); const A = mk({ t: 'on', on: ci.id, s: Math.PI }), B = R; const C = mk({ t: 'on', on: ci.id, s: -1.1 }); mk({ t: 'seg', a: A.id, b: B.id }); mk({ t: 'seg', a: A.id, b: C.id }); mk({ t: 'seg', a: C.id, b: B.id }); mk({ t: 'ang', a: A.id, b: C.id, c: B.id }); $('.gc__help').textContent = T('Use Move to slide the point on the circle. Watch the angle at it.', 'حرّك النقطة.'); }
        setTool('move');
      }
      host.addEventListener('click', e => { const t = e.target.closest('[data-tool]'); if (t) setTool(t.dataset.tool); const ch = e.target.closest('[data-ch]'); if (ch) challenge(ch.dataset.ch);
        const a = e.target.closest('[data-a]'); if (a && a.dataset.a === 'undo' && undo.length) { const s = JSON.parse(undo.pop()); O = s.O; nid = s.nid; ptCount = s.ptCount; pend = []; draw(); } if (a && a.dataset.a === 'clear') { save(); O = []; pend = []; nid = 1; ptCount = 0; draw(); } });
      challenge('mid');
      return { play() {}, pause() {}, running: () => false, destroy() {},
        reset() { undo = []; challenge('mid'); }, preset() { this.reset(); },
        _state: () => ({ O: O.map(o => Object.assign({}, o)), P: JSON.parse(JSON.stringify(P)) }), _O: () => O, _draw: draw,
        observe() {
          compute(); const segs = O.filter(o => o.t === 'seg' && P[o.id]), mids = O.filter(o => o.t === 'mid');
          const ang = O.filter(o => o.t === 'ang' && P[o.id]).map(o => { const [a, b, cc] = P[o.id].A; const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [cc[0] - b[0], cc[1] - b[1]]; return Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2))) * 180 / Math.PI; });
          return { text: `Your construction has ${O.filter(o => P[o.id] && P[o.id].p).length} points, ${segs.length} segments, ${O.filter(o => o.t === 'circ').length} circles and ${mids.length} midpoints.${ang.length ? ` Angles: ${ang.map(a => a.toFixed(1) + '°').join(', ')}${ang.length === 3 ? ` — total **${ang.reduce((s, a) => s + a, 0).toFixed(1)}°**` : ''}.` : ''}`, predOk: i => i === 1 };
        }
      };
    }
  };
  LS.v26math = { parseEq, solution, fs };
})();
