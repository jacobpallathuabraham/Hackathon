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
    const kids = [...host.children].filter(k => k.getBoundingClientRect().top < innerHeight + 40).slice(0, 8);
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
    // a quick sky: dots that drift towards the viewer, drawn for the length of the entrance only
    const c = el.querySelector('canvas'), g = c.getContext('2d'), dpr = Math.min(1.5, devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; g.scale(dpr, dpr);
    const pts = Array.from({ length: 140 }, () => ({ x: (Math.random() - 0.5) * innerWidth, y: (Math.random() - 0.5) * innerHeight, z: Math.random() * 1 + 0.2 }));
    let t0 = 0, raf = 0;
    const draw = t => { if (!t0) t0 = t; const k = Math.min(1, (t - t0) / 900); g.clearRect(0, 0, innerWidth, innerHeight); const cx = innerWidth / 2, cy = innerHeight / 2;
      pts.forEach(p => { const z = Math.max(0.05, p.z - k * 0.18); const x = cx + p.x / z * 0.35, y = cy + p.y / z * 0.35, r = Math.min(2.2, 0.5 / z); g.fillStyle = `rgba(214,222,255,${0.25 + 0.6 * (1 - z / 1.2)})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
      if (k < 1) raf = requestAnimationFrame(draw); };
    raf = requestAnimationFrame(draw);
    const end = () => { if (!el.isConnected) return; cancelAnimationFrame(raf); el.classList.add('is-out'); root.classList.add('at-entered'); setTimeout(() => el.remove(), 520); };
    el.addEventListener('pointerdown', end); addEventListener('keydown', end, { once: true });
    setTimeout(end, 950);
    root.classList.add('at-entering');
    setTimeout(() => root.classList.remove('at-entering'), 1500);
  }

  LS.on('change', w => { if (w === 'deleted' || w === 'mode' || w === undefined) applyEnv(); });
  applyEnv();
  entrance();
  LS.on('route', () => requestAnimationFrame(() => document.querySelectorAll('[data-focus-toggle]').forEach(b => b.setAttribute('aria-pressed', String(root.classList.contains('at-focus'))))));
})();
