/* ERLY Learning Studio — the dashboard (v24).
   A full-bleed "knowledge orrery": every subject is a world orbiting a glowing core. Hover or focus a world to see it,
   select it to dive in (the camera flies into the planet, then the subject page opens). Around it: instant search,
   continue-learning, an experience of the day, a filterable discovery rail of every interactive experience, and the
   student's plan and progress (the earlier Home, kept intact below).
   Performance: one canvas, ≤ 40 fps, DPR ≤ 1.75, paused off-screen / hidden tab; reduced motion → a still frame. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, esc = LS.esc, st = LS.store;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still') || document.documentElement.dataset.lsEnv === 'off';
  const HUE = { maths: 236, physics: 204, chemistry: 168, biology: 352, cs: 278, english: 32, geography: 128, history: 38, languages: 300, social: 12, more: 20 };
  const GLYPH = { maths: 'ƒ', physics: '⚛', chemistry: '⬡', biology: '❦', cs: '</>', english: 'Aa', geography: '◍', history: '⌛', languages: '“ ”', social: '⌂', more: '∿' };
  let hero = null;

  function dayIndex(n) { const d = new Date(); return (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % n; }
  function expCard(x, i) { const S = (LS.subjectsList || []).find(s => s.id === x.subject) || {}; return `<li class="dx-card m-rise" style="--h:${HUE[x.subject] || 220};--i:${Math.min(i, 12)}"><a href="#/exp/${x.id}"><span class="dx-card__band" aria-hidden="true"><i>${GLYPH[x.subject] || '•'}</i></span><span class="dx-card__k">${esc(T(S.name || x.subject, S.ar || ''))} · ${esc(LS.expKinds[x.kind] || x.kind)}</span><b>${esc(x.title)}</b><small>${esc(x.hook)}</small><span class="dx-card__m">~${x.mins} min</span></a></li>`; }

  function dash(view) {
    const X = LS.experiences || [], subs = (LS.subjectsList || []), res = LS.resumables ? LS.resumables() : [], d = st.data();
    const today = X[dayIndex(X.length)], tried = new Set((d.events || []).filter(e => e.type === 'experience').map(e => e.id));
    const kinds = [...new Set(X.map(x => x.kind))];
    view.innerHTML = `<div class="dx">
      <section class="dx-hero" aria-label="${T('Learning Studio — choose a world', 'استوديو التعلم — اختر عالماً')}">
        <canvas class="dx-orrery" aria-hidden="true"></canvas>
        <div class="dx-hero__in">
          <p class="dx-kicker">${esc(new Date().toLocaleDateString((window.I18N && I18N.lang === 'ar') ? 'ar' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
          <h1 class="dx-title">${T('Where will curiosity take you today?', 'إلى أين سيأخذك فضولك اليوم؟')}</h1>
          <div class="dx-search" role="search"><input type="search" class="dx-search__in" placeholder="${T('Search 64 experiences, topics, subjects…', 'ابحث في التجارب والمواضيع…')}" aria-label="${T('Search the Learning Studio', 'ابحث')}" autocomplete="off"><ul class="dx-search__res" role="listbox" hidden></ul></div>
          <nav class="dx-modes" aria-label="${T('Ways to learn', 'طرق التعلم')}"><a href="#/explore">${T('Explore worlds', 'استكشف العوالم')}<small>${subs.length} ${T('subjects', 'مواد')}</small></a><a href="#/learn">${T('Learn a topic', 'تعلّم موضوعاً')}<small>${(LS.lessons || []).length} ${T('lessons', 'دروس')}</small></a><a href="#/practise">${T('Practise', 'تدرّب')}<small>${T('questions & mistakes', 'أسئلة وأخطاء')}</small></a><a href="#/revise">${T('Revise', 'راجع')}<small>${T('flashcards', 'بطاقات')}</small></a></nav>
          ${res[0] ? `<a class="dx-continue" href="${res[0].href}"><span>${T('Continue', 'تابع')}</span><b>${esc(res[0].title)}</b><small>${esc(res[0].meta || '')}</small></a>` : ''}
        </div>
        <ul class="dx-worlds" aria-label="${T('Subject worlds', 'عوالم المواد')}">${subs.map(S => `<li><a href="#/subject/${S.id}" data-world-go="${S.id}" style="--h:${HUE[S.id] || 220}">${GLYPH[S.id] || '•'} <span>${esc(T(S.name, S.ar))}</span></a></li>`).join('')}</ul>
        <div class="dx-hero__tools">${LS.envSwitch ? LS.envSwitch() : ''}</div>
      </section>
      <div class="dx-body">
        ${res.length > 1 ? `<section class="dx-sec"><h2 class="dx-h2">${T('Pick up where you left off', 'تابع من حيث توقفت')}</h2><ul class="dx-rail">${res.slice(0, 5).map((r, i) => `<li class="m-rise" style="--i:${i}"><a class="dx-res" href="${r.href}"><b>${esc(r.title)}</b><small>${esc(r.meta || '')}</small>${r.frac ? `<span class="dx-res__bar" style="--f:${Math.round(r.frac * 100)}%"></span>` : ''}</a></li>`).join('')}</ul></section>` : ''}
        ${today ? `<section class="dx-sec dx-today at-subj-${today.subject}"><canvas class="at-world at-world--card" data-world="${today.subject}" aria-hidden="true"></canvas><div class="dx-today__in"><p class="dx-kicker">${T('Experience of the day', 'تجربة اليوم')} · ${esc(LS.expKinds[today.kind] || '')}</p><h2>${esc(today.title)}</h2><p>${esc(today.hook)}</p><a class="ls-btn ls-btn--accent" href="#/exp/${today.id}">${T('Step inside', 'ادخل')} →</a></div></section>` : ''}
        <section class="dx-sec"><div class="dx-sec__h"><h2 class="dx-h2">${T('Discover', 'اكتشف')} <small>${X.length} ${T('interactive experiences', 'تجربة تفاعلية')} · ${tried.size} ${T('tried', 'جرّبت')}</small></h2>
          <div class="dx-filter" role="group" aria-label="${T('Filter experiences', 'صفّ التجارب')}"><button type="button" data-fk="" aria-pressed="true">${T('All', 'الكل')}</button>${kinds.map(k => `<button type="button" data-fk="${k}" aria-pressed="false">${esc(LS.expKinds[k] || k)}</button>`).join('')}</div>
          <div class="dx-filter" role="group" aria-label="${T('Filter by subject', 'حسب المادة')}"><button type="button" data-fs="" aria-pressed="true">${T('Every subject', 'كل المواد')}</button>${subs.map(S => `<button type="button" data-fs="${S.id}" aria-pressed="false" style="--h:${HUE[S.id]}">${esc(T(S.name, S.ar))}</button>`).join('')}</div></div>
          <ul class="dx-grid"></ul><p class="dx-more"><button type="button" class="ls-btn ls-btn--quiet" data-more>${T('Show all', 'أظهر الكل')}</button></p></section>
        <section class="dx-sec dx-links"><a href="#/journey" class="dx-link"><b>${T('Knowledge map', 'خريطة المعرفة')}</b><small>${T('See how your topics connect', 'كيف ترتبط المواضيع')}</small></a><a href="#/archive" class="dx-link"><b>${T('Saved discoveries', 'الاكتشافات المحفوظة')}</b><small>${(d.archive || []).length} ${T('saved', 'محفوظة')}</small></a><a href="handwriting.html" class="dx-link"><b>${T('Handwriting Studio', 'استوديو الكتابة')}</b><small>${T('Sketch, write, graph and draw', 'ارسم واكتب')}</small></a></section>
        <section class="dx-sec dx-plan"><h2 class="dx-h2">${T('Your plan & progress', 'خطتك وتقدمك')}</h2><div class="dx-plan__in"></div></section>
      </div></div>`;
    // the earlier Home (consent, today's plan, momentum…) lives on, below
    if (LS.homeView) { const box = view.querySelector('.dx-plan__in'); const shim = document.createElement('div'); LS.homeView(shim); shim.querySelectorAll('.at-open').forEach(n => n.remove()); box.appendChild(shim); }
    // discovery grid with filters
    let fk = '', fs = '', all = false; const grid = view.querySelector('.dx-grid');
    const mix = L => { const by = {}; L.forEach(x => (by[x.subject] = by[x.subject] || []).push(x)); const out = [], keys = Object.keys(by); for (let i = 0; out.length < L.length; i++) keys.forEach(k => { if (by[k][i]) out.push(by[k][i]); }); return out; };
    const paint = () => { const list = mix(X.filter(x => (!fk || x.kind === fk) && (!fs || x.subject === fs))); grid.innerHTML = list.slice(0, all ? 999 : 12).map(expCard).join('') || `<li class="dx-empty">${T('Nothing matches — try another filter.', 'لا نتائج.')}</li>`; view.querySelector('.dx-more').hidden = all || list.length <= 12; };
    view.querySelectorAll('.dx-filter').forEach(f => f.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; f.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); if ('fk' in b.dataset) fk = b.dataset.fk; if ('fs' in b.dataset) fs = b.dataset.fs; all = false; paint(); }));
    view.querySelector('[data-more]').addEventListener('click', () => { all = true; paint(); });
    paint();
    // instant search
    const inp = view.querySelector('.dx-search__in'), out = view.querySelector('.dx-search__res');
    const pool = X.map(x => ({ h: '#/exp/' + x.id, t: x.title, k: LS.expKinds[x.kind] || '', s: x.hook, q: (x.title + ' ' + x.hook + ' ' + x.subject).toLowerCase() }))
      .concat((LS.lessons || []).map(L => ({ h: '#/topic/' + L.id, t: L.title, k: T('Topic', 'موضوع'), s: L.topic || '', q: (L.title + ' ' + (L.topic || '') + ' ' + (L.subject || '')).toLowerCase() })))
      .concat(subs.map(S => ({ h: '#/subject/' + S.id, t: T(S.name, S.ar), k: T('Subject world', 'عالم'), s: S.blurb || '', q: (S.name + ' ' + (S.topics || []).join(' ')).toLowerCase() })));
    let sel = -1;
    const show = () => { const v = inp.value.trim().toLowerCase(); if (!v) { out.hidden = true; return; } const words = v.split(/\s+/); const hits = pool.filter(p => words.every(w => p.q.includes(w))).slice(0, 8); sel = -1;
      out.innerHTML = hits.length ? hits.map((p, i) => `<li role="option" id="dxo${i}"><a href="${p.h}"><b>${esc(p.t)}</b><small>${esc(p.k)} — ${esc(p.s.slice(0, 80))}</small></a></li>`).join('') : `<li class="dx-empty">${T('No matches yet', 'لا نتائج')}</li>`; out.hidden = false; };
    inp.addEventListener('input', show); inp.addEventListener('focus', show);
    inp.addEventListener('keydown', e => { const items = [...out.querySelectorAll('a')]; if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(1, items.length); items.forEach((a, i) => a.classList.toggle('is-sel', i === sel)); } if (e.key === 'Enter' && items.length) { e.preventDefault(); (items[sel] || items[0]).click(); } if (e.key === 'Escape') { out.hidden = true; } });
    document.addEventListener('click', e => { if (!e.target.closest('.dx-search')) out.hidden = true; }, { once: false });
    if (LS.paintWorlds) LS.paintWorlds(view);
    hero = orrery(view.querySelector('.dx-orrery'), view);
  }

  /* ---------- the orrery ---------- */
  function orrery(cv, view) {
    if (!cv) return null; const g = cv.getContext('2d'); const subs = LS.subjectsList || []; let W = 0, H = 0, dpr = 1, raf = 0, last = 0, vis = true, hover = null, dive = null, born = performance.now();
    const fresh = sessionStorage.getItem('ls-dx-born') !== '1'; try { sessionStorage.setItem('ls-dx-born', '1'); } catch (e) { /* none */ }
    const stars = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), tw: Math.random() * 6 }));
    const P = subs.map((S, i) => ({ id: S.id, name: T(S.name, S.ar), h: HUE[S.id] || 220, ring: i % 3, a: i / subs.length * Math.PI * 2 + (i % 3) * 0.6, r: 0, sp: 0.05 + (2 - (i % 3)) * 0.018, sz: 15 + ((i * 7) % 5) * 2.2 }));
    const fit = () => { const r = cv.getBoundingClientRect(); dpr = Math.min(1.75, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    fit(); const ro = new ResizeObserver(() => { fit(); if (reduced()) draw(0); }); ro.observe(cv);
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) kick(); }); io.observe(cv);
    const centre = () => [W > 900 ? W * 0.66 : W * 0.5, H * (W > 900 ? 0.5 : 0.62)];
    const pos = (p, t) => { const [cx, cy] = centre(), base = Math.min(W > 900 ? W * 0.3 : W * 0.46, H * 0.42), R = base * (0.42 + p.ring * 0.27), grow = fresh && !reduced() ? Math.min(1, (t - born) / 1400) : 1, e = 1 - Math.pow(1 - grow, 3), a = p.a + (reduced() ? 0 : t / 1000 * p.sp) + (1 - e) * 2.4;
      return [cx + Math.cos(a) * R * e, cy + Math.sin(a) * R * 0.38 * e, Math.sin(a)]; };
    function draw(t) {
      const dark = true; const [cx, cy] = centre();
      const bg = g.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H)); bg.addColorStop(0, '#1b2350'); bg.addColorStop(0.45, '#0c1130'); bg.addColorStop(1, '#05060f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      stars.forEach(s => { const px = (s.x * W + (hover ? 0 : 0)) % W, py = s.y * H, a = 0.25 + 0.55 * s.z * (0.6 + 0.4 * Math.sin(t / 900 + s.tw)); g.fillStyle = `rgba(220,228,255,${a})`; g.fillRect(px, py, 1 + s.z, 1 + s.z); });
      for (let k = 0; k < 3; k++) { const base = Math.min(W > 900 ? W * 0.3 : W * 0.46, H * 0.42), R = base * (0.42 + k * 0.27); g.strokeStyle = 'rgba(160,180,255,.14)'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, R, R * 0.38, 0, 0, 7); g.stroke(); }
      const core = g.createRadialGradient(cx, cy, 2, cx, cy, 70); core.addColorStop(0, 'rgba(255,240,200,.95)'); core.addColorStop(0.25, 'rgba(255,190,120,.55)'); core.addColorStop(1, 'rgba(255,150,80,0)'); g.fillStyle = core; g.beginPath(); g.arc(cx, cy, 70 + Math.sin(t / 700) * 3, 0, 7); g.fill();
      g.fillStyle = '#fff6e4'; g.font = '700 13px ui-sans-serif, system-ui'; g.textAlign = 'center'; g.fillText('ERLY', cx, cy + 4);
      const order = P.map(p => [p, pos(p, t)]).sort((a, b) => a[1][2] - b[1][2]); const labels = [];
      order.forEach(([p, [x, y, depth]]) => { const s = p.sz * (0.85 + 0.25 * (depth + 1) / 2) * (hover === p.id ? 1.35 : 1); p._x = x; p._y = y; p._s = s;
        const sh = g.createRadialGradient(x - s * 0.35, y - s * 0.35, s * 0.1, x, y, s); sh.addColorStop(0, `hsl(${p.h} 85% 78%)`); sh.addColorStop(0.6, `hsl(${p.h} 65% 52%)`); sh.addColorStop(1, `hsl(${p.h} 60% 22%)`);
        if (hover === p.id) { g.fillStyle = `hsla(${p.h},90%,70%,.22)`; g.beginPath(); g.arc(x, y, s * 1.9, 0, 7); g.fill(); }
        g.fillStyle = sh; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
        if (p.id === 'physics' || p.id === 'more') { g.strokeStyle = `hsla(${p.h},70%,80%,.6)`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, s * 1.7, s * 0.45, -0.3, 0, 7); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.95)'; g.font = `700 ${Math.round(s * 0.75)}px ui-sans-serif, system-ui`; g.textBaseline = 'middle'; g.fillText(GLYPH[p.id] || '', x, y + 1); g.textBaseline = 'alphabetic';
        const lw = p.name.length * 6.4, lr = [x - lw / 2, y + s + 5, lw, 15]; const free = !labels.some(o => lr[0] < o[0] + o[2] && o[0] < lr[0] + lr[2] && lr[1] < o[1] + o[3] && o[1] < lr[1] + lr[3]); if (hover === p.id || (W > 1100 && free)) labels.push(lr);
        if (hover === p.id || (W > 1100 && free)) { g.font = `${hover === p.id ? 700 : 500} 12px ui-sans-serif, system-ui`; g.fillStyle = hover === p.id ? '#fff' : 'rgba(220,228,255,.7)'; g.fillText(p.name, x, y + s + 16); } });
      if (dive) { const k = Math.min(1, (t - dive.t0) / 650), e = k * k * (3 - 2 * k); const p = P.find(q => q.id === dive.id); g.fillStyle = `hsla(${p.h},70%,${30 + 20 * e}%,${e})`; g.beginPath(); g.arc(p._x, p._y, p._s + e * Math.hypot(W, H), 0, 7); g.fill(); if (k >= 1 && !dive.done) { dive.done = true; location.hash = '#/subject/' + dive.id; } }
    }
    const frame = t => { raf = 0; if (!cv.isConnected) { stop(); return; } if (!vis || document.hidden) return; if (t - last >= 24) { last = t; draw(t); } kick(); };
    function kick() { if (reduced()) { draw(performance.now()); return; } if (!raf) raf = requestAnimationFrame(frame); }
    function stop() { cancelAnimationFrame(raf); raf = 0; ro.disconnect(); io.disconnect(); }
    const pick = e => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = null, bd = 1e9; P.forEach(p => { const d = Math.hypot(p._x - x, p._y - y); if (d < (p._s || 16) + 10 && d < bd) { bd = d; best = p; } }); return best; };
    cv.addEventListener('pointermove', e => { const p = pick(e); hover = p ? p.id : null; cv.style.cursor = p ? 'pointer' : ''; view.querySelectorAll('[data-world-go]').forEach(a => a.classList.toggle('is-hot', a.dataset.worldGo === hover)); if (reduced()) draw(performance.now()); });
    cv.addEventListener('pointerleave', () => { hover = null; });
    cv.addEventListener('click', e => { const p = pick(e); if (p) go(p.id); });
    function go(id) { if (reduced()) { location.hash = '#/subject/' + id; return; } dive = { id, t0: performance.now() }; kick(); }
    view.querySelectorAll('[data-world-go]').forEach(a => { a.addEventListener('mouseenter', () => { hover = a.dataset.worldGo; }); a.addEventListener('focus', () => { hover = a.dataset.worldGo; kick(); }); a.addEventListener('mouseleave', () => { hover = null; }); a.addEventListener('click', e => { if (reduced() || e.metaKey || e.ctrlKey) return; e.preventDefault(); go(a.dataset.worldGo); }); });
    kick(); draw(performance.now());
    return { stop, go, _P: P };
  }

  LS.route('home', dash);
  LS.dashOrrery = () => hero;
})();
