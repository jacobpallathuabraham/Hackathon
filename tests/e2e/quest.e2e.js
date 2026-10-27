// Plays every Daily Quest game to the end with a speech engine that never
// reports "finished" (as some iPads do) — nothing may freeze.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/quest.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const SHOT = process.env.ERLY_SHOTS;

async function drive(page, k) {
  const t0 = Date.now();
  let shots = 0;
  while (Date.now() - t0 < 150000) {
    if (await page.locator('#checkin .ck-res').count()) return true;
    const vis = async s => { const l = page.locator(s).first(); return (await l.count()) && await l.isVisible().catch(() => false); };
    if (SHOT && shots < 3 && await vis('#checkin .ck-brief, #checkin .ck-slide, #checkin .ck-halls, #checkin .ck-mail.is-in, #checkin .ck-trail, #checkin .ck-exam, #checkin .ck-cap')) { await page.screenshot({ path: `${SHOT}/g-${k}-${shots++}.png` }); }
    if (await vis('#checkin [data-go]')) { await page.click('#checkin [data-go]'); continue; }
    if (await vis('#checkin .ck-listen__done')) { await page.click('#checkin .ck-listen__done'); continue; }
    if (await vis('#checkin .ck-pad')) { await page.click('#checkin .ck-pad [data-k="1"]'); await page.click('#checkin .ck-pad [data-k="ok"]'); continue; }
    if (await vis('#checkin .ck-trail .ck-node')) { const n = await page.locator('#checkin .ck-node').count(); for (let i = 0; i < n; i++) await page.locator(`#checkin .ck-node[data-i="${i}"]`).click(); continue; }
    if (await vis('#checkin .ck-gng__b')) { await page.click('#checkin .ck-gng__b').catch(() => {}); await page.waitForTimeout(300); continue; }
    if (await vis('#checkin .ck-site')) {
      const navs = await page.locator('#checkin .ck-site nav button').count();
      for (let i = 0; i < navs && await vis('#checkin .ck-site'); i++) {
        await page.locator('#checkin .ck-site nav button').nth(i).click().catch(() => {});
        const its = await page.locator('#checkin .ck-site__it').count();
        for (let j = 0; j < its; j++) { await page.locator('#checkin .ck-site__it').nth(j).click().catch(() => {}); if (await page.locator('#checkin .ck-site__it.is-found').count()) break; }
        if (await page.locator('#checkin .ck-site__it.is-found').count()) { await page.waitForTimeout(700); break; }
      }
      continue;
    }
    if (await vis('#checkin textarea')) { await page.fill('#checkin textarea', 'Clear notes help you remember what the lecturer said and make revising for exams much easier.'); await page.click('#checkin [data-ok]'); continue; }
    if (await vis('#checkin .ck-opts button')) { await page.locator('#checkin .ck-opts button').first().click({ timeout: 3000 }).catch(() => {}); await page.locator('#checkin [data-next]:not([disabled])').click({ timeout: 3000 }).catch(() => {}); continue; }
    if (await vis('#checkin .ck-choices button')) { await page.locator('#checkin .ck-choices button').first().click({ timeout: 3000 }).catch(() => {}); continue; }
    await page.waitForTimeout(150);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student');
    localStorage.setItem('erly-checkins-v1', JSON.stringify({ history: {}, short: true, quest: { judge: true } }));
    // a speech engine that starts but never ends — like a stuck tablet voice
    const synth = { speaking: false, pending: false, paused: false, getVoices: () => [{ name: 'Test', lang: 'en-GB', localService: true }], cancel() {}, pause() {}, resume() {}, speak(u) { setTimeout(() => u.onstart && u.onstart({}), 5); }, addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: synth });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  });
  await page.goto(BASE + 'checkins.html');
  await page.waitForSelector('[data-ck-start]');
  const order = (process.env.ONLY || 'V,U,M,E,P,O,N,Q,C,H').split(',');
  for (const k of order) {
    const day = [['V', 'U'], ['M', 'E'], ['P', 'O'], ['N', 'Q'], ['C', 'H']].findIndex(d => d.includes(k)) + 1;
    await page.click(`[data-day="${day}"]`);
    await page.click(`[data-ck-start="${k}"]`);
    await page.waitForSelector('#checkin.is-open');
    await page.click('#checkin [data-go]');
    const ok = await drive(page, k);
    assert.ok(ok, `${k} reached its result`);
    const band = await page.evaluate(kk => JSON.parse(localStorage.getItem('erly-checkins-v1')).history[kk].slice(-1)[0].band, k);
    console.log(k, band);
    await page.click('#checkin [data-done]');
    await page.waitForTimeout(600);
  }
  if (!process.env.ONLY) assert.match(await page.textContent('.q-stats'), /10\s*\/10/);
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('quest e2e ok');
})().catch(e => { console.error(e); process.exit(1); });
