/* ERLY — interactive prototype.
   The detection engine here is real: it generates a synthetic semester for
   one student, learns a robust baseline from weeks 1–6, scores each later
   week against it, and applies the convergence rule (3+ signals elevated for
   2+ consecutive assessable weeks). Exam Mode pauses judgement on exam weeks
   instead of raising thresholds. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SIGS = [
    { id: 's1', short: 'S1', en: 'Re-reading loops', ar: 'حلقات إعادة القراءة', unitEn: 'scroll regressions / 1k words', unitAr: 'تراجعات تمرير / ١٠٠٠ كلمة' },
    { id: 's2', short: 'S2', en: 'Abandoned drafts & posts', ar: 'مسودات ومنشورات مهجورة', unitEn: 'abandon events / day', unitAr: 'أحداث هجر / يوم' },
    { id: 's3', short: 'S3', en: 'Switching to audio', ar: 'التحوّل إلى الصوت', unitEn: 'share of reading time as audio', unitAr: 'نسبة وقت القراءة صوتياً' },
    { id: 's4', short: 'S4', en: 'Late-start spikes', ar: 'اندفاعات اللحظة الأخيرة', unitEn: 'share of work in final 12h', unitAr: 'نسبة العمل في آخر ١٢ ساعة' }
  ];
  const DAYS = 63, BASE_END = 42, EXAM_WEEK = 7; // week index 7 = wk8
  const THRESH = 1.25;

  const state = {
    scenario: 'A',
    exam: true,
    consent: { s1: true, s2: true, s3: true, s4: true },
    day: DAYS - 1,
    hidden: {},
    allies: ['Sara'],
    result: null,
    cardLang: null,
    allyStep: 0,
    allyChoice: null,
    slot: null,
    allyAttends: true,
    sharePack: true,
    pactSealed: false
  };

  /* ---------------- screens ---------------- */
  const tabs = $$('.app__tab');
  function openScreen(name, scroll) {
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.screen === name));
    $$('.screen').forEach(s => s.classList.toggle('is-active', s.dataset.screen === name));
    if (name === 'insight') $('#insightBadge').hidden = true;
    if (name === 'pack') renderPack();
    if (name === 'sas') renderSAS();
    if (scroll) $('#prototype').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  tabs.forEach(t => t.addEventListener('click', () => openScreen(t.dataset.screen)));
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]');
    if (g) openScreen(g.dataset.goto);
  });
  ERLY.on('openScreen', n => openScreen(n, true));
  ERLY.on('runScenario', s => {
    $('#scenario').value = s;
    state.scenario = s;
    openScreen('signals', true);
    setTimeout(() => play(true), 500);
  });

  /* ================= 01 · Consent & Pact ================= */
  $$('.consent').forEach(c => c.addEventListener('change', () => {
    state.consent[c.dataset.sig] = c.checked;
    compute();
    ERLY.toast(c.checked
      ? T('Signal switched on. You can turn it off any time.', 'تم تفعيل المؤشر. يمكنك إيقافه في أي وقت.')
      : T('Signal off. ERLY will never look at it.', 'تم إيقاف المؤشر. لن ينظر إليه إيرلي أبداً.'));
  }));
  $$('#allies .ally').forEach(b => b.addEventListener('click', () => {
    b.classList.toggle('is-on');
    state.allies = $$('#allies .ally.is-on').map(x => x.dataset.ally);
    state.pactSealed = false;
    $('#sealedMsg').hidden = true;
  }));
  $('#addDomain').addEventListener('click', () => {
    const d = prompt(T('Add a study site (e.g. blackboard.university.ae)', 'أضف موقعاً دراسياً (مثل blackboard.university.ae)'));
    if (!d || !d.trim()) return;
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = d.trim().replace(/^https?:\/\//, '').slice(0, 40);
    $('#addDomain').before(chip);
  });
  $('#sealPact').addEventListener('click', () => {
    if (!state.allies.length) { ERLY.toast(T('Pick at least one person — or SAS directly.', 'اختر شخصاً واحداً على الأقل — أو خدمات الطلبة مباشرة.')); return; }
    state.pactSealed = true;
    const m = $('#sealedMsg');
    m.hidden = false;
    m.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16"><path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>` +
      T(`Pact sealed with ${state.allies.join(', ')} · expires 15 Jan 2027 · revocable`, `تم عقد الميثاق مع ${state.allies.join('، ')} · ينتهي ١٥ يناير ٢٠٢٧ · قابل للإلغاء`);
    ERLY.toast(T('Sealed. Nobody is contacted without asking you again.', 'تم. لن يُتواصل مع أحد دون سؤالك مجدداً.'));
  });

  /* ================= 02 · Learning Blueprint ================= */
  const ICON = {
    ear: '<svg viewBox="0 0 24 24"><path d="M7 10a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M10 10a2 2 0 0 1 4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    hand: '<svg viewBox="0 0 24 24"><path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.6-2.2L3.6 15a1.5 1.5 0 0 1 2.3-2L8 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    steps: '<svg viewBox="0 0 24 24"><path d="M4 19h5v-5h5V9h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    map: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 9V4M12 20v-5M9 12H4M20 12h-5M6 6l3.5 3.5M18 18l-3.5-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 9v6M14 9v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };
  const BP_Q = [
    { en: 'When something finally clicks, it\'s usually because I…', ar: 'عندما أفهم شيئاً أخيراً، يكون ذلك عادةً لأنني…', opts: [
      { k: 'auditory', icon: 'ear', en: ['heard it explained', 'a lecture, a friend, a video'], ar: ['سمعت شرحه', 'محاضرة، صديق، فيديو'] },
      { k: 'visual', icon: 'eye', en: ['saw it drawn out', 'a diagram, a chart, a map'], ar: ['رأيته مرسوماً', 'رسم توضيحي، مخطط، خريطة'] },
      { k: 'hands', icon: 'hand', en: ['tried it myself', 'practice problems, building'], ar: ['جرّبته بنفسي', 'تمارين، تطبيق عملي'] }
    ]},
    { en: 'A big assignment feels less scary when…', ar: 'يبدو الواجب الكبير أقل إرهاقاً عندما…', opts: [
      { k: 'chunks', icon: 'steps', en: ['it\'s cut into small steps', 'tell me the next 10 minutes'], ar: ['يُقسَّم إلى خطوات صغيرة', 'أخبرني بالدقائق العشر القادمة'] },
      { k: 'big', icon: 'map', en: ['I see the whole picture first', 'then I find my own way in'], ar: ['أرى الصورة كاملة أولاً', 'ثم أجد طريقي بنفسي'] }
    ]},
    { en: 'I do my clearest thinking…', ar: 'أفكّر بأوضح شكل…', opts: [
      { k: 'morning', icon: 'sun', en: ['in the morning', 'before the day gets loud'], ar: ['في الصباح', 'قبل أن يزدحم اليوم'] },
      { k: 'night', icon: 'moon', en: ['late at night', 'when everything is quiet'], ar: ['في وقت متأخر من الليل', 'حين يهدأ كل شيء'] }
    ]},
    { en: 'When I\'m stuck, I\'d rather…', ar: 'عندما أعلق، أفضّل أن…', opts: [
      { k: 'social', icon: 'chat', en: ['talk it through', 'with someone I trust'], ar: ['أتحدث عنه', 'مع شخص أثق به'] },
      { k: 'focus', icon: 'pause', en: ['step away and reset', 'then come back focused'], ar: ['أبتعد قليلاً وأستعيد تركيزي', 'ثم أعود بتركيز'] }
    ]}
  ];
  let bpStep = 0, bpAns = {};
  function renderBP() {
    const bar = $('#bpBar');
    if (bpStep >= BP_Q.length) {
      bar.style.width = '100%';
      $('#bpQ').innerHTML = '';
      $('#bpOpts').innerHTML = '';
      renderBPResult();
      return;
    }
    bar.style.width = (bpStep / BP_Q.length * 100) + '%';
    const q = BP_Q[bpStep];
    $('#bpQ').innerHTML = `<small>${T('Question', 'سؤال')} ${bpStep + 1} / ${BP_Q.length}</small>${T(q.en, q.ar)}`;
    $('#bpOpts').innerHTML = q.opts.map(o => {
      const [h, s] = I18N.lang === 'ar' ? o.ar : o.en;
      return `<button class="bp__opt" data-k="${o.k}">${ICON[o.icon]}<b>${h}</b><span>${s}</span></button>`;
    }).join('');
    $('#bpResult').hidden = true;
  }
  $('#bpOpts').addEventListener('click', e => {
    const b = e.target.closest('.bp__opt');
    if (!b) return;
    bpAns[bpStep] = b.dataset.k;
    bpStep++;
    renderBP();
  });
  function blueprint() {
    const a = Object.values(bpAns);
    return {
      auditory: a.includes('auditory'), visual: a.includes('visual'), hands: a.includes('hands'),
      chunks: a.includes('chunks'), big: a.includes('big'), morning: a.includes('morning'), night: a.includes('night'),
      social: a.includes('social'), focus: a.includes('focus'), answers: a
    };
  }
  const TAGS = {
    auditory: ['Auditory learner', 'متعلّم سمعي'], visual: ['Visual thinker', 'مفكّر بصري'], hands: ['Learns by doing', 'يتعلّم بالممارسة'],
    chunks: ['Small steps', 'خطوات صغيرة'], big: ['Big picture first', 'الصورة الكاملة أولاً'],
    morning: ['Morning mind', 'عقل صباحي'], night: ['Night owl', 'كائن ليلي'], social: ['Talks it out', 'يحلّ بالحوار'], focus: ['Resets with breaks', 'يستعيد تركيزه بالاستراحة']
  };
  function toolsFor(bp) {
    const list = [];
    if (bp.auditory) list.push([T('Read-aloud & lecture audio', 'القراءة الصوتية وصوت المحاضرات'), 'TTS']);
    if (bp.visual) list.push([T('Mind-maps & visual summaries', 'الخرائط الذهنية والملخصات البصرية'), 'MAP']);
    if (bp.hands) list.push([T('Worked-example practice sets', 'تمارين بأمثلة محلولة'), 'PRAC']);
    if (bp.chunks) list.push([T('Start-Ramp micro-tasks', 'مهام صغيرة عبر منحدر البداية'), 'RAMP']);
    if (bp.big) list.push([T('One-page course overview', 'نظرة عامة على المقرر في صفحة'), 'OVR']);
    if (bp.focus) list.push([T('Focus sprints with breaks', 'جولات تركيز مع استراحات'), 'SPRINT']);
    if (bp.social) list.push([T('Body-doubling study room', 'غرفة دراسة مشتركة'), 'ROOM']);
    if (bp.night) list.push([T('Nudges timed for evenings', 'تذكيرات مسائية'), '21:00']);
    if (bp.morning) list.push([T('Nudges timed for mornings', 'تذكيرات صباحية'), '08:00']);
    return list;
  }
  function renderBPResult(silent) {
    const bp = blueprint();
    ERLY.state.blueprint = bp;
    const r = $('#bpResult');
    r.hidden = false;
    r.innerHTML = `
      <p class="bp__q" style="min-height:0">${T('Here\'s your Learning Blueprint.', 'هذا مخطط تعلّمك.')}</p>
      <div class="bp__tags">${bp.answers.map(k => `<span>${T(...TAGS[k])}</span>`).join('')}</div>
      <p class="panel__h mono">${T('ERLY will offer these first', 'سيقترح إيرلي هذه أولاً')}</p>
      <div class="bp__tools">${toolsFor(bp).map(([n, c]) => `<div><b>${n}</b><span>${c}</span></div>`).join('')}</div>
      <p class="small muted">${T('These are preferences, not a profile. ERLY re-learns them from your one-tap "did it help?" answers (Layer 4).', 'هذه تفضيلات لا ملف شخصي. يعيد إيرلي تعلّمها من إجاباتك بنقرة واحدة «هل ساعد ذلك؟» (الطبقة ٤).')}</p>
      <div class="row-btns"><button class="btn btn--sm btn--ghost" id="bpRedo">${T('Retake', 'أعد الإجابة')}</button><button class="btn btn--sm btn--ink" data-goto="signals">${T('Next: signal timeline →', 'التالي: الخط الزمني ←')}</button></div>`;
    $('#bpRedo').onclick = () => { bpStep = 0; bpAns = {}; renderBP(); };
    if (!silent) ERLY.emit('blueprint', bp);
    renderInsight();
  }
  renderBP();

  /* ================= 03 · Engine ================= */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const SEEDS = { A: 11, B: 23, C: 37, M: 41, N: 53 };
  // Base level and day-to-day noise for each raw metric.
  const BASE = { s1: [4, 1], s2: [0.8, 0.45], s3: [18, 4], s4: [34, 7] };
  // Shift in units of noise SD, as a function of day.
  function effect(scn, sig, d) {
    const w = Math.floor(d / 7);
    const ramp = (start, len) => Math.max(0, Math.min(1, (d - start) / len));
    switch (scn) {
      case 'A': return ({ s1: 3.2, s2: 0.2, s3: 3.0, s4: 2.2 })[sig] * ramp(40, 6);
      case 'B': return ({ s1: 1.9, s2: 3.2, s3: 0.2, s4: 3.0 })[sig] * ramp(40, 6);
      case 'C': return ({ s1: 2.6, s2: 2.4, s3: 2.2, s4: 2.6 })[sig] * ramp(43, 2);
      case 'M': {
        const k = w === 6 ? 1.8 : w === 7 ? 3.0 : 0;
        return ({ s1: 1, s2: 0.9, s3: 0.1, s4: 1.1 })[sig] * k;
      }
      default: return 0;
    }
  }
  function generate(scn) {
    const rnd = mulberry32(SEEDS[scn]);
    const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const raw = {};
    SIGS.forEach(({ id }) => {
      const [mu, sd] = BASE[id];
      raw[id] = Array.from({ length: DAYS }, (_, d) => {
        const weekday = d % 7;
        const weekend = weekday >= 5 ? -0.3 : 0;            // weekends are lighter
        const v = mu + sd * (gauss() * 0.9 + weekend + effect(scn, id, d));
        return Math.max(0, +v.toFixed(2));
      });
    });
    return raw;
  }
  const median = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

  function analyse(raw, uptoDay) {
    const z = {}, weekly = {}, base = {};
    SIGS.forEach(({ id }) => {
      const b = raw[id].slice(0, BASE_END);
      const med = median(b);
      const mad = median(b.map(x => Math.abs(x - med))) * 1.4826 || 1;
      base[id] = { med, mad };
      z[id] = raw[id].map(x => (x - med) / mad);
      weekly[id] = Array.from({ length: 9 }, (_, w) => {
        const days = z[id].slice(w * 7, w * 7 + 7);
        return days.reduce((s, v) => s + v, 0) / days.length;
      });
    });

    const weeksDone = Math.floor((uptoDay + 1) / 7);
    const rows = [];           // per assessable week
    const streak = { s1: 0, s2: 0, s3: 0, s4: 0 };
    let fired = null;
    const log = [];
    if (weeksDone >= 1) log.push({ w: Math.min(weeksDone, 6), txt: T(`wk1–${Math.min(weeksDone, 6)} · learning baseline — blind window, no insights`, `أسبوع ١–${Math.min(weeksDone, 6)} · تعلّم خط الأساس — نافذة عمياء، بلا ملاحظات`) });

    for (let w = 6; w < weeksDone; w++) {
      const paused = state.exam && w === EXAM_WEEK;
      const up = {};
      SIGS.forEach(({ id }) => {
        const on = state.consent[id];
        up[id] = on && !paused && weekly[id][w] >= THRESH;
        if (paused) return;                         // exam week neither counts nor breaks a streak
        streak[id] = up[id] ? streak[id] + 1 : 0;
      });
      const persisted = SIGS.filter(s => streak[s.id] >= 2).map(s => s.id);
      rows.push({ w, paused, up: { ...up } });
      if (paused) {
        log.push({ w, txt: T(`wk${w + 1} · Exam Mode — judgement paused, focus sprints offered`, `أسبوع ${w + 1} · وضع الامتحانات — الحكم متوقف، وتُقترح جولات تركيز`) });
        continue;
      }
      const ups = SIGS.filter(s => up[s.id]);
      let txt = `wk${w + 1} · ` + (ups.length ? ups.map(s => s.short + '↑').join(' ') : T('all within your normal', 'الكل ضمن معدلك الطبيعي'));
      if (ups.length) txt += T(` · ${ups.length} of 4 elevated`, ` · ${ups.length} من ٤ مرتفعة`);
      if (!fired && persisted.length >= 3) {
        fired = { week: w, day: w * 7 + 6, signals: persisted };
        txt += T(` → <b>${persisted.length} signals persisted 2+ weeks · card queued</b>`, ` → <b>${persisted.length} مؤشرات استمرت أسبوعين+ · البطاقة جاهزة</b>`);
      }
      log.push({ w, txt });
    }
    const curWeek = Math.min(8, Math.floor(uptoDay / 7));
    return { z, weekly, base, rows, fired, log, curWeek, weeksDone, streak };
  }

  let RAW = generate(state.scenario);
  function compute(noAnim) {
    const prevFired = state.result && state.result.fired;
    state.result = analyse(RAW, state.day);
    drawTimeline();
    drawRadar();
    drawRule();
    const fired = state.result.fired;
    if (fired && !prevFired && state.day === fired.day && playing) {
      ERLY.toast(T('Convergence rule met — an insight card is waiting for Noura (and only Noura).', 'تحققت قاعدة الالتقاء — بطاقة ملاحظة بانتظار نورة (ونورة وحدها).'));
    }
    $('#insightBadge').hidden = !fired || $('.screen[data-screen="insight"]').classList.contains('is-active');
    renderInsight();
  }

  /* ---------- timeline chart ---------- */
  const tl = $('#timeline');
  const W = 640, H = 260, Y0 = -2.5, Y1 = 6;
  const xOf = d => d / (DAYS - 1) * W;
  const yOf = v => H - (Math.max(Y0, Math.min(Y1, v)) - Y0) / (Y1 - Y0) * H;
  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function drawTimeline() {
    const r = state.result;
    tl.innerHTML = '';
    const defs = el('defs', {}, tl);
    const pat = el('pattern', { id: 'tlHatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'currentColor', 'stroke-width': 1, opacity: .12 }, pat);
    tl.style.color = 'var(--ink)';

    for (let w = 1; w < 9; w++) el('line', { x1: xOf(w * 7 - .5), x2: xOf(w * 7 - .5), y1: 0, y2: H, class: 'tl-grid' }, tl);
    el('rect', { x: 0, y: 0, width: xOf(BASE_END - .5), height: H, class: 'tl-blind' }, tl);
    const bl = el('text', { x: 8, y: 16, class: 'tl-blind-lbl' }, tl);
    bl.textContent = T('baseline window · weeks 1–6 · utility only', 'نافذة خط الأساس · الأسابيع ١–٦ · أدوات فقط');
    el('rect', { x: xOf(EXAM_WEEK * 7 - .5), y: 0, width: xOf(7), height: H, class: 'tl-exam' }, tl);
    const el2 = el('text', { x: xOf(EXAM_WEEK * 7) + 4, y: 16, class: 'tl-exam-lbl' }, tl);
    el2.textContent = state.exam ? T('midterms · paused', 'امتحانات · متوقف') : T('midterms', 'امتحانات');
    el('rect', { x: 0, y: yOf(THRESH), width: W, height: yOf(-THRESH) - yOf(THRESH), class: 'tl-band' }, tl);
    el('line', { x1: 0, x2: W, y1: yOf(0), y2: yOf(0), class: 'tl-zero' }, tl);
    [-2, 0, 2, 4].forEach(v => { const t = el('text', { x: W - 4, y: yOf(v) - 3, class: 'tl-axis', 'text-anchor': 'end' }, tl); t.textContent = (v > 0 ? '+' : '') + v + 'σ'; });

    SIGS.forEach(({ id }) => {
      if (state.hidden[id]) return;
      const zs = r.z[id];
      const pts = [];
      for (let d = 0; d <= state.day; d++) {
        const lo = Math.max(0, d - 2), seg = zs.slice(lo, d + 1);
        pts.push(`${xOf(d).toFixed(1)},${yOf(seg.reduce((a, b) => a + b, 0) / seg.length).toFixed(1)}`);
      }
      el('polyline', { points: pts.join(' '), class: 'tl-line', style: `stroke:var(--${id});opacity:${state.consent[id] ? 1 : .2}`, 'stroke-dasharray': state.consent[id] ? '' : '3 4' }, tl);
    });
    el('line', { x1: xOf(state.day), x2: xOf(state.day), y1: 0, y2: H, class: 'tl-cursor' }, tl);
    if (r.fired) {
      const fx = xOf(r.fired.day);
      el('circle', { cx: fx, cy: 30, r: 6, class: 'tl-flag' }, tl);
      const ft = el('text', { x: fx - 10, y: 34, class: 'tl-axis', 'text-anchor': 'end' }, tl);
      ft.textContent = T('card', 'بطاقة');
    }
    const wk = Math.floor(state.day / 7) + 1;
    $('#dayLbl').textContent = T(`wk ${wk} · day ${state.day + 1}`, `أسبوع ${wk} · يوم ${state.day + 1}`);
  }

  function renderLegend() {
    $('#legend').innerHTML = SIGS.map(s =>
      `<button data-sig="${s.id}" class="${state.hidden[s.id] ? 'is-off' : ''}" style="--c:var(--${s.id})"><i></i>${s.short} · ${T(s.en, s.ar)}</button>`
    ).join('');
  }
  $('#legend').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.hidden[b.dataset.sig] = !state.hidden[b.dataset.sig];
    renderLegend();
    drawTimeline();
  });

  /* ---------- radar ---------- */
  function drawRadar() {
    const svg = $('#radar');
    const r = state.result;
    svg.innerHTML = '';
    const cx = 110, cy = 110, R = 78, max = 4;
    const ang = i => -Math.PI / 2 + i * Math.PI / 2;
    const pt = (i, v) => [cx + Math.cos(ang(i)) * R * v, cy + Math.sin(ang(i)) * R * v];
    [.25, .5, .75, 1].forEach(k => el('polygon', { points: SIGS.map((_, i) => pt(i, k).join(',')).join(' '), class: 'r-grid' }, svg));
    SIGS.forEach((s, i) => {
      el('line', { x1: cx, y1: cy, x2: pt(i, 1)[0], y2: pt(i, 1)[1], class: 'r-grid' }, svg);
      const [lx, ly] = pt(i, 1.22);
      const t = el('text', { x: lx, y: ly + 3, 'text-anchor': 'middle' }, svg);
      t.textContent = s.short;
    });
    const baseK = (THRESH + 1) / (max + 1);
    el('polygon', { points: SIGS.map((_, i) => pt(i, baseK).join(',')).join(' '), class: 'r-base' }, svg);
    const w = r.curWeek;
    const now = SIGS.map((s, i) => {
      const v = state.consent[s.id] ? r.weekly[s.id][w] : -1;
      const k = Math.max(0.04, Math.min(1, (v + 1) / (max + 1)));
      return pt(i, k).join(',');
    });
    el('polygon', { points: now.join(' '), class: 'r-now' }, svg);
    const lbl = el('text', { x: cx, y: 232, 'text-anchor': 'middle' }, svg);
    lbl.textContent = T(`week ${w + 1} · dashed = your normal`, `أسبوع ${w + 1} · المتقطع = معدلك`);
  }

  /* ---------- convergence grid ---------- */
  function drawRule() {
    const r = state.result;
    const cols = [6, 7, 8];
    let html = `<span></span>${cols.map(w => `<span class="h">wk${w + 1}</span>`).join('')}`;
    SIGS.forEach(s => {
      html += `<span class="lbl" style="--c:var(--${s.id})"><i></i>${s.short}</span>`;
      cols.forEach(w => {
        const row = r.rows.find(x => x.w === w);
        let cls = 'cell';
        if (!state.consent[s.id] || (row && row.paused)) cls += ' is-off';
        else if (row && row.up[s.id]) cls += ' is-up';
        html += `<span class="${cls}" style="--c:var(--${s.id})" title="${row ? (row.paused ? 'paused' : r.weekly[s.id][w].toFixed(2) + 'σ') : 'not yet'}"></span>`;
      });
    });
    $('#ruleGrid').innerHTML = html;

    const v = $('#verdict');
    v.className = 'verdict';
    if (r.fired) {
      v.classList.add('is-fire');
      v.innerHTML = `<b>${T('Insight card ready', 'بطاقة الملاحظة جاهزة')}</b>${T(`${r.fired.signals.length} signals above Noura's own normal for 2+ weeks. Shown to her first.`, `${r.fired.signals.length} مؤشرات فوق معدل نورة الطبيعي لأسبوعين+. تظهر لها أولاً.`)}`;
    } else if (r.weeksDone <= 6) {
      v.innerHTML = `<b>${T('Blind window', 'نافذة عمياء')}</b>${T('Learning what normal looks like. Tools only.', 'يتعلّم كيف يبدو الطبيعي. أدوات فقط.')}`;
    } else {
      v.classList.add('is-quiet');
      v.innerHTML = `<b>${T('Nothing to say', 'لا شيء يُقال')}</b>${T('Rule not met. ERLY stays quiet — which is most weeks for most students.', 'لم تتحقق القاعدة. يبقى إيرلي صامتاً — وهذا حال معظم الأسابيع لمعظم الطلبة.')}`;
    }
    $('#log').innerHTML = r.log.map(l => `<li>${l.txt}</li>`).join('');
  }

  /* ---------- controls ---------- */
  $('#scenario').addEventListener('change', e => {
    state.scenario = e.target.value;
    RAW = generate(state.scenario);
    state.cardLang = null;
    compute();
  });
  $('#examMode').addEventListener('change', e => { state.exam = e.target.checked; compute(); });
  $('#day').addEventListener('input', e => { stop(); state.day = +e.target.value; compute(); });
  let playing = false, playTimer = null;
  function play(fromStart) {
    if (playing) return stop();
    playing = true;
    $('#play').classList.add('is-playing');
    if (fromStart || state.day >= DAYS - 1) state.day = 0;
    const step = () => {
      if (!playing) return;
      state.day++;
      $('#day').value = state.day;
      compute();
      if (state.day >= DAYS - 1) return stop();
      playTimer = setTimeout(step, reduceMotion ? 20 : 95);
    };
    compute();
    playTimer = setTimeout(step, 95);
  }
  function stop() { playing = false; clearTimeout(playTimer); $('#play').classList.remove('is-playing'); }
  $('#play').addEventListener('click', () => play());

  /* ================= 04 · Insight card ================= */
  const FINGERPRINT = {
    A: { en: [['Where', 'English PDFs over 3,000 words'], ['When', 'after 11 pm'], ['Not', 'Arabic readings — unchanged']], ar: [['أين', 'ملفات PDF إنجليزية تتجاوز ٣٠٠٠ كلمة'], ['متى', 'بعد الحادية عشرة ليلاً'], ['ليس', 'القراءات العربية — بلا تغيير']] },
    B: { en: [['Where', 'forum posts & lab reports'], ['When', 'final 12 hours before deadlines'], ['Not', 'in-class quizzes']], ar: [['أين', 'منشورات المنتدى وتقارير المختبر'], ['متى', 'آخر ١٢ ساعة قبل المواعيد'], ['ليس', 'الاختبارات القصيرة في الصف']] },
    C: { en: [['Where', 'every course at once'], ['When', 'since week 7, all hours'], ['Also', 'study time drifting past 2 am']], ar: [['أين', 'كل المقررات معاً'], ['متى', 'منذ الأسبوع ٧، في كل الأوقات'], ['أيضاً', 'وقت الدراسة ينزلق بعد الثانية فجراً']] },
    M: { en: [['Where', 'all courses'], ['When', 'midterm fortnight']], ar: [['أين', 'كل المقررات'], ['متى', 'أسبوعا الامتحانات']] }
  };
  function profileOf(sigs) {
    if (sigs.length >= 4 || state.scenario === 'C') return 'C';
    const a = ['s1', 's3'].filter(s => sigs.includes(s)).length;
    const b = ['s2', 's4'].filter(s => sigs.includes(s)).length;
    return a >= b ? 'A' : 'B';
  }
  const CARD = {
    A: {
      en: { h: 'Reading has looked heavier for you lately.', p: 'For the last few weeks, dense reading has taken you more effort than it did earlier this semester. That happens to lots of people, for lots of reasons — and there are tools that make it lighter.' },
      ar: { h: 'يبدو أن القراءة أصبحت أثقل عليك مؤخراً.', p: 'في الأسابيع الأخيرة، تطلّبت القراءة الكثيفة منك جهداً أكبر مما كانت عليه في بداية الفصل. هذا يحدث لكثيرين، ولأسباب كثيرة — وهناك أدوات تجعلها أخف.' }
    },
    B: {
      en: { h: 'Getting started has been harder than usual.', p: 'Lately, work has been piling up until the last few hours, and some drafts haven\'t made it to "submit". That\'s not laziness — it\'s friction, and friction can be reduced.' },
      ar: { h: 'كان البدء أصعب من المعتاد.', p: 'مؤخراً، تتراكم المهام حتى الساعات الأخيرة، وبعض المسودات لم تصل إلى «إرسال». هذا ليس كسلاً — إنه احتكاك، والاحتكاك يمكن تخفيفه.' }
    },
    C: {
      en: { h: 'A lot has shifted for you at once.', p: 'Since around week 7, nearly everything — reading, planning, finishing — has looked different from your own normal. Sometimes that\'s workload; sometimes it\'s life. Either way, you don\'t have to sort it out alone.' },
      ar: { h: 'تغيّرت أشياء كثيرة عليك دفعة واحدة.', p: 'منذ الأسبوع السابع تقريباً، بدا كل شيء تقريباً — القراءة والتخطيط والإنجاز — مختلفاً عن معدلك الطبيعي. أحياناً يكون السبب العبء الدراسي، وأحياناً الحياة. في الحالتين، لست مضطراً لمواجهته وحدك.' }
    }
  };
  const SIG_DETAIL = {
    s1: { en: 'You\'ve been scrolling back to re-read more often than in weeks 1–6.', ar: 'تعود لإعادة القراءة أكثر مما كنت تفعل في الأسابيع ١–٦.' },
    s2: { en: 'More drafts and posts started, then left unsent.', ar: 'مسودات ومنشورات أكثر بدأت ثم لم تُرسل.' },
    s3: { en: 'You\'ve been switching from text to audio more.', ar: 'تتحوّل من النص إلى الصوت أكثر من قبل.' },
    s4: { en: 'More of your work is landing in the final hours before deadlines.', ar: 'جزء أكبر من عملك يحدث في الساعات الأخيرة قبل المواعيد.' }
  };
  function suggestions(profile) {
    const bp = ERLY.state.blueprint;
    const t = (en, ar) => (cardLang() === 'ar' ? ar : en);
    let s;
    if (profile === 'A') s = [t('Read-aloud', 'القراءة الصوتية'), t('Line focus', 'تركيز السطر'), t('Readable font', 'خط مقروء')];
    else if (profile === 'B') s = [t('Start-Ramp micro-tasks', 'مهام منحدر البداية'), t('Focus sprints', 'جولات التركيز'), t('Time-management workshop', 'ورشة إدارة الوقت')];
    else s = [t('Talk to a counsellor', 'تحدّث مع مرشد'), t('Wellbeing resources', 'موارد الرفاه'), t('Course-load conversation', 'نقاش العبء الدراسي')];
    if (bp && profile === 'A' && bp.visual) s[2] = t('Visual summaries', 'ملخصات بصرية');
    if (bp && profile === 'A' && bp.auditory) s.unshift(s.splice(0, 1)[0]);
    if (bp && profile === 'B' && bp.social) s[2] = t('Body-doubling room', 'غرفة الدراسة المشتركة');
    return s;
  }
  function cardLang() { return state.cardLang || I18N.lang; }
  function renderInsight() {
    const r = state.result;
    const has = r && r.fired;
    $('#insightEmpty').hidden = !!has;
    $('#insightCard').hidden = !has;
    if (!has) return;
    const lang = cardLang();
    const ar = lang === 'ar';
    $$('#cardLang button').forEach(b => b.classList.toggle('is-on', b.dataset.l === lang));
    const card = $('#insightCard');
    card.dataset.lang = lang;
    const sigs = r.fired.signals
      .map(id => ({ id, z: r.weekly[id][r.fired.week] }))
      .sort((a, b) => b.z - a.z).slice(0, 3);
    const profile = profileOf(r.fired.signals);
    state.profile = profile;
    const c = CARD[profile][ar ? 'ar' : 'en'];
    const fp = (FINGERPRINT[state.scenario] || FINGERPRINT.A)[ar ? 'ar' : 'en'];
    const body = $('#cardBody');
    body.dir = ar ? 'rtl' : 'ltr';
    body.lang = lang;
    body.innerHTML = `
      <h4>${c.h}</h4>
      <p class="insight__lead">${c.p}</p>
      <p class="panel__h mono">${ar ? 'لماذا تظهر هذه البطاقة — ٣ مؤشرات' : 'Why you\'re seeing this — 3 signals'}</p>
      <ul class="insight__sig">${sigs.map(s => {
        const meta = SIGS.find(x => x.id === s.id);
        const first = r.rows.find(row => !row.paused && row.up[s.id]);
        const since = first ? first.w + 1 : r.fired.week + 1;
        return `<li style="--c:var(--${s.id})"><div><b>${ar ? meta.ar : meta.en}</b><small>${SIG_DETAIL[s.id][ar ? 'ar' : 'en']}</small></div><span class="mono">${ar ? 'منذ الأسبوع' : 'since wk'} ${since}</span></li>`;
      }).join('')}</ul>
      <p class="panel__h mono">${ar ? 'بصمة الاحتكاك' : 'Friction Fingerprint'}</p>
      <div class="fingerprint">${fp.map(([k, v]) => `<span><b>${k}:</b> ${v}</span>`).join('')}</div>
      <div class="insight__help"><b>${ar ? 'قد يساعد:' : 'Might help:'}</b> ${suggestions(profile).join(' · ')}</div>`;
  }
  $$('#cardLang button').forEach(b => b.addEventListener('click', () => { state.cardLang = b.dataset.l; renderInsight(); }));
  $('#runRhythm').addEventListener('click', function () {
    const btn = this, box = $('#rhythm');
    btn.disabled = true;
    let k = 0;
    const iv = setInterval(() => {
      k += 10;
      btn.textContent = T(`Reading… ${k}%`, `جارٍ القراءة… ${k}٪`);
      if (k >= 100) {
        clearInterval(iv);
        box.classList.add('is-done');
        box.innerHTML = `<div><b>${T('Rhythm check complete', 'اكتمل فحص الإيقاع')}</b><small>${T('Your pace on this passage was noticeably slower than your own week-2 reading, with 4 re-reads. It supports the card. It doesn\'t diagnose anything — and only you can see it.', 'كانت وتيرتك في هذه الفقرة أبطأ بوضوح من قراءتك في الأسبوع الثاني، مع ٤ مرات إعادة قراءة. هذا يدعم البطاقة، لكنه لا يشخّص شيئاً — وأنت وحدك من يراه.')}</small></div>`;
        state.rhythmDone = true;
      }
    }, reduceMotion ? 10 : 220);
  });
  $('#notRight').addEventListener('click', () => {
    ERLY.toast(T('Thanks — ERLY will widen your baseline and stay quiet for 3 weeks. Your feedback is a signal too.', 'شكراً — سيوسّع إيرلي خط أساسك ويبقى صامتاً ٣ أسابيع. ملاحظتك مؤشر أيضاً.'));
  });

  /* ================= 05 · Ally Bridge ================= */
  const PLAYBOOK = {
    A: {
      say: [['"Thanks for telling me. That sounds tiring."', '«شكراً لأنك أخبرتني. يبدو هذا متعباً.»'], ['"Lots of smart people find reading heavy. It\'s worth checking."', '«كثير من الأذكياء يجدون القراءة ثقيلة. يستحق الأمر التحقق.»'], ['"Want me to come with you to SAS?"', '«هل تريدني أن أرافقك إلى خدمات الطلبة؟»']],
      dont: [['"You just need to read more."', '«تحتاج فقط أن تقرأ أكثر.»'], ['"Maybe you\'re dyslexic." (no labels)', '«ربما لديك عُسر قراءة.» (بلا تصنيفات)'], ['Telling family or friends without asking', 'إخبار العائلة أو الأصدقاء دون إذن']]
    },
    B: {
      say: [['"That sounds really frustrating — not lazy."', '«يبدو هذا محبطاً فعلاً — وليس كسلاً.»'], ['"What\'s the smallest first step? Let\'s do 5 minutes together."', '«ما أصغر خطوة أولى؟ لنعمل ٥ دقائق معاً.»'], ['"Want me to sit with you when you book?"', '«هل تريدني بجانبك حين تحجز؟»']],
      dont: [['"Just start earlier."', '«ابدأ مبكراً فقط.»'], ['"Everyone procrastinates."', '«الجميع يماطل.»'], ['Checking up on their deadlines for them', 'مراقبة مواعيدهم نيابةً عنهم']]
    },
    C: {
      say: [['"I\'m really glad you told me."', '«أنا سعيد جداً لأنك أخبرتني.»'], ['"You don\'t have to explain everything right now."', '«لست مضطراً لشرح كل شيء الآن.»'], ['"Would talking to a counsellor help? I can come."', '«هل يساعد الحديث مع مرشد؟ يمكنني المجيء.»']],
      dont: [['"Everyone\'s stressed, it\'s just exams."', '«الجميع متوتر، إنها الامتحانات فقط.»'], ['Pushing for details they haven\'t offered', 'الإلحاح على تفاصيل لم يقدّموها'], ['Promising to keep a safety concern secret', 'الوعد بإخفاء أمر يتعلق بالسلامة']]
    }
  };
  const SLOTS = [['Mon', 'الإثنين', '27 Oct', '09:30', 'Ms. Al Mansoori'], ['Tue', 'الثلاثاء', '28 Oct', '10:30', 'Dr. Rahman'], ['Tue', 'الثلاثاء', '28 Oct', '14:00', 'Ms. Al Mansoori'], ['Wed', 'الأربعاء', '29 Oct', '11:00', 'Dr. Rahman'], ['Thu', 'الخميس', '30 Oct', '13:30', 'Ms. Khoury'], ['Thu', 'الخميس', '30 Oct', '15:00', 'Dr. Rahman']];
  const check = '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m6 10.5 2.6 2.5L14 7.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

  function allyName() {
    return state.allyChoice || state.allies[0] || 'Sara';
  }
  function renderAlly() {
    const steps = $$('#allySteps li');
    steps.forEach((li, i) => { li.classList.toggle('is-on', i === state.allyStep); li.classList.toggle('is-done', i < state.allyStep); });
    const st = $('#allyStage');
    st.style.animation = 'none'; void st.offsetWidth; st.style.animation = '';
    const profile = state.profile || 'A';
    const name = allyName();
    const nav = (back, next, nextLabel) => `<div class="row-btns" style="margin-top:8px">${back ? `<button class="btn btn--sm btn--ghost" data-ally-step="${state.allyStep - 1}">${T('← Back', '→ رجوع')}</button>` : ''}${next ? `<button class="btn btn--sm btn--accent" data-ally-step="${state.allyStep + 1}">${nextLabel}</button>` : ''}</div>`;

    if (!state.result || !state.result.fired) {
      st.innerHTML = `<div class="insight-empty"><p>${T('The Ally Bridge opens from an insight card. Run a scenario on the Signal timeline first.', 'يُفتح جسر الحليف من بطاقة ملاحظة. شغّل سيناريو في الخط الزمني أولاً.')}</p><button class="btn btn--ghost btn--sm" data-goto="signals">${T('Go to timeline →', 'اذهب إلى الخط الزمني ←')}</button></div>`;
      return;
    }

    if (state.allyStep === 0) {
      const opts = [...new Set([...state.allies])];
      st.innerHTML = `
        <p class="lead2">${T(`Your pact from week 1 names ${opts.join(' and ')}. Do you still want to involve someone?`, `ميثاقك من الأسبوع الأول يسمّي ${opts.join(' و')}. هل ما زلت تريد إشراك أحد؟`)}</p>
        <div class="allies" style="max-width:560px">${opts.map(a => `<button class="ally ${a === name ? 'is-on' : ''}" data-pick="${a}"><span class="avatar">${a === 'SAS' ? '+' : a.replace('Dr. ', '')[0]}</span><span><b>${a === 'SAS' ? T('SAS directly', 'خدمات الطلبة مباشرة') : a}</b><small>${T('from your pact', 'من ميثاقك')}</small></span></button>`).join('')}</div>
        <div class="grid-2" style="max-width:680px;margin-bottom:12px">
          <div class="panel"><p class="panel__h mono ok">${T(`${name} will see`, `سيرى ${name}`)}</p><ul class="rules"><li>${T('The message you choose to send', 'الرسالة التي تختار إرسالها')}</li><li>${T('A short Support Playbook', 'دليل دعم قصير')}</li></ul></div>
          <div class="panel"><p class="panel__h mono no">${T(`${name} will never see`, `لن يرى ${name} أبداً`)}</p><ul class="rules"><li>${T('Your signals or timeline', 'مؤشراتك أو خطك الزمني')}</li><li>${T('Your insight card', 'بطاقة ملاحظتك')}</li></ul></div>
        </div>
        <div class="row-btns"><button class="btn btn--sm btn--accent" data-ally-step="1">${T(`Yes, involve ${name}`, `نعم، أشرك ${name}`)}</button><button class="btn btn--sm btn--ghost" data-ally-step="3">${T('Skip — book SAS myself', 'تخطَّ — سأحجز بنفسي')}</button><button class="btn btn--sm btn--quiet" id="notNow">${T('Not now', 'ليس الآن')}</button></div>`;
    } else if (state.allyStep === 1) {
      const pb = PLAYBOOK[profile];
      const i = I18N.lang === 'ar' ? 1 : 0;
      st.innerHTML = `
        <div class="msg"><span class="msg__from">${T('Noura → ' + name + ' · you can edit this', 'نورة ← ' + name + ' · يمكنك تعديلها')}</span><div contenteditable="true" spellcheck="false">${T(`Hey ${name} — I've been using a study app that noticed things have been harder for me lately. Nothing scary. Would you be up for coming with me to talk to Student Accessibility Services?`, `مرحباً ${name} — أستخدم تطبيقاً دراسياً لاحظ أن الأمور أصبحت أصعب عليّ مؤخراً. لا شيء مخيف. هل يمكنك مرافقتي للحديث مع خدمات دعم الطلبة؟`)}</div></div>
        <p class="panel__h mono">${T(`Support Playbook — what ${name} receives`, `دليل الدعم — ما يتلقاه ${name}`)}</p>
        <div class="playbook">
          <div><h5 class="ok">${T('Try saying', 'جرّب أن تقول')}</h5><ul>${pb.say.map(x => `<li>${x[i]}</li>`).join('')}</ul></div>
          <div><h5 class="no">${T('Please avoid', 'رجاءً تجنّب')}</h5><ul>${pb.dont.map(x => `<li>${x[i]}</li>`).join('')}</ul></div>
        </div>
        ${nav(true, true, T('Send to ' + name + ' →', 'أرسل إلى ' + name + ' ←'))}`;
    } else if (state.allyStep === 2) {
      const lines = [
        ['Open', 'افتح', T(`"Thanks for coming. I wanted to tell you something."`, '«شكراً لمجيئك. أردت أن أخبرك بشيء.»')],
        ['Listen', 'استمع', T(`${name} listens. No fixing yet.`, `${name} يستمع. بلا حلول بعد.`)],
        ['Normalise', 'طمئن', T(`"That makes sense. Loads of people deal with this."`, '«هذا مفهوم. كثيرون يمرّون بهذا.»')],
        ['Offer', 'اعرض', T(`"Shall we book SAS together? I'll come."`, '«هل نحجز مع خدمات الطلبة معاً؟ سآتي معك.»')]
      ];
      st.innerHTML = `
        <div class="msg" style="border-color:var(--teal)"><span class="msg__from">${name} · ${T('2 min ago', 'قبل دقيقتين')}</span>${T('Of course. Proud of you for saying something. When are you free?', 'طبعاً. فخور بك لأنك تحدثت. متى تكون متفرغاً؟')}</div>
        <p class="panel__h mono">${T('A four-beat conversation guide, for both of you', 'دليل محادثة من أربع خطوات، لكما معاً')}</p>
        <ol class="script">${lines.map(([en, ar, l]) => `<li><span class="mono">${T(en, ar)}</span><span>${l}</span></li>`).join('')}</ol>
        ${nav(true, true, T('Book SAS together →', 'احجزا معاً ←'))}`;
    } else if (state.allyStep === 3) {
      st.innerHTML = `
        <p class="lead2">${T('Pick a time with Student Accessibility Services.', 'اختر موعداً مع خدمات دعم الطلبة.')}</p>
        <div class="slots">${SLOTS.map((s, i) => `<button class="slot ${state.slot === i ? 'is-on' : ''}" data-slot="${i}"><b>${T(s[0], s[1])} · ${s[3]}</b><small>${s[2]} · ${s[4]}</small></button>`).join('')}</div>
        <label class="check-row"><input type="checkbox" id="allyAttend" ${state.allyAttends ? 'checked' : ''}><span>${T(`${name} joins me`, `${name} يرافقني`)}</span></label>
        <label class="check-row"><input type="checkbox" id="sharePack" ${state.sharePack ? 'checked' : ''}><span>${T('Share my Evidence Pack with the counsellor (I can preview it first)', 'شارك حزمة أدلتي مع المرشد (يمكنني معاينتها أولاً)')}</span></label>
        <div class="row-btns"><button class="btn btn--sm btn--ghost" data-ally-step="${state.allyStep - 1}">${T('← Back', '→ رجوع')}</button><button class="btn btn--sm btn--accent" id="bookBtn" ${state.slot == null ? 'disabled' : ''}>${T('Book in one tap', 'احجز بنقرة واحدة')}</button></div>`;
    } else {
      const s = SLOTS[state.slot == null ? 1 : state.slot];
      st.innerHTML = `
        <p class="lead2">${T(`Booked: ${s[0]} ${s[2]}, ${s[3]} with ${s[4]}.`, `تم الحجز: ${s[1]} ${s[2]}، ${s[3]} مع ${s[4]}.`)}</p>
        <ul class="handoff">
          <li>${check}<div><b>${T('Intake pre-filled from your Evidence Pack', 'نموذج الاستقبال معبّأ من حزمة أدلتك')}</b><small>${state.sharePack ? T('Signal timeline, Friction Fingerprint, tools that helped. You approved it.', 'الخط الزمني، بصمة الاحتكاك، الأدوات التي ساعدت. وافقت عليها.') : T('Not shared — you can bring it on the day.', 'لم تُشارك — يمكنك إحضارها يوم الموعد.')}</small></div></li>
          <li>${check}<div><b>${state.allyAttends ? T(`${name} invited to attend`, `دُعي ${name} للحضور`) : T('Attending on your own', 'ستحضر وحدك')}</b><small>${T('Calendar invite sent from your account, not ERLY\'s.', 'أُرسلت الدعوة من حسابك، لا من إيرلي.')}</small></div></li>
          <li>${check}<div><b>${T('Check-in 48 hours after the appointment', 'متابعة بعد ٤٨ ساعة من الموعد')}</b><small>${T('"How did it go? Want help with next steps?" — one tap to dismiss.', '«كيف سار الأمر؟ هل تريد مساعدة في الخطوات التالية؟» — نقرة واحدة للتجاهل.')}</small></div></li>
          <li>${check}<div><b>${T('Accommodation request drafted', 'طلب التسهيلات جاهز كمسودة')}</b><small>${T('Unlocks once a clinician confirms an outcome. You send it — not us.', 'يُفتح عندما يؤكد مختص النتيجة. أنت من يرسله — لا نحن.')}</small></div></li>
        </ul>
        <div class="row-btns"><button class="btn btn--sm btn--ink" data-goto="pack">${T('Open Evidence Pack →', 'افتح حزمة الأدلة ←')}</button><button class="btn btn--sm btn--ghost" data-ally-step="0">${T('Start over', 'ابدأ من جديد')}</button></div>`;
    }
  }
  $('#allyStage').addEventListener('click', e => {
    const s = e.target.closest('[data-ally-step]');
    if (s) { state.allyStep = +s.dataset.allyStep; if (state.allyStep === 2) ERLY.toast(T(`Sent to ${allyName()}. Playbook attached.`, `أُرسلت إلى ${allyName()}. الدليل مرفق.`)); renderAlly(); return; }
    const p = e.target.closest('[data-pick]');
    if (p) { state.allyChoice = p.dataset.pick; renderAlly(); return; }
    const sl = e.target.closest('[data-slot]');
    if (sl) { state.slot = +sl.dataset.slot; renderAlly(); return; }
    if (e.target.id === 'bookBtn') { state.allyStep = 4; ERLY.toast(T('Booked. Joint session confirmed.', 'تم الحجز. الجلسة المشتركة مؤكدة.')); renderAlly(); return; }
    if (e.target.id === 'notNow') ERLY.toast(T('Okay. Nothing was sent. The card stays in your inbox.', 'حسناً. لم يُرسل شيء. تبقى البطاقة في صندوقك.'));
  });
  $('#allyStage').addEventListener('change', e => {
    if (e.target.id === 'allyAttend') state.allyAttends = e.target.checked;
    if (e.target.id === 'sharePack') state.sharePack = e.target.checked;
  });
  tabs.find(t => t.dataset.screen === 'ally').addEventListener('click', renderAlly);

  /* ================= 06 · Start-Ramp ================= */
  const RAMP = {
    report: { first: ['Open the lab handout and copy the three section headings into a blank doc.', 'افتح ورقة المختبر وانسخ عناوين الأقسام الثلاثة في مستند فارغ.'], steps: [['Paste your raw data table', 'الصق جدول البيانات الخام', 10], ['Write the aim in one sentence', 'اكتب الهدف في جملة واحدة', 5], ['Make one graph', 'ارسم رسماً بيانياً واحداً', 20], ['Three bullet points for discussion', 'ثلاث نقاط للمناقشة', 15], ['Turn bullets into paragraphs', 'حوّل النقاط إلى فقرات', 30]] },
    essay: { first: ['Write the worst possible first sentence. Seriously — just one.', 'اكتب أسوأ جملة افتتاحية ممكنة. بجدية — جملة واحدة فقط.'], steps: [['List three things you want to say', 'اكتب ثلاثة أشياء تريد قولها', 10], ['Find one quote for each', 'جد اقتباساً لكل منها', 20], ['Write one paragraph — any one', 'اكتب فقرة واحدة — أيّاً كانت', 25], ['Write the other two', 'اكتب الفقرتين الأخريين', 40], ['Intro & conclusion last', 'المقدمة والخاتمة في النهاية', 20]] },
    problems: { first: ['Read question 1 only, and write down what it\'s asking for.', 'اقرأ السؤال الأول فقط، واكتب ما المطلوب.'], steps: [['Q1 — attempt, don\'t perfect', 'السؤال ١ — حاول، لا تُتقن', 15], ['Q2', 'السؤال ٢', 15], ['Mark the ones you\'re stuck on', 'علّم الأسئلة التي علقت فيها', 5], ['One question to ask a TA', 'سؤال واحد للمعيد', 5], ['Finish the rest', 'أكمل الباقي', 40]] },
    forum: { first: ['Type your reply in a note first — no one can see it there.', 'اكتب ردك في ملاحظة أولاً — لا أحد يراها هناك.'], steps: [['One sentence: your main point', 'جملة واحدة: فكرتك الأساسية', 5], ['One example or source', 'مثال أو مصدر واحد', 10], ['Read it once, out loud', 'اقرأها مرة واحدة بصوت عالٍ', 3], ['Post — and don\'t delete it', 'انشرها — ولا تحذفها', 1]] }
  };
  const done = {};
  function renderRamp() {
    const type = $('#taskType').value;
    const due = +$('#taskDue').value;
    const r = RAMP[type];
    const i = I18N.lang === 'ar' ? 1 : 0;
    const span = 96;
    const pos = h => ((span - h) / span * 100);
    const nudges = [72, 24, 6];
    const side = I18N.lang === 'ar' ? 'right' : 'left';
    $('#rampLine').innerHTML =
      nudges.map(h => `<span class="ramp-pt is-nudge" style="${side}:${pos(h)}%"><span>${T('nudge', 'تذكير')}</span><i></i><em>−${h}h</em></span>`).join('') +
      `<span class="ramp-pt is-now" style="${side}:${pos(due)}%"><span>${T('now', 'الآن')}</span><i></i><em>${due}h</em></span>` +
      `<span class="ramp-pt" style="${side}:100%"><span>${T('due', 'الموعد')}</span><i></i><em>0h</em></span>`;
    $('#firstStep').innerHTML = `<small>${T('Your five-minute first step', 'خطوتك الأولى في خمس دقائق')}</small><b>${r.first[i]}</b>`;
    const key = type;
    done[key] = done[key] || {};
    $('#microList').innerHTML = r.steps.map((s, k) =>
      `<li class="${done[key][k] ? 'is-done' : ''}"><label><input type="checkbox" data-k="${k}" ${done[key][k] ? 'checked' : ''}><span>${s[i]}</span></label><span class="mono">${s[2]}m</span></li>`
    ).join('');
  }
  $('#taskType').addEventListener('change', renderRamp);
  $('#taskDue').addEventListener('change', renderRamp);
  $('#microList').addEventListener('change', e => {
    const type = $('#taskType').value;
    done[type][e.target.dataset.k] = e.target.checked;
    renderRamp();
    const all = RAMP[type].steps.every((_, k) => done[type][k]);
    if (all) ERLY.toast(T('Done. That\'s the 11th-hour spike, defused.', 'انتهيت. هكذا تُفكَّك اندفاعة الساعة الأخيرة.'));
  });
  renderRamp();

  // Focus timer
  const C = 2 * Math.PI * 88;
  let tMin = 5, tLeft = 300, tRun = null;
  const ring = $('#ringFg');
  ring.style.strokeDasharray = C;
  function drawTimer() {
    $('#timerTxt').textContent = String(Math.floor(tLeft / 60)).padStart(2, '0') + ':' + String(tLeft % 60).padStart(2, '0');
    ring.style.strokeDashoffset = C * (1 - tLeft / (tMin * 60));
  }
  $$('#timerLen button').forEach(b => b.addEventListener('click', () => {
    $$('#timerLen button').forEach(x => x.classList.toggle('is-on', x === b));
    tMin = +b.dataset.m;
    resetTimer();
    $('#timerMode').textContent = tMin === 5 ? T('first step', 'الخطوة الأولى') : T('focus sprint', 'جولة تركيز');
  }));
  function resetTimer() { clearInterval(tRun); tRun = null; tLeft = tMin * 60; $('#timerGo').textContent = T('Start', 'ابدأ'); drawTimer(); }
  $('#timerGo').addEventListener('click', () => {
    if (tRun) { clearInterval(tRun); tRun = null; $('#timerGo').textContent = T('Resume', 'استأنف'); return; }
    $('#timerGo').textContent = T('Pause', 'إيقاف مؤقت');
    tRun = setInterval(() => {
      tLeft--;
      drawTimer();
      if (tLeft <= 0) { resetTimer(); ERLY.toast(T('Sprint done. Take five — you earned it.', 'انتهت الجولة. خذ خمس دقائق — تستحقها.')); }
    }, 1000);
  });
  $('#timerReset').addEventListener('click', resetTimer);
  drawTimer();

  /* ================= 07 · Evidence Pack & letter ================= */
  function packData() {
    const r = state.result;
    const fired = r && r.fired;
    const rs = ERLY.getReaderStats ? ERLY.getReaderStats() : {};
    return {
      generated: new Date().toISOString(),
      synthetic: true,
      student: 'Noura (synthetic)',
      consent: state.consent,
      baselineWindow: 'weeks 1-6',
      examMode: state.exam,
      convergence: fired ? { metAtWeek: fired.week + 1, signals: fired.signals } : null,
      profile: fired ? state.profile : null,
      weeklyZ: Object.fromEntries(SIGS.map(s => [s.id, r.weekly[s.id].map(v => +v.toFixed(2))])),
      frictionFingerprint: (FINGERPRINT[state.scenario] || {}).en || [],
      learningBlueprint: ERLY.state.blueprint ? ERLY.state.blueprint.answers : null,
      toolsTried: rs.tools || [],
      toolPreferences: rs.prefs ? Object.fromEntries(Object.entries(rs.prefs).map(([k, p]) => [k, +(p.a / (p.a + p.b)).toFixed(2)])) : null,
      rhythmCheck: state.rhythmDone ? 'completed — slower than own week-2 pace, 4 re-reads' : 'not run',
      note: 'ERLY reports friction patterns relative to the student\'s own baseline. It is not a diagnostic instrument.'
    };
  }
  function renderPack() {
    const d = packData();
    const r = state.result;
    const mini = SIGS.map(s => {
      const pts = r.weekly[s.id].map((v, w) => `${(w / 8 * 100).toFixed(1)},${(60 - Math.max(-1, Math.min(5, v)) * 10).toFixed(1)}`).join(' ');
      return `<polyline points="${pts}" fill="none" style="stroke:var(--${s.id})" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
    }).join('');
    $('#packPreview').innerHTML = `
      <div class="pack__head"><div><h4>${T('Evidence Pack', 'حزمة الأدلة')}</h4><small>Noura · ${T('synthetic', 'اصطناعية')} · ${new Date().toLocaleDateString('en-GB')}</small></div><span class="honesty honesty--live">${T('student-owned', 'ملك الطالب')}</span></div>
      <div class="pack__sec"><h5>${T('Weekly signal timeline (σ vs own baseline)', 'الخط الزمني الأسبوعي (σ مقارنةً بخط الأساس)')}</h5>
        <svg class="pack__mini" viewBox="0 0 100 70" preserveAspectRatio="none"><rect x="0" y="0" width="${6 / 8 * 100 - 6}" height="70" fill="var(--surface-2)"/><line x1="0" x2="100" y1="${60 - THRESH * 10}" y2="${60 - THRESH * 10}" stroke="var(--line-2)" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>${mini}</svg></div>
      <div class="pack__sec"><h5>${T('Summary', 'الملخص')}</h5>
        <div class="pack__row"><span>${T('Convergence met', 'تحققت قاعدة الالتقاء')}</span><span>${d.convergence ? 'wk ' + d.convergence.metAtWeek : '—'}</span></div>
        <div class="pack__row"><span>${T('Contributing signals', 'المؤشرات المساهمة')}</span><span>${d.convergence ? d.convergence.signals.map(s => s.toUpperCase()).join(' · ') : '—'}</span></div>
        <div class="pack__row"><span>${T('Friction profile', 'نمط الاحتكاك')}</span><span>${d.profile || '—'}</span></div>
        <div class="pack__row"><span>${T('Exam Mode', 'وضع الامتحانات')}</span><span>${d.examMode ? T('on', 'مفعّل') : T('off', 'متوقف')}</span></div>
        <div class="pack__row"><span>${T('Rhythm check', 'فحص الإيقاع')}</span><span>${state.rhythmDone ? T('done', 'تم') : T('not run', 'لم يُجرَ')}</span></div>
        <div class="pack__row"><span>${T('Tools tried (live reader)', 'الأدوات المجرّبة (القارئ)')}</span><span>${d.toolsTried.length ? d.toolsTried.join(', ') : '—'}</span></div>
        <div class="pack__row"><span>${T('Learning Blueprint', 'مخطط التعلّم')}</span><span>${d.learningBlueprint ? d.learningBlueprint.join(', ') : '—'}</span></div>
      </div>
      <p class="small muted">${T('Not a diagnosis. A pattern, so the first appointment can start from evidence instead of guesswork.', 'ليست تشخيصاً. إنها نمط، ليبدأ الموعد الأول من أدلة بدل التخمين.')}</p>`;
    renderLetter();
  }

  const ACCOMS = {
    dyslexia: [['25% extended time on timed assessments', 'وقت إضافي ٢٥٪ في التقييمات المؤقتة'], ['Text-to-speech software in exams', 'برنامج تحويل النص إلى كلام في الامتحانات'], ['Readings in accessible digital formats, in advance', 'القراءات بصيغ رقمية ميسّرة، مسبقاً'], ['Quiet, separate exam room', 'قاعة امتحان هادئة ومنفصلة']],
    adhd: [['Distraction-reduced testing environment', 'بيئة اختبار قليلة المشتتات'], ['Extensions of up to 48 hours on major projects, by arrangement', 'تمديد حتى ٤٨ ساعة للمشاريع الكبيرة، بالتنسيق'], ['25% extended time on timed assessments', 'وقت إضافي ٢٥٪ في التقييمات المؤقتة'], ['Scheduled breaks during long exams', 'استراحات مجدولة في الامتحانات الطويلة']],
    anxiety: [['Separate exam room', 'قاعة امتحان منفصلة'], ['Rest breaks during exams', 'استراحات أثناء الامتحانات'], ['Flexible deadlines during documented flare-ups', 'مرونة في المواعيد خلال النوبات الموثقة'], ['Liaison with university counselling', 'تنسيق مع الإرشاد الجامعي']],
    none: [['Study-skills coaching', 'تدريب على مهارات الدراسة'], ['Priority tutoring slots', 'أولوية في مواعيد الدروس الخصوصية'], ['Course-load consultation', 'استشارة حول العبء الدراسي']]
  };
  const OUTCOME = { dyslexia: ['dyslexia', 'عُسر القراءة'], adhd: ['ADHD', 'اضطراب فرط الحركة وتشتت الانتباه'], anxiety: ['an anxiety disorder', 'اضطراب القلق'], none: [null, null] };
  const PATTERN = {
    A: ['re-reading loops in dense English texts, a shift towards audio, and late-start spikes before deadlines', 'حلقات إعادة قراءة في النصوص الإنجليزية الكثيفة، وتحوّل نحو الصوت، واندفاعات في اللحظة الأخيرة قبل المواعيد'],
    B: ['drafts abandoned before submission and most work landing in the final hours before deadlines', 'مسودات تُهجر قبل التسليم ومعظم العمل في الساعات الأخيرة قبل المواعيد'],
    C: ['a sudden change across reading, planning and submission compared with my own earlier weeks', 'تغيّر مفاجئ في القراءة والتخطيط والتسليم مقارنةً بأسابيعي الأولى']
  };
  let accomSel = null;
  $('#confirmed').addEventListener('change', e => { $('#outcome').disabled = !e.target.checked; accomSel = null; renderLetter(); });
  $('#outcome').addEventListener('change', () => { accomSel = null; renderLetter(); });
  $('#letterLang').addEventListener('change', renderLetter);
  $('#accoms').addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    const k = +c.dataset.k;
    accomSel.has(k) ? accomSel.delete(k) : accomSel.add(k);
    renderLetter();
  });
  function renderLetter() {
    const L = $('#letter');
    const conf = $('#confirmed').checked;
    const out = $('#outcome').value;
    const ar = $('#letterLang').value === 'ar';
    L.dir = ar ? 'rtl' : 'ltr';
    const list = ACCOMS[out];
    if (!accomSel) accomSel = new Set(list.map((_, k) => k).slice(0, 3));
    $('#accoms').innerHTML = conf ? list.map((a, k) => `<button class="chip ${accomSel.has(k) ? 'is-on' : ''}" data-k="${k}">${a[ar ? 1 : 0]}</button>`).join('') : '';
    if (!conf) {
      L.classList.add('is-locked');
      L.contentEditable = 'false';
      L.textContent = T('Locked until a qualified clinician confirms an assessment outcome. ERLY never writes "I have X" on the strength of its own signals.', 'مقفل حتى يؤكد مختص مؤهل نتيجة التقييم. لا يكتب إيرلي أبداً «لدي كذا» بناءً على مؤشراته وحدها.');
      return;
    }
    L.classList.remove('is-locked');
    L.contentEditable = 'true';
    const pat = PATTERN[state.profile || 'A'][ar ? 1 : 0];
    const items = list.filter((_, k) => accomSel.has(k)).map(a => '•  ' + a[ar ? 1 : 0]).join('\n');
    const cond = OUTCOME[out][ar ? 1 : 0];
    if (ar) {
      L.textContent = `إلى خدمات دعم الطلبة،

أكتب إليكم لأطلب رسمياً تسهيلات أكاديمية لفصل خريف ٢٠٢٦. ${cond ? `بعد تقييم أجراه مختص مؤهل، تأكّد تشخيصي بـ${cond}.` : 'بعد تقييم أجراه مختص مؤهل، لم يُشخَّص لدي اضطراب، لكنني أطلب دعماً دراسياً.'}

تُظهر حزمة الأدلة من إيرلي، التي أشاركها طوعاً، نمطاً مستمراً منذ الأسبوع السابع يتضمن ${pat}. ومن الأدوات التي ساعدتني: القراءة الصوتية وتركيز السطر.

لذلك أطلب:
${items}

يسعدني لقاؤكم لمناقشة ذلك. شكراً لدعمكم.

مع التقدير،
نورة ـــــــ
الرقم الجامعي: ـــــــ`;
    } else {
      L.textContent = `Dear Student Accessibility Services,

I am writing to formally request academic accommodations for the Fall 2026 semester. ${cond ? `Following an assessment by a qualified clinician, I have a confirmed diagnosis of ${cond}.` : 'Following an assessment by a qualified clinician, no condition was diagnosed, but I am requesting study support.'}

My ERLY Evidence Pack, which I am sharing voluntarily, shows a sustained pattern since week 7 of ${pat}. Tools that have helped me include read-aloud and line focus.

I therefore request:
${items}

I would be glad to meet to discuss this. Thank you for your support.

Kind regards,
Noura ________
Student ID: ________`;
    }
  }
  $('#copyLetter').addEventListener('click', async () => {
    const txt = $('#letter').innerText;
    try { await navigator.clipboard.writeText(txt); ERLY.toast(T('Letter copied. You send it — ERLY doesn\'t.', 'تم نسخ الخطاب. أنت من يرسله — لا إيرلي.')); }
    catch (e) { ERLY.toast(T('Copy failed — select the text and copy manually.', 'فشل النسخ — حدّد النص وانسخه يدوياً.')); }
  });
  $('#dlPack').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(packData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'erly-evidence-pack-synthetic.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ERLY.toast(T('Saved to your device. Nothing was uploaded.', 'حُفظت على جهازك. لم يُرفع شيء.'));
  });
  $('#printPack').addEventListener('click', () => {
    const area = $('#packPreview');
    area.classList.add('print-area');
    window.print();
    setTimeout(() => area.classList.remove('print-area'), 500);
  });

  /* ================= 08 · SAS dashboard ================= */
  const COURSES = ['MECH 210', 'CHEM 101', 'ENGL 102', 'MATH 201', 'BIOL 110', 'ARAB 101'];
  const SIZE = { 'MECH 210': 64, 'CHEM 101': 120, 'ENGL 102': 88, 'MATH 201': 72, 'BIOL 110': 96, 'ARAB 101': 14 };
  const heatRnd = mulberry32(7);
  const HEAT = COURSES.map(c => Array.from({ length: 10 }, (_, w) => {
    let v = 0.06 + heatRnd() * 0.14;
    if (c === 'MECH 210' && w === 3) v = 0.42;
    if (c === 'MECH 210' && w === 4) v = 0.27;
    if (c === 'ENGL 102' && w === 6) v = 0.31;
    if (w === 7) v += 0.08;                      // midterms lift everyone
    const suppressed = c === 'ARAB 101' && w % 3 !== 0;
    return { v: Math.min(0.5, v), sup: suppressed };
  }));
  function renderSAS() {
    const K = [
      [T('Opted-in students', 'طلبة مشتركون'), '1,284', '+212'],
      [T('Cards shown (to students)', 'بطاقات عُرضت (للطلبة)'), '96', ''],
      [T('Booked via ERLY', 'حُجزوا عبر إيرلي'), '31', '+9'],
      [T('Median days card → visit', 'متوسط الأيام من البطاقة للزيارة'), '4', '']
    ];
    $('#kpis').innerHTML = K.map(([l, v, d]) => `<div class="kpi"><small>${l}</small><b>${v}</b>${d ? `<em>${d}</em>` : ''}</div>`).join('');
    const F = [
      [T('Cards shown', 'بطاقات عُرضت'), 96], [T('Tried a tool', 'جرّبوا أداة'), 78], [T('Invited an ally', 'دعوا حليفاً'), 37],
      [T('Booked SAS', 'حجزوا موعداً'), 31], [T('Assessed', 'تم تقييمهم'), 19], [T('Accommodation', 'حصلوا على تسهيلات'), 12]
    ];
    $('#funnel').innerHTML = F.map(([l, n]) => `<div class="fun-row"><span>${l}</span><span class="bar2"><span data-w="${n / 96 * 100}"></span></span><b>${n}</b></div>`).join('') +
      `<p class="small muted" style="margin:8px 0 0">${T('SAS sees counts, never who received a card. Only students who book become visible — by their own choice.', 'ترى خدمات الطلبة الأعداد فقط، لا من تلقى بطاقة. لا يظهر إلا من يحجز — باختياره.')}</p>`;
    requestAnimationFrame(() => $$('#funnel .bar2 span').forEach(s => { s.style.width = s.dataset.w + '%'; }));
    $('#heat').innerHTML =
      `<div class="heat__row"><span></span>${Array.from({ length: 10 }, (_, w) => `<span class="heat__h">${w + 1}</span>`).join('')}</div>` +
      COURSES.map((c, ci) => `<div class="heat__row"><span>${c}</span>${HEAT[ci].map((h, w) => h.sup
        ? `<span class="hc hc--sup" title="${T('suppressed: fewer than 10 students', 'محجوبة: أقل من ١٠ طلبة')}"></span>`
        : `<button class="hc ${h.v > 0.3 ? 'is-hot' : ''}" style="--v:${(h.v * 1.9).toFixed(2)}" data-c="${ci}" data-w="${w}" aria-label="${c} week ${w + 1}: ${Math.round(h.v * 100)}%">${Math.round(h.v * 100)}</button>`).join('')}</div>`).join('');
  }
  $('#heat').addEventListener('click', e => {
    const b = e.target.closest('button.hc');
    if (!b) return;
    const c = COURSES[+b.dataset.c], w = +b.dataset.w, v = HEAT[+b.dataset.c][w].v;
    const pct = Math.round(v * 100);
    const n = $('#nudge');
    n.hidden = false;
    if (v < 0.25) {
      n.innerHTML = `<div><h4>${c} · ${T('week', 'أسبوع')} ${w + 1}: ${pct}%</h4><p>${T('Within the normal range for this course. No nudge — ERLY doesn\'t bother professors with noise.', 'ضمن المعدل الطبيعي لهذا المقرر. لا تنبيه — إيرلي لا يزعج الأساتذة بالضجيج.')}</p></div>`;
      return;
    }
    n.innerHTML = `
      <div>
        <h4>${T('Curriculum Mirror → Professor, ' + c, 'مرآة المنهج ← أستاذ ' + c)}</h4>
        <p>${T(`"Professor, about ${pct}% of consenting students in ${c} showed unusually high reading friction on the Week ${w + 1} reading (${SIZE[c]} enrolled). It may be text-dense. Below are a one-page visual summary and an audio version you can share with the class."`, `«أستاذنا، أظهر نحو ${pct}٪ من الطلبة الموافقين في ${c} احتكاك قراءة مرتفعاً بشكل غير معتاد في قراءة الأسبوع ${w + 1} (${SIZE[c]} مسجلاً). قد تكون كثيفة النص. أدناه ملخص بصري من صفحة واحدة ونسخة صوتية يمكنك مشاركتها مع الصف.»`)}</p>
        <div class="chips"><span class="chip">📄 ${T('1-page visual summary · AI draft', 'ملخص بصري من صفحة · مسودة ذكاء اصطناعي')}</span><span class="chip">🔊 ${T('Audio version · 11 min', 'نسخة صوتية · ١١ دقيقة')}</span><span class="chip">${T('no names · no individual data', 'بلا أسماء · بلا بيانات فردية')}</span></div>
      </div>
      <div class="row-btns" style="align-self:end"><button class="btn btn--sm btn--accent" id="sendNudge">${T('Send anonymised nudge', 'أرسل تنبيهاً مجهول الهوية')}</button></div>`;
  });
  $('#nudge').addEventListener('click', e => {
    if (e.target.id === 'sendNudge') {
      e.target.disabled = true;
      e.target.textContent = T('Sent ✓', 'أُرسل ✓');
      ERLY.toast(T('Nudge sent. The problem might be the PDF, not the students.', 'أُرسل التنبيه. ربما المشكلة في الملف، لا في الطلبة.'));
    }
  });

  /* ---------------- language refresh ---------------- */
  I18N.onChange(() => {
    renderLegend();
    compute();
    renderAlly();
    renderRamp();
    drawTimer();
    $('#timerGo').textContent = tRun ? T('Pause', 'إيقاف مؤقت') : T('Start', 'ابدأ');
    if (bpStep < BP_Q.length) renderBP(); else renderBPResult(true);
    if ($('.screen[data-screen="pack"]').classList.contains('is-active')) renderPack();
    if ($('.screen[data-screen="sas"]').classList.contains('is-active')) renderSAS();
    $('#nudge').hidden = true;
  });

  renderLegend();
  compute();
  renderAlly();
})();
