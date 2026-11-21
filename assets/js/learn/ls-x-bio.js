/* ERLY Learning Studio — Biology: living systems (v24). Six experiences; organic motion, real rules (genetic code,
   Mendelian ratios, Lotka–Volterra), each simplification stated. */
(function () {
  'use strict';
  const LS = window.LS, K = LS.kit, D = LS.exp.DEFS, T = LS.T, IL = LS.inline, esc = LS.esc;
  const { fmt, clamp } = K;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const readout = host => { const r = document.createElement('p'); r.className = 'kx-read'; r.setAttribute('aria-live', 'polite'); host.appendChild(r); return r; };

  /* ============ 1 · DNA to protein (the standard genetic code) ============ */
  const BASES = 'TCAG', AA = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
  const AAN = { F: 'Phe', L: 'Leu', S: 'Ser', Y: 'Tyr', '*': 'STOP', C: 'Cys', W: 'Trp', P: 'Pro', H: 'His', Q: 'Gln', R: 'Arg', I: 'Ile', M: 'Met', T: 'Thr', N: 'Asn', K: 'Lys', V: 'Val', A: 'Ala', D: 'Asp', E: 'Glu', G: 'Gly' };
  const codon = c => AA[BASES.indexOf(c[0]) * 16 + BASES.indexOf(c[1]) * 4 + BASES.indexOf(c[2])];
  LS.codon = codon;
  D.dna = { wide: true,
    intro: 'This is the **coding strand** of a short gene. Click any base to change it (a mutation). Watch the DNA be **transcribed** into mRNA and **translated**, three bases at a time, into a chain of amino acids.',
    predict: { q: 'You change one base in a codon. The protein…', options: ['always changes completely', 'may change one amino acid, stay the same, or stop early', 'never changes', 'gets longer'] },
    explore: 'Change the third base of a codon and see if the amino acid changes. Then turn a codon into TAA, TAG or TGA. Then delete a base (frameshift).',
    explain: 'DNA’s base sequence is copied into **mRNA** (T is replaced by U) — **transcription**. A ribosome reads mRNA in **codons** of three bases; each codon codes for one **amino acid**, or **stop** — **translation**. The code is **redundant**: several codons give the same amino acid, so some mutations are **silent**. A point mutation can swap one amino acid (missense) or create a **stop codon** (nonsense), cutting the protein short. Deleting a base shifts the **reading frame**, changing every amino acid after it.',
    apply: [q('x-dn1', 'The mRNA codon AUG codes for…', ['Stop', 'Methionine (start)', 'Glycine', 'Nothing'], 1, 'AUG is the start codon.'), q('x-dn2', 'A deletion of one base usually has a large effect because…', ['the DNA breaks', 'it shifts the reading frame', 'it removes a gene', 'it adds a stop codon at the start'], 1, 'Every later codon changes.')],
    summary: ['Transcription: DNA → mRNA (T → U).', 'Translation: codons of three bases → amino acids.', 'Mutations: silent, missense, nonsense, frameshift.'],
    build(host, c) {
      const START = 'ATGGCTTTGAAAGGCTGGTAA'; let seq = START, anim = 0, t = 0, kinds = new Set();
      host.insertAdjacentHTML('beforeend', `<div class="dna"><p class="dna__lab">${T('DNA coding strand (click a base to mutate it)', 'شريط DNA (انقر لتغيير قاعدة)')}</p><div class="dna__row" data-row="dna"></div><p class="dna__lab">mRNA</p><div class="dna__row" data-row="rna"></div><p class="dna__lab">${T('Protein', 'البروتين')}</p><div class="dna__row dna__aa" data-row="aa"></div></div>`);
      const ctl = K.controls(host, [{ k: 'btn', id: 'del', label: T('Delete the 5th base (frameshift)', 'احذف القاعدة الخامسة') }, { k: 'btn', id: 'ins', label: T('Insert a base after the 5th', 'أدخل قاعدة') }, { k: 'btn', id: 'orig', label: T('Original gene', 'الجين الأصلي') }], id => { if (id === 'del' && seq.length > 6) { seq = seq.slice(0, 4) + seq.slice(5); kinds.add('frameshift'); } if (id === 'ins') { seq = seq.slice(0, 5) + 'A' + seq.slice(5); kinds.add('frameshift'); } if (id === 'orig') seq = START; render(); c.onChange(); });
      const read = readout(host);
      const prot = s => { const out = []; for (let i = 0; i + 3 <= s.length; i += 3) { const a = codon(s.slice(i, i + 3)); out.push(a); if (a === '*') break; } return out; };
      const P0 = prot(START);
      function render() { const rows = host.querySelectorAll('.dna__row'); const cod = i => Math.floor(i / 3) % 2;
        rows[0].innerHTML = seq.split('').map((b, i) => `<button type="button" class="dna__b dna__b--${b} c${cod(i)}" data-i="${i}" aria-label="${T('Base', 'قاعدة')} ${i + 1}: ${b}">${b}</button>`).join('');
        rows[1].innerHTML = seq.replace(/T/g, 'U').split('').map((b, i) => `<span class="dna__b dna__b--${b === 'U' ? 'T' : b} c${cod(i)}" style="--d:${i * 25}ms">${b}</span>`).join('');
        const P = prot(seq); rows[2].innerHTML = P.map((a, i) => `<span class="dna__a ${a === '*' ? 'is-stop' : P0[i] && P0[i] !== a ? 'is-ch' : ''}" style="--d:${i * 70}ms">${AAN[a]}</span>`).join('');
        const diff = P.map((a, i) => (P0[i] !== a ? i : -1)).filter(i => i >= 0); let kind = 'none';
        if (seq.length !== START.length) kind = 'frameshift'; else if (diff.length === 0 && seq !== START) kind = 'silent'; else if (P.length < P0.length && P[P.length - 1] === '*') kind = 'nonsense'; else if (diff.length) kind = 'missense'; if (kind !== 'none') kinds.add(kind);
        read.innerHTML = IL(seq === START ? `The gene codes for **${P.map(a => AAN[a]).join('–')}**: ${P.length - 1} amino acids then STOP.` : kind === 'silent' ? '**Silent mutation:** the DNA changed but the codon still codes for the same amino acid — the protein is unchanged.' : kind === 'nonsense' ? `**Nonsense mutation:** a new STOP codon ends the protein after ${P.length - 1} amino acid(s).` : kind === 'missense' ? `**Missense mutation:** amino acid ${diff.map(i => `${i + 1} changed ${AAN[P0[i]]} → ${AAN[P[i]]}`).join(', ')}.` : `**Frameshift:** the reading frame moved, so ${diff.length} amino acid(s) changed from that point on.`); }
      rows0(); function rows0() { render(); }
      host.querySelector('[data-row="dna"]').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i, nx = 'ACGT'[('ACGT'.indexOf(seq[i]) + 1) % 4]; seq = seq.slice(0, i) + nx + seq.slice(i + 1); render(); host.querySelector(`[data-i="${i}"]`).focus(); c.onChange(); });
      return { reset() { seq = START; kinds.clear(); render(); }, _seq: v => { seq = v; render(); }, _prot: () => prot(seq).map(a => AAN[a]),
        observe() { return { text: `Mutation types you have made: **${[...kinds].join(', ') || 'none yet'}**. Current protein: ${prot(seq).map(a => AAN[a]).join('–')}.`, predOk: kinds.size ? p => p === 1 : null }; } };
    }
  };

  /* ============ 2 · Punnett square ============ */
  D.punnett = { wide: true,
    intro: 'Choose the **genotypes** of two parents. Each parent passes on one allele of each gene, at random. The Punnett square shows every equally likely combination; then **breed a family** to see real chance at work. Uppercase = dominant (purple flowers), lowercase = recessive (white).',
    predict: { q: 'Two Pp (purple) parents. What fraction of offspring are white (pp)?', options: ['none', '1/4', '1/2', '3/4'] },
    explore: 'Cross Pp × Pp, then Pp × pp. Switch on the second gene (seed shape R/r) and cross RrPp × RrPp. Breed 100 offspring and compare with the square.',
    explain: 'Each parent has two alleles; each offspring gets one from each parent. For **Pp × Pp** the four equally likely combinations are PP, Pp, pP and pp: **3 purple : 1 white**. A **pp** individual shows the recessive trait; a **heterozygote (Pp)** looks dominant but carries the recessive allele. With two independent genes, a double heterozygote cross gives the famous **9 : 3 : 3 : 1** ratio. Real families vary by chance, especially when small.',
    apply: [q('x-pu1', 'Pp × pp gives white offspring with probability…', ['0', '1/4', '1/2', '1'], 2, 'Half of the boxes are pp.'), q('x-pu2', 'A purple plant could be…', ['only PP', 'PP or Pp', 'only Pp', 'pp'], 1, 'Both show the dominant trait.')],
    summary: ['Each parent passes one allele per gene.', 'Pp × Pp → 3 : 1; Pp × pp → 1 : 1.', 'Two independent genes: 9 : 3 : 3 : 1.'],
    build(host, c) {
      let A = 'Pp', B = 'Pp', two = false, A2 = 'Rr', B2 = 'Rr', fam = {}, nf = 0;
      const opts = g => [[g + g, g + g], [g + g.toLowerCase(), g + g.toLowerCase()], [g.toLowerCase() + g.toLowerCase(), g.toLowerCase() + g.toLowerCase()]];
      const ctl = K.controls(host, [{ k: 'chips', id: 'a', label: T('Parent 1', 'الأب 1'), opts: opts('P'), val: 'Pp' }, { k: 'chips', id: 'b', label: T('Parent 2', 'الأب 2'), opts: opts('P'), val: 'Pp' }, { k: 'row' }, { k: 'toggle', id: 'two', label: T('Add a second gene (seed shape R = round)', 'أضف جيناً ثانياً'), val: false }, { k: 'chips', id: 'a2', label: 'P1 R', opts: opts('R'), val: 'Rr' }, { k: 'chips', id: 'b2', label: 'P2 R', opts: opts('R'), val: 'Rr' }, { k: 'end' }, { k: 'row' }, { k: 'btn', id: 'b1', label: T('Breed 1', 'أنجب 1') }, { k: 'btn', id: 'b20', label: T('Breed 20', 'أنجب 20'), accent: true }, { k: 'btn', id: 'b100', label: T('Breed 100', 'أنجب 100') }, { k: 'btn', id: 'clr', label: T('New family', 'عائلة جديدة') }, { k: 'end' }], (id, v) => {
        if (id === 'a') A = v; if (id === 'b') B = v; if (id === 'two') two = v; if (id === 'a2') A2 = v; if (id === 'b2') B2 = v; if (/^b\d/.test(id)) breed(+id.slice(1)); if (['a', 'b', 'two', 'a2', 'b2', 'clr'].includes(id)) { fam = {}; nf = 0; } draw(); c.onChange(); });
      const box = document.createElement('div'); box.className = 'pu'; host.appendChild(box); const read = readout(host);
      const gametes = (g1, g2) => two ? [g1[0] + g2[0], g1[0] + g2[1], g1[1] + g2[0], g1[1] + g2[1]] : [g1[0], g1[1]];
      const norm = s => s.split('').sort((x, y) => (x.toLowerCase() === y.toLowerCase() ? (x < y ? -1 : 1) : 0)).join('');
      const geno = (g1, g2) => { if (!two) return norm(g1 + g2); return norm(g1[0] + g2[0]) + norm(g1[1] + g2[1]); };
      const pheno = gn => { const p = /P/.test(gn) ? T('purple', 'أرجواني') : T('white', 'أبيض'); if (!two) return p; return p + ', ' + (/R/.test(gn) ? T('round', 'مستدير') : T('wrinkled', 'مجعد')); };
      function cells() { const ga = gametes(A, A2), gb = gametes(B, B2); return { ga, gb, grid: ga.map(x => gb.map(y => geno(x, y))) }; }
      function breed(n) { const { ga, gb } = cells(); for (let i = 0; i < n; i++) { const gn = geno(ga[Math.floor(Math.random() * ga.length)], gb[Math.floor(Math.random() * gb.length)]), ph = pheno(gn); fam[ph] = (fam[ph] || 0) + 1; nf++; } }
      function draw() { host.querySelectorAll('[data-kc="a2"],[data-kc="b2"]').forEach(b => { b.disabled = !two; b.style.opacity = two ? 1 : 0.4; });
        const { ga, gb, grid } = cells(), flat = grid.flat(), N = flat.length, ratio = {}; flat.forEach(g => { const p = pheno(g); ratio[p] = (ratio[p] || 0) + 1; });
        box.innerHTML = `<table class="pu__t"><tr><th></th>${gb.map(g => `<th>${g}</th>`).join('')}</tr>${ga.map((g, i) => `<tr><th>${g}</th>${grid[i].map((x, j) => `<td class="${/P/.test(x) ? 'is-p' : 'is-w'} ${two && !/R/.test(x) ? 'is-wr' : ''}" style="--d:${(i * gb.length + j) * 30}ms"><span class="pu__f" aria-hidden="true"></span>${x}</td>`).join('')}</tr>`).join('')}</table>
          <div class="pu__side"><h3 class="at-h3">${T('Expected', 'المتوقع')}</h3><ul>${Object.entries(ratio).map(([p, k]) => `<li><b>${k}/${N}</b> ${esc(p)} <span class="pu__bar" style="--w:${k / N * 100}%"></span></li>`).join('')}</ul>${nf ? `<h3 class="at-h3">${T('Your family of', 'عائلتك من')} ${nf}</h3><ul>${Object.keys(ratio).map(p => `<li><b>${fam[p] || 0}</b> ${esc(p)} (${fmt((fam[p] || 0) / nf * 100, 0)}%) <span class="pu__bar is-real" style="--w:${(fam[p] || 0) / nf * 100}%"></span></li>`).join('')}</ul>` : ''}</div>`;
        read.innerHTML = IL(`**${two ? A + A2 : A} × ${two ? B + B2 : B}**: ${Object.entries(ratio).map(([p, k]) => `${k}/${N} ${p}`).join(' · ')}.${nf ? ` Bred ${nf}: ${Object.entries(fam).map(([p, k]) => `${k} ${p}`).join(', ')}.` : ''}`); }
      draw();
      return { reset() { ctl.reset(); A = B = 'Pp'; A2 = B2 = 'Rr'; two = false; fam = {}; nf = 0; draw(); }, _cells: cells,
        observe() { const { grid } = cells(), flat = grid.flat(), w = flat.filter(g => !/P/.test(g)).length; return { text: `${A} × ${B}: **${w}/${flat.length}** white (pp) expected${nf ? `; in your family of ${nf}, ${fam[pheno('pp')] || 0} were white` : ''}.`, predOk: A === 'Pp' && B === 'Pp' && !two ? p => p === 1 : null }; } };
    }
  };

  /* ============ 3 · Predator and prey (Lotka–Volterra) ============ */
  D.ecosystem = { wide: true,
    intro: 'Rabbits breed; foxes eat rabbits; foxes starve without them. Tune the rates and watch the two populations — as animals in a meadow, as graphs over time, and as a loop on the “phase plot”.',
    predict: { q: 'Over time, the fox population peaks…', options: ['at the same time as rabbits', 'a little after rabbits peak', 'before rabbits peak', 'never'] },
    explore: 'Run it and watch which peak comes first. Increase the hunting rate. Then lower the rabbits’ birth rate and see what happens to the foxes.',
    explain: 'Prey grow when predators are few. More prey then feeds more predators, so predators rise **after** the prey; the predators then eat the prey down, and starve in turn. The populations **oscillate**, with predator peaks **lagging** prey peaks, tracing a closed loop on the phase plot. This is the **Lotka–Volterra** model: dR/dt = aR − bRF, dF/dt = cbRF − dF. Real ecosystems add food limits, disease and other species, which damp or disturb these cycles.',
    apply: [q('x-ec1', 'If foxes are removed entirely, in this model rabbits…', ['die out', 'grow without limit', 'stay constant', 'oscillate'], 1, 'Nothing limits them in this simple model.'), q('x-ec2', 'Predator peaks come after prey peaks because…', ['predators need food to increase', 'they are bigger', 'prey move faster', 'chance'], 0, 'Predator growth depends on prey numbers.')],
    summary: ['Predator–prey populations oscillate.', 'Predator peaks lag prey peaks.', 'A simple model ignores food limits and other species.'],
    build(host, c) {
      const S = K.stage(host, 800, 420); let R = 40, F = 9, hist = [], tt = 0, animals = []; let a = 1.0, b = 0.05, cc = 0.5, d = 0.5;
      const ctl = K.controls(host, [{ k: 'range', id: 'a', label: T('Rabbit birth rate', 'معدل ولادة الأرانب'), min: 0.3, max: 1.6, step: 0.05, val: 1, d: 2 }, { k: 'range', id: 'b', label: T('Hunting success', 'نجاح الصيد'), min: 0.01, max: 0.1, step: 0.005, val: 0.05, d: 3 }, { k: 'range', id: 'd', label: T('Fox death rate', 'معدل موت الثعالب'), min: 0.2, max: 1.2, step: 0.05, val: 0.5, d: 2 }, { k: 'row' }, { k: 'btn', id: 'restart', label: T('Restart populations', 'أعد البدء') }, { k: 'end' }], (id, v) => { if (id === 'a') a = v; if (id === 'b') b = v; if (id === 'd') d = v; if (id === 'restart') { R = 40; F = 9; hist = []; tt = 0; } c.onChange(); });
      const read = readout(host);
      const M = K.motor(c, host, dt => {
        const h = Math.min(dt, 0.05) * 2.2; for (let k = 0; k < 10; k++) { const s = h / 10, dR = a * R - b * R * F, dF = cc * b * R * F - d * F; R = Math.max(0.01, R + dR * s); F = Math.max(0.01, F + dF * s); tt += s; }
        hist.push([tt, R, F]); if (hist.length > 1600) hist.shift();
        const Pl = K.pal(), G = S.g; S.clear(Pl.bg2);
        // meadow
        G.fillStyle = 'rgba(80,160,70,.18)'; G.fillRect(0, 0, 330, 420);
        const want = [Math.min(80, Math.round(R)), Math.min(30, Math.round(F))]; while (animals.filter(x => x.k === 0).length < want[0]) animals.push({ k: 0, x: Math.random() * 310 + 10, y: Math.random() * 400 + 10, ph: Math.random() * 6 }); while (animals.filter(x => x.k === 1).length < want[1]) animals.push({ k: 1, x: Math.random() * 310 + 10, y: Math.random() * 400 + 10, ph: Math.random() * 6 });
        [0, 1].forEach(kk => { let ex = animals.filter(x => x.k === kk).length - want[kk]; animals = animals.filter(x => !(x.k === kk && ex-- > 0)); });
        animals.forEach(an => { an.ph += dt * (an.k ? 1.2 : 2.5); an.x = clamp(an.x + Math.cos(an.ph) * (an.k ? 0.9 : 0.6), 8, 322); an.y = clamp(an.y + Math.sin(an.ph * 0.7) * (an.k ? 0.9 : 0.6), 8, 412); const X = an.x, Y = an.y, f = Math.cos(an.ph) > 0 ? 1 : -1; if (an.k) { G.fillStyle = '#d9621f'; G.beginPath(); G.ellipse(X, Y, 11, 6, 0, 0, 7); G.fill(); G.beginPath(); G.moveTo(X + 9 * f, Y - 3); G.lineTo(X + 17 * f, Y - 1); G.lineTo(X + 9 * f, Y + 4); G.fill(); G.beginPath(); G.moveTo(X + 10 * f, Y - 4); G.lineTo(X + 12 * f, Y - 11); G.lineTo(X + 14 * f, Y - 3); G.fill(); G.fillStyle = '#fff'; G.beginPath(); G.arc(X - 13 * f, Y + 1, 3, 0, 7); G.fill(); G.strokeStyle = '#d9621f'; G.lineWidth = 4; G.beginPath(); G.moveTo(X - 9 * f, Y); G.lineTo(X - 13 * f, Y + 1); G.stroke(); }
          else { G.fillStyle = '#8a7a6a'; G.beginPath(); G.ellipse(X, Y, 7, 5, 0, 0, 7); G.fill(); G.beginPath(); G.arc(X + 6 * f, Y - 3, 3.5, 0, 7); G.fill(); G.beginPath(); G.ellipse(X + 6 * f, Y - 9, 1.6, 4.5, 0, 0, 7); G.fill(); G.fillStyle = '#fff'; G.beginPath(); G.arc(X - 7 * f, Y, 2, 0, 7); G.fill(); } });
        const top = Math.max(60, ...hist.map(x => Math.max(x[1], x[2]))) * 1.05, t0 = hist.length ? hist[0][0] : 0, t1 = Math.max(t0 + 20, tt);
        const A = K.axes(G, [360, 20, 420, 220], [t0, t1], [0, top], { xl: T('time', 'الزمن'), ticks: 4 });
        [[1, Pl.blue], [2, Pl.red]].forEach(([i, col]) => { G.strokeStyle = col; G.lineWidth = 2.5; G.beginPath(); hist.forEach((p, j) => j ? G.lineTo(A.X(p[0]), A.Y(p[i])) : G.moveTo(A.X(p[0]), A.Y(p[i]))); G.stroke(); });
        K.text(G, `${T('rabbits', 'أرانب')} ${Math.round(R)}`, 370, 38, { c: Pl.blue, w: 700 }); K.text(G, `${T('foxes', 'ثعالب')} ${Math.round(F)}`, 480, 38, { c: Pl.red, w: 700 });
        const B2 = K.axes(G, [360, 270, 420, 140], [0, top], [0, Math.max(20, ...hist.map(x => x[2])) * 1.1], { xl: T('rabbits', 'أرانب'), yl: T('foxes', 'ثعالب'), ticks: 3 });
        G.strokeStyle = Pl.violet; G.lineWidth = 1.8; G.beginPath(); hist.forEach((p, j) => j ? G.lineTo(B2.X(p[1]), B2.Y(p[2])) : G.moveTo(B2.X(p[1]), B2.Y(p[2]))); G.stroke(); G.fillStyle = Pl.violet; G.beginPath(); G.arc(B2.X(R), B2.Y(F), 5, 0, 7); G.fill();
        read.innerHTML = IL(`Rabbits **${Math.round(R)}**, foxes **${Math.round(F)}**. Balance point of this model: ${fmt(d / (cc * b), 0)} rabbits and ${fmt(a / b, 0)} foxes.`);
      });
      M.play();
      const peaks = i => { const p = []; for (let j = 2; j < hist.length - 2; j++) if (hist[j][i] > hist[j - 1][i] && hist[j][i] >= hist[j + 1][i] && hist[j][i] > hist[j - 2][i] && hist[j][i] >= hist[j + 2][i]) p.push(hist[j][0]); return p; };
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); a = 1; b = 0.05; d = 0.5; R = 40; F = 9; hist = []; tt = 0; M.play(); },
        observe() { const pr = peaks(1), pf = peaks(2); const lag = pr.length && pf.length ? pf.find(t => t > pr[0]) - pr[0] : null; return { text: pr.length ? `Rabbit peaks at t ≈ ${pr.slice(0, 3).map(x => fmt(x, 1)).join(', ')}; fox peaks at t ≈ ${pf.slice(0, 3).map(x => fmt(x, 1)).join(', ')}.${lag ? ` Foxes peak about **${fmt(lag, 1)}** time units **after** rabbits.` : ''}` : 'Let the model run until each population has peaked.', predOk: lag ? p => p === 1 : null }; } };
    }
  };

  /* ============ 4 · Enzyme lab ============ */
  const ENZ = { amylase: ['Human salivary amylase', 37, 6.8], pepsin: ['Pepsin (stomach)', 37, 2], thermo: ['Heat-loving enzyme (Taq polymerase)', 72, 8] };
  D.enzyme = { wide: true,
    intro: 'An enzyme’s **active site** fits its substrate. Change the **temperature** and **pH** and watch how fast product is made — and what happens when the enzyme’s shape is destroyed (**denatured**).',
    predict: { q: 'Heating a human enzyme from 37 °C to 70 °C makes it…', options: ['work twice as fast', 'stop working — it denatures', 'work at the same rate', 'turn into a substrate'] },
    explore: 'Find the temperature of fastest activity. Push past it. Then switch to pepsin and find its best pH. Try the heat-loving enzyme.',
    explain: 'Warmer particles collide more often, so activity rises with temperature — up to the **optimum**. Above it, the enzyme’s 3D shape unravels (**denaturation**), the active site no longer fits, and activity falls fast. Each enzyme also has an **optimum pH**: pepsin works in the acid stomach (~pH 2), amylase in near-neutral saliva. The curve shapes here are a teaching model; the optima are typical textbook values.',
    apply: [q('x-ez1', 'Pepsin works best at about pH…', ['2', '7', '9', '12'], 0, 'It works in stomach acid.'), q('x-ez2', 'Denaturation means…', ['the enzyme is used up', 'the active site changes shape', 'the substrate breaks', 'the reaction speeds up'], 1, 'The enzyme’s shape is destroyed.')],
    summary: ['Activity rises with temperature up to an optimum.', 'Above the optimum, enzymes denature.', 'Each enzyme has an optimum pH.'],
    build(host, c) {
      const S = K.stage(host, 800, 380), sT = K.spring(37), sp = K.spring(7); let enz = 'amylase', t = 0, prod = 0, subs = [];
      const ctl = K.controls(host, [{ k: 'chips', id: 'e', label: T('Enzyme', 'الإنزيم'), opts: Object.entries(ENZ).map(([k, v]) => [k, v[0]]), val: 'amylase' }, { k: 'range', id: 'T', label: T('Temperature', 'درجة الحرارة'), min: 0, max: 95, step: 1, val: 37, unit: ' °C' }, { k: 'range', id: 'pH', label: 'pH', min: 1, max: 12, step: 0.1, val: 7, d: 1 }], (id, v) => { if (id === 'e') { enz = v; prod = 0; } if (id === 'T') sT.set(v); if (id === 'pH') sp.set(v); c.onChange(); });
      const read = readout(host);
      const rate = (T0, pH) => { const [, To, po] = ENZ[enz]; const up = Math.pow(2, (T0 - To) / 10), den = 1 / (1 + Math.exp((T0 - To - 8) / 2.5)), act = up * den / (1 / (1 + Math.exp(-8 / 2.5))); return clamp(act, 0, 1.2) * Math.exp(-Math.pow((pH - po) / 1.6, 2)); };
      for (let i = 0; i < 24; i++) subs.push({ x: 470 + Math.random() * 300, y: 30 + Math.random() * 300, vx: Math.random() - .5, vy: Math.random() - .5, done: 0 });
      const M = K.motor(c, host, dt => {
        t += dt; const Pl = K.pal(), G = S.g, T0 = sT.v, pH = sp.v, r = rate(T0, pH), [, To] = ENZ[enz], denat = T0 > To + 10; prod += r * dt * 3; S.clear(Pl.bg2);
        const A = K.axes(G, [40, 20, 380, 160], [0, 95], [0, 1.3], { xl: '°C', yl: T('rate', 'المعدل'), xstep: 20 }); K.plot(G, A, x => rate(x, pH), 0, 95, Pl.violet, 3); G.fillStyle = Pl.red; G.beginPath(); G.arc(A.X(T0), A.Y(r), 7, 0, 7); G.fill();
        const B = K.axes(G, [40, 210, 380, 140], [1, 12], [0, 1.3], { xl: 'pH', ystep: 0.5, xstep: 1 }); K.plot(G, B, x => rate(T0, x), 1, 12, Pl.teal, 3); G.fillStyle = Pl.red; G.beginPath(); G.arc(B.X(pH), B.Y(r), 7, 0, 7); G.fill();
        // enzyme and substrates
        const ex = 620, ey = 190, wob = denat ? 10 : 2; G.fillStyle = denat ? Pl.grey : Pl.blue; G.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, rr = 60 + Math.sin(a * 5 + t * (denat ? 6 : 1)) * wob; const notch = !denat && a > 5.6 && a < 6.28 ? -26 : 0; G.lineTo(ex + Math.cos(a) * (rr + notch), ey + Math.sin(a) * (rr + notch)); } G.closePath(); G.fill(); K.text(G, denat ? T('denatured', 'متمسخ') : T('active site', 'الموقع النشط'), ex, ey + 92, { a: 'center', c: Pl.muted, s: 12 });
        subs.forEach(s => { const sp2 = 0.4 + T0 / 40; s.x += s.vx * sp2; s.y += s.vy * sp2; if (s.x < 450 || s.x > 790) s.vx *= -1; if (s.y < 15 || s.y > 360) s.vy *= -1; if (!s.done && Math.hypot(s.x - (ex + 50), s.y - (ey - 14)) < 30 && Math.random() < r * 0.3) { s.done = 1; } G.fillStyle = s.done ? Pl.green : Pl.gold; if (s.done) { G.beginPath(); G.arc(s.x - 4, s.y, 5, 0, 7); G.arc(s.x + 5, s.y, 5, 0, 7); G.fill(); } else { G.fillRect(s.x - 7, s.y - 5, 14, 10); } });
        if (subs.every(s => s.done)) subs.forEach(s => { s.done = 0; });
        read.innerHTML = IL(`${ENZ[enz][0]} at **${Math.round(T0)} °C**, **pH ${fmt(pH, 1)}**: relative rate **${fmt(r, 2)}** (optimum ${To} °C, pH ${ENZ[enz][2]}). ${denat ? '**Denatured**: the active site has lost its shape.' : T0 < To - 15 ? 'Cold: slow collisions.' : ''}`);
      }).add(sT, sp);
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); enz = 'amylase'; sT.set(37, true); sp.set(7, true); M.play(); }, _rate: rate,
        observe() { const T0 = ctl.val.T, r = rate(T0, ctl.val.pH); return { text: `At ${T0} °C and pH ${fmt(ctl.val.pH, 1)}, relative rate **${fmt(r, 2)}**. For amylase the model peaks near 37 °C; at 70 °C the rate is ${fmt((() => { const o = enz; enz = 'amylase'; const v = rate(70, 6.8); enz = o; return v; })(), 3)} — denatured.`, predOk: p => p === 1 }; } };
    }
  };

  /* ============ 5 · Osmosis chamber ============ */
  D.osmosis = { wide: true,
    intro: 'A **partially permeable membrane** separates two solutions. Water molecules (small, blue) can pass through; sugar molecules (large, gold) cannot. Change the sugar on each side and watch where water goes and how the levels change.',
    predict: { q: 'The left side has more sugar dissolved. Water moves mainly…', options: ['to the left', 'to the right', 'not at all', 'both ways equally forever'] },
    explore: 'Put more sugar on the left. Then make both sides equal. Then put a “red blood cell” in pure water (lots of water outside).',
    explain: '**Osmosis** is the net movement of **water** across a partially permeable membrane from a **dilute** solution (higher water concentration) to a more **concentrated** one (lower water concentration). Water molecules cross both ways all the time; the **net** flow is towards the side with more solute, so its level rises. When the concentrations are equal, there is no net movement. A cell in pure water swells; in very salty water it shrinks.',
    apply: [q('x-os1', 'A plant cell is placed in concentrated salt solution. It will…', ['gain water', 'lose water', 'stay the same', 'burst'], 1, 'Water leaves towards the concentrated solution.'), q('x-os2', 'Osmosis involves the movement of…', ['solute', 'water', 'both', 'neither'], 1, 'Only water crosses.')],
    summary: ['Water moves from dilute to concentrated solution.', 'The membrane lets water through but not solute.', 'Equal concentrations: no net movement.'],
    build(host, c) {
      const S = K.stage(host, 800, 360); let sl = 18, sr = 4, W = [], sug = [], net = 0, flowLR = 0, flowRL = 0, tt = 0;
      const ctl = K.controls(host, [{ k: 'range', id: 'l', label: T('Sugar on the left', 'السكر يساراً'), min: 0, max: 30, step: 1, val: 18 }, { k: 'range', id: 'r', label: T('Sugar on the right', 'السكر يميناً'), min: 0, max: 30, step: 1, val: 4 }, { k: 'row' }, { k: 'btn', id: 'go', label: T('Reset the levels', 'أعد المستويات') }, { k: 'end' }], (id, v) => { if (id === 'l') sl = v; if (id === 'r') sr = v; init(); c.onChange(); });
      const read = readout(host);
      function init() { W = []; sug = []; net = 0; flowLR = flowRL = 0; tt = 0; for (let i = 0; i < 90; i++) W.push({ x: i < 45 ? 40 + Math.random() * 340 : 420 + Math.random() * 340, y: 0, vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, side: i < 45 ? 0 : 1, f: Math.random() }); for (let i = 0; i < sl; i++) sug.push({ x: 40 + Math.random() * 330, f: Math.random(), side: 0, vx: (Math.random() - .5), vy: (Math.random() - .5) }); for (let i = 0; i < sr; i++) sug.push({ x: 430 + Math.random() * 330, f: Math.random(), side: 1, vx: (Math.random() - .5), vy: (Math.random() - .5) }); }
      init();
      const M = K.motor(c, host, dt => {
        tt += dt; const Pl = K.pal(), G = S.g; S.clear(Pl.bg2);
        const nL = W.filter(w => w.side === 0).length, nR = W.length - nL, hL = 120 + nL * 2.4, hR = 120 + nR * 2.4, base = 340;
        G.fillStyle = 'rgba(80,150,255,.15)'; G.fillRect(30, base - hL, 360, hL); G.fillRect(410, base - hR, 360, hR); G.strokeStyle = Pl.ink; G.lineWidth = 2; G.strokeRect(30, 20, 740, 320);
        G.setLineDash([6, 5]); G.strokeStyle = Pl.violet; G.lineWidth = 3; G.beginPath(); G.moveTo(400, 20); G.lineTo(400, 340); G.stroke(); G.setLineDash([]);
        const cL = sl / Math.max(1, nL), cR = sr / Math.max(1, nR);
        W.forEach(w => { w.x += w.vx * 1.6; w.f += w.vy * 0.004; const h = w.side ? hR : hL, x0 = w.side ? 410 : 30; if (w.f < 0.02 || w.f > 0.98) w.vy *= -1;
          if (w.side === 0 && w.x > 396) { // attempt to cross left→right; blocked more often by solute pulling water (solute binds water) on the destination side being lower
            if (Math.random() < 0.5 * (1 + (cR - cL) * 1.2)) { w.side = 1; w.x = 404; flowLR++; } else { w.vx *= -1; w.x = 395; } }
          else if (w.side === 1 && w.x < 404) { if (Math.random() < 0.5 * (1 + (cL - cR) * 1.2)) { w.side = 0; w.x = 396; flowRL++; } else { w.vx *= -1; w.x = 405; } }
          if (w.side === 0 && w.x < 34) w.vx = Math.abs(w.vx); if (w.side === 1 && w.x > 766) w.vx = -Math.abs(w.vx);
          const y = base - clamp(w.f, 0, 1) * (w.side ? hR : hL); G.fillStyle = Pl.blue; G.beginPath(); G.arc(w.x, y, 3.2, 0, 7); G.fill(); });
        sug.forEach(s => { s.x += s.vx; s.f += s.vy * 0.004; if (s.f < 0.03 || s.f > 0.97) s.vy *= -1; const lo = s.side ? 410 : 36, hi = s.side ? 764 : 390; if (s.x < lo || s.x > hi) s.vx *= -1; const y = base - clamp(s.f, 0, 1) * (s.side ? hR : hL); G.fillStyle = Pl.gold; G.beginPath(); G.arc(s.x, y, 7, 0, 7); G.fill(); });
        K.text(G, `${T('left', 'يسار')}: ${sl} ${T('sugar', 'سكر')}, ${nL} ${T('water', 'ماء')}`, 40, 42, { w: 700 }); K.text(G, `${T('right', 'يمين')}: ${sr} ${T('sugar', 'سكر')}, ${nR} ${T('water', 'ماء')}`, 420, 42, { w: 700 });
        net = flowLR - flowRL; read.innerHTML = IL(`Crossings so far: left → right **${flowLR}**, right → left **${flowRL}** (net **${net > 0 ? 'to the right' : net < 0 ? 'to the left' : 'none'}**, ${Math.abs(net)}). ${sl === sr ? 'Equal sugar: water moves both ways about equally.' : `More sugar on the **${sl > sr ? 'left' : 'right'}** — water drifts there and that side rises.`} (Model: random crossings biased by the solute difference.)`);
      });
      M.play();
      return { play() { M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); sl = 18; sr = 4; init(); M.play(); }, _net: () => flowLR - flowRL,
        observe() { const nL = W.filter(w => w.side === 0).length; return { text: `With ${sl} sugar on the left and ${sr} on the right, the left now holds **${nL}** water particles (started with 45) — net movement **${nL > 45 ? 'into the more concentrated left side' : nL < 45 ? 'to the right' : 'zero'}**.`, predOk: sl > sr ? p => p === 0 : null }; } };
    }
  };

  /* ============ 6 · Nerve impulse ============ */
  D.neuron = { wide: true,
    intro: 'Stimulate a neuron. If the stimulus pushes the membrane past the **threshold**, an **action potential** fires and travels along the axon. Compare an axon with and without its fatty **myelin sheath**.',
    predict: { q: 'A stimulus twice as strong as the threshold produces an action potential that is…', options: ['twice as tall', 'the same size — all or nothing', 'half as tall', 'slower'] },
    explore: 'Find the weakest stimulus that fires. Then try a very strong one — does the spike get bigger? Switch myelin on and race the impulses.',
    explain: 'A neuron’s membrane rests at about **−70 mV**. A stimulus depolarises it; if it reaches the **threshold (about −55 mV)**, sodium channels open and the membrane shoots up to about **+30 mV**, then potassium channels restore it (with a brief undershoot). The spike is **all or nothing**: a stronger stimulus does not make a bigger spike (it can make more frequent spikes). In a **myelinated** axon the impulse jumps between gaps (nodes of Ranvier) — **saltatory conduction** — so it travels much faster. Speeds shown are typical orders of magnitude.',
    apply: [q('x-ne1', 'The resting potential of a neuron is about…', ['+30 mV', '0 mV', '−70 mV', '−200 mV'], 2, 'Inside negative relative to outside.'), q('x-ne2', 'Myelin speeds up conduction because the impulse…', ['jumps between nodes', 'is bigger', 'uses more sodium', 'skips the synapse'], 0, 'Saltatory conduction.')],
    summary: ['Below threshold: no spike. Above: a full spike — all or nothing.', 'Na⁺ in (rise), K⁺ out (fall).', 'Myelin → saltatory conduction → faster.'],
    build(host, c) {
      const S = K.stage(host, 800, 380); let stim = 12, myel = false, fired = [], tt = 0, pulse = null, fires = 0, sub = 0;
      const ctl = K.controls(host, [{ k: 'range', id: 's', label: T('Stimulus strength (mV of depolarisation)', 'قوة المنبه'), min: 0, max: 40, step: 1, val: 12, unit: ' mV' }, { k: 'toggle', id: 'm', label: T('Myelinated axon', 'محور مغلف بالميالين'), val: false }, { k: 'row' }, { k: 'btn', id: 'go', label: T('Stimulate ⚡', 'حفّز ⚡'), accent: true }, { k: 'end' }], (id, v) => { if (id === 's') stim = v; if (id === 'm') myel = v; if (id === 'go') { pulse = { t0: tt, s: stim, m: myel }; if (stim >= 15) fires++; else sub++; M.play(); } c.onChange(); });
      const read = readout(host);
      const Vm = (t, s) => { if (t < 0) return -70; if (s < 15) return -70 + s * Math.exp(-t / 2) * (t < 1 ? t : 1); if (t < 0.5) return -70 + 15 * t / 0.5; if (t < 1.2) return -55 + 85 * (t - 0.5) / 0.7; if (t < 2.4) return 30 - 110 * (t - 1.2) / 1.2; if (t < 5) return -80 + 10 * (t - 2.4) / 2.6; return -70; };
      const M = K.motor(c, host, dt => {
        tt += dt; const Pl = K.pal(), G = S.g; S.clear(Pl.bg2);
        const A = K.axes(G, [60, 20, 700, 170], [0, 8], [-90, 40], { xl: 'ms', yl: 'mV', ystep: 20, xstep: 1 });
        G.strokeStyle = Pl.red; G.setLineDash([5, 4]); G.beginPath(); G.moveTo(A.X(0), A.Y(-55)); G.lineTo(A.X(8), A.Y(-55)); G.stroke(); G.setLineDash([]); K.tag(G, T('threshold −55 mV', 'العتبة'), A.X(7), A.Y(-55) - 12, Pl.red);
        if (pulse) { const el = (tt - pulse.t0) * 3; G.strokeStyle = Pl.violet; G.lineWidth = 3; G.beginPath(); for (let x = 0; x <= Math.min(8, el); x += 0.02) { const v = Vm(x - 1, pulse.s); x ? G.lineTo(A.X(x), A.Y(v)) : G.moveTo(A.X(x), A.Y(v)); } G.stroke(); }
        // axon
        const y = 290; G.fillStyle = 'rgba(240,200,150,.5)'; G.fillRect(40, y - 18, 720, 36); if (myel || (pulse && pulse.m)) { for (let x = 50; x < 750; x += 70) { G.fillStyle = 'rgba(250,240,210,.95)'; K.rr(G, x, y - 26, 56, 52, 18); G.fill(); } }
        G.fillStyle = Pl.ink; K.text(G, T('cell body', 'جسم الخلية'), 40, y + 52, { s: 12, c: Pl.muted }); G.beginPath(); G.arc(30, y, 26, 0, 7); G.fillStyle = 'rgba(240,180,120,.9)'; G.fill();
        if (pulse && pulse.s >= 15) { const speed = pulse.m ? 100 : 2, sec = (tt - pulse.t0) / 1.5, px = 40 + (pulse.m ? Math.floor(sec * 10) * 70 : sec * 120); if (px < 770) { G.fillStyle = 'rgba(255,200,40,.9)'; G.beginPath(); G.arc(px + (pulse.m ? 63 : 0), y, 14, 0, 7); G.fill(); K.text(G, '⚡', px + (pulse.m ? 63 : 0), y + 5, { a: 'center' }); } K.text(G, `${T('typical speed', 'السرعة النموذجية')}: ${pulse.m ? '~100 m/s' : '~2 m/s'} (${T('animation slowed', 'الحركة مبطأة')})`, 400, 360, { a: 'center', c: Pl.muted, s: 12 }); if (px >= 770 && tt - pulse.t0 > 6) M.pause(); }
        else if (pulse && tt - pulse.t0 > 4) M.pause();
        read.innerHTML = IL(pulse ? (pulse.s >= 15 ? `Stimulus **${pulse.s} mV** raised the membrane from −70 to ${-70 + pulse.s} mV — past threshold: a full action potential to **+30 mV**${pulse.m ? ', jumping node to node along the myelinated axon' : ''}.` : `Stimulus **${pulse.s} mV** only reached ${-70 + pulse.s} mV — **below threshold**, no action potential.`) : 'Choose a strength and press Stimulate.');
      });
      M.draw();
      return { play() { pulse = { t0: tt, s: stim, m: myel }; M.play(); }, pause() { M.pause(); }, running: () => M.playing(), destroy() { S.destroy(); }, reset() { ctl.reset(); stim = 12; myel = false; pulse = null; fires = 0; sub = 0; M.draw(); }, _Vm: Vm,
        observe() { return { text: `Stimulations that fired: **${fires}**; below threshold: **${sub}**. Every spike that fired peaked at the same **+30 mV**, however strong the stimulus.`, predOk: fires ? p => p === 1 : null }; } };
    }
  };
})();
