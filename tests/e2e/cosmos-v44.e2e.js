// The universe, v44: astronaut model and animation system, thrusters tied to motion, eleven distinct worlds, the asteroid
// field, and the three scroll passes — slow, fast and reverse — with joint validity, clearance, determinism, resource
// stability across navigation, adaptive quality, reduced motion and page errors.
//   python3 -m http.server 8765 &   then   node tests/e2e/cosmos-v44.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 6).join('\n     ')); } };
const ORDER = ['maths', 'physics', 'chemistry', 'biology', 'geography', 'cs', 'english', 'history', 'languages', 'social', 'more'];

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
  const mk = async (o = {}) => b.newContext(Object.assign({ viewport: { width: 1280, height: 800 } }, o));
  let ctx = await mk(), p = null;
  const fresh = async (c = ctx) => { if (p) await p.close().catch(() => {}); p = await c.newPage(); p.setDefaultTimeout(120000); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { const x = m.text(); if (m.type() === 'error' && !/favicon|net::ERR|Failed to load resource/.test(x)) errs.push(x); if (/THREE\.WebGLProgram|Shader Error|shader/i.test(x) && m.type() !== 'log') errs.push(x.slice(0, 300)); }); };
  const open = async (c) => { await fresh(c); await p.goto(BASE + 'learn.html?preview=space&cosmos=gl#/home'); await p.waitForFunction(() => window.LS && LS.__cosmos && LS.__cosmos.stats().astronaut, null, { timeout: 120000 }); await p.evaluate(() => LS.__cosmos.buildAll()); await p.waitForTimeout(1500); };
  const ev = (f, a) => p.evaluate(f, a);
  const settle = async (to, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await ev(() => LS.__cosmos.progress()); if (Math.abs(v - to) < 0.002) return v; await p.waitForTimeout(250); } return ev(() => LS.__cosmos.progress()); };
  const check = () => ev(() => { const C = LS.__cosmos, a = C.debugAstro(), s = C.debugAstroState(), T = C.THREE; const ap = new T.Vector3(...a.pos); let minClear = Infinity, who = null;
    C.scene.traverse(o => { if (/^world:/.test(o.name) && o.visible) { const r = o.userData.radius * o.scale.x, d = ap.distanceTo(o.position) - r; if (d < minClear) { minClear = d; who = o.name; } } });
    const cam = new T.Vector3(...a.cam); return { p: a.p, ndc: a.ndc, nanT: s.nanTransforms, guards: s.nanGuards, w: s.weights, th: s.thrust, minClear, who, camDist: ap.distanceTo(cam) }; });

  await t('scene: astronaut (jointed, with articulated fingers and a live-reflecting visor), eleven worlds with eleven distinct surfaces, a ringed gas giant, and the asteroid families', async () => {
    await open();
    const r = await ev(() => { const C = LS.__cosmos, S = C.scene, out = { joints: 0, fingers: 0, visorEnv: false, modes: new Set(), ring: false, rockGroups: 0, rockTris: [], thrusterNozzles: 0 };
      S.traverse(o => { if (/^(pelvis|chest|neck|head|uArm[LR]|fArm[LR]|hand[LR]|thigh[LR]|shin[LR]|foot[LR])$/.test(o.name)) out.joints++; if (/^world:/.test(o.name)) { const c = o.userData.core; if (c && c.userData.mode != null) out.modes.add(o.name + ':' + c.userData.mode); }
        if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uIn && o.material.uniforms.uOut) out.ring = true; if (o.isInstancedMesh && o.geometry.attributes.aDrift) { out.rockGroups++; out.rockTris.push(o.geometry.index ? o.geometry.index.count / 3 : 0); } });
      S.traverse(o => { if (o.isMesh && o.material && o.material.isMeshPhysicalMaterial && o.material.metalness === 1 && o.material.envMap) out.visorEnv = out.visorEnv || !!o.material.envMap.isRenderTargetTexture || !!o.material.envMap; });
      const st = C.debugAstroState(); return { joints: out.joints, modes: [...out.modes], ring: out.ring, rockGroups: out.rockGroups, rockTris: out.rockTris, visorEnv: out.visorEnv, envLive: st.envLive, stats: C.stats() }; });
    assert.equal(r.joints, 16, 'skeleton joints'); assert.equal(r.modes.length, 11); assert.equal(new Set(r.modes.map(m => m.split(':')[1])).size, 11, 'eleven distinct surface types: ' + r.modes.join(', '));
    assert.ok(r.ring, 'the physics world has its rings'); assert.ok(r.rockGroups >= 10, 'rock families × detail tiers: ' + r.rockGroups); assert.ok(Math.max(...r.rockTris) > 4 * Math.min(...r.rockTris), 'large rocks use more detailed geometry'); assert.ok(r.visorEnv && r.envLive, 'visor reflects the universe live');
    assert.equal(r.stats.worlds, 11);
  });
  await t('pass A (slow): scene by scene from the start to the overview — joints valid, astronaut in frame, never inside a world', async () => {
    const bad = [];
    for (let k = 0; k <= 14; k += 0.5) { await ev(x => LS.__cosmos.setTarget(x), k); await p.waitForTimeout(k % 1 ? 700 : 1300); const c = await check();
      if (c.nanT || c.guards) bad.push(`${k}: NaN transforms ${c.nanT}/${c.guards}`); if (c.minClear < 0.15) bad.push(`${k}: ${c.who} clearance ${c.minClear.toFixed(2)}`); if (c.camDist < 1.0) bad.push(`${k}: too close to the lens ${c.camDist.toFixed(2)}`); }
    await settle(14); const c = await check(); assert.ok(Math.abs(c.ndc[0]) < 1.05 && Math.abs(c.ndc[1]) < 1.05 && c.ndc[2] < 1, 'in frame at the end ' + c.ndc);
    assert.deepEqual(bad, []);
  });
  await t('pass B (fast): flinging across the whole journey keeps everything valid, and the same scene always looks the same', async () => {
    const bad = []; for (const k of [0, 14, 3, 11, 0.5, 9, 2, 13, 5]) { await ev(x => LS.__cosmos.setTarget(x), k); await p.waitForTimeout(350); const c = await check(); if (c.nanT || c.guards) bad.push(`${k}: NaN`); if (c.minClear < 0.1) bad.push(`${k}: ${c.who} ${c.minClear.toFixed(2)}`); }
    await settle(5); await p.waitForTimeout(3500); const A1 = await ev(() => ({ cam: LS.__cosmos.debugCam(), s: LS.__cosmos.debugAstroState() }));
    await ev(() => LS.__cosmos.setTarget(12)); await settle(12); await ev(() => LS.__cosmos.setTarget(5)); await settle(5); await p.waitForTimeout(3500); const A2 = await ev(() => ({ cam: LS.__cosmos.debugCam(), s: LS.__cosmos.debugAstroState() }));
    A1.cam.forEach((x, i) => assert.ok(Math.abs(x - A2.cam[i]) < 0.02, 'camera at scene 5 is the same whichever way it was reached: ' + A1.cam + ' / ' + A2.cam));
    assert.ok(A1.s.weights.observe > 0.9 && A2.s.weights.observe > 0.9, 'observing the world on arrival both times'); assert.deepEqual(bad, []);
  });
  await t('pass C (reverse): from the overview back to the opening — the astronaut returns to the opening state, jets off at rest', async () => {
    await ev(() => LS.__cosmos.setTarget(14)); await settle(14); const seen = { brake: 0, main: 0 };
    for (let k = 14; k >= 0; k -= 1) { await ev(x => LS.__cosmos.setTarget(x), k); await p.waitForTimeout(500); const c = await check(); seen.brake = Math.max(seen.brake, c.th.brake); seen.main = Math.max(seen.main, c.th.main); assert.ok(!c.nanT && !c.guards, 'valid at ' + k); }
    await settle(0); await p.waitForTimeout(4000); const c = await check();
    assert.ok(c.w.hover + c.w.neutral > 0.9, 'resting at the opening: ' + JSON.stringify(c.w)); assert.ok(c.th.main < 0.02 && c.th.brake < 0.02 && Object.values(c.th.rcs).every(x => x < 0.02), 'no exhaust at rest: ' + JSON.stringify(c.th));
    assert.ok(seen.main > 0.2 || seen.brake > 0.2, 'the jets fired while travelling: ' + JSON.stringify(seen));
  });
  await t('thrusters are spatially attached: every plume starts at its own nozzle and points the way its nozzle points', async () => {
    await ev(() => LS.__cosmos.debugThrust({ main: 1, brake: 1, rcs: { yawL: 1, yawR: 1, up: 1, down: 1 } })); await p.waitForTimeout(800);
    const r = await ev(() => { const C = LS.__cosmos, T = C.THREE, out = []; C.scene.traverse(o => { if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uCore) { const g = o.parent, pg = new T.Vector3(), po = new T.Vector3(); g.getWorldPosition(pg); o.getWorldPosition(po); const qd = new T.Quaternion(); g.getWorldQuaternion(qd); const dir = new T.Vector3(0, -1, 0).applyQuaternion(qd); out.push({ gap: po.distanceTo(pg), along: po.clone().sub(pg).normalize().dot(dir), vis: o.visible }); } }); return out; });
    await ev(() => LS.__cosmos.debugThrust(null));
    assert.ok(r.length >= 24, 'plumes ' + r.length); r.forEach((x, i) => { assert.ok(x.gap < 0.06, 'plume ' + i + ' starts at its nozzle exit: ' + x.gap); assert.ok(x.along > 0.99, 'plume ' + i + ' points along its nozzle'); });
    assert.ok(r.filter(x => x.vis).length >= 12, 'forced jets are drawn');
  });
  await t('asteroid field is deterministic: the same rocks in the same places on every visit', async () => {
    const sig = () => ev(() => { let h = 0, n = 0; LS.__cosmos.scene.traverse(o => { if (o.isInstancedMesh && o.geometry.attributes.aDrift) { const a = o.instanceMatrix.array; for (let i = 0; i < a.length; i += 7) h = (h * 31 + Math.round(a[i] * 1000)) % 1000000007; n += o.count; } }); return [h, n]; });
    const s1 = await sig(); await open(); const s2 = await sig(); assert.deepEqual(s1, s2);
  });
  await t('leaving and returning re-uses the parked universe: no second render loop, no growth in GPU resources', async () => {
    const m0 = await ev(() => { const s = LS.__cosmos.stats(); return { g: s.geometries, t: s.textures, id: (LS.__cosmos.__id = LS.__cosmos.__id || Math.random()) }; });
    for (let i = 0; i < 3; i++) { await ev(() => { location.hash = '#/explore'; }); await p.waitForTimeout(900); await ev(() => { location.hash = '#/home'; }); await p.waitForFunction(() => LS.__cosmos && LS.__cosmos.stats().astronaut, null, { timeout: 60000 }); await p.waitForTimeout(900); }
    const m1 = await ev(() => { const s = LS.__cosmos.stats(); return { g: s.geometries, t: s.textures, id: LS.__cosmos.__id, scenes: LS.__scenes ? LS.__scenes.size : 0 }; });
    assert.equal(m1.id, m0.id, 'the same universe object'); assert.ok(m1.g <= m0.g + 2 && m1.t <= m0.t + 2, `resources stable: ${JSON.stringify(m0)} → ${JSON.stringify(m1)}`);
  });
  await t('adaptive quality: a phone gets the low tier — fewer rocks and particles, no live reflections — with the same astronaut', async () => {
    const ph = await mk({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await open(ph);
    const r = await ev(() => { const C = LS.__cosmos, s = C.stats(), st = C.debugAstroState(); let rocks = 0, joints = 0; C.scene.traverse(o => { if (o.isInstancedMesh && o.geometry.attributes.aDrift) rocks += o.count; if (/^(uArm|fArm|hand)[LR]$/.test(o.name)) joints++; }); return { tier: s.tier, rocks, env: st.envLive, particles: st.particles, joints, ovf: document.documentElement.scrollWidth - innerWidth }; });
    assert.equal(r.tier, 0); assert.ok(r.rocks < 100, 'rocks ' + r.rocks); assert.equal(r.env, false); assert.ok(r.particles <= 120); assert.equal(r.joints, 6, 'the astronaut keeps its articulated arms'); assert.ok(r.ovf <= 1, 'no horizontal overflow');
    await ph.close(); p = null;
  });
  await t('reduced motion: the universe still renders and can be scrolled; the astronaut holds still and fires nothing', async () => {
    const rc = await mk({ reducedMotion: 'reduce' }); await open(rc); await ev(() => LS.__cosmos.setTarget(4)); await settle(4); await p.waitForTimeout(1500);
    const c = await check(); assert.ok(c.th.main === 0 && c.th.brake === 0, 'no thrust in reduced motion'); assert.ok(!c.nanT); await rc.close(); p = null;
  });
  await t('no page errors, no shader errors', async () => { assert.deepEqual(errs, []); });
  await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
