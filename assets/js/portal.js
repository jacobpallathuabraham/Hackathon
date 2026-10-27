/* Acubins portal — login. This is a front-end demo: the two demo accounts are
   checked in the browser and the "session" is a sessionStorage flag. A real
   deployment would authenticate against the university's SSO. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const ACCOUNTS = {
    student: { user: 'acubins', pass: '1234', go: 'student.html', hi: 'Welcome to ERLY', k: 'Signed in as Acubins' },
    counselor: { user: 'counselor', pass: '4321', go: 'counselor.html', hi: 'Welcome, Counselor', k: 'Opening the SAS workspace' },
    faculty: { user: 'faculty', pass: '5678', go: 'faculty.html', hi: 'Welcome, Dr. Haddad', k: 'Opening the Faculty portal' }
  };
  const ROLE_UI = {
    student: { title: 'Student sign-in', sub: 'Use your university username and password.', badge: 'Student account' },
    counselor: { title: 'Counselor sign-in', sub: 'Student Accessibility Services staff only.', badge: 'Counselor account' },
    faculty: { title: 'Faculty sign-in', sub: 'Teaching staff of Acubins University.', badge: 'Faculty account' }
  };

  // icons
  const fill = (id, n) => { const el = document.getElementById(id); if (el) el.innerHTML = ICON(n); };
  fill('icA', 'volume'); fill('icB', 'calendar'); fill('f1', 'sparkle'); fill('f2', 'shield'); fill('f3', 'users');
  fill('icStudent', 'cap'); fill('icCounsel', 'counsel'); fill('go1', 'arrow'); fill('go2', 'arrow');
  fill('icFaculty', 'pen'); fill('go3', 'arrow');
  fill('icLock', 'lock'); fill('icUser', 'users'); fill('icPass', 'lock'); fill('eyeBtn', 'eye');

  let role = null, fails = 0, busy = false;
  const card = $('#lcard');

  // theme
  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('erly-theme', next); } catch (e) {}
  });

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-on'), 2600);
  }
  try {
    if (sessionStorage.getItem('acubins-bye')) { sessionStorage.removeItem('acubins-bye'); setTimeout(() => toast('You\'ve signed out. See you soon.'), 300); }
    const next = new URLSearchParams(location.search).get('next');
    if (next && ROLE_UI[next]) setTimeout(() => toast('Please sign in to continue.'), 300);
  } catch (e) {}

  function show(step) {
    $$('.lcard__step').forEach(s => s.classList.toggle('is-active', s.dataset.step === step));
    card.dataset.step = step;
  }
  $$('.role').forEach(b => b.addEventListener('click', () => {
    role = b.dataset.role;
    const ui = ROLE_UI[role];
    $('#formTitle').textContent = ui.title;
    $('#formSub').textContent = ui.sub;
    $('#roleBadge').textContent = ui.badge;
    $('#roleBadge').className = 'lcard__badge lcard__badge--' + role;
    $('#user').value = ''; $('#pass').value = ''; clearErr();
    card.classList.toggle('is-counselor', role === 'counselor');
    card.classList.toggle('is-faculty', role === 'faculty');
    card.classList.toggle('is-university', role === 'university');
    show('form');
    setTimeout(() => $('#user').focus(), 380);
  }));
  $('#backBtn').addEventListener('click', () => { show('role'); fails = 0; });
  $('#eyeBtn').addEventListener('click', () => {
    const p = $('#pass'); const showIt = p.type === 'password';
    p.type = showIt ? 'text' : 'password';
    $('#eyeBtn').innerHTML = ICON(showIt ? 'eyeOff' : 'eye');
    $('#eyeBtn').setAttribute('aria-label', showIt ? 'Hide password' : 'Show password');
  });
  ['#user', '#pass'].forEach(id => $(id).addEventListener('input', clearErr));

  function clearErr() {
    $('#lerr').hidden = true;
    $$('.fld__box').forEach(f => f.classList.remove('is-bad'));
  }
  function fail(msg) {
    fails++;
    const e = $('#lerr');
    e.textContent = msg;
    e.hidden = false;
    $$('.fld__box').forEach(f => f.classList.add('is-bad'));
    card.classList.remove('is-shake'); void card.offsetWidth; card.classList.add('is-shake');
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    $('#pass').value = '';
    $('#pass').focus();
  }

  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    if (busy || !role) return;
    const u = $('#user').value.trim(), p = $('#pass').value;
    if (!u || !p) return fail('Please enter your username and password.');
    busy = true;
    const btn = $('#signIn');
    btn.classList.add('is-loading');
    setTimeout(() => {
      const acc = ACCOUNTS[role];
      if (u.toLowerCase() === acc.user && p === acc.pass) {
        btn.classList.remove('is-loading');
        btn.classList.add('is-ok');
        try { sessionStorage.setItem('acubins-role', role); } catch (err) {}
        setTimeout(() => {
          $('#wipeTxt').textContent = acc.hi;
          $('#wipeK').textContent = acc.k;
          $('#wipe').classList.add('is-on', role === 'counselor' ? 'is-teal' : role === 'faculty' ? 'is-violet' : role === 'university' ? 'is-gold' : 'is-accent');
          setTimeout(() => { location.href = acc.go; }, 900);
        }, 520);
      } else {
        busy = false;
        btn.classList.remove('is-loading');
        if (u.toLowerCase() === 'university' && p === '2468') return fail('That’s the university login — use “University login” on the Acubins University home page.');
        const other = Object.keys(ACCOUNTS).find(k => k !== role && ACCOUNTS[k].user === u.toLowerCase() && ACCOUNTS[k].pass === p);
        fail(other ? `That's a ${other} account — go back and choose “${other[0].toUpperCase() + other.slice(1)}”.` : fails >= 2 ? 'Still incorrect. Check the username and password (passwords are case-sensitive).' : 'Incorrect username or password.');
      }
    }, 650);
  });
})();
