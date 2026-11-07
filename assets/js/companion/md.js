/* ERLY — a small, safe Markdown renderer for Noor's replies.
   Everything is HTML-escaped first, so model output can never inject markup
   or scripts; only a fixed set of tags is produced: headings, paragraphs,
   bold, italic, inline code, code blocks (with a copy button), ordered and
   unordered lists (one level of nesting), tables, quotes and links to
   http(s) addresses only. Maths written in LaTeX (\( \), \[ \], $ $, $$ $$)
   is turned into readable, safe HTML (fractions, powers, arrows, Greek). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_MD = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);


  /* ---------- a small LaTeX → HTML / plain text converter ---------- */
  const SYM = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    rightarrow: '→', to: '→', longrightarrow: '⟶', leftarrow: '←', longleftarrow: '⟵', gets: '←', Rightarrow: '⇒', Longrightarrow: '⟹', Leftarrow: '⇐', leftrightarrow: '↔', Leftrightarrow: '⇔', iff: '⇔', implies: '⇒', rightleftharpoons: '⇌', rightleftarrows: '⇄', uparrow: '↑', downarrow: '↓', mapsto: '↦',
    times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', ne: '≠', approx: '≈', sim: '∼', simeq: '≃', equiv: '≡', propto: '∝', infty: '∞', partial: '∂', nabla: '∇',
    sum: '∑', prod: '∏', int: '∫', iint: '∬', oint: '∮', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩', emptyset: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨', angle: '∠', perp: '⊥', parallel: '∥',
    circ: '∘', degree: '°', ldots: '…', cdots: '⋯', dots: '…', vdots: '⋮', prime: '′', hbar: 'ħ', ell: 'ℓ', therefore: '∴', because: '∵', star: '⋆', ast: '∗', bullet: '•', langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', mid: '∣',
    quad: ' ', qquad: '  ', ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ', '{': '{', '}': '}', '%': '%', '$': '$', '&': '&', '#': '#', '_': '_', '|': '‖', backslash: '\\', lbrace: '{', rbrace: '}' };
  const FN = /^(sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|log|ln|exp|lim|max|min|det|deg|gcd|mod)$/;
  const TEXTY = /^(text|textrm|textbf|textit|mathrm|mathbf|mathit|mathsf|mathtt|operatorname|mbox|textnormal|ce|pu)$/;
  const ACCENT = { hat: '̂', bar: '̄', vec: '⃗', dot: '̇', ddot: '̈', tilde: '̃', overline: '̅', underline: '̲', widehat: '̂' };
  // mode 'h' = HTML, 't' = plain text for speech / copying
  function tex(src, mode) {
    const s = String(src || ''); let i = 0;
    const H = mode === 'h';
    const e = x => H ? esc(x) : x;
    function group() { // {…} or a single token
      while (s[i] === ' ') i++;
      if (s[i] === '{') { i++; const r = seq('}'); i++; return r; }
      return atom();
    }
    function rawGroup() {
      while (s[i] === ' ') i++;
      if (s[i] !== '{') return s[i++] || '';
      let d = 0, st = ++i;
      for (; i < s.length; i++) { if (s[i] === '{') d++; else if (s[i] === '}') { if (!d) break; d--; } }
      const r = s.slice(st, i); i++; return r;
    }
    function textArg(cmd) {
      let t = rawGroup().replace(/\\([%$&#_{} ])/g, '$1').replace(/~/g, ' ');
      if (cmd === 'ce' || cmd === 'pu') { // chemistry: H2O → H₂O, ->, <=>
        t = t.replace(/<=>/g, '⇌').replace(/<->/g, '↔').replace(/->/g, '→').replace(/<-/g, '←');
        if (H) { t = esc(t).replace(/([A-Za-z\)\]])(\d+)/g, '$1<sub>$2</sub>').replace(/\^\{?([0-9]*[+\-−])\}?/g, '<sup>$1</sup>'); return t; }
        return t.replace(/\^\{?([0-9]*[+\-])\}?/g, '$1');
      }
      return e(t);
    }
    function cmd() {
      i++; // backslash
      let name = '';
      if (/[A-Za-z]/.test(s[i] || '')) { while (/[A-Za-z]/.test(s[i] || '')) name += s[i++]; }
      else name = s[i++] || '';
      if (name === '\\') return H ? '<br>' : '; ';
      if (TEXTY.test(name)) { const t = textArg(name); return H && /bf$/.test(name) ? `<b>${t}</b>` : t; }
      if (/^(frac|dfrac|tfrac|cfrac)$/.test(name)) { const a = group(), b = group(); return H ? `<span class="mf"><span>${a}</span><span>${b}</span></span>` : ` (${a}) over (${b}) `; }
      if (name === 'binom') { const a = group(), b = group(); return H ? `(<span class="mf mf--b"><span>${a}</span><span>${b}</span></span>)` : ` ${a} choose ${b} `; }
      if (name === 'sqrt') {
        let n = ''; if (s[i] === '[') { const j = s.indexOf(']', i); n = s.slice(i + 1, j); i = j + 1; }
        const a = group();
        return H ? `${n ? `<sup>${e(n)}</sup>` : ''}√<span class="msq">${a}</span>` : ` ${n ? n + 'th ' : ''}root of (${a}) `;
      }
      if (ACCENT[name]) { const a = group(); return H ? `<span class="macc">${a}${ACCENT[name]}</span>` : a; }
      if (name === 'left' || name === 'right' || name === 'big' || name === 'Big' || name === 'bigg' || name === 'Bigg' || name === 'displaystyle' || name === 'limits' || name === 'nolimits') { if ((name === 'left' || name === 'right') && s[i] === '.') i++; return ''; }
      if (name === 'begin' || name === 'end') { rawGroup(); if (s[i] === '{') rawGroup(); return name === 'end' ? '' : ''; }
      if (name === 'color' || name === 'textcolor') { rawGroup(); return name === 'textcolor' ? group() : ''; }
      if (name === 'boxed') { const a = group(); return H ? `<span class="mbox">${a}</span>` : a; }
      if (name === 'overset' || name === 'stackrel') { const top = group(), base = group(); return H ? `<span class="mover"><small>${top}</small>${base}</span>` : base; }
      if (FN.test(name)) return H ? `<span class="mfn">${name}</span> ` : name + ' ';
      if (SYM[name] != null) return e(SYM[name]);
      return e(name);
    }
    function atom() {
      const c = s[i];
      if (c === undefined) return '';
      if (c === '\\') return cmd();
      if (c === '{') return group();
      i++;
      if (c === '~') return ' ';
      if (c === '&') return H ? ' ' : ' ';
      return e(c);
    }
    function seq(close) {
      let out = '';
      while (i < s.length && s[i] !== close) {
        const c = s[i];
        if (c === '^' || c === '_') {
          i++;
          // ^\circ → °
          if (c === '^' && /^\{?\\circ\}?/.test(s.slice(i))) { i += s.slice(i).match(/^\{?\\circ\}?/)[0].length; out += '°'; continue; }
          const a = group();
          out += H ? (c === '^' ? `<sup>${a}</sup>` : `<sub>${a}</sub>`) : (c === '^' ? (/^[0-9a-z+\-−]{1,3}$/i.test(a) ? (a === '2' ? ' squared' : a === '3' ? ' cubed' : a === '-' || a === '+' ? a : ' to the power ' + a) : `^(${a})`) : (/^\w$/.test(a) ? a : ` ${a}`));
          continue;
        }
        out += atom();
      }
      return out;
    }
    const out = seq(null);
    return H ? out : out.replace(/\s+/g, ' ').trim();
  }
  // pull maths out of a line before escaping; returns text with placeholders
  const MATH = /\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)|(?<![\\\w$])\$(?!\s)([^$\n]*?[\\^_=+\-][^$\n]*?)(?<!\s)\$(?![\w$])/g;

  function inline(s) {
    const codes = [], maths = [];
    s = String(s == null ? '' : s).replace(MATH, (m, a, b, c, d) => { const disp = a != null || b != null; maths.push(`<span class="mth${disp ? ' mth--d' : ''}">${tex(a != null ? a : b != null ? b : c != null ? c : d, 'h')}</span>`); return '\u0001' + (maths.length - 1) + '\u0001'; });
    let t = esc(s).replace(/`([^`\n]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, txt, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${txt}</a>`)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`).replace(/\u0001(\d+)\u0001/g, (_, i) => maths[+i]);
  }
  const isTableRow = l => /^\s*\|.*\|\s*$/.test(l);
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

  // a display formula written over several lines becomes one line
  function joinMath(src) {
    const out = [];
    for (let i = 0; i < src.length; i++) {
      const l = src[i], t = l.trim();
      const open = /(^|[^\\])\\\[(?![\s\S]*\\\])/.test(t) ? '\\]' : (t.split('$$').length === 2 ? '$$' : null);
      if (open && !/^\s*```/.test(l)) {
        let j = i + 1, buf = l;
        while (j < src.length && !src[j].includes(open) && j - i < 40) buf += ' ' + src[j++].trim();
        if (j < src.length && j - i < 40) { out.push(buf + ' ' + src[j].trim()); i = j; continue; }
      }
      out.push(l);
    }
    return out;
  }
  function render(md) {
    const lines = joinMath(String(md || '').replace(/\r/g, '').split('\n'));
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
        const start = ordered ? parseInt(l.match(li)[2], 10) : 1;
        const items = [];
        const sameKind = x => { const m = x && x.match(li); return m && m[1].length < 2 && /\d/.test(m[2]) === ordered; };
        const nextFull = k => { while (k < lines.length && !lines[k].trim()) k++; return k; };
        for (;;) {
          if (i >= lines.length) break;
          if (!lines[i].trim()) { // a "loose" list: blank lines between items or before an indented formula
            const k = nextFull(i);
            if (k < lines.length && items.length && (sameKind(lines[k]) || /^\s{2,}\S/.test(lines[k]))) { i = k; continue; }
            break;
          }
          if (!(li.test(lines[i]) || (lines[i].trim() && (/^\s{2,}/.test(lines[i]) || /^\s*(\\\[|\$\$)/.test(lines[i])) && items.length))) break;
          const m = lines[i].match(li);
          if (m && m[1].length < 2) items.push({ text: m[3], sub: [] });
          else if (m) items[items.length - 1].sub.push({ text: m[3], ordered: /\d/.test(m[2]) });
          else items[items.length - 1].text += (/^\s*(\\\[|\$\$)/.test(lines[i]) ? '\n' : ' ') + lines[i].trim();
          i++;
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push(`<${tag}${start > 1 ? ` start="${start}"` : ''}>${items.map((it, k) => `<li style="--li:${k}">${it.text.split('\n').map(inline).join('')}${it.sub.length ? `<${it.sub[0].ordered ? 'ol' : 'ul'}>${it.sub.map(s => `<li>${inline(s.text)}</li>`).join('')}</${it.sub[0].ordered ? 'ol' : 'ul'}>` : ''}</li>`).join('')}</${tag}>`);
        continue;
      }
      if (/^\s*(\\\[[\s\S]*\\\]|\$\$[\s\S]*\$\$)\s*$/.test(l)) { out.push(`<div class="mth-b">${inline(l.trim())}</div>`); i++; continue; }
      const buf = [lines[i++]]; // always consume at least this line, so half-written markup can never stall the loop
      while (i < lines.length && lines[i].trim() && !li.test(lines[i]) && !/^\s*(#{1,4}\s|```|>)/.test(lines[i]) && !(isTableRow(lines[i]) && lines[i + 1] && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]))) buf.push(lines[i++]);
      out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
    }
    return out.join('');
  }
  // plain text for speech and copying
  function toText(md) {
    return String(md || '').replace(MATH, (m, a, b, c, d) => ' ' + tex(a != null ? a : b != null ? b : c != null ? c : d, 't') + ' ').replace(/```[\s\S]*?(```|$)/g, ' ').replace(/`([^`]+)`/g, '$1').replace(/\*\*|__/g, '').replace(/(^|\s)[*_]([^*_]+)[*_]/g, '$1$2')
      .replace(/^\s*#{1,4}\s+/gm, '').replace(/^\s*>\s?/gm, '').replace(/^\s*[-*•]\s+/gm, '').replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, '').replace(/\|/g, ', ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n{2,}/g, '\n').trim();
  }
  return { render, inline, toText, esc, tex };
});
