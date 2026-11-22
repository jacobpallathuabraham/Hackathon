/* ERLY Learning Studio — the cinematic universe (#/home).

   The opening of the Studio is a scroll-driven journey through a rendered universe: the void, first light, the eleven
   subject worlds one by one, and finally the whole universe gathered so a student can choose where to go.

   Architecture (one file per concern would be over-split for ~700 lines; the sections below are independent):
     Quality      tier from the device (0 phone · 1 modest · 2 capable) + adaptive pixel ratio from measured frame times
     Sky          a nebula + star panorama rendered ONCE on the GPU into a texture; star and dust point layers for parallax;
                  painted galaxies and soft clouds as distant billboards
     Light        a sun whose direction sweeps from behind the great planet ("first light") to its working angle
     Worlds       LS.cosmosWorlds.build() — built progressively (nearest first, the rest in idle time)
     Astronaut    GLB (Poly by Google, CC-BY; see CREDITS) with procedural zero-gravity motion, steered by the camera path
     Camera       two Catmull-Rom splines (position, look target) through 15 keyframes; each segment eased with a dwell
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
  const SUN0 = [-0.5, -0.33, -0.8], SUN1 = [0.6, 0.4, 0.69]; // behind the great planet → working angle

  function keyframes() {
    const W = LS.cosmosWorlds, K = [];
    const add = (pos, tgt, astro, look, scene) => K.push({ pos, tgt, astro, look, scene });
    add([0, 0.4, 12], [-2, -0.6, -20], [1.25, -0.3, -3.3], 'camera', 'void');
    add([3, 2.2, -2], [-9, -5, -44], [-1.2, -0.55, -3.9], 'origin', 'light');
    add([0, 5, -8], [1, 0, -64], [0.95, -0.7, -3.8], 'maths', 'universe');
    W.ORDER.forEach(id => { const P = PATH[id], s = Math.sign(P[0]) || 1;
      add([P[0] - s * 1.4, P[1] + 0.7, P[2] + 6.6], [P[0] - s * 2.5, P[1] - 0.25, P[2] - 1], [s * 0.42, -0.74, -3.7], id, id); }); // astronaut between the words and the world, facing the world
    add([O[0], O[1] + 9.5, O[2] + 30], [O[0], O[1] - 3.2, O[2]], [3.5, -1.7, -7.4], 'center', 'all');
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

  /* ---------- painted textures (galaxies, clouds, glow) ---------- */
  function glowTex(THREE, inner, outer) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(0.18, inner); gr.addColorStop(0.45, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  function galaxyTex(THREE, seed, hue) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); let s = seed; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const core = g.createRadialGradient(256, 256, 0, 256, 256, 90); core.addColorStop(0, 'rgba(255,240,215,0.9)'); core.addColorStop(1, 'rgba(255,220,180,0)'); g.fillStyle = core; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5200; i++) { const arm = i % 2, t = R() * 4.2, a = t * 1.25 + arm * Math.PI + (R() - 0.5) * 0.55, r = 18 + t * 52 + (R() - 0.5) * 22; const x = 256 + Math.cos(a) * r, y = 256 + Math.sin(a) * r;
      const b = R(); g.fillStyle = b > 0.93 ? 'rgba(255,255,255,0.8)' : `hsla(${hue + R() * 30},70%,${70 + R() * 20}%,${0.08 + R() * 0.22})`; const z = b > 0.93 ? 1.4 : 1 + R() * 2.4; g.fillRect(x, y, z, z); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function cloudTex(THREE, seed, col) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); let s = seed; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 46; i++) { const x = 128 + (R() - 0.5) * 120, y = 128 + (R() - 0.5) * 80, r = 20 + R() * 60, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace('A', (0.06 + R() * 0.08).toFixed(3))); gr.addColorStop(1, col.replace('A', '0')); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  /* ---------- the universe ---------- */
  async function universe(stage, o) {
    const { THREE } = await LS.three(); const W = LS.cosmosWorlds, M = W.META; let q = tierOf();
    const renderer = new THREE.WebGLRenderer({ antialias: q > 0, powerPreference: 'high-performance', alpha: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
    const maxDpr = Math.min(devicePixelRatio || 1, [1.5, 1.6, 2][q]); let dpr = maxDpr; renderer.setPixelRatio(dpr);
    const cv = renderer.domElement; cv.className = 'cz-cv'; cv.setAttribute('aria-hidden', 'true'); stage.prepend(cv);
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(q ? 42 : 50, 16 / 9, 0.05, 4000);
    const disposables = [];

    /* sun and lights */
    const sun = new THREE.Vector3(...SUN0).normalize(); W.SUN.v = W.SUN.v || new THREE.Vector3(); W.SUN.v.copy(sun);
    const key = new THREE.DirectionalLight(0xfff1df, 2.4); scene.add(key, key.target); const hemi = new THREE.HemisphereLight(0x8a9cc8, 0x0b0d14, 0.32); scene.add(hemi);
    const rim = new THREE.DirectionalLight(0x9fb4ff, 0.9); scene.add(rim, rim.target);
    const fill = new THREE.DirectionalLight(0xc8d2ff, 0.75); scene.add(fill, fill.target); // a soft light from the viewer's side, so the astronaut is never a silhouette
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(THREE, 'rgba(255,246,228,1)', 'rgba(255,170,90,0.22)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    sunGlow.scale.setScalar(150); scene.add(sunGlow);

    /* sky: nebula + stars painted once into an equirectangular render target */
    const rtW = [1024, 2048, 2048][q], rt = new THREE.WebGLRenderTarget(rtW, rtW / 2, { colorSpace: THREE.LinearSRGBColorSpace, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    { const bake = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ depthTest: false, uniforms: {}, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
        fragmentShader: `#define OCT ${q ? 5 : 4}\nvarying vec2 vUv; ${W.NOISE}
        float h3(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
        float stars(vec3 d,float sc,float th){ vec3 g=d*sc; vec3 c=floor(g); float h=h3(c); if(h<th) return 0.0; vec3 j=vec3(h3(c+1.3),h3(c+2.7),h3(c+5.1)); float dist=length(fract(g)-j); return smoothstep(0.42,0.0,dist)*(h-th)/(1.0-th); }
        void main(){ float lon=(vUv.x-0.5)*6.2831853, lat=(vUv.y-0.5)*3.14159265; vec3 d=vec3(cos(lat)*sin(lon),sin(lat),cos(lat)*cos(lon));
          vec3 axis=normalize(vec3(0.35,0.86,0.36)); float band=exp(-pow(dot(d,axis)*2.4,2.0));
          float n1=fbm(d*1.7+3.1), n2=fbm(d*3.4+9.2), n3=fbm(d*6.0-2.0);
          vec3 col=vec3(0.004,0.006,0.016)+vec3(0.006,0.008,0.02)*band;
          col+=vec3(0.03,0.13,0.17)*smoothstep(0.0,0.75,n1)*(0.35+band);
          col+=vec3(0.16,0.05,0.2)*smoothstep(0.15,0.85,n2)*band*0.9;
          col+=vec3(0.28,0.12,0.05)*smoothstep(0.45,0.95,n1*n2*2.0+0.3)*band*0.55;
          col*=1.0-0.75*smoothstep(0.1,0.6,n3)*band;
          float s=stars(d,180.0,0.972)*1.3+stars(d,420.0,0.986)*0.8+stars(d,900.0,0.993)*0.5*(0.4+band);
          vec3 sc=mix(vec3(0.75,0.85,1.0),vec3(1.0,0.85,0.7),h3(floor(d*180.0)));
          gl_FragColor=vec4(col+s*sc,1.0); }` }));
      const bs = new THREE.Scene(); bs.add(bake); const bc = new THREE.Camera(); renderer.setRenderTarget(rt); renderer.render(bs, bc); renderer.setRenderTarget(null); bake.geometry.dispose(); bake.material.dispose(); }
    const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 32), new THREE.MeshBasicMaterial({ map: rt.texture, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false })); sky.rotation.y = 1.1; scene.add(sky);

    /* star layers (real 3D points: they parallax as the camera travels) and near dust */
    const pointsLayer = (n, spread, sizeA, sizeB, seed, warm) => { let s = seed; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const P = new Float32Array(n * 3), S = new Float32Array(n), Cc = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { let x, y, z; do { x = (R() - 0.5) * spread[0]; y = (R() - 0.5) * spread[1]; z = 60 - R() * spread[2]; } while (Math.abs(x) < 14 && Math.abs(y) < 9); P.set([x, y, z], i * 3); S[i] = sizeA + R() * R() * sizeB; const w = R(); Cc.set(warm && w > 0.7 ? [1, 0.86, 0.72] : w < 0.25 ? [0.75, 0.85, 1] : [1, 1, 1], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('size', new THREE.BufferAttribute(S, 1)); g.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uPx: { value: dpr } },
        vertexShader: 'attribute float size; attribute vec3 color; uniform float uT; uniform float uPx; varying vec3 vC; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; float tw=0.75+0.25*sin(uT*1.3+position.x*3.1+position.z); gl_PointSize=clamp(size*uPx*(220.0/-mv.z),1.0,9.0*uPx); vC=color; vA=tw*clamp(-mv.z/30.0,0.0,1.0); }',
        fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); float a=smoothstep(0.5,0.0,d); a*=a; gl_FragColor=vec4(vC*a*vA,1.0); }' });
      const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts; };
    const stars = pointsLayer([1400, 3000, 5200][q], [700, 420, 900], 0.5, 2.6, 7, true);
    const dust = pointsLayer([140, 300, 520][q], [90, 50, 360], 0.12, 0.35, 19, false);

    const far = []; [[[-520, 260, -900], 340, 3, 210], [[760, -180, -1100], 260, 11, 25], [[-900, -320, -400], 220, 23, 280]].forEach(([p, s, seed, hue]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: galaxyTex(THREE, seed, hue), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, fog: false })); m.position.set(...p); m.lookAt(0, 0, -150); m.rotateX(0.9); m.rotateZ(seed); scene.add(m); far.push(m); });
    const clouds = []; [[[-26, 8, -70], 46, 'rgba(110,150,255,A)', 5], [[30, -10, -110], 54, 'rgba(255,140,170,A)', 9], [[-36, -14, -170], 60, 'rgba(120,255,220,A)', 13], [[34, 12, -230], 58, 'rgba(255,200,130,A)', 17], [[0, 18, -300], 90, 'rgba(160,140,255,A)', 21]].forEach(([p, s, c, seed]) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex(THREE, seed, c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 })); sp.position.set(...p); sp.scale.setScalar(s); scene.add(sp); clouds.push(sp); });

    /* the great planet of the opening ("Origin"): marbled indigo with a thin bright atmosphere — the sun rises from behind its limb */
    const origin = new THREE.Group(); origin.position.set(...ORIGIN.pos);
    const oCore = W.surface(THREE, q, ORIGIN.r, 4, ['#3e57c9', '#a9b8ff', '#0b1030'], 11.3, [40, 72, 96][q]); origin.add(oCore, W.atmosphere(THREE, ORIGIN.r * 1.035, '#8fb0ff', 1.6)); scene.add(origin);

    /* worlds: nearest first, the rest in idle time */
    const worlds = {}; const queue = W.ORDER.slice();
    const buildNext = () => { const id = queue.shift(); if (!id) return; const G = W.build(THREE, id, q); G.position.set(...PATH[id]); G.userData.f = 0; G.userData.rv = 0; scene.add(G); worlds[id] = G; };
    buildNext(); buildNext();
    const idle = window.requestIdleCallback || (f => setTimeout(f, 60)); const idleBuild = () => { if (!alive || !queue.length) return; buildNext(); idle(idleBuild, { timeout: 400 }); }; let alive = true; idle(idleBuild, { timeout: 400 });

    /* astronaut */
    const astro = new THREE.Group(); astro.visible = false; scene.add(astro); const inner = new THREE.Group(); astro.add(inner);
    const jet = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(THREE, 'rgba(200,225,255,1)', 'rgba(110,160,255,0.25)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); jet.position.set(0, 0.12, -0.32); jet.scale.setScalar(0.35); inner.add(jet);
    let astroReady = false;
    import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => new GLTFLoader().loadAsync('assets/models/astronaut.glb')).then(g => { if (!alive) return;
      const m = g.scene; m.traverse(x => { if (x.isMesh) { x.material.color.setScalar(1); x.material.roughness = 0.72; x.material.metalness = 0.05; x.castShadow = false; } });
      m.position.set(0, -1.0, 0); const holder = new THREE.Group(); holder.add(m); holder.scale.setScalar(0.42); inner.add(holder); astroReady = true; astro.visible = true; astro.userData.fade = 0; o.onAstronaut && o.onAstronaut(true);
    }).catch(() => { o.onAstronaut && o.onAstronaut(false); });

    /* camera choreography */
    const K = keyframes(), N = K.length, V3 = a => new THREE.Vector3(...a);
    const posC = new THREE.CatmullRomCurve3(K.map(k => V3(k.pos)), false, 'centripetal'), tgtC = new THREE.CatmullRomCurve3(K.map(k => V3(k.tgt)), false, 'centripetal');
    const at = p => { const i = clamp(Math.floor(p), 0, N - 2), f = clamp(p - i, 0, 1), g = smooth(clamp((f - 0.1) / 0.8, 0, 1)); return { i, f: g, u: (i + g) / (N - 1) }; };

    /* state */
    const st = { lastInput: 0, target: 0, p: 0, ptr: { x: 0, y: 0, tx: 0, ty: 0 }, hover: null, sel: null, flight: null, ret: null, t: 0, last: performance.now(), frames: [], cpu: [], visible: true, dirty: true, moved: false, astroPos: new THREE.Vector3(), lastCam: new THREE.Vector3() };
    const rc = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4(), look = new THREE.Vector3(), camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
    const worldPos = (id, p) => { const G = worlds[id]; if (!G) return V3(PATH[id]); return G.position; };
    const gatherK = p => clamp((p - (N - 2)) / 1, 0, 1); // 0 on the last world, 1 at the overview

    function size() { const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = (q ? 42 : 50) + (w / h < 0.8 ? 14 : 0); camera.updateProjectionMatrix(); st.dirty = true; }
    const ro = new ResizeObserver(size); ro.observe(stage); size();

    function placeWorlds(p, t, dt) {
      const gk = gatherK(p);
      W.ORDER.forEach((id, i) => { const G = worlds[id]; if (!G) return; const a = V3(PATH[id]), b = V3(RING(id)), k = smooth(clamp(gk * 1.35 - i * 0.03, 0, 1));
        G.position.copy(a.lerp(b, k)); const sc = 1 - 0.36 * k; G.scale.setScalar(sc);
        const kf = i + 3, near = smooth(clamp(1 - (Math.abs(p - kf) - 0.35) / 1.25, 0, 1)), rv = Math.max(near, smooth(clamp((p - (N - 1.6)) / 0.6, 0, 1)) * 0.92, p < 2.6 ? 0 : 0.06);
        const want = (st.hover === id || st.sel === id) ? 1 : 0; G.userData.f += (want - G.userData.f) * (1 - Math.exp(-dt * 7)); G.userData.rv = rv;
        const inView = frustum.intersectsSphere(new THREE.Sphere(G.position, G.userData.radius * 3.2));
        const far = camera.position.distanceTo(G.position) > 48 + 20 * G.userData.f; G.userData.setFar(far);
        if ((inView && !far) || reduced()) G.userData.update(t, reduced() ? 0 : dt, rv, G.userData.f); else if (inView) G.userData.core.rotation.y += dt * 0.04; G.visible = inView; });
    }
    const frustum = new THREE.Frustum();

    function cameraAt(p, out, outT) { const a = at(p); out.copy(posC.getPoint(a.u)); outT.copy(tgtC.getPoint(a.u));
      // the overview keyframes follow the worlds as they gather
      return a; }

    function astroUpdate(dt, a, p) {
      if (!astroReady) return; const k0 = K[a.i], k1 = K[Math.min(N - 1, a.i + 1)], off = V3(k0.astro).lerp(V3(k1.astro), a.f);
      if (innerWidth < 700) { off.x *= 0.5; off.z *= 1.25; off.y = Math.abs(off.y) * 0.55 + 0.35; } // phones: text sits low, so the astronaut floats in the upper half
      // smoothed in camera space, so the astronaut can trail and drift but never falls behind the camera
      const camSpeed = camera.position.distanceTo(st.lastCam) / Math.max(dt, 1e-3); st.camSpeed = (st.camSpeed || 0) + (camSpeed - (st.camSpeed || 0)) * (1 - Math.exp(-dt * 4));
      const trail = clamp(st.camSpeed * 0.012, 0, 0.7); off.z -= trail * 0.2; off.x *= 1 - trail * 0.15; off.y -= trail * 0.12;
      if (!st.astroOff) st.astroOff = off.clone(); st.astroOff.lerp(off, 1 - Math.exp(-dt * 2.6));
      const camQ = camera.quaternion; tmpV.copy(st.astroOff).applyQuaternion(camQ).add(camera.position); st.astroPos.copy(tmpV);
      const vel = st.camSpeed; astro.position.copy(st.astroPos);
      // where to look: the hovered world, the scene's subject, or back toward the student in the opening
      const lk = (st.flight && st.flight.id) || st.hover || st.sel || (a.f < 0.5 ? k0.look : k1.look);
      if (lk === 'camera') look.copy(camera.position).add(tmpV.set(-2.2 + st.ptr.x * 1.5, 0.4 + st.ptr.y * 0.6, 0).applyQuaternion(camQ));
      else if (lk === 'origin') look.set(...ORIGIN.pos); else if (lk === 'center') look.set(...O); else if (worlds[lk]) look.copy(worlds[lk].position); else look.set(...(PATH[lk] || O));
      tmpM.lookAt(look, astro.position, camera.up); tmpQ.setFromRotationMatrix(tmpM); astro.quaternion.slerp(tmpQ, 1 - Math.exp(-dt * 1.6));
      const t = st.t, sp = clamp(vel / 30, 0, 1);
      inner.position.y = Math.sin(t * 0.7) * 0.035; inner.rotation.set(-0.12 * sp + Math.sin(t * 0.53) * 0.05, Math.sin(t * 0.31) * 0.08, Math.sin(t * 0.43) * 0.07 + st.ptr.x * -0.05);
      jet.material.opacity += (clamp(sp * 1.4, 0, 0.9) - jet.material.opacity) * (1 - Math.exp(-dt * 6)); jet.scale.setScalar(0.2 + sp * 0.5);
      astro.userData.fade = Math.min(1, (astro.userData.fade || 0) + dt * 0.9);
    }

    function frame(now) {
      raf = 0; if (!alive || !st.visible || document.hidden) return;
      const dt = Math.min(0.05, (now - st.last) / 1000); st.last = now; const still = reduced(); if (!still) st.t += dt;
      st.frames.push(now); if (st.frames.length > 90) st.frames.shift();
      // progress: damped toward the scroll target (instant with reduced motion)
      const pPrev = st.p; st.p = still ? Math.round(st.target) : st.p + (st.target - st.p) * (1 - Math.exp(-Math.min(0.12, (now - (st.lastP || now - 16)) / 1000) * 4.2)); st.lastP = now; /* real elapsed time (capped), so slow devices still catch up */ if (Math.abs(st.target - st.p) < 1e-4) st.p = st.target;
      st.ptr.x += (st.ptr.tx - st.ptr.x) * (1 - Math.exp(-dt * 3)); st.ptr.y += (st.ptr.ty - st.ptr.y) * (1 - Math.exp(-dt * 3));
      // sun: first light sweeps the direction during the first segment
      const dawn = smooth(clamp(st.p - 0.15, 0, 1)); sun.set(...SUN0).lerp(V3(SUN1), dawn).normalize(); W.SUN.v.copy(sun);
      key.position.copy(sun).multiplyScalar(50); key.intensity = 0.5 + 2.0 * dawn; hemi.intensity = 0.18 + 0.16 * dawn; sunGlow.position.copy(sun).multiplyScalar(1500); sunGlow.material.opacity = 0.65 + 0.35 * dawn;
      // camera
      const a = cameraAt(st.p, camPos, camTgt);
      if (st.p > N - 2) { const gk = smooth(gatherK(st.p)); } // (overview keyframe is already at the gathering point)
      if (st.flight) { const F = st.flight, k = clamp((now - F.t0) / F.ms, 0, 1), e = ease(k); camPos.lerpVectors(F.p0, F.p1, e); camTgt.lerpVectors(F.q0, F.q1, e); o.onFlight && o.onFlight(k, F.id); if (k >= 1) { const id = F.id; st.flight = null; o.onArrive && o.onArrive(id); } }
      else if (st.ret) { const R = st.ret, k = clamp((now - R.t0) / R.ms, 0, 1), e = ease(k); camPos.lerpVectors(R.p0, camPos, e); camTgt.lerpVectors(R.q0, camTgt, e); if (k >= 1) st.ret = null; }
      const par = still ? 0 : (innerWidth < 700 ? 0.25 : 1);
      camera.position.copy(camPos); camera.lookAt(camTgt);
      camera.position.add(tmpV.set(st.ptr.x * 0.42 * par, -st.ptr.y * 0.26 * par, 0).applyQuaternion(camera.quaternion)); camera.lookAt(camTgt.x + st.ptr.x * 0.12 * par, camTgt.y - st.ptr.y * 0.08 * par, camTgt.z);
      camera.updateMatrixWorld(); frustum.setFromProjectionMatrix(tmpM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      sky.position.copy(camera.position); rim.position.copy(camera.position).add(tmpV.set(-6, 3, -10).applyQuaternion(camera.quaternion)); rim.target.position.copy(camera.position); fill.position.copy(camera.position).add(tmpV.set(1.5, 2, 0).applyQuaternion(camera.quaternion)); fill.target.position.copy(st.astroPos); fill.intensity = 0.55 + 0.35 * (1 - dawn);
      placeWorlds(st.p, st.t, still ? 0 : dt);
      // rim tint follows the world in front of us
      const cur = K[Math.round(clamp(st.p, 0, N - 1))].scene; if (M[cur]) rim.color.lerp(new THREE.Color(M[cur].c[0]), 1 - Math.exp(-dt * 2)); else rim.color.lerp(new THREE.Color(0x9fb4ff), 1 - Math.exp(-dt * 2));
      oCore.rotation.y += (still ? 0 : dt) * 0.006; oCore.material.uniforms.uT.value = st.t;
      stars.material.uniforms.uT.value = st.t; stars.material.uniforms.uPx.value = dpr; dust.material.uniforms.uPx.value = dpr;
      clouds.forEach((c, i) => { c.material.rotation = st.t * 0.004 * (i % 2 ? 1 : -1); });
      astroUpdate(still ? 0.016 : dt, a, st.p);
      if (st.hover && !st.flight) o.onLabel && o.onLabel(st.hover, project(worlds[st.hover])); else o.onLabel && o.onLabel(null);
      o.onProgress && o.onProgress(st.p);
      const t0 = performance.now(); renderer.render(scene, camera); st.cpu.push(performance.now() - t0); if (st.cpu.length > 90) st.cpu.shift();
      adapt(); st.dirty = false; st.lastCam.copy(camera.position);
      const settling = (still ? Math.round(st.target) !== st.p : Math.abs(st.target - st.p) > 1e-4) || Math.abs(st.ptr.tx - st.ptr.x) > 1e-3 || st.flight || st.ret || st.dirty;
      const active = settling || !astroReady || st.hover || now - st.lastInput < 1500;
      if (active) raf = requestAnimationFrame(frame);
      else if (!still) { /* idle: the ambient motion is slow, so it renders at 24 fps (6 fps if frames are very slow), leaving the main thread free */
        const f = st.frames, slow = f.length > 10 && (f[f.length - 1] - f[f.length - 11]) / 10 > 120; idleT = setTimeout(() => { idleT = 0; if (!raf) raf = requestAnimationFrame(frame); }, slow ? 160 : 42); }
      // reduced motion: render only on change
    }
    let raf = 0, idleT = 0, lastAdapt = 0;
    function adapt() { const f = st.frames; if (f.length < 60 || performance.now() - lastAdapt < 2000) return; const span = (f[f.length - 1] - f[0]) / (f.length - 1);
      const floor = q === 0 ? 0.75 : 1; if (span > 24 && dpr > floor) { dpr = Math.max(floor, +(dpr - 0.2).toFixed(2)); renderer.setPixelRatio(dpr); size(); lastAdapt = performance.now(); } else if (span < 17 && dpr < maxDpr) { dpr = Math.min(maxDpr, +(dpr + 0.1).toFixed(2)); renderer.setPixelRatio(dpr); size(); lastAdapt = performance.now(); } }
    const start = () => { if (idleT) { clearTimeout(idleT); idleT = 0; } if (!raf && alive && st.visible && !document.hidden) { st.last = performance.now(); raf = requestAnimationFrame(frame); } };
    function project(G) { if (!G) return null; tmpV.copy(G.position); const r = G.userData.radius * G.scale.x; const top = tmpV.clone().add(new THREE.Vector3(0, -r * 1.25, 0)); tmpV.project(camera); top.project(camera); const w = stage.clientWidth, h = stage.clientHeight;
      return { x: (tmpV.x * 0.5 + 0.5) * w, y: (-top.y * 0.5 + 0.5) * h, behind: tmpV.z > 1 }; }

    /* input */
    let pend = null;
    const onMove = e => { st.lastInput = performance.now(); st.ptr.tx = (e.clientX / innerWidth - 0.5) * 2; st.ptr.ty = (e.clientY / innerHeight - 0.5) * 2; pend = e; start(); };
    const pick = e => { const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); rc.setFromCamera(ndc, camera);
      const cores = Object.values(worlds).filter(G => G.visible).map(G => G.userData.core); const h = rc.intersectObjects(cores, false)[0]; return h ? h.object.userData.world : null; };
    const hoverTick = () => { if (pend && !st.flight) { const id = pick(pend); if (id !== st.hover) { st.hover = id; cv.style.cursor = id ? 'pointer' : ''; o.onHover && o.onHover(id); } pend = null; } };
    setInterval(() => alive && hoverTick(), 50);
    const onClick = e => { if (e.target.closest('a, button, input, .cz-map, .cz-dock, .cz-label')) return; if (st.flight) return finish(); const id = pick(e); if (!id) { if (st.sel) { st.sel = null; o.onHover && o.onHover(null); } return; }
      const touch = e.pointerType === 'touch' || matchMedia('(pointer: coarse)').matches; if (touch && st.sel !== id) { st.sel = id; st.hover = id; o.onHover && o.onHover(id); start(); return; } api.enter(id); };
    stage.addEventListener('pointermove', onMove, { passive: true }); stage.addEventListener('click', onClick);
    const onVis = () => { if (!document.hidden) start(); }; document.addEventListener('visibilitychange', onVis);
    const io = new IntersectionObserver(es => { st.visible = es[0].isIntersecting; if (st.visible) start(); }, { threshold: 0 }); io.observe(cv);
    const finish = () => { if (!st.flight) return; const id = st.flight.id; st.flight = null; o.onArrive && o.onArrive(id); };

    const api = {
      THREE, stats: () => { const f = st.frames, c = st.cpu.slice().sort((a, b) => a - b); return { fps: f.length > 1 ? 1000 * (f.length - 1) / (f[f.length - 1] - f[0]) : 0, cpuMedian: c[c.length >> 1] || 0, cpuP95: c[Math.floor(c.length * 0.95)] || 0, dpr, tier: q, worlds: Object.keys(worlds).length, astronaut: astroReady, draws: renderer.info.render.calls, tris: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
      setTarget(p) { st.target = clamp(p, 0, N - 1); st.lastInput = performance.now(); start(); }, jump(p) { st.target = st.p = clamp(p, 0, N - 1); st.dirty = true; start(); }, progress: () => st.p, N,
      hover(id) { st.hover = id; st.dirty = true; start(); },
      enter(id, ms) { if (!worlds[id]) { while (queue.length && !worlds[id]) buildNext(); } const G = worlds[id]; if (!G) return; st.sel = id;
        if (reduced() || ms === 0) { o.onArrive && o.onArrive(id); return; }
        const P = G.position.clone(), dir = camera.position.clone().sub(P).normalize(), r = G.userData.radius * G.scale.x;
        st.flight = { id, t0: performance.now(), ms: ms || 1250, p0: camera.position.clone(), q0: camTgt.clone(), p1: P.clone().addScaledVector(dir, r * 1.55).add(new THREE.Vector3(0, r * 0.15, 0)), q1: P }; start(); },
      skip: finish, flying: () => !!st.flight,
      returnFrom(id) { const G = worlds[id] || (buildNext(), worlds[id]); if (!G) return; placeWorlds(st.p, st.t, 0); const P = G.position.clone(), r = G.userData.radius * G.scale.x; st.ret = { t0: performance.now() + 60, ms: 1100, p0: P.clone().add(new THREE.Vector3(0, r * 0.2, r * 1.7)), q0: P }; start(); },
      debugAstro() { const v = astro.position.clone().project(camera); return { vis: astro.visible, ready: astroReady, pos: astro.position.toArray().map(x => +x.toFixed(2)), cam: camera.position.toArray().map(x => +x.toFixed(2)), ndc: [v.x, v.y, v.z].map(x => +x.toFixed(2)), p: st.p }; },
      debugWorld(id) { const G = worlds[id]; if (!G) return null; const v = G.position.clone().project(camera); return { ndc: [v.x, v.y, v.z].map(x => +x.toFixed(3)), revealed: +G.userData.rv.toFixed(2), focus: +G.userData.f.toFixed(2) }; },
      debugRaf: () => !!raf || !!idleT, resetStats() { st.frames.length = 0; st.cpu.length = 0; },
      buildAll() { while (queue.length) buildNext(); },
      kick: start,
      destroy() { alive = false; cancelAnimationFrame(raf); clearTimeout(idleT); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); stage.removeEventListener('pointermove', onMove); stage.removeEventListener('click', onClick);
        Object.values(worlds).forEach(G => G.userData.dispose()); scene.traverse(x => { if (x.geometry) x.geometry.dispose(); const m = x.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(mm => { if (mm.map) mm.map.dispose(); mm.dispose(); }); });
        rt.dispose(); renderer.dispose(); renderer.forceContextLoss(); cv.remove(); }
    };
    start(); return api;
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
  function cosmosHome(view) {
    if (current) { current.destroy(); current = null; }
    const W = LS.cosmosWorlds, M = W.META, C0 = LS.curriculum, K = keyframes(), N = K.length, gl = useGL();
    const seg = () => (innerWidth < 700 ? 0.8 : 1.05) * innerHeight;
    document.documentElement.classList.add('cz-on');
    view.innerHTML = `<section class="cz${gl ? '' : ' cz--flat'}" aria-label="${T('The ERLY learning universe', 'كون التعلّم في ERLY')}">
      <a class="cz-skip" href="#czAfter" data-cz-skip data-no-rise>${T('Skip the journey', 'تخطَّ الرحلة')}</a>
      <div class="cz-track" data-no-rise style="height:${N}00vh">
        <div class="cz-stage">
          <div class="cz-paint" aria-hidden="true"></div>
          <div class="cz-flat-origin" aria-hidden="true"></div>
          <div class="cz-scenes">${K.map((k, i) => `<div class="cz-scene cz-scene--${k.scene === 'void' ? 'hero' : PATH[k.scene] ? (PATH[k.scene][0] > 0 ? 'left' : 'right') : k.scene === 'all' ? 'all' : 'left'}" data-i="${i}" ${i ? 'hidden' : ''}>${!gl && PATH[k.scene] ? orb(k.scene, true) : ''}<div class="cz-copy">${sceneCopy(k, C0)}</div>${k.scene === 'all' ? ring() : ''}</div>`).join('')}</div>
          <div class="cz-label" hidden aria-hidden="true"><b></b><span></span><em>${T('Select to enter', 'اختر للدخول')}</em></div>
          <nav class="cz-rail" aria-label="${T('Journey', 'الرحلة')}">${K.map((k, i) => `<button type="button" data-cz-go="${i}" aria-label="${T('Go to', 'اذهب إلى')}: ${esc(M[k.scene] ? M[k.scene].name : { void: T('The beginning', 'البداية'), light: T('First light', 'الضوء الأول'), universe: T('The universe of knowledge', 'كون المعرفة'), all: T('The whole universe', 'الكون كله') }[k.scene])}"><i></i></button>`).join('')}</nav>
          <div class="cz-tools"><button type="button" class="cz-tool" data-cz-map aria-haspopup="dialog">${T('Destinations', 'الوجهات')}</button><button type="button" class="cz-tool" data-cz-end>${T('All worlds', 'كل العوالم')} ↓</button></div>
          <div class="cz-dock"></div>
          <p class="cz-credit">${T('Astronaut model', 'نموذج رائد الفضاء')}: Poly by Google · CC-BY</p>
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

    const arrive = id => { const veil = veilEl(); veil.style.setProperty('--vc', M[id].c[2]); veil.classList.add('is-on'); try { sessionStorage.setItem('cz-return', JSON.stringify({ id, y: scrollY, at: Date.now() })); } catch (e) { /* */ }
      LS.__czArrive = id; setTimeout(() => LS.go('world/' + id), reduced() ? 0 : 140); };
    const enter = id => { if (U) U.enter(id); else arrive(id); };
    const labelShow = (id, pos) => { if (!id || !pos || pos.behind) { label.hidden = true; return; } if (label.dataset.id !== id) { label.dataset.id = id; label.querySelector('b').textContent = M[id].name; label.querySelector('span').textContent = M[id].line; } label.hidden = false; label.style.transform = `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0) translate(-50%, 8px)`; };

    /* clicks and keys */
    root.addEventListener('click', e => {
      const en = e.target.closest('[data-cz-enter]'); if (en) { enter(en.dataset.czEnter); return; }
      const go = e.target.closest('[data-cz-go]'); if (go) { scrollToScene(+go.dataset.czGo, true); return; } /* the page jumps; the camera flies there through its own damping */
      if (e.target.closest('[data-cz-end]')) { scrollToScene(N - 1, true); return; }
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

    const ctl = { destroy() { removeEventListener('resize', fitTop); removeEventListener('scroll', onScroll); removeEventListener('keydown', onKey, true); removeEventListener('wheel', onWheelSkip); document.documentElement.classList.remove('cz-on', 'cz-past'); if (U) U.destroy(); U = null; LS.__cosmos = null; } };
    current = ctl;
    const past = new IntersectionObserver(es => document.documentElement.classList.toggle('cz-past', !es[0].isIntersecting), { threshold: 0, rootMargin: '-64px 0px 0px 0px' }); past.observe(stage.parentElement); const d0 = ctl.destroy; ctl.destroy = () => { past.disconnect(); d0(); };

    if (!flat) {
      root.classList.add('is-loading');
      universe(stage, { onProgress, onLabel: labelShow, onHover: id => { if (!id) label.hidden = true; }, onArrive: arrive, onAstronaut: ok => root.classList.toggle('has-astro', ok) }).then(u => {
        if (current !== ctl) { u.destroy(); return; } U = u; LS.__cosmos = u; root.classList.remove('is-loading'); root.classList.add('is-live'); const p = progressFromScroll(); u.jump(p);
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
  LS.on('route', ({ area }) => { const v = document.getElementById('czVeil'); if (v && v.classList.contains('is-on') && area !== 'home') requestAnimationFrame(() => requestAnimationFrame(() => v.classList.remove('is-on'))); });
  LS.on('leave', a => { if (a === 'home' && current) { current.destroy(); current = null; } });

  /* ---------- the subject world's own planet, live in its page header (#/world/<id>) ---------- */
  let worldPlanet = null;
  async function mountWorldPlanet(head, id) {
    const { THREE } = await LS.three(); if (!head.isConnected) return null; const W = LS.cosmosWorlds, q = Math.min(1, tierOf());
    const host = document.createElement('div'); host.className = 'cz-wp'; host.setAttribute('aria-hidden', 'true'); head.appendChild(host);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); host.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200); camera.position.set(0, 1.4, 9.5); camera.lookAt(0, 0, 0);
    if (!W.SUN.v) W.SUN.v = new THREE.Vector3(); W.SUN.v.set(...SUN1).normalize();
    const key = new THREE.DirectionalLight(0xfff1df, 2.4); key.position.copy(W.SUN.v).multiplyScalar(20); scene.add(key, new THREE.HemisphereLight(0x9fb0d8, 0x0b0d14, 0.45));
    const G = W.build(THREE, id, q); scene.add(G); const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0, last = performance.now(), t = 0, vis = true, alive = true, rv = 0;
    const size = () => { const w = host.clientWidth || 300, h = host.clientHeight || 200; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(size); ro.observe(host); size();
    const frame = now => { raf = 0; if (!alive || !vis || document.hidden) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; const still = reduced(); if (!still) t += dt;
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
    const head = document.querySelector('#lsView .uv-wh'); if (!head) return; head.classList.add('has-planet'); worldPlanet = mountWorldPlanet(head, parts[1]).catch(() => null);
  });

  LS.cosmosKeyframes = keyframes; LS.cosmosPATH = PATH;
  LS.cosmosHome = cosmosHome;
  LS.route('home', cosmosHome);
})();
