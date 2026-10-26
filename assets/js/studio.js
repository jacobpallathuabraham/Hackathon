/* ERLY Reading Studio — full-screen reader with typography controls, natural
   read-aloud in any installed voice with a live voice wave, a glossary, and
   Noor, a study buddy who notices when a paragraph is hard going and offers
   one-tap help in the moment. Every interaction feeds the live indicators in
   tracker.js (recorded only once the student has signed the Support Pact). */
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
  const st = { font: 'classic', size: 19, lh: 1.75, ls: 0, ws: 0, width: 660, tint: 'paper', focus: false, anchors: false, voice: '', style: 'friendly', rate: 0.96, pitch: 1.06, hl: true, buddyVoice: true };

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
    </svg><figcaption>${DOC.pages[0].fig.cap}</figcaption><button class="sfig__help" data-fig>${ICON('search')} Explain this diagram</button></figure>`;

  root.innerHTML = `
    <header class="studio__top">
      <button class="studio__close" id="stClose" aria-label="Close the Reading Studio">${ICON('x')}</button>
      <div class="studio__file">${ICON('file')}<span><b>${DOC.title}</b><small>${DOC.course}</small></span></div>
      <div class="studio__pages" id="stPages">${DOC.pages.map((p, i) => `<button data-goto="${i}" class="${i === 0 ? 'is-on' : ''}">${i + 1}</button>`).join('')}</div>
      <div class="studio__acts">
        <span class="studio__rec" id="stRec"></span>
        <button class="btn btn--sm btn--accent" id="stRead">${ICON('volume')}<span>${T('Read page', 'اقرأ الصفحة')}</span></button>
        <button class="icon-btn studio__tgl" id="stToolsT" aria-label="Text and voice settings">${ICON('text')}</button>
        <button class="icon-btn studio__tgl" id="stBuddyT" aria-label="Study buddy">${ICON('chat')}</button>
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
          <label class="switch-row"><span><b>${T('Noor speaks aloud', 'نور تتحدث بصوت')}</b></span><input type="checkbox" id="stBV" checked><i></i></label>
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

      <aside class="studio__buddy" id="stBuddy">
        <div class="buddy__hero">
          <div class="noor" id="noor" aria-hidden="true">
            <span class="noor__ring"></span><span class="noor__ring noor__ring--2"></span>
            <svg viewBox="0 0 120 120" class="noor__svg">
              <defs><radialGradient id="ng" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#FFE3B8"/><stop offset=".6" stop-color="#F6B97A"/><stop offset="1" stop-color="#E8895A"/></radialGradient></defs>
              <circle cx="60" cy="62" r="44" fill="url(#ng)"/>
              <path d="M24 52c4-22 22-34 40-33 18 1 30 12 33 26-9-8-22-12-36-11-14 1-27 7-37 18z" fill="#5B3A2E"/>
              <g class="noor__eyes"><ellipse cx="46" cy="62" rx="5" ry="6.5" fill="#2A2622"/><ellipse cx="74" cy="62" rx="5" ry="6.5" fill="#2A2622"/><circle cx="47.6" cy="59.6" r="1.8" fill="#fff"/><circle cx="75.6" cy="59.6" r="1.8" fill="#fff"/></g>
              <path class="noor__brow" d="M39 50q7-4 14 0M67 50q7-4 14 0" fill="none" stroke="#5B3A2E" stroke-width="2.6" stroke-linecap="round"/>
              <ellipse cx="38" cy="75" rx="6" ry="3.4" fill="#E86F5B" opacity=".45"/><ellipse cx="82" cy="75" rx="6" ry="3.4" fill="#E86F5B" opacity=".45"/>
              <path class="noor__smile" d="M50 79q10 8 20 0" fill="none" stroke="#2A2622" stroke-width="3" stroke-linecap="round"/>
              <ellipse class="noor__mouth" id="noorMouth" cx="60" cy="81" rx="7" ry="5" fill="#7A2E2A"/>
            </svg>
          </div>
          <div><b>Noor</b><small class="muted">${T('your study buddy · on this device', 'رفيقتك الدراسية · على هذا الجهاز')}</small></div>
          <canvas class="buddy__wave" id="noorWave" aria-hidden="true"></canvas>
        </div>
        <div class="buddy__chat" id="stChat" aria-live="polite"></div>
      </aside>
    </div>
    <div class="term-pop" id="termPop" hidden></div>`;

  const doc = $('#stDoc', root), chat = $('#stChat', root);

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
    if (!opened) { opened = true; firstVisit(); }
    setTimeout(() => { doc.focus({ preventScroll: true }); indexLines(); }, reduce ? 0 : 650);
    updateRec();
  }
  function close() {
    if (root.hidden) return;
    stopSpeech();
    if (busyPara) track('V09');
    root.classList.remove('is-open');
    document.documentElement.classList.remove('studio-open');
    setTimeout(() => { if (!root.classList.contains('is-open')) root.hidden = true; }, reduce ? 0 : 560);
  }
  ERLY.openStudio = open;
  document.addEventListener('click', e => { const b = e.target.closest('[data-studio]'); if (b) { e.preventDefault(); open(b); } });
  $('#stClose', root).addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) { if (!$('#termPop', root).hidden) return hidePop(); close(); } });
  $('#stToolsT', root).addEventListener('click', () => { root.classList.toggle('show-tools'); root.classList.remove('show-buddy'); });
  $('#stBuddyT', root).addEventListener('click', () => { root.classList.toggle('show-buddy'); root.classList.remove('show-tools'); });
  function updateRec() { $('#stRec', root).innerHTML = ERLY.isTracking && ERLY.isTracking() ? `<i></i>${T('tracking on', 'التتبّع مفعّل')}` : `<i class="off"></i>${T('not tracking', 'لا تتبّع')}`; }

  /* ================= typography ================= */
  function apply() {
    const f = FONTS.find(x => x[0] === st.font)[2], t = TINTS.find(x => x[0] === st.tint);
    doc.style.setProperty('--pf', f); doc.style.setProperty('--ps', st.size + 'px'); doc.style.setProperty('--plh', st.lh);
    doc.style.setProperty('--pls', st.ls + 'em'); doc.style.setProperty('--pws', st.ws + 'em'); doc.style.setProperty('--pw', st.width + 'px');
    doc.style.setProperty('--pbg', t[1]); doc.style.setProperty('--pfg', t[2]);
    root.classList.toggle('is-focus', st.focus); root.classList.toggle('is-anchors', st.anchors);
    $('#vSz', root).textContent = st.size + 'px'; $('#vLh2', root).textContent = st.lh.toFixed(2); $('#vLs2', root).textContent = st.ls.toFixed(2); $('#vWs', root).textContent = st.ws.toFixed(2); $('#vW', root).textContent = st.width;
    clearTimeout(apply.t); apply.t = setTimeout(indexLines, 300);
  }
  const bind = (id, key, ind, fn) => $(id, root).addEventListener('input', e => { const old = st[key]; st[key] = +e.target.value; if (ind && (key !== 'size' || st.size > old)) { track(ind); tool('type'); } fn && fn(); apply(); });
  bind('#stSize', 'size', 'V02'); bind('#stLh', 'lh', 'V07'); bind('#stLs', 'ls', 'V07'); bind('#stWs', 'ws', 'V07'); bind('#stW', 'width');
  $('#stFonts', root).addEventListener('click', e => { const b = e.target.closest('[data-font]'); if (!b) return; st.font = b.dataset.font; $$('#stFonts .fchip', root).forEach(x => x.classList.toggle('is-on', x === b)); if (st.font !== 'classic') { track('V07'); tool('font'); } apply(); });
  $('#stTints', root).addEventListener('click', e => { const b = e.target.closest('[data-tint]'); if (!b) return; st.tint = b.dataset.tint; $$('#stTints .tchip', root).forEach(x => x.classList.toggle('is-on', x === b)); track('V07'); tool('tint'); apply(); });
  $('#stFocus', root).addEventListener('change', e => { st.focus = e.target.checked; if (st.focus) { track('V04'); tool('focus'); } apply(); placeRuler(); });
  $('#stAnch', root).addEventListener('change', e => { st.anchors = e.target.checked; if (st.anchors) tool('anchors'); anchorize(); apply(); });
  $('#stReset', root).addEventListener('click', () => {
    Object.assign(st, { font: 'classic', size: 19, lh: 1.75, ls: 0, ws: 0, width: 660, tint: 'paper', focus: false, anchors: false });
    [['#stSize', 19], ['#stLh', 1.75], ['#stLs', 0], ['#stWs', 0], ['#stW', 660]].forEach(([i, v]) => { $(i, root).value = v; });
    $('#stFocus', root).checked = false; $('#stAnch', root).checked = false;
    $$('#stFonts .fchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.font === 'classic'));
    $$('#stTints .tchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.tint === 'paper'));
    anchorize(); apply(); placeRuler();
  });

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
  $('#stBV', root).addEventListener('change', e => { st.buddyVoice = e.target.checked; });
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
  }, { passive: true });
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
    if (!s.offered && (s.back + s.regress >= 3 || ratio > 3.2)) { s.offered = true; spikeAt = Date.now(); offerHelp(k, s.back + s.regress >= 3 ? 'reread' : 'dwell'); }
  }

  /* ================= Noor, the study buddy ================= */
  const noor = $('#noor', root);
  let talkT = null, talkingNow = false;
  function talking(on, ms) {
    talkingNow = on;
    noor.classList.toggle('is-talking', on);
    if (on && !viz.raf) viz.raf = requestAnimationFrame(vizLoop);
    clearTimeout(talkT);
    if (on && ms) talkT = setTimeout(() => talking(false), ms);
  }
  // Noor speaks like a friend: plain words, a warm pitch, small pauses.
  function say(text, o = {}) {
    const plain = text.replace(/<[^>]+>/g, '').replace(/\s*—\s*/g, ', ').replace(/→/g, 'then').replace(/×/g, 'times');
    if ('speechSynthesis' in window && (st.buddyVoice || o.force) && !reading) {
      speechSynthesis.cancel();
      const parts = plain.match(/[^.!?]+[.!?]*/g) || [plain];
      parts.forEach((p, i) => {
        const u = utter(p.trim(), Math.max(0.86, st.rate * 0.98), Math.min(1.5, st.pitch * 1.04 + (i % 2 ? -.03 : .02)));
        u.onstart = () => talking(true);
        u.onboundary = e => { if (!e.name || e.name === 'word') { const w = p.slice(e.charIndex).split(/\s/)[0] || 'a'; vizWord(w); } };
        u.onend = u.onerror = () => { if (i === parts.length - 1) talking(false); };
        speechSynthesis.speak(u);
      });
      setTimeout(() => { if (!speechSynthesis.speaking) talking(false); }, 12000);
    } else talking(true, Math.min(2600, 500 + plain.length * 30));
  }
  async function noorSays(html, opts = {}) {
    const typing = document.createElement('div');
    typing.className = 'bm bm--noor bm--typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    chat.appendChild(typing); scrollChat();
    await wait(reduce ? 0 : Math.min(900, 300 + html.length * 6));
    typing.remove();
    const m = document.createElement('div');
    m.className = 'bm bm--noor';
    m.innerHTML = html;
    chat.appendChild(m);
    if (opts.speak !== false) say(html);
    scrollChat();
    return m;
  }
  function you(text) { const m = document.createElement('div'); m.className = 'bm bm--you'; m.textContent = text; chat.appendChild(m); scrollChat(); }
  function chips(list, cls = '') {
    return new Promise(res => {
      const c = document.createElement('div');
      c.className = 'bchips ' + cls;
      c.innerHTML = list.map(([k, l, ic]) => `<button data-k="${k}">${ic ? ICON(ic) : ''}<span>${l}</span></button>`).join('');
      chat.appendChild(c); scrollChat();
      c.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; c.remove(); you(b.textContent); res(b.dataset.k); });
    });
  }
  function scrollChat() { chat.scrollTo({ top: chat.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }); }
  const paraOf = k => { const [a, b] = k.split('-').map(Number); return { pg: a, i: b, p: DOC.pages[a].paras[b] }; };
  function spotlight(k) {
    $$('.sp.is-spot', root).forEach(x => x.classList.remove('is-spot'));
    const el = $(`.sp[data-p="${k}"]`, root);
    if (el) { el.classList.add('is-spot'); el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }
  }
  let busy = false;

  async function firstVisit() {
    openedAt = Date.now();
    await wait(reduce ? 0 : 900);
    await noorSays(T('Hey Acubins! I’m <b>Noor</b>. Read however feels comfy — if a bit gets heavy, I’ll check in. You can also tap <b>?</b> next to any paragraph, or a <span class="term-ex">highlighted word</span> to see what it means.', 'أهلاً أكيوبنز! أنا <b>نور</b>. اقرأ بالطريقة المريحة لك — وإن ثقل جزء ما سأطمئن عليك. يمكنك أيضاً النقر على <b>؟</b> بجانب أي فقرة، أو على <span class="term-ex">كلمة مميزة</span> لمعرفة معناها.'));
    const k = await chips([['tour', T('Show me around', 'عرّفني بالأدوات')], ['read', T('I’ll just read', 'سأقرأ فقط')]]);
    if (k === 'tour') {
      root.classList.add('show-tools');
      await noorSays(T('On the left you can change the font, size and spacing, tint the page, and pick a voice — the ones with a ★ sound the most natural. If lines start to blur, try <b>Line focus</b>.', 'على اليسار يمكنك تغيير الخط والحجم والتباعد، وتلوين الصفحة، واختيار صوت — الأصوات المميزة بـ ★ هي الأكثر طبيعية. وإن تداخلت الأسطر، جرّب <b>تركيز السطر</b>.'));
    } else await noorSays(T('Perfect. I’m right here if you need me.', 'ممتاز. أنا هنا إن احتجتني.'), { speak: false });
  }

  // In-the-moment rescue: one tap, before anything else
  async function offerHelp(k, why) {
    if (busy) return;
    busy = true;
    root.classList.add('show-buddy');
    spotlight(k);
    if (why !== 'help' && spikeAt) track('H03', 0, 'set');
    await noorSays(why === 'help'
      ? T('Sure — let’s look at this bit together. What would help most?', 'بالتأكيد — لننظر إلى هذا الجزء معاً. ما الذي سيساعد أكثر؟')
      : why === 'reread' ? T('Looks like this paragraph is taking a few passes — totally normal with dense stuff. Want a hand?', 'يبدو أن هذه الفقرة تأخذ أكثر من قراءة — طبيعي تماماً مع النصوص الكثيفة. هل تريد مساعدة؟')
        : T('You’ve been on this one for a bit. Want me to help?', 'بقيت على هذه الفقرة قليلاً. هل أساعدك؟'));
    const c = await chips([['tts', T('Read it to me', 'اقرأها لي'), 'volume'], ['font', T('Easier font', 'خط أسهل'), 'text'], ['focus', T('Line focus', 'تركيز السطر'), 'ruler'], ['summary', T('Short summary', 'ملخص قصير'), 'file'], ['more', T('Something else…', 'شيء آخر…'), 'chat'], ['no', T('I’m okay', 'أنا بخير'), '']], 'bchips--rescue');
    if (why !== 'help' && spikeAt) track('H03', Math.round((Date.now() - spikeAt) / 1000), 'set');
    if (c === 'no') { await noorSays(T('Cool — I’m here if you change your mind.', 'تمام — أنا هنا إن غيّرت رأيك.'), { speak: false }); busy = false; return; }
    await rescue(k, c);
    busy = false;
  }
  const speechDone = async () => { const t0 = Date.now(); await wait(400); while (reading && Date.now() - t0 < 90000) await wait(300); };
  async function rescue(k, c) {
    const { pg, p } = paraOf(k);
    if (c === 'tts') {
      readParas([k], Math.max(0.82, st.rate - 0.08));
      await noorSays(T('Reading it now, a little slower. Follow the glowing words.', 'أقرؤها الآن، أبطأ قليلاً. تابع الكلمات المضيئة.'), { speak: false });
      await speechDone();
      return askHelped('tts');
    }
    if (c === 'font') { calm(); await noorSays(T('Done — a calmer font, bigger text and a softer page. Better?', 'تم — خط أهدأ ونص أكبر وصفحة ألطف. أفضل؟')); return askHelped('font'); }
    if (c === 'focus') {
      st.focus = true; $('#stFocus', root).checked = true; apply(); track('V04');
      const L = lines.findIndex(l => l.para === k); if (L >= 0) placeRuler(L);
      await noorSays(T('Line focus is on — move down with your mouse or the ↓ key, one line at a time.', 'تركيز السطر مفعّل — انزل بالفأرة أو بمفتاح ↓ سطراً سطراً.'));
      return askHelped('focus');
    }
    if (c === 'summary') return explain(k);
    // "something else" — a single-tap cause (the micro-nudge cause mix)
    await noorSays(T('No problem. What’s making it tricky?', 'لا مشكلة. ما الذي يجعلها صعبة؟'));
    const opts = [['dense', T('Too dense', 'كثيفة جداً')], ['lost', T('Lost my place', 'أضعت مكاني')], ['word', T('A word', 'كلمة')], ['tired', T('I’m tired', 'أنا متعب')]];
    if (pg === 0) opts.splice(3, 0, ['fig', T('The diagram', 'الرسم')]);
    const why = await chips(opts);
    track('H07');
    if (why === 'dense') return explain(k);
    if (why === 'lost') { st.focus = true; $('#stFocus', root).checked = true; apply(); readParas([k], 0.84); await noorSays(T('Let’s start this paragraph from the top together — I’ll read, you follow the line.', 'لنبدأ الفقرة من أولها معاً — أنا أقرأ وأنت تتابع السطر.'), { speak: false }); await speechDone(); return askHelped('focus'); }
    if (why === 'word') {
      const ts = (p.text.match(/\[([^\]]+)\]/g) || []).map(x => x.slice(1, -1));
      track('M03', 0);
      await noorSays(T('Here are the key words in that paragraph:', 'إليك الكلمات المهمة في هذه الفقرة:') + `<div class="bterms">${ts.map(t => `<div class="bterm"><b>${t}</b><span>${DOC.terms[t][0]}</span><small lang="ar" dir="rtl">${DOC.terms[t][1]}</small></div>`).join('')}</div>`, { speak: false });
      say(ts.map(t => `${t}: ${DOC.terms[t][0]}`).join(' '));
      return afterHelp(k, 'terms');
    }
    if (why === 'fig') { await diagram(); return afterHelp(k, 'diagram'); }
    await noorSays(T('Fair — a tired brain reads slower. What sounds good?', 'معك حق — الدماغ المتعب يقرأ أبطأ. ما الذي يبدو مناسباً؟'));
    const t = await chips([['break', T('5-minute breather', 'استراحة ٥ دقائق')], ['read', T('Read it to me', 'اقرأها لي')], ['calm', T('Bigger, calmer text', 'نص أكبر وأهدأ')]]);
    if (t === 'break') { await breather(); return askHelped('breather'); }
    if (t === 'read') return rescue(k, 'tts');
    return rescue(k, 'font');
  }
  async function explain(k) {
    const { p } = paraOf(k);
    track('O07'); tool('summary');
    await noorSays(T('Here it is in three short lines:', 'إليك الفكرة في ثلاثة أسطر قصيرة:') + `<ol class="bsum">${p.sum.map(s => `<li>${s}</li>`).join('')}</ol>`, { speak: false });
    say(T('Okay, so basically. ', 'حسناً، باختصار. ') + p.sum.join(' '));
    const n = await chips([['check', T('Quick check?', 'فحص سريع؟')], ['slow', T('Read the paragraph slowly', 'اقرأ الفقرة ببطء')], ['still', T('Still confusing', 'ما زالت مربكة')]]);
    if (n === 'check') return quiz(k);
    if (n === 'slow') { readParas([k], 0.82); await noorSays(T('Reading it slowly — follow the glowing words.', 'أقرؤها ببطء — تابع الكلمات المضيئة.'), { speak: false }); await speechDone(); return askHelped('summary'); }
    st.focus = true; $('#stFocus', root).checked = true; apply(); track('V04');
    await noorSays(T('Let’s take it one line at a time. I’ve switched on <b>line focus</b> and I’ll read along with you.', 'لنأخذها سطراً سطراً. فعّلت <b>تركيز السطر</b> وسأقرأ معك.'));
    readParas([k], 0.82);
    await speechDone();
    return askHelped('summary');
  }
  async function quiz(k) {
    const { p } = paraOf(k);
    const order = [0, 1, 2].sort(() => Math.random() - .5);
    let tries = 0;
    tool('quiz');
    const m = await noorSays(`<p class="bq">${p.check.q}</p><div class="bopts">${order.map(i => `<button data-o="${i}">${p.check.opts[i]}</button>`).join('')}</div>`, { speak: false });
    say(T('Quick one, no pressure. ', 'سؤال سريع، بلا ضغط. ') + p.check.q);
    await new Promise(res => {
      m.addEventListener('click', async e => {
        const b = e.target.closest('[data-o]'); if (!b || b.disabled) return;
        tries++;
        track('Q02');
        if (+b.dataset.o === p.check.a) {
          $$('[data-o]', m).forEach(x => { x.disabled = true; });
          b.classList.add('is-ok');
          window.FUN && FUN.confetti(b, 18);
          await noorSays(T('Yes! Nailed it. ', 'نعم! أحسنت. ') + p.check.why);
          res();
        } else {
          b.classList.add('is-no'); b.disabled = true;
          await noorSays(T('Not quite — and that’s totally fine. Have another look; one of the others fits better.', 'ليس تماماً — ولا بأس أبداً. انظر مجدداً؛ أحد الخيارات الأخرى أنسب.'));
        }
      });
    });
    return askHelped('quiz');
  }
  async function diagram() {
    const steps = DOC.pages[0].fig.steps;
    tool('diagram');
    $('#sfig', root).scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    for (let i = 0; i < steps.length; i++) {
      $$('#sfig [data-fs]', root).forEach(g => g.classList.toggle('is-hl', +g.dataset.fs === i));
      await noorSays(`<span class="bstep">${i + 1}</span>${steps[i]}`);
      if (i < steps.length - 1) { const c = await chips([['n', T('Next', 'التالي')], ['x', T('Got it', 'فهمت')]]); if (c === 'x') break; }
    }
    $$('#sfig [data-fs]', root).forEach(g => g.classList.remove('is-hl'));
  }
  async function breather() {
    tool('breather');
    const m = await noorSays(`${T('Breathe with me — in as it grows, out as it shrinks.', 'تنفّس معي — شهيق حين يكبر، وزفير حين يصغر.')}<div class="breath"><i></i><b class="mono" data-br>5:00</b></div>`);
    let left = 300;
    const iv = setInterval(() => { left--; const el = $('[data-br]', m); if (!el || left <= 0) { clearInterval(iv); return; } el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }, 1000);
    track('P05');
  }
  function calm() {
    st.size = Math.max(st.size, 23); st.lh = Math.max(st.lh, 2.1); st.ls = Math.max(st.ls, .03); st.tint = 'cream'; st.font = 'lexend';
    $('#stSize', root).value = st.size; $('#stLh', root).value = st.lh; $('#stLs', root).value = st.ls;
    $$('#stFonts .fchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.font === 'lexend'));
    $$('#stTints .tchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.tint === 'cream'));
    track('V02'); track('V07'); tool('font'); apply();
  }
  async function afterHelp(k, t) {
    const n = await chips([['check', T('Quick check?', 'فحص سريع؟')], ['sum', T('Explain the whole idea', 'اشرح الفكرة كاملة')], ['done', T('Back to reading', 'العودة للقراءة')]]);
    if (n === 'check') return quiz(k);
    if (n === 'sum') return explain(k);
    return askHelped(t);
  }
  // Did-it-help loop — feeds the coping-effectiveness indicator and the insight
  const helpedScore = [];
  async function askHelped(t) {
    await wait(400);
    const m = await noorSays(`${T('Did that help?', 'هل ساعد ذلك؟')}<div class="bfaces"><button data-f="1">${ICON('smile')}<small>${T('yes', 'نعم')}</small></button><button data-f="0.5">${ICON('meh')}<small>${T('a bit', 'قليلاً')}</small></button><button data-f="0">${ICON('frown')}<small>${T('not really', 'ليس فعلاً')}</small></button></div>`, { speak: false });
    say(T('Did that help?', 'هل ساعد ذلك؟'));
    await new Promise(res => m.addEventListener('click', async function onFace(e) {
      const b = e.target.closest('[data-f]'); if (!b || b.disabled) return;
      m.removeEventListener('click', onFace);
      $$('[data-f]', m).forEach(x => { x.disabled = true; x.classList.toggle('is-on', x === b); });
      const v = +b.dataset.f;
      helpedScore.push(v);
      track('H02', Math.round(helpedScore.reduce((a, c) => a + c, 0) / helpedScore.length * 100), 'set');
      ERLY.helped && ERLY.helped(t, v);
      if (v === 0) await noorSays(T('Thanks for telling me. Next time I’ll try a different way first — and SAS is always there too, whenever you want.', 'شكراً لإخباري. في المرة القادمة سأجرب طريقة مختلفة أولاً — وخدمات الطلبة موجودة دائماً متى شئت.'));
      else await noorSays(T('Love that. I’ll remember what worked for you. Keep going — you’re doing great.', 'رائع. سأتذكر ما نجح معك. استمر — أنت تبلي بلاءً حسناً.'));
      $$('.sp.is-spot', root).forEach(x => x.classList.remove('is-spot'));
      res();
    }));
  }
  root.addEventListener('click', e => {
    const h = e.target.closest('[data-help]');
    if (h) { track('H07'); if (busy) { root.classList.add('show-buddy'); return; } pstate(h.dataset.help).offered = true; offerHelp(h.dataset.help, 'help'); }
    if (e.target.closest('[data-fig]') && !busy) { busy = true; root.classList.add('show-buddy'); track('H07'); diagram().then(() => askHelped('diagram')).then(() => { busy = false; }); }
  });

  I18N.onChange(() => { updateRec(); });
  ERLY.on && ERLY.on('track', updateRec);
  addEventListener('resize', () => { clearTimeout(indexLines.t); indexLines.t = setTimeout(indexLines, 250); });
  apply();
})();
