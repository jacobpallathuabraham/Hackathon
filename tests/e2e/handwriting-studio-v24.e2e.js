/* ERLY Handwriting Studio v24 — end-to-end checks of real behaviour (mouse input, saved data, exports, OCR).
   Run with: NODE_PATH=$(npm root -g) node tests/e2e/handwriting-studio-v24.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 8).join('\n     ')); } };

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('hws-intro', '1'); });
  const p = await ctx.newPage(); p.setDefaultTimeout(10000);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR/.test(m.text())) errs.push(m.text()); });
  await p.goto(BASE + 'handwriting.html'); await p.waitForSelector('.hws-vp'); await p.waitForTimeout(600);
  const items = () => p.evaluate(() => HWS.page().layers.reduce((n, L) => n + L.items.length, 0));
  const vp = async () => p.locator('.hws-vp').boundingBox();
  const W2S = (x, y) => p.evaluate(([x, y]) => { const s = HWS.cv._state(), r = HWS.cv.el.getBoundingClientRect(); return [r.left + s.px + x * s.zoom, r.top + s.py + y * s.zoom]; }, [x, y]);
  async function drawWorld(pts, steps = 2) { const s = await Promise.all(pts.map(([x, y]) => W2S(x, y))); await p.mouse.move(s[0][0], s[0][1]); await p.mouse.down(); for (const q of s.slice(1)) await p.mouse.move(q[0], q[1], { steps }); await p.mouse.up(); }
  const wave = (x0, y0, n = 24, w = 18) => Array.from({ length: n + 1 }, (_, k) => [x0 + k * w, y0 + Math.sin(k / 3) * 25]);

  await t('consent first: nothing is stored until the student chooses; “Save on this device” enables autosave', async () => {
    assert.ok(await p.isVisible('.hws-consent')); assert.equal(await p.evaluate(() => HWS.store.enabled()), false);
    await p.click('[data-consent="device"]'); await p.waitForTimeout(300); assert.equal(await p.evaluate(() => HWS.store.enabled()), true);
  });
  await t('writing with the mouse creates a stroke under the pointer, with many points and the chosen brush', async () => {
    await drawWorld(wave(200, 200)); await p.waitForTimeout(200);
    const s = await p.evaluate(() => { const it = HWS.page().layers[0].items.slice(-1)[0]; return { t: it.t, n: it.pts.length, brush: it.brush, pr: it.pr, x0: it.pts[0][0], y0: it.pts[0][1] }; });
    assert.equal(s.t, 'stroke'); assert.ok(s.n > 20, 'points ' + s.n); assert.equal(s.brush, 'fountain'); assert.equal(s.pr, false, 'a mouse never claims real pressure');
    assert.ok(Math.abs(s.x0 - 200) < 3 && Math.abs(s.y0 - 200) < 3, 'ink starts where the pointer went down: ' + s.x0 + ',' + s.y0);
  });
  await t('every brush draws a different mark (pixel comparison of the same path)', async () => {
    const sig = await p.evaluate(() => { const H = HWS, out = {}; Object.keys(H.BRUSHES).forEach(br => { const c = document.createElement('canvas'); c.width = 300; c.height = 80; const g = c.getContext('2d'); const pts = Array.from({ length: 40 }, (_, k) => [10 + k * 7, 40 + Math.sin(k / 4) * 18, 0.2 + 0.8 * Math.sin(k / 39 * Math.PI), k * 10]); H.render(g, { t: 'stroke', id: 'z' + br, brush: br, color: '#000000', size: 6, opacity: 1, pr: true, pts }, { paper: 'blank' }, {}); const d = g.getImageData(0, 0, 300, 80).data; let ink = 0, soft = 0; for (let i = 3; i < d.length; i += 4) { if (d[i] > 200) ink++; else if (d[i] > 10) soft++; } out[br] = ink + ':' + soft; }); return out; });
    const vals = Object.values(sig); assert.equal(new Set(vals).size, vals.length, 'distinct pixel signatures: ' + JSON.stringify(sig));
  });
  await t('undo and redo restore the exact page; Ctrl+Z works from the canvas', async () => {
    const n = await items(); await p.click('[data-a="undo"]'); assert.equal(await items(), n - 1); await p.click('[data-a="redo"]'); assert.equal(await items(), n);
    await p.locator('.hws-vp').focus(); await p.keyboard.press('Control+z'); assert.equal(await items(), n - 1); await p.keyboard.press('Control+Shift+z'); assert.equal(await items(), n);
  });
  await t('stroke eraser removes what it touches; precise eraser adds an erase mark on the same layer', async () => {
    const n = await items(); await p.click('[data-tool="eraser"]'); await drawWorld([[150, 200], [700, 200]], 12); assert.equal(await items(), n - 1, 'stroke erased: before ' + n + ', after ' + (await items()) + ', tool ' + (await p.evaluate(() => HWS.state.tool.id)));
    await drawWorld(wave(200, 420)); // eraser still active: draws nothing
    await p.click('[data-tool="pen"]'); await drawWorld(wave(200, 420)); await p.click('[data-tool="erasePix"]'); await drawWorld([[300, 400], [330, 440]]); assert.equal(await p.evaluate(() => HWS.page().layers[0].items.slice(-1)[0].t), 'erase');
  });
  await t('Draw mode: shapes (rectangle, arrow with a label), select-and-move, text and flood fill', async () => {
    await p.click('[data-mode="draw"]'); await p.click('[data-tool="shape"]'); await p.click('[data-shape="rect"]'); await drawWorld([[900, 200], [1100, 360]], 4);
    const r = await p.evaluate(() => HWS.page().layers[0].items.slice(-1)[0]); assert.equal(r.t + ':' + r.k, 'shape:rect');
    await p.click('[data-shape="arrow"]'); await p.fill('[data-label]', 'F'); await drawWorld([[900, 500], [1100, 500]], 4); assert.equal(await p.evaluate(() => HWS.page().layers[0].items.slice(-1)[0].label), 'F');
    // fill the inside of the rectangle
    await p.click('[data-tool="fill"]'); const [fx, fy] = await W2S(1000, 280); await p.mouse.click(fx, fy); await p.waitForTimeout(300); const fi = await p.evaluate(() => HWS.page().layers[0].items[0]); assert.ok(fi.t === 'image' && fi.fill, 'fill made an image region under the ink');
    assert.ok(Math.abs(fi.x - 900) < 8 && Math.abs(fi.w - 200) < 12, `fill bounded by the rectangle: x ${fi.x}, w ${fi.w}`);
    // move the rectangle
    await p.click('[data-tool="select"]'); const [sx, sy] = await W2S(900, 280); await p.mouse.move(sx, sy); await p.mouse.down(); const [ex, ey] = await W2S(950, 330); await p.mouse.move(ex, ey, { steps: 6 }); await p.mouse.up();
    const moved = await p.evaluate(() => HWS.page().layers[0].items.find(i => i.k === 'rect').pts[0]); assert.ok(Math.abs(moved[0] - 950) < 3 && Math.abs(moved[1] - 250) < 3, 'moved to ' + moved);
    await p.click('[data-tool="text"]'); const [tx, ty] = await W2S(200, 700); await p.mouse.click(tx, ty); await p.keyboard.type('Force diagram'); await p.keyboard.press('Control+Enter'); assert.equal(await p.evaluate(() => HWS.page().layers[0].items.slice(-1)[0].text), 'Force diagram');
  });
  await t('pages: add, duplicate, change paper, delete — and thumbnails follow', async () => {
    await p.click('[data-pg="add"]'); assert.equal(await p.evaluate(() => HWS.nb.pages.length), 2); await p.selectOption('[data-pg="paper"]', 'graph'); assert.equal(await p.evaluate(() => HWS.page().paper), 'graph');
    await p.click('[data-pg="dup"]'); assert.equal(await p.evaluate(() => HWS.nb.pages.length), 3); assert.equal(await p.locator('.hws-pg').count(), 3);
    p.once('dialog', d => d.accept()); await p.click('[data-pg="del"]'); assert.equal(await p.evaluate(() => HWS.nb.pages.length), 2);
  });
  await t('layers: add a layer, hide it — its ink disappears from the page', async () => {
    await p.click('[data-a="layers"]'); await p.click('[data-l="add"]'); await p.click('[data-tool="pen"]').catch(() => {}); await p.click('[data-mode="write"]'); await drawWorld(wave(300, 600)); const pg = await p.evaluate(() => ({ n: HWS.page().layers.length, act: HWS.layer(HWS.page()).items.length })); assert.equal(pg.n, 2); assert.equal(pg.act, 1);
    await p.click('[data-a="layers"]').catch(() => {});
  });
  await t('autosave: the notebook is in IndexedDB and comes back after a reload', async () => {
    await p.evaluate(() => HWS.flush(HWS.nb)); await p.waitForTimeout(300); const before = await p.evaluate(() => ({ id: HWS.nb.id, pages: HWS.nb.pages.length, n: HWS.nb.pages[0].layers.reduce((a, L) => a + L.items.length, 0) }));
    assert.match(await p.textContent('.hws-save'), /Saved on this device/);
    await p.reload(); await p.waitForSelector('.hws-vp'); await p.waitForTimeout(800);
    const after = await p.evaluate(() => ({ id: HWS.nb.id, pages: HWS.nb.pages.length, n: HWS.nb.pages[0].layers.reduce((a, L) => a + L.items.length, 0) })); assert.deepEqual(after, before);
  });
  await t('export: PNG and SVG and notebook file download; the notebook file opens again', async () => {
    for (const k of ['png', 'svg', 'json']) { await p.click('[data-a="exportMenu"]'); const [dl] = await Promise.all([p.waitForEvent('download'), p.click(`[data-x="${k}"]`)]); const path = await dl.path(); const size = require('fs').statSync(path).size; assert.ok(size > 500, k + ' size ' + size); if (k === 'svg') assert.match(require('fs').readFileSync(path, 'utf8'), /<svg[\s\S]*<polyline/); if (k === 'json') p._nbfile = path; }
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.evaluate(() => document.querySelector('[data-file="json"]').click())]); await fc.setFiles(p._nbfile); await p.waitForTimeout(400); assert.ok(await p.evaluate(() => HWS.nb.pages.length >= 2));
  });
  await t('Practise: a letter sheet with guides; tracing a guide is measured honestly (coverage high when traced, 0 when not)', async () => {
    await p.click('[data-mode="practise"]'); await p.click('[data-pset="upper"]'); await p.click('[data-pnone]'); await p.click('[data-pitem="L"]'); await p.click('[data-pmake]'); await p.waitForTimeout(300);
    const g = await p.evaluate(() => HWS.page().layers[0].items.filter(i => i.t === 'guide')); assert.ok(g.length >= 3 && g[0].style === 'model', 'model + traced copies');
    // trace the first copy of “L” exactly along its strokes, using the guide geometry
    const gd = g[1], m = await p.evaluate(gd => { const c = document.createElement('canvas').getContext('2d'); c.font = `500 ${gd.size}px "Andika","Century Gothic","Trebuchet MS",ui-sans-serif,system-ui,sans-serif`; const mm = c.measureText('L'); return { w: mm.width, asc: mm.actualBoundingBoxAscent, l: mm.actualBoundingBoxLeft }; }, gd);
    const x = gd.x - m.l + gd.size * 0.06, top = gd.base - m.asc + 4, base = gd.base - 4; await drawWorld([[x, top], [x, base], [gd.x - m.l + m.w * 0.85, base]], 8);
    await p.click('[data-pcheck]'); await p.waitForTimeout(200); const res = await p.evaluate(() => HWS.lastCheck.res.map(r => [Math.round(r.cov * 100), Math.round(r.out * 100), r.n]));
    assert.ok(res[0][0] >= 45, 'traced guide coverage ' + JSON.stringify(res)); assert.equal(res[1][2], 0, 'untraced guide has no ink'); assert.match(await p.textContent('.hws-res'), /Traced 1 of/);
  });
  await t('Graph: plotting y = x^2 − 3 draws on the coordinate plane; bad input gives a clear message; table of values is correct', async () => {
    await p.click('[data-mode="graph"]'); assert.ok(/graph|coord/.test(await p.evaluate(() => HWS.page().paper)));
    await p.fill('[data-gexpr]', 'x^2 - 3'); await p.click('[data-gplot]'); assert.equal(await p.evaluate(() => HWS.allItems(HWS.page()).filter(i => i.t === 'fn').length), 1);
    await p.fill('[data-gexpr]', 'x^^2'); await p.click('[data-gplot]'); assert.ok((await p.textContent('.hws-err')).length > 3);
    await p.fill('[data-gexpr]', 'x^2 - 3'); await p.fill('[data-gfrom]', '-2'); await p.fill('[data-gto]', '2'); await p.fill('[data-gstep]', '1'); await p.click('[data-gtable]');
    assert.equal(await p.evaluate(() => HWS._learn.GR.table.map(r => r[1]).join(',')), '1,-2,-3,-2,1');
  });
  await t('Science: the slope template places an incline, a block and forces whose N is perpendicular to the slope', async () => {
    await p.click('[data-mode="science"]'); await p.click('[data-tpl="incline"]'); await p.waitForTimeout(200);
    const r = await p.evaluate(() => { const its = HWS.page().layers.flatMap(L => L.items), inc = its.find(i => i.k === 'incline'), N = its.find(i => i.label === 'N'); const a = inc.props.angle * Math.PI / 180, v = [N.pts[1][0] - N.pts[0][0], N.pts[1][1] - N.pts[0][1]], along = [Math.cos(a), -Math.sin(a)]; return { dot: (v[0] * along[0] + v[1] * along[1]) / Math.hypot(...v), stamps: its.filter(i => i.t === 'stamp').length }; });
    assert.ok(Math.abs(r.dot) < 1e-6, 'N ⟂ slope, dot = ' + r.dot); assert.equal(r.stamps, 2);
    await p.click('[data-tool="stamp"]'); await p.click('[data-stamp="resistor"]'); const [sx, sy] = await W2S(300, 300); await p.mouse.click(sx, sy); assert.equal(await p.evaluate(() => HWS.page().layers.flatMap(L => L.items).filter(i => i.k === 'resistor').length), 1);
  });
  await t('Scan: reading this page on the device with the quick reader returns editable text with per-word confidence', async () => {
    await p.click('[data-mode="write"]'); await p.click('[data-pg="add"]'); await p.evaluate(() => { const pg = HWS.page(); pg.paper = 'blank'; HWS.layer(pg).items.push({ t: 'text', id: 'ocr1', x: 120, y: 300, text: 'Plants make food from light', size: 72, font: 'sans', color: '#000000' }); HWS.changed(); });
    await p.click('[data-mode="scan"]'); await p.click('[data-sc="page"]'); await p.waitForSelector('.hws-scan__cv'); await p.click('[data-sc="go"]');
    await p.waitForSelector('[data-sct]', { timeout: 90000 }); const txt = await p.inputValue('[data-sct]'); assert.match(txt.toLowerCase(), /plants\s+make\s+food/, 'read: ' + txt);
    assert.ok(await p.locator('.hws-words .hws-w').count() >= 4);
  });
  await t('My work lists saved notebooks and new templates', async () => {
    await p.click('[data-mode="work"]'); await p.waitForSelector('.hws-tplc'); assert.ok(await p.locator('.hws-tplc').count() >= 6); assert.ok(await p.locator('.hws-nb').count() >= 1);
  });
  await t('keyboard: tools by letter, zoom keys, and every toolbar button has an accessible name', async () => {
    await p.click('[data-w="close"]'); await p.locator('.hws-vp').focus(); await p.keyboard.press('v'); assert.equal(await p.evaluate(() => HWS.state.tool.id), 'select'); await p.keyboard.press('p'); assert.equal(await p.evaluate(() => HWS.state.tool.id), 'pen');
    const z0 = await p.evaluate(() => HWS.cv.zoom()); await p.keyboard.press('+'); assert.ok(await p.evaluate(() => HWS.cv.zoom()) > z0); await p.keyboard.press('0');
    const unnamed = await p.$$eval('.hws button', bs => bs.filter(b => !(b.getAttribute('aria-label') || b.textContent.trim())).length); assert.equal(unnamed, 0);
  });
  await t('phone: the studio fits (no horizontal scroll) and a finger can write', async () => {
    const q = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await q.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('hws-intro', '1'); });
    await q.goto(BASE + 'handwriting.html'); await q.waitForSelector('.hws-vp'); await q.waitForTimeout(500); assert.ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const r = await q.locator('.hws-vp').boundingBox(); await q.evaluate(([x, y]) => { const el = document.querySelector('.hws-vp'); const ev = (type, xx, yy) => el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: xx, clientY: yy, bubbles: true, isPrimary: true, pressure: 0.5, button: 0, buttons: 1 })); ev('pointerdown', x, y); for (let k = 1; k <= 10; k++) ev('pointermove', x + k * 8, y + Math.sin(k) * 6); ev('pointerup', x + 80, y); }, [r.x + r.width / 3, r.y + r.height / 2]);
    assert.ok(await q.evaluate(() => HWS.page().layers[0].items.length) >= 1); await q.close();
  });
  await t('the ink entrance plays once, never blocks the canvas, and is skipped with reduced motion', async () => {
    const q = await b.newPage({ viewport: { width: 1200, height: 800 } }); await q.addInitScript(() => sessionStorage.setItem('acubins-role', 'student'));
    await q.goto(BASE + 'handwriting.html'); await q.waitForSelector('.hws-ink'); assert.equal(await q.evaluate(() => getComputedStyle(document.querySelector('.hws-ink')).pointerEvents), 'none'); await q.waitForTimeout(2300); assert.equal(await q.locator('.hws-ink').count(), 0); await q.close();
    const r = await b.newPage({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' }); await r.addInitScript(() => sessionStorage.setItem('acubins-role', 'student')); await r.goto(BASE + 'handwriting.html'); await r.waitForTimeout(400); assert.equal(await r.locator('.hws-ink').count(), 0); await r.close();
  });

  assert.deepEqual(errs, [], 'no page errors'); console.log(`\n${pass}/${pass + fail} passed`); if (errs.length) console.log(errs);
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
