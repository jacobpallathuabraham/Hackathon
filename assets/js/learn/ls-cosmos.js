/* ERLY Learning Studio — the cinematic universe (#/home).

   The opening of the Studio is a scroll-driven journey through a rendered universe: the void, first light, the eleven
   subject worlds one by one, and finally the whole universe gathered so a student can choose where to go.

   Architecture (one file per concern would be over-split for ~700 lines; the sections below are independent):
     Quality      tier from the device (0 phone · 1 modest · 2 capable) + adaptive pixel ratio from measured frame times
     Sky          ls-cosmos-sky.js (v39): a photographic Milky Way baked once, pin-sharp stars with real colours and a
                  power-law brightness, shader-drawn galaxies, and an environment map for reflections; near motes for motion
     Life         ls-cosmos-fx.js (v39): GPU-tumbling asteroid fields and a belt, meteors, speed streaks, a lens flare
     Light        a sun whose direction sweeps from behind the great planet ("first light") to its working angle
     Worlds       LS.cosmosWorlds.build() — built progressively (nearest first, the rest in idle time)
     Astronaut    ls-cosmos-astro.js: built in code (v39) — a jointed EVA suit with a reflective visor — never inside or
                  behind a world (its target is slid along the line of sight), held in the composition by a damped spring
     Camera       two Catmull-Rom splines (position, look target) through 15 keyframes; each segment eased with a dwell;
                  position and gaze each follow a critically damped spring (v39), and the horizon never rolls
     Story        page scroll → target progress → damped progress (no scroll-jacking: the page scrolls natively)
     Interaction  hover / focus / select / enter; touch: tap to focus, tap again (or Enter) to travel; keyboard: the
                  Destinations map and the scene buttons
     Travel       a short camera flight into the chosen world (skippable by any input), then the subject opens
     Lifecycle    one requestAnimationFrame loop; it stops when the stage is off-screen, the tab is hidden or the
                  route changes; destroy() disposes every geometry, material, texture and render target
   Without WebGL, or with reduced motion, the same story is told with painted planets and no camera motion. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, esc = LS.esc;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), smooth = t => t * t * (3 - 2 * t), ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const tierOf = () => { const coarse = matchMedia('(pointer: coarse)').matches, w = innerWidth; if ((coarse && w < 1000) || w < 640) return 0; if ((navigator.deviceMemory || 8) < 4 || (navigator.hardwareConcurrency || 8) <= 4) return 1; return 2; };

  /* ---------- the map of the universe ---------- */
  const PATH = { maths: [6, 1, -30], physics: [-8, -1.5, -52], chemistry: [7, 2.5, -74], biology: [-6, 0, -96], geography: [5.5, -2, -120], cs: [-9, 3, -144], english: [9, -1, -164], history: [-7, -3, -184], languages: [8, 3, -204], social: [-8, 1, -224], more: [6, -2, -244] };
  const O = [0, 0, -280]; // where the worlds gather at the end
  const RING = id => { const W = LS.cosmosWorlds, i = W.ORDER.indexOf(id), a = -Math.PI / 2 + (i / 11) * Math.PI * 2; return [O[0] + Math.cos(a) * 13.5, O[1] - 2.6 + Math.sin(a * 2) * 0.9 + (i % 2 ? 0.5 : -0.3), O[2] + Math.sin(a) * 7.4]; };
  const ORIGIN = { pos: [-30, -21, -58], r: 22 };
  const SUN0 = [-0.2, -0.1, -0.975], SUN1 = [0.6, 0.4, 0.69]; /* the opening sun waits just behind the great planet’s upper limb (a sunrise), then sweeps to a three-quarter front light */ // behind the great planet → working angle

  function keyframes() {
    const W = LS.cosmosWorlds, K = [];
    const add = (pos, tgt, astro, look, scene) => K.push({ pos, tgt, astro, look, scene });
    add([0, 0.4, 12], [-2, -0.6, -20], [1.25, -0.3, -3.3], 'camera', 'void');
    add([3, 2.2, -2], [-5, 4, -44], [1.8, -0.95, -3.9], 'origin', 'light'); /* first light: the limb sits low in frame, the sunrise above it; the astronaut stays clear of the words */
    add([0, 5, -8], [1, 0, -64], [0.95, -0.7, -3.8], 'maths', 'universe');
    W.ORDER.forEach(id => { const P = PATH[id], s = Math.sign(P[0]) || 1;
      add([P[0] - s * 1.4, P[1] + 0.7, P[2] + 6.6], [P[0] - s * 2.5, P[1] - 0.25, P[2] - 1], [s * 0.42, -0.74, -3.7], id, id); }); // astronaut between the words and the world, facing the world
    if (innerWidth < 700) add([O[0], O[1] + 9.5, O[2] + 30], [O[0], O[1] - 3.2, O[2]], [3.5, -1.7, -7.4], 'center', 'all'); /* phones: the tall constellation reads best from the lower angle */
    else add([O[0], O[1] + 19, O[2] + 28], [O[0], O[1] + 1.6, O[2] - 2], [4.7, -2.7, -7.6], 'center', 'all'); /* v36: a higher view, so the ring opens up and no world hides another */
    return K;
  }

  /* ---------- copy for each scene ---------- */
  function sceneCopy(k, C0) {
    const W = LS.cosmosWorlds, M = W.META;
    if (k.scene === 'void') return `<p class="cz-kick">ERLY · ${T('Learning Studio', 'استوديو التعلّم')}</p><h1 class="cz-h1">${T('A universe of questions.', 'كونٌ من الأسئلة.')}</h1><p class="cz-p">${T('Infinite worlds of discovery. Your journey begins here.', 'عوالم لا نهائية للاكتشاف. رحلتك تبدأ هنا.')}</p><p class="cz-cue" aria-hidden="true"><span></span>${T('Scroll to travel', 'مرّر للسفر')}</p>`;
    if (k.scene === 'light') return `<p class="cz-kick">01 · ${T('First light', 'الضوء الأول')}</p><h2 class="cz-h2">${T('Every question is a light in the dark.', 'كل سؤال ضوءٌ في الظلام.')}</h2><p class="cz-p">${T('Follow one far enough and it becomes a place you can explore.', 'اتبعه بعيداً بما يكفي ليصبح مكاناً تستكشفه.')}</p>`;
    if (k.scene === 'universe') return `<p class="cz-kick">02 · ${T('The universe of knowledge', 'كون المعرفة')}</p><h2 class="cz-h2">${T('Eleven worlds. One journey.', 'أحد عشر عالماً. رحلة واحدة.')}</h2><p class="cz-p">${T('Each world holds structured chapters, hands-on 3D laboratories, flashcards and checks — from Grade 11 to university.', 'كل عالم فيه فصول منظمة ومختبرات ثلاثية الأبعاد وبطاقات وفحوص.')}</p>`;
    if (k.scene === 'all') return `<p class="cz-kick">${T('The whole universe', 'الكون كله')}</p><h2 class="cz-h2">${T('Where will you go first?', 'إلى أين ستذهب أولاً؟')}</h2><p class="cz-p">${T('Point at a world to see what it holds. Select it to travel there.', 'أشر إلى عالم لترى ما فيه، واختره لتسافر إليه.')}</p><p class="cz-links"><a href="#/space">${T('Solar System Explorer', 'مستكشف النظام الشمسي')} →</a><a href="#/path">${T('The learning path', 'مسار التعلّم')} →</a><a href="#/explore">${T('All subjects as a list', 'كل المواد كقائمة')} →</a></p>`;
    const id = k.scene, m = M[id], i = W.ORDER.indexOf(id) + 3, chs = C0 ? C0.bySubject(id).flatMap(c => c.chapters) : [], xs = (LS.experiences || []).filter(x => x.subject === id);
    return `<p class="cz-kick">${String(i).padStart(2, '0')} · ${esc(m.kick)}</p><h2 class="cz-h2">${esc(m.name)}</h2><p class="cz-p">${esc(m.line)}</p>
      <p class="cz-meta">${chs.length} ${T('chapters', 'فصول')} · ${xs.length} ${T('experiences', 'تجارب')}${chs[0] ? ` · ${T('begin with', 'ابدأ بـ')} <a href="#/chapter/${chs[0].id}">${esc(chs[0].title)}</a>` : ''}</p>
      <button type="button" class="cz-enter" data-cz-enter="${id}">${T('Enter', 'ادخل')} ${esc(m.name)} <span aria-hidden="true">→</span></button>`;
  }

  /* ---------- painted texture (glow) ---------- */
  function glowTex(THREE, inner, outer) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(0.18, inner); gr.addColorStop(0.45, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  /* ---------- the universe ---------- */
  async function universe(stage, o) {
    const { THREE } = await LS.three(); const W = LS.cosmosWorlds, M = W.META; let q = tierOf();
    if (!LS.__bgu) try { LS.__bgu = await import('three/addons/utils/BufferGeometryUtils.js'); } catch (e) { /* rocks fall back to faceted normals */ }
    const maxDpr0 = Math.min(devicePixelRatio || 1, [1, 1.25, 1.5][q]); /* pixel-ratio caps: the scene is soft and atmospheric, so 1.5 is visually indistinguishable from 2 at a third of the pixels */
    const renderer = new THREE.WebGLRenderer({ antialias: maxDpr0 < 1.5, powerPreference: 'high-performance', alpha: false, stencil: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
    const maxDpr = maxDpr0; let dpr = maxDpr; renderer.setPixelRatio(dpr); W.SUN.renderer = renderer; /* surfaces are baked with this renderer */
    const cv = renderer.domElement; cv.className = 'cz-cv'; cv.setAttribute('aria-hidden', 'true'); stage.prepend(cv);
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(q ? 42 : 50, 16 / 9, 0.05, 4000);
    const disposables = []; const V3s = a => new THREE.Vector3(...a).normalize();

    /* sun and lights */
    const sun = new THREE.Vector3(...SUN0).normalize(); W.SUN.v = W.SUN.v || new THREE.Vector3(); W.SUN.v.copy(sun);
    const key = new THREE.DirectionalLight(0xfff1df, 2.4); scene.add(key, key.target); const hemi = new THREE.HemisphereLight(0x8a9cc8, 0x0b0d14, 0.32); scene.add(hemi);
    const rim = new THREE.DirectionalLight(0x9fb4ff, 0.9); scene.add(rim, rim.target);
    const fill = new THREE.DirectionalLight(0xc8d2ff, 0.75); scene.add(fill, fill.target); // a soft light from the viewer's side, so the astronaut is never a silhouette
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(THREE, 'rgba(255,246,228,1)', 'rgba(255,170,90,0.22)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    sunGlow.scale.setScalar(150); scene.add(sunGlow);

    /* sky (v39, ls-cosmos-sky.js): a photographic Milky Way, pin-sharp stars with real colours and brightnesses, distant
       galaxies, and an environment map for reflections */
    const SKY = LS.cosmosSky(THREE, renderer, scene, q, W.NOISE, V3s(SUN1));
    /* near motes: a few tiny specks of dust close to the lens give a sense of motion (stars themselves are at infinity) */
    const pointsLayer = (n, spread, sizeA, sizeB, seed) => { let s = seed; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const P = new Float32Array(n * 3), S = new Float32Array(n);
      for (let i = 0; i < n; i++) { let x, y, z; do { x = (R() - 0.5) * spread[0]; y = (R() - 0.5) * spread[1]; z = 60 - R() * spread[2]; } while (Math.abs(x) < 3 && Math.abs(y) < 2); P.set([x, y, z], i * 3); S[i] = sizeA + R() * R() * sizeB; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('size', new THREE.BufferAttribute(S, 1));
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uPx: { value: dpr }, uMove: { value: 0.15 } },
        vertexShader: 'attribute float size; uniform float uPx; uniform float uMove; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(size*uPx*(160.0/-mv.z),1.0,4.0*uPx); vA=clamp(-mv.z/6.0,0.0,1.0)*(1.0-smoothstep(40.0,90.0,-mv.z))*(0.15+0.85*uMove); }',
        fragmentShader: 'varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float a=exp(-dot(c,c)*18.0); gl_FragColor=vec4(vec3(0.78,0.84,1.0)*a*vA*0.6,1.0); }' });
      const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts; };
    const dust = pointsLayer([120, 260, 420][q], [90, 50, 360], 0.08, 0.22, 19);

    /* the great planet of the opening ("Origin"): marbled indigo with a thin bright atmosphere — the sun rises from behind its limb */
    const origin = new THREE.Group(); origin.position.set(...ORIGIN.pos);
    const oCore = W.surface(THREE, q, ORIGIN.r, 0, ['#5b74c4', '#d4dcf7', '#1e2a62'], 11.3, [64, 96, 128][q], '#8fb0ff'); oCore.rotation.z = 0.32; origin.add(oCore, W.atmosphere(THREE, ORIGIN.r * 1.03, '#8fb0ff', 1.5)); scene.add(origin);

    /* worlds: nearest first, the rest in idle time */
    let astroReady = false; /* declared before the worlds: their build reports loading progress */
    const worlds = {}; const queue = W.ORDER.slice();
    /* warm-up: a world's shaders compile and its textures upload in the background as soon as it is built, so reaching it
       mid-scroll never stalls a frame (first-use compilation was the cause of hitches) */
    const warm = obj => { try { const par = renderer.extensions && renderer.extensions.has && renderer.extensions.has('KHR_parallel_shader_compile'); if (par && renderer.compileAsync) renderer.compileAsync(obj, camera, scene).catch(() => {}); else renderer.compile(obj, camera, scene); /* called from idle time */ obj.traverse(o => { const m = o.material; if (m && m.map && renderer.initTexture) renderer.initTexture(m.map); }); } catch (e) { /* best effort */ } };
    const buildNext = () => { const id = queue.shift(); if (!id) return; const G = W.build(THREE, id, q); G.position.set(...PATH[id]); G.userData.f = 0; G.userData.rv = 0; scene.add(G); worlds[id] = G; warm(G); o.onLoad && o.onLoad({ worlds: Object.keys(worlds).length, astro: astroReady }); };
    buildNext(); buildNext();
    const idle = window.requestIdleCallback || (f => setTimeout(f, 60)); const idleBuild = () => { if (!alive || !queue.length) return; buildNext(); idle(idleBuild, { timeout: 400 }); }; let alive = true; idle(idleBuild, { timeout: 400 });

    /* astronaut: a world-space flight controller (ls-cosmos-astro.js) sharing the camera's journey parameter */
    const AST = LS.cosmosAstronaut(THREE, scene, { glow: glowTex(THREE, 'rgba(200,225,255,1)', 'rgba(110,160,255,0.25)'), env: SKY.env, renderer, q }); const astro = AST.root;
    AST.load(null, warm).then(() => { if (!alive) return; astroReady = true; o.onAstronaut && o.onAstronaut(true); o.onLoad && o.onLoad({ worlds: Object.keys(worlds).length, astro: true }); }).catch(() => { o.onAstronaut && o.onAstronaut(false); o.onLoad && o.onLoad({ worlds: Object.keys(worlds).length, astro: false, failed: true }); });

    /* camera choreography */
    const K = keyframes(), N = K.length, V3 = a => new THREE.Vector3(...a);
    const posC = new THREE.CatmullRomCurve3(K.map(k => V3(k.pos)), false, 'centripetal'), tgtC = new THREE.CatmullRomCurve3(K.map(k => V3(k.tgt)), false, 'centripetal');
    /* camera choreography by scene type. Every segment eases with smootherstep (zero velocity AND acceleration at both ends,
       so no jerk and no overshoot) and rests briefly on each keyframe ("dwell"):
         0 hero approach (slow, long dwell) · 1 first light, a planet reveal · 2…12 world focus, approached on a gentle arc ·
         13→14 universe reveal, a wide pull-back that decelerates into the overview */
    const sstep = t => t * t * t * (t * (t * 6 - 15) + 10);
    const DWELL = i => (i === 0 ? 0.08 : i === N - 2 ? 0.03 : 0.05); /* v36: short rests, so the travel is spread over the scroll instead of a sudden dash */
    const at = p => { const i = clamp(Math.floor(p), 0, N - 2), f = clamp(p - i, 0, 1), d = DWELL(i), x = clamp((f - d) / (1 - 2 * d), 0, 1);
      const g = i === N - 2 ? 1 - Math.pow(1 - sstep(x), 1.6) : 0.45 * x + 0.55 * sstep(x); /* gentler ease: peak speed ≈ 1.5× the average instead of 1.9× */ return { i, f: g, raw: f, u: (i + g) / (N - 1) }; };
    const arcSide = new THREE.Vector3(), arcUp = new THREE.Vector3(0, 1, 0);
    /* asteroids, meteors, streaks, flare (v39, ls-cosmos-fx.js) — rocks keep clear of the camera's path, the worlds,
       their places in the final ring and the great planet */
    let FX = null;
    const pathPts = Array.from({ length: 260 }, (_, i) => posC.getPoint(i / 259)), worldPts = W.ORDER.map(id => [V3(PATH[id]), V3(RING(id))]), originV = V3(ORIGIN.pos);
    const avoidRock = (p, size, belt) => { if (!belt) for (const c of pathPts) if (c.distanceToSquared(p) < (8 + size * 2) * (8 + size * 2)) return true;
      for (const [a, b] of worldPts) { if (a.distanceToSquared(p) < (6.5 + size) * (6.5 + size) || b.distanceToSquared(p) < (3.4 + size) * (3.4 + size)) return true; }
      return originV.distanceTo(p) < ORIGIN.r + 5; };
    const buildFX = () => { if (!alive || FX) return; FX = LS.cosmosFX(THREE, scene, q, { avoid: avoidRock }); FX.rocks.forEach(m => warm(m)); };
    setTimeout(() => (window.requestIdleCallback || (f => setTimeout(f, 30)))(buildFX, { timeout: 900 }), 250);
    /* the astronaut's world-space path: one anchor per keyframe, where that keyframe's framing places it at rest */
    const rebuildAnchors = () => { const pts = K.map(k => { const pos = V3(k.pos), q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, V3(k.tgt), new THREE.Vector3(0, 1, 0))), off = V3(k.astro);
        if (innerWidth < 700) { if (k.scene === 'all') off.set(0.9, -2.1, -7.8); else { off.x *= 0.5; off.z *= 1.25; off.y = Math.abs(off.y) * 0.55 + 0.35; } }
        off.z = Math.min(off.z, -2.9); return pos.add(off.applyQuaternion(q)); });
      /* the overview anchor follows the gathered worlds' frame; the hero anchor sits in front of the great planet */
      AST.setAnchors(pts); };

    /* state */
    const st = { lastInput: 0, target: 0, p: 0, ptr: { x: 0, y: 0, tx: 0, ty: 0 }, hover: null, sel: null, flight: null, ret: null, t: 0, last: performance.now(), frames: [], cpu: [], visible: true, dirty: true, moved: false, astroPos: new THREE.Vector3(), lastCam: new THREE.Vector3() };
    const look2 = new THREE.Vector3(), rc = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4(), look = new THREE.Vector3(), camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
    /* a critically damped spring: follows its target with continuous velocity — no jerks, no overshoot, no snapping */
    const spring = (x, v, target, w, dt) => { tmpV2.subVectors(target, x).multiplyScalar(w * w).addScaledVector(v, -2 * w); v.addScaledVector(tmpV2, dt); x.addScaledVector(v, dt); };
    const tmpV2 = new THREE.Vector3(), camS = new THREE.Vector3(), camSV = new THREE.Vector3(), tgtSV = new THREE.Vector3(), camVel = new THREE.Vector3(); let camInit = false;
    const obstacles = [], occluders = [], fxObs = [];
    /* how far each world's visible silhouette reaches, in body radii (air, rings, moons, the black hole's disk) — the
       astronaut is kept clear of it on screen */
    const VIS_R = { maths: 2.25, physics: 2.8, chemistry: 2.3, biology: 2.2, geography: 1.3, cs: 2.1, english: 2.6, history: 2.3, languages: 2.4, social: 1.9, more: 2.2 }; /* including each world's orbiting structures */
    const worldPos = (id, p) => { const G = worlds[id]; if (!G) return V3(PATH[id]); return G.position; };
    const gatherK = p => clamp((p - (N - 2)) / 1, 0, 1); // 0 on the last world, 1 at the overview

    function size() { const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = (q ? 42 : 50) + (w / h < 0.8 ? 14 : 0); camera.updateProjectionMatrix(); st.dirty = true; }
    const ro = new ResizeObserver(() => { size(); rebuildAnchors(); if (st.frames.length) renderer.render(scene, camera); /* no black frame after a resize */ }); ro.observe(stage); size(); rebuildAnchors();

    function placeWorlds(p, t, dt, gOver) {
      const gk = gOver == null ? gatherK(p) : gOver;
      if (gk > 0.05 && dt) st.ringA = (st.ringA || 0) + dt * 0.014 * gk; /* v36: the gathered system turns slowly — a living orbit, not a static diagram */
      const focusId = st.hover || st.sel || (st.flight && st.flight.id), inOverview = gk > 0.9;
      const portrait = camera.aspect < 0.9, ra = portrait ? 0 : (st.ringA || 0), rc = Math.cos(ra), rs = Math.sin(ra);
      W.ORDER.forEach((id, i) => { const G = worlds[id]; if (!G) return; const a = V3(PATH[id]), b = V3(RING(id)); if (portrait) { b.x = O[0] + (b.x - O[0]) * 0.4; b.y += ((i % 4) - 1.5) * 2.5; b.z += 2; } else if (ra) { const dx = b.x - O[0], dz = b.z - O[2]; b.x = O[0] + dx * rc - dz * rs; b.z = O[2] + dx * rs + dz * rc; } /* portrait screens: a narrower, taller constellation instead of a ring cut off at both sides */ const _b = b, k = sstep(clamp(gk * 1.45 - (i % 6) * 0.07, 0, 1));
        /* each world arrives on its own curved path (a quadratic Bézier with a per-world bow), staggered */
        const ctl = a.clone().lerp(b, 0.5).add(tmpV.set(((i * 7) % 5 - 2) * 4, ((i * 3) % 4 - 1.5) * 3.5, 6 + (i % 3) * 3)); const u1 = 1 - k;
        G.position.set(u1 * u1 * a.x + 2 * u1 * k * ctl.x + k * k * b.x, u1 * u1 * a.y + 2 * u1 * k * ctl.y + k * k * b.y, u1 * u1 * a.z + 2 * u1 * k * ctl.z + k * k * b.z);
        let sc = 1 - 0.36 * k;
        /* selection: the chosen world comes forward a little, the others recede; during travel the others clear away */
        const sel = focusId === id, fly = st.flight ? clamp((performance.now() - st.flight.t0) / st.flight.ms, 0, 1) : 0;
        if (inOverview && focusId) { tmpV.subVectors(camera.position, G.position).normalize(); if (sel) { G.position.addScaledVector(tmpV, 1.8 * G.userData.f); sc *= 1 + 0.1 * G.userData.f; } else { G.position.addScaledVector(tmpV, -0.8); sc *= 0.93; } }
        if (fly && !sel) { sc *= 1 - 0.55 * sstep(fly); }
        G.scale.setScalar(sc);
        const kf = i + 3, near = smooth(clamp(1 - (Math.abs(p - kf) - 0.35) / 1.25, 0, 1)), rv = Math.max(near, smooth(clamp((p - (N - 1.6)) / 0.6, 0, 1)) * 0.92, p < 2.6 ? 0 : 0.06);
        const want = (st.hover === id || st.sel === id) ? 1 : 0; G.userData.f += (want - G.userData.f) * (1 - Math.exp(-dt * 7)); G.userData.rv = rv;
        const inView = frustum.intersectsSphere(new THREE.Sphere(G.position, G.userData.radius * 3.2));
        /* the words always read clearly: a distant world drifting behind the text column recedes (shrinks smoothly) while it is there */
        const own = K[Math.round(clamp(p, 0, N - 1))].scene, dist = camera.position.distanceTo(G.position);
        if (own !== id && own !== 'all' && dist > 14 && !st.flight && !st.cruise) { tmpV.copy(G.position).project(camera); const side = own === 'all' ? 0 : PATH[own] ? (PATH[own][0] > 0 ? -1 : 1) : -1;
          const m = side ? smooth(clamp((side * tmpV.x + 0.02) / 0.25, 0, 1)) * smooth(clamp((0.75 - Math.abs(tmpV.y)) / 0.3, 0, 1)) : smooth(clamp((tmpV.y - 0.25) / 0.2, 0, 1)) * smooth(clamp((0.6 - Math.abs(tmpV.x)) / 0.2, 0, 1));
          G.userData.hide = clamp((G.userData.hide || 0) + (m - (G.userData.hide || 0)) * (1 - Math.exp(-dt * 6)), 0, 1); G.scale.multiplyScalar(1 - 0.9 * G.userData.hide); }
        else if (G.userData.hide) { G.userData.hide += (0 - G.userData.hide) * (1 - Math.exp(-dt * 6)); G.scale.multiplyScalar(1 - 0.9 * G.userData.hide); }
        const far = dist > 48 + 20 * G.userData.f; G.userData.setFar(far);
        if ((inView && !far) || reduced()) G.userData.update(t, reduced() ? 0 : dt, rv, G.userData.f); else if (inView) G.userData.core.rotation.y += dt * 0.04; G.visible = inView; });
    }
    const frustum = new THREE.Frustum();

    function cameraAt(p, out, outT) { const a = at(p); out.copy(posC.getPoint(a.u)); outT.copy(tgtC.getPoint(a.u));
      // a gentle arc: approaches swing out sideways (worlds) or rise (the reveal) and settle exactly on the keyframe (sin π·g = 0 at both ends)
      const bow = Math.sin(Math.PI * a.f); if (bow > 0.001) { arcSide.subVectors(outT, out).normalize().cross(arcUp).normalize();
        if (a.i === 1) out.addScaledVector(arcUp, bow * 1.2); else if (a.i >= 2 && a.i < N - 2) out.addScaledVector(arcSide, bow * 1.6 * (a.i % 2 ? 1 : -1)).addScaledVector(arcUp, bow * 0.5); else if (a.i === N - 2) out.addScaledVector(arcUp, bow * 3); }
      return a; }

    function astroUpdate(dt, a, p) {
      if (!astroReady) return; const k0 = K[a.i], k1 = K[Math.min(N - 1, a.i + 1)], camQ = camera.quaternion;
      const lookAtKey = (key, out) => { if (key === 'camera') return out.copy(camera.position).add(tmpV.set(-2.2 + st.ptr.x * 1.5, 0.4 + st.ptr.y * 0.6, 0).applyQuaternion(camQ)); if (key === 'origin') return out.set(...ORIGIN.pos); if (key === 'center') return out.set(...O); if (worlds[key]) return out.copy(worlds[key].position); return out.set(...(PATH[key] || O)); };
      const lk = (st.flight && st.flight.id) || st.hover || st.sel;
      if (lk) lookAtKey(lk, look); else { lookAtKey(k0.look, look); lookAtKey(k1.look, look2); look.lerp(look2, a.f); } /* the gaze blends between scenes */
      const cs = camera.position.distanceTo(st.lastCam) / Math.max(dt, 1e-3); st.camSpeed = (st.camSpeed || 0) + (cs - (st.camSpeed || 0)) * (1 - Math.exp(-dt * 4));
      obstacles.length = 0; W.ORDER.forEach(id => { const G = worlds[id]; if (G && G.visible) { const R = G.userData.radius * G.scale.x; obstacles.push({ p: G.position, r: R * (id === 'physics' ? 2.6 : 1.9) + 0.45, rb: R * (id === 'physics' ? 2.35 : 1.14), rv: R * (VIS_R[id] || 1.6) }); } }); obstacles.push({ p: origin.position, r: ORIGIN.r * 1.07 + 0.5, rb: ORIGIN.r * 1.04, rv: ORIGIN.r * 1.06 });
      /* nearness to a world's resting place (for observing and pointing) and the opening scene (for the wave) */
      const kN = (a.raw == null ? a.f : a.raw) < 0.5 ? k0 : k1, dk = Math.min(a.raw == null ? a.f : a.raw, 1 - (a.raw == null ? a.f : a.raw)), near = PATH[kN.scene] && !lk ? clamp(1 - dk / 0.22, 0, 1) : 0, opening = kN.scene === 'void' && dk < 0.3;
      AST.update({ u: a.u, dt, t: st.t, lookAt: look, still: reduced(), camera, obstacles, near, opening }); st.astroPos.copy(AST.pos);
    }

    function frame(now) {
      raf = 0; if (!alive || !st.visible || document.hidden) return;
      /* v39: never a negative step — a frame's timestamp can precede the performance.now() taken when the loop restarted,
         and a negative step turned every exponential smoothing into an amplifier (a world's scale once grew a thousandfold) */
      const dt = clamp((now - st.last) / 1000, 0, 0.05); st.rdtA = clamp((now - st.last) / 1000, 0, 0.25); st.last = Math.max(st.last, now); const still = reduced(); if (!still) st.t += dt;
      st.frames.push(now); if (st.frames.length > 90) st.frames.shift();
      // progress: damped toward the scroll target (instant with reduced motion)
      const pPrev = st.p; if (!st.cruise) { const gap = Math.abs(st.target - st.p), rate = 3.4 - 1.4 * clamp((gap - 0.6) / 3, 0, 1); /* v36: a soft follow — the camera glides after the scroll */ /* tight for normal scrolling; long jumps (rail, "All worlds") travel at a calmer pace instead of a dizzy whip */
        const rdt = clamp((now - (st.lastP || now - 16)) / 1000, 0, 0.25), fdt = Math.min(0.12, rdt), step = (st.target - st.p) * (1 - Math.exp(-fdt * rate)); /* the speed limit uses real elapsed time, so a stalled frame on a slow device does not slow the journey to a crawl */ /* plus a speed limit (2 scenes/s since v35, a calmer flight): a flick of the wheel or a far jump is flown, never skipped, whatever the frame rate */
        st.p = still ? Math.round(st.target) : st.p + clamp(step, -1.0 * rdt, 1.0 * rdt); } st.lastP = Math.max(st.lastP || 0, now); /* real elapsed time (capped), so slow devices still catch up */ if (Math.abs(st.target - st.p) < 1e-4) st.p = st.target;
      st.ptr.x += (st.ptr.tx - st.ptr.x) * (1 - Math.exp(-dt * 1.8)); st.ptr.y += (st.ptr.ty - st.ptr.y) * (1 - Math.exp(-dt * 1.8));
      // sun: first light sweeps the direction during the first segment
      const dawn = smooth(clamp(st.p - 0.15, 0, 1)); sun.set(...SUN0).lerp(V3(SUN1), dawn).normalize(); W.SUN.v.copy(sun);
      key.position.copy(sun).multiplyScalar(50); key.intensity = 0.5 + 2.0 * dawn; hemi.intensity = 0.18 + 0.16 * dawn; sunGlow.position.copy(sun).multiplyScalar(1500); sunGlow.material.opacity = 0.5 + 0.25 * dawn;
      // camera
      const a = cameraAt(st.p, camPos, camTgt);
      if (st.p > N - 2) { const gk = smooth(gatherK(st.p)); } // (overview keyframe is already at the gathering point)
      let pv = st.p, gOver = null; /* v36: a cinematic move ("All worlds", far rail jumps): one curved camera path, the worlds gathering as it goes */
      if (st.cruise) { const C = st.cruise, k = clamp((now - C.t0) / C.ms, 0, 1), e = 0.5 - 0.5 * Math.cos(Math.PI * k), u1 = 1 - e;
        camPos.set(u1 * u1 * C.p0.x + 2 * u1 * e * C.c.x + e * e * C.p1.x, u1 * u1 * C.p0.y + 2 * u1 * e * C.c.y + e * e * C.p1.y, u1 * u1 * C.p0.z + 2 * u1 * e * C.c.z + e * e * C.p1.z);
        camTgt.lerpVectors(C.q0, C.q1, sstep(k)); pv = C.from + (C.to - C.from) * e; gOver = C.g0 + (C.g1 - C.g0) * smooth(clamp((k - 0.2) / 0.65, 0, 1));
        if (k >= 1) { st.cruise = null; st.p = st.target = C.to; st.tgtS = C.q1.clone(); gOver = null; pv = st.p; C.done && C.done(); } }
      if (st.flight) { const F = st.flight, k = clamp((now - F.t0) / F.ms, 0, 1), e = ease(k); camPos.lerpVectors(F.p0, F.p1, e); camTgt.lerpVectors(F.q0, F.q1, e); o.onFlight && o.onFlight(k, F.id); if (k >= 1) { const id = F.id; st.flight = null; AST.endFlight(); o.onArrive && o.onArrive(id); } }
      else if (st.ret) { const R = st.ret, k = clamp((now - R.t0) / R.ms, 0, 1), e = ease(k); camPos.lerpVectors(R.p0, camPos, e); camTgt.lerpVectors(R.q0, camTgt, e); if (k >= 1) st.ret = null; }
      // the look target is critically damped, so it never snaps when a path, a flight or a return hands over
      const dtr = clamp((now - (st.lastT || now - 16)) / 1000, 0, 0.12); st.lastT = Math.max(st.lastT || 0, now); /* real elapsed time, so slow devices converge as fast as quick ones */
      // v39 cinematic camera: the position and the gaze each follow a critically damped spring (continuous velocity and
      // acceleration), so starts, stops and turns ease in and out like a camera on a dolly — never a snap or a whip
      const scripted = st.flight || st.cruise || st.ret;
      if (!st.tgtS) { st.tgtS = camTgt.clone(); tgtSV.set(0, 0, 0); } /* a jump() resets the gaze */
      if (!camInit || still) { camS.copy(camPos); camSV.set(0, 0, 0); st.tgtS = camTgt.clone(); tgtSV.set(0, 0, 0); camInit = true; }
      else if (scripted) { camS.copy(camPos); camSV.set(0, 0, 0); spring(st.tgtS, tgtSV, camTgt, 9, dtr); }
      else { spring(camS, camSV, camPos, 4.2, dtr); spring(st.tgtS, tgtSV, camTgt, 3.4, dtr); }
      camPos.copy(camS); camTgt.copy(st.tgtS);
      const par = still ? 0 : (innerWidth < 700 ? 0.25 : 1);
      camera.position.copy(camPos); camera.lookAt(camTgt);
      camera.position.add(tmpV.set(st.ptr.x * 0.22 * par, -st.ptr.y * 0.14 * par, 0).applyQuaternion(camera.quaternion)); camera.lookAt(camTgt.x + st.ptr.x * 0.06 * par, camTgt.y - st.ptr.y * 0.04 * par, camTgt.z); /* a gentle handheld parallax with the pointer; the horizon never rolls */
      camera.updateMatrixWorld(); frustum.setFromProjectionMatrix(tmpM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      SKY.update(camera, st.t, dpr); rim.position.copy(camera.position).add(tmpV.set(-6, 3, -10).applyQuaternion(camera.quaternion)); rim.target.position.copy(camera.position); fill.position.copy(camera.position).add(tmpV.set(1.5, 2, 0).applyQuaternion(camera.quaternion)); fill.target.position.copy(st.astroPos); fill.intensity = 0.55 + 0.35 * (1 - dawn);
      placeWorlds(pv, st.t, still ? 0 : dt, gOver);
      if (FX) { camVel.subVectors(camera.position, st.lastCam).divideScalar(Math.max(dt, 1e-3)); if (camVel.length() > 300) camVel.set(0, 0, 0);
        occluders.length = 0; W.ORDER.forEach(id => { const G = worlds[id]; if (G && G.visible) occluders.push({ p: G.position, r: G.userData.radius * G.scale.x }); }); occluders.push({ p: origin.position, r: ORIGIN.r });
        /* rocks keep clear of every world (with room for rings and moons), the great planet, the astronaut and the lens */
        fxObs.length = 0; W.ORDER.forEach(id => { const G = worlds[id]; if (G) fxObs.push({ p: G.position, r: G.userData.radius * G.scale.x * (id === 'physics' ? 3.2 : 2.3) + 1.0 }); });
        fxObs.push({ p: origin.position, r: ORIGIN.r * 1.06 + 2 }); if (AST.ready) fxObs.push({ p: AST.pos, r: 1.5 }); fxObs.push({ p: camera.position, r: 3.2 }); FX.setObstacles(fxObs); if (AST.ready && FX.setSightLine) FX.setSightLine(camera.position, AST.pos, 1.1);
        FX.update(camera, st.t, still ? 0 : dt, camVel, sun, still, occluders); }
      // rim tint follows the world in front of us
      const cur = K[Math.round(clamp(st.p, 0, N - 1))].scene; if (M[cur]) rim.color.lerp(new THREE.Color(M[cur].c[0]).lerp(new THREE.Color(0xc8d4ff), 0.7), 1 - Math.exp(-dt * 2)); /* v44: a hint of the world's colour, not a full tint of the suit */ else rim.color.lerp(new THREE.Color(0x9fb4ff), 1 - Math.exp(-dt * 2));
      oCore.rotation.y += (still ? 0 : dt) * 0.006; oCore.material.uniforms.uT.value = st.t;
      dust.material.uniforms.uPx.value = dpr; dust.material.uniforms.uMove.value += (clamp((st.camSpeed || 0) / 25, 0, 1) - dust.material.uniforms.uMove.value) * (1 - Math.exp(-dt * 4));
      astroUpdate(still ? 0.016 : st.rdtA, st.cruise ? at(pv) : a, pv); /* real elapsed time: the astronaut keeps its real-world pace on slow devices */
      if (st.hover && !st.flight) o.onLabel && o.onLabel(st.hover, project(worlds[st.hover])); else o.onLabel && o.onLabel(null);
      o.onProgress && o.onProgress(st.cruise ? (() => { const C = st.cruise, k = clamp((now - C.t0) / C.ms, 0, 1), sg = Math.sign(C.to - C.from); return k < 0.5 ? C.from + sg * Math.min(0.48, k * 0.96) : C.to - sg * Math.min(0.48, (1 - k) * 0.96); })() : st.p); /* during a cinematic move the old words fade out and the new ones fade in */
      if (o.onNames) { const show = st.p > N - 1.45 && !st.flight; if (show) { const w = stage.clientWidth, h = stage.clientHeight; o.onNames(W.ORDER.map(id => { const G = worlds[id]; if (!G) return null; tmpV.copy(G.position); tmpV.y -= G.userData.radius * G.scale.x * 1.25; tmpV.project(camera); return { id, x: (tmpV.x * 0.5 + 0.5) * w, y: (-tmpV.y * 0.5 + 0.5) * h, on: tmpV.z < 1 }; })); } else if (st.namesShown) o.onNames(null); st.namesShown = show; }
      const t0 = performance.now(); renderer.render(scene, camera); st.cpu.push(performance.now() - t0); if (st.cpu.length > 90) st.cpu.shift();
      adapt(); st.dirty = false; st.lastCam.copy(camera.position);
      const settling = (still ? Math.round(st.target) !== st.p : Math.abs(st.target - st.p) > 1e-4) || Math.abs(st.ptr.tx - st.ptr.x) > 1e-3 || st.flight || st.ret || st.cruise || st.dirty;
      const active = settling || !astroReady || st.hover || now - st.lastInput < 1500;
      if (active) raf = requestAnimationFrame(frame);
      else if (!still) { /* idle: the ambient motion is slow, so it renders at 24 fps (6 fps if frames are very slow), leaving the main thread free */
        const f = st.frames, slow = f.length > 10 && (f[f.length - 1] - f[f.length - 11]) / 10 > 120; idleT = setTimeout(() => { idleT = 0; if (!raf) raf = requestAnimationFrame(frame); }, slow ? 160 : 42); }
      // reduced motion: render only on change
    }
    let raf = 0, idleT = 0, lastAdapt = 0;
    function adapt() { const f = st.frames; if (f.length < 60 || performance.now() - lastAdapt < 2000) return; const span = (f[f.length - 1] - f[0]) / (f.length - 1);
      const floor = q === 0 ? 0.75 : 1; if (span > 24 && dpr > floor) { dpr = Math.max(floor, +(dpr - 0.2).toFixed(2)); renderer.setPixelRatio(dpr); size(); renderer.render(scene, camera); lastAdapt = performance.now(); } /* re-render at once: a resize clears the canvas, which would show one black frame */ else if (span < 17 && dpr < maxDpr) { dpr = Math.min(maxDpr, +(dpr + 0.1).toFixed(2)); renderer.setPixelRatio(dpr); size(); renderer.render(scene, camera); lastAdapt = performance.now(); } }
    const start = () => { if (idleT) { clearTimeout(idleT); idleT = 0; } if (!raf && alive && st.visible && !document.hidden) { st.last = performance.now(); raf = requestAnimationFrame(frame); } };
    function project(G) { if (!G) return null; tmpV.copy(G.position); const r = G.userData.radius * G.scale.x; const top = tmpV.clone().add(new THREE.Vector3(0, -r * 1.25, 0)); tmpV.project(camera); top.project(camera); const w = stage.clientWidth, h = stage.clientHeight;
      return { x: (tmpV.x * 0.5 + 0.5) * w, y: (-top.y * 0.5 + 0.5) * h, behind: tmpV.z > 1 }; }

    /* input */
    let pend = null;
    const onMove = e => { st.lastInput = performance.now(); st.ptr.tx = (e.clientX / innerWidth - 0.5) * 2; st.ptr.ty = (e.clientY / innerHeight - 0.5) * 2; pend = e; start(); };
    const pick = e => { const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); rc.setFromCamera(ndc, camera);
      const cores = Object.values(worlds).filter(G => G.visible).map(G => G.userData.core); const h = rc.intersectObjects(cores, false)[0]; return h ? h.object.userData.world : null; };
    /* a forgiving pick: a click just beside a small, distant world still counts (within ~28 px of its centre on screen) */
    const pickNear = e => { const r = cv.getBoundingClientRect(); let best = null, bd = 28 * 28; Object.entries(worlds).forEach(([id, G]) => { if (!G.visible) return; const v = tmpV.copy(G.position).project(camera); if (v.z > 1) return; const x = r.left + (v.x * 0.5 + 0.5) * r.width, y = r.top + (-v.y * 0.5 + 0.5) * r.height, d = (x - e.clientX) ** 2 + (y - e.clientY) ** 2; if (d < bd) { bd = d; best = id; } }); return best; };
    const hoverTick = () => { if (pend && !st.flight) { const id = pick(pend); if (id !== st.hover) { st.hover = id; cv.style.cursor = id ? 'pointer' : ''; o.onHover && o.onHover(id); } pend = null; } };
    setInterval(() => alive && hoverTick(), 50);
    const onClick = e => { if (e.target.closest('a, button, input, .cz-map, .cz-dock, .cz-label')) return; if (st.flight) return finish(); const id = pick(e) || pickNear(e); if (!id) { if (st.sel) { st.sel = null; o.onHover && o.onHover(null); } return; }
      api.enter(id); }; /* v37: one tap or click travels — the old "tap once to focus, tap again to go" read as a click that did nothing */
    stage.addEventListener('pointermove', onMove, { passive: true }); stage.addEventListener('click', onClick);
    const onVis = () => { if (!document.hidden) start(); }; document.addEventListener('visibilitychange', onVis);
    const io = new IntersectionObserver(es => { st.visible = es[0].isIntersecting; if (st.visible) start(); }, { threshold: 0 }); io.observe(cv);
    const finish = () => { if (!st.flight) return; const id = st.flight.id; st.flight = null; o.onArrive && o.onArrive(id); };

    const api = {
      THREE, stats: () => { const f = st.frames, c = st.cpu.slice().sort((a, b) => a - b); return { fps: f.length > 1 ? 1000 * (f.length - 1) / (f[f.length - 1] - f[0]) : 0, cpuMedian: c[c.length >> 1] || 0, cpuP95: c[Math.floor(c.length * 0.95)] || 0, dpr, tier: q, worlds: Object.keys(worlds).length, astronaut: astroReady, draws: renderer.info.render.calls, tris: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
      setTarget(p) { st.target = clamp(p, 0, N - 1); st.lastInput = performance.now(); start(); }, jump(p) { st.target = st.p = clamp(p, 0, N - 1); st.tgtS = null; camInit = false; st.astroOff = null; AST.resetTrail(); st.dirty = true; start(); }, progress: () => st.p, N,
      hover(id) { st.hover = id; st.dirty = true; start(); },
      enter(id, ms) { if (st.flight) return; /* one journey at a time: a second click (or a double-click) while flying is ignored, never a second overlapping flight */ if (!worlds[id]) { while (queue.length && !worlds[id]) buildNext(); } const G = worlds[id]; if (!G) return; st.sel = id;
        if (reduced() || ms === 0) { o.onArrive && o.onArrive(id); return; }
        const P = G.position.clone(), dir = camera.position.clone().sub(P).normalize(), r = G.userData.radius * G.scale.x;
        { const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(); AST.fly(P, P.clone().addScaledVector(dir, r * 2.6).addScaledVector(side, r * 0.9).add(new THREE.Vector3(0, -r * 0.25, 0)), ms || clamp(1500 + camera.position.distanceTo(P) * 22, 1700, 2600)); }
        st.flight = { id, t0: performance.now(), ms: ms || clamp(1500 + camera.position.distanceTo(P) * 22, 1700, 2600), p0: camera.position.clone(), q0: camTgt.clone(), p1: P.clone().addScaledVector(dir, r * 1.55).add(new THREE.Vector3(0, r * 0.15, 0)), q1: P }; start(); },
      skip: finish, flying: () => !!st.flight || !!st.cruise, cruising: () => !!st.cruise,
      /* a cinematic move to scene `to`: one curved path from wherever the camera is, rising and easing (0.5 − 0.5·cos) */
      cruise(to, done) { to = clamp(to, 0, N - 1); if (reduced() || st.flight) { done && done(); return false; } const p1 = new THREE.Vector3(), q1 = new THREE.Vector3(); cameraAt(to, p1, q1);
        const p0 = camera.position.clone(), q0 = (st.tgtS || camTgt).clone(), d = p0.distanceTo(p1), c = p0.clone().lerp(p1, 0.5).add(new THREE.Vector3(0, Math.min(26, d * 0.22), Math.min(18, d * 0.08)));
        st.cruise = { t0: performance.now(), ms: clamp(2600 + d * 16, 3000, 6500), from: st.p, to, p0, p1, q0, q1, c, g0: gatherK(st.p), g1: gatherK(to), done }; st.lastInput = performance.now(); start(); return true; },
      returnFrom(id) { const G = worlds[id] || (buildNext(), worlds[id]); if (!G) return; placeWorlds(st.p, st.t, 0); const P = G.position.clone(), r = G.userData.radius * G.scale.x; st.ret = { t0: performance.now() + 60, ms: 1100, p0: P.clone().add(new THREE.Vector3(0, r * 0.2, r * 1.7)), q0: P }; start(); },
      debugAstro() { const v = astro.position.clone().project(camera); return { vis: astro.visible, ready: astroReady, pos: astro.position.toArray().map(x => +x.toFixed(2)), cam: camera.position.toArray().map(x => +x.toFixed(2)), ndc: [v.x, v.y, v.z].map(x => +x.toFixed(2)), p: st.p, lead: +AST.lead.toFixed(4), speed: +AST.speed.toFixed(2) }; },
      debugWorld(id) { const G = worlds[id]; if (!G) return null; const v = G.position.clone().project(camera); return { ndc: [v.x, v.y, v.z].map(x => +x.toFixed(3)), revealed: +G.userData.rv.toFixed(2), focus: +G.userData.f.toFixed(2), dist: +camera.position.distanceTo(G.position).toFixed(3) }; },
      debugRaf: () => !!raf || !!idleT, scene, camera, debugWords: id => worlds[id] && worlds[id].userData.words, debugCam: () => camera.position.toArray(), debugScale: id => worlds[id] && worlds[id].scale.x, resetStats() { st.frames.length = 0; st.cpu.length = 0; },
      buildAll() { while (queue.length) buildNext(); },
      /* inspection: render the live scene from any camera (close-ups of the astronaut, a world, the rocks) into an image */
      debugShot(o = {}) { const cam = camera.clone(); if (o.fov) cam.fov = o.fov; cam.aspect = (o.w || 800) / (o.h || 600); cam.updateProjectionMatrix();
        const tg = o.target ? new THREE.Vector3(...o.target) : AST.pos.clone(); if (o.pos) cam.position.set(...o.pos); else if (o.orbit) { const [az, el, d] = o.orbit; cam.position.copy(tg).add(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d)); } cam.lookAt(tg); cam.updateMatrixWorld();
        const sz = new THREE.Vector2(); renderer.getSize(sz); const pr = renderer.getPixelRatio(); renderer.setPixelRatio(1); renderer.setSize(o.w || 800, o.h || 600, false); renderer.render(scene, cam); const url = cv.toDataURL('image/jpeg', 0.9); renderer.setPixelRatio(pr); renderer.setSize(sz.x, sz.y, false); renderer.render(scene, camera); return url; },
      debugAstroState: () => AST.debug ? AST.debug() : null,
      debugThrust: f => { AST.force = f || null; st.dirty = true; start(); },
      kick: start,
      destroy() { alive = false; cancelAnimationFrame(raf); clearTimeout(idleT); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); stage.removeEventListener('pointermove', onMove); stage.removeEventListener('click', onClick);
        Object.values(worlds).forEach(G => G.userData.dispose()); scene.traverse(x => { if (x.userData.rt) x.userData.rt.dispose(); if (x.geometry) x.geometry.dispose(); const m = x.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(mm => { if (mm.map) mm.map.dispose(); mm.dispose(); }); });
        SKY.dispose(); if (FX) FX.dispose(); renderer.dispose(); renderer.forceContextLoss(); cv.remove(); }
    };
    warm(scene); start(); return api;
  }

  /* ---------- device-aware rendering ----------
     A software WebGL renderer (no GPU acceleration: SwiftShader, llvmpipe, Microsoft Basic Render) would draw the universe at a
     few frames a second and keep the page busy; those devices get the painted universe, which tells the same story.
     ?cosmos=gl (or localStorage erly-cosmos = gl) forces the 3D universe, e.g. for inspection; ?cosmos=flat forces paint. */
  let softCache = null;
  const softwareGL = () => { if (softCache !== null) return softCache; softCache = false; try { const c = document.createElement('canvas'), g = c.getContext('webgl'); if (g) { const d = g.getExtension('WEBGL_debug_renderer_info'), r = d ? String(g.getParameter(d.UNMASKED_RENDERER_WEBGL)) : ''; softCache = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r); const l = g.getExtension('WEBGL_lose_context'); l && l.loseContext(); } } catch (e) { /* no WebGL */ } return softCache; };
  const cosmosMode = () => { const q = (location.search.match(/[?&]cosmos=(gl|flat)/) || [])[1]; let ls = null; try { ls = localStorage.getItem('erly-cosmos'); } catch (e) { /* */ } return q || ls || 'auto'; };
  const useGL = () => { const m = cosmosMode(); if (m === 'flat') return false; if (!(LS.has3d && LS.has3d())) return false; return m === 'gl' || !softwareGL(); };
  LS.cosmosUsesGL = useGL;

  /* ---------- painted fallback planets (no WebGL / reduced data) ---------- */
  const orb = (id, big) => { const c = LS.cosmosWorlds.META[id].c; return `<span class="cz-orb${big ? ' cz-orb--big' : ''}" aria-hidden="true" style="--a:${c[0]};--b:${c[1]};--c:${c[2]}"></span>`; };

  /* the painted universe's overview: the eleven worlds on an ellipse, each one a button (shown only without the 3D universe) */
  const ring = () => { const W = LS.cosmosWorlds; return `<div class="cz-ring">${W.ORDER.map((id, i) => { const a = -Math.PI / 2 + (i / 11) * Math.PI * 2, x = 50 + Math.cos(a) * 38, y = 52 + Math.sin(a) * 30; return `<button type="button" class="cz-ring__w" data-cz-dest="${id}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%">${orb(id)}<span>${esc(W.META[id].name)}</span></button>`; }).join('')}</div>`; };

  /* ---------- the route ---------- */
  let current = null;
  /* v37 keep-alive: leaving the universe used to destroy it (GPU resources, shaders, the astronaut) and coming Back rebuilt
     everything — over a second of frozen frames before the page could move. Now the universe is parked when you leave
     (its loop stops by itself once its canvas is off-screen) and Back re-attaches the very same scene in one frame.
     A parked universe is released after a few minutes away, or when the language changes. */
  let parked = null, parkT = 0;
  const langKey = () => (window.I18N && I18N.lang) || document.documentElement.lang || 'en';
  const unpark = () => { clearTimeout(parkT); const p = parked; parked = null; return p; };
  function cosmosHome(view) {
    if (current) { current.destroy(); current = null; }
    const gl0 = useGL();
    if (parked) { const p = unpark(); if (p.lang === langKey() && p.gl === gl0 && p.ctl.resume) { view.replaceChildren(...p.nodes); current = p.ctl; p.ctl.resume(view); return p.ctl; } p.ctl.destroy(); }
    const W = LS.cosmosWorlds, M = W.META, C0 = LS.curriculum, K = keyframes(), N = K.length, gl = gl0;
    const seg = () => (innerWidth < 700 ? 0.8 : 1.05) * innerHeight;
    document.documentElement.classList.add('cz-on');
    view.innerHTML = `<section class="cz${gl ? '' : ' cz--flat'}" aria-label="${T('The ERLY learning universe', 'كون التعلّم في ERLY')}">
      <a class="cz-skip" href="#czAfter" data-cz-skip data-no-rise>${T('Skip the journey', 'تخطَّ الرحلة')}</a>
      <div class="cz-track" data-no-rise style="height:${N}00vh">
        <div class="cz-stage">
          <div class="cz-paint" aria-hidden="true"></div>
          <div class="cz-flat-origin" aria-hidden="true"></div>
          <div class="cz-scenes">${K.map((k, i) => `<div class="cz-scene cz-scene--${k.scene === 'void' ? 'hero' : PATH[k.scene] ? (PATH[k.scene][0] > 0 ? 'left' : 'right') : k.scene === 'all' ? 'all' : 'left'}" data-i="${i}" ${i ? 'hidden' : ''}>${!gl && PATH[k.scene] ? orb(k.scene, true) : ''}<div class="cz-copy">${sceneCopy(k, C0)}</div>${k.scene === 'all' ? ring() : ''}</div>`).join('')}</div>
          <p class="cz-load" role="status" aria-live="polite">${T('Preparing the universe', 'نجهّز الكون')}…</p>
          <div class="cz-names" aria-hidden="true">${W.ORDER.map(id => `<span data-n="${id}">${esc(M[id].name)}</span>`).join('')}</div>
          <div class="cz-label" hidden aria-hidden="true"><b></b><span></span><em>${T('Select to enter', 'اختر للدخول')}</em></div>
          <nav class="cz-rail" aria-label="${T('Journey', 'الرحلة')}">${K.map((k, i) => `<button type="button" data-cz-go="${i}" aria-label="${T('Go to', 'اذهب إلى')}: ${esc(M[k.scene] ? M[k.scene].name : { void: T('The beginning', 'البداية'), light: T('First light', 'الضوء الأول'), universe: T('The universe of knowledge', 'كون المعرفة'), all: T('The whole universe', 'الكون كله') }[k.scene])}"><i></i></button>`).join('')}</nav>
          <div class="cz-tools"><button type="button" class="cz-tool" data-cz-map aria-haspopup="dialog">${T('Destinations', 'الوجهات')}</button><button type="button" class="cz-tool" data-cz-end>${T('All worlds', 'كل العوالم')} ↓</button></div>
          <div class="cz-dock"></div>
        </div>
      </div>
      <div class="cz-map" data-no-rise role="dialog" aria-modal="true" aria-labelledby="czMapH" hidden><div class="cz-map__in">
        <div class="cz-map__head"><h2 id="czMapH">${T('Destinations', 'الوجهات')}</h2><button type="button" class="cz-tool" data-cz-close aria-label="${T('Close', 'إغلاق')}">✕</button></div>
        <label class="cz-map__find"><span class="sr-only">${T('Find a world', 'ابحث عن عالم')}</span><input type="search" data-cz-find placeholder="${T('Find a world or topic…', 'ابحث عن عالم أو موضوع…')}" autocomplete="off"></label>
        <ul class="cz-map__list">${W.ORDER.map(id => `<li data-k="${esc((M[id].name + ' ' + M[id].kick + ' ' + M[id].line).toLowerCase())}"><button type="button" data-cz-dest="${id}">${orb(id)}<b>${esc(M[id].name)}</b><small>${esc(M[id].kick)}</small></button></li>`).join('')}</ul>
        <p class="cz-map__more"><a href="#/space">${T('Solar System Explorer', 'مستكشف النظام الشمسي')}</a><a href="#/path">${T('Learning path', 'مسار التعلّم')}</a><a href="#/constellation">${T('Knowledge map', 'خريطة المعرفة')}</a></p>
      </div></div>
    </section>
    <section class="cz-index" aria-labelledby="czIdxH"><h2 id="czIdxH" class="cz-index__h">${T('Every world', 'كل العوالم')}</h2>
      <ol class="cz-index__list">${W.ORDER.map(id => { const n = C0 ? C0.bySubject(id).reduce((a, c) => a + c.chapters.length, 0) : 0; return `<li><a href="#/world/${id}" data-cz-idx="${id}">${orb(id)}<span><b>${esc(M[id].name)}</b><small>${esc(M[id].line)}</small></span><em>${n} ${T('chapters', 'فصول')}</em></a></li>`; }).join('')}</ol></section>
    <div id="czAfter" class="cz-after" data-embed="1" tabindex="-1"></div>`;
    /* the universe starts at the very top of the document, under the transparent header; measured after layout settles
       (the router resets the previous page's scroll after rendering) and again on resize */
    const fitTop = () => { const c = view.querySelector('.cz'); if (!c) return; c.style.marginTop = '0px'; const top = Math.max(0, c.getBoundingClientRect().top + scrollY); c.style.setProperty('--cz-top', top + 'px'); c.style.marginTop = ''; };
    fitTop(); requestAnimationFrame(() => { fitTop(); onScroll && onScroll(); }); addEventListener('resize', fitTop);
    const root = view.querySelector('.cz'), track = root.querySelector('.cz-track'), stage = root.querySelector('.cz-stage'), scenes = [...root.querySelectorAll('.cz-scene')], rail = [...root.querySelectorAll('[data-cz-go]')], label = root.querySelector('.cz-label'), map = root.querySelector('.cz-map');
    // the learning sections of the home follow the journey; the storage choice floats as a small card until answered
    const after = view.querySelector('#czAfter'); if (LS.__uvHome) LS.__uvHome(after);
    const choice = after.querySelector('.at-choice'); if (choice) root.querySelector('.cz-dock').appendChild(choice);
    paintFallback(root.querySelector('.cz-paint'));

    /* scroll → progress */
    let onScroll = null;
    const progressFromScroll = () => { const r = track.getBoundingClientRect(), span = r.height - innerHeight; return clamp(-r.top / Math.max(1, span), 0, 1) * (N - 1); };
    const scrollToScene = (i, inst) => { const r = track.getBoundingClientRect(), span = r.height - innerHeight, y = scrollY + r.top + (i / (N - 1)) * span; scrollTo({ top: y + 2, behavior: inst || reduced() ? 'instant' : 'smooth' }); }; /* 'instant', not 'auto': the site sets scroll-behavior: smooth */
    let shown = -1;
    const onProgress = p => { // text, rail and label follow the damped progress
      scenes.forEach((el, i) => { const d = p - i, op = clamp(1 - Math.abs(d) * 2.1, 0, 1), was = el.dataset.op; const v = op.toFixed(3); if (v === was) return; el.dataset.op = v; el.style.opacity = v; el.style.transform = `translate3d(0, ${(-d * 46).toFixed(1)}px, 0)`; el.hidden = op < 0.02; });
      const k = Math.round(p); if (k !== shown) { shown = k; rail.forEach((b, i) => b.toggleAttribute('aria-current', i === k)); root.dataset.scene = K[k].scene; }
    };
    let U = null; const flat = !gl;
    onScroll = () => { const p = progressFromScroll(); if (U) U.setTarget(p); else onProgress(p); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();

    /* v37: the veil starts to close during the last part of the flight, while the camera is still moving, so the arrival
       is one continuous motion (no still frame between "arrived" and "new page") and the page swap happens behind it */
    let veilAt = 0;
    const veilOn = id => { if (veilAt) return; const veil = veilEl(); veil.style.setProperty('--vc', M[id].c[2]); veil.classList.remove('is-off'); void veil.offsetWidth; veil.classList.add('is-on'); veilAt = performance.now(); };
    const onFlight = (k, id) => { if (k > 0.66) veilOn(id); };
    const arrive = id => { veilOn(id); try { sessionStorage.setItem('cz-return', JSON.stringify({ id, y: scrollY, at: Date.now() })); } catch (e) { /* */ }
      const wait = reduced() ? 0 : Math.max(40, 320 - (performance.now() - veilAt)); veilAt = 0;
      LS.__czArrive = id; setTimeout(() => LS.go('world/' + id), wait); }; /* change page only once the veil is fully opaque, so the swap is never seen */
    const enter = id => { if (U) U.enter(id); else arrive(id); };
    const labelFocus = { id: null };
    const labelShow = (id, pos) => { labelFocus.id = id; if (!id || !pos || pos.behind) { label.hidden = true; return; } if (label.dataset.id !== id) { label.dataset.id = id; label.querySelector('b').textContent = M[id].name; label.querySelector('span').textContent = M[id].line; } label.hidden = false; label.style.transform = `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0) translate(-50%, 8px)`; };

    /* clicks and keys */
    root.addEventListener('click', e => {
      const en = e.target.closest('[data-cz-enter]'); if (en) { enter(en.dataset.czEnter); return; }
      const go = e.target.closest('[data-cz-go]'); if (go) { const to = +go.dataset.czGo; if (U && Math.abs(to - U.progress()) > 1.5 && U.cruise(to, () => scrollToScene(to, true))) return; scrollToScene(to, true); return; } /* the page jumps; the camera flies there through its own damping */
      if (e.target.closest('[data-cz-end]')) { if (U && U.progress() < N - 1.5 && U.cruise(N - 1, () => scrollToScene(N - 1, true))) return; scrollToScene(N - 1, true); return; } /* v36: one cinematic move to the whole system instead of racing past every world */
      if (e.target.closest('[data-cz-skip]')) { e.preventDefault(); after.focus({ preventScroll: true }); view.querySelector('.cz-index').scrollIntoView({ behavior: 'instant' }); return; } /* a skip is instant */
      if (e.target.closest('[data-cz-map]')) { openMap(); return; } if (e.target.closest('[data-cz-close]') || e.target === map) { closeMap(); return; }
      const d = e.target.closest('[data-cz-dest]'); if (d) { closeMap(); enter(d.dataset.czDest); }
    });
    const opener = { el: null };
    const findIn = map.querySelector('[data-cz-find]'), filter = () => { const v = findIn.value.trim().toLowerCase(); map.querySelectorAll('.cz-map__list li').forEach(li => { li.hidden = !!v && !li.dataset.k.includes(v); }); };
    const openMap = () => { opener.el = document.activeElement; findIn.value = ''; filter(); map.hidden = false; requestAnimationFrame(() => map.classList.add('is-open')); map.querySelector('[data-cz-find]').focus(); };
    const closeMap = () => { map.classList.remove('is-open'); map.hidden = true; opener.el && opener.el.focus && opener.el.focus(); };
    findIn.addEventListener('input', filter); findIn.addEventListener('search', filter); /* Escape in a search box clears it without an input event */
    map.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeMap(); } if (e.key === 'Tab') { const f = [...map.querySelectorAll('button, input, a')].filter(x => !x.closest('[hidden]')); if (!f.length) return; const a = f[0], b = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); } else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); } } });
    map.querySelectorAll('[data-cz-dest]').forEach(b => { b.addEventListener('focus', () => U && U.hover(b.dataset.czDest)); b.addEventListener('mouseenter', () => U && U.hover(b.dataset.czDest)); });
    root.querySelectorAll('[data-cz-enter]').forEach(b => { b.addEventListener('focus', () => { U && U.hover(b.dataset.czEnter); }); b.addEventListener('blur', () => U && U.hover(null)); });
    const onKey = e => { if (U && U.flying() && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); U.skip(); } };
    addEventListener('keydown', onKey, true);
    const onWheelSkip = () => { if (U && U.flying()) U.skip(); }; addEventListener('wheel', onWheelSkip, { passive: true });

    const past = new IntersectionObserver(es => document.documentElement.classList.toggle('cz-past', !es[0].isIntersecting), { threshold: 0, rootMargin: '-64px 0px 0px 0px' }); past.observe(stage.parentElement);
    const detach = () => { removeEventListener('resize', fitTop); removeEventListener('scroll', onScroll); removeEventListener('keydown', onKey, true); removeEventListener('wheel', onWheelSkip); past.disconnect(); document.documentElement.classList.remove('cz-on', 'cz-past'); };
    const ctl = {
      destroy() { detach(); if (U) U.destroy(); U = null; LS.__cosmos = null; },
      park(nodes) { detach(); if (U && U.flying()) U.skip && U.skip(); LS.__cosmos = null; return { nodes, ctl, lang: langKey(), gl }; },
      resume() { /* the router sets the scroll right after this returns; everything that depends on it runs in the next frame */
        document.documentElement.classList.add('cz-on'); addEventListener('resize', fitTop); addEventListener('scroll', onScroll, { passive: true }); addEventListener('keydown', onKey, true); addEventListener('wheel', onWheelSkip, { passive: true }); past.observe(stage.parentElement);
        const old = root.querySelector('.cz-dock .at-choice'); if (old) old.remove(); after.innerHTML = ''; if (LS.__uvHome) LS.__uvHome(after); const ch = after.querySelector('.at-choice'); if (ch) root.querySelector('.cz-dock').appendChild(ch);
        label.hidden = true; if (U) { LS.__cosmos = U; U.hover(null); }
        requestAnimationFrame(() => { if (current !== ctl) return; fitTop(); const p = progressFromScroll(); if (U) { U.jump(p); U.kick(); let ret = null; try { ret = JSON.parse(sessionStorage.getItem('cz-return') || 'null'); sessionStorage.removeItem('cz-return'); } catch (e) { /* */ } if (ret && M[ret.id] && Date.now() - ret.at < 30 * 60 * 1000) U.returnFrom(ret.id); } else onProgress(p); });
      }
    };
    current = ctl;

    if (!flat) {
      root.classList.add('is-loading');
      universe(stage, { onLoad: L => { const el = root.querySelector('.cz-load'); if (!el) return; if (L.failed) el.textContent = T('The astronaut could not load — the universe still works.', 'تعذّر تحميل رائد الفضاء'); else el.textContent = `${T('Preparing the universe', 'نجهّز الكون')} · ${L.worlds}/11 ${T('worlds', 'عوالم')}${L.astro ? '' : ' · ' + T('astronaut', 'رائد الفضاء')}…`; if (L.astro && L.worlds >= 11) { el.textContent = T('The universe is ready.', 'الكون جاهز.'); root.classList.add('is-ready'); } else if (L.astro && L.worlds >= 4) root.classList.add('is-ready'); },
        onNames: list => { const box = root.querySelector('.cz-names'); if (!list) { box.classList.remove('is-on'); return; } box.classList.add('is-on'); list.forEach(n => { if (!n) return; const el = box.querySelector(`[data-n="${n.id}"]`); el.style.transform = `translate3d(${Math.round(n.x)}px, ${Math.round(n.y)}px, 0) translate(-50%, 0)`; el.style.opacity = n.on ? '' : '0'; el.classList.toggle('is-focus', n.id === labelFocus.id); }); },
        onProgress, onLabel: labelShow, onHover: id => { if (!id) label.hidden = true; }, onArrive: arrive, onFlight, onAstronaut: ok => root.classList.toggle('has-astro', ok) }).then(u => {
        if (current !== ctl && !(parked && parked.ctl === ctl)) { u.destroy(); return; } U = u; if (current === ctl) LS.__cosmos = u; root.classList.remove('is-loading'); root.classList.add('is-live'); const p = progressFromScroll(); u.jump(p);
        let ret = null; try { ret = JSON.parse(sessionStorage.getItem('cz-return') || 'null'); sessionStorage.removeItem('cz-return'); } catch (e) { /* */ }
        if (ret && Date.now() - ret.at < 30 * 60 * 1000 && M[ret.id]) { /* Back restores the scroll position; once it has, pull the camera back out of the world we visited */ setTimeout(() => { if (current !== ctl) return; const y = Math.abs(scrollY - ret.y) > 40 && scrollY < 10 ? (scrollTo({ top: ret.y, behavior: 'instant' }), ret.y) : scrollY; u.jump(progressFromScroll()); u.returnFrom(ret.id); }, 120); }
      }).catch(err => { console.warn('cosmos: falling back to the painted universe', err); root.classList.remove('is-loading'); root.classList.add('cz--flat'); scenes.forEach(el => { const s = K[+el.dataset.i].scene; if (PATH[s] && !el.querySelector('.cz-orb')) el.insertAdjacentHTML('afterbegin', orb(s, true)); }); });
    }
    return ctl;
  }

  /* a still, painted sky for the first paint and for devices without WebGL */
  function paintFallback(el) { const c = document.createElement('canvas'), w = 1200, h = 800; c.width = w; c.height = h; const g = c.getContext('2d'); let s = 42; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const bg = g.createRadialGradient(w * 0.3, h * 0.85, 0, w * 0.3, h * 0.85, w); bg.addColorStop(0, '#16204a'); bg.addColorStop(0.45, '#070b1c'); bg.addColorStop(1, '#02030a'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    [['rgba(80,140,200,0.10)', 0.7, 0.3, 380], ['rgba(170,80,190,0.08)', 0.25, 0.25, 320], ['rgba(255,150,90,0.05)', 0.85, 0.7, 300]].forEach(([col, x, y, r]) => { const gr = g.createRadialGradient(w * x, h * y, 0, w * x, h * y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    for (let i = 0; i < 900; i++) { const b = R(); g.fillStyle = `rgba(${b > 0.8 ? '255,236,214' : '220,230,255'},${0.25 + R() * 0.7})`; const z = R() < 0.03 ? 2 : 1; g.fillRect(R() * w, R() * h, z, z); }
    el.appendChild(c); }

  function veilEl() { let v = document.getElementById('czVeil'); if (!v) { v = document.createElement('div'); v.id = 'czVeil'; v.className = 'cz-veil'; v.setAttribute('aria-hidden', 'true'); document.body.appendChild(v); } return v; }
  LS.on('route', ({ area }) => { const v = document.getElementById('czVeil'); if (v && v.classList.contains('is-on') && area !== 'home') setTimeout(() => v.classList.remove('is-on'), 420); }); /* the veil lifts after the world page has built its first frames, so its set-up hitch is never visible */
  LS.on('leave', a => { if (a !== 'home' || !current) return; const view = document.getElementById('lsView'), c = current; current = null;
    if (!c.park || !view || !view.querySelector(':scope > .cz')) { c.destroy(); return; }
    if (parked) unpark().ctl.destroy();
    parked = c.park([...view.childNodes]); parkT = setTimeout(() => { const p = unpark(); if (p) p.ctl.destroy(); }, 4 * 60 * 1000); });
  document.addEventListener('erly:lang', () => { const p = unpark(); if (p) p.ctl.destroy(); });

  /* ---------- the subject world's own planet, live in its page header (#/world/<id>) ---------- */
  let worldPlanet = null;
  async function mountWorldPlanet(head, id) {
    const { THREE } = await LS.three(); if (!head.isConnected) return null; const W = LS.cosmosWorlds, q = Math.min(1, tierOf());
    const host = document.createElement('div'); host.className = 'cz-wp'; host.setAttribute('aria-hidden', 'true'); head.appendChild(host);
    const renderer = new THREE.WebGLRenderer({ antialias: (devicePixelRatio || 1) < 1.5, alpha: true, stencil: false }); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); host.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200); camera.position.set(0, 1.4, 9.5); camera.lookAt(0, 0, 0);
    if (!W.SUN.v) W.SUN.v = new THREE.Vector3(); W.SUN.v.set(...SUN1).normalize();
    const key = new THREE.DirectionalLight(0xfff1df, 2.4); key.position.copy(W.SUN.v).multiplyScalar(20); scene.add(key, new THREE.HemisphereLight(0x9fb0d8, 0x0b0d14, 0.45));
    W.SUN.renderer = renderer; const G = W.build(THREE, id, q); scene.add(G); const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    /* v40: this canvas is transparent over the page header. Additive glows (an accretion disk, a lensing halo, jets,
       atmospheres) must only ADD light: left as they are, they also wrote full opacity into the alpha channel, which showed
       as black squares and ellipses around the black hole. Their alpha is now left untouched; the browser composites the
       premultiplied colour as pure added light. */
    G.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(m => { if (m.blending === THREE.AdditiveBlending) { m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.SrcAlphaFactor; m.blendDst = THREE.OneFactor; m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor; m.needsUpdate = true; } }); });
    let raf = 0, last = performance.now(), t = 0, vis = true, alive = true, rv = 0;
    const size = () => { const w = host.clientWidth || 300, h = host.clientHeight || 200; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(size); ro.observe(host); size();
    const frame = now => { raf = 0; if (!alive || !vis || document.hidden) return; const dt = clamp((now - last) / 1000, 0, 0.05); last = Math.max(last, now); const still = reduced(); if (!still) t += dt;
      rv = still ? 1 : Math.min(1, rv + dt * 0.8); ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06; G.rotation.x = ptr.y * 0.15; G.rotation.y = ptr.x * 0.35;
      G.userData.update(t, still ? 0 : dt, smooth(rv), 0); renderer.render(scene, camera); if (!still || rv < 1) raf = requestAnimationFrame(frame); };
    const start = () => { if (!raf && alive) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) start(); }); io.observe(host);
    const mv = e => { const r = head.getBoundingClientRect(); ptr.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ptr.ty = ((e.clientY - r.top) / r.height - 0.5) * 2; start(); }; head.addEventListener('pointermove', mv, { passive: true });
    start();
    return { destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); head.removeEventListener('pointermove', mv); G.userData.dispose(); renderer.dispose(); renderer.forceContextLoss(); host.remove(); } };
  }
  LS.on('route', ({ area, parts }) => {
    if (worldPlanet) { worldPlanet.then(x => x && x.destroy()); worldPlanet = null; }
    if (area !== 'world' || !LS.cosmosWorlds.META[parts[1]] || !useGL()) return;
    const head = document.querySelector('#lsView .uv-wh'); if (!head) return; head.classList.add('has-planet');
    /* v37: the header planet (its own WebGL context and shaders) is built once the page has been shown and has settled —
       not in the same task as the page — so opening a world never stalls; it then fades in */
    const id = parts[1]; worldPlanet = new Promise(res => { const go = () => { if (!head.isConnected) return res(null); mountWorldPlanet(head, id).then(res, () => res(null)); }; const later = () => (window.requestIdleCallback ? requestIdleCallback(go, { timeout: 700 }) : setTimeout(go, 120)); setTimeout(later, LS.__czArrive ? 650 : 180); }); LS.__czArrive = null;
  });

  LS.cosmosKeyframes = keyframes; LS.cosmosPATH = PATH;
  LS.cosmosHome = cosmosHome;
  LS.route('home', cosmosHome);
})();
