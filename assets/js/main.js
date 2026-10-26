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
      { label: T('Why university, why now', 'لماذا الجامعة، ولماذا الآن'), hint: '02', run: go('#problem') },
      { label: T('How it works — the journey', 'آلية العمل — الرحلة'), hint: '03', run: go('#journey') },
      { label: T('The signal cluster', 'مجموعة المؤشرات'), hint: '04', run: go('#signals') },
      { label: T('Interactive prototype', 'النموذج الأولي التفاعلي'), hint: '05', run: go('#prototype') },
      { label: T('Try the live reader', 'جرّب القارئ المباشر'), hint: '06', run: go('#try') },
      { label: T('Features', 'المزايا'), hint: '07', run: go('#features') },
      { label: T('The AI, honestly', 'الذكاء الاصطناعي، بصراحة'), hint: '08', run: go('#ai') },
      { label: T('Privacy & ethics', 'الخصوصية والأخلاقيات'), hint: '09', run: go('#privacy') },
      { label: T('Data & impact calculator', 'البيانات وحاسبة الأثر'), hint: '10', run: go('#data') },
      { label: T('90-day plan', 'خطة الـ٩٠ يوماً'), hint: '11', run: go('#plan') },
      { label: T('Hard questions (Q&A)', 'أسئلة صعبة'), hint: '12', run: go('#faq') },
      { label: T('Run scenario: Visual Decoder', 'شغّل سيناريو: فاكّ الرموز البصري'), hint: T('demo', 'عرض'), run: () => ERLY.emit('runScenario', 'A') },
      { label: T('Run scenario: Executive Struggler', 'شغّل سيناريو: المتعثّر تنفيذياً'), hint: T('demo', 'عرض'), run: () => ERLY.emit('runScenario', 'B') },
      { label: T('Run scenario: Acquired Strain', 'شغّل سيناريو: ضغط مكتسب'), hint: T('demo', 'عرض'), run: () => ERLY.emit('runScenario', 'C') },
      { label: T('Open SAS dashboard', 'افتح لوحة خدمات الطلبة'), hint: T('demo', 'عرض'), run: () => ERLY.emit('openScreen', 'sas') },
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
    const k = e.key.toLowerCase();
    if (k === 't') toggleTheme();
    else if (k === 'l') toggleLang();
    else if (k === 'p') $('#pitch').hidden ? startPitch() : stopPitch();
  });

  /* ---------- pitch timer (5 minutes, segmented by the pitch arc) ---------- */
  const PITCH = [
    [30, 'Hook — the Gap', 'الافتتاح — الفجوة'],
    [75, 'Problem — three realities', 'المشكلة — ثلاثة واقعات'],
    [180, 'Live demo', 'العرض المباشر'],
    [210, 'Ally Bridge moment', 'لحظة جسر الحليف'],
    [255, 'AI + data honesty', 'الذكاء الاصطناعي والبيانات'],
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

  /* ==========================================================================
     Live reader — scroll-regression counter, read-aloud, font, line focus,
     spacing, summary, and the L4 "did it help?" bandit.
     ========================================================================== */
  const PASSAGE = {
    en: {
      title: 'MECH 210 · Week 4 reading · The First Law for open systems',
      paras: [
        'When engineers analyse a turbine, a compressor or a nozzle, they rarely care about a fixed lump of matter. They care about a region of space — a control volume — through which mass flows continuously. The first law of thermodynamics still holds, but it has to account for energy carried in and out by that moving mass.',
        'For a steady-flow device, the mass entering per second equals the mass leaving per second. Nothing accumulates inside. This single assumption, called conservation of mass, turns a difficult time-dependent problem into an algebraic one that can be solved on a single page.',
        'Energy crosses the boundary in three ways: as heat, as work, and as the energy that the flowing mass brings with it. That last term includes the internal energy of the fluid, its kinetic energy, its potential energy, and a quantity called flow work — the work needed to push the fluid into the control volume against the pressure already inside it.',
        'Because internal energy and flow work always appear together, engineers combine them into a single property, enthalpy. Tables list enthalpy for water, refrigerants and air at different temperatures and pressures, which is why most first-year problems begin with looking something up rather than calculating it.',
        'In a well-insulated turbine, heat transfer is close to zero and changes in height are negligible. The work produced is then almost exactly the drop in enthalpy between inlet and outlet, multiplied by the mass flow rate. A nozzle does the opposite job: it produces no work, and instead converts a drop in enthalpy into a large increase in velocity.',
        'The most common mistake students make is not in the algebra but in the bookkeeping: forgetting a term, mixing units of kilojoules per kilogram with kilowatts, or applying a closed-system equation to an open system. Drawing the control volume first, and listing every arrow that crosses it, prevents most of these errors.',
        'Finally, remember that the first law tells you how much energy is transferred, but nothing about whether a process is possible in the direction you imagine. That question belongs to the second law, which is next week\'s reading.'
      ],
      summary: ['Open systems = control volumes with mass flowing through.', 'Steady flow: mass in = mass out, so the problem becomes algebra.', 'Energy crosses as heat, work, and energy carried by the flow; internal energy + flow work = enthalpy.', 'Turbine: work ≈ enthalpy drop × mass flow. Nozzle: enthalpy drop → speed.', 'Draw the control volume and every arrow first — most mistakes are bookkeeping.']
    },
    ar: {
      title: 'هندسة ميكانيكية ٢١٠ · قراءة الأسبوع الرابع · القانون الأول للأنظمة المفتوحة',
      paras: [
        'عندما يحلّل المهندسون توربيناً أو ضاغطاً أو فوهة، نادراً ما يهتمون بكتلة ثابتة من المادة. بل يهتمون بمنطقة من الفضاء — حجم تحكّم — تتدفق عبرها الكتلة باستمرار. يبقى القانون الأول للديناميكا الحرارية صحيحاً، لكن يجب أن يحسب الطاقة التي تحملها تلك الكتلة المتحركة دخولاً وخروجاً.',
        'في جهاز ذي تدفق مستقر، الكتلة الداخلة في الثانية تساوي الكتلة الخارجة في الثانية. لا شيء يتراكم في الداخل. هذا الافتراض الوحيد، المسمّى حفظ الكتلة، يحوّل مسألة صعبة متغيرة مع الزمن إلى مسألة جبرية يمكن حلّها في صفحة واحدة.',
        'تعبر الطاقة الحدود بثلاث طرق: حرارةً، وشغلاً، وطاقةً تحملها الكتلة المتدفقة معها. ويشمل الحدّ الأخير الطاقة الداخلية للمائع، وطاقته الحركية، وطاقة الوضع، وكمية تسمى شغل التدفق — وهو الشغل اللازم لدفع المائع إلى حجم التحكم في مواجهة الضغط الموجود فيه.',
        'ولأن الطاقة الداخلية وشغل التدفق يظهران دائماً معاً، يجمعهما المهندسون في خاصية واحدة هي الإنثالبي. تسرد الجداول قيم الإنثالبي للماء ووسائط التبريد والهواء عند درجات حرارة وضغوط مختلفة، ولهذا تبدأ معظم مسائل السنة الأولى بالبحث في جدول لا بالحساب.',
        'في توربين جيد العزل، يقترب انتقال الحرارة من الصفر وتكون تغيرات الارتفاع مهملة. فيصبح الشغل الناتج تقريباً هو انخفاض الإنثالبي بين المدخل والمخرج مضروباً في معدل تدفق الكتلة. أما الفوهة فتقوم بالعكس: لا تنتج شغلاً، بل تحوّل انخفاض الإنثالبي إلى زيادة كبيرة في السرعة.',
        'الخطأ الأكثر شيوعاً لدى الطلبة ليس في الجبر بل في المحاسبة: نسيان حدّ، أو الخلط بين كيلوجول لكل كيلوغرام والكيلوواط، أو تطبيق معادلة نظام مغلق على نظام مفتوح. رسم حجم التحكم أولاً، وسرد كل سهم يعبره، يمنع معظم هذه الأخطاء.',
        'وأخيراً، تذكّر أن القانون الأول يخبرك بمقدار الطاقة المنتقلة، لكنه لا يخبرك شيئاً عن إمكانية حدوث العملية في الاتجاه الذي تتخيله. هذا السؤال ينتمي إلى القانون الثاني، وهو قراءة الأسبوع القادم.'
      ],
      summary: ['الأنظمة المفتوحة = أحجام تحكم تتدفق عبرها الكتلة.', 'التدفق المستقر: الكتلة الداخلة = الخارجة، فتصبح المسألة جبرية.', 'تعبر الطاقة كحرارة وشغل وطاقة يحملها التدفق؛ الطاقة الداخلية + شغل التدفق = الإنثالبي.', 'التوربين: الشغل ≈ انخفاض الإنثالبي × تدفق الكتلة. الفوهة: انخفاض الإنثالبي ← سرعة.', 'ارسم حجم التحكم وكل سهم أولاً — معظم الأخطاء محاسبية.']
    }
  };

  const reader = $('#reader');
  const passage = $('#passage');
  const pText = $('#passageText');
  const ruler = $('#ruler');
  let rLang = 'en';

  function renderPassage() {
    const p = PASSAGE[rLang];
    pText.dir = rLang === 'ar' ? 'rtl' : 'ltr';
    pText.lang = rLang;
    const sum = reader.classList.contains('is-summary')
      ? `<div class="summary"><b>${rLang === 'ar' ? 'ملخص في ٦٠ ثانية · مُولَّد على الجهاز (محاكى)' : '60-second summary · on-device (simulated)'}</b><ul>${p.summary.map(s => `<li>${s}</li>`).join('')}</ul></div>`
      : '';
    pText.innerHTML = `<h4>${p.title}</h4>${sum}${p.paras.map((t, i) => `<p data-p="${i}">${t}</p>`).join('')}`;
  }
  renderPassage();

  $$('#readerLang button').forEach(b => b.addEventListener('click', () => {
    $$('#readerLang button').forEach(x => x.classList.toggle('is-on', x === b));
    rLang = b.dataset.l;
    stopSpeech();
    renderPassage();
  }));

  // Regression detection: a direction flip upward of more than 80px counts once.
  const R = { mode: 'down', extreme: 0, count: 0, maxDepth: 0, secs: 0, tools: new Set() };
  passage.addEventListener('scroll', () => {
    const top = passage.scrollTop;
    if (R.mode === 'down') {
      if (top > R.extreme) R.extreme = top;
      else if (top < R.extreme - 80) { R.mode = 'up'; R.extreme = top; bumpRegress(); }
    } else {
      if (top < R.extreme) R.extreme = top;
      else if (top > R.extreme + 80) { R.mode = 'down'; R.extreme = top; }
    }
    const depth = (top + passage.clientHeight) / passage.scrollHeight;
    R.maxDepth = Math.max(R.maxDepth, depth);
    $('#mDepth').textContent = Math.round(R.maxDepth * 100) + '%';
  }, { passive: true });

  function bumpRegress() {
    R.count++;
    const el = $('#mRegress');
    el.textContent = R.count;
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 220);
    if (R.count === 3) toast(T('That\'s a re-read loop. Try "Line focus" or "Read aloud" ↑', 'هذه حلقة إعادة قراءة. جرّب «تركيز السطر» أو «اقرأ بصوت عالٍ» ↑'));
  }

  let inView = false;
  new IntersectionObserver(es => { inView = es[0].isIntersecting; }, { threshold: 0.4 }).observe(passage);
  setInterval(() => {
    if (!inView || document.hidden) return;
    R.secs++;
    $('#mTime').textContent = Math.floor(R.secs / 60) + ':' + String(R.secs % 60).padStart(2, '0');
  }, 1000);

  // Line focus follows the pointer; keyboard/touch users get a centred band.
  function placeRuler(clientY) {
    const r = passage.getBoundingClientRect();
    const y = (clientY == null ? r.height / 2 : clientY - r.top) + passage.scrollTop - 22;
    ruler.style.top = Math.max(0, y) + 'px';
  }
  passage.addEventListener('mousemove', e => { if (reader.classList.contains('is-ruler')) placeRuler(e.clientY); });
  passage.addEventListener('scroll', () => { if (reader.classList.contains('is-ruler') && !passage.matches(':hover')) placeRuler(); }, { passive: true });

  // Read aloud with paragraph highlighting.
  let speaking = false;
  function speak() {
    if (!('speechSynthesis' in window)) { toast(T('Read-aloud isn\'t supported in this browser', 'القراءة الصوتية غير مدعومة في هذا المتصفح')); setTool('speak', false); return; }
    stopSpeech();
    speaking = true;
    const paras = $$('p[data-p]', pText);
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(rLang)) || null;
    if (rLang === 'ar' && !voice) toast(T('No Arabic voice on this device — using the default voice', 'لا يوجد صوت عربي على هذا الجهاز — سيُستخدم الصوت الافتراضي'));
    let i = 0;
    const next = () => {
      paras.forEach(p => p.classList.remove('is-speaking'));
      if (!speaking || i >= paras.length) { speaking = false; setTool('speak', false); return; }
      const p = paras[i++];
      p.classList.add('is-speaking');
      p.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      const u = new SpeechSynthesisUtterance(p.textContent);
      u.lang = rLang === 'ar' ? 'ar-AE' : 'en-GB';
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.onend = next;
      u.onerror = next;
      speechSynthesis.speak(u);
    };
    next();
  }
  function stopSpeech() {
    speaking = false;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    $$('p[data-p]', pText).forEach(p => p.classList.remove('is-speaking'));
  }

  const TOOL_NAMES = {
    speak: ['Read aloud', 'القراءة الصوتية'],
    font: ['Readable font', 'الخط المقروء'],
    ruler: ['Line focus', 'تركيز السطر'],
    space: ['More space', 'مساحة أكبر'],
    summary: ['Summary', 'الملخص']
  };
  function setTool(tool, on) {
    const btn = $(`.tool[data-tool="${tool}"]`);
    btn.setAttribute('aria-pressed', on);
    if (tool !== 'speak') reader.classList.toggle('is-' + tool, on);
  }
  let askTimer, lastTool = null;
  $$('.tool').forEach(btn => btn.addEventListener('click', () => {
    const tool = btn.dataset.tool;
    const on = btn.getAttribute('aria-pressed') !== 'true';
    setTool(tool, on);
    if (tool === 'speak') on ? speak() : stopSpeech();
    if (tool === 'summary') { renderPassage(); if (on) passage.scrollTop = 0; }
    if (tool === 'ruler' && on) placeRuler();
    if (on) {
      R.tools.add(tool);
      $('#mTools').textContent = R.tools.size;
      lastTool = tool;
      clearTimeout(askTimer);
      askTimer = setTimeout(() => askHelped(tool), 4000);
    }
  }));

  /* L4 — Beta-Bernoulli Thompson sampling over reading tools.
     Priors are nudged by the Learning Blueprint when it's completed. */
  const arms = {
    speak: { a: 1, b: 1 }, font: { a: 1, b: 1 }, ruler: { a: 1, b: 1 }, space: { a: 1, b: 1 }, summary: { a: 1, b: 1 }
  };
  function gamma(k) {
    // Marsaglia–Tsang; k >= 1 here because priors start at 1.
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = randn(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function sampleBeta(a, b) { const x = gamma(a), y = gamma(b); return x / (x + y); }

  function renderPrefs() {
    const sampled = Object.entries(arms).map(([k, p]) => [k, sampleBeta(p.a, p.b)]);
    const top = sampled.sort((x, y) => y[1] - x[1])[0][0];
    $('#prefBars').innerHTML = Object.entries(arms).map(([k, p]) => {
      const mean = p.a / (p.a + p.b);
      return `<div class="pref ${k === top ? 'is-top' : ''}"><span>${T(...TOOL_NAMES[k])}</span><span class="bar2"><span style="width:${(mean * 100).toFixed(0)}%"></span></span><span class="mono">${mean.toFixed(2)}</span></div>`;
    }).join('');
    ERLY.state.topTool = top;
  }
  renderPrefs();

  function askHelped(tool) {
    const box = $('#helped');
    box.hidden = false;
    box.dataset.tool = tool;
    $('p', box).textContent = T(`Did ${TOOL_NAMES[tool][0].toLowerCase()} help?`, `هل ساعدت ${TOOL_NAMES[tool][1]}؟`);
  }
  $$('#helped button').forEach(b => b.addEventListener('click', () => {
    const box = $('#helped');
    const tool = box.dataset.tool;
    const h = parseFloat(b.dataset.h);
    arms[tool].a += h;
    arms[tool].b += 1 - h;
    box.hidden = true;
    renderPrefs();
    ERLY.emit('helped', { tool, h });
    toast(T('Noted. ERLY will offer what works for you first.', 'تم. سيقترح إيرلي أولاً ما ينجح معك.'));
  }));

  ERLY.on('blueprint', bp => {
    if (bp.auditory) arms.speak.a += 1.5;
    if (bp.visual) { arms.summary.a += 1; arms.font.a += 0.5; }
    if (bp.chunks) arms.summary.a += 0.5;
    if (bp.focus) arms.ruler.a += 1;
    renderPrefs();
  });
  ERLY.getReaderStats = () => ({ regressions: R.count, seconds: R.secs, depth: R.maxDepth, tools: Array.from(R.tools), prefs: JSON.parse(JSON.stringify(arms)) });

  I18N.onChange(() => { renderPrefs(); });
  addEventListener('beforeunload', stopSpeech);
})();
