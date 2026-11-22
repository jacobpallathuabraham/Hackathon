/* ERLY Learning Studio v28 — Water cycle: complete visual reconstruction.

   The conserved box model is unchanged from v27 (stocks o, vs, vl, cs, cl, snow, soil, gw, riv; the total never changes).
   What is new is how it is shown:
     • a layered landscape — sky graded by temperature and sunshine, two distant ranges in atmospheric perspective,
       a lit mountain (Lambert shading from the sun's direction), a beach, a forest of varied trees, a cut-away of
       soil, subsoil and an aquifer whose water table rises and falls with the groundwater store;
     • soft volumetric clouds (pre-rendered sprites) that darken as they hold more water, with rain shafts beneath;
     • a river that widens with its flow and visibly flows (moving highlights at a speed set by the river flux);
     • every flow drawn as an arrow whose thickness follows the model flux, with labels that can be turned off;
     • process highlighting — pick evaporation, condensation, precipitation, transpiration, infiltration, runoff or
       groundwater and everything else dims while the camera flies to where it happens;
     • a camera (views, + / −, drag to pan, arrow keys) and a gentle cursor parallax on the distant layers
       (mouse only; off for reduced motion).
   Static layers are drawn once to off-screen canvases, so a frame is a handful of image draws plus the particles. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, esc = LS.esc;
  const f2 = (v, d = 1) => K.fmt(v, d);
  const W = 960, H = 560, SEA = 380, COAST = 400, CUT = 445;
  // the coast rises just above sea level, the mountain has a ridged (not smooth) profile, and the plain joins it continuously
  const ground = x => { if (x < COAST) return SEA + 4; if (x < 520) return 384 - (x - COAST) * 0.12; if (x < 760) { const u = (x - 520) / 240, env = Math.sin(u * Math.PI); return 369.6 - env * 190 - (x - 520) * 0.1 + env * (Math.sin(x / 11) * 2.2 + Math.sin(x / 27 + 1) * 4.5); } return 345.6 + (x - 760) * 0.1; };
  const seabed = x => 548 - Math.pow(Math.max(0, x) / COAST, 3) * 150;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let R = 2; // off-screen resolution factor, matched to the real canvas in build()
  const off = (w, h) => { const c = document.createElement('canvas'); c.width = w * R; c.height = h * R; const g = c.getContext('2d'); g.scale(R, R); return [c, g]; };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // ---------- static layers ----------
  function farLayer(seed, base, amp, col, alpha) {
    const [c, g] = off(W + 80, H); const r = rng(seed); g.fillStyle = col; g.globalAlpha = alpha; g.beginPath(); g.moveTo(0, H);
    let y = base; const pk = []; for (let i = 0; i < 9; i++) pk.push([i * 130 + r() * 60 - 20, base - amp * (0.35 + r() * 0.65)]);
    for (let x = 0; x <= W + 80; x += 4) { let h = base; pk.forEach(([px, py]) => { const d = Math.abs(x - px) / 110; if (d < 1) h = Math.min(h, py + (base - py) * d * d * (1 + 0.15 * Math.sin(x / 9))); }); y = h + Math.sin(x / 17 + seed) * 1.5; g.lineTo(x, y); }
    g.lineTo(W + 80, H); g.closePath(); g.fill(); return c;
  }
  function landLayer() {
    const [c, g] = off(W, H), r = rng(7), L = [0.78, -0.62];
    // sea bed and beach sand under the water
    // the land body: altitude colouring (rock high, grass low) with vertical depth darkening
    const body = g.createLinearGradient(0, 160, 0, CUT); body.addColorStop(0, '#8d8a80'); body.addColorStop(0.28, '#7d8a62'); body.addColorStop(0.5, '#5f8a3e'); body.addColorStop(1, '#3f6a2c');
    g.fillStyle = body; g.beginPath(); g.moveTo(COAST, CUT); for (let x = COAST; x <= W; x += 3) g.lineTo(x, ground(x)); g.lineTo(W, CUT); g.closePath(); g.fill();
    g.save(); g.beginPath(); g.moveTo(COAST, CUT); for (let x = COAST; x <= W; x += 3) g.lineTo(x, ground(x)); g.lineTo(W, CUT); g.closePath(); g.clip();
    // Lambert light from the sun (upper right): faces toward the sun are lit, the far flank is in shadow
    { const sh = g.createLinearGradient(COAST, 0, W, 0); for (let x = COAST; x <= W; x += 4) { let sl = 0; for (let k = -6; k <= 6; k += 2) sl += (ground(x + k + 1) - ground(x + k - 1)) / 2; sl /= 7; const lam = (sl * L[0] - L[1]) / Math.hypot(sl, 1), kk = lam - 0.62; sh.addColorStop((x - COAST) / (W - COAST), kk > 0 ? `rgba(255,244,214,${Math.min(0.32, kk * 0.8)})` : `rgba(18,30,48,${Math.min(0.42, -kk * 0.7)})`); }
      const [mc, mg] = off(W, H); mg.fillStyle = sh; mg.fillRect(COAST, 0, W - COAST, CUT); mg.globalCompositeOperation = 'destination-in'; const fade = mg.createLinearGradient(0, 250, 0, 410); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)'); mg.fillStyle = fade; mg.fillRect(0, 0, W, H); g.drawImage(mc, 0, 0, W, H); }
    // rocky streaks on the high slopes, grass flecks lower down
    for (let i = 0; i < 900; i++) { const x = 530 + r() * 220, y0 = ground(x); if (y0 > 310) continue; const y = y0 + 4 + r() * 40; g.strokeStyle = `rgba(${r() < 0.5 ? '60,58,54' : '235,230,220'},${0.12 + r() * 0.15})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + 4 + r() * 6); g.stroke(); }
    for (let i = 0; i < 700; i++) { const x = COAST + r() * (W - COAST), y = ground(x) + r() * 26; if (ground(x) < 290) continue; g.fillStyle = `rgba(${r() < 0.5 ? '120,170,70' : '40,80,30'},${0.25 + r() * 0.3})`; g.fillRect(x, y, 1.2, 1.2 + r() * 2); }
    g.restore();
    // beach
    g.fillStyle = '#e3cf9b'; g.beginPath(); g.moveTo(COAST, ground(COAST) - 0.5); for (let x = COAST; x <= COAST + 46; x += 2) g.lineTo(x, ground(x) - 0.5); for (let x = COAST + 46; x >= COAST; x -= 2) g.lineTo(x, ground(x) + 5 - (x - COAST) * 0.08); g.fill();
    // the cut-away: topsoil, subsoil, gravel aquifer, bedrock tint
    const strata = [[CUT, 470, '#5a3d27', '#6b4a30'], [470, 500, '#8a6a40', '#9c7a4c'], [500, H, '#6d6a66', '#807c76']];
    strata.forEach(([a, b, c1, c2], i) => { const gr = g.createLinearGradient(0, a, 0, b); gr.addColorStop(0, c2); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.moveTo(COAST - 2, a + Math.sin(COAST / 40 + i) * 2); for (let x = COAST - 2; x <= W; x += 6) g.lineTo(x, a + Math.sin(x / 40 + i * 2) * 2.5); g.lineTo(W, b); g.lineTo(COAST - 2, b); g.fill(); });
    for (let i = 0; i < 520; i++) { const x = COAST + r() * (W - COAST), y = 502 + r() * 56, rr = 0.8 + r() * 2.4; g.fillStyle = `rgba(${r() < 0.5 ? '160,155,148' : '70,66,62'},${0.5 + r() * 0.4})`; g.beginPath(); g.ellipse(x, y, rr * 1.3, rr, r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 160; i++) { const x = COAST + r() * (W - COAST), y = 448 + r() * 50; g.fillStyle = 'rgba(30,18,10,.35)'; g.fillRect(x, y, 1.5, 1.5); }
    // roots under the forest
    g.strokeStyle = 'rgba(60,38,20,.55)'; g.lineWidth = 0.9; for (let i = 0; i < 26; i++) { const x = 425 + r() * 130; let y = ground(x) + 2, xx = x; g.beginPath(); g.moveTo(xx, y); for (let k = 0; k < 5; k++) { xx += (r() - 0.5) * 8; y += 5 + r() * 6; g.lineTo(xx, Math.min(y, CUT + 16)); } g.stroke(); }
    // the cut edge
    g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1; g.beginPath(); g.moveTo(COAST, CUT + 0.5); g.lineTo(W, CUT + 0.5); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '600 10px ui-sans-serif, system-ui'; g.fillText(T('topsoil', 'التربة السطحية'), 912, 462); g.fillText(T('subsoil', 'التربة التحتية'), 912, 490); g.fillText(T('aquifer', 'الخزان الجوفي'), 912, 516);
    return c;
  }
  function forestLayer(veg) {
    const [c, g] = off(W, H), r = rng(11), n = Math.round(veg * 26), trees = [];
    for (let i = 0; i < n; i++) trees.push({ x: 420 + r() * 140, s: 0.65 + r() * 0.6, k: r() < 0.62 ? 'con' : 'dec', z: r() });
    // plants on the far plain too, smaller
    for (let i = 0; i < Math.round(veg * 14); i++) trees.push({ x: 780 + r() * 170, s: 0.45 + r() * 0.3, k: r() < 0.5 ? 'con' : 'dec', z: r() });
    trees.sort((a, b) => a.z - b.z).forEach(t => { const y = ground(t.x) + 2 + t.z * 3, h = 34 * t.s, dk = 0.75 + t.z * 0.25;
      g.fillStyle = '#4a3020'; g.fillRect(t.x - 1.4 * t.s, y - h * 0.25, 2.8 * t.s, h * 0.27);
      if (t.k === 'con') { for (let k = 0; k < 3; k++) { const yy = y - h * 0.2 - k * h * 0.26, w = (11 - k * 2.6) * t.s; g.fillStyle = rgb(mix([30, 78, 40], [24, 60, 32], k / 3).map(v => v * dk)); g.beginPath(); g.moveTo(t.x, yy - h * 0.42); g.lineTo(t.x - w, yy); g.lineTo(t.x + w, yy); g.fill(); g.fillStyle = 'rgba(190,230,140,.22)'; g.beginPath(); g.moveTo(t.x, yy - h * 0.42); g.lineTo(t.x + w, yy); g.lineTo(t.x + w * 0.2, yy); g.fill(); } }
      else { const cy = y - h * 0.55, rr = 10 * t.s; [[0, 0, 1], [-0.7, 0.3, 0.75], [0.7, 0.25, 0.8], [0.1, -0.55, 0.7]].forEach(([dx, dy, s]) => { const gr = g.createRadialGradient(t.x + dx * rr + rr * 0.3, cy + dy * rr - rr * 0.3, 1, t.x + dx * rr, cy + dy * rr, rr * s); gr.addColorStop(0, rgb([126, 176, 72].map(v => v * dk))); gr.addColorStop(1, rgb([44, 96, 38].map(v => v * dk))); g.fillStyle = gr; g.beginPath(); g.arc(t.x + dx * rr, cy + dy * rr, rr * s, 0, 7); g.fill(); }); }
      g.fillStyle = 'rgba(10,30,10,.25)'; g.beginPath(); g.ellipse(t.x - 4 * t.s, y + 1, 9 * t.s, 2, 0, 0, 7); g.fill(); });
    return c;
  }
  function cloudSprite(seed, dark) {
    const [c, g] = off(220, 120), r = rng(seed), puffs = [];
    for (let i = 0; i < 26; i++) { const u = r(), x = 30 + u * 160, top = 78 - Math.sin(u * Math.PI) * (34 + r() * 18); puffs.push([x, top + r() * 26, 14 + r() * 22 * Math.sin(u * Math.PI + 0.3)]); }
    for (let i = 0; i < 8; i++) puffs.push([35 + r() * 150, 84 + r() * 8, 14 + r() * 8]);
    puffs.forEach(([x, y, rr]) => { const gr = g.createRadialGradient(x + rr * 0.3, y - rr * 0.4, rr * 0.05, x, y, rr);
      if (dark) { gr.addColorStop(0, 'rgba(96,104,124,.9)'); gr.addColorStop(0.5, 'rgba(78,86,106,.75)'); gr.addColorStop(1, 'rgba(78,86,106,0)'); }
      else { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(246,249,253,.92)'); gr.addColorStop(0.75, 'rgba(222,230,242,.45)'); gr.addColorStop(1, 'rgba(222,230,242,0)'); }
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); });
    g.globalCompositeOperation = dark ? 'destination-in' : 'source-atop';
    const b = g.createLinearGradient(0, 30, 0, 105); if (dark) { b.addColorStop(0, 'rgba(0,0,0,0)'); b.addColorStop(0.5, 'rgba(0,0,0,.55)'); b.addColorStop(1, 'rgba(0,0,0,1)'); } else { b.addColorStop(0, 'rgba(255,255,255,0)'); b.addColorStop(0.6, 'rgba(170,182,204,.0)'); b.addColorStop(1, 'rgba(160,172,196,.45)'); }
    g.fillStyle = b; g.fillRect(0, 0, 220, 120);
    return c;
  }

  // ---------- processes: arrows, highlight regions, camera views ----------
  const PROC = {
    evap: { n: ['Evaporation', 'التبخر'], c: '#ffb648', p: [[160, 372], [120, 290], [175, 185]], box: [40, 150, 330, 400], view: [220, 300, 1.7], f: F => F.evap, kinds: ['vap'], zone: 'ocean',
      t: ['The sun heats the sea surface and water molecules escape as invisible **water vapour**. Warmer water and stronger sunshine make it faster. Salt stays behind.', 'تسخّن الشمس سطح البحر فيتبخر الماء.'] },
    cond: { n: ['Condensation', 'التكثف'], c: '#e8eefc', p: [[300, 200], [330, 170], [300, 130]], box: [120, 50, 700, 210], view: [420, 130, 1.6], f: F => F.condS + F.condL, kinds: ['cloud'], zone: 'sky',
      t: ['Rising vapour cools. Cool air holds less vapour, so the extra **condenses** onto specks of dust as tiny droplets — a **cloud**. Clouds darken as they hold more water.', 'يبرد البخار فيتكثف إلى قطرات صغيرة تكوّن الغيوم.'] },
    adv: { n: ['Wind carries clouds inland', 'الرياح تنقل الغيوم'], c: '#bfe3ff', p: [[290, 58], [430, 34], [570, 58]], box: [120, 20, 760, 190], view: [440, 120, 1.5], f: F => F.adv, kinds: ['cloud'], zone: 'sky',
      t: ['**Wind** moves clouds (and vapour) from the sea towards the land. With no wind, most rain falls back on the sea.', 'تنقل الرياح الغيوم نحو اليابسة.'] },
    precip: { n: ['Precipitation', 'الهطول'], c: '#7fb7ff', p: [[690, 140], [700, 190], [680, 250]], box: [500, 90, 820, 380], view: [650, 230, 1.7], f: F => F.rainL + F.snowfall + F.rainS, kinds: ['rain', 'snow'], zone: 'mountain',
      t: ['Cloud droplets merge until they are heavy enough to fall as **rain** — or as **snow** where the air is below 0 °C. Air rising over the mountain cools, so the mountain gets more.', 'تندمج القطرات وتسقط مطراً أو ثلجاً.'] },
    trans: { n: ['Transpiration', 'النتح'], c: '#9be07a', p: [[470, 330], [440, 270], [470, 205]], box: [400, 190, 580, 440], view: [490, 340, 2.1], f: F => F.trans, kinds: ['tr'], zone: 'forest',
      t: ['Roots take up soil water; leaves release it as vapour through their **stomata**. Forests return a large share of the rain to the air.', 'تمتص الجذور الماء وتطلقه الأوراق بخاراً.'] },
    run: { n: ['Runoff → river → sea', 'الجريان السطحي'], c: '#5fb0ff', p: [[585, 362], [500, 392], [412, 418]], box: [380, 300, 720, 450], view: [520, 380, 2.0], f: F => F.run + F.flow, kinds: ['run', 'river'], zone: 'river',
      t: ['Water that cannot soak in **runs off** over the surface into streams and the **river**, which carries it back to the sea. Paved ground makes much more of it, and faster.', 'الماء الذي لا يتسرب يجري إلى النهر ثم البحر.'] },
    inf: { n: ['Infiltration', 'التسرب'], c: '#c9a46a', p: [[860, 352], [872, 410], [860, 472]], box: [600, 330, 960, 520], view: [770, 440, 1.9], f: F => F.inf, kinds: ['inf'], zone: 'soil',
      t: ['Rain **soaks into** permeable ground and fills the spaces in the soil. Some is used by plants; some trickles down to **recharge** the groundwater.', 'يتسرب المطر في التربة.'] },
    gw: { n: ['Groundwater flow', 'المياه الجوفية'], c: '#6ac8ff', p: [[900, 532], [760, 552], [610, 472]], box: [400, 440, 960, 560], view: [690, 490, 2.1], f: F => F.base, kinds: ['gw'], zone: 'ground',
      t: ['Water stored in gravel and rock (an **aquifer**) moves slowly — days to thousands of years — and seeps into rivers, keeping them flowing between rains.', 'تتحرك المياه الجوفية ببطء وتغذي الأنهار.'] }
  };
  const ZONE_PROC = { ocean: 'evap', sky: 'cond', mountain: 'precip', forest: 'trans', river: 'run', soil: 'inf', ground: 'gw', sun: 'evap' };
  const VIEWS = { all: [480, 280, 1], ocean: [220, 380, 1.8], sky: [480, 130, 1.6], mountain: [640, 250, 1.9], river: [520, 380, 2.0], under: [690, 490, 2.1] };

  const def = D['water-cycle'];
  def.build = function (host, c) {
    const S = K.stage(host, W, H, 'wc__stage'); R = K.clamp(S.cv.width / W * 1.5, 1, 2); S.cv.tabIndex = 0; S.cv.setAttribute('role', 'img'); S.cv.setAttribute('aria-label', T('The water cycle: ocean, clouds, mountain, river, soil and groundwater. Select a part for an explanation; plus and minus zoom, arrow keys pan.', 'دورة الماء'));
    const ctl = K.controls(host, [
      { k: 'row' }, { k: 'range', id: 'T', label: T('Air temperature at the coast', 'الحرارة'), min: -5, max: 35, step: 1, val: 15, unit: ' °C' }, { k: 'range', id: 'sun', label: T('Sunshine', 'الشمس'), min: 0.3, max: 1.5, step: 0.05, val: 1, d: 2, unit: '×' }, { k: 'range', id: 'wind', label: T('Wind towards the land', 'الرياح'), min: 0, max: 2, step: 0.05, val: 1, d: 2, unit: '×' }, { k: 'end' },
      { k: 'row' }, { k: 'range', id: 'veg', label: T('Forest cover', 'الغابات'), min: 0, max: 1, step: 0.05, val: 0.6, d: 2, fmt: v => Math.round(v * 100) + '%' }, { k: 'range', id: 'perm', label: T('Ground permeability (soaks in)', 'نفاذية التربة'), min: 0, max: 1, step: 0.05, val: 0.6, d: 2, fmt: v => Math.round(v * 100) + '%' }, { k: 'end' },
      { k: 'row' }, { k: 'chips', id: 'hl', label: T('Highlight a process', 'أبرز عملية'), opts: [['all', T('All', 'الكل')], ['evap', T('Evaporation', 'التبخر')], ['cond', T('Condensation', 'التكثف')], ['precip', T('Precipitation', 'الهطول')], ['trans', T('Transpiration', 'النتح')], ['inf', T('Infiltration', 'التسرب')], ['run', T('Runoff', 'الجريان')], ['gw', T('Groundwater', 'الجوفية')]], val: 'all' }, { k: 'end' },
      { k: 'row' }, { k: 'chips', id: 'view', label: T('Camera', 'الكاميرا'), opts: [['all', T('Whole scene', 'المشهد')], ['ocean', T('Ocean', 'المحيط')], ['sky', T('Sky', 'السماء')], ['mountain', T('Mountain', 'الجبل')], ['river', T('Forest & river', 'الغابة والنهر')], ['under', T('Underground', 'تحت الأرض')]], val: 'all' }, { k: 'btn', id: 'zin', label: '+ ' + T('Zoom', 'تكبير') }, { k: 'btn', id: 'zout', label: '− ' + T('Zoom', 'تصغير') }, { k: 'toggle', id: 'labels', label: T('Labels and flow arrows', 'التسميات والأسهم'), val: true }, { k: 'end' },
      { k: 'row' }, { k: 'btn', id: 'drop', label: T('Follow a droplet', 'تتبّع قطرة'), accent: true }, { k: 'btn', id: 'storm', label: T('Send a storm inland', 'أرسل عاصفة') }, { k: 'end' }
    ], (id, v) => {
      if (id === 'drop') { follow(); }
      else if (id === 'storm') { st.cl += 0.6 * st.cs; st.cs *= 0.4; }
      else if (id === 'hl') { hl = v; drop = null; sel = v === 'all' ? null : PROC[v].zone; if (v !== 'all') aim(PROC[v].view); else aim(VIEWS.all); ctl.set('view', v === 'all' ? 'all' : ''); show(); }
      else if (id === 'view') { aim(VIEWS[v]); }
      else if (id === 'zin' || id === 'zout') { cam.z.set(K.clamp(cam.z.t * (id === 'zin' ? 1.35 : 1 / 1.35), 1, 3)); clampCam(); }
      else if (id === 'veg') { base = scene(); }
      else if (id === 'labels') { labels = v; }
      M.kick();
    });
    const info = document.createElement('div'); info.className = 'v26-grid2'; info.innerHTML = `<div class="v26-card"><h3>${T('What is happening here', 'ماذا يحدث هنا')}</h3><div class="v26-out wc__info" aria-live="polite"></div></div><div class="v26-card"><h3>${T('Flows and stores (model units)', 'التدفقات والمخازن')}</h3><div class="v26-out wc__tab"></div></div>`; host.appendChild(info);

    // ---- the conserved model (as v27) ----
    const INIT = { o: 1000, vs: 6, vl: 3, cs: 4, cl: 3, snow: 20, soil: 30, gw: 60, riv: 8 };
    const st = Object.assign({}, INIT), TOTAL0 = Object.values(st).reduce((a, b) => a + b, 0);
    let F = {}, tDay = 0;
    const ff = T0 => Math.pow(2, (T0 - 15) / 10);
    function step(dt) {
      const T0 = ctl.val.T, sun = ctl.val.sun, wind = ctl.val.wind, veg = ctl.val.veg, perm = ctl.val.perm, Tm = T0 - 18, cap = 8 * ff(T0);
      F.evap = 0.0012 * st.o * ff(T0) * sun; F.trans = 0.06 * st.soil * veg * ff(T0) * sun; F.evapL = 0.02 * st.soil * (1 - veg) * ff(T0) * sun;
      F.condS = Math.max(0, st.vs - cap * 0.6) * 0.8; F.condL = Math.max(0, st.vl - cap * 0.4) * 0.8;
      F.adv = 0.18 * wind * st.cs; F.advV = 0.1 * wind * st.vs;
      F.rainS = Math.max(0, st.cs - 2) * 0.35; const pl = Math.max(0, st.cl - 1.5) * 0.45; F.snowfall = Tm < 0 ? pl * 0.5 : 0; F.rainL = pl - F.snowfall;
      F.melt = Math.max(0, Tm) * 0.03 * st.snow; F.inf = F.rainL * perm + F.melt * perm * 0.5; F.run = F.rainL * (1 - perm) + F.melt * (1 - perm * 0.5);
      F.base = 0.03 * st.gw; F.recharge = 0.05 * st.soil * perm; F.flow = 0.25 * st.riv;
      const d = { o: F.rainS + F.flow - F.evap, vs: F.evap - F.condS - F.advV, vl: F.trans + F.evapL + F.advV - F.condL, cs: F.condS - F.adv - F.rainS, cl: F.condL + F.adv - F.rainL - F.snowfall, snow: F.snowfall - F.melt, soil: F.inf - F.trans - F.evapL - F.recharge, gw: F.recharge - F.base, riv: F.run + F.base - F.flow };
      const k = dt * 2; Object.keys(d).forEach(n => { st[n] = Math.max(0, st[n] + d[n] * k); });
      const tot = Object.values(st).reduce((a, b) => a + b, 0); st.o += TOTAL0 - tot;
      tDay += k;
    }
    const ZONES = [['ocean', 0, 400, 380, 560], ['sky', 0, 960, 0, 200], ['mountain', 560, 760, 170, 360], ['forest', 420, 560, 330, 430], ['river', 760, 960, 340, 420], ['river', 420, 600, 360, 440], ['soil', 400, 960, 430, 500], ['ground', 400, 960, 500, 560], ['sun', 820, 960, 0, 100]];
    const INFO = {
      ocean: ['The ocean', 'Holds about 97 % of Earth’s water. The sun heats its surface and water **evaporates** — warmer water and stronger sunshine evaporate it faster. Salt stays behind, which is why rain is fresh water.'],
      sky: ['Water vapour and clouds', 'Rising vapour **cools**; cool air can hold less vapour, so the extra **condenses** onto tiny dust particles as cloud droplets. The **wind** carries clouds inland. When droplets merge and grow heavy enough, they fall as **precipitation**.'],
      mountain: ['Mountains, snow and ice', 'Air cools as it rises over mountains (about 6.5 °C per kilometre), so clouds rain on the windward side. Here, about 2.8 km up, it is **18 °C colder than the coast**: below 0 °C precipitation falls as **snow**, which is stored and later **melts** into streams.'],
      forest: ['Plants and transpiration', 'Roots take up soil water and leaves release it as vapour through their stomata: **transpiration**. Forests return a large share of rain to the air and also help rain **soak in** rather than run off.'],
      river: ['Runoff and rivers', 'Rain that cannot soak in **runs off** over the surface into streams and rivers, which carry it back to the sea. **Groundwater** seeps into rivers slowly, keeping them flowing between rains.'],
      soil: ['Infiltration and soil water', 'Rain **infiltrates** permeable ground and fills the spaces in the soil. Plants use some; some trickles down to **recharge** the groundwater. Paved or frozen ground lets little soak in.'],
      ground: ['Groundwater', 'Water stored in rock and gravel underground (an **aquifer**). It moves slowly — days to thousands of years — and feeds rivers, springs and wells.'],
      sun: ['The Sun', 'The energy source for the whole cycle: it evaporates water and drives the winds. More sunshine → more evaporation.']
    };

    // ---- layers ----
    const far1 = farLayer(3, 330, 120, '#7c97b8', 0.55), far2 = farLayer(9, 360, 80, '#5f7f9c', 0.65), land = landLayer(), cSpr = [cloudSprite(1), cloudSprite(2), cloudSprite(5)], cDark = [cloudSprite(1, 1), cloudSprite(2, 1), cloudSprite(5, 1)];
    let forest = null; const scene = () => { const [c0, g0] = off(W, H); g0.drawImage(land, 0, 0, W, H); g0.drawImage(forestLayer(ctl.val.veg), 0, 0, W, H); return c0; }; let base = scene();
    const clouds = []; { const r = rng(21); for (let i = 0; i < 10; i++) clouds.push({ x: -40 + i * 108 + r() * 30, y: 70 + r() * 70, s: 0.7 + r() * 0.45, v: i % 3, r: 1, d: 0.6 + r() * 0.4 }); }
    let parts = [], drop = null, sel = null, hl = 'all', labels = true, REF = null, tAnim = 0;
    const cam = { x: K.spring(480, 5), y: K.spring(280, 5), z: K.spring(1, 5) }, par = { x: K.spring(0, 4), y: K.spring(0, 4) };
    function clampCam() { const z = cam.z.t, hw = W / 2 / z, hh = H / 2 / z; cam.x.set(K.clamp(cam.x.t, hw, W - hw)); cam.y.set(K.clamp(cam.y.t, hh, H - hh)); }
    function aim(v) { if (!v) return; cam.z.set(v[2]); cam.x.set(v[0]); cam.y.set(v[1]); clampCam(); }
    const toWorld = (sx, sy) => [cam.x.v + (sx - W / 2) / cam.z.v, cam.y.v + (sy - H / 2) / cam.z.v];

    const riverPts = []; for (let x = 590; x >= COAST - 6; x -= 5) riverPts.push([x, (x < COAST ? SEA + 3 : ground(x)) + 1 + Math.sin(x / 23) * 1.4]);
    function pathPts(G, pts) { G.beginPath(); G.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) G.lineTo(pts[i][0], pts[i][1]); }

    function drawSky(G) {
      const T0 = ctl.val.T, sun = ctl.val.sun, warm = K.clamp((T0 - 15) / 20, -1, 1);
      const top = mix([46, 118, 196], warm > 0 ? [86, 128, 186] : [92, 118, 150], Math.abs(warm) * 0.6), hor = mix([196, 222, 240], warm > 0 ? [246, 222, 186] : [212, 222, 232], Math.abs(warm) * 0.7);
      const b = 0.75 + sun * 0.2, gr = G.createLinearGradient(0, 0, 0, SEA); gr.addColorStop(0, rgb(top.map(v => Math.min(255, v * b)))); gr.addColorStop(1, rgb(hor.map(v => Math.min(255, v * b)))); G.fillStyle = gr; G.fillRect(-40, -40, W + 80, SEA + 60);
    }
    let skyC = null, skyKey = '';
    function skyLayer() { const k = ctl.val.T + '|' + ctl.val.sun; if (k === skyKey) return skyC; skyKey = k; const [c0, g0] = off(W + 80, SEA + 60); g0.translate(40, 40); drawSky(g0); drawSun(g0); return (skyC = c0); }
    function drawSun(G) {
      const sun = ctl.val.sun, x = 892, y = 58, rr = 62 * sun;
      G.save(); G.translate(x, y); G.rotate(0.2); G.fillStyle = 'rgba(255,236,170,.10)'; for (let i = 0; i < 12; i++) { G.rotate(Math.PI / 6); G.beginPath(); G.moveTo(-4, 20); G.lineTo(4, 20); G.lineTo(0, 30 + rr * 1.6); G.fill(); } G.restore();
      const g = G.createRadialGradient(x, y, 4, x, y, rr * 1.6); g.addColorStop(0, 'rgba(255,252,236,1)'); g.addColorStop(0.18, 'rgba(255,232,150,.95)'); g.addColorStop(0.4, 'rgba(255,206,110,.35)'); g.addColorStop(1, 'rgba(255,200,100,0)'); G.fillStyle = g; G.beginPath(); G.arc(x, y, rr * 1.6, 0, 7); G.fill();
    }
    function drawOcean(G, t) {
      const og = G.createLinearGradient(0, SEA, 0, H); og.addColorStop(0, 'rgba(52,134,204,.86)'); og.addColorStop(0.45, 'rgba(22,86,150,.86)'); og.addColorStop(1, 'rgba(10,46,92,.9)');
      const sb = G.createLinearGradient(0, 400, 0, H); sb.addColorStop(0, '#d8c393'); sb.addColorStop(1, '#a08a62'); G.fillStyle = sb; G.beginPath(); G.moveTo(-40, H); for (let x = -40; x <= COAST + 2; x += 6) G.lineTo(x, Math.min(seabed(x), H)); G.lineTo(COAST + 2, ground(COAST)); G.lineTo(COAST + 2, H); G.fill();
      G.fillStyle = og; G.beginPath(); G.moveTo(-40, SEA); for (let x = -40; x <= COAST + 2; x += 6) G.lineTo(x, SEA + Math.sin(x / 26 + t * 1.6) * 2.4 + Math.sin(x / 9 - t * 2.3) * 0.8); G.lineTo(COAST + 2, H); G.lineTo(-40, H); G.fill();
      G.save(); G.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) { const x = 30 + ((i * 53 + t * 9) % 360), y = SEA + 6 + (i % 5) * 9, a = 0.08 + 0.12 * Math.max(0, Math.sin(t * 2 + i * 1.7)); G.fillStyle = `rgba(255,240,200,${a * ctl.val.sun})`; G.fillRect(x, y, 10 + (i % 3) * 6, 1.3); }
      G.restore();
      G.strokeStyle = 'rgba(255,255,255,.22)'; G.lineWidth = 1.2; for (let r = 0; r < 3; r++) { G.beginPath(); for (let x = -40; x <= COAST; x += 8) { const y = SEA + 18 + r * 24 + Math.sin(x / 30 + t * 1.2 + r) * 2.2; if (x > -40) G.lineTo(x, y); else G.moveTo(x, y); } G.stroke(); }
      // shore foam
      G.strokeStyle = `rgba(255,255,255,${0.5 + 0.25 * Math.sin(t * 2)})`; G.lineWidth = 2.4; G.beginPath(); G.moveTo(COAST - 26 + Math.sin(t * 1.3) * 4, SEA + 1); G.quadraticCurveTo(COAST - 8, SEA - 1, COAST + 4, SEA + 2); G.stroke();
    }
    function drawRiver(G, t) {
      const rw = 2.5 + Math.min(11, st.riv * 0.55), speed = 20 + F.flow * 30;
      G.lineCap = 'round'; G.lineJoin = 'round';
      pathPts(G, riverPts); G.strokeStyle = 'rgba(30,70,120,.55)'; G.lineWidth = rw + 2.5; G.stroke();
      pathPts(G, riverPts); G.strokeStyle = '#3b8fe0'; G.lineWidth = rw; G.stroke();
      pathPts(G, riverPts); G.strokeStyle = 'rgba(210,236,255,.75)'; G.lineWidth = Math.max(1, rw * 0.3); G.setLineDash([7, 15]); G.lineDashOffset = -t * speed; G.stroke(); G.setLineDash([]);
      // mountain streams feeding the river (melt and runoff)
      const sw = Math.min(2.5, 0.4 + (F.melt + F.run) * 1.2); if (sw > 0.5) { G.strokeStyle = 'rgba(120,190,255,.85)'; G.lineWidth = sw; G.setLineDash([4, 6]); G.lineDashOffset = -t * 30; G.beginPath(); for (let x = 640; x >= 590; x -= 4) { const y = ground(x) + 2; if (x === 640) G.moveTo(x, y); else G.lineTo(x + Math.sin(x / 6) * 1.5, y); } G.stroke(); G.setLineDash([]); }
    }
    function drawGround(G, t) {
      const gwTop = H - Math.min(56, st.gw * 0.5), gr = G.createLinearGradient(0, gwTop, 0, H); gr.addColorStop(0, 'rgba(90,170,240,.6)'); gr.addColorStop(1, 'rgba(40,110,200,.75)');
      G.fillStyle = gr; G.beginPath(); G.moveTo(COAST, H); for (let x = COAST; x <= W; x += 8) G.lineTo(x, gwTop + Math.sin(x / 31 + t) * 1.2); G.lineTo(W, H); G.fill();
      G.strokeStyle = 'rgba(200,235,255,.7)'; G.lineWidth = 1; G.setLineDash([3, 5]); G.lineDashOffset = t * 6; G.beginPath(); G.moveTo(COAST, gwTop); G.lineTo(W, gwTop); G.stroke(); G.setLineDash([]);
      G.fillStyle = 'rgba(255,255,255,.85)'; G.font = '600 10px ui-sans-serif, system-ui'; G.fillText(T('water table', 'منسوب المياه'), 412, gwTop - 4);
      // soil moisture: a blue tint in the topsoil that deepens with the soil store
      G.fillStyle = `rgba(70,140,220,${Math.min(0.35, st.soil / 140)})`; G.fillRect(COAST, CUT, W - COAST, 25);
      return gwTop;
    }
    function drawSnow(G) {
      const depth = Math.min(130, st.snow * 1.05); if (depth < 2) return; const line = 172 + depth;
      G.save(); G.beginPath(); for (let x = 520; x <= 760; x += 3) G.lineTo(x, ground(x) - 0.5); G.lineTo(760, H); G.lineTo(520, H); G.closePath(); G.clip();
      const hx = G.createLinearGradient(560, 0, 720, 0); hx.addColorStop(0, 'rgb(178,196,226)'); hx.addColorStop(0.45, 'rgb(214,226,244)'); hx.addColorStop(0.62, 'rgb(250,252,255)'); hx.addColorStop(1, 'rgb(255,255,255)');
      const edge = x => line + Math.sin(x / 7) * 3 + Math.sin(x / 17) * 6 + Math.abs(x - 640) * 0.05;
      [[1, 0.35, 8], [0, 1, 0]].forEach(([soft, al, dy]) => { G.globalAlpha = al; G.fillStyle = hx; G.beginPath(); G.moveTo(520, -10); for (let x = 520; x <= 760; x += 4) G.lineTo(x, edge(x) + dy); G.lineTo(760, -10); G.fill(); });
      G.globalAlpha = 1; G.strokeStyle = 'rgba(130,150,180,.28)'; G.lineWidth = 1.1; [598, 611, 629, 652, 667, 689].forEach(x => { G.beginPath(); G.moveTo(x, ground(x) + 5); G.quadraticCurveTo(x + (x < 640 ? -2 : 2), (ground(x) + edge(x)) / 2, x + (x < 640 ? -5 : 5), Math.min(edge(x) - 4, ground(x) + 36)); G.stroke(); }); // gullies
      G.restore();
    }
    function drawClouds(G, t, wet, dim) {
      clouds.forEach((cl, i) => {
        const land = cl.x > COAST, w = land ? Math.min(1.2, st.cl / 8) : Math.min(1, st.cs / 10), sz = (0.55 + w * 0.9) * cl.s; cl.r += (sz - cl.r) * 0.04;
        const s = cl.r, x = cl.x, y = cl.y + Math.sin(t * 0.4 + i) * 2, ww = 220 * s * 0.62, hh = 120 * s * 0.62;
        // rain shaft
        const rate = land ? F.rainL + F.snowfall : F.rainS; if (wet && rate > 0.15 && w > 0.35) { const a = Math.min(0.28, rate * 0.08) * (dim ? 1 : 1), sl = 18 * ctl.val.wind; const gy = land ? ground(x) : SEA; const gr = G.createLinearGradient(0, y + hh * 0.4, 0, gy); gr.addColorStop(0, `rgba(110,140,190,${a})`); gr.addColorStop(1, 'rgba(110,140,190,0)'); G.fillStyle = gr; G.beginPath(); G.moveTo(x - ww * 0.3, y + hh * 0.35); G.lineTo(x + ww * 0.3, y + hh * 0.35); G.lineTo(x + ww * 0.32 + sl, gy); G.lineTo(x - ww * 0.32 + sl, gy); G.fill(); }
        G.globalAlpha = 0.95; G.drawImage(cSpr[cl.v], x - ww / 2, y - hh / 2, ww, hh);
        const dk = Math.min(0.85, Math.max(0, w - 0.25) * 0.9); if (dk > 0.02) { G.globalAlpha = dk; G.drawImage(cDark[cl.v], x - ww / 2, y - hh / 2 + 3, ww, hh); }
        G.globalAlpha = 1;
      });
    }
    function drawParts(G, only) {
      const want = k => (only == null ? true : only.includes(k)), skip = k => only == null ? false : !only.includes(k);
      G.strokeStyle = 'rgba(150,195,255,.85)'; G.lineWidth = 1.2; G.beginPath(); let any = false;
      parts.forEach(p => { if (p.k !== 'rain' || skip('rain')) return; any = true; G.moveTo(p.x, p.y); G.lineTo(p.x - p.vx * 0.03, p.y - 8); }); if (any) G.stroke();
      const COL = { vap: 'rgba(255,255,255,.9)', tr: 'rgba(205,255,190,.9)', snow: '#fff', inf: 'rgba(110,180,255,1)', run: 'rgba(110,180,255,1)', gw: 'rgba(150,215,255,1)' };
      parts.forEach(p => { if (p.k === 'rain' || !want(p.k)) return; const sz = p.k === 'vap' ? 3 : p.k === 'tr' ? 2.6 : p.k === 'snow' ? 2.6 : 2.2; G.globalAlpha = p.k === 'vap' || p.k === 'tr' ? Math.max(0, p.a) : 0.95; G.fillStyle = COL[p.k]; G.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz); });
      G.globalAlpha = 1;
    }
    function arrow(G, key, bright, t) {
      const P0 = PROC[key], [a, b, e] = P0.p, fl = P0.f(F), ref = REF ? REF[key] || 1 : 1, w = 2 + 7 * Math.min(1.4, fl / (ref * 1.6 || 1));
      G.save(); G.globalAlpha = bright ? 1 : 0.7; G.lineCap = 'round';
      G.strokeStyle = 'rgba(10,20,40,.45)'; G.lineWidth = w + 3; G.beginPath(); G.moveTo(a[0], a[1]); G.quadraticCurveTo(b[0], b[1], e[0], e[1]); G.stroke();
      G.strokeStyle = P0.c; G.lineWidth = w; G.beginPath(); G.moveTo(a[0], a[1]); G.quadraticCurveTo(b[0], b[1], e[0], e[1]); G.stroke();
      if (bright && !K.reduced()) { G.strokeStyle = 'rgba(255,255,255,.8)'; G.lineWidth = Math.max(1, w * 0.35); G.setLineDash([3, 12]); G.lineDashOffset = -t * 40; G.beginPath(); G.moveTo(a[0], a[1]); G.quadraticCurveTo(b[0], b[1], e[0], e[1]); G.stroke(); G.setLineDash([]); }
      const ang = Math.atan2(e[1] - b[1], e[0] - b[0]), hs = 7 + w; G.fillStyle = P0.c; G.beginPath(); G.moveTo(e[0] + Math.cos(ang) * hs * 0.6, e[1] + Math.sin(ang) * hs * 0.6); G.lineTo(e[0] + Math.cos(ang + 2.5) * hs, e[1] + Math.sin(ang + 2.5) * hs); G.lineTo(e[0] + Math.cos(ang - 2.5) * hs, e[1] + Math.sin(ang - 2.5) * hs); G.fill();
      // label pill
      const mx = 0.25 * a[0] + 0.5 * b[0] + 0.25 * e[0], my = 0.25 * a[1] + 0.5 * b[1] + 0.25 * e[1], txt = `${T(P0.n[0], P0.n[1])} · ${f2(fl, 2)}`;
      G.font = '700 11px ui-sans-serif, system-ui'; const tw = G.measureText(txt).width + 14, lx = K.clamp(mx + 10, 4, W - tw - 4), ly = my - 9;
      G.fillStyle = 'rgba(12,22,40,.78)'; K.rr(G, lx, ly, tw, 18, 9); G.fill(); G.fillStyle = P0.c; G.beginPath(); G.arc(lx + 7, ly + 9, 3, 0, 7); G.fill(); G.fillStyle = '#fff'; G.textBaseline = 'middle'; G.fillText(txt, lx + 13, ly + 9.5); G.textBaseline = 'alphabetic';
      G.restore();
    }
    function draw() {
      const G = S.g, t = tAnim, z = cam.z.v, cx = cam.x.v, cy = cam.y.v, px = par.x.v, py = par.y.v;
      G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.clearRect(0, 0, S.cv.width, S.cv.height); G.restore();
      const world = (k, ox = 0, oy = 0) => { const zk = 1 + (z - 1) * k; G.setTransform(S.cv.width / W, 0, 0, S.cv.width / W, 0, 0); G.translate(W / 2 + ox, H / 2 + oy); G.scale(zk, zk); G.translate(-(W / 2 + (cx - W / 2) * k), -(H / 2 + (cy - H / 2) * k)); };
      world(0.25); G.drawImage(skyLayer(), -40, -40, W + 80, SEA + 60);
      world(0.45, -px * 10, -py * 4); G.drawImage(far1, -40, 0, W + 80, H);
      world(0.7, -px * 6, -py * 2); G.drawImage(far2, -40, 8, W + 80, H);
      world(1);
      drawOcean(G, t); G.drawImage(base, 0, 0, W, H); drawSnow(G); drawRiver(G, t);
      const gwTop = drawGround(G, t);
      const only = hl === 'all' ? null : PROC[hl].kinds;
      drawParts(G, null);
      G.save(); G.translate(px * 3, 0); drawClouds(G, t, true, false); G.restore();
      if (hl !== 'all') { const [x0, y0, x1, y1] = PROC[hl].box; G.fillStyle = 'rgba(8,16,30,.55)'; G.beginPath(); G.rect(-60, -60, W + 120, H + 120); K.rr(G, x0, y0, x1 - x0, y1 - y0, 18); G.fill('evenodd'); G.strokeStyle = 'rgba(255,255,255,.55)'; G.lineWidth = 1.5 / z; K.rr(G, x0, y0, x1 - x0, y1 - y0, 18); G.stroke();
        if (only.includes('cloud')) { G.save(); G.translate(px * 3, 0); drawClouds(G, t, false, true); G.restore(); } drawParts(G, only); }
      if (labels || hl !== 'all') { Object.keys(PROC).forEach(k => { if (hl === 'all' ? labels : k === hl) arrow(G, k, hl === k, t); }); }
      if (drop) { const r0 = 6 / Math.sqrt(z) + 1; G.fillStyle = 'rgba(255,59,107,.25)'; G.beginPath(); G.arc(drop.x, drop.y, r0 * 2.4 + Math.sin(t * 4) * 1.5, 0, 7); G.fill(); G.fillStyle = '#ff3b6b'; G.strokeStyle = '#fff'; G.lineWidth = 2; G.beginPath(); G.moveTo(drop.x, drop.y - r0 * 1.7); G.quadraticCurveTo(drop.x + r0 * 1.2, drop.y, drop.x, drop.y + r0); G.quadraticCurveTo(drop.x - r0 * 1.2, drop.y, drop.x, drop.y - r0 * 1.7); G.fill(); G.stroke(); }
      if (sel && hl === 'all') { ZONES.filter(zz => zz[0] === sel).forEach(zz => { G.strokeStyle = 'rgba(255,255,255,.9)'; G.setLineDash([6, 5]); G.lineWidth = 2 / z; K.rr(G, zz[1] + 3, zz[3] + 3, zz[2] - zz[1] - 6, zz[4] - zz[3] - 6, 10); G.stroke(); G.setLineDash([]); }); }
      // screen-space HUD
      G.setTransform(S.cv.width / W, 0, 0, S.cv.width / W, 0, 0);
      G.fillStyle = 'rgba(12,22,40,.62)'; K.rr(G, 10, 10, 292, 44, 10); G.fill(); G.fillStyle = '#fff'; G.font = '700 12px ui-sans-serif, system-ui'; G.fillText(`${T('Coast', 'الساحل')} ${ctl.val.T} °C · ${T('mountain top', 'قمة الجبل')} ${ctl.val.T - 18} °C`, 20, 28); G.font = '500 11px ui-sans-serif, system-ui'; G.fillText(`${T('Day', 'اليوم')} ${Math.floor(tDay)} · ${T('total water', 'إجمالي الماء')} ${f2(Object.values(st).reduce((a, b) => a + b, 0), 1)} (${T('conserved', 'محفوظ')})`, 20, 45);
      if (z > 1.05) { G.fillStyle = 'rgba(12,22,40,.62)'; K.rr(G, W - 116, H - 34, 106, 24, 12); G.fill(); G.fillStyle = '#fff'; G.font = '600 11px ui-sans-serif, system-ui'; G.fillText(`${T('zoom', 'تكبير')} ${f2(z, 1)}× · ${T('drag to pan', 'اسحب')}`, W - 108, H - 18); }
      return gwTop;
    }
    let gwTopNow = H - 30;
    function particles(dt) {
      const cap = 520, wind = ctl.val.wind;
      const em = (rate, k, x0, x1, y0, vx, vy) => { let n = rate * dt * 3; while (n > 0 && parts.length < cap) { if (n < 1 && Math.random() > n) break; n--; const x = x0 + Math.random() * (x1 - x0); parts.push({ k, x, y: y0(x), vx: vx(), vy, a: 0.75, ph: Math.random() * 6 }); } };
      em(F.evap, 'vap', 10, COAST - 10, () => SEA - 2, () => 6 * wind, -34);
      em(F.trans * 2, 'tr', 425, 560, x => ground(x) - 26, () => 5 * wind, -30);
      clouds.forEach(cl => { if (cl.r < 0.75) return; const land = cl.x > COAST, rate = land ? (F.rainL + F.snowfall) / 6 : F.rainS / 6; const snowy = land && cl.x > 540 && cl.x < 780 && ctl.val.T - 18 < 0; const hw = 34 * cl.r; em(rate, snowy ? 'snow' : 'rain', cl.x - hw, cl.x + hw, () => cl.y + 24 * cl.r, () => (snowy ? 8 : 14) * wind, snowy ? 46 : 270); });
      em(F.inf * 0.8, 'inf', 600, 950, x => ground(x) + 4, () => 0, 26);
      em(F.run * 1.2, 'run', 596, 720, x => ground(x) - 1, () => -55, 0);
      em(F.base * 1.4, 'gw', 640, 950, () => gwTopNow + 6 + Math.random() * 20, () => -22, 0);
      parts.forEach(p => {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 'vap' || p.k === 'tr') { p.x += Math.sin(p.ph + p.y / 14) * 0.3; p.a -= dt * 0.22; if (p.y < 120 || p.a <= 0) p.dead = true; }
        else if (p.k === 'inf') { if (p.y > gwTopNow) p.dead = true; }
        else if (p.k === 'run') { p.y = ground(p.x) - 1.5; if (p.x < 592) p.dead = true; }
        else if (p.k === 'gw') { p.y += Math.sin(p.x / 20) * 0.1; if (p.x < 600) p.vy = -10; if (p.x < 560 || p.y < CUT) p.dead = true; }
        else { const gy = p.x < COAST ? SEA : ground(p.x); if (p.y > gy) p.dead = true; if (p.k === 'snow') p.x += Math.sin(p.y / 9) * 0.4; }
        if (p.x > W + 10 || p.x < -10) p.dead = true;
      });
      parts = parts.filter(p => !p.dead);
      clouds.forEach(cl => { cl.x += (6 + 22 * wind) * cl.d * dt; if (cl.x > W + 90) { cl.x = -90; cl.y = 70 + Math.random() * 70; } });
    }
    // ---- follow a droplet: each step chosen in proportion to the real flows out of where it is ----
    const ROUTE = { o: [['evap', 'vs', 'evaporates from the ocean surface']], vs: [['condS', 'cs', 'condenses into a cloud over the sea'], ['advV', 'vl', 'is blown inland as vapour']], vl: [['condL', 'cl', 'condenses into a cloud over the land']], cs: [['rainS', 'o', 'falls as rain back into the sea'], ['adv', 'cl', 'is carried inland by the wind']], cl: [['rainL', 'land', 'falls as rain on the land'], ['snowfall', 'snow', 'falls as snow on the mountain']], snow: [['melt', 'land', 'melts in the warm season']], land: [['inf', 'soil', 'soaks into the soil (infiltration)'], ['run', 'riv', 'runs off into the river']], soil: [['trans', 'vl', 'is drawn up by a tree and transpired'], ['recharge', 'gw', 'trickles down to the groundwater'], ['evapL', 'vl', 'evaporates from the ground']], gw: [['base', 'riv', 'seeps slowly into the river']], riv: [['flow', 'o', 'flows back to the sea']] };
    const POS = { o: [200, 430], vs: [200, 230], vl: [600, 220], cs: [220, 105], cl: [650, 105], snow: [648, 200], land: [640, 300], soil: [720, 460], gw: [720, 535], riv: [520, 392] };
    const DVIEW = { o: VIEWS.ocean, vs: [260, 250, 1.4], cs: [300, 160, 1.4], vl: [560, 200, 1.4], cl: [600, 160, 1.4], snow: VIEWS.mountain, land: VIEWS.mountain, soil: VIEWS.under, gw: VIEWS.under, riv: VIEWS.river };
    function follow() { drop = { at: 'o', x: POS.o[0], y: POS.o[1], log: [T('A droplet starts in the ocean.', 'تبدأ القطرة في المحيط.')], n: 0 }; hl = 'all'; ctl.set('hl', 'all'); if (ctl.val.view !== 'all') aim(DVIEW.o); show(); }
    let dropT = 0;
    function moveDrop(dt) {
      if (!drop) return; const [tx, ty] = POS[drop.at]; drop.x += (tx - drop.x) * Math.min(1, dt * 2.4); drop.y += (ty - drop.y) * Math.min(1, dt * 2.4); dropT += dt; if (dropT < 1.9 || drop.n > 14) return; dropT = 0;
      const opts = ROUTE[drop.at].map(([f, to, txt]) => [Math.max(0, F[f] || 0), to, txt]), tot = opts.reduce((s, o) => s + o[0], 0); if (tot <= 0) return; let r = Math.random() * tot, pick = opts[0]; for (const o of opts) { if (r < o[0]) { pick = o; break; } r -= o[0]; }
      drop.at = pick[1]; drop.n++; drop.log.push(T('It ', 'إنها ') + pick[2] + '.'); if (cam.z.t > 1.05) aim(DVIEW[drop.at]); show();
    }
    function show() {
      const box = host.querySelector('.wc__info');
      if (drop) box.innerHTML = `<p><b>${T('Droplet journey', 'رحلة القطرة')}</b></p><ol>${drop.log.slice(-8).map(l => `<li>${esc(l)}</li>`).join('')}</ol>${drop.n > 14 ? `<p class="v26-hint">${T('That is 15 steps — press Follow again for a new droplet.', 'خمس عشرة خطوة.')}</p>` : ''}`;
      else if (hl !== 'all') { const P0 = PROC[hl]; box.innerHTML = `<p><b>${esc(T(P0.n[0], P0.n[1]))}</b> — ${T('now', 'الآن')} <b>${f2(P0.f(F), 2)}</b> ${T('units per day', 'وحدة يومياً')}</p>${LS.md(T(P0.t[0], P0.t[1]))}`; }
      else if (sel) { const [h, b] = INFO[sel]; box.innerHTML = `<p><b>${esc(h)}</b></p>${LS.md(b)}`; }
      else box.innerHTML = `<p class="v26-hint">${T('Select a part of the scene — the ocean, sky, mountain, forest, river, soil or groundwater — or highlight a process.', 'اختر جزءاً من المشهد.')}</p>`;
    }
    function table() { const r = (n, v) => `<tr><td>${n}</td><td>${f2(v, 2)}</td></tr>`; host.querySelector('.wc__tab').innerHTML = `<table><tr><th>${T('Flow per day', 'التدفق اليومي')}</th><th></th></tr>${r(T('Evaporation (ocean)', 'التبخر'), F.evap)}${r(T('Transpiration', 'النتح'), F.trans)}${r(T('Condensation', 'التكثف'), F.condS + F.condL)}${r(T('Rain on sea', 'مطر على البحر'), F.rainS)}${r(T('Rain on land', 'مطر على اليابسة'), F.rainL)}${r(T('Snowfall', 'تساقط الثلج'), F.snowfall)}${r(T('Snowmelt', 'ذوبان الثلج'), F.melt)}${r(T('Infiltration', 'التسرب'), F.inf)}${r(T('Runoff', 'الجريان السطحي'), F.run)}${r(T('Groundwater to river', 'الجوفية إلى النهر'), F.base)}${r(T('River to sea', 'النهر إلى البحر'), F.flow)}</table><p>${T('Stores', 'المخازن')}: ${T('snow', 'ثلج')} ${f2(st.snow, 1)} · ${T('soil', 'تربة')} ${f2(st.soil, 1)} · ${T('groundwater', 'جوفية')} ${f2(st.gw, 1)} · ${T('river', 'نهر')} ${f2(st.riv, 1)} · ${T('clouds', 'غيوم')} ${f2(st.cs + st.cl, 1)}<br>${T('Total water', 'إجمالي الماء')}: <b>${f2(Object.values(st).reduce((a, b) => a + b, 0), 2)}</b> (${T('always', 'دائماً')} ${f2(TOTAL0, 2)})</p>`; }

    let tT = 0, frames = 0, ftime = 0;
    const M = K.motor(c, host, (dt, running) => {
      const h = Math.min(dt, 0.05);
      if (running) { step(h); if (!K.reduced()) particles(h); moveDrop(h); tT += h; if (tT > 0.4) { tT = 0; table(); if (hl !== 'all') show(); } }
      if (!K.reduced()) tAnim += h;
      const t0 = performance.now(); gwTopNow = draw(); ftime += performance.now() - t0; frames++;
    });
    M.add(cam.x, cam.y, cam.z, par.x, par.y);
    // ---- pointer: click selects, drag pans when zoomed, mouse hover gives parallax ----
    let down = null;
    S.cv.addEventListener('pointerdown', e => { e.preventDefault(); S.cv.focus({ preventScroll: true }); const [x, y] = S.pt(e); down = { x, y, cx: cam.x.t, cy: cam.y.t, moved: false }; try { S.cv.setPointerCapture(e.pointerId); } catch (_) {} });
    S.cv.addEventListener('pointermove', e => {
      const [x, y] = S.pt(e);
      if (down) { const dx = x - down.x, dy = y - down.y; if (Math.hypot(dx, dy) > 6) down.moved = true; if (down.moved && cam.z.t > 1.02) { cam.x.set(down.cx - dx / cam.z.v, true); cam.y.set(down.cy - dy / cam.z.v, true); clampCam(); cam.x.v = cam.x.t; cam.y.v = cam.y.t; M.kick(); } return; }
      if (e.pointerType === 'mouse' && !K.reduced()) { par.x.set((x / W - 0.5) * 2); par.y.set((y / H - 0.5) * 2); M.kick(); }
    });
    const up = e => { if (!down) return; const d = down; down = null; if (d.moved) return; const [wx, wy] = toWorld(d.x, d.y); const z = ZONES.slice().reverse().find(([, x0, x1, y0, y1]) => wx >= x0 && wx <= x1 && wy >= y0 && wy <= y1); sel = z ? z[0] : null; drop = null; if (hl !== 'all') { hl = 'all'; ctl.set('hl', 'all'); } show(); M.kick(); M.draw(); };
    S.cv.addEventListener('pointerup', up); S.cv.addEventListener('pointercancel', () => { down = null; });
    S.cv.addEventListener('pointerleave', () => { par.x.set(0); par.y.set(0); M.kick(); });
    S.cv.addEventListener('keydown', e => {
      const k = e.key; let used = true;
      if (k === 'Enter' || k === ' ') { const order = ['ocean', 'sky', 'mountain', 'forest', 'river', 'soil', 'ground', 'sun']; sel = order[(order.indexOf(sel) + 1) % order.length]; drop = null; show(); }
      else if (k === '+' || k === '=') cam.z.set(K.clamp(cam.z.t * 1.35, 1, 3));
      else if (k === '-' || k === '_') cam.z.set(K.clamp(cam.z.t / 1.35, 1, 3));
      else if (/^Arrow/.test(k) && cam.z.t > 1.02) { const s = 60 / cam.z.t; if (k === 'ArrowLeft') cam.x.set(cam.x.t - s); if (k === 'ArrowRight') cam.x.set(cam.x.t + s); if (k === 'ArrowUp') cam.y.set(cam.y.t - s); if (k === 'ArrowDown') cam.y.set(cam.y.t + s); }
      else if (k === '0') aim(VIEWS.all);
      else used = false;
      if (used) { e.preventDefault(); clampCam(); M.kick(); M.draw(); }
    });
    for (let i = 0; i < 200; i++) step(0.05); // settle the model before the student sees it
    REF = {}; Object.keys(PROC).forEach(k => { REF[k] = Math.max(0.05, PROC[k].f(F)); });
    show(); table(); M.play();
    const total = () => Object.values(st).reduce((a, b) => a + b, 0);
    return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { M.pause(); S.destroy(); },
      reset() { ctl.reset(); hl = 'all'; labels = true; base = scene(); Object.assign(st, INIT); drop = null; sel = null; parts = []; aim(VIEWS.all); for (let i = 0; i < 200; i++) step(0.05); show(); table(); M.play(); },
      _sim: (set, days) => { Object.entries(set).forEach(([k, v]) => ctl.set(k, v)); for (let i = 0; i < days * 10; i++) step(0.05); table(); return { F: Object.assign({}, F), st: Object.assign({}, st), total: total(), total0: TOTAL0 }; },
      _view: () => ({ cam: [cam.x.t, cam.y.t, cam.z.t], camNow: [cam.x.v, cam.y.v, cam.z.v], hl, labels, sel, parts: parts.length, kinds: [...new Set(parts.map(p => p.k))], frames, msPerFrame: frames ? ftime / frames : 0, river: 2.5 + Math.min(11, st.riv * 0.55), gwTop: gwTopNow }),
      _perfReset: () => { frames = 0; ftime = 0; },
      observe() { return { text: `At ${ctl.val.T} °C with ${Math.round(ctl.val.perm * 100)} % permeable ground: evaporation **${f2(F.evap)}**, rain on land **${f2(F.rainL)}**, runoff **${f2(F.run)}** vs infiltration **${f2(F.inf)}**, snow store **${f2(st.snow, 1)}**. Total water: **${f2(total())}** — conserved.`, predOk: i => (ctl.val.perm < 0.3 ? i === 1 : null) }; }
    };
  };
})();
