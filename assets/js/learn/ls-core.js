/* ERLY Learning Studio — core: storage with consent, the activity record, demo separation, routing, helpers.

   STORAGE. Nothing is written anywhere until the student chooses, on first visit:
     • "Save on this device" — learning data is kept in this browser's localStorage under one key
       (erly-learn-v1). It never leaves the device unless the student exports it or sends something to Noor.
     • "Just this visit" — kept in memory only; closing the tab forgets it.
   The choice, and "insights on/off", can be changed at any time in Privacy & data, which also exports and deletes.

   ACTIVITY RECORD. Only Studio learning actions are recorded: answers (and which attempt), lesson sections
   finished, flashcard reviews, notes, bookmarks, and which format the student chose to open. No timings of
   hesitation, no keystrokes, no camera or microphone, no page-view tracking, no third-party analytics.

   DEMO DATA. "Explore with demonstration data" swaps in a clearly labelled, made-up dataset held in memory.
   It is never mixed with, saved over, or counted as the student's own data. */
(function () {
  'use strict';
  const LS = window.LS = window.LS || {};
  const KEY = 'erly-learn-v1', VERSION = 1;
  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const uid = p => (p || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

  const blank = () => ({ v: VERSION, consent: null, profile: { explain: [], formats: [], pace: '', goals: [], helpWith: [], prefer: '', updated: 0 },
    settings: { readAloud: false, chunk: false, glossary: true, density: 'comfortable', insights: true },
    lessons: {}, attempts: [], mistakes: {}, cards: {}, notes: {}, folders: ['General'], recent: [], bookmarks: [], video: {}, dismissed: {}, formatUse: {}, paths: {}, events: [], plan: null, milestones: {}, archive: [], created: Date.now() });

  let real = null, demo = null, mode = 'real';
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); if (d && d.v === VERSION) return Object.assign(blank(), d); } } catch (e) { /* storage blocked or corrupt: start empty */ }
    return blank();
  }
  real = load();
  const D = () => (mode === 'demo' ? demo : real);
  let saveT = null;
  function persist() {
    if (mode === 'demo') return; // demonstration data is never saved
    if (!real.consent || real.consent.store !== 'device') return;
    try { localStorage.setItem(KEY, JSON.stringify(real)); LS.saveError = null; } catch (e) { LS.saveError = e; emit('save-error', e); }
  }
  const save = () => { clearTimeout(saveT); saveT = setTimeout(persist, 120); };
  addEventListener('pagehide', persist);

  const subs = {};
  function on(ev, f) { (subs[ev] = subs[ev] || []).push(f); return () => { subs[ev] = subs[ev].filter(x => x !== f); }; }
  function emit(ev, d) { (subs[ev] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } }); }

  const store = {
    data: D, mode: () => mode,
    consent: () => real.consent,
    setConsent(c) { real.consent = Object.assign({ at: Date.now() }, c); if (c.store === 'device') persist(); else { try { localStorage.removeItem(KEY); } catch (e) { /* none */ } } emit('change', 'consent'); },
    save, persist,
    update(fn) { fn(D()); save(); emit('change'); },
    // learning activity
    recordAttempt(a) {
      const d = D(); const prev = d.attempts.filter(x => x.qid === a.qid).length;
      const row = Object.assign({ at: Date.now(), attemptNo: prev + 1 }, a);
      if (!row.obj && LS.engine) { const k = LS.engine.objOf(a.q || { id: a.qid, lesson: a.lesson, objective: a.objective }); if (k) row.obj = k; } delete row.q;
      d.attempts.push(row); if (d.attempts.length > 3000) d.attempts = d.attempts.slice(-3000);
      if (row.correct === false) {
        const m = d.mistakes[a.qid] || { qid: a.qid, at: row.at, first: row.answerText, topic: a.topic, subject: a.subject, lesson: a.lesson, prompt: a.prompt, type: a.type, tag: a.errorTag || null, tries: 0, laterCorrect: false, revisited: 0 };
        m.last = row.answerText; m.lastAt = row.at; m.tries++; if (a.errorTag) m.tag = a.errorTag; if (m.laterCorrect) { m.laterCorrect = false; m.slipped = true; }
        d.mistakes[a.qid] = m;
      } else if (row.correct === true && d.mistakes[a.qid]) { d.mistakes[a.qid].laterCorrect = true; d.mistakes[a.qid].fixedAt = row.at; }
      save(); emit('change', 'attempt'); return row;
    },
    // a short written answer is judged by the student against the model answer
    markSelf(row, ok) { const d = D(); row.correct = ok; row.selfMarked = true; if (!ok) d.mistakes[row.qid] = Object.assign({ qid: row.qid, at: row.at, first: row.answerText, topic: row.topic, subject: row.subject, lesson: row.lesson, prompt: row.prompt, type: row.type, tries: 1, laterCorrect: false, revisited: 0 }, d.mistakes[row.qid] || {}); else if (d.mistakes[row.qid]) d.mistakes[row.qid].laterCorrect = true; save(); emit('change', 'attempt'); },
    useFormat(f) { const d = D(); d.formatUse[f] = (d.formatUse[f] || 0) + 1; save(); },
    touch(type, id, title, extra) { const d = D(); d.recent = [{ type, id, title, at: Date.now(), extra: extra || null }].concat(d.recent.filter(r => !(r.type === type && r.id === id))).slice(0, 30); save(); emit('change', 'recent'); },
    lessonProgress(id) { return D().lessons[id] || null; },
    setLesson(id, patch) { const d = D(); d.lessons[id] = Object.assign({ started: Date.now(), done: {}, secIx: 0 }, d.lessons[id] || {}, patch, { last: Date.now() }); save(); emit('change', 'lesson'); },
    // export / delete
    exportJSON() { return JSON.stringify(Object.assign({ exported: new Date().toISOString(), note: 'ERLY Learning Studio data — exactly what this browser stores for the Studio.' }, real), null, 2); },
    deleteAll() { const c = real.consent; real = blank(); real.consent = c && { store: c.store, at: Date.now(), insights: c.insights }; try { localStorage.removeItem(KEY); } catch (e) { /* none */ } persist(); emit('change', 'deleted'); },
    deletePart(part) { const b = blank(); real[part] = b[part]; if (part === 'attempts') real.mistakes = {}; persist(); emit('change', 'deleted:' + part); },
    sizeBytes() { try { return (localStorage.getItem(KEY) || '').length; } catch (e) { return 0; } },
    // demo mode
    demo(on) { if (on) { demo = LS.makeDemo ? LS.makeDemo(blank()) : blank(); mode = 'demo'; } else { mode = 'real'; demo = null; } emit('change', 'mode'); },
    on, emit
  };
  LS.store = store; LS.T = T; LS.esc = esc; LS.uid = uid; LS.on = on; LS.emit = emit;

  /* ---------- safe text formatting ----------
     Content markup is a tiny, escaped subset: **bold**, *italic*, `code`, ^{sup}/^2, _{sub}, [[term]] (glossary),
     blank lines between paragraphs and "- " lists. Everything is escaped first, so content can never inject HTML. */
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\^\{(.+?)\}/g, '<sup>$1</sup>').replace(/_\{(.+?)\}/g, '<sub>$1</sub>')
      .replace(/\[\[(.+?)(?:\|(.+?))?\]\]/g, (m, t, label) => `<button type="button" class="ls-term" data-term="${t}">${label || t}</button>`);
  }
  function md(s) {
    return String(s || '').trim().split(/\n\s*\n/).map(p => {
      const lines = p.split('\n');
      if (lines.every(l => /^\s*[-•]\s+/.test(l))) return '<ul>' + lines.map(l => '<li>' + inline(l.replace(/^\s*[-•]\s+/, '')) + '</li>').join('') + '</ul>';
      if (lines.every(l => /^\s*\d+[.)]\s+/.test(l))) return '<ol>' + lines.map(l => '<li>' + inline(l.replace(/^\s*\d+[.)]\s+/, '')) + '</li>').join('') + '</ol>';
      return '<p>' + lines.map(inline).join('<br>') + '</p>';
    }).join('');
  }
  // maths written as plain text (x^2, v_0, sqrt(…), *) shown with proper symbols
  function math(s) {
    return esc(s).replace(/\^\{(.+?)\}/g, '<sup>$1</sup>').replace(/\^(-?[\w.]+)/g, '<sup>$1</sup>').replace(/_\{(.+?)\}/g, '<sub>$1</sub>').replace(/_(\w)/g, '<sub>$1</sub>')
      .replace(/\bsqrt\(/g, '√(').replace(/ \* /g, ' × ').replace(/(\d)\*(\w)/g, '$1·$2').replace(/&lt;=/g, '≤').replace(/&gt;=/g, '≥').replace(/!=/g, '≠').replace(/->/g, '→').replace(/\bDelta\b/g, 'Δ').replace(/\btheta\b/g, 'θ').replace(/\bpi\b/g, 'π').replace(/\bomega\b/g, 'ω').replace(/\blambda\b/g, 'λ').replace(/\bmu\b/g, 'μ').replace(/\brho\b/g, 'ρ');
  }
  const plain = s => String(s || '').replace(/\*\*|\*|`|\[\[|\]\]/g, '').replace(/\|[^\]]*/g, '').replace(/\^\{(.+?)\}/g, '^$1').replace(/_\{(.+?)\}/g, '_$1');
  LS.md = md; LS.inline = inline; LS.math = math; LS.plain = plain;

  /* ---------- small UI helpers ---------- */
  let toastT;
  LS.toast = (msg, o) => { const el = document.getElementById('lsToast'); if (!el) return; el.innerHTML = esc(msg) + (o && o.undo ? ` <button type="button" class="ls-btn ls-btn--quiet" data-undo>${T('Undo', 'تراجع')}</button>` : ''); el.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('is-on'), o && o.undo ? 6000 : 2800); if (o && o.undo) el.querySelector('[data-undo]').onclick = () => { o.undo(); el.classList.remove('is-on'); }; };
  LS.announce = msg => { const el = document.getElementById('lsLive'); if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); } };
  LS.fmtDate = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  LS.ago = t => { const m = Math.round((Date.now() - t) / 60000); if (m < 1) return T('just now', 'الآن'); if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + ' h ago'; const d = Math.round(h / 24); return d === 1 ? 'yesterday' : d + ' days ago'; };
  // an accessible modal dialog: focus moves in, Tab stays inside, Escape closes, focus returns
  LS.dialog = (html, o) => {
    o = o || {}; const back = document.activeElement;
    const wrap = document.createElement('div'); wrap.className = 'ls-dlg'; wrap.innerHTML = `<div class="ls-dlg__box" role="dialog" aria-modal="true" aria-labelledby="lsDlgT" tabindex="-1">${html}</div>`;
    document.body.appendChild(wrap); const box = wrap.firstElementChild;
    const close = v => { wrap.remove(); if (back && back.focus) back.focus(); if (o.onClose) o.onClose(v); };
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); const b = e.target.closest('[data-close]'); if (b) close(b.dataset.close); });
    wrap.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') { const f = [...box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    requestAnimationFrame(() => { const f = box.querySelector('[autofocus], input, textarea, select, button'); (f || box).focus(); });
    return { el: box, close };
  };

  /* ---------- router ----------  #/area/id/sub  */
  const routes = {};
  LS.route = (name, fn) => { routes[name] = fn; }; LS.routeFn = name => routes[name];
  LS.go = (path, o) => { const h = '#/' + path.replace(/^#?\/?/, ''); if (location.hash === h) render(); else if (o && o.replace) { history.replaceState(null, '', h); render(); } else location.hash = h; };
  LS.current = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/').map(decodeURIComponent);
  let lastArea = null;
  function render() {
    const parts = LS.current(), area = routes[parts[0]] ? parts[0] : 'home';
    const view = document.getElementById('lsView'); if (!view) return;
    emit('leave', lastArea); view.onclick = null; view.onkeydown = null;
    try { routes[area](view, parts.slice(1)); }
    catch (e) { console.error(e); view.innerHTML = `<section class="ls-err" role="alert"><h1>${T('Something went wrong on this screen', 'حدث خطأ في هذه الشاشة')}</h1><p>${esc(e.message)}</p><p>${T('Your saved work is not affected.', 'عملك المحفوظ لم يتأثر.')}</p><button class="ls-btn" type="button" onclick="LS.go('home')">${T('Back to Home', 'العودة')}</button></section>`; }
    emit('route', { area, parts });
    if (lastArea !== null) { const h = view.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } window.scrollTo({ top: 0 }); }
    lastArea = area;
  }
  LS.render = render;
  addEventListener('hashchange', render);
})();
