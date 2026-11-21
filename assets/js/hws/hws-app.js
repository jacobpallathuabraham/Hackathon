/* ERLY Handwriting Studio (v24) — the studio shell: modes, tools, properties, colours, pages, layers, notebooks,
   export/import and the save status. Modes: Write · Draw · Practise · Graph · Science · Scan · My work. */
(function () {
  'use strict';
  const H = window.HWS, T = H.T, esc = H.esc;
  const root = document.getElementById('hws'); if (!root) return;
  const toast = m => (window.ERLY && ERLY.toast ? ERLY.toast(m) : null); H.toast = toast;

  /* ---------- icons (inline, stroke-based) ---------- */
  const I = { pen: 'M4 20l4-1 11-11-3-3L5 16l-1 4z M14 6l3 3', marker: 'M6 18l3-3 6-9 3 3-9 6-3 3z M5 21h7', erase: 'M7 19h10 M5 15l8-8 6 6-6 6H9z', erasePix: 'M4 19h16 M7 16a5 5 0 0 1 10 0', select: 'M5 3l13 8-6 1-2 6z', lasso: 'M12 4c5 0 8 2 8 5s-4 5-8 5-8-2-8-5 3-5 8-5z M7 13c-1 3 0 6 3 7', text: 'M5 6V4h14v2 M12 4v16 M9 20h6', hand: 'M8 13V5a1.5 1.5 0 0 1 3 0v6 M11 11V4a1.5 1.5 0 0 1 3 0v7 M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-3 7-7 7-3 0-5-2-6-4l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 13', line: 'M5 19L19 5', arrow: 'M5 19L19 5 M10 5h9v9', darrow: 'M5 19L19 5 M5 13v6h6 M13 5h6v6', rect: 'M4 6h16v12H4z', rrect: 'M7 6h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z', ellipse: 'M12 6c4.5 0 8 2.7 8 6s-3.5 6-8 6-8-2.7-8-6 3.5-6 8-6z', tri: 'M12 4l9 16H3z', poly: 'M6 5l12 2 3 9-7 5-9-6z', curve: 'M4 18C8 4 16 4 20 18', fill: 'M5 12l7-7 7 7-7 7z M19 15c1 1.5 2 2.5 2 3.5a2 2 0 0 1-4 0c0-1 1-2 2-3.5z', pick: 'M15 4l5 5-2 2-5-5z M13 6l-8 8-1 6 6-1 8-8', image: 'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M15 9.5a1.5 1.5 0 1 0 0-.01', stamp: 'M9 4h6v6l3 3H6l3-3z M5 18h14', point: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 3v3 M12 18v3 M3 12h3 M18 12h3', angle: 'M4 20h16 M4 20L16 6 M9 20a5 5 0 0 0-1.5-4', ruler: 'M3 17L17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2', undo: 'M9 14L4 9l5-5 M4 9h11a5 5 0 0 1 0 10h-3', redo: 'M15 14l5-5-5-5 M20 9H9a5 5 0 0 0 0 10h3', fit: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5', plus: 'M12 5v14 M5 12h14', minus: 'M5 12h14', full: 'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5', more: 'M5 12h.01 M12 12h.01 M19 12h.01', layers: 'M12 4l9 5-9 5-9-5z M3 14l9 5 9-5' };
  const ico = (k, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${I[k] || I.pen}"/></svg>`;

  /* ---------- state ---------- */
  const PAL = { ink: ['#1c1b19', '#20304f', '#1f4fd1', '#0b6e99', '#c8341f', '#1d7a46', '#6b3fd1', '#7a4a1e', '#6b6b6b'], bright: ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#007aff', '#5856d6', '#af52de', '#ff2d55'], pastel: ['#f6b8b8', '#f9d7a8', '#f8efa0', '#bfe8c2', '#b5e3e8', '#b8cff7', '#cdbdf2', '#ecc0e6', '#e3d6c6'], earth: ['#5b4636', '#8c6a4f', '#c49a6c', '#556b2f', '#8f9779', '#2f4f4f', '#7d8c9a', '#b85c38', '#e2c290'] };
  const MODES = [['write', T('Write', 'اكتب')], ['draw', T('Draw', 'ارسم')], ['practise', T('Practise', 'تدرّب')], ['graph', T('Graph', 'رسوم بيانية')], ['science', T('Science', 'علوم')], ['scan', T('Scan', 'امسح')], ['work', T('My work', 'أعمالي')]];
  const TOOLS = {
    write: ['pen', 'highlight', 'eraser', 'erasePix', 'select', 'lasso', 'text', 'hand'],
    draw: ['pen', 'eraser', 'erasePix', 'shape', 'fill', 'pick', 'select', 'lasso', 'text', 'image', 'hand'],
    practise: ['pen', 'eraser', 'select', 'hand'],
    graph: ['pen', 'point', 'shape', 'ruler', 'angle', 'text', 'eraser', 'select', 'hand'],
    science: ['pen', 'stamp', 'shape', 'angle', 'ruler', 'text', 'eraser', 'select', 'lasso', 'hand'],
    scan: [], work: []
  };
  const TOOL_NAMES = { pen: ['Pen & brushes (P)', 'القلم (P)'], highlight: ['Highlighter', 'قلم التمييز'], eraser: ['Eraser — whole strokes (E)', 'ممحاة الخطوط (E)'], erasePix: ['Precise eraser — rubs out ink', 'ممحاة دقيقة'], select: ['Select, move, resize, rotate (V)', 'تحديد (V)'], lasso: ['Lasso select (L)', 'تحديد حر (L)'], text: ['Text (T)', 'نص (T)'], hand: ['Pan (H or hold Space)', 'تحريك (H)'], shape: ['Shapes & lines (S)', 'أشكال (S)'], fill: ['Fill an enclosed area (G)', 'تعبئة (G)'], pick: ['Pick a colour from the page (I)', 'التقاط لون (I)'], image: ['Insert an image', 'إدراج صورة'], stamp: ['Science components', 'مكونات علمية'], point: ['Plot a point (snaps to ½ grid)', 'نقطة'], ruler: ['Measure a length', 'قياس الطول'], angle: ['Measure an angle (3 clicks)', 'قياس زاوية'] };
  const TOOL_ICON = { pen: 'pen', highlight: 'marker', eraser: 'erase', erasePix: 'erasePix', select: 'select', lasso: 'lasso', text: 'text', hand: 'hand', shape: 'rect', fill: 'fill', pick: 'pick', image: 'image', stamp: 'stamp', point: 'point', ruler: 'ruler', angle: 'angle' };
  const P = H.prefs;
  const S = { mode: 'write', tool: { id: 'pen', brush: P.brush || 'fountain', color: (P.recent && P.recent[0]) || '#1c1b19', size: P.size || 3, opacity: 1, stab: 0, opt: {}, shape: 'arrow', fill: false, dash: false, font: 'sans', stamp: 'block', stampProps: {}, label: '' }, pageIx: 0 };
  let nb = null, cv = null; H.state = S;
  const page = () => nb.pages[S.pageIx];

  /* ---------- shell ---------- */
  root.innerHTML = `<div class="hws" data-mode="write">
    <header class="hws-top">
      <a class="hws-back" href="student.html" aria-label="${T('Back to ERLY', 'العودة إلى إيرلي')}">← ERLY</a>
      <input class="hws-title" aria-label="${T('Notebook title', 'عنوان الدفتر')}" maxlength="80">
      <span class="hws-save" role="status" aria-live="polite"></span>
      <nav class="hws-modes" role="tablist" aria-label="${T('Studio modes', 'أوضاع الاستوديو')}">${MODES.map(([k, n]) => `<button type="button" role="tab" data-mode="${k}" aria-selected="${k === 'write'}">${n}</button>`).join('')}</nav>
      <div class="hws-actions"><button type="button" class="hws-ib" data-a="undo" aria-label="${T('Undo (Ctrl+Z)', 'تراجع')}">${ico('undo')}</button><button type="button" class="hws-ib" data-a="redo" aria-label="${T('Redo (Ctrl+Shift+Z)', 'إعادة')}">${ico('redo')}</button>
        <div class="hws-menu"><button type="button" class="hws-btn" data-a="exportMenu" aria-haspopup="menu" aria-expanded="false">${T('Export', 'تصدير')} ▾</button><div class="hws-pop" role="menu" hidden>
          <button role="menuitem" data-x="png">${T('This page as PNG', 'هذه الصفحة PNG')}</button><button role="menuitem" data-x="pngT">${T('This page, transparent PNG (ink only)', 'PNG شفاف')}</button><button role="menuitem" data-x="svg">${T('This page as SVG (vector)', 'SVG متجه')}</button><button role="menuitem" data-x="pdf">${T('Whole notebook as PDF', 'الدفتر PDF')}</button><button role="menuitem" data-x="print">${T('Print', 'طباعة')}</button><button role="menuitem" data-x="json">${T('Notebook file (.erlynote)', 'ملف الدفتر')}</button><hr><button role="menuitem" data-x="importImg">${T('Import an image…', 'استيراد صورة…')}</button><button role="menuitem" data-x="importPdf">${T('Import PDF pages to annotate…', 'استيراد صفحات PDF…')}</button><button role="menuitem" data-x="importJson">${T('Open a notebook file…', 'فتح ملف دفتر…')}</button></div></div>
        <button type="button" class="hws-ib" data-a="help" aria-label="${T('Shortcuts and help', 'الاختصارات')}">?</button></div>
    </header>
    <div class="hws-consent" hidden></div>
    <div class="hws-main">
      <aside class="hws-tools" role="toolbar" aria-orientation="vertical" aria-label="${T('Tools', 'الأدوات')}"></aside>
      <div class="hws-stage"><div class="hws-canvas"></div>
        <div class="hws-zoom" role="group" aria-label="${T('Zoom', 'التكبير')}"><button type="button" class="hws-ib" data-z="out" aria-label="${T('Zoom out', 'تصغير')}">${ico('minus', 16)}</button><button type="button" class="hws-zv" data-z="100" aria-label="${T('Actual size', 'الحجم الفعلي')}">100%</button><button type="button" class="hws-ib" data-z="in" aria-label="${T('Zoom in', 'تكبير')}">${ico('plus', 16)}</button><button type="button" class="hws-ib" data-z="fit" aria-label="${T('Fit page (0)', 'ملاءمة')}">${ico('fit', 16)}</button><button type="button" class="hws-ib" data-z="full" aria-label="${T('Full screen', 'ملء الشاشة')}">${ico('full', 16)}</button></div>
        <div class="hws-panel" hidden></div></div>
      <aside class="hws-props" aria-label="${T('Tool settings', 'إعدادات الأداة')}"></aside>
    </div>
    <footer class="hws-pages" aria-label="${T('Pages', 'الصفحات')}"><div class="hws-pagelist" role="list"></div><div class="hws-pagectl"><button type="button" class="hws-btn" data-pg="add">+ ${T('Page', 'صفحة')}</button><button type="button" class="hws-btn" data-pg="dup">${T('Duplicate', 'تكرار')}</button><button type="button" class="hws-btn" data-pg="del">${T('Delete', 'حذف')}</button>
      <label class="hws-sel">${T('Paper', 'الورق')} <select data-pg="paper">${Object.entries(H.PAPERS).map(([k, v]) => `<option value="${k}">${T(...v)}</option>`).join('')}</select></label>
      <label class="hws-sel">${T('Size', 'المقاس')} <select data-pg="size"><option value="landscape">${T('Landscape', 'أفقي')}</option><option value="portrait">${T('Portrait', 'عمودي')}</option><option value="square">${T('Square', 'مربع')}</option><option value="wide">16:9</option></select></label></div></footer>
    <input type="file" hidden accept="image/*" data-file="img"><input type="file" hidden accept="application/pdf" data-file="pdf"><input type="file" hidden accept=".erlynote,application/json" data-file="json">
  </div>`;
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];

  /* ---------- tools ---------- */
  function renderTools() {
    const list = TOOLS[S.mode] || [];
    $('.hws-tools').innerHTML = list.map(k => `<button type="button" class="hws-tool" data-tool="${k}" aria-pressed="${toolKey() === k}" aria-label="${T(...TOOL_NAMES[k])}" title="${T(...TOOL_NAMES[k])}">${ico(k === 'shape' ? S.tool.shape || 'rect' : TOOL_ICON[k])}</button>`).join('') + (list.length ? `<span class="hws-tools__sep"></span><button type="button" class="hws-tool" data-a="layers" aria-label="${T('Layers', 'الطبقات')}" title="${T('Layers', 'الطبقات')}" aria-pressed="${!!S.showLayers}">${ico('layers')}</button>` : '');
  }
  const toolKey = () => (S.tool.id === 'pen' && S.tool.brush === 'highlighter' && S.mode === 'write' ? 'highlight' : S.tool.id);
  function setTool(k) {
    if (k === 'image') { $('[data-file="img"]').click(); return; }
    if (k === 'highlight') { S.tool.id = 'pen'; S.lastBrush = S.tool.brush !== 'highlighter' ? S.tool.brush : S.lastBrush; S.tool.brush = 'highlighter'; if (!/#ff|#f8|#bf|#ffcc/i.test(S.tool.color)) S.tool.color = '#ffcc00'; S.tool.size = Math.max(S.tool.size, 4); }
    else { if (k === 'pen' && S.tool.brush === 'highlighter') { S.tool.brush = S.lastBrush || 'fountain'; if (S.tool.color === '#ffcc00') S.tool.color = '#1c1b19'; } S.tool.id = k; }
    if (cv) { cv.cancel(); if (k !== 'select' && k !== 'lasso') cv.setSel([]); cv.el.dataset.tool = k; }
    renderTools(); renderProps();
  }
  $('.hws-tools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) return setTool(b.dataset.tool); if (e.target.closest('[data-a="layers"]')) { S.showLayers = !S.showLayers; renderTools(); renderProps(); } });

  /* ---------- properties ---------- */
  const sw = c => `<button type="button" class="hws-sw ${c.toLowerCase() === S.tool.color.toLowerCase() ? 'is-on' : ''}" style="--c:${c}" data-col="${c}" aria-label="${c}" aria-pressed="${c.toLowerCase() === S.tool.color.toLowerCase()}"></button>`;
  function colourBlock() { const recent = (P.recent || []).slice(0, 8), favs = P.favs || [];
    return `<section class="hws-sec"><h3>${T('Colour', 'اللون')}</h3><div class="hws-cur"><span class="hws-cur__c" style="--c:${S.tool.color}"></span><label class="hws-cust">${T('Custom', 'مخصص')} <input type="color" value="${S.tool.color}" data-colin></label><button type="button" class="hws-star" data-fav aria-pressed="${favs.includes(S.tool.color)}" aria-label="${T('Favourite this colour', 'مفضل')}">★</button></div>
      <div class="hws-paltabs" role="tablist">${Object.keys(PAL).map(k => `<button type="button" role="tab" data-pal="${k}" aria-selected="${(S.pal || 'ink') === k}">${T({ ink: 'Inks', bright: 'Bright', pastel: 'Pastel', earth: 'Earth' }[k], { ink: 'أحبار', bright: 'زاهية', pastel: 'باستيل', earth: 'ترابية' }[k])}</button>`).join('')}</div>
      <div class="hws-swatches">${PAL[S.pal || 'ink'].map(sw).join('')}</div>
      ${recent.length ? `<p class="hws-mini">${T('Recent', 'الأخيرة')}</p><div class="hws-swatches">${recent.map(sw).join('')}</div>` : ''}${favs.length ? `<p class="hws-mini">${T('Favourites', 'المفضلة')}</p><div class="hws-swatches">${favs.map(sw).join('')}</div>` : ''}</section>`; }
  const range = (k, label, min, max, step, val, fmt) => `<label class="hws-range"><span>${label}<output>${fmt ? fmt(val) : val}</output></span><input type="range" data-r="${k}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
  function brushPreview() { const c = document.createElement('canvas'); c.width = 460; c.height = 90; const g = c.getContext('2d'); g.fillStyle = H.paperBg('blank'); g.fillRect(0, 0, 460, 90); const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60; pts.push([20 + t * 420, 45 + Math.sin(t * Math.PI * 2) * 22, 0.25 + 0.75 * Math.sin(t * Math.PI), i * 14]); }
    g.scale(1, 1); H.render(g, { t: 'stroke', id: 'preview' + S.tool.brush, brush: S.tool.brush, color: S.tool.color, size: S.tool.size * 1.6, opacity: S.tool.opacity, opt: S.tool.opt, pr: true, pts }, { paper: 'blank' }, {}); return c.toDataURL(); }
  function renderProps() {
    const t = S.tool, box = $('.hws-props'); let h = '';
    if (S.showLayers) h += layersBlock();
    if (S.mode === 'scan' || S.mode === 'work') { box.innerHTML = h; box.hidden = !h; return; } box.hidden = false;
    if (t.id === 'pen') { const list = S.mode === 'write' ? ['fountain', 'ballpoint', 'fineliner', 'pencil', 'mechanical', 'calligraphy', 'technical', 'custom'] : Object.keys(H.BRUSHES);
      h += `<section class="hws-sec"><h3>${T('Brush', 'الفرشاة')}</h3><div class="hws-brushes" role="radiogroup" aria-label="${T('Brushes', 'الفراشي')}">${list.map(b => `<button type="button" role="radio" data-brush="${b}" aria-checked="${t.brush === b}">${H.brushName(b)}</button>`).join('')}</div>
        <img class="hws-preview" alt="${T('Preview of the selected brush', 'معاينة الفرشاة')}" src="${brushPreview()}">
        ${range('size', T('Size', 'الحجم'), 0.5, 24, 0.5, t.size)}${range('opacity', T('Opacity', 'الشفافية'), 0.1, 1, 0.05, t.opacity, v => Math.round(v * 100) + '%')}${range('stab', T('Steadying (adds a little lag)', 'التثبيت'), 0, 0.9, 0.1, t.stab, v => (v ? Math.round(v * 100) + '%' : T('off', 'إيقاف')))}
        ${t.brush === 'custom' ? range('press', T('Pressure response', 'استجابة الضغط'), 0, 1.6, 0.1, t.opt.press != null ? t.opt.press : 0.8) + range('taper', T('Taper (px)', 'الاستدقاق'), 0, 30, 1, t.opt.taper != null ? t.opt.taper : 6) + range('min', T('Thinnest line (×)', 'أرفع خط'), 0.05, 1, 0.05, t.opt.min != null ? t.opt.min : 0.4) : ''}
        <p class="hws-mini" data-press>${S.penSeen ? (S.realPressure ? T('Pressure: from your stylus.', 'الضغط: من قلمك.') : T('Stylus detected, but it is not reporting pressure — width follows speed.', 'القلم لا يرسل الضغط.')) : T('Pressure: simulated from your speed (mouse and finger have no pressure). A stylus with pressure is used automatically.', 'الضغط محاكى من السرعة.')}</p></section>` + colourBlock(); }
    else if (t.id === 'erasePix') h += `<section class="hws-sec"><h3>${T('Precise eraser', 'الممحاة الدقيقة')}</h3>${range('size', T('Size', 'الحجم'), 1, 20, 0.5, t.size)}<p class="hws-mini">${T('Rubs out ink on the current layer only.', 'تمحو الحبر في الطبقة الحالية فقط.')}</p></section>`;
    else if (t.id === 'eraser') h += `<section class="hws-sec"><h3>${T('Stroke eraser', 'ممحاة الخطوط')}</h3><p class="hws-mini">${T('Drag over anything to remove it whole (strokes, shapes, text, stamps).', 'اسحب لإزالة العناصر.')}</p></section>`;
    else if (t.id === 'shape') { const ks = ['line', 'arrow', 'darrow', 'rect', 'rrect', 'ellipse', 'tri', 'poly', 'curve'], kn = { line: ['Line', 'خط'], arrow: ['Arrow / vector', 'سهم'], darrow: ['Double arrow', 'سهم مزدوج'], rect: ['Rectangle', 'مستطيل'], rrect: ['Rounded rectangle', 'مستطيل مستدير'], ellipse: ['Ellipse / circle', 'قطع ناقص'], tri: ['Triangle', 'مثلث'], poly: ['Polygon', 'مضلع'], curve: ['Curve', 'منحنى'] };
      h += `<section class="hws-sec"><h3>${T('Shape', 'الشكل')}</h3><div class="hws-shapes" role="radiogroup">${ks.map(k => `<button type="button" role="radio" class="hws-ib" data-shape="${k}" aria-checked="${t.shape === k}" aria-label="${T(...kn[k])}" title="${T(...kn[k])}">${ico(k)}</button>`).join('')}</div>
        <p class="hws-mini">${t.shape === 'poly' ? T('Click each corner; click the first corner (or double-click) to close, Enter to leave it open.', 'انقر كل زاوية.') : t.shape === 'curve' ? T('Drag from start to end, then move to bend the curve and click.', 'اسحب ثم حرّك للانحناء.') : T('Drag to draw. Hold Shift for squares, circles and 45° lines.', 'اسحب للرسم. Shift للتقييد.')}</p>
        ${range('size', T('Line width', 'سمك الخط'), 0.5, 14, 0.5, t.size)}<label class="hws-check"><input type="checkbox" data-c="fill" ${t.fill ? 'checked' : ''}> ${T('Fill', 'تعبئة')}</label><label class="hws-check"><input type="checkbox" data-c="dash" ${t.dash ? 'checked' : ''}> ${T('Dashed', 'متقطع')}</label>
        ${/arrow/.test(t.shape) ? `<label class="hws-field">${T('Label (e.g. F, v, 5 N)', 'تسمية')} <input data-label value="${esc(t.label || '')}" maxlength="16"></label>` : ''}</section>` + colourBlock(); }
    else if (t.id === 'text') h += `<section class="hws-sec"><h3>${T('Text', 'النص')}</h3>${range('size', T('Size', 'الحجم'), 2, 16, 0.5, t.size)}<div class="hws-brushes" role="radiogroup">${[['sans', 'Sans'], ['serif', 'Serif'], ['hand', T('Handwritten', 'يدوي')], ['mono', 'Mono']].map(([k, n]) => `<button type="button" role="radio" data-font="${k}" aria-checked="${t.font === k}">${n}</button>`).join('')}</div><p class="hws-mini">${T('Click the page to type. Ctrl+Enter places it. Double-click text with Select to edit.', 'انقر لتكتب.')}</p></section>` + colourBlock();
    else if (t.id === 'fill' || t.id === 'pick' || t.id === 'point' || t.id === 'angle' || t.id === 'ruler') h += `<section class="hws-sec"><h3>${T(...TOOL_NAMES[t.id])}</h3>${t.id === 'fill' ? range('opacity', T('Opacity', 'الشفافية'), 0.1, 1, 0.05, t.opacity, v => Math.round(v * 100) + '%') + `<p class="hws-mini">${T('Fills the area enclosed by ink that you click inside.', 'تعبئة المنطقة المغلقة.')}</p>` : ''}${t.id === 'point' ? `<label class="hws-field">${T('Label', 'تسمية')} <input data-label value="${esc(t.label || '')}" maxlength="6"></label><p class="hws-mini">${T('Points snap to half-squares and show their coordinates on the coordinate plane (1 square = 1 unit).', 'النقاط تلتصق بنصف مربع.')}</p>` : ''}${t.id === 'ruler' ? `<p class="hws-mini">${T('Drag between two points: the length is shown in grid units (1 square = 1 unit).', 'اسحب بين نقطتين.')}</p>` : ''}${t.id === 'angle' ? `<p class="hws-mini">${T('Click a point on one arm, the vertex, then a point on the other arm.', 'انقر ذراعاً ثم الرأس ثم الذراع الآخر.')}</p>` : ''}</section>` + colourBlock();
    else if (t.id === 'stamp') h += H.sciencePanel ? H.sciencePanel(S) + colourBlock() : '';
    else if (t.id === 'select' || t.id === 'lasso') h += selBlock();
    if (S.mode === 'graph' && H.graphPanel) h = H.graphPanel(S, page()) + h;
    if (S.mode === 'science' && H.scienceTop && t.id !== 'stamp') h = H.scienceTop(S) + h;
    if (S.mode === 'practise' && H.practicePanel) h = H.practicePanel(S, page()) + h;
    box.innerHTML = h;
    if (H.afterProps) H.afterProps(box, S);
  }
  function selBlock() { const s = cv ? cv.sel() : []; if (!s.length) return `<section class="hws-sec"><h3>${T('Select', 'تحديد')}</h3><p class="hws-mini">${T('Click an item, drag a box, or use the lasso. Then drag to move, drag corners to resize, the top dot to rotate (Shift snaps 15°). Arrow keys nudge; Delete removes; Ctrl+D duplicates.', 'انقر عنصراً أو اسحب مربعاً.')}</p></section>`;
    const st = s.length === 1 && s[0].t === 'stamp' ? s[0] : null;
    return `<section class="hws-sec"><h3>${s.length} ${T('selected', 'محدد')}</h3><div class="hws-row"><button type="button" class="hws-btn" data-s="dup">${T('Duplicate', 'تكرار')}</button><button type="button" class="hws-btn" data-s="del">${T('Delete', 'حذف')}</button><button type="button" class="hws-btn" data-s="front">${T('To front', 'للأمام')}</button><button type="button" class="hws-btn" data-s="back">${T('To back', 'للخلف')}</button></div>
      <div class="hws-swatches">${PAL.ink.concat(PAL.bright.slice(0, 5)).map(c => `<button type="button" class="hws-sw" style="--c:${c}" data-recol="${c}" aria-label="${T('Recolour to', 'لوّن بـ')} ${c}"></button>`).join('')}</div>
      ${st && st.k === 'incline' ? range('sangle', T('Incline angle', 'زاوية الميل'), 5, 70, 1, (st.props && st.props.angle) || 30, v => v + '°') : ''}${st && st.k === 'block' ? `<label class="hws-field">${T('Label', 'تسمية')} <input data-slabel value="${esc((st.props && st.props.label) || '')}" maxlength="10"></label>` : ''}
      ${cv && cv.sel().length > 1 ? '' : ''}${H.layerMoveHtml ? H.layerMoveHtml() : ''}</section>`; }
  function layersBlock() { const p = page(); return `<section class="hws-sec"><h3>${T('Layers', 'الطبقات')}</h3><ol class="hws-layers">${p.layers.slice().reverse().map(L => `<li class="${L.id === p.active ? 'is-on' : ''}"><button type="button" class="hws-ib" data-l-vis="${L.id}" aria-pressed="${L.visible}" aria-label="${T('Show or hide', 'إظهار/إخفاء')} ${esc(L.name)}">${L.visible ? '👁' : '—'}</button><button type="button" class="hws-lname" data-l-act="${L.id}" aria-pressed="${L.id === p.active}">${esc(L.name)}${L.locked ? ' 🔒' : ''}</button><button type="button" class="hws-ib" data-l-up="${L.id}" aria-label="${T('Move up', 'لأعلى')}">↑</button><button type="button" class="hws-ib" data-l-down="${L.id}" aria-label="${T('Move down', 'لأسفل')}">↓</button></li>`).join('')}</ol><div class="hws-row"><button type="button" class="hws-btn" data-l="add">+ ${T('Layer', 'طبقة')}</button><button type="button" class="hws-btn" data-l="ren">${T('Rename', 'إعادة تسمية')}</button><button type="button" class="hws-btn" data-l="del">${T('Delete', 'حذف')}</button></div><p class="hws-mini">${T('Tools draw on the highlighted layer.', 'الأدوات ترسم على الطبقة المحددة.')}</p></section>`; }

  const pushRecent = c => { P.recent = [c].concat((P.recent || []).filter(x => x !== c)).slice(0, 8); H.savePrefs(); };
  $('.hws-props').addEventListener('click', e => {
    const t = S.tool, b = e.target.closest('button'); if (!b) return;
    if (b.dataset.brush) { t.brush = b.dataset.brush; P.brush = t.brush; H.savePrefs(); renderProps(); return; }
    if (b.dataset.col) { t.color = b.dataset.col; pushRecent(t.color); renderProps(); return; }
    if (b.dataset.pal) { S.pal = b.dataset.pal; renderProps(); return; }
    if ('fav' in b.dataset) { const f = P.favs || (P.favs = []); const i = f.indexOf(t.color); if (i >= 0) f.splice(i, 1); else f.unshift(t.color); P.favs = f.slice(0, 12); H.savePrefs(); renderProps(); return; }
    if (b.dataset.shape) { t.shape = b.dataset.shape; renderTools(); renderProps(); return; }
    if (b.dataset.font) { t.font = b.dataset.font; renderProps(); return; }
    if (b.dataset.s) { if (b.dataset.s === 'dup') cv.dupSel(); if (b.dataset.s === 'del') cv.deleteSel(); if (b.dataset.s === 'front') cv.order(1); if (b.dataset.s === 'back') cv.order(-1); renderProps(); return; }
    if (b.dataset.recol) { const c = b.dataset.recol; cv.updateSel(it => Object.assign({}, it, it.t === 'image' ? {} : { color: c })); return; }
    const p = page();
    if (b.dataset.lVis) { const L = p.layers.find(l => l.id === b.dataset.lVis); H.checkpoint(p); L.visible = !L.visible; changed(); renderProps(); return; }
    if (b.dataset.lAct) { p.active = b.dataset.lAct; renderProps(); return; }
    if (b.dataset.lUp || b.dataset.lDown) { const id = b.dataset.lUp || b.dataset.lDown, i = p.layers.findIndex(l => l.id === id), j = i + (b.dataset.lUp ? 1 : -1); if (j < 0 || j >= p.layers.length) return; H.checkpoint(p); [p.layers[i], p.layers[j]] = [p.layers[j], p.layers[i]]; changed(); renderProps(); return; }
    if (b.dataset.l === 'add') { H.checkpoint(p); const L = { id: H.uid('l'), name: T('Layer', 'طبقة') + ' ' + (p.layers.length + 1), visible: true, items: [] }; p.layers.push(L); p.active = L.id; changed(); renderProps(); return; }
    if (b.dataset.l === 'ren') { const L = H.layer(p), n = prompt(T('Layer name', 'اسم الطبقة'), L.name); if (n) { L.name = n.slice(0, 30); changed(); renderProps(); } return; }
    if (b.dataset.l === 'del') { if (p.layers.length < 2) return toast(T('A page needs at least one layer.', 'تحتاج الصفحة طبقة واحدة على الأقل.')); const L = H.layer(p); if (L.items.length && !confirm(T(`Delete “${L.name}” and its ${L.items.length} item(s)?`, 'حذف الطبقة؟'))) return; H.checkpoint(p); p.layers = p.layers.filter(l => l !== L); p.active = p.layers[p.layers.length - 1].id; changed(); renderProps(); return; }
    if (H.onPropsClick) H.onPropsClick(b, S, page());
  });
  $('.hws-props').addEventListener('input', e => {
    const t = S.tool, el = e.target;
    if (el.dataset.r) { const v = +el.value, k = el.dataset.r; el.closest('label').querySelector('output').textContent = k === 'opacity' ? Math.round(v * 100) + '%' : k === 'stab' ? (v ? Math.round(v * 100) + '%' : T('off', 'إيقاف')) : k === 'sangle' ? v + '°' : v;
      if (k === 'size' || k === 'opacity' || k === 'stab') { t[k] = v; if (k === 'size') { P.size = v; H.savePrefs(); } } else if (k === 'press' || k === 'taper' || k === 'min') t.opt[k] = v; else if (k === 'sangle') { cv.updateSel(it => Object.assign({}, it, { props: Object.assign({}, it.props, { angle: v }) })); return; }
      const img = $('.hws-preview'); if (img) img.src = brushPreview(); return; }
    if ('colin' in el.dataset) { t.color = el.value; $('.hws-cur__c').style.setProperty('--c', t.color); const img = $('.hws-preview'); if (img) img.src = brushPreview(); return; }
    if ('label' in el.dataset) { t.label = el.value; return; }
    if ('slabel' in el.dataset) { cv.updateSel(it => Object.assign({}, it, { props: Object.assign({}, it.props, { label: el.value }) })); return; }
    if (el.dataset.c) { t[el.dataset.c] = el.checked; return; }
    if (H.onPropsInput) H.onPropsInput(el, S, page());
  });
  $('.hws-props').addEventListener('change', e => { if ('colin' in e.target.dataset) { pushRecent(S.tool.color); renderProps(); } });

  /* ---------- pages ---------- */
  function thumb(p, w = 150) { const c = document.createElement('canvas'), s = w / p.w; c.width = w; c.height = Math.round(p.h * s); H.renderPage(c.getContext('2d'), p, s, {}); return c.toDataURL('image/png'); }
  H.thumb = thumb;
  function renderPages() { $('.hws-pagelist').innerHTML = nb.pages.map((p, i) => `<div role="listitem" class="hws-pg ${i === S.pageIx ? 'is-on' : ''}" draggable="true" data-pi="${i}"><button type="button" class="hws-pg__b" data-go="${i}" aria-current="${i === S.pageIx ? 'page' : 'false'}" aria-label="${T('Page', 'صفحة')} ${i + 1}${p.name ? ': ' + esc(p.name) : ''}"><img alt="" src="${thumb(p, 110)}"></button><span class="hws-pg__n" data-ren="${i}" title="${T('Double-click to rename', 'انقر مرتين لإعادة التسمية')}">${i + 1}${p.name ? ' · ' + esc(p.name) : ''}</span></div>`).join('');
    const pp = page(); $('[data-pg="paper"]').value = pp.paper; $('[data-pg="size"]').value = pp.size || 'landscape'; }
  let thumbT = 0; const refreshThumb = () => { clearTimeout(thumbT); thumbT = setTimeout(() => { const el = $(`.hws-pg[data-pi="${S.pageIx}"] img`); if (el) el.src = thumb(page(), 110); }, 400); };
  function goPage(i) { S.pageIx = H.clamp(i, 0, nb.pages.length - 1); if (cv) { cv.setSel([]); cv.fit(); cv.render(); } renderPages(); renderProps(); H.emit('page', page()); }
  $('.hws-pagelist').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) goPage(+b.dataset.go); });
  $('.hws-pagelist').addEventListener('dblclick', e => { const b = e.target.closest('[data-ren]'); if (!b) return; const p = nb.pages[+b.dataset.ren], n = prompt(T('Page name', 'اسم الصفحة'), p.name || ''); if (n != null) { p.name = n.slice(0, 40); dirty(); renderPages(); } });
  let dragPi = null; $('.hws-pagelist').addEventListener('dragstart', e => { dragPi = +e.target.closest('[data-pi]').dataset.pi; }); $('.hws-pagelist').addEventListener('dragover', e => e.preventDefault());
  $('.hws-pagelist').addEventListener('drop', e => { e.preventDefault(); const t = e.target.closest('[data-pi]'); if (!t || dragPi == null) return; const j = +t.dataset.pi, [m] = nb.pages.splice(dragPi, 1); nb.pages.splice(j, 0, m); S.pageIx = j; dragPi = null; dirty(); renderPages(); });
  $('.hws-pagectl').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (!b) return; const k = b.dataset.pg;
    if (k === 'add') { nb.pages.splice(S.pageIx + 1, 0, H.newPage(page().paper, page().size)); dirty(); goPage(S.pageIx + 1); }
    if (k === 'dup') { const c = JSON.parse(JSON.stringify(page())); c.id = H.uid('p'); c.name = (c.name || T('Page', 'صفحة') + ' ' + (S.pageIx + 1)) + ' ' + T('(copy)', '(نسخة)'); nb.pages.splice(S.pageIx + 1, 0, c); dirty(); goPage(S.pageIx + 1); }
    if (k === 'del') { if (nb.pages.length < 2) { if (!confirm(T('Clear everything on this only page?', 'مسح كل شيء في هذه الصفحة؟'))) return; H.checkpoint(page()); page().layers.forEach(L => { L.items = []; }); changed(); return; } const n = H.allItems(page()).length; if (n && !confirm(T(`Delete page ${S.pageIx + 1} and its ${n} item(s)?`, 'حذف الصفحة؟'))) return; nb.pages.splice(S.pageIx, 1); dirty(); goPage(Math.min(S.pageIx, nb.pages.length - 1)); } });
  $('.hws-pagectl').addEventListener('change', e => { const k = e.target.dataset.pg, p = page(); if (k === 'paper') { H.checkpoint(p); p.paper = e.target.value; changed(); } if (k === 'size') { const [w, h] = H.SIZES[e.target.value]; p.size = e.target.value; p.w = w; p.h = h; cv.fit(); changed(); } });

  /* ---------- modes ---------- */
  function setMode(m) { S.mode = m; root.querySelector('.hws').dataset.mode = m; $$('[data-mode]').forEach(b => b.getAttribute('role') === 'tab' && b.setAttribute('aria-selected', String(b.dataset.mode === m)));
    const panel = $('.hws-panel'); panel.hidden = true; panel.innerHTML = '';
    if (m === 'graph' && !/graph|coord/.test(page().paper)) { H.checkpoint(page()); page().paper = 'coord'; changed(); renderPages(); }
    if (m === 'science' && page().paper === 'ruled') { H.checkpoint(page()); page().paper = 'grid'; changed(); renderPages(); }
    const first = (TOOLS[m] || [])[0]; if (first && !(TOOLS[m] || []).includes(toolKey())) setTool(first); else { renderTools(); renderProps(); }
    if (m === 'scan' && H.scanPanel) H.scanPanel(panel); if (m === 'work') work(panel); if (m === 'practise' && H.practiceEnter) H.practiceEnter();
    H.emit('mode', m); }
  $('.hws-modes').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
  $('.hws-modes').addEventListener('keydown', e => { const tabs = $$('.hws-modes [role=tab]'), i = tabs.indexOf(e.target); if (i < 0 || !/Arrow(Left|Right)/.test(e.key)) return; const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); n.click(); });
  H.setMode = setMode; H.goPage = goPage; H.setTool = setTool;

  /* ---------- notebook lifecycle ---------- */
  function dirty() { H.dirty(nb); }
  function changed() { if (cv) cv.render(); dirty(); refreshThumb(); syncUndo(); }
  H.changed = changed; H.renderProps = renderProps; H.renderPages = renderPages;
  function syncUndo() { $('[data-a="undo"]').disabled = !H.canUndo(page()); $('[data-a="redo"]').disabled = !H.canRedo(page()); }
  function load(n) { nb = n; H.nb = nb; S.pageIx = 0; $('.hws-title').value = nb.title; if (cv) cv.destroy(); mountCanvas(); renderPages(); renderProps(); syncUndo(); H.emit('load', nb); }
  H.load = load; H.page = page;
  $('.hws-title').addEventListener('input', e => { nb.title = e.target.value || T('Untitled notebook', 'دفتر بلا عنوان'); dirty(); });
  function mountCanvas() {
    cv = H.Canvas($('.hws-canvas'), {
      page, tool: () => S.tool, toast,
      onChange() { changed(); renderProps(); }, onSelect() { if (S.tool.id === 'select' || S.tool.id === 'lasso') renderProps(); },
      onView(z) { $('.hws-zv').textContent = Math.round(z * 100) + '%'; },
      onPick(c) { S.tool.color = c; pushRecent(c); setTool(S.prevTool || 'pen'); toast(T('Colour picked', 'تم التقاط اللون') + ' ' + c); },
      onStamp() { setTool('select'); },
      onInk() { if (!S.penSeen && navigator.maxTouchPoints >= 0) { /* pressure line refreshed lazily */ } },
      overlay: (g, z) => { if (H.overlay) H.overlay(g, z, page()); },
      onKey: e => shortcut(e)
    });
    H.cv = cv; cv.el.addEventListener('pointerdown', e => { if (e.pointerType === 'pen' && !S.penSeen) { S.penSeen = true; renderProps(); } if (e.pointerType === 'pen' && e.pressure > 0 && e.pressure !== 0.5 && !S.realPressure) { S.realPressure = true; renderProps(); } }, true);
  }
  function shortcut(e) { const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === 'z') { (e.shiftKey ? doRedo : doUndo)(); return true; } if (mod && k === 'y') { doRedo(); return true; }
    if (mod) return false;
    const map = { p: 'pen', e: 'eraser', v: 'select', l: 'lasso', t: 'text', h: 'hand', s: 'shape', g: 'fill', i: 'pick' }; if (map[k] && (TOOLS[S.mode] || []).includes(map[k])) { if (map[k] === 'pick') S.prevTool = S.tool.id; setTool(map[k]); return true; }
    if (k === '+' || k === '=') { cv.zoomAt(1.2); return true; } if (k === '-') { cv.zoomAt(1 / 1.2); return true; } if (k === '0') { cv.fit(); return true; } if (k === '1') { cv.actual(); return true; }
    if (k === '[') { S.tool.size = Math.max(0.5, S.tool.size - 0.5); renderProps(); return true; } if (k === ']') { S.tool.size = Math.min(24, S.tool.size + 0.5); renderProps(); return true; }
    if (k === '?') { help(); return true; } return false; }
  const doUndo = () => { if (H.undo(page())) { cv.setSel([]); changed(); renderProps(); } }, doRedo = () => { if (H.redo(page())) { cv.setSel([]); changed(); renderProps(); } };
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && /^[zy]$/i.test(e.key) && !/input|textarea/i.test(e.target.tagName) && e.target !== (cv && cv.el)) { e.preventDefault(); shortcut(e); } });
  $('.hws-actions').addEventListener('click', e => { const b = e.target.closest('[data-a],[data-x]'); if (!b) return;
    if (b.dataset.a === 'undo') doUndo(); if (b.dataset.a === 'redo') doRedo(); if (b.dataset.a === 'help') help();
    if (b.dataset.a === 'exportMenu') { const pop = b.nextElementSibling, open = pop.hidden; pop.hidden = !open; b.setAttribute('aria-expanded', String(open)); if (open) pop.querySelector('button').focus(); return; }
    if (b.dataset.x) { $('.hws-pop').hidden = true; $('[data-a="exportMenu"]').setAttribute('aria-expanded', 'false'); doExport(b.dataset.x); } });
  document.addEventListener('click', e => { if (!e.target.closest('.hws-menu')) { const p = $('.hws-pop'); if (p) p.hidden = true; } });
  $('.hws-zoom').addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (!b) return; const z = b.dataset.z; if (z === 'in') cv.zoomAt(1.25); if (z === 'out') cv.zoomAt(0.8); if (z === 'fit') cv.fit(); if (z === '100') cv.actual(); if (z === 'full') { const el = root.querySelector('.hws'); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast(T('Full screen is not available here.', 'ملء الشاشة غير متاح.'))); } });
  document.addEventListener('fullscreenchange', () => setTimeout(() => cv && cv.fit(), 120));

  /* ---------- export / import ---------- */
  const download = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  const fname = ext => (nb.title || 'erly-notebook').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + ext;
  function pagePNG(p, scale = 2, transparent = false) { const c = document.createElement('canvas'); c.width = Math.round(p.w * scale); c.height = Math.round(p.h * scale); H.renderPage(c.getContext('2d'), p, scale, { noPaper: transparent }); return c; }
  H.pagePNG = pagePNG;
  function svgOf(p) { const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${p.w}" height="${p.h}" viewBox="0 0 ${p.w} ${p.h}">`, `<rect width="100%" height="100%" fill="${H.paperBg(p.paper)}"/>`];
    const pts = a => a.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
    p.layers.filter(L => L.visible).forEach(L => { parts.push(`<g data-layer="${esc(L.name)}">`); L.items.forEach(it => {
      if (it.t === 'stroke') { const b = H.BRUSHES[it.brush] || {}, w = it.size * (b.w || 1), op = (it.opacity == null ? 1 : it.opacity) * (b.alpha || 1); parts.push(`<polyline points="${pts(H.resample(it.pts, 2))}" fill="none" stroke="${it.color}" stroke-opacity="${op.toFixed(2)}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"${b.blend ? ' style="mix-blend-mode:multiply"' : ''}/>`); }
      else if (it.t === 'shape') { const d = it.dash ? ` stroke-dasharray="${it.w * 3} ${it.w * 2.4}"` : '', f = it.fill ? `fill="${it.fill}" fill-opacity="${it.fillA || 0.25}"` : 'fill="none"', s = `stroke="${it.color}" stroke-width="${it.w}" stroke-linecap="round" stroke-linejoin="round"${d}`, q = it.pts;
        if (it.k === 'rect' || it.k === 'rrect') parts.push(`<rect x="${Math.min(q[0][0], q[1][0])}" y="${Math.min(q[0][1], q[1][1])}" width="${Math.abs(q[1][0] - q[0][0])}" height="${Math.abs(q[1][1] - q[0][1])}" rx="${it.k === 'rrect' ? 14 : 0}" ${f} ${s}/>`);
        else if (it.k === 'ellipse') parts.push(`<ellipse cx="${(q[0][0] + q[1][0]) / 2}" cy="${(q[0][1] + q[1][1]) / 2}" rx="${Math.abs(q[1][0] - q[0][0]) / 2}" ry="${Math.abs(q[1][1] - q[0][1]) / 2}" ${f} ${s}/>`);
        else if (it.k === 'curve') parts.push(`<path d="M${q[0][0]},${q[0][1]} Q${q[2][0]},${q[2][1]} ${q[1][0]},${q[1][1]}" fill="none" ${s}/>`);
        else if (it.k === 'tri') { const x0 = Math.min(q[0][0], q[1][0]), x1 = Math.max(q[0][0], q[1][0]), y0 = Math.min(q[0][1], q[1][1]), y1 = Math.max(q[0][1], q[1][1]); parts.push(`<polygon points="${(x0 + x1) / 2},${y0} ${x1},${y1} ${x0},${y1}" ${f} ${s}/>`); }
        else if (it.k === 'poly') parts.push(`<${it.closed ? 'polygon' : 'polyline'} points="${pts(q)}" ${f} ${s}/>`);
        else { parts.push(`<line x1="${q[0][0]}" y1="${q[0][1]}" x2="${q[1][0]}" y2="${q[1][1]}" ${s}/>`); if (it.k !== 'line') { const a = Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]), hs = 8 + it.w * 2.4, tip = (x, y, aa) => `<polygon points="${x},${y} ${x - hs * Math.cos(aa - 0.4)},${y - hs * Math.sin(aa - 0.4)} ${x - hs * Math.cos(aa + 0.4)},${y - hs * Math.sin(aa + 0.4)}" fill="${it.color}"/>`; parts.push(tip(q[1][0], q[1][1], a)); if (it.k === 'darrow') parts.push(tip(q[0][0], q[0][1], a + Math.PI)); } if (it.label) parts.push(`<text x="${(q[0][0] + q[1][0]) / 2}" y="${(q[0][1] + q[1][1]) / 2 - 14}" font-family="Georgia,serif" font-style="italic" font-size="20" fill="${it.color}" text-anchor="middle">${esc(it.label)}</text>`); } }
      else if (it.t === 'text') String(it.text).split('\n').forEach((ln, i) => parts.push(`<text x="${it.x}" y="${it.y + it.size * (0.85 + i * 1.25)}" font-size="${it.size}" font-family="${it.font === 'serif' ? 'Georgia,serif' : it.font === 'mono' ? 'monospace' : 'system-ui,sans-serif'}" fill="${it.color}">${esc(ln)}</text>`));
      else if (it.t === 'image') parts.push(`<image href="${it.src}" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"/>`);
      else { const c = document.createElement('canvas'), [a, b2, cc, d] = H.bbox(it, p), w = Math.max(2, Math.ceil(cc - a) + 8), h = Math.max(2, Math.ceil(d - b2) + 8); c.width = w; c.height = h; const g = c.getContext('2d'); g.translate(-a + 4, -b2 + 4); H.render(g, it, p, {}); parts.push(`<image href="${c.toDataURL()}" x="${a - 4}" y="${b2 - 4}" width="${w}" height="${h}"/>`); } }); parts.push('</g>'); });
    parts.push('</svg>'); return parts.join('\n'); }
  H.svgOf = svgOf;
  async function doExport(k) {
    const p = page();
    if (k === 'png' || k === 'pngT') return pagePNG(p, 2, k === 'pngT').toBlob(b => download(URL.createObjectURL(b), fname(`-p${S.pageIx + 1}.png`)));
    if (k === 'svg') return download(URL.createObjectURL(new Blob([svgOf(p)], { type: 'image/svg+xml' })), fname(`-p${S.pageIx + 1}.svg`));
    if (k === 'json') return download(URL.createObjectURL(new Blob([JSON.stringify({ erly: 'notebook', v: 1, nb })], { type: 'application/json' })), fname('.erlynote'));
    if (k === 'pdf') { toast(T('Preparing PDF…', 'جارٍ تجهيز PDF…')); try { await loadScript('assets/vendor/jspdf.umd.min.js'); const { jsPDF } = window.jspdf; let doc = null;
        nb.pages.forEach((pg, i) => { const o = pg.w > pg.h ? 'l' : 'p'; if (!doc) doc = new jsPDF({ orientation: o, unit: 'px', format: [pg.w, pg.h], hotfixes: ['px_scaling'] }); else doc.addPage([pg.w, pg.h], o); doc.addImage(pagePNG(pg, 1.5).toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pg.w, pg.h); });
        doc.save(fname('.pdf')); } catch (err) { toast(T('Could not make the PDF here.', 'تعذر إنشاء PDF.')); } return; }
    if (k === 'print') { const w = window.open('', '_blank'); if (!w) return toast(T('Allow pop-ups to print.', 'اسمح بالنوافذ المنبثقة للطباعة.')); w.document.write(`<!doctype html><title>${esc(nb.title)}</title><style>@page{margin:10mm}body{margin:0}img{width:100%;page-break-after:always;display:block}</style>${nb.pages.map(pg => `<img src="${pagePNG(pg, 1.5).toDataURL('image/png')}">`).join('')}<script>onload=()=>{print()}<\/script>`); w.document.close(); return; }
    if (k === 'importImg') return $('[data-file="img"]').click(); if (k === 'importPdf') return $('[data-file="pdf"]').click(); if (k === 'importJson') return $('[data-file="json"]').click();
  }
  H.doExport = doExport;
  const loadScript = src => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  H.addImage = (src, w0, h0) => { const p = page(), k = Math.min(p.w * 0.6 / w0, p.h * 0.6 / h0, 1), w = w0 * k, h = h0 * k; const it = { t: 'image', id: H.uid('i'), x: (p.w - w) / 2, y: (p.h - h) / 2, w, h, src }; H.checkpoint(p); H.layer(p).items.push(it); changed(); setTool('select'); cv.setSel([it.id]); };
  function shrink(img, max = 2000) { const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL(/png/i.test(img.src.slice(0, 30)) ? 'image/png' : 'image/jpeg', 0.9); }
  root.addEventListener('change', async e => { const f = e.target.files && e.target.files[0], kind = e.target.dataset.file; if (!f || !kind) return; e.target.value = '';
    if (kind === 'img') { const url = URL.createObjectURL(f), im = new Image(); im.onload = () => { H.addImage(shrink(im), im.naturalWidth, im.naturalHeight); URL.revokeObjectURL(url); }; im.src = url; }
    if (kind === 'json') { try { const j = JSON.parse(await f.text()); if (j.erly !== 'notebook' || !j.nb || !Array.isArray(j.nb.pages)) throw new Error('bad'); j.nb.id = H.uid('n'); load(j.nb); dirty(); toast(T('Notebook opened.', 'تم فتح الدفتر.')); } catch (err) { toast(T('That file is not an ERLY notebook.', 'هذا ليس ملف دفتر.')); } }
    if (kind === 'pdf') { toast(T('Reading the PDF on this device…', 'قراءة PDF على هذا الجهاز…')); try { await loadScript('assets/vendor/pdf.min.js'); const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js'; const pdf = await lib.getDocument({ data: await f.arrayBuffer() }).promise, n = Math.min(pdf.numPages, 30);
        for (let i = 1; i <= n; i++) { const pg = await pdf.getPage(i), vpp = pg.getViewport({ scale: 1 }), size = vpp.width > vpp.height ? 'landscape' : 'portrait', np = H.newPage('blank', size), sc = Math.min(np.w / vpp.width, np.h / vpp.height), v2 = pg.getViewport({ scale: sc * 1.5 }), c = document.createElement('canvas'); c.width = v2.width; c.height = v2.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: v2 }).promise;
          np.name = f.name.replace(/\.pdf$/i, '') + ' · ' + i; np.layers[0].name = T('PDF page', 'صفحة PDF'); np.layers[0].locked = true; np.layers[0].items.push({ t: 'image', id: H.uid('i'), x: (np.w - vpp.width * sc) / 2, y: (np.h - vpp.height * sc) / 2, w: vpp.width * sc, h: vpp.height * sc, src: c.toDataURL('image/jpeg', 0.88) }); const ink = { id: H.uid('l'), name: T('Annotations', 'تعليقات'), visible: true, items: [] }; np.layers.push(ink); np.active = ink.id; nb.pages.push(np); }
        dirty(); renderPages(); goPage(nb.pages.length - n); toast(T(`${n} PDF page(s) added — write on the “Annotations” layer.`, 'أضيفت صفحات PDF.')); } catch (err) { toast(T('Could not read that PDF.', 'تعذرت قراءة PDF.')); } }
  });
  // paste images
  addEventListener('paste', e => { if (/input|textarea/i.test((e.target || {}).tagName || '')) return; const f = [...(e.clipboardData || {}).items || []].find(i => i.type.startsWith('image/')); if (!f) return; const url = URL.createObjectURL(f.getAsFile()), im = new Image(); im.onload = () => H.addImage(shrink(im), im.naturalWidth, im.naturalHeight); im.src = url; });

  /* ---------- save status and consent ---------- */
  function saveLabel(st) { const el = $('.hws-save'); el.dataset.s = st;
    el.textContent = st === 'saving' ? T('Saving…', 'جارٍ الحفظ…') : st === 'saved' ? T('Saved on this device', 'محفوظ على هذا الجهاز') : st === 'pending' ? T('Unsaved changes…', 'تغييرات غير محفوظة…') : st === 'error' ? T('Could not save — export to keep your work', 'تعذر الحفظ — صدّر عملك') : st === 'memory' ? T('Not saved — this visit only', 'غير محفوظ — هذه الزيارة فقط') : T('Not saved yet', 'لم يُحفظ بعد'); }
  H.on('save', saveLabel);
  function consent() { const c = $('.hws-consent'); if (P.consent) { c.hidden = true; return; } c.hidden = false;
    c.innerHTML = `<p><b>${T('Keep your notebooks?', 'هل تريد الاحتفاظ بدفاترك؟')}</b> ${T('They can be saved in this browser (IndexedDB) and autosaved as you work — or kept only until you close the tab. Nothing is ever uploaded.', 'يمكن حفظها في هذا المتصفح أو لهذه الزيارة فقط. لا يُرفع شيء.')}</p><div class="hws-row"><button type="button" class="hws-btn hws-btn--accent" data-consent="device">${T('Save on this device', 'احفظ على هذا الجهاز')}</button><button type="button" class="hws-btn" data-consent="memory">${T('Just this visit', 'هذه الزيارة فقط')}</button></div>`; }
  $('.hws-consent').addEventListener('click', e => { const b = e.target.closest('[data-consent]'); if (!b) return; P.consent = b.dataset.consent; if (P.consent === 'device') { H.savePrefs(); H.flush(nb); } else saveLabel('memory'); consent(); });

  /* ---------- My work ---------- */
  async function work(panel) {
    panel.hidden = false; const enabled = H.store.enabled();
    let list = []; try { if (enabled) list = await H.store.list(); } catch (e) { list = []; }
    const est = enabled ? await H.store.estimate().catch(() => null) : null;
    const TPL = [['ruled', 'landscape', T('Lined notebook', 'دفتر مسطر')], ['coord', 'landscape', T('Maths workbook', 'دفتر رياضيات')], ['grid', 'landscape', T('Science notebook', 'دفتر علوم')], ['guide', 'landscape', T('Handwriting practice', 'تدريب الكتابة')], ['blank', 'square', T('Sketchbook', 'دفتر رسم')], ['music', 'portrait', T('Music manuscript', 'مدونة موسيقية')], ['cornell', 'portrait', T('Cornell notes', 'ملاحظات كورنيل')], ['chalk', 'wide', T('Chalkboard', 'سبورة')]];
    panel.innerHTML = `<div class="hws-work"><div class="hws-work__h"><h2>${T('My work', 'أعمالي')}</h2><button type="button" class="hws-btn" data-w="close">${T('Back to the page', 'العودة إلى الصفحة')}</button></div>
      <h3>${T('Start something new', 'ابدأ شيئاً جديداً')}</h3><div class="hws-tpl">${TPL.map(([pp, sz, n], i) => `<button type="button" class="hws-tplc" data-new="${i}"><img alt="" src="${thumb(Object.assign(H.newPage(pp, sz), {}), 150)}"><span>${n}</span></button>`).join('')}</div>
      <h3>${T('Your notebooks', 'دفاترك')}</h3>${enabled ? (list.length ? `<ul class="hws-nbs">${list.map(n => `<li><button type="button" class="hws-nb" data-open="${n.id}"><img alt="" src="${n.pages[0] ? thumb(n.pages[0], 160) : ''}"><b>${esc(n.title)}</b><small>${n.pages.length} ${T('page(s)', 'صفحة')} · ${new Date(n.updated).toLocaleString()}</small></button><div class="hws-row"><button type="button" class="hws-btn" data-dup="${n.id}">${T('Duplicate', 'تكرار')}</button><button type="button" class="hws-btn" data-delnb="${n.id}">${T('Delete', 'حذف')}</button></div></li>`).join('')}</ul>` : `<p class="hws-mini">${T('No saved notebooks yet.', 'لا دفاتر محفوظة بعد.')}</p>`) : `<p class="hws-mini">${T('Notebooks are not being saved (you chose “just this visit”, or have not chosen yet). Use Export to keep your work, or', 'الدفاتر لا تُحفظ. استخدم التصدير أو')} <button type="button" class="hws-link" data-w="enable">${T('save on this device', 'احفظ على هذا الجهاز')}</button>.</p>`}
      <h3>${T('Your data', 'بياناتك')}</h3><p class="hws-mini">${enabled ? T('Saved only in this browser’s storage (IndexedDB). Clearing site data or using another browser loses it — export anything important.', 'محفوظ في هذا المتصفح فقط.') + (est && est.usage != null ? ' ' + T(`This site is using about ${(est.usage / 1048576).toFixed(1)} MB${est.quota ? ` of ${(est.quota / 1048576 / 1024).toFixed(1)} GB available` : ''}.`, '') : '') : ''}</p>${enabled ? `<button type="button" class="hws-btn" data-w="wipe">${T('Delete all saved notebooks', 'احذف كل الدفاتر')}</button>` : ''}</div>`;
    panel.onclick = async e => { const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.w === 'close') { panel.hidden = true; setMode('write'); }
      if (b.dataset.w === 'enable') { P.consent = 'device'; H.savePrefs(); await H.flush(nb); consent(); work(panel); }
      if (b.dataset.w === 'wipe') { if (!confirm(T('Delete every saved notebook on this device? This cannot be undone.', 'حذف كل الدفاتر؟'))) return; await H.store.clearAll(); toast(T('All saved notebooks deleted.', 'حُذفت الدفاتر.')); work(panel); }
      if (b.dataset.new) { const [pp, sz, n] = TPL[+b.dataset.new]; await H.flush(nb); const fresh = H.newNotebook(n, pp, sz); load(fresh); dirty(); panel.hidden = true; setMode(pp === 'guide' ? 'practise' : pp === 'coord' ? 'graph' : pp === 'grid' ? 'science' : pp === 'blank' || pp === 'chalk' ? 'draw' : 'write'); }
      if (b.dataset.open) { await H.flush(nb); const n = await H.store.get(b.dataset.open); if (n) { load(n); panel.hidden = true; setMode('write'); H.saveState = 'saved'; saveLabel('saved'); } }
      if (b.dataset.dup) { const n = await H.store.get(b.dataset.dup); if (n) { n.id = H.uid('n'); n.title += ' ' + T('(copy)', '(نسخة)'); n.updated = Date.now(); await H.store.put(n); work(panel); } }
      if (b.dataset.delnb) { if (!confirm(T('Delete this notebook from this device?', 'حذف هذا الدفتر؟'))) return; await H.store.del(b.dataset.delnb); if (b.dataset.delnb === nb.id) load(H.newNotebook()); work(panel); } };
  }
  function help() { const panel = $('.hws-panel'); panel.hidden = false; panel.innerHTML = `<div class="hws-work"><div class="hws-work__h"><h2>${T('Shortcuts', 'الاختصارات')}</h2><button type="button" class="hws-btn" data-hclose>${T('Close', 'إغلاق')}</button></div><table class="hws-keys">${[['P', T('Pen', 'قلم')], ['E', T('Stroke eraser', 'ممحاة')], ['V / L', T('Select / Lasso', 'تحديد')], ['T', T('Text', 'نص')], ['S', T('Shapes', 'أشكال')], ['G', T('Fill', 'تعبئة')], ['I', T('Pick colour', 'التقاط لون')], ['H or hold Space', T('Pan', 'تحريك')], ['[ and ]', T('Smaller / larger', 'أصغر/أكبر')], ['Ctrl+Z / Ctrl+Shift+Z', T('Undo / redo', 'تراجع/إعادة')], ['+ − 0 1', T('Zoom in, out, fit page, actual size', 'التكبير')], ['Ctrl + scroll / pinch', T('Zoom at the pointer', 'تكبير')], ['Delete · Ctrl+D · arrows', T('Delete, duplicate, nudge the selection', 'حذف/تكرار/تحريك')], ['Ctrl+V', T('Paste an image', 'لصق صورة')]].map(([k, v]) => `<tr><th><kbd>${k}</kbd></th><td>${v}</td></tr>`).join('')}</table><p class="hws-mini">${T('With a stylus, touch is used only for panning and pinching, so your palm never draws.', 'مع القلم، اللمس للتحريك فقط.')}</p></div>`; panel.onclick = e => { if (e.target.closest('[data-hclose]')) panel.hidden = true; }; }

  /* ---------- start ---------- */
  async function start() {
    let n = null; const q = new URLSearchParams(location.hash.slice(1));
    if (H.store.enabled() && P.lastId && !q.get('new')) { try { n = await H.store.get(P.lastId); } catch (e) { n = null; } }
    if (!n) n = H.newNotebook(null, q.get('paper') || 'ruled');
    load(n); consent(); saveLabel(H.store.enabled() ? 'saved' : P.consent === 'memory' ? 'memory' : 'none');
    const m = q.get('mode'); setMode(['write', 'draw', 'practise', 'graph', 'science', 'scan', 'work'].includes(m) ? m : 'write');
    if (q.get('title')) { nb.title = q.get('title').slice(0, 80); $('.hws-title').value = nb.title; }
    if (H.store.enabled()) { try { const box = await H.store.inbox(); for (const x of box) { const np = H.newPage('blank', 'landscape', x.title || T('From the Learning Studio', 'من استوديو التعلم')); const im = new Image(); await new Promise(r => { im.onload = r; im.onerror = r; im.src = x.src; }); const k = Math.min(np.w * 0.85 / (im.naturalWidth || 1), np.h * 0.75 / (im.naturalHeight || 1)); np.layers[0].items.push({ t: 'image', id: H.uid('i'), x: (np.w - im.naturalWidth * k) / 2, y: 100, w: im.naturalWidth * k, h: im.naturalHeight * k, src: x.src }, { t: 'text', id: H.uid('t'), x: 60, y: 40, text: x.title || '', size: 30, font: 'serif', color: '#1c1b19' }); nb.pages.push(np); await H.store.inboxDel(x.id); }
      if (box.length) { dirty(); renderPages(); goPage(nb.pages.length - 1); toast(T(`${box.length} item(s) from the Learning Studio added as new pages.`, 'أضيفت عناصر من استوديو التعلم.')); } } catch (e) { /* inbox unavailable */ } }
    H.emit('ready', nb);
  }
  H.start = start;
  document.addEventListener('erly:lang', () => { renderTools(); renderProps(); renderPages(); });
  start();
})();
