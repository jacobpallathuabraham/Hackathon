/* ERLY Learning Studio — Earth, environment and history (v24). Seven experiences. Historical content is limited to
   well-documented facts; dates are given as commonly cited estimates where scholars use ranges. */
(function () {
  'use strict';
  const LS = window.LS, K = LS.kit, D = LS.exp.DEFS, T = LS.T, IL = LS.inline, esc = LS.esc;
  const { fmt, clamp } = K;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const readout = host => { const r = document.createElement('p'); r.className = 'kx-read'; r.setAttribute('aria-live', 'polite'); host.appendChild(r); return r; };

  /* ============ 1 · Water cycle ============ */
  D['water-cycle'] = { wide: true,
    intro: 'A living water cycle. The Sun **evaporates** sea water; vapour rises, cools and **condenses** into clouds; the wind carries clouds over the land; rain **precipitates**, and rivers carry it back. Change the sunshine and the wind and watch the flows change.',
    predict: { q: 'Clouds blown against mountains usually…', options: ['rise, cool and rain more', 'sink and disappear', 'stop moving', 'turn into fog at sea level'] },
    explore: 'Turn the sunshine up: what happens to evaporation and rainfall? Turn the wind off: where does the rain fall? Watch where most rain lands.',
    explain: 'The Sun’s energy drives **evaporation** from the sea (and transpiration from plants). Rising air **cools**, so vapour **condenses** into droplets — clouds. When droplets grow heavy enough they fall as **precipitation**. Air pushed up mountain slopes cools further, so the windward side gets most rain (**relief rainfall**), leaving a drier **rain shadow** beyond. Water returns to the sea as **surface run-off** and rivers, or slowly through **groundwater**. More energy means a faster cycle.',
    apply: [q('x-wc1', 'Condensation happens when water vapour…', ['is heated', 'cools', 'is blown by wind', 'touches salt'], 1, 'Cooling turns vapour into droplets.'), q('x-wc2', 'The side of a mountain away from the wind is often dry because…', ['it is higher', 'clouds have already rained on the other side', 'it is colder', 'rivers flow there'], 1, 'The rain shadow.')],
    summary: ['Evaporation → condensation → precipitation → run-off.', 'Rising air cools; mountains force air up (relief rain).', 'More solar energy speeds the whole cycle.'],
    build(host, c) {
      const S = K.stage(host, 800, 400); let sun = 1, wind = 1, vap = [], clouds = [{ x: 140, w: 30 }], drops = [], river = [], tt = 0, stats = { ev: 0, rain: 0, rainM: 0, run: 0 };
      const ctl = K.controls(host, [{ k: 'range', id: 'sun', label: T('Sunshine', 'أشعة الشمس'), min: 0.2, max: 2, step: 0.05, val: 1, d: 2 }, { k: 'range', id: 'wind', label: T('Wind (towards land)', 'الرياح'), min: 0, max: 2, step: 0.05, val: 1, d: 2 }], (id, v) => { if (id === 'sun') sun = v; if (id === 'wind') wind = v; c.onChange(); });
      const read = readout(host); const ground = x => x < 360 ? 330 : x < 560 ? 330 - (x - 360) * 0.9 : x < 640 ? 150 + (x - 560) * 1.6 : 280;
      const M = K.motor(c, host, dt => {
        dt = Math.min(dt, 0.05); tt += dt; const Pl = K.pal(), G = S.g;
        const sky = G.createLinearGradient(0, 0, 0, 400); sky.addColorStop(0, '#8fc6f2'); sky.addColorStop(1, '#dff1ff'); G.fillStyle = sky; G.fillRect(0, 0, 800, 400);
        G.fillStyle = `rgba(255,210,70,${0.6 + 0.4 * sun / 2})`; G.beginPath(); G.arc(70, 60, 26 + sun * 6, 0, 7); G.fill();
        G.fillStyle = '#2f7fc1'; G.fillRect(0, 330, 370, 70); for (let x = 0; x < 370; x += 24) { G.strokeStyle = 'rgba(255,255,255,.4)'; G.beginPath(); G.arc(x + (tt * 20) % 24, 334, 8, Math.PI * 1.1, Math.PI * 1.9); G.stroke(); }
        G.fillStyle = '#6f9e4d'; G.beginPath(); G.moveTo(360, 400); for (let x = 360; x <= 800; x += 10) G.lineTo(x, ground(x)); G.lineTo(800, 400); G.fill(); G.fillStyle = '#fff'; G.beginPath(); G.moveTo(540, 168); G.lineTo(560, 150); G.lineTo(585, 180); G.fill();
        if (Math.random() < sun * 0.5) { vap.push({ x: 20 + Math.random() * 330, y: 328 }); stats.ev++; }
        vap.forEach(v => { v.y -= 40 * dt; v.x += wind * 10 * dt; }); vap = vap.filter(v => { if (v.y < 110) { let cl = clouds.find(cc => Math.abs(cc.x - v.x) < 60); if (!cl) { cl = { x: v.x, w: 0 }; clouds.push(cl); } cl.w += 1; return false; } return true; });
        vap.forEach(v => { G.fillStyle = 'rgba(255,255,255,.75)'; G.beginPath(); G.arc(v.x, v.y, 2, 0, 7); G.fill(); });
        clouds.forEach(cl => { cl.x += wind * 18 * dt; const g = ground(cl.x), lift = g < 300 ? (300 - g) / 150 : 0; if (cl.w > 42 - lift * 36 && Math.random() < 0.25 + lift) { cl.w -= 1; drops.push({ x: cl.x + (Math.random() - .5) * 40, y: 110 }); } });
        clouds = clouds.filter(cl => cl.x < 820 && cl.w > 0); clouds.forEach(cl => { const r = 10 + Math.sqrt(cl.w) * 4; G.fillStyle = `rgba(${255 - cl.w * 3},${255 - cl.w * 3},${255 - cl.w * 2},.95)`; [-1, 0, 1].forEach(k => { G.beginPath(); G.arc(cl.x + k * r * 0.8, 100 - (k ? 0 : r * 0.35), r, 0, 7); G.fill(); }); });
        drops.forEach(d => { d.y += 160 * dt; }); drops = drops.filter(d => { const g = d.x < 370 ? 330 : ground(d.x); if (d.y >= g) { stats.rain++; if (d.x > 470 && d.x < 600) stats.rainM++; if (d.x >= 370) river.push({ x: d.x, y: g, t: 0 }); return false; } return true; });
        drops.forEach(d => { G.strokeStyle = '#2f6fb8'; G.lineWidth = 1.5; G.beginPath(); G.moveTo(d.x, d.y); G.lineTo(d.x - 1, d.y + 6); G.stroke(); });
        river.forEach(r => { r.t += dt; r.x -= 50 * dt; r.y = r.x < 370 ? 330 : ground(r.x) - 2; }); river = river.filter(r => { if (r.x < 370) { stats.run++; return false; } return true; }); river.forEach(r => { G.fillStyle = '#3a8fd9'; G.beginPath(); G.arc(r.x, r.y, 2.4, 0, 7); G.fill(); });
        [['evaporation', 180, 250], ['condensation', 230, 70], ['precipitation', 520, 132], ['run-off', 450, 345]].forEach(([n, x, y]) => K.tag(G, T(n, n), x, y, '#1d3c5a', 'rgba(255,255,255,.8)'));
        read.innerHTML = IL(`Since you started: **${stats.ev}** units evaporated, **${stats.rain}** fell as rain (**${stats.rainM}** on the mountain’s windward slope), **${stats.run}** flowed back to the sea. Sunshine ×${fmt(sun, 2)}, wind ×${fmt(wind, 2)}.`);
      });
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); sun = 1; wind = 1; vap = []; clouds = []; drops = []; river = []; stats = { ev: 0, rain: 0, rainM: 0, run: 0 }; M.play(); },
        observe() { return { text: `Evaporated ${stats.ev}, rained ${stats.rain} — of which **${stats.rain ? fmt(stats.rainM / stats.rain * 100, 0) : 0}%** fell on the windward mountain slope (a small part of the map). ${stats.run} returned to the sea.`, predOk: stats.rain > 10 ? p => p === 0 : null }; } };
    }
  };

  /* ============ 2 · Plate boundaries ============ */
  const PB = { div: ['Divergent', 'Mid-Atlantic Ridge', 'Plates pull apart. Magma rises to fill the gap and cools into new oceanic crust, building a ridge. Shallow earthquakes and gentle volcanoes.'], sub: ['Convergent: ocean–continent', 'Andes, South America', 'The denser oceanic plate sinks (subducts) beneath the continent, forming a deep trench. Melting above it feeds explosive volcanoes; earthquakes occur down the sinking slab.'], col: ['Convergent: continent–continent', 'Himalayas', 'Neither plate sinks easily, so the crust crumples and thickens into great mountain ranges. Powerful earthquakes, few volcanoes.'], tr: ['Transform', 'San Andreas Fault, California', 'Plates slide past each other. Crust is neither made nor destroyed, but friction locks the plates until they slip — earthquakes.'] };
  D.plates = { wide: true,
    intro: 'The Earth’s outer shell is broken into **plates** that move a few centimetres a year. Pick a boundary and press Play to watch, in a cross-section, what happens where plates meet.',
    predict: { q: 'Where an ocean plate meets a continental plate, the ocean plate…', options: ['rises over the continent', 'sinks beneath it', 'stops moving', 'turns into a continent'] },
    explore: 'Play each boundary in turn. Where do volcanoes form? Where do mountains grow? Where are there earthquakes but no volcanoes?',
    explain: 'Plates move because of slow convection and the pull of sinking slabs in the mantle. At **divergent** boundaries new crust forms; at **convergent** ones crust is destroyed (subduction) or crumpled into mountains; at **transform** boundaries plates slide past each other. Oceanic crust is **denser** than continental crust, so where they meet the ocean plate sinks. Real examples are named for each type.',
    apply: [q('x-pl1', 'The Himalayas formed where…', ['two continental plates collide', 'plates pull apart', 'plates slide past', 'an ocean plate subducts under the ocean'], 0, 'India collided with Asia.'), q('x-pl2', 'New oceanic crust is made at…', ['transform boundaries', 'divergent boundaries', 'trenches', 'mountain ranges'], 1, 'Mid-ocean ridges.')],
    summary: ['Divergent: new crust, ridges.', 'Convergent: subduction (trench, volcanoes) or collision (mountains).', 'Transform: sliding, earthquakes.'],
    build(host, c) {
      const S = K.stage(host, 800, 380); let type = 'div', t = 0; const seen = new Set(['div']); let quakes = [];
      const ctl = K.controls(host, [{ k: 'chips', id: 'type', label: T('Boundary', 'الحد'), opts: Object.entries(PB).map(([k, v]) => [k, v[0]]), val: 'div' }], (id, v) => { type = v; t = 0; seen.add(v); quakes = []; M.play(); c.onChange(); });
      const read = readout(host);
      const M = K.motor(c, host, dt => {
        t = Math.min(t + dt, 12); const Pl = K.pal(), G = S.g, k = t / 12; G.fillStyle = '#bfe0ff'; G.fillRect(0, 0, 800, 380);
        G.fillStyle = '#c4572f'; G.fillRect(0, 250, 800, 130); for (let i = 0; i < 6; i++) { G.strokeStyle = 'rgba(255,190,120,.35)'; G.lineWidth = 2; G.beginPath(); G.ellipse(200 + (i % 3) * 200, 330, 80, 30, 0, Math.PI + t * 0.3 * (i % 2 ? 1 : -1), Math.PI * 1.6 + t * 0.3 * (i % 2 ? 1 : -1)); G.stroke(); }
        const plate = (x0, x1, y, h, col) => { G.fillStyle = col; G.fillRect(x0, y, x1 - x0, h); };
        if (type === 'div') { const gap = 10 + k * 40; G.fillStyle = '#2a6fb0'; G.fillRect(0, 120, 800, 70); plate(0, 400 - gap, 190, 40, '#556270'); plate(400 + gap, 800, 190, 40, '#556270'); G.fillStyle = '#ff7a2f'; G.beginPath(); G.moveTo(400 - gap, 250); G.quadraticCurveTo(400, 150 - k * 20, 400 + gap, 250); G.fill(); G.fillStyle = '#556270'; G.beginPath(); G.moveTo(400 - gap - 60, 190); G.lineTo(400, 160 - k * 15); G.lineTo(400 + gap + 60, 190); G.fill(); K.arrow(G, 300, 210, 220, 210, '#fff', 3, 10); K.arrow(G, 500, 210, 580, 210, '#fff', 3, 10); K.tag(G, T('ridge', 'حيد'), 400, 140 - k * 15, '#fff', 'rgba(0,0,0,.4)'); }
        if (type === 'sub') { G.fillStyle = '#2a6fb0'; G.fillRect(0, 120, 430, 70); plate(0, 430, 190, 34, '#556270'); G.fillStyle = '#556270'; G.beginPath(); G.moveTo(430, 190); G.quadraticCurveTo(520, 220, 620 + k * 30, 360); G.lineTo(590 + k * 30, 370); G.quadraticCurveTo(500, 250, 430, 224); G.fill(); G.fillStyle = '#9b8a6a'; G.beginPath(); G.moveTo(450, 190); G.lineTo(560, 120); G.lineTo(620, 70 - k * 10); G.lineTo(680, 120); G.lineTo(800, 110); G.lineTo(800, 250); G.lineTo(460, 230); G.fill();
          G.fillStyle = '#ff5a1f'; G.beginPath(); G.moveTo(608, 72 - k * 10); G.lineTo(632, 72 - k * 10); G.lineTo(640, 40 - k * 10 - 10 * Math.sin(t * 4)); G.lineTo(600, 40 - k * 10); G.fill(); K.tag(G, T('volcano', 'بركان'), 620, 20, '#fff', 'rgba(0,0,0,.4)'); K.tag(G, T('trench', 'خندق'), 440, 180, '#fff', 'rgba(0,0,0,.4)'); K.arrow(G, 200, 206, 300, 206, '#fff', 3, 10); }
        if (type === 'col') { const up = k * 90; plate(0, 400, 190, 60, '#8a7a5a'); plate(400, 800, 190, 60, '#8a7a5a'); G.fillStyle = '#9b8a6a'; G.beginPath(); G.moveTo(200, 190); for (let x = 200; x <= 600; x += 20) G.lineTo(x, 190 - up * Math.exp(-Math.pow((x - 400) / 110, 2)) * (0.8 + 0.2 * Math.sin(x / 13))); G.lineTo(600, 190); G.fill(); G.fillStyle = '#fff'; G.beginPath(); for (let x = 340; x <= 460; x += 20) G.lineTo(x, 190 - up * Math.exp(-Math.pow((x - 400) / 110, 2)) * (0.8 + 0.2 * Math.sin(x / 13)) + 8); G.lineTo(460, 190 - up * 0.6); G.lineTo(340, 190 - up * 0.6); G.fill(); K.arrow(G, 150, 220, 250, 220, '#fff', 3, 10); K.arrow(G, 650, 220, 550, 220, '#fff', 3, 10); K.tag(G, T('mountains rise', 'ترتفع الجبال'), 400, 60, '#fff', 'rgba(0,0,0,.4)'); }
        if (type === 'tr') { G.fillStyle = '#d9c9a3'; G.fillRect(0, 0, 800, 380); const sh = (t * 12) % 60; G.fillStyle = '#c9b78e'; G.fillRect(0, 0, 800, 190); G.strokeStyle = '#6b4f2a'; G.lineWidth = 3; G.beginPath(); G.moveTo(0, 190); G.lineTo(800, 190); G.stroke();
          for (let x = -60; x < 860; x += 60) { G.strokeStyle = '#555'; G.lineWidth = 6; G.beginPath(); G.moveTo(x + sh, 100); G.lineTo(x + sh, 186); G.stroke(); G.beginPath(); G.moveTo(x - sh + 30, 194); G.lineTo(x - sh + 30, 290); G.stroke(); }
          K.arrow(G, 300, 60, 420, 60, '#6b4f2a', 3, 10); K.arrow(G, 500, 320, 380, 320, '#6b4f2a', 3, 10); K.tag(G, T('map view: roads offset across the fault', 'منظر خريطة'), 400, 360, '#333'); }
        if (type !== 'col' && Math.random() < 0.03) quakes.push({ x: type === 'sub' ? 470 + Math.random() * 130 : type === 'tr' ? Math.random() * 800 : 380 + Math.random() * 40, y: type === 'sub' ? 200 + Math.random() * 120 : type === 'tr' ? 190 : 200 + Math.random() * 30, t: 0 });
        if (type === 'col' && Math.random() < 0.04) quakes.push({ x: 300 + Math.random() * 200, y: 200 + Math.random() * 40, t: 0 });
        quakes.forEach(qq => { qq.t += dt; G.strokeStyle = `rgba(255,255,0,${1 - qq.t})`; G.lineWidth = 2; G.beginPath(); G.arc(qq.x, qq.y, 4 + qq.t * 30, 0, 7); G.stroke(); }); quakes = quakes.filter(qq => qq.t < 1);
        if (type !== 'tr') { K.text(G, T('mantle', 'الوشاح'), 20, 370, { c: '#fff', w: 700 }); }
        const [n, ex, desc] = PB[type]; read.innerHTML = IL(`**${n}** — e.g. **${ex}**. ${desc} Yellow rings mark earthquakes.`);
        if (t >= 12 && type !== 'tr') { /* keep ambient motion */ }
      });
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); type = 'div'; t = 0; seen.clear(); seen.add('div'); M.play(); },
        observe() { return { text: `You have watched **${seen.size} of 4** boundary types: ${[...seen].map(k => PB[k][0]).join(', ')}.`, predOk: seen.has('sub') ? p => p === 1 : null }; } };
    }
  };

  /* ============ 3 · Greenhouse balance (a zero-dimensional energy-balance model) ============ */
  D.greenhouse = { wide: true,
    intro: 'A simple energy-balance model of the Earth. Sunlight comes in; some is reflected (**albedo**); the surface warms and radiates infrared; an atmosphere layer absorbs a fraction of that infrared (**ε**) and sends half back down. Find the temperature where energy in equals energy out.',
    predict: { q: 'If the atmosphere absorbs more of the outgoing infrared, the surface temperature in balance…', options: ['falls', 'rises', 'stays the same', 'becomes zero'] },
    explore: 'Set ε to 0 (no greenhouse effect). Then to about 0.78. Then raise it a little more. Also try a brighter, more reflective planet (higher albedo).',
    explain: 'In balance, the planet must radiate as much as it absorbs: absorbed sunlight per square metre is **S(1 − α)/4** (S = 1361 W/m², α = albedo). With no atmosphere, that gives about **255 K (−18 °C)**. An atmosphere that absorbs a fraction **ε** of the surface’s infrared and re-emits half of it downwards warms the surface: **Tₛ = [S(1 − α) / (4σ(1 − ε/2))]^¼**. With α = 0.30 and ε ≈ 0.78 this single-layer model gives about **288 K (15 °C)**, close to Earth’s average. More absorbing gases (such as CO₂) raise ε and the balance temperature. Real climate involves clouds, water vapour, oceans and feedbacks; this model shows only the core idea.',
    apply: [q('x-gh1', 'Without its greenhouse effect, Earth’s average surface would be about…', ['15 °C', '−18 °C', '100 °C', '−273 °C'], 1, 'About 255 K.'), q('x-gh2', 'Increasing the albedo (more reflective) makes the balance temperature…', ['higher', 'lower', 'unchanged', 'infinite'], 1, 'Less sunlight is absorbed.')],
    summary: ['Balance: energy absorbed = energy radiated.', 'No atmosphere: ≈ 255 K; with greenhouse absorption: ≈ 288 K.', 'More infrared absorption → warmer surface (in balance).'],
    build(host, c) {
      const S = K.stage(host, 800, 380), se = K.spring(0.78), sa = K.spring(0.3); let t = 0; const sig = 5.670e-8, S0 = 1361;
      const ctl = K.controls(host, [{ k: 'range', id: 'e', label: T('Infrared absorbed by atmosphere ε', 'الامتصاص ε'), min: 0, max: 1, step: 0.01, val: 0.78, d: 2 }, { k: 'range', id: 'a', label: T('Albedo α (reflected sunlight)', 'الانعكاسية α'), min: 0.1, max: 0.6, step: 0.01, val: 0.3, d: 2 }], (id, v) => { if (id === 'e') se.set(v); if (id === 'a') sa.set(v); M.kick(); c.onChange(); });
      const read = readout(host);
      const Ts = (e, a) => Math.pow(S0 * (1 - a) / (4 * sig * (1 - e / 2)), 0.25);
      const M = K.motor(c, host, dt => {
        t += dt; const Pl = K.pal(), G = S.g, e = se.v, a = sa.v, T0 = Ts(e, a), absorbed = S0 * (1 - a) / 4, up = sig * Math.pow(T0, 4);
        G.fillStyle = '#071226'; G.fillRect(0, 0, 800, 380); G.fillStyle = `rgba(90,160,255,${0.08 + e * 0.35})`; G.fillRect(0, 110, 520, 120); K.text(G, `${T('atmosphere', 'الغلاف الجوي')} (ε = ${fmt(e, 2)})`, 12, 130, { c: '#cfe3ff', w: 700, s: 12 });
        const ground = T0 < 260 ? '#dfe9f2' : T0 < 300 ? '#4f8a3c' : '#b8873b'; G.fillStyle = ground; G.fillRect(0, 300, 520, 80);
        const wobble = x => Math.sin(x / 12 + t * 3) * 4;
        const beam = (x, y0, y1, col, w) => { G.strokeStyle = col; G.lineWidth = w; G.beginPath(); for (let y = y0; Math.sign(y1 - y0) * (y1 - y) >= 0; y += Math.sign(y1 - y0) * 4) G.lineTo(x + wobble(y), y); G.stroke(); };
        beam(90, 0, 300, '#ffd84a', 2 + absorbed / 60); beam(140, 0, 110, '#ffd84a', 2 + S0 / 4 * a / 60); K.arrow(G, 140, 110, 170, 20, '#ffe98a', 2.5, 9); K.tag(G, `${T('reflected', 'منعكس')} ${fmt(S0 / 4 * a, 0)} W/m²`, 230, 40, '#ffe98a', 'rgba(0,0,0,.5)');
        beam(300, 300, 160, '#ff6a4a', 2 + up / 80); beam(360, 230, 0, '#ff6a4a', 1 + up * (1 - e) / 80); beam(420, 160, 300, '#ff9a6a', 1 + up * e / 2 / 80);
        K.tag(G, `${T('surface emits', 'يبعث السطح')} ${fmt(up, 0)}`, 300, 280, '#ffb0a0', 'rgba(0,0,0,.5)'); K.tag(G, `${T('back-radiation', 'الإشعاع الراجع')} ${fmt(up * e / 2, 0)}`, 440, 260, '#ffc9a8', 'rgba(0,0,0,.5)'); K.tag(G, `${T('absorbed', 'ممتص')} ${fmt(absorbed, 0)}`, 90, 330, '#222', 'rgba(255,255,255,.7)');
        G.fillStyle = '#0d1a33'; G.fillRect(520, 0, 280, 380); const A = K.axes(G, [560, 30, 220, 300], [0, 1], [200, 340], { xl: 'ε', yl: 'K', ystep: 20, xstep: 0.25 });
        K.plot(G, A, x => Ts(x, sa.v), 0, 1, '#ff8a5a', 3); G.fillStyle = '#fff'; G.beginPath(); G.arc(A.X(e), A.Y(T0), 6, 0, 7); G.fill(); G.strokeStyle = 'rgba(255,255,255,.4)'; G.setLineDash([3, 4]); G.beginPath(); G.moveTo(560, A.Y(288)); G.lineTo(780, A.Y(288)); G.stroke(); G.setLineDash([]); K.text(G, '288 K', 776, A.Y(288) - 4, { a: 'right', c: '#ccc', s: 11 });
        read.innerHTML = IL(`Model surface temperature **${fmt(T0, 1)} K (${fmt(T0 - 273.15, 1)} °C)**. Absorbed sunlight ${fmt(absorbed, 0)} W/m²; the surface radiates ${fmt(up, 0)} W/m² and the atmosphere returns ${fmt(up * e / 2, 0)} W/m². Without any greenhouse absorption: ${fmt(Ts(0, a) - 273.15, 1)} °C.`);
      }).add(se, sa);
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); se.set(0.78, true); sa.set(0.3, true); M.play(); }, _Ts: Ts,
        observe() { const e = ctl.val.e, a = ctl.val.a; return { text: `At ε = ${fmt(e, 2)}, α = ${fmt(a, 2)}: **${fmt(Ts(e, a) - 273.15, 1)} °C**. With ε = 0 it would be ${fmt(Ts(0, a) - 273.15, 1)} °C; at ε = ${fmt(Math.min(1, e + 0.05), 2)} it would be ${fmt(Ts(Math.min(1, e + 0.05), a) - 273.15, 1)} °C.`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 4 · Journey to the core ============ */
  const LAY = [[0, 35, 'Crust', 'solid rock', 'ranges from about 15 °C at the surface to ~400–1000 °C at its base', '#9b7b55'], [35, 660, 'Upper mantle', 'solid rock that flows very slowly', '~1000–1900 °C', '#c96a3a'], [660, 2890, 'Lower mantle', 'solid rock under enormous pressure', '~1900–3700 °C', '#d9553a'], [2890, 5150, 'Outer core', 'liquid iron and nickel — its flow makes Earth’s magnetic field', '~4000–5000 °C', '#f0a030'], [5150, 6371, 'Inner core', 'solid iron and nickel (pressure keeps it solid)', '~5000–5400 °C', '#fde07a']];
  D['earth-layers'] = { wide: true,
    intro: 'Drill from the surface to the centre of the Earth, 6,371 km down. Drag the probe or use the slider; the panel tells you which layer you are in, whether it is solid or liquid, and roughly how hot it is.',
    predict: { q: 'The Earth’s inner core is…', options: ['liquid, because it is hottest', 'solid, because the pressure is so great', 'hollow', 'made of rock'] },
    explore: 'Find each boundary. Where does solid rock turn to liquid metal? Why is the hottest part solid?',
    explain: 'The Earth is layered by composition and state. The thin **crust** (≈ 5–70 km; 35 km is a typical continental thickness) sits on the **mantle**, hot solid rock that creeps slowly, driving plate motion. At **2,890 km** the **outer core** of liquid iron–nickel begins; its swirling generates the magnetic field. The **inner core**, from **5,150 km**, is even hotter but **solid**, because the pressure (over 3 million times surface pressure) raises the melting point. Our knowledge comes mostly from how **seismic waves** travel through these layers. Temperatures are approximate ranges.',
    apply: [q('x-el1', 'Which layer is liquid?', ['crust', 'mantle', 'outer core', 'inner core'], 2, 'Liquid iron–nickel.'), q('x-el2', 'Most of what we know about the deep Earth comes from…', ['drilling', 'seismic waves', 'volcanoes', 'meteorites only'], 1, 'Earthquake waves reveal the layers.')],
    summary: ['Crust → mantle → outer core (liquid) → inner core (solid).', 'Pressure keeps the inner core solid.', 'Seismic waves reveal the structure.'],
    build(host, c) {
      const S = K.stage(host, 800, 420), sd = K.spring(0, 8); const seen = new Set();
      const ctl = K.controls(host, [{ k: 'range', id: 'd', label: T('Depth', 'العمق'), min: 0, max: 6371, step: 1, val: 0, unit: ' km' }, { k: 'chips', id: 'jump', label: T('Jump to', 'انتقل'), opts: LAY.map((l, i) => [i, l[2]]), val: '' }], (id, v) => { if (id === 'd') sd.set(v); if (id === 'jump') { const L = LAY[v], d = Math.round((L[0] + L[1]) / 2); ctl.set('d', d); sd.set(d); } M.kick(); c.onChange(); });
      const read = readout(host); const cx = 260, cy = 210, R = 190;
      K.drag(S, () => [{ id: 'p', x: cx, y: cy - R + sd.v / 6371 * R, r: 18 }], (id, x, y) => { const d = clamp(Math.round((y - (cy - R)) / R * 6371), 0, 6371); ctl.set('d', d); sd.set(d, true); M.kick(); c.onChange(); });
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g, d = sd.v; S.clear('#0c0f1a');
        LAY.forEach(([a, , , , , col]) => { G.fillStyle = col; G.beginPath(); G.arc(cx, cy, R * (1 - a / 6371), 0, 7); G.fill(); });
        G.fillStyle = '#0c0f1a'; G.beginPath(); G.moveTo(cx, cy); G.arc(cx, cy, R + 2, -Math.PI / 2, 0); G.closePath(); G.globalAlpha = 0.0; G.fill(); G.globalAlpha = 1;
        G.strokeStyle = '#fff'; G.lineWidth = 3; G.beginPath(); G.moveTo(cx, cy - R - 10); G.lineTo(cx, cy - R + d / 6371 * R); G.stroke(); G.fillStyle = '#7cf'; G.beginPath(); G.arc(cx, cy - R + d / 6371 * R, 9, 0, 7); G.fill();
        const L = LAY.find(l => d >= l[0] && d <= l[1]) || LAY[4]; seen.add(L[2]);
        LAY.forEach(([a, b, n], i) => { const y = 40 + i * 70; G.fillStyle = n === L[2] ? 'rgba(255,255,255,.12)' : 'transparent'; G.fillRect(500, y - 22, 290, 60); K.text(G, n, 512, y, { c: LAY[i][5], w: 800, s: 15 }); K.text(G, `${a.toLocaleString()}–${b.toLocaleString()} km`, 512, y + 22, { c: '#bbb', s: 12 }); });
        const P = d < 35 ? d * 0.03 : d < 2890 ? 1 + (d - 35) / (2890 - 35) * 135 : d < 5150 ? 136 + (d - 2890) / 2260 * 194 : 330 + (d - 5150) / 1221 * 30;
        read.innerHTML = IL(`**${Math.round(d).toLocaleString()} km down — ${L[2]}**: ${L[3]}. Temperature ${L[4]}. Pressure roughly **${fmt(P, 0)} GPa** (sea level ≈ 0.0001 GPa; approximate, from seismic models).`);
      }).add(sd);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); sd.set(0, true); seen.clear(); M.draw(); },
        observe() { return { text: `You visited **${seen.size} of 5** layers. The liquid layer is the **outer core** (2,890–5,150 km); the inner core is solid despite being hottest.`, predOk: seen.has('Inner core') ? p => p === 1 : null }; } };
    }
  };

  /* ============ 5 · Source investigator — the Great Fire of London, 1666 ============ */
  const SRC = [
    { id: 'pepys', t: 'Samuel Pepys’s diary, September 1666', d: 'A naval official’s private diary. On 2 September he describes watching the fire spread from a boat on the Thames; days later he records burying his wine and parmesan cheese in his garden to save them.', prim: true, use: { exp: 'very useful — an eyewitness describing what he saw and did', cause: 'limited — he saw the fire, not how it started' } },
    { id: 'evelyn', t: 'John Evelyn’s diary, September 1666', d: 'Another eyewitness diarist, a writer and gardener, who describes the fire’s scale and the destruction of St Paul’s Cathedral.', prim: true, use: { exp: 'very useful — a second, independent eyewitness lets you cross-check Pepys', cause: 'limited — describes effects, not the cause' } },
    { id: 'gazette', t: 'The London Gazette, September 1666', d: 'The official government newspaper’s report of the fire, published within days.', prim: true, use: { exp: 'useful for dates and the official account, but written to reassure readers', cause: 'useful for what the authorities said at the time — it described the fire as an accident' } },
    { id: 'monument', t: 'Inscription on the Monument, added 1681', d: 'An inscription added fifteen years later to the memorial column blamed the fire on Catholics. It was removed in 1830.', prim: true, use: { exp: 'not very useful — written years later', cause: 'useful as evidence of political and religious feeling in 1681 — but not reliable about the actual cause' } },
    { id: 'textbook', t: 'A modern history textbook', d: 'Written by historians who compared many sources. It says the fire began in a bakery on Pudding Lane and spread fast through closely packed timber houses in a dry, windy week.', prim: false, use: { exp: 'useful summary, but second-hand', cause: 'useful — it weighs many sources together' } }
  ];
  D.sources = { wide: true,
    intro: 'You are a historian investigating the **Great Fire of London (September 1666)**. Examine five real sources. For each one decide: is it **primary** or **secondary**? Then judge how useful it is for two questions: *What was the fire like?* and *What caused it?*',
    predict: { q: 'A diary written by someone who watched the fire is a…', options: ['secondary source', 'primary source', 'useless source', 'textbook'] },
    explore: 'Classify all five sources and choose a question to judge them against. Read why each judgement is made.',
    explain: '**Primary sources** come from the time (or the people) being studied — diaries, newspapers, inscriptions. **Secondary sources** are later interpretations, like textbooks. Usefulness depends on the **question**: an eyewitness diary is excellent for *what it was like* but cannot tell you *how it started*. Historians ask about **provenance**: who made it, when, why, and for whom. The 1681 Monument inscription is primary — but primary evidence of **1681 opinion**, not of the fire’s cause. Comparing several sources (corroboration) is how historians reach conclusions.',
    apply: [q('x-src1', 'The 1681 Monument inscription is most useful as evidence of…', ['the fire’s real cause', 'attitudes towards Catholics in 1681', 'the weather in 1666', 'nothing'], 1, 'Its provenance tells you about its own time.'), q('x-src2', 'Why compare Pepys with Evelyn?', ['To find the longest diary', 'To corroborate eyewitness accounts', 'Because both are secondary', 'To find the author'], 1, 'Corroboration strengthens conclusions.')],
    summary: ['Primary = from the time; secondary = later interpretation.', 'Usefulness depends on the question.', 'Check provenance and corroborate.'],
    build(host, c) {
      const st = {}; let qn = 'exp';
      host.insertAdjacentHTML('beforeend', `<div class="src">${SRC.map(s => `<article class="src__c" data-s="${s.id}"><h3 class="at-h3">${esc(s.t)}</h3><p>${esc(s.d)}</p><div class="src__b" role="group" aria-label="${T('Primary or secondary', 'أولي أم ثانوي')}"><button type="button" class="kx-card" data-v="1">${T('Primary', 'أولي')}</button><button type="button" class="kx-card" data-v="0">${T('Secondary', 'ثانوي')}</button></div><p class="src__f" aria-live="polite"></p></article>`).join('')}</div>`);
      const ctl = K.controls(host, [{ k: 'chips', id: 'q', label: T('Judge usefulness for', 'قيّم الفائدة لـ'), opts: [['exp', T('What was the fire like?', 'كيف كان الحريق؟')], ['cause', T('What caused it?', 'ما سببه؟')]], val: 'exp' }], (id, v) => { qn = v; SRC.forEach(show); c.onChange(); });
      const read = readout(host);
      function show(s) { const el = host.querySelector(`[data-s="${s.id}"]`), v = st[s.id]; if (v == null) return; el.querySelectorAll('[data-v]').forEach(b => { b.classList.toggle('is-ok', +b.dataset.v === +v && (+v === 1) === s.prim); b.classList.toggle('is-no', +b.dataset.v === +v && (+v === 1) !== s.prim); b.setAttribute('aria-pressed', String(+b.dataset.v === +v)); });
        el.querySelector('.src__f').innerHTML = IL(`${(+v === 1) === s.prim ? '✓' : '✗'} ${s.prim ? 'Primary — from the time.' : 'Secondary — a later interpretation.'} **For “${qn === 'exp' ? 'what was it like' : 'what caused it'}”:** ${s.use[qn]}.`); sum(); }
      function sum() { const done = Object.keys(st).length, ok = SRC.filter(s => st[s.id] != null && (+st[s.id] === 1) === s.prim).length; read.innerHTML = IL(`Classified **${done} of 5**, ${ok} correctly.${done === 5 ? ' Notice that the most useful source changes with the question you ask.' : ''}`); }
      host.querySelector('.src').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; const id = b.closest('[data-s]').dataset.s; st[id] = +b.dataset.v; show(SRC.find(s => s.id === id)); c.onChange(); });
      sum();
      return { reset() { Object.keys(st).forEach(k => delete st[k]); host.querySelectorAll('.src__f').forEach(f => { f.textContent = ''; }); host.querySelectorAll('[data-v]').forEach(b => b.classList.remove('is-ok', 'is-no')); ctl.reset(); qn = 'exp'; sum(); },
        observe() { const ok = SRC.filter(s => st[s.id] != null && (+st[s.id] === 1) === s.prim).length; return { text: `You classified ${Object.keys(st).length} source(s), **${ok}** correctly. Pepys’s diary is a **primary** source: excellent for experience, limited for causes.`, predOk: st.pepys != null ? p => p === 1 : null }; } };
    }
  };

  /* ============ 6 · Chain of consequences — the printing press ============ */
  const CHAIN = [['press', 'Johannes Gutenberg develops a printing press with movable metal type in Mainz (around 1440–1450).'], ['cheap', 'Books can be produced far faster and more cheaply than by hand-copying.'], ['spread', 'Many identical copies spread quickly across Europe — by 1500, presses operate in hundreds of towns.'], ['read', 'More printed material, and gradually more people learning to read.'], ['ideas', 'New ideas spread fast and widely — for example, Martin Luther’s writings in 1517 circulated across Germany within weeks.'], ['sci', 'Scientists can share and check each other’s exact findings, diagrams and data, helping the Scientific Revolution.']];
  const WHY = { cheap: 'Each page could be printed hundreds of times from one setting of type.', spread: 'Cheaper books meant more copies to sell and carry.', read: 'More, cheaper reading material encouraged literacy over generations.', ideas: 'Printed pamphlets reached far more people than speeches or manuscripts.', sci: 'Identical copies meant everyone saw the same figures and tables.' };
  D.printing = { wide: true,
    intro: 'Historians explain change through **chains of cause and consequence**. Put these six events in order, from the invention of the printing press to its long-term effects. Use the arrows (or drag) to move a card.',
    predict: { q: 'The printing press most directly caused…', options: ['the Scientific Revolution, immediately', 'books becoming faster and cheaper to make', 'the invention of paper', 'the end of handwriting'] },
    explore: 'Order the chain. Then read each link: why does one step lead to the next?',
    explain: 'Big changes rarely have one cause or one effect. The press did not instantly produce the Scientific Revolution; it made **books cheaper and faster to make**, which allowed **wider spread**, which over generations supported **literacy** and the **fast circulation of ideas**, which in turn helped scientists **share and verify** work. Thinking in chains shows how short-term effects build into long-term consequences — and where other causes (religion, trade, universities) joined in.',
    apply: [q('x-pp1', 'Gutenberg’s press used…', ['movable metal type', 'computers', 'carved woodblocks only', 'photography'], 0, 'Reusable individual letters.'), q('x-pp2', 'Why is the Scientific Revolution a long-term consequence?', ['It happened the same year', 'It depended on many intermediate changes', 'Gutenberg was a scientist', 'It caused printing'], 1, 'A chain of consequences.')],
    summary: ['Change happens through chains of cause and consequence.', 'Short-term: cheaper, faster books; long-term: literacy and spreading ideas.', 'Other causes join the chain.'],
    build(host, c) {
      let order = CHAIN.map(x => x[0]).sort(() => Math.random() - 0.5); let checks = 0; if (order.join() === CHAIN.map(x => x[0]).join()) order.reverse();
      const list = document.createElement('ol'); list.className = 'chn'; host.appendChild(list);
      const ctl = K.controls(host, [{ k: 'btn', id: 'check', label: T('Check my chain', 'تحقق من السلسلة'), accent: true }, { k: 'btn', id: 'shuffle', label: T('Shuffle', 'اخلط') }], id => { if (id === 'check') { checks++; draw(true); } if (id === 'shuffle') { order.sort(() => Math.random() - 0.5); draw(false); } c.onChange(); });
      const read = readout(host);
      function draw(checking) { const right = CHAIN.map(x => x[0]);
        list.innerHTML = order.map((k, i) => { const txt = CHAIN.find(x => x[0] === k)[1], ok = checking && right[i] === k; return `<li class="chn__i ${checking ? (ok ? 'is-ok' : 'is-no') : ''}" draggable="true" data-k="${k}"><span class="chn__n">${i + 1}</span><span>${esc(txt)}${checking && ok && i > 0 ? `<small class="chn__why">↳ ${esc(WHY[k])}</small>` : ''}</span><span class="chn__mv"><button type="button" data-mv="${i}:-1" aria-label="${T('Move up', 'لأعلى')}" ${i ? '' : 'disabled'}>↑</button><button type="button" data-mv="${i}:1" aria-label="${T('Move down', 'لأسفل')}" ${i < order.length - 1 ? '' : 'disabled'}>↓</button></span></li>`; }).join('');
        const n = order.filter((k, i) => right[i] === k).length; read.innerHTML = IL(checking ? (n === 6 ? '**The chain is in order.** Each link now shows why it leads to the next.' : `**${n} of 6** in the right place. Ask of each card: “what had to happen first?”`) : 'Order the cards, then check.'); }
      list.addEventListener('click', e => { const b = e.target.closest('[data-mv]'); if (!b) return; const [i, d] = b.dataset.mv.split(':').map(Number); [order[i], order[i + d]] = [order[i + d], order[i]]; draw(false); list.querySelector(`[data-mv="${i + d}:${d}"]`)?.focus(); c.onChange(); });
      let dragK = null; list.addEventListener('dragstart', e => { dragK = e.target.closest('[data-k]')?.dataset.k; }); list.addEventListener('dragover', e => e.preventDefault());
      list.addEventListener('drop', e => { e.preventDefault(); const tgt = e.target.closest('[data-k]'); if (!tgt || !dragK) return; const a = order.indexOf(dragK), b = order.indexOf(tgt.dataset.k); order.splice(a, 1); order.splice(b, 0, dragK); draw(false); c.onChange(); });
      draw(false);
      return { reset() { order = CHAIN.map(x => x[0]).reverse(); checks = 0; draw(false); }, _order: () => order, _set: o => { order = o.slice(); draw(true); },
        observe() { const right = CHAIN.map(x => x[0]), n = order.filter((k, i) => right[i] === k).length; return { text: `**${n} of 6** cards are in the right place${n === 6 ? ' — the chain runs from cheaper books to the Scientific Revolution' : ''}.`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 7 · Deep time ============ */
  const EVTS = [[13.8e9, 'Big Bang'], [4.6e9, 'The Sun forms'], [4.54e9, 'The Earth forms'], [3.7e9, 'Earliest evidence of life (approx.)'], [2.4e9, 'Oxygen builds up in the air'], [538e6, 'Cambrian “explosion” of animal life'], [470e6, 'Plants colonise land (approx.)'], [230e6, 'First dinosaurs (approx.)'], [66e6, 'Non-bird dinosaurs go extinct'], [6e6, 'Human and chimpanzee lineages split (approx.)'], [300e3, 'Earliest Homo sapiens (approx.)'], [12e3, 'Farming begins (approx.)'], [5.2e3, 'Writing invented (approx.)'], [575, 'Gutenberg’s printing press'], [57, 'First Moon landing (1969)']];
  D['deep-time'] = { wide: true,
    intro: 'All of history on one line. Switch between a **linear** view (true proportions) and a **logarithmic** view (each step ten times further back). Then squeeze the whole 13.8 billion years into a single **calendar year** and find out when humans arrive.',
    predict: { q: 'If the history of the universe were one year starting 1 January, the first Homo sapiens would appear…', options: ['in June', 'in early December', 'about 11 minutes before midnight on 31 December', 'on 2 January'] },
    explore: 'In the linear view, try to find human history. Switch to the log view. Then read the cosmic-calendar dates of each event.',
    explain: 'Deep time is too vast to picture on a linear scale: everything human crowds into the last pixel. A **logarithmic** scale gives equal space to each factor of ten, so recent and ancient events can be seen together. In the **cosmic calendar**, one day ≈ 37.8 million years: the Earth forms in early September, dinosaurs vanish on 30 December, and **Homo sapiens** appears only about **11 minutes before midnight** on 31 December. Dates are standard scientific estimates; many are approximate.',
    apply: [q('x-dt1', 'On a linear timeline of the universe, all of recorded history would be…', ['about half of it', 'invisibly small at the very end', 'at the start', 'a tenth of it'], 1, 'About 5,000 of 13.8 billion years.'), q('x-dt2', 'A logarithmic scale is useful because…', ['it shows recent and ancient events together', 'it is more accurate', 'it removes approximate dates', 'it is linear'], 0, 'Each factor of ten gets equal space.')],
    summary: ['Deep time spans 13.8 billion years.', 'Log scales show very different magnitudes together.', 'Cosmic calendar: humans arrive in the last minutes of the year.'],
    build(host, c) {
      const S = K.stage(host, 800, 380), sm = K.spring(1, 5); let log = true, sel = 10; const seen = new Set();
      const ctl = K.controls(host, [{ k: 'chips', id: 'scale', label: T('Scale', 'المقياس'), opts: [['log', T('Logarithmic', 'لوغاريتمي')], ['lin', T('Linear', 'خطي')]], val: 'log' }], (id, v) => { log = v === 'log'; sm.set(log ? 1 : 0); M.kick(); c.onChange(); });
      const read = readout(host);
      const xL = a => 40 + (Math.log10(13.8e9) - Math.log10(a)) / (Math.log10(13.8e9) - Math.log10(30)) * 720, xN = a => 40 + (1 - a / 13.8e9) * 720;
      const cal = a => { const f = 1 - a / 13.8e9, sec = f * 365 * 86400, day = Math.floor(sec / 86400), dt = new Date(Date.UTC(2023, 0, 1) + sec * 1000); const left = 365 * 86400 - sec; return left < 86400 ? `31 Dec, ${left >= 60 ? fmt(left / 60, left < 600 ? 1 : 0) + ' min' : fmt(left, 1) + ' s'} before midnight` : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); };
      const posX = a => K.lerp(xN(a), xL(a), sm.v);
      K.drag(S, () => EVTS.map((e, i) => ({ id: i, x: posX(e[0]), y: 190, r: 12 })), id => { sel = id; seen.add(id); M.draw(); c.onChange(); });
      S.cv.addEventListener('keydown', e => { if (e.key === 'ArrowRight') sel = Math.min(EVTS.length - 1, sel + 1); if (e.key === 'ArrowLeft') sel = Math.max(0, sel - 1); seen.add(sel); M.draw(); }); S.cv.tabIndex = 0;
      const fa = a => a >= 1e9 ? fmt(a / 1e9, 2) + ' billion' : a >= 1e6 ? fmt(a / 1e6, 0) + ' million' : a >= 1e3 ? fmt(a / 1e3, a < 1e4 ? 1 : 0) + ' thousand' : fmt(a, 0);
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); const g = G.createLinearGradient(40, 0, 760, 0); g.addColorStop(0, '#1b1d4a'); g.addColorStop(0.5, '#3c6db0'); g.addColorStop(1, '#e0a040'); G.fillStyle = g; G.fillRect(40, 180, 720, 20);
        EVTS.forEach((e, i) => { const x = posX(e[0]), up = i % 2; G.strokeStyle = i === sel ? Pl.red : Pl.ink; G.lineWidth = i === sel ? 3 : 1.2; G.beginPath(); G.moveTo(x, 190); G.lineTo(x, up ? 150 - ((i >> 1) % 4) * 32 : 230 + ((i >> 1) % 4) * 32); G.stroke(); G.fillStyle = i === sel ? Pl.red : Pl.ink; G.beginPath(); G.arc(x, 190, i === sel ? 8 : 5, 0, 7); G.fill();
          G.save(); G.translate(x + 3, up ? 144 - ((i >> 1) % 4) * 32 : 242 + ((i >> 1) % 4) * 32); G.rotate(up ? -0.35 : 0.35); K.text(G, e[1].replace(/ \(approx\.\)/, ''), 0, 0, { s: 11, w: i === sel ? 800 : 500, c: i === sel ? Pl.red : Pl.muted }); G.restore(); });
        K.text(G, T('13.8 billion years ago', 'قبل 13.8 مليار سنة'), 40, 360, { s: 11, c: Pl.muted }); K.text(G, T('now', 'الآن'), 760, 360, { a: 'right', s: 11, c: Pl.muted }); K.text(G, log ? T('logarithmic scale', 'مقياس لوغاريتمي') : T('linear scale — true proportions', 'مقياس خطي'), 400, 360, { a: 'center', s: 12, w: 700 });
        const e = EVTS[sel]; read.innerHTML = IL(`**${e[1]}** — about **${fa(e[0])} years ago**. On the cosmic calendar: **${cal(e[0])}**. ${!log && e[0] < 1e7 ? 'On the linear scale it is squeezed against “now”.' : ''}`);
      }).add(sm);
      M.draw(); seen.add(sel);
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); log = true; sm.set(1, true); sel = 10; seen.clear(); M.draw(); }, _cal: cal,
        observe() { return { text: `On the cosmic calendar, Homo sapiens appears **${cal(300e3)}**; the Earth forms on **${cal(4.54e9)}**; dinosaurs disappear on **${cal(66e6)}**. You inspected ${seen.size} event(s).`, predOk: p => p === 2 }; } };
    }
  };
})();
