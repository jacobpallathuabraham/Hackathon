/* ERLY Learning Studio — load the Visual Lab only when it is needed (v21).
   The 174 computed models (assets/js/lab/, about 1.1 MB of script) are not needed to open the Studio, read, or
   practise. They load the first time something needs them (the Lab, a lesson model, a subject's model list, the
   command palette) — or quietly once the page has settled, so Noor's visuals are ready when a student asks. */
(function () {
  'use strict';
  const LS = window.LS;
  const FILES = ['lab-core', 'lab-math', 'lab-geo3d', 'lab-physics', 'lab-problems', 'lab-concepts', 'syl-core', 'syl-math', 'syl-physics', 'syl-chem', 'syl-life', 'syl-applied', 'syl-extra', 'syl-studio'];
  const V = '?v=21';
  let p = null;
  const one = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
  LS.needLab = () => {
    if (window.ERLY_LAB && window.ERLY_LAB.engines && window.ERLY_LAB.engines.length > 100) return Promise.resolve(window.ERLY_LAB);
    if (!p) p = FILES.reduce((acc, f) => acc.then(() => one(`assets/js/lab/${f}.js${V}`)), Promise.resolve()).then(() => { LS.emit('lab-ready'); return window.ERLY_LAB; }).catch(e => { p = null; throw e; });
    return p;
  };
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1500));
  addEventListener('load', () => idle(() => LS.needLab().catch(() => {}), { timeout: 4000 }));
})();
