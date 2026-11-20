/* ERLY Learning Studio — your journey: today's plan, momentum, insights, the Knowledge Universe (one metaphor:
   charting your own sky — each objective is a star that brightens as you show you understand it), milestones,
   cosmetic themes, My Library and the Discovery Archive.

   Rules this file keeps:
   • Every number is counted from the learning record. Nothing is invented; empty states say so.
   • No streaks, no ranking, no "you broke your chain". Skipping or moving a plan item is just that.
   • Nothing is locked behind rewards except purely cosmetic themes.
   • Celebration is a short, quiet sparkle — none at all with reduced motion, and never a sound. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store, E = () => LS.engine;
  const DAY = 864e5;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const KIND = { revisit: ['Try another way', 'جرّب طريقة أخرى'], revise: ['Revise', 'راجع'], continue: ['Continue', 'تابع'], review: ['Quick review', 'مراجعة سريعة'], practise: ['Practise', 'تدرّب'], new: ['Something new', 'شيء جديد'], own: ['Your choice', 'اختيارك'] };

  /* ================= today's plan ================= */
  function planHTML() {
    const p = E().plan(), todo = p.items.filter(i => i.status === 'todo'), done = p.items.filter(i => i.status === 'done');
    const opts = LS.lessons.map(L => `<option value="#/lesson/${L.id}">${esc(L.title)}</option>`).concat((LS.experiences || []).map(x => `<option value="#/exp/${x.id}">${esc(x.title)}</option>`)).join('');
    return `<section class="at-sec at-plan" aria-labelledby="atPlanH"><div class="at-sec__head"><h2 class="at-h2" id="atPlanH">${T('Today’s learning plan', 'خطة اليوم')}</h2><span class="at-muted at-small">${T('A suggestion, not a rule. Move, skip or swap anything.', 'اقتراح وليس قاعدة.')}</span></div>
      ${p.items.length ? `<ol class="at-plan__list">${p.items.map((i, ix) => item(i, ix, p.items.length)).join('')}</ol>` : `<p class="at-empty">${T('Nothing suggested right now. Add something you’d like to do, or explore.', 'لا اقتراحات الآن. أضف ما تريد.')}</p>`}
      <details class="at-plan__add" ${p.items.length ? '' : 'open'}><summary>+ ${T('Add my own', 'أضف شيئاً من اختياري')}</summary>
        <form class="ls-row" data-planadd><label class="ls-field">${T('What will you do?', 'ماذا ستفعل؟')}<input name="t" maxlength="90" required placeholder="${T('e.g. Re-read my notes on circuits', 'مثلاً: أعيد قراءة ملاحظاتي')}"></label><label class="ls-field">${T('Link it to (optional)', 'اربطه بـ (اختياري)')}<select name="h"><option value="">${T('Nothing', 'لا شيء')}</option>${opts}</select></label><button class="ls-btn" type="submit">${T('Add to today', 'أضف لليوم')}</button></form></details>
      ${done.length && !todo.length ? `<p class="at-plan__fin" role="status">${T('That’s today’s plan done. Anything else is a bonus.', 'أنجزت خطة اليوم.')}</p>` : ''}</section>`;
  }
  function item(i, ix, n) {
    const k = KIND[i.own ? 'own' : i.kind] || KIND.new;
    const acts = i.status === 'todo' ? `<span class="at-plan__acts" role="group" aria-label="${T('Change this item', 'غيّر هذا البند')}"><button type="button" class="at-ib" data-pl="up" data-ix="${ix}" ${ix ? '' : 'disabled'} aria-label="${T('Move up', 'إلى الأعلى')}">↑</button><button type="button" class="at-ib" data-pl="down" data-ix="${ix}" ${ix < n - 1 ? '' : 'disabled'} aria-label="${T('Move down', 'إلى الأسفل')}">↓</button><button type="button" class="at-tb" data-pl="later" data-ix="${ix}">${T('Tomorrow', 'غداً')}</button><button type="button" class="at-tb" data-pl="skip" data-ix="${ix}">${T('Skip today', 'تخطَّ اليوم')}</button><button type="button" class="at-tb" data-pl="swap" data-ix="${ix}">${T('Swap', 'استبدل')}</button><button type="button" class="at-ib" data-pl="remove" data-ix="${ix}" aria-label="${T('Remove', 'أزل')}: ${esc(i.title)}" title="${T('Remove and don’t suggest it for a week', 'أزل ولا تقترحه لأسبوع')}">×</button></span>` : `<button type="button" class="at-tb" data-pl="undo" data-ix="${ix}">${T('Undo', 'تراجع')}</button>`;
    const st0 = i.status === 'done' ? `<span class="at-plan__st">✓ ${T('Done', 'تم')}</span>` : i.status === 'skipped' ? `<span class="at-plan__st">${T('Skipped today', 'تُخطّي')}</span>` : '';
    return `<li class="at-plan__i is-${i.status}"><span class="at-plan__k">${T(k[0], k[1])}</span><span class="at-plan__b">${i.href && i.status === 'todo' ? `<a href="${esc(i.href)}" data-plstart="${ix}">${esc(i.title)}</a>` : `<b>${esc(i.title)}</b>`}<small>${esc(i.why || '')}${i.mins ? ` · ~${i.mins} min` : ''}</small></span>${st0}${acts}</li>`;
  }
  function planAct(a, ix) {
    st.update(d => {
      const p = d.plan, it = p.items[ix]; if (!it) return;
      if (a === 'up' && ix > 0) [p.items[ix - 1], p.items[ix]] = [p.items[ix], p.items[ix - 1]];
      if (a === 'down' && ix < p.items.length - 1) [p.items[ix + 1], p.items[ix]] = [p.items[ix], p.items[ix + 1]];
      if (a === 'skip') it.status = 'skipped';
      if (a === 'undo') it.status = 'todo';
      if (a === 'later' || a === 'remove' || a === 'swap') { p.items.splice(ix, 1); if (!it.own) { if (a === 'later') { p.later = p.later || {}; p.later[it.key] = E().dayKey(Date.now() + DAY); } else { p.removed = p.removed || {}; p.removed[it.key] = Date.now() + 7 * DAY; } } }
    });
  }

  /* ================= momentum: a few real figures, no streak ================= */
  function momentum() {
    const d = st.data(), f = E().funnel(), now = Date.now();
    const turned = Object.values(d.mistakes || {}).filter(m => m.laterCorrect && (m.fixedAt || 0) > now - 30 * DAY).length;
    const revs = [].concat(...Object.values(d.cards || {}).map(c => c.history || [])).filter(h => h.at > now - 7 * DAY);
    const kept = revs.filter(h => h.grade !== 'again').length;
    return [
      { k: 'dem', n: f.demonstrated, of: f.objectives, en: 'objectives demonstrated', ar: 'أهداف مُثبتة', how: 'Different questions on the objective right without hints, the latest too.' },
      { k: 'turn', n: turned, en: 'mistakes turned around (30 days)', ar: 'أخطاء صُححت', how: 'Questions you once got wrong and later answered correctly.' },
      { k: 'rec', n: kept, of: revs.length, en: 'flashcards recalled this week', ar: 'بطاقات تذكرتها', how: 'Reviews you marked “Getting there” or “Know it”, of all reviews in 7 days.' },
      { k: 'exp', n: (d.archive || []).length, en: 'discoveries recorded', ar: 'اكتشافات مسجلة', how: 'Experiments where you saved a prediction and what you observed.' }
    ];
  }
  function momentumHTML() {
    let prev = {}; try { prev = JSON.parse(sessionStorage.getItem('ls-mom') || '{}'); } catch (e) { /* none */ }
    const m = momentum(), now = {}; m.forEach(x => { now[x.k] = x.n; });
    try { sessionStorage.setItem('ls-mom', JSON.stringify(now)); } catch (e) { /* none */ }
    return `<div class="at-mom" aria-labelledby="atMomH"><div class="at-sec__head"><h2 class="at-h2" id="atMomH">${T('Momentum', 'الزخم')}</h2><a href="#/progress">${T('Details', 'التفاصيل')} →</a></div>
      <ul class="at-mom__list">${m.map(x => `<li title="${esc(x.how)}"><b class="${prev[x.k] != null && prev[x.k] !== x.n ? 'is-changed' : ''}">${x.n}${x.of ? `<span>/${x.of}</span>` : ''}</b><span>${T(x.en, x.ar)}</span><small class="at-muted">${esc(x.how)}</small></li>`).join('')}</ul></div>`;
  }

  /* ================= insights you can question ================= */
  function insightHTML(i) {
    return `<article class="at-ins at-ins--${i.kind}" data-ins="${esc(i.key)}"><h3>${esc(i.title)}</h3>
      <dl><dt>${T('What I noticed', 'ما لاحظته')}</dt><dd>${esc(i.observed)}</dd><dt>${T('Why it may matter', 'لماذا قد يهم')}</dt><dd>${esc(i.why)}</dd></dl>
      <details><summary>${T('The evidence', 'الدليل')} (${i.evidence.length})</summary><ul>${i.evidence.map(e => `<li>${esc(e)}</li>`).join('')}</ul></details>
      <p class="at-ins__a"><a class="ls-btn ls-btn--sm ls-btn--accent" href="${esc(i.action.href)}">${esc(i.action.label)}</a><button type="button" class="at-tb" data-insx="hide">${T('Not useful — hide', 'غير مفيد — أخفِ')}</button><button type="button" class="at-tb" data-insx="wrong">${T('This isn’t right', 'هذا غير صحيح')}</button></p></article>`;
  }
  function insightsHTML(max, compact) {
    const d = st.data();
    if (d.settings.insights === false) return `<div class="at-insw"><div class="at-sec__head"><h2 class="at-h2">${T('Insights', 'رؤى')}</h2></div><p class="at-empty">${T('Insights are turned off. You can turn them on in Privacy & data.', 'الرؤى متوقفة.')}</p></div>`;
    const all = E().insights(), shown = all.filter(i => !i.hidden).slice(0, max || 99), hidden = all.filter(i => i.hidden);
    return `<div class="at-insw" aria-labelledby="atInsH"><div class="at-sec__head"><h2 class="at-h2" id="atInsH">${T('Insights', 'رؤى')}</h2>${compact ? `<a href="#/progress">${T('All', 'الكل')} →</a>` : ''}</div>
      ${shown.length ? shown.map(insightHTML).join('') : `<p class="at-empty">${T('No insights yet. They appear only when your own answers show a clear pattern — never from guesses.', 'لا رؤى بعد. تظهر فقط عند وجود نمط واضح في إجاباتك.')}</p>`}
      ${!compact && hidden.length ? `<details class="at-ins__hidden"><summary>${T('Hidden or corrected by you', 'أخفيتها أو صححتها')} (${hidden.length})</summary><ul>${hidden.map(i => `<li><b>${esc(i.title)}</b>${i.hidden.note ? ` — ${T('you said', 'قلت')}: “${esc(i.hidden.note)}”` : ''} <button type="button" class="at-tb" data-insrestore="${esc(i.key)}">${T('Show again', 'أظهر مجدداً')}</button></li>`).join('')}</ul></details>` : ''}</div>`;
  }
  function insightAct(el, act) {
    const key = el.dataset.ins;
    if (act === 'hide') { st.update(d => { d.dismissed[key] = { at: Date.now(), until: Date.now() + 14 * DAY }; }); LS.toast(T('Hidden for two weeks.', 'أُخفيت لأسبوعين.')); LS.render(); return; }
    if (act === 'wrong') {
      const dl = LS.dialog(`<h2 id="lsDlgT">${T('What isn’t right?', 'ما غير الصحيح؟')}</h2><p class="ls-muted">${T('Your correction is kept with your data and this insight will not be shown again. Nothing is sent anywhere.', 'يُحفظ تصحيحك ولن تظهر هذه الرؤية مجدداً.')}</p><label class="ls-field">${T('In your words (optional)', 'بكلماتك (اختياري)')}<textarea name="n" rows="3" maxlength="300"></textarea></label><div class="ls-row"><button type="button" class="ls-btn ls-btn--accent" data-ok>${T('Save correction', 'احفظ التصحيح')}</button><button type="button" class="ls-btn ls-btn--quiet" data-close>${T('Cancel', 'إلغاء')}</button></div>`);
      dl.el.querySelector('[data-ok]').onclick = () => { const n = dl.el.querySelector('[name=n]').value.trim(); st.update(d => { d.dismissed[key] = { at: Date.now(), wrong: true, note: n }; }); dl.close(); LS.toast(T('Thanks — noted.', 'شكراً — سُجّل.')); LS.render(); };
    }
  }

  /* ================= wiring shared by Home and Progress ================= */
  function wire(view) {
    if (view._jwired) return; view._jwired = true; // #lsView persists across routes: delegate once
    view.addEventListener('click', e => {
      const b = e.target.closest('[data-pl]'); if (b) { const a = b.dataset.pl, ix = +b.dataset.ix; planAct(a, ix); LS.render(); if (a === 'swap') { const det = document.querySelector('.at-plan__add'); if (det) { det.open = true; det.querySelector('input').focus(); } } else { const again = document.querySelector('.at-plan__list'); if (again) again.focus && again.focus(); } LS.announce(T('Plan updated.', 'حُدّثت الخطة.')); return; }
      const ix = e.target.closest('[data-insx]'); if (ix) { insightAct(ix.closest('[data-ins]'), ix.dataset.insx); return; }
      const r = e.target.closest('[data-insrestore]'); if (r) { st.update(d => { delete d.dismissed[r.dataset.insrestore]; }); LS.render(); }
    });
    view.addEventListener('submit', e => {
      const f = e.target.closest('[data-planadd]'); if (!f) return; e.preventDefault();
      const t = f.t.value.trim(); if (!t) return;
      st.update(d => { E().plan(); d.plan.items.push({ key: 'own:' + LS.uid('p'), own: true, kind: 'own', title: t, href: f.h.value || '', why: T('Added by you', 'أضفته أنت'), status: 'todo' }); });
      LS.render(); LS.announce(T('Added to today.', 'أُضيف لليوم.'));
    });
  }

  /* ================= progress: opened · completed · attempted · demonstrated · retained ================= */
  function progress(view) {
    const f = E().funnel(), steps = [['lessonsOpened', 'Lessons opened', 'دروس فُتحت', LS.lessons.length, 'You opened the lesson.'], ['lessonsCompleted', 'Lessons completed', 'دروس اكتملت', LS.lessons.length, 'Every section marked done.'], ['attempted', 'Objectives attempted', 'أهداف حاولتها', f.objectives, 'At least one question answered.'], ['demonstrated', 'Objectives demonstrated', 'أهداف أثبتّها', f.objectives, 'Two different questions right without hints, latest too.'], ['retained', 'Objectives retained', 'أهداف ثبتت', f.objectives, 'Right without hints on two or more different days.']];
    const max = Math.max(1, f.objectives, LS.lessons.length);
    view.innerHTML = `<div class="at-prog"><header class="ls-pagehead"><p class="ls-kicker">${T('My Workspace · Progress', 'مساحتي · التقدّم')}</p><h1>${T('What you have opened, done and shown', 'ما فتحته وأنجزته وأثبتّه')}</h1><p class="ls-lead">${T('Opening something is not finishing it, and finishing is not the same as understanding. These are counted separately.', 'الفتح ليس الإنجاز، والإنجاز ليس الفهم.')}</p></header>
      <section class="at-sec"><ul class="at-funnel">${steps.map(([k, en, ar, of, how]) => `<li><span class="at-funnel__l">${T(en, ar)}<small class="at-muted">${esc(how)}</small></span><span class="at-bar at-bar--wide" aria-hidden="true"><i style="--w:${Math.round(100 * f[k] / max)}%"></i></span><b>${f[k]}<span class="at-muted">/${of}</span></b></li>`).join('')}</ul></section>
      <section class="at-sec">${insightsHTML(99, false)}</section>
      <section class="at-sec"><div class="at-sec__head"><h2 class="at-h2">${T('Every objective', 'كل الأهداف')}</h2><a href="#/journey">${T('As a sky', 'كسماء')} →</a></div>
        ${LS.lessons.map(L => `<div class="at-topic"><h3><a href="#/lesson/${L.id}">${esc(L.title)}</a> <small class="at-muted">· ${esc(L.subject)}</small></h3><ul class="at-objs">${E().objectivesOf(L.id).map(LS.objRow).join('')}</ul></div>`).join('')}</section>
      <section class="at-sec"><details class="ls-panel" open><summary>${T('Patterns in your answers, by subject and week — with how reliable each one is', 'أنماط إجاباتك ومدى موثوقيتها')}</summary><div id="atClassic"></div></details></section></div>`;
    wire(view);
    const host = view.querySelector('#atClassic'); if (LS.progressClassic && host) { try { LS.progressClassic(host); } catch (e) { host.textContent = ''; } }
  }

  /* ================= the Knowledge Universe ================= */
  const SUBJ_POS = { Biology: [0.2, 0.32], Chemistry: [0.5, 0.2], Mathematics: [0.8, 0.32], Physics: [0.62, 0.72] };
  const BRIGHT = { not: 0.18, exploring: 0.35, learning: 0.45, practising: 0.55, revisit: 0.6, developing: 0.75, demonstrated: 1, review: 0.85 };
  function universe() {
    const W = 1000, H = 560, groups = {};
    LS.lessons.forEach(L => { (groups[L.subject] = groups[L.subject] || []).push(L); });
    let svg = '', labels = '', k = 0;
    Object.entries(groups).forEach(([sub, Ls], si) => {
      const c = SUBJ_POS[sub] || [0.15 + 0.2 * si, 0.8];
      labels += `<text x="${c[0] * W}" y="${c[1] * H - 92}" class="at-uni__sub" text-anchor="middle">${esc(sub)}</text>`;
      Ls.forEach((L, li) => {
        const ang0 = li * 2.4 + si, cx = c[0] * W + Math.cos(ang0) * 70 * (li ? 1 : 0.2), cy = c[1] * H + Math.sin(ang0) * 50 * (li ? 1 : 0.2);
        const S = E().objectivesOf(L.id), pts = S.map((s, i) => { const a = ang0 + i * (2 * Math.PI / Math.max(3, S.length)) + 0.6, r = 34 + (i % 2) * 14; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, s]; });
        svg += `<g class="at-uni__con"><path d="M${pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')}" class="at-uni__line"/>`;
        pts.forEach(([x, y, s]) => { k++; const b = BRIGHT[s.state]; svg += `<a href="#/learn/obj/${esc(s.key)}" class="at-uni__star at-uni__star--${s.state}" aria-label="${esc(s.obj.text)} — ${esc(E().STATES[s.state].label)}"><title>${esc(s.obj.text)} — ${esc(E().STATES[s.state].label)}</title><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3 + 5 * b).toFixed(1)}" style="opacity:${(0.35 + 0.65 * b).toFixed(2)}"/>${s.state === 'demonstrated' || s.state === 'review' ? `<circle class="at-uni__halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(10 + 6 * b).toFixed(1)}"/>` : ''}</a>`; });
        svg += `<text x="${cx.toFixed(1)}" y="${(cy + 70).toFixed(1)}" text-anchor="middle" class="at-uni__name">${esc(L.topic)}</text></g>`;
      });
    });
    return `<svg class="at-uni" viewBox="0 0 ${W} ${H}" role="group" aria-label="${T('Your Knowledge Universe: each star is a learning objective; brighter stars are understood more securely', 'كونك المعرفي')}"><rect width="${W}" height="${H}" class="at-uni__bg" rx="18"/>${bgStars(W, H)}${labels}${svg}</svg>`;
  }
  function bgStars(W, H) { let s = '', seed = 7; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 90; i++) s += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(r() * 1.1 + 0.2).toFixed(2)}" class="at-uni__dust"/>`; return s; }

  function journey(view) {
    const ms = E().milestones(), themes = E().themes(), cur = st.data().settings.lsTheme || 'ink', f = E().funnel();
    const bySubj = {}; Object.values(E().comp().states).forEach(s => { const k = s.obj.subject; bySubj[k] = bySubj[k] || [0, 0]; bySubj[k][1]++; if (s.state === 'demonstrated' || s.state === 'review') bySubj[k][0]++; });
    view.innerHTML = `<div class="at-journey"><header class="ls-pagehead"><p class="ls-kicker">${T('My Workspace · Journey', 'مساحتي · رحلتي')}</p><h1>${T('Your sky so far', 'سماؤك حتى الآن')}</h1><p class="ls-lead">${T('Every learning objective is a star. It brightens as your answers show you understand it, and glows again when it is ready for a quick review. Select a star to work on it.', 'كل هدف نجمة تزداد سطوعاً كلما أثبتّ فهمه.')}</p></header>
      <section class="at-sec">${universe()}<ul class="at-legend">${E().ORDER.map(k => `<li><span class="at-state at-state--${k}"><i aria-hidden="true"></i>${esc(E().STATES[k].label)}</span></li>`).join('')}</ul><p class="at-muted at-small">${f.demonstrated} ${T('of', 'من')} ${f.objectives} ${T('stars lit', 'نجوم مضيئة')}.</p></section>
      <section class="at-sec"><div class="at-sec__head"><h2 class="at-h2">${T('Collections', 'المجموعات')}</h2></div><ul class="at-coll">${Object.entries(bySubj).map(([k, [a, b]]) => `<li><b>${esc(k)}</b><span class="at-bar" aria-hidden="true"><i style="--w:${Math.round(100 * a / b)}%"></i></span><small>${a}/${b} ${T('objectives demonstrated', 'أهداف مُثبتة')}</small></li>`).join('')}</ul></section>
      <section class="at-sec"><div class="at-sec__head"><h2 class="at-h2">${T('Milestones', 'المحطات')}</h2><span class="at-muted at-small">${T('Earned only by learning — never by time spent or days in a row.', 'تُكتسب بالتعلم فقط.')}</span></div>
        <ul class="at-ms">${ms.map(m => `<li class="${m.earned ? 'is-earned' : ''}"><span class="at-ms__ic" aria-hidden="true">${m.earned ? '✦' : '·'}</span><b>${esc(m.title)}</b><small>${esc(m.desc)}</small>${m.earned ? `<small class="at-ms__when">${T('Earned', 'اكتُسب')} ${m.earned === 'now' ? T('just now', 'للتو') : esc(LS.fmtDate(m.earned))}${m.theme ? ' · ' + T('unlocks the theme', 'يفتح سمة') + ' ' + esc(E().THEMES[m.theme].label) : ''}</small>` : `<span class="at-bar" role="img" aria-label="${T('Progress', 'التقدّم')}: ${m.progress[0]} / ${m.progress[1]}"><i style="--w:${Math.round(100 * m.progress[0] / m.progress[1])}%"></i></span>`}</li>`).join('')}</ul></section>
      <section class="at-sec"><div class="at-sec__head"><h2 class="at-h2">${T('Studio themes', 'سمات الاستوديو')}</h2><span class="at-muted at-small">${T('Cosmetic only. Every learning feature is open to everyone.', 'تجميلية فقط.')}</span></div>
        <div class="at-themes" role="radiogroup" aria-label="${T('Studio theme', 'سمة الاستوديو')}">${themes.map(t => `<button type="button" role="radio" aria-checked="${t.id === cur}" class="at-theme at-theme--${t.id}" data-lstheme="${t.id}" ${t.unlocked ? '' : 'disabled'}><span class="at-theme__sw" aria-hidden="true"></span>${esc(t.label)}${t.unlocked ? '' : `<small>${T('from', 'من')} “${esc(t.from)}”</small>`}</button>`).join('')}</div></section></div>`;
    view.querySelector('.at-themes').addEventListener('click', e => { const b = e.target.closest('[data-lstheme]'); if (!b || b.disabled) return; st.update(d => { d.settings.lsTheme = b.dataset.lstheme; }); applyTheme(); LS.render(); });
  }
  function applyTheme() { const t = st.data().settings.lsTheme; if (t && t !== 'ink') document.documentElement.dataset.lsTheme = t; else delete document.documentElement.dataset.lsTheme; }

  /* ================= celebration: quiet, short, optional ================= */
  function celebrate(ms) {
    LS.toast(`✦ ${T('Milestone', 'محطة')}: ${ms.map(m => m.title).join(', ')}`);
    if (reduced() || st.data().settings.effects === false) return;
    const c = document.createElement('canvas'); c.className = 'at-spark'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
    const dpr = Math.min(2, devicePixelRatio || 1), w = c.width = innerWidth * dpr, h = c.height = innerHeight * dpr, g = c.getContext('2d');
    const acc = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#3346C9';
    const ps = Array.from({ length: 36 }, () => ({ x: w / 2 + (Math.random() - 0.5) * w * 0.3, y: h * 0.35, vx: (Math.random() - 0.5) * 6 * dpr, vy: (-Math.random() * 6 - 2) * dpr, r: (Math.random() * 2 + 1) * dpr }));
    let t0 = 0; const step = t => { if (!t0) t0 = t; const k = (t - t0) / 1100; g.clearRect(0, 0, w, h); g.fillStyle = acc; g.globalAlpha = Math.max(0, 1 - k);
      ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.18 * dpr; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); });
      if (k < 1) requestAnimationFrame(step); else c.remove(); };
    requestAnimationFrame(step);
  }
  let awardT = 0;
  LS.on('change', what => { if (what === 'deleted' || what === 'mode') return; clearTimeout(awardT); awardT = setTimeout(() => { if (!E() || st.mode() === 'demo') return; const fresh = E().award(); if (fresh.length) celebrate(fresh); }, 400); });

  /* ================= My Library and the Discovery Archive ================= */
  function readerData() { try { return JSON.parse(localStorage.getItem('erly-studio-v1') || '{}'); } catch (e) { return {}; } }
  function mylibrary(view, parts) {
    if (parts[0] === 'archive') return archive(view);
    const d = st.data(), R = window.ERLY && ERLY.reader, rd = readerData(), docs = R && R.docs ? R.docs() : (window.STUDIO_LIBRARY || []);
    const marks = []; Object.entries(rd.marks || {}).forEach(([doc, list]) => (list || []).forEach(m => marks.push({ doc, m })));
    const own = docs.filter(x => x.own || x.local), star = (d.settings.readStar || []);
    const notes = Object.values(d.notes || {}).sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 6);
    const coll = {}; Object.values(d.cards || {}).forEach(c => { coll[c.topic] = (coll[c.topic] || 0) + 1; });
    const sec = (title, inner, more) => `<section class="at-sec"><div class="at-sec__head"><h2 class="at-h2">${title}</h2>${more || ''}</div>${inner}</section>`;
    const empty = t => `<p class="at-empty">${t}</p>`;
    view.innerHTML = `<div class="at-mylib"><header class="ls-pagehead"><p class="ls-kicker">${T('My Workspace · My Library', 'مساحتي · مكتبتي')}</p><h1>${T('Everything you have kept', 'كل ما احتفظت به')}</h1><p class="ls-lead">${T('One place for your bookmarks, starred readings, files, notes, flashcard collections and discoveries — all read from the same store, nothing copied.', 'مكان واحد لكل ما حفظته.')}</p></header>
      ${sec(T('Bookmarks', 'العلامات'), (d.bookmarks || []).length || marks.length ? `<ul class="at-index">${(d.bookmarks || []).map(b => `<li><div class="at-row"><span class="at-glyph">${LS.icon('learn')}</span><span><a class="at-row__t" href="${esc(b.where)}">${esc(b.label || b.title)}</a><span class="at-row__m">${esc(b.title || '')} · ${esc(LS.fmtDate(b.at))}</span></span></div></li>`).join('')}${marks.slice(0, 10).map(x => `<li><div class="at-row"><span class="at-glyph">${LS.icon('read')}</span><span><a class="at-row__t" href="#/read/doc/${esc(x.doc)}">${esc((x.m && (x.m.label || x.m.text)) || T('Reader bookmark', 'علامة'))}</a><span class="at-row__m">${esc(x.doc)}</span></span></div></li>`).join('')}</ul>` : empty(T('No bookmarks yet. Bookmark a lesson section or a page in the reader.', 'لا علامات بعد.')))}
      ${sec(T('Starred readings and your files', 'القراءات المميزة وملفاتك'), star.length || own.length ? `<ul class="at-index">${star.concat(own.map(o => o.id)).filter((v, i, a) => a.indexOf(v) === i).map(id => { const doc = docs.find(x => x.id === id); return doc ? `<li><div class="at-row"><span class="at-glyph">${LS.icon('read')}</span><span><a class="at-row__t" href="#/read/doc/${esc(id)}">${esc(String(doc.title).replace(/_/g, ' '))}</a><span class="at-row__m">${doc.own || doc.local ? T('Your file — on this device only', 'ملفك — على هذا الجهاز') : esc(doc.course || '')}</span></span></div></li>` : ''; }).join('')}</ul>` : empty(T('Star a reading or open your own PDF in Reading.', 'ميّز قراءة أو افتح ملفك.')), `<a href="#/read">${T('Reading', 'القراءة')} →</a>`)}
      ${sec(T('Recent notes', 'أحدث الملاحظات'), notes.length ? `<ul class="at-index">${notes.map(n => `<li><div class="at-row"><span class="at-glyph">${LS.icon('notebook')}</span><span><a class="at-row__t" href="#/notebook/${esc(n.id)}">${esc(n.title || T('Untitled note', 'ملاحظة'))}</a><span class="at-row__m">${esc(n.folder || '')}${n.src && n.src.title ? ' · ' + esc(n.src.title) : ''}</span></span></div></li>`).join('')}</ul>` : empty(T('No notes yet.', 'لا ملاحظات بعد.')), `<a href="#/notebook">${T('Notebook', 'الدفتر')} →</a>`)}
      ${sec(T('Flashcard collections', 'مجموعات البطاقات'), Object.keys(coll).length ? `<ul class="at-chips">${Object.entries(coll).map(([k, n]) => `<li><a class="ls-chip" href="#/revise">${esc(k)} <b>${n}</b></a></li>`).join('')}</ul>` : empty(T('No flashcards yet.', 'لا بطاقات بعد.')), `<a href="#/revise">${T('Flashcards', 'البطاقات')} →</a>`)}
      ${sec(T('Discovery archive', 'أرشيف الاكتشافات'), (d.archive || []).length ? `<p>${(d.archive || []).length} ${T('recorded discoveries', 'اكتشافات مسجلة')}.</p>` : empty(T('Make a prediction in an experience and save what you observed — it lands here.', 'سجّل توقعاً وملاحظة في تجربة.')), `<a href="#/mylibrary/archive">${T('Open the archive', 'افتح الأرشيف')} →</a>`)}</div>`;
  }
  function archive(view) {
    const A = (st.data().archive || []).slice().sort((a, b) => b.at - a.at);
    view.innerHTML = `<div class="at-archive"><header class="ls-pagehead"><p class="ls-kicker">${T('My Library · Discovery archive', 'مكتبتي · أرشيف الاكتشافات')}</p><h1>${T('What you predicted, and what happened', 'ما توقعته وما حدث')}</h1><p class="ls-lead">${T('Each entry is one experiment you ran: your prediction, what you observed in the model, and your explanation.', 'كل مدخل تجربة أجريتها.')}</p></header>
      ${A.length ? `<ol class="at-arch">${A.map(a => `<li><p class="at-k">${esc(LS.fmtDate(a.at))} · ${esc(a.kind || '')}</p><h2><a href="#/exp/${esc(a.exp)}">${esc(a.title)}</a></h2><dl><dt>${T('I predicted', 'توقعت')}</dt><dd>${esc(a.prediction || '—')}${a.predOk != null ? ` <span class="at-state at-state--${a.predOk ? 'demonstrated' : 'revisit'}"><i aria-hidden="true"></i>${a.predOk ? T('matched', 'طابق') : T('surprised me', 'فاجأني')}</span>` : ''}</dd><dt>${T('I observed', 'لاحظت')}</dt><dd>${esc(a.observation || '—')}</dd>${a.explanation ? `<dt>${T('My explanation', 'تفسيري')}</dt><dd>${esc(a.explanation)}</dd>` : ''}</dl><button type="button" class="at-tb" data-delarch="${esc(a.id)}">${T('Delete', 'احذف')}</button></li>`).join('')}</ol>` : `<p class="at-empty">${T('Nothing recorded yet.', 'لا شيء بعد.')} <a href="#/discover">${T('Find an experiment', 'ابحث عن تجربة')} →</a></p>`}</div>`;
    view.onclick = e => { const b = e.target.closest('[data-delarch]'); if (!b) return; const keep = st.data().archive.find(x => x.id === b.dataset.delarch); st.update(d => { d.archive = d.archive.filter(x => x.id !== keep.id); }); LS.render(); LS.toast(T('Deleted.', 'حُذف.'), { undo: () => { st.update(d => { d.archive.push(keep); }); LS.render(); } }); };
  }

  LS.journey = { planHTML, momentumHTML, insightsHTML, wire, applyTheme, celebrate, universe, momentum };
  LS.route('progress', progress);
  LS.route('journey', journey);
  LS.route('mylibrary', mylibrary);
  LS.route('archive', v => archive(v));
  LS.on('change', w => { if (w === 'deleted' || w === 'mode') applyTheme(); });
  applyTheme();
})();
