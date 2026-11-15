/* ERLY — Handwriting practice (v18). Four modes inside the Handwriting Check page:
   • Letters  — trace a large letter over a faint guide
   • Words    — write a word freehand; the handwriting model (if downloaded) says whether it could read it
   • Tracing  — trace a whole sentence over a dotted guide
   • Goals    — a weekly practice goal the student sets, kept ON THIS DEVICE only if they choose
   Feedback is descriptive, never a grade or a judgement of the writer: for tracing it reports how much of the guide
   the ink covered and how much ink fell outside it — numbers measured from the strokes, nothing guessed.
   Nothing is uploaded. Only the goal and the count of finished practice rounds are stored, and only after the
   student turns “Remember my goal on this device” on; “Delete” removes them.
   ERLY.handPractice.mount(el) / .unmount(); the pure tracing metric is exported for the unit tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api.pure;
  else { root.ERLY = root.ERLY || {}; root.ERLY.handPractice = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /* ---------- pure: coverage of a guide by ink (two binary masks of the same size) ---------- */
  function dilate(mask, W, H, r) {
    const out = new Uint8Array(mask.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!mask[y * W + x]) continue; for (let dy = -r; dy <= r; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx >= 0 && xx < W && dx * dx + dy * dy <= r * r) out[yy * W + xx] = 1; } } }
    return out;
  }
  // covered: share of guide pixels with ink within `tol` px; outside: share of ink pixels further than `tol` from the guide
  function coverage(guide, ink, W, H, tol) {
    const inkD = dilate(ink, W, H, tol), guideD = dilate(guide, W, H, tol); let g = 0, gc = 0, k = 0, ko = 0;
    for (let i = 0; i < guide.length; i++) { if (guide[i]) { g++; if (inkD[i]) gc++; } if (ink[i]) { k++; if (!guideD[i]) ko++; } }
    return { covered: g ? gc / g : 0, outside: k ? ko / k : 0, guidePx: g, inkPx: k };
  }
  const pure = { dilate, coverage };
  if (typeof document === 'undefined') return { pure };

  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ar = () => window.I18N && I18N.lang === 'ar';
  const SETS = {
    lower: 'abcdefghijklmnopqrstuvwxyz'.split(''), upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), digits: '0123456789'.split(''),
    arabic: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('')
  };
  const WORDS = ['river', 'bright', 'garden', 'quickly', 'number', 'window', 'yellow', 'jumping', 'friend', 'science', 'history', 'zebra', 'puzzle', 'evening', 'travel', 'quiet', 'family', 'orange', 'balance', 'library'];
  const SENTENCES = ['The quick brown fox jumps over the lazy dog.', 'Pack my box with five dozen liquor jugs.', 'Small steps every day add up.', 'A calm mind writes a clear line.', 'Practice makes progress, not perfect.'];
  const KEY = 'erly-hand-goal-v1';
  const loadGoal = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const saveGoal = g => { try { localStorage.setItem(KEY, JSON.stringify(g)); } catch (e) { /* storage blocked: the goal lives for this visit */ } };
  const weekOf = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toISOString().slice(0, 10); };

  let el = null, pad = null, st = null, guideCanvas = null;
  const fresh = () => ({ mode: 'letters', set: ar() ? 'arabic' : 'lower', i: 0, word: 0, sent: 0, fb: null, busy: false, goal: loadGoal() || { remember: false, perWeek: 3, minutes: 10, weeks: {} }, rounds: 0 });
  function mount(host, mode) { el = host; st = st || fresh(); if (mode && /^(letters|words|tracing|goals)$/.test(mode)) st.mode = mode; render(); }
  function unmount() { if (pad) { pad.destroy(); pad = null; } el = null; }
  function target() { return st.mode === 'letters' ? SETS[st.set][st.i % SETS[st.set].length] : st.mode === 'words' ? WORDS[st.word % WORDS.length] : SENTENCES[st.sent % SENTENCES.length]; }
  const fontFor = txt => (/[؀-ۿ]/.test(txt) ? '"Noto Naskh Arabic", "Amiri", serif' : '"Comic Neue", "Segoe Print", "Bradley Hand", "Patrick Hand", cursive, sans-serif');
  // the guide is drawn in pad coordinates; the same function makes the mask used for the coverage metric
  function drawGuide(c, W, H, dotted) {
    const g = c.getContext('2d'), txt = target(); g.clearRect(0, 0, c.width, c.height);
    if (st.mode === 'words') return; // freehand: no guide
    const big = st.mode === 'letters'; let size = big ? H * 0.72 : H * 0.42; g.font = `${size}px ${fontFor(txt)}`;
    while (g.measureText(txt).width > W * 0.92 && size > 12) { size *= 0.92; g.font = `${size}px ${fontFor(txt)}`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (dotted) { g.save(); g.setLineDash([size * 0.035, size * 0.05]); g.lineWidth = Math.max(1.5, size * 0.02); g.strokeStyle = getComputedStyle(el).getPropertyValue('--hw-guide').trim() || 'rgba(37,99,235,.55)'; g.strokeText(txt, W / 2, H * 0.54); g.restore(); g.fillStyle = 'rgba(37,99,235,.07)'; g.fillText(txt, W / 2, H * 0.54); }
    else { g.fillStyle = '#000'; g.fillText(txt, W / 2, H * 0.54); }
  }
  function render() {
    if (!el) return;
    if (pad) { pad.destroy(); pad = null; }
    const G = st.goal, wk = weekOf(Date.now()), done = (G.weeks || {})[wk] || 0;
    const modes = [['letters', 'Letters', 'الحروف'], ['words', 'Words', 'الكلمات'], ['tracing', 'Tracing', 'تتبع الجمل'], ['goals', 'Goals', 'الأهداف']];
    el.innerHTML = `<div class="hwp">
      <div class="hw2-seg hwp__modes" role="tablist" aria-label="${T('Practice mode', 'وضع التدريب')}">${modes.map(([k, en, a]) => `<button type="button" role="tab" aria-selected="${st.mode === k}" data-pm="${k}">${T(en, a)}</button>`).join('')}</div>
      ${st.mode === 'goals' ? goalsHtml(G, done) : `
      <div class="hwp__bar">
        ${st.mode === 'letters' ? `<div class="hw2-seg" role="radiogroup" aria-label="${T('Letters', 'الحروف')}">${[['lower', 'a–z'], ['upper', 'A–Z'], ['digits', '0–9'], ['arabic', 'أ–ي']].map(([k, l]) => `<button type="button" role="radio" aria-checked="${st.set === k}" data-pset="${k}">${l}</button>`).join('')}</div>` : ''}
        <p class="hwp__target" dir="auto">${st.mode === 'letters' ? T('Trace the letter', 'تتبّع الحرف') : st.mode === 'words' ? T('Write this word in your own way:', 'اكتب هذه الكلمة بطريقتك:') : T('Trace the sentence', 'تتبّع الجملة')} <b>${esc(target())}</b></p>
        <span class="hw2-tools__sp"></span>
        <button type="button" class="hw2-ghost" data-pa="prev" aria-label="${T('Previous', 'السابق')}">‹</button><button type="button" class="hw2-ghost" data-pa="next" aria-label="${T('Next', 'التالي')}">›</button>
      </div>
      <div class="hwp__stage ${st.mode === 'letters' ? 'is-letter' : st.mode === 'words' ? 'is-word' : 'is-line'}"><canvas class="hwp__guide" aria-hidden="true"></canvas><div class="hwp__pad" id="hwpPad"></div></div>
      <div class="hw2-row"><button type="button" class="hw2-ghost" data-pa="clear">${T('Clear', 'امسح')}</button><button type="button" class="hw2-ghost" data-pa="undo">↶ ${T('Undo', 'تراجع')}</button><span class="hw2-tools__sp"></span><button type="button" class="hw2-btn" data-pa="check">${st.mode === 'words' ? T('Can the software read it?', 'هل يقرؤها البرنامج؟') : T('Show how I traced', 'أرني كيف تتبّعت')}</button></div>
      <div class="hwp__fb" aria-live="polite">${st.fb || ''}</div>
      <p class="muted cmp-small">${T('Practice feedback describes the strokes on the screen. It is not a test, a score of your handwriting, or an assessment of any kind.', 'ملاحظات التدريب تصف الخطوط على الشاشة. ليست اختباراً أو تقييماً لخطك.')}</p>`}
    </div>`;
    el.onclick = onClick; el.onchange = onChange;
    if (st.mode === 'goals') return;
    const stage = el.querySelector('.hwp__stage'); guideCanvas = el.querySelector('.hwp__guide');
    pad = new ERLY.InkPad(el.querySelector('#hwpPad'), { label: T('Practice writing area', 'مساحة التدريب'), size: st.mode === 'letters' ? 9 : 5 });
    const sizeGuide = () => { const r = stage.getBoundingClientRect(), d = Math.min(3, devicePixelRatio || 1); guideCanvas.width = Math.round(r.width * d); guideCanvas.height = Math.round(r.height * d); guideCanvas.style.width = r.width + 'px'; guideCanvas.style.height = r.height + 'px'; const g = guideCanvas.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); drawGuide({ getContext: () => g, width: guideCanvas.width, height: guideCanvas.height }, r.width, r.height, true); };
    requestAnimationFrame(sizeGuide); new ResizeObserver(sizeGuide).observe(stage);
  }
  function goalsHtml(G, done) {
    const pct = Math.min(1, done / Math.max(1, G.perWeek));
    return `<div class="hwp__goals">
      <p>${T('Set a practice goal for this week. It is yours to change at any time.', 'حدّد هدف تدريب لهذا الأسبوع. يمكنك تغييره متى شئت.')}</p>
      <label>${T('Practice rounds per week', 'جولات التدريب أسبوعياً')} <select data-goal="perWeek">${[1, 2, 3, 4, 5, 7].map(n => `<option ${G.perWeek === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>${T('Minutes per round', 'الدقائق لكل جولة')} <select data-goal="minutes">${[5, 10, 15, 20].map(n => `<option ${G.minutes === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="hwp__meter" role="progressbar" aria-valuemin="0" aria-valuemax="${G.perWeek}" aria-valuenow="${done}" aria-label="${T('This week', 'هذا الأسبوع')}"><i style="width:${Math.round(pct * 100)}%"></i></div>
      <p><b>${done}/${G.perWeek}</b> ${T('practice rounds this week', 'جولات تدريب هذا الأسبوع')}${done >= G.perWeek ? ' — ' + T('goal reached.', 'تحقق الهدف.') : ''}</p>
      <label class="hw2-sw"><input type="checkbox" data-goal="remember" ${G.remember ? 'checked' : ''}> ${T('Remember my goal and practice count on this device', 'تذكّر هدفي وعدد جولاتي على هذا الجهاز')}</label>
      <p class="muted cmp-small">${G.remember ? T('Stored in this browser only: the goal and how many rounds you finished each week — never your writing.', 'محفوظ في هذا المتصفح فقط: الهدف وعدد الجولات — وليس كتابتك.') : T('Off: the goal lasts until you leave this page.', 'إيقاف: يبقى الهدف حتى تغادر هذه الصفحة.')}</p>
      ${G.remember ? `<button type="button" class="hw2-ghost" data-pa="delgoal">${T('Delete my stored goal', 'احذف هدفي المحفوظ')}</button>` : ''}
    </div>`;
  }
  // the strokes, rendered at the guide's size, as a binary mask
  function inkMask(W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    for (const s of pad.strokes) ERLY.InkPad.paint(g, s, W, () => '#000');
    const d = g.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H); for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 60 ? 1 : 0; return m;
  }
  function guideMask(W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; drawGuide(c, W, H, false);
    const d = c.getContext('2d').getImageData(0, 0, W, H).data, m = new Uint8Array(W * H); for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 100 ? 1 : 0;
    return m;
  }
  function countRound() { st.rounds++; const G = st.goal, wk = weekOf(Date.now()); G.weeks = G.weeks || {}; G.weeks[wk] = (G.weeks[wk] || 0) + 1; if (G.remember) saveGoal(G); }
  async function check() {
    if (!pad || !pad.strokes.some(s => s.tool === 'pen')) { st.fb = `<p>${T('Write something first.', 'اكتب شيئاً أولاً.')}</p>`; return paintFb(); }
    if (st.mode === 'words') {
      const R = ERLY.handRec;
      if (!R || !R.ready()) { st.fb = `<p>${T('To check a word, the handwriting model reads it on this device. It is a one-time download of about 64 MB.', 'للتحقق من كلمة، يقرؤها نموذج الكتابة اليدوية على هذا الجهاز. تنزيل لمرة واحدة بحجم ٦٤ ميغابايت تقريباً.')}</p><button type="button" class="hw2-btn" data-pa="getmodel">${T('Download the handwriting model', 'نزّل نموذج الكتابة اليدوية')}</button>`; return paintFb(); }
      st.fb = `<p>${T('Reading on this device…', 'نقرأ على هذا الجهاز…')}</p>`; paintFb();
      const c = pad.export(2), r = await R.readLine(c), want = target().toLowerCase(), got = r.text.toLowerCase().replace(/[^a-z؀-ۿ]/g, '');
      const same = got === want;
      st.fb = `<p class="${same ? 'is-ok' : ''}">${same ? T(`The software read “${esc(r.text)}” — that matches.`, `قرأ البرنامج «${esc(r.text)}» — مطابق.`) : T(`The software read “${esc(r.text) || '—'}”. Software makes mistakes too — try again if you like, maybe a little larger.`, `قرأ البرنامج «${esc(r.text) || '—'}». البرنامج يخطئ أيضاً — حاول مجدداً إن شئت.`)}</p><p class="muted cmp-small">${T('Software confidence', 'ثقة البرنامج')}: ${r.conf}%</p>`;
      countRound(); return paintFb();
    }
    const W = Math.round(pad.w), H = Math.round(pad.h), tol = Math.max(4, Math.round(Math.min(W, H) * (st.mode === 'letters' ? 0.035 : 0.02)));
    const cv = coverage(guideMask(W, H), inkMask(W, H), W, H, tol), c = Math.round(cv.covered * 100), o = Math.round(cv.outside * 100);
    st.fb = `<div class="hwp__nums"><div><b>${c}%</b><span>${T('of the guide covered by your ink', 'من الدليل غطّاه حبرك')}</span></div><div><b>${o}%</b><span>${T('of your ink outside the guide', 'من حبرك خارج الدليل')}</span></div></div><p>${c >= 70 && o <= 25 ? T('Your strokes followed the guide closely.', 'تبعت خطوطك الدليل عن قرب.') : c < 40 ? T('Parts of the guide have no ink yet — you can keep tracing, there is no time limit.', 'أجزاء من الدليل بلا حبر بعد — يمكنك متابعة التتبع، لا وقت محدد.') : T('Most of the guide is traced. Slower strokes often stay closer to the line.', 'معظم الدليل متتبَّع. الخطوط الأبطأ تبقى غالباً أقرب إلى الخط.')}</p>`;
    countRound(); paintFb();
  }
  const paintFb = () => { const f = el && el.querySelector('.hwp__fb'); if (f) f.innerHTML = st.fb || ''; };
  function onClick(e) {
    const m = e.target.closest('[data-pm]'); if (m) { st.mode = m.dataset.pm; st.fb = null; return render(); }
    const ps = e.target.closest('[data-pset]'); if (ps) { st.set = ps.dataset.pset; st.i = 0; st.fb = null; return render(); }
    const a = e.target.closest('[data-pa]'); if (!a) return; const k = a.dataset.pa;
    if (k === 'next' || k === 'prev') { const d = k === 'next' ? 1 : -1; if (st.mode === 'letters') st.i = (st.i + d + SETS[st.set].length) % SETS[st.set].length; else if (st.mode === 'words') st.word = (st.word + d + WORDS.length) % WORDS.length; else st.sent = (st.sent + d + SENTENCES.length) % SENTENCES.length; st.fb = null; return render(); }
    if (k === 'clear' && pad) { pad.clear(); st.fb = null; return paintFb(); }
    if (k === 'undo' && pad) return pad.undo();
    if (k === 'check') return check();
    if (k === 'getmodel') { const R = ERLY.handRec; st.fb = `<div class="hw2-bar"><i style="width:2%"></i></div>`; paintFb(); R.load(p => { const i = el && el.querySelector('.hwp__fb .hw2-bar i'); if (i) i.style.width = Math.round(p * 100) + '%'; }).then(() => check()).catch(() => { st.fb = `<p class="hw2-err">${T('The model could not be downloaded right now. Nothing was sent anywhere.', 'تعذر تنزيل النموذج الآن. لم يُرسل شيء.')}</p>`; paintFb(); }); return; }
    if (k === 'delgoal') { try { localStorage.removeItem(KEY); } catch (er) { /* none */ } st.goal = { remember: false, perWeek: 3, minutes: 10, weeks: {} }; ERLY.toast && ERLY.toast(T('Your stored goal was deleted.', 'حُذف هدفك المحفوظ.')); return render(); }
  }
  function onChange(e) {
    const g = e.target.closest('[data-goal]'); if (!g) return; const k = g.dataset.goal, G = st.goal;
    if (k === 'remember') { G.remember = g.checked; if (G.remember) saveGoal(G); else { try { localStorage.removeItem(KEY); } catch (er) { /* none */ } } }
    else { G[k] = +g.value; if (G.remember) saveGoal(G); }
    render();
  }
  return { pure, mount, unmount, state: () => st, _check: check, _pad: () => pad, SETS, WORDS, SENTENCES };
});
