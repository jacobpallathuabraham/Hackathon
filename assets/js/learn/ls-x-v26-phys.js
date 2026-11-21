/* ERLY Learning Studio v26 — physics: the Solar System explorer and a free circuit builder.

   SOLAR SYSTEM
     Planet data: NASA Planetary Fact Sheet (radius, mass, orbital period, rotation, mean temperature).
     Positions on any date: approximate mean orbital elements at J2000 (JPL "Keplerian elements for approximate
     positions", 1800–2050): semi-major axis a, eccentricity e, mean longitude L and longitude of perihelion ϖ.
     M = L − ϖ + n·(days since J2000), Kepler's equation E − e sin E = M is solved by Newton's method, then
     r = a(1 − e cos E) and the true anomaly ν give the position. Orbits are drawn flat (inclinations of 0–7° are
     ignored) — positions are good to roughly a degree, enough to see where the planets are, not to point a telescope.
     Sizes and distances cannot both be to scale on one screen: the modes say exactly what is and is not to scale.
   CIRCUIT BUILDER
     Components sit on the edges of a grid. Wires and closed switches join nodes (union–find); batteries are ideal
     voltage sources with a small internal resistance (0.05 Ω, so a short circuit gives a large but finite current);
     resistors and bulbs are resistors. Modified nodal analysis (Kirchhoff's current law at every node) is solved
     by Gaussian elimination; a tiny leakage to ground (10⁻⁹ S) keeps unconnected parts well defined and has no
     visible effect on any reading. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, IL = LS.inline, esc = LS.esc;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const f = (v, d = 2) => K.fmt(v, d);

  /* ======================= SOLAR SYSTEM ======================= */
  // name, a (AU), e, period (days), L0 (°), ϖ (°), radius (km), mass (10^24 kg), rotation (h, − = retrograde), mean temp (°C), colour, major moons
  const PL = [
    ['Mercury', 0.38710, 0.20563, 87.969, 252.25032, 77.45780, 2439.7, 0.330, 1407.6, 167, '#a8a29a', 'none'],
    ['Venus', 0.72333, 0.00677, 224.701, 181.97910, 131.60247, 6051.8, 4.87, -5832.5, 464, '#e8c37a', 'none'],
    ['Earth', 1.00000, 0.01671, 365.256, 100.46457, 102.93768, 6371.0, 5.97, 23.9, 15, '#4f8fe0', 'the Moon'],
    ['Mars', 1.52371, 0.09339, 686.980, 355.44657, 336.05637, 3389.5, 0.642, 24.6, -65, '#d0643f', 'Phobos, Deimos'],
    ['Jupiter', 5.20288, 0.04839, 4332.59, 34.39644, 14.72848, 69911, 1898, 9.9, -110, '#d9a77a', 'Io, Europa, Ganymede, Callisto'],
    ['Saturn', 9.53668, 0.05386, 10759.2, 49.95424, 92.59888, 58232, 568, 10.7, -140, '#e6d19a', 'Titan, Enceladus, Rhea, Iapetus'],
    ['Uranus', 19.18916, 0.04726, 30688.5, 313.23810, 170.95428, 25362, 86.8, -17.2, -195, '#8fd6dd', 'Titania, Oberon, Miranda'],
    ['Neptune', 30.06992, 0.00859, 60182, 304.87997, 44.96476, 24622, 102, 16.1, -200, '#4a6fe0', 'Triton']
  ].map(r => ({ n: r[0], a: r[1], e: r[2], P: r[3], L0: r[4], w: r[5], R: r[6], M: r[7], rot: r[8], temp: r[9], col: r[10], moons: r[11] }));
  const SUN_R = 695700, AU = 149597870.7, G = 6.674e-11, J2000 = Date.UTC(2000, 0, 1, 12);
  const rad = d => d * Math.PI / 180;
  function pos(p, days) { // heliocentric position (AU) in the ecliptic plane
    const n = 360 / p.P, M = rad(((p.L0 - p.w + n * days) % 360 + 360) % 360); let E = M;
    for (let i = 0; i < 12; i++) E -= (E - p.e * Math.sin(E) - M) / (1 - p.e * Math.cos(E));
    const r = p.a * (1 - p.e * Math.cos(E)), nu = 2 * Math.atan2(Math.sqrt(1 + p.e) * Math.sin(E / 2), Math.sqrt(1 - p.e) * Math.cos(E / 2)), th = nu + rad(p.w);
    return { x: r * Math.cos(th), y: r * Math.sin(th), r };
  }
  const gSurf = p => G * p.M * 1e24 / (p.R * 1e3) ** 2;
  D['solar-system'] = { wide: true,
    intro: 'The eight planets on the date you choose, moving on their real elliptical orbits. Run time forwards or backwards, zoom from the inner planets out to Neptune, and select a planet to compare it with Earth.\n\nOne screen cannot show both true **distances** and true **sizes**: at true scale the planets would be far smaller than one pixel. The **view** buttons tell you exactly what is to scale.',
    predict: { q: 'Mars is about 1.5 times as far from the Sun as Earth. Its year is…', options: ['about 1.5 Earth years', 'about 1.9 Earth years', 'about 2.25 Earth years', 'about 3.4 Earth years'] },
    explore: '- Press **Play** at **30 days/s** and watch Mercury lap Earth. Which planets move fastest?\n- Open **Kepler’s third law** and compare P² with a³ for every planet.\n- Switch to **sizes to scale** and compare Jupiter with Earth.\n- Select Mercury and look at the shape of its orbit — it is the most eccentric.',
    explain: 'Planets move on **ellipses** with the Sun at one focus (Kepler’s first law), faster when closer to the Sun (second law), and the square of the orbital period is proportional to the cube of the average distance: **P² = a³** with P in years and a in astronomical units (third law). Newton showed all three follow from gravity, **F = GMm/r²**. Mars at a = 1.524 AU: P = 1.524^1.5 ≈ 1.88 years.',
    apply: [
      q('x-ss1', 'A planet orbits at a = 4 AU. By Kepler’s third law its period is…', ['4 years', '8 years', '16 years', '64 years'], 1, 'P² = a³ = 64, so P = 8 years.'),
      q('x-ss2', 'Why can’t a poster show the Solar System with both sizes and distances to scale?', ['The planets move too fast', 'At a scale where the orbits fit, the planets would be far smaller than a dot', 'Nobody knows the distances', 'The Sun is too bright'], 1, 'Neptune’s orbit is about 9 billion km across; Earth is 12,742 km wide — about 700,000 times smaller.'),
      q('x-ss3', 'Surface gravity on Jupiter is about…', ['the same as on Earth', '2.5 times Earth’s', '318 times Earth’s', '11 times Earth’s'], 1, 'g = GM/R²: Jupiter has 318 times Earth’s mass but 11 times its radius, so 318/121 ≈ 2.6.')
    ],
    summary: ['Orbits are ellipses with the Sun at a focus.', 'Closer planets move faster and have shorter years.', 'Kepler III: P² = a³ (years, AU).', 'Surface gravity g = GM/R² depends on mass and radius.'],
    connect: [{ label: 'Gravity explorer', href: '#/exp/gravity-explorer' }, { label: 'What if the Sun were heavier?', href: '#/exp/orbit-whatif' }],
    build(host, c) {
      const S = K.stage(host, 960, 600, 'ss__stage'); S.cv.tabIndex = 0; S.cv.setAttribute('role', 'img');
      const ctl = K.controls(host, [
        { k: 'chips', id: 'view', label: T('View', 'العرض'), opts: [['dist', T('Distances to scale', 'المسافات بمقياس')], ['log', T('Compressed (overview)', 'مضغوط')], ['size', T('Sizes to scale', 'الأحجام بمقياس')]], val: 'log' },
        { k: 'chips', id: 'speed', label: T('Time', 'الزمن'), opts: [[-30, '−30 d/s'], [1, '1 d/s'], [10, '10 d/s'], [30, '30 d/s'], [365, '1 yr/s']], val: 10 },
        { k: 'row' }, { k: 'btn', id: 'run', label: T('Play ▸', 'تشغيل'), accent: true }, { k: 'btn', id: 'today', label: T('Today', 'اليوم') }, { k: 'btn', id: 'k3', label: T('Kepler’s third law', 'قانون كبلر الثالث') }, { k: 'end' }
      ], on);
      const info = document.createElement('div'); info.className = 'v26-card ss__info'; info.setAttribute('aria-live', 'polite'); host.appendChild(info);
      const k3 = document.createElement('div'); k3.className = 'v26-card'; k3.hidden = true; host.appendChild(k3);
      const now = Date.now(); let days = (now - J2000) / 864e5, sim = false, view = 'log', speed = 10, sel = 2, zoom = K.spring(1, 8), panX = 0, panY = 0;
      const scaleFn = () => { if (view === 'dist') return r => r * 26 * zoom.v; return r => (Math.log10(1 + r * 3) / Math.log10(1 + 31 * 3)) * 270 * zoom.v; };
      const toXY = (x, y) => { const r = Math.hypot(x, y), s = scaleFn()(r), k2 = r ? s / r : 0; return [480 + panX + x * k2, 300 + panY - y * k2]; };
      function draw() {
        const G2 = S.g, P = K.pal(); S.clear('#070b18'); G2.save();
        // a fixed star field (seeded) for depth — not real stars
        G2.fillStyle = '#fff'; for (let i = 0; i < 140; i++) { const x = (i * 197.3) % 960, y = (i * 83.7 + i * i * 0.37) % 600; G2.globalAlpha = 0.15 + (i % 7) / 14; G2.fillRect(x, y, i % 9 ? 1 : 2, i % 9 ? 1 : 2); } G2.globalAlpha = 1;
        if (view === 'size') { drawSizes(G2); G2.restore(); return; }
        // orbits
        PL.forEach((p, i) => { G2.strokeStyle = i === sel ? 'rgba(255,214,140,.65)' : 'rgba(170,190,255,.22)'; G2.lineWidth = i === sel ? 1.6 : 1; G2.beginPath(); for (let k = 0; k <= 180; k++) { const E = k / 180 * 2 * Math.PI, xr = p.a * (Math.cos(E) - p.e), yr = p.a * Math.sqrt(1 - p.e * p.e) * Math.sin(E), w = rad(p.w), x = xr * Math.cos(w) - yr * Math.sin(w), y = xr * Math.sin(w) + yr * Math.cos(w); const [X, Y] = toXY(x, y); if (k) G2.lineTo(X, Y); else G2.moveTo(X, Y); } G2.stroke(); });
        // sun
        const [sx, sy] = toXY(0, 0); const gr = G2.createRadialGradient(sx, sy, 0, sx, sy, 26); gr.addColorStop(0, '#fff7d6'); gr.addColorStop(0.3, '#ffd36b'); gr.addColorStop(1, 'rgba(255,170,60,0)'); G2.fillStyle = gr; G2.beginPath(); G2.arc(sx, sy, 26, 0, 7); G2.fill();
        // planets (sizes enlarged — said on screen)
        PL.forEach((p, i) => { const ps = pos(p, days), [X, Y] = toXY(ps.x, ps.y), r = 3 + Math.log10(p.R) * 1.4 - 4; if (X < -20 || X > 980 || Y < -20 || Y > 620) return;
          G2.fillStyle = p.col; G2.beginPath(); G2.arc(X, Y, r, 0, 7); G2.fill(); if (p.n === 'Saturn') { G2.strokeStyle = 'rgba(230,209,154,.8)'; G2.lineWidth = 1.4; G2.beginPath(); G2.ellipse(X, Y, r * 2, r * 0.7, -0.4, 0, 7); G2.stroke(); }
          if (i === sel) { G2.strokeStyle = '#ffd68c'; G2.lineWidth = 2; G2.beginPath(); G2.arc(X, Y, r + 6, 0, 7); G2.stroke(); }
          G2.fillStyle = 'rgba(230,236,255,.9)'; G2.font = '600 12px ui-sans-serif, system-ui'; G2.fillText(p.n, X + r + 5, Y - r - 2); });
        const dt = new Date(J2000 + days * 864e5);
        G2.fillStyle = '#e8edff'; G2.font = '700 15px ui-sans-serif, system-ui'; G2.fillText(dt.toISOString().slice(0, 10), 16, 26);
        G2.font = '500 12px ui-sans-serif, system-ui'; G2.fillStyle = 'rgba(220,228,255,.75)'; G2.fillText(view === 'dist' ? T('Distances to scale (1 AU = 26 px × zoom). The Sun and planet dots are NOT to scale — at this scale even Jupiter would be about 0.01 px wide.', 'المسافات بمقياس، النقاط ليست بمقياس') : T('Compressed view: distance from the Sun is squeezed (logarithmic) so all eight fit. Orbit shapes and angles are real; spacing is not.', 'عرض مضغوط'), 16, 590);
        G2.restore();
      }
      function drawSizes(G2) { // true relative sizes: the Sun's edge and the eight planets on one scale
        const scale = 160 / 69911; let x = 40; const y = 330;
        G2.fillStyle = '#ffcf5a'; G2.beginPath(); G2.arc(-SUN_R * scale + 30, y, SUN_R * scale, 0, 7); G2.fill();
        PL.forEach((p, i) => { const r = p.R * scale; x += (i ? PL[i - 1].R * scale : 0) + r + 18; if (i === 0) x = 70; G2.fillStyle = p.col; G2.beginPath(); G2.arc(x, y, Math.max(r, 0.6), 0, 7); G2.fill(); if (i === sel) { G2.strokeStyle = '#ffd68c'; G2.lineWidth = 2; G2.beginPath(); G2.arc(x, y, Math.max(r, 3) + 5, 0, 7); G2.stroke(); } G2.fillStyle = '#e8edff'; G2.font = '600 12px ui-sans-serif'; G2.save(); G2.translate(x, y + Math.max(r, 6) + 16); G2.rotate(0.6); G2.fillText(p.n, 0, 0); G2.restore(); });
        G2.fillStyle = 'rgba(220,228,255,.8)'; G2.font = '500 12px ui-sans-serif'; G2.fillText(T('Sizes to scale: the Sun’s edge (left) and the planets, all at the same scale. Distances between them are NOT to scale.', 'الأحجام بمقياس'), 16, 590);
      }
      function showInfo() {
        const p = PL[sel], E = PL[2], ps = pos(p, days), g = gSurf(p), dEarth = (() => { const a = pos(p, days), b = pos(E, days); return Math.hypot(a.x - b.x, a.y - b.y); })();
        info.innerHTML = `<h3>${esc(p.n)}</h3><table><tr><th>${T('Distance from the Sun now', 'البعد عن الشمس')}</th><td>${f(ps.r, 3)} AU (${f(ps.r * AU / 1e6, 0)} million km)</td></tr>${p.n !== 'Earth' ? `<tr><th>${T('Distance from Earth now', 'البعد عن الأرض')}</th><td>${f(dEarth, 3)} AU</td></tr>` : ''}<tr><th>${T('Orbit', 'المدار')}</th><td>a = ${p.a} AU, e = ${p.e} · ${T('year', 'السنة')} ${f(p.P, 1)} ${T('days', 'يوم')} = ${f(p.P / 365.256, 2)} ${T('Earth years', 'سنة أرضية')}</td></tr><tr><th>${T('Radius', 'نصف القطر')}</th><td>${p.R.toLocaleString()} km = ${f(p.R / E.R, 2)} × Earth</td></tr><tr><th>${T('Mass', 'الكتلة')}</th><td>${p.M} × 10²⁴ kg = ${f(p.M / E.M, 3)} × Earth</td></tr><tr><th>${T('Surface gravity g = GM/R²', 'الجاذبية السطحية')}</th><td>${f(g, 2)} m/s² = ${f(g / gSurf(E), 2)} × Earth${p.R > 20000 ? T(' (at the cloud tops: giant planets have no solid surface)', ' (عند قمم الغيوم)') : ''}</td></tr><tr><th>${T('Day (rotation)', 'اليوم')}</th><td>${f(Math.abs(p.rot), 1)} h${p.rot < 0 ? T(' — spins backwards (retrograde)', ' — دوران عكسي') : ''}</td></tr><tr><th>${T('Mean temperature', 'متوسط الحرارة')}</th><td>${p.temp} °C</td></tr><tr><th>${T('Major moons', 'أقمار رئيسية')}</th><td>${esc(p.moons)}</td></tr></table><p class="v26-hint">${T('Data: NASA Planetary Fact Sheet. Positions from mean J2000 orbital elements (approximate).', 'البيانات: ناسا')}</p>`;
      }
      function keplerTable() { k3.innerHTML = `<h3>${T('Kepler’s third law: P² = a³', 'قانون كبلر الثالث')}</h3><table><tr><th>${T('Planet', 'الكوكب')}</th><th>a (AU)</th><th>a³</th><th>P (${T('years', 'سنوات')})</th><th>P²</th><th>P² / a³</th></tr>${PL.map(p => { const P = p.P / 365.256; return `<tr><td>${p.n}</td><td>${p.a}</td><td>${f(p.a ** 3, 3)}</td><td>${f(P, 3)}</td><td>${f(P * P, 3)}</td><td><b>${f(P * P / p.a ** 3, 3)}</b></td></tr>`; }).join('')}</table>`; }
      const M = K.motor(c, host, (dt, running) => { if (running) days += speed * Math.min(dt, 0.05); draw(); if (running && Math.random() < 0.15) showInfo(); }).add(zoom);
      function on(id, v) {
        if (id === 'view') { view = v; panX = panY = 0; zoom.set(1, true); }
        if (id === 'speed') speed = v;
        if (id === 'run') { sim = !sim; if (sim) M.play(); else M.pause(); host.querySelector('[data-kb="run"]').textContent = sim ? T('Pause ❚❚', 'إيقاف') : T('Play ▸', 'تشغيل'); }
        if (id === 'today') days = (Date.now() - J2000) / 864e5;
        if (id === 'k3') { k3.hidden = !k3.hidden; keplerTable(); }
        showInfo(); M.draw();
      }
      // select by click, pan by drag, zoom by wheel / pinch / keys
      let drag = null; const pts = new Map();
      S.cv.style.touchAction = 'none';
      S.cv.addEventListener('pointerdown', e => { e.preventDefault(); S.cv.focus({ preventScroll: true }); pts.set(e.pointerId, S.pt(e)); S.cv.setPointerCapture(e.pointerId); const [x, y] = S.pt(e); drag = { x, y, px: panX, py: panY, moved: false }; });
      S.cv.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, S.pt(e)); if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (drag && drag.pd) zoom.set(K.clamp(zoom.t * d / drag.pd, 0.3, 40), true); if (drag) drag.pd = d; drag.moved = true; M.draw(); return; } if (!drag) return; const [x, y] = S.pt(e); if (Math.hypot(x - drag.x, y - drag.y) > 4) drag.moved = true; if (drag.moved && view !== 'size') { panX = drag.px + x - drag.x; panY = drag.py + y - drag.y; M.draw(); } });
      const up = e => { pts.delete(e.pointerId); if (drag && !drag.moved) { const [x, y] = S.pt(e); let best = -1, bd = 24; PL.forEach((p, i) => { let X, Y; if (view === 'size') return; const ps = pos(p, days); [X, Y] = toXY(ps.x, ps.y); const d = Math.hypot(X - x, Y - y); if (d < bd) { bd = d; best = i; } }); if (best >= 0) { sel = best; showInfo(); M.draw(); } } if (!pts.size) drag = null; };
      S.cv.addEventListener('pointerup', up); S.cv.addEventListener('pointercancel', up);
      S.cv.addEventListener('wheel', e => { if (view === 'size') return; e.preventDefault(); zoom.set(K.clamp(zoom.t * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.3, 40)); M.kick(); }, { passive: false });
      S.cv.addEventListener('keydown', e => { if (e.key === '+' || e.key === '=') { zoom.set(K.clamp(zoom.t * 1.2, 0.3, 40)); M.kick(); } else if (e.key === '-') { zoom.set(K.clamp(zoom.t / 1.2, 0.3, 40)); M.kick(); } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { sel = (sel + (e.key === 'ArrowRight' ? 1 : 7)) % 8; showInfo(); M.draw(); } else if (e.key === ' ') { e.preventDefault(); on('run'); } else return; e.preventDefault(); });
      S.cv.setAttribute('aria-label', T('The Solar System. Left and right arrow keys choose a planet; plus and minus zoom; space plays or pauses time.', 'المجموعة الشمسية'));
      showInfo(); M.draw();
      return { play() { if (!sim) on('run'); }, pause() { if (sim) on('run'); }, running: () => sim, destroy() { sim = false; M.pause(); S.destroy(); },
        reset() { if (sim) on('run'); days = (Date.now() - J2000) / 864e5; sel = 2; panX = panY = 0; zoom.set(1, true); ctl.reset(); view = 'log'; speed = 10; showInfo(); M.draw(); },
        _pos: (i, d) => pos(PL[i], d), _g: i => gSurf(PL[i]),
        observe() { const P = PL.map(p => p.P / 365.256); return { text: `On ${new Date(J2000 + days * 864e5).toISOString().slice(0, 10)}. P²/a³ for the eight planets: ${PL.map((p, i) => `${p.n} ${f(P[i] * P[i] / p.a ** 3, 3)}`).join(', ')} — all ≈ 1, as Kepler’s third law says. Mars: a = 1.524 AU → **P = ${f(P[3], 2)} years**.`, predOk: i => i === 1 }; }
      };
    }
  };

  /* ======================= CIRCUIT BUILDER ======================= */
  const GW = 8, GH = 5; // grid of nodes
  const KINDS = { wire: { n: 'Wire', R: 0 }, battery: { n: 'Battery', V: 6 }, resistor: { n: 'Resistor', R: 10 }, bulb: { n: 'Bulb', R: 12 }, switch: { n: 'Switch', closed: true }, ammeter: { n: 'Ammeter', R: 0 } };
  function solve(parts) {
    const N = GW * GH, par = [...Array(N).keys()], find = i => (par[i] === i ? i : (par[i] = find(par[i]))), uni = (a, b) => { par[find(a)] = find(b); };
    parts.forEach(p => { if (p.k === 'wire' || (p.k === 'switch' && p.closed)) uni(p.a, p.b); });
    const roots = [...new Set([...Array(N).keys()].map(find))], idx = new Map(roots.map((r, i) => [r, i])), n = roots.length;
    const srcs = parts.filter(p => p.k === 'battery'), m = srcs.length, size = n + m, A = Array.from({ length: size }, () => new Float64Array(size)), z = new Float64Array(size);
    const stamp = (a, b, g) => { A[a][a] += g; A[b][b] += g; A[a][b] -= g; A[b][a] -= g; };
    for (let i = 0; i < n; i++) A[i][i] += 1e-9;
    const RINT = 0.05;
    const RA = 0.001; // an ammeter is a (nearly) zero resistance in the loop, so its reading is the loop current
    parts.forEach(p => { if (p.k === 'resistor' || p.k === 'bulb' || p.k === 'ammeter') { const a = idx.get(find(p.a)), b = idx.get(find(p.b)); if (a !== b) stamp(a, b, 1 / (p.k === 'ammeter' ? RA : p.R)); } });
    srcs.forEach((p, j) => { const a = idx.get(find(p.a)), b = idx.get(find(p.b)), r = n + j; // + terminal at p.b
      A[b][r] += 1; A[a][r] -= 1; A[r][b] += 1; A[r][a] -= 1; A[r][r] -= RINT; z[r] = p.V; });
    // Gaussian elimination with partial pivoting
    for (let c2 = 0; c2 < size; c2++) { let pv = c2; for (let r = c2 + 1; r < size; r++) if (Math.abs(A[r][c2]) > Math.abs(A[pv][c2])) pv = r; [A[c2], A[pv]] = [A[pv], A[c2]]; [z[c2], z[pv]] = [z[pv], z[c2]]; const d = A[c2][c2]; if (Math.abs(d) < 1e-15) continue; for (let r = c2 + 1; r < size; r++) { const k = A[r][c2] / d; if (!k) continue; for (let cc = c2; cc < size; cc++) A[r][cc] -= k * A[c2][cc]; z[r] -= k * z[c2]; } }
    const x = new Float64Array(size); for (let r = size - 1; r >= 0; r--) { let s = z[r]; for (let cc = r + 1; cc < size; cc++) s -= A[r][cc] * x[cc]; x[r] = Math.abs(A[r][r]) < 1e-15 ? 0 : s / A[r][r]; }
    const V = i => x[idx.get(find(i))];
    const res = parts.map(p => { if (p.k === 'resistor' || p.k === 'bulb' || p.k === 'ammeter') { const dv = V(p.b) - V(p.a); return { dv, I: dv / (p.k === 'ammeter' ? RA : p.R) }; } if (p.k === 'battery') { const I = x[n + srcs.indexOf(p)]; return { dv: V(p.b) - V(p.a), I: -I }; } return { dv: V(p.b) - V(p.a), I: null }; });
    // currents in wires and ammeters: from the currents of everything else at their (merged) node (Kirchhoff), only for ammeters: sum of currents through series partners
    return { V, res, roots: n };
  }
  const PRESETS = {
    series: [['battery', 8, 16, 6], ['wire', 16, 17], ['wire', 17, 18], ['bulb', 18, 10], ['bulb', 10, 2], ['wire', 2, 1], ['wire', 1, 0], ['wire', 0, 8]],
    parallel: [['battery', 8, 16, 6], ['wire', 16, 17], ['wire', 17, 18], ['bulb', 18, 10], ['wire', 10, 2], ['wire', 2, 1], ['wire', 1, 0], ['wire', 0, 8], ['wire', 18, 19], ['wire', 19, 20], ['bulb', 20, 12], ['wire', 12, 4], ['wire', 4, 3], ['wire', 3, 2]],
    switch: [['battery', 8, 16, 6], ['switch', 16, 17], ['wire', 17, 18], ['bulb', 18, 10], ['resistor', 10, 2], ['wire', 2, 1], ['wire', 1, 0], ['wire', 0, 8]]
  };
  D['circuit-builder'] = { wide: true,
    intro: 'Build any circuit you like on the grid: choose a part, then click between two neighbouring dots to place it. The circuit is **solved with Kirchhoff’s laws** every time you change it — every current and voltage you see is calculated, and the bulbs glow with the power they really receive.',
    predict: { q: 'Two identical bulbs are connected in **parallel** to a battery. Compared with one bulb alone, each bulb is…', options: ['dimmer', 'just as bright', 'brighter', 'off'] },
    explore: '- Load **Series**, then **Parallel**. Compare the bulbs’ brightness and the battery current.\n- Add a **switch** and open it. Which parts go dark?\n- Build your own: change a resistor’s value and watch the current change.\n- Try connecting the battery straight across a wire — the builder will warn you about a **short circuit**.',
    explain: 'Current only flows round a **closed loop**. In **series** the same current passes through each part and the battery voltage is **shared**, so two bulbs are dimmer than one. In **parallel** each branch gets the **full voltage**, so each bulb is as bright as one alone — but the battery supplies **more current** in total. Ohm’s law, **V = IR**, holds for each resistor and bulb; the power a bulb receives is **P = VI = I²R**. A wire straight across a battery is a **short circuit**: almost no resistance, so a dangerously large current.',
    apply: [
      q('x-cb1', 'A 6 V battery drives two 12 Ω bulbs in series. The current is…', ['0.25 A', '0.5 A', '1 A', '2 A'], 0, 'Total resistance 24 Ω: I = V/R = 6/24 = 0.25 A.'),
      q('x-cb2', 'The same two bulbs in parallel on the 6 V battery: the battery current is…', ['0.25 A', '0.5 A', '1 A', '2 A'], 2, 'Each branch carries 6/12 = 0.5 A, so the battery supplies 0.5 + 0.5 = 1 A.'),
      q('x-cb3', 'Opening a switch in one branch of a parallel circuit…', ['turns off every bulb', 'turns off only that branch', 'makes the other bulbs dimmer', 'shorts the battery'], 1, 'The other branches still form closed loops with the battery.')
    ],
    summary: ['Current needs a closed loop.', 'Series: one current, voltage shared.', 'Parallel: full voltage on each branch, currents add.', 'V = IR; bulb power P = I²R.'],
    connect: [{ label: 'Build & break a circuit', href: '#/exp/circuit-break' }, { label: 'Lesson: Electric circuits', href: '#/lesson/phys-circuits' }],
    build(host, c) {
      host.innerHTML = `<div class="v26-ws cb"><div class="v26-bar" role="radiogroup" aria-label="${T('Part to place', 'القطعة')}">${Object.entries(KINDS).map(([k, v]) => `<button type="button" class="v26-tool" role="radio" data-part="${k}" aria-checked="${k === 'wire'}">${v.n}</button>`).join('')}<button type="button" class="v26-tool" role="radio" data-part="edit" aria-checked="false">${T('Select / edit', 'تحديد')}</button><button type="button" class="v26-tool" role="radio" data-part="erase" aria-checked="false">${T('Erase', 'امسح')}</button></div>
        <div class="v26-bar"><span class="v26-hint">${T('Examples:', 'أمثلة:')}</span><button type="button" class="v26-tool" data-pre="series">${T('Series', 'توالٍ')}</button><button type="button" class="v26-tool" data-pre="parallel">${T('Parallel', 'توازٍ')}</button><button type="button" class="v26-tool" data-pre="switch">${T('Switch + resistor', 'مفتاح ومقاومة')}</button><button type="button" class="v26-tool" data-pre="clear">${T('Clear', 'امسح')}</button></div>
        <svg class="v26-svg cb__svg" viewBox="0 0 900 520" tabindex="0" role="application" aria-label="${T('Circuit board', 'لوحة الدارة')}"></svg>
        <div class="v26-grid2"><div class="v26-card cb__edit"></div><div class="v26-card"><h3>${T('Readings', 'القراءات')}</h3><div class="v26-out cb__out" aria-live="polite"></div></div></div></div>`;
      const svg = host.querySelector('.cb__svg'), $ = s => host.querySelector(s); let parts = [], tool = 'wire', sel = null, phase = 0, R = null;
      const X0 = 90, Y0 = 70, STEP = 105, nx = i => X0 + (i % GW) * STEP, ny = i => Y0 + Math.floor(i / GW) * STEP;
      const load = k => { parts = (PRESETS[k] || []).map(([kk, a, b, v]) => Object.assign({ k: kk, a, b }, kk === 'battery' ? { V: v } : kk === 'resistor' ? { R: 10 } : kk === 'bulb' ? { R: 12 } : kk === 'switch' ? { closed: true } : {})); sel = null; update(); };
      function update() { R = solve(parts); draw(); readout(); edit(); }
      function draw() {
        const P = K.pal(); let s = '';
        for (let i = 0; i < GW * GH; i++) s += `<circle cx="${nx(i)}" cy="${ny(i)}" r="4" fill="${P.muted}" opacity=".5"/>`;
        parts.forEach((p, i) => {
          const x1 = nx(p.a), y1 = ny(p.a), x2 = nx(p.b), y2 = ny(p.b), mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI, r = R.res[i], hi = sel === i ? ' stroke="var(--accent,#c8341f)"' : '';
          const live = (r.I != null && Math.abs(r.I) > 1e-6) || (p.k !== 'battery' && Math.abs(r.dv) < 1e-9 && false);
          s += `<g data-i="${i}" class="cb__p">`;
          if (p.k === 'wire' || p.k === 'ammeter' || p.k === 'switch') { if (p.k === 'switch' && !p.closed) s += `<line x1="${x1}" y1="${y1}" x2="${mx - 18 * Math.cos(ang * Math.PI / 180)}" y2="${my - 18 * Math.sin(ang * Math.PI / 180)}" stroke="${P.ink}" stroke-width="4"${hi}/><line x1="${mx + 18 * Math.cos(ang * Math.PI / 180)}" y1="${my + 18 * Math.sin(ang * Math.PI / 180)}" x2="${x2}" y2="${y2}" stroke="${P.ink}" stroke-width="4"${hi}/><g transform="translate(${mx} ${my}) rotate(${ang})"><line x1="-18" y1="0" x2="14" y2="-16" stroke="${P.ink}" stroke-width="4"/></g>`; else s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"${hi}/>`; if (p.k === 'ammeter') s += `<circle cx="${mx}" cy="${my}" r="15" fill="${P.bg}" stroke="${P.ink}" stroke-width="2.5"/><text x="${mx}" y="${my + 5}" text-anchor="middle">A</text>`; if (p.k === 'switch') s += `<text x="${mx}" y="${my - 22}" text-anchor="middle" style="font-size:11px">${p.closed ? T('closed', 'مغلق') : T('open', 'مفتوح')}</text>`; }
          else { s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${P.ink}" stroke-width="4"/><g transform="translate(${mx} ${my}) rotate(${ang})">`;
            if (p.k === 'battery') s += `<rect x="-14" y="-20" width="28" height="40" fill="${P.bg}"/><line x1="-6" y1="-18" x2="-6" y2="18" stroke="${P.ink}" stroke-width="3"/><line x1="6" y1="-10" x2="6" y2="10" stroke="${P.ink}" stroke-width="6"/><text x="-12" y="-24" style="font-size:12px">−</text><text x="8" y="-24" style="font-size:12px">+</text>`;
            if (p.k === 'resistor') s += `<rect x="-26" y="-10" width="52" height="20" rx="3" fill="${P.bg}" stroke="${P.ink}" stroke-width="3"${hi}/>`;
            if (p.k === 'bulb') { const pw = r.I != null ? r.I * r.I * p.R : 0, glow = Math.min(1, pw / 3); s += `<circle r="${26 + glow * 22}" fill="rgba(255,206,84,${0.55 * glow})"/><circle r="17" fill="${glow > 0.02 ? `rgb(255,${210 + 40 * glow},${120 + 80 * glow})` : P.bg}" stroke="${P.ink}" stroke-width="3"${hi}/><path d="M-9 -9 L9 9 M-9 9 L9 -9" stroke="${P.ink}" stroke-width="2"/>`; }
            s += `</g>`; }
          s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="22"/></g>`;
        });
        svg.innerHTML = s + '<g class="cb__dots" aria-hidden="true"></g>'; dotsG = svg.querySelector('.cb__dots'); flowing = !K.reduced() && R.res.some(r => r.I != null && Math.abs(r.I) > 1e-4); dots();
        if (flowing) M.play(); else M.pause();
      }
      // moving charge: only this small layer changes each frame (dots move in the direction of conventional current, faster for larger currents)
      let dotsG = null, flowing = false;
      function dots() { if (!dotsG) return; let s = ''; parts.forEach((p, i) => { const r = R.res[i]; if (r.I == null || Math.abs(r.I) < 1e-4) return; const x1 = nx(p.a), y1 = ny(p.a), x2 = nx(p.b), y2 = ny(p.b); for (let k = 0; k < 3; k++) { const u = ((k / 3 + phase * Math.sign(r.I) * Math.min(3, Math.abs(r.I)) * 0.25) % 1 + 1) % 1; s += `<circle cx="${(x1 + (x2 - x1) * u).toFixed(1)}" cy="${(y1 + (y2 - y1) * u).toFixed(1)}" r="3.2" fill="#ffcf5a"/>`; } }); dotsG.innerHTML = s; }
      function readout() {
        const bats = parts.map((p, i) => [p, i]).filter(([p]) => p.k === 'battery'); let h = '';
        if (!bats.length) h = `<p class="v26-hint">${T('Add a battery to power the circuit.', 'أضف بطارية.')}</p>`;
        bats.forEach(([p, i]) => { const I = R.res[i].I; h += `<p>${T('Battery', 'البطارية')} ${p.V} V: ${T('current', 'التيار')} <b>${f(Math.abs(I), 3)} A</b>${Math.abs(I) < 1e-6 ? ' — ' + T('**no closed loop**: no current flows.', 'لا توجد دارة مغلقة.') : ''}${Math.abs(I) > 30 ? ' — <b style="color:var(--red,#c0392b)">' + T('short circuit! The battery is connected across almost no resistance.', 'دارة قصيرة!') + '</b>' : ''}</p>`; });
        const rows = parts.map((p, i) => [p, i]).filter(([p]) => p.k === 'bulb' || p.k === 'resistor' || p.k === 'ammeter').map(([p, i]) => { const r = R.res[i]; if (p.k === 'ammeter') return `<tr><td>${T('Ammeter', 'أميتر')} ${i + 1}</td><td colspan="3"><b>${f(Math.abs(r.I), 3)} A</b></td></tr>`; return `<tr><td>${KINDS[p.k].n} ${i + 1} (${p.R} Ω)</td><td>${f(Math.abs(r.dv), 2)} V</td><td>${f(Math.abs(r.I), 3)} A</td><td>${f(r.I * r.I * p.R, 2)} W</td></tr>`; });
        if (rows.length) h += `<table><tr><th></th><th>V</th><th>I</th><th>P</th></tr>${rows.join('')}</table><p class="v26-hint">${T('Each row obeys V = IR (Ohm’s law) and P = I²R. The battery has a small internal resistance (0.05 Ω), so readings are a fraction of a percent below the ideal textbook values.', 'كل صف يحقق قانون أوم.')}</p>`;
        $('.cb__out').innerHTML = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); // h is built from escaped, generated text only
      }
      function edit() {
        const box = $('.cb__edit'); if (sel == null || !parts[sel]) { box.innerHTML = `<h3>${T('Selected part', 'القطعة المحددة')}</h3><p class="v26-hint">${T('Use “Select / edit” and click a part to change its value, flip a switch or turn a battery round.', 'حدد قطعة لتعديلها.')}</p>`; return; }
        const p = parts[sel]; box.innerHTML = `<h3>${KINDS[p.k].n}</h3>${p.k === 'battery' ? `<label class="kx-range"><span class="kx-range__t">${T('Voltage', 'الجهد')} <output>${p.V} V</output></span><input type="range" data-ed="V" min="1.5" max="12" step="0.5" value="${p.V}"></label><button type="button" class="v26-tool" data-ed2="flip">${T('Turn round', 'اقلب')}</button>` : ''}${p.k === 'resistor' || p.k === 'bulb' ? `<label class="kx-range"><span class="kx-range__t">${T('Resistance', 'المقاومة')} <output>${p.R} Ω</output></span><input type="range" data-ed="R" min="1" max="100" step="1" value="${p.R}"></label>` : ''}${p.k === 'switch' ? `<button type="button" class="v26-tool" data-ed2="toggle">${p.closed ? T('Open the switch', 'افتح') : T('Close the switch', 'أغلق')}</button>` : ''}<button type="button" class="v26-tool" data-ed2="del">${T('Remove', 'أزل')}</button>`;
      }
      const near = e => { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 900, y = (e.clientY - r.top) / r.height * 520; let best = null, bd = 40; for (let i = 0; i < GW * GH; i++) { const cand = [i % GW < GW - 1 ? i + 1 : -1, i + GW < GW * GH ? i + GW : -1]; cand.forEach(j => { if (j < 0) return; const mx = (nx(i) + nx(j)) / 2, my = (ny(i) + ny(j)) / 2, d = Math.hypot(mx - x, my - y); if (d < bd) { bd = d; best = [i, j]; } }); } return best; };
      svg.addEventListener('pointerdown', e => { e.preventDefault(); svg.focus({ preventScroll: true }); const ed = near(e); if (!ed) return; const [a, b] = ed, at = parts.findIndex(p => (p.a === a && p.b === b) || (p.a === b && p.b === a));
        if (tool === 'edit') { sel = at >= 0 ? at : null; update(); return; }
        if (tool === 'erase') { if (at >= 0) { parts.splice(at, 1); sel = null; update(); } return; }
        if (at >= 0) parts.splice(at, 1);
        parts.push(Object.assign({ k: tool, a, b }, tool === 'battery' ? { V: 6 } : tool === 'resistor' ? { R: 10 } : tool === 'bulb' ? { R: 12 } : tool === 'switch' ? { closed: true } : {})); sel = parts.length - 1; update(); });
      host.addEventListener('click', e => { const t = e.target.closest('[data-part]'); if (t) { tool = t.dataset.part; host.querySelectorAll('[data-part]').forEach(b => b.setAttribute('aria-checked', String(b === t))); } const pr = e.target.closest('[data-pre]'); if (pr) { if (pr.dataset.pre === 'clear') { parts = []; sel = null; update(); } else load(pr.dataset.pre); }
        const e2 = e.target.closest('[data-ed2]'); if (e2 && sel != null) { const p = parts[sel]; if (e2.dataset.ed2 === 'toggle') p.closed = !p.closed; if (e2.dataset.ed2 === 'flip') [p.a, p.b] = [p.b, p.a]; if (e2.dataset.ed2 === 'del') { parts.splice(sel, 1); sel = null; } update(); } });
      host.addEventListener('input', e => { const r = e.target.closest('[data-ed]'); if (r && sel != null) { parts[sel][r.dataset.ed] = +r.value; r.previousElementSibling.querySelector('output').textContent = r.value + (r.dataset.ed === 'V' ? ' V' : ' Ω'); R = solve(parts); draw(); readout(); } });
      const M = K.motor(c, host, (dt, running) => { if (running) { phase += dt; dots(); } });
      load('series');
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { M.pause(); },
        reset() { load('series'); }, preset() { load('series'); },
        _solve: ps => { const r = solve(ps); return r.res.map(x => ({ I: x.I, dv: x.dv })); }, _load: load, _parts: () => parts,
        observe() { const bats = parts.map((p, i) => [p, i]).filter(([p]) => p.k === 'battery'), bulbs = parts.map((p, i) => [p, i]).filter(([p]) => p.k === 'bulb'); return { text: `Your circuit has ${parts.length} parts. ${bats.map(([p, i]) => `The ${p.V} V battery supplies **${f(Math.abs(R.res[i].I), 3)} A**.`).join(' ')} ${bulbs.length ? `Bulb powers: ${bulbs.map(([p, i]) => f(R.res[i].I ** 2 * p.R, 2) + ' W').join(', ')}.` : ''}`, predOk: i => i === 1 }; }
      };
    }
  };
})();
