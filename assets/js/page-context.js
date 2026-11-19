/* ERLY — what is on the student's screen, for Noor (v17).

   "Can you explain what I'm looking at?" needs Noor to know the visible part of the page. This module reads it
   at the moment the question is asked, from the page's own DOM (never a screenshot, never the camera, never in
   the background):

     - the page title and the section in view (the nearest heading above the middle of the screen)
     - the text of the blocks that are actually visible (paragraphs, list items, table cells, captions)
     - the student's selection, if they made one
     - visible tables (caption, headers, the first rows), figures (only their labels / alt text), and maths
     - what is open on top: the Learning Studio page, a video (title, position, authored key points),
       Noor Lab's model, or an interactive visual

   It also says what it cannot see: the inside of pictures and drawings beyond their labels, and what is said in
   a video when no transcript is available. Nothing here is stored or sent; noor-brain decides what to do with a
   snapshot (an AI answer only after the student pressed Send, with the page named on the reply). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.ERLY = root.ERLY || {}; root.ERLY.pageContext = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SKIP = 'script, style, noscript, template, [hidden], [aria-hidden="true"], .cmp, .cmp-launch, .a11y, .a11y-fab, .a11y-reader, .toast, .cnudge, .cside, nav, .skip, .a11y-skip';
  const BLOCKS = 'h1, h2, h3, h4, p, li, td, th, figcaption, blockquote, dd, dt, label, .stat b, .stat span, summary';
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const mmss = s => { s = Math.max(0, Math.round(+s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };

  function visible(el, vh) {
    if (!el || !el.getClientRects().length) return false;
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= vh || r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && +cs.opacity > 0.05;
  }
  const skipped = el => !!(el.closest && el.closest(SKIP));

  // the layer the student is looking at: an open overlay (video room, reading studio) wins over the page behind
  function scope() {
    const vr = document.querySelector('.vroom:not([hidden])');
    if (vr) return vr;
    const st = document.querySelector('.studio.is-open, .studio:not([hidden]).is-on');
    if (st) return st;
    return document.querySelector('main') || document.body;
  }

  // the student's last selection outside Noor: tapping Noor's button can clear the live selection, so it is kept
  // (text only, in memory) for two minutes and dropped as soon as a new selection or a click elsewhere replaces it
  let lastSel = null;
  if (typeof document !== 'undefined') document.addEventListener('selectionchange', () => {
    try {
      const g = getSelection(), n = g && g.anchorNode, el = n && (n.nodeType === 1 ? n : n.parentElement);
      if (el && skipped(el)) return; // selecting inside Noor doesn't replace it
      const t = g && !g.isCollapsed ? clean(String(g)) : '';
      if (t) lastSel = { text: t.slice(0, 1200), at: Date.now() };
      else if (lastSel && Date.now() - lastSel.at > 1500 && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('.cmp, .cmp-launch'))) lastSel = null;
    } catch (e) { /* no selection API */ }
  });
  function snapshot(o) {
    o = o || {};
    const vh = innerHeight, root = scope();
    const out = { at: Date.now(), url: location.pathname.replace(/^.*\//, '') || 'index.html', title: clean(document.title), section: '', headings: [], text: '', selection: '', tables: [], figures: [], maths: [], video: null, reading: null, lab: null, visual: null, cannot: [] };
    // selection (outside Noor)
    try { const g = getSelection(); if (g && !g.isCollapsed && g.anchorNode && !(g.anchorNode.parentElement && skipped(g.anchorNode.parentElement))) out.selection = clean(String(g)).slice(0, 1200); } catch (e) { /* no selection API */ }
    if (!out.selection && lastSel && Date.now() - lastSel.at < 120e3) out.selection = lastSel.text;
    // section in view: the last heading above the middle of the screen, else the first visible heading
    const hs = [...root.querySelectorAll('h1, h2, h3')].filter(h => !skipped(h) && h.getClientRects().length);
    const mid = vh * 0.45;
    let sec = null;
    for (const h of hs) { const t = h.getBoundingClientRect().top; if (t <= mid) sec = h; else break; }
    if (!sec) sec = hs.find(h => visible(h, vh)) || null;
    out.section = sec ? clean(sec.textContent).slice(0, 140) : '';
    out.headings = hs.filter(h => visible(h, vh)).map(h => clean(h.textContent).slice(0, 120)).filter(Boolean).slice(0, 8);
    // visible text, in reading order, without repeating nested blocks
    const seen = new Set(), parts = [];
    let n = 0;
    for (const el of root.querySelectorAll(BLOCKS)) {
      if (skipped(el) || !visible(el, vh)) continue;
      if ([...seen].some(p => p.contains(el))) continue;
      const t = clean(el.innerText || el.textContent);
      if (t.length < 2) continue;
      seen.add(el); parts.push(t); n += t.length;
      if (n > (o.max || 3500)) break;
    }
    out.text = parts.join('\n').slice(0, o.max || 3500);
    // tables
    for (const tb of root.querySelectorAll('table')) {
      if (skipped(tb) || !visible(tb, vh)) continue;
      const rows = [...tb.rows].map(r => [...r.cells].map(c => clean(c.textContent).slice(0, 60)));
      out.tables.push({ caption: clean(tb.caption && tb.caption.textContent) || clean(tb.getAttribute('aria-label')), head: rows[0] || [], rows: rows.slice(1, 6), size: [Math.max(0, rows.length - 1), (rows[0] || []).length] });
      if (out.tables.length >= 3) break;
    }
    // figures: labels only — the picture itself is not looked at
    for (const f of root.querySelectorAll('img, svg[role="img"], svg[aria-label], canvas, figure, [role="img"]')) {
      if (skipped(f) || !visible(f, vh)) continue;
      const r = f.getBoundingClientRect(); if (r.width < 60 || r.height < 40) continue;
      const lab = clean(f.getAttribute('alt') || f.getAttribute('aria-label') || (f.querySelector && f.querySelector('figcaption') && f.querySelector('figcaption').textContent) || (f.querySelector && f.querySelector('title') && f.querySelector('title').textContent));
      out.figures.push({ kind: f.tagName.toLowerCase(), label: lab.slice(0, 160) });
      if (out.figures.length >= 6) break;
    }
    if (out.figures.some(f => !f.label)) out.cannot.push('the contents of pictures and drawings that have no label');
    else if (out.figures.length) out.cannot.push('the pictures themselves (only their labels)');
    // maths written on the page
    for (const m of root.querySelectorAll('math, .katex, [data-math]')) {
      if (skipped(m) || !visible(m, vh)) continue;
      const a = m.querySelector && m.querySelector('annotation');
      out.maths.push(clean((a && a.textContent) || m.getAttribute('data-math') || m.textContent).slice(0, 120));
      if (out.maths.length >= 6) break;
    }
    // what is open on top
    const E = (typeof window !== 'undefined' && window.ERLY) || {};
    try { const v = E.videos && E.videos.current && E.videos.current(); if (v) { out.video = v; if (!v.transcript) out.cannot.push('what is said in the video (there is no transcript for it here)'); } } catch (e) { /* no videos */ }
    try { if (E.reader && E.reader.isOpen && E.reader.isOpen()) out.reading = E.reader.contextFor(); } catch (e) { /* no studio */ }
    try { const L = window.ERLY_LAB; if (L && L.current && L.current()) { const c = L.current(); out.lab = { id: c.engine && c.engine.id, title: c.engine && (c.engine.title || c.engine.id), state: L.state() }; } } catch (e) { /* no lab */ }
    try { const vz = E.companion && E.companion.tools && E.companion.tools.visual && E.companion.tools.visual.current(); if (vz && vz.scene) out.visual = { title: vz.scene.title[0], step: vz.stageIndex, steps: vz.scene.stages.map(s => s.title[0]) }; } catch (e) { /* no visual */ }
    return out;
  }

  // the same shape as the Learning Studio's context, so Noor's AI path can use it unchanged
  function forNoor(s) {
    s = s || snapshot();
    const L = [];
    L.push(`Screen snapshot taken ${new Date(s.at).toTimeString().slice(0, 5)} on ERLY page "${s.title}".`);
    if (s.section) L.push(`Section in view: ${s.section}`);
    if (s.headings.length) L.push(`Visible headings: ${s.headings.join(' | ')}`);
    if (s.video) L.push(`Video open: "${s.video.title}" (${s.video.by}) at ${mmss(s.video.time)}${s.video.duration ? ' of ' + mmss(s.video.duration) : ''}, ${s.video.playing ? 'playing' : 'paused'}. ERLY's key points for it: ${s.video.notes.join(' / ')}. No transcript is available, so what is said in the video is unknown.`);
    if (s.reading) L.push(`Learning Studio open: "${s.reading.title}", page ${s.reading.page} — ${s.reading.heading}. Page text: ${String(s.reading.text).slice(0, 1500)}`);
    if (s.lab) L.push(`Noor Lab model open: ${s.lab.title}. State: ${JSON.stringify(s.lab.state || {}).slice(0, 600)}`);
    if (s.visual) L.push(`Interactive visual open: "${s.visual.title}", step ${s.visual.step + 1} of ${s.visual.steps.length}: ${s.visual.steps[s.visual.step] || ''}`);
    s.tables.forEach(t => L.push(`Table${t.caption ? ' "' + t.caption + '"' : ''} (${t.size[0]} rows × ${t.size[1]} columns): ${t.head.join(' | ')}${t.rows.length ? ' — first rows: ' + t.rows.map(r => r.join(' | ')).join(' ; ') : ''}`));
    if (s.figures.length) L.push(`Figures (labels only; the images themselves were not seen): ${s.figures.map(f => f.label || `[unlabelled ${f.kind}]`).join(' | ')}`);
    if (s.maths.length) L.push(`Maths on screen: ${s.maths.join(' | ')}`);
    if (s.cannot.length) L.push(`Not available to Noor: ${s.cannot.join('; ')}.`);
    if (s.text) L.push(`Visible text:\n${s.text}`);
    return { title: s.title.replace(/\s*[—|·-]\s*ERLY.*$/i, '') || 'This page', course: 'ERLY page', page: s.section || 'the visible part', heading: s.section || s.headings[0] || '', text: L.join('\n').slice(0, 3500), quote: s.selection || '', screen: true };
  }

  // an on-device answer when no AI is in use: the page's own words, organised — never a made-up explanation
  function describe(s, lang) {
    const ar = lang === 'ar', T = (en, a) => (ar ? a : en);
    const sentences = String(s.selection || s.text).split(/\n|(?<=[.!?؟])\s+/).map(clean).filter(x => x.length > 30 && x.length < 320 && !/^(menu|skip|sign|log ?out)/i.test(x));
    const key = [], seenK = new Set();
    for (const x of sentences) { const k = x.slice(0, 40).toLowerCase(); if (seenK.has(k)) continue; seenK.add(k); key.push(x); if (key.length >= 5) break; }
    let md = `### ${T('What you’re looking at', 'ما تنظر إليه')}\n`;
    md += `**${s.section || s.headings[0] || s.title}**${s.section && s.title ? T(' — on ', ' — في ') + s.title.replace(/\s*[—|·-]\s*ERLY.*$/i, '') : ''}\n\n`;
    if (s.video) md += `- ${T('Video', 'فيديو')}: **${s.video.title}** (${s.video.by}), ${T('at', 'عند')} ${mmss(s.video.time)}${s.video.duration ? ' / ' + mmss(s.video.duration) : ''}${s.video.playing ? '' : T(' (paused)', ' (متوقف)')}\n`;
    if (s.reading) md += `- ${T('Reading', 'قراءة')}: **${s.reading.title}**, ${T('page', 'صفحة')} ${s.reading.page} — ${s.reading.heading}\n`;
    if (s.lab) md += `- ${T('Noor Lab model', 'نموذج مختبر نور')}: **${s.lab.title}**\n`;
    if (s.visual) md += `- ${T('Interactive visual', 'شرح مرئي')}: **${s.visual.title}**, ${T('step', 'الخطوة')} ${s.visual.step + 1}/${s.visual.steps.length}\n`;
    if (s.selection) md += `\n#### ${T('Your selection', 'تحديدك')}\n> ${s.selection.slice(0, 500)}\n`;
    if (key.length) md += `\n#### ${T('The main points, in the page’s own words', 'النقاط الرئيسية بكلمات الصفحة')}\n${key.map(x => '- ' + x).join('\n')}\n`;
    if (s.video && s.video.notes && s.video.notes.length) md += `\n#### ${T('Key points for this video (written by ERLY)', 'النقاط الأساسية لهذا الفيديو (كتبها إيرلي)')}\n${s.video.notes.map(x => '- ' + x).join('\n')}\n`;
    if (s.tables.length) md += `\n#### ${T('Tables on screen', 'جداول على الشاشة')}\n${s.tables.map(t => `- ${t.caption ? '**' + t.caption + '** — ' : ''}${t.size[0]} ${T('rows', 'صفوف')} × ${t.size[1]} ${T('columns', 'أعمدة')}: ${t.head.join(', ')}`).join('\n')}\n`;
    if (s.figures.length) md += `\n#### ${T('Figures', 'أشكال')}\n${s.figures.map(f => '- ' + (f.label || T(`an unlabelled ${f.kind}`, 'شكل بلا وصف'))).join('\n')}\n`;
    if (s.maths.length) md += `\n#### ${T('Maths on screen', 'رياضيات على الشاشة')}\n${s.maths.map(x => '- `' + x + '`').join('\n')}\n`;
    if (s.cannot.length) md += `\n#### ${T('What I can’t see', 'ما لا أستطيع رؤيته')}\n${s.cannot.map(x => '- ' + x).join('\n')}\n`;
    if (!key.length && !s.tables.length && !s.figures.length && !s.video && !s.reading && !s.lab) md += T('\nThere isn’t readable text in view right now. Scroll to the part you mean and ask again.\n', '\nلا يوجد نص مقروء ظاهر الآن. مرّر إلى الجزء المقصود واسأل مجدداً.\n');
    md += `\n_${T(`This is what was on your screen at ${new Date(s.at).toTimeString().slice(0, 5)}. Scroll or select a part and ask again for a fresh look.`, `هذا ما كان على شاشتك عند ${new Date(s.at).toTimeString().slice(0, 5)}. مرّر أو حدد جزءاً واسأل مجدداً.`)}_`;
    return md;
  }

  const LOOKING = /\b(what(?:'s| is| am i| are we)?\s+(?:i'?m\s+|am i\s+)?(?:looking at|seeing|reading)( right now| here)?|what(?:'s| is) (?:on )?(?:my |the |this )?screen|explain (?:this|what(?:'s| is) (?:on )?(?:my |the )?(?:screen|here)|what i(?:'m| am) (?:looking at|seeing|reading)|this (?:screen|section|part|page)|the (?:screen|section) i'?m on)|what does this (?:page|section|screen|part) (?:show|mean|say)|summari[sz]e (?:this (?:screen|section|page)|what i(?:'m| am) (?:looking at|seeing|reading))|help me understand (?:this|what i'?m (?:looking at|seeing)))\b|ما الذي أنظر إليه|اشرحي? (?:ما على الشاشة|هذا القسم|هذه الشاشة)|ماذا أرى/i;
  const isLooking = t => LOOKING.test(String(t || '').replace(/[‘’ʼ]/g, "'"));
  // "explain 2:30–3:30", "what happens from 1:05 to 1:40", "at 4:10"
  function parseRange(t) {
    t = String(t || '');
    const tm = '(\\d{1,2}):([0-5]\\d)(?::([0-5]\\d))?';
    const sec = (a, b, c) => (c != null ? (+a * 3600 + +b * 60 + +c) : (+a * 60 + +b));
    let m = t.match(new RegExp(tm + '\\s*(?:-|–|—|to|until|till|and|→)\\s*' + tm));
    if (m) { const a = sec(m[1], m[2], m[3]), b = sec(m[4], m[5], m[6]); if (b > a) return { from: a, to: b }; }
    m = t.match(new RegExp('\\b(?:at|around|from|after)\\s+' + tm + '\\b'));
    if (m) { const a = sec(m[1], m[2], m[3]); return { from: a, to: a + 30, single: true }; }
    m = t.match(/\b(?:explain|what(?:'s| is| happens)?|summari[sz]e)\b[^?]*?\b(\d{1,2}):([0-5]\d)\b/i);
    if (m) { const a = +m[1] * 60 + +m[2]; return { from: a, to: a + 30, single: true }; }
    return null;
  }
  // transcript lines inside a range, when a lesson really has one ([{ t: seconds, text }])
  const transcriptSlice = (tr, r) => (Array.isArray(tr) ? tr.filter(x => x.t >= r.from - 2 && x.t <= r.to) : []);
  return { snapshot, forNoor, describe, isLooking, parseRange, transcriptSlice, mmss };
});
