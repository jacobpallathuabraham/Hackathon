/* ERLY — next-generation digital human (v8).

   Why this replaced the Rocketbox people as the default: the Rocketbox models
   are 2010-era game characters (photo-textured low-poly heads, no real eyes or
   mouth interior). This engine renders a modern CC0 character built with
   Blender + MPFB/MakeHuman (separate high-poly eyes, eyelashes, eyebrow cards,
   teeth, tongue, hair cards, 2K skin, ARKit 52 face shapes + Oculus visemes,
   Mixamo-compatible skeleton with fingers), animated by TalkingHead
   (MIT, Mika Suominen) — a tested procedural animation system: breathing,
   weight shifts between standing poses, natural irregular blinks, eye
   saccades and eye contact, head movement while talking and listening,
   inverse-kinematics hand movement while speaking, and hand-shaped gestures
   (index finger, open hand to the side, shrug, thumbs-up, raised hand).

   ERLY drives it:
   - lip-sync: each spoken word is turned into Oculus visemes by TalkingHead's
     English phoneme rules, timed from the voice's real word-boundary events
     (or the cloud voice's character timestamps); voices that give no word
     events fall back to timing estimated from the speaking rate; the mouth
     closes when speech stops;
   - expressions come from the assistant's OWN intended tone (never from the
     student's face or voice) and stay subtle;
   - gestures come from what is being said (counting → index finger,
     comparisons → open hand to the side, "it depends" → shrug, genuine praise
     → thumbs-up, greeting → raised hand) with cooldowns so hands are not
     constantly moving.

   Same controller API as human3d.js, so calls, chat and visuals work unchanged. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TalkingHead } from '../../vendor/talkinghead/talkinghead.mjs';

const MODELS = new URL('../../models/people/', import.meta.url).href;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// one AudioContext shared by every avatar on the page and never closed: TalkingHead resumes its context
// without awaiting, so closing a per-avatar context on destroy raced into "Cannot resume a closed AudioContext".
// (ERLY plays speech through the voice engine, not through TalkingHead, so nothing audible depends on it.)
let sharedCtx = null;
const audioCtx = () => sharedCtx || (sharedCtx = new (window.AudioContext || window.webkitAudioContext)());

// the assistant's intended tone → [mood, subtle face accents]
const TONE = {
  enthusiastic: ['happy', { browOuterUpLeft: 0.18, browOuterUpRight: 0.18 }],
  excited: ['happy', { browOuterUpLeft: 0.2, browOuterUpRight: 0.2, eyeWideLeft: 0.08, eyeWideRight: 0.08 }],
  happy: ['happy', {}], playful: ['happy', {}],
  encouraging: ['happy', { browInnerUp: 0.08 }],
  reassuring: ['neutral', { browInnerUp: 0.22, mouthSmileLeft: 0.14, mouthSmileRight: 0.14 }],
  empathetic: ['neutral', { browInnerUp: 0.3, mouthSmileLeft: 0.06, mouthSmileRight: 0.06 }],
  sympathetic: ['neutral', { browInnerUp: 0.3 }],
  calm: ['neutral', { mouthSmileLeft: 0.08, mouthSmileRight: 0.08 }],
  thoughtful: ['neutral', { browInnerUp: 0.16, browDownLeft: 0.06, browDownRight: 0.06 }],
  curious: ['neutral', { browOuterUpLeft: 0.28, browOuterUpRight: 0.16 }],
  surprised: ['neutral', { browOuterUpLeft: 0.42, browOuterUpRight: 0.42, eyeWideLeft: 0.25, eyeWideRight: 0.25 }],
  serious: ['neutral', { browDownLeft: 0.14, browDownRight: 0.14 }],
  focused: ['neutral', { browDownLeft: 0.12, browDownRight: 0.12, eyeSquintLeft: 0.12, eyeSquintRight: 0.12 }],
  confident: ['neutral', { mouthSmileLeft: 0.08, mouthSmileRight: 0.08 }],
  neutral: ['neutral', {}]
};
const ACCENTS = ['browOuterUpLeft', 'browOuterUpRight', 'browInnerUp', 'browDownLeft', 'browDownRight', 'eyeWideLeft', 'eyeWideRight', 'eyeSquintLeft', 'eyeSquintRight', 'mouthSmileLeft', 'mouthSmileRight'];
const VIS = ['viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U', 'viseme_PP', 'viseme_FF', 'viseme_DD', 'viseme_SS', 'viseme_CH', 'viseme_kk', 'viseme_RR', 'viseme_TH', 'viseme_nn'];

/* gestures chosen from meaning, not at random */
export function gestureFor(text) {
  const t = ' ' + String(text || '').toLowerCase() + ' ';
  if (/\b(hi|hello|hey|welcome|good (morning|afternoon|evening))\b/.test(t) && t.length < 90) return 'handup';
  if (/\b(it depends|not sure|hard to say|no single answer|debated|uncertain)\b/.test(t)) return 'shrug';
  if (/\b(well done|great job|nice work|exactly right|that's right|that is right|you've got it|perfect|excellent)\b/.test(t)) return 'thumbup';
  if (/\b(on the other hand|whereas|in contrast|compared (to|with)|versus|vs\.?|while the other|unlike)\b/.test(t)) return 'side';
  if (/\b(first(ly)?|the key (point|idea)|one thing|most important(ly)?|number one|step one|notice that)\b/.test(t)) return 'index';
  return null;
}

export async function create(host, opts, kit) {
  opts = opts || {};
  const meta = opts.meta || {};
  const { ENVS, buildEnvScene } = kit;
  const wrap = document.createElement('div'); wrap.className = 'h3d h3d--dh';
  const bg = document.createElement('canvas'); bg.className = 'h3d__env';
  const cv = document.createElement('canvas'); cv.className = 'h3d__av';
  const thNode = document.createElement('div'); thNode.className = 'h3d__th'; thNode.hidden = true;
  wrap.append(bg, cv, thNode); host.appendChild(wrap);

  let renderer, envR;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    envR = new THREE.WebGLRenderer({ canvas: bg, antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch (e) { wrap.remove(); throw new Error('webgl'); }
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  envR.outputColorSpace = THREE.SRGBColorSpace; envR.toneMapping = THREE.ACESFilmicToneMapping;
  // adaptive quality: start from the device, step down if frames are slow
  const lowGPU = opts.lowPower || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  let quality = Math.min(lowGPU ? 1.25 : 2, window.devicePixelRatio || 1);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 60);
  const envCam = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  // portrait lighting: soft warm key from camera-left, cool fill, a rim to separate hair from the room
  const key = new THREE.DirectionalLight(0xfff0e2, 2.1); key.position.set(-1.4, 2.4, 2.6); key.castShadow = !lowGPU; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.015; scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.55); fill.position.set(1.8, 1.4, 1.8); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.3); rim.position.set(0.8, 2.2, -2.4); scene.add(rim);
  const hemi = new THREE.HemisphereLight(0xfaf3ea, 0x3a3029, 0.3); scene.add(hemi);
  function lightFor(id) {
    const E = ENVS[id] || ENVS.classroom; const L = new THREE.Color(E.light);
    key.color.copy(L).lerp(new THREE.Color(0xffffff), 0.45); key.intensity = E.dark ? 1.7 : 2.1;
    rim.color.copy(L); rim.intensity = E.dark ? 2.0 : 1.3;
    fill.color.set(E.warm ? 0xffe6cc : 0xdfe8ff); fill.intensity = E.dark ? 0.4 : 0.55;
    hemi.color.copy(L); hemi.groundColor.set(E.floor); hemi.intensity = E.dark ? 0.22 : 0.3;
  }

  const head = new TalkingHead(thNode, {
    avatarOnly: true, avatarOnlyScene: scene, avatarOnlyCamera: camera,
    lipsyncModules: ['en'], lipsyncLang: 'en', modelFPS: 60, cameraView: 'upper', audioCtx: audioCtx(),
    avatarIdleEyeContact: 0.45, avatarIdleHeadMove: 0.35, avatarSpeakingEyeContact: 0.7, avatarSpeakingHeadMove: 0.45,
    modelMovementFactor: reduce ? 0.3 : 1
  });
  const t0 = performance.now();
  await head.showAvatar({ url: meta.url || (MODELS + meta.model), body: meta.g === 'm' ? 'M' : 'F', avatarMood: 'neutral', lipsyncLang: 'en' });
  const loadMs = performance.now() - t0;
  const arm = head.armature;
  arm.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false; o.castShadow = !lowGPU; o.receiveShadow = true;
    [].concat(o.material).forEach(m => {
      m.envMapIntensity = 0.55;
      // eyelashes / brows / hair cards: crisp cut-outs, anti-aliased edges
      if (m.transparent || m.alphaTest > 0) { m.alphaToCoverage = true; }
      // skin: physically based with a soft sheen at grazing angles (reads as skin, not plastic)
      if (/skin|body|base|head/i.test(m.name) && m.map && !m.isMeshPhysicalMaterial && o.morphTargetDictionary) {
        const p = new THREE.MeshPhysicalMaterial({ name: m.name, map: m.map, normalMap: m.normalMap, roughness: 0.58, metalness: 0, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffcbb8), specularIntensity: 0.4, clearcoat: 0.04, clearcoatRoughness: 0.5, envMapIntensity: 0.5 });
        if (Array.isArray(o.material)) o.material[o.material.indexOf(m)] = p; else o.material = p;
      }
    });
  });
  const B = n => arm.getObjectByName(n);
  const headBone = B('Head'), hips = B('Hips');
  head.start();

  // framing: waist-up, both hands in frame; 'shift' slides the person aside for a visual
  const cam0 = { y: 1.4, dist: 2 }, shift = { x: 0, to: 0 };
  arm.updateMatrixWorld(true);
  const headPos = new THREE.Vector3(); headBone.getWorldPosition(headPos);
  const hipPos = new THREE.Vector3(); hips.getWorldPosition(hipPos);
  function frame() {
    const r = cv.getBoundingClientRect(); const w = Math.max(64, r.width), h = Math.max(64, r.height);
    renderer.setPixelRatio(Math.min(quality, 2)); renderer.setSize(w, h, false);
    envR.setPixelRatio(Math.min(quality, 1.5)); envR.setSize(w, h, false);
    camera.aspect = w / h; envCam.aspect = w / h;
    const top = headPos.y + 0.3, bottom = hipPos.y - 0.02; // headroom above the hair; waist at the bottom
    const tall = w / h < 0.8, needH = top - bottom, needW = 0.95;
    const t2 = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    let dist, midY = (top + bottom) / 2 + (opts.offsetY || 0);
    if (tall) { let visH = needH / 0.6; if (visH * camera.aspect < 0.8) visH = 0.8 / camera.aspect; dist = visH / 2 / t2 * (opts.zoom || 1); midY -= visH * 0.08; }
    else dist = Math.max(needH / 2 / t2, needW / 2 / (t2 * camera.aspect)) * (opts.zoom || 1);
    cam0.y = midY; cam0.dist = dist;
    camera.position.set(shift.x, midY + 0.04, dist); camera.lookAt(shift.x, midY, 0); camera.updateProjectionMatrix();
    envCam.position.set(0, 1.35, 3.2); envCam.lookAt(0, 1.3, -3); envCam.updateProjectionMatrix();
    renderEnv();
  }
  let envScene = buildEnvScene(opts.env || 'portrait'), envId = opts.env || 'portrait';
  function renderEnv() { envR.render(envScene, envCam); }
  function setEnv(id) { if (!ENVS[id]) return; envId = id; lightFor(id); envScene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); }); envScene = buildEnvScene(id); renderEnv(); wrap.dataset.env = id; }
  wrap.dataset.env = envId; lightFor(envId);

  /* ---------------- lip-sync ---------------- */
  const lip = { text: '', rate: 1, boundaryMode: false, gotBoundary: false, starts: [], words: [], lastWordAt: 0 };
  const pending = () => head.animQueue.filter(x => x.template && x.template.name === 'viseme');
  function dropVisemes(future) { const now = head.animClock; head.animQueue = head.animQueue.filter(x => !(x.template && x.template.name === 'viseme' && (!future || x.ts[0] > now))); }
  // schedule one word's visemes starting `delay` ms from now, lasting about `dur` ms
  function word(w, delay, dur) {
    if (!head.lipsync || !head.lipsync.en) return 0;
    const clean = head.lipsyncPreProcessText(w, 'en');
    const v = head.lipsyncWordsToVisemes(clean, 'en');
    if (!v || !v.visemes || !v.visemes.length) return 0;
    const n = v.visemes.length, total = v.times[n - 1] + v.durations[n - 1];
    dur = Math.min(dur, n * 190);
    for (let j = 0; j < n; j++) {
      const t = head.animClock + delay + (v.times[j] / total) * dur, d = (v.durations[j] / total) * dur;
      const vis = v.visemes[j], lvl = (vis === 'PP' || vis === 'FF') ? 0.9 : 0.68;
      head.animQueue.push({ template: { name: 'viseme' }, ts: [t - Math.min(60, 2 * d / 3), t + Math.min(25, d / 2), t + d + Math.min(60, d / 2)], vs: { ['viseme_' + vis]: [null, lvl, 0] } });
    }
    lip.lastWordAt = performance.now();
    return dur;
  }
  // (the same as TalkingHead's own stopSpeaking(): drop the viseme animations and zero the mouth shapes;
  //  the internal values are zeroed too, otherwise a cut-off viseme would stay frozen half-open)
  function closeMouth() {
    dropVisemes(false);
    const mt = head.mtAvatar || {};
    VIS.forEach(v => { const o = mt[v]; if (o) Object.assign(o, { value: 0, applied: 0, newvalue: null, system: null, systemd: null, base: null, needsUpdate: true }); });
    head.resetLips();
  }
  const estDur = (w, rate) => Math.max(110, Math.min(650, (w.replace(/[^\p{L}\p{N}]/gu, '').length * 62 + 40) / (rate || 1)));
  function splitWords(text) { const out = []; const re = /\S+/g; let m; while ((m = re.exec(text))) out.push([m.index, m[0]]); return out; }
  function scheduleEstimate(text, rate) {
    let t = 30;
    for (const [, w] of splitWords(text)) { word(w, t, estDur(w, rate)); t += estDur(w, rate) + (/[,;:]$/.test(w) ? 220 : /[.!?]$/.test(w) ? 380 : 40); }
  }

  /* ---------------- expressions & gestures ---------------- */
  let emotion = 'neutral', state = 'idle', lastGesture = 0, lastHands = 0;
  const history = [];
  function applyTone(e) {
    const T = TONE[e] || TONE.neutral;
    if (head.moodName !== T[0]) { try { head.setMood(T[0]); } catch (err) { /* mood not available */ } }
    // held (eased by TalkingHead's smoothing) for as long as this tone lasts; 0 → released back to natural idle motion
    // reset the easing momentum first: otherwise a shape still moving the other way overshoots below zero (an "anti-expression")
    ACCENTS.forEach(mt => { const o = head.mtAvatar && head.mtAvatar[mt]; if (o) { o.v = 0; if (o.value < 0) o.value = 0; } head.setFixedValue(mt, T[1][mt] ? T[1][mt] : null); });
  }
  function gesture(name, dur, mirror) {
    if (!name || reduce) return;
    head.playGesture(name, dur || 2.4, !!mirror, 700); lastGesture = performance.now();
    history.push(name); if (history.length > 40) history.shift();
  }
  function onPhrase(type, x, rate) {
    if (type === 'start') {
      lip.text = String(x || ''); lip.rate = rate || 1; lip.words = splitWords(lip.text); lip.gotBoundary = false;
      if (state !== 'speaking') ctrl.setState('speaking');
      applyTone(emotion);
      dropVisemes(false);
      if (!lip.boundaryMode) scheduleEstimate(lip.text, lip.rate);
      // body language from meaning, with cooldowns so the hands rest between ideas
      const now = performance.now(), g = gestureFor(lip.text);
      if (g && now - lastGesture > 3500) gesture(g, g === 'shrug' ? 2 : 2.6, g === 'side' && Math.random() < 0.5);
      else if (now - lastGesture > 2500 && now - lastHands > 3000) { lastHands = now; head.speakWithHands(0, 0.55); }
    } else if (type === 'boundary') {
      // real word timing from the voice: switch to boundary-driven visemes
      if (!lip.gotBoundary) { lip.gotBoundary = true; if (!lip.boundaryMode) { lip.boundaryMode = true; dropVisemes(true); } }
      const ci = +x || 0; const hit = lip.words.find(([i, w]) => ci >= i && ci < i + w.length) || lip.words.find(([i]) => i >= ci);
      if (hit) word(hit[1], 0, estDur(hit[1], lip.rate));
    } else if (type === 'end') {
      // speech ended or the student interrupted: nothing more may move the lips — clear what is
      // queued AND what is playing, and ease every mouth shape to rest within ~90 ms
      closeMouth();
    }
  }

  // external audio (real-time voice engine): the jaw follows loudness
  const ext = { level: 0, at: 0 };
  function extMouth(now) {
    const on = now - ext.at < 250;
    const mt = head.mtAvatar;
    if (!mt || !mt.jawOpen) return;
    const ph = Math.floor(now / 120) % 3, shapes = ['viseme_aa', 'viseme_O', 'viseme_E'];
    if (on && ext.level > 0.04) {
      mt.jawOpen.realtime = Math.min(0.4, ext.level * 0.55); mt.jawOpen.needsUpdate = true;
      shapes.forEach((s, i) => { if (mt[s]) { mt[s].realtime = i === ph ? Math.min(0.7, ext.level) : 0; mt[s].needsUpdate = true; } });
    } else if (mt.jawOpen.realtime !== null) {
      ['jawOpen', ...shapes].forEach(s => { if (mt[s]) { mt[s].realtime = null; mt[s].needsUpdate = true; } });
    }
  }

  /* ---------------- render loop ---------------- */
  let alive = true, raf = 0, last = performance.now(); const perf = { n: 0, t: 0, fps: 0 };
  // no GPU work while the person is scrolled out of view (word timing is relative to the animation clock, so lips stay in sync on return)
  let onScreen = true; const io = 'IntersectionObserver' in window ? new IntersectionObserver(e => { onScreen = e[e.length - 1].isIntersecting; }) : null; if (io) io.observe(wrap);
  function loop(now) {
    if (!alive) return;
    if (!onScreen) { last = now; raf = requestAnimationFrame(loop); return; }
    const dtMs = Math.min(500, now - last); last = now; // keep the animation clock in real time (lip-sync is scheduled on it), even on slow GPUs
    extMouth(now);
    head.animate(dtMs);
    if (Math.abs(shift.to - shift.x) > 0.001) shift.x += (shift.to - shift.x) * Math.min(1, dtMs / 1000 * 3);
    const tt = now / 1000, dr = reduce ? 0 : 1;
    camera.position.x = shift.x + dr * Math.sin(tt * 0.21) * 0.006; camera.position.y = cam0.y + 0.04 + dr * Math.sin(tt * 0.17 + 1) * 0.004;
    camera.lookAt(shift.x, cam0.y, 0);
    renderer.render(scene, camera);
    perf.n++; perf.t += dtMs;
    if (perf.n >= 90) { const ms = perf.t / perf.n; perf.fps = 1000 / ms; if (ms > 30 && quality > 0.75) { quality -= 0.25; frame(); } perf.n = 0; perf.t = 0; }
    raf = requestAnimationFrame(loop);
  }
  const ro = new ResizeObserver(() => frame()); ro.observe(cv);
  frame(); raf = requestAnimationFrame(loop);
  // pause rendering (and its GPU cost) while the tab is hidden
  const vis = () => { if (document.hidden) head.stop(); else { head.start(); last = performance.now(); } };
  document.addEventListener('visibilitychange', vis);

  let unhook = null;
  const ctrl = {
    three: true, engine: 'digital-human', avatar: meta, loadMs,
    setState(s) {
      if (s === state) return; state = s; wrap.dataset.state = s;
      if (s === 'thinking') { applyTone('thoughtful'); head.setFixedValue('eyesRotateY', Math.random() < 0.5 ? -0.35 : 0.35); head.setFixedValue('eyesRotateX', -0.3); setTimeout(() => { head.setFixedValue('eyesRotateY', null); head.setFixedValue('eyesRotateX', null); }, 1300); }
      else if (s === 'listening') { applyTone('neutral'); head.setFixedValue('mouthSmileLeft', 0.08); head.setFixedValue('mouthSmileRight', 0.08); }
      else if (s === 'idle' || s === 'paused') { closeMouth(); applyTone('neutral'); }
      else if (s === 'speaking') applyTone(emotion);
    },
    greet() { gesture('handup', 2.2); },
    setShift(x) { shift.to = x || 0; },
    // gesture and glance towards a visual on the student's right
    point() { if (performance.now() - lastGesture < 2000) return; gesture('index', 2.6, true); head.setFixedValue('eyesRotateY', -0.45); setTimeout(() => head.setFixedValue('eyesRotateY', null), 1400); },
    emote(e) { emotion = TONE[e] ? e : 'neutral'; if (state === 'speaking') applyTone(emotion); },
    emotion: () => emotion,
    attach(voice) { if (unhook) unhook(); unhook = voice && voice.onPhrase ? voice.onPhrase(onPhrase) : null; return ctrl; },
    level() { /* the student's voice level is never used to animate or assess anything */ },
    mouthLevel(x) { ext.level = x; ext.at = performance.now(); },
    say: onPhrase,
    // the same summary shape the 2D companions report (used by the call UI's mouth meter)
    shape: () => { const mt = head.mtAvatar || {}, v = n => (mt[n] ? +mt[n].value || 0 : 0); const open = Math.max(v('viseme_aa'), v('viseme_O') * 0.8, v('viseme_E') * 0.6, v('viseme_I') * 0.5, v('viseme_U') * 0.5, v('jawOpen')); return { o: Math.min(1, open), w: 0.5 + (v('viseme_E') + v('viseme_I')) * 0.3 - (v('viseme_O') + v('viseme_U')) * 0.3, r: v('viseme_O') + v('viseme_U'), t: v('viseme_TH'), g: 0, f: v('viseme_FF') }; },
    expression: () => { const T = TONE[emotion] || TONE.neutral; return Object.assign({ tone: emotion, mood: T[0] }, T[1]); },
    lipsync: null,
    weights: () => { const o = {}; const mt = head.mtAvatar || {}; Object.keys(mt).forEach(n => { o[n] = +(+mt[n].value || 0).toFixed(3); }); return o; },
    clip: () => (head.gesture ? 'gesture' : state),
    history: () => history.slice(),
    pendingVisemes: () => pending().length,
    lipMode: () => (lip.boundaryMode ? 'word-events' : 'estimated'),
    fps: () => perf.fps,
    setEnv, env: () => envId, envs: ENVS,
    quality: () => quality,
    head,
    destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); if (io) io.disconnect(); document.removeEventListener('visibilitychange', vis); if (unhook) unhook(); head.start = () => {}; head.isRunning = false; /* nothing may restart a destroyed head; the shared audio context stays open */ scene.remove(arm); renderer.dispose(); envR.dispose(); try { renderer.forceContextLoss(); envR.forceContextLoss(); } catch (e) { /* ignore */ } wrap.remove(); }
  };
  ctrl.setState('idle');
  return ctrl;
}
