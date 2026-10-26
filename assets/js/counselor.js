/* Acubins · SAS counselor dashboard. Students appear here only after they
   choose to book SAS and share their ERLY Evidence Pack. All records are
   synthetic, except an optional "Acubins (you)" row built from the student
   demo played in this same browser. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- small helpers ---------- */
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-on'), 2600); }
  function countUp(el, to, dec = 0) {
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    const t0 = performance.now();
    (function f(t) { const k = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - k, 4); el.textContent = (to * e).toFixed(dec); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  const fmtD = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const day = n => new Date(Date.now() + n * 864e5);

  /* ---------- animated area icons ---------- */
  const AREA = {
    reading: { label: 'Reading', color: 'var(--s1)', icon: '<svg viewBox="0 0 40 40" class="ai ai--read"><path d="M4 10c5-2 11-2 16 2v20c-5-4-11-4-16-2z" fill="var(--s1)" opacity=".85"/><path d="M36 10c-5-2-11-2-16 2v20c5-4 11-4 16-2z" fill="var(--s1)" opacity=".55"/><text x="9" y="9" class="ai-l ai-l1" font-size="9" font-weight="700" fill="var(--ink)">b</text><text x="25" y="8" class="ai-l ai-l2" font-size="9" font-weight="700" fill="var(--ink)">d</text></svg>' },
    attention: { label: 'Attention', color: 'var(--s4)', icon: '<svg viewBox="0 0 40 40" class="ai ai--att"><circle cx="20" cy="20" r="12" fill="none" stroke="var(--s4)" stroke-width="3" stroke-dasharray="6 5" class="ai-spin"/><path d="M22 8 14 22h7l-3 10 9-15h-7z" fill="var(--s3)" class="ai-zap"/></svg>' },
    number: { label: 'Number', color: 'var(--s2)', icon: '<svg viewBox="0 0 40 40" class="ai ai--num"><text x="4" y="22" font-size="14" font-weight="700" fill="var(--s2)" class="ai-f1">7</text><text x="16" y="30" font-size="12" font-weight="700" fill="var(--s2)" class="ai-f2">3</text><text x="26" y="18" font-size="13" font-weight="700" fill="var(--s2)" class="ai-f3">9</text></svg>' },
    language: { label: 'Language load', color: 'var(--s3)', icon: '<svg viewBox="0 0 40 40" class="ai ai--lang"><path d="M4 8h18v12H12l-5 4v-4H4z" fill="var(--s3)" class="ai-b1"/><path d="M36 16H18v12h10l5 4v-4h3z" fill="var(--teal)" class="ai-b2"/><text x="8" y="18" font-size="8" font-weight="700" fill="#1B1915">Aa</text><text x="23" y="26" font-size="8" font-weight="700" fill="#fff">ع</text></svg>' }
  };
  const ILLO = {
    reading: `<svg viewBox="0 0 300 150" class="illo"><rect x="20" y="12" width="150" height="126" rx="10" fill="var(--surface)" stroke="var(--line-2)"/>${[0, 1, 2, 3, 4, 5].map(i => [0, 1, 2].map(j => `<rect x="${34 + j * 44}" y="${30 + i * 17}" width="${32 + ((i + j) % 3) * 5}" height="7" rx="3.5" fill="var(--line-2)" class="${(i * 3 + j) % 4 === 1 ? 'il-drift' : ''}"/>`).join('')).join('')}<g class="il-loupe"><circle cx="210" cy="72" r="38" fill="var(--bg)" stroke="var(--ink)" stroke-width="5"/><line x1="238" y1="100" x2="264" y2="128" stroke="var(--ink)" stroke-width="8" stroke-linecap="round"/><text x="190" y="84" font-size="30" font-family="Fraunces,serif" fill="var(--accent)" class="il-b">b</text><text x="214" y="84" font-size="30" font-family="Fraunces,serif" fill="var(--teal)" class="il-d">d</text></g></svg>`,
    attention: `<svg viewBox="0 0 300 150" class="illo"><line x1="20" y1="130" x2="280" y2="130" stroke="var(--line-2)" stroke-width="2"/><path class="il-curve" d="M20 122 C 80 120, 140 122, 190 116 S 232 50, 248 26 L 262 122" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/><g transform="translate(252 14)"><line x1="0" y1="0" x2="0" y2="116" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 4"/><path d="M0 0h20l-6 6 6 6H0z" fill="var(--accent)"/></g><g class="il-door"><rect x="56" y="52" width="46" height="72" rx="4" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2.5"/><circle cx="94" cy="90" r="3" fill="var(--ink)"/></g><g class="il-push"><circle cx="36" cy="80" r="8" fill="var(--s3)"/><path d="M36 88v22M36 94l16-5M36 110l-7 16M36 110l9 16" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></g></svg>`,
    number: `<svg viewBox="0 0 300 150" class="illo"><line x1="20" y1="114" x2="280" y2="114" stroke="var(--ink)" stroke-width="3"/>${[0, 1, 2, 3, 4].map(i => `<line x1="${20 + i * 65}" y1="106" x2="${20 + i * 65}" y2="122" stroke="var(--ink)" stroke-width="2"/>`).join('')}${[['7', 60, 50, 0], ['31', 120, 34, .6], ['4', 180, 70, 1.2], ['58', 230, 44, 1.8]].map(([n, x, y, d]) => `<text x="${x}" y="${y}" font-size="28" font-weight="600" fill="var(--s2)" class="il-float" style="--d:${d}s">${n}</text>`).join('')}</svg>`,
    language: `<svg viewBox="0 0 300 150" class="illo"><g transform="translate(40 16)"><rect width="90" height="118" rx="8" fill="var(--teal)" opacity=".85"/><rect x="9" y="11" width="72" height="96" rx="4" fill="var(--surface)"/><text x="45" y="68" font-size="32" text-anchor="middle" fill="var(--teal)">ع</text></g><g transform="translate(170 16)" class="il-heavy"><rect width="90" height="118" rx="8" fill="var(--accent)" opacity=".85"/><rect x="9" y="11" width="72" height="96" rx="4" fill="var(--surface)"/><text x="45" y="70" font-size="32" text-anchor="middle" font-family="Fraunces" fill="var(--accent)">Aa</text></g></svg>`
  };
  const FEEL = {
    reading: 'Re-reading and slow decoding in both languages; similar letters swap when tired.',
    attention: 'Starting is the hard part; work bunches up near deadlines; drafts abandoned.',
    number: 'Placing and comparing quantities takes extra steps.',
    language: 'Slower in English only — may be second-language load rather than a learning difficulty.'
  };
  const DOMAINS = ['Reading · EN', 'Reading · AR', 'Sound skills', 'Naming speed', 'Focus', 'Working memory', 'Number sense'];

  /* ---------- synthetic caseload ---------- */
  const S = [
    { id: '2026-0311', name: 'Mariam Al Hammadi', prog: 'Mechanical Eng.', year: 2, status: 'new', via: 'Challenge + 2-week watch', areas: ['reading'], d: [34, 41, 50, 38, 72, 66, 80], en: 1420, ar: 1240, wx: [0, 0, 0, 2, 1, 3, 2, 2, 3, 1, 2, 3, 2, 2], gpa: [3.6, 3.2, 2.9, null], on: [92, 81, 70, null], req: -1, ally: 'Sara (sister)', note: 'Re-reading spikes in English PDFs after 11pm. Read-aloud helped (“easier”).' },
    { id: '2026-0507', name: 'Omar Khalid', prog: 'Computer Science', year: 1, status: 'new', via: 'Challenge + 2-week watch', areas: ['attention'], d: [78, 82, 84, 70, 38, 61, 74], en: 760, ar: 720, wx: [0, 0, 0, 1, 3, 2, 0, 2, 3, 2, 1, 3, 2, 1], gpa: [3.1, 2.7, null, null], on: [74, 58, null, null], req: -2, ally: null, note: 'ASRS Part A: 5/6 in shaded range. 11th-hour spikes on 8 of 11 days.' },
    { id: '2026-0129', name: 'Aisha Rahman', prog: 'Law', year: 1, status: 'new', via: 'Self-referral (no test)', areas: [], d: null, en: null, ar: null, wx: null, gpa: [3.4, null, null, null], on: [88, null, null, null], req: 0, ally: null, note: 'Self-referred: “I suspect I might have dyslexia; reading cases takes me hours.”' },
    { id: '2026-0442', name: 'Noura Al Ketbi', prog: 'Mechanical Eng.', year: 2, status: 'scheduled', slot: 1, slotT: '10:30', via: 'Challenge + 2-week watch', areas: ['reading', 'language'], d: [30, 62, 48, 44, 70, 58, 77], en: 1510, ar: 980, wx: [0, 0, 0, 1, 2, 2, 1, 3, 2, 2, 1, 2, 3, 2], gpa: [3.8, 3.4, 3.0, null], on: [95, 86, 72, null], req: -4, ally: 'Sara (sister)', note: 'Much slower in English than Arabic — check language load vs decoding.' },
    { id: '2026-0618', name: 'Rahul Menon', prog: 'Business', year: 3, status: 'scheduled', slot: 3, slotT: '13:30', via: 'Challenge', areas: ['number'], d: [80, 76, 82, 74, 76, 52, 31], en: 690, ar: 1100, wx: null, gpa: [3.3, 3.1, 2.8, 2.6], on: [90, 88, 84, 80], req: -5, ally: null, note: 'Number-line error 14, dot comparison 62%. Struggling in Statistics II.' },
    { id: '2026-0233', name: 'Fatima Al Suwaidi', prog: 'Medicine', year: 1, status: 'assessed', confirmed: 'ADHD (combined)', via: 'Challenge + 2-week watch', areas: ['attention', 'reading'], d: [48, 55, 74, 60, 34, 50, 70], en: 1180, ar: 1090, wx: [0, 0, 0, 2, 3, 2, 3, 1, 2, 3, 3, 2, 2, 3], gpa: [3.5, 3.0, null, null], on: [80, 62, null, null], req: -12, ally: 'Dr. Hessa (advisor)', note: 'Assessed 18 Oct. Recommend distraction-reduced exams and extensions by arrangement.' },
    { id: '2026-0175', name: 'Yousef Darwish', prog: 'Architecture', year: 2, status: 'plan', confirmed: 'Dyslexia', via: 'Challenge + 2-week watch', areas: ['reading'], d: [28, 36, 41, 35, 74, 68, 72], en: 1560, ar: 1380, wx: [0, 0, 0, 2, 2, 3, 2, 1, 3, 2, 2, 3, 2, 2], gpa: [3.0, 2.6, 2.4, 3.1], on: [84, 70, 66, 90], plan: 3, accom: ['25% extra time', 'Text-to-speech in exams', 'Readings in advance'], req: -40, ally: null, note: 'Support plan since Fall. Grades recovering.' },
    { id: '2026-0388', name: 'Hamdan Al Mazrouei', prog: 'Civil Eng.', year: 3, status: 'plan', confirmed: 'No learning disability — English language support', via: 'Challenge', areas: ['language'], d: [42, 86, 80, 76, 78, 72, 74], en: 1350, ar: 640, wx: null, gpa: [2.9, 2.8, 2.7, 3.2], on: [82, 80, 78, 88], plan: 3, accom: ['English writing centre', 'Glossaries for course terms'], req: -38, ally: null, note: 'Assessment found no LD. Gap was second-language load — ERLY routed correctly.' },
    { id: '2026-0254', name: 'Leila Haddad', prog: 'Psychology', year: 2, status: 'plan', confirmed: 'Dyscalculia', via: 'Challenge + 2-week watch', areas: ['number'], d: [82, 80, 78, 72, 70, 44, 26], en: 700, ar: 760, wx: [0, 0, 0, 1, 0, 2, 1, 2, 1, 2, 1, 1, 2, 1], gpa: [3.4, 3.0, 2.7, 3.3], on: [91, 89, 85, 92], plan: 3, accom: ['Calculator in all exams', 'Formula sheets', 'Maths centre slots'], req: -44, ally: 'Mariam (friend)', note: 'Statistics grades up from C to B+ with formula sheets.' },
    { id: '2026-0461', name: 'Saeed Al Nuaimi', prog: 'Electrical Eng.', year: 1, status: 'plan', confirmed: 'ADHD (inattentive)', via: 'Challenge + 2-week watch', areas: ['attention'], d: [74, 80, 76, 68, 30, 46, 70], en: 820, ar: 760, wx: [0, 0, 0, 3, 2, 3, 2, 3, 2, 2, 3, 2, 3, 2], gpa: [3.2, 2.5, 3.0, null], on: [76, 55, 84, null], plan: 2, accom: ['Distraction-reduced exam room', '48h extensions by arrangement', 'Focus-sprint coaching'], req: -52, ally: null, note: 'On-time submissions up 29 points since plan started.' }
  ];
  S.forEach((s, i) => { s.init = s.name.split(' ').map(w => w[0]).slice(0, 2).join(''); s.hue = (i * 47) % 360; });

  // "Acubins (you)" — built from the student demo in this browser, if played
  (function addYou() {
    try {
      const c = JSON.parse(localStorage.getItem('erly-challenge-v2') || 'null');
      if (!c || ![1, 2, 3, 4, 5].every(n => c.days && c.days[n])) return;
      const g = n => c.days[n].data;
      const g1 = g(1), g2 = g(2), g3 = g(3), g4 = g(4), g5 = g(5);
      const cl = v => Math.max(4, Math.min(100, Math.round(v)));
      const d = [cl(g1.en.acc * 100 - (g1.en.rt - 600) / 12), cl(g1.ar.acc * 100 - (g1.ar.rt - 600) / 12), cl(g2.correct / g2.of * 100), cl(140 - g3.msPerItem / 10), cl(100 - g4.commission * 100 - g4.omission * 200 - Math.max(0, g4.cv - .2) * 100), cl(g5.span / 7 * 100), cl(100 - g5.lineErr * 3 - (1 - g5.dots) * 60)];
      const areas = [];
      if ([d[0] < 50 || d[1] < 50, d[2] < 67, d[3] < 60].filter(Boolean).length >= 2) areas.push('reading');
      if (d[4] < 50) areas.push('attention');
      if (d[6] < 50) areas.push('number');
      if (d[0] < 50 && d[1] >= 50) areas.push('language');
      const w = JSON.parse(localStorage.getItem('erly-watch-v2') || 'null');
      const wx = w && w.status === 'ended' && w.data ? w.data.map((x, i) => i < 3 ? 0 : ['s1', 's2', 's3', 's4'].filter(k => x[k]).length) : null;
      S.unshift({ id: '2026-0417', name: 'Acubins (you)', init: 'A', hue: 18, prog: 'Demo student', year: 1, status: 'new', via: wx ? 'Challenge + 2-week watch' : 'Challenge', areas, d, en: g1.en.rt, ar: g1.ar.rt, wx, gpa: [3.5, null, null, null], on: [86, null, null, null], req: 0, ally: null, live: true, note: c.sample ? 'Loaded from the sample result on the student page.' : 'Built from the games you just played on the student page — live.' });
    } catch (e) {}
  })();

  /* ---------- header ---------- */
  const h = new Date().getHours();
  $('#hi').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', Counselor';
  $('#today').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('erly-theme', next); } catch (e) {}
  });
  $('#logoutBtn').addEventListener('click', () => {
    try { sessionStorage.removeItem('acubins-role'); sessionStorage.setItem('acubins-bye', '1'); } catch (e) {}
    document.body.classList.add('is-leaving');
    setTimeout(() => location.href = 'index.html', 450);
  });
  $('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('is-open'));

  /* ---------- views ---------- */
  function go(v) {
    $$('.side__a').forEach(a => a.classList.toggle('is-on', a.dataset.view === v));
    $$('.view').forEach(x => x.classList.toggle('is-on', x.dataset.view === v));
    $('#side').classList.remove('is-open');
    render(v);
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
  $$('.side__a').forEach(a => a.addEventListener('click', () => go(a.dataset.view)));
  document.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) go(g.dataset.goto); });

  const STATUS = { new: 'New', scheduled: 'Scheduled', assessed: 'Assessed', plan: 'Support plan' };
  const ORDER = ['new', 'scheduled', 'assessed', 'plan'];
  const avatar = (s, cls = '') => `<span class="avatar avatar--hue ${cls}" style="--h:${s.hue}">${s.init}</span>`;
  const areaTags = s => s.areas.length ? s.areas.map(a => `<span class="atag" style="--c:${AREA[a].color}">${AREA[a].icon}${AREA[a].label}</span>`).join('') : '<span class="atag atag--self">🙋 self-referral</span>';
  const ago = n => n === 0 ? 'today' : n === -1 ? 'yesterday' : `${-n} days ago`;

  function filtered() {
    const q = ($('#search').value || '').toLowerCase().trim();
    return S.filter(s => !q || s.name.toLowerCase().includes(q) || s.prog.toLowerCase().includes(q) || s.areas.some(a => a.includes(q)) || (s.confirmed || '').toLowerCase().includes(q));
  }
  $('#search').addEventListener('input', () => { const v = $('.view.is-on').dataset.view; render(v); });

  /* ---------- overview ---------- */
  function renderOverview() {
    const K = [
      ['New requests', S.filter(s => s.status === 'new').length, '📥', 'var(--accent)'],
      ['Scheduled this week', S.filter(s => s.status === 'scheduled').length, '📅', 'var(--teal)'],
      ['Assessed, awaiting plan', S.filter(s => s.status === 'assessed').length, '🩺', 'var(--s4)'],
      ['Active support plans', S.filter(s => s.status === 'plan').length, '🌱', 'var(--good)']
    ];
    $('#kpis').innerHTML = K.map(([l, n, ic, c], i) => `<div class="kpi kpi--dash" style="--c:${c};--i:${i}"><span class="kpi__ic">${ic}</span><small>${l}</small><b data-n="${n}">0</b></div>`).join('');
    $$('#kpis b').forEach(b => countUp(b, +b.dataset.n));
    $('#newBadge').textContent = K[0][1];
    const reqs = filtered().filter(s => s.status === 'new' || s.status === 'scheduled');
    $('#reqList').innerHTML = reqs.map((s, i) => `<button class="req" data-id="${s.id}" style="--i:${i}">${avatar(s)}<span class="req__who"><b>${s.name}${s.live ? ' <em class="live-dot">live</em>' : ''}</b><small>${s.prog} · Year ${s.year} · ${s.via}</small></span><span class="req__tags">${areaTags(s)}</span><span class="req__st st st--${s.status}">${STATUS[s.status]}</span><span class="req__when muted small">${ago(s.req)}</span></button>`).join('') || '<p class="muted">No matching requests.</p>';
    // donut of areas
    const counts = ['reading', 'attention', 'number', 'language'].map(a => [a, S.filter(s => s.areas.includes(a)).length]);
    const total = counts.reduce((x, [, n]) => x + n, 0);
    let acc = 0;
    const C = 2 * Math.PI * 44;
    $('#donut').innerHTML = `<circle cx="60" cy="60" r="44" fill="none" stroke="var(--surface-2)" stroke-width="16"/>` + counts.map(([a, n], i) => {
      const len = n / total * C, off = acc; acc += len;
      return `<circle cx="60" cy="60" r="44" fill="none" stroke="${AREA[a].color}" stroke-width="16" stroke-dasharray="0 ${C}" data-len="${len - 2}" data-off="${-off}" transform="rotate(-90 60 60)" class="donut__seg" style="transition-delay:${i * 120}ms"/>`;
    }).join('');
    requestAnimationFrame(() => setTimeout(() => $$('.donut__seg').forEach(c => { c.style.strokeDasharray = `${c.dataset.len} ${C}`; c.style.strokeDashoffset = c.dataset.off; }), 60));
    countUp($('#donutN'), S.filter(s => s.areas.length).length);
    $('#donutLegend').innerHTML = counts.map(([a, n]) => `<li style="--c:${AREA[a].color}">${AREA[a].icon}<span>${AREA[a].label}</span><b class="mono">${n}</b></li>`).join('');
    // agenda
    const sched = S.filter(s => s.status === 'scheduled');
    $('#agenda').innerHTML = sched.map(s => `<li><span class="agenda__t"><b>${fmtD(day(s.slot)).split(' ')[0]}</b><small class="mono">${s.slotT}</small></span><button class="agenda__w" data-id="${s.id}">${avatar(s, 'avatar--sm')}<span><b>${s.name}</b><small class="muted">${s.ally ? 'with ' + s.ally : 'alone'} · intake pre-filled</small></span></button></li>`).join('') || '<li class="muted">Nothing scheduled.</li>';
    // impact
    const done = S.filter(s => s.status === 'plan');
    $('#impact').innerHTML = done.map((s, i) => {
      const before = s.gpa[s.plan - 1], after = s.gpa[s.plan];
      return `<button class="imp" data-id="${s.id}" style="--i:${i}">${avatar(s, 'avatar--sm')}<span class="imp__n"><b>${s.name.split(' ')[0]}</b><small class="muted">${s.confirmed.split('—')[0]}</small></span>
        <span class="imp__bars"><i class="imp__b imp__b--before" style="--w:${before / 4 * 100}%"><em>${before.toFixed(1)}</em></i><i class="imp__b imp__b--after" style="--w:${after / 4 * 100}%"><em>${after.toFixed(1)}</em></i></span>
        <b class="imp__d ${after >= before ? 'up' : ''}">${after >= before ? '▲' : '▼'} ${Math.abs(after - before).toFixed(1)}</b></button>`;
    }).join('') + '<p class="small muted">GPA in the semester before the support plan vs. the semester after. Synthetic.</p>';
    requestAnimationFrame(() => setTimeout(() => $$('.imp__b').forEach(b => b.classList.add('is-in')), 80));
  }

  /* ---------- board ---------- */
  let areaF = null;
  function renderBoard() {
    $('#areaFilter').innerHTML = [['all', 'All'], ...Object.entries(AREA).map(([k, v]) => [k, v.label])].map(([k, l]) => `<button class="chip ${(areaF || 'all') === k ? 'is-on' : ''}" data-f="${k}">${l}</button>`).join('');
    const list = filtered().filter(s => !areaF || s.areas.includes(areaF));
    $('#board').innerHTML = ORDER.map(st => {
      const col = list.filter(s => s.status === st);
      return `<div class="col col--${st}"><div class="col__head"><span class="st st--${st}">${STATUS[st]}</span><b class="mono">${col.length}</b></div>
        ${col.map((s, i) => `<article class="tcard" data-id="${s.id}" style="--i:${i}">
          <div class="tcard__top">${avatar(s)}<div><b>${s.name}${s.live ? ' <em class="live-dot">live</em>' : ''}</b><small class="muted">${s.prog} · Y${s.year}</small></div></div>
          <div class="tcard__tags">${areaTags(s)}</div>
          ${s.confirmed ? `<p class="tcard__conf">✓ ${s.confirmed}</p>` : ''}
          ${s.status === 'scheduled' ? `<p class="tcard__meta">📅 ${fmtD(day(s.slot))} · ${s.slotT}${s.ally ? ' · 🤝 ' + s.ally.split(' ')[0] : ''}</p>` : `<p class="tcard__meta muted">${s.via} · ${ago(s.req)}</p>`}
          ${st !== 'plan' ? `<button class="tcard__next" data-next="${s.id}">${st === 'new' ? 'Schedule →' : st === 'scheduled' ? 'Mark assessed →' : 'Create plan →'}</button>` : ''}
        </article>`).join('') || '<p class="col__empty muted small">Nothing here</p>'}</div>`;
    }).join('');
  }
  $('#areaFilter').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { areaF = b.dataset.f === 'all' ? null : b.dataset.f; renderBoard(); } });

  const OUTCOMES = ['Dyslexia', 'ADHD (inattentive)', 'ADHD (combined)', 'Dyscalculia', 'Anxiety — counselling referral', 'No learning disability — English language support', 'No learning disability — study skills support'];
  function advance(s, outcome) {
    const i = ORDER.indexOf(s.status);
    if (s.status === 'new') { s.status = 'scheduled'; s.slot = 2; s.slotT = '11:00'; toast(`Scheduled ${s.name.split(' ')[0]} for ${fmtD(day(2))}, 11:00. Student notified.`); }
    else if (s.status === 'scheduled') { s.status = 'assessed'; s.confirmed = outcome || s.confirmed || 'Assessment complete'; toast(`${s.name.split(' ')[0]}: assessment recorded.`); }
    else if (s.status === 'assessed') { s.status = 'plan'; s.plan = s.gpa.findIndex(g => g == null); if (s.plan < 1) s.plan = 1; s.accom = s.accom || defaultAccom(s.confirmed); toast(`Support plan created for ${s.name.split(' ')[0]}.`); }
    return i;
  }
  function defaultAccom(c) {
    if (/dyslexia/i.test(c)) return ['25% extra time', 'Text-to-speech in exams', 'Readings in advance'];
    if (/adhd/i.test(c)) return ['Distraction-reduced exam room', 'Extensions by arrangement'];
    if (/dyscalculia/i.test(c)) return ['Calculator in exams', 'Formula sheets'];
    if (/english/i.test(c)) return ['English writing centre', 'Course glossaries'];
    return ['Study-skills coaching'];
  }
  $('#board').addEventListener('click', e => {
    const n = e.target.closest('[data-next]');
    if (n) {
      e.stopPropagation();
      const s = S.find(x => x.id === n.dataset.next);
      if (s.status === 'scheduled') { openDrawer(s, true); return; }
      const card = n.closest('.tcard');
      card.classList.add('is-moving');
      setTimeout(() => { advance(s); renderBoard(); renderOverview(); const moved = $(`.tcard[data-id="${s.id}"]`); if (moved) moved.classList.add('is-arrived'); }, 320);
      return;
    }
    const c = e.target.closest('.tcard');
    if (c) openDrawer(S.find(x => x.id === c.dataset.id));
  });

  /* ---------- students ---------- */
  function spark(vals, plan) {
    const pts = vals.map((v, i) => v == null ? null : [10 + i * 60, 64 - (v - 2) / 2 * 56]).filter(Boolean);
    if (pts.length < 2) return `<svg viewBox="0 0 200 70" class="spark"><text x="100" y="40" text-anchor="middle" class="spark__t">first semester</text></svg>`;
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join(' ');
    return `<svg viewBox="0 0 200 70" class="spark">${plan ? `<rect x="${10 + (plan - .5) * 60}" y="0" width="${200 - (10 + (plan - .5) * 60)}" height="70" class="spark__plan"/><text x="${14 + (plan - .5) * 60}" y="11" class="spark__t">support plan</text>` : ''}<path d="${d}" class="spark__l"/>${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" class="spark__d"/>`).join('')}</svg>`;
  }
  function renderStudents() {
    const list = filtered();
    $('#stuGrid').innerHTML = list.map((s, i) => {
      const last = s.gpa.filter(v => v != null);
      const pre = s.plan ? s.gpa[s.plan - 1] : null, post = s.plan ? s.gpa[s.plan] : null;
      return `<article class="stu" data-id="${s.id}" style="--i:${i}">
        <div class="stu__top">${avatar(s)}<div><b>${s.name}</b><small class="muted">${s.prog} · Year ${s.year}</small></div><span class="st st--${s.status}">${STATUS[s.status]}</span></div>
        <div class="tcard__tags">${areaTags(s)}</div>
        ${s.confirmed ? `<p class="tcard__conf">✓ ${s.confirmed}</p>` : `<p class="tcard__meta muted">Not yet assessed — ERLY flags only</p>`}
        ${spark(s.gpa, s.plan)}
        <div class="stu__nums"><span><small>GPA</small><b class="mono">${last[last.length - 1].toFixed(1)}</b></span><span><small>On time</small><b class="mono">${s.on.filter(v => v != null).slice(-1)[0]}%</b></span>${pre != null && post != null ? `<span><small>Since plan</small><b class="mono ${post >= pre ? 'up' : 'down'}">${post >= pre ? '+' : ''}${(post - pre).toFixed(1)}</b></span>` : ''}</div>
      </article>`;
    }).join('') || '<p class="muted">No students match.</p>';
  }
  $('#stuGrid').addEventListener('click', e => { const c = e.target.closest('.stu'); if (c) openDrawer(S.find(x => x.id === c.dataset.id)); });
  document.addEventListener('click', e => { const r = e.target.closest('.req, .agenda__w, .imp'); if (r) openDrawer(S.find(x => x.id === r.dataset.id)); });

  /* ---------- cohort ---------- */
  function renderCohort() {
    const F = [['Played day 1', 2960], ['Finished all 5 days', 2210], ['“Closer look” results', 248], ['Opted into 2-week watch', 131], ['Booked SAS', 112], ['Assessed', 84], ['Confirmed, support plan', 61]];
    $('#funnel').innerHTML = F.map(([l, n], i) => `<div class="fun-row"><span>${l}</span><span class="bar2"><span data-w="${i < 2 ? n / 2960 * 100 : n / 248 * 100}"></span></span><b>${n.toLocaleString('en-US')}</b></div>`).join('') + '<p class="small muted">Bars after row 2 are scaled to the 248 “closer look” students.</p>';
    const LB = [['Slower in both languages', 37, 'var(--accent)'], ['English only', 41, 'var(--teal)'], ['Arabic only', 6, 'var(--s4)'], ['Other areas', 16, 'var(--s3)']];
    $('#langbars').innerHTML = `<div class="stack">${LB.map(([, v, c]) => `<i style="--w:${v}%;background:${c}"></i>`).join('')}</div>` + LB.map(([l, v, c]) => `<div class="stack__row"><span class="stack__dot" style="background:${c}"></span><span>${l}</span><b class="mono">${v}%</b></div>`).join('');
    const COURSES = ['MECH 210', 'CHEM 101', 'ENGL 102', 'MATH 201', 'BIOL 110', 'ARAB 101'];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const HEAT = COURSES.map(c => Array.from({ length: 10 }, (_, w) => { let v = .06 + rnd() * .14; if (c === 'MECH 210' && w === 3) v = .42; if (c === 'ENGL 102' && w === 6) v = .31; if (w === 7) v += .08; return { v: Math.min(.5, v), sup: c === 'ARAB 101' && w % 3 !== 0 }; }));
    $('#heat').innerHTML = `<div class="heat__row"><span></span>${Array.from({ length: 10 }, (_, w) => `<span class="heat__h">${w + 1}</span>`).join('')}</div>` + COURSES.map((c, ci) => `<div class="heat__row"><span>${c}</span>${HEAT[ci].map((x, w) => x.sup ? '<span class="hc hc--sup"></span>' : `<button class="hc ${x.v > .3 ? 'is-hot' : ''}" style="--v:${(x.v * 1.9).toFixed(2)}" data-c="${c}" data-w="${w}" data-v="${x.v}">${Math.round(x.v * 100)}</button>`).join('')}</div>`).join('');
    requestAnimationFrame(() => setTimeout(() => { $$('#funnel .bar2 span').forEach(s => { s.style.width = s.dataset.w + '%'; }); $$('.stack i').forEach(i => i.style.width = i.style.getPropertyValue('--w')); }, 60));
  }
  $('#heat').addEventListener('click', e => {
    const b = e.target.closest('button.hc'); if (!b) return;
    const v = +b.dataset.v, pct = Math.round(v * 100), n = $('#nudge');
    n.hidden = false;
    n.innerHTML = v < .25 ? `<div><h4>${b.dataset.c} · week ${+b.dataset.w + 1}: ${pct}%</h4><p>Within the normal range. No nudge needed.</p></div>`
      : `<div><h4>Curriculum Mirror → ${b.dataset.c} professor</h4><p>“About ${pct}% of consenting students showed unusually high reading friction on the week ${+b.dataset.w + 1} reading. It may be text-dense — here's a one-page visual summary and an audio version to share.”</p><div class="chips"><span class="chip">📄 visual summary</span><span class="chip">🔊 audio · 11 min</span><span class="chip">no names</span></div></div><div class="row-btns" style="align-self:end"><button class="btn btn--sm btn--accent" id="sendNudge">Send anonymised nudge</button></div>`;
    const sn = $('#sendNudge'); if (sn) sn.onclick = () => { sn.disabled = true; sn.textContent = 'Sent ✓'; toast('Nudge sent — the problem might be the PDF, not the students.'); };
  });

  /* ---------- drawer ---------- */
  const drawer = $('#drawer'), scrim = $('#scrim');
  function weather(n) {
    if (n === 0) return '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9" fill="#F5C443" class="wx-sun"/></svg>';
    if (n === 1) return '<svg viewBox="0 0 48 48"><circle cx="18" cy="18" r="8" fill="#F5C443"/><path d="M14 36h22a7 7 0 0 0 0-14 10 10 0 0 0-19 2 6 6 0 0 0-3 12z" fill="#E4E2EE" stroke="#B9B5CC" stroke-width="1.5" class="wx-cloud"/></svg>';
    if (n === 2) return '<svg viewBox="0 0 48 48"><path d="M11 34h26a8 8 0 0 0 0-16 11 11 0 0 0-21 2 7 7 0 0 0-5 14z" fill="#CFCBE0" stroke="#A29DBA" stroke-width="1.5" class="wx-cloud"/></svg>';
    return '<svg viewBox="0 0 48 48"><path d="M11 28h26a8 8 0 0 0 0-16 11 11 0 0 0-21 2 7 7 0 0 0-5 14z" fill="#B9B4D0" stroke="#8F89AD" stroke-width="1.5"/><g class="wx-rain" stroke="#6E9BD6" stroke-width="2.4" stroke-linecap="round"><line x1="17" y1="33" x2="15" y2="39"/><line x1="25" y1="33" x2="23" y2="39"/><line x1="33" y1="33" x2="31" y2="39"/></g></svg>';
  }
  function gradeChart(s) {
    const W = 420, H = 170, P = 30;
    const xs = i => P + i * (W - 2 * P) / 3, ys = v => H - P - (v - 2) / 2 * (H - 2 * P);
    const pts = s.gpa.map((v, i) => v == null ? null : [xs(i), ys(v)]);
    const ok = pts.filter(Boolean);
    const d = ok.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join(' ');
    const onB = s.on.map((v, i) => v == null ? '' : `<rect x="${xs(i) - 14}" y="${H - P - v / 100 * 50}" width="28" height="${v / 100 * 50}" rx="4" class="gc__bar" style="--d:${i * 120}ms"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="gc">
      ${s.plan ? `<rect x="${xs(s.plan) - (W - 2 * P) / 6}" y="10" width="${W - P - xs(s.plan) + (W - 2 * P) / 6}" height="${H - P - 10}" class="gc__plan"/><text x="${xs(s.plan) - (W - 2 * P) / 6 + 6}" y="24" class="gc__t">support plan →</text>` : ''}
      ${[2, 2.5, 3, 3.5, 4].map(v => `<line x1="${P}" x2="${W - P}" y1="${ys(v)}" y2="${ys(v)}" class="gc__grid"/><text x="${P - 6}" y="${ys(v) + 3}" text-anchor="end" class="gc__t">${v.toFixed(1)}</text>`).join('')}
      ${onB}
      <path d="${d}" class="gc__line"/>
      ${ok.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="5" class="gc__dot"/>`).join('')}
      ${['Fall 25', 'Spr 26', 'Fall 26', 'Spr 27'].map((l, i) => `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle" class="gc__t">${l}</text>`).join('')}
    </svg><p class="small muted"><span class="lg lg--line"></span>GPA &nbsp; <span class="lg lg--bar"></span>on-time submissions</p>`;
  }
  function openDrawer(s, askOutcome) {
    if (!s) return;
    const step = ORDER.indexOf(s.status);
    drawer.innerHTML = `
      <div class="dr__head">${avatar(s, 'avatar--xl')}<div><h3>${s.name}${s.live ? ' <em class="live-dot">live</em>' : ''}</h3><p class="muted">${s.prog} · Year ${s.year} · ID ${s.id}</p><p class="small muted">Shared via ${s.via} · requested ${ago(s.req)}${s.ally ? ' · ally: ' + s.ally : ''}</p></div><button class="icon-btn" id="drClose" aria-label="Close">×</button></div>
      <ol class="dr__steps">${ORDER.map((o, i) => `<li class="${i < step ? 'is-done' : i === step ? 'is-on' : ''}" style="--i:${i}"><i></i><span>${STATUS[o]}</span></li>`).join('')}</ol>

      <section class="dr__sec">
        <h4>${s.confirmed ? 'Assessment outcome' : 'What ERLY flagged'} ${s.confirmed ? '' : '<span class="honesty honesty--sim">screening only</span>'}</h4>
        ${s.confirmed ? `<div class="conf-card"><span class="conf-card__ic">🩺</span><div><b>${s.confirmed}</b><small class="muted">Confirmed by professional assessment at SAS</small></div></div>` : ''}
        ${s.areas.length ? `<div class="dr__areas">${s.areas.map(a => `<div class="dr__area" style="--c:${AREA[a].color}"><div class="dr__illo">${ILLO[a]}</div><div><span class="atag" style="--c:${AREA[a].color}">${AREA[a].icon}${AREA[a].label}</span><p>${FEEL[a]}</p></div></div>`).join('')}</div>`
          : `<div class="conf-card"><span class="conf-card__ic">🙋</span><div><b>Self-referral — no test taken</b><small class="muted">The student chose to come straight to SAS. Their words are below.</small></div></div>`}
      </section>

      ${askOutcome ? `<section class="dr__sec dr__outcome"><h4>Record assessment outcome</h4><div class="outcomes">${OUTCOMES.map(o => `<button class="chip" data-out="${o}">${o}</button>`).join('')}</div></section>` : ''}

      <section class="dr__sec">
        <h4>Performance</h4>
        ${gradeChart(s)}
        ${s.d ? `<div class="dr__sub"><p class="panel__h mono">ERLY game profile · ease 0–100</p><div class="domains">${DOMAINS.map((n, i) => `<div class="dom"><span>${n}</span><span class="dom__bar"><i class="${s.d[i] < 50 ? 'is-low' : ''}" style="--w:${s.d[i]}%"></i><em></em></span><b class="mono">${s.d[i]}</b></div>`).join('')}</div></div>` : ''}
        ${s.en ? `<div class="dr__sub"><p class="panel__h mono">Reading speed · Arabic vs English</p>${[['English', s.en], ['العربية', s.ar]].map(([l, v]) => `<div class="lgap__row"><span>${l}</span><span class="lgap__bar"><i style="--w:${Math.min(100, v / 20)}%"></i></span><b class="mono">${v} ms</b></div>`).join('')}</div>` : ''}
        ${s.wx ? `<div class="dr__sub"><p class="panel__h mono">Two-week watch · friction weather</p><ol class="wx wx--sm">${s.wx.map((n, i) => `<li class="wx__d" style="--i:${i}"><span class="mono">${i + 1}</span>${i < 3 ? '<svg viewBox="0 0 48 48"><path d="M24 40V22" stroke="#4DB3A8" stroke-width="3" stroke-linecap="round"/><path d="M24 26c-8 0-12-5-12-11 7 0 12 4 12 11zM24 22c0-7 5-11 12-11 0 6-4 11-12 11z" fill="#4DB3A8"/></svg>' : weather(n)}</li>`).join('')}</ol></div>` : ''}
      </section>

      <section class="dr__sec">
        <h4>Evidence Pack · student notes</h4>
        <blockquote class="dr__note">${s.note}</blockquote>
        ${s.accom ? `<p class="panel__h mono">Accommodations in place</p><div class="chips">${s.accom.map(a => `<span class="chip is-on">${a}</span>`).join('')}</div>` : ''}
      </section>

      <div class="dr__actions">
        ${s.status !== 'plan' ? `<button class="btn btn--accent" id="drNext">${s.status === 'new' ? 'Schedule appointment' : s.status === 'scheduled' ? 'Record outcome' : 'Create support plan'}</button>` : ''}
        <button class="btn btn--ghost" id="drMsg">Message student</button>
        <button class="btn btn--quiet" id="drPack">Download Evidence Pack</button>
      </div>
      <p class="small muted dr__priv">🔒 Shared by the student. ERLY raw data was deleted on day 14 — this is the summary they approved.</p>`;
    drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false');
    scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add('is-on'));
    drawer.scrollTop = 0;
    requestAnimationFrame(() => setTimeout(() => { $$('.dom__bar i, .lgap__bar i', drawer).forEach(i => i.style.width = i.style.getPropertyValue('--w')); drawer.classList.add('is-drawn'); }, 120));
    $('#drClose').onclick = closeDrawer;
    const nx = $('#drNext');
    if (nx) nx.onclick = () => {
      if (s.status === 'scheduled' && !askOutcome) return openDrawer(s, true);
      if (s.status === 'scheduled') { $('.dr__outcome').scrollIntoView({ behavior: 'smooth' }); return; }
      advance(s); refresh(); openDrawer(s);
    };
    $$('[data-out]', drawer).forEach(b => b.onclick = () => { advance(s, b.dataset.out); refresh(); openDrawer(s); });
    $('#drMsg').onclick = () => toast(`Message sent to ${s.name.split(' ')[0]} through the portal.`);
    $('#drPack').onclick = () => toast('Evidence Pack downloaded (synthetic).');
  }
  function closeDrawer() {
    drawer.classList.remove('is-open', 'is-drawn'); drawer.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('is-on'); setTimeout(() => { scrim.hidden = true; }, 300);
  }
  scrim.addEventListener('click', closeDrawer);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  function refresh() { render($('.view.is-on').dataset.view); if ($('.view.is-on').dataset.view !== 'overview') renderOverview(); }

  function render(v) {
    if (v === 'overview') renderOverview();
    else if (v === 'requests') renderBoard();
    else if (v === 'students') renderStudents();
    else if (v === 'cohort') renderCohort();
  }
  render('overview');
  if (S[0].live) setTimeout(() => toast('A new request just came in from Acubins (you) — built from the games played on the student page.'), 900);
})();
