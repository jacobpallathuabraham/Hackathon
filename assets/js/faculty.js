/* Acubins University — Faculty portal.
   Courses and streams, live attendance taking, the class roster, and
   classroom observations written under each student's name. A referral
   shares the chosen observations with SAS (and the student is told). */
(function () {
  'use strict';
  const C = window.CAMPUS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let D = C.load();
  const save = () => C.save(D);
  const ME = 'Dr. Haddad';
  const stu = id => C.STUDENTS.find(s => s.id === id);
  const fmt = t => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const ago = t => { const d = Math.round((Date.now() - t) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; };
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-on'), 2600); }
  function countUp(el, to, suffix = '') { if (reduce) { el.textContent = to + suffix; return; } const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(to * e) + suffix; if (k < 1) requestAnimationFrame(f); })(t0); }
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const avatar = s => `<span class="avatar avatar--hue" style="--h:${s.hue}">${esc(s.init)}</span>`;

  /* ---------------- chrome ---------------- */
  const h = new Date().getHours();
  $('#hi').textContent = `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}, ${ME}`;
  $('#today').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#themeToggle').addEventListener('click', () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('erly-theme', n); } catch (e) {} render(current); });
  $('#logoutBtn').addEventListener('click', () => { let to = 'login.html'; try { if (sessionStorage.getItem('acubins-role') === 'university') to = 'index.html'; sessionStorage.removeItem('acubins-role'); sessionStorage.setItem('acubins-bye', '1'); } catch (e) {} location.href = to; });
  $('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('is-open'));
  try { if (sessionStorage.getItem('acubins-role') === 'university') $('#toUni').hidden = false; } catch (e) {}
  const courseSel = $('#course');
  courseSel.innerHTML = C.COURSES.map(c => `<option value="${c.id}">${c.code} · ${esc(c.name)}</option>`).join('');
  let course = C.COURSES[0];
  courseSel.addEventListener('change', () => { course = C.COURSES.find(c => c.id === courseSel.value); render(current); });

  const pill = document.createElement('span'); pill.className = 'side__pill'; $('.side__nav').prepend(pill);
  const movePill = () => { const a = $('.side__a.is-on'); if (a) { pill.style.transform = `translateY(${a.offsetTop}px)`; pill.style.height = a.offsetHeight + 'px'; } };
  let current = 'overview';
  const ORDER = ['overview', 'attendance', 'students', 'referrals'];
  function go(v) {
    if (v === current) return;
    const from = $(`.view[data-view="${current}"]`), to = $(`.view[data-view="${v}"]`);
    const dir = ORDER.indexOf(v) > ORDER.indexOf(current) ? 1 : -1;
    current = v;
    $$('.side__a').forEach(a => a.classList.toggle('is-on', a.dataset.view === v)); movePill();
    $('#side').classList.remove('is-open');
    if (reduce) { $$('.view').forEach(x => x.classList.toggle('is-on', x === to)); return render(v); }
    from.style.setProperty('--dir', dir); from.classList.add('is-leaving');
    setTimeout(() => { from.classList.remove('is-leaving', 'is-on'); to.style.setProperty('--dir', dir); to.classList.add('is-on'); render(v); }, 220);
  }
  $$('.side__a').forEach(a => a.addEventListener('click', () => go(a.dataset.view)));
  requestAnimationFrame(movePill); addEventListener('resize', movePill);
  document.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) go(g.dataset.goto); });

  /* ---------------- overview ---------------- */
  let charts = [];
  const kill = () => { charts.forEach(c => c.destroy()); charts = []; };
  function overview() {
    const v = $('.view[data-view="overview"]');
    const roster = course.students.map(stu);
    const att = roster.map(s => C.attendance(D, course.id, s.id));
    const avg = att.reduce((a, x) => a + x.rate, 0) / att.length;
    const risk = roster.filter((s, i) => att[i].rate < 0.75);
    const obsWeek = D.obs.filter(o => Date.now() - o.at < 7 * 864e5).length;
    const sessions = C.sessionsFor(course, Date.now());
    const next = nextClass();
    v.innerHTML = `
      <div class="fac-hero">
        <div><p class="mono small">${esc(course.stream)} · Section ${course.section} · ${esc(course.room)}</p><h2>${course.code} <span>${esc(course.name)}</span></h2>
          <p class="muted">${roster.length} students · ${course.slots.length} classes a week · next: <b>${esc(next)}</b></p></div>
        <div class="fac-hero__btns"><button class="btn btn--accent" data-goto="attendance">Take attendance</button><button class="btn btn--ghost" data-goto="students">Add an observation</button></div>
      </div>
      <div class="kpis kpis--dash">
        ${[['Students', roster.length, '', 'users', '--accent'], ['Average attendance', Math.round(avg * 100), '%', 'calendar', '--teal'], ['Below 75% attendance', risk.length, '', 'flame', '--s4'], ['Observations this week', obsWeek, '', 'pen', '--good']].map(([l, n, suf, ic, c], i) => `<div class="kpi kpi--dash" style="--c:var(${c});--i:${i}"><span class="kpi__ic">${ICON(ic)}</span><small>${l}</small><b data-n="${n}" data-s="${suf}">0</b></div>`).join('')}
      </div>
      <div class="dgrid2">
        <div class="dcard dcard--wide"><div class="dcard__head"><div><h2>Attendance by class</h2><p class="dcard__sub">Last ${sessions.length} sessions · present + half of late</p></div></div><div class="chart-box chart-box--md"><canvas id="fcTrend"></canvas></div></div>
        <div class="dcard"><div class="dcard__head"><h2>Needs attention</h2><span class="mono small muted">attendance &lt; 75%</span></div>
          <div class="fac-list">${risk.length ? risk.map((s, i) => { const a = C.attendance(D, course.id, s.id); return `<button class="fac-row" data-stu="${s.id}" style="--i:${i}">${avatar(s)}<span><b>${esc(s.name)}</b><small>${a.absent} absent · ${a.late} late of ${a.total}</small></span><span class="fac-pct fac-pct--low">${Math.round(a.rate * 100)}%</span></button>`; }).join('') : '<p class="muted">Everyone is above 75%. 🎉</p>'}</div></div>
        <div class="dcard"><div class="dcard__head"><h2>Recent observations</h2><button class="link small" data-goto="students">All students →</button></div>
          <div class="fac-list">${D.obs.slice().sort((a, b) => b.at - a.at).slice(0, 5).map((o, i) => { const s = stu(o.stu); return `<button class="fac-row" data-stu="${s.id}" style="--i:${i}">${avatar(s)}<span><b>${esc(s.name)}</b><small>${o.signs.map(id => esc((C.SIGNS.find(x => x.id === id) || {}).en)).join(' · ')}</small></span><span class="mono small muted">${ago(o.at)}</span></button>`; }).join('')}</div></div>
      </div>`;
    $$('.kpi b', v).forEach(b => countUp(b, +b.dataset.n, b.dataset.s));
    const rates = sessions.map(ss => { let t = 0; roster.forEach(s => { const m = C.mark(D, course.id, ss.id, s.id); t += m === 'P' ? 1 : m === 'L' ? 0.5 : 0; }); return Math.round(t / roster.length * 100); });
    const acc = css('--accent') || '#C1502B';
    charts.push(new Chart($('#fcTrend'), { type: 'line', data: { labels: sessions.map(s => fmt(s.date) + ' ' + s.time), datasets: [{ label: 'Attendance %', data: rates, borderColor: acc, backgroundColor: acc + '22', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: acc }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: reduce ? 0 : 900 }, plugins: { legend: { display: false } }, scales: { y: { min: 50, max: 100, ticks: { callback: v => v + '%' } }, x: { ticks: { maxRotation: 0, autoSkip: true } } } } }));
  }
  function nextClass() {
    const now = new Date(), wd = (now.getDay() + 6) % 7;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const s = course.slots.map(([w, t]) => ({ w, t, d: (w - wd + 7) % 7 })).sort((a, b) => a.d - b.d || a.t.localeCompare(b.t))[0];
    return s ? (s.d === 0 ? 'today ' : days[s.w] + ' ') + s.t : '—';
  }

  /* ---------------- attendance ---------------- */
  let sessIdx = -1; // -1 = today's new session
  function attendance() {
    const v = $('.view[data-view="attendance"]');
    const sessions = C.sessionsFor(course, Date.now());
    const today = { id: course.id + '-' + new Date().toISOString().slice(0, 10) + '-now', date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 5), today: true };
    const all = sessions.concat([today]);
    const sess = sessIdx < 0 ? today : all[sessIdx];
    const roster = course.students.map(stu);
    const marks = roster.map(s => ({ s, m: (D.marks[sess.id] || {})[s.id] || (sess.today ? null : C.mark(D, course.id, sess.id, s.id)) }));
    const n = k => marks.filter(x => x.m === k).length;
    v.innerHTML = `
      <div class="view__head"><h2 class="view__title">Attendance · ${course.code}</h2>
        <div class="att-sess"><button class="icon-btn icon-btn--sm" data-sess="-1" aria-label="Earlier session">‹</button><select id="sessSel">${all.map((s, i) => `<option value="${s.today ? -1 : i}" ${(sessIdx < 0 ? s.today : i === sessIdx) ? 'selected' : ''}>${s.today ? 'Today · ' + s.time + ' (new)' : fmt(s.date) + ' · ' + s.time}</option>`).join('')}</select><button class="icon-btn icon-btn--sm" data-sess="1" aria-label="Later session">›</button></div></div>
      <div class="att-bar">
        <span class="att-count att-count--p"><b>${n('P')}</b> present</span><span class="att-count att-count--l"><b>${n('L')}</b> late</span><span class="att-count att-count--a"><b>${n('A')}</b> absent</span><span class="att-count"><b>${n(null)}</b> not marked</span>
        <span class="att-bar__sp"></span>
        <button class="btn btn--sm btn--ghost" data-allp>Mark all present</button>
        <button class="btn btn--sm btn--accent" data-save>Save register</button>
      </div>
      <div class="att-grid">${marks.map(({ s, m }, i) => { const a = C.attendance(D, course.id, s.id); return `<div class="att-row" style="--i:${i}" data-stu="${s.id}">
        ${avatar(s)}<span class="att-who"><b>${esc(s.name)}${s.you ? ' <em class="live-dot">ERLY</em>' : ''}</b><small>${s.id} · term ${Math.round(a.rate * 100)}%</small></span>
        <div class="att-tgl" role="radiogroup" aria-label="${esc(s.name)} attendance">${['P', 'L', 'A'].map(k => `<button type="button" role="radio" aria-checked="${m === k}" class="att-b att-b--${k} ${m === k ? 'is-on' : ''}" data-m="${k}">${k === 'P' ? 'Present' : k === 'L' ? 'Late' : 'Absent'}</button>`).join('')}</div>
      </div>`; }).join('')}</div>`;
    v.onclick = e => {
      const b = e.target.closest('.att-b');
      if (b) {
        const row = b.closest('.att-row'); D.marks[sess.id] = D.marks[sess.id] || {}; D.marks[sess.id][row.dataset.stu] = b.dataset.m;
        $$('.att-b', row).forEach(x => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', on); });
        b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
        save(); updateCounts(v, sess, roster);
      }
      if (e.target.closest('[data-allp]')) { D.marks[sess.id] = D.marks[sess.id] || {}; roster.forEach(s => { D.marks[sess.id][s.id] = D.marks[sess.id][s.id] || 'P'; }); save(); attendance(); toast('Everyone not yet marked is now present.'); }
      if (e.target.closest('[data-save]')) { save(); toast(`Register saved for ${course.code} · ${sess.today ? 'today' : fmt(sess.date)}.`); }
      const sb = e.target.closest('[data-sess]');
      if (sb) { const cur = sessIdx < 0 ? all.length - 1 : sessIdx; let nx = cur + +sb.dataset.sess; nx = Math.max(0, Math.min(all.length - 1, nx)); sessIdx = nx === all.length - 1 ? -1 : nx; attendance(); }
    };
    $('#sessSel', v).onchange = e => { sessIdx = +e.target.value; attendance(); };
  }
  function updateCounts(v, sess, roster) {
    const m = roster.map(s => (D.marks[sess.id] || {})[s.id] || (sess.today ? null : C.mark(D, course.id, sess.id, s.id)));
    const n = k => m.filter(x => x === k).length;
    const cs = $$('.att-count b', v); [n('P'), n('L'), n('A'), n(null)].forEach((x, i) => { cs[i].textContent = x; });
  }

  /* ---------------- students & observations ---------------- */
  let filter = '';
  function students() {
    const v = $('.view[data-view="students"]');
    const roster = course.students.map(stu).filter(s => !filter || s.name.toLowerCase().includes(filter));
    v.innerHTML = `
      <div class="view__head"><h2 class="view__title">Students &amp; observations · ${course.code}</h2><label class="search"><input id="stuFilter" placeholder="Filter students…" value="${esc(filter)}"></label></div>
      <p class="muted small fac-note">${ICON('shield')} Observations are what you noticed in class, written under each student’s name. They are not a diagnosis and stay within the faculty portal unless you refer the student to SAS.</p>
      <div class="fac-cards">${roster.map((s, i) => {
        const a = C.attendance(D, course.id, s.id), obs = D.obs.filter(o => o.stu === s.id).sort((x, y) => y.at - x.at);
        const signs = Array.from(new Set(obs.flatMap(o => o.signs)));
        const ref = D.refs.find(r => r.stu === s.id);
        return `<article class="fac-card" style="--i:${i}">
          <header>${avatar(s)}<div><b>${esc(s.name)}${s.you ? ' <em class="live-dot">ERLY</em>' : ''}</b><small>${s.id} · ${esc(s.stream)} · Year ${s.year}</small></div>
            <span class="fac-ring" style="--p:${a.rate}" title="Attendance"><i>${Math.round(a.rate * 100)}%</i></span></header>
          <div class="fac-obs">
            <p class="mono small muted">Observed by faculty</p>
            ${signs.length ? `<div class="fac-signs">${signs.map(id => { const sg = C.SIGNS.find(x => x.id === id); return `<span class="fac-sign fac-sign--${sg.area}">${esc(sg.en)}</span>`; }).join('')}</div>` : '<p class="muted small">No observations yet.</p>'}
            ${obs[0] ? `<blockquote>“${esc(obs[0].note)}”<cite>— ${esc(obs[0].by)}, ${ago(obs[0].at)}${obs.length > 1 ? ` · +${obs.length - 1} more` : ''}</cite></blockquote>` : ''}
          </div>
          <footer><button class="btn btn--xs btn--accent" data-obs="${s.id}">${ICON('pen')} Add observation</button><button class="btn btn--xs btn--ghost" data-stu="${s.id}">Open</button>${ref ? `<span class="fac-refd">${ICON('check')} Referred to SAS</span>` : ''}</footer>
        </article>`;
      }).join('')}</div>`;
    $('#stuFilter', v).oninput = e => { filter = e.target.value.toLowerCase(); const pos = e.target.selectionStart; students(); const f = $('#stuFilter'); f.focus(); f.setSelectionRange(pos, pos); };
  }

  /* ---------------- referrals ---------------- */
  function referrals() {
    const v = $('.view[data-view="referrals"]');
    v.innerHTML = `<div class="view__head"><h2 class="view__title">Referrals to SAS</h2><span class="muted small">Shared with SAS · the student is always told</span></div>
      <div class="fac-list fac-list--big">${D.refs.slice().sort((a, b) => b.at - a.at).map((r, i) => { const s = stu(r.stu); const obs = D.obs.filter(o => r.obs.includes(o.id)); return `<div class="fac-ref" style="--i:${i}">${avatar(s)}<div><b>${esc(s.name)}</b><small>${fmt(r.at)} · by ${esc(r.by)}</small><p>${obs.map(o => o.signs.map(id => esc(C.SIGNS.find(x => x.id === id).en)).join(' · ')).join(' / ')}</p>${r.msg ? `<p class="muted small">${esc(r.msg)}</p>` : ''}</div><span class="st st--${r.status === 'acknowledged' ? 'scheduled' : 'new'}">${r.status === 'acknowledged' ? 'SAS acknowledged' : 'Sent to SAS'}</span></div>`; }).join('') || '<p class="muted">No referrals yet.</p>'}</div>`;
  }

  /* ---------------- drawer: one student ---------------- */
  const drawer = $('#drawer'), scrim = $('#scrim');
  function openStudent(id, focusObs) {
    const s = stu(id);
    const obs = D.obs.filter(o => o.stu === id).sort((a, b) => b.at - a.at);
    const att = C.COURSES.filter(c => c.students.includes(id)).map(c => ({ c, a: C.attendance(D, c.id, id) }));
    drawer.innerHTML = `
      <button class="icon-btn drawer__x" data-close aria-label="Close">${ICON('x')}</button>
      <header class="fac-dh">${avatar(s)}<div><h2>${esc(s.name)}</h2><p class="muted">${s.id} · ${esc(s.stream)} · Year ${s.year} · GPA ${s.gpa}</p></div></header>
      <h3 class="fac-h">Attendance by course</h3>
      <div class="fac-att">${att.map(({ c, a }) => `<div><span>${c.code}</span><i><b style="--w:${a.rate}"></b></i><em class="${a.rate < 0.75 ? 'is-low' : ''}">${Math.round(a.rate * 100)}%</em></div>`).join('')}</div>
      <h3 class="fac-h">New observation</h3>
      <form class="fac-form" id="obsForm">
        <p class="muted small">Tick what you have <b>seen</b> in class. Keep it factual and kind.</p>
        <div class="fac-checks">${Object.keys(C.AREA_NAME).map(area => `<fieldset><legend>${C.AREA_NAME[area]}</legend>${C.SIGNS.filter(x => x.area === area).map(x => `<label><input type="checkbox" value="${x.id}"><span>${esc(x.en)}</span></label>`).join('')}</fieldset>`).join('')}</div>
        <label class="fac-note-in"><span class="mono small">Note</span><textarea id="obsNote" rows="3" placeholder="e.g. Strong verbal answers, but written work is much shorter than expected."></textarea></label>
        <div class="row-btns"><button class="btn btn--accent" type="submit">Save observation</button><button class="btn btn--ghost" type="button" data-refer>Refer to SAS…</button></div>
      </form>
      <h3 class="fac-h">Observation history</h3>
      <ol class="fac-hist">${obs.map(o => `<li><b>${fmt(o.at)}</b> · ${esc(o.by)} · ${esc(C.COURSES.find(c => c.id === o.course).code)}<div class="fac-signs">${o.signs.map(id => { const sg = C.SIGNS.find(x => x.id === id); return `<span class="fac-sign fac-sign--${sg.area}">${esc(sg.en)}</span>`; }).join('')}</div>${o.note ? `<p>${esc(o.note)}</p>` : ''}</li>`).join('') || '<li class="muted">Nothing recorded yet.</li>'}</ol>`;
    scrim.hidden = false; requestAnimationFrame(() => { scrim.classList.add('is-on'); drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); });
    if (focusObs) setTimeout(() => { const f = $('#obsForm input', drawer); f && f.focus(); $('#obsForm', drawer).scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); }, 400);
    $('#obsForm', drawer).onsubmit = e => {
      e.preventDefault();
      const signs = $$('#obsForm input:checked', drawer).map(i => i.value), note = $('#obsNote', drawer).value.trim();
      if (!signs.length && !note) return toast('Tick at least one thing you noticed, or write a note.');
      D.obs.push({ id: 'o' + Date.now().toString(36), stu: id, course: course.id, signs, note, at: Date.now(), by: ME }); save();
      toast(`Observation saved under ${s.name}.`); openStudent(id); render(current);
    };
    $('[data-refer]', drawer).onclick = () => refer(id);
  }
  function refer(id) {
    const s = stu(id), obs = D.obs.filter(o => o.stu === id);
    if (!obs.length) return toast('Save at least one observation first, so SAS knows what you noticed.');
    if (!confirm(`Refer ${s.name} to Student Accessibility Services?\n\nSAS will see your ${obs.length} observation(s). ${s.name} will be told about the referral and SAS will reach out to them — it is their choice what happens next.`)) return;
    D.refs = D.refs.filter(r => r.stu !== id);
    D.refs.push({ id: 'r' + Date.now().toString(36), stu: id, obs: obs.map(o => o.id), at: Date.now(), by: ME, status: 'sent', studentInformed: true });
    save(); toast(`${s.name} referred to SAS — they have been notified.`); closeDrawer(); render(current); badge();
  }
  function closeDrawer() { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); scrim.classList.remove('is-on'); setTimeout(() => { scrim.hidden = true; }, 300); }
  scrim.addEventListener('click', closeDrawer);
  drawer.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDrawer(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-obs]'); if (o) return openStudent(o.dataset.obs, true);
    const s = e.target.closest('[data-stu]'); if (s && !e.target.closest('.att-row')) openStudent(s.dataset.stu);
  });

  function badge() { $('#refBadge').textContent = D.refs.length; }
  function render(v) { kill(); ({ overview, attendance, students, referrals })[v](); }
  badge(); render('overview');
})();
