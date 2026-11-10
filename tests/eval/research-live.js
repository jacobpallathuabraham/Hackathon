// Live research check: runs Noor's research engine in a real browser against the REAL open APIs and records
// exactly what came back (status, sources, top passage). Results depend on the network and the day.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/eval/research-live.js
'use strict';
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const QUESTIONS = ['Explain how a four-stroke engine works', 'Compare the economies of Japan and Germany', 'What does research say about sleep and memory?', 'Arsenal latest results', 'Who is Queen the band?', 'Pros and cons of nuclear power', 'Describe the geography of Japan', 'Explain how neural networks work'];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(BASE + 'student.html').catch(() => {});
  await p.addScriptTag({ url: BASE + 'assets/js/noor/research.js' });
  const rows = [];
  for (const q of QUESTIONS) {
    const r = await p.evaluate(async q => { const t0 = performance.now(); const r = await ERLY_RESEARCH.retrieve(q, { timeoutMs: 12000 }); return { q, ms: Math.round(performance.now() - t0), plan: { kinds: r.plan.kinds, freshness: r.plan.freshness, compare: r.plan.compare }, status: r.status, evidence: r.evidence, sources: [...new Set(r.passages.map(x => x.source + ': ' + x.title))], top: r.passages[0] ? r.passages[0].text.slice(0, 160) : null }; }, q);
    rows.push(r); console.log(`${r.evidence.padEnd(20)} ${JSON.stringify(r.status)}  ${q}\n    ${r.sources.slice(0, 3).join(' | ')}`);
  }
  await b.close();
  fs.writeFileSync(path.join(__dirname, '..', '..', 'docs', 'research-live.json'), JSON.stringify({ date: new Date().toISOString(), note: 'Real API responses from the development environment (a shared IP that Wikimedia and OpenAlex rate-limit more strictly than a student browser).', rows }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
