/* ERLY Learning Studio — the lesson renderer.

   Renders any lesson object from the registry: a contents rail with progress, one section at a time, every
   block type (text, figure, maths, worked example revealed step by step, callout, live Visual Lab model,
   video, audio lesson, activity, link to a reading) and the closing summary, revision questions, flashcards
   and further reading. Progress (sections done, current section) is saved, so the student can resume. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, md = LS.md, IL = LS.inline;
  const KIND_LABEL = { erly: 'Written for ERLY', official: 'Official resource', teacher: 'From your teacher', student: 'Made by you', ai: 'AI-generated practice', demo: 'Demonstration content' };
  LS.KIND_LABEL = KIND_LABEL;
  LS.provBadge = k => `<span class="ls-prov ls-prov--${esc(k)}" title="Where this content comes from">${esc(KIND_LABEL[k] || k)}</span>`;

  /* ---------- the Visual Lab model, live inside a lesson card (one live model at a time) ---------- */
  let liveHost = null;
  LS.mountModel = async function (host, engine, params, meta) {
    if (!window.ERLY_LAB && LS.needLab) { host.innerHTML = `<p class="ls-loading" role="status"><span class="ls-spin" aria-hidden="true"></span>${T('Loading the model…', 'أحمّل النموذج…')}</p>`; try { await LS.needLab(); } catch (e) { /* reported below */ } if (!host.isConnected) return; }
    const L = window.ERLY_LAB; if (!L) { host.innerHTML = '<p class="ls-muted">The Visual Lab could not load on this page.</p>'; return; }
    if (liveHost && liveHost !== host && liveHost.isConnected) { liveHost.innerHTML = `<button type="button" class="ls-btn ls-btn--quiet" data-relive>${T('Show the model here again', 'اعرض النموذج هنا مجدداً')}</button>`; liveHost.closest('.ls-labcard') && liveHost.closest('.ls-labcard').classList.remove('is-live'); }
    host.innerHTML = `<p class="ls-loading" role="status"><span class="ls-spin" aria-hidden="true"></span>${T('Building the model…', 'أبني النموذج…')}</p>`;
    try { await L.open(engine, params || {}); L.inline(host); host.querySelector('.ls-loading') && host.querySelector('.ls-loading').remove(); liveHost = host; host.closest('.ls-labcard') && host.closest('.ls-labcard').classList.add('is-live'); LS.store.useFormat('visual'); if (meta) LS.store.touch('lab', engine, meta.title || engine); }
    catch (e) { host.innerHTML = `<p class="ls-fb ls-fb--warn" role="alert">${T('This model could not be built here: ', 'تعذر بناء النموذج: ')}${esc(e.message || e)}</p>`; }
  };
  LS.on('leave', () => { if (liveHost && window.ERLY_LAB) { try { ERLY_LAB.close(); } catch (e) { /* ok */ } liveHost = null; } });

  /* ---------- reading support: listen, chunking ---------- */
  LS.speak = text => {
    const v = window.ERLY && ERLY.companion && ERLY.companion._ui && ERLY.companion._ui.voice;
    if (v && v.speak) { v.speak(text); return { stop: () => v.stop && v.stop() }; }
    if ('speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); speechSynthesis.speak(u); return { stop: () => speechSynthesis.cancel() }; }
    LS.toast(T('Read-aloud is not available in this browser.', 'القراءة بصوت غير متاحة في هذا المتصفح.')); return { stop() {} };
  };

  function block(b, L, s) {
    const S = LS.store.data().settings;
    switch (b.k) {
      case 'text': {
        const parts = String(b.md).trim().split(/\n\s*\n/);
        const chunk = S.chunk && parts.length > 1;
        return `<div class="ls-b ls-text" data-ls-sel>${S.readAloud ? `<button type="button" class="ls-listen" data-listen aria-label="${T('Listen to this part', 'استمع')}">🔊 <span>${T('Listen', 'استمع')}</span></button>` : ''}${chunk ? parts.map((p, i) => `<div class="ls-chunk" ${i ? 'hidden' : ''}>${md(p)}</div>`).join('') + `<button type="button" class="ls-btn ls-btn--quiet ls-btn--sm" data-chunk>${T('Show the next part', 'الجزء التالي')} (1/${parts.length})</button>` : md(b.md)}</div>`;
      }
      case 'figure': return `<figure class="ls-b ls-fig" data-ls-sel data-fig="${esc(b.alt)}">${b.svg || `<img src="${esc(b.img)}" alt="${esc(b.alt)}" loading="lazy">`}${b.cap ? `<figcaption>${IL(b.cap)}</figcaption>` : ''}<div class="ls-fig__tools"><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-askfig>${T('Ask Noor what this shows', 'اسأل نور')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-savefig>${T('Save diagram to notebook', 'احفظ الرسم')}</button></div></figure>`;
      case 'math': return `<div class="ls-b ls-mathwrap"><div class="ls-math" role="math" aria-label="${esc(b.alt)}" data-ls-sel><span class="ls-math__tx">${LS.math(b.tex)}</span></div><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-askmath="${esc(b.tex)}">${T('Teach me this step by step', 'علّمني خطوة بخطوة')}</button></div>`;
      case 'example': return `<div class="ls-b ls-ex" data-ls-sel><p class="ls-ex__h">${esc(b.title || 'Worked example')}</p><p class="ls-ex__p">${IL(b.problem)}</p><ol class="ls-ex__steps">${b.steps.map((x, i) => `<li ${i ? 'hidden' : ''}>${IL(x)}</li>`).join('')}</ol><p class="ls-ex__a" hidden><b>${T('Answer:', 'الجواب:')}</b> ${IL(b.answer)}</p><button type="button" class="ls-btn ls-btn--sm" data-step>${T('Show the next step', 'الخطوة التالية')}</button></div>`;
      case 'callout': return `<aside class="ls-b ls-call ls-call--${esc(b.tone || 'note')}" data-ls-sel>${md(b.md)}</aside>`;
      case 'lab': return `<section class="ls-b ls-labcard" aria-label="${T('Interactive model', 'نموذج تفاعلي')}"><div class="ls-labcard__head"><span class="ls-tag">${T('Interactive model', 'نموذج تفاعلي')}</span><p><b>${T('Goal:', 'الهدف:')}</b> ${IL(b.objective)}</p>${b.try ? `<ul class="ls-try">${b.try.map(t => `<li>${IL(t)}</li>`).join('')}</ul>` : ''}</div><div class="ls-labcard__host" data-engine="${esc(b.engine)}" data-params='${esc(JSON.stringify(b.params || {}))}'><button type="button" class="ls-btn ls-btn--accent" data-model>${T('Start the interactive model', 'شغّل النموذج')}</button></div><details class="ls-assume"><summary>${T('What this model assumes', 'افتراضات النموذج')}</summary><p>${IL(b.assume || '')}</p></details><div class="ls-labcard__tools"><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-asklab="${esc(b.engine)}">${T('Ask Noor about this model', 'اسأل نور عن النموذج')}</button><a class="ls-btn ls-btn--sm ls-btn--quiet" href="#/lab/${esc(b.engine)}">${T('Open in the Visual Learning Lab', 'افتح في المختبر')}</a></div></section>`;
      case 'video': { const V = LS.video && LS.video.byId(b.id); if (!V) return `<p class="ls-muted">${T('Video not available.', 'الفيديو غير متاح.')}</p>`; return `<section class="ls-b ls-vidcard" aria-label="${T('Video', 'فيديو')}"><div class="ls-vidcard__host" data-vid="${esc(b.id)}"></div>${b.objective ? `<p class="ls-muted">${IL(b.objective)}</p>` : ''}<a class="ls-btn ls-btn--sm ls-btn--quiet" href="#/video/${esc(b.id)}">${T('Open in Video Studio (transcript, chapters, notes)', 'افتح في استوديو الفيديو')}</a></section>`; }
      case 'audio': return `<div class="ls-b ls-audio"><button type="button" class="ls-btn" data-audio="${esc(b.topic)}">🎧 ${T('Listen to an audio lesson on', 'درس صوتي عن')} ${esc(b.topic)}</button></div>`;
      case 'activity': return `<div class="ls-b ls-actslot" data-q="${esc(b.q.id)}"></div>`;
      case 'reading': return `<div class="ls-b ls-read"><button type="button" class="ls-btn" data-reading="${esc(b.doc)}">📖 ${T('Open the reading', 'افتح القراءة')}</button></div>`;
    }
    return '';
  }

  function lessonPage(view, id, secId) {
    const L = LS.lesson(id);
    if (!L) { view.innerHTML = `<section class="ls-empty"><h1>${T('Lesson not found', 'الدرس غير موجود')}</h1><p>${T('It may have been renamed or removed.', 'ربما أعيدت تسميته.')}</p><a class="ls-btn" href="#/lessons">${T('All lessons', 'كل الدروس')}</a></section>`; return; }
    const st = LS.store;
    let p = st.lessonProgress(L.id);
    if (!p) { st.setLesson(L.id, { secIx: 0 }); p = st.lessonProgress(L.id); st.useFormat('text'); }
    let ix = secId === 'summary' ? L.sections.length : Math.max(0, L.sections.findIndex(s => s.id === secId));
    if (!secId) ix = Math.min(p.secIx || 0, L.sections.length);
    st.setLesson(L.id, { secIx: ix });
    st.touch('lesson', L.id, L.title, { sec: ix });
    const done = p.done || {}, nDone = L.sections.filter(s => done[s.id]).length;
    const sec = L.sections[ix];
    view.innerHTML = `<div class="ls-lesson">
      <nav class="ls-toc" aria-label="${T('Lesson sections', 'أقسام الدرس')}"><a class="ls-toc__back" href="#/lessons">← ${T('Lessons', 'الدروس')}</a>
        <p class="ls-toc__t">${esc(L.title)}</p>
        <div class="ls-meter" role="progressbar" aria-label="${T('Sections completed', 'الأقسام المكتملة')}" aria-valuemin="0" aria-valuemax="${L.sections.length}" aria-valuenow="${nDone}"><i style="width:${Math.round(100 * nDone / L.sections.length)}%"></i></div><p class="ls-muted ls-small">${nDone} / ${L.sections.length} ${T('sections done', 'أقسام')}</p>
        <ol>${L.sections.map((s, i) => `<li><a href="#/lesson/${L.id}/${s.id}" ${i === ix ? 'aria-current="step"' : ''} class="${done[s.id] ? 'is-done' : ''}"><span class="ls-toc__n" aria-hidden="true">${done[s.id] ? '✓' : i + 1}</span>${esc(s.title)}${done[s.id] ? `<span class="sr-only"> (done)</span>` : ''}</a></li>`).join('')}<li><a href="#/lesson/${L.id}/summary" ${ix === L.sections.length ? 'aria-current="step"' : ''}><span class="ls-toc__n" aria-hidden="true">★</span>${T('Summary & revision', 'الخلاصة والمراجعة')}</a></li></ol>
      </nav>
      <article class="ls-lesson__main" data-lesson="${L.id}">
        <header class="ls-lesson__head"><p class="ls-kicker">${esc(L.subject)} · ${esc(L.course || '')} · ${esc(L.level)}</p><h1>${esc(ix < L.sections.length ? sec.title : T('Summary and revision', 'الخلاصة والمراجعة'))}</h1>
          <p class="ls-meta">${LS.provBadge(L.provenance.kind)} <span>${esc(L.title)}</span> · <span>${L.mins} min</span> · <span>v${esc(L.v)}</span> ${(() => { const where = `#/lesson/${L.id}/${ix < L.sections.length ? sec.id : 'summary'}`, on = LS.store.data().bookmarks.some(b => b.where === where); return `<button type="button" class="ls-btn ls-btn--quiet" data-lbm="${esc(where)}" aria-pressed="${on}">${on ? T('★ Bookmarked', '★ محفوظ') : T('☆ Bookmark this section', '☆ احفظ هذا القسم')}</button>`; })()}</p></header>
        ${ix === 0 ? `<details class="ls-before" open><summary>${T('Before you start', 'قبل أن تبدأ')}</summary><div><p><b>${T('You will be able to:', 'ستتمكن من:')}</b></p><ul>${L.objectives.map(o => `<li>${IL(o)}</li>`).join('')}</ul>${L.prereq && L.prereq.length ? `<p><b>${T('It helps to know:', 'يفيد أن تعرف:')}</b></p><ul>${L.prereq.map(r => `<li>${IL(r.text)}${r.lesson && LS.lesson(r.lesson) ? ` — <a href="#/lesson/${r.lesson}">${esc(LS.lesson(r.lesson).title)}</a>` : ''}</li>`).join('')}</ul>` : ''}</div></details>` : ''}
        <div class="ls-blocks">${ix < L.sections.length ? sec.blocks.map(b => block(b, L, sec)).join('') : summaryHTML(L)}</div>
        <footer class="ls-lesson__foot">${ix > 0 ? `<a class="ls-btn ls-btn--quiet" href="#/lesson/${L.id}/${L.sections[ix - 1].id}">← ${esc(L.sections[ix - 1].title)}</a>` : '<span></span>'}
          ${ix < L.sections.length ? `<button type="button" class="ls-btn ls-btn--accent" data-next>${done[sec.id] ? '' : T('Mark as done and ', 'أنهِ و')}${T('continue', 'تابع')} →</button>` : ''}</footer>
      </article></div>`;
    // activities
    view.querySelectorAll('.ls-actslot').forEach(slot => { const q = LS.bank().find(x => x.id === slot.dataset.q); if (q) LS.activity(slot, q, { from: 'lesson', lesson: L.id, topic: L.topic, subject: L.subject, lessonTitle: L.title }); });
    view.querySelectorAll('.ls-vidcard__host').forEach(h => LS.video.mountCompact(h, h.dataset.vid));
    if (ix === L.sections.length) {
      const host = view.querySelector('.ls-rev'); (L.revision || []).forEach(q => LS.activity(host, Object.assign({ lesson: L.id, topic: L.topic, subject: L.subject }, q), { from: 'revision', lesson: L.id, topic: L.topic, subject: L.subject, lessonTitle: L.title }));
    }
    const root = view.querySelector('.ls-lesson');
    root.addEventListener('click', e => {
      const t = e.target;
      const nx = t.closest('[data-next]'); if (nx) { const d = Object.assign({}, st.lessonProgress(L.id).done); d[sec.id] = Date.now(); const allDone = L.sections.every(s => d[s.id]); st.setLesson(L.id, { done: d, secIx: ix + 1, completed: allDone ? (st.lessonProgress(L.id).completed || Date.now()) : st.lessonProgress(L.id).completed }); LS.go(`lesson/${L.id}/${ix + 1 < L.sections.length ? L.sections[ix + 1].id : 'summary'}`); return; }
      const stp = t.closest('[data-step]'); if (stp) { const ex = stp.closest('.ls-ex'), hid = ex.querySelector('.ls-ex__steps li[hidden]'); if (hid) { hid.hidden = false; LS.announce(hid.textContent); } else { ex.querySelector('.ls-ex__a').hidden = false; stp.hidden = true; LS.announce(ex.querySelector('.ls-ex__a').textContent); } if (!ex.querySelector('.ls-ex__steps li[hidden]') && !ex.querySelector('.ls-ex__a').hidden) stp.hidden = true; else if (!ex.querySelector('.ls-ex__steps li[hidden]')) stp.textContent = T('Show the answer', 'أظهر الجواب'); return; }
      const mdl = t.closest('[data-model]') || t.closest('[data-relive]'); if (mdl) { const h = mdl.closest('.ls-labcard__host'); let prm = {}; try { prm = JSON.parse(h.dataset.params || '{}'); } catch (er) { prm = {}; } LS.mountModel(h, h.dataset.engine, prm, { title: L.title }); return; }
      const bm = t.closest('[data-lbm]'); if (bm) { const where = bm.dataset.lbm, title = view.querySelector('h1') ? view.querySelector('h1').textContent : ''; LS.store.update(d => { const i = d.bookmarks.findIndex(b => b.where === where); if (i >= 0) d.bookmarks.splice(i, 1); else d.bookmarks.unshift({ where, label: title, title: L.title, at: Date.now(), type: 'lesson' }); }); const on = LS.store.data().bookmarks.some(b => b.where === where); bm.setAttribute('aria-pressed', String(on)); bm.textContent = on ? T('★ Bookmarked', '★ محفوظ') : T('☆ Bookmark this section', '☆ احفظ هذا القسم'); LS.announce(on ? T('Section bookmarked — find it in Notebook → Bookmarks.', 'حُفظ القسم.') : T('Bookmark removed.', 'أُزيلت الإشارة.')); return; }
      const asl = t.closest('[data-asklab]'); if (asl) { LS.noor.ask('model', { engine: asl.dataset.asklab, lesson: L }); return; }
      const am = t.closest('[data-askmath]'); if (am) { LS.noor.ask('steps', { text: LS.plain(am.dataset.askmath), lesson: L }); return; }
      const af = t.closest('[data-askfig]'); if (af) { const f = af.closest('figure'); LS.noor.ask('diagram', { text: f.dataset.fig + '. ' + (f.querySelector('desc') ? f.querySelector('desc').textContent : '') + ' ' + (f.querySelector('figcaption') ? f.querySelector('figcaption').textContent : ''), lesson: L }); return; }
      const sf = t.closest('[data-savefig]'); if (sf) { const f = sf.closest('figure'); LS.notes.quick({ title: 'Diagram: ' + f.dataset.fig.slice(0, 60), html: f.querySelector('svg') ? f.querySelector('svg').outerHTML + `<p>${esc(f.querySelector('figcaption') ? f.querySelector('figcaption').textContent : '')}</p>` : '', src: { type: 'lesson', id: L.id, title: L.title, where: `#/lesson/${L.id}/${sec ? sec.id : 'summary'}` }, kind: 'diagram' }); return; }
      const ls = t.closest('[data-listen]'); if (ls) { const box = ls.closest('.ls-text'); LS.store.useFormat('audio'); LS.speak([...box.querySelectorAll('p, li')].filter(x => !x.closest('[hidden]')).map(x => x.textContent).join(' ')); return; }
      const ch = t.closest('[data-chunk]'); if (ch) { const box = ch.closest('.ls-text'), nxt = box.querySelector('.ls-chunk[hidden]'); if (nxt) { nxt.hidden = false; const n = box.querySelectorAll('.ls-chunk:not([hidden])').length, tot = box.querySelectorAll('.ls-chunk').length; ch.textContent = `${T('Show the next part', 'الجزء التالي')} (${n}/${tot})`; if (n === tot) ch.remove(); nxt.setAttribute('tabindex', '-1'); nxt.focus(); } return; }
      const au = t.closest('[data-audio]'); if (au) { if (window.ERLY && ERLY.audioLesson) { LS.store.useFormat('audio'); ERLY.audioLesson.start(au.dataset.audio); } return; }
      const rd = t.closest('[data-reading]'); if (rd) { LS.openReading(rd.dataset.reading); return; }
      const addc = t.closest('[data-addcards]'); if (addc) { const n = LS.cards.addMany((L.cards || []).map(c => Object.assign({ topic: L.topic, src: { type: 'lesson', id: L.id, title: L.title } }, c))); addc.disabled = true; addc.textContent = n ? `${T('Added', 'أُضيفت')} ${n} ${T('cards', 'بطاقات')} ✓` : T('Already in your revision', 'موجودة مسبقاً'); return; }
      const term = t.closest('.ls-term'); if (term) { LS.noor.ask('explain', { text: term.dataset.term, lesson: L }); }
    });
  }

  function summaryHTML(L) {
    const p = LS.store.lessonProgress(L.id) || {}, done = p.done || {}, all = L.sections.every(s => done[s.id]);
    const have = new Set(Object.values(LS.store.data().cards).map(c => c.front));
    const fresh = (L.cards || []).filter(c => !have.has(c.front)).length;
    return `${all ? `<div class="ls-call ls-call--key" role="status"><p><b>${T('Lesson complete.', 'اكتمل الدرس.')}</b> ${T('Your progress is saved. Come back to any section at any time.', 'تقدمك محفوظ.')}</p></div>` : `<div class="ls-call ls-call--note"><p>${L.sections.length - L.sections.filter(s => done[s.id]).length} ${T('section(s) not marked done yet — you can still revise here.', 'أقسام لم تكتمل بعد.')}</p></div>`}
      <section class="ls-b"><h2>${T('Key points', 'النقاط الرئيسية')}</h2><ul class="ls-sum" data-ls-sel>${L.summary.map(x => `<li>${IL(x)}</li>`).join('')}</ul></section>
      ${(L.revision || []).length ? `<section class="ls-b"><h2>${T('Revision questions', 'أسئلة المراجعة')}</h2><div class="ls-rev"></div></section>` : ''}
      ${(L.cards || []).length ? `<section class="ls-b ls-cardsoffer"><h2>${T('Flashcards from this lesson', 'بطاقات من هذا الدرس')}</h2><ul class="ls-cardlist">${L.cards.map(c => `<li><b>${IL(c.front)}</b><span>${IL(c.back)}</span></li>`).join('')}</ul><button type="button" class="ls-btn" data-addcards ${fresh ? '' : 'disabled'}>${fresh ? `${T('Add', 'أضف')} ${fresh} ${T('to my revision', 'إلى مراجعتي')}` : T('Already in your revision', 'موجودة مسبقاً')}</button></section>` : ''}
      ${(L.further || []).length ? `<section class="ls-b"><h2>${T('Further reading', 'قراءات إضافية')}</h2><ul>${L.further.map(f => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.title)}</a> <span class="ls-muted">— ${esc(f.publisher)} · ${T('external site', 'موقع خارجي')}</span></li>`).join('')}</ul></section>` : ''}
      <section class="ls-b ls-provbox"><h2>${T('About this content', 'عن هذا المحتوى')}</h2><dl><dt>${T('Source', 'المصدر')}</dt><dd>${LS.provBadge(L.provenance.kind)} ${esc(L.provenance.author)}</dd><dt>${T('Version', 'الإصدار')}</dt><dd>${esc(L.v)}${L.provenance.reviewed ? ` · ${T('reviewed', 'مراجعة')} ${esc(L.provenance.reviewed)}` : ''}</dd><dt>${T('Licence', 'الترخيص')}</dt><dd>${esc(L.provenance.licence || '—')}</dd><dt>${T('Checked against', 'مقارنة مع')}</dt><dd>${(L.provenance.sources || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> (${esc(s.publisher)})`).join('<br>')}</dd></dl><p class="ls-muted ls-small">${T('Practice questions are written for ERLY and are not official exam questions.', 'الأسئلة كتبت لـERLY وليست أسئلة امتحانات رسمية.')} <button type="button" class="ls-linkbtn" data-report="${esc(L.id)}">${T('Report a problem with this lesson', 'أبلغ عن مشكلة')}</button></p></section>`;
  }

  document.addEventListener('click', e => { const r = e.target.closest('[data-report]'); if (r) LS.reportContent(r.dataset.report); });
  LS.reportContent = id => {
    const L = LS.lesson(id); const d = LS.dialog(`<h2 id="lsDlgT">${T('Report a problem', 'أبلغ عن مشكلة')}</h2><p class="ls-muted">${esc(L ? L.title : id)}</p><label class="ls-field">${T('What is wrong?', 'ما المشكلة؟')}<select name="kind"><option>${T('A fact looks wrong', 'معلومة خاطئة')}</option><option>${T('A question is marked wrongly', 'سؤال مصحح خطأ')}</option><option>${T('Hard to understand', 'صعب الفهم')}</option><option>${T('Accessibility problem', 'مشكلة وصول')}</option></select></label><label class="ls-field">${T('Details (optional)', 'تفاصيل')}<textarea name="txt" rows="3"></textarea></label><p class="ls-muted ls-small">${T('Reports are saved on this device in your notebook (folder “Content reports”) for a teacher or the content team to review. Nothing is sent anywhere.', 'تحفظ البلاغات على جهازك فقط.')}</p><div class="ls-row"><button type="button" class="ls-btn ls-btn--accent" data-ok>${T('Save report', 'احفظ')}</button><button type="button" class="ls-btn ls-btn--quiet" data-close>${T('Cancel', 'إلغاء')}</button></div>`);
    d.el.querySelector('[data-ok]').onclick = () => { const k = d.el.querySelector('[name=kind]').value, tx = d.el.querySelector('[name=txt]').value; LS.notes.create({ title: 'Content report: ' + (L ? L.title : id), html: `<p><b>${esc(k)}</b></p><p>${esc(tx)}</p><p>Lesson ${esc(id)} v${esc(L ? L.v : '')}, reported ${new Date().toLocaleString()}</p>`, folder: 'Content reports', src: { type: 'lesson', id, title: L ? L.title : id, where: '#/lesson/' + id } }); d.close(); LS.toast(T('Report saved in your notebook.', 'حُفظ البلاغ.')); };
  };

  LS.route('lesson', (view, parts) => lessonPage(view, parts[0], parts[1]));
})();
