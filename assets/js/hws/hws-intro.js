/* ERLY Handwriting Studio (v24) — the ink entrance.
   A drop falls, splashes, and flows across the studio as liquid ink (SVG metaballs: blurred circles + an alpha
   threshold), while a calligraphic flourish writes itself; then the ink drains into the pen tool. The overlay never
   takes pointer events, so the canvas is usable from the first frame; any key or pointer press ends it at once.
   Once per session; skipped with reduced motion. */
(function () {
  'use strict';
  const H = window.HWS;
  function run() {
    let seen = false; try { seen = sessionStorage.getItem('hws-intro') === '1'; sessionStorage.setItem('hws-intro', '1'); } catch (e) { /* none */ }
    if (seen || H.reduced()) return;
    const W = innerWidth, Hh = innerHeight, cx = W * 0.5, cy = Hh * 0.46, ink = document.documentElement.dataset.theme === 'dark' ? '#d7dcff' : '#1b2a6b';
    const el = document.createElement('div'); el.className = 'hws-ink'; el.setAttribute('aria-hidden', 'true');
    const N = 22, flourish = `M ${W * 0.12} ${cy + 40} C ${W * 0.25} ${cy - 160}, ${W * 0.38} ${cy + 170}, ${W * 0.5} ${cy} S ${W * 0.7} ${cy - 150}, ${W * 0.78} ${cy + 20} S ${W * 0.9} ${cy + 90}, ${W * 0.9} ${cy - 30}`;
    el.innerHTML = `<svg width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}"><defs><filter id="hwsGoo"><feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b"/><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter></defs>
      <g filter="url(#hwsGoo)" fill="${ink}">${Array.from({ length: N }, () => '<circle r="0"/>').join('')}</g>
      <path class="hws-ink__f" d="${flourish}" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/></svg>`;
    document.body.appendChild(el);
    const cs = [...el.querySelectorAll('circle')], path = el.querySelector('.hws-ink__f'), L = path.getTotalLength(); path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
    const pen = document.querySelector('.hws-tool[data-tool="pen"]'), pr = pen ? pen.getBoundingClientRect() : { left: 30, top: 140, width: 40, height: 40 }, tx = pr.left + pr.width / 2, ty = pr.top + pr.height / 2;
    const seeds = cs.map((c, i) => ({ a: (i / N) * Math.PI * 2, sp: 0.6 + Math.random() * 0.9, r: 10 + Math.random() * 22, off: Math.random() }));
    const ease = k => 1 - Math.pow(1 - k, 3); let t0 = 0, raf = 0, done = false;
    const frame = t => { if (!t0) t0 = t; const ms = t - t0;
      cs.forEach((c, i) => { const s = seeds[i]; let x, y, r;
        if (ms < 320) { const k = ease(ms / 320); x = cx; y = -40 + (cy + 40) * k; r = i === 0 ? 26 : 0; if (i === 1) { y -= 34 * (1 - k); r = 16 * k; } }
        else if (ms < 900) { const k = (ms - 320) / 580, along = Math.min(1, k * s.sp * 1.15 + s.off * 0.15), pt = path.getPointAtLength(L * along), spread = Math.sin(k * Math.PI) * 26; x = pt.x + Math.cos(s.a + k * 4) * spread; y = pt.y + Math.sin(s.a + k * 4) * spread; r = s.r * (1 - 0.35 * k) * (i < 3 ? 1.3 : 1); }
        else { const k = ease(Math.min(1, (ms - 900) / 420)), pt = path.getPointAtLength(L * Math.min(1, s.sp * 1.15 * 0.95)); x = pt.x + (tx - pt.x) * k; y = pt.y + (ty - pt.y) * k; r = s.r * 0.65 * (1 - k) + 2 * (1 - k); }
        c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', Math.max(0, r).toFixed(1)); });
      const fk = Math.min(1, Math.max(0, (ms - 330) / 700)); path.style.strokeDashoffset = L * (1 - ease(fk)); path.style.opacity = ms > 1000 ? Math.max(0, 1 - (ms - 1000) / 300) : 1;
      if (ms > 1350) end(); else raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame);
    function end() { if (done) return; done = true; cancelAnimationFrame(raf); el.classList.add('is-out'); if (pen) { pen.classList.add('is-inked'); setTimeout(() => pen.classList.remove('is-inked'), 700); } setTimeout(() => el.remove(), 380); removeEventListener('pointerdown', end, true); removeEventListener('keydown', end, true); }
    addEventListener('pointerdown', end, true); addEventListener('keydown', end, true); setTimeout(end, 2000);
  }
  H.on('ready', () => requestAnimationFrame(run));
})();
