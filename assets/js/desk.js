/* ERLY — "Your desk" (v23; a deck of cards since v37), right after the Learning Studio on the student portal.
   It reads ONLY what this browser already holds (Learning Studio, Growth Plan, Support Pact, Handwriting Studio), works out
   the one most useful next step, and shows it first. Nothing is sent anywhere, nothing is scored, and when there is no data
   it says so plainly instead of inventing progress. */
(function () {
  'use strict';
  const host = document.getElementById('desk'); if (!host) return;
  const T = (en, ar) => (window.I18N && I18N.t ? I18N.t(en, ar) : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); if (m < 60) return T(`${Math.max(1, m)} min ago`, `قبل ${Math.max(1, m)} دقيقة`); const h = Math.round(m / 60); if (h < 24) return T(`${h} h ago`, `قبل ${h} ساعة`); const d = Math.round(h / 24); return T(d === 1 ? 'yesterday' : `${d} days ago`, d === 1 ? 'أمس' : `قبل ${d} أيام`); };
  const day = ds => { const t = iso(Date.now()), tm = iso(Date.now() + 864e5); if (ds === t) return T('today', 'اليوم'); if (ds === tm) return T('tomorrow', 'غداً'); try { return new Date(ds + 'T12:00').toLocaleDateString(window.I18N && I18N.lang === 'ar' ? 'ar' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return ds; } };
  const ROUTE = { lesson: 'lesson', exp: 'exp', video: 'video', reading: 'read', lab: 'lab', path: 'paths' };

  function gather() {
    const now = Date.now(), today = iso(now);
    const L = read('erly-learn-v1'), G = read('erly-growth-v18'), P = read('erly-track-v2'), H = read('erly-hand-v22');
    const out = { any: false };
    if (L) {
      const recent = (L.recent || []).filter(r => ROUTE[r.type]);
      const due = Object.values(L.cards || {}).filter(c => (c.due == null ? 0 : c.due) <= now).length;
      const toRevisit = Object.values(L.mistakes || {}).filter(m => !m.laterCorrect).length;
      const lessonsDone = Object.values(L.lessons || {}).filter(x => x && x.completed).length;
      out.learn = { last: recent[0] || null, due, toRevisit, lessonsDone, cards: Object.keys(L.cards || {}).length };
      out.any = out.any || !!(recent.length || out.learn.cards || lessonsDone);
    }
    if (G && G.sessions) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes(), toMin = s => { const [h, m] = String(s || '0:0').split(':').map(Number); return h * 60 + m; };
      const todays = G.sessions.filter(s => s.date === today && s.status === 'planned').sort((a, b) => toMin(a.start) - toMin(b.start));
      const later = todays.find(s => toMin(s.end) >= nowMin) || null;
      const next = later || G.sessions.filter(s => s.date > today && s.status === 'planned').sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0] || null;
      const goal = s => s && ((G.profile && G.profile.goals || []).find(g => g.id === s.goalId) || {}).text;
      const weekAgo = iso(now - 6 * 864e5), done = G.sessions.filter(s => s.status === 'done' && s.date >= weekAgo && s.date <= today).length;
      out.grow = { next, today: !!later, goal: goal(next), doneWeek: done };
      out.any = true;
    }
    if (P && P.status && P.status !== 'none') { out.pact = { status: P.status, day: P.day || 0, demo: P.mode === 'demo', paused: !!P.pause }; out.any = true; }
    if (H && H.consent === 'device') { const n = (H.attempts || []).length, dr = !!(H.draft); if (n || dr) { out.hand = { attempts: n, draft: dr }; out.any = true; } }
    return out;
  }

  function nextStep(d) {
    const g = d.grow, l = d.learn;
    if (g && g.next && g.today) return { k: T('Next, from your Growth Plan', 'التالي من خطة النمو'), h: `${esc(g.next.start)}–${esc(g.next.end)} · ${esc(g.next.exercise && g.next.exercise.topic || g.goal || T('Planned session', 'جلسة مخطّطة'))}`, p: T('A session you planned for today. You can move or skip it — the plan adapts.', 'جلسة خططتَ لها اليوم. يمكنك نقلها أو تخطيها — الخطة تتكيف.'), href: 'support.html', cta: T('Open today’s plan', 'افتح خطة اليوم') };
    if (l && l.due >= 3) return { k: T('Next, a short review', 'التالي: مراجعة قصيرة'), h: T(`${l.due} cards are ready to review`, `${l.due} بطاقات جاهزة للمراجعة`), p: T('Spaced review takes a few minutes and is when memory gets stronger.', 'المراجعة المتباعدة تستغرق دقائق، وهي ما يقوّي الذاكرة.'), href: 'learn.html#/revise', cta: T('Review now', 'راجع الآن') };
    if (l && l.last) return { k: T('Pick up where you left off', 'تابع من حيث توقفت'), h: esc(l.last.title || T('Your last activity', 'آخر نشاط')), p: T(`In the Learning Studio · ${ago(l.last.at)}`, `في استوديو التعلم · ${ago(l.last.at)}`), href: `learn.html#/${ROUTE[l.last.type]}/${encodeURIComponent(l.last.id)}`, cta: T('Continue', 'تابع') };
    if (l && l.toRevisit) return { k: T('Next', 'التالي'), h: T(`${l.toRevisit} answer${l.toRevisit === 1 ? '' : 's'} worth another look`, `${l.toRevisit} إجابات تستحق نظرة أخرى`), p: T('Mistakes are where the learning is. See what went wrong, and try again.', 'الأخطاء هي مكان التعلم.'), href: 'learn.html#/mistakes', cta: T('Look again', 'انظر مجدداً') };
    return { k: T('A good place to start', 'مكان جيد للبدء'), h: T('Step into a subject world', 'ادخل عالم مادة'), p: T('Try the Newton’s laws lab, dive into a leaf, or open any topic. Nothing is tracked unless you choose to save on this device.', 'جرّب مختبر قوانين نيوتن أو غص داخل ورقة. لا يُتتبع شيء ما لم تختر الحفظ على هذا الجهاز.'), href: 'learn.html#/explore', cta: T('Open the Learning Studio', 'افتح استوديو التعلم') };
  }

  function tiles(d) {
    const l = d.learn, g = d.grow, p = d.pact, h = d.hand, out = [];
    out.push({ ic: 'L', name: T('Learning Studio', 'استوديو التعلم'), href: 'learn.html', line: l && (l.last || l.cards) ? [l.due ? T(`${l.due} card${l.due === 1 ? '' : 's'} due`, `${l.due} بطاقات مستحقة`) : T('No cards due', 'لا بطاقات مستحقة'), l.lessonsDone ? T(`${l.lessonsDone} lesson${l.lessonsDone === 1 ? '' : 's'} finished`, `${l.lessonsDone} دروس مكتملة`) : ''].filter(Boolean).join(' · ') : T('Nothing saved here yet', 'لا شيء محفوظ بعد') });
    out.push({ ic: 'G', name: T('Growth Plan', 'خطة النمو'), href: 'support.html', line: g ? (g.next ? T(`Next: ${day(g.next.date)}, ${g.next.start}`, `التالي: ${day(g.next.date)}، ${g.next.start}`) : T('No sessions planned', 'لا جلسات مخطّطة')) + (g.doneWeek ? T(` · ${g.doneWeek} done in the last 7 days`, ` · ${g.doneWeek} أُنجزت هذا الأسبوع`) : '') : T('Not set up — build one around your week', 'غير مُعدّة — ابنِ واحدة حول أسبوعك') });
    out.push({ ic: 'P', name: T('Support Pact', 'ميثاق الدعم'), href: '#tracking', line: p ? (p.status === 'active' ? (p.paused ? T('Paused', 'متوقف مؤقتاً') : T(`Active · day ${p.day} of 14`, `نشط · اليوم ${p.day} من 14`)) + (p.demo ? T(' · demo data', ' · بيانات تجريبية') : '') : p.status === 'ended' ? T('Finished — your summary is ready', 'انتهى — ملخصك جاهز') : T('Stopped', 'متوقف')) : T('Off — nothing is being noticed', 'متوقف — لا شيء يُلاحظ') });
    out.push({ ic: 'H', name: T('Handwriting Studio', 'استوديو الكتابة اليدوية'), href: 'handwriting.html', line: h ? [h.draft ? T('A draft is waiting', 'مسودة بانتظارك') : '', h.attempts ? T(`${h.attempts} saved session${h.attempts === 1 ? '' : 's'}`, `${h.attempts} جلسات محفوظة`) : ''].filter(Boolean).join(' · ') : T('Write, scan or practise', 'اكتب أو امسح أو تدرّب') });
    return out;
  }

  /* v37: the desk is now a deck of playing cards, dealt face-down onto the table and turned over one by one as you scroll.
     Each card is a place to explore; the first one is your personal next step. On narrow screens and with reduced motion
     they are simply turned as they come into view (or shown face-up). Every card is a real link from the start: focusing
     or pressing a face-down card turns it at once. */
  const SUITS = ['★', '◆', '♣', '♥', '♠', '◆', '♣', '♥'], RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];
  const ICONS = { next: 'compass', L: 'book', G: 'sprout', P: 'shield', H: 'pen', games: 'target', videos: 'play', talk: 'chat' };
  const HUES = { next: 22, L: 232, G: 140, P: 176, H: 268, games: 340, videos: 38, talk: 8 };
  const ic = k => (window.ICON ? ICON(ICONS[k] || 'sparkle') : '');
  function cards(d) {
    const n = nextStep(d), t = tiles(d), byIc = {}; t.forEach(x => { byIc[x.ic] = x; });
    return [
      { k: 'next', cls: ' desk__next', href: n.href, kick: n.k, title: n.h, line: n.p, cta: n.cta },
      { k: 'L', href: byIc.L.href, kick: T('Explore', 'استكشف'), title: byIc.L.name, line: byIc.L.line, cta: T('Step inside', 'ادخل') },
      { k: 'G', href: byIc.G.href, kick: T('Grow', 'انمُ'), title: byIc.G.name, line: byIc.G.line, cta: T('Open plan', 'افتح الخطة') },
      { k: 'P', href: byIc.P.href, kick: T('Notice', 'لاحظ'), title: byIc.P.name, line: byIc.P.line, cta: T('See pact', 'الميثاق') },
      { k: 'H', href: byIc.H.href, kick: T('Write', 'اكتب'), title: byIc.H.name, line: byIc.H.line, cta: T('Open studio', 'افتح الاستوديو') },
      { k: 'games', href: 'games.html', kick: T('Play', 'العب'), title: T('Learning Games', 'ألعاب التعلّم'), line: T('Short games that build reading, memory and focus', 'ألعاب قصيرة تبني القراءة والذاكرة والتركيز'), cta: T('Play now', 'العب الآن') },
      { k: 'videos', href: '#videos', kick: T('Watch', 'شاهد'), title: T('Videos', 'الفيديوهات'), line: T('Lessons where Noor notices the tricky parts', 'دروس يلاحظ فيها نور الأجزاء الصعبة'), cta: T('Watch now', 'شاهد الآن') },
      { k: 'talk', href: '#handoff', kick: T('Talk', 'تحدّث'), title: T('Talk to someone', 'تحدّث مع أحد'), line: T('SAS, a counsellor or someone you trust — your choice', 'خدمات الطلبة أو مرشد أو من تثق به — باختيارك'), cta: T('Get support', 'احصل على الدعم') }
    ];
  }
  const face = (c, i) => `<span class="dk__corner" aria-hidden="true"><b>${RANKS[i]}</b><i>${SUITS[i]}</i></span><span class="dk__corner dk__corner--b" aria-hidden="true"><b>${RANKS[i]}</b><i>${SUITS[i]}</i></span>
      <span class="dk__wm" aria-hidden="true">${SUITS[i]}</span><span class="dk__ic" aria-hidden="true">${ic(c.k)}</span><span class="dk__kick desk__k">${c.kick}</span><span class="dk__t desk__t">${c.title}</span><span class="dk__p desk__p">${c.line}</span><span class="dk__go desk__go">${c.cta} <span aria-hidden="true">→</span></span>`;
  const back = `<span class="dk__back" aria-hidden="true"><span class="dk__lattice"></span><span class="dk__medal"><img src="assets/img/erly-mark.svg" alt=""></span><span class="dk__brand">ERLY</span></span>`;

  function render() {
    const d = gather(), hr = new Date().getHours();
    const hello = hr < 12 ? T('Good morning', 'صباح الخير') : hr < 18 ? T('Good afternoon', 'مساء الخير') : T('Good evening', 'مساء الخير');
    const cs = cards(d);
    host.innerHTML = `<div class="deck__pin"><div class="deck__stage">
      <header class="wrap deck__head"><p class="deck__k desk__date">${esc(new Date().toLocaleDateString(window.I18N && I18N.lang === 'ar' ? 'ar' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${T('Your desk', 'مكتبك')}</p>
        <h2 id="deckH" class="deck__h">${hello}. <em>${T('Where to next?', 'إلى أين بعد ذلك؟')}</em></h2>
        <p class="deck__sub">${T('Scroll and the cards turn over — each one is a place to explore.', 'مرّر لتنقلب البطاقات — كل واحدة مكانٌ تستكشفه.')}</p></header>
      <ol class="deck__table" role="list">${cs.map((c, i) => `<li class="dk" style="--i:${i};--h:${HUES[c.k]}"><div class="dk__in"><a class="dk__front${c.cls || ''}" href="${c.href}">${face(c, i)}</a>${back}</div></li>`).join('')}</ol>
      <p class="deck__note desk__note">${d.any ? T('Read from this browser only. Nothing here is sent anywhere or scored.', 'تُقرأ من هذا المتصفح فقط. لا يُرسل شيء ولا يُقيَّم.') : T('Nothing is saved in this browser yet, so your cards show where to start — they fill in only from what you choose to save on this device.', 'لا شيء محفوظ في هذا المتصفح بعد — تمتلئ البطاقات فقط مما تختار حفظه على هذا الجهاز.')}</p>
    </div></div>`;
    const portal = document.querySelector('.lsx__portal'); if (portal) portal.setAttribute('aria-label', T('Enter the Learning Studio universe', 'ادخل كون استوديو التعلّم'));
    deal();
  }

  /* ---------- dealing and turning ---------- */
  const root = document.documentElement;
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('a11y-still');
  const pinned = () => innerWidth > 860 && innerHeight > 600 && !still();
  let els = [], geo = null, raf = 0, io = null, forced = new Set();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = k => k * k * (3 - 2 * k);
  function measure() { // where each card would sit as part of the deck in the middle of the table
    const table = host.querySelector('.deck__table'); if (!table) return; const tr = table.getBoundingClientRect(), cx = tr.left + tr.width / 2, cy = tr.top + tr.height / 2;
    els.forEach((li, i) => { li.style.setProperty('--dx', '0px'); li.style.setProperty('--dy', '0px'); });
    els.forEach((li, i) => { const r = li.getBoundingClientRect(); li.style.setProperty('--dx', (cx - (r.left + r.width / 2)) + 'px'); li.style.setProperty('--dy', (cy - (r.top + r.height / 2) + i * -1.5) + 'px'); li.style.setProperty('--r', ((i % 2 ? 1 : -1) * (2 + i * 1.3)) + 'deg'); });
  }
  function frame() {
    raf = 0; if (!host.isConnected) return;
    const pin = host.querySelector('.deck__pin'); if (!pin) return;
    const r = pin.getBoundingClientRect(), span = Math.max(1, r.height - innerHeight), p = clamp(-r.top / span, 0, 1);
    // 0 → .22: the deck is dealt onto the table (face-down) · .2 → .92: the cards turn over one after another
    const deal = smooth(clamp(p / 0.22, 0, 1)), n = els.length;
    els.forEach((li, i) => { const a = 0.2 + i * (0.72 / n), f = forced.has(i) ? 1 : smooth(clamp((p - a) / 0.16, 0, 1)), dl = smooth(clamp((deal * (n + 2) - i) / 3, 0, 1));
      const fv = f.toFixed(3), dv = dl.toFixed(3); if (li.__f !== fv) { li.__f = fv; li.style.setProperty('--f', fv); li.classList.toggle('is-up', f > 0.5); } if (li.__d !== dv) { li.__d = dv; li.style.setProperty('--d', dv); } });
  }
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };
  function deal() {
    els = [...host.querySelectorAll('.dk')]; forced = new Set(); if (io) { io.disconnect(); io = null; }
    removeEventListener('scroll', onScroll); host.classList.remove('is-pinned', 'is-flow', 'is-still');
    if (still()) { host.classList.add('is-still'); els.forEach(li => { li.style.setProperty('--f', 1); li.style.setProperty('--d', 1); li.classList.add('is-up'); }); return; }
    if (pinned()) { host.classList.add('is-pinned'); requestAnimationFrame(() => { measure(); frame(); }); addEventListener('scroll', onScroll, { passive: true }); }
    else { host.classList.add('is-flow'); els.forEach(li => { li.style.setProperty('--d', 1); li.style.setProperty('--f', 0); });
      io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const li = e.target; setTimeout(() => { li.style.setProperty('--f', 1); li.classList.add('is-up'); }, 120 + (+li.style.getPropertyValue('--i') % 2) * 140); io.unobserve(li); } }), { threshold: 0.45 }); els.forEach(li => io.observe(li)); }
    // a card that is focused or pressed while face-down turns over straight away
    els.forEach((li, i) => { const a = li.querySelector('.dk__front'); const turn = () => { if (li.classList.contains('is-up')) return false; forced.add(i); li.classList.add('is-forced'); li.style.setProperty('--f', 1); li.classList.add('is-up'); li.__f = '1.000'; return true; };
      a.addEventListener('pointerdown', () => { li.__pd = performance.now(); });
      a.addEventListener('focus', () => { if (performance.now() - (li.__pd || 0) > 500) turn(); }); /* keyboard: turn it so you can read it */
      a.addEventListener('click', e => { if (!turn()) return; e.preventDefault(); setTimeout(() => a.click(), 460); }); }); /* pointer: it turns over, then opens — one press */
  }
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (pinned() !== host.classList.contains('is-pinned')) deal(); else if (pinned()) { measure(); frame(); } }, 150); });
  render();
  // the Learning Studio band's orbits only turn while it is on screen
  const lsx = document.querySelector('.lsx'); if (lsx && 'IntersectionObserver' in window) new IntersectionObserver(es => lsx.classList.toggle('is-vis', es[0].isIntersecting)).observe(lsx); else if (lsx) lsx.classList.add('is-vis');
  document.addEventListener('erly:lang', render);
  addEventListener('storage', render);
  addEventListener('pageshow', e => { if (e.persisted) render(); });
})();
