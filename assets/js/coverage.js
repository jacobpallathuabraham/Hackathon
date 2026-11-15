/* ERLY — visual coverage dashboard (v17). Loads the real student page in a hidden same-origin frame and asks its
   Noor Lab router (ERLY_LAB.predict) what each curriculum probe would produce. All counting happens here, from
   those measurements; nothing is stored or sent. */
(function () {
  'use strict';
  const C = window.ERLY_CURRICULUM; if (!C) return;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const NAME = { interactive: 'Interactive', visual: 'Visual', diagram: 'Diagram', explain: 'Explanation only' };
  const COL = { interactive: '#16a34a', visual: '#2563eb', diagram: '#9333ea', explain: '#d97706' };
  const ORDER = ['interactive', 'visual', 'diagram', 'explain'];
  const t = $('#themeToggle'); if (t) t.addEventListener('click', () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('erly-theme', n); } catch (e) { /* storage blocked */ } });
  let rows = [];
  function render() {
    const n = rows.length, by = k => rows.filter(r => r.m.status === k).length;
    $('#covCards').innerHTML = ORDER.map(k => `<div class="kq-card"><b>${by(k)}</b><span>${NAME[k]}</span><small>${Math.round(by(k) / n * 100)} % of ${n} concepts</small></div>`).join('') + `<div class="kq-card"><b>${new Set(rows.map(r => r.discipline)).size}</b><span>Disciplines</span><small>measured ${new Date().toTimeString().slice(0, 5)}</small></div>`;
    const discs = [...new Set(rows.map(r => r.discipline))];
    $('#covDisc tbody').innerHTML = discs.map(d => { const R = rows.filter(r => r.discipline === d), c = k => R.filter(r => r.m.status === k).length; return `<tr><td>${esc(d)}</td><td>${R.length}</td>${ORDER.map(k => `<td>${c(k)}</td>`).join('')}<td><div class="cov-bar" role="img" aria-label="${ORDER.map(k => `${NAME[k]} ${c(k)}`).join(', ')}">${ORDER.map(k => `<i style="width:${c(k) / R.length * 100}%;background:${COL[k]}"></i>`).join('')}</div></td></tr>`; }).join('');
    const f = $('#covF'); if (!f.options.length) f.innerHTML = '<option value="">All</option>' + discs.map(d => `<option>${esc(d)}</option>`).join('');
    list();
  }
  function list() {
    const d = $('#covF').value, s = $('#covS').value, q = $('#covQ').value.trim().toLowerCase();
    $('#covAll tbody').innerHTML = rows.filter(r => (!d || r.discipline === d) && (!s || r.m.status === s) && (!q || (r.concept + ' ' + r.unit + ' ' + r.probe).toLowerCase().includes(q))).map(r => `<tr data-status="${r.m.status}"><td>${esc(r.discipline)}</td><td>${esc(r.levelName)}</td><td>${esc(r.unit)}${r.syllabus ? `<div class="cov-probe">${esc(r.syllabus)}</div>` : ''}</td><td>${esc(r.concept)}<div class="cov-probe">“${esc(r.probe.length > 110 ? r.probe.slice(0, 110) + '…' : r.probe)}” <a href="student.html?ask=${encodeURIComponent(r.probe)}">Ask Noor →</a></div></td><td><span class="cov-s cov-s--${r.m.status}">${NAME[r.m.status]}</span>${r.m.engine ? ` <small>Noor Lab · ${esc(r.m.engine)}</small>` : r.m.kind ? ` <small>${esc(r.m.kind)}${r.m.title ? ' · ' + esc(r.m.title) : ''}</small>` : ''}</td></tr>`).join('');
  }
  ['#covF', '#covS'].forEach(s => $(s).addEventListener('change', list)); $('#covQ').addEventListener('input', list);
  const fr = $('#covFrame');
  fr.addEventListener('load', () => {
    const w = fr.contentWindow;
    let tries = 0;
    const go = () => {
      const L = w && w.ERLY_LAB;
      if (!L || !L.predict || !(w.ERLY && w.ERLY.vspec)) { if (++tries < 60) return setTimeout(go, 150); $('#covCards').innerHTML = '<p class="kq-note">Couldn’t load Noor to measure coverage. Sign in as a student, then reopen this page.</p>'; return; }
      rows = C.list.map(c => { let m; try { m = L.predict(c.probe); } catch (e) { m = { status: 'explain', error: String(e.message || e) }; } return Object.assign({}, c, { m }); });
      window.ERLY_COVERAGE = { rows, counts: Object.fromEntries(ORDER.map(k => [k, rows.filter(r => r.m.status === k).length])) };
      render();
      document.dispatchEvent(new CustomEvent('coverage:ready'));
    };
    go();
  });
  fr.src = 'student.html?measure=1';
})();
