/* ERLY Learning Studio — Noor, in context.

   Students select something (a passage, an equation, a diagram, a wrong answer, a model, a video section)
   and ask Noor about it. This module turns that into ONE focused request for Noor's existing companion
   (assets/js/companion/ui.js), which already handles providers, consent, usage limits and offline fallback.

   Context is minimal by design: the lesson title and section, the selected text (≤ 1,200 characters) and, for
   a mistake, the question and the student's own submitted answer. It never includes the learning history,
   the profile, notes, other answers or insights. Where the request goes (device-only brain, or the online
   AI the student has agreed to) is shown before and after asking — the label comes from the companion itself.

   Pedagogy: every prompt asks Noor to help the student understand, not to hand over answers — e.g. a mistake
   request asks for the misconception and a hint, and step-by-step teaching asks the student to try each step. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T;
  const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const PROMPTS = {
    explain: c => `Explain this clearly, at my level, in a few short paragraphs: “${c.text}”`,
    simplify: c => `Explain this in simpler words, as if I am meeting it for the first time. Use an everyday comparison if it helps: “${c.text}”`,
    steps: c => `Teach me this step by step. Show one step, then ask me to try the next one myself before you continue: “${c.text}”`,
    example: c => `Give me one more worked example of this idea, different from the one in my lesson: “${c.text}”`,
    compare: c => `Compare ${c.a} and ${c.b}: what they have in common, how they differ, and one way to tell them apart.`,
    practice: c => `Write three practice questions on “${c.text}” for my level. Do not give the answers yet — I will try them first.`,
    notes: c => `Turn this into short revision notes (bullet points, key terms in bold): “${c.text}”`,
    mistake: c => `I got this question wrong and I want to understand why — please don't just give me the answer. Question: “${c.q}” My answer: “${c.answer}”. What misconception might lead to my answer, and what hint would help me get it right myself?`,
    diagram: c => `Help me understand this diagram — what each part represents and how the parts connect: ${c.text}`,
    model: c => `I'm using an interactive model of “${c.text}” in my lesson. What does it show, which settings should I try changing, and what should I notice?`,
    summary: c => `Summarise this part of a video lesson in three or four bullet points: “${c.text}”`,
    plan: c => `Help me plan my revision. ${c.text}`,
    activity: c => `Suggest one short learning activity (10–15 minutes) to help me understand “${c.text}”.`
  };
  const LABELS = { explain: 'Explain this', simplify: 'Simplify this', steps: 'Teach me step by step', example: 'Give another example', compare: 'Compare concepts', practice: 'Generate practice questions', notes: 'Create revision notes', mistake: 'Explain my mistake', diagram: 'Help me understand the diagram', model: 'Explain this model', summary: 'Summarise this section', plan: 'Help me plan revision', activity: 'Suggest a learning activity' };

  const C = () => window.ERLY && ERLY.companion;
  function where() {
    const ai = C() && C().ai; if (!ai) return { ok: !!C(), label: T('Noor’s built-in brain (on this device)', 'عقل نور المدمج'), online: false };
    const l = ai.label(), s = ai.state(); return { ok: true, label: I18N && I18N.lang === 'ar' ? l.ar : l.en, online: s.tier === 'online' && ai.ready() };
  }
  // the exact context object Noor receives (shown to the student in the Noor Tutor page)
  function contextFor(kind, c) {
    const L = c.lesson;
    const ctx = { title: L ? L.title : (c.title || 'Learning Studio'), course: L ? L.subject + (L.course ? ' · ' + L.course : '') : '', page: c.section || (L ? L.topic : ''), heading: c.section || '', quote: '', text: '', uploaded: false, from: 'learning-studio' };
    if (kind === 'mistake') { ctx.quote = clip(c.q && LS.plain(c.q.prompt), 600); ctx.text = clip(`Question: ${LS.plain(c.q.prompt)} · My answer: ${c.answer}`, 1200); }
    else { ctx.quote = clip(c.text, 1200); ctx.text = ctx.quote; }
    return ctx;
  }
  LS.noor = {
    LABELS, where,
    lastSent: null,
    ask(kind, c) {
      c = c || {};
      if (kind === 'mistake') c = Object.assign({}, c, { q: LS.plain(c.q.prompt) ? c.q : c.q, lesson: c.lesson || LS.lesson(c.q.lesson) });
      const text = kind === 'mistake' ? PROMPTS.mistake({ q: clip(LS.plain(c.q.prompt), 600), answer: clip(c.answer, 300) }) : kind === 'compare' ? PROMPTS.compare(c) : kind === 'model' ? PROMPTS.model({ text: modelTitle(c.engine) }) : PROMPTS[kind]({ text: clip(c.text, 1200) });
      const ctx = contextFor(kind, Object.assign({}, c, kind === 'model' ? { text: modelTitle(c.engine) } : {}));
      LS.noor.lastSent = { at: Date.now(), kind, label: LABELS[kind], prompt: text, context: ctx };
      if (!C() || !C().ask) { LS.dialog(`<h2 id="lsDlgT">${T('Noor is not available here', 'نور غير متاحة هنا')}</h2><p>${T('Noor could not load on this page. Your request was not sent anywhere.', 'لم يُرسل طلبك.')}</p><button class="ls-btn" data-close type="button">OK</button>`); return; }
      const w = where(); LS.toast((w.online ? T('Asking Noor online — ', 'أسأل نور عبر الإنترنت — ') : T('Asking Noor on this device — ', 'أسأل نور على هذا الجهاز — ')) + w.label);
      C().ask(text, { context: ctx });
      LS.store.touch('noor', kind, LABELS[kind]);
    }
  };
  function modelTitle(id) { const e = window.ERLY_LAB && ERLY_LAB.engines.find(x => x.id === id); return e ? (e.title || e.id) : id; }

  /* ---------- the selection toolbar: select text anywhere marked data-ls-sel ---------- */
  const bar = document.createElement('div');
  bar.className = 'ls-selbar'; bar.hidden = true; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', T('Selected text', 'النص المحدد'));
  bar.innerHTML = ['explain', 'simplify', 'steps', 'example'].map(k => `<button type="button" data-sk="${k}">${esc(T(LABELS[k], LABELS[k]))}</button>`).join('') + `<button type="button" data-sk="note">${T('Save to notebook', 'احفظ')}</button><button type="button" data-sk="card">${T('Make a flashcard', 'بطاقة')}</button>`;
  let selNow = null;
  function onSel() {
    const s = getSelection(); if (!s || s.isCollapsed) { if (!bar.contains(document.activeElement)) hide(); return; }
    const txt = s.toString().trim(); const node = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement);
    const zone = node && node.closest('[data-ls-sel]'); if (!zone || txt.length < 3) { hide(); return; }
    const art = zone.closest('[data-lesson]'), L = art ? LS.lesson(art.dataset.lesson) : null;
    const h1 = document.querySelector('#lsView h1');
    selNow = { text: txt.slice(0, 1200), lesson: L, section: h1 ? h1.textContent : '', where: location.hash, srcTitle: L ? L.title : (zone.dataset.srcTitle || document.title) };
    if (!bar.isConnected) document.body.appendChild(bar);
    const r = s.getRangeAt(0).getBoundingClientRect(); bar.hidden = false;
    const bw = bar.offsetWidth || 320; bar.style.left = Math.max(8, Math.min(innerWidth - bw - 8, r.left + r.width / 2 - bw / 2)) + 'px'; bar.style.top = Math.max(8, r.top - 52 + scrollY) + 'px';
  }
  function hide() { bar.hidden = true; selNow = null; }
  document.addEventListener('selectionchange', () => { clearTimeout(onSel.t); onSel.t = setTimeout(onSel, 180); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !bar.hidden) hide(); });
  bar.addEventListener('mousedown', e => e.preventDefault()); // keep the selection while clicking
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-sk]'); if (!b || !selNow) return; const k = b.dataset.sk, s = selNow; hide(); getSelection().removeAllRanges();
    if (k === 'note') return LS.notes.quick({ title: (s.lesson ? s.lesson.topic : 'Note') + ': ' + s.text.slice(0, 50), html: `<blockquote>${esc(s.text)}</blockquote><p></p>`, src: { type: s.lesson ? 'lesson' : 'page', id: s.lesson ? s.lesson.id : '', title: s.srcTitle, where: s.where } });
    if (k === 'card') return LS.cards.quickEdit({ front: '', back: s.text, topic: s.lesson ? s.lesson.topic : '', src: { type: s.lesson ? 'lesson' : 'page', id: s.lesson ? s.lesson.id : '', title: s.srcTitle } });
    LS.noor.ask(k, s);
  });
})();
