// Visual Lab audit: opens EVERY computed model in the Learning Studio (#/lab/<id>) in a real browser and records, per model:
//   • built      — the model mounted with no error message and no page error;
//   • painted    — its canvas has drawn pixels (or its SVG has drawn elements);
//   • explained  — the explanation panel has text that contains at least one number;
//   • controls   — every slider / select / checkbox in its side panel (up to 6) is moved and we record whether the
//                  picture or the readouts changed (a control that changes nothing is flagged);
//   • tested     — whether an independent numeric test for the model exists in tests/e2e (found by its id).
// It writes docs/ERLY-VISUAL-LAB-AUDIT.md and docs/bench/visual-lab-audit.json.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tools/audit-visual-lab.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const ROOT = path.join(__dirname, '..');
const testSrc = fs.readdirSync(path.join(ROOT, 'tests/e2e')).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(ROOT, 'tests/e2e', f), 'utf8')).join('\n');

(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('acubins-role', 'student'); sessionStorage.setItem('ls-entered', '1'); } catch (e) { /* */ } });
  const p = await ctx.newPage(); p.setDefaultTimeout(20000); let errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(BASE + 'learn.html#/lab'); await p.waitForFunction(() => window.ERLY_LAB && ERLY_LAB.engines && ERLY_LAB.engines.length > 50, null, { timeout: 60000 });
  const list = await p.evaluate(() => ERLY_LAB.engines.map(e => ({ id: e.id, title: e.title || e.id, kind: e.kind || '' })));
  const sig = () => p.evaluate(() => {
    const st = document.querySelector('.lab__canvas'); if (!st) return null; let h = 0, px = 0;
    st.querySelectorAll('canvas').forEach(c => { try { const g = c.getContext('2d'); if (!g) { h += c.width; px += 1e6; return; } const d = g.getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 97) { h = (h * 31 + d[i]) | 0; if (i % 4 === 3 && d[i]) px++; } } catch (e) { px += 1e6; /* webgl canvas: counted as drawn */ } });
    st.querySelectorAll('svg').forEach(s => { const t = s.innerHTML; px += s.querySelectorAll('path,line,circle,rect,polygon,polyline,text,ellipse').length * 100; for (let i = 0; i < t.length; i += 7) h = (h * 31 + t.charCodeAt(i)) | 0; });
    const txt = [document.querySelector('.lab__ex'), document.querySelector('.lab__hud'), document.querySelector('.lab__side')].map(e => (e ? e.innerText : '')).join(' | ');
    for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) | 0;
    return { h, px, ex: (document.querySelector('.lab__ex') || {}).innerText || '', err: !!st.querySelector('.lab-err') };
  });
  // a signature of what the student sees: a screenshot of the model area (works for canvas, SVG, WebGL and HTML) + the readout text
  const look = async () => { const el = await p.$('.lab__canvas'); const img = el ? await el.screenshot({ animations: 'disabled' }).catch(() => null) : null; const txt = await p.evaluate(() => [document.querySelector('.lab__ex'), document.querySelector('.lab__hud'), document.querySelector('.lab__side')].map(e => (e ? e.innerText : '')).join(' | '));
    return { img: img ? crypto.createHash('sha1').update(img).digest('hex') : '', txt: crypto.createHash('sha1').update(txt).digest('hex') }; };
  const rows = [];
  for (const m of list) {
    errs = []; const r = { id: m.id, title: m.title, kind: m.kind, built: false, painted: false, explained: false, controls: 0, responsive: 0, dead: [], tested: new RegExp(`['"\`/]${m.id.replace(/[-]/g, '\\-')}['"\`]`).test(testSrc), errors: [] };
    try {
      await p.goto(BASE + 'learn.html#/lab/' + m.id); await p.waitForTimeout(400);
      await p.waitForSelector('.lab__canvas', { timeout: 30000 }).catch(async () => { await p.goto('about:blank'); await p.goto(BASE + 'learn.html#/lab/' + m.id); await p.waitForSelector('.lab__canvas', { timeout: 40000 }); r.retried = true; }); await p.waitForTimeout(1500);
      const s0 = await sig(); r.built = !!s0 && !s0.err; r.painted = !!s0 && (s0.px > 50 || !!(await p.$('.lab__canvas .jxgbox, .lab__canvas .lab-jxg svg, .lab__canvas svg'))); r.explained = !!s0 && /\d/.test(s0.ex);
      const ctrls = await p.$$eval('.lab__side input[type=range], .lab__side select, .lab__side input[type=checkbox]', els => els.map((e, i) => ({ i, visible: !!(e.offsetParent || e.getClientRects().length) && !e.closest('[hidden]'), type: e.type || e.tagName.toLowerCase(), label: (e.getAttribute('aria-label') || (e.closest('label') && e.closest('label').innerText) || e.name || e.id || '').trim().split('\n')[0].slice(0, 40) })));
      const vis = ctrls.filter(x => x.visible); r.controls = vis.length; r.hidden_controls = ctrls.length - vis.length;
      let l0 = await look(); await p.waitForTimeout(450); let l1 = await look(); r.animated = l0.img !== l1.img;
      if (r.animated) { // pause a running simulation so a control's effect can be seen in the picture
        const paused = await p.evaluate(() => { const b = document.querySelector('.lab__side [data-key="play"]'); if (b && /❚❚|Pause/.test(b.textContent)) { b.click(); return true; } return false; });
        if (paused) { await p.waitForTimeout(400); l0 = await look(); await p.waitForTimeout(450); l1 = await look(); r.animated = l0.img !== l1.img; r.paused = true; } }
      for (const cinfo of vis.slice(0, 6)) {
        if (/^Speed/.test(cinfo.label) && cinfo.type.startsWith('select')) { // a playback-rate control: measure simulated time per real second at 1× and at 4×
          const rate = await p.evaluate(async i => { const e = document.querySelectorAll('.lab__side input[type=range], .lab__side select, .lab__side input[type=checkbox]')[i], play = document.querySelector('.lab__side [data-key="play"]'); const st = () => (window.ERLY_LAB && ERLY_LAB.state ? +ERLY_LAB.state().t : NaN);
            const restart = [...document.querySelectorAll('.lab__side button')].find(b => /Restart|↺/.test(b.textContent)); const setSp = v => { e.value = String(v); e.dispatchEvent(new Event('change', { bubbles: true })); e.dispatchEvent(new Event('input', { bubbles: true })); };
            const measure = async v => { setSp(v); if (restart) restart.click(); await new Promise(r0 => setTimeout(r0, 150)); if (play && !/❚❚|Pause/.test(play.textContent)) play.click(); const t0 = st(), w0 = performance.now(); await new Promise(r0 => setTimeout(r0, 700)); return (st() - t0) / ((performance.now() - w0) / 1000); };
            const a = await measure(1), b = await measure(4); setSp(1); if (play && /❚❚|Pause/.test(play.textContent)) play.click(); return [a, b]; }, cinfo.i);
          r.speed = rate; if (rate[0] > 0 && rate[1] > rate[0] * 1.8) r.responsive++; else r.dead.push(`Speed (sim-time rate 1×: ${(+rate[0]).toFixed(2)}/s, 4×: ${(+rate[1]).toFixed(2)}/s)`); continue; }
        const before = await look();
        await p.evaluate(i => { const e = document.querySelectorAll('.lab__side input[type=range], .lab__side select, .lab__side input[type=checkbox]')[i]; if (!e) return;
          if (e.type === 'range') { const mn = +e.min || 0, mx = e.max === '' ? 100 : +e.max, v = +e.value; e.value = String(Math.abs(v - mx) > Math.abs(v - mn) ? mn + (mx - mn) * 0.85 : mn + (mx - mn) * 0.15); }
          else if (e.tagName === 'SELECT') { e.selectedIndex = (e.selectedIndex + 1) % Math.max(1, e.options.length); }
          else e.checked = !e.checked;
          e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, cinfo.i);
        await p.waitForTimeout(500);
        const after = await look(); const changed = after.txt !== before.txt || (!r.animated && after.img !== before.img); if (changed || (r.animated && /^Speed/.test(cinfo.label))) r.responsive++; else r.dead.push((cinfo.label || cinfo.type) + (r.animated ? ' (animated model: readouts unchanged)' : ''));
      }
      r.tested_controls = Math.min(6, vis.length);
    } catch (e) { r.errors.push(String(e.message).split('\n')[0]); }
    r.errors.push(...errs.slice(0, 3)); rows.push(r);
    process.stdout.write(`${r.built && r.painted && !r.errors.length && !r.dead.length ? '.' : 'x'}`);
  }
  await b.close();
  const ok = rows.filter(r => r.built && r.painted && !r.errors.length && !r.dead.length);
  fs.mkdirSync(path.join(ROOT, 'docs/bench'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs/bench/visual-lab-audit.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), total: rows.length, rows }, null, 1));
  const y = v => (v ? 'yes' : '**no**');
  const md = [`# ERLY Visual Lab audit`, '',
    `Generated by \`tools/audit-visual-lab.js\` on ${new Date().toISOString().slice(0, 10)} — every model was opened in headless Chromium through the Learning Studio (\`#/lab/<id>\`).`, '',
    `**${rows.length} models audited · ${ok.length} passed every automated check · ${rows.length - ok.length} flagged.**`, '',
    'What the checks prove and what they do not:',
    '- **built / painted / explained / controls respond** are mechanical checks: the model mounts without an error, draws something, explains itself with numbers, and each control (up to six per model) visibly changes the model.',
    '- They do **not** prove the physics or maths is right. Correctness is proven only where an independent numeric test exists — the **tested** column (a test in `tests/e2e` refers to the model by its id). Models without one have not had their numbers independently checked in this audit.',
    '- A control flagged as not responding may be legitimate (for example a setting that only matters in another mode) — each flag needs a human look, listed below.', '',
    '| Model | Kind | Built | Painted | Explains with numbers | Controls moved / responded | Independent test | Notes |', '|---|---|---|---|---|---|---|---|',
    ...rows.map(r => `| \`${r.id}\` ${r.title.replace(/\|/g, '/')} | ${r.kind.replace(/\|/g, '/')} | ${y(r.built)} | ${y(r.painted)} | ${y(r.explained)} | ${r.tested_controls || 0} / ${r.responsive} | ${r.tested ? 'yes' : '—'} | ${[...r.dead.map(d => 'no visible change: ' + d), ...r.errors].join('; ').replace(/\|/g, '/').slice(0, 200)} |`), '',
    `Independent numeric tests exist for ${rows.filter(r => r.tested).length} of ${rows.length} models.`].join('\n');
  fs.writeFileSync(path.join(ROOT, 'docs/ERLY-VISUAL-LAB-AUDIT.md'), md + '\n');
  console.log(`\n${rows.length} models · ${ok.length} clean · flagged: ${rows.filter(r => !ok.includes(r)).map(r => r.id + (r.dead.length ? '[dead:' + r.dead.join(',') + ']' : '') + (r.errors.length ? '[err]' : '') + (!r.painted ? '[blank]' : '')).join(' ')}`);
})().catch(e => { console.error(e); process.exit(1); });
