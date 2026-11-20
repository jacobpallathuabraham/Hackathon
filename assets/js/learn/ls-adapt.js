/* ERLY Learning Studio — learn one objective, adaptively (#/learn/obj/<lesson>:<n>).

   The loop, with real logic and nothing scripted:
     1. TRY       a question on this objective (one not answered correctly most recently; hints available).
     2. RECORD    the answer goes into the learning record (correct?, attempt number, hints used).
     3. RESPOND   right without help → evidence; offer a challenge or "teach it back".
                  right with hints → "now try one without".
                  not right → the question's own explanation, then ANOTHER WAY IN — the student chooses the format;
                  the suggested next rung follows a ladder (simple → visual → worked example → step by step).
     4. AGAIN     a DIFFERENT question on the same objective.
     5. EVIDENCE  the objective's state is recomputed from the record and shown before → after, with why.
     6. INSIGHT   if an answer goes right after an alternative explanation, that is said plainly — as what happened
                  this time, not as a claim about how the student "learns best".

   "Show me why" packs: for five objectives the explanations are written out in genuinely different forms
   (plain words, analogy, picture, worked example, step by step, real world). For every other objective the
   alternatives are taken from the lesson itself (its text, figure, model, worked example and questions). */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store, IL = LS.inline, md = LS.md;
  const E = () => LS.engine;

  const svgLine = (pts, extra) => `<svg viewBox="0 0 320 220" class="ls-svg at-why__svg" role="img" aria-label="${esc(extra.alt)}"><defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="currentColor" stroke-opacity=".12"/></pattern></defs><rect width="320" height="220" fill="url(#g)"/>${extra.body}</svg>`;
  const PACKS = {
    'math-linear:0': {
      simple: 'The gradient is **how steep** the line is. Start on the line, go **1 step right**, and count how many steps **up** (or down) you need to get back onto the line. That number is m.',
      analogy: 'Think of a **staircase**. The *run* is how far forward each step goes; the *rise* is how high it goes. Steep stairs have a big rise for a small run — a big gradient. Stairs going **down** as you walk forward have a **negative** gradient.',
      visual: { alt: 'The line y = 2x + 1 with three small staircases: each goes 1 right and 2 up.', md: 'Every little staircase under the line goes **1 right and 2 up**, wherever you draw it. So m = 2 ÷ 1 = 2.', svg: svgLine(null, { alt: '', body: '<path d="M20 200 L300 20" stroke="currentColor" stroke-width="3"/><g stroke="var(--accent)" stroke-width="2.5" fill="none"><path d="M60 174.3h46.7v-30"/><path d="M140 122.9h46.7v-30"/><path d="M220 71.4h46.7v-30"/></g><g font-size="13" fill="var(--accent)"><text x="72" y="190">1 right</text><text x="112" y="164">2 up</text><text x="152" y="138">1 right</text><text x="192" y="112">2 up</text></g>' }) },
      worked: { problem: 'Find the gradient of the line through (−1, 4) and (3, −4).', steps: ['Rise = y₂ − y₁ = −4 − 4 = −8.', 'Run = x₂ − x₁ = 3 − (−1) = 4.', 'm = rise ÷ run = −8 ÷ 4.'], answer: 'm = −2: the line goes down 2 for every 1 across.' },
      steps: ['Label the points: (x₁, y₁) is the first, (x₂, y₂) the second.', 'Rise: subtract the y-values, second minus first.', 'Run: subtract the x-values in the **same order**.', 'Divide rise by run. Check the sign: a line falling to the right must give a negative answer.'],
      real: 'A taxi charges £3 to start plus £2 per km: cost = 2 × km + 3. The gradient, **2**, is the **price per km** — how fast the cost grows with each extra kilometre.'
    },
    'math-linear:3': {
      simple: 'To solve, **undo** what was done to x, in **reverse order**, doing the same thing to **both sides**, until x is on its own.',
      analogy: 'An equation is a **balance scale**. Whatever you take off one pan, take off the other, and it stays balanced. Keep removing things until only x is left on one side.',
      visual: { alt: 'A balance: three x-boxes and four weights on the left, nineteen weights on the right.', md: 'Take 4 weights off **both** pans: 3 boxes balance 15 weights. Share the 15 between the 3 boxes: each box is **5**.', svg: '<svg viewBox="0 0 320 200" class="ls-svg at-why__svg" role="img" aria-label="A balance with 3x + 4 on the left and 19 on the right."><path d="M160 40v120M100 170h120M40 70h240" stroke="currentColor" stroke-width="3" fill="none"/><path d="M40 70l-20 40h80zM280 70l-20 40h80z" fill="none" stroke="currentColor" stroke-width="2"/><g fill="var(--accent)"><rect x="18" y="86" width="16" height="16" rx="2"/><rect x="38" y="86" width="16" height="16" rx="2"/><rect x="58" y="86" width="16" height="16" rx="2"/></g><text x="80" y="100" font-size="14" fill="currentColor">+4</text><text x="270" y="100" font-size="16" fill="currentColor">19</text><text x="40" y="140" font-size="13" fill="currentColor">3x + 4</text><text x="262" y="140" font-size="13" fill="currentColor">19</text></svg>' },
      worked: { problem: 'Solve 5x − 7 = 18.', steps: ['The last thing done to x was “− 7”, so undo it first: add 7 to both sides → 5x = 25.', 'Then undo “× 5”: divide both sides by 5 → x = 5.', 'Check: 5 × 5 − 7 = 18 ✓.'], answer: 'x = 5' },
      steps: ['Write down what was done to x, in order (e.g. × 3, then + 4).', 'Undo the LAST operation first, on both sides.', 'Undo the next one, on both sides.', 'Check by putting your answer back into the original equation.'],
      real: 'You have £19. Entry costs £4 and each ride costs the same. You go on 3 rides and spend it all: 3x + 4 = 19, so each ride costs **£5**.'
    },
    'phys-motion:2': {
      simple: 'Acceleration is **how much the velocity changes each second**. Find the change in velocity, then divide by the number of seconds it took.',
      analogy: 'Velocity is like the **balance in a savings jar**; acceleration is **how much you add each week**. Going from £4 to £16 in 3 weeks means adding £4 a week.',
      visual: { alt: 'A velocity–time graph rising from 4 to 16 m/s over 3 seconds, with the rise labelled 12 m/s and the run 3 s.', md: 'The **rise** of a velocity–time graph is the change in velocity; the **run** is the time. Rise ÷ run = 12 ÷ 3 = **4 m/s²** — the gradient.', svg: '<svg viewBox="0 0 320 220" class="ls-svg at-why__svg" role="img" aria-label="velocity-time graph"><path d="M40 190H300M40 190V20" stroke="currentColor" stroke-width="2"/><path d="M40 160 L260 40" stroke="currentColor" stroke-width="3"/><path d="M40 160H260V40" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4" fill="none"/><text x="140" y="178" font-size="13" fill="var(--accent)">run: 3 s</text><text x="266" y="104" font-size="13" fill="var(--accent)">rise: 12 m/s</text><text x="6" y="164" font-size="12" fill="currentColor">4</text><text x="0" y="44" font-size="12" fill="currentColor">16</text><text x="270" y="206" font-size="12" fill="currentColor">t (s)</text></svg>' },
      worked: { problem: 'A cyclist speeds up from 5 m/s to 20 m/s in 5 s. Find the acceleration.', steps: ['Change in velocity: v − u = 20 − 5 = 15 m/s.', 'Time taken: 5 s.', 'a = 15 ÷ 5.'], answer: 'a = 3 m/s²' },
      steps: ['Write u (start velocity), v (end velocity) and t.', 'Work out v − u. Keep the sign: slowing down gives a negative change.', 'Divide by t.', 'Units: (m/s) ÷ s = m/s².'],
      real: 'A car going from 0 to about 100 km/h (27 m/s) in 9 s has an average acceleration of 27 ÷ 9 = **3 m/s²**.'
    },
    'bio-heart:2': {
      simple: 'The **left** ventricle pumps blood to the **whole body**; the **right** ventricle only pumps it to the **lungs**, right next door. The longer, higher-pressure journey needs more force, so the left wall has more muscle.',
      analogy: 'Watering a plant beside the tap needs a gentle trickle. Reaching the far end of a long garden needs much more pressure. The left ventricle is the long-garden hose.',
      visual: { alt: 'A cross-section of the two ventricles: the left wall is about three times as thick as the right.', md: 'Cut across the heart and the left ventricle’s wall is roughly **three times** as thick as the right’s (schematic, not to scale).', svg: '<svg viewBox="0 0 320 200" class="ls-svg at-why__svg" role="img" aria-label="ventricle cross-section"><ellipse cx="200" cy="100" rx="70" ry="74" fill="hsl(352 55% 55% / .35)" stroke="currentColor" stroke-width="2"/><ellipse cx="200" cy="100" rx="36" ry="42" fill="var(--bg)" stroke="currentColor" stroke-width="1.5"/><path d="M134 60 C 70 50 60 150 134 140" fill="hsl(220 50% 55% / .25)" stroke="currentColor" stroke-width="2"/><path d="M128 72 C 88 70 84 132 128 128" fill="var(--bg)" stroke="currentColor" stroke-width="1.2"/><text x="176" y="196" font-size="13" fill="currentColor">left ventricle</text><text x="40" y="180" font-size="13" fill="currentColor">right</text><text x="246" y="34" font-size="12" fill="var(--accent)">thick wall</text></svg>' },
      worked: { problem: 'Why is the left ventricle wall thicker? Build the argument.', steps: ['Where does each ventricle send blood? Right → lungs only. Left → the whole body.', 'Which route has more resistance? The body’s much longer network of vessels.', 'So which must make a higher pressure? The left ventricle.', 'Higher pressure needs a stronger contraction, and so more muscle.'], answer: 'More muscle → a thicker wall on the left.' },
      steps: ['Name the destination of each ventricle.', 'Compare the distances and the resistance of each circuit.', 'Link resistance to the pressure needed.', 'Link pressure to the amount of muscle.'],
      real: 'In a healthy adult, a typical blood pressure in the body’s arteries is about **120/80 mmHg**, but in the artery to the lungs only about **25/10 mmHg** — the right side does a much lighter job.'
    },
    'chem-ph:1': {
      simple: 'pH = −log₁₀[H⁺]. When the hydrogen-ion concentration is a neat power of ten, **10⁻ⁿ mol/dm³, the pH is just n**.',
      analogy: 'pH counts **decimal places**. 0.001 mol/dm³ has its 1 in the **third** decimal place, so pH 3. Each step of 1 in pH is a **ten-fold** change.',
      visual: { alt: 'A pH scale from 0 to 14, with [H+] written under each step and a ×10 arrow between neighbouring steps.', md: 'Each step to the left on the scale means **ten times** more H⁺ ions.', svg: '<svg viewBox="0 0 320 120" class="ls-svg at-why__svg" role="img" aria-label="pH scale"><defs><linearGradient id="ph"><stop offset="0" stop-color="#d33"/><stop offset=".5" stop-color="#3a3"/><stop offset="1" stop-color="#36c"/></linearGradient></defs><rect x="10" y="20" width="300" height="24" rx="6" fill="url(#ph)" opacity=".75"/><g font-size="11" fill="currentColor"><text x="12" y="62">1</text><text x="52" y="62">2</text><text x="92" y="62">3</text><text x="152" y="62">7</text><text x="296" y="62">14</text><text x="6" y="80">10⁻¹</text><text x="46" y="80">10⁻²</text><text x="86" y="80">10⁻³</text><text x="144" y="80">10⁻⁷</text></g><path d="M58 98 h-36" stroke="var(--accent)" stroke-width="2" marker-end="url(#a)"/><text x="62" y="102" font-size="11" fill="var(--accent)">×10 more H⁺</text></svg>' },
      worked: { problem: 'Find the pH of an acid with [H⁺] = 0.01 mol/dm³, then one with [H⁺] = 2 × 10⁻³ mol/dm³.', steps: ['0.01 = 10⁻², so pH = −log(10⁻²) = 2.', 'For 2 × 10⁻³: pH = −log(2 × 10⁻³) = 3 − log 2.', 'log 2 ≈ 0.30.'], answer: 'pH 2, and pH ≈ 2.70' },
      steps: ['Write [H⁺] in mol/dm³.', 'If it is exactly 10⁻ⁿ, the pH is n.', 'Otherwise, use a calculator: pH = −log₁₀[H⁺].', 'Sense-check: more H⁺ must give a LOWER pH.'],
      real: 'Lemon juice has a pH of about 2: [H⁺] ≈ 0.01 mol/dm³. Pure water at 25 °C is pH 7: [H⁺] = 10⁻⁷ mol/dm³ — a hundred thousand times less.'
    }
  };
  const MODES = [['simple', 'Read it simply', 'اقرأها ببساطة'], ['visual', 'See it', 'شاهدها'], ['worked', 'Worked example', 'مثال محلول'], ['steps', 'Step by step', 'خطوة بخطوة'], ['analogy', 'An analogy', 'تشبيه'], ['real', 'Real world', 'من الواقع'], ['explore', 'Explore a model', 'استكشف نموذجاً'], ['listen', 'Listen', 'استمع'], ['noor', 'Ask Noor', 'اسأل نور'], ['teach', 'Teach it back', 'اشرحها بنفسك']];
  const LADDER = ['simple', 'visual', 'worked', 'steps'];

  // alternatives taken from the lesson itself, for objectives without a written pack
  function fromLesson(o) {
    const L = LS.lesson(o.lesson); if (!L) return {};
    const secs = L.sections.filter(s => o.sections.includes(s.id)); const blocks = [].concat(...secs.map(s => s.blocks));
    const text = blocks.find(b => b.k === 'text'), fig = blocks.find(b => b.k === 'figure'), ex = blocks.find(b => b.k === 'example') || [].concat(...L.sections.map(s => s.blocks)).find(b => b.k === 'example'), lab = blocks.find(b => b.k === 'lab'), call = blocks.find(b => b.k === 'callout');
    const stepsQ = blocks.find(b => b.k === 'activity' && b.q.type === 'steps');
    const out = {};
    if (text) out.simple = text.md;
    if (fig) out.visual = { alt: fig.alt, md: fig.cap || '', svg: fig.svg || '' };
    else if (call) out.visual = { alt: '', md: call.md, svg: '' };
    if (ex) out.worked = { problem: ex.problem, steps: ex.steps, answer: ex.answer };
    if (stepsQ) out.steps = stepsQ.q.steps.map(s => LS.plain(s.prompt) + (s.explain ? ' — ' + LS.plain(s.explain) : ''));
    if (lab) out.lab = lab.engine;
    return out;
  }
  const packFor = o => Object.assign(fromLesson(o), PACKS[o.key] || {});
  function available(o) {
    const p = packFor(o), xs = (LS.experiences || []).filter(x => x.objs.includes(o.key));
    return MODES.filter(([m]) => m === 'listen' || m === 'noor' || m === 'teach' ? true : m === 'explore' ? (xs.length || p.lab) : !!p[m]).map(x => x[0]);
  }

  function render(o, mode) {
    const p = packFor(o);
    switch (mode) {
      case 'simple': case 'analogy': case 'real': return `<div class="at-why__md" data-ls-sel>${md(p[mode])}</div>`;
      case 'visual': return `<figure class="at-why__fig">${p.visual.svg || ''}<figcaption>${IL(p.visual.md || p.visual.alt || '')}</figcaption></figure>`;
      case 'worked': return `<div class="ls-ex at-why__ex"><p class="ls-ex__p"><b>${T('Problem', 'المسألة')}:</b> ${IL(p.worked.problem)}</p><ol class="ls-ex__steps">${p.worked.steps.map(s => `<li>${IL(s)}</li>`).join('')}</ol><p class="ls-ex__a"><b>${T('Answer', 'الجواب')}:</b> ${IL(p.worked.answer)}</p></div>`;
      case 'steps': return `<ol class="at-why__steps">${p.steps.map((s, i) => `<li ${i ? 'hidden' : ''}>${IL(s)}</li>`).join('')}</ol><button type="button" class="ls-btn ls-btn--sm" data-nextstep>${T('Next step', 'الخطوة التالية')}</button>`;
      case 'explore': { const xs = (LS.experiences || []).filter(x => x.objs.includes(o.key)); return `<div class="at-why__md"><p>${T('Change the model yourself and watch what happens — then come back and try a question.', 'غيّر النموذج بنفسك ثم عد.')}</p><p>${xs.map(x => `<a class="ls-btn" href="#/exp/${x.id}">${esc(x.title)} →</a>`).join(' ')}${p.lab ? ` <a class="ls-btn ls-btn--quiet" href="#/lab/${esc(p.lab)}">${T('Open the lab model', 'افتح نموذج المختبر')}</a>` : ''}</p></div>`; }
      case 'teach': return `<div class="at-why__md"><p>${T('Explain it in your own words, as if to a friend who missed the lesson. Writing it out is one of the best ways to find gaps. It is saved to your notebook — nobody marks it.', 'اشرحها بكلماتك.')}</p><label class="ls-field"><span class="sr-only">${T('Your explanation', 'شرحك')}</span><textarea rows="4" data-teachtxt placeholder="${esc(o.text)}"></textarea></label><button type="button" class="ls-btn ls-btn--sm" data-teachsave>${T('Save to notebook', 'احفظ في الدفتر')}</button></div>`;
    }
    return '';
  }
  const textOf = (o, mode) => { const p = packFor(o); const v = p[mode]; return typeof v === 'string' ? LS.plain(v) : v && v.problem ? LS.plain(v.problem + ' ' + v.steps.join(' ') + ' ' + v.answer) : v && v.md ? LS.plain(v.md) : Array.isArray(v) ? LS.plain(v.join(' ')) : LS.plain(p.simple || o.text); };

  /* ---------- the page ---------- */
  function page(view, parts) {
    if (parts[0] !== 'obj' || !parts[1]) { LS.go('lessons', { replace: true }); return; }
    const key = decodeURIComponent(parts[1]), o = E().objective(key);
    if (!o) { view.innerHTML = `<section class="ls-empty"><h1>${T('Objective not found', 'الهدف غير موجود')}</h1><a class="ls-btn" href="#/explore/topics">${T('All topics', 'كل المواضيع')}</a></section>`; return; }
    const L = LS.lesson(o.lesson), qs = E().questionsFor(key);
    const log = [], session = { tried: [], modes: [], wrongs: 0 };
    const startState = E().state(key).state;
    E().event('objective-open', { obj: key, label: 'Opened “' + o.text + '”' });
    view.innerHTML = `<div class="at-adapt"><header class="ls-pagehead"><p class="ls-kicker"><a href="#/lesson/${L.id}">${esc(L.title)}</a> · ${T('Objective', 'هدف')} ${o.idx + 1}</p><h1>${esc(o.text)}</h1>
        <div class="at-adapt__state" aria-live="polite"></div></header>
      <div class="at-adapt__grid"><div class="at-adapt__main"><section class="at-adapt__stage" aria-live="polite"></section>
        <section class="at-why" aria-labelledby="atWhyH"><h2 class="at-h2" id="atWhyH">${T('Show me why — choose a way in', 'أرني لماذا — اختر طريقة')}</h2><div class="at-why__modes" role="toolbar" aria-label="${T('Explanation formats', 'صيغ الشرح')}">${available(o).map(m => { const M = MODES.find(x => x[0] === m); return `<button type="button" class="ls-chip" data-mode="${m}" aria-pressed="false">${T(M[1], M[2])}</button>`; }).join('')}</div><div class="at-why__body" tabindex="-1"></div></section></div>
        <aside class="at-adapt__log" aria-labelledby="atLogH"><h2 class="at-h2" id="atLogH">${T('What happened', 'ما حدث')}</h2><ol></ol><p class="at-muted at-small">${T('Every step here is stored as evidence in your learning record, and the objective’s state is recomputed from it.', 'كل خطوة تُحفظ كدليل.')}</p></aside></div></div>`;
    const stage = view.querySelector('.at-adapt__stage'), why = view.querySelector('.at-why__body'), logEl = view.querySelector('.at-adapt__log ol');
    const say = (txt, cls) => { log.push(txt); logEl.insertAdjacentHTML('beforeend', `<li class="${cls || ''}">${txt}</li>`); };
    let lastState = startState;
    function showState() {
      const s = E().state(key), S = E().STATES[s.state];
      view.querySelector('.at-adapt__state').innerHTML = `<span class="at-state at-state--${s.state}"><i aria-hidden="true"></i>${esc(S.label)}</span> <details class="at-adapt__whyst"><summary>${T('Why this state?', 'لماذا هذه الحالة؟')}</summary><ul>${s.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul><p class="at-muted">${esc(S.desc)}</p></details>`;
      if (s.state !== lastState) { say(`${T('State', 'الحالة')}: <b>${esc(E().STATES[lastState].label)}</b> → <b>${esc(S.label)}</b>`, 'is-state'); lastState = s.state; }
      return s;
    }
    showState();

    function pickQ(avoid) {
      if (!qs.length) return null;
      const d = st.data(), lastOk = id => { const a = d.attempts.filter(x => x.qid === id); return a.length && a[a.length - 1].correct; };
      const pool = qs.filter(q => !avoid.includes(q.id));
      return (pool.filter(q => !d.attempts.some(a => a.qid === q.id))[0]) || pool.filter(q => !lastOk(q.id))[0] || pool[0] || qs.find(q => !session.tried.includes(q.id)) || qs[0];
    }
    function ask(mode) {
      const q = pickQ(session.tried.slice(-1)); stage.innerHTML = '';
      if (!q) { stage.innerHTML = `<p class="at-empty">${T('There are no questions for this objective yet.', 'لا أسئلة لهذا الهدف بعد.')}</p>`; return; }
      session.tried.push(q.id);
      stage.insertAdjacentHTML('beforeend', `<p class="at-k">${mode === 'again' ? T('A different question on the same idea', 'سؤال مختلف عن الفكرة نفسها') : mode === 'challenge' ? T('A challenge', 'تحدٍّ') : T('Try this', 'جرّب هذا')}</p>`);
      const host = document.createElement('div'); stage.appendChild(host);
      LS.activity(host, q, { from: 'adaptive', guided: true, lessonTitle: L.title, onResult: (res, rec) => after(q, res, rec) });
    }
    function after(q, res, rec) {
      const hints = rec ? rec.hintsUsed || 0 : 0, lastMode = session.modes[session.modes.length - 1];
      say(`${T('Answer recorded', 'سُجّلت الإجابة')}: ${res.correct === true ? '✓ ' + T('right', 'صحيحة') : res.correct === false ? '✕ ' + T('not right', 'غير صحيحة') : T('self-checked', 'تقييم ذاتي')}${hints ? ` · ${hints} ${T('hint(s)', 'تلميح')}` : ''}`);
      const s = showState();
      const next = document.createElement('div'); next.className = 'at-adapt__next';
      if (res.correct === true && !hints) {
        if (session.wrongs && lastMode) {
          E().event('adapt-success', { obj: key, mode: lastMode, label: 'Right after “' + lastMode + '”' });
          say(`<b>${T('Insight', 'رؤية')}:</b> ${T('after you chose', 'بعد أن اخترت')} “${esc(T(MODES.find(m => m[0] === lastMode)[1], MODES.find(m => m[0] === lastMode)[2]))}”, ${T('the next question went right. That is what happened this time — worth remembering, not a rule about you.', 'جاء السؤال التالي صحيحاً. هذا ما حدث هذه المرة.')}`, 'is-insight');
        }
        next.innerHTML = s.state === 'demonstrated' || s.state === 'review'
          ? `<p><b>${T('Demonstrated.', 'مُثبت.')}</b> ${T('Want to go further?', 'هل تريد المزيد؟')}</p><div class="ls-row"><button type="button" class="ls-btn ls-btn--accent" data-ad="challenge">${T('Challenge me', 'تحدَّني')}</button><button type="button" class="ls-btn" data-mode-go="teach">${T('Teach it back', 'اشرحها بنفسك')}</button>${nextObjLink()}<button type="button" class="ls-btn ls-btn--quiet" data-ad="card">${T('Add a review card for later', 'أضف بطاقة للمراجعة')}</button></div>`
          : `<p>${T('Right — that counts as evidence. One more different question without hints would show it securely.', 'صحيح — يُحسب دليلاً. سؤال آخر دون تلميحات يُثبته.')}</p><div class="ls-row"><button type="button" class="ls-btn ls-btn--accent" data-ad="again">${T('Another question', 'سؤال آخر')}</button>${nextObjLink()}</div>`;
      } else if (res.correct === true) {
        next.innerHTML = `<p>${T('Right, with help. Now try a different one without the hints.', 'صحيح بمساعدة. جرّب آخر دون تلميحات.')}</p><div class="ls-row"><button type="button" class="ls-btn ls-btn--accent" data-ad="again">${T('Try one without hints', 'جرّب دون تلميحات')}</button></div>`;
      } else if (res.correct === false) {
        session.wrongs++;
        const sug = LADDER.find(m => available(o).includes(m) && !session.modes.includes(m)) || 'noor';
        const M = MODES.find(m => m[0] === sug);
        next.innerHTML = `<p>${T('Not this time — and that is useful information. Read the explanation above, then try the idea another way. Suggested next:', 'ليس هذه المرة. جرّب الفكرة بطريقة أخرى. المقترح:')} <b>${T(M[1], M[2])}</b> — ${T('or choose any format below.', 'أو اختر أي صيغة أدناه.')}</p><div class="ls-row"><button type="button" class="ls-btn ls-btn--accent" data-mode-go="${sug}">${T(M[1], M[2])}</button><button type="button" class="ls-btn ls-btn--quiet" data-ad="again">${T('Just give me another question', 'أعطني سؤالاً آخر')}</button></div>`;
      } else next.innerHTML = `<div class="ls-row"><button type="button" class="ls-btn" data-ad="again">${T('Another question', 'سؤال آخر')}</button></div>`;
      stage.appendChild(next);
    }
    function nextObjLink() { const n = E().objective(o.lesson + ':' + (o.idx + 1)); return n ? `<a class="ls-btn ls-btn--quiet" href="#/learn/obj/${esc(n.key)}">${T('Next objective', 'الهدف التالي')} →</a>` : ''; }
    function openMode(m, btn) {
      view.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
      if (m === 'listen') { const tx = textOf(o, session.modes[session.modes.length - 1] || 'simple'); LS.speak(tx); why.innerHTML = `<p class="at-muted">${T('Reading the explanation aloud.', 'أقرأ الشرح بصوت.')}</p><div class="at-why__md">${md(packFor(o).simple || o.text)}</div>`; }
      else if (m === 'noor') { LS.noor.ask('simplify', { text: o.text + '. ' + textOf(o, 'simple'), lesson: L }); why.innerHTML = `<p class="at-muted">${T('Opened in Noor’s margin. Only the objective and its explanation are sent — not your answers.', 'فُتح في هامش نور.')}</p>`; }
      else why.innerHTML = render(o, m);
      if (!session.modes.includes(m)) session.modes.push(m); else { session.modes.splice(session.modes.indexOf(m), 1); session.modes.push(m); }
      E().event('explain', { obj: key, mode: m === 'visual' || m === 'explore' ? 'visual' : m, label: 'Explanation: ' + T(MODES.find(x => x[0] === m)[1], '') });
      st.useFormat(m === 'visual' || m === 'explore' ? 'visual' : m === 'listen' ? 'audio' : 'text');
      say(`${T('Explanation opened', 'فُتح شرح')}: ${esc(T(MODES.find(x => x[0] === m)[1], MODES.find(x => x[0] === m)[2]))}`);
      showState();
      if (session.wrongs && m !== 'teach') why.insertAdjacentHTML('beforeend', `<p class="at-why__then"><button type="button" class="ls-btn ls-btn--accent" data-ad="again">${T('Now try a different question', 'الآن جرّب سؤالاً مختلفاً')} →</button></p>`);
      why.focus({ preventScroll: false });
    }
    view.querySelector('.at-adapt').addEventListener('click', e => {
      const m = e.target.closest('[data-mode]') || e.target.closest('[data-mode-go]'); if (m) { openMode(m.dataset.mode || m.dataset.modeGo); return; }
      const a = e.target.closest('[data-ad]'); if (a) {
        if (a.dataset.ad === 'again') { ask('again'); stage.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
        if (a.dataset.ad === 'challenge') { const hard = qs.filter(q => (q.difficulty || 1) >= 2 && !session.tried.includes(q.id)); const nx = E().objective(o.lesson + ':' + (o.idx + 1)); if (hard.length) { session.tried.push(...qs.filter(q => !hard.includes(q)).map(q => q.id)); ask('challenge'); } else if (nx) LS.go('learn/obj/' + nx.key); else LS.toast(T('You have answered every question here. Try the lesson’s revision questions or another objective.', 'أجبت عن كل الأسئلة هنا.')); }
        if (a.dataset.ad === 'card') { const p = packFor(o); LS.cards.quick({ front: o.text, back: LS.plain(p.simple || o.text).slice(0, 600), kind: 'definition', topic: L.topic, obj: key, src: { type: 'lesson', id: L.id, title: L.title } }); }
        return;
      }
      if (e.target.closest('[data-nextstep]')) { const h = why.querySelector('.at-why__steps li[hidden]'); if (h) { h.hidden = false; LS.announce(h.textContent); } if (!why.querySelector('.at-why__steps li[hidden]')) e.target.closest('[data-nextstep]').remove(); return; }
      if (e.target.closest('[data-teachsave]')) { const t = why.querySelector('[data-teachtxt]').value.trim(); if (!t) { LS.toast(T('Write a few words first.', 'اكتب بضع كلمات أولاً.')); return; } LS.notes.quick({ title: 'In my words: ' + o.text.slice(0, 60), html: `<p>${esc(t).replace(/\n/g, '<br>')}</p>`, src: { type: 'lesson', id: L.id, title: L.title, where: '#/learn/obj/' + key } }); E().event('teach-back', { obj: key, label: 'Taught it back' }); say(T('You explained it in your own words (saved to your notebook).', 'شرحتها بكلماتك.')); }
    });
    ask('first');
  }
  LS.showMeWhy = { PACKS, MODES, available: key => available(E().objective(key)), render: (key, m) => render(E().objective(key), m) };
  LS.route('learn', page);
})();
