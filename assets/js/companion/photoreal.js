/* ERLY — photoreal companions: a talking head made from one portrait photo.

   The portrait is drawn in WebGL on a dense mesh. A vertex shader moves the
   mesh like facial muscles — jaw drop with a lens-shaped lip opening, lip
   width and rounding, smile and cheek lift, eyelids closing (the real upper
   lid skin slides down), small iris movements, brow raise/furrow, head tilt,
   nod and breathing. Mesh rows are snapped to the lip line so the lips part
   exactly there, and a second shader paints the inside of the mouth (shadow,
   teeth, tongue) in the opening. Everything is driven by the same rig as the
   illustrated avatars (mouth shapes from lipsync.js, blinks, gaze, emotion).

   No 3D download, one draw call, runs on ordinary laptops, iPads and phones.
   Returns null when WebGL isn't available (the caller falls back). */
(function () {
  'use strict';

  // landmarks in portrait units (the texture is 2× this size)
  const FACES = {
    yasmin: { src: 'assets/img/companions/yasmin.jpg', W: 330, H: 453, cam: [168, 222, 118],
      eyes: [[110, 164.4, 147, 167, 157.5, 174, 140], [186, 167, 220, 165, 157.5, 174, 140]], // outer/inner x,y … top y, bottom y, brow y
      brows: [[110, 140, 132, 137, 154, 143], [180, 143, 200, 137, 226, 142]],
      mouth: [133, 241.5, 166, 243, 198, 241.5, 232, 258], chin: 294, lip: '#9c4a4e' },
    karim: { src: 'assets/img/companions/karim.jpg', W: 330, H: 400, cam: [171, 228, 116],
      eyes: [[114, 167, 151, 170, 159.5, 175.5, 149], [191, 170, 230, 167, 159.5, 175.5, 149]],
      brows: [[100, 150, 128, 144, 158, 150], [186, 150, 216, 144, 240, 151]],
      mouth: [137, 249.5, 170, 251.5, 203, 250.5, 241, 265], chin: 312, lip: '#8a4646' }
  };

  const VS = `
precision highp float;
attribute vec2 a_p;
uniform vec2 u_size;
uniform vec3 u_cam;       // centre x, y, half width (portrait units)
uniform float u_aspect;   // canvas h / w
uniform vec4 u_head;      // rot (rad), tx, ty, scale
uniform vec2 u_pivot;
uniform vec4 u_m0;        // mouth L.x L.y C.y R.x
uniform vec4 u_m1;        // R.y upTop.y lowBot.y chin.y
uniform vec4 u_mouth;     // open, width(-1..1), round, smile
uniform vec4 u_face;      // blink, gazeX, gazeY, browRaise
uniform vec4 u_face2;     // innerBrow, furrow, cheek, jaw
uniform vec4 u_eL; uniform vec4 u_eR;    // outer.x outer.y inner.x inner.y
uniform vec3 u_eL2; uniform vec3 u_eR2;  // top.y bottom.y brow.y
uniform vec4 u_bL; uniform vec4 u_bR;    // brow peak.xy, inner.xy
varying vec2 v_uv;
@@COMMON@@
float eyeDy(vec2 p, vec4 e, vec3 e2, float blink, out float inside) {
  float xl = min(e.x, e.z), xr = max(e.x, e.z);
  float yl = e.x < e.z ? e.y : e.w, yr = e.x < e.z ? e.w : e.y;
  float s = (p.x - xl) / (xr - xl);
  inside = smoothstep(-0.1, 0.05, s) * smoothstep(1.1, 0.95, s);
  float sc = clamp(s, 0.0, 1.0);
  float corner = mix(yl, yr, sc);
  float bump = 4.0 * sc * (1.0 - sc);
  float U = mix(corner, e2.x, bump), L = mix(corner, e2.y, bump);
  float dy = 0.0;
  if (p.y < U) dy = blink * (L - U) * (1.0 - smoothstep(0.0, max(2.0, (U - e2.z) * 0.95), U - p.y));
  else if (p.y < L) dy = blink * (L - p.y);
  return dy * inside;
}
vec2 brow(vec2 p, vec4 b, float raise, float inner, float furrow, float side) {
  vec2 pk = b.xy, in_ = b.zw;
  vec2 d = vec2(0.0);
  float w = exp(-pow((p.x - pk.x) / 26.0, 2.0) - pow((p.y - pk.y) / 13.0, 2.0));
  d.y -= raise * 4.0 * w;
  float wi = exp(-pow((p.x - in_.x) / 11.0, 2.0) - pow((p.y - in_.y) / 9.0, 2.0));
  d.y -= inner * 3.0 * wi;
  d.y += furrow * 2.2 * wi;
  d.x += furrow * 1.6 * wi * side;
  return d;
}
void main() {
  vec2 p = a_p;
  vec2 d = mouthDisp(p);
  float inL, inR;
  float blink = u_face.x;
  d.y += eyeDy(p, u_eL, u_eL2, blink, inL) + eyeDy(p, u_eR, u_eR2, blink, inR);
  // gaze: shift the iris inside the opening, corners stay put
  float gl = gazeW(p, u_eL, u_eL2) + gazeW(p, u_eR, u_eR2);
  d += vec2(u_face.y, u_face.z) * gl * (1.0 - blink);
  d += brow(p, u_bL, u_face.w, u_face2.x, u_face2.y, 1.0) + brow(p, u_bR, u_face.w, u_face2.x, u_face2.y, -1.0);
  vec2 q = p + d;
  // head: rotate about the neck, move, breathe
  vec2 r = q - u_pivot;
  float c = cos(u_head.x), s = sin(u_head.x);
  q = u_pivot + vec2(c * r.x - s * r.y, s * r.x + c * r.y) * u_head.w + u_head.yz;
  vec2 clip = (q - u_cam.xy) / vec2(u_cam.z, u_cam.z * u_aspect);
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_uv = a_p / u_size;
}`;
  // shared by both shaders: the lip line and the mouth muscles
  const COMMON = `
float seamY(float x) {
  float halfW = (u_m0.w - u_m0.x) * 0.5, cx = (u_m0.w + u_m0.x) * 0.5;
  float u = (x - cx) / halfW;
  float a = (u_m0.y + u_m1.x) * 0.5 - u_m0.z, b = (u_m1.x - u_m0.y) * 0.5;
  return a * u * u + b * u + u_m0.z;
}
vec2 mouthDisp(vec2 p) {
  float halfW0 = (u_m0.w - u_m0.x) * 0.5, cx = (u_m0.w + u_m0.x) * 0.5;
  float open = u_mouth.x, wid = u_mouth.y, rnd = u_mouth.z, smile = u_mouth.w;
  float halfW = halfW0 * (1.0 + 0.12 * wid - 0.3 * rnd);
  float u = (p.x - cx) / halfW;
  float lens = pow(max(0.0, 1.0 - u * u), 0.75);
  float jawW = exp(-pow((p.x - cx) / (halfW0 * 2.1), 2.0));
  float sy = p.y - seamY(p.x);
  float upH = u_m0.z - u_m1.y, lowH = u_m1.z - u_m0.z;
  float O = open * (halfW0 * 0.46) * (1.0 - 0.25 * rnd) + u_face2.w;
  float fade = 1.0 - smoothstep(u_m1.w, u_m1.w + 30.0, p.y);
  float a = 1.0 - smoothstep(0.0, lowH * 1.7, sy);
  float low = O * mix(jawW * 0.78, lens, a) * fade;
  float up = -O * 0.2 * lens * (1.0 - smoothstep(0.0, upH * 1.9, -sy));
  float t = smoothstep(-0.7, 0.7, sy);
  vec2 d = vec2(0.0, mix(up, low, t));
  // width (E, I) and rounding (O, U): the corners move in or out
  float near = exp(-pow(sy / (lowH * 1.5), 2.0)) * exp(-pow(max(abs((p.x - cx) / halfW0) - 1.0, 0.0) * 2.2, 2.0));
  d.x += (wid * 3.2 - rnd * 5.5) * clamp((p.x - cx) / halfW0, -1.25, 1.25) * near;
  // smile: corners up and out, cheeks lift
  vec2 cl = vec2(u_m0.x, u_m0.y), cr = vec2(u_m0.w, u_m1.x);
  float wl = exp(-dot(p - cl, p - cl) / 110.0), wr = exp(-dot(p - cr, p - cr) / 110.0);
  d += smile * vec2(-2.0 * wl + 2.0 * wr, -3.4 * (wl + wr));
  vec2 kl = cl + vec2(-6.0, -24.0), kr = cr + vec2(6.0, -24.0);
  d.y -= (smile * 1.6 + u_face2.z) * (exp(-dot(p - kl, p - kl) / 260.0) + exp(-dot(p - kr, p - kr) / 260.0));
  return d;
}
float gazeW(vec2 p, vec4 e, vec3 e2) {
  float xl = min(e.x, e.z), xr = max(e.x, e.z);
  float s = (p.x - xl) / (xr - xl);
  float h = smoothstep(0.08, 0.32, s) * smoothstep(0.92, 0.68, s);
  float mid = (e2.x + e2.y) * 0.5, hh = (e2.y - e2.x) * 0.5;
  return h * (1.0 - smoothstep(hh * 0.6, hh * 1.25, abs(p.y - mid)));
}`;
  // inside of the mouth, drawn where the lips have parted
  const VS2 = `
precision highp float;
attribute vec2 a_p;
uniform vec3 u_cam; uniform float u_aspect; uniform vec4 u_head; uniform vec2 u_pivot;
varying vec2 v_q;
void main() {
  v_q = a_p;
  vec2 r = a_p - u_pivot; float c = cos(u_head.x), s = sin(u_head.x);
  vec2 q = u_pivot + vec2(c * r.x - s * r.y, s * r.x + c * r.y) * u_head.w + u_head.yz;
  vec2 clip = (q - u_cam.xy) / vec2(u_cam.z, u_cam.z * u_aspect);
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;
  const FS2 = `
precision highp float;
uniform vec4 u_m0; uniform vec4 u_m1; uniform vec4 u_mouth; uniform vec4 u_face2;
uniform vec4 u_teeth;   // upper teeth, lower teeth, tongue, px per unit
uniform vec3 u_lip;
varying vec2 v_q;
@@COMMON@@
void main() {
  float EPS = 0.7;
  // undo the sideways shift so the lip line is looked up at the right x
  float x = v_q.x;
  for (int k = 0; k < 2; k++) x = v_q.x - mouthDisp(vec2(x, seamY(x))).x;
  float s0 = seamY(x);
  float top = s0 - EPS + mouthDisp(vec2(x, s0 - EPS)).y;
  float bot = s0 + EPS + mouthDisp(vec2(x, s0 + EPS)).y;
  float gap = bot - top;
  float aa = 0.9 / u_teeth.w;
  float inside = smoothstep(top - aa, top + aa, v_q.y) * smoothstep(bot + aa, bot - aa, v_q.y);
  float hwE = (u_m0.w - u_m0.x) * 0.5 * (1.0 + 0.12 * u_mouth.y - 0.3 * u_mouth.z);
  float uu = abs(x - (u_m0.w + u_m0.x) * 0.5) / hwE;
  float alpha = inside * smoothstep(2.0 * EPS + 0.1, 2.0 * EPS + 1.0, gap) * smoothstep(1.0, 0.86, uu);
  if (alpha <= 0.001) discard;
  float f = clamp((v_q.y - top) / max(gap, 0.001), 0.0, 1.0);
  vec3 col = mix(vec3(0.08, 0.025, 0.03), vec3(0.2, 0.06, 0.065), smoothstep(0.1, 1.0, f));
  float cx = (u_m0.w + u_m0.x) * 0.5, hw = (u_m0.w - u_m0.x) * 0.5;
  float side = abs(x - cx) / hw;
  col *= 1.0 - 0.55 * smoothstep(0.35, 1.0, side);         // darker towards the corners
  // tongue
  float ty = bot - gap * 0.18;
  float tg = 1.0 - smoothstep(0.75, 1.0, length(vec2((x - cx) / (hw * 0.55), (v_q.y - ty) / max(gap * 0.42, 0.5))));
  col = mix(col, vec3(0.62, 0.26, 0.29) * (0.75 + 0.25 * f), tg * u_teeth.z * smoothstep(1.5, 4.0, gap));
  // upper teeth (they follow the lip line), lower teeth
  float uh = min(gap * 0.42, 4.8) * u_teeth.x;
  float tu = smoothstep(top + uh + aa, top + uh - aa, v_q.y) * (1.0 - smoothstep(0.55, 0.95, side));
  vec3 tc = vec3(0.93, 0.9, 0.86) * (0.82 + 0.18 * (1.0 - side)) * (0.88 + 0.12 * smoothstep(top, top + uh, v_q.y));
  float gapLines = 0.94 + 0.06 * cos((x - cx) * 1.15);
  col = mix(col, tc * gapLines, tu);
  float lh = min(gap * 0.26, 2.0) * u_teeth.y;
  float tl = smoothstep(bot - lh - aa, bot - lh + aa, v_q.y) * (1.0 - smoothstep(0.45, 0.85, side));
  col = mix(col, vec3(0.86, 0.83, 0.79) * 0.9, tl);
  // soft lip shadow at the edges
  float edge = min(v_q.y - top, bot - v_q.y);
  col = mix(u_lip * 0.55, col, smoothstep(0.0, 1.1, edge));
  gl_FragColor = vec4(col, alpha);
}`;
  const FS = `
precision highp float;
uniform sampler2D u_tex;
varying vec2 v_uv;
void main() { gl_FragColor = texture2D(u_tex, v_uv); }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  // a grid whose rows are snapped to the lip line, so the lips part exactly there
  function mesh(F) {
    const step = 2.5, cols = Math.ceil(F.W / step), rows = Math.ceil(F.H / step);
    const [lx, ly, cy, rx, ry] = [F.mouth[0], F.mouth[1], F.mouth[3], F.mouth[4], F.mouth[5]];
    const cx = (lx + rx) / 2, hw = (rx - lx) / 2;
    const seam = x => { const u = (x - cx) / hw; return ((ly + ry) / 2 - cy) * u * u + ((ry - ly) / 2) * u + cy; };
    const pts = new Float32Array((cols + 1) * (rows + 1) * 2);
    for (let i = 0; i <= cols; i++) {
      const x = Math.min(F.W, i * step);
      const ys = []; for (let j = 0; j <= rows; j++) ys.push(Math.min(F.H, j * step));
      if (x > lx - 14 && x < rx + 14) {
        const s = seam(Math.max(lx - 2, Math.min(rx + 2, x)));
        let j = Math.round((s - 0.7) / step);
        ys[j] = s - 0.7; ys[j + 1] = s + 0.7;
        if (ys[j - 1] >= ys[j] - 0.4) ys[j - 1] = ys[j] - 0.9;
        if (ys[j + 2] <= ys[j + 1] + 0.4) ys[j + 2] = ys[j + 1] + 0.9;
      }
      ys.forEach((y, j) => { const k = (i * (rows + 1) + j) * 2; pts[k] = x; pts[k + 1] = y; });
    }
    const idx = new Uint16Array(cols * rows * 6); let n = 0;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j, b = a + rows + 1;
      idx[n++] = a; idx[n++] = b; idx[n++] = a + 1; idx[n++] = a + 1; idx[n++] = b; idx[n++] = b + 1;
    }
    return { pts, idx };
  }

  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  function create(host, id) {
    const F = FACES[id]; if (!F) return null;
    const cv = document.createElement('canvas');
    cv.className = 'avt-photo';
    let gl = null;
    try { gl = cv.getContext('webgl', { premultipliedAlpha: false, antialias: true, preserveDrawingBuffer: false }) || cv.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) return null;
    let P1, P2;
    try {
      P1 = program(gl, VS.replace('@@COMMON@@', COMMON), FS);
      P2 = program(gl, VS2, FS2.replace('@@COMMON@@', COMMON));
    } catch (e) { console.warn('photoreal avatar:', e.message); return null; }
    host.appendChild(cv);
    const M = mesh(F);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, M.pts, gl.STATIC_DRAW);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, M.idx, gl.STATIC_DRAW);
    const [ml, mly, mc, mcy, mr, mry, mup, mlow] = F.mouth;
    const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    const qx0 = ml - 12, qx1 = mr + 12, qy0 = mup - 6, qy1 = mlow + 28;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([qx0, qy0, qx1, qy0, qx0, qy1, qx1, qy1]), gl.STATIC_DRAW);
    const tex = gl.createTexture();
    let ready = false, dead = false, quality = 1;
    const img = new Image();
    img.onload = () => {
      if (dead) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      ready = true; host.classList.add('is-ready');
    };
    img.onerror = () => { host.classList.add('is-failed'); };
    img.src = F.src;
    const loc = (p, n) => gl.getUniformLocation(p, n);
    const U1 = {}, U2 = {};
    ['u_size', 'u_cam', 'u_aspect', 'u_head', 'u_pivot', 'u_m0', 'u_m1', 'u_mouth', 'u_face', 'u_face2', 'u_eL', 'u_eR', 'u_eL2', 'u_eR2', 'u_bL', 'u_bR', 'u_tex'].forEach(n => { U1[n] = loc(P1, n); });
    ['u_cam', 'u_aspect', 'u_head', 'u_pivot', 'u_m0', 'u_m1', 'u_mouth', 'u_face2', 'u_teeth', 'u_lip'].forEach(n => { U2[n] = loc(P2, n); });
    const A1 = gl.getAttribLocation(P1, 'a_p'), A2 = gl.getAttribLocation(P2, 'a_p');
    const lip = hex(F.lip);
    const [e0, e1] = F.eyes, [b0, b1] = F.brows;
    function size() {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1) * quality;
      const w = Math.max(64, Math.round(r.width * dpr)), h = Math.max(64, Math.round(r.height * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      return [w, h];
    }
    function setCommon(U, P, rig, aspect) {
      gl.useProgram(P);
      gl.uniform3f(U.u_cam, F.cam[0], F.cam[1], F.cam[2] / (rig.zoom || 1));
      gl.uniform1f(U.u_aspect, aspect);
      gl.uniform4f(U.u_head, rig.rot, rig.tx, rig.ty, rig.scale);
      gl.uniform2f(U.u_pivot, (ml + mr) / 2, F.chin + 40);
      gl.uniform4f(U.u_m0, ml, mly, mcy, mr);
      gl.uniform4f(U.u_m1, mry, mup, mlow, F.chin);
      gl.uniform4f(U.u_mouth, rig.open, rig.width, rig.round, rig.smile);
      gl.uniform4f(U.u_face2, rig.innerBrow, rig.furrow, rig.cheek, rig.jaw);
    }
    return {
      el: cv,
      ready: () => ready,
      // adaptive rendering: lower the resolution on slower devices
      setQuality(q) { quality = Math.max(0.5, Math.min(1, q)); },
      quality: () => quality,
      render(rig) {
        if (!ready || dead) return;
        const [w, h] = size();
        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        const aspect = h / w;
        setCommon(U1, P1, rig, aspect);
        gl.uniform2f(U1.u_size, F.W, F.H);
        gl.uniform4f(U1.u_face, rig.blink, rig.gx, rig.gy, rig.brow);
        gl.uniform4f(U1.u_eL, e0[0], e0[1], e0[2], e0[3]); gl.uniform3f(U1.u_eL2, e0[4], e0[5], e0[6]);
        gl.uniform4f(U1.u_eR, e1[0], e1[1], e1[2], e1[3]); gl.uniform3f(U1.u_eR2, e1[4], e1[5], e1[6]);
        gl.uniform4f(U1.u_bL, b0[2], b0[3], b0[4], b0[5]);
        gl.uniform4f(U1.u_bR, b1[2], b1[3], b1[0], b1[1]);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U1.u_tex, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.enableVertexAttribArray(A1); gl.vertexAttribPointer(A1, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.disable(gl.BLEND);
        gl.drawElements(gl.TRIANGLES, M.idx.length, gl.UNSIGNED_SHORT, 0);
        // the inside of the mouth
        setCommon(U2, P2, rig, aspect);
        gl.uniform4f(U2.u_teeth, rig.teeth, rig.teethLow, rig.tongue, w / (2 * F.cam[2] / (rig.zoom || 1)));
        gl.uniform3f(U2.u_lip, lip[0], lip[1], lip[2]);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.enableVertexAttribArray(A2); gl.vertexAttribPointer(A2, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      destroy() { dead = true; try { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { /* ignore */ } cv.remove(); }
    };
  }
  window.ERLY = window.ERLY || {};
  ERLY.photoHead = { create, faces: FACES, supported: () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } } };
})();
