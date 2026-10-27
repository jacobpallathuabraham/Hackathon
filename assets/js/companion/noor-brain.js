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

  /* ---------------- free-form, knowledgeable chat ---------------- */
  async function freeText(text, o = {}) {
    if (!o.silentUser) bubble('you', text, { text: true });
    clearChips();
    history.push({ role: 'user', text });
    const a = K.answer(text, lang(), kctx);
    if (a.kind === 'crisis') return crisis();
    remember(a);
    let reply = null;
    if (U.llm.active().external && (a.kind === 'answer' || a.kind === 'unknown' || a.kind === 'self-check')) {
      U.setStatus('thinking');
      const r = await U.llm.chat({ question: text, context: K.context(text, lang()), history, lang: lang() });
      if (r.reply) reply = r.reply;
    }
    if (reply) await say(reply, reply, { tag: T('AI model · grounded on ERLY’s guide', 'نموذج ذكاء اصطناعي · مستند إلى دليل إيرلي') });
    else if (a.kind === 'answer') await sayKB(a);
    else await say(a.en, a.ar);
    history.push({ role: 'assistant', text: reply || pick(a.en, a.ar) });
    if (history.length > 12) history.splice(0, history.length - 12);
    offerChips(a.chips && a.chips.length ? a.chips : [{ id: 'hard', en: 'Something feels hard', ar: 'شيء ما يبدو صعباً' }, { id: 'kb:assessment:what', en: 'How do assessments work?', ar: 'كيف تعمل التقييمات؟' }]);
  }
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
    if (id === 'topics') return freeText('what can you answer?', { silentUser: true });
    if (id === 'hard') return freeText('I feel like something is hard for me', { silentUser: true });
    if (id === 'profile') return U.setTab('profile');
    if (id === 'summary') return U.setTab('summary');
    if (id === 'assess') return chip({ id: 'kb:assessment:what', en: '', ar: '' });
    if (id === 'call') return ERLY.emit('noor:call');
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
      <p class="cmp-lead">${T('Everything ERLY has noticed across the site — Check-ins, lecture videos, the Reading Studio and your 28-day tracking — plus anything we’ve talked through. An area only rises when different sources agree.', 'كل ما لاحظه إيرلي عبر الموقع — الفحوصات، وفيديوهات المحاضرات، واستوديو القراءة، والتتبّع لـ٢٨ يوماً — إضافة إلى ما تحدثنا عنه. لا يرتفع مجال إلا عندما تتفق مصادر مختلفة.')}</p>
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
      <div class="ccard__btns"><a class="btn btn--xs btn--ghost" href="checkins.html">${ICON('target')} ${T('Do today’s check-ins', 'أنجز فحوصات اليوم')}</a><a class="btn btn--xs btn--ghost" href="#videos" data-close-cmp>${ICON('volume')} ${T('Lecture videos', 'فيديوهات المحاضرات')}</a></div>
      <p class="muted cmp-small">${T('Evidence levels decide when Noor offers to talk — they are not a diagnosis, and never a percentage.', 'مستويات الدلائل تحدد متى تعرض نور الحديث — وليست تشخيصاً، ولا نسبة مئوية أبداً.')}</p>`;
    pane.onclick = e => {
      const b = e.target.closest('[data-iv]');
      if (b) { U.setTab('chat'); startInterview(b.dataset.iv, 'profile'); }
      if (e.target.closest('[data-close-cmp]')) C.close();
    };
  }

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

  C.brain = { active: () => !!(iv && !iv.done), freeText, answerText, startInterview, renderProfile, entries, chip };
})();
