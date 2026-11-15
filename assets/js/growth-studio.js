/* ERLY — Growth Plan v18 interface (one system, replacing the separate v2 programme and v10 template timetable).
   consent → "tell me about your week" in your own words (what was understood is shown back, editable) → goals
   (adaptive follow-up questions) → preferences → a generated plan you approve → Today / Week (drag to move) /
   Calendar / Timeline / Progress views → complete, skip, reschedule, edit → regenerate (the difference is shown
   before anything changes) → export (.ics / .csv / print) → weekly review, optionally with Noor.
   Storage: this device only ("erly-growth-v18"), and only after the student agrees; “Delete all” removes it and
   the older Growth Plan data. Nothing is sent anywhere; “Review with Noor” opens Noor with the week's numbers,
   which the student sees before sending. No ability scores, streak penalties or predictions. */
(function () {
  'use strict';
  const G = window.ERLY_GSCHED, app = document.getElementById('growthApp');
  if (!G || !app) return;
  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en);
  const L = p => (p ? T(p[0], p[1]) : '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KEY = 'erly-growth-v18', OLD = ['erly-growth-v1', 'erly-gplan-v10'];
  const DN = { mon: ['Mon', 'الاثنين'], tue: ['Tue', 'الثلاثاء'], wed: ['Wed', 'الأربعاء'], thu: ['Thu', 'الخميس'], fri: ['Fri', 'الجمعة'], sat: ['Sat', 'السبت'], sun: ['Sun', 'الأحد'] };
  const KINDS = [['exam', 'Exam or test', 'امتحان أو اختبار'], ['subject', 'A subject to understand', 'مادة أريد فهمها'], ['skill', 'A skill', 'مهارة'], ['writing', 'Writing', 'الكتابة'], ['handwriting', 'Handwriting', 'الكتابة اليدوية'], ['reading', 'Reading', 'القراءة'], ['habit', 'A study habit', 'عادة دراسية'], ['wellbeing', 'Wellbeing and balance', 'التوازن والراحة']];
  const today = () => (window.__growthToday || G.iso(new Date()));
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  let S = read(), draft = null, view = 'today', focusDate = null, pending = null, monthOf = null;
  const save = () => { if (S && S.consent === 'device') { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: kept for this visit */ } } };
  const toast = m => (window.ERLY && ERLY.toast ? ERLY.toast(m) : null);
  const curProfile = () => (draft ? draft.profile : S ? S.profile : { goals: [] });
  const goalOf = id => (curProfile().goals || []).find(g => g.id === id) || { text: '—' };
  const len = s => G.toMin(s.end) - G.toMin(s.start);
  const fmtDate = d => { try { return G.iso(d) === today() ? T('Today', 'اليوم') : new Date(d + 'T12:00').toLocaleDateString(window.I18N && I18N.lang === 'ar' ? 'ar' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d; } };
  const COLORS = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#4d7c0f'];
  const colorOf = id => COLORS[Math.max(0, (curProfile().goals || []).findIndex(g => g.id === id)) % COLORS.length];

  /* ======================= onboarding ======================= */
  function startDraft() { draft = { step: 'consent', text: '', facts: null, profile: { start: G.weekStart(today()) === today() ? today() : today(), availability: [], commitments: [], goals: [], prefs: Object.assign({}, G.DEF_PREFS) }, consent: null }; }
  function onboarding() {
    const d = draft, P = d.profile, steps = ['consent', 'week', 'goals', 'prefs', 'preview'], at = steps.indexOf(d.step);
    const bar = `<ol class="gx-steps" aria-label="${T('Steps', 'الخطوات')}">${[['About', 'حول'], ['Your week', 'أسبوعك'], ['Goals', 'الأهداف'], ['Preferences', 'التفضيلات'], ['Your plan', 'خطتك']].map((x, i) => `<li class="${i < at ? 'is-done' : i === at ? 'is-on' : ''}" ${i === at ? 'aria-current="step"' : ''}>${L(x)}</li>`).join('')}</ol>`;
    let body = '';
    if (d.step === 'consent') body = `<h2>${T('A plan built around your real week', 'خطة مبنية على أسبوعك الحقيقي')}</h2>
      <p>${T('You tell ERLY when you are free, what else you do, and what you want to work on. It builds a timetable that fits — and changes it with you every week.', 'تخبر إيرلي بأوقات فراغك والتزاماتك وما تريد العمل عليه، فيبني جدولاً يناسبك ويتغير معك كل أسبوع.')}</p>
      <ul class="gx-list"><li>${T('Stored on this device only, if you agree. Nothing is sent anywhere.', 'يُحفظ على هذا الجهاز فقط إن وافقت. لا يُرسل شيء.')}</li><li>${T('It plans time and activities. It never scores your ability or makes predictions about you.', 'يخطط للوقت والأنشطة، ولا يقيّم قدرتك أبداً.')}</li><li>${T('You can change, regenerate, export or delete everything at any time.', 'يمكنك تغيير كل شيء أو حذفه في أي وقت.')}</li></ul>
      <div class="gx-row"><button type="button" class="btn btn--accent" data-g="consent:device">${T('Start — save on this device', 'ابدأ — احفظ على هذا الجهاز')}</button><button type="button" class="btn btn--ghost" data-g="consent:memory">${T('Try without saving', 'جرّب دون حفظ')}</button></div>`;
    if (d.step === 'week') {
      const f = d.facts;
      body = `<h2>${T('Tell me about your week', 'أخبرني عن أسبوعك')}</h2><p>${T('In your own words: when you are free, regular commitments, exams or deadlines, and how you like to study.', 'بكلماتك: أوقات فراغك، التزاماتك، الامتحانات، وكيف تحب أن تدرس.')}</p>
      <label class="gx-field"><span class="sr-only">${T('Your week', 'أسبوعك')}</span><textarea id="gxText" rows="5" placeholder="${T('e.g. I’m free after 4pm on weekdays and 10am–1pm on Saturdays. Football on Tuesdays 5–7pm. Chemistry exam on 12 June. I lose focus after 25 minutes and study best in the evening. Keep Sunday free.', 'مثال: أنا متفرغ بعد الرابعة في أيام الأسبوع…')}">${esc(d.text)}</textarea></label>
      <div class="gx-row"><button type="button" class="btn btn--accent" data-g="understand">${T('Understand this', 'افهم هذا')}</button><button type="button" class="btn btn--ghost" data-g="manual">${T('Enter times by hand instead', 'أدخل الأوقات يدوياً')}</button></div>
      ${f || P.availability.length ? `<div class="gx-understood"><h3>${T('What I understood — check and correct it', 'ما فهمته — تحقق وصحّح')}</h3>${timesEditor(P)}
        ${f && f.deadlines.length ? `<p><b>${T('Dates', 'التواريخ')}:</b> ${f.deadlines.map(x => `${esc(x.what)}${x.subject ? ' · ' + esc(x.subject) : ''} — ${esc(x.date)}`).join('; ')}</p>` : ''}
        ${f && Object.keys(f.prefs).length ? `<p><b>${T('Preferences', 'التفضيلات')}:</b> ${[f.prefs.sessionLen ? T(`${f.prefs.sessionLen}-minute sessions`, `جلسات ${f.prefs.sessionLen} دقيقة`) : '', f.prefs.bestTime ? T(`best in the ${f.prefs.bestTime}`, 'الوقت المفضل') : '', f.prefs.restDay ? T(`rest day: ${L(DN[f.prefs.restDay])}`, 'يوم راحة') : ''].filter(Boolean).join(' · ')}</p>` : ''}
        ${f && f.wellbeing.length ? `<p class="gx-care">${T('You mentioned feeling stressed or tired. The plan will keep sessions short with breaks, and you can add a “Wellbeing and balance” goal. If it feels like a lot, talking to a counsellor can help — that’s what they are there for.', 'ذكرت أنك متوتر أو متعب. ستبقى الجلسات قصيرة مع فواصل. التحدث إلى مرشد قد يساعد.')}</p>` : ''}
        <div class="gx-row"><button type="button" class="btn btn--accent" data-g="to:goals" ${P.availability.length ? '' : 'disabled'}>${T('Next: goals', 'التالي: الأهداف')}</button></div>${P.availability.length ? '' : `<p class="gx-warn">${T('Add at least one time you are free.', 'أضف وقتاً واحداً على الأقل.')}</p>`}</div>` : ''}`;
    }
    if (d.step === 'goals') {
      const f = d.facts || { subjects: [], deadlines: [], wellbeing: [] };
      const sug = [].concat(f.deadlines.map(x => ({ text: `${x.subject ? x.subject[0].toUpperCase() + x.subject.slice(1) + ' ' : ''}${x.what}`, kind: /exam|test|mock|finals?|assessment/.test(x.what) ? 'exam' : 'writing', deadline: x.date, subject: x.subject })), f.subjects.filter(s => !f.deadlines.some(x => x.subject === s)).map(s => ({ text: s[0].toUpperCase() + s.slice(1), kind: s === 'handwriting' ? 'handwriting' : s === 'reading' ? 'reading' : 'subject', subject: s })), f.wellbeing.length ? [{ text: 'Short resets and balance', kind: 'wellbeing' }] : []).filter(x => !P.goals.some(g => g.text.toLowerCase() === x.text.toLowerCase()));
      body = `<h2>${T('What do you want to work on?', 'على ماذا تريد العمل؟')}</h2>
      ${sug.length ? `<p>${T('From what you wrote:', 'مما كتبت:')} ${sug.map((x, i) => `<button type="button" class="gx-chip" data-g="addsug:${i}">+ ${esc(x.text)}${x.deadline ? ' · ' + esc(x.deadline) : ''}</button>`).join(' ')}</p>` : ''}
      <form class="gx-add" data-form="goal"><label>${T('A goal, in your words', 'هدف بكلماتك')} <input name="text" required maxlength="80" placeholder="${T('e.g. Get confident with calculus', 'مثال: أثق بنفسي في التفاضل')}"></label><label>${T('Kind', 'النوع')} <select name="kind">${KINDS.map(([k, en, ar]) => `<option value="${k}">${T(en, ar)}</option>`).join('')}</select></label><button class="btn btn--ghost">${T('Add goal', 'أضف هدفاً')}</button></form>
      <div class="gx-goals">${P.goals.map(g => goalEditor(g)).join('') || `<p class="muted">${T('No goals yet.', 'لا أهداف بعد.')}</p>`}</div>
      <div class="gx-row"><button type="button" class="btn btn--ghost" data-g="to:week">${T('Back', 'رجوع')}</button><button type="button" class="btn btn--accent" data-g="to:prefs" ${P.goals.length ? '' : 'disabled'}>${T('Next: preferences', 'التالي: التفضيلات')}</button></div>`;
      window.__gxSug = sug;
    }
    if (d.step === 'prefs') body = `<h2>${T('How you like to study', 'كيف تحب أن تدرس')}</h2>${prefsEditor(P.prefs)}<div class="gx-row"><button type="button" class="btn btn--ghost" data-g="to:goals">${T('Back', 'رجوع')}</button><button type="button" class="btn btn--accent" data-g="to:preview">${T('Build my plan', 'ابنِ خطتي')}</button></div>`;
    if (d.step === 'preview') {
      const r = d.result, wk = r.sessions.filter(s => s.date < G.addDays(P.start, 7));
      body = `<h2>${T('Your plan', 'خطتك')}</h2><p>${T(`${r.sessions.length} sessions over ${P.prefs.horizonWeeks} weeks, all inside the times you gave and around your commitments.`, `${r.sessions.length} جلسة على مدى ${P.prefs.horizonWeeks} أسابيع.`)}</p>
      ${reportHtml(r.report, P)}${weekGrid(P, r.sessions, P.start, true)}
      <div class="gx-row"><button type="button" class="btn btn--ghost" data-g="to:prefs">${T('Back', 'رجوع')}</button><button type="button" class="btn btn--accent" data-g="accept">${T('Start this plan', 'ابدأ هذه الخطة')}</button></div>`;
      void wk;
    }
    app.innerHTML = `<section class="gx gx--onb" aria-labelledby="gxH">${bar}<div class="gx-card" id="gxH">${body}</div></section>`;
  }
  const timeRow = (k, x, i) => `<li><select data-t="${k}:${i}:day" aria-label="${T('Day', 'اليوم')}">${G.DAYS.map(dd => `<option value="${dd}" ${x.day === dd ? 'selected' : ''}>${L(DN[dd])}</option>`).join('')}</select><input type="time" value="${x.start}" step="900" data-t="${k}:${i}:start" aria-label="${T('From', 'من')}"> – <input type="time" value="${x.end}" step="900" data-t="${k}:${i}:end" aria-label="${T('To', 'إلى')}">${k === 'commitments' ? `<input value="${esc(x.label || '')}" data-t="${k}:${i}:label" placeholder="${T('what', 'ماذا')}" aria-label="${T('What', 'ماذا')}">` : ''}<button type="button" class="gx-x" data-g="rm:${k}:${i}" aria-label="${T('Remove', 'إزالة')}">✕</button>${x.from ? `<small class="muted" title="${esc(x.from)}">“${esc(x.from.slice(0, 48))}${x.from.length > 48 ? '…' : ''}”</small>` : ''}</li>`;
  const timesEditor = P => `<div class="gx-times"><div><b>${T('Free to study', 'متفرغ للدراسة')}</b><ul>${P.availability.map((x, i) => timeRow('availability', x, i)).join('')}</ul><button type="button" class="gx-link" data-g="addtime:availability">+ ${T('Add a free time', 'أضف وقت فراغ')}</button></div><div><b>${T('Fixed commitments', 'التزامات ثابتة')}</b><ul>${P.commitments.map((x, i) => timeRow('commitments', x, i)).join('')}</ul><button type="button" class="gx-link" data-g="addtime:commitments">+ ${T('Add a commitment', 'أضف التزاماً')}</button></div></div>`;
  function goalEditor(g) {
    const ask = g.kind === 'exam' && !g.deadline ? `<p class="gx-ask">${T('When is it? With a date, sessions build up before it and stop after it.', 'متى هو؟ مع تاريخ تتزايد الجلسات قبله.')}</p>` : g.kind === 'subject' && !(g.topics || []).length ? `<p class="gx-ask">${T('Which topics? Sessions rotate through them (e.g. “limits, derivatives, integrals”).', 'ما المواضيع؟')}</p>` : '';
    return `<fieldset class="gx-goal" style="--gc:${COLORS[Math.max(0, curProfile().goals.indexOf(g)) % COLORS.length]}"><legend><input value="${esc(g.text)}" data-gf="${g.id}:text" aria-label="${T('Goal', 'الهدف')}"></legend>
      <label>${T('Kind', 'النوع')} <select data-gf="${g.id}:kind">${KINDS.map(([k, en, ar]) => `<option value="${k}" ${g.kind === k ? 'selected' : ''}>${T(en, ar)}</option>`).join('')}</select></label>
      <label>${T('Deadline (optional)', 'الموعد (اختياري)')} <input type="date" value="${g.deadline || ''}" data-gf="${g.id}:deadline"></label>
      <label>${T('Priority', 'الأولوية')} <select data-gf="${g.id}:priority">${[[1, 'Low', 'منخفضة'], [2, 'Medium', 'متوسطة'], [3, 'High', 'عالية']].map(([v, en, ar]) => `<option value="${v}" ${+g.priority === v ? 'selected' : ''}>${T(en, ar)}</option>`).join('')}</select></label>
      <label>${T('Minutes a week', 'دقائق أسبوعياً')} <input type="number" min="15" max="900" step="15" value="${G.weeklyNeed(g)}" data-gf="${g.id}:weeklyMinutes"></label>
      <label class="gx-wide">${T('Topics (comma-separated, optional)', 'المواضيع (اختياري)')} <input value="${esc((g.topics || []).join(', '))}" data-gf="${g.id}:topics" placeholder="${T('e.g. moles, bonding, rates', 'مثال')}"></label>
      ${ask}<button type="button" class="gx-link gx-danger" data-g="rmgoal:${g.id}">${T('Remove goal', 'أزل الهدف')}</button></fieldset>`;
  }
  const prefsEditor = p => `<div class="gx-prefs">
    <label>${T('Session length', 'مدة الجلسة')} <select data-p="sessionLen">${[20, 25, 30, 45, 60, 90].map(v => `<option value="${v}" ${p.sessionLen === v ? 'selected' : ''}>${v} ${T('min', 'د')}</option>`).join('')}</select></label>
    <label>${T('Most study in one day', 'أقصى دراسة يومياً')} <select data-p="maxPerDay">${[45, 60, 90, 120, 150, 180, 240].map(v => `<option value="${v}" ${p.maxPerDay === v ? 'selected' : ''}>${v} ${T('min', 'د')}</option>`).join('')}</select></label>
    <label>${T('Best time to focus', 'أفضل وقت للتركيز')} <select data-p="bestTime">${[['morning', 'Morning', 'الصباح'], ['afternoon', 'Afternoon', 'بعد الظهر'], ['evening', 'Evening', 'المساء']].map(([v, en, ar]) => `<option value="${v}" ${p.bestTime === v ? 'selected' : ''}>${T(en, ar)}</option>`).join('')}</select></label>
    <label>${T('Rest day', 'يوم الراحة')} <select data-p="restDay"><option value="none">${T('None', 'لا يوجد')}</option>${G.DAYS.map(dd => `<option value="${dd}" ${p.restDay === dd ? 'selected' : ''}>${L(DN[dd])}</option>`).join('')}</select></label>
    <label>${T('Break after', 'استراحة بعد')} <select data-p="breakAfter">${[45, 60, 90, 120].map(v => `<option value="${v}" ${p.breakAfter === v ? 'selected' : ''}>${v} ${T('min of study', 'د دراسة')}</option>`).join('')}</select></label>
    <label>${T('Plan ahead', 'التخطيط مسبقاً')} <select data-p="horizonWeeks">${[1, 2, 4, 6, 8].map(v => `<option value="${v}" ${p.horizonWeeks === v ? 'selected' : ''}>${v} ${T(v === 1 ? 'week' : 'weeks', 'أسابيع')}</option>`).join('')}</select></label></div>`;
  function reportHtml(report, P) {
    if (!report.length) return `<p class="gx-ok">✓ ${T('Everything you asked for fits.', 'كل ما طلبته يتسع.')}</p>`;
    const by = {}; report.forEach(r => { by[r.goalId] = (by[r.goalId] || 0) + r.minutesUnplaced; });
    return `<div class="gx-warnbox" role="status"><b>${T('Not everything fits — nothing was squeezed in:', 'لم يتسع كل شيء — ولم يُحشر شيء:')}</b><ul>${Object.entries(by).map(([id, m]) => `<li>${esc(((P.goals.find(g => g.id === id)) || {}).text)}: ${m} ${T('minutes could not be placed', 'دقيقة لم تُجدول')}</li>`).join('')}</ul><small>${T('Add free time, raise the daily maximum, or lower the minutes a week for a goal.', 'أضف وقتاً أو ارفع الحد اليومي أو قلّل الدقائق.')}</small></div>`;
  }

  /* ======================= the plan views ======================= */
  const TABS = [['today', 'Today', 'اليوم'], ['week', 'Week', 'الأسبوع'], ['calendar', 'Calendar', 'التقويم'], ['timeline', 'Timeline', 'الخط الزمني'], ['progress', 'Progress & review', 'التقدم والمراجعة'], ['settings', 'Settings', 'الإعدادات']];
  function dash() {
    const P = S.profile;
    let body = '';
    if (view === 'today') body = dayView(focusDate || today());
    if (view === 'week') body = `<div class="gx-nav"><button type="button" class="gx-ic" data-g="wk:-7" aria-label="${T('Previous week', 'الأسبوع السابق')}">‹</button><b>${T('Week of', 'أسبوع')} ${fmtDate(G.weekStart(focusDate || today()))}</b><button type="button" class="gx-ic" data-g="wk:7" aria-label="${T('Next week', 'الأسبوع التالي')}">›</button><span class="muted cmp-small">${T('Drag a session to move it. Moves that clash with a commitment, the daily maximum or a deadline are refused.', 'اسحب جلسة لنقلها. يُرفض النقل المتعارض.')}</span></div>${weekGrid(P, S.sessions, G.weekStart(focusDate || today()), false)}`;
    if (view === 'calendar') body = monthView();
    if (view === 'timeline') body = timelineView();
    if (view === 'progress') body = progressView();
    if (view === 'settings') body = settingsView();
    app.innerHTML = `<section class="gx" aria-label="${T('Growth Plan', 'خطة النمو')}">
      <div class="gx-top"><div class="gx-tabs" role="tablist">${TABS.map(([k, en, ar]) => `<button type="button" role="tab" aria-selected="${view === k}" data-view="${k}">${T(en, ar)}</button>`).join('')}</div>
      <div class="gx-actions"><button type="button" class="btn btn--ghost btn--sm" data-g="regen">↻ ${T('Regenerate', 'أعد التوليد')}</button><details class="gx-export"><summary class="btn btn--ghost btn--sm">⤓ ${T('Export', 'تصدير')}</summary><div><button type="button" data-g="export:ics">${T('Calendar file (.ics)', 'ملف تقويم (.ics)')}</button><button type="button" data-g="export:csv">${T('Spreadsheet (.csv)', 'جدول (.csv)')}</button><button type="button" data-g="export:print">${T('Print', 'طباعة')}</button></div></details></div></div>
      ${S.consent === 'memory' ? `<p class="gx-note">${T('Not saved: this plan lasts until you leave the page.', 'غير محفوظة: تبقى الخطة حتى تغادر الصفحة.')} <button type="button" class="gx-link" data-g="savenow">${T('Save on this device', 'احفظ على هذا الجهاز')}</button></p>` : ''}
      <div class="gx-body">${body}</div>${pending ? diffModal() : ''}</section>`;
    if (view === 'week') wireDrag();
  }
  function card(s) {
    const ex = s.exercise || {}, t = G.TYPES[ex.type] || { title: ['Study', 'دراسة'], why: ['', ''] }, g = goalOf(s.goalId);
    return `<article class="gx-sess is-${s.status}" style="--gc:${colorOf(s.goalId)}" data-sid="${s.id}">
      <header><span class="gx-time">${s.start}–${s.end}</span><b>${L(t.title)}: ${esc(ex.topic || g.text)}</b>${s.spaced || s.review ? `<span class="gx-tag">${T('spaced review', 'مراجعة متباعدة')}</span>` : ''}${s.locked ? `<span class="gx-tag">${T('moved by you', 'نقلتها أنت')}</span>` : ''}<span class="gx-st">${s.status === 'done' ? '✓ ' + T('Done', 'تم') : s.status === 'skipped' ? T('Skipped', 'متخطاة') : ''}</span></header>
      <p class="gx-why">${esc(g.text)} · ${L(t.why)}</p>
      <ol class="gx-stepsl">${(ex.steps || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      ${s.status === 'planned' ? `<div class="gx-row">${ex.launch ? `<a class="btn btn--accent btn--sm" href="${esc(ex.launch.href)}">${L(ex.launch.label)} →</a>` : ''}<button type="button" class="btn btn--ghost btn--sm" data-g="done:${s.id}">✓ ${T('Mark done', 'تم')}</button><button type="button" class="btn btn--ghost btn--sm" data-g="skip:${s.id}">${T('Skip', 'تخطَّ')}</button><button type="button" class="btn btn--ghost btn--sm" data-g="resched:${s.id}">${T('Reschedule', 'أعد الجدولة')}</button><button type="button" class="btn btn--ghost btn--sm" data-g="edit:${s.id}">${T('Edit', 'تعديل')}</button></div>` : `<div class="gx-row"><button type="button" class="gx-link" data-g="undo:${s.id}">${T('Undo', 'تراجع')}</button>${s.rating ? `<small class="muted">${T('felt', 'شعرت')}: ${s.rating}/5</small>` : ''}${s.reason ? `<small class="muted">${esc(s.reason)}</small>` : ''}</div>`}
      <div class="gx-inline" data-inline="${s.id}"></div></article>`;
  }
  function dayView(date) {
    const list = S.sessions.filter(s => s.date === date), next = S.sessions.find(s => s.date > date && s.status === 'planned');
    return `<div class="gx-nav"><button type="button" class="gx-ic" data-g="day:-1" aria-label="${T('Previous day', 'اليوم السابق')}">‹</button><b>${fmtDate(date)}</b><button type="button" class="gx-ic" data-g="day:1" aria-label="${T('Next day', 'اليوم التالي')}">›</button>${date !== today() ? `<button type="button" class="gx-link" data-g="day:0">${T('Back to today', 'عودة لليوم')}</button>` : ''}</div>
      ${list.length ? list.map(card).join('') : `<p class="muted">${T('Nothing planned on this day.', 'لا شيء مخطط في هذا اليوم.')}${next ? ' ' + T('Next session:', 'الجلسة التالية:') + ` <button type="button" class="gx-link" data-g="goto:${next.date}">${fmtDate(next.date)} ${next.start}</button>` : ''}</p>`}`;
  }
  function weekGrid(P, sessions, w0, preview) {
    const days = Array.from({ length: 7 }, (_, i) => G.addDays(w0, i));
    const mins = [].concat(P.availability.map(a => G.toMin(a.start)), P.commitments.map(c => G.toMin(c.start))).filter(isFinite), maxs = [].concat(P.availability.map(a => G.toMin(a.end)), P.commitments.map(c => G.toMin(c.end))).filter(isFinite);
    const h0 = Math.floor((mins.length ? Math.min(...mins) : 480) / 60) * 60, h1 = Math.ceil((maxs.length ? Math.max(...maxs) : 1260) / 60) * 60, PX = 1.1, H = (h1 - h0) * PX;
    const y = m => (m - h0) * PX;
    return `<div class="gx-week ${preview ? 'is-preview' : ''}" data-h0="${h0}" data-px="${PX}" style="--gh:${H}px"><div class="gx-hours">${Array.from({ length: (h1 - h0) / 60 + 1 }, (_, i) => `<span style="top:${i * 60 * PX}px">${G.hhmm(h0 + i * 60)}</span>`).join('')}</div>
      ${days.map(d => { const k = G.dayKey(d), rest = (P.prefs.restDay === k); return `<div class="gx-col ${d === today() ? 'is-today' : ''}" data-date="${d}"><div class="gx-colh">${L(DN[k])} <small>${d.slice(8)}</small></div><div class="gx-lane">${rest ? `<div class="gx-rest">${T('Rest day', 'يوم راحة')}</div>` : ''}
        ${P.availability.filter(a => a.day === k).map(a => `<div class="gx-free" style="top:${y(G.toMin(a.start))}px;height:${(G.toMin(a.end) - G.toMin(a.start)) * PX}px"></div>`).join('')}
        ${P.commitments.filter(c => c.day === k || c.date === d).map(c => `<div class="gx-busy" style="top:${y(G.toMin(c.start))}px;height:${(G.toMin(c.end) - G.toMin(c.start)) * PX}px"><span>${esc(c.label || T('busy', 'مشغول'))}</span></div>`).join('')}
        ${sessions.filter(s => s.date === d).map(s => `<button type="button" class="gx-chipS is-${s.status}" ${preview || s.status !== 'planned' ? '' : 'draggable="false" data-drag="1"'} data-sid="${s.id}" style="top:${y(G.toMin(s.start))}px;height:${Math.max(18, len(s) * PX - 2)}px;--gc:${colorOf(s.goalId)}" aria-label="${esc(`${s.start}–${s.end} ${(G.TYPES[(s.exercise || {}).type] || { title: ['Study'] }).title[0]}: ${(s.exercise || {}).topic || ''}`)}"><b>${s.start}</b> ${esc(L((G.TYPES[(s.exercise || {}).type] || { title: ['Study', 'دراسة'] }).title))}<small>${esc((s.exercise || {}).topic || '')}</small></button>`).join('')}</div></div>`; }).join('')}</div>`;
  }
  // pointer-based drag (mouse, touch, pen) with 15-minute snapping; every drop is checked against the constraints
  function wireDrag() {
    const grid = app.querySelector('.gx-week'); if (!grid) return;
    const h0 = +grid.dataset.h0, PX = +grid.dataset.px;
    grid.querySelectorAll('[data-drag]').forEach(el => {
      el.addEventListener('pointerdown', e => {
        if (e.button > 0) return; const sid = el.dataset.sid, s = S.sessions.find(x => x.id === sid); if (!s) return;
        const r0 = el.getBoundingClientRect(), offY = e.clientY - r0.top; let moved = false, target = null;
        const ghost = el.cloneNode(true); ghost.classList.add('is-ghost'); ghost.removeAttribute('data-drag'); try { el.setPointerCapture(e.pointerId); } catch (er) { /* ok */ } e.preventDefault();
        const mv = ev => {
          if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 6) return;
          if (!moved) { moved = true; el.classList.add('is-lifted'); }
          const col = document.elementsFromPoint(ev.clientX, ev.clientY).map(n => n.closest && n.closest('.gx-col')).find(Boolean); if (!col) return;
          const lane = col.querySelector('.gx-lane'), lr = lane.getBoundingClientRect(), m = Math.round(((ev.clientY - offY - lr.top) / PX + h0) / 15) * 15;
          target = { date: col.dataset.date, start: G.hhmm(Math.max(0, Math.min(23 * 60 + 45, m))) };
          if (ghost.parentElement !== lane) lane.appendChild(ghost); ghost.style.top = ((m - h0) * PX) + 'px';
          const ok = G.checkMove(S.profile, S.sessions, sid, target.date, target.start).ok; ghost.classList.toggle('is-bad', !ok); ghost.querySelector('b').textContent = target.start;
        };
        const up = () => {
          el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); ghost.remove(); el.classList.remove('is-lifted');
          if (!moved) { focusDate = s.date; view = 'today'; return render(); }
          if (target) tryMove(sid, target.date, target.start);
        };
        el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
    });
  }
  const RULE = { 'outside free time or inside a commitment': ['That time is outside your free time or clashes with a commitment.', 'هذا الوقت خارج وقت فراغك أو يتعارض مع التزام.'], overlap: ['Another session is already there.', 'توجد جلسة أخرى في هذا الوقت.'], 'daily cap': ['That would go over your daily maximum.', 'سيتجاوز ذلك حدك اليومي.'], 'after the deadline': ['That is after the goal’s deadline.', 'هذا بعد موعد الهدف.'] };
  function tryMove(sid, date, start, force) {
    const r = G.checkMove(S.profile, S.sessions, sid, date, start);
    if (!r.ok && !force) { toast(r.why.map(w => L(RULE[w] || [w, w])).join(' ')); render(); return false; }
    const s = S.sessions.find(x => x.id === sid); Object.assign(s, { date, start, end: r.moved.end, locked: true, custom: force ? true : s.custom });
    S.sessions.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)); log('move'); save(); toast(T(`Moved to ${fmtDate(date)} ${start}.`, `نُقلت إلى ${start}.`)); render(); return true;
  }
  function monthView() {
    const base = monthOf || today().slice(0, 7) + '-01', first = G.weekStart(base), m = base.slice(0, 7);
    const days = Array.from({ length: 42 }, (_, i) => G.addDays(first, i));
    return `<div class="gx-nav"><button type="button" class="gx-ic" data-g="mon:-1" aria-label="${T('Previous month', 'الشهر السابق')}">‹</button><b>${new Date(base + 'T12:00').toLocaleDateString(window.I18N && I18N.lang === 'ar' ? 'ar' : 'en-GB', { month: 'long', year: 'numeric' })}</b><button type="button" class="gx-ic" data-g="mon:1" aria-label="${T('Next month', 'الشهر التالي')}">›</button></div>
      <div class="gx-month" role="grid">${G.DAYS.map(dd => `<div class="gx-mh" role="columnheader">${L(DN[dd])}</div>`).join('')}${days.map(d => { const ss = S.sessions.filter(s => s.date === d), dl = S.profile.goals.filter(g => g.deadline === d); return `<button type="button" role="gridcell" class="gx-md ${d.slice(0, 7) !== m ? 'is-out' : ''} ${d === today() ? 'is-today' : ''}" data-g="goto:${d}" aria-label="${esc(d + ': ' + ss.length + ' ' + T('sessions', 'جلسات'))}"><span>${+d.slice(8)}</span><i>${ss.map(s => `<em class="is-${s.status}" style="--gc:${colorOf(s.goalId)}"></em>`).join('')}</i>${dl.map(g => `<b class="gx-dl" style="--gc:${colorOf(g.id)}">⚑ ${esc(g.text)}</b>`).join('')}</button>`; }).join('')}</div>`;
  }
  function timelineView() {
    const P = S.profile, start = G.weekStart(P.start), weeks = Math.max(P.prefs.horizonWeeks, ...P.goals.filter(g => g.deadline).map(g => Math.ceil(G.daysBetween(start, g.deadline) / 7) + 1)), W = Math.min(16, weeks);
    return `<div class="gx-tl" style="--wk:${W}"><div class="gx-tlh"><span></span>${Array.from({ length: W }, (_, i) => `<span>${fmtDate(G.addDays(start, i * 7))}</span>`).join('')}</div>
      ${P.goals.map(g => `<div class="gx-tlr" style="--gc:${colorOf(g.id)}"><b>${esc(g.text)}</b>${Array.from({ length: W }, (_, i) => { const a = G.addDays(start, i * 7), b = G.addDays(a, 6), ss = S.sessions.filter(s => s.goalId === g.id && s.date >= a && s.date <= b), m = ss.reduce((t, s) => t + len(s), 0), dn = ss.filter(s => s.status === 'done').reduce((t, s) => t + len(s), 0), isDl = g.deadline && g.deadline >= a && g.deadline <= b; return `<span class="gx-tlc ${isDl ? 'is-dl' : ''}" title="${m} ${T('min planned', 'د مخططة')}, ${dn} ${T('done', 'منجزة')}"><i style="height:${Math.min(100, m / 3)}%"></i><i class="is-done" style="height:${Math.min(100, dn / 3)}%"></i>${isDl ? '<em>⚑</em>' : ''}</span>`; }).join('')}</div>`).join('')}
      <p class="muted cmp-small">${T('Bar height: minutes planned per week (lighter) and done (darker). ⚑ deadline.', 'ارتفاع العمود: الدقائق المخططة والمنجزة أسبوعياً. ⚑ موعد.')}</p></div>`;
  }
  function progressView() {
    const pr = G.progress(S.profile, S.sessions, today()), R = G.weekReview(S.profile, S.sessions, focusDate || today());
    const askNoor = 'student.html?ask=' + encodeURIComponent(G.reviewText(R));
    return `<div class="gx-prog">${pr.map(g => `<div class="gx-pg" style="--gc:${colorOf(g.goalId)}"><b>${esc(g.text)}</b>${g.daysLeft != null ? `<small>${g.daysLeft >= 0 ? T(`${g.daysLeft} days to go`, `${g.daysLeft} يوماً متبقياً`) : T('deadline passed', 'انتهى الموعد')}</small>` : ''}<div class="gx-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${g.minutesPlanned}" aria-valuenow="${g.minutesDone}" aria-label="${esc(g.text)}"><i style="width:${Math.round(g.share * 100)}%"></i></div><small>${g.minutesDone}/${g.minutesPlanned} ${T('minutes', 'دقيقة')} · ${g.done} ${T('done', 'منجزة')} · ${g.skipped} ${T('skipped', 'متخطاة')}</small></div>`).join('')}</div>
      <div class="gx-review"><h3>${T('This week', 'هذا الأسبوع')} (${fmtDate(R.week)})</h3><p>${T(`${R.done} of ${R.planned} sessions done · ${R.minutes} minutes · ${R.skipped} skipped · ${R.open} still open.`, `${R.done} من ${R.planned} جلسات منجزة.`)}</p>
        ${Object.keys(R.reasons).length ? `<p><b>${T('Why sessions were skipped', 'أسباب التخطي')}:</b> ${Object.entries(R.reasons).map(([k, v]) => `${esc(k)} ×${v}`).join(', ')}</p>` : ''}
        ${R.suggestions.length ? `<ul class="gx-sugg">${R.suggestions.map(x => `<li>${L(x)}</li>`).join('')}</ul>` : ''}
        <p class="muted cmp-small">${T('Written only from what you did and told the plan. It is not an assessment.', 'مكتوبة فقط مما فعلت وأخبرت به الخطة. ليست تقييماً.')}</p>
        <div class="gx-row"><a class="btn btn--accent btn--sm" href="${esc(askNoor)}">${T('Review the week with Noor', 'راجع الأسبوع مع نور')} →</a><button type="button" class="btn btn--ghost btn--sm" data-g="regen">${T('Adjust next week (regenerate)', 'عدّل الأسبوع القادم')}</button></div>
        <details><summary>${T('What Noor will see', 'ما ستراه نور')}</summary><pre class="gx-pre">${esc(G.reviewText(R))}</pre></details></div>`;
  }
  function settingsView() {
    const P = S.profile;
    return `<div class="gx-settings"><h3>${T('Your times', 'أوقاتك')}</h3>${timesEditor(P)}<h3>${T('Goals', 'الأهداف')}</h3><form class="gx-add" data-form="goal"><label>${T('Add a goal', 'أضف هدفاً')} <input name="text" required maxlength="80"></label><label>${T('Kind', 'النوع')} <select name="kind">${KINDS.map(([k, en, ar]) => `<option value="${k}">${T(en, ar)}</option>`).join('')}</select></label><button class="btn btn--ghost">${T('Add', 'أضف')}</button></form><div class="gx-goals">${P.goals.map(goalEditor).join('')}</div>
      <h3>${T('Preferences', 'التفضيلات')}</h3>${prefsEditor(P.prefs)}
      <p class="muted cmp-small">${T('Changes here take effect when you regenerate — you will see exactly what changes before it does.', 'تسري التغييرات عند إعادة التوليد — وسترى ما يتغير قبل ذلك.')}</p><div class="gx-row"><button type="button" class="btn btn--accent" data-g="regen">↻ ${T('Regenerate with these settings', 'أعد التوليد بهذه الإعدادات')}</button></div>
      <h3>${T('Your data', 'بياناتك')}</h3><p>${S.consent === 'device' ? T('Saved in this browser only (goals, times, sessions and what you marked). Nothing is sent anywhere.', 'محفوظة في هذا المتصفح فقط.') : T('Not saved — this plan lasts until you leave the page.', 'غير محفوظة.')}</p>
      <div class="gx-row">${S.consent === 'device' ? `<button type="button" class="btn btn--ghost" data-g="unsave">${T('Stop saving (keep for this visit)', 'أوقف الحفظ')}</button>` : `<button type="button" class="btn btn--ghost" data-g="savenow">${T('Save on this device', 'احفظ على هذا الجهاز')}</button>`}<button type="button" class="btn btn--ghost gx-danger" data-g="deleteall">${T('Delete all Growth Plan data', 'احذف كل بيانات خطة النمو')}</button></div></div>`;
  }
  function diffModal() {
    const d = pending.diff, row = s => `<li style="--gc:${colorOf(s.goalId)}">${fmtDate(s.date)} ${s.start}–${s.end} · ${esc(L((G.TYPES[(s.exercise || {}).type] || { title: ['Study', 'دراسة'] }).title))}: ${esc((s.exercise || {}).topic || goalOf(s.goalId).text)}</li>`;
    return `<div class="gx-modal" role="dialog" aria-modal="true" aria-labelledby="gxDiffH"><div class="gx-modal__card"><h3 id="gxDiffH">${T('Before anything changes — here is the difference', 'قبل أي تغيير — هذا هو الفرق')}</h3>
      <p>${T(`${d.added.length} added · ${d.moved.length} moved · ${d.removed.length} removed · ${d.unchanged} unchanged. Sessions you finished, skipped or moved yourself are kept as they are.`, `${d.added.length} مضافة · ${d.moved.length} منقولة · ${d.removed.length} محذوفة.`)}</p>
      ${reportHtml(pending.report, S.profile)}
      <div class="gx-diff">${d.added.length ? `<div><b>+ ${T('Added', 'مضافة')}</b><ul>${d.added.slice(0, 40).map(row).join('')}</ul></div>` : ''}${d.moved.length ? `<div><b>↔ ${T('Moved', 'منقولة')}</b><ul>${d.moved.slice(0, 40).map(m => `<li style="--gc:${colorOf(m.to.goalId)}">${fmtDate(m.from.date)} ${m.from.start} → ${m.to.start} · ${esc((m.to.exercise || {}).topic || '')}</li>`).join('')}</ul></div>` : ''}${d.removed.length ? `<div><b>− ${T('Removed', 'محذوفة')}</b><ul>${d.removed.slice(0, 40).map(row).join('')}</ul></div>` : ''}</div>
      <div class="gx-row"><button type="button" class="btn btn--ghost" data-g="diff:cancel">${T('Keep my current plan', 'أبقِ خطتي الحالية')}</button><button type="button" class="btn btn--accent" data-g="diff:apply">${T('Apply these changes', 'طبّق هذه التغييرات')}</button></div></div></div>`;
  }
  function inline(sid, kind) {
    const box = app.querySelector(`[data-inline="${sid}"]`); if (!box) return; const s = S.sessions.find(x => x.id === sid);
    if (kind === 'done') box.innerHTML = `<form data-form="done:${sid}" class="gx-form"><label>${T('Minutes spent', 'الدقائق')} <input type="number" name="minutes" min="1" max="300" value="${len(s)}"></label><fieldset><legend>${T('How did it feel?', 'كيف كان الشعور؟')}</legend>${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="rating" value="${v}" ${v === 3 ? 'checked' : ''}> ${['😣', '😕', '😐', '🙂', '😄'][v - 1]}<span class="sr-only">${v}</span></label>`).join('')}</fieldset><button class="btn btn--accent btn--sm">${T('Save', 'احفظ')}</button></form>`;
    if (kind === 'skip') box.innerHTML = `<form data-form="skip:${sid}" class="gx-form"><label>${T('Why? (optional — helps the weekly review)', 'لماذا؟ (اختياري)')} <select name="reason"><option>${T('no reason given', 'دون سبب')}</option><option>${T('too tired', 'متعب جداً')}</option><option>${T('no time / busy', 'لا وقت')}</option><option>${T('too hard', 'صعبة جداً')}</option><option>${T('not useful', 'غير مفيدة')}</option><option>${T('unwell', 'متوعك')}</option></select></label><button class="btn btn--ghost btn--sm">${T('Skip it', 'تخطَّها')}</button></form>`;
    if (kind === 'resched') { const sug = nextFree(s); box.innerHTML = `<form data-form="move:${sid}" class="gx-form"><label>${T('Day', 'اليوم')} <input type="date" name="date" value="${sug ? sug.date : s.date}"></label><label>${T('Start', 'البداية')} <input type="time" name="start" step="900" value="${sug ? sug.start : s.start}"></label><button class="btn btn--accent btn--sm">${T('Move', 'انقل')}</button>${sug ? `<small class="muted">${T('Suggested: the next free time that fits.', 'مقترح: أقرب وقت فراغ مناسب.')}</small>` : ''}</form>`; }
    if (kind === 'edit') box.innerHTML = `<form data-form="edit:${sid}" class="gx-form"><label>${T('Topic', 'الموضوع')} <input name="topic" value="${esc(s.exercise.topic || '')}"></label><label>${T('Activity', 'النشاط')} <select name="type">${Object.keys(G.TYPES).map(k => `<option value="${k}" ${s.exercise.type === k ? 'selected' : ''}>${L(G.TYPES[k].title)}</option>`).join('')}</select></label><label>${T('Length', 'المدة')} <select name="len">${[15, 20, 25, 30, 45, 60, 90].map(v => `<option ${len(s) === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><button class="btn btn--accent btn--sm">${T('Save', 'احفظ')}</button></form>`;
    const f = box.querySelector('input, select, button'); if (f) f.focus();
  }
  function nextFree(s) {
    const L0 = len(s);
    for (let k = 0; k < 14; k++) { const date = G.addDays(today() > s.date ? today() : s.date, k); for (const [a, b] of G.freeIntervals(S.profile, date)) for (let t = Math.ceil(a / 15) * 15; t + L0 <= b; t += 15) { if (date === s.date && G.hhmm(t) === s.start) continue; if (G.checkMove(S.profile, S.sessions, s.id, date, G.hhmm(t)).ok) return { date, start: G.hhmm(t) }; } }
    return null;
  }
  const log = kind => { S.history = (S.history || []).slice(-200); S.history.push({ at: Date.now(), kind }); };
  function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400); }

  /* ======================= events ======================= */
  function profileOf() { return draft ? draft.profile : S.profile; }
  app.addEventListener('click', e => {
    const tab = e.target.closest('[data-view]'); if (tab) { view = tab.dataset.view; return render(); }
    const b = e.target.closest('[data-g]'); if (!b) return;
    const [k, a, c] = b.dataset.g.split(':'), P = profileOf();
    if (k === 'consent') { draft.consent = a; draft.step = 'week'; return render(); }
    if (k === 'understand') { draft.text = (app.querySelector('#gxText') || {}).value || ''; const f = G.understand(draft.text, today()); draft.facts = f; P.availability = f.availability.slice(); P.commitments = f.commitments.slice(); Object.assign(P.prefs, f.prefs); return render(); }
    if (k === 'manual') { draft.text = (app.querySelector('#gxText') || {}).value || ''; if (!P.availability.length) P.availability.push({ day: 'mon', start: '16:00', end: '18:00' }); draft.facts = draft.facts || { deadlines: [], subjects: [], prefs: {}, wellbeing: [] }; return render(); }
    if (k === 'addtime') { P[a].push({ day: 'mon', start: a === 'availability' ? '16:00' : '17:00', end: a === 'availability' ? '18:00' : '18:00', label: a === 'commitments' ? '' : null }); return render(); }
    if (k === 'rm') { P[a].splice(+c, 1); if (S) save(); return render(); }
    if (k === 'to') { draft.step = a; if (a === 'preview') draft.result = G.plan(P, {}); return render(); }
    if (k === 'addsug') { const x = (window.__gxSug || [])[+a]; if (x) P.goals.push(Object.assign({ id: 'g' + Date.now().toString(36) + P.goals.length, priority: x.deadline ? 3 : 2, topics: [] }, x)); return render(); }
    if (k === 'rmgoal') { P.goals = P.goals.filter(g => g.id !== a); if (S && !draft) { S.sessions = S.sessions.filter(s => s.goalId !== a || s.status !== 'planned'); save(); } return render(); }
    if (k === 'accept') { S = { v: 18, consent: draft.consent, profile: draft.profile, sessions: draft.result.sessions, history: [], created: Date.now() }; draft = null; log('accept'); save(); view = 'today'; toast(T('Your plan is ready.', 'خطتك جاهزة.')); return render(); }
    if (k === 'day') { focusDate = +a === 0 ? today() : G.addDays(focusDate || today(), +a); return render(); }
    if (k === 'wk') { focusDate = G.addDays(focusDate || today(), +a); return render(); }
    if (k === 'mon') { const base = new Date((monthOf || today().slice(0, 7) + '-01') + 'T12:00'); base.setMonth(base.getMonth() + +a); monthOf = G.iso(base).slice(0, 7) + '-01'; return render(); }
    if (k === 'goto') { focusDate = a; view = 'today'; return render(); }
    if (['done', 'skip', 'resched', 'edit'].includes(k)) return inline(a, k);
    if (k === 'undo') { const s = S.sessions.find(x => x.id === a); if (s) { s.status = 'planned'; delete s.rating; delete s.reason; delete s.minutes; log('undo'); save(); } return render(); }
    if (k === 'regen') { pending = G.regenerate(S.profile, S.sessions, today()); return render(); }
    if (k === 'diff') { if (a === 'apply' && pending) { S.sessions = pending.sessions; log('regenerate'); save(); toast(T('Plan updated.', 'حُدّثت الخطة.')); } pending = null; return render(); }
    if (k === 'export') { if (a === 'ics') download('erly-growth-plan.ics', G.toICS(S.profile, S.sessions), 'text/calendar'); if (a === 'csv') download('erly-growth-plan.csv', G.toCSV(S.profile, S.sessions), 'text/csv'); if (a === 'print') { view = 'week'; render(); setTimeout(() => window.print(), 100); } return; }
    if (k === 'savenow') { S.consent = 'device'; save(); toast(T('Saved on this device.', 'حُفظت على هذا الجهاز.')); return render(); }
    if (k === 'unsave') { S.consent = 'memory'; try { localStorage.removeItem(KEY); } catch (er) { /* none */ } return render(); }
    if (k === 'deleteall') { if (!confirm(T('Delete your whole Growth Plan from this device? This cannot be undone.', 'حذف خطة النمو كاملة من هذا الجهاز؟ لا يمكن التراجع.'))) return; [KEY].concat(OLD).forEach(x => { try { localStorage.removeItem(x); } catch (er) { /* none */ } }); S = null; startDraft(); toast(T('All Growth Plan data was deleted from this device.', 'حُذفت كل بيانات خطة النمو من هذا الجهاز.')); return render(); }
  });
  app.addEventListener('change', e => {
    const P = profileOf(), t = e.target;
    if (t.dataset.t) { const [k, i, f] = t.dataset.t.split(':'); P[k][+i][f] = t.value; if (S && !draft) save(); return; }
    if (t.dataset.gf) { const [id, f] = t.dataset.gf.split(':'), g = P.goals.find(x => x.id === id); if (!g) return; g[f] = f === 'topics' ? t.value.split(',').map(x => x.trim()).filter(Boolean) : ['priority', 'weeklyMinutes'].includes(f) ? +t.value : t.value || undefined; if (S && !draft) save(); if (['kind', 'deadline', 'topics'].includes(f)) setTimeout(render, 0); return; }
    if (t.dataset.p) { P.prefs[t.dataset.p] = t.dataset.p === 'restDay' || t.dataset.p === 'bestTime' ? t.value : +t.value; if (S && !draft) save(); }
  });
  app.addEventListener('submit', e => {
    e.preventDefault(); const f = e.target, k = f.dataset.form || '', fd = new FormData(f), P = profileOf();
    if (k === 'goal') { const text = String(fd.get('text') || '').trim(); if (!text) return; P.goals.push({ id: 'g' + Date.now().toString(36) + P.goals.length, text, kind: fd.get('kind'), priority: 2, topics: [] }); if (S && !draft) save(); return render(); }
    const [act, sid] = k.split(':'), s = S && S.sessions.find(x => x.id === sid); if (!s) return;
    if (act === 'done') { Object.assign(s, { status: 'done', minutes: +fd.get('minutes') || len(s), rating: +fd.get('rating') || null, doneAt: Date.now() }); log('done'); save(); toast(T('Marked done.', 'تم.')); return render(); }
    if (act === 'skip') { Object.assign(s, { status: 'skipped', reason: String(fd.get('reason') || '') }); log('skip'); save(); return render(); }
    if (act === 'move') return tryMove(sid, fd.get('date'), fd.get('start'));
    if (act === 'edit') { const L1 = +fd.get('len'); s.exercise = G.exerciseOf(String(fd.get('type')), String(fd.get('topic') || s.exercise.topic), L1); s.end = G.hhmm(G.toMin(s.start) + L1); s.locked = true; const v = G.violations(S.profile, S.sessions).filter(x => x.id === sid); if (v.length) toast(L(RULE[v[0].rule] || [v[0].rule, v[0].rule])); log('edit'); save(); return render(); }
  });
  app.addEventListener('keydown', e => { if (e.key === 'Escape' && pending) { pending = null; render(); } });
  function render() { if (draft) onboarding(); else if (S) dash(); else { startDraft(); onboarding(); } }
  window.ERLY = window.ERLY || {};
  ERLY.growth = { state: () => S, draft: () => draft, render, setToday: d => { window.__growthToday = d; render(); }, view: v => { view = v; render(); } };
  render();
})();
