/* ERLY — playful bits shared by the games, reader and insight:
   the mascot ("Sunny"), confetti, tiny synthesized sounds and floating stars. */
(function () {
  'use strict';

  /* ---------- mascot ---------- */
  const FACES = {
    happy: '<path d="M38 58q12 11 24 0" class="m-mouth"/>',
    wow: '<ellipse cx="50" cy="61" rx="6" ry="7" class="m-o"/>',
    think: '<path d="M40 61h18" class="m-mouth"/>',
    oops: '<path d="M39 63q11-8 22 0" class="m-mouth"/>',
    sleepy: '<path d="M41 60q9 5 18 0" class="m-mouth"/>'
  };
  function mascot(mood = 'happy', cls = '') {
    const eyes = mood === 'sleepy'
      ? '<path d="M33 45q5 4 10 0M57 45q5 4 10 0" class="m-mouth"/>'
      : '<g class="m-eyes"><ellipse cx="38" cy="45" rx="4.6" ry="6"/><ellipse cx="62" cy="45" rx="4.6" ry="6"/><circle cx="39.6" cy="42.6" r="1.6" fill="#fff"/><circle cx="63.6" cy="42.6" r="1.6" fill="#fff"/></g>';
    return `<svg class="mascot ${cls}" data-mood="${mood}" viewBox="0 0 100 100" aria-hidden="true">
      <g class="m-rays">${Array.from({ length: 10 }, (_, i) => `<rect x="47" y="2" width="6" height="13" rx="3" transform="rotate(${i * 36} 50 50)"/>`).join('')}</g>
      <circle cx="50" cy="50" r="31" class="m-body"/>
      <ellipse cx="29" cy="58" rx="5" ry="3" class="m-blush"/><ellipse cx="71" cy="58" rx="5" ry="3" class="m-blush"/>
      ${eyes}${FACES[mood] || FACES.happy}
    </svg>`;
  }
  function setMood(el, mood) {
    if (!el) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = mascot(mood, el.getAttribute('class').replace('mascot', '').trim());
    const n = wrap.firstElementChild;
    el.replaceWith(n);
    n.classList.add('m-bounce');
    return n;
  }

  /* ---------- sound (WebAudio, off by default until a click) ---------- */
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('erly-mute') === '1'; } catch (e) {}
  function tone(freqs, dur = 0.12, type = 'sine', vol = 0.08) {
    if (muted) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime;
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * dur * 0.7);
        g.gain.linearRampToValueAtTime(vol, t + i * dur * 0.7 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * dur * 0.7 + dur);
        o.connect(g).connect(ctx.destination);
        o.start(t + i * dur * 0.7); o.stop(t + i * dur * 0.7 + dur + 0.02);
      });
    } catch (e) {}
  }
  const sfx = {
    good: () => tone([660, 880], 0.11, 'triangle'),
    soft: () => tone([330, 262], 0.13, 'sine', 0.05),
    pop: () => tone([520], 0.07, 'square', 0.035),
    tick: () => tone([880], 0.05, 'sine', 0.04),
    win: () => tone([523, 659, 784, 1046], 0.14, 'triangle'),
    toggle() { muted = !muted; try { localStorage.setItem('erly-mute', muted ? '1' : '0'); } catch (e) {} return muted; },
    get muted() { return muted; }
  };

  /* ---------- confetti & floating text ---------- */
  const COLORS = ['#E8774D', '#4DB3A8', '#E2BA4A', '#9D8BD6', '#F3A6B5'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function confetti(target, n = 26) {
    if (reduce) return;
    const r = (target || document.body).getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'confetti';
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 140;
      p.style.cssText = `left:${cx}px;top:${cy}px;background:${COLORS[i % COLORS.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 60}px;--r:${Math.random() * 720 - 360}deg;${Math.random() > .5 ? 'border-radius:50%;' : ''}`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1100);
    }
  }
  function floatText(target, text, cls = '') {
    if (!target) return;
    const r = target.getBoundingClientRect();
    const f = document.createElement('span');
    f.className = 'float-txt ' + cls;
    f.textContent = text;
    f.style.left = r.left + r.width / 2 + 'px';
    f.style.top = r.top + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  window.FUN = { mascot, setMood, sfx, confetti, floatText };
})();
