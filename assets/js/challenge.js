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
  let run = 0; // bumps on every open/close so stale game loops stop
  const gone = gen => stage.hidden || gen !== run;
  function openStage(day, title) {
    stage.hidden = false;
    $('#stageDay').textContent = day;
    $('#stageTitle').textContent = title;
    stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function closeStage() {
    run++;
    if (abort) abort();
    abort = null;
    document.body.classList.remove('is-playing');
    stage.hidden = true;
    body.innerHTML = '';
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  $('#stageClose').addEventListener('click', closeStage);

  /* ---------- playful HUD: mascot host, combo, sound ---------- */
  const F = window.FUN;
  let combo = 0, stars = 0;
  function hud() {
    let h = $('#gHud');
    if (!h) {
      h = document.createElement('div');
      h.id = 'gHud';
      h.className = 'g-hud';
      $('.stage__head', stage).insertBefore(h, $('#stageClose'));
    }
    h.innerHTML = `<span class="g-hud__stars" id="gStars">⭐ ${stars}</span><span class="g-hud__combo" id="gCombo"></span>
      <button class="icon-btn icon-btn--sm" id="gMute" aria-label="Sound">${F.sfx.muted ? '🔇' : '🔊'}</button>`;
    $('#gMute').onclick = () => { $('#gMute').textContent = F.sfx.toggle() ? '🔇' : '🔊'; };
  }
  function react(ok, el) {
    const m = $('.g-host .mascot', body);
    if (ok) {
      combo++; stars++;
      F.sfx.good();
      F.floatText(el, combo >= 3 ? `+1 · ${combo}×` : '+1 ⭐');
      if (combo > 0 && combo % 5 === 0) F.confetti(el, 18);
      if (m) F.setMood(m, combo >= 3 ? 'wow' : 'happy');
    } else {
      combo = 0;
      F.sfx.soft();
      if (m) F.setMood(m, 'oops');
    }
    const s = $('#gStars'); if (s) { s.textContent = `⭐ ${stars}`; s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }
    const c = $('#gCombo'); if (c) c.textContent = combo >= 3 ? `🔥 ${combo}× ${T('combo', 'متتالية')}` : '';
  }
  function host(mood, say) {
    return `<div class="g-host">${F.mascot(mood, 'm-idle')}${say ? `<p class="g-host__say">${say}</p>` : ''}</div>`;
  }

  function intro(lines, startLabel) {
    return new Promise(res => {
      body.innerHTML = `<div class="g-intro">
        <div class="g-intro__host">${F.mascot('happy', 'm-idle m-big')}<div class="g-bubble">${lines.map(l => `<p>${l}</p>`).join('')}</div></div>
        <p class="small muted g-intro__note">${T('No one else sees your score. One retry is allowed — the better score counts.', 'لا أحد غيرك يرى نتيجتك. يُسمح بإعادة واحدة — وتُحتسب النتيجة الأفضل.')}</p>
        <button class="btn btn--accent btn--big" id="gGo">${startLabel || T('Let\'s go!', 'هيا بنا!')}</button></div>`;
      $('#gGo').onclick = async () => {
        F.sfx.tick();
        for (const n of ['3', '2', '1']) {
          body.innerHTML = `<div class="g-count">${n}</div>`;
          F.sfx.tick();
          await wait(420);
        }
        res();
      };
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
    const doneN = GAMES.filter(x => S.days[x.n]).length;
    body.innerHTML = `<div class="g-end">
      ${F.mascot('wow', 'm-idle m-big m-party')}
      <div class="g-end__stars"><span>⭐</span><span>⭐</span><span>⭐</span></div>
      <h4>${T('Day', 'اليوم')} ${n} ${T('complete!', 'اكتمل!')}</h4>
      <div class="g-end__badge">🔥 ${T('streak', 'السلسلة')} ${doneN} / 5</div>
      <div class="week-dots">${GAMES.map(x => `<i class="${S.days[x.n] ? 'is-on' : ''}">${x.n}</i>`).join('')}</div>
      <details class="g-sum-wrap"><summary>${T('See my numbers (only you)', 'أرني أرقامي (لك وحدك)')}</summary><div class="g-sum">${summaryHTML}</div>
      <p class="small muted">${T('Compared with demo placeholder ranges, never with other students.', 'تُقارن بنطاقات تجريبية مؤقتة، لا بطلبة آخرين أبداً.')}</p></details>
      <div class="row-btns">${needQ ? `<button class="btn btn--ink" data-quiz="${g.after}">${T('One more thing — 2-minute questions →', 'شيء أخير — أسئلة في دقيقتين ←')}</button>` : `<button class="btn btn--ink" id="gClose">${T('Back to the week', 'العودة للأسبوع')}</button>`}</div>
    </div>`;
    F.sfx.win();
    setTimeout(() => F.confetti($('.g-end', body), 60), 120);
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
    combo = 0; stars = 0;
    run++;
    openStage(`${T('Day', 'اليوم')} ${n} · ${L(g.wd)}`, L(g.name));
    stage.dataset.game = n;
    hud();
    document.body.classList.add('is-playing');
    [null, gameDecode, gameSwap, gameNaming, gameTarget, gameMemory][n]();
  }

  /* ---------- key/tap helper for timed responses ---------- */
  function respond(map, timeout) {
    // map: { key: value } ; buttons with data-r also resolve
    return new Promise(res => {
      const t0 = performance.now();
      let done = false, timer;
      const end = (v, el) => { if (done) return; done = true; clearTimeout(timer); removeEventListener('keydown', onKey); body.removeEventListener('pointerdown', onTap); res({ v, rt: performance.now() - t0, el }); };
      // responses under 100 ms are anticipations, not reactions — ignore them
      const early = () => performance.now() - t0 < 100;
      const onKey = e => { const k = e.key.toLowerCase(); if (k in map) { e.preventDefault(); if (!early()) end(map[k], $(`[data-r="${CSS.escape(String(map[k]))}"]`, body)); } };
      const onTap = e => { const b = e.target.closest('[data-r]'); if (b) { e.preventDefault(); if (!early()) end(b.dataset.r, b); } };
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
    const gen = run;
    await intro([
      T('Hi, I\'m <b>Sunny</b>! Words will pop up on cards. Is each one a <b>real</b> word or a <b>made-up</b> one?', 'مرحباً، أنا <b>سني</b>! ستظهر كلمات على بطاقات. هل كل كلمة <b>حقيقية</b> أم <b>مختلقة</b>؟'),
      T('Press <kbd>F</kbd> for made-up, <kbd>J</kbd> for real — or tap the buttons.', 'اضغط <kbd>F</kbd> للمختلقة و<kbd>J</kbd> للحقيقية — أو انقر الأزرار.'),
      T('16 English cards, then 16 Arabic cards. Build a combo!', '١٦ بطاقة إنجليزية ثم ١٦ عربية. اصنع سلسلة متتالية!')
    ]);
    const res = {};
    for (const lang of ['en', 'ar']) {
      const trials = shuffle([...WORDS[lang].real.map(w => [w, 'real']), ...WORDS[lang].fake.map(w => [w, 'fake'])]);
      const out = [];
      if (gone(gen)) return;
      body.innerHTML = `<div class="g-block">${host('happy', lang === 'en' ? T('Round 1 — English!', 'الجولة ١ — الإنجليزية!') : T('Round 2 — العربية!', 'الجولة ٢ — العربية!'))}</div>`;
      await wait(1200);
      if (gone(gen)) return;
      body.innerHTML = `<div class="g-word-wrap">
        <div class="g-prog"><span id="gProg"></span></div>
        <div class="g-play-row">${host('happy')}<div class="wcard-deck"><div class="wcard" id="wcard"><span class="wcard__w" lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"></span></div></div></div>
        <div class="g-choices"><button class="g-btn g-btn--fake" data-r="fake"><span class="g-btn__e">🙃</span>${T('Made up', 'مختلقة')}<kbd>F</kbd></button><button class="g-btn g-btn--real" data-r="real"><span class="g-btn__e">👍</span>${T('Real', 'حقيقية')}<kbd>J</kbd></button></div></div>`;
      for (let i = 0; i < trials.length; i++) {
        if (gone(gen)) return;
        const [w, truth] = trials[i];
        const card = $('#wcard');
        $('#gProg').style.width = (i / trials.length * 100) + '%';
        card.className = 'wcard is-out';
        await wait(260);
        if (gone(gen)) return;
        $('.wcard__w', card).textContent = w;
        card.className = 'wcard is-in';
        const r = await respond({ f: 'fake', j: 'real' }, 3000);
        if (gone(gen)) return;
        const ok = r.v === truth;
        out.push({ ok, rt: r.v ? r.rt : 3000, timeout: !r.v });
        card.className = 'wcard ' + (ok ? 'is-ok' : 'is-no');
        react(ok, card);
        await wait(240);
      }
      const ok = out.filter(o => o.ok);
      res[lang] = { acc: ok.length / out.length, rt: Math.round(median(ok.map(o => o.rt))) || 3000, timeouts: out.filter(o => o.timeout).length };
    }
    if (gone(gen)) return;
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
    const gen = run;
    const tts = 'speechSynthesis' in window;
    await intro([
      T('I\'ll <b>say</b> two words, like “car park”. 🎧', 'سأقول كلمتين، مثل “car park”. 🎧'),
      T('Swap their first sounds in your head — “<b>p</b>ar <b>c</b>ark” — and pop the right bubble.', 'بدّل أصواتهما الأولى في ذهنك — “<b>p</b>ar <b>c</b>ark” — وافقع الفقاعة الصحيحة.'),
      tts ? T('Tap my face to hear it again. Sound on!', 'انقر وجهي لتسمعها مجدداً. شغّل الصوت!') : T('<b>No speech on this browser</b> — I\'ll show the words instead.', '<b>لا يوجد نطق في هذا المتصفح</b> — سأعرض الكلمات بدلاً من ذلك.')
    ]);
    const out = [];
    const items = shuffle(SWAPS);
    for (let i = 0; i < items.length; i++) {
      if (gone(gen)) return;
      const [phrase, right, wrong] = items[i];
      const opts = shuffle([right, ...wrong]);
      body.innerHTML = `<div class="g-word-wrap">
        <div class="g-prog"><span style="width:${(i / items.length) * 100}%"></span></div>
        <button class="g-speaker" id="gReplay" aria-label="Play again">${F.mascot('happy', 'm-idle m-big')}<span class="g-waves"><i></i><i></i><i></i></span></button>
        <p class="g-hint mono">${tts ? T('listen… then pop a bubble', 'استمع… ثم افقع فقاعة') : phrase}</p>
        <div class="bubbles">${opts.map((o, k) => `<button class="bubble" style="--d:${k * 0.4}s" data-r="${o}"><kbd>${k + 1}</kbd>${o}</button>`).join('')}</div></div>`;
      const sp = $('#gReplay');
      const speak = async () => { sp.classList.add('is-talking'); await say(phrase); sp.classList.remove('is-talking'); };
      sp.onclick = speak;
      await speak();
      if (gone(gen)) return;
      const r = await respond({ 1: opts[0], 2: opts[1], 3: opts[2] }, 20000);
      if (gone(gen)) return;
      const ok = r.v === right;
      out.push({ ok, rt: r.rt });
      const btn = $$('.bubble', body).find(b => b.dataset.r === right);
      if (btn) btn.classList.add('is-ok');
      if (r.el && !ok) r.el.classList.add('is-no');
      react(ok, btn);
      await wait(650);
    }
    const res = { correct: out.filter(o => o.ok).length, of: out.length, rt: Math.round(median(out.map(o => o.rt))) };
    if (gone(gen)) return;
    finish(2, res, `<div class="g-sum__row"><span>${T('Correct swaps', 'التبديلات الصحيحة')}</span><b>${res.correct} / ${res.of}</b></div><div class="g-sum__row"><span>${T('Typical decision time', 'الوقت المعتاد للقرار')}</span><b>${(res.rt / 1000).toFixed(1)} s</b></div>`);
  }

  /* ================= Day 3 · Speed Naming ================= */
  const COLORS = [['red', '#E0533D', 'أحمر'], ['blue', '#3B6FD4', 'أزرق'], ['green', '#2FA05F', 'أخضر'], ['yellow', '#F2C230', 'أصفر'], ['black', '#2A2622', 'أسود']];
  const DIGITS = ['2', '4', '6', '7', '9'];
  const balloon = c => `<svg viewBox="0 0 60 84" class="balloon"><path d="M30 63q-7 9 0 20" stroke="#9a9a9a" stroke-width="1.5" fill="none"/><ellipse cx="30" cy="30" rx="24" ry="28" fill="${c}"/><ellipse cx="21" cy="19" rx="6" ry="9" fill="#fff" opacity=".35"/><path d="M26 57h8l-4 6z" fill="${c}"/></svg>`;
  function ranGrid(kind) {
    const items = [];
    let last = -1;
    for (let i = 0; i < 25; i++) { let k; do { k = Math.floor(Math.random() * 5); } while (k === last); last = k; items.push(k); }
    return items.map(k => kind === 'color' ? balloon(COLORS[k][1]) : `<span class="ran__d">${DIGITS[k]}</span>`);
  }
  async function gameNaming() {
    const gen = run;
    await intro([
      T('Balloon time! 🎈 One balloon wiggles at a time.', 'وقت البالونات! 🎈 يهتز بالون واحد في كل مرة.'),
      T('<b>Say its colour out loud</b>, then press <kbd>Space</kbd> (or tap) to pop it — as fast as feels comfortable.', '<b>قل لونه بصوت عالٍ</b>، ثم اضغط <kbd>Space</kbd> (أو انقر) لفقعه — بأسرع ما يريحك.'),
      T('Then the same with number tiles. Any language is fine. Nothing is recorded.', 'ثم الشيء نفسه مع بلاطات الأرقام. أي لغة مقبولة. لا يُسجَّل شيء.')
    ]);
    const res = {};
    for (const kind of ['color', 'digit']) {
      if (gone(gen)) return;
      const cells = ranGrid(kind);
      body.innerHTML = `<div class="g-block">
        <p class="g-round">${kind === 'color' ? T('Pop the balloons 🎈', 'افقع البالونات 🎈') : T('Flip the number tiles 🔢', 'اقلب بلاطات الأرقام 🔢')}</p>
        ${kind === 'color' ? `<p class="small muted">${COLORS.map(c => `<span class="ran__key" style="--c:${c[1]}"></span>${AR() ? c[2] : c[0]}`).join(' · ')}</p>` : ''}
        <div class="ran ran--${kind}" id="ran" data-r="next">${cells.map((c, i) => `<span class="ran__i" data-i="${i}">${c}</span>`).join('')}</div>
        <p class="g-hint mono">${T('Space / tap = next', 'Space / نقرة = التالي')}</p></div>`;
      await wait(900);
      if (gone(gen)) return;
      const times = [];
      const els = $$('.ran__i', body);
      for (let i = 0; i < 25; i++) {
        els.forEach((el, k) => el.classList.toggle('is-cur', k === i));
        const r = await respond({ ' ': 'next', enter: 'next', arrowright: 'next' }, 6000);
        if (gone(gen)) return;
        times.push(r.rt);
        els[i].classList.remove('is-cur');
        els[i].classList.add('is-popped');
        F.sfx.pop();
      }
      if (gone(gen)) return;
      F.confetti($('#ran'), 30);
      res[kind] = Math.round(median(times));
      await wait(500);
    }
    const out = { color: res.color, digit: res.digit, msPerItem: Math.round((res.color + res.digit) / 2) };
    if (gone(gen)) return;
    finish(3, out, `<div class="g-sum__row"><span>${T('Colours', 'الألوان')}</span><b>${out.color} ms ${T('per item', 'لكل عنصر')}</b></div><div class="g-sum__row"><span>${T('Digits', 'الأرقام')}</span><b>${out.digit} ms ${T('per item', 'لكل عنصر')}</b></div>`);
  }

  /* ================= Day 4 · Catch the Target ================= */
  const STAR = '<svg viewBox="0 0 100 100" class="sprite sprite--star"><path d="M50 6l12.6 27.6 30 3.4-22.4 20.4 6.4 29.6L50 72 23.4 87l6.4-29.6L7.4 37l30-3.4z" fill="#F5C443" stroke="#E0A21B" stroke-width="3" stroke-linejoin="round"/><ellipse cx="41" cy="46" rx="3.6" ry="4.6" fill="#2A2622"/><ellipse cx="59" cy="46" rx="3.6" ry="4.6" fill="#2A2622"/><path d="M42 56q8 7 16 0" fill="none" stroke="#2A2622" stroke-width="3" stroke-linecap="round"/><ellipse cx="33" cy="55" rx="4" ry="2.4" fill="#F28C6B" opacity=".6"/><ellipse cx="67" cy="55" rx="4" ry="2.4" fill="#F28C6B" opacity=".6"/></svg>';
  const CAT = awake => `<svg viewBox="0 0 100 100" class="sprite sprite--cat"><path d="M16 46 22 14l20 18h16l20-18 6 32" fill="#8E8AA6"/><path d="M24 22l4 14 8-6zM76 22l-4 14-8-6z" fill="#F3A6B5"/><ellipse cx="50" cy="58" rx="36" ry="30" fill="#8E8AA6"/>${awake
    ? '<circle cx="37" cy="54" r="6" fill="#fff"/><circle cx="63" cy="54" r="6" fill="#fff"/><circle cx="37" cy="54" r="3" fill="#2A2622"/><circle cx="63" cy="54" r="3" fill="#2A2622"/><path d="M44 72q6-5 12 0" stroke="#2A2622" stroke-width="2.6" fill="none" stroke-linecap="round"/><text x="78" y="26" font-size="24" font-weight="800" fill="#E0533D" font-family="sans-serif">!</text>'
    : '<path d="M31 55q6 4 12 0M57 55q6 4 12 0" stroke="#2A2622" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M47 64h6l-3 3z" fill="#F3A6B5"/><text x="74" y="24" font-size="14" font-weight="700" fill="#9D8BD6" font-family="sans-serif" class="zz">z</text><text x="84" y="14" font-size="10" font-weight="700" fill="#9D8BD6" font-family="sans-serif" class="zz zz2">z</text>'}<path d="M14 62h14M14 68h14M72 62h14M72 68h14" stroke="#5E5A75" stroke-width="1.6"/></svg>`;
  async function gameTarget() {
    const gen = run;
    await intro([
      T('Catch the <b>stars</b> ⭐ — press <kbd>Space</kbd> or tap, fast!', 'التقط <b>النجوم</b> ⭐ — اضغط <kbd>Space</kbd> أو انقر بسرعة!'),
      T('But shhh… <b>don\'t wake the cat</b> 🐱. When the cat appears, do nothing.', 'لكن صه… <b>لا توقظ القطة</b> 🐱. عندما تظهر القطة، لا تفعل شيئاً.'),
      T('40 rounds, about a minute. Waking the cat happens to everyone!', '٤٠ جولة، حوالي دقيقة. إيقاظ القطة يحدث للجميع!')
    ]);
    const trials = shuffle([...Array(30).fill('go'), ...Array(10).fill('nogo')]);
    body.innerHTML = `<div class="g-word-wrap"><div class="g-prog"><span id="tProg"></span></div>
      <div class="night" data-r="hit" id="pad"><i class="night__moon"></i><span class="night__twinkle" style="--x:12%;--y:18%"></span><span class="night__twinkle" style="--x:82%;--y:12%;--d:.8s"></span><span class="night__twinkle" style="--x:70%;--y:70%;--d:1.4s"></span><div class="night__slot" id="slot"></div><div class="night__grass"></div></div>
      <p class="g-hint mono">${T('⭐ = catch · 🐱 = let it sleep', '⭐ = التقط · 🐱 = دعها تنام')}</p></div>`;
    const slot = $('#slot'), prog = $('#tProg'), pad = $('#pad');
    const rts = []; let omit = 0, comm = 0;
    await wait(1000);
    for (let i = 0; i < trials.length; i++) {
      if (gone(gen)) return;
      prog.style.width = (i / trials.length * 100) + '%';
      const go = trials[i] === 'go';
      slot.innerHTML = go ? STAR : CAT(false);
      slot.className = 'night__slot is-in';
      const hide = setTimeout(() => { slot.className = 'night__slot is-gone'; }, 550);
      const r = await respond({ ' ': 'hit' }, 1000);
      clearTimeout(hide);
      if (gone(gen)) return;
      if (go) {
        if (r.v) { rts.push(r.rt); slot.className = 'night__slot is-caught'; react(true, pad); }
        else { omit++; combo = 0; }
      } else if (r.v) {
        comm++; slot.innerHTML = CAT(true); slot.className = 'night__slot is-woke'; react(false, pad);
      }
      if (r.v && r.rt < 1000) await wait(1000 - r.rt);
      if (gone(gen)) return;
      slot.className = 'night__slot';
      await wait(350 + Math.random() * 450);
    }
    const res = { omission: omit / 30, commission: comm / 10, rt: Math.round(mean(rts)), cv: rts.length > 2 ? +(sd(rts) / mean(rts)).toFixed(2) : 1 };
    if (gone(gen)) return;
    finish(4, res, `<div class="g-sum__row"><span>${T('Stars missed', 'نجوم فاتتك')}</span><b>${pct(res.omission)}</b></div><div class="g-sum__row"><span>${T('Cats woken', 'قطط أيقظتها')}</span><b>${pct(res.commission)}</b></div><div class="g-sum__row"><span>${T('Average reaction · steadiness', 'متوسط الاستجابة · الثبات')}</span><b>${res.rt} ms · CV ${res.cv}</b></div>`);
  }

  /* ================= Day 5 · Memory & Numbers ================= */
  async function gameMemory() {
    const gen = run;
    await intro([
      T('Three mini-games! <b>1 · Bubble memory</b> — watch the number bubbles, then type them <b>backwards</b>.', 'ثلاث ألعاب صغيرة! <b>١ · ذاكرة الفقاعات</b> — شاهد فقاعات الأرقام، ثم اكتبها <b>بالعكس</b>.'),
      T('<b>2 · Rocket landing</b> 🚀 — tap where the number lives on the 0–100 line.', '<b>٢ · هبوط الصاروخ</b> 🚀 — انقر حيث يقع الرقم على خط ٠–١٠٠.'),
      T('<b>3 · Firefly jars</b> ✨ — which jar had more fireflies?', '<b>٣ · برطمانات اليراعات</b> ✨ — أي برطمان فيه يراعات أكثر؟')
    ]);
    // Part 1: backward digit span
    let span = 2;
    for (let len = 3; len <= 7; len++) {
      let passed = false;
      for (let attempt = 0; attempt < 2 && !passed; attempt++) {
        if (gone(gen)) return;
        const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 9) + 1);
        body.innerHTML = `<div class="g-word-wrap"><p class="g-round">${T('Bubble memory', 'ذاكرة الفقاعات')} · ${len} ${T('bubbles', 'فقاعات')}</p><div class="mem-stage" id="mem"></div></div>`;
        await wait(500);
        if (gone(gen)) return;
        for (const d of seq) {
          if (gone(gen)) return;
          $('#mem').innerHTML = `<span class="mem-bubble">${d}</span>`;
          F.sfx.tick();
          await wait(800); if (gone(gen)) return; $('#mem').innerHTML = ''; await wait(180);
        }
        body.innerHTML = `<div class="g-word-wrap">${host('think', T('Now type them backwards!', 'الآن اكتبها بالعكس!'))}
          <form id="spanForm" class="span-form"><input id="spanIn" inputmode="numeric" autocomplete="off" maxlength="9" aria-label="Digits backwards"><button class="btn btn--accent">${T('Check', 'تحقق')}</button></form></div>`;
        const inp = $('#spanIn'); inp.focus();
        const ans = await new Promise(res => { $('#spanForm').onsubmit = e => { e.preventDefault(); res(inp.value.replace(/\D/g, '')); }; abort = () => res(''); });
        if (gone(gen)) return;
        passed = ans === seq.slice().reverse().join('');
        react(passed, $('#spanForm'));
        await wait(350);
      }
      if (!passed) break;
      span = len;
    }
    // Part 2: number line — rocket landing
    const targets = shuffle([23, 71, 8, 46, 92]);
    const errs = [];
    for (let i = 0; i < targets.length; i++) {
      if (gone(gen)) return;
      body.innerHTML = `<div class="g-word-wrap"><p class="g-round">🚀 ${T('Land the rocket on', 'أهبط الصاروخ على')} <b class="g-target">${targets[i]}</b> <span class="muted mono">(${i + 1}/5)</span></p>
        <div class="nline nline--sky" id="nline" dir="ltr"><span class="nline__bar"></span>${[0, 25, 50, 75, 100].map(t => `<span class="nline__t" style="left:${t}%"></span>`).join('')}<span class="nline__l">0</span><span class="nline__r">100</span><span class="nline__rocket" id="rocket">🚀</span><span class="nline__flag" id="flag">🚩</span></div>
        <p class="g-hint mono">${T('tap the line', 'انقر على الخط')}</p></div>`;
      const v = await new Promise(res => {
        const nl = $('#nline');
        nl.onpointerdown = e => { const r = nl.getBoundingClientRect(); res(Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100))); };
        abort = () => res(null);
      });
      if (v == null) return;
      if (gone(gen)) return;
      const rk = $('#rocket'); rk.style.left = v + '%'; rk.classList.add('is-land');
      const fl = $('#flag'); fl.style.left = targets[i] + '%';
      await wait(500);
      if (gone(gen)) return;
      fl.classList.add('is-on');
      const err = Math.abs(v - targets[i]);
      errs.push(err);
      react(err <= 8, rk);
      await wait(700);
    }
    // Part 3: dot comparison — firefly jars
    const pairs = shuffle([[12, 15], [20, 16], [9, 12], [18, 22], [14, 11], [25, 20], [10, 13], [17, 21]]);
    let right = 0;
    for (let i = 0; i < pairs.length; i++) {
      if (gone(gen)) return;
      const [a, b] = pairs[i];
      const dots = n => Array.from({ length: n }, () => `<i style="left:${10 + Math.random() * 78}%;top:${22 + Math.random() * 66}%;--s:${6 + Math.random() * 5}px;--d:${Math.random() * 1.2}s"></i>`).join('');
      body.innerHTML = `<div class="g-word-wrap"><p class="g-round">✨ ${T('Which jar has more fireflies?', 'أي برطمان فيه يراعات أكثر؟')} <span class="muted mono">(${i + 1}/8)</span></p>
        <div class="jars" dir="ltr"><button class="jar" data-r="a"><span class="jar__lid"></span><span class="jar__glass">${dots(a)}</span><kbd>←</kbd></button><button class="jar" data-r="b"><span class="jar__lid"></span><span class="jar__glass">${dots(b)}</span><kbd>→</kbd></button></div></div>`;
      setTimeout(() => !gone(gen) && $$('.jar', body).forEach(x => x.classList.add('is-dark')), 900);
      const r = await respond({ arrowleft: 'a', arrowright: 'b' }, 8000);
      if (gone(gen)) return;
      const ok = (r.v === 'a' && a > b) || (r.v === 'b' && b > a);
      if (ok) right++;
      $$('.jar', body).forEach(x => x.classList.remove('is-dark'));
      react(ok, r.el || $('.jars', body));
      await wait(500);
    }
    const res = { span, lineErr: +mean(errs).toFixed(1), dots: right / pairs.length };
    if (gone(gen)) return;
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
