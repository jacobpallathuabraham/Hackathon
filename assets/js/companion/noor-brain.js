/* ERLY — Noor's "brain": knowledgeable chat, the structured interview,
   the My-profile tab and the proactive / video check-ins.

   Loaded after ui.js and uses its chat surface (ERLY.companion._ui).
   - Free text → knowledge.js answers (or, with consent, an external model
     grounded on the same knowledge), with crisis safety first.
   - "Could this be me?" → interview.js asks specialist-style questions one
     at a time (chips, typing or voice) and gives an honest evidence level,
     combined with what the analyser observed.
   - The analyser and videos.js raise gentle, dismissible notices; saying
     yes opens a conversation, never a verdict. */
(function () {
  'use strict';
  const C = ERLY.companion;
  if (!C || !C._ui || !window.ERLY_KB || !window.ERLY_INTERVIEW) return;
  const U = C._ui, K = window.ERLY_KB, IV = window.ERLY_INTERVIEW, EV = window.ERLY_EVIDENCE;
  const { aiSays, bubble, chipRow, clearChips, pick, esc, T } = U;
  const lang = U.lang;
  let iv = null, ivSource = null;
  const history = []; // short chat memory for the external model (text only, never stored)
  const results = () => (ERLY.analyser ? ERLY.analyser.interviews() : {});
  const LEVEL = { strong: ['A clear pattern', 'نمط واضح'], some: ['Some signs', 'بعض العلامات'], low: ['Few signs', 'علامات قليلة'], unclear: ['Not enough to say', 'لا يكفي للحكم'] };
  const EVL = { none: ['Nothing noticed', 'لم يُلاحظ شيء'], early: ['Early sign', 'إشارة أولية'], some: ['Some evidence', 'بعض الدلائل'], strong: ['Stronger evidence', 'دلائل أقوى'] };
  const AREA_NAME = EV ? EV.AREAS : {};

  const html = text => esc(text).replace(/\n• /g, '<br>• ').replace(/\n/g, '<br><br>');
  async function say(en, ar, o = {}) { return aiSays(en, ar, Object.assign({ html: o.html || html(pick(en, ar)) }, o)); }
  // knowledge answers: a heading, real bullet lists, a source line and feedback
  let kctx = {};
  function remember(a) {
    if (!a || !a.topic) return;
    if (kctx.topic === a.topic) { kctx.aspect = a.aspect; if (!kctx.seen.includes(a.aspect)) kctx.seen.push(a.aspect); }
    else kctx = { topic: a.topic, aspect: a.aspect, seen: [a.aspect] };
  }
  function richHTML(text) {
    const lines = String(text).split('\n');
    let out = '', list = [];
    const flush = () => { if (list.length) { out += '<ul class="kb-ul">' + list.map((l, i) => `<li style="--li:${i}">${esc(l)}</li>`).join('') + '</ul>'; list = []; } };
    lines.forEach((l, i) => {
      if (/^• /.test(l)) return list.push(l.slice(2));
      flush();
      const m = l.match(/^([^:：]{3,60})[:：]\s(.+)$/);
      if (i === 0 && /:$/.test(l)) out += `<p class="kb-h">${esc(l)}</p>`;
      else if (m && !/^https?/.test(m[1])) out += `<p><b>${esc(m[1])}:</b> ${esc(m[2])}</p>`;
      else out += `<p>${esc(l)}</p>`;
    });
    flush();
    return out;
  }
  const ASP_N = { what: ['Overview', 'نظرة عامة'], signs: ['Signs', 'العلامات'], assess: ['Assessment', 'التقييم'], support: ['What helps', 'ما يساعد'], similar: ['Look-alikes', 'ما يشبهه'], myths: ['Myths', 'خرافات'], faq: ['Quick fact', 'معلومة سريعة'], simple: ['In short', 'باختصار'], compare: ['Comparison', 'مقارنة'], list: ['Topics', 'المواضيع'], done: ['', ''] };
  async function sayKB(a) {
    const asp = ASP_N[a.aspect] || ['', ''];
    const tp = a.topic && K.topicById(a.topic);
    const head = tp && asp[0] ? `<span class="kb-tag">${ICON('book')} ${esc(pick(...tp.title).split(' (')[0])}${a.compared ? ' · ' + esc(pick(...K.topicById(a.compared[1]).title).split(' (')[0]) : ''} <i>${esc(pick(...asp))}</i></span>` : '';
    const foot = a.kind === 'answer' && tp ? `<div class="kb-foot"><small>${ICON('shield')} ${T('From ERLY’s guide · general information, not a diagnosis', 'من دليل إيرلي · معلومات عامة لا تشخيص')}</small><span class="kb-fb" data-kb="${esc(a.topic)}:${esc(a.aspect)}"><button data-fb="up" aria-label="${T('Helpful', 'مفيد')}">${ICON('thumbUp')}</button><button data-fb="down" aria-label="${T('Not helpful', 'غير مفيد')}">${ICON('thumbDown')}</button><button data-fb="copy" aria-label="${T('Copy', 'نسخ')}">${ICON('copy')}</button></span></div>` : '';
    return aiSays(a.en, a.ar, { html: head + richHTML(pick(a.en, a.ar)) + foot, stream: true });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('.kb-fb button'); if (!b) return;
    const box = b.parentElement, key = box.dataset.kb;
    if (b.dataset.fb === 'copy') {
      const txt = b.closest('.cmsg__b').innerText.trim();
      try { navigator.clipboard.writeText(txt); } catch (err) { /* no clipboard */ }
      return ERLY.toast && ERLY.toast(T('Copied', 'تم النسخ'));
    }
    try { const f = JSON.parse(localStorage.getItem('erly-noor-feedback') || '{}'); f[key] = b.dataset.fb; localStorage.setItem('erly-noor-feedback', JSON.stringify(f)); } catch (err) { /* private mode */ }
    box.querySelectorAll('[data-fb="up"],[data-fb="down"]').forEach(x => x.classList.toggle('is-on', x === b));
    if (b.dataset.fb === 'down') { const t = K.topicById(key.split(':')[0]); if (t) { say('Thanks — I’ll keep it simpler. Here’s the short version:', 'شكراً — سأبسّطها. إليك النسخة المختصرة:', { speak: false }).then(() => { const s2 = K.aspectAnswer(t.id, 'simple'); remember(s2); return sayKB(s2); }).then(() => offerChips(K.aspectAnswer(t.id, 'simple').chips)); } }
    else ERLY.toast && ERLY.toast(T('Glad that helped!', 'سعيدة أن ذلك ساعد!'));
  });

  /* ---------------- free-form chat ----------------
     1. crisis words → the safety card, always first
     2. an AI brain is on (ai.js) → a streamed, Markdown answer from the model,
        grounded on ERLY's guide and (if attached) the page being read
     3. otherwise the built-in brain: study skills (maths, plans, emails, page
        summaries, quizzes) and then ERLY's knowledge guide */
  const MD = window.ERLY_MD, AIX = window.ERLY_AI;
  async function freeText(text, o = {}) {
    if (!o.silentUser) bubble('you', text, { text: true });
    clearChips();
    const a = K.answer(text, lang(), kctx);
    if (a.kind === 'crisis') { history.push({ role: 'user', text }); return crisis(); }
    if (U.ai && U.ai.ready() && MD && AIX) { if (await aiReply(text, a)) return; }
    history.push({ role: 'user', text });
    if (await skill(text)) return;
    remember(a);
    if (a.kind === 'answer') await sayKB(a);
    else if (a.kind === 'unknown' && U.ai) {
      await mdSay('My **built-in brain** only covers learning differences, studying, exams, wellbeing and the readings here — so I can’t answer that one yet.\n\nWant me to find out? **Noor Online** is a free AI that can answer almost anything, and it works on iPads too.', 'يغطي **عقلي المدمج** اختلافات التعلّم والمذاكرة والاختبارات والرفاه والقراءات هنا فقط — لذا لا أستطيع الإجابة عن هذا بعد.\n\nهل تريد أن أعرف لك؟ **نور أونلاين** ذكاء اصطناعي مجاني يجيب عن كل شيء تقريباً، ويعمل على الآيباد أيضاً.');
      history.push({ role: 'assistant', text: 'built-in: unknown' });
      onlineCard(text);
      return;
    } else await say(a.en, a.ar);
    history.push({ role: 'assistant', text: pick(a.en, a.ar) });
    if (history.length > 16) history.splice(0, history.length - 16);
    offerChips(a.chips && a.chips.length ? a.chips : [{ id: 'hard', en: 'Something feels hard', ar: 'شيء ما يبدو صعباً' }, { id: 'kb:assessment:what', en: 'How do assessments work?', ar: 'كيف تعمل التقييمات؟' }]);
  }
  // a one-tap, informed choice to answer with Noor Online (or just a Wikipedia lookup)
  function onlineCard(q) {
    const svc = U.ai.online();
    const card = document.createElement('div');
    card.className = 'ccard conline';
    card.innerHTML = `<b>${ICON('globe')} ${T('Answer this with Noor Online?', 'أجيب عن هذا بنور أونلاين؟')}</b>
      <p>${T(`Your question and the recent chat go to ${esc(svc.name)}, a free AI service. Emails and numbers are removed first; your name, profile and tracking are never sent. Please don’t share anything private.`, `يُرسل سؤالك والمحادثة الأخيرة إلى ${esc(svc.name)}، وهي خدمة ذكاء اصطناعي مجانية. تُحذف عناوين البريد والأرقام أولاً، ولا يُرسل اسمك أو ملفك أو بيانات التتبع أبداً. لا تشارك أي شيء خاص.`)}</p>
      <div class="ccard__btns"><button type="button" class="btn btn--sm btn--accent" data-o="on">${T('Turn on & answer', 'شغّل وأجب')}</button><button type="button" class="btn btn--sm btn--ghost" data-o="wiki">${T('Just search Wikipedia', 'ابحث في ويكيبيديا فقط')}</button><button type="button" class="btn btn--sm btn--quiet" data-o="no">${T('Not now', 'ليس الآن')}</button></div>`;
    card.addEventListener('click', async e => {
      const b = e.target.closest('[data-o]'); if (!b) return;
      card.remove();
      if (b.dataset.o === 'on') { U.ai.useOnline(); ERLY.toast && ERLY.toast(T('Noor Online is on — ask me anything.', 'نور أونلاين مفعّل — اسألني أي شيء.')); history.pop(); history.pop(); return freeText(q, { silentUser: true }); }
      if (b.dataset.o === 'wiki') return wikiAnswer(q);
      offerChips([{ id: 'topics', en: 'What can you answer?', ar: 'ماذا تستطيعين أن تجيبي؟' }, { id: 'hard', en: 'Something feels hard', ar: 'شيء ما يبدو صعباً' }]);
    });
    U.$('#cmpLog').appendChild(card); U.scrollLog();
  }
  async function wikiAnswer(q, note) {
    U.setStatus('thinking');
    let hit = null;
    try { hit = await U.ai.lookup(q, lang()); } catch (e) { hit = null; }
    U.setStatus('idle');
    if (!hit) {
      await say('I couldn’t reach the internet from here, so I can’t look that up right now. Try again in a moment, or ask me about studying, exams or the readings.', 'لم أستطع الوصول إلى الإنترنت من هنا، لذا لا أستطيع البحث الآن. حاول بعد قليل، أو اسألني عن المذاكرة أو الاختبارات أو القراءات.');
      return false;
    }
    const md = `${note ? note + '\n\n' : ''}### ${hit.title}\n${hit.text}\n\n_Source: [Wikipedia](${hit.url})_`;
    await mdSay(md, md, { tag: T('Looked up on Wikipedia', 'من ويكيبيديا') });
    history.push({ role: 'assistant', text: hit.text });
    offerChips([{ id: 'fu:simpler', en: 'Explain it more simply', ar: 'اشرحيها بشكل أبسط' }, { id: 'fu:example', en: 'Give me an example', ar: 'أعطيني مثالاً' }, { id: 'brain', en: 'Noor’s brain', ar: 'عقل نور' }]);
    return true;
  }
  const mdSay = (en, ar, o = {}) => aiSays(en, ar, Object.assign({ html: `<div class="md">${MD.render(pick(en, ar))}</div>`, sayText: MD.toText(pick(en, ar)), stream: true }, o));

  // stream an answer from the AI brain into a new chat bubble
  const READING_Q = /\b(this|the) (page|paragraph|passage|reading|section|text|chapter|diagram|figure|pdf|article)\b|هذه الصفحة|هذا النص|هذه القراءة|هذا المقطع/i;
  async function aiReply(text, a) {
    const ai = U.ai, voiceMode = !!C.inCall;
    const R = ERLY.reader;
    const reading = U.attached() || (R && R.isOpen() && READING_Q.test(text) ? R.contextFor() : null);
    const kb = ['answer', 'self-check', 'reflect', 'feeling'].includes(a.kind) ? K.context(text, lang()) : '';
    const msgs = AIX.buildMessages(history, text, { lang: lang(), voice: voiceMode, care: voiceMode && C.callMode !== 'chat', reading, kb });
    history.push({ role: 'user', text });
    const m = document.createElement('div');
    m.className = 'cmsg cmsg--ai cmsg--md is-writing';
    m.innerHTML = `<span class="cmsg__tag">${ICON('chip')} ${esc(pick(ai.label().en, ai.label().ar))}${reading ? ` · ${ICON('file')} ${esc(reading.title)}` : ''}</span><div class="cmsg__b md"><span class="cdots"><i></i><i></i><i></i></span></div>`;
    U.$('#cmpLog').appendChild(m); U.scrollLog();
    const body = m.querySelector('.cmsg__b');
    U.setStatus('thinking'); U.setBusy(true);
    let stopped = false, spoken = 0, raf = 0, latest = '', busyT = null;
    U.setGenerating({ stop: () => { stopped = true; ai.stop(); } });
    const paint = () => { raf = 0; body.innerHTML = MD.render(latest) + '<span class="ccaret" aria-hidden="true"></span>'; U.scrollLog(); };
    const speakPart = t => {
      if (!C.inCall) return;
      const sub = t.slice(spoken), r = AIX.takeSentences(sub);
      r.done.forEach(sn => ERLY.emit('noor:said', { text: MD.toText(sn), speak: true }));
      spoken += sub.length - r.rest.length;
    };
    let out = '';
    try {
      out = await ai.generate(msgs, { voice: voiceMode, onStatus: st => {
        if (!st.busy) return;
        let left = st.busy; clearInterval(busyT);
        const show = () => { body.innerHTML = `<p class="cmsg__busy">${ICON('clock')} ${T(`Noor Online is busy (free service, one message at a time) — trying again in ${left}s…`, `نور أونلاين مشغول (خدمة مجانية، رسالة واحدة في كل مرة) — سأحاول مجدداً بعد ${left} ث…`)}</p>`; };
        show(); busyT = setInterval(() => { left--; if (left <= 0) { clearInterval(busyT); body.innerHTML = '<span class="cdots"><i></i><i></i><i></i></span>'; } else show(); }, 1000);
      }, onToken: t => { clearInterval(busyT); latest = t; if (!raf) raf = requestAnimationFrame(paint); speakPart(t); } });
      clearInterval(busyT);
    } catch (e) {
      cancelAnimationFrame(raf); clearInterval(busyT);
      U.setGenerating(null); U.setBusy(false); U.setStatus('idle');
      if (stopped && latest) { finishReply(m, latest, text, true); history.push({ role: 'assistant', text: latest }); return true; }
      m.remove(); history.pop();
      if (e && e.message === 'unsafe') {
        history.push({ role: 'user', text });
        await say('I want to be careful here: I can’t tell you whether you have a condition — only a qualified assessment can do that. What I can do is ask you a few questions about how things usually go, or explain what an assessment involves.', 'أريد أن أكون حذرة هنا: لا أستطيع أن أخبرك إن كانت لديك حالة ما — وحده التقييم المتخصص يستطيع ذلك. ما يمكنني فعله هو طرح بعض الأسئلة عن سير الأمور عادةً، أو شرح ما يتضمنه التقييم.');
        history.push({ role: 'assistant', text: 'I can’t say whether you have a condition; only an assessment can.' });
        offerChips(a.chips && a.chips.length ? a.chips : [{ id: 'hard', en: 'Ask me some questions', ar: 'اسأليني بعض الأسئلة' }, { id: 'kb:assessment:what', en: 'How do assessments work?', ar: 'كيف تعمل التقييمات؟' }]);
        ERLY.emit('noor:turn-end');
        return true;
      }
      if (stopped) { ERLY.emit('noor:turn-end'); return true; }
      if (ai.state().tier === 'online') {
        history.push({ role: 'user', text });
        if (await wikiAnswer(text, T('_Noor Online didn’t answer just now, so I looked it up instead._', '_لم يُجب نور أونلاين الآن، لذا بحثت عن الإجابة._'))) { ERLY.emit('noor:turn-end'); return true; }
        history.pop();
      }
      bubble('ai', T('My AI brain didn’t answer this time, so here’s my built-in answer.', 'لم يُجب عقلي الذكي هذه المرة، لذا إليك إجابتي المدمجة.'), { text: true, cls: 'cmsg--note' });
      return false;
    }
    cancelAnimationFrame(raf);
    if (C.inCall) { const rest = out.slice(spoken).trim(); if (rest) ERLY.emit('noor:said', { text: MD.toText(rest), speak: true }); }
    finishReply(m, out, text, false);
    history.push({ role: 'assistant', text: out });
    if (history.length > 16) history.splice(0, history.length - 16);
    U.setGenerating(null); U.setBusy(false);
    U.setStatus(U.voice.state().speaking ? 'speaking' : 'idle');
    if (!C.inCall) U.speak(MD.toText(out).slice(0, 700));
    ERLY.emit('noor:turn-end');
    if (!C.inCall) offerChips(a.kind === 'self-check' || a.kind === 'reflect' ? (a.chips || []) : followUps(reading));
    return true;
  }
  function finishReply(m, md, q, stopped) {
    m.classList.remove('is-writing');
    m._md = md; m._q = q;
    m.querySelector('.cmsg__b').innerHTML = MD.render(md) + (stopped ? `<p class="cmsg__stopped">${T('Stopped', 'توقف')}</p>` : '');
    const acts = document.createElement('div');
    acts.className = 'cmsg__acts';
    acts.innerHTML = [['copy', 'copy', T('Copy', 'نسخ')], ['speak', 'volume', T('Read aloud', 'اقرأ بصوت')], ['regen', 'reset', T('Try again', 'حاول مجدداً')], ['up', 'thumbUp', T('Helpful', 'مفيد')], ['down', 'thumbDown', T('Not helpful', 'غير مفيد')]].map(([k, ic, l]) => `<button type="button" data-ma="${k}" aria-label="${l}" title="${l}">${ICON(ic)}</button>`).join('');
    m.appendChild(acts);
    U.scrollLog();
  }
  function followUps(reading) {
    return reading
      ? [{ id: 'fu:simpler', en: 'Explain it more simply', ar: 'اشرحيها بشكل أبسط' }, { id: 'fu:quiz', en: 'Quiz me on this page', ar: 'اختبريني في هذه الصفحة' }, { id: 'fu:example', en: 'Give me a real example', ar: 'أعطيني مثالاً واقعياً' }]
      : [{ id: 'fu:simpler', en: 'Explain it more simply', ar: 'اشرحيها بشكل أبسط' }, { id: 'fu:example', en: 'Give me an example', ar: 'أعطيني مثالاً' }, { id: 'fu:quiz', en: 'Quiz me on this', ar: 'اختبريني في هذا' }];
  }
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-md-copy]');
    if (c) { const code = c.closest('.md-code').querySelector('code').textContent; try { navigator.clipboard.writeText(code); } catch (err) { /* no clipboard */ } c.textContent = T('Copied', 'تم النسخ'); setTimeout(() => { c.textContent = 'Copy'; }, 1400); return; }
    const b = e.target.closest('.cmsg__acts [data-ma]'); if (!b) return;
    const m = b.closest('.cmsg'), k = b.dataset.ma;
    if (k === 'copy') { try { navigator.clipboard.writeText(m._md || ''); } catch (err) { /* no clipboard */ } ERLY.toast && ERLY.toast(T('Copied', 'تم النسخ')); }
    if (k === 'speak') U.speak(MD.toText(m._md || ''), true);
    if (k === 'up' || k === 'down') { b.parentElement.querySelectorAll('[data-ma="up"],[data-ma="down"]').forEach(x => x.classList.toggle('is-on', x === b)); ERLY.toast && ERLY.toast(k === 'up' ? T('Glad that helped!', 'سعيدة أن ذلك ساعد!') : T('Thanks — try “Try again” or ask me to explain it differently.', 'شكراً — جرّب «حاول مجدداً» أو اطلب شرحاً مختلفاً.')); }
    if (k === 'regen' && m._q && !U.isBusy()) {
      const i = history.map(h => h.text).lastIndexOf(m._md);
      if (i > 0) history.splice(i - 1, 2);
      m.remove(); clearChips();
      freeText(m._q, { silentUser: true });
    }
  });

  /* ---------------- built-in study skills (no AI model needed) ---------------- */
  async function skill(text) {
    const t = text.trim(), R = ERLY.reader;
    // maths
    const math = mathOf(t);
    if (math) { await mdSay(`**${math.show} = ${math.value}**`, `**${math.show} = ${math.value}**`, { tag: T('Calculator', 'الآلة الحاسبة') }); history.push({ role: 'assistant', text: math.value }); return true; }
    const reading = U.attached() || (R && R.isOpen() ? R.contextFor() : null);
    if (reading && /\b(summar|sum up|main (idea|point)s?|key ideas|explain (this|the) (page|passage|paragraph|reading)|this (page|passage))|لخّ?ص|اشرح.*(الصفحة|المقطع|القراءة)|الفكرة الرئيسية/i.test(t)) { await pageSummary(reading); return true; }
    if (R && R.isOpen() && /\bquiz|test me|اختبر/i.test(t)) { R.act('study', 'quiz'); await mdSay('I’ve opened a **quiz** on this reading in *Study tools* — answer one question at a time. It’s just for you: nothing is saved or scored.', 'فتحت **اختباراً** على هذه القراءة في *أدوات المذاكرة* — أجب سؤالاً سؤالاً. إنه لك فقط: لا يُحفظ ولا يُقيَّم.'); return true; }
    if (R && R.isOpen() && /flash ?cards?|بطاقات/i.test(t)) { R.act('study', 'cards'); await mdSay('Your **flashcards** are open in *Study tools*. Tap a card to flip it, then choose **Got it** or **Again** — the ones you miss come back.', 'بطاقاتك مفتوحة في *أدوات المذاكرة*. اضغط البطاقة لقلبها ثم اختر **عرفتها** أو **مجدداً** — وتعود البطاقات التي أخطأت فيها.'); return true; }
    if (/(study|revision|revise|exam|test|midterm|final)s?\b.*\b(plan|schedule|timetable)|\b(plan|schedule|timetable)\b.*\b(study|revision|exam|test)|خطة (مذاكرة|مراجعة)|جدول (مذاكرة|مراجعة)/i.test(t)) { await studyPlan(t); return true; }
    if (/(email|e-mail|mail|message|write|text).*(professor|prof\b|lecturer|instructor|\bdr\b|doctor|teacher|tutor|advis[eo]r)|(professor|lecturer|instructor).*(email|message)|بريد.*(الدكتور|الأستاذ|المحاضر)/i.test(t)) { await emailDraft(); return true; }
    if (/pomodoro|focus timer|\btimer\b|مؤقت/i.test(t)) {
      if (R && R.isOpen()) R.act('timer');
      await mdSay(`${R && R.isOpen() ? 'I’ve started a **focus timer** in the Reading Studio. ' : ''}Try the **Pomodoro** rhythm:\n1. Pick **one** small task.\n2. Work for **25 minutes** — phone face down.\n3. Take a **5-minute** break: stand, stretch, water.\n4. After four rounds, take a longer 20-minute break.`, `${R && R.isOpen() ? 'بدأت **مؤقت تركيز** في استوديو القراءة. ' : ''}جرّب إيقاع **بومودورو**:\n1. اختر مهمة **واحدة** صغيرة.\n2. اعمل **٢٥ دقيقة** — والهاتف مقلوب.\n3. خذ استراحة **٥ دقائق**: قف وتمدّد واشرب الماء.\n4. بعد أربع جولات، خذ استراحة أطول ٢٠ دقيقة.`);
      return true;
    }
    const def = t.match(/^(?:what does|what is|what's|whats|define|meaning of)\s+["“']?(.+?)["”']?(?:\s+mean)?\s*\??$/i);
    if (def && R && R.isOpen()) {
      const d = R.doc.terms, key = Object.keys(d).find(k => k.toLowerCase() === def[1].toLowerCase());
      if (key) { await mdSay(`**${key}** — ${d[key][0]}\n\nArabic: ${d[key][1]}`, `**${key}** — ${d[key][0]}\n\nبالعربية: ${d[key][1]}`, { tag: T('From this reading’s glossary', 'من مسرد هذه القراءة') }); return true; }
    }
    return false;
  }
  async function pageSummary(ctx) {
    const R = ERLY.reader, k = R.currentPara();
    const pg = R.doc.pages[ctx.page - (R.doc.startPage || 1)] || R.doc.pages[0];
    const pi = R.doc.pages.indexOf(pg);
    const lines = pg.paras.filter(p => !p.sub).map((p, j) => R.paraSummary(`${pi}-${j}`)[0]).filter(Boolean);
    R.act('summary', k);
    const md = `### ${pg.h}\n${lines.map(l => '- ' + l).join('\n')}\n\n${R.doc.uploaded ? '_Auto summary: key sentences picked from your file on this device._' : '_From the course team’s notes for this reading._'}`;
    await mdSay(md, md, { tag: T('Page summary', 'ملخص الصفحة') });
    offerChips([{ id: 'fu:quiz', en: 'Quiz me on this page', ar: 'اختبريني في هذه الصفحة' }, { id: 'fu:cards', en: 'Make flashcards', ar: 'اصنعي بطاقات' }, { id: 'brain', en: 'Explain it with AI', ar: 'اشرحيها بالذكاء الاصطناعي' }]);
  }
  async function studyPlan(t) {
    const n = Math.max(2, Math.min(14, +(t.match(/(\d{1,2})\s*(day|days|يوم|أيام)/i) || [])[1] || 7));
    const ROWS = [
      ['List every topic and rate it 🙂 😐 😟', 'Make a one-page topic list', 'اكتب كل المواضيع وقيّمها 🙂 😐 😟', 'قائمة مواضيع في صفحة واحدة'],
      ['Hardest topic #1', 'Read → close the book → write what you remember', 'أصعب موضوع رقم ١', 'اقرأ ← أغلق الكتاب ← اكتب ما تتذكره'],
      ['Hardest topic #2 + quick review of yesterday', 'Flashcards (retrieval practice)', 'أصعب موضوع رقم ٢ + مراجعة سريعة للأمس', 'بطاقات (ممارسة الاسترجاع)'],
      ['A past paper, timed', 'Mark it and list every mistake', 'ورقة امتحان سابقة بوقت محدد', 'صحّحها واكتب كل خطأ'],
      ['Fix the mistakes + topic #3', 'Teach it out loud to an empty chair', 'صحّح الأخطاء + الموضوع ٣', 'اشرحه بصوت عالٍ لكرسي فارغ'],
      ['Mixed questions from all topics', 'Interleave: switch topic every 20 min', 'أسئلة مختلطة من كل المواضيع', 'بدّل الموضوع كل ٢٠ دقيقة'],
      ['Light review and an early night', 'Skim your summaries — no cramming', 'مراجعة خفيفة ونوم مبكر', 'تصفّح ملخصاتك — دون حشو']
    ];
    const rows = [];
    for (let d = 1; d <= n; d++) rows.push(d === n ? ROWS[6] : ROWS[Math.min(5, d - 1 < 6 ? d - 1 : 1 + ((d - 1) % 5))]);
    const en = `### Your ${n}-day exam plan\n| Day | Focus | How |\n|---|---|---|\n${rows.map((r, i) => `| ${i + 1} | ${r[0]} | ${r[1]} |`).join('\n')}\n\n**Every day:** 25-minute focus blocks with 5-minute breaks, a 10-minute review of yesterday, and 7–9 hours of sleep — memory is saved while you sleep.\n\nIf you have exam accommodations (like extra time), SAS can make sure each instructor has your letter before the exam.`;
    const ar = `### خطتك للامتحانات خلال ${n} أيام\n| اليوم | التركيز | الطريقة |\n|---|---|---|\n${rows.map((r, i) => `| ${i + 1} | ${r[2]} | ${r[3]} |`).join('\n')}\n\n**كل يوم:** فترات تركيز ٢٥ دقيقة مع استراحة ٥ دقائق، ومراجعة ١٠ دقائق للأمس، ونوم ٧–٩ ساعات — فالذاكرة تُثبَّت أثناء النوم.\n\nإن كانت لديك تسهيلات امتحان (مثل وقت إضافي)، يمكن لخدمات الطلبة التأكد من وصول خطابك لكل مدرّس قبل الامتحان.`;
    await mdSay(en, ar, { tag: T('Study plan', 'خطة مذاكرة') });
    offerChips([{ id: 'fu:timer', en: 'Start a focus timer', ar: 'ابدئي مؤقت تركيز' }, { id: 'kb:sas:what', en: 'What can SAS do for exams?', ar: 'ماذا تقدم خدمات الطلبة للامتحانات؟' }, { id: 'brain', en: 'Personalise it with AI', ar: 'خصّصيها بالذكاء الاصطناعي' }]);
  }
  async function emailDraft() {
    const en = 'Here’s a short, polite email you can adapt:\n\n**Subject:** Question about [topic] — [course code], section [x]\n\n> Dear Dr. [Surname],\n>\n> I hope you are well. I’m [your name], a student in your [course] class. I’m finding [topic] difficult and would really appreciate a few minutes in your office hours to go over it.\n>\n> Would [day and time] work for you, or is there another time that suits you better?\n>\n> Thank you for your time,\n> [Your name] · [Student ID]\n\n**Tips:** keep it short, put the course code in the subject, and give one or two times that work for you. If it’s about accommodations, SAS can send your letter for you — you don’t have to explain any details.';
    const ar = 'إليك رسالة قصيرة ومهذبة يمكنك تعديلها:\n\n**الموضوع:** سؤال عن [الموضوع] — [رمز المادة]، الشعبة [x]\n\n> الدكتور/ة [اسم العائلة] المحترم/ة،\n>\n> أتمنى أن تكون بخير. أنا [اسمك]، طالب/ة في مادة [اسم المادة]. أجد [الموضوع] صعباً وسأكون ممتناً لبضع دقائق في ساعاتك المكتبية لمراجعته.\n>\n> هل يناسبك [اليوم والوقت]، أم هناك وقت آخر أنسب لك؟\n>\n> شكراً لوقتك،\n> [اسمك] · [الرقم الجامعي]\n\n**نصائح:** اجعلها قصيرة، وضع رمز المادة في الموضوع، واقترح وقتاً أو وقتين. إن كانت عن التسهيلات، يمكن لخدمات الطلبة إرسال خطابك — دون الحاجة لشرح أي تفاصيل.';
    await mdSay(en, ar, { tag: T('Email draft', 'مسودة بريد') });
  }
  // safe arithmetic: numbers, + − × ÷ ^ ( ) and "x% of y" — no eval
  function mathOf(t) {
    const pct = t.match(/^(?:what(?:'s| is)\s+)?(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)\s*\??$/i);
    if (pct) return { show: `${pct[1]}% of ${pct[2]}`, value: fmt(+pct[1] / 100 * +pct[2]) };
    const m = t.match(/^(?:what(?:'s| is)|calculate|compute|solve|work out|كم)?\s*([\d\s+\-*/×÷^().,]+?)\s*(?:=\s*\??)?\??$/i);
    if (!m || !/\d\s*[+\-*/×÷^]\s*[\d(]/.test(m[1])) return null;
    const src = m[1].replace(/×/g, '*').replace(/÷/g, '/').replace(/,(?=\d{3}\b)/g, '').replace(/\s+/g, '');
    const toks = src.match(/\d+(?:\.\d+)?|[+\-*/^()]/g);
    if (!toks || toks.join('') !== src) return null;
    let i = 0;
    const peek = () => toks[i], next = () => toks[i++];
    function prim() { const tk = next(); if (tk === '(') { const v = add(); if (next() !== ')') throw 0; return v; } if (tk === '-') return -prim(); if (tk === '+') return prim(); if (tk == null || isNaN(+tk)) throw 0; return +tk; }
    function pow() { const b = prim(); if (peek() === '^') { next(); return Math.pow(b, pow()); } return b; }
    function mul() { let v = pow(); while (peek() === '*' || peek() === '/') { const o = next(), r = pow(); v = o === '*' ? v * r : v / r; } return v; }
    function add() { let v = mul(); while (peek() === '+' || peek() === '-') { const o = next(), r = mul(); v = o === '+' ? v + r : v - r; } return v; }
    try { const v = add(); if (i !== toks.length || !isFinite(v)) return null; return { show: m[1].trim().replace(/\*/g, '×').replace(/\//g, '÷'), value: fmt(v) }; } catch (e) { return null; }
  }
  const fmt = v => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(+v.toFixed(6)));
  function offerChips(list) {
    chipRow(list.slice(0, 5), c => chip(c));
  }
  async function chip(c) {
    const id = c.id;
    bubble('you', pick(c.en, c.ar), { text: true });
    if (id.startsWith('kb:')) {
      const [, topic, asp] = id.split(':');
      const a = K.aspectAnswer(topic, asp);
      if (a) { remember(a); await sayKB(a); return offerChips(a.chips); }
    }
    if (id.startsWith('interview:')) return startInterview(id.split(':')[1], 'student');
    if (id === 'talk') return U.startConversation({ type: 'student' });
    if (id === 'hand') return ERLY.emit('hand:open', { from: 'noor' });
    if (id === 'growth') { location.href = 'support.html'; return; }
    if (id === 'topics') return freeText('what can you answer?', { silentUser: true });
    if (id === 'hard') return freeText('I feel like something is hard for me', { silentUser: true });
    if (id === 'profile') return U.setTab('profile');
    if (id === 'summary') return U.setTab('summary');
    if (id === 'assess') return chip({ id: 'kb:assessment:what', en: '', ar: '' });
    if (id === 'call') return ERLY.emit('noor:call');
    if (id === 'brain') return U.openBrain();
    if (id === 'fu:timer') { if (ERLY.reader && ERLY.reader.isOpen()) ERLY.reader.act('timer'); return freeText('pomodoro focus timer', { silentUser: true }); }
    if (id === 'fu:cards') return freeText('flashcards', { silentUser: true });
    if (id.startsWith('fu:')) return freeText(pick(c.en, c.ar), { silentUser: true });
    if (id === 'no-thanks') return say('No problem at all. I’m here whenever you want.', 'لا مشكلة إطلاقاً. أنا هنا متى أردت.');
  }
  async function crisis() {
    await say(K.CRISIS_TEXT[0], K.CRISIS_TEXT[1], { html: `<div class="ccrisis"><b>${T('You don’t have to handle this alone', 'لست مضطراً للتعامل مع هذا وحدك')}</b><p>${esc(pick(K.CRISIS_TEXT[0], K.CRISIS_TEXT[1]))}</p><div class="ccrisis__n"><a href="tel:999">${T('Call 999', 'اتصل بـ٩٩٩')}</a><a href="tel:8004673">800 HOPE · 800 4673</a></div></div>` });
    offerChips([{ id: 'talk', en: 'Keep talking with Noor', ar: 'أكمل الحديث مع نور' }]);
  }

  /* ---------------- the structured interview ---------------- */
  function objectiveFor(area) {
    try { const p = ERLY.analyser && ERLY.analyser.profile(); return p && p[area] ? EV.toObjective(p[area].level) : null; } catch (e) { return null; }
  }
  async function startInterview(area, source) {
    if (!IV.MODULES[area]) return;
    ivSource = source;
    iv = IV.create(area, { objective: objectiveFor(area) });
    U.renderConvBar();
    const s = IV.start(iv);
    await say(s.intro[0], s.intro[1], { html: `<span class="civ-badge">${ICON('stetho')} ${T('Talk-it-through', 'لنتحدث عنه')} · ${esc(pick(...IV.MODULES[area].name).split(' (')[0])}</span><p>${esc(pick(...s.intro))}</p><small class="muted">${T('I’m not a doctor and this isn’t a test you can fail — it just helps work out whether a proper assessment would be worth it. Say “skip” or “stop” any time.', 'لست طبيبة وهذا ليس اختباراً ترسب فيه — إنه يساعد فقط على معرفة إن كان التقييم الحقيقي يستحق. قل «تخطٍّ» أو «توقف» في أي وقت.')}</small>`, sayText: pick(...s.intro) });
    ask(s.question);
  }
  async function ask(q, prefix) {
    const pre = prefix ? pick(...prefix) + ' ' : '';
    const text = pre + pick(...q.q);
    await say(text, text, { html: `<div class="civ-q"><span class="civ-n mono">${T('Question', 'سؤال')} ${q.n}</span><p>${esc(text)}</p>${q.why ? `<small class="muted">${ICON('search')} ${esc(pick(...q.why))}</small>` : ''}</div>` });
    const list = q.options.map(o => ({ id: 'o:' + o.id, en: o.en, ar: o.ar })).concat([{ id: 'skip', en: 'Skip', ar: 'تخطٍّ' }, { id: 'stop', en: 'Stop', ar: 'توقف' }]);
    chipRow(list, c => {
      bubble('you', pick(c.en, c.ar), { text: true });
      handle(c.id === 'skip' ? IV.answer(iv, { text: 'skip' }) : c.id === 'stop' ? IV.answer(iv, { text: 'stop' }) : IV.answer(iv, { option: c.id.slice(2) }));
    }, q.kind === 'freq' ? 'cchips--scale' : '');
  }
  function answerText(text) {
    bubble('you', text, { text: true });
    if (K.CRISIS.test(text)) { iv.done = true; iv.crisis = true; U.renderConvBar(); return crisis(); }
    handle(IV.answer(iv, { text }));
  }
  async function handle(res) {
    if (res.clarify) { await say(...res.msg); return ask(res.question); }
    if (res.crisis) { U.renderConvBar(); return crisis(); }
    if (res.done) return finish();
    return ask(res.question, res.ack);
  }
  async function finish() {
    const r = IV.result(iv, objectiveFor(iv.area));
    U.renderConvBar();
    if (r.crisis) return crisis();
    ERLY.analyser && ERLY.analyser.setInterviewed(iv.area, r);
    const tp = K.topicById(r.topic);
    const prof = ERLY.analyser ? ERLY.analyser.profile()[iv.area] : null;
    const L = lang() === 'ar' ? 1 : 0;
    const card = `<div class="civ-res civ-res--${r.level}">
      <div class="civ-res__h"><span class="civ-lvl">${esc(pick(...LEVEL[r.level]))}</span><b>${esc(pick(...r.name).split(' (')[0])}</b></div>
      <div class="civ-meter" aria-hidden="true">${['low', 'some', 'strong'].map(l => `<i class="${IV.ORDER.indexOf(r.level) >= IV.ORDER.indexOf(l) && r.level !== 'unclear' ? 'is-on' : ''}"></i>`).join('')}</div>
      <p>${esc(r.headline[L])}</p>
      ${r.reasons.length || (prof && prof.items.length) ? `<p class="civ-k">${T('What this is based on', 'على ماذا يستند هذا')}</p><ul>${r.reasons.map(x => `<li>${esc(x[L])}</li>`).join('')}${r.high ? `<li>${esc(T(`${r.high} of the everyday experiences happen often or very often`, `${r.high} من التجارب اليومية تحدث غالباً أو دائماً`))}</li>` : ''}${prof ? prof.items.map(x => `<li>${esc(L ? x.ar : x.en)}</li>`).join('') : ''}</ul>` : ''}
      ${r.agreeText ? `<p class="muted">${esc(r.agreeText[L])}</p>` : ''}
      ${r.notes.map(n => `<p class="civ-note">${esc(n[L])}</p>`).join('')}
      ${r.checks.length ? `<p class="civ-k">${T('Worth checking first', 'يستحق التحقق أولاً')}</p><ul>${r.checks.map(x => `<li>${esc(x[L])}</li>`).join('')}</ul>` : ''}
      ${tp && tp.support[L] && r.level !== 'unclear' ? `<p class="civ-k">${T('What can help right now', 'ما يمكن أن يساعد الآن')}</p><p>${esc(tp.support[L])}</p>` : ''}
      <p class="civ-foot muted">${T('This is a screening conversation, not a diagnosis. Only a qualified assessment can confirm a learning difference or condition. Nothing is shared unless you choose to.', 'هذه محادثة فحص وليست تشخيصاً. وحده التقييم المتخصص يمكنه تأكيد اختلاف تعلّم أو حالة ما. لا يُشارك شيء إلا إن اخترت.')}</p>
    </div>`;
    await say(r.headline[0], r.headline[1], { html: card, sayText: pick(...r.headline) });
    const next = [];
    if (r.level === 'strong' || r.level === 'some') next.push({ id: 'kb:assessment:what', en: 'How do I get assessed?', ar: 'كيف أحصل على تقييم؟' }, { id: 'summary', en: 'Put this in my summary for SAS', ar: 'ضعه في ملخصي لخدمات الطلبة' });
    if ((iv.area === 'reading' || iv.area === 'writing') && (r.level === 'strong' || r.level === 'some')) next.unshift({ id: 'hand', en: 'Check my handwriting too', ar: 'افحصي كتابتي أيضاً' });
    if (r.level === 'strong' || r.level === 'some') next.push({ id: 'growth', en: 'Start a Growth Plan for this', ar: 'ابدئي خطة نمو لهذا' });
    if (tp) next.push({ id: `kb:${tp.id}:support`, en: 'More about what helps', ar: 'المزيد عما يساعد' });
    next.push({ id: 'hard', en: 'Talk about another area', ar: 'لنتحدث عن مجال آخر' });
    offerChips(next);
  }

  /* ---------------- My profile tab ---------------- */
  function renderProfile(pane) {
    if (!pane) return;
    const prof = ERLY.analyser ? ERLY.analyser.profile() : null;
    const res = results();
    const on = ERLY.analyser && ERLY.analyser.consented();
    const L = lang() === 'ar' ? 1 : 0;
    const lv = { none: 0, early: 1, some: 2, strong: 3 };
    pane.innerHTML = `
      <p class="cmp-lead">${T('Everything ERLY has noticed across the site — Check-ins, lecture videos, the Reading Studio and your 14-day tracking — plus anything we’ve talked through. An area only rises when different sources agree.', 'كل ما لاحظه إيرلي عبر الموقع — الفحوصات، وفيديوهات المحاضرات، واستوديو القراءة، والتتبّع لـ١٤ يوماً — إضافة إلى ما تحدثنا عنه. لا يرتفع مجال إلا عندما تتفق مصادر مختلفة.')}</p>
      ${!on ? `<p class="cmp-empty">${T('Noticing is off, so only Check-ins and our conversations count. Turn on noticing in Reading signals to include videos and reading.', 'الملاحظة متوقفة، لذا تُحتسب الفحوصات ومحادثاتنا فقط. شغّل الملاحظة من إشارات القراءة لتضمين الفيديوهات والقراءة.')}</p>` : ''}
      <div class="cprof">${prof ? Object.values(prof).map((o, i) => {
        const r = res[o.area];
        return `<div class="cprof__a cprof__a--${o.level}" style="--i:${i}">
          <div class="cprof__h"><b>${esc(o.name[L])}</b><span class="cprof__lvl">${esc(pick(...EVL[o.level]))}</span></div>
          <div class="cprof__bar"><i style="--w:${lv[o.level] / 3}"></i></div>
          ${o.items.length ? `<ul>${o.items.map(x => `<li>${esc(L ? x.ar : x.en)}</li>`).join('')}</ul>` : `<small class="muted">${T('Nothing noticed here.', 'لم يُلاحظ شيء هنا.')}</small>`}
          ${r ? `<p class="cprof__iv">${ICON('stetho')} ${T('We talked it through', 'تحدثنا عنه')}: <b>${esc(pick(...LEVEL[r.level]))}</b> · ${new Date(r.at).toLocaleDateString()}</p>` : ''}
          <button type="button" class="btn btn--xs ${o.level === 'some' || o.level === 'strong' ? 'btn--accent' : 'btn--ghost'}" data-iv="${o.area}">${r ? T('Talk it through again', 'لنتحدث عنه مجدداً') : T('Talk it through', 'لنتحدث عنه')}</button>
        </div>`;
      }).join('') : ''}</div>
      <div class="ccard__btns"><button type="button" class="btn btn--xs btn--ghost" data-hand>${ICON('pen')} ${T('Handwriting check', 'فحص الكتابة اليدوية')}</button><a class="btn btn--xs btn--ghost" href="checkins.html">${ICON('target')} ${T('Do today’s check-ins', 'أنجز فحوصات اليوم')}</a><a class="btn btn--xs btn--ghost" href="#videos" data-close-cmp>${ICON('volume')} ${T('Lecture videos', 'فيديوهات المحاضرات')}</a></div>
      <p class="muted cmp-small">${T('Evidence levels decide when Noor offers to talk — they are not a diagnosis, and never a percentage.', 'مستويات الدلائل تحدد متى تعرض نور الحديث — وليست تشخيصاً، ولا نسبة مئوية أبداً.')}</p>`;
    pane.onclick = e => {
      const b = e.target.closest('[data-iv]');
      if (b) { U.setTab('chat'); startInterview(b.dataset.iv, 'profile'); }
      if (e.target.closest('[data-close-cmp]')) C.close();
      if (e.target.closest('[data-hand]')) ERLY.emit('hand:open', { from: 'profile' });
    };
  }

  ERLY.on && ERLY.on('hand:done', async res => {
    if (!res || !res.summary) return;
    const S = res.summary;
    const lines = [S.head, S.spl, S.note].filter(Boolean);
    await say(lines.map(x => x[0]).join('\n'), lines.map(x => x[1]).join('\n'), { tag: T('Handwriting check', 'فحص الكتابة'), speak: false });
    offerChips([{ id: 'growth', en: 'Build these skills (Growth Plan)', ar: 'ابنِ هذه المهارات (خطة النمو)' }, { id: 'profile', en: 'See my profile', ar: 'اعرض ملفي' }, { id: 'kb:dysgraphia:what', en: 'What is dysgraphia?', ar: 'ما عسر الكتابة؟' }, { id: 'kb:sas:what', en: 'What happens at SAS?', ar: 'ماذا يحدث في خدمات الطلبة؟' }]);
  });

  /* ---------------- proactive notices ---------------- */
  const NOTICE = {
    reading: ['I’ve noticed reading seems to take extra effort for you lately. Would you like some help with that?', 'لاحظت أن القراءة تتطلب منك جهداً إضافياً مؤخراً. هل تود بعض المساعدة في ذلك؟'],
    listening: ['I’ve noticed lecture videos and listening tasks seem to take extra effort lately. Would you like some help with that?', 'لاحظت أن فيديوهات المحاضرات ومهام الاستماع تتطلب جهداً إضافياً مؤخراً. هل تود بعض المساعدة في ذلك؟'],
    attention: ['I’ve noticed staying focused and getting started seem harder lately. Would you like some help with that?', 'لاحظت أن التركيز وبدء المهام يبدوان أصعب مؤخراً. هل تود بعض المساعدة في ذلك؟'],
    maths: ['I’ve noticed number tasks seem to take extra effort. Would you like some help with that?', 'لاحظت أن مهام الأرقام تتطلب جهداً إضافياً. هل تود بعض المساعدة في ذلك؟'],
    writing: ['I’ve noticed getting ideas into writing seems to take extra effort. Would you like some help with that?', 'لاحظت أن تحويل الأفكار إلى كتابة يتطلب جهداً إضافياً. هل تود بعض المساعدة في ذلك؟'],
    vision: ['I’ve noticed some signs that reading might be uncomfortable on your eyes. Want some help with that?', 'لاحظت بعض العلامات على أن القراءة قد تكون مرهقة لعينيك. هل تود المساعدة؟'],
    wellbeing: ['I’ve noticed some signs that things might feel stressful at the moment. Would you like to talk about it?', 'لاحظت بعض العلامات على أن الأمور قد تكون مرهقة الآن. هل تود الحديث عن ذلك؟'],
    social: ['I’ve noticed group and communication situations might feel hard. Would you like some help with that?', 'لاحظت أن مواقف التواصل والعمل الجماعي قد تكون صعبة. هل تود المساعدة؟']
  };
  ERLY.on('companion:notify', ev => {
    const msg = NOTICE[ev.area]; if (!msg) return;
    U.notice({ en: msg[0], ar: msg[1], smallEn: 'Private — only you see this. You can say no or turn these off.', smallAr: 'خاص — أنت فقط ترى هذا. يمكنك الرفض أو إيقاف هذه الإشعارات.',
      buttons: [{ id: 'yes', en: 'Yes, help me', ar: 'نعم، ساعديني' }, { id: 'later', en: 'Later', ar: 'لاحقاً' }, { id: 'no', en: 'No thanks', ar: 'لا، شكراً' }],
      onPick: async k => {
        if (k === 'later') { ERLY.analyser && ERLY.analyser.snooze(2 * 3600e3); return; }
        if (k !== 'yes') return;
        C.open('chat');
        await waitGreeting();
        const items = (ev.items || []).map(x => '• ' + pick(x.en, x.ar)).join('\n');
        await say(`Of course. Here’s what I noticed:\n${items}\nThat on its own doesn’t mean anything is wrong — lots of things can cause it. What would help most?`, `بالتأكيد. إليك ما لاحظته:\n${items}\nهذا وحده لا يعني أن هناك خطأ — أمور كثيرة قد تسببه. ما الذي سيساعد أكثر؟`);
        const tp = K.TOPICS.find(t => t.area === ev.area);
        offerChips([{ id: 'interview:' + ev.area, en: 'Ask me some questions to understand it', ar: 'اسأليني بعض الأسئلة لفهم الأمر' }, ...(tp ? [{ id: `kb:${tp.id}:support`, en: 'Show me what helps', ar: 'أريني ما يساعد' }] : []), { id: 'call', en: 'Talk it through by voice', ar: 'لنتحدث بالصوت' }]);
      } });
  });
  // a video part that keeps being replayed
  const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  ERLY.on('companion:video', ev => {
    const where = ev.range ? T(` around ${fmtT(ev.range[0])}–${fmtT(ev.range[1])}`, ` حول ${fmtT(ev.range[0])}–${fmtT(ev.range[1])}`) : '';
    U.notice({ en: `I noticed you went back to the same part${where} a few times. Are you having any trouble understanding it?`, ar: `لاحظت أنك عدت إلى الجزء نفسه${where} عدة مرات. هل تواجه صعوبة في فهمه؟`,
      smallEn: 'Just checking in — rewinding is completely normal.', smallAr: 'مجرد اطمئنان — إعادة المقاطع أمر طبيعي تماماً.',
      buttons: [{ id: 'yes', en: 'Yes, a bit', ar: 'نعم، قليلاً' }, { id: 'no', en: 'No, I’m fine', ar: 'لا، أنا بخير' }, { id: 'later', en: 'Later', ar: 'لاحقاً' }],
      onPick: async k => {
        if (k !== 'yes') return;
        C.open('chat'); await waitGreeting();
        await say('Thanks for telling me. What makes that part tricky?', 'شكراً لإخباري. ما الذي يجعل ذلك الجزء صعباً؟');
        chipRow([
          { id: 'fast', en: 'It’s too fast', ar: 'سريع جداً' }, { id: 'words', en: 'Hard words', ar: 'كلمات صعبة' }, { id: 'hear', en: 'Hard to hear clearly', ar: 'صعب السماع بوضوح' },
          { id: 'focus', en: 'I keep losing focus', ar: 'أفقد التركيز باستمرار' }, { id: 'idea', en: 'The idea is complicated', ar: 'الفكرة معقدة' }, { id: 'lang', en: 'The language or accent', ar: 'اللغة أو اللهجة' }
        ], c => videoHelp(c, ev));
      } });
  });
  async function videoHelp(c, ev) {
    bubble('you', pick(c.en, c.ar), { text: true });
    const V = ERLY.videos;
    const map = {
      fast: async () => { V && V.setRate(0.75); await say('I’ve slowed it to 0.75× and jumped back to the start of that part. Slower speech often makes a big difference.', 'أبطأت الفيديو إلى ٠٫٧٥× وعدت إلى بداية ذلك الجزء. الكلام الأبطأ يُحدث فرقاً كبيراً غالباً.'); V && ev.range && V.seek(ev.range[0]); },
      words: async () => { V && V.showNotes(); await say('I’ve opened the key-points notes beside the video — the important terms are explained there.', 'فتحت ملاحظات النقاط الأساسية بجانب الفيديو — المصطلحات المهمة مشروحة هناك.'); },
      hear: async () => { V && V.setRate(0.85); V && V.showNotes(); await say('I’ve slowed it a little and opened the notes so you can read along. If voices often sound unclear to you, a hearing check is worth thinking about.', 'أبطأته قليلاً وفتحت الملاحظات لتقرأ معه. إن كانت الأصوات غالباً غير واضحة لك، ففحص السمع يستحق التفكير.'); },
      focus: async () => { await say('Totally normal with long videos. Try 5-minute chunks: pause after each part and say the main point out loud. I can remind you.', 'طبيعي تماماً مع الفيديوهات الطويلة. جرّب مقاطع من ٥ دقائق: توقف بعد كل جزء وقل الفكرة الرئيسية بصوت عالٍ. يمكنني تذكيرك.'); },
      idea: async () => { V && V.showNotes(); await say('Let’s break it down — the notes beside the video sum up that part in plain steps. Ask me anything about it too.', 'لنبسّطها — الملاحظات بجانب الفيديو تلخص ذلك الجزء بخطوات بسيطة. واسألني أي شيء عنه أيضاً.'); },
      lang: async () => { V && V.setRate(0.85); V && V.showNotes(); await say('Listening in a second language is genuinely harder. I’ve slowed it down and opened the notes; the bilingual glossary can help too.', 'الاستماع بلغة ثانية أصعب فعلاً. أبطأت الفيديو وفتحت الملاحظات؛ ويمكن للمسرد ثنائي اللغة أن يساعد أيضاً.'); }
    };
    await (map[c.id] || map.idea)();
    await say('Did that help?', 'هل ساعد ذلك؟');
    chipRow([{ id: '1', en: 'Yes', ar: 'نعم' }, { id: '0.5', en: 'A bit', ar: 'قليلاً' }, { id: '0', en: 'Not really', ar: 'ليس فعلاً' }], async h => {
      bubble('you', pick(h.en, h.ar), { text: true });
      ERLY.helped && ERLY.helped('video-' + c.id, +h.id);
      const area = c.id === 'focus' ? 'attention' : 'listening';
      await say(+h.id === 1 ? 'Great! Would you like me to ask a few questions about listening and lectures, to understand whether this happens a lot?' : 'Thanks for telling me. Could I ask you a few questions about how lectures and listening usually go? It helps work out the right support.', +h.id === 1 ? 'رائع! هل تود أن أسألك بعض الأسئلة عن الاستماع والمحاضرات، لنفهم إن كان هذا يحدث كثيراً؟' : 'شكراً لإخباري. هل يمكنني أن أسألك بعض الأسئلة عن سير المحاضرات والاستماع عادةً؟ هذا يساعد في تحديد الدعم المناسب.');
      offerChips([{ id: 'interview:' + area, en: 'Okay, ask me', ar: 'حسناً، اسأليني' }, { id: 'no-thanks', en: 'Not now', ar: 'ليس الآن' }]);
    });
  }
  function waitGreeting() { return new Promise(r => setTimeout(r, U.$('#cmpLog') && U.$('#cmpLog').children.length > 1 ? 50 : 900)); }

  // summary entries from interviews (student-owned, editable before sharing)
  function entries() {
    return Object.values(results()).map(r => ({ type: 'interview', en: `${r.name[0].split(' (')[0]}: ${LEVEL[r.level][0]}. ${r.headline[0]}`, ar: `${r.name[1].split(' (')[0]}: ${LEVEL[r.level][1]}. ${r.headline[1]}` }));
  }

  C.brain = { active: () => !!(iv && !iv.done), freeText, answerText, startInterview, renderProfile, entries, chip, reset: () => { history.length = 0; kctx = {}; }, _math: mathOf };
})();
