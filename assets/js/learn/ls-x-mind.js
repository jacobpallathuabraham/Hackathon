/* ERLY Learning Studio — Computer science, English, languages, social science and more (v24). Ten experiences. */
(function () {
  'use strict';
  const LS = window.LS, K = LS.kit, D = LS.exp.DEFS, T = LS.T, IL = LS.inline, esc = LS.esc;
  const { fmt, clamp } = K;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const readout = host => { const r = document.createElement('p'); r.className = 'kx-read'; r.setAttribute('aria-live', 'polite'); host.appendChild(r); return r; };

  /* ============ 1 · Sorting race ============ */
  function* bubble(a) { const n = a.length; for (let i = 0; i < n; i++) { let sw = false; for (let j = 0; j < n - 1 - i; j++) { yield { c: [j, j + 1] }; if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; sw = true; yield { s: [j, j + 1] }; } } yield { done: n - 1 - i }; if (!sw) break; } }
  function* insertion(a) { for (let i = 1; i < a.length; i++) { let j = i; while (j > 0) { yield { c: [j - 1, j] }; if (a[j - 1] > a[j]) { [a[j - 1], a[j]] = [a[j], a[j - 1]]; yield { s: [j - 1, j] }; j--; } else break; } } }
  function* merge(a, lo = 0, hi = a.length) { if (hi - lo < 2) return; const mid = (lo + hi) >> 1; yield* merge(a, lo, mid); yield* merge(a, mid, hi); const L = a.slice(lo, mid), R = a.slice(mid, hi); let i = 0, j = 0, k = lo; while (i < L.length && j < R.length) { yield { c: [lo + i, mid + j] }; a[k++] = L[i] <= R[j] ? L[i++] : R[j++]; yield { w: k - 1 }; } while (i < L.length) { a[k++] = L[i++]; yield { w: k - 1 }; } while (j < R.length) { a[k++] = R[j++]; yield { w: k - 1 }; } }
  function* quick(a, lo = 0, hi = a.length - 1) { if (lo >= hi) return; const p = a[hi]; let i = lo; for (let j = lo; j < hi; j++) { yield { c: [j, hi] }; if (a[j] < p) { [a[i], a[j]] = [a[j], a[i]]; yield { s: [i, j] }; i++; } } [a[i], a[hi]] = [a[hi], a[i]]; yield { s: [i, hi] }; yield* quick(a, lo, i - 1); yield* quick(a, i + 1, hi); }
  const ALG = { bubble: ['Bubble sort', bubble, 'O(n²)'], insertion: ['Insertion sort', insertion, 'O(n²)'], merge: ['Merge sort', merge, 'O(n log n)'], quick: ['Quicksort', quick, 'O(n log n) average'] };
  D.sorting = { wide: true,
    intro: 'Watch algorithms sort the same bars. Each **comparison** lights up yellow and each **swap or write** red. Choose an algorithm, the starting order and the speed, and compare how many comparisons each needs.',
    predict: { q: 'To sort 40 random values, which needs fewer comparisons?', options: ['Bubble sort', 'Merge sort', 'They need the same', 'It depends only on luck'] },
    explore: 'Run bubble sort then merge sort on the same random data, and compare the counts. Then try both on data that is already nearly sorted.',
    explain: 'Simple sorts like **bubble** and **insertion** compare neighbouring items, so on random data they need roughly **n²/2** comparisons — 780 for 40 items. **Merge sort** splits the list in halves, sorts each and merges them, needing about **n log₂ n** comparisons — around 200. On data that is already **nearly sorted**, insertion sort is very fast (few moves needed), which is why the best algorithm depends on the data.',
    apply: [q('x-so1', 'Doubling the number of items roughly multiplies bubble sort’s work by…', ['2', '4', '8', 'no change'], 1, 'n² growth.'), q('x-so2', 'Merge sort works by…', ['swapping neighbours', 'dividing, sorting halves and merging', 'guessing', 'picking the largest each time'], 1, 'Divide and conquer.')],
    summary: ['Bubble/insertion: ~n² comparisons on random data.', 'Merge sort, quicksort: ~n log n.', 'The best choice depends on the data.'],
    build(host, c) {
      const S = K.stage(host, 800, 320); let alg = 'bubble', shape = 'random', N = 40, a = [], gen = null, hi = {}, cmp = 0, sw = 0, speed = 10, results = [], acc = 0;
      const ctl = K.controls(host, [{ k: 'chips', id: 'alg', label: T('Algorithm', 'الخوارزمية'), opts: Object.entries(ALG).map(([k, v]) => [k, v[0]]), val: 'bubble' }, { k: 'chips', id: 'shape', label: T('Start', 'البداية'), opts: [['random', T('Random', 'عشوائي')], ['nearly', T('Nearly sorted', 'شبه مرتب')], ['reversed', T('Reversed', 'معكوس')]], val: 'random' }, { k: 'range', id: 'speed', label: T('Steps per frame', 'خطوات لكل إطار'), min: 1, max: 60, step: 1, val: 10 }, { k: 'row' }, { k: 'btn', id: 'go', label: T('Sort ▸', 'رتّب ▸'), accent: true }, { k: 'btn', id: 'new', label: T('New data', 'بيانات جديدة') }, { k: 'end' }], (id, v) => { if (id === 'alg') alg = v; if (id === 'shape') { shape = v; fresh(); } if (id === 'speed') speed = v; if (id === 'new') fresh(); if (id === 'go') start(); c.onChange(); });
      const read = readout(host); let base = [];
      function fresh() { base = Array.from({ length: N }, (_, i) => i + 1); if (shape === 'random') base.sort(() => Math.random() - 0.5); if (shape === 'reversed') base.reverse(); if (shape === 'nearly') for (let k = 0; k < 4; k++) { const i = Math.floor(Math.random() * (N - 1)); [base[i], base[i + 1]] = [base[i + 1], base[i]]; } a = base.slice(); gen = null; hi = {}; cmp = sw = 0; M.draw(); }
      function start() { a = base.slice(); gen = ALG[alg][1](a); cmp = sw = 0; hi = {}; if (K.reduced()) { let r; while (!(r = gen.next()).done) count(r.value); finish(); } else M.play(); }
      function count(v) { if (v.c) cmp++; if (v.s || v.w != null) sw++; hi = v; }
      function finish() { gen = null; hi = {}; results.unshift({ alg, shape, cmp, sw }); results = results.slice(0, 6); M.pause(); M.draw(); c.onChange(); }
      const M = K.motor(c, host, dt => {
        if (gen) { acc += speed; while (acc >= 1 && gen) { acc--; const r = gen.next(); if (r.done) { finish(); break; } count(r.value); } }
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); const w = 760 / N;
        a.forEach((v, i) => { const isC = hi.c && hi.c.includes(i), isS = (hi.s && hi.s.includes(i)) || hi.w === i; G.fillStyle = isS ? Pl.red : isC ? Pl.gold : !gen && a.every((x, j) => !j || a[j - 1] <= x) ? Pl.green : Pl.blue; G.fillRect(20 + i * w + 1, 300 - v / N * 270, w - 2, v / N * 270); });
        K.text(G, `${ALG[alg][0]} · ${T('comparisons', 'مقارنات')} ${cmp} · ${T('swaps/writes', 'تبديلات')} ${sw}`, 20, 22, { w: 700 });
        read.innerHTML = IL(results.length ? results.map(r => `**${ALG[r.alg][0]}** on ${r.shape} data: ${r.cmp} comparisons, ${r.sw} swaps/writes`).join(' · ') : 'Press Sort to start.');
      });
      fresh();
      return { play: start, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); alg = 'bubble'; shape = 'random'; results = []; fresh(); }, _run: (al, sh) => { alg = al; shape = sh || 'random'; fresh(); a = base.slice(); const g = ALG[al][1](a); let r; cmp = sw = 0; while (!(r = g.next()).done) count(r.value); const out = { cmp, sw, sorted: a.every((x, j) => !j || a[j - 1] <= x) }; return out; },
        observe() { const b = results.find(r => r.alg === 'bubble' && r.shape === 'random'), m = results.find(r => r.alg === 'merge' && r.shape === 'random'); return { text: results.length ? `${results.map(r => `${ALG[r.alg][0]} (${r.shape}): **${r.cmp}** comparisons`).join('; ')}.${b && m ? ` Merge sort needed **${fmt(b.cmp / m.cmp, 1)}×** fewer comparisons than bubble sort.` : ''}` : 'Run at least one sort.', predOk: b && m ? p => p === 1 : null }; } };
    }
  };

  /* ============ 2 · Bit machine ============ */
  D.bits = { wide: true,
    intro: 'Computers store everything as **bits** — 0s and 1s. Click the eight switches of one **byte** and see the number in decimal and hexadecimal, and the character it stands for in ASCII. Then add 1 to 11111111.',
    predict: { q: 'The byte 01000001 equals the decimal number…', options: ['1', '41', '65', '100'] },
    explore: 'Make 65, then 97 (look at the characters). Find the largest number one byte can hold. Then press “+1” at 255.',
    explain: 'Each bit is worth a power of two: from the right, 1, 2, 4, 8, 16, 32, 64, 128. 01000001 = 64 + 1 = **65**, which ASCII uses for **“A”** (97 is “a”: lowercase letters are 32 higher). Eight bits hold 2⁸ = **256** values, 0 to **255**. Hexadecimal groups 4 bits per digit (65 = 0x41). Adding 1 to 255 in a single byte wraps round to 0 — an **overflow**.',
    apply: [q('x-bi1', 'Binary 1010 is decimal…', ['10', '1010', '5', '12'], 0, '8 + 2.'), q('x-bi2', 'How many different values can 8 bits represent?', ['8', '16', '255', '256'], 3, '2⁸.')],
    summary: ['Place values are powers of two.', 'One byte: 0–255; hex uses 4 bits per digit.', 'Text is stored as numbers (ASCII/Unicode); overflow wraps round.'],
    build(host, c) {
      let v = 65, ovf = 0; const made = new Set([65]);
      host.insertAdjacentHTML('beforeend', `<div class="bits"><div class="bits__row"></div><div class="bits__out"></div></div>`);
      const ctl = K.controls(host, [{ k: 'btn', id: 'inc', label: '+1' }, { k: 'btn', id: 'dec', label: '−1' }, { k: 'btn', id: 'shl', label: T('Shift left (×2)', 'إزاحة يساراً') }, { k: 'btn', id: 'not', label: T('Flip all (NOT)', 'اقلب الكل') }, { k: 'btn', id: 'z', label: T('Clear', 'صفّر') }], id => { if (id === 'inc') { if (v === 255) ovf++; v = (v + 1) & 255; } if (id === 'dec') v = (v + 255) & 255; if (id === 'shl') { if (v & 128) ovf++; v = (v << 1) & 255; } if (id === 'not') v = ~v & 255; if (id === 'z') v = 0; made.add(v); draw(); c.onChange(); });
      const read = readout(host); const row = host.querySelector('.bits__row'), out = host.querySelector('.bits__out');
      function draw() { row.innerHTML = Array.from({ length: 8 }, (_, i) => { const b = 7 - i, on = (v >> b) & 1; return `<button type="button" class="bits__b ${on ? 'is-on' : ''}" data-b="${b}" aria-pressed="${!!on}" aria-label="${T('bit worth', 'بت قيمته')} ${1 << b}"><b>${on}</b><small>${1 << b}</small></button>`; }).join('');
        const ch = v >= 32 && v < 127 ? String.fromCharCode(v) : null;
        out.innerHTML = `<div class="kx-card"><small>${T('Decimal', 'عشري')}</small><div class="kx-mono bits__big">${v}</div></div><div class="kx-card"><small>${T('Hexadecimal', 'سداسي عشر')}</small><div class="kx-mono bits__big">0x${v.toString(16).toUpperCase().padStart(2, '0')}</div></div><div class="kx-card"><small>ASCII</small><div class="kx-mono bits__big">${ch ? esc(ch) : '—'}</div></div>`;
        read.innerHTML = IL(`${Array.from({ length: 8 }, (_, i) => (v >> (7 - i)) & 1).join('')} = ${[128, 64, 32, 16, 8, 4, 2, 1].filter(p => v & p).join(' + ') || '0'} = **${v}**. ${ch ? `ASCII code ${v} is **“${ch}”**.` : v < 32 ? 'Codes below 32 are control characters, not printable.' : ''}${ovf ? ` Overflows so far: **${ovf}** (the value wrapped round).` : ''}`); }
      row.addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (!b) return; v ^= 1 << +b.dataset.b; made.add(v); draw(); row.querySelector(`[data-b="${b.dataset.b}"]`).focus(); c.onChange(); });
      draw();
      return { reset() { v = 65; ovf = 0; made.clear(); draw(); }, _set: x => { v = x; draw(); }, _v: () => v,
        observe() { return { text: `Now **${v}** (${v.toString(2).padStart(8, '0')}). You made ${made.size} different values${ovf ? ` and caused **${ovf}** overflow(s)` : ''}. 01000001 is 64 + 1 = **65**.`, predOk: p => p === 2 }; } };
    }
  };

  /* ============ 3 · Logic gates ============ */
  const GATES = { AND: (a, b) => a & b, OR: (a, b) => a | b, XOR: (a, b) => a ^ b, NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b) };
  D.logic = { wide: true,
    intro: 'A tiny circuit: two inputs, **A** and **B**, go into a first gate; its output and a third input **C** go into a second gate. Toggle the inputs, change the gates, and ERLY writes the full **truth table** for your circuit.',
    predict: { q: 'An XOR gate outputs 1 when…', options: ['both inputs are 1', 'exactly one input is 1', 'both inputs are 0', 'always'] },
    explore: 'Build a circuit whose output is 1 only when all three inputs are 1. Then one that outputs 1 when an odd number of inputs are 1.',
    explain: 'Logic gates combine binary signals. **AND** gives 1 only if both inputs are 1; **OR** if at least one is; **XOR** if exactly one is; **NAND** and **NOR** are the opposites of AND and OR. Chaining gates builds any function: (A AND B) AND C is 1 only for 1,1,1; (A XOR B) XOR C is 1 when an odd number of inputs are 1 — the basis of parity checks and of adding binary numbers. Every circuit in a processor is built from such gates.',
    apply: [q('x-lg1', 'NAND(1, 1) =', ['0', '1', '2', 'undefined'], 0, 'NOT (1 AND 1).'), q('x-lg2', 'How many rows does a truth table with 3 inputs have?', ['3', '6', '8', '9'], 2, '2³ = 8.')],
    summary: ['AND, OR, XOR, NAND, NOR.', 'Truth tables list every input combination (2ⁿ rows).', 'Gates combine into any logical function.'],
    build(host, c) {
      let A = 1, B = 0, C = 1, g1 = 'AND', g2 = 'OR'; const goals = { and3: false, odd: false };
      // v28: signals travel — gate 1 settles after a short delay, gate 2 after a longer one (propagation delay)
      const pr = K.spring(1, 2.2); let tA = 0, d1 = null, d2 = null; const kickProp = () => { pr.set(0, true); pr.set(1); M.add(pr); M.kick(); };
      const S = K.stage(host, 800, 260);
      const ctl = K.controls(host, [{ k: 'chips', id: 'g1', label: T('Gate 1', 'البوابة 1'), opts: Object.keys(GATES).map(g => [g, g]), val: 'AND' }, { k: 'chips', id: 'g2', label: T('Gate 2', 'البوابة 2'), opts: Object.keys(GATES).map(g => [g, g]), val: 'OR' }, { k: 'row' }, { k: 'btn', id: 'A', label: T('Toggle A', 'بدّل A') }, { k: 'btn', id: 'B', label: T('Toggle B', 'بدّل B') }, { k: 'btn', id: 'C', label: T('Toggle C', 'بدّل C') }, { k: 'end' }], (id, v) => { if (id === 'g1') g1 = v; if (id === 'g2') g2 = v; if (id === 'A') A ^= 1; if (id === 'B') B ^= 1; if (id === 'C') C ^= 1; kickProp(); table(); c.onChange(); });
      const tb = document.createElement('div'); host.appendChild(tb); const read = readout(host);
      const out = (a, b, cc) => GATES[g2](GATES[g1](a, b), cc);
      K.drag(S, () => [{ id: 'A', x: 60, y: 60, r: 22 }, { id: 'B', x: 60, y: 140, r: 22 }, { id: 'C', x: 60, y: 210, r: 22 }], id => { if (id === 'A') A ^= 1; if (id === 'B') B ^= 1; if (id === 'C') C ^= 1; kickProp(); table(); c.onChange(); });
      function table() { const rows = []; for (let i = 0; i < 8; i++) { const a = (i >> 2) & 1, b = (i >> 1) & 1, cc = i & 1; rows.push([a, b, cc, GATES[g1](a, b), out(a, b, cc)]); }
        const sig = rows.map(r => r[4]).join(''); if (sig === '00000001') goals.and3 = true; if (sig === '01101001') goals.odd = true;
        tb.innerHTML = `<table class="kx-tbl"><tr><th>A</th><th>B</th><th>C</th><th>${g1}(A,B)</th><th>${T('Output', 'المخرج')}</th></tr>${rows.map(r => `<tr class="${r[0] === A && r[1] === B && r[2] === C ? 'is-cur' : ''}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><b>${r[4]}</b></td></tr>`).join('')}</table>`;
        read.innerHTML = IL(`Output is 1 for **${rows.filter(r => r[4]).length} of 8** input combinations. ${goals.and3 ? '✓ You built “all three are 1”. ' : ''}${goals.odd ? '✓ You built the odd-parity circuit. ' : ''}`); }
      const M = K.motor(c, host, dt => {
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); const on = Pl.green, off = Pl.grey, n1 = GATES[g1](A, B), n2 = GATES[g2](n1, C); tA += dt || 0;
        if (d1 === null || pr.v > 0.35 || K.reduced()) d1 = n1; if (d2 === null || pr.v > 0.8 || K.reduced()) d2 = n2; const o1 = d1, o2 = d2, busy = pr.v < 0.999 && !K.reduced();
        const wire = (pts, v) => { G.strokeStyle = v ? on : off; G.lineWidth = v ? 5 : 3; G.beginPath(); pts.forEach(([x, y], i) => i ? G.lineTo(x, y) : G.moveTo(x, y)); G.stroke();
          if (v && busy) { let L0 = 0; const seg = pts.slice(1).map((q, i) => { const l = Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]); L0 += l; return [pts[i], q, l]; }); G.fillStyle = '#fff'; for (let d = (tA * 140) % 28; d < L0; d += 28) { let r = d; for (const [a0, b0, l] of seg) { if (r <= l) { G.beginPath(); G.arc(a0[0] + (b0[0] - a0[0]) * r / l, a0[1] + (b0[1] - a0[1]) * r / l, 3, 0, 7); G.fill(); break; } r -= l; } } }
          const [lx, ly] = pts[pts.length - 2]; K.text(G, String(v), lx + 8, ly - 8, { w: 800, s: 12, c: v ? on : Pl.muted }); };
        wire([[80, 60], [260, 60], [260, 85], [300, 85]], A); wire([[80, 140], [260, 140], [260, 115], [300, 115]], B); wire([[380, 100], [520, 100], [520, 125], [560, 125]], o1); wire([[80, 210], [520, 210], [520, 155], [560, 155]], C); wire([[640, 140], [700, 140]], o2);
        const gate = (x, y, name) => { G.fillStyle = Pl.bg; G.strokeStyle = Pl.ink; G.lineWidth = 2.5; K.rr(G, x, y, 80, 60, 14); G.fill(); G.stroke(); K.text(G, name, x + 40, y + 36, { a: 'center', w: 800, s: 15 }); };
        gate(300, 70, g1); gate(560, 110, g2); if (busy) K.text(G, pr.v < 0.35 ? T('signal travelling to gate 1…', 'الإشارة تنتقل إلى البوابة 1…') : pr.v < 0.8 ? T('gate 1 settled — signal travelling to gate 2…', 'البوابة 1 استقرت…') : T('output settled', 'المخرج استقر'), 400, 245, { a: 'center', s: 12, c: Pl.muted });
        [['A', 60, A], ['B', 140, B], ['C', 210, C]].forEach(([n, y, v]) => { G.fillStyle = v ? on : Pl.bg; G.strokeStyle = Pl.ink; G.lineWidth = 2; G.beginPath(); G.arc(60, y, 20, 0, 7); G.fill(); G.stroke(); K.text(G, `${n}=${v}`, 60, y + 5, { a: 'center', w: 800, c: v ? '#fff' : Pl.ink }); });
        G.fillStyle = o2 ? '#ffd84a' : Pl.bg; G.beginPath(); G.arc(730, 140, 26, 0, 7); G.fill(); G.strokeStyle = Pl.ink; G.stroke(); K.text(G, String(o2), 730, 147, { a: 'center', w: 800, s: 20 });
      });
      M.draw(); table();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); A = 1; B = 0; C = 1; g1 = 'AND'; g2 = 'OR'; goals.and3 = goals.odd = false; M.draw(); table(); }, _set: (a, b) => { g1 = a; g2 = b; table(); }, _out: out,
        observe() { return { text: `Your circuit: (A ${g1} B) ${g2} C. ${goals.and3 ? 'You made the “all three” circuit with AND, AND. ' : ''}${goals.odd ? 'You made odd parity with XOR, XOR.' : ''}`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 4 · Path finder ============ */
  D.pathfind = { wide: true,
    intro: 'Draw walls on the grid (click or drag), then let a search algorithm find a path from the green start to the red goal. Compare **breadth-first search**, which spreads out evenly, with **A***, which uses a guess of the distance to head towards the goal.',
    predict: { q: 'Compared with breadth-first search, A* usually…', options: ['finds a longer path', 'explores fewer cells to find an equally short path', 'never finds a path', 'explores every cell'] },
    explore: 'Run BFS, note the cells explored. Run A* on the same maze. Then draw a wall that blocks the direct route and compare again.',
    explain: '**Breadth-first search** explores cells in rings of increasing distance, so it always finds a **shortest** path, but it explores in every direction. **A*** ranks cells by distance so far **plus** an estimate of the distance remaining (here the Manhattan distance). Because the estimate never overestimates, A* still finds a shortest path but usually explores **far fewer** cells. Sat-navs and game characters use variations of these ideas.',
    apply: [q('x-pf1', 'BFS guarantees the shortest path on a grid with equal step costs because…', ['it is random', 'it explores in order of distance from the start', 'it goes straight', 'it uses a heuristic'], 1, 'Rings of increasing distance.'), q('x-pf2', 'A*’s heuristic should…', ['overestimate', 'never overestimate the remaining distance', 'be random', 'be zero always'], 1, 'An admissible heuristic keeps paths optimal.')],
    summary: ['BFS: explores evenly, shortest path guaranteed.', 'A*: cost so far + estimated cost to go.', 'Good heuristics cut the search.'],
    build(host, c) {
      const W = 32, H = 18, S = K.stage(host, 800, 450); const cs = 800 / W; let walls = new Set(), st = [2, 9], go = [29, 9], vis = [], path = [], steps = null, res = {}, drawing = null;
      const ctl = K.controls(host, [{ k: 'btn', id: 'bfs', label: T('Run BFS', 'شغّل BFS'), accent: true }, { k: 'btn', id: 'astar', label: T('Run A*', 'شغّل A*'), accent: true }, { k: 'btn', id: 'maze', label: T('Example walls', 'جدران مثال') }, { k: 'btn', id: 'clr', label: T('Clear walls', 'امسح الجدران') }], id => { if (id === 'bfs' || id === 'astar') run(id); if (id === 'maze') { walls = new Set(); for (let y = 2; y < 16; y++) walls.add(`15,${y}`); for (let x = 8; x < 15; x++) walls.add(`${x},2`); for (let y = 0; y < 13; y++) walls.add(`22,${y}`); vis = []; path = []; M.draw(); } if (id === 'clr') { walls = new Set(); vis = []; path = []; M.draw(); } c.onChange(); });
      const read = readout(host);
      function search(kind) { const key = p => p.join(','), start = key(st), goal = key(go), prev = { [start]: null }, g = { [start]: 0 }, order = []; const h = p => Math.abs(p[0] - go[0]) + Math.abs(p[1] - go[1]); let open = [[...st, 0]];
        while (open.length) { if (kind === 'astar') open.sort((a, b) => (g[key(a)] + h(a)) - (g[key(b)] + h(b)) || h(a) - h(b)); const cur = open.shift(), k = key(cur); order.push(k); if (k === goal) break;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const n = [cur[0] + dx, cur[1] + dy], nk = key(n); if (n[0] < 0 || n[1] < 0 || n[0] >= W || n[1] >= H || walls.has(nk) || nk in g) return; g[nk] = g[k] + 1; prev[nk] = k; open.push(n); }); }
        const p = []; let k = goal; if (k in prev) while (k) { p.unshift(k); k = prev[k]; } return { order, path: p }; }
      function run(kind) { const r = search(kind); res[kind] = { n: r.order.length, len: r.path.length ? r.path.length - 1 : null }; steps = { kind, order: r.order, path: r.path, i: 0 }; vis = []; path = []; if (K.reduced()) { vis = r.order; path = r.path; steps = null; M.draw(); } else M.play(); }
      const cell = (x, y) => [Math.floor(x / cs), Math.floor(y / cs)];
      S.cv.style.touchAction = 'none'; S.cv.addEventListener('pointerdown', e => { e.preventDefault(); const [x, y] = cell(...S.pt(e)), k = `${x},${y}`; if (k === st.join() || k === go.join()) return; drawing = walls.has(k) ? 'erase' : 'draw'; S.cv.setPointerCapture(e.pointerId); toggle(x, y); });
      S.cv.addEventListener('pointermove', e => { if (!drawing) return; toggle(...cell(...S.pt(e))); });
      S.cv.addEventListener('pointerup', () => { drawing = null; c.onChange(); });
      function toggle(x, y) { const k = `${x},${y}`; if (x < 0 || y < 0 || x >= W || y >= H || k === st.join() || k === go.join()) return; if (drawing === 'draw') walls.add(k); else walls.delete(k); vis = []; path = []; M.draw(); }
      const M = K.motor(c, host, () => {
        if (steps) { const n = Math.max(2, Math.ceil(steps.order.length / 90)); for (let i = 0; i < n && steps.i < steps.order.length; i++) vis.push(steps.order[steps.i++]); if (steps.i >= steps.order.length) { path = steps.path; steps = null; M.pause(); } }
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg);
        vis.forEach((k, i) => { const [x, y] = k.split(',').map(Number); G.fillStyle = `hsla(${200 + i / Math.max(1, vis.length) * 60}, 70%, 60%, .45)`; G.fillRect(x * cs, y * cs, cs, cs); });
        walls.forEach(k => { const [x, y] = k.split(',').map(Number); G.fillStyle = Pl.ink; G.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2); });
        if (path.length) { G.strokeStyle = Pl.gold; G.lineWidth = 6; G.lineCap = 'round'; G.beginPath(); path.forEach((k, i) => { const [x, y] = k.split(',').map(Number); i ? G.lineTo(x * cs + cs / 2, y * cs + cs / 2) : G.moveTo(x * cs + cs / 2, y * cs + cs / 2); }); G.stroke(); }
        G.strokeStyle = Pl.line; G.lineWidth = 0.5; for (let x = 0; x <= W; x++) { G.beginPath(); G.moveTo(x * cs, 0); G.lineTo(x * cs, H * cs); G.stroke(); } for (let y = 0; y <= H; y++) { G.beginPath(); G.moveTo(0, y * cs); G.lineTo(800, y * cs); G.stroke(); }
        G.fillStyle = Pl.green; G.fillRect(st[0] * cs + 2, st[1] * cs + 2, cs - 4, cs - 4); G.fillStyle = Pl.red; G.fillRect(go[0] * cs + 2, go[1] * cs + 2, cs - 4, cs - 4);
        read.innerHTML = IL(['bfs', 'astar'].filter(k => res[k]).map(k => `**${k === 'bfs' ? 'BFS' : 'A*'}**: explored ${res[k].n} cells, path length ${res[k].len == null ? 'no path' : res[k].len}`).join(' · ') || 'Draw some walls (optional), then run a search.');
      });
      M.draw();
      return { play() { run('astar'); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { walls = new Set(); vis = []; path = []; res = {}; M.draw(); }, _search: search, _maze: () => ctl,
        observe() { return { text: res.bfs && res.astar ? `BFS explored **${res.bfs.n}** cells, A* explored **${res.astar.n}**; both found a path of length **${res.astar.len}**.` : 'Run both BFS and A* on the same walls.', predOk: res.bfs && res.astar ? p => p === 1 : null }; } };
    }
  };

  /* ============ 5 · Punctuation changes meaning ============ */
  const PUN = [{ a: 'Let’s eat, Grandma!', b: 'Let’s eat Grandma!', ma: 'You are inviting Grandma to eat with you.', mb: 'You are proposing to eat Grandma.', rule: 'A comma before a name you are speaking to (the vocative comma).' },
    { a: 'The panda eats shoots and leaves.', b: 'The panda eats, shoots and leaves.', ma: 'The panda eats bamboo shoots and leaves (nouns).', mb: 'The panda eats, then fires a gun, then departs (verbs).', rule: 'Commas separate actions in a list; without them the words read as one object.' },
    { a: 'The students, who passed, celebrated.', b: 'The students who passed celebrated.', ma: 'All the students passed, and they all celebrated (extra information).', mb: 'Only the students who passed celebrated (identifying information).', rule: 'Commas around a relative clause make it non-essential extra information.' },
    { a: 'I’m sorry you were hurt.', b: 'I’m sorry you were hurt?', ma: 'A statement of sympathy.', mb: 'Doubt or surprise that the person was hurt.', rule: 'End punctuation sets the tone: statement versus question.' },
    { a: 'My sister’s friends’ books.', b: 'My sisters’ friend’s books.', ma: 'Books belonging to several friends of one sister.', mb: 'Books belonging to one friend of several sisters.', rule: 'Apostrophe before s = one owner; after s = several owners.' }];
  D.punctuation = { wide: true,
    intro: 'Each sentence below can be punctuated two ways. **Toggle** the punctuation and watch the meaning change. Then match each change to the rule that explains it.',
    predict: { q: '“Let’s eat Grandma!” without a comma means…', options: ['inviting Grandma to dinner', 'proposing to eat Grandma', 'the same as with a comma', 'nothing'] },
    explore: 'Toggle each sentence and read both meanings. Which mark makes the biggest difference?',
    explain: 'Punctuation is not decoration: it **changes grammar**, and so meaning. A **vocative comma** marks the person you are addressing. **Commas in lists** separate items or actions. Commas around a **relative clause** mark extra, non-essential information. **End marks** set the type of sentence. The position of an **apostrophe** shows whether there is one owner or several.',
    apply: [q('x-pn1', '“The students who passed celebrated” means…', ['all students celebrated', 'only those who passed celebrated', 'no one passed', 'the same as with commas'], 1, 'Identifying (restrictive) clause.'), q('x-pn2', '“The girls’ coats” refers to…', ['one girl', 'several girls', 'a girl called Girls', 'one coat'], 1, 'Apostrophe after s: plural owners.')],
    summary: ['Vocative comma: addressing someone.', 'Commas around relative clauses: extra information.', 'Apostrophe position: one owner or many.'],
    build(host, c) {
      const st = PUN.map(() => 0), seen = PUN.map(() => new Set([0]));
      host.insertAdjacentHTML('beforeend', `<div class="pun">${PUN.map((p, i) => `<article class="pun__c" data-i="${i}"><button type="button" class="pun__s" aria-pressed="false" aria-label="${T('Toggle punctuation', 'بدّل علامات الترقيم')}">${esc(p.a)}</button><p class="pun__m"></p><details><summary>${T('Why?', 'لماذا؟')}</summary><p>${esc(p.rule)}</p></details></article>`).join('')}</div>`);
      const read = readout(host);
      function draw() { host.querySelectorAll('.pun__c').forEach((el, i) => { const p = PUN[i], s = st[i]; const btn = el.querySelector('.pun__s'); btn.textContent = s ? p.b : p.a; btn.setAttribute('aria-pressed', String(!!s)); el.querySelector('.pun__m').innerHTML = IL(`**${T('Meaning', 'المعنى')}:** ${s ? p.mb : p.ma}`); el.classList.toggle('is-alt', !!s); });
        read.innerHTML = IL(`You have seen both versions of **${seen.filter(x => x.size === 2).length} of ${PUN.length}** sentences.`); }
      host.querySelector('.pun').addEventListener('click', e => { const b = e.target.closest('.pun__s'); if (!b) return; const i = +b.closest('[data-i]').dataset.i; st[i] ^= 1; seen[i].add(st[i]); draw(); c.onChange(); });
      draw();
      return { reset() { st.fill(0); seen.forEach(s => { s.clear(); s.add(0); }); draw(); }, observe() { const n = seen.filter(x => x.size === 2).length; return { text: `You compared both versions of **${n}** sentence(s). Without the comma, “Let’s eat Grandma!” proposes eating her.`, predOk: seen[0].size === 2 ? p => p === 1 : null }; } };
    }
  };

  /* ============ 6 · Word builder (morphology) ============ */
  const PRE = [['', '—'], ['un', 'not'], ['re', 'again'], ['dis', 'opposite of'], ['pre', 'before'], ['mis', 'wrongly'], ['in', 'not']], ROOT = [['believe', 'think true', 'v'], ['visible', 'able to be seen', 'adj'], ['agree', 'share an opinion', 'v'], ['view', 'look at', 'v'], ['use', 'employ', 'v'], ['able', 'having the power', 'adj'], ['read', 'look at and understand words', 'v']], SUF = [['', '—'], ['able', 'able to be ___ed'], ['ment', 'the act or result of'], ['er', 'a person or thing that ___s'], ['ful', 'full of'], ['ly', 'in a ___ way'], ['ity', 'the state of being']];
  const VALID = { unbelievable: 1, believable: 1, believer: 1, invisible: 1, invisibly: 1, visibly: 1, visibility: 1, invisibility: 1, disagree: 1, disagreement: 1, agreement: 1, agreeable: 1, disagreeable: 1, preview: 1, review: 1, reviewer: 1, viewer: 1, misuse: 1, reuse: 1, reusable: 1, useful: 1, user: 1, usable: 1, unusable: 1, unable: 1, ability: 1, inability: 1, disability: 1, reread: 1, reader: 1, readable: 1, unreadable: 1, misread: 1, preread: 0, misbelieve: 0, disbelieve: 1, unagreeable: 0 };
  const glue = (r, s) => { if (!s) return r; if (r === 'able' && s === 'ity') return 'ability'; if (r === 'visible' && s === 'ly') return 'visibly'; if (r === 'visible' && s === 'ity') return 'visibility'; if (/e$/.test(r) && /^(able|er|ity)$/.test(s) && r !== 'agree') return r.slice(0, -1) + s; if (r === 'agree' && s === 'er') return 'agreer'; return r + s; };
  D.morphology = { wide: true,
    intro: 'Most long English words are built from smaller parts: a **prefix**, a **root**, and a **suffix**. Pick parts and see whether they make a real word — and how its meaning comes from its parts.',
    predict: { q: 'The prefix “dis-” usually means…', options: ['again', 'not / the opposite of', 'before', 'full of'] },
    explore: 'Build “unbelievable”, then “disagreement”, then “misuse”. Find a combination that is not a real word, and think about why.',
    explain: 'A **root** carries the core meaning; **prefixes** (un-, dis-, re-, pre-, mis-) change meaning; **suffixes** often change the **word class** (-ment makes a noun, -able an adjective, -ly an adverb). Spelling sometimes adjusts at the join (believe + able → believable, dropping the e). Knowing parts helps you work out unfamiliar words. Not every combination is used, so check a dictionary — this tool checks against a small built-in list.',
    apply: [q('x-mo1', 'In “disagreement”, the suffix -ment turns the word into…', ['a verb', 'a noun', 'an adjective', 'an adverb'], 1, 'agree (verb) → agreement (noun).'), q('x-mo2', '“Preview” means…', ['view again', 'view before', 'not view', 'view wrongly'], 1, 'pre- = before.')],
    summary: ['Prefix + root + suffix.', 'Prefixes change meaning; suffixes often change word class.', 'Spelling can change at the join.'],
    build(host, c) {
      let p = 1, r = 0, s = 1; const found = new Set();
      host.insertAdjacentHTML('beforeend', `<div class="mor"><div class="mor__word" aria-live="polite"></div><div class="mor__cols">${[['p', T('Prefix', 'بادئة'), PRE], ['r', T('Root', 'جذر'), ROOT], ['s', T('Suffix', 'لاحقة'), SUF]].map(([k, n, L]) => `<div><h3 class="at-h3">${n}</h3><div class="mor__list" role="radiogroup" aria-label="${n}">${L.map((x, i) => `<button type="button" class="kx-card" role="radio" data-${k}="${i}">${x[0] || '(none)'}</button>`).join('')}</div></div>`).join('')}</div></div>`);
      const read = readout(host);
      function draw() { host.querySelectorAll('[data-p]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.p === p))); host.querySelectorAll('[data-r]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.r === r))); host.querySelectorAll('[data-s]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.s === s)));
        const w = PRE[p][0] + glue(ROOT[r][0], SUF[s][0]), ok = VALID[w] === 1 || (!PRE[p][0] && !SUF[s][0]); if (ok) found.add(w);
        host.querySelector('.mor__word').innerHTML = `<span class="mor__pre">${PRE[p][0]}</span><span class="mor__root">${glue(ROOT[r][0], SUF[s][0]).slice(0, SUF[s][0] ? undefined : undefined)}</span> <span class="mor__ok ${ok ? 'is-ok' : 'is-no'}">${ok ? '✓' : '?'}</span>`;
        read.innerHTML = IL(`**${w}** — ${PRE[p][0] ? `*${PRE[p][0]}-* (${PRE[p][1]}) + ` : ''}*${ROOT[r][0]}* (${ROOT[r][1]})${SUF[s][0] ? ` + *-${SUF[s][0]}* (${SUF[s][1]})` : ''}. ${ok ? 'A real English word.' : 'Not in ERLY’s word list — it may not be standard English.'} Words found: ${found.size}.`); }
      host.querySelector('.mor').addEventListener('click', e => { const b = e.target.closest('[data-p],[data-r],[data-s]'); if (!b) return; if (b.dataset.p) p = +b.dataset.p; if (b.dataset.r) r = +b.dataset.r; if (b.dataset.s) s = +b.dataset.s; draw(); c.onChange(); });
      draw();
      return { reset() { p = 1; r = 0; s = 1; found.clear(); draw(); }, _word: () => PRE[p][0] + glue(ROOT[r][0], SUF[s][0]), _pick: (a, b, d) => { p = a; r = b; s = d; draw(); },
        observe() { return { text: `You built **${found.size}** real word(s): ${[...found].slice(0, 8).join(', ')}.`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 7 · Verb conjugator (regular verbs, present tense) ============ */
  const CONJ = { fr: { name: 'French', pron: ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'], groups: { er: ['e', 'es', 'e', 'ons', 'ez', 'ent'], ir: ['is', 'is', 'it', 'issons', 'issez', 'issent'], re: ['s', 's', '', 'ons', 'ez', 'ent'] }, verbs: [['parler', 'to speak'], ['aimer', 'to like / love'], ['finir', 'to finish'], ['choisir', 'to choose'], ['vendre', 'to sell'], ['attendre', 'to wait (for)']] },
    es: { name: 'Spanish', pron: ['yo', 'tú', 'él / ella', 'nosotros', 'vosotros', 'ellos / ellas'], groups: { ar: ['o', 'as', 'a', 'amos', 'áis', 'an'], er: ['o', 'es', 'e', 'emos', 'éis', 'en'], ir: ['o', 'es', 'e', 'imos', 'ís', 'en'] }, verbs: [['hablar', 'to speak'], ['estudiar', 'to study'], ['comer', 'to eat'], ['beber', 'to drink'], ['vivir', 'to live'], ['escribir', 'to write']] } };
  D.conjugate = { wide: true,
    intro: 'Regular verbs follow patterns. Choose a language and a verb; ERLY splits it into **stem + ending** for every person, so you can see the pattern — then test yourself.',
    predict: { q: 'French “parler” (to speak) with “nous” becomes…', options: ['nous parle', 'nous parlons', 'nous parlez', 'nous parlent'] },
    explore: 'Compare an -er and an -ir verb in French. In Spanish, compare hablar, comer and vivir: which endings are shared? Then try the quiz.',
    explain: 'For a regular verb, remove the infinitive ending (-er, -ir, -re; -ar, -er, -ir) to find the **stem**, then add the ending for each person. French -er: je parl**e**, nous parl**ons**, vous parl**ez**, ils parl**ent** (the -e, -es, -ent endings are silent). Spanish -ar: habl**o**, habl**as**, habl**a**, habl**amos**, habl**áis**, habl**an**. Irregular verbs (être, ser, ir…) do not follow these patterns and must be learned separately.',
    apply: [q('x-cj1', 'Spanish “vivir” with “nosotros” is…', ['vivemos', 'vivimos', 'vivamos', 'vivís'], 1, '-ir verbs: -imos.'), q('x-cj2', 'French “finir” with “ils” is…', ['ils finent', 'ils finissent', 'ils finons', 'ils finis'], 1, '-ir verbs add -issent.')],
    summary: ['Stem + ending for each person.', 'French -er/-ir/-re; Spanish -ar/-er/-ir patterns.', 'Irregular verbs must be learned separately.'],
    build(host, c) {
      let lang = 'fr', vi = 0, quiz = null, score = [0, 0];
      host.insertAdjacentHTML('beforeend', '<div class="cj"></div>'); const box = host.querySelector('.cj');
      const ctl = K.controls(host, [{ k: 'chips', id: 'lang', label: T('Language', 'اللغة'), opts: [['fr', 'Français'], ['es', 'Español']], val: 'fr' }, { k: 'row' }, { k: 'btn', id: 'quiz', label: T('Quiz me', 'اختبرني'), accent: true }, { k: 'end' }], (id, v) => { if (id === 'lang') { lang = v; vi = 0; quiz = null; } if (id === 'quiz') newQ(); draw(); c.onChange(); });
      const read = readout(host);
      const forms = (L, v) => { const ending = v.slice(-2), stem = v.slice(0, -2), E = CONJ[L].groups[ending]; return CONJ[L].pron.map((p, i) => [p, stem, E[i]]); };
      const elide = (p, w) => p === 'je' && /^[aeiouéh]/.test(w) ? 'j’' : p + ' ';
      function newQ() { const L = CONJ[lang], v = L.verbs[Math.floor(Math.random() * L.verbs.length)][0], i = Math.floor(Math.random() * 6), f = forms(lang, v)[i]; quiz = { v, i, ans: f[1] + f[2], pron: f[0] }; }
      function draw() { const L = CONJ[lang], [v, gl] = L.verbs[vi];
        box.innerHTML = `<div class="cj__verbs">${L.verbs.map(([x, g], i) => `<button type="button" class="kx-card ${i === vi ? 'is-on' : ''}" data-v="${i}"><b>${x}</b><small> ${g}</small></button>`).join('')}</div>
          <table class="kx-tbl cj__t"><tr><th colspan="2">${esc(v)} — ${esc(gl)} (${T('present', 'المضارع')})</th></tr>${forms(lang, v).map(([p, s, e]) => `<tr><td>${esc(p)}</td><td class="cj__f"><span>${esc(s)}</span><b>${esc(e)}</b></td></tr>`).join('')}</table>
          ${quiz ? `<div class="cj__q"><label>${T('Write the form', 'اكتب الصيغة')}: <b>${esc(quiz.pron)}</b> + <b>${esc(quiz.v)}</b> → <input class="kx-input" data-a autocomplete="off" spellcheck="false"></label> <button type="button" class="ls-btn ls-btn--sm" data-chk>${T('Check', 'تحقق')}</button><p class="cj__fb" aria-live="polite"></p></div>` : ''}`;
        read.innerHTML = IL(`**${v}**: stem **${v.slice(0, -2)}-**, ${v.slice(-2)} verb. ${score[1] ? `Quiz: ${score[0]} of ${score[1]} right.` : ''}`); }
      box.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { vi = +b.dataset.v; draw(); c.onChange(); return; } if (e.target.closest('[data-chk]')) check(); });
      box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-a]')) check(); });
      function check() { const inp = box.querySelector('[data-a]'), a = inp.value.trim().toLowerCase().replace(/^(je|j’|j'|tu|il|elle|nous|vous|ils|elles|yo|tú|tu|él|el|ella|nosotros|vosotros|ellos|ellas)\s+/, ''), ok = a === quiz.ans; score[1]++; if (ok) score[0]++;
        box.querySelector('.cj__fb').innerHTML = IL(ok ? `✓ **${elide(quiz.pron.split(' ')[0], quiz.ans)}${quiz.ans}**` : `Not quite: **${elide(quiz.pron.split(' ')[0], quiz.ans)}${quiz.ans}** (stem ${quiz.v.slice(0, -2)} + ending).`); setTimeout(() => { newQ(); draw(); box.querySelector('[data-a]')?.focus(); }, ok ? 900 : 2200); c.onChange(); }
      draw();
      return { reset() { ctl.reset(); lang = 'fr'; vi = 0; quiz = null; score = [0, 0]; draw(); }, _forms: forms,
        observe() { return { text: `Quiz: **${score[0]} of ${score[1]}** right. “nous parlons”: stem parl- + -ons.`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 8 · Market maker (supply and demand) ============ */
  D.market = { wide: true,
    intro: 'A market for coffee. The **demand** curve shows how much buyers want at each price; the **supply** curve how much sellers offer. Shift them with real-world changes and watch the **equilibrium** price and quantity move. Then try a price ceiling.',
    predict: { q: 'Coffee becomes more popular (demand increases). In equilibrium, price and quantity…', options: ['both rise', 'price rises, quantity falls', 'both fall', 'nothing changes'] },
    explore: 'Raise demand. Reset, then raise production costs (supply falls). Then set a price ceiling below equilibrium and look for the shortage.',
    explain: 'The market settles where quantity demanded equals quantity supplied — the **equilibrium**. If **demand increases**, the curve shifts right: **price and quantity both rise**. If **supply decreases** (higher costs), price rises but quantity falls. A **price ceiling** set below equilibrium makes sellers supply less while buyers want more, creating a **shortage**. Here demand is Q = 100 − 2P + shift and supply is Q = −20 + 3P − cost shift, simple straight-line curves.',
    apply: [q('x-mk1', 'If supply increases with demand unchanged, the price…', ['rises', 'falls', 'is unchanged', 'becomes zero'], 1, 'More offered at every price.'), q('x-mk2', 'A price ceiling below equilibrium causes…', ['a surplus', 'a shortage', 'no effect', 'higher prices'], 1, 'Quantity demanded exceeds supplied.')],
    summary: ['Equilibrium: quantity demanded = quantity supplied.', 'Demand up → P and Q up; supply down → P up, Q down.', 'Price ceiling below equilibrium → shortage.'],
    build(host, c) {
      const S = K.stage(host, 800, 400), sd = K.spring(0), ss = K.spring(0), sc = K.spring(60, 10); let ceil = 0, hist = [];
      const ctl = K.controls(host, [{ k: 'range', id: 'd', label: T('Demand shift (popularity, income)', 'تحول الطلب'), min: -30, max: 30, step: 1, val: 0 }, { k: 'range', id: 's', label: T('Production costs (shift supply)', 'تكاليف الإنتاج'), min: -20, max: 30, step: 1, val: 0 }, { k: 'row' }, { k: 'toggle', id: 'ceil', label: T('Price ceiling', 'سقف سعري'), val: false }, { k: 'range', id: 'cv', label: T('Ceiling price', 'السعر الأقصى'), min: 5, max: 40, step: 1, val: 18 }, { k: 'end' }], (id, v) => { if (id === 'd') sd.set(v); if (id === 's') ss.set(v); if (id === 'ceil') ceil = v ? ctl.val.cv : 0; if (id === 'cv' && ceil) ceil = v; M.kick(); c.onChange(); });
      const read = readout(host);
      const Qd = (P, d) => 100 - 2 * P + d, Qs = (P, s) => -20 + 3 * P - s * 1.5;
      const eq = (d, s) => { const P = (120 + d + s * 1.5) / 5; return [P, Qd(P, d)]; };
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g, d = sd.v, s = ss.v; S.clear(Pl.bg2); const A = K.axes(G, [60, 20, 700, 340], [0, 140], [0, 60], { xl: T('quantity', 'الكمية'), yl: T('price', 'السعر'), ticks: 7 });
        const line = (f, col, lab) => { G.strokeStyle = col; G.lineWidth = 3.5; G.beginPath(); let st = false; for (let P = 0; P <= 60; P += 0.5) { const Q = f(P); if (Q < 0 || Q > 140) { st = false; continue; } st ? G.lineTo(A.X(Q), A.Y(P)) : (G.moveTo(A.X(Q), A.Y(P)), st = true); } G.stroke(); };
        G.globalAlpha = 0.25; line(P => Qd(P, 0), Pl.blue); line(P => Qs(P, 0), Pl.red); G.globalAlpha = 1; line(P => Qd(P, d), Pl.blue); line(P => Qs(P, s), Pl.red);
        K.tag(G, T('Demand', 'الطلب'), A.X(Qd(8, d)), A.Y(8), Pl.blue); K.tag(G, T('Supply', 'العرض'), A.X(Math.min(135, Qs(50, s))), A.Y(50), Pl.red);
        const [P, Q] = eq(d, s); G.setLineDash([4, 4]); G.strokeStyle = Pl.muted; G.beginPath(); G.moveTo(A.X(0), A.Y(P)); G.lineTo(A.X(Q), A.Y(P)); G.lineTo(A.X(Q), A.Y(0)); G.stroke(); G.setLineDash([]); G.fillStyle = Pl.ink; G.beginPath(); G.arc(A.X(Q), A.Y(P), 8, 0, 7); G.fill(); K.tag(G, `P = ${fmt(P, 1)}, Q = ${fmt(Q, 1)}`, A.X(Q) + 80, A.Y(P) - 18, Pl.ink);
        let note = '';
        if (ceil) { G.strokeStyle = Pl.gold; G.lineWidth = 3; G.beginPath(); G.moveTo(A.X(0), A.Y(ceil)); G.lineTo(A.X(140), A.Y(ceil)); G.stroke(); const qd = Qd(ceil, d), qs = Math.max(0, Qs(ceil, s)); if (ceil < P) { G.fillStyle = 'rgba(210,58,42,.25)'; G.fillRect(A.X(qs), A.Y(ceil) - 8, A.X(qd) - A.X(qs), 16); K.tag(G, `${T('shortage', 'نقص')} ${fmt(qd - qs, 1)}`, (A.X(qs) + A.X(qd)) / 2, A.Y(ceil) - 20, Pl.red); note = ` Price ceiling ${ceil}: buyers want ${fmt(qd, 1)} but sellers offer ${fmt(qs, 1)} — **shortage of ${fmt(qd - qs, 1)}**.`; } else note = ` The ceiling (${ceil}) is above equilibrium, so it has no effect.`; }
        read.innerHTML = IL(`Equilibrium price **${fmt(P, 1)}**, quantity **${fmt(Q, 1)}** (started at P = 24.0, Q = 52.0).${note}`);
      }).add(sd, ss, sc);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); sd.set(0, true); ss.set(0, true); ceil = 0; M.draw(); }, _eq: eq,
        observe() { const [P, Q] = eq(ctl.val.d, ctl.val.s); return { text: `With demand shift ${ctl.val.d} and cost shift ${ctl.val.s}: P = **${fmt(P, 1)}**, Q = **${fmt(Q, 1)}** (from 24.0 and 52.0).${ctl.val.d > 0 && !ctl.val.s ? ' Higher demand raised **both** price and quantity.' : ''}`, predOk: ctl.val.d > 0 && !ctl.val.s ? p => p === 0 : null }; } };
    }
  };

  /* ============ 9 · Growing money (simple vs compound interest) ============ */
  D.compound = { wide: true,
    intro: 'Put money in a savings account. With **simple interest** you earn the same amount every year; with **compound interest** you also earn interest on your interest. Change the rate, the years and how often it compounds.',
    predict: { q: '£1,000 at 10% a year for 20 years: compound interest gives roughly ___ simple interest.', options: ['the same as', 'twice as much as', 'a little more than', 'less than'] },
    explore: 'Compare simple and compound at 5% for 10 years, then for 40 years. Then try monthly compounding.',
    explain: 'Simple interest: **A = P(1 + rt)** — a straight line. Compound interest: **A = P(1 + r/n)^(nt)** — a curve that bends upwards, because each year’s interest is added before the next is calculated. Over short periods the two are close; over long periods compound growth dominates (£1,000 at 10% for 20 years: £3,000 simple, £6,727 compound — more than double). The **rule of 72** estimates doubling time: 72 ÷ rate. The same maths works against you on debts.',
    apply: [q('x-ci1', 'At 6% compound interest, money roughly doubles in…', ['6 years', '12 years', '20 years', '72 years'], 1, 'Rule of 72: 72 ÷ 6.'), q('x-ci2', 'Compound interest grows faster because…', ['the rate rises', 'interest is earned on previous interest', 'the bank adds bonuses', 'it is simple'], 1, 'Interest on interest.')],
    summary: ['Simple: A = P(1 + rt), straight line.', 'Compound: A = P(1 + r/n)^(nt), curves upwards.', 'Rule of 72 for doubling time.'],
    build(host, c) {
      const S = K.stage(host, 800, 360), sr = K.spring(5), sy = K.spring(30); let n = 1, P0 = 1000;
      const ctl = K.controls(host, [{ k: 'range', id: 'r', label: T('Annual rate', 'المعدل السنوي'), min: 0.5, max: 15, step: 0.5, val: 5, d: 1, unit: '%' }, { k: 'range', id: 'y', label: T('Years', 'السنوات'), min: 1, max: 50, step: 1, val: 30 }, { k: 'chips', id: 'n', label: T('Compounding', 'التركيب'), opts: [[1, T('yearly', 'سنوياً')], [12, T('monthly', 'شهرياً')]], val: 1 }], (id, v) => { if (id === 'r') sr.set(v); if (id === 'y') sy.set(v); if (id === 'n') n = v; M.kick(); c.onChange(); });
      const read = readout(host);
      const comp = (r, t) => P0 * Math.pow(1 + r / 100 / n, n * t), simp = (r, t) => P0 * (1 + r / 100 * t);
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g, r = sr.v, Y = sy.v; S.clear(Pl.bg2); const top = comp(r, Y) * 1.1;
        const A = K.axes(G, [70, 20, 700, 300], [0, Y], [0, top], { xl: T('years', 'سنوات'), yl: '£', ticks: 6 });
        K.plot(G, A, t => simp(r, t), 0, Y, Pl.blue, 3); K.plot(G, A, t => comp(r, t), 0, Y, Pl.green, 3.5);
        G.fillStyle = Pl.green; G.globalAlpha = 0.12; G.beginPath(); for (let t = 0; t <= Y; t += Y / 100) G.lineTo(A.X(t), A.Y(comp(r, t))); for (let t = Y; t >= 0; t -= Y / 100) G.lineTo(A.X(t), A.Y(simp(r, t))); G.fill(); G.globalAlpha = 1;
        K.tag(G, `${T('compound', 'مركب')} £${fmt(comp(r, Y), 0)}`, A.X(Y) - 80, A.Y(comp(r, Y)) + 16, Pl.green); K.tag(G, `${T('simple', 'بسيط')} £${fmt(simp(r, Y), 0)}`, A.X(Y) - 80, A.Y(simp(r, Y)) + 16, Pl.blue);
        const dbl = Math.log(2) / (n * Math.log(1 + r / 100 / n)); if (dbl < Y) { G.setLineDash([3, 4]); G.strokeStyle = Pl.muted; G.beginPath(); G.moveTo(A.X(dbl), A.Y(0)); G.lineTo(A.X(dbl), A.Y(2000)); G.stroke(); G.setLineDash([]); K.tag(G, `×2 ${T('at', 'عند')} ${fmt(dbl, 1)} y`, A.X(dbl), A.Y(2000) - 14, Pl.muted); }
        read.innerHTML = IL(`£1,000 at **${fmt(r, 1)}%** for **${Math.round(Y)} years** (${n === 1 ? 'yearly' : 'monthly'}): simple **£${fmt(simp(r, Y), 2)}**, compound **£${fmt(comp(r, Y), 2)}** — ${fmt(comp(r, Y) / simp(r, Y), 2)}× as much. Doubles in **${fmt(dbl, 1)} years** (rule of 72: ${fmt(72 / r, 1)}).`);
      }).add(sr, sy);
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); n = 1; sr.set(5, true); sy.set(30, true); M.draw(); }, _comp: comp,
        observe() { const r = ctl.val.r, y = ctl.val.y; return { text: `At ${fmt(r, 1)}% for ${y} years: simple £${fmt(simp(r, y), 0)}, compound £${fmt(comp(r, y), 0)}. At 10% for 20 years (yearly) compound gives **£${fmt(1000 * Math.pow(1.1, 20), 0)}** versus £3,000 — more than double.`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 10 · Forgetting and spacing ============ */
  D['memory-curve'] = { wide: true,
    intro: 'A simplified model of memory: after you learn something, how much you can recall falls over time (a **forgetting curve**). Each **review** restores recall and makes it fade more slowly. Place reviews on the timeline and see the effect over 30 days.',
    predict: { q: 'Four reviews spread out (day 1, 3, 7, 14) compared with four reviews all on day 1…', options: ['give the same recall at day 30', 'give much better recall at day 30', 'give worse recall', 'make no difference to forgetting'] },
    explore: 'Try “cram” (all reviews on day 1) and then “spaced”. Compare predicted recall at day 30. Then design your own schedule by clicking the timeline.',
    explain: 'In this model recall decays as **R = e^(−t/S)**, where S is the memory’s **stability**. Each review resets recall to 100% and multiplies stability — more so when the review comes after some forgetting has happened (the **spacing effect**). Cramming gives high recall now but little gain in stability; spaced reviews build stability, so recall lasts. Research consistently supports **spaced** and **retrieval** practice, but the numbers here are illustrative, not a prediction for any individual.',
    apply: [q('x-mc1', 'The spacing effect says reviews are most effective when…', ['all at once', 'spread out over time', 'only before an exam', 'never repeated'], 1, 'Spaced practice builds durable memory.'), q('x-mc2', 'This model’s numbers are…', ['an exact prediction for you', 'illustrative of a general pattern', 'measured from your brain', 'random'], 1, 'A teaching model, not a measurement.')],
    summary: ['Without review, recall fades.', 'Spaced reviews build stability.', 'Model numbers are illustrative.'],
    build(host, c) {
      const S = K.stage(host, 800, 340); let rev = [1, 3, 7, 14]; const tried = new Set();
      const ctl = K.controls(host, [{ k: 'chips', id: 'pre', label: T('Schedules', 'الجداول'), opts: [['none', T('No reviews', 'بلا مراجعة')], ['cram', T('Cram (4 on day 1)', 'حشو')], ['spaced', T('Spaced (1, 3, 7, 14)', 'متباعد')]], val: 'spaced' }, { k: 'btn', id: 'clr', label: T('Clear reviews', 'امسح') }], (id, v) => { if (id === 'pre') rev = v === 'none' ? [] : v === 'cram' ? [1, 1.1, 1.2, 1.3] : [1, 3, 7, 14]; if (id === 'clr') rev = []; tried.add(JSON.stringify(rev)); M.draw(); c.onChange(); });
      const read = readout(host);
      function curve() { const pts = []; let S0 = 1.5, last = 0; const rs = rev.slice().sort((a, b) => a - b); let ri = 0;
        for (let t = 0; t <= 30.0001; t += 0.05) { while (ri < rs.length && rs[ri] <= t) { const R = Math.exp(-(rs[ri] - last) / S0); S0 = S0 * (1 + 2.2 * (1 - R) + 0.15); last = rs[ri]; ri++; } pts.push([t, Math.exp(-(t - last) / S0)]); } return pts; }
      const R30 = () => curve().slice(-1)[0][1];
      let A0 = null; S.cv.addEventListener('click', e => { if (!A0) return; const [x] = S.pt(e), t = Math.round(A0.IX(x) * 2) / 2; if (t <= 0 || t > 30) return; const i = rev.findIndex(r => Math.abs(r - t) < 0.4); if (i >= 0) rev.splice(i, 1); else rev.push(t); tried.add(JSON.stringify(rev)); M.draw(); c.onChange(); });
      const M = K.motor(c, host, () => {
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2); A0 = K.axes(G, [60, 20, 720, 280], [0, 30], [0, 1.05], { xl: T('days', 'أيام'), yl: T('recall', 'التذكر'), xstep: 5, ystep: 0.25 });
        const pts = curve(); G.strokeStyle = Pl.violet; G.lineWidth = 3; G.beginPath(); pts.forEach(([t, r], i) => i ? G.lineTo(A0.X(t), A0.Y(r)) : G.moveTo(A0.X(t), A0.Y(r))); G.stroke();
        G.globalAlpha = 0.3; G.strokeStyle = Pl.grey; G.setLineDash([4, 4]); G.beginPath(); for (let t = 0; t <= 30; t += 0.2) { const r = Math.exp(-t / 1.5); t ? G.lineTo(A0.X(t), A0.Y(r)) : G.moveTo(A0.X(t), A0.Y(r)); } G.stroke(); G.setLineDash([]); G.globalAlpha = 1;
        rev.forEach(t => { G.fillStyle = Pl.gold; G.beginPath(); G.moveTo(A0.X(t), A0.Y(1.03)); G.lineTo(A0.X(t) - 6, A0.Y(1.03) - 10); G.lineTo(A0.X(t) + 6, A0.Y(1.03) - 10); G.fill(); });
        K.text(G, T('click the timeline to add or remove a review', 'انقر لإضافة مراجعة'), 780, 330, { a: 'right', c: Pl.muted, s: 11 });
        read.innerHTML = IL(`Reviews on day(s) **${rev.slice().sort((a, b) => a - b).map(t => fmt(t, 1)).join(', ') || 'none'}**: modelled recall at day 30 ≈ **${fmt(R30() * 100, 0)}%** (no reviews: ${fmt(Math.exp(-30 / 1.5) * 100, 0)}%). Illustrative model.`);
      });
      M.draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); rev = [1, 3, 7, 14]; M.draw(); }, _R30: s => { const o = rev; rev = s; const r = R30(); rev = o; return r; },
        observe() { const sp = (() => { const o = rev; rev = [1, 3, 7, 14]; const r = R30(); rev = o; return r; })(), cr = (() => { const o = rev; rev = [1, 1.1, 1.2, 1.3]; const r = R30(); rev = o; return r; })(); return { text: `In this model, recall at day 30 is about **${fmt(sp * 100, 0)}%** with spaced reviews and **${fmt(cr * 100, 0)}%** after cramming the same four reviews on day 1.`, predOk: p => p === 1 }; } };
    }
  };
})();
