/* ERLY Learning Studio — Practice Centre and the mistake notebook.
   Modes: Guided (hints, worked examples, feedback after each question) · Independent (feedback after each
   question, no hints) · Test (answers locked in, feedback at the end; optional timer). Questions are chosen to
   avoid repetition: ones never seen first, then ones previously got wrong, then the rest. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store, IL = LS.inline;

  function pick(o) {
    const att = st.data().attempts, seen = new Set(att.map(a => a.qid)), wrong = new Set(Object.values(st.data().mistakes).filter(m => !m.laterCorrect).map(m => m.qid));
    let pool = LS.bank().filter(q => (!o.topics.length || o.topics.includes(q.topic)) && (!o.difficulty || q.difficulty === o.difficulty) && (!o.types.length || o.types.includes(q.type)) && (!o.avoidType || q.type !== o.avoidType));
    if (o.mistakesOnly) pool = pool.filter(q => wrong.has(q.id));
    const rank = q => (seen.has(q.id) ? (wrong.has(q.id) ? 1 : 2) : 0) + Math.random() * 0.9;
    pool.sort((a, b) => rank(a) - rank(b));
    // interleave topics for mixed practice instead of blocks of one topic
    if (o.topics.length !== 1) { const by = {}; pool.forEach(q => (by[q.topic] = by[q.topic] || []).push(q)); const keys = Object.keys(by), out = []; while (out.length < pool.length) keys.forEach(k => { if (by[k].length) out.push(by[k].shift()); }); pool = out; }
    return pool.slice(0, o.n);
  }

  function setup(view, pre) {
    pre = pre || {};
    const topics = LS.topics(), types = [...new Set(LS.bank().map(q => q.type))];
    const mist = Object.values(st.data().mistakes).filter(m => !m.laterCorrect).length;
    view.innerHTML = `<div class="ls-pr"><header class="ls-pagehead"><p class="ls-kicker">${T('Practice Centre', 'مركز التدريب')}</p><h1>${T('Practise with purpose', 'تدرّب بهدف')}</h1><p class="ls-lead">${LS.bank().length} ${T('questions written for ERLY across', 'سؤالاً مكتوباً لـERLY في')} ${topics.length} ${T('topics. They are not official exam questions.', 'مواضيع. ليست أسئلة امتحانات رسمية.')}</p></header>
      <form class="ls-panel ls-form" data-setup>
        <fieldset><legend>${T('Topics', 'المواضيع')}</legend><div class="ls-chips">${topics.map(t => `<label class="ls-chipck"><input type="checkbox" name="t" value="${esc(t.topic)}" ${(pre.topic ? pre.topic === t.topic : false) ? 'checked' : ''}><span>${esc(t.topic)} <small>${esc(t.subject)}</small></span></label>`).join('')}</div><p class="ls-muted ls-small">${T('None ticked = mixed practice from every topic.', 'دون اختيار = تدريب مختلط.')}</p></fieldset>
        <fieldset><legend>${T('Mode', 'الوضع')}</legend><div class="ls-radios">
          <label><input type="radio" name="mode" value="guided" ${pre.mode === 'guided' ? 'checked' : ''}><span><b>${T('Guided', 'موجّه')}</b> — ${T('hints, worked examples, feedback after each question', 'تلميحات وأمثلة')}</span></label>
          <label><input type="radio" name="mode" value="independent" ${!pre.mode || pre.mode === 'independent' ? 'checked' : ''}><span><b>${T('Independent', 'مستقل')}</b> — ${T('feedback after each question, no hints', 'تغذية راجعة دون تلميحات')}</span></label>
          <label><input type="radio" name="mode" value="test" ${pre.mode === 'test' ? 'checked' : ''}><span><b>${T('Test', 'اختبار')}</b> — ${T('feedback at the end', 'التغذية الراجعة في النهاية')}</span></label></div></fieldset>
        <div class="ls-row"><label class="ls-field">${T('Difficulty', 'الصعوبة')}<select name="d"><option value="">${T('Any', 'أي')}</option><option value="1" ${pre.difficulty === 1 ? 'selected' : ''}>${T('Starter', 'مبتدئ')} ●○○</option><option value="2" ${pre.difficulty === 2 ? 'selected' : ''}>${T('Core', 'أساسي')} ●●○</option><option value="3" ${pre.difficulty === 3 ? 'selected' : ''}>${T('Stretch', 'متقدم')} ●●●</option></select></label>
          <label class="ls-field">${T('Questions', 'عدد الأسئلة')}<select name="n"><option>5</option><option selected>10</option><option>15</option><option value="99">${T('All that match', 'كل المطابقة')}</option></select></label>
          <label class="ls-field">${T('Question type', 'نوع السؤال')}<select name="ty"><option value="">${T('All types', 'كل الأنواع')}</option>${types.map(t => `<option value="${t}">${esc(LS.intel.TYPE_NAMES[t] || t)}</option>`).join('')}</select></label>
          <label class="ls-field">${T('Timer', 'المؤقت')}<select name="tm"><option value="0">${T('Untimed', 'دون وقت')}</option><option value="60">${T('1 min per question', 'دقيقة لكل سؤال')}</option><option value="90">${T('1.5 min per question', 'دقيقة ونصف')}</option></select></label></div>
        ${pre.avoidType ? `<p class="ls-call ls-call--note">${T('Skipping', 'تجاوز')} <b>${esc(LS.intel.TYPE_NAMES[pre.avoidType])}</b> ${T('questions, as suggested by your insights. You can change this.', 'حسب اقتراح رؤاك.')} <input type="hidden" name="avoid" value="${esc(pre.avoidType)}"></p>` : ''}
        <label class="ls-chk"><input type="checkbox" name="mo" ${mist ? '' : 'disabled'}> ${T('Only questions I got wrong before', 'فقط ما أخطأت فيه')} (${mist})</label>
        <p class="ls-err-msg" role="alert" hidden></p>
        <div class="ls-row"><button class="ls-btn ls-btn--accent" type="submit">${T('Start practice', 'ابدأ التدريب')}</button><a class="ls-btn ls-btn--quiet" href="#/mistakes">${T('Mistake notebook', 'دفتر الأخطاء')} (${mist})</a></div>
      </form></div>`;
    view.querySelector('[data-setup]').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target, fd = new FormData(f);
      const o = { topics: fd.getAll('t'), mode: fd.get('mode'), difficulty: +fd.get('d') || 0, n: +fd.get('n'), types: fd.get('ty') ? [fd.get('ty')] : [], timer: +fd.get('tm'), mistakesOnly: !!fd.get('mo'), avoidType: fd.get('avoid') || '' };
      const qs = pick(o); if (!qs.length) { const m = f.querySelector('.ls-err-msg'); m.hidden = false; m.textContent = T('No questions match those choices. Try fewer filters.', 'لا أسئلة مطابقة. قلّل المرشحات.'); return; }
      LS._run = { o, qs, i: 0, results: [], started: Date.now() }; LS.store.useFormat('practice'); LS.go('practice/run');
    });
  }

  function run(view) {
    const R = LS._run; if (!R) { LS.go('practice', { replace: true }); return; }
    const later = R.o.mode === 'test';
    if (R.i >= R.qs.length) return summary(view, R);
    const q = R.qs[R.i];
    const ex = R.o.mode === 'guided' ? exampleFor(q) : null;
    view.innerHTML = `<section class="ls-run" aria-labelledby="lsRunH"><header class="ls-run__head"><a class="ls-linkbtn" href="#/practice">← ${T('Practice set-up', 'الإعداد')}</a><h1 id="lsRunH">${T('Question', 'سؤال')} ${R.i + 1} ${T('of', 'من')} ${R.qs.length}</h1>
        <div class="ls-meter" role="progressbar" aria-label="${T('Progress', 'التقدم')}" aria-valuemin="0" aria-valuemax="${R.qs.length}" aria-valuenow="${R.i}"><i style="width:${100 * R.i / R.qs.length}%"></i></div>
        <p class="ls-muted ls-small">${esc(q.topic)} · ${esc(q.lessonTitle || '')} · ${{ guided: T('Guided', 'موجّه'), independent: T('Independent', 'مستقل'), test: T('Test', 'اختبار') }[R.o.mode]}</p>
        ${R.o.timer ? `<p class="ls-timer" role="timer" aria-live="off" data-timer></p>` : ''}</header>
      <div class="ls-run__q"></div>
      ${ex ? `<details class="ls-ex ls-ex--side"><summary>${T('See a worked example', 'مثال محلول')}</summary><p class="ls-ex__p">${IL(ex.problem)}</p><ol>${ex.steps.map(s => `<li>${IL(s)}</li>`).join('')}</ol><p><b>${T('Answer:', 'الجواب:')}</b> ${IL(ex.answer)}</p></details>` : ''}
      <div class="ls-row ls-run__nav"><button type="button" class="ls-btn ls-btn--accent" data-nextq hidden>${R.i + 1 < R.qs.length ? T('Next question', 'السؤال التالي') + ' →' : T('See results', 'النتائج')}</button><button type="button" class="ls-btn ls-btn--quiet" data-skip>${T('Skip', 'تخطَّ')}</button></div></section>`;
    const act = LS.activity(view.querySelector('.ls-run__q'), q, { from: 'practice', feedback: later ? 'later' : 'now', guided: R.o.mode === 'guided', lesson: q.lesson, topic: q.topic, subject: q.subject, lessonTitle: q.lessonTitle, onResult: res => { R.results[R.i] = { q, res, act }; R._acts = R._acts || []; R._acts[R.i] = act; view.querySelector('[data-nextq]').hidden = false; view.querySelector('[data-skip]').hidden = true; view.querySelector('[data-nextq]').focus(); } });
    view.querySelector('.ls-run').addEventListener('click', e => { if (e.target.closest('[data-nextq]')) { R.i++; LS.render(); } if (e.target.closest('[data-skip]')) { R.results[R.i] = { q, res: null, skipped: true }; R.i++; LS.render(); } });
    if (R.o.timer) {
      const el = view.querySelector('[data-timer]'), end = Date.now() + R.o.timer * 1000;
      const tick = () => { if (!el.isConnected) return; const left = Math.max(0, Math.round((end - Date.now()) / 1000)); el.textContent = `${T('Time left', 'الوقت المتبقي')}: ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; if (left === 30) LS.announce(T('30 seconds left', 'بقي ٣٠ ثانية')); if (left === 0) { el.textContent = T('Time is up — you can still answer; it will be marked as over time.', 'انتهى الوقت — يمكنك الإجابة.'); R.results[R.i] = R.results[R.i] || {}; R.over = (R.over || 0) + 1; return; } setTimeout(tick, 1000); };
      tick();
    }
  }
  function exampleFor(q) { const L = LS.lesson(q.lesson); if (!L) return null; for (const s of L.sections) for (const b of s.blocks) if (b.k === 'example') return b; return null; }

  function summary(view, R) {
    const done = R.results.filter(r => r && r.res), right = done.filter(r => r.res.correct === true).length, self = done.filter(r => r.res.correct === null).length;
    const byTopic = {}; done.forEach(r => { const k = r.q.topic; byTopic[k] = byTopic[k] || [0, 0]; byTopic[k][1]++; if (r.res.correct) byTopic[k][0]++; });
    view.innerHTML = `<section class="ls-runsum"><header class="ls-pagehead"><p class="ls-kicker">${T('Practice summary', 'ملخص التدريب')}</p><h1>${right} ${T('of', 'من')} ${done.length - self} ${T('marked questions right', 'صحيحة')}</h1>
      <p class="ls-lead">${R.results.filter(r => r && r.skipped).length} ${T('skipped', 'متخطاة')}${self ? ` · ${self} ${T('written answers you judged yourself', 'إجابات مكتوبة قيّمتها بنفسك')}` : ''}${R.over ? ` · ${R.over} ${T('over the time limit', 'تجاوزت الوقت')}` : ''}. ${T('This is one practice set — it shows where to look next, not how able you are.', 'هذه مجموعة تدريب واحدة فقط.')}</p></header>
      <div class="ls-panel"><h2 class="ls-h2">${T('By topic', 'حسب الموضوع')}</h2><ul class="ls-bars">${Object.entries(byTopic).map(([k, [a, b]]) => `<li><span>${esc(k)}</span><span class="ls-bar" role="img" aria-label="${a} of ${b}"><i style="width:${Math.round(100 * a / b)}%"></i></span><b>${a}/${b}</b></li>`).join('')}</ul></div>
      <div class="ls-panel"><h2 class="ls-h2">${T('Review your answers', 'راجع إجاباتك')}</h2><div class="ls-revlist"></div></div>
      <div class="ls-row"><a class="ls-btn ls-btn--accent" href="#/practice">${T('Practise again', 'تدرّب مجدداً')}</a><a class="ls-btn" href="#/mistakes">${T('Mistake notebook', 'دفتر الأخطاء')}</a><a class="ls-btn ls-btn--quiet" href="#/progress">${T('My progress', 'تقدمي')}</a></div></section>`;
    const host = view.querySelector('.ls-revlist');
    R.results.forEach((r, i) => { if (!r || !r.res) return; const box = document.createElement('div'); box.className = 'ls-revitem'; host.appendChild(box); box.appendChild(r.act.el); if (R.o.mode === 'test') r.act.reveal(); });
    if (!host.children.length) host.innerHTML = `<p class="ls-muted">${T('No answers in this set.', 'لا إجابات.')}</p>`;
    LS._run = null;
  }

  /* ---------- mistake notebook ---------- */
  function mistakes(view) {
    const d = st.data(), bank = LS.bank(), f = LS._mf || 'open', tf = LS._mt || '';
    const all = Object.values(d.mistakes).sort((a, b) => (b.lastAt || b.at) - (a.lastAt || a.at));
    const list = all.filter(m => (f === 'all' || (f === 'open' ? !m.laterCorrect : m.laterCorrect)) && (!tf || m.tag === tf || m.topic === tf));
    const tags = [...new Set(all.map(m => m.tag).filter(Boolean))], topics = [...new Set(all.map(m => m.topic))];
    view.innerHTML = `<div class="ls-mk"><header class="ls-pagehead"><p class="ls-kicker">${T('Mistake notebook', 'دفتر الأخطاء')}</p><h1>${T('Mistakes are where learning happens', 'الأخطاء هي حيث يحدث التعلم')}</h1><p class="ls-lead">${all.length} ${T('questions you have got wrong at least once', 'سؤالاً أخطأت فيه مرة على الأقل')} · ${all.filter(m => m.laterCorrect).length} ${T('since answered correctly', 'أجبت عنه بشكل صحيح لاحقاً')}.</p>
      <div class="ls-row"><label>${T('Show', 'اعرض')} <select data-mf><option value="open" ${f === 'open' ? 'selected' : ''}>${T('Not yet put right', 'لم تُصحح بعد')}</option><option value="fixed" ${f === 'fixed' ? 'selected' : ''}>${T('Put right', 'صُححت')}</option><option value="all" ${f === 'all' ? 'selected' : ''}>${T('All', 'الكل')}</option></select></label><label>${T('Topic or kind of slip', 'الموضوع أو نوع الخطأ')} <select data-mt><option value="">${T('Any', 'أي')}</option>${topics.map(t => `<option ${t === tf ? 'selected' : ''}>${esc(t)}</option>`).join('')}${tags.map(t => `<option ${t === tf ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>${list.filter(m => !m.laterCorrect).length ? `<button type="button" class="ls-btn ls-btn--accent ls-btn--sm" data-retryall>${T('Practise these', 'تدرّب عليها')}</button>` : ''}</div></header>
      <ul class="ls-mklist">${list.map(m => { const q = bank.find(x => x.id === m.qid); return `<li class="ls-mkitem ${m.laterCorrect ? 'is-fixed' : ''}"><div class="ls-mkitem__h"><b>${esc(m.prompt || (q && LS.plain(q.prompt)) || m.qid)}</b><span class="ls-tag">${esc(m.topic || '')}</span>${m.tag ? `<span class="ls-tag ls-tag--warn">${esc(m.tag)}</span>` : ''}<span class="ls-status">${m.laterCorrect ? '✓ ' + T('since answered correctly', 'صُحح لاحقاً') : T('open', 'مفتوح')}</span></div>
        <dl class="ls-mkdl"><dt>${T('Your first answer', 'إجابتك الأولى')}</dt><dd>${esc(m.first || '—')} <small class="ls-muted">${LS.fmtDate(m.at)}</small></dd>${m.tries > 1 ? `<dt>${T('Latest wrong answer', 'آخر إجابة خاطئة')}</dt><dd>${esc(m.last || '')}</dd>` : ''}<dt>${T('Correct answer and why', 'الإجابة الصحيحة والسبب')}</dt><dd>${q ? IL(q.correctText || '') + ' ' + IL(q.explain) : ''}</dd><dt>${T('Revisited', 'زيارات')}</dt><dd>${m.revisited || 0}×</dd></dl>
        <div class="ls-row"><button type="button" class="ls-btn ls-btn--sm" data-try="${esc(m.qid)}">${T('Try it again', 'حاول مجدداً')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-mnoor="${esc(m.qid)}">${T('Explain my mistake (Noor)', 'اشرح خطئي')}</button>${q && q.lesson ? `<a class="ls-btn ls-btn--sm ls-btn--quiet" href="#/lesson/${esc(q.lesson)}${q.section ? '/' + esc(q.section) : ''}">${T('Back to the lesson', 'إلى الدرس')}</a>` : ''}</div><div class="ls-mktry"></div></li>`; }).join('') || `<li class="ls-empty">${all.length ? T('Nothing here with these filters.', 'لا شيء بهذه المرشحات.') : T('No mistakes recorded yet. When you get a question wrong, it is kept here so you can come back to it.', 'لا أخطاء مسجلة بعد.')}</li>`}</ul></div>`;
    const root = view.querySelector('.ls-mk');
    root.addEventListener('change', e => { if (e.target.matches('[data-mf]')) { LS._mf = e.target.value; LS.render(); } if (e.target.matches('[data-mt]')) { LS._mt = e.target.value; LS.render(); } });
    root.addEventListener('click', e => {
      const tb = e.target.closest('[data-try]'); if (tb) { const q = bank.find(x => x.id === tb.dataset.try); const host = tb.closest('li').querySelector('.ls-mktry'); host.innerHTML = ''; st.update(dd => { dd.mistakes[q.id].revisited = (dd.mistakes[q.id].revisited || 0) + 1; }); LS.activity(host, q, { from: 'practice', lesson: q.lesson, topic: q.topic, subject: q.subject, lessonTitle: q.lessonTitle }); tb.disabled = true; return; }
      const nb = e.target.closest('[data-mnoor]'); if (nb) { const q = bank.find(x => x.id === nb.dataset.mnoor), m = d.mistakes[q.id]; LS.noor.ask('mistake', { q, answer: m.last || m.first }); return; }
      if (e.target.closest('[data-retryall]')) { const ids = list.filter(m => !m.laterCorrect).map(m => m.qid); const qs = bank.filter(q => ids.includes(q.id)); LS._run = { o: { topics: [], mode: 'guided', n: qs.length, types: [], timer: 0 }, qs, i: 0, results: [], started: Date.now() }; LS.go('practice/run'); }
    });
  }

  LS.route('practice', (view, parts) => { if (parts[0] === 'run') return run(view); const pre = LS._practicePre || {}; LS._practicePre = null; setup(view, pre); });
  LS.route('mistakes', mistakes);
  LS.practiceWith = pre => { LS._practicePre = pre; LS.go('practice', { replace: LS.current()[0] === 'practice' }); };
})();
