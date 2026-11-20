/* ERLY Learning Studio — Video Studio.

   ERLY-made video lessons (rendered by tools/make-learn-videos.js from the Studio's own diagrams and models,
   narrated with the open Kokoro voice model, captions generated from the same script) play in a full player:
   chapters, captions, a transcript where clicking a sentence jumps to that moment, bookmarks, notes linked to
   a timestamp, replay of one section, speed, full screen, keyboard controls, and questions on the video.

   External videos (from the main ERLY site's video room) are listed with their publisher and open in
   YouTube's privacy-enhanced player. ERLY does not host them, does not claim rights to them, and cannot show
   a synced transcript for them. */
(function () {
  'use strict';
  const LS = window.LS, esc = LS.esc, T = LS.T, st = LS.store, IL = LS.inline;
  const BASE = 'assets/media/learn/';
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const PROV = { kind: 'erly', author: 'ERLY content team (demonstration)', licence: 'ERLY demonstration content. Narration: Kokoro-82M voice model (Apache-2.0).' };
  const VIDEOS = (LS.VIDEOS = [
    { id: 'erly-heart', title: 'Blood’s double journey through the heart', subject: 'Biology', topic: 'The heart', lesson: 'bio-heart', poster: BASE + 'erly-heart.jpg', src: BASE + 'erly-heart.mp4', vtt: BASE + 'erly-heart.vtt', meta: BASE + 'erly-heart.json', provenance: PROV },
    { id: 'erly-quad', title: 'What a, b and c do to a parabola', subject: 'Mathematics', topic: 'Quadratic functions', lesson: 'math-quad', poster: BASE + 'erly-quad.jpg', src: BASE + 'erly-quad.mp4', vtt: BASE + 'erly-quad.vtt', meta: BASE + 'erly-quad.json', provenance: PROV },
    { id: 'erly-newton', title: 'Force, mass and acceleration', subject: 'Physics', topic: 'Newton’s second law', lesson: 'phys-newton', poster: BASE + 'erly-newton.jpg', src: BASE + 'erly-newton.mp4', vtt: BASE + 'erly-newton.vtt', meta: BASE + 'erly-newton.json', provenance: PROV }
  ]);
  // external videos already used by the main ERLY video room (attributed; embedded with youtube-nocookie)
  const EXTERNAL = (LS.EXTERNAL_VIDEOS = [
    { yt: 'Xb05CaG7TsQ', title: 'First law of thermodynamics & internal energy', by: 'Khan Academy', subject: 'Physics', topic: 'Thermodynamics' },
    { yt: 'E7CwqNHn_Ns', title: 'Taking notes that actually help', by: 'CrashCourse · Study Skills', subject: 'Study skills', topic: 'Note-taking' },
    { yt: 'arj7oStGLkU', title: 'Inside the mind of a master procrastinator', by: 'TED · Tim Urban', subject: 'Study skills', topic: 'Focus' }
  ]);
  const metaCache = {};
  async function meta(v) {
    if (metaCache[v.id]) return metaCache[v.id];
    const p = (async () => {
      const [m, vtt] = await Promise.all([fetch(v.meta).then(r => (r.ok ? r.json() : null)).catch(() => null), fetch(v.vtt).then(r => (r.ok ? r.text() : '')).catch(() => '')]);
      const cues = parseVTT(vtt);
      return Object.assign({ chapters: [], questions: [], cards: [], duration: cues.length ? cues[cues.length - 1].end : 0 }, m || {}, { cues, ok: !!(m && cues.length) });
    })();
    metaCache[v.id] = p; return p;
  }
  function parseVTT(txt) {
    const out = []; const ts = s => { const p = s.trim().split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
    String(txt).replace(/\r/g, '').split(/\n\n+/).forEach(b => { const m = b.match(/([\d:.]+)\s*-->\s*([\d:.]+)[^\n]*\n([\s\S]+)/); if (m) out.push({ start: ts(m[1]), end: ts(m[2]), text: m[3].replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim() }); });
    return out;
  }
  LS.video = { byId: id => VIDEOS.find(v => v.id === id), parseVTT, meta };

  // compact player inside a lesson: native controls + captions + a link to the full studio
  LS.video.mountCompact = (host, id) => {
    const v = LS.video.byId(id); if (!v) return;
    host.innerHTML = `<video class="ls-vid" controls preload="metadata" playsinline poster="${esc(v.poster)}" aria-label="${esc(v.title)}"><source src="${esc(v.src)}" type="video/mp4"><track kind="captions" srclang="en" label="English" src="${esc(v.vtt)}" default>${T('Your browser cannot play this video.', 'لا يمكن تشغيل الفيديو.')}</video><p class="ls-vid__t"><b>${esc(v.title)}</b> · ${LS.provBadge('erly')}</p>`;
    const el = host.querySelector('video'); el.addEventListener('play', () => { st.useFormat('video'); st.touch('video', v.id, v.title); }, { once: true });
    el.addEventListener('error', () => { host.innerHTML = `<p class="ls-fb ls-fb--warn">${T('This video could not be loaded.', 'تعذر تحميل الفيديو.')}</p>`; }, true);
  };

  function list(view) {
    const d = st.data();
    view.innerHTML = `<header class="ls-pagehead"><p class="ls-kicker">${T('Watch', 'شاهد')}</p><h1>${T('Watch, pause, ask, note', 'شاهد وتوقف واسأل ودوّن')}</h1><p class="ls-lead">${T('ERLY video lessons come with captions, a clickable transcript, chapters, bookmarks and questions. Notes you take keep their timestamp.', 'دروس فيديو مع ترجمة ونص وفصول.')}</p></header>
      <section class="ls-grid">${VIDEOS.map(v => { const p = d.video[v.id]; const L = LS.lesson(v.lesson); return `<a class="ls-card ls-card--vid" href="#/video/${v.id}"><span class="ls-card__img"><img src="${esc(v.poster)}" alt="" loading="lazy">${p && p.t ? `<span class="ls-card__resume">${T('Resume at', 'تابع من')} ${fmt(p.t)}</span>` : ''}</span><span class="ls-card__k">${esc(v.subject)} · ${LS.provBadge('erly')}</span><b>${esc(v.title)}</b><small>${L ? T('Linked lesson', 'الدرس المرتبط') + ': ' + esc(L.title) : ''}</small></a>`; }).join('')}</section>
      <section class="ls-panel"><h2 class="ls-h2">${T('External videos', 'فيديوهات خارجية')}</h2><p class="ls-muted">${T('Made by other publishers and played from YouTube’s privacy-enhanced player. ERLY does not host them and has no synced transcript for them.', 'من ناشرين آخرين.')}</p><ul class="ls-extlist">${EXTERNAL.map(x => `<li><button type="button" class="ls-linkbtn" data-yt="${esc(x.yt)}">${esc(x.title)}</button> <span class="ls-muted">— ${esc(x.by)} · ${esc(x.subject)}</span></li>`).join('')}</ul><div class="ls-ytbox" hidden></div></section>`;
    view.querySelector('.ls-extlist').addEventListener('click', e => { const b = e.target.closest('[data-yt]'); if (!b) return; const box = view.querySelector('.ls-ytbox'); box.hidden = false; const x = EXTERNAL.find(y => y.yt === b.dataset.yt); box.innerHTML = `<p class="ls-muted">${T('Loading from youtube-nocookie.com — an external site with its own privacy policy.', 'يُحمّل من موقع خارجي.')}</p><div class="ls-ytframe"><iframe title="${esc(x.title)} — ${esc(x.by)}" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(x.yt)}?rel=0" allow="encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`; st.useFormat('video'); });
  }

  async function player(view, id) {
    const v = LS.video.byId(id); if (!v) { view.innerHTML = `<section class="ls-empty"><h1>${T('Video not found', 'الفيديو غير موجود')}</h1><a class="ls-btn" href="#/video">${T('All videos', 'كل الفيديوهات')}</a></section>`; return; }
    view.innerHTML = `<p class="ls-loading" role="status"><span class="ls-spin" aria-hidden="true"></span>${T('Loading the video…', 'تحميل الفيديو…')}</p>`;
    const M = await meta(v); if (!view.isConnected || LS.current()[1] !== id) return;
    const d = st.data(), vp = d.video[v.id] = d.video[v.id] || { t: 0, bookmarks: [], notes: [] };
    const L = LS.lesson(v.lesson);
    view.innerHTML = `<div class="ls-vs" data-vid="${v.id}">
      <header class="ls-vs__head"><a class="ls-linkbtn" href="#/video">← ${T('Video Studio', 'الاستوديو')}</a><p class="ls-kicker">${esc(v.subject)} · ${esc(v.topic)}</p><h1>${esc(v.title)}</h1><p class="ls-meta">${LS.provBadge('erly')} ${M.duration ? fmt(M.duration) : ''}${L ? ` · <a href="#/lesson/${L.id}">${T('Linked lesson', 'الدرس المرتبط')}: ${esc(L.title)}</a>` : ''}</p></header>
      <div class="ls-vs__main">
        <div class="ls-player" tabindex="-1"><video preload="metadata" playsinline poster="${esc(v.poster)}" aria-label="${esc(v.title)}"><source src="${esc(v.src)}" type="video/mp4"><track kind="captions" srclang="en" label="English" src="${esc(v.vtt)}" default></video>
          <div class="ls-pc" role="group" aria-label="${T('Video controls', 'أدوات الفيديو')}">
            <button type="button" class="ls-pc__b" data-pc="play" aria-label="${T('Play', 'تشغيل')}">▶</button>
            <button type="button" class="ls-pc__b" data-pc="back" aria-label="${T('Back 10 seconds', 'رجوع ١٠ ثوانٍ')}">↺10</button>
            <div class="ls-pc__seek"><input type="range" min="0" max="${Math.ceil(M.duration || 100)}" step="0.1" value="0" aria-label="${T('Seek', 'انتقال')}" data-pc="seek"><div class="ls-pc__chaps" aria-hidden="true">${(M.chapters || []).map(c => `<i style="left:${100 * c.t / (M.duration || 1)}%" title="${esc(c.title)}"></i>`).join('')}</div></div>
            <span class="ls-pc__time" aria-live="off" data-time>0:00 / ${fmt(M.duration)}</span>
            <label class="ls-pc__speed"><span class="sr-only">${T('Speed', 'السرعة')}</span><select data-pc="speed">${[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => `<option value="${s}" ${s === 1 ? 'selected' : ''}>${s}×</option>`).join('')}</select></label>
            <button type="button" class="ls-pc__b" data-pc="cc" aria-pressed="true" aria-label="${T('Captions', 'الترجمة')}">CC</button>
            <button type="button" class="ls-pc__b" data-pc="mute" aria-pressed="false" aria-label="${T('Mute', 'كتم')}">🔊</button>
            <button type="button" class="ls-pc__b" data-pc="fs" aria-label="${T('Full screen', 'ملء الشاشة')}">⛶</button>
          </div>
          <p class="ls-muted ls-small ls-keys">${T('Keys: Space play/pause · ← → 5 s · J / L 10 s · C captions · F full screen · M mute · B bookmark · N note', 'المفاتيح: مسافة تشغيل · ← → ٥ ث')}</p>
        </div>
        <div class="ls-vs__tools"><button type="button" class="ls-btn ls-btn--sm" data-act="bm">🔖 ${T('Bookmark this moment', 'علامة')}</button><button type="button" class="ls-btn ls-btn--sm" data-act="note">✎ ${T('Note at this moment', 'ملاحظة')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-act="sum">${T('Ask Noor to summarise this section', 'لخّص هذا القسم')}</button>${(M.cards || []).length ? `<button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-act="cards">${T('Add this video’s flashcards', 'أضف بطاقات الفيديو')}</button>` : ''}</div>
        ${M.ok ? '' : `<p class="ls-fb ls-fb--warn" role="alert">${T('The transcript for this video could not be loaded.', 'تعذر تحميل النص.')}</p>`}
      </div>
      <aside class="ls-vs__side">
        <div class="ls-tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="tr">${T('Transcript', 'النص')}</button><button role="tab" aria-selected="false" data-tab="ch">${T('Chapters', 'الفصول')}</button><button role="tab" aria-selected="false" data-tab="my">${T('My marks', 'علاماتي')} (<span data-nmarks>${vp.bookmarks.length + vp.notes.length}</span>)</button><button role="tab" aria-selected="false" data-tab="qs">${T('Questions', 'الأسئلة')} (${(M.questions || []).length})</button></div>
        <div class="ls-tabp" data-p="tr" role="tabpanel"><ol class="ls-tr" data-ls-sel data-src-title="${esc(v.title)}">${M.cues.map((c, i) => `<li><button type="button" data-cue="${i}" data-t="${c.start}"><span class="ls-tr__t">${fmt(c.start)}</span> ${esc(c.text)}</button></li>`).join('')}</ol></div>
        <div class="ls-tabp" data-p="ch" role="tabpanel" hidden><ol class="ls-chl">${(M.chapters || []).map((c, i) => `<li><button type="button" class="ls-linkbtn" data-t="${c.t}">${fmt(c.t)} · ${esc(c.title)}</button> <button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-replay="${i}">${T('Replay this section', 'أعد هذا القسم')}</button></li>`).join('')}</ol></div>
        <div class="ls-tabp" data-p="my" role="tabpanel" hidden></div>
        <div class="ls-tabp" data-p="qs" role="tabpanel" hidden><p class="ls-muted ls-small">${T('Each question opens once you have watched past its point in the video.', 'يفتح كل سؤال بعد مشاهدة موضعه.')}</p><div class="ls-vq"></div></div>
      </aside></div>`;
    const root = view.querySelector('.ls-vs'), vid = root.querySelector('video'), seek = root.querySelector('[data-pc="seek"]'), time = root.querySelector('[data-time]'), trl = root.querySelector('.ls-tr');
    let loopEnd = null, lastCue = -1, maxSeen = vp.t || 0;
    vid.addEventListener('error', () => { root.querySelector('.ls-player').insertAdjacentHTML('beforeend', `<p class="ls-fb ls-fb--warn" role="alert">${T('The video file could not be loaded.', 'تعذر تحميل ملف الفيديو.')}</p>`); }, true);
    vid.addEventListener('loadedmetadata', () => { if (vp.t && vp.t < vid.duration - 3) vid.currentTime = vp.t; seek.max = vid.duration; });
    const playBtn = root.querySelector('[data-pc="play"]');
    vid.addEventListener('play', () => { playBtn.textContent = '❚❚'; playBtn.setAttribute('aria-label', T('Pause', 'إيقاف')); st.useFormat('video'); st.touch('video', v.id, v.title); });
    vid.addEventListener('pause', () => { playBtn.textContent = '▶'; playBtn.setAttribute('aria-label', T('Play', 'تشغيل')); vp.t = vid.currentTime; st.save(); });
    vid.addEventListener('timeupdate', () => {
      const t = vid.currentTime; seek.value = t; if (LS.engine && (M.chapters || []).length) { const k = chapterAt(t); const nx = M.chapters[k + 1]; const end = nx ? nx.t : (vid.duration || M.duration); if (t >= end - 0.6 && !(vid._seg || (vid._seg = {}))[k]) { vid._seg[k] = 1; LS.engine.event('video', { id: v.id, chapter: k, mode: 'visual', label: 'Watched: ' + (M.chapters[k].title || 'chapter ' + (k + 1)) }); } } time.textContent = `${fmt(t)} / ${fmt(vid.duration || M.duration)}`;
      if (loopEnd != null && t >= loopEnd) { vid.pause(); loopEnd = null; LS.announce(T('End of the section.', 'نهاية القسم.')); }
      const i = M.cues.findIndex(c => t >= c.start && t < c.end);
      if (i !== lastCue) { lastCue = i; trl.querySelectorAll('.is-now').forEach(x => x.classList.remove('is-now')); if (i >= 0) { const b = trl.querySelector(`[data-cue="${i}"]`); b.parentElement.classList.add('is-now'); if (!trl.matches(':hover')) { const box = trl.closest('.ls-tabp'); const top = b.offsetTop - box.clientHeight / 3; box.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } } }
      if (t > maxSeen) { maxSeen = t; drawQs(); }
      if (Math.abs((vp.t || 0) - t) > 5) { vp.t = t; st.save(); }
    });
    seek.addEventListener('input', () => { vid.currentTime = +seek.value; });
    const go = t => { vid.currentTime = Math.max(0, Math.min((vid.duration || M.duration) - 0.1, t)); };
    const toggle = () => (vid.paused ? vid.play().catch(() => {}) : vid.pause());
    function drawMarks() {
      const p = root.querySelector('[data-p="my"]'), items = vp.bookmarks.map((b, i) => ({ k: 'bm', i, t: b.t, label: b.label })).concat(vp.notes.map((n, i) => ({ k: 'note', i, t: n.t, label: n.text, id: n.id }))).sort((a, b) => a.t - b.t);
      p.innerHTML = items.length ? `<ul class="ls-marks">${items.map(x => `<li><button type="button" class="ls-linkbtn" data-t="${x.t}">${fmt(x.t)}</button> ${x.k === 'bm' ? '🔖' : '✎'} ${esc(x.label)} ${x.id ? `<a href="#/notebook/${x.id}" class="ls-small">${T('in notebook', 'في الدفتر')}</a>` : ''}<button type="button" class="ls-ic" data-delmark="${x.k}:${x.i}" aria-label="${T('Delete', 'احذف')}">×</button></li>`).join('')}</ul>` : `<p class="ls-muted">${T('Bookmarks and notes you add appear here, linked to their moment in the video.', 'تظهر هنا علاماتك.')}</p>`;
      root.querySelector('[data-nmarks]').textContent = items.length;
    }
    const qDone = {};
    function drawQs() {
      const host = root.querySelector('.ls-vq'); (M.questions || []).forEach((x, i) => {
        let slot = host.querySelector(`[data-vq="${i}"]`); if (!slot) { slot = document.createElement('div'); slot.dataset.vq = i; host.appendChild(slot); }
        const open = maxSeen >= x.at - 0.5;
        if (open && !qDone[i]) { qDone[i] = 1; slot.innerHTML = `<p class="ls-small ls-muted">${T('After', 'بعد')} ${fmt(x.at)}</p>`; LS.activity(slot, Object.assign({ lesson: v.lesson, topic: v.topic, subject: v.subject }, x.q), { from: 'practice', lesson: v.lesson, topic: v.topic, subject: v.subject, lessonTitle: v.title }); }
        else if (!open) slot.innerHTML = `<p class="ls-muted ls-small">🔒 ${T('Opens at', 'يفتح عند')} ${fmt(x.at)}</p>`;
      });
    }
    drawMarks(); drawQs();
    function addBookmark() { const t = vid.currentTime, c = M.cues.find(x => t >= x.start && t < x.end); vp.bookmarks.push({ t, label: c ? c.text.slice(0, 60) : fmt(t), at: Date.now() }); st.update(dd => { dd.bookmarks.unshift({ type: 'video', id: v.id, title: v.title, label: `${v.title} — ${fmt(t)}`, where: `#/video/${v.id}/${Math.floor(t)}`, at: Date.now() }); }); drawMarks(); LS.toast(T('Bookmarked at', 'علامة عند') + ' ' + fmt(t)); }
    function addNote() {
      vid.pause(); const t = vid.currentTime;
      const dlg = LS.dialog(`<h2 id="lsDlgT">${T('Note at', 'ملاحظة عند')} ${fmt(t)}</h2><label class="ls-field">${T('Your note', 'ملاحظتك')}<textarea name="n" rows="4" autofocus></textarea></label><div class="ls-row"><button type="button" class="ls-btn ls-btn--accent" data-ok>${T('Save note', 'احفظ')}</button><button type="button" class="ls-btn ls-btn--quiet" data-close>${T('Cancel', 'إلغاء')}</button></div>`);
      dlg.el.querySelector('[data-ok]').onclick = () => { const text = dlg.el.querySelector('[name=n]').value.trim(); if (!text) return; const c = M.cues.find(x => t >= x.start && t < x.end); const nid = LS.notes.create({ title: `${v.title} — ${fmt(t)}`, html: `<p>${esc(text)}</p>${c ? `<blockquote>${esc(c.text)}</blockquote>` : ''}`, folder: 'Video notes', src: { type: 'video', id: v.id, title: `${v.title} at ${fmt(t)}`, where: `#/video/${v.id}/${Math.floor(t)}` } }); vp.notes.push({ t, text: text.slice(0, 80), id: nid }); st.save(); dlg.close(); drawMarks(); LS.toast(T('Note saved with its timestamp.', 'حُفظت الملاحظة.')); };
    }
    function chapterAt(t) { const ch = M.chapters || []; let k = 0; ch.forEach((c, i) => { if (t >= c.t) k = i; }); return k; }
    root.addEventListener('click', e => {
      const pc = e.target.closest('[data-pc]'); if (pc) { const k = pc.dataset.pc;
        if (k === 'play') toggle(); if (k === 'back') go(vid.currentTime - 10);
        if (k === 'cc') { const tr = vid.textTracks[0]; const on = tr.mode !== 'showing'; tr.mode = on ? 'showing' : 'hidden'; pc.setAttribute('aria-pressed', on); }
        if (k === 'mute') { vid.muted = !vid.muted; pc.setAttribute('aria-pressed', vid.muted); pc.textContent = vid.muted ? '🔇' : '🔊'; }
        if (k === 'fs') { const p = root.querySelector('.ls-player'); if (document.fullscreenElement) document.exitFullscreen(); else if (p.requestFullscreen) p.requestFullscreen().catch(() => {}); else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen(); }
        return; }
      const tb = e.target.closest('[data-t]'); if (tb) { go(+tb.dataset.t); vid.play().catch(() => {}); return; }
      const rp = e.target.closest('[data-replay]'); if (rp) { const i = +rp.dataset.replay, ch = M.chapters; go(ch[i].t); loopEnd = i + 1 < ch.length ? ch[i + 1].t : null; vid.play().catch(() => {}); return; }
      const tab = e.target.closest('[data-tab]'); if (tab) { root.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === tab)); root.querySelectorAll('.ls-tabp').forEach(p => { p.hidden = p.dataset.p !== tab.dataset.tab; }); return; }
      const a = e.target.closest('[data-act]'); if (a) { const k = a.dataset.act;
        if (k === 'bm') addBookmark(); if (k === 'note') addNote();
        if (k === 'sum') { const ch = M.chapters || [], i = chapterAt(vid.currentTime), s = ch.length ? ch[i].t : 0, en = i + 1 < ch.length ? ch[i + 1].t : 1e9; LS.noor.ask('summary', { text: M.cues.filter(c => c.start >= s && c.start < en).map(c => c.text).join(' '), title: v.title, section: ch[i] ? ch[i].title : '' }); }
        if (k === 'cards') { const n = LS.cards.addMany(M.cards.map(c => Object.assign({ topic: v.topic, src: { type: 'video', id: v.id, title: v.title } }, c))); LS.toast(n + ' ' + T('cards added.', 'بطاقات أُضيفت.')); }
        return; }
      const dm = e.target.closest('[data-delmark]'); if (dm) { const [k, i] = dm.dataset.delmark.split(':'); (k === 'bm' ? vp.bookmarks : vp.notes).splice(+i, 1); st.save(); drawMarks(); }
    });
    root.querySelector('[data-pc="speed"]').addEventListener('change', e => { vid.playbackRate = +e.target.value; });
    root.addEventListener('keydown', e => {
      if (e.target.closest('input[type=text], textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.matches('input[type=range]') && /Arrow/.test(e.key)) return;
      const k = e.key.toLowerCase();
      if (k === ' ' && !e.target.closest('button, a')) { e.preventDefault(); toggle(); }
      else if (k === 'k') toggle(); else if (k === 'arrowleft') go(vid.currentTime - 5); else if (k === 'arrowright') go(vid.currentTime + 5); else if (k === 'j') go(vid.currentTime - 10); else if (k === 'l') go(vid.currentTime + 10);
      else if (k === 'c') root.querySelector('[data-pc="cc"]').click(); else if (k === 'f') root.querySelector('[data-pc="fs"]').click(); else if (k === 'm') root.querySelector('[data-pc="mute"]').click(); else if (k === 'b') addBookmark(); else if (k === 'n') addNote();
    });
    const off = LS.on('leave', () => { vp.t = vid.currentTime || vp.t; st.save(); vid.pause(); off(); });
    const tParam = +LS.current()[2]; if (isFinite(tParam) && tParam > 0) { if (vid.readyState >= 1) go(tParam); else vid.addEventListener('loadedmetadata', () => go(tParam), { once: true }); }
    if (vid.readyState >= 1) vid.dispatchEvent(new Event('loadedmetadata'));
  }

  LS.route('video', (view, parts) => (parts[0] ? player(view, parts[0]) : list(view)));
})();
