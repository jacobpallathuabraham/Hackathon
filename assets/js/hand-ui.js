/* ERLY — the handwriting check, step by step.
   intro (consent) → dictation → photo → scan → spelling self-check → result.
   The photo is analysed in this browser tab and never uploaded or saved;
   only the summary (levels per feature) is kept, if the student chooses. */
(function () {
  'use strict';
  const HW = window.ERLY_HAND;
  if (!HW || !window.ERLY) return;
  const $ = (s, r = document) => r.querySelector(s);
  const T = (en, ar) => I18N.t(en, ar);
  const P = (pair) => T(pair[0], pair[1]);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'erly-hand-v1';
  const STEPS = ['intro', 'dictate', 'photo', 'scan', 'spell', 'result'];

  let st = null, root = null;
  function fresh() { return { step: 'intro', lang: I18N.lang === 'ar' ? 'ar' : 'en', i: 0, img: null, res: null, missed: new Set(), plays: 0, source: null }; }

  function mount() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'hw'; root.id = 'hw'; root.hidden = true;
    root.innerHTML = `<div class="hw__scrim" data-hw-close></div>
      <section class="hw__panel" role="dialog" aria-modal="true" aria-labelledby="hwTitle">
        <header class="hw__head"><span class="hw__ic">${ICON('pen')}</span><div><b id="hwTitle">${T('Handwriting check', 'فحص الكتابة اليدوية')}</b><small>${T('Another way of looking — supporting evidence, never a diagnosis', 'طريقة أخرى للنظر — دليل مساند لا تشخيص')}</small></div>
          <button class="icon-btn hw__x" data-hw-close aria-label="${T('Close', 'إغلاق')}">${ICON('x')}</button></header>
        <ol class="hw__steps" aria-hidden="true">${STEPS.map((s, i) => `<li data-s="${s}"><i>${i + 1}</i></li>`).join('')}</ol>
        <div class="hw__body" id="hwBody" aria-live="polite"></div>
      </section>`;
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('dragover', e => { const z = e.target.closest('.hw-drop'); if (z) { e.preventDefault(); z.classList.add('is-over'); } });
    root.addEventListener('dragleave', e => { const z = e.target.closest('.hw-drop'); if (z) z.classList.remove('is-over'); });
    root.addEventListener('drop', e => { const z = e.target.closest('.hw-drop'); if (!z) return; e.preventDefault(); z.classList.remove('is-over'); const f = e.dataTransfer.files[0]; if (f) loadFile(f); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) close(); });
  }
  function open() { mount(); st = fresh(); root.hidden = false; requestAnimationFrame(() => root.classList.add('is-on')); document.body.classList.add('hw-lock'); render(); setTimeout(() => { const f = root.querySelector('.hw__panel button, .hw__panel input'); f && f.focus(); }, 300); }
  function close() { if (!root) return; root.classList.remove('is-on'); document.body.classList.remove('hw-lock'); try { speechSynthesis.cancel(); } catch (e) { /* none */ } setTimeout(() => { root.hidden = true; st = null; }, reduce ? 0 : 320); }
  ERLY.on('hand:open', open);
  ERLY.handwriting = { open, close };

  const sentences = () => HW.DICTATION[st.lang];
  function go(step) { st.step = step; render(); }
  function render() {
    const body = $('#hwBody', root);
    root.querySelectorAll('.hw__steps li').forEach((li, i) => { const k = STEPS.indexOf(st.step); li.classList.toggle('is-done', i < k); li.classList.toggle('is-on', i === k); });
    body.innerHTML = VIEWS[st.step]();
    body.firstElementChild && body.firstElementChild.classList.add('hw-in');
    if (st.step === 'scan') runScan();
    if (st.step === 'result') drawResult();
  }

  /* ---------- views ---------- */
  const VIEWS = {
    intro: () => `<div class="hw-v">
      <h3>${T('Write three short sentences, take a photo, and see what stands out.', 'اكتب ثلاث جمل قصيرة، والتقط صورة، وشاهد ما يبرز.')}</h3>
      <p>${T('Specialists sometimes look at handwriting and spelling alongside reading. I’ll read three sentences aloud; you write them on paper in your usual handwriting. Then I measure letter size, the baseline, spacing, slant, line direction, margins and crossings-out.', 'ينظر المختصون أحياناً إلى الكتابة اليدوية والإملاء إلى جانب القراءة. سأقرأ ثلاث جمل بصوت عالٍ، وتكتبها على ورقة بخطك المعتاد. ثم أقيس حجم الحروف والسطر والتباعد والميل واتجاه الأسطر والهوامش والشطب.')}</p>
      <ul class="hw-priv">
        <li>${ICON('lock')} ${T('Your photo is analysed inside this browser tab. It is never uploaded, never saved, and gone when you close this.', 'تُحلَّل صورتك داخل هذه النافذة. لا تُرفع ولا تُحفظ أبداً، وتختفي عند الإغلاق.')}</li>
        <li>${ICON('shield')} ${T('Only the summary (a level for each feature) is kept — and only if you press Save.', 'يُحفظ الملخص فقط (مستوى لكل سمة) — وفقط إن ضغطت حفظ.')}</li>
        <li>${ICON('info')} ${T('Handwriting can’t identify dyslexia or dysgraphia on its own. It adds a little to the bigger picture.', 'لا تستطيع الكتابة وحدها تحديد عسر القراءة أو الكتابة. إنها تضيف القليل إلى الصورة الأكبر.')}</li>
      </ul>
      <div class="hw-row"><span class="small muted">${T('Dictation language', 'لغة الإملاء')}</span><div class="hw-seg"><button data-lang="en" class="${st.lang === 'en' ? 'is-on' : ''}">English</button><button data-lang="ar" class="${st.lang === 'ar' ? 'is-on' : ''}">العربية</button></div></div>
      <label class="check-row"><input type="checkbox" id="hwOk"><span>${T('I understand, and I want to try the handwriting check.', 'أفهم ذلك، وأريد تجربة فحص الكتابة.')}</span></label>
      <div class="hw-btns"><button class="btn btn--accent" data-go="dictate" id="hwStart" disabled>${T('Start the dictation', 'ابدأ الإملاء')} →</button><button class="btn btn--ghost" data-go="photo" id="hwSkip" disabled>${T('I already have a sample', 'لدي عينة بالفعل')}</button></div>
    </div>`,
    dictate: () => { const d = sentences()[st.i]; return `<div class="hw-v hw-dict">
      <p class="mono small muted">${T('Sentence', 'الجملة')} ${st.i + 1} / ${sentences().length} · ${T('write on paper, in your normal handwriting', 'اكتب على الورق بخطك المعتاد')}</p>
      <button class="hw-play" data-hw-play aria-label="${T('Play the sentence', 'شغّل الجملة')}"><span class="hw-play__ring"></span>${ICON('volume')}<b>${st.plays ? T('Play again', 'شغّل مجدداً') : T('Play', 'شغّل')}</b></button>
      <div class="hw-wave ${st.speaking ? 'is-on' : ''}" aria-hidden="true">${Array.from({ length: 24 }, (_, k) => `<i style="--k:${k}"></i>`).join('')}</div>
      <div class="hw-btns hw-btns--c"><button class="btn btn--sm btn--ghost" data-hw-play="slow">${T('Slower', 'أبطأ')}</button><button class="btn btn--sm btn--ghost" data-peek>${T('No sound? Show it for 4 s', 'لا صوت؟ اعرضها ٤ ثوانٍ')}</button></div>
      <p class="hw-peek" id="hwPeek" ${st.lang === 'ar' ? 'dir="rtl"' : ''} hidden>${esc(d.text)}</p>
      <div class="hw-btns"><button class="btn btn--accent" data-next>${st.i + 1 < sentences().length ? T('I wrote it — next sentence', 'كتبتها — الجملة التالية') : T('Done — take a photo', 'انتهيت — التقط صورة')} →</button></div>
    </div>`; },
    photo: () => `<div class="hw-v">
      <h3>${T('Take a photo of your sentences', 'التقط صورة لجملك')}</h3>
      <label class="hw-drop" tabindex="0"><input type="file" accept="image/*" capture="environment" id="hwFile" hidden>
        <span class="hw-drop__ic">${ICON('camera')}</span><b>${T('Take a photo or choose an image', 'التقط صورة أو اختر صورة')}</b><small>${T('or drag it here', 'أو اسحبها هنا')}</small></label>
      <ul class="hw-tips small"><li>${T('Paper flat, in good light, no shadow from your phone', 'الورقة مسطحة، في إضاءة جيدة، دون ظل من هاتفك')}</li><li>${T('Fill the frame with the writing; straight on, not at an angle', 'املأ الإطار بالكتابة؛ من الأمام لا بزاوية')}</li><li>${T('Dark pen on white or lined paper works best', 'قلم داكن على ورق أبيض أو مسطر هو الأفضل')}</li></ul>
      <div class="hw-sample"><span class="small muted">${T('No paper handy? Try a built-in sample:', 'لا ورق قريب؟ جرّب عينة مدمجة:')}</span><button class="btn btn--xs btn--ghost" data-sample="neat">${T('Even handwriting', 'كتابة منتظمة')}</button><button class="btn btn--xs btn--ghost" data-sample="irregular">${T('Uneven handwriting', 'كتابة غير منتظمة')}</button></div>
      ${st.err ? `<p class="hw-err">${ICON('alert')} ${esc(st.err)}</p>` : ''}
    </div>`,
    scan: () => `<div class="hw-v hw-scan"><div class="hw-stage"><canvas id="hwCanvas"></canvas><span class="hw-beam"></span></div><p class="hw-scan__t mono"><span id="hwScanT">${T('Evening out the lighting…', 'موازنة الإضاءة…')}</span></p></div>`,
    spell: () => `<div class="hw-v">
      <h3>${T('Now check your spelling against the sentences', 'الآن قارن إملاءك بالجمل')}</h3>
      <p>${T('Tap any underlined word you spelled differently on your paper. Be honest — nobody else sees this.', 'انقر على أي كلمة مسطرة كتبتها بشكل مختلف على ورقتك. كن صادقاً — لا أحد غيرك يرى هذا.')}</p>
      <div class="hw-sents" ${st.lang === 'ar' ? 'dir="rtl"' : ''}>${sentences().map((d, si) => `<p>${d.text.split(/(\s+)/).map(w => { const bare = w.replace(/[.,،]/g, ''); return d.tricky.includes(bare) ? `<button class="hw-w ${st.missed.has(si + ':' + bare) ? 'is-miss' : ''}" data-w="${si}:${esc(bare)}">${esc(w)}</button>` : esc(w); }).join('')}</p>`).join('')}</div>
      <p class="small muted mono" id="hwMissN">${st.missed.size} ${T('marked', 'محددة')}</p>
      <div class="hw-btns"><button class="btn btn--accent" data-go="result">${T('See my result', 'اعرض نتيجتي')} →</button>${st.source === 'sample' ? `<button class="btn btn--ghost" data-go="result" data-nospell>${T('Skip (sample)', 'تخطٍّ (عينة)')}</button>` : ''}</div>
    </div>`,
    result: () => {
      const r = st.res, S = st.summary;
      const lv = { few: 1, some: 2, several: 3, unclear: 0 }[S.level];
      return `<div class="hw-v hw-res">
        <div class="hw-res__top">
          <div class="hw-gauge hw-gauge--${S.level}" aria-label="${esc(P(S.head))}">${[1, 2, 3].map(k => `<i class="${k <= lv ? 'is-on' : ''}" style="--k:${k}"></i>`).join('')}<span>${S.level === 'several' ? T('Several features', 'عدة سمات') : S.level === 'some' ? T('Some features', 'بعض السمات') : S.level === 'few' ? T('Few features', 'سمات قليلة') : T('Unclear', 'غير واضح')}</span></div>
          <div><b class="hw-res__h">${esc(P(S.head))}</b>${S.spl ? `<p>${esc(P(S.spl))}</p>` : ''}</div>
        </div>
        ${r && r.ok ? `<div class="hw-stage hw-stage--res"><canvas id="hwCanvas"></canvas></div><p class="small muted hw-legend"><i class="hw-k hw-k--base"></i>${T('baseline of each line', 'خط قاعدة كل سطر')}<i class="hw-k hw-k--flag"></i>${T('marks that stood out', 'علامات بارزة')}</p>` : ''}
        ${r && r.ok ? `<div class="hw-mets">${r.metrics.map((m, k) => `<div class="hw-met hw-met--${m.band}" style="--i:${k}"><b>${esc(P(m.name))}</b><span class="hw-met__b">${m.band === 'typical' ? T('typical', 'معتاد') : m.band === 'mixed' ? T('a little uneven', 'غير منتظم قليلاً') : m.band === 'notable' ? T('stood out', 'بارز') : T('not measured', 'لم يُقس')}</span><small>${esc(P(m.tip))}</small></div>`).join('')}${S.spelling ? `<div class="hw-met hw-met--${S.spelling}" style="--i:${r.metrics.length}"><b>${T('Spelling (dictation)', 'الإملاء')}</b><span class="hw-met__b">${st.missed.size} / ${sentences().reduce((a, d) => a + d.tricky.length, 0)} ${T('words differed', 'كلمات مختلفة')}</span><small>${T('Self-marked against the sentences', 'بتقييمك الذاتي مقابل الجمل')}</small></div>` : ''}</div>` : ''}
        <p class="hw-note">${ICON('info')} ${esc(P(S.note))}</p>
        <div class="hw-btns"><button class="btn btn--accent" data-save>${ICON('check')} ${T('Save the summary to my profile', 'احفظ الملخص في ملفي')}</button><button class="btn btn--ghost" data-hw-close>${T('Discard', 'تجاهل')}</button><button class="btn btn--ghost" data-go="photo">${T('Try another photo', 'جرّب صورة أخرى')}</button></div>
        <p class="small muted">${T('Reference bands are demo calibrations, not clinical norms. The photo has already been discarded.', 'نطاقات المقارنة معايرة تجريبية وليست معايير سريرية. وقد تم التخلص من الصورة بالفعل.')}</p>
      </div>`;
    }
  };

  /* ---------- actions ---------- */
  function speak(slow) {
    const d = sentences()[st.i];
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(d.text);
      u.lang = st.lang === 'ar' ? 'ar-SA' : 'en-GB'; u.rate = slow ? 0.62 : 0.85;
      const V = ERLY.companion && ERLY.companion._ui && ERLY.companion._ui.voice; const v = V && V.voiceFor ? V.voiceFor(st.lang) : null; if (v) u.voice = v;
      u.onstart = () => { st.speaking = true; const w = $('.hw-wave', root); w && w.classList.add('is-on'); };
      u.onend = u.onerror = () => { if (!st) return; st.speaking = false; const w = $('.hw-wave', root); w && w.classList.remove('is-on'); };
      speechSynthesis.speak(u);
      st.plays++;
      const b = $('[data-hw-play] b', root); if (b) b.textContent = T('Play again', 'شغّل مجدداً');
    } catch (e) { peek(); }
  }
  function peek() { const p = $('#hwPeek', root); if (!p) return; p.hidden = false; clearTimeout(peek.t); peek.t = setTimeout(() => { p.hidden = true; }, 4000); }

  function onChange(e) {
    if (e.target.id === 'hwOk') { $('#hwStart', root).disabled = !e.target.checked; $('#hwSkip', root).disabled = !e.target.checked; }
    if (e.target.id === 'hwFile' && e.target.files[0]) loadFile(e.target.files[0]);
  }
  function onClick(e) {
    if (e.target.closest('[data-hw-close]')) return close();
    const lg = e.target.closest('[data-lang]'); if (lg) { st.lang = lg.dataset.lang; root.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('is-on', b === lg)); return; }
    const g = e.target.closest('[data-go]'); if (g) { if (g.hasAttribute('data-nospell')) st.nospell = true; if (g.dataset.go === 'result') finish(); if (g.dataset.go === 'photo') { st.err = null; } return go(g.dataset.go); }
    const pl = e.target.closest("[data-hw-play]"); if (pl) return speak(pl.dataset.hwPlay === "slow");
    if (e.target.closest('[data-peek]')) return peek();
    if (e.target.closest('[data-next]')) { try { speechSynthesis.cancel(); } catch (err) { /* none */ } if (st.i + 1 < sentences().length) { st.i++; st.plays = 0; return render(); } return go('photo'); }
    const sm = e.target.closest('[data-sample]'); if (sm) { st.source = 'sample'; st.img = HW.sample(sm.dataset.sample, 3 + Math.floor(Math.random() * 20)); return go('scan'); }
    const w = e.target.closest('[data-w]'); if (w) { const k = w.dataset.w; st.missed.has(k) ? st.missed.delete(k) : st.missed.add(k); w.classList.toggle('is-miss'); $('#hwMissN', root).textContent = st.missed.size + ' ' + T('marked', 'محددة'); return; }
    if (e.target.closest('[data-save]')) return save();
  }

  // photo → grayscale, downscaled; the file never leaves the tab
  function loadFile(file) {
    if (!/^image\//.test(file.type)) { st.err = T('That doesn’t look like an image.', 'لا يبدو هذا صورة.'); return render(); }
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const max = 1400, k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const W = Math.round(im.naturalWidth * k), H = Math.round(im.naturalHeight * k);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, W, H);
      URL.revokeObjectURL(url);
      const d = g.getImageData(0, 0, W, H).data, gray = new Uint8Array(W * H);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) gray[p] = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      st.img = { gray, width: W, height: H }; st.source = 'photo';
      go('scan');
    };
    im.onerror = () => { URL.revokeObjectURL(url); st.err = T('That image couldn’t be opened. Try a JPG or PNG.', 'تعذر فتح الصورة. جرّب JPG أو PNG.'); render(); };
    im.src = url;
  }
  function paint(canvas, img) {
    const { gray, width: W, height: H } = img;
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d'), id = g.createImageData(W, H);
    for (let p = 0, i = 0; p < gray.length; p++, i += 4) { const v = gray[p]; id.data[i] = v; id.data[i + 1] = v * 0.985; id.data[i + 2] = v * 0.94; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0);
    return g;
  }
  function runScan() {
    const cv = $('#hwCanvas', root);
    paint(cv, st.img);
    const msgs = [T('Evening out the lighting…', 'موازنة الإضاءة…'), T('Finding lines of writing…', 'العثور على أسطر الكتابة…'), T('Measuring letters, spacing and slant…', 'قياس الحروف والتباعد والميل…')];
    let k = 0; const tick = setInterval(() => { const t = $('#hwScanT', root); if (!t) return clearInterval(tick); k = Math.min(msgs.length - 1, k + 1); t.textContent = msgs[k]; }, 650);
    setTimeout(() => {
      clearInterval(tick);
      if (!st) return;
      st.res = HW.analyse(st.img, { normalize: true });
      if (!st.res.ok) {
        const why = st.res.quality.issues[0];
        st.err = ({ empty: T('I couldn’t find any writing. Try a closer photo with darker ink.', 'لم أجد كتابة. جرّب صورة أقرب بحبر أغمق.'), dark: T('The photo is too dark or shadowed. Try brighter light, without the phone’s shadow.', 'الصورة داكنة جداً أو مظللة. جرّب إضاءة أقوى دون ظل الهاتف.'), contrast: T('The writing is too faint. Try a darker pen or better light.', 'الكتابة باهتة جداً. جرّب قلماً أغمق أو إضاءة أفضل.'), short: T('I need at least two lines of writing to measure anything — all three sentences is best.', 'أحتاج سطرين على الأقل لأقيس شيئاً — والجمل الثلاث أفضل.') })[why] || T('That photo couldn’t be measured.', 'تعذر قياس الصورة.');
        st.img = null;
        return go('photo');
      }
      go('spell');
    }, reduce ? 50 : 2100);
  }
  function finish() {
    const total = sentences().reduce((a, d) => a + d.tricky.length, 0);
    st.summary = HW.summary(st.res, st.nospell ? null : { missed: st.missed.size, total });
  }
  function drawResult() {
    const cv = $('#hwCanvas', root); if (!cv || !st.img || !st.res || !st.res.ok) return;
    const g = paint(cv, st.img), r = st.res;
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const teal = css('--teal') || '#146A63', acc = css('--accent') || '#C1502B';
    const lw = Math.max(2, r.size.W / 400);
    const items = [];
    r.ann.lines.forEach(L => items.push(() => { g.strokeStyle = teal; g.lineWidth = lw; g.setLineDash([lw * 4, lw * 3]); g.beginPath(); g.moveTo(L.x0, L.a + L.b * L.x0); g.lineTo(L.x1, L.a + L.b * L.x1); g.stroke(); g.setLineDash([]); }));
    r.ann.flagged.forEach(f => items.push(() => { g.strokeStyle = acc; g.lineWidth = lw; g.strokeRect(f.x0 - 4, f.y0 - 4, f.x1 - f.x0 + 8, f.y1 - f.y0 + 8); g.fillStyle = acc + '22'; g.fillRect(f.x0 - 4, f.y0 - 4, f.x1 - f.x0 + 8, f.y1 - f.y0 + 8); }));
    if (reduce) return items.forEach(f => f());
    items.forEach((f, k) => setTimeout(() => { if (st && st.step === 'result') f(); }, 200 + k * 90));
  }
  function save() {
    const S = st.summary, r = st.res;
    const rec = { at: Date.now(), level: S.level, spelling: S.spelling, evidence: S.evidence, metrics: r && r.ok ? r.metrics.map(m => ({ id: m.id, band: m.band })) : [], lang: st.lang };
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* private mode */ }
    ERLY.toast && ERLY.toast(T('Saved to your profile. The photo was not kept.', 'حُفظ في ملفك. لم تُحفظ الصورة.'));
    const sum = S; st.img = null;
    close();
    if (window.FUN && FUN.confetti) FUN.confetti(document.body, 30);
    setTimeout(() => {
      const C = ERLY.companion;
      if (C && C.open) C.open();
      ERLY.emit('hand:done', { summary: sum, record: rec });
    }, 400);
  }
})();
document.addEventListener('click', e => { if (e.target.closest('[data-hand-open]')) window.ERLY && ERLY.emit('hand:open', { from: 'page' }); });
