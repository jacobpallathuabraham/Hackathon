/* ERLY Learning Studio — the Knowledge Map (#/constellation, also #/map). Replaces the v29 canvas "constellation".

   Why it was rebuilt: the old map scattered 50 chapter dots around a ring of eleven loose clusters and drew all 21
   cross-subject links plus every prerequisite at once, so long dashed lines crossed the whole canvas, subjects with one
   chapter looked like stray dots, and the only information was a tooltip in a corner.

   Structure (everything comes from LS.curriculum — no chapter, prerequisite or link is invented here):
     · eleven subject REGIONS, packed into tidy shelves, each sized by its real number of chapters;
     · inside a region, chapters are laid out as a PATH: columns are prerequisite depth within the subject (left = start
       here), rows are chapters at that depth in curriculum order. In-subject prerequisites are short left→right curves;
     · cross-subject relationships (prerequisites in another subject, and the curriculum's named LINKS) are hidden by default
       and appear for the selected subject or chapter, or all at once with "Show all connections";
     · concepts are the chapter's own concept list; a concept shows where else it is taught and the flashcard that defines it.
   Status per chapter is LS.prog.status (new / exploring / mastered) — real, consent-aware progress.

   Navigation: a camera over an SVG world. Wheel / trackpad / pinch zoom around the pointer, drag to pan, buttons for
   zoom in / out / overview, keyboard (Tab through chapters, Enter select → Enter again opens, arrows pan, + / − zoom,
   0 overview, Escape clears). Focus moves are eased (≈ 520 ms, cubic in-out); reduced motion makes them instant. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, esc = LS.esc;
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const ORDER = ['maths', 'physics', 'chemistry', 'biology', 'cs', 'geography', 'english', 'history', 'languages', 'social', 'more'];
  const GLYPH = { maths: '∫', physics: 'ƒ', chemistry: '⚗', biology: '❦', cs: '{ }', geography: '◍', history: '⌛', english: '¶', languages: 'Aa', social: '⚖', more: '∿' };
  const COLW = 214, ROWH = 62, PAD = 22, HEAD = 64, GAP = 26, NODEW = 192, MAXW = 1340;
  const ST = () => ({ new: T('Not started', 'لم يبدأ'), exploring: T('Exploring', 'قيد الاستكشاف'), mastered: T('Mastered', 'متقن') });

  /* ---------- layout (pure: data in, world-space rectangles out) ---------- */
  function layout(C0, MAXW) {
    const regions = ORDER.filter(s => C0.SUBJ[s]).map(s => {
      const chs = C0.bySubject(s).flatMap(co => co.chapters.map(ch => Object.assign({ course: co.id }, ch)));
      const ids = new Set(chs.map(c => c.id)), depth = {};
      const d = id => { if (depth[id] != null) return depth[id]; const c = C0.chapter(id); const inside = c.prereq.filter(p => ids.has(p)); depth[id] = inside.length ? 1 + Math.max(...inside.map(d)) : 0; return depth[id]; };
      chs.forEach(c => d(c.id));
      const cols = []; chs.forEach(c => { (cols[depth[c.id]] = cols[depth[c.id]] || []).push(c.id); });
      const rows = Math.max(...cols.map(c => c.length));
      return { s, chs: chs.map(c => c.id), cols, w: PAD * 2 + cols.length * COLW - (COLW - NODEW), h: HEAD + rows * ROWH + PAD - 8 };
    });
    // shelf packing: keep curriculum order, but let small regions fill the end of a shelf; then stretch each shelf to full width
    const left = regions.slice(), shelves = [];
    while (left.length) { const shelf = [left.shift()]; let w = shelf[0].w;
      for (let i = 0; i < left.length;) { if (w + GAP + left[i].w <= MAXW) { w += GAP + left[i].w; shelf.push(left.splice(i, 1)[0]); } else i++; }
      shelves.push(shelf); }
    const W = Math.max(...shelves.map(sh => sh.reduce((a, r) => a + r.w, 0) + GAP * (sh.length - 1)));
    let y = 0; const pos = {};
    shelves.forEach(sh => { const used = sh.reduce((a, r) => a + r.w, 0) + GAP * (sh.length - 1), extra = (W - used) / sh.length, h = Math.max(...sh.map(r => r.h)); let x = 0;
      sh.forEach(r => { r.x = x; r.y = y; r.w += extra; r.h = h; x += r.w + GAP;
        const span = r.cols.length > 1 ? (r.w - PAD * 2 - NODEW) / (r.cols.length - 1) : 0;
        r.cols.forEach((col, ci) => col.forEach((id, ri) => { pos[id] = { x: r.x + PAD + ci * span, y: r.y + HEAD + ri * ROWH + 6, s: r.s }; })); });
      y += h + GAP; });
    return { regions, pos, W, H: y - GAP };
  }
  const wrap = (s, n) => { const words = s.split(' '), out = ['']; words.forEach(w => { const cur = out[out.length - 1]; if ((cur + ' ' + w).trim().length > n && cur) out.push(w); else out[out.length - 1] = (cur + ' ' + w).trim(); }); if (out.length > 2) { out[1] = out.slice(1).join(' '); out.length = 2; if (out[1].length > n) out[1] = out[1].slice(0, n - 1).trim() + '…'; } return out; };
  const el = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); parent && parent.appendChild(e); return e; };
  const marker = (st, col) => st === 'mastered' ? `<circle r="8" fill="${col}"/><path d="M-3.6 0.2 L-1 2.8 L3.8 -2.4" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`
    : st === 'exploring' ? `<circle r="7.5" fill="none" stroke="${col}" stroke-width="2"/><path d="M0 -7.5 A7.5 7.5 0 0 1 0 7.5 Z" fill="${col}"/>` : `<circle r="7" fill="var(--km-bg)" stroke="${col}" stroke-width="2"/>`;

  function map(view) {
    const C0 = LS.curriculum, chs = Object.values(C0.chapters), stName = ST();
    const status = id => LS.prog.status(id);
    const crossPre = []; chs.forEach(ch => ch.prereq.forEach(p => { if (C0.chapter(p).subject !== ch.subject) crossPre.push([p, ch.id]); }));
    const conceptIndex = {}; chs.forEach(ch => ch.concepts.forEach(c => { const k = c.toLowerCase(); (conceptIndex[k] = conceptIndex[k] || { name: c, chs: [] }).chs.push(ch.id); }));
    view.innerHTML = `<section class="v2-page km-page"><header class="v2-head km-head"><p class="ls-kicker">${T('Knowledge Map', 'خريطة المعرفة')}</p><h1>${T('How everything connects', 'كيف يترابط كل شيء')}</h1>
      <p class="ls-lead">${T('Eleven subjects, each laid out as a path from where to start (left) to what it leads to (right). Select a subject or a chapter to see what it needs, what it unlocks and how it connects to other subjects.', 'إحدى عشرة مادة، كل منها مسار من البداية إلى ما يليها. اختر مادة أو فصلاً.')}</p></header>
      <div class="km" data-km>
        <div class="km__bar">
          <div class="km__search"><label class="sr-only" for="kmFind">${T('Find a subject, chapter or concept', 'ابحث')}</label><input id="kmFind" type="search" autocomplete="off" placeholder="${T('Find a subject, chapter or concept…', 'ابحث عن مادة أو فصل أو مفهوم…')}" aria-controls="kmRes" aria-expanded="false"><ul id="kmRes" class="km__res" role="listbox" hidden></ul></div>
          <div class="km__tools" role="group" aria-label="${T('Map view', 'عرض الخريطة')}">
            <button type="button" class="km__tool" data-z="in" aria-label="${T('Zoom in', 'تكبير')}" title="${T('Zoom in', 'تكبير')} (+)">+</button><button type="button" class="km__tool" data-z="out" aria-label="${T('Zoom out', 'تصغير')}" title="${T('Zoom out', 'تصغير')} (−)">−</button><button type="button" class="km__tool km__tool--wide" data-z="home" title="${T('Whole map', 'الخريطة كاملة')} (0)">${T('Overview', 'نظرة عامة')}</button>
            <button type="button" class="km__tool km__tool--wide" data-all aria-pressed="false">${T('Show all connections', 'كل الروابط')}</button></div></div>
        <div class="km__stage" tabindex="0" role="application" aria-roledescription="${T('knowledge map', 'خريطة المعرفة')}" aria-label="${T('Knowledge map. Tab moves between chapters; arrows pan; plus and minus zoom; 0 shows the whole map.', 'خريطة المعرفة.')}">
          <svg class="km__svg" aria-hidden="false"><g class="km__cam"><g class="km__regions"></g><g class="km__edges"></g><g class="km__cross"></g><g class="km__nodes"></g></g></svg>
          <p class="km__hint" hidden><span>${T('Select a subject to zoom in, or a chapter to see how it connects. Drag to move; scroll or pinch to zoom.', 'اختر مادة للتكبير أو فصلاً لرؤية روابطه. اسحب للتحريك.')}</span><button type="button" class="km__x" data-hintx aria-label="${T('Dismiss tip', 'إخفاء')}">×</button></p>
          <details class="km__key"><summary>${T('Key', 'المفتاح')}</summary><ul>
            <li><svg viewBox="-10 -10 20 20" aria-hidden="true">${marker('new', '#8a94b8')}</svg>${stName.new}</li><li><svg viewBox="-10 -10 20 20" aria-hidden="true">${marker('exploring', '#8a94b8')}</svg>${stName.exploring}</li><li><svg viewBox="-10 -10 20 20" aria-hidden="true">${marker('mastered', '#8a94b8')}</svg>${stName.mastered} ${T('(80 % or more on the chapter check)', '(٨٠٪ أو أكثر)')}</li>
            <li><i class="km__ln km__ln--pre"></i>${T('Prerequisite — learn the left one first', 'متطلب سابق')}</li><li><i class="km__ln km__ln--x"></i>${T('Prerequisite in another subject', 'متطلب في مادة أخرى')}</li><li><i class="km__ln km__ln--link"></i>${T('Related idea in another subject', 'فكرة مرتبطة في مادة أخرى')}</li>
            <li><i class="km__reg"></i>${T('A subject: columns run from first chapters (left) to later ones (right)', 'مادة: من الفصول الأولى إلى اللاحقة')}</li></ul></details>
          <aside class="km__panel" aria-label="${T('Selection details', 'تفاصيل التحديد')}" hidden><button type="button" class="km__x km__close" data-clear aria-label="${T('Clear selection', 'إلغاء التحديد')}">×</button><div class="km__pbody" aria-live="polite"></div></aside>
        </div>
      </div>
      <details class="uv-con__list km__list"><summary>${T('List view (all chapters and connections)', 'عرض القائمة')}</summary><ul>${chs.map(ch => `<li><a href="#/chapter/${ch.id}">${esc(ch.title)}</a> — ${C0.SUBJ[ch.subject][0]}, ${stName[status(ch.id)].toLowerCase()}${ch.prereq.length ? '; ' + T('needs', 'يتطلب') + ' ' + ch.prereq.map(p => esc(C0.chapter(p).title)).join(', ') : ''}</li>`).join('')}</ul><ul>${C0.LINKS.map(([a, b, why]) => `<li>${esc(C0.chapter(a).title)} ↔ ${esc(C0.chapter(b).title)}: ${esc(why)}</li>`).join('')}</ul></details></section>`;

    const root = view.querySelector('[data-km]'), stage = root.querySelector('.km__stage'), svg = root.querySelector('svg'), cam = svg.querySelector('.km__cam');
    const gR = svg.querySelector('.km__regions'), gE = svg.querySelector('.km__edges'), gX = svg.querySelector('.km__cross'), gN = svg.querySelector('.km__nodes');
    const panel = root.querySelector('.km__panel'), pbody = root.querySelector('.km__pbody');
    let L = null, maxW = 0, nodeEl = {}, regionEl = {}, subjLabel = {}, edgeEls = [];
    // pick the shelf width whose packed map best fills this stage (a wide screen gets a wide map, a phone a tall one)
    const bestLayout = () => { let best = null; for (let w = 1100; w <= 3400; w += 120) { const c = layout(C0, w), k = Math.min((SW - 40) / c.W, (SH - 110) / c.H); if (!best || k > best.k + 1e-3) best = { k, w, c }; } return best; };
    const P = id => L.pos[id];
    const curve = (a, b, bow) => { const x1 = a.x + NODEW - 6, y1 = a.y + 12, x2 = b.x + 4, y2 = b.y + 12; if (x2 > x1 + 10) { const m = (x2 - x1) * 0.5; return `M${x1} ${y1} C${x1 + m} ${y1} ${x2 - m} ${y2} ${x2} ${y2}`; }
      const ax = a.x + NODEW / 2, ay = a.y + 12, bx = b.x + NODEW / 2, by = b.y + 12, mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1; return `M${ax} ${ay} Q${mx - dy / len * bow} ${my + dx / len * bow} ${bx} ${by}`; };

    function build() { [gR, gE, gX, gN].forEach(g => { g.textContent = ''; }); nodeEl = {}; regionEl = {}; subjLabel = {}; edgeEls = [];
    L.regions.forEach(r => { const [name, col] = C0.SUBJ[r.s], g = el('g', { class: 'km-reg', 'data-s': r.s, style: `--sc:${col}` }, gR);
      const n = r.chs.length, ex = r.chs.filter(id => status(id) !== 'new').length, ma = r.chs.filter(id => status(id) === 'mastered').length;
      g.innerHTML = `<rect class="km-reg__bg" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="22"/><g class="km-reg__head" tabindex="0" role="button" aria-label="${esc(name)}: ${n} ${T('chapters', 'فصول')}, ${ex} ${T('explored', 'مُستكشفة')}, ${ma} ${T('mastered', 'متقنة')}"><rect class="km-reg__hit" x="${r.x}" y="${r.y}" width="${r.w}" height="${HEAD - 8}" rx="22"/>
        <circle class="km-reg__badge" cx="${r.x + PAD + 13}" cy="${r.y + 28}" r="15"/><text class="km-reg__glyph" x="${r.x + PAD + 13}" y="${r.y + 33}" text-anchor="middle">${GLYPH[r.s]}</text>
        <text class="km-reg__name" x="${r.x + PAD + 36}" y="${r.y + 26}">${esc(name)}</text><text class="km-reg__meta" x="${r.x + PAD + 36}" y="${r.y + 44}">${n} ${n === 1 ? T('chapter', 'فصل') : T('chapters', 'فصول')} · ${ex} ${T('explored', 'مُستكشفة')} · ${ma} ${T('mastered', 'متقنة')}</text>
        <rect class="km-reg__track" x="${r.x + r.w - PAD - 64}" y="${r.y + 24}" width="64" height="4" rx="2"/><rect class="km-reg__fill" x="${r.x + r.w - PAD - 64}" y="${r.y + 24}" width="${64 * ex / n}" height="4" rx="2"/></g>
        <text class="km-reg__far" x="${r.x + r.w / 2}" y="${r.y + r.h / 2}" text-anchor="middle" data-len="${name.length}" data-w="${r.w}">${esc(name)}</text><text class="km-reg__farm" x="${r.x + r.w / 2}" y="${r.y + r.h / 2}" text-anchor="middle">${n} ${n === 1 ? T('chapter', 'فصل') : T('chapters', 'فصول')}${ex ? ' · ' + ex + ' ' + T('explored', 'مُستكشفة') : ''}</text>`;
      regionEl[r.s] = g; subjLabel[r.s] = [g.querySelector('.km-reg__far'), g.querySelector('.km-reg__farm'), r]; });
    // in-subject prerequisite edges
    chs.forEach(ch => ch.prereq.forEach(p => { if (C0.chapter(p).subject !== ch.subject) return; const e = el('path', { class: 'km-e km-e--pre', d: curve(P(p), P(ch.id), 0), style: `--sc:${C0.SUBJ[ch.subject][1]}` }, gE); edgeEls.push({ e, a: p, b: ch.id, kind: 'pre' }); }));
    // cross-subject: prerequisites in another subject and named links (hidden until relevant)
    crossPre.forEach(([p, c]) => { const e = el('path', { class: 'km-e km-e--x', d: curve(P(p), P(c), 60) }, gX); edgeEls.push({ e, a: p, b: c, kind: 'x' }); });
    C0.LINKS.forEach(([a, b, why]) => { const e = el('path', { class: 'km-e km-e--link', d: curve(P(a), P(b), 80) }, gX); el('title', {}, e).textContent = `${C0.chapter(a).title} ↔ ${C0.chapter(b).title}: ${why}`; edgeEls.push({ e, a, b, kind: 'link', why }); });
    // chapter nodes
    chs.forEach(ch => { const p = P(ch.id), col = C0.SUBJ[ch.subject][1], st = status(ch.id), lines = wrap(ch.title, 22);
      const g = el('g', { class: `km-n km-n--${st}`, 'data-ch': ch.id, transform: `translate(${p.x} ${p.y})`, tabindex: '0', role: 'button', 'aria-label': `${ch.title}. ${C0.SUBJ[ch.subject][0]}. ${stName[st]}.${ch.prereq.length ? ' ' + T('Needs', 'يتطلب') + ': ' + ch.prereq.map(x => C0.chapter(x).title).join(', ') + '.' : ''}`, style: `--sc:${col}` }, gN);
      g.innerHTML = `<rect class="km-n__hit" x="-14" y="-10" width="${NODEW + 8}" height="${ROWH - 12}" rx="14"/><g transform="translate(4 12)">${marker(st, col)}</g><text class="km-n__t" x="20" y="${lines.length > 1 ? 9 : 17}">${lines.map((l, i) => `<tspan x="20" dy="${i ? 15 : 0}">${esc(l)}</tspan>`).join('')}</text>`;
      nodeEl[ch.id] = g; });
    }

    /* ---------- camera ---------- */
    const camS = { x: 0, y: 0, k: 1 }; let SW = 0, SH = 0, anim = 0, home = null;
    const apply = () => { cam.setAttribute('transform', `matrix(${camS.k} 0 0 ${camS.k} ${-camS.x * camS.k} ${-camS.y * camS.k})`); const far = camS.k < 0.62; root.classList.toggle('is-far', far);
      if (far) Object.values(subjLabel).forEach(([t, m, r]) => { const fs = Math.min(17 / camS.k, r.w * 0.86 / (+t.dataset.len * 0.6), r.h * 0.34), ms = Math.min(12 / camS.k, fs * 0.62); t.setAttribute('font-size', fs.toFixed(1)); t.setAttribute('y', (r.y + r.h / 2 - ms * 0.15).toFixed(1)); m.setAttribute('font-size', ms.toFixed(1)); m.setAttribute('y', (r.y + r.h / 2 + ms * 1.35).toFixed(1)); }); };
    const panelW = () => (!panel.hidden && SW >= 760 ? Math.min(360, SW * 0.4) + 24 : 0), sheetH = () => (!panel.hidden && SW < 760 ? Math.min(SH * 0.5, panel.offsetHeight || SH * 0.45) : 0);
    const fitRect = (x, y, w, h, pad = 28) => { const aw = SW - panelW() - pad * 2, ah = SH - sheetH() - pad * 2 - 56; const k = clamp(Math.min(aw / w, ah / h), minK() * 0.9, 2.2); return { k, x: x + w / 2 - (pad + aw / 2) / k, y: y + h / 2 - (pad + 56 + ah / 2) / k }; };
    const minK = () => Math.min((SW - 40) / L.W, (SH - 100) / L.H);
    const moveTo = (t, ms = 520) => { cancelAnimationFrame(anim); if (reduced() || ms === 0) { Object.assign(camS, t); apply(); return; } const s0 = Object.assign({}, camS), t0 = performance.now();
      // zoom-aware interpolation (interpolate scale geometrically, keep the screen centre's path straight)
      const c0 = { x: s0.x + SW / 2 / s0.k, y: s0.y + SH / 2 / s0.k }, c1 = { x: t.x + SW / 2 / t.k, y: t.y + SH / 2 / t.k };
      const step = now => { const f = ease(clamp((now - t0) / ms, 0, 1)), k = s0.k * Math.pow(t.k / s0.k, f), cx = c0.x + (c1.x - c0.x) * f, cy = c0.y + (c1.y - c0.y) * f; camS.k = k; camS.x = cx - SW / 2 / k; camS.y = cy - SH / 2 / k; apply(); if (f < 1) anim = requestAnimationFrame(step); else anim = 0; };
      anim = requestAnimationFrame(step); };
    const overview = ms => { home = fitRect(-10, -10, L.W + 20, L.H + 20, 18); moveTo(home, ms); };
    const zoomAt = (f, sx, sy) => { cancelAnimationFrame(anim); const k = clamp(camS.k * f, minK() * 0.8, 3.2), wx = camS.x + sx / camS.k, wy = camS.y + sy / camS.k; camS.k = k; camS.x = wx - sx / k; camS.y = wy - sy / k; apply(); };

    /* ---------- selection ---------- */
    let sel = null, showAll = false, hintOff = null;
    const ancestors = id => { const out = new Set(), walk = x => C0.chapter(x).prereq.forEach(p => { if (!out.has(p)) { out.add(p); walk(p); } }); walk(id); return out; };
    const dependents = id => chs.filter(c => c.prereq.includes(id)).map(c => c.id);
    const linksOf = id => C0.LINKS.filter(([a, b]) => a === id || b === id).map(([a, b, why]) => [a === id ? b : a, why]);
    function paint() {
      let on = null, focusEdges = () => false;
      if (sel && sel.type === 'subject') { const mine = new Set(chs.filter(c => c.subject === sel.id).map(c => c.id)); on = new Set(mine); edgeEls.forEach(x => { if (x.kind !== 'pre' && (mine.has(x.a) || mine.has(x.b))) { on.add(x.a); on.add(x.b); } }); focusEdges = x => mine.has(x.a) || mine.has(x.b); }
      if (sel && (sel.type === 'chapter' || sel.type === 'concept')) { const id = sel.ch, anc = ancestors(id); on = new Set([id, ...anc, ...dependents(id), ...linksOf(id).map(x => x[0])]); focusEdges = x => (x.a === id || x.b === id) || (anc.has(x.b) && anc.has(x.a)) || (x.b === id) || (anc.has(x.b) && x.kind !== 'link'); }
      Object.entries(nodeEl).forEach(([id, g]) => { g.classList.toggle('is-dim', !!on && !on.has(id)); g.classList.toggle('is-sel', !!sel && sel.ch === id); g.setAttribute('aria-pressed', String(!!sel && sel.ch === id)); });
      Object.entries(regionEl).forEach(([s, g]) => { g.classList.toggle('is-sel', !!sel && sel.type === 'subject' && sel.id === s); g.classList.toggle('is-dim', !!on && !chs.some(c => c.subject === s && on.has(c.id))); });
      edgeEls.forEach(x => { const hot = !!sel && focusEdges(x); x.e.classList.toggle('is-hot', hot); x.e.classList.toggle('is-on', x.kind === 'pre' ? true : hot || showAll); x.e.classList.toggle('is-dim', !!sel && !hot); });
      root.classList.toggle('has-sel', !!sel);
    }
    const chip = (id, extra) => { const c = C0.chapter(id); return `<li><button type="button" class="km-chip" data-pick="${id}" style="--sc:${C0.SUBJ[c.subject][1]}"><i class="km-chip__dot km-chip__dot--${status(id)}"></i><span>${esc(c.title)}${extra ? `<small>${esc(extra)}</small>` : ''}</span></button></li>`; };
    function describe() {
      if (!sel) { panel.hidden = true; return; }
      if (sel.type === 'subject') { const s = sel.id, [name, col] = C0.SUBJ[s], ids = chs.filter(c => c.subject === s).map(c => c.id), ex = ids.filter(i => status(i) !== 'new').length, ma = ids.filter(i => status(i) === 'mastered').length;
        const out = new Set(); edgeEls.forEach(x => { if (x.kind === 'pre') return; const a = C0.chapter(x.a).subject, b = C0.chapter(x.b).subject; if (a === s && b !== s) out.add(b); if (b === s && a !== s) out.add(a); });
        pbody.innerHTML = `<p class="km-p__kick" style="--sc:${col}"><i>${GLYPH[s]}</i>${T('Subject', 'مادة')}</p><h2 class="km-p__h">${esc(name)}</h2><p class="km-p__lead">${esc((LS.WORLD && LS.WORLD[s] || [''])[0])}</p>
          <div class="km-p__prog" style="--sc:${col}"><span><b>${ex}</b> / ${ids.length} ${T('explored', 'مُستكشفة')} · <b>${ma}</b> ${T('mastered', 'متقنة')}</span><i class="v2-bar"><i style="width:${ids.length ? ex / ids.length * 100 : 0}%"></i></i></div>
          <h3 class="km-p__h3">${T('Chapters, in order', 'الفصول بالترتيب')}</h3><ul class="km-p__list">${ids.map(id => chip(id, C0.LEVELS.find(l => l[0] === C0.chapter(id).level)[1])).join('')}</ul>
          ${out.size ? `<h3 class="km-p__h3">${T('Connects to', 'يرتبط بـ')}</h3><p class="km-p__small">${[...out].map(o => C0.SUBJ[o][0]).join(' · ')}</p>` : ''}
          <p class="km-p__acts"><a class="ls-btn ls-btn--accent" href="#/world/${s}">${T('Open', 'افتح')} ${esc(name)} →</a></p>`; }
      else { const ch = C0.chapter(sel.ch), [sname, col] = C0.SUBJ[ch.subject], st = status(ch.id), deps = dependents(ch.id), lk = linksOf(ch.id), lv = C0.LEVELS.find(l => l[0] === ch.level)[1];
        let conceptHtml = '';
        if (sel.type === 'concept') { const ci = conceptIndex[sel.concept.toLowerCase()], card = (LS.decks ? LS.decks.byChapter(ch.id) : []).find(c => new RegExp('\\b' + sel.concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(c.front + ' ' + c.back) && /definition|concept|formula/.test(c.type)) || null;
          conceptHtml = `<div class="km-p__concept"><p class="km-p__kick" style="--sc:${col}">${T('Concept', 'مفهوم')}</p><h3 class="km-p__h2">${esc(sel.concept)}</h3>${card ? `<p class="km-p__card"><b>${LS.inline ? LS.inline(card.front) : esc(card.front)}</b><br>${LS.inline ? LS.inline(card.back) : esc(card.back)}</p><p class="km-p__small">${T('From this chapter’s flashcards.', 'من بطاقات هذا الفصل.')}</p>` : `<p class="km-p__small">${T('Taught in this chapter; its flashcards and lesson explain it.', 'يُدرّس في هذا الفصل.')}</p>`}${ci && ci.chs.length > 1 ? `<p class="km-p__small">${T('Also taught in', 'يُدرّس أيضاً في')}:</p><ul class="km-p__list">${ci.chs.filter(x => x !== ch.id).map(x => chip(x)).join('')}</ul>` : ''}</div>`; }
        pbody.innerHTML = `<p class="km-p__kick" style="--sc:${col}"><i>${GLYPH[ch.subject]}</i>${esc(sname)} · ${T('Chapter', 'فصل')}</p><h2 class="km-p__h">${esc(ch.title)}</h2><p class="km-p__meta"><span class="km-st km-st--${st}">${stName[st]}</span><span>${lv}</span><span>≈ ${ch.mins} min</span></p><p class="km-p__lead">${esc(ch.why)}</p>${conceptHtml}
          <h3 class="km-p__h3">${T('Concepts', 'المفاهيم')}</h3><p class="km-p__concepts">${ch.concepts.map(c => `<button type="button" class="km-tag ${sel.concept === c ? 'is-on' : ''}" data-concept="${esc(c)}" aria-pressed="${sel.concept === c}">${esc(c)}</button>`).join('')}</p>
          <h3 class="km-p__h3">${T('Needs first', 'يتطلب أولاً')}</h3>${ch.prereq.length ? `<ul class="km-p__list">${ch.prereq.map(p => chip(p)).join('')}</ul>` : `<p class="km-p__small">${T('Nothing — a good place to start.', 'لا شيء — نقطة بداية جيدة.')}</p>`}
          ${deps.length ? `<h3 class="km-p__h3">${T('Leads to', 'يقود إلى')}</h3><ul class="km-p__list">${deps.map(d => chip(d)).join('')}</ul>` : ''}
          ${lk.length ? `<h3 class="km-p__h3">${T('Connected ideas in other subjects', 'أفكار مرتبطة في مواد أخرى')}</h3><ul class="km-p__list">${lk.map(([o, why]) => chip(o, why)).join('')}</ul>` : ''}
          <p class="km-p__acts"><a class="ls-btn ls-btn--accent" href="#/chapter/${ch.id}">${T('Open chapter', 'افتح الفصل')} →</a><a class="ls-btn ls-btn--quiet" href="#/cards/${ch.id}">${T('Flashcards', 'البطاقات')}</a><a class="ls-btn ls-btn--quiet" href="#/assess/${ch.id}">${T('Chapter check', 'فحص الفصل')}</a></p>`; }
      const was = panel.hidden; panel.hidden = false; if (was) { panel.classList.remove('is-in'); requestAnimationFrame(() => panel.classList.add('is-in')); } pbody.scrollTop = 0;
    }
    function select(next, o = {}) {
      if (next && hintOff) hintOff(); sel = next; paint(); describe();
      if (!sel) { overview(); return; }
      if (o.noCam) return;
      if (sel.type === 'subject') { const r = L.regions.find(x => x.s === sel.id), t = fitRect(r.x, r.y, r.w, r.h); if (t.k < 0.72) { /* a narrow screen: keep chapter titles readable and start at the beginning of the subject's path */ t.k = 0.72; t.x = r.x - 14 / t.k; t.y = r.y - 64 / t.k; } moveTo(t); }
      else { const p = P(sel.ch), r = L.regions.find(x => x.s === p.s), sub = fitRect(r.x, r.y, r.w, r.h), inView = (p.x - camS.x) * camS.k > 20 && (p.x + NODEW - camS.x) * camS.k < SW - panelW() - 20 && (p.y - camS.y) * camS.k > 60 && (p.y + 40 - camS.y) * camS.k < SH - sheetH() - 20;
        if (!inView || camS.k < Math.min(0.84, sub.k * 0.7) || camS.k < 0.84) { const k = clamp(Math.max(camS.k, sub.k), 0.85, 1.4); const t = { k: Math.min(k, (SW - panelW() - 24) / (NODEW + 40)) }; const aw = SW - panelW(), ah = SH - sheetH(); t.x = p.x + NODEW / 2 - aw / 2 / t.k; t.y = p.y + 20 - (56 + (ah - 56) / 2) / t.k; moveTo(t); } }
      if (o.focus) { const f = sel.type === 'subject' ? regionEl[sel.id].querySelector('.km-reg__head') : nodeEl[sel.ch]; f && f.focus({ preventScroll: true }); }
    }
    const pickChapter = id => { if (sel && sel.type === 'chapter' && sel.ch === id) { LS.go('chapter/' + id); return; } select({ type: 'chapter', ch: id }); };

    /* ---------- input ---------- */
    let drag = null, moved = 0; const pts = new Map();
    stage.addEventListener('pointerdown', e => { if (e.target.closest('.km__panel, .km__key, .km__hint, button, a, input')) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; drag = { x: e.clientX, y: e.clientY, cx: camS.x, cy: camS.y }; cancelAnimationFrame(anim); });
    stage.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; const r = stage.getBoundingClientRect();
      if (pts.size === 2) { const [a, b] = [...pts.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const [c, d] = [...pts.values()], d1 = Math.hypot(c.x - d.x, c.y - d.y); if (d0 > 0) zoomAt(d1 / d0, (c.x + d.x) / 2 - r.left, (c.y + d.y) / 2 - r.top); moved += 10; return; }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.hypot(dx, dy)); if (moved > 4) { hintOff && hintOff(); if (!stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId); root.classList.add('is-drag'); camS.x = drag.cx - dx / camS.k; camS.y = drag.cy - dy / camS.k; apply(); } });
    const up = e => { pts.delete(e.pointerId); if (!pts.size) { drag = null; root.classList.remove('is-drag'); } };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', e => { if (e.target.closest('.km__panel')) return; e.preventDefault(); const r = stage.getBoundingClientRect(); if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)), e.clientX - r.left, e.clientY - r.top); else { camS.x += e.deltaX / camS.k; apply(); } }, { passive: false });
    svg.addEventListener('click', e => { if (moved > 4) return; const n = e.target.closest('[data-ch]'); if (n) return pickChapter(n.dataset.ch); const h = e.target.closest('.km-reg'); if (h && (e.target.closest('.km-reg__head') || root.classList.contains('is-far') || !sel || sel.type !== 'subject' || sel.id !== h.dataset.s)) return select({ type: 'subject', id: h.dataset.s }); if (!h && sel) select(null); });
    svg.addEventListener('dblclick', e => { const n = e.target.closest('[data-ch]'); if (n) LS.go('chapter/' + n.dataset.ch); });
    svg.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const n = e.target.closest('[data-ch]'), h = e.target.closest('.km-reg__head'); if (!n && !h) return; e.preventDefault(); e.stopPropagation(); if (n) pickChapter(n.dataset.ch); else select({ type: 'subject', id: h.closest('.km-reg').dataset.s }); });
    svg.addEventListener('focusin', e => { const n = e.target.closest('[data-ch], .km-reg__head'); if (!n || (e.target.matches(':focus-visible') === false)) return; const p = n.dataset.ch ? P(n.dataset.ch) : null; if (p && ((p.x - camS.x) * camS.k < 0 || (p.x + NODEW - camS.x) * camS.k > SW - panelW() || (p.y - camS.y) * camS.k < 56 || (p.y + 40 - camS.y) * camS.k > SH - sheetH())) { const t = Object.assign({}, camS, { k: Math.max(camS.k, 0.75) }); t.x = p.x + NODEW / 2 - (SW - panelW()) / 2 / t.k; t.y = p.y + 20 - (SH - sheetH()) / 2 / t.k; moveTo(t, 320); } });
    stage.addEventListener('keydown', e => { if (e.target.closest('input, .km__panel a, .km__panel button')) { if (e.key === 'Escape' && e.target.closest('.km__panel')) { select(null); stage.focus(); } return; }
      const r = { ArrowLeft: [-80, 0], ArrowRight: [80, 0], ArrowUp: [0, -80], ArrowDown: [0, 80] }[e.key];
      if (r && (e.target === stage || e.altKey)) { e.preventDefault(); moveTo({ k: camS.k, x: camS.x + r[0] / camS.k, y: camS.y + r[1] / camS.k }, 200); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1.3, SW / 2, SH / 2); } else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(1 / 1.3, SW / 2, SH / 2); }
      else if (e.key === '0') { e.preventDefault(); select(null); } else if (e.key === 'Escape' && sel) { e.preventDefault(); const back = sel.type === 'subject' ? null : { type: 'subject', id: C0.chapter(sel.ch).subject }; select(back, { focus: !!back }); if (!back) stage.focus(); } });
    root.querySelector('.km__tools').addEventListener('click', e => { const z = e.target.closest('[data-z]'); if (z) { if (z.dataset.z === 'home') select(null); else zoomAnim(z.dataset.z === 'in' ? 1.45 : 1 / 1.45); } const a = e.target.closest('[data-all]'); if (a) { showAll = !showAll; a.setAttribute('aria-pressed', String(showAll)); paint(); } });
    const zoomAnim = f => { const k = clamp(camS.k * f, minK() * 0.8, 3.2), cx = camS.x + (SW - panelW()) / 2 / camS.k, cy = camS.y + SH / 2 / camS.k; moveTo({ k, x: cx - (SW - panelW()) / 2 / k, y: cy - SH / 2 / k }, 280); };
    panel.addEventListener('click', e => { if (e.target.closest('[data-clear]')) { select(null); stage.focus(); return; } const p = e.target.closest('[data-pick]'); if (p) { select({ type: 'chapter', ch: p.dataset.pick }); return; } const c = e.target.closest('[data-concept]'); if (c) { const same = sel.concept === c.dataset.concept; select(same ? { type: 'chapter', ch: sel.ch } : { type: 'concept', ch: sel.ch, concept: c.dataset.concept }, { noCam: true }); } });
    // search
    const find = root.querySelector('#kmFind'), res = root.querySelector('#kmRes'); let hits = [], hi = -1;
    const index = [...ORDER.map(s => ({ type: 'subject', id: s, label: C0.SUBJ[s][0], sub: T('Subject', 'مادة') })), ...chs.map(c => ({ type: 'chapter', ch: c.id, label: c.title, sub: C0.SUBJ[c.subject][0] })), ...Object.values(conceptIndex).map(ci => ({ type: 'concept', ch: ci.chs[0], concept: ci.name, label: ci.name, sub: T('Concept in', 'مفهوم في') + ' ' + C0.chapter(ci.chs[0]).title }))];
    const showRes = () => { res.innerHTML = hits.map((h, i) => `<li role="option" id="kmo${i}" aria-selected="${i === hi}" data-i="${i}"><b>${esc(h.label)}</b><small>${esc(h.sub)}</small></li>`).join('') || `<li class="km__none">${T('Nothing matches — try a subject or a word like “energy”.', 'لا نتائج.')}</li>`; res.hidden = !find.value.trim(); find.setAttribute('aria-expanded', String(!res.hidden)); find.setAttribute('aria-activedescendant', hi >= 0 ? 'kmo' + hi : ''); };
    const choose = h => { find.value = ''; hits = []; showRes(); select(h.type === 'subject' ? { type: 'subject', id: h.id } : h.type === 'chapter' ? { type: 'chapter', ch: h.ch } : { type: 'concept', ch: h.ch, concept: h.concept }, { focus: true }); };
    find.addEventListener('input', () => { const q = find.value.trim().toLowerCase(); hi = -1; hits = q ? index.filter(h => h.label.toLowerCase().includes(q)).sort((a, b) => (b.label.toLowerCase().startsWith(q) - a.label.toLowerCase().startsWith(q)) || ({ subject: 0, chapter: 1, concept: 2 }[a.type] - { subject: 0, chapter: 1, concept: 2 }[b.type])).slice(0, 8) : []; showRes(); });
    find.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (hits.length) { hi = (hi + (e.key === 'ArrowDown' ? 1 : hits.length - 1) + hits.length) % hits.length; showRes(); } } else if (e.key === 'Enter') { e.preventDefault(); const h = hits[hi >= 0 ? hi : 0]; if (h) choose(h); } else if (e.key === 'Escape') { find.value = ''; hits = []; showRes(); } });
    res.addEventListener('pointerdown', e => { const li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); choose(hits[+li.dataset.i]); } });
    find.addEventListener('blur', () => setTimeout(() => { res.hidden = true; find.setAttribute('aria-expanded', 'false'); }, 120));
    // first-visit hint
    const hint = root.querySelector('.km__hint'); let seen = false; try { seen = localStorage.getItem('erly-kmap-hint') === '1'; } catch (e) { /* storage blocked */ }
    if (!seen) hint.hidden = false;
    /* the tip goes away when dismissed or as soon as the map is used (a selection or a drag) — it never sits on top of chapters */
    hintOff = () => { if (hint.hidden) return; hint.hidden = true; try { localStorage.setItem('erly-kmap-hint', '1'); } catch (er) { /* storage blocked */ } };
    hint.addEventListener('click', e => { if (e.target.closest('[data-hintx]')) hintOff(); });

    // size
    const fit = () => { const r = stage.getBoundingClientRect(); const first = !SW; SW = r.width; SH = r.height; svg.setAttribute('width', SW); svg.setAttribute('height', SH); const b = bestLayout(); if (b.w !== maxW) { maxW = b.w; L = b.c; build(); paint(); } if (first || !sel) overview(0); else select(sel, { noCam: false }); };
    const ro = new ResizeObserver(fit); ro.observe(stage); fit();
    const off = LS.on('leave', () => { ro.disconnect(); cancelAnimationFrame(anim); off(); });
    LS.__constellation = { count: () => chs.length, links: () => C0.LINKS.length, regions: () => L.regions.map(r => ({ s: r.s, n: r.chs.length, x: r.x, y: r.y, w: r.w, h: r.h })), pos: () => L.pos, cam: () => Object.assign({}, camS), sel: () => sel, select, layout: () => L, busy: () => !!anim, size: () => [SW, SH] };
  }
  LS.kmapLayout = layout;
  LS.route('constellation', map); LS.route('map', map);
})();
