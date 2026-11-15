/* ERLY Learning Studio — Flashcards & Revision.
   Cards come from lessons (suggested, added by the student), from the student's own mistakes (on request),
   from text selected anywhere, or are written by hand. Reviews use the transparent schedule in ls-srs.js: each
   card says why it is showing now and what each button will do to its next review date. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store, S = LS.srs, IL = LS.inline;
  const KINDS = { qa: 'Question', definition: 'Definition', formula: 'Formula', diagram: 'Diagram' };

  function add(c) {
    const now = Date.now(), d = st.data();
    if (Object.values(d.cards).some(x => x.front === c.front && x.back === c.back)) return null;
    const id = LS.uid('c');
    d.cards[id] = Object.assign(S.fresh(now), { id, front: String(c.front).slice(0, 400), back: String(c.back).slice(0, 800), kind: KINDS[c.kind] ? c.kind : 'qa', fig: c.fig && LS.fig[c.fig] ? c.fig : null, topic: c.topic || 'General', src: c.src || null, created: now });
    st.save(); st.emit('change', 'card'); return id;
  }
  LS.cards = {
    add,
    addMany(list) { let n = 0; list.forEach(c => { if (add(c)) n++; }); return n; },
    quick(c) { const id = add(c); LS.toast(id ? T('Flashcard added to your revision.', 'أُضيفت البطاقة.') : T('That card is already in your revision.', 'البطاقة موجودة.')); return id; },
    quickEdit(c) { editDialog(Object.assign({ kind: 'qa' }, c), v => { if (add(v)) LS.toast(T('Flashcard added.', 'أُضيفت البطاقة.')); }); },
    all: () => Object.values(st.data().cards)
  };

  function editDialog(c, done) {
    const d = LS.dialog(`<h2 id="lsDlgT">${c.id ? T('Edit flashcard', 'عدّل البطاقة') : T('New flashcard', 'بطاقة جديدة')}</h2>
      <label class="ls-field">${T('Front (question or term)', 'الوجه (سؤال أو مصطلح)')}<textarea name="f" rows="2" required>${esc(c.front || '')}</textarea></label>
      <label class="ls-field">${T('Back (answer)', 'الخلف (الجواب)')}<textarea name="b" rows="3" required>${esc(c.back || '')}</textarea></label>
      <div class="ls-row"><label class="ls-field">${T('Type', 'النوع')}<select name="k">${Object.entries(KINDS).filter(([k]) => k !== 'diagram' || c.fig).map(([k, v]) => `<option value="${k}" ${k === c.kind ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="ls-field">${T('Collection (topic)', 'المجموعة')}<input name="t" value="${esc(c.topic || '')}" list="lsTopics"><datalist id="lsTopics">${[...new Set(LS.cards.all().map(x => x.topic).concat(LS.topics().map(x => x.topic)))].map(t => `<option value="${esc(t)}">`).join('')}</datalist></label></div>
      <p class="ls-err-msg" role="alert" hidden></p>
      <div class="ls-row"><button type="button" class="ls-btn ls-btn--accent" data-ok>${T('Save card', 'احفظ')}</button><button type="button" class="ls-btn ls-btn--quiet" data-close>${T('Cancel', 'إلغاء')}</button></div>`);
    d.el.querySelector('[data-ok]').onclick = () => { const f = d.el.querySelector('[name=f]').value.trim(), b = d.el.querySelector('[name=b]').value.trim(); if (!f || !b) { const m = d.el.querySelector('.ls-err-msg'); m.hidden = false; m.textContent = T('Both sides need some text.', 'يحتاج الوجهان إلى نص.'); return; } done({ id: c.id, front: f, back: b, kind: d.el.querySelector('[name=k]').value, topic: d.el.querySelector('[name=t]').value.trim() || 'General', src: c.src, fig: c.fig }); d.close(); };
  }

  function page(view, parts) {
    if (parts[0] === 'session') return session(view, parts[1] || 'due');
    const now = Date.now(), cards = LS.cards.all(), due = S.queue(cards, now, { newLimit: 999 });
    const topics = {}; cards.forEach(c => { (topics[c.topic] = topics[c.topic] || []).push(c); });
    const filt = LS._rvf || 'all';
    const shown = (filt === 'all' ? cards : cards.filter(c => c.topic === filt)).sort((a, b) => (a.due || 0) - (b.due || 0));
    const mist = Object.values(st.data().mistakes).filter(m => !m.laterCorrect);
    const lessonsWithCards = LS.lessons.filter(L => (L.cards || []).some(c => !cards.some(x => x.front === c.front)));
    view.innerHTML = `<div class="ls-rv"><header class="ls-pagehead"><p class="ls-kicker">${T('Flashcards & Revision', 'البطاقات والمراجعة')}</p><h1>${due.length ? `${due.length} ${T('card(s) due now', 'بطاقة مستحقة الآن')}` : cards.length ? T('Nothing due right now', 'لا شيء مستحق الآن') : T('Build your revision deck', 'ابنِ مجموعة المراجعة')}</h1>
      <p class="ls-lead">${T('Cards come back on a spacing schedule: sooner when something was hard, later when it was easy. Each card shows why it is due.', 'تعود البطاقات وفق جدول تباعد.')}</p>
      <div class="ls-row">${due.length ? `<a class="ls-btn ls-btn--accent" href="#/revise/session/due">${T('Start revision', 'ابدأ المراجعة')} (${due.length})</a>` : ''}${cards.length ? `<a class="ls-btn" href="#/revise/session/all">${T('Practise all cards now', 'تدرّب على الكل')}</a>` : ''}<button type="button" class="ls-btn ls-btn--quiet" data-newcard>+ ${T('New card', 'بطاقة جديدة')}</button>${mist.length ? `<button type="button" class="ls-btn ls-btn--quiet" data-frommist>${T('Make cards from my mistakes', 'بطاقات من أخطائي')} (${mist.length})</button>` : ''}</div></header>
      ${lessonsWithCards.length ? `<section class="ls-panel"><h2 class="ls-h2">${T('Suggested from your lessons', 'مقترحة من دروسك')}</h2><ul class="ls-sugg">${lessonsWithCards.map(L => `<li><span><b>${esc(L.title)}</b> · ${(L.cards || []).filter(c => !cards.some(x => x.front === c.front)).length} ${T('cards', 'بطاقات')}</span><button type="button" class="ls-btn ls-btn--sm" data-addl="${L.id}">${T('Add', 'أضف')}</button></li>`).join('')}</ul></section>` : ''}
      ${cards.length ? `<section class="ls-panel"><div class="ls-row ls-row--between"><h2 class="ls-h2">${T('Your cards', 'بطاقاتك')} (${cards.length})</h2><label>${T('Collection', 'المجموعة')} <select data-rvf><option value="all">${T('All', 'الكل')}</option>${Object.keys(topics).map(t => `<option ${t === filt ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label></div>
        <div class="ls-tablewrap"><table class="ls-table"><caption class="sr-only">${T('Flashcards', 'البطاقات')}</caption><thead><tr><th scope="col">${T('Front', 'الوجه')}</th><th scope="col">${T('Collection', 'المجموعة')}</th><th scope="col">${T('Next review', 'المراجعة القادمة')}</th><th scope="col">${T('Status', 'الحالة')}</th><th scope="col"><span class="sr-only">${T('Actions', 'إجراءات')}</span></th></tr></thead><tbody>${shown.map(c => `<tr><td>${esc(c.front)}<br><small class="ls-muted">${esc(KINDS[c.kind])}${c.src ? ' · ' + esc(c.src.title || '') : ''}</small></td><td>${esc(c.topic)}</td><td>${S.isDue(c, now) ? `<b>${T('due', 'مستحقة')}</b>` : LS.fmtDate(c.due)}</td><td><small>${esc(S.strength(c).label)}</small></td><td class="ls-nowrap"><button type="button" class="ls-ic" data-edit="${c.id}" aria-label="${T('Edit card', 'عدّل')}: ${esc(c.front)}">✎</button><button type="button" class="ls-ic" data-delc="${c.id}" aria-label="${T('Delete card', 'احذف')}: ${esc(c.front)}">×</button></td></tr>`).join('')}</tbody></table></div></section>` : `<section class="ls-empty"><p>${T('No cards yet. Add the suggested cards from a lesson, select any text and choose “Make a flashcard”, or write your own.', 'لا بطاقات بعد.')}</p></section>`}
      <details class="ls-panel ls-how"><summary>${T('How the schedule works', 'كيف يعمل الجدول')}</summary><ul><li><b>${T('Again', 'مجدداً')}</b>: ${T('back in 10 minutes; the gap restarts.', 'تعود بعد ١٠ دقائق.')}</li><li><b>${T('Hard', 'صعبة')}</b>: ${T('the gap grows a little (×1.2).', 'تزداد الفجوة قليلاً.')}</li><li><b>${T('Good', 'جيدة')}</b>: ${T('the gap grows by the card’s ease (about ×2.5).', 'تزداد الفجوة بمعامل السهولة.')}</li><li><b>${T('Easy', 'سهلة')}</b>: ${T('the gap grows faster and the card becomes easier.', 'تزداد أسرع.')}</li></ul><p>${T('A card is only called “well remembered” after at least three successful reviews on two different days with a gap of a week or more. One right answer is never treated as mastery.', 'لا يُعتبر إتقاناً بعد إجابة واحدة.')}</p></details></div>`;
    const rv = view.querySelector('.ls-rv');
    rv.addEventListener('change', e => { if (e.target.matches('[data-rvf]')) { LS._rvf = e.target.value; LS.render(); } });
    rv.addEventListener('click', e => {
      if (e.target.closest('[data-newcard]')) return editDialog({ kind: 'qa', topic: filt !== 'all' ? filt : '' }, v => { add(v); LS.render(); });
      const al = e.target.closest('[data-addl]'); if (al) { const L = LS.lesson(al.dataset.addl); const n = LS.cards.addMany(L.cards.map(c => Object.assign({ topic: L.topic, src: { type: 'lesson', id: L.id, title: L.title } }, c))); LS.toast(`${n} ${T('cards added.', 'بطاقات أُضيفت.')}`); LS.render(); return; }
      if (e.target.closest('[data-frommist]')) { const bank = LS.bank(); const n = LS.cards.addMany(mist.map(m => { const q = bank.find(x => x.id === m.qid); return q && { front: LS.plain(q.prompt), back: LS.plain(q.correctText || q.explain), topic: q.topic || 'Mistakes', src: { type: 'mistake', id: q.id, title: q.lessonTitle || '' } }; }).filter(Boolean)); LS.toast(`${n} ${T('cards made from your mistakes.', 'بطاقات من أخطائك.')}`); LS.render(); return; }
      const ed = e.target.closest('[data-edit]'); if (ed) { const c = st.data().cards[ed.dataset.edit]; return editDialog(c, v => { st.update(d => Object.assign(d.cards[c.id], { front: v.front, back: v.back, kind: v.kind, topic: v.topic })); LS.render(); }); }
      const dl = e.target.closest('[data-delc]'); if (dl) { const keep = st.data().cards[dl.dataset.delc]; st.update(d => { delete d.cards[keep.id]; }); LS.render(); LS.toast(T('Card deleted.', 'حُذفت البطاقة.'), { undo: () => { st.update(d => { d.cards[keep.id] = keep; }); LS.render(); } }); }
    });
  }

  function session(view, which) {
    const now = Date.now(); let list = which === 'all' ? LS.cards.all().slice().sort(() => Math.random() - 0.5) : S.queue(LS.cards.all(), now);
    let i = 0, flipped = false, tally = { again: 0, hard: 0, good: 0, easy: 0 };
    function draw() {
      if (i >= list.length) { view.innerHTML = `<section class="ls-empty"><h1>${T('Session complete', 'انتهت الجلسة')}</h1><p>${T('Again', 'مجدداً')} ${tally.again} · ${T('Hard', 'صعبة')} ${tally.hard} · ${T('Good', 'جيدة')} ${tally.good} · ${T('Easy', 'سهلة')} ${tally.easy}</p><p class="ls-muted">${T('Cards you found hard will come back sooner.', 'البطاقات الصعبة ستعود أسرع.')}</p><a class="ls-btn ls-btn--accent" href="#/revise">${T('Back to revision', 'العودة')}</a></section>`; const h = view.querySelector('h1'); h.tabIndex = -1; h.focus(); return; }
      const c = st.data().cards[list[i].id] || list[i], pv = S.preview(c, Date.now());
      view.innerHTML = `<section class="ls-review" aria-labelledby="lsRvH"><p class="ls-kicker">${T('Card', 'بطاقة')} ${i + 1} / ${list.length} · ${esc(c.topic)}</p><h1 id="lsRvH" class="sr-only">${T('Revision session', 'جلسة مراجعة')}</h1>
        <p class="ls-why">${esc(S.why(c, Date.now()))}</p>
        <div class="ls-flash ${flipped ? 'is-flipped' : ''}"><div class="ls-flash__f">${c.fig ? `<div class="ls-flash__fig">${LS.fig[c.fig]}</div>` : ''}<p>${IL(c.front)}</p></div>${flipped ? `<div class="ls-flash__b" aria-live="polite"><p>${IL(c.back)}</p></div>` : ''}</div>
        ${flipped ? `<div class="ls-grades" role="group" aria-label="${T('How well did you remember it?', 'كم تذكرتها؟')}">${S.GRADES.map(g => `<button type="button" class="ls-btn ls-grade ls-grade--${g}" data-g="${g}"><b>${{ again: T('Again', 'مجدداً'), hard: T('Hard', 'صعبة'), good: T('Good', 'جيدة'), easy: T('Easy', 'سهلة') }[g]}</b><small>${esc(pv[g])}</small></button>`).join('')}</div><p class="ls-muted ls-small">${T('Keys: 1 Again · 2 Hard · 3 Good · 4 Easy', 'المفاتيح: ١–٤')}</p>` : `<button type="button" class="ls-btn ls-btn--accent" data-flip>${T('Show answer', 'أظهر الجواب')}</button><p class="ls-muted ls-small">${T('Try to recall it first. Space or Enter to flip.', 'حاول التذكر أولاً.')}</p>`}
        <p><a href="#/revise" class="ls-linkbtn">${T('End session', 'أنهِ الجلسة')}</a></p></section>`;
      const f = view.querySelector(flipped ? '[data-g="good"]' : '[data-flip]'); if (f) f.focus();
    }
    function grade(g) { const c = st.data().cards[list[i].id]; if (c) { const r = S.review(c, g, Date.now()); st.update(d => { d.cards[c.id] = r; }); } tally[g]++; if (g === 'again' && which !== 'all') list.push(list[i]); i++; flipped = false; draw(); }
    view.onclick = e => { if (e.target.closest('[data-flip]')) { flipped = true; draw(); } const g = e.target.closest('[data-g]'); if (g) grade(g.dataset.g); };
    const key = e => { if (!view.querySelector('.ls-review')) { removeEventListener('keydown', key); return; } if (!flipped && (e.key === ' ' || e.key === 'Enter') && e.target.tagName !== 'A') { e.preventDefault(); flipped = true; draw(); } else if (flipped && /^[1-4]$/.test(e.key)) grade(S.GRADES[+e.key - 1]); };
    addEventListener('keydown', key); const off = LS.on('leave', () => { removeEventListener('keydown', key); off(); });
    if (!list.length) { view.innerHTML = `<section class="ls-empty"><h1>${T('Nothing to review', 'لا شيء للمراجعة')}</h1><a class="ls-btn" href="#/revise">${T('Back', 'العودة')}</a></section>`; return; }
    draw();
  }
  LS.route('revise', page);
})();
