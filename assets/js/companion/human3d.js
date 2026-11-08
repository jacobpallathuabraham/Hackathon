/* ERLY — real-time 3D digital humans for Noor's voice conversations.

   Models: Microsoft Rocketbox Avatar Library (MIT licence) — fully rigged
   adult humans with a Biped skeleton, fingers, facial bones and facial
   blendshapes (15 visemes + ARKit shapes). Converted to compressed GLB by
   ERLY (tools/humans/README.md). Body motion: Rocketbox motion-capture clips
   (talking, listening, thinking, presenting, waving, laughing, shrugging,
   idles), cross-faded by a small state machine:

     greeting → wave · idle → breathing idle · listening → attentive idle with
     nods while the student talks · thinking → thoughtful pose, gaze up/aside ·
     speaking → a talking-gesture clip chosen from the tone of each sentence
     (relaxed for calm, neutral for explaining, excited for enthusiastic,
     presenting for step-by-step), a shrug for "it depends", a soft laugh for
     humour.

   Face: lip-sync drives the viseme blendshapes and jaw from the same
   text-and-word-timing engine as the other avatars (lipsync.js); blinks are
   irregular; the head and eyes keep natural eye contact with the camera
   (with small saccades); expressions (smile, brows, squint, frown) follow
   the emotion of what is being said — never the student's face or voice.

   Environments are 3D rooms rendered behind the avatar with a depth-of-field
   blur, so the person stays the focus. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODELS = new URL('../../models/humans/', import.meta.url).href;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
// models are loaded fresh per viewer (each needs its own skeleton); motion packs are shared
const loadModel = url => loader.loadAsync(url);
const loadGLB = url => { if (!cache.has(url)) cache.set(url, loader.loadAsync(url).catch(e => { cache.delete(url); throw e; })); return cache.get(url); };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// our 13 mouth shapes → the model's viseme blendshapes
const VMAP = { A: 'viseme_aa', E: 'viseme_E', I: 'viseme_I', O: 'viseme_O', U: 'viseme_U', M: 'viseme_PP', F: 'viseme_FF', L: 'viseme_DD', S: 'viseme_SS', H: 'viseme_CH', K: 'viseme_KK', R: 'viseme_RR' };
const VIS_NAMES = ['viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U', 'viseme_PP', 'viseme_FF', 'viseme_DD', 'viseme_SS', 'viseme_CH', 'viseme_KK', 'viseme_RR', 'viseme_TH', 'viseme_nn'];
const TALK = { neutral: ['talk_neutral_01', 'talk_neutral_02'], relaxed: ['talk_relaxed_01', 'talk_relaxed_02'], excited: ['talk_excited_01'], present: ['presentation_left_01', 'presentation_right_01'] };
const TONE_TALK = { enthusiastic: 'excited', excited: 'excited', happy: 'excited', playful: 'excited', empathetic: 'relaxed', sympathetic: 'relaxed', reassuring: 'relaxed', calm: 'relaxed', thoughtful: 'relaxed', confident: 'neutral', curious: 'neutral', serious: 'neutral', encouraging: 'neutral', surprised: 'excited', neutral: 'neutral' };

/* ---------------- environments ---------------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const box = (w, h, d, color, opts) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, opts || {})));
function bookshelf(x, z, w, h, seed, rotY) {
  const g = new THREE.Group(); const r = rnd(seed);
  const wood = 0x5b3d2a;
  const back = box(w, h, 0.03, 0x3e2a1d); back.position.set(0, h / 2, -0.15); g.add(back);
  [-w / 2, w / 2].forEach(x => { const side = box(0.04, h, 0.35, wood); side.position.set(x, h / 2, 0); g.add(side); });
  const top = box(w, 0.04, 0.35, wood); top.position.y = h; g.add(top);
  const cols = [0x6e3b3b, 0x3b4f63, 0x9c8358, 0x4a5e4c, 0xcfc6b4, 0x5a4d5e, 0x8a6a4a, 0x2d3a44, 0x7d5a50, 0x56686a]; // muted, real-library palette
  const shelves = Math.max(3, Math.round(h / 0.4));
  for (let s = 0; s < shelves; s++) {
    const y = 0.08 + s * (h - 0.1) / shelves;
    const plank = box(w - 0.04, 0.03, 0.33, 0x4a3020); plank.position.set(0, y, 0.02); g.add(plank);
    let bx = -w / 2 + 0.05;
    while (bx < w / 2 - 0.08) {
      const bw = 0.025 + r() * 0.045, bh = 0.2 + r() * 0.13;
      if (r() < 0.08) { bx += 0.1; continue; }
      const b = box(bw, bh, 0.22, cols[Math.floor(r() * cols.length)], { roughness: 0.7 });
      b.position.set(bx + bw / 2, y + bh / 2 + 0.015, 0.06); b.rotation.z = r() < 0.06 ? 0.2 : 0; g.add(b); bx += bw + 0.004;
    }
  }
  g.position.set(x, 0, z); g.rotation.y = rotY || 0; return g;
}
function plant(x, z, s) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.12 * s, 0.3 * s, 16), new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.6 })); pot.position.y = 0.15 * s; g.add(pot);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.7 });
  const r = rnd(Math.floor(x * 100 + z * 10) + 7);
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 10, 8), leaf); m.scale.set(1, 1.6, 0.4); m.position.set((r() - 0.5) * 0.4 * s, (0.4 + r() * 0.7) * s, (r() - 0.5) * 0.3 * s); m.rotation.set(r(), r() * 3, r() - 0.5); g.add(m); }
  g.position.set(x, 0, z); return g;
}
function windowPanel(x, y, z, w, h, sky, rotY) {
  const t = canvasTex(256, 256, (c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); sky.forEach((col, i) => gr.addColorStop(i / (sky.length - 1), col)); c.fillStyle = gr; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(60,110,70,.55)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(i * 34, H * 0.86, 30 + (i % 3) * 12, 0, 7); c.fill(); } });
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); g.add(glass);
  const fm = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.5 });
  [[0, h / 2, w, 0.06], [0, -h / 2, w, 0.06], [0, 0, w, 0.04]].forEach(([px, py, ww, hh]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 0.06), fm); b.position.set(px, py, 0.02); g.add(b); });
  [[-w / 2], [w / 2], [0]].forEach(([px]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.06), fm); b.position.set(px, 0, 0.02); g.add(b); });
  g.position.set(x, y, z); g.rotation.y = rotY || 0; return g;
}
function board(x, y, z, w, h, draw, rotY, frameCol) {
  const t = canvasTex(1024, Math.round(1024 * h / w), draw);
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.45 })); g.add(p);
  const f = box(w + 0.08, h + 0.08, 0.03, frameCol || 0x9aa0a6, { roughness: 0.4, metalness: 0.3 }); f.position.z = -0.02; g.add(f);
  g.position.set(x, y, z); g.rotation.y = rotY || 0; return g;
}
const write = (c, lines, font, col) => { c.fillStyle = col; c.font = font; lines.forEach(([t, x, y]) => c.fillText(t, x, y)); };
const ENVS = {
  portrait: { name: ['Portrait studio', 'استوديو احترافي'], wall: 0x2b2f36, floor: 0x24272d, light: 0xfff4ea, build(s) {
    // seamless photographic backdrop with a soft light pool behind the person and a gentle vignette
    s.background = canvasTex(512, 512, (c, W, H) => { const g = c.createRadialGradient(W * 0.52, H * 0.42, 10, W * 0.5, H * 0.5, W * 0.75); g.addColorStop(0, '#6d717a'); g.addColorStop(0.45, '#454951'); g.addColorStop(1, '#1d2025'); c.fillStyle = g; c.fillRect(0, 0, W, H); const im = c.getImageData(0, 0, W, H), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 6; d[i] += n; d[i + 1] += n; d[i + 2] += n; } c.putImageData(im, 0, 0); });
    s.children.filter(o => o.isMesh).forEach(o => { o.visible = false; });
  } },
  campus: { name: ['Modern campus', 'حرم جامعي حديث'], wall: 0xd8d4cd, floor: 0x8f8a83, light: 0xfdf7ee, build(s) {
    // floor-to-ceiling glazing with slim mullions and soft daylight, light-oak slat wall, polished concrete
    const sky = canvasTex(512, 256, (c, W, H) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#cfe0ee'); g.addColorStop(0.7, '#eef2f2'); g.addColorStop(1, '#c9cfc4'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(120,140,120,.35)'; for (let i = 0; i < 14; i++) { c.beginPath(); c.ellipse(i * 40, H * 0.82, 34, 22 + (i % 3) * 8, 0, 0, 7); c.fill(); } c.fillStyle = 'rgba(160,170,180,.5)'; c.fillRect(W * 0.6, H * 0.45, W * 0.25, H * 0.32); });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 3.4), new THREE.MeshBasicMaterial({ map: sky, toneMapped: false })); glass.position.set(0.6, 1.7, -3.98); s.add(glass);
    const mull = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.4, metalness: 0.6 });
    for (let i = -3; i <= 4; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.4, 0.06), mull); m.position.set(i * 1.05 + 0.1, 1.7, -3.95); s.add(m); }
    const tr = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.05, 0.06), mull); tr.position.set(0.6, 2.6, -3.95); s.add(tr);
    const oak = new THREE.MeshStandardMaterial({ color: 0xc8a57e, roughness: 0.6 });
    for (let i = 0; i < 26; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.5, 0.05), oak); sl.position.set(-3.75, 1.75, -3.6 + i * 0.13); s.add(sl); }
    const bench = box(2.4, 0.08, 0.5, 0xb89470); bench.position.set(1.8, 0.45, -3.2); s.add(bench);
    s.add(plant(-2.6, -3.2, 1.3)); s.add(plant(3.2, -3.4, 1.1));
    const sun = new THREE.DirectionalLight(0xfff6e6, 1.4); sun.position.set(0, 3, -6); s.add(sun);
  } },
  classroom: { name: ['Classroom', 'الفصل الدراسي'], wall: 0xe8e2d6, floor: 0xb08b62, light: 0xfff4e0, build(s) {
    s.add(board(0.2, 1.75, -3.9, 3.4, 1.4, (c, W, H) => { c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, W, H); write(c, [['E = mc²', 60, 120], ['F = ma', 60, 230], ['a² + b² = c²', 520, 140], ['∫ x dx = x²/2 + C', 470, 260], ['photosynthesis →', 60, 360]], '600 64px Georgia', '#1d3b8c'); c.strokeStyle = '#c0392b'; c.lineWidth = 6; c.beginPath(); c.moveTo(560, 380); c.quadraticCurveTo(700, 300, 900, 360); c.stroke(); }, 0, 0xb8bec4));
    s.add(windowPanel(3.4, 1.7, -1.6, 2.2, 1.6, ['#bfe3ff', '#e9f6ff', '#fff6dc'], -Math.PI / 2));
    s.add(bookshelf(-3.2, -3.2, 1.6, 2.0, 11, 0.5));
    const r = rnd(5); for (let i = 0; i < 6; i++) { const d = box(1.0, 0.05, 0.6, 0xc9a777); d.position.set(-2.4 + (i % 3) * 2.2, 0.74, -2.2 + Math.floor(i / 3) * 1.4); s.add(d); const leg = box(0.9, 0.7, 0.04, 0x5c5c5c); leg.position.set(d.position.x, 0.37, d.position.z + 0.25); s.add(leg); }
    s.add(plant(2.6, -3.3, 1.4));
  } },
  lecture: { name: ['Lecture hall', 'قاعة المحاضرات'], wall: 0x3a3f4a, floor: 0x4a3b33, light: 0xdfe8ff, dark: true, build(s) {
    s.add(board(0, 2.1, -4.5, 4.4, 2.4, (c, W, H) => { const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#16233f'); g.addColorStop(1, '#2b4c7e'); c.fillStyle = g; c.fillRect(0, 0, W, H); write(c, [['ERLY', 70, 150]], '800 110px Inter, Arial', '#ffffff'); write(c, [['Introduction to Thermodynamics', 70, 260], ['Lecture 4 · Energy and entropy', 70, 330]], '500 46px Inter, Arial', '#c9d8ff'); c.fillStyle = '#ffb547'; [[620, 380, 60], [700, 330, 110], [780, 300, 140], [860, 260, 180]].forEach(([x, y, h]) => c.fillRect(x, H - 40 - h, 50, h)); }, 0, 0x222428));
    for (let row = 0; row < 4; row++) for (let i = -4; i <= 4; i++) { const seat = box(0.55, 0.5, 0.5, 0x7a2e3a, { roughness: 0.9 }); seat.position.set(i * 0.7, 0.25 + row * 0.35, -1.2 + row * 1.0); s.add(seat); }
    for (let i = -2; i <= 2; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0xfff1cc, toneMapped: false })); l.position.set(i * 1.6, 3.4, -2.5); s.add(l); }
  } },
  study: { name: ['Study room', 'غرفة المذاكرة'], wall: 0x6b5847, floor: 0x5a3e2b, light: 0xffd9a0, warm: true, build(s) {
    s.add(bookshelf(-2.2, -3.2, 2.4, 2.4, 3)); s.add(bookshelf(1.1, -3.3, 2.0, 2.4, 9));
    s.add(windowPanel(3.3, 1.6, -1.8, 1.6, 1.5, ['#2b3a67', '#d97d54', '#f6c27a'], -Math.PI / 2));
    s.add(plant(-3.3, -2.0, 1.2)); s.add(plant(2.9, -3.0, 1.0));
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), new THREE.MeshStandardMaterial({ color: 0x3d7ab8, roughness: 0.4 })); globe.position.set(2.0, 1.1, -1.4); s.add(globe);
    const desk = box(1.8, 0.06, 0.8, 0x6b4a33); desk.position.set(2.0, 0.84, -1.4); s.add(desk);
    for (const [x, y, z] of [[-0.6, 2.2, -3.0], [1.9, 1.6, -3.0], [-3.0, 1.9, -1.5]]) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffcf86, toneMapped: false })); lamp.position.set(x, y, z); s.add(lamp); const pl = new THREE.PointLight(0xffb866, 6, 4, 2); pl.position.copy(lamp.position); s.add(pl); }
  } },
  lab: { name: ['Science lab', 'مختبر العلوم'], wall: 0xdfe7ea, floor: 0x9aa5ab, light: 0xeaf6ff, build(s) {
    for (let i = 0; i < 3; i++) { const b = box(2.4, 0.9, 0.8, 0x2f3b45); b.position.set(-2.6 + i * 2.6, 0.45, -2.6); s.add(b); const top = box(2.5, 0.05, 0.85, 0x111417, { roughness: 0.3 }); top.position.set(b.position.x, 0.92, -2.6); s.add(top);
      for (let k = 0; k < 4; k++) { const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.22, 16), new THREE.MeshPhysicalMaterial({ color: [0x7fd1ff, 0x9cff9c, 0xffc36b, 0xd59cff][k], transmission: 0.6, roughness: 0.1, transparent: true, opacity: 0.8 })); fl.position.set(b.position.x - 0.8 + k * 0.5, 1.06, -2.6); s.add(fl); } }
    s.add(board(-0.3, 2.0, -3.9, 2.6, 1.3, (c, W, H) => { c.fillStyle = '#f7f9fb'; c.fillRect(0, 0, W, H); const cols = ['#ffd4d4', '#d4e8ff', '#e2ffd4', '#fff1c4', '#ecd4ff']; for (let r = 0; r < 7; r++) for (let k = 0; k < 18; k++) { if (r === 0 && k > 0 && k < 17) continue; if (r < 3 && k > 1 && k < 12) continue; c.fillStyle = cols[(r + k) % 5]; c.fillRect(20 + k * 54, 30 + r * 66, 50, 60); } write(c, [['Periodic table of the elements', 330, 230]], '600 30px Inter, Arial', '#334'); }, 0, 0x9aa5ab));
    const shelf = box(1.6, 0.04, 0.3, 0xbfc7cc); shelf.position.set(2.6, 1.7, -3.6); s.add(shelf);
  } },
  clinic: { name: ['Consultation room', 'غرفة الاستشارة'], wall: 0xeef3f6, floor: 0xc9d3d8, light: 0xf2fbff, build(s) {
    const bed = box(2.0, 0.6, 0.8, 0x5d8aa8, { roughness: 0.6 }); bed.position.set(2.2, 0.55, -2.6); s.add(bed); const sheet = box(1.9, 0.05, 0.75, 0xffffff); sheet.position.set(2.2, 0.88, -2.6); s.add(sheet);
    const cab = box(1.4, 2.0, 0.5, 0xf7f9fa, { roughness: 0.4 }); cab.position.set(-2.6, 1.0, -3.4); s.add(cab);
    s.add(board(0, 1.8, -3.9, 1.2, 1.6, (c, W, H) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.strokeStyle = '#d04848'; c.lineWidth = 10; c.beginPath(); c.arc(W / 2, 260, 120, 0, 7); c.stroke(); c.fillStyle = '#3b6ea5'; c.font = '600 60px Inter, Arial'; c.fillText('Healthy habits', 260, 520); ['Sleep 7–9 h', 'Move every hour', 'Drink water', 'Take breaks'].forEach((t, i) => { c.fillStyle = '#334'; c.font = '400 46px Inter, Arial'; c.fillText('• ' + t, 230, 640 + i * 80); }); }, 0, 0xd0d8dc));
    s.add(windowPanel(3.4, 1.7, -0.8, 1.8, 1.5, ['#cfe8ff', '#f4fbff'], -Math.PI / 2));
    s.add(plant(-1.6, -3.4, 1.1));
  } },
  library: { name: ['Library', 'المكتبة'], wall: 0x4e3b2c, floor: 0x3f2d1f, light: 0xffd8a8, warm: true, build(s) {
    for (let i = 0; i < 5; i++) s.add(bookshelf(-4.2 + i * 2.1, -3.6, 2.0, 2.8, 20 + i));
    s.add(bookshelf(-3.6, -1.0, 2.2, 2.6, 40, Math.PI / 2)); s.add(bookshelf(3.6, -1.0, 2.2, 2.6, 41, -Math.PI / 2));
    for (let i = 0; i < 2; i++) { const t = box(1.6, 0.06, 0.9, 0x6b4a33); t.position.set(-1.5 + i * 3, 0.78, -2.0); s.add(t); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0xa6e0a0, toneMapped: false })); lamp.position.set(t.position.x, 1.05, -2.0); s.add(lamp); const pl = new THREE.PointLight(0xffd08a, 5, 3.5, 2); pl.position.copy(lamp.position); s.add(pl); }
  } },
  studio: { name: ['ERLY studio', 'استوديو إيرلي'], wall: 0x15121f, floor: 0x0d0b14, light: 0xcfc8ff, dark: true, build(s) {
    s.add(board(0, 2.0, -4.0, 2.2, 0.9, (c, W, H) => { c.fillStyle = '#100d1a'; c.fillRect(0, 0, W, H); const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#8b7bff'); g.addColorStop(1, '#ff8a5b'); c.fillStyle = g; c.font = '800 220px Inter, Arial'; c.textAlign = 'center'; c.fillText('ERLY', W / 2, H * 0.68); }, 0, 0x100d1a));
    for (let i = -3; i <= 3; i++) { const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.2, 0.02), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x6c5cff : 0xff7a4d, toneMapped: false })); strip.position.set(i * 1.3, 1.6, -3.95); s.add(strip); }
  } },
  minimal: { name: ['Minimal', 'بسيط'], wall: 0xd9d4cc, floor: 0xcfc9bf, light: 0xffffff, minimal: true, build() {} }
};

function buildEnvScene(id) {
  const E = ENVS[id] || ENVS.classroom;
  const s = new THREE.Scene();
  s.background = new THREE.Color(E.wall);
  const wallM = new THREE.MeshStandardMaterial({ color: E.wall, roughness: 0.95 });
  const floorM = new THREE.MeshStandardMaterial({ color: E.floor, roughness: 0.85 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), wallM); back.position.set(0, 3, -4.0); s.add(back);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), floorM); floor.rotation.x = -Math.PI / 2; floor.position.z = 0; s.add(floor);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), wallM); left.rotation.y = Math.PI / 2; left.position.set(-3.8, 3, 0); s.add(left);
  const right = left.clone(); right.rotation.y = -Math.PI / 2; right.position.x = 3.8; s.add(right);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.6; s.add(ceil);
  s.add(new THREE.HemisphereLight(E.light, E.floor, E.dark ? 0.7 : 1.4));
  const sun = new THREE.DirectionalLight(E.light, E.dark ? 0.8 : 2.0); sun.position.set(3, 4, 2); s.add(sun);
  if (E.minimal) { const g = canvasTex(64, 256, (c, W, H) => { const gr = c.createRadialGradient(W / 2, H * 0.35, 5, W / 2, H * 0.4, H * 0.8); gr.addColorStop(0, '#f6f2ea'); gr.addColorStop(1, '#b9b2a6'); c.fillStyle = gr; c.fillRect(0, 0, W, H); }); s.background = g; }
  E.build(s);
  return s;
}

/* ---------------- the digital human ---------------- */
export async function create(host, opts) {
  opts = opts || {};
  const meta = opts.meta || {};
  // v8 digital humans (MPFB/CC0 + TalkingHead animation) use their own engine
  if (meta.engine === 'dh') { const dh = await import('./digital-human.js'); return dh.create(host, opts, { ENVS, buildEnvScene }); }
  const wrap = document.createElement('div'); wrap.className = 'h3d';
  const bg = document.createElement('canvas'); bg.className = 'h3d__env';
  const cv = document.createElement('canvas'); cv.className = 'h3d__av';
  wrap.append(bg, cv); host.appendChild(wrap);

  let renderer, envR;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    envR = new THREE.WebGLRenderer({ canvas: bg, antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch (e) { wrap.remove(); throw new Error('webgl'); }
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  envR.outputColorSpace = THREE.SRGBColorSpace; envR.toneMapping = THREE.ACESFilmicToneMapping; envR.toneMappingExposure = 1.0;
  let quality = Math.min(2, window.devicePixelRatio || 1);
  if (opts.lowPower) quality = Math.min(quality, 1.25);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  const envCam = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  // lights: warm key, cool fill, rim to separate the person from the blurred room
  const key = new THREE.DirectionalLight(0xfff1e0, 2.4); key.position.set(-1.2, 2.6, 2.4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.7); fill.position.set(1.8, 1.4, 1.6); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.6); rim.position.set(0.6, 2.4, -2.2); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfaf3ea, 0x3a3029, 0.35));

  const hemi = scene.children.find(c => c.isHemisphereLight);
  function lightFor(id) {
    const E = ENVS[id] || ENVS.classroom;
    const L = new THREE.Color(E.light);
    key.color.copy(L).lerp(new THREE.Color(0xffffff), 0.35); key.intensity = E.dark ? 1.9 : E.warm ? 2.3 : 2.5;
    rim.color.copy(L); rim.intensity = E.dark ? 2.4 : 1.5;
    fill.color.copy(new THREE.Color(E.warm ? 0xffe4c8 : 0xdfe8ff)); fill.intensity = E.dark ? 0.45 : 0.7;
    if (hemi) { hemi.color.copy(L); hemi.groundColor.set(E.floor); hemi.intensity = E.dark ? 0.25 : 0.38; }
    renderer.toneMappingExposure = E.dark ? 1.0 : 1.05;
  }
  // load the person and their gender's motion clips
  const [gl, anims] = await Promise.all([loadModel(MODELS + meta.model), loadGLB(MODELS + (meta.g === 'f' ? 'anims_f.glb' : 'anims_m.glb'))]);
  const model = gl.scene; // each create() gets its own scene graph (no sharing across viewers)
  model.scale.setScalar(0.01);
  scene.add(model);
  let face = null; const meshes = [];
  model.traverse(o => {
    if (o.isMesh) {
      meshes.push(o); o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true;
      [].concat(o.material).forEach(m => {
        m.envMapIntensity = 0.6;
        if (m.name === 'opacity') { m.transparent = false; m.alphaTest = 0.45; m.alphaToCoverage = true; m.side = THREE.DoubleSide; m.depthWrite = true; }
        if (m.name === 'head' && !m.isMeshPhysicalMaterial) {
          // skin: soft sheen at grazing angles and a faint oily clearcoat read as skin rather than plastic
          const p = new THREE.MeshPhysicalMaterial({ name: 'head', map: m.map, normalMap: m.normalMap, roughness: 0.56, metalness: 0, sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffd2c2), clearcoat: 0.06, clearcoatRoughness: 0.45, specularIntensity: 0.45, envMapIntensity: 0.55 });
          if (p.normalMap) p.normalScale = new THREE.Vector2(0.75, 0.75);
          if (Array.isArray(o.material)) o.material[o.material.indexOf(m)] = p; else o.material = p;
        }
        if (m.name === 'body') { m.roughness = 0.82; }
      });
      if (o.morphTargetDictionary && o.morphTargetDictionary.jawOpen !== undefined) face = o;
    }
  });
  const bones = {}; model.traverse(o => { if (o.isBone) bones[o.name] = o; });
  const B = n => bones[n] || null;
  const head = B('Bip01_Head'), neck = B('Bip01_Neck');

  // animation
  const mixer = new THREE.AnimationMixer(model);
  const clips = {}; anims.animations.forEach(c => { clips[c.name] = c; });
  const actions = {};
  const act = n => { if (!clips[n]) return null; if (!actions[n]) actions[n] = mixer.clipAction(clips[n]); return actions[n]; };
  let base = null, oneShot = null, lastSwitch = 0, mode = 'idle', talkKind = 'neutral', lastNod = 0;
  const history = [];
  function play(name, o) {
    o = o || {};
    history.push(name + (o.once ? '*' : '')); if (history.length > 40) history.shift();
    const a = act(name); if (!a) return;
    const prev = oneShot || base;
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.setEffectiveTimeScale(o.speed || 1);
    if (o.once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; oneShot = a; }
    else { a.setLoop(THREE.LoopRepeat, Infinity); if (o.randomStart) a.time = Math.random() * clips[name].duration; base = a; oneShot = null; }
    a.play();
    if (prev && prev !== a) prev.crossFadeTo(a, o.fade || 0.6, false);
    lastSwitch = performance.now();
  }
  mixer.addEventListener('finished', e => { if (e.action === oneShot) { oneShot = null; const b = baseFor(mode); const a = act(b); if (a) { a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.time = 0; a.play(); e.action.crossFadeTo(a, 0.7, false); base = a; } } });
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function baseFor(m) { return m === 'listening' ? 'listen_neutral_01' : m === 'speaking' ? pick(TALK[talkKind] || TALK.neutral) : 'idle_neutral_01'; }

  // camera framing: waist up, room for both hands; 'shift' slides the person aside for a visual
  const cam0 = { y: 1.2, dist: 3 }, shift = { x: 0, to: 0 };
  play('idle_neutral_01', { randomStart: false, fade: 0 }); mixer.update(0.01); model.updateMatrixWorld(true);
  const headPos = new THREE.Vector3(); head.getWorldPosition(headPos);
  const pelvis = new THREE.Vector3(); B('Bip01_Pelvis').getWorldPosition(pelvis);
  function frame() {
    const r = cv.getBoundingClientRect(); const w = Math.max(64, r.width), h = Math.max(64, r.height);
    const px = Math.min(quality, 2);
    renderer.setPixelRatio(px); renderer.setSize(w, h, false);
    envR.setPixelRatio(0.9); envR.setSize(w, h, false);
    camera.aspect = w / h; envCam.aspect = w / h;
    const top = headPos.y + 0.3, bottom = pelvis.y - 0.32; // hands stay in view even with arms at rest           // just below the waist
    const tall = w / h < 0.8;
    const needH = top - bottom, needW = 1.3;                            // arm span for gestures
    const vFov = THREE.MathUtils.degToRad(camera.fov), t2 = Math.tan(vFov / 2);
    let dist, midY = (top + bottom) / 2 + (opts.offsetY || 0);
    if (tall) {
      // phones: the person fills the top ~55% of the screen (captions and controls sit below)
      let visH = needH / 0.55; if (visH * camera.aspect < 1.0) visH = 1.0 / camera.aspect;
      dist = visH / 2 / t2 * (opts.zoom || 1);
      midY -= visH * 0.1;
    } else {
      dist = Math.max(needH / 2 / t2, needW / 2 / (t2 * camera.aspect)) * (opts.zoom || 1);
    }
    cam0.y = midY; cam0.dist = dist;
    camera.position.set(shift.x, midY + 0.05, dist); camera.lookAt(shift.x, midY, 0);
    camera.updateProjectionMatrix();
    envCam.position.set(0, 1.35, 3.2); envCam.lookAt(0, 1.3, -3); envCam.updateProjectionMatrix();
    renderEnv();
  }
  // environment: rendered rarely, blurred by CSS (depth of field)
  let envScene = buildEnvScene(opts.env || 'classroom'), envId = opts.env || 'classroom';
  function renderEnv() { envR.render(envScene, envCam); }
  function setEnv(id) { if (!ENVS[id]) return; envId = id; lightFor(id); envScene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); }); envScene = buildEnvScene(id); renderEnv(); wrap.dataset.env = id; }
  wrap.dataset.env = envId; lightFor(envId);

  // face rig
  const dict = face ? face.morphTargetDictionary : {}, inf = face ? face.morphTargetInfluences : [];
  const idx = n => (dict[n] !== undefined ? dict[n] : -1);
  const M = {}; ['jawOpen', 'eyeBlinkLeft', 'eyeBlinkRight', 'mouthSmileLeft', 'mouthSmileRight', 'cheekSquintLeft', 'cheekSquintRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight', 'browDownLeft', 'browDownRight', 'eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight', 'mouthFrownLeft', 'mouthFrownRight', 'mouthDimpleLeft', 'mouthDimpleRight', 'eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight', 'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight', 'mouthClose', 'mouthPressLeft', 'mouthPressRight'].concat(VIS_NAMES).forEach(n => { M[n] = idx(n); });
  const W = {}; Object.keys(M).forEach(k => { W[k] = 0; });
  const setW = (n, v) => { const i = M[n]; if (i >= 0) inf[i] = v; };
  const LS = window.ERLY_LIPSYNC;
  const track = LS.Track();
  const EMO = (window.ERLY && ERLY.avatars && ERLY.avatars.EMO) || {};
  let emotion = 'neutral', state = 'idle', mic = 0, lastText = '', lastRate = 1, alive = true, raf = 0;
  const ex = { smile: 0.25, brow: 0, inner: 0, furrow: 0, tilt: 0, energy: 0.5, wide: 0 };
  const blink = { v: 0, at: performance.now() + 1200, phase: 0 };
  const gaze = { x: 0, y: 0, tx: 0, ty: 0, next: 0 };
  const vis = {}; VIS_NAMES.forEach(n => { vis[n] = 0; });
  let jaw = 0; const ext = { level: 0, at: 0 };

  // eye contact: the head turns (partly) towards the camera, with small natural drift
  const headFwdLocal = new THREE.Vector3();
  { const q = new THREE.Quaternion(); head.getWorldQuaternion(q); headFwdLocal.set(0, 0, 1).applyQuaternion(q.invert()).normalize(); }
  const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpP = new THREE.Vector3();
  function lookAtCamera(weight, offX, offY) {
    head.getWorldQuaternion(tmpQ); head.getWorldPosition(tmpP);
    const cur = tmpV.copy(headFwdLocal).applyQuaternion(tmpQ).normalize();
    const want = tmpV2.copy(camera.position).add(new THREE.Vector3(offX, offY, 0)).sub(tmpP).normalize();
    const delta = tmpQ2.setFromUnitVectors(cur, want);
    const ang = 2 * Math.acos(Math.min(1, Math.abs(delta.w)));
    const lim = THREE.MathUtils.degToRad(28);
    const k = weight * (ang > lim ? lim / ang : 1);
    const part = new THREE.Quaternion().slerp(delta, k);
    const world = part.multiply(tmpQ);
    const parentQ = new THREE.Quaternion(); head.parent.getWorldQuaternion(parentQ);
    head.quaternion.copy(parentQ.invert().multiply(world));
  }

  function update(dt, now) {
    mixer.update(dt);
    // expression targets from the emotion of what's being said (or the state)
    const key = state === 'listening' ? 'listening' : state === 'thinking' ? 'thinking' : state === 'paused' ? 'paused' : (state === 'speaking' ? emotion : 'neutral');
    const T = EMO[key] || [0.28, 0, 0, 0, 0, 0.5];
    const k = Math.min(1, dt * 2.4);
    ex.smile += (T[0] - ex.smile) * k; ex.brow += (T[1] - ex.brow) * k; ex.inner += (T[2] - ex.inner) * k; ex.furrow += (T[3] - ex.furrow) * k; ex.tilt += (T[4] - ex.tilt) * k; ex.energy += (T[5] - ex.energy) * k;
    ex.wide += ((emotion === 'surprised' && state === 'speaking' ? 0.6 : 0) - ex.wide) * k;
    // lips: visemes from real word timing
    let f = track.frame();
    const tv = {}; VIS_NAMES.forEach(n => { tv[n] = 0; });
    // streamed audio (real-time engine): the mouth follows the voice's loudness, cycling natural open shapes
    if (now - ext.at < 250 && ext.level > 0.04) { const ph = Math.floor(now / 110) % 4; f = { key: ['A', 'E', 'O', 'A'][ph], next: ['E', 'O', 'A', 'I'][ph], mix: (now % 110) / 110 }; }
    const a = VMAP[f.key], b = VMAP[f.next];
    if (a) tv[a] += (1 - f.mix) * 0.85; if (b) tv[b] += f.mix * 0.85;
    const shape = LS.mixShape(f.key, f.next, f.mix);
    VIS_NAMES.forEach(n => { const t = tv[n]; vis[n] += (t - vis[n]) * Math.min(1, dt * (t > vis[n] ? 28 : 18)); setW(n, vis[n]); });
    const extOn = now - ext.at < 250;
    jaw += ((extOn ? Math.min(0.45, ext.level * 0.6) : shape.o * 0.32) - jaw) * Math.min(1, dt * 22);
    if (extOn) VIS_NAMES.forEach(n => { vis[n] *= Math.min(1, 0.4 + ext.level); });
    setW('jawOpen', jaw);
    // blinks: quick close, slower open, irregular gaps, sometimes double
    if (now > blink.at && !blink.phase) blink.phase = 1;
    if (blink.phase === 1) { blink.v = Math.min(1, blink.v + dt * 14); if (blink.v >= 1) blink.phase = 2; }
    else if (blink.phase === 2) { blink.v = Math.max(0, blink.v - dt * 8); if (blink.v <= 0) { blink.phase = 0; blink.at = now + (Math.random() < 0.12 ? 180 : 2000 + Math.random() * 4500); } }
    const squint = Math.max(0, ex.smile - 0.4) * 0.5 + (state === 'thinking' ? 0.15 : 0);
    setW('eyeBlinkLeft', Math.min(1, blink.v + squint * 0.25)); setW('eyeBlinkRight', Math.min(1, blink.v + squint * 0.25));
    setW('eyeSquintLeft', squint); setW('eyeSquintRight', squint);
    setW('eyeWideLeft', ex.wide); setW('eyeWideRight', ex.wide);
    // expression
    const sm = Math.max(0, ex.smile - 0.12) * 0.75 * (1 - Math.min(1, vis.viseme_O + vis.viseme_U));
    setW('mouthSmileLeft', sm); setW('mouthSmileRight', sm);
    setW('cheekSquintLeft', sm * 0.5); setW('cheekSquintRight', sm * 0.5);
    setW('mouthDimpleLeft', sm * 0.2); setW('mouthDimpleRight', sm * 0.2);
    setW('browOuterUpLeft', ex.brow * 0.7); setW('browOuterUpRight', ex.brow * 0.7);
    setW('browInnerUp', Math.min(1, ex.inner * 0.8 + ex.brow * 0.4));
    setW('browDownLeft', ex.furrow * 0.7); setW('browDownRight', ex.furrow * 0.7);
    setW('mouthFrownLeft', ex.inner * 0.25); setW('mouthFrownRight', ex.inner * 0.25);
    // gaze: eye contact with small saccades; up and aside while thinking
    if (now > gaze.next) {
      if (state === 'thinking') { gaze.tx = (Math.random() < 0.5 ? -1 : 1) * 0.6; gaze.ty = 0.55; }
      else { const far = Math.random() < 0.25; gaze.tx = (Math.random() - 0.5) * (far ? 0.6 : 0.2); gaze.ty = (Math.random() - 0.5) * 0.15; }
      gaze.next = now + 500 + Math.random() * (state === 'speaking' ? 1800 : 2600);
    }
    gaze.x += (gaze.tx - gaze.x) * Math.min(1, dt * 16); gaze.y += (gaze.ty - gaze.y) * Math.min(1, dt * 16);
    const gx = gaze.x, gy = gaze.y;
    setW('eyeLookOutLeft', Math.max(0, -gx) * 0.6); setW('eyeLookInRight', Math.max(0, -gx) * 0.6);
    setW('eyeLookInLeft', Math.max(0, gx) * 0.6); setW('eyeLookOutRight', Math.max(0, gx) * 0.6);
    setW('eyeLookUpLeft', Math.max(0, gy) * 0.6); setW('eyeLookUpRight', Math.max(0, gy) * 0.6);
    setW('eyeLookDownLeft', Math.max(0, -gy) * 0.5); setW('eyeLookDownRight', Math.max(0, -gy) * 0.5);
    // head: eye contact + tilt from the expression
    model.updateMatrixWorld(true);
    if (!reduce) {
      const off = state === 'thinking' ? [gaze.tx * 0.5, 0.25] : [Math.sin(now / 2300) * 0.04 + ex.tilt * 0.01, 0];
      lookAtCamera(state === 'thinking' ? 0.45 : 0.75, off[0], off[1]);
      head.rotateZ(THREE.MathUtils.degToRad(ex.tilt * 0.6));
    }
    // listening: a small nod now and then while the student talks
    if (state === 'listening' && mic > 0.35 && now - lastNod > 4500 && clips.listen_accept_01) { lastNod = now; play('listen_accept_01', { once: true, fade: 0.4 }); }
  }

  let last = performance.now(), perf = { n: 0, t: 0 };
  function loop(now) {
    if (!alive) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; // keep real-time speed even on slow devices
    update(dt, now);
    if (Math.abs(shift.to - shift.x) > 0.001) shift.x += (shift.to - shift.x) * Math.min(1, dt * 3);
    const dr = reduce ? 0 : 1, tt = now / 1000;
    camera.position.x = shift.x + dr * Math.sin(tt * 0.21) * 0.012; camera.position.y = cam0.y + 0.05 + dr * Math.sin(tt * 0.17 + 1) * 0.008;
    camera.lookAt(shift.x, cam0.y, 0);
    renderer.render(scene, camera);
    // adaptive quality
    perf.n++; perf.t += dt;
    if (perf.n >= 120) { const ms = perf.t / perf.n * 1000; if (ms > 28 && quality > 0.75) { quality -= 0.25; frame(); } perf.n = 0; perf.t = 0; }
    raf = requestAnimationFrame(loop);
  }
  const ro = new ResizeObserver(() => frame()); ro.observe(cv);
  frame();
  raf = requestAnimationFrame(loop);

  // speech hooks (same API as the 2D avatars)
  // speaking cuts short a thinking pose or a listening nod (a greeting wave may finish)
  function endPose() { if (oneShot && /thoughtful|listen_accept/.test(oneShot.getClip().name)) { const o = oneShot; oneShot = null; base = o; } }
  function onPhrase(type, x, rate, voice, emo) {
    if (type === 'start') {
      endPose();
      lastText = x; lastRate = rate || 1; track.start(x, lastRate);
      if (emo) emotion = emo;
      if (state !== 'speaking') ctrl.setState('speaking');
      // gestures follow the tone of the sentence; changes happen at sentence starts, never mid-word
      const kind = /\b(first|second|third|step|look at|here's|this is|next|finally)\b/i.test(x) && Math.random() < 0.5 ? 'present' : (TONE_TALK[emotion] || 'neutral');
      if (/\b(it depends|not sure|hard to say|maybe)\b/i.test(x) && clips.shrug_01) play('shrug_01', { once: true, fade: 0.35 });
      else if (emotion === 'playful' && /\b(haha|ha ha|funny|joke)\b/i.test(x) && clips.laugh_low) play('laugh_low', { once: true, fade: 0.4 });
      else if (kind !== talkKind || performance.now() - lastSwitch > 9000 || !base || !/talk|presentation/.test(base.getClip().name)) { talkKind = kind; if (!oneShot) play(pick(TALK[kind]), { randomStart: true, fade: 0.7 }); }
    } else if (type === 'boundary') { if (!track.active && lastText) track.start(lastText, lastRate); track.boundary(x); }
    else if (type === 'end') track.stop();
  }
  let unhook = null;
  const ctrl = {
    three: true, avatar: meta,
    setState(s) {
      if (s === state) return;
      const prevState = state; state = s; wrap.dataset.state = s;
      mode = s === 'speaking' ? 'speaking' : s === 'listening' ? 'listening' : 'idle';
      if (s === 'thinking' && clips.thoughtful_01) play('thoughtful_01', { once: true, fade: 0.6 });
      else if (s === 'listening') { if (!oneShot) play('listen_neutral_01', { randomStart: true, fade: 0.8 }); }
      else if (s === 'idle' || s === 'paused') { if (prevState === 'speaking' || prevState === 'thinking' || !base) play('idle_neutral_01', { randomStart: true, fade: 0.9 }); track.stop(); }
      else if (s === 'speaking' && (endPose(), !oneShot) && (!base || !/talk|presentation/.test(base.getClip().name))) play(pick(TALK[talkKind] || TALK.neutral), { randomStart: true, fade: 0.7 });
    },
    greet() { if (clips.wave_01) play('wave_01', { once: true, fade: 0.4 }); },
    // slide the person to the left of the frame (metres) so a visual can sit on the right
    setShift(x) { shift.to = x || 0; },
    // a presenting gesture towards the visual (on the student's right)
    point() { const n = 'presentation_left_01'; if (clips[n] && performance.now() - lastSwitch > 2500 && (!oneShot || !/presentation/.test(oneShot.getClip().name))) play(n, { once: true, fade: 0.5, speed: 1.15 }); },
    emote(e) { if (EMO[e]) emotion = e; },
    emotion: () => emotion,
    attach(voice) { if (unhook) unhook(); unhook = voice && voice.onPhrase ? voice.onPhrase(onPhrase) : null; return ctrl; },
    level(x) { mic = x; },
    mouthLevel(x) { ext.level = x; ext.at = performance.now(); },
    say: onPhrase,
    shape: () => { const s = LS.mixShape(track.frame().key, 'X', 0); return { o: jaw / 0.32, w: s.w, r: s.r, t: s.t, g: s.g, f: s.f }; },
    weights: () => { const o = {}; Object.keys(M).forEach(n => { if (M[n] >= 0) o[n] = +inf[M[n]].toFixed(3); }); return o; },
    clip: () => (oneShot || base) ? (oneShot || base).getClip().name : null,
    history: () => history.slice(),
    expression: () => Object.assign({}, ex),
    lipsync: track,
    setEnv, env: () => envId, envs: ENVS,
    quality: () => quality,
    destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); if (unhook) unhook(); mixer.stopAllAction(); renderer.dispose(); envR.dispose(); try { renderer.forceContextLoss(); envR.forceContextLoss(); } catch (e) { /* ignore */ } wrap.remove(); }
  };
  ctrl.setState('idle');
  return ctrl;
}

export const ENVIRONMENTS = Object.fromEntries(Object.entries(ENVS).map(([k, v]) => [k, v.name]));
window.ERLY = window.ERLY || {};
ERLY.human3d = { create, ENVIRONMENTS, supported: () => { try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; } } };
window.dispatchEvent(new Event('erly:human3d'));
