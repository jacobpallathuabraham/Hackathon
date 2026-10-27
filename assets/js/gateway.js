/* Acubins University — public website.
   Intro animation, scroll-driven motion, programme finder, admissions,
   scholarship estimator, news & events, working student-service demos,
   an interactive campus map, site search — and the two ways in:
   1) University login (university details) → the Command Center;
   2) sign-in for students, faculty and counselors (login.html).
   Front-end demo: the university account is checked in the browser. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const U = window.UNI;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const ACCOUNT = { user: 'university', pass: '2468' };
  const fmtD = d => new Date(d + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-on'), 2600); }

  /* ---------------- intro ---------------- */
  const intro = $('#intro');
  const seen = document.documentElement.classList.contains('no-intro');
  if (reduce || seen) { intro.remove(); document.body.classList.add('is-ready'); }
  else {
    try { sessionStorage.setItem('acu-seen-intro', '1'); } catch (e) {}
    setTimeout(() => intro.classList.add('is-out'), 1900);
    setTimeout(() => document.body.classList.add('is-ready'), 2100);
    setTimeout(() => intro.remove(), 3000);
  }

  /* ---------------- theme, nav, progress ---------------- */
  $('#themeToggle').addEventListener('click', () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('erly-theme', n); } catch (e) {} });
  const nav = $('#acuNav'), prog = $('#acuProg'), toTop = $('#toTop');
  let lastY = 0;
  function onScroll() {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    nav.classList.toggle('is-solid', y > 40);
    nav.classList.toggle('is-hidden', y > 500 && y > lastY && !nav.contains(document.activeElement));
    toTop.classList.toggle('is-on', y > 900);
    lastY = y;
    parallax(y); life();
  }
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  // mega menu
  const megaBtn = $('[data-mega]'), mega = $('.acu-mega');
  megaBtn.addEventListener('click', e => { e.stopPropagation(); const o = mega.hidden; mega.hidden = !o; megaBtn.setAttribute('aria-expanded', o); });
  document.addEventListener('click', e => { if (!mega.hidden && !mega.contains(e.target)) { mega.hidden = true; megaBtn.setAttribute('aria-expanded', 'false'); } });
  mega.addEventListener('click', e => { const a = e.target.closest('[data-filter]'); if (a) setLevel(a.dataset.filter); mega.hidden = true; });
  $('#burger').addEventListener('click', () => { const o = document.body.classList.toggle('nav-open'); $('#burger').setAttribute('aria-expanded', o); });
  $$('.acu-links a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('nav-open')));

  /* ---------------- hero ---------------- */
  // rotating words
  const rot = $$('#heroRot b'); let ri = 0;
  if (!reduce) setInterval(() => { rot[ri].classList.remove('is-on'); rot[ri].classList.add('is-off'); const prev = rot[ri]; setTimeout(() => prev.classList.remove('is-off'), 700); ri = (ri + 1) % rot.length; rot[ri].classList.add('is-on'); }, 2400);
  // skyline windows that light up
  const win = $('.sk-win');
  if (win) { let h = ''; for (let i = 0; i < 70; i++) { const x = 40 + Math.random() * 1360, y = 230 + Math.random() * 100; h += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="6" height="8" style="--d:${(Math.random() * 6).toFixed(2)}s"/>`; } win.innerHTML = h; }
  const sky = $('.acu-skyline'), heroIn = $('.acu-hero__in');
  function parallax(y) {
    if (reduce || y > innerHeight * 1.2) return;
    if (sky) sky.style.transform = `translateY(${y * 0.18}px)`;
    if (heroIn) { heroIn.style.transform = `translateY(${y * 0.32}px)`; heroIn.style.opacity = String(Math.max(0, 1 - y / (innerHeight * 0.75))); }
  }
  // drifting stars / dust
  const cv = $('#heroFx'), g = cv.getContext('2d');
  let W = 0, H = 0, dots = [];
  function size() { const dpr = Math.min(2, devicePixelRatio || 1); W = cv.offsetWidth; H = cv.offsetHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); dots = Array.from({ length: Math.round(W / 14) }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.7, r: Math.random() * 1.6 + .3, s: Math.random() * .25 + .05, p: Math.random() * 6 })); }
  size(); addEventListener('resize', () => { clearTimeout(size.t); size.t = setTimeout(size, 200); });
  let t0 = 0;
  (function loop(t) {
    g.clearRect(0, 0, W, H);
    dots.forEach(d => { if (!reduce) { d.x += d.s; if (d.x > W) d.x = 0; } g.globalAlpha = .35 + .35 * Math.sin(t / 900 + d.p); g.fillStyle = '#fff'; g.beginPath(); g.arc(d.x, d.y, d.r, 0, 7); g.fill(); });
    g.globalAlpha = 1;
    if (!reduce && (scrollY < innerHeight * 1.3 || !t0)) { t0 = 1; requestAnimationFrame(loop); } else if (!reduce) setTimeout(() => requestAnimationFrame(loop), 400);
  })(0);
  $('#tourBtn').addEventListener('click', () => openModal('tour'));

  /* ---------------- reveal on scroll ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  const watch = root => $$('.rv:not(.is-in)', root).forEach((el, i) => { if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', (i % 6) * 70 + 'ms'); io.observe(el); });

  /* ---------------- magnetic buttons, tilt, cursor ---------------- */
  if (fine && !reduce) {
    document.addEventListener('pointermove', e => {
      const m = e.target.closest('.acu-mag');
      $$('.acu-mag.is-mag').forEach(b => { if (b !== m) { b.classList.remove('is-mag'); b.style.transform = ''; } });
      if (m) { const r = m.getBoundingClientRect(); m.classList.add('is-mag'); m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .28}px)`; }
      const tl = e.target.closest('.acu-tilt');
      $$('.acu-tilt.is-tilt').forEach(c => { if (c !== tl) { c.classList.remove('is-tilt'); c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); } });
      if (tl && !tl.classList.contains('is-form')) { const r = tl.getBoundingClientRect(); tl.classList.add('is-tilt'); tl.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -6 + 'deg'); tl.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 8 + 'deg'); tl.style.setProperty('--mx', (e.clientX - r.left) + 'px'); tl.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
      document.body.classList.add('has-cursor');
      const c = $('#cursor'); c.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; c.classList.toggle('is-big', !!e.target.closest('a, button, input, select, textarea, summary, [data-b]'));
    }, { passive: true });
    document.addEventListener('pointerleave', () => document.body.classList.remove('has-cursor'));
  }

  /* ---------------- marquee + stats ---------------- */
  const partners = ['CAA Accredited', 'QS ★★★★★', 'AACSB Business', 'ABET Engineering', 'Abu Dhabi Dept. of Education & Knowledge', 'Cleveland Clinic Abu Dhabi', 'Masdar City', 'Mubadala', 'Etihad Aviation Training', 'ADNOC', 'Microsoft AI Lab', 'UNESCO Chair in Inclusive Education'];
  $('#marq').innerHTML = [...partners, ...partners].map(p => `<span>${esc(p)}</span>`).join('<i>✦</i>');
  const total = window.CAMPUS ? window.CAMPUS.COLLEGES.reduce((a, c) => a + c.students, 0) : 12480;
  const STATS = [[total, '', 'students from 90 countries'], [120, '+', 'degree programmes'], [412, '', 'faculty members'], [94, '%', 'graduates employed in 6 months'], [180, '+', 'student clubs'], [62, 'M', 'AED research funding']];
  $('#stats').innerHTML = STATS.map(([n, suf, l], i) => `<div class="acu-stat rv" style="--d:${i * 80}ms"><b data-n="${n}" data-s="${suf}">0${suf}</b><span>${l}</span></div>`).join('');
  const sio = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const b = e.target, to = +b.dataset.n, s = b.dataset.s; sio.unobserve(b); if (reduce) { b.textContent = to.toLocaleString('en-US') + s; return; } const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 1600), v = Math.round(to * (1 - Math.pow(1 - k, 4))); b.textContent = v.toLocaleString('en-US') + s; if (k < 1) requestAnimationFrame(f); })(t0); }), { threshold: .6 });
  $$('#stats b').forEach(b => sio.observe(b));

  /* ---------------- programmes ---------------- */
  let level = 'all', college = 'all', q = '';
  $('#colFilter').innerHTML = `<button class="is-on" data-col="all">All colleges</button>` + Object.entries(U.colleges).map(([k, n]) => `<button data-col="${k}">${esc(n)}</button>`).join('');
  const HUE = { eng: 210, cs: 15, bus: 45, med: 345, arts: 275 };
  function setLevel(lv) { level = lv; $$('#progTabs button').forEach(b => b.classList.toggle('is-on', b.dataset.lv === lv)); ink(); renderProgs(); }
  function ink() { const on = $('#progTabs .is-on'), i = $('.acu-tabs__ink'); if (on && i) { i.style.width = on.offsetWidth + 'px'; i.style.transform = `translateX(${on.offsetLeft}px)`; } }
  function renderProgs() {
    const list = U.programs.filter(p => (level === 'all' || p.level === level) && (college === 'all' || p.college === college) && (!q || (p.name + ' ' + p.blurb + ' ' + p.careers.join(' ') + ' ' + U.colleges[p.college]).toLowerCase().includes(q)));
    $('#progGrid').innerHTML = list.map((p, i) => `<button class="acu-prog" data-prog="${p.id}" style="--h:${HUE[p.college]};--i:${i}"><span class="acu-prog__lv mono">${p.level === 'ug' ? 'Undergraduate' : p.level === 'pg' ? 'Master’s' : 'Doctoral'} · ${p.deg}</span><b>${esc(p.name)}</b><small>${esc(U.colleges[p.college])}</small><p>${esc(p.blurb)}</p><span class="acu-prog__meta"><i>${p.years} yrs</i><i>${p.credits} credits</i><i>${esc(p.intake)}</i></span><span class="acu-prog__go">View programme →</span></button>`).join('');
    $('#progEmpty').hidden = list.length > 0;
  }
  $('#progTabs').addEventListener('click', e => { const b = e.target.closest('[data-lv]'); if (b) setLevel(b.dataset.lv); });
  $('#colFilter').addEventListener('click', e => { const b = e.target.closest('[data-col]'); if (!b) return; college = b.dataset.col; $$('#colFilter button').forEach(x => x.classList.toggle('is-on', x === b)); renderProgs(); });
  $('#progQ').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); renderProgs(); });
  $('#progGrid').addEventListener('click', e => { const b = e.target.closest('[data-prog]'); if (b) openModal('prog', b.dataset.prog); });
  renderProgs(); addEventListener('resize', ink); setTimeout(ink, 300);

  /* ---------------- admissions countdown ---------------- */
  const deadline = new Date(new Date().getFullYear(), 10, 30, 23, 59, 59);
  if (deadline < new Date()) deadline.setFullYear(deadline.getFullYear() + 1);
  function tick() {
    const ms = Math.max(0, deadline - new Date()), d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
    $('#countdown').innerHTML = `<span class="mono">Applications close in</span>` + [[d, 'days'], [h, 'hours'], [m, 'minutes'], [s, 'seconds']].map(([v, l]) => `<div><b>${String(v).padStart(2, '0')}</b><small>${l}</small></div>`).join('');
  }
  tick(); setInterval(tick, 1000);

  /* ---------------- scholarship estimator ---------------- */
  const FEES = { ug: 72000, pg: 88000, phd: 0 };
  $('#estProg').innerHTML = U.programs.filter(p => p.level !== 'phd').map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  $('#cProg').innerHTML = '<option>Not sure yet</option>' + U.programs.map(p => `<option>${esc(p.name)}</option>`).join('');
  function est() {
    const gpa = +$('#gpa').value, p = U.programs.find(x => x.id === $('#estProg').value);
    let pct = gpa >= 98 ? 100 : gpa >= 95 ? 75 : gpa >= 90 ? 50 : gpa >= 85 ? 25 : gpa >= 80 ? 10 : 0;
    if ($('#estSport').checked) pct += 15; if ($('#estSib').checked) pct += 10;
    pct = Math.min(100, pct);
    const fee = (p.id === 'med' ? 115000 : FEES[p.level]) * (1 - pct / 100);
    $('#gpaV').textContent = gpa + '%'; $('#estPct').textContent = pct + '%';
    $('#estFee').textContent = 'AED ' + Math.round(fee).toLocaleString('en-US');
    const C = 2 * Math.PI * 52, a = $('#estArc'); a.style.strokeDasharray = C; a.style.strokeDashoffset = C * (1 - pct / 100);
  }
  ['#gpa', '#estProg', '#estSport', '#estSib'].forEach(id => $(id).addEventListener('input', est)); est();

  /* ---------------- campus life: horizontal scroll ---------------- */
  $('#lifeTrack').innerHTML = U.life.map((l, i) => `<article class="acu-lcard" style="--h:${l.hue};--i:${i}"><span>${ICON(l.icon)}</span><b>${esc(l.title)}</b><p>${esc(l.text)}</p><i class="acu-lcard__n mono">0${i + 1}</i></article>`).join('');
  const lifeSec = $('#life'), track = $('#lifeTrack');
  function life() {
    if (reduce || innerWidth < 900) { track.style.transform = ''; return; }
    const r = lifeSec.getBoundingClientRect(), span = lifeSec.offsetHeight - innerHeight;
    const k = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
    track.style.transform = `translateX(${-k * Math.max(0, track.scrollWidth - innerWidth + 80)}px)`;
  }
  function lifeSize() { lifeSec.style.height = (innerWidth < 900 || reduce) ? '' : (innerHeight + Math.max(0, track.scrollWidth - innerWidth + 80)) + 'px'; life(); }
  addEventListener('resize', lifeSize); setTimeout(lifeSize, 100);

  /* ---------------- voices carousel ---------------- */
  let vi = 0, vt;
  function voice(i) {
    vi = (i + U.voices.length) % U.voices.length; const v = U.voices[vi];
    $('#quote').innerHTML = `<svg class="acu-quote__mk" viewBox="0 0 48 48"><path d="M8 36V24c0-9 5-15 14-16v6c-4 1-6 4-6 8h6v14zm20 0V24c0-9 5-15 14-16v6c-4 1-6 4-6 8h6v14z"/></svg><blockquote>${esc(v.q)}</blockquote><p><b>${esc(v.who)}</b> · ${esc(v.role)}</p>`;
    $('#quote').classList.remove('is-swap'); void $('#quote').offsetWidth; $('#quote').classList.add('is-swap');
    $('#quoteDots').innerHTML = U.voices.map((_, k) => `<button class="${k === vi ? 'is-on' : ''}" data-v="${k}" aria-label="Quote ${k + 1}"></button>`).join('');
    clearTimeout(vt); if (!reduce) vt = setTimeout(() => voice(vi + 1), 6000);
  }
  $('#quoteDots').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) voice(+b.dataset.v); });
  voice(0);

  /* ---------------- news + events + calendar ---------------- */
  const tags = ['All', ...new Set(U.news.map(n => n.tag))];
  $('#newsTabs').innerHTML = tags.map((t, i) => `<button class="${i ? '' : 'is-on'}" data-tag="${t}">${t}</button>`).join('');
  function renderNews(tag) {
    const list = U.news.filter(n => tag === 'All' || n.tag === tag);
    $('#newsGrid').innerHTML = list.map((n, i) => `<article class="acu-nw ${i === 0 ? 'acu-nw--big' : ''}" style="--h:${n.hue};--i:${i}" data-news="${U.news.indexOf(n)}" tabindex="0"><div class="acu-nw__art"><i></i><i></i><i></i></div><div class="acu-nw__b"><span class="mono">${esc(n.tag)} · ${fmtD(n.date)}</span><b>${esc(n.title)}</b><p>${esc(n.text)}</p><span class="acu-nw__go">Read story →</span></div></article>`).join('');
  }
  $('#newsTabs').addEventListener('click', e => { const b = e.target.closest('[data-tag]'); if (!b) return; $$('#newsTabs button').forEach(x => x.classList.toggle('is-on', x === b)); renderNews(b.dataset.tag); });
  $('#newsGrid').addEventListener('click', e => { const a = e.target.closest('[data-news]'); if (a) openModal('news', +a.dataset.news); });
  renderNews('All');
  $('#eventList').innerHTML = U.events.map((ev, i) => { const d = new Date(ev.d + 'T12:00'); return `<div class="acu-ev rv" style="--d:${i * 60}ms"><div class="acu-ev__d"><b>${d.getDate()}</b><small>${d.toLocaleDateString('en-GB', { month: 'short' })}</small></div><div><span class="mono">${esc(ev.type)} · ${ev.time}</span><b>${esc(ev.title)}</b><small>${esc(ev.place)}</small></div><button class="acu-ev__add" data-ics="${i}" aria-label="Add ${esc(ev.title)} to calendar">+ Calendar</button></div>`; }).join('');
  $('#eventList').addEventListener('click', e => {
    const b = e.target.closest('[data-ics]'); if (!b) return;
    const ev = U.events[+b.dataset.ics], st = ev.d.replace(/-/g, '') + 'T' + ev.time.replace(':', '') + '00';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Acubins University//Events//EN', 'BEGIN:VEVENT', 'UID:' + st + '@acubins.example', 'DTSTART:' + st, 'SUMMARY:' + ev.title, 'LOCATION:' + ev.place + ', Acubins University', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = ev.title.replace(/\W+/g, '-') + '.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Added — open the file to save it to your calendar.');
  });
  $('#acCal').innerHTML = U.calendar.map(([d, t], i) => `<li style="--i:${i}"><b>${esc(d)}</b><span>${esc(t)}</span></li>`).join('');

  /* ---------------- student services (working mini-apps) ---------------- */
  $('#svcGrid').innerHTML = U.services.map((s, i) => `<button class="acu-sv rv acu-tilt" data-svc="${s.id}" style="--d:${(i % 3) * 70}ms"><span>${ICON(s.icon)}</span><b>${esc(s.name)}</b><small>${esc(s.sub)}</small><i aria-hidden="true">→</i></button>`).join('');
  $('#svcGrid').addEventListener('click', e => { const b = e.target.closest('[data-svc]'); if (b) openModal('svc', b.dataset.svc); });

  const BOOKS = [['Thermodynamics: An Engineering Approach', 'Çengel & Boles', 'TJ265 .C43', 3], ['Deep Learning', 'Goodfellow, Bengio & Courville', 'Q325.5 .G66', 0], ['The Dyslexic Advantage', 'Eide & Eide', 'RC394.W6', 2], ['Principles of Economics', 'Mankiw', 'HB171.5 .M3', 5], ['Gray’s Anatomy for Students', 'Drake et al.', 'QM23.2 .D73', 1], ['Make It Stick: The Science of Successful Learning', 'Brown, Roediger & McDaniel', 'LB1060 .B768', 4], ['Clean Code', 'Robert C. Martin', 'QA76.76 .C73', 2], ['Atomic Habits', 'James Clear', 'BF335 .C54', 0], ['History of the UAE', 'Heard-Bey', 'DS247.T88', 3]];
  const TT = [['Sun', [['09:00', 'MECH 210 · Thermodynamics', 'ENG-204'], ['13:00', 'MATH 201 · Calculus II', 'SCI-110']]], ['Mon', [['10:30', 'ENGL 102 · Academic Writing', 'HUM-012'], ['15:00', 'CS 120 · Programming', 'CS-301']]], ['Tue', [['09:00', 'MECH 210 · Thermodynamics', 'ENG-204'], ['11:00', 'SAS drop-in (optional)', 'Student Hub']]], ['Wed', [['10:30', 'ENGL 102 · Academic Writing', 'HUM-012'], ['13:00', 'MATH 201 · Calculus II', 'SCI-110']]], ['Thu', [['10:00', 'CS 120 · Lab', 'CS-Lab 2']]]];
  const MENU = [['Main Kitchen', '07:00–21:00', ['Chicken machboos', 'Lentil soup', 'Grilled halloumi wrap', 'Fresh salad bar']], ['Green Bowl', '10:00–18:00', ['Falafel bowl', 'Quinoa tabbouleh', 'Smoothies']], ['Café Majlis', '07:30–23:00', ['Karak chai', 'Luqaimat', 'Arabic coffee', 'Za’atar manakish']]];
  const STOPS = ['Main Gate', 'Library', 'Residences', 'Medical Sciences', 'Sports Complex'];
  function svcHTML(id) {
    const s = U.services.find(x => x.id === id);
    const top = `<div class="acu-mh"><span>${ICON(s.icon)}</span><div><p class="mono">Student services</p><h3 id="modalT">${esc(s.name)}</h3></div></div>`;
    if (id === 'library') return top + `<label class="acu-search acu-search--m"><input id="libQ" placeholder="Search title, author or subject" aria-label="Search the catalogue"></label><div class="acu-lib" id="libRes"></div><div class="acu-row"><button class="acu-btn acu-btn--sm acu-btn--gold" data-room>Book a study room</button><span class="acu-fine">Open 24/7 in term</span></div>`;
    if (id === 'timetable') { const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]; return top + `<div class="acu-tt">${TT.map(([d, cls]) => `<div class="${d === today ? 'is-today' : ''}"><b>${d}${d === today ? ' · today' : ''}</b>${cls.map(c => `<p><span class="mono">${c[0]}</span>${esc(c[1])}<small>${esc(c[2])}</small></p>`).join('')}</div>`).join('')}</div><p class="acu-fine">Sample timetable — sign in as a student to see your own.</p>`; }
    if (id === 'shuttle') return top + `<div class="acu-shuttle" id="shuttle"></div><p class="acu-fine">Every 12 minutes, 07:00–23:00. Wheelchair-accessible buses on every route.</p>`;
    if (id === 'dining') return top + `<div class="acu-menu">${MENU.map(([n, h, items]) => `<div><b>${esc(n)}</b><small class="mono">${h}</small><ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div>`;
    if (id === 'gpa') return top + `<div class="acu-gpa" id="gpaRows">${[['MECH 210', 3, 'A-'], ['MATH 201', 3, 'B+'], ['ENGL 102', 3, 'A'], ['CS 120', 4, 'B']].map(r => gpaRow(...r)).join('')}</div><div class="acu-row"><button class="acu-btn acu-btn--sm acu-btn--glass2" data-addgpa>+ Add course</button><div class="acu-gpa__out">Semester GPA <b id="gpaOut">—</b></div></div>`;
    if (id === 'health') return top + `<div class="acu-cards2"><div><b>Health Clinic</b><p>Sun–Thu 08:00–20:00 · nurse on call 24/7</p><button class="acu-btn acu-btn--sm acu-btn--gold" data-appt>Book an appointment</button></div><div><b>Counselling</b><p>Free and confidential. Same-week appointments.</p><button class="acu-btn acu-btn--sm acu-btn--glass2" data-appt>Request a session</button></div><div class="is-urgent"><b>In crisis?</b><p>Call 999 for emergencies, or the 800 HOPE (800 4673) mental-health line.</p></div></div>`;
    if (id === 'careers') return top + `<div class="acu-jobs">${[['Summer engineering intern', 'Masdar', 'Internship'], ['Junior data analyst', 'Mubadala', 'Graduate'], ['UX design intern', 'Careem', 'Internship'], ['Clinical research assistant', 'Cleveland Clinic AD', 'Part-time']].map(j => `<div><b>${j[0]}</b><small>${j[1]} · ${j[2]}</small><button class="acu-btn acu-btn--sm acu-btn--glass2" data-apply-job>Apply</button></div>`).join('')}</div><p class="acu-fine">CV reviews and mock interviews: Student Hub, weekdays.</p>`;
    if (id === 'it') return top + `<form class="acu-ticket" id="ticket"><label><span>Issue</span><select><option>Wi-Fi (Acubins-Secure)</option><option>Password reset</option><option>Software licence</option><option>Printing</option></select></label><label><span>Describe it</span><textarea rows="3" placeholder="What happened?"></textarea></label><button class="acu-btn acu-btn--sm acu-btn--gold">Open a ticket</button></form><div class="acu-status"><span><i class="ok"></i>Wi-Fi</span><span><i class="ok"></i>Email</span><span><i class="warn"></i>Printing (Library L2)</span><span><i class="ok"></i>LMS</span></div>`;
    if (id === 'access') return top + `<p>Student Accessibility Services supports students with disabilities, learning differences, health conditions and mental-health needs — confidentially. Services include exam accommodations, assistive technology, note-taking support, and <b>ERLY</b>, a consent-first study companion that helps you notice study friction early.</p><div class="acu-row"><a class="acu-btn acu-btn--gold acu-btn--sm" href="login.html">Sign in as a student</a><span class="acu-fine">Option 2 on this page</span></div>`;
    return top;
  }
  function gpaRow(c = '', cr = 3, gr = 'A') { return `<div class="acu-gpa__r"><input value="${esc(c)}" placeholder="Course" aria-label="Course"><select aria-label="Credits">${[1, 2, 3, 4].map(n => `<option ${n === cr ? 'selected' : ''}>${n}</option>`).join('')}</select><select aria-label="Grade">${Object.keys(GP).map(g2 => `<option ${g2 === gr ? 'selected' : ''}>${g2}</option>`).join('')}</select></div>`; }
  const GP = { 'A': 4, 'A-': 3.7, 'B+': 3.3, 'B': 3, 'B-': 2.7, 'C+': 2.3, 'C': 2, 'D': 1, 'F': 0 };
  function calcGPA() { let pts = 0, cr = 0; $$('.acu-gpa__r').forEach(r => { const s = $$('select', r); const c = +s[0].value; pts += c * GP[s[1].value]; cr += c; }); const o = $('#gpaOut'); if (o) o.textContent = cr ? (pts / cr).toFixed(2) : '—'; }
  function libSearch(qq) {
    qq = qq.toLowerCase();
    const list = BOOKS.filter(b => !qq || (b[0] + ' ' + b[1]).toLowerCase().includes(qq));
    $('#libRes').innerHTML = list.map(b => `<div><b>${esc(b[0])}</b><small>${esc(b[1])} · <span class="mono">${b[2]}</span></small><span class="${b[3] ? 'ok' : 'no'}">${b[3] ? b[3] + ' available' : 'On loan · reserve'}</span></div>`).join('') || '<p class="acu-fine">No matches in this demo catalogue.</p>';
  }
  let shuttleT = null;
  function shuttle() {
    const el = $('#shuttle'); if (!el) { clearInterval(shuttleT); return; }
    const now = new Date(), mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    el.innerHTML = STOPS.map((s, i) => { const next = 12 - ((mins + i * 3) % 12); const m = Math.floor(next), sec = Math.floor((next - m) * 60); return `<div style="--k:${i}"><i class="acu-bus"></i><b>${esc(s)}</b><span class="mono ${m < 2 ? 'soon' : ''}">${m < 1 ? 'Arriving' : m + ' min ' + String(sec).padStart(2, '0') + ' s'}</span></div>`; }).join('');
  }

  /* ---------------- modal ---------------- */
  const modal = $('#modal');
  let lastFocus = null;
  function openModal(kind, arg) {
    lastFocus = document.activeElement;
    let html = '';
    if (kind === 'prog') {
      const p = U.programs.find(x => x.id === arg);
      html = `<div class="acu-mh" style="--h:${HUE[p.college]}"><span>${ICON('cap')}</span><div><p class="mono">${esc(U.colleges[p.college])} · ${p.deg}</p><h3 id="modalT">${esc(p.name)}</h3></div></div><p>${esc(p.blurb)}</p><div class="acu-facts"><div><small>Duration</small><b>${p.years} years</b></div><div><small>Credits</small><b>${p.credits}</b></div><div><small>Study mode</small><b>${esc(p.mode)}</b></div><div><small>Intake</small><b>${esc(p.intake)}</b></div></div><p class="mono acu-mk">Where graduates work</p><div class="acu-chips">${p.careers.map(c => `<span>${esc(c)}</span>`).join('')}</div><p class="mono acu-mk">Sample first-year modules</p><ul class="acu-ticks"><li>Foundations of ${esc(p.name.split(' ')[0])}</li><li>Academic writing & research skills</li><li>Mathematics / statistics for ${esc(U.colleges[p.college])}</li><li>Emirati studies</li></ul><div class="acu-row"><button class="acu-btn acu-btn--gold" data-modal-apply="${p.id}">Apply for this programme</button><a class="acu-btn acu-btn--glass2" href="#scholar" data-close>Scholarships</a></div>`;
    }
    if (kind === 'news') { const n = U.news[arg]; html = `<div class="acu-nw__art acu-nw__art--m" style="--h:${n.hue}"><i></i><i></i><i></i></div><p class="mono acu-mk">${esc(n.tag)} · ${fmtD(n.date)}</p><h3 id="modalT" class="acu-h3">${esc(n.title)}</h3><p>${esc(n.text)} The project brought together students, faculty and partners from across the region, and the team plans to share results at a public event later this year.</p><p class="acu-fine">Demo newsroom story.</p>`; }
    if (kind === 'apply') { const pre = arg || ''; html = `<div class="acu-mh"><span>${ICON('file')}</span><div><p class="mono">Admissions · Fall 2026</p><h3 id="modalT">Start your application</h3></div></div><form class="acu-apply" id="applyForm"><div class="acu-apply__bar"><i style="width:33%"></i></div><div class="acu-apply__step is-on" data-s="0"><label><span>Full name</span><input required></label><label><span>Email</span><input type="email" required></label><label><span>Nationality</span><input></label></div><div class="acu-apply__step" data-s="1"><label><span>Programme</span><select>${U.programs.map(p => `<option value="${p.id}" ${p.id === pre ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label><label><span>High-school average (%)</span><input type="number" min="50" max="100" value="90"></label><label class="acu-chk"><input type="checkbox"> I’d like information about accessibility support</label></div><div class="acu-apply__step" data-s="2"><div class="acu-done"><span>${ICON('check')}</span><b>Application started!</b><p>Reference <span class="mono" id="appRef"></span>. This is a demo — nothing was sent.</p></div></div><div class="acu-row"><button type="button" class="acu-btn acu-btn--glass2" data-back hidden>Back</button><button class="acu-btn acu-btn--gold" data-nextstep>Continue</button></div></form>`; }
    if (kind === 'tour') html = `<div class="acu-mh"><span>${ICON('compass')}</span><div><p class="mono">Virtual tour</p><h3 id="modalT">A walk across campus</h3></div></div><div class="acu-tour" id="tour">${U.buildings.map((b, i) => `<div class="acu-tour__s ${i ? '' : 'is-on'}" style="--h:${(i * 47) % 360}"><div class="acu-tour__art"><i></i><i></i><i></i></div><b>${esc(b.name)}</b><p>${esc(b.info)}</p></div>`).join('')}</div><div class="acu-row"><button class="acu-btn acu-btn--glass2" data-tour="-1">← Previous</button><span class="mono" id="tourN">1 / ${U.buildings.length}</span><button class="acu-btn acu-btn--gold" data-tour="1">Next →</button></div>`;
    if (kind === 'svc') html = svcHTML(arg);
    $('#modalBody').innerHTML = html;
    modal.hidden = false; requestAnimationFrame(() => modal.classList.add('is-on'));
    document.body.classList.add('acu-lock');
    if (kind === 'svc' && arg === 'library') { libSearch(''); $('#libQ').addEventListener('input', e => libSearch(e.target.value)); }
    if (kind === 'svc' && arg === 'shuttle') { shuttle(); clearInterval(shuttleT); shuttleT = setInterval(shuttle, 1000); }
    if (kind === 'svc' && arg === 'gpa') calcGPA();
    setTimeout(() => { const f = $('#modalBody input, #modalBody button, .acu-modal__x'); f && f.focus(); }, 80);
  }
  function closeModal() { modal.classList.remove('is-on'); document.body.classList.remove('acu-lock'); clearInterval(shuttleT); setTimeout(() => { modal.hidden = true; }, reduce ? 0 : 300); if (lastFocus) lastFocus.focus(); }
  modal.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { closeModal(); return; }
    if (e.target.closest('[data-room]')) return toast('Study room L2-04 booked for today, 16:00–18:00 (demo).');
    if (e.target.closest('[data-appt]')) return toast('Request sent — you’ll get a confirmation email (demo).');
    if (e.target.closest('[data-apply-job]')) return toast('Application started in the Careers portal (demo).');
    if (e.target.closest('[data-addgpa]')) { $('#gpaRows').insertAdjacentHTML('beforeend', gpaRow('', 3, 'B')); calcGPA(); return; }
    const ap = e.target.closest('[data-modal-apply]'); if (ap) { openModal('apply', ap.dataset.modalApply); return; }
    const tb = e.target.closest('[data-tour]');
    if (tb) { const sl = $$('.acu-tour__s'); let i = sl.findIndex(s => s.classList.contains('is-on')); sl[i].classList.remove('is-on'); i = (i + +tb.dataset.tour + sl.length) % sl.length; sl[i].classList.add('is-on'); $('#tourN').textContent = `${i + 1} / ${sl.length}`; return; }
    const bk = e.target.closest('[data-back]'); if (bk) { applyStep(-1); return; }
  });
  modal.addEventListener('input', e => { if (e.target.closest('.acu-gpa')) calcGPA(); });
  modal.addEventListener('change', e => { if (e.target.closest('.acu-gpa')) calcGPA(); });
  modal.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'ticket') { e.target.innerHTML = `<div class="acu-done"><span>${ICON('check')}</span><b>Ticket IT-${Math.floor(10000 + Math.random() * 89999)} opened</b><p>Typical response: under 2 hours (demo).</p></div>`; return; }
    if (e.target.id === 'applyForm') applyStep(1);
  });
  function applyStep(dir) {
    const steps = $$('.acu-apply__step'); let i = steps.findIndex(s => s.classList.contains('is-on'));
    if (dir > 0) { const bad = $$('input[required]', steps[i]).find(x => !x.checkValidity()); if (bad) { bad.reportValidity(); return; } }
    steps[i].classList.remove('is-on'); i = Math.max(0, Math.min(steps.length - 1, i + dir)); steps[i].classList.add('is-on');
    $('.acu-apply__bar i').style.width = ((i + 1) / steps.length * 100) + '%';
    $('[data-back]').hidden = i === 0 || i === steps.length - 1;
    const nx = $('[data-nextstep]'); nx.hidden = i === steps.length - 1; nx.textContent = i === steps.length - 2 ? 'Submit' : 'Continue';
    if (i === steps.length - 1) { $('#appRef').textContent = 'ACU-26-' + Math.floor(100000 + Math.random() * 899999); if (window.FUN && FUN.confetti) FUN.confetti($('.acu-done'), 60); }
  }
  $$('[data-modal]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.modal)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!modal.hidden) closeModal(); if (!$('#searchOv').hidden) closeSearch(); }
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });

  /* ---------------- map ---------------- */
  $('#campusMap').innerHTML = `<svg viewBox="0 0 100 90" role="img" aria-label="Campus map"><defs><pattern id="grass" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".35" class="gr"/></pattern></defs><rect width="100" height="90" rx="4" class="map-bg"/><rect width="100" height="90" rx="4" fill="url(#grass)"/><path class="map-road" d="M0 50 H100 M40 0 V90 M64 50 C70 40 80 38 100 36"/><circle class="map-plaza" cx="40" cy="50" r="6"/>${U.buildings.map((b, i) => `<g class="map-b" data-b="${b.id}" tabindex="0" role="button" aria-label="${esc(b.name)}" style="--i:${i}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="1.6"/><text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 1}">${esc(b.short)}</text></g>`).join('')}<g class="map-pin" id="mapPin" opacity="0"><path d="M0 0c-3-4-5-6-5-9a5 5 0 0 1 10 0c0 3-2 5-5 9z"/><circle cy="-9" r="2" class="pin-dot"/></g></svg>`;
  function pickB(id) {
    const b = U.buildings.find(x => x.id === id); if (!b) return;
    $$('.map-b').forEach(x => x.classList.toggle('is-on', x.dataset.b === id));
    const pin = $('#mapPin'); pin.setAttribute('transform', `translate(${b.x + b.w / 2} ${b.y + 2})`); pin.setAttribute('opacity', '1'); pin.classList.remove('is-drop'); void pin.getBBox(); pin.classList.add('is-drop');
    const info = $('#mapInfo'); info.innerHTML = `<b>${esc(b.name)}</b><p>${esc(b.info)}</p>`; info.classList.remove('is-swap'); void info.offsetWidth; info.classList.add('is-swap');
  }
  $('#campusMap').addEventListener('click', e => { const g2 = e.target.closest('[data-b]'); if (g2) pickB(g2.dataset.b); });
  $('#campusMap').addEventListener('keydown', e => { const g2 = e.target.closest('[data-b]'); if (g2 && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickB(g2.dataset.b); } });

  /* ---------------- site search ---------------- */
  const sOv = $('#searchOv');
  const INDEX = [...U.programs.map(p => ({ t: p.name, s: 'Programme · ' + U.colleges[p.college], go: () => openModal('prog', p.id) })), ...U.news.map((n, i) => ({ t: n.title, s: 'News · ' + n.tag, go: () => openModal('news', i) })), ...U.services.map(s => ({ t: s.name, s: 'Service · ' + s.sub, go: () => openModal('svc', s.id) })), ...U.events.map(ev => ({ t: ev.title, s: 'Event · ' + fmtD(ev.d), go: () => document.getElementById('events').scrollIntoView({ behavior: 'smooth' }) })), { t: 'University login', s: 'Portal · Option 1', go: () => { document.getElementById('logins').scrollIntoView({ behavior: 'smooth' }); setTimeout(openUni, 500); } }, { t: 'Student, faculty & counselor sign-in', s: 'Portal · Option 2', go: () => { location.href = 'login.html'; } }];
  function openSearch() { sOv.hidden = false; requestAnimationFrame(() => sOv.classList.add('is-on')); const i = $('#siteQ'); i.value = ''; runSearch(''); setTimeout(() => i.focus(), 50); }
  function closeSearch() { sOv.classList.remove('is-on'); setTimeout(() => { sOv.hidden = true; }, 250); }
  let hits = [];
  function runSearch(qq) { qq = qq.toLowerCase().trim(); hits = INDEX.filter(x => !qq || (x.t + ' ' + x.s).toLowerCase().includes(qq)).slice(0, 8); $('#siteRes').innerHTML = hits.map((h, i) => `<button data-hit="${i}"><b>${esc(h.t)}</b><small>${esc(h.s)}</small></button>`).join('') || '<p class="acu-fine">No results.</p>'; }
  $('#searchOpen').addEventListener('click', openSearch);
  $('#siteQ').addEventListener('input', e => runSearch(e.target.value));
  $('#siteQ').addEventListener('keydown', e => { if (e.key === 'Enter' && hits[0]) { closeSearch(); hits[0].go(); } });
  sOv.addEventListener('click', e => { const b = e.target.closest('[data-hit]'); if (b) { closeSearch(); hits[+b.dataset.hit].go(); } else if (e.target === sOv) closeSearch(); });

  /* ---------------- forms ---------------- */
  $('#contactForm').addEventListener('submit', e => { e.preventDefault(); e.target.classList.add('is-sent'); toast(`Thanks${$('#cName').value ? ', ' + $('#cName').value.split(' ')[0] : ''} — admissions will reply within a working day (demo).`); e.target.reset(); });
  $('#subForm').addEventListener('submit', e => { e.preventDefault(); toast('Subscribed to Acubins news (demo).'); e.target.reset(); });

  /* ---------------- OPTION 1: the university details login ---------------- */
  const fill = (id, n) => { const el = document.getElementById(id); if (el) el.innerHTML = ICON(n); };
  fill('gwIcUni', 'building'); fill('gwIcPeople', 'users'); fill('gwIcUser', 'users'); fill('gwIcPass', 'lock'); fill('uniEye', 'eye');
  const card = $('#uniCard'), form = $('#uniForm'), face = card.querySelector('.gw-card__face');
  function openUni() { card.classList.add('is-form'); card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); face.hidden = true; form.hidden = false; setTimeout(() => $('#uniUser').focus(), 250); }
  function closeUni() { card.classList.remove('is-form'); form.hidden = true; face.hidden = false; $('#uniErr').hidden = true; }
  $('#uniOpen').addEventListener('click', openUni);
  $('#uniBack').addEventListener('click', closeUni);
  $('#uniEye').addEventListener('click', () => { const p = $('#uniPass'), show = p.type === 'password'; p.type = show ? 'text' : 'password'; $('#uniEye').innerHTML = ICON(show ? 'eyeOff' : 'eye'); });
  ['#uniUser', '#uniPass'].forEach(id => $(id).addEventListener('input', () => { $('#uniErr').hidden = true; form.querySelectorAll('.fld__box').forEach(f => f.classList.remove('is-bad')); }));
  let busy = false, fails = 0;
  form.addEventListener('submit', e => {
    e.preventDefault(); if (busy) return;
    const u = $('#uniUser').value.trim().toLowerCase(), p = $('#uniPass').value;
    const err = m => { fails++; const el = $('#uniErr'); el.textContent = m; el.hidden = false; form.querySelectorAll('.fld__box').forEach(f => f.classList.add('is-bad')); card.classList.remove('is-shake'); void card.offsetWidth; card.classList.add('is-shake'); $('#uniPass').value = ''; $('#uniPass').focus(); };
    if (!u || !p) return err('Please enter the university username and password.');
    busy = true; const btn = $('#uniSignIn'); btn.classList.add('is-loading');
    setTimeout(() => {
      btn.classList.remove('is-loading');
      if (u === ACCOUNT.user && p === ACCOUNT.pass) {
        btn.classList.add('is-ok');
        try { sessionStorage.setItem('acubins-role', 'university'); } catch (er) {}
        return setTimeout(() => warp(btn, 'university.html', 'Acubins University', 'Command Center', 'building'), 450);
      }
      busy = false;
      const people = { acubins: '1234', faculty: '5678', counselor: '4321' };
      err(people[u] === p ? 'That’s a student, faculty or counselor account — use Option 2, “Login for students, faculty and counselors”.' : fails >= 2 ? 'Still incorrect. Check the username and password (passwords are case-sensitive).' : 'Incorrect username or password.');
    }, 650);
  });

  /* ---------------- OPTION 2: students, faculty and counselors ---------------- */
  $('#peopleGo').addEventListener('click', e => { e.preventDefault(); warp(e.currentTarget, 'login.html', 'Students · Faculty · Counselors', 'Sign-in portal', 'users', true); });

  function warp(el, href, k, t, icon, teal) {
    if (reduce) { location.href = href; return; }
    const w = $('#warp'), r = el.getBoundingClientRect();
    w.style.setProperty('--x', (r.left + r.width / 2) + 'px'); w.style.setProperty('--y', (r.top + r.height / 2) + 'px');
    w.classList.toggle('is-teal', !!teal);
    $('#warpK').textContent = k; $('#warpT').textContent = t; $('#warpLogo').innerHTML = ICON(icon);
    w.classList.add('is-on');
    setTimeout(() => { location.href = href; }, 950);
  }

  try {
    if (sessionStorage.getItem('acubins-bye')) { sessionStorage.removeItem('acubins-bye'); setTimeout(() => toast('You’ve signed out. See you soon.'), 600); }
    if (new URLSearchParams(location.search).get('next') === 'university') setTimeout(() => { document.getElementById('logins').scrollIntoView({ behavior: 'smooth' }); openUni(); toast('Please sign in to continue.'); }, seen || reduce ? 200 : 2300);
  } catch (e) {}

  watch(document);
  onScroll();
})();
