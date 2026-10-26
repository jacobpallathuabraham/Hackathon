/* ERLY — the tracker.
   Nothing is recorded until the student agrees. Then, for 14 days, ERLY keeps
   daily values for each indicator in the catalogue, learns the student's own
   normal on days 1–3, and flags a day when an indicator is clearly above that
   normal. Indicators marked `live` come from the Reading Studio in real time;
   the rest are simulated for the demo (the LMS feed is roadmap). Raw values
   are deleted on day 14; only the summary stays. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const AR = () => I18N.lang === 'ar';
  const { CATS, LIST } = window.ERLY_IND;
  const DAYS = 14, CAL = 3;
  const KEY = 'erly-track-v1';

  const fresh = () => ({ status: 'none', start: null, day: 0, consent: Object.fromEntries(Object.keys(CATS).map(k => [k, true])), pattern: 'reading', live: {}, days: [], summary: null, events: 0, selfRef: false });
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const preview = {}; // live counts before consent — kept in memory only, never saved

  /* ---------- public API used by the Reading Studio ---------- */
  ERLY.track = (id, v = 1, mode = 'add') => {
    const bag = S.status === 'active' ? S.live : preview;
    bag[id] = mode === 'set' ? v : (bag[id] || 0) + v;
    if (S.status === 'active') { S.events++; save(); }
    renderLive();
  };
  ERLY.liveValue = id => (S.status === 'active' ? S.live : preview)[id] || 0;
  ERLY.isTracking = () => S.status === 'active';
  ERLY.getTrack = () => ({ ...S, DAYS, CAL, CATS, LIST });

  /* ---------- synthetic daily values (demo of the LMS feed) ---------- */
  function rnd(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const PATTERNS = {
    reading: { reading: .78, language: .55, attention: .18, strain: .2 },
    attention: { reading: .2, language: .15, attention: .8, strain: .3 },
    language: { reading: .3, language: .82, attention: .12, strain: .15 },
    strain: { reading: .5, language: .3, attention: .55, strain: .82 },
    typical: { reading: .14, language: .12, attention: .14, strain: .12 }
  };
  function genDay(n) {
    const r = rnd(4242 + n * 97 + Object.keys(PATTERNS).indexOf(S.pattern) * 13);
    const p = PATTERNS[S.pattern];
    const vals = {};
    LIST.forEach(ind => {
      if (!S.consent[ind.cat]) return;
      const base = 1 + r() * 0.4;
      const hot = n > CAL && r() < p[ind.area];
      let v = base * (hot ? 1.7 + r() * 1.3 : 0.85 + r() * 0.35);
      if (ind.dir < 0) v = 2.4 - v; // higher is better for these
      vals[ind.id] = +v.toFixed(2);
    });
    return { n, vals };
  }
  function baseline(id) {
    const b = S.days.slice(0, CAL).map(d => d.vals[id]).filter(v => v != null);
    return b.length ? b.reduce((a, c) => a + c, 0) / b.length : null;
  }
  function flagged(ind, d) {
    if (d.n <= CAL) return false;
    const v = d.vals[ind.id], b = baseline(ind.id);
    if (v == null || b == null) return false;
    return ind.dir > 0 ? v > b * 1.45 : v < b * 0.7;
  }

  /* ---------- summary: which areas persisted ---------- */
  function summarise() {
    const judged = S.days.filter(d => d.n > CAL);
    const per = LIST.filter(i => S.consent[i.cat]).map(ind => {
      const up = judged.filter(d => flagged(ind, d)).length;
      return { ...ind, up, frac: judged.length ? up / judged.length : 0 };
    });
    const areas = {};
    ['reading', 'attention', 'language', 'strain'].forEach(a => {
      const inA = per.filter(p => p.area === a);
      const persistent = inA.filter(p => p.frac >= 0.5).length;
      areas[a] = { n: inA.length, persistent, score: inA.length ? inA.reduce((x, p) => x + p.frac, 0) / inA.length : 0 };
    });
    const flaggedAreas = Object.entries(areas).filter(([, v]) => v.persistent >= 3 && v.score >= 0.35).map(([k]) => k);
    const cats = {};
    Object.keys(CATS).forEach(c => { const inC = per.filter(p => p.cat === c); cats[c] = inC.length ? inC.reduce((x, p) => x + p.frac, 0) / inC.length : 0; });
    const daily = S.days.map(d => ({ n: d.n, flags: LIST.filter(i => S.consent[i.cat] && flagged(i, d)).length, byCat: Object.fromEntries(Object.keys(CATS).map(c => [c, LIST.filter(i => i.cat === c && S.consent[i.cat] && flagged(i, d)).length])) }));
    return { per, areas, flaggedAreas, strong: flaggedAreas.length > 0, cats, daily, judged: judged.length };
  }

  /* ---------- actions ---------- */
  function start() {
    S.status = 'active'; S.start = new Date().toISOString(); S.day = 0; S.days = []; S.summary = null; S.events = 0;
    Object.assign(S.live, preview);
    advance(1);
    ERLY.toast(T('Tracking started. Nothing leaves this device.', 'بدأ التتبّع. لا شيء يغادر هذا الجهاز.'));
  }
  function advance(k) {
    for (let i = 0; i < k && S.day < DAYS; i++) {
      S.day++;
      const d = genDay(S.day);
      // fold the student's real Reading Studio activity into today
      LIST.filter(x => x.live && S.consent[x.cat] && S.live[x.id]).forEach(x => {
        if (S.day === S.days.length + 1) d.vals[x.id] = +(d.vals[x.id] + Math.min(2, S.live[x.id] * 0.15)).toFixed(2);
      });
      S.days.push(d);
      S.events += 40 + Math.round(Math.random() * 60);
    }
    S.summary = summarise();
    if (S.day >= DAYS) {
      S.status = 'ended';
      S.days = S.days.map(d => ({ n: d.n, vals: {} })); // raw values deleted; summary kept
      S.live = {};
      ERLY.toast(T('Day 14 — tracking switched itself off. Raw data deleted.', 'اليوم ١٤ — توقف التتبّع تلقائياً. حُذفت البيانات الخام.'));
    }
    save(); render(); ERLY.emit('track', ERLY.getTrack());
  }
  function stop() { const self = S.selfRef; S = fresh(); S.selfRef = self; S.status = 'stopped'; save(); render(); ERLY.emit('track', ERLY.getTrack()); ERLY.toast(T('Stopped. Everything was deleted.', 'توقف. حُذف كل شيء.')); }
  function reset() { const self = S.selfRef; S = fresh(); S.selfRef = self; save(); render(); ERLY.emit('track', ERLY.getTrack()); }
  ERLY.on('trackDemo', pattern => { S = fresh(); S.pattern = pattern || 'reading'; S.status = 'active'; S.start = new Date().toISOString(); advance(DAYS); });
  ERLY.on('selfRef', () => { S.selfRef = true; save(); });

  /* ---------- rendering ---------- */
  const box = $('#trackBox');
  const fmtDate = d => d.toLocaleDateString(AR() ? 'ar-AE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const catName = c => T(CATS[c].en, CATS[c].ar);

  function render() {
    if (!box) return;
    if (S.status === 'none' || S.status === 'stopped') return renderContract();
    renderActive();
  }

  function renderContract() {
    const start = new Date(), end = new Date(Date.now() + DAYS * 864e5);
    box.innerHTML = `
      <div class="contract">
        <div class="contract__doc">
          <p class="contract__k mono">${S.status === 'stopped' ? T('Stopped · everything deleted', 'متوقف · حُذف كل شيء') : T('Tracking agreement · draft', 'اتفاقية التتبّع · مسودة')}</p>
          <h3>${T('Fourteen days. Your normal, not anyone else\'s. Then it stops.', 'أربعة عشر يوماً. معدلك أنت، لا معدل غيرك. ثم يتوقف.')}</h3>
          <dl class="contract__dl">
            <dt>${T('Starts', 'يبدأ')}</dt><dd>${fmtDate(start)}</dd>
            <dt>${T('Ends — automatically', 'ينتهي — تلقائياً')}</dt><dd><b>${fmtDate(end)}</b> · ${T('day 14', 'اليوم ١٤')}</dd>
            <dt>${T('Compared with', 'مقارنةً بـ')}</dt><dd>${T('Your own days 1–3. Never other students.', 'أيامك ١–٣ فقط. لا طلبة آخرين أبداً.')}</dd>
            <dt>${T('Indicators', 'المؤشرات')}</dt><dd>${LIST.length} ${T('across', 'ضمن')} ${Object.keys(CATS).length} ${T('categories — you choose which', 'فئات — أنت تختار أيّها')}</dd>
            <dt>${T('Never', 'أبداً')}</dt><dd>${T('What you type, camera, microphone, location, grades', 'ما تكتبه، الكاميرا، الميكروفون، الموقع، الدرجات')}</dd>
            <dt>${T('Afterwards', 'بعد ذلك')}</dt><dd>${T('Raw values deleted. You keep a one-page picture.', 'تُحذف القيم الخام. وتحتفظ بصورة من صفحة واحدة.')}</dd>
          </dl>
        </div>
        <div class="contract__side">
          <p class="panel__h mono">${T('What ERLY may notice — your choice', 'ما قد يلاحظه إيرلي — باختيارك')}</p>
          ${Object.entries(CATS).map(([k, c]) => `<label class="switch-row"><span class="cat-row"><i class="cat-ic" style="--c:${c.color}">${ICON(c.icon)}</i><span><b>${catName(k)}</b><small>${LIST.filter(x => x.cat === k).length} ${T('indicators', 'مؤشرات')}${LIST.some(x => x.cat === k && x.live) ? ' · ' + T('live in the studio', 'مباشر في الاستوديو') : ''}</small></span></span><input type="checkbox" data-cat="${k}" ${S.consent[k] ? 'checked' : ''}><i></i></label>`).join('')}
          <label class="field demo-pattern"><span class="mono">${T('Demo: synthetic pattern for the LMS signals', 'عرض: نمط اصطناعي لإشارات نظام التعلّم')}</span>
            <select id="pattern">${[['reading', 'Reading friction', 'احتكاك القراءة'], ['attention', 'Starting & deadlines', 'البدء والمواعيد'], ['language', 'Second-language load', 'عبء اللغة الثانية'], ['strain', 'Strain across everything', 'ضغط في كل شيء'], ['typical', 'Typical fortnight', 'أسبوعان عاديان']].map(([v, en, ar]) => `<option value="${v}" ${S.pattern === v ? 'selected' : ''}>${T(en, ar)}</option>`).join('')}</select></label>
          <label class="check-row"><input type="checkbox" id="agree"><span>${T('I understand, and I can stop and delete at any time.', 'أفهم ذلك، ويمكنني الإيقاف والحذف في أي وقت.')}</span></label>
          <button class="btn btn--accent btn--block" id="startTrack" disabled>${T('Start tracking', 'ابدأ التتبّع')}</button>
        </div>
      </div>
      ${liveHTML()}
      ${catalogueHTML()}`;
  }

  function renderActive() {
    const sum = S.summary || summarise();
    const ended = S.status === 'ended';
    const C = 2 * Math.PI * 52;
    const end = new Date(new Date(S.start).getTime() + DAYS * 864e5);
    const maxFlags = Math.max(1, ...Object.keys(CATS).map(c => Math.max(0, ...sum.daily.map(d => d.byCat[c] || 0))));
    box.innerHTML = `
      <div class="live">
        <div class="live__count">
          <svg viewBox="0 0 120 120" class="ring"><circle cx="60" cy="60" r="52" class="ring__bg"/><circle cx="60" cy="60" r="52" class="ring__fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (S.day / DAYS)}"/></svg>
          <div class="live__num"><b>${DAYS - S.day}</b><span>${ended ? T('switched off', 'متوقف') : T('days left', 'أيام متبقية')}</span></div>
        </div>
        <div class="live__meta">
          <p class="contract__k mono">${ended ? T('Ended automatically on day 14', 'انتهى تلقائياً في اليوم ١٤') : T('Tracking · day', 'التتبّع · اليوم') + ' ' + S.day + ' / 14 · ' + (S.day <= CAL ? T('learning your normal', 'يتعلّم معدلك') : T('comparing with your normal', 'يقارن بمعدلك'))}</p>
          <h3>${ended ? T('Done. It switched itself off.', 'انتهى. توقف من تلقاء نفسه.') : T('Ends on', 'ينتهي في') + ' ' + fmtDate(end)}</h3>
          ${ended ? `<p class="deleted">${ICON('trash')} ${S.events.toLocaleString('en-US')} ${T('raw events deleted from this device. Summary kept.', 'حدثاً خاماً حُذفت من هذا الجهاز. بقي الملخص.')}</p>` : ''}
          <div class="row-btns">${ended
            ? `<a href="#insight" class="btn btn--sm btn--accent">${T('See my insight', 'شاهد رؤيتي')}</a><button class="btn btn--sm btn--ghost" data-act="reset">${T('Reset demo', 'أعد العرض')}</button>`
            : `<button class="btn btn--sm btn--ghost" data-act="next">${T('Simulate next day', 'حاكِ اليوم التالي')} ›</button><button class="btn btn--sm btn--ghost" data-act="ff">${T('Fast-forward to day 14', 'تقدّم إلى اليوم ١٤')} »</button><button class="btn btn--sm btn--stop" data-act="stop">${T('Stop & delete now', 'أوقف واحذف الآن')}</button>`}</div>
        </div>
        <div class="heat14">
          <div class="heat14__head"><p class="panel__h mono">${T('Indicators above your normal · by category and day', 'مؤشرات فوق معدلك · حسب الفئة واليوم')}</p><span class="small muted">${T('Days 1–3 learn your normal', 'الأيام ١–٣ لتعلّم معدلك')}</span></div>
          <div class="heat14__grid" style="--days:${DAYS}">
            <span></span>${Array.from({ length: DAYS }, (_, i) => `<span class="heat14__d mono">${i + 1}</span>`).join('')}
            ${Object.keys(CATS).map(c => `<span class="heat14__l"><i class="cat-ic cat-ic--sm" style="--c:${CATS[c].color}">${ICON(CATS[c].icon)}</i>${catName(c)}</span>${Array.from({ length: DAYS }, (_, i) => {
              const d = sum.daily[i];
              if (!S.consent[c]) return '<span class="hc14 hc14--off"></span>';
              if (!d) return '<span class="hc14 hc14--future"></span>';
              if (d.n <= CAL) return '<span class="hc14 hc14--cal"></span>';
              const v = (d.byCat[c] || 0) / maxFlags;
              return `<span class="hc14" style="--c:${CATS[c].color};--v:${v.toFixed(2)}" title="${d.byCat[c] || 0} ${T('above normal', 'فوق المعدل')}"></span>`;
            }).join('')}`).join('')}
          </div>
        </div>
        ${ended ? `<div class="live__sum">
          <p class="panel__h mono">${T('Your 2-week summary · share of judged days above your normal', 'ملخص أسبوعيك · نسبة الأيام فوق معدلك')}</p>
          ${['reading', 'attention', 'language', 'strain'].map(a => `<div class="sum-row" style="--c:${AREA_C[a]}"><span>${T(...AREA_N[a])}</span><span class="sum-row__bar"><i style="width:${Math.round(sum.areas[a].score * 100)}%"></i></span><b class="mono" title="${T('indicators above normal on at least half of judged days', 'مؤشرات فوق المعدل في نصف الأيام على الأقل')}">${sum.areas[a].persistent}/${sum.areas[a].n} ${T('persistent', 'مستمر')}</b></div>`).join('')}
          <div class="sum-verdict ${sum.strong ? 'is-strong' : ''}">
            <b>${sum.strong ? T('Evidence strong enough to justify a referral.', 'أدلة كافية لتبرير الإحالة.') : T('Nothing persisted strongly enough to flag.', 'لم يستمر شيء بما يكفي للتنبيه.')}</b>
            <span>${sum.strong ? T('Not a diagnosis. SAS confirms with a professional assessment.', 'ليس تشخيصاً. تؤكد خدمات الطلبة ذلك بتقييم مهني.') : T('Your tools stay, and self-referral stays open.', 'تبقى أدواتك، ويبقى باب الإحالة الذاتية مفتوحاً.')}</span>
            <a href="#handoff" class="btn btn--sm ${sum.strong ? 'btn--accent' : 'btn--ghost'}">${sum.strong ? T('Take it to SAS', 'خذه إلى خدمات الطلبة') : T('Self-refer anyway', 'أحِل نفسك على أي حال')}</a>
          </div></div>` : ''}
      </div>
      ${liveHTML()}
      ${catalogueHTML(sum)}`;
  }

  const AREA_N = { reading: ['Reading', 'القراءة'], attention: ['Starting & deadlines', 'البدء والمواعيد'], language: ['Language load', 'عبء اللغة'], strain: ['Strain & routine', 'الضغط والروتين'] };
  const AREA_C = { reading: 'var(--c-R)', language: 'var(--c-L)', attention: 'var(--c-W)', strain: 'var(--c-T)' };
  ERLY.AREA_N = AREA_N; ERLY.AREA_C = AREA_C;

  function liveHTML() {
    const live = LIST.filter(i => i.live);
    const tracking = S.status === 'active';
    return `<div class="livefeed" id="liveFeed">
      <div class="livefeed__head"><p class="panel__h mono">${T('Live from your Reading Studio', 'مباشر من استوديو القراءة')}</p>
        <span class="livefeed__st ${tracking ? 'is-on' : ''}"><i></i>${tracking ? T('recording on this device', 'يُسجَّل على هذا الجهاز') : S.status === 'ended' ? T('tracking ended — preview only, nothing is saved', 'انتهى التتبّع — معاينة فقط، لا يُحفظ شيء') : T('preview only — nothing saved until you start', 'معاينة فقط — لا يُحفظ شيء حتى تبدأ')}</span>
        <button class="btn btn--xs btn--ghost" data-studio>${T('Open the Reading Studio', 'افتح استوديو القراءة')}</button></div>
      <div class="livefeed__grid">${live.map(i => `<div class="lf" data-id="${i.id}"><b class="mono" data-lv="${i.id}">${fmtLive(i)}</b><span>${T(i.en, i.ar)}</span><small class="mono">${i.id} · ${i.unit}</small></div>`).join('')}</div>
    </div>`;
  }
  function fmtLive(i) { const v = ERLY.liveValue(i.id); return i.id === 'R03' ? (v ? v.toFixed(1) + '×' : '—') : i.id === 'S02' ? (v ? Math.round(v) + '%' : '—') : v; }
  function renderLive() { $$('[data-lv]').forEach(el => { const i = LIST.find(x => x.id === el.dataset.lv); const t = String(fmtLive(i)); if (el.textContent !== t) { el.textContent = t; el.parentElement.classList.remove('bump'); void el.offsetWidth; el.parentElement.classList.add('bump'); } }); }

  function catalogueHTML(sum) {
    const per = sum ? Object.fromEntries(sum.per.map(p => [p.id, p])) : {};
    return `<div class="catalogue">
      <div class="catalogue__head"><h3>${T('Every indicator ERLY tracks', 'كل مؤشر يتتبّعه إيرلي')}</h3><span class="small muted">${LIST.length} ${T('indicators · metadata only · live = measured in this demo', 'مؤشراً · بيانات وصفية فقط · مباشر = يُقاس في هذا العرض')}</span></div>
      <div class="catalogue__grid">${Object.entries(CATS).map(([k, c]) => `<details class="catg" ${k === 'R' ? 'open' : ''} style="--c:${c.color}">
        <summary><i class="cat-ic" style="--c:${c.color}">${ICON(c.icon)}</i><b>${catName(k)}</b><span class="mono muted">${LIST.filter(x => x.cat === k).length}</span>${!S.consent[k] && S.status === 'active' ? `<span class="catg__off">${T('off', 'متوقف')}</span>` : ''}</summary>
        <ul>${LIST.filter(x => x.cat === k).map(x => { const p = per[x.id]; return `<li class="${p && p.frac >= .5 ? 'is-flag' : ''}"><span class="mono catg__id">${x.id}</span><span class="catg__t"><b>${T(x.en, x.ar)}</b><small>${x.how}</small></span><span class="catg__m">${x.live ? `<em class="honesty honesty--live">${T('live', 'مباشر')}</em>` : `<em class="honesty honesty--sim">${T('LMS · sim', 'نظام · محاكى')}</em>`}${p ? `<b class="mono">${p.up}/${sum.judged}</b>` : ''}</span></li>`; }).join('')}</ul>
      </details>`).join('')}</div>
    </div>`;
  }

  box && box.addEventListener('change', e => {
    if (e.target.dataset.cat) { S.consent[e.target.dataset.cat] = e.target.checked; save(); }
    if (e.target.id === 'agree') $('#startTrack').disabled = !e.target.checked;
    if (e.target.id === 'pattern') { S.pattern = e.target.value; save(); }
  });
  box && box.addEventListener('click', e => {
    if (e.target.id === 'startTrack') return start();
    const a = e.target.closest('[data-act]'); if (!a) return;
    ({ next: () => advance(1), ff: () => advance(DAYS), stop, reset })[a.dataset.act]();
  });

  I18N.onChange(render);
  render();
  setTimeout(() => ERLY.emit('track', ERLY.getTrack()), 0);
})();
