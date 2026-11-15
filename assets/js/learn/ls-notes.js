/* ERLY Learning Studio — My Notebook.

   Rich-text notes (headings, bold/italic, highlight, lists, tables, maths), folders, tags, search, concept maps,
   saved diagrams, a formula collection and bookmarks. Notes saved from a lesson, video, question, Noor reply
   or the Visual Lab keep a source reference with a link back.

   Saving: every edit autosaves after a short pause. A draft copy is also written on every keystroke to
   sessionStorage, so if the tab crashes or the student navigates away mid-edit the draft is offered back the
   next time the note is opened. Pasted HTML is cleaned to a small allowlist, so notes can never carry scripts. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store;
  const DRAFT = 'erly-learn-draft';
  const ALLOW = { P: 1, H2: 1, H3: 1, B: 1, STRONG: 1, I: 1, EM: 1, MARK: 1, U: 1, UL: 1, OL: 1, LI: 1, TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TH: 1, TD: 1, BLOCKQUOTE: 1, BR: 1, SUP: 1, SUB: 1, CODE: 1, SPAN: 1, DIV: 1, A: 1 };
  function clean(html) {
    const t = document.createElement('template'); t.innerHTML = String(html || '');
    (function walk(n) { [...n.childNodes].forEach(c => {
      if (c.nodeType === 8) { c.remove(); return; }
      if (c.nodeType !== 1) return;
      if (!ALLOW[c.tagName]) { if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|IMG|LINK|META|FORM|INPUT|BUTTON|TEXTAREA|SELECT)$/.test(c.tagName)) { c.remove(); return; } const frag = document.createDocumentFragment(); while (c.firstChild) frag.appendChild(c.firstChild); c.replaceWith(frag); walk(frag.parentNode || n); return; }
      [...c.attributes].forEach(a => { const keep = (a.name === 'class' && /^(ls-m|ls-hl)$/.test(a.value)) || (c.tagName === 'A' && a.name === 'href' && /^(#\/|https?:)/.test(a.value)); if (!keep) c.removeAttribute(a.name); });
      if (c.tagName === 'A') { c.setAttribute('rel', 'noopener'); c.setAttribute('target', /^#/.test(c.getAttribute('href') || '') ? '_self' : '_blank'); }
      walk(c);
    }); })(t.content);
    return t.innerHTML;
  }
  const textOf = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); };

  function create(o) {
    const id = LS.uid('n'), now = Date.now();
    const n = { id, title: (o.title || T('Untitled note', 'ملاحظة بلا عنوان')).slice(0, 140), html: clean(o.html || '<p></p>'), svg: o.svg && /^<svg[\s>]/.test(o.svg) ? o.svg : null, kind: o.kind || 'note', map: o.map || null, folder: o.folder || 'General', tags: o.tags || [], src: o.src || null, created: now, updated: now };
    st.update(d => { d.notes[id] = n; if (!d.folders.includes(n.folder)) d.folders.push(n.folder); });
    return id;
  }
  LS.notes = {
    clean, create,
    quick(o) {
      // diagrams saved from lessons keep their (trusted, ERLY-made) SVG separately from the editable text
      let svg = null; if (o.kind === 'diagram') { const m = String(o.html).match(/^<svg[\s\S]*?<\/svg>/); if (m) { svg = m[0]; o.html = o.html.slice(m[0].length); } }
      const id = create(Object.assign({}, o, { svg, folder: o.folder || (o.kind === 'diagram' ? 'Diagrams' : 'General') }));
      LS.toast(T('Saved to your notebook.', 'حُفظت في دفترك.'), {});
      const el = document.getElementById('lsToast'); if (el) { const a = document.createElement('a'); a.href = '#/notebook/' + id; a.className = 'ls-btn ls-btn--quiet'; a.textContent = T('Open', 'افتح'); el.appendChild(document.createTextNode(' ')); el.appendChild(a); }
      return id;
    },
    all: () => Object.values(st.data().notes).sort((a, b) => b.updated - a.updated)
  };

  /* ---------- Markdown export (headings, lists, emphasis, tables, quotes) ---------- */
  function toMd(n) {
    const d = document.createElement('div'); d.innerHTML = n.html; const out = [];
    const inl = el => [...el.childNodes].map(c => c.nodeType === 3 ? c.textContent : /^(B|STRONG)$/.test(c.tagName) ? `**${inl(c)}**` : /^(I|EM)$/.test(c.tagName) ? `*${inl(c)}*` : c.tagName === 'MARK' ? `==${inl(c)}==` : c.tagName === 'CODE' ? '`' + inl(c) + '`' : c.tagName === 'SUP' ? '^' + inl(c) : c.tagName === 'SUB' ? '_' + inl(c) : c.tagName === 'BR' ? '\n' : c.tagName === 'A' ? `[${inl(c)}](${c.getAttribute('href')})` : inl(c)).join('');
    [...d.children].forEach(c => {
      if (c.tagName === 'H2') out.push('## ' + inl(c)); else if (c.tagName === 'H3') out.push('### ' + inl(c));
      else if (c.tagName === 'UL') out.push([...c.children].map(li => '- ' + inl(li)).join('\n')); else if (c.tagName === 'OL') out.push([...c.children].map((li, i) => (i + 1) + '. ' + inl(li)).join('\n'));
      else if (c.tagName === 'BLOCKQUOTE') out.push('> ' + inl(c));
      else if (c.tagName === 'TABLE') { const rows = [...c.querySelectorAll('tr')].map(r => '| ' + [...r.children].map(inl).join(' | ') + ' |'); if (rows.length) rows.splice(1, 0, '|' + ' --- |'.repeat(c.querySelector('tr').children.length)); out.push(rows.join('\n')); }
      else out.push(inl(c));
    });
    if (n.map) out.push('### Concept map\n' + n.map.edges.map(e => `- ${nodeText(n.map, e.a)} → ${e.label ? e.label + ' → ' : ''}${nodeText(n.map, e.b)}`).join('\n'));
    return `# ${n.title}\n\n${n.src ? `_Source: ${n.src.title || n.src.type}_\n\n` : ''}${out.filter(Boolean).join('\n\n')}\n`;
  }
  const nodeText = (m, id) => (m.nodes.find(x => x.id === id) || { text: '?' }).text;
  function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  const safeName = s => String(s).replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'note';

  /* ---------- notebook page ---------- */
  function page(view, parts) {
    const id = parts[0];
    const q = (LS._nbq || ''), fsel = LS._nbf || 'All';
    const all = LS.notes.all(), d = st.data();
    const folders = ['All'].concat(d.folders.filter(f => all.some(n => n.folder === f) || f === 'General'), ['Formulas', 'Bookmarks']);
    const list = fsel === 'Formulas' || fsel === 'Bookmarks' ? [] : all.filter(n => (fsel === 'All' || n.folder === fsel) && (!q || (n.title + ' ' + textOf(n.html) + ' ' + n.tags.join(' ')).toLowerCase().includes(q.toLowerCase())));
    const cur = id && d.notes[id];
    view.innerHTML = `<div class="ls-nb">
      <aside class="ls-nb__side" aria-label="${T('Notebook navigation', 'تنقل الدفتر')}">
        <h1 class="ls-h1sm">${T('My Notebook', 'دفتري')}</h1>
        <div class="ls-row"><button type="button" class="ls-btn ls-btn--accent ls-btn--sm" data-new="note">+ ${T('Note', 'ملاحظة')}</button><button type="button" class="ls-btn ls-btn--sm" data-new="map">+ ${T('Concept map', 'خريطة مفاهيم')}</button></div>
        <label class="ls-search"><span class="sr-only">${T('Search notes', 'ابحث في الملاحظات')}</span><input type="search" value="${esc(q)}" placeholder="${T('Search notes, tags…', 'ابحث…')}" data-nbq></label>
        <nav class="ls-folders" aria-label="${T('Folders', 'المجلدات')}">${folders.map(f => `<button type="button" data-folder="${esc(f)}" aria-pressed="${f === fsel}">${esc(f)} <span class="ls-count">${f === 'All' ? all.length : f === 'Formulas' ? formulas().length : f === 'Bookmarks' ? d.bookmarks.length : all.filter(n => n.folder === f).length}</span></button>`).join('')}<button type="button" class="ls-linkbtn" data-newfolder>+ ${T('New folder', 'مجلد جديد')}</button></nav>
        ${fsel === 'Formulas' ? `<ul class="ls-nbformulas">${formulas().map(c => `<li><b>${esc(c.front)}</b><span>${esc(c.back)}</span></li>`).join('') || `<li class="ls-muted">${T('Formula flashcards you add appear here.', 'تظهر هنا بطاقات الصيغ.')}</li>`}</ul>` : fsel === 'Bookmarks' ? `<ul class="ls-nbbm">${d.bookmarks.map((b, i) => `<li><a href="${esc(b.where)}">${esc(b.label)}</a><small>${esc(b.title || '')} · ${LS.fmtDate(b.at)}</small><button type="button" class="ls-ic" data-unbm="${i}" aria-label="${T('Remove bookmark', 'احذف')}">×</button></li>`).join('') || `<li class="ls-muted">${T('Bookmarks from videos and lessons appear here.', 'تظهر هنا العلامات.')}</li>`}</ul>` :
        `<ul class="ls-nblist" role="list">${list.map(n => `<li><a href="#/notebook/${n.id}" ${n.id === id ? 'aria-current="page"' : ''}><b>${n.kind === 'map' ? '◈ ' : n.svg ? '▣ ' : ''}${esc(n.title)}</b><small>${esc(textOf(n.html).slice(0, 70)) || (n.kind === 'map' ? T('Concept map', 'خريطة') : '')}</small><small class="ls-muted">${esc(n.folder)} · ${LS.ago(n.updated)}${n.tags.length ? ' · #' + n.tags.map(esc).join(' #') : ''}</small></a></li>`).join('') || `<li class="ls-empty-s">${q ? T('No notes match your search.', 'لا نتائج.') : T('No notes yet. Select text in a lesson and choose “Save to notebook”, or start a note here.', 'لا ملاحظات بعد.')}</li>`}</ul>`}
      </aside>
      <section class="ls-nb__main">${cur ? editorHTML(cur) : `<div class="ls-empty"><h2>${T('Your study workspace', 'مساحة دراستك')}</h2><p>${T('Write notes, keep diagrams, build concept maps. Everything you save from lessons, videos, practice and Noor lands here with a link back to where it came from.', 'اكتب الملاحظات واحفظ الرسوم.')}</p></div>`}</section>
    </div>`;
    const root = view.querySelector('.ls-nb');
    root.addEventListener('input', e => { if (e.target.matches('[data-nbq]')) { LS._nbq = e.target.value; clearTimeout(page.t); page.t = setTimeout(() => { const pos = e.target.selectionStart; LS.render(); const s = document.querySelector('[data-nbq]'); if (s) { s.focus(); s.setSelectionRange(pos, pos); } }, 250); } });
    root.addEventListener('click', e => {
      const f = e.target.closest('[data-folder]'); if (f) { LS._nbf = f.dataset.folder; LS.render(); return; }
      const nw = e.target.closest('[data-new]'); if (nw) { const nid = create({ kind: nw.dataset.new, title: nw.dataset.new === 'map' ? T('New concept map', 'خريطة جديدة') : T('Untitled note', 'ملاحظة'), folder: fsel !== 'All' && fsel !== 'Formulas' && fsel !== 'Bookmarks' ? fsel : 'General', map: nw.dataset.new === 'map' ? { nodes: [{ id: 'a', text: T('Main idea', 'الفكرة الرئيسية'), x: 300, y: 160 }], edges: [] } : null }); LS.go('notebook/' + nid); return; }
      if (e.target.closest('[data-newfolder]')) { const name = prompt(T('Folder name', 'اسم المجلد')); if (name && name.trim()) st.update(d2 => { if (!d2.folders.includes(name.trim())) d2.folders.push(name.trim().slice(0, 40)); }); LS._nbf = name ? name.trim() : fsel; LS.render(); return; }
      const ub = e.target.closest('[data-unbm]'); if (ub) { st.update(d2 => d2.bookmarks.splice(+ub.dataset.unbm, 1)); LS.render(); }
    });
    if (cur) bindEditor(root.querySelector('.ls-ed'), cur);
  }
  const formulas = () => Object.values(st.data().cards).filter(c => c.kind === 'formula');

  function editorHTML(n) {
    const d = st.data();
    return `<div class="ls-ed" data-id="${n.id}">
      <div class="ls-ed__top"><label class="sr-only" for="lsNt">${T('Title', 'العنوان')}</label><input id="lsNt" class="ls-ed__title" value="${esc(n.title)}" maxlength="140">
        <span class="ls-ed__state" aria-live="polite" data-state>${T('Saved', 'محفوظ')}</span></div>
      <div class="ls-ed__meta"><label>${T('Folder', 'المجلد')} <select data-fld>${d.folders.map(f => `<option ${f === n.folder ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
        <label>${T('Tags', 'الوسوم')} <input data-tags value="${esc(n.tags.join(', '))}" placeholder="${T('comma, separated', 'مفصولة بفواصل')}"></label>
        ${n.src ? `<p class="ls-src">${T('From', 'من')}: ${n.src.where ? `<a href="${esc(n.src.where)}">${esc(n.src.title || n.src.type)}</a>` : esc(n.src.title || n.src.type)}</p>` : ''}</div>
      ${n.kind === 'map' ? mapHTML(n) : `<div class="ls-ed__bar" role="toolbar" aria-label="${T('Formatting', 'التنسيق')}">
        <button type="button" data-cmd="formatBlock" data-v="H2" title="Heading">H2</button><button type="button" data-cmd="formatBlock" data-v="H3" title="Subheading">H3</button><button type="button" data-cmd="formatBlock" data-v="P" title="Paragraph">¶</button>
        <button type="button" data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button><button type="button" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button><button type="button" data-cmd="hl" title="Highlight">▌<span class="sr-only">Highlight</span></button>
        <button type="button" data-cmd="insertUnorderedList" title="Bulleted list">• ${T('List', 'قائمة')}</button><button type="button" data-cmd="insertOrderedList" title="Numbered list">1. ${T('List', 'قائمة')}</button>
        <button type="button" data-cmd="table" title="Insert table">⊞ ${T('Table', 'جدول')}</button><button type="button" data-cmd="math" title="Insert maths">∑ ${T('Maths', 'رياضيات')}</button><button type="button" data-cmd="formatBlock" data-v="BLOCKQUOTE" title="Quote">❝</button></div>
      ${n.svg ? `<div class="ls-ed__svg">${n.svg}</div>` : ''}
      <div class="ls-ed__body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${T('Note text', 'نص الملاحظة')}" spellcheck="true">${n.html}</div>`}
      <div class="ls-ed__foot"><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-exp="md">${T('Export Markdown', 'تصدير Markdown')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-exp="html">${T('Export HTML', 'تصدير HTML')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-exp="print">${T('Print / save as PDF', 'طباعة')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-asknote>${T('Ask Noor to make revision notes from this', 'اطلب من نور ملخصاً')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--danger" data-del>${T('Delete note', 'احذف')}</button></div>
    </div>`;
  }

  function bindEditor(ed, n) {
    const body = ed.querySelector('.ls-ed__body'), stateEl = ed.querySelector('[data-state]');
    let dirty = false, t = null;
    // a draft from an interrupted edit, newer than the saved note?
    try { const dr = JSON.parse(sessionStorage.getItem(DRAFT) || 'null'); if (dr && dr.id === n.id && dr.at > n.updated && dr.html !== n.html && body) { const bar = document.createElement('div'); bar.className = 'ls-call ls-call--warn'; bar.setAttribute('role', 'alert'); bar.innerHTML = `<p>${T('Unsaved changes from your last edit were found.', 'وُجدت تعديلات غير محفوظة.')} <button type="button" class="ls-btn ls-btn--sm" data-restore>${T('Restore them', 'استعدها')}</button> <button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-discard>${T('Discard', 'تجاهل')}</button></p>`; ed.insertBefore(bar, body); bar.querySelector('[data-restore]').onclick = () => { body.innerHTML = clean(dr.html); bar.remove(); commit(); }; bar.querySelector('[data-discard]').onclick = () => { sessionStorage.removeItem(DRAFT); bar.remove(); }; } } catch (e) { /* no draft */ }
    function mark(s) { stateEl.textContent = s; }
    function commit() {
      clearTimeout(t); dirty = false;
      const title = ed.querySelector('.ls-ed__title').value.trim() || T('Untitled note', 'ملاحظة');
      const tags = ed.querySelector('[data-tags]').value.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean).slice(0, 12);
      st.update(d => { const x = d.notes[n.id]; if (!x) return; x.title = title; x.tags = tags; x.folder = ed.querySelector('[data-fld]').value; if (body) x.html = clean(body.innerHTML); if (ed._map) x.map = ed._map; x.updated = Date.now(); });
      try { sessionStorage.removeItem(DRAFT); } catch (e) { /* ok */ }
      const c = st.consent(); mark(st.mode() === 'demo' ? T('Saved (demonstration data is not kept)', 'محفوظ مؤقتاً') : c && c.store === 'device' ? T('Saved on this device', 'محفوظ على هذا الجهاز') : T('Saved for this visit only', 'محفوظ لهذه الزيارة فقط'));
      if (LS.saveError) mark(T('Could not save — storage is full or blocked. Export this note to keep it.', 'تعذر الحفظ — صدّر الملاحظة.'));
    }
    const schedule = () => { dirty = true; mark(T('Saving…', 'جارٍ الحفظ…')); clearTimeout(t); t = setTimeout(commit, 700); if (body) try { sessionStorage.setItem(DRAFT, JSON.stringify({ id: n.id, at: Date.now(), html: body.innerHTML })); } catch (e) { /* ok */ } };
    ed.addEventListener('input', e => { if (e.target.closest('.ls-ed__body, .ls-ed__title, [data-tags]')) schedule(); });
    ed.addEventListener('change', e => { if (e.target.matches('[data-fld]')) commit(); });
    const off = LS.on('leave', () => { if (dirty) commit(); off(); });
    addEventListener('beforeunload', ev => { if (dirty) { commit(); } }, { once: true });
    if (body) {
      body.addEventListener('paste', e => { const h = e.clipboardData && (e.clipboardData.getData('text/html') || ''); if (h) { e.preventDefault(); document.execCommand('insertHTML', false, clean(h)); } });
      body.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); commit(); } });
    }
    ed.addEventListener('click', e => {
      const b = e.target.closest('[data-cmd]');
      if (b && body) { body.focus(); const c = b.dataset.cmd;
        if (c === 'hl') { const s = getSelection(); if (s.rangeCount && !s.isCollapsed) { const m = document.createElement('mark'); try { s.getRangeAt(0).surroundContents(m); } catch (er) { document.execCommand('insertHTML', false, `<mark>${esc(s.toString())}</mark>`); } } }
        else if (c === 'table') document.execCommand('insertHTML', false, '<table><thead><tr><th>Heading</th><th>Heading</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p></p>');
        else if (c === 'math') { const v = prompt(T('Type the maths, e.g. v^2 = u^2 + 2as or x_1 = (-b + sqrt(b^2 - 4ac))/2a', 'اكتب الصيغة')); if (v) document.execCommand('insertHTML', false, `<span class="ls-m">${LS.math(v)}</span>&nbsp;`); }
        else document.execCommand(c, false, b.dataset.v || null);
        schedule(); return; }
      const x = e.target.closest('[data-exp]'); if (x) { commit(); const nn = st.data().notes[n.id]; if (x.dataset.exp === 'md') download(safeName(nn.title) + '.md', toMd(nn), 'text/markdown'); if (x.dataset.exp === 'html') download(safeName(nn.title) + '.html', `<!doctype html><meta charset="utf-8"><title>${esc(nn.title)}</title><h1>${esc(nn.title)}</h1>${nn.svg || ''}${nn.html}`, 'text/html'); if (x.dataset.exp === 'print') window.print(); return; }
      if (e.target.closest('[data-asknote]')) { commit(); LS.noor.ask('notes', { text: textOf(st.data().notes[n.id].html) || n.title, title: n.title }); return; }
      if (e.target.closest('[data-del]')) { const keep = JSON.parse(JSON.stringify(st.data().notes[n.id])); st.update(d => { delete d.notes[n.id]; }); try { sessionStorage.removeItem(DRAFT); } catch (er) { /* ok */ } dirty = false; LS.go('notebook'); LS.toast(T('Note deleted.', 'حُذفت الملاحظة.'), { undo: () => { st.update(d => { d.notes[keep.id] = keep; }); LS.go('notebook/' + keep.id); } }); }
    });
    if (n.kind === 'map') bindMap(ed, n, schedule);
  }

  /* ---------- concept maps: nodes and labelled links; every action has a keyboard/list equivalent ---------- */
  function mapHTML(n) {
    const m = n.map || { nodes: [], edges: [] };
    return `<div class="ls-map" data-map><div class="ls-map__bar" role="toolbar" aria-label="${T('Concept map tools', 'أدوات الخريطة')}"><button type="button" class="ls-btn ls-btn--sm" data-madd>+ ${T('Idea', 'فكرة')}</button><button type="button" class="ls-btn ls-btn--sm" data-mlink>${T('Link two ideas', 'اربط فكرتين')}</button><span class="ls-muted ls-small">${T('Drag ideas to arrange them. Double-click an idea to rename it.', 'اسحب الأفكار لترتيبها.')}</span></div>
      <svg class="ls-map__svg" viewBox="0 0 640 360" role="img" aria-label="${T('Concept map', 'خريطة مفاهيم')}: ${esc(m.nodes.map(x => x.text).join(', '))}">${m.edges.map(e => { const a = m.nodes.find(x => x.id === e.a), b = m.nodes.find(x => x.id === e.b); if (!a || !b) return ''; return `<g class="ls-map__e"><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>${e.label ? `<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 6}">${esc(e.label)}</text>` : ''}</g>`; }).join('')}${m.nodes.map(x => `<g class="ls-map__n" data-node="${x.id}" transform="translate(${x.x},${x.y})"><rect x="-70" y="-20" width="140" height="40" rx="12"/><text y="5">${esc(x.text.slice(0, 22))}</text></g>`).join('')}</svg>
      <details class="ls-map__list" open><summary>${T('Ideas and links (text view)', 'الأفكار والروابط (نص)')}</summary><ul>${m.nodes.map(x => `<li><input data-ntext="${x.id}" value="${esc(x.text)}" aria-label="${T('Idea text', 'نص الفكرة')}"><button type="button" class="ls-ic" data-ndel="${x.id}" aria-label="${T('Delete idea', 'احذف')} ${esc(x.text)}">×</button></li>`).join('')}</ul>
      <ul>${m.edges.map((e, i) => `<li>${esc(nodeText(m, e.a))} → <input data-elabel="${i}" value="${esc(e.label || '')}" placeholder="${T('link label', 'وصف')}" aria-label="${T('Link label', 'وصف الرابط')}"> → ${esc(nodeText(m, e.b))} <button type="button" class="ls-ic" data-edel="${i}" aria-label="${T('Delete link', 'احذف الرابط')}">×</button></li>`).join('')}</ul></details></div>`;
  }
  function bindMap(ed, n, schedule) {
    const m = ed._map = JSON.parse(JSON.stringify(n.map || { nodes: [], edges: [] }));
    const redraw = () => { const host = ed.querySelector('[data-map]'); host.outerHTML = mapHTML({ map: m }); schedule(); wire(); };
    function wire() {
      const svg = ed.querySelector('.ls-map__svg'); let drag = null;
      const pt = e => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 640, y: (e.clientY - r.top) / r.height * 360 }; };
      svg.addEventListener('pointerdown', e => { const g = e.target.closest('[data-node]'); if (!g) return; drag = m.nodes.find(x => x.id === g.dataset.node); svg.setPointerCapture(e.pointerId); });
      svg.addEventListener('pointermove', e => { if (!drag) return; const p = pt(e); drag.x = Math.max(70, Math.min(570, p.x)); drag.y = Math.max(20, Math.min(340, p.y)); const g = svg.querySelector(`[data-node="${drag.id}"]`); g.setAttribute('transform', `translate(${drag.x},${drag.y})`); svg.querySelectorAll('.ls-map__e').forEach(x => x.remove()); });
      svg.addEventListener('pointerup', () => { if (drag) { drag = null; redraw(); } });
      svg.addEventListener('dblclick', e => { const g = e.target.closest('[data-node]'); if (!g) return; const x = m.nodes.find(y => y.id === g.dataset.node); const v = prompt(T('Rename idea', 'أعد التسمية'), x.text); if (v != null && v.trim()) { x.text = v.trim().slice(0, 60); redraw(); } });
    }
    ed.addEventListener('click', e => {
      if (e.target.closest('[data-madd]')) { const v = prompt(T('New idea', 'فكرة جديدة')); if (v && v.trim()) { m.nodes.push({ id: LS.uid('k'), text: v.trim().slice(0, 60), x: 120 + (m.nodes.length * 97) % 420, y: 60 + (m.nodes.length * 71) % 260 }); redraw(); } }
      if (e.target.closest('[data-mlink]')) { if (m.nodes.length < 2) { LS.toast(T('Add at least two ideas first.', 'أضف فكرتين أولاً.')); return; }
        const opts = m.nodes.map(x => `<option value="${x.id}">${esc(x.text)}</option>`).join('');
        const d = LS.dialog(`<h2 id="lsDlgT">${T('Link two ideas', 'اربط فكرتين')}</h2><label class="ls-field">${T('From', 'من')}<select name="a">${opts}</select></label><label class="ls-field">${T('Link label (optional)', 'وصف الرابط')}<input name="l" placeholder="${T('e.g. causes, is part of', 'مثلاً: يسبب')}"></label><label class="ls-field">${T('To', 'إلى')}<select name="b">${m.nodes.map((x, i) => `<option value="${x.id}" ${i === 1 ? 'selected' : ''}>${esc(x.text)}</option>`).join('')}</select></label><div class="ls-row"><button type="button" class="ls-btn ls-btn--accent" data-ok>${T('Link', 'اربط')}</button><button type="button" class="ls-btn ls-btn--quiet" data-close>${T('Cancel', 'إلغاء')}</button></div>`);
        d.el.querySelector('[data-ok]').onclick = () => { const a = d.el.querySelector('[name=a]').value, b = d.el.querySelector('[name=b]').value; if (a !== b) m.edges.push({ a, b, label: d.el.querySelector('[name=l]').value.trim().slice(0, 40) }); d.close(); redraw(); };
      }
      const nd = e.target.closest('[data-ndel]'); if (nd) { m.nodes = m.nodes.filter(x => x.id !== nd.dataset.ndel); m.edges = m.edges.filter(x => x.a !== nd.dataset.ndel && x.b !== nd.dataset.ndel); redraw(); }
      const edl = e.target.closest('[data-edel]'); if (edl) { m.edges.splice(+edl.dataset.edel, 1); redraw(); }
    });
    ed.addEventListener('change', e => { const nt = e.target.closest('[data-ntext]'); if (nt) { const x = m.nodes.find(y => y.id === nt.dataset.ntext); if (x && nt.value.trim()) { x.text = nt.value.trim().slice(0, 60); redraw(); } } const el = e.target.closest('[data-elabel]'); if (el) { m.edges[+el.dataset.elabel].label = el.value.trim().slice(0, 40); redraw(); } });
    wire();
  }

  LS.route('notebook', page);
})();
