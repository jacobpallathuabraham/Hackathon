/* ERLY — Learning Games (v10).

   Optional practice activities. Hard rules, kept in code as well as words:
   - nothing here tests, detects, scores risk for or diagnoses any condition;
     results are never turned into labels, probabilities or "signs";
   - no camera, no microphone, no biometric or emotional inference;
   - sound is OFF by default; the listening game shows text when it is off;
   - results are stored only in this browser (localStorage "erly-games-v1")
     and can be cleared from the progress panel; nothing is sent anywhere;
   - pause, skip and stop never cost anything.

   Engine: each game has rounds(level, n) and play(stage, round, ctx) that
   resolves { ok, part } (part = 0..1 credit). ctx.wait() respects pause. */
(function () {
  'use strict';
  const D = window.ERLY_GAMES_DATA;
  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en);
  const L = p => T(p[0], p[1]);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickN = (a, n) => shuffle(a).slice(0, n);
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');

  /* ---------------- local store ---------------- */
  const KEY = 'erly-games-v1';
  const DEF = { settings: { level: 'standard', length: 'medium', quality: 'high', sound: false, cat: 'all' }, sessions: [] };
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.settings) return { settings: Object.assign({}, DEF.settings, s.settings), sessions: Array.isArray(s.sessions) ? s.sessions : [] }; } catch (e) { /* blocked: defaults */ } return JSON.parse(JSON.stringify(DEF)); }
  let db = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* not persisted */ } };
  const set = (k, v) => { db.settings[k] = v; save(); };
  const ROUNDS = { short: 5, medium: 8, long: 12 };
  const LV = { gentle: 1, standard: 2, stretch: 3 };

  /* ---------------- sound (muted unless switched on) ---------------- */
  let ac = null;
  function tone(f, ms) {
    if (!db.settings.sound) return;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + (ms || 160) / 1000); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + (ms || 160) / 1000 + 0.05); } catch (e) { /* no audio */ }
  }
  function speak(text) {
    if (!db.settings.sound || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = 0.92; speechSynthesis.speak(u); return true; } catch (e) { return false; }
  }

  const CATS = {
    reading: ['Reading comprehension', 'فهم المقروء', '#f97316', '📖'],
    vocab: ['Vocabulary & language', 'المفردات واللغة', '#fb7185', '🔤'],
    memory: ['Memory', 'الذاكرة', '#a855f7', '🧠'],
    planning: ['Planning', 'التخطيط', '#22c55e', '🗺️'],
    attention: ['Focus & attention', 'التركيز والانتباه', '#eab308', '🎯'],
    listening: ['Listening', 'الاستماع', '#ec4899', '🎧'],
    writing: ['Writing & creativity', 'الكتابة والإبداع', '#14b8a6', '✍️'],
    spatial: ['Spatial & 3D', 'المكاني وثلاثي الأبعاد', '#38bdf8', '🧊'],
    pattern: ['Pattern recognition', 'التعرّف على الأنماط', '#6366f1', '🔷'],
    problem: ['Problem-solving', 'حل المشكلات', '#84cc16', '🧩']
  };
  // how to play — shown on each game's intro screen
  const HOW = {
    words: [['Read the meaning at the top.', 'اقرأ المعنى في الأعلى.'], ['Tap word parts to fill the slots in order; tap a slot to take a part back.', 'اضغط أجزاء الكلمة لملء الخانات بالترتيب؛ اضغط خانة لإرجاع الجزء.'], ['Press Check to see what each part means.', 'اضغط تحقق لترى معنى كل جزء.']],
    order: [['Read all the sentences first.', 'اقرأ كل الجمل أولاً.'], ['Tap them in the order that makes a logical paragraph.', 'اضغطها بالترتيب الذي يكوّن فقرة منطقية.'], ['Signal words like “Then” and “Therefore” are clues.', 'كلمات الربط مثل «ثم» و«لذلك» مفاتيح.']],
    comprehend: [['Read the short passage at your own pace — it stays on screen.', 'اقرأ النص القصير بإيقاعك — يبقى على الشاشة.'], ['Choose the best answer to the question.', 'اختر أفضل إجابة للسؤال.'], ['Every answer shows where in the text the evidence is.', 'كل إجابة تبيّن موضع الدليل في النص.']],
    sequence: [['Watch the pads light up one by one.', 'شاهد الأزرار تضيء واحداً تلو الآخر.'], ['Then tap them in the same order.', 'ثم اضغطها بنفس الترتيب.'], ['Sequences grow slowly as you go.', 'تطول التسلسلات تدريجياً.']],
    chunk: [['A row of digits appears for a few seconds.', 'يظهر صف من الأرقام لثوانٍ.'], ['Type them back in order.', 'اكتبها بالترتيب.'], ['Some rounds show them in chunks — notice whether that helps.', 'بعض الجولات تعرضها مجزأة — لاحظ إن كان ذلك يساعد.']],
    plan: [['A real study goal appears with its tasks.', 'يظهر هدف دراسي حقيقي مع مهامه.'], ['Tap the tasks in the order you would do them.', 'اضغط المهام بالترتيب الذي ستنجزها به.'], ['Any order works as long as each task comes after what it needs.', 'أي ترتيب يصلح ما دامت كل مهمة بعد ما تحتاجه.']],
    switch: [['Look at the rule word: SHAPE or COLOUR.', 'انظر إلى كلمة القاعدة: الشكل أو اللون.'], ['Answer with the left or right button (or F / J keys).', 'أجب بالزر الأيسر أو الأيمن (أو مفتاحي F / J).'], ['Accuracy matters, not speed. There is no countdown.', 'الدقة هي المهمة لا السرعة. لا يوجد عدّ تنازلي.']],
    rotate: [['Look at the 3D shape on the left.', 'انظر إلى الشكل ثلاثي الأبعاد على اليسار.'], ['Decide: is the other shape the same one turned, or a mirror image?', 'قرّر: هل الشكل الآخر هو نفسه مُدار، أم صورة مرآة؟'], ['On Gentle, a slider lets you turn the right-hand shape.', 'في المستوى الهادئ يتيح لك منزلق تدوير الشكل الأيمن.']],
    listen: [['Read (or listen to) an instruction like “tap the blue circle”.', 'اقرأ (أو استمع إلى) تعليمات مثل «اضغط الدائرة الزرقاء».'], ['Tap the shapes it describes, in order.', 'اضغط الأشكال الموصوفة بالترتيب.'], ['Sound is off unless you turn it on; the text is always shown then.', 'الصوت مطفأ ما لم تشغّله؛ ويُعرض النص عندها.']],
    spark: [['Pick up the picture prompt and three spark words.', 'خذ فكرة الصورة وثلاث كلمات محفّزة.'], ['Jot quick notes (who, where, what happens) if you like, then write a few sentences.', 'دوّن ملاحظات سريعة (من، أين، ماذا يحدث) إن أردت، ثم اكتب بضع جمل.'], ['There is no marking. Your writing is not saved or sent anywhere.', 'لا يوجد تقييم. كتابتك لا تُحفظ ولا تُرسل إلى أي مكان.']],
    pattern: [['Look at the sequence of numbers or shapes.', 'انظر إلى تسلسل الأرقام أو الأشكال.'], ['Work out the rule and choose what comes next.', 'استنتج القاعدة واختر ما يأتي بعد ذلك.'], ['The rule is explained after every answer.', 'تُشرح القاعدة بعد كل إجابة.']],
    hanoi: [['Move the whole tower to the right-hand peg.', 'انقل البرج كله إلى العمود الأيمن.'], ['Tap a peg to lift its top disc, then tap another peg to place it.', 'اضغط عموداً لرفع قرصه العلوي، ثم اضغط عموداً آخر لوضعه.'], ['A larger disc can never go on a smaller one. Take as many moves as you need.', 'لا يوضع قرص أكبر على أصغر. خذ ما تحتاجه من حركات.']]
  };

  /* ---------------- the games ---------------- */
  const MEAN = { in: 'not', il: 'not', ir: 'not', un: 'not', a: 'without', vis: 'see', ible: 'able to be', able: 'able to be', trans: 'across', port: 'carry', bio: 'life', logy: 'study of', geo: 'earth', pre: 'before', dict: 'say', auto: 'self', graphy: 'writing', graph: 'write', sub: 'away / under', tract: 'pull, draw', ion: 'act or process', micro: 'small', scope: 'look at', leg: 'read', tele: 'far', phone: 'sound', depend: 'rely on', ence: 'state of', re: 'again', construct: 'build', contra: 'against', inter: 'between', nation: 'nation', al: 'relating to', hydro: 'water', lysis: 'splitting', photo: 'light', synth: 'put together', esis: 'process', symmetr: 'symmetry', ical: 'relating to', revers: 'turn back', de: 'undo', tion: 'act of', ment: 'result of', ism: 'belief / practice', ology: 'study of', chrom: 'colour', thermo: 'heat' };
  const head = (q, sub) => `<div class="gp-q"><b>${q}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const GAMES = [];

  /* 1 · Word Builder (reading) */
  GAMES.push({
    id: 'words', cat: 'vocab', mins: 4, title: ['Word Builder', 'بنّاء الكلمات'], blurb: ['Build academic words from their parts — prefixes, roots and suffixes.', 'ابنِ كلمات أكاديمية من أجزائها: السوابق والجذور واللواحق.'],
    tips: [['Split long words into parts: “in-vis-ible” is three meaningful pieces, not twelve letters.', 'قسّم الكلمات الطويلة إلى أجزاء ذات معنى.'], ['Learning ten common roots (port, dict, vis, tract, graph…) unlocks hundreds of words.', 'تعلّم عشرة جذور شائعة يفتح مئات الكلمات.'], ['When you meet a new term in a reading, guess its meaning from its parts, then check.', 'خمّن معنى المصطلح الجديد من أجزائه ثم تحقق.']],
    rounds(lv, n) { const pool = D.words.filter(w => (lv === 1 ? w[3] === 1 : lv === 2 ? w[3] <= 2 : w[3] >= 2)); return pickN(pool.length >= n ? pool : D.words, n); },
    play(stage, w, ctx) {
      return new Promise(done => {
        const [def, parts, extra] = w; const tiles = shuffle(parts.concat(extra.slice(0, ctx.level === 1 ? 1 : ctx.level === 2 ? 2 : 3)));
        const got = [];
        function draw(result) {
          stage.innerHTML = head(T('Build the word that means:', 'ابنِ الكلمة التي تعني:'), `“${esc(def)}”`) +
            `<div class="gp-slots">${parts.map((_, i) => `<button type="button" class="gp-slot ${got[i] != null ? 'is-full' : ''} ${result ? (tiles[got[i]] === parts[i] ? 'is-ok' : 'is-no') : ''}" data-slot="${i}" aria-label="${T('Slot', 'خانة')} ${i + 1}">${got[i] != null ? esc(tiles[got[i]]) : ''}</button>`).join('')}</div>
            <div class="gp-tiles">${tiles.map((t, i) => `<button type="button" class="gp-tile" data-t="${i}" ${got.includes(i) || result ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>
            ${result ? `<p class="gp-explain">${parts.map(p => `<b>${esc(p)}</b> = ${esc(MEAN[p] || p)}`).join(' · ')} → <b>${esc(parts.join(''))}</b></p>` : `<div class="gp-row"><button type="button" class="gp-btn" data-check ${got.filter(x => x != null).length < parts.length ? 'disabled' : ''}>${T('Check', 'تحقق')}</button></div>`}`;
        }
        draw();
        stage.onclick = e => {
          const t = e.target.closest('[data-t]'), s = e.target.closest('[data-slot]'), c = e.target.closest('[data-check]');
          if (t) { const k = got.findIndex(x => x == null); got[k < 0 ? got.length : k] = +t.dataset.t; tone(520, 90); draw(); }
          else if (s && got[+s.dataset.slot] != null) { got[+s.dataset.slot] = null; draw(); }
          else if (c) { const right = parts.filter((p, i) => tiles[got[i]] === p).length; draw(true); stage.onclick = null; ctx.feedback(right === parts.length); done({ ok: right === parts.length, part: right / parts.length }); }
        };
      });
    }
  });

  /* 2 · Sentence Flow (reading) */
  GAMES.push({
    id: 'order', cat: 'reading', mins: 5, title: ['Sentence Flow', 'تسلسل الجمل'], blurb: ['Put the sentences of a short academic paragraph back in a logical order.', 'رتّب جمل فقرة أكاديمية قصيرة بترتيب منطقي.'],
    tips: [['Signal words carry the logic: “First… Then… Finally”, “However”, “Therefore”, “As a result”.', 'كلمات الربط تحمل المنطق: أولاً، ثم، لكن، لذلك.'], ['The opening sentence usually names the topic; later ones refer back with “this”, “it” or “these”.', 'الجملة الأولى تقدّم الموضوع وما بعدها يشير إليه.'], ['When a reading feels jumbled, write one line per paragraph saying what it adds.', 'اكتب سطراً لكل فقرة يلخص ما تضيفه.']],
    rounds(lv, n) { const pool = D.paragraphs.filter(p => (lv === 1 ? p.length <= 4 : true)); return Array.from({ length: n }, (_, i) => pool[i % pool.length]).sort(() => Math.random() - 0.5); },
    play(stage, para, ctx) {
      return new Promise(done => {
        const order = shuffle(para.map((_, i) => i)); if (order.every((v, i) => v === i)) order.reverse();
        const picked = [];
        const SIG = /\b(First|Next|Then|Finally|However|Therefore|As a result|Consequently|Because of this|Eventually|If|This|During|Only|Each)\b/;
        function draw(result) {
          stage.innerHTML = head(T('Tap the sentences in a logical order', 'اضغط الجمل بترتيب منطقي'), ctx.level === 1 ? T('Hint: look for signal words like “Then” or “Therefore”.', 'تلميح: ابحث عن كلمات الربط.') : '') +
            `<ol class="gp-built">${picked.map((k, i) => `<li class="${result ? (k === i ? 'is-ok' : 'is-no') : ''}">${esc(para[k]).replace(SIG, '<mark>$1</mark>')}</li>`).join('')}</ol>
            <div class="gp-sents">${order.filter(k => !picked.includes(k)).map(k => `<button type="button" class="gp-sent" data-k="${k}">${esc(para[k])}</button>`).join('')}</div>
            <div class="gp-row">${picked.length && !result ? `<button type="button" class="gp-btn gp-btn--ghost" data-undo>${T('Undo', 'تراجع')}</button>` : ''}</div>`;
        }
        draw();
        stage.onclick = e => {
          const b = e.target.closest('[data-k]');
          if (b) { picked.push(+b.dataset.k); tone(480 + picked.length * 40, 80); if (picked.length === para.length) { const right = picked.filter((k, i) => k === i).length; draw(true); stage.onclick = null; ctx.feedback(right === para.length); return done({ ok: right === para.length, part: right / para.length }); } draw(); }
          if (e.target.closest('[data-undo]')) { picked.pop(); draw(); }
        };
      });
    }
  });

  /* 3 · Glow Sequence (memory) */
  GAMES.push({
    id: 'sequence', cat: 'memory', mins: 3, title: ['Glow Sequence', 'تسلسل الضوء'], blurb: ['Watch the pads light up, then repeat the sequence.', 'شاهد الأزرار تضيء ثم كرّر التسلسل.'],
    tips: [['Give positions names and say them in a rhythm: “top-left, middle, bottom-right”.', 'سمِّ المواقع وردّدها بإيقاع.'], ['Group the sequence into pairs or threes — like a phone number.', 'جمّع التسلسل في أزواج أو ثلاثيات.'], ['Picture the path as a shape (a “Z”, a triangle) rather than separate points.', 'تخيّل المسار كشكل بدلاً من نقاط منفصلة.']],
    rounds(lv, n) { return Array.from({ length: n }, (_, i) => { const len = 2 + lv + Math.floor(i / 3); return Array.from({ length: len }, () => Math.floor(Math.random() * 9)); }); },
    play(stage, seq, ctx) {
      return new Promise(async done => {
        stage.innerHTML = head(T('Watch…', 'شاهد…'), T(`${seq.length} lights`, `${seq.length} أضواء`)) + `<div class="gp-pads" data-lock>${Array.from({ length: 9 }, (_, i) => `<button type="button" class="gp-pad" data-p="${i}" style="--h:${i * 40}" aria-label="${T('Pad', 'زر')} ${i + 1}"></button>`).join('')}</div>`;
        const pads = [...stage.querySelectorAll('.gp-pad')], grid = stage.querySelector('.gp-pads');
        const on = ctx.level === 1 ? 650 : ctx.level === 2 ? 520 : 420;
        await ctx.wait(500);
        for (const k of seq) { if (ctx.gone()) return; pads[k].classList.add('is-lit'); tone(330 + k * 55, on * 0.8); await ctx.wait(on); pads[k].classList.remove('is-lit'); await ctx.wait(160); }
        if (ctx.gone()) return;
        stage.querySelector('.gp-q b').textContent = T('Your turn — repeat it', 'دورك — كرّره'); grid.removeAttribute('data-lock');
        let i = 0;
        grid.onclick = e => {
          const b = e.target.closest('[data-p]'); if (!b) return; const k = +b.dataset.p;
          b.classList.add('is-lit'); tone(330 + k * 55, 120); setTimeout(() => b.classList.remove('is-lit'), 180);
          if (k !== seq[i]) { grid.onclick = null; pads[seq[i]].classList.add('is-hint'); ctx.feedback(false); return done({ ok: false, part: i / seq.length }); } // recorded at once; the engine pauses before the next round
          i++; if (i === seq.length) { grid.onclick = null; ctx.feedback(true); done({ ok: true, part: 1 }); }
        };
      });
    }
  });

  /* 4 · Chunk It (memory) */
  GAMES.push({
    id: 'chunk', cat: 'memory', mins: 4, title: ['Chunk It', 'جزّئها'], blurb: ['Remember a string of digits — and see how chunking helps.', 'تذكّر سلسلة أرقام واكتشف كيف تساعد التجزئة.'],
    tips: [['Chunking: 4 9 1 7 2 0 3 8 is hard; “491 · 720 · 38” is three easy pieces.', 'التجزئة تجعل ثمانية أرقام ثلاث قطع سهلة.'], ['Look for meaning — dates, ages, patterns (“20 38”).', 'ابحث عن معنى: تواريخ، أعمار، أنماط.'], ['The same trick works for formulas, references and lists in revision.', 'نفس الحيلة تنفع للمعادلات والقوائم في المراجعة.']],
    rounds(lv, n) { return Array.from({ length: n }, (_, i) => { const len = 4 + lv * 2 + (i >= n / 2 ? 1 : 0); return { digits: Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join(''), chunked: i % 2 === 0 }; }); },
    play(stage, r, ctx) {
      return new Promise(async done => {
        const shown = r.chunked ? r.digits.match(/.{1,3}/g).join(' · ') : r.digits.split('').join(' ');
        stage.innerHTML = head(T('Remember these digits', 'تذكّر هذه الأرقام'), r.chunked ? T('Shown in chunks of three', 'معروضة في مجموعات من ثلاثة') : T('Shown one by one — try chunking them yourself', 'معروضة منفردة — جرّب تجزئتها بنفسك')) + `<div class="gp-digits">${shown}</div>`;
        await ctx.wait(900 + r.digits.length * (ctx.level === 1 ? 650 : 480));
        if (ctx.gone()) return;
        stage.innerHTML = head(T('Type them in order', 'اكتبها بالترتيب'), '') + `<form class="gp-form"><input class="gp-input" inputmode="numeric" autocomplete="off" aria-label="${T('Digits', 'الأرقام')}" maxlength="${r.digits.length + 4}"><button class="gp-btn">${T('Check', 'تحقق')}</button></form>`;
        const f = stage.querySelector('form'), inp = f.querySelector('input'); inp.focus();
        f.onsubmit = e => {
          e.preventDefault(); const a = inp.value.replace(/\D/g, ''); let right = 0; for (let k = 0; k < r.digits.length; k++) if (a[k] === r.digits[k]) right++;
          const ok = a === r.digits; f.outerHTML = `<p class="gp-explain">${T('It was', 'كانت')} <b>${r.digits.match(/.{1,3}/g).join(' ')}</b>${ok ? '' : ` — ${T('you had', 'كتبت')} ${right}/${r.digits.length} ${T('in the right place', 'في المكان الصحيح')}`}</p>`;
          ctx.feedback(ok); done({ ok, part: right / r.digits.length, chunked: r.chunked });
        };
      });
    }
  });

  /* 5 · Plan It (planning) */
  GAMES.push({
    id: 'plan', cat: 'planning', mins: 5, title: ['Plan It', 'خطّط لها'], blurb: ['Put real study tasks in a workable order — some depend on others.', 'رتّب مهام دراسية حقيقية بترتيب عملي، فبعضها يعتمد على غيره.'],
    tips: [['Ask “what does this step need first?” — that is its dependency.', 'اسأل: ماذا تحتاج هذه الخطوة أولاً؟'], ['Start with a 10-minute task to get moving; momentum makes the big ones easier.', 'ابدأ بمهمة من عشر دقائق لتنطلق.'], ['Put the time each step takes next to it; plans fail when we guess “it’ll be quick”.', 'اكتب الوقت بجانب كل خطوة.']],
    rounds(lv, n) { return Array.from({ length: n }, (_, i) => D.plans[i % D.plans.length]).sort(() => Math.random() - 0.5); },
    play(stage, P, ctx) {
      return new Promise(done => {
        const tasks = shuffle(P.tasks), seq = [];
        const byId = Object.fromEntries(P.tasks.map(t => [t[0], t]));
        function draw(result, broken) {
          const total = seq.reduce((s, id) => s + byId[id][2], 0);
          stage.innerHTML = head(esc(P.title), T('Tap the tasks in the order you would do them. More than one order can work.', 'اضغط المهام بالترتيب الذي ستنجزها به. قد يصلح أكثر من ترتيب.')) +
            `<ol class="gp-built gp-built--plan">${seq.map(id => `<li class="${result ? (broken.includes(id) ? 'is-no' : 'is-ok') : ''}">${esc(byId[id][1])} <small>${byId[id][2]} min</small></li>`).join('')}</ol>
            <div class="gp-sents">${tasks.filter(t => !seq.includes(t[0])).map(t => `<button type="button" class="gp-sent" data-id="${t[0]}">${esc(t[1])} <small>${t[2]} min${ctx.level === 1 && t[3].length ? ' · ' + T('needs', 'يحتاج') + ': ' + t[3].map(d => esc(byId[d][1].toLowerCase())).join(', ') : ''}</small></button>`).join('')}</div>
            <div class="gp-row">${seq.length && !result ? `<button type="button" class="gp-btn gp-btn--ghost" data-undo>${T('Undo', 'تراجع')}</button>` : ''}<span class="gp-total">${T('Planned', 'المخطط')}: ${total} min</span></div>
            ${result && broken.length ? `<p class="gp-explain">${broken.map(id => `<b>${esc(byId[id][1])}</b> ${T('needs', 'يحتاج')} ${byId[id][3].map(d => '“' + esc(byId[d][1]) + '”').join(' + ')} ${T('first', 'أولاً')}`).join('<br>')}</p>` : result ? `<p class="gp-explain">${T('Every step comes after what it needs. Workable plan!', 'كل خطوة تأتي بعد ما تحتاجه. خطة عملية!')}</p>` : ''}`;
        }
        draw();
        stage.onclick = e => {
          const b = e.target.closest('[data-id]');
          if (b) { seq.push(b.dataset.id); tone(500, 70); if (seq.length === tasks.length) { const broken = seq.filter((id, i) => byId[id][3].some(d => seq.indexOf(d) > i)); draw(true, broken); stage.onclick = null; ctx.feedback(!broken.length); return done({ ok: !broken.length, part: 1 - broken.length / seq.length }); } draw(); }
          if (e.target.closest('[data-undo]')) { seq.pop(); draw(); }
        };
      });
    }
  });

  /* 6 · Switch! (attention) */
  GAMES.push({
    id: 'switch', cat: 'attention', mins: 3, title: ['Switch!', 'بدّل!'], blurb: ['Sort by shape or by colour — the rule changes as you go.', 'صنّف حسب الشكل أو اللون — القاعدة تتغيّر.'],
    tips: [['Glance at the rule word first, every time — switching costs a moment for everyone.', 'انظر إلى كلمة القاعدة أولاً في كل مرة.'], ['When studying, batch similar tasks; switching between subjects every few minutes has a cost.', 'جمّع المهام المتشابهة أثناء الدراسة.'], ['Accuracy matters more than speed here. Slow is fine.', 'الدقة أهم من السرعة هنا.']],
    rounds(lv, n) { const p = lv === 1 ? 0.25 : lv === 2 ? 0.4 : 0.6; let rule = Math.random() < 0.5 ? 'shape' : 'colour'; return Array.from({ length: n }, () => Array.from({ length: 5 }, () => { if (Math.random() < p) rule = rule === 'shape' ? 'colour' : 'shape'; return { rule, shape: Math.random() < 0.5 ? 'circle' : 'square', colour: Math.random() < 0.5 ? 'blue' : 'orange' }; })); },
    play(stage, trials, ctx) {
      return new Promise(async done => {
        let i = 0, right = 0;
        const key = e => { if (['ArrowLeft', 'f', 'F'].includes(e.key)) answer(0); if (['ArrowRight', 'j', 'J'].includes(e.key)) answer(1); };
        let lock = false;
        function show() {
          const t = trials[i];
          stage.innerHTML = `<div class="gp-rule gp-rule--${t.rule}">${t.rule === 'shape' ? T('SHAPE', 'الشكل') : T('COLOUR', 'اللون')}</div>
            <div class="gp-stim"><i class="gp-shape gp-shape--${t.shape}" style="--c:${t.colour === 'blue' ? '#3b82f6' : '#f97316'}"></i></div>
            <div class="gp-choice"><button type="button" data-a="0"><span>● ${T('circle', 'دائرة')}</span><span class="gp-sw" style="--c:#3b82f6">${T('blue', 'أزرق')}</span><kbd>F / ←</kbd></button><button type="button" data-a="1"><span>■ ${T('square', 'مربع')}</span><span class="gp-sw" style="--c:#f97316">${T('orange', 'برتقالي')}</span><kbd>J / →</kbd></button></div>
            <p class="gp-dots">${trials.map((_, k) => `<i class="${k < i ? 'is-done' : k === i ? 'is-now' : ''}"></i>`).join('')}</p>`;
          lock = false;
        }
        async function answer(a) {
          if (lock || ctx.gone() || ctx.paused()) return; lock = true;
          const t = trials[i], want = t.rule === 'shape' ? (t.shape === 'circle' ? 0 : 1) : (t.colour === 'blue' ? 0 : 1);
          const ok = a === want; if (ok) right++; tone(ok ? 660 : 220, 90);
          stage.querySelector('.gp-stim').classList.add(ok ? 'is-ok' : 'is-no');
          await ctx.wait(380); i++;
          if (i >= trials.length) { removeEventListener('keydown', key); ctx.feedback(right === trials.length); return done({ ok: right >= trials.length - 1, part: right / trials.length }); }
          show();
        }
        stage.onclick = e => { const b = e.target.closest('[data-a]'); if (b) answer(+b.dataset.a); };
        addEventListener('keydown', key); ctx.cleanup(() => removeEventListener('keydown', key));
        show();
      });
    }
  });

  /* 7 · Rotate 3D (spatial) — genuine 3D with three.js, 2D fallback */
  const SHAPES = [[[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 1, 1]], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 1, 1], [1, 2, 1]], [[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1], [2, 1, 1], [2, 2, 1]], [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [0, 1, 1]], [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [1, 2, 1], [2, 2, 1]]];
  let three = null;
  const loadThree = () => three || (three = import('three').catch(() => null));
  GAMES.push({
    id: 'rotate', cat: 'spatial', mins: 4, title: ['Rotate 3D', 'تدوير ثلاثي الأبعاد'], blurb: ['Two 3D block shapes: the same shape turned, or its mirror image?', 'شكلان ثلاثيا الأبعاد: نفس الشكل مُداراً أم صورته في المرآة؟'],
    tips: [['Find one distinctive feature (the “hook”, the long arm) and track it in both shapes.', 'اختر ميزة مميزة وتتبّعها في الشكلين.'], ['Turn it in your head one axis at a time rather than all at once.', 'أدره في ذهنك حول محور واحد في كل مرة.'], ['On Gentle, use the slider to turn the right shape — checking is a strategy, not cheating.', 'في المستوى الهادئ استخدم المنزلق لتدوير الشكل.']],
    rounds(lv, n) { return Array.from({ length: n }, () => ({ shape: SHAPES[Math.floor(Math.random() * SHAPES.length)], mirror: Math.random() < 0.5, ax: lv === 1 ? [0, 1, 0] : lv === 2 ? [Math.random() < .5 ? 1 : 0, 1, 0] : [Math.random(), 1, Math.random()], ang: (lv === 1 ? 60 + Math.random() * 60 : 70 + Math.random() * 140) * Math.PI / 180 })); },
    async play(stage, r, ctx) {
      stage.innerHTML = head(T('Same shape, or a mirror image?', 'نفس الشكل أم صورة مرآة؟'), ctx.level === 1 ? T('Use the slider to turn the right-hand shape.', 'استخدم المنزلق لتدوير الشكل الأيمن.') : '') + `<div class="gp-3d"><canvas class="gp-3d__c" width="720" height="360" aria-label="${T('Two 3D block shapes', 'شكلان ثلاثيا الأبعاد')}" role="img"></canvas></div>${ctx.level === 1 ? `<label class="gp-turn">${T('Turn', 'أدر')} <input type="range" min="0" max="360" value="0" data-turn></label>` : ''}<div class="gp-row gp-row--c"><button type="button" class="gp-btn" data-ans="same">${T('Same shape', 'نفس الشكل')}</button><button type="button" class="gp-btn" data-ans="mirror">${T('Mirror image', 'صورة مرآة')}</button></div>`;
      const cv = stage.querySelector('canvas');
      const TH = await loadThree();
      let api = null;
      try { api = TH ? render3d(TH, cv, r, ctx) : null; } catch (e) { api = null; }
      if (!api) api = render2d(cv, r);
      const turn = stage.querySelector('[data-turn]'); if (turn) turn.oninput = () => api.turn(+turn.value * Math.PI / 180);
      return new Promise(done => {
        stage.querySelector('.gp-row').onclick = e => {
          const b = e.target.closest('[data-ans]'); if (!b) return;
          const ok = (b.dataset.ans === 'mirror') === r.mirror;
          stage.querySelectorAll('[data-ans]').forEach(x => { x.disabled = true; x.classList.toggle('is-ok', (x.dataset.ans === 'mirror') === r.mirror); });
          stage.insertAdjacentHTML('beforeend', `<p class="gp-explain">${r.mirror ? T('It was the mirror image — no rotation can turn one into the other.', 'كانت صورة مرآة — لا يمكن لأي دوران أن يحوّل أحدهما للآخر.') : T('It was the same shape, rotated.', 'كان نفس الشكل مُداراً.')}</p>`);
          ctx.feedback(ok); setTimeout(() => api.destroy(), 1200); done({ ok, part: ok ? 1 : 0 });
        };
        ctx.cleanup(() => api.destroy());
      });
    }
  });
  function render3d(TH, cv, r, ctx) {
    const low = db.settings.quality === 'low';
    const renderer = new TH.WebGLRenderer({ canvas: cv, antialias: !low, alpha: true, powerPreference: low ? 'low-power' : 'default' });
    renderer.setPixelRatio(low ? 1 : Math.min(2, devicePixelRatio || 1)); renderer.setSize(cv.clientWidth || 720, cv.clientHeight || 360, false);
    const scene = new TH.Scene(), cam = new TH.PerspectiveCamera(35, (cv.clientWidth || 720) / (cv.clientHeight || 360), 0.1, 100);
    cam.position.set(0, 4.5, 15); cam.lookAt(0, 0, 0);
    scene.add(new TH.HemisphereLight(0xffffff, 0x334155, 1.4)); const dl = new TH.DirectionalLight(0xffffff, 1.6); dl.position.set(4, 8, 6); scene.add(dl);
    const mat = new TH.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35, metalness: 0.15 }), mat2 = new TH.MeshStandardMaterial({ color: 0xa78bfa, roughness: 0.35, metalness: 0.15 });
    const edge = new TH.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.55 });
    const box = new TH.BoxGeometry(0.96, 0.96, 0.96), eg = new TH.EdgesGeometry(box);
    function build(cells, m, mirror) {
      const g = new TH.Group(); const c = [0, 1, 2].map(k => cells.reduce((s, p) => s + p[k], 0) / cells.length);
      cells.forEach(p => { const mesh = new TH.Mesh(box, m); mesh.position.set((mirror ? -1 : 1) * (p[0] - c[0]), p[1] - c[1], p[2] - c[2]); mesh.add(new TH.LineSegments(eg, edge)); g.add(mesh); });
      return g;
    }
    const A = build(r.shape, mat, false), B = build(r.shape, mat2, r.mirror);
    A.position.x = -3.3; B.position.x = 3.3; A.rotation.set(0.35, 0.6, 0);
    const axis = new TH.Vector3(...r.ax).normalize();
    const base = new TH.Quaternion().setFromEuler(new TH.Euler(0.35, 0.6, 0)), q = new TH.Quaternion().setFromAxisAngle(axis, r.ang);
    let extra = 0; const setB = () => { B.quaternion.copy(new TH.Quaternion().setFromAxisAngle(new TH.Vector3(0, 1, 0), extra).multiply(q).multiply(base)); };
    setB(); scene.add(A, B);
    let raf = 0, t0 = performance.now(), dead = false;
    const frame = now => {
      if (dead) return;
      const k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3);
      const s = still() || low ? 1 : 0.6 + 0.4 * e; A.scale.setScalar(s); B.scale.setScalar(s);
      if (!low && !still()) { A.position.y = Math.sin(now / 900) * 0.08; B.position.y = Math.sin(now / 900 + 1) * 0.08; }
      renderer.render(scene, cam);
      if (!low && !still() && !ctx.paused()) raf = requestAnimationFrame(frame); else if (k < 1 && !low && !still()) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return {
      turn(a) { extra = a; setB(); renderer.render(scene, cam); },
      destroy() { if (dead) return; dead = true; cancelAnimationFrame(raf); box.dispose(); eg.dispose(); mat.dispose(); mat2.dispose(); renderer.dispose(); }
    };
  }
  // without WebGL: the same judgement with flat shapes (a rotated letter-like figure and its mirror)
  function render2d(cv, r) {
    const g = cv.getContext('2d'), cells = r.shape.map(p => [p[0] + p[2] * 0.5, p[1] + p[2] * 0.35]);
    function fig(cx, cy, ang, mir, col) { g.save(); g.translate(cx, cy); g.rotate(ang); g.scale(mir ? -1 : 1, 1); cells.forEach(([x, y]) => { g.fillStyle = col; g.strokeStyle = '#0f172a'; g.fillRect(x * 34 - 50, -y * 34 + 30, 32, 32); g.strokeRect(x * 34 - 50, -y * 34 + 30, 32, 32); }); g.restore(); }
    let extra = 0;
    const draw = () => { g.clearRect(0, 0, cv.width, cv.height); fig(190, 180, 0.2, false, '#38bdf8'); fig(530, 180, 0.2 + r.ang + extra, r.mirror, '#a78bfa'); };
    draw();
    return { turn(a) { extra = a; draw(); }, destroy() {} };
  }

  /* 8 · Listen & Tap (listening) */
  GAMES.push({
    id: 'listen', cat: 'listening', mins: 4, title: ['Listen & Tap', 'استمع واضغط'], blurb: ['Follow spoken multi-step instructions. With sound off, they appear as text.', 'اتبع تعليمات من عدة خطوات. عند إيقاف الصوت تظهر نصاً.'],
    tips: [['Repeat the instruction quietly to yourself before you start.', 'كرّر التعليمات لنفسك بهدوء قبل البدء.'], ['Count the steps on your fingers: “one — orange star, two — green square”.', 'عدّ الخطوات على أصابعك.'], ['In lectures, jot the keywords of multi-part instructions as soon as you hear them.', 'دوّن الكلمات المفتاحية للتعليمات في المحاضرات.']],
    rounds(lv, n) {
      return Array.from({ length: n }, () => {
        const items = pickN(D.colours.flatMap(c => D.shapes.map(s => ({ c, s }))), 8);
        const steps = pickN(items, lv === 1 ? 1 : lv === 2 ? 2 : 3);
        return { items, steps };
      });
    },
    play(stage, r, ctx) {
      return new Promise(async done => {
        const say = 'Tap ' + r.steps.map((s, i) => (i === 0 ? 'the ' : i === r.steps.length - 1 ? ', and finally the ' : ', then the ') + s.c[0] + ' ' + s.s[0]).join('') + '.';
        const audio = db.settings.sound && window.speechSynthesis;
        const svg = s => s === 'circle' ? '<circle cx="20" cy="20" r="15"/>' : s === 'square' ? '<rect x="6" y="6" width="28" height="28" rx="3"/>' : s === 'triangle' ? '<path d="M20 4L36 34H4z"/>' : '<path d="M20 3l4.9 10.6 11.6 1.3-8.6 7.8 2.4 11.4L20 28.3 9.7 34.1l2.4-11.4-8.6-7.8 11.6-1.3z"/>';
        const grid = () => `<div class="gp-lgrid">${r.items.map((it, k) => `<button type="button" class="gp-lit" data-k="${k}" aria-label="${it.c[0]} ${it.s[0]}"><svg viewBox="0 0 40 40" style="fill:${it.c[1]}">${svg(it.s[0])}</svg></button>`).join('')}</div>`;
        if (audio) {
          stage.innerHTML = head(T('Listen…', 'استمع…'), T('You can replay it as often as you like.', 'يمكنك الإعادة كما تشاء.')) + `<div class="gp-row gp-row--c"><button type="button" class="gp-btn gp-btn--ghost" data-replay>🔊 ${T('Hear it again', 'اسمعها مجدداً')}</button></div>` + grid();
          speak(say);
        } else {
          stage.innerHTML = head(T('Read the instruction — it hides in a moment', 'اقرأ التعليمات — ستختفي بعد لحظة'), T('Sound is off, so this is shown as text. Turn sound on in Settings to practise listening.', 'الصوت متوقف لذا تظهر نصاً. شغّل الصوت من الإعدادات لتتدرب على الاستماع.')) + `<p class="gp-say">${esc(say)}</p>` + grid();
          await ctx.wait(1400 + say.length * 45); if (ctx.gone()) return;
          const p = stage.querySelector('.gp-say'); if (p) p.classList.add('is-hidden');
        }
        const got = [];
        stage.onclick = e => {
          if (e.target.closest('[data-replay]')) { speak(say); return; }
          const b = e.target.closest('[data-k]'); if (!b || b.disabled) return;
          const it = r.items[+b.dataset.k], want = r.steps[got.length];
          const ok = it === want; got.push(ok); b.disabled = true; b.classList.add(ok ? 'is-ok' : 'is-no'); tone(ok ? 620 : 240, 90);
          if (!ok || got.length === r.steps.length) {
            stage.onclick = null; const right = got.filter(Boolean).length;
            stage.insertAdjacentHTML('beforeend', `<p class="gp-explain">“${esc(say)}”</p>`);
            ctx.feedback(right === r.steps.length); done({ ok: right === r.steps.length, part: right / r.steps.length, audio: !!audio });
          }
        };
      });
    }
  });


  /* 9 · Read & Reason (reading comprehension) */
  GAMES.push({
    id: 'comprehend', cat: 'reading', mins: 5, title: ['Read & Reason', 'اقرأ واستنتج'], blurb: ['Read a short academic passage, then find the answer and the evidence for it.', 'اقرأ نصاً أكاديمياً قصيراً ثم جد الإجابة ودليلها.'],
    tips: [['Read the question first, then read the passage looking for that idea.', 'اقرأ السؤال أولاً ثم ابحث عن فكرته في النص.'], ['Main-idea questions: ask “what is every sentence building towards?”', 'أسئلة الفكرة الرئيسية: إلامَ تبني كل الجمل؟'], ['Point to the sentence that proves your answer — if you can’t, re-read.', 'أشر إلى الجملة التي تثبت إجابتك.']],
    rounds(lv, n) { const all = []; D.passages.forEach(P => P.qs.forEach(q => { if (lv === 1 ? q[4] <= 2 : lv === 2 ? true : q[4] >= 2) all.push({ P, q }); })); return pickN(all, Math.min(n, all.length)); },
    play(stage, r, ctx) {
      return new Promise(done => {
        const [q, opts, ans, why] = r.q;
        // the passages are English academic texts: keep them left-to-right even when the page is in Arabic
        stage.innerHTML = `<div dir="ltr" lang="en"><article class="gp-passage"><b>${esc(r.P.title)}</b><p>${esc(r.P.text)}</p></article>` + head(esc(q), '') +
          `<div class="gp-opts">${opts.map((o, i) => `<button type="button" class="gp-sent" data-o="${i}">${esc(o)}</button>`).join('')}</div></div>`;
        stage.onclick = e => {
          const b = e.target.closest('[data-o]'); if (!b) return; const ok = +b.dataset.o === ans;
          stage.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; if (+x.dataset.o === ans) x.classList.add('is-ok'); else if (x === b) x.classList.add('is-no'); });
          stage.insertAdjacentHTML('beforeend', `<p class="gp-explain" dir="ltr" lang="en">${esc(why)}</p>`); stage.onclick = null; tone(ok ? 660 : 300, 120);
          ctx.feedback(ok); done({ ok, part: ok ? 1 : 0 });
        };
      });
    }
  });

  /* 10 · Story Spark (writing & creative expression) — nothing written is stored or sent */
  GAMES.push({
    id: 'spark', cat: 'writing', mins: 6, title: ['Story Spark', 'شرارة القصة'], blurb: ['A picture prompt and three spark words — plan quickly, then write a mini-story. No marking.', 'فكرة مصوّرة وثلاث كلمات محفّزة — خطّط بسرعة ثم اكتب قصة قصيرة. بلا تقييم.'],
    tips: [['Plan in 60 seconds: who, where, what goes wrong, how it ends.', 'خطّط في دقيقة: من، أين، ما المشكلة، كيف تنتهي.'], ['Write first, fix later — drafting and editing are different jobs.', 'اكتب أولاً ثم صحّح لاحقاً.'], ['If starting is hard, say the first sentence aloud, then type it.', 'إن صعب البدء، قل الجملة الأولى بصوت ثم اكتبها.']],
    rounds(lv, n) { return pickN(D.stories, Math.min(3, n)); },
    play(stage, st, ctx) {
      return new Promise(done => {
        const [emoji, en, ar, words] = st, need = ctx.level === 1 ? 2 : ctx.level === 2 ? 3 : 5;
        stage.innerHTML = `<div class="gp-spark"><div class="gp-spark__pic" aria-hidden="true">${emoji}</div><div><b>${esc(T(en, ar))}</b><p class="gp-spark__words">${words.map(w => `<span>${esc(w)}</span>`).join('')}</p></div></div>
          <details class="gp-spark__plan"><summary>${T('Quick plan (optional)', 'خطة سريعة (اختيارية)')}</summary><div>${[['Who?', 'من؟'], ['Where?', 'أين؟'], ['What happens?', 'ماذا يحدث؟']].map(x => `<label>${T(x[0], x[1])}<input class="gp-input" maxlength="80"></label>`).join('')}</div></details>
          <label class="gp-spark__lbl" for="gpSpark">${T(`Write at least ${need} sentences. Try to use the spark words.`, `اكتب ${need} جمل على الأقل. حاول استخدام الكلمات المحفّزة.`)}</label>
          <textarea id="gpSpark" class="gp-input gp-spark__ta" rows="6" spellcheck="true"></textarea>
          <div class="gp-row"><span class="gp-total" data-count>0 ${T('sentences', 'جمل')}</span><button type="button" class="gp-btn" data-done disabled>${T('I’m done', 'انتهيت')}</button></div>
          <p class="gp-tip">${T('Your writing stays in this window only — it is not saved, scored or sent anywhere.', 'كتابتك تبقى في هذه النافذة فقط — لا تُحفظ ولا تُقيَّم ولا تُرسل.')}</p>`;
        const ta = stage.querySelector('textarea'), btn = stage.querySelector('[data-done]'), cnt = stage.querySelector('[data-count]');
        const count = () => (ta.value.match(/[^.!?؟]*[\p{L}\p{N}][^.!?؟]*[.!?؟]+/gu) || []).length + (/[\p{L}]{2,}[^.!?؟]*$/u.test(ta.value.trim()) && !/[.!?؟]\s*$/.test(ta.value.trim()) ? 1 : 0);
        ta.oninput = () => { const c = count(); cnt.textContent = `${c} ${T('sentences', 'جمل')}`; btn.disabled = c < 1; };
        btn.onclick = () => {
          const c = count(), used = words.filter(w => new RegExp('\\b' + w, 'i').test(ta.value)).length;
          stage.querySelectorAll('textarea,input,button').forEach(x => { x.disabled = true; });
          stage.insertAdjacentHTML('beforeend', `<p class="gp-explain">${T(`You wrote ${c} sentence${c === 1 ? '' : 's'} and used ${used} of 3 spark words. Every story counts — there’s no right answer here.`, `كتبت ${c} جمل واستخدمت ${used} من ٣ كلمات محفّزة. كل قصة تُحتسب — لا توجد إجابة صحيحة هنا.`)}</p>`);
          ctx.feedback(true); done({ ok: true, part: 1, sentences: c });
        };
        setTimeout(() => ta.focus(), 50);
      });
    }
  });

  /* 11 · Pattern Seeker (pattern recognition) */
  const SH = { circle: '●', square: '■', triangle: '▲', star: '★', diamond: '◆' };
  function makePattern(lv) {
    const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const kinds = lv === 1 ? ['add', 'shape2', 'mul'] : lv === 2 ? ['add', 'mul', 'shape3', 'alt', 'square'] : ['alt', 'square', 'fib', 'grow', 'shape3', 'mul'];
    const k = kinds[R(0, kinds.length - 1)];
    let seq, next, rule;
    if (k === 'add') { const a = R(1, 20), d = R(2, 9); seq = [0, 1, 2, 3, 4].map(i => a + d * i); next = a + d * 5; rule = [`Add ${d} each time.`, `أضف ${d} في كل مرة.`]; }
    else if (k === 'mul') { const a = R(1, 4), m = R(2, 3); seq = [0, 1, 2, 3].map(i => a * m ** i); next = a * m ** 4; rule = [`Multiply by ${m} each time.`, `اضرب في ${m} في كل مرة.`]; }
    else if (k === 'alt') { const a = R(2, 10), p = R(3, 7), q = R(1, 3); seq = [a]; for (let i = 1; i < 6; i++) seq.push(seq[i - 1] + (i % 2 ? p : -q)); next = seq[5] + p; rule = [`Alternately add ${p} and subtract ${q}.`, `أضف ${p} ثم اطرح ${q} بالتناوب.`]; }
    else if (k === 'square') { const o = R(1, 3); seq = [0, 1, 2, 3, 4].map(i => (i + o) ** 2); next = (5 + o) ** 2; rule = ['Square numbers: 1², 2², 3²… (the gaps grow by 2).', 'أعداد مربعة: الفروق تزيد بمقدار ٢.']; }
    else if (k === 'fib') { const a = R(1, 3), b = R(2, 5); seq = [a, b]; for (let i = 2; i < 6; i++) seq.push(seq[i - 1] + seq[i - 2]); next = seq[4] + seq[5]; rule = ['Each number is the sum of the two before it.', 'كل عدد هو مجموع العددين السابقين.']; }
    else if (k === 'grow') { const a = R(1, 5); seq = [a]; for (let i = 1; i < 5; i++) seq.push(seq[i - 1] + i); next = seq[4] + 5; rule = ['The gap grows by one each time: +1, +2, +3…', 'الفرق يزيد واحداً كل مرة: +١، +٢، +٣…']; }
    else { const keys = Object.keys(SH), n = k === 'shape2' ? 2 : 3, unit = pickN(keys, n), len = n === 2 ? 5 : 7; seq = Array.from({ length: len }, (_, i) => unit[i % n]); next = unit[len % n]; rule = [`A repeating unit of ${n} shapes.`, `وحدة متكررة من ${n} أشكال.`];
      const opts = shuffle([next].concat(pickN(keys.filter(x => x !== next), 3))); return { seq: seq.map(x => SH[x]), opts: opts.map(x => SH[x]), ans: SH[next], rule }; }
    const wrong = new Set(); const cand = [next + 1, next - 1, next + (seq[seq.length - 1] - seq[seq.length - 2]), next * 2, next + 2, next - 2, seq[seq.length - 1] * 2];
    for (const c of cand) if (c !== next && c > 0 && wrong.size < 3) wrong.add(c);
    return { seq, opts: shuffle([next, ...wrong]), ans: next, rule };
  }
  GAMES.push({
    id: 'pattern', cat: 'pattern', mins: 4, title: ['Pattern Seeker', 'باحث الأنماط'], blurb: ['Spot the rule in a sequence of numbers or shapes and pick what comes next.', 'اكتشف القاعدة في تسلسل أرقام أو أشكال واختر التالي.'],
    tips: [['Write the gaps between numbers underneath — the rule often hides there.', 'اكتب الفروق بين الأعداد تحتها — القاعدة غالباً هناك.'], ['If gaps aren’t constant, check whether they grow, alternate or multiply.', 'إن لم تكن الفروق ثابتة، تحقّق: هل تكبر أم تتناوب أم تتضاعف؟'], ['For shapes, find the smallest unit that repeats.', 'في الأشكال، جد أصغر وحدة تتكرر.']],
    rounds(lv, n) { return Array.from({ length: n }, () => makePattern(lv)); },
    play(stage, r, ctx) {
      return new Promise(done => {
        stage.innerHTML = head(T('What comes next?', 'ما التالي؟'), '') + `<div class="gp-pattern">${r.seq.map(x => `<span>${x}</span>`).join('')}<span class="is-q">?</span></div>
          <div class="gp-opts gp-opts--4">${r.opts.map(o => `<button type="button" class="gp-sent gp-sent--big" data-o="${o}">${o}</button>`).join('')}</div>`;
        stage.onclick = e => {
          const b = e.target.closest('[data-o]'); if (!b) return; const ok = String(b.dataset.o) === String(r.ans);
          stage.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; if (String(x.dataset.o) === String(r.ans)) x.classList.add('is-ok'); else if (x === b) x.classList.add('is-no'); });
          stage.querySelector('.is-q').textContent = r.ans; stage.insertAdjacentHTML('beforeend', `<p class="gp-explain">${L(r.rule)}</p>`); stage.onclick = null; tone(ok ? 660 : 300, 120);
          ctx.feedback(ok); done({ ok, part: ok ? 1 : 0 });
        };
      });
    }
  });

  /* 12 · Tower Shift (problem-solving: Tower of Hanoi) */
  GAMES.push({
    id: 'hanoi', cat: 'problem', mins: 6, title: ['Tower Shift', 'نقل البرج'], blurb: ['Move a tower of discs peg by peg — break a big problem into smaller ones.', 'انقل برجاً من الأقراص عموداً بعد عمود — قسّم المشكلة الكبيرة إلى أصغر.'],
    tips: [['Break it down: to move 4 discs, first move the top 3 out of the way.', 'قسّمها: لنقل ٤ أقراص انقل الثلاثة العليا جانباً أولاً.'], ['When stuck, ask “what must be true just before the goal?” and work backwards.', 'عند التعثر اسأل: ماذا يجب أن يتحقق قبل الهدف مباشرة؟'], ['The same move-the-subproblem idea works for essays and projects.', 'فكرة تقسيم المشكلة تصلح للمقالات والمشاريع.']],
    rounds(lv, n) { const d = lv === 1 ? [3, 3] : lv === 2 ? [3, 4] : [4, 5]; return Array.from({ length: Math.min(2, n) }, (_, i) => d[i]); },
    play(stage, discs, ctx) {
      return new Promise(done => {
        const pegs = [Array.from({ length: discs }, (_, i) => discs - i), [], []], best = 2 ** discs - 1;
        let held = null, moves = 0, msg = '';
        function draw(won) {
          stage.innerHTML = head(T(`Move all ${discs} discs to the right-hand peg`, `انقل الأقراص الـ${discs} إلى العمود الأيمن`), T(`Fewest possible: ${best} moves — but any number is fine.`, `أقل عدد ممكن: ${best} حركة — لكن أي عدد مقبول.`)) +
            `<div class="gp-hanoi" dir="ltr">${pegs.map((p, i) => `<button type="button" class="gp-peg ${held === i ? 'is-held' : ''}" data-peg="${i}" aria-label="${T('Peg', 'عمود')} ${i + 1}: ${p.length ? p.join(', ') : T('empty', 'فارغ')}" ${won ? 'disabled' : ''}><i class="gp-peg__rod"></i>${p.map((d, k) => `<span class="gp-disc ${held === i && k === p.length - 1 ? 'is-up' : ''}" style="--w:${30 + d * 12}%;--h:${d * 47}">${d}</span>`).join('')}</button>`).join('')}</div>
            <div class="gp-row"><span class="gp-total">${T('Moves', 'الحركات')}: ${moves}</span><span class="gp-tipline" aria-live="polite">${msg}</span></div>`;
        }
        draw();
        stage.onclick = e => {
          const b = e.target.closest('[data-peg]'); if (!b) return; const i = +b.dataset.peg;
          if (held == null) { if (pegs[i].length) { held = i; msg = ''; tone(520, 60); } }
          else if (held === i) held = null;
          else { const d = pegs[held][pegs[held].length - 1], top = pegs[i][pegs[i].length - 1];
            if (top && top < d) { msg = T('A bigger disc can’t go on a smaller one — try another peg.', 'لا يوضع قرص أكبر على أصغر — جرّب عموداً آخر.'); tone(260, 90); }
            else { pegs[i].push(pegs[held].pop()); moves++; msg = ''; tone(440 + i * 80, 70); }
            held = null; }
          if (pegs[2].length === discs) { draw(true); stage.onclick = null; stage.insertAdjacentHTML('beforeend', `<p class="gp-explain">${moves === best ? T('Solved in the fewest possible moves!', 'حُلّت بأقل عدد ممكن من الحركات!') : T(`Solved in ${moves} moves. The shortest route is ${best} — the trick is always moving the smaller tower out of the way first.`, `حُلّت في ${moves} حركة. أقصر طريق ${best} — السر نقل البرج الأصغر جانباً أولاً.`)}</p>`); ctx.feedback(true); return done({ ok: true, part: Math.min(1, best / moves), moves }); }
          draw();
        };
      });
    }
  });

  /* ---------------- hub UI ---------------- */
  const app = document.getElementById('gamesApp'); if (!app) return;
  const ART = {
    words: '<svg viewBox="0 0 120 80"><g class="ga-float"><rect x="8" y="26" width="30" height="26" rx="7"/><rect x="45" y="20" width="30" height="26" rx="7" class="ga-b"/><rect x="82" y="30" width="30" height="26" rx="7"/></g><text x="23" y="44">in</text><text x="60" y="38">vis</text><text x="97" y="48">ible</text></svg>',
    order: '<svg viewBox="0 0 120 80"><g class="ga-stack"><rect x="14" y="10" width="92" height="12" rx="6"/><rect x="14" y="30" width="72" height="12" rx="6" class="ga-b"/><rect x="14" y="50" width="84" height="12" rx="6"/></g></svg>',
    sequence: '<svg viewBox="0 0 120 80"><g class="ga-pads">' + Array.from({ length: 9 }, (_, i) => `<rect x="${32 + (i % 3) * 20}" y="${10 + Math.floor(i / 3) * 20}" width="16" height="16" rx="4" style="--d:${[0, 4, 2, 7, 1, 5, 8, 3, 6][i] * 0.25}s"/>`).join('') + '</g></svg>',
    chunk: '<svg viewBox="0 0 120 80"><text x="60" y="36" class="ga-mono">491 720</text><text x="60" y="60" class="ga-mono ga-b">38</text></svg>',
    plan: '<svg viewBox="0 0 120 80"><path d="M20 60 L45 40 L70 48 L100 18" class="ga-path"/><circle cx="20" cy="60" r="6"/><circle cx="45" cy="40" r="6"/><circle cx="70" cy="48" r="6" class="ga-b"/><circle cx="100" cy="18" r="6"/></svg>',
    switch: '<svg viewBox="0 0 120 80"><g class="ga-swap"><circle cx="40" cy="40" r="16" style="fill:#3b82f6"/><rect x="66" y="24" width="32" height="32" rx="4" style="fill:#f97316"/></g></svg>',
    rotate: '<svg viewBox="0 0 120 80"><g class="ga-spin"><path d="M60 14l22 12v26L60 64 38 52V26z" class="ga-b"/><path d="M60 14l22 12-22 12-22-12z"/><path d="M60 38v26" /></g></svg>',
    listen: '<svg viewBox="0 0 120 80"><path d="M30 32h10l14-12v40L40 48H30z"/><path d="M66 28c6 6 6 18 0 24M76 20c11 11 11 29 0 40" class="ga-wave"/></svg>',
    comprehend: '<svg viewBox="0 0 120 80"><path d="M20 18h36c4 0 4 4 4 4v44s0-4-4-4H20z" class="ga-b"/><path d="M100 18H64c-4 0-4 4-4 4v44s0-4 4-4h36z"/><g class="ga-stack"><rect x="68" y="28" width="24" height="4" rx="2" style="fill:#fff"/><rect x="68" y="38" width="20" height="4" rx="2" style="fill:#fff"/><rect x="68" y="48" width="24" height="4" rx="2" style="fill:#fff"/></g></svg>',
    spark: '<svg viewBox="0 0 120 80"><path d="M24 60l10-3 40-40-7-7-40 40z" class="ga-b"/><path d="M80 58c8-4 16-4 22 0" class="ga-path"/><g class="ga-float"><circle cx="86" cy="22" r="4"/><circle cx="98" cy="34" r="3"/><circle cx="78" cy="36" r="2.5"/></g></svg>',
    pattern: '<svg viewBox="0 0 120 80"><g class="ga-pads"><circle cx="18" cy="40" r="9" style="--d:0s"/><rect x="34" y="31" width="18" height="18" rx="3" style="--d:.4s"/><path d="M68 49l9-18 9 18z" style="--d:.8s"/><circle cx="102" cy="40" r="9" style="--d:1.2s"/></g></svg>',
    hanoi: '<svg viewBox="0 0 120 80"><rect x="10" y="66" width="100" height="5" rx="2"/><rect x="28" y="22" width="3" height="44"/><rect x="59" y="22" width="3" height="44"/><rect x="90" y="22" width="3" height="44"/><g class="ga-float"><rect x="14" y="56" width="32" height="9" rx="4" class="ga-b"/><rect x="18" y="46" width="24" height="9" rx="4"/><rect x="22" y="36" width="16" height="9" rx="4" class="ga-b"/></g></svg>'
  };
  const seg = (k, items) => `<div class="gm-seg" role="radiogroup" aria-label="${k}">${items.map(([v, en, ar]) => `<button type="button" role="radio" aria-checked="${String(db.settings[k]) === String(v)}" data-set="${k}:${v}">${T(en, ar)}</button>`).join('')}</div>`;
  function stats(id) { const s = db.sessions.filter(x => x.g === id); return { n: s.length, last: s[s.length - 1], acc: s.slice(-8).map(x => x.n ? x.ok / x.n : 0) }; }
  const spark = a => { if (a.length < 2) return ''; const w = 80, h = 22; return `<svg class="gm-spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${a.map((v, i) => `${(i / (a.length - 1)) * w},${h - 2 - v * (h - 4)}`).join(' ')}"/></svg>`; };
  const LVNAME = { gentle: ['Gentle', 'هادئ'], standard: ['Standard', 'عادي'], stretch: ['Stretch', 'تحدٍّ'] };
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? T('just now', 'الآن') : m < 60 ? T(`${m} min ago`, `قبل ${m} د`) : m < 1440 ? T(`${Math.round(m / 60)} h ago`, `قبل ${Math.round(m / 60)} س`) : T(`${Math.round(m / 1440)} d ago`, `قبل ${Math.round(m / 1440)} يوم`); };
  // achievements reward taking part only — never accuracy, speed or rank
  function badges() {
    const S = db.sessions, cats = new Set(S.map(x => (GAMES.find(g => g.id === x.g) || {}).cat).filter(Boolean)), days = new Set(S.map(x => new Date(x.at).toDateString())).size, mins = S.reduce((a, x) => a + (x.mins || 1), 0);
    return [
      ['first', '🌱', ['First step', 'الخطوة الأولى'], ['Played your first game', 'لعبت أول لعبة'], S.length >= 1],
      ['explorer', '🧭', ['Explorer', 'المستكشف'], ['Tried 3 different categories', 'جرّبت ٣ فئات مختلفة'], cats.size >= 3],
      ['curious', '🌈', ['Curious mind', 'عقل فضولي'], ['Tried every category', 'جرّبت كل الفئات'], cats.size >= Object.keys(CATS).length],
      ['steady', '🔁', ['Steady practice', 'تدريب منتظم'], ['Played on 3 different days', 'لعبت في ٣ أيام مختلفة'], days >= 3],
      ['ten', '⏱️', ['Twenty minutes', 'عشرون دقيقة'], ['20 minutes of practice in total', '٢٠ دقيقة تدريب إجمالاً'], mins >= 20],
      ['writer', '✍️', ['Storyteller', 'الراوي'], ['Finished a Story Spark', 'أنهيت شرارة القصة'], S.some(x => x.g === 'spark')],
      ['solver', '🧩', ['Tower builder', 'باني الأبراج'], ['Moved a whole tower in Tower Shift', 'نقلت برجاً كاملاً'], S.some(x => x.g === 'hanoi')]
    ];
  }
  function journey() {
    const recent = db.sessions.slice(-4).reverse(), B = badges(), got = B.filter(b => b[4]).length;
    return `<section class="gm-journey" aria-label="${T('Your activity', 'نشاطك')}">
      <div class="gm-recent"><b>${T('Recent activity', 'النشاط الأخير')}</b>${recent.length ? `<ul>${recent.map(x => { const g = GAMES.find(y => y.id === x.g); return g ? `<li style="--c:${CATS[g.cat][2]}"><i aria-hidden="true">${CATS[g.cat][3]}</i><span>${L(g.title)}<small>${x.n} ${T('rounds', 'جولات')} · ${ago(x.at)}</small></span><button type="button" class="gm-mini" data-play="${g.id}">${T('Again', 'مجدداً')}</button></li>` : ''; }).join('')}</ul>` : `<p>${T('Nothing yet — pick any game below. Your activity is kept only on this device.', 'لا شيء بعد — اختر أي لعبة أدناه. يُحفظ نشاطك على هذا الجهاز فقط.')}</p>`}</div>
      <div class="gm-badges"><b>${T('Achievements', 'الإنجازات')} <small>${got}/${B.length} · ${T('for taking part, not for scores', 'للمشاركة لا للنتائج')}</small></b><ul>${B.map(([id, ic, t, d, on]) => `<li class="${on ? 'is-on' : ''}" data-badge="${id}" title="${esc(L(d))}"><i aria-hidden="true">${ic}</i><span>${L(t)}<small>${L(d)}</small></span></li>`).join('')}</ul></div>
    </section>`;
  }
  function render() {
    const S = db.settings;
    const list = GAMES.filter(g => S.cat === 'all' || g.cat === S.cat);
    app.innerHTML = journey() + `
      <section class="gm-set" aria-label="${T('Game settings', 'إعدادات الألعاب')}">
        <div><b>${T('Difficulty', 'الصعوبة')}</b>${seg('level', [['gentle', 'Gentle', 'هادئ'], ['standard', 'Standard', 'عادي'], ['stretch', 'Stretch', 'تحدٍّ']])}</div>
        <div><b>${T('Length', 'المدة')}</b>${seg('length', [['short', '5 rounds', '٥ جولات'], ['medium', '8 rounds', '٨ جولات'], ['long', '12 rounds', '١٢ جولة']])}</div>
        <div><b>${T('Graphics', 'الرسوميات')}</b>${seg('quality', [['high', 'High quality', 'جودة عالية'], ['low', 'Low-performance', 'أداء منخفض']])}</div>
        <div><b>${T('Sound', 'الصوت')}</b>${seg('sound', [[false, 'Off', 'إيقاف'], [true, 'On', 'تشغيل']])}</div>
      </section>
      <div class="gm-cats" role="tablist" aria-label="${T('Categories', 'الفئات')}">${[['all', 'All', 'الكل']].concat(Object.keys(CATS).map(k => [k, CATS[k][0], CATS[k][1]])).map(([k, en, ar]) => `<button type="button" role="tab" aria-selected="${S.cat === k}" data-set="cat:${k}" style="--c:${CATS[k] ? CATS[k][2] : 'var(--accent)'}">${T(en, ar)}</button>`).join('')}<button type="button" class="gm-progbtn" data-prog>${T('My progress', 'تقدّمي')}</button></div>
      <div class="gm-grid">${list.map((g, i) => { const st = stats(g.id); return `<article class="gm-card" style="--c:${CATS[g.cat][2]};--i:${i}" data-g="${g.id}">
        <div class="gm-art" aria-hidden="true">${ART[g.id]}</div>
        <span class="gm-cat"><i aria-hidden="true">${CATS[g.cat][3]}</i> ${L(CATS[g.cat])}</span>
        <span class="gm-meta">~${g.mins} min · ${T('Difficulty', 'الصعوبة')}: ${L(LVNAME[db.settings.level] || LVNAME.standard)}</span>
        <h3>${L(g.title)}</h3><p>${L(g.blurb)}</p>
        <div class="gm-foot"><button type="button" class="gm-play" data-play="${g.id}">${T('Play', 'العب')} <span aria-hidden="true">→</span></button>${st.n ? `<small>${T('Played', 'لُعبت')} ${st.n}×</small>${spark(st.acc)}` : ''}</div>
      </article>`; }).join('')}</div>`;
  }
  app.addEventListener('click', e => {
    const s = e.target.closest('[data-set]');
    if (s) { const [k, v] = s.dataset.set.split(':'); set(k, v === 'true' ? true : v === 'false' ? false : v); render(); if (k === 'sound' && v === 'true') tone(660, 120); return; }
    const p = e.target.closest('[data-play]'); if (p) return play(GAMES.find(g => g.id === p.dataset.play));
    if (e.target.closest('[data-prog]')) return progress();
  });

  /* ---------------- player ---------------- */
  let live = null; // the round on screen (read by the end-to-end tests)
  function play(game) {
    live = null;
    const n = ROUNDS[db.settings.length] || 8, level = LV[db.settings.level] || 2;
    const rounds = game.rounds(level, n);
    const dlg = document.createElement('div');
    dlg.className = 'gm-player'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', L(game.title)); dlg.style.setProperty('--c', CATS[game.cat][2]);
    dlg.innerHTML = `<div class="gm-p__box">
      <header class="gm-p__h"><div><span>${L(CATS[game.cat])}</span><b>${L(game.title)}</b></div><div class="gm-p__tools"><span class="gm-p__round" aria-live="polite"></span><button type="button" data-c="pause">${T('Pause', 'إيقاف مؤقت')}</button><button type="button" data-c="skip">${T('Skip', 'تخطَّ')}</button><button type="button" data-c="again">${T('Restart', 'إعادة')}</button><button type="button" data-c="stop">${T('Stop', 'إنهاء')}</button></div></header>
      <div class="gm-p__bar"><i></i></div>
      <div class="gm-p__stage"></div>
      <div class="gm-p__fb" aria-live="assertive"></div>
      <div class="gm-p__pause" hidden><b>${T('Paused', 'متوقف مؤقتاً')}</b><p>${T('Take as long as you need. Nothing is timed while paused.', 'خذ وقتك. لا شيء يُحسب أثناء التوقف.')}</p><button type="button" class="gp-btn" data-c="resume">${T('Resume', 'استئناف')}</button></div>
    </div>`;
    document.body.appendChild(dlg); document.documentElement.classList.add('gm-open');
    requestAnimationFrame(() => dlg.classList.add('is-in'));
    const stage = dlg.querySelector('.gm-p__stage'), fb = dlg.querySelector('.gm-p__fb');
    let paused = false, dead = false, skipR = null, cleanups = [], idx = 0;
    const results = [], t0 = Date.now();
    const ctx = {
      level,
      paused: () => paused, gone: () => dead || !!skipR && skipR.used,
      wait: ms => new Promise(res => { let left = ms, last = performance.now(); const tick = () => { if (dead) return res(); const now = performance.now(); if (!paused) left -= now - last; last = now; if (left <= 0) res(); else setTimeout(tick, 30); }; tick(); }),
      feedback(ok) { fb.textContent = ok ? T('✓ Nice work', '✓ أحسنت') : T('Not this time — that’s how practice works', 'ليس هذه المرة — هكذا يكون التدريب'); fb.className = 'gm-p__fb is-' + (ok ? 'ok' : 'no'); },
      cleanup(f) { cleanups.push(f); }
    };
    function setPause(v) { paused = v; dlg.querySelector('.gm-p__pause').hidden = !v; dlg.classList.toggle('is-paused', v); dlg.querySelector('[data-c="pause"]').textContent = v ? T('Resume', 'استئناف') : T('Pause', 'إيقاف مؤقت'); if (v && window.speechSynthesis) speechSynthesis.cancel(); if (!v) dlg.querySelector('[data-c="pause"]').focus(); else dlg.querySelector('[data-c="resume"]').focus(); }
    dlg.addEventListener('click', e => {
      const c = e.target.closest('[data-c]'); if (!c) return;
      const k = c.dataset.c;
      if (k === 'pause') setPause(!paused);
      if (k === 'resume') setPause(false);
      if (k === 'skip' && skipR && !skipR.used) { skipR.used = true; skipR.res({ skipped: true }); }
      if (k === 'stop') finish(true);
      if (k === 'again') { close(); play(game); }
      if (k === 'close') close();
      if (k === 'other') { const pool = GAMES.filter(g => g.id !== game.id), tried = new Set(db.sessions.map(x => x.g)), fresh = pool.filter(g => !tried.has(g.id)); close(); play((fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh : pool).length)]); }
      if (k === 'helped') { c.classList.toggle('is-on'); const last = db.sessions[db.sessions.length - 1]; if (last) { last.helped = [...dlg.querySelectorAll('[data-c="helped"].is-on')].map(b => b.dataset.h); save(); } }
    });
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); if (dlg.querySelector('.gm-p__end')) close(); else setPause(!paused); } };
    addEventListener('keydown', onKey);
    function close() { dead = true; if (skipR && !skipR.used) { skipR.used = true; skipR.res({ skipped: true }); } cleanups.forEach(f => { try { f(); } catch (e) { /* already gone */ } }); removeEventListener('keydown', onKey); if (window.speechSynthesis) speechSynthesis.cancel(); dlg.classList.remove('is-in'); document.documentElement.classList.remove('gm-open'); setTimeout(() => dlg.remove(), still() ? 0 : 260); render(); const b = app.querySelector(`[data-play="${game.id}"]`); if (b) b.focus(); }
    async function loop() {
      await intro(); if (dead) return; cleanups = [];
      while (idx < rounds.length && !dead) {
        dlg.querySelector('.gm-p__round').textContent = `${T('Round', 'الجولة')} ${idx + 1} / ${rounds.length}`;
        dlg.querySelector('.gm-p__bar i').style.width = (idx / rounds.length * 100) + '%';
        fb.textContent = ''; fb.className = 'gm-p__fb'; stage.onclick = null; cleanups.forEach(f => { try { f(); } catch (e) { /* ok */ } }); cleanups = [];
        stage.classList.remove('is-in'); void stage.offsetWidth; stage.classList.add('is-in');
        const skip = new Promise(res => { skipR = { res, used: false }; });
        const started = performance.now(); live = { id: game.id, round: rounds[idx], idx };
        const r = await Promise.race([game.play(stage, rounds[idx], ctx), skip]);
        if (dead) return;
        results.push(Object.assign({ ms: Math.round(performance.now() - started) }, r));
        skipR.used = true;
        idx++;
        if (!r.skipped) await ctx.wait(still() ? 900 : 1300);
      }
      if (!dead) finish(false);
    }
    function intro() {
      return new Promise(res => {
        dlg.querySelector('.gm-p__round').textContent = T('How to play', 'طريقة اللعب');
        stage.innerHTML = `<div class="gm-intro"><div class="gm-intro__art" aria-hidden="true">${ART[game.id]}</div><h3>${L(game.title)}</h3><p>${L(game.blurb)}</p>
          <ol>${(HOW[game.id] || []).map(h => `<li>${L(h)}</li>`).join('')}</ol>
          <p class="gm-intro__meta">~${game.mins} min · ${rounds.length} ${T('rounds', 'جولات')} · ${L(LVNAME[db.settings.level] || LVNAME.standard)} · ${T('pause, skip or stop any time', 'أوقف أو تخطَّ أو أنهِ متى شئت')}</p>
          <div class="gp-row gp-row--c"><button type="button" class="gp-btn" data-start>${T('Start', 'ابدأ')} <span aria-hidden="true">→</span></button></div></div>`;
        const b = stage.querySelector('[data-start]'); b.onclick = () => res(); setTimeout(() => b.focus(), 60);
        ctx.cleanup(() => res());
      });
    }
    function finish(stopped) {
      if (dlg.querySelector('.gm-p__end')) return;
      const done = results.filter(r => !r.skipped), ok = done.filter(r => r.ok).length, part = done.reduce((s, r) => s + (r.part || 0), 0);
      if (done.length) { db.sessions.push({ g: game.id, at: Date.now(), n: done.length, ok, part: +(part / done.length).toFixed(3), skipped: results.length - done.length, level: db.settings.level, mins: Math.max(1, Math.round((Date.now() - t0) / 60000)), stopped }); if (db.sessions.length > 300) db.sessions.splice(0, db.sessions.length - 300); save(); ERLY.emit && ERLY.emit('games:session', { g: game.id }); }
      dead = true; cleanups.forEach(f => { try { f(); } catch (e) { /* ok */ } }); if (skipR && !skipR.used) { skipR.used = true; skipR.res({ skipped: true }); }
      dlg.querySelector('.gm-p__bar i').style.width = '100%'; setPause(false); dlg.querySelector('.gm-p__tools').innerHTML = '';
      const note = observation(game, results);
      stage.innerHTML = `<div class="gm-p__end">
        <div class="gm-burst" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 25.7}deg;--d:${(i % 4) * 0.05}s"></i>`).join('')}</div>
        <h3>${stopped ? T('Stopped — that’s completely fine', 'توقفت — لا بأس إطلاقاً') : T('Session complete', 'اكتملت الجلسة')}</h3>
        <div class="gm-end__stats"><div><b>${done.length}</b><span>${T('rounds played', 'جولات لُعبت')}</span></div><div><b>${ok}</b><span>${T('fully right', 'صحيحة تماماً')}</span></div><div><b>${results.length - done.length}</b><span>${T('skipped', 'تُخطّيت')}</span></div></div>
        ${note ? `<p class="gm-end__obs">${note}</p>` : ''}
        <div class="gm-end__tips"><b>${T('Strategies worth trying', 'استراتيجيات تستحق التجربة')}</b><ul>${game.tips.map(t => `<li>${L(t)}</li>`).join('')}</ul></div>
        <div class="gm-end__helped"><b>${T('What helped today? (optional, saved on this device)', 'ما الذي ساعدك اليوم؟ (اختياري، يُحفظ على هذا الجهاز)')}</b><div>${[['slow', 'Going slower', 'التمهّل'], ['aloud', 'Saying it aloud', 'القول بصوت'], ['chunk', 'Grouping / chunking', 'التجميع'], ['picture', 'Picturing it', 'التخيّل'], ['break', 'Taking a pause', 'أخذ استراحة']].map(([h, en, ar]) => `<button type="button" data-c="helped" data-h="${h}">${T(en, ar)}</button>`).join('')}</div></div>
        <p class="gm-end__note">${T('This was practice, not a test. Scores show how today’s rounds went — they are not a measure of ability and are never used to label anyone.', 'كان هذا تدريباً لا اختباراً. النتائج تعكس جولات اليوم فقط، وليست مقياساً للقدرة ولا تُستخدم لتصنيف أي شخص.')}</p>
        <div class="gp-row gp-row--c"><button type="button" class="gp-btn" data-c="again">${T('Play again', 'العب مجدداً')}</button><button type="button" class="gp-btn gp-btn--ghost" data-c="other">${T('Try another game', 'جرّب لعبة أخرى')}</button><button type="button" class="gp-btn gp-btn--ghost" data-c="close">${T('Back to games', 'العودة للألعاب')}</button></div></div>`;
      fb.textContent = '';
      dlg.querySelector('[data-c="again"]').focus();
    }
    loop();
  }
  // an encouraging, factual observation about THIS session — never a judgement about the person
  function observation(game, rs) {
    const d = rs.filter(r => !r.skipped); if (d.length < 4) return '';
    const half = Math.floor(d.length / 2), a = d.slice(0, half), b = d.slice(half);
    const acc = x => x.reduce((s, r) => s + (r.part || 0), 0) / x.length;
    if (game.id === 'chunk') { const c = d.filter(r => r.chunked), u = d.filter(r => !r.chunked); if (c.length && u.length && acc(c) - acc(u) > 0.12) return T('You recalled more when the digits were shown in chunks — a sign the chunking strategy works for you. Try chunking the ungrouped ones yourself.', 'تذكّرت أكثر عندما عُرضت الأرقام مجزأة — جرّب تجزئة غير المجمّعة بنفسك.'); }
    if (acc(b) - acc(a) > 0.15) return T('Your later rounds went better than your first ones — warming up helped.', 'جولاتك الأخيرة كانت أفضل من الأولى — التحمية ساعدت.');
    if (acc(a) - acc(b) > 0.2) return T('The later rounds were harder going. That’s common as rounds get longer — a short pause between sets can help.', 'الجولات الأخيرة كانت أصعب، وهذا شائع. استراحة قصيرة قد تساعد.');
    return '';
  }

  /* ---------------- progress (this device only) ---------------- */
  function progress() {
    const dlg = document.createElement('div');
    dlg.className = 'gm-player gm-prog'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', T('My progress', 'تقدّمي'));
    const total = db.sessions.length, mins = db.sessions.reduce((s, x) => s + (x.mins || 1), 0);
    dlg.innerHTML = `<div class="gm-p__box"><header class="gm-p__h"><div><span>${T('Stored only on this device', 'محفوظ على هذا الجهاز فقط')}</span><b>${T('My progress', 'تقدّمي')}</b></div><div class="gm-p__tools"><button type="button" data-c="close">${T('Close', 'إغلاق')}</button></div></header>
      <div class="gm-prog__top"><div><b>${total}</b><span>${T('sessions', 'جلسات')}</span></div><div><b>${mins}</b><span>${T('minutes of practice', 'دقائق تدريب')}</span></div><div><b>${new Set(db.sessions.map(s => s.g)).size}/${GAMES.length}</b><span>${T('games tried', 'ألعاب جُرّبت')}</span></div></div>
      <ul class="gm-prog__list">${GAMES.map(g => { const st = stats(g.id); return `<li style="--c:${CATS[g.cat][2]}"><b>${L(g.title)}</b><span>${st.n ? `${st.n}× · ${T('last', 'آخر مرة')}: ${st.last.ok}/${st.last.n}` : T('not played yet', 'لم تُلعب بعد')}</span>${spark(st.acc)}</li>`; }).join('')}</ul>
      <p class="gm-end__note">${T('These numbers describe practice sessions only. They are not scores of ability, and ERLY never turns them into labels or predictions.', 'هذه الأرقام تصف جلسات التدريب فقط، وليست درجات قدرة، ولا يحوّلها ERLY إلى تصنيفات أو تنبؤات.')}</p>
      <div class="gp-row gp-row--c"><button type="button" class="gp-btn gp-btn--ghost" data-c="clear">${T('Clear my game data', 'امسح بيانات ألعابي')}</button></div></div>`;
    document.body.appendChild(dlg); requestAnimationFrame(() => dlg.classList.add('is-in'));
    const close = () => { dlg.remove(); removeEventListener('keydown', k); render(); };
    const k = e => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', k);
    dlg.addEventListener('click', e => { const c = e.target.closest('[data-c]'); if (!c) return; if (c.dataset.c === 'close') close(); if (c.dataset.c === 'clear' && confirm(T('Delete all game results on this device?', 'حذف كل نتائج الألعاب على هذا الجهاز؟'))) { db.sessions = []; save(); close(); ERLY.toast && ERLY.toast(T('Game data cleared.', 'تم مسح بيانات الألعاب.')); } });
    dlg.querySelector('[data-c="close"]').focus();
  }

  if (window.I18N && I18N.onChange) I18N.onChange(render);
  render();
  // a deep link (?play=words) — used by the Growth Plan's daily activities
  const q = new URLSearchParams(location.search).get('play'); const g0 = q && GAMES.find(g => g.id === q); if (g0) play(g0);
  window.ERLY = window.ERLY || {};
  ERLY.games = { current: () => live, list: () => GAMES.map(g => ({ id: g.id, cat: g.cat, title: g.title })), sessions: () => db.sessions.slice(), play: id => play(GAMES.find(g => g.id === id)), _data: () => db };
})();
