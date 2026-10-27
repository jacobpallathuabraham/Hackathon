/* ERLY Reading Studio — on-device study helpers (pure, no DOM).

   - structurePage(items): turns the positioned text runs that pdf.js gives
     for one PDF page into a heading and readable paragraphs (joins lines,
     mends hyphenated words, drops page numbers).
   - summarize / keywords / sentences: a small extractive summariser. It only
     picks sentences that are already in the text — it never writes new
     claims — so it is labelled "auto summary" in the studio.
   - quizFrom / cardsFrom: fill-in-the-gap questions and flashcards built
     from the reading's own sentences and key phrases.
   Everything runs on the student's device. Nothing here is sent anywhere. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_STUDY = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STOP = new Set(('a an the and or but if then than so as of to in on at by for with from into onto over under about after before between through during without within this that these those it its is are was were be been being am do does did doing have has had having not no nor can could should would may might must will shall i you he she we they them his her our their your my me us him there here what which who whom whose when where why how all any both each few more most other some such only own same too very just also one two three first second new used use using can\'t don\'t it\'s let\'s per via however therefore thus while because since although though upon each every much many often called known like eg ie etc').split(/\s+/));

  /* ---------------- PDF text → paragraphs ---------------- */
  // items: [{ str, transform:[a,b,c,d,x,y], width, height, hasEOL }]
  function structurePage(items, pageNo) {
    const lines = [];
    let cur = null;
    (items || []).forEach(it => {
      const s = String(it.str || '');
      const tr = it.transform || [1, 0, 0, 1, 0, 0];
      const x = tr[4], y = tr[5];
      const size = Math.abs(tr[3]) || Math.hypot(tr[2], tr[3]) || it.height || 10;
      if (!s.trim()) { if (cur && s) cur.gapSpace = true; if (it.hasEOL) cur = null; return; }
      if (!cur || Math.abs(y - cur.y) > size * 0.6) {
        cur = { y, x, size, text: s, end: x + (it.width || 0) };
        lines.push(cur);
      } else {
        const gap = x - cur.end;
        const space = cur.gapSpace || gap > size * 0.18;
        cur.text += (space && !/\s$/.test(cur.text) && !/^\s/.test(s) ? ' ' : '') + s;
        cur.end = x + (it.width || 0);
        cur.size = Math.max(cur.size, size);
      }
      cur.gapSpace = false;
      if (it.hasEOL) cur = null;
    });
    const clean = lines.map(l => Object.assign(l, { text: l.text.replace(/\s+/g, ' ').trim() }))
      .filter(l => l.text && !/^(page\s*)?\d{1,4}$/i.test(l.text) && !/^\d+\s*(of|\/)\s*\d+$/i.test(l.text));
    if (!clean.length) return { h: '', paras: [], words: 0 };
    const sizes = clean.map(l => l.size).sort((a, b) => a - b);
    const body = sizes[Math.floor(sizes.length / 2)];
    const gaps = [];
    for (let i = 1; i < clean.length; i++) { const g = clean[i - 1].y - clean[i].y; if (g > 0) gaps.push(g); }
    gaps.sort((a, b) => a - b);
    const lineGap = gaps.length ? gaps[Math.floor(gaps.length * 0.3)] : body * 1.3;
    let heading = '';
    const paras = [];
    let buf = '';
    const flush = () => { const t = buf.replace(/\s+/g, ' ').trim(); if (t) paras.push(t); buf = ''; };
    clean.forEach((l, i) => {
      const isHead = l.size > body * 1.18 && l.text.length < 110 && !/[.,;]$/.test(l.text);
      if (isHead) {
        flush();
        if (!heading && !paras.length) heading = l.text;
        else paras.push('§' + l.text); // a sub-heading inside the page
        return;
      }
      const prev = clean[i - 1];
      const gap = prev ? prev.y - l.y : 0;
      if (prev && (gap > lineGap * 1.55 || gap < 0)) flush();
      if (buf && /[A-Za-z]-$/.test(buf) && /^[a-z]/.test(l.text)) buf = buf.slice(0, -1) + l.text; // mend hyphenation
      else buf += (buf ? ' ' : '') + l.text;
    });
    flush();
    const out = [];
    paras.forEach(p => { if (p[0] === '§') out.push({ text: p.slice(1), sub: true }); else splitLong(p).forEach(t => out.push({ text: t })); });
    return { h: heading || ('Page ' + pageNo), paras: out, words: out.reduce((n, p) => n + p.text.split(/\s+/).length, 0) };
  }
  // keep paragraphs readable and easy to read aloud (≈ 90 words max)
  function splitLong(text, max) {
    max = max || 90;
    const words = text.split(/\s+/);
    if (words.length <= max) return [text];
    const out = []; let cur = [];
    sentences(text).forEach(s => {
      const n = s.split(/\s+/).length;
      if (cur.length && cur.join(' ').split(/\s+/).length + n > max) { out.push(cur.join(' ')); cur = []; }
      cur.push(s);
    });
    if (cur.length) out.push(cur.join(' '));
    return out;
  }
  // plain text (.txt) → pages of paragraphs
  function structureText(text, perPage) {
    perPage = perPage || 6;
    const blocks = String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(b => b.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    const paras = []; blocks.forEach(b => splitLong(b).forEach(t => paras.push({ text: t })));
    const pages = [];
    for (let i = 0; i < paras.length; i += perPage) {
      const ps = paras.slice(i, i + perPage);
      const first = ps[0].text.split(/\s+/).slice(0, 6).join(' ');
      pages.push({ h: (ps[0].text.length < 80 && ps.length > 1) ? ps.shift().text : first + '…', paras: ps });
    }
    return pages;
  }

  /* ---------------- extractive summary ---------------- */
  function sentences(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return [];
    // protect abbreviations and initials so they don't end a sentence
    const safe = t.replace(/\b(e\.g|i\.e|etc|Dr|Mr|Ms|Mrs|Prof|Fig|No|vs|al)\./gi, m => m.replace(/\./g, '\u2024')).replace(/\b([A-Z])\.(?=\s?[A-Z]\.)/g, '$1\u2024');
    const parts = safe.match(/[^.!?؟]+(?:[.!?؟]+["”’)]?|$)/g) || [safe];
    const out = parts.map(p => p.trim().replace(/\u2024/g, '.')).filter(Boolean);
    return out;
  }
  const tokens = s => (String(s).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).filter(w => w.length > 2 && !STOP.has(w));
  function freq(text) {
    const f = {};
    tokens(text).forEach(w => { f[w] = (f[w] || 0) + 1; });
    return f;
  }
  function summarize(text, n) {
    n = n || 3;
    const ss = sentences(text).filter(s => s.split(/\s+/).length >= 5);
    if (ss.length <= n) return ss;
    const f = freq(text), max = Math.max(1, ...Object.values(f));
    const scored = ss.map((s, i) => {
      const ws = tokens(s);
      const score = ws.reduce((a, w) => a + f[w] / max, 0) / Math.max(4, ws.length) + (i === 0 ? 0.15 : 0) + (/\b(is|are|means|called|known as|defined)\b/i.test(s) ? 0.08 : 0);
      return { s, i, score };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i).map(x => x.s);
  }
  // key phrases: frequent content words and two-word phrases
  function keywords(text, n) {
    n = n || 8;
    const words = (String(text).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []);
    const f = {};
    for (let i = 0; i < words.length; i++) {
      const a = words[i], b = words[i + 1];
      if (a.length > 3 && !STOP.has(a) && !/^\d+$/.test(a)) f[a] = (f[a] || 0) + 1;
      if (b && a.length > 2 && b.length > 2 && !STOP.has(a) && !STOP.has(b) && !/\d/.test(a + b)) { const k = a + ' ' + b; f[k] = (f[k] || 0) + 1.6; }
    }
    const list = Object.entries(f).filter(([k, v]) => v >= 2).sort((x, y) => y[1] - x[1] || y[0].length - x[0].length);
    const out = [];
    for (const [k] of list) {
      if (out.some(o => o.includes(k) || k.includes(o))) continue;
      out.push(k);
      if (out.length >= n) break;
    }
    return out;
  }

  /* ---------------- quiz & flashcards ---------------- */
  // fill-in-the-gap questions from the text's own sentences (deterministic order by seed)
  function quizFrom(text, n, seed) {
    n = n || 5;
    const keys = keywords(text, 16);
    if (keys.length < 4) return [];
    const ss = sentences(text);
    const qs = [];
    let r = seed || 7;
    const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    for (const s of ss) {
      const k = keys.find(k => new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(s));
      if (!k || s.split(/\s+/).length < 7 || qs.some(q => q.answer === k)) continue;
      const blank = s.replace(new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '_____');
      const wrong = keys.filter(x => x !== k && !x.includes(k) && !k.includes(x)).sort(() => rnd() - 0.5).slice(0, 2);
      if (wrong.length < 2) continue;
      const opts = [k].concat(wrong).sort(() => rnd() - 0.5);
      qs.push({ q: blank, opts, a: opts.indexOf(k), answer: k, why: s });
      if (qs.length >= n) break;
    }
    return qs;
  }
  // terms: { term: [definition, arabic] } — or, without a glossary, gap cards
  function cardsFrom(terms, text, n) {
    const ts = Object.entries(terms || {});
    if (ts.length) return ts.map(([t, d]) => ({ front: t, back: d[0], ar: d[1] || '' }));
    return quizFrom(text, n || 8, 3).map(q => ({ front: q.q, back: q.answer, ar: '' }));
  }
  function readingMinutes(words, wpm) { return Math.max(1, Math.round(words / (wpm || 200))); }

  return { structurePage, structureText, splitLong, sentences, summarize, keywords, quizFrom, cardsFrom, readingMinutes, tokens };
});
