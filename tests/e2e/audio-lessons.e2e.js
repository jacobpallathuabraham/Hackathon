// v18 audio lessons for ANY topic. 50 topics are drawn from the curriculum registry (assets/js/lab/curriculum.js) —
// they are not special-cased anywhere in the lesson code. For each: the lesson is about the requested topic, has
// chapters, and the hosts' teaching sentences are quoted from the named source (nothing invented). Then the player:
// play/pause, seek, chapter jump, speed, revision/detailed/continue versions, "ask Noor", requested from normal chat.
//   AL_PLAYER_ONLY=1 skips the 50-topic sweep and runs only the player checks.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/audio-lessons.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const C = require('../../assets/js/lab/curriculum.js');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + (e.message || e).split('\n')[0].slice(0, 240)]); } };
const MOCK = () => { window.__said = []; const synth = { getVoices: () => [{ name: 'Test F', lang: 'en-GB', localService: true }, { name: 'Test M', lang: 'en-GB', localService: true }], cancel() {}, pause() {}, resume() {}, addEventListener() {}, speak(u) { window.__said.push(u.text); setTimeout(() => { u.onstart && u.onstart({}); setTimeout(() => u.onend && u.onend({}), 20); }, 5); } }; Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true }); window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } }; };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => sessionStorage.setItem('acubins-role', 'student')); await ctx.addInitScript(MOCK);
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200);
  // every third concept, so all disciplines and levels are represented
  const all = C.list.map(c => c.concept.replace(/\s*\(.*?\)\s*/g, ' ').trim()).filter((t, i, A) => A.indexOf(t) === i);
  const topics = Array.from({ length: 50 }, (_, k) => all[Math.floor(k * all.length / 50)]); // evenly across every discipline and level
  assert.equal(topics.length, 50);
  if (!process.env.AL_PLAYER_ONLY) { // AL_PLAYER_ONLY=1 runs just the player checks (one lesson), e.g. while the encyclopedia is rate-limiting
  var lessonRows = [];
  for (const topic of topics) {
    let r; for (let attempt = 0; attempt < 3; attempt++) { r = await p.evaluate(async topic => { try { const s = await ERLY.audioLesson.compose(topic, { level: 'school', depth: 'standard', minutes: 4 }); if (!s) return ERLY.audioLesson.compose.lastError ? { busy: ERLY.audioLesson.compose.lastError } : { none: true }; const art = s.sourceUrl ? await ERLY.audioLesson.wikiArticle(s.title, 'en') : null; const src = art ? art.sections.map(x => x.text).join(' ').replace(/\s+/g, ' ') : ''; const teach = s.lines.filter(l => l.s === 'A' && l.src !== 'model').map(l => l.t).filter(t => !/^(Welcome to your ERLY audio lesson|That’s the lesson|Quick check|The model is open)/.test(t)); const quoted = teach.filter(t => src.includes(t.replace(/\s+/g, ' ').trim())).length; return { title: s.title, chapters: s.lines.filter(l => l.ch).length, lines: s.lines.filter(l => l.t).length, teach: teach.length, quoted, url: s.sourceUrl || null, words: s.words || 0 }; } catch (e) { return { err: e.message }; } }, topic); if (!r.busy) break; await p.waitForTimeout(15000); } // the API asked us to slow down: wait, not count it as “no source”
    lessonRows.push(Object.assign({ topic }, r)); await p.waitForTimeout(1500); // polite to the Wikipedia API
  }
  await check('50 registry topics → 50 topic-specific lessons (or an honest “no reliable source”)', async () => {
    const made = lessonRows.filter(r => r.title), none = lessonRows.filter(r => r.none || r.err || r.busy); none.forEach(r => console.log('   no lesson:', r.topic, r.busy ? '(source busy: ' + r.busy + ')' : r.err || ''));
    const words = t => t.toLowerCase().replace(/[’']s\b/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 3 && !/^(with|from|their|that|this|first|large|fundamentals|structure|theory|principle|law|laws)$/.test(w));
    const off = made.filter(r => !words(r.topic).some(w => (r.title.toLowerCase()).includes(w.slice(0, 5))) );
    console.log(`lessons made: ${made.length}/50; no reliable source: ${none.length}; title not matching topic words: ${off.length}`);
    off.forEach(r => console.log('   topic → article:', r.topic, '→', r.title));
    assert.ok(made.length >= 45, 'made ' + made.length);
    assert.ok(off.length <= 5, 'topic match');
  });
  await check('every lesson has structure: chapters, enough lines, a named source', async () => {
    const made = lessonRows.filter(r => r.title); const bad = made.filter(r => r.chapters < 3 || r.lines < 8 || !r.url);
    assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 3)));
  });
  await check('nothing invented: the hosts’ teaching sentences are quoted from the cited article', async () => {
    const made = lessonRows.filter(r => r.title && r.teach); const tot = made.reduce((a, r) => a + r.teach, 0), q = made.reduce((a, r) => a + r.quoted, 0);
    console.log(`teaching sentences quoted verbatim from the source: ${q}/${tot}`);
    assert.ok(q / tot >= 0.97, `${q}/${tot}`);
  });
  } // end of the 50-topic part

  await p.click('.cmp-launch'); await p.waitForTimeout(600);
  await check('asked in normal chat: “Create an audio lesson about rotational mechanics” opens a real lesson', async () => {
    await p.fill('#cmpText', 'Create an audio lesson about rotational mechanics'); await p.press('#cmpText', 'Enter');
    await p.waitForSelector('.alx.is-in', { timeout: 30000 });
    const t = await p.textContent('.alx__h b'); assert.match(t, /rotat|rigid body|angular/i, t);
    assert.ok(await p.locator('.alx__ch button').count() >= 3, 'chapters'); assert.ok(await p.locator('.alx__tr li').count() >= 10, 'transcript');
    assert.ok(await p.locator('.alx__more a[href*="wikipedia.org"]').count() === 1, 'source link');
  });
  await check('player: play speaks lines in order, pause stops, seek and chapters move, speed changes', async () => {
    await p.click('.alx__play'); await p.waitForTimeout(1500); const n1 = await p.evaluate(() => window.__said.length); assert.ok(n1 >= 2, 'speaking ' + n1);
    await p.click('.alx__play'); await p.waitForTimeout(400); const n2 = await p.evaluate(() => window.__said.length); await p.waitForTimeout(600); assert.equal(await p.evaluate(() => window.__said.length), n2, 'paused');
    await p.evaluate(() => { const s = document.querySelector('.alx [data-a="seek"]'); s.value = 12; s.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(100);
    assert.ok(await p.evaluate(() => ERLY.audioLesson.current().index()) >= 12, 'seek');
    await p.click('.alx__ch button >> nth=2'); await p.waitForTimeout(100); const at = await p.evaluate(() => ERLY.audioLesson.current().index()); assert.ok(at > 0);
    await p.click('.alx [data-sp="1.5"]'); assert.equal(await p.getAttribute('.alx [data-sp="1.5"]', 'aria-pressed'), 'true');
    assert.match(await p.textContent('.alx__pos'), /\d+:\d\d \/ \d+:\d\d/);
  });
  await check('revision, more-detail and continue versions are generated from the same source', async () => {
    const w0 = await p.evaluate(() => ERLY.audioLesson.current().script.lines.filter(l => l.t).length);
    await p.click('.alx [data-a="v:revision"]'); await p.waitForFunction(() => { const c = ERLY.audioLesson.current(); return c && c.script.opts && c.script.opts.depth === 'revision'; }, null, { timeout: 30000 }); const wr = await p.evaluate(() => ERLY.audioLesson.current().script.lines.filter(l => l.t).length);
    await p.click('.alx [data-a="v:detailed"]'); await p.waitForFunction(() => { const c = ERLY.audioLesson.current(); return c && c.script.opts && c.script.opts.depth === 'detailed'; }, null, { timeout: 30000 }); const wd = await p.evaluate(() => ERLY.audioLesson.current().script.lines.filter(l => l.t).length);
    assert.ok(wr < w0 && wd > w0, `revision ${wr} < standard ${w0} < detailed ${wd}`);
    const first = await p.evaluate(() => ERLY.audioLesson.current().script.lines.find(l => l.ch && l.ch !== 'Introduction').ch);
    await p.click('.alx [data-a="v:continue"]'); await p.waitForFunction(f => { const c = ERLY.audioLesson.current(); const x = c && (c.script.lines.find(l => l.ch && l.ch !== 'Introduction') || {}).ch; return x && x !== f; }, first, { timeout: 30000 }).catch(() => {}); const f2 = await p.evaluate(() => (ERLY.audioLesson.current().script.lines.find(l => l.ch && l.ch !== 'Introduction') || {}).ch);
    assert.notEqual(f2, first, 'continuation starts with new chapters');
  });
  await check('“Ask Noor about this lesson” attaches the lesson to the chat', async () => {
    await p.click('.alx [data-a="ask"]'); await p.waitForTimeout(300);
    assert.match(await p.inputValue('#cmpText'), /About the audio lesson on/); assert.match(await p.textContent('#cmpAttach'), /audio lesson/i);
  });
  await check('an unknown topic gets an honest refusal, not an invented lesson', async () => {
    await p.evaluate(() => ERLY.audioLesson.current() && ERLY.audioLesson.current().close());
    const r = await p.evaluate(() => ERLY.audioLesson.compose('zxqv blorptastic frumious theory', {}));
    assert.equal(r, null);
  });

  await b.close();
  for (const [n, r] of results) console.log((r === 'PASS' ? '✓ ' : '✗ ') + n + (r === 'PASS' ? '' : ' — ' + r));
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  if (!process.env.AL_PLAYER_ONLY) require('node:fs').writeFileSync(require('node:path').join(__dirname, '..', '..', 'docs', 'bench', 'audio-lessons-50.json'), JSON.stringify(lessonRows, null, 1));
  const fail = results.filter(r => r[1] !== 'PASS').length;
  console.log(`\n${results.length - fail}/${results.length} passed`);
  process.exit(fail || errors.length ? 1 : 0);
})();
