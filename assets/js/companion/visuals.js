/* ERLY — Interactive Visual Learning Engine.

   When a question would be clearer with a picture, Noor/Karim opens an
   interactive, accurate visual next to the explanation:

     detect(question)      → { id, mode } for the best visual (or null)
     open(host, id, opts)  → a lesson player: stages with captions, labels and
                             highlights, play/pause, speed, replay, step back and
                             forward, live variables ("change the radius"), a
                             guided tour narrated by the companion, keyboard
                             controls, and sync with what the companion is
                             saying (each spoken sentence moves the visual to
                             the stage it talks about).

   The scenes are hand-built and fact-checked (SVG for diagrams, three.js for
   3D) — the AI chooses WHICH visual and WHEN, and can also request a step-by-
   step flow visual for any other topic ("[[visual:flow|Title|Step > Step]]").
   It never invents formulas or anatomy: the content of each scene is fixed
   and reviewed. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = (en, ar) => (window.I18N && I18N.lang === 'ar' && ar ? ar : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* ---------- a tiny particle engine for SVG paths (pause + speed aware) ---------- */
  function flows(svg) {
    const list = [];
    return {
      add(path, o) {
        const len = path.getTotalLength();
        const dots = [];
        for (let i = 0; i < (o.count || 8); i++) {
          const c = document.createElementNS(NS, o.shape === 'rect' ? 'rect' : 'circle');
          if (o.shape === 'rect') { c.setAttribute('width', o.r * 2); c.setAttribute('height', o.r * 2); c.setAttribute('rx', 1.5); } else c.setAttribute('r', o.r || 4);
          c.setAttribute('fill', o.color); c.setAttribute('class', 'vz-dot ' + (o.cls || ''));
          if (o.label && i === 0) { /* first particle carries a label */ }
          svg.appendChild(c); dots.push(c);
        }
        const f = { path, len, dots, o, on: o.on !== false, t: 0 };
        list.push(f); return f;
      },
      tick(dt, speed) {
        list.forEach(f => {
          f.dots.forEach(d => { d.style.display = f.on ? '' : 'none'; });
          if (!f.on) return;
          f.t += dt * speed * (f.o.speed || 60);
          f.dots.forEach((d, i) => {
            const s = (f.t + i * f.len / f.dots.length) % f.len;
            const p = f.path.getPointAtLength(s);
            if (d.tagName === 'rect') { d.setAttribute('x', p.x - f.o.r); d.setAttribute('y', p.y - f.o.r); } else { d.setAttribute('cx', p.x); d.setAttribute('cy', p.y); }
            const fade = Math.min(1, s / 20, (f.len - s) / 20);
            d.setAttribute('opacity', Math.max(0, fade).toFixed(2));
          });
        });
      },
      all: list
    };
  }
  const svgEl = (w, h, inner) => { const d = document.createElement('div'); d.className = 'vz-svgwrap'; d.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="vz-svg" role="img">${inner}</svg>`; return d; };
  const q = (root, sel) => root.querySelector(sel);
  const qa = (root, sel) => Array.from(root.querySelectorAll(sel));
  const focusOn = (root, keys) => { qa(root, '[data-k]').forEach(n => { const on = keys.includes(n.dataset.k); n.classList.toggle('is-hi', on); n.classList.toggle('is-dim', keys.length > 0 && !on && !n.hasAttribute('data-keep')); }); };

  /* ======================= SCENES ======================= */
  const SCENES = {};

  /* ---------- 1. Photosynthesis ---------- */
  SCENES.photosynthesis = {
    title: ['Photosynthesis', 'التمثيل الضوئي'], subject: ['Biology', 'الأحياء'], mode: 'deep',
    stages: [
      { keys: ['sun', 'light'], title: ['Sunlight', 'ضوء الشمس'], text: ['Leaves capture light energy from the Sun using a green pigment called chlorophyll.', 'تلتقط الأوراق طاقة الضوء من الشمس بصبغة خضراء تسمى الكلوروفيل.'], words: /sun|light|chlorophyll|energy from/i },
      { keys: ['water', 'roots'], title: ['Water from the roots', 'الماء من الجذور'], text: ['Roots absorb water from the soil. It travels up the stem through tubes called xylem to the leaves.', 'تمتص الجذور الماء من التربة، ثم ينتقل عبر الساق في أنابيب تسمى الخشب إلى الأوراق.'], words: /water|root|xylem|soil/i },
      { keys: ['co2'], title: ['Carbon dioxide in', 'دخول ثاني أكسيد الكربون'], text: ['Carbon dioxide from the air enters the leaf through tiny pores called stomata.', 'يدخل ثاني أكسيد الكربون من الهواء إلى الورقة عبر ثقوب صغيرة تسمى الثغور.'], words: /carbon dioxide|co2|stomata|pores|air/i },
      { keys: ['chloro'], title: ['Inside the chloroplast', 'داخل البلاستيدة الخضراء'], text: ['In the chloroplasts, light energy is used to turn water and carbon dioxide into glucose: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.', 'في البلاستيدات الخضراء تُستخدم طاقة الضوء لتحويل الماء وثاني أكسيد الكربون إلى جلوكوز.'], words: /chloroplast|glucose|sugar|equation|turn.*into|chemical energy/i },
      { keys: ['o2', 'glucose'], title: ['Oxygen out, sugar stored', 'خروج الأكسجين وتخزين السكر'], text: ['Oxygen is released into the air as a by-product, and glucose is used for energy or stored as starch.', 'يخرج الأكسجين إلى الهواء كناتج ثانوي، ويُستخدم الجلوكوز للطاقة أو يُخزَّن كنشا.'], words: /oxygen|release|starch|stor/i }
    ],
    mount(box, api) {
      const w = svgEl(800, 480, `
        <defs><linearGradient id="vzSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff"/><stop offset="1" stop-color="#eaf7ff"/></linearGradient>
        <radialGradient id="vzSun"><stop offset="0" stop-color="#fff6b0"/><stop offset=".6" stop-color="#ffcf33"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>
        <linearGradient id="vzLeaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5cbf4a"/><stop offset="1" stop-color="#2e8b3a"/></linearGradient></defs>
        <rect width="800" height="380" fill="url(#vzSky)"/>
        <rect y="370" width="800" height="110" fill="#8a5a36"/><rect y="370" width="800" height="10" fill="#6a9a3a"/>
        <g data-k="sun"><circle cx="95" cy="85" r="70" fill="url(#vzSun)" class="vz-pulse"/><circle cx="95" cy="85" r="34" fill="#ffd23f"/></g>
        <path id="pLight" d="M130 110 L470 250" fill="none" stroke="#ffd23f" stroke-width="3" stroke-dasharray="6 8" data-k="light" opacity=".7"/>
        <path id="pLight2" d="M120 130 L330 250" fill="none" stroke="#ffd23f" stroke-width="3" stroke-dasharray="6 8" data-k="light" opacity=".7"/>
        <g data-k="roots" stroke="#c9a074" stroke-width="5" fill="none" stroke-linecap="round"><path d="M420 380 C410 410 380 430 350 460"/><path d="M420 380 C430 420 460 440 500 462"/><path d="M420 380 L420 470"/></g>
        <path d="M420 380 C418 320 424 260 420 190" stroke="#3d8b3a" stroke-width="12" fill="none" stroke-linecap="round"/>
        <g data-k="leaf" data-keep><path d="M420 250 C360 200 280 210 250 250 C300 290 380 290 420 250 Z" fill="url(#vzLeaf)"/><path d="M420 225 C480 170 570 175 600 215 C550 260 470 262 420 225 Z" fill="url(#vzLeaf)"/><path d="M420 195 C400 150 420 120 440 110 C460 140 450 175 420 195 Z" fill="url(#vzLeaf)"/></g>
        <g data-k="chloro" class="vz-callout"><circle cx="560" cy="330" r="62" fill="#e9f8e2" stroke="#2e8b3a" stroke-width="3"/><ellipse cx="560" cy="330" rx="40" ry="22" fill="#68c25b"/><path d="M528 330 h64 M535 322 h50 M535 338 h50" stroke="#2e7d32" stroke-width="3"/><path d="M505 290 L470 235" stroke="#2e8b3a" stroke-width="2" stroke-dasharray="4 4"/><text x="560" y="410" text-anchor="middle" class="vz-lbl">${T('chloroplast', 'بلاستيدة خضراء')}</text></g>
        <path id="pWater" d="M350 460 C380 430 410 410 420 380 C418 320 424 260 420 235 C450 230 480 222 500 215" fill="none" stroke="none"/>
        <path id="pCO2" d="M40 250 C120 240 200 245 300 250" fill="none" stroke="none"/>
        <path id="pO2" d="M520 205 C590 170 660 120 760 70" fill="none" stroke="none"/>
        <path id="pSugar" d="M330 250 C380 260 410 270 420 300 C421 340 420 360 421 395" fill="none" stroke="none"/>
        <text x="95" y="185" text-anchor="middle" class="vz-lbl" data-k="sun">${T('Sunlight', 'ضوء الشمس')}</text>
        <text x="270" y="445" class="vz-lbl vz-lbl--w" data-k="water">H₂O ${T('water', 'ماء')}</text>
        <text x="40" y="232" class="vz-lbl" data-k="co2">CO₂ ${T('carbon dioxide', 'ثاني أكسيد الكربون')}</text>
        <text x="640" y="72" class="vz-lbl" data-k="o2">O₂ ${T('oxygen', 'أكسجين')}</text>
        <text x="438" y="352" class="vz-lbl" data-k="glucose">${T('glucose (sugar)', 'جلوكوز (سكر)')}</text>
        <text x="300" y="230" class="vz-lbl vz-lbl--s" data-k="co2">${T('stomata', 'الثغور')}</text>`);
      box.appendChild(w); const svg = q(w, 'svg');
      const F = flows(svg);
      const L1 = F.add(q(svg, '#pLight'), { color: '#ffb300', r: 5, count: 7, speed: 120 }), L2 = F.add(q(svg, '#pLight2'), { color: '#ffb300', r: 5, count: 5, speed: 120 });
      const W = F.add(q(svg, '#pWater'), { color: '#2b8cf0', r: 5, count: 12, speed: 55 });
      const C = F.add(q(svg, '#pCO2'), { color: '#7d8590', r: 6, count: 6, speed: 50 });
      const O = F.add(q(svg, '#pO2'), { color: '#7fd3ff', r: 7, count: 7, speed: 45 });
      const S = F.add(q(svg, '#pSugar'), { color: '#ff9f1c', r: 5, count: 6, speed: 40, shape: 'rect' });
      return {
        stage(i) {
          const on = { 0: [L1, L2], 1: [L1, L2, W], 2: [L1, L2, W, C], 3: [L1, L2, W, C], 4: [L1, L2, W, C, O, S] }[i];
          F.all.forEach(f => { f.on = on.includes(f); });
          focusOn(svg, SCENES.photosynthesis.stages[i].keys.concat(i === 3 ? ['leaf'] : []));
          q(svg, '[data-k="chloro"]').style.opacity = i >= 3 ? 1 : 0;
        },
        tick: (dt, sp) => F.tick(dt, sp)
      };
    }
  };

  /* ---------- 2. The human heart ---------- */
  SCENES.heart = {
    title: ['How the heart works', 'كيف يعمل القلب'], subject: ['Biology · anatomy', 'الأحياء · التشريح'], mode: 'explorer',
    note: ['A simplified educational diagram (front view: the heart’s right side is on your left). Not for diagnosis.', 'رسم تعليمي مبسّط (منظر أمامي: الجانب الأيمن للقلب على يسارك). ليس للتشخيص.'],
    stages: [
      { keys: ['ra', 'rv', 'la', 'lv'], title: ['Four chambers', 'أربع حجرات'], text: ['The heart has four chambers: two atria on top that receive blood, and two ventricles below that pump it out.', 'للقلب أربع حجرات: أذينان في الأعلى يستقبلان الدم، وبطينان في الأسفل يضخانه.'], words: /four chambers|atri|ventricle|chamber/i },
      { keys: ['vc', 'ra'], title: ['Blood returns from the body', 'عودة الدم من الجسم'], text: ['Oxygen-poor blood from the body returns through the venae cavae into the right atrium.', 'يعود الدم الفقير بالأكسجين من الجسم عبر الوريدين الأجوفين إلى الأذين الأيمن.'], words: /vena|cava|return|right atrium|oxygen-poor|deoxygenated/i },
      { keys: ['ra', 'rv', 'pa'], title: ['To the lungs', 'إلى الرئتين'], text: ['It passes through the tricuspid valve into the right ventricle, which pumps it through the pulmonary artery to the lungs.', 'يمر عبر الصمام ثلاثي الشرفات إلى البطين الأيمن الذي يضخه عبر الشريان الرئوي إلى الرئتين.'], words: /right ventricle|pulmonary artery|tricuspid|to the lungs/i },
      { keys: ['lungs'], title: ['Gas exchange in the lungs', 'تبادل الغازات في الرئتين'], text: ['In the lungs, the blood releases carbon dioxide and picks up oxygen — it becomes oxygen-rich.', 'في الرئتين يطلق الدم ثاني أكسيد الكربون ويأخذ الأكسجين فيصبح غنياً بالأكسجين.'], words: /lung|gas exchange|picks up oxygen|oxygen-rich|oxygenated/i },
      { keys: ['pv', 'la', 'lv'], title: ['Back to the left side', 'العودة إلى الجانب الأيسر'], text: ['Oxygen-rich blood returns through the pulmonary veins to the left atrium, then through the mitral valve into the left ventricle.', 'يعود الدم الغني بالأكسجين عبر الأوردة الرئوية إلى الأذين الأيسر، ثم عبر الصمام التاجي إلى البطين الأيسر.'], words: /pulmonary vein|left atrium|mitral/i },
      { keys: ['lv', 'ao'], title: ['Out to the whole body', 'إلى الجسم كله'], text: ['The thick-walled left ventricle pumps blood out through the aorta to the rest of the body.', 'يضخ البطين الأيسر ذو الجدار السميك الدم عبر الأبهر إلى بقية الجسم.'], words: /aorta|left ventricle|whole body|rest of the body|systemic/i }
    ],
    mount(box, api) {
      const w = svgEl(800, 500, `
        <g data-k="lungs" class="vz-lungs"><path d="M150 40 C90 50 70 130 90 190 C120 200 170 190 200 160 C210 110 200 60 150 40 Z" fill="#f7b6c2"/><path d="M650 40 C710 50 730 130 710 190 C680 200 630 190 600 160 C590 110 600 60 650 40 Z" fill="#f7b6c2"/><text x="400" y="40" text-anchor="middle" class="vz-lbl">${T('Lungs', 'الرئتان')}</text></g>
        <g data-k="body" data-keep><rect x="300" y="452" width="200" height="38" rx="12" fill="#e7e2f5"/><text x="400" y="477" text-anchor="middle" class="vz-lbl">${T('Rest of the body', 'بقية الجسم')}</text></g>
        <g class="vz-beat">
          <path data-k="ra" d="M250 170 h130 v110 h-130 Z" rx="20" fill="#5b7fd6" class="vz-ch"/>
          <path data-k="rv" d="M250 285 h130 v120 c-40 30 -100 20 -130 -20 Z" fill="#3e5fb8" class="vz-ch"/>
          <path data-k="la" d="M420 170 h130 v110 h-130 Z" fill="#e2585b" class="vz-ch"/>
          <path data-k="lv" d="M420 285 h130 v100 c-30 40 -90 50 -130 20 Z" fill="#c43c3f" class="vz-ch"/>
          <path d="M398 168 v240" stroke="#7a3b3b" stroke-width="8"/>
        </g>
        <path data-k="vc" d="M215 60 V170 M215 450 V285" stroke="#5b7fd6" stroke-width="22" fill="none" opacity=".85"/>
        <path data-k="pa" d="M300 290 C300 210 320 130 170 120" stroke="#3e5fb8" stroke-width="20" fill="none" opacity=".85"/>
        <path data-k="pv" d="M630 120 C560 120 520 150 500 175" stroke="#e2585b" stroke-width="18" fill="none" opacity=".85"/>
        <path data-k="ao" d="M470 290 C470 170 520 110 440 80 C360 60 330 110 340 140 M590 300 C640 380 600 430 500 460" stroke="#c43c3f" stroke-width="22" fill="none" opacity=".85"/>
        <path id="hBlue" d="M215 470 V300 L250 300 C280 300 300 260 300 230 L300 330 C300 250 310 150 170 120" fill="none"/>
        <path id="hRed" d="M650 120 C560 120 510 160 490 210 L490 330 C480 250 500 160 470 100 C440 70 360 70 345 135" fill="none"/>
        <path id="hBody" d="M560 300 C640 380 600 440 500 465" fill="none"/>
        <text x="315" y="225" text-anchor="middle" class="vz-lbl vz-lbl--w" data-k="ra">${T('Right atrium', 'الأذين الأيمن')}</text>
        <text x="315" y="345" text-anchor="middle" class="vz-lbl vz-lbl--w" data-k="rv">${T('Right ventricle', 'البطين الأيمن')}</text>
        <text x="485" y="225" text-anchor="middle" class="vz-lbl vz-lbl--w" data-k="la">${T('Left atrium', 'الأذين الأيسر')}</text>
        <text x="485" y="345" text-anchor="middle" class="vz-lbl vz-lbl--w" data-k="lv">${T('Left ventricle', 'البطين الأيسر')}</text>
        <text x="200" y="62" text-anchor="end" class="vz-lbl vz-lbl--s" data-k="vc">${T('vena cava', 'الوريد الأجوف')}</text>
        <text x="250" y="110" class="vz-lbl vz-lbl--s" data-k="pa">${T('pulmonary artery', 'الشريان الرئوي')}</text>
        <text x="560" y="108" class="vz-lbl vz-lbl--s" data-k="pv">${T('pulmonary veins', 'الأوردة الرئوية')}</text>
        <text x="455" y="70" class="vz-lbl vz-lbl--s" data-k="ao">${T('aorta', 'الأبهر')}</text>
        <g class="vz-legend" data-keep><rect x="620" y="400" width="14" height="14" rx="3" fill="#3e5fb8"/><text x="640" y="412" class="vz-lbl vz-lbl--s">${T('oxygen-poor', 'فقير بالأكسجين')}</text><rect x="620" y="424" width="14" height="14" rx="3" fill="#c43c3f"/><text x="640" y="436" class="vz-lbl vz-lbl--s">${T('oxygen-rich', 'غني بالأكسجين')}</text></g>`);
      box.appendChild(w); const svg = q(w, 'svg');
      const F = flows(svg);
      const B = F.add(q(svg, '#hBlue'), { color: '#93b4ff', r: 5, count: 14, speed: 70 });
      const R = F.add(q(svg, '#hRed'), { color: '#ffb3b5', r: 5, count: 14, speed: 70 });
      const Y = F.add(q(svg, '#hBody'), { color: '#ffb3b5', r: 5, count: 5, speed: 70 });
      return {
        stage(i) {
          const on = { 0: [B, R, Y], 1: [B], 2: [B], 3: [B, R], 4: [R], 5: [R, Y] }[i];
          F.all.forEach(f => { f.on = on.includes(f); });
          focusOn(svg, SCENES.heart.stages[i].keys);
        },
        tick: (dt, sp) => F.tick(dt, sp)
      };
    }
  };

  /* ---------- 3. Electric circuit ---------- */
  SCENES.circuit = {
    title: ['How an electric circuit works', 'كيف تعمل الدائرة الكهربائية'], subject: ['Physics', 'الفيزياء'], mode: 'lab',
    stages: [
      { keys: ['bat', 'wire', 'sw', 'bulb'], title: ['The parts', 'الأجزاء'], text: ['A simple circuit has a battery (the energy source), wires, a switch and a bulb.', 'تتكون الدائرة البسيطة من بطارية (مصدر الطاقة) وأسلاك ومفتاح ومصباح.'], words: /battery|wire|parts|component/i, set: { closed: false } },
      { keys: ['sw'], title: ['Open circuit', 'دائرة مفتوحة'], text: ['When the switch is open there is a gap in the loop, so no current can flow and the bulb is off.', 'عندما يكون المفتاح مفتوحاً توجد فجوة في الحلقة، فلا يمر تيار ويبقى المصباح مطفأ.'], words: /open|gap|no current|break/i, set: { closed: false } },
      { keys: ['wire', 'bulb'], title: ['Closed circuit', 'دائرة مغلقة'], text: ['Close the switch and the loop is complete: current flows from the battery, through the bulb and back, and the bulb lights.', 'أغلق المفتاح فتكتمل الحلقة: يمر التيار من البطارية عبر المصباح ويعود، فيضيء المصباح.'], words: /closed|complete|current flows|lights up|loop/i, set: { closed: true } },
      { keys: ['bat', 'meter'], title: ["Ohm's law", 'قانون أوم'], text: ['Current = voltage ÷ resistance (I = V / R). Raise the voltage and more current flows, so the bulb glows brighter.', 'التيار = الجهد ÷ المقاومة (I = V / R). ارفع الجهد فيزيد التيار ويتوهج المصباح أكثر.'], words: /ohm|voltage|resistance|I = V/i, set: { closed: true } },
      { keys: ['bulb', 'bulb2', 'meter'], title: ['Two bulbs in series', 'مصباحان على التوالي'], text: ['Add a second bulb in series: the total resistance doubles, so the current halves and both bulbs are dimmer.', 'أضف مصباحاً ثانياً على التوالي: تتضاعف المقاومة الكلية فينخفض التيار للنصف ويخفت المصباحان.'], words: /series|second bulb|dimmer|two bulbs/i, set: { closed: true, two: true } }
    ],
    vars: [['v', ['Voltage (V)', 'الجهد (فولت)'], 1.5, 12, 0.5, 6], ['two', ['Second bulb', 'مصباح ثانٍ'], 0, 1, 1, 0]],
    mount(box, api) {
      const w = svgEl(800, 470, `
        <rect x="120" y="70" width="560" height="320" rx="24" fill="none" stroke="#c9a227" stroke-width="7" data-k="wire" id="cLoop"/>
        <path id="cPath" d="M144 70 H656 Q680 70 680 94 V366 Q680 390 656 390 H144 Q120 390 120 366 V94 Q120 70 144 70 Z" fill="none"/>
        <g data-k="bat" transform="translate(70 180)"><rect width="100" height="120" rx="12" fill="#2d2f3a"/><rect x="30" y="-12" width="40" height="14" rx="3" fill="#9aa"/><text x="50" y="52" text-anchor="middle" fill="#ffd23f" font-size="28" font-weight="700">+</text><text x="50" y="98" text-anchor="middle" fill="#9fb" font-size="30" font-weight="700">−</text></g>
        <g data-k="sw" id="cSw" class="vz-click" tabindex="0" role="button"><rect x="350" y="45" width="100" height="50" fill="#f6f4ee"/><circle cx="360" cy="70" r="7" fill="#444"/><circle cx="440" cy="70" r="7" fill="#444"/><line id="cLever" x1="360" y1="70" x2="436" y2="70" stroke="#333" stroke-width="7" stroke-linecap="round"/><text x="400" y="36" text-anchor="middle" class="vz-lbl">${T('switch — click me', 'المفتاح — اضغط هنا')}</text></g>
        <g data-k="bulb" transform="translate(680 230)"><circle r="70" fill="#ffe680" opacity="0" id="cGlow1"/><circle r="34" fill="#fff8d6" stroke="#999" stroke-width="3" id="cB1"/><path d="M-10 6 l6 -12 l8 12 l6 -12" stroke="#a67c00" stroke-width="3" fill="none"/><rect x="-14" y="30" width="28" height="18" rx="3" fill="#888"/><text x="0" y="78" text-anchor="middle" class="vz-lbl">${T('bulb', 'مصباح')} 10 Ω</text></g>
        <g data-k="bulb2" id="cBulb2" transform="translate(400 390)"><circle r="70" fill="#ffe680" opacity="0" id="cGlow2"/><circle r="30" fill="#fff8d6" stroke="#999" stroke-width="3" id="cB2"/><path d="M-9 5 l5 -10 l7 10 l5 -10" stroke="#a67c00" stroke-width="3" fill="none"/><text x="0" y="62" text-anchor="middle" class="vz-lbl">${T('bulb 2', 'مصباح 2')} 10 Ω</text></g>
        <g data-k="meter" transform="translate(200 150)"><rect width="240" height="96" rx="14" fill="#101522" opacity=".92"/><text x="16" y="34" fill="#9fd6ff" font-size="20" font-family="ui-monospace,monospace" id="cV">V = 6.0 V</text><text x="16" y="62" fill="#ffe08a" font-size="20" font-family="ui-monospace,monospace" id="cR">R = 10 Ω</text><text x="16" y="88" fill="#a7f3c0" font-size="20" font-family="ui-monospace,monospace" id="cI">I = 0.60 A</text></g>
        <text x="400" y="455" text-anchor="middle" class="vz-lbl vz-lbl--s">${T('dots show electrons; conventional current flows the other way (+ to −)', 'النقاط تمثل الإلكترونات؛ التيار الاصطلاحي يسري بالاتجاه المعاكس (من + إلى −)')}</text>`);
      box.appendChild(w); const svg = q(w, 'svg');
      const F = flows(svg);
      const E = F.add(q(svg, '#cPath'), { color: '#5ec8ff', r: 5, count: 26, speed: 60 });
      const st = { closed: false, v: 6, two: false };
      const sw = q(svg, '#cSw'), lever = q(svg, '#cLever');
      const update = () => {
        const R = st.two ? 20 : 10, I = st.closed ? st.v / R : 0, P = I * I * 10;
        lever.setAttribute('x2', st.closed ? 436 : 420); lever.setAttribute('y2', st.closed ? 70 : 30);
        E.on = st.closed; E.o.speed = 25 + I * 110;
        const g = Math.min(1, P / 3.6);
        q(svg, '#cGlow1').setAttribute('opacity', (g * 0.9).toFixed(2)); q(svg, '#cB1').setAttribute('fill', st.closed ? `rgb(255,${Math.round(240 - 40 * g)},${Math.round(150 - 100 * g)})` : '#fff8d6');
        q(svg, '#cBulb2').style.display = st.two ? '' : 'none';
        q(svg, '#cGlow2').setAttribute('opacity', st.two ? (g * 0.9).toFixed(2) : 0);
        q(svg, '#cV').textContent = `V = ${st.v.toFixed(1)} V`; q(svg, '#cR').textContent = `R = ${R} Ω`; q(svg, '#cI').textContent = `I = ${I.toFixed(2)} A`;
        api.status(st.closed ? T(`Closed: ${I.toFixed(2)} A flowing`, `مغلقة: يمر ${I.toFixed(2)} أمبير`) : T('Open: no current', 'مفتوحة: لا يوجد تيار'));
      };
      const toggle = () => { st.closed = !st.closed; update(); };
      sw.addEventListener('click', toggle); sw.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      update();
      return {
        stage(i) { const s = SCENES.circuit.stages[i].set; st.closed = s.closed; st.two = !!s.two; api.setVar('two', st.two ? 1 : 0); update(); focusOn(svg, SCENES.circuit.stages[i].keys); },
        set(k, val) { if (k === 'v') st.v = val; if (k === 'two') st.two = !!val; update(); },
        tick: (dt, sp) => F.tick(dt, sp),
        state: () => Object.assign({}, st)
      };
    }
  };

  /* ---------- 4. Tectonic plates ---------- */
  SCENES.tectonics = {
    title: ['How tectonic plates move', 'كيف تتحرك الصفائح التكتونية'], subject: ['Geography · Earth science', 'الجغرافيا · علوم الأرض'], mode: 'deep',
    stages: [
      { keys: ['crust', 'mantle', 'core'], title: ['Earth’s layers', 'طبقات الأرض'], text: ['The rigid outer shell (crust and upper mantle) is broken into plates that float on the hotter, slowly flowing mantle.', 'تنقسم القشرة الصلبة الخارجية إلى صفائح تطفو على الوشاح الأكثر حرارة الذي يتحرك ببطء.'], words: /layer|crust|mantle|core|lithosphere/i },
      { keys: ['conv'], title: ['Convection currents', 'تيارات الحمل'], text: ['Heat from the core makes mantle rock rise, spread and sink in slow loops — convection currents that drag the plates along.', 'تجعل حرارة اللب صخور الوشاح ترتفع وتنتشر وتهبط في حلقات بطيئة — تيارات الحمل التي تسحب الصفائح.'], words: /convection|heat|current|rise and sink/i },
      { keys: ['div'], title: ['Divergent boundary', 'حد متباعد'], text: ['Where plates move apart, magma rises to fill the gap and makes new crust — like the mid-Atlantic ridge.', 'حيث تتباعد الصفائح، تصعد الصهارة لتملأ الفجوة وتكوّن قشرة جديدة — مثل حيد وسط الأطلسي.'], words: /diverg|apart|ridge|new crust|spreading/i },
      { keys: ['conv2'], title: ['Convergent boundary', 'حد متقارب'], text: ['Where plates collide, the denser ocean plate sinks beneath the other (subduction), forming trenches and volcanoes.', 'حيث تتصادم الصفائح، تغوص الصفيحة المحيطية الأكثف تحت الأخرى (الاندساس)، فتتكون خنادق وبراكين.'], words: /converg|collide|subduct|trench|volcano/i },
      { keys: ['trans'], title: ['Transform boundary', 'حد تحويلي'], text: ['Where plates slide past each other, stress builds up and is released as earthquakes — like the San Andreas Fault.', 'حيث تنزلق الصفائح بجانب بعضها، يتراكم الإجهاد ويتحرر على شكل زلازل — مثل صدع سان أندرياس.'], words: /transform|slide|earthquake|fault/i }
    ],
    mount(box, api) {
      const w = svgEl(800, 470, `
        <rect width="800" height="470" fill="#0e1726"/>
        <g data-k="core" data-keep><circle cx="400" cy="760" r="330" fill="#ff8a3d"/><circle cx="400" cy="760" r="220" fill="#ffc24a"/><text x="400" y="460" text-anchor="middle" class="vz-lbl vz-lbl--d">${T('outer core', 'اللب الخارجي')}</text></g>
        <g data-k="mantle"><path d="M0 170 H800 V470 H0 Z" fill="#c2410c" opacity=".55"/><text x="30" y="300" class="vz-lbl vz-lbl--w">${T('mantle (slowly flowing rock)', 'الوشاح (صخور تتدفق ببطء)')}</text></g>
        <g data-k="conv"><path id="tL" d="M380 380 C380 250 330 200 200 200 C90 200 60 300 120 360 C170 400 300 400 380 380" fill="none" stroke="#fdba74" stroke-width="2" stroke-dasharray="6 8"/><path id="tR" d="M420 380 C420 250 470 200 600 200 C710 200 740 300 680 360 C630 400 500 400 420 380" fill="none" stroke="#fdba74" stroke-width="2" stroke-dasharray="6 8"/></g>
        <g data-k="crust" data-keep><g id="tPl" class="vz-plate"><rect x="0" y="130" width="392" height="40" fill="#6b7c93"/><rect x="0" y="118" width="392" height="12" fill="#2563eb" opacity=".8"/></g><g id="tPr" class="vz-plate"><rect x="408" y="130" width="392" height="40" fill="#8a9bb0"/><rect x="408" y="118" width="392" height="12" fill="#2563eb" opacity=".8"/></g><text x="20" y="110" class="vz-lbl vz-lbl--w">${T('plate', 'صفيحة')}</text><text x="700" y="110" class="vz-lbl vz-lbl--w">${T('plate', 'صفيحة')}</text></g>
        <g data-k="div"><path d="M392 170 C396 200 404 200 408 170 L408 120 L392 120 Z" fill="#ff5a1f"/><path d="M400 300 C398 250 402 210 400 170" stroke="#ff8a3d" stroke-width="10" fill="none" class="vz-pulse"/><text x="400" y="100" text-anchor="middle" class="vz-lbl vz-lbl--w">${T('magma rises → new crust', 'تصعد الصهارة ← قشرة جديدة')}</text></g>
        <g data-k="conv2" style="display:none" id="tSub"><path d="M60 130 L420 130 L560 300 L520 310 L400 172 L60 172 Z" fill="#6b7c93"/><path d="M430 130 L800 130 L800 172 L470 172 Z" fill="#a0855b"/><path d="M560 128 L600 60 L640 128 Z" fill="#7c4a2d"/><path d="M598 62 C590 40 610 30 604 10" stroke="#9aa" stroke-width="6" fill="none" opacity=".7"/><text x="230" y="110" class="vz-lbl vz-lbl--w">${T('ocean plate (denser)', 'صفيحة محيطية (أكثف)')}</text><text x="640" y="110" class="vz-lbl vz-lbl--w">${T('continent', 'قارة')}</text><text x="470" y="250" class="vz-lbl vz-lbl--w">${T('subduction', 'اندساس')}</text></g>
        <g data-k="trans" style="display:none" id="tTr"><rect x="60" y="40" width="680" height="380" rx="16" fill="#1e293b"/><g id="tTa"><rect x="80" y="60" width="640" height="170" fill="#6b7c93"/><text x="400" y="150" text-anchor="middle" class="vz-lbl vz-lbl--w">${T('plate moving this way →', 'صفيحة تتحرك بهذا الاتجاه ←')}</text></g><g id="tTb"><rect x="80" y="236" width="640" height="170" fill="#8a9bb0"/><text x="400" y="326" text-anchor="middle" class="vz-lbl vz-lbl--w">${T('← plate moving that way', '← صفيحة تتحرك بالاتجاه الآخر')}</text></g><path d="M80 233 H720" stroke="#ef4444" stroke-width="4" stroke-dasharray="10 6"/><text x="400" y="440" text-anchor="middle" class="vz-lbl vz-lbl--w" id="tQuake">${T('fault line (view from above)', 'خط الصدع (منظر علوي)')}</text></g>`);
      box.appendChild(w); const svg = q(w, 'svg');
      const F = flows(svg);
      F.add(q(svg, '#tL'), { color: '#fde68a', r: 4, count: 12, speed: 30 }); F.add(q(svg, '#tR'), { color: '#fde68a', r: 4, count: 12, speed: 30 });
      let mode = 0, t = 0;
      return {
        stage(i) {
          mode = i; focusOn(svg, SCENES.tectonics.stages[i].keys.concat(i >= 2 ? ['crust'] : []));
          q(svg, '#tSub').style.display = i === 3 ? '' : 'none';
          q(svg, '#tTr').style.display = i === 4 ? '' : 'none';
          q(svg, '[data-k="div"]').style.display = i === 2 || i < 2 ? '' : 'none';
          q(svg, '[data-k="crust"]').style.display = i === 3 || i === 4 ? 'none' : '';
        },
        tick(dt, sp) {
          F.tick(dt, sp); t += dt * sp;
          const d = Math.sin(t * 0.6) * 6 + 6;
          if (mode <= 2) { q(svg, '#tPl').setAttribute('transform', `translate(${-d} 0)`); q(svg, '#tPr').setAttribute('transform', `translate(${d} 0)`); }
          if (mode === 4) { const s = (t * 20) % 60; q(svg, '#tTa').setAttribute('transform', `translate(${s - 30} 0)`); q(svg, '#tTb').setAttribute('transform', `translate(${30 - s} 0)`); q(svg, '#tQuake').style.fill = s > 55 ? '#ef4444' : ''; }
        }
      };
    }
  };

  /* ---------- 5. Newton's laws (three interactive labs) ---------- */
  SCENES.newton = {
    title: ["Newton's three laws of motion", 'قوانين نيوتن الثلاثة للحركة'], subject: ['Physics', 'الفيزياء'], mode: 'lab',
    stages: [
      { keys: ['l1'], title: ['1st law: inertia', 'القانون الأول: القصور الذاتي'], text: ['An object keeps moving at the same speed in a straight line unless a force acts on it. Turn friction to zero and the puck never stops.', 'يستمر الجسم في الحركة بالسرعة نفسها في خط مستقيم ما لم تؤثر عليه قوة. اجعل الاحتكاك صفراً فلن يتوقف القرص.'], words: /first law|inertia|keeps moving|unless a force/i },
      { keys: ['l2'], title: ['2nd law: F = m × a', 'القانون الثاني: ق = ك × ت'], text: ['Acceleration equals force divided by mass (a = F / m). Double the force and the cart accelerates twice as fast; double the mass and it accelerates half as fast.', 'التسارع يساوي القوة مقسومة على الكتلة (ت = ق / ك). ضاعف القوة يتضاعف التسارع؛ ضاعف الكتلة ينخفض التسارع للنصف.'], words: /second law|f ?= ?ma|acceleration|force.*mass/i },
      { keys: ['l3'], title: ['3rd law: action and reaction', 'القانون الثالث: الفعل ورد الفعل'], text: ['When two skaters push each other, the forces are equal and opposite. The lighter skater moves away faster.', 'عندما يدفع متزلجان بعضهما تكون القوتان متساويتين ومتعاكستين. ينطلق المتزلج الأخف بسرعة أكبر.'], words: /third law|action|reaction|equal and opposite/i }
    ],
    vars: [['fric', ['Friction (law 1)', 'الاحتكاك (ق1)'], 0, 1, 0.05, 0.3], ['force', ['Force N (law 2)', 'القوة ن (ق2)'], 1, 20, 1, 10], ['mass', ['Mass kg (law 2/3)', 'الكتلة كغ (ق2/3)'], 1, 10, 1, 2]],
    mount(box, api) {
      const c = document.createElement('canvas'); c.className = 'vz-canvas'; c.width = 800; c.height = 460; box.appendChild(c);
      const g = c.getContext('2d');
      const st = { law: 0, fric: 0.3, force: 10, mass: 2, x: 80, v: 260, cx: 60, cv: 0, s1: 400, s2: 400, v1: 0, v2: 0, t: 0 };
      const reset = () => { st.x = 80; st.v = 260; st.cx = 60; st.cv = 0; st.s1 = 380; st.s2 = 420; st.v1 = 0; st.v2 = 0; st.t = 0; };
      reset();
      const arrow = (x1, y1, x2, y2, col, label) => { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); const a = Math.atan2(y2 - y1, x2 - x1); g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - 12 * Math.cos(a - 0.4), y2 - 12 * Math.sin(a - 0.4)); g.lineTo(x2 - 12 * Math.cos(a + 0.4), y2 - 12 * Math.sin(a + 0.4)); g.fill(); if (label) { g.font = '600 15px system-ui'; g.fillText(label, (x1 + x2) / 2 - 20, Math.min(y1, y2) - 10); } };
      function draw() {
        g.clearRect(0, 0, 800, 460);
        g.fillStyle = '#f4f7fb'; g.fillRect(0, 0, 800, 460);
        g.font = '600 16px system-ui'; g.fillStyle = '#334';
        if (st.law === 0) {
          g.fillStyle = st.fric < 0.02 ? '#dbeefe' : '#e9e4d8'; g.fillRect(0, 300, 800, 40);
          g.fillStyle = '#334'; g.fillText(st.fric < 0.02 ? T('frictionless ice', 'جليد بلا احتكاك') : T(`surface with friction ${st.fric.toFixed(2)}`, `سطح باحتكاك ${st.fric.toFixed(2)}`), 20, 370);
          g.fillStyle = '#1f2937'; g.beginPath(); g.ellipse(st.x, 290, 34, 12, 0, 0, 7); g.fill();
          if (st.v > 2) arrow(st.x + 40, 260, st.x + 40 + Math.min(160, st.v * 0.4), 260, '#16a34a', T('velocity', 'السرعة'));
          if (st.fric > 0.02 && st.v > 2) arrow(st.x - 40, 240, st.x - 40 - st.fric * 90, 240, '#dc2626', T('friction', 'الاحتكاك'));
          g.fillStyle = '#334'; g.fillText(T(`speed ${st.v.toFixed(0)} px/s`, `السرعة ${st.v.toFixed(0)}`), 20, 40);
        } else if (st.law === 1) {
          const a = st.force / st.mass;
          g.fillStyle = '#e9e4d8'; g.fillRect(0, 330, 800, 30);
          const w = 60 + st.mass * 8; g.fillStyle = '#2563eb'; g.fillRect(st.cx, 330 - 50 - st.mass * 3, w, 50 + st.mass * 3);
          g.fillStyle = '#111'; g.beginPath(); g.arc(st.cx + 14, 335, 10, 0, 7); g.arc(st.cx + w - 14, 335, 10, 0, 7); g.fill();
          arrow(st.cx - 10 - st.force * 6, 300, st.cx - 10, 300, '#dc2626', `F = ${st.force} N`);
          g.fillStyle = '#334'; g.font = '700 20px ui-monospace,monospace';
          g.fillText(`a = F / m = ${st.force} / ${st.mass} = ${a.toFixed(2)} m/s²`, 20, 50);
          g.font = '600 15px system-ui'; g.fillText(T(`velocity after ${st.t.toFixed(1)} s: ${(a * st.t).toFixed(1)} m/s`, `السرعة بعد ${st.t.toFixed(1)} ث: ${(a * st.t).toFixed(1)} م/ث`), 20, 80);
        } else {
          g.fillStyle = '#dbeefe'; g.fillRect(0, 330, 800, 30);
          const m1 = 4, m2 = st.mass; // skater 1 fixed 4 units; skater 2 uses the mass slider
          const person = (x, m, col) => { const h = 70 + m * 5; g.fillStyle = col; g.fillRect(x - 12, 330 - h, 24, h - 22); g.beginPath(); g.arc(x, 330 - h - 12, 14, 0, 7); g.fill(); g.fillRect(x - 16, 312, 32, 8); };
          person(st.s1, m1, '#7c3aed'); person(st.s2, m2, '#ea580c');
          if (st.t < 0.35) { arrow(st.s1 + 10, 240, st.s1 - 60, 240, '#dc2626', T('force', 'قوة')); arrow(st.s2 - 10, 240, st.s2 + 60, 240, '#dc2626', T('equal force', 'قوة مساوية')); }
          g.fillStyle = '#334'; g.font = '600 15px system-ui';
          g.fillText(T(`left skater ${m1 * 15} kg → ${(-st.v1 / 40).toFixed(2)} m/s    right skater ${m2 * 15} kg → ${(st.v2 / 40).toFixed(2)} m/s`, `المتزلج الأيسر ${m1 * 15} كغ ← ${(-st.v1 / 40).toFixed(2)} م/ث    الأيمن ${m2 * 15} كغ ← ${(st.v2 / 40).toFixed(2)} م/ث`), 20, 40);
        }
      }
      return {
        stage(i) { st.law = i; reset(); if (i === 2) { const impulse = 400; st.v1 = -impulse / 4; st.v2 = impulse / st.mass; } api.status(SCENES.newton.stages[i].title[0]); },
        set(k, v) { st[k] = v; if (k === 'mass' && st.law === 2) this.stage(2); if (k === 'force' && st.law === 1) { st.cx = 60; st.cv = 0; st.t = 0; } },
        tick(dt, sp) {
          dt *= sp;
          if (st.law === 0) { st.v = Math.max(0, st.v - st.fric * 160 * dt); st.x += st.v * dt; if (st.x > 840) st.x = -40; if (st.v === 0) { st.wait = (st.wait || 0) + dt; if (st.wait > 1.5) { st.wait = 0; st.x = 80; st.v = 260; } } }
          else if (st.law === 1) { st.t += dt; const a = st.force / st.mass; st.cv += a * 18 * dt; st.cx += st.cv * dt; if (st.cx > 820) { st.cx = 60; st.cv = 0; st.t = 0; } }
          else { st.t += dt; st.s1 += st.v1 * dt; st.s2 += st.v2 * dt; if (st.s1 < -40 || st.s2 > 840) this.stage(2); }
          draw();
        },
        state: () => Object.assign({}, st)
      };
    }
  };

  /* ---------- 6. Graph plotter (mathematical visualiser) ---------- */
  function parseExpr(src) {
    // safe recursive-descent parser: numbers, x, + - * / ^, ( ), sin cos tan sqrt abs exp ln log, pi, e
    const s = String(src).replace(/\s+/g, '').replace(/π/g, 'pi').replace(/×/g, '*').replace(/(\d)(x|\(|pi|e\b|sin|cos|tan|sqrt|abs|exp|ln|log)/g, '$1*$2').replace(/\)(\(|x|\d)/g, ')*$1');
    let i = 0;
    const peek = () => s[i], eat = c => { if (s[i] === c) { i++; return true; } return false; };
    function prim() {
      if (eat('(')) { const v = add(); if (!eat(')')) throw new Error(')'); return v; }
      if (eat('-')) { const v = pow(); return x => -v(x); }
      const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)/); if (m) { i += m[0].length; const n = +m[0]; return () => n; }
      const f = s.slice(i).match(/^(sin|cos|tan|sqrt|abs|exp|ln|log)/); if (f) { i += f[0].length; const a = prim(); const fn = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log: Math.log10 }[f[0]]; return x => fn(a(x)); }
      if (s.startsWith('pi', i)) { i += 2; return () => Math.PI; }
      if (eat('x')) return x => x;
      if (eat('e')) return () => Math.E;
      throw new Error('bad');
    }
    function pow() { const b = prim(); if (eat('^')) { const e = pow(); return x => Math.pow(b(x), e(x)); } return b; }
    function mul() { let v = pow(); for (;;) { if (eat('*')) { const a = v, b = pow(); v = x => a(x) * b(x); } else if (eat('/')) { const a = v, b = pow(); v = x => a(x) / b(x); } else return v; } }
    function add() { let v = mul(); for (;;) { if (eat('+')) { const a = v, b = mul(); v = x => a(x) + b(x); } else if (s[i] === '-') { i++; const a = v, b = mul(); v = x => a(x) - b(x); } else return v; } }
    const f = add(); if (i < s.length) throw new Error('bad'); return f;
  }
  SCENES.graph = {
    title: ['Graphs of functions', 'التمثيل البياني للدوال'], subject: ['Mathematics', 'الرياضيات'], mode: 'math',
    stages: [
      { keys: [], title: ['A parabola', 'القطع المكافئ'], text: ['y = ax² + bx + c draws a U-shaped curve called a parabola.', 'المعادلة ص = أس² + بس + ج ترسم منحنى على شكل U يسمى القطع المكافئ.'], words: /parabola|quadratic|curve|shape/i, set: { a: 1, b: 0, c: 0 } },
      { keys: [], title: ['What “a” does', 'دور المعامل a'], text: ['“a” sets the width and direction: a bigger a makes it narrower, a negative a flips it upside down.', 'المعامل a يحدد العرض والاتجاه: كلما كبر صار أضيق، والقيمة السالبة تقلبه.'], words: /\ba\b.*(wid|narrow|flip|direction)|negative a/i, set: { a: -0.5, b: 0, c: 2 } },
      { keys: [], title: ['What “c” does', 'دور الثابت c'], text: ['“c” moves the whole curve up or down; it is where the graph crosses the y-axis.', 'الثابت c يحرك المنحنى كله لأعلى أو لأسفل، وهو نقطة تقاطعه مع محور ص.'], words: /\bc\b.*(up|down|shift)|y-intercept|crosses the y/i, set: { a: 1, b: 0, c: -3 } },
      { keys: [], title: ['Roots', 'الجذور'], text: ['The roots are where y = 0 — where the curve crosses the x-axis. The discriminant b² − 4ac tells you how many there are.', 'الجذور هي حيث ص = 0 — حيث يقطع المنحنى محور س. المميز ب² − 4أج يخبرك بعددها.'], words: /root|zero|discriminant|crosses the x/i, set: { a: 1, b: -1, c: -6 } },
      { keys: [], title: ['The vertex', 'الرأس'], text: ['The turning point (vertex) is at x = −b / 2a. Try any function of your own in the box!', 'نقطة الانعطاف (الرأس) عند س = −ب / 2أ. جرّب أي دالة في المربع!'], words: /vertex|turning point|minimum|maximum/i, set: { a: 1, b: 4, c: 1 } }
    ],
    vars: [['a', ['a', 'a'], -3, 3, 0.1, 1], ['b', ['b', 'b'], -6, 6, 0.5, 0], ['c', ['c', 'c'], -6, 6, 0.5, 0]],
    mount(box, api) {
      const wrap = document.createElement('div'); wrap.className = 'vz-graph';
      wrap.innerHTML = `<canvas class="vz-canvas" width="800" height="440"></canvas><label class="vz-fx">y = <input type="text" value="" placeholder="${T('or type a function, e.g. sin(x) or x^3 - 2x', 'أو اكتب دالة، مثل sin(x)')}" aria-label="${T('Function to plot', 'الدالة المراد رسمها')}"></label>`;
      box.appendChild(wrap);
      const c = q(wrap, 'canvas'), g = c.getContext('2d'), inp = q(wrap, 'input');
      const st = { a: 1, b: 0, c: 0, custom: null };
      const X = x => 400 + x * 40, Y = y => 220 - y * 30;
      function draw() {
        g.clearRect(0, 0, 800, 440); g.fillStyle = '#fbfcff'; g.fillRect(0, 0, 800, 440);
        g.strokeStyle = '#e3e8f2'; g.lineWidth = 1;
        for (let x = -10; x <= 10; x++) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), 440); g.stroke(); }
        for (let y = -7; y <= 7; y++) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(800, Y(y)); g.stroke(); }
        g.strokeStyle = '#475569'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(800, Y(0)); g.moveTo(X(0), 0); g.lineTo(X(0), 440); g.stroke();
        g.fillStyle = '#64748b'; g.font = '12px system-ui'; for (let x = -9; x <= 9; x += 3) g.fillText(x, X(x) + 3, Y(0) + 14); for (let y = -6; y <= 6; y += 3) if (y) g.fillText(y, X(0) + 5, Y(y) - 3);
        const f = st.custom || (x => st.a * x * x + st.b * x + st.c);
        g.strokeStyle = '#7c3aed'; g.lineWidth = 3.5; g.beginPath(); let pen = false;
        for (let px = 0; px <= 800; px += 2) { const x = (px - 400) / 40, y = f(x); if (!isFinite(y) || Math.abs(y) > 50) { pen = false; continue; } if (!pen) { g.moveTo(px, Y(y)); pen = true; } else g.lineTo(px, Y(y)); }
        g.stroke();
        g.font = '700 18px ui-monospace,monospace'; g.fillStyle = '#1e1b4b';
        if (!st.custom) {
          const { a, b, c: cc } = st;
          g.fillText(`y = ${a.toFixed(1)}x² ${b < 0 ? '−' : '+'} ${Math.abs(b).toFixed(1)}x ${cc < 0 ? '−' : '+'} ${Math.abs(cc).toFixed(1)}`, 16, 28);
          if (Math.abs(a) > 1e-6) {
            const D = b * b - 4 * a * cc, vx = -b / (2 * a), vy = f(vx);
            g.font = '600 14px system-ui'; g.fillStyle = '#334155';
            g.fillText(`${T('discriminant', 'المميز')} b² − 4ac = ${D.toFixed(2)}  →  ${D > 0 ? T('2 roots', 'جذران') : D === 0 ? T('1 root', 'جذر واحد') : T('no real roots', 'لا جذور حقيقية')}`, 16, 52);
            g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(X(vx), Y(vy), 7, 0, 7); g.fill(); g.fillStyle = '#92400e'; g.fillText(`${T('vertex', 'الرأس')} (${vx.toFixed(2)}, ${vy.toFixed(2)})`, X(vx) + 10, Y(vy) + (a > 0 ? 22 : -10));
            if (D >= 0) { [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].forEach(r => { g.fillStyle = '#16a34a'; g.beginPath(); g.arc(X(r), Y(0), 7, 0, 7); g.fill(); g.fillStyle = '#14532d'; g.fillText(`x = ${r.toFixed(2)}`, X(r) - 22, Y(0) - 12); }); }
            g.fillStyle = '#2563eb'; g.beginPath(); g.arc(X(0), Y(cc), 6, 0, 7); g.fill();
          }
        } else { g.fillText('y = ' + inp.value, 16, 28); }
      }
      inp.addEventListener('input', () => { const v = inp.value.trim(); if (!v) { st.custom = null; api.status(''); draw(); return; } try { const f = parseExpr(v); f(1); st.custom = f; api.status(''); } catch (e) { api.status(T('I can’t read that function yet — try e.g. 2x^2 - 3 or sin(x)', 'لا أستطيع قراءة هذه الدالة — جرّب مثلاً 2x^2 - 3')); } draw(); });
      draw();
      return {
        stage(i) { const s = SCENES.graph.stages[i].set; Object.assign(st, s); st.custom = null; inp.value = ''; ['a', 'b', 'c'].forEach(k => api.setVar(k, s[k])); draw(); },
        set(k, v) { st[k] = v; st.custom = null; inp.value = ''; draw(); },
        tick() {},
        state: () => Object.assign({}, st)
      };
    }
  };

  /* ---------- 7 & 8. 3D scenes: gravity / orbits, cylinder volume (three.js) ---------- */
  async function three() { return import('three'); }
  function dragRotate(el, onMove) {
    let down = null;
    el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (!down) return; onMove(e.clientX - down[0], e.clientY - down[1]); down = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', () => { down = null; });
    el.addEventListener('wheel', e => { e.preventDefault(); onMove(0, 0, e.deltaY); }, { passive: false });
  }
  SCENES.gravity = {
    title: ['Gravity and orbits', 'الجاذبية والمدارات'], subject: ['Physics · astronomy', 'الفيزياء · الفلك'], mode: 'explorer',
    note: ['Distances and sizes are not to scale. Drag to rotate, scroll to zoom.', 'المسافات والأحجام ليست بمقياس حقيقي. اسحب للتدوير ومرّر للتكبير.'],
    stages: [
      { keys: ['sun'], title: ['The Sun and planets', 'الشمس والكواكب'], text: ['The planets travel around the Sun because of gravity — the attraction between masses.', 'تدور الكواكب حول الشمس بسبب الجاذبية — التجاذب بين الكتل.'], words: /sun|planet|solar system/i },
      { keys: ['pull'], title: ['Gravity pulls inward', 'الجاذبية تشد للداخل'], text: ['The Sun’s gravity pulls every planet towards it. The pull gets weaker with distance — it falls with the square of the distance.', 'تشد جاذبية الشمس كل كوكب نحوها. يضعف الشد مع المسافة — يتناقص مع مربع المسافة.'], words: /pull|attract|inverse square|weaker with distance|towards the sun/i },
      { keys: ['vel'], title: ['Sideways speed + pull = orbit', 'سرعة جانبية + شد = مدار'], text: ['Each planet is also moving sideways. Gravity keeps bending its path, so it falls around the Sun instead of into it.', 'كل كوكب يتحرك أيضاً جانبياً. تواصل الجاذبية ثني مساره فيسقط حول الشمس بدلاً من السقوط فيها.'], words: /sideways|velocity|falls around|orbit|bend/i },
      { keys: ['off'], title: ['What if gravity switched off?', 'ماذا لو توقفت الجاذبية؟'], text: ['Without gravity, the Earth would fly off in a straight line — exactly what Newton’s first law predicts.', 'بدون جاذبية ستنطلق الأرض في خط مستقيم — تماماً كما يتنبأ قانون نيوتن الأول.'], words: /switch(ed)? off|without gravity|straight line|fly off/i },
      { keys: ['fast'], title: ['Closer planets move faster', 'الكواكب الأقرب أسرع'], text: ['Planets closer to the Sun feel a stronger pull and orbit faster: Mercury takes 88 days, Earth 365, Jupiter about 12 years.', 'الكواكب الأقرب للشمس تشعر بشد أقوى وتدور أسرع: عطارد 88 يوماً، الأرض 365، والمشتري نحو 12 سنة.'], words: /closer|faster|mercury|jupiter|kepler|period/i }
    ],
    vars: [['gm', ['Sun’s gravity', 'جاذبية الشمس'], 0.4, 2, 0.1, 1]],
    async mount(box, api) {
      const THREE = await three();
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio));
      r.domElement.className = 'vz-gl'; box.appendChild(r.domElement);
      const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 500);
      scene.add(new THREE.AmbientLight(0xffffff, 0.25));
      const sunL = new THREE.PointLight(0xfff1c1, 600, 0, 2); scene.add(sunL);
      // stars
      const sg = new THREE.BufferGeometry(); const sp = []; for (let i = 0; i < 700; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(120 + Math.random() * 60); sp.push(v.x, v.y, v.z); } sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6 })));
      const sun = new THREE.Mesh(new THREE.SphereGeometry(2.4, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffc84a })); scene.add(sun);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(3.4, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.18 })); scene.add(glow);
      const P = [['Mercury', 'عطارد', 5, 0.35, 0x9e9e9e], ['Venus', 'الزهرة', 7.5, 0.6, 0xe8c27a], ['Earth', 'الأرض', 10.5, 0.65, 0x3b82f6], ['Mars', 'المريخ', 14, 0.45, 0xd9563b], ['Jupiter', 'المشتري', 22, 1.6, 0xd8b48a]];
      const planets = P.map(([en, ar, d, s, col], k) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(s, 32, 24), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 }));
        const ring = new THREE.Mesh(new THREE.RingGeometry(d - 0.03, d + 0.03, 128), new THREE.MeshBasicMaterial({ color: 0x6b7ab8, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })); ring.rotation.x = -Math.PI / 2; scene.add(ring);
        scene.add(m);
        const lab = document.createElement('div'); lab.className = 'vz-3dlbl'; lab.textContent = T(en, ar); box.appendChild(lab);
        return { m, d, ang: k * 1.3, lab, name: en };
      });
      const sunLab = document.createElement('div'); sunLab.className = 'vz-3dlbl vz-3dlbl--sun'; sunLab.textContent = T('Sun', 'الشمس'); box.appendChild(sunLab);
      const earth = planets[2];
      const pullA = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 3, 0xef4444, 0.8, 0.5); scene.add(pullA);
      const velA = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 3, 0x22c55e, 0.8, 0.5); scene.add(velA);
      const trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x93c5fd })); scene.add(trail);
      const st = { gm: 1, view: { th: 0.5, ph: 0.9, d: 48 }, mode: 0, free: null, trailPts: [] };
      dragRotate(r.domElement, (dx, dy, wheel) => { st.view.th -= dx * 0.005; st.view.ph = Math.max(0.15, Math.min(1.45, st.view.ph - dy * 0.005)); if (wheel) st.view.d = Math.max(18, Math.min(90, st.view.d + wheel * 0.03)); });
      const size = () => { const w = box.clientWidth, h = box.clientHeight || 420; r.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
      const ro = new ResizeObserver(size); ro.observe(box); size();
      const v3 = new THREE.Vector3();
      const proj = (obj, lab) => { v3.copy(obj.position); v3.y += (obj.geometry.parameters.radius || 1) + 0.5; v3.project(cam); lab.style.transform = `translate(${(v3.x * 0.5 + 0.5) * box.clientWidth}px, ${(-v3.y * 0.5 + 0.5) * box.clientHeight}px) translate(-50%, -100%)`; lab.style.opacity = v3.z < 1 ? 1 : 0; };
      return {
        stage(i) {
          st.mode = i; st.free = null; st.trailPts = [];
          pullA.visible = i === 1 || i === 2; velA.visible = i === 2 || i === 3;
          planets.forEach(p => p.lab.classList.toggle('is-hi', (i === 4 && /Mercury|Jupiter/.test(p.name)) || (i >= 1 && i <= 3 && p === earth)));
          if (i === 3) { const pos = earth.m.position.clone(), tang = new THREE.Vector3(-Math.sin(earth.ang), 0, -Math.cos(earth.ang)); st.free = { pos, vel: tang.multiplyScalar(earth.d * Math.sqrt(st.gm) * Math.pow(earth.d, -1.5) * 0.9), t: 0 }; }
        },
        set(k, v) { if (k === 'gm') st.gm = v; },
        tick(dt, sp) {
          dt *= sp;
          planets.forEach(p => {
            if (st.free && p === earth) return;
            p.ang += dt * 0.9 * Math.sqrt(st.gm) * Math.pow(p.d / 10.5, -1.5);   // Kepler: ω ∝ r^-1.5
            p.m.position.set(Math.cos(p.ang) * p.d, 0, -Math.sin(p.ang) * p.d);
            p.m.rotation.y += dt;
          });
          if (st.free) { st.free.t += dt; st.free.pos.addScaledVector(st.free.vel, dt * 9); earth.m.position.copy(st.free.pos); st.trailPts.push(earth.m.position.clone()); if (st.trailPts.length > 300) st.trailPts.shift(); trail.geometry.setFromPoints(st.trailPts); if (st.free.t > 3.5) { earth.ang = 0; this.stage(3); } }
          else { trail.geometry.setFromPoints([]); }
          const ep = earth.m.position, toSun = ep.clone().negate().normalize();
          pullA.position.copy(ep); pullA.setDirection(toSun); pullA.setLength(2 + 2.4 * st.gm, 0.8, 0.5);
          const tang = st.free ? st.free.vel.clone().normalize() : new THREE.Vector3(-Math.sin(earth.ang), 0, -Math.cos(earth.ang));
          velA.position.copy(ep); velA.setDirection(tang);
          sun.scale.setScalar(1 + Math.sin(performance.now() / 600) * 0.01); glow.scale.setScalar(1 + Math.sin(performance.now() / 900) * 0.04);
          cam.position.set(Math.sin(st.view.th) * Math.sin(st.view.ph) * st.view.d, Math.cos(st.view.ph) * st.view.d, Math.cos(st.view.th) * Math.sin(st.view.ph) * st.view.d); cam.lookAt(0, 0, 0);
          r.render(scene, cam);
          planets.forEach(p => proj(p.m, p.lab)); proj(sun, sunLab);
        },
        destroy() { ro.disconnect(); r.dispose(); r.forceContextLoss && r.forceContextLoss(); }
      };
    }
  };
  SCENES.cylinder = {
    title: ['Volume of a cylinder', 'حجم الأسطوانة'], subject: ['Mathematics · geometry', 'الرياضيات · الهندسة'], mode: 'math',
    stages: [
      { keys: [], title: ['A cylinder', 'الأسطوانة'], text: ['A cylinder has two equal circular ends joined by a curved surface. Drag to rotate it.', 'للأسطوانة قاعدتان دائريتان متساويتان يصل بينهما سطح منحنٍ. اسحب لتدويرها.'], words: /cylinder|shape|circular ends/i },
      { keys: [], title: ['The base is a circle', 'القاعدة دائرة'], text: ['The area of the circular base is π × r², where r is the radius.', 'مساحة القاعدة الدائرية = π × نق²، حيث نق هو نصف القطر.'], words: /base|circle|radius|π ?r|area of the/i },
      { keys: [], title: ['The height', 'الارتفاع'], text: ['The height h is the distance between the two circular ends.', 'الارتفاع ع هو المسافة بين القاعدتين الدائريتين.'], words: /height/i },
      { keys: [], title: ['Stack the base h times', 'كدّس القاعدة ع مرة'], text: ['Stacking the base area up the height gives the volume: V = π × r² × h.', 'تكديس مساحة القاعدة على طول الارتفاع يعطي الحجم: ح = π × نق² × ع.'], words: /stack|multiply|times the height|v ?= ?π|volume formula|volume =/i },
      { keys: [], title: ['Try it', 'جرّب بنفسك'], text: ['Change r and h. Doubling the radius makes the volume four times bigger, because r is squared.', 'غيّر نق وع. مضاعفة نصف القطر تجعل الحجم أكبر أربع مرات لأن نق مربّعة.'], words: /double|four times|squared|try/i }
    ],
    vars: [['r', ['radius r (cm)', 'نصف القطر نق (سم)'], 1, 6, 0.5, 3], ['h', ['height h (cm)', 'الارتفاع ع (سم)'], 1, 10, 0.5, 6]],
    async mount(box, api) {
      const THREE = await three();
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); r.domElement.className = 'vz-gl'; box.appendChild(r.domElement);
      const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 200);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6)); const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(5, 10, 7); scene.add(dl);
      const grp = new THREE.Group(); scene.add(grp);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.28, side: THREE.DoubleSide, roughness: 0.2 }));
      const edgeT = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: 0x1d4ed8 })), edgeB = edgeT.clone();
      edgeT.rotation.x = edgeB.rotation.x = Math.PI / 2;
      const base = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })); base.rotation.x = -Math.PI / 2;
      const radius = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
      const heightL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), new THREE.MeshBasicMaterial({ color: 0x16a34a }));
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64), new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.55 }));
      grp.add(body, edgeT, edgeB, base, radius, heightL, fill);
      const labR = document.createElement('div'), labH = document.createElement('div'); labR.className = labH.className = 'vz-3dlbl'; box.append(labR, labH);
      const st = { r: 3, h: 6, stage: 0, fillT: 1, view: { th: 0.6, ph: 1.05, d: 19 } };
      dragRotate(r.domElement, (dx, dy, wheel) => { st.view.th -= dx * 0.006; st.view.ph = Math.max(0.2, Math.min(1.5, st.view.ph - dy * 0.006)); if (wheel) st.view.d = Math.max(12, Math.min(50, st.view.d + wheel * 0.02)); });
      const size = () => { const w = box.clientWidth, h = box.clientHeight || 420; r.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
      const ro = new ResizeObserver(size); ro.observe(box); size();
      const v3 = new THREE.Vector3();
      const proj = (p, lab) => { v3.copy(p).project(cam); lab.style.transform = `translate(${(v3.x * 0.5 + 0.5) * box.clientWidth}px, ${(-v3.y * 0.5 + 0.5) * box.clientHeight}px) translate(-50%, -50%)`; };
      const formula = () => { const V = Math.PI * st.r * st.r * st.h, B = Math.PI * st.r * st.r; api.formula(`<b>V = π × r² × h</b> = π × ${st.r}² × ${st.h} = <b>${V.toFixed(1)} cm³</b><small>${T('base area', 'مساحة القاعدة')} π r² = ${B.toFixed(1)} cm²</small>`); };
      formula();
      return {
        stage(i) { st.stage = i; if (i === 3) st.fillT = 0; formula(); },
        set(k, v) { st[k] = v; formula(); },
        tick(dt, sp) {
          const R = st.r, H = st.h;
          body.scale.set(R, H, R); body.position.y = H / 2;
          edgeT.scale.setScalar(R); edgeT.position.y = H; edgeB.scale.setScalar(R); edgeB.position.y = 0;
          base.scale.setScalar(R); base.position.y = 0.01; base.visible = st.stage >= 1;
          radius.scale.x = R; radius.position.set(R / 2, 0.05, 0); radius.visible = st.stage >= 1;
          heightL.scale.y = H; heightL.position.set(R + 0.4, H / 2, 0); heightL.visible = st.stage >= 2;
          if (st.stage >= 3) st.fillT = Math.min(1, st.fillT + dt * sp * 0.35);
          fill.visible = st.stage >= 3; fill.scale.set(R * 0.995, Math.max(0.001, H * st.fillT), R * 0.995); fill.position.y = H * st.fillT / 2;
          grp.position.y = -H / 2;
          if (st.stage === 0 && !reduce) grp.rotation.y += dt * 0.3;
          cam.position.set(Math.sin(st.view.th) * Math.sin(st.view.ph) * st.view.d, Math.cos(st.view.ph) * st.view.d, Math.cos(st.view.th) * Math.sin(st.view.ph) * st.view.d); cam.lookAt(0, 0, 0);
          r.render(scene, cam);
          labR.textContent = `r = ${R} cm`; labH.textContent = `h = ${H} cm`;
          labR.style.display = st.stage >= 1 ? '' : 'none'; labH.style.display = st.stage >= 2 ? '' : 'none';
          grp.updateMatrixWorld(); proj(radius.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.6, 0)), labR); proj(heightL.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.8, 0, 0)), labH);
        },
        state: () => Object.assign({}, st),
        destroy() { ro.disconnect(); r.dispose(); r.forceContextLoss && r.forceContextLoss(); }
      };
    }
  };

  /* ---------- generic step flow for any topic (requested by the AI) ---------- */
  function flowScene(title, steps) {
    return {
      title: [title, title], subject: ['Step by step', 'خطوة بخطوة'], mode: 'quick',
      stages: steps.map((s, i) => ({ keys: ['s' + i], title: [s, s], text: [s, s], words: new RegExp(s.split(/\s+/).filter(w => w.length > 4).slice(0, 3).map(w => w.replace(/[^\w]/g, '')).filter(Boolean).join('|') || '^$', 'i') })),
      mount(box, api) {
        const n = steps.length, W = 800, H = 440, cols = Math.min(n, 4), rows = Math.ceil(n / cols);
        const cw = W / cols, ch = Math.min(150, (H - 40) / rows);
        let inner = '<defs><marker id="vzArr" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#7c3aed"/></marker></defs>';
        steps.forEach((s, i) => {
          const r = Math.floor(i / cols), c = r % 2 ? cols - 1 - (i % cols) : i % cols;
          const x = c * cw + 18, y = 30 + r * (ch + 20);
          inner += `<g data-k="s${i}" class="vz-step"><rect x="${x}" y="${y}" width="${cw - 36}" height="${ch - 20}" rx="18" fill="#f5f3ff" stroke="#7c3aed" stroke-width="2"/><circle cx="${x + 26}" cy="${y + 26}" r="16" fill="#7c3aed"/><text x="${x + 26}" y="${y + 32}" text-anchor="middle" fill="#fff" font-weight="700" font-size="16">${i + 1}</text><foreignObject x="${x + 50}" y="${y + 10}" width="${cw - 96}" height="${ch - 36}"><div xmlns="http://www.w3.org/1999/xhtml" class="vz-steptxt">${esc(s)}</div></foreignObject></g>`;
          if (i < n - 1) { const r2 = Math.floor((i + 1) / cols), c2 = r2 % 2 ? cols - 1 - ((i + 1) % cols) : (i + 1) % cols; const x2 = c2 * cw + 18, y2 = 30 + r2 * (ch + 20); inner += r2 === r ? `<path d="M${c2 > c ? x + cw - 36 : x} ${y + (ch - 20) / 2} L${c2 > c ? x2 : x2 + cw - 36} ${y2 + (ch - 20) / 2}" stroke="#7c3aed" stroke-width="3" marker-end="url(#vzArr)"/>` : `<path d="M${x + (cw - 36) / 2} ${y + ch - 20} L${x2 + (cw - 36) / 2} ${y2}" stroke="#7c3aed" stroke-width="3" marker-end="url(#vzArr)"/>`; }
        });
        const w = svgEl(W, Math.max(H, 40 + rows * (ch + 20)), inner); box.appendChild(w); const svg = q(w, 'svg');
        return { stage(i) { focusOn(svg, ['s' + i]); qa(svg, '.vz-step').forEach((g, k) => g.classList.toggle('is-done', k < i)); }, tick() {} };
      }
    };
  }

  /* ======================= detection ======================= */
  const DETECT = [
    ['photosynthesis', /photosynth|chlorophyll|how (do )?plants (make|produce) (food|sugar|energy)/i],
    ['heart', /(human )?heart (work|pump|chamber)|how does the heart|blood (circulation|flow)|circulatory system|cardiac cycle|ventricle|atri(um|a)\b/i],
    ['gravity', /gravit|orbit|solar system|planets? (move|go round|orbit)|kepler/i],
    ['circuit', /electric(al)? circuit|how (does )?electricity|ohm'?s law|current flow|series circuit|switch.*bulb/i],
    ['cylinder', /volume of (a )?cylinder|cylinder('?s)? volume|πr²h|pi r squared h/i],
    ['tectonics', /tectonic|plate (boundar|movement)|continental drift|earthquake(s)? happen|how (do )?volcano/i],
    ['newton', /newton'?s (\w+ )?laws?|laws of motion|inertia|f ?= ?ma\b|action and reaction/i],
    ['graph', /quadratic|parabola|graph of|plot (y|the function)|y ?= ?[-\dx]|discriminant|vertex of/i]
  ];
  function detect(text) {
    const t = String(text || '');
    for (const [id, re] of DETECT) if (re.test(t)) return { id, scene: SCENES[id], mode: SCENES[id].mode };
    return null;
  }
  // [[visual:id]] or [[visual:flow|Title|Step one > Step two > Step three]] from the AI
  const TAG = /\[\[visual:([a-z]+)(?:\|([^\]|]{1,80})\|([^\]]{3,600}))?\]\]/i;
  function fromTag(text) {
    const m = String(text || '').match(TAG); if (!m) return null;
    const id = m[1].toLowerCase();
    if (id === 'flow' && m[3]) { const steps = m[3].split(/\s*>\s*/).map(s => s.trim()).filter(Boolean).slice(0, 8); if (steps.length >= 2) return { id: 'flow', scene: flowScene(m[2] || 'How it works', steps) }; return null; }
    return SCENES[id] ? { id, scene: SCENES[id] } : null;
  }
  const stripTags = s => String(s || '').replace(/\[\[visual:[^\]]*\]\]/gi, '').replace(/\[\[visual:[^\]]*$/i, '');

  /* ======================= the player ======================= */
  function open(host, which, opts) {
    opts = opts || {};
    const pick = typeof which === 'string' ? { id: which, scene: SCENES[which] } : which;
    if (!pick || !pick.scene) return null;
    const S = pick.scene;
    const el = document.createElement('section'); el.className = 'vz' + (opts.docked ? ' vz--dock' : ' vz--modal'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', T(S.title[0], S.title[1]));
    const tl = x => T(x[0], x[1]);
    el.innerHTML = `
      <header class="vz__h"><div><span class="vz__sub">${esc(tl(S.subject))} · ${T('interactive visual', 'شرح مرئي تفاعلي')}</span><b>${esc(tl(S.title))}</b></div>
        <div class="vz__hb"><button type="button" class="vz__ic" data-v="guide" title="${T('Guided tour (narrated)', 'جولة مرشدة (بالصوت)')}">${T('▶ Guide me', '▶ اشرح لي')}</button><span class="vz__zoom" role="group" aria-label="${T('Zoom', 'تكبير وتصغير')}"><button type="button" class="vz__ic" data-v="zout" aria-label="${T('Zoom out', 'تصغير')}">−</button><button type="button" class="vz__ic vz__zl" data-v="z1" aria-label="${T('Reset zoom', 'إعادة الحجم')}">100%</button><button type="button" class="vz__ic" data-v="zin" aria-label="${T('Zoom in', 'تكبير')}">+</button></span><button type="button" class="vz__ic" data-v="max" aria-label="${T('Enlarge', 'تكبير')}">⤢</button><button type="button" class="vz__ic" data-v="close" aria-label="${T('Close visual', 'إغلاق')}">✕</button></div></header>
      <div class="vz__stage" tabindex="0" aria-live="polite"></div>
      <div class="vz__formula" hidden></div>
      <div class="vz__cap"><div class="vz__dots">${S.stages.map((s, i) => `<button type="button" data-st="${i}" aria-label="${T('Step', 'خطوة')} ${i + 1}: ${esc(tl(s.title))}">${i + 1}</button>`).join('')}</div><b class="vz__t"></b><p class="vz__p"></p><small class="vz__status" aria-live="polite"></small></div>
      ${S.vars ? `<div class="vz__vars">${S.vars.map(([k, lab, mn, mx, stp, val]) => mx - mn === 1 && stp === 1 ? `<label class="vz__var vz__var--sw"><input type="checkbox" data-var="${k}" ${val ? 'checked' : ''}><span>${esc(tl(lab))}</span></label>` : `<label class="vz__var"><span>${esc(tl(lab))}</span><input type="range" min="${mn}" max="${mx}" step="${stp}" value="${val}" data-var="${k}"><output>${val}</output></label>`).join('')}</div>` : ''}
      <footer class="vz__ctl"><button type="button" data-v="prev" aria-label="${T('Previous step', 'الخطوة السابقة')}">⟨</button><button type="button" data-v="play" aria-label="${T('Pause', 'إيقاف مؤقت')}">❚❚</button><button type="button" data-v="next" aria-label="${T('Next step', 'الخطوة التالية')}">⟩</button><button type="button" data-v="replay" aria-label="${T('Replay from the start', 'إعادة من البداية')}">↺</button><span class="vz__sp">${[0.5, 1, 2].map(s => `<button type="button" data-speed="${s}" aria-pressed="${s === 1}">${s}×</button>`).join('')}</span>${S.note ? `<small class="vz__note">${esc(tl(S.note))}</small>` : ''}</footer>`;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    const stage = el.querySelector('.vz__stage');
    // drag to pan while zoomed (a short tap still reaches the diagram underneath)
    const pan = { x: 0, y: 0, on: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false };
    stage.addEventListener('pointerdown', e => { if (!stage.classList.contains('is-zoomed') || e.target.closest('.vz-gl, input, button')) return; Object.assign(pan, { on: true, sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y, moved: false }); });
    stage.addEventListener('pointermove', e => {
      if (!pan.on) return; const dx = e.clientX - pan.sx, dy = e.clientY - pan.sy;
      if (!pan.moved && Math.hypot(dx, dy) < 5) return;
      if (!pan.moved) { pan.moved = true; stage.classList.add('is-panning'); try { stage.setPointerCapture(e.pointerId); } catch (err) {} }
      const lim = (v, d) => Math.max(-d, Math.min(d, v)), r = stage.getBoundingClientRect();
      pan.x = lim(pan.ox + dx, r.width * (zoom - 1) / 2 + 40); pan.y = lim(pan.oy + dy, r.height * (zoom - 1) / 2 + 40);
      stage.style.setProperty('--vz-x', pan.x + 'px'); stage.style.setProperty('--vz-y', pan.y + 'px'); e.preventDefault();
    });
    const endPan = () => { if (!pan.on) return; pan.on = false; stage.classList.remove('is-panning'); };
    stage.addEventListener('pointerup', endPan); stage.addEventListener('pointercancel', endPan);
    stage.addEventListener('click', e => { if (pan.moved) { e.stopPropagation(); e.preventDefault(); pan.moved = false; } }, true);
    let zoom = 1, scene = null, idx = 0, playing = !reduce, speed = 1, raf = 0, last = performance.now(), dead = false, autoT = null, touring = false;
    const api = {
      status: t => { el.querySelector('.vz__status').textContent = t || ''; },
      setVar: (k, v) => { const i = el.querySelector(`[data-var="${k}"]`); if (!i) return; if (i.type === 'checkbox') i.checked = !!v; else { i.value = v; const o = i.parentElement.querySelector('output'); if (o) o.textContent = typeof v === 'number' ? String(+v.toFixed(3)) : v; } },
      formula: html => { const f = el.querySelector('.vz__formula'); f.hidden = !html; f.innerHTML = html || ''; }
    };
    function show(i, from) {
      idx = Math.max(0, Math.min(S.stages.length - 1, i));
      const s = S.stages[idx];
      el.querySelector('.vz__t').textContent = `${idx + 1}. ${tl(s.title)}`;
      el.querySelector('.vz__p').textContent = tl(s.text);
      // the caption eases in for each new step (restarted by re-adding the class)
      const cap = el.querySelector('.vz__cap'); cap.classList.remove('is-step'); void cap.offsetWidth; cap.classList.add('is-step');
      el.querySelectorAll('.vz__dots button').forEach((b, k) => { b.classList.toggle('is-on', k === idx); b.classList.toggle('is-done', k < idx); b.setAttribute('aria-current', k === idx ? 'step' : 'false'); });
      if (scene) scene.stage(idx);
      ctrl.stageIndex = idx;
      if (opts.onStage) opts.onStage(idx, s, from);
    }
    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (scene && playing) scene.tick(dt, speed);
      raf = requestAnimationFrame(loop);
    }
    const ready = Promise.resolve(S.mount(stage, api)).then(sc => {
      if (dead) { sc && sc.destroy && sc.destroy(); return; }
      scene = sc; show(opts.stage || 0, 'open'); raf = requestAnimationFrame(loop);
      if (!playing) scene.tick(0.016, 1);
    }).catch(err => { stage.innerHTML = `<p class="vz__fail">${T('This visual needs WebGL, which isn’t available here. The steps below still explain it.', 'يحتاج هذا الشرح إلى WebGL غير المتاح هنا. الخطوات أدناه تشرحه.')}</p>`; scene = { stage() {}, tick() {} }; show(0, 'open'); console.warn('visual:', err && err.message); });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-v],[data-st],[data-speed]'); if (!b) return;
      if (b.dataset.st) { stopTour(); return show(+b.dataset.st, 'user'); }
      if (b.dataset.speed) { speed = +b.dataset.speed; el.querySelectorAll('[data-speed]').forEach(x => x.setAttribute('aria-pressed', x === b)); return; }
      const v = b.dataset.v;
      if (v === 'close') return ctrl.close();
      if (v === 'next') { stopTour(); show(idx + 1, 'user'); }
      if (v === 'prev') { stopTour(); show(idx - 1, 'user'); }
      if (v === 'replay') { stopTour(); show(0, 'user'); }
      if (v === 'play') { playing = !playing; b.textContent = playing ? '❚❚' : '▶'; b.setAttribute('aria-label', playing ? T('Pause', 'إيقاف مؤقت') : T('Play', 'تشغيل')); }
      if (v === 'max') {
        // enlarge / restore glides between the two sizes where the browser can animate it
        const flip = () => { el.classList.toggle('is-max'); b.setAttribute('aria-pressed', String(el.classList.contains('is-max'))); };
        if (document.startViewTransition && !reduce) { el.style.viewTransitionName = 'erly-vz'; try { const t = document.startViewTransition(flip); [t.ready, t.finished, t.updateCallbackDone].forEach(p => p && p.catch(() => {})); t.finished.catch(() => {}).finally(() => { el.style.viewTransitionName = ''; }); } catch (e) { el.style.viewTransitionName = ''; flip(); } } else flip();
      }
      if (v === 'zin' || v === 'zout' || v === 'z1') {
        zoom = v === 'z1' ? 1 : Math.max(0.6, Math.min(2.5, Math.round((zoom + (v === 'zin' ? 0.25 : -0.25)) * 100) / 100));
        if (zoom === 1) { pan.x = pan.y = 0; stage.style.setProperty('--vz-x', '0px'); stage.style.setProperty('--vz-y', '0px'); }
        stage.style.setProperty('--vz-z', zoom); stage.classList.toggle('is-zoomed', zoom !== 1);
        el.querySelector('.vz__zl').textContent = Math.round(zoom * 100) + '%';
      }
      if (v === 'guide') { touring ? stopTour() : tour(); }
    });
    el.addEventListener('input', e => { const i = e.target.closest('[data-var]'); if (!i) return; const val = i.type === 'checkbox' ? (i.checked ? 1 : 0) : +i.value; const o = i.parentElement.querySelector('output'); if (o) o.textContent = val; if (scene && scene.set) scene.set(i.dataset.var, val); });
    el.addEventListener('keydown', e => { if (/INPUT|TEXTAREA/.test(e.target.tagName)) return; if (e.key === 'ArrowRight') { show(idx + 1, 'user'); e.preventDefault(); } if (e.key === 'ArrowLeft') { show(idx - 1, 'user'); e.preventDefault(); } if (e.key === 'Escape') { e.stopPropagation(); ctrl.close(); } });
    // a narrated tour: the companion reads each step while the visual follows
    function tour(from) {
      touring = true; el.classList.add('is-touring');
      const b = el.querySelector('[data-v="guide"]'); if (b) b.textContent = T('■ Stop tour', '■ إيقاف الجولة');
      const step = i => {
        if (!touring || dead) return;
        if (i >= S.stages.length) return stopTour();
        show(i, 'tour');
        const say = opts.say || ((t, done) => setTimeout(done, 2600 + t.length * 45));
        say(tl(S.stages[i].text), () => { autoT = setTimeout(() => step(i + 1), 450); });
      };
      step(from == null ? 0 : from);
    }
    function stopTour() { if (!touring) return; touring = false; clearTimeout(autoT); el.classList.remove('is-touring'); const b = el.querySelector('[data-v="guide"]'); if (b) b.textContent = T('▶ Guide me', '▶ اشرح لي'); if (opts.onTourStop) opts.onTourStop(); }
    const ctrl = {
      id: pick.id, scene: S, el, ready, stageIndex: 0,
      stages: S.stages.length,
      show: i => show(i, 'api'),
      // move to the step that matches what the companion is saying right now
      sync(sentence) { const k = S.stages.findIndex((s, i) => i !== idx && s.words && s.words.test(sentence)); if (k >= 0 && !touring) { show(k, 'speech'); return k; } return -1; },
      tour, stopTour, touring: () => touring,
      setVar: (k, v) => { api.setVar(k, v); if (scene && scene.set) scene.set(k, v); },
      state: () => (scene && scene.state ? scene.state() : {}),
      pause: () => { playing = false; }, play: () => { playing = true; },
      close() { if (dead) return; dead = true; stopTour(); cancelAnimationFrame(raf); if (scene && scene.destroy) scene.destroy(); el.classList.remove('is-in'); setTimeout(() => el.remove(), reduce ? 0 : 300); if (opts.onClose) opts.onClose(); }
    };
    return ctrl;
  }

  window.ERLY = window.ERLY || {};
  ERLY.visuals = { detect, fromTag, stripTags, open, scenes: SCENES, list: Object.keys(SCENES), parseExpr };
})();
