/* ERLY Learning Studio v20 — the application shell.

   A compact navigation rail (Home + six learning environments + Noor + profile), a contextual top bar
   (where you are, universal search, theme, back to ERLY), environment tabs, the first-visit privacy sheet,
   and route transitions. On phones the rail becomes a bottom bar with a "More" sheet.

   Environments:  Read & Resources · Lessons · Visual Lab · Watch & Listen · Practise & Revise · Workspace */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store;
  const I = {
    home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    read: 'M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5m0-13c2-1.5 5-2 8-1.5v13c-3-.5-6 0-8 1.5m0-13v13',
    lessons: 'M4 5h16M4 12h10M4 19h7M17 14l3 3-3 3',
    lab: 'M9 3h6M10 3v6l-5.5 9.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3M7.5 15h9',
    watch: 'M4 6h12v12H4zM16 10l5-3v10l-5-3',
    practise: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-3.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1',
    workspace: 'M4 20l4-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5 16zM14 7l3 3M13 20h7',
    noor: 'M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
    profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0',
    search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm5-2 5 5',
    more: 'M5 12h.01M12 12h.01M19 12h.01'
  };
  const ic = (k, cls) => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls || 'ls-i'}"><path d="${I[k]}"/></svg>`;
  LS.icon = ic;

  // environments, their tabs (routes) and which routes belong to them
  const ENVS = [
    { id: 'home', label: 'Home', ar: 'الرئيسية', icon: 'home', routes: ['home', 'subject', 'topic', 'search'] },
    { id: 'read', label: 'Read', ar: 'اقرأ', long: 'Read & Resources', icon: 'read', routes: ['read', 'library'], tabs: [['read', 'Library'], ['read/readings', 'Readings'], ['read/saved', 'Saved']] },
    { id: 'lessons', label: 'Lessons', ar: 'الدروس', long: 'Interactive Lessons', icon: 'lessons', routes: ['lessons', 'lesson'] },
    { id: 'lab', label: 'Lab', ar: 'المختبر', long: 'Visual Learning Lab', icon: 'lab', routes: ['lab'] },
    { id: 'watch', label: 'Watch', ar: 'شاهد', long: 'Watch & Listen', icon: 'watch', routes: ['video', 'watch'] },
    { id: 'practise', label: 'Practise', ar: 'تدرّب', long: 'Practise & Revise', icon: 'practise', routes: ['practice', 'revise', 'mistakes'], tabs: [['practice', 'Practice'], ['revise', 'Flashcards'], ['mistakes', 'Mistakes']] },
    { id: 'workspace', label: 'Workspace', ar: 'مساحتي', long: 'My Study Workspace', icon: 'workspace', routes: ['notebook', 'paths', 'progress'], tabs: [['notebook', 'Notebook'], ['paths', 'Learning paths'], ['progress', 'My progress']] }
  ];
  const envOf = area => ENVS.find(e => e.routes.includes(area)) || (area === 'noor' ? { id: 'noor', long: 'Noor Tutor' } : area === 'profile' ? { id: 'profile', long: 'Profile, privacy & data' } : ENVS[0]);
  LS.envOf = envOf; LS.ENVS = ENVS;

  function shell() {
    const rail = document.getElementById('lsRail');
    rail.innerHTML = `<a class="lsr__brand" href="#/home" aria-label="${T('Learning Studio home', 'الرئيسية')}"><img src="assets/img/erly-mark.svg" alt=""></a>
      <nav class="lsr__nav" aria-label="${T('Learning Studio', 'استوديو التعلم')}"><ul>${ENVS.map(e => `<li><a href="#/${e.id === 'home' ? 'home' : e.tabs ? e.tabs[0][0] : e.routes[0]}" data-env="${e.id}" title="${esc(e.long || e.label)}">${ic(e.icon)}<span>${T(e.label, e.ar)}</span><i class="lsr__badge" data-badge="${e.id}" hidden></i></a></li>`).join('')}</ul></nav>
      <div class="lsr__foot"><a href="#/noor" data-env="noor" title="Noor Tutor">${ic('noor')}<span>Noor</span></a><a href="#/profile" data-env="profile" title="${T('Profile, privacy & data', 'الملف والخصوصية')}">${ic('profile')}<span>${T('You', 'أنت')}</span></a></div>`;
    const mob = document.getElementById('lsMob');
    mob.innerHTML = ['home', 'read', 'lessons', 'practise'].map(id => { const e = ENVS.find(x => x.id === id); return `<a href="#/${id === 'home' ? 'home' : e.tabs ? e.tabs[0][0] : e.routes[0]}" data-env="${id}">${ic(e.icon)}<span>${T(e.label, e.ar)}</span></a>`; }).join('') + `<button type="button" data-more aria-expanded="false" aria-controls="lsSheet">${ic('more')}<span>${T('More', 'المزيد')}</span></button>`;
    const sheet = document.getElementById('lsSheet');
    sheet.innerHTML = `<div class="lss__box" role="dialog" aria-modal="true" aria-label="${T('More places', 'أماكن أخرى')}"><ul>${ENVS.filter(e => !['home', 'read', 'lessons', 'practise'].includes(e.id)).concat([{ id: 'noor', long: 'Noor Tutor', icon: 'noor', routes: ['noor'] }, { id: 'profile', long: 'Profile, privacy & data', icon: 'profile', routes: ['profile'] }]).map(e => `<li><a href="#/${e.tabs ? e.tabs[0][0] : e.routes[0]}" data-env="${e.id}">${ic(e.icon)}<span>${esc(e.long || e.label)}</span></a></li>`).join('')}</ul><a class="lss__back" href="student.html">← ${T('Back to ERLY', 'العودة إلى ERLY')}</a></div>`;
    const toggleSheet = on => { document.body.classList.toggle('ls-sheet-on', on); sheet.hidden = !on; mob.querySelector('[data-more]').setAttribute('aria-expanded', on); if (on) sheet.querySelector('a').focus(); };
    mob.querySelector('[data-more]').addEventListener('click', () => toggleSheet(sheet.hidden));
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('a')) toggleSheet(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) { toggleSheet(false); mob.querySelector('[data-more]').focus(); } });
    rail.addEventListener('click', e => { if (e.target.closest('[data-env="noor"]') && e.altKey) { e.preventDefault(); if (window.ERLY && ERLY.companion) ERLY.companion.open('chat'); } });
    LS.search.mount(document.getElementById('lsSearch'));
    LS.on('route', ({ area, parts }) => { const p = parts.slice(1); mark(area, p); crumbs(area, p); tabs(area, p); badges(); banner(); });
    LS.on('change', () => badges());
  }
  function mark(area) {
    const env = envOf(area).id;
    document.querySelectorAll('[data-env]').forEach(a => { if (a.dataset.env === env) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.body.dataset.env = env;
  }
  // breadcrumb: Studio / Environment / (subject) / page
  function crumbs(area, parts) {
    const el = document.getElementById('lsCrumbs'); if (!el) return; const env = envOf(area), c = [];
    if (env.id !== 'home') c.push([env.long || env.label, `#/${env.tabs ? env.tabs[0][0] : (env.routes || [area])[0]}`]);
    if (area === 'lesson') { const L = LS.lesson(parts[0]); if (L) { const S = LS.subjectOf(L.subject); if (S) c.splice(0, 0, [S.name, '#/subject/' + S.id]); c.push([L.title, `#/lesson/${L.id}`]); } }
    if (area === 'subject') { const S = LS.subjects.find(s => s.id === parts[0]); if (S) c.push([S.name, '#/subject/' + S.id]); }
    if (area === 'topic') { const tp = LS.topic(parts[0]); if (tp) { const S = LS.subjectOf(tp.subject); if (S) c.push([S.name, '#/subject/' + S.id]); c.push([tp.title, '#/topic/' + tp.id]); } }
    if (area === 'lab' && parts[0]) { const e = window.ERLY_LAB && ERLY_LAB.engines.find(x => x.id === parts[0]); if (e) c.push([e.title, '#/lab/' + e.id]); }
    if (area === 'video' && parts[0]) { const v = LS.video.byId(parts[0]); if (v) c.push([v.title, '#/video/' + v.id]); }
    el.innerHTML = `<ol><li><a href="#/home">${T('Learning Studio', 'استوديو التعلم')}</a></li>${c.map(([t, h], i) => `<li>${i === c.length - 1 ? `<span aria-current="page">${esc(t)}</span>` : `<a href="${h}">${esc(t)}</a>`}</li>`).join('')}</ol>`;
  }
  function tabs(area, parts) {
    const el = document.getElementById('lsTabs'), env = envOf(area);
    if (!env.tabs) { el.hidden = true; el.innerHTML = ''; return; }
    const here = [area].concat(parts).join('/');
    const cur = env.tabs.slice().reverse().find(([r]) => here === r || here.startsWith(r + '/')) || env.tabs[0];
    el.hidden = false;
    el.innerHTML = `<nav aria-label="${esc(env.long)}"><ul>${env.tabs.map(([r, l]) => `<li><a href="#/${r}" ${r === cur[0] ? 'aria-current="page"' : ''}>${esc(T(l, l))}</a></li>`).join('')}</ul></nav>`;
  }
  function badges() {
    const now = Date.now(), d = st.data(), due = Object.values(d.cards).filter(c => (c.due || 0) <= now).length, mk = Object.values(d.mistakes).filter(m => !m.laterCorrect).length;
    document.querySelectorAll('[data-badge="practise"]').forEach(b => { const n = due + mk; b.hidden = !n; b.textContent = n; b.setAttribute('aria-label', `${due} cards due, ${mk} mistakes to revisit`); });
  }
  function banner() {
    const b = document.getElementById('lsBanner'); if (!b) return;
    if (st.mode() === 'demo') { b.hidden = false; b.innerHTML = `<p><b>${T('Demonstration data', 'بيانات تجريبية')}</b> — ${T('made up for exploring. It is never saved and never mixed with your own learning record.', 'مصطنعة ولا تُحفظ.')} <button type="button" class="ls-btn ls-btn--sm" data-demooff>${T('Back to my own data', 'العودة لبياناتي')}</button></p>`; b.querySelector('[data-demooff]').onclick = () => { st.demo(false); LS.render(); }; }
    else b.hidden = true;
  }

  /* ---------- first visit: a compact sheet, not a wall ---------- */
  LS.consentSheet = () => {
    if (st.consent() || st.mode() === 'demo' || document.querySelector('.ls-first')) return;
    const el = document.createElement('section'); el.className = 'ls-first'; el.setAttribute('aria-labelledby', 'lsFirstH');
    el.innerHTML = `<div class="ls-first__in"><h2 id="lsFirstH">${T('Where should your learning be kept?', 'أين نحفظ تعلمك؟')}</h2>
      <p>${T('Your progress, answers, flashcards and notes help you pick up where you stopped. Choose where they live — you can change this or delete everything at any time in Profile.', 'اختر مكان الحفظ — يمكنك التغيير لاحقاً.')}</p>
      <div class="ls-first__opts"><button type="button" class="ls-btn ls-btn--accent" data-consent="device">${T('Save on this device', 'احفظ على هذا الجهاز')}</button><button type="button" class="ls-btn" data-consent="visit">${T('Just this visit', 'لهذه الزيارة فقط')}</button><button type="button" class="ls-btn ls-btn--quiet" data-demo>${T('Explore with demo data', 'استكشف ببيانات تجريبية')}</button></div>
      <details><summary>${T('What exactly is stored and sent?', 'ما الذي يُخزن ويُرسل؟')}</summary><ul><li>${T('“This device”: kept only in this browser (localStorage). Not sent to ERLY or anyone.', '«هذا الجهاز»: في المتصفح فقط.')}</li><li>${T('“Just this visit”: kept in memory; closing the tab forgets it.', '«هذه الزيارة»: في الذاكرة فقط.')}</li><li>${T('Asking Noor sends only your question and the part of the lesson you selected — on this device, or to the online AI only if you switched it on in Noor’s panel.', 'نور يتلقى سؤالك والنص المحدد فقط.')}</li><li><label class="ls-chk"><input type="checkbox" checked data-insights> ${T('Show me learning insights built from my own answers', 'أظهر رؤى من إجاباتي')}</label></li></ul></details></div>`;
    const host = document.getElementById('lsView'), hero = host.querySelector('.lh__hero'); if (hero) hero.after(el); else host.insertBefore(el, host.firstChild);
  };
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-consent]'); if (c) { const ins = document.querySelector('[data-insights]'); st.setConsent({ store: c.dataset.consent, insights: ins ? ins.checked : true }); st.update(d => { d.settings.insights = ins ? ins.checked : true; }); LS.toast(c.dataset.consent === 'device' ? T('Your learning will be saved on this device.', 'سيُحفظ تعلمك على هذا الجهاز.') : T('Nothing will be stored after this visit.', 'لن يُحفظ شيء.')); const f = document.querySelector('.ls-first'); if (f) { f.classList.add('is-out'); setTimeout(() => LS.render(), 220); } else LS.render(); }
    if (e.target.closest('[data-demo]')) { st.demo(true); LS.render(); }
  });

  /* ---------- theme: the Studio defaults to its dark academic look; the choice is remembered ---------- */
  LS.theme = {
    init() { let t = null; try { t = localStorage.getItem('erly-studio-theme'); } catch (e) { /* blocked */ } document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark'; },
    toggle() { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('erly-studio-theme', n); } catch (e) { /* blocked */ } }
  };

  LS.startShell = shell;
})();
