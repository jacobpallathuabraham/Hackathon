/* Acubins University — the public home page. Two ways in:
   1) University login (university details) → the Command Center;
   2) the sign-in page for students, faculty and counselors (login.html).
   Front-end demo: the university account is checked in the browser. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const C = window.CAMPUS;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ACCOUNT = { user: 'university', pass: '2468' };

  const fill = (id, n) => { const el = document.getElementById(id); if (el) el.innerHTML = ICON(n); };
  fill('gwIcUni', 'building'); fill('gwIcPeople', 'users'); fill('gwIcUser', 'users'); fill('gwIcPass', 'lock'); fill('uniEye', 'eye'); fill('gwIcAccess', 'shield');

  $('#themeToggle').addEventListener('click', () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('erly-theme', n); } catch (e) {} });
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-on'), 2600); }
  try {
    if (sessionStorage.getItem('acubins-bye')) { sessionStorage.removeItem('acubins-bye'); setTimeout(() => toast('You’ve signed out. See you soon.'), 300); }
    if (new URLSearchParams(location.search).get('next') === 'university') setTimeout(() => { openUni(); toast('Please sign in to continue.'); }, 300);
  } catch (e) {}

  // facts and colleges
  const total = C ? C.COLLEGES.reduce((a, c) => a + c.students, 0) : 0;
  $('#gwStats').innerHTML = [[total.toLocaleString('en-US'), 'students'], ['5', 'colleges'], ['412', 'faculty members'], ['91%', 'average attendance']].map(([n, l], i) => `<div style="--i:${i}"><b>${n}</b><span>${l}</span></div>`).join('');
  if (C) $('#gwCols').innerHTML = C.COLLEGES.map((c, i) => `<div class="gw-col" style="--h:${c.hue};--i:${i}"><b>${c.name}</b><span>${c.students.toLocaleString('en-US')} students</span></div>`).join('');

  // option 1: the university details login, inside its card
  const card = $('#uniCard'), form = $('#uniForm'), face = card.querySelector('.gw-card__face');
  function openUni() { card.classList.add('is-form'); face.hidden = true; form.hidden = false; setTimeout(() => $('#uniUser').focus(), 250); card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }
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

  // option 2: off to the sign-in page for students, faculty and counselors
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

  // the same slow constellation as the Command Center
  const cv = $('#uniFx'), g = cv.getContext('2d');
  let W, H, pts = [];
  function size() { const dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); pts = Array.from({ length: Math.round(W / 26) }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 })); }
  size(); addEventListener('resize', () => { clearTimeout(size.t); size.t = setTimeout(size, 200); });
  (function loop() {
    g.clearRect(0, 0, W, H);
    const col = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#C1502B';
    pts.forEach(p => { if (!reduce) { p.x += p.vx; p.y += p.vy; } if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; });
    g.strokeStyle = col; g.fillStyle = col;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 130) { g.globalAlpha = (1 - d / 130) * .16; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } }
    g.globalAlpha = .35; pts.forEach(p => { g.beginPath(); g.arc(p.x, p.y, 1.6, 0, 7); g.fill(); }); g.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(loop);
  })();
})();
