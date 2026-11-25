/* ERLY Learning Studio — load the Visual Lab only when it is needed (v21).
   The 174 computed models (assets/js/lab/, about 1.1 MB of script) are not needed to open the Studio, read, or
   practise. They load the first time something needs them (the Lab, a lesson model, a subject's model list, the
   command palette) — or quietly once the page has settled, so Noor's visuals are ready when a student asks. */
(function () {
  'use strict';
  const LS = window.LS;

  /* The Support Pact's tracker (tracker.js) records reading only while a pact is active. If one is active, load it so
     reading here keeps counting exactly as it did in the Reading Studio; if not, a tiny stand-in records nothing —
     the same outcome as the tracker without a pact, without building its 14-day data on every page load. */
  (function supportPact() {
    let active = false; try { const t = JSON.parse(localStorage.getItem('erly-track-v2') || 'null'); active = !!(t && t.status === 'active'); } catch (e) { /* none */ }
    const E = window.ERLY = window.ERLY || {};
    if (!active) { E.track = E.track || (() => {}); E.isTracking = E.isTracking || (() => false); E.liveValue = E.liveValue || (() => 0); return; }
    const q = []; E.track = (...a) => q.push(a); E.isTracking = () => true; E.liveValue = () => 0;
    const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    ['indicators', 'realtrack', 'tracker'].reduce((a, f) => a.then(() => load(`assets/js/${f}.js?v=19`)), Promise.resolve()).then(() => { q.splice(0).forEach(a => E.track(...a)); }).catch(() => {});
  })();
  const FILES = ['lab-core', 'lab-math', 'lab-geo3d', 'lab-physics', 'lab-problems', 'lab-concepts', 'syl-core', 'syl-math', 'syl-physics', 'syl-chem', 'syl-life', 'syl-applied', 'syl-extra', 'syl-studio'];
  const V = '?v=37';
  let p = null;
  const one = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
  LS.needLab = () => {
    if (window.ERLY_LAB && window.ERLY_LAB.engines && window.ERLY_LAB.engines.length > 100) return Promise.resolve(window.ERLY_LAB);
    if (!p) p = FILES.reduce((acc, f) => acc.then(() => one(`assets/js/lab/${f}.js${V}`)), Promise.resolve()).then(() => { LS.emit('lab-ready'); return window.ERLY_LAB; }).catch(e => { p = null; throw e; });
    return p;
  };
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1500));
  // preload a few seconds after the page has settled, so it never competes with the first interactions…
  addEventListener('load', () => setTimeout(() => idle(() => LS.needLab().catch(() => {}), { timeout: 6000 }), 4000));
  // …or at once when the student turns to Noor, whose visuals use the same models
  document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('.cmp-launch, #atNoorBtn, [data-open-noor]')) LS.needLab().catch(() => {}); }, { capture: true, passive: true });
})();

/* v22: Noor's voice-call mode inside the Studio. The companion's voice button emits 'noor:call', which call.js
   handles — but the call and avatar scripts were never part of learn.html, so since v21 the button did nothing here.
   They are now loaded on the first press (same order as student.html) and the press is replayed. */
(function () {
  'use strict';
  const E = window.ERLY; if (!E || !E.on) return;
  let loading = null;
  const add = (src, module) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; if (module) s.type = 'module'; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); });
  E.on('noor:call', () => {
    if ((E.companion && E.companion.call) || loading) return;
    const B = 'assets/js/companion/';
    loading = ['lipsync', 'photoreal', 'avatar', 'realtime', 'call'].reduce((p, f) => p.then(() => add(B + f + '.js?v=19')), Promise.resolve())
      .then(() => { add(B + 'human3d.js?v=19', true).catch(() => {}); E.emit('noor:call'); })
      .catch(e => { loading = null; console.error('Voice mode could not load', e); if (E.toast) E.toast('Voice mode could not load here. Please try again.'); });
  });
})();
