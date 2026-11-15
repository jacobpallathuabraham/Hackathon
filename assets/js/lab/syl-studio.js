/* ERLY Noor Lab — models added for the Interactive Learning Studio (v19).
   algebra balance · fraction bars · cell explorer · reaction balancing. Built on the syllabus spec framework
   (syl-core.js), so they work in the Visual Learning Lab, in lessons and in Noor's chat alike. */
(function () {
  'use strict';
  const L = window.ERLY_LAB; if (!L || !L.syl || !L.syl.def) return;
  const Y = L.syl, T = Y.T, f3 = Y.f3, P = s => `<p>${s}</p>`;
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };

  /* ---------- algebra balance: a·x + b = c·x + d ---------- */
  const bal = S => { const left = S.a * S.x + S.b, right = S.c * S.x + S.d, sol = S.a !== S.c ? (S.d - S.b) / (S.a - S.c) : null; return { left, right, diff: left - right, solution: sol, balanced: Math.abs(left - right) < 1e-9, same: S.a === S.c && S.b === S.d }; };
  Y.def({ id: 'balance', kind: 'Maths · Algebra', title: T('Algebra balance: solving linear equations', 'ميزان الجبر'), unit: 'School · Linear equations', probe: 'show me how to solve 3x + 2 = x + 10 with a balance',
    rx: /\b(algebra (balance|scales?)|balance (model|method|scales?)|balanc\w+ (an |the )?equations?|solve .*\bx\b.* (with|using) (a )?balance|keep both sides (equal|balanced)|do the same to both sides)\b/i, score: 0.95,
    p: [['a', T('x-boxes on the left (a)', 'صناديق x يساراً'), '', 0, 6, 1, 3], ['b', T('weights on the left (b)', 'أوزان يساراً'), '', 0, 12, 1, 2], ['c', T('x-boxes on the right (c)', 'صناديق x يميناً'), '', 0, 6, 1, 1], ['d', T('weights on the right (d)', 'أوزان يميناً'), '', 0, 20, 1, 10], ['x', T('try a value of x', 'جرّب قيمة x'), '', 0, 10, 0.5, 1]],
    parse: t => { const m = String(t).replace(/\s+/g, '').match(/(\d*)x\+(\d+)=(\d*)x\+(\d+)/i); return m ? { a: m[1] === '' ? 1 : +m[1], b: +m[2], c: m[3] === '' ? 1 : +m[3], d: +m[4] } : {}; },
    view: { x0: -10, x1: 10, y0: -2, y1: 8 }, equal: true, grid: false, labels: { x: '', y: '' },
    draw(p, S, c, H) {
      const r = bal(S), tilt = Math.max(-0.35, Math.min(0.35, -r.diff * 0.03)); // heavier side goes down
      const ax = (dx) => [dx * Math.cos(tilt), 3 + dx * Math.sin(tilt)];
      p.path([[-1.2, 0], [0, 3], [1.2, 0]], c.muted, { w: 3 });
      p.path([ax(-7.5), ax(7.5)], c.ink, { w: 4 });
      [[-5, S.a, S.b, c.pal[0]], [5, S.c, S.d, c.pal[1]]].forEach(([cx, nx, nw, col]) => {
        const [px, py] = ax(cx); p.path([[px - 2.6, py - 1.2], [px + 2.6, py - 1.2]], col, { w: 3 }); p.path([[px, py], [px, py - 1.2]], c.muted, { w: 1.5 });
        for (let i = 0; i < nx; i++) { const bx = px - 2.4 + (i % 3) * 1.0, by = py - 1.1 + Math.floor(i / 3) * 0.95; H.poly(p, [[bx, by], [bx + 0.85, by], [bx + 0.85, by + 0.85], [bx, by + 0.85]], col, { w: 1.5, fill: col }); p.text(bx + 0.42, by + 0.3, 'x', '#fff', { align: 'center', font: '700 11px ui-sans-serif, system-ui' }); }
        for (let i = 0; i < nw; i++) { const wx = px + 0.4 + (i % 5) * 0.45, wy = py - 1.1 + Math.floor(i / 5) * 0.5; H.circle(p, wx + 0.2, wy + 0.22, 0.2, c.ink, { w: 1, fill: c.ink }); }
      });
      H.lab(p, 0, 7.2, `${S.a}x + ${S.b}  ${r.balanced ? '=' : r.diff > 0 ? '>' : '<'}  ${S.c}x + ${S.d}   (x = ${f3(S.x)})`, r.balanced ? c.pal[2] : c.ink, { align: 'center', font: '700 14px ui-sans-serif, system-ui' });
    },
    ro: S => { const r = bal(S); return [[T('left side', 'اليسار'), f3(r.left)], [T('right side', 'اليمين'), f3(r.right)], [T('balanced?', 'متوازن؟'), r.balanced ? T('yes', 'نعم') : T('no', 'لا')], [T('solution', 'الحل'), r.same ? T('every x (identical sides)', 'كل x') : r.solution == null ? T('none (parallel)', 'لا حل') : 'x = ' + f3(r.solution)]]; },
    st: S => bal(S),
    intro: S => { const r = bal(S); return r.same ? T('Both sides are identical, so every value of x balances.', 'الطرفان متطابقان.') : r.solution == null ? T('Same number of x-boxes on each side but different weights: no value of x can balance it.', 'لا حل.') : T(`Take ${Math.min(S.a, S.c)} x-box(es) and ${Math.min(S.b, S.d)} weight(s) off both sides — the balance stays level — leaving ${Math.abs(S.a - S.c)}x on one side and ${Math.abs(S.d - S.b)} on the other, so x = ${f3(r.solution)}. With x = ${f3(S.x)} the ${r.balanced ? 'scales balance' : r.diff > 0 ? 'left side is heavier' : 'right side is heavier'}.`, 'أزل نفس الكمية من الطرفين.'); },
    ex: () => P(T('Whatever you do to one side you must do to the other: subtract the same x-boxes and weights from both pans, then share what is left equally between the remaining boxes.', 'افعل الشيء نفسه للطرفين.')), assume: T('Whole-number boxes and weights; x is the unknown weight of one box (it can be fractional).', 'أوزان صحيحة.') });

  /* ---------- fraction bars ---------- */
  const frac = S => { const A = S.n1 / S.d1, B = S.n2 / S.d2, lcm = S.d1 * S.d2 / gcd(S.d1, S.d2); let n, d; if (S.op === 'add') { n = S.n1 * lcm / S.d1 + S.n2 * lcm / S.d2; d = lcm; } else if (S.op === 'sub') { n = S.n1 * lcm / S.d1 - S.n2 * lcm / S.d2; d = lcm; } else if (S.op === 'mul') { n = S.n1 * S.n2; d = S.d1 * S.d2; } else { n = null; d = null; } const g = n != null ? gcd(n, d) : 1; return { A, B, lcm, num: n != null ? n / g : null, den: d != null ? d / g : null, value: n != null ? n / d : null, cmp: Math.abs(A - B) < 1e-12 ? '=' : A > B ? '>' : '<' }; };
  Y.def({ id: 'fractions', kind: 'Maths · Number', title: T('Fraction bars: compare, add, subtract, multiply', 'أشرطة الكسور'), unit: 'School · Fractions', probe: 'show me how to add 1/3 and 1/4 with fraction bars',
    rx: /\b(fractions? (bars?|walls?|visuali[sz]\w*|models?)|equivalent fractions?|(add|adding|subtract\w*|compar\w+|multiply\w*) (two )?fractions?|common denominators?|lowest common denominator|which is (bigger|larger),? \d+\/\d+)\b/i, score: 0.95,
    p: [['n1', T('first numerator', 'البسط الأول'), '', 0, 12, 1, 1], ['d1', T('first denominator', 'المقام الأول'), '', 1, 12, 1, 3], ['n2', T('second numerator', 'البسط الثاني'), '', 0, 12, 1, 1], ['d2', T('second denominator', 'المقام الثاني'), '', 1, 12, 1, 4]],
    sel: [['op', T('operation', 'العملية'), [['cmp', T('compare', 'مقارنة'), /compar|bigger|larger/i], ['add', T('add', 'جمع'), /\badd|plus|sum/i], ['sub', T('subtract', 'طرح'), /subtract|minus|difference/i], ['mul', T('multiply', 'ضرب'), /multipl|times|of\b/i]], 'add']],
    parse: t => { const m = [...String(t).matchAll(/(\d+)\s*\/\s*(\d+)/g)]; return m.length >= 2 ? { n1: +m[0][1], d1: +m[0][2], n2: +m[1][1], d2: +m[1][2] } : {}; },
    view: { x0: -0.6, x1: 10.6, y0: -0.5, y1: 6.2 }, grid: false, labels: { x: '', y: '' },
    draw(p, S, c, H) {
      const r = frac(S), W = 10;
      const bar = (y, n, d, col, label) => { for (let i = 0; i < d; i++) { const x0 = W * i / d, x1 = W * (i + 1) / d; H.poly(p, [[x0, y], [x1, y], [x1, y + 0.8], [x0, y + 0.8]], c.line || c.muted, { w: 1, fill: i < n ? col : 'rgba(0,0,0,0)' }); } H.lab(p, -0.1, y + 1.0, label, col, {}); };
      bar(4.6, Math.min(S.n1, S.d1), S.d1, c.pal[0], `${S.n1}/${S.d1}${S.n1 > S.d1 ? T(' (more than one whole — first whole shown)', ' (أكبر من واحد)') : ''}`);
      bar(2.9, Math.min(S.n2, S.d2), S.d2, c.pal[1], `${S.n2}/${S.d2}`);
      if (S.op === 'add' || S.op === 'sub') { bar(1.2, 0, r.lcm, c.pal[2], `${T('common denominator', 'المقام المشترك')}: ${r.lcm}  →  ${S.n1 * r.lcm / S.d1}/${r.lcm} ${S.op === 'add' ? '+' : '−'} ${S.n2 * r.lcm / S.d2}/${r.lcm}`); const k = Math.max(0, Math.min(r.lcm, r.num * r.lcm / r.den)); for (let i = 0; i < k; i++) { const x0 = W * i / r.lcm, x1 = W * (i + 1) / r.lcm; H.poly(p, [[x0, 0.2], [x1, 0.2], [x1, 1.0], [x0, 1.0]], c.pal[2], { w: 1, fill: c.pal[2] }); } }
      H.lab(p, 5, 6.0, S.op === 'cmp' ? `${S.n1}/${S.d1} ${r.cmp} ${S.n2}/${S.d2}` : `= ${r.num}/${r.den}${r.den === 1 ? '' : ''}  (${f3(r.value)})`, c.ink, { align: 'center', font: '700 15px ui-sans-serif, system-ui' });
    },
    ro: S => { const r = frac(S); return [[T('first', 'الأول'), `${S.n1}/${S.d1} = ${f3(r.A)}`], [T('second', 'الثاني'), `${S.n2}/${S.d2} = ${f3(r.B)}`], [T('result', 'النتيجة'), S.op === 'cmp' ? r.cmp : `${r.num}/${r.den}`], [T('lowest common denominator', 'المقام المشترك الأصغر'), r.lcm]]; },
    st: S => frac(S),
    intro: S => { const r = frac(S); return S.op === 'cmp' ? T(`Rewrite both over ${r.lcm}: ${S.n1 * r.lcm / S.d1}/${r.lcm} and ${S.n2 * r.lcm / S.d2}/${r.lcm}, so ${S.n1}/${S.d1} ${r.cmp} ${S.n2}/${S.d2}.`, 'وحّد المقامات.') : S.op === 'mul' ? T(`Multiply tops and bottoms: (${S.n1}×${S.n2})/(${S.d1}×${S.d2}) = ${r.num}/${r.den} in lowest terms — “${S.n1}/${S.d1} of ${S.n2}/${S.d2}”.`, 'اضرب البسط بالبسط.') : T(`Only same-sized pieces can be ${S.op === 'add' ? 'added' : 'subtracted'}: cut both into ${r.lcm}ths, then count — ${r.num}/${r.den}.`, 'وحّد المقامات ثم احسب.'); },
    ex: () => P(T('a/b ± c/d = (a·L/b ± c·L/d)/L with L = lcm(b, d);  a/b × c/d = ac/bd;  then divide top and bottom by their greatest common factor.', 'قواعد الكسور.')), assume: T('Whole-number numerators and denominators (denominators ≥ 1). Bars show at most one whole.', 'بسط ومقام صحيحان.') });

  /* ---------- cell explorer ---------- */
  const ORG = {
    nucleus: [T('Nucleus', 'النواة'), T('Holds the DNA and controls the cell’s activities; surrounded by a double membrane (the nuclear envelope).', 'تحتوي الحمض النووي.'), 'both'],
    membrane: [T('Cell membrane', 'الغشاء الخلوي'), T('A thin, partially permeable layer that controls what enters and leaves the cell.', 'يتحكم بما يدخل ويخرج.'), 'both'],
    cytoplasm: [T('Cytoplasm', 'السيتوبلازم'), T('Jelly-like fluid where many chemical reactions happen.', 'سائل تحدث فيه التفاعلات.'), 'both'],
    mito: [T('Mitochondria', 'الميتوكوندريا'), T('Sites of aerobic respiration, releasing energy (as ATP) from glucose.', 'موقع التنفس الهوائي.'), 'both'],
    ribo: [T('Ribosomes', 'الريبوسومات'), T('Make proteins by joining amino acids; found free or on the rough ER.', 'تصنع البروتينات.'), 'both'],
    er: [T('Endoplasmic reticulum', 'الشبكة الإندوبلازمية'), T('Network of membranes: rough ER (with ribosomes) processes proteins; smooth ER makes lipids.', 'شبكة أغشية.'), 'both'],
    golgi: [T('Golgi apparatus', 'جهاز غولجي'), T('Modifies, packages and sends proteins and lipids to where they are needed.', 'يعدّل ويغلّف البروتينات.'), 'both'],
    wall: [T('Cell wall', 'الجدار الخلوي'), T('Made of cellulose in plants; strengthens the cell and stops it bursting.', 'من السليلوز.'), 'plant'],
    chloro: [T('Chloroplasts', 'البلاستيدات الخضراء'), T('Contain chlorophyll and carry out photosynthesis.', 'تقوم بالبناء الضوئي.'), 'plant'],
    vacuole: [T('Large vacuole', 'الفجوة الكبيرة'), T('Filled with cell sap; keeps the cell firm (turgid). Animal cells only have small, temporary vacuoles.', 'تحافظ على صلابة الخلية.'), 'plant'],
    centriole: [T('Centrioles', 'المريكزات'), T('Help organise the spindle during cell division in animal cells.', 'تنظم المغزل.'), 'animal']
  };
  const cellSt = S => { const list = Object.keys(ORG).filter(k => ORG[k][2] === 'both' || ORG[k][2] === S.cell); return { organelles: list, count: list.length, hasWall: list.includes('wall'), hasChloroplasts: list.includes('chloro'), focus: S.focus, focusIn: list.includes(S.focus) }; };
  Y.def({ id: 'cell', kind: 'Biology · Cells', title: T('Cell explorer: organelles of plant and animal cells', 'مستكشف الخلية'), unit: 'School / NEET · Cell structure', probe: 'show me the organelles in a plant cell and what each one does',
    rx: /\b(cell (explorer|organelles?|structure|diagram)|organelles?|plant (and|vs|versus) animal cells?|animal (and|vs|versus) plant cells?|parts of (a|the) cell|(plant|animal) cells?)\b/i, not: /\b(cell division|mitosis|meiosis|electrochemical|galvanic|fuel cell|solar cell|unit cell)\b/i, score: 0.95,
    sel: [['cell', T('cell type', 'نوع الخلية'), [['animal', T('animal cell', 'خلية حيوانية'), /animal/i], ['plant', T('plant cell', 'خلية نباتية'), /plant|leaf/i]], 'plant'], ['focus', T('organelle to explore', 'العضية'), Object.entries(ORG).map(([k, v]) => [k, v[0], new RegExp('\\b' + v[0].toLowerCase().split(' ')[0].replace(/s$/, '') + 's?\\b', 'i')]), 'nucleus']],
    tog: [['labels', T('show labels', 'أظهر التسميات'), true, /label/i]],
    view: { x0: -10, x1: 10, y0: -6.5, y1: 6.5 }, equal: true, grid: false, labels: { x: '', y: '' },
    draw(p, S, c, H) {
      const plant = S.cell === 'plant', hi = k => S.focus === k, col = k => (hi(k) ? c.pal[3] : c.muted), lw = k => (hi(k) ? 3.5 : 1.6);
      const label = (k, x, y, tx, ty) => { if (!S.labels && !hi(k)) return; p.path([[x, y], [tx, ty]], hi(k) ? c.pal[3] : c.line || c.muted, { w: 1 }); H.lab(p, tx + (tx > 0 ? 0.15 : -0.15), ty - 0.15, ORG[k][0], hi(k) ? c.pal[3] : c.ink, { align: tx > 0 ? 'left' : 'right' }); };
      if (plant) { H.poly(p, [[-6.2, -4.6], [6.2, -4.6], [6.2, 4.6], [-6.2, 4.6]], col('wall'), { w: hi('wall') ? 5 : 3.5 }); H.poly(p, [[-5.8, -4.2], [5.8, -4.2], [5.8, 4.2], [-5.8, 4.2]], col('membrane'), { w: lw('membrane'), fill: hi('cytoplasm') ? 'rgba(234,170,0,.18)' : 'rgba(120,160,120,.10)' }); }
      else { const r = t => 5.2 + 0.5 * Math.sin(3 * t) + 0.3 * Math.cos(5 * t); H.param(p, t => r(t) * Math.cos(t) * 1.15, t => r(t) * Math.sin(t) * 0.8, 0, 2 * Math.PI, col('membrane'), { w: lw('membrane'), fill: hi('cytoplasm') ? 'rgba(234,170,0,.18)' : 'rgba(200,120,120,.10)' }); }
      if (plant) H.poly(p, [[-1.0, -3.4], [4.8, -3.4], [4.8, 2.6], [-1.0, 2.6]], col('vacuole'), { w: lw('vacuole'), fill: 'rgba(80,150,220,.18)' });
      const nx = plant ? -3.4 : -0.6, ny = plant ? 1.6 : 0.4; H.circle(p, nx, ny, 1.5, col('nucleus'), { w: lw('nucleus'), fill: 'rgba(120,80,200,.22)' }); H.circle(p, nx + 0.3, ny + 0.2, 0.45, col('nucleus'), { w: 1, fill: 'rgba(120,80,200,.45)' });
      const mitoAt = plant ? [[-4.6, -2.4], [-2.4, -3.1]] : [[2.6, 1.8], [-3.6, -1.6], [3.0, -2.0]]; mitoAt.forEach(([x, y]) => { H.param(p, t => x + 0.85 * Math.cos(t), t => y + 0.38 * Math.sin(t), 0, 2 * Math.PI, col('mito'), { w: lw('mito'), fill: 'rgba(230,110,60,.28)' }); p.path([[x - 0.6, y], [x - 0.3, y + 0.2], [x, y - 0.2], [x + 0.3, y + 0.2], [x + 0.6, y]], col('mito'), { w: 1 }); });
      if (plant) [[-4.8, -0.6], [2.6, 3.4], [-2.0, 3.5], [5.2, -0.4]].forEach(([x, y]) => H.param(p, t => x + 0.7 * Math.cos(t), t => y + 0.32 * Math.sin(t), 0, 2 * Math.PI, col('chloro'), { w: lw('chloro'), fill: 'rgba(40,160,70,.55)' }));
      const erx = plant ? -1.4 : 0.9, ery = plant ? 0.5 : 0.4; [0, 0.55, 1.1].forEach(k => H.param(p, t => erx + 0.4 + k + 0.25 * Math.sin(t * 3), t => ery - 1.2 + t * 0.9, 0, 2.6, col('er'), { w: lw('er') }));
      const gx = plant ? -2.8 : -2.6, gy = plant ? -1.2 : 2.6; [0, 0.32, 0.64].forEach(k => H.param(p, t => gx - 0.8 + t * 1.6, t => gy + k - 0.25 * Math.sin(t * Math.PI / 1.0), 0, 1, col('golgi'), { w: lw('golgi') }));
      [[erx + 0.2, ery - 1.0], [erx + 1.6, ery + 0.6], [1.8, -3.6], [-4.0, 3.0], [3.8, 0.4]].forEach(([x, y]) => H.circle(p, x, y, 0.09, col('ribo'), { w: 1, fill: hi('ribo') ? c.pal[3] : c.ink }));
      if (!plant) [[0.4, -2.8], [0.8, -2.6]].forEach(([x, y]) => H.poly(p, [[x - 0.12, y - 0.4], [x + 0.12, y - 0.4], [x + 0.12, y + 0.4], [x - 0.12, y + 0.4]], col('centriole'), { w: lw('centriole'), fill: 'rgba(80,80,80,.4)' }));
      label('nucleus', nx, ny + 1.5, nx - 2.5, 5.8); label('membrane', plant ? 5.8 : 5.4, plant ? 3.6 : 2.4, 7.0, 5.4); if (plant) label('wall', -6.2, -3.8, -8.4, -5.6); label('mito', mitoAt[0][0], mitoAt[0][1], mitoAt[0][0] < 0 ? -8.6 : 7.4, mitoAt[0][1] - 0.4);
      if (plant) { label('chloro', 2.6, 3.4, 6.8, 6.0); label('vacuole', 3.8, -1.6, 7.0, -3.4); } else label('centriole', 0.8, -2.6, 2.8, -5.6);
      label('er', erx + 1.4, ery, 7.2, plant ? 1.2 : 0.4); label('golgi', gx + 0.8, gy, plant ? -8.6 : -8.2, plant ? -0.6 : 4.0); label('ribo', 3.8, 0.4, 7.4, plant ? -1.4 : -1.4); label('cytoplasm', plant ? 1.5 : 1.5, plant ? -3.9 : 3.2, plant ? 0.8 : 4.2, plant ? -6.2 : 5.8);
    },
    ro: S => { const s = cellSt(S); return [[T('cell', 'الخلية'), S.cell === 'plant' ? T('plant', 'نباتية') : T('animal', 'حيوانية')], [T('selected', 'المحددة'), ORG[S.focus][0] + (s.focusIn ? '' : T(' — not found in this cell type', ' — غير موجودة'))], [T('job', 'الوظيفة'), ORG[S.focus][1]], [T('structures shown', 'البنى المعروضة'), s.count]]; },
    st: S => cellSt(S),
    intro: S => { const s = cellSt(S), o = ORG[S.focus]; return (s.focusIn ? T(`${o[0]}: ${o[1]}`, '') : T(`${o[0]} are not found in ${S.cell} cells. `, '') + o[1]) + ' ' + (S.cell === 'plant' ? T('Plant cells also have a cellulose cell wall, chloroplasts and a large permanent vacuole.', 'للخلايا النباتية جدار وبلاستيدات.') : T('Animal cells have no cell wall or chloroplasts, and only small temporary vacuoles.', 'لا جدار للخلايا الحيوانية.')); },
    ex: () => P(T('Both cell types: nucleus, cell membrane, cytoplasm, mitochondria, ribosomes, ER and Golgi. Plant cells add a cellulose wall, chloroplasts (not in every plant cell — e.g. not in root cells) and a large permanent vacuole.', 'مقارنة الخليتين.')), assume: T('A schematic: organelles are not to scale, and real cells contain many more mitochondria, ribosomes and other structures.', 'رسم تخطيطي ليس بالمقياس.') });

  /* ---------- reaction balancing ---------- */
  const RX = {
    h2o: { name: 'H₂ + O₂ → H₂O', sp: [['H₂', { H: 2 }, 0], ['O₂', { O: 2 }, 0], ['H₂O', { H: 2, O: 1 }, 1]], ans: [2, 1, 2] },
    ch4: { name: 'CH₄ + O₂ → CO₂ + H₂O', sp: [['CH₄', { C: 1, H: 4 }, 0], ['O₂', { O: 2 }, 0], ['CO₂', { C: 1, O: 2 }, 1], ['H₂O', { H: 2, O: 1 }, 1]], ans: [1, 2, 1, 2] },
    nh3: { name: 'N₂ + H₂ → NH₃', sp: [['N₂', { N: 2 }, 0], ['H₂', { H: 2 }, 0], ['NH₃', { N: 1, H: 3 }, 1]], ans: [1, 3, 2] },
    fe: { name: 'Fe + O₂ → Fe₂O₃', sp: [['Fe', { Fe: 1 }, 0], ['O₂', { O: 2 }, 0], ['Fe₂O₃', { Fe: 2, O: 3 }, 1]], ans: [4, 3, 2] },
    c3h8: { name: 'C₃H₈ + O₂ → CO₂ + H₂O', sp: [['C₃H₈', { C: 3, H: 8 }, 0], ['O₂', { O: 2 }, 0], ['CO₂', { C: 1, O: 2 }, 1], ['H₂O', { H: 2, O: 1 }, 1]], ans: [1, 5, 3, 4] },
    al: { name: 'Al + HCl → AlCl₃ + H₂', sp: [['Al', { Al: 1 }, 0], ['HCl', { H: 1, Cl: 1 }, 0], ['AlCl₃', { Al: 1, Cl: 3 }, 1], ['H₂', { H: 2 }, 1]], ans: [2, 6, 2, 3] }
  };
  const balSt = S => {
    const R = RX[S.rx], k = R.sp.map((_, i) => S['k' + (i + 1)] || 1), el = {};
    R.sp.forEach((s, i) => Object.entries(s[1]).forEach(([e, n]) => { el[e] = el[e] || [0, 0]; el[e][s[2]] += n * k[i]; }));
    const balanced = Object.values(el).every(([a, b]) => a === b), g = k.reduce((a, b) => gcd(a, b));
    return { counts: el, coeffs: k, balanced, lowest: balanced && g === 1, answer: R.ans };
  };
  Y.def({ id: 'balancer', kind: 'Chemistry · Basic concepts', title: T('Balancing chemical equations', 'موازنة المعادلات الكيميائية'), unit: 'School / JEE · Some basic concepts in chemistry', probe: 'help me balance the equation CH4 + O2 → CO2 + H2O',
    rx: /\b(balanc\w*\s+(a |the |this |chemical )?(chemical )?equations?|balanced (chemical )?equations?|equation balanc\w*|stoichiometric coefficients?|conservation of atoms|balance (ch4|c3h8|h2|fe|al|n2)\b)/i, score: 0.96,
    sel: [['rx', T('reaction', 'التفاعل'), Object.entries(RX).map(([k, v]) => [k, v.name, new RegExp(k === 'h2o' ? '\\bh2 ?\\+ ?o2 ?(→|->|=) ?h2o|hydrogen and oxygen' : k === 'ch4' ? 'ch4|methane' : k === 'nh3' ? 'nh3|ammonia|haber' : k === 'fe' ? '\\bfe\\b|iron|rust' : k === 'c3h8' ? 'c3h8|propane' : '\\bal\\b|alumin', 'i')]), 'ch4']],
    p: [['k1', T('coefficient 1', 'المعامل ١'), '', 1, 10, 1, 1], ['k2', T('coefficient 2', 'المعامل ٢'), '', 1, 10, 1, 1], ['k3', T('coefficient 3', 'المعامل ٣'), '', 1, 10, 1, 1], ['k4', T('coefficient 4 (if the reaction has one)', 'المعامل ٤'), '', 1, 10, 1, 1]],
    view: { x0: 0, x1: 10, y0: -0.6, y1: 6.6 }, grid: false, labels: { x: '', y: '' },
    draw(p, S, c, H) {
      const R = RX[S.rx], s = balSt(S), els = Object.keys(s.counts);
      const eq = R.sp.map((x, i) => `${s.coeffs[i] === 1 ? '' : s.coeffs[i]}${x[0]}`); const ri = R.sp.findIndex(x => x[2] === 1);
      H.lab(p, 5, 6.1, eq.slice(0, ri).join(' + ') + '  →  ' + eq.slice(ri).join(' + '), s.balanced ? c.pal[2] : c.ink, { align: 'center', font: '700 16px ui-sans-serif, system-ui' });
      const maxN = Math.max(1, ...els.map(e => Math.max(...s.counts[e])));
      els.forEach((e, j) => { const y = 4.6 - j * 1.15, [a, b] = s.counts[e], w = 3.6; H.lab(p, 0.6, y - 0.1, e, c.ink, { font: '700 13px ui-sans-serif, system-ui' }); H.poly(p, [[1.4, y - 0.35], [1.4 + w * a / maxN, y - 0.35], [1.4 + w * a / maxN, y + 0.15], [1.4, y + 0.15]], c.pal[0], { w: 1, fill: c.pal[0] }); H.poly(p, [[5.6, y - 0.35], [5.6 + w * b / maxN, y - 0.35], [5.6 + w * b / maxN, y + 0.15], [5.6, y + 0.15]], c.pal[1], { w: 1, fill: c.pal[1] }); H.lab(p, 5.2, y - 0.1, a === b ? '=' : a > b ? '>' : '<', a === b ? c.pal[2] : c.pal[3], { align: 'center', font: '700 13px ui-sans-serif, system-ui' }); H.lab(p, 1.45 + w * a / maxN, y - 0.1, String(a), c.ink, {}); H.lab(p, 5.65 + w * b / maxN, y - 0.1, String(b), c.ink, {}); });
      H.lab(p, 2.6, -0.3, T('atoms in reactants', 'ذرات المتفاعلات'), c.pal[0], { align: 'center' }); H.lab(p, 7.4, -0.3, T('atoms in products', 'ذرات النواتج'), c.pal[1], { align: 'center' });
    },
    ro: S => { const s = balSt(S), R = RX[S.rx]; return [[T('reaction', 'التفاعل'), R.name], [T('your coefficients', 'معاملاتك'), s.coeffs.slice(0, R.sp.length).join(' : ')], ...Object.entries(s.counts).map(([e, [a, b]]) => [e, `${a} → ${b}${a === b ? ' ✓' : ''}`]), [T('balanced?', 'متوازنة؟'), s.balanced ? (s.lowest ? T('yes, in lowest whole numbers', 'نعم بأصغر أعداد') : T('balanced — but divide by a common factor', 'متوازنة — بسّطها')) : T('not yet', 'ليس بعد')]]; },
    st: S => balSt(S),
    intro: S => { const s = balSt(S), off = Object.entries(s.counts).filter(([, [a, b]]) => a !== b).map(([e]) => e); return s.balanced ? T(`Balanced: every element has the same number of atoms on both sides, so mass is conserved.${s.lowest ? '' : ' The coefficients share a common factor — divide them all by it.'}`, 'متوازنة.') : T(`Not balanced yet: ${off.join(', ')} ${off.length === 1 ? 'differs' : 'differ'} between the two sides. Change the coefficients (the big numbers in front), never the small subscripts — those would change the substances.`, 'غيّر المعاملات لا الأرقام الصغيرة.'); },
    ex: () => P(T('Atoms are neither created nor destroyed in a reaction, so each element must appear the same number of times on both sides. Tip: balance elements that appear in only one substance on each side first, and leave lone elements such as O₂ or H₂ until last.', 'الذرات لا تُستحدث ولا تفنى.')), assume: T('Whole-number coefficients from 1 to 10; coefficient 4 is ignored for reactions with three substances.', 'معاملات صحيحة.') });
})();
