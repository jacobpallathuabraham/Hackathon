/* ERLY Learning Studio — the motion system (v23).

   Five levels, each with its own timing (tokens in learn-atelier.css, "motion system"):
     1 micro        120 ms   buttons, toggles, focus            — CSS only
     2 UI           220 ms   panels, tabs, drawers, palettes     — CSS only
     3 learning     420–560 ms  entering a subject, a topic, an experiment — View Transitions + staggered reveal
     4 environment  continuous, ≤30 fps, paused when hidden     — ls-worlds.js
     5 simulation   driven by the model itself                  — the experiences
   Rules: transform and opacity only; nothing blocks input (content is interactive from the first frame); every
   transition can be interrupted by the next navigation; all of it is replaced by an instant change when the device
   or the Accessibility panel asks for reduced motion.

   Also here: the Studio entrance (once per visit, skippable, never longer than about a second), the environment
   setting (full · calm · off), and focus mode. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, st = LS.store;
  const root = document.documentElement;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('a11y-still');

  /* ---------- environment setting and focus mode ---------- */
  const envPref = () => (st.data().settings && st.data().settings.env) || 'full';
  function applyEnv() { const v = envPref(); root.dataset.lsEnv = v; if (LS.worlds && LS.worlds.setMode) LS.worlds.setMode(v); }
  LS.setEnv = v => { st.update(d => { d.settings.env = v; }); applyEnv(); LS.announce(T('Environment: ', 'البيئة: ') + ({ full: T('full', 'كاملة'), calm: T('calm (still)', 'هادئة'), off: T('off', 'متوقفة') })[v]); };
  LS.envPref = envPref;
  LS.focus = on => { const v = on == null ? !root.classList.contains('at-focus') : on; root.classList.toggle('at-focus', v); document.querySelectorAll('[data-focus-toggle]').forEach(b => b.setAttribute('aria-pressed', String(v))); LS.announce(v ? T('Focus mode on. Press Escape to leave.', 'وضع التركيز مفعّل.') : T('Focus mode off.', 'وضع التركيز متوقف.')); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('at-focus') && !document.querySelector('.ls-dlg, .at-pal:not([hidden])')) LS.focus(false); });
  document.addEventListener('click', e => { const f = e.target.closest('[data-focus-toggle]'); if (f) { LS.focus(); return; } const v = e.target.closest('[data-env-set]'); if (v) { LS.setEnv(v.dataset.envSet); document.querySelectorAll('[data-env-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.envSet === envPref()))); } });
  LS.envSwitch = () => `<div class="at-envsw" role="group" aria-label="${T('Environment', 'البيئة')}">${[['full', 'Living', 'حيّة'], ['calm', 'Still', 'ساكنة'], ['off', 'Plain', 'بسيطة']].map(([k, en, ar]) => `<button type="button" data-env-set="${k}" aria-pressed="${envPref() === k}">${T(en, ar)}</button>`).join('')}</div>`;

  /* ---------- level 3: route transitions ---------- */
  const orig = LS.render;
  let pendingName = null;
  let lastHash = null;
  LS.render = function () {
    const same = location.hash === lastHash; lastHash = location.hash;
    if (same) { orig(); return; } // a re-render of the same page (a plan item ticked, a setting changed) is instant
    if (reduced() || !document.startViewTransition || !document.getElementById('lsView') || document.hidden) { orig(); stagger(); return; }
    try { const vt = document.startViewTransition(() => { orig(); }); vt.ready.catch(() => {}); /* a skipped transition rejects; the page has still rendered */ vt.updateCallbackDone.then(stagger, stagger); vt.finished.catch(() => {}).finally(() => { pendingName = null; document.querySelectorAll('[style*="view-transition-name"]').forEach(el => { if (el.dataset.vtKeep == null) el.style.viewTransitionName = ''; }); }); }
    catch (e) { orig(); stagger(); }
  };
  removeEventListener('hashchange', orig); addEventListener('hashchange', LS.render);
  // the main blocks of a page rise in, 45 ms apart (only what is on screen; at most 8)
  function stagger() {
    const v = document.getElementById('lsView'); if (!v || reduced()) return;
    const host = v.firstElementChild; if (!host) return;
    const kids = [...host.children].filter(k => !k.hasAttribute('data-no-rise') && k.getBoundingClientRect().top < innerHeight + 40).slice(0, 8); /* data-no-rise: blocks with their own entrance (the universe) */
    kids.forEach((k, i) => { k.classList.remove('m-rise'); void k.offsetWidth; k.style.setProperty('--i', i); k.classList.add('m-rise'); });
  }
  LS.stagger = stagger;
  // shared element: a world card morphs into its world's hero (where View Transitions exist)
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#/subject/"], a[href^="#/topic/"], a[href^="#/exp/"]'); if (!a || reduced() || !document.startViewTransition) return;
    const card = a.querySelector('.at-world, [data-vt]') || a.closest('[data-vt]'); if (!card) return;
    const id = a.getAttribute('href').split('/').pop(); card.style.viewTransitionName = 'world-hero'; pendingName = id;
  }, true);

  /* ---------- the entrance ---------- */
  function entrance() {
    let seen = false; try { seen = sessionStorage.getItem('ls-entered') === '1'; sessionStorage.setItem('ls-entered', '1'); } catch (e) { /* none */ }
    if (seen || reduced() || envPref() === 'off') { root.classList.add('at-entered'); return; }
    const el = document.createElement('div'); el.className = 'at-enter'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<canvas class="at-enter__sky"></canvas><div class="at-enter__mark"><span class="at-enter__k">ERLY</span><span class="at-enter__t">${T('Learning Studio', 'استوديو التعلّم')}</span><span class="at-enter__line"></span></div>`;
    document.body.appendChild(el);
    // act 1 (0–600 ms): stars rush inward as warp streaks · act 2 (450–950): they gather into a ring of light around the mark
    // act 3 (900–1300): the ring opens like an iris and reveals the Studio, whose planets are already spiralling into orbit
    const c = el.querySelector('canvas'), g = c.getContext('2d'), dpr = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; g.scale(dpr, dpr);
    const cx = W / 2, cy = H / 2, R0 = Math.min(W, H) * 0.2, D = 1300;
    const pts = Array.from({ length: 260 }, () => { const a = Math.random() * Math.PI * 2, r = Math.hypot(W, H) * (0.55 + Math.random() * 0.6); return { a, r, s: 0.6 + Math.random() * 0.8, h: 200 + Math.random() * 80, ring: R0 * (0.92 + Math.random() * 0.16) }; });
    let t0 = 0, raf = 0;
    const ease = k => 1 - Math.pow(1 - k, 3);
    const draw = t => { if (!t0) t0 = t; const ms = t - t0, k1 = Math.min(1, ms / 650), k2 = Math.min(1, Math.max(0, (ms - 450) / 500)), k3 = Math.min(1, Math.max(0, (ms - 900) / 400));
      g.clearRect(0, 0, W, H);
      pts.forEach(p => { const rr = p.r + (p.ring - p.r) * ease(k1), a = p.a + k2 * 0.6 * p.s, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, trail = (1 - k1) * 60 * p.s;
        g.strokeStyle = `hsla(${p.h}, 90%, ${70 + 20 * k2}%, ${0.35 + 0.6 * k1})`; g.lineWidth = 1.2 + k2 * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * trail, y + Math.sin(a) * trail); g.stroke(); });
      if (k2 > 0) { const gl = g.createRadialGradient(cx, cy, R0 * 0.6, cx, cy, R0 * 1.4); gl.addColorStop(0, 'rgba(255,220,170,0)'); gl.addColorStop(0.5, `rgba(255,200,140,${0.35 * k2})`); gl.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, R0 * 1.4, 0, 7); g.fill(); }
      el.style.setProperty('--iris', (ease(k3) * Math.hypot(W, H) * 0.75) + 'px');
      if (ms < D) raf = requestAnimationFrame(draw); else end(); };
    raf = requestAnimationFrame(draw);
    const end = () => { if (!el.isConnected) return; cancelAnimationFrame(raf); el.classList.add('is-out'); root.classList.add('at-entered'); setTimeout(() => el.remove(), 420); };
    el.addEventListener('pointerdown', end); addEventListener('keydown', end, { once: true });
    setTimeout(end, D + 200);
    root.classList.add('at-entering');
    setTimeout(() => root.classList.remove('at-entering'), 1500);
  }

  LS.on('change', w => { if (w === 'deleted' || w === 'mode' || w === undefined) applyEnv(); });
  applyEnv();
  entrance();
  LS.on('route', () => requestAnimationFrame(() => document.querySelectorAll('[data-focus-toggle]').forEach(b => b.setAttribute('aria-pressed', String(root.classList.contains('at-focus'))))));
})();
