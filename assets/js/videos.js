/* ERLY — lecture videos inside the site, with consented playback tracking.

   Videos play in a calm "video room" (YouTube's privacy-enhanced player).
   With the student's consent, ERLY reads only playback metadata — where they
   rewind to, playback speed, restarts and whether the notes were opened —
   never the camera, microphone or anything typed. Repeatedly going back to
   the same part (3+ times within 10 minutes) makes Noor gently ask whether
   that part is hard to follow. One rewind never does.

   Seeks made with YouTube's own controls are detected too, by watching the
   playback position. Summaries go to the analyser; raw events stay in memory. */
(function () {
  'use strict';
  const E = window.ERLY_EVIDENCE;
  const grid = document.getElementById('videos-app');
  if (!grid || !E) return;
  const T = (en, ar) => I18N.t(en, ar);
  const P = (en, ar) => (I18N.lang === 'ar' ? ar : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const track = (id, v, m) => ERLY.track && ERLY.track(id, v, m);

  const LESSONS = [
    { id: 'Xb05CaG7TsQ', title: ['First law of thermodynamics & internal energy', 'القانون الأول للديناميكا الحرارية والطاقة الداخلية'], by: 'Khan Academy', course: ['MECH 210 · Week 4', 'MECH 210 · الأسبوع ٤'], mins: 18,
      notes: [['Energy is conserved: it can change form, but it isn’t created or destroyed.', 'الطاقة محفوظة: يمكن أن يتغير شكلها، لكنها لا تُستحدث ولا تفنى.'], ['Internal energy (U) is the total energy stored in a system’s particles.', 'الطاقة الداخلية (U) هي مجموع الطاقة المخزنة في جسيمات النظام.'], ['ΔU = Q − W: change in internal energy = heat added to the system − work done by the system. (Some books write + W for work done ON the system — same idea, different sign convention.)', 'ΔU = Q − W: التغير في الطاقة الداخلية = الحرارة المضافة للنظام − الشغل الذي يبذله النظام. (بعض الكتب تكتب + W للشغل المبذول على النظام — الفكرة نفسها باصطلاح إشارة مختلف.)'], ['Heat and work are ways energy crosses the boundary — they are not “stored” in the system.', 'الحرارة والشغل طريقتان لعبور الطاقة حدود النظام — وليستا «مخزنتين» فيه.']] },
    { id: 'E7CwqNHn_Ns', title: ['Taking notes that actually help', 'تدوين ملاحظات مفيدة فعلاً'], by: 'CrashCourse · Study Skills', course: ['Study skills', 'مهارات الدراسة'], mins: 10,
      notes: [['Write notes in your own words — copying word for word doesn’t help memory much.', 'اكتب الملاحظات بكلماتك — النسخ الحرفي لا يفيد الذاكرة كثيراً.'], ['Try methods like Cornell notes or mind maps, and review notes within 24 hours.', 'جرّب أساليب مثل ملاحظات كورنيل أو الخرائط الذهنية، وراجع ملاحظاتك خلال ٢٤ ساعة.'], ['Handwriting can help understanding; typing is fine if you summarise rather than transcribe.', 'الكتابة باليد قد تساعد على الفهم؛ والطباعة جيدة إن لخّصت بدل أن تنسخ.']] },
    { id: 'arj7oStGLkU', title: ['Inside the mind of a master procrastinator', 'داخل عقل المماطل المحترف'], by: 'TED · Tim Urban', course: ['Wellbeing & focus', 'الرفاه والتركيز'], mins: 14,
      notes: [['Procrastination often comes from the brain choosing what’s easy and fun now over what matters later.', 'التسويف غالباً ينبع من اختيار الدماغ للسهل والممتع الآن على حساب المهم لاحقاً.'], ['Deadlines create urgency — but long-term goals without deadlines are where procrastination does the most damage.', 'المواعيد النهائية تخلق إلحاحاً — لكن الأهداف طويلة المدى بلا مواعيد هي حيث يضر التسويف أكثر.'], ['Tiny first steps and visible deadlines help — try ERLY’s Start-Ramp.', 'الخطوات الأولى الصغيرة والمواعيد الواضحة تساعد — جرّب منحدر البداية في إيرلي.']] },
    { id: 'qEoP-857sKc', title: ['Immersive Reader in Word', 'القارئ الشامل في وورد'], by: 'Microsoft Helps', course: ['Reading tools', 'أدوات القراءة'], mins: 2,
      notes: [['Line focus, text spacing, column width and page colour make dense text easier to follow.', 'تركيز السطر وتباعد النص وعرض العمود ولون الصفحة تجعل النص الكثيف أسهل للمتابعة.'], ['Read Aloud highlights each word as it is spoken.', 'القراءة بصوت عالٍ تبرز كل كلمة أثناء نطقها.'], ['ERLY’s Reading Studio offers the same kinds of tools for course readings.', 'يوفر استوديو القراءة في إيرلي أدوات مشابهة لقراءات المقررات.']] }
  ];

  /* ---------------- grid ---------------- */
  function renderGrid() {
    grid.innerHTML = LESSONS.map((v, i) => `<button class="vid-card" data-vid="${v.id}" style="--i:${i}">
      <span class="vid-card__th"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy" onerror="this.style.display='none'"><span class="vid-card__play">${ICON('volume')}</span>${v.mins ? `<span class="vid-card__len mono">~${v.mins} min</span>` : ''}</span>
      <span class="vid-card__b"><small class="mono">${esc(P(...v.course))}</small><b>${esc(P(...v.title))}</b><span>${esc(v.by)}</span></span>
    </button>`).join('');
  }
  grid.addEventListener('click', e => { const b = e.target.closest('[data-vid]'); if (b) open(b.dataset.vid, b); });

  /* ---------------- the video room ---------------- */
  const room = document.createElement('div');
  room.className = 'vroom'; room.id = 'vroom'; room.hidden = true;
  room.setAttribute('role', 'dialog'); room.setAttribute('aria-modal', 'true');
  document.body.appendChild(room);
  let player = null, cur = null, poll = null, apiP = null;
  const S = { events: [], last: null, notifiedSegs: new Set(), episodes: 0, slowdowns: 0, restarts: 0, transcript: 0, t0: 0 };

  function loadAPI() {
    if (apiP) return apiP;
    apiP = new Promise((res, rej) => {
      if (window.YT && YT.Player) return res();
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
      s.onerror = () => { apiP = null; rej(new Error('yt-api')); };
      document.head.appendChild(s);
      setTimeout(() => rej(new Error('yt-timeout')), 12000);
    });
    return apiP;
  }
  const consented = () => !!(ERLY.analyser && ERLY.analyser.consented());

  function open(id, from) {
    cur = LESSONS.find(v => v.id === id); if (!cur) return;
    Object.assign(S, { events: [], last: null, notifiedSegs: new Set(), episodes: 0, slowdowns: 0, restarts: 0, transcript: 0, t0: Date.now() });
    const prev = ERLY.analyser && ERLY.analyser.data().videos[id];
    if (prev) Object.assign(S, { episodes: prev.episodes || 0, slowdowns: prev.slowdowns || 0, restarts: prev.restarts || 0, transcript: prev.transcript || 0 });
    room.innerHTML = `
      <header class="vroom__top">
        <button class="icon-btn" data-vclose aria-label="${T('Close video', 'إغلاق الفيديو')}">${ICON('x')}</button>
        <div class="vroom__t"><small class="mono">${esc(P(...cur.course))} · ${esc(cur.by)}</small><b>${esc(P(...cur.title))}</b></div>
        <span class="vroom__noor ${consented() ? 'is-on' : ''}" id="vNoor">${consented() ? `<i></i>${T('Noor notices tricky parts', 'نور تلاحظ الأجزاء الصعبة')}` : `<button type="button" class="btn btn--xs btn--ghost" data-vconsent>${T('Let Noor notice tricky parts', 'اسمح لنور بملاحظة الأجزاء الصعبة')}</button>`}</span>
      </header>
      <div class="vroom__body">
        <div class="vroom__stage"><div class="vroom__frame"><div id="vPlayer"></div><div class="vroom__load">${T('Loading video…', 'جارٍ تحميل الفيديو…')}</div></div>
          <div class="vroom__ctl">
            <button class="btn btn--sm btn--ghost" data-vback>↺ 10s</button>
            <label class="vroom__rate">${T('Speed', 'السرعة')} <select id="vRate">${[0.5, 0.75, 0.85, 1, 1.25, 1.5].map(r => `<option value="${r}" ${r === 1 ? 'selected' : ''}>${r}×</option>`).join('')}</select></label>
            <button class="btn btn--sm btn--ghost" data-vnotes aria-pressed="false">${ICON('file')} ${T('Key points', 'النقاط الأساسية')}</button>
            <button class="btn btn--sm btn--quiet" data-vask>${ICON('chat')} ${T('Ask Noor', 'اسأل نور')}</button>
          </div></div>
        <aside class="vroom__notes" id="vNotes" hidden><p class="mono">${T('Key points', 'النقاط الأساسية')}</p><ol>${cur.notes.map(n => `<li>${esc(P(...n))}</li>`).join('')}</ol><small class="muted">${T('Written by ERLY to go with this video.', 'كتبها إيرلي لترافق هذا الفيديو.')}</small></aside>
      </div>`;
    const r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    room.style.setProperty('--ox', (r.left + r.width / 2) + 'px'); room.style.setProperty('--oy', (r.top + r.height / 2) + 'px');
    room.hidden = false; document.documentElement.classList.add('studio-open');
    requestAnimationFrame(() => requestAnimationFrame(() => room.classList.add('is-open')));
    bindRoom();
    loadAPI().then(() => {
      if (room.hidden) return;
      player = new YT.Player('vPlayer', {
        host: 'https://www.youtube-nocookie.com', videoId: id,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, origin: location.origin },
        events: {
          onReady: () => { const l = room.querySelector('.vroom__load'); l && l.remove(); startPoll(); },
          onPlaybackRateChange: e => onRate(e.data),
          onStateChange: e => { if (e.data === 1) mark({ type: 'play' }); if (e.data === 2) mark({ type: 'pause' }); if (e.data === 0) mark({ type: 'end' }); },
          onError: () => { const l = room.querySelector('.vroom__load'); if (l) l.textContent = T('This video isn’t available right now. Try another one.', 'هذا الفيديو غير متاح الآن. جرّب فيديو آخر.'); }
        }
      });
    }).catch(() => { const l = room.querySelector('.vroom__load'); if (l) l.textContent = T('Videos need an internet connection to YouTube.', 'تحتاج الفيديوهات إلى اتصال بالإنترنت ويوتيوب.'); });
  }
  function close() {
    stopPoll();
    try { player && player.destroy(); } catch (e) { /* ignore */ }
    player = null;
    flush();
    room.classList.remove('is-open'); document.documentElement.classList.remove('studio-open');
    setTimeout(() => { if (!room.classList.contains('is-open')) { room.hidden = true; room.innerHTML = ''; } }, reduce ? 0 : 520);
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && !room.hidden && !(ERLY.companion && ERLY.companion.isOpen())) close(); });
  function bindRoom() {
    room.querySelector('[data-vclose]').onclick = close;
    room.querySelector('[data-vback]').onclick = () => { if (!player || !player.getCurrentTime) return; player.seekTo(Math.max(0, player.getCurrentTime() - 10), true); };
    room.querySelector('#vRate').onchange = e => { player && player.setPlaybackRate && player.setPlaybackRate(+e.target.value); };
    room.querySelector('[data-vnotes]').onclick = () => toggleNotes();
    room.querySelector('[data-vask]').onclick = () => { ERLY.companion && ERLY.companion.open('chat'); };
    const c = room.querySelector('[data-vconsent]');
    if (c) c.onclick = () => {
      if (!confirm(T('Let Noor notice when a part of a video seems hard to follow? ERLY only reads playback info (rewinds, speed, restarts, notes) — never your camera, microphone or typing. It stays on this device and you can turn it off in Noor → Reading signals.', 'السماح لنور بملاحظة الأجزاء التي يبدو صعب متابعتها في الفيديو؟ يقرأ إيرلي معلومات التشغيل فقط (الإعادة والسرعة وإعادة البدء والملاحظات) — وليس الكاميرا أو الميكروفون أو ما تكتبه. تبقى على هذا الجهاز ويمكنك إيقافها من نور ← إشارات القراءة.'))) return;
      ERLY.companion && ERLY.companion.store.setConsent('monitoring', true);
      const n = room.querySelector('#vNoor'); n.classList.add('is-on'); n.innerHTML = `<i></i>${T('Noor notices tricky parts', 'نور تلاحظ الأجزاء الصعبة')}`;
    };
  }
  function toggleNotes(force) {
    const n = room.querySelector('#vNotes'), b = room.querySelector('[data-vnotes]'); if (!n) return;
    const on = force != null ? force : n.hidden;
    if (on === !n.hidden) return;
    n.hidden = !on; b.setAttribute('aria-pressed', on); room.classList.toggle('has-notes', on);
    if (on) { S.transcript++; mark({ type: 'transcript' }); track('U05'); }
  }

  /* ---------------- tracking ---------------- */
  function mark(ev) { ev.t = Date.now(); S.events.push(ev); if (S.events.length > 400) S.events.shift(); }
  function onRate(rate) {
    mark({ type: 'rate', rate }); track('U03');
    if (rate < 1 && !S.auto) S.slowdowns++; // Noor's own slow-down doesn't count as the student's
    S.auto = false;
    const sel = room.querySelector('#vRate'); if (sel) sel.value = String(rate);
    evaluate();
  }
  function startPoll() {
    stopPoll();
    let lastT = null, lastWall = performance.now();
    poll = setInterval(() => {
      if (!player || !player.getCurrentTime) return;
      const t = player.getCurrentTime(), now = performance.now(), state = player.getPlayerState ? player.getPlayerState() : -1;
      const rate = player.getPlaybackRate ? player.getPlaybackRate() : 1;
      if (lastT != null) {
        const expected = state === 1 ? (now - lastWall) / 1000 * rate : 0;
        const jump = t - lastT - expected;
        if (Math.abs(jump) > 2.2) {
          mark({ type: 'seek', from: lastT + expected, to: t });
          if (jump < 0) {
            if (-jump <= 6) track('U01');
            if (t < 2 && lastT > 10) { S.restarts++; mark({ type: 'restart' }); track('U08'); }
          }
          evaluate();
        }
      }
      lastT = t; lastWall = now;
    }, 400);
  }
  function stopPoll() { clearInterval(poll); poll = null; }
  function evaluate() {
    if (!consented()) return;
    const f = E.videoFriction(S.events);
    const fresh = f.repeatedSegments.filter(s => !S.notifiedSegs.has(s));
    if (fresh.length) {
      fresh.forEach(s => S.notifiedSegs.add(s));
      S.episodes++; track('U02');
      flush();
      ERLY.emit && ERLY.emit('companion:video', { id: cur.id, title: cur.title, range: [fresh[0] * E.VIDEO_CFG.segmentSec, (fresh[0] + 1) * E.VIDEO_CFG.segmentSec] });
    }
  }
  function flush() { if (cur && ERLY.analyser) ERLY.analyser.noteVideo(cur.id, { episodes: S.episodes, slowdowns: S.slowdowns, restarts: S.restarts, transcript: S.transcript }); }

  renderGrid();
  I18N.onChange(renderGrid);
  // used by Noor's video check-in
  ERLY.videos = {
    open, close, lessons: LESSONS,
    setRate: r => { if (player && player.setPlaybackRate) { S.auto = true; player.setPlaybackRate(r); } },
    seek: s => { if (player && player.seekTo) player.seekTo(s, true); },
    showNotes: () => toggleNotes(true),
    _simulate: ev => { mark(ev); evaluate(); } // for automated checks without YouTube
  };
})();
