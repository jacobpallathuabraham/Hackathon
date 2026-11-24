// v34 interaction measurements in headless Chromium (no GPU on this machine; SVG and CSS are rasterised on the CPU, so these
// are a conservative floor, not a statement about any particular laptop). Writes docs/bench/v34-perf.json.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tools/perf-v34.js
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const stats = a => { const s = a.slice().sort((x, y) => x - y), q = f => +s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(1); return { n: s.length, median: q(0.5), p95: q(0.95), max: +s[s.length - 1].toFixed(1) }; };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); });
  const p = await c.newPage(); const rows = {};
  const frames = (fn, ms) => p.evaluate(async ([src, ms]) => { const out = []; let last = performance.now(), on = true; const tick = t => { out.push(t - last); last = t; if (on) requestAnimationFrame(tick); }; requestAnimationFrame(tick); await (0, eval)(src)(); await new Promise(r => setTimeout(r, ms)); on = false; return out.slice(1); }, [fn, ms]);
  await p.goto(BASE + 'learn.html#/explore'); await p.waitForFunction(() => window.LS && LS.curriculum);
  // route render cost (synchronous work of the route function), 5 runs each
  const route = async h => { const t = []; for (let i = 0; i < 5; i++) { await p.evaluate(() => { location.hash = '#/explore'; }); await p.waitForTimeout(300); t.push(await p.evaluate(h => { const t0 = performance.now(); location.hash = '#/' + h; return new Promise(r => requestAnimationFrame(() => r(performance.now() - t0))); }, h)); await p.waitForTimeout(400); } return stats(t); };
  rows.routeKnowledgeMap = await route('constellation'); rows.routeSubjectPhysics = await route('world/physics'); rows.routeFlashcards = await route('cards/p-waves/learn'); rows.routeAssessment = await route('assess/p-waves');
  await p.evaluate(() => { location.hash = '#/constellation'; }); await p.waitForSelector('.km__svg'); await p.waitForTimeout(600);
  rows.mapFocusSubjectFrames = stats(await frames("() => LS.__constellation.select({ type: 'subject', id: 'physics' })", 700));
  rows.mapFocusChapterFrames = stats(await frames("() => LS.__constellation.select({ type: 'chapter', ch: 'p-waves' })", 700));
  rows.mapOverviewFrames = stats(await frames("() => LS.__constellation.select(null)", 700));
  rows.mapNodes = await p.evaluate(() => document.querySelectorAll('.km__svg *').length);
  await p.evaluate(() => { location.hash = '#/world/physics'; }); await p.waitForSelector('.uv-tabs'); await p.waitForTimeout(600);
  rows.tabSwitchMs = stats(await p.evaluate(async () => { const out = []; for (const k of ['chapters', 'experiences', 'practice', 'cards', 'assess', 'overview', 'chapters', 'experiences']) { const t0 = performance.now(); document.querySelector(`[data-wt="${k}"]`).click(); await new Promise(r => requestAnimationFrame(r)); out.push(performance.now() - t0); await new Promise(r => setTimeout(r, 350)); } return out; }));
  await p.evaluate(() => { location.hash = '#/cards/p-waves/learn'; }); await p.waitForSelector('.fc3__card'); await p.waitForTimeout(500);
  rows.flipFrames = stats(await frames("() => document.querySelector('.fc3__card').click()", 800));
  rows.nextCardFrames = stats(await frames("() => document.querySelector('[data-next]').click()", 600));
  rows.heapMB = await p.evaluate(() => performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null);
  const out = { when: new Date().toISOString(), browser: 'Chromium (Playwright) ' + b.version() + ', headless, software rendering, 1440×900', note: 'frame intervals in ms (16.7 = 60 fps); route = time from hash change to the next frame', rows };
  fs.mkdirSync(path.join(__dirname, '../docs/bench'), { recursive: true }); fs.writeFileSync(path.join(__dirname, '../docs/bench/v34-perf.json'), JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
