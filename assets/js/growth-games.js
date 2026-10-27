/* ERLY — Growth Plan exercises. Each one mounts into a stage element and
   resolves with a score from 0 to 1. Nothing typed here is stored or sent:
   answers live in memory only for the length of the exercise. */
(function () {
  'use strict';
  const G = window.ERLY_GROWTH;
  const T = (en, ar) => I18N.t(en, ar);
  const P = p => T(p[0], p[1]);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function speak(text, lang, rate) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang === 'ar' ? 'ar-SA' : 'en-GB'; u.rate = rate || 0.9; speechSynthesis.speak(u); return true; } catch (e) { return false; }
  }
  const pop = el => { el.classList.remove('gg-pop'); void el.offsetWidth; el.classList.add('gg-pop'); };
  function feedback(stage, ok) { const f = document.createElement('span'); f.className = 'gg-fb ' + (ok ? 'is-ok' : 'is-no'); f.textContent = ok ? T('Nice!', 'أحسنت!') : T('Not quite', 'ليس تماماً'); stage.appendChild(f); setTimeout(() => f.remove(), 900); }
  const head = (title, sub, i, n) => `<div class="gg-head"><b>${title}</b><small>${sub}</small>${n ? `<span class="gg-dots">${Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'is-done' : k === i ? 'is-on' : ''}"></i>`).join('')}</span>` : ''}</div>`;

  const GAMES = {};

  /* ---- reading: clap the syllables ---- */
  GAMES.syllables = (stage, c) => new Promise(done => {
    const items = G.syllables(c.level, c.seed); let i = 0, right = 0;
    function show() {
      if (i >= items.length) return done(right / items.length);
      const it = items[i];
      stage.innerHTML = head(T('How many syllables?', 'كم مقطعاً؟'), T('Breaking long words into parts makes them easier to read and spell', 'تقسيم الكلمات الطويلة يسهّل قراءتها وكتابتها'), i, items.length) + `
        <div class="gg-center"><button class="gg-word" data-say>${esc(it.word)} <span>${ICON('volume')}</span></button>
        <div class="gg-claps" aria-hidden="true">${Array.from({ length: it.n }, (_, k) => `<i style="--k:${k}"></i>`).join('')}</div>
        <div class="gg-opts gg-opts--num">${[1, 2, 3, 4, 5, 6].map(n => `<button data-n="${n}">${n}</button>`).join('')}</div></div>`;
      speak(it.word, 'en', 0.8);
      stage.querySelector('[data-say]').onclick = () => speak(it.word, 'en', 0.7);
      stage.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
        const ok = +b.dataset.n === it.n; if (ok) right++;
        b.classList.add(ok ? 'is-ok' : 'is-no'); stage.querySelector(`[data-n="${it.n}"]`).classList.add('is-ok');
        stage.querySelector('.gg-claps').classList.add('is-on');
        feedback(stage, ok); i++; setTimeout(show, reduce ? 300 : 1200);
      });
    }
    show();
  });

  /* ---- reading: pacer reading + two questions ---- */
  GAMES.pacer = (stage, c) => new Promise(done => {
    const p = G.passage(c.lang, c.seed), words = p.text.split(' ');
    const wpm = [110, 140, 170][c.level - 1];
    stage.innerHTML = head(T('Read along with the highlight', 'اقرأ مع الإضاءة'), T(`Pace: ${wpm} words a minute — your eyes follow, no rushing`, `السرعة: ${wpm} كلمة في الدقيقة — عيناك تتبعان دون استعجال`)) + `
      <p class="gg-passage" ${c.lang === 'ar' ? 'dir="rtl"' : ''}>${words.map((w, k) => `<span data-k="${k}">${esc(w)}</span>`).join(' ')}</p>
      <div class="gg-row"><button class="btn btn--accent btn--sm" data-go>${T('Start the pacer', 'ابدأ الموجّه')}</button><label class="gg-chk"><input type="checkbox" data-voice> ${T('Read it aloud too', 'اقرأها بصوت أيضاً')}</label></div>`;
    stage.querySelector('[data-go]').onclick = async e => {
      e.target.disabled = true;
      if (stage.querySelector('[data-voice]').checked) speak(p.text, c.lang, wpm / 170);
      const spans = stage.querySelectorAll('.gg-passage span'), step = 60000 / wpm / (c.fast ? 20 : 1);
      for (let k = 0; k < spans.length; k++) { spans.forEach(s => s.classList.remove('is-on')); spans[k].classList.add('is-on', 'is-read'); await wait(step); }
      spans.forEach(s => s.classList.remove('is-on'));
      let right = 0, q = 0;
      const ask = () => {
        if (q >= p.qs.length) return done(right / p.qs.length);
        const Q = p.qs[q];
        stage.innerHTML = head(T('Quick check', 'تحقق سريع'), T('From what you just read', 'مما قرأته للتو'), q, p.qs.length) + `<div class="gg-center"><p class="gg-q">${esc(Q.q)}</p><div class="gg-opts">${Q.opts.map((o, k) => `<button data-o="${k}">${esc(o)}</button>`).join('')}</div></div>`;
        stage.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const ok = +b.dataset.o === Q.ok; if (ok) right++; b.classList.add(ok ? 'is-ok' : 'is-no'); feedback(stage, ok); q++; setTimeout(ask, 900); });
      };
      ask();
    };
  });

  /* ---- reading/writing: look, say, cover, write, check ---- */
  GAMES.spelling = (stage, c) => new Promise(done => {
    const words = G.spelling(c.level, c.seed); let i = 0, right = 0;
    function show() {
      if (i >= words.length) return done(right / words.length);
      const w = words[i];
      stage.innerHTML = head(T('Look · Say · Cover · Write · Check', 'انظر · قل · غطِّ · اكتب · تحقق'), T('Study the word, then write it from memory', 'تأمل الكلمة ثم اكتبها من الذاكرة'), i, words.length) + `
        <div class="gg-center"><div class="gg-look" data-look>${w.split('').map((ch, k) => `<span style="--k:${k}">${esc(ch)}</span>`).join('')}</div>
        <p class="small muted" data-hint>${T('Say it aloud, trace it in the air, notice the tricky part…', 'قلها بصوت، وارسمها في الهواء، ولاحظ الجزء الصعب…')}</p>
        <button class="btn btn--sm btn--accent" data-cover>${T('Cover it', 'غطّها')}</button></div>`;
      speak(w, 'en', 0.8);
      stage.querySelector('[data-cover]').onclick = () => {
        stage.querySelector('.gg-center').innerHTML = `<div class="gg-look gg-look--hid">${'•'.repeat(w.length)}</div><input class="gg-in" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${T('Write the word', 'اكتب الكلمة')}"><button class="btn btn--sm btn--accent" data-check>${T('Check', 'تحقق')}</button>`;
        const inp = stage.querySelector('.gg-in'); inp.focus();
        const check = () => {
          const v = inp.value.trim().toLowerCase(), ok = v === w;
          if (ok) right++;
          stage.querySelector('.gg-look').innerHTML = w.split('').map((ch, k) => `<span class="${v[k] === ch ? 'is-ok' : 'is-no'}" style="--k:${k}">${esc(ch)}</span>`).join('');
          stage.querySelector('.gg-look').classList.remove('gg-look--hid');
          feedback(stage, ok); i++; setTimeout(show, reduce ? 400 : 1500);
        };
        stage.querySelector('[data-check]').onclick = check;
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
      };
    }
    show();
  });

  /* ---- attention: n-back ---- */
  GAMES.nback = (stage, c) => new Promise(done => {
    const len = 16, nb = G.nback(c.level, len, c.seed), pressed = new Array(len).fill(false);
    stage.innerHTML = head(T(nb.n === 1 ? 'Same as the one before?' : 'Same as two before?', nb.n === 1 ? 'مثل الحرف السابق؟' : 'مثل الحرف قبل السابق؟'), T('Press Match (or the space bar) when the letter repeats', 'اضغط «تطابق» (أو المسافة) عند تكرار الحرف')) + `
      <div class="gg-center"><div class="gg-letter" data-l>·</div><div class="gg-bar"><i></i></div>
      <button class="btn btn--accent gg-match" data-m>${T('Match', 'تطابق')}</button><button class="btn btn--sm btn--ghost" data-start>${T('Start', 'ابدأ')}</button></div>`;
    let cur = -1;
    const press = () => { if (cur < 0 || pressed[cur]) return; pressed[cur] = true; const el = stage.querySelector('[data-l]'); el.classList.add(nb.targets[cur] ? 'is-ok' : 'is-no'); };
    stage.querySelector('[data-m]').onclick = press;
    const key = e => { if (e.code === 'Space' && stage.isConnected) { e.preventDefault(); press(); } };
    document.addEventListener('keydown', key);
    stage.querySelector('[data-start]').onclick = async e => {
      e.target.remove();
      const step = c.fast ? 60 : 1500;
      for (cur = 0; cur < len; cur++) {
        const el = stage.querySelector('[data-l]'); if (!el) return;
        el.className = 'gg-letter'; el.textContent = nb.seq[cur]; pop(el);
        stage.querySelector('.gg-bar i').style.width = ((cur + 1) / len * 100) + '%';
        await wait(step);
      }
      document.removeEventListener('keydown', key);
      done(G.nbackScore(nb.targets, pressed));
    };
  });

  /* ---- attention: focus sprint ---- */
  GAMES.sprint = (stage, c) => new Promise(done => {
    const secs = c.fast ? 2 : [90, 120, 180][c.level - 1];
    stage.innerHTML = head(T('Focus sprint', 'جولة تركيز'), T('Pick one small real task. Phone face-down, one tab open.', 'اختر مهمة حقيقية صغيرة. الهاتف مقلوب وتبويب واحد مفتوح.')) + `
      <div class="gg-center"><input class="gg-in" placeholder="${T('e.g. read the first page of chapter 3', 'مثلاً: اقرأ الصفحة الأولى من الفصل ٣')}" aria-label="${T('Your task', 'مهمتك')}">
      <div class="gg-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><circle cx="60" cy="60" r="52" class="gg-ring__fg"/></svg><b data-t>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</b></div>
      <div class="gg-row"><button class="btn btn--accent btn--sm" data-go>${T('Start the sprint', 'ابدأ الجولة')}</button><button class="btn btn--ghost btn--sm" data-end hidden>${T('I finished early', 'أنهيت مبكراً')}</button></div></div>`;
    let left = secs, iv;
    const C = 2 * Math.PI * 52, fg = stage.querySelector('.gg-ring__fg'); fg.style.strokeDasharray = C; fg.style.strokeDashoffset = 0;
    const end = () => {
      clearInterval(iv);
      stage.querySelector('.gg-center').innerHTML = `<p class="gg-q">${T('How focused were you?', 'ما مدى تركيزك؟')}</p><div class="gg-opts gg-opts--num">${[1, 2, 3, 4, 5].map(n => `<button data-f="${n}">${n}</button>`).join('')}</div><div class="gg-ends small muted"><span>${T('Drifted a lot', 'تشتت كثيراً')}</span><span>${T('Locked in', 'مركّز تماماً')}</span></div>`;
      stage.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { b.classList.add('is-ok'); setTimeout(() => done(+b.dataset.f / 5), 400); });
    };
    stage.querySelector('[data-go]').onclick = e => {
      e.target.hidden = true; stage.querySelector('[data-end]').hidden = false;
      iv = setInterval(() => { left--; stage.querySelector('[data-t]').textContent = Math.floor(left / 60) + ':' + String(Math.max(0, left) % 60).padStart(2, '0'); fg.style.strokeDashoffset = C * (1 - left / secs); if (left <= 0) end(); }, 1000);
    };
    stage.querySelector('[data-end]').onclick = end;
  });

  /* ---- attention: tiny first step ---- */
  GAMES.ramp = (stage, c) => new Promise(done => {
    stage.innerHTML = head(T('Make the first step tiny', 'صغّر الخطوة الأولى'), T('Big tasks feel heavy. Break one into three steps so small they feel silly.', 'المهام الكبيرة ثقيلة. قسّم واحدة إلى ثلاث خطوات صغيرة جداً.')) + `
      <div class="gg-center gg-ramp"><input class="gg-in" data-task placeholder="${T('The task you keep putting off', 'المهمة التي تؤجلها')}" aria-label="${T('Task', 'المهمة')}">
      ${[1, 2, 3].map(n => `<div class="gg-step" style="--k:${n}"><i>${n}</i><input class="gg-in" data-s placeholder="${[T('Open the file', 'افتح الملف'), T('Write the title', 'اكتب العنوان'), T('One sentence', 'جملة واحدة')][n - 1]}" aria-label="${T('Step', 'خطوة')} ${n}"></div>`).join('')}
      <button class="btn btn--accent btn--sm" data-go>${T('Commit to step 1', 'التزم بالخطوة ١')}</button></div>`;
    stage.querySelector('[data-go]').onclick = () => {
      const filled = [...stage.querySelectorAll('[data-s]')].filter(i => i.value.trim().split(/\s+/).length >= 1 && i.value.trim()).length;
      const first = stage.querySelector('[data-s]').value.trim() || T('Open the file', 'افتح الملف');
      stage.querySelector('.gg-ramp').innerHTML = `<p class="gg-q">${T('Step 1, right now:', 'الخطوة ١، الآن:')}</p><p class="gg-big">“${esc(first)}”</p><p class="small muted">${T('You don’t have to do step 2. Starting is the whole win.', 'لست مضطراً لفعل الخطوة ٢. البدء هو الفوز كله.')}</p><button class="btn btn--accent btn--sm" data-did>${T('Done it ✓', 'فعلتها ✓')}</button>`;
      stage.querySelector('[data-did]').onclick = () => done(Math.min(1, 0.4 + filled * 0.2));
    };
  });

  /* ---- maths: dot flash ---- */
  GAMES.dots = (stage, c) => new Promise(done => {
    const items = G.dots(c.level, c.seed); let i = 0, right = 0;
    async function show() {
      if (i >= items.length) return done(right / items.length);
      const it = items[i];
      stage.innerHTML = head(T('How many data points?', 'كم نقطة بيانات؟'), T('A scatter plot flashes — estimate, don’t count', 'يومض مخطط انتشار — قدّر ولا تعدّ'), i, items.length) + `<div class="gg-center"><div class="gg-dotbox">${it.pts.map(([x, y], k) => `<i style="left:${x * 100}%;top:${y * 100}%;--k:${k}"></i>`).join('')}</div><div class="gg-opts gg-opts--num" hidden>${it.opts.map(n => `<button data-n="${n}">${n}</button>`).join('')}</div></div>`;
      await wait(c.fast ? 10 : [1100, 850, 650][c.level - 1]);
      const box = stage.querySelector('.gg-dotbox'); if (!box) return;
      box.classList.add('is-hid'); stage.querySelector('.gg-opts').hidden = false;
      stage.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { const ok = +b.dataset.n === it.n; if (ok) right++; b.classList.add(ok ? 'is-ok' : 'is-no'); box.classList.remove('is-hid'); feedback(stage, ok); i++; setTimeout(show, reduce ? 300 : 1000); });
    }
    show();
  });

  /* ---- maths: number line ---- */
  GAMES.numberline = (stage, c) => new Promise(done => {
    const items = G.numberline(c.level, c.seed); let i = 0, total = 0;
    const fmt = (v, t) => t.frac ? (v === 0.25 ? '¼' : v === 0.5 ? '½' : v === 0.75 ? '¾' : v.toFixed(1)) : Math.round(v);
    function show() {
      if (i >= items.length) return done(total / items.length);
      const t = items[i];
      stage.innerHTML = head(T(`Where does ${fmt(t.target, t)} go?`, `أين يقع ${fmt(t.target, t)}؟`), T('Tap or drag on the line', 'انقر أو اسحب على الخط'), i, items.length) + `<div class="gg-center"><div class="gg-line" dir="ltr"><span>${fmt(t.min, t)}</span><div class="gg-line__bar"><i class="gg-line__mark" hidden></i><i class="gg-line__true" hidden></i></div><span>${fmt(t.max, t)}</span></div><button class="btn btn--sm btn--accent" data-ok disabled>${T('Place it', 'ثبّت')}</button></div>`;
      const bar = stage.querySelector('.gg-line__bar'), mark = stage.querySelector('.gg-line__mark');
      let v = null;
      const set = e => { const r = bar.getBoundingClientRect(); const f = Math.max(0, Math.min(1, ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width)); v = t.min + f * (t.max - t.min); mark.hidden = false; mark.style.left = f * 100 + '%'; stage.querySelector('[data-ok]').disabled = false; };
      bar.addEventListener('pointerdown', e => { set(e); bar.setPointerCapture(e.pointerId); bar.onpointermove = set; });
      bar.addEventListener('pointerup', () => { bar.onpointermove = null; });
      stage.querySelector('[data-ok]').onclick = () => {
        const s = G.lineScore(t, v); total += s;
        const tr = stage.querySelector('.gg-line__true'); tr.hidden = false; tr.style.left = ((t.target - t.min) / (t.max - t.min) * 100) + '%';
        feedback(stage, s > 0.7); i++; setTimeout(show, reduce ? 400 : 1300);
      };
    }
    show();
  });

  /* ---- writing: sentence builder ---- */
  GAMES.sentence = (stage, c) => new Promise(done => {
    const items = G.sentences(c.level, c.lang, c.seed); let i = 0, right = 0;
    function show() {
      if (i >= items.length) return done(right / items.length);
      const it = items[i], built = [];
      stage.innerHTML = head(T('Build the sentence', 'ابنِ الجملة'), T('Tap the words in order', 'انقر الكلمات بالترتيب'), i, items.length) + `<div class="gg-center" ${c.lang === 'ar' ? 'dir="rtl"' : ''}><div class="gg-built"></div><div class="gg-tiles">${it.mixed.map((w, k) => `<button data-k="${k}" style="--k:${k}">${esc(w)}</button>`).join('')}</div><button class="btn btn--xs btn--ghost" data-undo>${T('Undo', 'تراجع')}</button></div>`;
      const box = stage.querySelector('.gg-built');
      stage.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        b.disabled = true; built.push(+b.dataset.k); box.insertAdjacentHTML('beforeend', `<span class="gg-pop">${esc(it.mixed[+b.dataset.k])}</span>`);
        if (built.length === it.words.length) {
          const ok = built.map(k => it.mixed[k]).join(' ') === it.words.join(' ');
          if (ok) right++;
          box.classList.add(ok ? 'is-ok' : 'is-no');
          if (!ok) box.insertAdjacentHTML('afterend', `<p class="small muted">${esc(it.words.join(' '))}</p>`);
          feedback(stage, ok); i++; setTimeout(show, reduce ? 400 : 1500);
        }
      });
      stage.querySelector('[data-undo]').onclick = () => { const k = built.pop(); if (k == null) return; stage.querySelector(`[data-k="${k}"]`).disabled = false; box.lastElementChild && box.lastElementChild.remove(); };
    }
    show();
  });

  /* ---- writing: PEEL planner ---- */
  GAMES.peel = (stage, c) => new Promise(done => {
    const Qs = [B2('Should universities record every lecture?', 'هل يجب على الجامعات تسجيل كل المحاضرة؟'), B2('Is it better to study in short sessions?', 'هل الأفضل المذاكرة في جلسات قصيرة؟'), B2('Should phones be banned in libraries?', 'هل يجب منع الهواتف في المكتبات؟')];
    const q = Qs[(c.seed >>> 0) % Qs.length];
    const parts = [['P', T('Point — your answer in one sentence', 'الفكرة — إجابتك في جملة')], ['E', T('Evidence — a fact, example or quote', 'الدليل — حقيقة أو مثال أو اقتباس')], ['E', T('Explain — why the evidence supports your point', 'الشرح — لماذا يدعم الدليل فكرتك')], ['L', T('Link — back to the question', 'الربط — العودة إلى السؤال')]];
    stage.innerHTML = head(T('Plan a paragraph', 'خطط لفقرة'), P(q)) + `<div class="gg-peel">${parts.map(([k, l], n) => `<label style="--k:${n}"><b>${k}</b><span>${l}</span><textarea rows="2" data-p="${n}"></textarea></label>`).join('')}<p class="small muted">${T('Notes are not saved — copy them into your document if you want them.', 'لا تُحفظ الملاحظات — انسخها إلى مستندك إن أردت.')}</p><button class="btn btn--accent btn--sm" data-go>${T('My plan is ready', 'خطتي جاهزة')}</button></div>`;
    stage.querySelector('[data-go]').onclick = () => {
      const filled = [...stage.querySelectorAll('[data-p]')].filter(t => t.value.trim().split(/\s+/).filter(Boolean).length >= 3).length;
      if (filled < 2) return feedback(stage, false);
      done(filled / 4);
    };
  });
  function B2(en, ar) { return [en, ar]; }

  /* ---- listening: follow the instructions ---- */
  const SHAPE_SVG = { circle: '<circle cx="20" cy="20" r="14"/>', square: '<rect x="7" y="7" width="26" height="26" rx="3"/>', star: '<path d="M20 4l4.7 10 10.8 1.2-8 7.3 2.3 10.7L20 27.8 10.2 33.2l2.3-10.7-8-7.3L15.3 14z"/>', triangle: '<path d="M20 5l16 29H4z"/>' };
  GAMES.listen = (stage, c) => new Promise(done => {
    const rounds = G.instructions(c.level, c.seed); let i = 0, right = 0;
    function show() {
      if (i >= rounds.length) return done(right / rounds.length);
      const r = rounds[i], said = c.lang === 'ar' ? r.ar : r.en, taps = [];
      stage.innerHTML = head(T('Listen once, then tap in order', 'استمع مرة ثم انقر بالترتيب'), T('No replays — that’s the skill we’re building', 'دون إعادة — هذه هي المهارة التي نبنيها'), i, rounds.length) + `<div class="gg-center"><button class="btn btn--sm btn--ghost" data-hear>${ICON('volume')} ${T('Hear it', 'استمع')}</button><p class="gg-said" hidden ${c.lang === 'ar' ? 'dir="rtl"' : ''}>${esc(said)}</p><div class="gg-shapes">${r.grid.map((g, k) => `<button data-k="${k}" aria-label="${g.color} ${g.shape}" style="--c:${g.hex}"><svg viewBox="0 0 40 40">${SHAPE_SVG[g.shape]}</svg></button>`).join('')}</div></div>`;
      const hear = stage.querySelector('[data-hear]');
      hear.onclick = () => { hear.disabled = true; if (!speak(said, c.lang, 0.85) || c.showText) { const s = stage.querySelector('.gg-said'); s.hidden = false; setTimeout(() => { s.hidden = true; }, 3500); } };
      stage.querySelectorAll('.gg-shapes [data-k]').forEach(b => b.onclick = () => {
        taps.push(+b.dataset.k); b.classList.add('is-tap'); b.dataset.n = taps.length;
        if (taps.length === r.order.length) {
          const ok = taps.every((k, n) => k === r.order[n]); if (ok) right++;
          feedback(stage, ok); i++; setTimeout(show, reduce ? 400 : 1200);
        }
      });
    }
    show();
  });

  /* ---- wellbeing: box breathing ---- */
  GAMES.breathe = (stage, c) => new Promise(done => {
    const cycles = c.fast ? 1 : 3, phase = c.fast ? 50 : 4000;
    stage.innerHTML = head(T('Box breathing', 'التنفّس المربع'), T('In 4 · hold 4 · out 4 · hold 4. Follow the dot.', 'شهيق ٤ · احبس ٤ · زفير ٤ · احبس ٤. اتبع النقطة.')) + `<div class="gg-center"><div class="gg-box"><i class="gg-box__dot"></i><b data-w>${T('Ready', 'استعد')}</b></div><button class="btn btn--accent btn--sm" data-go>${T('Begin', 'ابدأ')}</button></div>`;
    stage.querySelector('[data-go]').onclick = async e => {
      e.target.remove();
      const box = stage.querySelector('.gg-box'), w = stage.querySelector('[data-w]');
      box.style.setProperty('--ph', phase + 'ms'); box.classList.add('is-on');
      const words = [T('Breathe in', 'شهيق'), T('Hold', 'احبس'), T('Breathe out', 'زفير'), T('Hold', 'احبس')];
      for (let k = 0; k < cycles * 4; k++) { if (!stage.isConnected) return; w.textContent = words[k % 4]; box.dataset.p = k % 4; await wait(phase); }
      w.textContent = T('Well done', 'أحسنت'); box.classList.remove('is-on');
      await wait(c.fast ? 10 : 700); done(1);
    };
  });

  /* ---- wellbeing: reframe ---- */
  GAMES.reframe = (stage, c) => new Promise(done => {
    const items = G.reframes(c.seed); let i = 0, right = 0;
    function show() {
      if (i >= items.length) return done(right / items.length);
      const it = items[i];
      stage.innerHTML = head(T('Reframe it', 'أعد صياغتها'), T('Which thought is balanced — true, and kinder?', 'أي فكرة متوازنة — صادقة وألطف؟'), i, items.length) + `<div class="gg-center"><p class="gg-thought">“${esc(P(it.thought))}”</p><div class="gg-opts gg-opts--col">${it.opts.map((o, k) => `<button data-o="${k}">${esc(P(o))}</button>`).join('')}</div></div>`;
      stage.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const ok = +b.dataset.o === it.ok; if (ok) right++; b.classList.add(ok ? 'is-ok' : 'is-no'); stage.querySelector(`[data-o="${it.ok}"]`).classList.add('is-ok'); feedback(stage, ok); i++; setTimeout(show, reduce ? 400 : 1400); });
    }
    show();
  });

  window.ERLY_GROWTH_GAMES = GAMES;
})();
