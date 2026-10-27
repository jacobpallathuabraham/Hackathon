/* ERLY — Growth Plan page: intake consult → plan → daily sessions → weekly
   consult. Stored on this device only ("erly-growth-v1"): choices, scores and
   dates — never anything typed into an exercise. */
(function () {
  'use strict';
  const G = window.ERLY_GROWTH, GAMES = window.ERLY_GROWTH_GAMES;
  const app = document.getElementById('growthApp');
  if (!G || !GAMES || !app) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const P = p => T(p[0], p[1]);
  const L = () => (I18N.lang === 'ar' ? 'ar' : 'en');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'erly-growth-v1';
  const FAST = /[?&]fast=1/.test(location.search); // test hook: shortens timers only

  let S = null;
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } };
  const now = () => Date.now() + ((S && S.demoDays) || 0) * 864e5;

  /* ---------- what the rest of ERLY suggests ---------- */
  function suggested() {
    const out = new Set();
    try { const tr = JSON.parse(localStorage.getItem('erly-track-v2') || '{}'); if (tr.status === 'ended' && tr.summary) (tr.summary.flaggedAreas || []).forEach(a => out.add({ reading: 'reading', language: 'reading', executive: 'attention', strain: 'wellbeing' }[a])); } catch (e) { /* none */ }
    try { const an = JSON.parse(localStorage.getItem('erly-analyser-v1') || '{}'); Object.entries(an.interviews || {}).forEach(([a, r]) => { if (r && (r.level === 'some' || r.level === 'strong') && G.AREAS[a]) out.add(a); }); } catch (e) { /* none */ }
    try { const hw = JSON.parse(localStorage.getItem('erly-hand-v1') || 'null'); if (hw && hw.level === 'several') out.add('writing'); if (hw && hw.spelling === 'notable') out.add('reading'); } catch (e) { /* none */ }
    out.delete(undefined);
    return [...out];
  }

  /* ---------- the intake consult ---------- */
  const NOOR = `<span class="gx-noor" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="var(--accent)"/><circle cx="23" cy="28" r="4" fill="#fff"/><circle cx="41" cy="28" r="4" fill="#fff"/><circle cx="23" cy="29" r="2" fill="#1b1915"/><circle cx="41" cy="29" r="2" fill="#1b1915"/><path d="M22 41c6 6 14 6 20 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg></span>`;
  let I = null;
  function intake() {
    I = I || { step: 0, areas: suggested().slice(0, 3), goals: {}, minutes: 15, when: 'pm', tried: [] };
    const sug = suggested();
    const steps = [
      () => bubble(T('Hi, I’m Noor. Think of this as a first appointment with a learning specialist. I’ll ask a few questions, then build you a six-week plan of short daily exercises and strategies. We go slowly — a little every day works better than a lot once in a while.', 'أهلاً، أنا نور. اعتبر هذا موعداً أول مع أخصائي تعلّم. سأطرح بعض الأسئلة ثم أبني لك خطة من ستة أسابيع من تمارين واستراتيجيات يومية قصيرة. نسير ببطء — القليل كل يوم أنفع من الكثير أحياناً.'), `<p class="gx-small">${T('This builds skills and habits. It complements — never replaces — support from SAS, a specialist tutor or a clinician.', 'هذا يبني المهارات والعادات. إنه يكمّل — ولا يحل محل — دعم خدمات الطلبة أو المدرّس المتخصص أو الطبيب.')}</p><button class="btn btn--accent" data-next>${T('Let’s begin', 'لنبدأ')} →</button>`),
      () => bubble(T('What would you like to work on? Choose up to three.', 'على ماذا تود العمل؟ اختر حتى ثلاثة.'), `<div class="gx-areas">${Object.entries(G.AREAS).map(([k, a], n) => `<button class="gx-area ${I.areas.includes(k) ? 'is-on' : ''}" data-area="${k}" style="--c:${a.color};--k:${n}"><span>${ICON(a.icon)}</span><b>${P(a.name)}</b>${sug.includes(k) ? `<em>${T('from your evidence', 'من دلائلك')}</em>` : ''}</button>`).join('')}</div><button class="btn btn--accent" data-next ${I.areas.length ? '' : 'disabled'}>${T('Next', 'التالي')} →</button>`),
      () => bubble(T('For each one, which goal fits you best? Specific goals are easier to reach.', 'لكل واحد، أي هدف يناسبك أكثر؟ الأهداف المحددة أسهل في التحقيق.'), I.areas.map(a => `<div class="gx-goalset"><p><b style="color:${G.AREAS[a].color}">${P(G.AREAS[a].name)}</b></p>${G.AREAS[a].goals.map((g, k) => `<button class="gx-goal ${(I.goals[a] || 0) === k ? 'is-on' : ''}" data-goal="${a}:${k}">${P(g)}</button>`).join('')}</div>`).join('') + `<button class="btn btn--accent" data-next>${T('Next', 'التالي')} →</button>`),
      () => bubble(T('How much time can you give it on a normal day?', 'كم من الوقت تستطيع منحه في يوم عادي؟'), `<div class="gx-pills">${[10, 15, 20, 30].map(m => `<button class="${I.minutes === m ? 'is-on' : ''}" data-min="${m}">${m} ${T('min', 'د')}</button>`).join('')}</div><p class="gx-small">${T('Be realistic — you can change it at each weekly review.', 'كن واقعياً — يمكنك تغييره في كل مراجعة أسبوعية.')}</p><button class="btn btn--accent" data-next>${T('Next', 'التالي')} →</button>`),
      () => bubble(T('When do you usually study best?', 'متى تذاكر عادةً بشكل أفضل؟'), `<div class="gx-pills">${[['am', T('Morning', 'الصباح')], ['pm', T('Afternoon', 'الظهيرة')], ['eve', T('Evening', 'المساء')], ['late', T('Late night', 'آخر الليل')]].map(([v, l]) => `<button class="${I.when === v ? 'is-on' : ''}" data-when="${v}">${l}</button>`).join('')}</div>${I.when === 'late' ? `<p class="gx-small">${T('Noted. We’ll try nudging sessions a little earlier — sleep is when learning sticks.', 'تم. سنحاول تقديم الجلسات قليلاً — ففي النوم يثبت التعلّم.')}</p>` : ''}<button class="btn btn--accent" data-next>${T('Next', 'التالي')} →</button>`),
      () => bubble(T('What have you already tried? This helps me avoid repeating what didn’t work.', 'ما الذي جربته من قبل؟ يساعدني هذا على تجنّب تكرار ما لم ينجح.'), `<div class="gx-pills gx-pills--wrap">${[['tts', T('Read-aloud', 'القراءة الصوتية')], ['planner', T('Planners & to-do lists', 'المخططات وقوائم المهام')], ['timer', T('Timers', 'المؤقتات')], ['tutor', T('A tutor', 'مدرّس')], ['time', T('Extra time', 'وقت إضافي')], ['none', T('Nothing yet', 'لا شيء بعد')]].map(([v, l]) => `<button class="${I.tried.includes(v) ? 'is-on' : ''}" data-tried="${v}">${l}</button>`).join('')}</div><button class="btn btn--accent" data-next>${T('See my plan', 'اعرض خطتي')} →</button>`),
      () => { const plan = G.buildPlan(I); return bubble(T('Here’s your plan. Six weeks, about ' + plan.minutes + ' minutes a day, five days a week. Each week ends with a short review where we adjust things together.', 'هذه خطتك. ستة أسابيع، نحو ' + plan.minutes + ' دقيقة يومياً، خمسة أيام في الأسبوع. ينتهي كل أسبوع بمراجعة قصيرة نعدّل فيها الأمور معاً.'), `<div class="gx-goals">${plan.goals.map(g => `<div class="gx-goalcard" style="--c:${G.AREAS[g.area].color}"><small>${P(G.AREAS[g.area].name)} · ${T('goal', 'الهدف')}</small><b>${P(g.text)}</b></div>`).join('')}</div><ol class="gx-weeks">${plan.weeks.map(w => `<li style="--k:${w.n}"><i>${w.n}</i><span>${w.themes.map(t => P(t.theme)).join(' · ')}</span></li>`).join('')}</ol><button class="btn btn--accent btn--big" data-startplan>${T('Start my Growth Plan', 'ابدأ خطة النمو')} →</button>`); }
    ];
    app.innerHTML = `<div class="gx"><div class="gx-prog"><i style="width:${(I.step + 1) / steps.length * 100}%"></i></div>${steps[I.step]()}</div>`;
  }
  function bubble(text, body) { return `<div class="gx-turn" key="${I.step}">${NOOR}<div class="gx-bub"><p>${esc(text)}</p></div></div><div class="gx-body">${body}</div>`; }

  /* ---------- the dashboard ---------- */
  function dash() {
    const plan = S.plan, pr = G.progress(S.sessions, S.start, now());
    const sess = G.sessionFor(plan, pr.week, S.sessions.length);
    const lv = G.levelOf(S.xp || 0);
    const st = G.streak(S.sessions.map(s => s.date), now());
    const C = 2 * Math.PI * 34;
    const needConsult = pr.week > 1 && !(S.consults || []).some(c => c.week === pr.week - 1);
    app.innerHTML = `
      <section class="gd-top">
        <div class="gd-stat gd-stat--lvl"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34"/><circle cx="40" cy="40" r="34" class="gd-arc" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - (lv.xp - lv.from) / (lv.to - lv.from))}"/></svg><b>${lv.level}</b><span>${T('level', 'المستوى')} · ${lv.xp} XP</span></div>
        <div class="gd-stat"><span class="gd-flame ${st ? 'is-on' : ''}">${ICON('flame')}</span><b>${st}</b><span>${T('day streak', 'أيام متتالية')}</span></div>
        <div class="gd-stat"><span class="gd-ic">${ICON('calendar')}</span><b>${pr.week}<small>/6</small></b><span>${T('week', 'الأسبوع')} · ${pr.inWeek}/${pr.perWeek} ${T('sessions', 'جلسات')}</span></div>
        <div class="gd-stat"><span class="gd-ic">${ICON('check')}</span><b>${pr.total}</b><span>${T('sessions done', 'جلسات منجزة')}</span></div>
      </section>
      ${needConsult ? `<section class="gd-consult-cta">${NOOR}<div><b>${T(`Week ${pr.week - 1} review with Noor`, `مراجعة الأسبوع ${pr.week - 1} مع نور`)}</b><p>${T('Four quick questions, like a check-up. I’ll adjust next week to fit how it’s going.', 'أربعة أسئلة سريعة، كالمراجعة الدورية. سأعدّل الأسبوع القادم ليناسب سير الأمور.')}</p></div><button class="btn btn--accent btn--sm" data-consult="${pr.week - 1}">${T('Start the review', 'ابدأ المراجعة')}</button></section>` : ''}
      <section class="gd-today ${pr.doneToday ? 'is-done' : ''}">
        <div class="gd-today__copy">
          <p class="mono gd-k">${pr.finished ? T('Plan complete', 'اكتملت الخطة') : pr.doneToday ? T('Done for today', 'انتهى اليوم') : T('Today’s session', 'جلسة اليوم')} · ${T('week', 'الأسبوع')} ${pr.week} · ${P(plan.weeks[pr.week - 1].themes[0].theme)}</p>
          <h2>${pr.finished ? T('You finished all six weeks. That took real consistency.', 'أنهيت الأسابيع الستة كلها. تطلّب ذلك مثابرة حقيقية.') : pr.doneToday ? T('Nice work. Come back tomorrow — spacing is what makes it stick.', 'عمل رائع. عد غداً — التباعد هو ما يجعله يثبت.') : T(`About ${sess.minutes} minutes. ${sess.games.length} short exercises.`, `نحو ${sess.minutes} دقيقة. ${sess.games.length} تمارين قصيرة.`)}</h2>
          <div class="gd-chips">${sess.games.map((id, k) => { const g = G.game(id); return `<span style="--c:${G.AREAS[g.area].color};--k:${k}">${ICON(G.AREAS[g.area].icon)} ${P(g.name)}</span>`; }).join('')}</div>
          ${pr.finished ? `<a class="btn btn--accent" href="student.html#handoff">${T('Share progress with SAS', 'شارك التقدّم مع خدمات الطلبة')}</a>` : pr.doneToday ? `<p class="gx-small">${T('One plan session counts per day. You can still practise anything in the library below.', 'تُحتسب جلسة خطة واحدة يومياً. ويمكنك التدرّب على أي شيء في المكتبة أدناه.')}</p>` : `<button class="btn btn--accent btn--big gd-go" data-session>${ICON('rocket')} ${T('Start today’s session', 'ابدأ جلسة اليوم')}</button>`}
        </div>
        <div class="gd-path" aria-hidden="true">${Array.from({ length: 30 }, (_, k) => { const n = k + 1; const done = n <= pr.total; return `<i class="${done ? 'is-done' : n === pr.total + 1 ? 'is-next' : ''}" style="--k:${k}"></i>`; }).join('')}</div>
      </section>
      <section class="gd-grid">
        <div class="gd-card"><h3>${T('Your six weeks', 'أسابيعك الستة')}</h3><ol class="gd-weeks">${plan.weeks.map(w => `<li class="${w.n < pr.week ? 'is-done' : w.n === pr.week ? 'is-on' : 'is-lock'}" style="--k:${w.n}"><i>${w.n < pr.week ? ICON('check') : w.n}</i><div><b>${w.themes.map(t => P(t.theme)).join(' · ')}</b><small>${w.games.map(id => P(G.game(id).name)).join(', ')}</small></div></li>`).join('')}</ol></div>
        <div class="gd-card"><h3>${T('Goals', 'الأهداف')}</h3>${plan.goals.map(g => `<div class="gx-goalcard" style="--c:${G.AREAS[g.area].color}"><small>${P(G.AREAS[g.area].name)}</small><b>${P(g.text)}</b></div>`).join('')}
          <h3 class="gd-h3">${T('Skills', 'المهارات')}</h3>${plan.areas.map(a => skillRow(a)).join('')}</div>
      </section>
      ${(S.consults || []).length ? `<section class="gd-card gd-notes"><h3>${T('Consult notes', 'ملاحظات المراجعات')}</h3>${S.consults.slice().reverse().map(c => `<div class="gd-note"><b>${T('Week', 'الأسبوع')} ${c.week} · ${new Date(c.at).toLocaleDateString(L() === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short' })}</b><ul>${c.changes.concat(c.notes).map(x => `<li>${esc(P(x))}</li>`).join('')}</ul></div>`).join('')}</section>` : ''}
      <section class="gd-card gd-lib"><h3>${T('Exercise library', 'مكتبة التمارين')}</h3><p class="gx-small">${T('Practise anything, any time. Practice earns a little XP but doesn’t count as a plan session.', 'تدرّب على أي شيء في أي وقت. يمنحك التدريب نقاطاً قليلة لكنه لا يُحتسب جلسة خطة.')}</p>
        <div class="gd-libgrid">${G.GAMES.map((g, k) => `<button class="gd-game" data-play="${g.id}" style="--c:${G.AREAS[g.area].color};--k:${k}"><span>${ICON(G.AREAS[g.area].icon)}</span><b>${P(g.name)}</b><small>${P(g.desc)} · ~${g.mins} ${T('min', 'د')}</small><em>${T('Level', 'المستوى')} ${(S.levels || {})[g.area] || 1}</em></button>`).join('')}</div></section>
      <section class="gd-foot">
        <p class="gx-small">${ICON('shield')} ${T('Stored only on this device: your choices, scores and dates. Nothing you type into an exercise is kept.', 'يُحفظ على هذا الجهاز فقط: اختياراتك ودرجاتك والتواريخ. لا يُحفظ شيء تكتبه في التمارين.')}</p>
        <div class="gd-demo"><span class="mono">${T('Demo', 'عرض')}</span><button class="btn btn--xs btn--ghost" data-skipday>${T('Skip to tomorrow', 'انتقل إلى الغد')}</button><button class="btn btn--xs btn--stop" data-reset>${T('Reset plan', 'أعد ضبط الخطة')}</button></div>
      </section>`;
  }
  function skillRow(a) {
    const xs = ((S.scores || {})[a] || []).slice(-12);
    const pts = xs.map((v, k) => `${xs.length < 2 ? 50 : k / (xs.length - 1) * 100},${30 - v * 26}`).join(' ');
    return `<div class="gd-skill" style="--c:${G.AREAS[a].color}"><span>${ICON(G.AREAS[a].icon)} ${P(G.AREAS[a].name)}</span><svg viewBox="0 0 100 32" preserveAspectRatio="none">${xs.length ? `<polyline points="${pts}"/>` : `<line x1="0" y1="30" x2="100" y2="30"/>`}</svg><b class="mono">L${(S.levels || {})[a] || 1}</b></div>`;
  }

  /* ---------- the session player ---------- */
  let player = null;
  async function play(ids, mode) {
    player = document.createElement('div');
    player.className = 'gp';
    player.innerHTML = `<div class="gp__top"><div class="gp__pills">${ids.map((id, k) => `<i data-k="${k}"><b style="--c:${G.AREAS[G.game(id).area].color}"></b></i>`).join('')}</div><button class="btn btn--xs btn--ghost" data-skipgame>${T('Skip', 'تخطٍّ')}</button><button class="icon-btn" data-quit aria-label="${T('Close', 'إغلاق')}">${ICON('x')}</button></div><div class="gp__stage" id="gpStage"></div>`;
    document.body.appendChild(player); document.body.classList.add('gp-lock');
    requestAnimationFrame(() => player.classList.add('is-on'));
    let quit = false;
    player.querySelector('[data-quit]').onclick = () => { quit = true; closePlayer(); };
    const results = [];
    for (let k = 0; k < ids.length && !quit; k++) {
      const g = G.game(ids[k]), stage = $('#gpStage', player);
      player.querySelectorAll('.gp__pills i').forEach((p, n) => { p.classList.toggle('is-on', n === k); p.classList.toggle('is-done', n < k); });
      stage.innerHTML = `<div class="gp-intro" style="--c:${G.AREAS[g.area].color}"><span>${ICON(G.AREAS[g.area].icon)}</span><small>${P(G.AREAS[g.area].name)} · ${k + 1}/${ids.length}</small><h2>${P(g.name)}</h2><p>${P(g.desc)}</p></div>`;
      await new Promise(r => setTimeout(r, reduce || FAST ? 80 : 1300));
      if (quit) break;
      stage.innerHTML = ''; stage.classList.remove('gp-in'); void stage.offsetWidth; stage.classList.add('gp-in');
      const level = (S.levels || {})[g.area] || 1;
      const skip = new Promise(r => { player.querySelector('[data-skipgame]').onclick = () => r(null); });
      const score = await Promise.race([GAMES[g.id](stage, { level, lang: L(), seed: (Date.now() & 0xffff) + k * 97, fast: FAST }), skip]);
      if (quit) break;
      results.push({ id: g.id, area: g.area, score });
    }
    if (quit) return;
    try { speechSynthesis.cancel(); } catch (e) { /* none */ }
    finishSession(results, mode);
  }
  function closePlayer() { if (!player) return; try { speechSynthesis.cancel(); } catch (e) { /* none */ } const p = player; player = null; p.classList.remove('is-on'); document.body.classList.remove('gp-lock'); setTimeout(() => p.remove(), reduce ? 0 : 350); }
  function finishSession(results, mode) {
    let gained = 0;
    S.scores = S.scores || {}; S.levels = S.levels || {};
    const before = Object.assign({}, S.levels);
    results.forEach(r => {
      if (r.score == null) return;
      gained += mode === 'plan' ? G.xpFor(r.score) : Math.round(G.xpFor(r.score) / 3);
      (S.scores[r.area] = S.scores[r.area] || []).push(+r.score.toFixed(2));
      S.scores[r.area] = S.scores[r.area].slice(-30);
      S.levels[r.area] = G.adapt(S.levels[r.area] || 1, S.scores[r.area]);
    });
    const lvBefore = G.levelOf(S.xp || 0).level;
    S.xp = (S.xp || 0) + gained;
    if (mode === 'plan') { const pr = G.progress(S.sessions, S.start, now()); S.sessions.push({ date: G.dateKey(now()), week: pr.week, at: new Date(now()).toISOString(), games: results.map(r => ({ id: r.id, s: r.score == null ? null : +r.score.toFixed(2) })) }); }
    save();
    const up = Object.keys(S.levels).filter(a => S.levels[a] > (before[a] || 1));
    const lvUp = G.levelOf(S.xp).level > lvBefore;
    const stage = $('#gpStage', player);
    player.querySelectorAll('.gp__pills i').forEach(p => p.classList.add('is-done'));
    const sk = player.querySelector('[data-skipgame]'); if (sk) sk.hidden = true;
    stage.innerHTML = `<div class="gp-end"><div class="gp-end__burst">${ICON('star')}</div><h2>${mode === 'plan' ? T('Session complete!', 'اكتملت الجلسة!') : T('Practice done!', 'انتهى التدريب!')}</h2>
      <p class="gp-end__xp">+<b data-xp>0</b> XP${lvUp ? ` · <em>${T('Level up!', 'ارتقيت مستوى!')}</em>` : ''}</p>
      <ul class="gp-end__list">${results.map((r, k) => `<li style="--k:${k}"><span>${P(G.game(r.id).name)}</span><i style="--w:${r.score == null ? 0 : r.score}"></i><b>${r.score == null ? T('skipped', 'تخطٍّ') : r.score >= 0.85 ? T('great', 'ممتاز') : r.score >= 0.5 ? T('good', 'جيد') : T('keep going', 'استمر')}</b></li>`).join('')}</ul>
      ${up.length ? `<p class="gx-small">${ICON('sparkle')} ${T('Stepping up a level in', 'ترتقي مستوى في')}: ${up.map(a => P(G.AREAS[a].name)).join(', ')}</p>` : ''}
      <button class="btn btn--accent" data-close>${T('Back to my plan', 'العودة إلى خطتي')}</button></div>`;
    const xpEl = stage.querySelector('[data-xp]'), t0 = performance.now();
    (function f(t) { const k = Math.min(1, (t - t0) / 900); xpEl.textContent = Math.round(gained * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
    if (window.FUN && FUN.confetti) FUN.confetti(stage.querySelector('.gp-end__burst'), 70);
    stage.querySelector('[data-close]').onclick = () => { closePlayer(); render(); };
  }

  /* ---------- the weekly consult ---------- */
  function consult(week) {
    const W = S.plan.weeks[week - 1], A = {};
    const box = document.createElement('div'); box.className = 'gp gc'; document.body.appendChild(box); document.body.classList.add('gp-lock');
    requestAnimationFrame(() => box.classList.add('is-on'));
    const Q = [
      ['feel', T(`How did week ${week} feel overall?`, `كيف كان الأسبوع ${week} إجمالاً؟`), [1, 2, 3, 4, 5].map(n => [n, String(n)]), [T('Rough', 'صعب'), T('Great', 'رائع')]],
      ['helped', T('Which exercise helped most?', 'أي تمرين ساعد أكثر؟'), W.games.map(id => [id, P(G.game(id).name)])],
      ['barrier', T('What got in the way most?', 'ما الذي أعاق أكثر؟'), [['time', T('Not enough time', 'وقت غير كافٍ')], ['energy', T('Low energy', 'طاقة منخفضة')], ['hard', T('Too hard', 'صعب جداً')], ['easy', T('Too easy', 'سهل جداً')], ['none', T('Nothing really', 'لا شيء تقريباً')]]],
      ['mood', T('And your mood this week?', 'ومزاجك هذا الأسبوع؟'), [1, 2, 3, 4, 5].map(n => [n, String(n)]), [T('Low', 'منخفض'), T('Good', 'جيد')]]
    ];
    let k = 0;
    const show = () => {
      if (k >= Q.length) return finish();
      const [id, q, opts, ends] = Q[k];
      box.innerHTML = `<div class="gp__top"><div class="gp__pills">${Q.map((_, n) => `<i class="${n < k ? 'is-done' : n === k ? 'is-on' : ''}"><b></b></i>`).join('')}</div><button class="icon-btn" data-quit aria-label="${T('Close', 'إغلاق')}">${ICON('x')}</button></div>
        <div class="gp__stage gp-in"><div class="gx-turn">${NOOR}<div class="gx-bub"><p>${esc(q)}</p></div></div><div class="gc-opts ${ends ? 'gc-opts--num' : ''}">${opts.map(([v, l]) => `<button data-v="${v}">${esc(l)}</button>`).join('')}</div>${ends ? `<div class="gg-ends small muted"><span>${ends[0]}</span><span>${ends[1]}</span></div>` : ''}</div>`;
      box.querySelector('[data-quit]').onclick = close;
      $$('[data-v]', box).forEach(b => b.onclick = () => { b.classList.add('is-on'); A[id] = /^\d+$/.test(b.dataset.v) ? +b.dataset.v : b.dataset.v; k++; setTimeout(show, 280); });
    };
    const close = () => { box.classList.remove('is-on'); document.body.classList.remove('gp-lock'); setTimeout(() => box.remove(), 300); };
    const finish = () => {
      const r = G.consult(S.plan, S.levels || {}, A);
      S.levels = r.levels; S.plan.minutes = r.minutes;
      (S.consults = S.consults || []).push({ week, at: Date.now(), answers: A, changes: r.changes, notes: r.notes, referral: r.referral });
      save();
      box.innerHTML = `<div class="gp__stage gp-in"><div class="gc-note"><p class="mono gd-k">${T('Consult notes', 'ملاحظات المراجعة')} · ${T('week', 'الأسبوع')} ${week}</p><h2>${T('Here’s what we’ll change', 'إليك ما سنغيّره')}</h2><ul>${r.changes.map(x => `<li>${ICON('check')} ${esc(P(x))}</li>`).join('')}</ul>${r.notes.length ? `<ul class="gc-obs">${r.notes.map(x => `<li>${esc(P(x))}</li>`).join('')}</ul>` : ''}${r.referral ? `<a class="btn btn--sm btn--ghost" href="student.html#handoff">${T('Talk to a counsellor', 'تحدّث مع مرشد')}</a>` : ''}<button class="btn btn--accent" data-done>${T('Continue', 'متابعة')}</button></div></div>`;
      box.querySelector('[data-done]').onclick = () => { close(); render(); };
    };
    show();
  }

  /* ---------- events ---------- */
  app.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (!S) {
      if (b.dataset.area) { const a = b.dataset.area; I.areas.includes(a) ? I.areas.splice(I.areas.indexOf(a), 1) : I.areas.length < 3 && I.areas.push(a); return intake(); }
      if (b.dataset.goal) { const [a, k] = b.dataset.goal.split(':'); I.goals[a] = +k; return intake(); }
      if (b.dataset.min) { I.minutes = +b.dataset.min; return intake(); }
      if (b.dataset.when) { I.when = b.dataset.when; return intake(); }
      if (b.dataset.tried) { const v = b.dataset.tried; I.tried.includes(v) ? I.tried.splice(I.tried.indexOf(v), 1) : I.tried.push(v); return intake(); }
      if (b.hasAttribute('data-next')) { I.step++; return intake(); }
      if (b.hasAttribute('data-startplan')) {
        S = { v: 1, intake: I, plan: G.buildPlan(I), start: Date.now(), sessions: [], xp: 0, levels: {}, scores: {}, consults: [], demoDays: 0 };
        save(); if (window.FUN && FUN.confetti) FUN.confetti(b, 60);
        return setTimeout(render, reduce ? 0 : 500);
      }
      return;
    }
    if (b.hasAttribute('data-session')) { const pr = G.progress(S.sessions, S.start, now()); if (pr.doneToday) return; return play(G.sessionFor(S.plan, pr.week, S.sessions.length).games, 'plan'); }
    if (b.dataset.play) return play([b.dataset.play], 'practice');
    if (b.dataset.consult) return consult(+b.dataset.consult);
    if (b.hasAttribute('data-skipday')) { S.demoDays = (S.demoDays || 0) + 1; save(); ERLY.toast(T('Demo: moved to the next day.', 'عرض: انتقلت إلى اليوم التالي.')); return render(); }
    if (b.hasAttribute('data-reset')) { if (!confirm(T('Delete your Growth Plan and all its progress?', 'حذف خطة النمو وكل تقدّمها؟'))) return; S = null; I = null; try { localStorage.removeItem(KEY); } catch (err) { /* none */ } return render(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && player) closePlayer(); });

  function render() { if (!S) intake(); else dash(); }
  I18N.onChange && I18N.onChange(render);
  render();
})();
