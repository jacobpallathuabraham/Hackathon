/* ERLY Learning Studio — subject worlds and topic hubs (v23).

   Subject → Topic → Learn · Explore · Practise · Revise.
   • A subject page is a world: a full-width living environment with the subject's name in it, and below it, on a calm
     reading surface, the topics laid out as a trail (each with its real progress), the experiences, readings and models.
   • A topic hub gathers everything for one topic under four modes. A mode only appears when the topic has something
     real for it (no empty "Explore" tab where there is nothing to explore). */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store, IL = LS.inline;
  const S_ = id => (LS.subjectsList || []).find(s => s.id === id);
  const subjOfLesson = L => (LS.subjectsList || []).find(s => s.lesson.test(L.subject)) || { id: 'more' };
  const progressOf = L => { const S = LS.engine ? LS.engine.objectivesOf(L.id) : []; return { dem: S.filter(s => s.state === 'demonstrated' || s.state === 'review').length, all: S.length, started: S.some(s => s.state !== 'not') }; };

  /* ---------- the world page ---------- */
  function world(view, parts) {
    const S = S_(parts[0]); if (!S) return LS.go('explore', { replace: true });
    const c = LS.subjectContents(S.id), d = st.data(), xs = (LS.experiences || []).filter(x => x.subject === S.id);
    const first = c.lessons.find(L => !(d.lessons[L.id] || {}).completed) || c.lessons[0];
    view.innerHTML = `<div class="at-wp at-subj-${S.id}">
      <section class="at-wh" aria-labelledby="atWhH"><canvas class="at-world at-world--hero" data-world="${S.id}" aria-hidden="true"></canvas><div class="at-wh__scrim" aria-hidden="true"></div>
        <div class="at-wh__in"><p class="at-wh__k">${T('World', 'عالم')} · ${esc(S.world || '')}</p><h1 id="atWhH" class="at-wh__h">${T(S.name, S.ar)}</h1><p class="at-wh__lead">${esc(S.blurb)}</p>
          <p class="at-wh__cta">${first ? `<a class="ls-btn ls-btn--accent" href="#/topic/${first.id}">${(d.lessons[first.id] ? T('Continue', 'تابع') : T('Begin', 'ابدأ'))}: ${esc(first.topic)} →</a>` : ''}${xs.length ? `<a class="ls-btn at-btn--glass" href="#/exp/${xs[0].id}">${T('Enter the lab', 'ادخل المختبر')}: ${esc(xs[0].title)}</a>` : ''}</p></div>
        <div class="at-wh__tools">${LS.envSwitch()}</div></section>
      <div class="at-wsurf">
        ${c.lessons.length ? `<section class="at-sec at-trail" aria-labelledby="atTrH"><div class="at-sec__head"><h2 class="at-h2" id="atTrH">${T('Topics', 'المواضيع')}</h2><span class="at-muted at-small">${T('Each topic: learn it, explore it, practise it, revise it.', 'لكل موضوع: تعلّم، استكشف، تدرّب، راجع.')}</span></div>
          <ol class="at-trail__list">${c.lessons.map((L, i) => { const p = progressOf(L); return `<li><a href="#/topic/${L.id}" data-vt><span class="at-trail__n" aria-hidden="true">${i + 1}</span><span class="at-trail__b"><b>${esc(L.topic)}</b><small>${esc(L.title)} · ${L.mins} min</small></span><span class="at-trail__p" aria-label="${p.dem} ${T('of', 'من')} ${p.all} ${T('objectives demonstrated', 'أهداف مُثبتة')}">${Array.from({ length: p.all }, (_, k) => `<i class="${k < p.dem ? 'is-on' : ''}"></i>`).join('')}</span></a></li>`; }).join('')}</ol></section>` : `<section class="at-sec"><p class="at-empty">${T('No lessons in this world yet. Its experiences below are ready to explore.', 'لا دروس في هذا العالم بعد.')}</p></section>`}
        ${xs.length ? `<section class="at-sec"><div class="at-sec__head"><h2 class="at-h2">${T('Experiences', 'التجارب')}</h2><a href="#/discover">${T('All experiences', 'كل التجارب')} →</a></div><ul class="at-xlist">${xs.map(x => LS.xItem(x, (d.events || []).some(e => e.t === 'experience' && e.id === x.id))).join('')}</ul></section>` : ''}
        ${c.readings.length || c.videos.length ? `<section class="at-sec"><div class="at-sec__head"><h2 class="at-h2">${T('Read and watch', 'اقرأ وشاهد')}</h2></div><ul class="at-index">${c.readings.map(r => `<li><div class="at-row"><span class="at-glyph">${LS.icon('read')}</span><span><a class="at-row__t" href="#/read/doc/${r.id}">${esc(r.title.replace(/_/g, ' ').replace(/\.pdf$/i, ''))}</a><span class="at-row__m">${esc(r.course)}</span></span></div></li>`).join('')}${c.videos.filter(v => v.id).map(v => `<li><div class="at-row"><span class="at-glyph">${LS.icon('watch')}</span><span><a class="at-row__t" href="#/video/${v.id}">${esc(v.title)}</a><span class="at-row__m">${T('ERLY video', 'فيديو ERLY')}</span></span></div></li>`).join('')}</ul></section>` : ''}
        <section class="at-sec"><details class="at-models"><summary><h2 class="at-h2">${T('Interactive models in the Visual Lab', 'نماذج المختبر المرئي')}</h2></summary><div class="at-models__b">${window.ERLY_LAB ? (c.models.length ? `<div class="at-cols">${c.models.slice().sort((a, b) => (a.title || '').localeCompare(b.title || '')).map(e => `<a class="at-row__t" href="#/lab/${e.id}">${esc(e.title || e.id)}</a>`).join('')}</div>` : `<p class="at-muted">${T('No models for this subject yet.', 'لا نماذج لهذه المادة بعد.')}</p>`) : `<p class="at-muted" aria-busy="true">${T('Loading the models…', 'جارٍ التحميل…')}</p>`}</div></details></section>
      </div></div>`;
    LS.paintWorlds(view);
    if (!window.ERLY_LAB && LS.needLab) LS.needLab().then(() => { const b = view.querySelector('.at-models__b'); if (b && view.isConnected) { const m = LS.subjectContents(S.id).models; b.innerHTML = m.length ? `<div class="at-cols">${m.slice().sort((a, b2) => (a.title || '').localeCompare(b2.title || '')).map(e => `<a class="at-row__t" href="#/lab/${e.id}">${esc(e.title || e.id)}</a>`).join('')}</div>` : `<p class="at-muted">${T('No models for this subject yet.', 'لا نماذج لهذه المادة بعد.')}</p>`; } });
  }

  /* ---------- the topic hub ---------- */
  const MODES = [['learn', 'Learn', 'تعلّم'], ['explore', 'Explore', 'استكشف'], ['practise', 'Practise', 'تدرّب'], ['revise', 'Revise', 'راجع']];
  function topic(view, parts) {
    const L = LS.lesson(parts[0]); if (!L) return LS.go('lessons', { replace: true });
    const S = subjOfLesson(L), objs = LS.engine.objectivesOf(L.id), d = st.data(), p = d.lessons[L.id] || null;
    const xs = (LS.experiences || []).filter(x => x.lesson === L.id || (x.objs || []).some(o => o.startsWith(L.id + ':')));
    const labs = [].concat(...L.sections.map(s => s.blocks.filter(b => b.k === 'lab').map(b => ({ engine: b.engine, sec: s }))));
    const have = MODES.filter(([k]) => k !== 'explore' || xs.length || labs.length);
    const mode = have.some(m => m[0] === parts[1]) ? parts[1] : 'learn';
    const prog = progressOf(L);
    view.innerHTML = `<div class="at-tp at-subj-${S.id}">
      <header class="at-tph"><canvas class="at-world at-world--band" data-world="${S.id}" aria-hidden="true" style="view-transition-name: world-hero" data-vt-keep></canvas><div class="at-wh__scrim" aria-hidden="true"></div>
        <div class="at-tph__in"><p class="at-wh__k"><a href="#/subject/${S.id}">${T(S.name, S.ar)}</a> · ${T('Topic', 'موضوع')}</p><h1 class="at-tph__h">${esc(L.topic)}</h1><p class="at-wh__lead">${esc(L.title)} · ${L.mins} min · ${prog.dem}/${prog.all} ${T('objectives demonstrated', 'أهداف مُثبتة')}</p></div>
        <div class="at-wh__tools"><button type="button" class="at-glassbtn" data-focus-toggle aria-pressed="false">${T('Focus', 'تركيز')}</button></div></header>
      <nav class="at-modes" role="tablist" aria-label="${T('Ways to work on this topic', 'طرق العمل على الموضوع')}">${have.map(([k, en, ar]) => `<a role="tab" href="#/topic/${L.id}/${k}" aria-selected="${k === mode}" ${k === mode ? 'aria-current="page"' : ''}>${T(en, ar)}</a>`).join('')}<span class="at-modes__ink" aria-hidden="true"></span></nav>
      <div class="at-tpb" role="tabpanel">${({ learn: learnP, explore: exploreP, practise: practiseP, revise: reviseP })[mode](L, objs, xs, labs, p)}</div></div>`;
    LS.paintWorlds(view);
    const ink = view.querySelector('.at-modes__ink'), cur = view.querySelector('.at-modes [aria-selected="true"]');
    if (ink && cur) requestAnimationFrame(() => { ink.style.transform = `translateX(${cur.offsetLeft}px) scaleX(${cur.offsetWidth})`; });
    view.querySelector('.at-tpb').addEventListener('click', e => { const nb = e.target.closest('[data-tpnoor]'); if (nb && LS.noor) { /* only the topic title and its objectives go to Noor — never the student's history */ LS.noor.ask(nb.dataset.tpnoor, { lesson: L, section: L.topic, text: `${L.title.indexOf(L.topic) === 0 ? L.title : L.topic + ': ' + L.title}. ${(L.objectives || []).map(o => typeof o === 'string' ? o : o.text).filter(Boolean).join('; ')}` }); return; } const a = e.target.closest('[data-addcards]'); if (!a) return; const n = LS.cards.addMany((L.cards || []).map(c => Object.assign({ topic: L.topic, src: { type: 'lesson', id: L.id, title: L.title } }, c))); LS.toast(n ? `${n} ${T('cards added to your revision.', 'بطاقات أُضيفت.')}` : T('These cards are already in your revision.', 'البطاقات موجودة.')); LS.render(); });
  }
  function learnP(L, objs, xs, labs, p) {
    const done = (p && p.done) || {}, ix = p ? Math.min(p.secIx || 0, L.sections.length - 1) : 0;
    return `<div class="at-tp2"><section><h2 class="at-h2">${T('What you will understand', 'ما ستفهمه')}</h2><ul class="at-objs">${objs.map(LS.objRow).join('')}</ul></section>
      <section><h2 class="at-h2">${T('The lesson', 'الدرس')}</h2><ol class="at-steps">${L.sections.map((s, i) => `<li class="${done[s.id] ? 'is-done' : i === ix && p ? 'is-here' : ''}"><a href="#/lesson/${L.id}/${s.id}"><span aria-hidden="true">${done[s.id] ? '✓' : i + 1}</span>${esc(s.title)}</a></li>`).join('')}</ol>
        <p><a class="ls-btn ls-btn--accent" href="#/lesson/${L.id}${p ? '/' + L.sections[ix].id : ''}">${p ? T('Continue the lesson', 'تابع الدرس') : T('Start the lesson', 'ابدأ الدرس')} →</a></p>
        <p class="ls-row at-tpnoor"><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-tpnoor="explain">${T('Ask Noor: the big idea', 'اسأل نور: الفكرة الكبرى')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-tpnoor="practice">${T('Ask Noor: quiz me first', 'اسأل نور: اختبرني أولاً')}</button></p>
        ${(L.prereq || []).length ? `<p class="at-muted at-small">${T('Helps to know first:', 'يفيد أن تعرف أولاً:')} ${L.prereq.map(r => r.lesson ? `<a href="#/topic/${r.lesson}">${esc(r.text)}</a>` : esc(r.text)).join('; ')}</p>` : ''}</section></div>`;
  }
  function exploreP(L, objs, xs, labs) {
    return `<div class="at-tpx">${xs.length ? `<h2 class="at-h2">${T('Experiments and models', 'تجارب ونماذج')}</h2><ul class="at-xlist">${xs.map(x => LS.xItem(x, false)).join('')}</ul>` : ''}
      ${labs.length ? `<h2 class="at-h2" style="margin-top:28px">${T('In the lesson', 'داخل الدرس')}</h2><ul class="at-index">${labs.map(l => `<li><div class="at-row"><span class="at-glyph">${LS.icon('model')}</span><span><a class="at-row__t" href="#/lesson/${L.id}/${l.sec.id}">${esc(l.sec.title)}</a><span class="at-row__m">${T('Interactive model', 'نموذج تفاعلي')} · ${esc(l.engine)}</span></span></div></li>`).join('')}</ul>` : ''}</div>`;
  }
  function practiseP(L, objs) {
    return `<div class="at-tpx"><h2 class="at-h2">${T('Practise one idea at a time', 'تدرّب على فكرة واحدة كل مرة')}</h2><p class="at-muted">${T('Each objective adapts: if an answer does not land, you get another way in and a different question.', 'كل هدف يتكيف معك.')}</p>
      <ul class="at-pcards">${objs.map(s => `<li><a href="#/learn/obj/${esc(s.key)}"><span class="at-state at-state--${s.state}"><i aria-hidden="true"></i>${esc(LS.engine.STATES[s.state].label)}</span><b>${esc(s.obj.text)}</b><small>${s.attempts ? `${s.correct}/${s.attempts} ${T('right so far', 'صحيحة حتى الآن')}` : T('Not tried yet', 'لم تُجرب بعد')}</small></a></li>`).join('')}</ul>
      <p><a class="ls-btn" href="#/practice">${T('Mixed practice in the Practice Centre', 'تدريب مختلط')} →</a></p></div>`;
  }
  function reviseP(L) {
    const have = new Set(Object.values(st.data().cards).map(c => c.front)), fresh = (L.cards || []).filter(c => !have.has(c.front)).length, due = Object.values(st.data().cards).filter(c => (c.src && c.src.id === L.id) && (c.due || 0) <= Date.now()).length;
    return `<div class="at-tp2"><section><h2 class="at-h2">${T('Key ideas', 'الأفكار الأساسية')}</h2><ul class="ls-sum">${L.summary.map(x => `<li>${IL(x)}</li>`).join('')}</ul></section>
      <section><h2 class="at-h2">${T('Flashcards', 'البطاقات')}</h2><p>${(L.cards || []).length} ${T('cards for this topic', 'بطاقات لهذا الموضوع')}${due ? ` · <b>${due} ${T('due now', 'مستحقة الآن')}</b>` : ''}.</p>
        <p class="ls-row">${fresh ? `<button type="button" class="ls-btn ls-btn--accent" data-addcards>${T('Add', 'أضف')} ${fresh} ${T('to my revision', 'إلى مراجعتي')}</button>` : ''}${due ? `<a class="ls-btn" href="#/revise/session/due">${T('Review due cards', 'راجع المستحق')}</a>` : ''}<a class="ls-btn ls-btn--quiet" href="#/lesson/${L.id}/summary">${T('Revision questions', 'أسئلة المراجعة')} →</a></p></section></div>`;
  }

  LS.route('subject', world);
  LS.route('topic', topic);
})();
