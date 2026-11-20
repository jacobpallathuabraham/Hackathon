/* ERLY Learning Studio — the experience engine (loaded on first use) and the physics, chemistry and maths experiences.

   FLOW (any step can be visited at any time; the model stays on screen with Pause, Reset and Noor):
     Hook → Predict → Explore → Observe & explain → Apply → Summary & connections
   • the prediction is stored before the model runs, then compared with what the model actually did;
   • the observation is COMPUTED from the model's state — never pre-written;
   • "Save to Discovery Archive" keeps prediction, observation and the student's own explanation;
   • every model pauses when off-screen or in a hidden tab, and with reduced motion it computes results
     without animating.
   Each model states what it simplifies. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store, md = LS.md, IL = LS.inline;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const DEFS = {};
  const fmt = (v, d) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d == null ? 1 : d).replace('-', '−');

  /* ---------- an animation loop that only runs when it should ---------- */
  function looper(el, tick) {
    let raf = 0, on = false, vis = true, last = 0, dead = false;
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { vis = es[0].isIntersecting; kick(); }) : null; if (io) io.observe(el);
    const frame = t => { raf = 0; if (dead || !on || !vis || document.hidden) return; const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t; tick(dt); kick(); };
    function kick() { if (!raf && on && vis && !document.hidden && !dead) raf = requestAnimationFrame(t => { frame(t); }); if (!on || !vis) last = 0; }
    const onVis = () => { last = 0; kick(); }; document.addEventListener('visibilitychange', onVis);
    return { start() { on = true; last = 0; kick(); }, stop() { on = false; }, running: () => on, destroy() { dead = true; on = false; if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis); cancelAnimationFrame(raf); } };
  }
  function canvas(host, w, h) {
    const c = document.createElement('canvas'); c.className = 'at-x__cv'; host.appendChild(c);
    const fit = () => { const dpr = Math.min(2, devicePixelRatio || 1), W = host.clientWidth || w; c.width = W * dpr; c.height = W * (h / w) * dpr; c.style.height = (W * h / w) + 'px'; c._s = c.width / w; };
    fit(); const ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null; if (ro) ro.observe(host);
    c._destroy = () => ro && ro.disconnect(); return c;
  }
  const css = v => getComputedStyle(document.body).getPropertyValue(v).trim();
  const slider = (id, label, min, max, step, val, unit) => `<label class="at-range"><span>${label} <output data-o="${id}">${val}${unit || ''}</output></span><input type="range" data-s="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;

  /* ================= the frame ================= */
  const STEPS = [['hook', 'Hook', 'البداية'], ['predict', 'Predict', 'توقّع'], ['explore', 'Explore', 'استكشف'], ['observe', 'Observe & explain', 'لاحظ وفسّر'], ['apply', 'Apply', 'طبّق'], ['summary', 'Summary', 'الخلاصة']];
  function mount(view, x) {
    const def = DEFS[x.id]; if (!def) { view.innerHTML = `<section class="ls-empty"><h1>${esc(x.title)}</h1><p>${T('Not available.', 'غير متاح.')}</p></section>`; return; }
    const S = (LS.subjectsList || []).find(s => s.id === x.subject) || {};
    const ses = { pred: null, step: 'hook', obs: null };
    LS.engine.event('experience', { id: x.id, subject: x.subject, objs: x.objs, mode: 'visual', label: x.title });
    st.touch('exp', x.id, x.title); st.useFormat('visual');
    view.innerHTML = `<div class="at-x at-subj-${x.subject}${def.wide ? ' at-x--wide' : ''}"><header class="at-x__head"><canvas class="at-world at-world--band" style="view-transition-name: world-hero" data-vt-keep data-world="${x.subject}" aria-hidden="true"></canvas><p class="at-k"><a href="#/subject/${x.subject}">${T(S.name || '', S.ar || '')}</a> · ${esc(LS.expKinds[x.kind])} · ${x.mins} min</p><h1>${esc(x.title)}</h1><p class="at-x__hook">${esc(x.hook)}</p><div class="at-wh__tools"><button type="button" class="at-glassbtn" data-focus-toggle aria-pressed="false">${T('Focus', 'تركيز')}</button></div></header>
      <nav class="at-x__steps" aria-label="${T('Steps', 'الخطوات')}">${STEPS.map(([k, en, ar], i) => `<button type="button" data-step="${k}" ${k === 'hook' ? 'aria-current="step"' : ''}><span>${i + 1}</span>${T(en, ar)}</button>`).join('')}</nav>
      <div class="at-x__grid"><section class="at-x__model" aria-label="${T('The model', 'النموذج')}"><div class="at-x__stage"></div><div class="at-x__tools" role="group" aria-label="${T('Model controls', 'التحكم')}"><button type="button" class="ls-btn ls-btn--sm" data-x="pause">${T('Pause', 'إيقاف')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-x="reset">${T('Reset', 'إعادة')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-x="noor">${LS.icon('noor')} ${T('Ask Noor about this', 'اسأل نور')}</button></div><p class="at-x__simp"><b>${T('Simplified:', 'تبسيط:')}</b> ${esc(x.simplified)}</p></section>
        <section class="at-x__panel" tabindex="-1" aria-live="polite"></section></div></div>`;
    const stage = view.querySelector('.at-x__stage'), panel = view.querySelector('.at-x__panel');
    let syncPause = () => {};
    const M = def.build(stage, { reduced: reduced(), looper, canvas, css, slider, fmt, onChange: () => { syncPause(); if (ses.step === 'observe') show('observe'); } });
    if (LS.paintWorlds) LS.paintWorlds(view);
    const pauseBtn = view.querySelector('[data-x="pause"]');
    syncPause = () => { const t = M.running && M.running() ? T('Pause', 'إيقاف') : T('Play', 'تشغيل'); if (pauseBtn.textContent !== t) pauseBtn.textContent = t; pauseBtn.disabled = !M.running; };
    syncPause();

    function show(k) {
      ses.step = k; view.querySelectorAll('[data-step]').forEach(b => { if (b.dataset.step === k) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      const nextBtn = i => STEPS[i + 1] ? `<p class="at-x__next"><button type="button" class="ls-btn ls-btn--accent" data-step="${STEPS[i + 1][0]}">${T(STEPS[i + 1][1], STEPS[i + 1][2])} →</button></p>` : '';
      const i = STEPS.findIndex(s => s[0] === k);
      if (k === 'hook') panel.innerHTML = `<h2 class="at-h2">${esc(x.hook)}</h2><div class="at-x__md">${md(def.intro)}</div>${nextBtn(i)}`;
      if (k === 'predict') {
        const P = def.predict;
        panel.innerHTML = `<h2 class="at-h2">${T('Predict first', 'توقّع أولاً')}</h2><p>${IL(P.q)}</p><div class="at-x__opts" role="radiogroup" aria-label="${T('Your prediction', 'توقعك')}">${P.options.map((o, j) => `<button type="button" role="radio" aria-checked="${ses.pred === j}" class="at-opt" data-pred="${j}">${IL(o)}</button>`).join('')}</div><p class="at-muted at-small">${T('No marks — a prediction is a guess worth testing.', 'لا درجات — التوقع تخمين يستحق الاختبار.')}</p>${ses.pred != null ? `<p class="at-x__next"><button type="button" class="ls-btn ls-btn--accent" data-step="explore">${T('Test it', 'اختبره')} →</button></p>` : ''}`;
      }
      if (k === 'explore') { panel.innerHTML = `<h2 class="at-h2">${T('Explore', 'استكشف')}</h2><div class="at-x__md">${md(def.explore)}</div>${nextBtn(i)}`; if (def.preset) M.preset && M.preset(); }
      if (k === 'observe') {
        const o = M.observe(); ses.obs = o;
        const ok = ses.pred != null && o.predOk ? o.predOk(ses.pred) : null;
        panel.innerHTML = `<h2 class="at-h2">${T('What happened', 'ما حدث')}</h2><p class="at-x__obs">${IL(o.text)}</p>
          ${ses.pred != null ? `<p class="at-x__cmp ${ok === true ? 'is-ok' : ok === false ? 'is-no' : ''}"><b>${T('You predicted', 'توقعت')}:</b> ${IL(def.predict.options[ses.pred])}. ${ok === true ? T('The model agrees.', 'النموذج يوافق.') : ok === false ? T('The model did something different — that is the interesting part.', 'فعل النموذج شيئاً مختلفاً — وهذا هو المثير.') : T('Run the model with the suggested settings to compare.', 'شغّل النموذج بالإعدادات المقترحة للمقارنة.')}</p>` : `<p class="at-muted">${T('You did not record a prediction — that is fine.', 'لم تسجّل توقعاً — لا بأس.')}</p>`}
          <div class="at-x__md at-x__explain">${md(def.explain)}</div>
          <label class="ls-field">${T('In your own words: why did it happen? (optional)', 'بكلماتك: لماذا حدث ذلك؟ (اختياري)')}<textarea rows="3" data-myexp>${esc(ses.my || '')}</textarea></label>
          <div class="ls-row"><button type="button" class="ls-btn" data-x="archive">${T('Save to Discovery Archive', 'احفظ في أرشيف الاكتشافات')}</button><button type="button" class="ls-btn ls-btn--quiet" data-x="refresh">${T('Update from the model', 'حدّث من النموذج')}</button></div>${nextBtn(i)}`;
        LS.engine.event('observe', { id: x.id, objs: x.objs, mode: 'visual', label: 'Observed: ' + x.title });
      }
      if (k === 'apply') {
        panel.innerHTML = `<h2 class="at-h2">${T('Apply it', 'طبّقه')}</h2><div class="at-x__qs"></div>${nextBtn(i)}`;
        const host = panel.querySelector('.at-x__qs'), bank = LS.bank();
        (def.apply || []).forEach(a => { const q = typeof a === 'string' ? bank.find(b => b.id === a) : Object.assign({ topic: x.title, subject: S.name }, a); if (!q) return; const h = document.createElement('div'); host.appendChild(h); LS.activity(h, q, { from: 'experience', guided: true, lessonTitle: x.title }); });
        if (!host.children.length) host.innerHTML = `<p class="at-muted">${T('No questions for this one yet.', 'لا أسئلة بعد.')}</p>`;
      }
      if (k === 'summary') {
        const links = (def.connect || []).concat(x.lesson ? [{ label: T('The full lesson', 'الدرس الكامل') + ': ' + (LS.lesson(x.lesson) || {}).title, href: '#/lesson/' + x.lesson }] : []).concat((x.objs || []).slice(0, 2).map(k2 => { const ob = LS.engine.objective(k2); return ob && { label: T('Practise', 'تدرّب') + ': ' + ob.text, href: '#/learn/obj/' + k2 }; }).filter(Boolean));
        panel.innerHTML = `<h2 class="at-h2">${T('Summary', 'الخلاصة')}</h2><ul class="at-x__sum">${def.summary.map(s => `<li>${IL(s)}</li>`).join('')}</ul><h3 class="at-h3">${T('Where this connects', 'أين يرتبط هذا')}</h3><ul class="at-x__links">${links.map(l => `<li><a href="${esc(l.href)}">${esc(l.label)} →</a></li>`).join('')}</ul><p class="ls-row"><button type="button" class="ls-btn ls-btn--quiet" data-x="cards">${T('Make flashcards from the summary', 'اصنع بطاقات من الخلاصة')}</button><a class="ls-btn ls-btn--quiet" href="#/discover">${T('Another experience', 'تجربة أخرى')}</a></p>`;
      }
      panel.focus({ preventScroll: true });
    }
    view.querySelector('.at-x').addEventListener('input', e => { if (e.target.matches('[data-myexp]')) ses.my = e.target.value; });
    view.querySelector('.at-x').addEventListener('click', e => {
      const s = e.target.closest('[data-step]'); if (s) { show(s.dataset.step); if (innerWidth < 900 && s.closest('.at-x__panel')) panel.scrollIntoView({ block: 'start' }); return; }
      const p = e.target.closest('[data-pred]'); if (p) { ses.pred = +p.dataset.pred; LS.engine.event('predict', { id: x.id, objs: x.objs, label: 'Predicted' }); if (def.preset && M.preset) M.preset(); show('predict'); return; }
      const b = e.target.closest('[data-x]'); if (!b) return; const a = b.dataset.x;
      if (a === 'pause') { if (M.running && M.running()) M.pause(); else M.play && M.play(); syncPause(); }
      if (a === 'reset') { M.reset(); syncPause(); if (ses.step === 'observe') show('observe'); }
      if (a === 'refresh') show('observe');
      if (a === 'noor') LS.noor.ask('model', { text: `${x.title}. ${x.hook} Current model state: ${M.observe().text.replace(/\*\*/g, '')}`, title: x.title });
      if (a === 'archive') { const o = ses.obs || M.observe(); const rec = { id: LS.uid('ar'), exp: x.id, title: x.title, kind: LS.expKinds[x.kind], at: Date.now(), prediction: ses.pred != null ? LS.plain(def.predict.options[ses.pred]) : '', predOk: ses.pred != null && o.predOk ? o.predOk(ses.pred) : null, observation: LS.plain(o.text), explanation: (ses.my || '').slice(0, 800) }; st.update(d => { d.archive = d.archive || []; d.archive.push(rec); }); LS.toast(T('Saved to your Discovery Archive.', 'حُفظ في أرشيف الاكتشافات.')); }
      if (a === 'cards') { const n = LS.cards.addMany(def.summary.map(sm => { const [f, bk] = sm.split(/:\s(.+)/); return { front: LS.plain(bk ? f : x.hook), back: LS.plain(bk || sm), kind: 'definition', topic: x.title, src: { type: 'experience', id: x.id, title: x.title } }; })); LS.toast(n + ' ' + T('cards added.', 'بطاقات أُضيفت.')); }
    });
    const off = LS.on('leave', () => { off(); M.destroy && M.destroy(); });
    show('hook');
  }
  LS.exp = { mount, DEFS, looper, canvas };

  /* ================= PHYSICS · motion graphs ================= */
  DEFS['motion-graphs'] = {
    intro: 'A cart moves along a straight track. You choose its **starting velocity** u and its **acceleration** a. As it moves, two graphs are drawn: **displacement–time** and **velocity–time**.\n\nThe question: when something speeds up steadily, what shape does its displacement–time graph make?',
    predict: { q: 'The cart starts at rest (u = 0) and accelerates at **a = 2 m/s²**. What shape will its **displacement–time** graph be?', options: ['A straight sloping line', 'A curve that gets steeper', 'A curve that flattens out', 'A horizontal line'] },
    preset: true,
    explore: 'Press **Play** (u = 0, a = 2 are already set). Then try:\n\n- a = 0 with u = 3 — what do both graphs look like?\n- u = 8, a = −2 — when does the cart stop? Where is that on each graph?',
    explain: 'On a displacement–time graph the **gradient is the velocity**. With a steady positive acceleration the velocity keeps increasing, so the gradient keeps increasing: the curve gets **steeper**. Meanwhile the velocity–time graph is a **straight line** whose gradient is the acceleration, and the **area under it** is the displacement.',
    apply: ['pm-v3', 'pm-a2', 'pm-x1'],
    summary: ['Gradient of displacement–time: velocity.', 'Gradient of velocity–time: acceleration.', 'Area under velocity–time: displacement.', 'Steady acceleration: a straight v–t line and a curved s–t graph.'],
    build(host, c) {
      const TMAX = 6;
      host.innerHTML = `<div class="at-mg"><div class="at-mg__track"></div><div class="at-mg__graphs"><svg viewBox="0 0 300 180" class="at-mg__g" data-g="s" role="img" aria-label="${T('Displacement–time graph', 'منحنى الإزاحة والزمن')}"></svg><svg viewBox="0 0 300 180" class="at-mg__g" data-g="v" role="img" aria-label="${T('Velocity–time graph', 'منحنى السرعة والزمن')}"></svg></div>
        <div class="at-x__ctl">${c.slider('u', T('Starting velocity u', 'السرعة الابتدائية'), -4, 10, 0.5, 0, ' m/s')}${c.slider('a', T('Acceleration a', 'التسارع'), -3, 3, 0.5, 2, ' m/s²')}<p class="at-mg__read" aria-live="off"></p></div></div>`;
      const cv = c.canvas(host.querySelector('.at-mg__track'), 600, 90), g = cv.getContext('2d');
      let u = 0, a = 2, t = 0;
      const s = tt => u * tt + 0.5 * a * tt * tt, v = tt => u + a * tt;
      function range(f) { let lo = Infinity, hi = -Infinity; for (let i = 0; i <= 60; i++) { const y = f(TMAX * i / 60); lo = Math.min(lo, y); hi = Math.max(hi, y); } if (hi - lo < 1) { hi += 0.5; lo -= 0.5; } return [Math.min(lo, 0), Math.max(hi, 0)]; }
      function graph(svg, f, lbl, unit) {
        const [lo, hi] = range(f), X = tt => 36 + tt / TMAX * 254, Y = y => 160 - (y - lo) / (hi - lo) * 145, n = Math.max(1, Math.round(60 * t / TMAX));
        const pts = []; for (let i = 0; i <= n; i++) { const tt = t * i / n; pts.push(X(tt).toFixed(1) + ' ' + Y(f(tt)).toFixed(1)); }
        svg.innerHTML = `<path d="M36 ${Y(0).toFixed(1)}H292M36 10V164" stroke="currentColor" stroke-opacity=".5"/><text x="2" y="14" font-size="11" fill="currentColor">${lbl}</text><text x="250" y="178" font-size="11" fill="currentColor">t (s)</text><text x="2" y="${(Y(hi) + 4).toFixed(0)}" font-size="10" fill="currentColor">${fmt(hi, 0)}</text><text x="2" y="${(Y(lo) + 4).toFixed(0)}" font-size="10" fill="currentColor">${fmt(lo, 0)}</text>${t > 0 ? `<path d="M${pts.join('L')}" fill="none" stroke="var(--accent)" stroke-width="2.5"/><circle cx="${X(t).toFixed(1)}" cy="${Y(f(t)).toFixed(1)}" r="4" fill="var(--accent)"/>` : ''}`;
        svg.setAttribute('aria-label', `${lbl} (${unit}) — ${T('after', 'بعد')} ${fmt(t)} s: ${fmt(f(t))}`);
      }
      function draw() {
        const W = cv.width, H = cv.height, k = cv._s, [lo, hi] = range(s);
        g.clearRect(0, 0, W, H); g.strokeStyle = c.css('--line-2') || '#999'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(20 * k, 70 * k); g.lineTo(580 * k, 70 * k); g.stroke();
        g.fillStyle = c.css('--muted'); g.font = `${11 * k}px sans-serif`; for (let i = 0; i <= 4; i++) { const xm = 20 + 560 * i / 4; g.fillRect(xm * k, 66 * k, 1 * k, 8 * k); g.fillText(fmt(lo + (hi - lo) * i / 4, 0) + ' m', (xm - 8) * k, 88 * k); }
        const px = 20 + 560 * (s(t) - lo) / (hi - lo);
        g.fillStyle = c.css('--accent'); g.fillRect((px - 18) * k, 44 * k, 36 * k, 18 * k); g.beginPath(); g.arc((px - 10) * k, 64 * k, 5 * k, 0, 7); g.arc((px + 10) * k, 64 * k, 5 * k, 0, 7); g.fill();
        graph(host.querySelector('[data-g="s"]'), s, T('s (m)', 's (م)'), 'm'); graph(host.querySelector('[data-g="v"]'), v, T('v (m/s)', 'v (م/ث)'), 'm/s');
        host.querySelector('.at-mg__read').textContent = `t = ${fmt(t)} s · s = ${fmt(s(t))} m · v = ${fmt(v(t))} m/s`;
      }
      const L = c.looper(host, dt => { t = Math.min(TMAX, t + dt); draw(); if (t >= TMAX) { L.stop(); sync(); } c.onChange(); });
      const sync = () => { const b = document.querySelector('[data-x="pause"]'); if (b) b.textContent = L.running() ? T('Pause', 'إيقاف') : T('Play', 'تشغيل'); };
      host.addEventListener('input', e => { const sl = e.target.closest('[data-s]'); if (!sl) return; if (sl.dataset.s === 'u') u = +sl.value; else a = +sl.value; host.querySelector(`[data-o="${sl.dataset.s}"]`).textContent = sl.value + (sl.dataset.s === 'u' ? ' m/s' : ' m/s²'); t = 0; L.stop(); draw(); sync(); });
      draw();
      const shape = () => { if (a === 0) return u === 0 ? 3 : 0; const tStop = -u / a; if (tStop > 0 && tStop < TMAX) return 4; return Math.sign(u + a * 0.01 || a) === Math.sign(a) ? 1 : 2; };
      const SH = [T('a straight sloping line (constant velocity)', 'خط مستقيم مائل'), T('a curve getting steeper (speeding up)', 'منحنى يزداد انحداراً'), T('a curve flattening out (slowing down)', 'منحنى يستوي'), T('a horizontal line (not moving)', 'خط أفقي'), T('a curve that rises, stops and turns back (the cart reverses)', 'منحنى يرتفع ثم يعود')];
      return {
        play() { if (t >= TMAX) t = 0; if (c.reduced) { t = TMAX; draw(); c.onChange(); return; } L.start(); }, pause() { L.stop(); }, running: () => L.running(),
        reset() { L.stop(); t = 0; draw(); },
        preset() { u = 0; a = 2; host.querySelector('[data-s="u"]').value = 0; host.querySelector('[data-s="a"]').value = 2; host.querySelector('[data-o="u"]').textContent = '0 m/s'; host.querySelector('[data-o="a"]').textContent = '2 m/s²'; t = 0; draw(); },
        observe() { const done = t > 0; return { text: done ? `With **u = ${fmt(u)} m/s** and **a = ${fmt(a)} m/s²**, after ${fmt(t)} s the cart has moved **${fmt(s(t))} m** and is going **${fmt(v(t))} m/s**. Its displacement–time graph is ${SH[shape()]}; its velocity–time graph is a straight line with gradient ${fmt(a)}.` : T('Press **Play** to run the cart first.', 'اضغط **تشغيل** أولاً.'), predOk: done ? p => p === shape() : null }; },
        destroy() { L.destroy(); cv._destroy(); }
      };
    }
  };

  /* ================= PHYSICS · what if the Sun were heavier? ================= */
  DEFS['orbit-whatif'] = {
    intro: 'A planet goes round a star in a circle. The star’s gravity pulls it inwards; its speed carries it sideways. In a circular orbit the two are exactly balanced.\n\n**What if** the star suddenly had more mass — but the planet kept the same speed?',
    predict: { q: 'The Sun’s mass doubles. The planet keeps its speed. What happens to its orbit?', options: ['It moves out to a bigger circle', 'It falls into a tighter, stretched orbit and speeds up near the Sun', 'It flies off into space', 'Nothing changes'] },
    preset: true,
    explore: 'Press **Play** with Sun mass × 2. Then explore:\n\n- Sun mass × 1 and speed × 1 — a perfect circle.\n- Speed × 1.42 at mass × 1 — what happens? (Escape speed is √2 ≈ 1.41 × the circular speed.)\n- Sun mass × 0.75 at speed × 1.',
    explain: 'Gravity’s pull is proportional to the star’s mass. Double the mass and the old speed is **too slow for a circle** at that distance (it would now need √2 ≈ 1.41 times the speed), so the planet **falls inward**. As it falls it speeds up, swings round close to the star and climbs back out: an **ellipse**. Its starting point becomes the far end of the ellipse. Go fast enough and it never comes back — it escapes.',
    apply: [
      { id: 'x-orb1', type: 'mcq', difficulty: 2, prompt: 'The Sun’s mass were reduced to ¾ of its value, and the planet kept its speed. The planet would…', options: ['swing further out, into a longer, stretched orbit', 'fall inward, closer to the Sun', 'stay in exactly the same circle', 'stop moving'], answer: 0, hints: ['Less mass → weaker pull. Is the planet now too fast or too slow for a circle?'], why: { 1: 'A weaker pull cannot pull it inward more: it is now too fast for that circle.', 2: 'The balance between pull and speed has changed, so the circle cannot stay the same.', 3: 'Nothing removes its speed; gravity only changes its direction and speed gradually.' }, explain: 'With a weaker pull the planet is now too fast for that circle, so it swings outward into an elliptical orbit (in the model, out to twice the distance).' },
      { id: 'x-orb2', type: 'mcq', difficulty: 2, prompt: 'Where in an elliptical orbit does a planet move fastest?', options: ['Closest to the star', 'Furthest from the star', 'It moves at the same speed everywhere', 'Halfway between'], answer: 0, why: { 1: 'At the far point it has climbed against gravity and slowed down.', 2: 'Only circular orbits have constant speed.', 3: 'Speed keeps increasing all the way in to the closest point.' }, explain: 'Falling towards the star it gains speed, so it is fastest at the closest point (Kepler’s second law).' }
    ],
    summary: ['Circular orbit: the star’s pull exactly matches what is needed to curve the planet’s path.', 'More mass at the same speed: the planet falls into an ellipse, fastest at its closest point.', 'Faster than escape speed (√2 × circular speed): it never returns.'],
    connect: [{ label: 'Newton’s laws lesson', href: '#/lesson/phys-newton' }],
    build(host, c) {
      host.innerHTML = `<div class="at-orb"><div class="at-orb__cv"></div><div class="at-x__ctl">${c.slider('m', T('Sun mass ×', 'كتلة الشمس ×'), 0.5, 3, 0.25, 2, '')}${c.slider('v', T('Planet speed ×', 'سرعة الكوكب ×'), 0.5, 1.6, 0.01, 1, '')}<p class="at-orb__read" aria-live="off"></p></div></div>`;
      const cv = c.canvas(host.querySelector('.at-orb__cv'), 400, 400), g = cv.getContext('2d');
      let M = 2, V = 1, st0, trail, simT, rmin, rmax, ang, period, fate;
      function init() { st0 = { x: 1, y: 0, vx: 0, vy: V }; trail = []; simT = 0; rmin = 1; rmax = 1; ang = 0; period = null; fate = null; }
      function acc(p) { const r2 = p.x * p.x + p.y * p.y, r = Math.sqrt(r2), f = -M / (r2 * r); return [f * p.x, f * p.y]; }
      function advance(n) {
        const dt = 0.002;
        for (let i = 0; i < n && !fate; i++) {
          const p = st0, [ax, ay] = acc(p); p.vx += ax * dt / 2; p.vy += ay * dt / 2; const a0 = Math.atan2(p.y, p.x); p.x += p.vx * dt; p.y += p.vy * dt; const [bx, by] = acc(p); p.vx += bx * dt / 2; p.vy += by * dt / 2;
          let da = Math.atan2(p.y, p.x) - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; ang += da; simT += dt;
          const r = Math.hypot(p.x, p.y); rmin = Math.min(rmin, r); rmax = Math.max(rmax, r);
          if (period == null && ang >= 2 * Math.PI) period = simT;
          if (r < 0.06) fate = 'sun'; else if (r > 3.4) fate = (0.5 * (p.vx * p.vx + p.vy * p.vy) - M / r) >= 0 ? 'escape' : 'far';
          if (i % 10 === 0) { trail.push([p.x, p.y]); if (trail.length > 1600) trail.shift(); }
        }
      }
      function draw() {
        const W = cv.width, k = W / 400, S = 100 * k, cx = W / 2, cy = W / 2;
        g.clearRect(0, 0, W, W); g.strokeStyle = c.css('--line'); g.setLineDash([4 * k, 4 * k]); g.beginPath(); g.arc(cx, cy, S, 0, 7); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#E8A93B'; g.beginPath(); g.arc(cx, cy, (8 + 3 * M) * k, 0, 7); g.fill();
        g.strokeStyle = c.css('--accent'); g.lineWidth = 1.5 * k; g.beginPath(); trail.forEach(([x, y], i) => { const X = cx + x * S, Y = cy - y * S; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke();
        g.fillStyle = c.css('--ink'); g.beginPath(); g.arc(cx + st0.x * S, cy - st0.y * S, 5 * k, 0, 7); g.fill();
        host.querySelector('.at-orb__read').textContent = `${T('Closest', 'الأقرب')} ${fmt(rmin, 2)} · ${T('furthest', 'الأبعد')} ${fmt(rmax, 2)} ${T('(starting distance = 1)', '(المسافة الأولى = 1)')}${period ? ` · ${T('one orbit', 'مدار واحد')} ≈ ${fmt(period / (2 * Math.PI), 2)} ${T('of the original year', 'من السنة الأصلية')}` : ''}${fate ? ' · ' + fateText() : ''}`;
      }
      const fateText = () => fate === 'sun' ? T('fell into the star', 'سقط في النجم') : fate === 'escape' ? T('escaped — it will never return', 'هرب ولن يعود') : T('left the view (still bound; it would come back)', 'خرج من العرض');
      const L = c.looper(host, () => { advance(60); draw(); c.onChange(); if (fate) L.stop(); });
      host.addEventListener('input', e => { const sl = e.target.closest('[data-s]'); if (!sl) return; if (sl.dataset.s === 'm') M = +sl.value; else V = +sl.value; host.querySelector(`[data-o="${sl.dataset.s}"]`).textContent = sl.value; L.stop(); init(); draw(); });
      init(); draw();
      const kind = () => fate === 'escape' ? 2 : rmax - rmin < 0.04 ? 3 : rmin < 0.97 ? 1 : 0;
      return {
        play() { if (fate) init(); if (c.reduced) { advance(9000); draw(); c.onChange(); return; } L.start(); }, pause() { L.stop(); }, running: () => L.running(),
        reset() { L.stop(); init(); draw(); },
        preset() { M = 2; V = 1; host.querySelector('[data-s="m"]').value = 2; host.querySelector('[data-s="v"]').value = 1; host.querySelector('[data-o="m"]').textContent = '2'; host.querySelector('[data-o="v"]').textContent = '1'; init(); draw(); },
        observe() { const ran = simT > 0.5; return { text: ran ? `Sun mass **× ${M}**, planet speed **× ${V}**: the planet came as close as **${fmt(rmin, 2)}** and went out to **${fmt(rmax, 2)}** times its starting distance${fate ? ', then ' + fateText() : ''}.${period ? ` One orbit took about **${fmt(period / (2 * Math.PI), 2)}** of the original year.` : ''}` : T('Press **Play** and let the planet go round at least once.', 'اضغط **تشغيل**.'), predOk: ran && M === 2 && V === 1 ? p => p === kind() : null }; },
        destroy() { L.destroy(); cv._destroy(); }
      };
    }
  };

  /* ================= PHYSICS · build & break a circuit ================= */
  DEFS['circuit-break'] = {
    intro: 'Three identical bulbs and a 12 V battery. Wire them in **series** (one loop) or in **parallel** (separate branches). Then **break** a bulb by selecting it and see what happens to the others.',
    predict: { q: 'The bulbs are in **series** and one breaks. What happens to the other two?', options: ['They go out too', 'They get brighter', 'They stay exactly as they were', 'They get dimmer but stay on'] },
    preset: true,
    explore: 'Select a bulb to break it (select again to mend it). Then switch to **parallel** and break one again. Watch the ammeter.',
    explain: 'In **series** there is only one path, so a break anywhere stops the current everywhere: all the bulbs go out. In **parallel** each bulb has its own branch connected straight across the battery, so it keeps the full 12 V; breaking one branch only removes that branch’s current. That is why the lights in a house are wired in parallel.',
    apply: ['e-sort', 'e-par'],
    summary: ['Series: one path; the same current through every component; one break stops everything.', 'Parallel: each branch gets the full voltage; branches work independently.', 'Total current in parallel: the sum of the branch currents.'],
    build(host, c) {
      const V = 12, R = 6; let par = false, broken = [false, false, false];
      host.innerHTML = `<div class="at-cir"><div class="ls-row" role="radiogroup" aria-label="${T('Wiring', 'التوصيل')}"><button type="button" class="ls-chip" role="radio" data-wire="s">${T('Series', 'توالٍ')}</button><button type="button" class="ls-chip" role="radio" data-wire="p">${T('Parallel', 'توازٍ')}</button></div><svg viewBox="0 0 420 260" class="at-cir__svg"></svg><p class="at-cir__read" aria-live="polite"></p></div>`;
      const svg = host.querySelector('svg');
      function calc() {
        if (!par) { const ok = broken.every(b => !b), I = ok ? V / (3 * R) : 0; return { total: I, bulbs: broken.map(b => ({ I: b ? 0 : I, P: b ? 0 : I * I * R })) }; }
        const bulbs = broken.map(b => ({ I: b ? 0 : V / R, P: b ? 0 : V * V / R })); return { total: bulbs.reduce((s, b) => s + b.I, 0), bulbs };
      }
      function bulb(x, y, i, P) { const glow = Math.min(1, P / 24); return `<g class="at-cir__b" data-bulb="${i}" role="button" tabindex="0" aria-pressed="${broken[i]}" aria-label="${T('Bulb', 'مصباح')} ${i + 1}: ${broken[i] ? T('broken', 'مكسور') : P > 0 ? T('lit', 'مضيء') + ' ' + fmt(P) + ' W' : T('off', 'مطفأ')}. ${T('Select to', 'اختر لـ')} ${broken[i] ? T('mend', 'الإصلاح') : T('break', 'الكسر')}"><circle cx="${x}" cy="${y}" r="${18 + 14 * glow}" fill="#F5C33B" opacity="${(0.15 + 0.6 * glow) * (glow > 0 ? 1 : 0)}"/><circle cx="${x}" cy="${y}" r="16" fill="var(--surface)" stroke="currentColor" stroke-width="2"/>${broken[i] ? `<path d="M${x - 9} ${y - 9}l18 18M${x + 9} ${y - 9}l-18 18" stroke="#C0392B" stroke-width="3"/>` : `<path d="M${x - 8} ${y + 6}q8 -16 16 0" fill="none" stroke="currentColor" stroke-width="1.5"/>`}<text x="${x}" y="${y + 34}" text-anchor="middle" font-size="11" fill="currentColor">${broken[i] ? T('broken', 'مكسور') : fmt(P) + ' W'}</text></g>`; }
      function draw() {
        const r = calc(); host.querySelectorAll('[data-wire]').forEach(b => b.setAttribute('aria-checked', String((b.dataset.wire === 'p') === par)));
        const bat = `<g><path d="M40 110v40M52 120v20" stroke="currentColor" stroke-width="3"/><text x="18" y="170" font-size="12" fill="currentColor">12 V</text></g><g><circle cx="210" cy="225" r="16" fill="var(--surface)" stroke="currentColor" stroke-width="2"/><text x="210" y="229" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">A</text><text x="236" y="229" font-size="12" fill="currentColor">${fmt(r.total, 2)} A</text></g>`;
        svg.innerHTML = !par
          ? `<path d="M46 110V30H380V225H226M194 225H46V150" fill="none" stroke="currentColor" stroke-width="2"/>${bat}${[120, 210, 300].map((x, i) => bulb(x, 30, i, r.bulbs[i].P)).join('')}`
          : `<path d="M46 110V30H380M46 150V225H194M226 225H380V30M120 30V200M210 30V200M300 30V200M120 200H380" fill="none" stroke="currentColor" stroke-width="2"/>${bat}${[120, 210, 300].map((x, i) => bulb(x, 110, i, r.bulbs[i].P)).join('')}`;
        host.querySelector('.at-cir__read').textContent = `${par ? T('Parallel', 'توازٍ') : T('Series', 'توالٍ')}: ${T('battery current', 'تيار البطارية')} ${fmt(r.total, 2)} A · ${r.bulbs.map((b, i) => `${T('bulb', 'مصباح')} ${i + 1}: ${fmt(b.I, 2)} A, ${fmt(b.P)} W`).join(' · ')}`;
      }
      host.addEventListener('click', e => { const w = e.target.closest('[data-wire]'); if (w) { par = w.dataset.wire === 'p'; draw(); return; } const b = e.target.closest('[data-bulb]'); if (b) { broken[+b.dataset.bulb] = !broken[+b.dataset.bulb]; draw(); c.onChange(); } });
      host.addEventListener('keydown', e => { const b = e.target.closest('[data-bulb]'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); broken[+b.dataset.bulb] = !broken[+b.dataset.bulb]; draw(); c.onChange(); host.querySelector(`[data-bulb="${b.dataset.bulb}"]`).focus(); } });
      draw();
      return {
        reset() { broken = [false, false, false]; draw(); }, preset() { par = false; broken = [false, false, false]; draw(); },
        observe() {
          const r = calc(), nb = broken.filter(Boolean).length;
          const text = `${par ? 'Parallel' : 'Series'}, ${nb} bulb${nb === 1 ? '' : 's'} broken: the battery supplies **${fmt(r.total, 2)} A**. ${r.bulbs.map((b, i) => `Bulb ${i + 1}: ${broken[i] ? 'broken' : b.P > 0 ? `**${fmt(b.P)} W**` : '**off**'}`).join(', ')}.`;
          return { text, predOk: !par && nb === 1 ? p => p === 0 : null };
        }
      };
    }
  };

  /* ================= PHYSICS · two waves ================= */
  DEFS.waves = {
    intro: 'Two waves travel along the same line. Where they overlap, the displacements **add**. Change the second wave’s frequency and how far it is shifted (its **phase**).',
    predict: { q: 'Two identical waves are **half a cycle (180°) apart**. What does their sum look like?', options: ['A flat line — they cancel', 'A wave twice as tall', 'The same as one wave', 'A wave with double the frequency'] },
    explore: 'Set the phase difference to **180°** with frequency × 1.00. Then try 0°, and then a frequency of × 1.10 to see **beats**.',
    explain: 'At 180° every crest of one wave meets a trough of the other, so the sum is zero everywhere: **destructive interference**. At 0° crests meet crests and the sum is twice as tall: **constructive interference**. With slightly different frequencies the waves drift in and out of step, making **beats**.',
    apply: [{ id: 'x-wav1', type: 'mcq', difficulty: 1, prompt: 'Two identical waves meet exactly in step (0° apart). The amplitude of the sum is…', options: ['twice the amplitude of one wave', 'zero', 'the same as one wave', 'half of one wave'], answer: 0, why: { 1: 'Zero happens when they are 180° apart.', 2: 'The displacements add, so it is larger than one wave.', 3: 'Adding two equal positive displacements doubles them.' }, explain: 'In step, crest meets crest: the displacements add to twice the amplitude.' }],
    summary: ['Superposition: overlapping waves add their displacements.', 'In step (0°): constructive — twice the amplitude.', 'Half a cycle apart (180°): destructive — they cancel.'],
    build(host, c) {
      host.innerHTML = `<svg viewBox="0 0 800 280" class="at-wv" role="img" aria-label="${T('Two waves (thin) and their sum (thick)', 'موجتان ومجموعهما')}"></svg><div class="at-x__ctl">${c.slider('f', T('Second wave’s frequency ×', 'تردد الموجة الثانية ×'), 0.5, 2, 0.01, 1, '')}${c.slider('p', T('Phase difference', 'فرق الطور'), 0, 360, 5, 0, '°')}</div>`;
      let f = 1, p = 0; const svg = host.querySelector('svg'); const draw = () => { svg.innerHTML = LS.waveSVG(f, p); };
      host.addEventListener('input', e => { const sl = e.target.closest('[data-s]'); if (!sl) return; if (sl.dataset.s === 'f') f = +sl.value; else p = +sl.value; host.querySelector(`[data-o="${sl.dataset.s}"]`).textContent = sl.value + (sl.dataset.s === 'p' ? '°' : ''); draw(); c.onChange(); });
      draw();
      const amp = () => { let m = 0; for (let i = 0; i <= 400; i++) { const x = i / 400, y = Math.sin(2 * Math.PI * 3 * x) + Math.sin(2 * Math.PI * 3 * f * x + p * Math.PI / 180); m = Math.max(m, Math.abs(y)); } return m; };
      return { reset() { f = 1; p = 0; host.querySelector('[data-s="f"]').value = 1; host.querySelector('[data-s="p"]').value = 0; host.querySelector('[data-o="f"]').textContent = '1'; host.querySelector('[data-o="p"]').textContent = '0°'; draw(); },
        observe() { const A = amp(); return { text: `Frequency × **${f.toFixed(2)}**, phase **${p}°**: the largest displacement of the sum is **${A.toFixed(2)}** (one wave alone reaches 1.00). ${LS.waveText(f, p)}`, predOk: Math.abs(f - 1) < 0.005 && Math.abs(p - 180) < 0.1 ? q => q === 0 : null }; } };
    }
  };

  /* ================= CHEMISTRY · inside a substance ================= */
  function particleSim(N, L) {
    const x = new Float64Array(N), y = new Float64Array(N), vx = new Float64Array(N), vy = new Float64Array(N), fx = new Float64Array(N), fy = new Float64Array(N);
    function lattice() { const side = Math.ceil(Math.sqrt(N)); for (let i = 0; i < N; i++) { x[i] = L / 2 - side * 0.56 + (i % side) * 1.12 + ((Math.floor(i / side) % 2) * 0.56); y[i] = L / 2 - side * 0.48 + Math.floor(i / side) * 0.97; vx[i] = (Math.random() - 0.5) * 0.1; vy[i] = (Math.random() - 0.5) * 0.1; } forces(); }
    function forces() { fx.fill(0); fy.fill(0); for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const dx = x[i] - x[j], dy = y[i] - y[j], r2 = dx * dx + dy * dy; if (r2 > 6.25) continue; const i2 = 1 / Math.max(r2, 0.64), i6 = i2 * i2 * i2, f = 24 * i2 * i6 * (2 * i6 - 1); fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy; } }
    function step(dt, T) {
      for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; x[i] += dt * vx[i]; y[i] += dt * vy[i]; if (x[i] < 0.5) { x[i] = 0.5; vx[i] = Math.abs(vx[i]); } if (x[i] > L - 0.5) { x[i] = L - 0.5; vx[i] = -Math.abs(vx[i]); } if (y[i] < 0.5) { y[i] = 0.5; vy[i] = Math.abs(vy[i]); } if (y[i] > L - 0.5) { y[i] = L - 0.5; vy[i] = -Math.abs(vy[i]); } }
      forces(); let ke = 0; for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; ke += vx[i] * vx[i] + vy[i] * vy[i]; }
      const Tc = ke / (2 * N), lam = Math.sqrt(1 + 0.05 * (T / Math.max(Tc, 1e-6) - 1)); for (let i = 0; i < N; i++) { vx[i] *= lam; vy[i] *= lam; } return Tc;
    }
    function neighbours() { let nb = 0; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j) { const dx = x[i] - x[j], dy = y[i] - y[j]; if (dx * dx + dy * dy < 2.25) nb++; } return nb / N; }
    lattice();
    return { x, y, vx, vy, step, neighbours, lattice, N, L };
  }
  LS.exp.particleSim = particleSim;
  DEFS.particles = {
    intro: 'This box holds 64 particles that **attract each other when close** and **repel when squashed together**. They are always moving; the **temperature** sets how fast, on average.\n\nWhat changes when a solid melts — the particles, or the way they move?',
    predict: { q: 'You raise the temperature until the solid melts. What happens to the particles?', options: ['They move faster and slide past each other, though still touching', 'They get bigger', 'They stop attracting each other completely', 'They turn into different particles'] },
    explore: 'Start cold (temperature 0.10). Press **Play**. Then raise the temperature slowly — **0.45**, then **0.6**, then **1.2** — and wait a few seconds after each change. Watch the **neighbours** and **mobility** readings, not just the picture.',
    explain: 'Nothing happens to the particles themselves — they do not grow, change or lose their attraction. Heating makes them **move faster**. In a **solid** they only vibrate around fixed places (many neighbours, low mobility). In a **liquid** they have enough energy to **slide past each other** while staying close. In a **gas** they have enough energy to **escape** the attraction and spread out (few neighbours, high mobility).',
    apply: [
      { id: 'x-par1', type: 'mcq', difficulty: 1, prompt: 'When a liquid boils, what happens to its particles?', options: ['They gain enough energy to escape their neighbours and spread out', 'They expand to fill the container', 'They break into smaller particles', 'They stop moving'], answer: 0, why: { 1: 'Particles do not expand; the spaces between them grow.', 2: 'In a change of state the particles themselves stay the same.', 3: 'Particles in a gas move fastest of all.' }, explain: 'Boiling: particles gain enough kinetic energy to overcome the attraction and move apart into a gas.' },
      { id: 'x-par2', type: 'tf', difficulty: 1, prompt: '“Particles in a solid do not move at all.”', answer: false, explain: 'They vibrate about fixed positions — the model shows this even at the lowest temperature.' }
    ],
    summary: ['Solid: particles vibrate about fixed positions, many neighbours.', 'Liquid: particles slide past each other but stay close.', 'Gas: particles move fast and far apart.', 'Heating changes how particles move, not the particles themselves.'],
    build(host, c) {
      host.innerHTML = `<div class="at-pt"><div class="at-pt__cv"></div><div class="at-x__ctl">${c.slider('t', T('Temperature (model units)', 'درجة الحرارة (وحدات النموذج)'), 0.05, 1.5, 0.05, 0.1, '')}<p class="at-pt__read" aria-live="off"></p></div></div>`;
      const cv = c.canvas(host.querySelector('.at-pt__cv'), 400, 400), g = cv.getContext('2d');
      const sim = particleSim(64, 16); let T0 = 0.1, hist = [], clock = 0, label = '';
      const snap = () => ({ x: Array.from(sim.x), y: Array.from(sim.y), t: clock });
      function classify() {
        const nb = sim.neighbours(), old = hist[0]; let msd = 0; if (old) { for (let i = 0; i < 64; i++) msd += (sim.x[i] - old.x[i]) ** 2 + (sim.y[i] - old.y[i]) ** 2; msd /= 64; msd *= 2 / Math.max(0.5, clock - old.t); }
        label = nb >= 4.5 && msd < 0.45 ? 'solid' : nb >= 3.2 ? 'liquid' : nb >= 2.2 ? 'mixed' : 'gas';
        return { nb, msd };
      }
      const NAMES = { solid: T('solid-like: vibrating in place', 'شبيه بالصلب'), liquid: T('liquid-like: sliding past each other', 'شبيه بالسائل'), mixed: T('boiling: a liquid clump with gas around it', 'غليان'), gas: T('gas-like: spread out and fast', 'شبيه بالغاز') };
      let m = { nb: 0, msd: 0 };
      function draw() {
        const W = cv.width, k = W / 16; g.clearRect(0, 0, W, W); g.strokeStyle = c.css('--line-2'); g.strokeRect(1, 1, W - 2, W - 2);
        const hue = 200 - Math.min(1, T0 / 1.5) * 190;
        for (let i = 0; i < 64; i++) { const sp = Math.hypot(sim.vx[i], sim.vy[i]); g.fillStyle = `hsl(${hue} 70% ${Math.min(62, 40 + sp * 8)}%)`; g.beginPath(); g.arc(sim.x[i] * k, sim.y[i] * k, 0.48 * k, 0, 7); g.fill(); }
        host.querySelector('.at-pt__read').textContent = `${T('Neighbours per particle', 'جيران لكل جسيم')} ${m.nb.toFixed(1)} · ${T('mobility', 'الحركية')} ${m.msd.toFixed(2)} · ${label ? NAMES[label] : '…'}`;
      }
      function run(seconds) { const n = Math.round(seconds / 0.005); for (let i = 0; i < n; i++) { sim.step(0.005, T0); clock += 0.005; } if (!hist.length || clock - hist[hist.length - 1].t > 0.25) { hist.push(snap()); while (hist.length && clock - hist[0].t > 2) hist.shift(); } m = classify(); }
      const L = c.looper(host, () => { run(0.06); draw(); });
      host.addEventListener('input', e => { const sl = e.target.closest('[data-s]'); if (!sl) return; T0 = +sl.value; host.querySelector('[data-o="t"]').textContent = sl.value; hist = []; c.onChange(); });
      run(0.5); draw();
      const kind = () => label === 'liquid' || label === 'mixed' || label === 'gas' ? 0 : null;
      return {
        play() { if (c.reduced) { run(4); draw(); c.onChange(); return; } L.start(); }, pause() { L.stop(); }, running: () => L.running(),
        reset() { L.stop(); sim.lattice(); T0 = 0.1; host.querySelector('[data-s="t"]').value = 0.1; host.querySelector('[data-o="t"]').textContent = '0.1'; hist = []; clock = 0; run(0.5); draw(); },
        observe() { return { text: `At temperature **${T0.toFixed(2)}** the particles have on average **${m.nb.toFixed(1)}** close neighbours and a mobility of **${m.msd.toFixed(2)}** — **${NAMES[label] || '…'}**. The particles themselves are identical at every temperature; only their speeds changed.`, predOk: kind() === 0 && T0 >= 0.4 ? p => p === 0 : null }; },
        destroy() { L.destroy(); cv._destroy(); }
      };
    }
  };

  /* ================= MATHS · line builder ================= */
  DEFS['line-builder'] = {
    intro: 'Every straight line can be written **y = mx + c**. Here you control m and c directly — or drag two points and let the line be worked out from them.',
    predict: { q: 'You change **m from 1 to −1** and leave c alone. What happens to the line?', options: ['It tilts the other way, still crossing the y-axis at the same point', 'It moves down by 2', 'It becomes horizontal', 'It moves to the left'] },
    explore: 'Move **m** through 0 and into negative values, then move **c**. Then switch on **Two points** and drag A and B: the rise and run are drawn for you. Finally try the **Match the line** challenge.',
    explain: '**m** controls the **tilt**: for every 1 step right, the line goes up m (down if m is negative). **c** slides the whole line **up or down** without changing its tilt: it is where the line crosses the y-axis. Changing m from 1 to −1 flips the tilt but keeps the crossing point (0, c).',
    apply: ['lf-g2', 'lf-c3', 'lf-p3'],
    summary: ['m is the gradient: the rise for every 1 across.', 'c is the y-intercept: where the line crosses the y-axis.', 'Through two points: m = rise ÷ run, then c from one point.'],
    build(host, c) {
      host.innerHTML = `<div class="at-lb"><svg viewBox="-10 -10 20 20" class="at-lb__svg" role="img"></svg><div class="at-x__ctl">${c.slider('m', 'm', -5, 5, 0.5, 1, '')}${c.slider('c', 'c', -6, 6, 1, 1, '')}<p class="ls-row"><label class="ls-chk"><input type="checkbox" data-two> ${T('Two points', 'نقطتان')}</label><button type="button" class="ls-btn ls-btn--sm" data-chal>${T('Match the line challenge', 'تحدي مطابقة الخط')}</button></p><p class="at-lb__eq" aria-live="polite"></p></div></div>`;
      const svg = host.querySelector('svg'); let m = 1, cc = 1, two = false, A = [-4, -3], B = [3, 4], target = null, drag = null, tries = 0;
      const fromPts = () => { if (B[0] === A[0]) return; m = (B[1] - A[1]) / (B[0] - A[0]); cc = A[1] - m * A[0]; };
      const nice = v => Number.isInteger(v) ? String(v).replace('-', '−') : (Math.round(v * 100) / 100).toString().replace('-', '−');
      const eq = (mm, c0) => `y = ${mm === 0 ? '' : (mm === 1 ? '' : mm === -1 ? '−' : nice(mm)) + 'x'}${c0 === 0 ? (mm === 0 ? '0' : '') : (mm === 0 ? nice(c0) : (c0 > 0 ? ' + ' : ' − ') + nice(Math.abs(c0)))}`;
      function draw() {
        if (two) fromPts();
        let s = '<g stroke="currentColor" stroke-opacity=".12" stroke-width=".05">'; for (let i = -9; i <= 9; i++) s += `<path d="M${i} -10V10M-10 ${i}H10"/>`; s += '</g><path d="M-10 0H10M0 -10V10" stroke="currentColor" stroke-opacity=".5" stroke-width=".08"/>';
        if (target) s += `<path d="M-10 ${-(target.m * -10 + target.c)}L10 ${-(target.m * 10 + target.c)}" stroke="var(--warn)" stroke-width=".18" stroke-dasharray=".5 .4"/>`;
        s += `<path d="M-10 ${-(m * -10 + cc)}L10 ${-(m * 10 + cc)}" stroke="var(--accent)" stroke-width=".22"/><circle cx="0" cy="${-cc}" r=".3" fill="var(--accent)"/>`;
        if (!two && Math.abs(m) <= 5) s += `<path d="M1 ${-(m + cc)}H2V${-(2 * m + cc)}" fill="none" stroke="currentColor" stroke-width=".1" stroke-dasharray=".25 .2"/><text x="1.2" y="${-(m + cc) + (m >= 0 ? 0.8 : -0.4)}" font-size=".7" fill="currentColor">1</text><text x="2.2" y="${-(1.5 * m + cc)}" font-size=".7" fill="currentColor">${nice(m)}</text>`;
        if (two) { s += `<path d="M${A[0]} ${-A[1]}H${B[0]}V${-B[1]}" fill="none" stroke="currentColor" stroke-width=".1" stroke-dasharray=".25 .2"/><text x="${(A[0] + B[0]) / 2}" y="${-A[1] + 0.9}" font-size=".7" fill="currentColor">run ${nice(B[0] - A[0])}</text><text x="${B[0] + 0.3}" y="${-(A[1] + B[1]) / 2}" font-size=".7" fill="currentColor">rise ${nice(B[1] - A[1])}</text>`; [['A', A], ['B', B]].forEach(([n, p]) => { s += `<g class="at-lb__pt" data-pt="${n}" tabindex="0" role="slider" aria-label="${T('Point', 'نقطة')} ${n} (${p[0]}, ${p[1]}) — ${T('arrow keys move it', 'حرّكها بالأسهم')}" aria-valuetext="(${p[0]}, ${p[1]})"><circle cx="${p[0]}" cy="${-p[1]}" r=".75" fill="transparent"/><circle cx="${p[0]}" cy="${-p[1]}" r=".38" fill="var(--ink)"/><text x="${p[0] + 0.5}" y="${-p[1] - 0.5}" font-size=".75" fill="currentColor">${n}(${p[0]}, ${p[1]})</text></g>`; }); }
        svg.innerHTML = s; svg.setAttribute('aria-label', `${T('Graph of', 'منحنى')} ${eq(m, cc)}`);
        host.querySelector('.at-lb__eq').innerHTML = `<b>${eq(m, cc)}</b>${two ? ` · m = ${nice(B[1] - A[1])} ÷ ${nice(B[0] - A[0])}` : ''}${target ? ` · ${T('target', 'الهدف')}: ${T('the dashed line', 'الخط المتقطع')}` : ''}`;
      }
      const setS = () => { ['m', 'c'].forEach(k => { const v = k === 'm' ? m : cc; const el = host.querySelector(`[data-s="${k}"]`); el.value = v; el.disabled = two; host.querySelector(`[data-o="${k}"]`).textContent = nice(v); }); };
      host.addEventListener('input', e => { const sl = e.target.closest('[data-s]'); if (sl) { if (sl.dataset.s === 'm') m = +sl.value; else cc = +sl.value; host.querySelector(`[data-o="${sl.dataset.s}"]`).textContent = nice(+sl.value); draw(); check(); c.onChange(); } if (e.target.matches('[data-two]')) { two = e.target.checked; if (two) { A = [-4, Math.round(m * -4 + cc)]; B = [3, Math.round(m * 3 + cc)]; A[1] = Math.max(-9, Math.min(9, A[1])); B[1] = Math.max(-9, Math.min(9, B[1])); } draw(); setS(); c.onChange(); } });
      const toPt = e => { const r = svg.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 20 - 10), Math.round(-((e.clientY - r.top) / r.height * 20 - 10))]; };
      svg.addEventListener('pointerdown', e => { const p = e.target.closest('[data-pt]'); if (!p) return; drag = p.dataset.pt; svg.setPointerCapture(e.pointerId); });
      svg.addEventListener('pointermove', e => { if (!drag) return; const p = toPt(e).map(v => Math.max(-9, Math.min(9, v))); if (drag === 'A') { if (p[0] !== B[0]) A = p; } else if (p[0] !== A[0]) B = p; draw(); setS(); });
      svg.addEventListener('pointerup', () => { if (drag) { drag = null; check(); c.onChange(); } });
      svg.addEventListener('keydown', e => { const p = e.target.closest('[data-pt]'); if (!p) return; const P = p.dataset.pt === 'A' ? A : B, d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]; if (!d) return; e.preventDefault(); const np = [Math.max(-9, Math.min(9, P[0] + d[0])), Math.max(-9, Math.min(9, P[1] + d[1]))]; const other = p.dataset.pt === 'A' ? B : A; if (np[0] === other[0]) return; if (p.dataset.pt === 'A') A = np; else B = np; draw(); setS(); check(); svg.querySelector(`[data-pt="${p.dataset.pt}"]`).focus(); });
      function check() { if (!target) return; tries++; if (Math.abs(m - target.m) < 1e-9 && Math.abs(cc - target.c) < 1e-9) { LS.toast(T('Matched! ', 'تطابق! ') + eq(m, cc)); LS.engine.event('experience-success', { id: 'line-builder', objs: ['math-linear:0', 'math-linear:1'], label: 'Matched a line' }); target = null; draw(); } }
      host.querySelector('[data-chal]').addEventListener('click', () => { const ms = [-3, -2, -1, -0.5, 0.5, 1, 2, 3]; target = { m: ms[Math.floor(Math.random() * ms.length)], c: Math.floor(Math.random() * 9) - 4 }; tries = 0; draw(); LS.announce(T('A dashed target line appeared. Change m and c to match it.', 'ظهر خط هدف متقطع.')); });
      draw(); setS();
      return { reset() { m = 1; cc = 1; two = false; target = null; host.querySelector('[data-two]').checked = false; setS(); draw(); }, preset() { m = 1; cc = 1; setS(); draw(); },
        observe() { return { text: `The line is **${eq(m, cc)}**: for every 1 step right it goes ${m >= 0 ? 'up' : 'down'} **${nice(Math.abs(m))}**, and it crosses the y-axis at **(0, ${nice(cc)})**.`, predOk: m === -1 ? p => p === 0 : null }; } };
    }
  };
})();
