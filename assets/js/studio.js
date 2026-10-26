/* ERLY Reading Studio — full-screen reader with typography controls, read-aloud
   in any installed voice, a glossary, and Noor, a study buddy who notices when
   a paragraph is hard going and helps in a friendly, step-by-step way.
   Every interaction feeds the live indicators in tracker.js (only recorded
   once the student has started tracking). */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const DOC = window.STUDIO_DOC;
  const track = (id, v, m) => ERLY.track && ERLY.track(id, v, m);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const FONTS = [['classic', 'Classic', '"Fraunces", Georgia, serif'], ['lexend', 'Lexend', '"Lexend", sans-serif'], ['atkinson', 'Atkinson', '"Atkinson Hyperlegible", sans-serif'], ['andika', 'Andika', '"Andika", sans-serif'], ['sans', 'Sans', '"Instrument Sans", sans-serif']];
  const TINTS = [['paper', '#FFFFFF', '#1B1915'], ['cream', '#FBF3DF', '#2B2418'], ['blue', '#E3EEFA', '#14243A'], ['mint', '#E2F4EC', '#11291F'], ['rose', '#FBE7EA', '#331A1F'], ['night', '#1E1D24', '#E9E6F2']];
  const st = { font: 'classic', size: 19, lh: 1.75, ls: 0, ws: 0, width: 660, tint: 'paper', focus: false, anchors: false, voice: '', rate: 1, pitch: 1, hl: true, buddyVoice: true };

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
  const FIG = `<figure class="sfig" id="sfig"><svg viewBox="0 0 420 150" aria-hidden="true">
      <g data-fs="0"><rect x="120" y="16" width="180" height="118" rx="12" fill="none" stroke="currentColor" stroke-dasharray="6 6" stroke-width="2" opacity=".6"/></g>
      <path d="M170 52h80l18 44H152z" fill="currentColor" opacity=".12"/>
      <g data-fs="1"><path d="M20 60h118" stroke="var(--accent)" stroke-width="4" marker-end="url(#ah2)"/><text x="22" y="48" font-size="13" fill="currentColor">m, h in</text></g>
      <g data-fs="2"><path d="M210 96v40" stroke="var(--teal)" stroke-width="4" marker-end="url(#ah3)"/><text x="222" y="146" font-size="13" fill="currentColor">W out</text></g>
      <g data-fs="3"><path d="M282 84h118" stroke="var(--accent)" stroke-width="4" marker-end="url(#ah2)"/><text x="330" y="72" font-size="13" fill="currentColor">m, h out</text></g>
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
          <label class="field"><span class="mono">${T('Voice', 'الصوت')}</span><select id="stVoice"></select></label>
          <label class="slider slider--sm"><span><span>${T('Speed', 'السرعة')}</span><b class="mono" id="vRate2">1.00×</b></span><input type="range" id="stRate" min="0.6" max="1.5" step="0.05" value="1"></label>
          <label class="slider slider--sm"><span><span>${T('Pitch', 'طبقة الصوت')}</span><b class="mono" id="vPitch">1.00</b></span><input type="range" id="stPitch" min="0.6" max="1.5" step="0.05" value="1"></label>
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
              <ellipse class="noor__mouth" cx="60" cy="81" rx="7" ry="5" fill="#7A2E2A"/>
            </svg>
          </div>
          <div><b>Noor</b><small class="muted">${T('your study buddy · on this device', 'رفيقتك الدراسية · على هذا الجهاز')}</small></div>
          <span class="buddy__wave" id="noorWave"><i></i><i></i><i></i><i></i></span>
        </div>
        <div class="buddy__chat" id="stChat" aria-live="polite"></div>
      </aside>
    </div>
    <div class="term-pop" id="termPop" hidden></div>`;

  const doc = $('#stDoc', root), chat = $('#stChat', root);

  /* ================= open / close with a smooth reveal ================= */
  let opened = false, origin = null;
  function open(fromEl) {
    if (!root.hidden) return;
    const r = fromEl ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    origin = [r.left + r.width / 2, r.top + r.height / 2];
    root.style.setProperty('--ox', origin[0] + 'px');
    root.style.setProperty('--oy', origin[1] + 'px');
    root.hidden = false;
    document.documentElement.classList.add('studio-open');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
    if (!opened) { opened = true; firstVisit(); }
    setTimeout(() => { doc.focus({ preventScroll: true }); indexLines(); }, reduce ? 0 : 650);
    updateRec();
  }
  function close() {
    stopSpeech();
    root.classList.remove('is-open');
    document.documentElement.classList.remove('studio-open');
    setTimeout(() => { root.hidden = true; }, reduce ? 0 : 560);
  }
  ERLY.openStudio = open;
  document.addEventListener('click', e => { const b = e.target.closest('[data-studio]'); if (b) { e.preventDefault(); open(b); } });
  $('#stClose', root).addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) { if (!$('#termPop').hidden) return hidePop(); close(); } });
  $('#stToolsT', root).addEventListener('click', () => root.classList.toggle('show-tools'));
  $('#stBuddyT', root).addEventListener('click', () => root.classList.toggle('show-buddy'));
  function updateRec() { $('#stRec', root).innerHTML = ERLY.isTracking && ERLY.isTracking() ? `<i></i>${T('tracking on', 'التتبّع مفعّل')}` : `<i class="off"></i>${T('not tracking', 'لا تتبّع')}`; }

  /* ================= typography ================= */
  function apply() {
    const f = FONTS.find(x => x[0] === st.font)[2], t = TINTS.find(x => x[0] === st.tint);
    doc.style.setProperty('--pf', f); doc.style.setProperty('--ps', st.size + 'px'); doc.style.setProperty('--plh', st.lh);
    doc.style.setProperty('--pls', st.ls + 'em'); doc.style.setProperty('--pws', st.ws + 'em'); doc.style.setProperty('--pw', st.width + 'px');
    doc.style.setProperty('--pbg', t[1]); doc.style.setProperty('--pfg', t[2]);
    root.classList.toggle('is-focus', st.focus); root.classList.toggle('is-anchors', st.anchors);
    $('#vSz').textContent = st.size + 'px'; $('#vLh2').textContent = st.lh.toFixed(2); $('#vLs2').textContent = st.ls.toFixed(2); $('#vWs').textContent = st.ws.toFixed(2); $('#vW').textContent = st.width;
    clearTimeout(apply.t); apply.t = setTimeout(indexLines, 300);
  }
  const bind = (id, key, ind, fn) => $(id, root).addEventListener('input', e => { const old = st[key]; st[key] = +e.target.value; if (ind && (key !== 'size' || st.size > old)) track(ind); fn && fn(); apply(); });
  bind('#stSize', 'size', 'R06'); bind('#stLh', 'lh', 'R07'); bind('#stLs', 'ls', 'R07'); bind('#stWs', 'ws', 'R07'); bind('#stW', 'width');
  $('#stFonts', root).addEventListener('click', e => { const b = e.target.closest('[data-font]'); if (!b) return; st.font = b.dataset.font; $$('#stFonts .fchip', root).forEach(x => x.classList.toggle('is-on', x === b)); if (st.font !== 'classic') track('R10'); apply(); });
  $('#stTints', root).addEventListener('click', e => { const b = e.target.closest('[data-tint]'); if (!b) return; st.tint = b.dataset.tint; $$('#stTints .tchip', root).forEach(x => x.classList.toggle('is-on', x === b)); track('R08'); apply(); });
  $('#stFocus', root).addEventListener('change', e => { st.focus = e.target.checked; if (st.focus) track('R09'); apply(); placeRuler(); });
  $('#stAnch', root).addEventListener('change', e => { st.anchors = e.target.checked; anchorize(); apply(); });
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

  /* ================= voices & read-aloud ================= */
  let voices = [];
  function loadVoices() {
    if (!('speechSynthesis' in window)) { $('#stVoice', root).innerHTML = `<option>${T('Read-aloud not supported here', 'القراءة الصوتية غير مدعومة')}</option>`; return; }
    voices = speechSynthesis.getVoices();
    const groups = { en: [], ar: [], other: [] };
    voices.forEach((v, i) => { const k = /^en/i.test(v.lang) ? 'en' : /^ar/i.test(v.lang) ? 'ar' : 'other'; groups[k].push([i, v]); });
    const opt = ([i, v]) => `<option value="${i}">${v.name.replace(/Microsoft |Google /, '')} · ${v.lang}</option>`;
    $('#stVoice', root).innerHTML = voices.length
      ? `${groups.en.length ? `<optgroup label="English">${groups.en.map(opt).join('')}</optgroup>` : ''}${groups.ar.length ? `<optgroup label="العربية">${groups.ar.map(opt).join('')}</optgroup>` : ''}${groups.other.length ? `<optgroup label="${T('Other', 'أخرى')}">${groups.other.map(opt).join('')}</optgroup>` : ''}`
      : `<option value="">${T('Default voice', 'الصوت الافتراضي')}</option>`;
    const pref = groups.en.find(([, v]) => /female|samantha|aria|jenny|libby|sonia|google uk english female/i.test(v.name)) || groups.en[0];
    if (pref) { $('#stVoice', root).value = pref[0]; st.voice = pref[0]; }
  }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; } else loadVoices();
  $('#stVoice', root).addEventListener('change', e => { st.voice = e.target.value; });
  $('#stRate', root).addEventListener('input', e => { st.rate = +e.target.value; $('#vRate2').textContent = st.rate.toFixed(2) + '×'; if (st.rate < 0.9) track('A03'); });
  $('#stPitch', root).addEventListener('input', e => { st.pitch = +e.target.value; $('#vPitch').textContent = st.pitch.toFixed(2); });
  $('#stHl', root).addEventListener('change', e => { st.hl = e.target.checked; });
  $('#stBV', root).addEventListener('change', e => { st.buddyVoice = e.target.checked; });
  $('#stTest', root).addEventListener('click', () => say(T('Hi, I\'m Noor. This is how I sound.', 'مرحباً، أنا نور. هكذا يبدو صوتي.'), { buddy: true, force: true }));

  function utter(text, rate) {
    const u = new SpeechSynthesisUtterance(text);
    const v = voices[st.voice];
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
    u.rate = rate || st.rate; u.pitch = st.pitch;
    return u;
  }
  let reading = null, fallback = null;
  const played = {};
  function readParas(keys, rate) {
    if (!('speechSynthesis' in window)) return ERLY.toast(T('Read-aloud isn\'t supported in this browser', 'القراءة الصوتية غير مدعومة في هذا المتصفح'));
    stopSpeech();
    track('A01');
    const queue = keys.slice();
    reading = { queue };
    $('#stRead', root).classList.add('is-on');
    $('#stRead span', root).textContent = T('Stop', 'إيقاف');
    const next = () => {
      if (!reading || !queue.length) return stopSpeech();
      const key = queue.shift();
      played[key] = (played[key] || 0) + 1;
      if (played[key] > 1) track('A02');
      const box = $(`.sp[data-p="${key}"]`, root);
      box.classList.add('is-reading');
      box.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      const words = $$('.w', box);
      const text = words.map(w => w.dataset.raw).join(' ');
      const starts = []; let pos = 0; words.forEach(w => { starts.push(pos); pos += w.dataset.raw.length + 1; });
      const mark = i => { if (!st.hl) return; words.forEach(w => w.classList.remove('is-say')); if (words[i]) words[i].classList.add('is-say'); };
      let gotB = false, idx = -1;
      const u = utter(text, rate);
      u.onboundary = e => { if (e.name && e.name !== 'word') return; gotB = true; const i = starts.findIndex((s, k) => s <= e.charIndex && (starts[k + 1] === undefined || starts[k + 1] > e.charIndex)); if (i >= 0) { idx = i; mark(i); } };
      u.onend = u.onerror = () => { clearInterval(fallback); words.forEach(w => w.classList.remove('is-say')); box.classList.remove('is-reading'); if (reading) next(); };
      speechSynthesis.speak(u);
      clearInterval(fallback);
      setTimeout(() => { if (!gotB && reading) fallback = setInterval(() => { if (idx + 1 < words.length) mark(++idx); }, 60000 / (165 * (rate || st.rate))); }, 700);
    };
    next();
  }
  function stopSpeech() {
    reading = null; clearInterval(fallback);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    $$('.w.is-say', root).forEach(w => w.classList.remove('is-say'));
    $$('.sp.is-reading', root).forEach(w => w.classList.remove('is-reading'));
    $('#stRead', root).classList.remove('is-on'); $('#stRead span', root).textContent = T('Read page', 'اقرأ الصفحة');
    talking(false);
  }
  $('#stRead', root).addEventListener('click', () => {
    if (reading) return stopSpeech();
    const pg = currentPage();
    readParas(DOC.pages[pg].paras.map((_, j) => `${pg}-${j}`));
  });
  root.addEventListener('click', e => { const p = e.target.closest('[data-play]'); if (p) readParas([p.dataset.play]); });

  /* ================= pages ================= */
  function currentPage() {
    const mid = doc.getBoundingClientRect().top + doc.clientHeight / 2;
    let best = 0;
    $$('.spage', root).forEach((p, i) => { if (p.getBoundingClientRect().top < mid) best = i; });
    return best;
  }
  $('#stPages', root).addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (!b) return; const pg = $(`.spage[data-page="${b.dataset.goto}"]`, root); doc.scrollTo({ top: pg.offsetTop - 20, behavior: reduce ? 'auto' : 'smooth' }); });

  /* ================= glossary ================= */
  const pop = $('#termPop', root);
  function showTerm(el) {
    const t = el.dataset.term, d = DOC.terms[t]; if (!d) return;
    track('L02');
    const r = el.getBoundingClientRect();
    pop.innerHTML = `<b>${t}</b><p>${d[0]}</p><p class="term-pop__ar" lang="ar" dir="rtl">${d[1]}</p><div class="row-btns"><button class="btn btn--xs btn--ghost" data-say-term>${ICON('volume')} ${T('Hear it', 'استمع')}</button><button class="btn btn--xs btn--quiet" data-close-pop>${T('Close', 'إغلاق')}</button></div>`;
    pop.hidden = false;
    const left = Math.min(innerWidth - 320, Math.max(12, r.left + r.width / 2 - 150));
    const top = r.bottom + 10 + 200 > innerHeight ? r.top - 10 - pop.offsetHeight : r.bottom + 10;
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
    pop.classList.remove('is-in'); void pop.offsetWidth; pop.classList.add('is-in');
    $('[data-say-term]', pop).onclick = () => { track('L03'); say(`${t}. ${d[0]}`, { force: true }); };
    $('[data-close-pop]', pop).onclick = hidePop;
  }
  function hidePop() { pop.hidden = true; }
  root.addEventListener('click', e => { const t = e.target.closest('.term'); if (t) { e.stopPropagation(); showTerm(t); } else if (!e.target.closest('#termPop')) hidePop(); });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('term')) showTerm(e.target); });

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
  const P = {}; // per-paragraph tracking
  const pstate = k => (P[k] = P[k] || { back: 0, regress: 0, secs: 0, offered: false, maxLine: -1 });
  let backT = null;
  doc.addEventListener('pointermove', e => {
    const w = e.target.closest('.w'); if (!w) return;
    const ln = +w.dataset.line, sp = w.closest('.sp'); if (!sp) { if (st.focus) placeRuler(ln); return; }
    if (st.focus) placeRuler(ln);
    const s = pstate(sp.dataset.p);
    if (ln > s.maxLine) { s.maxLine = ln; clearTimeout(backT); return; }
    if (ln < s.maxLine) { clearTimeout(backT); backT = setTimeout(() => { s.back++; s.maxLine = ln; track('R02'); check(sp.dataset.p); }, 450); }
  });
  doc.addEventListener('keydown', e => {
    if (!st.focus) return;
    if (e.key === 'ArrowDown') { placeRuler(focusLine + 1); e.preventDefault(); }
    if (e.key === 'ArrowUp') { placeRuler(focusLine - 1); e.preventDefault(); }
  });
  let sMode = 'down', sExt = 0, firstScroll = null, openedAt = 0;
  doc.addEventListener('scroll', () => {
    const top = doc.scrollTop;
    if (firstScroll === null && openedAt) { firstScroll = (Date.now() - openedAt) / 1000; track('R12', +firstScroll.toFixed(1), 'set'); }
    if (sMode === 'down') { if (top > sExt) sExt = top; else if (top < sExt - 70) { sMode = 'up'; sExt = top; track('R01'); const k = focusedPara(); if (k) { pstate(k).regress++; check(k); } } }
    else { if (top < sExt) sExt = top; else if (top > sExt + 70) { sMode = 'down'; sExt = top; } }
    $$('#stPages button', root).forEach((b, i) => b.classList.toggle('is-on', i === currentPage()));
    if (st.focus) placeRuler();
  }, { passive: true });
  function focusedPara() {
    const mid = doc.getBoundingClientRect().top + doc.clientHeight * 0.45;
    let best = null, dist = 1e9;
    $$('.sp', root).forEach(p => { const r = p.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - mid); if (d < dist) { dist = d; best = p.dataset.p; } });
    return best;
  }
  const words = k => { const [a, b] = k.split('-'); return DOC.pages[a].paras[b].text.split(/\s+/).length; };
  setInterval(() => {
    if (root.hidden || document.hidden) return;
    const k = focusedPara(); if (!k) return;
    const s = pstate(k); s.secs++;
    const ratio = s.secs / (words(k) / (230 / 60));
    track('R03', +Math.max(ERLY.liveValue ? ERLY.liveValue('R03') : 0, ratio).toFixed(1), 'set');
    check(k);
  }, 1000);
  function check(k) {
    const s = pstate(k);
    const ratio = s.secs / (words(k) / (230 / 60));
    if (!s.offered && (s.back + s.regress >= 3 || ratio > 3.2)) { s.offered = true; offerHelp(k, s.back + s.regress >= 3 ? 'reread' : 'dwell'); }
  }

  /* ================= Noor, the study buddy ================= */
  const noor = $('#noor', root);
  let talkT = null;
  function talking(on, ms) {
    noor.classList.toggle('is-talking', on);
    $('#noorWave', root).classList.toggle('is-on', on);
    clearTimeout(talkT);
    if (on && ms) talkT = setTimeout(() => talking(false), ms);
  }
  function say(text, o = {}) {
    const plain = text.replace(/<[^>]+>/g, '');
    if ('speechSynthesis' in window && (st.buddyVoice || o.force) && !reading) {
      speechSynthesis.cancel();
      const u = utter(plain, Math.max(0.85, st.rate * 0.97));
      u.onstart = () => talking(true); u.onend = u.onerror = () => talking(false);
      speechSynthesis.speak(u);
      setTimeout(() => talking(false), 9000);
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
  function chips(list) {
    return new Promise(res => {
      const c = document.createElement('div');
      c.className = 'bchips';
      c.innerHTML = list.map(([k, l]) => `<button data-k="${k}">${l}</button>`).join('');
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
    await noorSays(T('Hi Acubins, I\'m <b>Noor</b>. Read the way that suits you — I\'ll check in if a part seems heavy. You can also tap <b>?</b> next to any paragraph, or a <span class="term-ex">highlighted word</span> for its meaning.', 'مرحباً أكيوبنز، أنا <b>نور</b>. اقرأ بالطريقة التي تناسبك — سأطمئن عليك إن بدا جزء ثقيلاً. يمكنك أيضاً النقر على <b>؟</b> بجانب أي فقرة، أو على <span class="term-ex">كلمة مميزة</span> لمعرفة معناها.'));
    const k = await chips([['tour', T('Show me the tools', 'أرني الأدوات')], ['read', T('I\'ll just read', 'سأقرأ فقط')]]);
    if (k === 'tour') {
      root.classList.add('show-tools');
      await noorSays(T('On the left you can change the font, size and spacing, tint the page, and pick any voice on your device for read-aloud. Try <b>Line focus</b> if lines blur together.', 'على اليسار يمكنك تغيير الخط والحجم والتباعد، وتلوين الصفحة، واختيار أي صوت على جهازك للقراءة. جرّب <b>تركيز السطر</b> إن تداخلت الأسطر.'));
    } else await noorSays(T('Perfect. I\'m right here.', 'ممتاز. أنا هنا.'), { speak: false });
  }

  async function offerHelp(k, why) {
    if (busy) return;
    busy = true;
    root.classList.add('show-buddy');
    spotlight(k);
    await noorSays(why === 'help'
      ? T('Sure — let\'s look at this part together.', 'بالتأكيد — لننظر إلى هذا الجزء معاً.')
      : why === 'reread' ? T('This paragraph seems to be taking a few passes. That\'s completely normal with dense reading. Want to go through it together?', 'يبدو أن هذه الفقرة تأخذ أكثر من قراءة. هذا طبيعي تماماً مع القراءة الكثيفة. هل نمرّ عليها معاً؟')
        : T('You\'ve been on this paragraph a little while. Want a hand with it?', 'بقيت على هذه الفقرة لبعض الوقت. هل تريد مساعدة؟'));
    if (why !== 'help') { const go = await chips([['yes', T('Yes, let\'s', 'نعم، هيا')], ['no', T('Not now', 'ليس الآن')]]); if (go === 'no') { await noorSays(T('No problem. I\'ll be here.', 'لا مشكلة. سأكون هنا.'), { speak: false }); busy = false; return; } }
    await helpLoop(k);
    busy = false;
  }
  async function helpLoop(k) {
    const { pg, p } = paraOf(k);
    await noorSays(T('What feels tricky?', 'ما الذي يبدو صعباً؟'));
    const opts = [['word', T('A word I don\'t know', 'كلمة لا أعرفها')], ['idea', T('The whole idea', 'الفكرة كاملة')]];
    if (pg === 0) opts.push(['fig', T('The diagram', 'الرسم التوضيحي')]);
    opts.push(['tired', T('I\'m just tired', 'أنا متعب فقط')]);
    const c = await chips(opts);
    if (c === 'word') {
      const ts = (p.text.match(/\[([^\]]+)\]/g) || []).map(x => x.slice(1, -1));
      track('L02', ts.length);
      await noorSays(T('Here are the key words in that paragraph:', 'إليك الكلمات المهمة في هذه الفقرة:') + `<div class="bterms">${ts.map(t => `<div class="bterm"><b>${t}</b><span>${DOC.terms[t][0]}</span><small lang="ar" dir="rtl">${DOC.terms[t][1]}</small></div>`).join('')}</div>`, { speak: false });
      say(ts.map(t => `${t}: ${DOC.terms[t][0]}`).join(' '));
      await afterHelp(k);
    } else if (c === 'idea') {
      await explain(k);
    } else if (c === 'fig') {
      await diagram();
      await afterHelp(k);
    } else {
      track('S04');
      await noorSays(T('Fair enough — tired brains read slower. What would help most?', 'معك حق — الدماغ المتعب يقرأ أبطأ. ما الذي سيساعد أكثر؟'));
      const t = await chips([['break', T('A 5-minute breather', 'استراحة ٥ دقائق')], ['read', T('Read it to me', 'اقرأها لي')], ['calm', T('Bigger, calmer text', 'نص أكبر وأهدأ')]]);
      if (t === 'break') await breather();
      else if (t === 'read') { readParas([k], Math.max(0.85, st.rate - 0.1)); await noorSays(T('Reading it now, a little slower.', 'أقرؤها الآن، أبطأ قليلاً.'), { speak: false }); }
      else { calm(); await noorSays(T('Done — bigger text, more space, a softer page.', 'تم — نص أكبر، ومساحة أوسع، وصفحة أهدأ.')); }
      await askHelped();
    }
  }
  async function explain(k) {
    const { p } = paraOf(k);
    track('L05');
    await noorSays(T('Here it is in three short lines:', 'إليك الفكرة في ثلاثة أسطر قصيرة:') + `<ol class="bsum">${p.sum.map(s => `<li>${s}</li>`).join('')}</ol>`, { speak: false });
    say(p.sum.join(' '));
    const n = await chips([['check', T('Quick check?', 'فحص سريع؟')], ['slow', T('Read the paragraph slowly', 'اقرأ الفقرة ببطء')], ['still', T('Still confusing', 'ما زالت مربكة')]]);
    if (n === 'check') await quiz(k);
    else if (n === 'slow') { readParas([k], 0.82); await noorSays(T('Reading it slowly — follow the highlighted words.', 'أقرؤها ببطء — تابع الكلمات المميزة.'), { speak: false }); await askHelped(); }
    else {
      st.focus = true; $('#stFocus', root).checked = true; apply(); track('R09');
      await noorSays(T('Let\'s take it one line at a time. I\'ve turned on <b>line focus</b> — move down with your mouse or the ↓ key, and I\'ll read along.', 'لنأخذها سطراً سطراً. فعّلت <b>تركيز السطر</b> — انزل بالفأرة أو بمفتاح ↓ وسأقرأ معك.'));
      readParas([k], 0.82);
      await askHelped();
    }
  }
  async function quiz(k) {
    const { p } = paraOf(k);
    const order = [0, 1, 2].sort(() => Math.random() - .5);
    let tries = 0;
    const m = await noorSays(`<p class="bq">${p.check.q}</p><div class="bopts">${order.map(i => `<button data-o="${i}">${p.check.opts[i]}</button>`).join('')}</div>`, { speak: false });
    say(p.check.q);
    await new Promise(res => {
      m.addEventListener('click', async e => {
        const b = e.target.closest('[data-o]'); if (!b || b.disabled) return;
        tries++;
        if (+b.dataset.o === p.check.a) {
          $$('[data-o]', m).forEach(x => { x.disabled = true; });
          b.classList.add('is-ok');
          track('S02', tries === 1 ? 100 : 50, 'set');
          window.FUN && FUN.confetti(b, 18);
          await noorSays(T('Exactly! ', 'تماماً! ') + p.check.why);
          res();
        } else {
          b.classList.add('is-no'); b.disabled = true;
          track('S03');
          await noorSays(T('Not quite — and that\'s fine. Have another look; one of the others fits better.', 'ليس تماماً — ولا بأس. انظر مجدداً؛ أحد الخيارات الأخرى أنسب.'));
        }
      });
    });
    await askHelped();
  }
  async function diagram() {
    const steps = DOC.pages[0].fig.steps;
    $('#sfig', root).scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    for (let i = 0; i < steps.length; i++) {
      $$('#sfig [data-fs]', root).forEach(g => g.classList.toggle('is-hl', +g.dataset.fs === i));
      await noorSays(`<span class="bstep">${i + 1}</span>${steps[i]}`);
      if (i < steps.length - 1) { const c = await chips([['n', T('Next', 'التالي')], ['x', T('Got it', 'فهمت')]]); if (c === 'x') break; }
    }
    $$('#sfig [data-fs]', root).forEach(g => g.classList.remove('is-hl'));
  }
  async function breather() {
    const m = await noorSays(`${T('Breathe with me. In as it grows, out as it shrinks.', 'تنفّس معي. شهيق حين يكبر، وزفير حين يصغر.')}<div class="breath"><i></i><b class="mono" id="brT">5:00</b></div>`);
    let left = 300;
    const iv = setInterval(() => { left--; const el = $('#brT', m); if (!el || left <= 0) { clearInterval(iv); return; } el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }, 1000);
  }
  function calm() {
    st.size = Math.max(st.size, 23); st.lh = Math.max(st.lh, 2.1); st.ls = Math.max(st.ls, .03); st.tint = 'cream'; st.font = 'lexend';
    $('#stSize', root).value = st.size; $('#stLh', root).value = st.lh; $('#stLs', root).value = st.ls;
    $$('#stFonts .fchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.font === 'lexend'));
    $$('#stTints .tchip', root).forEach(x => x.classList.toggle('is-on', x.dataset.tint === 'cream'));
    track('R06'); track('R07'); track('R10'); apply();
  }
  async function afterHelp(k) {
    const n = await chips([['check', T('Quick check?', 'فحص سريع؟')], ['sum', T('Explain the whole idea', 'اشرح الفكرة كاملة')], ['done', T('Back to reading', 'العودة للقراءة')]]);
    if (n === 'check') await quiz(k);
    else if (n === 'sum') await explain(k);
    else await askHelped();
  }
  async function askHelped() {
    await wait(400);
    const m = await noorSays(`${T('Did that help?', 'هل ساعد ذلك؟')}<div class="bfaces"><button data-f="1">${ICON('smile')}<small>${T('yes', 'نعم')}</small></button><button data-f="0.5">${ICON('meh')}<small>${T('a bit', 'قليلاً')}</small></button><button data-f="0">${ICON('frown')}<small>${T('not really', 'ليس فعلاً')}</small></button></div>`, { speak: false });
    await new Promise(res => m.addEventListener('click', async function onFace(e) {
      const b = e.target.closest('[data-f]'); if (!b || b.disabled) return;
      m.removeEventListener('click', onFace);
      $$('[data-f]', m).forEach(x => { x.disabled = true; x.classList.toggle('is-on', x === b); });
      if (b.dataset.f === '0') { track('S05'); await noorSays(T('Thanks for telling me. Next time I\'ll try a different way first — and SAS can help too, whenever you like.', 'شكراً لإخباري. في المرة القادمة سأجرب طريقة مختلفة أولاً — ويمكن لخدمات الطلبة المساعدة أيضاً متى شئت.')); }
      else await noorSays(T('Lovely. I\'ll remember what worked. Keep going — you\'re doing well.', 'رائع. سأتذكر ما نجح. استمر — أنت تبلي حسناً.'));
      $$('.sp.is-spot', root).forEach(x => x.classList.remove('is-spot'));
      res();
    }));
  }
  root.addEventListener('click', e => {
    const h = e.target.closest('[data-help]');
    if (h) { track('S01'); if (busy) { root.classList.add('show-buddy'); return; } pstate(h.dataset.help).offered = true; offerHelp(h.dataset.help, 'help'); }
    if (e.target.closest('[data-fig]') && !busy) { busy = true; root.classList.add('show-buddy'); track('S01'); diagram().then(() => { busy = false; }); }
  });

  I18N.onChange(() => { updateRec(); });
  ERLY.on && ERLY.on('track', updateRec);
  addEventListener('resize', () => { clearTimeout(indexLines.t); indexLines.t = setTimeout(indexLines, 250); });
  apply();
})();
