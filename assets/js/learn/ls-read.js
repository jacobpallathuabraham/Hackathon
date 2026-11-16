/* ERLY Learning Studio v20 — Read & Resources.

   The old Reading Studio is no longer a separate destination: its reader (assets/js/studio.js — PDF/text via
   pdf.js on this device, highlights, notes, bookmarks, search, zoom, read-aloud, glossary, summaries) opens from
   here, in one of five reading modes applied through the reader's own settings API (ERLY.reader.applyPrefs).

   Library: every resource the Studio has — lessons, readings, ERLY videos, external videos, interactive and 3D
   models, diagrams, open textbooks (external) and audio lessons — with search, type and subject filters,
   sorting, favourites, collections and "open your own file". Reading progress shown here is the reader's own
   record (erly-studio-v1); nothing is estimated. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store;
  const MODES = {
    standard: { label: 'Standard', desc: 'The reading as published.', prefs: { font: 'classic', size: 19, lh: 1.75, ls: 0, ws: 0, width: 660, focus: false } },
    focused: { label: 'Focused', desc: 'A line focus that follows your place, and a narrower column.', prefs: { focus: true, width: 580 } },
    comfortable: { label: 'Comfortable', desc: 'Larger, more open type (Atkinson Hyperlegible), wider spacing, a cream page.', prefs: { font: 'atkinson', size: 21, lh: 2.0, ls: 0.02, ws: 0.08, width: 620, tint: 'cream', focus: false } },
    audio: { label: 'Audio-supported', desc: 'Read-aloud starts from where you are, with the words highlighted as they are spoken.', prefs: { focus: false }, act: 'tts' },
    guided: { label: 'Guided', desc: 'Line focus plus the summary of each section beside the text.', prefs: { focus: true, width: 600 }, act: 'guided' }
  };
  LS.READ_MODES = MODES;
  const lib = () => window.STUDIO_LIBRARY || [];
  const docTitle = r => r.title.replace(/_/g, ' ').replace(/\.pdf$/i, '');

  // open a reading in the reader, in a mode; the Studio's dark theme gets the reader's night page
  LS.openReading = (id, mode) => {
    if (!(window.ERLY && ERLY.openStudio)) { LS.toast(T('The reader could not load.', 'تعذر تحميل القارئ.')); return; }
    mode = mode || (st.data().settings.readMode) || 'standard';
    if (id) { st.touch('reading', id, docTitle(lib().find(r => r.id === id) || { title: id })); st.useFormat(mode === 'audio' ? 'audio' : 'text'); }
    ERLY.openStudio(document.activeElement, id ? { doc: id } : { library: true });
    if (!id) return;
    setTimeout(() => {
      const R = ERLY.reader; if (!R) return; const m = MODES[mode] || MODES.standard;
      const prefs = Object.assign({}, m.prefs); if (!prefs.tint) prefs.tint = document.documentElement.dataset.theme === 'dark' ? 'night' : 'paper';
      try { R.applyPrefs(prefs); if (m.act === 'tts') R.act('tts'); if (m.act === 'guided') { R.act('focus'); R.act('study', 'sum'); } } catch (e) { /* the reader keeps its own settings */ }
    }, 650);
  };

  /* ---------- every resource ---------- */
  function all() {
    const out = LS.resources().map(r => Object.assign({ key: r.type + ':' + r.id }, r));
    Object.entries({ heart: ['Schematic of the human heart', 'Biology', 'bio-heart'], chloroplast: ['Schematic of a chloroplast', 'Biology', 'bio-photo'], circuit: ['Series circuit diagram', 'Physics', 'phys-circuits'], phScale: ['The pH scale', 'Chemistry', 'chem-ph'] })
      .forEach(([k, [t, s, l]]) => out.push({ key: 'diagram:' + k, type: 'diagram', id: k, title: t, subject: s, topic: (LS.lesson(l) || {}).topic || '', tags: 'diagram figure', href: `#/lesson/${l}`, prov: 'erly', meta: 'ERLY diagram · from ' + (LS.lesson(l) || {}).title, fig: k }));
    const seen = new Set(); LS.lessons.forEach(L => (L.further || []).concat(L.provenance.sources || []).forEach(x => { if (seen.has(x.url)) return; seen.add(x.url); out.push({ key: 'book:' + x.url, type: 'book', id: x.url, title: x.title, subject: L.subject, topic: L.topic, tags: 'textbook openstax', url: x.url, prov: 'external', meta: x.publisher + ' · open textbook, external' }); }));
    out.forEach(r => { if (r.type === 'model') { const e = window.ERLY_LAB && ERLY_LAB.engines.find(x => x.id === r.id); r.three = !!(e && /3d|vsepr|unit cell|dna|molecul|surface|lines3d|revolution/i.test(e.title + ' ' + e.id)); } });
    return out;
  }
  const TYPES = [['all', 'All'], ['lesson', 'Lessons'], ['reading', 'Readings'], ['book', 'Textbooks'], ['video', 'Videos'], ['model', 'Interactive models'], ['model3d', '3D models'], ['diagram', 'Diagrams']];
  const typeName = r => (r.type === 'model' && r.three ? '3D model' : { lesson: 'Lesson', reading: 'Reading (PDF)', book: 'Open textbook', video: 'Video', model: 'Interactive model', diagram: 'Diagram' }[r.type] || r.type);
  const favs = () => (st.data().favs = st.data().favs || {});
  const cols = () => (st.data().collections = st.data().collections || {});
  const lastOpened = r => { const x = st.data().recent.find(y => (y.type === r.type || (y.type === 'lab' && r.type === 'model')) && y.id === r.id); return x ? x.at : 0; };

  function openRes(r) {
    if (r.type === 'reading') return LS.openReading(r.id);
    if (r.type === 'book') return window.open(r.url, '_blank', 'noopener');
    if (r.type === 'diagram') { const d = LS.dialog(`<h2 id="lsDlgT">${esc(r.title)}</h2><div class="ls-dlgfig">${LS.fig[r.fig]}</div><p class="ls-muted ls-small">${esc(LS.fig[r.fig + 'Cap'] || LS.fig[r.fig.replace('Scale', '') + 'Cap'] || '')}</p><div class="ls-row"><a class="ls-btn" href="${esc(r.href)}" data-close>${T('Open its lesson', 'افتح درسه')}</a><button type="button" class="ls-btn ls-btn--quiet" data-save>${T('Save to notebook', 'احفظ')}</button><button type="button" class="ls-btn ls-btn--quiet" data-close>${T('Close', 'إغلاق')}</button></div>`); d.el.querySelector('[data-save]').onclick = () => { LS.notes.quick({ title: 'Diagram: ' + r.title, html: LS.fig[r.fig] + '<p></p>', kind: 'diagram', src: { type: 'diagram', id: r.id, title: r.title, where: r.href } }); d.close(); }; return; }
    location.hash = r.href;
  }

  function library(view) {
    const q = LS._rq || '', ty = LS._rt || 'all', sub = LS._rs || 'all', sort = LS._rsort || 'relevance', fav = !!LS._rfav;
    const res = all(), words = q.toLowerCase().split(/\s+/).filter(Boolean), F = favs();
    let shown = res.filter(r => (ty === 'all' || r.type === ty || (ty === 'model3d' && r.type === 'model' && r.three)) && (sub === 'all' || (LS.subjects.find(s => s.id === sub) || { lesson: /^$/ }).lesson.test(r.subject) || (LS.subjects.find(s => s.id === sub) || { models: /^$/ }).models.test(r.topic || '')) && (!fav || F[r.key]) && words.every(w => (r.title + ' ' + r.subject + ' ' + (r.topic || '') + ' ' + (r.tags || '') + ' ' + (r.meta || '')).toLowerCase().includes(w)));
    const order = { lesson: 0, reading: 1, video: 2, book: 3, diagram: 4, model: 5 };
    if (sort === 'az') shown.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'recent') shown.sort((a, b) => lastOpened(b) - lastOpened(a));
    else if (sort === 'type') shown.sort((a, b) => (order[a.type] - order[b.type]) || a.title.localeCompare(b.title));
    else shown.sort((a, b) => (F[b.key] ? 1 : 0) - (F[a.key] ? 1 : 0) || (order[a.type] - order[b.type]));
    const lim = !q && ty === 'all' && sub === 'all' && !fav ? 36 : 600;
    view.innerHTML = `<div class="lr"><header class="lenv__head"><h1>${T('Library', 'المكتبة')}</h1><p class="lh__lead">${(() => { const n = k => res.filter(r => r.type === k).length, pl = (k, one, many) => `${n(k)} ${n(k) === 1 ? one : many}`; return `${res.length} ${T('resources', 'مورداً')}: ${[pl('lesson', 'lesson', 'lessons'), pl('reading', 'course reading', 'course readings'), pl('video', 'ERLY video', 'ERLY videos'), pl('book', 'open textbook', 'open textbooks'), pl('diagram', 'diagram', 'diagrams'), pl('model', 'interactive model', 'interactive models')].join(', ')}.`; })()} ${T('Everything you open is remembered here; star the ones you want close.', 'كل ما تفتحه يُتذكر هنا.')}</p></header>
      <div class="lr__bar"><div class="ui-field lr__q"><svg viewBox="0 0 24 24" aria-hidden="true" class="ls-i"><path d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm5-2 5 5"/></svg><input type="search" data-rq value="${esc(q)}" placeholder="${T('Search the library…', 'ابحث في المكتبة…')}" aria-label="${T('Search the library', 'ابحث في المكتبة')}"></div>
        <label class="lr__sel"><span>${T('Subject', 'المادة')}</span><select data-rs><option value="all">${T('All subjects', 'كل المواد')}</option>${LS.subjects.map(s => `<option value="${s.id}" ${s.id === sub ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <label class="lr__sel"><span>${T('Sort', 'الترتيب')}</span><select data-rsort>${[['relevance', 'Starred first'], ['recent', 'Recently opened'], ['az', 'A–Z'], ['type', 'By type']].map(([v, l]) => `<option value="${v}" ${v === sort ? 'selected' : ''}>${T(l, l)}</option>`).join('')}</select></label>
        <button type="button" class="ls-btn ls-btn--sm" data-own>${T('Open your own PDF or text', 'افتح ملفك')}</button></div>
      <div class="lr__types" role="group" aria-label="${T('Type', 'النوع')}">${TYPES.map(([k, l]) => `<button type="button" class="lr__chip" data-rt="${k}" aria-pressed="${k === ty}">${T(l, l)}</button>`).join('')}<button type="button" class="lr__chip" data-rfav aria-pressed="${fav}">★ ${T('Starred', 'المميزة')}</button></div>
      <p class="ls-small ls-muted" aria-live="polite">${shown.length} ${T('results', 'نتيجة')}</p>
      ${LS.invalid.length ? `<p class="ls-call ls-call--warn" role="alert">${LS.invalid.length} ${T('content item(s) failed validation and are hidden until fixed.', 'عناصر لم تجتز التحقق.')}</p>` : ''}
      <ul class="lr__grid">${shown.slice(0, lim).map(r => `<li class="lres lres--${r.type}${r.three ? ' lres--3d' : ''}"><button type="button" class="lres__open" data-open="${esc(r.key)}"><span class="lres__k">${esc(typeName(r))}</span><b>${esc(r.title)}</b><small>${esc(r.meta || r.subject || '')}</small>${r.type === 'reading' ? readBar(r.id) : ''}</button><div class="lres__tools">${r.prov === 'external' ? `<span class="ls-prov ls-prov--ext">${T('External', 'خارجي')}</span>` : LS.provBadge(r.prov)}<button type="button" class="lres__star" data-fav="${esc(r.key)}" aria-pressed="${!!F[r.key]}" aria-label="${F[r.key] ? T('Unstar', 'إلغاء التمييز') : T('Star', 'ميّز')}: ${esc(r.title)}">${F[r.key] ? '★' : '☆'}</button><button type="button" class="lres__col" data-col="${esc(r.key)}" aria-label="${T('Add to a collection', 'أضف إلى مجموعة')}: ${esc(r.title)}">+</button></div></li>`).join('')}</ul>
      ${shown.length > lim ? `<p class="ls-muted">${shown.length - lim} ${T('more — search or filter to see them.', 'أخرى — ابحث لرؤيتها.')}</p>` : ''}
      <section class="lh__sec"><h2 class="lh__h">${T('Audio lesson on any topic', 'درس صوتي لأي موضوع')}</h2><form class="lr__audio" data-audio><div class="ui-field"><input name="t" required placeholder="${T('e.g. the water cycle', 'مثلاً دورة الماء')}" aria-label="${T('Topic for an audio lesson', 'موضوع الدرس الصوتي')}"><button class="ls-btn ls-btn--sm ls-btn--accent" type="submit">${T('Make it', 'أنشئه')}</button></div></form><p class="ls-small ls-muted">${T('Quotes a named encyclopedia source (only the topic words are sent to Wikipedia), or says when none was found.', 'يقتبس من مصدر مسمّى.')}</p></section></div>`;
    const root = view.querySelector('.lr'), map = Object.fromEntries(res.map(r => [r.key, r]));
    root.addEventListener('input', e => { if (e.target.matches('[data-rq]')) { LS._rq = e.target.value; clearTimeout(library.t); library.t = setTimeout(() => { const pos = e.target.selectionStart; LS.render(); const s = document.querySelector('[data-rq]'); if (s) { s.focus(); s.setSelectionRange(pos, pos); } }, 200); } });
    root.addEventListener('change', e => { if (e.target.matches('[data-rs]')) { LS._rs = e.target.value; LS.render(); } if (e.target.matches('[data-rsort]')) { LS._rsort = e.target.value; LS.render(); } });
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-rt]'); if (t) { LS._rt = t.dataset.rt; LS.render(); return; }
      if (e.target.closest('[data-rfav]')) { LS._rfav = !LS._rfav; LS.render(); return; }
      if (e.target.closest('[data-own]')) { LS.openReading(null); return; }
      const o = e.target.closest('[data-open]'); if (o) { openRes(map[o.dataset.open]); return; }
      const f = e.target.closest('[data-fav]'); if (f) { const k = f.dataset.fav; st.update(d => { d.favs = d.favs || {}; if (d.favs[k]) delete d.favs[k]; else d.favs[k] = Date.now(); }); const on = !!favs()[k]; f.setAttribute('aria-pressed', on); f.textContent = on ? '★' : '☆'; window.ERLY && ERLY.ui && ERLY.ui.flash(f); LS.announce(on ? T('Starred', 'مميّز') : T('Unstarred', 'أُلغي التمييز')); return; }
      const c = e.target.closest('[data-col]'); if (c) collectDialog(map[c.dataset.col]);
    });
    root.querySelector('[data-audio]').addEventListener('submit', e => { e.preventDefault(); const t = e.target.t.value.trim(); if (t && window.ERLY && ERLY.audioLesson) { st.useFormat('audio'); st.touch('audio', t, 'Audio lesson: ' + t); ERLY.audioLesson.start(t); } });
  }
  function readBar(id) { const p = (LS.readingProgress() || []).find(x => x.id === id); return p ? `<span class="lc__bar" role="progressbar" aria-label="${T('Read', 'مقروء')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.frac * 100)}"><i style="width:${Math.round(p.frac * 100)}%"></i></span>` : ''; }
  function collectDialog(r) {
    const C = cols(), names = Object.keys(C);
    const d = LS.dialog(`<h2 id="lsDlgT">${T('Add to a collection', 'أضف إلى مجموعة')}</h2><p class="ls-muted">${esc(r.title)}</p>${names.length ? `<fieldset><legend>${T('Your collections', 'مجموعاتك')}</legend>${names.map(n => `<label class="ls-chk"><input type="checkbox" value="${esc(n)}" ${C[n].includes(r.key) ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</fieldset>` : ''}<label class="ls-field">${T('New collection', 'مجموعة جديدة')}<input name="n" placeholder="${T('e.g. Exam revision', 'مثلاً مراجعة الامتحان')}"></label><div class="ls-row"><button type="button" class="ls-btn ls-btn--accent" data-ok>${T('Save', 'احفظ')}</button><button type="button" class="ls-btn ls-btn--quiet" data-close>${T('Cancel', 'إلغاء')}</button></div>`);
    d.el.querySelector('[data-ok]').onclick = () => { const nn = d.el.querySelector('[name=n]').value.trim().slice(0, 40); st.update(dd => { dd.collections = dd.collections || {}; d.el.querySelectorAll('input[type=checkbox]').forEach(cb => { const list = dd.collections[cb.value]; const i = list.indexOf(r.key); if (cb.checked && i < 0) list.push(r.key); if (!cb.checked && i >= 0) list.splice(i, 1); }); if (nn) { dd.collections[nn] = dd.collections[nn] || []; if (!dd.collections[nn].includes(r.key)) dd.collections[nn].push(r.key); } }); d.close(); LS.toast(T('Collections updated.', 'حُدّثت المجموعات.')); };
  }

  function readings(view) {
    const prog = LS.readingProgress(), mode = st.data().settings.readMode || 'standard';
    let db = null; try { db = JSON.parse(localStorage.getItem('erly-studio-v1') || 'null'); } catch (e) { db = null; }
    const hl = id => ((db && db.notes && db.notes[id]) || []).length, bm = id => ((db && db.marks && db.marks[id]) || []).length;
    view.innerHTML = `<div class="lr"><header class="lenv__head"><h1>${T('Readings', 'القراءات')}</h1><p class="lh__lead">${T('Course readings and your own files open in the reader: highlights in four colours with notes, bookmarks, search, zoom, page thumbnails, read-aloud, glossary pop-ups, summaries and Noor beside the text. Your own files are read on this device and never uploaded.', 'القارئ يعمل على جهازك.')}</p></header>
      <section class="lh__sec"><h2 class="lh__h">${T('Reading mode', 'وضع القراءة')}</h2><div class="lr__modes" role="radiogroup" aria-label="${T('Reading mode', 'وضع القراءة')}">${Object.entries(MODES).map(([k, m]) => `<label class="lr__mode"><input type="radio" name="rmode" value="${k}" ${k === mode ? 'checked' : ''}><span><b>${T(m.label, m.label)}</b><small>${T(m.desc, m.desc)}</small></span></label>`).join('')}</div><p class="ls-small ls-muted">${T('Every setting can still be changed inside the reader: font, size, spacing, width, page tint, line focus.', 'يمكن تغيير الإعدادات داخل القارئ.')}</p></section>
      <section class="lh__sec"><div class="lh__row"><h2 class="lh__h">${T('Your readings', 'قراءاتك')}</h2><button type="button" class="ls-btn ls-btn--sm" data-own>${T('Open your own PDF or text', 'افتح ملفك')}</button></div>
        <ul class="lr__docs">${lib().map(r => { const p = prog.find(x => x.id === r.id); return `<li><button type="button" class="lr__doc" data-doc="${esc(r.id)}"><span class="lr__spine" aria-hidden="true">${esc((r.course || '').split(' · ')[0])}</span><span class="lr__dbody"><span class="lres__k">${esc(r.short || '')}</span><b>${esc(docTitle(r))}</b><small>${esc(r.course || '')}</small>${p ? `<span class="lc__bar" role="progressbar" aria-label="${T('Read', 'مقروء')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.frac * 100)}"><i style="width:${Math.round(p.frac * 100)}%"></i></span><small>${Math.round(p.frac * 100)}% ${T('read', 'مقروء')} · ${LS.ago(p.at)}</small>` : `<small>${T('Not started', 'لم تبدأ')}</small>`}${hl(r.id) || bm(r.id) ? `<small>${hl(r.id)} ${T('highlights', 'تمييزات')} · ${bm(r.id)} ${T('bookmarks', 'علامات')}</small>` : ''}</span><span class="lc__go">${p ? T('Resume', 'تابع') : T('Open', 'افتح')} →</span></button></li>`; }).join('')}</ul>
        <p class="ls-small ls-muted">${T('These are demonstration readings for fictional Acubins University courses.', 'قراءات تجريبية لمقررات خيالية.')}</p></section></div>`;
    const root = view.querySelector('.lr');
    root.addEventListener('change', e => { if (e.target.name === 'rmode') { st.update(d => { d.settings.readMode = e.target.value; }); LS.toast(T(MODES[e.target.value].label + ' reading mode', '')); } });
    root.addEventListener('click', e => { const dd = e.target.closest('[data-doc]'); if (dd) LS.openReading(dd.dataset.doc, st.data().settings.readMode); if (e.target.closest('[data-own]')) LS.openReading(null); });
  }

  function saved(view) {
    const F = favs(), C = cols(), res = all(), map = Object.fromEntries(res.map(r => [r.key, r])), d = st.data();
    const starred = Object.keys(F).map(k => map[k]).filter(Boolean);
    view.innerHTML = `<div class="lr"><header class="lenv__head"><h1>${T('Saved', 'المحفوظات')}</h1><p class="lh__lead">${T('Your starred resources, collections and bookmarks in one place.', 'المميزة والمجموعات والعلامات.')}</p></header>
      <section class="lh__sec"><h2 class="lh__h">★ ${T('Starred', 'المميزة')} (${starred.length})</h2>${starred.length ? `<ul class="lh__list">${starred.map(r => `<li><button type="button" class="ls-linkbtn" data-open="${esc(r.key)}">${esc(r.title)}</button><small>${esc(typeName(r))}</small></li>`).join('')}</ul>` : `<p class="ls-muted">${T('Star anything in the Library to keep it here.', 'ميّز أي مورد ليظهر هنا.')}</p>`}</section>
      <section class="lh__sec"><h2 class="lh__h">${T('Collections', 'المجموعات')}</h2>${Object.keys(C).length ? Object.entries(C).map(([n, ks]) => `<details class="lr__colx" open><summary><b>${esc(n)}</b> <small class="ls-muted">${ks.length}</small> <button type="button" class="ls-linkbtn" data-delcol="${esc(n)}">${T('Delete collection', 'احذف المجموعة')}</button></summary><ul class="lh__list">${ks.map(k => map[k]).filter(Boolean).map(r => `<li><button type="button" class="ls-linkbtn" data-open="${esc(r.key)}">${esc(r.title)}</button><small>${esc(typeName(r))}</small></li>`).join('') || `<li class="ls-muted">—</li>`}</ul></details>`).join('') : `<p class="ls-muted">${T('Use “+” on any Library item to start a collection.', 'استخدم + لإنشاء مجموعة.')}</p>`}</section>
      <section class="lh__sec"><h2 class="lh__h">${T('Bookmarks', 'العلامات')}</h2>${d.bookmarks.length ? `<ul class="lh__list">${d.bookmarks.map(b => `<li><a href="${esc(b.where)}">${esc(b.label)}</a><small>${LS.fmtDate(b.at)}</small></li>`).join('')}</ul>` : `<p class="ls-muted">${T('Bookmarks from videos and lesson sections appear here. Reading bookmarks live inside each reading.', 'تظهر هنا علامات الفيديو والدروس.')}</p>`}</section></div>`;
    const root = view.querySelector('.lr');
    root.addEventListener('click', e => { const o = e.target.closest('[data-open]'); if (o) openRes(map[o.dataset.open]); const dc = e.target.closest('[data-delcol]'); if (dc) { e.preventDefault(); const n = dc.dataset.delcol, keep = C[n].slice(); st.update(dd => { delete dd.collections[n]; }); LS.render(); LS.toast(T('Collection deleted.', 'حُذفت المجموعة.'), { undo: () => { st.update(dd => { dd.collections = dd.collections || {}; dd.collections[n] = keep; }); LS.render(); } }); } });
  }

  LS.route('read', (view, parts) => (parts[0] === 'readings' ? readings(view) : parts[0] === 'saved' ? saved(view) : library(view)));
})();
