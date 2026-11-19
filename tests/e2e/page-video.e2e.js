// v17: Noor knows what is on the screen (page-context.js), video full screen works and coexists with the chat,
// and time-range questions are answered only from a real transcript (there is none for these videos, so Noor says so).
// YouTube is replaced by a stand-in player so the test needs no network.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/page-video.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + (e.message || e).split('\n')[0].slice(0, 240) + ' @' + ((e.stack || '').match(/e2e.js:(\d+)/) || [])[1]]); } };
const FAKE_YT = `window.YT = { Player: function (id, o) {
  const el = document.getElementById(id); const f = document.createElement('iframe'); f.id = id; f.setAttribute('allow', 'autoplay'); el.replaceWith(f);
  const st = { t: 0, rate: 1, state: 1, seeks: [], destroyed: false }; window.__yt = st;
  setInterval(() => { if (st.state === 1) st.t += 0.25 * st.rate; }, 250);
  this.getCurrentTime = () => st.t; this.getDuration = () => 600; this.getPlaybackRate = () => st.rate; this.getPlayerState = () => st.state;
  this.seekTo = s => { st.t = s; st.seeks.push(s); }; this.setPlaybackRate = r => { st.rate = r; o.events.onPlaybackRateChange && o.events.onPlaybackRateChange({ data: r }); };
  this.playVideo = () => { st.state = 1; }; this.pauseVideo = () => { st.state = 2; }; this.destroy = () => { st.destroyed = true; };
  setTimeout(() => o.events.onReady && o.events.onReady(), 30);
} }; window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady();`;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); });
  await ctx.route(/youtube\.com\/iframe_api/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_YT }));
  await ctx.route(/ytimg\.com/, r => r.fulfill({ status: 204, body: '' }));
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  const net = []; p.on('request', r => { if (/pollinations|workers\.dev|\/v1\/chat/.test(r.url())) net.push(r.url()); });
  const ask = async q => { const n = await p.locator('.cmsg--ai').count(); await p.fill('#cmpText', q); await p.press('#cmpText', 'Enter'); await p.waitForFunction(n => document.querySelectorAll('.cmsg--ai').length > n && !document.querySelector('.cmsg.is-writing') && !document.querySelector('.cmsg--typing'), n, { timeout: 15000 }); await p.waitForTimeout(300); return p.evaluate(() => { const m = [...document.querySelectorAll('.cmsg--ai')].pop(); return m.innerText; }); };
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(900);

  await check('"what am I looking at?" describes the visible section from the page itself', async () => {
    await p.evaluate(() => document.getElementById('reading-studio').scrollIntoView({ block: 'start', behavior: 'instant' })); await p.waitForTimeout(300);
    const heading = await p.evaluate(() => document.querySelector('#reading-studio h2').textContent.trim());
    await p.click('.cmp-launch'); await p.waitForTimeout(800);
    const r = await ask('Can you explain what I’m looking at?');
    assert.match(r, /What you’re looking at/);
    assert.ok(r.includes(heading.slice(0, 20)), 'names the section in view: ' + heading);
    assert.match(r, /in the page’s own words/);
    assert.match(r, /This is what was on your screen at \d\d:\d\d/, 'says when the snapshot was taken');
    assert.equal(net.length, 0, 'nothing sent (no AI in use)');
    // freshness: after scrolling, a new question sees the new section
    await p.click('#cmpClose'); await p.evaluate(() => document.getElementById('gap').scrollIntoView({ block: 'start', behavior: 'instant' })); await p.waitForTimeout(300);
    const h2 = await p.evaluate(() => document.querySelector('#gap h2').textContent.trim());
    await p.click('.cmp-launch'); await p.waitForTimeout(500);
    const r2 = await ask('explain this section');
    assert.ok(r2.includes(h2.slice(0, 20)), 'fresh snapshot after scrolling: ' + h2);
    await p.click('#cmpClose');
  });
  await check('selection is used when the student selected text', async () => {
    await p.evaluate(() => { const el = document.querySelector('#gap p'); const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); });
    const sel = await p.evaluate(() => String(getSelection()).trim().slice(0, 30));
    await p.click('.cmp-launch'); await p.waitForTimeout(500);
    const r = await ask('what am I looking at');
    assert.match(r, /Your selection/); assert.ok(r.replace(/\s+/g, ' ').includes(sel.replace(/\s+/g, ' ').slice(0, 20)));
    await p.click('#cmpClose'); await p.evaluate(() => getSelection().removeAllRanges());
  });
  await check('video room: opening circle settles (no clip-path), the iframe allows full screen', async () => {
    await p.evaluate(() => ERLY.videos.open(ERLY.videos.lessons[0].id)); await p.waitForTimeout(1100);
    assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.vroom')).clipPath), 'none');
    const f = await p.evaluate(() => { const i = document.querySelector('.vroom iframe'); return [i.hasAttribute('allowfullscreen'), i.getAttribute('allow')]; });
    assert.ok(f[0] && /fullscreen/.test(f[1]), JSON.stringify(f));
  });
  await check('full screen button: the page goes full screen with the video filling it', async () => {
    await p.click('[data-vfull]'); await p.waitForTimeout(500);
    assert.equal(await p.evaluate(() => document.querySelector('.vroom').classList.contains('is-max')), true);
    assert.equal(await p.evaluate(() => document.fullscreenElement === document.documentElement), true, 'Fullscreen API used');
    const r = await p.evaluate(() => { const f = document.querySelector('.vroom__frame').getBoundingClientRect(); return [f.width, f.height, innerWidth, innerHeight]; });
    assert.ok(r[0] >= r[2] - 2 && r[1] >= r[3] - 60, 'video fills the screen: ' + r);
  });
  await check('Noor opens over the full-screen video without pausing or reloading it', async () => {
    const t0 = await p.evaluate(() => window.__yt.t);
    await p.click('.cmp-launch'); await p.waitForTimeout(800);
    assert.equal(await p.isVisible('#cmpText'), true, 'chat usable in full screen');
    const r = await ask('what am I looking at?');
    assert.match(r, /First law of thermodynamics/); assert.match(r, /Key points for this video/); assert.match(r, /no transcript/);
    const st = await p.evaluate(() => ({ t: window.__yt.t, state: window.__yt.state, destroyed: window.__yt.destroyed, max: document.querySelector('.vroom').classList.contains('is-max'), fs: !!document.fullscreenElement }));
    assert.ok(st.t > t0 && st.state === 1 && !st.destroyed, 'still playing: ' + JSON.stringify(st));
    assert.ok(st.max && st.fs, 'still full screen');
  });
  await check('"explain 2:30–3:30": no invented content; offers to loop that range, which really loops', async () => {
    const r = await ask('explain 2:30–3:30');
    assert.match(r, /2:30–3:30/); assert.match(r, /no transcript/); assert.match(r, /won’t guess/);
    await p.click('.cchips button:has-text("Loop 2:30")'); await p.waitForTimeout(500);
    const st = await p.evaluate(() => window.__yt);
    assert.ok(st.seeks.includes(150), 'seeks to 2:30'); assert.equal(st.rate, 0.75);
    await p.evaluate(() => { window.__yt.t = 211; }); await p.waitForTimeout(500);
    assert.ok(await p.evaluate(() => window.__yt.t) < 160, 'loops back at 3:30');
  });
  await check('a lesson with a real transcript is explained from that transcript only', async () => {
    await p.evaluate(() => { ERLY.videos.lessons[0].transcript = [{ t: 148, text: 'Internal energy is the total energy stored in the particles.' }, { t: 175, text: 'Heat added equals change in internal energy plus work done.' }, { t: 400, text: 'Later topic.' }]; });
    const r = await ask('what happens from 2:30 to 3:30?');
    assert.match(r, /Heat added equals change in internal energy plus work done/); assert.ok(!/Later topic/.test(r), 'only the asked range');
    await p.evaluate(() => { delete ERLY.videos.lessons[0].transcript; });
  });
  await check('leaving full screen and closing the video are clean', async () => {
    await p.click('#cmpClose'); await p.waitForTimeout(300);
    await p.click('[data-vfull]'); await p.waitForTimeout(400);
    assert.equal(await p.evaluate(() => !!document.fullscreenElement || document.querySelector('.vroom').classList.contains('is-max')), false);
    await p.click('[data-vclose]'); await p.waitForTimeout(700);
    assert.equal(await p.evaluate(() => ERLY.videos.current()), null);
  });

  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? '✓ ' : '✗ ') + n + (r === 'PASS' ? '' : ' — ' + r));
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  const fail = results.filter(r => r[1] !== 'PASS').length;
  console.log(`\n${results.length - fail}/${results.length} passed`);
  process.exit(fail || errors.length ? 1 : 0);
})();
