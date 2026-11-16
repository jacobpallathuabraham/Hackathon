/* ERLY — Growth Plan v20 interface.
   Dashboard (today, journey, goals, reviews) → add a programme (goals, custom goals, configuration) → daily session
   workspace (interactive activities with feedback, optional breaks, a short reflection) → weekly review (adjust the
   plan) → programme page (pause, resume, change, restart, remove) → history. The v18 timetable stays available as a
   tab. Storage: only after the student chooses "Save on this device" (key erly-growth-v20); "Just this visit" keeps
   everything in memory. Nothing is sent anywhere. The tone is deliberately neutral: an un-done session is "open",
   never "missed" or "failed", and there are no streaks, ranks or ability scores. */
(function () {
  'use strict';
  const G = window.ERLY_GROWTH, app = document.getElementById('gpApp');
  if (!G || !app) return;
  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ICON = k => (window.ICON ? window.ICON(k) : '');
  const KEY = 'erly-growth-v20';
  const today = () => window.__growthToday || G.iso(new Date());
  const DN = { mon: ['Mon', 'الاثنين'], tue: ['Tue', 'الثلاثاء'], wed: ['Wed', 'الأربعاء'], thu: ['Thu', 'الخميس'], fri: ['Fri', 'الجمعة'], sat: ['Sat', 'السبت'], sun: ['Sun', 'الأحد'] };
  const fmt = d => { try { return d === today() ? T('Today', 'اليوم') : new Date(d + 'T12:00').toLocaleDateString(window.I18N && I18N.lang === 'ar' ? 'ar' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d; } };
  const toast = m => (window.ERLY && ERLY.toast ? ERLY.toast(m) : null);

  let consent = null, S = null;
  try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && raw.v === 20) { S = raw; consent = 'device'; } } catch (e) { /* storage blocked */ }
  const save = () => { if (consent === 'device' && S) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* kept for this visit */ } } };
  const ensure = () => { if (!S) S = G.empty(); return S; };
  const active = () => (S ? Object.values(S.programmes) : []);
  let run = null; // the session in progress: { pid, date, list, i, results, phase }

  /* ---------- routing ---------- */
  const route = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  const go = h => { if (location.hash === '#/' + h) render(); else location.hash = '#/' + h; };
  window.addEventListener('hashchange', () => render(true));

  function tabs(cur) {
    const L = [['home', T('Today', 'اليوم')], ['journey', T('Journey', 'الرحلة')], ['programmes', T('Programmes', 'البرامج')], ['history', T('History', 'السجل')], ['timetable', T('Timetable', 'الجدول')]];
    return `<nav class="gp-tabs" aria-label="${T('Growth Plan sections', 'أقسام خطة النمو')}">${L.map(([k, l]) => `<a href="#/${k}" ${cur === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
  }
  function render(focus) {
    const [r, a, b] = route();
    const tt = document.getElementById('growthApp'); if (tt) tt.hidden = r !== 'timetable';
    if (r === 'timetable') { app.innerHTML = tabs('timetable') + `<p class="gp-sub gp-tt-note">${T('The weekly timetable plans study sessions around your commitments. It is separate from the programmes and keeps its own data.', 'الجدول الأسبوعي يخطط لجلسات الدراسة حول التزاماتك، وهو منفصل عن البرامج.')}</p>`; return; }
    if (!consent) return firstVisit();
    const v = { home, journey, programmes, history, new: add, edit, p: detail, do: work, review }[r] || home;
    app.innerHTML = v(a, b);
    if (r === 'do') mountWork();
    if (focus) { const h = app.querySelector('h1, h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' }); }
  }

  /* ---------- first visit: a compact privacy choice ---------- */
  function firstVisit() {
    app.innerHTML = `<section class="gp-first" aria-labelledby="gpFirstH"><h2 id="gpFirstH">${T('Before you start: where should your plan live?', 'قبل البدء: أين تُحفظ خطتك؟')}</h2>
      <p>${T('Your goals, activity answers and reflections can be saved on this device so you can come back to them, or kept just for this visit. Either way nothing is sent to anyone.', 'يمكن حفظ أهدافك وإجاباتك وتأملاتك على هذا الجهاز، أو الاحتفاظ بها لهذه الزيارة فقط. لا يُرسل شيء لأحد.')}</p>
      <div class="gp-row"><button type="button" class="btn btn--accent" data-consent="device">${T('Save on this device', 'احفظ على هذا الجهاز')}</button><button type="button" class="btn btn--ghost" data-consent="visit">${T('Just this visit', 'لهذه الزيارة فقط')}</button></div>
      <p class="gp-sub">${T('You can delete everything at any time from the History tab.', 'يمكنك حذف كل شيء في أي وقت من تبويب السجل.')}</p></section>`;
  }

  /* ---------- dashboard ---------- */
  function sessionCard(P) {
    const prog = G.byId(P.id), list = G.session(P, today()), done = G.dayDone(P, today()), d = P.days[today()], n = d ? Object.keys(d.acts).length : 0;
    return `<article class="gp-today" style="--h:${prog.hue}"><span class="gp-ic">${ICON(prog.icon)}</span><div><b>${esc(prog.title)}</b><small>${list.length} ${T('activities', 'أنشطة')} · ${T('about', 'نحو')} ${P.cfg.mins} ${T('min', 'دقيقة')}</small>
      <ul class="gp-acts">${list.map(a => `<li class="${d && d.acts[a.id] ? 'is-done' : ''}">${esc(a.title)}</li>`).join('')}</ul></div>
      <a class="btn ${done ? 'btn--ghost' : 'btn--accent'}" href="#/do/${P.id}">${done ? T('Do it again', 'أعد') : n ? T('Continue', 'تابع') : T('Start', 'ابدأ')}</a></article>`;
  }
  function home() {
    const A = active(), on = A.filter(P => G.scheduled(P, today())), due = A.filter(P => G.reviewDue(P, today())), paused = A.filter(P => P.status === 'paused');
    const next = A.filter(P => P.status === 'active' && !on.includes(P)).map(P => { for (let i = 1; i < 8; i++) { const d = G.addDays(today(), i); if (G.scheduled(P, d)) return [P, d]; } return null; }).filter(Boolean);
    if (!A.length) return `${tabs('home')}<section class="gp-empty"><h2>${T('Choose what you would like to work on', 'اختر ما تريد العمل عليه')}</h2>
      <p>${T('Programmes are short, optional practice — a few minutes on the days you pick. They support study skills; they are not a test or a treatment, and you can pause or stop any time.', 'البرامج تدريب قصير واختياري في الأيام التي تختارها. تدعم مهارات الدراسة، وليست اختباراً أو علاجاً، ويمكنك الإيقاف في أي وقت.')}</p>
      ${catalogue()}</section>`;
    return `${tabs('home')}
      ${due.map(P => `<aside class="gp-banner"><span>${T('Time for a short review of', 'حان وقت مراجعة قصيرة لبرنامج')} <b>${esc(G.byId(P.id).title)}</b> — ${T('what helped, what didn’t, and whether to adjust.', 'ما الذي ساعد وما الذي لم يساعد وهل نعدّل.')}</span><a class="btn btn--sm btn--accent" href="#/review/${P.id}">${T('Review', 'راجع')}</a></aside>`).join('')}
      <section class="gp-sec" aria-labelledby="gpTodayH"><h2 id="gpTodayH">${T('Today', 'اليوم')} <small>${new Date(today() + 'T12:00').toLocaleDateString(window.I18N && I18N.lang === 'ar' ? 'ar' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</small></h2>
        ${on.length ? `<div class="gp-todays">${on.map(sessionCard).join('')}</div>` : `<p class="gp-sub">${T('Nothing planned for today — enjoy the day off. If you feel like it, you can still do a session:', 'لا شيء مخطط اليوم. إن رغبت يمكنك تنفيذ جلسة:')}</p><div class="gp-row">${A.filter(P => P.status === 'active').map(P => `<a class="btn btn--ghost btn--sm" href="#/do/${P.id}">${esc(G.byId(P.id).title)}</a>`).join('')}</div>`}
        ${next.length ? `<p class="gp-sub">${T('Coming up', 'القادم')}: ${next.map(([P, d]) => `${esc(G.byId(P.id).title)} — ${fmt(d)}`).join(' · ')}</p>` : ''}
        ${paused.length ? `<p class="gp-sub">${T('Paused', 'متوقف مؤقتاً')}: ${paused.map(P => `<a href="#/p/${P.id}">${esc(G.byId(P.id).title)}</a>`).join(', ')}</p>` : ''}
      </section>
      <section class="gp-sec" aria-labelledby="gpGoalsH"><h2 id="gpGoalsH">${T('Your goals', 'أهدافك')}</h2>${A.map(P => `<div class="gp-goalset"><b>${esc(G.byId(P.id).title)}</b><ul class="gp-goals">${P.goals.map(g => `<li><label><input type="checkbox" data-goal="${P.id}|${g.id}" ${g.done ? 'checked' : ''}> <span>${esc(g.text)}</span>${g.custom ? ` <em>${T('your own', 'هدفك')}</em>` : ''}</label></li>`).join('') || `<li class="gp-sub">${T('No goals yet.', 'لا أهداف بعد.')} <a href="#/edit/${P.id}">${T('Add one', 'أضف هدفاً')}</a></li>`}</ul></div>`).join('')}</section>
      <section class="gp-sec" aria-labelledby="gpJH"><h2 id="gpJH">${T('Your journey', 'رحلتك')}</h2>${A.map(journeyStrip).join('')}<a class="gp-more" href="#/journey">${T('See the whole journey', 'اعرض الرحلة كاملة')} →</a></section>
      <p class="gp-row"><a class="btn btn--ghost" href="#/new">+ ${T('Add a programme', 'أضف برنامجاً')}</a></p>`;
  }
  function journeyStrip(P) {
    const J = G.journey(P, today()), prog = G.byId(P.id), done = J.filter(j => j.state === 'done').length;
    return `<div class="gp-jr" style="--h:${prog.hue}"><div class="gp-jr__h"><b>${esc(prog.title)}</b><small>${done} ${T(done === 1 ? 'session done' : 'sessions done', 'جلسات منجزة')} · ${T('week', 'الأسبوع')} ${Math.min(P.cfg.weeks, Math.max(1, G.weekOf(P, today())))} ${T('of', 'من')} ${P.cfg.weeks}${P.status === 'paused' ? ' · ' + T('paused', 'متوقف') : ''}</small></div>
      <ol class="gp-path" aria-label="${T('Planned sessions', 'الجلسات المخططة')}">${J.map(j => `<li class="is-${j.state}" title="${fmt(j.date)} — ${{ done: T('done', 'منجزة'), open: T('open', 'مفتوحة'), today: T('today', 'اليوم'), ahead: T('ahead', 'قادمة') }[j.state]}"><span class="sr-only">${fmt(j.date)}: ${{ done: T('done', 'منجزة'), open: T('open', 'مفتوحة'), today: T('today', 'اليوم'), ahead: T('ahead', 'قادمة') }[j.state]}</span></li>`).join('')}</ol></div>`;
  }
  function journey() {
    const A = active();
    return `${tabs('journey')}<section class="gp-sec"><h2>${T('Journey', 'الرحلة')}</h2><p class="gp-sub">${T('Each dot is a planned session. Filled dots are sessions you did; open dots are simply sessions that are still open — there is no penalty for them.', 'كل نقطة جلسة مخططة. الممتلئة أنجزتها، والمفتوحة ما زالت مفتوحة — بلا أي عقوبة.')}</p>
      ${A.length ? A.map(P => journeyStrip(P) + reviewsList(P)).join('') : `<p>${T('No programme yet.', 'لا برنامج بعد.')} <a href="#/new">${T('Choose one', 'اختر برنامجاً')}</a></p>`}
      <p class="gp-legend"><span class="is-done"></span>${T('done', 'منجزة')} <span class="is-today"></span>${T('today', 'اليوم')} <span class="is-open"></span>${T('open', 'مفتوحة')} <span class="is-ahead"></span>${T('ahead', 'قادمة')}</p></section>`;
  }
  function reviewsList(P) {
    if (!P.reviews.length) return '';
    return `<details class="gp-revs"><summary>${P.reviews.length} ${T('reviews', 'مراجعات')}</summary><ul>${P.reviews.slice().reverse().map(r => `<li><b>${T('Week', 'الأسبوع')} ${r.week}</b> · ${r.stats.done}/${r.stats.planned} ${T('planned sessions', 'جلسات مخططة')}${r.went ? `<br><span>${T('Helped', 'ساعد')}: ${esc(r.went)}</span>` : ''}${r.hard ? `<br><span>${T('Hard', 'صعب')}: ${esc(r.hard)}</span>` : ''}${r.next ? `<br><span>${T('Next', 'التالي')}: ${esc(r.next)}</span>` : ''}</li>`).join('')}</ul></details>`;
  }

  /* ---------- programmes ---------- */
  function catalogue() {
    return `<ul class="gp-cat">${G.PROGRAMMES.map(p => { const P = S && S.programmes[p.id]; return `<li style="--h:${p.hue}"><span class="gp-ic">${ICON(p.icon)}</span><b>${esc(p.title)}</b><p>${esc(p.blurb)}</p>${P ? `<a class="btn btn--ghost btn--sm" href="#/p/${p.id}">${P.status === 'paused' ? T('Paused — open', 'متوقف — افتح') : T('In your plan — open', 'في خطتك — افتح')}</a>` : `<a class="btn btn--accent btn--sm" href="#/new/${p.id}">${T('Set up', 'إعداد')}</a>`}</li>`; }).join('')}</ul>`;
  }
  function programmes() {
    const A = active();
    return `${tabs('programmes')}<section class="gp-sec"><h2>${T('Programmes', 'البرامج')}</h2><p class="gp-sub">${T('Optional educational support for study skills. Not a diagnosis, not treatment, not a measure of ability.', 'دعم تعليمي اختياري لمهارات الدراسة. ليس تشخيصاً ولا علاجاً ولا قياساً للقدرة.')}</p>
      ${A.length ? `<ul class="gp-mine">${A.map(P => `<li><a href="#/p/${P.id}"><b>${esc(G.byId(P.id).title)}</b><small>${P.status === 'paused' ? T('Paused', 'متوقف') : T('Active', 'نشط')} · ${P.cfg.days.map(d => T(DN[d][0], DN[d][1])).join(', ')} · ${P.cfg.mins} ${T('min', 'د')} · ${T('until', 'حتى')} ${fmt(G.endDate(P))}</small></a></li>`).join('')}</ul>` : ''}
      <h3 class="gp-h3">${T('All programmes', 'كل البرامج')}</h3>${catalogue()}</section>`;
  }
  function cfgForm(P, pid) {
    const c = P ? P.cfg : G.DEFAULT_CFG, prog = G.byId(pid), goals = P ? P.goals : [];
    const radio = (name, list, cur) => `<div class="gp-seg" role="radiogroup">${list.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}" ${String(cur) === String(v) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
    return `<form class="gp-form" data-cfg="${pid}">
      <fieldset><legend>${T('Goals', 'الأهداف')} <small>${T('pick any, or write your own', 'اختر ما تشاء أو اكتب هدفك')}</small></legend>
        <ul class="gp-goals">${prog.goals.map(g => `<li><label><input type="checkbox" name="goal" value="${esc(g)}" ${!P || goals.some(x => x.text === g) ? (P ? 'checked' : '') : ''}> <span>${esc(g)}</span></label></li>`).join('')}
        ${goals.filter(g => g.custom).map(g => `<li><label><input type="checkbox" name="cgoal" value="${esc(g.text)}" checked> <span>${esc(g.text)}</span> <em>${T('your own', 'هدفك')}</em></label></li>`).join('')}</ul>
        <div class="gp-add"><label class="sr-only" for="gpCustom">${T('Your own goal', 'هدفك الخاص')}</label><input id="gpCustom" type="text" maxlength="140" placeholder="${T('Add your own goal…', 'أضف هدفك…')}"><button type="button" class="btn btn--ghost btn--sm" data-a="addgoal">${T('Add', 'أضف')}</button></div></fieldset>
      <fieldset><legend>${T('Which days?', 'أي الأيام؟')}</legend><div class="gp-days">${G.DAYS.map(d => `<label><input type="checkbox" name="day" value="${d}" ${c.days.includes(d) ? 'checked' : ''}><span>${T(DN[d][0], DN[d][1])}</span></label>`).join('')}</div></fieldset>
      <div class="gp-grid2">
        <fieldset><legend>${T('Session length', 'طول الجلسة')}</legend>${radio('mins', [[5, '5 min'], [10, '10 min'], [15, '15 min'], [20, '20 min'], [30, '30 min']], c.mins)}</fieldset>
        <fieldset><legend>${T('How long', 'المدة')}</legend><label class="gp-num"><input type="number" name="weeks" min="1" max="12" value="${c.weeks}"> ${T('weeks', 'أسابيع')}</label></fieldset>
        <fieldset><legend>${T('Difficulty', 'الصعوبة')}</legend>${radio('level', [['gentle', T('Gentle', 'لطيف')], ['steady', T('Steady', 'ثابت')], ['stretch', T('Stretch', 'متحدٍّ')]], c.level)}</fieldset>
        <fieldset><legend>${T('Format', 'الشكل')}</legend>${radio('format', [['mixed', T('Mixed', 'مختلط')], ['interactive', T('Mostly exercises', 'تمارين غالباً')], ['reflective', T('Mostly writing & reflection', 'كتابة وتأمل غالباً')]], c.format)}</fieldset>
        <fieldset><legend>${T('Breaks', 'الاستراحات')}</legend>${radio('breaks', [['none', T('No breaks', 'بلا استراحة')], ['between', T('A short break between activities', 'استراحة قصيرة بين الأنشطة')]], c.breaks)}</fieldset>
        <fieldset><legend>${T('Review', 'المراجعة')}</legend>${radio('review', [['weekly', T('Every week', 'كل أسبوع')], ['fortnightly', T('Every two weeks', 'كل أسبوعين')]], c.review)}</fieldset>
        <fieldset class="gp-span2"><legend>${T('Reminders', 'التذكيرات')}</legend>${radio('reminders', [['none', T('None', 'بلا')], ['banner', T('Show on my ERLY dashboard', 'اعرض على لوحتي في ERLY')], ['calendar', T('Add to my calendar (download a file)', 'أضف إلى تقويمي (تنزيل ملف)')]], c.reminders)}<small class="gp-sub">${T('ERLY does not send notifications. A calendar file lets your own calendar app remind you.', 'لا يرسل ERLY إشعارات. ملف التقويم يتيح لتطبيق التقويم تذكيرك.')}</small></fieldset>
      </div>
      <p class="gp-err" role="alert" hidden></p>
      <div class="gp-row"><button type="submit" class="btn btn--accent">${P ? T('Save changes', 'احفظ التغييرات') : T('Start this programme', 'ابدأ هذا البرنامج')}</button><a class="btn btn--ghost" href="${P ? '#/p/' + pid : '#/new'}">${T('Cancel', 'إلغاء')}</a></div></form>`;
  }
  function add(pid) {
    if (!pid) return `${tabs('programmes')}<section class="gp-sec"><h2>${T('Add a programme', 'أضف برنامجاً')}</h2>${catalogue()}</section>`;
    const prog = G.byId(pid); if (!prog) return home();
    if (S && S.programmes[pid]) { location.replace('#/p/' + pid); return ''; }
    return `${tabs('programmes')}<section class="gp-sec gp-setup" style="--h:${prog.hue}"><p class="gp-k">${T('New programme', 'برنامج جديد')}</p><h2>${esc(prog.title)}</h2><p>${esc(prog.blurb)}</p><p class="gp-note"><b>${T('What it is', 'ما هو')}:</b> ${esc(prog.is)} ${T('It is optional study support — not a test, a diagnosis or treatment.', 'إنه دعم دراسي اختياري — ليس اختباراً أو تشخيصاً أو علاجاً.')}</p>${cfgForm(null, pid)}</section>`;
  }
  function edit(pid) { const P = S && S.programmes[pid]; if (!P) return home(); return `${tabs('programmes')}<section class="gp-sec gp-setup" style="--h:${G.byId(pid).hue}"><p class="gp-k">${T('Change programme', 'غيّر البرنامج')}</p><h2>${esc(G.byId(pid).title)}</h2>${cfgForm(P, pid)}</section>`; }
  function detail(pid) {
    const P = S && S.programmes[pid]; if (!P) return home(); const prog = G.byId(pid);
    const stats = G.weekStats(P, P.started, today());
    return `${tabs('programmes')}<section class="gp-sec gp-setup" style="--h:${prog.hue}"><p class="gp-k">${P.status === 'paused' ? T('Paused', 'متوقف مؤقتاً') : T('Active', 'نشط')}</p><h2>${esc(prog.title)}</h2>
      <p class="gp-sub">${T('Started', 'بدأ')} ${fmt(P.started)} · ${T('ends', 'ينتهي')} ${fmt(G.endDate(P))} · ${P.cfg.days.map(d => T(DN[d][0], DN[d][1])).join(', ')} · ${P.cfg.mins} ${T('min', 'د')} · ${{ gentle: T('gentle', 'لطيف'), steady: T('steady', 'ثابت'), stretch: T('stretch', 'متحدٍّ') }[P.cfg.level]}</p>
      <p>${stats.done} ${T(stats.done === 1 ? 'session done so far' : 'sessions done so far', 'جلسات منجزة حتى الآن')}${stats.planned ? ` (${stats.planned} ${T('planned', 'مخططة')})` : ''}.</p>
      ${journeyStrip(P)}
      <div class="gp-row">${P.status === 'active' ? `<a class="btn btn--accent" href="#/do/${pid}">${T('Do a session now', 'نفّذ جلسة الآن')}</a><button type="button" class="btn btn--ghost" data-a="pause" data-p="${pid}">${T('Pause', 'إيقاف مؤقت')}</button>` : `<button type="button" class="btn btn--accent" data-a="resume" data-p="${pid}">${T('Resume', 'استئناف')}</button>`}
        <a class="btn btn--ghost" href="#/edit/${pid}">${T('Change settings or goals', 'غيّر الإعدادات أو الأهداف')}</a>
        <button type="button" class="btn btn--ghost" data-a="review" data-p="${pid}">${T('Review now', 'راجع الآن')}</button>
        ${P.cfg.reminders === 'calendar' ? `<button type="button" class="btn btn--ghost" data-a="ics">${T('Download calendar file', 'نزّل ملف التقويم')}</button>` : ''}</div>
      <details class="gp-danger"><summary>${T('Restart or remove', 'إعادة البدء أو الإزالة')}</summary><p class="gp-sub">${T('Restart clears this programme’s activity and reviews and starts again from today. Remove deletes the programme and its activity.', 'إعادة البدء تمسح نشاط البرنامج ومراجعاته وتبدأ من اليوم. الإزالة تحذف البرنامج ونشاطه.')}</p><div class="gp-row"><button type="button" class="btn btn--ghost" data-a="restart" data-p="${pid}">${T('Restart from today', 'ابدأ من اليوم')}</button><button type="button" class="btn btn--ghost" data-a="remove" data-p="${pid}">${T('Remove programme', 'أزل البرنامج')}</button></div></details>
      ${reviewsList(P)}</section>`;
  }
  function history() {
    const EV = { start: T('Started', 'بدأ'), change: T('Changed settings', 'غيّر الإعدادات'), pause: T('Paused', 'أوقف'), resume: T('Resumed', 'استأنف'), restart: T('Restarted', 'أعاد البدء'), remove: T('Removed', 'أزال'), review: T('Weekly review', 'مراجعة أسبوعية'), session: T('Session', 'جلسة') };
    const H = (S && S.history) || [];
    return `${tabs('history')}<section class="gp-sec"><h2>${T('History', 'السجل')}</h2>
      ${H.length ? `<ol class="gp-hist">${H.map(h => `<li><time>${new Date(h.at).toLocaleString(window.I18N && I18N.lang === 'ar' ? 'ar' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time><span>${EV[h.ev] || esc(h.ev)}${h.pid && G.byId(h.pid) ? ' — ' + esc(G.byId(h.pid).title) : ''}${h.detail ? ` <small>(${esc(h.detail)})</small>` : ''}</span></li>`).join('')}</ol>` : `<p class="gp-sub">${T('Nothing yet.', 'لا شيء بعد.')}</p>`}
      <h3 class="gp-h3">${T('Your data', 'بياناتك')}</h3><p class="gp-sub">${consent === 'device' ? T('Saved on this device only (browser storage).', 'محفوظة على هذا الجهاز فقط.') : T('Kept only for this visit — closing the page clears it.', 'محفوظة لهذه الزيارة فقط.')}</p>
      <div class="gp-row">${consent === 'device' ? `<button type="button" class="btn btn--ghost" data-a="tovisit">${T('Stop saving on this device', 'أوقف الحفظ على الجهاز')}</button>` : `<button type="button" class="btn btn--ghost" data-a="todevice">${T('Save on this device', 'احفظ على هذا الجهاز')}</button>`}<button type="button" class="btn btn--ghost" data-a="wipe">${T('Delete all Growth Plan data', 'احذف كل بيانات خطة النمو')}</button></div></section>`;
  }

  /* ---------- the session workspace ---------- */
  function work(pid) {
    const P = S && S.programmes[pid]; if (!P) return home();
    if (!run || run.pid !== pid || run.date !== today()) { const list = G.session(P, today()), d = P.days[today()]; run = { pid, date: today(), list, i: d ? Math.min(list.length, Object.keys(d.acts).length) : 0, phase: 'act', res: null }; if (run.i >= list.length) run.phase = 'reflect'; }
    return `<div class="gp-work" style="--h:${G.byId(pid).hue}"><header class="gp-work__h"><a href="#/home" class="gp-back">← ${T('Growth Plan', 'خطة النمو')}</a><b>${esc(G.byId(pid).title)}</b><ol class="gp-prog" aria-label="${T('Session progress', 'تقدم الجلسة')}">${run.list.map((a, i) => `<li class="${i < run.i ? 'is-done' : i === run.i && run.phase === 'act' ? 'is-on' : ''}"><span class="sr-only">${esc(a.title)}</span></li>`).join('')}<li class="${run.phase === 'reflect' || run.phase === 'end' ? 'is-on' : ''}"><span class="sr-only">${T('Reflection', 'تأمل')}</span></li></ol></header><div id="gpStage" class="gp-stage"></div></div>`;
  }
  function mountWork() { stage(); }
  function stage() {
    const el = document.getElementById('gpStage'); if (!el || !run) return;
    const P = S.programmes[run.pid];
    if (run.phase === 'break') { el.innerHTML = `<section class="gp-act gp-break"><h2>${T('Short break', 'استراحة قصيرة')}</h2><p class="gp-sub">${T('Stand up, stretch, look at something far away. Carry on whenever you are ready.', 'قف، تمدّد، انظر إلى شيء بعيد. تابع متى كنت مستعداً.')}</p><div class="gp-breath" aria-hidden="true"></div><button type="button" class="btn btn--accent" data-a="next">${T('Carry on', 'تابع')}</button></section>`; return focusStage(); }
    if (run.phase === 'reflect') {
      el.innerHTML = `<section class="gp-act"><h2>${T('How did that feel?', 'كيف كان ذلك؟')}</h2><p class="gp-sub">${T('Optional. This is for you — it helps when you review the week.', 'اختياري. هذا لك — يساعدك في المراجعة الأسبوعية.')}</p>
        <div class="gp-seg gp-feel" role="radiogroup" aria-label="${T('How it felt', 'كيف شعرت')}">${[['easy', T('Easy', 'سهل')], ['okay', T('About right', 'مناسب')], ['hard', T('Hard', 'صعب')]].map(([v, l]) => `<label><input type="radio" name="feel" value="${v}"><span>${l}</span></label>`).join('')}</div>
        <label class="gp-lbl" for="gpNote">${T('Anything to remember for next time?', 'شيء تتذكره للمرة القادمة؟')}</label><textarea id="gpNote" rows="3" maxlength="600"></textarea>
        <div class="gp-row"><button type="button" class="btn btn--accent" data-a="finish">${T('Finish session', 'أنهِ الجلسة')}</button><button type="button" class="btn btn--ghost" data-a="skipreflect">${T('Skip', 'تخطَّ')}</button></div></section>`;
      return focusStage();
    }
    if (run.phase === 'end') {
      const d = P.days[run.date], n = d ? Object.keys(d.acts).length : 0;
      el.innerHTML = `<section class="gp-act gp-end"><h2>${T('Session done', 'انتهت الجلسة')}</h2><p>${n} ${T(n === 1 ? 'activity completed.' : 'activities completed.', 'أنشطة مكتملة.')} ${T('That is practice in the bank.', 'هذا تدريب محسوب لك.')}</p><div class="gp-row"><a class="btn btn--accent" href="#/home">${T('Back to the Growth Plan', 'العودة إلى خطة النمو')}</a><a class="btn btn--ghost" href="#/p/${run.pid}">${T('See the journey', 'اعرض الرحلة')}</a></div></section>`;
      return focusStage();
    }
    const a = run.list[run.i]; run.res = null;
    el.innerHTML = `<section class="gp-act" aria-labelledby="gpActH"><p class="gp-k">${T('Activity', 'نشاط')} ${run.i + 1} ${T('of', 'من')} ${run.list.length} · ${T('about', 'نحو')} ${a.mins} ${T('min', 'د')}</p><h2 id="gpActH">${esc(a.title)}</h2>
      ${a.passage ? `<blockquote class="gp-passage"><b>${esc(a.ptitle)}</b><p>${esc(a.passage)}</p></blockquote>` : ''}<p class="gp-q">${esc(a.q)}</p><div class="gp-ex">${exercise(a)}</div><div class="gp-fb" aria-live="polite"></div>
      <div class="gp-row gp-row--act">${['mcq', 'numeric', 'order', 'recall', 'write'].includes(a.type) ? `<button type="button" class="btn btn--accent" data-a="check">${T('Check', 'تحقق')}</button>` : `<button type="button" class="btn btn--accent" data-a="done">${a.type === 'link' ? T('I did this', 'أنجزت هذا') : T('Done', 'تم')}</button>`}<button type="button" class="btn btn--ghost" data-a="skip">${T('Skip this one', 'تخطَّ هذا')}</button></div></section>`;
    if (a.type === 'recall') startRecall(a);
    if (a.type === 'timer') startBreath(a);
    if (a.type === 'write' && a.timer) startWriteTimer(a);
    focusStage();
  }
  const focusStage = () => { const h = document.querySelector('#gpStage h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: false }); } };
  function exercise(a) {
    switch (a.type) {
      case 'mcq': return `<fieldset class="gp-opts"><legend class="sr-only">${T('Choose one', 'اختر واحداً')}</legend>${a.options.map((o, i) => `<label><input type="radio" name="opt" value="${i}"><span>${esc(o)}</span></label>`).join('')}</fieldset>`;
      case 'numeric': return `<label class="gp-lbl" for="gpNum">${T('Your answer', 'إجابتك')}</label><input id="gpNum" class="gp-in" type="text" inputmode="decimal" autocomplete="off">`;
      case 'order': return `<ol class="gp-order" aria-label="${T('Use the arrows to reorder', 'استخدم الأسهم لإعادة الترتيب')}">${a.start.map((s, i) => `<li data-v="${esc(s)}"><span>${esc(s)}</span><span class="gp-mv"><button type="button" data-mv="-1" aria-label="${T('Move up', 'أعلى')}">↑</button><button type="button" data-mv="1" aria-label="${T('Move down', 'أسفل')}">↓</button></span></li>`).join('')}</ol>`;
      case 'recall': return `<div class="gp-recall"><p class="gp-show" aria-live="polite">${a.items.map(esc).join(' &nbsp; ')}</p><p class="gp-count"></p><div class="gp-ans" hidden><label class="gp-lbl" for="gpRec">${T('What do you remember?', 'ماذا تتذكر؟')}</label><input id="gpRec" class="gp-in" type="text" autocomplete="off"></div></div>`;
      case 'write': return `${a.timer ? `<p class="gp-timer" aria-live="off"></p>` : ''}<label class="gp-lbl" for="gpWrite">${T('Your writing', 'كتابتك')} <small>(${T('at least', 'على الأقل')} ${a.minWords} ${T('words', 'كلمات')})</small></label><textarea id="gpWrite" rows="${a.minWords > 20 ? 7 : 3}"></textarea><p class="gp-sub gp-wc">0 ${T('words', 'كلمات')}</p>`;
      case 'link': return `<a class="btn btn--ghost" href="${a.href}" target="_blank" rel="noopener">${esc(a.label)} ↗</a>`;
      case 'steps': return `<label class="gp-lbl" for="gpTask">${T('The task', 'المهمة')}</label><input id="gpTask" class="gp-in" type="text" maxlength="140">${Array.from({ length: a.n }, (_, i) => `<label class="gp-lbl" for="gpStep${i}">${T('Step', 'خطوة')} ${i + 1}</label><input id="gpStep${i}" class="gp-in" type="text" maxlength="140">`).join('')}`;
      case 'estimate': return `<label class="gp-lbl" for="gpEst">${T('Your estimate (minutes)', 'تقديرك (دقائق)')}</label><input id="gpEst" class="gp-in gp-in--sm" type="number" min="1" max="600">`;
      case 'template': return `<p class="gp-tpl">${a.parts.map((p, i) => esc(p) + (i < a.parts.length - 1 ? `<label class="sr-only" for="gpT${i}">${T('Gap', 'فراغ')} ${i + 1}</label><input id="gpT${i}" class="gp-in gp-in--inline" type="text" maxlength="80">` : '')).join('')}</p>`;
      case 'timer': return `<div class="gp-breath gp-breath--run" aria-hidden="true"></div><p class="gp-timer" aria-live="off"></p>`;
      default: return '';
    }
  }
  let timer = 0;
  const stopTimer = () => { clearInterval(timer); timer = 0; };
  function startRecall(a) {
    let left = a.secs; const c = app.querySelector('.gp-count'), check = app.querySelector('[data-a="check"]'); check.hidden = true;
    c.innerHTML = `${left}s · <button type="button" class="hs-link gp-link" data-a="ready">${T('I’m ready', 'أنا جاهز')}</button>`;
    const reveal = () => { stopTimer(); const s = app.querySelector('.gp-show'); if (!s) return; s.textContent = T('Now hidden.', 'مخفية الآن.'); app.querySelector('.gp-ans').hidden = false; c.textContent = ''; check.hidden = false; app.querySelector('#gpRec').focus(); };
    stopTimer(); timer = setInterval(() => { left--; if (left <= 0) return reveal(); const n = c.firstChild; if (n) n.textContent = left + 's · '; }, 1000);
    run.reveal = reveal;
  }
  function startWriteTimer(a) { let left = a.timer; const t = app.querySelector('.gp-timer'); const tick = () => { if (!t.isConnected) return stopTimer(); t.textContent = left > 0 ? `${T('Suggested time', 'الوقت المقترح')}: ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : T('Time is up — finish your sentence whenever you are ready.', 'انتهى الوقت — أكمل جملتك متى شئت.'); left--; if (left < -1) stopTimer(); }; stopTimer(); tick(); timer = setInterval(tick, 1000); }
  function startBreath(a) { let left = a.secs; const t = app.querySelector('.gp-timer'); const tick = () => { if (!t.isConnected) return stopTimer(); t.textContent = left > 0 ? `${left}s` : T('Done — carry on when you are ready.', 'تم — تابع متى كنت مستعداً.'); left--; if (left < 0) stopTimer(); }; stopTimer(); tick(); timer = setInterval(tick, 1000); }

  function readInput(a) {
    const q = s => app.querySelector(s);
    switch (a.type) {
      case 'mcq': { const r = q('input[name="opt"]:checked'); return r ? a.options[+r.value] : null; }
      case 'numeric': return q('#gpNum').value.trim() || null;
      case 'order': return [...app.querySelectorAll('.gp-order li')].map(li => li.dataset.v);
      case 'recall': return q('#gpRec').value;
      case 'write': return q('#gpWrite').value;
      default: return null;
    }
  }
  function feedback(a, r) {
    const fb = app.querySelector('.gp-fb'); let msg;
    if (a.type === 'mcq') msg = r.ok ? T('Yes — that’s it.', 'نعم — هذا هو.') : `${T('Not quite. The best answer is', 'ليس تماماً. الإجابة الأفضل')}: “${esc(r.answer)}”.`;
    else if (a.type === 'numeric') msg = r.invalid ? T('Please type a number.', 'اكتب رقماً.') : r.ok ? T('Within range — nice estimate.', 'ضمن النطاق — تقدير جيد.') : T('Not within range this time.', 'ليس ضمن النطاق هذه المرة.');
    else if (a.type === 'order') msg = r.ok ? T('That order works well.', 'هذا الترتيب جيد.') : `${r.right}/${r.of} ${T('in the suggested place. A suggested order:', 'في المكان المقترح. ترتيب مقترح:')}<ol>${r.answer.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
    else if (a.type === 'recall') msg = `${T('You recalled', 'تذكرت')} ${r.right}/${r.of}. ${T('The items were', 'العناصر كانت')}: ${esc([].concat(r.answer).join(', '))}.`;
    else if (a.type === 'write') msg = r.ok ? (a.model ? `${T('Thanks. An example sentence', 'شكراً. جملة مثال')}: “${esc(a.model)}”` : T('Thanks — saved with this session.', 'شكراً — حُفظ مع هذه الجلسة.')) : `${T('Try for at least', 'حاول كتابة')} ${r.need} ${T('words — you have', 'كلمات على الأقل — لديك')} ${r.words}.`;
    fb.innerHTML = `<div class="gp-fbbox ${r.ok ? 'is-ok' : 'is-try'}"><p>${msg}</p>${a.explain && (r.ok || a.type !== 'write') ? `<p class="gp-sub">${esc(a.explain)}</p>` : ''}</div>`;
  }
  function complete(result) {
    const P = S.programmes[run.pid], a = run.list[run.i];
    G.record(P, run.date, a.id, result); if (run.i === 0 && Object.keys(P.days[run.date].acts).length === 1) G.log(S, 'session', run.pid); save();
    run.i++;
    run.phase = run.i >= run.list.length ? 'reflect' : P.cfg.breaks === 'between' ? 'break' : 'act';
    stopTimer(); stage(); app.querySelectorAll('.gp-prog li').forEach((li, i) => { li.className = i < run.i ? 'is-done' : i === run.i && run.phase === 'act' ? 'is-on' : i === run.list.length && run.phase === 'reflect' ? 'is-on' : ''; });
  }

  /* ---------- weekly review ---------- */
  function review(pid) {
    const P = S && S.programmes[pid]; if (!P) return home();
    const every = P.cfg.review === 'fortnightly' ? 14 : 7, from = G.reviewFrom(P), st = G.weekStats(P, from, today());
    const feels = Object.entries(P.days).filter(([d, v]) => d >= from && v.reflection).map(([, v]) => v.reflection.feel), count = k => feels.filter(f => f === k).length;
    return `${tabs('programmes')}<section class="gp-sec gp-setup" style="--h:${G.byId(pid).hue}"><p class="gp-k">${T('Review', 'مراجعة')} · ${esc(G.byId(pid).title)}</p><h2>${T('How did the last', 'كيف كان آخر')} ${every === 14 ? T('two weeks', 'أسبوعين') : T('week', 'أسبوع')} ${T('go?', '؟')}</h2>
      <p>${T('You did', 'أنجزت')} <b>${st.done}</b> ${T(st.done === 1 ? 'session' : 'sessions', 'جلسات')}${st.planned ? ` ${T('of', 'من')} ${st.planned} ${T('planned', 'مخططة')}` : ''}${st.extra ? ` (${st.extra} ${T('on extra days', 'في أيام إضافية')})` : ''}. ${st.done ? T('Every one of those counts.', 'كل واحدة منها تُحتسب.') : T('Weeks like that happen — the plan can change to fit.', 'تحدث أسابيع كهذه — يمكن تعديل الخطة لتناسبك.')}</p>
      ${feels.length ? `<p class="gp-sub">${T('Your reflections', 'تأملاتك')}: ${count('easy')} ${T('easy', 'سهل')}, ${count('okay')} ${T('about right', 'مناسب')}, ${count('hard')} ${T('hard', 'صعب')}.</p>` : ''}
      <form class="gp-form" data-review="${pid}">
        <label class="gp-lbl" for="rvWent">${T('What helped?', 'ما الذي ساعد؟')}</label><textarea id="rvWent" name="went" rows="2" maxlength="600"></textarea>
        <label class="gp-lbl" for="rvHard">${T('What got in the way?', 'ما الذي أعاق؟')}</label><textarea id="rvHard" name="hard" rows="2" maxlength="600"></textarea>
        <label class="gp-lbl" for="rvNext">${T('One thing to try next', 'شيء واحد تجربه لاحقاً')}</label><input id="rvNext" name="next" class="gp-in" type="text" maxlength="300">
        <fieldset><legend>${T('Adjust the plan?', 'هل نعدّل الخطة؟')}</legend><div class="gp-seg" role="radiogroup">${[['keep', T('Keep it as it is', 'أبقِها كما هي')], ['lighter', T('Make it lighter', 'اجعلها أخف')], ['more', T('A bit longer', 'أطول قليلاً')], ['harder', T('More challenging', 'أكثر تحدياً')]].map(([v, l], i) => `<label><input type="radio" name="adjust" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
        <div class="gp-row"><button type="submit" class="btn btn--accent">${T('Save review', 'احفظ المراجعة')}</button><a class="btn btn--ghost" href="#/p/${pid}">${T('Not now', 'ليس الآن')}</a></div></form></section>`;
  }

  /* ---------- events ---------- */
  app.addEventListener('click', e => {
    const b = e.target.closest('button, [data-consent]'); if (!b) return;
    if (b.dataset.consent) { consent = b.dataset.consent; ensure(); save(); return render(true); }
    const mv = b.dataset.mv; if (mv) { const li = b.closest('li'), sib = +mv < 0 ? li.previousElementSibling : li.nextElementSibling; if (sib) { +mv < 0 ? sib.before(li) : sib.after(li); b.focus(); } return; }
    const a = b.dataset.a, pid = b.dataset.p;
    if (a === 'addgoal') { const inp = app.querySelector('#gpCustom'), v = inp.value.trim(); if (!v) return inp.focus(); const ul = app.querySelector('.gp-form .gp-goals'); ul.insertAdjacentHTML('beforeend', `<li><label><input type="checkbox" name="cgoal" value="${esc(v)}" checked> <span>${esc(v)}</span> <em>${T('your own', 'هدفك')}</em></label></li>`); inp.value = ''; inp.focus(); return; }
    if (a === 'pause') { G.pause(S, pid, today()); save(); toast(T('Paused. Your end date moves back while it is paused.', 'أُوقف. يتأخر تاريخ الانتهاء أثناء الإيقاف.')); return render(); }
    if (a === 'resume') { G.resume(S, pid, today()); save(); toast(T('Welcome back — resumed.', 'أهلاً بعودتك — استُؤنف.')); return render(); }
    if (a === 'review') return go('review/' + pid);
    if (a === 'restart') { if (!confirm(T('Restart this programme from today? Its activity and reviews will be cleared.', 'إعادة البدء من اليوم؟ سيُمسح النشاط والمراجعات.'))) return; G.restart(S, pid, today()); run = null; save(); return render(); }
    if (a === 'remove') { if (!confirm(T('Remove this programme and its activity?', 'إزالة هذا البرنامج ونشاطه؟'))) return; G.remove(S, pid); run = null; save(); toast(T('Programme removed.', 'أُزيل البرنامج.')); return go('programmes'); }
    if (a === 'ics') { const blob = new Blob([G.ics(S, today())], { type: 'text/calendar' }), u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = 'erly-growth-plan.ics'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); return; }
    if (a === 'tovisit') { consent = 'visit'; try { localStorage.removeItem(KEY); } catch (er) { /* none */ } toast(T('No longer saved on this device.', 'لم تعد محفوظة على الجهاز.')); return render(); }
    if (a === 'todevice') { consent = 'device'; save(); return render(); }
    if (a === 'wipe') { if (!confirm(T('Delete all Growth Plan data on this device? This cannot be undone.', 'حذف كل بيانات خطة النمو؟ لا يمكن التراجع.'))) return; try { localStorage.removeItem(KEY); } catch (er) { /* none */ } S = G.empty(); run = null; toast(T('All Growth Plan data deleted.', 'حُذفت كل بيانات خطة النمو.')); return go('home'); }
    // session workspace
    if (!run) return; const act = run.list[run.i];
    if (a === 'ready' && run.reveal) return run.reveal();
    if (a === 'check') {
      const input = readInput(act); if (input == null) { app.querySelector('.gp-fb').innerHTML = `<div class="gp-fbbox is-try"><p>${act.type === 'mcq' ? T('Choose an answer first.', 'اختر إجابة أولاً.') : T('Type an answer first.', 'اكتب إجابة أولاً.')}</p></div>`; return; }
      const r = G.check(act, input); feedback(act, r); if (r.invalid || (act.type === 'write' && !r.ok)) return;
      run.res = { ok: r.ok, right: r.right, of: r.of, text: act.type === 'write' ? String(input).slice(0, 2000) : undefined };
      b.textContent = T('Next', 'التالي'); b.dataset.a = 'next'; app.querySelectorAll('.gp-ex input, .gp-ex textarea, .gp-ex button').forEach(x => { x.disabled = true; }); b.focus(); return;
    }
    if (a === 'next') { if (run.phase === 'break') { run.phase = 'act'; return stage(); } return complete(run.res || { ok: true }); }
    if (a === 'done') {
      let extra = {};
      if (act.type === 'steps') extra = { task: (app.querySelector('#gpTask').value || '').slice(0, 140), steps: [...app.querySelectorAll('[id^="gpStep"]')].map(x => x.value.slice(0, 140)) };
      if (act.type === 'estimate') extra = { estimate: +app.querySelector('#gpEst').value || null };
      if (act.type === 'template') extra = { text: act.parts.map((p, i) => p + (i < act.parts.length - 1 ? (app.querySelector('#gpT' + i).value || '…') : '')).join('') };
      if (act.type === 'template') { app.querySelector('.gp-fb').innerHTML = `<div class="gp-fbbox is-ok"><p>${esc(extra.text)}</p><p class="gp-sub">${esc(act.explain)}</p></div>`; b.textContent = T('Next', 'التالي'); b.dataset.a = 'next'; run.res = Object.assign({ ok: true }, extra); return; }
      return complete(Object.assign({ ok: true }, extra));
    }
    if (a === 'skip') return complete({ skipped: true });
    if (a === 'finish' || a === 'skipreflect') { const P = S.programmes[run.pid]; if (a === 'finish') { const f = app.querySelector('input[name="feel"]:checked'); G.reflect(P, run.date, f ? f.value : 'skip', app.querySelector('#gpNote').value); } else G.reflect(P, run.date, 'skip', ''); save(); run.phase = 'end'; return stage(); }
  });
  app.addEventListener('input', e => { if (e.target.id === 'gpWrite') { const n = (e.target.value.match(/\S+/g) || []).length, wc = app.querySelector('.gp-wc'); if (wc) wc.textContent = `${n} ${T(n === 1 ? 'word' : 'words', 'كلمات')}`; } });
  app.addEventListener('change', e => { const g = e.target.dataset.goal; if (g) { const [pid, id] = g.split('|'), P = S.programmes[pid], goal = P && P.goals.find(x => x.id === id); if (goal) { goal.done = e.target.checked; save(); } } });
  app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('#gpCustom')) { e.preventDefault(); app.querySelector('[data-a="addgoal"]').click(); } if (e.key === 'Enter' && e.target.matches('#gpNum, #gpRec')) { e.preventDefault(); const c = app.querySelector('[data-a="check"], [data-a="next"]'); if (c) c.click(); } });
  app.addEventListener('submit', e => {
    e.preventDefault(); const f = e.target, fd = new FormData(f);
    if (f.dataset.review) { G.addReview(S, f.dataset.review, today(), { went: fd.get('went'), hard: fd.get('hard'), next: fd.get('next'), adjust: fd.get('adjust') }); save(); toast(T('Review saved.', 'حُفظت المراجعة.')); return go('p/' + f.dataset.review); }
    const pid = f.dataset.cfg, days = fd.getAll('day'), err = f.querySelector('.gp-err');
    if (!days.length) { err.hidden = false; err.textContent = T('Choose at least one day.', 'اختر يوماً واحداً على الأقل.'); return f.querySelector('input[name="day"]').focus(); }
    const goals = fd.getAll('goal').map(t => ({ text: t })).concat(fd.getAll('cgoal').map(t => ({ text: t, custom: true })));
    const cfg = { days, mins: +fd.get('mins'), weeks: +fd.get('weeks'), level: fd.get('level'), format: fd.get('format'), breaks: fd.get('breaks'), review: fd.get('review'), reminders: fd.get('reminders') };
    ensure();
    if (S.programmes[pid]) { const P = S.programmes[pid], keep = P.goals; G.change(S, pid, cfg, goals.map(g => keep.find(k => k.text === g.text) || Object.assign({ id: 'g' + Math.random().toString(36).slice(2, 7), done: false, custom: !!g.custom }, g))); run = null; toast(T('Changes saved.', 'حُفظت التغييرات.')); }
    else { G.start(S, pid, cfg, goals, today()); toast(T('Programme added to your plan.', 'أُضيف البرنامج إلى خطتك.')); }
    save(); go('p/' + pid);
  });

  window.ERLY = window.ERLY || {}; window.ERLY.growthPlan = { state: () => S, consent: () => consent, run: () => run, render };
  render();
})();
