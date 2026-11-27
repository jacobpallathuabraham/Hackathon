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
  void main(){ vec3 n=normalize(vN); vec3 V=normalize(cameraPosition-vW); float ndv=abs(dot(n,V)); float f=pow(1.0-ndv,2.8)*smoothstep(0.0,0.06,ndv); /* a thin limb, as seen from space */ float mu=dot(n,uSun);
    float day=smoothstep(-0.35,0.5,mu); float term=exp(-pow((mu+0.04)*5.0,2.0)); float fwd=pow(max(dot(-V,uSun),0.0),6.0);
    vec3 col=uCol*(0.03+day*1.05)+vec3(1.0,0.5,0.25)*term*0.35+mix(uCol,vec3(1.0,0.85,0.7),0.4)*fwd*0.8*smoothstep(-0.45,0.15,mu);
    gl_FragColor=vec4(col*f*(uK*0.9+uFocus*0.2),1.0); }`;
  const ATM_V = `varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;

  const SUN = { v: null, renderer: null }; // shared sun direction, and the renderer used to bake surfaces (set by the universe / world header)

  /* Surfaces are BAKED (v39): the procedural colour AND a height field are rendered once into two equirectangular textures
     (matching three's sphere UVs). Every frame then costs three texture lookups plus lighting: the height field gives real
     relief — craters, mountain ranges, dune ridges, cell walls — that catches the low sun at the terminator. */
  const BAKE_F = (oct) => `#define OCT ${oct}
  uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uMode; uniform float uSeed; uniform float uOut; varying vec2 vUv; ${NOISE}
  float hh(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
  float craters(vec3 p, float sc, float dens){ p*=sc; vec3 i=floor(p); float h=0.0;
    for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){ vec3 c=i+vec3(float(x),float(y),float(z)); if(hh(c+3.1)>dens) continue;
      vec3 o=c+vec3(hh(c),hh(c+1.7),hh(c+5.3)); float r=0.18+0.32*hh(c+7.9); float d=length(p-o)/r;
      h+= d<1.0 ? -(1.0-d*d)*0.9 : (d<1.35 ? 0.4*(1.0-(d-1.0)/0.35) : 0.0); }
    return h; }
  float ridged(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ float n=1.0-abs(snoise(p)); s+=a*n*n; p*=2.1; a*=0.5; } return s; }
  /* cellular (Worley) noise: distance to the nearest and second-nearest feature point, and the nearest cell's id */
  vec3 worley(vec3 p){ vec3 i=floor(p), f=fract(p); float d1=8.0, d2=8.0, id=0.0;
    for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){ vec3 g=vec3(float(x),float(y),float(z)), c=i+g, o=vec3(hh(c),hh(c+1.7),hh(c+5.3)); float d=length(g+o-f);
      if(d<d1){ d2=d1; d1=d; id=hh(c+9.1); } else if(d<d2) d2=d; }
    return vec3(d1,d2,id); }
  /* rectilinear coordinates on the face of a cube projected onto the sphere (for circuit traces and ruins: no pole pinching) */
  vec2 cubeUV(vec3 p){ vec3 a=abs(p); if(a.x>=a.y&&a.x>=a.z) return p.yz/a.x; if(a.y>=a.z) return p.xz/a.y; return p.xy/a.z; }
  void main(){ float ph=vUv.x*6.2831853, th=(1.0-vUv.y)*3.14159265; vec3 p=vec3(-cos(ph)*sin(th),cos(th),sin(ph)*sin(th)); vec3 col; float code=0.0; float hgt=0.5;
    float mott=fbm(p*9.0+uSeed*1.3)*0.5+fbm(p*26.0+uSeed)*0.25;                       // fine albedo variation everywhere
    if(uMode<0.5){ // banded giant: zonal bands, turbulent edges, a great storm
      float wv=fbm(p*vec3(2.0,9.0,2.0)+uSeed)*0.08; float lat=p.y+0.05*fbm(p*3.0+uSeed)+wv; float b=sin(lat*19.0+fbm(p*1.6+uSeed)*2.4);
      col=mix(uA,uB,0.5+0.5*b); col=mix(col,uC,smoothstep(0.5,1.0,abs(sin(lat*6.0)))*0.5);
      float sw=fbm(p*vec3(14.0,3.0,14.0)+uSeed*2.0); col*=0.88+0.22*sw;
      vec3 sc=normalize(vec3(0.7,-0.25,0.6)); float sd=length((p-sc)*vec3(1.0,2.3,1.0)); float storm=smoothstep(0.32,0.0,sd); float swirl=sin(atan(p.y-sc.y,p.x-sc.x)*3.0+sd*30.0);
      col=mix(col,mix(uC*1.25,uB,0.4+0.3*swirl),storm*0.85); hgt=0.5+0.04*b; }
    else if(uMode<1.5){ // a living world: oceans, continents, mountains, deserts, forests, ice
      float h=fbm(p*2.2+uSeed)+0.12*ridged(p*5.0+uSeed); float land=smoothstep(0.0,0.07,h);
      float depth=smoothstep(-0.5,0.02,h); vec3 sea=mix(uA*0.35,uA*0.95,depth); sea=mix(sea,uB*0.8,smoothstep(-0.02,0.02,h)*0.35);
      float hum=fbm(p*3.5+uSeed+4.0); vec3 forest=uC*(0.8+0.3*mott), desert=vec3(0.62,0.52,0.36)*(0.9+0.2*mott), rockc=vec3(0.42,0.38,0.33);
      vec3 gr=mix(desert,forest,smoothstep(-0.15,0.2,hum)); gr=mix(gr,rockc,smoothstep(0.3,0.55,h)); gr=mix(gr,vec3(0.92,0.94,0.97),smoothstep(0.55,0.7,h));
      col=mix(sea,gr,land); float ice=smoothstep(0.76,0.86,abs(p.y)+0.06*h); col=mix(col,vec3(0.93,0.96,1.0),ice);
      float night=land*(1.0-ice)*smoothstep(0.35,0.62,fbm(p*24.0+3.0))*smoothstep(-0.1,0.25,hum)*0.85;
      code = land>0.5 ? 0.5+0.5*night : 0.4*(1.0-ice); hgt = land>0.5 ? 0.5+0.5*clamp(h,0.0,0.8)+0.15*ridged(p*9.0) : 0.5; }
    else if(uMode<2.5){ // crystalline ice world: fractured plates, cracks, frost, impact scars
      vec3 q=p*2.0; float c1=fbm(q+uSeed); float cell=abs(fract(c1*1.6)-0.5); float crack=smoothstep(0.035,0.0,cell)*smoothstep(0.2,0.6,fbm(p*5.0+uSeed));
      col=mix(uC,uA,smoothstep(0.0,0.45,cell)); col=mix(col,uB,0.35+0.35*mott); col=mix(col,uC*0.55,crack*0.8);
      col=mix(col,uB,smoothstep(0.1,0.6,fbm(p*3.0+uSeed+5.0))*0.35); float cr=craters(p,5.0,0.18); col*=0.94+0.08*cr; hgt=0.5+0.18*smoothstep(0.0,0.4,cell)-0.18*crack+0.14*cr; }
    else if(uMode<3.5){ // layered canyon world: strata, mesas and eroded valleys
      float y=p.y*8.0+fbm(p*2.0+uSeed)*1.9; float band=fract(y); float k=floor(y); vec3 a=mix(uA,uC,fract(sin(k*12.9898)*43758.5));
      col=mix(a,uB,smoothstep(0.82,0.98,band)*0.55); col*=0.8+0.3*mott; float val=smoothstep(0.55,0.85,ridged(p*3.0+uSeed));
      col=mix(col,uC*0.7,val*0.5); hgt=0.5+0.15*floor(band*4.0)/4.0-0.3*val+0.1*craters(p,5.0,0.2); }
    else if(uMode<4.5){ // marbled world: swirling cloud tops in soft colour
      vec3 q=p*1.6; vec3 w=vec3(fbm(q+uSeed),fbm(q+uSeed+4.1),fbm(q+uSeed+8.3)); float m=fbm(q+2.2*w);
      col=mix(uB,uA,smoothstep(-0.3,0.35,m)); col=mix(col,uC,smoothstep(0.35,0.7,m)); col*=0.9+0.18*mott; hgt=0.5+0.08*m; }
    else if(uMode<5.5){ // dune sea: wind-aligned ridges, dark interdune flats, rocky outcrops
      float d=sin(p.x*26.0+p.z*6.0+fbm(p*3.0+uSeed)*6.0)*0.5+0.5; d=pow(d,1.6); float rk=smoothstep(0.5,0.8,fbm(p*4.0+uSeed+9.0));
      col=mix(uC*1.1,uA,d*0.65+0.25*mott); col=mix(col,uB,smoothstep(0.85,1.0,d)*0.35); col=mix(col,uC*0.6,rk*0.6);
      hgt=0.5+0.22*d+0.25*rk; }
    else if(uMode<6.5){ // twilight world with cities
      float h=fbm(p*2.5+uSeed)+0.1*ridged(p*6.0+uSeed); col=mix(uC,uA,smoothstep(-0.3,0.4,h)); col*=0.85+0.25*mott; float city=smoothstep(0.32,0.6,fbm(p*16.0+1.7))*smoothstep(0.0,0.2,h); code=0.5+0.5*city; hgt=0.5+0.35*clamp(h,0.0,1.0); }
    else if(uMode<7.5){ // rocky, airless: highlands and maria, crater fields at every scale
      float h=fbm(p*3.0+uSeed); float mare=smoothstep(0.05,0.3,fbm(p*1.4+uSeed+2.0)); col=mix(uC,uA,0.5+0.5*h); col=mix(col,uB,smoothstep(0.35,0.7,h)*0.35); col=mix(col,col*0.55,mare*0.6);
      float cr=craters(p,4.0,0.3)+0.6*craters(p,11.0,0.35)+0.35*craters(p,27.0,0.4); col*=0.85+0.25*mott+0.08*cr; hgt=0.5+0.2*h-0.12*mare+0.22*cr; }
    else if(uMode<8.5){ float c=fbm(p*3.0+uSeed)+0.35*fbm(p*9.0+uSeed+2.0); col=vec3(1.0); code=smoothstep(0.08,0.55,c)*0.85; }
    else if(uMode<9.5){ // MATHEMATICS — a crystalline geometric world: faceted mineral plates with layered strata, fine luminous seams
      vec3 w=worley(p*3.2+uSeed); float edge=smoothstep(0.0,0.07,w.y-w.x); vec3 w2=worley(p*9.0+uSeed+3.0); float e2=smoothstep(0.0,0.05,w2.y-w2.x);
      float lay=fract((dot(p,normalize(vec3(0.3+w.z,1.0,0.2-w.z)))+w.z*0.7)*(6.0+6.0*w.z)); vec3 m=mix(uC,uA,0.35+0.65*w.z); m=mix(m,uB,smoothstep(0.8,0.97,lay)*0.22*smoothstep(0.3,0.7,w.z));
      col=m*(0.82+0.3*mott)*(0.75+0.25*e2); col=mix(uC*0.35,col,edge);
      float seam=(1.0-smoothstep(0.0,0.012,w.y-w.x))*step(0.55,hh(vec3(w.z*91.0)));
      code=0.5+0.5*seam; hgt=0.5+0.22*w.z*edge-0.18*(1.0-edge)-0.05*(1.0-e2); }
    else if(uMode<10.5){ // PHYSICS — a ringed gas giant: zonal bands and jets, turbulent belt edges, storms, darker poles
      float lat=p.y; float warp=fbm(vec3(p.x*2.0,p.y*14.0,p.z*2.0)+uSeed)*0.06+fbm(p*vec3(6.0,2.0,6.0)+uSeed)*0.03;
      float b=sin((lat+warp)*26.0+fbm(p*1.3+uSeed)*1.4); float zone=0.5+0.5*b; col=mix(uC,uA,smoothstep(0.15,0.85,zone)); col=mix(col,uB,smoothstep(0.75,1.0,zone)*0.65);
      float jet=fbm(vec3(p.x*18.0,p.y*90.0,p.z*18.0)+uSeed); col*=0.9+0.16*jet;
      float st=0.0; for(int k=0;k<3;k++){ vec3 sc=normalize(vec3(sin(float(k)*2.1+uSeed),-0.32+0.3*float(k),cos(float(k)*2.1+uSeed))); vec3 d=(p-sc)*vec3(1.0,2.6,1.0); float sd=length(d); float s0=smoothstep(0.18-0.05*float(k),0.0,sd);
        float sw=sin(atan(d.y,d.x+d.z)*3.0+sd*40.0); col=mix(col,mix(uB,uC*1.2,0.5+0.5*sw),s0*0.8); st+=s0; }
      col*=1.0-0.35*smoothstep(0.75,0.98,abs(p.y)); hgt=0.5+0.03*b; }
    else if(uMode<11.5){ // CHEMISTRY — crystal formations of a mineral world, with a molecular lattice etched into them
      vec3 g=worley(p*2.6+uSeed); float grain=smoothstep(0.0,0.08,g.y-g.x); vec3 a=worley(p*26.0+uSeed+1.0); float atom=1.0-smoothstep(0.08,0.16,a.x); float bond=1.0-smoothstep(0.0,0.035,a.y-a.x);
      col=mix(uC,uA,0.3+0.7*g.z); col=mix(col,uB,smoothstep(0.6,0.95,fbm(p*5.0+uSeed))*0.45); col*=0.8+0.25*mott; col=mix(col*0.55,col,grain);
      col=mix(col,uB,atom*0.45*grain); col=mix(col,col*0.7,bond*0.4*grain);
      code=0.25*grain*smoothstep(0.4,0.8,g.z); /* crystal faces: a specular glint */ hgt=0.5+0.2*g.z*grain-0.15*(1.0-grain)+0.05*atom; }
    else if(uMode<12.5){ // BIOLOGY — a living world: warm shallow seas, continents patterned like tissue and reef, bioluminescence at night
      float h=fbm(p*2.0+uSeed)+0.1*ridged(p*4.0+uSeed); float land=smoothstep(0.0,0.06,h); vec3 c1=worley(p*7.0+uSeed+2.0); float tissue=smoothstep(0.0,0.09,c1.y-c1.x);
      vec3 sea=mix(uA*0.35,uA*0.95,smoothstep(-0.5,0.03,h)); sea=mix(sea,uB*0.85,smoothstep(-0.05,0.02,h)*0.45);
      vec3 gr=mix(uC*0.8,uC*1.15,c1.z); gr=mix(gr,vec3(0.55,0.62,0.3),smoothstep(0.25,0.55,fbm(p*4.0+uSeed+6.0))*0.5); gr=mix(gr*0.55,gr,tissue);
      col=mix(sea,gr,land); col*=0.88+0.2*mott; float ice=smoothstep(0.82,0.9,abs(p.y)+0.05*h); col=mix(col,vec3(0.9,0.97,0.95),ice);
      float glow=(1.0-tissue)*land*(1.0-ice)*smoothstep(0.2,0.6,fbm(p*12.0+uSeed));
      code = land>0.5 ? 0.5+0.5*glow : 0.38*(1.0-ice); hgt = land>0.5 ? 0.55+0.25*clamp(h,0.0,0.8)-0.08*(1.0-tissue) : 0.5; }
    else if(uMode<14.5){ // COMPUTER SCIENCE — a dark data world: rectilinear traces between nodes, carried on the surface
      vec2 c=cubeUV(p); float g1=min(abs(fract(c.x*22.0)-0.5),abs(fract(c.y*22.0)-0.5)); float mask=smoothstep(0.15,0.45,fbm(p*3.0+uSeed)); vec2 cell=floor(c*22.0);
      float run=step(0.45,hh(vec3(cell,uSeed))); float tr=(1.0-smoothstep(0.0,0.05,g1))*mask*run; vec2 fc=fract(c*22.0)-0.5; float node=(1.0-smoothstep(0.08,0.14,length(fc)))*mask*step(0.72,hh(vec3(cell,3.0)));
      col=mix(uC,uC*1.9,fbm(p*6.0+uSeed)*0.5+0.4)*(0.85+0.2*mott); col=mix(col,uA*1.15,tr*0.8); col=mix(col,uB,node*0.9);
      code=0.5+0.5*clamp(tr*0.6+node,0.0,1.0); hgt=0.5+0.04*tr+0.08*node-0.02*mott; }
    else if(uMode<15.5){ // ENGLISH — a manuscript world: parchment plains under marbled ink, lines of script running across the pages
      vec3 q=p*1.4; vec3 w=vec3(fbm(q+uSeed),fbm(q+uSeed+4.1),fbm(q+uSeed+8.3)); float m=fbm(q+2.0*w);
      col=mix(uB,uA,smoothstep(-0.25,0.45,m)*0.75); col=mix(col,uC,smoothstep(0.45,0.8,m)*0.7); col*=0.9+0.15*mott;
      float lat=p.y+0.03*fbm(p*5.0+uSeed); float line=1.0-smoothstep(0.08,0.22,abs(fract(lat*70.0)-0.5)); float words=step(0.42,fbm(vec3(atan(p.z,p.x)*24.0,lat*70.0,0.0)+uSeed)); float page=smoothstep(-0.1,0.1,fbm(p*2.5+uSeed+2.0));
      col=mix(col,uC*0.45,line*words*page*0.35); hgt=0.5+0.06*m-0.03*line*words*page; }
    else if(uMode<16.5){ // HISTORY — a world of deep time: strata and mesas, and the faint rectilinear traces of ancient foundations on the plateaus
      float y=p.y*8.0+fbm(p*2.0+uSeed)*1.9; float band=fract(y); float k=floor(y); vec3 a=mix(uA,uC,fract(sin(k*12.9898)*43758.5));
      col=mix(a,uB,smoothstep(0.82,0.98,band)*0.55); col*=0.8+0.3*mott; float val=smoothstep(0.55,0.85,ridged(p*3.0+uSeed)); col=mix(col,uC*0.7,val*0.5);
      vec2 c=cubeUV(p); float g=min(abs(fract(c.x*40.0)-0.5),abs(fract(c.y*40.0)-0.5)); float plateau=smoothstep(0.1,0.3,fbm(p*3.0+uSeed+4.0))*(1.0-val);
      float ruin=(1.0-smoothstep(0.0,0.04,g))*plateau*step(0.55,hh(vec3(floor(c*40.0),2.0)));
      col=mix(col,uB*0.95,ruin*0.35); hgt=0.5+0.15*floor(band*4.0)/4.0-0.3*val+0.1*craters(p,5.0,0.2)+0.04*ruin; }
    else if(uMode<17.5){ // LANGUAGES — a dune world crossed by sweeping calligraphic strokes
      float d=sin(p.x*26.0+p.z*6.0+fbm(p*3.0+uSeed)*6.0)*0.5+0.5; d=pow(d,1.6); float rk=smoothstep(0.5,0.8,fbm(p*4.0+uSeed+9.0));
      col=mix(uC*1.1,uA,d*0.65+0.25*mott); col=mix(col,uB,smoothstep(0.85,1.0,d)*0.35); col=mix(col,uC*0.6,rk*0.6);
      float n=fbm(p*1.7+uSeed+1.0)+0.5*fbm(p*3.4+uSeed+5.0); float iso=abs(fract(n*5.0)-0.5); float wid=0.02+0.05*smoothstep(-0.3,0.5,fbm(p*6.0+uSeed));
      float stroke=(1.0-smoothstep(wid*0.5,wid,iso))*smoothstep(0.0,0.4,fbm(p*2.2+uSeed+3.0));
      col=mix(col,uC*0.35,stroke*0.75); hgt=0.5+0.22*d+0.25*rk-0.06*stroke; }
    else if(uMode<18.5){ // SOCIAL SCIENCE — a lived-in world: cities that light the night side and the roads that connect them
      float h=fbm(p*2.5+uSeed)+0.1*ridged(p*6.0+uSeed); col=mix(uC,uA,smoothstep(-0.3,0.4,h)); col*=0.85+0.25*mott;
      float dense=smoothstep(0.25,0.6,fbm(p*5.0+1.7)); vec3 r=worley(p*14.0+uSeed); float road=(1.0-smoothstep(0.0,0.03,r.y-r.x))*dense*smoothstep(0.0,0.2,h);
      float city=smoothstep(0.32,0.6,fbm(p*16.0+1.7))*smoothstep(0.0,0.2,h);
      col=mix(col,uB*0.9,road*0.4); code=0.5+0.5*clamp(city+road*0.6,0.0,1.0); hgt=0.5+0.35*clamp(h,0.0,1.0); }
    else { // ECONOMICS & PSYCHOLOGY — terraced highlands (like a chart's levels) threaded with a fine neural network
      float h=fbm(p*2.2+uSeed); float ter=floor(clamp(h+0.5,0.0,1.0)*7.0)/7.0; col=mix(uC,uA,ter); col=mix(col,uB,smoothstep(0.6,0.9,ter)*0.45); col*=0.85+0.2*mott;
      float nv=ridged(p*3.5+uSeed); float vein=smoothstep(0.78,0.95,nv); vec3 nd=worley(p*8.0+uSeed); float soma=1.0-smoothstep(0.05,0.12,nd.x);
      col=mix(col,uB,vein*0.35+soma*0.4); code=0.5+0.5*clamp(vein*0.5+soma,0.0,1.0); hgt=0.5+0.2*ter+0.05*vein; }
    gl_FragColor = uOut<0.5 ? vec4(col,code) : vec4(vec3(clamp(hgt,0.0,1.0)),1.0); }`;
  function bake(THREE, mode, cols, seed, w, outH) {
    const R = SUN.renderer; if (!R) return null;
    const rt = new THREE.WebGLRenderTarget(w, w / 2, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping });
    const m = new THREE.ShaderMaterial({ depthTest: false, uniforms: { uA: { value: new THREE.Color(cols[0]) }, uB: { value: new THREE.Color(cols[1]) }, uC: { value: new THREE.Color(cols[2]) }, uMode: { value: mode }, uSeed: { value: seed }, uOut: { value: outH ? 1 : 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: BAKE_F(6) });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m), sc = new THREE.Scene(); sc.add(quad);
    const prev = R.getRenderTarget(); R.setRenderTarget(rt); R.render(sc, new THREE.Camera()); R.setRenderTarget(prev); quad.geometry.dispose(); m.dispose(); return rt;
  }
  const LIT_V = 'varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vTu; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vTu=normalize(mat3(modelMatrix)*vec3(position.z,0.0,-position.x)+vec3(1e-5)); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }';
  /* lighting for a real planet: Lambert on the bumped normal, a soft terminator (the atmosphere bends light a little past
     the edge), a warm sunset band along it, specular sun-glint and Fresnel on water, city lights on the night side, and
     aerial perspective — the limb dissolves into the atmosphere's colour */
  const LIT_F = `uniform sampler2D uMap; uniform sampler2D uH; uniform vec2 uTx; uniform float uBump; uniform vec3 uSun; uniform vec3 uA; uniform vec3 uAtm; uniform float uAtmK; uniform float uFocus; uniform vec3 uGlow; uniform float uGlowDay; uniform vec3 uRingC; uniform vec3 uRingN; uniform vec2 uRingR;
  varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vTu;
  void main(){ vec4 t=texture2D(uMap,vUv); vec3 n=normalize(vN); vec3 V=normalize(cameraPosition-vW);
    vec3 nb=n;
    if(uBump>0.0){ float h0=texture2D(uH,vUv).r, hu=texture2D(uH,vUv+vec2(uTx.x,0.0)).r, hv=texture2D(uH,vUv+vec2(0.0,uTx.y)).r;   // relief (skipped for smooth gas worlds)
      vec3 Tu=normalize(vTu-n*dot(vTu,n)); vec3 Tv=cross(n,Tu); nb=normalize(n-uBump*((hu-h0)*Tu+(hv-h0)*Tv)); }
    float ndl0=dot(n,uSun), ndl=dot(nb,uSun); float ndv=max(dot(n,V),0.0);
    float term=smoothstep(-0.1,0.22,ndl0);
    float diff=max(ndl,0.0)*term + max(ndl0+0.08,0.0)*0.06*uAtmK;          // + a little light scattered past the terminator
    vec3 c=t.rgb*(diff*1.18+0.014+0.05*(1.0-term));                      // + faint light on the night side (starlight and bounce), so a backlit world still reads as a world
    float water=t.a<0.45&&t.a>0.001?t.a/0.4:0.0, night=t.a>=0.5?(t.a-0.5)*2.0:0.0; vec3 H=normalize(uSun+V);
    float fres=0.03+0.97*pow(1.0-ndv,5.0);
    c+=water*(pow(max(dot(n,H),0.0),900.0)*1.0+pow(max(dot(n,H),0.0),70.0)*0.1)*vec3(1.0,0.93,0.82)*term;
    c+=water*fres*uAtm*0.35*smoothstep(-0.05,0.5,ndl0);
    c+=night*(1.0-smoothstep(-0.18,0.06,ndl0))*uGlow*1.05 + night*uGlowDay*uGlow*0.35*smoothstep(-0.1,0.4,ndl0);   // city lights / bioluminescence at night; a faint glow by day where a world carries its own light
    if(uRingR.y>0.0){ float dn=dot(uSun,uRingN); if(abs(dn)>1e-3){ float tt=dot(uRingC-vW,uRingN)/dn; if(tt>0.0){ float rr=length(vW+uSun*tt-uRingC); float inR=smoothstep(uRingR.x,uRingR.x+0.05,rr)*(1.0-smoothstep(uRingR.y-0.08,uRingR.y,rr)); float gap=1.0-0.75*exp(-pow((rr-mix(uRingR.x,uRingR.y,0.62))*30.0,2.0)); c*=1.0-0.55*inR*gap*term; } } }   // the rings' shadow
    float haze=pow(1.0-ndv,2.2)*uAtmK;
    c=mix(c,uAtm*(0.02+0.85*smoothstep(-0.12,0.6,ndl0)),clamp(haze*0.75,0.0,0.85));
    c+=vec3(1.0,0.46,0.2)*exp(-pow(ndl0*7.0,2.0))*(0.08+haze*0.6)*uAtmK;   // sunset along the terminator
    c+=uA*uFocus*0.05;
    gl_FragColor=vec4(c,1.0);
    #include <colorspace_fragment>
  }`;
  const CLOUD_F = `uniform sampler2D uMap; uniform vec3 uSun; varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ float a=texture2D(uMap,vUv).a; vec3 n=normalize(vN); float ndl=dot(n,uSun); float l=smoothstep(-0.12,0.45,ndl); vec3 V=normalize(cameraPosition-vW);
    vec3 col=mix(vec3(1.0,0.62,0.4),vec3(1.0),smoothstep(-0.05,0.35,ndl))*(0.03+1.05*l); float edge=1.0-pow(1.0-max(dot(n,V),0.0),3.0); gl_FragColor=vec4(col,a*(0.4+0.6*edge)); }`;
  // how strongly each surface type takes relief and how much air it has
  const SURF_K = { 0: [0, 0.9], 1: [3.2, 1.0], 2: [2.4, 0.45], 3: [5.5, 0.55], 4: [0, 0.8], 5: [4.0, 0.7], 6: [3.5, 0.9], 7: [6.5, 0.15], 9: [4.2, 0.35], 10: [0, 0.95], 11: [4.6, 0.5], 12: [3.0, 1.0], 14: [2.2, 0.4], 15: [1.6, 0.7], 16: [5.5, 0.5], 17: [4.0, 0.7], 18: [3.2, 0.9], 19: [3.4, 0.6] };
  // the colour of a world's own light (night side) and how much of it shows by day: [colour, day fraction]
  const GLOW = { 1: [0xffb35c, 0], 6: [0xffb35c, 0], 9: [0xbcd0ff, 0.5], 12: [0x6fffd6, 0.15], 14: [0xa898ff, 0.6], 18: [0xffc27a, 0.1], 19: [0xffe39a, 0.3] };

  function surface(THREE, q, r, mode, cols, seed, seg, atmCol) {
    const s0 = seg || [32, 64, 96][q];
    if (SUN.renderer) { const w = r > 5 ? [1024, 2048, 2048][q] : [1024, 2048, 2048][q]; const K = SURF_K[mode] || [3, 0.6]; const rt = bake(THREE, mode, cols, seed, w), ht = K[0] > 0 ? bake(THREE, mode, cols, seed, w / 2, true) : null; /* relief at half resolution is plenty */
      const u = { uMap: { value: rt.texture }, uH: { value: ht ? ht.texture : rt.texture }, uTx: { value: new THREE.Vector2(2 / w, 4 / w) }, uBump: { value: K[0] * (w / 2048) }, uSun: { value: SUN.v }, uA: { value: new THREE.Color(cols[0]) }, uAtm: { value: new THREE.Color(atmCol || cols[0]) }, uAtmK: { value: K[1] }, uFocus: { value: 0 }, uT: { value: 0 }, uGlow: { value: new THREE.Color(GLOW[mode] ? GLOW[mode][0] : 0xffb35c) }, uGlowDay: { value: GLOW[mode] ? GLOW[mode][1] : 0 }, uRingC: { value: new THREE.Vector3() }, uRingN: { value: new THREE.Vector3(0, 1, 0) }, uRingR: { value: new THREE.Vector2(0, 0) } };
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, s0, Math.round(s0 * 0.75)), new THREE.ShaderMaterial({ uniforms: u, vertexShader: LIT_V, fragmentShader: LIT_F })); mesh.userData.rt = rt; mesh.userData.mode = mode; if (ht) mesh.userData.rt2 = ht; return mesh; }
    const u = { uSun: { value: SUN.v }, uA: { value: new THREE.Color(cols[0]) }, uB: { value: new THREE.Color(cols[1]) }, uC: { value: new THREE.Color(cols[2]) }, uT: { value: 0 }, uMode: { value: mode }, uSeed: { value: seed }, uFocus: { value: 0 } };
    const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: SURF_V, fragmentShader: SURF_F(q >= 2 ? 5 : q === 1 ? 4 : 3) });
    const s = seg || [24, 48, 64][q]; return new THREE.Mesh(new THREE.SphereGeometry(r, s, Math.round(s * 0.75)), m);
  }
  function atmosphere(THREE, r, col, k) {
    const u = { uSun: { value: SUN.v }, uCol: { value: new THREE.Color(col) }, uK: { value: k == null ? 1 : k }, uFocus: { value: 0 } };
    return new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), new THREE.ShaderMaterial({ uniforms: u, vertexShader: ATM_V, fragmentShader: ATM_F, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.BackSide }));
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
    /* v39: a real body — a crystalline ice world with fractured plates and frost, lit like a planet — the mathematics
       lives in its orbit (coordinate rings, the Platonic solids, a saddle surface) */
    const core = surface(THREE, q, r, 9, ['#9fb4ff', '#eef2ff', '#2c3a86'], 1.9, [40, 72, 96][q], '#a9c0ff'); G.add(core, atmosphere(THREE, r * 1.06, '#a9c0ff', 0.8));
    const rings = new THREE.Group(); [[0, 0], [Math.PI / 2, 0], [Math.PI / 2, Math.PI / 2]].forEach(([a, b], i) => { const L = ringLine(THREE, r * (1.55 + i * 0.12), 0xc8d4ff, 0.42); L.rotation.set(a, b, 0); rings.add(L);
      for (let k = 0; k < 24; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, k % 6 ? 0.05 : 0.11), new THREE.MeshBasicMaterial({ color: 0xc8d4ff })); const ang = k / 24 * Math.PI * 2, R = r * (1.55 + i * 0.12); t.position.set(Math.cos(ang) * R, 0, Math.sin(ang) * R); t.lookAt(0, 0, 0); const h = new THREE.Group(); h.add(t); h.rotation.set(a, b, 0); rings.add(h); } });
    G.add(rings);
    const solids = [new THREE.TetrahedronGeometry(0.2), new THREE.BoxGeometry(0.26, 0.26, 0.26), new THREE.OctahedronGeometry(0.21), new THREE.DodecahedronGeometry(0.2), new THREE.IcosahedronGeometry(0.21), new THREE.TorusKnotGeometry(0.13, 0.035, 64, 8)];
    const S = solids.map((g, i) => { const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe8edff : 0x9fb4ff, roughness: 0.3, metalness: 0.4, flatShading: true })); const w = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); m.add(w); G.add(m); return m; });
    const N = 22, sg = new THREE.PlaneGeometry(1.5, 1.5, N, N); const sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i); sp.setZ(i, (x * x - y * y) * 0.5); }
    const saddle = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xbfd0ff, wireframe: true, transparent: true, opacity: 0.28 })); saddle.rotation.x = -Math.PI / 2.4; saddle.position.set(0, r * 1.9, 0); G.add(saddle);
    return { core, r, update(t, dt, rv, fc) { core.rotation.y += dt * 0.05; rings.rotation.y = t * 0.04; rings.scale.setScalar(0.6 + 0.4 * smooth(rv)); rings.children.forEach(c => { if (c.material) c.material.opacity = 0.42 * rv; });
      S.forEach((m, i) => { const a = t * (0.16 + i * 0.015) + i * Math.PI / 3, R = r * (1.05 + 1.05 * smooth(rv)) + 0.08 * Math.sin(t + i); m.position.set(Math.cos(a) * R, Math.sin(a * 1.3 + i) * 0.45 * rv, Math.sin(a) * R); m.rotation.set(t * 0.4 + i, t * 0.3, 0); m.scale.setScalar(0.4 + 0.6 * smooth(rv) + fc * 0.15); });
      saddle.material.opacity = 0.28 * rv; saddle.rotation.z = t * 0.1; saddle.scale.setScalar(0.5 + 0.5 * smooth(rv)); } };
  };

  /* Physics (v44): a ringed gas giant — zonal bands and jets, three storm systems, darker poles, and a ring system with
     density bands, a Cassini-like division and a wide gap; the planet shadows the rings and the rings shadow the planet. */
  B.physics = (THREE, q, G) => {
    const r = 1.35, tilt = new THREE.Group(); tilt.rotation.set(0.42, 0, 0.18); G.add(tilt);
    const core = surface(THREE, q, r, 10, ['#e8b27c', '#fbe6c8', '#8d4f2c'], 5.1, [48, 80, 112][q], '#ffcf9e'); tilt.add(core); G.add(atmosphere(THREE, r * 1.04, '#ffd2a8', 0.9));
    const R0 = r * 1.42, R1 = r * 2.45, rg = new THREE.RingGeometry(R0, R1, [128, 192, 256][q], 3);
    const ru = { uSun: { value: SUN.v }, uC: { value: new THREE.Vector3() }, uN: { value: new THREE.Vector3(0, 1, 0) }, uR: { value: r }, uIn: { value: R0 }, uOut: { value: R1 }, uO: { value: 1 } };
    const ring = new THREE.Mesh(rg, new THREE.ShaderMaterial({ uniforms: ru, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec3 vW; varying vec3 vL; void main(){ vL=position; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform vec3 uSun; uniform vec3 uC; uniform vec3 uN; uniform float uR; uniform float uIn; uniform float uOut; uniform float uO; varying vec3 vW; varying vec3 vL;
        float h1(float x){ return fract(sin(x*127.1)*43758.5453); } float n1(float x){ float i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f); return mix(h1(i),h1(i+1.0),f); }
        void main(){ float rr=length(vL.xy); float x=(rr-uIn)/(uOut-uIn); if(x<0.0||x>1.0) discard;
          float d=0.5*n1(x*38.0)+0.3*n1(x*121.0)+0.2*n1(x*390.0); d=0.3+0.7*d;
          d*=smoothstep(0.0,0.05,x)*(1.0-smoothstep(0.88,1.0,x)); d*=1.0-0.93*exp(-pow((x-0.62)*30.0,2.0)); d*=1.0-0.55*exp(-pow((x-0.22)*22.0,2.0));
          vec3 col=mix(vec3(0.78,0.68,0.55),vec3(0.96,0.91,0.83),n1(x*24.0)); col=mix(col,vec3(0.56,0.46,0.38),smoothstep(0.7,1.0,x)*0.5);
          vec3 oc=vW-uC; float b=dot(oc,uSun); float c=dot(oc,oc)-uR*uR; float sh=(b<0.0 && b*b-c>0.0)?0.1:1.0;   // inside the planet's shadow
          float lit=0.3+0.7*abs(dot(uN,uSun));
          gl_FragColor=vec4(col*lit*sh, d*0.88*uO);
          #include <colorspace_fragment>
        }` }));
    ring.rotation.x = -Math.PI / 2; tilt.add(ring);
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3(), up = new THREE.Vector3();
    return { core, r, body: [tilt], update(t, dt, rv, fc) { core.rotation.y += dt * 0.09;
      tilt.updateMatrixWorld(); tilt.matrixWorld.decompose(wp, wq, ws); up.set(0, 1, 0).applyQuaternion(wq).normalize(); const k = ws.x;
      ru.uC.value.copy(wp); ru.uN.value.copy(up); ru.uR.value = r * k; ru.uIn.value = R0; ru.uOut.value = R1; ru.uO.value = 0.75 + 0.25 * smooth(rv) + fc * 0.05;
      const cu = core.material.uniforms; if (cu.uRingR) { cu.uRingC.value.copy(wp); cu.uRingN.value.copy(up); cu.uRingR.value.set(R0 * k, R1 * k); } } };
  };

  B.chemistry = (THREE, q, G) => { // crystalline cell surface, ball-and-stick molecules in orbit, electron shells
    const r = 1.2, M = META.chemistry; const core = surface(THREE, q, r, 11, ['#43c9b8', '#c9fff6', '#0e4f4d'], 2.7, [40, 72, 96][q], '#5fe6d4'); G.add(core); G.add(atmosphere(THREE, r * 1.08, '#5fe6d4', 1));
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

  B.biology = (THREE, q, G) => { // v39: a living ocean world — reefs, rainforest, weather — wrapped in the double helix of life
    const r = 1.3, M = META.biology;
    const core = surface(THREE, q, r, 12, ['#1a8f8a', '#9ff2da', '#2f7a33'], 3.4, [40, 72, 96][q], '#8af0c4'); G.add(core);
    let clouds = null; const crt = SUN.renderer ? bake(THREE, 8, ['#ffffff', '#ffffff', '#ffffff'], 7.3, [512, 1024, 1024][q]) : null;
    if (crt) { clouds = new THREE.Mesh(new THREE.SphereGeometry(r * 1.018, [24, 48, 64][q], [18, 36, 48][q]), new THREE.ShaderMaterial({ uniforms: { uMap: { value: crt.texture }, uSun: { value: SUN.v } }, transparent: true, depthWrite: false, vertexShader: LIT_V, fragmentShader: CLOUD_F })); clouds.userData.rt = crt; G.add(clouds); }
    G.add(atmosphere(THREE, r * 1.09, '#8af0c4', 1.25));
    // DNA: two helical strands with base-pair rungs (instanced)
    const dna = new THREE.Group(); const n = [60, 90, 120][q], curve = i => { const u = i / n, ang = u * Math.PI * 1.25 - 0.6; return new THREE.Vector3(Math.cos(ang) * r * 2.0, (u - 0.5) * 1.4, Math.sin(ang) * r * 2.0); };
    const s1 = [], s2 = []; const rung = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshStandardMaterial({ color: 0xe4ffd9 }), n); const tmp = new THREE.Object3D();
    for (let i = 0; i <= n; i++) { const c = curve(i), tan = curve(Math.min(n, i + 1)).sub(curve(Math.max(0, i - 1))).normalize(), side = new THREE.Vector3(0, 1, 0).cross(tan).normalize(), up = tan.clone().cross(side), th = i * 0.45;
      const off = side.clone().multiplyScalar(Math.cos(th) * 0.16).addScaledVector(up, Math.sin(th) * 0.16); const a1 = c.clone().add(off), a2 = c.clone().sub(off); s1.push(a1); s2.push(a2);
      if (i < n) { tmp.position.copy(c); tmp.scale.set(1, off.length() * 2, 1); tmp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), off.clone().normalize()); tmp.updateMatrix(); rung.setMatrixAt(i, tmp.matrix); rung.setColorAt(i, new THREE.Color(['#7bd88f', '#ffd36b', '#ff8fa3', '#8fc7ff'][i % 4])); } }
    const strand = pts => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.028, 6, false), new THREE.MeshStandardMaterial({ color: 0xbff5c8, roughness: 0.4, emissive: 0x0d2a14 }));
    dna.add(strand(s1), strand(s2), rung); G.add(dna);
    return { core, r, body: clouds ? [clouds] : [], update(t, dt, rv, fc) { core.rotation.y += dt * 0.04; if (clouds) clouds.rotation.y += dt * 0.052;
      dna.rotation.y = t * 0.06; dna.scale.setScalar(0.55 + 0.45 * smooth(rv)); dna.visible = rv > 0.02; } };
  };

  B.geography = (THREE, q, G) => { // the living planet: oceans, continents, ice caps, clouds, atmosphere, city lights at night
    const r = 1.75, M = META.geography; const core = surface(THREE, q, r, 1, [M.c[0], M.c[1], M.c[2]], 0.4, [48, 80, 112][q], '#7cc4ff'); G.add(core);
    const cu = { uSun: { value: SUN.v }, uT: { value: 0 } };
    const crt = SUN.renderer ? bake(THREE, 8, ['#ffffff', '#ffffff', '#ffffff'], 2.0, [512, 1024, 1024][q]) : null;
    const clouds = crt ? new THREE.Mesh(new THREE.SphereGeometry(r * 1.015, [24, 48, 72][q], [18, 36, 54][q]), new THREE.ShaderMaterial({ uniforms: { uMap: { value: crt.texture }, uSun: { value: SUN.v } }, transparent: true, depthWrite: false, vertexShader: LIT_V, fragmentShader: CLOUD_F })) : new THREE.Mesh(new THREE.SphereGeometry(r * 1.015, [24, 48, 72][q], [18, 36, 54][q]), new THREE.ShaderMaterial({ uniforms: cu, transparent: true, depthWrite: false,
      vertexShader: SURF_V, fragmentShader: `#define OCT ${q >= 2 ? 5 : 4}\n uniform vec3 uSun; uniform float uT; varying vec3 vP; varying vec3 vN; varying vec3 vW; ${NOISE} void main(){ vec3 p=normalize(vP); float c=fbm(p*3.0+vec3(uT*0.006,0.0,0.0)); c=smoothstep(0.05,0.5,c); float l=smoothstep(-0.15,0.5,dot(normalize(vN),uSun)); gl_FragColor=vec4(vec3(1.0)*(0.05+0.95*l),c*0.85); }` }));
    if (crt) clouds.userData.rt = crt; G.add(clouds, atmosphere(THREE, r * 1.1, '#7cc4ff', 1.35));
    return { core, r, body: [clouds], update(t, dt, rv, fc) { core.rotation.y += dt * 0.035; clouds.rotation.y += dt * 0.045; cu.uT.value = t; } };
  };

  B.cs = (THREE, q, G) => { // a matte world wrapped in a geodesic network; packets of data travel along its edges; a ring of bits
    const r = 1.2, M = META.cs; const core = surface(THREE, q, r, 14, ['#7d6ce0', '#e5dcff', '#17122e'], 6.1, [40, 72, 96][q], '#b9a5ff'); G.add(core); G.add(atmosphere(THREE, r * 1.06, '#b9a5ff', 0.7));
    const ico = new THREE.IcosahedronGeometry(r * 1.55, 1), P = ico.attributes.position, key = v => v.toArray().map(x => x.toFixed(3)).join(','); const verts = [], idx = new Map();
    for (let i = 0; i < P.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(P, i), k = key(v); if (!idx.has(k)) { idx.set(k, verts.length); verts.push(v); } }
    const E = new Set(); for (let i = 0; i < P.count; i += 3) { const ids = [0, 1, 2].map(j => idx.get(key(new THREE.Vector3().fromBufferAttribute(P, i + j)))); [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => { const x = Math.min(ids[a], ids[b]), y = Math.max(ids[a], ids[b]); E.add(x + '_' + y); }); }
    const edges = [...E].map(s => s.split('_').map(Number)); const lp = []; edges.forEach(([a, b]) => lp.push(verts[a], verts[b]));
    const net = new THREE.Group(); const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: 0xcdbfff, transparent: true, opacity: 0.18, depthWrite: false }));
    const nodes = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.045), new THREE.MeshStandardMaterial({ color: 0xe5dcff, emissive: 0x3a2a80, roughness: 0.3 }), verts.length); const tmp = new THREE.Object3D();
    verts.forEach((v, i) => { tmp.position.copy(v); tmp.updateMatrix(); nodes.setMatrixAt(i, tmp.matrix); }); net.add(lines, nodes); G.add(net);
    const NP = [14, 26, 40][q], pk = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP); const packets = Array.from({ length: NP }, (_, i) => ({ e: (i * 7) % edges.length, u: (i * 0.37) % 1, s: 0.35 + (i % 5) * 0.08 })); G.add(pk);
    const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0xa68cff, emissive: 0x241552 }), 64); G.add(bits);
    return { core, r, update(t, dt, rv, fc) { core.rotation.y += dt * 0.05; core.material.uniforms.uT.value = t; net.rotation.y = t * 0.03; net.scale.setScalar(0.75 + 0.25 * smooth(rv)); lines.material.opacity = 0.05 + 0.13 * rv + fc * 0.08;
      packets.forEach((p, i) => { p.u += dt * p.s; if (p.u > 1) { p.u = 0; const [a, b] = edges[p.e]; const nx = edges.findIndex((e, j) => j !== p.e && (e[0] === b || e[1] === b) && ((j + i) % 3 === 0)); p.e = nx >= 0 ? nx : (p.e + 5) % edges.length; } const [a, b] = edges[p.e]; tmp.position.lerpVectors(verts[a], verts[b], p.u).applyEuler(net.rotation).multiplyScalar(net.scale.x); tmp.scale.setScalar(rv); tmp.updateMatrix(); pk.setMatrixAt(i, tmp.matrix); });
      pk.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2 + t * 0.1, on = ((i * 2654435761 + Math.floor(t * 2)) >>> 0) % 3 === 0; tmp.position.set(Math.cos(a) * r * 2.3, Math.sin(a * 3) * 0.04, Math.sin(a) * r * 2.3); tmp.rotation.set(0, -a, 0); tmp.scale.setScalar((on ? 1.25 : 0.7) * smooth(rv)); tmp.updateMatrix(); bits.setMatrixAt(i, tmp.matrix); }
      bits.instanceMatrix.needsUpdate = true; } };
  };

  B.english = (THREE, q, G) => { // ink-marbled world; a ring of turning pages; letterforms drifting in orbit
    const r = 1.2, M = META.english; const core = surface(THREE, q, r, 15, ['#c8708e', '#f6e9d8', '#4a2232'], 3.3, [40, 72, 96][q], '#ffc2d4'); G.add(core); G.add(atmosphere(THREE, r * 1.07, '#ffc2d4', 0.8));
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
    const r = 1.3, M = META.history; const core = surface(THREE, q, r, 16, ['#c4925a', '#ecd4ac', '#5e3b1c'], 4.4, [40, 72, 96][q], '#ffd29a'); G.add(core); G.add(atmosphere(THREE, r * 1.06, '#ffd29a', 0.6));
    const NC = 14, col = new THREE.CylinderGeometry(0.045, 0.05, 1, 12); col.translate(0, 0.5, 0); const cap = new THREE.BoxGeometry(0.14, 0.035, 0.14);
    const stone = new THREE.MeshStandardMaterial({ color: 0xe9dcc3, roughness: 0.85 }); const cols = new THREE.InstancedMesh(col, stone, NC), caps = new THREE.InstancedMesh(cap, stone, NC); const tmp = new THREE.Object3D();
    const H = Array.from({ length: NC }, (_, i) => [0.5, 0.5, 0.32, 0.5, 0.18, 0.5, 0.5, 0.41, 0.5, 0.27, 0.5, 0.5, 0.36, 0.5][i]);
    const colon = new THREE.Group(); colon.add(cols, caps); colon.visible = false; /* v44: ruins are part of the surface itself, not orbiting props */
    const dial = ringLine(THREE, r * 1.9, 0xf5e2c0, 0.45); G.add(dial); const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.015, 0.015, 0.12), new THREE.MeshBasicMaterial({ color: 0xf5e2c0 }), 12); G.add(ticks);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; tmp.position.set(Math.cos(a) * r * 1.9, 0, Math.sin(a) * r * 1.9); tmp.lookAt(0, 0, 0); tmp.scale.set(1, 1, i % 3 ? 1 : 2); tmp.updateMatrix(); ticks.setMatrixAt(i, tmp.matrix); }
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, r * 1.75), new THREE.MeshBasicMaterial({ color: 0xffd29a })); hand.geometry.translate(0, 0, r * 0.875); G.add(hand);
    return { core, r, update(t, dt, rv, fc) { core.rotation.y += dt * 0.04; core.material.uniforms.uT.value = t;
      for (let i = 0; i < NC; i++) { const a = i / NC * Math.PI * 2 + t * 0.03, R = r * (1.35 + 0.15 * smooth(rv)), h = H[i] * (0.15 + 0.85 * smooth(rv)) * 1.1; tmp.position.set(Math.cos(a) * R, -0.05, Math.sin(a) * R); tmp.rotation.set(0, -a, H[i] < 0.3 ? 0.25 : 0); tmp.scale.set(1, h, 1); tmp.updateMatrix(); cols.setMatrixAt(i, tmp.matrix);
        tmp.position.y = -0.05 + h; tmp.scale.set(1, 1, 1); tmp.visible = H[i] === 0.5; tmp.updateMatrix(); caps.setMatrixAt(i, H[i] === 0.5 ? tmp.matrix : new THREE.Matrix4().makeScale(0, 0, 0)); }
      cols.instanceMatrix.needsUpdate = true; caps.instanceMatrix.needsUpdate = true; colon.rotation.z = 0.12; dial.material.opacity = 0.45 * rv; hand.rotation.y = -t * 0.12; hand.scale.setScalar(rv); ticks.visible = rv > 0.05; } };
  };

  B.languages = (THREE, q, G) => { // a warm dune world; two orbits of greetings in many writing systems, passing like conversation
    const r = 1.2, M = META.languages; const core = surface(THREE, q, r, 17, ['#e0a648', '#fbe6b4', '#7a4a12'], 7.7, [40, 72, 96][q], '#ffd27a'); G.add(core); G.add(atmosphere(THREE, r * 1.07, '#ffd27a', 0.85));
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
    const r = 1.3, M = META.social; const core = surface(THREE, q, r, 18, [M.c[0], M.c[1], M.c[2]], 8.8, [40, 72, 96][q], '#a9c8ec'); G.add(core); G.add(atmosphere(THREE, r * 1.08, '#a9c8ec', 1));
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
    const r = 1.2, M = META.more; const core = surface(THREE, q, r, 19, ['#c8a65a', '#f1e4bf', '#6a4c1c'], 9.9, [40, 72, 96][q], '#f0dc8a'); G.add(core); G.add(atmosphere(THREE, r * 1.07, '#f0dc8a', 0.7));
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
      dispose() { G.traverse(o => { if (o.userData.rt) o.userData.rt.dispose(); if (o.userData.rt2) o.userData.rt2.dispose(); if (o.geometry) o.geometry.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(mm => { if (mm.map) mm.map.dispose(); mm.dispose(); }); }); } };
    return G;
  }
  LS.cosmosWorlds = { META, ORDER, build, SUN, NOISE, textSprite, surface, atmosphere };
})();
