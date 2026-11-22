/* ERLY Learning Studio v28 — Dihybrid cross.
   Two genes on different chromosomes (independent assortment), complete dominance: seed shape R (round) > r (wrinkled)
   and seed colour Y (yellow) > y (green) — Mendel's peas. Each parent makes four kinds of gamete in equal proportion;
   the 4 × 4 grid lists every fertilisation, so each cell has probability 1/16. Offspring are sampled with the browser's
   cryptographic random generator, and a χ² goodness-of-fit test compares the sample with the expected ratio
   (critical values for p = 0.05: 3.84, 5.99, 7.81 for 1, 2, 3 degrees of freedom). */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, esc = LS.esc;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const GENO = ['RRYY', 'RRYy', 'RrYY', 'RrYy', 'Rryy', 'rrYy', 'rryy', 'RRyy', 'rrYY'];
  const gametes = g => { const a = [g[0], g[1]], b = [g[2], g[3]], out = []; a.forEach(x => b.forEach(y => out.push(x + y))); return out; }; // four, each 1/4 (duplicates kept so frequencies stay right)
  const sortPair = (p, q2) => (p === p.toUpperCase() ? p + q2 : q2 + p);
  const child = (g1, g2) => sortPair(g1[0], g2[0]) + sortPair(g1[1], g2[1]);
  const pheno = g => (g.includes('R') ? 'round' : 'wrinkled') + ' ' + (g.includes('Y') ? 'yellow' : 'green');
  const PH = ['round yellow', 'round green', 'wrinkled yellow', 'wrinkled green'];
  const CRIT = { 1: 3.841, 2: 5.991, 3: 7.815 };
  const rnd = () => { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] / 4294967296; };
  function cross(p1, p2) { const G1 = gametes(p1), G2 = gametes(p2), grid = G1.map(a => G2.map(b => child(a, b))), counts = {}; PH.forEach(p => { counts[p] = 0; }); grid.flat().forEach(g => { counts[pheno(g)]++; }); return { G1, G2, grid, counts }; }
  D.dihybrid = { wide: true,
    intro: 'Mendel crossed pea plants that differed in **two** traits at once: seed **shape** (round **R** is dominant to wrinkled **r**) and seed **colour** (yellow **Y** is dominant to green **y**). Choose the two parents, see every combination of their **gametes** in the 4 × 4 grid, then grow a real-sized random sample of offspring and test whether it fits the expected ratio.',
    predict: { q: 'Two plants that are both RrYy are crossed. Out of 16 offspring you would expect about how many to be wrinkled and green?', options: ['0', '1', '3', '9'] },
    explore: '- Cross **RrYy × RrYy**. Count the four phenotypes in the grid: what ratio appears?\n- Cross **RrYy × rryy** (a test cross). Why is the ratio now 1 : 1 : 1 : 1?\n- Sample 16 offspring several times, then 1 000. When does the χ² test say the sample fits — and does a small sample ever “fail” by chance?',
    explain: 'Each parent passes on **one allele of each gene**. Because the two genes are on different chromosomes, they **assort independently**: an RrYy plant makes RY, Ry, rY and ry gametes in equal numbers. Combining 4 × 4 equally likely gametes gives 16 equally likely offspring, and for RrYy × RrYy the phenotypes come out **9 round yellow : 3 round green : 3 wrinkled yellow : 1 wrinkled green**. Real samples wobble around the expected numbers; a **χ² test** asks whether the wobble is bigger than chance would usually produce. Mendel’s own 1866 counts (315 : 108 : 101 : 32) fit 9 : 3 : 3 : 1 very well.',
    apply: [q('x-dh1', 'Which gametes can an RrYy plant make?', ['RY and ry only', 'RY, Ry, rY and ry', 'Rr and Yy', 'R, r, Y and y separately'], 1, 'One allele of each gene in every gamete, all four combinations equally likely.'), q('x-dh2', 'RrYy × rryy gives the phenotype ratio…', ['9 : 3 : 3 : 1', '3 : 1', '1 : 1 : 1 : 1', 'all round yellow'], 2, 'The rryy parent only gives ry, so each of the four gametes of RrYy shows directly.'), q('x-dh3', 'A χ² value below the critical value means…', ['the hypothesis is proven', 'the difference from the expected ratio could easily be chance', 'the experiment failed', 'the genes are linked'], 1, 'It does not prove the ratio — it means the data are consistent with it.')],
    summary: ['Independent assortment: RrYy → RY, Ry, rY, ry, each 1/4.', 'RrYy × RrYy → 9 : 3 : 3 : 1; test cross RrYy × rryy → 1 : 1 : 1 : 1.', 'χ² compares observed and expected counts; below the critical value, the fit is acceptable.'],
    connect: [{ label: 'Punnett squares (one gene)', href: '#/exp/punnett' }, { label: 'DNA builder', href: '#/exp/dna' }, { label: 'Probability lab', href: '#/exp/prob-lab' }],
    build(host, c) {
      const ctl = K.controls(host, [{ k: 'row' }, { k: 'chips', id: 'p1', label: T('Parent 1', 'الأب 1'), opts: GENO.map(g => [g, g]), val: 'RrYy' }, { k: 'end' }, { k: 'row' }, { k: 'chips', id: 'p2', label: T('Parent 2', 'الأب 2'), opts: GENO.map(g => [g, g]), val: 'RrYy' }, { k: 'end' },
        { k: 'row' }, { k: 'btn', id: 's16', label: T('Grow 16 offspring', 'ازرع 16'), accent: true }, { k: 'btn', id: 's100', label: T('Grow 100', 'ازرع 100') }, { k: 'btn', id: 's1000', label: T('Grow 1 000', 'ازرع 1000') }, { k: 'btn', id: 'mendel', label: T('Mendel’s 1866 counts', 'أرقام مندل') }, { k: 'end' }],
        (id, v) => { if (id === 'p1' || id === 'p2') { sample = null; draw(); } else if (id === 'mendel') { ctl.set('p1', 'RrYy'); ctl.set('p2', 'RrYy'); sample = { n: 556, counts: { 'round yellow': 315, 'round green': 108, 'wrinkled yellow': 101, 'wrinkled green': 32 }, mendel: true }; draw(); } else grow(+id.slice(1)); c.onChange(); });
      const grid = document.createElement('div'); grid.className = 'dh__grid'; host.appendChild(grid);
      const S = K.stage(host, 900, 220, 'dh__bars'); S.cv.setAttribute('role', 'img');
      const out = document.createElement('div'); out.className = 'v26-grid2'; out.innerHTML = `<div class="v26-card"><h3>${T('Expected', 'المتوقع')}</h3><div class="v26-out dh__exp"></div></div><div class="v26-card"><h3>${T('Your sample and χ²', 'العينة وكاي تربيع')}</h3><div class="v26-out dh__chi" aria-live="polite"></div></div>`; host.appendChild(out);
      let sample = null;
      const COL = { 'round yellow': '#e3b51f', 'round green': '#5aa05a', 'wrinkled yellow': '#c79a3a', 'wrinkled green': '#3d6b3d' };
      function chi(counts, n, exp16) { const cats = PH.filter(p => exp16[p] > 0); let x2 = 0; cats.forEach(p => { const e = n * exp16[p] / 16; x2 += (counts[p] - e) ** 2 / e; }); const df = cats.length - 1; return { x2, df, crit: CRIT[df], ok: df < 1 ? null : x2 < CRIT[df], cats }; }
      function grow(n) { const C = cross(ctl.val.p1, ctl.val.p2), cells = C.grid.flat(), counts = {}; PH.forEach(p => { counts[p] = 0; }); for (let i = 0; i < n; i++) counts[pheno(cells[Math.floor(rnd() * 16)])]++; sample = { n, counts }; draw(); }
      function draw() { const C = cross(ctl.val.p1, ctl.val.p2), P = K.pal();
        grid.innerHTML = `<table class="dh__t"><caption>${esc(ctl.val.p1)} × ${esc(ctl.val.p2)} — ${T('each cell is 1/16', 'كل خلية 1/16')}</caption><tr><th></th>${C.G2.map(g => `<th scope="col">${g}</th>`).join('')}</tr>${C.grid.map((row, i) => `<tr><th scope="row">${C.G1[i]}</th>${row.map(g => `<td style="--c:${COL[pheno(g)]}"><b>${g}</b><small>${pheno(g)}</small></td>`).join('')}</tr>`).join('')}</table>`;
        const ratio = PH.map(p => C.counts[p]); host.querySelector('.dh__exp').innerHTML = `<p>${PH.map(p => `${p}: <b>${C.counts[p]}</b>/16`).join('<br>')}</p><p>${T('Ratio', 'النسبة')} <b>${ratio.filter(x => x).join(' : ')}</b></p>`;
        const G = S.g; S.clear(); const n = sample ? sample.n : 0;
        PH.forEach((p, i) => { const y = 20 + i * 48, ex = C.counts[p] / 16, ob = sample ? sample.counts[p] / sample.n : 0; K.text(G, p, 14, y + 20, { s: 13, w: 700 });
          G.fillStyle = 'rgba(120,130,150,.25)'; G.fillRect(170, y + 4, ex * 680, 18); G.fillStyle = COL[p]; if (sample) G.fillRect(170, y + 24, ob * 680, 14);
          K.text(G, `${T('expected', 'متوقع')} ${K.fmt(ex * 100, 1)}%` + (sample ? `   ${T('observed', 'مشاهد')} ${sample.counts[p]} (${K.fmt(ob * 100, 1)}%)` : ''), 176 + Math.max(ex, ob) * 680, y + 20, { s: 12, c: P.muted }); });
        S.cv.setAttribute('aria-label', T('Expected and observed phenotype proportions. ', 'النسب المتوقعة والمشاهدة. ') + PH.map(p => `${p} ${C.counts[p]}/16`).join(', '));
        const box = host.querySelector('.dh__chi');
        if (!sample) box.innerHTML = `<p class="v26-hint">${T('Grow some offspring (or load Mendel’s real counts) to compare with the expected ratio.', 'ازرع نسلاً للمقارنة.')}</p>`;
        else { const r = chi(sample.counts, n, C.counts); box.innerHTML = `<p>${sample.mendel ? T('Mendel’s 1866 counts', 'أرقام مندل 1866') : T('A random sample of', 'عينة عشوائية من') + ' ' + n}: ${PH.map(p => `${p} ${sample.counts[p]}`).join(', ')}.</p>${r.ok == null ? `<p>${T('Only one phenotype is expected, so there is nothing to test.', 'نمط واحد متوقع فقط.')}</p>` : `<p>χ² = <b>${K.fmt(r.x2, 2)}</b> ${T('with', 'مع')} ${r.df} ${T('degree(s) of freedom; critical value at p = 0.05 is', 'درجة حرية؛ القيمة الحرجة')} ${r.crit}.</p><p><b>${r.ok ? T('Consistent with the expected ratio — the differences could easily be chance.', 'متسقة مع النسبة المتوقعة.') : T('Larger than chance usually gives — but about 1 sample in 20 does this even when the ratio is right.', 'أكبر من المتوقع بالصدفة عادةً.')}</b></p>`}`; } }
      S.onresize = draw; draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); sample = null; draw(); }, _cross: (a, b) => cross(a, b).counts, _chi: (counts, n, a, b) => chi(counts, n, cross(a, b).counts), _grow: n => { grow(n); return sample; },
        observe() { const C = cross(ctl.val.p1, ctl.val.p2); return { text: `${ctl.val.p1} × ${ctl.val.p2} → ${PH.filter(p => C.counts[p]).map(p => `${p} ${C.counts[p]}/16`).join(', ')}.`, predOk: i => (ctl.val.p1 === 'RrYy' && ctl.val.p2 === 'RrYy' ? i === 1 : null) }; } };
    }
  };
})();
