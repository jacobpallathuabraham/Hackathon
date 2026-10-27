/* Acubins University — Command Center. Campus KPIs, enrolment, attendance,
   the student-support pipeline and live faculty referrals, plus animated
   doors into the SAS Dashboard and the Faculty portal. Figures are a
   synthetic demo except referrals, which come from the Faculty portal. */
(function () {
  'use strict';
  const C = window.CAMPUS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const D = C.load();
  function countUp(el, to, fmt) { fmt = fmt || (v => Math.round(v).toLocaleString('en-US')); if (reduce) { el.textContent = fmt(to); return; } const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 1300), e = 1 - Math.pow(1 - k, 4); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(f); })(t0); }

  $('#uniDate').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · Fall 2026, week 10';
  $('#themeToggle').addEventListener('click', () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('erly-theme', n); } catch (e) {} drawCharts(); });
  $('#logoutBtn').addEventListener('click', signOut);
  function signOut() { try { sessionStorage.removeItem('acubins-role'); sessionStorage.setItem('acubins-bye', '1'); } catch (e) {} location.href = 'index.html'; }
  ['pSas', 'pFac', 'pStu', 'warpLogo'].forEach((id, i) => { $('#' + id).innerHTML = ICON(['counsel', 'cap', 'sparkle', 'counsel'][i]); });

  const total = C.COLLEGES.reduce((a, c) => a + c.students, 0);
  countUp($('#uniTotal'), total);
  const refs = D.refs.length, obs = D.obs.length;
  const K = [
    ['Students enrolled', total, v => Math.round(v).toLocaleString('en-US'), 'users', '+3.1% vs last year'],
    ['Faculty members', 412, null, 'cap', '38 new this year'],
    ['Average attendance', 91.4, v => v.toFixed(1) + '%', 'calendar', '+0.8 pts this month'],
    ['First-year retention', 88.6, v => v.toFixed(1) + '%', 'sprout', 'target 90%'],
    ['Active SAS cases', 186, null, 'counsel', `${refs} faculty referral${refs === 1 ? '' : 's'} open`],
    ['Classroom observations', obs, null, 'pen', 'from the Faculty portal']
  ];
  $('#overview').innerHTML = K.map(([l, n, f, ic, sub], i) => `<div class="uni-kpi" style="--i:${i}"><span class="uni-kpi__ic">${ICON(ic)}</span><small>${l}</small><b data-i="${i}">0</b><em>${esc(sub)}</em></div>`).join('');
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const i = +e.target.dataset.i; countUp(e.target, K[i][1], K[i][2]); io.unobserve(e.target); }), { threshold: .4 });
  $$('.uni-kpi b').forEach(b => io.observe(b));

  // support pipeline (synthetic term numbers + live faculty referrals)
  const FUN = [['ERLY Support Pacts signed', 1240], ['Early signals noticed', 312], ['Students chose to talk to SAS', 214], ['Assessed by SAS', 149], ['Support plans in place', 121]];
  $('#uFunnel').innerHTML = FUN.map(([l, n], i) => `<div class="uni-fstep" style="--w:${n / FUN[0][1]};--i:${i}"><span>${l}</span><b>${n.toLocaleString('en-US')}</b><i></i></div>`).join('') + `<p class="muted small">Every step is the student’s choice. Faculty can also refer — the student is always told.</p>`;
  $('#uRefs').innerHTML = D.refs.slice().sort((a, b) => b.at - a.at).map((r, i) => { const s = C.STUDENTS.find(x => x.id === r.stu); return `<div class="uni-ref" style="--i:${i}"><span class="avatar avatar--hue" style="--h:${s.hue}">${esc(s.init)}</span><div><b>${esc(s.name)}</b><small>${esc(r.by)} · ${new Date(r.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></div><span class="st st--${r.status === 'acknowledged' ? 'scheduled' : 'new'}">${r.status === 'acknowledged' ? 'Acknowledged' : 'New'}</span></div>`; }).join('') || '<p class="muted">No referrals yet.</p>';
  const RINGS = [['Registered People of Determination', 0.046, '4.6% of students'], ['Accommodation letters issued', 0.83, 'of registered students'], ['Exams with arrangements met', 0.97, 'on time this term'], ['Course materials accessible', 0.78, 'captioned / tagged']];
  $('#uRings').innerHTML = RINGS.map(([l, p, sub], i) => `<div class="uni-ring" style="--p:${Math.max(p, .04)};--i:${i}"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50"/><circle cx="60" cy="60" r="50" class="uni-ring__arc"/></svg><b>${Math.round(p * 1000) / 10}%</b><span>${l}</span><small>${sub}</small></div>`).join('');

  let charts = [];
  function drawCharts() {
    charts.forEach(c => c.destroy()); charts = [];
    const acc = css('--accent') || '#C1502B', teal = css('--teal') || '#0D7A6E', ink = css('--muted') || '#888';
    Chart.defaults.color = ink; Chart.defaults.font.family = 'Instrument Sans, sans-serif';
    charts.push(new Chart($('#uEnrol'), { type: 'bar', data: { labels: C.COLLEGES.map(c => c.name.replace('College of ', '')), datasets: [{ label: 'Students', data: C.COLLEGES.map(c => c.students), backgroundColor: C.COLLEGES.map(c => `hsl(${c.hue} 60% 55%)`), borderRadius: 10, barPercentage: .62 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: reduce ? 0 : 1200, easing: 'easeOutQuart' }, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(127,127,127,.12)' } }, x: { grid: { display: false } } } } }));
    const wk = Array.from({ length: 10 }, (_, i) => 'W' + (i + 1)), att = [94.2, 93.8, 93.1, 92.6, 92.4, 91.2, 86.9, 90.8, 91.5, 91.4];
    charts.push(new Chart($('#uAtt'), { type: 'line', data: { labels: wk, datasets: [{ label: 'Attendance %', data: att, borderColor: teal, backgroundColor: teal + '22', fill: true, tension: .4, pointRadius: 4, pointBackgroundColor: teal }, { label: 'Target', data: wk.map(() => 90), borderColor: acc, borderDash: [6, 6], pointRadius: 0, borderWidth: 1.5 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: reduce ? 0 : 1200 }, plugins: { legend: { position: 'bottom' } }, scales: { y: { min: 80, max: 100, ticks: { callback: v => v + '%' } } } } }));
  }
  drawCharts();
  addEventListener('accentchange', drawCharts);

  // the door into SAS / Faculty: a zoom-through warp
  document.addEventListener('click', e => {
    if (e.target.closest('[data-signout]')) { e.preventDefault(); return signOut(); }
    const a = e.target.closest('[data-portal]'); if (!a) return;
    e.preventDefault();
    const sas = a.dataset.portal === 'sas';
    const w = $('#warp'), r = a.getBoundingClientRect();
    w.style.setProperty('--x', (r.left + r.width / 2) + 'px'); w.style.setProperty('--y', (r.top + r.height / 2) + 'px');
    w.classList.toggle('is-teal', sas);
    $('#warpK').textContent = sas ? 'Student Accessibility Services' : 'Acubins University';
    $('#warpT').textContent = sas ? 'SAS Dashboard' : 'Faculty portal';
    $('#warpLogo').innerHTML = ICON(sas ? 'counsel' : 'cap');
    try { sessionStorage.setItem('acubins-portal-warp', '1'); } catch (err) {}
    if (reduce) { location.href = a.getAttribute('href'); return; }
    w.classList.add('is-on');
    setTimeout(() => { location.href = a.getAttribute('href'); }, 1000);
  });

  // a slow constellation of campus "nodes" behind the page
  const cv = $('#uniFx'), g = cv.getContext('2d');
  let W, H, pts = [];
  function size() { const dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); pts = Array.from({ length: Math.round(W / 26) }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 })); }
  size(); addEventListener('resize', () => { clearTimeout(size.t); size.t = setTimeout(size, 200); });
  (function loop() {
    g.clearRect(0, 0, W, H);
    const col = css('--accent') || '#C1502B';
    pts.forEach(p => { if (!reduce) { p.x += p.vx; p.y += p.vy; } if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; });
    g.strokeStyle = col; g.fillStyle = col;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 130) { g.globalAlpha = (1 - d / 130) * .16; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } }
    g.globalAlpha = .35; pts.forEach(p => { g.beginPath(); g.arc(p.x, p.y, 1.6, 0, 7); g.fill(); }); g.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(loop);
  })();
})();
