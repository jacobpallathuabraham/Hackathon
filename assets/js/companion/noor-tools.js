/* ERLY — Noor's tools, study coach and memory.

   Before Noor answers, route() checks whether a tool can do the job better
   than a guess:
     navigate   "open the Growth Plan", "take me to check-ins"…
     resume     "continue where I stopped" — the last reading and study plan
     session    "start a study session" — reopen the reading + focus timer
     coach      "break my lab report into steps" — a checklist with time
                estimates (written by the AI brain when it is on, otherwise
                from study-craft templates), saved on this device
     pdf        "explain this paragraph", "summarise this chapter",
                "define the difficult words", "make it simpler" — uses the
                open reading (only what is on screen, only when asked)
     calc       exact arithmetic, never guessed by a language model
   Tools either answer directly (done) or hand the AI the context they found.

   Memory (opt-in): with the student's yes, Noor remembers a few preferences
   on this device — how detailed explanations should be and which study
   tools helped — and uses them in later answers. Viewable and deletable in
   the Profile tab. Never names, grades, health details or document text. */
(function () {
  'use strict';
  const C = ERLY.companion;
  if (!C || !C._ui) return;
  const U = C._ui, R = ERLY.reader, MD = window.ERLY_MD, AIX = window.ERLY_AI;
  const { T, pick, esc } = U;
  const lang = U.lang;

  /* ---------------- memory ---------------- */
  const MKEY = 'erly-noor-memory-v1';
  const blank = () => ({ consent: null, level: 'standard', likes: [], at: 0 });
  let mem = blank();
  try { mem = Object.assign(blank(), JSON.parse(localStorage.getItem(MKEY) || '{}')); } catch (e) { /* private mode */ }
  const saveMem = () => { mem.at = Date.now(); try { localStorage.setItem(MKEY, JSON.stringify(mem)); } catch (e) { /* ignore */ } };
  const LEVEL = { simple: ['simple, step-by-step explanations with everyday examples', 'شرح بسيط خطوة بخطوة مع أمثلة يومية'], standard: ['clear, balanced explanations', 'شرح واضح ومتوازن'], detailed: ['detailed, in-depth explanations', 'شرح مفصّل ومعمّق'] };
  const LIKE_NAME = { tts: ['read-aloud', 'القراءة الصوتية'], focus: ['line focus', 'تركيز السطر'], spacing: ['extra spacing', 'تباعد إضافي'], bigger: ['bigger text', 'نص أكبر'], calm: ['calm reading layout', 'تنسيق قراءة هادئ'], summary: ['short summaries', 'ملخصات قصيرة'], terms: ['key-word meanings', 'معاني الكلمات'], quiz: ['quick quizzes', 'اختبارات سريعة'], break: ['short breaks', 'استراحات قصيرة'], tint: ['a tinted page', 'صفحة ملونة'], font: ['a reading-friendly font', 'خط مريح'], diagram: ['diagram walk-throughs', 'شرح الرسوم'] };
  // the student's chosen explanation style and personality (Voice settings) — style only, never facts or safety
  const STYLE_P = { concise: 'Keep answers short and to the point.', conversational: 'Be natural and conversational.', detailed: 'Give thorough, detailed explanations with examples.', steps: 'Explain things step by step, one numbered step at a time.' };
  const TONE_P = { friendly: 'friendly and natural', calm: 'calm and reassuring', professional: 'professional', energetic: 'upbeat and energetic', educational: 'clear and educational, like a great tutor', warm: 'warm and chatty', direct: 'concise and direct' };
  const MODE_P = { study: 'Study mode: explain clearly, then check understanding with one short question.', focus: 'Focus mode: be brief and to the point; no small talk.', deep: 'Deep explanation mode: give thorough explanations with examples and intuition.', practice: 'Practice mode: quiz the student one question at a time, wait for their answer, then give kind, specific feedback.', reading: 'Reading companion mode: read and explain the open reading paragraph by paragraph when asked.', research: 'Research mode: help investigate the topic; separate what is well established from what is uncertain, say when information may be out of date, and suggest reliable sources to check. You cannot browse the web yourself.', creative: 'Creative mode: brainstorm freely with several varied ideas, then help develop the best one.', planning: 'Planning mode: break goals into small, practical, time-boxed steps.' };
  const LEN_P = { short: 'Keep answers short (1–2 sentences when spoken).', medium: '', long: 'Longer, fuller answers are welcome.' };
  function stylePrompt() {
    const vs = (U.store.prefs && U.store.prefs().vs) || {};
    const bits = [];
    if (vs.style && STYLE_P[vs.style]) bits.push(STYLE_P[vs.style]);
    if (vs.tone && TONE_P[vs.tone]) bits.push(`Your tone: ${TONE_P[vs.tone]}.`);
    if (vs.mode && MODE_P[vs.mode]) bits.push(MODE_P[vs.mode]);
    if (vs.length && LEN_P[vs.length]) bits.push(LEN_P[vs.length]);
    if (C.inCall) bits.push('Speak naturally, as in a real conversation: vary your phrasing, no formatting, numbers and formulas in words. If the student corrects you or says you misunderstood, acknowledge it briefly and fix it. If you are not sure, say so. If what they said is unclear or ambiguous (speech recognition can mishear), ask one short clarifying question instead of guessing. Understand follow-ups like “explain that again”, “the second point”, “another example”, “shorter”, “simpler” from the conversation so far.' + (vs.style === 'detailed' || vs.style === 'steps' ? ' Up to 5 short sentences is fine.' : ''));
    if (C.inCall && vs.avatar && ERLY.avatars) { const a = ERLY.avatars.get(vs.avatar); if (a && a.name !== 'Noor') bits.push(`In this conversation the student chose the companion "${a.name}"${a.role ? ` (shown as: ${a.role[0]})` : ''} — answer to that name too (you are still the same AI, and you never claim to be a human).`);
      if (a && a.role && /Doctor/.test(a.role[0])) bits.push('This avatar looks like a doctor, but you are an AI: give general health and wellbeing information only. Never diagnose or prescribe; for a personal medical concern, suggest the university health centre or a doctor — only when it is actually relevant, without routine disclaimers.'); }
    return bits.length ? `Student's chosen style: ${bits.join(' ')}` : '';
  }
  function memoryPrompt() {
    const sp = stylePrompt();
    if (mem.consent !== true) return sp;
    const bits = [`prefers ${LEVEL[mem.level][0]}`];
    const likes = mem.likes.map(k => (LIKE_NAME[k] || [k])[0]);
    if (likes.length) bits.push(`finds these helpful: ${likes.join(', ')}`);
    return `Remembered with the student's consent: ${bits.join('; ')}. Adapt to this without mentioning it unless asked.` + (sp ? '\n' + sp : '');
  }
  let pendingMem = null;
  function remember(kind, value) {
    if (mem.consent === false) return;
    if (mem.consent === null) { pendingMem = [kind, value]; return askMemory(); }
    if (kind === 'level') mem.level = value;
    if (kind === 'like' && !mem.likes.includes(value)) mem.likes = mem.likes.concat(value).slice(-8);
    saveMem();
  }
  function askMemory() {
    if (U.$('#cmpLog .cmem-ask')) return;
    const card = document.createElement('div');
    card.className = 'ccard cmem-ask';
    card.innerHTML = `<b>${ICON('brain')} ${T('Shall I remember your preferences?', 'هل أتذكر تفضيلاتك؟')}</b>
      <p>${T('I’d keep only a few study preferences on this device — like how detailed you want explanations and which tools help you — so my answers fit you better next time. You can see or delete them any time in Profile.', 'سأحتفظ فقط ببعض تفضيلات المذاكرة على هذا الجهاز — مثل مدى التفصيل الذي تريده والأدوات التي تساعدك — لتناسبك إجاباتي أكثر. يمكنك رؤيتها أو حذفها في أي وقت من «ملفي».')}</p>
      <div class="ccard__btns"><button type="button" class="btn btn--sm btn--accent" data-mem="yes">${T('Yes, remember', 'نعم، تذكّري')}</button><button type="button" class="btn btn--sm btn--ghost" data-mem="no">${T('No thanks', 'لا شكراً')}</button></div>`;
    card.onclick = e => {
      const b = e.target.closest('[data-mem]'); if (!b) return;
      mem.consent = b.dataset.mem === 'yes'; card.remove();
      if (mem.consent && pendingMem) remember(...pendingMem);
      pendingMem = null; saveMem();
      ERLY.toast && ERLY.toast(mem.consent ? T('Got it — I’ll remember.', 'حسناً — سأتذكر.') : T('Okay — I won’t remember anything.', 'حسناً — لن أتذكر شيئاً.'));
    };
    U.$('#cmpLog').appendChild(card); U.scrollLog();
  }
  // learn from what the student says and which tools helped
  function learn(text) {
    if (/\b(simpler|easier|too (hard|complicated|long)|explain (it )?like i'?m|eli5|in simple words|baby steps)\b|بشكل أبسط|ببساطة/i.test(text)) remember('level', 'simple');
    else if (/\b(more detail|in depth|in-depth|detailed|go deeper|technical)\b|بالتفصيل|أعمق/i.test(text)) remember('level', 'detailed');
  }
  if (ERLY.on) ERLY.on('noor:helped', ev => { if (ev && ev.value >= 0.5 && LIKE_NAME[ev.tool]) remember('like', ev.tool); });
  const helpedOrig = ERLY.helped;
  ERLY.helped = (tool, v) => { try { helpedOrig && helpedOrig(tool, v); } finally { if (v >= 0.5 && LIKE_NAME[tool]) remember('like', tool); } };

  function renderMemory(pane) {
    if (!pane) return;
    let box = pane.querySelector('.cmem');
    if (!box) { box = document.createElement('div'); box.className = 'cmem'; pane.insertBefore(box, pane.firstChild); }
    const on = mem.consent === true;
    box.innerHTML = `<div class="cmem__h"><b>${ICON('brain')} ${T('Noor’s memory', 'ذاكرة نور')}</b><label class="switch-row"><span><small>${on ? T('On — kept on this device', 'مفعّلة — على هذا الجهاز') : T('Off', 'متوقفة')}</small></span><input type="checkbox" data-mem="toggle" ${on ? 'checked' : ''}><i></i></label></div>
      ${on ? `<p class="cmem__k">${T('Explanations', 'الشرح')}</p><div class="cmem__lv">${['simple', 'standard', 'detailed'].map(k => `<button type="button" data-mem="lv:${k}" class="${mem.level === k ? 'is-on' : ''}">${pick(...{ simple: ['Simple', 'بسيط'], standard: ['Standard', 'عادي'], detailed: ['Detailed', 'مفصّل'] }[k])}</button>`).join('')}</div>
        <p class="cmem__k">${T('What helps you', 'ما يساعدك')}</p>${mem.likes.length ? `<div class="cmem__likes">${mem.likes.map(k => `<span>${esc(pick(...(LIKE_NAME[k] || [k, k])))}<button type="button" data-mem="rm:${esc(k)}" aria-label="${T('Forget', 'انسَ')}">×</button></span>`).join('')}</div>` : `<small class="muted">${T('Nothing yet — tell me when a tool helps.', 'لا شيء بعد — أخبرني عندما تساعدك أداة.')}</small>`}
        <button type="button" class="btn btn--xs btn--quiet" data-mem="clear">${ICON('trash')} ${T('Forget everything', 'انسَ كل شيء')}</button>`
        : `<small class="muted">${T('Turn on to let Noor adapt explanations and suggestions to you. Only study preferences — never names, grades or document text.', 'فعّلها لتكيّف نور الشرح والاقتراحات لك. تفضيلات المذاكرة فقط — لا أسماء ولا درجات ولا نصوص مستندات.')}</small>`}`;
    box.onclick = box.onchange = e => {
      const el = e.target.closest('[data-mem]'); if (!el) return;
      const k = el.dataset.mem;
      if (k === 'toggle' && e.type === 'change') { mem.consent = el.checked; if (!el.checked) mem = Object.assign(blank(), { consent: false }); saveMem(); }
      else if (e.type !== 'click') return;
      if (k.startsWith('lv:')) { mem.level = k.slice(3); saveMem(); }
      if (k.startsWith('rm:')) { mem.likes = mem.likes.filter(x => x !== k.slice(3)); saveMem(); }
      if (k === 'clear') { mem = Object.assign(blank(), { consent: false }); saveMem(); }
      renderMemory(pane);
    };
  }

  /* ---------------- navigation ---------------- */
  const PLACES = [
    [/reading studio|library|\bpdf\b|\breading(s)?\b|my book/i, 'studio', ['the Reading Studio', 'استوديو القراءة']],
    [/daily quest|check-?ins?|\bgames?\b|\bquest\b/i, 'checkins', ['the Daily Quest', 'المهمة اليومية']],
    [/growth plan|\bskills? plan\b/i, 'growth', ['your Growth Plan', 'خطة النمو']],
    [/insight/i, '#insight', ['your insight', 'رؤيتك']],
    [/support pact|tracking/i, '#tracking', ['the Support Pact', 'ميثاق الدعم']],
    [/videos?|lectures?/i, '#videos', ['the lecture videos', 'فيديوهات المحاضرات']],
    [/get support|book (a |an )?(sas|appointment|counsel)|hand-?off|appointment/i, '#handoff', ['getting support', 'الحصول على الدعم']],
    [/start-?ramp|first step|deadline tools/i, '#ramp', ['the Start-Ramp', 'أدوات البدء']],
    [/handwriting/i, 'hand', ['the handwriting check', 'فحص الكتابة']],
    [/(my )?profile/i, 'tab:profile', ['your profile', 'ملفك']],
    [/signals|privacy settings|my data/i, 'tab:signals', ['your signals and privacy', 'إشاراتك وخصوصيتك']],
    [/my summary/i, 'tab:summary', ['your summary', 'ملخصك']]
  ];
  function go(where) {
    if (where === 'studio') { U.closePanel && U.closePanel(); R.openLibrary(); return; }
    if (where === 'checkins') { location.href = 'checkins.html'; return; }
    if (where === 'growth') { location.href = 'support.html'; return; }
    if (where === 'hand') { ERLY.emit('hand:open', { from: 'noor' }); return; }
    if (where.startsWith('tab:')) { U.setTab(where.slice(4)); return; }
    const el = document.querySelector(where);
    if (el) { if (R.isOpen()) R.close && R.close(); U.closePanel && U.closePanel(); setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350); }
    else location.href = 'student.html' + where;
  }

  /* ---------------- resume & study session ---------------- */
  const CKEY = 'erly-coach-v1';
  const plans = () => { try { return JSON.parse(localStorage.getItem(CKEY) || '[]'); } catch (e) { return []; } };
  const savePlans = p => { try { localStorage.setItem(CKEY, JSON.stringify(p.slice(0, 6))); } catch (e) { /* ignore */ } };
  function lastReading() {
    try {
      const db = JSON.parse(localStorage.getItem('erly-studio-v1') || '{}'), prog = db.prog || {};
      const best = Object.entries(prog).sort((a, b) => (b[1].at || 0) - (a[1].at || 0))[0];
      if (!best) return null;
      const d = (R.docs ? R.docs() : []).find(x => x.id === best[0]);
      return d ? { id: d.id, title: d.title, frac: best[1].frac || 0 } : null;
    } catch (e) { return null; }
  }
  async function resume() {
    const r = lastReading(), p = plans().find(x => x.steps.some(s => !s.done));
    if (!r && !p) {
      await U.aiSays('There’s nothing to resume yet. Open a reading or ask me to break an assignment into steps, and I’ll remember where you got to.', 'لا يوجد ما نستأنفه بعد. افتح قراءة أو اطلب مني تقسيم واجب إلى خطوات، وسأتذكر أين وصلت.');
      return;
    }
    if (p) await showPlan(p, T('Here’s where you left off:', 'هذا ما وصلت إليه:'));
    if (r) {
      await U.aiSays(`Your last reading was ${r.title} — ${Math.round(r.frac * 100)}% read. Want to jump back in?`, `آخر قراءة كانت ${r.title} — قرأت ${Math.round(r.frac * 100)}٪. هل تريد العودة إليها؟`);
      U.chipRow([{ id: 'open', en: 'Open it where I stopped', ar: 'افتحها حيث توقفت', icon: 'book' }, { id: 'session', en: 'Start a 25-min study session', ar: 'ابدأ جلسة مذاكرة ٢٥ دقيقة', icon: 'timer' }], c => {
        U.bubble('you', pick(c.en, c.ar), { text: true });
        R.openDoc(r.id);
        if (c.id === 'session') setTimeout(() => R.act('timer'), 900);
        U.closePanel && U.closePanel();
      });
    }
  }
  async function session() {
    const r = lastReading();
    if (r) R.openDoc(r.id); else R.openLibrary();
    setTimeout(() => R.act('timer'), 900);
    U.closePanel && U.closePanel();
    ERLY.toast && ERLY.toast(T('Study session started — 25 minutes of focus, then a 5-minute break.', 'بدأت جلسة المذاكرة — ٢٥ دقيقة تركيز ثم ٥ دقائق راحة.'));
  }

  /* ---------------- study coach ---------------- */
  const TEMPLATES = [
    [/lab report|lab/i, [['Read the brief and the marking rubric', 10], ['Collect your raw data and results in one place', 15], ['Make the graphs and tables (rough is fine)', 25], ['Write the method in plain bullet points', 15], ['Write the results — what the numbers show', 20], ['Discussion: why, errors and improvements', 25], ['Introduction and conclusion last', 20], ['Check units, references and formatting, then submit', 15]]],
    [/essay|report|paper|assignment|coursework/i, [['Read the question and underline the key words', 10], ['Brain-dump everything you know (5 minutes, no editing)', 10], ['Find 3–4 sources and note one quote from each', 30], ['Write a one-line answer to the question (your thesis)', 5], ['Outline: one bullet per paragraph', 15], ['Draft the body paragraphs — ugly first drafts are fine', 45], ['Write the introduction and conclusion', 20], ['Edit for clarity, then check references and submit', 20]]],
    [/presentation|slides|pitch/i, [['Write the one sentence you want people to remember', 5], ['List 5–7 slide titles as a story', 10], ['Draft each slide with one idea and one visual', 40], ['Write speaker notes in short bullets', 20], ['Rehearse once with a timer', 15], ['Fix the slowest parts and rehearse again', 15]]],
    [/exam|test|midterm|final|quiz/i, [['List every topic and rate it 🙂 😐 😟', 10], ['Start with the hardest topic: read, close the book, recall', 30], ['Make flashcards for key terms', 20], ['Do one past paper, timed', 60], ['Mark it and list every mistake', 20], ['Re-learn the mistakes, then a short mixed quiz', 30]]],
    [/code|program|coding|project|app|website/i, [['Write what the program must do in 3 sentences', 10], ['Break it into small functions or features', 15], ['Build the smallest working version first', 45], ['Test it with 3 example inputs', 15], ['Add the remaining features one at a time', 45], ['Clean up, comment and submit', 20]]],
    [/read|chapter|article|pages/i, [['Skim headings, figures and the summary first', 10], ['Read one section with read-aloud or line focus', 20], ['Write 3 key points in your own words', 10], ['Repeat for the next sections', 40], ['Make 5 flashcards from the key terms', 15]]]
  ];
  const GENERIC = [['Write down exactly what “done” looks like', 5], ['List everything that needs to happen', 10], ['Pick the smallest first step and do only that', 10], ['Work in 25-minute blocks with 5-minute breaks', 50], ['Review what’s left and re-plan', 10], ['Finish, check and submit', 20]];
  function template(task) { const t = TEMPLATES.find(x => x[0].test(task)); return (t ? t[1] : GENERIC).map(([t2, m]) => ({ t: t2, m })); }
  function parseSteps(out) {
    return String(out || '').split('\n').map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*(?:\[\s?\]\s*)?/, '').trim()).filter(Boolean).map(l => {
      const m = l.match(/^(.*?)\s*[|–—-]\s*(\d{1,3})\s*(?:min|minutes|m)?\s*$/i) || l.match(/^(.*?)\s*\((\d{1,3})\s*(?:min|minutes|m)\)\s*$/i);
      return m ? { t: m[1].replace(/\*\*/g, '').trim(), m: +m[2] } : { t: l.replace(/\*\*/g, ''), m: 15 };
    }).filter(s => s.t.length > 3 && s.t.length < 160).slice(0, 10);
  }
  async function coach(text) {
    const task = text.replace(/^(please\s+)?(can you\s+)?(help me\s+)?(to\s+)?(break|split|turn|organi[sz]e|plan|start|get started)(\s+(down|on|with))?\s*/i, '').replace(/\s+(into|in)\s+(small(er)?\s+)?(steps|tasks|parts)\b.*$/i, '').trim() || text;
    let steps = null, by = 'templates';
    if (U.ai && U.ai.ready()) {
      U.setStatus('thinking');
      try {
        const msgs = AIX.buildMessages([], `Break this student task into 5 to 8 small, concrete steps in order, each doable in one sitting, with a realistic time in minutes. Reply ONLY with lines exactly like: - step | minutes\nTask: ${task}`, { lang: lang() });
        const out = await U.ai.generate(msgs, {});
        const s2 = parseSteps(out); if (s2.length >= 3) { steps = s2; by = 'ai'; }
      } catch (e) { /* busy or offline: templates below */ }
      U.setStatus('idle');
    }
    if (!steps) steps = template(task);
    const plan = { id: 'p' + Date.now().toString(36), title: task.slice(0, 90), by, at: Date.now(), steps: steps.map(s => ({ t: s.t, m: s.m, done: false })) };
    savePlans([plan].concat(plans().filter(p => p.title !== plan.title)));
    await showPlan(plan, T('Here’s your plan — tick steps off as you go. I’ll remember where you stopped.', 'إليك خطتك — ضع علامة على كل خطوة تنجزها. سأتذكر أين توقفت.'));
  }
  function planHTML(p) {
    const done = p.steps.filter(s => s.done).length, total = p.steps.reduce((a, s) => a + s.m, 0);
    const next = p.steps.findIndex(s => !s.done);
    return `<div class="ccoach" data-plan="${p.id}">
      <div class="ccoach__h"><span class="ccoach__ic">${ICON('target')}</span><div><b>${esc(p.title)}</b><small>${p.steps.length} ${T('steps', 'خطوات')} · ≈ ${Math.round(total / 5) * 5} ${T('min', 'د')} · ${p.by === 'ai' ? T('planned by AI', 'خطة بالذكاء الاصطناعي') : T('study-coach plan', 'خطة مدرب المذاكرة')}</small></div></div>
      <div class="ccoach__bar"><i style="--p:${done / p.steps.length}"></i></div>
      <ol class="ccoach__list">${p.steps.map((s, i) => `<li class="${s.done ? 'is-done' : ''}${i === next ? ' is-next' : ''}" style="--i:${i}"><button type="button" data-step="${i}" aria-pressed="${s.done}" aria-label="${T('Done', 'تم')}">${ICON('check')}</button><span>${esc(s.t)}</span><em class="mono">${s.m}′</em></li>`).join('')}</ol>
      ${next < 0 ? `<p class="ccoach__win">${ICON('star')} ${T('All done — brilliant work!', 'أنجزت كل شيء — عمل رائع!')}</p>` : `<div class="ccoach__acts"><button type="button" class="btn btn--sm btn--accent" data-cstart>${ICON('play')} ${T('Start step', 'ابدأ الخطوة')} ${next + 1} · ${p.steps[next].m}′</button><span class="ccoach__timer mono" hidden></span></div>`}
    </div>`;
  }
  async function showPlan(p, line) {
    const m = await U.aiSays(line, line, { speak: false });
    const box = document.createElement('div');
    box.innerHTML = planHTML(p);
    m.querySelector('.cmsg__b').appendChild(box.firstElementChild);
    U.scrollLog();
  }
  let tick = null;
  document.addEventListener('click', e => {
    const card = e.target.closest('.ccoach'); if (!card) return;
    const all = plans(), p = all.find(x => x.id === card.dataset.plan); if (!p) return;
    const st = e.target.closest('[data-step]');
    if (st) {
      const i = +st.dataset.step; p.steps[i].done = !p.steps[i].done; savePlans(all);
      card.outerHTML = planHTML(p);
      if (p.steps.every(s => s.done) && window.FUN) { FUN.confetti(document.querySelector(`.ccoach[data-plan="${p.id}"]`)); FUN.sfx.win(); }
      else if (p.steps[i].done && window.FUN) FUN.sfx.good();
      return;
    }
    if (e.target.closest('[data-cstart]')) {
      const i = p.steps.findIndex(s => !s.done), secs0 = Math.min(p.steps[i].m, 50) * 60;
      const tEl = card.querySelector('.ccoach__timer'); tEl.hidden = false;
      clearInterval(tick); let left = secs0;
      const show = () => { tEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; };
      show(); tick = setInterval(() => { left--; show(); if (left <= 0) { clearInterval(tick); ERLY.toast && ERLY.toast(T('Time! Tick the step off if it’s done — or take a 5-minute break.', 'انتهى الوقت! ضع علامة إن أنجزت الخطوة — أو خذ استراحة ٥ دقائق.')); window.FUN && FUN.sfx.win(); } }, 1000);
      ERLY.toast && ERLY.toast(T(`Step ${i + 1} started — just this one thing.`, `بدأت الخطوة ${i + 1} — هذا الشيء فقط.`));
    }
  });

  /* ---------------- the router ---------------- */
  const has = (re, t) => re.test(t);
  async function route(text) {
    const t = text.trim();
    learn(t);
    // exact maths
    const math = C.brain && C.brain._math && C.brain._math(t);
    if (math) return { done: false, math };
    // navigation
    if (has(/^(please\s+)?(open|go to|take me to|show me|bring up|navigate to|launch|where('s| is)|how do i (get to|find|open))\b/i, t)) {
      const p = PLACES.find(x => x[0].test(t));
      if (p) { trace(['Navigate']); await U.aiSays(`Opening ${p[2][0]}…`, `جارٍ فتح ${p[2][1]}…`, { speak: !C.inCall }); setTimeout(() => go(p[1]), 500); return { done: true }; }
    }
    // resume / study session
    if (has(/\b(resume|continue|pick up|carry on|get back to)\b.*\b(reading|where|stopped|left|studying|study|plan)\b|where (did )?i (left off|stop(ped)?)|أكمل من حيث|استأنف/i, t)) { trace(['Resume']); await resume(); return { done: true }; }
    if (has(/\b(start|begin)\b.{0,20}\b(study|focus|revision) (session|block)\b|\bpomodoro session\b|ابدأ جلسة/i, t)) { trace(['Study session']); await session(); return { done: true }; }
    // study coach
    if (has(/\bbreak\b.{0,40}\bdown\b|\b(split|turn|divide)\b.{0,40}\b(steps|tasks|parts)\b|\b(organi[sz]e|plan out|plan)\b.{0,12}\b(my|this|the)\b.{0,20}\b(assignment|essay|project|report|presentation|coursework|lab)\b|\bhelp me (start|get started)\b|قسّم|قسم الواجب/i, t)) { trace(['Study coach']); await coach(t); return { done: true }; }
    // ask your PDF
    if (R && R.isOpen() && has(/\b(explain|simplif|simpler|easier|summar|define|definition|difficult words|hard words|key (words|terms)|meaning|translate|rewrite|quiz|questions)\b|اشرح|لخص|عرّف|بسّط/i, t) && has(/\b(paragraph|page|chapter|this|passage|section|reading|pdf|document|text|words|it|that)\b|هذه|هذا|الفقرة|الفصل/i, t)) {
      const whole = /\b(chapter|whole|entire|all of|document|pdf|reading)\b|الفصل|كامل/i.test(t);
      const k = R.currentPara(), ctx = R.contextFor(k);
      if (whole) { const d = R.doc; ctx.heading = T('whole reading', 'القراءة كاملة'); ctx.text = d.pages.map(p => '## ' + p.h + '\n' + p.paras.map(x => x.text.replace(/\[([^\]]+)\]/g, '$1')).join('\n')).join('\n\n').slice(0, 7000); }
      else if (k && /\b(paragraph|passage|this|it|that)\b/i.test(t)) ctx.quote = ctx.quote || R.paraOf(k).p.text.replace(/\[([^\]]+)\]/g, '$1');
      U.attach(ctx);
      return { done: false, reading: ctx, tools: [whole ? 'Read the whole PDF' : 'Read this page'], pdf: { whole, define: /\b(define|definition|difficult|hard|key) (words|terms)?|meaning|عرّف/i.test(t), k } };
    }
    return null;
  }
  // a small "tools used" line in the chat
  function trace(names) {
    const el = document.createElement('div');
    el.className = 'ctrace';
    el.innerHTML = `${ICON('chip')} <span>${T('Used', 'استخدمت')}: ${names.map(esc).join(' · ')}</span>`;
    U.$('#cmpLog').appendChild(el); U.scrollLog();
  }
  // without an AI brain: answer PDF requests from the reading itself
  async function pdfLocal(r) {
    const d = R.doc;
    if (r.pdf.define) {
      const pg = d.pages[R.currentPage()] || d.pages[0];
      const terms = [...new Set(pg.paras.flatMap(p => (p.text.match(/\[([^\]]+)\]/g) || []).map(x => x.slice(1, -1))))].map(t => [t, d.terms[t] || d.terms[t.toLowerCase()]]).filter(x => x[1]);
      const md = terms.length ? `### ${T('Key words on this page', 'كلمات أساسية في هذه الصفحة')}\n${terms.map(([t, v]) => `- **${t}** — ${v[0]} _(${v[1]})_`).join('\n')}` : T('This page has no glossary words. Select any word in the reader and tap **Define**.', 'لا توجد كلمات من المسرد في هذه الصفحة. حدّد أي كلمة واضغط **عرّف**.');
      return U.aiSays(md, md, { html: `<div class="md">${MD.render(md)}</div>`, sayText: MD.toText(md), tag: T('From this reading', 'من هذه القراءة') });
    }
    const pages = r.pdf.whole ? d.pages : [d.pages[R.currentPage()] || d.pages[0]];
    const md = pages.map(pg => { const pi = d.pages.indexOf(pg); return `### ${pg.h}\n` + pg.paras.filter(p => !p.sub).map((p, j) => '- ' + R.paraSummary(`${pi}-${j}`)[0]).join('\n'); }).join('\n\n');
    return U.aiSays(md, md, { html: `<div class="md">${MD.render(md)}</div>`, sayText: MD.toText(md), tag: d.uploaded ? T('Auto summary from your file', 'ملخص تلقائي من ملفك') : T('From the course team’s notes', 'من ملاحظات فريق المادة') });
  }

  /* ---------------- quick actions (welcome screen) ---------------- */
  async function quick(id) {
    const B = C.brain;
    if (id === 'voice') return ERLY.emit('noor:call');
    if (id === 'pdf') {
      if (R.isOpen()) { U.bubble('you', T('Explain this paragraph simply', 'اشرحي هذه الفقرة ببساطة'), { text: true }); return B.freeText(T('Explain this paragraph simply', 'اشرحي هذه الفقرة ببساطة'), { silentUser: true }); }
      U.closePanel && U.closePanel(); return R.openLibrary();
    }
    if (id === 'coach') {
      await U.aiSays('Tell me the assignment and when it’s due — for example “lab report on enzymes, due Thursday” — and I’ll turn it into small steps.', 'أخبرني بالواجب وموعد تسليمه — مثل «تقرير مختبر عن الإنزيمات، يوم الخميس» — وسأقسمه إلى خطوات صغيرة.');
      const f = U.$('#cmpText'); f.value = T('Break down my ', 'قسّمي '); f.focus(); U.composer(); return;
    }
    if (id === 'resume') { U.bubble('you', T('Resume where I stopped', 'أكمل من حيث توقفت'), { text: true }); trace(['Resume']); return resume(); }
    if (id === 'explain') { const f = U.$('#cmpText'); f.value = T('Explain ', 'اشرحي '); f.focus(); U.composer(); return; }
    if (id === 'plan') { U.bubble('you', T('Make me a 7-day exam study plan', 'اصنعي لي خطة مذاكرة للامتحانات ٧ أيام'), { text: true }); return B.freeText('Make me a 7-day exam study plan', { silentUser: true }); }
  }

  C.tools = { route, pdfLocal, trace, memoryPrompt, renderMemory, quick, resume, coach, memory: () => Object.assign({}, mem), _parse: parseSteps };
})();
