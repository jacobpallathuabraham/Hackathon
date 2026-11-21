/* ERLY Learning Studio v27 — Photosynthesis lab: the pondweed practical with limiting factors and an experiment journal.

   Model (a teaching model, not measured data):
     light intensity at the plant  I = 100 × (10 cm / d)²        (inverse-square law; d = lamp distance)
     rate = min(kL·I, kC·CO₂, Pmax) × f(T)                        (Blackman: the scarcest factor limits)
     f(T) rises ×2 per 10 °C up to the optimum (27 °C), then falls as enzymes denature (0 by about 41 °C).
   Bubbles counted in a minute are random (Poisson) around the model rate, as in a real practical. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, IL = LS.inline, esc = LS.esc;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const f2 = (v, d = 1) => K.fmt(v, d);
  const fT = t => (t <= 27 ? Math.pow(2, (t - 27) / 10) : Math.max(0, 1 - ((t - 27) / 14) ** 2));
  const light = d => 100 * (10 / d) ** 2;
  const model = (d, co2, t) => { const L = 0.6 * light(d), C = 30 * co2, P = 40, m = Math.min(L, C, P); return { rate: m * fT(t), lim: m === L ? 'light' : m === C ? 'CO₂' : 'the plant’s maximum (enzymes / chlorophyll)', L, C, P, f: fT(t) }; };
  const poisson = lam => { if (lam > 30) { const u = Math.random(), v = Math.random(); return Math.max(0, Math.round(lam + Math.sqrt(lam) * Math.sqrt(-2 * Math.log(u || 1e-9)) * Math.cos(2 * Math.PI * v))); } let L = Math.exp(-lam), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
  D['photo-lab'] = { wide: true,
    intro: 'The classic pondweed experiment. A sprig of pondweed in water gives off **oxygen bubbles** as it photosynthesises — more bubbles, faster photosynthesis. Move the **lamp**, add **carbon dioxide** (sodium hydrogencarbonate) and change the **temperature**, count the bubbles for a minute, and build up your results in the journal.\n\nThe model is a teaching model: the shapes of the relationships are right, the numbers are illustrative, and the counts vary randomly like a real practical.',
    predict: { q: 'You halve the distance between the lamp and the pondweed (and nothing else limits). The light reaching the plant becomes about…', options: ['2 times brighter', '4 times brighter', 'the same', 'half as bright'] },
    explore: '- Count bubbles at 40, 30, 20 and 10 cm. Plot **rate against distance**, then against **light intensity**.\n- At 10 cm the rate stops rising. Which factor is limiting now? Add CO₂ and test again.\n- Hold everything else and try 15, 25, 35 and 40 °C. Why does the rate fall so suddenly when it is hot?',
    explain: 'Photosynthesis needs **light**, **carbon dioxide** and suitable **temperature** (its reactions are run by **enzymes**). Whichever is in shortest supply sets the rate — the **limiting factor**. Raising a factor that is not limiting changes nothing. Light intensity falls with the **square of the distance** from a lamp (inverse-square law), so halving the distance gives about **four times** the light. Temperature speeds the enzymes up to an optimum; above it they **denature** and the rate drops sharply.',
    apply: [q('x-ph1', 'Doubling the lamp distance makes the light intensity…', ['half', 'a quarter', 'double', 'unchanged'], 1, 'Inverse square: (1/2)² = 1/4.'), q('x-ph2', 'Adding more CO₂ does not change the rate. The limiting factor is probably…', ['CO₂', 'light or temperature', 'oxygen', 'water'], 1, 'If CO₂ were limiting, adding it would raise the rate.'), q('x-ph3', 'Why does the rate fall at 45 °C?', ['too much light', 'enzymes denature', 'CO₂ runs out', 'the plant sleeps'], 1, 'High temperatures change the shape of the enzymes’ active sites.')],
    summary: ['The limiting factor (light, CO₂ or temperature) sets the rate.', 'Light intensity ∝ 1 / distance².', 'Enzymes: faster when warmer up to an optimum, then they denature.'],
    connect: [{ label: 'Into the leaf', href: '#/exp/leaf-dive' }, { label: 'Enzyme lab', href: '#/exp/enzyme' }, { label: 'Lesson: Photosynthesis', href: '#/lesson/bio-photo' }],
    build(host, c) {
      const S = K.stage(host, 900, 380, 'ph__stage'); S.cv.setAttribute('role', 'img');
      const ctl = K.controls(host, [{ k: 'row' }, { k: 'range', id: 'd', label: T('Lamp distance', 'بعد المصباح'), min: 5, max: 50, step: 5, val: 30, unit: ' cm' }, { k: 'range', id: 'co2', label: T('Sodium hydrogencarbonate (CO₂)', 'ثاني أكسيد الكربون'), min: 0.1, max: 2, step: 0.1, val: 1, d: 1, unit: ' %' }, { k: 'range', id: 't', label: T('Water temperature', 'الحرارة'), min: 5, max: 45, step: 5, val: 25, unit: ' °C' }, { k: 'end' }, { k: 'row' }, { k: 'btn', id: 'count', label: T('Count bubbles for 1 minute', 'عدّ الفقاعات دقيقة'), accent: true }, { k: 'btn', id: 'clear', label: T('Clear journal', 'امسح السجل') }, { k: 'chips', id: 'xv', label: T('Graph against', 'ارسم مقابل'), opts: [['d', T('distance', 'المسافة')], ['I', T('light intensity', 'شدة الضوء')], ['co2', 'CO₂'], ['t', T('temperature', 'الحرارة')]], val: 'd' }, { k: 'end' }], on);
      const out = document.createElement('div'); out.className = 'v26-grid2'; out.innerHTML = `<div class="v26-card"><h3>${T('Right now', 'الآن')}</h3><div class="v26-out ph__now" aria-live="polite"></div></div><div class="v26-card"><h3>${T('Experiment journal', 'سجل التجربة')}</h3><div class="v26-out ph__log"></div></div>`; host.appendChild(out);
      const G2 = K.stage(host, 900, 260, 'ph__graph');
      let bubbles = [], log = [], counting = null, acc = 0;
      function now() { const m = model(ctl.val.d, ctl.val.co2, ctl.val.t); host.querySelector('.ph__now').innerHTML = IL(`Light at the plant **${f2(light(ctl.val.d), 0)} %** of the 10 cm value · model rate **${f2(m.rate)} bubbles/min** · limiting factor: **${m.lim}**${m.f < 0.98 ? ` · temperature is slowing the enzymes to **${Math.round(m.f * 100)} %**` : ''}.`); return m; }
      function journal() { host.querySelector('.ph__log').innerHTML = log.length ? `<table><tr><th>#</th><th>${T('distance', 'المسافة')}</th><th>${T('light', 'الضوء')}</th><th>CO₂</th><th>°C</th><th>${T('bubbles/min', 'فقاعات/د')}</th></tr>${log.map((r, i) => `<tr><td>${i + 1}</td><td>${r.d} cm</td><td>${f2(r.I, 0)}</td><td>${f2(r.co2)} %</td><td>${r.t}</td><td><b>${r.n}</b></td></tr>`).join('')}</table>` : `<p class="v26-hint">${T('Each count adds a row here and a point on the graph.', 'كل عدّ يضيف صفاً.')}</p>`; graph(); }
      function graph() { const G = G2.g, Pl = K.pal(); G2.clear(Pl.bg); const xv = ctl.val.xv, xs = log.map(r => r[xv]), ys = log.map(r => r.n); const xr = xv === 'd' ? [0, 55] : xv === 'I' ? [0, Math.max(120, ...xs) * 1.1] : xv === 'co2' ? [0, 2.2] : [0, 50], yr = [0, Math.max(10, ...ys) * 1.15];
        const A = K.axes(G, [56, 14, 820, 210], xr, yr, { xl: { d: T('distance (cm)', 'المسافة'), I: T('light intensity', 'شدة الضوء'), co2: 'CO₂ (%)', t: '°C' }[xv], yl: T('bubbles / min', 'فقاعات/د') });
        log.forEach(r => { G.fillStyle = '#0d9488'; G.beginPath(); G.arc(A.X(r[xv]), A.Y(r.n), 5, 0, 7); G.fill(); }); }
      function draw(dt) {
        const G = S.g, Pl = K.pal(), m = model(ctl.val.d, ctl.val.co2, ctl.val.t); S.clear(Pl.bg);
        const bx = 520, by = 70, bw = 220, bh = 270, warm = (ctl.val.t - 5) / 40; // the beaker
        G.fillStyle = `rgba(${120 + warm * 100},${180 - warm * 40},${230 - warm * 120},.35)`; K.rr(G, bx, by + 30, bw, bh - 30, 10); G.fill(); G.strokeStyle = Pl.muted; G.lineWidth = 2; K.rr(G, bx, by, bw, bh, 10); G.stroke();
        G.strokeStyle = '#2f7d32'; G.lineWidth = 3; for (let k = 0; k < 7; k++) { G.beginPath(); G.moveTo(bx + bw / 2, by + bh - 10); G.quadraticCurveTo(bx + bw / 2 + (k - 3) * 18, by + bh - 80, bx + bw / 2 + (k - 3) * 10, by + 120); G.stroke(); }
        // lamp at distance d to the left of the beaker; the beam's brightness follows the inverse square
        const lx = bx - 30 - ctl.val.d * 8; G.fillStyle = '#f2c94c'; G.beginPath(); G.arc(lx, by + 130, 18, 0, 7); G.fill(); G.fillStyle = '#555'; G.fillRect(lx - 22, by + 112, 6, 36);
        const glow = Math.min(0.7, light(ctl.val.d) / 160); const gr = G.createLinearGradient(lx, 0, bx, 0); gr.addColorStop(0, `rgba(255,220,100,${glow})`); gr.addColorStop(1, `rgba(255,220,100,${glow * 0.4})`); G.fillStyle = gr; G.beginPath(); G.moveTo(lx + 18, by + 118); G.lineTo(bx, by + 40); G.lineTo(bx, by + 230); G.lineTo(lx + 18, by + 142); G.fill();
        K.text(G, `${ctl.val.d} cm`, (lx + bx) / 2, by + 260, { a: 'center', s: 13, w: 700 });
        // bubbles: produced at the model rate (sped up ×6 so you can see them)
        if (!K.reduced()) { acc += m.rate / 60 * dt * 6; while (acc >= 1) { acc--; bubbles.push({ x: bx + bw / 2 + (Math.random() - 0.5) * 50, y: by + 130, r: 2 + Math.random() * 2.5 }); } }
        bubbles.forEach(b2 => { b2.y -= 70 * dt; b2.x += Math.sin(b2.y / 9) * 0.3; }); bubbles = bubbles.filter(b2 => b2.y > by + 34); G.strokeStyle = 'rgba(255,255,255,.95)'; G.lineWidth = 1.4; bubbles.forEach(b2 => { G.beginPath(); G.arc(b2.x, b2.y, b2.r, 0, 7); G.stroke(); });
        K.text(G, `${ctl.val.t} °C · CO₂ ${f2(ctl.val.co2)} %`, bx + bw / 2, by - 12, { a: 'center', s: 13, w: 700 });
        if (counting) { const left = Math.max(0, counting.end - performance.now()) / 1000; K.text(G, T(`Counting… ${left.toFixed(1)} s`, 'أعدّ…'), 40, 40, { s: 15, w: 700, c: '#0d9488' }); if (left <= 0) { log.push({ d: ctl.val.d, I: light(ctl.val.d), co2: ctl.val.co2, t: ctl.val.t, n: poisson(m.rate) }); counting = null; journal(); } }
        S.cv.setAttribute('aria-label', T(`Pondweed in a beaker, lamp ${ctl.val.d} cm away, ${f2(m.rate)} bubbles per minute.`, 'نبات مائي'));
      }
      const M = K.motor(c, host, (dt, running) => draw(running ? Math.min(dt, 0.05) : 0));
      function on(id) { if (id === 'count' && !counting) counting = { end: performance.now() + (K.reduced() ? 0 : 1500) }; if (id === 'clear') { log = []; journal(); } if (id === 'xv') graph(); now(); M.play(); }
      G2.onresize = graph; now(); journal(); M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { M.pause(); S.destroy(); G2.destroy(); },
        reset() { ctl.reset(); log = []; bubbles = []; now(); journal(); M.play(); }, preset() {},
        _model: (d, co2, t) => model(d, co2, t), _log: () => log.slice(),
        observe() { const m = now(); return { text: `${log.length} count${log.length === 1 ? '' : 's'} recorded. Right now the model rate is **${f2(m.rate)} bubbles/min**, limited by **${m.lim}**. Light at ${ctl.val.d} cm is ${f2(light(ctl.val.d), 0)} (×${f2(light(ctl.val.d) / light(ctl.val.d * 2), 0)} what it would be at double the distance).`, predOk: i => i === 1 }; } };
    }
  };
})();
