/* ERLY Reading Studio — full-screen reader with typography controls, reader
   zoom, natural read-aloud in any installed voice with a live voice wave and a
   glossary. Every interaction feeds the live indicators in tracker.js
   (recorded only once the student has signed the Support Pact).

   The reader also publishes small interaction events on ERLY.reader for the
   AI Reading Companion (assets/js/companion/): which section is in view, zoom,
   pan, format changes and read-aloud. It never publishes document text,
   keystrokes or anything from the camera or microphone. The companion decides
   — with the student's consent — what, if anything, to do with them. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const DOC = window.STUDIO_DOC;
  const track = (id, v, m) => ERLY.track && ERLY.track(id, v, m);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const tried = new Set();
  const tool = k => { if (!tried.has(k)) { tried.add(k); track('H10', tried.size, 'set'); } };

  const FONTS = [['classic', 'Classic', '"Fraunces", Georgia, serif'], ['lexend', 'Lexend', '"Lexend", sans-serif'], ['atkinson', 'Atkinson', '"Atkinson Hyperlegible", sans-serif'], ['andika', 'Andika', '"Andika", sans-serif'], ['sans', 'Sans', '"Instrument Sans", sans-serif']];
  const TINTS = [['paper', '#FFFFFF', '#1B1915'], ['cream', '#FBF3DF', '#2B2418'], ['blue', '#E3EEFA', '#14243A'], ['mint', '#E2F4EC', '#11291F'], ['rose', '#FBE7EA', '#331A1F'], ['night', '#1E1D24', '#E9E6F2']];
  const STYLES = { friendly: [0.96, 1.06], calm: [0.86, 0.98], clear: [1.0, 1.0], brisk: [1.12, 1.02] };
  const st = { font: 'classic', size: 19, lh: 1.75, ls: 0, ws: 0, width: 660, tint: 'paper', focus: false, anchors: false, zoom: 1, voice: '', style: 'friendly', rate: 0.96, pitch: 1.06, hl: true };
  const ZOOMS = [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

  // event bus for the companion: interaction metadata only
  const listeners = [];
  const emit = ev => { ev.t = Date.now(); listeners.slice().forEach(fn => { try { fn(ev); } catch (e) { console.error(e); } }); };

  /* ================= build the overlay ================= */
  const root = document.createElement('div');
  root.className = 'studio';
  root.id = 'studio';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'ERLY Reading Studio');
  document.body.appendChild(root);

  function para(text, pi, ji) {
    const html = text.replace(/\[([^\]]+)\]/g, (_, t) => `<dfn class="term" data-term="${t}" tabindex="0">${t}</dfn>`);
    return `<div class="sp" data-p="${pi}-${ji}"><div class="sp__gutter"><button class="sp__btn" data-play="${pi}-${ji}" aria-label="Read this paragraph">${ICON('volume')}</button><button class="sp__btn sp__btn--help" data-help="${pi}-${ji}" aria-label="Help with this paragraph">?</button></div><p class="sp__t">${html}</p></div>`;
  }
  const FIG = `<figure class="sfig" id="sfig"><svg viewBox="0 0 420 160" aria-hidden="true">
      <g data-fs="0"><rect x="120" y="16" width="180" height="118" rx="12" fill="none" stroke="currentColor" stroke-dasharray="6 6" stroke-width="2" opacity=".6"/></g>
      <path d="M170 52h80l18 44H152z" fill="currentColor" opacity=".12"/>
      <g data-fs="1"><path d="M20 60h104" stroke="var(--accent)" stroke-width="4" marker-end="url(#ah2)"/><text x="22" y="48" font-size="13" fill="currentColor">m, h in</text></g>
      <g data-fs="2"><path d="M210 96v40" stroke="var(--teal)" stroke-width="4" marker-end="url(#ah3)"/><text x="222" y="152" font-size="13" fill="currentColor">W out</text></g>
      <g data-fs="3"><path d="M282 84h104" stroke="var(--accent)" stroke-width="4" marker-end="url(#ah2)"/><text x="330" y="72" font-size="13" fill="currentColor">m, h out</text></g>
      <defs><marker id="ah2" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="10" refY="7" orient="auto"><path d="M0 0l14 7-14 7z" fill="var(--accent)"/></marker><marker id="ah3" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="10" refY="7" orient="auto"><path d="M0 0l14 7-14 7z" fill="var(--teal)"/></marker></defs>
    </svg><figcaption>${DOC.pages[0].fig.cap}</figcaption><div class="sfig__acts"><button class="sfig__help" data-fig>${ICON('search')} Explain this diagram</button><button class="sfig__help" data-figzoom aria-pressed="false">${ICON('search')} Zoom diagram</button></div></figure>`;

  root.innerHTML = `
    <header class="studio__top">
      <button class="studio__close" id="stClose" aria-label="Close the Reading Studio">${ICON('x')}</button>
      <div class="studio__file">${ICON('file')}<span><b>${DOC.title}</b><small>${DOC.course}</small></span></div>
      <div class="studio__pages" id="stPages">${DOC.pages.map((p, i) => `<button data-goto="${i}" class="${i === 0 ? 'is-on' : ''}">${i + 1}</button>`).join('')}</div>
      <div class="studio__acts">
        <span class="studio__rec" id="stRec"></span>
        <button class="btn btn--sm btn--accent" id="stRead">${ICON('volume')}<span>${T('Read page', 'اقرأ الصفحة')}</span></button>
        <button class="icon-btn studio__tgl" id="stToolsT" aria-label="Text and voice settings">${ICON('text')}</button>
        <div class="studio__zoom" role="group" aria-label="${T('Zoom', 'التكبير')}"><button class="icon-btn" id="stZoomOut" aria-label="${T('Zoom out', 'تصغير')}">−</button><output class="mono" id="stZoomV" aria-live="polite">100%</output><button class="icon-btn" id="stZoomIn" aria-label="${T('Zoom in', 'تكبير')}">+</button></div>
      </div>
    </header>
    <div class="studio__body">
      <aside class="studio__tools" id="stTools">
        <section class="stool"><p class="stool__h mono">${T('Read aloud', 'القراءة الصوتية')}</p>
          <div class="vstyles" id="stStyles">${[['friendly', 'Friendly', 'ودود'], ['calm', 'Calm', 'هادئ'], ['clear', 'Clear', 'واضح'], ['brisk', 'Brisk', 'سريع']].map(([k, en, ar]) => `<button class="vstyle ${k === st.style ? 'is-on' : ''}" data-style="${k}">${T(en, ar)}</button>`).join('')}</div>
          <label class="field"><span class="mono">${T('Voice', 'الصوت')}</span><select id="stVoice"></select></label>
          <label class="slider slider--sm"><span><span>${T('Speed', 'السرعة')}</span><b class="mono" id="vRate2">0.96×</b></span><input type="range" id="stRate" min="0.6" max="1.5" step="0.02" value="0.96"></label>
          <label class="slider slider--sm"><span><span>${T('Pitch', 'طبقة الصوت')}</span><b class="mono" id="vPitch">1.06</b></span><input type="range" id="stPitch" min="0.6" max="1.5" step="0.02" value="1.06"></label>
          <button class="btn btn--xs btn--ghost" id="stTest">${ICON('volume')} ${T('Try this voice', 'جرّب هذا الصوت')}</button>
          <label class="switch-row"><span><b>${T('Highlight each word', 'إبراز كل كلمة')}</b></span><input type="checkbox" id="stHl" checked><i></i></label>
        </section>
        <section class="stool"><p class="stool__h mono">${T('Text', 'النص')}</p>
          <div class="fchips" id="stFonts">${FONTS.map(f => `<button class="fchip ${f[0] === st.font ? 'is-on' : ''}" data-font="${f[0]}" style="font-family:${f[2]}">${f[1]}<small>Aa</small></button>`).join('')}</div>
          <label class="slider slider--sm"><span><span>${T('Size', 'الحجم')}</span><b class="mono" id="vSz">19px</b></span><input type="range" id="stSize" min="14" max="34" step="1" value="19"></label>
          <label class="slider slider--sm"><span><span>${T('Line spacing', 'تباعد الأسطر')}</span><b class="mono" id="vLh2">1.75</b></span><input type="range" id="stLh" min="1.3" max="2.6" step="0.05" value="1.75"></label>
          <label class="slider slider--sm"><span><span>${T('Letter spacing', 'تباعد الحروف')}</span><b class="mono" id="vLs2">0.00</b></span><input type="range" id="stLs" min="0" max="0.16" step="0.01" value="0"></label>
          <label class="slider slider--sm"><span><span>${T('Word spacing', 'تباعد الكلمات')}</span><b class="mono" id="vWs">0.00</b></span><input type="range" id="stWs" min="0" max="0.6" step="0.05" value="0"></label>
          <label class="slider slider--sm"><span><span>${T('Line length', 'طول السطر')}</span><b class="mono" id="vW">660</b></span><input type="range" id="stW" min="460" max="820" step="20" value="660"></label>
        </section>
        <section class="stool"><p class="stool__h mono">${T('Page', 'الصفحة')}</p>
          <div class="tchips" id="stTints">${TINTS.map(t => `<button class="tchip ${t[0] === st.tint ? 'is-on' : ''}" data-tint="${t[0]}" style="--bg:${t[1]};--fg:${t[2]}" aria-label="${t[0]} page">A</button>`).join('')}</div>
          <label class="switch-row"><span><b>${T('Line focus', 'تركيز السطر')}</b><small>${T('follow with mouse or ↑ ↓', 'تتبّع بالفأرة أو ↑ ↓')}</small></span><input type="checkbox" id="stFocus"><i></i></label>
          <label class="switch-row"><span><b>${T('Word anchors', 'مراسي الكلمات')}</b><small>${T('bold word beginnings', 'بدايات كلمات عريضة')}</small></span><input type="checkbox" id="stAnch"><i></i></label>
          <button class="btn btn--xs btn--quiet" id="stReset">${T('Reset everything', 'إعادة الضبط')}</button>
        </section>
      </aside>

      <main class="studio__doc" id="stDoc" tabindex="0">
        <div class="studio__ruler" id="stRuler" aria-hidden="true"></div>
        ${DOC.pages.map((p, pi) => `<article class="spage" data-page="${pi}" style="--i:${pi}">
          <header class="spage__hdr"><span>${DOC.course}</span><span>${T('Week 4 reading', 'قراءة الأسبوع ٤')}</span></header>
          <h2 class="spage__h">${p.h}</h2>
          ${p.paras.map((x, ji) => para(x.text, pi, ji)).join('')}
          ${pi === 0 ? FIG : ''}
          <footer class="spage__ftr">${12 + pi}</footer>
        </article>`).join('')}
        <div class="vdock" id="vdock" aria-hidden="true">
          <button class="vdock__btn" id="vdStop" aria-label="Stop reading">${ICON('x')}</button>
          <canvas class="vdock__wave" id="vdWave"></canvas>
          <span class="vdock__word" id="vdWord"></span>
        </div>
      </main>

    </div>
    <div class="term-pop" id="termPop" hidden></div>`;

  const doc = $('#stDoc', root);

  /* ================= open / close with a smooth reveal ================= */
  let opened = false;
  function open(fromEl) {
    if (!root.hidden) return;
    const r = fromEl && fromEl.getBoundingClientRect ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    root.style.setProperty('--ox', (r.left + r.width / 2) + 'px');
    root.style.setProperty('--oy', (r.top + r.height / 2) + 'px');
    root.hidden = false;
    document.documentElement.classList.add('studio-open');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
    if (!opened) { opened = true; openedAt = Date.now(); }
    emit({ type: 'open' });
    setTimeout(() => { doc.focus({ preventScroll: true }); indexLines(); }, reduce ? 0 : 650);
    updateRec();
  }
  function close() {
    if (root.hidden) return;
    stopSpeech();
    if (busyPara) track('V09');
    root.classList.remove('is-open');
    document.documentElement.classList.remove('studio-open');
    emit({ type: 'close' });
    setTimeout(() => { if (!root.classList.contains('is-open')) root.hidden = true; }, reduce ? 0 : 560);
  }
  ERLY.openStudio = open;
  document.addEventListener('click', e => { const b = e.target.closest('[data-studio]'); if (b) { e.preventDefault(); open(b); } });
  $('#stClose', root).addEventListener('click', close);
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || root.hidden) return;
    if (!$('#termPop', root).hidden) return hidePop();
    if (e.target.closest && e.target.closest('.cmp')) return; // the companion handles its own Escape
    if (ERLY.companion && ERLY.companion.isOpen()) return ERLY.companion.close(); // close the companion first
    close();
  });
  $('#stToolsT', root).addEventListener('click', () => { root.classList.toggle('show-tools'); });
  function updateRec() { $('#stRec', root).innerHTML = ERLY.isTracking && ERLY.isTracking() ? `<i></i>${T('tracking on', 'التتبّع مفعّل')}` : `<i class="off"></i>${T('not tracking', 'لا تتبّع')}`; }

  /* ================= typography ================= */
  function apply() {
    const f = FONTS.find(x => x[0] === st.font)[2], t = TINTS.find(x => x[0] === st.tint);
    doc.style.setProperty('--pf', f); doc.style.setProperty('--ps', st.size + 'px'); doc.style.setProperty('--plh', st.lh);
    doc.style.setProperty('--pls', st.ls + 'em'); doc.style.setProperty('--pws', st.ws + 'em'); doc.style.setProperty('--pw', st.width + 'px');
    doc.style.setProperty('--pbg', t[1]); doc.style.setProperty('--pfg', t[2]); doc.style.setProperty('--pz', st.zoom);
    root.classList.toggle('is-zoomed', st.zoom > 1); $('#stZoomV', root).textContent = Math.round(st.zoom * 100) + '%';
    root.classList.toggle('is-focus', st.focus); root.classList.toggle('is-anchors', st.anchors);
    $('#vSz', root).textContent = st.size + 'px'; $('#vLh2', root).textContent = st.lh.toFixed(2); $('#vLs2', root).textContent = st.ls.toFixed(2); $('#vWs', root).textContent = st.ws.toFixed(2); $('#vW', root).textContent = st.width;
    clearTimeout(apply.t); apply.t = setTimeout(indexLines, 300);
  }
  const bind = (id, key, ind, fn) => {
    $(id, root).addEventListener('input', e => { const old = st[key]; st[key] = +e.target.value; if (ind && (key !== 'size' || st.size > old)) { track(ind); tool('type'); } fn && fn(); apply(); });
    $(id, root).addEventListener('change', () => emit({ type: 'format', key })); // once per adjustment, not per pixel of a drag
  };
  bind('#stSize', 'size', 'V02'); bind('#stLh', 'lh', 'V07'); bind('#stLs', 'ls', 'V07'); bind('#stWs', 'ws', 'V07'); bind('#stW', 'width');
  $('#stFonts', root).addEventListener('click', e => { const b = e.target.closest('[data-font]'); if (!b) return; st.font = b.dataset.font; $$('#stFonts .fchip', root).forEach(x => x.classList.toggle('is-on', x === b)); if (st.font !== 'classic') { track('V07'); tool('font'); } emit({ type: 'format', key: 'font' }); apply(); });
  $('#stTints', root).addEventListener('click', e => { const b = e.target.closest('[data-tint]'); if (!b) return; st.tint = b.dataset.tint; $$('#stTints .tchip', root).forEach(x => x.classList.toggle('is-on', x === b)); track('V07'); tool('tint'); emit({ type: 'format', key: 'tint' }); apply(); });
  $('#stFocus', root).addEventListener('change', e => { st.focus = e.target.checked; if (st.focus) { track('V04'); tool('focus'); } emit({ type: 'format', key: 'focus' }); apply(); placeRuler(); });
  $('#stAnch', root).addEventListener('change', e => { st.anchors = e.target.checked; if (st.anchors) tool('anchors'); emit({ type: 'format', key: 'anchors' }); anchorize(); apply(); });
  $('#stReset', root).addEventListener('click', () => {
    Object.assign(st, { font: 'classic', size: 19, lh: 1.75, ls: 0, ws: 0, width: 660, tint: 'paper', focus: false, anchors: false });
    [['#stSize', 19], ['#stLh', 1.75], ['#stLs', 0], ['#stWs', 0], ['#stW', 660]].forEach(([i, v]) => { $(i, root).value = v; });
    $('#stFocus', root).checked = false; $('#stAnch', root).checked = false;
    $$('#stFonts .fchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.font === 'classic'));
    $$('#stTints .tchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.tint === 'paper'));
    emit({ type: 'format', key: 'reset' });
    anchorize(); apply(); placeRuler();
  });

  /* ================= reader zoom (the reader's own, so it can be measured) ================= */
  // Browser zoom (Ctrl +/−, pinch) can't be read reliably by a web page, so the
  // companion reports that as unavailable and measures this control instead.
  function setZoom(z, o = {}) {
    z = Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], z));
    if (z === st.zoom) return;
    const mid = doc.scrollTop / Math.max(1, doc.scrollHeight);
    st.zoom = z; apply();
    doc.scrollTop = mid * doc.scrollHeight;
    if (!o.silent) emit({ type: 'zoom', level: z, figure: false });
    clearTimeout(apply.t); apply.t = setTimeout(indexLines, 300);
  }
  const stepZoom = d => { const i = ZOOMS.findIndex(x => x >= st.zoom - 1e-6); setZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + d))]); };
  $('#stZoomIn', root).addEventListener('click', () => stepZoom(1));
  $('#stZoomOut', root).addEventListener('click', () => stepZoom(-1));
  let wheelT = 0;
  doc.addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (Date.now() - wheelT < 160) return; wheelT = Date.now();
    if (e.target.closest('#sfig')) return figZoom(e.deltaY < 0);
    stepZoom(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
  // diagram zoom: excluded from friction signals (inspecting a figure is normal)
  function figZoom(on) {
    const f = $('#sfig', root), b = $('[data-figzoom]', root);
    on = on === undefined ? !f.classList.contains('is-zoom') : on;
    if (on === f.classList.contains('is-zoom')) return;
    f.classList.toggle('is-zoom', on); b.setAttribute('aria-pressed', on);
    emit({ type: 'zoom', level: on ? 1.6 : 1, figure: true });
  }
  root.addEventListener('click', e => { if (e.target.closest('[data-figzoom]')) figZoom(); });

  // split paragraph text into word spans once (keeps <dfn> terms intact)
  $$('.sp__t', root).forEach(p => {
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(tok));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = tok; s.dataset.raw = tok; frag.appendChild(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName === 'DFN') {
          const words = n.textContent.split(' ');
          n.innerHTML = words.map(w => `<span class="w" data-raw="${w}">${w}</span>`).join(' ');
        }
      });
    };
    walk(p);
  });
  function anchorize() {
    $$('.w', root).forEach(w => {
      const raw = w.dataset.raw, m = raw.match(/^([A-Za-z]+)(.*)$/);
      if (st.anchors && m) { const k = Math.ceil(m[1].length * 0.45); w.innerHTML = `<b>${m[1].slice(0, k)}</b>${m[1].slice(k)}${m[2]}`; }
      else w.textContent = raw;
    });
  }

  /* ================= the voice wave ================= */
  // Browsers don't expose the speech audio, so the wave follows the speech
  // engine itself: each spoken word sets the energy (longer and stressed words
  // swell, punctuation dips into a pause, questions lift), and syllable pulses
  // ride on top at the speaking rate. Pitch changes the wave's frequency.
  const viz = { e: 0, target: 0, lift: 0, liftT: 0, t: 0, on: false, raf: 0, last: 0 };
  function vizWord(w) {
    const clean = w.replace(/[^\p{L}\p{N}]/gu, '');
    const stress = /^[A-Z]/.test(w) ? .12 : 0;
    viz.target = Math.min(1, .38 + Math.min(clean.length, 12) * .05 + stress + Math.random() * .08);
    viz.syl = Math.max(1, Math.round(clean.length / 3));
    viz.wordAt = performance.now();
    viz.liftT = /\?$/.test(w) ? .5 : /[.!]$/.test(w) ? -.3 : 0;
    if (/[.,;:!?]$/.test(w)) setTimeout(() => { viz.target = .08; }, 180 / st.rate);
  }
  function vizStart() { viz.on = true; if (!viz.raf) viz.raf = requestAnimationFrame(vizLoop); }
  function vizStop() { viz.on = false; viz.target = 0; }
  function drawWave(cv, energy, small) {
    if (!cv || !cv.offsetWidth) return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (energy < .015) return;
    const cs = getComputedStyle(document.documentElement);
    const cols = [cs.getPropertyValue('--accent').trim() || '#C1502B', cs.getPropertyValue('--teal').trim() || '#146A63', cs.getPropertyValue('--s4').trim() || '#5B4B8A'];
    const freq = (small ? 2.2 : 2.6) * (0.75 + st.pitch * .35) * (1 + viz.lift * .35);
    [[1, 0, .9], [.7, 1.7, .55], [.45, 3.1, .4]].forEach(([amp, ph, alpha], li) => {
      g.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const u = x / W, env = Math.pow(Math.sin(Math.PI * u), 1.6);
        const y = H / 2 + Math.sin(u * Math.PI * 2 * freq + viz.t * (2.2 + li * .7) + ph) * env * amp * energy * (H * .42);
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = cols[li]; g.globalAlpha = alpha * (small ? 1 : .95); g.lineWidth = li ? 1.6 : 2.4; g.lineCap = 'round'; g.stroke();
    });
    g.globalAlpha = 1;
  }
  function vizLoop(now) {
    const dt = Math.min(50, now - (viz.last || now)); viz.last = now;
    viz.t += dt / 1000 * (1.2 + st.rate * 1.6);
    // syllable pulses at ~4.5 per second × speaking rate
    const since = (now - (viz.wordAt || 0)) / 1000, pulse = viz.on ? .55 + .45 * Math.abs(Math.sin(since * Math.PI * 4.5 * st.rate)) : 0;
    const goal = viz.on ? viz.target * pulse : 0;
    viz.e += (goal - viz.e) * Math.min(1, dt / 70);
    viz.target *= viz.on ? 0.992 : 0.9;
    viz.lift += (viz.liftT - viz.lift) * .05;
    const e = Math.max(viz.on ? .06 : 0, viz.e);
    drawWave($('#vdWave', root), e, false);
    drawWave($('#noorWave', root), talkingNow ? Math.max(.12, e) : 0, true);
    const m = $('#noorMouth', root); if (m) m.setAttribute('ry', (1 + (talkingNow ? e : 0) * 6).toFixed(2));
    if (viz.on || viz.e > .01 || talkingNow) viz.raf = requestAnimationFrame(vizLoop);
    else { viz.raf = 0; drawWave($('#vdWave', root), 0); drawWave($('#noorWave', root), 0, true); }
  }

  /* ================= voices & natural read-aloud ================= */
  let voices = [];
  const natural = v => {
    const n = v.name;
    let s = 0;
    if (/natural|neural/i.test(n)) s += 6; if (/online/i.test(n)) s += 3; if (/google/i.test(n)) s += 2;
    if (/aria|jenny|sonia|libby|natasha|emma|michelle|ava|samantha|serena|allison|karen|moira|tessa|daniel|guy|ryan/i.test(n)) s += 3;
    if (/compact|espeak|robot|novelty|whisper|bells|bad news|zarvox|trinoids|cellos/i.test(n)) s -= 8;
    if (/^en-(GB|US|AU|IE)/i.test(v.lang)) s += 1;
    return s;
  };
  function loadVoices() {
    if (!('speechSynthesis' in window)) { $('#stVoice', root).innerHTML = `<option>${T('Read-aloud not supported here', 'القراءة الصوتية غير مدعومة')}</option>`; return; }
    voices = speechSynthesis.getVoices();
    const groups = { en: [], ar: [], other: [] };
    voices.forEach((v, i) => { const k = /^en/i.test(v.lang) ? 'en' : /^ar/i.test(v.lang) ? 'ar' : 'other'; groups[k].push([i, v]); });
    groups.en.sort((a, b) => natural(b[1]) - natural(a[1]));
    const opt = ([i, v]) => `<option value="${i}">${natural(v) >= 5 ? '★ ' : ''}${v.name.replace(/Microsoft |Google |\(Natural\)|Online/g, '').trim()} · ${v.lang}</option>`;
    $('#stVoice', root).innerHTML = voices.length
      ? `${groups.en.length ? `<optgroup label="English — most natural first">${groups.en.map(opt).join('')}</optgroup>` : ''}${groups.ar.length ? `<optgroup label="العربية">${groups.ar.map(opt).join('')}</optgroup>` : ''}${groups.other.length ? `<optgroup label="${T('Other', 'أخرى')}">${groups.other.map(opt).join('')}</optgroup>` : ''}`
      : `<option value="">${T('Default voice', 'الصوت الافتراضي')}</option>`;
    if (st.voice === '' && groups.en[0]) st.voice = groups.en[0][0];
    if (st.voice !== '') $('#stVoice', root).value = st.voice;
  }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; } else loadVoices();
  $('#stVoice', root).addEventListener('change', e => { st.voice = e.target.value; });
  $('#stStyles', root).addEventListener('click', e => {
    const b = e.target.closest('[data-style]'); if (!b) return;
    st.style = b.dataset.style; [st.rate, st.pitch] = STYLES[st.style];
    $$('#stStyles .vstyle', root).forEach(x => x.classList.toggle('is-on', x === b));
    $('#stRate', root).value = st.rate; $('#stPitch', root).value = st.pitch;
    $('#vRate2', root).textContent = st.rate.toFixed(2) + '×'; $('#vPitch', root).textContent = st.pitch.toFixed(2);
    track('U03');
    say(st.style === 'calm' ? T('Okay — nice and slow. No rush at all.', 'حسناً — بهدوء وبطء. لا عجلة أبداً.') : st.style === 'brisk' ? T('Alright, let’s pick up the pace a little.', 'حسناً، لنسرّع قليلاً.') : st.style === 'clear' ? T('Clear and steady. Here we go.', 'واضح وثابت. لنبدأ.') : T('Hey! This is how I sound when we read together.', 'أهلاً! هكذا يبدو صوتي حين نقرأ معاً.'), { force: true });
  });
  $('#stRate', root).addEventListener('input', e => { st.rate = +e.target.value; $('#vRate2', root).textContent = st.rate.toFixed(2) + '×'; track('U03'); });
  $('#stPitch', root).addEventListener('input', e => { st.pitch = +e.target.value; $('#vPitch', root).textContent = st.pitch.toFixed(2); });
  $('#stHl', root).addEventListener('change', e => { st.hl = e.target.checked; });
  $('#stTest', root).addEventListener('click', () => say(T('Hi! I’m Noor. Pick whichever voice feels easiest to listen to — I’ll use it whenever we read together.', 'أهلاً! أنا نور. اختر الصوت الأسهل عليك — وسأستخدمه كلما قرأنا معاً.'), { force: true }));

  function utter(text, rate, pitch) {
    const u = new SpeechSynthesisUtterance(text);
    const v = voices[st.voice];
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
    u.rate = rate || st.rate; u.pitch = pitch || st.pitch;
    return u;
  }
  // Speak a list of word spans as natural phrases: one utterance per sentence,
  // a breath between them, and a little pitch movement so it never sounds flat.
  let reading = null, fallback = null, openedAt = 0, firstTts = null;
  const played = {};
  function phrases(words) {
    const out = []; let cur = [];
    words.forEach((w, i) => { cur.push(w); if (/[.!?:;]$/.test(w.dataset.raw) || i === words.length - 1) { out.push(cur); cur = []; } });
    return out;
  }
  function readParas(keys, rate) {
    if (!('speechSynthesis' in window)) return ERLY.toast(T('Read-aloud isn\'t supported in this browser', 'القراءة الصوتية غير مدعومة في هذا المتصفح'));
    stopSpeech();
    track('H01'); tool('tts');
    if (firstTts === null && openedAt) { firstTts = (Date.now() - openedAt) / 1000; track('V08', +firstTts.toFixed(0), 'set'); }
    const queue = keys.slice();
    reading = { queue };
    emit({ type: 'tts', action: 'start', scope: keys.length > 1 ? 'page' : 'paragraph' });
    $('#stRead', root).classList.add('is-on');
    $('#stRead span', root).textContent = T('Stop', 'إيقاف');
    root.classList.add('is-speaking');
    vizStart();
    const nextPara = () => {
      if (!reading || !queue.length) return stopSpeech();
      const key = queue.shift();
      played[key] = (played[key] || 0) + 1;
      if (played[key] > 1) track('U02');
      const box = $(`.sp[data-p="${key}"]`, root);
      $$('.sp.is-reading', root).forEach(x => x.classList.remove('is-reading'));
      box.classList.add('is-reading');
      emit({ type: 'intent', why: 'read-aloud' });
      box.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      const ph = phrases($$('.w', box));
      let pi = 0;
      const nextPhrase = () => {
        if (!reading) return;
        if (pi >= ph.length) { box.classList.remove('is-reading'); return setTimeout(nextPara, 380); }
        const words = ph[pi++], text = words.map(w => w.dataset.raw).join(' ');
        const starts = []; let pos = 0; words.forEach(w => { starts.push(pos); pos += w.dataset.raw.length + 1; });
        const mark = i => { words.forEach(w => w.classList.remove('is-say')); if (words[i]) { if (st.hl) words[i].classList.add('is-say'); vizWord(words[i].dataset.raw); $('#vdWord', root).textContent = words[i].dataset.raw.replace(/[^\p{L}\p{N}'’-]/gu, ''); } };
        let gotB = false, idx = -1;
        const question = /\?$/.test(text);
        const u = utter(text, (rate || st.rate) * (0.98 + Math.random() * .05), st.pitch * (question ? 1.04 : 0.97 + Math.random() * .07));
        u.onboundary = e => { if (e.name && e.name !== 'word') return; gotB = true; const i = starts.findIndex((s, k) => s <= e.charIndex && (starts[k + 1] === undefined || starts[k + 1] > e.charIndex)); if (i >= 0) { idx = i; mark(i); } };
        u.onstart = () => { mark(0); idx = 0; };
        u.onend = u.onerror = () => { clearInterval(fallback); words.forEach(w => w.classList.remove('is-say')); viz.target = .05; if (reading) setTimeout(nextPhrase, /[.!?]$/.test(text) ? 260 : 120); };
        speechSynthesis.speak(u);
        clearInterval(fallback);
        setTimeout(() => { if (!gotB && reading) fallback = setInterval(() => { if (idx + 1 < words.length) mark(++idx); }, 60000 / (165 * (rate || st.rate))); }, 600);
      };
      nextPhrase();
    };
    nextPara();
  }
  function stopSpeech() {
    if (reading) emit({ type: 'tts', action: 'stop' });
    reading = null; clearInterval(fallback);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    $$('.w.is-say', root).forEach(w => w.classList.remove('is-say'));
    $$('.sp.is-reading', root).forEach(w => w.classList.remove('is-reading'));
    $('#stRead', root).classList.remove('is-on'); $('#stRead span', root).textContent = T('Read page', 'اقرأ الصفحة');
    root.classList.remove('is-speaking');
    vizStop();
    talking(false);
  }
  $('#vdStop', root).addEventListener('click', stopSpeech);
  $('#stRead', root).addEventListener('click', () => {
    if (reading) return stopSpeech();
    const pg = currentPage();
    track('U06');
    readParas(DOC.pages[pg].paras.map((_, j) => `${pg}-${j}`));
  });
  root.addEventListener('click', e => { const p = e.target.closest('[data-play]'); if (p) readParas([p.dataset.play]); });

  /* ================= pages ================= */
  const seenPages = new Set([0]);
  function currentPage() {
    const mid = doc.getBoundingClientRect().top + doc.clientHeight / 2;
    let best = 0;
    $$('.spage', root).forEach((p, i) => { if (p.getBoundingClientRect().top < mid) best = i; });
    return best;
  }
  $('#stPages', root).addEventListener('click', e => {
    const b = e.target.closest('[data-goto]'); if (!b) return;
    const n = +b.dataset.goto;
    if (n < currentPage() && seenPages.has(n)) track('V06');
    const pg = $(`.spage[data-page="${n}"]`, root);
    emit({ type: 'intent', why: 'page-button' });
    doc.scrollTo({ top: pg.offsetTop - 20, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ================= glossary ================= */
  const pop = $('#termPop', root);
  const looked = {};
  function showTerm(el) {
    const t = el.dataset.term, d = DOC.terms[t]; if (!d) return;
    looked[t] = (looked[t] || 0) + 1;
    track('M03', looked[t] > 1 ? 1 : 0); tool('glossary');
    const r = el.getBoundingClientRect();
    pop.innerHTML = `<b>${t}</b><p>${d[0]}</p><p class="term-pop__ar" lang="ar" dir="rtl">${d[1]}</p><div class="row-btns"><button class="btn btn--xs btn--ghost" data-say-term>${ICON('volume')} ${T('Hear it', 'استمع')}</button><button class="btn btn--xs btn--quiet" data-close-pop>${T('Close', 'إغلاق')}</button></div>`;
    pop.hidden = false;
    const left = Math.min(innerWidth - 320, Math.max(12, r.left + r.width / 2 - 150));
    const top = r.bottom + 10 + 200 > innerHeight ? r.top - 10 - pop.offsetHeight : r.bottom + 10;
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
    pop.classList.remove('is-in'); void pop.offsetWidth; pop.classList.add('is-in');
    $('[data-say-term]', pop).onclick = () => { track('H01'); say(`${t}. ${d[0]}`, { force: true }); };
    $('[data-close-pop]', pop).onclick = hidePop;
  }
  function hidePop() { pop.hidden = true; }
  root.addEventListener('click', e => { const t = e.target.closest('.term'); if (t) { e.stopPropagation(); showTerm(t); } else if (!e.target.closest('#termPop')) hidePop(); });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('term')) showTerm(e.target); });
  let selT = null;
  document.addEventListener('selectionchange', () => {
    if (root.hidden) return;
    const s = getSelection();
    if (s && String(s).trim().length > 2) { clearTimeout(selT); selT = setTimeout(() => { if (!String(getSelection()).trim()) track('M07'); }, 2500); }
  });

  /* ================= line focus & re-read tracking ================= */
  let lines = [], focusLine = 0;
  function indexLines() {
    lines = [];
    $$('.spage', root).forEach(pg => $$('.w', pg).forEach(w => {
      const top = w.getBoundingClientRect().top + doc.scrollTop - doc.getBoundingClientRect().top;
      const L = lines[lines.length - 1];
      if (!L || Math.abs(top - L.top) > 6) lines.push({ top, h: w.offsetHeight, para: w.closest('.sp') && w.closest('.sp').dataset.p });
      w.dataset.line = lines.length - 1;
    }));
    placeRuler();
  }
  function placeRuler(i) {
    const r = $('#stRuler', root);
    if (!st.focus || !lines.length) { r.style.opacity = 0; return; }
    if (i != null) focusLine = Math.max(0, Math.min(lines.length - 1, i));
    const L = lines[focusLine];
    r.style.opacity = 1; r.style.top = (L.top - 7) + 'px'; r.style.height = (L.h + 14) + 'px';
  }
  const P = {};
  const pstate = k => (P[k] = P[k] || { back: 0, regress: 0, secs: 0, offered: false, maxLine: -1 });
  let backT = null, busyPara = null;
  doc.addEventListener('pointermove', e => {
    const w = e.target.closest('.w'); if (!w) return;
    const ln = +w.dataset.line, sp = w.closest('.sp');
    if (st.focus) placeRuler(ln);
    if (!sp) return;
    busyPara = sp.dataset.p;
    const s = pstate(sp.dataset.p);
    if (ln > s.maxLine) { s.maxLine = ln; clearTimeout(backT); return; }
    if (ln < s.maxLine) { clearTimeout(backT); backT = setTimeout(() => { s.back++; s.maxLine = ln; track('V04'); check(sp.dataset.p); }, 450); }
  });
  doc.addEventListener('keydown', e => {
    if (!st.focus) return;
    if (e.key === 'ArrowDown') { placeRuler(focusLine + 1); e.preventDefault(); }
    if (e.key === 'ArrowUp') { placeRuler(focusLine - 1); e.preventDefault(); }
  });
  let sMode = 'down', sExt = 0, firstScroll = null;
  doc.addEventListener('scroll', () => {
    const top = doc.scrollTop;
    if (firstScroll === null && openedAt) { firstScroll = (Date.now() - openedAt) / 1000; track('M09', +firstScroll.toFixed(0), 'set'); track('P07', +firstScroll.toFixed(0), 'set'); }
    if (sMode === 'down') { if (top > sExt) sExt = top; else if (top < sExt - 70) { sMode = 'up'; sExt = top; track('V01'); const k = focusedPara(); if (k) { pstate(k).regress++; check(k); } } }
    else { if (top < sExt) sExt = top; else if (top > sExt + 70) { sMode = 'down'; sExt = top; } }
    const cp = currentPage(); seenPages.add(cp);
    $$('#stPages button', root).forEach((b, i) => b.classList.toggle('is-on', i === cp));
    if (st.focus) placeRuler();
    clearTimeout(settleT); settleT = setTimeout(settled, 220);
  }, { passive: true });
  // after scrolling settles: which section is in view, and any sideways pan
  const PARA_KEYS = $$('.sp', root).map(p => p.dataset.p);
  let settleT = null, lastLeft = 0;
  function settled() {
    if (root.hidden) return;
    const k = focusedPara();
    const f = $('#sfig', root), fr = f && f.getBoundingClientRect(), mid = doc.getBoundingClientRect().top + doc.clientHeight * 0.45;
    const onFig = !!(fr && fr.top < mid && fr.bottom > mid);
    if (k) emit({ type: 'section', key: k, index: PARA_KEYS.indexOf(k), figure: onFig, cause: reading ? 'auto' : null });
    const dx = doc.scrollLeft - lastLeft;
    if (Math.abs(dx) >= 8) { emit({ type: 'pan', dx }); lastLeft = doc.scrollLeft; }
  }
  function focusedPara() {
    const mid = doc.getBoundingClientRect().top + doc.clientHeight * 0.45;
    let best = null, dist = 1e9;
    $$('.sp', root).forEach(p => { const r = p.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - mid); if (d < dist) { dist = d; best = p.dataset.p; } });
    return best;
  }
  const wordsIn = k => { const [a, b] = k.split('-'); return DOC.pages[a].paras[b].text.split(/\s+/).length; };
  let sessionSecs = 0;
  setInterval(() => {
    if (root.hidden || document.hidden) return;
    sessionSecs++;
    if (sessionSecs % 60 === 0) track('P01', Math.round(sessionSecs / 60), 'set');
    const k = focusedPara(); if (!k) return;
    const s = pstate(k); s.secs++;
    const ratio = s.secs / (wordsIn(k) / (230 / 60));
    track('V05', +Math.max(ERLY.liveValue ? ERLY.liveValue('V05') : 0, ratio).toFixed(1), 'set');
    check(k);
  }, 1000);
  let spikeAt = null;
  function check(k) {
    const s = pstate(k);
    const ratio = s.secs / (wordsIn(k) / (230 / 60));
    // Noticing is the companion's job now, and it only checks in with consent,
    // after repeated returns compared with the student's own baseline.
    if (!s.offered && (s.back + s.regress >= 3 || ratio > 3.2)) { s.offered = true; spikeAt = Date.now(); }
  }

  /* ================= speaking short lines (voice tests, glossary) ================= */
  let talkingNow = false;
  function talking(on) { talkingNow = on; if (on && !viz.raf) viz.raf = requestAnimationFrame(vizLoop); }
  function say(text) {
    const plain = text.replace(/<[^>]+>/g, '').replace(/\s*—\s*/g, ', ').replace(/→/g, 'then').replace(/×/g, 'times');
    if (!('speechSynthesis' in window) || reading) return;
    speechSynthesis.cancel();
    const parts = plain.match(/[^.!?]+[.!?]*/g) || [plain];
    parts.forEach((p, i) => {
      const u = utter(p.trim(), Math.max(0.86, st.rate * 0.98), Math.min(1.5, st.pitch * 1.04 + (i % 2 ? -.03 : .02)));
      u.onstart = () => talking(true);
      u.onboundary = e => { if (!e.name || e.name === 'word') vizWord(p.slice(e.charIndex).split(/\s/)[0] || 'a'); };
      u.onend = u.onerror = () => { if (i === parts.length - 1) talking(false); };
      speechSynthesis.speak(u);
    });
  }
  const paraOf = k => { const [a, b] = k.split('-').map(Number); return { pg: a, i: b, p: DOC.pages[a].paras[b] }; };
  function spotlight(k) {
    $$('.sp.is-spot', root).forEach(x => x.classList.remove('is-spot'));
    const el = k && $(`.sp[data-p="${k}"]`, root);
    if (el) { emit({ type: 'intent', why: 'companion' }); el.classList.add('is-spot'); el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }
  }
  function calm() {
    st.size = Math.max(st.size, 23); st.lh = Math.max(st.lh, 2.1); st.ls = Math.max(st.ls, .03); st.tint = 'cream'; st.font = 'lexend';
    syncControls(); track('V02'); track('V07'); tool('font'); apply();
  }
  function syncControls() {
    $('#stSize', root).value = st.size; $('#stLh', root).value = st.lh; $('#stLs', root).value = st.ls; $('#stWs', root).value = st.ws; $('#stW', root).value = st.width;
    $('#stFocus', root).checked = st.focus; $('#stAnch', root).checked = st.anchors;
    $$('#stFonts .fchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.font === st.font));
    $$('#stTints .tchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.tint === st.tint));
  }

  /* ================= the API the AI Reading Companion uses ================= */
  // Support tools run here, inside the reader, only when the student picks one.
  // Companion-made changes are marked so they never count as the student's own
  // format adjustments.
  const ACTIONS = {
    tts: k => { readParas([k || focusedPara()], Math.max(0.82, st.rate - 0.08)); },
    focus: k => { st.focus = true; syncControls(); apply(); track('V04'); tool('focus'); setTimeout(() => { const L = lines.findIndex(l => l.para === (k || focusedPara())); placeRuler(L >= 0 ? L : undefined); }, 320); },
    spacing: () => { st.lh = Math.max(st.lh, 2.1); st.ls = Math.max(st.ls, .04); st.ws = Math.max(st.ws, .15); syncControls(); track('V07'); tool('type'); apply(); },
    bigger: () => { st.size = Math.min(34, Math.max(st.size + 3, 22)); syncControls(); track('V02'); tool('type'); apply(); },
    zoom: () => { setZoom(Math.max(st.zoom, 1.25), { silent: true }); },
    tint: () => { st.tint = st.tint === 'cream' ? 'blue' : 'cream'; syncControls(); track('V07'); tool('tint'); apply(); },
    narrow: () => { st.width = Math.min(st.width, 540); syncControls(); apply(); },
    font: () => { st.font = 'lexend'; syncControls(); track('V07'); tool('font'); apply(); },
    calm: () => calm(),
    break: () => { stopSpeech(); track('P05'); tool('breather'); },
    terms: () => { track('M03', 0); tool('glossary'); },
    summary: () => { track('O07'); tool('summary'); },
    diagram: () => { tool('diagram'); emit({ type: 'intent', why: 'companion' }); $('#sfig', root).scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); },
    quiz: () => { tool('quiz'); track('Q02'); }
  };
  ERLY.reader = {
    on(fn) { if (!listeners.includes(fn)) listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    root, doc: DOC,
    isOpen: () => !root.hidden,
    isReading: () => !!reading,
    currentPara: () => focusedPara(),
    paraOf,
    paraLabel: k => { const { pg, i } = paraOf(k); return [`page ${pg + 1}, paragraph ${i + 1}`, `الصفحة ${pg + 1}، الفقرة ${i + 1}`]; },
    termsIn: k => (paraOf(k).p.text.match(/\[([^\]]+)\]/g) || []).map(x => x.slice(1, -1)).map(t => [t, DOC.terms[t]]).filter(x => x[1]),
    figSteps: () => DOC.pages[0].fig.steps,
    highlightFig: i => $$('#sfig [data-fs]', root).forEach(g => g.classList.toggle('is-hl', +g.dataset.fs === i)),
    spotlight,
    clearSpot: () => $$('.sp.is-spot', root).forEach(x => x.classList.remove('is-spot')),
    act(tool, k) { const f = ACTIONS[tool]; if (f) f(k); },
    stopReading: () => stopSpeech(),
    format: () => ({ font: st.font, size: st.size, lh: st.lh, ls: st.ls, ws: st.ws, width: st.width, tint: st.tint, focus: st.focus, zoom: st.zoom }),
    applyPrefs(p) { Object.keys(p || {}).forEach(k => { if (k in st && typeof p[k] === typeof st[k]) st[k] = p[k]; }); syncControls(); anchorize(); apply(); placeRuler(); },
    // what this reader can and cannot measure
    availability: { regression: true, zoom: true, zoomNote: 'reader zoom only; browser zoom and pinch-zoom cannot be measured', pan: true, panNote: 'only when the reader is zoomed in', format: true, tts: 'speechSynthesis' in window }
  };
  root.addEventListener('click', e => {
    const h = e.target.closest('[data-help]');
    if (h) { track('H07'); spotlight(h.dataset.help); ERLY.emit && ERLY.emit('companion:help', { para: h.dataset.help }); }
    if (e.target.closest('[data-fig]')) { track('H07'); ERLY.emit && ERLY.emit('companion:help', { figure: true }); }
  });

  I18N.onChange(() => { updateRec(); });
  ERLY.on && ERLY.on('track', updateRec);
  addEventListener('resize', () => { clearTimeout(indexLines.t); indexLines.t = setTimeout(indexLines, 250); });
  apply();
})();
