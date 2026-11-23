// Writes /learn-guide/: the Learning Studio's content directory as plain HTML pages that need no JavaScript,
// no sign-in and no network. It does not invent content. It opens the real Studio in a browser (read-only
// inspection mode), asks the Studio's own directory renderer (assets/js/learn/ls-inspect.js) for each page,
// and saves the result. It also refreshes the short static subject list inside learn.html, which is what a
// tool sees before any JavaScript runs.
//
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tools/build-learn-guide.js
//
// Re-run it whenever lessons, experiences or subjects change; tests/e2e/learn-inspect.e2e.js fails if the
// guide no longer matches the Studio.
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'learn-guide');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const page = (title, desc, body) => `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="icon" href="../assets/img/mark.svg" type="image/svg+xml">
<style>
  :root { --ink: #1c1b19; --muted: #5b574f; --line: rgba(0,0,0,.14); --surface: #fffdf9; --surface-2: #efe9dd; --bg: #f4efe6; --accent: #b3341d; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --ink: #f2eee6; --muted: #b9b2a5; --line: rgba(255,255,255,.16); --surface: #1d1b19; --surface-2: #2a2724; --bg: #121110; --accent: #ff9b7a; } }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 1rem/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .ls-kicker { font: 700 .75rem ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 0; }
  .ls-lead { font-size: 1.1rem; color: var(--muted); }
  .site { max-width: 980px; margin: 0 auto; padding: 12px clamp(14px, 3vw, 28px); font-size: .9rem; display: flex; gap: 16px; flex-wrap: wrap; }
  .site a { color: var(--accent); }
  .foot { max-width: 980px; margin: 0 auto; padding: 0 clamp(14px, 3vw, 28px) 40px; color: var(--muted); font-size: .85rem; }
</style>
<link rel="stylesheet" href="../assets/css/learn-inspect.css">
</head>
<body>
<header class="site"><a href="index.html">Learning Studio content directory</a><a href="../learn.html?inspect=1">Open the live Studio (read-only, no sign-in)</a><a href="universe.html">The 3D universe and astronaut (screenshots)</a><a href="../index.html">ERLY home</a></header>
<main id="main">
${body}
</main>
<footer class="foot"><p>Generated from the Learning Studio's own data by tools/build-learn-guide.js. Acubins University is a fictional institution used to demonstrate ERLY. Lessons and questions are ERLY demonstration content, not official exam material. Interactive experiences and Visual Lab models run only in the live Studio; here they are described in text.</p></footer>
</body>
</html>
`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + 'learn.html?inspect=1#/home'); await p.waitForFunction(() => window.LS && LS.inspect, null, { timeout: 30000 });
  const pages = await p.evaluate(() => LS.inspect.staticPages());
  const subs = await p.evaluate(() => LS.inspect.subjects());
  await b.close();
  if (errs.length) throw new Error('page errors while building: ' + errs.join(' | '));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'index.html'), page('Learning Studio content directory · ERLY', 'Every subject, lesson, interactive experience, Visual Lab model, reading, video and practice question in the ERLY Learning Studio, as plain HTML.', pages.index));
  for (const s of subs) fs.writeFileSync(path.join(OUT, s.id + '.html'), page(`${s.name} · Learning Studio content · ERLY`, `${s.name} in the ERLY Learning Studio: ${s.blurb}`, pages[s.id]));
  // the static list inside learn.html (shown before JavaScript runs; the Studio replaces it when it starts)
  const html = fs.readFileSync(path.join(ROOT, 'learn.html'), 'utf8');
  const block = `<!-- static-directory:start (written by tools/build-learn-guide.js) -->
  <section class="ls-static" aria-labelledby="lsStaticH">
    <h1 id="lsStaticH">ERLY Learning Studio</h1>
    <p>Lessons, interactive experiences, a Visual Lab of computed models, readings, videos, practice and flashcards across ${subs.length} subjects. The Studio itself runs with JavaScript after the demo sign-in. The same content is available without either:</p>
    <ul>
      <li><a href="learn-guide/index.html">The full content directory as plain HTML</a> (no JavaScript needed)</li>
      <li><a href="learn.html?inspect=1">The live Studio in read-only inspection mode</a> (no sign-in; nothing is saved)</li>
    </ul>
    <h2>Subjects</h2>
    <ul>
${subs.map(s => `      <li><a href="learn-guide/${s.id}.html">${esc(s.name)}</a> — ${esc(s.blurb)} <a href="learn.html?inspect=1&amp;subject=${s.id}">Open live</a></li>`).join('\n')}
    </ul>
  </section>
  <!-- static-directory:end -->`;
  const re = /<!-- static-directory:start[\s\S]*?<!-- static-directory:end -->/;
  const next = re.test(html) ? html.replace(re, block) : html.replace('Opening the Learning Studio…</p>', 'Opening the Learning Studio…</p>\n  ' + block);
  if (next === html && !re.test(html)) throw new Error('could not place the static directory in learn.html');
  fs.writeFileSync(path.join(ROOT, 'learn.html'), next);
  console.log('wrote', 1 + subs.length, 'pages to learn-guide/ and refreshed the static list in learn.html');
})().catch(e => { console.error(e); process.exit(1); });
