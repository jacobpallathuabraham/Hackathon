// Learning Studio inspectability: read-only inspection mode, the content directory, the static guide,
// query-string addresses, and that the normal Studio is unchanged.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/learn-inspect.e2e.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n    ', String(e.message).split('\n').slice(0, 6).join('\n     ')); } };
const AXE = process.env.AXE_PATH && fs.existsSync(process.env.AXE_PATH) ? fs.readFileSync(process.env.AXE_PATH, 'utf8') : null;

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const watch = p => { p.on('pageerror', e => errs.push(e.message + ' @' + p.url())); };

  await t('a fresh browser (no sign-in) opening ?inspect=1 sees the full directory, not the login page', async () => {
    const c = await b.newContext(); const p = await c.newPage(); watch(p);
    await p.goto(BASE + 'learn.html?inspect=1'); await p.waitForSelector('.lsi h1', { timeout: 20000 });
    assert.match(p.url(), /learn\.html\?inspect=1#\/inspect$/);
    const txt = await p.innerText('#lsView');
    for (const s of ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer science', 'English & study', 'Geography & environment', 'History', 'Languages', 'Social science', 'Economics, psychology & more']) assert.ok(txt.includes(s), 'subject listed: ' + s);
    const n = await p.evaluate(() => ({ x: LS.experiences.length, rows: document.querySelectorAll('#lsi-exps tbody tr').length, l: LS.lessons.length }));
    assert.equal(n.rows, n.x, 'every experience is in the table');
    assert.match(txt, new RegExp(n.l + ' lessons · ' + n.x + ' interactive experiences'));
    await p.reload(); await p.waitForSelector('.lsi h1'); assert.match(p.url(), /#\/inspect$/, 'refresh keeps the directory');
    await c.close();
  });

  await t('every subject page holds every lesson (with its section text) and every experience (with its frame text and real controls)', async () => {
    const c = await b.newContext(); const p = await c.newPage(); watch(p);
    await p.goto(BASE + 'learn.html?inspect=1'); await p.waitForSelector('.lsi h1');
    const subs = await p.evaluate(() => LS.subjectsList.map(s => s.id));
    for (const sid of subs) {
      await p.goto(BASE + 'learn.html?inspect=1#/inspect/' + sid); await p.waitForSelector('.lsi h1');
      const r = await p.evaluate(sid => {
        const S = LS.subjectsList.find(s => s.id === sid), c = LS.subjectContents(sid), xs = LS.experiences.filter(x => x.subject === sid), miss = [];
        c.lessons.forEach(L => { const el = document.getElementById('lesson-' + L.id); if (!el) return miss.push('lesson ' + L.id); L.sections.forEach(s => { if (!el.textContent.includes(s.title)) miss.push(L.id + ' section ' + s.title); }); (L.objectives || []).forEach(o => { if (!el.textContent.includes(String(o.text || o).slice(0, 30))) miss.push(L.id + ' objective'); }); });
        xs.forEach(x => { const el = document.getElementById('exp-' + x.id); if (!el) return miss.push('exp ' + x.id); const D = LS.exp.DEFS[x.id]; if (!D) return miss.push('def ' + x.id); if (D.predict && !el.querySelector('h4') ) miss.push('frame ' + x.id); if (!el.querySelector('a[href="#/exp/' + x.id + '"]')) miss.push('link ' + x.id); });
        return { miss, nl: c.lessons.length, nx: xs.length, ctl: xs.filter(x => document.querySelectorAll('#exp-' + x.id + ' .lsi-ctl li').length).length, name: S.name };
      }, sid);
      assert.deepEqual(r.miss, [], sid + ': missing ' + r.miss.join(', '));
      assert.ok(r.nx === 0 || r.ctl >= r.nx - 2, sid + ': controls listed for ' + r.ctl + ' of ' + r.nx + ' experiences');
    }
    await c.close();
  });

  await t('controls are the real labelled controls (projectile and Newton lab)', async () => {
    const c = await b.newContext(); const p = await c.newPage(); watch(p);
    await p.goto(BASE + 'learn.html?inspect=1#/inspect/physics'); await p.waitForSelector('.lsi h1');
    const pr = await p.evaluate(() => [...document.querySelectorAll('#exp-projectile .lsi-ctl li')].map(l => l.textContent));
    assert.ok(pr.includes('Angle — slider (5 to 85, step 1)'), pr.join(' | '));
    const nw = await p.evaluate(() => [...document.querySelectorAll('#exp-newton-lab .lsi-ctl li')].map(l => l.textContent));
    assert.ok(nw.some(s => /^Mass m — slider/.test(s)), nw.join(' | '));
    await c.close();
  });

  await t('read-only: inspection mode neither reads nor changes the student’s saved data on this device', async () => {
    const c = await b.newContext(); const p = await c.newPage(); watch(p);
    await p.goto(BASE + 'learn-guide/index.html'); // a page that runs no scripts, so nothing but the test touches storage
    const seed = { 'erly-learn-v1': '{"secret":"student-notes"}', 'erly-a11y': '{"size":120}', 'erly-theme': 'dark', 'other-key': 'keep' };
    await p.evaluate(s => { localStorage.clear(); Object.entries(s).forEach(([k, v]) => localStorage.setItem(k, v)); sessionStorage.setItem('mine', '1'); }, seed);
    await p.evaluate(() => new Promise(r => { const q = indexedDB.open('erly-hws', 1); q.onupgradeneeded = () => q.result.createObjectStore('inbox', { keyPath: 'id' }); q.onsuccess = () => { q.result.close(); r(); }; }));
    await p.goto(BASE + 'learn.html?inspect=1#/exp/projectile'); await p.waitForSelector('.at-x__stage', { timeout: 20000 }); await p.waitForTimeout(800);
    const inside = await p.evaluate(() => ({ seen: localStorage.getItem('erly-learn-v1'), n: localStorage.length, idb: !!window.indexedDB }));
    assert.equal(inside.seen, null, 'the student’s saved learning data is not visible'); assert.equal(inside.idb, false, 'IndexedDB is off');
    // act like a visitor: predict, explore, write a note, change settings
    await p.click('[data-step="predict"]').catch(() => {}); await p.click('[data-pred="1"]').catch(() => {});
    await p.goto(BASE + 'learn.html?inspect=1#/notebook'); await p.waitForTimeout(800);
    await p.evaluate(() => { LS.store.setConsent({ store: 'device' }); LS.store.update(d => { d.notes['n-x'] = { id: 'n-x', title: 'inspector note', body: 'x' }; }); });
    await p.click('#themeToggle'); await p.waitForTimeout(300);
    await p.goto(BASE + 'learn-guide/index.html');
    const after = await p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return { o, ss: sessionStorage.getItem('mine') }; });
    assert.deepEqual(after.o, seed, 'localStorage exactly as before'); assert.equal(after.ss, '1');
    const stores = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('erly-hws'); q.onsuccess = () => { const d = q.result; const tx = d.transaction('inbox', 'readonly').objectStore('inbox').count(); tx.onsuccess = () => { d.close(); r(tx.result); }; }; }));
    assert.equal(stores, 0, 'IndexedDB untouched');
    await c.close();
  });

  await t('inspection mode makes no requests to other sites except fonts and the three.js-free local files', async () => {
    const c = await b.newContext(); const p = await c.newPage(); watch(p); const ext = [];
    p.on('request', r => { const u = new URL(r.url()); if (u.origin !== new URL(BASE).origin && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) ext.push(r.url()); });
    await p.goto(BASE + 'learn.html?inspect=1'); await p.waitForSelector('.lsi h1');
    for (const s of ['physics', 'biology', 'history']) { await p.goto(BASE + 'learn.html?inspect=1#/inspect/' + s); await p.waitForSelector('.lsi h1'); }
    assert.deepEqual(ext, []);
    await c.close();
  });

  await t('query-string addresses open the right place, survive refresh, and Back/Forward work', async () => {
    const c = await b.newContext(); await c.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); });
    const p = await c.newPage(); watch(p);
    await p.goto(BASE + 'learn.html?subject=mathematics'); await p.waitForTimeout(900); assert.match(p.url(), /#\/subject\/maths$/); assert.match(await p.innerText('#lsView'), /Mathematics/);
    await p.reload(); await p.waitForTimeout(700); assert.match(p.url(), /#\/subject\/maths$/, 'refresh stays');
    await p.goto(BASE + 'learn.html?exp=projectile'); await p.waitForSelector('.at-x__stage', { timeout: 15000 }); assert.match(await p.innerText('#lsView'), /Projectile launcher/);
    await p.goto(BASE + 'learn.html?lesson=phys-newton'); await p.waitForTimeout(900); assert.match(p.url(), /#\/lesson\/phys-newton$/);
    await p.goto(BASE + 'learn.html?section=lab'); await p.waitForTimeout(1500); assert.match(p.url(), /#\/lab$/);
    await p.goBack(); await p.waitForTimeout(700); assert.match(p.url(), /#\/lesson\/phys-newton$/, 'Back');
    await p.goForward(); await p.waitForTimeout(700); assert.match(p.url(), /#\/lab$/, 'Forward');
    await p.goto(BASE + 'learn.html?exp=no-such-thing'); await p.waitForTimeout(900); assert.match(await p.innerText('#lsView'), /Experience not found/, 'unknown experience fails gracefully');
    await p.goto(BASE + 'learn.html?section=evil%3Cscript%3E'); await p.waitForTimeout(700); assert.doesNotMatch(p.url(), /#\/evil/, 'junk is not turned into a route');
    await c.close();
  });

  await t('without sign-in and without ?inspect=1 the Studio still asks for the demo sign-in, and keeps the address', async () => {
    const c = await b.newContext(); const p = await c.newPage();
    await p.goto(BASE + 'learn.html?subject=physics'); await p.waitForURL(/login\.html/, { timeout: 5000 });
    assert.match(decodeURIComponent(p.url()), /back=learn\.html\?subject=physics#\/subject\/physics/);
    await c.close();
  });

  await t('with JavaScript off, learn.html shows a readable subject list linking to the plain-HTML guide', async () => {
    const c = await b.newContext({ javaScriptEnabled: false }); const p = await c.newPage();
    await p.goto(BASE + 'learn.html'); const txt = await p.innerText('main');
    assert.match(txt, /ERLY Learning Studio/); assert.match(txt, /Physics/); assert.match(txt, /History/);
    const hrefs = await p.$$eval('main a', as => as.map(a => a.getAttribute('href')));
    assert.ok(hrefs.includes('learn-guide/index.html') && hrefs.includes('learn-guide/physics.html'));
    await p.goto(BASE + 'learn-guide/physics.html'); const g = await p.innerText('main');
    assert.match(g, /Projectile launcher/); assert.match(g, /Newton/); assert.match(g, /Angle — slider/);
    await c.close();
  });

  await t('the static guide matches the Studio (rebuild with tools/build-learn-guide.js if this fails)', async () => {
    const c = await b.newContext(); const p = await c.newPage(); watch(p);
    await p.goto(BASE + 'learn.html?inspect=1'); await p.waitForSelector('.lsi h1');
    const fresh = await p.evaluate(() => LS.inspect.staticPages());
    for (const [k, html] of Object.entries(fresh)) {
      const file = fs.readFileSync(path.join(ROOT, 'learn-guide', k + '.html'), 'utf8');
      assert.ok(file.includes(html), 'learn-guide/' + k + '.html is out of date');
    }
    await c.close();
  });

  await t('every link in the guide resolves: files and #anchors exist, and every live Studio route opens', async () => {
    const dir = path.join(ROOT, 'learn-guide'), bad = [], routes = new Set();
    for (const f of fs.readdirSync(dir)) {
      const s = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const m of s.matchAll(/href="([^"]+)"/g)) {
        const h = m[1].replace(/&amp;/g, '&'); if (/^https?:/.test(h)) continue;
        if (h.startsWith('../learn.html?inspect=1#/')) { routes.add(h.split('#/')[1]); continue; }
        const [file0, anchor] = h.split('#'), file = file0.split('?')[0]; const target = file ? path.join(dir, file) : path.join(dir, f);
        if (!fs.existsSync(target)) { bad.push(f + ' → ' + h); continue; }
        if (anchor && !fs.readFileSync(target, 'utf8').includes('id="' + anchor + '"')) bad.push(f + ' → ' + h + ' (no anchor)');
      }
    }
    assert.deepEqual(bad, []);
    const c = await b.newContext(); const p = await c.newPage(); watch(p); const broken = [];
    await p.goto(BASE + 'learn.html?inspect=1'); await p.waitForSelector('.lsi h1');
    for (const r of routes) {
      const ok = await p.evaluate(r => { const [a, b2] = r.split('/'); if (a === 'exp') return !!LS.experiences.find(x => x.id === b2); if (a === 'lesson' || a === 'topic') return !!LS.lesson(b2); if (a === 'subject') return !!LS.subjectsList.find(s => s.id === b2); if (a === 'lab') return !b2 || !!ERLY_LAB.engines.find(e => e.id === b2); if (a === 'video') return !b2 || !!LS.VIDEOS.find(v => v.id === b2); if (a === 'read') return !!(r === 'read' || STUDIO_LIBRARY.find(d => d.id === r.split('/')[2])); return true; }, r);
      if (!ok) broken.push(r);
    }
    assert.deepEqual(broken, [], 'routes to things that do not exist');
    console.log('     (' + routes.size + ' distinct live routes checked)');
    for (const r of ['exp/black-hole', 'lesson/chem-ph', 'lab/graph', 'video/erly-heart', 'read/doc/biol101', 'subject/history']) {
      await p.goto(BASE + 'learn.html?inspect=1#/' + r); await p.waitForTimeout(r.startsWith('lab') ? 2500 : 1200);
      assert.doesNotMatch(await p.innerText('#lsView'), /not found|could not load/i, r);
    }
    await c.close();
  });

  await t('no secrets or personal data in the directory or the guide', async () => {
    const all = fs.readdirSync(path.join(ROOT, 'learn-guide')).map(f => fs.readFileSync(path.join(ROOT, 'learn-guide', f), 'utf8')).join('\n');
    assert.doesNotMatch(all, /api[_-]?key|sk-[A-Za-z0-9]{10}|AIza[0-9A-Za-z_-]{20}|password|bearer\s+[a-z0-9]/i);
    assert.doesNotMatch(all, /@privaterelay|acubins-session/);
  });

  await t('the normal Studio is unchanged: home, an experience and a lesson render with no inspection bar', async () => {
    const c = await b.newContext(); await c.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); });
    const p = await c.newPage(); watch(p);
    await p.goto(BASE + 'learn.html#/home'); await p.waitForTimeout(1500);
    assert.equal(await p.locator('.lsi-bar').count(), 0); assert.equal(await p.locator('.ls-static').count(), 0, 'static list replaced when the Studio starts');
    assert.equal(await p.evaluate(() => document.documentElement.classList.contains('ls-inspect')), false);
    assert.ok((await p.innerText('#lsView')).length > 500);
    await p.goto(BASE + 'learn.html#/exp/projectile'); await p.waitForSelector('.at-x__stage canvas', { timeout: 15000 });
    await p.goto(BASE + 'learn.html#/lesson/phys-newton'); await p.waitForTimeout(900); assert.match(await p.innerText('#lsView'), /Newton/);
    await c.close();
  });

  await t('phone: the directory fits without sideways scrolling', async () => {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }); const p = await c.newPage(); watch(p);
    for (const u of ['learn.html?inspect=1', 'learn.html?inspect=1#/inspect/physics', 'learn-guide/maths.html']) { await p.goto(BASE + u); await p.waitForTimeout(1500); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), u); }
    await c.close();
  });

  if (AXE) await t('axe (WCAG 2.1 A/AA): directory, a subject page and a guide page', async () => {
    const c = await b.newContext(); const p = await c.newPage(); const out = [];
    for (const u of ['learn.html?inspect=1', 'learn.html?inspect=1#/inspect/chemistry', 'learn-guide/index.html', 'learn-guide/biology.html']) {
      await p.goto(BASE + u); await p.waitForTimeout(2000); await p.addScriptTag({ content: AXE });
      const v = await p.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }).then(r => r.violations.map(v => v.id + ' ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' ; '))));
      if (v.length) out.push(u + ': ' + v.join(' || '));
    }
    assert.deepEqual(out, []);
    await c.close();
  });

  await t('no page errors', async () => { assert.deepEqual(errs, []); });
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
