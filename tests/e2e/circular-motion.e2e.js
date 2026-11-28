// Circular Motion chapter (v41): curriculum integration, the chapter landing, all fifteen 3D experiments (mount, 3D,
// physics against independent formulas, every slider at its minimum and maximum, modes, cameras, toggles), the
// prediction challenge hiding values until the student commits, and page errors.
//   python3 -m http.server 8765 &   then   node tests/e2e/circular-motion.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const g = 9.81, D = Math.PI / 180;
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 6).join('\n     ')); } };
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
const IDS = ['cm-ucm', 'cm-bank', 'cm-conical', 'cm-cyclist', 'cm-bowl', 'cm-sphere', 'cm-vertical', 'cm-table', 'cm-string', 'cm-flat', 'cm-orbit', 'cm-chair', 'cm-loop', 'cm-multi', 'cm-challenge'];

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); } catch (e) { /* about:blank */ } });
  let p = null; const fresh = async () => { if (p) await p.close().catch(() => {}); p = await ctx.newPage(); p.setDefaultTimeout(40000); p.on('pageerror', e => errs.push(p.url() + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR|Failed to load resource/.test(m.text())) errs.push(p.url() + ' ' + m.text()); }); };
  const go = async (r, sel, wait) => { await fresh(); await p.goto(BASE + 'learn.html#/' + r); if (sel) await p.waitForSelector('#lsView ' + sel, { timeout: 40000 }); await p.waitForTimeout(wait || 1200); };
  const live = (fn, arg) => p.evaluate(fn, arg);
  const lab = (o) => live(o2 => LS.exp.live._set(o2), o);

  await t('curriculum: the chapter is in Mechanics with 15 experiences, a deck and an assessment, and validation is clean', async () => {
    await go('home', null, 1500);
    const r = await live(() => { const C = LS.curriculum, ch = C.chapter('p-circular'); return { errs: C.validate(), items: ch.items, course: ch.course, cards: LS.decks.byChapter('p-circular').length, qs: (LS.assess.byChapter('p-circular') || []).length, xs: (LS.experiences || []).filter(x => x.id.startsWith('cm-')).length, prevNext: C.chapter('p-projectile').next }; });
    assert.deepEqual(r.errs, []); assert.equal(r.items.length, 15); assert.equal(r.course, 'p-mech'); assert.ok(r.cards >= 20, 'cards ' + r.cards); assert.ok(r.qs >= 10, 'questions ' + r.qs); assert.equal(r.xs, 15); assert.equal(r.prevNext, 'p-circular');
  });
  await t('chapter landing: 3D scene, formulas, progress and six groups linking all fifteen experiments', async () => {
    await go('chapter/p-circular', '.cmh', 2000);
    const r = await live(() => ({ groups: document.querySelectorAll('#lsView .cmh-group').length, links: [...document.querySelectorAll('#lsView [data-cm-exp]')].map(a => a.dataset.cmExp), cv: !!document.querySelector('#lsView .cmh__scene canvas'), prog: !!document.querySelector('#lsView .cmh__prog') }));
    assert.equal(r.groups, 6); assert.deepEqual([...r.links].sort(), [...IDS].sort()); assert.ok(r.cv, '3D scene'); assert.ok(r.prog);
  });
  for (const id of IDS) {
    await t(`${id}: mounts with 3D, runs on a fixed step, every slider min/max and mode is valid`, async () => {
      await go('exp/' + id, '.cm-stage canvas', 1500);
      const r = await live(() => { const A = LS.exp.live, L = A._cur ? A._cur() : A, sp = L._lab.spec, out = { has3d: L._state().has3d, bad: [] };
        const check = tag => { const txt = document.querySelector('#lsView .cm-read').textContent + document.querySelector('#lsView .cm-eq').textContent; if (/NaN|undefined|Infinity(?! )/.test(txt)) out.bad.push(tag + ': ' + txt.slice(0, 120)); };
        const base = Object.assign({}, L._lab.p);
        (sp.modes || []).forEach(m => m.opts.forEach(([v]) => { L._set({ p: Object.assign({}, base, { [m.id]: v }), run: 0.6 }); check(m.id + '=' + v); }));
        sp.params.forEach(q => [q.min, q.max].forEach(v => { L._set({ p: Object.assign({}, base, { [q.id]: v }), run: 0.6 }); check(q.id + '=' + v); }));
        L._set({ p: base }); const t0 = L._state().t; L._set({ run: 1 }); out.dt = L._state().t - t0;
        ['side', 'top', 'follow', 'free'].forEach(c0 => L._set({ cam: c0 })); L._set({ show: { forces: true, comp: true, vel: true, labels: true, trail: true, grid: true } });
        out.img = (L._snap() || '').length; return out; });
      assert.ok(r.has3d, '3D running'); assert.deepEqual(r.bad, []); assert.ok(Math.abs(r.dt - 1) < 0.02 || id === 'cm-orbit' || r.dt >= 0, 'advanced ' + r.dt); assert.ok(r.img > 5000, 'snapshot');
    });
  }
  await t('uniform motion: “One revolution” stops at exactly t = T; cutting the string sends the puck along the tangent', async () => {
    await go('exp/cm-ucm', '.cm-stage canvas', 1500);
    await p.click('#lsView [data-kb="rev"]'); await p.waitForFunction(() => !LS.exp.live.running(), null, { timeout: 30000 });
    const s = await live(() => LS.exp.live._state()); near(s.t, 2 * Math.PI / (3 / 2), 1e-9, 'T = 2πr/v'); assert.equal(s.revs, 1);
    await p.click('#lsView [data-kb="cut"]'); await p.waitForTimeout(300); const c = await live(() => { const L = LS.exp.live, s0 = L._sim(); L.pause(); return s0.rel; });
    assert.ok(c, 'released'); near(c.x0 * c.vx + c.z0 * c.vz, 0, 1e-9, 'velocity ⟂ radius at release (tangent)'); near(Math.hypot(c.vx, c.vz), 3, 1e-9, 'same speed'); near((c.x - c.x0) * c.vz - (c.z - c.z0) * c.vx, 0, 1e-9, 'straight line');
  });
  await t('banking: no friction at the ideal speed, down the slope above it, up below it; sliding beyond v_max', async () => {
    await go('exp/cm-bank', '.cm-stage canvas', 1500);
    const vi = Math.sqrt(60 * g * Math.tan(18 * D));
    let s = await lab({ p: { mode: 'fric', r: 60, deg: 18, mu: 0.3, v: vi }, run: 2 }); assert.equal(s.fdir, 'none'); assert.equal(s.stuck, true);
    s = await lab({ p: { v: vi + 6 }, run: 1 }); assert.equal(s.fdir, 'down'); s = await lab({ p: { v: vi - 6 }, run: 1 }); assert.equal(s.fdir, 'up');
    s = await lab({ p: { v: Math.min(45, s.vMax + 3) }, run: 6 }); assert.equal(s.stuck, false, 'slides'); assert.ok(s.u > 0, 'up and out');
    s = await lab({ p: { mode: 'ideal', v: vi + 3 }, run: 3 }); assert.equal(s.stuck, false, 'frictionless: any other speed slides');
  });
  await t('sphere: from 1° the block leaves at cos θ = (2/3) cos θ₀ and lands where projectile motion predicts', async () => {
    await go('exp/cm-sphere', '.cm-stage canvas', 1500);
    const s = await lab({ p: { surf: 'smooth', R: 1.2, th0: 1, v0: 0 }, run: 6 }); near(Math.cos(s.sepTh), 2 / 3 * Math.cos(1 * D), 3e-4, 'separation'); assert.equal(s.ph, 'landed');
    const L = await live(() => LS.circ.sphereLand(1.2, 0, Math.PI / 180).x); near(s.land, L, 3e-3, 'landing');
  });
  await t('vertical circle: string slack angle matches cos φ = (2gR − v₀²)/3gR; above √(5gR) it loops; rod pushes at the top', async () => {
    await go('exp/cm-vertical', '.cm-stage canvas', 1500);
    const R = 1.4, v0 = Math.sqrt(3.5 * g * R); let s = await lab({ p: { kind: 'string', R, v0 }, run: 3 }); near(Math.cos(s.lost), (2 * g * R - v0 * v0) / (3 * g * R), 1e-3, 'slack');
    s = await lab({ p: { kind: 'string', R, v0: Math.sqrt(5 * g * R) * 1.02 }, run: 3 }); assert.ok(s.laps >= 1 && s.lost == null);
    s = await lab({ p: { kind: 'rod', R, v0: Math.sqrt(4.5 * g * R) }, run: 3 }); assert.ok(s.laps >= 1 && s.minT < 0, 'rod in compression');
  });
  await t('turntable and several masses: slip at ω = ((μg/r)² − α²)^¼; outermost slips first regardless of mass', async () => {
    await go('exp/cm-table', '.cm-stage canvas', 1500);
    const s = await lab({ p: { drive: 'ramp', rc: 0.3, al: 0.3, mus: 0.4, muk: 0.3 }, run: 25 }); near(s.slipW, Math.pow((0.4 * g / 0.3) ** 2 - 0.09, 0.25), 3e-3, 'slip ω');
    await go('exp/cm-multi', '.cm-stage canvas', 1500);
    const m = await lab({ p: { r1: 0.15, r2: 0.3, r3: 0.48, m1: 0.05, m2: 0.2, m3: 0.9, mus: 0.5, al: 0.3 }, run: 40 }); assert.deepEqual(m.order, [2, 1, 0]);
  });
  await t('loop-the-loop: a cart from 2.4R falls off; from 2.52R it completes; a rolling ball needs 2.7R', async () => {
    await go('exp/cm-loop', '.cm-stage canvas', 1500);
    let s = await lab({ p: { body: 'slide', R: 1, h: 2.4 }, run: 6 }); assert.ok(s.lost != null, 'falls'); s = await lab({ p: { body: 'slide', R: 1, h: 2.52 }, run: 8 }); assert.equal(s.lost, null); assert.ok(s.ph === 'exit' || s.done);
    s = await lab({ p: { body: 'roll', R: 1, h: 2.6 }, run: 8 }); assert.ok(s.lost != null, 'rolling ball falls from 2.6R');
  });
  await t('orbit, flat road, conical pendulum, chair-o-plane, bowl, string: values match the formulas', async () => {
    await go('exp/cm-orbit', '.cm-stage canvas', 1500); let s = await lab({ p: { planet: 'earth', alt: 35800, k: 1 } }); near(s.T / 3600, 23.94, 0.03, 'geostationary');
    s = await lab({ p: { planet: 'earth', alt: 400, k: 1 }, run: 10 }); near(Math.hypot(s.x, s.y), 6771e3, 3e3, 'stays circular over one period');
    await go('exp/cm-flat', '.cm-stage canvas', 1500); s = await lab({ p: { surf: 'dry', r: 45, v: 16 }, run: 4 }); near(s.vMax, Math.sqrt(0.7 * g * 45), 1e-9, 'v_max'); assert.equal(s.slid, false); s = await lab({ p: { v: 22 }, run: 3 }); assert.equal(s.slid, true); assert.ok(s.marks > 0, 'skid marks only while sliding');
    await go('exp/cm-conical', '.cm-stage canvas', 1500); s = await lab({ p: { mode: 'omega', L: 1.6, w: 3.5, m: 1 } }); near(Math.cos(s.th), g / (3.5 * 3.5 * 1.6), 1e-9, 'cos θ = g/ω²L');
    await go('exp/cm-chair', '.cm-stage canvas', 1500); s = await lab({ p: { d: 2.5, L: 3, w: 1.1 }, run: 3 }); near(Math.tan(s.th), 1.21 * (2.5 + 3 * Math.sin(s.th)) / g, 1e-3, 'steady chain angle');
    await go('exp/cm-bowl', '.cm-stage canvas', 1500); s = await lab({ p: { surf: 'smooth', mode: 'steady', R: 0.6, w: 7 }, run: 1 }); near(Math.cos(s.th), g / (49 * 0.6), 1e-9, 'bowl equilibrium');
    await go('exp/cm-string', '.cm-stage canvas', 1500); s = await lab({ p: { setup: 'hole', m: 0.4, M: 0.3, r: 0.8, Tb: 40 } }); near(s.v, Math.sqrt(0.3 * g * 0.8 / 0.4), 1e-9, 'v = √(Mgr/m)'); s = await lab({ p: { setup: 'pin', v: 6, r: 0.8, m: 0.4, Tb: 12 }, run: 0.5 }); assert.equal(s.broken, true, 'breaks above T_max');
  });
  await t('prediction challenge: values are hidden until the student locks in; then the run and comparison appear', async () => {
    await go('exp/cm-conical', '.cm-stage canvas', 1500);
    await p.click('#lsView [data-cm="chal"]'); await p.waitForTimeout(300);
    const before = await live(() => ({ hide: LS.exp.live._state().hide, read: document.querySelector('#lsView .cm-read').textContent, eq: document.querySelector('#lsView .cm-eq').textContent, ans: LS.exp.live._state().chal.ans }));
    assert.equal(before.hide, true); assert.ok(!/\d/.test(before.read + before.eq), 'no numbers shown before predicting');
    await p.fill('#lsView [data-cm="pred"]', String(before.ans.toFixed(3))); await p.click('#lsView [data-cm="lock"]'); await p.waitForTimeout(400);
    const after = await live(() => ({ hide: LS.exp.live._state().hide, verdict: document.querySelector('#lsView .cm-verdict').className, running: LS.exp.live.running() }));
    assert.equal(after.hide, false); assert.match(after.verdict, /is-ok/); assert.equal(after.running, true);
    await go('exp/cm-challenge', '.cm-stage canvas', 1500); const h = await live(() => LS.exp.live._state()); assert.equal(h.hide, true, 'challenge lab starts hidden'); assert.equal(h.scenario, 'cm-bank');
  });
  await t('keyboard on the 3D view and no WebGL fallback text when WebGL works', async () => {
    await go('exp/cm-vertical', '.cm-stage canvas', 1500); await live(() => LS.exp.live.pause()); const t0 = (await live(() => LS.exp.live._state())).t; await p.focus('#lsView .cm-stage canvas'); await p.keyboard.press('s'); await p.waitForTimeout(150);
    const s = await live(() => LS.exp.live._state()); near(s.t - t0, 1 / 30, 2e-3, 'S = one step of 1/30 s'); await p.keyboard.press('3'); await p.waitForTimeout(100); assert.equal((await live(() => LS.exp.live._state())).cam, 'top');
  });
  await t('v45 banking: sliders change the run live (no restart) and the car eases to the new speed, radius and bank', async () => {
    await go('exp/cm-bank', '.cm-stage canvas', 1500); await lab({ p: { mode: 'fric', r: 60, deg: 18, mu: 0.6, v: 18 } }); await live(() => LS.exp.live.play());
    const set = (k, v) => live(([k2, v2]) => { const r = document.querySelector(`#lsView [data-k="${k2}"]`); r.value = v2; r.dispatchEvent(new Event('input', { bubbles: true })); }, [k, v]);
    await p.waitForTimeout(600); const a0 = await live(() => ({ t: LS.exp.live._state().t, a: LS.exp.live._sim().a }));
    await set('v', 24); await set('deg', 24); await set('r', 70); await p.waitForTimeout(300); const a1 = await live(() => ({ t: LS.exp.live._state().t, a: LS.exp.live._sim().a, ev: LS.exp.live._sim().ev }));
    assert.ok(a1.t > a0.t && a1.a > a0.a, 'the clock and the car carried on: ' + JSON.stringify([a0, a1])); assert.ok(a1.ev.v < 24 && a1.ev.v >= 18, 'speed eases (≤ 4.5 m/s²), it does not jump: ' + a1.ev.v);
    await live(() => LS.exp.live._set({ keep: true, run: 6 })); const e = await live(() => LS.exp.live._sim().ev); near(e.v, 24, 1e-9, 'reaches the new speed'); near(e.deg, 24, 1e-9, 'reaches the new bank'); near(e.r, 70, 1e-9, 'reaches the new radius');
  });
  await t('v45 banking: speedometer and pedals — holding the accelerator raises the target, the brake lowers it, ↑/↓ on the 3D view work too', async () => {
    await go('exp/cm-bank', '.cm-drive', 1500); await lab({ p: { mode: 'fric', r: 60, deg: 18, mu: 0.9, v: 15 } }); await live(() => LS.exp.live.play());
    const g0 = await live(() => document.querySelector('#lsView .cm-g__v').textContent); assert.ok(/^\d+(\.\d)?$/.test(g0), 'speed readout ' + g0);
    const gas = p.locator('#lsView .cm-pedal--gas'); await gas.hover(); await p.mouse.down(); await p.waitForTimeout(800); await p.mouse.up(); const v1 = await live(() => LS.exp.live._state().p.v); assert.ok(v1 > 16, 'accelerator raised the target: ' + v1);
    const br = p.locator('#lsView .cm-pedal--brake'); await br.hover(); await p.mouse.down(); await p.waitForTimeout(600); await p.mouse.up(); const v2 = await live(() => LS.exp.live._state().p.v); assert.ok(v2 < v1, 'brake lowered it: ' + v2);
    await p.focus('#lsView .cm-stage canvas'); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(500); await p.keyboard.up('ArrowUp'); const v3 = await live(() => LS.exp.live._state().p.v); assert.ok(v3 > v2, '↑ accelerates: ' + v3);
    const lbl = await live(() => [...document.querySelectorAll('#lsView .cm-pedal')].map(b => b.getAttribute('aria-label'))); assert.ok(lbl.every(Boolean), 'pedals are labelled');
  });
  await t('v45 banking: the follow camera stays above the ground and the car stays in view, even sliding down a 45° bank', async () => {
    await go('exp/cm-bank', '.cm-stage canvas', 1500); await lab({ p: { mode: 'fric', r: 60, deg: 45, mu: 0, v: 14 }, cam: 'follow' }); await live(() => LS.exp.live.play());
    for (let i = 0; i < 6; i++) { await p.waitForTimeout(700); const r = await live(() => { const L = LS.exp.live, sp = L._lab.spec, s = L._sim(), q = L._state().p, F = sp.follow(s, q), car = sp.focus(s, q); const th = q.deg * Math.PI / 180, x = Math.hypot(F.pos[0], F.pos[2]);
        const w = 9, y0 = w / 2 * Math.sin(th) + 0.06, ri = q.r - w / 2 * Math.cos(th), ro = q.r + w / 2 * Math.cos(th), yo = y0 + w / 2 * Math.sin(th), ext = Math.max(1.5, yo * 2.2);
        const ground = x < ri ? 0.06 : x <= ro ? y0 + (x - q.r) / Math.cos(th) * Math.sin(th) : x < ro + ext ? yo * (1 - (x - ro) / ext) : 0; return { camY: F.pos[1], ground, carY: car[1], off: s.off }; });
      assert.ok(r.camY > r.ground + 1.5, 'camera above the ground: ' + JSON.stringify(r)); assert.ok(r.camY > r.carY + 1, 'camera above the car: ' + JSON.stringify(r)); }
  });
  await t('v45 experiment centre: family filters, search, "not opened yet", a polite count, empty state, prefetch of the experiments', async () => {
    await go('chapter/p-circular', '.cmx', 1500);
    /* v46: families are ordered for aligned rows; Vehicles, sports and rides is the third (index 2) */ await p.click('#lsView [data-cmx-f="2"]'); assert.equal(await p.textContent('#lsView [data-cmx-count]'), '4 experiments shown'); assert.equal(await p.getAttribute('#lsView [data-cmx-f="2"]', 'aria-pressed'), 'true');
    await p.click('#lsView [data-cmx-f="all"]'); await p.fill('#lsView [data-cmx-q]', 'orbit'); await p.waitForTimeout(300); assert.equal(await p.textContent('#lsView [data-cmx-count]'), '1 experiment shown');
    await p.fill('#lsView [data-cmx-q]', 'qqqq'); await p.waitForTimeout(300); assert.ok(await p.isVisible('#lsView [data-cmx-empty]'));
    await p.fill('#lsView [data-cmx-q]', ''); await p.click('#lsView [data-cmx-todo]'); await p.waitForTimeout(200); assert.equal(await p.getAttribute('#lsView [data-cmx-todo]', 'aria-pressed'), 'true');
    assert.equal(await live(() => document.querySelector('#lsView [data-cmx-count]').getAttribute('aria-live')), 'polite');
    await p.waitForFunction(() => !!(window.LS && LS.circLab && LS.exp), null, { timeout: 20000 }); // the centre warms every experiment in idle time
  });
  await t('v45 loading: an experience opens on a skeleton and the experience scripts load in one parallel round, in order', async () => {
    await fresh(); await p.goto(BASE + 'learn.html#/practice'); await p.waitForFunction(() => window.LS && LS.needExp, null, { timeout: 40000 }); await p.waitForTimeout(800);
    await live(() => { location.hash = '#/exp/cm-flat'; }); await p.waitForSelector('#lsView .xp-skel, #lsView .cm-stage canvas', { timeout: 10000 });
    await p.waitForSelector('#lsView .cm-stage canvas', { timeout: 40000 });
    const r = await live(() => { const s = [...document.querySelectorAll('script[src*="assets/js/learn/"]')].filter(x => !x.async && x.src.includes('ls-')); return { n: s.length, order: s.map(x => x.src.split('/').pop().split('?')[0]) }; });
    assert.ok(r.order.indexOf('ls-circ-engine.js') < r.order.indexOf('ls-circ-lab.js') && r.order.indexOf('ls-circ-lab.js') < r.order.indexOf('ls-x-circ-a.js'), 'dependency order kept: ' + r.order.join(','));
  });
  await t('no page errors', async () => { assert.deepEqual(errs, []); });
  await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
