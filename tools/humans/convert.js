const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
 const [mode, dir, a, out] = process.argv.slice(2);
 const b = await chromium.launch(); const p = await b.newPage();
 p.on('console', m => { if (m.type() === 'error') console.log('LOG', m.text().slice(0, 300)); });
 await p.goto('http://localhost:8777/tools/humans/convert.html'); await p.waitForFunction(() => window.__ready);
 const r = mode === 'avatar' ? await p.evaluate(([d, f]) => convertAvatar(d, f), [dir, a]) : await p.evaluate(([d, fs]) => convertAnims(d, fs), [dir, a.split(',')]);
 fs.writeFileSync(out, Buffer.from(r.b64, 'base64'));
 console.log(JSON.stringify(r.report));
 await b.close(); })().catch(e => { console.error(e.message); process.exit(1); });
