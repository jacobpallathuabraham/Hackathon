/* ERLY Handwriting Studio (v24) — Scan: read handwriting or print from a photo, or from the page you wrote here.
   Everything runs in this browser (ERLY.handOCR). Confidence values are the engine's own; nothing is invented.
   Recognition is optional — the studio works fully without it. */
(function () {
  'use strict';
  const H = window.HWS, T = H.T, esc = H.esc;
  const SC = { src: null, rot: 0, crop: null, bright: 0, contrast: 0, clean: false, lang: 'en', engine: 'tesseract', busy: false, res: null, cropping: false };
  H.scanPanel = panel => {
    panel.hidden = false; const OCR = window.ERLY && ERLY.handOCR, trocrOK = OCR && OCR.ENGINES.trocr.available();
    panel.innerHTML = `<div class="hws-work hws-scan"><div class="hws-work__h"><h2>${T('Scan & recognise', 'المسح والتعرف')}</h2><button type="button" class="hws-btn" data-sc="close">${T('Back to the page', 'العودة إلى الصفحة')}</button></div>
      <div class="hws-scan__grid"><div>
        <div class="hws-drop" tabindex="0" role="button" aria-label="${T('Choose or drop a photo of writing', 'اختر صورة أو أفلتها')}"><b>${T('Drop a photo here or choose one', 'أفلت صورة هنا أو اخترها')}</b><span>${T('JPG or PNG. It stays on this device.', 'تبقى على هذا الجهاز.')}</span><input type="file" accept="image/*" data-sc="file" hidden></div>
        <div class="hws-row"><button type="button" class="hws-btn" data-sc="page">${T('Use the page I wrote here', 'استخدم صفحتي هنا')}</button></div>
        <div class="hws-scan__view" ${SC.src ? '' : 'hidden'}><canvas class="hws-scan__cv"></canvas></div>
        <div class="hws-row hws-scan__tools" ${SC.src ? '' : 'hidden'}><button type="button" class="hws-btn" data-sc="rl" aria-label="${T('Rotate left', 'تدوير لليسار')}">⟲</button><button type="button" class="hws-btn" data-sc="rr" aria-label="${T('Rotate right', 'تدوير لليمين')}">⟳</button><button type="button" class="hws-btn" data-sc="crop" aria-pressed="${SC.cropping}">${T('Crop', 'قص')}</button><button type="button" class="hws-btn" data-sc="reset">${T('Reset image', 'إعادة الصورة')}</button>
          <label class="hws-range"><span>${T('Brightness', 'السطوع')}<output>${SC.bright}</output></span><input type="range" data-scr="bright" min="-60" max="60" value="${SC.bright}"></label><label class="hws-range"><span>${T('Contrast', 'التباين')}<output>${SC.contrast}</output></span><input type="range" data-scr="contrast" min="-40" max="80" value="${SC.contrast}"></label><label class="hws-check"><input type="checkbox" data-scc ${SC.clean ? 'checked' : ''}> ${T('Clean up (grey, stronger ink)', 'تنظيف')}</label></div>
        <p class="hws-mini" data-sc="quality"></p>
      </div><div>
        <label class="hws-field">${T('Language', 'اللغة')}<select data-scl><option value="en" ${SC.lang === 'en' ? 'selected' : ''}>English</option><option value="ar" ${SC.lang === 'ar' ? 'selected' : ''}>العربية (${T('experimental', 'تجريبي')})</option></select></label>
        <fieldset class="hws-field"><legend>${T('Reader', 'القارئ')}</legend>
          <label class="hws-check"><input type="radio" name="sce" value="tesseract" ${SC.engine === 'tesseract' ? 'checked' : ''}> <span><b>${T('Quick reader (Tesseract)', 'القارئ السريع')}</b> — ${T('built for printed text; weak on handwriting; has Arabic. Already on this site.', 'للمطبوع؛ ضعيف مع الخط اليدوي.')}</span></label>
          <label class="hws-check"><input type="radio" name="sce" value="trocr" ${SC.engine === 'trocr' ? 'checked' : ''} ${trocrOK ? '' : 'disabled'}> <span><b>${T('Handwriting model (TrOCR)', 'نموذج الكتابة اليدوية')}</b> — ${T('English handwriting only. Needs a one-time ~64 MB download of the model from Hugging Face (only after you agree); then runs on this device.', 'الإنجليزية فقط. تنزيل ~64 ميغابايت لمرة واحدة بعد موافقتك.')}</span></label></fieldset>
        <button type="button" class="hws-btn hws-btn--accent" data-sc="go" ${SC.src && !SC.busy ? '' : 'disabled'}>${SC.busy ? T('Reading…', 'جارٍ القراءة…') : T('Recognise text', 'تعرّف على النص')}</button><progress class="hws-prog" max="1" value="0" ${SC.busy ? '' : 'hidden'}></progress>
        <div class="hws-scan__res" aria-live="polite">${SC.res ? result() : ''}</div>
        <details class="hws-mini"><summary>${T('What to expect', 'ماذا تتوقع')}</summary><p>${T('Recognition is not perfect. On ERLY’s own test of 150 handwritten lines, the handwriting model got about 15% of characters wrong per line and the quick reader about 50%. Maths notation, diagrams and joined-up handwriting are read poorly or not at all. Mixed English/Arabic pages are read one language at a time. Words the engine itself was unsure of are highlighted. A reading mistake is the engine’s, not yours — always check and edit the text.', 'التعرف ليس مثالياً. الأخطاء من المحرك لا منك.')}</p></details>
      </div></div></div>`;
    draw(); bind(panel);
  };
  function result() { const r = SC.res, OCR = ERLY.handOCR;
    return `<label class="hws-field">${T('Recognised text — edit freely', 'النص المعترف به — عدّله')}<textarea data-sct rows="6" dir="${SC.lang === 'ar' ? 'rtl' : 'ltr'}">${esc(r.text)}</textarea></label>
      <p class="hws-mini">${T('Engine', 'المحرك')}: ${r.engine === 'trocr' ? 'TrOCR' : 'Tesseract'} · ${r.ms} ms · ${T('engine confidence', 'ثقة المحرك')} ${r.conf}% · <span class="hws-w hws-w--uncertain">${T('unsure', 'غير متأكد')}</span> <span class="hws-w hws-w--low">${T('very unsure', 'غير متأكد جداً')}</span></p>
      <div class="hws-words">${(r.words || []).map(w => `<span class="hws-w hws-w--${OCR.flag(w.conf)}" title="${w.conf}%">${esc(w.text)}</span>`).join(' ')}</div>
      <div class="hws-row"><button type="button" class="hws-btn" data-sc="copy">${T('Copy', 'نسخ')}</button><button type="button" class="hws-btn" data-sc="txt">${T('Download .txt', 'تنزيل txt')}</button><button type="button" class="hws-btn" data-sc="insert">${T('Add text to my notebook', 'أضف النص إلى دفتري')}</button><button type="button" class="hws-btn" data-sc="img">${T('Add the photo to my notebook', 'أضف الصورة')}</button></div>`; }
  function processed() { if (!SC.src) return null; const s = SC.src, r = ((SC.rot % 360) + 360) % 360, sw = r % 180 ? s.height : s.width, sh = r % 180 ? s.width : s.height;
    const a = document.createElement('canvas'); a.width = sw; a.height = sh; const g = a.getContext('2d'); g.translate(sw / 2, sh / 2); g.rotate(r * Math.PI / 180); g.drawImage(s, -s.width / 2, -s.height / 2);
    let c = a; if (SC.crop) { const [x, y, w, h] = SC.crop.map((v, i) => Math.round(v * (i % 2 ? sh : sw))); if (w > 8 && h > 8) { c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(a, x, y, w, h, 0, 0, w, h); } }
    if (SC.bright || SC.contrast || SC.clean) { const g2 = c.getContext('2d'), d = g2.getImageData(0, 0, c.width, c.height), px = d.data, k = (100 + SC.contrast + (SC.clean ? 40 : 0)) / 100;
      for (let i = 0; i < px.length; i += 4) { for (let j = 0; j < 3; j++) px[i + j] = (px[i + j] - 128) * k + 128 + SC.bright; if (SC.clean) { const v = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11; px[i] = px[i + 1] = px[i + 2] = v; } } g2.putImageData(d, 0, 0); }
    return c; }
  function draw() { const cv = document.querySelector('.hws-scan__cv'); if (!cv || !SC.src) return; const p = processed(), maxW = cv.parentElement.clientWidth || 520, k = Math.min(1, maxW / p.width, 420 / p.height); cv.width = Math.round(p.width * k); cv.height = Math.round(p.height * k); const g = cv.getContext('2d'); g.drawImage(p, 0, 0, cv.width, cv.height); cv._k = k;
    if (SC.cropping && SC.dragBox) { const [x, y, w, h] = SC.dragBox; g.strokeStyle = '#3446d4'; g.setLineDash([6, 4]); g.lineWidth = 2; g.strokeRect(x, y, w, h); }
    const q = document.querySelector('[data-sc="quality"]'); if (q) { const d = g.getImageData(0, 0, cv.width, cv.height).data; let sum = 0, sq = 0, n = 0; for (let i = 0; i < d.length; i += 16) { const v = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; sum += v; sq += v * v; n++; } const m = sum / n, sd = Math.sqrt(sq / n - m * m);
      q.textContent = (p.width < 600 ? T('Small image — text may be too small to read well. ', 'صورة صغيرة. ') : '') + (m < 110 ? T('The photo looks dark: try more brightness. ', 'الصورة داكنة. ') : '') + (sd < 30 ? T('Low contrast: try more contrast or “Clean up”. ', 'تباين منخفض. ') : '') || T('Image looks usable.', 'الصورة صالحة.'); } }
  function bind(panel) {
    panel.onclick = async e => { const b = e.target.closest('[data-sc]'), k = b && b.dataset.sc; if (e.target.closest('.hws-drop')) { panel.querySelector('[data-sc="file"]').click(); return; } if (!k) return;
      if (k === 'close') { panel.hidden = true; H.setMode('write'); }
      if (k === 'page') { const c = H.pagePNG(H.page(), 1.2); SC.src = c; SC.rot = 0; SC.crop = null; SC.res = null; H.scanPanel(panel); }
      if (k === 'rl' || k === 'rr') { SC.rot += k === 'rl' ? -90 : 90; SC.crop = null; draw(); }
      if (k === 'crop') { SC.cropping = !SC.cropping; b.setAttribute('aria-pressed', String(SC.cropping)); }
      if (k === 'reset') { SC.rot = 0; SC.crop = null; SC.bright = 0; SC.contrast = 0; SC.clean = false; H.scanPanel(panel); }
      if (k === 'go') run(panel);
      if (k === 'copy') { const t = panel.querySelector('[data-sct]').value; try { await navigator.clipboard.writeText(t); H.toast(T('Copied.', 'تم النسخ.')); } catch (err) { H.toast(T('Copy is blocked here — select the text instead.', 'النسخ محظور.')); } }
      if (k === 'txt') { const t = panel.querySelector('[data-sct]').value, a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = 'erly-recognised.txt'; a.click(); }
      if (k === 'insert') { const t = panel.querySelector('[data-sct]').value.trim(); if (!t) return; const p = H.page(); H.checkpoint(p); H.layer(p).items.push({ t: 'text', id: H.uid('t'), x: 80, y: 110, text: t, size: 26, font: 'sans', color: '#1c1b19' }); H.changed(); panel.hidden = true; H.setMode('write'); H.toast(T('Text added to the page.', 'أضيف النص.')); }
      if (k === 'img') { const c = processed(); H.addImage(c.toDataURL('image/jpeg', 0.9), c.width, c.height); panel.hidden = true; H.setMode('draw'); } };
    panel.querySelector('[data-sc="file"]').onchange = e => { const f = e.target.files[0]; if (f) loadFile(f, panel); };
    const drop = panel.querySelector('.hws-drop'); drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); panel.querySelector('[data-sc="file"]').click(); } });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('is-over'); }); drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('is-over'); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) loadFile(f, panel); });
    panel.oninput = e => { const r = e.target.dataset.scr; if (r) { SC[r] = +e.target.value; e.target.closest('label').querySelector('output').textContent = e.target.value; draw(); } if ('scc' in e.target.dataset) { SC.clean = e.target.checked; draw(); } };
    panel.onchange = e => { if ('scl' in e.target.dataset) { SC.lang = e.target.value; if (SC.lang === 'ar') SC.engine = 'tesseract'; H.scanPanel(panel); } if (e.target.name === 'sce') SC.engine = e.target.value; };
    const cv = panel.querySelector('.hws-scan__cv'); if (cv) { let st = null; cv.addEventListener('pointerdown', e => { if (!SC.cropping) return; const r = cv.getBoundingClientRect(); st = [e.clientX - r.left, e.clientY - r.top]; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', e => { if (!st) return; const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; SC.dragBox = [Math.min(st[0], x), Math.min(st[1], y), Math.abs(x - st[0]), Math.abs(y - st[1])]; draw(); });
      cv.addEventListener('pointerup', () => { if (!st || !SC.dragBox) { st = null; return; } const [x, y, w, h] = SC.dragBox, W = cv.width, Hh = cv.height, prev = SC.crop || [0, 0, 1, 1]; SC.crop = [prev[0] + x / W * prev[2], prev[1] + y / Hh * prev[3], w / W * prev[2], h / Hh * prev[3]]; SC.dragBox = null; st = null; SC.cropping = false; H.scanPanel(panel); }); }
  }
  function loadFile(f, panel) { const im = new Image(), url = URL.createObjectURL(f); im.onload = () => { const k = Math.min(1, 2600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); SC.src = c; SC.rot = 0; SC.crop = null; SC.res = null; URL.revokeObjectURL(url); H.scanPanel(panel); }; im.onerror = () => H.toast(T('That image could not be opened.', 'تعذر فتح الصورة.')); im.src = url; }
  async function run(panel) { const OCR = window.ERLY && ERLY.handOCR; if (!OCR) return H.toast(T('The reader could not load on this page.', 'تعذر تحميل القارئ.'));
    if (SC.engine === 'trocr' && !OCR.ENGINES.trocr.ready()) { if (!confirm(T('The handwriting model must be downloaded once from Hugging Face (about 64 MB). Your image is NOT sent — only the model files are downloaded, then everything runs on this device. Download it now?', 'يجب تنزيل النموذج (~64 ميغابايت) مرة واحدة. صورتك لا تُرسل. التنزيل الآن؟'))) return; }
    SC.busy = true; H.scanPanel(panel); const bar = panel.querySelector('.hws-prog');
    try { if (SC.engine === 'trocr' && !OCR.ENGINES.trocr.ready()) await OCR.ENGINES.trocr.load(p => { if (bar && p && p.progress != null) bar.value = p.progress; });
      SC.res = await OCR.recognize(processed(), { lang: SC.lang, engine: SC.engine, onProgress: p => { if (bar) bar.value = typeof p === 'number' ? p : (p && p.progress) || 0; } });
    } catch (err) { SC.res = null; H.toast(T('Recognition failed on this device: ', 'فشل التعرف: ') + (err && err.message ? err.message : '')); }
    SC.busy = false; H.scanPanel(panel); }
  H._scan = SC;
})();
