/* ERLY Learning Studio — interactive activity components.

   One renderer for every question type in ls-grade.js. Each activity has instructions, accessible controls
   (everything works with a keyboard; drag-and-drop always has a select/tap alternative), validation,
   feedback now or at the end, an explanation, a way to retry, optional hints (guided mode), and records
   the attempt in the learning record.

   LS.activity(host, q, o) → { el, reset() }
     o.feedback: 'now' (default) | 'later'     o.guided: show hints     o.onResult(result)
     o.from: 'lesson' | 'practice' | 'revision' (stored with the attempt)  o.record: false to not record */
(function () {
  'use strict';
  const LS = window.LS, G = LS.grade, esc = LS.esc, T = LS.T, IL = LS.inline, M = LS.math;
  const shuffle = (a, seed) => { const r = a.slice(); let s = seed || 7; for (let i = r.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const seedOf = id => String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const INSTR = {
    mcq: 'Choose one answer.', multi: 'Choose every answer that is correct.', tf: 'Decide whether the statement is true or false.',
    fill: 'Type the missing words or numbers.', match: 'Match each item on the left with one on the right.', order: 'Put the steps in the correct order. Drag them, or use the arrow buttons.',
    label: 'Label the diagram: pick a label for each numbered point. (Tap a label, then a number, or use the lists.)', sort: 'Put each item in the right group.', compare: 'For each statement, decide which concept it describes.',
    numeric: 'Type your answer as a number.', expr: 'Type an expression. Use ^ for powers, e.g. 3x^2 + 2x.', graph: 'Read the graph to answer.', slider: 'Move the slider until the condition is met, then check.',
    short: 'Write a short answer in your own words. You will then compare it with a model answer.', steps: 'Work through the steps one at a time.'
  };

  function plot(fn, P) {
    const W = 360, H = 220, x0 = P.xmin, x1 = P.xmax; let ys = [];
    for (let i = 0; i <= 200; i++) { const x = x0 + (x1 - x0) * i / 200; let y; try { y = G.evaluate(fn, { x }); } catch (e) { y = NaN; } ys.push([x, y]); }
    const fin = ys.filter(p => isFinite(p[1])).map(p => p[1]); const y0 = P.ymin != null ? P.ymin : Math.min(0, ...fin), y1 = P.ymax != null ? P.ymax : Math.max(0, ...fin);
    const X = x => 30 + (x - x0) / (x1 - x0) * (W - 40), Y = y => H - 24 - (y - y0) / ((y1 - y0) || 1) * (H - 40);
    const grid = []; for (let gx = Math.ceil(x0); gx <= x1; gx += P.xstep || 1) grid.push(`<line x1="${X(gx)}" y1="${Y(y0)}" x2="${X(gx)}" y2="${Y(y1)}" class="g"/><text x="${X(gx)}" y="${H - 8}" class="t">${gx}</text>`);
    for (let gy = Math.ceil(y0); gy <= y1; gy += P.ystep || Math.max(1, Math.round((y1 - y0) / 6))) grid.push(`<line x1="${X(x0)}" y1="${Y(gy)}" x2="${X(x1)}" y2="${Y(gy)}" class="g"/><text x="22" y="${Y(gy) + 4}" class="t" text-anchor="end">${gy}</text>`);
    const d = ys.filter(p => isFinite(p[1]) && p[1] >= y0 - 1e3 && p[1] <= y1 + 1e3).map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(Math.max(y0, Math.min(y1, p[1]))).toFixed(1)).join(' ');
    return `<svg class="ls-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(P.alt || 'Graph of y = ' + fn)}">${grid.join('')}<line x1="${X(x0)}" y1="${Y(0)}" x2="${X(x1)}" y2="${Y(0)}" class="ax"/><line x1="${X(0)}" y1="${Y(y0)}" x2="${X(0)}" y2="${Y(y1)}" class="ax"/><path d="${d}" class="c"/></svg>`;
  }
  LS.plot = plot;

  const builders = {
    mcq(q, box, name) {
      const opts = q.keepOrder ? q.options.map((o, i) => i) : shuffle(q.options.map((o, i) => i), seedOf(q.id));
      box.innerHTML = `<fieldset class="ls-opts"><legend class="sr-only">${esc(LS.plain(q.prompt))}</legend>${opts.map(i => `<label class="ls-opt"><input type="radio" name="${name}" value="${i}"><span>${IL(q.options[i])}</span></label>`).join('')}</fieldset>`;
      return { get: () => { const c = box.querySelector('input:checked'); return c ? +c.value : null; }, text: r => (r == null ? '' : LS.plain(q.options[r])), empty: r => r == null,
        mark: (res, r) => box.querySelectorAll('.ls-opt').forEach(l => { const v = +l.querySelector('input').value; l.classList.toggle('is-right', v === q.answer); l.classList.toggle('is-wrong', v === r && v !== q.answer); }) };
    },
    graph(q, box, name) {
      box.innerHTML = `<div class="ls-graphq">${plot(q.plot.fn, q.plot)}</div><div class="ls-graphans"></div>`;
      const sub = box.querySelector('.ls-graphans'); const inner = q.ask === 'numeric' ? builders.numeric(q, sub, name) : builders.mcq(q, sub, name); return inner;
    },
    multi(q, box, name) {
      const opts = shuffle(q.options.map((o, i) => i), seedOf(q.id));
      box.innerHTML = `<fieldset class="ls-opts"><legend class="sr-only">${esc(LS.plain(q.prompt))}</legend>${opts.map(i => `<label class="ls-opt"><input type="checkbox" name="${name}" value="${i}"><span>${IL(q.options[i])}</span></label>`).join('')}</fieldset>`;
      return { get: () => [...box.querySelectorAll('input:checked')].map(c => +c.value), text: r => r.map(i => LS.plain(q.options[i])).join('; '), empty: r => !r.length,
        mark: (res, r) => box.querySelectorAll('.ls-opt').forEach(l => { const v = +l.querySelector('input').value; l.classList.toggle('is-right', q.answer.includes(v)); l.classList.toggle('is-wrong', r.includes(v) && !q.answer.includes(v)); l.classList.toggle('is-missed', !r.includes(v) && q.answer.includes(v)); }) };
    },
    tf(q, box, name) {
      box.innerHTML = `<fieldset class="ls-opts ls-opts--row"><legend class="sr-only">${esc(LS.plain(q.prompt))}</legend><label class="ls-opt"><input type="radio" name="${name}" value="1"><span>True</span></label><label class="ls-opt"><input type="radio" name="${name}" value="0"><span>False</span></label></fieldset>`;
      return { get: () => { const c = box.querySelector('input:checked'); return c ? c.value === '1' : null; }, text: r => (r == null ? '' : r ? 'True' : 'False'), empty: r => r == null,
        mark: (res, r) => box.querySelectorAll('.ls-opt').forEach(l => { const v = l.querySelector('input').value === '1'; l.classList.toggle('is-right', v === q.answer); l.classList.toggle('is-wrong', v === r && v !== q.answer); }) };
    },
    fill(q, box) {
      let k = 0; const html = IL(q.prompt).replace(/___/g, () => { const b = q.blanks[k]; const i = k++; return `<input class="ls-blank" type="text" inputmode="${b.num != null ? 'decimal' : 'text'}" autocomplete="off" spellcheck="false" aria-label="Blank ${i + 1}" data-b="${i}" size="${Math.max(6, (b.size || 10))}">`; });
      box.innerHTML = `<p class="ls-fill">${html}</p>`;
      return { prompted: true, get: () => [...box.querySelectorAll('.ls-blank')].map(x => x.value.trim()), text: r => r.join(' | '), empty: r => r.every(x => !x),
        mark: res => box.querySelectorAll('.ls-blank').forEach((x, i) => { const ok = res.detail.each[i]; x.classList.toggle('is-right', ok); x.classList.toggle('is-wrong', !ok); x.setAttribute('aria-invalid', !ok); if (!ok) { const b = q.blanks[i]; x.title = 'Expected: ' + (b.num != null ? b.num : b.accept[0]); } }) };
    },
    match(q, box) {
      const rights = shuffle(q.pairs.map((p, i) => i), seedOf(q.id) + 3);
      box.innerHTML = `<div class="ls-match">${q.pairs.map((p, i) => `<div class="ls-match__row"><span class="ls-match__l">${IL(p[0])}</span><span aria-hidden="true">→</span><select data-m="${i}" aria-label="Match for ${esc(LS.plain(p[0]))}"><option value="">Choose…</option>${rights.map(j => `<option value="${j}">${esc(LS.plain(q.pairs[j][1]))}</option>`).join('')}</select></div>`).join('')}</div>`;
      return { get: () => { const o = {}; box.querySelectorAll('select').forEach(s => { if (s.value !== '') o[s.dataset.m] = +s.value; }); return o; }, text: r => q.pairs.map((p, i) => LS.plain(p[0]) + ' → ' + (r[i] != null ? LS.plain(q.pairs[r[i]][1]) : '—')).join('; '), empty: r => !Object.keys(r).length,
        mark: res => box.querySelectorAll('.ls-match__row').forEach((row, i) => { row.classList.toggle('is-right', res.detail.each[i]); row.classList.toggle('is-wrong', !res.detail.each[i]); if (!res.detail.each[i]) row.dataset.want = LS.plain(q.pairs[i][1]); }) };
    },
    order(q, box) {
      let cur = shuffle(q.items.map((x, i) => i), seedOf(q.id) + 5); if (cur.every((v, i) => v === i)) cur = cur.slice().reverse();
      const draw = () => { box.innerHTML = `<ol class="ls-order">${cur.map((i, pos) => `<li class="ls-order__it" draggable="true" data-i="${i}" data-pos="${pos}"><span class="ls-order__grip" aria-hidden="true">⋮⋮</span><span class="ls-order__tx">${IL(q.items[i])}</span><span class="ls-order__btns"><button type="button" class="ls-ic" data-mv="-1" aria-label="Move up: ${esc(LS.plain(q.items[i]))}" ${pos === 0 ? 'disabled' : ''}>↑</button><button type="button" class="ls-ic" data-mv="1" aria-label="Move down: ${esc(LS.plain(q.items[i]))}" ${pos === cur.length - 1 ? 'disabled' : ''}>↓</button></span></li>`).join('')}</ol>`; };
      draw();
      box.addEventListener('click', e => { const b = e.target.closest('[data-mv]'); if (!b || box.classList.contains('is-locked')) return; const pos = +b.closest('li').dataset.pos, to = pos + +b.dataset.mv; [cur[pos], cur[to]] = [cur[to], cur[pos]]; draw(); const nb = box.querySelector(`li[data-pos="${to}"] [data-mv="${b.dataset.mv}"]`) || box.querySelector(`li[data-pos="${to}"] [data-mv]`); if (nb) nb.focus(); LS.announce(`Moved to position ${to + 1}`); });
      let drag = null;
      box.addEventListener('dragstart', e => { const li = e.target.closest('li'); if (!li) return; drag = +li.dataset.pos; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(drag)); } catch (er) { /* ok */ } });
      box.addEventListener('dragover', e => { if (drag != null) e.preventDefault(); });
      box.addEventListener('drop', e => { const li = e.target.closest('li'); if (drag == null || !li) return; e.preventDefault(); const to = +li.dataset.pos; const [m] = cur.splice(drag, 1); cur.splice(to, 0, m); drag = null; draw(); });
      return { get: () => cur.slice(), text: r => r.map(i => LS.plain(q.items[i])).join(' → '), empty: () => false,
        mark: res => box.querySelectorAll('.ls-order__it').forEach((li, p) => { li.classList.toggle('is-right', res.detail.each[p]); li.classList.toggle('is-wrong', !res.detail.each[p]); }) };
    },
    label(q, box) {
      const labels = shuffle(q.targets.map(t => t.label).concat(q.distractors || []), seedOf(q.id) + 9);
      box.innerHTML = `<div class="ls-label"><div class="ls-label__fig">${q.figure}${q.targets.map((t, i) => `<button type="button" class="ls-pin" data-t="${i}" style="left:${t.x}%;top:${t.y}%" aria-label="Point ${i + 1}">${i + 1}</button>`).join('')}</div>
        <div class="ls-label__chips" role="group" aria-label="Labels">${labels.map(l => `<button type="button" class="ls-chip" data-l="${esc(l)}" aria-pressed="false">${esc(l)}</button>`).join('')}</div>
        <ol class="ls-label__list">${q.targets.map((t, i) => `<li><label>Point ${i + 1} <select data-t="${i}"><option value="">Choose…</option>${labels.map(l => `<option>${esc(l)}</option>`).join('')}</select></label></li>`).join('')}</ol></div>`;
      let picked = null;
      const sync = () => box.querySelectorAll('.ls-pin').forEach(p => { const v = box.querySelector(`select[data-t="${p.dataset.t}"]`).value; p.textContent = v ? (+p.dataset.t + 1) + ' · ' + v : String(+p.dataset.t + 1); p.classList.toggle('is-set', !!v); });
      box.addEventListener('click', e => {
        if (box.classList.contains('is-locked')) return;
        const c = e.target.closest('.ls-chip'); if (c) { picked = picked === c.dataset.l ? null : c.dataset.l; box.querySelectorAll('.ls-chip').forEach(x => x.setAttribute('aria-pressed', x.dataset.l === picked)); if (picked) LS.announce(`Label “${picked}” picked. Now choose a numbered point.`); return; }
        const p = e.target.closest('.ls-pin'); if (p && picked) { box.querySelector(`select[data-t="${p.dataset.t}"]`).value = picked; picked = null; box.querySelectorAll('.ls-chip').forEach(x => x.setAttribute('aria-pressed', 'false')); sync(); }
      });
      box.addEventListener('change', sync);
      return { get: () => { const o = {}; box.querySelectorAll('select').forEach(s => { if (s.value) o[s.dataset.t] = s.value; }); return o; }, text: r => q.targets.map((t, i) => (i + 1) + ': ' + (r[i] || '—')).join('; '), empty: r => !Object.keys(r).length,
        mark: res => { box.querySelectorAll('.ls-label__list li').forEach((li, i) => { li.classList.toggle('is-right', res.detail.each[i]); li.classList.toggle('is-wrong', !res.detail.each[i]); if (!res.detail.each[i]) li.dataset.want = q.targets[i].label; }); box.querySelectorAll('.ls-pin').forEach((p, i) => p.classList.toggle('is-wrong', !res.detail.each[i])); } };
    },
    sort(q, box) {
      const items = shuffle(q.items.map((x, i) => i), seedOf(q.id) + 2);
      box.innerHTML = `<div class="ls-sort"><ul class="ls-sort__items">${items.map(i => `<li><span>${IL(q.items[i].text)}</span><select data-s="${i}" aria-label="Group for ${esc(LS.plain(q.items[i].text))}"><option value="">Group…</option>${q.categories.map(c => `<option>${esc(c)}</option>`).join('')}</select></li>`).join('')}</ul></div>`;
      return { get: () => { const o = {}; box.querySelectorAll('select').forEach(s => { if (s.value) o[s.dataset.s] = s.value; }); return o; }, text: r => q.items.map((it, i) => LS.plain(it.text) + ' → ' + (r[i] || '—')).join('; '), empty: r => !Object.keys(r).length,
        mark: res => box.querySelectorAll('.ls-sort__items li').forEach(li => { const i = +li.querySelector('select').dataset.s; li.classList.toggle('is-right', res.detail.each[i]); li.classList.toggle('is-wrong', !res.detail.each[i]); if (!res.detail.each[i]) li.dataset.want = q.items[i].cat; }) };
    },
    compare(q, box) {
      const ch = q.concepts.concat(['Both']);
      box.innerHTML = `<table class="ls-cmp"><thead><tr><th scope="col">Statement</th>${ch.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${q.statements.map((s, i) => `<tr><th scope="row">${IL(s.text)}</th>${ch.map(c => `<td><input type="radio" name="${q.id}-c${i}" value="${esc(c)}" aria-label="${esc(LS.plain(s.text))}: ${esc(c)}"></td>`).join('')}</tr>`).join('')}</tbody></table>`;
      return { get: () => { const o = {}; q.statements.forEach((s, i) => { const c = box.querySelector(`input[name="${q.id}-c${i}"]:checked`); if (c) o[i] = c.value; }); return o; }, text: r => q.statements.map((s, i) => (r[i] || '—')).join('; '), empty: r => !Object.keys(r).length,
        mark: res => box.querySelectorAll('tbody tr').forEach((tr, i) => { tr.classList.toggle('is-right', res.detail.each[i]); tr.classList.toggle('is-wrong', !res.detail.each[i]); if (!res.detail.each[i]) tr.dataset.want = q.statements[i].ans; }) };
    },
    numeric(q, box) {
      box.innerHTML = `<label class="ls-num"><span class="sr-only">Your answer</span><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-describedby="${q.id}-u">${q.unit ? `<span class="ls-unit" id="${q.id}-u">${M(q.unit)}</span>` : `<span id="${q.id}-u" hidden></span>`}</label>`;
      const inp = box.querySelector('input');
      return { get: () => inp.value.trim(), text: r => r + (q.unit ? ' ' + q.unit : ''), empty: r => !r, invalid: r => !isFinite(G.parseNum(r)) && 'That doesn’t look like a number — try something like 12.5 or 3.2e-4.',
        mark: res => { inp.classList.toggle('is-right', res.correct); inp.classList.toggle('is-wrong', !res.correct); inp.setAttribute('aria-invalid', !res.correct); } };
    },
    expr(q, box) {
      box.innerHTML = `<label class="ls-num ls-expr"><span class="ls-expr__pre">${q.lhs ? M(q.lhs) + ' =' : ''}</span><input type="text" autocomplete="off" spellcheck="false" aria-label="Expression"><output class="ls-expr__view" aria-live="polite"></output></label>`;
      const inp = box.querySelector('input'), view = box.querySelector('output');
      inp.addEventListener('input', () => { const v = inp.value.trim(); if (!v) { view.textContent = ''; return; } try { G.parse(v); view.innerHTML = 'reads as: ' + M(v.replace(/\*/g, '·')); view.classList.remove('is-bad'); } catch (e) { view.textContent = 'not readable yet: ' + e.message; view.classList.add('is-bad'); } });
      return { get: () => inp.value.trim(), text: r => r, empty: r => !r, invalid: r => { try { G.parse(r); return false; } catch (e) { return 'I can’t read that expression (' + e.message + '). Use ^ for powers and * or brackets for multiplying.'; } },
        mark: res => { inp.classList.toggle('is-right', res.correct); inp.classList.toggle('is-wrong', !res.correct); } };
    },
    slider(q, box) {
      const P = q.param;
      box.innerHTML = `<div class="ls-slider"><label><span>${M(P.label || 'p')}</span><input type="range" min="${P.min}" max="${P.max}" step="${P.step || 0.1}" value="${P.start != null ? P.start : P.min}"><output></output></label><p class="ls-slider__res" aria-live="polite"></p>${q.figure ? `<div class="ls-slider__fig">${q.figure}</div>` : ''}</div>`;
      const r = box.querySelector('input'), out = box.querySelector('output'), res = box.querySelector('.ls-slider__res');
      const upd = () => { out.textContent = (+r.value) + (P.unit ? ' ' + P.unit : ''); let v; try { v = G.evaluate(q.compute, { p: +r.value }); } catch (e) { v = NaN; } res.innerHTML = `${M(q.resultLabel || 'result')} = <b>${isFinite(v) ? +v.toFixed(3) : '—'}</b>${q.resultUnit ? ' ' + M(q.resultUnit) : ''}`; if (q.onSlide) q.onSlide(+r.value, box); };
      r.addEventListener('input', upd); upd();
      return { get: () => +r.value, text: v => String(v) + (P.unit ? ' ' + P.unit : ''), empty: () => false, mark: () => {} };
    },
    short(q, box) {
      box.innerHTML = `<label class="ls-short"><span class="sr-only">Your answer</span><textarea rows="4" placeholder="Write it in your own words…"></textarea></label>`;
      const ta = box.querySelector('textarea');
      return { get: () => ta.value.trim(), text: r => r, empty: r => !r || r.split(/\s+/).length < 3, emptyMsg: 'Write at least a sentence first.', mark: () => {} };
    },
    steps(q, box, name, o) {
      box.innerHTML = `<ol class="ls-steps">${q.steps.map((s, i) => `<li class="ls-step" data-s="${i}" ${i ? 'hidden' : ''}><p class="ls-step__p">${IL(s.prompt)}</p><div class="ls-step__a"></div><div class="ls-step__fb" aria-live="polite"></div><button type="button" class="ls-btn ls-btn--sm" data-stepcheck="${i}">Check step ${i + 1}</button></li>`).join('')}</ol>`;
      const subs = q.steps.map((s, i) => builders[s.type](Object.assign({ id: q.id + '-s' + i }, s), box.querySelector(`.ls-step[data-s="${i}"] .ls-step__a`), name + '-s' + i, o));
      const resp = [];
      box.addEventListener('click', e => {
        const b = e.target.closest('[data-stepcheck]'); if (!b) return; const i = +b.dataset.stepcheck, s = q.steps[i], sub = subs[i], r = sub.get();
        const fb = box.querySelector(`.ls-step[data-s="${i}"] .ls-step__fb`);
        if (sub.empty && sub.empty(r)) { fb.textContent = 'Answer this step first.'; return; }
        const bad = sub.invalid && sub.invalid(r); if (bad) { fb.textContent = bad; return; }
        const res = G.check(s, r); resp[i] = r; sub.mark(res, r);
        fb.innerHTML = (res.correct ? '<b class="ok">Right.</b> ' : `<b class="no">Not quite.</b> `) + IL(s.explain || '');
        if (res.correct || o.feedback === 'later') { b.hidden = true; const nx = box.querySelector(`.ls-step[data-s="${i + 1}"]`); if (nx) { nx.hidden = false; const f = nx.querySelector('input, select, textarea'); if (f) f.focus(); } }
        box.dispatchEvent(new CustomEvent('stepdone', { detail: { i, correct: res.correct } }));
      });
      return { get: () => resp, text: r => r.map((x, i) => `step ${i + 1}: ${subs[i].text(x == null ? '' : x)}`).join('; '), empty: r => r.length < q.steps.length || r.some(x => x == null), emptyMsg: 'Work through every step first.', mark: () => {}, own: true };
    }
  };

  let n = 0;
  LS.activity = function (host, q, o) {
    o = Object.assign({ feedback: 'now', from: 'lesson', record: true }, o || {});
    const name = 'a' + (++n) + '-' + q.id, el = document.createElement('div');
    el.className = 'ls-act'; el.dataset.q = q.id; el.dataset.type = q.type;
    const hints = (q.hints || []).slice();
    el.innerHTML = `<div class="ls-act__head"><span class="ls-act__kind">${esc(LS.intel.TYPE_NAMES[q.type] || q.type)}</span>${q.difficulty ? `<span class="ls-diff" title="Difficulty">${'●'.repeat(q.difficulty)}${'○'.repeat(3 - q.difficulty)}<span class="sr-only"> difficulty ${q.difficulty} of 3</span></span>` : ''}</div>
      ${q.ctx ? `<div class="ls-act__ctx">${LS.md(q.ctx)}</div>` : ''}
      ${q.type !== 'fill' ? `<div class="ls-act__q" id="${name}-q">${IL(q.prompt)}</div>` : ''}
      <p class="ls-act__instr">${esc(q.instr || INSTR[q.type])}</p>
      <div class="ls-act__body" role="group" aria-labelledby="${name}-q"></div>
      <div class="ls-act__hint" hidden aria-live="polite"></div>
      <div class="ls-act__bar">${q.type !== 'steps' ? `<button type="button" class="ls-btn ls-btn--accent" data-a="check">Check answer</button>` : ''}${hints.length && o.guided ? `<button type="button" class="ls-btn ls-btn--quiet" data-a="hint">Hint (${hints.length})</button>` : ''}<button type="button" class="ls-btn ls-btn--quiet" data-a="retry" hidden>Try again</button></div>
      <div class="ls-act__fb" aria-live="polite" tabindex="-1"></div>`;
    host.appendChild(el);
    const body = el.querySelector('.ls-act__body'), fb = el.querySelector('.ls-act__fb');
    let comp = builders[q.type](q, body, name, o), shown = 0, done = false;

    function finish(res, r) {
      done = true; body.classList.add('is-locked'); el.classList.add('is-done');
      body.querySelectorAll('input, select, textarea').forEach(x => { x.disabled = true; });
      if (o.feedback === 'now' || o.reveal) comp.mark(res, r);
      const txt = comp.text(r);
      // the wrong option's own explanation and error tag, when the content has one
      let why = '', tag = null;
      if (res.correct === false) {
        if ((q.type === 'mcq' || q.type === 'graph') && q.why && q.why[r]) { why = q.why[r]; tag = q.tags && q.tags[r]; }
        if (q.type === 'numeric' && q.wrong) { const v = G.parseNum(r); const w = q.wrong.find(x => G.within(v, x.value, x.tol || Math.abs(x.value) * 0.02)); if (w) { why = w.why; tag = w.tag; } }
      }
      const rec = o.record !== false ? LS.store.recordAttempt({ qid: q.id, type: q.type, topic: q.topic || o.topic, subject: q.subject || o.subject, lesson: q.lesson || o.lesson, from: o.from, correct: res.correct, score: res.score, answerText: String(txt).slice(0, 400), prompt: LS.plain(q.prompt).slice(0, 200), errorTag: tag || null, textHeavy: !!q.ctx, hintsUsed: shown, q }) : null;
      if (o.feedback === 'later' && !o.reveal) { fb.innerHTML = `<p class="ls-fb ls-fb--saved">Answer saved. Feedback comes at the end.</p>`; }
      else if (res.correct === null) {
        fb.innerHTML = `<div class="ls-fb ls-fb--self"><p><b>Compare with a model answer:</b></p><blockquote>${LS.md(q.model)}</blockquote><p>Key ideas: ${q.ideas.map((alts, i) => `<span class="ls-idea ${res.detail.ideas[i] ? 'is-hit' : ''}">${res.detail.ideas[i] ? '✓' : '○'} ${esc(alts[0])}</span>`).join(' ')}</p><p class="ls-muted">The ticks only show which key words appear in your answer — they are not a mark. How does your answer compare?</p>
          <div class="ls-self" role="group" aria-label="Your own judgement"><button type="button" class="ls-btn ls-btn--sm" data-self="1">I covered the key ideas</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-self="0">I missed some</button></div>${q.explain ? `<p>${IL(q.explain)}</p>` : ''}</div>`;
        fb.querySelector('[data-self]') && fb.addEventListener('click', e => { const b = e.target.closest('[data-self]'); if (!b) return; const ok = b.dataset.self === '1'; if (rec) LS.store.markSelf(rec, ok); fb.querySelector('.ls-self').innerHTML = ok ? '<b class="ok">Noted.</b>' : '<b>Noted — it’s saved to your mistakes so you can come back to it.</b>'; }, { once: true });
      } else {
        fb.innerHTML = `<div class="ls-fb ${res.correct ? 'ls-fb--ok' : 'ls-fb--no'}"><p class="ls-fb__h">${res.correct ? '<span aria-hidden="true">✓</span> Correct.' : `<span aria-hidden="true">✕</span> Not quite${res.score > 0 && res.score < 1 ? ` — ${Math.round(res.score * 100)}% of it was right` : ''}.`}</p>${why ? `<p class="ls-fb__why">${IL(why)}</p>` : ''}<p>${IL(q.explain)}</p>${!res.correct && q.correctText ? `<p><b>Answer:</b> ${IL(q.correctText)}</p>` : ''}</div>`;
      }
      if (o.feedback === 'now' || res.correct === null) {
        const tools = document.createElement('div'); tools.className = 'ls-act__tools';
        tools.innerHTML = `${res.correct === false ? `<button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-a="whynoor">Explain my mistake (Noor)</button>` : ''}<button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-a="note">Save to notebook</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-a="card">Make a flashcard</button>`;
        fb.appendChild(tools);
      }
      el.querySelector('[data-a="check"]') && (el.querySelector('[data-a="check"]').hidden = true);
      el.querySelector('[data-a="retry"]').hidden = o.feedback === 'later' && !o.reveal;
      fb.focus({ preventScroll: true }); LS.announce(res.correct === true ? 'Correct' : res.correct === false ? 'Not quite. See the explanation.' : 'Compare your answer with the model answer.');
      el._last = { res, r, txt };
      if (o.onResult) o.onResult(res, rec);
    }

    el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'check') {
        const r = comp.get();
        if (comp.empty(r)) { fb.innerHTML = `<p class="ls-fb ls-fb--warn" role="alert">${esc(comp.emptyMsg || 'Choose or type an answer first.')}</p>`; return; }
        const bad = comp.invalid && comp.invalid(r); if (bad) { fb.innerHTML = `<p class="ls-fb ls-fb--warn" role="alert">${esc(bad)}</p>`; return; }
        finish(G.check(q, r), r);
      }
      if (a === 'hint') { if (shown < hints.length) { if (LS.engine) LS.engine.event('hint', { obj: LS.engine.objOf(q), qid: q.id, n: shown + 1, label: 'Hint used' }); const h = el.querySelector('.ls-act__hint'); h.hidden = false; h.innerHTML += `<p><b>Hint ${shown + 1}:</b> ${IL(hints[shown])}</p>`; shown++; b.textContent = shown < hints.length ? `Another hint (${hints.length - shown})` : 'No more hints'; b.disabled = shown >= hints.length; } }
      if (a === 'retry') api.reset();
      if (a === 'whynoor' && el._last) LS.noor.ask('mistake', { q, answer: el._last.txt });
      if (a === 'note' && el._last) LS.notes.quick({ title: 'Question: ' + LS.plain(q.prompt).slice(0, 70), html: `<p><b>Question.</b> ${IL(q.prompt)}</p><p><b>My answer.</b> ${esc(el._last.txt)}</p><p><b>Explanation.</b> ${IL(q.explain)}</p>`, src: { type: 'question', id: q.id, title: o.lessonTitle || q.topic || 'Practice', where: q.lesson ? `#/lesson/${q.lesson}` : '#/practice' } });
      if (a === 'card' && el._last) LS.cards.quick({ front: LS.plain(q.prompt), back: LS.plain(q.correctText || q.explain), kind: 'qa', topic: q.topic || o.topic, src: { type: 'question', id: q.id, title: o.lessonTitle || q.topic } });
    });
    body.addEventListener('stepdone', e => { if (q.type === 'steps' && e.detail.i === q.steps.length - 1) finish(G.check(q, comp.get()), comp.get()); });

    const api = {
      el,
      reset() { done = false; el.classList.remove('is-done'); body.classList.remove('is-locked'); fb.innerHTML = ''; body.innerHTML = ''; comp = builders[q.type](q, body, name + 'r' + Date.now(), o); const c = el.querySelector('[data-a="check"]'); if (c) c.hidden = false; el.querySelector('[data-a="retry"]').hidden = true; const f = body.querySelector('input, select, textarea, button'); if (f) f.focus(); },
      reveal() { if (el._last) { comp.mark(el._last.res, el._last.r); o.reveal = true; const { res } = el._last; fb.innerHTML = `<div class="ls-fb ${res.correct ? 'ls-fb--ok' : 'ls-fb--no'}"><p class="ls-fb__h">${res.correct ? '✓ Correct.' : '✕ Not quite.'}</p><p>${IL(q.explain)}</p>${!res.correct && q.correctText ? `<p><b>Answer:</b> ${IL(q.correctText)}</p>` : ''}</div>`; el.querySelector('[data-a="retry"]').hidden = false; } },
      done: () => done, result: () => el._last && el._last.res
    };
    return api;
  };
})();
