/* ERLY — the opt-in 2-week watch, the hand-off and the SAS view.
   The watch exists only after a "closer look" result or a self-referral,
   only with consent, and switches itself off on day 14. Daily data here is
   synthetic so the contract can be demonstrated in seconds. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const AR = () => I18N.lang === 'ar';
  const fmtDate = d => d.toLocaleDateString(AR() ? 'ar-AE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  const SIGS = [
    { id: 's1', en: 'Re-reading loops', ar: 'حلقات إعادة القراءة', srcEn: 'scroll events', srcAr: 'أحداث التمرير', area: 'reading' },
    { id: 's2', en: 'Abandoned drafts & posts', ar: 'مسودات ومنشورات مهجورة', srcEn: 'button events — never text', srcAr: 'أحداث الأزرار — لا نصوص أبداً', area: 'attention' },
    { id: 's3', en: 'Switching to audio', ar: 'التحوّل إلى الصوت', srcEn: 'feature-use counts', srcAr: 'عدد مرات استخدام الميزات', area: 'reading' },
    { id: 's4', en: '11th-hour spikes', ar: 'اندفاعات اللحظة الأخيرة', srcEn: 'timestamps only', srcAr: 'الطوابع الزمنية فقط', area: 'attention' }
  ];
  const DAYS = 14, CALIBRATE = 3;

  const KEY = 'erly-watch-v2';
  let W = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { return fresh(); } }
  function fresh() { return { status: 'none', start: null, day: 0, data: [], consent: { s1: true, s2: true, s3: true, s4: true }, selfRef: false, events: 0 }; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) {} }

  let result = null;
  ERLY.on('result', r => { result = r; renderWatch(); renderPack(); });

  /* ---------------- synthetic day generator ---------------- */
  function rnd(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function genDay(n) {
    const r = rnd(1000 + n * 7);
    const areas = result && result.areas.length ? result.areas : (W.selfRef ? ['reading'] : []);
    const day = { n, events: 60 + Math.floor(r() * 80) };
    SIGS.forEach(s => {
      if (!W.consent[s.id]) { day[s.id] = null; return; }
      const strong = areas.includes(s.area);
      const p = n <= CALIBRATE ? 0.15 : strong ? 0.72 : 0.18;
      day[s.id] = r() < p;
    });
    return day;
  }

  /* ---------------- render ---------------- */
  function eligible() { return (result && result.outcome === 'closer') || W.selfRef; }
  function renderWatch() {
    const box = $('#watchBox');
    if (W.status === 'none' && !eligible()) {
      box.innerHTML = `<div class="watch-locked">
        <div class="watch-locked__icon">🔒</div>
        <h3>${T('Locked — and that\'s the point.', 'مقفل — وهذا هو المقصود.')}</h3>
        <p>${result && result.outcome === 'fine'
          ? T('Your result was “doing fine”, so there is no monitoring at all. Your tools stay.', 'كانت نتيجتك «أنت بخير»، لذلك لا توجد أي متابعة. تبقى أدواتك.')
          : T('The watch only opens after a “closer look” result, or if you self-refer. Finish the challenge first — or load a sample.', 'لا تُفتح المتابعة إلا بعد نتيجة «تستحق نظرة أقرب» أو إن أحلت نفسك. أكمل التحدي أولاً — أو حمّل مثالاً.')}</p>
        <div class="row-btns" style="justify-content:center"><button class="btn btn--sm btn--accent" data-act="sample">${T('Load a “closer look” sample', 'حمّل مثال «نظرة أقرب»')}</button><button class="btn btn--sm btn--ghost" data-act="selfref">${T('I self-refer — let me opt in', 'أحيل نفسي — دعني أشترك')}</button></div>
      </div>`;
      return;
    }
    if (W.status === 'none') return renderContract(box);
    renderActive(box);
  }

  function renderContract(box) {
    const start = new Date(), end = new Date(Date.now() + DAYS * 864e5);
    box.innerHTML = `<div class="contract">
      <div class="contract__doc">
        <p class="contract__k mono">${T('Watch contract · draft', 'عقد المتابعة · مسودة')}</p>
        <h3>${T('Two weeks. Then it switches itself off.', 'أسبوعان. ثم يتوقف من تلقاء نفسه.')}</h3>
        <dl class="contract__dl">
          <dt>${T('Starts', 'يبدأ')}</dt><dd>${fmtDate(start)}</dd>
          <dt>${T('Ends — automatically', 'ينتهي — تلقائياً')}</dt><dd><b>${fmtDate(end)}</b> · ${T('day 14', 'اليوم ١٤')}</dd>
          <dt>${T('Where', 'أين')}</dt><dd>${T('Only your LMS and library e-books', 'نظام إدارة التعلّم ومكتبة الكتب الإلكترونية فقط')}</dd>
          <dt>${T('Days 1–3', 'الأيام ١–٣')}</dt><dd>${T('Learning your normal — nothing is judged', 'تعلّم معدلك الطبيعي — لا حكم على شيء')}</dd>
          <dt>${T('Afterwards', 'بعد ذلك')}</dt><dd>${T('Raw events deleted. You keep a one-page summary.', 'تُحذف الأحداث الخام. وتحتفظ بملخص من صفحة واحدة.')}</dd>
          <dt>${T('Who sees it', 'من يراه')}</dt><dd>${T('Only you — until you choose to share the summary.', 'أنت فقط — حتى تختار مشاركة الملخص.')}</dd>
        </dl>
      </div>
      <div class="contract__side">
        <p class="panel__h mono">${T('What may be collected — your choice', 'ما قد يُجمع — باختيارك')}</p>
        ${SIGS.map(s => `<label class="switch-row"><span><b>${T(s.en, s.ar)}</b><small>${T(s.srcEn, s.srcAr)}</small></span><input type="checkbox" data-sig="${s.id}" ${W.consent[s.id] ? 'checked' : ''}><i></i></label>`).join('')}
        <p class="contract__never">${T('Never: what you type, camera, microphone, location, grades.', 'أبداً: ما تكتبه، الكاميرا، الميكروفون، الموقع، الدرجات.')}</p>
        <label class="check-row"><input type="checkbox" id="agree"><span>${T('I understand and I can stop at any time.', 'أفهم ذلك ويمكنني التوقف في أي وقت.')}</span></label>
        <button class="btn btn--accent btn--block" id="startWatch" disabled>${T('Start my 2-week watch', 'ابدأ متابعتي لأسبوعين')}</button>
        <button class="btn btn--quiet btn--block" data-act="skip">${T('No thanks — go straight to SAS', 'لا شكراً — انتقل مباشرة إلى خدمات الطلبة')}</button>
      </div>
    </div>`;
  }

  function renderActive(box) {
    const left = DAYS - W.day;
    const ended = W.status === 'ended', stopped = W.status === 'stopped';
    const C = 2 * Math.PI * 52;
    const end = new Date(new Date(W.start).getTime() + DAYS * 864e5);
    const sum = summary();
    box.innerHTML = `<div class="live">
      <div class="live__count">
        <svg viewBox="0 0 120 120" class="ring"><circle cx="60" cy="60" r="52" class="ring__bg"/><circle cx="60" cy="60" r="52" class="ring__fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (W.day / DAYS)}"/></svg>
        <div class="live__num"><b>${stopped ? '—' : left}</b><span>${stopped ? T('stopped', 'متوقف') : ended ? T('switched off', 'تم الإيقاف') : T('days left', 'أيام متبقية')}</span></div>
      </div>
      <div class="live__meta">
        <p class="contract__k mono">${stopped ? T('Watch stopped by you · data deleted', 'أوقفت المتابعة · حُذفت البيانات') : ended ? T('Watch ended automatically on day 14', 'انتهت المتابعة تلقائياً في اليوم ١٤') : T('Watch active · day', 'المتابعة فعّالة · اليوم') + ' ' + W.day + ' / 14'}</p>
        <h3>${stopped ? T('Stopped. Nothing was kept.', 'توقفت. لم يُحتفظ بشيء.') : ended ? T('Done. It switched itself off.', 'انتهت. توقفت من تلقاء نفسها.') : T('Ends on', 'تنتهي في') + ' ' + fmtDate(end)}</h3>
        ${ended ? `<p class="deleted">🗑 ${W.events.toLocaleString('en-US')} ${T('raw events deleted from this device. Summary kept.', 'حدثاً خاماً حُذفت من هذا الجهاز. بقي الملخص.')}</p>` : ''}
        <div class="row-btns">
          ${!ended && !stopped ? `<button class="btn btn--sm btn--ghost" data-act="next">${T('Simulate next day', 'حاكِ اليوم التالي')} ▸</button><button class="btn btn--sm btn--ghost" data-act="ff">${T('Fast-forward to day 14', 'تقدّم إلى اليوم ١٤')} ⏩</button><button class="btn btn--sm btn--stop" data-act="stop">■ ${T('Stop & delete now', 'أوقف واحذف الآن')}</button>` : `<button class="btn btn--sm btn--ghost" data-act="restart">${T('Reset demo', 'أعد العرض')}</button>`}
        </div>
      </div>
      ${stopped ? '' : `<div class="live__grid">
        <div class="dgrid">
          <span></span>${Array.from({ length: DAYS }, (_, i) => `<span class="dgrid__h mono">${i + 1}</span>`).join('')}
          ${SIGS.map(s => `<span class="dgrid__l">${T(s.en, s.ar)}</span>${Array.from({ length: DAYS }, (_, i) => {
            const d = W.data[i];
            let c = 'dg';
            if (!W.consent[s.id]) c += ' dg--off';
            else if (!d) c += ' dg--future';
            else if (i < CALIBRATE) c += ' dg--cal';
            else if (d[s.id]) c += ' dg--up';
            return `<span class="${c}" style="--c:var(--${s.id})"></span>`;
          }).join('')}`).join('')}
        </div>
        <p class="small muted">${T('Grey = days 1–3, learning your normal. Filled = harder than your normal that day. Synthetic data for the demo.', 'الرمادي = الأيام ١–٣ لتعلّم معدلك. المملوء = أصعب من معدلك ذلك اليوم. بيانات اصطناعية للعرض.')}</p>
      </div>`}
      ${ended ? `<div class="live__sum">
        <p class="panel__h mono">${T('Your 2-week summary', 'ملخص أسبوعيك')}</p>
        ${sum.rows.map(r => `<div class="sum-row" style="--c:var(--${r.id})"><span>${T(r.en, r.ar)}</span><span class="sum-row__bar"><i style="width:${r.frac * 100}%"></i></span><b class="mono">${r.up}/${DAYS - CALIBRATE} ${T('days', 'أيام')}</b></div>`).join('')}
        <div class="sum-verdict ${sum.strong ? 'is-strong' : ''}">
          <b>${sum.strong ? T('Evidence strong enough to justify a referral.', 'أدلة كافية لتبرير الإحالة.') : T('The game results didn\'t show up strongly in real study.', 'لم تظهر نتائج الألعاب بقوة في الدراسة الفعلية.')}</b>
          <span>${sum.strong ? T('That is not a diagnosis. SAS confirms with a professional assessment.', 'هذا ليس تشخيصاً. تؤكد خدمات الطلبة ذلك بتقييم مهني.') : T('Your tools continue, and the self-referral door stays open.', 'تستمر أدواتك، ويبقى باب الإحالة الذاتية مفتوحاً.')}</span>
          <a href="#handoff" class="btn btn--sm ${sum.strong ? 'btn--accent' : 'btn--ghost'}">${sum.strong ? T('Take it to SAS →', 'خذه إلى خدمات الطلبة ←') : T('Self-refer anyway', 'أحِل نفسك على أي حال')}</a>
        </div>
      </div>` : ''}
    </div>`;
  }

  function summary() {
    const judged = W.data.slice(CALIBRATE);
    const rows = SIGS.filter(s => W.consent[s.id]).map(s => {
      const up = judged.filter(d => d && d[s.id]).length;
      return { id: s.id, en: s.en, ar: s.ar, up, frac: up / (DAYS - CALIBRATE) };
    });
    // 2+ signals elevated on at least half of the judged days
    const strong = rows.filter(r => r.frac >= 0.5).length >= 2;
    return { rows, strong };
  }

  function advance(n) {
    for (let k = 0; k < n && W.day < DAYS; k++) {
      W.day++;
      const d = genDay(W.day);
      W.data.push(d);
      W.events += d.events;
    }
    if (W.day >= DAYS) {
      W.status = 'ended';
      W.data = W.data.map(d => ({ n: d.n, s1: d.s1, s2: d.s2, s3: d.s3, s4: d.s4 })); // raw events gone; flags only
      ERLY.toast(T('Day 14 — the watch switched itself off. Raw data deleted.', 'اليوم ١٤ — توقفت المتابعة تلقائياً. حُذفت البيانات الخام.'));
    }
    save(); renderWatch(); renderPack();
  }

  $('#watchBox').addEventListener('change', e => {
    if (e.target.dataset.sig) { W.consent[e.target.dataset.sig] = e.target.checked; save(); }
    if (e.target.id === 'agree') $('#startWatch').disabled = !e.target.checked;
  });
  $('#watchBox').addEventListener('click', e => {
    if (e.target.id === 'startWatch') {
      W.status = 'active'; W.start = new Date().toISOString(); W.day = 0; W.data = []; W.events = 0;
      advance(1);
      ERLY.toast(T('Started. You\'ll see the countdown every time you open ERLY.', 'بدأت. سترى العد التنازلي كلما فتحت إيرلي.'));
      return;
    }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'next') advance(1);
    else if (act === 'ff') advance(DAYS);
    else if (act === 'stop') { W.status = 'stopped'; W.data = []; W.events = 0; save(); renderWatch(); renderPack(); ERLY.toast(T('Stopped. Everything collected was deleted.', 'توقفت. حُذف كل ما جُمع.')); }
    else if (act === 'restart') { const self = W.selfRef; W = fresh(); W.selfRef = self; save(); renderWatch(); renderPack(); }
    else if (act === 'sample') ERLY.emit('sample', 'closer');
    else if (act === 'selfref') selfRefer(false);
    else if (act === 'skip') $('#handoff').scrollIntoView({ behavior: 'smooth' });
  });

  function selfRefer(toSAS) {
    W.selfRef = true; save(); renderWatch();
    ERLY.toast(T('Self-referral noted. No test needed.', 'تم تسجيل الإحالة الذاتية. لا حاجة للاختبار.'));
    $(toSAS ? '#slots' : '#watch').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('#selfRef').addEventListener('click', () => selfRefer(true));

  /* ================= hand-off ================= */
  function packData() {
    const ch = ERLY.getChallenge ? ERLY.getChallenge() : {};
    const r = ch.result;
    return {
      tool: 'ERLY prototype', generated: new Date().toISOString(),
      note: 'Screening evidence to support a referral. Not a diagnosis. Thresholds are demo placeholders.',
      sampleData: !!(r && r.sample),
      selfReferral: W.selfRef,
      challenge: r ? { outcome: r.outcome, areas: r.areas, languagePattern: r.lang, learningProfile: r.profile, flags: r.flags, arhqAdaptedScore: r.arhq, asrsPartAPositives: r.asrs } : null,
      games: ch.days ? Object.fromEntries(Object.entries(ch.days).map(([k, v]) => [`day${k}`, v.data])) : null,
      watch: W.status === 'ended' ? { days: DAYS, calibrationDays: CALIBRATE, summary: summary().rows.map(x => ({ signal: x.en, elevatedDays: x.up })), strongEnoughForReferral: summary().strong, rawDataDeleted: true } : { status: W.status }
    };
  }
  function renderPack() {
    const d = packData();
    const c = d.challenge;
    const row = (k, v) => `<div class="pack__row"><span>${k}</span><span>${v}</span></div>`;
    $('#packMini').innerHTML =
      row(T('Challenge result', 'نتيجة التحدي'), c ? (c.outcome === 'closer' ? T('closer look', 'نظرة أقرب') : T('doing fine', 'بخير')) : '—') +
      row(T('Areas', 'المجالات'), c && c.areas.length ? c.areas.join(', ') : '—') +
      row(T('Language pattern', 'نمط اللغة'), c ? { both: T('both slower', 'الاثنتان أبطأ'), en: T('English only', 'الإنجليزية فقط'), ar: T('Arabic only', 'العربية فقط'), none: T('similar', 'متقارب') }[c.languagePattern] : '—') +
      row(T('2-week watch', 'متابعة الأسبوعين'), W.status === 'ended' ? (summary().strong ? T('supports referral', 'تدعم الإحالة') : T('not strong', 'غير قوية')) : W.status === 'active' ? T('in progress', 'جارية') : W.status === 'stopped' ? T('stopped', 'متوقفة') : T('not started', 'لم تبدأ')) +
      row(T('Self-referral', 'إحالة ذاتية'), W.selfRef ? T('yes', 'نعم') : T('no', 'لا'));
  }
  $('#dlPack').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(packData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'erly-evidence-pack.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ERLY.toast(T('Saved to your device. Nothing was uploaded.', 'حُفظت على جهازك. لم يُرفع شيء.'));
  });
  $('#printPack').addEventListener('click', () => {
    const card = $('#packMini').closest('.ho-card');
    card.classList.add('print-area');
    window.print();
    setTimeout(() => card.classList.remove('print-area'), 500);
  });

  let ally = 'Sara';
  $('#allyPick').addEventListener('click', e => {
    const b = e.target.closest('.ally');
    if (!b) return;
    $$('#allyPick .ally').forEach(x => x.classList.toggle('is-on', x === b));
    ally = b.dataset.ally;
  });
  $('#sendAlly').addEventListener('click', () => ERLY.toast(T(`Invite sent to ${ally} with the Support Playbook. No scores shared.`, `أُرسلت الدعوة إلى ${ally} مع دليل الدعم. لم تُشارك أي نتائج.`)));

  const SLOTS = [['Mon', 'الإثنين', '09:30'], ['Tue', 'الثلاثاء', '10:30'], ['Tue', 'الثلاثاء', '14:00'], ['Wed', 'الأربعاء', '11:00'], ['Thu', 'الخميس', '13:30'], ['Thu', 'الخميس', '15:00']];
  let slot = null;
  function renderSlots() {
    $('#slots').innerHTML = SLOTS.map((s, i) => `<button class="slot ${slot === i ? 'is-on' : ''}" data-slot="${i}"><b>${AR() ? s[1] : s[0]} · ${s[2]}</b><small>${T('SAS counsellor', 'مرشد خدمات الطلبة')}</small></button>`).join('');
  }
  $('#slots').addEventListener('click', e => {
    const b = e.target.closest('[data-slot]');
    if (!b) return;
    slot = +b.dataset.slot; renderSlots();
    $('#bookBtn').disabled = false;
  });
  $('#bookBtn').addEventListener('click', () => {
    const s = SLOTS[slot];
    const card = $('#bookBtn').closest('.ho-card');
    card.innerHTML = `<span class="ho-card__n mono">C</span><h3>${T('Booked', 'تم الحجز')} · ${AR() ? s[1] : s[0]} ${s[2]}</h3>
      <ul class="handoff">
        <li><span>✓</span><div><b>${T('Intake pre-filled', 'نموذج الاستقبال معبّأ')}</b><small>${$('#shareBook') && !$('#shareBook').checked ? T('Evidence Pack not attached — bring it if you like.', 'لم تُرفق حزمة الأدلة — أحضرها إن شئت.') : T('From your Evidence Pack, which you approved.', 'من حزمة أدلتك التي وافقت عليها.')}</small></div></li>
        <li><span>✓</span><div><b>${ally} ${T('invited to attend', 'مدعو للحضور')}</b><small>${T('Sent from your account, not ERLY\'s.', 'أُرسلت من حسابك، لا من إيرلي.')}</small></div></li>
        <li><span>✓</span><div><b>${T('Check-in 48 hours later', 'متابعة بعد ٤٨ ساعة')}</b><small>${T('“How did it go?” — one tap to dismiss.', '«كيف سار الأمر؟» — نقرة واحدة للتجاهل.')}</small></div></li>
        <li><span>✓</span><div><b>${T('SAS confirms — not ERLY', 'خدمات الطلبة تؤكد — لا إيرلي')}</b><small>${T('A professional assessment decides what support you get.', 'التقييم المهني يحدد الدعم الذي تحصل عليه.')}</small></div></li>
      </ul>`;
    ERLY.toast(T('Booked. You won\'t walk in alone.', 'تم الحجز. لن تدخل وحدك.'));
  });

  /* ================= SAS view (synthetic) ================= */
  function renderSAS() {
    const K = [
      [T('Played day 1', 'لعبوا اليوم الأول'), '2,960'],
      [T('Finished all 5 days', 'أكملوا الأيام الخمسة'), '2,210'],
      [T('“Closer look” results', 'نتائج «نظرة أقرب»'), '248'],
      [T('Confirmed after SAS assessment', 'تأكدت بعد تقييم الخدمات'), '61']
    ];
    $('#kpis').innerHTML = K.map(([l, v]) => `<div class="kpi"><small>${l}</small><b>${v}</b></div>`).join('');
    const F = [[T('Finished challenge', 'أكملوا التحدي'), 2210], [T('“Closer look”', '«نظرة أقرب»'), 248], [T('Opted into 2-week watch', 'اشتركوا في المتابعة'), 131], [T('Self-referred (no test)', 'أحالوا أنفسهم (بلا اختبار)'), 37], [T('Booked SAS', 'حجزوا موعداً'), 112], [T('Assessed', 'تم تقييمهم'), 84]];
    const max = 248;
    $('#funnel').innerHTML = F.map(([l, n], i) => `<div class="fun-row"><span>${l}</span><span class="bar2"><span data-w="${i === 0 ? 100 : n / max * 100}"></span></span><b>${n.toLocaleString('en-US')}</b></div>`).join('');
    requestAnimationFrame(() => $$('#funnel .bar2 span').forEach(s => { s.style.width = s.dataset.w + '%'; }));
    const LB = [[T('Slower in both languages', 'أبطأ في اللغتين'), 37, 'var(--accent)'], [T('English only', 'الإنجليزية فقط'), 41, 'var(--teal)'], [T('Arabic only', 'العربية فقط'), 6, 'var(--s4)'], [T('Other areas (attention, number)', 'مجالات أخرى (انتباه، أرقام)'), 16, 'var(--s3)']];
    $('#langbars').innerHTML = `<div class="stack">${LB.map(([, v, c]) => `<i style="width:${v}%;background:${c}"></i>`).join('')}</div>` +
      LB.map(([l, v, c]) => `<div class="stack__row"><span class="stack__dot" style="background:${c}"></span><span>${l}</span><b class="mono">${v}%</b></div>`).join('');
  }

  I18N.onChange(() => { renderWatch(); renderPack(); renderSlots(); renderSAS(); });
  result = ERLY.state.result || null;
  renderWatch(); renderPack(); renderSlots(); renderSAS();
})();
