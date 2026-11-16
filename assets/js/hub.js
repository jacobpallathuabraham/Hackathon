/* ERLY · student action hub — "Continue learning" from the Learning Studio's own local data, and the Ask Noor tile. */
(() => {
  'use strict';
  const T = (en, ar) => (document.documentElement.lang === 'ar' ? ar : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LESSONS = { 'bio-heart': ['The heart and double circulation', 6], 'bio-photo': ['Photosynthesis and limiting factors', 3], 'chem-ph': ['Acids, bases and the pH scale', 4], 'chem-vsepr': ['Shapes of molecules (VSEPR)', 3], 'math-quad': ['Quadratic functions and their graphs', 4], 'math-deriv': ['The derivative as a rate of change', 3], 'phys-newton': ['Newton’s second law: force and acceleration', 3], 'phys-circuits': ['Current, voltage and resistance', 3] };
  function cont() {
    const host = document.getElementById('hubCont'); if (!host) return;
    let d = null; try { d = JSON.parse(localStorage.getItem('erly-learn-v1') || 'null'); } catch (e) { d = null; }
    const L = d && d.lessons ? Object.entries(d.lessons).filter(([id, v]) => v && v.last && !v.completed && LESSONS[id]).sort((a, b) => b[1].last - a[1].last)[0] : null;
    if (!L) { host.hidden = true; return; }
    const [id, v] = L, n = Object.keys(v.done || {}).length, pct = Math.max(0, Math.min(100, Math.round(100 * n / LESSONS[id][1])));
    host.innerHTML = `<a href="learn.html#/lesson/${encodeURIComponent(id)}"><span><b>${T('Continue learning', 'تابع التعلّم')}</b><small>${esc(LESSONS[id][0])} · ${n} ${T('sections done', 'أقسام مكتملة')}</small></span><span class="bar" aria-hidden="true"><i style="width:${pct}%"></i></span><span aria-hidden="true">→</span></a>`;
    host.hidden = false;
  }
  // Growth Plan reminder — only for programmes where the student chose "Show on my ERLY dashboard"
  function growth() {
    const host = document.getElementById('hubCont'); if (!host || !window.ERLY_GROWTH) return;
    let S = null; try { S = JSON.parse(localStorage.getItem('erly-growth-v20') || 'null'); } catch (e) { S = null; }
    if (!S || !S.programmes) return;
    const G = window.ERLY_GROWTH, d = G.iso(new Date());
    const due = Object.values(S.programmes).filter(P => P.cfg && P.cfg.reminders === 'banner' && G.scheduled(P, d) && !G.dayDone(P, d));
    if (!due.length) return;
    host.insertAdjacentHTML('beforeend', due.map(P => `<a href="support.html#/do/${P.id}"><span><b>${T('Growth Plan today', 'خطة النمو اليوم')}</b><small>${esc(G.byId(P.id).title)} · ${T('about', 'نحو')} ${P.cfg.mins} ${T('min', 'دقيقة')}</small></span><span aria-hidden="true">→</span></a>`).join(''));
    host.hidden = false;
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-hub-noor]')) return;
    const C = window.ERLY && ERLY.companion;
    if (C && C.open) C.open('chat'); else location.href = 'learn.html#/noor';
  });
  const boot = () => { cont(); growth(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
