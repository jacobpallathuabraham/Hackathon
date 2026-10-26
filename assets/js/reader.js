/* ERLY — the sample PDF reader. Everything is adjustable (font, size, spacing,
   tint), it reads aloud with word highlighting, and it notices — locally —
   when a short paragraph is being re-read more than usual, then offers help
   gently. Nothing leaves the browser. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const F = window.FUN;

  const DOC = {
    en: {
      course: 'MECH 210 · Thermodynamics I', page: 'Week 4 reading · p. 12', h: '4.1  Energy that moves with matter',
      p: 'When a fluid flows through a turbine, it carries energy across the boundary of the system. Engineers call the region they study a control volume. In steady flow, the mass entering each second equals the mass leaving, so nothing builds up inside. The energy carried by the moving fluid includes its internal energy and the work needed to push it in, which together form a property called enthalpy. This is why most turbine problems begin with a table lookup rather than a calculation.',
      fig: 'Figure 4.3 — A control volume around a steam turbine. Mass and energy cross the dashed boundary.'
    },
    ar: {
      course: 'هندسة ميكانيكية ٢١٠ · الديناميكا الحرارية ١', page: 'قراءة الأسبوع ٤ · ص ١٢', h: '٤٫١  الطاقة التي تتحرك مع المادة',
      p: 'عندما يتدفق مائع عبر توربين، فإنه يحمل الطاقة عبر حدود النظام. يسمّي المهندسون المنطقة التي يدرسونها حجم التحكم. في التدفق المستقر، تساوي الكتلة الداخلة في كل ثانية الكتلة الخارجة، فلا يتراكم شيء في الداخل. وتشمل الطاقة التي يحملها المائع المتحرك طاقته الداخلية والشغل اللازم لدفعه إلى الداخل، ويشكّلان معاً خاصية تسمى الإنثالبي. ولهذا تبدأ معظم مسائل التوربينات بالبحث في جدول لا بالحساب.',
      fig: 'الشكل ٤٫٣ — حجم تحكم حول توربين بخاري. تعبر الكتلة والطاقة الحدود المتقطعة.'
    }
  };
  const FONTS = [
    ['classic', 'Classic', '"Fraunces", Georgia, serif'],
    ['lexend', 'Lexend', '"Lexend", sans-serif'],
    ['atkinson', 'Atkinson', '"Atkinson Hyperlegible", sans-serif'],
    ['andika', 'Andika', '"Andika", sans-serif']
  ];
  const TINTS = [['paper', '#FFFFFF', '#1B1915'], ['cream', '#FBF3DF', '#2B2418'], ['blue', '#E3EEFA', '#14243A'], ['mint', '#E2F4EC', '#11291F'], ['rose', '#FBE7EA', '#331A1F'], ['night', '#1E1D24', '#E9E6F2']];
  const LIMIT = 3; // passes before the gentle check-in

  const st = { lang: 'en', font: 'classic', size: 19, lh: 1.7, ls: 0, tint: 'paper', focus: false, anchors: false, rate: 0.95 };
  const R = { passesBack: 0, regress: 0, secs: 0, maxLine: 0, nudged: false, snoozeUntil: 0, helped: null };

  const page = $('#pdfPage'), view = $('#pdfView');

  function render() {
    const d = DOC[st.lang];
    const words = d.p.split(/\s+/);
    page.dir = st.lang === 'ar' ? 'rtl' : 'ltr';
    page.lang = st.lang;
    page.innerHTML = `
      <header class="pdf__hdr"><span>${d.course}</span><span>${d.page}</span></header>
      <h3 class="pdf__h">${d.h}</h3>
      <p class="pdf__p" id="pdfPara">${words.map((w, i) => `<span class="w" data-i="${i}">${st.anchors && st.lang === 'en' ? anchor(w) : w}</span>`).join(' ')}</p>
      <figure class="pdf__fig"><svg viewBox="0 0 320 110" aria-hidden="true"><rect x="96" y="14" width="128" height="82" rx="10" fill="none" stroke="currentColor" stroke-dasharray="5 5" opacity=".5"/><path d="M130 40h60l12 30h-84z" fill="currentColor" opacity=".14"/><path d="M20 46h96M204 66h96" stroke="var(--accent)" stroke-width="3" marker-end="url(#ah)"/><defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0l8 4-8 4z" fill="var(--accent)"/></marker></defs><text x="20" y="36" font-size="11" fill="currentColor" opacity=".7">m, h in</text><text x="250" y="88" font-size="11" fill="currentColor" opacity=".7">m, h out</text><text x="146" y="60" font-size="11" fill="currentColor" opacity=".7">W →</text></svg><figcaption>${d.fig}</figcaption></figure>
      <footer class="pdf__ftr"><span>12</span></footer>`;
    applyStyle();
    requestAnimationFrame(indexLines);
  }
  function anchor(w) {
    const m = w.match(/^([A-Za-z]+)(.*)$/);
    if (!m) return w;
    const k = Math.ceil(m[1].length * 0.45);
    return `<b>${m[1].slice(0, k)}</b>${m[1].slice(k)}${m[2]}`;
  }
  function applyStyle() {
    const f = FONTS.find(x => x[0] === st.font)[2];
    const t = TINTS.find(x => x[0] === st.tint);
    page.style.setProperty('--pf', st.lang === 'ar' && st.font === 'classic' ? 'var(--f-ar)' : (st.lang === 'ar' ? 'var(--f-ar)' : f));
    page.style.setProperty('--ps', st.size + 'px');
    page.style.setProperty('--plh', st.lh);
    page.style.setProperty('--pls', st.ls + 'em');
    page.style.setProperty('--pbg', t[1]);
    page.style.setProperty('--pfg', t[2]);
    $('#pdf').classList.toggle('is-focus', st.focus);
    $('#vSize').textContent = st.size + 'px';
    $('#vLh').textContent = st.lh.toFixed(1);
    $('#vLs').textContent = st.ls.toFixed(2);
    $('#zoomLbl').textContent = Math.round(st.size / 19 * 100) + '%';
    clearTimeout(applyStyle.t);
    applyStyle.t = setTimeout(indexLines, 250);
  }

  /* ---------- controls ---------- */
  $('#fontChips').innerHTML = FONTS.map(f => `<button class="fchip ${f[0] === st.font ? 'is-on' : ''}" data-font="${f[0]}" style="font-family:${f[2]}">${f[1]}<small>Aa</small></button>`).join('');
  $('#tintChips').innerHTML = TINTS.map(t => `<button class="tchip ${t[0] === st.tint ? 'is-on' : ''}" data-tint="${t[0]}" style="--bg:${t[1]};--fg:${t[2]}" aria-label="${t[0]} page">A</button>`).join('');
  $('#fontChips').addEventListener('click', e => { const b = e.target.closest('[data-font]'); if (!b) return; st.font = b.dataset.font; $$('#fontChips .fchip').forEach(x => x.classList.toggle('is-on', x === b)); applyStyle(); used('font'); });
  $('#tintChips').addEventListener('click', e => { const b = e.target.closest('[data-tint]'); if (!b) return; st.tint = b.dataset.tint; $$('#tintChips .tchip').forEach(x => x.classList.toggle('is-on', x === b)); applyStyle(); used('tint'); });
  $('#rSize').addEventListener('input', e => { st.size = +e.target.value; applyStyle(); used('size'); });
  $('#rLh').addEventListener('input', e => { st.lh = +e.target.value; applyStyle(); used('spacing'); });
  $('#rLs').addEventListener('input', e => { st.ls = +e.target.value; applyStyle(); used('spacing'); });
  $('#rRate').addEventListener('input', e => { st.rate = +e.target.value; $('#vRate').textContent = st.rate.toFixed(2) + '×'; if (speaking) { stopSpeech(); speak(); } });
  $('#tFocus').addEventListener('change', e => { st.focus = e.target.checked; applyStyle(); placeRuler(); used('focus'); });
  $('#tAnchor').addEventListener('change', e => { st.anchors = e.target.checked; render(); used('anchors'); });
  $$('#pdfLang button').forEach(b => b.addEventListener('click', () => {
    $$('#pdfLang button').forEach(x => x.classList.toggle('is-on', x === b));
    st.lang = b.dataset.l; stopSpeech(); resetTrack(); render();
  }));
  $('#rReset').addEventListener('click', () => {
    Object.assign(st, { font: 'classic', size: 19, lh: 1.7, ls: 0, tint: 'paper', focus: false, anchors: false });
    $('#rSize').value = 19; $('#rLh').value = 1.7; $('#rLs').value = 0; $('#tFocus').checked = false; $('#tAnchor').checked = false;
    $$('#fontChips .fchip').forEach(x => x.classList.toggle('is-on', x.dataset.font === 'classic'));
    $$('#tintChips .tchip').forEach(x => x.classList.toggle('is-on', x.dataset.tint === 'paper'));
    render();
  });
  const usedSet = new Set();
  function used(k) { usedSet.add(k); $('#mTools').textContent = usedSet.size; }

  /* ---------- read aloud with word highlighting ---------- */
  let speaking = false, fallback = null, gotBoundary = false;
  function speak() {
    if (!('speechSynthesis' in window)) { ERLY.toast(T('Read-aloud isn\'t supported in this browser', 'القراءة الصوتية غير مدعومة في هذا المتصفح')); return; }
    stopSpeech();
    const words = $$('.w', page);
    const text = words.map(w => w.textContent).join(' ');
    const starts = []; let pos = 0;
    words.forEach(w => { starts.push(pos); pos += w.textContent.length + 1; });
    const u = new SpeechSynthesisUtterance(text);
    u.lang = st.lang === 'ar' ? 'ar-SA' : 'en-GB';
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(st.lang));
    if (v) u.voice = v;
    u.rate = st.rate;
    let idx = -1;
    const mark = i => { words.forEach(w => w.classList.remove('is-say')); if (words[i]) { words[i].classList.add('is-say'); idx = i; } };
    u.onboundary = e => {
      if (e.name && e.name !== 'word') return;
      gotBoundary = true;
      let i = starts.findIndex((s, k) => s <= e.charIndex && (starts[k + 1] === undefined || starts[k + 1] > e.charIndex));
      if (i >= 0) mark(i);
    };
    u.onend = u.onerror = () => stopSpeech();
    speaking = true; gotBoundary = false;
    $('#rSpeak').classList.add('is-on');
    $('#rSpeak .lbl').textContent = T('Pause', 'إيقاف');
    speechSynthesis.speak(u);
    // some voices don't emit word boundaries — estimate instead
    const msPerWord = 60000 / (165 * st.rate);
    setTimeout(() => {
      if (!speaking || gotBoundary) return;
      fallback = setInterval(() => { if (idx + 1 >= words.length) return clearInterval(fallback); mark(idx + 1); }, msPerWord);
    }, 700);
    used('read-aloud');
  }
  function stopSpeech() {
    speaking = false;
    clearInterval(fallback);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    $$('.w.is-say', page).forEach(w => w.classList.remove('is-say'));
    const b = $('#rSpeak'); b.classList.remove('is-on'); $('.lbl', b).textContent = T('Read it to me', 'اقرأه لي');
  }
  $('#rSpeak').addEventListener('click', () => speaking ? stopSpeech() : speak());

  /* ---------- line focus ---------- */
  let lines = [];
  function indexLines() {
    const ws = $$('.w', page);
    lines = [];
    let lastTop = null;
    ws.forEach(w => {
      const top = w.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 4) { lines.push({ top, h: w.offsetHeight, words: [] }); lastTop = top; }
      lines[lines.length - 1].words.push(w);
      w.dataset.line = lines.length - 1;
    });
    placeRuler();
  }
  let focusLine = 0;
  function placeRuler(lineIdx) {
    const r = $('#pdfRuler');
    if (!st.focus || !lines.length) { r.style.opacity = 0; return; }
    if (lineIdx != null) focusLine = Math.max(0, Math.min(lines.length - 1, lineIdx));
    const L = lines[focusLine];
    const pr = page.getBoundingClientRect(), vr = view.getBoundingClientRect();
    r.style.opacity = 1;
    r.style.top = (pr.top - vr.top + view.scrollTop + L.top - 6) + 'px';
    r.style.height = (L.h + 12) + 'px';
  }
  page.addEventListener('pointermove', e => {
    const w = e.target.closest('.w');
    if (!w) return;
    const ln = +w.dataset.line;
    if (st.focus) placeRuler(ln);
    trackLine(ln);
  });
  view.addEventListener('keydown', e => {
    if (!st.focus) return;
    if (e.key === 'ArrowDown') { placeRuler(focusLine + 1); trackLine(focusLine); e.preventDefault(); }
    if (e.key === 'ArrowUp') { placeRuler(focusLine - 1); trackLine(focusLine); e.preventDefault(); }
  });

  /* ---------- re-read tracking (local only) ---------- */
  let backTimer = null;
  function trackLine(ln) {
    if (ln > R.maxLine) { R.maxLine = ln; clearTimeout(backTimer); return; }
    if (ln < R.maxLine - 0 && R.maxLine >= 1) {
      clearTimeout(backTimer);
      // count a re-read only if the reader settles on the earlier line
      backTimer = setTimeout(() => { R.passesBack++; R.maxLine = ln; update(); }, 450);
    }
  }
  const S = { mode: 'down', extreme: 0 };
  view.addEventListener('scroll', () => {
    const top = view.scrollTop;
    if (S.mode === 'down') { if (top > S.extreme) S.extreme = top; else if (top < S.extreme - 60) { S.mode = 'up'; S.extreme = top; R.regress++; update(); } }
    else { if (top < S.extreme) S.extreme = top; else if (top > S.extreme + 60) { S.mode = 'down'; S.extreme = top; } }
    placeRuler();
  }, { passive: true });

  let inView = false;
  new IntersectionObserver(es => { inView = es[0].isIntersecting; }, { threshold: 0.5 }).observe(page);
  setInterval(() => { if (inView && !document.hidden) { R.secs++; update(); } }, 1000);

  function expectedSecs() {
    const n = DOC[st.lang].p.split(/\s+/).length;
    return Math.round(n / (230 / 60)); // ~230 words per minute
  }
  function passes() {
    const exp = expectedSecs();
    const byTime = Math.floor(R.secs / exp);
    return Math.max(1 + R.passesBack + R.regress, byTime);
  }
  function update() {
    const p = passes(), exp = expectedSecs();
    $('#mPasses').textContent = p;
    $('#mPassDots').innerHTML = Array.from({ length: Math.max(LIMIT + 1, p) }, (_, i) => `<i class="${i < p ? 'is-on' : ''} ${i >= LIMIT ? 'is-over' : ''}"></i>`).join('');
    $('#mTime').textContent = Math.floor(R.secs / 60) + ':' + String(R.secs % 60).padStart(2, '0');
    $('#mExp').textContent = '~' + exp + 's';
    $('#mTimeBar').style.width = Math.min(100, R.secs / (exp * (LIMIT + 1)) * 100) + '%';
    if (p >= LIMIT && !R.nudged && Date.now() > R.snoozeUntil) showNudge();
  }
  function resetTrack() { Object.assign(R, { passesBack: 0, regress: 0, secs: 0, maxLine: 0, nudged: false, snoozeUntil: 0 }); hideNudge(); update(); }
  $('#rTrackReset').addEventListener('click', resetTrack);

  /* ---------- the gentle check-in ---------- */
  const nudge = $('#nudgeCard');
  function showNudge() {
    R.nudged = true;
    F.sfx.soft();
    nudge.hidden = false;
    nudge.innerHTML = `
      <div class="nudge-card__top">${F.mascot('happy', 'm-idle m-wave')}<button class="nudge-card__x" aria-label="Close">×</button></div>
      <p class="nudge-card__h">${T('Hey — this paragraph is taking a few passes.', 'مرحباً — هذه الفقرة تأخذ أكثر من قراءة.')}</p>
      <p class="nudge-card__p">${T('That\'s completely normal with dense reading. Want a hand?', 'هذا طبيعي تماماً مع القراءة الكثيفة. هل تريد مساعدة؟')}</p>
      <div class="nudge-card__opts">
        <button data-help="read">${ICON('volume')} ${T('Read it to me', 'اقرأها لي')}</button>
        <button data-help="big">${ICON('text')} ${T('Bigger & airier', 'أكبر وأوسع')}</button>
        <button data-help="focus">${ICON('ruler')} ${T('One line at a time', 'سطر واحد في كل مرة')}</button>
        <button data-help="fine" class="is-quiet">${T('I\'m fine, just thinking', 'أنا بخير، أفكر فقط')}</button>
      </div>
      <p class="nudge-card__priv">${ICON('lock')} ${T('Noticed on this device only. Nobody else is told.', 'لوحظ على هذا الجهاز فقط. لا يُبلَّغ أحد.')}</p>`;
    requestAnimationFrame(() => nudge.classList.add('is-in'));
  }
  function hideNudge() { nudge.classList.remove('is-in'); setTimeout(() => { nudge.hidden = true; }, 350); }
  nudge.addEventListener('click', e => {
    if (e.target.closest('.nudge-card__x')) { hideNudge(); R.snoozeUntil = Date.now() + 60000; return; }
    const b = e.target.closest('[data-help]');
    if (b) {
      const h = b.dataset.help;
      if (h === 'read') speak();
      if (h === 'big') { st.size = 24; st.lh = 2.1; st.ls = 0.04; st.font = 'lexend'; $('#rSize').value = 24; $('#rLh').value = 2.1; $('#rLs').value = 0.04; $$('#fontChips .fchip').forEach(x => x.classList.toggle('is-on', x.dataset.font === 'lexend')); applyStyle(); used('size'); }
      if (h === 'focus') { st.focus = true; $('#tFocus').checked = true; applyStyle(); placeRuler(0); used('focus'); }
      if (h === 'fine') { hideNudge(); R.snoozeUntil = Date.now() + 120000; ERLY.toast(T('Got it. Take your time.', 'حسناً. خذ وقتك.')); return; }
      // a gentle follow-up a little later
      nudge.innerHTML = `<div class="nudge-card__top">${F.mascot('happy', 'm-idle')}</div><p class="nudge-card__h">${T('Done! I\'ll check back in a moment.', 'تم! سأعود إليك بعد قليل.')}</p>`;
      setTimeout(hideNudge, 1400);
      setTimeout(() => askHelped(h), 9000);
    }
    const y = e.target.closest('[data-felt]');
    if (y) {
      R.helped = y.dataset.felt;
      nudge.innerHTML = `<div class="nudge-card__top">${F.mascot(y.dataset.felt === 'better' ? 'wow' : 'happy', 'm-idle')}</div><p class="nudge-card__h">${y.dataset.felt === 'better' ? T('Lovely. I\'ll offer that first next time.', 'رائع. سأقترح ذلك أولاً في المرة القادمة.') : T('Thanks — I\'ll try something different next time.', 'شكراً — سأجرب شيئاً مختلفاً في المرة القادمة.')}</p>`;
      if (y.dataset.felt === 'better') F.confetti(nudge, 16);
      setTimeout(hideNudge, 1800);
    }
  });
  function askHelped(tool) {
    nudge.hidden = false;
    nudge.innerHTML = `<div class="nudge-card__top">${F.mascot('think', 'm-idle')}</div>
      <p class="nudge-card__h">${T('Did that make it easier?', 'هل جعل ذلك الأمر أسهل؟')}</p>
      <div class="nudge-card__faces"><button data-felt="better">${ICON('smile')}<small>${T('easier', 'أسهل')}</small></button><button data-felt="same">${ICON('meh')}<small>${T('same', 'نفسه')}</small></button><button data-felt="worse">${ICON('frown')}<small>${T('not really', 'ليس فعلاً')}</small></button></div>`;
    requestAnimationFrame(() => nudge.classList.add('is-in'));
  }

  /* ---------- demo: simulate a reader going back over lines ---------- */
  $('#rSimulate').addEventListener('click', async () => {
    resetTrack();
    view.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const ghost = $('#ghost');
    ghost.hidden = false;
    const seq = [0, 1, 2, 1, 2, 3, 2, 1, 2, 3, 4, 3];
    for (const ln of seq) {
      if (!lines[ln]) continue;
      const w = lines[ln].words[Math.floor(lines[ln].words.length / 2)];
      const pr = view.getBoundingClientRect(), wr = w.getBoundingClientRect();
      ghost.style.transform = `translate(${wr.left - pr.left + view.scrollLeft}px, ${wr.top - pr.top + view.scrollTop + wr.height / 2}px)`;
      await new Promise(r => setTimeout(r, 380));
      trackLine(ln);
      await new Promise(r => setTimeout(r, 520));
      if (R.nudged) break;
    }
    ghost.hidden = true;
  });

  I18N.onChange(() => { stopSpeech(); update(); });
  addEventListener('resize', () => { clearTimeout(indexLines.t); indexLines.t = setTimeout(indexLines, 200); });
  addEventListener('beforeunload', stopSpeech);
  document.fonts && document.fonts.ready.then(indexLines);
  render(); update();
})();
