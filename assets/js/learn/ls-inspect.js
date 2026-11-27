/* ERLY Learning Studio — the content directory (#/inspect and #/inspect/<subject>).

   One readable, semantic HTML view of everything the Studio teaches, built from the SAME data the Studio runs on:
   the subject list (ls-home.js), the lessons (LS.lessons), the experience registry (LS.experiences) and each
   experience's own frame (LS.exp.DEFS: intro, prediction, instructions, explanation, questions, summary), the
   Visual Lab model list (ERLY_LAB.engines), the readings (STUDIO_LIBRARY), videos (LS.VIDEOS + captions files),
   paths (LS.paths) and the practice bank (LS.bank()). Nothing here is written by hand except the one-line
   descriptions of the Studio's sections, which repeat each section's own heading.

   Experience controls are not described by hand either: each experience is built off-screen with its real build()
   function, its labelled inputs and buttons are read from the DOM, and it is destroyed again. build() never touches
   the learning record (opening an experience does, and this page does not open them).

   This page only reads. It records no events and changes no progress. With ?inspect=1 the whole page also runs on
   empty in-memory storage (ls-boot.js), so nothing at all is kept.

   The same renderer produces the static text version in /learn-guide/ (tools/build-learn-guide.js), with links
   rewritten to work from there. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc;
  const md = s => (s ? LS.md(String(s)) : '');
  const il = s => (s ? (LS.inline ? LS.inline(String(s)) : esc(s)) : '');
  const txt = s => esc(String(s == null ? '' : s).replace(/\[([^\]]+)\]/g, '$1'));
  const subjects = () => LS.subjectsList || [];
  const S_ = id => subjects().find(s => s.id === id);

  /* ---------- links: live (inside the Studio) or static (from /learn-guide/) ---------- */
  let MODE = 'live';
  const R = route => (MODE === 'static' ? '../learn.html?inspect=1#/' + route : '#/' + route); // a real Studio route
  const DIR = sid => (MODE === 'static' ? (sid ? sid + '.html' : 'index.html') : '#/inspect' + (sid ? '/' + sid : ''));

  /* the Studio's real sections, in the order of its navigation (ls-shell.js); each description is the section's own heading */
  const SECTIONS = [
    ['Home', 'home', 'The dashboard: search across every experience and topic, ways to learn, continue where you left off, an experience of the day and a discovery grid.'],
    ['Explore · Subjects', 'explore', 'Eleven subject worlds, each with its own animated environment, topics and experiences.'],
    ['Explore · Topics', 'explore/topics', 'Every topic and its learning objectives, each with a state that comes from the student’s own answers.'],
    ['Explore · Discover', 'discover', 'Every interactive experience, grouped by kind, starting from a question.'],
    ['Learn · Lessons', 'lessons', 'Structured lessons that mix explanation, diagrams, live models, worked examples and activities, ending with a summary, revision questions and flashcards.'],
    ['Learn · Reading', 'read', 'Reading & Resources: course readings and the student’s own PDFs in a focused reader.'],
    ['Learn · Video', 'video', 'ERLY video lessons with captions, a clickable transcript, chapters, bookmarks and questions.'],
    ['Learn · Visual Lab', 'lab', 'Computed models: each calculates what it shows from real equations, explains its live numbers and can be reset.'],
    ['Practise · Practice', 'practice', 'Practice questions written for ERLY, by topic. They are not official exam questions.'],
    ['Practise · Flashcards', 'revise', 'A revision deck on a spacing schedule; each card shows why it is due.'],
    ['Practise · Mistakes', 'mistakes', 'Questions the student has got wrong, and whether they have since answered them correctly.'],
    ['My Workspace · Notebook', 'notebook', 'Notes with autosave, folders, lesson references and Markdown export.'],
    ['My Workspace · My Library', 'mylibrary', 'Bookmarks, starred readings, files, notes, flashcard collections and discoveries in one place.'],
    ['My Workspace · Paths', 'paths', 'Paths that order lessons so each builds on the last, ending with mixed practice.'],
    ['My Workspace · Progress', 'progress', 'What the student has opened, done and shown — counted separately.'],
    ['My Workspace · Journey', 'journey', 'Every learning objective drawn as a star that brightens as answers show understanding.'],
    ['My Workspace · Discovery archive', 'archive', 'Each experiment the student ran: prediction, observation and explanation.'],
    ['My Workspace · Privacy & data', 'profile', 'Where learning data is kept (this device or this visit only), what is recorded, export and delete.'],
    ['Noor tutor', 'noor', 'Ask about what you are learning. Noor asks you to try steps, explains mistakes and gives new examples rather than handing over answers.']
  ];

  /* ---------- data ---------- */
  const lab = () => (window.ERLY_LAB ? ERLY_LAB.engines : []);
  const kindOf = e => String(e.kind || '').split('·')[0].trim();
  const bankFor = S => LS.bank().filter(q => S.lesson.test(q.subject || ''));
  const contents = S => Object.assign({ exps: (LS.experiences || []).filter(x => x.subject === S.id) }, LS.subjectContents(S.id));
  function load() {
    return Promise.all([LS.needExp ? LS.needExp().catch(() => null) : null, LS.needLab ? LS.needLab().catch(() => null) : null]);
  }

  /* each experience's real controls, read from its own DOM after an off-screen build */
  const ctlCache = {};
  function controlsOf(id) {
    if (ctlCache[id]) return ctlCache[id];
    const def = LS.exp && LS.exp.DEFS[id]; if (!def || !def.build) return (ctlCache[id] = []);
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true'); host.style.cssText = 'position:fixed;left:-20000px;top:0;width:960px;height:640px;overflow:hidden;visibility:hidden;pointer-events:none';
    document.body.appendChild(host);
    const out = [];
    let M = null;
    try {
      M = def.build(host, LS.exp.ctx());
      const seen = new Set();
      host.querySelectorAll('input, select, button, textarea, [role="slider"], [role="radio"], [role="checkbox"]').forEach(el => {
        if (el.type === 'hidden') return;
        let label = el.getAttribute('aria-label') || '';
        if (!label && el.id) { const l = host.querySelector(`label[for="${el.id}"]`); if (l) label = l.textContent; }
        if (!label) { const l = el.closest('label'); if (l) { const k = l.cloneNode(true); k.querySelectorAll('output, input, select, button, textarea').forEach(n => n.remove()); label = k.textContent; } }
        if (!label) label = el.textContent || el.getAttribute('title') || el.value || '';
        const grp = el.closest('[role="group"], [role="radiogroup"], fieldset'); const gl = grp ? (grp.getAttribute('aria-label') || (grp.querySelector('legend') || {}).textContent || '') : '';
        label = label.replace(/\s+/g, ' ').trim(); if (!label) return;
        let kind = el.tagName === 'SELECT' ? 'choice' : el.tagName === 'BUTTON' ? (el.hasAttribute('aria-pressed') ? 'toggle button' : 'button') : el.type === 'range' ? 'slider' : el.type === 'checkbox' ? 'switch' : el.type === 'radio' ? 'option' : el.type === 'number' ? 'number' : el.type === 'text' ? 'text field' : (el.getAttribute('role') || el.type || 'control');
        let range = '';
        if (el.type === 'range' || el.type === 'number') range = `${el.min || '?'} to ${el.max || '?'}${el.step && el.step !== 'any' ? ', step ' + el.step : ''}`;
        if (el.tagName === 'SELECT') range = Array.from(el.options).map(o => o.textContent.trim()).join(' · ');
        const key = gl + '|' + label + '|' + kind; if (seen.has(key)) return; seen.add(key);
        out.push({ group: gl.replace(/\s+/g, ' ').trim(), label, kind, range });
      });
      out.drag = !!host.querySelector('canvas[tabindex], svg[tabindex], .kx-drag, [data-drag]');
    } catch (e) { out.error = e.message; }
    try { if (M && M.destroy) M.destroy(); else if (M && M.pause) M.pause(); } catch (e) { /* none */ }
    host.remove();
    return (ctlCache[id] = out);
  }

  /* ---------- rendering helpers ---------- */
  const OPTS = q => q.options || null;
  /* The correct response for every activity type, built from the same rules the grader uses (ls-grade.js), and the
     text shown for it. tests/e2e/learn-inspect.e2e.js feeds every one of these back into LS.grade.check and requires
     "correct" — so the directory can never show an answer the Studio itself would mark wrong. */
  function correct(q) {
    const o = q.options || [], plain = x => String(x == null ? '' : x);
    switch (q.graphAsk || q.type) {
      case 'mcq': return { resp: q.answer, text: plain(o[q.answer]) };
      case 'graph': return q.ask === 'numeric' ? { resp: String(q.answer), text: q.answer + (q.unit ? ' ' + q.unit : '') } : { resp: q.answer, text: plain(o[q.answer]) };
      case 'tf': return { resp: q.answer, text: q.answer ? 'True' : 'False' };
      case 'multi': return { resp: q.answer.slice(), text: q.answer.map(i => plain(o[i])).join('; ') };
      case 'numeric': return { resp: String(q.answer), text: (Math.abs(q.answer) > 0 && Math.abs(q.answer) < 1e-3 ? q.answer.toExponential() : String(q.answer)) + (q.unit ? ' ' + q.unit.replace('^3', '³') : '') };
      case 'expr': return { resp: q.answer, text: q.answer };
      case 'fill': { const r = q.blanks.map(b => (b.num != null ? String(b.num) : (b.accept || [])[0])); return { resp: r, text: r.map((x, i) => `blank ${i + 1}: ${x}`).join('; ') }; }
      case 'match': { const r = {}; q.pairs.forEach((_, i) => { r[i] = i; }); return { resp: r, text: q.pairs.map(p => `${p[0]} → ${p[1]}`).join('; ') }; }
      case 'order': return { resp: q.items.map((_, i) => i), text: q.items.join(' → ') };
      case 'label': { const r = {}; q.targets.forEach((t, i) => { r[i] = t.label; }); return { resp: r, text: q.targets.map(t => t.label).join(', ') }; }
      case 'sort': { const r = {}; q.items.forEach((it, i) => { r[i] = it.cat; }); return { resp: r, text: q.categories.map(c => `${c}: ${q.items.filter(it => it.cat === c).map(it => it.text).join(', ')}`).join(' · ') }; }
      case 'compare': { const r = {}; q.statements.forEach((st, i) => { r[i] = st.ans; }); return { resp: r, text: q.statements.map(st => `${st.text} — ${st.ans}`).join('; ') }; }
      case 'slider': { const P = q.param; let hit = null; for (let v = P.min; v <= P.max + 1e-9; v = Math.round((v + P.step) * 1e9) / 1e9) { try { if (LS.grade.check(q, v).correct) { hit = v; break; } } catch (e) { break; } } return hit == null ? { resp: null, text: '' } : { resp: hit, text: `${P.label} = ${hit}` }; }
      case 'steps': { const parts = q.steps.map(s => correct(s)); return { resp: parts.map(p => p.resp), text: parts.map((p, i) => `step ${i + 1}: ${p.text}`).join('; ') }; }
      case 'short': return { resp: null, text: q.model || '' };
      default: return { resp: null, text: '' };
    }
  }
  function question(q) {
    const o = q.options, why = typeof q.why === 'string' ? q.why : (q.explain || ''), ans = correct(q).text;
    const kids = [];
    if (o && o.length) kids.push(`<ol type="A">${o.map(x => `<li>${il(x)}</li>`).join('')}</ol>`);
    if (q.type === 'match') kids.push(`<p>Match: ${q.pairs.map(p => il(p[0])).join(' · ')} — with: ${q.pairs.map(p => il(p[1])).join(' · ')}</p>`);
    if (q.type === 'order') kids.push(`<p>Items to order: ${q.items.slice().sort().map(il).join(' · ')}</p>`);
    if (q.type === 'sort') kids.push(`<p>Sort into ${q.categories.map(il).join(', ')}: ${q.items.map(it => il(it.text)).join(' · ')}</p>`);
    if (q.type === 'compare') kids.push(`<p>For each statement choose ${q.concepts.map(il).join(', ')}${q.statements.some(s => s.ans === 'Both') ? ' or Both' : ''}:</p><ul>${q.statements.map(s => `<li>${il(s.text)}</li>`).join('')}</ul>`);
    if (q.type === 'label') kids.push(`<p>Labels to place on the diagram: ${q.targets.map(t => il(t.label)).concat((q.distractors || []).map(il)).join(' · ')}</p>`);
    if (q.type === 'fill') kids.push(`<p>${q.blanks.length} blank${q.blanks.length > 1 ? 's' : ''} to fill.</p>`);
    if (q.type === 'slider') kids.push(`<p>Slider ${il(q.param.label)} from ${q.param.min} to ${q.param.max} (steps of ${q.param.step}); ${il(q.resultLabel || 'the result')} is computed live.</p>`);
    if (q.type === 'graph' && q.plot) kids.push(`<p><em>Graph:</em> ${esc(q.plot.alt || 'y = ' + q.plot.fn)}</p>`);
    if (q.type === 'steps') kids.push(`<ol>${q.steps.map(s => `<li>${il(s.prompt || '')}${s.options ? ` (${s.options.map(il).join(' / ')})` : ''}</li>`).join('')}</ol>`);
    const reveal = ans || why ? `<details><summary>Answer${why ? ' and explanation' : ''}</summary>${ans ? `<p><strong>${q.type === 'short' ? 'A model answer' : 'Answer'}:</strong> ${il(ans)}</p>` : ''}${why ? md(why) : ''}</details>` : '';
    return `<li class="lsi-q"><p><span class="lsi-tag">${esc(q.type || 'question')}</span> ${il(q.prompt || q.ask || '')}</p>${kids.join('')}${reveal}</li>`;
  }
  const qList = qs => (qs && qs.length ? `<ol class="lsi-qs">${qs.map(question).join('')}</ol>` : '');
  const resolveQ = a => (typeof a === 'string' ? LS.bank().find(q => q.id === a) || null : a);

  function block(b, L) {
    switch (b.k) {
      case 'text': return md(b.md);
      case 'callout': return `<aside class="lsi-callout" aria-label="${esc(b.tone === 'key' ? 'Key idea' : 'Note')}">${md(b.md)}</aside>`;
      case 'math': return `<p class="lsi-math" aria-label="${esc(b.alt || b.tex)}"><code>${esc(b.tex)}</code></p>`;
      case 'figure': return `<figure><p><em>Figure:</em> ${esc(b.alt || '')}</p>${b.cap ? `<figcaption>${typeof b.cap === 'string' ? il(b.cap) : ''}</figcaption>` : ''}</figure>`;
      case 'example': return `<section class="lsi-ex" aria-label="${esc(b.title || 'Worked example')}"><h5>${esc(b.title || 'Worked example')}</h5>${md(b.problem)}${b.steps ? `<ol>${b.steps.map(s => `<li>${il(typeof s === 'string' ? s : s.md || s.text || '')}</li>`).join('')}</ol>` : ''}${b.answer ? `<p><strong>Answer:</strong> ${il(b.answer)}</p>` : ''}</section>`;
      case 'lab': { const e = lab().find(x => x.id === b.engine); return `<p class="lsi-link"><span class="lsi-tag">Live model</span> <a href="${R('lab/' + esc(b.engine))}">${esc(e ? e.title : b.engine)}</a> — ${il(b.objective || '')}</p>${b.try ? `<ul>${b.try.map(t => `<li>Try: ${il(t)}</li>`).join('')}</ul>` : ''}${b.assume ? `<p><small>Assumes: ${il(b.assume)}</small></p>` : ''}`; }
      case 'exp': { const x = (LS.experiences || []).find(e => e.id === b.id); return `<p class="lsi-link"><span class="lsi-tag">Experience</span> <a href="${R('exp/' + esc(b.id))}">${esc(x ? x.title : b.id)}</a> — ${il(b.md || '')}</p>`; }
      case 'video': { const v = (LS.VIDEOS || []).find(x => x.id === b.id); return `<p class="lsi-link"><span class="lsi-tag">Video</span> <a href="${R('video/' + esc(b.id))}">${esc(v ? v.title : b.id)}</a> — ${il(b.objective || '')}</p>`; }
      case 'activity': return `<div class="lsi-act"><p class="lsi-sub">Activity</p><ol class="lsi-qs">${question(b.q || {})}</ol></div>`;
      default: return b.md ? md(b.md) : '';
    }
  }

  function lessonHTML(L) {
    const P = L.provenance || {};
    return `<article class="lsi-item" id="lesson-${esc(L.id)}" aria-labelledby="lesson-${esc(L.id)}-h">
      <h3 id="lesson-${esc(L.id)}-h">${esc(L.title)}</h3>
      <p class="lsi-links"><a href="${R('lesson/' + esc(L.id))}">Open the lesson</a> · <a href="${R('topic/' + esc(L.id))}">Open its topic page</a></p>
      <dl class="lsi-meta"><dt>Topic</dt><dd>${esc(L.topic)}</dd><dt>Course · chapter</dt><dd>${esc([L.course, L.chapter].filter(Boolean).join(' · '))}</dd><dt>Level</dt><dd>${esc(L.level || '')}</dd><dt>Time</dt><dd>${esc(L.mins)} min</dd><dt>Formats</dt><dd>${esc((L.formats || []).join(', '))}</dd></dl>
      <h4>Learning objectives</h4><ul>${(L.objectives || []).map(o => `<li>${il(typeof o === 'string' ? o : o.text)}</li>`).join('')}</ul>
      ${(L.prereq || []).length ? `<h4>Before you start</h4><ul>${L.prereq.map(p => `<li>${il(p.text || p)}</li>`).join('')}</ul>` : ''}
      ${(L.sections || []).map((s, i) => `<section class="lsi-sec" aria-labelledby="lesson-${esc(L.id)}-s${i}"><h4 id="lesson-${esc(L.id)}-s${i}">${i + 1}. ${esc(s.title)}</h4>${(s.blocks || []).map(b => block(b, L)).join('\n')}</section>`).join('\n')}
      ${(L.summary || []).length ? `<h4>Summary</h4><ul>${L.summary.map(x => `<li>${il(x)}</li>`).join('')}</ul>` : ''}
      ${(L.revision || []).length ? `<h4>Revision questions</h4>${qList(L.revision.map(resolveQ).filter(Boolean))}` : ''}
      ${(L.cards || []).length ? `<h4>Flashcards</h4><dl class="lsi-cards">${L.cards.map(c => `<dt>${il(c.front)}</dt><dd>${il(c.back)}</dd>`).join('')}</dl>` : ''}
      ${(L.further || []).length ? `<h4>Further reading</h4><ul>${L.further.map(f => `<li>${f.url ? `<a href="${esc(f.url)}" rel="noopener">${esc(f.title || f.url)}</a>` : esc(f.title || f)}${f.publisher ? ' — ' + esc(f.publisher) : ''}</li>`).join('')}</ul>` : ''}
      <h4>Provenance</h4><p>${esc(P.author || '')}${P.reviewed ? ', reviewed ' + esc(P.reviewed) : ''}. ${esc(P.licence || '')}</p>${(P.sources || []).length ? `<ul>${P.sources.map(s => `<li>${s.url ? `<a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}${s.publisher ? ' — ' + esc(s.publisher) : ''}</li>`).join('')}</ul>` : ''}
    </article>`;
  }

  function expHTML(x) {
    const D = (LS.exp && LS.exp.DEFS[x.id]) || {}, ctl = controlsOf(x.id), kinds = LS.expKinds || {};
    const groups = {}; ctl.forEach(c => { (groups[c.group] = groups[c.group] || []).push(c); });
    const apply = (D.apply || []).map(resolveQ).filter(Boolean);
    const lesson = x.lesson && LS.lesson(x.lesson);
    return `<article class="lsi-item" id="exp-${esc(x.id)}" aria-labelledby="exp-${esc(x.id)}-h">
      <h3 id="exp-${esc(x.id)}-h">${esc(x.title)}</h3>
      <p class="lsi-links"><a href="${R('exp/' + esc(x.id))}">Open the live experience</a>${lesson ? ` · Part of the lesson <a href="${R('lesson/' + esc(lesson.id))}">${esc(lesson.title)}</a>` : ''}</p>
      <dl class="lsi-meta"><dt>Kind</dt><dd>${esc(kinds[x.kind] || x.kind)} (interactive)</dd><dt>Time</dt><dd>about ${esc(x.mins)} min</dd><dt>The question it starts from</dt><dd>${il(x.hook)}</dd><dt>What the model simplifies</dt><dd>${il(x.simplified || '—')}</dd></dl>
      ${D.intro ? `<h4>Introduction</h4>${md(D.intro)}` : ''}
      ${D.predict ? `<h4>Predict first</h4>${md(D.predict.q)}<ol type="A">${(D.predict.options || []).map(o => `<li>${il(o)}</li>`).join('')}</ol>` : ''}
      ${D.explore ? `<h4>What to do</h4>${md(D.explore)}` : ''}
      <h4>Controls</h4>${ctl.length ? Object.entries(groups).map(([g, cs]) => `${g ? `<p class="lsi-sub">${esc(g)}</p>` : ''}<ul class="lsi-ctl">${cs.map(c => `<li><strong>${esc(c.label)}</strong> — ${esc(c.kind)}${c.range ? ` (${esc(c.range)})` : ''}</li>`).join('')}</ul>`).join('') : `<p>${ctl.error ? 'The controls could not be listed here (' + esc(ctl.error) + ').' : 'No form controls: this experience is driven by the step buttons and by pointing at the picture.'}</p>`}
      <p><small>Every experience also has the step buttons Hook · Predict · Explore · Observe · Explain · Apply · Connect, and Pause and Reset for the model. Above, each control is listed with the label the student sees. Moving a control changes the live model and its readout.${ctl.drag ? ' Parts of the picture can also be dragged.' : ''}</small></p>
      ${D.explain ? `<h4>The explanation</h4>${md(D.explain)}` : ''}
      ${apply.length ? `<h4>Apply it</h4>${qList(apply)}` : ''}
      ${(D.summary || []).length ? `<h4>Summary</h4><ul>${D.summary.map(s => `<li>${il(s)}</li>`).join('')}</ul>` : ''}
      ${D.connect ? `<h4>Connections</h4>${typeof D.connect === 'string' ? md(D.connect) : `<ul>${[].concat(D.connect).map(c => `<li>${il(typeof c === 'string' ? c : c.text || c.title || '')}</li>`).join('')}</ul>`}` : ''}
      <p><small>This text describes the experience. The simulation itself runs only when the experience is opened in a browser with JavaScript.</small></p>
    </article>`;
  }

  function readingHTML(d) {
    const name = Array.isArray(d.name) ? d.name[0] : d.name, unit = Array.isArray(d.unit) ? d.unit[0] : d.unit;
    return `<article class="lsi-item" id="read-${esc(d.id)}" aria-labelledby="read-${esc(d.id)}-h"><h3 id="read-${esc(d.id)}-h">${esc(name || d.title)}</h3>
      <p class="lsi-links"><a href="${R('read/doc/' + esc(d.id))}">Open in the reader</a></p>
      <dl class="lsi-meta"><dt>Course</dt><dd>${esc(d.course || '')}</dd><dt>Unit</dt><dd>${esc(unit || '')}</dd><dt>File</dt><dd>${esc(d.title || '')}</dd></dl>
      <details><summary>Full text (${(d.pages || []).length} pages)</summary>${(d.pages || []).map(pg => `<section><h4>${esc(pg.h || '')}</h4>${(pg.paras || []).map(pa => `<p>${txt(pa.text || pa)}</p>`).join('')}</section>`).join('')}</details></article>`;
  }

  const vttCache = {};
  function transcript(v) {
    if (!v.vtt || !window.fetch) return Promise.resolve('');
    return vttCache[v.id] || (vttCache[v.id] = fetch(v.vtt).then(r => (r.ok ? r.text() : '')).then(t => t.split(/\r?\n\r?\n/).map(b => b.split(/\r?\n/).filter(l => l && !/-->/.test(l) && !/^WEBVTT/.test(l) && !/^\d+$/.test(l)).join(' ')).filter(Boolean).join(' ')).catch(() => ''));
  }
  function videoHTML(v, tr) {
    return `<article class="lsi-item" id="video-${esc(v.id)}" aria-labelledby="video-${esc(v.id)}-h"><h3 id="video-${esc(v.id)}-h">${esc(v.title)}</h3>
      <p class="lsi-links"><a href="${R('video/' + esc(v.id))}">Watch in the Studio</a>${v.lesson ? ` · From the lesson <a href="${R('lesson/' + esc(v.lesson))}">${esc((LS.lesson(v.lesson) || {}).title || v.lesson)}</a>` : ''}</p>
      <dl class="lsi-meta"><dt>Topic</dt><dd>${esc(v.topic || '')}</dd><dt>Made by</dt><dd>${esc((v.provenance || {}).author || 'ERLY')}</dd></dl>
      ${tr ? `<details><summary>Transcript (from the captions file)</summary><p>${esc(tr)}</p></details>` : ''}</article>`;
  }

  /* ---------- pages ---------- */
  function head(title, lead) {
    const note = MODE === 'static' ? 'A plain-HTML copy of the Studio’s content directory, generated from the Studio’s own data. It runs no scripts and stores nothing. Links marked “open” go to the live Studio in read-only inspection mode.'
      : window.LS_INSPECT ? 'Inspection mode: read-only. This page runs on empty in-memory storage; nothing you do here is saved, and no student data on this device is read.'
      : 'This directory only reads the Studio’s content; it changes nothing in your learning record.';
    return `<header class="lsi-head"><p class="ls-kicker">Learning Studio · content directory</p><h1>${esc(title)}</h1>${lead ? `<p class="ls-lead">${lead}</p>` : ''}<p class="lsi-note" role="note">${esc(note)}</p></header>`;
  }

  function overviewHTML() {
    const S = subjects(), L = LS.lessons || [], X = LS.experiences || [], B = LS.bank(), M = lab();
    const used = new Set(); S.forEach(s => contents(s).models.forEach(m => used.add(m.id)));
    const other = M.filter(m => !used.has(m.id));
    return `<article class="lsi">${head('Everything in the Learning Studio', `${S.length} subjects · ${L.length} lessons · ${X.length} interactive experiences · ${M.length} Visual Lab models · ${B.length} practice questions · ${(window.STUDIO_LIBRARY || []).length} readings · ${(LS.VIDEOS || []).length} ERLY videos. Every number on this page is counted from the Studio’s own data.`)}
      <nav class="lsi-toc" aria-label="On this page"><ul><li><a href="#lsi-subjects">Subjects</a></li><li><a href="#lsi-sections">Studio sections</a></li><li><a href="#lsi-exps">All interactive experiences</a></li><li><a href="#lsi-lab">Visual Lab models</a></li><li><a href="#lsi-paths">Learning paths</a></li><li><a href="#lsi-ext">Recommended external videos</a></li><li><a href="#lsi-urls">Addresses</a></li></ul></nav>
      <section id="lsi-subjects" aria-labelledby="lsi-subjects-h"><h2 id="lsi-subjects-h">Subjects</h2><p>Each subject has a page with its full lessons, every experience (with instructions and controls), its Visual Lab models, readings, videos and practice questions.</p>
        <ul class="lsi-grid">${S.map(s => { const c = contents(s); return `<li><article aria-labelledby="lsi-s-${s.id}"><h3 id="lsi-s-${s.id}"><a href="${DIR(s.id)}">${esc(s.name)}</a></h3><p>${esc(s.blurb || '')}</p><p><small>${c.lessons.length} lessons · ${c.exps.length} experiences · ${c.models.length} lab models · ${c.readings.length} readings · ${c.videos.length} videos · ${bankFor(s).length} practice questions</small></p><p><small>Topic areas: ${esc((s.topics || []).join(' · '))}</small></p><p><small><a href="${R('subject/' + s.id)}">Open the ${esc(s.name)} world in the Studio</a></small></p></article></li>`; }).join('')}</ul></section>
      <section id="lsi-sections" aria-labelledby="lsi-sections-h"><h2 id="lsi-sections-h">Studio sections</h2><p>The Studio’s navigation, as the student sees it. Sections under My Workspace show the student’s own data, so in inspection mode they start empty.</p>
        <dl class="lsi-dl">${SECTIONS.map(([n, r, d]) => `<dt><a href="${R(r)}">${esc(n)}</a></dt><dd>${esc(d)}</dd>`).join('')}</dl></section>
      <section id="lsi-exps" aria-labelledby="lsi-exps-h"><h2 id="lsi-exps-h">All interactive experiences (${X.length})</h2>
        <table class="lsi-table"><caption>Every experience in the registry, with its subject and kind</caption><thead><tr><th scope="col">Experience</th><th scope="col">Subject</th><th scope="col">Kind</th><th scope="col">Starts from</th></tr></thead><tbody>${X.map(x => { const s = S_(x.subject) || {}; return `<tr><th scope="row"><a href="${DIR(x.subject)}#exp-${esc(x.id)}">${esc(x.title)}</a></th><td>${esc(s.name || x.subject)}</td><td>${esc((LS.expKinds || {})[x.kind] || x.kind)}</td><td>${il(x.hook)}</td></tr>`; }).join('')}</tbody></table></section>
      <section id="lsi-lab" aria-labelledby="lsi-lab-h"><h2 id="lsi-lab-h">Visual Lab models (${M.length})</h2>${M.length ? `<p>Models are listed on each subject page. ${other.length ? `These ${other.length} belong to no single school subject:` : ''}</p>${other.length ? `<ul class="lsi-cols">${other.map(m => `<li><a href="${R('lab/' + esc(m.id))}">${esc(m.title || m.id)}</a> <small>${esc(m.kind || '')}</small></li>`).join('')}</ul>` : ''}` : '<p>The Visual Lab could not be loaded here.</p>'}</section>
      <section id="lsi-paths" aria-labelledby="lsi-paths-h"><h2 id="lsi-paths-h">Learning paths</h2><ul>${(LS.paths || []).map(p => `<li><strong>${esc(p.title)}</strong> (${esc(p.subject)}, ${esc(p.level || '')}) — ${esc(p.desc || '')} Lessons in order: ${p.steps.map(id => { const l = LS.lesson(id); return `<a href="${R('lesson/' + esc(id))}">${esc(l ? l.title : id)}</a>`; }).join(' → ')}</li>`).join('')}</ul></section>
      <section id="lsi-ext" aria-labelledby="lsi-ext-h"><h2 id="lsi-ext-h">Recommended external videos</h2><p>Not made by ERLY; they open on YouTube.</p><ul>${(LS.EXTERNAL_VIDEOS || []).map(v => `<li><a href="https://www.youtube.com/watch?v=${esc(v.yt)}" rel="noopener">${esc(v.title)}</a> — ${esc(v.by || '')} (${esc(v.subject || '')}: ${esc(v.topic || '')})</li>`).join('')}</ul></section>
      <section id="lsi-urls" aria-labelledby="lsi-urls-h"><h2 id="lsi-urls-h">Addresses</h2><p>Every place above has a stable address. In the Studio, routes follow <code>#/</code>; the same places also open from query strings, which survive tools that drop the <code>#</code> part.</p>
        <ul><li><code>learn.html?subject=physics</code> — a subject world (also maths, chemistry, biology, cs, english, geography, history, languages, social, more; “mathematics” and “computer-science” work too)</li><li><code>learn.html?lesson=phys-newton</code> and <code>learn.html?topic=phys-newton</code> — a lesson and its topic page</li><li><code>learn.html?exp=projectile</code> — an interactive experience</li><li><code>learn.html?section=lab</code> — a Studio section</li><li><code>learn.html?inspect=1</code> — this directory, read-only, no sign-in. Add any of the above, or any <code>#/</code> route, to open that place read-only.</li><li><code>learn-guide/</code> — the same directory as plain HTML files that need no JavaScript.</li></ul>
        <p>Without <code>inspect=1</code> the Studio asks for the demo sign-in first, then opens the requested place.</p></section>
    </article>`;
  }

  function subjectHTML(sid, trs) {
    const s = S_(sid); if (!s) return null;
    const c = contents(s), qs = bankFor(s);
    const nav = [['lsi-lessons', `Lessons (${c.lessons.length})`, c.lessons.length], ['lsi-x', `Interactive experiences (${c.exps.length})`, c.exps.length], ['lsi-models', `Visual Lab models (${c.models.length})`, c.models.length], ['lsi-reads', `Readings (${c.readings.length})`, c.readings.length], ['lsi-vids', `Videos (${c.videos.length})`, c.videos.length], ['lsi-paths', 'Paths', c.paths.length], ['lsi-practice', `Practice questions (${qs.length})`, qs.length]].filter(n => n[2]);
    const ERLY_V = c.videos.filter(v => v.id);
    return `<article class="lsi">${head(s.name, esc(s.blurb || ''))}
      <p class="lsi-links"><a href="${DIR('')}">← All subjects</a> · <a href="${R('subject/' + s.id)}">Open the ${esc(s.name)} world in the Studio</a></p>
      <nav class="lsi-toc" aria-label="On this page"><ul>${nav.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ul></nav>
      <section aria-labelledby="lsi-topics-h"><h2 id="lsi-topics-h">Topic areas</h2><ul>${(s.topics || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>${c.lessons.length ? `<p>Lessons by topic: ${c.lessons.map(L => `<a href="#lesson-${esc(L.id)}">${esc(L.topic)}</a>`).join(' · ')}</p>` : ''}</section>
      ${c.lessons.length ? `<section id="lsi-lessons" aria-labelledby="lsi-lessons-h"><h2 id="lsi-lessons-h">Lessons</h2>${c.lessons.map(lessonHTML).join('')}</section>` : ''}
      ${c.exps.length ? `<section id="lsi-x" aria-labelledby="lsi-x-h"><h2 id="lsi-x-h">Interactive experiences</h2><p>Each experience runs the same frame: a starting question, a prediction, exploring a live model, observing what the model computed, an explanation, questions to apply it, and connections.</p>${c.exps.map(expHTML).join('')}</section>` : ''}
      ${c.models.length ? `<section id="lsi-models" aria-labelledby="lsi-models-h"><h2 id="lsi-models-h">Visual Lab models</h2><p>Computed models; each opens with its own controls and live numbers.</p><ul class="lsi-cols">${c.models.map(m => `<li><a href="${R('lab/' + esc(m.id))}">${esc(m.title || m.id)}</a> <small>${esc(m.kind || '')}</small></li>`).join('')}</ul></section>` : ''}
      ${c.readings.length ? `<section id="lsi-reads" aria-labelledby="lsi-reads-h"><h2 id="lsi-reads-h">Readings</h2>${c.readings.map(readingHTML).join('')}</section>` : ''}
      ${c.videos.length ? `<section id="lsi-vids" aria-labelledby="lsi-vids-h"><h2 id="lsi-vids-h">Videos</h2>${ERLY_V.map(v => videoHTML(v, trs && trs[v.id])).join('')}${c.videos.filter(v => v.yt).map(v => `<p>External: <a href="https://www.youtube.com/watch?v=${esc(v.yt)}" rel="noopener">${esc(v.title)}</a> — ${esc(v.by || '')}</p>`).join('')}</section>` : ''}
      ${c.paths.length ? `<section id="lsi-paths" aria-labelledby="lsi-paths-h"><h2 id="lsi-paths-h">Paths</h2><ul>${c.paths.map(p => `<li><strong>${esc(p.title)}</strong> — ${esc(p.desc || '')} ${p.steps.map(id => { const L = LS.lesson(id), home = L && subjects().find(x => x.lesson.test(L.subject)); return `<a href="${home && home.id !== s.id ? DIR(home.id) : ''}#lesson-${esc(id)}">${esc((L || {}).title || id)}</a>`; }).join(' → ')}</li>`).join('')}</ul></section>` : ''}
      ${qs.length ? `<section id="lsi-practice" aria-labelledby="lsi-practice-h"><h2 id="lsi-practice-h">Practice questions</h2><p>Written for ERLY; not official exam questions. Answers are folded under each question.</p>${qList(qs)}</section>` : ''}
    </article>`;
  }

  async function subjectWithTranscripts(sid) {
    const s = S_(sid); if (!s) return null;
    const vs = contents(s).videos.filter(v => v.vtt), trs = {};
    await Promise.all(vs.map(v => transcript(v).then(t => { trs[v.id] = t; })));
    return subjectHTML(sid, trs);
  }

  /* ---------- the route ---------- */
  function page(view, parts) {
    MODE = 'live';
    view.innerHTML = `<p class="ls-loading" role="status"><span class="ls-spin" aria-hidden="true"></span>Gathering the Studio’s content…</p>`;
    const want = parts[0] || '';
    load().then(() => (want ? subjectWithTranscripts(want) : overviewHTML())).then(html => {
      if (!view.isConnected || LS.current()[0] !== 'inspect' || (LS.current()[1] || '') !== want) return;
      view.innerHTML = html || `<section class="ls-empty"><h1>No subject called “${esc(want)}”</h1><p><a class="ls-btn" href="#/inspect">All subjects</a></p></section>`;
      document.title = (want && S_(want) ? S_(want).name + ' · ' : '') + 'Content directory · Learning Studio · ERLY';
      const h = view.querySelector('h1'); if (h) { h.tabIndex = -1; }
    });
  }
  LS.route('inspect', page);

  /* used by tools/build-learn-guide.js to write the static text version */
  LS.inspect = {
    load,
    staticPages: async () => { MODE = 'static'; try { await load(); const out = { index: overviewHTML() }; for (const s of subjects()) out[s.id] = await subjectWithTranscripts(s.id); return out; } finally { MODE = 'live'; } },
    subjects: () => subjects().map(s => ({ id: s.id, name: s.name, blurb: s.blurb || '' })),
    correct
  };

  /* a quiet bar that says inspection mode is on, with the way to the directory */
  if (window.LS_INSPECT) {
    const bar = document.createElement('div');
    bar.className = 'lsi-bar'; bar.setAttribute('role', 'note');
    bar.innerHTML = window.LS_PREVIEW ? 'Space preview — read-only, nothing is saved. Scroll to fly through the universe; select a world to visit it. <a href="login.html?next=student">Sign in</a> for the full Studio.' : 'Inspection mode — read-only; nothing is saved and no student data is read. <a href="#/inspect">Content directory</a>';
    const go = () => document.body.insertBefore(bar, document.body.firstChild);
    if (document.body) go(); else addEventListener('DOMContentLoaded', go);
  }
})();
