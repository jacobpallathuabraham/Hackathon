/* ERLY Learning Studio v28 — new experiences for English, Languages and Social science.
     story-architect  plan a story on a tension curve; structure checks only (creative writing is never scored); kept in
                      memory only — nothing typed here is stored or sent anywhere.
     number-words     build numbers 0–9 999 999 in Spanish and French from their composition rules.
     time-teller      tell the time on a clock face in Spanish and French (12-hour conventions).
     voting           one set of ballots, five counting rules — plurality, two-round runoff, instant runoff, Borda, Condorcet. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, D = LS.exp.DEFS, K = LS.kit, esc = LS.esc;
  const q = (id, prompt, options, answer, explain) => ({ id, type: 'mcq', difficulty: 1, prompt, options, answer, explain });
  const card = (cls, h) => `<div class="v26-card"><h3>${h}</h3><div class="v26-out ${cls}" aria-live="polite"></div></div>`;

  /* ======================= NUMBER WORDS ======================= */
  const ES = { u: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'],
    t: { 3: 'treinta', 4: 'cuarenta', 5: 'cincuenta', 6: 'sesenta', 7: 'setenta', 8: 'ochenta', 9: 'noventa' },
    h: { 1: 'ciento', 2: 'doscientos', 3: 'trescientos', 4: 'cuatrocientos', 5: 'quinientos', 6: 'seiscientos', 7: 'setecientos', 8: 'ochocientos', 9: 'novecientos' } };
  function es99(n) { if (n < 30) return ES.u[n]; const t = Math.floor(n / 10), u = n % 10; return ES.t[t] + (u ? ' y ' + ES.u[u] : ''); }
  function es999(n) { if (n === 100) return 'cien'; const h = Math.floor(n / 100), r = n % 100; return [h ? ES.h[h] : '', r ? es99(r) : ''].filter(Boolean).join(' '); }
  function esN(n) { // apocope: uno → un before a noun-like "mil"/"millones" (veintiún mil, un millón)
    if (n === 0) return 'cero'; const mi = Math.floor(n / 1e6), th = Math.floor(n / 1000) % 1000, r = n % 1000, out = [];
    const apo = s => s.replace(/veintiuno$/, 'veintiún').replace(/(^| )uno$/, '$1un');
    if (mi) out.push(mi === 1 ? 'un millón' : apo(es999(mi)) + ' millones');
    if (th) out.push(th === 1 ? 'mil' : apo(es999(th)) + ' mil');
    if (r) out.push(es999(r)); return out.join(' '); }
  const FR = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
  const FT = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };
  function fr99(n) { // 1990 spelling reform: hyphens between all parts
    if (n <= 16) return FR[n]; if (n < 20) return 'dix-' + FR[n - 10];
    const t = Math.floor(n / 10), u = n % 10;
    if (t <= 6) return FT[t] + (u === 1 ? '-et-un' : u ? '-' + FR[u] : '');
    if (t === 7) return 'soixante' + (u === 1 ? '-et-onze' : '-' + fr99(10 + u));
    if (t === 8) return u ? 'quatre-vingt-' + FR[u] : 'quatre-vingts';
    return 'quatre-vingt-' + fr99(10 + u); }
  function fr999(n, last) { const h = Math.floor(n / 100), r = n % 100; let s = '';
    if (h) s = (h > 1 ? FR[h] + '-' : '') + 'cent' + (h > 1 && !r && last ? 's' : '');
    if (r) { let w = fr99(r); if (!last && w === 'quatre-vingts') w = 'quatre-vingts'; s = s ? s + '-' + w : w; }
    return s; }
  function frN(n) { if (n === 0) return 'zéro'; const mi = Math.floor(n / 1e6), th = Math.floor(n / 1000) % 1000, r = n % 1000, out = [];
    if (mi) out.push((mi === 1 ? 'un' : fr999(mi, true)) + '-million' + (mi > 1 ? 's' : ''));
    if (th) out.push((th === 1 ? '' : fr999(th, false).replace(/quatre-vingts$/, 'quatre-vingt').replace(/cents$/, 'cent') + '-') + 'mille');
    if (r) out.push(fr999(r, true)); return out.join('-'); }
  const NW = { es: esN, fr: frN };
  D['number-words'] = { wide: true,
    intro: 'Numbers are built from a few parts and some rules. Choose **Spanish** or **French**, set any number up to 9 999 999, and watch it assemble — every part is coloured by the rule that made it. Then test yourself.',
    predict: { q: 'In French, 80 is “quatre-vingts”. That literally means…', options: ['eight tens', 'four twenties', 'eighty', 'four and twenty'] },
    explore: '- Spanish: compare 16–19, 21–29 and 31. Why are some written as one word and some with “y”?\n- Spanish: 100 is “cien” but 101 is “ciento uno”. Try 21 000 and 1 000 000.\n- French: count 69, 70, 71, 79, 80, 81, 90, 99. Which numbers are counted in twenties?\n- French: when does “cent” or “vingt” take an **s**?',
    explain: '**Spanish**: 0–29 are single words (16–29 joined: dieciséis, veintidós); from 31, tens and units are joined by **y** (treinta y uno). 100 alone is **cien**, otherwise **ciento**; 500 is the irregular **quinientos**. Before *mil* and *millones*, *uno* shortens to **un** (veintiún mil). **French** counts in tens up to 69, then in **twenties**: 70 = soixante-dix (60 + 10), 80 = quatre-vingts (4 × 20), 90 = quatre-vingt-dix. **et** joins the 1s up to 71 (vingt-et-un, soixante-et-onze), but not 81 or 91. **vingt** and **cent** take an **s** only when multiplied and at the very end (quatre-vingts, deux-cents, but quatre-vingt-un, deux-cent-un), and **mille** never does. ERLY writes French with the 1990 recommended spelling: hyphens between every part.',
    apply: [q('x-nw1', 'Spanish for 21 000 is…', ['veintiuno mil', 'veintiún mil', 'veinte y uno mil', 'veintiuno miles'], 1, 'uno shortens to un before mil: veintiún mil.'), q('x-nw2', 'French for 71 is…', ['septante-et-un', 'soixante-et-onze', 'soixante-onze', 'quatre-vingt-onze'], 1, '60 + 11 joined with et: soixante-et-onze.'), q('x-nw3', 'Which is spelt correctly?', ['quatre-vingts-un', 'quatre-vingt-un', 'quatre-vingt-et-un', 'quatre-vingts-et-un'], 1, 'No s when another number follows, and no et for 81.')],
    summary: ['Spanish: 0–29 one word; from 31 tens “y” units; cien/ciento; uno → un before mil/millones.', 'French: twenties from 70; et only for 21–71; -s on vingt/cent only when multiplied and final.'],
    connect: [{ label: 'Verb conjugation', href: '#/exp/conjugate' }, { label: 'Telling the time', href: '#/exp/time-teller' }],
    build(host, c) {
      const ctl = K.controls(host, [{ k: 'row' }, { k: 'chips', id: 'lang', label: T('Language', 'اللغة'), opts: [['es', 'Español'], ['fr', 'Français']], val: 'es' }, { k: 'range', id: 'n', label: T('Number', 'العدد'), min: 0, max: 1000, step: 1, val: 21 }, { k: 'end' },
        { k: 'html', html: `<label class="kx-range v28-fx"><span class="kx-range__t">${T('Or type any number (0–9 999 999)', 'أو اكتب عدداً')}</span><input type="number" class="v28-fx__in" data-nw min="0" max="9999999" value="21" aria-label="${T('Number to write in words', 'العدد')}"></label>` },
        { k: 'row' }, { k: 'btn', id: 'quiz', label: T('Test me', 'اختبرني'), accent: true }, { k: 'end' }], (id, v) => { if (id === 'n') { n = v; host.querySelector('[data-nw]').value = v; } if (id === 'quiz') newQuiz(); show(); });
      const grid = document.createElement('div'); grid.className = 'v26-grid2'; grid.innerHTML = card('nw__out', T('In words', 'بالكلمات')) + card('nw__quiz', T('Test yourself', 'اختبر نفسك')); host.appendChild(grid);
      let n = 21, quiz = null, score = [0, 0];
      host.addEventListener('input', e => { if (e.target.matches('[data-nw]')) { const v = Math.max(0, Math.min(9999999, Math.floor(+e.target.value || 0))); n = v; if (v <= 1000) ctl.set('n', v); show(); } });
      const parts = (lang, w) => w.split(lang === 'fr' ? /(-)/ : /( )/).map(p => (p === '-' || p === ' ' ? p : `<span class="v28-part ${/^(y|et)$/.test(p) ? 'is-join' : /mil|million|millón|millones|mille|cent|cien|ciento|cientos/.test(p) ? 'is-big' : /vingt|ta$|enta|ante|^dix$|^veint/.test(p) ? 'is-ten' : ''}">${esc(p)}</span>`)).join('');
      function show() { const lang = ctl.val.lang, w = NW[lang](n); host.querySelector('.nw__out').innerHTML = `<p class="v28-big">${K.fmt(n, 0)}</p><p class="v28-words" lang="${lang}">${parts(lang, w)}</p><p class="v26-hint">${T('Colours: tens/twenties, hundreds and thousands, joining words.', 'الألوان: العشرات، المئات والآلاف، كلمات الربط.')}</p>`; }
      function newQuiz() { const lang = ctl.val.lang, pool = [16, 21, 31, 70, 71, 80, 81, 91, 99, 100, 101, 200, 201, 500, 1000, 21000, 1000000, 2080, 777]; const ans = pool[Math.floor(Math.random() * pool.length)];
        const opts = new Set([ans]); while (opts.size < 4) opts.add(pool[Math.floor(Math.random() * pool.length)]); quiz = { lang, ans, opts: [...opts].sort(() => Math.random() - 0.5) };
        host.querySelector('.nw__quiz').innerHTML = `<p>${T('Which number is', 'أي عدد هو')} <b lang="${lang}">${esc(NW[lang](ans))}</b>?</p><div class="v28-opts">${quiz.opts.map(o => `<button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-nwq="${o}">${K.fmt(o, 0)}</button>`).join('')}</div><p class="nw__fb" role="status"></p>`; }
      host.addEventListener('click', e => { const b = e.target.closest('[data-nwq]'); if (!b || !quiz) return; const ok = +b.dataset.nwq === quiz.ans; score[1]++; if (ok) score[0]++; host.querySelector('.nw__fb').innerHTML = (ok ? '✓ ' : '✗ ') + `${K.fmt(quiz.ans, 0)} = <span lang="${quiz.lang}">${esc(NW[quiz.lang](quiz.ans))}</span> · ${score[0]}/${score[1]}`; host.querySelectorAll('[data-nwq]').forEach(x => { x.disabled = true; }); });
      show();
      return { destroy() {}, reset() { ctl.reset(); n = 21; score = [0, 0]; quiz = null; host.querySelector('.nw__quiz').innerHTML = ''; show(); }, _w: (lang, v) => NW[lang](v),
        observe() { return { text: `${K.fmt(n, 0)} → Spanish **${esN(n)}**, French **${frN(n)}**.`, predOk: i => i === 1 }; } };
    }
  };

  /* ======================= TELLING THE TIME ======================= */
  const ESH = ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once'];
  function esTime(h, m) { // 12-hour Spanish: es la una / son las dos; y cuarto, y media, menos cuarto (from :35 count down to the next hour)
    let hh = h % 12, mm = m, menos = false; if (mm > 30) { hh = (hh + 1) % 12; mm = 60 - mm; menos = true; }
    const art = hh === 1 ? 'Es la una' : 'Son las ' + ESH[hh];
    const mw = mm === 0 ? ' en punto' : mm === 15 ? (menos ? ' menos cuarto' : ' y cuarto') : mm === 30 ? ' y media' : (menos ? ' menos ' : ' y ') + es99(mm);
    return art + mw + '.'; }
  const FRH = ['douze', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze'];
  function frTime(h, m) { // spoken 12-hour French: et quart, et demie, moins le quart, moins + minutes; midi / minuit for 12
    let hh = h % 24, mm = m, moins = false; if (mm > 30) { hh = (hh + 1) % 24; mm = 60 - mm; moins = true; }
    const H = hh === 12 ? 'midi' : hh === 0 ? 'minuit' : (FRH[hh % 12] + (hh % 12 === 1 ? ' heure' : ' heures'));
    const mw = mm === 0 ? '' : mm === 15 ? (moins ? ' moins le quart' : ' et quart') : mm === 30 ? (hh === 12 || hh === 0 ? ' et demi' : ' et demie') : (moins ? ' moins ' : ' ') + fr99(mm);
    return 'Il est ' + H + mw + '.'; }
  D['time-teller'] = { wide: true,
    intro: 'Drag the clock hands — or use the sliders — and read the time aloud in **Spanish** and **French**. Watch where each language switches from counting **past** the hour to counting **to** the next one.',
    predict: { q: 'In Spanish, 2:45 is usually said as…', options: ['son las dos y cuarenta y cinco', 'son las tres menos cuarto', 'son las dos menos cuarto', 'es la tres y cuarto'] },
    explore: '- Move from 1:00 to 2:00. Why “es la una” but “son las dos”?\n- Find the minute where both languages switch to counting down to the next hour.\n- French: compare 12:30 and 3:30 — demi or demie?',
    explain: 'Both languages tell the time **past** the hour up to half past and **to** the next hour after it. Spanish uses **y** (past) and **menos** (to), **cuarto** for a quarter and **media** for half; one o’clock is singular (**es la una**), the others plural (**son las dos**). French puts **heure(s)** after the number, says **et quart**, **et demie** and **moins le quart**, and uses **midi** (noon) and **minuit** (midnight); after midi/minuit it is **et demi**, because they are masculine. Timetables in both languages often use the 24-hour clock instead (son las catorce cuarenta y cinco; il est quatorze heures quarante-cinq).',
    apply: [q('x-tt1', '“Es la una y media” is…', ['12:30', '1:30', '1:15', '2:30'], 1, 'una = 1, y media = half past.'), q('x-tt2', 'In French, 4:45 is “Il est … moins le quart”.', ['quatre heures', 'cinq heures', 'trois heures', 'six heures'], 1, 'A quarter to five.')],
    summary: ['Past the hour up to :30, then to the next hour.', 'Spanish: y / menos, cuarto, media; es la una, son las dos.', 'French: et quart, et demie, moins le quart; midi, minuit.'],
    connect: [{ label: 'Number words', href: '#/exp/number-words' }],
    build(host, c) {
      const S = K.stage(host, 360, 360, 'tt__clock'); S.cv.tabIndex = 0; S.cv.setAttribute('role', 'img');
      const ctl = K.controls(host, [{ k: 'row' }, { k: 'range', id: 'h', label: T('Hour (24-hour)', 'الساعة'), min: 0, max: 23, step: 1, val: 2 }, { k: 'range', id: 'm', label: T('Minute', 'الدقيقة'), min: 0, max: 59, step: 1, val: 45 }, { k: 'end' }], (id, v) => { if (id === 'h') h = v; if (id === 'm') m = v; draw(); });
      const out = document.createElement('div'); out.className = 'v26-card tt__out'; out.setAttribute('aria-live', 'polite'); host.appendChild(out);
      let h = 2, m = 45;
      function draw() { const G = S.g, P = K.pal(); S.clear(); const cx = 180, cy = 180, R = 150;
        G.fillStyle = P.bg; G.strokeStyle = P.ink; G.lineWidth = 4; G.beginPath(); G.arc(cx, cy, R, 0, 7); G.fill(); G.stroke();
        for (let i = 0; i < 60; i++) { const a = i / 60 * 2 * Math.PI, r0 = i % 5 ? R - 8 : R - 16; G.lineWidth = i % 5 ? 1 : 3; G.beginPath(); G.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0); G.lineTo(cx + Math.sin(a) * (R - 3), cy - Math.cos(a) * (R - 3)); G.stroke(); }
        for (let i = 1; i <= 12; i++) { const a = i / 12 * 2 * Math.PI; K.text(G, String(i), cx + Math.sin(a) * (R - 34), cy - Math.cos(a) * (R - 34), { a: 'center', b: 'middle', w: 700, s: 18 }); }
        G.fillStyle = 'rgba(60,120,230,.12)'; G.beginPath(); G.moveTo(cx, cy); G.arc(cx, cy, R - 20, -Math.PI / 2, -Math.PI / 2 + Math.PI, m > 30); G.closePath(); G.fill();
        const ah = ((h % 12) + m / 60) / 12 * 2 * Math.PI, am = m / 60 * 2 * Math.PI; G.lineCap = 'round';
        G.strokeStyle = P.ink; G.lineWidth = 8; G.beginPath(); G.moveTo(cx, cy); G.lineTo(cx + Math.sin(ah) * 80, cy - Math.cos(ah) * 80); G.stroke();
        G.strokeStyle = P.blue; G.lineWidth = 5; G.beginPath(); G.moveTo(cx, cy); G.lineTo(cx + Math.sin(am) * 122, cy - Math.cos(am) * 122); G.stroke();
        G.fillStyle = P.ink; G.beginPath(); G.arc(cx, cy, 7, 0, 7); G.fill();
        const es0 = esTime(h, m), fr0 = frTime(h, m), hh = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        out.innerHTML = `<p class="v28-big">${hh}</p><p><b>Español</b> <span lang="es">${esc(es0)}</span></p><p><b>Français</b> <span lang="fr">${esc(fr0)}</span></p><p class="v26-hint">${m > 30 ? T('Counting down TO the next hour (shaded side).', 'العد التنازلي إلى الساعة التالية.') : T('Counting PAST the hour (shaded side).', 'العد بعد الساعة.')}</p>`;
        S.cv.setAttribute('aria-label', `${T('Clock showing', 'ساعة تعرض')} ${hh}. ${es0} ${fr0}`); }
      K.drag(S, () => { const am = m / 60 * 2 * Math.PI; return [{ id: 'm', x: 180 + Math.sin(am) * 122, y: 180 - Math.cos(am) * 122, r: 16 }]; }, (id, x, y) => { let a = Math.atan2(x - 180, -(y - 180)); if (a < 0) a += 2 * Math.PI; const nm = Math.round(a / (2 * Math.PI) * 60) % 60; if (m > 45 && nm < 15) h = (h + 1) % 24; else if (m < 15 && nm > 45) h = (h + 23) % 24; m = nm; ctl.set('m', m); ctl.set('h', h); draw(); });
      S.onresize = draw; draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); h = 2; m = 45; draw(); }, _t: (hh, mm) => ({ es: esTime(hh, mm), fr: frTime(hh, mm) }),
        observe() { return { text: `${h}:${String(m).padStart(2, '0')} → **${esTime(h, m)}** / **${frTime(h, m)}**`, predOk: i => (h === 2 && m === 45 ? i === 1 : null) }; } };
    }
  };

  /* ======================= STORY ARCHITECT ======================= */
  const SHAPES = {
    freytag: { n: 'Five-part plot (Freytag)', beats: [['Exposition', 'Who, where, when — and what does the main character want?', 15], ['Rising action', 'An obstacle blocks them; each attempt makes things harder.', 45], ['Climax', 'The turning point: the biggest choice or confrontation.', 90], ['Falling action', 'The consequences of the climax play out.', 50], ['Resolution', 'A new normal. How has the character changed?', 20]] },
    three: { n: 'Three acts', beats: [['Set-up', 'The ordinary world and the main character’s want.', 15], ['Inciting incident', 'Something changes everything.', 40], ['Confrontation', 'Rising obstacles; a midpoint twist.', 60], ['Crisis and climax', 'All seems lost — then the decisive action.', 92], ['Resolution', 'The result and what it means.', 25]] },
    mystery: { n: 'Mystery', beats: [['The crime or puzzle', 'Something is wrong or missing.', 35], ['Clues and suspects', 'Plant clues fairly; add a red herring.', 50], ['False solution', 'The obvious answer turns out to be wrong.', 65], ['The reveal', 'The real answer — the clues were there all along.', 95], ['Aftermath', 'Justice, relief or a final twist.', 30]] }
  };
  D['story-architect'] = { wide: true,
    intro: 'Plan a story before you write it. Pick a **shape**, write one line for each **beat**, and set how **tense** each moment is — the curve redraws as you go. ERLY checks the **structure** (does the tension build to a climax? is every beat planned?) — it never marks your ideas.\n\nWhat you type stays on this page only; it is not saved or sent anywhere.',
    predict: { q: 'In most stories, the moment of highest tension (the climax) comes…', options: ['at the very beginning', 'in the first quarter', 'late — after most of the rising action', 'tension stays the same throughout'] },
    explore: '- Try each shape with the same idea. How does the mystery shape change where the tension sits?\n- Drag a beat’s tension so it is higher than the climax. What does the check say — and why would a reader feel let down?\n- Fill every beat, then press **Show outline** and use it to write your opening paragraph.',
    explain: 'Most stories follow a **tension curve**: an **exposition** sets up a character who **wants** something; **rising action** puts obstacles in the way, each raising the stakes; the **climax** is the turning point, usually well past the middle; **falling action** and **resolution** release the tension and show how things — and the character — have changed. Writers bend these shapes on purpose (a mystery holds its highest point for the reveal), but a story whose tension never builds, or peaks too early, often feels flat.',
    apply: [q('x-sa1', 'The climax of a story is…', ['the first event', 'the turning point of highest tension', 'the list of characters', 'the ending only'], 1, 'The decisive moment the rising action builds to.'), q('x-sa2', 'Which beat introduces the main character’s situation and goal?', ['exposition', 'climax', 'falling action', 'resolution'], 0, 'The exposition sets up who, where, when and what they want.')],
    summary: ['Exposition → rising action → climax → falling action → resolution.', 'Tension builds to a late climax, then releases.', 'A character who wants something + an obstacle = a plot.'],
    connect: [{ label: 'Sentence workshop', href: '#/exp/sentence-lab' }, { label: 'Punctuation changes meaning', href: '#/exp/punctuation' }],
    build(host, c) {
      const S = K.stage(host, 900, 300, 'sa__curve'); S.cv.setAttribute('role', 'img');
      const ctl = K.controls(host, [{ k: 'row' }, { k: 'chips', id: 'shape', label: T('Story shape', 'شكل القصة'), opts: Object.keys(SHAPES).map(k => [k, SHAPES[k].n]), val: 'freytag' }, { k: 'btn', id: 'outline', label: T('Show outline', 'اعرض المخطط'), accent: true }, { k: 'end' }], (id, v) => { if (id === 'shape') load(v); if (id === 'outline') outline(); draw(); });
      const list = document.createElement('div'); list.className = 'sa__beats'; host.appendChild(list);
      const grid = document.createElement('div'); grid.className = 'v26-grid2'; grid.innerHTML = card('sa__check', T('Structure check', 'فحص البنية')) + card('sa__out', T('Outline', 'المخطط')); host.appendChild(grid);
      let beats = [], who = { name: '', want: '' };
      function load(k) { beats = SHAPES[k].beats.map(([n, hint, t]) => ({ n, hint, t, text: '' }));
        list.innerHTML = `<div class="sa__who"><label>${T('Main character', 'الشخصية الرئيسية')} <input type="text" data-who="name" maxlength="60" autocomplete="off"></label><label>${T('…who wants', '…التي تريد')} <input type="text" data-who="want" maxlength="120" autocomplete="off"></label></div>` +
          beats.map((b, i) => `<div class="sa__beat"><label class="sa__lbl" for="sa-b${i}"><b>${i + 1}. ${esc(b.n)}</b> <span class="v26-hint">${esc(b.hint)}</span></label><textarea id="sa-b${i}" data-beat="${i}" rows="2" maxlength="400"></textarea><label class="kx-range"><span class="kx-range__t">${T('Tension', 'التوتر')}<output data-to="${i}">${b.t}</output></span><input type="range" min="0" max="100" step="1" value="${b.t}" data-bt="${i}" aria-label="${esc(b.n)} — ${T('tension', 'التوتر')}"></label></div>`).join('');
        host.querySelector('.sa__out').innerHTML = ''; check(); }
      list.addEventListener('input', e => { const t = e.target; if (t.dataset.beat != null) beats[+t.dataset.beat].text = t.value; if (t.dataset.bt != null) { beats[+t.dataset.bt].t = +t.value; list.querySelector(`[data-to="${t.dataset.bt}"]`).textContent = t.value; } if (t.dataset.who) who[t.dataset.who] = t.value; check(); draw(); });
      function climaxIndex() { const k = ctl.val.shape; return SHAPES[k].beats.reduce((bi, b, i, a) => (b[2] > a[bi][2] ? i : bi), 0); }
      function check() { const ci = climaxIndex(), top = beats.reduce((bi, b, i) => (b.t > beats[bi].t ? i : bi), 0), rows = [];
        rows.push([beats.every(b => b.text.trim().length >= 8), T('Every beat has a plan (at least a few words).', 'لكل مرحلة خطة.')]);
        rows.push([who.name.trim() && who.want.trim(), T('The main character and what they want are named.', 'سُميت الشخصية وما تريده.')]);
        rows.push([top === ci, T(`The highest tension is at “${beats[ci].n}”.`, 'أعلى توتر عند الذروة.') + (top !== ci ? ' ' + T(`Right now it is at “${beats[top].n}”.`, 'حالياً في مكان آخر.') : '')]);
        rows.push([beats.slice(0, ci).every((b, i) => i === 0 || b.t >= beats[i - 1].t), T('Tension rises (never drops) on the way to the climax.', 'التوتر يرتفع حتى الذروة.')]);
        rows.push([beats.slice(ci + 1).every(b => b.t < beats[ci].t), T('Tension falls after the climax.', 'التوتر ينخفض بعد الذروة.')]);
        host.querySelector('.sa__check').innerHTML = `<ul class="v28-checks">${rows.map(([ok, t]) => `<li>${ok ? '<span class="v28-ok">✓</span>' : '<span class="v28-todo">○</span>'} ${esc(t)}</li>`).join('')}</ul><p class="v26-hint">${T('These checks look at structure only. Your ideas are yours — nothing is marked or stored.', 'الفحص للبنية فقط.')}</p>`;
        return rows.map(r => !!r[0]); }
      function outline() { host.querySelector('.sa__out').innerHTML = `<p><b>${esc(who.name || T('Your character', 'شخصيتك'))}</b> ${T('wants', 'تريد')} ${esc(who.want || '…')}.</p><ol>${beats.map(b => `<li><b>${esc(b.n)}</b> (${T('tension', 'التوتر')} ${b.t}): ${esc(b.text || '…')}</li>`).join('')}</ol>`; }
      function draw() { const G = S.g, P = K.pal(); S.clear(); const x0 = 60, x1 = 860, y0 = 260, y1 = 30, n = beats.length, X = i => x0 + (x1 - x0) * (i + 0.5) / n, Y = t => y0 - (y0 - y1) * t / 100, ci = climaxIndex();
        G.strokeStyle = P.line; G.lineWidth = 1; G.beginPath(); G.moveTo(x0, y0); G.lineTo(x1, y0); G.moveTo(x0, y0); G.lineTo(x0, y1); G.stroke(); K.text(G, T('tension', 'التوتر'), x0 + 6, y1 + 4, { s: 12, c: P.muted });
        const g2 = G.createLinearGradient(0, y1, 0, y0); g2.addColorStop(0, 'rgba(220,80,60,.35)'); g2.addColorStop(1, 'rgba(60,120,230,.08)'); G.fillStyle = g2; G.beginPath(); G.moveTo(X(0), y0); beats.forEach((b, i) => { const px = X(i), py = Y(b.t); if (!i) G.lineTo(px, py); else { const qx = X(i - 1), qy = Y(beats[i - 1].t); G.bezierCurveTo((qx + px) / 2, qy, (qx + px) / 2, py, px, py); } }); G.lineTo(X(n - 1), y0); G.closePath(); G.fill();
        G.strokeStyle = P.red; G.lineWidth = 3; G.beginPath(); beats.forEach((b, i) => { const px = X(i), py = Y(b.t); if (!i) G.moveTo(px, py); else { const qx = X(i - 1), qy = Y(beats[i - 1].t); G.bezierCurveTo((qx + px) / 2, qy, (qx + px) / 2, py, px, py); } }); G.stroke();
        beats.forEach((b, i) => { G.fillStyle = i === ci ? P.red : b.text.trim() ? P.blue : P.bg; G.strokeStyle = P.ink; G.lineWidth = 2; G.beginPath(); G.arc(X(i), Y(b.t), 9, 0, 7); G.fill(); G.stroke(); K.text(G, b.n, X(i), y0 + 18, { a: 'center', s: 12, w: 700 }); });
        S.cv.setAttribute('aria-label', T('Tension curve: ', 'منحنى التوتر: ') + beats.map(b => `${b.n} ${b.t}`).join(', ')); }
      K.drag(S, () => beats.map((b, i) => ({ id: i, x: 60 + 800 * (i + 0.5) / beats.length, y: 260 - 230 * b.t / 100, r: 14 })), (i, x, y) => { const t = Math.round(K.clamp((260 - y) / 230 * 100, 0, 100)); beats[i].t = t; const r = list.querySelector(`[data-bt="${i}"]`); r.value = t; list.querySelector(`[data-to="${i}"]`).textContent = t; check(); draw(); });
      S.onresize = draw; load('freytag'); draw();
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); who = { name: '', want: '' }; load('freytag'); draw(); }, _check: check, _beats: () => beats,
        observe() { const ok = check(); return { text: `${ok.filter(Boolean).length} of ${ok.length} structure checks pass. The highest tension is at **${beats.reduce((bi, b, i) => (b.t > beats[bi].t ? i : bi), 0) + 1}. ${beats[beats.reduce((bi, b, i) => (b.t > beats[bi].t ? i : bi), 0)].n}**.`, predOk: i => i === 2 }; } };
    }
  };

  /* ======================= VOTING SYSTEMS ======================= */
  const CAND = ['A', 'B', 'C', 'D'];
  const PROFILES = {
    split: { n: 'Two similar candidates split the vote', g: [[8, 'ABCD'], [7, 'BCDA'], [6, 'CBDA'], [3, 'DCBA']] },
    classic: { n: 'Four rules, four different winners', g: [[14, 'ABCD'], [10, 'CBDA'], [8, 'DCBA'], [4, 'BDCA'], [1, 'CDBA']] },
    cycle: { n: 'No Condorcet winner (a cycle)', g: [[5, 'ABCD'], [5, 'BCAD'], [5, 'CABD'], [2, 'DABC']] }
  };
  function count(groups) {
    const N = groups.reduce((s, g) => s + g[0], 0), first = r => r[0];
    const tally = (gs, alive) => { const t = {}; alive.forEach(c0 => { t[c0] = 0; }); gs.forEach(([n, r]) => { const top = [...r].find(x => alive.includes(x)); if (top) t[top] += n; }); return t; };
    const best = t => Object.keys(t).sort((a, b) => t[b] - t[a] || a.localeCompare(b));
    const plur = tally(groups, CAND), pW = best(plur)[0];
    const top2 = best(plur).slice(0, 2), run = tally(groups, top2), rW = plur[pW] * 2 > N ? pW : best(run)[0];
    let alive = CAND.slice(), irvRounds = []; let irvW = null;
    while (alive.length) { const t = tally(groups, alive); irvRounds.push(t); const o = best(t); if (t[o[0]] * 2 > N || alive.length === 1) { irvW = o[0]; break; } const low = Math.min(...alive.map(c0 => t[c0])); const out = alive.filter(c0 => t[c0] === low).sort().reverse()[0]; alive = alive.filter(c0 => c0 !== out); }
    const borda = {}; CAND.forEach(c0 => { borda[c0] = 0; }); groups.forEach(([n, r]) => [...r].forEach((c0, i) => { borda[c0] += n * (CAND.length - 1 - i); })); const bW = best(borda)[0];
    const pair = {}; CAND.forEach(a => { pair[a] = {}; CAND.forEach(b => { if (a !== b) pair[a][b] = groups.reduce((s, [n, r]) => s + (r.indexOf(a) < r.indexOf(b) ? n : 0), 0); }); });
    const cond = CAND.find(a => CAND.every(b => b === a || pair[a][b] * 2 > N)) || null;
    return { N, plur, pW, run, top2, rW, irvRounds, irvW, borda, bW, pair, cond, first };
  }
  D.voting = { wide: true,
    intro: 'The same voters, the same ballots — but who wins depends on **how you count**. Each group of voters ranks four candidates. Change how many voters are in each group and compare five counting rules side by side.',
    predict: { q: 'With exactly the same ranked ballots, can two fair-sounding counting rules elect different winners?', options: ['no — the votes decide, not the rule', 'yes — the rule can change the winner', 'only if someone cheats', 'only with two candidates'] },
    explore: '- Load **Four rules, four different winners**. Who wins plurality? Two-round runoff? Instant runoff? Borda? Who beats everyone head-to-head?\n- Load **Two similar candidates split the vote**: B and C share supporters. Who wins plurality — and who would win a head-to-head against everyone?\n- Load **No Condorcet winner** and read the head-to-head table: A beats B, B beats C, C beats A.',
    explain: '**Plurality** (first past the post): most first preferences wins. **Two-round runoff**: if nobody has a majority, the top two face each other. **Instant runoff (IRV)**: repeatedly remove the candidate with the fewest first preferences and transfer those ballots to their next choice until someone has a majority. **Borda count**: on each ballot a candidate gets 3, 2, 1 or 0 points by position. A **Condorcet winner** beats every other candidate head-to-head — but one may not exist, because majority preferences can go round in a **cycle**. Kenneth Arrow proved (1951) that no ranked voting rule can satisfy a small set of fairness conditions all at once, which is why countries choose different rules and argue about them. Ties here are broken alphabetically, which is stated, not hidden.',
    apply: [q('x-vt1', 'Under instant runoff, what happens to a ballot whose first choice is eliminated?', ['it is thrown away', 'it moves to its next surviving choice', 'it counts double', 'it goes to the leader'], 1, 'Ballots transfer to the next preference still in the race.'), q('x-vt2', 'A Condorcet winner is a candidate who…', ['has the most first preferences', 'beats every other candidate in head-to-head majorities', 'has the most Borda points', 'is ranked last by nobody'], 1, 'Pairwise majority against each rival.')],
    summary: ['Same ballots, different rules → possibly different winners.', 'Plurality, runoff, IRV, Borda, Condorcet.', 'A Condorcet winner may not exist (cycles); no rule is perfect (Arrow).'],
    connect: [{ label: 'City budget', href: '#/exp/city' }, { label: 'Probability lab', href: '#/exp/prob-lab' }],
    build(host, c) {
      const ctl = K.controls(host, [{ k: 'row' }, { k: 'chips', id: 'pf', label: T('Example electorate', 'مثال'), opts: Object.keys(PROFILES).map(k => [k, PROFILES[k].n]), val: 'classic' }, { k: 'end' }], (id, v) => { if (id === 'pf') load(v); });
      const box = document.createElement('div'); box.className = 'vt__groups'; host.appendChild(box);
      const S = K.stage(host, 900, 230, 'vt__bars'); S.cv.setAttribute('role', 'img');
      const grid = document.createElement('div'); grid.className = 'v26-grid2'; grid.innerHTML = card('vt__res', T('Winners by rule', 'الفائز حسب القاعدة')) + card('vt__pair', T('Head-to-head', 'المواجهات الثنائية')); host.appendChild(grid);
      let groups = [];
      function load(k) { groups = PROFILES[k].g.map(g => g.slice());
        box.innerHTML = groups.map(([n, r], i) => `<label class="kx-range vt__g"><span class="kx-range__t">${T('Ranking', 'الترتيب')} <b>${r.split('').join(' › ')}</b><output data-vo="${i}">${n} ${T('voters', 'ناخبين')}</output></span><input type="range" min="0" max="20" step="1" value="${n}" data-vg="${i}" aria-label="${T('Voters ranking', 'ناخبون يرتبون')} ${r.split('').join(', ')}"></label>`).join(''); show(); }
      box.addEventListener('input', e => { const i = e.target.dataset.vg; if (i == null) return; groups[+i][0] = +e.target.value; box.querySelector(`[data-vo="${i}"]`).textContent = e.target.value + ' ' + T('voters', 'ناخبين'); show(); });
      function show() { const R = count(groups), P = K.pal(), G = S.g; S.clear();
        const cols = { A: P.blue, B: P.red, C: P.green, D: P.violet }, rules = [[T('Plurality (first preferences)', 'الأغلبية النسبية'), R.plur, R.pW], [T('Borda points', 'نقاط بوردا'), R.borda, R.bW]];
        rules.forEach(([name, t, w], k) => { const y0 = 20 + k * 105, mx = Math.max(1, ...Object.values(t)); K.text(G, name, 20, y0 + 6, { w: 700, s: 13 }); CAND.forEach((c0, i) => { const y = y0 + 18 + i * 20, wv = t[c0] / mx * 640; G.fillStyle = cols[c0]; G.globalAlpha = c0 === w ? 1 : 0.45; G.fillRect(60, y, wv, 15); G.globalAlpha = 1; K.text(G, c0, 40, y + 12, { w: 800 }); K.text(G, String(t[c0]) + (c0 === w ? '  ← ' + T('winner', 'الفائز') : ''), 66 + wv, y + 12, { s: 12, w: c0 === w ? 800 : 500 }); }); });
        const irv = R.irvRounds.map((t, i) => `${T('Round', 'جولة')} ${i + 1}: ${Object.entries(t).map(([k, v]) => `${k} ${v}`).join(', ')}`).join('<br>');
        host.querySelector('.vt__res').innerHTML = `<p>${R.N} ${T('voters', 'ناخبين')} · ${T('majority', 'الأغلبية')} = ${Math.floor(R.N / 2) + 1}</p><table><tr><td>${T('Plurality', 'الأغلبية النسبية')}</td><td><b>${R.pW}</b> (${R.plur[R.pW]})</td></tr><tr><td>${T('Two-round runoff', 'جولتان')}</td><td><b>${R.rW}</b>${R.plur[R.pW] * 2 > R.N ? ' ' + T('(majority in round 1)', '(أغلبية من الجولة الأولى)') : ` (${R.top2.map(k => `${k} ${R.run[k]}`).join(' vs ')})`}</td></tr><tr><td>${T('Instant runoff', 'الجولات الفورية')}</td><td><b>${R.irvW}</b></td></tr><tr><td>${T('Borda count', 'بوردا')}</td><td><b>${R.bW}</b> (${R.borda[R.bW]})</td></tr><tr><td>${T('Condorcet winner', 'فائز كوندورسيه')}</td><td><b>${R.cond || T('none — there is a cycle', 'لا يوجد — دورة')}</b></td></tr></table><p class="v26-hint">${irv}</p>`;
        host.querySelector('.vt__pair').innerHTML = `<table><tr><th></th>${CAND.map(b => `<th>${T('vs', 'ضد')} ${b}</th>`).join('')}</tr>${CAND.map(a => `<tr><th>${a}</th>${CAND.map(b => (a === b ? '<td>—</td>' : `<td class="${R.pair[a][b] * 2 > R.N ? 'v28-win' : ''}">${R.pair[a][b]}–${R.N - R.pair[a][b]}</td>`)).join('')}</tr>`).join('')}</table><p class="v26-hint">${T('Each cell: voters preferring the row candidate to the column candidate. Highlighted = a majority.', 'كل خلية: ناخبون يفضلون مرشح الصف.')}</p>`;
        S.cv.setAttribute('aria-label', `${T('Plurality winner', 'فائز الأغلبية')} ${R.pW}; ${T('Borda winner', 'فائز بوردا')} ${R.bW}.`); }
      S.onresize = show; load('classic');
      return { destroy() { S.destroy(); }, reset() { ctl.reset(); load('classic'); }, _count: g => count(g || groups), _load: k => { ctl.set('pf', k); load(k); return count(groups); },
        observe() { const R = count(groups); const ws = new Set([R.pW, R.rW, R.irvW, R.bW]); return { text: `Plurality **${R.pW}**, runoff **${R.rW}**, instant runoff **${R.irvW}**, Borda **${R.bW}**, Condorcet **${R.cond || 'none'}** — ${ws.size} different winners from the same ballots.`, predOk: i => (ws.size > 1 ? i === 1 : null) }; } };
    }
  };
})();
