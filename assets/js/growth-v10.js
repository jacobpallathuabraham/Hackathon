/* ERLY — Growth Plan v10 interface: daily planner, UK-style timetable, the
   six-week programme (journey map + weekly cards), weekly progress from real
   activity, Noor's weekly review, strategy library and a future plan.

   Storage: this device only ("erly-gplan-v10"). It READS (never writes) the
   student's own ERLY data on this device to suggest ticks — games
   ("erly-games-v1"), Reading Studio progress ("erly-studio-v1") and Daily
   Quest check-ins ("erly-checkins-v1"). Suggestions are shown as
   suggestions; only the student marks anything done. No streaks, no
   penalties, no ability scores. */
(function () {
  'use strict';
  const P = window.ERLY_GPLAN; if (!P) return;
  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en);
  const L = p => (p ? T(p[0], p[1]) : '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const KEY = 'erly-gplan-v10';
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  let V = read(KEY);
  if (!V || !V.tt) V = { tt: Object.assign({}, P.DEFAULT_TT), week: 1, status: 'active', planner: {}, reviews: [], prefs: {}, strat: {}, started: Date.now(), tab: 'overview', day: null };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(V)); } catch (e) { /* not persisted */ } };
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const offset = () => { try { const g = JSON.parse(localStorage.getItem('erly-growth-v1') || 'null'); return ((g && g.demoDays) || 0) * 864e5; } catch (e) { return 0; } };
  const today = () => keyOf(new Date(Date.now() + offset()));
  const dateOf = k => new Date(k + 'T12:00:00');
  const dayName = k => P.DAYS[(dateOf(k).getDay() + 6) % 7];
  const addDays = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const WEEK = () => P.WEEKS[Math.max(0, Math.min(5, V.week - 1))];

  /* ---------- truthful links into the rest of ERLY ---------- */
  function link(where) {
    if (!where || where === 'self') return null;
    if (/^game:/.test(where)) return { href: 'games.html?play=' + where.slice(5), label: T('Open the game', 'افتح اللعبة') };
    return ({ studio: { href: 'student.html#reading-studio', label: T('Open Reading Studio', 'افتح استوديو القراءة') }, videos: { href: 'student.html#videos', label: T('Open Videos', 'افتح الفيديوهات') }, ramp: { href: 'student.html#ramp', label: T('Open Start-Ramp', 'افتح منحدر البدء') }, checkins: { href: 'games.html', label: T('Open Learning Games', 'افتح ألعاب التعلّم') }, games: { href: 'games.html', label: T('Open Learning Games', 'افتح ألعاب التعلّم') }, noor: { href: 'student.html', label: T('Open Noor (ERLY home, bottom corner)', 'افتح نور (الصفحة الرئيسية)') }, share: { href: 'student.html#handoff', label: T('Get support page', 'صفحة الدعم') }, timetable: { tab: 'timetable', label: T('Go to Timetable', 'اذهب إلى الجدول') }, progress: { tab: 'progress', label: T('Go to Progress', 'اذهب إلى التقدم') }, strategies: { tab: 'strategies', label: T('Go to Strategies', 'اذهب إلى الاستراتيجيات') }, future: { tab: 'future', label: T('Go to Future plan', 'اذهب إلى خطة المستقبل') }, review: { review: true, label: T('Start the review', 'ابدأ المراجعة') }, prefs: { prefs: true, label: T('Open the reflection', 'افتح التأمل') }, plan: { tab: 'overview', label: T('Your plan with Noor', 'خطتك مع نور') } })[where] || null;
  }
  // what the student's own ERLY data on this device shows for a date (suggestions only)
  function evidence(dk, act, where) {
    const from = dateOf(dk).setHours(0, 0, 0, 0), to = from + 864e5;
    if (where && /^game:/.test(where)) { const g = (read('erly-games-v1') || {}).sessions || []; const n = g.filter(s => s.g === where.slice(5) && s.at >= from && s.at < to).length; if (n) return T(`You played this game ${n}× on this day`, `لعبت هذه اللعبة ${n} مرة في هذا اليوم`); }
    if (where === 'studio') { const pr = ((read('erly-studio-v1') || {}).prog) || {}; if (Object.values(pr).some(p => p && p.at >= from && p.at < to)) return T('Reading Studio shows a reading opened on this day', 'يظهر استوديو القراءة قراءة مفتوحة في هذا اليوم'); }
    if (where === 'games') { const g = (read('erly-games-v1') || {}).sessions || []; const n = g.filter(s => s.at >= from && s.at < to).length; if (n) return T(`You played ${n} Learning Game session${n === 1 ? '' : 's'} on this day`, `لعبت ${n} جلسة من ألعاب التعلّم في هذا اليوم`); }
    if (where === 'checkins') { const h = ((read('erly-checkins-v1') || {}).history) || {}; if (Object.values(h).some(xs => (xs || []).some(r => r && r.at >= from && r.at < to))) return T('A Daily Quest check-in was done on this day', 'تم إجراء فحص يومي في هذا اليوم'); }
    return null;
  }
  const objective = id => { const a = P.WEEKS.flatMap(w => w.acts).find(x => x.id === id); return a ? a.why : null; };
  function planFor(dk) {
    if (!V.planner[dk]) {
      const tt = P.timetable(V.tt, V.week);
      V.planner[dk] = V.status === 'paused' ? [] : P.dayPlan(tt, dayName(dk), objective).map(e => Object.assign(e, { where: e.where || (P.WEEKS.flatMap(w => w.acts).find(x => x.id === e.act) || {}).where || null, week: V.week }));
      save();
    }
    return V.planner[dk];
  }

  /* ---------- tabs ---------- */
  const TABS = [['overview', 'Overview', 'نظرة عامة'], ['today', 'Today', 'اليوم'], ['timetable', 'Timetable', 'الجدول'], ['programme', 'Six weeks', 'الأسابيع الستة'], ['progress', 'Progress', 'التقدم'], ['strategies', 'Strategies', 'الاستراتيجيات'], ['future', 'Future plan', 'خطة المستقبل']];
  function tabs() { return `<nav class="gv-tabs" role="tablist" aria-label="${T('Growth Plan sections', 'أقسام خطة النمو')}">${TABS.map(([k, en, ar]) => `<button type="button" role="tab" id="gvt-${k}" aria-selected="${V.tab === k}" aria-controls="gvPanel" data-gvtab="${k}">${T(en, ar)}</button>`).join('')}</nav>${V.status === 'paused' ? `<p class="gv-paused" role="status">⏸ ${T('The programme is paused. Your timetable and notes are kept — resume any time.', 'البرنامج متوقف مؤقتاً. يبقى جدولك وملاحظاتك — استأنف متى شئت.')} <button type="button" data-gv="resume">${T('Resume', 'استئناف')}</button></p>` : ''}`; }

  /* ---------- TODAY: the daily planner ---------- */
  function today_(el) {
    const dk = V.day || today(), list = planFor(dk), d = dateOf(dk), dn = dayName(dk);
    const done = list.filter(e => e.status === 'done').length;
    const isWeekend = dn === 'sat' || dn === 'sun';
    el.innerHTML = `<section class="gv-day">
      <header class="gv-dayh"><button type="button" class="gv-ic" data-gv="prev" aria-label="${T('Previous day', 'اليوم السابق')}">‹</button><div><b>${L(P.DAY_N[dn])} ${d.getDate()}/${d.getMonth() + 1}</b><small>${T('Week', 'الأسبوع')} ${V.week} · ${L(WEEK().name)}${dk === today() ? ' · ' + T('today', 'اليوم') : ''}</small></div><button type="button" class="gv-ic" data-gv="next" aria-label="${T('Next day', 'اليوم التالي')}">›</button>${dk !== today() ? `<button type="button" class="gv-link" data-gv="today">${T('Back to today', 'العودة لليوم')}</button>` : ''}</header>
      ${dn === 'sun' && !list.length ? `<div class="gv-rest">${T('Sunday is a rest day. Nothing is planned, and nothing is expected.', 'الأحد يوم راحة. لا شيء مخطط ولا شيء متوقع.')}${V.tt.sun === 'reflect' ? '' : ` <button type="button" class="gv-link" data-gv="sunreflect">${T('Turn on an optional Sunday reflection', 'فعّل تأملاً اختيارياً يوم الأحد')}</button>`}</div>` : ''}
      ${isWeekend && dn === 'sat' ? `<p class="gv-note">${T('Saturday is optional catch-up. Leave it empty with a clear conscience.', 'السبت للتعويض الاختياري. اتركه فارغاً بلا تأنيب ضمير.')}</p>` : ''}
      <div class="gv-meter" aria-label="${T('Completed today', 'المنجز اليوم')}"><i style="--w:${list.length ? done / list.length : 0}"></i><span>${done}/${list.length} ${T('done', 'منجز')}</span></div>
      <ol class="gv-list">${list.map((e, i) => entry(e, i, list.length, dk)).join('') || `<li class="gv-empty">${V.status === 'paused' ? T('Paused — add your own tasks if you like.', 'متوقف — أضف مهامك إن شئت.') : T('Nothing planned. Add something below if you want to.', 'لا شيء مخطط. أضف شيئاً إن أردت.')}</li>`}</ol>
      <form class="gv-add" data-gvadd><b>${T('Add your own work', 'أضف عملك الخاص')}</b><input name="t" required maxlength="80" placeholder="${T('e.g. Chemistry problem sheet', 'مثلاً: ورقة مسائل الكيمياء')}" aria-label="${T('Task', 'المهمة')}"><input name="h" type="time" value="16:00" aria-label="${T('Time', 'الوقت')}"><select name="m" aria-label="${T('Minutes', 'الدقائق')}">${[15, 25, 30, 45, 60, 90].map(m => `<option value="${m}" ${m === 30 ? 'selected' : ''}>${m} min</option>`).join('')}</select><button class="gv-btn">${T('Add', 'أضف')}</button></form>
    </section>`;
  }
  function entry(e, i, n, dk) {
    const lk = link(e.where), ev = e.status === 'todo' ? evidence(dk, e.act, e.where) : null;
    return `<li class="gv-e is-${e.status} ${e.src === 'own' ? 'is-own' : ''}" data-id="${e.id}" style="--i:${i}">
      <div class="gv-e__time"><b>${esc(e.time)}</b><select data-gvmins aria-label="${T('Duration', 'المدة')}">${[...new Set([5, 10, 15, 20, 25, 30, 45, 60, 90, e.mins])].sort((a, b) => a - b).map(m => `<option value="${m}" ${m === e.mins ? 'selected' : ''}>${m} min</option>`).join('')}</select></div>
      <div class="gv-e__body"><b>${esc(L(e.title))}</b>${e.objective ? `<small>${T('Why', 'لماذا')}: ${esc(L(e.objective))}</small>` : ''}${ev ? `<em class="gv-ev">✓ ${esc(ev)} — <button type="button" data-gv="done">${T('mark done', 'علّمه منجزاً')}</button></em>` : ''}
        ${e.status === 'done' && (e.reflection || e.next) ? `<p class="gv-refl">${e.reflection ? `<span>${T('Reflection', 'تأمل')}: ${esc(e.reflection)}</span>` : ''}${e.next ? `<span>${T('Next step', 'الخطوة التالية')}: ${esc(e.next)}</span>` : ''}</p>` : ''}
        ${lk ? (lk.href ? `<a class="gv-go" href="${lk.href}">${esc(lk.label)} →</a>` : `<button type="button" class="gv-go" data-gvlink="${lk.tab || (lk.review ? 'review' : 'prefs')}">${esc(lk.label)} →</button>`) : ''}</div>
      <div class="gv-e__act">${e.status === 'todo' ? `<button type="button" class="gv-done" data-gv="done" aria-label="${T('Mark done', 'علّم كمنجز')}">✓</button><button type="button" data-gv="skip">${T('Skip', 'تخطَّ')}</button><button type="button" data-gv="tomorrow">${T('Tomorrow', 'غداً')}</button>` : `<button type="button" data-gv="reopen">${T('Undo', 'تراجع')}</button>`}
        <span class="gv-ord"><button type="button" data-gv="up" ${i === 0 ? 'disabled' : ''} aria-label="${T('Move up', 'لأعلى')}">↑</button><button type="button" data-gv="down" ${i === n - 1 ? 'disabled' : ''} aria-label="${T('Move down', 'لأسفل')}">↓</button></span>${e.src === 'own' ? `<button type="button" data-gv="remove" aria-label="${T('Remove', 'إزالة')}">✕</button>` : ''}</div>
    </li>`;
  }
  function reflect(id, dk) {
    const e = (V.planner[dk] || []).find(x => x.id === id); if (!e) return;
    modal(`<h3>${T('Nice — done.', 'رائع — أُنجز.')}</h3><p class="gv-note">${esc(L(e.title))}</p>
      <label class="gv-f">${T('How did it go? (optional)', 'كيف سار؟ (اختياري)')}<textarea name="r" maxlength="400" rows="2"></textarea></label>
      <label class="gv-f">${T('Next step (optional)', 'الخطوة التالية (اختياري)')}<input name="n" maxlength="200"></label>
      <p class="gv-small">${T('Saved only on this device. Noor’s weekly review quotes it back to you; it is never sent anywhere.', 'يُحفظ على هذا الجهاز فقط وتقتبسه مراجعة نور الأسبوعية؛ لا يُرسل لأي مكان.')}</p>`, [[T('Save', 'حفظ'), f => { V.planner[dk] = P.ops.complete(V.planner[dk], id, f.r.value, f.n.value); save(); milestone(dk); render(); }], [T('Just mark done', 'علّمه منجزاً فقط'), () => { V.planner[dk] = P.ops.complete(V.planner[dk], id); save(); milestone(dk); render(); }]]);
  }
  function milestone(dk) { const L2 = V.planner[dk]; if (L2.length && L2.every(e => e.status !== 'todo') && L2.some(e => e.status === 'done')) celebrate(T('Day complete — everything planned is ticked or skipped.', 'اكتمل اليوم — كل المخطط أُنجز أو تُخطّي.')); }

  /* ---------- TIMETABLE ---------- */
  function timetable_(el) {
    const tt = P.timetable(V.tt, V.week), s = tt.settings, a0 = P.toMin(s.start), a1 = Math.max(P.toMin(s.end) + 20, a0 + 60), H = a1 - a0;
    const sel = V.ttDay || (P.DAYS.includes(dayName(today())) ? dayName(today()) : 'mon');
    const tot = P.totals(tt);
    const block = b => { const top = (P.toMin(b.from) - a0) / H * 100, h = Math.max(2.4, P.minutesOf(b) / H * 100); return `<div class="gv-b gv-b--${b.kind}" style="top:${b.kind === 'rest' || b.kind === 'catchup' && false ? 0 : top}%;height:${b.kind === 'rest' ? 100 : h}%" title="${esc(b.from + '–' + b.to + ' ' + L(b.label))}"><time>${b.kind === 'rest' ? '' : esc(b.from)}</time><span>${esc(L(b.label))}</span></div>`; };
    const hours = []; for (let m = Math.ceil(a0 / 60) * 60; m <= a1; m += 60) hours.push(m);
    el.innerHTML = `<section class="gv-tt">
      <div class="gv-tt__head"><div><h2>${T('Your weekly timetable', 'جدولك الأسبوعي')}</h2><p class="gv-note">${T('Week', 'الأسبوع')} ${V.week}: ${esc(L(WEEK().name))}. ${T('Programme blocks are named; “your own study” is for your modules. Classes and commitments always come first.', 'جلسات البرنامج مسمّاة؛ و«دراستك الخاصة» لموادك. المحاضرات والالتزامات أولاً دائماً.')}</p></div>
        <div class="gv-tt__tot"><span><b>${Math.round(tot.study / 60 * 10) / 10}</b> h ${T('study', 'دراسة')}</span><span><b>${Math.round(tot.break / 60 * 10) / 10 + Math.round(tot.lunch / 60 * 10) / 10}</b> h ${T('breaks', 'استراحات')}</span><span><b>${Math.round(tot.class / 60 * 10) / 10}</b> h ${T('classes', 'محاضرات')}</span></div></div>
      <div class="gv-days" role="tablist" aria-label="${T('Day', 'اليوم')}">${P.DAYS.map(d => `<button type="button" role="tab" aria-selected="${d === sel}" data-gvday="${d}">${L(P.DAY_N[d]).slice(0, 3)}</button>`).join('')}</div>
      <div class="gv-grid" style="--rows:${H}">
        <div class="gv-hours">${hours.map(m => `<span style="top:${(m - a0) / H * 100}%">${P.toHHMM(m)}</span>`).join('')}</div>
        ${P.DAYS.map(d => `<div class="gv-col ${d === sel ? 'is-sel' : ''} ${d === 'sat' || d === 'sun' ? 'is-we' : ''}" data-col="${d}"><b class="gv-col__h">${L(P.DAY_N[d])}</b><div class="gv-col__body">${tt.days[d].map(block).join('')}</div></div>`).join('')}
      </div>
      <details class="gv-set" ${V.ttOpen ? 'open' : ''}><summary>${T('Customise your timetable', 'خصّص جدولك')}</summary>
        <form data-gvtt class="gv-set__f">
          <label>${T('Start', 'البداية')}<input type="time" name="start" value="${s.start}"></label>
          <label>${T('Finish', 'النهاية')}<input type="time" name="end" value="${s.end}"></label>
          <label>${T('Session length', 'طول الجلسة')}<select name="session">${[25, 30, 40, 45, 50, 60, 90].map(m => `<option ${m === s.session ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
          <label>${T('Break length', 'طول الاستراحة')}<select name="brk">${[5, 10, 15, 20, 30].map(m => `<option ${m === s.brk ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
          <label>${T('Lunch at', 'الغداء في')}<input type="time" name="lunchAt" value="${s.lunchAt}"></label>
          <label>${T('Lunch length', 'مدة الغداء')}<select name="lunch">${[0, 30, 45, 60].map(m => `<option ${m === s.lunch ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
          <label>${T('Saturday', 'السبت')}<select name="sat">${[['optional', T('Optional catch-up', 'تعويض اختياري')], ['study', T('Study block', 'جلسة دراسة')], ['off', T('Day off', 'عطلة')]].map(([v, l]) => `<option value="${v}" ${v === s.sat ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label>${T('Sunday', 'الأحد')}<select name="sun">${[['rest', T('Rest', 'راحة')], ['reflect', T('Rest + optional reflection', 'راحة + تأمل اختياري')]].map(([v, l]) => `<option value="${v}" ${v === s.sun ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label>${T('Programme workload', 'عبء البرنامج')}<select name="workload">${[['light', T('Light — 1 block a day', 'خفيف — جلسة يومياً')], ['balanced', T('Balanced — 2 a day', 'متوازن — جلستان')], ['heavy', T('Heavy — 3 a day', 'ثقيل — ٣ جلسات')]].map(([v, l]) => `<option value="${v}" ${v === s.workload ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <button class="gv-btn">${T('Update timetable', 'حدّث الجدول')}</button>
        </form>
        <div class="gv-fixed"><b>${T('Classes and commitments', 'المحاضرات والالتزامات')}</b>
          <ul>${s.classes.map((c, i) => `<li><span class="gv-dot gv-dot--class"></span>${L(P.DAY_N[c.day]).slice(0, 3)} ${c.from}–${c.to} ${esc(c.label)}<button type="button" data-gvdel="classes:${i}" aria-label="${T('Remove', 'إزالة')}">✕</button></li>`).join('')}${s.commitments.map((c, i) => `<li><span class="gv-dot gv-dot--commit"></span>${L(P.DAY_N[c.day]).slice(0, 3)} ${c.from}–${c.to} ${esc(c.label)}<button type="button" data-gvdel="commitments:${i}" aria-label="${T('Remove', 'إزالة')}">✕</button></li>`).join('')}${s.classes.length + s.commitments.length ? '' : `<li class="gv-small">${T('None yet.', 'لا شيء بعد.')}</li>`}</ul>
          <form data-gvfix class="gv-set__f gv-set__f--fix"><select name="kind"><option value="classes">${T('Class', 'محاضرة')}</option><option value="commitments">${T('Commitment', 'التزام')}</option></select><select name="day">${P.DAYS.slice(0, 6).map(d => `<option value="${d}">${L(P.DAY_N[d])}</option>`).join('')}</select><input type="time" name="from" value="09:00" aria-label="${T('From', 'من')}"><input type="time" name="to" value="10:30" aria-label="${T('To', 'إلى')}"><input name="label" maxlength="40" placeholder="${T('e.g. Biology lecture', 'مثلاً: محاضرة الأحياء')}" aria-label="${T('Label', 'الاسم')}"><button class="gv-btn">${T('Add', 'أضف')}</button></form>
        </div>
        <p class="gv-small">${T('Changing the timetable updates future days in your planner. Days you have already planned keep their entries.', 'تغيير الجدول يحدّث الأيام القادمة في مخططك، وتبقى الأيام المخططة كما هي.')}</p>
      </details></section>`;
  }

  /* ---------- PROGRAMME: journey map + weekly cards ---------- */
  function programme_(el) {
    const pts = [[40, 150], [150, 70], [270, 130], [390, 55], [510, 120], [630, 60]];
    const path = 'M' + pts.map(p => p.join(',')).join(' L');
    const reviewed = new Set(V.reviews.map(r => r.week));
    el.innerHTML = `<section class="gv-prog">
      <div class="gv-journey"><svg viewBox="0 0 680 200" role="img" aria-label="${T('Journey map of the six weeks', 'خريطة رحلة الأسابيع الستة')}"><path d="${path}" class="gv-j__track"/><path d="${path}" class="gv-j__done" pathLength="1000" style="--p:${(V.week - 1) / 5}"/>
        ${P.WEEKS.map((w, i) => { const [x, y] = pts[i], st = reviewed.has(w.n) ? 'done' : w.n === V.week ? 'now' : 'next'; return `<g class="gv-j__n is-${st}" style="--c:${w.colour};--i:${i}" data-gvweek="${w.n}" tabindex="0" role="button" aria-label="${T('Week', 'الأسبوع')} ${w.n}: ${esc(L(w.name))}"><circle cx="${x}" cy="${y}" r="${st === 'now' ? 22 : 17}"/><text x="${x}" y="${y + 5}">${st === 'done' ? '✓' : w.n}</text><text class="gv-j__l" x="${x}" y="${y + (y > 100 ? 42 : -30)}">${esc(L(w.name)).split(' ').slice(0, 2).join(' ')}</text></g>`; }).join('')}</svg></div>
      <div class="gv-ctl"><span>${T('You are on week', 'أنت في الأسبوع')} <b>${V.week}</b> · ${T('the programme is flexible:', 'البرنامج مرن:')}</span><button type="button" data-gv="repeat">${T('Repeat this week', 'كرّر هذا الأسبوع')}</button><button type="button" data-gv="advance" ${V.week >= 6 ? 'disabled' : ''}>${T('Move to next week', 'انتقل للأسبوع التالي')}</button><button type="button" data-gv="${V.status === 'paused' ? 'resume' : 'pause'}">${V.status === 'paused' ? T('Resume', 'استئناف') : T('Pause programme', 'أوقف البرنامج مؤقتاً')}</button><button type="button" data-gv="finish">${T('Finish early', 'أنهِ مبكراً')}</button></div>
      <div class="gv-weeks">${P.WEEKS.map(w => `<article class="gv-wk ${w.n === V.week ? 'is-now' : ''} ${reviewed.has(w.n) ? 'is-done' : ''}" style="--c:${w.colour}" id="gvw${w.n}"><header><span>${T('Week', 'الأسبوع')} ${w.n}</span><h3>${esc(L(w.name))}</h3><p>${esc(L(w.aim))}</p></header><ul>${w.acts.map(a => { const lk = link(a.where); return `<li><b>${esc(L(a.title))}</b> <small>~${a.mins} min${a.kind === 'optional' ? ' · ' + T('optional', 'اختياري') : ''}</small><span>${esc(L(a.why))}</span>${lk && lk.href ? `<a href="${lk.href}">${esc(lk.label)} →</a>` : ''}</li>`; }).join('')}</ul>${w.n === V.week ? `<button type="button" class="gv-btn" data-gv="review">${T(`Week ${w.n} review with Noor`, `مراجعة الأسبوع ${w.n} مع نور`)}</button>` : ''}</article>`).join('')}</div>
    </section>`;
  }

  /* ---------- PROGRESS: from what actually happened ---------- */
  function progress_(el) {
    const games = (read('erly-games-v1') || {}).sessions || [];
    const start = new Date(V.started); start.setHours(0, 0, 0, 0);
    const weeks = Array.from({ length: 6 }, (_, i) => { const a = start.getTime() + i * 7 * 864e5; return Object.assign({ i: i + 1 }, P.weekStats(V.planner, a, a + 7 * 864e5, games)); });
    const max = Math.max(1, ...weeks.map(w => w.planned));
    const tot = weeks.reduce((s, w) => ({ done: s.done + w.done, minutes: s.minutes + w.minutes, days: s.days + w.activeDays, games: s.games + w.games }), { done: 0, minutes: 0, days: 0, games: 0 });
    const refl = Object.keys(V.planner).sort().reverse().flatMap(k => V.planner[k].filter(e => e.reflection).map(e => [k, e])).slice(0, 6);
    el.innerHTML = `<section class="gv-pr">
      <div class="gv-pr__top">${[[tot.done, T('activities done', 'أنشطة منجزة')], [Math.round(tot.minutes / 6) / 10, T('hours of planned work', 'ساعات عمل مخطط')], [tot.days, T('active days', 'أيام نشطة')], [tot.games, T('game sessions', 'جلسات ألعاب')]].map(([v, l], i) => `<div style="--i:${i}"><b data-count="${v}">${v}</b><span>${l}</span></div>`).join('')}</div>
      <div class="gv-chart"><h3>${T('Week by week (calendar weeks since you started)', 'أسبوعاً بأسبوع (منذ أن بدأت)')}</h3>
        <svg viewBox="0 0 600 220" role="img" aria-label="${T('Planned versus done for each week', 'المخطط مقابل المنجز لكل أسبوع')}">${weeks.map((w, i) => { const x = 40 + i * 92, hp = w.planned / max * 160, hd = w.done / max * 160; return `<g style="--i:${i}"><rect class="gv-c__p" x="${x}" y="${190 - hp}" width="34" height="${hp}" rx="6"/><rect class="gv-c__d" x="${x + 38}" y="${190 - hd}" width="34" height="${hd}" rx="6"/><text x="${x + 36}" y="210">${T('W', 'أ')}${w.i}</text>${w.done ? `<text class="gv-c__v" x="${x + 55}" y="${184 - hd}">${w.done}</text>` : ''}</g>`; }).join('')}<line x1="30" x2="590" y1="190" y2="190"/></svg>
        <p class="gv-legend"><i class="gv-c__p"></i>${T('planned', 'مخطط')} <i class="gv-c__d"></i>${T('done', 'منجز')}</p></div>
      ${refl.length ? `<div class="gv-card"><h3>${T('Your recent reflections', 'تأملاتك الأخيرة')}</h3><ul class="gv-refls">${refl.map(([k, e]) => `<li><small>${k}</small><b>${esc(L(e.title))}</b><span>${esc(e.reflection)}</span></li>`).join('')}</ul></div>` : ''}
      ${V.reviews.length ? `<div class="gv-card"><h3>${T('Weekly reviews', 'المراجعات الأسبوعية')}</h3>${V.reviews.slice().reverse().map(reviewCard).join('')}</div>` : ''}
      <p class="gv-small">${T('Everything here is counted from your own planner and games on this device. ERLY never turns it into a score of ability, a label or a prediction about you.', 'كل ما هنا محسوب من مخططك وألعابك على هذا الجهاز. لا يحوّله ERLY أبداً إلى درجة قدرة أو تصنيف أو تنبؤ.')}</p>
    </section>`;
  }
  const reviewCard = r => `<article class="gv-rv"><header><b>${T('Week', 'الأسبوع')} ${r.week}</b><small>${new Date(r.at).toLocaleDateString()}</small></header>${r.out.lines.map(l => `<p>${esc(L(l))}</p>`).join('')}${r.out.keep.length ? `<p><b>${T('Keep using', 'استمر في')}:</b> ${r.out.keep.map(k => esc(L(k))).join(', ')}</p>` : ''}<ul>${r.out.change.map(c => `<li>${esc(L(c))}</li>`).join('')}</ul></article>`;

  /* ---------- STRATEGIES ---------- */
  function strategies_(el) {
    const AR = { memory: T('Memory', 'الذاكرة'), reading: T('Reading', 'القراءة'), planning: T('Planning', 'التخطيط'), focus: T('Focus', 'التركيز'), listening: T('Listening', 'الاستماع'), wellbeing: T('Wellbeing', 'العافية') };
    el.innerHTML = `<section class="gv-st"><h2>${T('Strategy library', 'مكتبة الاستراتيجيات')}</h2><p class="gv-note">${T('Try one, then rate it for yourself. Your ratings shape your future plan — there is no right answer.', 'جرّب واحدة ثم قيّمها بنفسك. تقييماتك تشكّل خطتك المستقبلية — لا توجد إجابة صحيحة.')}</p>
      <div class="gv-stgrid">${P.STRATEGIES.map((s, i) => { const r = V.strat[s.id]; return `<article class="gv-s ${r ? 'is-' + r : ''}" style="--i:${i}"><span>${AR[s.area]}</span><h3>${esc(L(s.name))}</h3><p><b>${T('How', 'كيف')}:</b> ${esc(L(s.how))}</p><p><b>${T('Why', 'لماذا')}:</b> ${esc(L(s.why))}</p><div class="gv-rate" role="group" aria-label="${T('Your rating', 'تقييمك')}">${[['helpful', T('Helps me', 'تساعدني')], ['try', T('Want to try', 'أريد التجربة')], ['no', T('Not for me', 'ليست لي')]].map(([v, l]) => `<button type="button" aria-pressed="${r === v}" data-gvstrat="${s.id}:${v}">${l}</button>`).join('')}</div></article>`; }).join('')}</div></section>`;
  }

  /* ---------- FUTURE PLAN ---------- */
  function future_(el) {
    const keep = P.STRATEGIES.filter(s => V.strat[s.id] === 'helpful'), tryS = P.STRATEGIES.filter(s => V.strat[s.id] === 'try');
    const tt = P.timetable(Object.assign({}, V.tt, { workload: 'light' }), 6);
    el.innerHTML = `<section class="gv-fu"><h2>${T('Your plan after the six weeks', 'خطتك بعد الأسابيع الستة')}</h2>
      <div class="gv-fu__grid"><div class="gv-card"><h3>${T('Strategies to keep', 'استراتيجيات للاحتفاظ بها')}</h3>${keep.length ? `<ul>${keep.map(s => `<li><b>${esc(L(s.name))}</b> — ${esc(L(s.how))}</li>`).join('')}</ul>` : `<p class="gv-note">${T('Rate strategies as “Helps me” in the Strategies tab and they appear here.', 'قيّم الاستراتيجيات بـ«تساعدني» لتظهر هنا.')}</p>`}${tryS.length ? `<h3>${T('Still to try', 'ما زال للتجربة')}</h3><ul>${tryS.map(s => `<li>${esc(L(s.name))}</li>`).join('')}</ul>` : ''}</div>
      <div class="gv-card"><h3>${T('A sustainable week', 'أسبوع مستدام')}</h3><p class="gv-note">${T('Your timetable with a light programme load — one named block a day for the habits you want to keep, the rest for your modules.', 'جدولك بعبء خفيف — جلسة يومية للعادات التي تريد الاحتفاظ بها والباقي لموادك.')}</p><ul class="gv-fu__days">${P.DAYS.map(d => `<li><b>${L(P.DAY_N[d]).slice(0, 3)}</b>${tt.days[d].filter(b => b.kind === 'study' || b.kind === 'catchup' || b.kind === 'rest' || b.kind === 'reflect').slice(0, 3).map(b => `<span class="gv-b--${b.kind}">${esc(b.kind === 'rest' ? '' : b.from + ' ')}${esc(L(b.label))}</span>`).join('')}</li>`).join('')}</ul></div></div>
      <div class="gp-row gv-fu__act"><button type="button" class="gv-btn" data-gv="print">${T('Print or save as PDF', 'اطبع أو احفظ PDF')}</button><a class="gv-btn gv-btn--ghost" href="student.html#handoff">${T('Optional: share with SAS', 'اختياري: شارك مع خدمات الطلبة')}</a></div>
      <p class="gv-small">${T('Nothing is shared unless you choose to. Printing happens in your browser.', 'لا يُشارك شيء إلا باختيارك. الطباعة تتم في متصفحك.')}</p></section>`;
  }

  /* ---------- Noor's weekly review ---------- */
  function startReview() {
    const A = { helped: [] };
    const Q = [
      ['went', T(`How did week ${V.week} go?`, `كيف سار الأسبوع ${V.week}؟`), [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], [T('Hard going', 'صعب'), T('Went well', 'سار جيداً')]],
      ['helped', T('Which strategies helped? (choose any)', 'أي الاستراتيجيات ساعدت؟ (اختر ما شئت)'), P.STRATEGIES.map(s => [s.id, L(s.name)]), null, true],
      ['hard', T('What got in the way most?', 'ما الذي أعاق أكثر؟'), [['time', T('Time', 'الوقت')], ['energy', T('Energy', 'الطاقة')], ['starting', T('Getting started', 'البدء')], ['focus', T('Focus', 'التركيز')], ['understanding', T('Understanding the work', 'فهم العمل')], ['nothing', T('Nothing much', 'لا شيء يُذكر')]]],
      ['change', T('What would you like for next week?', 'ماذا تريد للأسبوع القادم؟'), [['same', T('Keep it the same', 'كما هو')], ['lighter', T('Lighter', 'أخف')], ['more', T('A bit more', 'أكثر قليلاً')], ['repeat', T('Repeat this week', 'كرّر هذا الأسبوع')], ['pause', T('Pause for now', 'إيقاف مؤقت')]]],
      ['note', T('Anything you want to remember? (optional)', 'هل تريد تذكّر شيء؟ (اختياري)'), null]
    ];
    let k = 0;
    const box = document.createElement('div'); box.className = 'gv-modal gv-review'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', T('Weekly review with Noor', 'المراجعة الأسبوعية مع نور'));
    document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('is-in'));
    const close = () => { box.classList.remove('is-in'); setTimeout(() => box.remove(), still() ? 0 : 250); };
    const NOOR = '<span class="gv-noor" aria-hidden="true"><i></i><i></i><i></i></span>';
    function show() {
      if (k >= Q.length) return finish();
      const [id, q, opts, ends, multi] = Q[k];
      box.innerHTML = `<div class="gv-modal__box"><div class="gv-steps">${Q.map((_, n) => `<i class="${n < k ? 'is-done' : n === k ? 'is-on' : ''}"></i>`).join('')}</div><div class="gv-turn">${NOOR}<p>${esc(q)}</p></div>
        ${opts ? `<div class="gv-opts ${ends ? 'gv-opts--num' : ''}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${multi ? A.helped.includes(v) : false}">${esc(l)}</button>`).join('')}</div>${ends ? `<div class="gv-ends"><span>${ends[0]}</span><span>${ends[1]}</span></div>` : ''}` : `<textarea class="gv-ta" maxlength="300" rows="3" aria-label="${esc(q)}"></textarea>`}
        <div class="gp-row gv-row"><button type="button" class="gv-btn gv-btn--ghost" data-q="close">${T('Not now', 'ليس الآن')}</button>${multi || !opts ? `<button type="button" class="gv-btn" data-q="next">${T('Next', 'التالي')}</button>` : ''}</div></div>`;
      box.onclick = e => {
        const b = e.target.closest('[data-v]'), q2 = e.target.closest('[data-q]');
        if (b) { if (multi) { const v = b.dataset.v; A.helped = A.helped.includes(v) ? A.helped.filter(x => x !== v) : A.helped.concat(v); b.setAttribute('aria-pressed', A.helped.includes(v)); return; } A[id] = /^\d$/.test(b.dataset.v) ? +b.dataset.v : b.dataset.v; k++; return setTimeout(show, still() ? 0 : 160); }
        if (q2 && q2.dataset.q === 'close') close();
        if (q2 && q2.dataset.q === 'next') { if (!opts) A.note = box.querySelector('textarea').value.trim(); k++; show(); }
      };
      const f = box.querySelector('button, textarea'); if (f) f.focus();
    }
    function finish() {
      const games = (read('erly-games-v1') || {}).sessions || [];
      // this programme week = every planner entry tagged with it (wherever it was moved), plus games from the last 7 days
      const wk = {}; Object.keys(V.planner).forEach(k => { const xs = V.planner[k].filter(e => e.week === V.week); if (xs.length) wk[k] = xs; });
      const a = Date.now() + offset() - 7 * 864e5;
      const stats = P.weekStats(wk, 0, Infinity, games.filter(g => g.at >= a));
      const out = P.review(V.week, A, stats);
      (out.keep.length ? A.helped : []).forEach(id => { if (!V.strat[id]) V.strat[id] = 'helpful'; });
      V.reviews.push({ week: V.week, at: Date.now(), answers: A, stats, out });
      if (out.workload) V.tt.workload = out.workload;
      if (out.shorter) V.tt.session = Math.max(25, (P.settings(V.tt).session || 45) - 10);
      if (out.pause) V.status = 'paused';
      const advanced = out.next !== V.week; V.week = out.next;
      clearFuture(); save();
      box.innerHTML = `<div class="gv-modal__box"><div class="gv-turn">${NOOR}<p>${T('Here’s your week, in your own words and numbers.', 'هذا أسبوعك بكلماتك وأرقامك.')}</p></div>${reviewCard(V.reviews[V.reviews.length - 1])}<p class="gv-small">${T('Written from your answers and your planner on this device — no AI model and no server were involved.', 'كُتبت من إجاباتك ومخططك على هذا الجهاز — دون نموذج ذكاء اصطناعي ودون خادم.')}</p><div class="gp-row gv-row"><button type="button" class="gv-btn" data-q="ok">${advanced ? T(`On to week ${V.week}`, `إلى الأسبوع ${V.week}`) : T('Done', 'تم')}</button></div></div>`;
      if (advanced) celebrate(T(`Week ${V.week - 1} complete`, `اكتمل الأسبوع ${V.week - 1}`));
      box.onclick = e => { if (e.target.closest('[data-q="ok"]')) { close(); render(); } };
      box.querySelector('[data-q="ok"]').focus();
    }
    box.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    show();
  }
  function prefsReflection() {
    const Qs = [['time', T('When do you study best?', 'متى تذاكر بشكل أفضل؟'), [['am', T('Morning', 'الصباح')], ['pm', T('Afternoon', 'بعد الظهر')], ['eve', T('Evening', 'المساء')], ['varies', T('It varies', 'يتغير')]]], ['place', T('Where do you focus best?', 'أين تركز بشكل أفضل؟'), [['quiet', T('Somewhere quiet', 'مكان هادئ')], ['library', T('Library', 'المكتبة')], ['cafe', T('With background noise', 'مع ضجيج خفيف')], ['home', T('At home', 'في البيت')]]], ['format', T('Which formats help you take things in?', 'أي الصيغ تساعدك على الفهم؟'), [['text', T('Reading text', 'قراءة النص')], ['audio', T('Listening', 'الاستماع')], ['visual', T('Diagrams and video', 'المخططات والفيديو')], ['doing', T('Trying it out', 'التجربة العملية')]]], ['length', T('How long can you usually focus before a break?', 'كم تستطيع التركيز عادةً قبل الاستراحة؟'), [['25', '25 min'], ['45', '45 min'], ['60', '60 min'], ['90', '90 min']]]];
    modal(`<h3>${T('Learning preferences', 'تفضيلات التعلّم')}</h3><p class="gv-note">${T('These are preferences, not labels — they can change, and they only shape your own timetable.', 'هذه تفضيلات لا تصنيفات — قد تتغير، وتشكّل جدولك فقط.')}</p>${Qs.map(([k, q, o]) => `<fieldset class="gv-fs"><legend>${q}</legend>${o.map(([v, l]) => `<label><input type="radio" name="${k}" value="${v}" ${V.prefs[k] === v ? 'checked' : ''}> ${l}</label>`).join('')}</fieldset>`).join('')}`, [[T('Save', 'حفظ'), f => { Qs.forEach(([k]) => { const c = f.querySelector(`[name="${k}"]:checked`); if (c) V.prefs[k] = c.value; }); if (V.prefs.length) V.tt.session = Math.min(90, +V.prefs.length); clearFuture(); save(); ERLY.toast && ERLY.toast(T('Saved. Your session length now matches how long you like to focus.', 'حُفظ. طول الجلسة يطابق الآن مدة تركيزك المفضلة.')); render(); }]]);
  }

  /* ---------- small UI helpers ---------- */
  function modal(html, actions) {
    const box = document.createElement('div'); box.className = 'gv-modal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = `<form class="gv-modal__box">${html}<div class="gp-row gv-row"><button type="button" class="gv-btn gv-btn--ghost" data-m="x">${T('Cancel', 'إلغاء')}</button>${actions.map((a, i) => `<button type="button" class="gv-btn" data-m="${i}">${a[0]}</button>`).join('')}</div></form>`;
    document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('is-in'));
    const close = () => { box.classList.remove('is-in'); setTimeout(() => box.remove(), still() ? 0 : 200); };
    box.onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; if (b.dataset.m !== 'x') actions[+b.dataset.m][1](box.querySelector('form')); close(); };
    box.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    const f = box.querySelector('textarea, input, button'); if (f) f.focus();
  }
  function celebrate(msg) {
    const el = document.createElement('div'); el.className = 'gv-cel'; el.setAttribute('role', 'status');
    el.innerHTML = `<div class="gv-cel__ring" aria-hidden="true">${Array.from({ length: 16 }, (_, i) => `<i style="--a:${i * 22.5}deg"></i>`).join('')}</div><b>${esc(msg)}</b>`;
    document.body.appendChild(el); setTimeout(() => el.classList.add('is-out'), still() ? 1600 : 2200); setTimeout(() => el.remove(), 2800);
  }
  // future (unplanned) days follow the latest timetable; days with entries keep them
  function clearFuture() { const t = today(); Object.keys(V.planner).forEach(k => { if (k > t && !V.planner[k].some(e => e.status !== 'todo' || e.src === 'own')) delete V.planner[k]; }); }

  /* ---------- mount ---------- */
  let host = null, overviewHTML = '';
  const PANES = { today: today_, timetable: timetable_, programme: programme_, progress: progress_, strategies: strategies_, future: future_ };
  function render() {
    if (!host) return;
    host.innerHTML = tabs() + `<div class="gv-panel" id="gvPanel" role="tabpanel" aria-labelledby="gvt-${V.tab}"></div>`;
    const panel = host.querySelector('#gvPanel');
    if (V.tab === 'overview') { panel.innerHTML = overviewHTML; ERLY.emit && ERLY.emit('gplan:overview', panel); }
    else PANES[V.tab](panel);
    panel.classList.add('is-in');
  }
  function onClick(e) {
    const t = e.target;
    const tb = t.closest('[data-gvtab]'); if (tb) { V.tab = tb.dataset.gvtab; save(); render(); host.querySelector(`[data-gvtab="${V.tab}"]`).focus(); return; }
    const gl = t.closest('[data-gvlink]'); if (gl) { const k = gl.dataset.gvlink; if (k === 'review') return startReview(); if (k === 'prefs') return prefsReflection(); V.tab = k; save(); return render(); }
    const d = t.closest('[data-gvday]'); if (d) { V.ttDay = d.dataset.gvday; save(); return render(); }
    const wk = t.closest('[data-gvweek]'); if (wk) { const c = host.querySelector('#gvw' + wk.dataset.gvweek); if (c) c.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' }); return; }
    const st = t.closest('[data-gvstrat]'); if (st) { const [id, v] = st.dataset.gvstrat.split(':'); V.strat[id] = V.strat[id] === v ? undefined : v; save(); return render(); }
    const del = t.closest('[data-gvdel]'); if (del) { const [k, i] = del.dataset.gvdel.split(':'); V.tt[k] = (V.tt[k] || []).filter((_, n) => n !== +i); clearFuture(); save(); return render(); }
    const b = t.closest('[data-gv]'); if (!b) return;
    const a = b.dataset.gv, li = b.closest('[data-id]'), id = li && li.dataset.id, dk = V.day || today();
    if (a === 'prev' || a === 'next') { V.day = addDays(dk, a === 'prev' ? -1 : 1); save(); return render(); }
    if (a === 'today') { V.day = null; save(); return render(); }
    if (a === 'done') return reflect(id, dk);
    if (a === 'skip') { V.planner[dk] = P.ops.skip(V.planner[dk], id); save(); milestone(dk); return render(); }
    if (a === 'reopen') { V.planner[dk] = P.ops.reopen(V.planner[dk], id); save(); return render(); }
    if (a === 'up' || a === 'down') { V.planner[dk] = P.ops.move(V.planner[dk], id, a === 'up' ? -1 : 1); save(); return render(); }
    if (a === 'remove') { V.planner[dk] = P.ops.remove(V.planner[dk], id); save(); return render(); }
    if (a === 'tomorrow') { const r = P.ops.reschedule(V.planner[dk], id); V.planner[dk] = r.today; const nk = addDays(dk, 1); planFor(nk); if (r.moved) V.planner[nk] = V.planner[nk].concat([r.moved]).sort((x, y) => P.toMin(x.time) - P.toMin(y.time)); save(); ERLY.toast && ERLY.toast(T('Moved to tomorrow.', 'نُقل إلى الغد.')); return render(); }
    if (a === 'sunreflect') { V.tt.sun = 'reflect'; clearFuture(); delete V.planner[dk]; save(); return render(); }
    if (a === 'review') return startReview();
    if (a === 'repeat') { ERLY.toast && ERLY.toast(T(`Repeating week ${V.week}. That’s a normal part of the programme.`, `تكرار الأسبوع ${V.week}. هذا جزء طبيعي من البرنامج.`)); clearFuture(); save(); return render(); }
    if (a === 'advance') { V.week = Math.min(6, V.week + 1); clearFuture(); save(); celebrate(T(`Starting week ${V.week}`, `بداية الأسبوع ${V.week}`)); return render(); }
    if (a === 'pause') { V.status = 'paused'; clearFuture(); save(); return render(); }
    if (a === 'resume') { V.status = 'active'; clearFuture(); save(); return render(); }
    if (a === 'finish') { if (!confirm(T('Finish the programme early? Your timetable, notes and strategies stay.', 'إنهاء البرنامج مبكراً؟ يبقى جدولك وملاحظاتك واستراتيجياتك.'))) return; V.status = 'finished'; V.week = 6; V.tab = 'future'; save(); celebrate(T('Programme finished — here’s your plan for what comes next.', 'انتهى البرنامج — هذه خطتك لما بعد.')); return render(); }
    if (a === 'print') return print();
  }
  function onSubmit(e) {
    const f = e.target;
    if (f.matches('[data-gvadd]')) { e.preventDefault(); const dk = V.day || today(); planFor(dk); V.planner[dk] = P.ops.add(V.planner[dk], f.t.value.trim(), f.h.value, f.m.value).map(e => (e.week ? e : Object.assign(e, { week: V.week }))); save(); return render(); }
    if (f.matches('[data-gvtt]')) { e.preventDefault(); ['start', 'end', 'lunchAt', 'sat', 'sun', 'workload'].forEach(k => { V.tt[k] = f[k].value; }); ['session', 'brk', 'lunch'].forEach(k => { V.tt[k] = +f[k].value; }); V.tt = P.settings(V.tt); V.ttOpen = true; clearFuture(); save(); ERLY.toast && ERLY.toast(T('Timetable updated.', 'تم تحديث الجدول.')); return render(); }
    if (f.matches('[data-gvfix]')) { e.preventDefault(); const k = f.kind.value; if (P.toMin(f.to.value) <= P.toMin(f.from.value)) { ERLY.toast && ERLY.toast(T('The end time must be after the start time.', 'يجب أن يكون وقت الانتهاء بعد البدء.')); return; } V.tt[k] = (V.tt[k] || []).concat([{ day: f.day.value, from: f.from.value, to: f.to.value, label: f.label.value.trim() }]); V.tt = P.settings(V.tt); V.ttOpen = true; clearFuture(); save(); return render(); }
  }
  function onChange(e) { const s = e.target.closest('[data-gvmins]'); if (!s) return; const id = s.closest('[data-id]').dataset.id, dk = V.day || today(); V.planner[dk] = P.ops.resize(V.planner[dk], id, s.value); save(); }

  window.ERLY_GPV10 = {
    // called by growth.js with the existing dashboard HTML (the "Overview" tab)
    mount(el, overview) { host = el; overviewHTML = overview; if (!el.__gv) { el.__gv = true; el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit); el.addEventListener('change', onChange); } render(); },
    state: () => V, review: startReview, _set(v) { V = v; save(); }
  };
  if (window.I18N && I18N.onChange) I18N.onChange(() => { if (host && V.tab !== 'overview') render(); });
})();
