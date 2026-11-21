/* ERLY Handwriting Studio (v24) — learning modes: Practise (letters, numbers, words, sentences with guides and an
   honest coverage check), Graph (plot functions, tables, points) and Science (component library, labelled force
   vectors, ready-made diagrams whose geometry is computed, not drawn by eye). */
(function () {
  'use strict';
  const H = window.HWS, T = H.T, esc = H.esc;

  /* ---------- guide items (practice) ---------- */
  const FONT = f => (f === 'serif' ? 'Georgia, "Times New Roman", serif' : '"Andika", "Century Gothic", "Trebuchet MS", ui-sans-serif, system-ui, sans-serif');
  const baseRender = H.render;
  H.render = (g, it, page, o) => { if (it.t !== 'guide') return baseRender(g, it, page, o); if (it.style === 'hide') return; g.save(); g.font = `500 ${it.size}px ${FONT(it.font)}`; g.textBaseline = 'alphabetic';
    if (it.style === 'model') { g.fillStyle = 'rgba(30,30,40,.82)'; g.fillText(it.text, it.x, it.base); }
    else if (it.style === 'fade') { g.fillStyle = 'rgba(40,60,120,.16)'; g.fillText(it.text, it.x, it.base); }
    else { g.strokeStyle = 'rgba(40,70,150,.55)'; g.lineWidth = it.style === 'dot' ? 3.2 : 1.8; g.lineCap = 'round'; g.setLineDash(it.style === 'dot' ? [0.1, 7] : [9, 7]); g.strokeText(it.text, it.x, it.base); }
    if (it.start && it.style !== 'model') { g.fillStyle = 'rgba(29,122,70,.85)'; g.beginPath(); g.arc(it.x - 10, it.base - it.size * 0.72, 5, 0, 7); g.fill(); }
    g.restore(); };
  const baseBox = H.bbox; H.bbox = (it, p) => { if (it.t !== 'guide') return baseBox(it, p); const w = measure(it); return [it.x, it.base - it.size * 0.8, it.x + w, it.base + it.size * 0.28]; };
  const mc = document.createElement('canvas').getContext('2d'); function measure(it) { mc.font = `500 ${it.size}px ${FONT(it.font)}`; return mc.measureText(it.text).width; }

  const SETS = {
    upper: [T('Capital letters', 'الحروف الكبيرة'), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')], lower: [T('Small letters', 'الحروف الصغيرة'), 'abcdefghijklmnopqrstuvwxyz'.split('')],
    digits: [T('Numbers', 'الأرقام'), '0123456789'.split('')], symbols: [T('Maths symbols', 'رموز رياضية'), ['+', '−', '×', '÷', '=', '<', '>', '≤', '≥', '√', 'π', '%', '½', '²', '°', '∞']],
    joins: [T('Letter pairs', 'أزواج الحروف'), ['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd', 'ti', 'es', 'or', 'te', 'ou', 'ch', 'sh', 'ing']],
    words: [T('Words', 'كلمات'), ['because', 'friend', 'people', 'through', 'thought', 'science', 'energy', 'equation', 'between', 'answer', 'library', 'February', 'photosynthesis', 'necessary', 'separate', 'rhythm', 'definitely', 'neighbour']],
    sentences: [T('Sentences', 'جمل'), ['The quick brown fox jumps over the lazy dog.', 'Pack my box with five dozen liquor jugs.', 'Sphinx of black quartz, judge my vow.', 'Light travels faster than sound.', 'Plants make their food by photosynthesis.', 'Every force has an equal and opposite reaction.', 'My handwriting improves with practice.']],
    custom: [T('My own text', 'نصي الخاص'), []]
  };
  const PR = H.PR = { set: 'lower', picked: new Set(['a', 'b', 'c', 'd']), style: 'dash', reps: 4, font: 'sans', custom: '', results: null };
  H.practicePanel = (S, page) => {
    const [name, items] = SETS[PR.set];
    return `<section class="hws-sec hws-prac"><h3>${T('Practise', 'تدرّب')}</h3>
      <div class="hws-brushes" role="radiogroup" aria-label="${T('What to practise', 'ماذا تتدرب')}">${Object.entries(SETS).map(([k, v]) => `<button type="button" role="radio" data-pset="${k}" aria-checked="${PR.set === k}">${v[0]}</button>`).join('')}</div>
      ${PR.set === 'custom' ? `<label class="hws-field">${T('Type words or a sentence', 'اكتب كلمات أو جملة')}<textarea data-pcustom rows="2" maxlength="160">${esc(PR.custom)}</textarea></label>` : `<div class="hws-pick" role="group" aria-label="${esc(name)}">${items.map(x => `<button type="button" data-pitem="${esc(x)}" aria-pressed="${PR.picked.has(x)}">${esc(x)}</button>`).join('')}</div><p class="hws-mini">${T('Pick what to practise (one row each).', 'اختر ما تتدرب عليه.')} <button type="button" class="hws-link" data-pall>${T('All', 'الكل')}</button> · <button type="button" class="hws-link" data-pnone>${T('None', 'لا شيء')}</button></p>`}
      <label class="hws-field">${T('Guide style', 'نمط الدليل')}<select data-pstyle><option value="dash" ${PR.style === 'dash' ? 'selected' : ''}>${T('Dashed outline', 'خط متقطع')}</option><option value="dot" ${PR.style === 'dot' ? 'selected' : ''}>${T('Dotted outline', 'خط منقط')}</option><option value="fade" ${PR.style === 'fade' ? 'selected' : ''}>${T('Faded letters', 'حروف باهتة')}</option></select></label>
      <label class="hws-field">${T('Letter style', 'نمط الحرف')}<select data-pfont><option value="sans" ${PR.font === 'sans' ? 'selected' : ''}>${T('Print (sans)', 'طباعة')}</option><option value="serif" ${PR.font === 'serif' ? 'selected' : ''}>${T('Book (serif)', 'كتاب')}</option></select></label>
      <label class="hws-range"><span>${T('Copies to trace per row', 'نسخ للتتبع')}<output>${PR.reps}</output></span><input type="range" data-preps min="1" max="8" step="1" value="${PR.reps}"></label>
      <div class="hws-row"><button type="button" class="hws-btn hws-btn--accent" data-pmake>${T('Make practice sheet', 'أنشئ ورقة التدريب')}</button></div>
      <div class="hws-row"><button type="button" class="hws-btn" data-pcheck>${T('Check my tracing', 'تحقق من تتبعي')}</button><button type="button" class="hws-btn" data-phide>${T('Hide / show guides', 'إخفاء/إظهار الدليل')}</button></div>
      ${PR.results ? `<div class="hws-res" aria-live="polite">${PR.results}</div>` : ''}
      <details class="hws-mini"><summary>${T('How is my tracing checked?', 'كيف يُفحص التتبع؟')}</summary><p>${T('ERLY draws each guide letter and your ink as pixels on this device and measures two things: how much of the letter shape your ink passed over (coverage), and how much of your ink went outside the letter (wandering). It does not judge neatness or style, and it is not a test of ability. Shapes you write in the free space after a row are not measured.', 'يقيس التغطية والخروج فقط.')}</p></details></section>`;
  };
  function makeSheet() {
    const list = PR.set === 'custom' ? PR.custom.split(/\n+/).map(s => s.trim()).filter(Boolean) : [...PR.picked].sort((a, b) => SETS[PR.set][1].indexOf(a) - SETS[PR.set][1].indexOf(b));
    if (!list.length) return H.toast(T('Pick at least one thing to practise.', 'اختر شيئاً واحداً على الأقل.'));
    const long = PR.set === 'sentences' || PR.set === 'words' || PR.set === 'custom', perPage = long ? 3 : 7, pages = [];
    for (let i = 0; i < list.length; i += perPage) pages.push(list.slice(i, i + perPage));
    const nb = H.nb, first = nb.pages.length;
    pages.forEach((chunk, pi) => { const p = H.newPage('guide', 'landscape', T('Practice', 'تدريب') + ' ' + (pi + 1)); const G = { id: H.uid('l'), name: T('Guides (locked)', 'الأدلة (مقفلة)'), visible: true, locked: true, items: [] }; p.layers.unshift(G); p.active = p.layers[1].id; p.layers[1].name = T('My writing', 'كتابتي');
      chunk.forEach((txt, r) => { const y0 = long ? 120 + r * 264 : 120 + r * 132, base = y0 + 80, size = 104, font = PR.font; let x = 70; const w = measure({ text: txt, size, font });
        if (long) { G.items.push({ t: 'guide', id: H.uid('g'), text: txt, x, base, size: Math.min(size, (p.w - 140) / (w / size)), font, style: PR.style, start: false }); }
        else { G.items.push({ t: 'guide', id: H.uid('g'), text: txt, x, base, size, font, style: 'model' }); x += w + 50; for (let k = 0; k < PR.reps && x + w < p.w - 60; k++) { G.items.push({ t: 'guide', id: H.uid('g'), text: txt, x, base, size, font, style: PR.style, start: k === 0 }); x += w + 50; } } });
      nb.pages.push(p); });
    H.changed(); H.renderPages(); H.goPage(first); PR.results = null; H.renderProps(); H.setTool('pen');
    H.toast(T('Trace each grey letter, then write your own in the space after it.', 'تتبع كل حرف ثم اكتبه بنفسك.'));
  }
  function check() {
    const p = H.page(), guides = p.layers.filter(L => L.locked).flatMap(L => L.items).filter(i => i.t === 'guide' && i.style !== 'model');
    if (!guides.length) return H.toast(T('This page has no tracing guides. Make a practice sheet first.', 'لا أدلة في هذه الصفحة.'));
    const ink = p.layers.filter(L => !L.locked && L.visible).flatMap(L => L.items).filter(i => i.t === 'stroke'); const res = [];
    guides.forEach(gd => { const [x0, y0, x1, y1] = H.bbox(gd, p), pad = 20, W = Math.ceil(x1 - x0 + pad * 2), Hh = Math.ceil(y1 - y0 + pad * 2), sc = 0.5, w = Math.ceil(W * sc), h = Math.ceil(Hh * sc);
      const mine = ink.filter(s => { const b = H.bbox(s, p); return b[2] > x0 - 4 && b[0] < x1 + 4 && b[3] > y0 && b[1] < y1; }); if (!mine.length) { res.push({ gd, cov: 0, out: 0, n: 0 }); return; }
      const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.scale(sc, sc); g.translate(pad - x0, pad - y0); return g; };
      const gFill = mk(); gFill.font = `500 ${gd.size}px ${FONT(gd.font)}`; gFill.fillStyle = '#000'; gFill.fillText(gd.text, gd.x, gd.base);
      const gZone = mk(); gZone.font = gFill.font; gZone.fillStyle = gZone.strokeStyle = '#000'; gZone.lineWidth = 18; gZone.lineJoin = 'round'; gZone.fillText(gd.text, gd.x, gd.base); gZone.strokeText(gd.text, gd.x, gd.base);
      const iWide = mk(), iTrue = mk(); mine.forEach(s => { [[iWide, 14], [iTrue, 0]].forEach(([g, extra]) => { g.strokeStyle = '#000'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(2, s.size * 1.2) + extra; g.beginPath(); s.pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); }); });
      const A = gFill.getImageData(0, 0, w, h).data, Z = gZone.getImageData(0, 0, w, h).data, Wd = iWide.getImageData(0, 0, w, h).data, Tr = iTrue.getImageData(0, 0, w, h).data;
      let gp = 0, cov = 0, ip = 0, out = 0; for (let i = 3; i < A.length; i += 4) { if (A[i] > 100) { gp++; if (Wd[i] > 60) cov++; } if (Tr[i] > 100) { ip++; if (Z[i] < 60) out++; } }
      res.push({ gd, cov: gp ? cov / gp : 0, out: ip ? out / ip : 0, n: mine.length }); });
    H.lastCheck = { page: p.id, res };
    const done = res.filter(r => r.n), avgC = done.length ? done.reduce((s, r) => s + r.cov, 0) / done.length : 0, avgO = done.length ? done.reduce((s, r) => s + r.out, 0) / done.length : 0;
    PR.results = done.length ? `<p><b>${T('Traced', 'تم تتبع')} ${done.length} ${T('of', 'من')} ${res.length}</b> ${T('guides.', 'أدلة.')} ${T('Average coverage', 'متوسط التغطية')} <b>${Math.round(avgC * 100)}%</b>; ${T('ink outside the letters', 'الحبر خارج الحروف')} <b>${Math.round(avgO * 100)}%</b>.</p><p class="hws-mini">${avgC < 0.6 ? T('Tip: follow the whole outline of each letter — look for parts you skipped (they are marked on the page).', 'نصيحة: اتبع الحرف كاملاً.') : avgO > 0.25 ? T('Tip: slow down a little to stay inside the letter shapes.', 'نصيحة: أبطئ قليلاً.') : T('Your tracing follows the letter shapes closely. Try hiding the guides and writing on your own.', 'جرّب إخفاء الأدلة.')}</p>` : `<p>${T('No ink found on the guides yet.', 'لا يوجد حبر على الأدلة بعد.')}</p>`;
    H.renderProps(); if (H.cv) H.cv.render();
  }
  H.overlay = (g, z, page) => { const c = H.lastCheck; if (!c || c.page !== page.id) return; c.res.forEach(r => { const [x0, , x1, y1] = H.bbox(r.gd, page), cx = (x0 + x1) / 2; g.font = `700 ${Math.max(11, 13 / z)}px ui-sans-serif, system-ui`; g.textAlign = 'center';
    if (!r.n) { g.fillStyle = 'rgba(120,120,120,.8)'; g.fillText(T('not traced', 'لم يُتتبع'), cx, y1 + 16); return; } g.fillStyle = r.cov > 0.75 && r.out < 0.2 ? 'rgba(23,138,74,.95)' : 'rgba(196,122,0,.95)'; g.fillText(`${Math.round(r.cov * 100)}% · ${Math.round(r.out * 100)}% ${T('out', 'خارج')}`, cx, y1 + 16); }); };

  /* ---------- graph ---------- */
  const GR = { expr: 'x^2 - 3', err: '', from: -4, to: 4, step: 1, table: null, pts: '' };
  const FCOL = ['#1f4fd1', '#c8341f', '#1d7a46', '#6b3fd1', '#b85c38'];
  H.graphPanel = (S, p) => { const fns = H.allItems(p).filter(i => i.t === 'fn');
    return `<section class="hws-sec"><h3>${T('Plot a function', 'ارسم دالة')}</h3><div class="hws-row"><label class="hws-field hws-grow">y = <input data-gexpr value="${esc(GR.expr)}" spellcheck="false" autocomplete="off" aria-label="${T('Function of x', 'دالة في x')}"></label><button type="button" class="hws-btn hws-btn--accent" data-gplot>${T('Plot', 'ارسم')}</button></div><p class="kx-err hws-err">${esc(GR.err)}</p>
      <p class="hws-mini">${T('Examples: 2x+1 · x^2-4 · sin(x) · sqrt(x) · 1/x · |x|. Uses the coordinate plane (1 square = 1 unit).', 'أمثلة.')}</p>
      ${fns.length ? `<ul class="hws-fns">${fns.map(f => `<li><span style="color:${f.color}">■</span> y = ${esc(f.expr)} <button type="button" class="hws-link" data-gdel="${f.id}">${T('remove', 'إزالة')}</button></li>`).join('')}</ul>` : ''}
      <h3>${T('Table of values', 'جدول القيم')}</h3><div class="hws-row hws-row--tight"><label class="hws-field">x ${T('from', 'من')} <input type="number" data-gfrom value="${GR.from}" step="any"></label><label class="hws-field">${T('to', 'إلى')} <input type="number" data-gto value="${GR.to}" step="any"></label><label class="hws-field">${T('step', 'الخطوة')} <input type="number" data-gstep value="${GR.step}" step="any" min="0.1"></label></div><div class="hws-row"><button type="button" class="hws-btn" data-gtable>${T('Make table', 'أنشئ الجدول')}</button>${GR.table ? `<button type="button" class="hws-btn" data-gplace>${T('Place on page', 'ضع على الصفحة')}</button>` : ''}</div>
      ${GR.table ? `<table class="kx-tbl hws-tbl"><tr><th>x</th>${GR.table.map(r => `<td>${r[0]}</td>`).join('')}</tr><tr><th>y</th>${GR.table.map(r => `<td>${r[1]}</td>`).join('')}</tr></table>` : ''}
      <h3>${T('Plot points from data', 'ارسم نقاطاً من بيانات')}</h3><label class="hws-field">${T('One “x, y” pair per line', 'زوج x, y في كل سطر')}<textarea rows="3" data-gpts placeholder="0, 1&#10;1, 3&#10;2, 5">${esc(GR.pts)}</textarea></label><div class="hws-row"><button type="button" class="hws-btn" data-gpoints>${T('Plot points', 'ارسم النقاط')}</button><button type="button" class="hws-btn" data-gjoin>${T('Plot and join', 'ارسم وصل')}</button></div></section>`; };

  /* ---------- science ---------- */
  const CATS = [[T('Mechanics', 'الميكانيكا'), ['block', 'cart', 'ball', 'incline', 'pulley', 'spring', 'pendulum']], [T('Electricity', 'الكهرباء'), ['cell', 'battery', 'resistor', 'bulb', 'switch', 'ammeter', 'voltmeter', 'capacitor']], [T('Light', 'الضوء'), ['lens', 'concave', 'mirror', 'prism']], [T('Lab & maths', 'المختبر والرياضيات'), ['beaker', 'flask', 'axes', 'numberline', 'protractor']]];
  const VEC = [['F', '#1f4fd1'], ['W = mg', '#1c1b19'], ['N', '#1d7a46'], ['f', '#c8341f'], ['T', '#6b3fd1'], ['v', '#d9761c'], ['a', '#0b6e99']];
  const SC = { angle: 30 };
  H.sciencePanel = S => `<section class="hws-sec"><h3>${T('Components', 'المكونات')}</h3>${CATS.map(([n, ks]) => `<p class="hws-mini">${n}</p><div class="hws-stamps">${ks.map(k => `<button type="button" data-stamp="${k}" aria-pressed="${S.tool.stamp === k}" title="${T(...H.STAMPS[k])}"><img alt="" src="${stampIcon(k)}"><span>${T(...H.STAMPS[k])}</span></button>`).join('')}</div>`).join('')}<p class="hws-mini">${T('Choose one, then click the page. Select it afterwards to move, resize, rotate or (for the incline) change its angle.', 'اختر ثم انقر الصفحة.')}</p></section>`;
  function stampIcon(k) { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); const it = { t: 'stamp', id: 'i' + k, k, x: 32, y: 32, s: 0.26, color: '#1c1b19', w: 2.5, props: { angle: 30 } }; H.render(g, it, { w: 64, h: 64 }, {}); return c.toDataURL(); }
  const vecPanel = () => `<section class="hws-sec"><h3>${T('Force & vector arrows', 'أسهم القوى والمتجهات')}</h3><div class="hws-row">${VEC.map(([l, c]) => `<button type="button" class="hws-btn" data-vec="${esc(l)}" data-vcol="${c}" style="color:${c}">${esc(l)}</button>`).join('')}</div><p class="hws-mini">${T('Picks the arrow tool with that label and colour: drag from where the force acts.', 'يختار أداة السهم بهذه التسمية.')}</p>
    <h3>${T('Ready-made diagrams', 'مخططات جاهزة')}</h3><label class="hws-range"><span>${T('Incline angle', 'زاوية الميل')}<output>${SC.angle}°</output></span><input type="range" data-scangle min="10" max="60" step="1" value="${SC.angle}"></label>
    <div class="hws-row"><button type="button" class="hws-btn" data-tpl="incline">${T('Block on a slope + forces', 'كتلة على منحدر + القوى')}</button><button type="button" class="hws-btn" data-tpl="series">${T('Series circuit', 'دائرة توالي')}</button><button type="button" class="hws-btn" data-tpl="parallel">${T('Parallel circuit', 'دائرة توازي')}</button><button type="button" class="hws-btn" data-tpl="ray">${T('Lens ray diagram', 'مخطط أشعة العدسة')}</button></div>
    <p class="hws-mini">${T('Templates are ordinary items: move, relabel, delete or draw on them. Force arrows on the slope are drawn at the correct angles for the chosen incline.', 'القوالب عناصر عادية.')}</p></section>`;
  const prevSci = H.sciencePanel; H.sciencePanel = S => prevSci(S) + vecPanel(); H.scienceTop = () => vecPanel() + `<section class="hws-sec"><button type="button" class="hws-btn" data-stamp="block">${T('Open the component library', 'افتح مكتبة المكونات')}</button></section>`;
  function template(k) {
    const p = H.page(), L = H.layer(p), cx = p.w / 2, cy = p.h / 2, add = []; const sh = (kk, pts, col, label, extra) => add.push(Object.assign({ t: 'shape', id: H.uid('h'), k: kk, pts, color: col, w: 3, label: label || '' }, extra || {}));
    if (k === 'incline') { const a = SC.angle * Math.PI / 180, Lb = 220 * 2.2, s = 2.2; add.push({ t: 'stamp', id: H.uid('k'), k: 'incline', x: cx, y: cy, s, color: '#1c1b19', w: 2.5, props: { angle: SC.angle } });
      // the slope runs from (cx − 110s, cy + 50s) up to (cx + 110s, cy + 50s − tan(a)·220s); put the block at 55% along it
      const x0 = cx - 110 * s, y0 = cy + 50 * s, d = 0.55 * 220 * s / Math.cos(a), bx = x0 + Math.cos(a) * d, by = y0 - Math.sin(a) * d, nx = -Math.sin(a), ny = -Math.cos(a), mx = bx + nx * 30, my = by + ny * 30;
      add.push({ t: 'stamp', id: H.uid('k'), k: 'block', x: mx, y: my, s: 1, rot: -a, color: '#1c1b19', w: 2.5, props: { label: 'm' } });
      // in equilibrium: N = mg cos θ (out of the slope), static friction f = mg sin θ (up the slope); dashed: the two components of the weight
      const Wl = 170, along = [-Math.cos(a), Math.sin(a)], into = [Math.sin(a), Math.cos(a)];
      sh('arrow', [[mx, my], [mx, my + Wl]], '#1c1b19', 'W = mg');
      sh('arrow', [[mx, my], [mx - into[0] * Wl * Math.cos(a), my - into[1] * Wl * Math.cos(a)]], '#1d7a46', 'N');
      sh('arrow', [[mx, my], [mx - along[0] * Wl * Math.sin(a), my - along[1] * Wl * Math.sin(a)]], '#c8341f', 'f');
      sh('arrow', [[mx, my], [mx + along[0] * Wl * Math.sin(a), my + along[1] * Wl * Math.sin(a)]], '#888888', 'mg sinθ', { dash: true, w: 2 });
      sh('arrow', [[mx, my], [mx + into[0] * Wl * Math.cos(a), my + into[1] * Wl * Math.cos(a)]], '#888888', 'mg cosθ', { dash: true, w: 2 }); }
    if (k === 'series' || k === 'parallel') { const w = 520, h = 280, x0 = cx - w / 2, y0 = cy - h / 2, col = '#1c1b19';
      add.push({ t: 'stamp', id: H.uid('k'), k: 'cell', x: cx, y: y0, s: 1, color: col, w: 2.5 }); sh('line', [[x0, y0], [cx - 50, y0]], col); sh('line', [[cx + 50, y0], [x0 + w, y0]], col); sh('line', [[x0, y0], [x0, y0 + h]], col); sh('line', [[x0 + w, y0], [x0 + w, y0 + h]], col);
      if (k === 'series') { add.push({ t: 'stamp', id: H.uid('k'), k: 'bulb', x: cx - 120, y: y0 + h, s: 1, color: col, w: 2.5 }, { t: 'stamp', id: H.uid('k'), k: 'bulb', x: cx + 120, y: y0 + h, s: 1, color: col, w: 2.5 }); sh('line', [[x0, y0 + h], [cx - 180, y0 + h]], col); sh('line', [[cx - 60, y0 + h], [cx + 60, y0 + h]], col); sh('line', [[cx + 180, y0 + h], [x0 + w, y0 + h]], col); }
      else { [y0 + h * 0.55, y0 + h].forEach(yy => { add.push({ t: 'stamp', id: H.uid('k'), k: 'bulb', x: cx, y: yy, s: 1, color: col, w: 2.5 }); sh('line', [[x0, yy], [cx - 60, yy]], col); sh('line', [[cx + 60, yy], [x0 + w, yy]], col); }); } }
    if (k === 'ray') { const f = 150, u = 330, hgt = 90, v = 1 / (1 / f - 1 / u), m = -v / u; add.push({ t: 'stamp', id: H.uid('k'), k: 'lens', x: cx, y: cy, s: 2.2, color: '#1c1b19', w: 2 });
      sh('arrow', [[cx - u, cy], [cx - u, cy - hgt]], '#1d7a46', T('object', 'جسم')); sh('arrow', [[cx + v, cy], [cx + v, cy - hgt * m]], '#c8341f', T('image', 'صورة'));
      sh('line', [[cx - u, cy - hgt], [cx, cy - hgt]], '#d9761c'); sh('line', [[cx, cy - hgt], [cx + v, cy - hgt * m]], '#d9761c'); sh('line', [[cx - u, cy - hgt], [cx + v, cy - hgt * m]], '#d9761c');
      add.push({ t: 'text', id: H.uid('t'), x: cx - u, y: cy + 160, text: T(`f = ${f}, u = ${u} → 1/v = 1/f − 1/u → v = ${v.toFixed(0)}, magnification ${Math.abs(m).toFixed(2)}`, `f = ${f}`), size: 20, font: 'sans', color: '#1c1b19' }); }
    H.checkpoint(p); L.items.push(...add); H.changed(); H.setTool('select'); if (H.cv) H.cv.setSel(add.map(i => i.id));
  }

  /* ---------- shared click / input handlers for these panels ---------- */
  const prevClick = H.onPropsClick; H.onPropsClick = (b, S, page) => {
    const d = b.dataset;
    if (d.pset) { PR.set = d.pset; PR.picked = new Set((SETS[PR.set][1] || []).slice(0, PR.set === 'sentences' ? 2 : PR.set === 'words' ? 4 : 5)); H.renderProps(); return; }
    if (d.pitem != null) { PR.picked.has(d.pitem) ? PR.picked.delete(d.pitem) : PR.picked.add(d.pitem); b.setAttribute('aria-pressed', String(PR.picked.has(d.pitem))); return; }
    if ('pall' in d) { PR.picked = new Set(SETS[PR.set][1]); H.renderProps(); return; } if ('pnone' in d) { PR.picked = new Set(); H.renderProps(); return; }
    if ('pmake' in d) return makeSheet(); if ('pcheck' in d) return check();
    if ('phide' in d) { const p = page; H.checkpoint(p); p.layers.filter(L => L.locked).forEach(L => { L.items = L.items.map(i => i.t === 'guide' && i.style !== 'model' ? Object.assign({}, i, i.style === 'hide' ? { style: i.prev || 'dash' } : { prev: i.style, style: 'hide' }) : i); }); H.changed(); return; }
    if ('gplot' in d) { try { H.expr(GR.expr); GR.err = ''; const n = H.allItems(page).filter(i => i.t === 'fn').length; H.checkpoint(page); H.layer(page).items.push({ t: 'fn', id: H.uid('f'), expr: GR.expr, color: FCOL[n % FCOL.length], w: 3, lx: 24, ly: 40 + n * 28 }); H.changed(); } catch (e) { GR.err = e.message; } H.renderProps(); return; }
    if (d.gdel) { H.checkpoint(page); page.layers.forEach(L => { L.items = L.items.filter(i => i.id !== d.gdel); }); H.changed(); H.renderProps(); return; }
    if ('gtable' in d) { try { const f = H.expr(GR.expr), st = Math.max(0.1, +GR.step || 1); GR.table = []; for (let x = +GR.from; x <= +GR.to + 1e-9 && GR.table.length < 25; x += st) { const y = f(x); GR.table.push([+x.toFixed(3), isFinite(y) ? +y.toFixed(3) : '—']); } GR.err = ''; } catch (e) { GR.err = e.message; } H.renderProps(); return; }
    if ('gplace' in d && GR.table) { const txt = 'x │ ' + GR.table.map(r => String(r[0]).padStart(5)).join(' ') + '\ny │ ' + GR.table.map(r => String(r[1]).padStart(5)).join(' '); H.checkpoint(page); H.layer(page).items.push({ t: 'text', id: H.uid('t'), x: 40, y: page.h - 110, text: 'y = ' + GR.expr + '\n' + txt, size: 20, font: 'mono', color: '#1c1b19' }); H.changed(); return; }
    if ('gpoints' in d || 'gjoin' in d) { const F = H.frame(page), pts = GR.pts.split(/\n+/).map(l => l.split(/[,;\s]+/).map(Number)).filter(a => a.length >= 2 && isFinite(a[0]) && isFinite(a[1])); if (!pts.length) { GR.err = T('Type pairs like “2, 5”.', 'اكتب أزواجاً.'); H.renderProps(); return; } GR.err = '';
      const sp = pts.map(([x, y]) => [F.ox + x * F.u, F.oy - y * F.u]); H.checkpoint(page); const L = H.layer(page); sp.forEach(q => L.items.push({ t: 'measure', k: 'point', id: H.uid('m'), pts: [q], color: '#c8341f', label: '' })); if ('gjoin' in d && sp.length > 1) L.items.push({ t: 'shape', id: H.uid('h'), k: 'poly', pts: sp, color: '#c8341f', w: 2.5 }); H.changed(); H.renderProps(); return; }
    if (d.stamp) { S.tool.stamp = d.stamp; S.tool.stampProps = d.stamp === 'incline' ? { angle: SC.angle } : {}; H.setTool('stamp'); return; }
    if (d.vec) { S.tool.label = d.vec; S.tool.color = d.vcol; S.tool.shape = 'arrow'; H.setTool('shape'); return; }
    if (d.tpl) return template(d.tpl);
    if (prevClick) prevClick(b, S, page);
  };
  const prevInput = H.onPropsInput; H.onPropsInput = (el, S, page) => { const d = el.dataset;
    if ('pcustom' in d) PR.custom = el.value; else if ('pstyle' in d) PR.style = el.value; else if ('pfont' in d) PR.font = el.value; else if ('preps' in d) { PR.reps = +el.value; el.closest('label').querySelector('output').textContent = el.value; }
    else if ('gexpr' in d) GR.expr = el.value; else if ('gfrom' in d) GR.from = el.value; else if ('gto' in d) GR.to = el.value; else if ('gstep' in d) GR.step = el.value; else if ('gpts' in d) GR.pts = el.value;
    else if ('scangle' in d) { SC.angle = +el.value; el.closest('label').querySelector('output').textContent = el.value + '°'; }
    else if (prevInput) prevInput(el, S, page); };
  H.afterProps = box => { const inp = box.querySelector('[data-gexpr]'); if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); box.querySelector('[data-gplot]').click(); } }); };
  H.practiceEnter = () => { if (!H.page().layers.some(L => L.locked)) H.toast(T('Choose what to practise on the right, then “Make practice sheet”.', 'اختر ما تتدرب عليه ثم أنشئ الورقة.')); };
  H._learn = { makeSheet, check, template, PR, GR, SC };
})();
