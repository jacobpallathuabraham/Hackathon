/* ERLY Learning Studio — experiences for biology, history, geography, English, languages and social science.
   Loaded with ls-exp.js on first use. Facts are stated with their certainty; simplifications are named on the page. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, IL = LS.inline, D = LS.exp.DEFS;
  const fmt = (v, d) => v.toFixed(d == null ? 1 : d);

  /* ================= BIOLOGY · journey of a red blood cell ================= */
  const STOPS = [
    ['Body tissues', 'The cell has just given up its oxygen to working muscle. It is now **oxygen-poor**.', 0, [200, 285]],
    ['Vena cava', 'The large vein that returns blood from the body to the heart.', 0, [70, 250]],
    ['Right atrium', 'The first chamber on the heart’s right side (drawn on the viewer’s left).', 0, [125, 150]],
    ['Tricuspid valve → right ventricle', 'The valve opens; the atrium squeezes the blood down into the right ventricle. The valve then shuts so blood cannot flow back.', 0, [125, 205]],
    ['Pulmonary artery', 'The right ventricle contracts and pushes blood through the pulmonary valve into the pulmonary artery — an artery carrying **oxygen-poor** blood.', 0, [150, 75]],
    ['Lungs', 'In the lung capillaries, carbon dioxide diffuses out and oxygen diffuses in. The cell is now **oxygen-rich**.', 1, [200, 30]],
    ['Pulmonary vein', 'Oxygen-rich blood returns to the heart — a vein carrying **oxygen-rich** blood.', 1, [250, 75]],
    ['Left atrium', 'The first chamber on the heart’s left side (drawn on the viewer’s right).', 1, [275, 150]],
    ['Mitral valve → left ventricle', 'Through the mitral (bicuspid) valve into the left ventricle — the chamber with the thickest wall.', 1, [275, 205]],
    ['Aorta', 'The left ventricle contracts hard and sends blood through the aortic valve into the aorta, the body’s largest artery.', 1, [330, 250]],
    ['Body tissues again', 'Through arteries and capillaries the cell delivers oxygen — and the circuit starts again. Twice through the heart for every full lap: **double circulation**.', 0, [200, 285]]
  ];
  D['heart-journey'] = {
    intro: 'You are a red blood cell in a muscle in the leg. You have just handed over your oxygen. Your job: get more — and bring it back.\n\nStep through the journey. The colour of the cell shows how much oxygen it carries.',
    predict: { q: 'After picking up oxygen in the lungs, which chamber does the cell enter next?', options: ['Left atrium', 'Right atrium', 'Left ventricle', 'Right ventricle'] },
    explore: 'Use **Next stop** (or the arrow keys on the map) to travel. Below the map you can open the full interactive heart model from the Visual Lab.',
    explain: 'The heart is two pumps side by side. The **right side** sends oxygen-poor blood to the **lungs**; the **left side** sends oxygen-rich blood to the **whole body**. So each lap passes through the heart twice — double circulation. Valves keep the flow one-way.',
    apply: ['h-order', 'h-tf-pa'],
    summary: ['Right side: body → right atrium → right ventricle → pulmonary artery → lungs.', 'Left side: lungs → pulmonary vein → left atrium → left ventricle → aorta → body.', 'Valves keep blood flowing one way.', 'Double circulation: twice through the heart per lap.'],
    build(host, c) {
      let i = 0, maxI = 0;
      host.innerHTML = `<div class="at-hj"><svg viewBox="0 0 400 310" class="at-hj__svg" role="img"></svg><div class="ls-row"><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-hj="-1">← ${T('Back', 'رجوع')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--accent" data-hj="1">${T('Next stop', 'المحطة التالية')} →</button><span class="at-muted at-small" data-hjn></span></div><div class="at-hj__txt" aria-live="polite"></div><details class="at-hj__lab"><summary>${T('Open the interactive heart model (Visual Lab)', 'افتح نموذج القلب التفاعلي')}</summary><div class="at-hj__labhost"></div></details></div>`;
      const svg = host.querySelector('svg');
      function draw() {
        const [name, txt, ox, [x, y]] = STOPS[i];
        const path = STOPS.slice(0, i + 1).map(s => s[3].join(' ')).join(' L');
        svg.innerHTML = `<rect x="150" y="10" width="100" height="40" rx="20" fill="hsl(200 50% 60% / .2)" stroke="currentColor"/><text x="200" y="35" text-anchor="middle" font-size="13" fill="currentColor">${T('Lungs', 'الرئتان')}</text>
          <rect x="90" y="125" width="70" height="50" rx="8" fill="hsl(220 50% 55% / .18)" stroke="currentColor"/><text x="125" y="145" text-anchor="middle" font-size="11" fill="currentColor">${T('Right atrium', 'الأذين الأيمن')}</text>
          <rect x="90" y="180" width="70" height="55" rx="8" fill="hsl(220 50% 55% / .18)" stroke="currentColor"/><text x="125" y="212" text-anchor="middle" font-size="11" fill="currentColor">${T('Right ventricle', 'البطين الأيمن')}</text>
          <rect x="240" y="125" width="70" height="50" rx="8" fill="hsl(352 55% 55% / .18)" stroke="currentColor"/><text x="275" y="145" text-anchor="middle" font-size="11" fill="currentColor">${T('Left atrium', 'الأذين الأيسر')}</text>
          <rect x="240" y="180" width="70" height="55" rx="8" fill="hsl(352 55% 55% / .18)" stroke="currentColor" stroke-width="3"/><text x="275" y="212" text-anchor="middle" font-size="11" fill="currentColor">${T('Left ventricle', 'البطين الأيسر')}</text>
          <rect x="120" y="270" width="160" height="32" rx="16" fill="hsl(30 50% 60% / .15)" stroke="currentColor"/><text x="200" y="291" text-anchor="middle" font-size="12" fill="currentColor">${T('Body', 'الجسم')}</text>
          <text x="8" y="120" font-size="10" fill="currentColor" opacity=".7">${T('Viewer’s left = heart’s right', 'يسار المشاهد = يمين القلب')}</text>
          <path d="M${path}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 4" opacity=".7"/>
          <circle cx="${x}" cy="${y}" r="10" fill="${ox ? '#D23B3B' : '#4A5DBF'}" stroke="var(--bg)" stroke-width="2"/>`;
        svg.setAttribute('aria-label', `${T('Stop', 'محطة')} ${i + 1}: ${name}. ${ox ? T('Oxygen-rich', 'غني بالأكسجين') : T('Oxygen-poor', 'فقير بالأكسجين')}.`);
        host.querySelector('.at-hj__txt').innerHTML = `<p><b>${i + 1}. ${esc(name)}</b> · <span class="at-state at-state--${ox ? 'revisit' : 'exploring'}"><i aria-hidden="true"></i>${ox ? T('oxygen-rich', 'غني بالأكسجين') : T('oxygen-poor', 'فقير بالأكسجين')}</span></p><p>${IL(txt)}</p>`;
        host.querySelector('[data-hjn]').textContent = `${i + 1} / ${STOPS.length}`;
        host.querySelector('[data-hj="-1"]').disabled = i === 0; host.querySelector('[data-hj="1"]').disabled = i === STOPS.length - 1;
      }
      host.addEventListener('click', e => { const b = e.target.closest('[data-hj]'); if (!b) return; i = Math.max(0, Math.min(STOPS.length - 1, i + +b.dataset.hj)); maxI = Math.max(maxI, i); draw(); c.onChange(); });
      host.querySelector('.at-hj__lab').addEventListener('toggle', e => { const h = host.querySelector('.at-hj__labhost'); if (e.target.open && !h.childElementCount) LS.mountModel(h, 'heart', {}, { title: 'Heart' }); });
      draw();
      return { reset() { i = 0; maxI = 0; draw(); }, observe() { return { text: maxI >= 7 ? `You travelled **${maxI + 1} of ${STOPS.length}** stops. After the lungs (stop 6) the cell went through the **pulmonary vein** into the **left atrium** — oxygen-rich.` : `You have reached stop **${i + 1}** (${STOPS[i][0]}). Keep going past the lungs to see where the cell goes next.`, predOk: maxI >= 7 ? p => p === 0 : null }; } };
    }
  };

  /* ================= BIOLOGY · inside a plant cell ================= */
  const ORG = {
    wall: ['Cell wall', 'Made mainly of **cellulose**. Strengthens the cell and keeps its shape. Plants, fungi and many bacteria have one; animal cells do not.', true],
    membrane: ['Cell membrane', 'A thin layer that **controls what enters and leaves** the cell. Every cell has one.', false],
    nucleus: ['Nucleus', 'Contains the **DNA**, which carries the instructions for making the cell’s proteins.', false],
    vacuole: ['Permanent vacuole', 'Filled with **cell sap**. Pressing outwards on the wall, it keeps the cell firm (turgid). Animal cells may have small, temporary vacuoles but not this large permanent one.', true],
    chloro: ['Chloroplast', 'Contains **chlorophyll**, which absorbs light for **photosynthesis**. About 5 µm long. Not found in animal cells.', true],
    mito: ['Mitochondrion', 'Where **aerobic respiration** releases energy from glucose. Both plant and animal cells have them.', false],
    ribo: ['Ribosomes', 'Tiny structures that **make proteins**. Found free in the cytoplasm and on membranes.', false],
    cyto: ['Cytoplasm', 'A jelly-like fluid where many of the cell’s **chemical reactions** take place.', false]
  };
  D['cell-explorer'] = {
    intro: 'This is a typical cell from the inside of a leaf. Select any part to find out what it does. Then switch to an **animal cell** and see what disappears.',
    predict: { q: 'Which of these would an animal cell **not** have?', options: ['Chloroplasts', 'A nucleus', 'Mitochondria', 'A cell membrane'] },
    explore: 'Select each part (or Tab to it and press Enter). Then use **Show an animal cell** to compare.',
    explain: 'Plant and animal cells share a nucleus, cell membrane, cytoplasm, mitochondria and ribosomes. Only the plant cell has a **cellulose cell wall**, **chloroplasts** for photosynthesis and a large **permanent vacuole** — the parts linked to making food from light and to standing up without a skeleton.',
    apply: [
      { id: 'x-cell1', type: 'mcq', difficulty: 1, prompt: 'Which part of the cell controls what enters and leaves?', options: ['Cell membrane', 'Cell wall', 'Nucleus', 'Vacuole'], answer: 0, why: { 1: 'The wall gives strength, but lets most substances straight through.', 2: 'The nucleus holds the DNA.', 3: 'The vacuole stores cell sap.' }, explain: 'The cell membrane is partially permeable: it controls the movement of substances in and out.' },
      { id: 'x-cell2', type: 'mcq', difficulty: 1, prompt: 'Where does aerobic respiration happen?', options: ['Mitochondria', 'Chloroplasts', 'Ribosomes', 'Nucleus'], answer: 0, why: { 1: 'Chloroplasts carry out photosynthesis, not respiration.', 2: 'Ribosomes make proteins.', 3: 'The nucleus holds genetic information.' }, explain: 'Mitochondria release energy from glucose by aerobic respiration — in plant and animal cells alike.' }
    ],
    summary: ['Both cells: nucleus, membrane, cytoplasm, mitochondria, ribosomes.', 'Plant cells only: cellulose wall, chloroplasts, permanent vacuole.', 'Chloroplasts: photosynthesis; mitochondria: respiration.'],
    connect: [{ label: 'Photosynthesis lesson', href: '#/lesson/bio-photo' }, { label: 'From the universe to a chloroplast', href: '#/exp/zoom' }],
    build(host, c) {
      let animal = false, seen = new Set(), sel = null;
      host.innerHTML = `<div class="at-cell"><svg viewBox="0 0 420 300" class="at-cell__svg" role="group"></svg><p class="ls-row"><button type="button" class="ls-btn ls-btn--sm" data-animal aria-pressed="false">${T('Show an animal cell', 'اعرض خلية حيوانية')}</button><span class="at-muted at-small" data-seen></span></p><div class="at-cell__info" aria-live="polite"><p class="at-muted">${T('Select a part of the cell.', 'اختر جزءاً من الخلية.')}</p></div></div>`;
      const svg = host.querySelector('svg');
      const part = (k, inner) => `<g class="at-cell__p ${sel === k ? 'is-sel' : ''}" data-org="${k}" tabindex="0" role="button" aria-label="${esc(ORG[k][0])}">${inner}</g>`;
      function draw() {
        let s = '';
        if (!animal) s += part('wall', '<rect x="20" y="20" width="380" height="260" rx="22" fill="hsl(100 35% 55% / .18)" stroke="hsl(100 35% 35%)" stroke-width="9"/>');
        s += part('membrane', animal ? '<ellipse cx="210" cy="150" rx="180" ry="125" fill="hsl(25 60% 70% / .2)" stroke="currentColor" stroke-width="3"/>' : '<rect x="32" y="32" width="356" height="236" rx="16" fill="hsl(70 40% 70% / .12)" stroke="currentColor" stroke-width="2.5"/>');
        s += part('cyto', `<rect x="${animal ? 70 : 44}" y="${animal ? 70 : 44}" width="18" height="18" fill="transparent"/><text x="${animal ? 60 : 48}" y="${animal ? 255 : 262}" font-size="12" fill="currentColor" opacity=".8">${T('cytoplasm', 'السيتوبلازم')}</text>`);
        if (!animal) s += part('vacuole', '<rect x="120" y="70" width="180" height="150" rx="40" fill="hsl(200 60% 70% / .35)" stroke="hsl(200 50% 40%)" stroke-width="2"/><text x="210" y="150" text-anchor="middle" font-size="12" fill="currentColor">' + T('vacuole', 'الفجوة') + '</text>');
        s += part('nucleus', `<circle cx="${animal ? 210 : 80}" cy="${animal ? 145 : 90}" r="30" fill="hsl(280 35% 55% / .4)" stroke="currentColor" stroke-width="2"/><circle cx="${animal ? 215 : 85}" cy="${animal ? 140 : 85}" r="9" fill="hsl(280 35% 40% / .6)"/>`);
        if (!animal) s += part('chloro', [[60, 180], [340, 70], [350, 200], [70, 240], [320, 250], [250, 245]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="20" ry="11" fill="hsl(120 55% 38%)" stroke="hsl(120 50% 25%)"/><path d="M${x - 12} ${y}h24M${x - 9} ${y - 4}h18M${x - 9} ${y + 4}h18" stroke="hsl(120 60% 70%)" stroke-width="1"/>`).join(''));
        s += part('mito', (animal ? [[110, 110], [300, 190], [140, 210]] : [[350, 130], [100, 135], [270, 50]]).map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="16" ry="8" fill="hsl(15 70% 55%)" stroke="hsl(15 60% 35%)"/><path d="M${x - 10} ${y}q3 -5 6 0t6 0t6 0" fill="none" stroke="hsl(15 80% 85%)"/>`).join(''));
        s += part('ribo', (animal ? [[260, 100], [270, 108], [180, 220], [300, 130], [120, 170]] : [[330, 160], [336, 168], [60, 210], [110, 60], [372, 100]]).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="currentColor"/>`).join(''));
        svg.innerHTML = s; svg.setAttribute('aria-label', animal ? T('An animal cell', 'خلية حيوانية') : T('A plant (leaf) cell', 'خلية نباتية'));
        host.querySelector('[data-seen]').textContent = `${seen.size} / 8 ${T('parts explored', 'أجزاء استُكشفت')}`;
      }
      const pick = k => { sel = k; seen.add(k); const [n, t, plantOnly] = ORG[k]; host.querySelector('.at-cell__info').innerHTML = `<h3 class="at-h3">${esc(n)}${plantOnly ? ` <span class="ls-tag">${T('plant cells', 'الخلايا النباتية')}</span>` : ''}</h3><p>${IL(t)}</p>`; draw(); svg.querySelector(`[data-org="${k}"]`).focus(); c.onChange(); };
      svg.addEventListener('click', e => { const g = e.target.closest('[data-org]'); if (g) pick(g.dataset.org); });
      svg.addEventListener('keydown', e => { const g = e.target.closest('[data-org]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(g.dataset.org); } });
      host.querySelector('[data-animal]').addEventListener('click', e => { animal = !animal; e.target.setAttribute('aria-pressed', String(animal)); e.target.textContent = animal ? T('Show the plant cell', 'اعرض الخلية النباتية') : T('Show an animal cell', 'اعرض خلية حيوانية'); if (animal && ORG[sel] && ORG[sel][2]) sel = null; draw(); c.onChange(); });
      draw();
      let compared = false; host.querySelector('[data-animal]').addEventListener('click', () => { compared = true; });
      return { reset() { animal = false; sel = null; seen = new Set(); draw(); }, observe() { return { text: `You explored **${seen.size} of 8** parts${compared ? ' and compared with an animal cell: the **cell wall, chloroplasts and large permanent vacuole** disappeared; the nucleus, membrane, cytoplasm, mitochondria and ribosomes stayed' : '. Switch to the animal cell to compare'}.`, predOk: compared ? p => p === 0 : null }; } };
    }
  };

  /* ================= SCIENCE · zoom through knowledge ================= */
  const SIZES = [
    [8.8e26, 'The observable universe', 'about 93 billion light-years across'],
    [1e21, 'The Milky Way', 'about 100,000 light-years across'],
    [9e12, 'Neptune’s orbit', 'the Solar System’s planets fit inside'],
    [3e11, 'Earth’s orbit', 'twice the Earth–Sun distance (1.5 × 10¹¹ m)'],
    [1.39e9, 'The Sun', '1.39 million km across'],
    [1.27e7, 'The Earth', '12,700 km across'],
    [3e4, 'A large city', 'about 30 km across'],
    [3e1, 'A tall tree', 'about 30 m'],
    [1.7, 'A person', 'about 1.7 m'],
    [1e-1, 'A leaf', 'about 10 cm'],
    [5e-5, 'A leaf cell', 'about 50 µm (0.05 mm)'],
    [5e-6, 'A chloroplast', 'about 5 µm long'],
    [5e-7, 'A granum', 'a stack of thylakoid membranes, about 0.5 µm'],
    [2e-9, 'A chlorophyll molecule', 'about 2 nm including its tail']
  ];
  const sup = n => String(n).replace(/-/g, '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  D.zoom = {
    intro: 'Start at the edge of the observable universe and zoom in — through our galaxy, the Sun, the Earth, a tree, a leaf, a cell — to the molecule that catches sunlight.\n\nEach step of the slider is a power of ten.',
    predict: { q: 'Roughly how many times wider is the observable universe than a chloroplast?', options: ['10¹² (a million million)', '10²² ', '10³²', '10⁴²'] },
    explore: 'Drag the slider (or use the zoom buttons). Stop at each object and read its size. Notice how many powers of ten separate a leaf from a chloroplast.',
    explain: 'The universe is about 9 × 10²⁶ m across and a chloroplast about 5 × 10⁻⁶ m. Dividing: about **2 × 10³²** — roughly 32 powers of ten. Each power of ten is a ×10 step, so even "small" gaps (leaf → chloroplast: about 4 steps, 20,000×) are bigger than they look.',
    apply: [{ id: 'x-zoom1', type: 'mcq', difficulty: 2, prompt: 'A leaf cell is about 50 µm across and a chloroplast about 5 µm long. About how many chloroplasts could line up across one cell?', options: ['10', '100', '1,000', '2'], answer: 0, hints: ['50 ÷ 5.'], why: { 1: '50 ÷ 5 = 10, not 100.', 2: 'That would need a cell 5 mm across.', 3: 'The cell is ten times as wide as a chloroplast.' }, explain: '50 µm ÷ 5 µm = 10.' }],
    summary: ['Universe ≈ 10²⁷ m; Earth ≈ 10⁷ m; a person ≈ 10⁰ m; a chloroplast ≈ 10⁻⁵–10⁻⁶ m.', 'Each power of ten is a ×10 step.', 'Universe ÷ chloroplast ≈ 10³².'],
    connect: [{ label: 'Inside a plant cell', href: '#/exp/cell-explorer' }, { label: 'Photosynthesis lesson', href: '#/lesson/bio-photo' }],
    build(host, c) {
      let e = 27;
      host.innerHTML = `<div class="at-zm"><div class="at-zm__cv"></div><div class="at-x__ctl"><label class="at-range"><span>${T('View width', 'عرض المنظر')} <output data-zo></output></span><input type="range" data-zs min="-9" max="27" step="0.05" value="27"></label><p class="ls-row"><button type="button" class="ls-btn ls-btn--sm" data-zb="-1">${T('Zoom in ×10', 'كبّر ×10')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-zb="1">${T('Zoom out ×10', 'صغّر ×10')}</button></p><p class="at-zm__now" aria-live="polite"></p></div></div>`;
      const cv = c.canvas(host.querySelector('.at-zm__cv'), 420, 300), g = cv.getContext('2d'); const seen = new Set();
      function draw() {
        const W = cv.width, H = cv.height, k = W / 420, view = Math.pow(10, e), px = W / view;
        g.clearRect(0, 0, W, H); g.fillStyle = c.css('--surface-2'); g.fillRect(0, 0, W, H);
        let focus = null;
        SIZES.forEach(([m, n], i) => { const r = m * px / 2; if (r < 1.5 * k || r > W * 4) return; const hue = i < 6 ? 220 : i < 9 ? 30 : 120; g.strokeStyle = `hsl(${hue} 55% 50%)`; g.lineWidth = 2 * k; g.beginPath(); g.arc(W / 2, H / 2, r, 0, 7); g.stroke(); if (r > 14 * k && r < W * 0.75) { g.fillStyle = c.css('--ink'); g.font = `${12 * k}px sans-serif`; g.textAlign = 'center'; g.fillText(n, W / 2, H / 2 - r - 6 * k); } if (r > W * 0.12 && r < W * 0.6) focus = i; });
        g.fillStyle = c.css('--ink'); g.fillRect(16 * k, H - 22 * k, W / 10, 2 * k); g.font = `${11 * k}px sans-serif`; g.textAlign = 'left'; g.fillText(`10${sup(Math.round(e - 1))} m`, 16 * k, H - 28 * k);
        host.querySelector('[data-zo]').textContent = `10${sup(Math.round(e))} m`;
        if (focus != null) { seen.add(focus); const [m, n, d] = SIZES[focus]; host.querySelector('.at-zm__now').innerHTML = `<b>${esc(n)}</b> — ${esc(d)} (≈ ${m.toExponential(1).replace('e+', ' × 10^').replace('e-', ' × 10^-')} m)`; }
      }
      const set = v => { e = Math.max(-9, Math.min(27, v)); host.querySelector('[data-zs]').value = e; draw(); c.onChange(); };
      host.addEventListener('input', ev => { if (ev.target.matches('[data-zs]')) set(+ev.target.value); });
      host.addEventListener('click', ev => { const b = ev.target.closest('[data-zb]'); if (b) set(Math.round(e) + +b.dataset.zb); });
      draw();
      return { reset() { set(27); seen.clear(); }, observe() { return { text: seen.size ? `You passed **${seen.size} of ${SIZES.length}** objects on the way down to 10${sup(Math.round(e))} m. The universe (≈ 9 × 10²⁶ m) is about **2 × 10³²** times wider than a chloroplast (≈ 5 × 10⁻⁶ m).` : 'Drag the slider to start zooming in.', predOk: seen.has(11) ? p => p === 2 : null }; } };
    }
  };

  /* ================= HISTORY · how we learned how blood moves ================= */
  const EVENTS = [
    [180, 'c. 2nd century CE', 'Galen', 'Taught that blood is made in the liver and used up by the body, and that some passes from the right to the left side of the heart through tiny pores in the wall between them (the septum).', 'His own surviving medical writings, copied for centuries.', 'documented', 'His texts survive; the pores he described do not exist.'],
    [1242, 'c. 1242', 'Ibn al-Nafis (Damascus and Cairo)', 'Wrote that the septum is solid with no pores, so blood must travel from the right side of the heart to the left **through the lungs** — the pulmonary circulation.', 'His commentary on the anatomy in Ibn Sina’s *Canon of Medicine* (manuscript).', 'approx', 'The manuscript is dated by scholars; the exact year is approximate. It was not widely known in Europe until it was studied again in 1924.'],
    [1543, '1543', 'Andreas Vesalius', 'Published *De humani corporis fabrica*, a detailed anatomy based on human dissection; in the 1555 edition he openly doubted that blood passes through the septum.', 'The printed book and its woodcut illustrations.', 'documented', 'Printed and dated.'],
    [1553, '1553', 'Michael Servetus', 'Described blood passing through the lungs, in a book on religion, *Christianismi Restitutio*.', 'Three copies of the book survive; most were burned.', 'documented', 'Dated printing; very few people could have read it.'],
    [1628, '1628', 'William Harvey', 'Showed that blood **circulates** — pumped out by the heart and returned by the veins — using experiments and a calculation: the heart pumps far more blood in an hour than the body could make.', '*De Motu Cordis* (printed book).', 'documented', 'Printed and dated; his experiments can be repeated.'],
    [1661, '1661', 'Marcello Malpighi', 'Saw **capillaries** in a frog’s lung through a microscope — the missing link between arteries and veins that Harvey could not see.', 'His published letters *De pulmonibus*.', 'documented', 'Printed and dated.'],
    [1733, '1733', 'Stephen Hales', 'Made the first recorded measurement of **blood pressure**, in a horse, with a glass tube connected to an artery.', 'His book *Haemastaticks*.', 'documented', 'Printed and dated.'],
    [1816, '1816', 'René Laennec', 'Invented the **stethoscope**, letting doctors listen to the heart and lungs.', 'His 1819 treatise on listening to the chest.', 'documented', 'Well recorded.'],
    [1903, '1903', 'Willem Einthoven', 'Recorded the heart’s electrical activity with a string galvanometer — the **electrocardiogram (ECG)**.', 'His published recordings; Nobel Prize 1924.', 'documented', 'Well recorded.'],
    [1967, '1967', 'Christiaan Barnard and team', 'Performed the first human-to-human **heart transplant**, in Cape Town.', 'Hospital records and worldwide news reports, 3 December 1967.', 'documented', 'Well recorded.']
  ];
  const CERT = { documented: ['Well documented', 'demonstrated'], approx: ['Date approximate', 'review'] };
  D.timeline = {
    intro: 'Ideas about the heart and blood changed over almost two thousand years. Each point on the timeline shows **who**, **what**, **the evidence we have** and **how sure we can be**.',
    predict: { q: 'In which century did someone first show that blood circulates around the body?', options: ['The 2nd century', 'The 13th century', 'The 17th century', 'The 20th century'] },
    explore: 'Select each point on the timeline. Look at the evidence and the certainty label. Use the filter to show only what is well documented.',
    explain: 'Galen’s model lasted for over a thousand years. **Ibn al-Nafis** described the lungs’ part in the 13th century; **Harvey** showed full circulation in **1628** (17th century) with experiments and a calculation; **Malpighi** found the capillaries that completed the picture. History depends on evidence: surviving texts, dated printings and repeatable experiments — and on saying when a date is uncertain.',
    apply: [{ id: 'x-tl1', type: 'order', difficulty: 2, prompt: 'Put these in time order, earliest first.', items: ['Galen’s septal pores', 'Ibn al-Nafis: blood through the lungs', 'Harvey: circulation', 'Malpighi: capillaries', 'Einthoven: the ECG'], explain: 'Galen (2nd century), Ibn al-Nafis (c. 1242), Harvey (1628), Malpighi (1661), Einthoven (1903).' }],
    summary: ['Galen (2nd c.): pores in the septum — wrong, but taught for over 1,000 years.', 'Ibn al-Nafis (c. 1242): blood passes through the lungs.', 'Harvey (1628): blood circulates.', 'Malpighi (1661): capillaries.', 'Good history names its evidence and its uncertainty.'],
    connect: [{ label: 'The case of the missing pores', href: '#/exp/mystery-lungs' }, { label: 'The heart lesson', href: '#/lesson/bio-heart' }],
    build(host, c) {
      let sel = null, only = false; const seen = new Set();
      host.innerHTML = `<div class="at-tl"><label class="ls-chk"><input type="checkbox" data-tlf> ${T('Only well-documented events', 'الأحداث الموثقة فقط')}</label><div class="at-tl__bar" role="list"></div><div class="at-tl__info" aria-live="polite"><p class="at-muted">${T('Select a point on the timeline.', 'اختر نقطة على الخط الزمني.')}</p></div></div>`;
      const bar = host.querySelector('.at-tl__bar');
      const X = y => 4 + 92 * (y < 1200 ? (y - 100) / 1100 * 0.18 : 0.18 + (y - 1200) / 800 * 0.82);
      function draw() {
        bar.innerHTML = `<span class="at-tl__axis" aria-hidden="true"></span><span class="at-tl__gap" style="left:${X(1150)}%" aria-hidden="true">≈</span>` + EVENTS.map((ev, i) => only && ev[5] !== 'documented' ? '' : `<button type="button" role="listitem" class="at-tl__dot ${sel === i ? 'is-sel' : ''} ${seen.has(i) ? 'is-seen' : ''}" style="left:${X(ev[0])}%" data-ev="${i}" aria-label="${esc(ev[1])}: ${esc(ev[2])}"><span>${esc(ev[1].replace('c. ', '').replace(' century CE', ''))}</span></button>`).join('');
      }
      bar.addEventListener('click', e => { const b = e.target.closest('[data-ev]'); if (!b) return; sel = +b.dataset.ev; seen.add(sel); const ev = EVENTS[sel], cert = CERT[ev[5]]; host.querySelector('.at-tl__info').innerHTML = `<p class="at-k">${esc(ev[1])}</p><h3 class="at-h3">${esc(ev[2])}</h3><p>${IL(ev[3])}</p><dl class="at-tl__ev"><dt>${T('Evidence', 'الدليل')}</dt><dd>${IL(ev[4])}</dd><dt>${T('How sure?', 'ما مدى اليقين؟')}</dt><dd><span class="at-state at-state--${cert[1]}"><i aria-hidden="true"></i>${esc(cert[0])}</span> ${IL(ev[6])}</dd></dl>`; draw(); bar.querySelector(`[data-ev="${sel}"]`).focus(); c.onChange(); });
      host.querySelector('[data-tlf]').addEventListener('change', e => { only = e.target.checked; draw(); });
      draw();
      return { reset() { sel = null; seen.clear(); draw(); }, observe() { return { text: `You examined **${seen.size} of ${EVENTS.length}** turning points.${seen.has(4) ? ' Harvey’s *De Motu Cordis* (**1628**, 17th century) is the first demonstration that blood circulates.' : ' Look at 1628 to answer your prediction.'}`, predOk: seen.has(4) ? p => p === 2 : null }; } };
    }
  };

  /* ================= HISTORY · the case of the missing pores ================= */
  const CLUES = [
    ['galen', 'Galen’s writings (2nd century)', 'Blood seeps from the right side of the heart to the left through invisible pores in the septum.'],
    ['nafis', 'Ibn al-Nafis’ commentary (c. 1242)', '“The septum has no pores… the blood must pass through the lung.” (paraphrased)'],
    ['servetus', 'Servetus’ book (1553)', 'Blood travels from the right side of the heart through the lungs to the left — written in a book on religion; most copies burned.'],
    ['harvey', 'Harvey’s De Motu Cordis (1628)', 'Experiments and a calculation showing that blood circulates round the whole body.'],
    ['1924', 'A 1924 rediscovery', 'A physician studying manuscripts in Berlin draws attention to Ibn al-Nafis’ description. Before this, European histories credited Servetus or later writers.']
  ];
  const SUSPECTS = [['Galen', '2nd century'], ['Ibn al-Nafis', 'c. 1242'], ['Michael Servetus', '1553'], ['William Harvey', '1628']];
  D['mystery-lungs'] = {
    intro: 'For centuries, doctors believed blood leaked through tiny pores in the wall of the heart. Those pores do not exist. So who **first** wrote down that blood goes through the **lungs** instead — and how can we tell?\n\nExamine the evidence, then make your case.',
    predict: { q: 'Your first hunch: who first described blood passing through the lungs?', options: SUSPECTS.map(s => `${s[0]} (${s[1]})`) },
    explore: 'Examine each clue. Then choose who you think it was, and which **two** clues support your answer best.',
    explain: 'The earliest surviving written description is by **Ibn al-Nafis**, around 1242 — three centuries before Servetus. European histories missed it because the manuscript was not widely studied until 1924. Did Harvey or Servetus know of it? Some historians have asked whether the idea travelled through translations, but **no direct link has been proven** — independent discovery is possible. Good historical reasoning separates what the evidence shows from what we would like to know.',
    apply: [{ id: 'x-myst1', type: 'mcq', difficulty: 2, prompt: 'Why did many older European books say Servetus was first?', options: ['Ibn al-Nafis’ manuscript was not widely known in Europe until 1924', 'Servetus wrote earlier than Ibn al-Nafis', 'Ibn al-Nafis did not mention the lungs', 'Servetus did experiments that proved it'], answer: 0, why: { 1: 'Servetus wrote in 1553; Ibn al-Nafis around 1242.', 2: 'He described exactly that: blood passing through the lungs.', 3: 'Servetus wrote about it in a religious book, not from experiments.' }, explain: 'Historians can only credit sources they know about; the manuscript came to wide attention in 1924.' }],
    summary: ['Earliest surviving description of pulmonary circulation: Ibn al-Nafis, c. 1242.', 'Servetus (1553) described it independently or not — the link is unproven.', 'Harvey (1628) showed full circulation.', 'Evidence can be lost and found: histories change when sources reappear.'],
    connect: [{ label: 'How we learned how blood moves', href: '#/exp/timeline' }],
    build(host, c) {
      const open = new Set(); let who = null, sup = new Set(), verdict = null;
      host.innerHTML = `<div class="at-my"><ul class="at-my__clues"></ul><fieldset class="at-my__case"><legend>${T('Make your case', 'قدّم حجتك')}</legend><div class="at-x__opts" role="radiogroup" aria-label="${T('Who was first?', 'من كان الأول؟')}">${SUSPECTS.map((s, i) => `<button type="button" class="at-opt" role="radio" aria-checked="false" data-who="${i}">${esc(s[0])} <small>${esc(s[1])}</small></button>`).join('')}</div><p class="at-muted at-small">${T('Then tick two clues that support your answer.', 'ثم اختر دليلين يدعمان إجابتك.')}</p><button type="button" class="ls-btn ls-btn--accent ls-btn--sm" data-case>${T('Present my case', 'قدّم حجتي')}</button><div class="at-my__fb" aria-live="polite"></div></fieldset></div>`;
      function draw() {
        host.querySelector('.at-my__clues').innerHTML = CLUES.map(([k, t, body]) => `<li class="${open.has(k) ? 'is-open' : ''}"><button type="button" class="at-my__clue" data-clue="${k}" aria-expanded="${open.has(k)}"><b>${esc(t)}</b></button>${open.has(k) ? `<p>${esc(body)}</p><label class="ls-chk"><input type="checkbox" data-sup="${k}" ${sup.has(k) ? 'checked' : ''}> ${T('Supports my case', 'يدعم حجتي')}</label>` : ''}</li>`).join('');
        host.querySelectorAll('[data-who]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.who === who)));
      }
      host.addEventListener('click', e => {
        const cl = e.target.closest('[data-clue]'); if (cl) { open.has(cl.dataset.clue) ? open.delete(cl.dataset.clue) : open.add(cl.dataset.clue); draw(); host.querySelector(`[data-clue="${cl.dataset.clue}"]`).focus(); return; }
        const w = e.target.closest('[data-who]'); if (w) { who = +w.dataset.who; draw(); return; }
        if (e.target.closest('[data-case]')) {
          const fb = host.querySelector('.at-my__fb');
          if (who == null) { fb.innerHTML = `<p class="ls-fb ls-fb--warn">${T('Choose who you think it was first.', 'اختر أولاً.')}</p>`; return; }
          const right = who === 1, good = sup.has('nafis') && (sup.has('1924') || sup.has('galen') || sup.has('servetus'));
          verdict = right && good ? 'solved' : right ? 'right-weak' : 'wrong';
          fb.innerHTML = `<div class="ls-fb ${right ? 'ls-fb--ok' : 'ls-fb--no'}"><p class="ls-fb__h">${right ? (good ? T('Case made.', 'حجة مقنعة.') : T('Right person — but strengthen the evidence.', 'الشخص الصحيح — لكن قوِّ الدليل.')) : T('The evidence points elsewhere.', 'الدليل يشير إلى غيره.')}</p><p>${right ? (good ? T('Ibn al-Nafis’ commentary is the earliest surviving description, and the other clue explains the dates or why Europe missed it.', 'تعليق ابن النفيس أقدم وصف باقٍ.') : T('Tick the Ibn al-Nafis clue plus one that explains the dates or the rediscovery.', 'اختر دليل ابن النفيس ودليلاً آخر.')) : who === 0 ? T('Galen is the theory being replaced: he described pores, not the lungs.', 'جالينوس وصف المسام لا الرئتين.') : who === 2 ? T('Servetus did describe it — but look at the date of the commentary written about 300 years earlier.', 'سرفيتوس وصفها لكن انظر إلى التاريخ.') : T('Harvey showed the whole circulation in 1628, but others had already described the lungs’ part.', 'هارفي أثبت الدورة الكاملة لاحقاً.')}</p></div>`;
          c.onChange();
        }
      });
      host.addEventListener('change', e => { const s = e.target.closest('[data-sup]'); if (s) { s.checked ? sup.add(s.dataset.sup) : sup.delete(s.dataset.sup); } });
      draw();
      return { reset() { open.clear(); sup.clear(); who = null; verdict = null; draw(); host.querySelector('.at-my__fb').innerHTML = ''; }, observe() { return { text: verdict ? `You examined **${open.size} of ${CLUES.length}** clues and argued for **${SUSPECTS[who][0]}** (${verdict === 'solved' ? 'well supported' : verdict === 'right-weak' ? 'right person, evidence could be stronger' : 'not what the evidence shows'}).` : `You have examined **${open.size} of ${CLUES.length}** clues. Present your case to compare with your hunch.`, predOk: verdict ? p => p === 1 : null }; } };
    }
  };

  /* ================= GEOGRAPHY · why seasons happen ================= */
  const TILT = 23.44, R = Math.PI / 180;
  const decl = N => -TILT * Math.cos(2 * Math.PI / 365 * (N + 10));
  function dayLen(lat, N) { const x = -Math.tan(lat * R) * Math.tan(decl(N) * R); if (x <= -1) return 24; if (x >= 1) return 0; return 2 * Math.acos(x) / R / 15; }
  LS.exp.dayLen = dayLen; LS.exp.decl = decl;
  const PLACES = [['London', 51.5], ['Sydney', -33.9], ['Riyadh', 24.7], ['Delhi', 28.6], ['Reykjavík', 64.1], ['Quito', -0.2], ['Tromsø', 69.6]];
  const dateOf = N => new Date(Date.UTC(2026, 0, 1) + (N - 1) * 864e5).toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const hm = h => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} min`.replace('60 min', '59 min');
  D.seasons = {
    intro: 'The Earth’s axis is tilted by **23.44°**, and it keeps pointing the same way in space as the Earth goes round the Sun. So for half the year the northern half leans towards the Sun, and for the other half the southern half does.\n\nPick a date and a place; the day length is calculated, not looked up.',
    predict: { q: 'On **21 June**, where is the day longer?', options: ['London (51.5° N)', 'Sydney (33.9° S)', 'The same in both'] },
    preset: true,
    explore: 'The date is set to 21 June. Compare **London** and **Sydney**, then move the date to 21 December. Then try **Tromsø** (69.6° N) in June and in December, and **Quito**, on the equator, any time of year.',
    explain: 'In June the northern hemisphere leans **towards** the Sun: the Sun climbs higher and stays up longer, so London has long days and summer, while Sydney, in the southern hemisphere, has short days and winter. In December it is reversed. Near the equator the day stays close to 12 hours all year; inside the Arctic Circle the Sun can stay up — or down — for the whole day. **It is the tilt, not the distance from the Sun**: the Earth is actually slightly closer to the Sun in early January.',
    apply: [{ id: 'x-sea1', type: 'mcq', difficulty: 2, prompt: 'Why is it winter in the northern hemisphere in December?', options: ['The northern hemisphere is tilted away from the Sun', 'The Earth is furthest from the Sun', 'The Sun gives out less energy in December', 'The Earth spins more slowly'], answer: 0, why: { 1: 'The Earth is in fact closest to the Sun in early January.', 2: 'The Sun’s output barely changes over a year.', 3: 'A day is the same length of rotation all year.' }, explain: 'Tilted away, the Sun is lower in the sky and above the horizon for fewer hours, so each square metre gets less energy.' }],
    summary: ['Axial tilt 23.44° — the cause of seasons.', 'Summer: your hemisphere tilted towards the Sun — higher Sun, longer days.', 'Equator: about 12-hour days all year; polar regions: midnight sun and polar night.', 'Not distance: Earth is closest to the Sun in January.'],
    build(host, c) {
      let N = 172, lat = 51.5;
      host.innerHTML = `<div class="at-sea"><div class="at-sea__cv"></div><svg viewBox="0 0 365 120" class="at-sea__chart" role="img"></svg><div class="at-x__ctl">${c.slider('n', T('Date', 'التاريخ'), 1, 365, 1, 172, '')}${c.slider('l', T('Latitude', 'خط العرض'), -80, 80, 0.5, 51.5, '°')}<p class="ls-row at-sea__places">${PLACES.map(([n, l]) => `<button type="button" class="ls-chip" data-pl="${l}">${esc(n)}</button>`).join('')}</p><p class="at-sea__read" aria-live="polite"></p></div></div>`;
      const cv = c.canvas(host.querySelector('.at-sea__cv'), 400, 260), g = cv.getContext('2d');
      function draw() {
        const W = cv.width, k = W / 400, cx = 230 * k, cy = 130 * k, r = 95 * k, d = decl(N);
        g.clearRect(0, 0, W, cv.height);
        g.fillStyle = '#F2B233'; g.beginPath(); g.arc(14 * k, cy, 30 * k, 0, 7); g.fill(); g.strokeStyle = 'rgba(242,178,51,.5)'; for (let y = -3; y <= 3; y++) { g.beginPath(); g.moveTo(50 * k, cy + y * 26 * k); g.lineTo(cx - r - 8 * k, cy + y * 26 * k); g.stroke(); }
        g.fillStyle = c.css('--surface-2'); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
        g.fillStyle = 'rgba(242,178,51,.28)'; g.beginPath(); g.arc(cx, cy, r, Math.PI / 2, 3 * Math.PI / 2); g.fill();
        g.strokeStyle = c.css('--ink'); g.lineWidth = 1.5 * k; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
        const ax = -d * R; const ux = Math.sin(ax), uy = -Math.cos(ax);
        g.setLineDash([5 * k, 4 * k]); g.beginPath(); g.moveTo(cx - ux * (r + 22 * k), cy - uy * (r + 22 * k)); g.lineTo(cx + ux * (r + 22 * k), cy + uy * (r + 22 * k)); g.stroke(); g.setLineDash([]);
        const yl = Math.sin(lat * R) * r, half = Math.cos(lat * R) * r, px = cx + ux * yl * -1 * -1, py = cy + uy * yl;
        const mx = cx + ux * yl, my = cy + uy * yl, vx = Math.cos(ax), vy = Math.sin(ax);
        g.strokeStyle = c.css('--accent'); g.lineWidth = 2.5 * k; g.beginPath(); g.moveTo(mx - vx * half, my - vy * half); g.lineTo(mx + vx * half, my + vy * half); g.stroke();
        g.fillStyle = c.css('--ink'); g.font = `${11 * k}px sans-serif`; g.fillText(`${Math.abs(lat)}° ${lat >= 0 ? 'N' : 'S'}`, mx + vx * half + 6 * k, my + vy * half); g.fillText('N', cx - ux * (r + 30 * k) - 4 * k, cy - uy * (r + 30 * k)); g.fillText(T('Sunlight', 'ضوء الشمس'), 54 * k, 24 * k);
        void px; void py;
        const ch = host.querySelector('.at-sea__chart'); let p = ''; for (let n = 1; n <= 365; n += 2) p += (n === 1 ? 'M' : 'L') + n + ' ' + (110 - dayLen(lat, n) / 24 * 100).toFixed(1);
        ch.innerHTML = `<path d="M0 110H365M0 60H365" stroke="currentColor" stroke-opacity=".25"/><text x="2" y="57" font-size="9" fill="currentColor">12 h</text><path d="${p}" fill="none" stroke="var(--accent)" stroke-width="2"/><path d="M${N} 8V112" stroke="currentColor" stroke-dasharray="3 3"/><circle cx="${N}" cy="${(110 - dayLen(lat, N) / 24 * 100).toFixed(1)}" r="4" fill="var(--accent)"/><text x="300" y="118" font-size="9" fill="currentColor">${T('day length over the year', 'طول النهار خلال السنة')}</text>`;
        ch.setAttribute('aria-label', `${T('Day length through the year at', 'طول النهار خلال السنة عند')} ${lat}°`);
        const L = dayLen(lat, N), noon = 90 - Math.abs(lat - d);
        host.querySelector('.at-sea__read').innerHTML = `<b>${esc(dateOf(N))}</b> · ${T('Sun overhead at', 'الشمس عمودية عند')} ${Math.abs(d).toFixed(1)}° ${d >= 0 ? 'N' : 'S'} · ${T('day length at', 'طول النهار عند')} ${Math.abs(lat)}° ${lat >= 0 ? 'N' : 'S'}: <b>${L >= 24 ? T('24 h — the Sun does not set', '٢٤ ساعة') : L <= 0 ? T('0 h — the Sun does not rise', 'صفر') : hm(L)}</b> · ${T('noon Sun height', 'ارتفاع شمس الظهيرة')} ${Math.max(0, noon).toFixed(0)}°`;
        host.querySelector('[data-o="n"]').textContent = dateOf(N); host.querySelector('[data-o="l"]').textContent = lat + '°';
      }
      host.addEventListener('input', e => { const s = e.target.closest('[data-s]'); if (!s) return; if (s.dataset.s === 'n') N = +s.value; else lat = +s.value; draw(); c.onChange(); });
      host.addEventListener('click', e => { const b = e.target.closest('[data-pl]'); if (b) { lat = +b.dataset.pl; host.querySelector('[data-s="l"]').value = lat; draw(); c.onChange(); } });
      draw();
      return { reset() { N = 172; lat = 51.5; host.querySelector('[data-s="n"]').value = N; host.querySelector('[data-s="l"]').value = lat; draw(); }, preset() { N = 172; host.querySelector('[data-s="n"]').value = N; draw(); },
        observe() { const a = dayLen(51.5, N), b = dayLen(-33.9, N); return { text: `On **${dateOf(N)}**: London has **${hm(a)}** of daylight and Sydney **${hm(b)}**. The Sun is overhead at ${Math.abs(decl(N)).toFixed(1)}° ${decl(N) >= 0 ? 'north' : 'south'}. (Calculated without refraction, so real days are a few minutes longer.)`, predOk: Math.abs(N - 172) <= 10 ? p => p === 0 : null }; } };
    }
  };

  /* ================= ENGLISH · sentence workshop & story architect ================= */
  const TILES = ['Only', 'I', 'saw', 'the', 'fox'];
  const READINGS = { 'only i saw the fox': 'Nobody else saw the fox — just me.', 'i only saw the fox': 'Usually: seeing it was all I did (I did not, say, catch it). In casual speech it can also mean the fox was all I saw — so it is ambiguous.', 'i saw only the fox': 'The fox was the one thing I saw.', 'i saw the only fox': 'There was just one fox, and I saw it.', 'i saw the fox only': 'The fox and nothing else (a more formal, emphatic order).' };
  const STORY = { who: ['a lighthouse keeper', 'a young engineer', 'a lost delivery robot'], where: ['on a storm-wrecked island', 'in a city whose power has failed', 'in a library at midnight'], problem: ['the light has gone out', 'a message no one can read', 'someone has vanished'], turn: ['an unexpected ally', 'a hidden map', 'a choice that costs something'] };
  D['sentence-lab'] = {
    intro: 'Word order carries meaning. In the **sentence workshop** you build sentences from the same five words and see what each order means. In the **story architect** you assemble the shape of a story and write its first line.',
    predict: { q: 'Which sentence means **nobody else** saw the fox?', options: ['Only I saw the fox.', 'I only saw the fox.', 'I saw only the fox.'] },
    explore: 'Select the word tiles in the order you want. Build at least three different sentences. Then open the **story architect** below the workshop.',
    explain: '**Only** attaches to the word it sits next to. Before **I**, it limits who saw (only I); before **the fox** or after it, it limits what was seen; next to the verb it can limit the action — which is why "I only saw the fox" can be read two ways. Careful writers place *only* right next to the word they mean.',
    apply: [{ id: 'x-sen1', type: 'mcq', difficulty: 2, prompt: 'Which sentence says the fox was the one thing you saw, with no ambiguity?', options: ['I saw only the fox.', 'I only saw the fox.', 'Only I saw the fox.', 'I saw the only fox.'], answer: 0, why: { 1: 'This one is ambiguous: it can limit the seeing rather than what was seen.', 2: 'This limits who saw it.', 3: 'This says there was only one fox.' }, explain: 'Placing only directly before “the fox” limits what was seen.' }],
    summary: ['Word order changes meaning in English.', '“Only” limits the word it sits next to.', 'A story’s shape: setting and character, a problem, rising tension, a turning point, a resolution.'],
    build(host, c) {
      let seq = []; const made = new Set(); let sto = {};
      host.innerHTML = `<div class="at-sw"><h3 class="at-h3">${T('Sentence workshop', 'ورشة الجملة')}</h3><p class="at-sw__tiles" role="group" aria-label="${T('Word tiles', 'بطاقات الكلمات')}"></p><p class="at-sw__built" aria-live="polite"></p><p class="ls-row"><button type="button" class="ls-btn ls-btn--sm ls-btn--accent" data-sw="check">${T('What does it mean?', 'ماذا تعني؟')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-sw="clear">${T('Clear', 'امسح')}</button></p><div class="at-sw__fb" aria-live="polite"></div>
        <details class="at-sw__story"><summary><b>${T('Story architect', 'مهندس القصة')}</b></summary>${Object.entries(STORY).map(([k, arr]) => `<fieldset><legend>${{ who: T('Character', 'الشخصية'), where: T('Setting', 'المكان'), problem: T('Problem', 'المشكلة'), turn: T('Turning point', 'نقطة التحول') }[k]}</legend>${arr.map((o, i) => `<label class="ls-chk"><input type="radio" name="st-${k}" value="${i}"> ${esc(o)}</label>`).join('')}</fieldset>`).join('')}<div class="at-sw__outline" aria-live="polite"></div></details></div>`;
      const tiles = host.querySelector('.at-sw__tiles');
      const drawTiles = () => { tiles.innerHTML = TILES.map((w, i) => `<button type="button" class="at-tile" data-tile="${i}" ${seq.includes(i) ? 'disabled' : ''}>${w}</button>`).join(''); const s = seq.map(i => TILES[i]).join(' '); host.querySelector('.at-sw__built').innerHTML = s ? `<b>${esc(s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/\bi\b/g, 'I'))}.</b>` : `<span class="at-muted">${T('Select words in order…', 'اختر الكلمات بالترتيب…')}</span>`; };
      host.addEventListener('click', e => {
        const t = e.target.closest('[data-tile]'); if (t) { seq.push(+t.dataset.tile); drawTiles(); return; }
        const b = e.target.closest('[data-sw]'); if (!b) return;
        if (b.dataset.sw === 'clear') { seq = []; drawTiles(); host.querySelector('.at-sw__fb').innerHTML = ''; return; }
        const s = seq.map(i => TILES[i]).join(' ').toLowerCase(), fb = host.querySelector('.at-sw__fb');
        if (seq.length < TILES.length) { fb.innerHTML = `<p class="ls-fb ls-fb--warn">${T('Use all five words.', 'استخدم الكلمات الخمس.')}</p>`; return; }
        if (READINGS[s]) { made.add(s); fb.innerHTML = `<p class="ls-fb ls-fb--ok"><b>${T('Meaning', 'المعنى')}:</b> ${esc(READINGS[s])} <span class="at-muted">(${made.size} ${T('different sentences so far', 'جمل مختلفة حتى الآن')})</span></p>`; }
        else fb.innerHTML = `<p class="ls-fb ls-fb--no">${T('That is not a standard English word order. Try putting the subject (I) before the verb (saw).', 'ليس ترتيباً قياسياً.')}</p>`;
        seq = []; drawTiles(); c.onChange();
      });
      host.addEventListener('change', e => {
        const r = e.target.closest('input[type=radio]'); if (!r) return; sto[r.name.slice(3)] = STORY[r.name.slice(3)][+r.value];
        const o = host.querySelector('.at-sw__outline');
        if (Object.keys(sto).length < 4) { o.innerHTML = `<p class="at-muted">${4 - Object.keys(sto).length} ${T('more choice(s) to build the outline.', 'اختيارات متبقية.')}</p>`; return; }
        o.innerHTML = `<ol class="at-sw__arc"><li><b>${T('Opening', 'البداية')}:</b> ${T('introduce', 'قدّم')} ${esc(sto.who)} ${esc(sto.where)}.</li><li><b>${T('Problem', 'المشكلة')}:</b> ${esc(sto.problem)}.</li><li><b>${T('Rising tension', 'تصاعد التوتر')}:</b> ${T('each attempt to fix it makes things harder.', 'كل محاولة تزيد الأمر صعوبة.')}</li><li><b>${T('Turning point', 'نقطة التحول')}:</b> ${esc(sto.turn)}.</li><li><b>${T('Resolution', 'الحل')}:</b> ${T('what has changed — for the place and for the character?', 'ما الذي تغيّر؟')}</li></ol><label class="ls-field">${T('Write your first sentence', 'اكتب جملتك الأولى')}<textarea rows="2" data-first></textarea></label><button type="button" class="ls-btn ls-btn--sm" data-savestory>${T('Save the outline to my notebook', 'احفظ المخطط في دفتري')}</button>`;
      });
      host.addEventListener('click', e => { if (!e.target.closest('[data-savestory]')) return; const f = host.querySelector('[data-first]').value.trim(); LS.notes.quick({ title: 'Story outline: ' + sto.who, html: host.querySelector('.at-sw__arc').outerHTML + (f ? `<p><b>First line:</b> ${esc(f)}</p>` : ''), src: { type: 'experience', id: 'sentence-lab', title: 'Story architect', where: '#/exp/sentence-lab' } }); });
      drawTiles();
      return { reset() { seq = []; made.clear(); drawTiles(); }, observe() { return { text: made.size ? `You built **${made.size}** different correct sentences from the same five words: ${[...made].map(s => `“${s.charAt(0).toUpperCase() + s.slice(1).replace(/\bi\b/g, 'I')}.”`).join(', ')} — each with a different meaning.` : 'Build a sentence with the tiles and check its meaning.', predOk: made.has('only i saw the fox') ? p => p === 0 : null }; } };
    }
  };

  /* ================= LANGUAGES · ordering at a French café ================= */
  D.cafe = {
    intro: 'You are at a café counter in Paris. The server speaks first. Choose what to say — some answers are polite and natural, some are understood but blunt, and one is a classic mistake. **Listen** plays the French with your device’s voice (only when you press it).',
    predict: { q: 'How do you politely ask for something in a French café?', options: ['« Je voudrais… » (I would like…)', '« Je suis… » (I am…)', '« J’ai… » (I have…)', '« Donnez-moi… » (Give me…)'] },
    explore: 'Work through the conversation. Try a wrong answer on purpose to see what it actually means.',
    explain: '**Je voudrais** (“I would like”) is the polite standard for ordering; add **s’il vous plaît**. **Je suis** means “I am”, so « Je suis un café » means “I am a coffee”. Short answers like « Sur place » or « Non, merci » are perfectly natural replies.',
    apply: [{ id: 'x-fr1', type: 'mcq', difficulty: 1, prompt: '« Sur place ou à emporter ? » means…', options: ['Eat in or take away?', 'Is that all?', 'How much is it?', 'Hot or cold?'], answer: 0, explain: '« Sur place » = here (eat in); « à emporter » = to take away.' }, { id: 'x-fr2', type: 'mcq', difficulty: 1, prompt: 'The server says « Ça fait quatre euros cinquante ». How much do you pay?', options: ['€4.50', '€14.50', '€5.40', '€40.50'], answer: 0, why: { 1: '« quatorze » would be fourteen.', 2: 'The order is four euros, fifty (cents).', 3: '« quarante » would be forty.' }, explain: 'quatre = 4, cinquante = 50: €4.50.' }],
    summary: ['Je voudrais… , s’il vous plaît: I would like…, please.', 'Sur place / à emporter: eat in / take away.', 'Ça fait…: that comes to…', 'Je suis = I am (not “I would like”).'],
    build(host, c) {
      const S = {
        start: { srv: ['Bonjour ! Vous désirez ?', 'Hello! What would you like?'], opts: [['Je voudrais un café, s’il vous plaît.', 'I would like a coffee, please.', 'good', 'Polite and natural.', 'more'], ['Un café.', 'A coffee.', 'ok', 'Understood — but a little abrupt. Add « s’il vous plaît ».', 'more'], ['Je suis un café.', 'I am a coffee.', 'bad', '« Je suis » means “I am” — you just told the server you are a coffee! Use « Je voudrais ».', 'start']] },
        more: { srv: ['Très bien. Et avec ceci ?', 'Very good. Anything else?'], opts: [['Un croissant, s’il vous plaît.', 'A croissant, please.', 'good', 'Natural.', 'place', 1], ['Non, merci. C’est tout.', 'No, thank you. That’s all.', 'good', 'Natural.', 'place'], ['Oui, merci.', 'Yes, thanks.', 'ok', 'The server will now wait for you to say what else you want!', 'more']] },
        place: { srv: ['Sur place ou à emporter ?', 'Eat in or take away?'], opts: [['Sur place, s’il vous plaît.', 'To eat in, please.', 'good', 'Good.', 'pay'], ['À emporter.', 'To take away.', 'good', 'Good.', 'pay'], ['Pardon ? Je ne comprends pas.', 'Sorry? I don’t understand.', 'ok', 'Always fine to ask! The server rephrases.', 'place2']] },
        place2: { srv: ['Vous mangez ici, ou vous partez avec ?', 'Are you eating here, or leaving with it?'], opts: [['Ici, merci.', 'Here, thanks.', 'good', 'Good.', 'pay'], ['Je pars avec, merci.', 'I’m taking it with me, thanks.', 'good', 'Good.', 'pay']] },
        pay: { srv: null, opts: null },
        end: { srv: ['Merci, bonne journée !', 'Thank you, have a good day!'], opts: [] }
      };
      let node = 'start', croissant = false, log = [], polite = 0, mist = 0;
      host.innerHTML = `<div class="at-cafe"><ol class="at-cafe__log" aria-live="polite"></ol><div class="at-cafe__opts" role="group" aria-label="${T('Your reply', 'ردك')}"></div></div>`;
      const say = (fr, en, who) => log.push({ fr, en, who });
      function speak(fr) { if (!('speechSynthesis' in window)) { LS.toast(T('Speech is not available in this browser.', 'النطق غير متاح.')); return; } speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(fr); u.lang = 'fr-FR'; const v = speechSynthesis.getVoices().find(x => /^fr/i.test(x.lang)); if (v) u.voice = v; u.rate = 0.9; speechSynthesis.speak(u); }
      function enter(n) {
        node = n; const s = S[n];
        if (n === 'pay') { const fr = croissant ? 'Ça fait quatre euros cinquante.' : 'Ça fait deux euros.'; say(fr, croissant ? 'That comes to four euros fifty.' : 'That comes to two euros.', 'srv'); S.pay.opts = (croissant ? [['4,50 €', '€4.50', 'good', 'Right: quatre euros cinquante.'], ['14,50 €', '€14.50', 'bad', '« quatorze » would be 14.'], ['5,40 €', '€5.40', 'bad', 'The numbers are in the order four… fifty.']] : [['2,00 €', '€2.00', 'good', 'Right: deux euros.'], ['12,00 €', '€12.00', 'bad', '« douze » would be 12.'], ['0,20 €', '€0.20', 'bad', '« vingt centimes » would be 20 cents.']]).map(o => o.concat(['end'])); }
        else if (s.srv) say(s.srv[0], s.srv[1], 'srv');
        if (n === 'end') say('Voilà. Merci, au revoir !', 'Here you go. Thank you, goodbye!', 'me');
        draw();
      }
      function draw() {
        host.querySelector('.at-cafe__log').innerHTML = log.map(l => `<li class="at-cafe__${l.who}"><span lang="fr">${esc(l.fr)}</span> <button type="button" class="at-ib" data-say="${esc(l.fr)}" aria-label="${T('Listen', 'استمع')}: ${esc(l.fr)}">🔊</button><small>${esc(l.en)}</small>${l.fb ? `<em class="at-cafe__fb at-cafe__fb--${l.q}">${esc(l.fb)}</em>` : ''}</li>`).join('');
        const opts = S[node].opts || [];
        host.querySelector('.at-cafe__opts').innerHTML = node === 'end' ? `<p><b>${T('Conversation complete.', 'اكتملت المحادثة.')}</b> <button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-cards>${T('Save these phrases as flashcards', 'احفظ العبارات كبطاقات')}</button></p>` : opts.map((o, i) => `<button type="button" class="at-opt" data-o="${i}"><span lang="fr">${esc(o[0])}</span><small>${esc(o[1])}</small></button>`).join('');
      }
      host.addEventListener('click', e => {
        const sp = e.target.closest('[data-say]'); if (sp) { speak(sp.dataset.say); return; }
        const b = e.target.closest('[data-o]'); if (b) { const o = S[node].opts[+b.dataset.o]; log.push({ fr: o[0], en: o[1], who: 'me', fb: o[3], q: o[2] }); if (o[2] === 'good') polite++; if (o[2] === 'bad') mist++; if (o[5]) croissant = true; enter(o[4]); c.onChange(); host.querySelector('.at-cafe__opts button') && host.querySelector('.at-cafe__opts button').focus(); return; }
        if (e.target.closest('[data-cards]')) { const n = LS.cards.addMany(log.filter(l => l.who !== 'srv' || true).filter((l, i, a) => a.findIndex(x => x.fr === l.fr) === i).map(l => ({ front: l.fr, back: l.en, kind: 'definition', topic: 'French: at the café', src: { type: 'experience', id: 'cafe', title: 'Ordering at a French café' } }))); LS.toast(n + ' ' + T('cards added.', 'بطاقات أُضيفت.')); }
      });
      enter('start');
      return { reset() { log = []; croissant = false; polite = 0; mist = 0; enter('start'); }, observe() { const used = log.some(l => l.who === 'me' && /^Je voudrais/.test(l.fr)); return { text: node === 'end' ? `Conversation complete: **${polite}** natural replies, **${mist}** mistake${mist === 1 ? '' : 's'} along the way${used ? ', and you ordered with « Je voudrais »' : ''}.` : `In progress: **${log.filter(l => l.who === 'me').length}** replies so far.`, predOk: used ? p => p === 0 : null }; } };
    }
  };

  /* ================= SOCIAL SCIENCE · run a city budget ================= */
  const AREAS = [['t', 'Public transport', 'النقل العام'], ['h', 'Housing', 'الإسكان'], ['g', 'Parks & green space', 'الحدائق'], ['s', 'Schools', 'المدارس'], ['hl', 'Health', 'الصحة']];
  const clamp = v => Math.max(0, Math.min(100, v));
  function cityModel(b, heat) {
    const air = clamp(50 + 0.8 * (b.t - 20) + 1.0 * (b.g - 20)), commute = Math.max(10, 40 - 0.6 * (b.t - 20)), afford = clamp(50 + 1.2 * (b.h - 20) - 0.3 * (b.g - 20)), edu = clamp(50 + 1.5 * (b.s - 20));
    let health = clamp(50 + 1.0 * (b.hl - 20) + 0.4 * (air - 50)); if (heat) health = clamp(health - (b.g >= 25 ? 3 : 12));
    const well = Math.round((air + afford + edu + health + clamp(100 - commute * 1.5)) / 5), spend = b.t + b.h + b.g + b.s + b.hl;
    return { air, commute, afford, edu, health, well, spend, balance: 100 - spend };
  }
  LS.exp.cityModel = cityModel;
  D.city = {
    intro: 'You have **100 budget units** a year for five services. Each indicator responds to your choices through a **simple rule you can read** (open “The rules” below the model). It is a teaching toy for thinking about trade-offs, not a forecast for any real city.',
    predict: { q: 'You cut public transport from 20 to 10 units. What happens to air quality in this model?', options: ['It gets worse', 'It gets better', 'It stays the same'] },
    preset: true,
    explore: 'Cut **public transport** to 10 and watch air quality and commute time. Then try to get wellbeing above 60 **without borrowing**. Finally switch on the **heatwave** and see which service helps.',
    explain: 'In this model, less public transport means more people drive, so **air quality falls** and commutes lengthen — and poorer air feeds into health. Money moved elsewhere improves something else: every choice is a trade-off. Real cities are far more complicated, but the habit of asking “what does this cut affect downstream?” is the point.',
    apply: [{ id: 'x-city1', type: 'mcq', difficulty: 2, prompt: 'In this model, why does spending more on parks help during a heatwave?', options: ['The rules say green space reduces heat stress, so health falls less', 'Parks lower the cost of housing', 'Parks shorten commute times', 'It does not help'], answer: 0, why: { 1: 'In the rules, parks slightly reduce housing affordability (they use land).', 2: 'Commute time depends only on public transport here.', 3: 'Check the rules: with 25 or more units, health drops by 3 instead of 12.' }, explain: 'The heatwave rule: health falls 12 points, but only 3 if green space gets 25 units or more (shade and cooling).' }],
    summary: ['Budgets force trade-offs: money moved helps one thing and costs another.', 'Effects travel: transport → air quality → health.', 'Models make assumptions visible — and every model leaves things out.'],
    build(host, c) {
      let b = { t: 20, h: 20, g: 20, s: 20, hl: 20 }, heat = false, minT = 20;
      host.innerHTML = `<div class="at-city"><div class="at-city__ind" aria-live="polite"></div><div class="at-x__ctl">${AREAS.map(([k, en, ar]) => c.slider(k, T(en, ar), 0, 45, 1, 20, '')).join('')}<label class="ls-chk"><input type="checkbox" data-heat> ${T('Heatwave this summer', 'موجة حر هذا الصيف')}</label></div><details class="at-city__rules"><summary>${T('The rules', 'القواعد')}</summary><ul><li>Air quality = 50 + 0.8 × (transport − 20) + 1.0 × (parks − 20)</li><li>Commute (min) = 40 − 0.6 × (transport − 20), at least 10</li><li>Housing affordability = 50 + 1.2 × (housing − 20) − 0.3 × (parks − 20)</li><li>Education = 50 + 1.5 × (schools − 20)</li><li>Health = 50 + 1.0 × (health − 20) + 0.4 × (air − 50); heatwave: −12, or −3 with parks ≥ 25</li><li>Wellbeing = average of air, affordability, education, health and (100 − 1.5 × commute)</li><li>Indicators are capped at 0–100. Spending over 100 units is borrowing.</li></ul></details></div>`;
      function draw() {
        const m = cityModel(b, heat); const bar = (lbl, v, unit, good) => `<li><span>${lbl}</span><span class="at-bar" aria-hidden="true"><i style="--w:${unit ? Math.min(100, v / 0.6) : v}%"></i></span><b class="${good == null ? '' : good ? 'ok' : 'warn'}">${Math.round(v)}${unit || ''}</b></li>`;
        host.querySelector('.at-city__ind').innerHTML = `<ul class="at-city__list">${bar(T('Air quality', 'جودة الهواء'), m.air, '', m.air >= 50)}${bar(T('Commute', 'وقت التنقل'), m.commute, ' min', m.commute <= 40)}${bar(T('Housing affordability', 'القدرة على السكن'), m.afford, '', m.afford >= 50)}${bar(T('Education', 'التعليم'), m.edu, '', m.edu >= 50)}${bar(T('Health', 'الصحة'), m.health, '', m.health >= 50)}${bar(T('Wellbeing', 'الرفاه'), m.well, '', m.well >= 50)}</ul><p class="${m.balance < 0 ? 'at-city__debt' : ''}">${m.balance < 0 ? `${T('Borrowing', 'اقتراض')} <b>${-m.balance}</b> ${T('units — this must be repaid in later years.', 'وحدة — يجب سدادها لاحقاً.')}` : `${T('Unspent', 'غير مُنفق')}: <b>${m.balance}</b> ${T('units', 'وحدة')}`}</p>`;
      }
      host.addEventListener('input', e => { const s = e.target.closest('[data-s]'); if (s) { b[s.dataset.s] = +s.value; host.querySelector(`[data-o="${s.dataset.s}"]`).textContent = s.value; minT = Math.min(minT, b.t); draw(); c.onChange(); } if (e.target.matches('[data-heat]')) { heat = e.target.checked; draw(); c.onChange(); } });
      draw();
      return { reset() { b = { t: 20, h: 20, g: 20, s: 20, hl: 20 }; heat = false; minT = 20; host.querySelectorAll('[data-s]').forEach(s => { s.value = 20; host.querySelector(`[data-o="${s.dataset.s}"]`).textContent = 20; }); host.querySelector('[data-heat]').checked = false; draw(); }, preset() {},
        observe() { const m = cityModel(b, heat), base = cityModel({ t: 20, h: 20, g: 20, s: 20, hl: 20 }, heat); return { text: `Transport **${b.t}**, housing **${b.h}**, parks **${b.g}**, schools **${b.s}**, health **${b.hl}**${heat ? ' (heatwave)' : ''}: air quality **${Math.round(m.air)}** (${m.air >= base.air ? '+' : '−'}${Math.abs(Math.round(m.air - base.air))} vs the even split), commute **${Math.round(m.commute)} min**, wellbeing **${m.well}**, ${m.balance < 0 ? `borrowing **${-m.balance}** units` : `**${m.balance}** units unspent`}.`, predOk: b.t <= 12 ? p => p === 0 : null }; } };
    }
  };
})();
