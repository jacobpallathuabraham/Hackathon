/* ERLY Learning Studio — the sky of the universe (v39, used by ls-cosmos.js).

   What a long-exposure photograph of the night sky actually shows, rebuilt in three layers:
   1. Milky Way (baked once into a half-float panorama): a thin luminous disk with a warm bulge toward the galactic centre,
      mottled star clouds, dark dust rifts that cut through the brightest parts, a few faint emission nebulae (hydrogen-red
      and oxygen-teal) along the plane, and an almost-black background. Low-frequency light only, so magnification by a
      narrow lens never shows pixels.
   2. Stars: real points, so they stay pin-sharp at any resolution. A power-law brightness distribution (thousands of faint
      stars, a handful of bright ones), colour by temperature (blue-white … red), concentrated toward the galactic plane,
      a soft gaussian core, and the brightest few get a gentle halo and four diffraction spikes. They scintillate very
      slightly. The dome follows the camera, so stars are at infinity (no parallax), as they should be.
   3. Two distant galaxies drawn by a shader (logarithmic spiral arms, bulge, dust lanes, inclined disks).
   Plus an environment map (sky + sun) for reflective materials such as the astronaut's visor.
   Cost per frame: one textured sphere, one point draw, two small quads. */
(function () {
  'use strict';
  const LS = window.LS;

  LS.cosmosSky = function (THREE, renderer, scene, q, NOISE, sunDir) {
    const out = { group: new THREE.Group(), disposables: [] }; scene.add(out.group);
    const AXIS = new THREE.Vector3(0.55, 0.82, 0.14).normalize();        // galactic pole: the band crosses the view diagonally
    const CORE = new THREE.Vector3(-0.62, 0.12, -0.78).normalize();      // galactic centre (the warm bulge), off to one side
    CORE.addScaledVector(AXIS, -CORE.dot(AXIS)).normalize();

    /* ---------- 1 · the Milky Way panorama ---------- */
    const W = [1024, 2048, 3072][q];
    const rt = new THREE.WebGLRenderTarget(W, W / 2, { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping });
    const bakeMat = new THREE.ShaderMaterial({ depthTest: false, uniforms: { uAxis: { value: AXIS }, uCore: { value: CORE } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      fragmentShader: `#define OCT ${q ? 6 : 5}
      uniform vec3 uAxis; uniform vec3 uCore; varying vec2 vUv; ${NOISE}
      float h3(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
      float ridge(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ float n=1.0-abs(snoise(p)); s+=a*n*n; p*=2.07; a*=0.5; } return s; }
      void main(){
        float lon=(vUv.x-0.5)*6.2831853, lat=(vUv.y-0.5)*3.14159265; vec3 d=vec3(cos(lat)*sin(lon),sin(lat),cos(lat)*cos(lon));
        float b=dot(d,uAxis);                                     // sine of the galactic latitude
        vec3 w=vec3(fbm(d*2.1+1.3),fbm(d*2.1+7.7),fbm(d*2.1+3.1)); // domain warp: nothing is a perfect band
        float bw=b+0.06*w.x;
        float disk=exp(-pow(bw/0.13,2.0)), thick=exp(-pow(bw/0.36,2.0));
        float bulge=pow(max(dot(d,uCore),0.0),5.0); bulge*=exp(-pow(bw/0.32,2.0));
        float n1=fbm(d*3.2+w*1.4), n2=fbm(d*7.5+w*2.0+5.0), n3=fbm(d*18.0+11.0);
        float clouds=smoothstep(-0.35,0.75,n1*0.65+n2*0.45);
        float glow=disk*(0.25+0.95*clouds)+thick*0.1+bulge*(0.9+0.9*disk);
        // the Great Rift: narrow dark lanes that wander along the plane, plus patchy dust everywhere in the disk
        float rift=smoothstep(0.42,0.9,ridge(d*3.4+w*1.8))*exp(-pow((bw+0.035*n2)/0.06,2.0));
        float dpatch=smoothstep(0.15,0.75,fbm(d*9.0-3.0+w))*disk;
        glow*=1.0-0.9*rift-0.45*dpatch;
        vec3 starlight=mix(vec3(0.58,0.66,0.86),vec3(1.0,0.84,0.62),clamp(bulge*1.6+disk*0.2,0.0,1.0));
        vec3 col=starlight*glow*(0.62+0.5*n3)*0.055;
        // unresolved stars: a fine grain that makes the band look made of stars, not fog
        vec3 g=floor(d*900.0); float grain=step(0.82,h3(g))*h3(g+3.1);
        col+=starlight*grain*disk*(1.0-0.8*rift)*0.035;
        // emission nebulae on the plane: hydrogen-alpha red, oxygen teal, filamentary
        vec3 N1=normalize(uCore+vec3(0.25,0.05,0.5)), N2=normalize(cross(uAxis,uCore)*0.9+uCore*0.3), N3=normalize(-uCore+cross(uAxis,uCore)*0.6);
        float f1=fbm(d*11.0+w*3.0), f2=fbm(d*14.0-w*2.0+9.0);
        float k1=pow(max(dot(d,N1),0.0),180.0), k2=pow(max(dot(d,N2),0.0),260.0), k3=pow(max(dot(d,N3),0.0),140.0);
        vec3 neb=vec3(0.95,0.22,0.32)*k1*smoothstep(-0.1,0.7,f1)+vec3(0.18,0.65,0.7)*k2*smoothstep(-0.05,0.75,f2)+mix(vec3(0.9,0.25,0.35),vec3(0.35,0.5,0.95),0.5+0.5*f2)*k3*smoothstep(0.0,0.8,f1);
        col+=neb*0.09*(1.0-0.7*rift);
        // a deep, very slightly blue background (never pure black, never grey)
        col+=vec3(0.00045,0.0006,0.0011)*(0.8+0.4*n1);
        gl_FragColor=vec4(col,1.0); }` });
    { const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bakeMat), sc = new THREE.Scene(); sc.add(quad); const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(sc, new THREE.Camera()); renderer.setRenderTarget(prev); quad.geometry.dispose(); bakeMat.dispose(); }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2600, 64, 32), new THREE.MeshBasicMaterial({ map: rt.texture, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }));
    dome.renderOrder = -10; out.group.add(dome); out.disposables.push(rt, dome.geometry, dome.material);

    /* ---------- 2 · stars ---------- */
    let s = 917; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const gauss = () => { let u = 0, v = 0; while (u === 0) u = R(); while (v === 0) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const n = [4200, 9000, 15000][q], P = new Float32Array(n * 3), M = new Float32Array(n), C = new Float32Array(n * 3);
    const e1 = new THREE.Vector3().crossVectors(AXIS, new THREE.Vector3(0, 0, 1)).normalize(), e2 = new THREE.Vector3().crossVectors(AXIS, e1), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      if (R() < 0.58) { const ang = R() * Math.PI * 2, sl = THREE.MathUtils.clamp(gauss() * 0.13, -0.95, 0.95), cl = Math.sqrt(1 - sl * sl); v.copy(e1).multiplyScalar(Math.cos(ang) * cl).addScaledVector(e2, Math.sin(ang) * cl).addScaledVector(AXIS, sl);
        if (R() < 0.25) v.lerp(CORE, 0.25 * R()).normalize(); }
      else { const z = R() * 2 - 1, a = R() * Math.PI * 2, r = Math.sqrt(1 - z * z); v.set(r * Math.cos(a), z, r * Math.sin(a)); }
      v.multiplyScalar(1800); P.set([v.x, v.y, v.z], i * 3);
      M[i] = Math.pow(R(), 5.2); if (R() < 0.006) M[i] = 0.9 + R() * 0.1;   // a power law, plus a few genuinely bright stars
      const t = R(), c = t < 0.1 ? [0.62, 0.74, 1.0] : t < 0.5 ? [0.92, 0.95, 1.0] : t < 0.78 ? [1.0, 0.95, 0.86] : t < 0.94 ? [1.0, 0.82, 0.6] : [1.0, 0.64, 0.46];
      C.set(c, i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(P, 3)); sg.setAttribute('aMag', new THREE.BufferAttribute(M, 1)); sg.setAttribute('color', new THREE.BufferAttribute(C, 3));
    const starMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPx: { value: 1 }, uT: { value: 0 }, uFov: { value: 1 } },
      vertexShader: `attribute float aMag; attribute vec3 color; uniform float uPx; uniform float uT; uniform float uFov; varying vec3 vC; varying float vB; varying float vS;
        void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv;
          float b=aMag; /* v46: scintillation — each star breathes in brightness and size on its own two rhythms */
          float ph=fract(sin(dot(position.xz,vec2(12.9898,78.233)))*43758.5453)*6.2831, f1=0.9+fract(position.y*0.0137)*2.6;
          float tw=0.7+0.22*sin(uT*f1+ph)+0.12*sin(uT*f1*2.37+ph*1.7)+0.06*sin(uT*f1*5.1+ph*2.3);
          vS=step(0.9,b); vB=max(b,0.02)*tw*1.12; vC=mix(color,vec3(1.0),0.15*(tw-0.7));
          gl_PointSize=(1.6+3.4*b*b+vS*14.0)*(0.86+0.2*tw)*uPx*uFov; }`,
      fragmentShader: `varying vec3 vC; varying float vB; varying float vS;
        void main(){ vec2 c=(gl_PointCoord-0.5)*2.0; float r2=dot(c,c); if(r2>1.0) discard;
          float core=exp(-r2*(vS>0.5?38.0:7.0));
          float halo=vS*exp(-r2*5.0)*0.18;
          float spk=vS*(exp(-abs(c.x)*55.0)*exp(-abs(c.y)*3.2)+exp(-abs(c.y)*55.0)*exp(-abs(c.x)*3.2))*0.55;
          float a=(core+halo+spk)*(0.16+1.25*vB);
          gl_FragColor=vec4(vC*a,1.0); }` });
    const stars = new THREE.Points(sg, starMat); stars.frustumCulled = false; stars.renderOrder = -9; out.group.add(stars); out.disposables.push(sg, starMat);

    /* ---------- 3 · distant galaxies ---------- */
    const galMat = (tilt, hue) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uHue: { value: hue } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float uHue; varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
        void main(){ vec2 c=vUv; float r=length(c); if(r>1.0) discard; float a=atan(c.y,c.x);
          float sp=a-log(r+0.02)*2.4; float arm=pow(0.5+0.5*cos(2.0*sp),2.5); float lane=pow(0.5+0.5*cos(2.0*sp+0.9),8.0);
          float n=vn(c*9.0+3.0)*0.6+vn(c*23.0)*0.4;
          float disk=exp(-r*4.2), bulge=exp(-r*r*55.0);
          vec3 young=mix(vec3(0.55,0.66,1.0),vec3(0.85,0.6,1.0),uHue), old=vec3(1.0,0.86,0.68);
          vec3 col=old*bulge*1.5+mix(young,old,exp(-r*5.0))*disk*(0.22+0.9*arm*(0.55+0.45*n));
          col*=1.0-0.55*lane*smoothstep(0.08,0.3,r);
          col+=young*step(0.985,vn(c*60.0))*arm*disk*0.8;             // star-forming knots
          col*=smoothstep(1.0,0.75,r);
          gl_FragColor=vec4(col*0.55,1.0); }` });
    const galaxies = [[new THREE.Vector3(-0.7, 0.42, -0.58), 120, 1.15, 0.2], [new THREE.Vector3(0.82, -0.2, -0.53), 70, 0.5, 0.8]].map(([dir, size, tilt, hue]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), galMat(tilt, hue)); dir.normalize(); m.position.copy(dir).multiplyScalar(1700); m.lookAt(0, 0, 0); m.rotateX(tilt); m.rotateZ(hue * 4.0); m.renderOrder = -8;
      out.group.add(m); out.disposables.push(m.geometry, m.material); return m; });

    /* ---------- environment map (for reflections: visor, metal) ---------- */
    try {
      const env = new THREE.Scene(); const em = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), new THREE.MeshBasicMaterial({ map: rt.texture, side: THREE.BackSide, toneMapped: false })); env.add(em);
      // the sun as an HDR disc, a warm bounce from the nearest planet below, and a soft blue fill opposite the sun
      const sunM = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(60, 54, 46), toneMapped: false })); sunM.position.copy(sunDir).normalize().multiplyScalar(40); env.add(sunM);
      const bounce = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.08, 0.09, 0.18), toneMapped: false })); bounce.position.set(-14, -36, -10); env.add(bounce);
      const fill = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.32, 0.6), toneMapped: false })); fill.position.copy(sunDir).normalize().multiplyScalar(-40).add(new THREE.Vector3(0, 12, 0)); env.add(fill);
      const pm = new THREE.PMREMGenerator(renderer); const er = pm.fromScene(env, 0, 0.1, 200); out.env = er.texture; out.disposables.push(er); pm.dispose();
      env.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map !== rt.texture) o.material.dispose(); else if (o.material) o.material.dispose(); });
    } catch (e) { out.env = null; }

    out.update = (cam, t, dpr) => {
      out.group.position.copy(cam.position);
      starMat.uniforms.uT.value = t; starMat.uniforms.uPx.value = dpr;
      starMat.uniforms.uFov.value = THREE.MathUtils.clamp(46 / cam.fov, 0.75, 1.3); // a narrower lens shows stars a touch larger, as a telescope would
    };
    out.dispose = () => { scene.remove(out.group); out.disposables.forEach(d => d && d.dispose && d.dispose()); };
    return out;
  };
})();
