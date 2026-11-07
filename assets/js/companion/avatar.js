/* ERLY — Noor's virtual companions (avatars).

   Original, illustrated virtual people drawn as SVG (no photos, no real
   person's likeness), clearly labelled as AI companions. Each one breathes,
   blinks, moves its eyes and head a little, changes expression with the
   conversation (listening, thinking, speaking) and moves its lips to the
   words being spoken (see lipsync.js).

   API:  ERLY.avatars = { list, get(id), mount(el, id, opts) -> ctrl }
         ctrl.setState('idle'|'listening'|'thinking'|'speaking'|'paused')
         ctrl.attach(voice)   // follow voice.onPhrase for lip-sync
         ctrl.level(x)        // the student's mic level, 0..1 (for nodding)
         ctrl.destroy() */
(function () {
  'use strict';
  const LS = window.ERLY_LIPSYNC;
  if (!LS) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let uidN = 0;

  // skin, lip, hair, eye, cloth, accent
  const LIST = [
    { id: 'noor', name: 'Noor', g: 'f', hair: 'hijab', skin: '#D9A585', skinD: '#B97F5F', lip: '#B5605A', hairC: '#6E5A8C', hairC2: '#594873', eye: '#4A3020', cloth: '#E8E1D6', cloth2: '#C9BFB0', brow: '#3B2618',
      en: ['Warm & encouraging', 'Patient, kind and calm. Great for check-ins.'], ar: ['دافئة ومشجّعة', 'صبورة ولطيفة وهادئة. رائعة لجلسات الاطمئنان.'] },
    { id: 'omar', name: 'Omar', g: 'm', hair: 'short', beard: true, skin: '#C98E6A', skinD: '#A2694A', lip: '#9C5446', hairC: '#1F1712', hairC2: '#140E0A', eye: '#3A2416', cloth: '#2F4A6B', cloth2: '#22374F', brow: '#1F1712',
      en: ['Calm & professional', 'Clear, steady explanations, step by step.'], ar: ['هادئ ومحترف', 'شرح واضح وثابت خطوة بخطوة.'] },
    { id: 'layla', name: 'Layla', g: 'f', hair: 'bun', glasses: true, skin: '#EBC2A2', skinD: '#C99877', lip: '#C0645E', hairC: '#3A241A', hairC2: '#2A1A12', eye: '#355A3A', cloth: '#C65A3A', cloth2: '#A24429', brow: '#3A241A',
      en: ['Sharp & energetic', 'Quick, upbeat and to the point.'], ar: ['ذكية ونشيطة', 'سريعة ومتحمسة ومباشرة.'] },
    { id: 'adam', name: 'Adam', g: 'm', hair: 'curly', skin: '#8D5A3C', skinD: '#6E4029', lip: '#6E3A2C', hairC: '#1A1210', hairC2: '#0E0907', eye: '#2B1A10', cloth: '#3E7D63', cloth2: '#2E5F4B', brow: '#1A1210',
      en: ['Friendly & relaxed', 'Chatty and easy-going, explains with examples.'], ar: ['ودود ومرتاح', 'يحب الحديث ويشرح بالأمثلة.'] },
    { id: 'sara', name: 'Sara', g: 'f', hair: 'long', skin: '#F1CDB0', skinD: '#D0A383', lip: '#C46B6B', hairC: '#A8693A', hairC2: '#8A532B', eye: '#3C5F86', cloth: '#5B5FC7', cloth2: '#4447A3', brow: '#7A4A26',
      en: ['Clear & educational', 'A tutor who loves making hard things simple.'], ar: ['واضحة وتعليمية', 'معلّمة تحب تبسيط الصعب.'] },
    { id: 'aura', name: 'Aura', g: '', abstract: true,
      en: ['Abstract companion', 'A glowing light that speaks — no face.'], ar: ['رفيق مجرّد', 'ضوء متوهّج يتحدث — بلا وجه.'] }
  ];
  const get = id => LIST.find(a => a.id === id) || LIST[0];

  /* ---------------- drawing ---------------- */
  function hairBack(a, u) {
    const c = `url(#${u}hr)`;
    if (a.hair === 'hijab') return `<path d="M200 62 C306 62 338 150 334 236 C331 312 312 352 346 430 L54 430 C88 352 69 312 66 236 C62 150 94 62 200 62 Z" fill="url(#${u}hj)"/>`;
    if (a.hair === 'long') return `<path d="M200 84 C292 84 316 160 312 236 C309 300 322 350 340 410 L60 410 C78 350 91 300 88 236 C84 160 108 84 200 84 Z" fill="${c}"/>`;
    if (a.hair === 'bun') return `<circle cx="200" cy="86" r="40" fill="${c}"/><path d="M200 96 C272 96 300 146 296 206 L292 232 C280 180 250 150 200 148 C150 150 120 180 108 232 L104 206 C100 146 128 96 200 96 Z" fill="${c}"/>`;
    if (a.hair === 'curly') return '';
    return '';
  }
  function hairFront(a, u) {
    const c = `url(#${u}hr)`;
    if (a.hair === 'hijab') return `<path d="M114 262 C102 168 146 108 200 108 C254 108 298 168 286 262" fill="none" stroke="url(#${u}hj)" stroke-width="20" stroke-linecap="round"/>
      <path d="M128 150 C150 122 178 114 200 114 C222 114 250 122 272 150" fill="none" stroke="${a.hairC2}" stroke-opacity=".35" stroke-width="2"/>
      <path d="M96 300 C120 340 160 352 200 354 C240 352 280 340 304 300 C300 360 260 392 200 396 C140 392 100 360 96 300 Z" fill="url(#${u}hj)"/>
      <path d="M150 372 C180 384 220 384 250 372" fill="none" stroke="${a.hairC2}" stroke-opacity=".3" stroke-width="2"/>`;
    if (a.hair === 'short') return `<path d="M110 196 C104 128 146 96 200 96 C256 96 298 128 290 196 C284 168 270 146 246 138 C220 150 176 150 150 140 C130 150 116 168 110 196 Z" fill="${c}"/>`;
    if (a.hair === 'bun') return `<path d="M108 210 C104 146 146 110 204 112 C254 114 294 150 292 206 C276 170 248 142 210 140 C188 160 150 170 122 172 C114 182 110 196 108 210 Z" fill="${c}"/>`;
    if (a.hair === 'long') return `<path d="M104 236 C96 150 140 104 200 104 C262 104 304 150 296 236 C290 196 278 168 252 150 C232 158 214 156 200 140 C180 160 146 166 122 170 C110 190 106 210 104 236 Z" fill="${c}"/>
      <path d="M104 236 C98 290 110 330 92 380" fill="none" stroke="${a.hairC}" stroke-width="18" stroke-linecap="round"/><path d="M296 236 C302 290 290 330 308 380" fill="none" stroke="${a.hairC}" stroke-width="18" stroke-linecap="round"/>`;
    if (a.hair === 'curly') {
      let s = ''; const pts = [];
      for (let k = 0; k < 15; k++) { const t = Math.PI * (1.02 + k / 14 * 0.96); pts.push([200 + Math.cos(t) * 92, 178 + Math.sin(t) * 82]); }
      [[150, 112], [178, 98], [210, 96], [240, 104], [264, 122], [130, 134], [200, 112], [228, 120], [168, 120]].forEach(p => pts.push(p));
      pts.forEach(([x, y], k) => { s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${17 + (k % 3) * 3}" fill="${k % 2 ? a.hairC : a.hairC2}"/>`; });
      return s;
    }
    return '';
  }
  function svg(a, u) {
    const male = a.g === 'm';
    const jaw = male ? 'C292 262 266 318 200 330 C134 318 108 262 108 206' : 'C288 268 252 318 200 328 C148 318 112 268 112 208';
    return `<svg viewBox="0 0 400 430" class="avt__svg" aria-hidden="true">
      <defs>
        <radialGradient id="${u}sk" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="${a.skin}"/><stop offset=".75" stop-color="${a.skin}"/><stop offset="1" stop-color="${a.skinD}"/></radialGradient>
        <linearGradient id="${u}hr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a.hairC}"/><stop offset="1" stop-color="${a.hairC2}"/></linearGradient>
        <linearGradient id="${u}hj" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a.hairC}"/><stop offset="1" stop-color="${a.hairC2}"/></linearGradient>
        <linearGradient id="${u}cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a.cloth}"/><stop offset="1" stop-color="${a.cloth2}"/></linearGradient>
        <radialGradient id="${u}ir" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="${a.eye}" stop-opacity=".55"/><stop offset=".6" stop-color="${a.eye}"/><stop offset="1" stop-color="#120a06"/></radialGradient>
        <clipPath id="${u}eL"><path d="M140 214 C150 202 176 202 186 214 C176 224 150 224 140 214 Z"/></clipPath>
        <clipPath id="${u}eR"><path d="M214 214 C224 202 250 202 260 214 C250 224 224 224 214 214 Z"/></clipPath>
        <clipPath id="${u}mo"><path class="avt-moIn"/></clipPath>
      </defs>
      <g class="avt-body">
        <path d="M70 430 C76 372 120 350 160 342 L240 342 C280 350 324 372 330 430 Z" fill="url(#${u}cl)"/>
        ${a.hair === 'hijab' ? '' : `<path d="M172 300 L172 350 C186 362 214 362 228 350 L228 300 Z" fill="${a.skinD}"/>`}
        ${male ? `<path d="M168 344 L200 380 L232 344" fill="none" stroke="${a.cloth2}" stroke-width="5"/>` : `<path d="M160 344 C180 366 220 366 240 344" fill="none" stroke="${a.cloth2}" stroke-width="4"/>`}
      </g>
      <g class="avt-head">
        ${hairBack(a, u)}
        ${a.hair === 'hijab' ? '' : `<ellipse cx="108" cy="222" rx="13" ry="22" fill="${a.skinD}"/><ellipse cx="292" cy="222" rx="13" ry="22" fill="${a.skinD}"/>`}
        <path class="avt-face" d="M200 104 C258 104 292 148 292 206 ${jaw} C108 148 142 104 200 104 Z" fill="url(#${u}sk)"/>
        <ellipse cx="150" cy="252" rx="20" ry="11" fill="${a.lip}" opacity=".16" class="avt-cheek"/><ellipse cx="250" cy="252" rx="20" ry="11" fill="${a.lip}" opacity=".16" class="avt-cheek"/>
        ${a.beard ? `<path d="M116 236 C120 300 156 334 200 336 C244 334 280 300 284 236 C276 268 258 296 232 300 C214 292 186 292 168 300 C142 296 124 268 116 236 Z" fill="${a.hairC}" opacity=".85"/>` : ''}
        <g class="avt-eyes">
          <path d="M140 214 C150 202 176 202 186 214 C176 224 150 224 140 214 Z" fill="#FBF7F2"/>
          <path d="M214 214 C224 202 250 202 260 214 C250 224 224 224 214 214 Z" fill="#FBF7F2"/>
          <g clip-path="url(#${u}eL)"><g class="avt-iris"><circle cx="163" cy="213" r="10.5" fill="url(#${u}ir)"/><circle cx="163" cy="213" r="4.6" fill="#0b0605"/><circle cx="166.5" cy="209.5" r="2.6" fill="#fff" opacity=".9"/></g><rect class="avt-lid" x="134" y="180" width="58" height="22" fill="${a.skin}"/></g>
          <g clip-path="url(#${u}eR)"><g class="avt-iris"><circle cx="237" cy="213" r="10.5" fill="url(#${u}ir)"/><circle cx="237" cy="213" r="4.6" fill="#0b0605"/><circle cx="240.5" cy="209.5" r="2.6" fill="#fff" opacity=".9"/></g><rect class="avt-lid" x="208" y="180" width="58" height="22" fill="${a.skin}"/></g>
          <path class="avt-lash" d="M138 214 C150 200 176 200 188 213" fill="none" stroke="#1d120c" stroke-width="${male ? 2.4 : 3.4}" stroke-linecap="round"/>
          <path class="avt-lash" d="M212 213 C224 200 250 200 262 214" fill="none" stroke="#1d120c" stroke-width="${male ? 2.4 : 3.4}" stroke-linecap="round"/>
        </g>
        <path class="avt-brow avt-browL" d="M136 ${male ? 192 : 190} C148 ${male ? 182 : 180} 170 ${male ? 180 : 178} 188 ${male ? 186 : 186}" fill="none" stroke="${a.brow}" stroke-width="${male ? 7 : 4.5}" stroke-linecap="round"/>
        <path class="avt-brow avt-browR" d="M212 ${male ? 186 : 186} C230 ${male ? 180 : 178} 252 ${male ? 182 : 180} 264 ${male ? 192 : 190}" fill="none" stroke="${a.brow}" stroke-width="${male ? 7 : 4.5}" stroke-linecap="round"/>
        <path d="M200 222 C197 238 192 252 190 258 C194 263 206 263 210 258" fill="none" stroke="${a.skinD}" stroke-width="3" stroke-linecap="round"/>
        ${a.beard ? `<path d="M174 272 C186 264 214 264 226 272 C214 270 186 270 174 272 Z" fill="${a.hairC}" stroke="${a.hairC}" stroke-width="6" stroke-linejoin="round"/>` : ''}
        <g class="avt-mouth">
          <path class="avt-moIn" fill="#3a1414"/>
          <g clip-path="url(#${u}mo)">
            <rect class="avt-teethU" x="170" y="0" width="60" height="9" rx="3" fill="#fbf8f4"/>
            <rect class="avt-teethL" x="174" y="0" width="52" height="7" rx="3" fill="#ece6df"/>
            <ellipse class="avt-tongue" cx="200" cy="0" rx="16" ry="8" fill="#c0545a"/>
          </g>
          <path class="avt-lipU" fill="${a.lip}"/>
          <path class="avt-lipL" fill="${a.lip}"/>
          <path class="avt-lipHi" fill="#fff" opacity=".18"/>
        </g>
        ${a.glasses ? `<g fill="none" stroke="#2a2522" stroke-width="3.5"><rect x="132" y="196" width="62" height="38" rx="14"/><rect x="206" y="196" width="62" height="38" rx="14"/><path d="M194 210 C198 206 202 206 206 210M132 208 L112 204M268 208 L288 204"/></g><path d="M140 202 L160 200" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>` : ''}
        ${hairFront(a, u)}
      </g>
    </svg>`;
  }
  function aura() {
    return `<div class="avt-aura" aria-hidden="true"><i></i><i></i><i></i><b></b></div>`;
  }

  /* ---------------- animation ---------------- */
  function mount(host, id, opts) {
    opts = opts || {};
    const a = get(id), u = 'av' + (++uidN) + '-';
    host.classList.add('avt'); host.dataset.avatar = a.id;
    host.innerHTML = a.abstract ? aura() : svg(a, u);
    const q = s => host.querySelector(s), qa = s => host.querySelectorAll(s);
    const el = {
      head: q('.avt-head'), body: q('.avt-body'), irises: qa('.avt-iris'), lids: qa('.avt-lid'), lashes: qa('.avt-lash'),
      browL: q('.avt-browL'), browR: q('.avt-browR'), moIn: qa('.avt-moIn'), lipU: q('.avt-lipU'), lipL: q('.avt-lipL'), lipHi: q('.avt-lipHi'),
      tU: q('.avt-teethU'), tL: q('.avt-teethL'), tongue: q('.avt-tongue'), cheeks: qa('.avt-cheek'), face: q('.avt-face'), auraB: q('.avt-aura b')
    };
    const track = LS.Track();
    let state = 'idle', raf = 0, alive = true, unhook = null, lastText = '', lastRate = 1, mic = 0;
    // smoothed values
    const m = { o: 0, w: 0.5, r: 0, t: 0, g: 0, f: 0 };
    const look = { x: 0, y: 0, tx: 0, ty: 0, next: 0 };
    const blink = { v: 0, at: performance.now() + 1500, phase: 0 };
    const ex = { smile: 0.35, brow: 0, tilt: 0, nod: 0, nodV: 0 };
    let t0 = performance.now(), prev = t0;

    function mouth(dt) {
      const f = track.frame();
      const target = LS.mixShape(f.key, f.next, f.mix);
      // mouth muscles: open fast, close a touch slower (feels natural)
      for (const k in m) { const tgt = target[k]; const rate = k === 'o' ? (tgt > m[k] ? 32 : 22) : 20; m[k] += (tgt - m[k]) * Math.min(1, dt * rate); }
      if (a.abstract) { if (el.auraB) el.auraB.style.transform = `scale(${(1 + m.o * 0.5 + m.w * 0.06).toFixed(3)})`; host.style.setProperty('--speak', m.o.toFixed(3)); return; }
      const cx = 200, cy = 286 - ex.smile * 1.5;
      const smile = ex.smile * (1 - m.r) * 5;
      const hw = 22 + m.w * 14 - m.r * 13;               // half width
      const op = m.o * 26;                                 // opening
      const yt = cy - op * 0.3, yb = cy + op * 0.7;
      const L = cx - hw, R = cx + hw, cyC = cy - smile;
      const k = 0.42 - m.r * 0.22;
      const inner = `M${L} ${cyC} C${L + hw * k} ${yt} ${R - hw * k} ${yt} ${R} ${cyC} C${R - hw * k} ${yb} ${L + hw * k} ${yb} ${L} ${cyC} Z`;
      el.moIn.forEach(p => p.setAttribute('d', inner));
      // upper lip (with a cupid's bow), lower lip (fuller)
      const up = 6.5 + m.r * 2.5, low = 8.5 + m.r * 2 - m.f * 3;
      const lipU = `M${L - 1} ${cyC} C${L + hw * 0.3} ${yt - up} ${cx - 9} ${yt - up - 2} ${cx} ${yt - up + 1.5} C${cx + 9} ${yt - up - 2} ${R - hw * 0.3} ${yt - up} ${R + 1} ${cyC} C${R - hw * k} ${yt + 1} ${L + hw * k} ${yt + 1} ${L - 1} ${cyC} Z`;
      const lybot = yb + low + m.f * -4;
      const lipL = `M${L - 1} ${cyC} C${L + hw * k} ${yb - 1 - m.f * 6} ${R - hw * k} ${yb - 1 - m.f * 6} ${R + 1} ${cyC} C${R - hw * 0.25} ${lybot} ${L + hw * 0.25} ${lybot} ${L - 1} ${cyC} Z`;
      el.lipU.setAttribute('d', lipU); el.lipL.setAttribute('d', lipL);
      el.lipHi.setAttribute('d', `M${cx - hw * 0.35} ${yb + low * 0.45} C${cx - 4} ${yb + low * 0.25} ${cx + 4} ${yb + low * 0.25} ${cx + hw * 0.35} ${yb + low * 0.45} C${cx} ${yb + low * 0.7} ${cx} ${yb + low * 0.7} ${cx - hw * 0.35} ${yb + low * 0.45} Z`);
      el.tU.setAttribute('y', (yt - 9 + m.t * 6.5 + m.f * 2).toFixed(1));
      el.tU.setAttribute('opacity', Math.min(1, m.t + m.o * 0.4).toFixed(2));
      el.tL.setAttribute('y', (yb - 4 - m.t * 2).toFixed(1));
      el.tL.setAttribute('opacity', (m.t * 0.7).toFixed(2));
      el.tongue.setAttribute('cy', (yb - 2 - m.g * 5).toFixed(1));
      el.tongue.setAttribute('opacity', Math.min(1, m.o * 1.4).toFixed(2));
      // the jaw drops a little with the mouth
      if (el.face) el.face.style.transform = `translateY(${(m.o * 2.5).toFixed(2)}px)`;
    }
    function eyes(now, dt) {
      // blinking: quick close, slower open, sometimes a double blink
      if (now > blink.at && !blink.phase) blink.phase = 1;
      if (blink.phase === 1) { blink.v = Math.min(1, blink.v + dt * 16); if (blink.v >= 1) blink.phase = 2; }
      else if (blink.phase === 2) { blink.v = Math.max(0, blink.v - dt * 9); if (blink.v <= 0) { blink.phase = 0; blink.at = now + (Math.random() < 0.12 ? 160 : 2200 + Math.random() * 4200); } }
      const half = state === 'thinking' ? 0.18 : state === 'paused' ? 0.4 : 0;
      const lid = Math.max(blink.v, half + ex.smile * 0.08);
      el.lids.forEach(r => r.setAttribute('height', (22 + lid * 24).toFixed(1)));
      el.lashes.forEach(p => p.style.transform = `translateY(${(lid * 10).toFixed(2)}px)`);
      // gaze: small saccades; up and aside while thinking; at the student while listening
      if (now > look.next && !reduce) {
        if (state === 'thinking') { look.tx = (Math.random() < 0.5 ? -1 : 1) * 4; look.ty = -4; }
        else if (state === 'listening') { look.tx = (Math.random() - 0.5) * 2; look.ty = (Math.random() - 0.5) * 1.5; }
        else { look.tx = (Math.random() - 0.5) * (Math.random() < 0.3 ? 7 : 3); look.ty = (Math.random() - 0.5) * 2.5; }
        look.next = now + 700 + Math.random() * (state === 'speaking' ? 1600 : 2600);
      }
      look.x += (look.tx - look.x) * Math.min(1, dt * 18); look.y += (look.ty - look.y) * Math.min(1, dt * 18);
      el.irises.forEach(g => g.style.transform = `translate(${look.x.toFixed(2)}px, ${look.y.toFixed(2)}px)`);
    }
    function face(now, dt) {
      const t = (now - t0) / 1000;
      const want = { idle: [0.35, 0], listening: [0.45, 0.6], thinking: [0.1, 0.35], speaking: [0.4 + m.o * 0.1, 0.2 + m.o * 0.25], paused: [0.2, 0] }[state] || [0.3, 0];
      ex.smile += (want[0] - ex.smile) * Math.min(1, dt * 3);
      ex.brow += (want[1] - ex.brow) * Math.min(1, dt * 4);
      const bl = state === 'thinking' ? ex.brow * 7 : ex.brow * 4, br = ex.brow * 4;
      if (el.browL) el.browL.style.transform = `translateY(${(-bl).toFixed(2)}px)`;
      if (el.browR) el.browR.style.transform = `translateY(${(-br).toFixed(2)}px)`;
      el.cheeks.forEach(c => c.setAttribute('opacity', (0.1 + ex.smile * 0.14).toFixed(3)));
      if (reduce) return;
      // head: slow drift, a slight tilt while listening, nods while the student talks
      ex.tilt += ((state === 'listening' ? 3.2 : state === 'thinking' ? -2.2 : 0) - ex.tilt) * Math.min(1, dt * 2);
      if (state === 'listening' && mic > 0.35 && ex.nodV <= 0) ex.nodV = 1;
      if (ex.nodV > 0) { ex.nodV -= dt * 1.6; ex.nod = Math.sin((1 - Math.max(0, ex.nodV)) * Math.PI) * 3.2; } else ex.nod *= 0.9;
      const talk = state === 'speaking' ? Math.sin(t * 2.3) * 1.4 + m.o * 1.8 : 0;
      const rx = Math.sin(t * 0.37) * 1.6 + Math.sin(t * 0.91) * 0.6 + ex.tilt + Math.sin(t * 1.7) * (state === 'speaking' ? 0.9 : 0);
      const dx = Math.sin(t * 0.23) * 3, dy = Math.sin(t * 0.5) * 1.6 + ex.nod + talk * 0.6;
      if (el.head) el.head.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rx.toFixed(2)}deg)`;
      // breathing
      if (el.body) el.body.style.transform = `translateY(${(Math.sin(t * 1.55) * 1.8).toFixed(2)}px) scale(1, ${(1 + Math.sin(t * 1.55) * 0.006).toFixed(4)})`;
      if (a.abstract) host.style.setProperty('--breath', (0.5 + Math.sin(t * 1.55) * 0.5).toFixed(3));
    }
    function loop(now) {
      if (!alive) return;
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
      mouth(dt);
      if (!a.abstract) { eyes(now, dt); }
      face(now, dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    function onPhrase(type, x, rate) {
      if (type === 'start') { lastText = x; lastRate = rate || 1; track.start(x, lastRate); if (state !== 'speaking') ctrl.setState('speaking'); }
      else if (type === 'boundary') { if (!track.active && lastText) track.start(lastText, lastRate); track.boundary(x); }
      else if (type === 'end') track.stop();
    }
    const ctrl = {
      avatar: a,
      setState(s) { state = s; host.dataset.state = s; },
      attach(voice) { if (unhook) unhook(); unhook = voice && voice.onPhrase ? voice.onPhrase(onPhrase) : null; return ctrl; },
      level(x) { mic = x; },
      // drive the mouth for a phrase directly (tests / previews)
      say: onPhrase,
      shape: () => Object.assign({}, m),
      lipsync: track,
      destroy() { alive = false; cancelAnimationFrame(raf); if (unhook) unhook(); host.innerHTML = ''; }
    };
    ctrl.setState(opts.state || 'idle');
    return ctrl;
  }

  window.ERLY = window.ERLY || {};
  // svg(id, true) = a head-and-shoulders crop for thumbnails
  ERLY.avatars = { list: LIST, get, mount, svg: (id, crop) => { const x = svg(get(id), 'st' + (++uidN) + '-'); return crop ? x.replace('viewBox="0 0 400 430"', 'viewBox="88 60 224 224"') : x; } };
})();
