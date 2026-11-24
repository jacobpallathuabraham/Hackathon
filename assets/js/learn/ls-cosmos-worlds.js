/* ERLY Learning Studio — the eleven subject worlds of the cinematic universe.

   LS.cosmosWorlds.META[id]          → name, one-line identity, palette and the journey copy for each world
   LS.cosmosWorlds.build(THREE, id, q) → a THREE.Group:
       userData.core     the planet mesh (used for picking and focus)
       userData.radius   its radius
       userData.update(t, dt, reveal, focus)   per-frame animation; reveal 0→1 as the camera arrives (structures
                         assemble), focus 0→1 while the student points at or selects the world
       userData.dispose()
   q is the quality tier: 0 low (phones), 1 medium, 2 high. It sets sphere detail, instance counts and noise octaves.

   Surfaces are procedural (simplex noise in the fragment shader, evaluated on the sphere so there are no seams or texture
   downloads). Simplex noise: Ian McEwan / Ashima Arts, MIT licence (github.com/ashima/webgl-noise). */
(function () {
  'use strict';
  const LS = window.LS;

  const META = {
    maths: { name: 'Mathematics', line: 'Precise structures, curves and the shape of space.', c: ['#9fb4ff', '#e8edff', '#3c4fa8'], kick: 'Geometry · Algebra · Calculus' },
    physics: { name: 'Physics', line: 'Motion, energy, gravity and the fields that bind them.', c: ['#f08a5d', '#ffd6a8', '#1a2550'], kick: 'Mechanics · Waves · Fields' },
    chemistry: { name: 'Chemistry', line: 'Atoms, bonds and the architecture of matter.', c: ['#4fd1c0', '#c9fff6', '#0d4b4a'], kick: 'Atoms · Bonding · Reactions' },
    biology: { name: 'Biology', line: 'Life from the inside — cells, genes and ecosystems.', c: ['#7bd88f', '#e4ffd9', '#1d4d2c'], kick: 'Cells · Genetics · Ecology' },
    geography: { name: 'Geography & Earth', line: 'Oceans, mountains, climate and a living planet.', c: ['#3d8fd6', '#9fd9ff', '#1f5d2e'], kick: 'Water · Climate · Tectonics' },
    cs: { name: 'Computer Science', line: 'Logic, data and the algorithms that move the world.', c: ['#a68cff', '#e5dcff', '#2a1f55'], kick: 'Logic · Data · Algorithms' },
    english: { name: 'English & Study', line: 'Words, stories and the craft of expression.', c: ['#f0a6be', '#fff3ea', '#6b2a43'], kick: 'Reading · Writing · Narrative' },
    history: { name: 'History', line: 'Evidence, layers of time and the people of the past.', c: ['#d6a466', '#f5e2c0', '#5e3b1c'], kick: 'Sources · Timelines · Civilisations' },
    languages: { name: 'Languages', line: 'Many scripts, many voices — one conversation.', c: ['#f2b84b', '#fff0c7', '#6a4310'], kick: 'Spanish · French · Arabic' },
    social: { name: 'Social Science', line: 'Communities, cities and the decisions we share.', c: ['#7fa3c8', '#dbe8f5', '#1d2c40'], kick: 'Society · Cities · Choices' },
    more: { name: 'Economics, Psychology & More', line: 'Markets, memory and how people decide.', c: ['#c8b35a', '#f4ecc4', '#3d3412'], kick: 'Markets · Memory · Decisions' }
  };
  const ORDER = ['maths', 'physics', 'chemistry', 'biology', 'geography', 'cs', 'english', 'history', 'languages', 'social', 'more'];

  /* ---------- shared GLSL ---------- */
  const NOISE = `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
    i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
  float fbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<OCT;i++){s+=a*snoise(p);p*=2.03;a*=0.5;}return s;}`;
  LS.__cosmosNoise = NOISE;

  /* surface modes: 0 banded giant · 1 earth (ocean, land, ice, specular) · 2 crystal cells · 3 strata · 4 ink marbling ·
     5 dunes · 6 night cities · 7 soft rock */
  const SURF_V = `varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ vP=position; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
  const SURF_F = (oct) => `#define OCT ${oct}
  uniform vec3 uSun; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uT; uniform float uMode; uniform float uSeed; uniform float uFocus;
  varying vec3 vP; varying vec3 vN; varying vec3 vW; ${NOISE}
  void main(){
    vec3 p=normalize(vP); vec3 n=normalize(vN); vec3 V=normalize(cameraPosition-vW);
    float ndl=dot(n,uSun); float lit=smoothstep(-0.18,0.55,ndl); vec3 col; float spec=0.0; float night=0.0;
    if(uMode<0.5){ float lat=p.y+0.06*fbm(p*3.0+uSeed)+0.02*sin(p.x*9.0+uT*0.05); float b=sin(lat*17.0+fbm(p*1.6+uSeed)*2.6); col=mix(uA,uB,0.5+0.5*b); col=mix(col,uC,smoothstep(0.55,1.0,abs(sin(lat*5.0)))*0.55);
      float storm=smoothstep(0.86,1.0,1.0-length((p-normalize(vec3(0.7,-0.25,0.6)))*vec2(1.0,2.2).xyx)); col=mix(col,uC*1.3,storm*0.7); }
    else if(uMode<1.5){ float h=fbm(p*2.2+uSeed); float land=smoothstep(0.02,0.08,h); vec3 sea=mix(uA*0.55,uA,smoothstep(-0.4,0.05,h)); vec3 gr=mix(uC,vec3(0.55,0.47,0.32),smoothstep(0.15,0.45,h)); col=mix(sea,gr,land);
      float ice=smoothstep(0.78,0.86,abs(p.y)+0.05*h); col=mix(col,vec3(0.93,0.96,1.0),ice); vec3 H=normalize(uSun+V); spec=(1.0-land)*(1.0-ice)*pow(max(dot(n,H),0.0),60.0)*0.9; night=land*(1.0-ice)*smoothstep(0.3,0.62,fbm(p*22.0+3.0))*0.85; }
    else if(uMode<2.5){ vec3 q=p*5.0; float c1=fbm(q+uSeed); float cell=abs(fract(c1*3.0)-0.5); col=mix(uC,uA,smoothstep(0.0,0.45,cell)); col=mix(col,uB,smoothstep(0.42,0.5,cell)*0.8); }
    else if(uMode<3.5){ float y=p.y*9.0+fbm(p*2.0+uSeed)*1.8; float band=fract(y); float k=floor(y); vec3 a=mix(uA,uC,fract(sin(k*12.9898)*43758.5)); col=mix(a,uB,smoothstep(0.82,0.98,band)*0.6); col*=0.85+0.25*fbm(p*14.0); }
    else if(uMode<4.5){ vec3 q=p*1.6; vec3 w=vec3(fbm(q+uSeed),fbm(q+uSeed+4.1),fbm(q+uSeed+8.3)); float m=fbm(q+2.2*w+uT*0.01); col=mix(uB,uA,smoothstep(-0.3,0.35,m)); col=mix(col,uC,smoothstep(0.35,0.7,m)); }
    else if(uMode<5.5){ float d=sin(p.x*22.0+fbm(p*3.0+uSeed)*5.0)*0.5+0.5; col=mix(uC,uA,d*0.6+0.25*fbm(p*6.0)); col=mix(col,uB,smoothstep(0.82,1.0,d)*0.35); }
    else if(uMode<6.5){ float h=fbm(p*2.5+uSeed); col=mix(uC,uA,smoothstep(-0.3,0.4,h)); float city=smoothstep(0.32,0.6,fbm(p*14.0+1.7))*smoothstep(0.0,0.2,h); night=city; }
    else { float h=fbm(p*3.0+uSeed); col=mix(uC,uA,0.5+0.5*h); col=mix(col,uB,smoothstep(0.35,0.7,h)*0.4); }
    vec3 c=col*(0.035+0.98*lit)+spec*vec3(1.0,0.95,0.85);
    c+=night*(1.0-smoothstep(-0.15,0.1,ndl))*vec3(1.0,0.72,0.38)*0.95;
    float rim=pow(1.0-max(dot(n,V),0.0),3.0); c+=uA*rim*0.18*(0.35+lit)+uA*uFocus*0.08;
    gl_FragColor=vec4(c,1.0);
    #include <colorspace_fragment>
  }`;
  /* atmosphere: a thin limb whose brightness follows the sun (day side), a warm band at the terminator, a faint night-side rim
     so dark hemispheres keep their silhouette, and forward scattering when the planet is backlit (the sunrise-over-the-limb shot) */
  const ATM_F = `uniform vec3 uSun; uniform vec3 uCol; uniform float uK; uniform float uFocus; varying vec3 vN; varying vec3 vW;
  void main(){ vec3 n=normalize(vN); vec3 V=normalize(cameraPosition-vW); float f=pow(1.0-abs(dot(n,V)),3.0); float mu=dot(n,uSun);
    float day=smoothstep(-0.3,0.55,mu); float term=exp(-pow((mu+0.05)*4.5,2.0)); float fwd=pow(max(dot(-V,uSun),0.0),5.0);
    vec3 col=uCol*(0.07+day*0.95)+vec3(1.0,0.58,0.32)*term*0.28+uCol*fwd*1.6*smoothstep(-0.4,0.2,mu);
    gl_FragColor=vec4(col*f*(uK+uFocus*0.25),1.0); }`;
  const ATM_V = `varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;

  const SUN = { v: null, renderer: null }; // shared sun direction, and the renderer used to bake surfaces (set by the universe / world header)

  /* Surfaces are BAKED: the procedural colour is rendered once into an equirectangular texture (matching three's sphere UVs),
     then every frame costs one texture lookup plus lighting instead of 5–20 noise evaluations per pixel. */
  const BAKE_F = (oct) => `#define OCT ${oct}
  uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uMode; uniform float uSeed; varying vec2 vUv; ${NOISE}
  void main(){ float ph=vUv.x*6.2831853, th=(1.0-vUv.y)*3.14159265; vec3 p=vec3(-cos(ph)*sin(th),cos(th),sin(ph)*sin(th)); vec3 col; float code=0.0;
    if(uMode<0.5){ float lat=p.y+0.06*fbm(p*3.0+uSeed); float b=sin(lat*17.0+fbm(p*1.6+uSeed)*2.6); col=mix(uA,uB,0.5+0.5*b); col=mix(col,uC,smoothstep(0.55,1.0,abs(sin(lat*5.0)))*0.55);
      float storm=smoothstep(0.86,1.0,1.0-length((p-normalize(vec3(0.7,-0.25,0.6)))*vec3(1.0,2.2,1.0))); col=mix(col,uC*1.3,storm*0.7); }
    else if(uMode<1.5){ float h=fbm(p*2.2+uSeed); float land=smoothstep(0.02,0.08,h); vec3 sea=mix(uA*0.55,uA,smoothstep(-0.4,0.05,h)); vec3 gr=mix(uC,vec3(0.55,0.47,0.32),smoothstep(0.15,0.45,h)); col=mix(sea,gr,land);
      float ice=smoothstep(0.78,0.86,abs(p.y)+0.05*h); col=mix(col,vec3(0.93,0.96,1.0),ice); float night=land*(1.0-ice)*smoothstep(0.3,0.62,fbm(p*22.0+3.0))*0.85;
      code = land>0.5 ? 0.5+0.5*night : 0.4*(1.0-ice); }
    else if(uMode<2.5){ vec3 q=p*5.0; float c1=fbm(q+uSeed); float cell=abs(fract(c1*3.0)-0.5); col=mix(uC,uA,smoothstep(0.0,0.45,cell)); col=mix(col,uB,smoothstep(0.42,0.5,cell)*0.8); }
    else if(uMode<3.5){ float y=p.y*9.0+fbm(p*2.0+uSeed)*1.8; float band=fract(y); float k=floor(y); vec3 a=mix(uA,uC,fract(sin(k*12.9898)*43758.5)); col=mix(a,uB,smoothstep(0.82,0.98,band)*0.6); col*=0.85+0.25*fbm(p*14.0); }
    else if(uMode<4.5){ vec3 q=p*1.6; vec3 w=vec3(fbm(q+uSeed),fbm(q+uSeed+4.1),fbm(q+uSeed+8.3)); float m=fbm(q+2.2*w); col=mix(uB,uA,smoothstep(-0.3,0.35,m)); col=mix(col,uC,smoothstep(0.35,0.7,m)); }
    else if(uMode<5.5){ float d=sin(p.x*22.0+fbm(p*3.0+uSeed)*5.0)*0.5+0.5; col=mix(uC,uA,d*0.6+0.25*fbm(p*6.0)); col=mix(col,uB,smoothstep(0.82,1.0,d)*0.35); }
    else if(uMode<6.5){ float h=fbm(p*2.5+uSeed); col=mix(uC,uA,smoothstep(-0.3,0.4,h)); float city=smoothstep(0.32,0.6,fbm(p*14.0+1.7))*smoothstep(0.0,0.2,h); code=0.5+0.5*city; }
    else if(uMode<7.5){ float h=fbm(p*3.0+uSeed); col=mix(uC,uA,0.5+0.5*h); col=mix(col,uB,smoothstep(0.35,0.7,h)*0.4); }
    else { float c=fbm(p*3.0+uSeed); col=vec3(1.0); code=smoothstep(0.05,0.5,c)*0.85; }
    gl_FragColor=vec4(col,code); }`;
  function bake(THREE, mode, cols, seed, w) {
    const R = SUN.renderer; if (!R) return null;
    const rt = new THREE.WebGLRenderTarget(w, w / 2, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping });
    const m = new THREE.ShaderMaterial({ depthTest: false, uniforms: { uA: { value: new THREE.Color(cols[0]) }, uB: { value: new THREE.Color(cols[1]) }, uC: { value: new THREE.Color(cols[2]) }, uMode: { value: mode }, uSeed: { value: seed } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: BAKE_F(5) });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m), sc = new THREE.Scene(); sc.add(quad);
    const prev = R.getRenderTarget(); R.setRenderTarget(rt); R.render(sc, new THREE.Camera()); R.setRenderTarget(prev); quad.geometry.dispose(); m.dispose(); return rt;
  }
  const LIT_V = 'varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }';
  const LIT_F = `uniform sampler2D uMap; uniform vec3 uSun; uniform vec3 uA; uniform float uFocus; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
  void main(){ vec4 t=texture2D(uMap,vUv); vec3 n=normalize(vN); vec3 V=normalize(cameraPosition-vW); float ndl=dot(n,uSun); float lit=smoothstep(-0.18,0.55,ndl);
    float spec=t.a<0.45?t.a/0.4:0.0, night=t.a>=0.5?(t.a-0.5)*2.0:0.0; vec3 H=normalize(uSun+V);
    vec3 c=t.rgb*(0.08+0.95*lit)+spec*pow(max(dot(n,H),0.0),60.0)*0.9*vec3(1.0,0.95,0.85);
    c+=night*(1.0-smoothstep(-0.15,0.1,ndl))*vec3(1.0,0.72,0.38)*0.95;
    float rim=pow(1.0-max(dot(n,V),0.0),3.0); c+=uA*rim*0.18*(0.35+lit)+uA*uFocus*0.08;
    gl_FragColor=vec4(c,1.0);
    #include <colorspace_fragment>
  }`;
  const CLOUD_F = `uniform sampler2D uMap; uniform vec3 uSun; varying vec2 vUv; varying vec3 vN; void main(){ float a=texture2D(uMap,vUv).a; float l=smoothstep(-0.15,0.5,dot(normalize(vN),uSun)); gl_FragColor=vec4(vec3(1.0)*(0.05+0.95*l),a); }`;

  function surface(THREE, q, r, mode, cols, seed, seg) {
    const s0 = seg || [24, 48, 64][q];
    if (SUN.renderer) { const rt = bake(THREE, mode, cols, seed, r > 5 ? [1024, 1024, 2048][q] : [512, 1024, 1024][q]);
      const u = { uMap: { value: rt.texture }, uSun: { value: SUN.v }, uA: { value: new THREE.Color(cols[0]) }, uFocus: { value: 0 }, uT: { value: 0 } };
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, s0, Math.round(s0 * 0.75)), new THREE.ShaderMaterial({ uniforms: u, vertexShader: LIT_V, fragmentShader: LIT_F })); mesh.userData.rt = rt; return mesh; }
    const u = { uSun: { value: SUN.v }, uA: { value: new THREE.Color(cols[0]) }, uB: { value: new THREE.Color(cols[1]) }, uC: { value: new THREE.Color(cols[2]) }, uT: { value: 0 }, uMode: { value: mode }, uSeed: { value: seed }, uFocus: { value: 0 } };
    const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: SURF_V, fragmentShader: SURF_F(q >= 2 ? 5 : q === 1 ? 4 : 3) });
    const s = seg || [24, 48, 64][q]; return new THREE.Mesh(new THREE.SphereGeometry(r, s, Math.round(s * 0.75)), m);
  }
  function atmosphere(THREE, r, col, k) {
    const u = { uSun: { value: SUN.v }, uCol: { value: new THREE.Color(col) }, uK: { value: k == null ? 1 : k }, uFocus: { value: 0 } };
    return new THREE.Mesh(new THREE.SphereGeometry(r, 40, 30), new THREE.ShaderMaterial({ uniforms: u, vertexShader: ATM_V, fragmentShader: ATM_F, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.BackSide }));
  }
  /* canvas text → sprite (letters, words in many scripts) */
  function textSprite(THREE, txt, o = {}) {
    const fs = o.size || 96, c = document.createElement('canvas'), g = c.getContext('2d'); g.font = `${o.weight || 400} ${fs}px ${o.font || 'Fraunces, Georgia, serif'}`;
    const w = Math.ceil(g.measureText(txt).width) + fs * 0.6, h = Math.ceil(fs * 1.5); c.width = w; c.height = h;
    g.font = `${o.weight || 400} ${fs}px ${o.font || 'Fraunces, Georgia, serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = o.color || '#fff'; g.fillText(txt, w / 2, h / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: o.opacity == null ? 1 : o.opacity }));
    const H = o.h || 0.3; sp.scale.set(H * w / h, H, 1); return sp;
  }
  const smooth = t => t * t * (3 - 2 * t);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ringLine = (THREE, r, col, op, n = 128) => { const pts = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); } return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })); };

  /* ---------- the eleven builders ---------- */
  const B = {};

  B.maths = (THREE, q, G) => { // a faceted, crystalline polyhedron world with coordinate rings, orbiting solids and a saddle surface
    const r = 1.25, M = META.maths;
    const geo = new THREE.IcosahedronGeometry(r, q ? 3 : 2); const pos = geo.attributes.position, cols = [];
    const A = new THREE.Color(M.c[0]), Bc = new THREE.Color(M.c[1]), C = new THREE.Color(M.c[2]);
    for (let i = 0; i < pos.count; i += 3) { const k = (Math.sin(i * 12.9898) * 43758.5453) % 1; const c = A.clone().lerp(Bc, Math.abs(k) * 0.55).lerp(C, (i / 3) % 7 === 0 ? 0.35 : 0); for (let j = 0; j < 3; j++) cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const core = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.38, metalness: 0.25, emissive: 0x0a1030 }));
    G.add(core); const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(r * 1.004, 1)), new THREE.LineBasicMaterial({ color: 0xdfe6ff, transparent: true, opacity: 0.35 })); G.add(edges);
    const rings = new THREE.Group(); [[0, 0], [Math.PI / 2, 0], [Math.PI / 2, Math.PI / 2]].forEach(([a, b], i) => { const L = ringLine(THREE, r * (1.55 + i * 0.12), 0xc8d4ff, 0.42); L.rotation.set(a, b, 0); rings.add(L);
      for (let k = 0; k < 24; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, k % 6 ? 0.05 : 0.11), new THREE.MeshBasicMaterial({ color: 0xc8d4ff })); const ang = k / 24 * Math.PI * 2, R = r * (1.55 + i * 0.12); t.position.set(Math.cos(ang) * R, 0, Math.sin(ang) * R); t.lookAt(0, 0, 0); const h = new THREE.Group(); h.add(t); h.rotation.set(a, b, 0); rings.add(h); } });
    G.add(rings);
    const solids = [new THREE.TetrahedronGeometry(0.2), new THREE.BoxGeometry(0.26, 0.26, 0.26), new THREE.OctahedronGeometry(0.21), new THREE.DodecahedronGeometry(0.2), new THREE.IcosahedronGeometry(0.21), new THREE.TorusKnotGeometry(0.13, 0.035, 64, 8)];
    const S = solids.map((g, i) => { const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe8edff : 0x9fb4ff, roughness: 0.3, metalness: 0.4, flatShading: true })); const w = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); m.add(w); G.add(m); return m; });
    const N = 22, sg = new THREE.PlaneGeometry(1.5, 1.5, N, N); const sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i); sp.setZ(i, (x * x - y * y) * 0.5); }
    const saddle = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xbfd0ff, wireframe: true, transparent: true, opacity: 0.28 })); saddle.rotation.x = -Math.PI / 2.4; saddle.position.set(0, r * 1.9, 0); G.add(saddle);
    return { core, r, body: [edges], update(t, dt, rv, fc) { core.rotation.y += dt * 0.05; edges.rotation.copy(core.rotation); rings.rotation.y = t * 0.04; rings.scale.setScalar(0.6 + 0.4 * smooth(rv)); rings.children.forEach(c => { if (c.material) c.material.opacity = 0.42 * rv; });
      S.forEach((m, i) => { const a = t * (0.16 + i * 0.015) + i * Math.PI / 3, R = r * (1.05 + 1.05 * smooth(rv)) + 0.08 * Math.sin(t + i); m.position.set(Math.cos(a) * R, Math.sin(a * 1.3 + i) * 0.45 * rv, Math.sin(a) * R); m.rotation.set(t * 0.4 + i, t * 0.3, 0); m.scale.setScalar(0.4 + 0.6 * smooth(rv) + fc * 0.15); });
      saddle.material.opacity = 0.28 * rv; saddle.rotation.z = t * 0.1; saddle.scale.setScalar(0.5 + 0.5 * smooth(rv)); } };
  };

  /* Physics (v35): a world made of physics, not a generic ringed planet.
     · surface: two-source interference (Young's double slit) — the fringe pattern of two coherent wave sources, computed
       live from the geodesic distance to each source: I ∝ cos²(k(d₁−d₂)/2), with travelling wavefronts;
     · three Keplerian orbits like an atom diagram: ellipses with the planet at a focus; each body moves by Kepler's equation
       (fast near periapsis — 2nd law), and the periods follow T ∝ a^1.5 (3rd law);
     · a standing wave ring on the equator: r(θ, t) = R + A·sin(6θ)·cos(ωt), with fixed nodes;
     · magnetic dipole field lines r = L·sin²θ, with pulses flowing along them. */
  B.physics = (THREE, q, G) => {
    const r = 1.3, M = META.physics;
    const u = { uSun: { value: SUN.v }, uA: { value: new THREE.Color(M.c[0]) }, uFocus: { value: 0 }, uT: { value: 0 } };
    const core = new THREE.Mesh(new THREE.SphereGeometry(r, [32, 64, 80][q], [24, 48, 60][q]), new THREE.ShaderMaterial({ uniforms: u,
      vertexShader: 'varying vec3 vN; varying vec3 vW; varying vec3 vP; void main(){ vP=normalize(position); vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform vec3 uSun; uniform vec3 uA; uniform float uFocus; uniform float uT; varying vec3 vN; varying vec3 vW; varying vec3 vP;
      float wave(vec3 p, vec3 s, float k, float w){ float d=acos(clamp(dot(p,s),-1.0,1.0)); return cos(k*d-w*uT)/(1.0+d*0.9); }
      void main(){ vec3 p=normalize(vP); vec3 s1=normalize(vec3(0.32,0.12,0.94)), s2=normalize(vec3(-0.32,0.12,0.94)), s3=normalize(vec3(0.0,-0.2,-1.0));
        float a=wave(p,s1,26.0,2.2)+wave(p,s2,26.0,2.2); float I=a*a*0.45; float env=smoothstep(1.7,0.2,acos(clamp(dot(p,normalize(s1+s2)),-1.0,1.0))); I*=0.35+0.65*env;
        vec3 n=normalize(vN), V=normalize(cameraPosition-vW); float ndl=dot(n,uSun), lit=smoothstep(-0.2,0.6,ndl);
        vec3 base=mix(vec3(0.004,0.007,0.022),vec3(0.012,0.02,0.055),0.5+0.5*p.y);
        vec3 fr=mix(vec3(0.9,0.26,0.07),vec3(1.0,0.72,0.38),smoothstep(0.7,1.5,I));
        vec3 c=base*(0.18+0.9*lit)+fr*pow(clamp(I,0.0,1.6),1.4)*(0.22+0.42*lit);
        float src=exp(-acos(clamp(dot(p,s1),-1.0,1.0))*40.0)+exp(-acos(clamp(dot(p,s2),-1.0,1.0))*40.0); c+=vec3(1.0,0.9,0.7)*src*0.9;
        vec3 H=normalize(uSun+V); c+=pow(max(dot(n,H),0.0),64.0)*0.18*lit;
        float rim=pow(1.0-max(dot(n,V),0.0),3.0); c+=uA*rim*0.22*(0.35+lit)+uA*uFocus*0.08;
        gl_FragColor=vec4(c,1.0);
        #include <colorspace_fragment>
      }` }));
    G.add(core); G.add(atmosphere(THREE, r * 1.07, '#ff9a6a', 0.45));
    // Keplerian orbits (planet at a focus), atom-like orientations
    const orbits = new THREE.Group(); G.add(orbits);
    const glowC = document.createElement('canvas'); glowC.width = glowC.height = 64; { const g = glowC.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,210,160,0.6)'); gr.addColorStop(1, 'rgba(255,160,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
    const glowT = new THREE.CanvasTexture(glowC);
    const OR = [[r * 1.6, 0.4, 0.0, 0.3], [r * 1.85, 0.45, Math.PI / 3, 1.1], [r * 2.1, 0.36, -Math.PI / 3, 2.0]].map(([a, e, tilt, ph], i) => {
      const b = a * Math.sqrt(1 - e * e), pts = []; for (let k = 0; k <= 160; k++) { const E = k / 160 * Math.PI * 2; pts.push(new THREE.Vector3(a * (Math.cos(E) - e), 0, b * Math.sin(E))); }
      const hold = new THREE.Group(); hold.rotation.set(0.25 + i * 0.12, ph, tilt); orbits.add(hold);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: i === 1 ? 0xffd6a8 : 0xc9d6ff, transparent: true, opacity: 0.35, depthWrite: false })); hold.add(line);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.065 + i * 0.012, 16, 12), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xffe2b8 : 0xe6ecff })); hold.add(body);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); halo.scale.setScalar(0.45); body.add(halo);
      return { a, e, b, line, body, T: 9 * Math.pow(a / (r * 1.6), 1.5), M0: ph * 2 }; });
    // standing wave on the equator
    const SW = 192, swPos = new Float32Array((SW + 1) * 3), swGeo = new THREE.BufferGeometry(); swGeo.setAttribute('position', new THREE.BufferAttribute(swPos, 3));
    const sw = new THREE.Line(swGeo, new THREE.LineBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.7, depthWrite: false })); sw.rotation.set(0.18, 0, -0.08); G.add(sw);
    // magnetic dipole field lines, with pulses flowing from pole to pole
    const field = new THREE.Group(), pulses = []; for (let k = 0; k < 10; k++) { const pts = [], L = 1.55 + (k % 5) * 0.2; for (let i = 0; i <= 72; i++) { const th = 0.28 + i / 72 * (Math.PI - 0.56), rr = r * L * Math.sin(th) ** 2; pts.push(new THREE.Vector3(rr * Math.sin(th), rr * Math.cos(th), 0)); }
      const hold = new THREE.Group(); hold.rotation.y = k / 10 * Math.PI * 2; field.add(hold);
      hold.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffc9a8, transparent: true, opacity: 0.22, depthWrite: false })));
      const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: 0xffd2b0 })); dot.scale.setScalar(0.16); hold.add(dot); pulses.push({ dot, pts, ph: k * 0.37 }); }
    G.add(field);
    return { core, r, update(t, dt, rv, fc) {
      core.rotation.y += dt * 0.06; u.uT.value = t; const sr = smooth(rv);
      OR.forEach((o, i) => { const Mn = (t / o.T) * Math.PI * 2 + o.M0; let E = Mn; for (let k = 0; k < 6; k++) E -= (E - o.e * Math.sin(E) - Mn) / (1 - o.e * Math.cos(E)); // Kepler: M = E − e·sin E
        o.body.position.set(o.a * (Math.cos(E) - o.e), 0, o.b * Math.sin(E)); o.line.material.opacity = 0.32 * rv; o.body.scale.setScalar(0.3 + 0.7 * sr + fc * 0.2); });
      orbits.scale.setScalar(0.55 + 0.45 * sr); orbits.rotation.y = t * 0.03;
      const R0 = r * 1.42, A = 0.075 * (0.4 + 0.6 * sr), cw = Math.cos(t * 2.4); for (let k = 0; k <= SW; k++) { const th = k / SW * Math.PI * 2, rr = R0 + A * Math.sin(6 * th) * cw; swPos[k * 3] = Math.cos(th) * rr; swPos[k * 3 + 1] = A * 0.5 * Math.sin(6 * th) * cw; swPos[k * 3 + 2] = Math.sin(th) * rr; }
      swGeo.attributes.position.needsUpdate = true; sw.material.opacity = 0.65 * rv;
      field.rotation.y = t * 0.04; field.scale.setScalar(0.75 + 0.25 * sr + fc * 0.04); field.children.forEach(h => { h.children[0].material.opacity = (0.07 + 0.18 * rv); });
      pulses.forEach(p => { const f = (((t * 0.18 + p.ph) % 1) + 1) % 1, j = f * (p.pts.length - 1), i0 = Math.floor(j); p.dot.position.lerpVectors(p.pts[i0], p.pts[Math.min(i0 + 1, p.pts.length - 1)], j - i0); p.dot.material.opacity = rv * Math.sin(Math.PI * f) * 0.9; });
      } };
  };

  B.chemistry = (THREE, q, G) => { // crystalline cell surface, ball-and-stick molecules in orbit, electron shells
    const r = 1.2, M = META.chemistry; const core = surface(THREE, q, r, 2, [M.c[0], M.c[1], M.c[2]], 2.7); G.add(core); G.add(atmosphere(THREE, r * 1.08, '#5fe6d4', 1));
    const atom = (col, s) => new THREE.Mesh(new THREE.SphereGeometry(s, 20, 14), new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.1 }));
    const bondMat = new THREE.MeshStandardMaterial({ color: 0x8fa3a1, roughness: 0.6, metalness: 0.1 }); /* bonds recede behind the atoms: thinner and darker */
    const bond = (a, b) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, d.length(), 8), bondMat); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; };
    const mol = (spec) => { const g = new THREE.Group(); spec.atoms.forEach(([c, s, p]) => { const m = atom(c, s); m.position.set(...p); g.add(m); }); spec.bonds.forEach(([i, j]) => g.add(bond(new THREE.Vector3(...spec.atoms[i][2]), new THREE.Vector3(...spec.atoms[j][2])))); return g; };
    const a = 104.5 * Math.PI / 180, L = 0.2;
    const water = mol({ atoms: [[0xff5a5a, 0.11, [0, 0, 0]], [0xf4f7f6, 0.07, [Math.sin(a / 2) * L, -Math.cos(a / 2) * L, 0]], [0xf4f7f6, 0.07, [-Math.sin(a / 2) * L, -Math.cos(a / 2) * L, 0]]], bonds: [[0, 1], [0, 2]] });
    const t4 = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => v.map(x => x * 0.13));
    const methane = mol({ atoms: [[0x5a616b, 0.1, [0, 0, 0]], ...t4.map(p => [0xf4f7f6, 0.065, p])], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] });
    const hex = Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3) * 0.22, Math.sin(i * Math.PI / 3) * 0.22, 0]);
    const benzene = mol({ atoms: [...hex.map(p => [0x5a616b, 0.07, p]), ...hex.map(p => [0xf4f7f6, 0.045, p.map(x => x * 1.65)])], bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]] });
    const co2 = mol({ atoms: [[0x5a616b, 0.09, [0, 0, 0]], [0xff5a5a, 0.1, [0.24, 0, 0]], [0xff5a5a, 0.1, [-0.24, 0, 0]]], bonds: [[0, 1], [0, 2]] });
    const mols = [water, methane, benzene, co2, water.clone(), methane.clone()]; mols.forEach(m => G.add(m));
    const shells = [0, 1, 2].map(i => { const L2 = ringLine(THREE, r * (1.6 + i * 0.28), 0x8ff5e6, 0.3); L2.rotation.set(0.6 + i * 0.9, i * 0.7, 0); const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xc9fff6 })); L2.add(e); G.add(L2); return { L: L2, e, R: r * (1.6 + i * 0.28) }; });
    return { core, r, update(t, dt, rv, fc) { core.rotation.y += dt * 0.07; core.material.uniforms.uT.value = t;
      mols.forEach((m, i) => { const ang = t * (0.11 + (i % 3) * 0.015) + i * (Math.PI * 2 / mols.length), R = r * (1.25 + 1.0 * smooth(rv)) + (i % 3) * 0.35, inc = ((i % 3) - 1) * 0.35; /* evenly phased on three separated orbits, so molecules never clump */ m.position.set(Math.cos(ang) * R, Math.sin(ang) * R * inc + ((i % 2) - 0.5) * 0.3, Math.sin(ang) * R); m.rotation.set(t * 0.5 + i, t * 0.4, i); m.scale.setScalar((0.35 + 0.5 * smooth(rv)) * (1 + fc * 0.15)); });
      shells.forEach((s, i) => { const ang = t * (1.1 - i * 0.25); s.e.position.set(Math.cos(ang) * s.R, 0, Math.sin(ang) * s.R); s.L.material.opacity = 0.3 * rv; }); } };
  };

  B.biology = (THREE, q, G) => { // a living cell: translucent membrane, nucleus, mitochondria; a DNA helix arching around
    const r = 1.3, M = META.biology;
    const memU = { uSun: { value: SUN.v }, uT: { value: 0 }, uFocus: { value: 0 } };
    const membrane = new THREE.Mesh(new THREE.SphereGeometry(r, [24, 48, 64][q], [18, 36, 48][q]), new THREE.ShaderMaterial({ uniforms: memU, transparent: true, depthWrite: false,
      vertexShader: 'uniform float uT; varying vec3 vN; varying vec3 vW; void main(){ vec3 p=position*(1.0+0.025*sin(position.y*6.0+uT*1.2)*sin(position.x*5.0+uT)); vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(p,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: 'uniform vec3 uSun; uniform float uFocus; varying vec3 vN; varying vec3 vW; void main(){ vec3 n=normalize(vN); vec3 V=normalize(cameraPosition-vW); float f=pow(1.0-abs(dot(n,V)),2.0); float l=0.35+0.65*smoothstep(-0.3,0.7,dot(n,uSun)); vec3 c=mix(vec3(0.25,0.62,0.38),vec3(0.75,1.0,0.7),f)*l; gl_FragColor=vec4(c,0.16+0.6*f+uFocus*0.05); }' }));
    const core = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 16, 12), new THREE.MeshBasicMaterial({ visible: false })); // pick target
    const nucleus = surface(THREE, q, r * 0.42, 4, ['#a77bd8', '#e6d4ff', '#3d2463'], 5.2, 40); nucleus.position.set(0.15, 0.1, 0);
    const mito = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 10), new THREE.MeshStandardMaterial({ color: 0xff9f6b, roughness: 0.5, emissive: 0x401808 })); const a = i * 1.3; m.position.set(Math.cos(a) * r * 0.68, Math.sin(a * 1.7) * r * 0.4, Math.sin(a) * r * 0.62); m.rotation.set(a, a * 0.5, 0); mito.push(m); }
    const er = new THREE.Mesh(new THREE.TorusGeometry(r * 0.6, 0.025, 8, 80), new THREE.MeshStandardMaterial({ color: 0x9fe8b0, roughness: 0.6 })); er.rotation.x = 1.2;
    G.add(membrane, core, nucleus, er, ...mito);
    // DNA: two helical strands with base-pair rungs (instanced)
    const dna = new THREE.Group(); const n = [60, 90, 120][q], curve = i => { const u = i / n, ang = u * Math.PI * 1.25 - 0.6; return new THREE.Vector3(Math.cos(ang) * r * 2.0, (u - 0.5) * 1.4, Math.sin(ang) * r * 2.0); };
    const s1 = [], s2 = []; const rung = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshStandardMaterial({ color: 0xe4ffd9 }), n); const tmp = new THREE.Object3D();
    for (let i = 0; i <= n; i++) { const c = curve(i), tan = curve(Math.min(n, i + 1)).sub(curve(Math.max(0, i - 1))).normalize(), side = new THREE.Vector3(0, 1, 0).cross(tan).normalize(), up = tan.clone().cross(side), th = i * 0.45;
      const off = side.clone().multiplyScalar(Math.cos(th) * 0.16).addScaledVector(up, Math.sin(th) * 0.16); const a1 = c.clone().add(off), a2 = c.clone().sub(off); s1.push(a1); s2.push(a2);
      if (i < n) { tmp.position.copy(c); tmp.scale.set(1, off.length() * 2, 1); tmp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), off.clone().normalize()); tmp.updateMatrix(); rung.setMatrixAt(i, tmp.matrix); rung.setColorAt(i, new THREE.Color(['#7bd88f', '#ffd36b', '#ff8fa3', '#8fc7ff'][i % 4])); } }
    const strand = pts => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.028, 6, false), new THREE.MeshStandardMaterial({ color: 0xbff5c8, roughness: 0.4, emissive: 0x0d2a14 }));
    dna.add(strand(s1), strand(s2), rung); G.add(dna);
    return { core, r, body: [membrane, nucleus], update(t, dt, rv, fc) { memU.uT.value = t; memU.uFocus.value = fc; nucleus.rotation.y += dt * 0.1; nucleus.material.uniforms.uT.value = t; const pulse = 1 + 0.015 * Math.sin(t * 1.3); nucleus.scale.setScalar(pulse);
      mito.forEach((m, i) => { m.rotation.y += dt * (0.3 + i * 0.05); m.position.y += Math.sin(t * 0.8 + i) * 0.0008; }); er.rotation.z = t * 0.08;
      dna.rotation.y = t * 0.06; dna.scale.setScalar(0.55 + 0.45 * smooth(rv)); dna.visible = rv > 0.02; } };
  };

  B.geography = (THREE, q, G) => { // the living planet: oceans, continents, ice caps, clouds, atmosphere, city lights at night
    const r = 1.75, M = META.geography; const core = surface(THREE, q, r, 1, [M.c[0], M.c[1], M.c[2]], 0.4, [32, 64, 96][q]); G.add(core);
    const cu = { uSun: { value: SUN.v }, uT: { value: 0 } };
    const crt = SUN.renderer ? bake(THREE, 8, ['#ffffff', '#ffffff', '#ffffff'], 2.0, [512, 1024, 1024][q]) : null;
    const clouds = crt ? new THREE.Mesh(new THREE.SphereGeometry(r * 1.015, [24, 48, 72][q], [18, 36, 54][q]), new THREE.ShaderMaterial({ uniforms: { uMap: { value: crt.texture }, uSun: { value: SUN.v } }, transparent: true, depthWrite: false, vertexShader: LIT_V, fragmentShader: CLOUD_F })) : new THREE.Mesh(new THREE.SphereGeometry(r * 1.015, [24, 48, 72][q], [18, 36, 54][q]), new THREE.ShaderMaterial({ uniforms: cu, transparent: true, depthWrite: false,
      vertexShader: SURF_V, fragmentShader: `#define OCT ${q >= 2 ? 5 : 4}\n uniform vec3 uSun; uniform float uT; varying vec3 vP; varying vec3 vN; varying vec3 vW; ${NOISE} void main(){ vec3 p=normalize(vP); float c=fbm(p*3.0+vec3(uT*0.006,0.0,0.0)); c=smoothstep(0.05,0.5,c); float l=smoothstep(-0.15,0.5,dot(normalize(vN),uSun)); gl_FragColor=vec4(vec3(1.0)*(0.05+0.95*l),c*0.85); }` }));
    if (crt) clouds.userData.rt = crt; G.add(clouds, atmosphere(THREE, r * 1.1, '#7cc4ff', 1.35));
    return { core, r, body: [clouds], update(t, dt, rv, fc) { core.rotation.y += dt * 0.035; clouds.rotation.y += dt * 0.045; cu.uT.value = t; } };
  };

  B.cs = (THREE, q, G) => { // a matte world wrapped in a geodesic network; packets of data travel along its edges; a ring of bits
    const r = 1.2, M = META.cs; const core = surface(THREE, q, r, 7, [M.c[0], M.c[1], M.c[2]], 6.1); G.add(core); G.add(atmosphere(THREE, r * 1.06, '#b9a5ff', 0.7));
    const ico = new THREE.IcosahedronGeometry(r * 1.55, 1), P = ico.attributes.position, key = v => v.toArray().map(x => x.toFixed(3)).join(','); const verts = [], idx = new Map();
    for (let i = 0; i < P.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(P, i), k = key(v); if (!idx.has(k)) { idx.set(k, verts.length); verts.push(v); } }
    const E = new Set(); for (let i = 0; i < P.count; i += 3) { const ids = [0, 1, 2].map(j => idx.get(key(new THREE.Vector3().fromBufferAttribute(P, i + j)))); [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => { const x = Math.min(ids[a], ids[b]), y = Math.max(ids[a], ids[b]); E.add(x + '_' + y); }); }
    const edges = [...E].map(s => s.split('_').map(Number)); const lp = []; edges.forEach(([a, b]) => lp.push(verts[a], verts[b]));
    const net = new THREE.Group(); const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: 0xcdbfff, transparent: true, opacity: 0.32, depthWrite: false }));
    const nodes = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.045), new THREE.MeshStandardMaterial({ color: 0xe5dcff, emissive: 0x3a2a80, roughness: 0.3 }), verts.length); const tmp = new THREE.Object3D();
    verts.forEach((v, i) => { tmp.position.copy(v); tmp.updateMatrix(); nodes.setMatrixAt(i, tmp.matrix); }); net.add(lines, nodes); G.add(net);
    const NP = [14, 26, 40][q], pk = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP); const packets = Array.from({ length: NP }, (_, i) => ({ e: (i * 7) % edges.length, u: (i * 0.37) % 1, s: 0.35 + (i % 5) * 0.08 })); G.add(pk);
    const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0xa68cff, emissive: 0x241552 }), 64); G.add(bits);
    return { core, r, update(t, dt, rv, fc) { core.rotation.y += dt * 0.05; core.material.uniforms.uT.value = t; net.rotation.y = t * 0.03; net.scale.setScalar(0.75 + 0.25 * smooth(rv)); lines.material.opacity = 0.1 + 0.25 * rv + fc * 0.1;
      packets.forEach((p, i) => { p.u += dt * p.s; if (p.u > 1) { p.u = 0; const [a, b] = edges[p.e]; const nx = edges.findIndex((e, j) => j !== p.e && (e[0] === b || e[1] === b) && ((j + i) % 3 === 0)); p.e = nx >= 0 ? nx : (p.e + 5) % edges.length; } const [a, b] = edges[p.e]; tmp.position.lerpVectors(verts[a], verts[b], p.u).applyEuler(net.rotation).multiplyScalar(net.scale.x); tmp.scale.setScalar(rv); tmp.updateMatrix(); pk.setMatrixAt(i, tmp.matrix); });
      pk.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2 + t * 0.1, on = ((i * 2654435761 + Math.floor(t * 2)) >>> 0) % 3 === 0; tmp.position.set(Math.cos(a) * r * 2.3, Math.sin(a * 3) * 0.04, Math.sin(a) * r * 2.3); tmp.rotation.set(0, -a, 0); tmp.scale.setScalar((on ? 1.25 : 0.7) * smooth(rv)); tmp.updateMatrix(); bits.setMatrixAt(i, tmp.matrix); }
      bits.instanceMatrix.needsUpdate = true; } };
  };

  B.english = (THREE, q, G) => { // ink-marbled world; a ring of turning pages; letterforms drifting in orbit
    const r = 1.2, M = META.english; const core = surface(THREE, q, r, 4, [M.c[0], M.c[1], M.c[2]], 3.3); G.add(core); G.add(atmosphere(THREE, r * 1.07, '#ffc2d4', 0.8));
    const NPG = [16, 24, 32][q], pg = new THREE.PlaneGeometry(0.22, 0.3, 6, 1); const pp = pg.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i); pp.setZ(i, -0.06 * (x / 0.11) ** 2); }
    const pc = document.createElement('canvas'); pc.width = 128; pc.height = 176; { const g = pc.getContext('2d'); g.fillStyle = '#fbf1e6'; g.fillRect(0, 0, 128, 176); g.fillStyle = 'rgba(70,40,50,.55)'; for (let y = 22, k = 0; y < 160; y += 9, k++) { const w = k % 6 === 5 ? 40 + (k * 13) % 30 : 96 - (k * 7) % 14; g.fillRect(16, y, w, 2.2); } g.fillStyle = 'rgba(160,60,90,.8)'; g.font = 'italic 18px Fraunces, Georgia, serif'; g.fillText('II', 58, 16); }
    const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
    const pages = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x3a2a24, emissiveIntensity: 0.6 }), NPG); G.add(pages); const tmp = new THREE.Object3D();
    const glyphs = ['a', '&', '¶', 'Q', '“', 'e', 'R', '?', 'g', '§'].slice(0, q ? 10 : 6).map((c, i) => { const s = textSprite(THREE, c, { color: i % 2 ? '#fff3ea' : '#f0a6be', h: 0.32, font: i % 3 ? 'Fraunces, Georgia, serif' : 'italic Fraunces, Georgia, serif' }); G.add(s); return s; });
    return { core, r, update(t, dt, rv, fc) { core.rotation.y += dt * 0.05; core.material.uniforms.uT.value = t;
      for (let i = 0; i < NPG; i++) { const a = i / NPG * Math.PI * 2 + t * 0.08, R = r * (1.4 + 0.6 * smooth(rv)); tmp.position.set(Math.cos(a) * R, Math.sin(a * 2 + t * 0.5) * 0.08, Math.sin(a) * R); tmp.rotation.set(0.25 * Math.sin(t + i), -a + Math.PI / 2 + Math.sin(t * 0.9 + i) * 0.5, 0.1); tmp.scale.setScalar(smooth(rv)); tmp.updateMatrix(); pages.setMatrixAt(i, tmp.matrix); }
      pages.instanceMatrix.needsUpdate = true;
      glyphs.forEach((s, i) => { const a = t * (0.1 + i * 0.012) + i * 0.63, R = r * (1.9 + (i % 3) * 0.35); s.position.set(Math.cos(a) * R, Math.sin(a * 1.4 + i) * 0.7, Math.sin(a) * R); s.material.opacity = rv * (0.55 + 0.45 * Math.sin(t * 0.7 + i)); }); } };
  };

  B.history = (THREE, q, G) => { // sedimentary strata (layers of time); an orbiting colonnade, some columns whole, some fallen; a dial ring
    const r = 1.3, M = META.history; const core = surface(THREE, q, r, 3, [M.c[0], M.c[1], M.c[2]], 4.4); G.add(core); G.add(atmosphere(THREE, r * 1.06, '#ffd29a', 0.6));
    const NC = 14, col = new THREE.CylinderGeometry(0.045, 0.05, 1, 12); col.translate(0, 0.5, 0); const cap = new THREE.BoxGeometry(0.14, 0.035, 0.14);
    const stone = new THREE.MeshStandardMaterial({ color: 0xe9dcc3, roughness: 0.85 }); const cols = new THREE.InstancedMesh(col, stone, NC), caps = new THREE.InstancedMesh(cap, stone, NC); const tmp = new THREE.Object3D();
    const H = Array.from({ length: NC }, (_, i) => [0.5, 0.5, 0.32, 0.5, 0.18, 0.5, 0.5, 0.41, 0.5, 0.27, 0.5, 0.5, 0.36, 0.5][i]);
    const colon = new THREE.Group(); colon.add(cols, caps); G.add(colon);
    const dial = ringLine(THREE, r * 1.9, 0xf5e2c0, 0.45); G.add(dial); const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.015, 0.015, 0.12), new THREE.MeshBasicMaterial({ color: 0xf5e2c0 }), 12); G.add(ticks);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; tmp.position.set(Math.cos(a) * r * 1.9, 0, Math.sin(a) * r * 1.9); tmp.lookAt(0, 0, 0); tmp.scale.set(1, 1, i % 3 ? 1 : 2); tmp.updateMatrix(); ticks.setMatrixAt(i, tmp.matrix); }
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, r * 1.75), new THREE.MeshBasicMaterial({ color: 0xffd29a })); hand.geometry.translate(0, 0, r * 0.875); G.add(hand);
    return { core, r, update(t, dt, rv, fc) { core.rotation.y += dt * 0.04; core.material.uniforms.uT.value = t;
      for (let i = 0; i < NC; i++) { const a = i / NC * Math.PI * 2 + t * 0.03, R = r * (1.35 + 0.15 * smooth(rv)), h = H[i] * (0.15 + 0.85 * smooth(rv)) * 1.1; tmp.position.set(Math.cos(a) * R, -0.05, Math.sin(a) * R); tmp.rotation.set(0, -a, H[i] < 0.3 ? 0.25 : 0); tmp.scale.set(1, h, 1); tmp.updateMatrix(); cols.setMatrixAt(i, tmp.matrix);
        tmp.position.y = -0.05 + h; tmp.scale.set(1, 1, 1); tmp.visible = H[i] === 0.5; tmp.updateMatrix(); caps.setMatrixAt(i, H[i] === 0.5 ? tmp.matrix : new THREE.Matrix4().makeScale(0, 0, 0)); }
      cols.instanceMatrix.needsUpdate = true; caps.instanceMatrix.needsUpdate = true; colon.rotation.z = 0.12; dial.material.opacity = 0.45 * rv; hand.rotation.y = -t * 0.12; hand.scale.setScalar(rv); ticks.visible = rv > 0.05; } };
  };

  B.languages = (THREE, q, G) => { // a warm dune world; two orbits of greetings in many writing systems, passing like conversation
    const r = 1.2, M = META.languages; const core = surface(THREE, q, r, 5, [M.c[0], M.c[1], M.c[2]], 7.7); G.add(core); G.add(atmosphere(THREE, r * 1.07, '#ffd27a', 0.85));
    /* only scripts this device can actually draw: a word is dropped if any of its letters falls back to the "missing glyph" box */
    const canDraw = w => { try { const g = document.createElement('canvas').getContext('2d'); g.font = '40px "Instrument Sans", "IBM Plex Sans Arabic", system-ui, sans-serif'; const box = g.measureText('\u0378').width, box2 = g.measureText('\uFFFF').width;
      return [...w.replace(/\s/g, '')].every(ch => { const wd = g.measureText(ch).width; return wd > 0 && Math.abs(wd - box) > 0.01 && Math.abs(wd - box2) > 0.01; }); } catch (e) { return /^[\x20-\x7e\u00c0-\u017f]+$/.test(w); } };
    const words = ['Hello', 'Hola', 'Bonjour', 'مرحبا', 'नमस्ते', '你好', 'Γειά σου', 'Привет', 'Jambo', 'こんにちは', 'Olá', '안녕하세요'].filter(canDraw).slice(0, q ? 12 : 8);
    G.userData.words = words;
    const S = words.map((w, i) => { const s = textSprite(THREE, w, { color: i % 2 ? '#fff0c7' : '#f2b84b', h: 0.2, size: 72, font: /[؀-ۿ]/.test(w) ? '"IBM Plex Sans Arabic", sans-serif' : '"Instrument Sans", system-ui, sans-serif', weight: 500 }); G.add(s); return s; });
    const o1 = ringLine(THREE, r * 1.85, 0xffe2a0, 0.25), o2 = ringLine(THREE, r * 2.35, 0xffe2a0, 0.18); o1.rotation.x = 0.35; o2.rotation.set(-0.3, 0, 0.2); G.add(o1, o2);
    return { core, r, update(t, dt, rv, fc) { core.rotation.y += dt * 0.05; core.material.uniforms.uT.value = t; o1.material.opacity = 0.25 * rv; o2.material.opacity = 0.18 * rv;
      S.forEach((s, i) => { const inner = i % 2 === 0, k = Math.floor(i / 2), n = Math.ceil(S.length / 2), a = (inner ? 1 : -1) * t * 0.09 + k / n * Math.PI * 2, R = r * (inner ? 1.85 : 2.35);
        const v = new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R).applyEuler(inner ? o1.rotation : o2.rotation); s.position.copy(v).multiplyScalar(0.75 + 0.25 * smooth(rv)); s.material.opacity = rv * (0.7 + 0.3 * Math.sin(t * 0.6 + i)); }); } };
  };

  B.social = (THREE, q, G) => { // a dusk world whose night side is lit by cities; arcs of travel and exchange connect them
    const r = 1.3, M = META.social; const core = surface(THREE, q, r, 6, [M.c[0], M.c[1], M.c[2]], 8.8); G.add(core); G.add(atmosphere(THREE, r * 1.08, '#a9c8ec', 1));
    const cities = [[0.6, 0.3], [-0.3, 1.2], [0.2, 2.3], [-0.5, 3.4], [0.45, 4.2], [-0.15, 5.4], [0.8, 0.9], [-0.7, 2.0]].map(([la, lo]) => new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)).multiplyScalar(r * 1.01));
    const arcs = new THREE.Group(); const travellers = []; const pairs = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 6], [6, 2], [7, 3], [5, 0], [1, 7]];
    pairs.forEach(([a, b], i) => { const A = cities[a], Bv = cities[b], mid = A.clone().add(Bv).normalize().multiplyScalar(r * (1.35 + A.distanceTo(Bv) * 0.18)); const cv = new THREE.QuadraticBezierCurve3(A, mid, Bv);
      arcs.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cv.getPoints(40)), new THREE.LineBasicMaterial({ color: 0xdbe8f5, transparent: true, opacity: 0.35, depthWrite: false })));
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0a8 })); arcs.add(d); travellers.push({ cv, d, o: i * 0.17 }); });
    cities.forEach(c => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd28a })); m.position.copy(c); arcs.add(m); });
    core.add(arcs);
    return { core, r, update(t, dt, rv, fc) { core.rotation.y += dt * 0.04; core.material.uniforms.uT.value = t; arcs.children.forEach(c => { if (c.isLine) c.material.opacity = 0.05 + 0.35 * rv; });
      travellers.forEach(x => { x.d.position.copy(x.cv.getPoint(((t * 0.18 + x.o) % 1))); x.d.visible = rv > 0.1; }); } };
  };

  B.more = (THREE, q, G) => { // markets and minds: a ring of bars that rises and falls like a market; a small constellation of firing neurons
    const r = 1.2, M = META.more; const core = surface(THREE, q, r, 0, ['#c8b35a', '#f4ecc4', '#5a4a18'], 9.9); G.add(core); G.add(atmosphere(THREE, r * 1.07, '#f0dc8a', 0.7));
    const NB = [32, 48, 64][q], bar = new THREE.BoxGeometry(0.05, 1, 0.05); bar.translate(0, 0.5, 0); const bars = new THREE.InstancedMesh(bar, new THREE.MeshStandardMaterial({ color: 0xf4ecc4, roughness: 0.5, emissive: 0x2a2408 }), NB); const tmp = new THREE.Object3D();
    const ringG = new THREE.Group(); ringG.rotation.set(0.32, 0, -0.12); ringG.add(bars); G.add(ringG);
    const NN = [10, 16, 22][q], nodes = Array.from({ length: NN }, (_, i) => new THREE.Vector3(Math.cos(i * 2.4) * (1 + (i % 3) * 0.25), 1.6 + Math.sin(i * 1.7) * 0.35, Math.sin(i * 2.4) * (1 + (i % 3) * 0.25)).multiplyScalar(r));
    const lp = []; nodes.forEach((a, i) => nodes.forEach((b, j) => { if (j > i && a.distanceTo(b) < r * 0.95) lp.push(a, b); }));
    const syn = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: 0xf4ecc4, transparent: true, opacity: 0.25, depthWrite: false }));
    const neu = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), NN); G.add(syn, neu);
    return { core, r, update(t, dt, rv, fc) { core.rotation.y += dt * 0.05; core.material.uniforms.uT.value = t;
      for (let i = 0; i < NB; i++) { const a = i / NB * Math.PI * 2, R = r * 1.6, h = (0.12 + 0.42 * (0.5 + 0.5 * Math.sin(a * 3 + t * 0.6) * Math.cos(a * 5 - t * 0.35))) * smooth(rv); tmp.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); tmp.rotation.set(0, -a, 0); tmp.scale.set(1, Math.max(0.001, h), 1); tmp.updateMatrix(); bars.setMatrixAt(i, tmp.matrix); }
      bars.instanceMatrix.needsUpdate = true; ringG.rotation.y = t * 0.03;
      nodes.forEach((p, i) => { const f = Math.max(0, Math.sin(t * 2.1 + i * 1.7)) ** 8; tmp.position.copy(p); tmp.rotation.set(0, 0, 0); tmp.scale.setScalar((0.6 + 1.4 * f) * smooth(rv)); tmp.updateMatrix(); neu.setMatrixAt(i, tmp.matrix); });
      neu.instanceMatrix.needsUpdate = true; syn.material.opacity = 0.25 * rv; syn.rotation.y = neu.rotation.y = t * 0.05; } };
  };

  function build(THREE, id, q) {
    if (!SUN.v) SUN.v = new THREE.Vector3(0.62, 0.42, 0.66).normalize();
    const G = new THREE.Group(); G.name = 'world:' + id; const w = B[id](THREE, q, G);
    /* level of detail: far away, a world is only its body (planet, atmosphere); its structures appear as the camera approaches */
    const body = new Set([w.core, ...(w.body || [])]); G.children.forEach(c => { const atm = c.material && c.material.blending === THREE.AdditiveBlending && c.material.side === THREE.BackSide; if (!body.has(c) && !atm) c.userData.detail = true; });
    const words = G.userData && G.userData.words; w.core.userData.world = id; G.userData = { words, id, core: w.core, radius: w.r, reveal: 0, focus: 0,
      setFar(far) { if (G.userData.far === far) return; G.userData.far = far; G.children.forEach(c => { if (c.userData.detail) c.visible = !far; }); },
      update(t, dt, rv, fc) { G.userData.reveal = rv; G.userData.focus = fc; G.traverse(o => { const u = o.material && o.material.uniforms; if (u && u.uFocus) u.uFocus.value = fc; }); w.update(t, dt, clamp(rv, 0, 1), clamp(fc, 0, 1)); },
      dispose() { G.traverse(o => { if (o.userData.rt) o.userData.rt.dispose(); if (o.geometry) o.geometry.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(mm => { if (mm.map) mm.map.dispose(); mm.dispose(); }); }); } };
    return G;
  }
  LS.cosmosWorlds = { META, ORDER, build, SUN, NOISE, textSprite, surface, atmosphere };
})();
