/* ERLY — site behaviour: theme, language, navigation, reveals, command
   palette, pitch timer, impact calculator and the live reader. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => Math.round(n).toLocaleString('en-US');

  /* ---------- tiny event bus shared with prototype.js ---------- */
  const bus = {};
  window.ERLY = {
    state: { blueprint: null },
    on(evt, fn) { (bus[evt] = bus[evt] || []).push(fn); },
    emit(evt, data) { (bus[evt] || []).forEach(fn => fn(data)); },
    toast
  };

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
  }

  /* ---------- language ---------- */
  I18N.apply(I18N.lang);
  $('#langToggle').addEventListener('click', toggleLang);
  function toggleLang() {
    I18N.apply(I18N.lang === 'ar' ? 'en' : 'ar');
    toast(T('Switched to English', 'تم التبديل إلى العربية'));
  }

  /* ---------- theme ---------- */
  const themeBtn = $('#themeToggle');
  themeBtn.addEventListener('click', e => toggleTheme(e));
  function toggleTheme(e) {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    const set = () => {
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('erly-theme', next); } catch (err) {}
    };
    if (!document.startViewTransition || reduceMotion) return set();
    const r = themeBtn.getBoundingClientRect();
    const x = e && e.clientX ? e.clientX : r.left + r.width / 2;
    const y = e && e.clientY ? e.clientY : r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(set).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  }

  /* ---------- nav: stuck state, burger, current section, progress ---------- */
  const nav = $('#nav');
  const links = $('.nav__links');
  const burger = $('#burger');
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
  });
  links.addEventListener('click', e => {
    if (e.target.closest('a')) { links.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
  });

  const bar = $('.progress span');
  const rail = $('.journey__rail span');
  const journey = $('.journey');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      nav.classList.toggle('is-stuck', y > 12);
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      if (journey) {
        const r = journey.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
        rail.style.setProperty('--p', p.toFixed(3));
      }
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = $$('.nav__links a');
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) sectionObs.observe(s); });

  /* ---------- reveal on scroll, with sibling stagger ---------- */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      revealObs.unobserve(en.target);
      $$('.count', en.target).forEach(countUp);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => {
    const sibs = Array.from(el.parentElement.children).filter(c => c.classList.contains('reveal'));
    const i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', Math.min(i * 0.07, 0.42) + 's');
    revealObs.observe(el);
  });

  function countUp(el) {
    const to = parseFloat(el.dataset.to);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const prefix = el.dataset.prefix || '';
    if (reduceMotion) { el.textContent = prefix + to.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1600;
    (function frame(t) {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      el.textContent = prefix + (to * e).toFixed(dec);
      if (k < 1) requestAnimationFrame(frame);
    })(t0);
  }

  /* ---------- command palette ---------- */
  const cmd = $('#cmd'), cmdInput = $('#cmdInput'), cmdList = $('#cmdList');
  let cmdSel = 0, cmdItems = [];
  const go = id => () => $(id).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  function commands() {
    return [
      { label: T('The gap: 94% vs 17.6%', 'الفجوة: ٩٤٪ مقابل ١٧٫٦٪'), hint: '01', run: go('#gap') },
      { label: T('How it works', 'آلية العمل'), hint: '02', run: go('#flow') },
      { label: T('Play the 5-day challenge', 'العب تحدي الأيام الخمسة'), hint: '03', run: go('#challenge') },
      { label: T('Your private result', 'نتيجتك الخاصة'), hint: '04', run: go('#result') },
      { label: T('The 2-week watch', 'المتابعة لأسبوعين'), hint: '05', run: go('#watch') },
      { label: T('Your insight', 'رؤيتك'), hint: '06', run: go('#insight') },
      { label: T('Get support — book SAS', 'احصل على الدعم — احجز موعداً'), hint: '06', run: go('#handoff') },
      { label: T('The PDF reader', 'قارئ PDF'), hint: '08', run: go('#try') },
      { label: T('The science', 'العلم وراءه'), hint: '08', run: go('#science') },
      { label: T('Privacy', 'الخصوصية'), hint: '09', run: go('#privacy') },
      { label: T('For SAS', 'لخدمات الطلبة'), hint: '10', run: go('#sas') },
      { label: T('Impact & 90-day plan', 'الأثر وخطة ٩٠ يوماً'), hint: '11', run: go('#data') },
      { label: T('Hard questions', 'أسئلة صعبة'), hint: '12', run: go('#faq') },
      { label: T('Load sample: “closer look” result', 'حمّل مثالاً: «تستحق نظرة أقرب»'), hint: T('demo', 'عرض'), run: () => ERLY.emit('sample', 'closer') },
      { label: T('Load sample: “doing fine” result', 'حمّل مثالاً: «أنت بخير»'), hint: T('demo', 'عرض'), run: () => ERLY.emit('sample', 'fine') },
      { label: T('Toggle dark / light', 'بدّل الوضع الداكن / الفاتح'), hint: 'T', run: () => toggleTheme() },
      { label: T('Switch to Arabic / English', 'بدّل إلى العربية / الإنجليزية'), hint: 'L', run: toggleLang },
      { label: T('Start 5-minute pitch timer', 'ابدأ مؤقت العرض'), hint: 'P', run: startPitch }
    ];
  }
  function openCmd() {
    cmd.hidden = false;
    cmdInput.value = '';
    cmdInput.placeholder = T('Jump to a section or action…', 'انتقل إلى قسم أو إجراء…');
    renderCmd();
    setTimeout(() => cmdInput.focus(), 10);
  }
  function closeCmd() { cmd.hidden = true; }
  function renderCmd() {
    const q = cmdInput.value.trim().toLowerCase();
    cmdItems = commands().filter(c => !q || c.label.toLowerCase().includes(q));
    cmdSel = Math.min(cmdSel, Math.max(0, cmdItems.length - 1));
    cmdList.innerHTML = cmdItems.map((c, i) =>
      `<li role="option" data-i="${i}" class="${i === cmdSel ? 'is-sel' : ''}"><span>${c.label}</span><small>${c.hint}</small></li>`
    ).join('') || `<li><span class="muted">${T('Nothing found', 'لا نتائج')}</span></li>`;
  }
  function runCmd(i) { const c = cmdItems[i]; if (!c) return; closeCmd(); c.run(); }
  $('#cmdOpen').addEventListener('click', openCmd);
  cmdInput.addEventListener('input', () => { cmdSel = 0; renderCmd(); });
  cmdList.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) runCmd(+li.dataset.i); });
  cmdList.addEventListener('mousemove', e => {
    const li = e.target.closest('li[data-i]');
    if (li && +li.dataset.i !== cmdSel) { cmdSel = +li.dataset.i; renderCmd(); }
  });
  cmd.addEventListener('click', e => { if (e.target === cmd) closeCmd(); });
  cmdInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { cmdSel = (cmdSel + 1) % Math.max(1, cmdItems.length); renderCmd(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { cmdSel = (cmdSel - 1 + cmdItems.length) % Math.max(1, cmdItems.length); renderCmd(); e.preventDefault(); }
    else if (e.key === 'Enter') runCmd(cmdSel);
  });

  /* ---------- keyboard shortcuts ---------- */
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmd.hidden ? openCmd() : closeCmd(); return; }
    if (e.key === 'Escape') { if (!cmd.hidden) closeCmd(); return; }
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.body.classList.contains('is-playing')) return;
    const k = e.key.toLowerCase();
    if (k === 't') toggleTheme();
    else if (k === 'l') toggleLang();
    else if (k === 'p') $('#pitch').hidden ? startPitch() : stopPitch();
  });

  /* ---------- pitch timer (5 minutes, segmented by the pitch arc) ---------- */
  const PITCH = [
    [30, 'Hook — the Gap', 'الافتتاح — الفجوة'],
    [60, 'Test first, then stop', 'اختبر أولاً، ثم توقّف'],
    [165, 'Live demo — play a game', 'عرض مباشر — العب لعبة'],
    [210, 'Result + 2-week contract', 'النتيجة + عقد الأسبوعين'],
    [255, 'Science + data honesty', 'العلم والبيانات بصراحة'],
    [285, 'Feasibility + 90 days', 'الجدوى + ٩٠ يوماً'],
    [300, 'Close', 'الختام']
  ];
  let pitchTimer = null;
  function startPitch() {
    const el = $('#pitch');
    el.hidden = false;
    el.classList.remove('is-warn', 'is-over');
    const t0 = Date.now();
    clearInterval(pitchTimer);
    const tick = () => {
      const s = Math.floor((Date.now() - t0) / 1000);
      const left = 300 - s;
      const a = Math.abs(left);
      $('#pitchTime').textContent = (left < 0 ? '+' : '') + Math.floor(a / 60) + ':' + String(a % 60).padStart(2, '0');
      const seg = PITCH.find(p => s < p[0]) || PITCH[PITCH.length - 1];
      $('#pitchSeg').textContent = left < 0 ? T('Over time — wrap up', 'تجاوزت الوقت — اختم الآن') : T(seg[1], seg[2]);
      el.classList.toggle('is-warn', left <= 30 && left >= 0);
      el.classList.toggle('is-over', left < 0);
    };
    tick();
    pitchTimer = setInterval(tick, 250);
  }
  function stopPitch() { clearInterval(pitchTimer); $('#pitch').hidden = true; }
  $('#pitchStart').addEventListener('click', startPitch);
  $('#pitchClose').addEventListener('click', stopPitch);

  /* ---------- impact calculator ---------- */
  const cIn = ['cEnroll', 'cPrev', 'cOpt', 'cAct'].map(id => $('#' + id));
  function animateNum(el, to) {
    const from = parseFloat(el.dataset.v || '0');
    el.dataset.v = to;
    if (reduceMotion) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    (function f(t) {
      const k = Math.min(1, (t - t0) / 500), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }
  function calc() {
    const [enroll, prev, opt, act] = cIn.map(i => parseFloat(i.value));
    $('#vEnroll').textContent = fmt(enroll);
    $('#vPrev').textContent = prev + '%';
    $('#vOpt').textContent = opt + '%';
    $('#vAct').textContent = act + '%';
    const withBarrier = enroll * prev / 100;
    const reach = withBarrier * opt / 100;
    const sas = reach * act / 100;
    animateNum($('#oReach'), reach);
    animateNum($('#oSAS'), sas);
    animateNum($('#oHours'), sas * 2);
    animateNum($('#oMiss'), withBarrier - reach);
  }
  cIn.forEach(i => i.addEventListener('input', calc));
  calc();

})();
