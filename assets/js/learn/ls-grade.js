/* ERLY Learning Studio — answer checking for every activity type, and a small safe maths-expression
   evaluator (no eval / Function: a hand-written parser that understands + − × ÷ ^, brackets, implicit
   multiplication such as 2x or 3(x+1), the functions sin cos tan asin acos atan sqrt ln log exp abs, and the
   constants pi and e). Pure functions: the same file runs in the browser and in the unit tests. */
(function (root) {
  'use strict';

  /* ---------------- expressions ---------------- */
  const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sqrt: Math.sqrt, ln: Math.log, log: x => Math.log10(x), exp: Math.exp, abs: Math.abs };
  function tokenize(src) {
    const s = String(src).replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/π/g, 'pi').replace(/²/g, '^2').replace(/³/g, '^3').replace(/√/g, 'sqrt');
    const out = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; if (s[j] === 'e' && /[-+0-9]/.test(s[j + 1] || '') && !/[a-z]/i.test(s[j + 2] || '')) { j++; if (/[-+]/.test(s[j])) j++; while (j < s.length && /[0-9]/.test(s[j])) j++; } const v = parseFloat(s.slice(i, j)); if (!isFinite(v)) throw new Error('bad number'); out.push({ t: 'n', v }); i = j; continue; }
      if (/[a-z]/i.test(c)) { let j = i; while (j < s.length && /[a-z]/i.test(s[j])) j++; let w = s.slice(i, j).toLowerCase();
        // split runs like "xy" or "2pix" into known names: functions and constants first, then single letters
        while (w) { const f = Object.keys(FN).concat(['pi']).sort((a, b) => b.length - a.length).find(k => w.startsWith(k)); if (f) { out.push(f === 'pi' ? { t: 'n', v: Math.PI } : { t: 'f', v: f }); w = w.slice(f.length); } else { out.push({ t: 'v', v: w[0] }); w = w.slice(1); } }
        i = j; continue; }
      if ('+-*/^(),'.includes(c)) { out.push({ t: c }); i++; continue; }
      throw new Error('unexpected “' + c + '”');
    }
    // implicit multiplication: 2x, 2(…), x(…), )(…), )x, 2sin x
    const r = [];
    out.forEach((tk, k) => { const p = r[r.length - 1]; if (p && (p.t === 'n' || p.t === 'v' || p.t === ')') && (tk.t === 'n' || tk.t === 'v' || tk.t === '(' || tk.t === 'f')) r.push({ t: '*' }); r.push(tk); });
    return r;
  }
  function parse(src) {
    const tk = tokenize(src); let i = 0;
    const peek = () => tk[i], next = () => tk[i++];
    const expect = t => { const x = next(); if (!x || x.t !== t) throw new Error('expected “' + t + '”'); };
    function primary() {
      const x = next(); if (!x) throw new Error('incomplete expression');
      if (x.t === 'n') return { k: 'n', v: x.v };
      if (x.t === 'v') return { k: 'v', v: x.v };
      if (x.t === '(') { const e = expr(); expect(')'); return e; }
      if (x.t === 'f') { let a; if (peek() && peek().t === '(') { next(); a = expr(); expect(')'); } else a = power(); return { k: 'f', f: x.v, a }; }
      if (x.t === '-') return { k: 'neg', a: power() };
      if (x.t === '+') return power();
      throw new Error('unexpected “' + x.t + '”');
    }
    function power() { const b = primary(); if (peek() && peek().t === '^') { next(); const e = unary(); return { k: '^', a: b, b: e }; } return b; }
    function unary() { if (peek() && peek().t === '-') { next(); return { k: 'neg', a: unary() }; } if (peek() && peek().t === '+') { next(); return unary(); } return power(); }
    function term() { let a = unary(); while (peek() && (peek().t === '*' || peek().t === '/')) { const op = next().t; a = { k: op, a, b: unary() }; } return a; }
    function expr() { let a = term(); while (peek() && (peek().t === '+' || peek().t === '-')) { const op = next().t; a = { k: op, a, b: term() }; } return a; }
    const e = expr(); if (i < tk.length) throw new Error('unexpected “' + (tk[i].t === 'n' ? tk[i].v : tk[i].v || tk[i].t) + '”');
    return e;
  }
  function evalAst(n, env) {
    switch (n.k) {
      case 'n': return n.v;
      case 'v': if (n.v in env) return env[n.v]; if (n.v === 'e') return Math.E; throw new Error('unknown symbol “' + n.v + '”');
      case 'neg': return -evalAst(n.a, env);
      case '+': return evalAst(n.a, env) + evalAst(n.b, env);
      case '-': return evalAst(n.a, env) - evalAst(n.b, env);
      case '*': return evalAst(n.a, env) * evalAst(n.b, env);
      case '/': return evalAst(n.a, env) / evalAst(n.b, env);
      case '^': return Math.pow(evalAst(n.a, env), evalAst(n.b, env));
      case 'f': return FN[n.f](evalAst(n.a, env));
    }
    throw new Error('bad expression');
  }
  const evaluate = (src, env) => evalAst(parse(src), env || {});
  // two expressions are treated as equal when they agree at several sample points (a standard CAS-free check)
  function sameExpr(a, b, vars, o) {
    o = o || {}; vars = vars && vars.length ? vars : ['x']; let A, B;
    try { A = parse(a); } catch (e) { return { ok: false, error: e.message }; }
    B = parse(b);
    const pts = o.points || [-2.3, -1.1, -0.4, 0.35, 0.9, 1.7, 2.6, 3.4];
    let agree = 0, tried = 0;
    for (let k = 0; k < pts.length; k++) {
      const env = {}; vars.forEach((v, j) => { env[v] = pts[(k + j * 3) % pts.length] + j * 0.37; });
      let x, y; try { x = evalAst(A, env); y = evalAst(B, env); } catch (e) { return { ok: false, error: e.message }; }
      if (!isFinite(y)) continue; tried++;
      if (isFinite(x) && Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(y))) agree++;
    }
    return { ok: tried > 0 && agree === tried };
  }

  /* ---------------- answer checking ----------------
     Every checker returns { correct: true|false|null, score: 0..1, detail } — null means "not auto-marked"
     (short written answers are compared with the key ideas and the student judges their own answer). */
  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").replace(/[^a-z0-9.+\-/^' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  function parseNum(s) {
    const t = String(s == null ? '' : s).trim().replace(/,(?=\d{3}\b)/g, '').replace(/(\d)\s*[×x*]\s*10\s*\^\s*([-+]?\d+)/i, '$1e$2').replace(/[−–]/g, '-');
    const m = t.match(/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i); if (!m && !/^[-+]?\(/.test(t)) return NaN;
    const rest = m ? t.slice(m[0].length).trim() : '(';
    if (!rest || /^[a-zA-Zµμ°%Ω]/.test(rest)) return parseFloat(m[0]); // a number, optionally followed by a unit
    const core = t.replace(/\s+[a-zA-Zµμ°%Ω][^]*$/, '');                 // arithmetic such as 1/4 or (3+5)/2, then a unit
    try { const v = evaluate(core); return isFinite(v) ? v : NaN; } catch (e) { return NaN; }
  }
  const within = (v, target, tol) => { const t = tol == null ? Math.max(1e-9, Math.abs(target) * 0.01) : (typeof tol === 'string' && tol.endsWith('%') ? Math.abs(target) * parseFloat(tol) / 100 : tol); return Math.abs(v - target) <= t + 1e-12; };
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

  const CHECK = {
    mcq: (q, r) => { const c = r === q.answer; return { correct: c, score: c ? 1 : 0, detail: { chosen: r } }; },
    tf: (q, r) => { const c = r === q.answer; return { correct: c, score: c ? 1 : 0 }; },
    multi: (q, r) => { r = (r || []).slice().sort(); const ans = q.answer.slice().sort(); const hit = r.filter(x => ans.includes(x)).length, wrong = r.filter(x => !ans.includes(x)).length; const c = sameSet(r, ans); return { correct: c, score: Math.max(0, (hit - wrong) / ans.length), detail: { hit, wrong, of: ans.length } }; },
    fill: (q, r) => { r = r || []; const res = q.blanks.map((b, i) => { const v = r[i]; if (b.num != null) { const n = parseNum(v); return isFinite(n) && within(n, b.num, b.tol); } return (b.accept || []).some(a => norm(a) === norm(v)); }); const k = res.filter(Boolean).length; return { correct: k === res.length, score: k / res.length, detail: { each: res } }; },
    match: (q, r) => { r = r || {}; const res = q.pairs.map((_, i) => +r[i] === i); const k = res.filter(Boolean).length; return { correct: k === res.length, score: k / res.length, detail: { each: res } }; },
    order: (q, r) => { r = r || []; const res = q.items.map((_, i) => +r[i] === i); const k = res.filter(Boolean).length; return { correct: k === res.length, score: k / res.length, detail: { each: res } }; },
    label: (q, r) => { r = r || {}; const res = q.targets.map((t, i) => r[i] === t.label); const k = res.filter(Boolean).length; return { correct: k === res.length, score: k / res.length, detail: { each: res } }; },
    sort: (q, r) => { r = r || {}; const res = q.items.map((it, i) => r[i] === it.cat); const k = res.filter(Boolean).length; return { correct: k === res.length, score: k / res.length, detail: { each: res } }; },
    compare: (q, r) => { r = r || {}; const res = q.statements.map((s, i) => r[i] === s.ans); const k = res.filter(Boolean).length; return { correct: k === res.length, score: k / res.length, detail: { each: res } }; },
    numeric: (q, r) => { const n = parseNum(r); if (!isFinite(n)) return { correct: false, score: 0, detail: { invalid: true } }; const c = within(n, q.answer, q.tol); return { correct: c, score: c ? 1 : 0, detail: { value: n } }; },
    expr: (q, r) => { if (!String(r || '').trim()) return { correct: false, score: 0, detail: { invalid: true, error: 'empty' } }; const s = sameExpr(r, q.answer, q.vars); if (s.error) return { correct: false, score: 0, detail: { invalid: true, error: s.error } }; return { correct: s.ok, score: s.ok ? 1 : 0 }; },
    graph: (q, r) => (q.ask === 'numeric' ? CHECK.numeric(q, r) : CHECK.mcq(q, r)),
    slider: (q, r) => { const n = +r; let v; try { v = evaluate(q.compute, { p: n }); } catch (e) { return { correct: false, score: 0 }; } const c = within(v, q.target, q.tol); return { correct: c, score: c ? 1 : 0, detail: { value: v } }; },
    short: (q, r) => { const t = norm(r); const ideas = (q.ideas || []).map(alts => alts.some(a => t.includes(norm(a)))); const k = ideas.filter(Boolean).length; return { correct: null, score: ideas.length ? k / ideas.length : 0, detail: { ideas, words: t ? t.split(' ').length : 0 } }; },
    steps: (q, r) => { r = r || []; const res = q.steps.map((s, i) => { const c = CHECK[s.type](s, r[i]); return c.correct === true; }); const k = res.filter(Boolean).length; return { correct: k === res.length, score: k / res.length, detail: { each: res } }; }
  };
  function check(q, response) { const f = CHECK[q.type]; if (!f) throw new Error('unknown activity type ' + q.type); return f(q, response); }

  const api = { tokenize, parse, evaluate, sameExpr, parseNum, within, norm, check, TYPES: Object.keys(CHECK) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.LS = root.LS || {}; root.LS.grade = api; }
})(typeof window !== 'undefined' ? window : globalThis);
