// v18 syllabus coverage in NORMAL Noor chat. Every syllabus model registered by assets/js/lab/syl-*.js carries a probe —
// a question a student might really type. Each probe is typed into the ordinary chat box (the Visual Lab is never opened
// first) and must produce that model INSIDE the reply, rendered, with an explanation. A set of factual / non-visual
// questions must NOT get a forced model. Results: docs/bench/syllabus-chat.json.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/syllabus-chat.e2e.js
'use strict';
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const NEG = ['Who discovered the electron?', 'What is the capital of France?', 'When was the periodic table first published?', 'Who wrote the theory of evolution?', 'What does NEET stand for?', 'How many marks is JEE Main out of?', 'Define a mole.', 'Translate hello into Arabic', 'Can you help me plan my week?', 'Tell me a joke', 'What is your name?', 'Who invented the light bulb?', 'Summarise the French Revolution in two lines', 'What year did India become independent?', 'Recommend a good book on economics'];

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  const make = async () => { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.addInitScript(() => sessionStorage.setItem('acubins-role', 'student')); const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200); await p.click('.cmp-launch'); await p.waitForTimeout(700); return p; };
  const ask = async (p, q) => { const n = await p.locator('.cmsg--ai').count(); await p.fill('#cmpText', q); await p.press('#cmpText', 'Enter'); await p.waitForFunction(n => document.querySelectorAll('.cmsg--ai').length > n && !document.querySelector('.cmsg.is-writing') && !document.querySelector('.cmsg--typing'), n, { timeout: 25000 }); await p.waitForTimeout(450); return p.evaluate(() => [...document.querySelectorAll('.cmsg--ai')].pop().innerText); };
  let p = await make();
  const list = await p.evaluate(() => ERLY_LAB.syl.list.map(x => ({ id: x.id, probe: x.probe, unit: x.unit, kind: x.kind })));
  const rows = [];
  for (const [i, it] of list.entries()) {
    if (i && i % 25 === 0) { await p.context().close(); p = await make(); }
    let r = { id: it.id, unit: it.unit, probe: it.probe };
    try {
      const reply = await ask(p, it.probe);
      const L = await p.evaluate(() => ({ id: ERLY_LAB.current() ? ERLY_LAB.current().engine.id : null, inline: ERLY_LAB.isInline(), inLog: !!document.querySelector('#cmpLog .lab.lab--inline'), lab: document.documentElement.classList.contains('lab-on') }));
      await p.waitForTimeout(150);
      const ink = await p.evaluate(() => { const cv = ERLY_LAB.current() && ERLY_LAB.current().inst.canvas ? ERLY_LAB.current().inst.canvas() : null; if (!cv) return -1; const g = cv.getContext('2d'); if (!g) return 999; const d = g.getImageData(0, 0, cv.width, cv.height).data; let k = 0; for (let j = 0; j < d.length; j += 4 * 61) if (Math.abs(d[j] - d[0]) + Math.abs(d[j + 1] - d[1]) + Math.abs(d[j + 2] - d[2]) > 40) k++; return k; });
      Object.assign(r, { got: L.id, inline: L.inline && L.inLog, fullScreenLab: L.lab, replyChars: reply.length, ink, pass: L.id === it.id && L.inline && L.inLog && !L.lab && reply.length > 60 && ink > 10 });
    } catch (e) { r.err = String(e.message || e).slice(0, 160); r.pass = false; }
    rows.push(r); if (!r.pass) console.log('✗', it.id, '→', r.got, r.err || `inline=${r.inline} ink=${r.ink} chars=${r.replyChars}`);
  }
  await p.context().close(); p = await make();
  const neg = [];
  for (const q of NEG) { let r = { q }; try { await ask(p, q); r.model = await p.evaluate(() => (ERLY_LAB.current() && document.querySelector('#cmpLog .lab.lab--inline') ? ERLY_LAB.current().engine.id : null)); await p.evaluate(() => { if (ERLY_LAB.current()) ERLY_LAB.close(); }); } catch (e) { r.err = String(e.message).slice(0, 120); } r.pass = !r.model; neg.push(r); if (!r.pass) console.log('✗ forced visual on a factual question:', q, '→', r.model || r.err); }
  await b.close();
  const pass = rows.filter(r => r.pass).length, npass = neg.filter(r => r.pass).length, byUnit = {};
  rows.forEach(r => { const k = String(r.unit).split(' · ')[0]; byUnit[k] = byUnit[k] || [0, 0]; byUnit[k][1]++; if (r.pass) byUnit[k][0]++; });
  fs.writeFileSync(path.join(__dirname, '..', '..', 'docs', 'bench', 'syllabus-chat.json'), JSON.stringify({ date: new Date().toISOString(), models: rows.length, pass, negatives: neg.length, negPass: npass, byExam: byUnit, rows, neg }, null, 1));
  console.log(`\nsyllabus probes in normal chat: ${pass}/${rows.length} opened the right model inline`); console.log(`factual questions with no forced visual: ${npass}/${neg.length}`); Object.entries(byUnit).forEach(([k, v]) => console.log(`   ${k}: ${v[0]}/${v[1]}`));
  if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 6));
  process.exit(pass === rows.length && npass === neg.length && !errors.length ? 0 : 1);
})();
