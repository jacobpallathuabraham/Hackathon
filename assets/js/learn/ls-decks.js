/* ERLY Learning Studio 2.0 — structured flashcards and chapter assessments (interfaces).

   Flashcards (#/cards, #/cards/<chapter>[/mode]):
     modes  learn    — the deck in teaching order, one card at a time
            recall   — type your answer first, then reveal and judge yourself
            review   — only cards that are due, on a spaced schedule (boxes 1–5: today, 1, 3, 7, 16 days)
            mastery  — the whole chapter; complete when every card is marked “known”
            apply    — only application, reasoning, misconception and comparison cards
            shuffle  — optional; the default is always the structured order
     marks  known / uncertain / needs practice — they move a card between boxes; the reason a card is showing is always visible
     keys   Space/Enter flip · → next · ← previous · 1 known · 2 uncertain · 3 needs practice; swipe on touch screens
     resume the position per chapter and mode is remembered (only if the student allowed the Studio to save on this device)
   Assessments (#/assess/<chapter>): one question at a time; the answer is never shown before an attempt; feedback explains the
   correct reasoning AND the misconception behind the chosen wrong option; a result by learning objective, remediation links,
   and mastery at ≥ 80 %. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, esc = LS.esc, IL = s => (LS.inline ? LS.inline(s) : esc(s));
  const TYPES = { concept: 'Concept', definition: 'Definition', recall: 'Recall', formula: 'Formula', application: 'Application', misconception: 'Misconception', comparison: 'Comparison', visual: 'Visual', reasoning: 'Reasoning' };
  const DAY = 864e5, BOX = [0, 1, 3, 7, 16];
  const deck = ch => (LS.DECKDATA[ch] || []).map((s, i) => { const k1 = s.indexOf('|'), k2 = s.indexOf('|', k1 + 1), type = s.slice(0, k1), front = s.slice(k1 + 1, k2), back = s.slice(k2 + 1); /* a '|' inside the answer stays in the answer; data uses ∣ (U+2223) for P(A ∣ B) */ return { i, type, front, back, ch }; });
  const quiz = ch => (LS.ASSESSDATA[ch] || []).map(([kind, prompt, opts, answer, explain, mis, obj], i) => ({ i, kind, prompt, opts, answer, explain, mis, obj }));
  LS.decks = { byChapter: deck, all: () => Object.keys(LS.DECKDATA), TYPES };
  LS.assess = { byChapter: ch => (LS.ASSESSDATA[ch] ? quiz(ch) : null), grade: (q, resp) => (q.kind === 'numeric' ? Math.abs(+resp - q.opts.num) <= q.opts.tol + 1e-12 && String(resp).trim() !== '' : +resp === q.answer) };
  const pd = () => LS.prog.d();
  const cstate = ch => { const d = pd(); d.cards[ch] = d.cards[ch] || { pos: {}, mark: {}, box: {}, due: {}, hist: [] }; return d.cards[ch]; };
  const save = () => LS.store.save();
  const chTitle = ch => (LS.curriculum.chapter(ch) || {}).title || ch;

  // ---------- library ----------
  function library(view) {
    const CU = LS.curriculum; const now = Date.now();
    view.innerHTML = `<section class="v2-page"><header class="v2-head"><p class="ls-kicker">${T('Flashcards', 'البطاقات')}</p><h1>${T('Structured decks, chapter by chapter', 'مجموعات منظمة حسب الفصل')}</h1><p class="ls-lead">${T('Every deck follows its chapter’s teaching order. Choose a chapter, then a study mode.', 'كل مجموعة تتبع ترتيب الفصل.')}</p></header>
      ${Object.entries(CU.SUBJ).map(([s, [name, col]]) => { const chs = CU.bySubject(s).flatMap(co => co.chapters); if (!chs.length) return ''; return `<section class="v2-sec" style="--sc:${col}"><h2 class="v2-h2">${name}</h2><ul class="v2-decks">${chs.map(ch => { const cs = cstate(ch.id), n = deck(ch.id).length, known = Object.values(cs.mark).filter(m => m === 'known').length, due = deck(ch.id).filter(c => cs.due[c.i] && cs.due[c.i] <= now).length; return `<li><a class="v2-deck" href="#/cards/${ch.id}"><b>${esc(ch.title)}</b><span>${n} ${T('cards', 'بطاقة')} · ${known} ${T('known', 'معروفة')}${due ? ` · <em>${due} ${T('due', 'مستحقة')}</em>` : ''}</span><i class="v2-bar"><i style="width:${n ? known / n * 100 : 0}%"></i></i></a></li>`; }).join('')}</ul></section>`; }).join('')}</section>`;
  }
  // ---------- study ----------
  /* v34: the card is a real 3D object. Flipping toggles a class on the SAME element (the old version re-rendered the card,
     so the CSS turn could never play); a flip in progress ignores further flips; moving between cards slides the old one
     out and the new one in. One keyboard listener per study screen, removed when the screen changes (mode switches used to
     stack listeners, so Space could flip twice and cancel itself). */
  let keyOff = null;
  function study(view, ch, mode) {
    if (keyOff) { keyOff(); keyOff = null; }
    const cards = deck(ch); if (!cards.length) { view.innerHTML = `<p class="ls-fb">${T('No deck for this chapter.', 'لا توجد مجموعة.')}</p>`; return; }
    mode = mode || 'learn'; const cs = cstate(ch), now = Date.now();
    let order = cards.map(c => c.i);
    if (mode === 'review') order = order.filter(i => cs.due[i] && cs.due[i] <= now);
    if (mode === 'apply') order = cards.filter(c => /application|reasoning|misconception|comparison/.test(c.type)).map(c => c.i);
    if (mode === 'mastery') order = order.filter(i => cs.mark[i] !== 'known').concat(order.filter(i => cs.mark[i] === 'known'));
    if (mode === 'difficult') order = order.filter(i => cs.mark[i] === 'unsure' || cs.mark[i] === 'practice');
    if (mode === 'shuffle') { order = order.slice(); for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; } }
    let pos = Math.min(cs.pos[mode] || 0, Math.max(0, order.length - 1)), flipped = false, turning = 0, moving = false;
    const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
    const FLIP_MS = 620, MOVE_MS = 280;
    const why = i => mode === 'review' ? T('Due for review — it is on the spaced schedule.', 'مستحقة للمراجعة.') : mode === 'mastery' ? (cs.mark[i] === 'known' ? T('Already known — a final check.', 'معروفة — فحص أخير.') : T('Not yet marked known.', 'لم تُعلّم بعد.')) : mode === 'apply' ? T('Application card: use the idea, not just recall it.', 'بطاقة تطبيق.') : mode === 'difficult' ? T('You marked this uncertain or needing practice.', 'علّمتها غير متأكد أو تحتاج تمريناً.') : mode === 'shuffle' ? T('Shuffled practice (optional mode).', 'خلط اختياري.') : T('Next in the chapter’s teaching order.', 'التالي في ترتيب الفصل.');
    const nDiff = cards.filter(c => cs.mark[c.i] === 'unsure' || cs.mark[c.i] === 'practice').length;
    const MODES = [['learn', T('Learn', 'تعلّم')], ['recall', T('Recall', 'استرجع')], ['review', T('Review due', 'راجع المستحق')], ['mastery', T('Chapter mastery', 'إتقان الفصل')], ['apply', T('Application', 'تطبيق')], ['difficult', T('Difficult', 'الصعبة') + (nDiff ? ` · ${nDiff}` : '')], ['shuffle', T('Shuffle (optional)', 'خلط (اختياري)')]];
    view.innerHTML = `<section class="v2-page fc"><header class="v2-head"><p class="ls-kicker"><a href="#/chapter/${ch}">${esc(chTitle(ch))}</a> · ${T('Flashcards', 'بطاقات')}</p><h1>${esc(chTitle(ch))}</h1></header>
      <nav class="fc__modes" aria-label="${T('Study mode', 'وضع الدراسة')}">${MODES.map(([k, l]) => `<a href="#/cards/${ch}/${k}" ${k === mode ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      <div class="fc__body"></div></section>`;
    const body = view.querySelector('.fc__body');
    const markName = { known: T('known', 'معروفة'), unsure: T('uncertain', 'غير متأكد'), practice: T('needs practice', 'تحتاج تمرين') };
    const strip = () => order.length <= 80 ? `<div class="fc__strip" aria-hidden="true">${order.map((i, k) => `<i class="${cs.mark[i] ? 'is-' + cs.mark[i] : ''} ${k === pos ? 'is-here' : ''}"></i>`).join('')}</div>` : '';
    const actions = () => `${!flipped ? `<button type="button" class="ls-btn ls-btn--accent" data-flip>${mode === 'recall' ? T('Reveal', 'اكشف') : T('Flip', 'اقلب')} <kbd>Space</kbd></button>` : `<span class="fc__marks" role="group" aria-label="${T('How well did you know it?', 'كم كنت تعرفها؟')}"><button type="button" class="ls-btn fc__m fc__m--k" data-mark="known">${T('Known', 'معروفة')} <kbd>1</kbd></button><button type="button" class="ls-btn fc__m fc__m--u" data-mark="unsure">${T('Uncertain', 'غير متأكد')} <kbd>2</kbd></button><button type="button" class="ls-btn fc__m fc__m--p" data-mark="practice">${T('Needs practice', 'تحتاج تمرين')} <kbd>3</kbd></button></span>`}<span class="fc__nav"><button type="button" class="ls-btn ls-btn--quiet" data-prev ${pos ? '' : 'disabled'} aria-label="${T('Previous card', 'السابقة')}">←</button><button type="button" class="ls-btn ls-btn--quiet" data-next aria-label="${T('Next card', 'التالية')}">→</button></span>`;
    const label = c0 => flipped ? T('Answer', 'الإجابة') + ': ' + c0.back + '. ' + T('Press to turn back.', 'اضغط للعودة.') : T('Question', 'السؤال') + ': ' + c0.front + '. ' + T('Press to flip.', 'اضغط للقلب.');
    function draw(enter) {
      if (!order.length) { body.innerHTML = `<div class="fc__done"><h2>${mode === 'review' ? T('Nothing is due right now', 'لا شيء مستحق الآن') : mode === 'difficult' ? T('No difficult cards', 'لا توجد بطاقات صعبة') : T('No cards in this mode', 'لا بطاقات')}</h2><p>${mode === 'review' ? T('Cards come back on their schedule. Learn new cards, or try chapter mastery.', 'تعود البطاقات حسب جدولها.') : mode === 'difficult' ? T('Cards you mark “uncertain” or “needs practice” collect here.', 'البطاقات التي تعلّمها تجمع هنا.') : ''}</p><a class="ls-btn ls-btn--accent" href="#/cards/${ch}/learn">${T('Learn mode', 'وضع التعلّم')}</a></div>`; return; }
      if (pos >= order.length) { const tally = k => cards.filter(c => cs.mark[c.i] === k).length, known = tally('known'), hard = cards.filter(c => cs.mark[c.i] && cs.mark[c.i] !== 'known');
        body.innerHTML = `<div class="fc__done" tabindex="-1"><h2>${T('Session complete', 'اكتملت الجلسة')}</h2><div class="fc__tally"><span><b>${known}</b> ${markName.known}</span><span><b>${tally('unsure')}</b> ${markName.unsure}</span><span><b>${tally('practice')}</b> ${markName.practice}</span><span><b>${cards.length - known - tally('unsure') - tally('practice')}</b> ${T('not marked', 'غير معلّمة')}</span></div>${mode === 'mastery' && known === cards.length ? '<p><b class="v28-ok">' + T('Chapter deck mastered.', 'أتقنت المجموعة.') + '</b></p>' : ''}<p>${T('To revisit', 'للمراجعة')}: ${hard.map(c => `<span class="fc__chip">${esc(c.front)}</span>`).join(' ') || '—'}</p><p>${hard.length ? `<a class="ls-btn ls-btn--accent" href="#/cards/${ch}/difficult">${T('Revisit difficult cards', 'راجع البطاقات الصعبة')} · ${hard.length}</a> ` : ''}<a class="ls-btn ${hard.length ? 'ls-btn--quiet' : 'ls-btn--accent'}" href="#/assess/${ch}">${T('Take the chapter check', 'خذ فحص الفصل')}</a> <button type="button" class="ls-btn ls-btn--quiet" data-again>${T('Start again', 'ابدأ من جديد')}</button></p></div>`; body.querySelector('.fc__done').focus({ preventScroll: true }); return; }
      const c0 = cards[order[pos]], mk = cs.mark[c0.i];
      body.innerHTML = `<p class="fc__meta"><b>${T('Card', 'بطاقة')} ${pos + 1} / ${order.length}</b> · <span class="fc__type fc__type--${c0.type}">${TYPES[c0.type] || c0.type}</span> · ${esc(why(c0.i))}${mk ? ` · ${T('last marked', 'آخر تعليم')}: <b>${markName[mk]}</b>` : ''}</p>
        <div class="fc__prog" aria-hidden="true"><i style="width:${(pos / order.length) * 100}%"></i></div>${strip()}
        <div class="fc3 ${enter && !still() ? 'is-enter-' + enter : ''}"><div class="fc3__lift"><button type="button" class="fc3__card fc__card" aria-label="${esc(label(c0))}"><span class="fc3__face fc3__front fc__front" aria-hidden="true"><small>${T('Question', 'السؤال')}</small><span>${IL(c0.front)}</span><em class="fc3__cue">${T('Tap, click or press Space to flip', 'اضغط للقلب')}</em></span><span class="fc3__face fc3__back" aria-hidden="true"><small>${T('Answer', 'الإجابة')}</small><span>${IL(c0.back)}</span></span></button></div></div>
        ${mode === 'recall' ? `<label class="fc__try">${T('Your answer first', 'إجابتك أولاً')}<textarea rows="2" data-try aria-label="${T('Type your answer', 'اكتب إجابتك')}"></textarea></label><p class="fc__yours" hidden></p>` : ''}
        <div class="fc__actions">${actions()}</div><p class="sr-only" role="status" aria-live="polite" data-said></p>`;
    }
    function flip() {
      const card = body.querySelector('.fc3__card'); if (!card || turning || moving) return;
      flipped = !flipped; const c0 = cards[order[pos]];
      card.classList.toggle('is-flipped', flipped); card.setAttribute('aria-label', label(c0));
      if (!still()) { card.classList.add('is-turning'); turning = setTimeout(() => { turning = 0; card.classList.remove('is-turning'); }, FLIP_MS); }
      if (mode === 'recall') { const t = body.querySelector('[data-try]'), y = body.querySelector('.fc__yours'); if (flipped && t) { const v = t.value.trim(); t.closest('label').hidden = true; if (v) { y.hidden = false; y.textContent = T('You wrote', 'كتبت') + ': “' + v + '”'; } } else if (t) { t.closest('label').hidden = false; y.hidden = true; } }
      body.querySelector('.fc__actions').innerHTML = actions();
      body.querySelector('[data-said]').textContent = flipped ? T('Answer', 'الإجابة') + ': ' + c0.back : T('Question', 'السؤال') + ': ' + c0.front;
      card.focus({ preventScroll: true });
    }
    function mark(m) { const c0 = cards[order[pos]], b = cs.box[c0.i] || 0, nb = m === 'known' ? Math.min(4, b + 1) : m === 'unsure' ? Math.max(1, b) : 0; cs.mark[c0.i] = m; cs.box[c0.i] = nb; cs.due[c0.i] = Date.now() + BOX[nb] * DAY + (nb === 0 ? 10 * 6e4 : 0); cs.hist.push([Date.now(), c0.i, m]); if (cs.hist.length > 400) cs.hist.shift(); go(1); }
    function go(d) {
      if (moving) return; const np = Math.max(0, Math.min(order.length, pos + d)); if (np === pos) return;
      const commit = () => { clearTimeout(turning); turning = 0; pos = np; flipped = false; cs.pos[mode] = Math.min(pos, order.length - 1); save(); draw(d > 0 ? 'next' : 'prev'); moving = false; const c = body.querySelector('.fc3__card'); if (c && (document.activeElement === document.body || body.contains(document.activeElement) || !document.activeElement)) c.focus({ preventScroll: true }); };
      const box = body.querySelector('.fc3'); if (!box || still()) return commit();
      moving = true; box.classList.add(d > 0 ? 'is-leave-next' : 'is-leave-prev'); setTimeout(commit, MOVE_MS - 40);
    }
    body.addEventListener('click', e => { if (e.target.closest('[data-flip], .fc3__card')) return flip(); const m = e.target.closest('[data-mark]'); if (m) return mark(m.dataset.mark); if (e.target.closest('[data-next]')) return go(1); if (e.target.closest('[data-prev]')) return go(-1); if (e.target.closest('[data-again]')) { pos = 0; cs.pos[mode] = 0; save(); draw(); } });
    const key = e => { if (!view.isConnected || !body.isConnected) return; if (e.defaultPrevented || e.target.closest('textarea, input, select, [role="dialog"]')) return; if ([...document.querySelectorAll('.ls-modal, [aria-modal="true"]')].some(m => m.getClientRects().length)) return; /* an open dialog (search palette, Noor) keeps its keys */
      if (e.key === ' ' || e.key === 'Enter') { if (e.target.closest('a, [data-mark], [data-next], [data-prev], [data-again], .fc__modes')) return; if (!body.querySelector('.fc3__card')) return; e.preventDefault(); if (!e.repeat) flip(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (flipped && /^[123]$/.test(e.key)) mark(['known', 'unsure', 'practice'][+e.key - 1]); };
    document.addEventListener('keydown', key); const offLeave = LS.on('leave', () => { if (keyOff) keyOff(); });
    keyOff = () => { document.removeEventListener('keydown', key); offLeave(); clearTimeout(turning); keyOff = null; };
    let tx = null, ty = null; body.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true }); body.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1); }, { passive: true });
    LS.__fc = { flipped: () => flipped, pos: () => pos, n: () => order.length, turning: () => !!turning, moving: () => moving };
    draw();
  }
  // ---------- assessment ----------
  /* v34: a question navigator (jump to any question; checked ones show ✓/✗, chosen-but-unchecked ones are marked), Previous,
     answers kept while moving around (a draft per question), a confirmation before finishing with unanswered questions
     (they count as incorrect — the score is always correct answers ÷ all questions), and a full review on the results. */
  function assess(view, ch) {
    const qs = quiz(ch), C0 = LS.curriculum.chapter(ch); if (!qs.length || !C0) { view.innerHTML = `<p class="ls-fb">${T('No assessment for this chapter.', 'لا يوجد تقييم.')}</p>`; return; }
    let i = 0, confirming = false; const res = [], draft = [];
    view.innerHTML = `<section class="v2-page as"><header class="v2-head"><p class="ls-kicker"><a href="#/chapter/${ch}">${esc(C0.title)}</a> · ${T('Chapter check', 'فحص الفصل')}</p><h1>${esc(C0.title)}: ${T('chapter check', 'فحص الفصل')}</h1><p class="ls-lead">${qs.length} ${T('questions linked to the chapter’s objectives. Answers are shown only after you try. Check each answer as you go; you can move between questions at any time. Mastery is 80 % or more.', 'أسئلة مرتبطة بالأهداف. الإجابات بعد المحاولة.')}</p></header><div class="as__body"></div></section>`;
    const body = view.querySelector('.as__body');
    const optText = (q, k) => q.kind === 'mcq' ? q.opts[k] : String(k);
    const nav = () => `<ol class="as__nav" aria-label="${T('Questions', 'الأسئلة')}">${qs.map((q, k) => `<li><button type="button" data-q="${k}" class="${res[k] ? (res[k].ok ? 'is-ok' : 'is-no') : draft[k] != null && draft[k] !== '' ? 'is-chosen' : ''}" ${k === i && !confirming ? 'aria-current="step"' : ''} aria-label="${T('Question', 'سؤال')} ${k + 1}${res[k] ? ', ' + (res[k].ok ? T('correct', 'صحيح') : T('incorrect', 'خطأ')) : draft[k] != null && draft[k] !== '' ? ', ' + T('answer chosen, not checked', 'إجابة مختارة') : ', ' + T('not answered', 'لم تُجب')}">${k + 1}</button></li>`).join('')}</ol>`;
    function draw(focus) {
      if (i >= qs.length) return summary(); const q = qs[i], obj = C0.objs[Math.min(q.obj, C0.objs.length - 1)], r = res[i];
      const flavour = (/^(Scenario|Predict|Error analysis|Transfer|Multi-step)/.exec(q.prompt) || [])[1], d = r ? r.resp : draft[i];
      body.innerHTML = `${nav()}<p class="fc__meta"><b>${T('Question', 'سؤال')} ${i + 1} / ${qs.length}</b>${flavour ? ` · <span class="fc__type">${flavour}</span>` : ''} · ${T('Objective', 'الهدف')}: ${esc(obj.text)} · ${res.filter(Boolean).length} ${T('checked', 'تم التحقق')}</p><div class="fc__prog" aria-hidden="true"><i style="width:${res.filter(Boolean).length / qs.length * 100}%"></i></div>
        <div class="as__stage"><fieldset class="as__q" ${r ? 'disabled' : ''}><legend>${IL(q.prompt.replace(/^(Scenario|Predict|Error analysis|Transfer|Multi-step): /, ''))}</legend>
        ${q.kind === 'mcq' ? q.opts.map((o, k) => `<label class="as__opt ${r ? (k === q.answer ? 'is-right' : r.resp === k ? 'is-wrong' : '') : ''}" data-right="${T('correct answer', 'الإجابة الصحيحة')}" data-wrong="${T('your answer', 'إجابتك')}"><input type="radio" name="as" value="${k}" ${d === k ? 'checked' : ''}><span>${IL(o)}</span></label>`).join('') : `<label class="as__num">${T('Your answer', 'إجابتك')} <input type="text" inputmode="decimal" data-num value="${d != null ? esc(String(d)) : ''}" aria-label="${T('Numeric answer', 'إجابة رقمية')}">${q.opts.unit ? ` <span>${esc(q.opts.unit)}</span>` : ''}</label>`}</fieldset>
        ${r ? `<div class="as__fb ${r.ok ? 'is-ok' : 'is-no'}" role="status"><b>${r.ok ? '✓ ' + T('Correct.', 'صحيح.') : '✗ ' + T('Not quite.', 'ليس تماماً.')}</b> ${!r.ok && q.kind === 'numeric' ? `<p>${T('Expected', 'المتوقع')}: ${esc(String(q.opts.num))}${q.opts.unit ? ' ' + esc(q.opts.unit) : ''}</p>` : ''}${!r.ok && q.kind === 'mcq' && q.mis[r.resp] ? `<p>${T('Likely misconception', 'فكرة خاطئة محتملة')}: ${IL(q.mis[r.resp])}</p>` : ''}<p>${IL(q.explain)}</p>${!r.ok ? `<p>${T('Review', 'راجع')}: ${C0.items.slice(0, 2).map(it => `<a href="${LS.curriculum.itemHref(it)}">${esc(LS.curriculum.itemTitle(it))}</a>`).join(' · ')} · <a href="#/cards/${ch}/apply">${T('application cards', 'بطاقات التطبيق')}</a></p>` : ''}</div>` : ''}
        ${confirming ? confirmBox() : `<div class="as__row"><button type="button" class="ls-btn ls-btn--quiet" data-prevq ${i ? '' : 'disabled'}>← ${T('Previous', 'السابق')}</button><span class="as__sp"></span>${r ? '' : `<button type="button" class="ls-btn ${d != null && d !== '' ? 'ls-btn--accent' : 'ls-btn--quiet'}" data-check>${T('Check my answer', 'تحقق')}</button>`}${r || i + 1 < qs.length ? `<button type="button" class="ls-btn ${r ? 'ls-btn--accent' : 'ls-btn--quiet'}" data-go>${i + 1 < qs.length ? (r ? T('Next question', 'السؤال التالي') : T('Skip for now', 'تخطَّ الآن')) : T('See results', 'النتائج')} →</button>` : ''}${!r && i + 1 === qs.length ? `<button type="button" class="ls-btn ls-btn--quiet" data-go>${T('See results', 'النتائج')} →</button>` : ''}</div>`}</div>`;
      if (focus !== false) { const f = confirming ? body.querySelector('.as__confirm [data-finish]') : (r ? body.querySelector('[data-go], [data-prevq]') : body.querySelector('input:checked, input')); f && f.focus({ preventScroll: true }); }
    }
    const unanswered = () => qs.filter((q, k) => !res[k]).length;
    const confirmBox = () => `<div class="as__confirm" role="alertdialog" aria-labelledby="asCf"><p id="asCf"><b>${unanswered()} ${unanswered() === 1 ? T('question is', 'سؤال') : T('questions are', 'أسئلة')} ${T('not checked yet.', 'لم يُتحقق منها.')}</b> ${T('If you finish now they count as incorrect.', 'إذا أنهيت الآن تُحسب خاطئة.')}</p><div class="as__row"><button type="button" class="ls-btn ls-btn--accent" data-firstopen>${T('Go to the first one', 'اذهب إلى الأول')}</button><button type="button" class="ls-btn ls-btn--quiet" data-finish>${T('Finish anyway', 'أنهِ على أي حال')}</button></div></div>`;
    function summary() { confirming = false; const score = res.filter(r => r && r.ok).length / qs.length, d = pd(); const prev = d.assess[ch] || { best: 0, tries: 0 }; d.assess[ch] = { best: Math.max(prev.best, score), last: score, tries: prev.tries + 1, at: Date.now() }; save();
      const byObj = C0.objs.map((o, k) => { const mine = qs.filter(q => Math.min(q.obj, C0.objs.length - 1) === k); return [o, mine.filter(q => res[q.i] && res[q.i].ok).length, mine.length]; }).filter(x => x[2]);
      body.innerHTML = `<div class="fc__done" tabindex="-1"><div class="as__score" style="--p:${Math.round(score * 100)}"><span>${Math.round(score * 100)} %</span></div><h2>${score >= 0.8 ? '<span class="v28-ok">' + T('Mastery reached', 'تحقق الإتقان') + '</span>' : T('Keep going', 'تابع')}</h2><p>${res.filter(r => r && r.ok).length} / ${qs.length} ${T('correct', 'صحيحة')}${unanswered() ? ` · ${unanswered()} ${T('not answered', 'لم تُجب')}` : ''}</p><ul class="as__objs">${byObj.map(([o, a, n]) => `<li>${a === n ? '<span class="v28-ok">✓</span>' : '<span class="v28-todo">○</span>'} ${esc(o.text)} — ${a}/${n}</li>`).join('')}</ul><p>${score >= 0.8 ? T('Next', 'التالي') + (C0.next ? `: <a href="#/chapter/${C0.next}">${esc(chTitle(C0.next))}</a>` : ': ' + T('explore the Knowledge Map', 'استكشف خريطة المعرفة')) : T('Revisit the objectives marked ○ with the experiences and application cards, then try again.', 'راجع الأهداف ثم أعد المحاولة.')}</p><p><button type="button" class="ls-btn ls-btn--quiet" data-retry>${T('Try again', 'أعد المحاولة')}</button> <a class="ls-btn ls-btn--quiet" href="#/chapter/${ch}">${T('Back to the chapter', 'العودة للفصل')}</a></p>
        <details class="as__rev"><summary>${T('Review every question', 'راجع كل الأسئلة')}</summary><ol class="as__review">${qs.map((q, k) => { const r = res[k]; return `<li><b>${r ? (r.ok ? '✓' : '✗') : '—'} ${IL(q.prompt.replace(/^(Scenario|Predict|Error analysis|Transfer|Multi-step): /, ''))}</b>${T('Your answer', 'إجابتك')}: ${r ? IL(optText(q, r.resp)) : T('not answered', 'لم تُجب')} · ${T('Correct', 'الصحيح')}: ${q.kind === 'mcq' ? IL(q.opts[q.answer]) : esc(String(q.opts.num)) + (q.opts.unit ? ' ' + esc(q.opts.unit) : '')}</li>`; }).join('')}</ol></details></div>`;
      body.querySelector('.fc__done').focus({ preventScroll: true }); }
    const keepDraft = () => { const q = qs[i]; if (!q || res[i]) return; if (q.kind === 'mcq') { const c0 = body.querySelector('input[name="as"]:checked'); draft[i] = c0 ? +c0.value : draft[i]; } else { const n = body.querySelector('[data-num]'); if (n) draft[i] = n.value; } };
    const goTo = k => { keepDraft(); confirming = false; i = k; draw(); };
    body.addEventListener('change', e => { if (e.target.matches('input[name="as"]')) { keepDraft(); const nb = body.querySelector('.as__nav'); if (nb) nb.outerHTML = nav(); const c = body.querySelector('[data-check]'); c && c.classList.replace('ls-btn--quiet', 'ls-btn--accent'); } });
    body.addEventListener('input', e => { if (e.target.matches('[data-num]')) keepDraft(); });
    body.addEventListener('click', e => {
      const qb = e.target.closest('[data-q]'); if (qb) return goTo(+qb.dataset.q);
      if (e.target.closest('[data-check]')) { const q = qs[i]; let resp; body.querySelector('.as__need') && body.querySelector('.as__need').remove(); if (q.kind === 'mcq') { const c0 = body.querySelector('input[name="as"]:checked'); if (!c0) { body.querySelector('legend').insertAdjacentHTML('afterend', `<p class="as__need" role="alert">${T('Choose an answer first.', 'اختر إجابة أولاً.')}</p>`); return; } resp = +c0.value; } else { resp = body.querySelector('[data-num]').value.trim().replace(',', '.'); if (resp === '' || isNaN(+resp)) { body.querySelector('[data-num]').setAttribute('aria-invalid', 'true'); return; } }
        res[i] = { resp, ok: LS.assess.grade(q, resp) }; draw(); return; }
      if (e.target.closest('[data-prevq]')) return goTo(Math.max(0, i - 1));
      if (e.target.closest('[data-go]')) { keepDraft(); if (i + 1 < qs.length) { i++; draw(); } else if (unanswered()) { confirming = true; draw(); } else { i = qs.length; draw(); } return; }
      if (e.target.closest('[data-firstopen]')) return goTo(qs.findIndex((q, k) => !res[k]));
      if (e.target.closest('[data-finish]')) { i = qs.length; draw(); return; }
      if (e.target.closest('[data-retry]')) { i = 0; res.length = 0; draft.length = 0; draw(); } });
    body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-num]')) { e.preventDefault(); body.querySelector('[data-check]') && body.querySelector('[data-check]').click(); } });
    LS.__as = { res: () => res.slice(), draft: () => draft.slice(), i: () => i };
    draw(false);
  }
  LS.route('cards', (view, parts) => (parts[0] ? study(view, parts[0], parts[1]) : library(view)));
  LS.route('assess', (view, parts) => assess(view, parts[0]));
})();
