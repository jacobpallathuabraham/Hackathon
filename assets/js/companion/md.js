/* ERLY — a small, safe Markdown renderer for Noor's replies.
   Everything is HTML-escaped first, so model output can never inject markup
   or scripts; only a fixed set of tags is produced: headings, paragraphs,
   bold, italic, inline code, code blocks (with a copy button), ordered and
   unordered lists (one level of nesting), tables, quotes and links to
   http(s) addresses only. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_MD = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function inline(s) {
    const codes = [];
    let t = esc(s).replace(/`([^`\n]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, txt, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${txt}</a>`)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
  }
  const isTableRow = l => /^\s*\|.*\|\s*$/.test(l);
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

  function render(md) {
    const lines = String(md || '').replace(/\r/g, '').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      // fenced code (an unclosed fence while streaming still renders)
      const fence = l.match(/^\s*```\s*([\w+-]*)\s*$/);
      if (fence) {
        const buf = []; i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<div class="md-code"><div class="md-code__bar"><span>${esc(fence[1] || 'code')}</span><button type="button" class="md-copy" data-md-copy>Copy</button></div><pre><code>${esc(buf.join('\n'))}</code></pre></div>`);
        continue;
      }
      if (!l.trim()) { i++; continue; }
      const h = l.match(/^\s*(#{1,4})\s+(.+)$/);
      if (h) { const n = Math.min(4, h[1].length + 2); out.push(`<h${n}>${inline(h[2].replace(/\s*#+\s*$/, ''))}</h${n}>`); i++; continue; }
      if (/^\s*(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(l)) { out.push('<hr>'); i++; continue; }
      if (isTableRow(l) && lines[i + 1] && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        const head = cells(l); i += 2;
        const rows = [];
        while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
        out.push(`<div class="md-table"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${head.map((_, k) => `<td>${inline(r[k] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      if (/^\s*>/.test(l)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
        out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
        continue;
      }
      const li = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/;
      if (li.test(l)) {
        const ordered = /\d/.test(l.match(li)[2]);
        const items = [];
        while (i < lines.length && (li.test(lines[i]) || (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length))) {
          const m = lines[i].match(li);
          if (m && m[1].length < 2) items.push({ text: m[3], sub: [] });
          else if (m) items[items.length - 1].sub.push({ text: m[3], ordered: /\d/.test(m[2]) });
          else items[items.length - 1].text += ' ' + lines[i].trim();
          i++;
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push(`<${tag}>${items.map((it, k) => `<li style="--li:${k}">${inline(it.text)}${it.sub.length ? `<${it.sub[0].ordered ? 'ol' : 'ul'}>${it.sub.map(s => `<li>${inline(s.text)}</li>`).join('')}</${it.sub[0].ordered ? 'ol' : 'ul'}>` : ''}</li>`).join('')}</${tag}>`);
        continue;
      }
      const buf = [lines[i++]]; // always consume at least this line, so half-written markup can never stall the loop
      while (i < lines.length && lines[i].trim() && !li.test(lines[i]) && !/^\s*(#{1,4}\s|```|>)/.test(lines[i]) && !(isTableRow(lines[i]) && lines[i + 1] && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]))) buf.push(lines[i++]);
      out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
    }
    return out.join('');
  }
  // plain text for speech and copying
  function toText(md) {
    return String(md || '').replace(/```[\s\S]*?(```|$)/g, ' ').replace(/`([^`]+)`/g, '$1').replace(/\*\*|__/g, '').replace(/(^|\s)[*_]([^*_]+)[*_]/g, '$1$2')
      .replace(/^\s*#{1,4}\s+/gm, '').replace(/^\s*>\s?/gm, '').replace(/^\s*[-*•]\s+/gm, '').replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, '').replace(/\|/g, ', ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n{2,}/g, '\n').trim();
  }
  return { render, inline, toText, esc };
});
