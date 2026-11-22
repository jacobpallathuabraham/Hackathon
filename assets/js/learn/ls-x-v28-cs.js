/* ERLY Learning Studio v28 — Path finder, rebuilt: four algorithms on terrain with step costs.
   Paint walls, mud (each step into it costs 5) or clear ground (cost 1). Then run:
     • BFS              — first-in-first-out; fewest steps, ignores costs (so it can return an expensive path);
     • Dijkstra         — always expands the cheapest cost-so-far g; cheapest path guaranteed;
     • A*               — expands the smallest g + h, h = Manhattan distance × the cheapest step cost (1), which never
                          overestimates, so the path is still the cheapest, usually after far fewer expansions;
     • Greedy best-first — expands the smallest h only; fast, but the path may be longer or dearer.
   The canvas shows the FRONTIER (cells waiting in the queue, outlined) separately from the EXPLORED cells (filled),
   optional g-cost labels, and the final path with its length (steps) and cost. Step mode expands one cell at a time. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, IL = LS.inline || (s => s);
  const NAME = { bfs: 'BFS', dijkstra: 'Dijkstra', astar: 'A*', greedy: 'Greedy' };
  const def = D.pathfind;
  def.intro = 'Paint **walls**, **mud** (slow ground — every step into mud costs **5** instead of 1) or clear the ground, then let a search algorithm find a way from the green start to the red goal. Watch the **frontier** (cells waiting to be explored, outlined) spread and the **explored** cells fill in. Compare **BFS**, **Dijkstra**, **A*** and **Greedy best-first**.';
  def.explore = '- Press **Example terrain**, run **BFS**, then **Dijkstra**. Which path has fewer steps? Which is cheaper?\n- Run **A*** on the same terrain: same cost as Dijkstra, but how many cells did it explore?\n- Run **Greedy**. Why does it explore so few cells — and what is wrong with its path?\n- Use **Step** to expand one cell at a time and watch which cell each algorithm picks next.';
  def.explain = '**BFS** explores in rings of increasing *number of steps*, so it finds the path with the fewest steps — but it ignores how costly each step is. **Dijkstra’s algorithm** always expands the cell with the smallest cost so far (**g**), so the first time it reaches the goal it has the **cheapest** path. **A*** expands the smallest **g + h**, where **h** is an estimate of the cost still to go (here the Manhattan distance). Because this estimate never overestimates the real remaining cost, A* still finds the cheapest path, while heading towards the goal and exploring far fewer cells. **Greedy best-first** uses h alone: very fast, but it can be fooled by walls and mud and is not guaranteed to find the shortest or cheapest path. Sat-navs and game characters use A* and its relatives.';
  def.summary = ['BFS: fewest steps; ignores step costs.', 'Dijkstra: cheapest path, explores by cost so far g.', 'A*: g + h with an admissible h — cheapest path, fewer cells explored.', 'Greedy: h only — fast but not guaranteed optimal.'];
  def.apply = def.apply.concat([{ id: 'x-pf3', type: 'mcq', difficulty: 2, prompt: 'Some cells cost 5 to enter, others 1. Which algorithm is guaranteed to return the cheapest path?', options: ['BFS', 'Greedy best-first', 'Dijkstra', 'none of them'], answer: 2, explain: 'Dijkstra expands cells in order of cost so far, so the first path to reach the goal is the cheapest. (A* with an admissible heuristic is too.)' }]);
  def.build = function (host, c) {
    const W = 32, H = 18, S = K.stage(host, 800, 450), cs = 800 / W; S.cv.tabIndex = 0; S.cv.setAttribute('role', 'img');
    let walls = new Set(), mud = new Set(), st = [2, 9], go = [29, 9], run = null, res = {}, drawing = null, brush = 'wall';
    const ctl = K.controls(host, [
      { k: 'row' }, { k: 'btn', id: 'bfs', label: T('Run BFS', 'شغّل BFS'), accent: true }, { k: 'btn', id: 'dijkstra', label: T('Run Dijkstra', 'شغّل ديكسترا'), accent: true }, { k: 'btn', id: 'astar', label: T('Run A*', 'شغّل A*'), accent: true }, { k: 'btn', id: 'greedy', label: T('Run Greedy', 'شغّل الجشع'), accent: true }, { k: 'end' },
      { k: 'row' }, { k: 'chips', id: 'brush', label: T('Paint', 'ارسم'), opts: [['wall', T('Wall', 'جدار')], ['mud', T('Mud (cost 5)', 'طين (كلفة 5)')], ['clear', T('Clear', 'امسح')]], val: 'wall' }, { k: 'chips', id: 'alg', label: T('Step with', 'خطوة بـ'), opts: [['bfs', 'BFS'], ['dijkstra', 'Dijkstra'], ['astar', 'A*'], ['greedy', 'Greedy']], val: 'astar' }, { k: 'btn', id: 'step', label: T('Step', 'خطوة') }, { k: 'toggle', id: 'costs', label: T('Show cost so far (g)', 'أظهر الكلفة g'), val: false }, { k: 'end' },
      { k: 'row' }, { k: 'btn', id: 'maze', label: T('Example walls', 'جدران مثال') }, { k: 'btn', id: 'terrain', label: T('Example terrain (mud)', 'تضاريس مثال') }, { k: 'btn', id: 'clr', label: T('Clear all', 'امسح الكل') }, { k: 'end' }
    ], (id, v) => {
      if (NAME[id]) start(id, true);
      else if (id === 'brush') brush = v;
      else if (id === 'step') { if (!run || run.kind !== ctl.val.alg || run.done) start(ctl.val.alg, false); else expand(run); M.draw(); }
      else if (id === 'maze') { walls = new Set(); mud = new Set(); for (let y = 2; y < 16; y++) walls.add(`15,${y}`); for (let x = 8; x < 15; x++) walls.add(`${x},2`); for (let y = 0; y < 13; y++) walls.add(`22,${y}`); clearRun(); }
      else if (id === 'terrain') { walls = new Set(); mud = new Set(); for (let x = 8; x <= 24; x++) for (let y = 5; y <= 13; y++) mud.add(`${x},${y}`); for (let y = 0; y < 5; y++) walls.add(`16,${y}`); for (let x = 10; x <= 22; x++) walls.add(`${x},15`); clearRun(); }
      else if (id === 'clr') { walls = new Set(); mud = new Set(); res = {}; clearRun(); }
      M.draw(); c.onChange();
    });
    const read = document.createElement('p'); read.className = 'kx-read'; read.setAttribute('aria-live', 'polite'); host.appendChild(read);
    const key = p => p[0] + ',' + p[1], cost = k => (mud.has(k) ? 5 : 1), h = p => Math.abs(p[0] - go[0]) + Math.abs(p[1] - go[1]);
    function init(kind) { const s0 = key(st); return { kind, g: { [s0]: 0 }, prev: { [s0]: null }, open: [[st[0], st[1], 0]], seq: 0, closed: new Set(), order: [], done: false, path: [] }; }
    function pick(R) { // index of the next cell to expand
      if (R.kind === 'bfs') return 0; let bi = 0, bv = Infinity, bh = Infinity, bs = Infinity;
      R.open.forEach((n, i) => { const k = key(n), hh = h(n), v = R.kind === 'dijkstra' ? R.g[k] : R.kind === 'greedy' ? hh : R.g[k] + hh; if (v < bv || (v === bv && (hh < bh || (hh === bh && n[2] < bs)))) { bv = v; bh = hh; bs = n[2]; bi = i; } });
      return bi;
    }
    function expand(R) {
      if (R.done) return; while (R.open.length) {
        const cur = R.open.splice(pick(R), 1)[0], k = key(cur); if (R.closed.has(k)) continue; R.closed.add(k); R.order.push(k);
        if (k === key(go)) { R.done = true; const p = []; let q = k; while (q) { p.unshift(q); q = R.prev[q]; } R.path = p; return; }
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const n = [cur[0] + dx, cur[1] + dy], nk = key(n); if (n[0] < 0 || n[1] < 0 || n[0] >= W || n[1] >= H || walls.has(nk) || R.closed.has(nk)) return;
          const ng = R.g[k] + cost(nk);
          if (R.kind === 'bfs' || R.kind === 'greedy') { if (nk in R.g) return; R.g[nk] = ng; R.prev[nk] = k; R.open.push([n[0], n[1], ++R.seq]); return; }
          if (!(nk in R.g) || ng < R.g[nk]) { R.g[nk] = ng; R.prev[nk] = k; R.open = R.open.filter(o => key(o) !== nk); R.open.push([n[0], n[1], ++R.seq]); } });
        return;
      }
      R.done = true; // queue empty: no path
    }
    const pathCost = p => p.slice(1).reduce((s0, k) => s0 + cost(k), 0);
    function search(kind) { const R = init(kind); let guard = 0; while (!R.done && guard++ < 10000) expand(R); return { order: R.order, path: R.path, cost: pathCost(R.path) }; }
    function finish(R) { res[R.kind] = { n: R.order.length, len: R.path.length ? R.path.length - 1 : null, cost: R.path.length ? pathCost(R.path) : null }; }
    function start(kind, animate) { run = init(kind); if (!animate) { expand(run); M.draw(); return; } if (K.reduced()) { while (!run.done) expand(run); finish(run); M.draw(); c.onChange(); return; } M.play(); }
    function clearRun() { run = null; }
    const cell = (x, y) => [Math.floor(x / cs), Math.floor(y / cs)];
    S.cv.style.touchAction = 'none';
    S.cv.addEventListener('pointerdown', e => { e.preventDefault(); const [x, y] = cell(...S.pt(e)); if (key([x, y]) === key(st) || key([x, y]) === key(go)) return; drawing = true; S.cv.setPointerCapture(e.pointerId); paint(x, y); });
    S.cv.addEventListener('pointermove', e => { if (drawing) paint(...cell(...S.pt(e))); });
    S.cv.addEventListener('pointerup', () => { drawing = null; c.onChange(); });
    function paint(x, y) { const k = key([x, y]); if (x < 0 || y < 0 || x >= W || y >= H || k === key(st) || k === key(go)) return; walls.delete(k); mud.delete(k); if (brush === 'wall') walls.add(k); if (brush === 'mud') mud.add(k); run = null; M.draw(); }
    const M = K.motor(c, host, (dt, running) => {
      if (running && run && !run.done) { const n = Math.max(1, Math.ceil(W * H / 160)); for (let i = 0; i < n && !run.done; i++) expand(run); if (run.done) { finish(run); M.pause(); c.onChange(); } }
      if (run && run.done && !res[run.kind]) finish(run);
      const Pl = K.pal(), G = S.g; S.clear(Pl.bg);
      mud.forEach(k => { const [x, y] = k.split(',').map(Number); G.fillStyle = 'rgba(139,94,52,.55)'; G.fillRect(x * cs, y * cs, cs, cs); G.fillStyle = 'rgba(90,60,30,.35)'; G.fillRect(x * cs + cs * 0.2, y * cs + cs * 0.55, cs * 0.25, cs * 0.12); });
      if (run) { const N = run.order.length; run.order.forEach((k, i) => { const [x, y] = k.split(',').map(Number); G.fillStyle = `hsla(${200 + i / Math.max(1, N) * 60}, 70%, 60%, .42)`; G.fillRect(x * cs, y * cs, cs, cs); });
        G.strokeStyle = Pl.violet; G.lineWidth = 2; run.open.forEach(n => { if (run.closed.has(key(n))) return; G.strokeRect(n[0] * cs + 2, n[1] * cs + 2, cs - 4, cs - 4); });
        if (ctl.val.costs) { G.font = '600 9px ui-sans-serif, system-ui'; G.textAlign = 'center'; G.textBaseline = 'middle'; G.fillStyle = Pl.ink; Object.entries(run.g).forEach(([k, v]) => { const [x, y] = k.split(',').map(Number); G.fillText(String(v), x * cs + cs / 2, y * cs + cs / 2); }); G.textAlign = 'left'; G.textBaseline = 'alphabetic'; } }
      walls.forEach(k => { const [x, y] = k.split(',').map(Number); G.fillStyle = Pl.ink; G.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2); });
      if (run && run.path.length) { G.strokeStyle = Pl.gold; G.lineWidth = 6; G.lineCap = 'round'; G.lineJoin = 'round'; G.beginPath(); run.path.forEach((k, i) => { const [x, y] = k.split(',').map(Number); i ? G.lineTo(x * cs + cs / 2, y * cs + cs / 2) : G.moveTo(x * cs + cs / 2, y * cs + cs / 2); }); G.stroke(); }
      G.strokeStyle = Pl.line; G.lineWidth = 0.5; G.beginPath(); for (let x = 0; x <= W; x++) { G.moveTo(x * cs, 0); G.lineTo(x * cs, H * cs); } for (let y = 0; y <= H; y++) { G.moveTo(0, y * cs); G.lineTo(800, y * cs); } G.stroke();
      G.fillStyle = Pl.green; G.fillRect(st[0] * cs + 2, st[1] * cs + 2, cs - 4, cs - 4); G.fillStyle = Pl.red; G.fillRect(go[0] * cs + 2, go[1] * cs + 2, cs - 4, cs - 4);
      read.innerHTML = IL(Object.keys(NAME).filter(k => res[k]).map(k => `**${NAME[k]}**: explored ${res[k].n} cells, path length ${res[k].len == null ? 'no path' : res[k].len}${res[k].cost != null ? ', cost ' + res[k].cost : ''}`).join(' · ') || T('Paint walls or mud (optional), then run a search. Outlined cells are the frontier; filled cells have been explored.', 'ارسم ثم شغّل البحث.'))
        + (run && !run.done && !M.playing() ? ` — ${T('step', 'خطوة')} ${run.order.length}, ${T('frontier', 'الحدود')} ${run.open.length}` : '');
      S.cv.setAttribute('aria-label', T('Path-finding grid. ', 'شبكة البحث. ') + read.textContent);
    });
    M.draw();
    return { play() { start('astar', true); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { M.pause(); S.destroy(); }, reset() { walls = new Set(); mud = new Set(); run = null; res = {}; ctl.reset(); brush = 'wall'; M.draw(); },
      _search: search, _maze: () => ctl, _terrain: () => { ctl.box.querySelector('[data-kb="terrain"]').click(); return { walls: walls.size, mud: mud.size }; },
      observe() { const r = res; return { text: r.bfs && r.astar ? `BFS explored **${r.bfs.n}** cells (path cost ${r.bfs.cost}), A* explored **${r.astar.n}** (path cost ${r.astar.cost})${r.dijkstra ? `, Dijkstra **${r.dijkstra.n}** (cost ${r.dijkstra.cost})` : ''}.` : 'Run BFS and A* on the same terrain.', predOk: r.bfs && r.astar ? p => p === 1 : null }; } };
  };
})();
