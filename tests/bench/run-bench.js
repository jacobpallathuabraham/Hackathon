// ERLY visual benchmark runner (v18). Executes every scenario in tests/bench/scenarios.js in a real browser and
// writes docs/bench/visual-bench-results.json + .md. Per scenario: interpretation (router picks the engine for the
// question), accuracy (state vs independent values), interaction (a control changes the model), render (non-blank).
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/bench/run-bench.js
'use strict';
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const { scenarios, ALLOCATION, bucket } = require('./scenarios.js');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const get = (o, p) => String(p).split('.').reduce((a, k) => (a == null ? a : a[k]), o);

function validate(s, st) {
  const fails = [];
  for (const c of s.check || []) {
    if (c.roots) { const kp = (get(st, 'keyPoints') || []).filter(k => k.type === 'root').map(k => k.x).sort((a, b) => a - b); const ok = kp.length === c.roots.length && kp.every((x, i) => Math.abs(x - c.roots[i]) <= c.tol); if (!ok) fails.push(`roots ${JSON.stringify(kp)} ≠ ${JSON.stringify(c.roots)}`); continue; }
    if (c.keyMatch) { const m = get(st, c.path) || {}; const k = Object.keys(m).find(x => c.keyMatch.test(x)); const v = k ? m[k] : undefined; if (!(typeof v === 'number' && Math.abs(v - c.equals) <= c.tol * (c.rel ? Math.abs(c.equals) : 1))) fails.push(`${c.path}[${c.keyMatch}] ${v} ≠ ${c.equals}`); continue; }
    if (c.node) { const i = (st.order || []).indexOf(c.node); const v = i >= 0 ? st.V[i] : undefined; if (!(typeof v === 'number' && Math.abs(v - c.equals) <= c.tol)) fails.push(`V(${c.node}) ${v} ≠ ${c.equals}`); continue; }
    if (c.array) { const a = get(st, c.path) || []; if (!(a.length === c.array.length && a.every((x, i) => Math.abs(x - c.array[i]) <= c.tol * Math.max(1, Math.abs(c.array[i]))))) fails.push(`${c.path} ${JSON.stringify(a)} ≠ ${JSON.stringify(c.array)}`); continue; }
    if (c.identity) { const [l, r] = c.identity.split('-'); const v = get(st, c.path), w = get(st, l) - get(st, r); if (!(Math.abs(v - w) <= c.tol)) fails.push(`${c.path} ${v} ≠ ${c.identity} ${w}`); continue; }
    if (c.between) { const v = get(st, c.path); if (!(v >= c.between[0] && v <= c.between[1])) fails.push(`${c.path} ${v} outside ${c.between}`); continue; }
    const v = get(st, c.path);
    if (c.equals === null) { if (v != null) fails.push(`${c.path} ${v} should be none`); continue; }
    if (typeof c.equals === 'number') { const tol = (c.tol || 0) * (c.rel ? Math.max(1e-300, Math.abs(c.equals)) : 1); if (!(typeof v === 'number' && Math.abs(v - c.equals) <= tol)) fails.push(`${c.path} ${v} ≠ ${c.equals}`); }
    else if (v !== c.equals) fails.push(`${c.path} ${JSON.stringify(v)} ≠ ${JSON.stringify(c.equals)}`);
  }
  return fails;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('acubins-role', 'student'); localStorage.setItem('erly-theme', 'light'); });
  let p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + 'student.html'); await p.waitForTimeout(1500);
  const results = [];
  for (const [i, s] of scenarios.entries()) {
    if (i && i % 120 === 0) { await p.close(); p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); await p.goto(BASE + 'student.html'); await p.waitForTimeout(1200); } // keep memory bounded
    const t0 = Date.now();
    const r = await p.evaluate(async s => {
      const L = window.ERLY_LAB, out = { interp: null, opened: false, state: null, after: null, render: null, error: null, responseOk: null };
      try {
        const top = L.candidates(s.q)[0]; out.interp = top ? top.id : null;
        if (s.via === 'handle') { const h = await L.handle(s.q); out.opened = !!(L.current() && L.current().engine.id === s.engine); out.reply = h && h.text; }
        else { await L.open(s.engine, s.set ? { set: s.set } : (s.params || {})); out.opened = true; }
        await new Promise(r => setTimeout(r, 120));
        const cur = L.current(); if (!cur) throw new Error('no model');
        const api = cur.inst.api;
        if (api && api.st) api.st.running = false;
        if (s.run && api && api.run) api.run(s.run);
        out.state = JSON.parse(JSON.stringify(L.state()));
        if (s.response && api) { const v0 = (s.response.path.split('.').reduce((a, k) => a && a[k], out.state)); cur.inst.set(s.response.key, s.response.value); api.st.running = false; api.run(s.response.run); const st2 = L.state(); const v1 = s.response.path.split('.').reduce((a, k) => a && a[k], st2); out.responseOk = s.response.dir === 'up' ? v1 > v0 : v1 < v0; out.response = [v0, v1]; }
        if (s.tweak) { const before = JSON.stringify(s.tweak.path.split('.').reduce((a, k) => a && a[k], out.state)); cur.inst.set(s.tweak.key, s.tweak.value); if (api && api.st) api.st.running = false; await new Promise(r => setTimeout(r, 30)); const st2 = L.state(); out.after = JSON.stringify(s.tweak.path.split('.').reduce((a, k) => a && a[k], st2)); out.changed = out.after !== before; }
        if (s.render) { try { cur.inst.redraw && cur.inst.redraw(); } catch (e) { /* ok */ } await new Promise(r => setTimeout(r, 60)); const cv = cur.inst.canvas ? cur.inst.canvas() : document.querySelector('.lab__canvas canvas');
          if (cv && cv.getContext) { let ink = 0, n = 0; try { const g2 = cv.getContext('2d'); if (g2) { const W = cv.width, H = cv.height, d = g2.getImageData(0, 0, W, H).data, bg = [d[0], d[1], d[2]]; for (let k = 0; k < d.length; k += 4 * 97) { n++; if (Math.abs(d[k] - bg[0]) + Math.abs(d[k + 1] - bg[1]) + Math.abs(d[k + 2] - bg[2]) > 40) ink++; } } else { const c2 = document.createElement('canvas'); c2.width = 64; c2.height = 64; const x = c2.getContext('2d'); x.drawImage(cv, 0, 0, 64, 64); const d = x.getImageData(0, 0, 64, 64).data, bg = [d[0], d[1], d[2]]; for (let k = 0; k < d.length; k += 4) { n++; if (Math.abs(d[k] - bg[0]) + Math.abs(d[k + 1] - bg[1]) + Math.abs(d[k + 2] - bg[2]) > 40) ink++; } } } catch (e) { ink = -1; } out.render = ink > 0; } else { const sv = document.querySelector('.lab__canvas svg, .lab__canvas .jxgbox'); out.render = !!sv; } }
      } catch (e) { out.error = String(e.message || e).slice(0, 200); }
      return out;
    }, s);
    const fails = r.state ? validate(s, r.state) : ['no state'];
    if (s.response) { if (!r.responseOk) fails.push(`response ${s.response.key}→${s.response.value}: ${s.response.path} ${JSON.stringify(r.response)} not ${s.response.dir}`); }
    const res = { id: s.id, subject: s.subject, bucket: bucket(s), level: s.level, topic: s.topic, engine: s.engine, q: s.q, behaviour: s.behaviour || null,
      interpretation: r.interp === s.engine, interpreted: r.interp, executed: !r.error && !!r.state, accurate: !r.error && !!r.state && fails.length === 0, fails, interaction: s.tweak ? !!r.changed : null, render: s.render ? r.render : null, error: r.error, ms: Date.now() - t0 };
    res.pass = res.executed && res.accurate && (res.interaction !== false) && (res.render !== false);
    results.push(res);
    if (!res.pass) console.log('✗', s.id, s.engine, s.topic, '—', (r.error || fails.join('; ') || (res.render === false ? 'blank render' : '') || (res.interaction === false ? 'control had no effect' : '')).slice(0, 200));
  }
  await b.close();
  const by = {}; results.forEach(r => { const k = r.bucket; by[k] = by[k] || { designed: 0, executed: 0, accurate: 0, interpretation: 0, interaction: 0, interactionTested: 0, render: 0, renderTested: 0, pass: 0 }; const o = by[k]; o.designed++; if (r.executed) o.executed++; if (r.accurate) o.accurate++; if (r.interpretation) o.interpretation++; if (r.interaction !== null) { o.interactionTested++; if (r.interaction) o.interaction++; } if (r.render !== null) { o.renderTested++; if (r.render) o.render++; } if (r.pass) o.pass++; });
  const tot = Object.values(by).reduce((a, o) => { Object.keys(o).forEach(k => { a[k] = (a[k] || 0) + o[k]; }); return a; }, {});
  const dir = path.join(__dirname, '..', '..', 'docs', 'bench'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'visual-bench-results.json'), JSON.stringify({ date: new Date().toISOString(), totals: tot, bySubject: by, allocation: ALLOCATION, errors: errors.slice(0, 20), results }, null, 1));
  const rows = Object.keys(ALLOCATION).map(k => { const o = by[k] || {}; return `| ${k} | ${ALLOCATION[k]} | ${o.designed || 0} | ${o.executed || 0} | ${o.accurate || 0} | ${o.interpretation || 0} | ${o.interaction || 0}/${o.interactionTested || 0} | ${o.render || 0}/${o.renderTested || 0} | ${o.pass || 0} | ${Math.max(0, ALLOCATION[k] - (o.designed || 0))} |`; });
  const md = `# Noor visual benchmark — results\n\nRun ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC in Chromium, from \`tests/bench/run-bench.js\`. Expected values are computed independently in \`tests/bench/scenarios.js\`.\n\n| Subject | Target | Implemented & executable | Executed | Accurate (independent check) | Router picked the engine from the question | Control changes the model | Renders | All checks pass | Short of target |\n|---|---|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n| **Total** | **${Object.values(ALLOCATION).reduce((a, b) => a + b, 0)}** | **${tot.designed}** | **${tot.executed}** | **${tot.accurate}** | **${tot.interpretation}** | **${tot.interaction}/${tot.interactionTested}** | **${tot.render}/${tot.renderTested}** | **${tot.pass}** | **${Math.max(0, Object.values(ALLOCATION).reduce((a, b) => a + b, 0) - tot.designed)}** |\n\nFailures are listed in the JSON with their reasons. “Router picked the engine” uses the scenario's own question text; question wordings are templated per family, so it measures routing on clear wordings, not on every way a student might phrase it.\n`;
  fs.writeFileSync(path.join(dir, 'visual-bench-results.md'), md);
  console.log(md);
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
})();
