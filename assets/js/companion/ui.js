/* ERLY AI Reading Companion — the interface inside the Reading Studio.

   Floating launcher -> a panel with four tabs:
     Chat           text + optional voice conversation, support tools
     Reading signals what was measured, against which threshold and baseline,
                    what is never measured, privacy controls and deletion
     Reading Lab    try reading settings on a sample passage, rate them
     My summary     editable, student-owned summary (copy / download / keep)

   Wiring: reader events (ERLY.reader) -> Layer 1/2 (ERLY_SIGNALS) -> gentle
   invitation -> Layer 3 conversation (ERLY_DIALOGUE), optionally helped by
   Layer 4 (ERLY_LLM) -> support tools run in the reader -> Layer 6 summary
   (ERLY_SUMMARY). Consent and deletion live in ERLY_STORE. */
(function () {
  'use strict';
  if (!window.ERLY || !ERLY.reader || !window.ERLY_SIGNALS) return;
  const S = window.ERLY_SIGNALS, D = window.ERLY_DIALOGUE, SUM = window.ERLY_SUMMARY;
  const R = ERLY.reader;
  const store = window.ERLY_STORE.create();
  const T = (en, ar) => I18N.t(en, ar);
  const lang = () => (I18N.lang === 'ar' ? 'ar' : 'en');
  const pick = (en, ar) => (lang() === 'ar' ? ar : en);
  const $ = (s, r = panel) => r.querySelector(s);
  const $$ = (s, r = panel) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const REPEAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SKIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l8 6-8 6zM17 6v12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>';

  /* ---------------- state ---------------- */
  let cfg = S.config(store.thresholds());
  const llm = window.ERLY_LLM.create({ endpoint: (window.ERLY_AI_CONFIG || {}).endpoint || '', getConsent: () => store.consent('llm') });
  // Noor's brain: built-in by default; on-device or cloud AI only when the student turns it on (ai.js)
  const ai = window.ERLY_AI ? window.ERLY_AI.create({ online: () => (window.ERLY_AI_CONFIG || {}).online, cloud: {
    configured: () => llm.configured, consent: () => store.consent('llm'),
    chat: async (messages, o) => {
      const sys = messages[0].content, last = messages[messages.length - 1].content;
      const r = await llm.chat({ question: last, context: sys.split('\n\n').slice(1).join('\n\n').slice(0, 3000), history: messages.slice(1, -1).map(m => ({ role: m.role, text: m.content })), lang: lang(), voice: !!o.voice });
      return r.reply || '';
    } } }) : null;
  let generating = null; // { stop } while a reply is being written
  let status = 'idle';
  const voice = window.ERLY_VOICE.create({ getConsent: () => store.consent('mic'), getVoiceName: l => (store.prefs().voices || {})[l] || '', onState: v => setStatus(v.listening ? 'listening' : v.paused ? 'paused' : v.speaking ? 'speaking' : (status === 'thinking' ? 'thinking' : 'idle')) });
  let session = null, paused = false, snoozeUntil = 0, conv = null, inviteOpen = false, draft = null, helpCtx = null, busy = false;
  const lab = { lang: lang(), variant: 'default', ratings: {} };
  const brain = () => ERLY.companion && ERLY.companion.brain;
  const avail = () => Object.assign({}, R.availability);

  /* ---------------- DOM ---------------- */
  // Noor lives on the whole student site (fixed above the page, the Reading
  // Studio and the Check-ins); reader-specific features switch on when the
  // studio is open.
  const host = document.body;
  const launch = document.createElement('button');
  launch.className = 'cmp-launch';
  launch.type = 'button';
  launch.setAttribute('aria-controls', 'cmpPanel');
  launch.setAttribute('aria-expanded', 'false');
  host.appendChild(launch);

  const invite = document.createElement('div');
  invite.className = 'cmp-invite';
  invite.setAttribute('role', 'status');
  invite.hidden = true;
  host.appendChild(invite);

  const panel = document.createElement('section');
  panel.className = 'cmp';
  panel.id = 'cmpPanel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  host.appendChild(panel);

  const orb = (cls = '') => `<span class="cmp-orb ${cls}" aria-hidden="true"><i></i><i></i><i></i></span>`;
  function renderShell() {
    launch.innerHTML = `${orb()}<span class="cmp-launch__t"><b>Noor</b><small>${T('AI study companion', 'رفيقة الدراسة الذكية')}</small></span><span class="cmp-launch__dot" aria-hidden="true"></span>`;
    launch.setAttribute('aria-label', T('Open Noor, the AI reading companion', 'افتح نور، رفيقة القراءة الذكية'));
    panel.setAttribute('aria-label', T('Noor — ERLY AI reading companion', 'نور — رفيقة القراءة الذكية من إيرلي'));
    panel.innerHTML = `
      <header class="cmp__head">
        ${orb('cmp-orb--lg')}
        <div class="cmp__title"><b>Noor</b><small>${T('AI study companion · not a doctor', 'رفيقة دراسة ذكية · ليست طبيبة')}</small><button type="button" class="cmp__mode" id="cmpMode" aria-haspopup="dialog" title="${T('Choose Noor’s brain', 'اختر عقل نور')}">${modeHTML()}</button></div>
        <span class="cmp__status" id="cmpStatus" data-s="idle"><i></i><span></span></span>
        <button class="icon-btn cmp__x cmp__wide" id="cmpWide" type="button" aria-pressed="false" aria-label="${T('Expand chat', 'توسيع المحادثة')}" title="${T('Expand', 'توسيع')}">${ICON('expand')}</button>
        <button class="icon-btn cmp__x cmp__call" id="cmpCall" type="button" aria-label="${T('Talk to Noor by voice', 'تحدث مع نور بالصوت')}" title="${T('Talk to Noor by voice', 'تحدث مع نور بالصوت')}">${ICON('headphones')}</button>
        <button class="icon-btn cmp__x" id="cmpClose" type="button" aria-label="${T('Close companion', 'إغلاق الرفيقة')}">${ICON('x')}</button>
      </header>
      <div class="cmp__tabs" role="tablist" aria-label="${T('Companion sections', 'أقسام الرفيقة')}">
        ${[['chat', T('Chat', 'محادثة')], ['profile', T('Profile', 'ملفي')], ['signals', T('Signals', 'الإشارات')], ['lab', T('Lab', 'المختبر')], ['summary', T('Summary', 'ملخصي')]].map(([k, l], i) => `<button role="tab" type="button" id="cmpTab-${k}" aria-controls="cmpP-${k}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${k}">${l}</button>`).join('')}
        <span class="cmp__tabpill" aria-hidden="true"></span>
      </div>
      <div class="cmp__panes">
        <div class="cmp__pane cmp__pane--chat" role="tabpanel" id="cmpP-chat" aria-labelledby="cmpTab-chat">
          <div class="cmp__log" id="cmpLog" aria-live="polite" aria-relevant="additions"></div>
          <div class="cmp__dock">
            <div class="cmp__voicebar" id="cmpVoiceBar">
              <button type="button" class="cmp__mini" id="cmpPause" aria-label="${T('Pause speaking', 'إيقاف مؤقت')}" disabled>${PAUSE}</button>
              <button type="button" class="cmp__mini" id="cmpRepeat" aria-label="${T('Repeat the last reply', 'كرّر آخر رد')}">${REPEAT}</button>
              <button type="button" class="cmp__mini" id="cmpSkip" aria-label="${T('Skip this sentence', 'تخطَّ هذه الجملة')}" disabled>${SKIP}</button>
              <button type="button" class="cmp__mini" id="cmpMute" aria-pressed="${store.prefs().muted}" aria-label="${T('Speak replies aloud', 'قراءة الردود بصوت')}">${ICON(store.prefs().muted ? 'mute' : 'volume')}</button>
              <button type="button" class="cmp__mini" id="cmpVoiceSet" aria-expanded="false" aria-controls="cmpVSet" aria-label="${T('Choose Noor’s voice', 'اختر صوت نور')}">${ICON('headphones')}</button>
              <span class="cmp__vhint" id="cmpVHint"></span>
              <button type="button" class="btn btn--xs cmp__conv" id="cmpConv"></button>
            </div>
            <div class="cmp__vset" id="cmpVSet" hidden>
              <label><span>${T('Noor’s voice', 'صوت نور')}</span><select id="cmpVoiceSel"></select></label>
              <button type="button" class="btn btn--xs btn--ghost" id="cmpVoiceTry">${ICON('volume')} ${T('Hear it', 'استمع')}</button>
              <p class="muted cmp-small" id="cmpVoiceHint"></p>
            </div>
            <div class="cmp__attach" id="cmpAttach" hidden></div>
            <form class="cmp__input cmp__input--v2" id="cmpForm" autocomplete="off">
              <button type="button" class="cmp__plus" id="cmpPlus" aria-expanded="false" aria-controls="cmpPlusMenu" aria-label="${T('More options', 'خيارات أخرى')}">${ICON('plus')}</button>
              <label class="sr-only" for="cmpText">${T('Message Noor', 'راسل نور')}</label>
              <textarea id="cmpText" rows="1" maxlength="2000" enterkeyhint="send" placeholder="${T('Ask Noor anything…', 'اسأل نور أي شيء…')}"></textarea>
              <button type="button" class="cmp__mic" id="cmpMic" aria-pressed="false">${MIC}<span class="cmp__micring" aria-hidden="true"></span></button>
              <button type="button" class="cmp__voice" id="cmpVoice" aria-label="${T('Talk to Noor — voice mode', 'تحدث مع نور — الوضع الصوتي')}" title="${T('Voice mode', 'الوضع الصوتي')}"><span class="cmp__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>
              <button type="submit" class="cmp__send" id="cmpSend" aria-label="${T('Send', 'إرسال')}" hidden>${ICON('send')}</button>
            </form>
            <div class="cmp__plusmenu" id="cmpPlusMenu" hidden role="menu">
              <button type="button" role="menuitem" data-plus="read">${ICON('book')}<span><b>${T('Ask about what I’m reading', 'اسأل عما أقرؤه')}</b><small>${T('Attach the open page as context', 'أرفق الصفحة المفتوحة كسياق')}</small></span></button>
              <button type="button" role="menuitem" data-plus="pdf">${ICON('upload')}<span><b>${T('Open a PDF', 'افتح ملف PDF')}</b><small>${T('In the Reading Studio — stays on this device', 'في استوديو القراءة — يبقى على جهازك')}</small></span></button>
              <button type="button" role="menuitem" data-plus="voice">${ICON('wave')}<span><b>${T('Voice conversation', 'محادثة صوتية')}</b><small>${T('Talk it through, hands-free', 'تحدث دون استخدام يديك')}</small></span></button>
              <button type="button" role="menuitem" data-plus="brain">${ICON('chip')}<span><b>${T('Noor’s brain', 'عقل نور')}</b><small>${T('Built-in, on-device AI or cloud', 'مدمج، أو ذكاء على الجهاز، أو سحابي')}</small></span></button>
              <button type="button" role="menuitem" data-plus="new">${ICON('edit')}<span><b>${T('New chat', 'محادثة جديدة')}</b><small>${T('Clear this conversation', 'امسح هذه المحادثة')}</small></span></button>
            </div>
          </div>
        </div>
        <div class="cmp__pane" role="tabpanel" id="cmpP-profile" aria-labelledby="cmpTab-profile" hidden tabindex="0"></div>
        <div class="cmp__pane" role="tabpanel" id="cmpP-signals" aria-labelledby="cmpTab-signals" hidden tabindex="0"></div>
        <div class="cmp__pane" role="tabpanel" id="cmpP-lab" aria-labelledby="cmpTab-lab" hidden tabindex="0"></div>
        <div class="cmp__pane" role="tabpanel" id="cmpP-summary" aria-labelledby="cmpTab-summary" hidden tabindex="0"></div>
      </div>
      <div class="cbrain" id="cmpBrain" hidden role="dialog" aria-label="${T('Noor’s brain', 'عقل نور')}"></div>
      <p class="sr-only" id="cmpAnnounce" aria-live="assertive"></p>`;
    bindShell();
    setStatus(status);
    renderConvBar();
    renderMic();
  }

  /* ---------------- composer, brain, attachments ---------------- */
  function modeHTML() {
    const s = ai ? ai.state() : { tier: 'local', status: 'idle' };
    const l = ai ? ai.label() : { en: 'Built-in brain · offline', ar: 'العقل المدمج · دون اتصال' };
    const k = s.status === 'loading' ? 'loading' : ai && ai.ready() ? s.tier : 'local';
    return `<i class="cmp__dot cmp__dot--${k}"></i><span>${esc(pick(l.en, l.ar))}</span>${s.status === 'loading' ? `<b class="mono">${Math.round((s.progress || 0) * 100)}%</b>` : ''}`;
  }
  function refreshMode() { const m = $('#cmpMode'); if (m) m.innerHTML = modeHTML(); if (!$('#cmpBrain').hidden) renderBrain(); }
  if (ai) ai.on(() => refreshMode());
  // ChatGPT-style composer: the voice button turns into "send" while typing, and "stop" while Noor writes
  function composer() {
    const t = $('#cmpText'); if (!t) return;
    t.style.height = 'auto'; t.style.height = Math.min(160, t.scrollHeight) + 'px';
    const has = !!t.value.trim();
    $('#cmpSend').hidden = !has && !generating; $('#cmpVoice').hidden = has || !!generating;
    $('#cmpSend').innerHTML = ICON(generating ? 'stop' : 'send');
    $('#cmpSend').setAttribute('aria-label', generating ? T('Stop', 'إيقاف') : T('Send', 'إرسال'));
    $('#cmpSend').classList.toggle('is-stop', !!generating);
  }
  function setGenerating(g) { generating = g; panel.classList.toggle('is-gen', !!g); composer(); }
  function stopGenerating() { if (generating && generating.stop) generating.stop(); setGenerating(null); }
  function plusMenu(on) {
    const m = $('#cmpPlusMenu'); on = on === undefined ? m.hidden : on;
    m.hidden = !on; $('#cmpPlus').setAttribute('aria-expanded', on); $('#cmpPlus').classList.toggle('is-on', on);
    if (on) requestAnimationFrame(() => m.classList.add('is-in')); else m.classList.remove('is-in');
  }
  document.addEventListener('click', e => { if (!e.target.closest('#cmpPlusMenu, #cmpPlus')) { const m = $('#cmpPlusMenu'); if (m && !m.hidden) plusMenu(false); } });
  let attached = null;
  function attach(ctx) {
    attached = ctx || null;
    const box = $('#cmpAttach'); if (!box) return;
    box.hidden = !attached;
    if (attached) box.innerHTML = `<span class="cmp__chip">${ICON('file')}<span><b>${esc(attached.title)}</b><small>${T('page', 'صفحة')} ${attached.page}${attached.quote ? ' · ' + T('selected passage', 'مقطع محدد') : ''}</small></span><button type="button" data-unattach aria-label="${T('Remove', 'إزالة')}">${ICON('x')}</button></span>`;
  }
  function newChat() {
    stopGenerating();
    if (brain() && brain().reset) brain().reset();
    conv = null; helpCtx = null; attach(null);
    $('#cmpLog').innerHTML = '';
    renderConvBar();
    greeting = greet();
  }
  // the brain picker
  let caps = null;
  async function openBrain() {
    const b = $('#cmpBrain');
    b.hidden = false; requestAnimationFrame(() => b.classList.add('is-in'));
    renderBrain();
    if (!caps && ai) { caps = await ai.detect(); renderBrain(); }
  }
  function closeBrain() { const b = $('#cmpBrain'); b.classList.remove('is-in'); setTimeout(() => { if (!b.classList.contains('is-in')) b.hidden = true; }, reduce ? 0 : 260); }
  function renderBrain() {
    const b = $('#cmpBrain'); if (!b || !ai) return;
    const s = ai.state(), ready = ai.ready();
    const on = k => (k === 'local' ? !ready && s.status !== 'loading' : s.tier === k && (ready || s.status === 'loading'));
    const prog = k => (s.tier === k && s.status === 'loading' ? `<span class="cbrain__bar"><i style="--p:${(s.progress || 0).toFixed(3)}"></i></span><small class="cbrain__t">${esc((s.text || '').slice(0, 90))}</small>` : '');
    const gpu = caps ? caps.webgpu : null;
    const chrome = caps ? caps.chrome : 'unavailable';
    b.innerHTML = `
      <header class="cbrain__h"><span class="cbrain__ic">${ICON('chip')}</span><div><b>${T('Noor’s brain', 'عقل نور')}</b><small>${T('Choose how Noor thinks. Whatever you choose, she never diagnoses and never gives percentages.', 'اختر كيف تفكر نور. أياً كان اختيارك، لا تشخّص أبداً ولا تعطي نسباً مئوية.')}</small></div><button type="button" class="icon-btn icon-btn--sm" data-b="close" aria-label="${T('Close', 'إغلاق')}">${ICON('x')}</button></header>
      <div class="cbrain__list">
        <div class="cbopt cbopt--star cbopt--online ${on('online') ? 'is-on' : ''}">
          <div class="cbopt__h"><b>${T('Noor Online', 'نور أونلاين')}</b><span class="cbopt__tag cbopt__tag--hot">${T('ChatGPT-style · works on iPad', 'بأسلوب ChatGPT · يعمل على الآيباد')}</span>${gpu === false || ai.isIOS() ? `<span class="cbopt__tag">${T('Best for this device', 'الأنسب لهذا الجهاز')}</span>` : ''}</div>
          <p>${T('A free AI model on the internet that can answer almost anything — any subject, essays, maths, code, plans, Arabic. Nothing to download, so it works on iPads and phones.', 'نموذج ذكاء اصطناعي مجاني على الإنترنت يجيب عن كل شيء تقريباً — أي مادة، والمقالات، والرياضيات، والبرمجة، والخطط، والعربية. لا تنزيل، لذا يعمل على الآيباد والهواتف.')}</p>
          <ul class="cbopt__what">
            <li>${T(`Sent to ${esc(ai.online().name)} (${esc(ai.online().site || '')}): your message, the recent chat, and — only if you attach it — the page you are reading.`, `يُرسل إلى ${esc(ai.online().name)}: رسالتك، والمحادثة الأخيرة، والصفحة التي تقرؤها فقط إن أرفقتها.`)}</li>
            <li>${T('Emails and phone or ID numbers are removed first. Your name, profile, tracking and check-in results are never sent.', 'تُحذف عناوين البريد وأرقام الهاتف والهوية أولاً. لا يُرسل اسمك أو ملفك أو بيانات التتبع أو نتائج الفحوصات أبداً.')}</li>
            <li>${T('It is a free public service: please don’t type anything private. Free tier: about one message every 30 seconds.', 'إنها خدمة عامة مجانية: لا تكتب شيئاً خاصاً. الخطة المجانية: رسالة تقريباً كل ٣٠ ثانية.')}</li>
          </ul>
          ${on('online') ? `<span class="cbopt__on">${ICON('check')} ${T('In use', 'قيد الاستخدام')}</span> <button type="button" class="btn btn--xs btn--quiet" data-b="local">${T('Stop using it', 'أوقف استخدامه')}</button>` : `<button type="button" class="btn btn--sm btn--accent" data-b="online">${ICON('globe')} ${T('I agree — turn on Noor Online', 'أوافق — شغّل نور أونلاين')}</button>`}
        </div>
        <div class="cbopt ${on('local') ? 'is-on' : ''}">
          <div class="cbopt__h"><b>${T('Built-in', 'مدمج')}</b><span class="cbopt__tag">${T('Always on', 'متاح دائماً')}</span></div>
          <p>${T('ERLY’s guide to learning differences, studying and exams, plus built-in study tools (summaries, quizzes, plans, maths). Instant and offline — nothing leaves your device.', 'دليل إيرلي لاختلافات التعلّم والمذاكرة والاختبارات، مع أدوات مذاكرة مدمجة (ملخصات واختبارات وخطط وحساب). فوري ودون اتصال — لا يغادر شيء جهازك.')}</p>
          ${on('local') ? `<span class="cbopt__on">${ICON('check')} ${T('In use', 'قيد الاستخدام')}</span>` : `<button type="button" class="btn btn--xs btn--ghost" data-b="local">${T('Use built-in', 'استخدم المدمج')}</button>`}
        </div>
        <div class="cbopt cbopt--star ${s.tier === 'webllm' && (ready || s.status === 'loading') ? 'is-on' : ''}">
          <div class="cbopt__h"><b>${T('On-device AI', 'ذكاء اصطناعي على الجهاز')}</b><span class="cbopt__tag cbopt__tag--hot">${T('ChatGPT-style · private', 'بأسلوب ChatGPT · خاص')}</span></div>
          <p>${T('A real language model that answers anything — explanations, essays feedback, code, plans, Arabic. It downloads once into your browser and runs on this device’s graphics chip. Your messages never leave the device.', 'نموذج لغوي حقيقي يجيب عن أي شيء — شروح وملاحظات على المقالات وبرمجة وخطط وعربية. يُنزَّل مرة واحدة في متصفحك ويعمل على معالج الرسوميات في جهازك. لا تغادر رسائلك الجهاز.')}</p>
          ${gpu === false ? `<p class="cbopt__warn">${ICON('info')} ${T('This browser has no WebGPU, so on-device AI can’t run here. Try the latest Chrome or Edge on a laptop, or Safari on iPadOS / macOS 26.', 'لا يدعم هذا المتصفح WebGPU، لذا لا يعمل الذكاء على الجهاز هنا. جرّب أحدث كروم أو إيدج على حاسوب، أو سفاري على iPadOS / macOS 26.')}</p>` : ''}
          <div class="cbopt__models">${ai.MODELS.map(m => `<button type="button" class="cbmodel ${s.tier === 'webllm' && s.model === m.key ? 'is-on' : ''}${m.rec ? ' is-rec' : ''}" data-b="web:${m.key}" ${gpu === false || s.status === 'loading' || (ai.isIOS() && m.key !== 'lite') ? 'disabled' : ''}><b>${m.name}${m.rec ? ` <i>${T('Recommended', 'موصى به')}</i>` : ''}</b><small>${pick(m.en, m.ar)}</small><span class="mono">${m.size}${caps && caps.cached && caps.cached[m.key] ? ' · ' + T('downloaded', 'منزّل') : ''}</span></button>`).join('')}</div>
          ${prog('webllm')}
          ${s.tier === 'webllm' && ready ? `<span class="cbopt__on">${ICON('check')} ${T('In use — running on this device', 'قيد الاستخدام — يعمل على هذا الجهاز')}</span>` : ''}
          <small class="muted">${T('Open-source Qwen 3.5 models via WebLLM. First download needs Wi-Fi; later visits load from your browser’s cache.', 'نماذج Qwen 3.5 مفتوحة المصدر عبر WebLLM. يحتاج التنزيل الأول إلى Wi-Fi؛ وتُحمَّل الزيارات اللاحقة من ذاكرة المتصفح.')}</small>
        </div>
        ${chrome !== 'unavailable' ? `<div class="cbopt ${s.tier === 'chrome' && (ready || s.status === 'loading') ? 'is-on' : ''}">
          <div class="cbopt__h"><b>${T('Chrome built-in AI', 'الذكاء المدمج في كروم')}</b><span class="cbopt__tag">Gemini Nano</span></div>
          <p>${T('Your browser includes its own small AI model that runs on this device. No download from ERLY.', 'يتضمن متصفحك نموذج ذكاء اصطناعي صغيراً يعمل على هذا الجهاز. لا تنزيل من إيرلي.')}</p>
          ${prog('chrome')}${s.tier === 'chrome' && ready ? `<span class="cbopt__on">${ICON('check')} ${T('In use', 'قيد الاستخدام')}</span>` : `<button type="button" class="btn btn--xs btn--accent" data-b="chrome" ${s.status === 'loading' ? 'disabled' : ''}>${chrome === 'available' ? T('Use it', 'استخدمه') : T('Download & use', 'نزّل واستخدم')}</button>`}
        </div>` : ''}
        <div class="cbopt ${s.tier === 'cloud' && ready ? 'is-on' : ''}">
          <div class="cbopt__h"><b>${T('Cloud AI', 'ذكاء اصطناعي سحابي')}</b><span class="cbopt__tag">${T('University server', 'خادم الجامعة')}</span></div>
          ${llm.configured ? `<p>${T('Sends your message (emails and phone numbers removed), the recent chat and — if attached — the page you are reading to the university’s AI server. Nothing is stored there. Only turn this on if you agree.', 'يرسل رسالتك (بعد إزالة البريد وأرقام الهاتف) والمحادثة الأخيرة — والصفحة التي تقرؤها إن أرفقتها — إلى خادم الذكاء الاصطناعي في الجامعة. لا يُخزَّن شيء هناك. فعّله فقط إن كنت موافقاً.')}</p>
            ${s.tier === 'cloud' && ready ? `<button type="button" class="btn btn--xs btn--ghost" data-b="cloud-off">${T('Stop using cloud AI', 'أوقف الذكاء السحابي')}</button>` : `<button type="button" class="btn btn--xs btn--accent" data-b="cloud">${T('I agree — use cloud AI', 'أوافق — استخدم الذكاء السحابي')}</button>`}`
          : `<p>${T('Not set up here. A university can connect a model through ERLY’s small server (server/llm-proxy.mjs), which keeps the API key secret — keys are never put in a website.', 'غير مُعدّ هنا. يمكن للجامعة ربط نموذج عبر خادم إيرلي الصغير (server/llm-proxy.mjs) الذي يحفظ مفتاح الواجهة سراً — لا توضع المفاتيح في موقع ويب أبداً.')}</p>`}
        </div>
      </div>
      ${s.status === 'error' && s.error ? `<p class="cbrain__err">${ICON('info')} ${T('The on-device model couldn’t start here (often not enough memory on a tablet), so Noor is using her built-in brain. Noor Online works on every device.', 'لم يعمل النموذج على هذا الجهاز (غالباً لقلة الذاكرة في الأجهزة اللوحية)، لذا تستخدم نور عقلها المدمج. نور أونلاين يعمل على كل الأجهزة.')} <button type="button" class="btn btn--xs btn--accent" data-b="online">${T('Use Noor Online', 'استخدم نور أونلاين')}</button><small>${esc(s.error)}</small></p>` : ''}`;
  }
  panel.addEventListener('click', async e => {
    const x = e.target.closest('#cmpBrain [data-b]'); if (!x || !ai) return;
    const k = x.dataset.b;
    if (k === 'close') return closeBrain();
    if (k === 'local') { ai.useLocal(); announce(T('Using the built-in brain', 'استخدام العقل المدمج')); }
    if (k.startsWith('web:')) { const ok = await ai.useWebLLM(k.slice(4)); if (ok) { caps = null; brainReady(); } }
    if (k === 'chrome') { const ok = await ai.useChrome(); if (ok) brainReady(); }
    if (k === 'cloud') { store.setConsent('llm', true); ai.useCloud(); brainReady(); }
    if (k === 'online') { ai.useOnline(); brainReady(); }
    if (k === 'cloud-off') { store.setConsent('llm', false); ai.useLocal(); }
    refreshMode();
  });
  function brainReady() {
    refreshMode();
    ERLY.toast && ERLY.toast(T('Noor’s AI brain is on — ask her anything.', 'عقل نور الذكي مفعّل — اسألها أي شيء.'));
    setTimeout(closeBrain, 900);
  }

  /* ---------------- open / close / tabs ---------------- */
  let tab = 'chat', greeting = Promise.resolve();
  function openPanel(t) {
    hideInvite();
    launch.classList.remove('is-hint');
    if (panel.hidden) {
      panel.hidden = false;
      launch.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('cmp-on');
      requestAnimationFrame(() => panel.classList.add('is-in'));
      if (!$('#cmpLog').children.length) greeting = greet();
      if (ai && !ai.ready() && ai.state().status === 'idle' && !openPanel.resumed) { openPanel.resumed = true; ai.resume(); }
    }
    if (t) setTab(t);
    setTimeout(() => { const f = tab === 'chat' ? $('#cmpText') : $(`#cmpTab-${tab}`); f && f.focus({ preventScroll: true }); }, reduce ? 0 : 260);
  }
  function closePanel() {
    if (panel.hidden) return;
    voice.abortListening();
    panel.classList.remove('is-in');
    launch.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('cmp-on');
    setTimeout(() => { if (!panel.classList.contains('is-in')) panel.hidden = true; }, reduce ? 0 : 260);
    launch.focus({ preventScroll: true });
  }
  function setTab(t) {
    tab = t;
    $$('[role="tab"]').forEach(b => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    $$('.cmp__pane').forEach(p => { p.hidden = p.id !== 'cmpP-' + t; });
    const b = $(`#cmpTab-${t}`), pill = $('.cmp__tabpill');
    if (b && pill) { pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft}px)`; }
    if (t === 'signals') renderSignals();
    if (t === 'lab') renderLab();
    if (t === 'summary') renderSummary();
    if (t === 'profile' && brain()) brain().renderProfile($('#cmpP-profile'));
  }

  function bindShell() {
    $('#cmpClose').addEventListener('click', closePanel);
    $('#cmpCall').addEventListener('click', () => ERLY.emit && ERLY.emit('noor:call'));
    $('.cmp__tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    $('.cmp__tabs').addEventListener('keydown', e => {
      const tabs = $$('[role="tab"]'), i = tabs.findIndex(b => b.dataset.tab === tab);
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key] * (document.dir === 'rtl' || document.documentElement.dir === 'rtl' ? -1 : 1);
      if (e.key === 'Home' || e.key === 'End' || d) {
        e.preventDefault();
        const n = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + d + tabs.length) % tabs.length;
        setTab(tabs[n].dataset.tab); tabs[n].focus();
      }
    });
    $('#cmpForm').addEventListener('submit', e => {
      e.preventDefault();
      if (generating) return stopGenerating();
      const v = $('#cmpText').value.trim();
      if (!v || busy) return;
      $('#cmpText').value = ''; composer();
      submit(v);
    });
    $('#cmpText').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#cmpForm').requestSubmit ? $('#cmpForm').requestSubmit() : $('#cmpForm').dispatchEvent(new Event('submit', { cancelable: true })); }
    });
    $('#cmpText').addEventListener('input', composer);
    $('#cmpVoice').addEventListener('click', () => ERLY.emit && ERLY.emit('noor:call'));
    $('#cmpPlus').addEventListener('click', e => { e.stopPropagation(); plusMenu(); });
    $('#cmpPlusMenu').addEventListener('click', e => {
      const b = e.target.closest('[data-plus]'); if (!b) return;
      plusMenu(false);
      const k = b.dataset.plus;
      if (k === 'read') { if (R.isOpen()) attach(R.contextFor()); else { R.openLibrary(); ERLY.toast && ERLY.toast(T('Pick a reading — then ask me about it.', 'اختر قراءة — ثم اسألني عنها.')); } }
      if (k === 'pdf') { closePanel(); R.openLibrary(); }
      if (k === 'voice') ERLY.emit && ERLY.emit('noor:call');
      if (k === 'brain') openBrain();
      if (k === 'new') newChat();
    });
    $('#cmpMode').addEventListener('click', openBrain);
    $('#cmpWide').addEventListener('click', () => {
      const on = !panel.classList.contains('is-wide');
      panel.classList.toggle('is-wide', on); $('#cmpWide').setAttribute('aria-pressed', on); $('#cmpWide').innerHTML = ICON(on ? 'shrink' : 'expand');
      setTimeout(() => setTab(tab), 320);
    });
    $('#cmpAttach').addEventListener('click', e => { if (e.target.closest('[data-unattach]')) attach(null); });
    $('#cmpMic').addEventListener('click', micClick);
    $('#cmpMute').addEventListener('click', () => {
      const m = !store.prefs().muted; store.setPref('muted', m);
      if (m) voice.stop();
      const b = $('#cmpMute'); b.setAttribute('aria-pressed', m); b.innerHTML = ICON(m ? 'mute' : 'volume');
      announce(m ? T('Spoken replies off', 'الردود الصوتية متوقفة') : T('Spoken replies on', 'الردود الصوتية مفعّلة'));
    });
    $('#cmpVoiceSet').addEventListener('click', () => {
      const box = $('#cmpVSet'), open = box.hidden;
      box.hidden = !open; $('#cmpVoiceSet').setAttribute('aria-expanded', open);
      if (open) fillVoices();
    });
    $('#cmpVoiceSel').addEventListener('change', e => {
      const v = Object.assign({}, store.prefs().voices || {}); v[lang()] = e.target.value; store.setPref('voices', v);
      sayHello();
    });
    $('#cmpVoiceTry').addEventListener('click', sayHello);
    $('#cmpPause').addEventListener('click', () => { const s = voice.state(); if (s.paused) voice.resume(); else voice.pause(); });
    $('#cmpRepeat').addEventListener('click', () => { if (lastSpoken) speak(lastSpoken, true); });
    $('#cmpSkip').addEventListener('click', () => voice.skip());
    $('#cmpConv').addEventListener('click', () => { if (conv && !conv.done) endConversation(); else startConversation({ type: 'student' }); });
  }
  launch.addEventListener('click', () => (panel.hidden ? openPanel() : closePanel()));
  // Escape: stop listening, then stop speaking, then close — one step at a time
  panel.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    if (!$('#cmpBrain').hidden) return closeBrain();
    if (!$('#cmpPlusMenu').hidden) return plusMenu(false);
    if (generating) return stopGenerating();
    const v = voice.state();
    if (v.listening) return voice.abortListening();
    if (v.speaking) return voice.stop();
    closePanel();
  });
  addEventListener('keydown', e => { if (e.altKey && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); panel.hidden ? openPanel() : closePanel(); } });

  /* ---------------- status, speech ---------------- */
  const STATUS = { idle: ['Ready', 'جاهزة'], listening: ['Listening…', 'أستمع…'], thinking: ['Thinking…', 'أفكر…'], speaking: ['Speaking', 'أتحدث'], paused: ['Paused', 'متوقفة مؤقتاً'] };
  function setStatus(s) {
    status = s;
    const el = $('#cmpStatus'); if (!el) return;
    el.dataset.s = s; el.querySelector('span').textContent = pick(...STATUS[s]);
    launch.dataset.s = s; panel.dataset.s = s;
    const v = voice.state();
    $('#cmpPause').disabled = !(v.speaking || v.paused);
    $('#cmpPause').innerHTML = v.paused ? PLAY : PAUSE;
    $('#cmpPause').setAttribute('aria-label', v.paused ? T('Resume speaking', 'استئناف الكلام') : T('Pause speaking', 'إيقاف مؤقت'));
    $('#cmpSkip').disabled = !v.speaking;
    $('#cmpMic').setAttribute('aria-pressed', v.listening);
  }
  function fillVoices() {
    const sel = $('#cmpVoiceSel'); if (!sel) return;
    const vs = voice.voices(lang()), cur = voice.voiceFor(lang());
    sel.innerHTML = vs.length ? vs.map(v => `<option value="${esc(v.name)}" ${cur && cur.name === v.name ? 'selected' : ''}>${window.ERLY_VOICE.isNatural(v) ? '★ ' : ''}${esc(v.name.replace(/Microsoft |Google |\(Natural\)| Online/g, '').trim())} · ${esc(v.lang)}</option>`).join('') : `<option>${T('Default voice', 'الصوت الافتراضي')}</option>`;
    const anyNatural = vs.some(window.ERLY_VOICE.isNatural);
    $('#cmpVoiceHint').textContent = anyNatural
      ? T('★ = a natural, human-sounding voice. I picked the best one on this device.', '★ = صوت طبيعي يشبه صوت الإنسان. اخترت أفضلها على هذا الجهاز.')
      : T('This device only has basic voices. For a much more human voice, open ERLY in Microsoft Edge (its “Natural” voices) or Chrome, or add an “Enhanced/Premium” voice in your device’s speech settings.', 'هذا الجهاز يحتوي على أصوات أساسية فقط. للحصول على صوت أقرب للإنسان، افتح إيرلي في متصفح إيدج (أصوات Natural) أو كروم، أو أضف صوتاً «محسّناً» من إعدادات الكلام في جهازك.');
  }
  function sayHello() {
    voice.speak(pick('Hey! This is how I sound. If you like it, I’ll keep using this voice whenever we chat.', 'أهلاً! هكذا يبدو صوتي. إن أعجبك، سأستخدم هذا الصوت كلما تحدثنا.'), { lang: lang() });
  }
  if (window.speechSynthesis && typeof speechSynthesis.addEventListener === 'function') speechSynthesis.addEventListener('voiceschanged', () => { if ($('#cmpVSet') && !$('#cmpVSet').hidden) fillVoices(); });
  function announce(t) { const a = $('#cmpAnnounce'); if (a) { a.textContent = ''; setTimeout(() => { a.textContent = t; }, 30); } }
  let lastSpoken = '';
  function speak(text, force) {
    if (ERLY.companion && ERLY.companion.inCall) return; // the voice call speaks for itself
    lastSpoken = text;
    if (!voice.supported.tts || (store.prefs().muted && !force) || R.isReading()) return;
    voice.speak(text, { lang: lang() });
  }

  /* ---------------- chat log ---------------- */
  function bubble(who, html, o = {}) {
    const m = document.createElement('div');
    m.className = `cmsg cmsg--${who}` + (o.cls ? ' ' + o.cls : '');
    if (who === 'ai' && o.tag) m.innerHTML = `<span class="cmsg__tag">${o.tag}</span>`;
    const body = document.createElement('div');
    body.className = 'cmsg__b';
    if (o.text) body.textContent = html; else body.innerHTML = html;
    m.appendChild(body);
    $('#cmpLog').appendChild(m);
    scrollLog();
    return m;
  }
  function scrollLog() { const l = $('#cmpLog'); l.scrollTo({ top: l.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }); }
  async function aiSays(en, ar, o = {}) {
    const typing = document.createElement('div');
    typing.className = 'cmsg cmsg--ai cmsg--typing';
    typing.innerHTML = '<div class="cmsg__b"><span></span><span></span><span></span></div>';
    $('#cmpLog').appendChild(typing); scrollLog();
    setStatus('thinking');
    await wait(reduce ? 0 : Math.min(650, 220 + (en || '').length * 2));
    typing.remove();
    setStatus(voice.state().speaking ? 'speaking' : 'idle');
    const text = pick(en, ar);
    const m = bubble('ai', o.html ? o.html : esc(text).replace(/\n/g, '<br>'), { tag: o.tag });
    if (o.stream && !reduce) streamIn(m.querySelector('.cmsg__b'));
    ERLY.emit && ERLY.emit('noor:said', { text: o.sayText || text, speak: o.speak !== false });
    if (o.speak !== false) speak(o.sayText || text);
    return m;
  }
  // reveal a reply word by word, like it is being written (visual only — the text is already there for screen readers)
  function streamIn(el) {
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('button, .kb-foot, .kb-tag') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    let k = 0;
    nodes.forEach(n => {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(w => {
        if (!w) return;
        if (/^\s+$/.test(w)) return frag.appendChild(document.createTextNode(w));
        const sp = document.createElement('span'); sp.className = 'sw'; sp.style.setProperty('--w', Math.min(k++, 160)); sp.textContent = w; frag.appendChild(sp);
      });
      n.replaceWith(frag);
    });
    el.classList.add('is-streaming');
    setTimeout(() => el.classList.remove('is-streaming'), Math.min(k, 160) * 14 + 400);
  }
  function chipRow(list, onPick, cls = '') {
    clearChips();
    const row = document.createElement('div');
    row.className = 'cchips ' + cls;
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', T('Quick replies', 'ردود سريعة'));
    row.innerHTML = list.map(c => `<button type="button" data-id="${esc(c.id)}">${c.icon ? ICON(c.icon) : ''}<span>${esc(pick(c.en, c.ar))}</span></button>`).join('');
    row.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || busy) return;
      const c = list.find(x => x.id === b.dataset.id);
      row.remove();
      onPick(c);
    });
    $('#cmpLog').appendChild(row); scrollLog();
    ERLY.emit && ERLY.emit('noor:chips', { list, pick: c => { if (!row.isConnected || busy) return; row.remove(); onPick(c); } });
    return row;
  }
  function clearChips() { $$('#cmpLog .cchips').forEach(x => x.remove()); }

  function greet() {
    const first = !store.asked('monitoring');
    const smart = ai && ai.ready();
    return aiSays(
      'Hi, I’m Noor — your AI study companion. Ask me anything: explain a topic, plan your revision, quiz you on a reading, help with an email, or just talk about what feels hard. Tap the wave button to talk to me by voice. I’m not a doctor, so I never diagnose — but I can help you work out what support might help.',
      'أهلاً، أنا نور — رفيقتك الذكية في الدراسة. اسألني أي شيء: شرح موضوع، أو خطة مراجعة، أو اختبار على قراءة، أو مساعدة في بريد، أو تحدث فقط عما يبدو صعباً. اضغط زر الموجة للتحدث معي بالصوت. لست طبيبة فلا أشخّص أبداً — لكن يمكنني مساعدتك في معرفة الدعم المناسب.',
      { speak: false, tag: ai ? pick(ai.label().en, ai.label().ar) : null }
    ).then(() => { if (!smart && ai) brainCard(); if (first) consentCard(); else if (!helpCtx) idleChips(); });
  }
  // a gentle prompt to switch on a real AI model (only shown while Noor uses her built-in brain)
  function brainCard() {
    const card = document.createElement('div');
    card.className = 'cbcard';
    card.innerHTML = `<span class="cbcard__orb" aria-hidden="true"><i></i><i></i><i></i></span><div><b>${T('Want ChatGPT-style answers to anything?', 'تريد إجابات بأسلوب ChatGPT عن أي شيء؟')}</b><small>${T('Turn on Noor Online — works on iPad, phone and laptop.', 'شغّل نور أونلاين — يعمل على الآيباد والهاتف والحاسوب.')}</small></div><button type="button" class="btn btn--xs btn--accent" data-brain-open>${T('Turn on', 'فعّل')}</button>`;
    card.querySelector('[data-brain-open]').onclick = openBrain;
    $('#cmpLog').appendChild(card); scrollLog();
  }
  function idleChips() {
    const reading = R.isOpen();
    chipRow([
      ...(reading ? [{ id: 'page', en: 'Explain this page', ar: 'اشرحي هذه الصفحة', icon: 'sparkle' }, { id: 'help', en: 'Help with this paragraph', ar: 'ساعديني في هذه الفقرة', icon: 'book' }] : [{ id: 'plan', en: 'Make me an exam study plan', ar: 'اصنعي لي خطة مذاكرة للامتحانات', icon: 'calendar' }]),
      { id: 'call', en: 'Talk to me by voice', ar: 'تحدثي معي بالصوت', icon: 'headphones' },
      { id: 'hard', en: 'Something feels hard', ar: 'شيء ما يبدو صعباً', icon: 'chat' },
      ...(reading ? [] : [{ id: 'talk', en: 'Talk about my reading', ar: 'لنتحدث عن قراءتي', icon: 'book' }]),
      { id: 'ask', en: 'What is dyslexia?', ar: 'ما هو عسر القراءة؟', icon: 'search' },
      { id: 'profile', en: 'How am I doing?', ar: 'كيف حالي؟', icon: 'chart' }
    ], c => {
      if (c.id === 'talk') startConversation({ type: 'student' });
      if (c.id === 'help') helpMenu({ para: R.currentPara() });
      if (c.id === 'lab') setTab('lab');
      if (c.id === 'profile') setTab('profile');
      if (c.id === 'call') ERLY.emit && ERLY.emit('noor:call');
      if (c.id === 'hard' && brain()) { bubble('you', pick(c.en, c.ar), { text: true }); brain().freeText('I feel like something is hard for me', { silentUser: true }); }
      if (c.id === 'ask' && brain()) brain().freeText(pick(c.en, c.ar));
      if (c.id === 'plan' && brain()) brain().freeText(pick(c.en, c.ar));
      if (c.id === 'page' && brain()) { attach(R.contextFor()); brain().freeText(pick('Explain this page simply, then give me the 3 key ideas.', 'اشرحي هذه الصفحة ببساطة، ثم أعطيني أهم ٣ أفكار.')); }
    });
  }

  /* ---------------- consent ---------------- */
  function consentCard() {
    clearChips();
    const card = document.createElement('div');
    card.className = 'ccard';
    card.innerHTML = `
      <b>${T('Can I notice reading friction while you read?', 'هل يمكنني ملاحظة احتكاك القراءة أثناء قراءتك؟')}</b>
      <p>${T('If you say yes, I count a few things in this reader only: going back to the same section, zoom and sideways panning, text-setting changes, and read-aloud use. I compare them with your own usual pattern — never with other students.', 'إن وافقت، أحسب بضعة أشياء في هذا القارئ فقط: العودة إلى القسم نفسه، والتكبير والتحريك الجانبي، وتغييرات إعدادات النص، واستخدام القراءة الصوتية. وأقارنها بنمطك المعتاد — لا بالطلبة الآخرين.')}</p>
      <ul>
        <li>${T('I never record keystrokes, the camera, audio, or the text you read.', 'لا أسجل ضغطات المفاتيح أو الكاميرا أو الصوت أو النص الذي تقرؤه.')}</li>
        <li>${T('I can’t measure eye movement, attention, comprehension or reading accuracy.', 'لا أستطيع قياس حركة العين أو الانتباه أو الفهم أو دقة القراءة.')}</li>
        <li>${T('Everything stays on this device. Nobody is alerted. You can pause or delete it any time.', 'كل شيء يبقى على هذا الجهاز. لا يُنبَّه أحد. يمكنك الإيقاف أو الحذف في أي وقت.')}</li>
        <li>${T('If something repeats, I’ll gently ask — you can say no, later, or turn that off.', 'إذا تكرر شيء ما، سأسألك بلطف — ويمكنك الرفض أو التأجيل أو إيقاف ذلك.')}</li>
      </ul>
      <div class="ccard__btns"><button type="button" class="btn btn--sm btn--accent" data-c="yes">${T('Yes, notice friction', 'نعم، لاحظي الاحتكاك')}</button><button type="button" class="btn btn--sm btn--ghost" data-c="no">${T('Not now', 'ليس الآن')}</button></div>`;
    card.addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      const yes = b.dataset.c === 'yes';
      store.setConsent('monitoring', yes);
      card.remove();
      $('#cmpText').focus({ preventScroll: true });
      bubble('you', yes ? T('Yes, notice friction', 'نعم، لاحظي الاحتكاك') : T('Not now', 'ليس الآن'), { text: true });
      if (yes) { startSession(); aiSays('Thanks. I’ll stay quiet unless something keeps repeating. You can see exactly what I count in “Reading signals”.', 'شكراً. سأبقى هادئة ما لم يتكرر شيء. يمكنك رؤية ما أحسبه بالضبط في «إشارات القراءة».'); }
      else aiSays('No problem — I won’t notice anything. You can still chat with me or use any tool whenever you like.', 'لا مشكلة — لن ألاحظ شيئاً. ما زال بإمكانك التحدث معي أو استخدام أي أداة متى شئت.');
      setTimeout(() => { if (!helpCtx && !(conv && !conv.done) && !$('#cmpLog .cchips')) idleChips(); }, 700);
    });
    $('#cmpLog').appendChild(card); scrollLog();
  }

  /* ---------------- Layer 1/2: monitoring ---------------- */
  function startSession() {
    if (!store.consent('monitoring') || !R.isOpen()) return;
    if (!session) session = S.createSession(Date.now());
  }
  function endSession() {
    if (!session) return;
    S.record(session, { type: 'end', t: Date.now() }, cfg);
    if (store.consent('monitoring')) store.setBaseline(S.addToBaseline(store.baseline(), S.sessionSummary(session, Date.now()), cfg));
    session = null; paused = false; // raw events are dropped here
  }
  R.on(ev => {
    if (ev.type === 'open') { startSession(); launch.classList.add('is-ready'); if (!store.asked('monitoring')) setTimeout(() => launch.classList.add('is-hint'), 1400); return; }
    if (ev.type === 'close') { endSession(); voice.stop(); voice.abortListening(); hideInvite(); return; }
    if (ev.type === 'tts' && ev.action === 'start') voice.stop(); // the reader's voice wins
    nudgeRecord(ev); // in-the-moment only: counted in memory for a minute, never stored
    if (!session || paused || !store.consent('monitoring')) return;  // nothing is collected without consent
    S.record(session, ev, cfg);
    if (ev.type === 'section' || ev.type === 'zoom' || ev.type === 'pan' || ev.type === 'format') { clearTimeout(checkT); checkT = setTimeout(check, 1700); }
  });
  let checkT = null;
  setInterval(() => {
    if (!session || paused || document.hidden || !R.isOpen()) return;
    S.record(session, { type: 'tick', t: Date.now() }, cfg);
    check();
    if (tab === 'signals' && !panel.hidden && !$('#cmpP-signals').contains(document.activeElement)) renderSignals();
  }, 5000);
  const signals = () => (session ? S.evaluate(session, store.baseline(), cfg, Date.now(), avail()) : null);
  function check() {
    if (!session) return;
    const sig = signals();
    const r = S.shouldInvite(session, sig, { now: Date.now(), consent: store.consent('monitoring'), paused, invitations: store.prefs().invitations, conversationActive: !!(conv && !conv.done) || inviteOpen || busy, snoozeUntil }, cfg);
    if (!r.invite) return;
    S.noteInvite(session, Date.now());
    if (r.signal === 'regression' && ERLY.analyser) ERLY.analyser.noteReadingFriction();
    showInvite(r, sig);
  }

  /* ---------------- the gentle invitation ---------------- */
  function observationsFrom(sig) {
    return sig.filter(x => S.FRICTION_IDS.includes(x.id) && x.friction).map(x => {
      if (x.id === 'regression') { const k = x.repeatedSections[0], lbl = R.paraLabel(k); return { id: 'regression', count: x.bySection[k], section: k, label: lbl[0], labelAr: lbl[1] }; }
      return { id: x.id, count: x.recent };
    });
  }
  function showInvite(r, sig) {
    inviteOpen = true;
    const obs = observationsFrom(sig);
    const line = r.signal === 'regression' ? ['I noticed you returned to this section a few times.', 'لاحظت أنك عدت إلى هذا القسم عدة مرات.']
      : r.signal === 'zoom' ? ['I noticed the zoom changing a few times.', 'لاحظت أن التكبير تغيّر عدة مرات.']
        : r.signal === 'pan' ? ['I noticed quite a bit of sideways scrolling.', 'لاحظت تمريراً جانبياً متكرراً.']
          : ['I noticed the text settings changing a few times.', 'لاحظت أن إعدادات النص تغيّرت عدة مرات.'];
    if (r.section) R.spotlight(r.section);
    invite.innerHTML = `${orb()}<div class="cmp-invite__b"><p>${esc(pick(line[0], line[1]))} ${esc(T('Would you like to talk about how the reading is going?', 'هل تود الحديث عن سير القراءة؟'))}</p>
      <small>${T('Just a check-in, not a test. Nothing is shared.', 'مجرد اطمئنان، وليس اختباراً. لا يُشارك شيء.')}</small>
      <div class="cmp-invite__btns">
        <button type="button" class="btn btn--xs btn--accent" data-i="talk">${T('Talk about it', 'لنتحدث')}</button>
        <button type="button" class="btn btn--xs btn--ghost" data-i="later">${T('Later', 'لاحقاً')}</button>
        <button type="button" class="btn btn--xs btn--quiet" data-i="dismiss">${T('Dismiss', 'تجاهل')}</button>
        <button type="button" class="btn btn--xs btn--quiet" data-i="off">${T('Turn off invitations', 'إيقاف الدعوات')}</button>
      </div></div>`;
    invite.hidden = false;
    requestAnimationFrame(() => invite.classList.add('is-in'));
    launch.classList.add('has-invite');
    invite.onclick = e => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      const k = b.dataset.i;
      hideInvite();
      R.clearSpot();
      if (k === 'talk') { openPanel('chat'); startConversation({ type: 'invite', signal: r.signal, section: r.section }, obs, r.multiple); }
      if (k === 'later') { snoozeUntil = Date.now() + 10 * 60e3; ERLY.toast && ERLY.toast(T('Okay — I won’t ask again for at least 10 minutes.', 'حسناً — لن أسأل مجدداً لمدة ١٠ دقائق على الأقل.')); }
      if (k === 'off') { store.setPref('invitations', 'off'); ERLY.toast && ERLY.toast(T('Invitations are off. You can turn them back on in Reading signals.', 'الدعوات متوقفة. يمكنك إعادة تشغيلها من إشارات القراءة.')); }
    };
    setTimeout(() => { const f = invite.querySelector('[data-i="talk"]'); f && panel.hidden && f.focus({ preventScroll: true }); }, 300);
  }
  // a gentle, dismissible notice by the launcher (used by the analyser and videos)
  function notice(o) {
    if (inviteOpen) return false;
    inviteOpen = true;
    invite.innerHTML = `${orb()}<div class="cmp-invite__b"><p>${esc(pick(o.en, o.ar))}</p>${o.smallEn ? `<small>${esc(pick(o.smallEn, o.smallAr))}</small>` : ''}
      <div class="cmp-invite__btns">${o.buttons.map((b, i) => `<button type="button" class="btn btn--xs ${i === 0 ? 'btn--accent' : i === 1 ? 'btn--ghost' : 'btn--quiet'}" data-n="${esc(b.id)}">${esc(pick(b.en, b.ar))}</button>`).join('')}</div></div>`;
    invite.hidden = false;
    requestAnimationFrame(() => invite.classList.add('is-in'));
    launch.classList.add('has-invite');
    invite.onclick = e => { const b = e.target.closest('[data-n]'); if (!b) return; hideInvite(); o.onPick && o.onPick(b.dataset.n); };
    return true;
  }
  function hideInvite() {
    if (invite.hidden) return;
    inviteOpen = false; launch.classList.remove('has-invite');
    invite.classList.remove('is-in');
    setTimeout(() => { if (!invite.classList.contains('is-in')) invite.hidden = true; }, reduce ? 0 : 240);
  }

  /* ---------------- in-the-moment nudges (side pop-ups) ----------------
     After two or three zooms, pinch-zooms or up-and-down scrolls, a friendly
     card slides in at the side asking whether something is getting in the way,
     with one-tap fixes. Events are counted in memory for about a minute and
     never stored or sent. They stop if the student turns noticing or
     invitations off; "I'm fine" silences that kind for the session. At most
     one every 45 s, each kind at most every 3 minutes. Never text, keystrokes,
     camera or audio. */
  const side = document.createElement('div');
  side.className = 'cside';
  side.setAttribute('role', 'status');
  side.setAttribute('aria-live', 'polite');
  side.hidden = true;
  host.appendChild(side);
  const nud = { zoom: [], pinch: [], scroll: [], pscroll: [], lastAny: 0, last: {}, muted: new Set(), stillKey: null, stillSince: Date.now() };
  const NUDGE = {
    zoom: { icon: 'search', t: ['Zooming in and out a lot?', 'تكبّر وتصغّر كثيراً؟'], b: ['Is the text hard to see, or is something not clear? I can make it bigger and easier on the eyes so you don’t have to keep zooming.', 'هل النص صعب الرؤية، أم أن شيئاً غير واضح؟ يمكنني تكبيره وجعله أريح للعين حتى لا تضطر للتكبير باستمرار.'], acts: [['bigger', 'Make text bigger & clearer', 'كبّري النص ووضّحيه'], ['tts', 'Read it to me', 'اقرئيه لي'], ['tint', 'Softer page colour', 'لون صفحة أهدأ']] },
    pinch: { icon: 'eyeScan', t: ['Is the text too small?', 'هل النص صغير جداً؟'], b: ['I noticed some pinch-zooming. Are you having trouble reading? I can make the text bigger so you don’t have to pinch.', 'لاحظت بعض التكبير بإصبعين. هل تجد صعوبة في القراءة؟ يمكنني تكبير النص حتى لا تضطر لذلك.'], acts: [['bigger', 'Yes, bigger text', 'نعم، نص أكبر'], ['tts', 'Read it to me', 'اقرئيه لي'], ['tint', 'Softer page colour', 'لون صفحة أهدأ']] },
    scroll: { icon: 'scroll', t: ['Scrolling up and down a lot?', 'تمرّر للأعلى والأسفل كثيراً؟'], b: ['Are you looking for something, or is this part hard to follow? I can help you find it or break it down.', 'هل تبحث عن شيء، أم أن هذا الجزء صعب المتابعة؟ يمكنني مساعدتك في إيجاده أو تبسيطه.'], acts: [['sum', 'Summarise this page', 'لخّصي هذه الصفحة'], ['find', 'Search the reading', 'ابحثي في القراءة'], ['focus', 'Line focus', 'تركيز السطر']] },
    pscroll: { icon: 'scroll', t: ['Looking for something?', 'تبحث عن شيء؟'], b: ['You’ve been scrolling up and down — is anything confusing, or can I help you find something?', 'كنت تمرّر للأعلى والأسفل — هل هناك شيء محيّر، أو يمكنني مساعدتك في إيجاد شيء؟'], acts: [['where', 'Help me find it', 'ساعديني في إيجاده'], ['studio', 'Open the Reading Studio', 'افتحي استوديو القراءة'], ['ptext', 'Bigger text on this site', 'نص أكبر في الموقع']] },
    ppinch: { icon: 'eyeScan', t: ['Is the text too small?', 'هل النص صغير جداً؟'], b: ['I noticed some pinch-zooming. Shall I make everything on this site a bit bigger?', 'لاحظت بعض التكبير بإصبعين. هل أكبّر كل شيء في الموقع قليلاً؟'], acts: [['ptext', 'Yes, bigger text', 'نعم، نص أكبر'], ['studio', 'Read in the Studio instead', 'اقرأ في الاستوديو بدلاً من ذلك']] },
    stall: { icon: 'clock', t: ['Still on this part?', 'ما زلت عند هذا الجزء؟'], b: ['You’ve been on this section for a while — totally fine. Is something tricky? I can explain it or read it aloud.', 'أنت عند هذا القسم منذ مدة — وهذا طبيعي تماماً. هل هناك شيء صعب؟ يمكنني شرحه أو قراءته بصوت عالٍ.'], acts: [['explain', 'Explain it', 'اشرحيه'], ['tts', 'Read it aloud', 'اقرئيه بصوت'], ['break', '5-minute break', 'استراحة ٥ دقائق']] }
  };
  const nudgeOff = () => store.prefs().invitations === 'off' || (store.asked('monitoring') && !store.consent('monitoring'));
  function nudgeRecord(ev) {
    const t = ev.t || Date.now();
    if (ev.type === 'zoom' && !ev.figure) nud.zoom.push(t);
    if (ev.type === 'pinch' && ev.scale > 1.1) nud.pinch.push(t);
    if (ev.type === 'scrolldir') nud.scroll.push(t);
    if (ev.type === 'section' && ev.key !== nud.stillKey) { nud.stillKey = ev.key; nud.stillSince = t; }
    if (ev.type === 'tts' || ev.type === 'open') nud.stillSince = t;
    trimNud(t);
    if (ev.type === 'zoom' || ev.type === 'pinch' || ev.type === 'scrolldir') { clearTimeout(nudgeRecord.t); nudgeRecord.t = setTimeout(nudgeCheck, 700); }
  }
  const trimNud = t => ['zoom', 'pinch', 'scroll', 'pscroll'].forEach(k => { while (nud[k].length && t - nud[k][0] > 60e3) nud[k].shift(); });
  // outside the Reading Studio: the student site itself (scrolling back and forth, pinch-zoom)
  let pY = scrollY, pDir = 0, pinchS = window.visualViewport ? visualViewport.scale : 1;
  addEventListener('scroll', () => {
    if (R.isOpen()) return;
    const d = scrollY - pY; if (Math.abs(d) < 120) return;
    const dir = Math.sign(d); pY = scrollY;
    if (pDir && dir !== pDir) { nud.pscroll.push(Date.now()); trimNud(Date.now()); clearTimeout(nudgeRecord.t); nudgeRecord.t = setTimeout(nudgeCheck, 700); }
    pDir = dir;
  }, { passive: true });
  if (window.visualViewport) visualViewport.addEventListener('resize', () => {
    if (R.isOpen()) return; // the studio reports its own pinch events
    const sc = visualViewport.scale;
    if (Math.abs(sc - pinchS) >= 0.08) { pinchS = sc; if (sc > 1.1) { nud.pinch.push(Date.now()); clearTimeout(nudgeRecord.t); nudgeRecord.t = setTimeout(nudgeCheck, 700); } }
  });
  setInterval(() => nudgeCheck(), 5000);
  function nudgeCheck() {
    if (nudgeOff() || paused || busy || generating || (conv && !conv.done) || Date.now() < snoozeUntil || (ERLY.companion && ERLY.companion.inCall) || !side.hidden && side.children.length) return;
    const now = Date.now();
    if (now - nud.lastAny < 45e3) return;
    const n = (arr, ms) => arr.filter(x => now - x < ms).length;
    const inStudio = R.isOpen();
    let kind = null;
    if (inStudio && n(nud.zoom, 45e3) >= 3) kind = 'zoom';
    else if (n(nud.pinch, 60e3) >= 2) kind = inStudio ? 'pinch' : 'ppinch';
    else if (inStudio && n(nud.scroll, 30e3) >= 4) kind = 'scroll';
    else if (!inStudio && n(nud.pscroll, 25e3) >= 4) kind = 'pscroll';
    else if (inStudio && nud.stillKey && now - nud.stillSince > 120e3 && !R.isReading() && !document.hidden) kind = 'stall';
    if (!kind || nud.muted.has(kind) || now - (nud.last[kind] || 0) < 3 * 60e3) return;
    nud.lastAny = now; nud.last[kind] = now;
    if (kind === 'stall') nud.stillSince = now;
    const arr = { zoom: 'zoom', pinch: 'pinch', ppinch: 'pinch', scroll: 'scroll', pscroll: 'pscroll' }[kind];
    if (arr) nud[arr].length = 0;
    showNudge(kind);
  }
  let nudgeT = null;
  function hideNudge() {
    const c = side.firstElementChild; clearTimeout(nudgeT);
    if (!c) return;
    c.classList.remove('is-in'); c.classList.add('is-out');
    setTimeout(() => { c.remove(); if (!side.children.length) side.hidden = true; }, reduce ? 0 : 380);
  }
  function showNudge(kind) {
    const N = NUDGE[kind]; if (!N) return false;
    side.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'cnudge';
    card.dataset.kind = kind;
    card.innerHTML = `<button type="button" class="cnudge__x" data-nu="close" aria-label="${T('Close', 'إغلاق')}">${ICON('x')}</button>
      <div class="cnudge__top"><span class="cnudge__ic" aria-hidden="true">${ICON(N.icon)}</span><p class="cnudge__k">${orb('cmp-orb--xs')} Noor <small>${T('just checking in', 'مجرد اطمئنان')}</small></p></div>
      <b class="cnudge__t">${esc(pick(...N.t))}</b><p class="cnudge__b">${esc(pick(...N.b))}</p>
      <div class="cnudge__btns">${N.acts.map((a, i) => `<button type="button" class="btn btn--xs ${i === 0 ? 'btn--accent' : 'btn--ghost'}" data-nu="${a[0]}">${esc(pick(a[1], a[2]))}</button>`).join('')}</div>
      <div class="cnudge__more"><button type="button" data-nu="talk">${ICON('chat')} ${T('Yes, something’s hard — talk to Noor', 'نعم، شيء صعب — تحدث مع نور')}</button><button type="button" data-nu="fine">${T('I’m fine', 'أنا بخير')}</button></div>
      <small class="cnudge__p">${T('Private — only you see this. Nothing is saved or shared.', 'خاص — أنت فقط ترى هذا. لا يُحفظ ولا يُشارك شيء.')} <button type="button" data-nu="off">${T('Turn these off', 'إيقاف هذه')}</button></small>
      <span class="cnudge__timer" aria-hidden="true"></span>`;
    side.appendChild(card);
    side.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('is-in')));
    window.FUN && FUN.sfx && FUN.sfx.tick();
    clearTimeout(nudgeT); nudgeT = setTimeout(hideNudge, 25000);
    card.addEventListener('pointerenter', () => clearTimeout(nudgeT));
    card.addEventListener('pointerleave', () => { clearTimeout(nudgeT); nudgeT = setTimeout(hideNudge, 12000); });
    card.onclick = async e => {
      const b = e.target.closest('[data-nu]'); if (!b) return;
      const k = b.dataset.nu, para = R.isOpen() ? R.currentPara() : null;
      hideNudge();
      if (k === 'close') return;
      if (k === 'fine') { nud.muted.add(kind); ERLY.toast && ERLY.toast(T('Okay! I won’t ask about that again this session.', 'حسناً! لن أسأل عن ذلك مجدداً في هذه الجلسة.')); return; }
      if (k === 'off') { store.setPref('invitations', 'off'); ERLY.toast && ERLY.toast(T('Check-ins are off. Turn them back on in Noor → Signals.', 'الاطمئنان متوقف. أعد تشغيله من نور ← الإشارات.')); return; }
      if (k === 'bigger') { R.act('calm'); ERLY.toast && ERLY.toast(T('Bigger, calmer text — change it any time under Text & voice.', 'نص أكبر وأهدأ — غيّره متى شئت من النص والصوت.')); }
      if (k === 'tint') { R.act('tint'); ERLY.toast && ERLY.toast(T('Softer page colour on.', 'تم تفعيل لون صفحة أهدأ.')); }
      if (k === 'tts') R.act('tts', para);
      if (k === 'find') R.act('search');
      if (k === 'focus') { R.act('focus', para); ERLY.toast && ERLY.toast(T('Line focus on — move with your mouse or ↑ ↓.', 'تركيز السطر مفعّل — تحرّك بالفأرة أو ↑ ↓.')); }
      if (k === 'ptext') { const big = !document.documentElement.classList.contains('erly-big'); document.documentElement.classList.toggle('erly-big', big); ERLY.toast && ERLY.toast(big ? T('Bigger text on — tap again in a check-in to undo.', 'تم تكبير النص.') : T('Text back to normal.', 'عاد النص لحجمه الطبيعي.')); }
      if (k === 'studio') R.openLibrary();
      if (k === 'sum') { openPanel('chat'); await greeting; await runTool('summary', para); }
      if (k === 'explain') { openPanel('chat'); await greeting; helpMenu({ para }); }
      if (k === 'break') { openPanel('chat'); await greeting; await runTool('break', para); }
      if (k === 'where') { openPanel('chat'); await greeting; await aiSays('Sure! What are you looking for? Type it here, or pick one below.', 'بالتأكيد! عمّ تبحث؟ اكتبه هنا أو اختر أدناه.'); chipRow([{ id: 'r', en: 'A course reading', ar: 'قراءة مادة' }, { id: 'q', en: 'Today’s check-ins', ar: 'فحوصات اليوم' }, { id: 's', en: 'Getting support (SAS)', ar: 'الحصول على الدعم' }, { id: 'g', en: 'My Growth Plan', ar: 'خطة النمو' }], c => { bubble('you', pick(c.en, c.ar), { text: true }); if (c.id === 'r') { closePanel(); R.openLibrary(); } if (c.id === 'q') location.href = 'checkins.html'; if (c.id === 's') { closePanel(); const el = document.querySelector('#handoff, #support, #get-support'); el ? el.scrollIntoView({ behavior: 'smooth' }) : location.hash = '#handoff'; } if (c.id === 'g') location.href = 'support.html'; }); }
      if (k === 'talk') {
        openPanel('chat'); await greeting;
        if (R.isOpen()) startConversation({ type: 'invite', signal: kind === 'zoom' || kind === 'pinch' ? 'zoom' : 'regression', section: para }, [], false);
        else if (brain()) { bubble('you', T('Something feels hard', 'شيء ما يبدو صعباً'), { text: true }); brain().freeText('I feel like something is hard for me', { silentUser: true }); }
      }
      ERLY.emit && ERLY.emit('noor:nudge', { kind, action: k });
    };
    return true;
  }

  /* ---------------- Layer 3: conversation ---------------- */
  function startConversation(trigger, observations, multiple) {
    if (conv && !conv.done) return;
    clearChips();
    helpCtx = null;
    conv = D.create({ trigger, observations: observations || [], multiple: !!multiple });
    renderConvBar();
    renderTurn(D.start(conv));
  }
  function endConversation() {
    if (brain() && brain().active()) { voice.stop(); voice.abortListening(); return brain().answerText(T('stop', 'توقف')); }
    if (!conv || conv.done) return;
    voice.stop(); voice.abortListening();
    bubble('you', T('End conversation', 'إنهاء المحادثة'), { text: true });
    renderTurn(D.answer(conv, { chip: 'stop', label: 'End conversation', labelAr: 'إنهاء المحادثة' }));
  }
  function renderConvBar() {
    const b = $('#cmpConv'); if (!b) return;
    const on = (conv && !conv.done) || (brain() && brain().active());
    b.textContent = on ? T('End conversation', 'إنهاء المحادثة') : T('Start conversation', 'ابدأ محادثة');
    b.classList.toggle('btn--ghost', !!on); b.classList.toggle('btn--accent', !on);
  }
  async function submit(text, chip) {
    const B = brain();
    if (B && B.active()) return B.answerText(text);                 // a structured interview is running
    if (B && (!conv || conv.done)) return B.freeText(text);          // otherwise Noor answers like a knowledgeable companion
    // free text with no conversation running starts one
    if (!conv || conv.done) {
      if (helpCtx && !chip) { /* typed while the help menu was open: treat as a new conversation */ }
      bubble('you', text, { text: true });
      conv = D.create({ trigger: { type: 'student' } });
      D.start(conv); // sets the opening question; the typed text answers it
      renderConvBar();
      return answer({ text, label: text });
    }
    bubble('you', text, { text: true });
    return answer(chip ? chip : { text, label: text });
  }
  async function answer(input) {
    busy = true; clearChips(); setStatus('thinking');
    let extra = [], ack = '';
    const isText = !!input.text && !input.chip;
    if (isText && llm.active().external) {
      const q = conv.turns[conv.turns.length - 1];
      const r = await llm.interpret({ question: q ? q.en : '', answer: input.text, allowed: D.allowedIntents(conv), lang: lang() });
      extra = r.intents || []; ack = r.ack || '';
      if (r.fallback) bubble('ai', T('The external AI didn’t answer in time, so I’m using the built-in rules for this reply.', 'لم يستجب الذكاء الاصطناعي الخارجي في الوقت المناسب، لذا أستخدم القواعد المدمجة لهذا الرد.'), { text: true, cls: 'cmsg--note' });
    }
    const prevQ = conv.current, pending = conv.pendingTool;
    const turn = D.answer(conv, input, extra);
    if ((prevQ === 'check_helped' || prevQ === 'tts_helps') && conv.tried.length) {
      const t = conv.tried[conv.tried.length - 1];
      if (t.helped != null && ERLY.helped && (pending || prevQ === 'tts_helps')) ERLY.helped(t.tool, t.helped);
    }
    busy = false;
    if (ack && turn) { turn.en = ack + ' ' + turn.en; turn.ar = ack + ' ' + turn.ar; }
    return renderTurn(turn);
  }
  async function renderTurn(turn) {
    if (!turn) return;
    renderConvBar();
    await aiSays(turn.en, turn.ar, { speak: turn.kind !== 'action' });
    if (turn.actions && turn.actions.length) {
      for (const a of turn.actions) await runTool(a.tool, R.currentPara());
      if (turn.follow) { await wait(R.isReading() ? 300 : 500); await aiSays(turn.follow.en, turn.follow.ar); return chipsFor(turn.follow); }
    }
    if (turn.done) { renderConvBar(); draft = null; return endChips(); }
    chipsFor(turn);
  }
  function chipsFor(turn) {
    if (!turn.chips || !turn.chips.length) return;
    const list = turn.chips.concat(turn.kind === 'question' ? [{ id: 'skip', en: 'Skip', ar: 'تخطٍّ' }] : []);
    chipRow(list, c => { bubble('you', pick(c.en, c.ar), { text: true }); answer({ chip: c.id, label: c.en, labelAr: c.ar }); });
  }
  function endChips() {
    chipRow([{ id: 'sum', en: 'Review my summary', ar: 'راجع ملخصي', icon: 'file' }, { id: 'lab', en: 'Try the Reading Lab', ar: 'جرّب مختبر القراءة', icon: 'text' }, { id: 'read', en: 'Back to reading', ar: 'العودة للقراءة', icon: 'book' }], c => {
      if (c.id === 'sum') setTab('summary');
      if (c.id === 'lab') setTab('lab');
      if (c.id === 'read') closePanel();
    });
  }

  /* ---------------- Layer 5: support tools ---------------- */
  async function runTool(tool, k) {
    k = k || R.currentPara();
    R.act(tool, k);
    if (tool === 'summary' && k) {
      const sum = R.paraSummary(k), prepared = !!R.paraOf(k).p.sum;
      await aiSays(sum.join(' '), sum.join(' '), { html: `<ol class="cmp-sum">${sum.map(s => `<li>${esc(s)}</li>`).join('')}</ol><small class="muted">${prepared ? T('Summary written by the course team for this reading.', 'ملخص كتبه فريق المادة لهذه القراءة.') : T('Auto summary: key sentences picked from your file on this device.', 'ملخص تلقائي: جمل أساسية مختارة من ملفك على هذا الجهاز.')}</small>`, speak: true });
    }
    if (tool === 'terms' && k) {
      const ts = R.termsIn(k);
      const html = ts.length ? `<div class="cmp-terms">${ts.map(([t, d]) => `<div><b>${esc(t)}</b><span>${esc(d[0])}</span><small lang="ar" dir="rtl">${esc(d[1])}</small></div>`).join('')}</div>` : esc(T('This paragraph has no glossary words — tap any highlighted word elsewhere to see its meaning.', 'لا توجد كلمات من المسرد في هذه الفقرة — اضغط على أي كلمة مميزة في مكان آخر لمعرفة معناها.'));
      await aiSays(ts.map(([t, d]) => `${t}: ${d[0]}`).join('. ') || 'No glossary words here.', ts.map(([t, d]) => `${t}: ${d[1]}`).join('. ') || 'لا كلمات هنا.', { html });
    }
    if (tool === 'diagram') await diagramWalk();
    if (tool === 'break') await aiSays('', '', { speak: false, html: `${esc(T('Breathe with me — in as it grows, out as it shrinks. Your place is saved.', 'تنفّس معي — شهيق حين يكبر، وزفير حين يصغر. مكانك محفوظ.'))}<div class="cmp-breath"><i></i><b class="mono" data-br>5:00</b></div>` }).then(m => {
      let left = 300; const iv = setInterval(() => { left--; const el = m.querySelector('[data-br]'); if (!el || left <= 0) { clearInterval(iv); return; } el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }, 1000);
    });
  }
  function diagramWalk() {
    const steps = R.figSteps();
    if (!steps.length) return aiSays('This reading doesn’t have a diagram to walk through.', 'لا يوجد في هذه القراءة رسم لنشرحه.');
    R.act('diagram');
    return new Promise(async res => {
      for (let i = 0; i < steps.length; i++) {
        R.highlightFig(i);
        await aiSays(steps[i], steps[i], { html: `<span class="cmp-step">${i + 1}</span>${esc(steps[i])}` });
        if (i < steps.length - 1) {
          const c = await new Promise(r => chipRow([{ id: 'n', en: 'Next', ar: 'التالي' }, { id: 'x', en: 'Got it', ar: 'فهمت' }], r));
          if (c.id === 'x') break;
        }
      }
      R.highlightFig(-1);
      res();
    });
  }
  // One-tap help from the "?" beside a paragraph or the diagram button
  async function helpMenu(ctx) {
    if (conv && !conv.done) { openPanel('chat'); return; }
    helpCtx = ctx;
    if (ctx.figure) {
      busy = true;
      await aiSays('Let’s walk through the diagram together.', 'لنمرّ على الرسم معاً.');
      await diagramWalk(); busy = false;
      return askHelped('diagram');
    }
    const k = ctx.para || R.currentPara();
    if (!k) return idleChips();
    R.spotlight(k);
    const lbl = R.paraLabel(k);
    await aiSays(`What would help with ${lbl[0]}?`, `ما الذي سيساعد في ${lbl[1]}؟`);
    chipRow([
      { id: 'tts', en: 'Read it to me', ar: 'اقرأها لي', icon: 'volume' },
      { id: 'summary', en: 'Plain-words summary', ar: 'ملخص بكلمات بسيطة', icon: 'file' },
      { id: 'terms', en: 'Key word meanings', ar: 'معاني الكلمات المهمة', icon: 'abc' },
      { id: 'focus', en: 'Line focus', ar: 'تركيز السطر', icon: 'ruler' },
      { id: 'quiz', en: 'Quick check', ar: 'فحص سريع', icon: 'target' },
      { id: 'talk', en: 'Talk it through', ar: 'لنتحدث عنها', icon: 'chat' }
    ], async c => {
      bubble('you', pick(c.en, c.ar), { text: true });
      if (c.id === 'talk') return startConversation({ type: 'student' });
      if (c.id === 'quiz') return quiz(k);
      busy = true;
      if (c.id === 'tts') await aiSays('Reading it to you now — follow the highlighted words.', 'أقرؤها لك الآن — تابع الكلمات المميزة.', { speak: false });
      if (c.id === 'focus') await aiSays('Line focus is on — move with your mouse or the ↓ key.', 'تركيز السطر مفعّل — تحرّك بالفأرة أو بمفتاح ↓.');
      await runTool(c.id, k);
      busy = false;
      if (c.id === 'tts') { const t0 = Date.now(); await wait(500); while (R.isReading() && Date.now() - t0 < 90000) await wait(300); }
      askHelped(c.id);
    }, 'cchips--tools');
  }
  async function quiz(k) {
    const check = R.paraCheck(k);
    if (!check) { await aiSays('There isn’t enough text in this part for a quick check. Try the Quiz in Study tools instead.', 'لا يوجد نص كافٍ في هذا الجزء لفحص سريع. جرّب الاختبار في أدوات المذاكرة.'); return askHelped('quiz'); }
    const p = { check };
    R.act('quiz', k);
    const order = p.check.opts.map((_, i) => i).sort(() => Math.random() - .5);
    const m = await aiSays(p.check.q, p.check.q, { html: `<p class="cmp-q">${esc(p.check.q)}</p><div class="cmp-opts">${order.map(i => `<button type="button" data-o="${i}">${esc(p.check.opts[i])}</button>`).join('')}</div><small class="muted">${T('Just for you — this isn’t saved or scored.', 'لك فقط — لا يُحفظ ولا يُقيَّم.')}</small>` });
    await new Promise(res => m.addEventListener('click', async function on(e) {
      const b = e.target.closest('[data-o]'); if (!b || b.disabled) return;
      if (+b.dataset.o === p.check.a) {
        m.removeEventListener('click', on);
        m.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; }); b.classList.add('is-ok');
        await aiSays('Yes! ' + p.check.why, 'أحسنت! ' + p.check.why); res();
      } else { b.classList.add('is-no'); b.disabled = true; await aiSays('Not quite — have another look; one of the others fits better.', 'ليس تماماً — انظر مجدداً؛ أحد الخيارات الأخرى أنسب.'); }
    }));
    askHelped('quiz');
  }
  async function askHelped(tool) {
    await aiSays('Did that help?', 'هل ساعد ذلك؟');
    chipRow([{ id: '1', en: 'Yes', ar: 'نعم', icon: 'smile' }, { id: '0.5', en: 'A bit', ar: 'قليلاً', icon: 'meh' }, { id: '0', en: 'Not really', ar: 'ليس فعلاً', icon: 'frown' }], async c => {
      bubble('you', pick(c.en, c.ar), { text: true });
      const v = +c.id;
      ERLY.helped && ERLY.helped(tool, v);
      helpLog.push({ tool, helped: v });
      R.clearSpot(); helpCtx = null;
      await aiSays(v ? 'Good to know — I’ll remember that this helps.' : 'Thanks for telling me. Want to try something else, or talk about it?', v ? 'جميل — سأتذكر أن هذا يساعد.' : 'شكراً لإخباري. هل تريد تجربة شيء آخر، أم الحديث عن الأمر؟');
      idleChips();
    });
  }
  const helpLog = [];

  /* ---------------- voice input ---------------- */
  function renderMic() {
    const b = $('#cmpMic'); if (!b) return;
    if (!voice.supported.stt) { b.disabled = true; b.title = T('Voice input isn’t supported in this browser — typing works everywhere.', 'الإدخال الصوتي غير مدعوم في هذا المتصفح — الكتابة تعمل في كل مكان.'); b.setAttribute('aria-label', b.title); return; }
    b.setAttribute('aria-label', voice.state().listening ? T('Stop listening', 'أوقف الاستماع') : T('Answer by voice', 'أجب بالصوت'));
  }
  function micClick() {
    if (voice.state().listening) return voice.stopListening();
    if (!store.consent('mic')) return micConsent();
    listen();
  }
  function micConsent() {
    clearChips();
    const card = document.createElement('div');
    card.className = 'ccard';
    card.innerHTML = `<b>${T('Use your microphone?', 'استخدام الميكروفون؟')}</b>
      <p>${T('Only to turn what you say into text, one answer at a time. I start listening only when you tap the mic and stop after your answer. No audio is recorded or kept by ERLY — only the text appears in the chat, and you can delete it.', 'فقط لتحويل ما تقوله إلى نص، إجابة واحدة في كل مرة. أبدأ الاستماع فقط عندما تضغط على الميكروفون وأتوقف بعد إجابتك. لا يسجل إيرلي أي صوت ولا يحتفظ به — يظهر النص فقط في المحادثة، ويمكنك حذفه.')}</p>
      <p class="muted">${T('Heads-up: in some browsers (for example Chrome and Edge) the browser itself sends the audio to its own speech service to transcribe it. If you’d rather avoid that, just type.', 'تنبيه: في بعض المتصفحات (مثل كروم وإيدج) يرسل المتصفح نفسه الصوت إلى خدمة الكلام الخاصة به لتحويله إلى نص. إن كنت تفضّل تجنّب ذلك، اكتب فقط.')}</p>
      <div class="ccard__btns"><button type="button" class="btn btn--sm btn--accent" data-m="yes">${T('Allow microphone', 'السماح بالميكروفون')}</button><button type="button" class="btn btn--sm btn--ghost" data-m="no">${T('I’ll type instead', 'سأكتب بدلاً من ذلك')}</button></div>`;
    card.addEventListener('click', e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      card.remove();
      $('#cmpText').focus({ preventScroll: true }); // keep focus inside the panel once the card goes
      if (b.dataset.m === 'yes') { store.setConsent('mic', true); listen(); }
      else store.setConsent('mic', false);
    });
    $('#cmpLog').appendChild(card); scrollLog();
  }
  function listen() {
    const input = $('#cmpText');
    const ok = voice.listen({
      lang: lang(),
      onresult: (t) => { input.value = t; },
      onerror: code => {
        const msg = {
          'not-allowed': ['Microphone access is blocked, so I can’t listen. You can type instead, or allow the microphone in your browser’s site settings.', 'الوصول إلى الميكروفون محظور، لذا لا أستطيع الاستماع. يمكنك الكتابة بدلاً من ذلك، أو السماح بالميكروفون من إعدادات الموقع في المتصفح.'],
          'service-not-allowed': ['Voice input isn’t allowed in this browser. Typing works just as well.', 'الإدخال الصوتي غير مسموح في هذا المتصفح. الكتابة تعمل بالقدر نفسه.'],
          'no-speech': ['I didn’t catch anything. Tap the mic to try again, or type.', 'لم ألتقط شيئاً. اضغط على الميكروفون للمحاولة مجدداً، أو اكتب.'],
          'audio-capture': ['I couldn’t find a microphone. You can type instead.', 'لم أجد ميكروفوناً. يمكنك الكتابة بدلاً من ذلك.'],
          network: ['Voice input needs an internet connection in this browser. Typing works offline.', 'يحتاج الإدخال الصوتي إلى اتصال بالإنترنت في هذا المتصفح. الكتابة تعمل دون اتصال.'],
          unsupported: ['This browser doesn’t support voice input — typing works everywhere.', 'هذا المتصفح لا يدعم الإدخال الصوتي — الكتابة تعمل في كل مكان.']
        }[code];
        if (msg && code !== 'aborted') bubble('ai', pick(msg[0], msg[1]), { text: true, cls: 'cmsg--note' });
      },
      onend: final => { renderMic(); if (final && !busy) { input.value = ''; submit(final); } }
    });
    renderMic();
    if (ok) announce(T('Listening', 'أستمع'));
  }

  /* ---------------- Reading signals tab ---------------- */
  const SIG_NAME = { regression: ['Going back to the same section', 'العودة إلى القسم نفسه'], zoom: ['Zoom changes (reader zoom)', 'تغييرات التكبير (تكبير القارئ)'], pan: ['Sideways panning', 'التحريك الجانبي'], format: ['Text-setting changes', 'تغييرات إعدادات النص'], tts: ['Read-aloud use', 'استخدام القراءة الصوتية'], session: ['This session', 'هذه الجلسة'] };
  const BASE_KEY = { regression: 'returnsPerMin', zoom: 'zoomPerMin', pan: 'panPerMin', format: 'formatPerMin' };
  function renderSignals() {
    const pane = $('#cmpP-signals');
    const sig = signals();
    const on = store.consent('monitoring');
    const nBase = store.baseline().sessions.length;
    const rows = !on ? `<p class="cmp-empty">${T('Noticing is off, so nothing is being counted. Turn it on below if you’d like Noor to check in when something keeps repeating.', 'الملاحظة متوقفة، لذا لا يُحسب أي شيء. شغّلها أدناه إن أردت أن تطمئن عليك نور عندما يتكرر شيء.')}</p>`
      : !sig ? `<p class="cmp-empty">${T('Open a reading to start a session.', 'افتح قراءة لبدء جلسة.')}</p>`
        : sig.map(x => {
          const name = pick(...SIG_NAME[x.id]);
          if (!x.available) return `<div class="csig is-na"><b>${name}</b><span class="csig__pill">${T('Not available', 'غير متاح')}</span><small>${T('This reader can’t measure it here.', 'لا يستطيع هذا القارئ قياسه هنا.')}</small></div>`;
          if (x.id === 'session') return `<div class="csig"><b>${name}</b><span class="csig__v">${T(`${Math.round(x.minutes)} min · ${x.sectionsVisited} sections visited · ${x.sectionsRevisited} revisited`, `${Math.round(x.minutes)} د · ${x.sectionsVisited} أقسام · ${x.sectionsRevisited} أعيدت زيارتها`)}</span></div>`;
          if (x.id === 'tts') return `<div class="csig"><b>${name}</b><span class="csig__v">${x.value} ${T('starts', 'مرات')}</span><small>${T('Recorded so you can see if listening helps. It never triggers a check-in and is never treated as a sign of anything.', 'يُسجَّل لترى إن كان الاستماع يساعد. لا يؤدي أبداً إلى سؤال ولا يُعامل كعلامة على شيء.')}</small></div>`;
          const st = x.baseline;
          const base = st.ready ? T(`Your usual: ${st.mean}/min (from ${st.n} sessions). Now: ${x.rate}/min.`, `معدلك المعتاد: ${st.mean}/د (من ${st.n} جلسات). الآن: ${x.rate}/د.`) : T(`Still learning your usual — ${st.n} of ${cfg.baseline.minSessions} sessions.`, `ما زلت أتعلم نمطك المعتاد — ${st.n} من ${cfg.baseline.minSessions} جلسات.`);
          const pill = x.friction ? (x.provisional ? T('Repeated — may be worth a check-in (no baseline yet)', 'متكرر — قد يستحق سؤالاً (لا خط أساس بعد)') : T('Repeated and above your usual', 'متكرر وأعلى من معدلك')) : x.compared === 'within' && x.recent ? T('Within your usual range', 'ضمن نطاقك المعتاد') : T('Nothing repeating', 'لا شيء متكرر');
          const extra = x.id === 'regression' ? `<small>${T(`Ignored on purpose: ${x.excluded.intentional} intentional jumps (page buttons, read-aloud, Noor), ${x.excluded.figure} diagram visits, ${x.excluded.skim} quick skims.`, `تم تجاهله عمداً: ${x.excluded.intentional} قفزات مقصودة (أزرار الصفحات، القراءة الصوتية، نور)، ${x.excluded.figure} زيارات للرسم، ${x.excluded.skim} تصفح سريع.`)}</small>` : x.id === 'zoom' ? `<small>${T(`Diagram zooms ignored: ${x.excludedFigure}. Browser zoom and pinch-zoom can’t be measured.`, `تم تجاهل تكبير الرسم: ${x.excludedFigure}. لا يمكن قياس تكبير المتصفح أو القرص.`)}</small>` : x.id === 'pan' ? `<small>${T('Only possible when the reader is zoomed in.', 'ممكن فقط عند تكبير القارئ.')}</small>` : '';
          return `<div class="csig ${x.friction ? 'is-on' : ''}"><b>${name}</b><span class="csig__v">${x.value} ${T('total', 'إجمالاً')} · ${x.recent} ${T('recently', 'مؤخراً')}</span><span class="csig__pill">${pill}</span><small>${T('Threshold', 'العتبة')}: ${esc(x.threshold)}. ${base}</small>${extra}</div>`;
        }).join('');
    const prefs = store.prefs();
    pane.innerHTML = `
      <p class="cmp-lead">${T('Exactly what Noor counts, the rule it uses, and how it compares with your own usual pattern. One event is never treated as meaningful.', 'ما تحسبه نور بالضبط، والقاعدة التي تستخدمها، وكيف يُقارن بنمطك المعتاد. لا يُعتبر حدث واحد ذا معنى أبداً.')}</p>
      <div class="csigs">${rows}</div>
      <div class="cnever"><b>${ICON('shield')} ${T('Never measured', 'لا يُقاس أبداً')}</b><p>${T('Eye movement, attention, comprehension, reading accuracy, keystroke contents, camera images, audio recordings, the text of your documents.', 'حركة العين، الانتباه، الفهم، دقة القراءة، محتوى ضغطات المفاتيح، صور الكاميرا، التسجيلات الصوتية، نص مستنداتك.')}</p>
        <p class="muted">${T('Thresholds are starting values for this prototype — not clinically validated. Patterns here can have ordinary explanations (tiredness, a small screen, a hard topic).', 'العتبات قيم أولية لهذا النموذج — وليست معتمدة سريرياً. للأنماط هنا تفسيرات عادية (التعب، شاشة صغيرة، موضوع صعب).')}</p></div>
      <h4 class="cmp-h">${T('Your controls', 'إعداداتك')}</h4>
      <div class="cctl">
        ${toggle('mon', T('Notice reading friction', 'ملاحظة احتكاك القراءة'), on, T('Off = nothing is counted at all.', 'متوقف = لا يُحسب أي شيء.'))}
        ${toggle('pause', T('Pause for this session', 'إيقاف مؤقت لهذه الجلسة'), paused, T('Stops counting until you close the reading.', 'يوقف الحساب حتى تغلق القراءة.'), !on)}
        ${toggle('inv', T('Gentle check-in invitations', 'دعوات الاطمئنان اللطيفة'), prefs.invitations !== 'off', T(`At most ${cfg.invite.maxPerSession} per session, ${Math.round(cfg.invite.cooldownMs / 60e3)} min apart.`, `بحد أقصى ${cfg.invite.maxPerSession} لكل جلسة، بفارق ${Math.round(cfg.invite.cooldownMs / 60e3)} دقائق.`), !on)}
        ${toggle('mic', T('Microphone for voice answers', 'الميكروفون للإجابات الصوتية'), store.consent('mic'), voice.supported.stt ? T('Only when you tap the mic. No audio is kept.', 'فقط عندما تضغط على الميكروفون. لا يُحفظ أي صوت.') : T('Not supported in this browser.', 'غير مدعوم في هذا المتصفح.'), !voice.supported.stt)}
        ${llm.configured ? toggle('llm', T('Use the external AI model', 'استخدام نموذج الذكاء الاصطناعي الخارجي'), store.consent('llm'), T(`Sends only the current question and your typed answer (emails and numbers removed) to ${new URL(llm.endpoint, location.href).host}. No name, no reading history, no measurements. Off = built-in rules.`, `يرسل فقط السؤال الحالي وإجابتك المكتوبة (مع إزالة البريد والأرقام) إلى ${new URL(llm.endpoint, location.href).host}. لا اسم ولا سجل قراءة ولا قياسات. متوقف = القواعد المدمجة.`)) : `<div class="cctl__row is-off"><span><b>${T('External AI model', 'نموذج ذكاء اصطناعي خارجي')}</b><small>${T('Not configured on this site, so Noor runs on built-in rules and its replies are simulated. Nothing leaves your device.', 'غير مُعدّ في هذا الموقع، لذا تعمل نور بالقواعد المدمجة وردودها محاكاة. لا يغادر شيء جهازك.')}</small></span></div>`}
      </div>
      <details class="cthr"><summary>${T('Adjust thresholds', 'تعديل العتبات')}</summary>
        <div class="cthr__grid">
          ${num('regression.repeatsSameSection', T('Returns to one section', 'مرات العودة لقسم واحد'), cfg.regression.repeatsSameSection, 2, 10, 1)}
          ${num('regression.windowMs', T('…within (minutes)', '…خلال (دقائق)'), cfg.regression.windowMs / 60e3, 1, 30, 1, 60e3)}
          ${num('zoom.adjustMin', T('Zoom changes', 'تغييرات التكبير'), cfg.zoom.adjustMin, 2, 20, 1)}
          ${num('format.min', T('Format changes', 'تغييرات التنسيق'), cfg.format.min, 2, 20, 1)}
          ${num('pan.min', T('Sideways pans', 'التحريك الجانبي'), cfg.pan.min, 2, 30, 1)}
          ${num('baseline.k', T('Above usual by (× spread)', 'أعلى من المعتاد بمقدار (× التشتت)'), cfg.baseline.k, 0.5, 4, 0.1)}
        </div>
        <div class="ccard__btns"><button type="button" class="btn btn--xs btn--accent" data-a="thrSave">${T('Save', 'حفظ')}</button><button type="button" class="btn btn--xs btn--quiet" data-a="thrReset">${T('Reset to defaults', 'استعادة الافتراضي')}</button></div>
      </details>
      <h4 class="cmp-h">${T('Your data', 'بياناتك')}</h4>
      <p class="muted cmp-small">${T(`Stored on this device only: summary numbers from ${nBase} past session${nBase === 1 ? '' : 's'} (no raw events), ${store.summaries().length} kept summar${store.summaries().length === 1 ? 'y' : 'ies'}, your consent choices.`, `مخزّن على هذا الجهاز فقط: أرقام موجزة من ${nBase} جلسات سابقة (بلا أحداث خام)، ${store.summaries().length} ملخصات محفوظة، وخيارات موافقتك.`)}</p>
      <div class="ccard__btns">
        <button type="button" class="btn btn--xs btn--ghost" data-a="delSession">${ICON('trash')} ${T('Delete this session', 'حذف هذه الجلسة')}</button>
        <button type="button" class="btn btn--xs btn--ghost" data-a="delAll">${ICON('trash')} ${T('Delete everything Noor stored', 'حذف كل ما خزّنته نور')}</button>
      </div>`;
  }
  const toggle = (id, label, on, hint, disabled) => `<label class="switch-row cctl__row ${disabled ? 'is-off' : ''}"><span><b>${label}</b><small>${hint}</small></span><input type="checkbox" data-t="${id}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}><i></i></label>`;
  const num = (path, label, v, min, max, step, scale) => `<label class="cthr__f"><span>${label}</span><input type="number" data-p="${path}" data-scale="${scale || 1}" min="${min}" max="${max}" step="${step}" value="${+v.toFixed(2)}"></label>`;

  function bindSignals() {
    const pane = $('#cmpP-signals');
    pane.addEventListener('change', e => {
      const t = e.target.dataset.t; if (!t) return;
      const v = e.target.checked;
      if (t === 'mon') { store.setConsent('monitoring', v); if (v) startSession(); else { session = null; hideInvite(); } }
      if (t === 'pause') paused = v;
      if (t === 'inv') store.setPref('invitations', v ? 'on' : 'off');
      if (t === 'mic') { store.setConsent('mic', v); if (!v) voice.abortListening(); }
      if (t === 'llm') { store.setConsent('llm', v); if (ai) { if (v) ai.useCloud(); else if (ai.state().tier === 'cloud') ai.useLocal(); } refreshMode(); }
      renderSignals();
    });
    pane.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const k = a.dataset.a;
      if (k === 'thrSave') {
        const over = JSON.parse(JSON.stringify(store.thresholds() || {}));
        $$('[data-p]', pane).forEach(i => { const [g, f] = i.dataset.p.split('.'); const v = +i.value * +i.dataset.scale; if (isFinite(v) && v > 0) { over[g] = over[g] || {}; over[g][f] = v; } });
        store.setThresholds(over); cfg = S.config(over);
        ERLY.toast && ERLY.toast(T('Thresholds saved on this device', 'حُفظت العتبات على هذا الجهاز'));
        renderSignals();
      }
      if (k === 'thrReset') { store.setThresholds({}); cfg = S.config({}); renderSignals(); }
      if (k === 'delSession') deleteSession();
      if (k === 'delAll') {
        if (!confirm(T('Delete everything Noor stored on this device — your usual-pattern baseline, kept summaries, Reading Lab choices and consent answers?', 'حذف كل ما خزّنته نور على هذا الجهاز — خط الأساس، والملخصات المحفوظة، واختيارات مختبر القراءة، وإجابات الموافقة؟'))) return;
        deleteAll();
      }
    });
  }
  function deleteSession() {
    voice.stop(); voice.abortListening();
    session = store.consent('monitoring') && R.isOpen() ? S.createSession(Date.now()) : null;
    conv = null; draft = null; helpLog.length = 0; lab.ratings = {};
    $('#cmpLog').innerHTML = '';
    renderConvBar(); hideInvite();
    ERLY.toast && ERLY.toast(T('This session’s data is deleted', 'حُذفت بيانات هذه الجلسة'));
    setTab(tab);
  }
  function deleteAll() {
    store.deleteAll();
    if (ERLY.analyser) ERLY.analyser.deleteAll();
    cfg = S.config({});
    session = null; paused = false; snoozeUntil = 0;
    deleteSession();
    renderShell(); bindPanes(); setTab('chat');
    greet();
  }

  /* ---------------- Reading Lab ---------------- */
  // Sample passages written for ERLY and released under CC0 (public domain).
  const PASSAGE = {
    en: { title: 'Why cities stay warm at night', text: 'On a summer evening, the air above a city often stays several degrees warmer than the countryside around it. Roads, roofs and walls soak up sunlight during the day. After sunset they slowly release that stored heat back into the air. Trees and parks work the other way: leaves shade the ground, and water evaporating from them cools the air nearby. This is why planners now add green roofs, lighter road surfaces and more street trees. Small changes, repeated across many streets, can make a hot night noticeably cooler.' },
    ar: { title: 'لماذا تبقى المدن دافئة ليلاً', text: 'في أمسيات الصيف، يبقى الهواء فوق المدينة غالباً أدفأ بعدة درجات من الريف المحيط بها. فالطرق والأسطح والجدران تمتص ضوء الشمس خلال النهار. وبعد الغروب تطلق تلك الحرارة المخزّنة ببطء إلى الهواء. أما الأشجار والحدائق فتعمل بالعكس: فالأوراق تظلل الأرض، والماء المتبخر منها يبرّد الهواء القريب. لهذا يضيف المخططون اليوم أسطحاً خضراء وطرقاً أفتح لوناً ومزيداً من أشجار الشوارع. فالتغييرات الصغيرة، حين تتكرر في شوارع كثيرة، قد تجعل الليلة الحارة أبرد بشكل ملحوظ.' }
  };
  const VARIANTS = [
    ['default', 'Default', 'الافتراضي'], ['spacing', 'Extra spacing', 'تباعد إضافي'], ['font', 'Reading font', 'خط القراءة'],
    ['bigger', 'Bigger text', 'نص أكبر'], ['highlight', 'Line highlight', 'إبراز السطر'], ['tint', 'Softer colour', 'لون ألطف'], ['listen', 'Listen along', 'استمع أثناء القراءة']
  ];
  function renderLab() {
    const pane = $('#cmpP-lab');
    const P = PASSAGE[lab.lang];
    const rated = Object.keys(lab.ratings);
    const sentences = P.text.match(/[^.!?؟]+[.!?؟]*/g);
    pane.innerHTML = `
      <p class="cmp-lead">${T('Try each setting on a short sample, then say whether it felt easier, the same or harder than the default. These are your preferences — not a test, and nothing is scored.', 'جرّب كل إعداد على نص قصير، ثم قل إن كان أسهل أو مماثلاً أو أصعب من الافتراضي. هذه تفضيلاتك — ليست اختباراً، ولا يُقيَّم شيء.')}</p>
      <div class="clab__langs" role="group" aria-label="${T('Sample language', 'لغة النص')}"><button type="button" data-ll="en" aria-pressed="${lab.lang === 'en'}">English</button><button type="button" data-ll="ar" aria-pressed="${lab.lang === 'ar'}">العربية</button></div>
      <div class="clab__vars" role="group" aria-label="${T('Settings to try', 'إعدادات للتجربة')}">${VARIANTS.map(([k, en, ar]) => `<button type="button" data-v="${k}" aria-pressed="${lab.variant === k}">${pick(en, ar)}${lab.ratings[k] ? `<i class="clab__r clab__r--${lab.ratings[k]}" aria-label="${lab.ratings[k]}"></i>` : ''}</button>`).join('')}</div>
      <article class="clab__text v-${lab.variant}" lang="${lab.lang}" dir="${lab.lang === 'ar' ? 'rtl' : 'ltr'}" tabindex="0" aria-label="${T('Sample passage', 'نص تجريبي')}"><h5>${P.title}</h5><p>${sentences.map((s, i) => `<span data-s="${i}">${esc(s.trim())}</span>`).join(' ')}</p></article>
      ${lab.variant !== 'default' ? `<div class="clab__rate"><span>${T('Compared with the default, this felt…', 'مقارنة بالافتراضي، بدا هذا…')}</span><div role="group">${[['easier', 'Easier', 'أسهل'], ['same', 'About the same', 'مماثلاً'], ['harder', 'Harder', 'أصعب']].map(([k, en, ar]) => `<button type="button" data-r="${k}" aria-pressed="${lab.ratings[lab.variant] === k}">${pick(en, ar)}</button>`).join('')}</div></div>` : `<p class="muted cmp-small">${T('Pick a setting above to compare it with this default.', 'اختر إعداداً أعلاه لمقارنته بهذا الافتراضي.')}</p>`}
      ${rated.length ? `<div class="clab__res"><b>${T('Your preferences so far', 'تفضيلاتك حتى الآن')}</b><ul>${rated.map(k => { const v = VARIANTS.find(x => x[0] === k); return `<li><span>${pick(v[1], v[2])}</span><em class="clab__r--${lab.ratings[k]}">${pick(...{ easier: ['easier', 'أسهل'], same: ['about the same', 'مماثل'], harder: ['harder', 'أصعب'] }[lab.ratings[k]])}</em></li>`; }).join('')}</ul>
        <div class="ccard__btns"><button type="button" class="btn btn--xs btn--accent" data-la="use">${T('Use the easier ones in my reader', 'استخدم الأسهل في القارئ')}</button><button type="button" class="btn btn--xs btn--ghost" data-la="keep">${T('Keep on this device', 'احفظ على هذا الجهاز')}</button><button type="button" class="btn btn--xs btn--quiet" data-la="clear">${T('Clear', 'مسح')}</button></div>
        <p class="muted cmp-small">${T('Preferences only — they don’t say anything about why reading feels the way it does.', 'تفضيلات فقط — ولا تقول شيئاً عن سبب شعورك بالقراءة بهذه الطريقة.')}</p></div>` : ''}
      ${store.lab() ? `<p class="muted cmp-small">${T('Saved preferences from earlier are on this device.', 'التفضيلات المحفوظة سابقاً موجودة على هذا الجهاز.')}</p>` : ''}`;
  }
  function bindLab() {
    const pane = $('#cmpP-lab');
    pane.addEventListener('click', e => {
      const ll = e.target.closest('[data-ll]'), v = e.target.closest('[data-v]'), r = e.target.closest('[data-r]'), a = e.target.closest('[data-la]');
      if (ll) { lab.lang = ll.dataset.ll; voice.stop(); renderLab(); }
      if (v) {
        lab.variant = v.dataset.v; voice.stop(); renderLab();
        if (lab.variant === 'listen') {
          const spans = $$('.clab__text [data-s]', pane);
          if (!voice.supported.tts) bubble('ai', T('Read-aloud isn’t supported in this browser.', 'القراءة الصوتية غير مدعومة في هذا المتصفح.'), { text: true, cls: 'cmsg--note' });
          else voice.speak(PASSAGE[lab.lang].text, { lang: lab.lang, onstart: i => spans.forEach((s, j) => s.classList.toggle('is-on', j === i)), onend: () => spans.forEach(s => s.classList.remove('is-on')) });
        }
        const btn = pane.querySelector(`[data-v="${lab.variant}"]`); btn && btn.focus();
      }
      if (r) { lab.ratings[lab.variant] = r.dataset.r; renderLab(); const b = pane.querySelector(`[data-r="${r.dataset.r}"]`); b && b.focus(); announce(T('Saved', 'تم الحفظ')); }
      if (a) {
        if (a.dataset.la === 'use') {
          const p = {};
          if (lab.ratings.spacing === 'easier') Object.assign(p, { lh: 2.1, ls: 0.04, ws: 0.15 });
          if (lab.ratings.font === 'easier') p.font = 'lexend';
          if (lab.ratings.bigger === 'easier') p.size = 23;
          if (lab.ratings.highlight === 'easier') p.focus = true;
          if (lab.ratings.tint === 'easier') p.tint = 'cream';
          if (!Object.keys(p).length) return ERLY.toast && ERLY.toast(T('Nothing was rated easier yet', 'لم يُقيَّم شيء بأنه أسهل بعد'));
          R.applyPrefs(p);
          ERLY.toast && ERLY.toast(T('Applied to your reader', 'طُبّق على القارئ'));
        }
        if (a.dataset.la === 'keep') { store.setLab({ ratings: Object.assign({}, lab.ratings), lang: lab.lang, at: new Date().toISOString() }); ERLY.toast && ERLY.toast(T('Kept on this device only', 'حُفظ على هذا الجهاز فقط')); renderLab(); }
        if (a.dataset.la === 'clear') { lab.ratings = {}; store.setLab(null); renderLab(); }
      }
    });
    // line highlight follows the pointer or the keyboard
    pane.addEventListener('pointerover', e => { const s = e.target.closest('.v-highlight [data-s]'); if (s) { $$('.clab__text [data-s]', pane).forEach(x => x.classList.toggle('is-on', x === s)); } });
    pane.addEventListener('keydown', e => {
      const box = e.target.closest('.v-highlight'); if (!box || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      const ss = $$('[data-s]', box), i = ss.findIndex(x => x.classList.contains('is-on'));
      const n = Math.max(0, Math.min(ss.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
      ss.forEach((x, j) => x.classList.toggle('is-on', j === n));
    });
  }

  /* ---------------- My summary (Layer 6) ---------------- */
  function renderSummary() {
    const pane = $('#cmpP-summary');
    const kept = store.summaries();
    if (!draft) {
      pane.innerHTML = `
        <p class="cmp-lead">${T('A short, plain-language summary of this session that belongs to you. You can edit every line, then copy or download it. Nothing is sent to anyone — sharing is always your decision.', 'ملخص قصير بلغة بسيطة لهذه الجلسة وهو ملكك. يمكنك تعديل كل سطر، ثم نسخه أو تنزيله. لا يُرسل شيء لأحد — المشاركة قرارك دائماً.')}</p>
        <button type="button" class="btn btn--sm btn--accent" data-s="make">${ICON('file')} ${T('Create my summary', 'أنشئ ملخصي')}</button>
        ${kept.length ? `<h4 class="cmp-h">${T('Kept on this device', 'محفوظ على هذا الجهاز')}</h4><ul class="ckept">${kept.map(k => `<li><span>${new Date(k.created).toLocaleString()}</span><button type="button" class="btn btn--xs btn--ghost" data-open="${k.id}">${T('Open', 'فتح')}</button><button type="button" class="btn btn--xs btn--quiet" data-del="${k.id}" aria-label="${T('Delete summary', 'حذف الملخص')}">${ICON('trash')}</button></li>`).join('')}</ul>` : ''}`;
      return;
    }
    pane.innerHTML = `
      <p class="cmp-lead">${T('Edit anything below — one point per line. This is not a diagnosis.', 'عدّل أي شيء أدناه — نقطة في كل سطر. هذا ليس تشخيصاً.')}</p>
      <div class="csum">${SUM.SECTIONS.map(([k, en, ar]) => `<label class="csum__s"><span>${pick(en, ar)}</span><textarea data-k="${k}" rows="${Math.max(2, Math.min(7, (draft.sections[k] || []).length + 1))}" ${k === 'limitations' ? 'aria-describedby="cmpLimNote"' : ''}>${esc((draft.sections[k] || []).join('\n'))}</textarea></label>`).join('')}</div>
      <p class="muted cmp-small" id="cmpLimNote">${T('ERLY identifies friction and supports students. It never diagnoses disability.', 'إيرلي يحدد الاحتكاك ويدعم الطلبة. لا يشخّص أي إعاقة أبداً.')}</p>
      <div class="ccard__btns">
        <button type="button" class="btn btn--xs btn--accent" data-s="copy">${T('Copy', 'نسخ')}</button>
        <button type="button" class="btn btn--xs btn--ghost" data-s="download">${T('Download (.txt)', 'تنزيل (.txt)')}</button>
        <button type="button" class="btn btn--xs btn--ghost" data-s="keep">${T('Keep on this device', 'احفظ على هذا الجهاز')}</button>
        <button type="button" class="btn btn--xs btn--quiet" data-s="discard">${ICON('trash')} ${T('Delete', 'حذف')}</button>
      </div>
      <details class="cshare"><summary>${T('Share with Student Accessibility Services (optional)', 'المشاركة مع خدمات الطلبة (اختياري)')}</summary>
        <p class="muted cmp-small">${T('Only if you want to. This opens an email draft in your own mail app with the summary as you edited it — you can change it or not send it at all. ERLY never contacts SAS, teachers or family for you.', 'فقط إن أردت. يفتح هذا مسودة بريد في تطبيق البريد لديك تتضمن الملخص كما عدّلته — يمكنك تغييره أو عدم إرساله أبداً. لا يتواصل إيرلي مع خدمات الطلبة أو المعلمين أو العائلة نيابة عنك.')}</p>
        <button type="button" class="btn btn--xs btn--ghost" data-s="email">${T('Open an email draft', 'افتح مسودة بريد')}</button>
      </details>`;
  }
  function readDraft() {
    $$('#cmpP-summary textarea').forEach(t => { draft.sections[t.dataset.k] = t.value.split('\n').map(x => x.trim()).filter(Boolean); });
    return draft;
  }
  function bindSummary() {
    const pane = $('#cmpP-summary');
    pane.addEventListener('input', e => { if (e.target.matches('textarea')) readDraft(); });
    pane.addEventListener('click', async e => {
      const b = e.target.closest('[data-s],[data-open],[data-del]'); if (!b) return;
      if (b.dataset.open) { draft = JSON.parse(JSON.stringify(store.summaries().find(x => x.id === b.dataset.open))); return renderSummary(); }
      if (b.dataset.del) { store.deleteSummary(b.dataset.del); return renderSummary(); }
      const k = b.dataset.s;
      if (k === 'make') {
        const entries = (conv ? conv.entries : []).concat(brain() ? brain().entries() : [], helpLog.map(h => ({ type: 'tried', en: `Tried: ${h.tool} — ${h.helped === 1 ? 'you said it helped' : h.helped === 0.5 ? 'you said it helped a bit' : 'you said it didn’t help'}`, ar: `جرّبت: ${h.tool} — ${h.helped === 1 ? 'قلت إنه ساعد' : h.helped === 0.5 ? 'قلت إنه ساعد قليلاً' : 'قلت إنه لم يساعد'}` })));
        draft = SUM.build({ entries, signals: signals() || [], lab: Object.keys(lab.ratings).length ? lab : store.lab(), lang: lang() });
        renderSummary();
        const f = pane.querySelector('textarea'); f && f.focus();
        return;
      }
      readDraft();
      const text = SUM.toText(draft);
      if (k === 'copy') { try { await navigator.clipboard.writeText(text); ERLY.toast && ERLY.toast(T('Copied', 'تم النسخ')); } catch (err) { ERLY.toast && ERLY.toast(T('Couldn’t copy — try Download instead', 'تعذّر النسخ — جرّب التنزيل')); } }
      if (k === 'download') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); a.download = 'ERLY_reading_summary.txt'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
      if (k === 'keep') { store.keepSummary(JSON.parse(JSON.stringify(draft))); ERLY.toast && ERLY.toast(T('Kept on this device only', 'حُفظ على هذا الجهاز فقط')); }
      if (k === 'discard') { if (draft && store.summaries().some(x => x.id === draft.id)) store.deleteSummary(draft.id); draft = null; renderSummary(); }
      if (k === 'email') location.href = `mailto:?subject=${encodeURIComponent(T('Reading summary from ERLY', 'ملخص القراءة من إيرلي'))}&body=${encodeURIComponent(text)}`;
    });
  }

  function bindPanes() { bindSignals(); bindLab(); bindSummary(); }
  renderShell(); bindPanes();
  ERLY.on && ERLY.on('companion:help', ctx => { openPanel('chat'); greeting.then(() => helpMenu(ctx || {})); });
  I18N.onChange(() => {
    const log = $('#cmpLog'), kept = Array.from(log.childNodes);
    renderShell(); bindPanes();
    kept.forEach(n => $('#cmpLog').appendChild(n));
    if (!panel.hidden) { panel.classList.add('is-in'); setTab(tab); }
  });
  ERLY.companion = {
    open: openPanel, close: closePanel, isOpen: () => !panel.hidden, store, state: () => ({ session, conv, paused, status, consent: store.get().consent }),
    inCall: false, brain: null,
    submitText: t => submit(t),
    ai,
    // ask Noor something from elsewhere (the Reading Studio's selection tools, study tab…)
    ask(text, o) {
      o = o || {};
      openPanel('chat');
      if (o.context) attach(o.context);
      greeting.then(() => setTimeout(() => { if (generating) stopGenerating(); clearChips(); submit(text); }, 120));
    },
    attached: () => attached, attach,
    _nudge: kind => showNudge(kind),
    _nudgeReset: () => { nud.lastAny = 0; nud.last = {}; nud.muted.clear(); ['zoom', 'pinch', 'scroll', 'pscroll'].forEach(k => { nud[k].length = 0; }); hideNudge(); },
    // internals shared with noor-brain.js and call.js (same feature, split for size)
    _ui: { aiSays, bubble, chipRow, clearChips, openPanel, setTab, speak, voice, llm, store, notice, hideInvite, startConversation, setStatus, renderConvBar, lang, pick, esc, T, $: s => $(s), isBusy: () => busy, setBusy: v => { busy = v; }, convActive: () => !!(conv && !conv.done), ai, setGenerating, isGenerating: () => !!generating, attached: () => attached, attach, openBrain, scrollLog, composer, idleChips, runTool, helpMenu }
  };
})();
