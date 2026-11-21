/* ERLY Learning Studio — Mathematics universe (v24): nine experiences. Every graph is live: values glide on springs,
   points are draggable, and every number shown is computed from the current state. */
(function () {
  'use strict';
  const LS = window.LS, K = LS.kit, D = LS.exp.DEFS, T = LS.T, IL = LS.inline, esc = LS.esc;
  const { fmt, clamp } = K;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const readout = host => { const r = document.createElement('p'); r.className = 'kx-read'; r.setAttribute('aria-live', 'polite'); host.appendChild(r); return r; };
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

  /* ============ 1 · Function playground ============ */
  const COLS = ['blue', 'red', 'green'];
  D['fn-play'] = { wide: true,
    intro: 'Type up to three functions of **x**. Use the letters **a**, **b** and **c** anywhere, then move their sliders and watch the graphs reshape smoothly. Drag the graph to pan, scroll (or use ＋/−) to zoom, and move along the curve to read values.',
    predict: { q: 'Compared with y = x², the graph of y = (x − 3)² is…', options: ['moved 3 to the left', 'moved 3 to the right', 'moved 3 up', 'stretched by 3'] },
    explore: 'Type **(x − a)^2 + b** and move a and b. Then try **a·sin(b·x)**: which slider changes the height, and which the number of waves?',
    explain: 'Changing the **input** shifts a graph sideways: f(x − a) moves it **a to the right** (the opposite of what the sign suggests, because x must be a bigger to give the same value). Changing the **output** shifts it vertically: f(x) + b moves it **b up**. Multiplying the output stretches vertically (a·f(x)); multiplying the input squashes horizontally (f(bx)).',
    apply: [q('x-fp1', 'y = f(x + 2) is the graph of f moved…', ['2 right', '2 left', '2 up', '2 down'], 1, 'Inside the bracket: the opposite direction.'), q('x-fp2', 'y = 3 sin x compared with y = sin x has…', ['three times as many waves', 'three times the height', 'moved 3 up', 'no change'], 1, 'Multiplying the output stretches vertically.')],
    summary: ['f(x − a): shift right by a; f(x) + b: shift up by b.', 'a·f(x): vertical stretch; f(bx): horizontal squash.', 'Graphs are pictures of every input–output pair at once.'],
    build(host, c) {
      const S = K.stage(host, 800, 440); let fx = ['(x-a)^2+b', 'a*sin(b*x)', ''], fns = [], err = ['', '', ''], trace = null;
      const sa = K.spring(1), sb = K.spring(1), sc = K.spring(0), vx = K.spring(0, 10), vy = K.spring(0, 10), vs = K.spring(40, 10);
      const box = document.createElement('div'); box.className = 'kx-fns'; box.innerHTML = fx.map((f, i) => `<label class="kx-inline" style="--c:var(--k-${COLS[i]})"><b style="color:${K.pal()[COLS[i]]}">${'fgh'[i]}(x) =</b><input class="kx-input" data-fx="${i}" value="${esc(f)}" spellcheck="false" autocomplete="off" aria-label="${'fgh'[i]}(x)"></label><p class="kx-err" data-fe="${i}"></p>`).join(''); host.appendChild(box);
      const ctl = K.controls(host, [{ k: 'range', id: 'a', label: 'a', min: -5, max: 5, step: 0.1, val: 1, d: 1 }, { k: 'range', id: 'b', label: 'b', min: -5, max: 5, step: 0.1, val: 1, d: 1 }, { k: 'range', id: 'c', label: 'c', min: -5, max: 5, step: 0.1, val: 0, d: 1 }, { k: 'row' }, { k: 'chips', id: 'pre', label: T('Try', 'جرّب'), opts: [['p', 'a(x−b)²+c'], ['s', 'a·sin(bx)+c'], ['e', 'a·e^(bx)'], ['r', 'a/(x−b)+c'], ['ab', 'a|x−b|+c']], val: '' }, { k: 'btn', id: 'zi', label: '＋' }, { k: 'btn', id: 'zo', label: '−' }, { k: 'btn', id: 'home', label: T('Centre', 'توسيط') }, { k: 'end' }], (id, v) => {
        if (id === 'a') sa.set(v); if (id === 'b') sb.set(v); if (id === 'c') sc.set(v); if (id === 'zi') vs.set(clamp(vs.t * 1.4, 4, 400)); if (id === 'zo') vs.set(clamp(vs.t / 1.4, 4, 400)); if (id === 'home') { vx.set(0); vy.set(0); vs.set(40); }
        if (id === 'pre') { const P = { p: 'a(x-b)^2+c', s: 'a*sin(b*x)+c', e: 'a*e^(b*x)', r: 'a/(x-b)+c', ab: 'a*|x-b|+c' }; fx = [P[v], '', '']; box.querySelectorAll('[data-fx]').forEach((el, i) => { el.value = fx[i]; }); compile(); }
        M.kick(); c.onChange(); });
      const read = readout(host);
      function compile() { fns = fx.map((s, i) => { err[i] = ''; if (!s.trim()) return null; try { const f = K.expr(s, ['x', 'a', 'b', 'c']); f({ x: 1, a: 1, b: 1, c: 0 }); return f; } catch (e) { err[i] = e.message; return null; } }); box.querySelectorAll('[data-fe]').forEach((el, i) => { el.textContent = err[i]; }); }
      box.addEventListener('input', e => { const i = e.target.dataset.fx; if (i == null) return; fx[+i] = e.target.value; compile(); M.kick(); c.onChange(); });
      compile();
      let pan = null; S.cv.style.cursor = 'grab';
      S.cv.style.touchAction = 'none'; S.cv.addEventListener('pointerdown', e => { e.preventDefault(); const [x, y] = S.pt(e); pan = { x, y, cx: vx.t, cy: vy.t }; S.cv.setPointerCapture(e.pointerId); S.cv.classList.add('is-grab'); });
      S.cv.addEventListener('pointermove', e => { const [x, y] = S.pt(e); if (pan) { vx.set(pan.cx - (x - pan.x) / vs.v, true); vy.set(pan.cy + (y - pan.y) / vs.v, true); } trace = x; M.kick(); });
      S.cv.addEventListener('pointerup', () => { pan = null; S.cv.classList.remove('is-grab'); }); S.cv.addEventListener('pointerleave', () => { trace = null; M.kick(); });
      S.cv.addEventListener('wheel', e => { e.preventDefault(); vs.set(clamp(vs.t * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 4, 400)); M.kick(); }, { passive: false });
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); const hw = 400 / vs.v, hh = 220 / vs.v, xr = [vx.v - hw, vx.v + hw], yr = [vy.v - hh, vy.v + hh];
        const A = K.axes(G, [0, 0, 800, 440], xr, yr, { ticks: 10 }); const sc0 = { a: sa.v, b: sb.v, c: sc.v };
        fns.forEach((f, i) => { if (f) K.plot(G, A, x => f(Object.assign({ x }, sc0)), xr[0], xr[1], Pl[COLS[i]], 3, 700); });
        let line = '';
        if (trace != null && fns.some(Boolean)) { const x = A.IX(trace); G.strokeStyle = Pl.muted; G.setLineDash([4, 4]); G.beginPath(); G.moveTo(trace, 0); G.lineTo(trace, 440); G.stroke(); G.setLineDash([]);
          fns.forEach((f, i) => { if (!f) return; const y = f(Object.assign({ x }, sc0)); if (!isFinite(y)) return; G.fillStyle = Pl[COLS[i]]; G.beginPath(); G.arc(trace, A.Y(y), 6, 0, 7); G.fill(); K.tag(G, `${'fgh'[i]}(${fmt(x, 2)}) = ${fmt(y, 2)}`, trace + 70, A.Y(y) - 14, Pl[COLS[i]]); line += `${'fgh'[i]}(${fmt(x, 2)}) = **${fmt(y, 3)}**  `; }); }
        read.innerHTML = IL(line || `a = **${fmt(sa.v, 2)}**, b = **${fmt(sb.v, 2)}**, c = **${fmt(sc.v, 2)}**. View x from ${fmt(xr[0], 1)} to ${fmt(xr[1], 1)}. Move over the graph to trace.`);
      }).add(sa, sb, sc, vx, vy, vs);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); sa.set(1, true); sb.set(1, true); sc.set(0, true); vx.set(0, true); vy.set(0, true); vs.set(40, true); fx = ['(x-a)^2+b', 'a*sin(b*x)', '']; box.querySelectorAll('[data-fx]').forEach((el, i) => { el.value = fx[i]; }); compile(); M.draw(); },
        observe() { const f = fns[0]; const v = ctl.val; return { text: f ? `f(x) = ${esc(fx[0])} with a = ${fmt(v.a, 1)}, b = ${fmt(v.b, 1)}, c = ${fmt(v.c, 1)}: f(0) = **${fmt(f({ x: 0, a: v.a, b: v.b, c: v.c }), 3)}**, f(3) = **${fmt(f({ x: 3, a: v.a, b: v.b, c: v.c }), 3)}**. ${/x-a|x−a/.test(fx[0]) && v.a > 0 ? `Replacing x by (x − ${fmt(v.a, 1)}) moved the graph **${fmt(v.a, 1)} to the right**.` : ''}` : 'Type a function to explore.', predOk: p => p === 1 }; }, _fns: () => fns };
    }
  };

  /* ============ 2 · Quadratic lab ============ */
  D['quad-lab'] = { wide: true,
    intro: 'Every parabola can be written three ways. **Drag the vertex** to move it and **drag the orange handle** to stretch it; the three forms, the discriminant and the roots update as you go.',
    predict: { q: 'A parabola opens upwards and its vertex is **above** the x-axis. How many times does it cross the x-axis?', options: ['0', '1', '2', 'it depends on how wide it is'] },
    explore: 'Move the vertex down through the x-axis and watch the roots appear. Make **a** negative. Find a parabola that just touches the axis.',
    explain: '**Vertex form y = a(x − h)² + k** shows the turning point (h, k). Expanding gives **standard form y = ax² + bx + c**. The **discriminant b² − 4ac** counts the real roots: positive → two, zero → one (the vertex touches the axis), negative → none. When roots exist, **factored form y = a(x − r₁)(x − r₂)** shows where it crosses. If a > 0 and k > 0, the whole curve stays above the axis: no roots.',
    apply: [q('x-ql1', 'y = 2(x − 1)² − 8 crosses the x-axis at…', ['x = −1 and 3', 'x = 1 and −8', 'x = 2 and −2', 'nowhere'], 0, '(x − 1)² = 4 → x = 3 or −1.'), q('x-ql2', 'b² − 4ac = 0 means the parabola…', ['misses the axis', 'touches the axis once', 'crosses twice', 'is a straight line'], 1, 'One repeated root.')],
    summary: ['Vertex form a(x−h)²+k ↔ standard form ax²+bx+c.', 'Discriminant b² − 4ac: >0 two roots, =0 one, <0 none.', 'Factored form a(x−r₁)(x−r₂) shows the roots.'],
    build(host, c) {
      const S = K.stage(host, 800, 440), sa = K.spring(1), sh = K.spring(1), sk = K.spring(-4); let A0 = null;
      const ctl = K.controls(host, [{ k: 'range', id: 'a', label: 'a', min: -3, max: 3, step: 0.05, val: 1, d: 2 }, { k: 'range', id: 'h', label: 'h', min: -8, max: 8, step: 0.1, val: 1, d: 1 }, { k: 'range', id: 'k', label: 'k', min: -8, max: 8, step: 0.1, val: -4, d: 1 }], (id, v) => { ({ a: sa, h: sh, k: sk })[id].set(v); M.kick(); c.onChange(); });
      const forms = document.createElement('div'); forms.className = 'kx-cards'; host.appendChild(forms); const read = readout(host);
      K.drag(S, () => A0 ? [{ id: 'v', x: A0.X(sh.v), y: A0.Y(sk.v), r: 16 }, { id: 's', x: A0.X(sh.v + 1), y: A0.Y(sk.v + sa.v), r: 14 }] : [], (id, x, y) => { if (id === 'v') { const h = Math.round(A0.IX(x) * 10) / 10, k = Math.round(A0.IY(y) * 10) / 10; ctl.set('h', clamp(h, -8, 8)); ctl.set('k', clamp(k, -8, 8)); sh.set(clamp(h, -8, 8), true); sk.set(clamp(k, -8, 8), true); } else { const a = Math.round((A0.IY(y) - sk.v) * 20) / 20; ctl.set('a', clamp(a, -3, 3)); sa.set(clamp(a, -3, 3), true); } M.kick(); c.onChange(); });
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); const a = sa.v, h = sh.v, k = sk.v; A0 = K.axes(G, [0, 0, 800, 440], [-10, 10], [-11, 11], { ticks: 10 });
        K.plot(G, A0, x => a * (x - h) * (x - h) + k, -10, 10, Pl.blue, 3.5);
        const b = -2 * a * h, cc = a * h * h + k, D0 = b * b - 4 * a * cc, roots = Math.abs(a) < 1e-9 ? [] : D0 > 1e-9 ? [(-b - Math.sqrt(D0)) / (2 * a), (-b + Math.sqrt(D0)) / (2 * a)].sort((p, q2) => p - q2) : Math.abs(D0) <= 1e-9 ? [h] : [];
        G.strokeStyle = Pl.muted; G.setLineDash([4, 5]); G.beginPath(); G.moveTo(A0.X(h), 0); G.lineTo(A0.X(h), 440); G.stroke(); G.setLineDash([]);
        roots.forEach(r => { G.fillStyle = Pl.green; G.beginPath(); G.arc(A0.X(r), A0.Y(0), 7, 0, 7); G.fill(); K.tag(G, fmt(r, 2), A0.X(r), A0.Y(0) + 20, Pl.green); });
        G.fillStyle = Pl.red; G.beginPath(); G.arc(A0.X(h), A0.Y(k), 9, 0, 7); G.fill(); K.tag(G, `(${fmt(h, 1)}, ${fmt(k, 1)})`, A0.X(h) + 50, A0.Y(k) - 16, Pl.red);
        G.fillStyle = Pl.gold; G.beginPath(); G.arc(A0.X(h + 1), A0.Y(k + a), 7, 0, 7); G.fill();
        const sg = v => (v < 0 ? ' − ' : ' + ') + fmt(Math.abs(v), 2);
        forms.innerHTML = `<div class="kx-card"><small>${T('Vertex form', 'صيغة الرأس')}</small><div class="kx-mono">y = ${fmt(a, 2)}(x${sg(-h)})²${sg(k)}</div></div><div class="kx-card"><small>${T('Standard form', 'الصيغة القياسية')}</small><div class="kx-mono">y = ${fmt(a, 2)}x²${sg(b)}x${sg(cc)}</div></div><div class="kx-card"><small>${T('Factored form', 'الصيغة المحللة')}</small><div class="kx-mono">${roots.length === 2 ? `y = ${fmt(a, 2)}(x${sg(-roots[0])})(x${sg(-roots[1])})` : roots.length === 1 ? `y = ${fmt(a, 2)}(x${sg(-roots[0])})²` : T('no real factors', 'لا عوامل حقيقية')}</div></div><div class="kx-card"><small>${T('Discriminant b² − 4ac', 'المميز')}</small><div class="kx-mono">${fmt(D0, 2)} → ${roots.length} ${T('real root(s)', 'جذر حقيقي')}</div></div>`;
        read.innerHTML = IL(roots.length ? `Roots at **x = ${roots.map(r => fmt(r, 2)).join('** and **x = ')}**.` : `No real roots: the parabola ${a > 0 ? 'stays above' : 'stays below'} the x-axis.`);
      }).add(sa, sh, sk);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); sa.set(1, true); sh.set(1, true); sk.set(-4, true); M.draw(); },
        observe() { const { a, h, k } = ctl.val, b = -2 * a * h, cc = a * h * h + k, D0 = b * b - 4 * a * cc; return { text: `y = ${fmt(a, 2)}(x ${h < 0 ? '+' : '−'} ${fmt(Math.abs(h), 1)})² ${k < 0 ? '−' : '+'} ${fmt(Math.abs(k), 1)} = ${fmt(a, 2)}x² ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b), 2)}x ${cc < 0 ? '−' : '+'} ${fmt(Math.abs(cc), 2)}; discriminant **${fmt(D0, 2)}** → **${D0 > 1e-9 ? 2 : Math.abs(D0) <= 1e-9 ? 1 : 0}** real root(s).`, predOk: p => p === 0 }; } };
    }
  };

  /* ============ 3 · Unit circle ============ */
  D['unit-circle'] = { wide: true,
    intro: 'A point travels round a circle of radius 1. Its **x-coordinate is cos θ** and its **y-coordinate is sin θ**. Drag the point (or press Play) and watch the two waves being drawn as the angle grows.',
    predict: { q: 'Between 90° and 180°, sin θ is ___ and cos θ is ___.', options: ['positive, positive', 'positive, negative', 'negative, positive', 'negative, negative'] },
    explore: 'Stop the point in each quarter of the circle and note the signs. Where is tan θ undefined?',
    explain: 'On the unit circle the point at angle θ is **(cos θ, sin θ)**. As θ goes round, the height traces a **sine wave** and the horizontal position a **cosine wave** — the same shape shifted by 90°. In the second quadrant (90°–180°) the point is up and to the left: **sin positive, cos negative**. tan θ = sin θ / cos θ is undefined where cos θ = 0 (90°, 270°). Because x² + y² = 1, **sin²θ + cos²θ = 1** always.',
    apply: [q('x-uc1', 'cos 180° equals…', ['1', '0', '−1', 'undefined'], 2, 'The point is at (−1, 0).'), q('x-uc2', 'For every angle, sin²θ + cos²θ equals…', ['0', '1', '2', 'it varies'], 1, 'Pythagoras on the unit circle.')],
    summary: ['Point on the unit circle = (cos θ, sin θ).', 'Signs by quadrant: ASTC.', 'sin²θ + cos²θ = 1.'],
    build(host, c) {
      const S = K.stage(host, 800, 380); const sth = K.spring(40, 12); let spin = false; const quads = new Set();
      const ctl = K.controls(host, [{ k: 'range', id: 'th', label: 'θ', min: 0, max: 360, step: 1, val: 40, unit: '°' }, { k: 'row' }, { k: 'toggle', id: 'spin', label: T('Keep turning', 'استمر بالدوران'), val: false }, { k: 'end' }], (id, v) => { if (id === 'th') sth.set(v); if (id === 'spin') { spin = v; if (v) M.play(); else M.pause(); } M.kick(); c.onChange(); });
      const read = readout(host); const cx = 170, cy = 190, R = 130;
      K.drag(S, () => [{ id: 'p', x: cx + R * Math.cos(sth.v * Math.PI / 180), y: cy - R * Math.sin(sth.v * Math.PI / 180), r: 18 }], (id, x, y) => { let a = Math.atan2(cy - y, x - cx) * 180 / Math.PI; if (a < 0) a += 360; ctl.set('th', Math.round(a)); sth.set(a, true); M.kick(); c.onChange(); });
      const M = K.motor(c, host, dt => {
        if (spin) { sth.v = (sth.v + dt * 40) % 360; sth.t = sth.v; ctl.set('th', Math.round(sth.v)); }
        const Pl = K.pal(), G = S.g, th = sth.v, r = th * Math.PI / 180, px = cx + R * Math.cos(r), py = cy - R * Math.sin(r); S.clear(Pl.bg2); quads.add(Math.floor((th % 360) / 90));
        G.strokeStyle = Pl.line; G.lineWidth = 1; G.beginPath(); G.moveTo(cx - R - 20, cy); G.lineTo(cx + R + 20, cy); G.moveTo(cx, cy - R - 20); G.lineTo(cx, cy + R + 20); G.stroke();
        G.strokeStyle = Pl.muted; G.lineWidth = 2; G.beginPath(); G.arc(cx, cy, R, 0, 7); G.stroke(); G.strokeStyle = Pl.gold; G.lineWidth = 2; G.beginPath(); G.arc(cx, cy, 26, 0, -r, true); G.stroke();
        G.strokeStyle = Pl.ink; G.lineWidth = 2.5; G.beginPath(); G.moveTo(cx, cy); G.lineTo(px, py); G.stroke();
        G.strokeStyle = Pl.red; G.lineWidth = 4; G.beginPath(); G.moveTo(px, cy); G.lineTo(px, py); G.stroke(); G.strokeStyle = Pl.blue; G.beginPath(); G.moveTo(cx, cy); G.lineTo(px, cy); G.stroke();
        G.fillStyle = Pl.ink; G.beginPath(); G.arc(px, py, 9, 0, 7); G.fill();
        const A = K.axes(G, [360, 40, 420, 300], [0, 360], [-1.25, 1.25], { xstep: 90, ystep: 0.5, xl: 'θ°' });
        K.plot(G, A, x => Math.sin(x * Math.PI / 180), 0, th, Pl.red, 3); K.plot(G, A, x => Math.cos(x * Math.PI / 180), 0, th, Pl.blue, 3);
        G.globalAlpha = 0.18; K.plot(G, A, x => Math.sin(x * Math.PI / 180), th, 360, Pl.red, 2); K.plot(G, A, x => Math.cos(x * Math.PI / 180), th, 360, Pl.blue, 2); G.globalAlpha = 1;
        G.strokeStyle = Pl.red; G.setLineDash([3, 4]); G.beginPath(); G.moveTo(px, py); G.lineTo(A.X(th), A.Y(Math.sin(r))); G.stroke(); G.setLineDash([]);
        K.text(G, `sin θ = ${fmt(Math.sin(r), 3)}`, 370, 28, { c: Pl.red, w: 700 }); K.text(G, `cos θ = ${fmt(Math.cos(r), 3)}`, 540, 28, { c: Pl.blue, w: 700 });
        const tn = Math.abs(Math.cos(r)) < 1e-3 ? T('undefined', 'غير معرف') : fmt(Math.tan(r), 3);
        read.innerHTML = IL(`θ = **${Math.round(th)}°** (${fmt(r, 3)} rad): point (**${fmt(Math.cos(r), 3)}**, **${fmt(Math.sin(r), 3)}**), tan θ = **${tn}**, sin²θ + cos²θ = ${fmt(Math.sin(r) ** 2 + Math.cos(r) ** 2, 3)}.`);
      }).add(sth);
      M.draw();
      return { play() { spin = true; ctl.set('spin', true); M.play(); }, pause() { spin = false; ctl.set('spin', false); M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); },
        reset() { ctl.reset(); spin = false; sth.set(40, true); quads.clear(); M.pause(); },
        observe() { const th = ctl.val.th, r = th * Math.PI / 180; return { text: `At **${th}°**: sin = ${fmt(Math.sin(r), 3)}, cos = ${fmt(Math.cos(r), 3)}. You have visited **${quads.size} of 4** quadrants.${th > 90 && th < 180 ? ' In this quadrant sin is positive and cos negative.' : ''}`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 4 · Transformation explorer ============ */
  const BASE = [[1, 1], [4, 1], [4, 2], [2, 2], [2, 4], [1, 4]];
  D.transform = { wide: true,
    intro: 'An L-shape sits on a grid. Apply **translations, reflections, rotations and enlargements** and watch it move there smoothly. The faint copy shows where it started; the matrix shows what each transformation does to every point.',
    predict: { q: 'Reflect the shape in the x-axis, then in the y-axis. The result is the same as…', options: ['a translation', 'a rotation of 180° about the origin', 'an enlargement by 2', 'nothing — it is back where it started'] },
    explore: 'Reflect in the x-axis, then in the y-axis. Compare with a single 180° rotation. Try enlarging by −1.',
    explain: 'Each transformation sends a point (x, y) somewhere new. Reflection in the x-axis: (x, −y); in the y-axis: (−x, y). Doing both gives (−x, −y) — exactly a **rotation of 180°** about the origin, and also an **enlargement by −1**. Rotations and reflections keep lengths and angles (the shape is congruent); enlargements scale lengths by k and areas by k².',
    apply: [q('x-tr1', 'Rotating (3, 1) by 90° anticlockwise about the origin gives…', ['(1, 3)', '(−1, 3)', '(−3, 1)', '(3, −1)'], 1, '(x, y) → (−y, x).'), q('x-tr2', 'Enlarging a shape by scale factor 3 multiplies its area by…', ['3', '6', '9', '27'], 2, 'Area scales by k².')],
    summary: ['Reflections: (x, −y) and (−x, y).', 'Two reflections in perpendicular axes = rotation of 180°.', 'Enlargement by k: lengths × k, area × k².'],
    build(host, c) {
      const S = K.stage(host, 800, 440); let pts = BASE.map(p => p.slice()), from = pts, to = pts, t0 = 0, hist = [], Mx = [[1, 0], [0, 1]], tv = [0, 0];
      const ctl = K.controls(host, [{ k: 'btn', id: 'rx', label: T('Reflect in x-axis', 'انعكاس في س') }, { k: 'btn', id: 'ry', label: T('Reflect in y-axis', 'انعكاس في ص') }, { k: 'btn', id: 'rxy', label: T('Reflect in y = x', 'انعكاس في ص=س') }, { k: 'btn', id: 'r90', label: T('Rotate 90° ↺', 'دوران 90°') }, { k: 'btn', id: 'r180', label: T('Rotate 180°', 'دوران 180°') }, { k: 'row' }, { k: 'btn', id: 'e2', label: T('Enlarge ×2', 'تكبير ×2') }, { k: 'btn', id: 'eh', label: T('Enlarge ×½', 'تصغير ×½') }, { k: 'btn', id: 'em', label: T('Enlarge ×−1', 'تكبير ×−1') }, { k: 'btn', id: 'tr', label: T('Translate (−2, −3)', 'انسحاب') }, { k: 'btn', id: 'undo', label: T('Undo', 'تراجع') }, { k: 'btn', id: 'start', label: T('Start again', 'من جديد') }, { k: 'end' }], id => {
        const OPS = { rx: [[1, 0], [0, -1]], ry: [[-1, 0], [0, 1]], rxy: [[0, 1], [1, 0]], r90: [[0, -1], [1, 0]], r180: [[-1, 0], [0, -1]], e2: [[2, 0], [0, 2]], eh: [[0.5, 0], [0, 0.5]], em: [[-1, 0], [0, -1]] };
        if (id === 'undo') { if (!hist.length) return; const h = hist.pop(); go(h.pts, h.M, h.tv, false); return; }
        if (id === 'start') { hist = []; go(BASE.map(p => p.slice()), [[1, 0], [0, 1]], [0, 0], false); return; }
        hist.push({ pts, M: Mx, tv, op: id });
        if (id === 'tr') return go(pts.map(([x, y]) => [x - 2, y - 3]), Mx, [tv[0] - 2, tv[1] - 3], true);
        const m = OPS[id]; const nM = [[m[0][0] * Mx[0][0] + m[0][1] * Mx[1][0], m[0][0] * Mx[0][1] + m[0][1] * Mx[1][1]], [m[1][0] * Mx[0][0] + m[1][1] * Mx[1][0], m[1][0] * Mx[0][1] + m[1][1] * Mx[1][1]]], nt = [m[0][0] * tv[0] + m[0][1] * tv[1], m[1][0] * tv[0] + m[1][1] * tv[1]];
        go(pts.map(([x, y]) => [m[0][0] * x + m[0][1] * y, m[1][0] * x + m[1][1] * y]), nM, nt, true);
      });
      const read = readout(host);
      function go(np, nM, nt, rec) { from = pts; to = np; pts = np; Mx = nM; tv = nt; t0 = performance.now(); M.play(); c.onChange(); }
      const area = P => Math.abs(P.reduce((s, [x, y], i) => { const [x2, y2] = P[(i + 1) % P.length]; return s + x * y2 - x2 * y; }, 0) / 2);
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); const A = K.axes(G, [0, 0, 800, 440], [-11, 11], [-6.05, 6.05], { xstep: 1, ystep: 1, ticks: 22 });
        const k = K.reduced() ? 1 : clamp((performance.now() - t0) / 650, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const cur = from.map((p, i) => [K.lerp(p[0], to[i][0], e), K.lerp(p[1], to[i][1], e)]);
        const poly = (P, fill, stroke, alpha) => { G.globalAlpha = alpha; G.beginPath(); P.forEach(([x, y], i) => i ? G.lineTo(A.X(x), A.Y(y)) : G.moveTo(A.X(x), A.Y(y))); G.closePath(); G.fillStyle = fill; G.fill(); G.strokeStyle = stroke; G.lineWidth = 2; G.stroke(); G.globalAlpha = 1; };
        poly(BASE, Pl.grey, Pl.grey, 0.25); poly(cur, Pl.blue, Pl.ink, 0.7);
        cur.forEach(([x, y], i) => { G.fillStyle = i ? Pl.ink : Pl.red; G.beginPath(); G.arc(A.X(x), A.Y(y), i ? 3.5 : 6, 0, 7); G.fill(); });
        K.text(G, `[${fmt(Mx[0][0], 1)}  ${fmt(Mx[0][1], 1)}]`, 20, 30, { w: 700, s: 15 }); K.text(G, `[${fmt(Mx[1][0], 1)}  ${fmt(Mx[1][1], 1)}]`, 20, 52, { w: 700, s: 15 }); K.text(G, `+ (${fmt(tv[0], 1)}, ${fmt(tv[1], 1)})`, 120, 42, { c: Pl.muted, w: 600 });
        const det = Mx[0][0] * Mx[1][1] - Mx[0][1] * Mx[1][0];
        read.innerHTML = IL(`Red corner now at **(${fmt(pts[0][0], 1)}, ${fmt(pts[0][1], 1)})** (started at (1, 1)). Area **${fmt(area(pts), 2)}** (started ${fmt(area(BASE), 2)}, ×${fmt(Math.abs(det), 2)}). ${det < 0 ? 'The shape is **mirrored** (determinant negative).' : 'Same orientation as the start.'}`);
        if (k >= 1 && M.playing()) M.pause();
      });
      M.draw();
      return { destroy() { S.destroy(); }, reset() { hist = []; pts = from = to = BASE.map(p => p.slice()); Mx = [[1, 0], [0, 1]]; tv = [0, 0]; M.draw(); },
        observe() { const ops = hist.map(h => h.op), is180 = Mx[0][0] === -1 && Mx[1][1] === -1 && !Mx[0][1] && !Mx[1][0]; return { text: `You applied ${ops.length} transformation(s). The combined matrix is [${Mx.map(r => r.map(v => fmt(v, 1)).join(', ')).join(' ; ')}].${is180 ? ' That matrix is exactly a **rotation of 180°** (and an enlargement by −1).' : ''}`, predOk: is180 ? p => p === 1 : null }; }, _pts: () => pts };
    }
  };

  /* ============ 5 · Probability lab ============ */
  D.probability = { wide: true,
    intro: 'Toss coins or roll dice — many times, fast. The bars show how often each result happened; the dashed lines show what theory predicts. Watch what happens to the gap as the number of trials grows.',
    predict: { q: 'Rolling two dice and adding them, the most likely total is…', options: ['2', '6', '7', '12'] },
    explore: 'Roll the two dice 10 times, then 100, then 1,000. How close are the bars to the dashed lines each time?',
    explain: 'For a fair die each face has probability 1/6. For the **sum of two dice** there are 36 equally likely pairs, and **6 of them make 7** (1+6, 2+5, …, 6+1), so P(7) = 6/36 = 1/6 — more than any other total; 2 and 12 have only one way each (1/36). Small samples wobble; as trials increase, relative frequencies settle towards the theoretical probabilities — the **law of large numbers**. The results here come from your browser’s random-number generator.',
    apply: [q('x-pb1', 'P(sum of two dice = 2) is…', ['1/6', '1/12', '1/36', '2/36'], 2, 'Only 1+1.'), q('x-pb2', 'After 10 coin tosses you get 7 heads. This shows the coin is…', ['definitely biased', 'not necessarily biased — small samples vary', 'fair', 'impossible'], 1, 'Small samples vary a lot.')],
    summary: ['Theoretical probability counts equally likely outcomes.', 'Two dice: 7 is most likely (6/36).', 'Relative frequency approaches probability as trials grow.'],
    build(host, c) {
      const S = K.stage(host, 800, 380); const EXP = { coin: { o: ['H', 'T'], p: () => [0.5, 0.5], roll: () => Math.random() < 0.5 ? 0 : 1 }, die: { o: ['1', '2', '3', '4', '5', '6'], p: () => Array(6).fill(1 / 6), roll: () => Math.floor(Math.random() * 6) }, two: { o: Array.from({ length: 11 }, (_, i) => String(i + 2)), p: () => Array.from({ length: 11 }, (_, i) => (6 - Math.abs(i - 5)) / 36), roll: () => Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) } };
      let ex = 'two', counts = Array(11).fill(0), n = 0, queue = 0; const bars = Array.from({ length: 11 }, () => K.spring(0, 10));
      const ctl = K.controls(host, [{ k: 'chips', id: 'ex', label: T('Experiment', 'التجربة'), opts: [['coin', T('Coin', 'قطعة نقود')], ['die', T('One die', 'نرد واحد')], ['two', T('Sum of two dice', 'مجموع نردين')]], val: 'two' }, { k: 'row' }, { k: 'btn', id: '1', label: '+1' }, { k: 'btn', id: '10', label: '+10' }, { k: 'btn', id: '100', label: '+100', accent: true }, { k: 'btn', id: '1000', label: '+1000' }, { k: 'btn', id: 'clr', label: T('Clear', 'امسح') }, { k: 'end' }], (id, v) => {
        if (id === 'ex') { ex = v; clear(); } else if (id === 'clr') clear(); else { queue += +id; M.play(); } c.onChange(); });
      const read = readout(host);
      function clear() { counts = Array(EXP[ex].o.length).fill(0); n = 0; queue = 0; bars.forEach(b => b.set(0, true)); M.draw(); }
      const M = K.motor(c, host, () => {
        if (queue > 0) { const k = Math.min(queue, Math.max(1, Math.ceil(queue / 12))); for (let i = 0; i < k; i++) { counts[EXP[ex].roll()]++; n++; } queue -= k; }
        const Pl = K.pal(), G = S.g, E = EXP[ex], P = E.p(), m = E.o.length; S.clear(Pl.bg2);
        const top = Math.max(...P) * 1.7; const A = K.axes(G, [60, 20, 720, 300], [0, m], [0, top], { grid: true, ticks: 5, yl: T('relative frequency', 'التكرار النسبي'), xstep: 100 });
        const bw = 720 / m;
        E.o.forEach((o, i) => { const f = n ? counts[i] / n : 0; bars[i].set(f); const h = bars[i].v; G.fillStyle = Pl.blue; G.globalAlpha = 0.85; G.fillRect(60 + i * bw + bw * 0.15, A.Y(h), bw * 0.7, A.Y(0) - A.Y(h)); G.globalAlpha = 1;
          G.strokeStyle = Pl.red; G.lineWidth = 2.5; G.setLineDash([6, 4]); G.beginPath(); G.moveTo(60 + i * bw + bw * 0.08, A.Y(P[i])); G.lineTo(60 + i * bw + bw * 0.92, A.Y(P[i])); G.stroke(); G.setLineDash([]);
          K.text(G, o, 60 + i * bw + bw / 2, 342, { a: 'center', w: 700 }); if (n) K.text(G, String(counts[i]), 60 + i * bw + bw / 2, A.Y(h) - 6, { a: 'center', s: 11, c: Pl.muted }); });
        const dev = n ? Math.max(...E.o.map((_, i) => Math.abs(counts[i] / n - P[i]))) : 0;
        read.innerHTML = IL(n ? `**${n}** trials. Largest gap between a bar and its theoretical value: **${fmt(dev * 100, 1)} percentage points**. ${ex === 'two' ? `Sevens: ${counts[5]} (${fmt(counts[5] / n * 100, 1)}%; theory 16.7%).` : ''}` : 'Press +10 or +100 to start.');
        if (M.playing() && !queue && !bars.some(b => Math.abs(b.t - b.v) > 1e-4)) M.pause();
      }).add(...bars);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); ex = 'two'; clear(); }, _state: () => ({ n, counts: counts.slice(), queue }),
        observe() { const E = EXP[ex], P = E.p(); const dev = n ? Math.max(...E.o.map((_, i) => Math.abs(counts[i] / n - P[i]))) : null; return { text: n ? `After **${n}** trials of “${ex === 'two' ? 'sum of two dice' : ex === 'die' ? 'one die' : 'coin'}”, the biggest gap from theory is **${fmt(dev * 100, 1)} points**. ${ex === 'two' ? `The most frequent total so far: **${E.o[counts.indexOf(Math.max(...counts))]}**.` : ''}` : 'No trials yet.', predOk: ex === 'two' && n ? p => p === 2 : null }; } };
    }
  };

  /* ============ 6 · Statistics visualizer ============ */
  D.stats = { wide: true,
    intro: 'Nine test scores sit on a number line. **Drag any point** and the mean, median, range and standard deviation update instantly; the box plot redraws below. Add an outlier and see which averages it drags with it.',
    predict: { q: 'One score changes from 70 to 100. Which changes: the mean, the median, or both?', options: ['only the mean', 'only the median', 'both', 'neither'] },
    explore: 'Drag the highest point far to the right. Watch the mean (triangle) and median (square). Then cluster all points together and watch the standard deviation.',
    explain: 'The **mean** uses every value, so an extreme value (**outlier**) pulls it strongly. The **median** is the middle value once sorted, so moving the largest value further out **does not change it**. The **range** (max − min) and **standard deviation** measure spread; the SD is the typical distance from the mean. The **box plot** shows the median, the quartiles (middle 50%) and the extremes.',
    apply: [q('x-st1', 'Data: 2, 3, 3, 4, 100. The best typical value is the…', ['mean (22.4)', 'median (3)', 'range', 'maximum'], 1, 'The outlier distorts the mean.'), q('x-st2', 'All values are equal. The standard deviation is…', ['1', '0', 'the mean', 'undefined'], 1, 'No spread at all.')],
    summary: ['Mean: affected by every value, including outliers.', 'Median: middle value; resistant to outliers.', 'Range, IQR, SD measure spread.'],
    build(host, c) {
      const S = K.stage(host, 800, 300); const START = [42, 55, 58, 61, 64, 66, 70, 74, 81]; let d = START.slice(); const smn = K.spring(63), smd = K.spring(64);
      const ctl = K.controls(host, [{ k: 'btn', id: 'add', label: T('Add a point', 'أضف نقطة') }, { k: 'btn', id: 'rem', label: T('Remove last', 'احذف الأخيرة') }, { k: 'btn', id: 'out', label: T('Add an outlier (100)', 'أضف قيمة شاذة') }, { k: 'btn', id: 'reset', label: T('Original data', 'البيانات الأصلية') }], id => { if (id === 'add') d.push(50 + Math.round(Math.random() * 30)); if (id === 'rem' && d.length > 2) d.pop(); if (id === 'out') d.push(100); if (id === 'reset') d = START.slice(); M.kick(); c.onChange(); });
      const read = readout(host); const X = v => 40 + v / 100 * 720;
      const st = () => { const s = d.slice().sort((a, b) => a - b), n = s.length, mean = s.reduce((a, b) => a + b, 0) / n, med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2, q1 = quant(s, 0.25), q3 = quant(s, 0.75), sd = Math.sqrt(s.reduce((a, v) => a + (v - mean) ** 2, 0) / n); return { s, n, mean, med, q1, q3, sd, min: s[0], max: s[n - 1] }; };
      function quant(s, p) { const pos = (s.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos); return s[lo] + (s[hi] - s[lo]) * (pos - lo); }
      const ys = i => 70 + (i % 3) * 18;
      K.drag(S, () => d.map((v, i) => ({ id: i, x: X(v), y: ys(i), r: 12 })), (i, x) => { d[i] = Math.round(clamp((x - 40) / 720 * 100, 0, 100)); M.kick(); c.onChange(); });
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g, r = st(); smn.set(r.mean); smd.set(r.med); S.clear(Pl.bg2);
        G.strokeStyle = Pl.muted; G.lineWidth = 1.5; G.beginPath(); G.moveTo(X(0), 130); G.lineTo(X(100), 130); G.stroke(); for (let v = 0; v <= 100; v += 10) { G.beginPath(); G.moveTo(X(v), 125); G.lineTo(X(v), 135); G.stroke(); K.text(G, String(v), X(v), 152, { a: 'center', s: 11, c: Pl.muted }); }
        d.forEach((v, i) => { G.fillStyle = Pl.blue; G.beginPath(); G.arc(X(v), ys(i), 10, 0, 7); G.fill(); G.strokeStyle = Pl.blue; G.globalAlpha = 0.3; G.beginPath(); G.moveTo(X(v), ys(i) + 10); G.lineTo(X(v), 128); G.stroke(); G.globalAlpha = 1; });
        G.fillStyle = Pl.red; G.beginPath(); G.moveTo(X(smn.v), 108); G.lineTo(X(smn.v) - 9, 124); G.lineTo(X(smn.v) + 9, 124); G.fill(); K.tag(G, `mean ${fmt(smn.v, 1)}`, X(smn.v), 30, Pl.red);
        G.fillStyle = Pl.green; G.fillRect(X(smd.v) - 7, 136, 14, 14); K.tag(G, `median ${fmt(smd.v, 1)}`, X(smd.v), 175, Pl.green);
        const by = 230; G.strokeStyle = Pl.ink; G.lineWidth = 2; G.beginPath(); G.moveTo(X(r.min), by); G.lineTo(X(r.q1), by); G.moveTo(X(r.q3), by); G.lineTo(X(r.max), by); G.moveTo(X(r.min), by - 12); G.lineTo(X(r.min), by + 12); G.moveTo(X(r.max), by - 12); G.lineTo(X(r.max), by + 12); G.stroke();
        G.fillStyle = Pl.violet; G.globalAlpha = 0.25; G.fillRect(X(r.q1), by - 22, X(r.q3) - X(r.q1), 44); G.globalAlpha = 1; G.strokeRect(X(r.q1), by - 22, X(r.q3) - X(r.q1), 44); G.strokeStyle = Pl.green; G.lineWidth = 3; G.beginPath(); G.moveTo(X(r.med), by - 22); G.lineTo(X(r.med), by + 22); G.stroke();
        K.text(G, T('box plot', 'مخطط الصندوق'), 40, 290, { c: Pl.muted, s: 11 });
        read.innerHTML = IL(`n = **${r.n}** · mean **${fmt(r.mean, 2)}** · median **${fmt(r.med, 1)}** · range **${r.max - r.min}** · IQR **${fmt(r.q3 - r.q1, 1)}** · standard deviation **${fmt(r.sd, 2)}** (population).`);
      }).add(smn, smd);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { d = START.slice(); M.draw(); }, _stats: st, _set: v => { d = v.slice(); M.draw(); },
        observe() { const r = st(); return { text: `Mean **${fmt(r.mean, 2)}**, median **${fmt(r.med, 1)}**: ${Math.abs(r.mean - r.med) > 3 ? `the mean has been pulled **${r.mean > r.med ? 'up' : 'down'}** by ${fmt(Math.abs(r.mean - r.med), 1)} relative to the median — an extreme value moves the mean, not the median.` : 'they are close, so the data is roughly balanced.'}`, predOk: p => p === 0 }; } };
    }
  };

  /* ============ 7 · Fraction visualizer ============ */
  D.fractions = { wide: true,
    intro: 'Two fractions, drawn as bars of the same length. Change the tops and bottoms. The model compares them, finds a **common denominator** by cutting both bars into equal smaller pieces, and adds them.',
    predict: { q: 'Which is bigger: 3/4 or 5/7?', options: ['3/4', '5/7', 'they are equal', 'impossible to tell'] },
    explore: 'Set 3/4 and 5/7. Watch both bars re-cut into 28ths. Then find two different-looking fractions that are equal.',
    explain: 'To compare or add fractions with different denominators, cut both wholes into the **same number of equal pieces**: the **lowest common multiple** of the denominators. 3/4 = 21/28 and 5/7 = 20/28, so **3/4 is bigger** by 1/28. Adding: 21/28 + 20/28 = 41/28 = 1 13/28. Equivalent fractions are the same amount cut differently (2/4 = 3/6).',
    apply: [q('x-frac1', '2/3 + 1/4 =', ['3/7', '11/12', '3/12', '9/12'], 1, '8/12 + 3/12.'), q('x-frac2', 'Which is equal to 3/5?', ['5/3', '6/10', '3/10', '9/25'], 1, 'Multiply top and bottom by 2.')],
    summary: ['Compare or add by using a common denominator (LCM).', 'Equivalent fractions: same amount, different cuts.', 'Simplify by dividing top and bottom by their HCF.'],
    build(host, c) {
      const S = K.stage(host, 800, 300); let a = 3, b = 4, cc = 5, dd = 7; const cut = K.spring(0, 6);
      const ctl = K.controls(host, [{ k: 'range', id: 'a', label: T('First: top', 'الأول: البسط'), min: 0, max: 12, step: 1, val: 3 }, { k: 'range', id: 'b', label: T('First: bottom', 'الأول: المقام'), min: 1, max: 12, step: 1, val: 4 }, { k: 'range', id: 'c', label: T('Second: top', 'الثاني: البسط'), min: 0, max: 12, step: 1, val: 5 }, { k: 'range', id: 'd', label: T('Second: bottom', 'الثاني: المقام'), min: 1, max: 12, step: 1, val: 7 }, { k: 'row' }, { k: 'toggle', id: 'cut', label: T('Show the common denominator', 'أظهر المقام المشترك'), val: true }, { k: 'end' }], (id, v) => { if (id === 'a') a = v; if (id === 'b') b = v; if (id === 'c') cc = v; if (id === 'd') dd = v; if (id === 'cut') cut.set(v ? 1 : 0); M.kick(); c.onChange(); });
      cut.set(1); const read = readout(host);
      const lcm = (x, y) => x / gcd(x, y) * y;
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g, L = lcm(b, dd); S.clear(Pl.bg2);
        const bar = (y, n, dn, col, label) => { const w = 640, x0 = 120; G.fillStyle = Pl.bg; G.fillRect(x0, y, w, 50); G.fillStyle = col; G.globalAlpha = 0.8; G.fillRect(x0, y, w * Math.min(n / dn, 1), 50); if (n > dn) { G.globalAlpha = 0.45; G.fillRect(x0, y + 56, w * Math.min((n - dn) / dn, 1), 10); } G.globalAlpha = 1;
          G.strokeStyle = Pl.ink; G.lineWidth = 2; G.strokeRect(x0, y, w, 50); G.lineWidth = 1.5; for (let i = 1; i < dn; i++) { G.beginPath(); G.moveTo(x0 + w * i / dn, y); G.lineTo(x0 + w * i / dn, y + 50); G.stroke(); }
          G.globalAlpha = cut.v; G.strokeStyle = Pl.ink; G.setLineDash([2, 3]); G.lineWidth = 1; for (let i = 1; i < L; i++) { G.beginPath(); G.moveTo(x0 + w * i / L, y + 6); G.lineTo(x0 + w * i / L, y + 44); G.stroke(); } G.setLineDash([]); G.globalAlpha = 1;
          K.text(G, label, 100, y + 32, { a: 'right', w: 800, s: 20 }); if (cut.v > 0.5) K.text(G, `= ${n * L / dn}/${L}`, x0 + w + 8, y + 32, { s: 14, w: 700, c: Pl.muted }); };
        bar(30, a, b, Pl.blue, `${a}/${b}`); bar(120, cc, dd, Pl.red, `${cc}/${dd}`);
        const v1 = a / b, v2 = cc / dd, sn = a * (L / b) + cc * (L / dd), g = gcd(sn, L), cmp = Math.abs(v1 - v2) < 1e-12 ? '=' : v1 > v2 ? '>' : '<';
        K.text(G, `${a}/${b}  ${cmp}  ${cc}/${dd}`, 120, 230, { w: 800, s: 22 }); K.text(G, `${a}/${b} + ${cc}/${dd} = ${a * L / b}/${L} + ${cc * L / dd}/${L} = ${sn}/${L}${g > 1 ? ` = ${sn / g}/${L / g}` : ''}${sn > L ? `  (${Math.floor(sn / L)} ${(sn % L) / gcd(sn % L || L, L)}/${L / gcd(sn % L || L, L)})`.replace(/ 0\/\d+/, '') : ''}`, 120, 270, { w: 700, s: 17, c: Pl.violet });
        read.innerHTML = IL(`Lowest common denominator **${L}**: ${a}/${b} = ${a * L / b}/${L}, ${cc}/${dd} = ${cc * L / dd}/${L}. So **${a}/${b} ${cmp} ${cc}/${dd}**${cmp === '=' ? ' — they are equivalent' : ` (difference ${Math.abs(a * L / b - cc * L / dd)}/${L})`}. Sum **${sn / g}/${L / g}**.`);
      }).add(cut);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); a = 3; b = 4; cc = 5; dd = 7; cut.set(1, true); M.draw(); },
        observe() { const L = lcm(b, dd); return { text: `${a}/${b} = ${a * L / b}/${L} and ${cc}/${dd} = ${cc * L / dd}/${L}, so ${a}/${b} is **${a / b > cc / dd ? 'bigger' : a / b < cc / dd ? 'smaller' : 'equal'}**.`, predOk: a === 3 && b === 4 && cc === 5 && dd === 7 ? p => p === 0 : null }; } };
    }
  };

  /* ============ 8 · Tangent explorer ============ */
  const TF = { sq: ['x²', x => x * x, x => 2 * x], cub: ['x³ − 3x', x => x ** 3 - 3 * x, x => 3 * x * x - 3], sin: ['sin x', Math.sin, Math.cos], exp: ['eˣ', Math.exp, Math.exp] };
  D.tangent = { wide: true,
    intro: 'A **secant** line joins two points on a curve, a distance **h** apart. Shrink h towards zero and the secant turns into the **tangent** — its slope is the **derivative**. Drag the point along the curve and the derivative graph below is traced out.',
    predict: { q: 'For y = x², the slope of the tangent at x = 1 is…', options: ['1', '2', '0', 'x²'] },
    explore: 'Choose x², put the point at x = 1 and slide h down to 0.01. Then drag the point and watch the lower graph build. Try sin x: what is its derivative’s shape?',
    explain: 'The secant slope is **(f(x + h) − f(x)) / h**. As h → 0 it approaches the **gradient of the tangent**, f′(x). For f(x) = x² the secant slope is 2x + h, which tends to **2x** (so 2 at x = 1). For sin x the derivative traces cos x; eˣ is its own derivative. The derivative is itself a function: it tells you how steep the original graph is everywhere.',
    apply: [q('x-tg1', 'For y = x³, the derivative at x = 2 is…', ['6', '8', '12', '3'], 2, 'f′(x) = 3x² = 12.'), q('x-tg2', 'Where a smooth curve has a maximum, its derivative is…', ['positive', 'zero', 'negative', 'undefined'], 1, 'The tangent is horizontal.')],
    summary: ['Secant slope (f(x+h) − f(x))/h → f′(x) as h → 0.', 'd/dx x² = 2x; d/dx sin x = cos x; d/dx eˣ = eˣ.', 'f′ = 0 at turning points.'],
    build(host, c) {
      const S = K.stage(host, 800, 460), sx0 = K.spring(1), shh = K.spring(1.5, 8); let fn = 'sq', traced = []; let A1 = null;
      const ctl = K.controls(host, [{ k: 'chips', id: 'f', label: 'f(x)', opts: Object.entries(TF).map(([k, v]) => [k, v[0]]), val: 'sq' }, { k: 'range', id: 'x', label: 'x', min: -2.5, max: 2.5, step: 0.01, val: 1, d: 2 }, { k: 'range', id: 'h', label: 'h', min: 0.01, max: 2, step: 0.01, val: 1.5, d: 2 }], (id, v) => { if (id === 'f') { fn = v; traced = []; } if (id === 'x') sx0.set(v); if (id === 'h') shh.set(v); M.kick(); c.onChange(); });
      const read = readout(host);
      K.drag(S, () => A1 ? [{ id: 'p', x: A1.X(sx0.v), y: A1.Y(TF[fn][1](sx0.v)), r: 16 }] : [], (id, x) => { const v = clamp(A1.IX(x), -2.5, 2.5); ctl.set('x', Math.round(v * 100) / 100); sx0.set(v, true); M.kick(); c.onChange(); });
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g, [nm, f, df] = TF[fn], x0 = sx0.v, h = shh.v; S.clear(Pl.bg2);
        const yr = fn === 'exp' ? [-1, 9] : fn === 'sin' ? [-1.6, 1.6] : fn === 'cub' ? [-4, 4] : [-1, 7];
        A1 = K.axes(G, [0, 0, 800, 270], [-3, 3], yr, { ticks: 8 }); K.plot(G, A1, f, -3, 3, Pl.blue, 3);
        const y0 = f(x0), y1 = f(x0 + h), m = (y1 - y0) / h, mt = df(x0);
        K.plot(G, A1, x => y0 + m * (x - x0), -3, 3, Pl.gold, 2); G.globalAlpha = 0.6; G.setLineDash([5, 5]); K.plot(G, A1, x => y0 + mt * (x - x0), -3, 3, Pl.red, 2); G.setLineDash([]); G.globalAlpha = 1;
        G.fillStyle = Pl.gold; G.beginPath(); G.arc(A1.X(x0 + h), A1.Y(y1), 6, 0, 7); G.fill(); G.fillStyle = Pl.ink; G.beginPath(); G.arc(A1.X(x0), A1.Y(y0), 9, 0, 7); G.fill();
        K.tag(G, `secant slope ${fmt(m, 3)}`, 120, 22, Pl.gold); K.tag(G, `tangent slope f′(x) = ${fmt(mt, 3)}`, 340, 22, Pl.red);
        if (!traced.some(([x]) => Math.abs(x - x0) < 0.02)) traced.push([x0, mt]);
        const dr = fn === 'exp' ? [-1, 9] : fn === 'sin' ? [-1.6, 1.6] : fn === 'cub' ? [-4, 12] : [-6, 6];
        const A2 = K.axes(G, [0, 290, 800, 170], [-3, 3], dr, { ticks: 8, yl: "f′(x)" }); G.globalAlpha = 0.25; K.plot(G, A2, df, -3, 3, Pl.red, 2); G.globalAlpha = 1;
        traced.forEach(([x, v]) => { G.fillStyle = Pl.red; G.beginPath(); G.arc(A2.X(x), A2.Y(v), 3, 0, 7); G.fill(); }); G.fillStyle = Pl.red; G.beginPath(); G.arc(A2.X(x0), A2.Y(mt), 7, 0, 7); G.fill();
        read.innerHTML = IL(`f(x) = ${nm} at x = **${fmt(x0, 2)}**, h = **${fmt(h, 2)}**: secant slope **${fmt(m, 4)}**; tangent slope f′(${fmt(x0, 2)}) = **${fmt(mt, 4)}**. Difference ${fmt(Math.abs(m - mt), 4)} — it shrinks as h → 0.`);
      }).add(sx0, shh);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); fn = 'sq'; traced = []; sx0.set(1, true); shh.set(1.5, true); M.draw(); },
        observe() { const [nm, f, df] = TF[fn], x0 = ctl.val.x, h = ctl.val.h, m = (f(x0 + h) - f(x0)) / h; return { text: `For ${nm} at x = ${fmt(x0, 2)} with h = ${fmt(h, 2)}, the secant slope is **${fmt(m, 3)}**; the exact tangent slope is **${fmt(df(x0), 3)}**.`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 9 · Vector playground ============ */
  D.vectors = { wide: true,
    intro: 'Two vectors start at the origin. **Drag their tips.** See their sum (tip to tail and as a parallelogram), their difference, their lengths, the angle between them and the **dot product**.',
    predict: { q: 'Two vectors are at right angles. Their dot product is…', options: ['positive', 'zero', 'negative', 'the product of their lengths'] },
    explore: 'Make the vectors perpendicular and read the dot product. Then point them the same way, then opposite ways.',
    explain: 'Vectors add **tip to tail**: a + b goes from the start of a to the end of b, the diagonal of the parallelogram. Component-wise, (a₁, a₂) + (b₁, b₂) = (a₁ + b₁, a₂ + b₂). The **dot product a · b = a₁b₁ + a₂b₂ = |a||b| cos θ**: positive when the angle is acute, **zero when perpendicular**, negative when obtuse.',
    apply: [q('x-vc1', '(3, 4) + (1, −2) =', ['(4, 2)', '(2, 6)', '(3, −8)', '(4, 6)'], 0, 'Add components.'), q('x-vc2', 'The length of (3, 4) is…', ['7', '5', '12', '25'], 1, '√(9 + 16).')],
    summary: ['Add tip to tail; add components.', '|a| = √(a₁² + a₂²).', 'a · b = |a||b| cos θ — zero when perpendicular.'],
    build(host, c) {
      const S = K.stage(host, 800, 440); const v = { a: [3, 2], b: [1, 4] }; let show = 'sum', A0 = null;
      const ctl = K.controls(host, [{ k: 'chips', id: 'show', label: T('Show', 'أظهر'), opts: [['sum', 'a + b'], ['diff', 'a − b'], ['proj', T('projection of b on a', 'إسقاط ب على أ')]], val: 'sum' }, { k: 'btn', id: 'perp', label: T('Make perpendicular', 'اجعلهما متعامدين') }], (id, val) => { if (id === 'show') show = val; if (id === 'perp') v.b = [-v.a[1], v.a[0]]; M.kick(); c.onChange(); });
      const read = readout(host);
      K.drag(S, () => A0 ? ['a', 'b'].map(k => ({ id: k, x: A0.X(v[k][0]), y: A0.Y(v[k][1]), r: 16 })) : [], (id, x, y) => { v[id] = [Math.round(A0.IX(x) * 2) / 2, Math.round(A0.IY(y) * 2) / 2].map(t => clamp(t, -9.5, 9.5)); M.kick(); c.onChange(); });
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); A0 = K.axes(G, [0, 0, 800, 440], [-10, 10], [-5.5, 5.5], { xstep: 1, ystep: 1, ticks: 20 });
        const [a1, a2] = v.a, [b1, b2] = v.b, O = [A0.X(0), A0.Y(0)], P = (x, y) => [A0.X(x), A0.Y(y)];
        if (show === 'sum') { G.fillStyle = Pl.violet; G.globalAlpha = 0.1; G.beginPath(); [[0, 0], [a1, a2], [a1 + b1, a2 + b2], [b1, b2]].forEach(([x, y], i) => i ? G.lineTo(...P(x, y)) : G.moveTo(...P(x, y))); G.fill(); G.globalAlpha = 0.5; K.arrow(G, ...P(a1, a2), ...P(a1 + b1, a2 + b2), Pl.red, 2, 9); K.arrow(G, ...P(b1, b2), ...P(a1 + b1, a2 + b2), Pl.blue, 2, 9); G.globalAlpha = 1; K.arrow(G, ...O, ...P(a1 + b1, a2 + b2), Pl.violet, 4, 13, 'a + b'); }
        if (show === 'diff') { K.arrow(G, ...P(b1, b2), ...P(a1, a2), Pl.green, 3.5, 12, 'a − b'); G.globalAlpha = 0.4; K.arrow(G, ...O, ...P(a1 - b1, a2 - b2), Pl.green, 3, 11); G.globalAlpha = 1; }
        if (show === 'proj') { const k = (a1 * b1 + a2 * b2) / (a1 * a1 + a2 * a2 || 1); G.setLineDash([4, 4]); G.strokeStyle = Pl.muted; G.beginPath(); G.moveTo(...P(b1, b2)); G.lineTo(...P(k * a1, k * a2)); G.stroke(); G.setLineDash([]); K.arrow(G, ...O, ...P(k * a1, k * a2), Pl.green, 5, 12, 'proj'); }
        K.arrow(G, ...O, ...P(a1, a2), Pl.red, 4, 13, `a (${fmt(a1, 1)}, ${fmt(a2, 1)})`); K.arrow(G, ...O, ...P(b1, b2), Pl.blue, 4, 13, `b (${fmt(b1, 1)}, ${fmt(b2, 1)})`);
        const la = Math.hypot(a1, a2), lb = Math.hypot(b1, b2), dot = a1 * b1 + a2 * b2, ang = la && lb ? Math.acos(clamp(dot / (la * lb), -1, 1)) * 180 / Math.PI : 0;
        read.innerHTML = IL(`|a| = **${fmt(la, 2)}**, |b| = **${fmt(lb, 2)}**, a + b = **(${fmt(a1 + b1, 1)}, ${fmt(a2 + b2, 1)})**, a · b = ${fmt(a1, 1)}×${fmt(b1, 1)} + ${fmt(a2, 1)}×${fmt(b2, 1)} = **${fmt(dot, 2)}**, angle **${fmt(ang, 1)}°** ${Math.abs(dot) < 1e-9 ? '— perpendicular!' : dot > 0 ? '(acute)' : '(obtuse)'}.`);
      });
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); v.a = [3, 2]; v.b = [1, 4]; show = 'sum'; M.draw(); }, _v: v,
        observe() { const dot = v.a[0] * v.b[0] + v.a[1] * v.b[1]; return { text: `a = (${v.a.join(', ')}), b = (${v.b.join(', ')}): a · b = **${fmt(dot, 2)}**. ${Math.abs(dot) < 1e-9 ? 'They are perpendicular, and the dot product is exactly zero.' : 'Make them perpendicular to see a dot product of zero.'}`, predOk: p => p === 1 }; } };
    }
  };
})();
