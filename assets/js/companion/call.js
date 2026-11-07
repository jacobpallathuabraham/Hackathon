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
  const DEF = { avatar: 'yasmin', gender: 'f', rate: 1, pitch: 1, volume: 1, expr: 1, style: 'conversational', tone: 'friendly', length: 'medium', mode: 'natural', theme: 'studio', preset: 'friendly', quiet: 'normal', handsFree: true, barge: !SAFARI, captions: true, capSize: 'm', contrast: false, recLang: '', dict: [], favs: [], profiles: [], prof: {}, setup: false };
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
    el.dataset.theme = c.theme;
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
          <button type="button" class="ncall__pill" id="ncModeBtn" title="${T('Conversation mode', 'وضع المحادثة')}">${ICON((MODES.find(m => m[0] === c.mode) || MODES[0])[3])} <span>${esc(pick(...(MODES.find(m => m[0] === c.mode) || MODES[0]).slice(1, 3)))}</span></button>
          <button type="button" class="ncall__pill" id="ncLang" aria-label="${T('Switch language', 'تبديل اللغة')}" title="${T('Switch language', 'تبديل اللغة')}">${U.lang() === 'ar' ? 'EN' : 'ع'}</button>
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
    $('#ncSet').onclick = () => openStudio('companion');
    $('#ncModeBtn').onclick = () => openStudio('talk');
    $('#ncLang').onclick = () => switchLang(U.lang() === 'ar' ? 'en' : 'ar');
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
  // each sentence gets its own tone (prosody.js): the voice and the face follow it together
  function enqueue(text) {
    const clean = String(text).replace(/<[^>]+>/g, ' ').trim(); if (!clean) return;
    const parts = PR ? PR.sentences(clean) : [clean];
    const expr = cfg().expr;
    parts.forEach(sn => {
      const tone = PR ? PR.classify(sn, { user: st.lastUser, first: !st.toned }) : 'neutral';
      st.toned = true;
      st.queue.push({ text: sn, chunk: clean, tone, pros: PR ? PR.prosody(tone, expr) : null });
    });
    clearTimeout(st.idleT); clearTimeout(st.thinkT);
    if (!st.speaking && !st.paused) next();
  }
  function next() {
    const item = st.queue.shift();
    if (!item) { st.speaking = false; return afterSpeaking(); }
    const text = item.text;
    st.speaking = true; setState('speaking');
    if (st.listening) { v.abortListening(); st.listening = false; }
    if (st.avatar) st.avatar.setState('speaking');
    if (st.cap !== item.chunk) { st.cap = item.chunk; caption('#ncNoor', item.chunk); } // the whole message stays readable while it's spoken
    if (st.avatar) st.avatar.emote(item.tone);
    st.lastSentence = text;
    const gap = 120 + ((item.pros && item.pros.pause) || 0);
    const go = () => { if (st.on && !st.paused) setTimeout(() => { if (st.on && !st.speaking) return; if (st.on) next(); }, gap); };
    v.speak(text, { lang: U.lang(), emotion: item.tone, prosody: item.pros, onend: go, onerror: () => { if (st.on) next(); } });
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
  function replay(lastOnly) {
    if (!st.lastReply) return;
    if (lastOnly && st.lastSentence) { hush(); if (st.listening) { v.abortListening(); st.listening = false; } return enqueue(st.lastSentence); }
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
    if (!st.on || st.muted || st.paused || st.listening || st.speaking) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return setState('offline');
    if (!v.supported.stt || !U.store.consent('mic')) { setState('idle'); return; }
    st.listening = true; setState('listening'); caption('#ncYou', '');
    let started = false;
    const ok = v.listen({
      lang: cfg().recLang || U.lang(),
      quietMs: QUIET[cfg().quiet] || QUIET.normal,
      waitMs: 12000,
      onstart: () => { started = true; st.net = 0; },
      onresult: t => { if (!st.listening) return; started = true; if (st.state !== 'hearing') setState('hearing'); const p = $('#ncYou'); if (p) { p.textContent = t; p.classList.add('is-live'); } pulse(0.45 + Math.random() * 0.4); },
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
        // an abort because Noor started speaking also ends listening: never restart over her
        if (!st.on || st.blocked || st.paused || st.muted || st.speaking || st.queue.length) return;
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
    st.turn = null; st.lastReply = ''; st.lastUser = text; st.toned = false; st.turnId = (st.turnId || 0) + 1;
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
    if (/^(can you )?(please )?repeat (the )?last (sentence|bit|line)( please)?$/.test(s)) { if (st.lastSentence) { replay(true); return true; } return false; }
    if (/^(can you )?(repeat (that|the last part|it)|say (that|it) again|again|what did you say)( please)?$|أعيدي|كرري/.test(s)) { if (st.lastReply) { replay(); return true; } return false; }
    if (/^(please )?(switch|change|talk|speak|reply)( to| in)? arabic( please)?$|^تحدث(ي)? بالعربية$/.test(s)) { switchLang('ar'); return true; }
    if (/^(please )?(switch|change|talk|speak|reply)( to| in)? english( please)?$|^(تحدث(ي)? )?بالإنجليزية$/.test(s)) { switchLang('en'); return true; }
    if (/^(please )?(change|switch) (your|the) voice( please)?$|^(i want |use )?(a )?different voice$/.test(s)) { openStudio('voice'); return true; }
    if (/^(please )?(use|switch to|try) a (male|female|man's|woman's|man|woman)('s)? voice( please)?$/.test(s)) { const g = /female|woman/.test(s) ? 'f' : 'm'; const x = library().available.find(y => y.profile.g === g && y.profile.lang === U.lang()); if (x) { applyProfile(x); return say(`Sure — this is ${x.profile.name}. How does this sound?`, `بالتأكيد — هذا صوت ${x.profile.name}. ما رأيك؟`); } return say('I don’t have a voice like that on this device, sorry.', 'لا يوجد صوت كهذا على هذا الجهاز، آسفة.'); }
    if (/^(please )?(switch to |change to |use )?(study|focus|practice|planning|creative|research|reading|deep explanation|natural) mode( please)?$/.test(s)) { const m = (s.match(/(study|focus|practice|planning|creative|research|reading|deep|natural)/) || [])[1]; save({ mode: m === 'deep' ? 'deep' : m }); render(); return say(`${(MODES.find(x => x[0] === (m === 'deep' ? 'deep' : m)) || MODES[0])[1]} mode — ready when you are.`, 'تم تغيير الوضع — أنا جاهزة.'); }
    if (/^(stop|stop talking|be quiet|that's enough|quiet)( please)?$|توقفي/.test(s)) { hush(); setState('idle'); afterSpeaking(); return true; }
    if (/^(pause|hold on|wait)( please)?$/.test(s)) { togglePause(); return true; }
    if (/^(end|end (the )?(call|conversation)|goodbye|bye( bye)?|bye noor)$|مع السلامة/.test(s)) { noorLine(pick('Bye for now — I’m here whenever you need me.', 'إلى اللقاء — أنا هنا متى احتجتني.')); setTimeout(end, 2600); return true; }
    return false;
  }
  // change language without restarting the conversation (manual, never guessed from an accent)
  function switchLang(l) {
    hush(); if (st.listening) { v.abortListening(); st.listening = false; }
    if (window.I18N && I18N.lang !== l) I18N.apply(l);
    render();
    noorLine(l === 'ar' ? 'حسناً، سنتحدث بالعربية الآن.' : 'Okay — we’ll talk in English now.');
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

  /* ---------------- Companion Studio: personality, avatar, voice library, conversation, look (also the first-time setup) ---------------- */
  const VL = window.ERLY_VOICELIB, PR = window.ERLY_PROSODY;
  const PRESETS = [
    ['friendly', 'The Friendly Companion', 'الرفيق الودود', 'Warm, natural and easy to talk to.', 'دافئ وطبيعي وسهل الحديث.', { style: 'conversational', tone: 'friendly', expr: 1, length: 'medium', mode: 'natural' }],
    ['pro', 'The Professional Assistant', 'المساعد المحترف', 'Polished, precise and efficient.', 'مصقول ودقيق وفعّال.', { style: 'concise', tone: 'professional', expr: 0.7, length: 'medium', mode: 'natural' }],
    ['teacher', 'The Patient Teacher', 'المعلم الصبور', 'Step by step, checks you’re following.', 'خطوة بخطوة، ويتأكد أنك تتابع.', { style: 'steps', tone: 'educational', expr: 0.9, length: 'long', mode: 'study' }],
    ['explorer', 'The Curious Explorer', 'المستكشف الفضولي', 'Asks good questions, loves “why”.', 'يطرح أسئلة جيدة ويحب «لماذا».', { style: 'conversational', tone: 'warm', expr: 1.2, length: 'medium', mode: 'natural' }],
    ['calm', 'The Calm Guide', 'المرشد الهادئ', 'Slow, gentle and reassuring.', 'بطيء ولطيف ومطمئن.', { style: 'conversational', tone: 'calm', expr: 0.6, length: 'medium', mode: 'natural', rate: 0.92 }],
    ['coach', 'The Energetic Coach', 'المدرب النشيط', 'Upbeat, motivating, gets you moving.', 'متحمس ومحفّز ويدفعك للبدء.', { style: 'concise', tone: 'energetic', expr: 1.35, length: 'short', mode: 'planning' }],
    ['expert', 'The Concise Expert', 'الخبير المختصر', 'Straight to the point.', 'مباشر إلى صلب الموضوع.', { style: 'concise', tone: 'direct', expr: 0.6, length: 'short', mode: 'focus' }],
    ['creative', 'The Creative Partner', 'الشريك المبدع', 'Brainstorms ideas with you.', 'يعصف معك بالأفكار.', { style: 'conversational', tone: 'warm', expr: 1.25, length: 'medium', mode: 'creative' }]
  ];
  const MODES = [['natural', 'Natural conversation', 'محادثة طبيعية', 'sparkle'], ['study', 'Study', 'مذاكرة', 'book'], ['focus', 'Focus', 'تركيز', 'target'], ['deep', 'Deep explanation', 'شرح معمّق', 'layers'], ['practice', 'Practice', 'تدريب', 'pen'], ['reading', 'Reading companion', 'رفيق القراءة', 'bookmark'], ['research', 'Research', 'بحث', 'search'], ['creative', 'Creative', 'إبداع', 'bolt'], ['planning', 'Planning', 'تخطيط', 'calendar']];
  const THEMES = [['studio', 'Studio', 'استوديو'], ['dusk', 'Dusk', 'غسق'], ['sunrise', 'Sunrise', 'شروق'], ['ocean', 'Ocean', 'محيط'], ['forest', 'Forest', 'غابة'], ['daylight', 'Daylight', 'نهار']];
  const REC = [['', 'Same as my language', 'نفس لغتي'], ['en-US', 'English (US)', 'الإنجليزية (أمريكا)'], ['en-GB', 'English (UK)', 'الإنجليزية (بريطانيا)'], ['en-IN', 'English (India)', 'الإنجليزية (الهند)'], ['en-AU', 'English (Australia)', 'الإنجليزية (أستراليا)'], ['ar-AE', 'Arabic (UAE)', 'العربية (الإمارات)'], ['ar-SA', 'Arabic (Saudi)', 'العربية (السعودية)'], ['ar-EG', 'Arabic (Egypt)', 'العربية (مصر)']];
  let tab = 'companion', setupMode = false;
  function openStudio(which, setup) {
    tab = which || 'companion'; setupMode = !!setup;
    hush(); if (st.listening) { v.abortListening(); st.listening = false; }
    const box = $('#ncStudio'); box.hidden = false;
    drawStudio();
    requestAnimationFrame(() => box.classList.add('is-in'));
  }
  function closeStudio() {
    const box = $('#ncStudio'); if (!box || box.hidden) return;
    if (st.preview) { st.preview.destroy(); st.preview = null; }
    v.stop();
    box.classList.remove('is-in'); box.hidden = true;
    const wasSetup = setupMode; setupMode = false;
    render();
    if (wasSetup) { save({ setup: true }); gate(); }
    else afterSpeaking();
  }
  const ALLTABS = [['companion', 'Companion', 'الرفيق', 'users'], ['avatar', 'Avatar', 'الشخصية', 'smile'], ['voice', 'Voice library', 'مكتبة الأصوات', 'volume'], ['talk', 'Conversation', 'المحادثة', 'chat'], ['look', 'Look & access', 'المظهر', 'eye']];
  const SETUP = ['avatar', 'voice', 'companion'];
  const tabsNow = () => setupMode ? SETUP.map(k => ALLTABS.find(t => t[0] === k)) : ALLTABS;
  function drawStudio() {
    const box = $('#ncStudio');
    const TABS = tabsNow();
    const i = Math.max(0, TABS.findIndex(t => t[0] === tab));
    const last = i === TABS.length - 1;
    box.innerHTML = `<div class="nstudio__card" role="dialog" aria-label="${T('Companion Studio', 'استوديو الرفيق')}">
      <header class="nstudio__h">
        ${setupMode ? `<div><b>${T('Set up your companion', 'جهّز رفيقك')}</b><small>${T(`Step ${i + 1} of ${TABS.length}`, `الخطوة ${i + 1} من ${TABS.length}`)}</small></div>` : `<div><b>${T('Companion Studio', 'استوديو الرفيق')}</b><small>${T('Everything is saved on this device', 'كل شيء محفوظ على هذا الجهاز')}</small></div>`}
        ${setupMode ? `<button type="button" class="btn btn--ghost btn--sm" data-setup="skip">${T('Skip — use defaults', 'تخطٍّ — الإعدادات الافتراضية')}</button>` : `<button type="button" class="ncall__ic" data-st="close" aria-label="${T('Close', 'إغلاق')}">${ICON('x')}</button>`}
      </header>
      <div class="nstudio__top"><div class="nstudio__pvav" id="nsPv"></div><div class="nstudio__pvtxt"><b id="nsPvName"></b><p id="nsPvAbout"></p><button type="button" class="btn btn--sm btn--ghost" data-hear>${ICON('play')} ${T('Hear a hello', 'استمع للتحية')}</button></div></div>
      <nav class="nstudio__tabs" role="tablist">${TABS.map(([k, en, ar, ic], n) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${setupMode ? `<i>${n + 1}</i>` : ICON(ic)} ${pick(en, ar)}</button>`).join('')}</nav>
      <div class="nstudio__body" id="nsBody"></div>
      <footer class="nstudio__f">
        ${setupMode ? `${i > 0 ? `<button type="button" class="btn btn--ghost" data-step="-1">${T('Back', 'رجوع')}</button>` : '<span></span>'}<button type="button" class="btn btn--accent" data-step="1">${!last ? T('Next', 'التالي') : T('Start talking', 'ابدأ الحديث')} ${ICON(!last ? 'arrow' : 'headphones')}</button>`
          : `<button type="button" class="btn btn--ghost btn--sm" data-st="reset">${ICON('reset')} ${T('Reset to defaults', 'استعادة الافتراضي')}</button><button type="button" class="btn btn--accent" data-st="close">${T('Done', 'تم')}</button>`}
      </footer>
    </div>`;
    box.onclick = studioClick;
    box.oninput = studioInput;
    box.onchange = studioChange;
    const body = box.querySelector('#nsBody');
    ({ companion: companionPane, avatar: avatarPane, voice: voicePane, talk: talkPane, look: lookPane })[tab](body);
    showPreview(cfg().avatar);
  }
  function studioClick(e) {
    const t = e.target;
    const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; return drawStudio(); }
    const TABS = tabsNow();
    const sp = t.closest('[data-step]'); if (sp) { const i = TABS.findIndex(x => x[0] === tab) + +sp.dataset.step; if (i > TABS.length - 1) return closeStudio(); tab = TABS[Math.max(0, i)][0]; return drawStudio(); }
    if (t.closest('[data-setup="skip"]')) return closeStudio();
    const s = t.closest('[data-st]');
    if (s && s.dataset.st === 'close') return closeStudio();
    if (s && s.dataset.st === 'reset') { U.store.setPref('vs', { setup: true, profiles: cfg().profiles, favs: cfg().favs }); U.store.setPref('voices', {}); return drawStudio(); }
    const av = t.closest('[data-av]'); if (av) return pickAvatar(av.dataset.av);
    const fv = t.closest('[data-fav]'); if (fv) { const f = new Set(cfg().favs); f.has(fv.dataset.fav) ? f.delete(fv.dataset.fav) : f.add(fv.dataset.fav); save({ favs: [...f] }); return drawStudio(); }
    const vp = t.closest('[data-vp]'); if (vp) { pickVoiceProfile(vp.dataset.vp, !!t.closest('[data-play]')); return; }
    const vc = t.closest('[data-vcat]'); if (vc) { st.vcat = vc.dataset.vcat; return drawStudio(); }
    const ps = t.closest('[data-preset]'); if (ps) { const p = PRESETS.find(x => x[0] === ps.dataset.preset); save(Object.assign({ preset: p[0] }, p[5])); drawStudio(); return preview(); }
    const pf = t.closest('[data-prof]'); if (pf) return profileAction(pf.dataset.prof, +pf.dataset.k);
    const opt = t.closest('[data-opt]'); if (opt) { const [k, val] = opt.dataset.opt.split(':'); save({ [k]: val === 'true' ? true : val === 'false' ? false : val }); if (k === 'lang') setLang(val); if (k === 'theme') el.dataset.theme = val; return drawStudio(); }
    if (t.closest('[data-hear]')) preview();
  }
  function studioInput(e) {
    const r = e.target.closest('[data-range]');
    if (r) { save({ [r.dataset.range]: +r.value }); const o = r.parentElement.querySelector('output'); if (o) o.textContent = fmt(r.dataset.range, +r.value); return; }
    if (e.target.id === 'nsSearch') { st.vq = e.target.value; const pos = e.target.selectionStart; drawStudio(); const i = $('#nsSearch'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }
  }
  function studioChange(e) {
    if (e.target.id === 'nsRec') save({ recLang: e.target.value });
    if (e.target.id === 'nsDict') save({ dict: e.target.value.split('\n').map(l => l.split('=')).filter(x => x.length === 2 && x[0].trim() && x[1].trim()).map(([w, s]) => ({ word: w.trim(), say: s.trim() })).slice(0, 40) });
    if (e.target.id === 'nsProfName') st.profName = e.target.value;
  }
  const fmt = (k, x) => k === 'volume' ? Math.round(x * 100) + '%' : k === 'expr' ? Math.round(x * 100) + '%' : x.toFixed(2) + '×';
  function range(k, en, ar, lim, c) { return `<label class="nstudio__range"><span>${pick(en, ar)}</span><input type="range" min="${lim[0]}" max="${lim[1]}" step="${lim[2]}" value="${c[k]}" data-range="${k}"><output>${fmt(k, c[k])}</output></label>`; }
  const segOf = (key, items, c) => `<div class="nstudio__seg nstudio__seg--wrap">${items.map(([k, en, ar]) => `<button type="button" data-opt="${key}:${k}" aria-pressed="${String(c[key]) === String(k)}">${pick(en, ar)}</button>`).join('')}</div>`;
  const swOf = (key, en, ar, hint, c) => `<label class="nstudio__sw"><span><b>${pick(en, ar)}</b>${hint ? `<small>${hint}</small>` : ''}</span><button type="button" role="switch" aria-checked="${!!c[key]}" data-opt="${key}:${!c[key]}"><i></i></button></label>`;

  /* companion: personality presets and saved profiles */
  function companionPane(body) {
    const c = cfg();
    body.innerHTML = `<p class="nstudio__k">${T('Personality', 'الشخصية')}</p>
      <div class="nstudio__presets">${PRESETS.map(([id, en, ar, den, dar], k) => `<button type="button" class="nstudio__preset ${c.preset === id ? 'is-on' : ''}" data-preset="${id}" style="--i:${k}" aria-pressed="${c.preset === id}"><b>${pick(en, ar)}</b><small>${pick(den, dar)}</small></button>`).join('')}</div>
      <p class="nstudio__note">${T('Personalities change how your companion talks — never its facts, honesty or safety rules.', 'تغيّر الشخصيات طريقة الحديث فقط — لا الحقائق ولا الصدق ولا قواعد الأمان.')}</p>
      ${setupMode ? '' : `<p class="nstudio__k">${T('Saved companions', 'الرفاق المحفوظون')}</p>
      <div class="nstudio__profs">${(c.profiles || []).map((p, k) => `<div class="nstudio__prof"><span class="nstudio__face nstudio__face--sm">${faceThumb(p.avatar)}</span><span><b>${esc(p.name)}</b><small>${esc(AV.get(p.avatar).name)} · ${esc(voiceLabel(p))}</small></span><button type="button" class="btn btn--sm btn--accent" data-prof="use" data-k="${k}">${T('Use', 'استخدم')}</button><button type="button" class="ncall__ic" data-prof="del" data-k="${k}" aria-label="${T('Delete', 'حذف')}">${ICON('trash')}</button></div>`).join('') || `<p class="nstudio__none">${T('Save the current avatar, voice and personality as a companion you can switch back to.', 'احفظ الشخصية والصوت والأسلوب الحاليين كرفيق يمكنك العودة إليه.')}</p>`}</div>
      <div class="nstudio__save"><input id="nsProfName" maxlength="30" placeholder="${T('Name, e.g. “Exam mode”', 'اسم، مثل «وضع الامتحان»')}" value="${esc(st.profName || '')}"><button type="button" class="btn btn--sm btn--ghost" data-prof="save">${ICON('bookmark')} ${T('Save current', 'احفظ الحالي')}</button></div>`}`;
  }
  const KEEP = ['avatar', 'rate', 'pitch', 'volume', 'style', 'tone', 'expr', 'length', 'mode', 'theme', 'preset', 'prof', 'gender'];
  function voiceLabel(p) { const id = p.prof && p.prof.en && p.prof.en.id; const vp = id && VL.get(id); return vp ? vp.name : T('device voice', 'صوت الجهاز'); }
  function profileAction(kind, k) {
    const c = cfg(), list = (c.profiles || []).slice();
    if (kind === 'save') {
      const name = (($('#nsProfName') || {}).value || '').trim() || `${AV.get(c.avatar).name} · ${new Date().toLocaleDateString()}`;
      const snap = { name, voices: Object.assign({}, U.store.prefs().voices || {}) }; KEEP.forEach(x => { snap[x] = c[x]; });
      list.unshift(snap); st.profName = ''; save({ profiles: list.slice(0, 12) });
    } else if (kind === 'use' && list[k]) {
      const p = list[k], patch = {}; KEEP.forEach(x => { if (p[x] !== undefined) patch[x] = p[x]; });
      save(patch); U.store.setPref('voices', Object.assign({}, p.voices || {}));
      if (p.theme) el.dataset.theme = p.theme;
      preview();
    } else if (kind === 'del') { list.splice(k, 1); save({ profiles: list }); }
    drawStudio();
  }

  /* avatar gallery: photoreal and illustrated */
  function faceThumb(id) {
    const a = AV.get(id);
    if (a.photo) return `<img src="${a.thumb}" alt="" loading="lazy" class="nstudio__ph">`;
    return a.abstract ? '<span class="avt-aura avt-aura--mini"><i></i><i></i><b></b></span>' : AV.svg(a.id, true);
  }
  function avatarPane(body) {
    const c = cfg();
    const card = (a, k) => `<button type="button" class="nstudio__av ${a.id === c.avatar ? 'is-on' : ''}" data-av="${a.id}" style="--i:${k}" aria-pressed="${a.id === c.avatar}"><span class="nstudio__face">${faceThumb(a.id)}</span><b>${esc(a.name)}</b><small>${esc(pick(a.en[0], a.ar[0]))}</small></button>`;
    const photos = AV.list.filter(a => a.photo), drawn = AV.list.filter(a => !a.photo);
    body.innerHTML = `<p class="nstudio__k">${T('Photoreal digital humans', 'بشر رقميون واقعيون')}</p>
      <div class="nstudio__grid">${photos.map(card).join('')}</div>
      ${ERLY.photoHead && !ERLY.photoHead.supported() ? `<p class="nstudio__none">${T('This browser can’t draw the photoreal faces (WebGL is off), so their illustrated twins are used instead.', 'لا يستطيع هذا المتصفح عرض الوجوه الواقعية (WebGL متوقف)، لذا تُستخدم نسخ مرسومة.')}</p>` : ''}
      <p class="nstudio__k">${T('Illustrated', 'مرسومة')}</p>
      <div class="nstudio__grid">${drawn.map((a, k) => card(a, k + photos.length)).join('')}</div>
      <p class="nstudio__note">${T('All companions are original virtual characters made for ERLY — AI, not real people or human operators.', 'جميع الرفاق شخصيات افتراضية أصلية صُممت لـ ERLY — ذكاء اصطناعي، وليسوا أشخاصاً حقيقيين أو موظفين.')}</p>`;
  }
  function showPreview(id) {
    const a = AV.get(id);
    if (st.preview) st.preview.destroy();
    const host = $('#nsPv'); if (!host) return;
    st.preview = AV.mount(host, a.id).attach(v);
    const n = $('#nsPvName'), ab = $('#nsPvAbout');
    if (n) n.textContent = a.name + ' · ' + pick(a.en[0], a.ar[0]);
    const vp = currentProfile();
    if (ab) ab.textContent = pick(a.en[1], a.ar[1]) + (vp ? ' ' + T(`Voice: ${vp.profile.name} (${vp.profile.accent}).`, `الصوت: ${vp.profile.name}.`) : '');
  }
  function pickAvatar(id) {
    const a = AV.get(id);
    const patch = { avatar: id };
    const cur = currentProfile();
    // a new face gets a matching voice, unless the student picked one themselves
    if (a.g && (!cur || cur.profile.g !== a.g)) {
      patch.gender = a.g;
      const lib = library();
      const match = lib.available.find(x => x.profile.g === a.g && x.profile.lang === U.lang());
      if (match) { applyProfile(match, true); } else { const vs = Object.assign({}, U.store.prefs().voices || {}); delete vs[U.lang()]; U.store.setPref('voices', vs); }
    }
    save(patch);
    drawStudio();
    preview();
  }

  /* voice library */
  function library() {
    const all = window.speechSynthesis && speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
    return VL.resolve(all, { score: VX.naturalScore, gender: VX.gender });
  }
  function currentProfile() {
    const pr = (cfg().prof || {})[U.lang()];
    if (!pr) return null;
    return library().available.find(x => x.profile.id === pr.id) || null;
  }
  function applyProfile(x, quiet) {
    const p = x.profile;
    const vs = Object.assign({}, U.store.prefs().voices || {}); vs[p.lang] = x.voice.name; U.store.setPref('voices', vs);
    const prof = Object.assign({}, cfg().prof || {}); prof[p.lang] = { id: p.id, rate: p.rate, pitch: p.pitch };
    save({ prof, gender: p.g, expr: quiet ? cfg().expr : p.expr });
  }
  function pickVoiceProfile(id, playOnly) {
    const x = library().available.find(y => y.profile.id === id); if (!x) return;
    if (!playOnly) applyProfile(x);
    // the sample is generated by the real voice, with this profile's own pace and pitch
    const p = x.profile;
    const sample = p.lang === 'ar' ? `مرحباً، أنا ${AV.get(cfg().avatar).name}. ${p.ar} لنتعلم معاً اليوم!` : `Hi, I’m ${AV.get(cfg().avatar).name}. ${p.en} Shall we learn something new today?`;
    sayPreview(sample, p.lang, playOnly ? { voice: x.voice.name, rate: p.rate, pitch: p.pitch } : null);
    if (!playOnly) drawStudio();
  }
  function voicePane(body) {
    const c = cfg(), lib = library(), cat = st.vcat || 'all', qy = (st.vq || '').toLowerCase();
    const cur = currentProfile();
    const favs = new Set(c.favs || []);
    const CATS = [['all', 'All', 'الكل'], ['fav', '★ Favourites', '★ المفضلة'], ['f', 'Female', 'أنثى'], ['m', 'Male', 'ذكر'], ['American', 'American', 'أمريكية'], ['British', 'British', 'بريطانية'], ['Indian English', 'Indian', 'هندية'], ['Australian', 'Australian', 'أسترالية'], ['arabic', 'Arabic', 'عربية']];
    const ok = x => { const p = x.profile; if (cat === 'fav' && !favs.has(p.id)) return false; if ((cat === 'f' || cat === 'm') && p.g !== cat) return false; if (cat === 'arabic' && p.lang !== 'ar') return false; if (/^[A-Z]/.test(cat) && p.accent !== cat) return false; if (qy && !(p.name + ' ' + p.en + ' ' + p.accent + ' ' + x.voice.name).toLowerCase().includes(qy)) return false; return true; };
    const list = lib.available.filter(ok);
    body.innerHTML = `
      <div class="nstudio__vtools"><input id="nsSearch" type="search" placeholder="${T('Search voices — “calm”, “British”, “Arabic”…', 'ابحث عن صوت — «هادئ»، «عربي»…')}" value="${esc(st.vq || '')}" aria-label="${T('Search voices', 'البحث عن الأصوات')}"></div>
      <div class="nstudio__cats">${CATS.map(([k, en, ar]) => `<button type="button" data-vcat="${k}" aria-pressed="${cat === k}">${pick(en, ar)}</button>`).join('')}</div>
      <div class="nstudio__vlib">${list.map(x => { const p = x.profile, on = cur && cur.profile.id === p.id; return `<div class="nstudio__vc ${on ? 'is-on' : ''}">
        <button type="button" class="nstudio__vmain" data-vp="${p.id}" aria-pressed="${!!on}"><span class="nstudio__vav ${p.g === 'm' ? 'is-m' : ''}">${esc(p.name[0])}</span><span><b>${esc(p.name)}</b><small>${esc(p.accent)} · ${p.g === 'f' ? T('female-sounding', 'صوت أنثوي') : T('male-sounding', 'صوت ذكوري')}</small><em>${esc(pick(p.en, p.ar))}</em><i class="nstudio__uses">${T('Uses', 'يستخدم')}: ${esc(x.voice.name.replace(/\s+-\s+.*$/, '').replace(/^Microsoft /, ''))} · ${esc(x.voice.lang)}</i></span></button>
        <div class="nstudio__vact"><button type="button" class="ncall__ic" data-vp="${p.id}" data-play aria-label="${T('Preview', 'معاينة')} ${esc(p.name)}">${ICON('play')}</button><button type="button" class="ncall__ic ${favs.has(p.id) ? 'is-fav' : ''}" data-fav="${p.id}" aria-pressed="${favs.has(p.id)}" aria-label="${T('Favourite', 'مفضلة')}">${ICON('star')}</button></div></div>`; }).join('') || `<p class="nstudio__none">${lib.available.length ? T('No voices match.', 'لا توجد أصوات مطابقة.') : T('This browser hasn’t loaded any voices yet. Try Microsoft Edge (the widest choice of natural voices) or, on iPad, Settings → Accessibility → Spoken Content → Voices.', 'لم يحمّل هذا المتصفح أي أصوات بعد. جرّب مايكروسوفت إيدج أو، على الآيباد، الإعدادات ← تسهيلات الاستخدام ← المحتوى المنطوق ← الأصوات.')}</p>`}</div>
      ${lib.missing.length ? `<details class="nstudio__missing"><summary>${T(`${lib.missing.length} more voices aren’t on this device`, `${lib.missing.length} أصوات أخرى غير متوفرة على هذا الجهاز`)}</summary><p>${lib.missing.map(p => `<span>${esc(p.name)} · ${esc(p.accent)}</span>`).join('')}</p><p class="nstudio__note">${T('They appear automatically when a matching voice is installed: Microsoft Edge includes Indian, British, Australian and Gulf Arabic neural voices; on iPad and Mac, download Premium/Enhanced voices in Settings → Accessibility → Spoken Content → Voices.', 'تظهر تلقائياً عند تثبيت صوت مناسب.')}</p></details>` : ''}
      ${range('rate', 'Speed', 'السرعة', [0.6, 1.5, 0.05], c)}${range('pitch', 'Pitch', 'طبقة الصوت', [0.7, 1.3, 0.05], c)}${range('volume', 'Volume', 'مستوى الصوت', [0.2, 1, 0.05], c)}${range('expr', 'Expressiveness', 'التعبير', [0, 1.5, 0.05], c)}
      <p class="nstudio__note">${T('Expressiveness lets the voice brighten when something is exciting and soften when reassuring — by changing pace, pitch and pauses sentence by sentence.', 'يجعل التعبير الصوت أكثر إشراقاً عند الحماس وأهدأ عند الطمأنة — بتغيير السرعة والنبرة والتوقفات جملة بجملة.')}</p>
      <div class="nstudio__row"><span class="nstudio__k">${T('Language', 'اللغة')}</span>${segOf('lang', [['en', 'English', 'English'], ['ar', 'العربية', 'العربية']], { lang: U.lang() })}</div>
      <label class="nstudio__field"><span>${T('I speak (for recognition)', 'أتحدث بـ (للتعرف على الكلام)')}</span><select id="nsRec">${REC.map(([k, en, ar]) => `<option value="${k}" ${c.recLang === k ? 'selected' : ''}>${pick(en, ar)}</option>`).join('')}</select></label>
      <label class="nstudio__field"><span>${T('How to say names (one per line: Word = say it like)', 'طريقة نطق الأسماء (سطر لكل اسم: الكلمة = طريقة النطق)')}</span><textarea id="nsDict" rows="2" placeholder="Siobhan = shiv-awn">${esc((c.dict || []).map(d => d.word + ' = ' + d.say).join('\n'))}</textarea></label>`;
  }
  // a preview through the real voice path, so the lips move exactly as they will in the conversation
  function sayPreview(text, lang, once) {
    v.stop();
    const ctl = st.preview; if (ctl) { ctl.attach(v); ctl.setState('speaking'); }
    const tone = PR ? PR.classify(text, {}) : 'neutral';
    // "once" plays one profile without choosing it (its own voice, pace and pitch)
    v.speak(text, Object.assign({ lang, emotion: tone, prosody: PR ? PR.prosody(tone, cfg().expr) : null, onend: () => { if (ctl) ctl.setState('idle'); } }, once ? { voiceName: once.voice, baseRate: once.rate, basePitch: once.pitch } : {}));
  }
  function preview() {
    const a = AV.get(cfg().avatar);
    sayPreview(pick(`Hi, I’m ${a.name}! ${a.en[1]} What would you like to learn today?`, `أهلاً، أنا ${a.name}! ${a.ar[1]} ماذا تحب أن تتعلم اليوم؟`), U.lang());
  }

  /* conversation */
  function talkPane(body) {
    const c = cfg();
    body.innerHTML = `
      <p class="nstudio__k">${T('Mode', 'الوضع')}</p>
      <div class="nstudio__modes">${MODES.map(([k, en, ar, ic]) => `<button type="button" data-opt="mode:${k}" aria-pressed="${c.mode === k}">${ICON(ic)} ${pick(en, ar)}</button>`).join('')}</div>
      <p class="nstudio__note">${modeHint(c.mode)}</p>
      <p class="nstudio__k">${T('Explanations', 'الشرح')}</p>${segOf('style', STYLES, c)}
      <p class="nstudio__k">${T('Answer length', 'طول الإجابة')}</p>${segOf('length', [['short', 'Short', 'قصيرة'], ['medium', 'Medium', 'متوسطة'], ['long', 'Long', 'طويلة']], c)}
      <p class="nstudio__k">${T('Tone', 'النبرة')}</p>${segOf('tone', TONES, c)}
      <p class="nstudio__k">${T('Pause before your companion answers', 'المهلة قبل الإجابة')}</p>${segOf('quiet', [['short', 'Short', 'قصيرة'], ['normal', 'Normal', 'عادية'], ['long', 'Long — I think while I talk', 'طويلة — أفكر وأنا أتكلم']], c)}
      ${swOf('handsFree', 'Hands-free', 'بدون استخدام اليدين', T('Listens again by itself after answering', 'يعود للاستماع تلقائياً بعد الإجابة'), c)}
      ${SAFARI ? '' : swOf('barge', 'Interrupt by talking', 'المقاطعة بالكلام', T('Start talking to stop it — best with headphones', 'ابدأ الكلام لإيقافه — الأفضل مع سماعات'), c)}`;
  }
  function modeHint(m) {
    return ({ natural: T('Speak normally — everyday back-and-forth.', 'تحدث بشكل طبيعي.'), study: T('Explains, then checks you understood with a quick question.', 'يشرح ثم يتأكد من فهمك بسؤال سريع.'), focus: T('Short answers, no small talk.', 'إجابات قصيرة بلا أحاديث جانبية.'), deep: T('Detailed explanations with examples.', 'شرح مفصّل مع أمثلة.'), practice: T('Quizzes you one question at a time and gives feedback.', 'يختبرك بسؤال واحد في كل مرة ويعطيك ملاحظات.'), reading: T('Reads and explains the open reading — paragraph by paragraph.', 'يقرأ ويشرح القراءة المفتوحة فقرة بفقرة.'), research: T('Helps you investigate a topic; says what it isn’t sure of and points to sources to check. It doesn’t browse the web by itself.', 'يساعدك في البحث؛ يوضح ما لا يتأكد منه ويقترح مصادر. لا يتصفح الإنترنت بنفسه.'), creative: T('Brainstorms ideas, stories and presentations with you.', 'يعصف معك بالأفكار والقصص والعروض.'), planning: T('Breaks goals into small, practical steps.', 'يقسّم الأهداف إلى خطوات صغيرة عملية.') })[m] || '';
  }
  /* look & accessibility */
  function lookPane(body) {
    const c = cfg();
    body.innerHTML = `<p class="nstudio__k">${T('Background', 'الخلفية')}</p>
      <div class="nstudio__themes">${THEMES.map(([k, en, ar]) => `<button type="button" class="nstudio__theme t-${k}" data-opt="theme:${k}" aria-pressed="${c.theme === k}"><i></i>${pick(en, ar)}</button>`).join('')}</div>
      ${swOf('captions', 'Captions', 'الترجمة النصية', '', c)}
      <p class="nstudio__k">${T('Caption size', 'حجم النص')}</p>${segOf('capSize', [['s', 'Small', 'صغير'], ['m', 'Medium', 'متوسط'], ['l', 'Large', 'كبير']], c)}
      ${swOf('contrast', 'High contrast', 'تباين عالٍ', '', c)}
      <p class="nstudio__note">${T('Keyboard: Space interrupts or sends, M mutes, P pauses, Esc closes. Reduced-motion settings on your device keep the avatar still.', 'لوحة المفاتيح: المسافة للمقاطعة أو الإرسال، M للكتم، P للإيقاف المؤقت، Esc للإغلاق.')}</p>`;
  }
  function setLang(l) {
    if (window.I18N && I18N.lang !== l) I18N.apply(l);
  }
  if (window.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => { if (st.on && tab === 'voice' && !$('#ncStudio').hidden && !(document.activeElement && document.activeElement.id === 'nsSearch')) drawStudio(); });

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
