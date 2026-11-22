/* ERLY Learning Studio 2.0 — the universal experience layer: Guided learning, What-if comparisons, full screen, Noor context.

   Guided learning has three modes, switchable at any time without losing progress:
     Discover     — free exploration; after you interact, one short optional insight appears
     Guided       — one step at a time; the control the step talks about is highlighted; the step checks the LIVE model
                    (def.guide[i].done(api)) and offers a specific hint if you change the wrong thing (def.guide[i].hint)
     Independent  — no guidance unless you ask
   Experiences that do not ship authored steps get steps built from their own “Explore” prompts; such a step can only be
   completed after a real interaction with the model (an input, drag or click inside it), never by just pressing Next.
   What-if: “Save as original” keeps the model’s picture and numbers; change any condition; “Compare” shows the two side by
   side with every number that changed. Full screen: the model area, Esc to leave. Progress (step reached, mode) is per
   experience and kept for the session. */
(function () {
  'use strict';
  const LS = window.LS, T = LS.T, esc = LS.esc, IL = s => (LS.inline ? LS.inline(s) : esc(s));
  const MEM = {}; LS.guide = { current: null };
  const nums = s => (String(s).match(/-?\d+(?:[.,]\d+)?/g) || []).map(x => +x.replace(',', '.'));
  function autoSteps(def) { const lines = String(def.explore || '').split('\n').map(l => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean).slice(0, 5); return lines.map((l, i) => ({ t: T('Try this', 'جرّب') + ' ' + (i + 1), say: l, target: '.at-x__stage', interact: true })); }
  function snap(view, M) { if (M._snap) try { return M._snap(); } catch (e) { /* fall through */ } const cv = [...view.querySelectorAll('.at-x__stage canvas')].find(c => c.width > 100); if (!cv) return null; try { if (M._render) M._render(); return cv.toDataURL('image/jpeg', 0.82); } catch (e) { return null; } }

  LS.exp.onMount = function (view, x, def, M) {
    const stage = view.querySelector('.at-x__stage'), model = view.querySelector('.at-x__model'); if (!stage || !model) return;
    const mem = MEM[x.id] = MEM[x.id] || { mode: 'discover', step: 0 };
    const steps = (def.guide && def.guide.length) ? def.guide : autoSteps(def);
    const bar = document.createElement('div'); bar.className = 'gd-bar';
    bar.innerHTML = `<div class="gd-modes" role="radiogroup" aria-label="${T('How much guidance', 'مقدار التوجيه')}">${[['discover', T('Discover', 'اكتشف')], ['guided', T('Guided', 'موجّه')], ['independent', T('Independent', 'مستقل')]].map(([k, l]) => `<button type="button" role="radio" data-gm="${k}" aria-checked="${mem.mode === k}">${l}</button>`).join('')}</div>
      <div class="gd-tools"><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-wi="save">${T('What if? Save original', 'ماذا لو؟ احفظ الأصل')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-wi="cmp" disabled>${T('Compare with now', 'قارن بالآن')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-fs aria-pressed="false">⤢ ${T('Full screen', 'ملء الشاشة')}</button></div>`;
    model.insertBefore(bar, stage);
    const card = document.createElement('div'); card.className = 'gd-card'; card.setAttribute('aria-live', 'polite'); model.insertBefore(card, stage);
    const wi = document.createElement('div'); wi.className = 'gd-wi'; wi.hidden = true; model.appendChild(wi);
    let touched = false, poll = 0, hintT = 0, lastT = null, base = null;
    const mark = () => { touched = true; if (mem.mode === 'discover' && !mem.insight) { mem.insight = true; render(); } };
    ['input', 'pointerup', 'click', 'keydown'].forEach(ev => stage.addEventListener(ev, mark, true));
    function highlight(sel) { if (lastT) lastT.classList.remove('gd-target'); lastT = null; if (!sel || mem.mode !== 'guided') return; const el = view.querySelector(sel) || stage.querySelector(sel); if (!el) return; const tgt = el.closest('label, .kx-chips, button, .v26-card, .cs__slots, .cs__tree') || el; tgt.classList.add('gd-target'); lastT = tgt; }
    function render() {
      bar.querySelectorAll('[data-gm]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.gm === mem.mode)));
      clearInterval(poll); LS.guide.current = null;
      if (mem.mode === 'independent') { card.hidden = true; highlight(null); return; }
      card.hidden = false;
      if (mem.mode === 'discover') { highlight(null); const ins = String(def.explain || '').split(/(?<=\.)\s+/)[0]; card.innerHTML = `<p class="gd-k">${T('Discover', 'اكتشف')}</p><p>${mem.insight ? IL(ins) : T('Explore freely — change anything and watch what happens. An insight appears once you start.', 'استكشف بحرية.')}</p>`; return; }
      // guided
      const i = Math.min(mem.step, steps.length); if (i >= steps.length) { highlight(null); card.innerHTML = `<p class="gd-k">${T('Guided', 'موجّه')} · ${T('complete', 'مكتمل')}</p><p><b>${T('You have completed every step.', 'أكملت كل الخطوات.')}</b> ${T('Try the What-if comparison, or the chapter check.', 'جرّب المقارنة أو فحص الفصل.')}</p><div class="gd-nav"><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-gd="restart">${T('Restart guide', 'أعد الدليل')}</button>${chapterLink()}</div>`; return; }
      const s = steps[i]; LS.guide.current = { exp: x.id, step: i + 1, of: steps.length, title: s.t, say: LS.plain ? LS.plain(s.say) : s.say };
      card.innerHTML = `<p class="gd-k">${T('Guided', 'موجّه')} · ${T('step', 'خطوة')} ${i + 1} / ${steps.length}</p><ol class="gd-dots" aria-hidden="true">${steps.map((_, k) => `<li class="${k < i ? 'is-done' : k === i ? 'is-cur' : ''}"></li>`).join('')}</ol><h3>${esc(s.t)}</h3><p>${IL(s.say)}</p><p class="gd-state" role="status"></p><div class="gd-nav"><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-gd="back" ${i ? '' : 'disabled'}>← ${T('Back', 'رجوع')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--accent" data-gd="next" disabled>${T('Next', 'التالي')} →</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-gd="skip">${T('Skip', 'تخطَّ')}</button><button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-gd="exit">${T('Exit guide', 'اخرج')}</button></div>`;
      highlight(s.target); touched = false; hintT = Date.now();
      const check = () => { let ok = false; try { ok = s.interact ? touched : (s.wait ? true : !!s.done(M)); } catch (e) { ok = false; } const nb = card.querySelector('[data-gd="next"]'), stt = card.querySelector('.gd-state'); if (!nb) return;
        nb.disabled = !ok; if (ok) { stt.innerHTML = '<span class="v28-ok">✓</span> ' + T('Done — continue when you are ready.', 'تم — تابع عندما تكون جاهزاً.'); } else if (Date.now() - hintT > 12000) { const h = s.hint ? s.hint(M) : s.interact ? T('Use the model above — drag, move a slider or press a button.', 'استخدم النموذج أعلاه.') : null; if (h) stt.textContent = '💡 ' + h; } };
      check(); poll = setInterval(() => { if (!card.isConnected) { clearInterval(poll); return; } check(); }, 300);
    }
    function chapterLink() { const ch = LS.curriculum && LS.curriculum.chaptersFor('x:' + x.id)[0]; return ch ? `<a class="ls-btn ls-btn--sm ls-btn--accent" href="#/assess/${ch.id}">${T('Chapter check', 'فحص الفصل')}: ${esc(ch.title)}</a>` : ''; }
    bar.addEventListener('click', e => {
      const m = e.target.closest('[data-gm]'); if (m) { mem.mode = m.dataset.gm; render(); return; }
      const w = e.target.closest('[data-wi]'); if (w) { if (w.dataset.wi === 'save') { base = { img: snap(view, M), obs: M.observe ? M.observe().text : '', at: new Date() }; bar.querySelector('[data-wi="cmp"]').disabled = false; LS.toast && LS.toast(T('Original saved. Now change a condition, then press Compare.', 'حُفظ الأصل. غيّر شرطاً ثم قارن.')); }
        else if (base) { const now = { img: snap(view, M), obs: M.observe ? M.observe().text : '' }, a = nums(base.obs), b = nums(now.obs); const diff = a.map((v, k) => [v, b[k]]).filter(([u, v]) => v != null && u !== v);
          wi.hidden = false; wi.innerHTML = `<h3>${T('What if? Original vs now', 'ماذا لو؟ الأصل مقابل الآن')}</h3><div class="gd-wi__grid"><figure>${base.img ? `<img src="${base.img}" alt="${T('The model as it was', 'النموذج كما كان')}">` : ''}<figcaption><b>${T('Original', 'الأصل')}</b> — ${IL(base.obs)}</figcaption></figure><figure>${now.img ? `<img src="${now.img}" alt="${T('The model now', 'النموذج الآن')}">` : ''}<figcaption><b>${T('Now', 'الآن')}</b> — ${IL(now.obs)}</figcaption></figure></div><p>${diff.length ? T('Numbers that changed', 'أرقام تغيّرت') + ': ' + diff.slice(0, 8).map(([u, v]) => `${u} → <b>${v}</b>`).join(' · ') : T('No reported number changed — try changing a condition first.', 'لم يتغير رقم.')}</p>${def.whatif ? `<p class="v26-hint">${T('Questions to try', 'أسئلة للتجربة')}: ${def.whatif.map(esc).join(' · ')}</p>` : ''}<button type="button" class="ls-btn ls-btn--sm ls-btn--quiet" data-wi="close">${T('Close', 'إغلاق')}</button>`; wi.scrollIntoView({ block: 'nearest' }); } return; }
      const f = e.target.closest('[data-fs]'); if (f) { const on = document.fullscreenElement === model || model.classList.contains('gd-full'); if (on) { if (document.fullscreenElement) document.exitFullscreen(); model.classList.remove('gd-full'); } else if (model.requestFullscreen) model.requestFullscreen().catch(() => model.classList.add('gd-full')); else model.classList.add('gd-full'); setTimeout(() => f.setAttribute('aria-pressed', String(!!document.fullscreenElement || model.classList.contains('gd-full'))), 80); }
    });
    wi.addEventListener('click', e => { if (e.target.closest('[data-wi="close"]')) wi.hidden = true; });
    card.addEventListener('click', e => { const b = e.target.closest('[data-gd]'); if (!b) return; const a = b.dataset.gd; if (a === 'next' || a === 'skip') mem.step++; if (a === 'back') mem.step = Math.max(0, mem.step - 1); if (a === 'exit') mem.mode = 'independent'; if (a === 'restart') mem.step = 0; render(); });
    const esc0 = e => { if (e.key === 'Escape' && model.classList.contains('gd-full')) { model.classList.remove('gd-full'); bar.querySelector('[data-fs]').setAttribute('aria-pressed', 'false'); } };
    document.addEventListener('keydown', esc0);
    const fsc = () => { if (!document.fullscreenElement) model.classList.remove('gd-full'); const b = bar.querySelector('[data-fs]'); b && b.setAttribute('aria-pressed', String(document.fullscreenElement === model)); }; document.addEventListener('fullscreenchange', fsc);
    const off = LS.on('leave', () => { off(); clearInterval(poll); document.removeEventListener('keydown', esc0); document.removeEventListener('fullscreenchange', fsc); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); LS.guide.current = null; });
    if (LS.current()[2] === 'guided') mem.mode = 'guided';
    render();
    LS.guide.api = { mode: () => mem.mode, step: () => mem.step, steps: () => steps.length, set: m => { mem.mode = m; render(); }, base: () => !!base };
  };
  // Noor context: the chapter, its objectives and the guided step travel with an experience question
  LS.noorContextFor = id => { const ch = LS.curriculum && LS.curriculum.chaptersFor('x:' + id)[0], g = LS.guide.current && LS.guide.current.exp === id ? LS.guide.current : null; return (ch ? ` Chapter: ${ch.title} (${LS.curriculum.SUBJ[ch.subject][0]}). Objectives: ${ch.objs.map(o => o.text).join('; ')}.` : '') + (g ? ` I am on guided step ${g.step} of ${g.of}: ${g.title} — ${g.say}` : ''); };
})();
