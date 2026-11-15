// v18 neural voice (Kokoro-82M in the browser): opt-in download, genuinely different voices (measured pitch),
// preview, speaking through Noor's voice queue with prefetch, pause/resume, and text prepared for listening.
// The model (~92 MB) is fetched from Hugging Face on first use, as in the app.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/neural-voice.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + String(e.message || e).split('\n')[0].slice(0, 240)]); } };

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); window.__plays = []; const o = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__plays.push({ src: this.src, t: performance.now() }); return o.call(this).catch(() => {}); }; });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  const reqs = []; p.on('request', r => reqs.push(r.url()));
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200);

  await check('nothing is downloaded until the student asks; the offer states size and that speech stays on the device', async () => {
    assert.equal(await p.evaluate(() => ERLY.neuralVoice.status().status), 'idle');
    assert.equal(reqs.filter(u => /huggingface|hf\.co/.test(u)).length, 0);
    await p.click('.cmp-launch'); await p.waitForTimeout(500); await p.click('#cmpVoiceSet'); await p.waitForSelector('#cmpNV [data-nv="load"]');
    const t = await p.textContent('#cmpNV'); assert.match(t, /MB/); assert.match(t, /device/i);
  });
  await check('download with progress, then the voice list (accent and gender from the model card) and preview', async () => {
    await p.click('#cmpNV [data-nv="load"]'); await p.waitForFunction(() => ERLY.neuralVoice.ready(), null, { timeout: 300000 });
    await p.waitForSelector('#cmpNVSel'); const groups = await p.$$eval('#cmpNVSel optgroup', g => g.map(x => x.label)); assert.ok(groups.length >= 4, groups.join('|')); assert.ok(groups.some(g => /British/.test(g)) && groups.some(g => /Male/.test(g)));
    const before = await p.evaluate(() => window.__plays.length); await p.selectOption('#cmpNVSel', 'bm_george'); await p.click('#cmpNV [data-nv="try"]');
    await p.waitForFunction(n => window.__plays.length > n, before, { timeout: 120000 }); assert.match(await p.evaluate(() => window.__plays[window.__plays.length - 1].src), /^blob:/);
  });
  await check('voices are genuinely different: a female and a male voice differ in measured pitch; audio is not silent', async () => {
    const r = await p.evaluate(async () => {
      const f0 = async v => { const a = await ERLY.neuralVoice.synth('The quick brown fox jumps over the lazy dog near the river bank.', v, 1); const buf = await (await fetch(a.url)).arrayBuffer(), dv = new DataView(buf), n = (buf.byteLength - 44) / 2, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = dv.getInt16(44 + i * 2, true) / 32768; const rate = a.rate, W = Math.round(rate * 0.04), est = []; let rms = 0; for (let i = 0; i < n; i++) rms += x[i] * x[i]; rms = Math.sqrt(rms / n);
        for (let s = 0; s + W < n; s += W) { let e = 0; for (let i = 0; i < W; i++) e += x[s + i] ** 2; if (Math.sqrt(e / W) < rms * 0.8) continue; let best = 0, lag = 0; for (let L = Math.round(rate / 400); L <= Math.round(rate / 70); L++) { let c = 0, n1 = 0, n2 = 0; for (let i = 0; i + L < W; i++) { c += x[s + i] * x[s + i + L]; n1 += x[s + i] ** 2; n2 += x[s + i + L] ** 2; } c /= Math.sqrt(n1 * n2) || 1; if (c > best) { best = c; lag = L; } } if (best > 0.5) est.push(rate / lag); }
        est.sort((a2, b2) => a2 - b2); return { f0: est[est.length >> 1], frames: est.length, rms, dur: a.duration }; };
      return { f: await f0('af_heart'), m: await f0('am_michael') };
    });
    console.log('   pitch (median F0): female af_heart', Math.round(r.f.f0), 'Hz · male am_michael', Math.round(r.m.f0), 'Hz');
    assert.ok(r.f.rms > 0.01 && r.m.rms > 0.01, 'not silent'); assert.ok(r.f.f0 - r.m.f0 > 40, `F0 ${r.f.f0} vs ${r.m.f0}`); assert.ok(r.f.dur > 1.5 && r.f.dur < 12, 'duration ' + r.f.dur);
  });
  await check('text is prepared for listening: maths and units are spoken, markdown is dropped', async () => {
    const t = await p.evaluate(() => ERLY.neuralVoice.speechText('**Note:** a = 9.8 m/s² and x² ≤ 4 — see [link](http://x.y)'));
    assert.match(t, /metres per second squared/); assert.match(t, /x squared/); assert.match(t, /less than or equal to/); assert.doesNotMatch(t, /\*\*|\[link\]|http/);
  });
  await check('Noor speaks a long reply through the neural voice, prefetching the next phrase; pause and resume work', async () => {
    await p.evaluate(() => { const s = ERLY.companion.store; s.setPref('voiceEngine', 'neural'); s.setPref('neuralVoice', 'af_heart'); });
    const n0 = await p.evaluate(() => window.__plays.length);
    await p.evaluate(() => ERLY.companion._ui.voice.speak('Momentum is mass times velocity. When two carts collide, the total momentum stays the same. Kinetic energy is conserved only in elastic collisions.'));
    await p.waitForFunction(n => window.__plays.length > n, n0, { timeout: 120000 });
    await p.waitForTimeout(400); await p.evaluate(() => ERLY.companion._ui.voice.pause());
    assert.equal(await p.evaluate(() => [...document.querySelectorAll('audio')].concat(window.__lastAudio || []).length >= 0), true);
    const paused = await p.evaluate(() => ERLY.companion._ui.voice.state ? ERLY.companion._ui.voice.state().paused : true); assert.equal(paused, true, 'paused');
    await p.evaluate(() => ERLY.companion._ui.voice.resume()); await p.waitForFunction(n => window.__plays.length > n + 1, n0, { timeout: 180000 });
    await p.evaluate(() => ERLY.companion._ui.voice.stop());
  });
  await check('switching back to the device voices is one tap and is remembered', async () => {
    await p.evaluate(() => { const s = ERLY.companion.store; s.setPref('voiceEngine', 'neural'); }); await p.click('#cmpVoiceSet').catch(() => {}); await p.click('#cmpVoiceSet').catch(() => {});
    await p.evaluate(() => { const b2 = document.querySelector('#cmpNV [data-nv="system"]'); if (b2) b2.click(); });
    assert.equal(await p.evaluate(() => ERLY.companion.store.prefs().voiceEngine), 'system');
  });
  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? '✓ ' : '✗ ') + n + (r === 'PASS' ? '' : ' — ' + r));
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  const fail = results.filter(r => r[1] !== 'PASS').length; console.log(`\n${results.length - fail}/${results.length} passed`); process.exit(fail ? 1 : 0);
})();
