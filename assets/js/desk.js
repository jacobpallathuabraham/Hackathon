/* ERLY — "Your desk" (v23): the first thing on the student portal.
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

  function render() {
    const d = gather(), n = nextStep(d), hr = new Date().getHours();
    const hello = hr < 12 ? T('Good morning', 'صباح الخير') : hr < 18 ? T('Good afternoon', 'مساء الخير') : T('Good evening', 'مساء الخير');
    host.innerHTML = `<div class="wrap desk__in">
      <header class="desk__head"><p class="desk__date">${esc(new Date().toLocaleDateString(window.I18N && I18N.lang === 'ar' ? 'ar' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h1 class="desk__h">${hello}.</h1></header>
      <div class="desk__grid">
        <a class="desk__next" href="${n.href}"><span class="desk__k">${n.k}</span><span class="desk__t">${n.h}</span><span class="desk__p">${n.p}</span><span class="desk__go">${n.cta} <span aria-hidden="true">→</span></span></a>
        <ul class="desk__tiles">${tiles(d).map(t => `<li><a href="${t.href}"><span class="desk__ic" aria-hidden="true">${t.ic}</span><span><b>${t.name}</b><small>${t.line}</small></span></a></li>`).join('')}</ul>
      </div>
      <nav class="desk__jump" aria-label="${T('On this page', 'في هذه الصفحة')}"><span>${T('Also here', 'هنا أيضاً')}:</span> <a href="#games">${T('Learning Games', 'ألعاب التعلم')}</a> <a href="#videos">${T('Videos', 'الفيديوهات')}</a> <a href="#ramp">${T('Tiny first steps', 'خطوات أولى صغيرة')}</a> <a href="#handoff">${T('Talk to someone', 'تحدّث مع أحد')}</a> <a href="#privacy">${T('Privacy', 'الخصوصية')}</a> <a href="#top">${T('How ERLY works', 'كيف يعمل إيرلي')}</a></nav>
      <p class="desk__note">${d.any ? T('Read from this browser only. Nothing here is sent anywhere or scored.', 'تُقرأ من هذا المتصفح فقط. لا يُرسل شيء ولا يُقيَّم.') : T('Nothing is saved in this browser yet, so this desk is empty — it fills in only from what you choose to save on this device.', 'لا شيء محفوظ في هذا المتصفح بعد — يمتلئ هذا المكتب فقط مما تختار حفظه على هذا الجهاز.')}</p>
    </div>`;
  }
  render();
  document.addEventListener('erly:lang', render);
  addEventListener('storage', render);
  addEventListener('pageshow', e => { if (e.persisted) render(); });
})();
