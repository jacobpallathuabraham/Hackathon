/* ERLY — talk with Noor: a two-way, hands-free voice conversation.

   Noor speaks, then listens for your answer, then replies — turn by turn,
   like a conversation with a person, with live captions for both sides.
   Tap Noor (or press Space) to interrupt her. Optional "interrupt by
   talking" uses the microphone level, best with headphones.

   Privacy: it only starts when you press "Talk to Noor", after the
   microphone consent; the mic is released when the call ends; no audio is
   recorded or stored — only the recognised text appears in the chat. In
   Chrome/Edge the browser's own speech service transcribes the audio.
   This is turn-taking built on the browser's speech features, not a
   streaming real-time voice model. */
(function () {
  'use strict';
  const C = ERLY.companion;
  if (!C || !C._ui) return;
  const U = C._ui;
  const { T, pick, esc } = U;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const v = U.voice;

  const el = document.createElement('div');
  el.className = 'ncall'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  document.body.appendChild(el);

  const st = { on: false, queue: [], speaking: false, listening: false, idleT: null, misses: 0, stream: null, ac: null, raf: 0, level: 0, bargeIn: false, loudSince: 0, muted: false, chips: null };

  function render() {
    el.setAttribute('aria-label', T('Voice conversation with Noor', 'محادثة صوتية مع نور'));
    el.innerHTML = `
      <div class="ncall__bg" aria-hidden="true"><i></i><i></i><i></i></div>
      <header class="ncall__top">
        <span class="ncall__live"><i></i>${T('Voice conversation', 'محادثة صوتية')}</span>
        <span class="ncall__mode">${U.llm.active().simulated ? T('Demo · built-in knowledge', 'عرض · معرفة مدمجة') : T('AI model connected', 'نموذج ذكاء اصطناعي متصل')}</span>
      </header>
      <main class="ncall__main">
        <button type="button" class="ncall__orb" id="ncOrb" aria-label="${T('Tap to interrupt Noor or to talk', 'انقر لمقاطعة نور أو للتحدث')}">
          <span class="ncall__ring"></span><span class="ncall__ring"></span><span class="ncall__ring"></span>
          <span class="ncall__face"><i class="ncall__eye"></i><i class="ncall__eye"></i><i class="ncall__mouth"></i></span>
        </button>
        <p class="ncall__state" id="ncState" aria-live="polite"></p>
        <div class="ncall__caps">
          <p class="ncall__noor" id="ncNoor"></p>
          <p class="ncall__you" id="ncYou"></p>
        </div>
        <div class="ncall__chips" id="ncChips"></div>
        <div class="ncall__consent" id="ncConsent" hidden></div>
      </main>
      <footer class="ncall__bar">
        <label class="ncall__barge"><input type="checkbox" id="ncBarge" ${st.bargeIn ? 'checked' : ''}><span>${T('Interrupt by talking (best with headphones)', 'المقاطعة بالكلام (الأفضل مع سماعات)')}</span></label>
        <div class="ncall__btns">
          <button type="button" class="ncall__btn" id="ncMute" aria-pressed="false" aria-label="${T('Pause listening', 'إيقاف الاستماع مؤقتاً')}">${MIC_ICON}</button>
          <button type="button" class="ncall__btn ncall__btn--end" id="ncEnd" aria-label="${T('End the conversation', 'إنهاء المحادثة')}">${END_ICON}</button>
          <button type="button" class="ncall__btn" id="ncType" aria-label="${T('Switch to typing', 'التحول إلى الكتابة')}">${ICON('text')}</button>
        </div>
      </footer>`;
    el.querySelector('#ncOrb').onclick = interrupt;
    el.querySelector('#ncEnd').onclick = end;
    el.querySelector('#ncType').onclick = () => { end(); C.open('chat'); };
    el.querySelector('#ncMute').onclick = toggleMute;
    el.querySelector('#ncBarge').onchange = e => { st.bargeIn = e.target.checked; };
  }
  const MIC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const END_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15.5c5-4.6 13-4.6 18 0l-2.3 2.6-3.6-1.6v-2.6a9.6 9.6 0 0 0-6.2 0v2.6l-3.6 1.6z" fill="currentColor"/></svg>';
  const $ = s => el.querySelector(s);
  function setState(s) {
    el.dataset.s = s;
    const txt = { speaking: T('Noor is talking — tap her to interrupt', 'نور تتحدث — انقر عليها للمقاطعة'), listening: T('Listening… go ahead', 'أستمع… تفضل'), thinking: T('Thinking…', 'أفكر…'), idle: T('Tap Noor when you’re ready to talk', 'انقر على نور عندما تكون مستعداً للتحدث'), muted: T('Listening paused', 'الاستماع متوقف مؤقتاً') }[s] || '';
    const p = $('#ncState'); if (p) p.textContent = txt;
  }

  /* ---------------- start / end ---------------- */
  ERLY.on('noor:call', start);
  async function start() {
    if (st.on) return;
    if (!v.supported.tts) { C.open('chat'); U.bubble('ai', T('Voice conversations need your browser’s speech voice, which isn’t available here. We can keep chatting by text.', 'تحتاج المحادثات الصوتية إلى صوت الكلام في متصفحك، وهو غير متاح هنا. يمكننا الاستمرار بالكتابة.'), { text: true, cls: 'cmsg--note' }); return; }
    st.on = true; C.inCall = true; st.queue = []; st.misses = 0; st.muted = false;
    render();
    el.hidden = false; document.documentElement.classList.add('studio-open');
    requestAnimationFrame(() => el.classList.add('is-in'));
    if (!C.isOpen()) C.open('chat');
    if (!v.supported.stt) {
      showConsent('unsupported');
    } else if (!U.store.consent('mic')) {
      showConsent('ask'); return;
    }
    begin();
  }
  function showConsent(kind) {
    const box = $('#ncConsent'); box.hidden = false;
    if (kind === 'unsupported') {
      box.innerHTML = `<p>${T('This browser can’t listen, so Noor will talk and you can tap answers or type. For full voice, try Chrome, Edge or Safari.', 'لا يستطيع هذا المتصفح الاستماع، لذا ستتحدث نور ويمكنك النقر على الإجابات أو الكتابة. للصوت الكامل، جرّب كروم أو إيدج أو سفاري.')}</p>`;
      return;
    }
    box.innerHTML = `<b>${T('Talk with Noor using your microphone?', 'التحدث مع نور باستخدام الميكروفون؟')}</b>
      <p>${T('Noor listens only while this conversation is open and stops when you end it. No audio is recorded or kept — only the words appear in your chat, and you can delete them. In Chrome and Edge, the browser’s own speech service turns your voice into text.', 'تستمع نور فقط أثناء فتح هذه المحادثة وتتوقف عند إنهائها. لا يُسجَّل أي صوت ولا يُحفظ — تظهر الكلمات فقط في محادثتك ويمكنك حذفها. في كروم وإيدج، تحوّل خدمة الكلام في المتصفح صوتك إلى نص.')}</p>
      <div class="ncall__cbtns"><button type="button" class="btn btn--accent" data-c="yes">${T('Allow microphone', 'السماح بالميكروفون')}</button><button type="button" class="btn btn--ghost" data-c="no">${T('Not now', 'ليس الآن')}</button></div>`;
    box.onclick = e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      box.hidden = true;
      if (b.dataset.c === 'yes') { U.store.setConsent('mic', true); begin(); } else end();
    };
  }
  async function begin() {
    if (v.supported.stt && U.store.consent('mic')) meter();
    const hello = pick('Hi! I’m listening. You can ask me anything, or tell me what’s been feeling hard lately — reading, lectures, focus, exams, anything.', 'أهلاً! أنا أستمع. يمكنك سؤالي أي شيء، أو إخباري بما كان صعباً مؤخراً — القراءة أو المحاضرات أو التركيز أو الاختبارات، أي شيء.');
    U.bubble('ai', hello, { text: true });
    enqueue(hello);
  }
  function end() {
    if (!st.on) return;
    st.on = false; C.inCall = false;
    clearTimeout(st.idleT);
    v.stop(); v.abortListening();
    stopMeter();
    el.classList.remove('is-in');
    document.documentElement.classList.remove('studio-open');
    setTimeout(() => { if (!el.classList.contains('is-in')) { el.hidden = true; el.innerHTML = ''; } }, reduce ? 0 : 400);
  }
  addEventListener('keydown', e => {
    if (!st.on) return;
    if (e.key === 'Escape') { e.stopPropagation(); end(); }
    if (e.key === ' ' && e.target === document.body) { e.preventDefault(); interrupt(); }
  }, true);

  /* ---------------- Noor speaking ---------------- */
  ERLY.on('noor:said', ({ text, speak }) => { if (st.on && speak !== false && text) enqueue(text); });
  ERLY.on('noor:chips', ({ list, pick: choose }) => { if (st.on) showChips(list, choose); });
  function enqueue(text) {
    st.queue.push(String(text).replace(/<[^>]+>/g, ' '));
    clearTimeout(st.idleT);
    if (!st.speaking) next();
  }
  function next() {
    const text = st.queue.shift();
    if (!text) { st.speaking = false; return afterSpeaking(); }
    st.speaking = true; setState('speaking');
    if (st.listening) { v.abortListening(); st.listening = false; }
    caption('#ncNoor', text);
    v.speak(text, { lang: U.lang(), onend: () => { if (st.on) next(); }, onerror: () => { if (st.on) next(); } });
  }
  function afterSpeaking() {
    clearTimeout(st.idleT);
    // give the chat a moment to add any follow-up line, then listen
    st.idleT = setTimeout(() => { if (st.on && !st.speaking && !st.queue.length && !U.isBusy()) listen(); }, 450);
  }
  function caption(sel, text) {
    const p = $(sel); if (!p) return;
    p.textContent = text; p.classList.remove('is-in'); void p.offsetWidth; p.classList.add('is-in');
  }
  function interrupt() {
    if (!st.on) return;
    if (st.speaking) { st.queue = []; v.stop(); st.speaking = false; }
    if (st.muted) toggleMute();
    listen();
  }

  /* ---------------- Noor listening ---------------- */
  function listen() {
    if (!st.on || st.muted || st.listening) return;
    if (!v.supported.stt || !U.store.consent('mic')) { setState('idle'); return; }
    st.listening = true; setState('listening'); caption('#ncYou', '');
    const ok = v.listen({
      lang: U.lang(),
      onresult: t => { const p = $('#ncYou'); if (p) p.textContent = t; },
      onerror: code => {
        st.listening = false;
        if (code === 'not-allowed' || code === 'service-not-allowed') { setState('idle'); caption('#ncNoor', T('I can’t use the microphone — it’s blocked in your browser settings. You can tap answers or type instead.', 'لا أستطيع استخدام الميكروفون — إنه محظور في إعدادات المتصفح. يمكنك النقر على الإجابات أو الكتابة بدلاً من ذلك.')); }
        if (code === 'network') caption('#ncNoor', T('Voice recognition needs an internet connection in this browser.', 'يحتاج التعرف على الصوت إلى اتصال بالإنترنت في هذا المتصفح.'));
      },
      onend: final => {
        st.listening = false;
        if (!st.on) return;
        if (final) { st.misses = 0; setState('thinking'); caption('#ncYou', final); C.submitText(final); return; }
        if (++st.misses <= 2 && !st.muted) setTimeout(listen, 300); else setState('idle');
      }
    });
    if (!ok) { st.listening = false; setState('idle'); }
  }
  function toggleMute() {
    st.muted = !st.muted;
    const b = $('#ncMute'); if (b) { b.setAttribute('aria-pressed', st.muted); b.classList.toggle('is-off', st.muted); }
    if (st.muted) { v.abortListening(); st.listening = false; setState('muted'); } else if (!st.speaking) { st.misses = 0; listen(); }
  }

  /* ---------------- quick answers on screen ---------------- */
  function showChips(list, choose) {
    const box = $('#ncChips'); if (!box) return;
    box.innerHTML = list.slice(0, 7).map(c => `<button type="button" data-id="${esc(c.id)}">${esc(pick(c.en, c.ar))}</button>`).join('');
    box.onclick = e => {
      const b = e.target.closest('[data-id]'); if (!b) return;
      const c = list.find(x => x.id === b.dataset.id);
      box.innerHTML = '';
      v.stop(); v.abortListening(); st.queue = []; st.speaking = false; st.listening = false;
      setState('thinking'); caption('#ncYou', pick(c.en, c.ar));
      choose(c);
    };
  }

  /* ---------------- the microphone level (animation + barge-in) ---------------- */
  async function meter() {
    try {
      st.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const AC = window.AudioContext || window.webkitAudioContext;
      st.ac = new AC();
      const src = st.ac.createMediaStreamSource(st.stream), an = st.ac.createAnalyser();
      an.fftSize = 512; src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const loop = () => {
        if (!st.on) return;
        an.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x; }
        const rms = Math.sqrt(sum / buf.length);
        st.level = st.level * 0.7 + rms * 0.3;
        el.style.setProperty('--lvl', Math.min(1, st.level * 6).toFixed(3));
        if (st.bargeIn && st.speaking) {
          if (st.level > 0.09) { if (!st.loudSince) st.loudSince = performance.now(); else if (performance.now() - st.loudSince > 380) { st.loudSince = 0; interrupt(); } }
          else st.loudSince = 0;
        }
        st.raf = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { /* the call still works without the level meter */ }
  }
  function stopMeter() {
    cancelAnimationFrame(st.raf);
    if (st.stream) st.stream.getTracks().forEach(t => t.stop());
    if (st.ac) try { st.ac.close(); } catch (e) { /* ignore */ }
    st.stream = null; st.ac = null; el.style.setProperty('--lvl', 0);
  }
  C.call = { start, end, active: () => st.on };
})();
