/* ERLY — the 5-day challenge.
   Five short games plus two questionnaires, scored on this device.
   Thresholds below are DEMO PLACEHOLDERS; the pilot replaces them with
   cut-offs set against professional assessments and same-language peer norms. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const AR = () => I18N.lang === 'ar';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
  const pct = x => Math.round(x * 100) + '%';

  /* ---------- demo thresholds (placeholders, clearly labelled) ---------- */
  const DEMO = {
    decodeAcc: 0.8, decodeRT: 1100,     // Real or Fake
    swapCorrect: 4,                     // of 6
    namingMs: 800,                      // ms per item
    nogoErr: 0.3, omission: 0.1, rtCV: 0.35,
    span: 4, lineErr: 10, dots: 0.7,
    arhq: 0.45, asrs: 4                 // ASRS Part A: 4+ items in the shaded range
  };

  /* ---------- persistence (per-viewer convenience only) ---------- */
  const KEY = 'erly-challenge-v2';
  let S = load();
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { return fresh(); }
  }
  function fresh() { return { days: {}, q: {}, sample: null }; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  const GAMES = [
    { n: 1, wd: ['Mon', 'الإثنين'], name: ['Real or Fake?', 'حقيقية أم مزيّفة؟'], blurb: ['Words flash up in English and Arabic. Is each one real or made up?', 'تظهر كلمات بالإنجليزية والعربية. هل كل كلمة حقيقية أم مختلقة؟'], tag: ['decoding · both languages', 'فك الترميز · باللغتين'], mins: 3, after: 'arhq' },
    { n: 2, wd: ['Tue', 'الثلاثاء'], name: ['Sound Swap', 'تبديل الأصوات'], blurb: ['Hear “car park”. Pick the swapped version: “par cark”.', 'استمع إلى عبارة واختر نسختها بعد تبديل الأصوات الأولى.'], tag: ['phonological awareness', 'الوعي الصوتي'], mins: 3 },
    { n: 3, wd: ['Wed', 'الأربعاء'], name: ['Speed Naming', 'التسمية السريعة'], blurb: ['Name colours and digits out loud as fast as you can.', 'سمِّ الألوان والأرقام بصوت عالٍ بأسرع ما يمكنك.'], tag: ['rapid naming', 'التسمية السريعة'], mins: 2 },
    { n: 4, wd: ['Thu', 'الخميس'], name: ['Catch the Target', 'التقط الهدف'], blurb: ['Tap only for the circle. Hold back on the square.', 'انقر للدائرة فقط. وامتنع عند المربع.'], tag: ['attention · go/no-go', 'الانتباه · انطلق/توقّف'], mins: 2, after: 'asrs' },
    { n: 5, wd: ['Fri', 'الجمعة'], name: ['Memory & Numbers', 'الذاكرة والأرقام'], blurb: ['Repeat digits backwards, place numbers on a line, compare dot groups.', 'كرّر الأرقام بالعكس، ضع الأرقام على خط، وقارن مجموعات النقاط.'], tag: ['working memory · number sense', 'الذاكرة العاملة · حسّ الأرقام'], mins: 4 }
  ];
  const L = pair => pair[AR() ? 1 : 0];

  /* ================= day cards ================= */
  function unlocked(n) {
    if ($('#judgeMode').checked || n === 1) return true;
    const prev = S.days[n - 1];
    if (!prev) return false;
    return new Date(prev.date).toDateString() !== new Date().toDateString();
  }
  function renderDays() {
    const done = GAMES.filter(g => S.days[g.n]).length;
    $('#streakN').textContent = `${done} / 5`;
    $('#days').innerHTML = GAMES.map(g => {
      const d = S.days[g.n];
      const open = unlocked(g.n);
      const status = d ? 'is-done' : open ? 'is-open' : 'is-locked';
      const qDone = g.after ? !!S.q[g.after] : true;
      let action;
      if (d) action = `<span class="day__done">✓ ${T('done', 'تم')}</span>${d.attempts < 2 ? `<button class="btn btn--xs btn--ghost" data-play="${g.n}">${T('Retry once', 'أعد مرة واحدة')}</button>` : ''}${!qDone ? `<button class="btn btn--xs btn--ink" data-quiz="${g.after}">${T('2-min questions', 'أسئلة دقيقتين')}</button>` : ''}`;
      else if (open) action = `<button class="btn btn--sm btn--accent" data-play="${g.n}">${T('Play', 'العب')} · ${g.mins} ${T('min', 'د')}</button>`;
      else action = `<span class="muted small">🔒 ${T('unlocks tomorrow', 'يُفتح غداً')}</span>`;
      return `<article class="day ${status}">
        <div class="day__top"><span class="day__n mono">${T('Day', 'اليوم')} ${g.n}</span><span class="mono muted">${L(g.wd)}</span></div>
        <div class="day__icon">${ICONS[g.n]}</div>
        <h3>${L(g.name)}</h3>
        <p>${L(g.blurb)}</p>
        <span class="day__tag mono">${L(g.tag)}</span>
        <div class="day__act">${action}</div>
      </article>`;
    }).join('');
  }
  const ICONS = {
    1: '<svg viewBox="0 0 48 48"><rect x="6" y="12" width="36" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 24h8M26 24h8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="m33 7 3 3-3 3" fill="none" stroke="var(--accent)" stroke-width="2"/></svg>',
    2: '<svg viewBox="0 0 48 48"><path d="M8 20h7l8-7v22l-8-7H8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M31 17c3 2 3 12 0 14M36 13c6 5 6 17 0 22" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></svg>',
    3: '<svg viewBox="0 0 48 48"><circle cx="13" cy="15" r="5" fill="var(--s1)"/><circle cx="27" cy="15" r="5" fill="var(--s2)"/><circle cx="13" cy="31" r="5" fill="var(--s3)"/><text x="23" y="36" font-size="14" font-family="monospace" fill="currentColor">7</text><path d="M36 10v28" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/></svg>',
    4: '<svg viewBox="0 0 48 48"><circle cx="17" cy="24" r="9" fill="none" stroke="var(--accent)" stroke-width="2.4"/><rect x="29" y="16" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2" opacity=".5"/><circle cx="17" cy="24" r="2.5" fill="var(--accent)"/></svg>',
    5: '<svg viewBox="0 0 48 48"><path d="M6 34h36" stroke="currentColor" stroke-width="2"/><path d="M6 31v6M42 31v6M24 32v4" stroke="currentColor" stroke-width="2"/><path d="M30 26v10" stroke="var(--accent)" stroke-width="2.4"/><text x="8" y="20" font-size="12" font-family="monospace" fill="currentColor">3·8·1</text></svg>'
  };

  $('#days').addEventListener('click', e => {
    const p = e.target.closest('[data-play]');
    if (p) return startGame(+p.dataset.play);
    const q = e.target.closest('[data-quiz]');
    if (q) return startQuiz(q.dataset.quiz);
  });
  $('#judgeMode').addEventListener('change', renderDays);

  /* ================= stage ================= */
  const stage = $('#stage'), body = $('#stageBody');
  let abort = null;
  function openStage(day, title) {
    stage.hidden = false;
    $('#stageDay').textContent = day;
    $('#stageTitle').textContent = title;
    stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function closeStage() {
    if (abort) abort();
    abort = null;
    document.body.classList.remove('is-playing');
    stage.hidden = true;
    body.innerHTML = '';
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  $('#stageClose').addEventListener('click', closeStage);

  function intro(lines, startLabel) {
    return new Promise(res => {
      body.innerHTML = `<div class="g-intro"><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>
        <p class="small muted">${T('No one else sees your score. One retry is allowed — the better score counts.', 'لا أحد غيرك يرى نتيجتك. يُسمح بإعادة واحدة — وتُحتسب النتيجة الأفضل.')}</p>
        <button class="btn btn--accent" id="gGo">${startLabel || T('Start', 'ابدأ')}</button></div>`;
      $('#gGo').onclick = () => res();
      $('#gGo').focus();
    });
  }
  function finish(n, data, summaryHTML) {
    const prev = S.days[n];
    const attempts = (prev ? prev.attempts : 0) + 1;
    // keep the better attempt (practice-effect policy)
    const keep = prev && better(n, prev.data, data) ? prev.data : data;
    S.days[n] = { data: keep, attempts, date: new Date().toISOString() };
    S.sample = null;
    save();
    document.body.classList.remove('is-playing');
    const g = GAMES[n - 1];
    const needQ = g.after && !S.q[g.after];
    body.innerHTML = `<div class="g-end">
      <div class="g-end__badge">🔥 ${GAMES.filter(x => S.days[x.n]).length} / 5</div>
      <h4>${T('Nice work. Day', 'أحسنت. اليوم')} ${n} ${T('done.', 'اكتمل.')}</h4>
      <div class="g-sum">${summaryHTML}</div>
      <p class="small muted">${T('These numbers are only for you. They are compared with demo placeholder ranges, not with other students.', 'هذه الأرقام لك وحدك. تُقارن بنطاقات تجريبية مؤقتة، لا بطلبة آخرين.')}</p>
      <div class="row-btns">${needQ ? `<button class="btn btn--ink" data-quiz="${g.after}">${T('One more thing — 2-minute questions →', 'شيء أخير — أسئلة في دقيقتين ←')}</button>` : `<button class="btn btn--ink" id="gClose">${T('Back to the week', 'العودة للأسبوع')}</button>`}</div>
    </div>`;
    const qb = $('[data-quiz]', body);
    if (qb) qb.onclick = () => startQuiz(qb.dataset.quiz);
    const cb = $('#gClose', body);
    if (cb) cb.onclick = closeStage;
    renderDays();
    renderResult();
  }
  function better(n, a, b) {
    // true if a is the better attempt
    const sc = d => n === 1 ? (d.en.acc + d.ar.acc) - (d.en.rt + d.ar.rt) / 4000
      : n === 2 ? d.correct : n === 3 ? -d.msPerItem : n === 4 ? -(d.omission + d.commission) : d.span - d.lineErr / 20 + d.dots;
    return sc(a) >= sc(b);
  }
  function startGame(n) {
    if (abort) abort();
    const g = GAMES[n - 1];
    openStage(`${T('Day', 'اليوم')} ${n} · ${L(g.wd)}`, L(g.name));
    document.body.classList.add('is-playing');
    [null, gameDecode, gameSwap, gameNaming, gameTarget, gameMemory][n]();
  }

  /* ---------- key/tap helper for timed responses ---------- */
  function respond(map, timeout) {
    // map: { key: value } ; buttons with data-r also resolve
    return new Promise(res => {
      const t0 = performance.now();
      let done = false, timer;
      const end = v => { if (done) return; done = true; clearTimeout(timer); removeEventListener('keydown', onKey); body.removeEventListener('pointerdown', onTap); res({ v, rt: performance.now() - t0 }); };
      // responses under 100 ms are anticipations, not reactions — ignore them
      const early = () => performance.now() - t0 < 100;
      const onKey = e => { const k = e.key.toLowerCase(); if (k in map) { e.preventDefault(); if (!early()) end(map[k]); } };
      const onTap = e => { const b = e.target.closest('[data-r]'); if (b) { e.preventDefault(); if (!early()) end(b.dataset.r); } };
      addEventListener('keydown', onKey);
      body.addEventListener('pointerdown', onTap);
      if (timeout) timer = setTimeout(() => end(null), timeout);
      abort = () => end(null);
    });
  }

  /* ================= Day 1 · Real or Fake? ================= */
  const WORDS = {
    en: { real: ['river', 'planet', 'garden', 'answer', 'market', 'travel', 'island', 'silver'], fake: ['plone', 'brane', 'frell', 'stoam', 'glirk', 'dorch', 'skave', 'blisk'] },
    ar: { real: ['كتاب', 'مدرسة', 'شمس', 'طريق', 'جامعة', 'سماء', 'حديقة', 'نافذة'], fake: ['سلبوق', 'مرتاف', 'تكلود', 'قمراس', 'دسفان', 'نطروس', 'فلحيم', 'جرسوب'] }
  };
  async function gameDecode() {
    await intro([
      T('A word appears. Decide fast: is it a <b>real</b> word or a <b>made-up</b> one?', 'تظهر كلمة. قرّر بسرعة: هل هي كلمة <b>حقيقية</b> أم <b>مختلقة</b>؟'),
      T('Keyboard: <kbd>F</kbd> = fake, <kbd>J</kbd> = real. On a phone, tap the buttons.', 'لوحة المفاتيح: <kbd>F</kbd> = مزيّفة، <kbd>J</kbd> = حقيقية. على الهاتف، انقر الأزرار.'),
      T('16 English words, then 16 Arabic words. About 90 seconds.', '١٦ كلمة إنجليزية ثم ١٦ كلمة عربية. حوالي ٩٠ ثانية.')
    ]);
    const res = {};
    for (const lang of ['en', 'ar']) {
      const trials = shuffle([...WORDS[lang].real.map(w => [w, 'real']), ...WORDS[lang].fake.map(w => [w, 'fake'])]);
      const out = [];
      body.innerHTML = `<div class="g-block"><p class="mono muted">${lang === 'en' ? 'English' : 'العربية'}</p><p class="g-ready">${T('Get ready…', 'استعد…')}</p></div>`;
      await wait(1100);
      for (let i = 0; i < trials.length; i++) {
        if (stage.hidden) return;
        const [w, truth] = trials[i];
        body.innerHTML = `<div class="g-word-wrap">
          <div class="g-prog"><span style="width:${(i / trials.length) * 100}%"></span></div>
          <div class="g-word" lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">+</div>
          <div class="g-choices"><button class="g-btn" data-r="fake"><kbd>F</kbd>${T('Made up', 'مختلقة')}</button><button class="g-btn" data-r="real"><kbd>J</kbd>${T('Real', 'حقيقية')}</button></div></div>`;
        await wait(350);
        $('.g-word', body).textContent = w;
        const r = await respond({ f: 'fake', j: 'real' }, 3000);
        if (stage.hidden) return;
        out.push({ ok: r.v === truth, rt: r.v ? r.rt : 3000, timeout: !r.v });
        $('.g-word', body).classList.add(r.v === truth ? 'is-ok' : 'is-no');
        await wait(180);
      }
      const ok = out.filter(o => o.ok);
      res[lang] = { acc: ok.length / out.length, rt: Math.round(median(ok.map(o => o.rt))) || 3000, timeouts: out.filter(o => o.timeout).length };
    }
    finish(1, res, decodeSummary(res));
  }
  function decodeSummary(r) {
    return `<div class="g-sum__row"><span>English</span><b>${pct(r.en.acc)} · ${r.en.rt} ms</b></div>
      <div class="g-sum__row"><span>العربية</span><b>${pct(r.ar.acc)} · ${r.ar.rt} ms</b></div>
      <div class="g-sum__row"><span>${T('Gap (EN vs AR speed)', 'الفرق (سرعة الإنجليزية مقابل العربية)')}</span><b>${r.en.rt > r.ar.rt ? '+' : ''}${Math.round((r.en.rt / r.ar.rt - 1) * 100)}%</b></div>`;
  }

  /* ================= Day 2 · Sound Swap ================= */
  const SWAPS = [
    ['car park', 'par cark', ['par park', 'park car']],
    ['big dog', 'dig bog', ['dig dog', 'bog dig']],
    ['red cat', 'ced rat', ['red rat', 'cat red']],
    ['sun hat', 'hun sat', ['hun hat', 'sat hun']],
    ['fast lane', 'last fane', ['last lane', 'fane last']],
    ['pink tea', 'tink pea', ['pink pea', 'tea pink']]
  ];
  function say(text, lang) {
    if (!('speechSynthesis' in window)) return Promise.resolve(false);
    return new Promise(res => {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'en-GB';
      u.rate = 0.85;
      u.onend = () => res(true);
      u.onerror = () => res(false);
      speechSynthesis.speak(u);
      setTimeout(() => res(true), 4000);
    });
  }
  async function gameSwap() {
    const tts = 'speechSynthesis' in window;
    await intro([
      T('You\'ll <b>hear</b> two words, like “car park”.', 'ستسمع كلمتين، مثل “car park”.'),
      T('Swap their first sounds in your head (“par cark”) and pick the right answer.', 'بدّل أصواتهما الأولى في ذهنك (“par cark”) واختر الإجابة الصحيحة.'),
      T('Tap ▶ to hear it again. 6 rounds. Turn your sound on.', 'انقر ▶ لسماعها مجدداً. ٦ جولات. شغّل الصوت.'),
      tts ? '' : T('<b>No speech on this browser</b> — the words will be shown instead.', '<b>لا يوجد نطق في هذا المتصفح</b> — ستظهر الكلمات مكتوبة.')
    ].filter(Boolean));
    const out = [];
    const items = shuffle(SWAPS);
    for (let i = 0; i < items.length; i++) {
      if (stage.hidden) return;
      const [phrase, right, wrong] = items[i];
      const opts = shuffle([right, ...wrong]);
      body.innerHTML = `<div class="g-word-wrap">
        <div class="g-prog"><span style="width:${(i / items.length) * 100}%"></span></div>
        <button class="g-play" id="gReplay" aria-label="Play again">▶</button>
        <p class="g-hint mono">${tts ? T('listen', 'استمع') : phrase}</p>
        <div class="g-choices g-choices--3">${opts.map((o, k) => `<button class="g-btn" data-r="${o}"><kbd>${k + 1}</kbd>${o}</button>`).join('')}</div></div>`;
      $('#gReplay').onclick = () => say(phrase);
      await say(phrase);
      const r = await respond({ 1: opts[0], 2: opts[1], 3: opts[2] }, 20000);
      if (stage.hidden) return;
      out.push({ ok: r.v === right, rt: r.rt });
      const btn = $$('.g-btn', body).find(b => b.dataset.r === right);
      if (btn) btn.classList.add('is-ok');
      await wait(450);
    }
    const res = { correct: out.filter(o => o.ok).length, of: out.length, rt: Math.round(median(out.map(o => o.rt))) };
    finish(2, res, `<div class="g-sum__row"><span>${T('Correct swaps', 'التبديلات الصحيحة')}</span><b>${res.correct} / ${res.of}</b></div><div class="g-sum__row"><span>${T('Typical decision time', 'الوقت المعتاد للقرار')}</span><b>${(res.rt / 1000).toFixed(1)} s</b></div>`);
  }

  /* ================= Day 3 · Speed Naming ================= */
  const COLORS = [['red', '#C1502B', 'أحمر'], ['blue', '#2F5DA8', 'أزرق'], ['green', '#2E7D4F', 'أخضر'], ['yellow', '#E0B12E', 'أصفر'], ['black', '#1B1915', 'أسود']];
  const DIGITS = ['2', '4', '6', '7', '9'];
  function ranGrid(kind) {
    const items = [];
    let last = -1;
    for (let i = 0; i < 25; i++) { let k; do { k = Math.floor(Math.random() * 5); } while (k === last); last = k; items.push(k); }
    return items.map(k => kind === 'color' ? `<span class="ran__c" style="background:${COLORS[k][1]}"></span>` : `<span class="ran__d">${DIGITS[k]}</span>`);
  }
  async function gameNaming() {
    await intro([
      T('A grid of 25 colours, then 25 digits. One item is highlighted at a time.', 'شبكة من ٢٥ لوناً، ثم ٢٥ رقماً. يُبرز عنصر واحد في كل مرة.'),
      T('<b>Say it out loud</b>, then press <kbd>Space</kbd> (or tap the grid) to move on — as fast as you comfortably can.', '<b>قلها بصوت عالٍ</b>، ثم اضغط <kbd>Space</kbd> (أو انقر الشبكة) للانتقال — بأسرع ما يريحك.'),
      T('Name in whichever language you think in. Nothing is recorded in this demo; the pilot\'s optional microphone version runs on-device.', 'سمِّ باللغة التي تفكر بها. لا يُسجَّل شيء في هذا العرض؛ نسخة الميكروفون الاختيارية في التجربة تعمل على الجهاز.')
    ]);
    const res = {};
    for (const kind of ['color', 'digit']) {
      if (stage.hidden) return;
      const cells = ranGrid(kind);
      body.innerHTML = `<div class="g-block"><p class="mono muted">${kind === 'color' ? T('Colours', 'الألوان') : T('Digits', 'الأرقام')}</p>
        ${kind === 'color' ? `<p class="small muted">${COLORS.map(c => `<span class="ran__key" style="--c:${c[1]}"></span>${AR() ? c[2] : c[0]}`).join(' · ')}</p>` : ''}
        <div class="ran" id="ran" data-r="next">${cells.map((c, i) => `<span class="ran__i" data-i="${i}">${c}</span>`).join('')}</div>
        <p class="g-hint mono">${T('Space / tap = next', 'Space / نقرة = التالي')}</p></div>`;
      await wait(900);
      const times = [];
      for (let i = 0; i < 25; i++) {
        $$('.ran__i', body).forEach((el, k) => el.classList.toggle('is-cur', k === i));
        const r = await respond({ ' ': 'next', enter: 'next', arrowright: 'next' }, 6000);
        if (stage.hidden) return;
        times.push(r.rt);
      }
      res[kind] = Math.round(median(times));
      await wait(200);
    }
    const out = { color: res.color, digit: res.digit, msPerItem: Math.round((res.color + res.digit) / 2) };
    finish(3, out, `<div class="g-sum__row"><span>${T('Colours', 'الألوان')}</span><b>${out.color} ms ${T('per item', 'لكل عنصر')}</b></div><div class="g-sum__row"><span>${T('Digits', 'الأرقام')}</span><b>${out.digit} ms ${T('per item', 'لكل عنصر')}</b></div>`);
  }

  /* ================= Day 4 · Catch the Target ================= */
  async function gameTarget() {
    await intro([
      T('Shapes appear one at a time in the box.', 'تظهر الأشكال واحداً تلو الآخر في المربع.'),
      T('<b>Circle</b> → press <kbd>Space</kbd> or tap, fast. <b>Square</b> → do nothing.', '<b>دائرة</b> ← اضغط <kbd>Space</kbd> أو انقر بسرعة. <b>مربع</b> ← لا تفعل شيئاً.'),
      T('40 shapes, about 60 seconds. Mistakes are normal — this game is only supporting evidence.', '٤٠ شكلاً، حوالي ٦٠ ثانية. الأخطاء طبيعية — هذه اللعبة دليل داعم فقط.')
    ]);
    const trials = shuffle([...Array(30).fill('go'), ...Array(10).fill('nogo')]);
    body.innerHTML = `<div class="g-word-wrap"><div class="g-prog"><span id="tProg"></span></div><div class="target-pad" data-r="hit" id="pad"><span class="shape" id="shape"></span></div><p class="g-hint mono">${T('circle = tap · square = wait', 'دائرة = انقر · مربع = انتظر')}</p></div>`;
    const shape = $('#shape'), prog = $('#tProg');
    const rts = []; let omit = 0, comm = 0;
    await wait(1000);
    for (let i = 0; i < trials.length; i++) {
      if (stage.hidden) return;
      prog.style.width = (i / trials.length * 100) + '%';
      shape.className = 'shape ' + (trials[i] === 'go' ? 'shape--go' : 'shape--nogo');
      const hide = setTimeout(() => { shape.className = 'shape'; }, 550);
      const r = await respond({ ' ': 'hit' }, 1000);
      clearTimeout(hide);
      if (stage.hidden) return;
      if (trials[i] === 'go') { if (r.v) rts.push(r.rt); else omit++; }
      else if (r.v) { comm++; $('#pad').classList.add('is-oops'); setTimeout(() => $('#pad') && $('#pad').classList.remove('is-oops'), 250); }
      shape.className = 'shape';
      if (r.v && r.rt < 1000) await wait(1000 - r.rt);
      await wait(350 + Math.random() * 450);
    }
    const res = { omission: omit / 30, commission: comm / 10, rt: Math.round(mean(rts)), cv: rts.length > 2 ? +(sd(rts) / mean(rts)).toFixed(2) : 1 };
    finish(4, res, `<div class="g-sum__row"><span>${T('Missed circles', 'دوائر فائتة')}</span><b>${pct(res.omission)}</b></div><div class="g-sum__row"><span>${T('Taps on squares', 'نقرات على المربعات')}</span><b>${pct(res.commission)}</b></div><div class="g-sum__row"><span>${T('Average reaction · steadiness', 'متوسط الاستجابة · الثبات')}</span><b>${res.rt} ms · CV ${res.cv}</b></div>`);
  }

  /* ================= Day 5 · Memory & Numbers ================= */
  async function gameMemory() {
    await intro([
      T('<b>Part 1 — backwards digits.</b> Watch a short list of digits, then type them in reverse order.', '<b>الجزء ١ — الأرقام بالعكس.</b> شاهد قائمة أرقام قصيرة، ثم اكتبها بترتيب معكوس.'),
      T('<b>Part 2 — number line.</b> Tap where a number belongs between 0 and 100.', '<b>الجزء ٢ — خط الأعداد.</b> انقر حيث ينتمي الرقم بين ٠ و١٠٠.'),
      T('<b>Part 3 — dots.</b> Two groups flash for a moment. Which side had more?', '<b>الجزء ٣ — النقاط.</b> تظهر مجموعتان للحظة. أي جهة فيها أكثر؟')
    ]);
    // Part 1: backward digit span
    let span = 2;
    for (let len = 3; len <= 7; len++) {
      let passed = false;
      for (let attempt = 0; attempt < 2 && !passed; attempt++) {
        if (stage.hidden) return;
        const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 9) + 1);
        body.innerHTML = `<div class="g-word-wrap"><p class="mono muted">${T('Part 1 · length', 'الجزء ١ · الطول')} ${len}</p><div class="g-word" id="dig">·</div></div>`;
        await wait(600);
        for (const d of seq) { if (stage.hidden) return; $('#dig').textContent = d; await wait(750); $('#dig').textContent = '·'; await wait(200); }
        body.innerHTML = `<div class="g-word-wrap"><p class="mono muted">${T('Type them backwards', 'اكتبها بالعكس')}</p>
          <form id="spanForm" class="span-form"><input id="spanIn" inputmode="numeric" autocomplete="off" maxlength="9" aria-label="Digits backwards"><button class="btn btn--accent">${T('Check', 'تحقق')}</button></form></div>`;
        const inp = $('#spanIn'); inp.focus();
        const ans = await new Promise(res => { $('#spanForm').onsubmit = e => { e.preventDefault(); res(inp.value.replace(/\D/g, '')); }; abort = () => res(''); });
        passed = ans === seq.slice().reverse().join('');
      }
      if (!passed) break;
      span = len;
    }
    // Part 2: number line
    const targets = shuffle([23, 71, 8, 46, 92]);
    const errs = [];
    for (let i = 0; i < targets.length; i++) {
      if (stage.hidden) return;
      body.innerHTML = `<div class="g-word-wrap"><p class="mono muted">${T('Part 2 · where does it go?', 'الجزء ٢ · أين يقع؟')} (${i + 1}/5)</p><div class="g-word">${targets[i]}</div>
        <div class="nline" id="nline" dir="ltr"><span class="nline__bar"></span><span class="nline__l">0</span><span class="nline__r">100</span><span class="nline__mark" id="nmark"></span></div></div>`;
      const v = await new Promise(res => {
        const nl = $('#nline');
        nl.onpointerdown = e => { const r = nl.getBoundingClientRect(); res(Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100))); };
        abort = () => res(null);
      });
      if (v == null) return;
      const m = $('#nmark'); m.style.left = v + '%'; m.classList.add('is-on');
      errs.push(Math.abs(v - targets[i]));
      await wait(450);
    }
    // Part 3: dot comparison
    const pairs = shuffle([[12, 15], [20, 16], [9, 12], [18, 22], [14, 11], [25, 20], [10, 13], [17, 21]]);
    let right = 0;
    for (let i = 0; i < pairs.length; i++) {
      if (stage.hidden) return;
      const [a, b] = pairs[i];
      const dots = n => Array.from({ length: n }, () => `<i style="left:${6 + Math.random() * 82}%;top:${6 + Math.random() * 82}%;--s:${6 + Math.random() * 6}px"></i>`).join('');
      body.innerHTML = `<div class="g-word-wrap"><p class="mono muted">${T('Part 3 · which side has more?', 'الجزء ٣ · أي جهة أكثر؟')} (${i + 1}/8)</p>
        <div class="dots" dir="ltr"><div class="dots__box" id="dA">${dots(a)}</div><div class="dots__box" id="dB">${dots(b)}</div></div>
        <div class="g-choices"><button class="g-btn" data-r="a"><kbd>←</kbd>${T('Left', 'اليسار')}</button><button class="g-btn" data-r="b"><kbd>→</kbd>${T('Right', 'اليمين')}</button></div></div>`;
      setTimeout(() => $$('.dots__box', body).forEach(x => x.classList.add('is-hidden')), 900);
      const r = await respond({ arrowleft: 'a', arrowright: 'b' }, 8000);
      if (stage.hidden) return;
      if ((r.v === 'a' && a > b) || (r.v === 'b' && b > a)) right++;
      await wait(250);
    }
    const res = { span, lineErr: +mean(errs).toFixed(1), dots: right / pairs.length };
    finish(5, res, `<div class="g-sum__row"><span>${T('Backwards digit span', 'مدى الأرقام بالعكس')}</span><b>${res.span}</b></div><div class="g-sum__row"><span>${T('Number line — average miss', 'خط الأعداد — متوسط الابتعاد')}</span><b>${res.lineErr}</b></div><div class="g-sum__row"><span>${T('Dot comparison', 'مقارنة النقاط')}</span><b>${pct(res.dots)}</b></div>`);
  }

  /* ================= Questionnaires ================= */
  const QUIZ = {
    arhq: {
      title: ['Reading history', 'تاريخك مع القراءة'],
      note: ['Adapted from the Adult Reading History Questionnaire (Lefly & Pennington, 2000). The pilot uses the full validated version.', 'مقتبس من استبيان تاريخ القراءة للبالغين (ليفلي وبنينغتون، ٢٠٠٠). تستخدم التجربة النسخة الكاملة المعتمدة.'],
      scale: [['Never', 'أبداً'], ['Rarely', 'نادراً'], ['Sometimes', 'أحياناً'], ['Often', 'غالباً'], ['Always', 'دائماً']],
      items: [
        ['As a child, learning to read was hard for me.', 'في طفولتي، كان تعلّم القراءة صعباً عليّ.'],
        ['I needed extra help with reading at school.', 'احتجت إلى مساعدة إضافية في القراءة في المدرسة.'],
        ['Spelling has been difficult for me.', 'كان الإملاء صعباً عليّ.'],
        ['I read more slowly than other people my age.', 'أقرأ أبطأ من الآخرين في عمري.'],
        ['I have to re-read paragraphs to understand them.', 'أحتاج لإعادة قراءة الفقرات لأفهمها.'],
        ['I avoid reading when I can.', 'أتجنب القراءة متى استطعت.'],
        ['Taking notes while listening is hard for me.', 'تدوين الملاحظات أثناء الاستماع صعب عليّ.'],
        ['Someone in my close family had reading difficulties.', 'عانى أحد أفراد عائلتي المقربين من صعوبات في القراءة.']
      ]
    },
    asrs: {
      title: ['Attention check', 'فحص الانتباه'],
      note: ['The 6 screener questions of the WHO Adult ADHD Self-Report Scale (ASRS v1.1, Part A), thinking about the last 6 months. Arabic wording is our working translation; a validated version will be checked.', 'أسئلة الفحص الستة من مقياس منظمة الصحة العالمية للتقرير الذاتي لاضطراب فرط الحركة لدى البالغين (ASRS v1.1، الجزء أ)، عن آخر ٦ أشهر. الصياغة العربية ترجمتنا المؤقتة؛ وسنتحقق من نسخة معتمدة.'],
      scale: [['Never', 'أبداً'], ['Rarely', 'نادراً'], ['Sometimes', 'أحياناً'], ['Often', 'غالباً'], ['Very often', 'غالباً جداً']],
      items: [
        ['How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?', 'كم مرة تجد صعوبة في إنهاء التفاصيل الأخيرة لمشروع بعد إنجاز الأجزاء الصعبة؟'],
        ['How often do you have difficulty getting things in order when you have to do a task that requires organization?', 'كم مرة تجد صعوبة في ترتيب الأمور عندما تؤدي مهمة تتطلب تنظيماً؟'],
        ['How often do you have problems remembering appointments or obligations?', 'كم مرة تواجه مشكلات في تذكّر المواعيد أو الالتزامات؟'],
        ['When you have a task that requires a lot of thought, how often do you avoid or delay getting started?', 'عندما تكون لديك مهمة تتطلب تفكيراً كثيراً، كم مرة تتجنب البدء أو تؤجله؟'],
        ['How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?', 'كم مرة تتململ أو تحرّك يديك أو قدميك عندما يتعين عليك الجلوس لفترة طويلة؟'],
        ['How often do you feel overly active and compelled to do things, like you were driven by a motor?', 'كم مرة تشعر بنشاط مفرط وبأنك مدفوع لفعل الأشياء كأن محركاً يقودك؟']
      ]
    }
  };
  function startQuiz(id) {
    const qz = QUIZ[id];
    openStage(T('2-minute questions', 'أسئلة في دقيقتين'), L(qz.title));
    const ans = [];
    let i = 0;
    const draw = () => {
      if (i >= qz.items.length) {
        S.q[id] = ans;
        save();
        body.innerHTML = `<div class="g-end"><h4>${T('Thanks — saved on this device only.', 'شكراً — حُفظ على هذا الجهاز فقط.')}</h4><p class="small muted">${L(qz.note)}</p><button class="btn btn--ink" id="gClose">${T('Back to the week', 'العودة للأسبوع')}</button></div>`;
        $('#gClose').onclick = closeStage;
        renderDays(); renderResult();
        return;
      }
      body.innerHTML = `<div class="quiz"><div class="g-prog"><span style="width:${i / qz.items.length * 100}%"></span></div>
        <p class="mono muted">${i + 1} / ${qz.items.length}</p><p class="quiz__q">${L(qz.items[i])}</p>
        <div class="quiz__opts">${qz.scale.map((s, k) => `<button class="quiz__o" data-k="${k}">${L(s)}</button>`).join('')}</div>
        <p class="small muted">${L(qz.note)}</p></div>`;
      $$('.quiz__o', body).forEach(b => b.onclick = () => { ans.push(+b.dataset.k); i++; draw(); });
    };
    draw();
  }

  /* ================= samples ================= */
  const SAMPLES = {
    closer: {
      days: { 1: { en: { acc: 0.75, rt: 1380, timeouts: 1 }, ar: { acc: 0.81, rt: 1190, timeouts: 0 } }, 2: { correct: 3, of: 6, rt: 5200 }, 3: { color: 910, digit: 840, msPerItem: 875 }, 4: { omission: 0.07, commission: 0.2, rt: 470, cv: 0.29 }, 5: { span: 4, lineErr: 6.2, dots: 0.75 } },
      q: { arhq: [3, 3, 3, 2, 3, 2, 2, 1], asrs: [2, 1, 1, 3, 1, 1] }
    },
    fine: {
      days: { 1: { en: { acc: 0.94, rt: 780, timeouts: 0 }, ar: { acc: 0.97, rt: 720, timeouts: 0 } }, 2: { correct: 6, of: 6, rt: 2900 }, 3: { color: 610, digit: 540, msPerItem: 575 }, 4: { omission: 0.03, commission: 0.1, rt: 410, cv: 0.18 }, 5: { span: 6, lineErr: 3.4, dots: 0.88 } },
      q: { arhq: [0, 1, 1, 0, 1, 0, 1, 0], asrs: [1, 1, 0, 2, 1, 0] }
    }
  };
  function loadSample(kind) {
    if (kind === 'reset') { S = fresh(); save(); renderDays(); renderResult(); ERLY.toast(T('Cleared from this device.', 'تم المسح من هذا الجهاز.')); return; }
    const smp = SAMPLES[kind];
    S = { days: {}, q: JSON.parse(JSON.stringify(smp.q)), sample: kind };
    Object.entries(smp.days).forEach(([n, d]) => { S.days[n] = { data: JSON.parse(JSON.stringify(d)), attempts: 1, date: new Date().toISOString() }; });
    save(); renderDays(); renderResult();
    $('#result').scrollIntoView({ behavior: 'smooth' });
  }
  $('#sampleSeg').addEventListener('click', e => { const b = e.target.closest('[data-sample]'); if (b) loadSample(b.dataset.sample); });
  ERLY.on('sample', loadSample);

  /* ================= scoring ================= */
  function score() {
    const d = n => S.days[n] && S.days[n].data;
    if (![1, 2, 3, 4, 5].every(d)) return null;
    const g1 = d(1), g2 = d(2), g3 = d(3), g4 = d(4), g5 = d(5);
    const arhq = S.q.arhq ? S.q.arhq.reduce((a, b) => a + b, 0) / (S.q.arhq.length * 4) : null;
    const asrs = S.q.asrs ? S.q.asrs.filter((v, i) => i < 3 ? v >= 2 : v >= 3).length : null;
    const slowEN = g1.en.acc < DEMO.decodeAcc || g1.en.rt > DEMO.decodeRT;
    const slowAR = g1.ar.acc < DEMO.decodeAcc || g1.ar.rt > DEMO.decodeRT;
    const flags = {
      decode: slowEN || slowAR,
      swap: g2.correct < DEMO.swapCorrect,
      naming: g3.msPerItem > DEMO.namingMs,
      arhq: arhq != null && arhq >= DEMO.arhq,
      attention: g4.commission > DEMO.nogoErr || g4.omission > DEMO.omission || g4.cv > DEMO.rtCV,
      asrs: asrs != null && asrs >= DEMO.asrs,
      span: g5.span < DEMO.span,
      line: g5.lineErr > DEMO.lineErr,
      dots: g5.dots < DEMO.dots
    };
    const reading = ['decode', 'swap', 'naming', 'arhq'].filter(k => flags[k]).length;
    const attention = (flags.attention ? 1 : 0) + (flags.asrs ? 1 : 0);
    const number = ['line', 'dots'].filter(k => flags[k]).length + (flags.span ? 0.5 : 0);
    const areas = [];
    if (reading >= 2) areas.push('reading');
    if (flags.asrs || attention >= 2) areas.push('attention');
    if (number >= 2) areas.push('number');
    const lang = slowEN && slowAR ? 'both' : slowEN ? 'en' : slowAR ? 'ar' : 'none';
    // learning profile — everyone gets one
    let profile = 'steady';
    if (flags.decode && !flags.swap) profile = 'audio';
    else if (reading >= 1) profile = 'audio';
    if (attention >= 1 && reading === 0) profile = 'sprint';
    if (number >= 2 && reading === 0) profile = 'visualnum';
    // ease indices (0–100, higher = easier) for the bars
    const clamp = v => Math.max(4, Math.min(100, Math.round(v)));
    const domains = [
      ['Reading speed · English', 'سرعة القراءة · الإنجليزية', clamp(g1.en.acc * 100 - (g1.en.rt - 600) / 12)],
      ['Reading speed · Arabic', 'سرعة القراءة · العربية', clamp(g1.ar.acc * 100 - (g1.ar.rt - 600) / 12)],
      ['Sound skills', 'المهارات الصوتية', clamp(g2.correct / g2.of * 100)],
      ['Naming speed', 'سرعة التسمية', clamp(140 - g3.msPerItem / 10)],
      ['Focus', 'التركيز', clamp(100 - g4.commission * 100 - g4.omission * 200 - Math.max(0, g4.cv - 0.2) * 100)],
      ['Working memory', 'الذاكرة العاملة', clamp(g5.span / 7 * 100)],
      ['Number sense', 'حسّ الأرقام', clamp(100 - g5.lineErr * 3 - (1 - g5.dots) * 60)]
    ];
    return { outcome: areas.length ? 'closer' : 'fine', areas, flags, lang, profile, domains, arhq, asrs, g1, sample: S.sample };
  }

  const PROFILES = {
    audio: { h: ['You\'re an audio-first learner.', 'أنت متعلّم يعتمد على السمع أولاً.'], tools: [['Read-aloud for every PDF', 'القراءة الصوتية لكل ملف PDF'], ['Audiobook versions of set texts', 'نسخ صوتية من الكتب المقررة'], ['Readable font + line focus', 'خط مقروء + تركيز السطر'], ['Record lectures, skim later', 'سجّل المحاضرات وراجعها لاحقاً']] },
    sprint: { h: ['You\'re a short-sprint learner.', 'أنت متعلّم بجولات قصيرة.'], tools: [['15-minute focus sprints', 'جولات تركيز من ١٥ دقيقة'], ['Start-Ramp: a 5-minute first step', 'منحدر البداية: خطوة أولى من ٥ دقائق'], ['Deadline nudges at 72h and 24h', 'تذكيرات قبل الموعد بـ٧٢ و٢٤ ساعة'], ['Body-doubling study room', 'غرفة دراسة مشتركة']] },
    visualnum: { h: ['You\'re a visual-number learner.', 'أنت متعلّم بصري للأرقام.'], tools: [['Worked examples before problem sets', 'أمثلة محلولة قبل التمارين'], ['Number lines & diagrams', 'خطوط الأعداد والرسوم'], ['Calculator-friendly practice', 'تمارين مع الآلة الحاسبة'], ['Maths support centre slots', 'مواعيد مركز دعم الرياضيات']] },
    steady: { h: ['You\'re a steady, flexible reader.', 'أنت قارئ ثابت ومرن.'], tools: [['60-second summaries for long readings', 'ملخصات في ٦٠ ثانية للقراءات الطويلة'], ['Line focus for dense PDFs', 'تركيز السطر لملفات PDF الكثيفة'], ['Focus sprints before exams', 'جولات تركيز قبل الامتحانات'], ['Mind-maps for revision', 'خرائط ذهنية للمراجعة']] }
  };
  const AREA_TXT = {
    reading: ['Reading took more effort than our demo range — across several games, not just one.', 'تطلّبت القراءة جهداً أكبر من نطاقنا التجريبي — عبر عدة ألعاب، لا لعبة واحدة.'],
    attention: ['Your attention answers and the target game point the same way.', 'إجاباتك عن الانتباه ولعبة الهدف تشير إلى الاتجاه نفسه.'],
    number: ['Placing and comparing numbers took more effort than our demo range.', 'تطلّب وضع الأرقام ومقارنتها جهداً أكبر من نطاقنا التجريبي.']
  };
  const LANG_TXT = {
    both: ['Slower in <b>both</b> Arabic and English. That pattern is less likely to be just a language barrier — worth a closer look.', 'أبطأ في العربية <b>والإنجليزية</b> معاً. هذا النمط أقل احتمالاً أن يكون مجرد حاجز لغة — يستحق نظرة أقرب.'],
    en: ['Slower in <b>English only</b>. That may be second-language load rather than a reading difficulty — English support could help most.', 'أبطأ في <b>الإنجليزية فقط</b>. قد يكون ذلك عبء لغة ثانية لا صعوبة قراءة — دعم اللغة الإنجليزية قد يفيد أكثر.'],
    ar: ['Slower in <b>Arabic only</b> — unusual and worth mentioning to SAS.', 'أبطأ في <b>العربية فقط</b> — أمر غير معتاد ويستحق ذكره لخدمات الطلبة.'],
    none: ['Similar in both languages and within our demo range.', 'متقارب في اللغتين وضمن نطاقنا التجريبي.']
  };

  /* ================= result ================= */
  function renderResult() {
    const box = $('#resultBox');
    const r = score();
    ERLY.state.result = r;
    ERLY.emit('result', r);
    if (!r) {
      const done = GAMES.filter(g => S.days[g.n]).length;
      box.className = 'result-empty';
      box.innerHTML = `<div class="result-empty__ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="var(--line-2)" stroke-width="3"/><circle cx="22" cy="22" r="18" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="113" stroke-dashoffset="${113 - 113 * done / 5}" stroke-linecap="round" transform="rotate(-90 22 22)"/></svg><b>${done}/5</b></div>
        <p>${T('Your result appears after day 5. It\'s computed on this device and only you see it.', 'تظهر نتيجتك بعد اليوم الخامس. تُحسب على هذا الجهاز وأنت وحدك من يراها.')}</p>
        <div class="row-btns" style="justify-content:center"><a href="#challenge" class="btn btn--ghost btn--sm">${T('Go to the challenge ↑', 'اذهب إلى التحدي ↑')}</a><button class="btn btn--sm btn--ink" data-sample="closer">${T('See a sample result', 'شاهد نتيجة نموذجية')}</button></div>`;
      $('[data-sample]', box).onclick = () => loadSample('closer');
      return;
    }
    const closer = r.outcome === 'closer';
    const p = PROFILES[r.profile];
    box.className = 'result';
    box.innerHTML = `
      <article class="verdict-card ${closer ? 'is-closer' : 'is-fine'}">
        <div class="verdict-card__top">
          <span class="pill-private"><svg viewBox="0 0 16 16"><path d="M4.5 7V5.5a3.5 3.5 0 0 1 7 0V7" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="3" y="7" width="10" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>${T('Only you can see this', 'أنت فقط من يرى هذا')}</span>
          ${r.sample ? `<span class="honesty honesty--sim">${T('sample data', 'بيانات نموذجية')}</span>` : `<span class="honesty honesty--live">${T('your games', 'ألعابك')}</span>`}
        </div>
        <p class="verdict-card__k mono">${closer ? T('Result · worth a closer look', 'النتيجة · تستحق نظرة أقرب') : T('Result · you\'re doing fine', 'النتيجة · أنت بخير')}</p>
        <h3>${closer ? T('Some things took more effort than expected. That\'s worth a closer look — if you want one.', 'بعض الأمور تطلّبت جهداً أكبر من المتوقع. يستحق ذلك نظرة أقرب — إن أردت.') : T('You\'re doing fine. Here are the tools that suit how you learn.', 'أنت بخير. إليك الأدوات التي تناسب طريقة تعلّمك.')}</h3>
        ${closer ? `<ul class="verdict-card__areas">${r.areas.map(a => `<li>${L(AREA_TXT[a])}</li>`).join('')}</ul>` : ''}
        <p class="verdict-card__not">${T('This is not a diagnosis, and it never says “you have dyslexia”. Only a professional assessment can tell you why something is harder.', 'هذا ليس تشخيصاً، ولن يقول أبداً «لديك عُسر قراءة». وحده التقييم المهني يستطيع أن يخبرك لماذا يكون أمر ما أصعب.')}</p>
        <div class="row-btns">${closer
          ? `<a href="#watch" class="btn btn--accent">${T('Optional: start the 2-week watch', 'اختياري: ابدأ المتابعة لأسبوعين')}</a><a href="#handoff" class="btn btn--ghost">${T('Skip to booking SAS', 'انتقل لحجز موعد')}</a><button class="btn btn--quiet" id="notNow">${T('Not now', 'ليس الآن')}</button>`
          : `<a href="#try" class="btn btn--ink">${T('Open my tools', 'افتح أدواتي')}</a><a href="#handoff" class="btn btn--ghost">${T('Still struggling? Self-refer', 'ما زلت تعاني؟ أحِل نفسك')}</a>`}</div>
      </article>

      <div class="result-grid">
        <div class="panel">
          <p class="panel__h mono">${T('Your learning profile', 'ملف تعلّمك')}</p>
          <h4 class="profile-h">${L(p.h)}</h4>
          <ul class="tools-list">${p.tools.map(t => `<li>${L(t)}</li>`).join('')}</ul>
        </div>
        <div class="panel">
          <p class="panel__h mono">${T('Arabic vs English reading', 'القراءة بالعربية مقابل الإنجليزية')}</p>
          <div class="lgap">
            ${[['English', r.g1.en], ['العربية', r.g1.ar]].map(([n, v]) => `<div class="lgap__row"><span>${n}</span><span class="lgap__bar"><i style="width:${Math.min(100, v.rt / 20)}%"></i><em style="left:${DEMO.decodeRT / 20}%"></em></span><b class="mono">${v.rt} ms · ${pct(v.acc)}</b></div>`).join('')}
            <p class="small muted">${T('Bar = typical time per word. Tick = demo placeholder.', 'الشريط = الوقت المعتاد لكل كلمة. العلامة = حد تجريبي مؤقت.')}</p>
          </div>
          <p class="lgap__txt">${L(LANG_TXT[r.lang])}</p>
        </div>
        <div class="panel panel--span">
          <p class="panel__h mono">${T('How easy each area felt · you vs. demo range', 'سهولة كل مجال · أنت مقابل النطاق التجريبي')}</p>
          <div class="domains">${r.domains.map(([en, ar, v]) => `<div class="dom"><span>${AR() ? ar : en}</span><span class="dom__bar"><i style="width:${v}%" class="${v < 50 ? 'is-low' : ''}"></i><em></em></span><b class="mono">${v}</b></div>`).join('')}</div>
          <div class="qs">
            <span>${T('Reading history (ARHQ-adapted)', 'تاريخ القراءة (مقتبس من ARHQ)')}: <b class="mono">${r.arhq == null ? T('not answered', 'لم يُجب') : r.arhq.toFixed(2)}</b></span>
            <span>${T('ASRS Part A', 'ASRS الجزء أ')}: <b class="mono">${r.asrs == null ? T('not answered', 'لم يُجب') : r.asrs + ' / 6 ' + T('in the shaded range', 'في النطاق المظلل')}</b></span>
          </div>
          <p class="small muted">${T('Dashed line = demo reference. Real cut-offs come from the pilot: same-language, same-year peers, checked against professional assessments.', 'الخط المتقطع = مرجع تجريبي. الحدود الحقيقية تأتي من التجربة: أقران بنفس اللغة والسنة، مُتحقق منها مقابل تقييمات مهنية.')}</p>
        </div>
      </div>`;
    const nn = $('#notNow', box);
    if (nn) nn.onclick = () => ERLY.toast(T('Okay. Nothing else happens. The tools stay, and the door stays open.', 'حسناً. لن يحدث شيء آخر. تبقى الأدوات، ويبقى الباب مفتوحاً.'));
  }

  ERLY.getChallenge = () => ({ days: S.days, q: S.q, result: score() });
  I18N.onChange(() => { renderDays(); renderResult(); });
  renderDays();
  renderResult();
})();
