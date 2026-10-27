/* SAS counselor workspace. Students appear here only after they choose to
   book SAS and share their ERLY Evidence Pack. Every number on the page is
   derived from one caseload model, so the KPIs, charts, tables and drawers
   always agree. Records are synthetic, except an optional "Acubins (you)" row
   built from the 28-day Support Pact run in this same browser. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { CATS, LIST, SIGNALS } = window.ERLY_IND;
  const CK = Object.keys(CATS), DK = CK.filter(c => CATS[c].area !== 'support');
  const DAYS = 28, CAL = 14, JUDGED = DAYS - CAL, EXAM = [22, 23, 24];

  /* ---------- small helpers ---------- */
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-on'), 2800); }
  function countUp(el, to) {
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now();
    (function f(t) { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(to * e); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  const fmtD = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const day = n => new Date(Date.now() + n * 864e5);
  const pct = v => Math.round(v * 100) + '%';
  function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* ---------- areas (the four things ERLY can flag) ---------- */
  const AREA = {
    reading: { label: 'Visual decoding', profile: 'A', cat: 'R', icon: '<svg viewBox="0 0 40 40" class="ai"><path d="M4 10c5-2 11-2 16 2v20c-5-4-11-4-16-2z" fill="var(--c-R)" opacity=".85"/><path d="M36 10c-5-2-11-2-16 2v20c5-4 11-4 16-2z" fill="var(--c-R)" opacity=".5"/><text x="9" y="9" class="ai-l ai-l1" font-size="9" font-weight="700" fill="var(--ink)">b</text><text x="25" y="8" class="ai-l ai-l2" font-size="9" font-weight="700" fill="var(--ink)">d</text></svg>' },
    language: { label: 'Language load', profile: 'EN only', cat: 'T', icon: '<svg viewBox="0 0 40 40" class="ai"><path d="M4 8h18v12H12l-5 4v-4H4z" fill="var(--c-T)" class="ai-b1"/><path d="M36 16H18v12h10l5 4v-4h3z" fill="var(--c-R)" class="ai-b2"/><text x="8" y="18" font-size="8" font-weight="700" fill="#fff">Aa</text><text x="23" y="26" font-size="8" font-weight="700" fill="#fff">ع</text></svg>' },
    executive: { label: 'Executive function', profile: 'B', cat: 'L', icon: '<svg viewBox="0 0 40 40" class="ai"><circle cx="20" cy="20" r="12" fill="none" stroke="var(--c-L)" stroke-width="3" stroke-dasharray="6 5" class="ai-spin"/><path d="M22 8 14 22h7l-3 10 9-15h-7z" fill="var(--c-T)" class="ai-zap"/></svg>' },
    strain: { label: 'Acquired strain', profile: 'C', cat: 'W', icon: '<svg viewBox="0 0 40 40" class="ai"><rect x="5" y="13" width="26" height="14" rx="3" fill="none" stroke="var(--c-W)" stroke-width="3"/><rect x="31" y="17" width="4" height="6" rx="1" fill="var(--c-W)"/><rect x="9" y="17" width="8" height="6" rx="1.5" fill="var(--c-W)" class="ai-zap"/></svg>' }
  };
  const AREA_KEYS = ['reading', 'executive', 'strain', 'language'];
  const ILLO = {
    reading: `<svg viewBox="0 0 300 150" class="illo"><rect x="20" y="12" width="150" height="126" rx="10" fill="var(--surface)" stroke="var(--line-2)"/>${[0, 1, 2, 3, 4, 5].map(i => [0, 1, 2].map(j => `<rect x="${34 + j * 44}" y="${30 + i * 17}" width="${32 + ((i + j) % 3) * 5}" height="7" rx="3.5" fill="var(--line-2)" class="${(i * 3 + j) % 4 === 1 ? 'il-drift' : ''}"/>`).join('')).join('')}<g class="il-loupe"><circle cx="210" cy="72" r="38" fill="var(--bg)" stroke="var(--ink)" stroke-width="5"/><line x1="238" y1="100" x2="264" y2="128" stroke="var(--ink)" stroke-width="8" stroke-linecap="round"/><text x="190" y="84" font-size="30" font-family="Fraunces,serif" fill="var(--accent)" class="il-b">b</text><text x="214" y="84" font-size="30" font-family="Fraunces,serif" fill="var(--teal)" class="il-d">d</text></g></svg>`,
    executive: `<svg viewBox="0 0 300 150" class="illo"><line x1="20" y1="130" x2="280" y2="130" stroke="var(--line-2)" stroke-width="2"/><path class="il-curve" d="M20 122 C 80 120, 140 122, 190 116 S 232 50, 248 26 L 262 122" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/><g transform="translate(252 14)"><line x1="0" y1="0" x2="0" y2="116" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 4"/><path d="M0 0h20l-6 6 6 6H0z" fill="var(--accent)"/></g><g class="il-door"><rect x="56" y="52" width="46" height="72" rx="4" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2.5"/><circle cx="94" cy="90" r="3" fill="var(--ink)"/></g><g class="il-push"><circle cx="36" cy="80" r="8" fill="var(--s3)"/><path d="M36 88v22M36 94l16-5M36 110l-7 16M36 110l9 16" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></g></svg>`,
    language: `<svg viewBox="0 0 300 150" class="illo"><g transform="translate(40 16)"><rect width="90" height="118" rx="8" fill="var(--teal)" opacity=".85"/><rect x="9" y="11" width="72" height="96" rx="4" fill="var(--surface)"/><text x="45" y="68" font-size="32" text-anchor="middle" fill="var(--teal)">ع</text></g><g transform="translate(170 16)" class="il-heavy"><rect width="90" height="118" rx="8" fill="var(--accent)" opacity=".85"/><rect x="9" y="11" width="72" height="96" rx="4" fill="var(--surface)"/><text x="45" y="70" font-size="32" text-anchor="middle" font-family="Fraunces" fill="var(--accent)">Aa</text></g></svg>`,
    strain: `<svg viewBox="0 0 300 150" class="illo"><rect x="50" y="44" width="170" height="70" rx="16" fill="none" stroke="var(--ink)" stroke-width="5"/><rect x="222" y="66" width="16" height="26" rx="4" fill="var(--ink)"/><rect x="62" y="56" width="50" height="46" rx="8" fill="var(--accent)" class="il-batt"/><path d="M140 26c8 10 8 18 0 26M164 18c12 14 12 28 0 42" fill="none" stroke="var(--s3)" stroke-width="4" stroke-linecap="round" class="il-zz"/></svg>`
  };
  const FEEL = {
    reading: 'Profile A — re-reading, longer dwell and slower pace than their own normal, in both Arabic and English, through the watched fortnight.',
    executive: 'Profile B — 11th-hour spikes, abandoned submissions and late starts against their own baseline.',
    language: 'Reading friction on English pages only — the per-language baselines point to language load rather than a learning difference.',
    strain: 'Profile C — a sudden drop across almost every baseline at once. Route to a counsellor first; never tools.',
  };

  /* ---------- synthetic caseload ---------- */
  const SEM = ['Spr 25', 'Fall 25', 'Spr 26', 'Fall 26*'];
  const S = [
    { id: '2026-0311', name: 'Mariam Al Hammadi', prog: 'Mechanical Eng.', year: 2, status: 'new', track: ['reading'], dw: [2.4, 1.9], gpa: [3.6, 3.4, 3.1, 2.9], on: [92, 88, 80, 71], req: -1, ally: 'Sara (sister)', note: 'Re-reading spikes in English PDFs after 11pm. Read-aloud helped (“easier”). Asked Noor for plain-words summaries 9 times.' },
    { id: '2026-0507', name: 'Omar Khalid', prog: 'Computer Science', year: 1, status: 'new', track: ['executive'], dw: [1.2, 1.1], gpa: [null, null, 3.1, 2.7], on: [null, null, 74, 58], req: -2, ally: null, note: '11th-hour submissions on most judged days; three abandoned drafts. Says starting is the hard part.' },
    { id: '2026-0129', name: 'Aisha Rahman', prog: 'Law', year: 1, status: 'new', track: null, gpa: [null, null, 3.4, 3.2], on: [null, null, 88, 84], req: 0, ally: null, note: 'Self-referred without tracking: “I suspect I might have dyslexia; reading cases takes me hours.”' },
    { id: '2026-0442', name: 'Noura Al Ketbi', prog: 'Mechanical Eng.', year: 2, status: 'scheduled', slot: 1, slotT: '10:30', track: ['reading'], dw: [2.6, 1.3], gpa: [3.8, 3.6, 3.4, 3.0], on: [95, 90, 86, 72], req: -4, ally: 'Sara (sister)', note: 'Much slower on English pages than Arabic — check language load vs. decoding.' },
    { id: '2026-0618', name: 'Rahul Menon', prog: 'Business', year: 3, status: 'scheduled', slot: 3, slotT: '13:30', track: ['strain'], dw: [1.3, null], gpa: [3.3, 3.1, 3.0, 2.6], on: [90, 88, 84, 76], req: -5, ally: null, note: 'Late-night study and shorter sessions since a family move. Took the breathing break with Noor often.' },
    { id: '2026-0233', name: 'Fatima Al Suwaidi', prog: 'Medicine', year: 1, status: 'assessed', confirmed: 'ADHD (combined)', track: ['executive', 'reading'], dw: [1.9, 1.7], gpa: [null, null, 3.5, 3.0], on: [null, null, 80, 62], req: -12, ally: 'Dr. Hessa (advisor)', note: 'Assessed 14 Oct. Recommend distraction-reduced exams and extensions by arrangement.' },
    { id: '2026-0175', name: 'Yousef Darwish', prog: 'Architecture', year: 2, status: 'plan', confirmed: 'Dyslexia', track: ['reading'], dw: [2.7, 2.3], gpa: [3.0, 2.6, 2.4, 3.1], on: [84, 70, 66, 90], plan: 3, accom: ['25% extra time', 'Text-to-speech in exams', 'Readings in advance'], req: -60, ally: null, note: 'Support plan since this semester. Mid-term grades recovering.' },
    { id: '2026-0388', name: 'Hamdan Al Mazrouei', prog: 'Civil Eng.', year: 3, status: 'plan', confirmed: 'No learning disability — English language support', track: ['language'], dw: [2.2, 1.0], gpa: [2.9, 2.8, 2.7, 3.2], on: [82, 80, 78, 88], plan: 3, accom: ['English writing centre', 'Glossaries for course terms'], req: -58, ally: null, note: 'Assessment found no learning disability. The gap was second-language load — ERLY routed correctly.' },
    { id: '2026-0254', name: 'Leila Haddad', prog: 'Psychology', year: 2, status: 'plan', confirmed: 'No learning disability — counselling and workload plan', track: ['strain', 'executive'], dw: [1.2, 1.1], gpa: [3.4, 3.3, 2.8, 3.3], on: [91, 89, 72, 90], plan: 3, accom: ['Counselling sessions', 'Reduced course load', 'Planned rest days'], req: -64, ally: 'Mariam (friend)', note: 'Strain, not a learning difficulty. Counselling and a lighter load restored her routine.' },
    { id: '2026-0461', name: 'Saeed Al Nuaimi', prog: 'Electrical Eng.', year: 1, status: 'plan', confirmed: 'ADHD (inattentive)', track: ['executive'], dw: [1.3, 1.2], gpa: [null, 3.2, 2.5, 3.0], on: [null, 76, 55, 84], plan: 3, accom: ['Distraction-reduced exam room', '48h extensions by arrangement', 'Focus-sprint coaching'], req: -70, ally: null, note: 'On-time submissions up 29 points since the plan started.' }
  ];

  // Per-indicator "days above normal" over the 28-day pact — computed exactly as tracker.js does:
  // days 1–14 are the blind fortnight, 15–28 are judged, and Exam Mode days never count.
  function month(seed, areas, dw) {
    const hotAreas = areas.map(a => a === 'language' ? 'reading' : a);
    const boost = hotAreas.includes('reading') ? ['M03', 'M07', 'M09', 'Q05', 'P01'] : [];
    const days = Array.from({ length: DAYS }, (_, i) => ({ n: i + 1, set: new Set() }));
    const per = LIST.filter(i => i.dir > 0).map(ind => {
      const hot = hotAreas.includes(ind.area) || boost.includes(ind.id);
      const p = hot ? 0.6 + hash(seed + ind.id + 'p') * 0.22 : 0.04 + hash(seed + ind.id + 'q') * 0.1;
      let up = 0;
      for (let d = CAL; d < DAYS; d++) {
        if (EXAM.includes(d + 1) && ind.area !== 'reading') continue;
        if (hash(seed + ind.id + d) < p) { days[d].set.add(ind.id); up++; }
      }
      return { id: ind.id, cat: ind.cat, area: ind.area, en: ind.en, live: ind.live, up, frac: up / JUDGED };
    });
    const daily = days.map(d => ({ n: d.n, exam: EXAM.includes(d.n), byArea: Object.fromEntries(['reading', 'executive', 'strain'].map(a => [a, d.n <= CAL ? 0 : per.filter(p => p.area === a && d.set.has(p.id)).length])) }));
    const lang = dw && dw[1] != null ? { en: 1, ar: dw[1] / dw[0] } : null;
    return summarise(per, daily, lang);
  }
  function summarise(per, daily, lang) {
    const areas = {};
    ['reading', 'executive', 'strain'].forEach(a => {
      const inA = per.filter(p => p.area === a);
      areas[a] = { n: inA.length, persistent: inA.filter(p => p.frac >= 0.5).length, score: inA.length ? inA.reduce((x, p) => x + p.frac, 0) / inA.length : 0 };
    });
    const cats = Object.fromEntries(DK.map(c => { const inC = per.filter(p => p.cat === c); return [c, inC.length ? inC.reduce((x, p) => x + p.frac, 0) / inC.length : 0]; }));
    const catsN = Object.fromEntries(DK.map(c => [c, per.filter(p => p.cat === c && p.frac >= .5).length]));
    const dims = DK.filter(c => catsN[c] >= 3);
    let flagged = ['reading', 'executive', 'strain'].filter(a => areas[a].persistent >= 3 && areas[a].score >= 0.35);
    const englishOnly = !!(lang && flagged.includes('reading') && lang.ar < lang.en / 1.6);
    if (englishOnly) flagged = flagged.map(a => a === 'reading' ? 'language' : a);
    const strong = dims.length >= 3 && flagged.length > 0;
    const crisis = strong && flagged.includes('strain') && dims.length >= 7;
    const signals = SIGNALS.map(g => { const ps = per.filter(p => g.ind.includes(p.id)); return { id: g.id, en: g.en, on: ps.filter(p => p.frac >= .5).length >= 2 }; });
    const top3 = per.slice().sort((a, b) => b.frac - a.frac || a.id.localeCompare(b.id)).slice(0, 3);
    return { per, daily, areas, flagged, cats, catsN, dims, strong, crisis, signals, top3, englishOnly, judged: JUDGED };
  }
  S.forEach((s, i) => {
    s.init = s.name.split(' ').map(w => w[0]).slice(0, 2).join('');
    s.hue = (i * 47) % 360;
    s.via = s.track ? 'Support Pact · 28 days' : 'Self-referral';
    s.fx = s.track ? month(s.id, s.track, s.dw) : null;
    s.areas = s.fx ? s.fx.flagged : [];
  });

  // "Acubins (you)" — from the student's own tracking in this browser
  (function addYou() {
    try {
      const t = JSON.parse(localStorage.getItem('erly-track-v2') || 'null');
      if (!t) return;
      const ended = t.status === 'ended' && t.summary;
      if (!ended && !t.selfRef) return;
      let fx = null;
      if (ended) {
        const sm = t.summary;
        fx = { per: sm.per, daily: sm.daily.map(d => ({ n: d.n, exam: d.exam, byArea: d.byArea })), areas: sm.areas, flagged: sm.flaggedAreas, cats: sm.cats, catsN: sm.catsN, dims: sm.dims, strong: sm.strong, crisis: sm.crisis, signals: sm.signals, top3: sm.top3, englishOnly: sm.englishOnly, judged: sm.judged };
      }
      S.unshift({ id: '2026-0417', name: 'Acubins (you)', init: 'A', hue: 18, prog: 'Demo student', year: 1, status: 'new', via: fx ? 'Support Pact · 28 days' : 'Self-referral', fx, areas: fx ? fx.flagged : [], track: fx ? fx.flagged : null, dw: null, gpa: [null, null, 3.5, 3.3], on: [null, null, 86, 80], req: 0, ally: t.pact && t.pact.confirmed && t.pact.ally ? t.pact.ally : null, live: true, note: fx ? 'Built from the 28-day Support Pact you just ran on the student page — live.' : 'Self-referral from the student page — live.' });
    } catch (e) {}
  })();

  /* ---------- theme-aware chart setup ---------- */
  const charts = {};
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function col(v) { const m = /^var\((--[^)]+)\)$/.exec(v); return m ? css(m[1]) : v; }
  function alpha(hex, a) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  let TH = {};
  function readTheme() {
    TH = { ink: css('--ink'), ink2: css('--ink-2'), muted: css('--muted'), line: css('--line'), line2: css('--line-2'), surface: css('--surface'), surface2: css('--surface-2'), bg: css('--bg'), accent: css('--accent'), good: css('--good') };
    ['R', 'L', 'W', 'T'].forEach(c => { TH[c] = css('--c-' + c); });
    TH.area = { reading: TH.R, executive: TH.L, strain: TH.W, language: TH.T, support: TH.muted, control: TH.muted };
    const C = Chart.defaults;
    C.font.family = '"Instrument Sans", system-ui, sans-serif';
    C.font.size = 12;
    C.color = TH.muted;
    C.borderColor = TH.line;
    C.animation = reduce ? false : { duration: 1100, easing: 'easeOutQuart', delay: ctx => ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 35 + ctx.datasetIndex * 140 : 0 };
    C.transitions.active = { animation: { duration: 250 } };
    C.maintainAspectRatio = false;
    C.plugins.legend.labels.usePointStyle = true;
    C.plugins.legend.labels.pointStyle = 'rectRounded';
    C.plugins.legend.labels.boxWidth = 10;
    C.plugins.legend.labels.boxHeight = 10;
    C.plugins.legend.labels.color = TH.ink2;
    C.plugins.legend.align = 'start';
    Object.assign(C.plugins.tooltip, { backgroundColor: TH.ink, titleColor: TH.bg, bodyColor: TH.bg, footerColor: TH.bg, padding: 10, cornerRadius: 10, boxPadding: 4, usePointStyle: true, titleFont: { weight: '600' } });
  }
  const areaColor = a => TH.area[a];
  const domColor = c => TH.area[CATS[c].area];
  const narrow = () => innerWidth < 700;
  const SHORT = { V: 'Visual', U: 'Auditory', M: 'Working memory', E: 'Starting', P: 'Pacing', O: 'Drafting', N: 'Navigation', Q: 'Assessment', H: 'Help-seeking', C: 'Collaboration' };
  const catLabel = c => narrow() ? SHORT[c] : CATS[c].en;
  const gridX = (extra = {}) => ({ grid: { display: false }, border: { color: TH.line2 }, ...extra, ticks: { color: TH.muted, maxRotation: 0, autoSkipPadding: 8, ...(extra.ticks || {}) } });
  const catAxis = () => gridX({ ticks: { color: TH.ink2, autoSkip: false } });
  const gridY = (extra = {}) => ({ grid: { color: TH.line, drawTicks: false }, border: { display: false }, ...extra, ticks: { color: TH.muted, padding: 8, maxRotation: 0, ...(extra.ticks || {}) } });

  // Small drawing plugins: reference line, shaded band, value labels, end labels.
  Chart.register({
    id: 'erlyMarks',
    afterDatasetsDraw(chart, args, o) {
      const { ctx, chartArea: A, scales } = chart;
      ctx.save();
      ctx.font = '600 11px "Instrument Sans", sans-serif';
      (o.bands || (o.band ? [o.band] : [])).forEach(b => {
        const x = scales.x;
        const x0 = x.getPixelForValue(b.from) - (x.getPixelForValue(1) - x.getPixelForValue(0)) / 2;
        const x1 = x.getPixelForValue(b.to) + (x.getPixelForValue(1) - x.getPixelForValue(0)) / 2;
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = alpha(TH.muted.startsWith('#') ? TH.muted : '#888888', .1);
        ctx.fillRect(x0, A.top, x1 - x0, A.bottom - A.top);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = TH.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(b.label, (x0 + x1) / 2, A.top + 4);
      });
      if (o.ref) {
        const r = o.ref, horiz = chart.options.indexAxis === 'y';
        const sc = horiz ? scales.x : scales.y, p = sc.getPixelForValue(r.value);
        ctx.strokeStyle = TH.ink; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (horiz) { ctx.moveTo(p, A.top - 4); ctx.lineTo(p, A.bottom); } else { ctx.moveTo(A.left, p); ctx.lineTo(A.right, p); }
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = TH.ink;
        if (horiz) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(r.label, p, A.top - 6); }
        else { ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(r.label, A.right, p - 4); }
      }
      if (o.vline) {
        const x = scales.x, p = (x.getPixelForValue(o.vline.at - 1) + x.getPixelForValue(o.vline.at)) / 2;
        ctx.strokeStyle = TH.good; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p, A.top); ctx.lineTo(p, A.bottom); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = TH.good; ctx.textBaseline = 'top';
        const fits = p + 5 + ctx.measureText(o.vline.label).width <= A.right;
        ctx.textAlign = fits ? 'left' : 'right';
        ctx.fillText(o.vline.label, fits ? p + 5 : p - 5, A.top + 2);
      }
      if (o.values) {
        const horiz = chart.options.indexAxis === 'y';
        chart.data.datasets.forEach((ds, di) => {
          const meta = chart.getDatasetMeta(di);
          if (meta.hidden) return;
          meta.data.forEach((el, i) => {
            const v = ds.data[i]; if (v == null) return;
            const t = o.values(v, i, di);
            if (t === '') return;
            ctx.fillStyle = TH.ink2;
            if (horiz) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, el.x + 6, el.y); }
            else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(t, el.x, el.y - 4); }
          });
        });
      }
      if (o.endLabels) {
        const placed = [];
        chart.data.datasets.forEach((ds, di) => {
          const meta = chart.getDatasetMeta(di);
          if (meta.hidden || !meta.data.length) return;
          const el = meta.data[meta.data.length - 1];
          let y = el.y;
          placed.forEach(py => { if (Math.abs(py - y) < 13) y = py + (y >= py ? 13 : -13); });
          placed.push(y);
          ctx.fillStyle = TH.ink2; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(ds.label, el.x + 8, y);
        });
      }
      ctx.restore();
    }
  });
  function mk(key, canvas, cfg) {
    if (charts[key]) charts[key].destroy();
    if (!canvas) return null;
    charts[key] = new Chart(canvas, cfg);
    return charts[key];
  }
  function killCharts(prefix) { Object.keys(charts).forEach(k => { if (!prefix || k.startsWith(prefix)) { charts[k].destroy(); delete charts[k]; } }); }

  // Table view for every chart (same data, readable without colour).
  const TABLES = {};
  function setTable(key, head, rows) { TABLES[key] = `<table class="ctable"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<${i ? 'td' : 'th'}>${esc(c)}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</tbody></table>`; }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-table]'); if (!b) return;
    const card = b.closest('[data-chart-card], .dr__sec');
    const tbl = card.querySelector('.chart-table'), box = card.querySelector('.chart-box');
    const on = tbl.hidden;
    tbl.innerHTML = TABLES[b.dataset.table] || '';
    tbl.hidden = !on; if (box) box.hidden = on;
    b.classList.toggle('is-on', on); b.textContent = on ? 'Chart' : 'Table';
    b.setAttribute('aria-pressed', on);
  });

  /* ---------- header & chrome ---------- */
  const h = new Date().getHours();
  $('#hi').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', Counselor';
  $('#today').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('erly-theme', next); } catch (e) {}
    readTheme();
    refresh();
    if (open) openDrawer(open.s, open.ask, true);
  });
  addEventListener('accentchange', () => setTimeout(() => { readTheme(); refresh(); if (open) openDrawer(open.s, open.ask, true); }, 60));
  $('#logoutBtn').addEventListener('click', () => {
    try { sessionStorage.removeItem('acubins-role'); sessionStorage.setItem('acubins-bye', '1'); } catch (e) {}
    document.body.classList.add('is-leaving');
    setTimeout(() => location.href = 'index.html', 450);
  });
  $('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('is-open'));

  /* ---------- views ---------- */
  // a highlight pill that glides to the active sidebar item
  const pill = document.createElement('span');
  pill.className = 'side__pill'; pill.setAttribute('aria-hidden', 'true');
  $('.side__nav').prepend(pill);
  function movePill(instant) {
    const a = $('.side__a.is-on'); if (!a) return;
    pill.style.transition = instant ? 'none' : '';
    pill.style.transform = `translateY(${a.offsetTop}px)`; pill.style.height = a.offsetHeight + 'px';
  }
  let current = 'overview';
  function go(v) {
    if (v === current) { $('#side').classList.remove('is-open'); return; }
    const from = $(`.view[data-view="${current}"]`), to = $(`.view[data-view="${v}"]`);
    const order = ['overview', 'requests', 'students', 'faculty', 'cohort'], dir = order.indexOf(v) > order.indexOf(current) ? 1 : -1;
    current = v;
    $$('.side__a').forEach(a => a.classList.toggle('is-on', a.dataset.view === v));
    movePill();
    $('#side').classList.remove('is-open');
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (reduce || !from) { $$('.view').forEach(x => x.classList.toggle('is-on', x === to)); render(v); return; }
    from.style.setProperty('--dir', dir);
    from.classList.add('is-leaving');
    setTimeout(() => {
      from.classList.remove('is-leaving', 'is-on');
      to.style.setProperty('--dir', dir);
      to.classList.add('is-on');
      render(v);
    }, 220);
  }
  requestAnimationFrame(() => movePill(true));
  addEventListener('resize', () => movePill(true));
  $$('.side__a').forEach(a => a.addEventListener('click', () => go(a.dataset.view)));
  document.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) go(g.dataset.goto); });

  const STATUS = { new: 'New', scheduled: 'Scheduled', assessed: 'Assessed', plan: 'Support plan' };
  const ORDER = ['new', 'scheduled', 'assessed', 'plan'];
  const avatar = (s, cls = '') => `<span class="avatar avatar--hue ${cls}" style="--h:${s.hue}">${s.init}</span>`;
  const areaTags = s => s.areas.length ? s.areas.map(a => `<span class="atag" style="--c:var(--c-${AREA[a].cat})">${AREA[a].icon}${AREA[a].label}</span>`).join('') : s.fx ? '<span class="atag atag--self">no area flagged</span>' : `<span class="atag atag--self">${ICON('hand')} self-referral</span>`;
  const ago = n => n === 0 ? 'today' : n === -1 ? 'yesterday' : `${-n} days ago`;
  const live = s => s.live ? ' <em class="live-dot">live</em>' : '';

  function filtered() {
    const q = ($('#search').value || '').toLowerCase().trim();
    return S.filter(s => !q || s.name.toLowerCase().includes(q) || s.prog.toLowerCase().includes(q) || s.areas.some(a => AREA[a].label.toLowerCase().includes(q)) || (s.confirmed || '').toLowerCase().includes(q));
  }
  $('#search').addEventListener('input', () => render($('.view.is-on').dataset.view));

  /* ---------- overview ---------- */
  const WEEKS = Array.from({ length: 10 }, (_, i) => 'W' + (i + 1));
  // term-wide requests per week (all counselors); week 10 = this week, week 7 = midterms
  const TREND = { track: [0, 0, 1, 3, 4, 6, 5, 7, 9, 8], self: [2, 1, 2, 2, 3, 2, 4, 3, 3, 4] };
  function history(final, seed) { // 8-week trail that ends exactly at today's value
    const a = Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(final * (0.4 + 0.6 * i / 7) + (hash(seed + i) - 0.5) * 2)));
    a.push(final); return a;
  }
  function renderOverview() {
    const K = [
      ['new', 'New requests', 'inbox', '--accent'],
      ['scheduled', 'Scheduled', 'calendar', '--teal'],
      ['assessed', 'Assessed, awaiting plan', 'stetho', '--s4'],
      ['plan', 'Active support plans', 'sprout', '--good']
    ].map(([k, l, ic, c]) => ({ k, l, ic, c, n: S.filter(s => s.status === k).length }));
    $('#kpis').innerHTML = K.map((x, i) => `<div class="kpi kpi--dash" style="--c:var(${x.c});--i:${i}"><span class="kpi__ic">${ICON(x.ic)}</span><small>${x.l}</small><b data-n="${x.n}">0</b><div class="kpi__spark"><canvas id="kSp${i}" aria-label="${x.l}, last 8 weeks"></canvas></div></div>`).join('');
    $$('#kpis b').forEach(b => countUp(b, +b.dataset.n));
    $('#newBadge').textContent = K[0].n;
    K.forEach((x, i) => {
      const c = css(x.c), data = history(x.n, x.k);
      mk('k' + i, $('#kSp' + i), { type: 'line', data: { labels: data.map((_, j) => j === 7 ? 'This week' : `${7 - j} wk ago`), datasets: [{ label: x.l, data, borderColor: c, backgroundColor: alpha(c, .12), fill: true, borderWidth: 2, pointRadius: data.map((_, j) => j === 7 ? 3 : 0), pointBackgroundColor: c, cubicInterpolationMode: 'monotone' }] },
        options: { plugins: { legend: { display: false }, tooltip: { displayColors: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: true, suggestedMax: Math.max(...data) + 1 } }, interaction: { mode: 'index', intersect: false }, layout: { padding: 3 } } });
    });

    const reqs = filtered().filter(s => s.status === 'new' || s.status === 'scheduled');
    $('#reqList').innerHTML = reqs.map((s, i) => `<button class="req" data-id="${s.id}" style="--i:${i}">${avatar(s)}<span class="req__who"><b>${esc(s.name)}${live(s)}</b><small>${s.prog} · Year ${s.year} · ${s.via}</small></span><span class="req__tags">${areaTags(s)}</span><span class="req__st st st--${s.status}">${STATUS[s.status]}</span><span class="req__when mono muted small">${ago(s.req)}</span></button>`).join('') || '<p class="muted">No requests match.</p>';

    // requests per week
    mk('trend', $('#cTrend'), { type: 'line', data: { labels: WEEKS, datasets: [
      { label: 'After an insight', data: TREND.track, borderColor: TH.R, backgroundColor: TH.R, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBorderColor: TH.surface, pointBorderWidth: 2, cubicInterpolationMode: 'monotone' },
      { label: 'Self-referral', data: TREND.self, borderColor: TH.L, backgroundColor: TH.L, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBorderColor: TH.surface, pointBorderWidth: 2, cubicInterpolationMode: 'monotone' }
    ] }, options: { interaction: { mode: 'index', intersect: false }, layout: { padding: { right: narrow() ? 4 : 130 } },
      plugins: { legend: { position: 'top' }, erlyMarks: { endLabels: !narrow(), band: { from: 6, to: 6, label: 'Midterms' } }, tooltip: { callbacks: { footer: it => 'Total: ' + it.reduce((a, b) => a + b.raw, 0) } } },
      scales: { x: gridX(), y: gridY({ beginAtZero: true, ticks: { color: TH.muted, padding: 8, precision: 0 }, title: { display: true, text: 'requests', color: TH.muted } }) } } });
    setTable('trend', ['Week', 'After tracking', 'Self-referral', 'Total'], WEEKS.map((w, i) => [w, TREND.track[i], TREND.self[i], TREND.track[i] + TREND.self[i]]));

    // domains — students whose domain persisted (indicators averaged ≥ 35% of judged days above normal)
    const tracked = S.filter(s => s.fx);
    const catN = DK.map(c => tracked.filter(s => s.fx.dims.includes(c)).length);
    mk('cats', $('#cCats'), { type: 'bar', data: { labels: DK.map(catLabel), datasets: [{ label: 'Students', data: catN, backgroundColor: DK.map(domColor), borderRadius: 4, borderSkipped: 'start', barPercentage: .72, categoryPercentage: .9 }] },
      options: { indexAxis: 'y', layout: { padding: { right: 28 } }, plugins: { legend: { display: false }, erlyMarks: { values: v => String(v) }, tooltip: { callbacks: { label: c => ` ${c.raw} of ${tracked.length} tracked students` } } },
        scales: { x: gridY({ beginAtZero: true, suggestedMax: tracked.length, ticks: { color: TH.muted, precision: 0 } }), y: catAxis() } } });
    setTable('cats', ['Domain', 'Feeds profile', 'Students', `of ${tracked.length} tracked`], DK.map((c, i) => [CATS[c].en, AREA[CATS[c].area] ? AREA[CATS[c].area].label : '—', catN[i], pct(catN[i] / tracked.length)]));

    // areas
    const areaN = AREA_KEYS.map(a => S.filter(s => s.areas.includes(a)).length);
    mk('areas', $('#cAreas'), { type: 'bar', data: { labels: AREA_KEYS.map(a => (narrow() ? '' : (AREA[a].profile.length === 1 ? 'Profile ' + AREA[a].profile + ' · ' : '')) + AREA[a].label), datasets: [{ label: 'Students', data: areaN, backgroundColor: AREA_KEYS.map(areaColor), borderRadius: 4, borderSkipped: 'start', barPercentage: .7 }] },
      options: { indexAxis: 'y', layout: { padding: { right: 28 } }, plugins: { legend: { display: false }, erlyMarks: { values: v => String(v) }, tooltip: { callbacks: { label: c => ` ${c.raw} student${c.raw === 1 ? '' : 's'}` } } },
        scales: { x: gridY({ beginAtZero: true, suggestedMax: Math.max(4, ...areaN) + 1, ticks: { color: TH.muted, precision: 0 } }), y: catAxis() } } });
    setTable('areas', ['Area', 'Students'], AREA_KEYS.map((a, i) => [AREA[a].label, areaN[i]]));

    // agenda
    const sched = S.filter(s => s.status === 'scheduled').sort((a, b) => a.slot - b.slot);
    $('#agenda').innerHTML = sched.map(s => `<li><span class="agenda__t"><b>${fmtD(day(s.slot)).split(' ')[0]}</b><small class="mono">${s.slotT}</small></span><button class="agenda__w" data-id="${s.id}">${avatar(s, 'avatar--sm')}<span><b>${esc(s.name)}</b><small class="muted">${s.ally ? 'with ' + s.ally : 'alone'} · intake pre-filled</small></span></button></li>`).join('') || '<li class="muted">Nothing scheduled yet.</li>';

    // impact — GPA the semester before vs after the plan started (bars start at 0)
    const done = S.filter(s => s.status === 'plan' && s.plan && s.gpa[s.plan] != null && s.gpa[s.plan - 1] != null);
    mk('impact', $('#cImpact'), { type: 'bar', data: { labels: done.map(s => s.name.split(' ')[0]), datasets: [
      { label: 'Semester before plan', data: done.map(s => s.gpa[s.plan - 1]), backgroundColor: alpha(TH.muted, .55), borderRadius: 4, borderSkipped: 'start', barPercentage: .8, categoryPercentage: .7 },
      { label: 'Semester after', data: done.map(s => s.gpa[s.plan]), backgroundColor: TH.R, borderRadius: 4, borderSkipped: 'start', barPercentage: .8, categoryPercentage: .7 }
    ] }, options: { plugins: { legend: { position: 'top' }, erlyMarks: { values: (v, i, di) => di === 1 ? (v - done[i].gpa[done[i].plan - 1] >= 0 ? '+' : '') + (v - done[i].gpa[done[i].plan - 1]).toFixed(1) : '' }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.raw.toFixed(1)}` } } },
      layout: { padding: { top: 16 } }, scales: { x: gridX({ ticks: { color: TH.ink2 } }), y: gridY({ min: 0, max: 4, ticks: { color: TH.muted, stepSize: 1 }, title: { display: true, text: 'GPA', color: TH.muted } }) } } });
    setTable('impact', ['Student', 'Before', 'After', 'Change'], done.map(s => [s.name, s.gpa[s.plan - 1].toFixed(1), s.gpa[s.plan].toFixed(1), (s.gpa[s.plan] - s.gpa[s.plan - 1] >= 0 ? '+' : '') + (s.gpa[s.plan] - s.gpa[s.plan - 1]).toFixed(1)]));
    $$('[data-chart-card] .chart-table').forEach(t => { if (!t.hidden) t.innerHTML = TABLES[t.closest('[data-chart-card]').dataset.chartCard] || ''; });
  }

  /* ---------- board ---------- */
  let areaF = null;
  function renderBoard() {
    $('#areaFilter').innerHTML = [['all', 'All'], ...AREA_KEYS.map(k => [k, AREA[k].label]), ['self', 'Self-referral']].map(([k, l]) => `<button class="chip ${(areaF || 'all') === k ? 'is-on' : ''}" data-f="${k}">${l}</button>`).join('');
    const list = filtered().filter(s => !areaF || (areaF === 'self' ? !s.fx : s.areas.includes(areaF)));
    $('#board').innerHTML = ORDER.map(st => {
      const colS = list.filter(s => s.status === st);
      return `<div class="col col--${st}"><div class="col__head"><span class="st st--${st}">${STATUS[st]}</span><b class="mono">${colS.length}</b></div>
        ${colS.map((s, i) => `<article class="tcard" data-id="${s.id}" style="--i:${i}">
          <div class="tcard__top">${avatar(s)}<div><b>${esc(s.name)}${live(s)}</b><small class="muted">${s.prog} · Y${s.year}</small></div></div>
          <div class="tcard__tags">${areaTags(s)}</div>
          ${s.confirmed ? `<p class="tcard__conf">${ICON('check')} ${esc(s.confirmed)}</p>` : ''}
          ${s.status === 'scheduled' ? `<p class="tcard__meta">${ICON('calendar')} ${fmtD(day(s.slot))} · ${s.slotT}${s.ally ? ' · with ' + s.ally.split(' ')[0] : ''}</p>` : `<p class="tcard__meta muted">${s.via} · ${ago(s.req)}</p>`}
          ${st !== 'plan' ? `<button class="tcard__next" data-next="${s.id}">${st === 'new' ? 'Schedule →' : st === 'scheduled' ? 'Record outcome →' : 'Create plan →'}</button>` : ''}
        </article>`).join('') || '<p class="col__empty muted small">Nothing here</p>'}</div>`;
    }).join('');
  }
  $('#areaFilter').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { areaF = b.dataset.f === 'all' ? null : b.dataset.f; renderBoard(); } });

  const OUTCOMES = ['Dyslexia', 'ADHD (inattentive)', 'ADHD (combined)', 'Dyscalculia', 'Anxiety — counselling referral', 'No learning disability — English language support', 'No learning disability — study skills support'];
  function advance(s, outcome) {
    if (s.status === 'new') { s.status = 'scheduled'; s.slot = 2; s.slotT = '11:00'; toast(`Scheduled ${s.name.split(' ')[0]} for ${fmtD(day(2))}, 11:00. Student notified.`); }
    else if (s.status === 'scheduled') { s.status = 'assessed'; s.confirmed = outcome || 'Assessment complete'; toast(`${s.name.split(' ')[0]}: assessment outcome recorded.`); }
    else if (s.status === 'assessed') { s.status = 'plan'; s.plan = 4; s.accom = s.accom || defaultAccom(s.confirmed); toast(`Support plan created for ${s.name.split(' ')[0]}. Starts next semester.`); }
  }
  function defaultAccom(c) {
    if (/dyslexia/i.test(c)) return ['25% extra time', 'Text-to-speech in exams', 'Readings in advance'];
    if (/adhd/i.test(c)) return ['Distraction-reduced exam room', 'Extensions by arrangement'];
    if (/dyscalculia/i.test(c)) return ['Calculator in exams', 'Formula sheets'];
    if (/english/i.test(c)) return ['English writing centre', 'Course glossaries'];
    if (/anxiety|counselling/i.test(c)) return ['Counselling sessions', 'Planned rest days'];
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
      setTimeout(() => { advance(s); renderBoard(); const moved = $(`.tcard[data-id="${s.id}"]`); if (moved) moved.classList.add('is-arrived'); }, reduce ? 0 : 320);
      return;
    }
    const c = e.target.closest('.tcard');
    if (c) openDrawer(S.find(x => x.id === c.dataset.id));
  });

  /* ---------- students ---------- */
  function gpaLine(key, canvas, s, mini) {
    const has = s.gpa.some(v => v != null);
    return mk(key, canvas, { type: 'line', data: { labels: SEM, datasets: [{ label: 'GPA', data: s.gpa, borderColor: TH.R, backgroundColor: TH.R, borderWidth: 2, pointRadius: mini ? 3 : 4, pointHoverRadius: 6, pointBorderColor: TH.surface, pointBorderWidth: 2, spanGaps: false, cubicInterpolationMode: 'monotone' }] },
      options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, erlyMarks: s.plan && s.plan < 4 && has ? { vline: { at: s.plan, label: 'support plan' } } : {}, tooltip: { displayColors: false, callbacks: { title: it => it[0].label === 'Fall 26*' ? 'Fall 26 (mid-term)' : it[0].label, label: c => c.raw == null ? 'not enrolled' : 'GPA ' + c.raw.toFixed(1) } } },
        scales: { x: mini ? { display: true, grid: { display: false }, border: { display: false }, ticks: { color: TH.muted, font: { size: 10 } } } : gridX(), y: mini ? { display: false, min: 2, max: 4 } : gridY({ min: 2, max: 4, ticks: { color: TH.muted, stepSize: .5, callback: v => v.toFixed(1) }, title: { display: true, text: 'GPA (axis from 2.0)', color: TH.muted } }) } } });
  }
  function renderStudents() {
    killCharts('stu-');
    const list = filtered();
    $('#stuGrid').innerHTML = list.map((s, i) => {
      const g = s.gpa.filter(v => v != null), o = s.on.filter(v => v != null);
      const pre = s.plan && s.plan < 4 ? s.gpa[s.plan - 1] : null, post = s.plan && s.plan < 4 ? s.gpa[s.plan] : null;
      return `<article class="stu" data-id="${s.id}" style="--i:${i}" tabindex="0">
        <div class="stu__top">${avatar(s)}<div><b>${esc(s.name)}${live(s)}</b><small class="muted">${s.prog} · Year ${s.year}</small></div><span class="st st--${s.status}">${STATUS[s.status]}</span></div>
        <div class="tcard__tags">${areaTags(s)}</div>
        ${s.confirmed ? `<p class="tcard__conf">${ICON('check')} ${esc(s.confirmed)}</p>` : `<p class="tcard__meta muted">Not yet assessed — ERLY flags only</p>`}
        <div class="stu__chart"><canvas id="sc-${s.id}" aria-label="GPA by semester for ${esc(s.name)}"></canvas></div>
        <div class="stu__nums"><span><small>GPA now</small><b class="mono">${g[g.length - 1].toFixed(1)}</b></span><span><small>On time</small><b class="mono">${o[o.length - 1]}%</b></span>${pre != null && post != null ? `<span><small>Since plan</small><b class="mono ${post >= pre ? 'up' : 'down'}">${post >= pre ? '+' : ''}${(post - pre).toFixed(1)}</b></span>` : ''}</div>
      </article>`;
    }).join('') || '<p class="muted">No students match.</p>';
    list.forEach(s => gpaLine('stu-' + s.id, $('#sc-' + s.id), s, true));
  }
  $('#stuGrid').addEventListener('click', e => { const c = e.target.closest('.stu'); if (c) openDrawer(S.find(x => x.id === c.dataset.id)); });
  $('#stuGrid').addEventListener('keydown', e => { if (e.key === 'Enter') { const c = e.target.closest('.stu'); if (c) openDrawer(S.find(x => x.id === c.dataset.id)); } });
  document.addEventListener('click', e => { const r = e.target.closest('.req, .agenda__w'); if (r) openDrawer(S.find(x => x.id === r.dataset.id)); });

  /* ---------- cohort ---------- */
  const FUNNEL = [['Signed a Support Pact', 1840], ['Completed 28 days', 1612], ['Insight (3+ domains)', 236], ['Booked SAS', 118], ['Assessed', 87], ['Support plan', 63]];
  const LANG = [['Both languages', 37], ['English only', 41], ['Arabic only', 6], ['Not reading-related', 16]];
  const WEEKLY = { reading: [0, 0, 0, 6, 7, 8, 5, 9, 10, 9], language: [0, 0, 0, 5, 6, 6, 4, 7, 7, 8], executive: [0, 0, 0, 4, 5, 7, 4, 8, 9, 11], strain: [0, 0, 0, 3, 3, 4, 3, 5, 6, 7] };
  function renderCohort() {
    const fc = TH.R;
    mk('funnel', $('#cFunnel'), { type: 'bar', data: { labels: FUNNEL.map(f => f[0]), datasets: [{ label: 'Students', data: FUNNEL.map(f => f[1]), backgroundColor: FUNNEL.map((_, i) => i < 2 ? alpha(fc, .45) : fc), borderRadius: 4, borderSkipped: 'start', barPercentage: .75 }] },
      options: { indexAxis: 'y', layout: { padding: { right: 92 } }, plugins: { legend: { display: false }, erlyMarks: { values: (v, i) => v.toLocaleString('en-US') + (i ? `  ·  ${Math.round(v / FUNNEL[i - 1][1] * 100)}%` : '') }, tooltip: { callbacks: { label: c => ` ${c.raw.toLocaleString('en-US')} students`, afterLabel: c => c.dataIndex ? ` ${Math.round(c.raw / FUNNEL[c.dataIndex - 1][1] * 100)}% of “${FUNNEL[c.dataIndex - 1][0]}”` : '' } } },
        scales: { x: gridY({ beginAtZero: true, max: 2000, ticks: { color: TH.muted, stepSize: 500, maxRotation: 0, callback: v => v.toLocaleString('en-US') }, title: { display: true, text: 'students', color: TH.muted } }), y: catAxis() } } });
    setTable('funnel', ['Step', 'Students', '% of step before'], FUNNEL.map((f, i) => [f[0], f[1].toLocaleString('en-US'), i ? Math.round(f[1] / FUNNEL[i - 1][1] * 100) + '%' : '—']));

    const lc = ['R', 'L', 'W', 'T'].map(k => TH[k]);
    mk('lang', $('#cLang'), { type: 'bar', data: { labels: ['Flagged students'], datasets: LANG.map((l, i) => ({ label: l[0], data: [l[1]], backgroundColor: lc[i], borderColor: TH.surface, borderWidth: { left: i ? 2 : 0, right: 0, top: 0, bottom: 0 }, borderSkipped: false, barPercentage: 1, categoryPercentage: .9 })) },
      options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.raw}%` } } }, scales: { x: { stacked: true, display: false, max: 100 }, y: { stacked: true, display: false } } } });
    $('#lLang').innerHTML = LANG.map((l, i) => `<li><i style="background:${lc[i]}"></i><span>${l[0]}</span><b class="mono">${l[1]}%</b></li>`).join('');
    setTable('lang', ['Where friction appeared', 'Share of flagged students'], LANG.map(l => [l[0], l[1] + '%']));

    mk('weekly', $('#cWeekly'), { type: 'line', data: { labels: WEEKS, datasets: AREA_KEYS.map(a => ({ label: AREA[a].label, data: WEEKLY[a].map((v, i) => i < 3 ? null : v), borderColor: areaColor(a), backgroundColor: areaColor(a), borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBorderColor: TH.surface, pointBorderWidth: 2, cubicInterpolationMode: 'monotone' })) },
      options: { interaction: { mode: 'index', intersect: false }, layout: { padding: { right: narrow() ? 4 : 150 } }, plugins: { legend: { position: 'top' }, erlyMarks: { endLabels: !narrow(), bands: [{ from: 0, to: 2, label: 'learning each student\'s normal' }, { from: 6, to: 6, label: 'Midterms · Exam Mode' }] }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.raw}%` } } },
        scales: { x: gridX(), y: gridY({ beginAtZero: true, max: 15, ticks: { color: TH.muted, stepSize: 5, callback: v => v + '%' } }) } } });
    setTable('weekly', ['Week', ...AREA_KEYS.map(a => AREA[a].label)], WEEKS.map((w, i) => [w, ...AREA_KEYS.map(a => i < 3 ? 'learning normal' : WEEKLY[a][i] + '%')]));

    const COURSES = ['MECH 210', 'CHEM 101', 'ENGL 102', 'MATH 201', 'BIOL 110', 'ARAB 101'];
    const HEAT = COURSES.map(c => Array.from({ length: 10 }, (_, w) => { let v = .06 + hash(c + w) * .14; if (c === 'MECH 210' && w === 3) v = .42; if (c === 'ENGL 102' && w === 6) v = .31; return { v: Math.min(.5, v), sup: c === 'ARAB 101' && w % 3 !== 0 }; }));
    $('#heat').innerHTML = `<div class="heat__row"><span></span>${Array.from({ length: 10 }, (_, w) => `<span class="heat__h">W${w + 1}</span>`).join('')}</div>` + COURSES.map((c, ci) => `<div class="heat__row"><span>${c}</span>${HEAT[ci].map((x, w) => x.sup ? '<span class="hc hc--sup" title="Fewer than 10 consenting students — hidden"></span>' : `<button class="hc ${x.v > .3 ? 'is-hot' : ''}" style="--v:${(x.v * 2).toFixed(2)}" data-c="${c}" data-w="${w}" data-v="${x.v.toFixed(2)}" title="${c} · week ${w + 1}: ${Math.round(x.v * 100)}%">${Math.round(x.v * 100)}</button>`).join('')}</div>`).join('');
  }
  $('#heat').addEventListener('click', e => {
    const b = e.target.closest('button.hc'); if (!b) return;
    const v = +b.dataset.v, p = Math.round(v * 100), n = $('#nudge');
    n.hidden = false;
    n.innerHTML = v < .25 ? `<div><h4>${b.dataset.c} · week ${+b.dataset.w + 1}: ${p}%</h4><p>Within the usual range for this course. No nudge needed.</p></div>`
      : `<div><h4>Curriculum Mirror → ${b.dataset.c} instructor</h4><p>“About ${p}% of consenting students showed unusually high reading friction on the week ${+b.dataset.w + 1} reading. It may be text-dense — here's a one-page visual summary and an audio version to share.”</p><div class="chips"><span class="chip">visual summary</span><span class="chip">audio · 11 min</span><span class="chip">no student names</span></div></div><button class="btn btn--sm btn--accent" id="sendNudge">Send nudge</button>`;
    const sn = $('#sendNudge'); if (sn) sn.onclick = () => { sn.disabled = true; sn.textContent = 'Sent'; toast('Nudge sent — the problem might be the PDF, not the students.'); };
  });

  /* ---------- SAS Bridge Letter (accommodation drafter) ---------- */
  function bridgeLetter(s) {
    const c = s.confirmed || '';
    const prof = s.fx ? s.fx.flagged.map(a => ({ reading: 'persistent visual-decoding friction', executive: 'deadline-proximity paralysis and abandoned submissions', strain: 'a sudden broad drop in study endurance', language: 'reading friction on English-language material only' }[a])).join(' and ') : 'the difficulties I described at intake';
    const asks = defaultAccom(c).concat(/dyslexia/i.test(c) ? ['Course readings released one week in advance'] : /adhd/i.test(c) ? ['Assignment briefs broken into dated milestones'] : []);
    return `Dear Student Accessibility Services,

Based on my clinically confirmed outcome (${c}) and ERLY's record of ${prof}, measured only against my own baseline, I am formally requesting:
${asks.map(a => '  • ' + a).join('\n')}

Kind regards,
${s.name.replace(' (you)', '')} · ${s.id}`;
  }

  /* ---------- drawer ---------- */
  const drawer = $('#drawer'), scrim = $('#scrim');
  let open = null;
  function openDrawer(s, ask, keepScroll) {
    if (!s) return;
    open = { s, ask };
    const top = keepScroll ? drawer.scrollTop : 0;
    killCharts('dr-');
    const step = ORDER.indexOf(s.status), fx = s.fx;
    const topInd = fx ? fx.per.filter(p => p.up > 0).sort((a, b) => b.up - a.up || a.id.localeCompare(b.id)).slice(0, 8) : [];
    drawer.innerHTML = `
      <div class="dr__head">${avatar(s, 'avatar--xl')}<div><h3>${esc(s.name)}${live(s)}</h3><p class="muted">${s.prog} · Year ${s.year} · ID ${s.id}</p><p class="small muted">Shared via ${s.via} · requested ${ago(s.req)}${s.ally ? ' · ally: ' + s.ally : ''}</p></div><button class="icon-btn" id="drClose" aria-label="Close">${ICON('x')}</button></div>
      <ol class="dr__steps">${ORDER.map((o, i) => `<li class="${i < step ? 'is-done' : i === step ? 'is-on' : ''}" style="--i:${i}"><i></i><span>${STATUS[o]}</span></li>`).join('')}</ol>

      ${fx && fx.crisis ? `<div class="dr__crisis">${ICON('hand')}<div><b>Profile C · crisis fork</b><span>A sudden drop across ${fx.dims.length} of ${DK.length} domains. Route to a counsellor first — ERLY offered this student no tools.</span></div></div>` : ''}
      <section class="dr__sec">
        <h4>${s.confirmed ? 'Assessment outcome' : 'What ERLY flagged'} ${s.confirmed ? '' : '<span class="honesty honesty--sim">screening only</span>'}</h4>
        ${s.confirmed ? `<div class="conf-card"><span class="conf-card__ic">${ICON('stetho')}</span><div><b>${esc(s.confirmed)}</b><small class="muted">Confirmed by professional assessment at SAS</small></div></div>` : ''}
        ${s.areas.length ? `<div class="dr__areas">${s.areas.map(a => `<div class="dr__area" style="--c:var(--c-${AREA[a].cat})"><div class="dr__illo">${ILLO[a]}</div><div><span class="atag" style="--c:var(--c-${AREA[a].cat})">${AREA[a].icon}${AREA[a].label}</span><p>${FEEL[a]}</p><p class="small muted">${fx.areas[a].persistent} of ${fx.areas[a].n} indicators above normal on ≥ half of watched days · average ${pct(fx.areas[a].score)}</p></div></div>`).join('')}</div>`
          : fx ? `<div class="conf-card"><span class="conf-card__ic">${ICON('check')}</span><div><b>No area persisted</b><small class="muted">The student shared a steady month and asked to talk anyway.</small></div></div>`
          : `<div class="conf-card"><span class="conf-card__ic">${ICON('hand')}</span><div><b>Self-referral — no tracking</b><small class="muted">The student chose to come straight to SAS. Their words are below.</small></div></div>`}
      </section>

      ${ask ? `<section class="dr__sec dr__outcome"><h4>Record assessment outcome</h4><div class="outcomes">${OUTCOMES.map(o => `<button class="chip" data-out="${o}">${o}</button>`).join('')}</div></section>` : ''}

      ${fx ? `<section class="dr__sec">
        <h4>Evidence card <span class="mono muted small">convergence: ${fx.dims.length}/${DK.length} domains · ${fx.dims.length >= 3 ? 'rule met' : 'rule not met'}</span></h4>
        <div class="sig4 sig4--dr">${fx.signals.map(g => `<div class="sig4__c ${g.on ? 'is-on' : ''}"><small class="mono">${g.id}</small><b>${esc(g.en)}</b><span>${g.on ? 'persisted' : 'steady'}</span></div>`).join('')}</div>
        <p class="panel__h mono">Three contributing signals the student saw first</p>
        <ol class="ev3">${fx.top3.map(p => `<li><span class="mono">${p.id}</span><b>${esc(p.en)}</b><em class="mono">${p.up}/${fx.judged} days</em></li>`).join('')}</ol>
      </section>
      <section class="dr__sec">
        <div class="dr__h"><h4>Domains</h4><button class="tbl-btn" data-table="dr-cats">Table</button></div>
        <p class="dcard__sub">Indicators per domain that stayed above this student's own normal on ≥ half of watched days (15–28) · a domain persists at 3+ · coloured by the profile it feeds</p>
        <div class="chart-box chart-box--md"><canvas id="drCats" role="img" aria-label="Category scores"></canvas></div>
        <div class="chart-table" hidden></div>
      </section>
      <section class="dr__sec">
        <div class="dr__h"><h4>The month, day by day</h4><button class="tbl-btn" data-table="dr-days">Table</button></div>
        <p class="dcard__sub">Indicators above normal each day, by profile · days 1–14 are the blind fortnight · exam days never count</p>
        <div class="chart-box chart-box--md"><canvas id="drDays" role="img" aria-label="Stacked bars of indicators above normal per day"></canvas></div>
        <div class="chart-table" hidden></div>
      </section>
      <section class="dr__sec">
        <h4>Indicators that stood out <span class="mono muted small">${fx.per.filter(p => p.frac >= .5).length} of ${fx.per.length} above normal on ≥ half of watched days</span></h4>
        <div class="itable">${topInd.map(p => `<div class="itable__r ${p.frac >= .5 ? 'is-flag' : ''}" style="--c:${{ reading: 'var(--c-R)', executive: 'var(--c-L)', strain: 'var(--c-W)' }[p.area] || 'var(--muted)'}"><span class="mono itable__id">${p.id}</span><span class="itable__n"><b>${esc(p.en)}</b><small>${p.id[0]} · ${esc(CATS[p.cat].en)} · ${p.live ? 'Reading Studio' : 'LMS'}</small></span><span class="itable__bar" title="${p.up} of ${fx.judged} judged days">${Array.from({ length: fx.judged }, (_, k) => `<i class="${k < p.up ? 'is-on' : ''}"></i>`).join('')}</span><b class="mono">${p.up}/${fx.judged}</b></div>`).join('')}</div>
        ${s.dw && s.dw[1] != null ? `<p class="panel__h mono" style="margin-top:16px">Per-language baselines · dwell vs. expected</p><div class="lgap">${[['English pages', s.dw[0]], ['Arabic pages', s.dw[1]]].map(([l, v]) => `<div class="lgap__row"><span>${l}</span><span class="lgap__bar"><i style="--w:${Math.min(100, v / 3 * 100)}%"></i></span><b class="mono">${v.toFixed(1)}×</b></div>`).join('')}</div><p class="small muted">${s.dw[0] / s.dw[1] > 1.5 ? 'Much heavier in English only — consider second-language load before decoding.' : 'Similar in both languages — friction is not only about English.'}</p>` : ''}
        <p class="small muted">Screening indicators only. LMS-side values are synthetic in this demo.</p>
      </section>` : ''}

      <section class="dr__sec">
        <div class="dr__h"><h4>Performance</h4><button class="tbl-btn" data-table="dr-perf">Table</button></div>
        <p class="dcard__sub">Two separate scales, so two charts · * Fall 26 is mid-term</p>
        <div class="chart-box"><div class="perf2"><div><p class="panel__h mono">GPA</p><div class="chart-box--sm2"><canvas id="drGpa" role="img" aria-label="GPA by semester"></canvas></div></div><div><p class="panel__h mono">On-time submissions</p><div class="chart-box--sm2"><canvas id="drOn" role="img" aria-label="On-time submission percentage by semester"></canvas></div></div></div></div>
        <div class="chart-table" hidden></div>
      </section>

      <section class="dr__sec">
        <h4>Evidence Pack · student notes</h4>
        <blockquote class="dr__note">${esc(s.note)}</blockquote>
        ${s.accom ? `<p class="panel__h mono">Accommodations ${s.plan === 4 ? 'from next semester' : 'in place'}</p><div class="chips">${s.accom.map(a => `<span class="chip is-on">${esc(a)}</span>`).join('')}</div>` : ''}
      </section>
      ${s.confirmed ? `<section class="dr__sec">
        <div class="dr__h"><h4>SAS Bridge Letter</h4><button class="tbl-btn" id="drCopyL">Copy</button></div>
        <p class="dcard__sub">Accommodation request drafted on the student’s device from their confirmed outcome and friction profile. The student edits and sends it.</p>
        <textarea class="ho-letter dr__letter" id="drLetter" spellcheck="true">${esc(bridgeLetter(s))}</textarea>
      </section>` : ''}

      <div class="dr__actions">
        ${s.status !== 'plan' ? `<button class="btn btn--accent" id="drNext">${s.status === 'new' ? 'Schedule appointment' : s.status === 'scheduled' ? 'Record outcome' : 'Create support plan'}</button>` : ''}
        <button class="btn btn--ghost" id="drMsg">Message student</button>
        <button class="btn btn--quiet" id="drPack">Download Evidence Pack</button>
      </div>
      <p class="small muted dr__priv">${ICON('lock')} Shared by the student. Raw tracking data was deleted on day 28 — this is the summary they approved.</p>`;
    if (!drawer.classList.contains('is-open')) {
      drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false');
      scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add('is-on'));
    }
    drawer.scrollTop = top;
    requestAnimationFrame(() => setTimeout(() => { $$('.lgap__bar i', drawer).forEach(i => i.style.width = i.style.getPropertyValue('--w')); drawer.classList.add('is-drawn'); }, 120));

    // charts — built after the drawer is laid out
    const build = () => {
      if (fx) {
        const sc = DK.map(c => fx.catsN[c] || 0);
        mk('dr-cats', $('#drCats'), { type: 'bar', data: { labels: DK.map(catLabel), datasets: [{ label: 'Days above normal', data: sc, backgroundColor: DK.map(domColor), borderRadius: 4, borderSkipped: 'start', barPercentage: .72 }] },
          options: { indexAxis: 'y', layout: { padding: { right: 36, top: 24 } }, plugins: { legend: { display: false }, erlyMarks: { values: v => v + '/10', ref: { value: 3, label: 'persists at 3+' } }, tooltip: { callbacks: { label: c => ` ${c.raw} of 10 indicators above normal on ≥ half of watched days` } } },
            scales: { x: gridY({ min: 0, max: 10, ticks: { color: TH.muted, stepSize: 2 } }), y: catAxis() } } });
        setTable('dr-cats', ['Domain', 'Indicators that persisted', 'Domain persisted (3+)'], DK.map((c, i) => [CATS[c].en, sc[i] + ' / 10', sc[i] >= 3 ? 'yes' : 'no']));

        const labels = fx.daily.map(d => 'Day ' + d.n);
        const PA = ['reading', 'executive', 'strain'];
        mk('dr-days', $('#drDays'), { type: 'bar', data: { labels, datasets: PA.map(a => ({ label: 'Profile ' + AREA[a].profile + ' · ' + AREA[a].label, data: fx.daily.map(d => (d.byArea || {})[a] || 0), backgroundColor: areaColor(a), borderColor: TH.surface, borderWidth: { top: 2, left: 0, right: 0, bottom: 0 }, borderSkipped: 'start', barPercentage: .78 })) },
          options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, erlyMarks: { bands: [{ from: 0, to: CAL - 1, label: 'blind fortnight · learning normal' }, { from: EXAM[0] - 1, to: EXAM[EXAM.length - 1] - 1, label: 'exam' }] }, tooltip: { filter: it => it.raw > 0, callbacks: { title: it => it[0].label + (it[0].dataIndex < CAL ? ' · blind fortnight' : EXAM.includes(it[0].dataIndex + 1) ? ' · Exam Mode' : ''), footer: it => 'Total: ' + it.reduce((a, b) => a + b.raw, 0) + ' indicators' } } },
            scales: { x: gridX({ stacked: true, ticks: { color: TH.muted, autoSkip: false, callback: (v, i) => (i + 1) % 7 === 1 || i === DAYS - 1 ? i + 1 : '' } }), y: gridY({ stacked: true, beginAtZero: true, ticks: { color: TH.muted, precision: 0 }, title: { display: true, text: 'indicators above normal', color: TH.muted } }) } } });
        setTable('dr-days', ['Day', ...PA.map(a => AREA[a].label), 'Total'], fx.daily.map(d => [d.n <= CAL ? `${d.n} (blind)` : d.exam ? `${d.n} (exam)` : d.n, ...PA.map(a => (d.byArea || {})[a] || 0), PA.reduce((x, a) => x + ((d.byArea || {})[a] || 0), 0)]));
      }
      gpaLine('dr-gpa', $('#drGpa'), s, false);
      mk('dr-on', $('#drOn'), { type: 'bar', data: { labels: SEM, datasets: [{ label: 'On time', data: s.on, backgroundColor: SEM.map((_, i) => s.plan && i >= s.plan ? TH.good : TH.line2), borderRadius: 4, borderSkipped: 'start', barPercentage: .6 }] },
        options: { layout: { padding: { top: 16 } }, plugins: { legend: { display: false }, erlyMarks: { values: v => v + '%' }, tooltip: { displayColors: false, callbacks: { label: c => c.raw == null ? 'not enrolled' : c.raw + '% on time' } } },
          scales: { x: gridX(), y: gridY({ min: 0, max: 100, ticks: { color: TH.muted, stepSize: 25, callback: v => v + '%' } }) } } });
      setTable('dr-perf', ['Semester', 'GPA', 'On-time submissions', 'Support plan'], SEM.map((l, i) => [l === 'Fall 26*' ? 'Fall 26 (mid-term)' : l, s.gpa[i] == null ? '—' : s.gpa[i].toFixed(1), s.on[i] == null ? '—' : s.on[i] + '%', s.plan && i >= s.plan ? 'yes' : 'no']));
    };
    setTimeout(build, keepScroll || reduce ? 0 : 260);

    $('#drClose').onclick = closeDrawer;
    const nx = $('#drNext');
    if (nx) nx.onclick = () => {
      if (s.status === 'scheduled' && !ask) return openDrawer(s, true);
      if (s.status === 'scheduled') { $('.dr__outcome').scrollIntoView({ behavior: 'smooth' }); return; }
      advance(s); refresh(); openDrawer(s);
    };
    $$('[data-out]', drawer).forEach(b => b.onclick = () => { advance(s, b.dataset.out); refresh(); openDrawer(s); });
    const cl = $('#drCopyL'); if (cl) cl.onclick = () => { const t = $('#drLetter'); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Letter copied.')).catch(() => { t.select(); document.execCommand('copy'); toast('Letter copied.'); }); };
    $('#drMsg').onclick = () => toast(`Message sent to ${s.name.split(' ')[0]} through the portal.`);
    $('#drPack').onclick = () => toast('Evidence Pack downloaded (synthetic).');
  }
  function closeDrawer() {
    if (!open) return;
    open = null;
    drawer.classList.remove('is-open', 'is-drawn'); drawer.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('is-on'); setTimeout(() => { scrim.hidden = true; killCharts('dr-'); }, 300);
  }
  scrim.addEventListener('click', closeDrawer);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  function refresh() { render($('.view.is-on').dataset.view); }
  function render(v) {
    if (v !== 'students') killCharts('stu-');
    if (v === 'overview') renderOverview();
    else if (v === 'requests') { renderBoard(); $('#newBadge').textContent = S.filter(s => s.status === 'new').length; }
    else if (v === 'students') renderStudents();
    else if (v === 'cohort') renderCohort();
    else if (v === 'faculty') renderFaculty();
  }
  /* ---------- faculty referrals (shared from the Faculty portal) ---------- */
  function renderFaculty() {
    const C = window.CAMPUS; if (!C) return;
    const D = C.load();
    const refs = D.refs.slice().sort((a, b) => b.at - a.at);
    $('#facRefs').innerHTML = refs.length ? `<div class="fac-list fac-list--big">${refs.map((r, i) => {
      const s = C.STUDENTS.find(x => x.id === r.stu), obs = D.obs.filter(o => r.obs.includes(o.id));
      const areas = C.obsAreas(D, s.id), att = C.COURSES.filter(c => c.students.includes(s.id)).map(c => C.attendance(D, c.id, s.id).rate);
      const avgAtt = att.length ? Math.round(att.reduce((a, b) => a + b, 0) / att.length * 100) : null;
      return `<div class="fac-ref fac-ref--sas" style="--i:${i}"><span class="avatar avatar--hue" style="--h:${s.hue}">${esc(s.init)}</span>
        <div><b>${esc(s.name)}</b><small>${s.id} · ${esc(s.stream)} · referred by ${esc(r.by)} · ${fmtD(new Date(r.at))}${avgAtt != null ? ' · attendance ' + avgAtt + '%' : ''}</small>
          <div class="fac-signs" style="margin-top:8px">${Object.keys(areas).map(a => `<span class="fac-sign fac-sign--${a}">${esc(C.AREA_NAME[a])} · ${areas[a]}</span>`).join('')}</div>
          ${obs.map(o => `<p><b>${esc(C.COURSES.find(c => c.id === o.course).code)}</b> — ${o.signs.map(id => esc(C.SIGNS.find(x => x.id === id).en)).join(' · ')}${o.note ? `<br><span class="muted">“${esc(o.note)}”</span>` : ''}</p>`).join('')}
        </div>
        <div class="fac-ref__act"><span class="st st--${r.status === 'acknowledged' ? 'scheduled' : 'new'}">${r.status === 'acknowledged' ? 'Acknowledged' : 'New'}</span>${r.status !== 'acknowledged' ? `<button class="btn btn--xs btn--accent" data-ack="${r.id}">Acknowledge &amp; invite student</button>` : ''}</div></div>`;
    }).join('')}</div><p class="muted small">Faculty observations describe what teachers saw in class. They are a reason to reach out — not evidence of a disability on their own. Combine them with the student’s own account and ERLY data the student chooses to share.</p>` : '<p class="muted">No faculty referrals yet.</p>';
    $('#facRefs').onclick = e => {
      const b = e.target.closest('[data-ack]'); if (!b) return;
      const r = D.refs.find(x => x.id === b.dataset.ack); r.status = 'acknowledged'; C.save(D);
      toast('Acknowledged — an invitation to talk was sent to the student.'); renderFaculty(); facBadge();
    };
  }
  function facBadge() { const C = window.CAMPUS; if (!C) return; const n = C.load().refs.filter(r => r.status !== 'acknowledged').length; $('#facBadge').textContent = n; $('#facBadge').hidden = !n; }
  facBadge();
  try { if (sessionStorage.getItem('acubins-role') === 'university') $('#toUni').hidden = false; } catch (e) {}
  readTheme();
  render('overview');
  if (S[0].live) setTimeout(() => toast('A new request just came in from Acubins (you), built from your tracking on the student page.'), 900);
})();
