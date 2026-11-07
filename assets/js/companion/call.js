/* ERLY — talk with Noor: a continuous, hands-free voice conversation with a
   virtual companion (avatar) whose lips follow the words being spoken.

   How it works (all in the browser):
   - Listening: the browser's speech recognition, with live partial words and
     an end-of-turn pause the student can set. After Noor answers she starts
     listening again by herself, so there is nothing to keep tapping.
   - Interrupting: tap the avatar, press Space, or just start talking
     ("interrupt by talking" watches the microphone level against the echo of
     Noor's own voice). Noor stops at once, the half-written answer is
     cancelled, and she listens.
   - Speaking: the browser's own voices, chosen and tuned by the student.
     Lip-sync uses the voice's word timing (see lipsync.js).
   - iPad / iPhone: Safari may only start the microphone from a tap. Noor tries
     hands-free first and, if Safari refuses, switches to tap-to-talk.

   Privacy: it only starts when the student starts a voice conversation and
   agrees to the microphone; a red "mic on" light shows while listening; mute,
   pause and end are always on screen; the mic is released when it ends; no
   audio is recorded or stored — only the recognised words appear in the chat. */
(function () {
  'use strict';
  const C = ERLY.companion;
  if (!C || !C._ui) return;
  const U = C._ui;
  const { T, pick, esc } = U;
  const AV = ERLY.avatars;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const v = U.voice;
  const VX = window.ERLY_VOICE;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const SAFARI = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(ua);

  /* ---------------- settings ---------------- */
  const DEF = { avatar: 'noor', gender: 'f', rate: 1, pitch: 1, volume: 1, style: 'conversational', tone: 'friendly', quiet: 'normal', handsFree: true, barge: !SAFARI, captions: true, capSize: 'm', contrast: false, setup: false };
  const cfg = () => Object.assign({}, DEF, U.store.prefs().vs || {});
  const save = patch => { U.store.setPref('vs', Object.assign(cfg(), patch)); };
  const QUIET = { short: 750, normal: 1150, long: 1900 };
  const STYLES = [['concise', 'Concise', 'مختصر'], ['conversational', 'Conversational', 'حواري'], ['detailed', 'Detailed', 'مفصّل'], ['steps', 'Step by step', 'خطوة بخطوة']];
  const TONES = [['friendly', 'Friendly & natural', 'ودود وطبيعي'], ['calm', 'Calm & reassuring', 'هادئ ومطمئن'], ['professional', 'Professional', 'مهني'], ['energetic', 'Energetic', 'نشيط'], ['educational', 'Clear & educational', 'واضح وتعليمي'], ['warm', 'Warm & chatty', 'دافئ وحواري'], ['direct', 'Concise & direct', 'مباشر']];

  const el = document.createElement('div');
  el.className = 'ncall'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  document.body.appendChild(el);
  const $ = s => el.querySelector(s);

  const st = { on: false, queue: [], speaking: false, listening: false, paused: false, muted: false, idleT: null, thinkT: null, misses: 0, net: 0, stream: null, ac: null, raf: 0, level: 0, echo: 0, loudSince: 0, tapOnly: false, blocked: false, ignore: false, log: [], turn: null, lastReply: '', avatar: null, unPhrase: null, state: 'idle' };

  /* ---------------- layout ---------------- */
  function render() {
    const c = cfg();
    el.setAttribute('aria-label', T('Voice conversation with Noor', 'محادثة صوتية مع نور'));
    el.classList.toggle('is-contrast', !!c.contrast);
    el.dataset.cap = c.capSize;
    const brain = U.ai ? pick(U.ai.label().en, U.ai.label().ar) : '';
    const a = AV.get(c.avatar);
    el.innerHTML = `
      <div class="ncall__bg" aria-hidden="true"><i></i><i></i><i></i></div>
      <header class="ncall__top">
        <span class="ncall__live" id="ncLive"><i></i><span>${T('Mic off', 'الميكروفون متوقف')}</span></span>
        <div class="ncall__seg" role="group" aria-label="${T('Conversation style', 'أسلوب المحادثة')}">
          <button type="button" data-m="care" aria-pressed="${C.callMode !== 'chat'}">${ICON('stetho')} ${T('Check-in', 'جلسة اطمئنان')}</button>
          <button type="button" data-m="chat" aria-pressed="${C.callMode === 'chat'}">${ICON('sparkle')} ${T('Ask anything', 'اسأل أي شيء')}</button>
        </div>
        <div class="ncall__tools">
          <button type="button" class="ncall__ic" id="ncLogBtn" aria-label="${T('Transcript', 'النص المكتوب')}" title="${T('Transcript', 'النص المكتوب')}">${ICON('list')}</button>
          <button type="button" class="ncall__ic" id="ncSet" aria-label="${T('Avatar, voice and settings', 'الشخصية والصوت والإعدادات')}" title="${T('Avatar, voice and settings', 'الشخصية والصوت والإعدادات')}">${ICON('more')}</button>
        </div>
      </header>
      <main class="ncall__main">
        <div class="ncall__stage">
          <div class="ncall__glow" aria-hidden="true"></div>
          <div class="ncall__viz" aria-hidden="true">${Array.from({ length: 40 }, (_, i) => `<i style="--k:${i};--h:${(1.2 + Math.sin(i * 1.7) * 0.8).toFixed(2)}"></i>`).join('')}</div>
          <button type="button" class="ncall__orb" id="ncOrb" aria-label="${T('Tap to interrupt, talk, or send what you said', 'انقر للمقاطعة أو التحدث أو الإرسال')}"><div class="ncall__avatar" id="ncAvatar"></div></button>
        </div>
        <div class="ncall__who"><b id="ncName">${esc(a.name)}</b><span class="ncall__tag">${ICON('sparkle')} ${T('AI companion · virtual', 'رفيق ذكاء اصطناعي · افتراضي')}</span><span class="ncall__mode">${esc(brain)}</span></div>
        <p class="ncall__state" id="ncState" aria-live="polite"></p>
        <div class="ncall__caps" ${c.captions ? '' : 'hidden'}>
          <p class="ncall__noor" id="ncNoor"></p>
          <p class="ncall__you" id="ncYou"></p>
        </div>
        <div class="ncall__chips" id="ncChips"></div>
        <div class="ncall__consent" id="ncConsent" hidden></div>
      </main>
      <form class="ncall__type" id="ncForm" hidden><input id="ncInput" autocomplete="off" placeholder="${T('Type to Noor — she’ll answer out loud', 'اكتب لنور — ستجيب بصوت عالٍ')}" aria-label="${T('Type a message', 'اكتب رسالة')}"><button type="submit" class="ncall__ic" aria-label="${T('Send', 'إرسال')}">${ICON('send')}</button></form>
      <footer class="ncall__bar">
        <div class="ncall__btns">
          <button type="button" class="ncall__btn" id="ncMute" aria-pressed="false" aria-label="${T('Mute microphone', 'كتم الميكروفون')}" title="${T('Mute (M)', 'كتم (M)')}">${MIC_ICON}</button>
          <button type="button" class="ncall__btn" id="ncPause" aria-pressed="false" aria-label="${T('Pause conversation', 'إيقاف المحادثة مؤقتاً')}" title="${T('Pause (P)', 'إيقاف مؤقت (P)')}">${ICON('pause')}</button>
          <button type="button" class="ncall__btn ncall__btn--end" id="ncEnd" aria-label="${T('End the conversation', 'إنهاء المحادثة')}">${ICON('x')}</button>
          <button type="button" class="ncall__btn" id="ncReplay" aria-label="${T('Replay the last answer', 'إعادة آخر إجابة')}" title="${T('Replay', 'إعادة')}">${ICON('reset')}</button>
          <button type="button" class="ncall__btn" id="ncType" aria-pressed="false" aria-label="${T('Type instead', 'الكتابة بدلاً من ذلك')}" title="${T('Type', 'كتابة')}">${ICON('keyboard')}</button>
        </div>
        <p class="ncall__fine">${T(`${esc(a.name)} is an AI companion with a virtual face — not a real person. The microphone listens only while this screen is open and the mic light is on. No audio is recorded.`, 'نور رفيقة ذكاء اصطناعي بوجه افتراضي. تستمع فقط أثناء فتح هذه الشاشة وإضاءة مؤشر الميكروفون. لا يُسجَّل أي صوت.')}</p>
      </footer>
      <aside class="ncall__log" id="ncLog" hidden aria-label="${T('Transcript', 'النص المكتوب')}">
        <div class="ncall__logh"><b>${T('Transcript', 'النص المكتوب')}</b><div><button type="button" class="ncall__ic" data-lg="copy" title="${T('Copy', 'نسخ')}" aria-label="${T('Copy transcript', 'نسخ النص')}">${ICON('copy')}</button><button type="button" class="ncall__ic" data-lg="save" title="${T('Download', 'تنزيل')}" aria-label="${T('Download transcript', 'تنزيل النص')}">${ICON('download')}</button><button type="button" class="ncall__ic" data-lg="clear" title="${T('Clear', 'مسح')}" aria-label="${T('Clear transcript', 'مسح النص')}">${ICON('trash')}</button><button type="button" class="ncall__ic" data-lg="close" aria-label="${T('Close', 'إغلاق')}">${ICON('x')}</button></div></div>
        <ol id="ncLogList"></ol>
      </aside>
      <section class="nstudio" id="ncStudio" hidden></section>`;
    $('#ncOrb').onclick = interrupt;
    $('#ncEnd').onclick = end;
    $('#ncMute').onclick = toggleMute;
    $('#ncPause').onclick = togglePause;
    $('#ncReplay').onclick = replay;
    $('#ncType').onclick = () => toggleType();
    $('#ncForm').onsubmit = e => { e.preventDefault(); const t = $('#ncInput').value.trim(); if (!t) return; $('#ncInput').value = ''; userSaid(t, true); };
    $('#ncLogBtn').onclick = () => toggleLog();
    $('#ncSet').onclick = () => openStudio('avatar');
    $('#ncLog').onclick = logAction;
    $('.ncall__seg').onclick = e => {
      const b = e.target.closest('[data-m]'); if (!b || C.callMode === b.dataset.m) return;
      C.callMode = b.dataset.m;
      el.querySelectorAll('.ncall__seg [data-m]').forEach(x => x.setAttribute('aria-pressed', x === b));
      hush();
      const line = C.callMode === 'chat' ? pick('Sure — ask me anything at all: a topic, a plan, an idea.', 'بالتأكيد — اسألني أي شيء: موضوع، أو خطة، أو فكرة.') : pick('Okay, let’s slow down. This is just a quiet check-in — what has been feeling hard lately?', 'حسناً، لنهدأ قليلاً. هذه مجرد جلسة اطمئنان — ما الذي كان صعباً عليك مؤخراً؟');
      noorLine(line);
    };
    mountAvatar();
    renderLog();
    setState(st.state);
  }
  const MIC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  function mountAvatar() {
    if (st.avatar) st.avatar.destroy();
    const host = $('#ncAvatar'); if (!host) return;
    st.avatar = AV.mount(host, cfg().avatar).attach(v);
    st.avatar.setState(avState(st.state));
  }
  const avState = s => ({ listening: 'listening', hearing: 'listening', processing: 'thinking', thinking: 'thinking', speaking: 'speaking', paused: 'paused', muted: 'paused' })[s] || 'idle';

  /* ---------------- state ---------------- */
  function setState(s) {
    st.state = s;
    el.dataset.s = s;
    const tap = SAFARI && st.tapOnly;
    const txt = {
      speaking: T('Speaking — tap or just talk to interrupt', 'تتحدث — انقر أو تكلّم للمقاطعة'),
      listening: tap ? T('Listening… tap when you’ve finished', 'أستمع… انقر عند الانتهاء') : T('Listening… go ahead', 'أستمع… تفضل'),
      hearing: tap ? T('Hearing you… tap to send', 'أسمعك… انقر للإرسال') : T('Hearing you…', 'أسمعك…'),
      processing: T('Got it…', 'فهمت…'),
      thinking: T('Thinking…', 'أفكر…'),
      idle: tap ? T('Tap to talk', 'انقر للتحدث') : T('Tap the avatar when you’re ready to talk', 'انقر على الشخصية عندما تكون مستعداً للتحدث'),
      muted: T('Microphone muted — tap the mic to unmute', 'الميكروفون مكتوم — انقر عليه لإلغاء الكتم'),
      paused: T('Paused — nothing is listening. Tap play to carry on', 'متوقف — لا شيء يستمع. انقر تشغيل للمتابعة'),
      offline: T('You’re offline — I’ll carry on when the connection is back', 'أنت غير متصل — سأتابع عند عودة الاتصال'),
      reconnecting: T('Reconnecting to speech recognition…', 'إعادة الاتصال بالتعرف على الكلام…'),
      error: T('Something went wrong — tap to try again', 'حدث خطأ — انقر للمحاولة مجدداً')
    }[s] || '';
    const p = $('#ncState'); if (p) p.textContent = txt;
    const live = $('#ncLive');
    if (live) { const on = s === 'listening' || s === 'hearing'; live.classList.toggle('is-on', on); live.lastElementChild.textContent = on ? T('Mic on', 'الميكروفون يعمل') : st.muted ? T('Muted', 'مكتوم') : T('Mic off', 'الميكروفون متوقف'); }
    if (st.avatar) st.avatar.setState(avState(s));
  }
  function caption(sel, text) {
    const p = $(sel); if (!p) return;
    p.textContent = text; p.classList.remove('is-in', 'is-live'); void p.offsetWidth; p.classList.add('is-in');
  }

  /* ---------------- start / end ---------------- */
  ERLY.on('noor:call', start);
  async function start() {
    if (st.on) return;
    if (!v.supported.tts) { C.open('chat'); U.bubble('ai', T('Voice conversations need your browser’s speech voice, which isn’t available here. We can keep chatting by text.', 'تحتاج المحادثات الصوتية إلى صوت الكلام في متصفحك، وهو غير متاح هنا. يمكننا الاستمرار بالكتابة.'), { text: true, cls: 'cmsg--note' }); return; }
    Object.assign(st, { on: true, queue: [], misses: 0, net: 0, muted: false, paused: false, blocked: false, ignore: false, tapOnly: false, state: 'idle' });
    C.inCall = true;
    render();
    el.hidden = false; document.documentElement.classList.add('studio-open');
    requestAnimationFrame(() => el.classList.add('is-in'));
    if (!C.isOpen()) C.open('chat');
    addEventListener('offline', onOffline); addEventListener('online', onOnline);
    if (!cfg().setup) return openStudio('avatar', true);
    gate();
  }
  function gate() {
    if (!v.supported.stt) showConsent('unsupported');
    else if (!U.store.consent('mic')) { showConsent('ask'); return; }
    begin();
  }
  function showConsent(kind) {
    const box = $('#ncConsent'); box.hidden = false;
    if (kind === 'unsupported') {
      box.innerHTML = `<p>${T('This browser can’t listen, so Noor will talk and you can type or tap answers. For full voice, try Chrome, Edge or Safari.', 'لا يستطيع هذا المتصفح الاستماع، لذا ستتحدث نور ويمكنك الكتابة أو النقر على الإجابات. للصوت الكامل، جرّب كروم أو إيدج أو سفاري.')}</p>`;
      toggleType(true);
      return;
    }
    box.innerHTML = `<b>${T('Talk with Noor using your microphone?', 'التحدث مع نور باستخدام الميكروفون؟')}</b>
      <p>${T('Noor listens only while this conversation is open and the red mic light is on, and stops when you end it. No audio is recorded or kept — only the words appear in your chat, and you can delete them. In Chrome and Edge, the browser’s own speech service turns your voice into text.', 'تستمع نور فقط أثناء فتح هذه المحادثة وإضاءة مؤشر الميكروفون الأحمر، وتتوقف عند إنهائها. لا يُسجَّل أي صوت ولا يُحفظ — تظهر الكلمات فقط في محادثتك ويمكنك حذفها. في كروم وإيدج، تحوّل خدمة الكلام في المتصفح صوتك إلى نص.')}</p>
      <div class="ncall__cbtns"><button type="button" class="btn btn--accent" data-c="yes">${T('Allow microphone', 'السماح بالميكروفون')}</button><button type="button" class="btn btn--ghost" data-c="no">${T('Type instead', 'الكتابة بدلاً من ذلك')}</button></div>`;
    box.onclick = e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      box.hidden = true;
      if (b.dataset.c === 'yes') { U.store.setConsent('mic', true); begin(true); } else { toggleType(true); begin(); }
    };
  }
  function begin(gesture) {
    if (v.supported.stt && U.store.consent('mic') && !SAFARI) meter();
    loop();
    const name = AV.get(cfg().avatar).name;
    const hello = C.callMode === 'chat'
      ? pick(`Hi, I’m ${name}. I’m listening — ask me anything.`, `أهلاً، أنا ${name}. أنا أستمع — اسألني أي شيء.`)
      : pick(`Hi, I’m ${name}. I’m listening. Ask me anything, or tell me what’s been feeling hard lately — reading, lectures, focus, exams, anything.`, `أهلاً، أنا ${name}. أنا أستمع. اسألني أي شيء، أو أخبرني بما كان صعباً مؤخراً — القراءة أو المحاضرات أو التركيز أو الاختبارات.`);
    // on iPad a tap is needed to start the mic: the "Allow" tap counts, so listen right after the greeting
    st.gesture = !!gesture;
    noorLine(hello);
  }
  function end() {
    if (!st.on) return;
    st.on = false; C.inCall = false;
    clearTimeout(st.idleT); clearTimeout(st.thinkT);
    v.stop(); v.abortListening();
    stopMeter(); cancelAnimationFrame(st.vizRaf);
    removeEventListener('offline', onOffline); removeEventListener('online', onOnline);
    if (st.avatar) { st.avatar.destroy(); st.avatar = null; }
    if (st.preview) { st.preview.destroy(); st.preview = null; }
    el.classList.remove('is-in');
    document.documentElement.classList.remove('studio-open');
    setTimeout(() => { if (!el.classList.contains('is-in')) { el.hidden = true; el.innerHTML = ''; } }, reduce ? 0 : 400);
  }
  addEventListener('keydown', e => {
    if (!st.on) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '');
    if (e.key === 'Escape') { e.stopPropagation(); if (!$('#ncStudio').hidden) closeStudio(); else if (!$('#ncLog').hidden) toggleLog(false); else end(); return; }
    if (typing) return;
    if (e.key === ' ' && (e.target === document.body || e.target === el)) { e.preventDefault(); interrupt(); }
    if (e.key === 'm' || e.key === 'M') toggleMute();
    if (e.key === 'p' || e.key === 'P') togglePause();
  }, true);
  function onOffline() { if (!st.on) return; v.abortListening(); st.listening = false; setState('offline'); }
  function onOnline() { if (!st.on) return; st.net = 0; setState('idle'); afterSpeaking(); }

  /* ---------------- Noor speaking ---------------- */
  ERLY.on('noor:said', ({ text, speak }) => {
    if (!st.on || st.ignore || !text) return;
    record('noor', text);
    if (speak !== false) enqueue(text);
  });
  ERLY.on('noor:chips', ({ list, pick: choose }) => { if (st.on && !st.ignore) showChips(list, choose); });
  ERLY.on('noor:turn-end', () => { clearTimeout(st.thinkT); if (st.on && !st.speaking && !st.queue.length) afterSpeaking(); });
  function noorLine(text) { U.bubble('ai', text, { text: true }); record('noor', text); enqueue(text); }
  function enqueue(text) {
    st.queue.push(String(text).replace(/<[^>]+>/g, ' '));
    clearTimeout(st.idleT); clearTimeout(st.thinkT);
    if (!st.speaking && !st.paused) next();
  }
  function next() {
    const text = st.queue.shift();
    if (!text) { st.speaking = false; return afterSpeaking(); }
    st.speaking = true; setState('speaking');
    if (st.listening) { v.abortListening(); st.listening = false; }
    if (st.avatar) st.avatar.setState('speaking');
    caption('#ncNoor', text);
    v.speak(text, { lang: U.lang(), onend: () => { if (st.on) next(); }, onerror: () => { if (st.on) next(); } });
  }
  function afterSpeaking() {
    clearTimeout(st.idleT);
    if (!st.on || st.speaking || st.queue.length || st.paused) return;
    if (U.isBusy()) { setState('thinking'); return; } // the answer is still being written
    if (st.muted) return setState('muted');
    const c = cfg();
    if (SAFARI && st.tapOnly && !st.gesture) return setState('idle');
    if (!c.handsFree && !st.gesture) return setState('idle');
    const g = st.gesture; st.gesture = false;
    st.idleT = setTimeout(() => { if (st.on && !st.speaking && !st.queue.length && !U.isBusy()) listen(g); }, SAFARI ? 450 : 280);
  }
  function hush() {
    st.queue = []; v.stop(); st.speaking = false;
    if (U.isGenerating && U.isGenerating() && U.stopGenerating) U.stopGenerating();
  }
  function replay() {
    if (!st.lastReply) return;
    hush(); if (st.listening) { v.abortListening(); st.listening = false; }
    enqueue(st.lastReply);
  }

  /* ---------------- interrupting ---------------- */
  function interrupt() {
    if (!st.on) return;
    st.misses = 0; st.blocked = false;
    if (st.paused) return togglePause();
    if (st.listening) { v.stopListening(); return; } // tap while listening = "I've finished"
    if (st.speaking || st.queue.length || U.isGenerating && U.isGenerating()) {
      hush(); st.ignore = true; // whatever the old answer still produces is dropped
      if (st.avatar) st.avatar.setState('listening');
    }
    if (st.muted) toggleMute();
    listen(true);
  }

  /* ---------------- Noor listening ---------------- */
  function listen(fromTap) {
    if (!st.on || st.muted || st.paused || st.listening) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return setState('offline');
    if (!v.supported.stt || !U.store.consent('mic')) { setState('idle'); return; }
    st.listening = true; setState('listening'); caption('#ncYou', '');
    let started = false;
    const ok = v.listen({
      lang: U.lang(),
      quietMs: QUIET[cfg().quiet] || QUIET.normal,
      waitMs: 12000,
      onstart: () => { started = true; st.net = 0; },
      onresult: t => { started = true; if (st.state !== 'hearing') setState('hearing'); const p = $('#ncYou'); if (p) { p.textContent = t; p.classList.add('is-live'); } pulse(0.45 + Math.random() * 0.4); },
      onspeech: () => pulse(0.6),
      onerror: code => {
        st.listening = false;
        if (SAFARI && !fromTap && (code === 'not-allowed' || code === 'start-failed')) { st.tapOnly = true; return setState('idle'); }
        if (code === 'service-not-allowed' && SAFARI) { st.blocked = true; setState('idle'); caption('#ncNoor', T('Speech recognition is off on this device. Turn on Siri and Dictation in Settings (General → Keyboard → Enable Dictation), then tap again — or type below.', 'التعرف على الكلام متوقف على هذا الجهاز. فعّل Siri والإملاء من الإعدادات (عام ← لوحة المفاتيح ← تفعيل الإملاء)، ثم انقر مجدداً — أو اكتب بالأسفل.')); return toggleType(true); }
        if (code === 'not-allowed' || code === 'service-not-allowed') { st.blocked = true; setState('idle'); caption('#ncNoor', T('I can’t use the microphone — it’s blocked in your browser settings. You can type below instead.', 'لا أستطيع استخدام الميكروفون — إنه محظور في إعدادات المتصفح. يمكنك الكتابة بالأسفل بدلاً من ذلك.')); return toggleType(true); }
        if (code === 'audio-capture') { st.blocked = true; setState('idle'); caption('#ncNoor', T('I can’t find a microphone. Check it’s plugged in, or type below.', 'لا أجد ميكروفوناً. تأكد من توصيله، أو اكتب بالأسفل.')); return toggleType(true); }
        if (code === 'network') { st.net++; st.blocked = st.net > 2; setState(st.blocked ? 'error' : 'reconnecting'); if (st.blocked) caption('#ncNoor', T('Speech recognition needs an internet connection in this browser. You can type below.', 'يحتاج التعرف على الكلام إلى اتصال بالإنترنت في هذا المتصفح. يمكنك الكتابة بالأسفل.')); else setTimeout(() => listen(false), 1200 * st.net); }
      },
      onend: final => {
        st.listening = false;
        if (!st.on || st.blocked || st.paused || st.muted) return;
        if (final) { st.misses = 0; return userSaid(final); }
        if (SAFARI && !started && !fromTap) { st.tapOnly = true; return setState('idle'); }
        if (SAFARI && st.tapOnly) { setState('idle'); return caption('#ncNoor', T('I didn’t catch that — tap and try again.', 'لم أسمع ذلك جيداً — انقر وحاول مجدداً.')); }
        if (++st.misses <= 3 && cfg().handsFree) setTimeout(() => listen(false), 200);
        else { setState('idle'); caption('#ncNoor', T('I’m still here — tap me when you’re ready to talk.', 'ما زلت هنا — انقر عليّ عندما تكون مستعداً للتحدث.')); }
      }
    });
    if (!ok) { st.listening = false; setState('idle'); return; }
    // Safari may silently refuse to start without a tap: fall back to tap-to-talk
    if (SAFARI && !fromTap) setTimeout(() => { if (st.on && st.listening && !started) { st.tapOnly = true; v.abortListening(); st.listening = false; setState('idle'); } }, 2600);
  }

  // something the student said (or typed in voice mode)
  function userSaid(text, typed) {
    text = String(text || '').trim(); if (!text) return;
    if (!typed && command(text)) return;
    hush(); st.ignore = false;
    if (st.listening) { v.abortListening(); st.listening = false; }
    record('you', text);
    st.turn = null; st.lastReply = '';
    caption('#ncYou', text);
    const box = $('#ncChips'); if (box) box.innerHTML = '';
    setState('processing');
    C.submitText(text);
    setTimeout(() => { if (st.on && st.state === 'processing') setState('thinking'); }, 300);
    clearTimeout(st.thinkT);
    st.thinkT = setTimeout(() => {
      if (!st.on || st.speaking || st.state !== 'thinking') return;
      if (U.isGenerating && U.isGenerating() && U.stopGenerating) U.stopGenerating();
      U.setBusy && U.setBusy(false);
      noorLine(pick('Sorry, that took too long. Could you ask me again?', 'آسفة، استغرق ذلك وقتاً طويلاً. هل يمكنك السؤال مرة أخرى؟'));
    }, 40000);
  }
  // voice commands that don't need the AI
  function command(t) {
    const s = t.toLowerCase().replace(/[.!?]/g, '').trim();
    const c = cfg();
    const say = (en, ar) => { setState('speaking'); noorLine(pick(en, ar)); return true; };
    if (/^(please )?(slow down|speak slower|talk slower|slower)( please)?$|أبطئ|ببطء/.test(s)) { save({ rate: Math.max(0.6, +(c.rate - 0.12).toFixed(2)) }); return say('Sure — I’ll speak more slowly.', 'حسناً — سأتحدث ببطء أكثر.'); }
    if (/^(please )?(speed up|speak faster|talk faster|faster)( please)?$|أسرع/.test(s)) { save({ rate: Math.min(1.5, +(c.rate + 0.12).toFixed(2)) }); return say('Okay — a bit faster.', 'حسناً — أسرع قليلاً.'); }
    if (/^(please )?(louder|speak up)( please)?$/.test(s)) { save({ volume: Math.min(1, c.volume + 0.2) }); return say('Is this better?', 'هل هذا أفضل؟'); }
    if (/^(please )?(quieter|softer)( please)?$/.test(s)) { save({ volume: Math.max(0.3, c.volume - 0.2) }); return say('Okay, a little quieter.', 'حسناً، أهدأ قليلاً.'); }
    if (/^(can you )?(repeat (that|the last part|it)|say (that|it) again|again|what did you say)( please)?$|أعيدي|كرري/.test(s)) { if (st.lastReply) { replay(); return true; } return false; }
    if (/^(stop|stop talking|be quiet|that's enough|quiet)( please)?$|توقفي/.test(s)) { hush(); setState('idle'); afterSpeaking(); return true; }
    if (/^(pause|hold on|wait)( please)?$/.test(s)) { togglePause(); return true; }
    if (/^(end|end (the )?(call|conversation)|goodbye|bye( bye)?|bye noor)$|مع السلامة/.test(s)) { noorLine(pick('Bye for now — I’m here whenever you need me.', 'إلى اللقاء — أنا هنا متى احتجتني.')); setTimeout(end, 2600); return true; }
    return false;
  }
  function toggleMute() {
    if (!st.on) return;
    st.muted = !st.muted;
    const b = $('#ncMute'); if (b) { b.setAttribute('aria-pressed', st.muted); b.classList.toggle('is-off', st.muted); }
    if (st.muted) { v.abortListening(); st.listening = false; setState('muted'); }
    else if (!st.speaking) { st.misses = 0; if (SAFARI && st.tapOnly) setState('idle'); else listen(true); }
    else setState('speaking');
  }
  function togglePause() {
    if (!st.on) return;
    st.paused = !st.paused;
    const b = $('#ncPause'); if (b) { b.setAttribute('aria-pressed', st.paused); b.innerHTML = ICON(st.paused ? 'play' : 'pause'); b.setAttribute('aria-label', st.paused ? T('Resume conversation', 'متابعة المحادثة') : T('Pause conversation', 'إيقاف المحادثة مؤقتاً')); }
    if (st.paused) {
      v.abortListening(); st.listening = false;
      if (st.speaking) v.pause();
      setState('paused');
    } else if (v.state().paused) { v.resume(); setState('speaking'); }
    else if (st.queue.length) next();
    else { st.speaking = false; listen(true); }
  }
  function toggleType(on) {
    const f = $('#ncForm'); if (!f) return;
    on = on === undefined ? f.hidden : on;
    f.hidden = !on; const b = $('#ncType'); if (b) b.setAttribute('aria-pressed', on);
    if (on) setTimeout(() => { const i = $('#ncInput'); if (i && !('ontouchstart' in window)) i.focus(); }, 50);
  }

  /* ---------------- transcript ---------------- */
  function record(who, text) {
    text = String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (!text) return;
    if (who === 'noor' && st.turn && st.turn.who === 'noor') { st.turn.text += ' ' + text; st.lastReply = st.turn.text; }
    else { st.turn = { who, text, at: new Date() }; st.log.push(st.turn); if (who === 'noor') st.lastReply = text; }
    if (who === 'you') st.turn = null;
    if (st.log.length > 300) st.log.splice(0, st.log.length - 300);
    renderLog();
  }
  const hhmm = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  function renderLog() {
    const ol = $('#ncLogList'); if (!ol) return;
    const name = AV.get(cfg().avatar).name;
    ol.innerHTML = st.log.length ? st.log.map((x, k) => `<li class="is-${x.who}"><span><b>${x.who === 'you' ? T('You', 'أنت') : esc(name)}</b><time>${hhmm(x.at)}</time>${x.who === 'you' ? `<button type="button" data-lg="edit" data-k="${k}">${T('Edit & resend', 'تعديل وإعادة')}</button>` : ''}</span><p>${esc(x.text)}</p></li>`).join('') : `<li class="is-empty">${T('Your conversation will appear here.', 'ستظهر محادثتك هنا.')}</li>`;
    ol.scrollTop = ol.scrollHeight;
  }
  function plain() { const name = AV.get(cfg().avatar).name; return st.log.map(x => `[${hhmm(x.at)}] ${x.who === 'you' ? 'You' : name}: ${x.text}`).join('\n'); }
  function logAction(e) {
    const b = e.target.closest('[data-lg]'); if (!b) return;
    const k = b.dataset.lg;
    if (k === 'close') toggleLog(false);
    if (k === 'clear') { st.log = []; st.turn = null; renderLog(); }
    if (k === 'copy' && navigator.clipboard) navigator.clipboard.writeText(plain()).then(() => { b.classList.add('is-ok'); setTimeout(() => b.classList.remove('is-ok'), 1200); }, () => {});
    if (k === 'save') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([plain()], { type: 'text/plain' })); a.download = `noor-conversation-${new Date().toISOString().slice(0, 10)}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    if (k === 'edit') { const x = st.log[+b.dataset.k]; if (x) { toggleType(true); $('#ncInput').value = x.text; $('#ncInput').focus(); } }
  }
  function toggleLog(on) {
    const p = $('#ncLog'); on = on === undefined ? p.hidden : on;
    p.hidden = !on; if (on) { renderLog(); requestAnimationFrame(() => p.classList.add('is-in')); } else p.classList.remove('is-in');
  }

  /* ---------------- quick answers on screen ---------------- */
  function showChips(list, choose) {
    const box = $('#ncChips'); if (!box) return;
    box.innerHTML = list.slice(0, 7).map(c => `<button type="button" data-id="${esc(c.id)}">${esc(pick(c.en, c.ar))}</button>`).join('');
    box.onclick = e => {
      const b = e.target.closest('[data-id]'); if (!b) return;
      const c = list.find(x => x.id === b.dataset.id);
      box.innerHTML = '';
      v.stop(); v.abortListening(); st.queue = []; st.speaking = false; st.listening = false; st.ignore = false;
      record('you', pick(c.en, c.ar)); st.turn = null;
      setState('thinking'); caption('#ncYou', pick(c.en, c.ar));
      choose(c);
    };
  }

  /* ---------------- studio: avatar, voice, conversation (also the first-time setup) ---------------- */
  let tab = 'avatar', setupMode = false;
  function openStudio(which, setup) {
    tab = which || 'avatar'; setupMode = !!setup;
    hush(); if (st.listening) { v.abortListening(); st.listening = false; }
    const box = $('#ncStudio'); box.hidden = false;
    drawStudio();
    requestAnimationFrame(() => box.classList.add('is-in'));
  }
  function closeStudio() {
    const box = $('#ncStudio'); if (!box || box.hidden) return;
    if (st.preview) { st.preview.destroy(); st.preview = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    box.classList.remove('is-in'); box.hidden = true;
    const wasSetup = setupMode; setupMode = false;
    render();
    if (wasSetup) { save({ setup: true }); gate(); }
    else afterSpeaking();
  }
  const TABS = [['avatar', 'Avatar', 'الشخصية', 'smile'], ['voice', 'Voice', 'الصوت', 'volume'], ['talk', 'Conversation', 'المحادثة', 'chat']];
  function drawStudio() {
    const box = $('#ncStudio');
    const i = TABS.findIndex(t => t[0] === tab);
    box.innerHTML = `<div class="nstudio__card" role="dialog" aria-label="${T('Avatar and voice', 'الشخصية والصوت')}">
      <header class="nstudio__h">
        ${setupMode ? `<div><b>${T('Set up your companion', 'جهّز رفيقك')}</b><small>${T(`Step ${i + 1} of 3`, `الخطوة ${i + 1} من 3`)}</small></div>` : `<b>${T('Your companion', 'رفيقك')}</b>`}
        ${setupMode ? `<button type="button" class="btn btn--ghost btn--sm" data-setup="skip">${T('Skip — use defaults', 'تخطٍّ — الإعدادات الافتراضية')}</button>` : `<button type="button" class="ncall__ic" data-st="close" aria-label="${T('Close', 'إغلاق')}">${ICON('x')}</button>`}
      </header>
      <nav class="nstudio__tabs" role="tablist">${TABS.map(([k, en, ar, ic], n) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${setupMode ? `<i>${n + 1}</i>` : ICON(ic)} ${pick(en, ar)}</button>`).join('')}</nav>
      <div class="nstudio__body" id="nsBody"></div>
      <footer class="nstudio__f">
        ${setupMode ? `${i > 0 ? `<button type="button" class="btn btn--ghost" data-step="-1">${T('Back', 'رجوع')}</button>` : '<span></span>'}<button type="button" class="btn btn--accent" data-step="1">${i < 2 ? T('Next', 'التالي') : T('Start talking', 'ابدأ الحديث')} ${ICON(i < 2 ? 'arrow' : 'headphones')}</button>`
          : `<button type="button" class="btn btn--ghost btn--sm" data-st="reset">${ICON('reset')} ${T('Reset to defaults', 'استعادة الافتراضي')}</button><button type="button" class="btn btn--accent" data-st="close">${T('Done', 'تم')}</button>`}
      </footer>
    </div>`;
    box.onclick = studioClick;
    box.oninput = studioInput;
    const body = box.querySelector('#nsBody');
    if (tab === 'avatar') avatarPane(body); else if (tab === 'voice') voicePane(body); else talkPane(body);
  }
  function studioClick(e) {
    const t = e.target;
    const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; return drawStudio(); }
    const sp = t.closest('[data-step]'); if (sp) { const i = TABS.findIndex(x => x[0] === tab) + +sp.dataset.step; if (i > 2) return closeStudio(); tab = TABS[Math.max(0, i)][0]; return drawStudio(); }
    if (t.closest('[data-setup="skip"]')) return closeStudio();
    const s = t.closest('[data-st]');
    if (s && s.dataset.st === 'close') return closeStudio();
    if (s && s.dataset.st === 'reset') { U.store.setPref('vs', { setup: true }); const vo = Object.assign({}, U.store.prefs().voices || {}); delete vo[U.lang()]; U.store.setPref('voices', vo); return drawStudio(); }
    const av = t.closest('[data-av]'); if (av) { pickAvatar(av.dataset.av); return; }
    const vo = t.closest('[data-voice]'); if (vo) { const name = vo.dataset.voice; const vs = Object.assign({}, U.store.prefs().voices || {}); vs[U.lang()] = name; U.store.setPref('voices', vs); const vv = v.voices(U.lang()).find(x => x.name === name); if (vv && VX.gender(vv)) save({ gender: VX.gender(vv) }); markVoice(); preview(name); return; }
    const gf = t.closest('[data-gf]'); if (gf) { st.gf = gf.dataset.gf; return drawStudio(); }
    const opt = t.closest('[data-opt]'); if (opt) { const [k, val] = opt.dataset.opt.split(':'); save({ [k]: val === 'true' ? true : val === 'false' ? false : val }); if (k === 'lang') { if (window.I18N && I18N.lang !== val) I18N.apply(val); } return drawStudio(); }
    if (t.closest('[data-hear]')) preview();
  }
  function studioInput(e) {
    const r = e.target.closest('[data-range]'); if (!r) return;
    save({ [r.dataset.range]: +r.value });
    const o = r.parentElement.querySelector('output'); if (o) o.textContent = fmt(r.dataset.range, +r.value);
  }
  const fmt = (k, x) => k === 'volume' ? Math.round(x * 100) + '%' : x.toFixed(2) + '×';
  function avatarPane(body) {
    const c = cfg();
    body.innerHTML = `<div class="nstudio__pv"><div class="nstudio__pvav" id="nsPv"></div><div><b id="nsPvName"></b><p id="nsPvAbout"></p><button type="button" class="btn btn--sm btn--ghost" data-hear>${ICON('play')} ${T('Hear a hello', 'استمع للتحية')}</button></div></div>
      <div class="nstudio__grid">${AV.list.map((a, k) => `<button type="button" class="nstudio__av ${a.id === c.avatar ? 'is-on' : ''}" data-av="${a.id}" style="--i:${k}" aria-pressed="${a.id === c.avatar}"><span class="nstudio__face">${a.abstract ? '<span class="avt-aura avt-aura--mini"><i></i><i></i><b></b></span>' : AV.svg(a.id, true)}</span><b>${esc(a.name)}</b><small>${esc(pick(a.en[0], a.ar[0]))}</small></button>`).join('')}</div>
      <p class="nstudio__note">${T('All companions are original, AI-generated virtual characters — not real people.', 'جميع الرفاق شخصيات افتراضية أصلية مولّدة بالذكاء الاصطناعي — وليسوا أشخاصاً حقيقيين.')}</p>`;
    showPreview(c.avatar);
  }
  function showPreview(id) {
    const a = AV.get(id);
    if (st.preview) st.preview.destroy();
    const host = $('#nsPv'); if (!host) return;
    st.preview = AV.mount(host, a.id);
    $('#nsPvName').textContent = a.name + ' · ' + pick(a.en[0], a.ar[0]);
    $('#nsPvAbout').textContent = pick(a.en[1], a.ar[1]);
  }
  function pickAvatar(id) {
    const a = AV.get(id), c = cfg();
    const vs = U.store.prefs().voices || {};
    const patch = { avatar: id };
    // a new face gets a matching voice, unless the student picked a voice themselves
    const cur = v.voiceFor(U.lang());
    if (a.g && (!vs[U.lang()] || !cur || VX.gender(cur) !== a.g)) { patch.gender = a.g; const v2 = Object.assign({}, vs); delete v2[U.lang()]; U.store.setPref('voices', v2); }
    save(patch);
    $('#ncStudio').querySelectorAll('[data-av]').forEach(b => { b.classList.toggle('is-on', b.dataset.av === id); b.setAttribute('aria-pressed', b.dataset.av === id); });
    showPreview(id);
    preview();
  }
  // say hello with a given voice (or the current one), lips synced on the preview avatar
  function preview(voiceName) {
    const a = AV.get(cfg().avatar);
    const text = pick(`Hi, I’m ${a.name}. ${a.en[1]}`, `أهلاً، أنا ${a.name}. ${a.ar[1]}`);
    const ctl = st.preview;
    v.stop();
    if (ctl) ctl.setState('speaking');
    if (voiceName) {
      const vs = Object.assign({}, U.store.prefs().voices || {}); vs[U.lang()] = voiceName; U.store.setPref('voices', vs);
    }
    // speaking through the normal voice path keeps the lip-sync hooks identical to the real conversation
    if (ctl) ctl.attach(v);
    v.speak(text, { lang: U.lang(), onend: () => { if (ctl) ctl.setState('idle'); } });
  }
  function voicePane(body) {
    const c = cfg(), lang = U.lang();
    const all = v.voices(lang), cur = v.voiceFor(lang);
    const gf = st.gf || 'all';
    const list = all.filter(x => gf === 'all' || VX.gender(x) === gf);
    const g = x => ({ f: T('Female', 'أنثى'), m: T('Male', 'ذكر') })[VX.gender(x)] || '';
    body.innerHTML = `
      <div class="nstudio__row"><span class="nstudio__k">${T('Language', 'اللغة')}</span><div class="nstudio__seg">${[['en', 'English'], ['ar', 'العربية']].map(([k, n]) => `<button type="button" data-opt="lang:${k}" aria-pressed="${lang === k}">${n}</button>`).join('')}</div></div>
      <div class="nstudio__row"><span class="nstudio__k">${T('Voice', 'الصوت')}</span><div class="nstudio__seg">${[['all', 'All', 'الكل'], ['f', 'Female', 'أنثى'], ['m', 'Male', 'ذكر']].map(([k, en, ar]) => `<button type="button" data-gf="${k}" aria-pressed="${gf === k}">${pick(en, ar)}</button>`).join('')}</div></div>
      <ul class="nstudio__voices">${list.length ? list.slice(0, 40).map(x => `<li><button type="button" data-voice="${esc(x.name)}" class="${cur && cur.name === x.name ? 'is-on' : ''}"><span class="nstudio__play">${ICON('play')}</span><span><b>${VX.isNatural(x) ? '★ ' : ''}${esc(x.name.replace(/Microsoft |Google |\(Natural\)| Online/g, '').replace(/\s+-\s+.*$/, '').trim())}</b><small>${esc(x.lang)}${g(x) ? ' · ' + g(x) : ''}${VX.isNatural(x) ? ' · ' + T('natural', 'طبيعي') : ''}</small></span>${cur && cur.name === x.name ? `<em>${ICON('check')}</em>` : ''}</button></li>`).join('') : `<li class="nstudio__none">${all.length ? T('No voices of that kind on this device — try “All”.', 'لا توجد أصوات من هذا النوع على هذا الجهاز — جرّب «الكل».') : T('This device has no voices for this language yet. On iPad: Settings → Accessibility → Spoken Content → Voices.', 'لا توجد أصوات لهذه اللغة على هذا الجهاز. على الآيباد: الإعدادات ← تسهيلات الاستخدام ← المحتوى المنطوق ← الأصوات.')}</li>`}</ul>
      <p class="nstudio__note">${T('These are the real voices installed in your browser and device; ★ marks the most natural ones. Edge’s “Natural” voices and Apple’s “Premium/Enhanced” voices sound the most human.', 'هذه هي الأصوات الحقيقية المثبتة في متصفحك وجهازك؛ ★ تشير إلى الأكثر طبيعية.')}</p>
      ${['rate', 'pitch', 'volume'].map(k => { const lim = { rate: [0.6, 1.5, 0.05], pitch: [0.7, 1.3, 0.05], volume: [0.2, 1, 0.05] }[k]; return `<label class="nstudio__range"><span>${pick(...{ rate: ['Speed', 'السرعة'], pitch: ['Pitch', 'طبقة الصوت'], volume: ['Volume', 'مستوى الصوت'] }[k])}</span><input type="range" min="${lim[0]}" max="${lim[1]}" step="${lim[2]}" value="${c[k]}" data-range="${k}"><output>${fmt(k, c[k])}</output></label>`; }).join('')}
      <div class="nstudio__row"><button type="button" class="btn btn--sm btn--ghost" data-hear>${ICON('play')} ${T('Test this voice', 'جرّب هذا الصوت')}</button></div>`;
  }
  function markVoice() {
    const cur = v.voiceFor(U.lang());
    $('#ncStudio').querySelectorAll('[data-voice]').forEach(b => { const on = cur && b.dataset.voice === cur.name; b.classList.toggle('is-on', on); const em = b.querySelector('em'); if (on && !em) b.insertAdjacentHTML('beforeend', `<em>${ICON('check')}</em>`); if (!on && em) em.remove(); });
  }
  function talkPane(body) {
    const c = cfg();
    const seg = (key, items) => `<div class="nstudio__seg nstudio__seg--wrap">${items.map(([k, en, ar]) => `<button type="button" data-opt="${key}:${k}" aria-pressed="${String(c[key]) === String(k)}">${pick(en, ar)}</button>`).join('')}</div>`;
    const sw = (key, en, ar, hint) => `<label class="nstudio__sw"><span><b>${pick(en, ar)}</b>${hint ? `<small>${hint}</small>` : ''}</span><button type="button" role="switch" aria-checked="${!!c[key]}" data-opt="${key}:${!c[key]}"><i></i></button></label>`;
    body.innerHTML = `
      <p class="nstudio__k">${T('How should Noor explain things?', 'كيف تشرح نور الأشياء؟')}</p>${seg('style', STYLES)}
      <p class="nstudio__k">${T('Personality', 'الشخصية')}</p>${seg('tone', TONES)}
      <p class="nstudio__k">${T('Pause before Noor answers', 'المهلة قبل أن تجيب نور')}</p>${seg('quiet', [['short', 'Short', 'قصيرة'], ['normal', 'Normal', 'عادية'], ['long', 'Long — I think while I talk', 'طويلة — أفكر وأنا أتكلم']])}
      ${sw('handsFree', 'Hands-free', 'بدون استخدام اليدين', T('Noor listens again by herself after she answers', 'تعود نور للاستماع تلقائياً بعد الإجابة'))}
      ${SAFARI ? '' : sw('barge', 'Interrupt by talking', 'المقاطعة بالكلام', T('Start talking to stop Noor — best with headphones', 'ابدأ الكلام لإيقاف نور — الأفضل مع سماعات'))}
      ${sw('captions', 'Captions', 'الترجمة النصية', '')}
      <p class="nstudio__k">${T('Caption size', 'حجم النص')}</p>${seg('capSize', [['s', 'Small', 'صغير'], ['m', 'Medium', 'متوسط'], ['l', 'Large', 'كبير']])}
      ${sw('contrast', 'High contrast', 'تباين عالٍ', '')}
      <p class="nstudio__note">${T('Your style and personality choices change how Noor talks, never her facts or safety rules. Settings stay on this device.', 'تغيّر اختياراتك أسلوب حديث نور فقط، لا الحقائق ولا قواعد الأمان. تبقى الإعدادات على هذا الجهاز.')}</p>`;
  }
  if (window.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => { if (st.on && tab === 'voice' && !$('#ncStudio').hidden) drawStudio(); });

  /* ---------------- the microphone level (visualiser, nodding and barge-in) ---------------- */
  let pulseT = null;
  function pulse(x) { st.level = Math.max(st.level, x * 0.16); clearTimeout(pulseT); pulseT = setTimeout(() => { st.level = 0; }, 260); }
  async function meter() {
    try {
      st.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!st.on) return stopMeter();
      const AC = window.AudioContext || window.webkitAudioContext;
      st.ac = new AC();
      const src = st.ac.createMediaStreamSource(st.stream), an = st.ac.createAnalyser();
      an.fftSize = 512; src.connect(an);
      st.an = an; st.buf = new Uint8Array(an.fftSize);
    } catch (e) { /* the conversation still works without the level meter */ }
  }
  function loop() {
    const tick = () => {
      if (!st.on) return;
      if (st.an) {
        st.an.getByteTimeDomainData(st.buf);
        let sum = 0; for (let i = 0; i < st.buf.length; i++) { const x = (st.buf[i] - 128) / 128; sum += x * x; }
        const rms = Math.sqrt(sum / st.buf.length);
        st.level = st.level * 0.7 + rms * 0.3;
        // barge-in: louder than the echo of Noor's own voice, for a moment
        if (st.speaking) {
          st.echo = st.echo * 0.97 + st.level * 0.03;
          if (cfg().barge && st.level > Math.max(0.07, st.echo * 2.4)) { if (!st.loudSince) st.loudSince = performance.now(); else if (performance.now() - st.loudSince > 320) { st.loudSince = 0; interrupt(); } }
          else st.loudSince = 0;
        } else st.echo *= 0.995;
      }
      const lvl = Math.min(1, st.level * 6);
      const spk = st.avatar ? st.avatar.shape().o : 0;
      el.style.setProperty('--lvl', (st.listening ? lvl : 0).toFixed(3));
      el.style.setProperty('--spk', spk.toFixed(3));
      if (st.avatar) st.avatar.level(st.listening ? lvl : 0);
      st.vizRaf = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(st.vizRaf);
    st.vizRaf = requestAnimationFrame(tick);
  }
  function stopMeter() {
    if (st.stream) st.stream.getTracks().forEach(t => t.stop());
    if (st.ac) try { st.ac.close(); } catch (e) { /* ignore */ }
    st.stream = null; st.ac = null; st.an = null; el.style.setProperty('--lvl', 0);
  }
  C.callMode = 'care';
  C.call = { start, end, active: () => st.on, avatar: () => st.avatar, settings: cfg, openStudio: w => st.on && openStudio(w), state: () => st.state, transcript: () => st.log.slice() };
})();
