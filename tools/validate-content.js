// Content validator for the Learning Studio. It does not just check that fields exist: wherever an answer can be
// computed, it computes it independently and compares it with the stored answer.
//
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tools/validate-content.js [--report docs/ERLY-CONTENT-VALIDATION.md]
//
// It loads the real Studio (read-only inspection mode, so nothing is saved) and checks every question it can reach:
// the practice bank, every lesson activity, every lesson's revision questions, every experience's "apply" questions,
// including the sub-steps of step-by-step questions.
//
//   ERROR   something is demonstrably wrong (an answer index out of range, an expansion that is not equal to the
//           question, a marked option that contradicts the explanation's own arithmetic, a broken reference …)
//   REVIEW  a check that a person should look at (the tool cannot decide)
//
// Checks
//   structure     ids present and unique; answer indices in range; options not duplicated; tf answers boolean;
//                 multi answers valid; numeric answers finite; slider ranges sane.
//   arithmetic    every "a = b = c" chain written in an explanation, worked example or hint whose parts are plain
//                 numbers is evaluated, and neighbouring parts must agree (to the precision shown; "≈" allows 2 %).
//   expr          the stored answer and the question's expression must be equal at 12 random points.
//   graph         the plotted function must match the marked option and no other option.
//   slider        some reachable slider value (min…max in steps) must hit the target.
//   numeric       a numeric answer must equal the final number of its own explanation when that is a plain number.
//   mcq numbers   when every option is a number, the marked option must be the one closest to the explanation's
//                 final result.
//   references    lessons in paths, experiences / lab models / videos named in lessons, experiences' lessons and
//                 objective keys, videos' lessons.
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const perr = [];
  p.on('pageerror', e => perr.push(e.message));
  await p.goto(BASE + 'learn.html?inspect=1#/home'); await p.waitForFunction(() => window.LS && LS.inspect, null, { timeout: 30000 });
  await p.evaluate(() => LS.inspect.load());
  const res = await p.evaluate(() => {
    const out = [], add = (lvl, where, msg) => out.push({ lvl, where, msg });
    /* ---------- number helpers ---------- */
    const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
    const norm = s => String(s).replace(/[⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, m => '^(' + m.split('').map(ch => SUP[ch]).join('') + ')').replace(/\*\*/g, '').replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3').replace(/√\s*\(/g, 'sqrt(').replace(/√\s*([\d.]+)/g, 'sqrt($1)').replace(/(\d),(\d{3})\b/g, '$1$2');
    function evalNum(s) { // a plain arithmetic expression → number, or null
      let t = norm(s).trim().replace(/[.,;:]+$/, '').trim();
      t = t.replace(/\s*(m\/s²|m\/s\^2|m\/s|kg·m\/s|kg|N|J|W|V|A|Ω|m|s|g|L|mL|%|°|cm|km|Hz|mol|K)\b\s*$/i, '').trim();
      if (!/\d/.test(t) || !/^[\d\s.+\-*/^()a-z]*$/i.test(t)) return null;
      if (/[a-z]/i.test(t.replace(/sqrt/g, ''))) return null;
      try { const v = Function('"use strict"; const sqrt = Math.sqrt; return (' + t.replace(/\^/g, '**') + ');')(); return typeof v === 'number' && isFinite(v) ? v : null; } catch (e) { return null; }
    }
    const decimals = s => { const m = /(\d+)\.(\d+)\s*\D*$/.exec(norm(s).trim()); return m ? m[2].length : 0; };
    function chains(text, where) { // check "x = a = b ≈ c" chains
      if (!text) return;
      String(text).split(/\n|(?<=[.;:])\s+(?=[A-Z(])/).forEach(sent => {
        const parts = sent.split(/(=|≈)/);
        for (let i = 0; i + 2 < parts.length; i += 2) {
          let L = parts[i], R = parts[i + 2]; const approx = parts[i + 1] === '≈';
          // keep only the trailing expression of the left part and the leading expression of the right part
          const Lm = /[\d(√][\d\s.+\-−×·÷/^²³⁰¹⁴⁵⁶⁷⁸⁹⁻()√,]*$/.exec(L), Rm = /^\s*[−\-]?[\d(√][\d\s.+\-−×·÷/^²³⁰¹⁴⁵⁶⁷⁸⁹⁻()√,]*(\s*(m\/s²|m\/s|kg|N|J|W|V|A|Ω|m|s|%|°|Hz))?/.exec(R);
          if (!Lm || !Rm) continue;
          const pre = L.slice(0, Lm.index), post = R.slice(Rm[0].length);
          // only judge chains we can read whole: the left part must not continue an expression we cut (x − 3, P(7), 5040 mL ÷ 1000, ½ × …)
          if (/[\-−+×·÷*/^(½¼¾⅓]\s*$/.test(pre) || /[A-Za-zΔπ′')\]₀-₉]$/.test(pre) || /^\s*[\-−+×·÷*/^a-zA-Z(]/.test(post.replace(/^\s*(m\/s²|m\/s|kg|N|J|W|V|A|Ω|m|s|%|°|Hz)\b/, '')) && !/^\s*[.,;:]/.test(post)) continue;
          L = Lm[0]; R = Rm[0];
          const a = evalNum(L), c = evalNum(R); if (a == null || c == null) continue;
          if (!/[+\-−×·÷/^²³√*]/.test(L.trim().replace(/^[−\-]/, '')) && !/[+\-−×·÷/^²³√*]/.test(R.trim().replace(/^[−\-]/, ''))) { if (Math.abs(a - c) > 1e-9 * Math.max(1, Math.abs(a))) add('ERROR', where, `“${L.trim()} = ${R.trim()}”: two different numbers are written as equal.`); continue; }
          const d = Math.max(decimals(L), decimals(R)), tol = approx ? Math.max(0.02 * Math.abs(c), 0.5 * Math.pow(10, -d)) : Math.max(0.5 * Math.pow(10, -d) + 1e-9, 1e-9 * Math.abs(c), 0.006 * Math.abs(c));
          if (Math.abs(a - c) > tol) add('ERROR', where, `Arithmetic: “${L.trim()} ${parts[i + 1]} ${R.trim()}” — the left side is ${+a.toPrecision(6)}.`);
        }
      });
    }
    const lastNumber = text => { if (!text) return null; const m = norm(text).match(/[=≈]\s*-?[\d.]+(\^\(-?\d+\))?/g); if (!m) return null; const v = evalNum(m[m.length - 1].replace(/^[=≈\s]+/, '')); return v; };
    const firstNum = s => { const m = /-?\d+(\.\d+)?/.exec(norm(s)); return m ? parseFloat(m[0]) : null; };
    /* ---------- expression equivalence ---------- */
    const K = LS.kit;
    const exprFn = (src, vars) => { const s = norm(src).replace(/^\s*(dy\/dx|f′\(x\)|f'\(x\)|y|f\(x\))\s*=\s*/, '').replace(/\s+/g, ''); return K.expr(s, vars); };
    const sameFn = (f, g, vars, lo = -3, hi = 3) => { for (let i = 0; i < 12; i++) { const sc = {}; vars.forEach(v => { sc[v] = lo + (hi - lo) * ((i * 0.6180339887 + vars.indexOf(v) * 0.37) % 1); }); const a = f(sc), b2 = g(sc); if (!isFinite(a) && !isFinite(b2)) continue; if (Math.abs(a - b2) > 1e-6 * Math.max(1, Math.abs(a))) return false; } return true; };
    const call = (fn, x) => { const f = fn.f || fn; try { return typeof f === 'function' ? f({ x }) : NaN; } catch (e) { return NaN; } };
    /* ---------- collect every question ---------- */
    const Q = [], seen = {};
    const push = (q, where, ref) => { if (!q) return; Q.push({ q, where, ref }); };
    (LS.bank() || []).filter(q => q.from === 'bank').forEach(q => push(q, `practice bank ${q.id} (${q.lessonTitle || q.topic || ''})`)); // bank items copied from lesson activities are checked in their lesson
    LS.lessons.forEach(L => {
      L.sections.forEach(s => s.blocks.forEach((bl, i) => {
        if (bl.k === 'activity') push(bl.q, `lesson ${L.id} › ${s.title} › activity ${bl.q && bl.q.id}`);
        if (bl.k === 'example') { chains([bl.problem].concat(bl.steps || []).concat(bl.answer || []).map(x => typeof x === 'string' ? x : (x.md || x.text || '')).join('\n'), `lesson ${L.id} › ${s.title} › worked example`); }
        if (bl.k === 'text' || bl.k === 'callout') chains(bl.md, `lesson ${L.id} › ${s.title} › text`);
        if (bl.k === 'exp' && !LS.experiences.find(x => x.id === bl.id)) add('ERROR', `lesson ${L.id} › ${s.title}`, `Links to experience “${bl.id}”, which does not exist.`);
        if (bl.k === 'lab' && window.ERLY_LAB && !ERLY_LAB.engines.find(e => e.id === bl.engine)) add('ERROR', `lesson ${L.id} › ${s.title}`, `Links to Visual Lab model “${bl.engine}”, which does not exist.`);
        if (bl.k === 'video' && !(LS.VIDEOS || []).find(v => v.id === bl.id)) add('ERROR', `lesson ${L.id} › ${s.title}`, `Links to video “${bl.id}”, which does not exist.`);
      }));
      (L.revision || []).forEach(r => { const q = typeof r === 'string' ? LS.bank().find(x => x.id === r) : r; if (!q) add('ERROR', `lesson ${L.id} › revision`, `Revision question “${r}” does not exist.`); });
      (L.cards || []).forEach((c, i) => { if (!c.front || !c.back) add('ERROR', `lesson ${L.id} › flashcard ${i + 1}`, 'Card has an empty side.'); chains(c.back, `lesson ${L.id} › flashcard “${c.front}”`); });
      (L.summary || []).forEach(sm => chains(sm, `lesson ${L.id} › summary`));
    });
    LS.experiences.forEach(x => {
      const D = LS.exp.DEFS[x.id]; if (!D) { add('ERROR', `experience ${x.id}`, 'Registered but has no definition.'); return; }
      (D.apply || []).forEach(a => { const q = typeof a === 'string' ? LS.bank().find(z => z.id === a) : a; if (!q) add('ERROR', `experience ${x.id} › apply`, `Question “${a}” does not exist.`); else push(q, `experience ${x.id} › apply ${q.id}`, typeof a === 'string'); });
      if (D.predict && (!D.predict.options || D.predict.options.length < 2)) add('ERROR', `experience ${x.id}`, 'Prediction has fewer than two options.');
      if (x.lesson && !LS.lesson(x.lesson)) add('ERROR', `experience ${x.id}`, `Names lesson “${x.lesson}”, which does not exist.`);
      (x.objs || []).forEach(o => { const [lid, k] = o.split(':'); const L = LS.lesson(lid); if (!L || !L.objectives[+k]) add('ERROR', `experience ${x.id}`, `Objective key “${o}” does not match a lesson objective.`); });
      chains(D.explain, `experience ${x.id} › explanation`);
      (D.connect || []).forEach(cn => { const h = (cn.href || '').replace('#/', '').split('/'); if (h[0] === 'exp' && !LS.experiences.find(e => e.id === h[1])) add('ERROR', `experience ${x.id} › connections`, `Links to missing experience “${h[1]}”.`); if (h[0] === 'lesson' && !LS.lesson(h[1])) add('ERROR', `experience ${x.id} › connections`, `Links to missing lesson “${h[1]}”.`); });
    });
    (LS.paths || []).forEach(P => P.steps.forEach(id => { if (!LS.lesson(id)) add('ERROR', `path ${P.id}`, `Step “${id}” is not a lesson.`); }));
    (LS.VIDEOS || []).forEach(v => { if (v.lesson && !LS.lesson(v.lesson)) add('ERROR', `video ${v.id}`, `Names lesson “${v.lesson}”, which does not exist.`); });
    /* ---------- check each question ---------- */
    const ids = {};
    function check(q, where, sub) {
      if (!sub) { if (!q.id) add('ERROR', where, 'Question has no id.'); else if (ids[q.id] && ids[q.id] !== q) { const a = JSON.stringify(Object.assign({}, ids[q.id], { lesson: 0, lessonTitle: 0, section: 0, from: 0, subject: 0, topic: 0, provenance: 0 })), b2 = JSON.stringify(Object.assign({}, q, { lesson: 0, lessonTitle: 0, section: 0, from: 0, subject: 0, topic: 0, provenance: 0 })); if (a !== b2) add('ERROR', where, `Duplicate question id “${q.id}” used for two different questions.`); } else ids[q.id] = q; }
      const opts = q.options || q.statements || [];
      if (!q.prompt && !q.ask && q.type !== 'steps') add('ERROR', where, 'Question has no prompt.');
      const texts = [q.explain, typeof q.why === 'string' ? q.why : '', ...(q.hints || []), ...(q.wrong || []).map(w => w.why)].filter(Boolean);
      texts.forEach(t => chains(t, where));
      if (q.why && typeof q.why === 'object') Object.values(q.why).forEach(t => chains(t, where));
      if (opts.length && opts.every(o => typeof o === 'string') && (['mcq', 'graph'].includes(q.type) || (typeof q.answer === 'number' && !['numeric', 'slider'].includes(q.type)))) {
        if (!(q.answer >= 0 && q.answer < opts.length)) add('ERROR', where, `Answer index ${q.answer} is outside the ${opts.length} options.`);
        const dup = opts.map(o => String(o).trim()).filter((o, i, a) => a.indexOf(o) !== i); if (dup.length) add('ERROR', where, `Duplicate options: ${dup.join(', ')}.`);
        // numeric options: the explanation's own final result should point at the marked option
        const nums = opts.map(o => (/^\s*[−\-]?[\d.,]+\s*[a-zA-Z°%²/·]*\s*$/.test(String(o).replace(/\*\*/g, '')) ? firstNum(o) : null));
        const fin = lastNumber([q.explain, typeof q.why === 'string' ? q.why : ''].join(' '));
        if (fin != null && nums.every(n => n != null) && opts.length > 1) {
          let best = 0; nums.forEach((n, i) => { if (Math.abs(n - fin) < Math.abs(nums[best] - fin)) best = i; });
          if (best !== q.answer && Math.abs(nums[best] - fin) < Math.abs(nums[q.answer] - fin) - 1e-9) add('ERROR', where, `Marked answer “${opts[q.answer]}” but the explanation works out to ${fin}, which is option “${opts[best]}”.`);
        }
      }
      if (q.type === 'tf' && typeof q.answer !== 'boolean' && q.answer !== 0 && q.answer !== 1) add('ERROR', where, `True/false answer is ${JSON.stringify(q.answer)}.`);
      if (q.type === 'multi') { if (!Array.isArray(q.answer) || !q.answer.length || q.answer.some(a => !(a >= 0 && a < opts.length))) add('ERROR', where, 'Multi-select answer is not a list of valid option indices.'); }
      if (q.type === 'numeric') {
        if (typeof q.answer !== 'number' || !isFinite(q.answer)) add('ERROR', where, `Numeric answer is ${JSON.stringify(q.answer)}.`);
        const fin = lastNumber(q.explain || ''); const tol = Math.max(q.tol || 0, 0.006 * Math.abs(q.answer || 0), 0.005);
        if (fin != null && Math.abs(fin - q.answer) > tol && !(q.wrong || []).some(w => Math.abs(w.value - fin) < 1e-9)) add('REVIEW', where, `Stored answer ${q.answer}; the last number the explanation computes is ${fin}.`);
        (q.wrong || []).forEach(w => { if (Math.abs(w.value - q.answer) <= (q.tol || 0)) add('ERROR', where, `A listed wrong answer (${w.value}) would be marked correct.`); });
      }
      if (q.type === 'expr' && q.lhs && /[a-z]/i.test(q.lhs) && !/d\/dx|differentiate/i.test(q.prompt || '')) {
        try { const vars = q.vars || ['x']; const f = exprFn(q.answer, vars), g = exprFn(q.lhs, vars);
          if (!sameFn(f.f || f, g.f || g, vars)) add('ERROR', where, `Stored answer “${q.answer}” is not equal to “${q.lhs}”.`);
        } catch (e) { add('REVIEW', where, `Could not parse the expression to check it (${e.message}).`); }
      }
      if (q.type === 'graph' && q.plot && q.plot.fn && opts.length) {
        try { const P = exprFn(q.plot.fn, ['x']); const ok = opts.map(o => { try { const f = exprFn(String(o), ['x']); return sameFn(sc => call(f, sc.x), sc => call(P, sc.x), ['x'], q.plot.xmin, q.plot.xmax); } catch (e) { return null; } });
          if (ok.every(v => v != null)) { if (!ok[q.answer]) add('ERROR', where, `The plotted graph (${q.plot.fn}) does not match the marked option “${opts[q.answer]}”.`); const others = ok.map((v, i) => (v && i !== q.answer ? opts[i] : null)).filter(Boolean); if (others.length) add('ERROR', where, `The plotted graph also matches “${others.join('”, “')}”.`); }
        } catch (e) { add('REVIEW', where, `Could not parse the plotted function (${e.message}).`); }
      }
      if (q.type === 'slider' && q.param) {
        const P = q.param; if (!(P.min < P.max) || !(P.step > 0) || P.start < P.min || P.start > P.max) add('ERROR', where, 'Slider range, step or start is invalid.');
        try { const f = K.expr(norm(q.compute).replace(/\s+/g, ''), ['p']); let hit = null; for (let v = P.min; v <= P.max + 1e-9; v += P.step) { const r = (f.f || f)({ p: v }); if (Math.abs(r - q.target) <= (q.tol || 1e-9) + 1e-9) { hit = v; break; } }
          if (hit == null) add('ERROR', where, `No slider position from ${P.min} to ${P.max} in steps of ${P.step} reaches the target ${q.target}.`);
          else { const said = /\b[a-z]\s*=\s*(-?\d+(\.\d+)?)\s*[.,;]/i.exec(norm(q.explain || '')); if (said && Math.abs(+said[1] - hit) > 1e-9 && !new RegExp('=\\s*' + hit + '\\b').test(norm(q.explain))) add('REVIEW', where, `Slider target is reached at ${hit}; check that the explanation agrees.`); }
        } catch (e) { add('REVIEW', where, `Could not evaluate the slider formula (${e.message}).`); }
      }
      if (q.type === 'steps') (q.steps || []).forEach((s, i) => check(s, where + ` › step ${i + 1}`, true));
    }
    Q.forEach(({ q, where, ref }) => check(q, where, ref));
    // findings a person has checked and confirmed correct (kept visible in the report, not counted as open)
    const REVIEWED = {
      'p-bal': 'Checked by hand: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ releases 6 O₂; the 18 in the explanation is an oxygen-atom count on each side.',
      'lf-p2': 'Checked by hand: y = −2x + 4 passes through (0, 4) and (2, 0).'
    };
    out.forEach(f => { const id = Object.keys(REVIEWED).find(k => f.where.includes(' ' + k) && f.lvl === 'REVIEW'); if (id) { f.lvl = 'OK'; f.msg += ' — ' + REVIEWED[id]; } });
    // de-duplicate identical findings (a bank question that is also a lesson activity)
    const key = f => f.lvl + f.msg + f.where.replace(/^(practice bank|lesson|experience) /, '');
    const uniq = []; const k2 = new Set(); out.forEach(f => { const k = f.lvl + '|' + f.msg; if (!k2.has(k + f.where)) { k2.add(k + f.where); uniq.push(f); } });
    return { findings: uniq, questions: Q.length, lessons: LS.lessons.length, experiences: LS.experiences.length };
  });
  await b.close();
  if (perr.length) console.error('page errors:', perr);
  const E = res.findings.filter(f => f.lvl === 'ERROR'), R = res.findings.filter(f => f.lvl === 'REVIEW'), OK = res.findings.filter(f => f.lvl === 'OK');
  const md = `# Learning Studio content validation\n\nRun ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by \`tools/validate-content.js\`.\n\nChecked ${res.questions} questions (practice bank, lesson activities, revision, experience questions, with the sub-steps of step-by-step questions), ${res.lessons} lessons and ${res.experiences} experiences.\n\n**${E.length} errors · ${R.length} to review · ${OK.length} reviewed by hand**\n\n${E.length ? '## Errors\n\n' + E.map(f => `- **${f.where}** — ${f.msg}`).join('\n') + '\n\n' : ''}${R.length ? '## To review\n\n' + R.map(f => `- **${f.where}** — ${f.msg}`).join('\n') + '\n' : ''}${OK.length ? '\n## Reviewed by hand\n\n' + OK.map(f => `- **${f.where}** — ${f.msg}`).join('\n') + '\n' : ''}`;
  const rp = arg('--report'); if (rp) fs.writeFileSync(path.resolve(rp), md);
  console.log(md);
  process.exit(E.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
