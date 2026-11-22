/* ERLY Learning Studio v28 — Black hole: an observer's camera view and gravitational time dilation.
   Added below the existing (exact) light-ray view:
     • the shadow: radius b = (3√3 / 2) r_s ≈ 2.598 r_s — the exact critical impact parameter for photon capture;
     • a thin photon ring just outside it;
     • an accretion disk from the innermost stable circular orbit (3 r_s) outwards, seen at a chosen inclination;
       each patch is coloured by a thin-disk temperature profile (T ∝ r^(−3/4)) and its brightness scaled by δ⁴,
       δ = √(1 − r_s/r) / (γ (1 − β cos θ)), with Keplerian speed β = √(r_s / 2r) — the side moving towards you is
       brighter (relativistic beaming) and every patch is dimmed by gravitational redshift;
     • the far side of the disk is also drawn lifted over the top of the shadow, the way lensing shows it. That
       over-the-top image is an approximation (its shape is not ray-traced) and is labelled so.
   Time dilation for a probe hovering at r: its clock runs at √(1 − r_s/r) of a far-away clock (exact for a static
   observer in the Schwarzschild metric). */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit;
  const def = D['black-hole']; if (!def) return; const old = def.build;
  const BC = 3 * Math.sqrt(3) / 2; // shadow radius in r_s
  def.explore = (def.explore || '') + '\n- In the **observer’s view**, tilt the camera from face-on to edge-on. Which side of the disk is brighter, and why?\n- Move the probe to 1.1 r_s and read how slowly its clock runs compared with yours.';
  def.summary = (def.summary || []).concat(['Shadow radius = 3√3⁄2 r_s ≈ 2.6 r_s; the disk’s inner edge is at 3 r_s.', 'Clocks near the horizon run slow: rate = √(1 − r_s/r).']);
  def.build = function (host, c) {
    const base = old(host, c);
    const head = document.createElement('h3'); head.className = 'v28-sub'; head.textContent = T('Observer’s view (camera)', 'منظر الراصد'); host.appendChild(head);
    const S = K.stage(host, 800, 380, 'bh__cam'); S.cv.setAttribute('role', 'img');
    const ctl = K.controls(host, [{ k: 'row' }, { k: 'range', id: 'inc', label: T('Camera inclination (0° face-on, 90° edge-on)', 'ميل الكاميرا'), min: 0, max: 88, step: 1, val: 75, unit: '°' }, { k: 'range', id: 'zoom', label: T('Zoom', 'تكبير'), min: 8, max: 26, step: 1, val: 14, unit: ' px/r_s' }, { k: 'range', id: 'rout', label: T('Disk outer edge', 'الحافة الخارجية'), min: 6, max: 20, step: 1, val: 12, unit: ' r_s' }, { k: 'toggle', id: 'spin', label: T('Animate the disk', 'حرّك القرص'), val: true }, { k: 'end' }], () => M.draw());
    const read = document.createElement('p'); read.className = 'kx-read'; read.setAttribute('aria-live', 'polite'); host.appendChild(read);
    const stars = []; { let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 260; i++) stars.push([r() * 800, r() * 380, r() * 1.4 + 0.3, r()]); }
    let t = 0;
    const tempCol = (r, b) => { const x = Math.pow(3 / r, 0.75); const R0 = 255, G0 = Math.round(120 + 120 * x), B0 = Math.round(40 + 190 * x * x); const k = Math.min(1.6, b); return `rgba(${Math.min(255, R0 * k) | 0},${Math.min(255, G0 * k) | 0},${Math.min(255, B0 * k) | 0},${Math.min(1, 0.25 + 0.75 * Math.min(1, b))})`; };
    function patch(r, phi, inc) { // Doppler + gravitational factor for a disk patch at radius r (r_s), azimuth phi
      const beta = Math.sqrt(1 / (2 * r)), gam = 1 / Math.sqrt(1 - beta * beta), cosT = Math.sin(inc) * Math.cos(phi); // orbital velocity (−sin φ, cos φ) · direction to the camera (0, sin i) in the disk plane
      const delta = Math.sqrt(1 - 1 / r) / (gam * (1 - beta * cosT)); return Math.pow(delta, 4);
    }
    function draw() {
      const G = S.g, inc = ctl.val.inc * Math.PI / 180, z = ctl.val.zoom, rout = ctl.val.rout, cx = 400, cy = 190, ci = Math.cos(inc);
      G.fillStyle = '#03040a'; G.fillRect(0, 0, 800, 380);
      stars.forEach(([x, y, s0, b]) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) / z; if (d < BC) return; const k = 1 + 2 / Math.max(d * d / 4, 0.6); G.fillStyle = `rgba(255,255,255,${0.25 + 0.6 * b})`; G.fillRect(cx + dx * Math.min(k, 1.8), cy + dy * Math.min(k, 1.8), s0, s0); }); // lensing pushes background stars outwards near the hole (illustrative)
      const rings = 22, segs = 72, rot = ctl.val.spin && !K.reduced() ? t * 0.6 : 0, P = (r, ph) => [cx + r * z * Math.cos(ph), cy + r * z * ci * Math.sin(ph)];
      const ring = (back) => { for (let i = 0; i < rings; i++) { const r0 = 3 + (rout - 3) * i / rings, r1 = 3 + (rout - 3) * (i + 1) / rings, rm = (r0 + r1) / 2; for (let j = 0; j < segs; j++) { const p0 = j / segs * 2 * Math.PI, p1 = (j + 1.04) / segs * 2 * Math.PI, pm = (p0 + p1) / 2; if ((Math.sin(pm) < 0) !== back) continue;
        const bright = patch(rm, pm, inc) * (1 + 0.1 * Math.sin(7 * pm - rot * Math.pow(3 / rm, 1.5) * 4 + i * 1.7)); G.fillStyle = tempCol(rm, bright);
        const a0 = P(r0, p0), a1 = P(r1, p0), b1 = P(r1, p1), b0 = P(r0, p1); G.beginPath(); G.moveTo(a0[0], a0[1]); G.lineTo(a1[0], a1[1]); G.lineTo(b1[0], b1[1]); G.lineTo(b0[0], b0[1]); G.closePath(); G.fill(); G.strokeStyle = G.fillStyle; G.lineWidth = 0.9; G.stroke(); } } };
      ring(true); // far half of the disk, behind the hole
      // lensed image of the far side, lifted over the top of the shadow (approximation)
      if (inc > 0.2) { const n = 26, si = Math.sin(inc); for (let i = n - 1; i >= 0; i--) { const r = 3 + (rout - 3) * i / (n - 1), sp = (rout - 3) / (n - 1) * z * 0.55 * si; G.strokeStyle = tempCol(r, 0.6 * Math.sqrt(1 - 1 / r)); G.globalAlpha = 0.6 * si * (1 - 0.6 * i / n); G.lineWidth = Math.max(1.5, sp * 1.6); G.beginPath(); G.ellipse(cx, cy, BC * z + (r - 3) * z * 0.9, BC * z + (r - 3) * z * 0.55 * si, 0, Math.PI, 2 * Math.PI); G.stroke(); } G.globalAlpha = 1; }
      // photon ring and shadow
      G.strokeStyle = 'rgba(255,214,150,.85)'; G.lineWidth = 1.6; G.beginPath(); G.arc(cx, cy, BC * z + 1.5, 0, 7); G.stroke();
      G.fillStyle = '#000'; G.beginPath(); G.arc(cx, cy, BC * z, 0, 7); G.fill();
      ring(false); // near half, in front
      // labels
      G.font = '600 11px ui-sans-serif, system-ui'; G.fillStyle = 'rgba(255,255,255,.75)'; G.textAlign = 'left';
      G.fillText(T('shadow radius 3√3⁄2 r_s ≈ 2.60 r_s', 'نصف قطر الظل ≈ 2.60 r_s'), 14, 22); G.fillText(T('disk inner edge (ISCO) 3 r_s', 'الحافة الداخلية 3 r_s'), 14, 40); G.fillText(T('approaching side brighter (beaming)', 'الجانب المقترب أسطع'), 14, 58);
      G.fillStyle = 'rgba(255,255,255,.45)'; G.fillText(T('Illustrative render: shadow size and disk brightness are computed; the over-the-top arc is approximate.', 'رسم توضيحي.'), 14, 368);
      const bL = patch(6, 0, inc), bR = patch(6, Math.PI, inc); const pr = (base && base._probe) ? base._probe() : null;
      const probeR = +host.querySelector('[data-k="p"]').value, rate = probeR > 1 ? Math.sqrt(1 - 1 / probeR) : 0;
      read.innerHTML = LS.inline(`At ${ctl.val.inc}° the patch of disk moving **towards you** at 6 r_s is **${K.fmt(Math.max(bL, bR) / Math.min(bL, bR), 1)}×** brighter than the receding patch. Probe at **${K.fmt(probeR, 1)} r_s**: its clock runs at **${K.fmt(rate * 100, 1)}%** of a far-away clock — one hour there is ${rate > 0 ? K.fmt(1 / rate, 2) : '∞'} hours for you.`);
      S.cv.setAttribute('aria-label', T('Observer’s view of the black hole: dark shadow, bright photon ring and a tilted accretion disk. ', 'منظر الثقب الأسود. ') + read.textContent);
      void pr;
    }
    const M = K.motor(c, host, dt => { t += dt; draw(); });
    host.addEventListener('input', e => { if (e.target.matches('[data-k="p"]')) M.draw(); });
    M.play();
    const ratio = (r, inc) => { const a = patch(r, 0, inc * Math.PI / 180), b = patch(r, Math.PI, inc * Math.PI / 180); return Math.max(a, b) / Math.min(a, b); };
    return Object.assign({}, base, { destroy() { M.pause(); S.destroy(); base.destroy && base.destroy(); }, play() { base.play && base.play(); M.play(); }, pause() { base.pause && base.pause(); M.pause(); },
      _cam: () => ({ shadow: BC, ratio6at75: ratio(6, 75), ratio6at0: ratio(6, 0), dil: r => Math.sqrt(1 - 1 / r) }) });
  };
})();

/* v28 — Periodic table: search by name, symbol or atomic number, plus links from the selected element to the builders. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS; const pd = D.periodic; if (!pd) return; const oldP = pd.build;
  pd.build = function (host, c) {
    const base = oldP(host, c), grid = host.querySelector('.pt');
    const lab = document.createElement('label'); lab.className = 'dx-concept pt__search'; lab.innerHTML = `<span>${T('Find an element', 'ابحث عن عنصر')}</span><input type="search" data-pts placeholder="${T('name, symbol or number — e.g. iron, Fe, 26', 'الاسم أو الرمز أو العدد')}" autocomplete="off"><output data-ptn aria-live="polite"></output>`;
    grid.parentNode.insertBefore(lab, grid);
    const links = document.createElement('p'); links.className = 'pt__links'; host.appendChild(links);
    let q = '';
    const match = b => { if (!q) return false; const [name, num] = (b.getAttribute('aria-label') || '').split(',').map(x => x.trim().toLowerCase()), sym = (b.querySelector('b') || {}).textContent || ''; return /^\d+$/.test(q) ? num === q : name.startsWith(q) || sym.toLowerCase() === q; };
    const apply = () => { let n = 0; grid.classList.toggle('is-searching', !!q); grid.querySelectorAll('[data-z]').forEach(b => { const m = match(b); b.classList.toggle('is-match', m); if (m) n++; }); lab.querySelector('[data-ptn]').textContent = q ? (n ? `${n} ${T('match', 'تطابق')}${n > 1 ? 'es' : ''}` : T('no match among elements 1–36', 'لا تطابق')) : '';
      const sel = grid.querySelector('.is-sel'); const z = sel ? +sel.dataset.z : null;
      links.innerHTML = z ? `${T('Explore', 'استكشف')} <b>${(sel.getAttribute('aria-label') || '').split(',')[0]}</b>: <a href="#/exp/atom-builder">${T('build its atom', 'ابنِ ذرته')}</a> · <a href="#/exp/molecule-3d">${T('use it in a molecule', 'استخدمه في جزيء')}</a> · <a href="#/exp/reaction-lab">${T('see it react', 'شاهده يتفاعل')}</a>` : ''; };
    lab.querySelector('[data-pts]').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); apply(); });
    lab.querySelector('[data-pts]').addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); const b = grid.querySelector('.is-match'); if (b) b.click(); });
    const mo = new MutationObserver(apply); mo.observe(grid, { childList: true }); apply();
    return Object.assign({}, base, { destroy() { mo.disconnect(); base.destroy && base.destroy(); }, _find: v => { q = String(v).toLowerCase(); apply(); return [...grid.querySelectorAll('.is-match')].map(b => +b.dataset.z); } });
  };
})();
