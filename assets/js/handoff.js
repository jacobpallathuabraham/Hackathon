/* ERLY — the hand-off: Evidence Pack, an ally with a playbook, one-tap SAS booking. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const AR = () => I18N.lang === 'ar';
  let tr = ERLY.getTrack ? ERLY.getTrack() : null;
  ERLY.on('track', t => { tr = t; renderPack(); });

  function packData() {
    const s = tr && tr.summary;
    return {
      tool: 'ERLY by SAS', generated: new Date().toISOString(),
      note: 'Screening evidence to support a referral. Not a diagnosis. LMS-side indicators are synthetic in this demo.',
      status: tr ? tr.status : 'none', selfReferral: !!(tr && tr.selfRef),
      fortnight: s ? {
        judgedDays: s.judged, strongEnoughForReferral: s.strong, areasFlagged: s.flaggedAreas,
        areas: s.areas, indicatorsAboveNormal: s.per.filter(p => p.frac >= .5).map(p => ({ id: p.id, name: p.en, daysAbove: p.up }))
      } : null,
      rawDataDeleted: tr ? tr.status === 'ended' : false
    };
  }
  function renderPack() {
    const s = tr && tr.summary, d = packData();
    const row = (k, v) => `<div class="pack__row"><span>${k}</span><span>${v}</span></div>`;
    $('#packMini').innerHTML =
      row(T('Tracking', 'التتبّع'), !tr || tr.status === 'none' ? T('not started', 'لم يبدأ') : tr.status === 'active' ? T(`day ${tr.day} of 14`, `اليوم ${tr.day} من ١٤`) : tr.status === 'ended' ? T('complete · raw data deleted', 'مكتمل · حُذفت البيانات الخام') : T('stopped', 'متوقف')) +
      row(T('Areas flagged', 'المجالات المنبّه عليها'), s && s.flaggedAreas.length ? s.flaggedAreas.map(a => T(...ERLY.AREA_N[a])).join(', ') : '—') +
      row(T('Indicators above normal', 'مؤشرات فوق المعدل'), s ? `${d.fortnight.indicatorsAboveNormal.length} / ${s.per.length}` : '—') +
      row(T('Referral-worthy', 'تستدعي الإحالة'), s ? (s.strong ? T('yes', 'نعم') : T('not yet', 'ليس بعد')) : '—') +
      row(T('Self-referral', 'إحالة ذاتية'), d.selfReferral ? T('yes', 'نعم') : T('no', 'لا'));
  }
  $('#dlPack').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(packData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'erly-evidence-pack.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ERLY.toast(T('Saved to your device. Nothing was uploaded.', 'حُفظت على جهازك. لم يُرفع شيء.'));
  });
  $('#printPack').addEventListener('click', () => {
    const card = $('#packMini').closest('.ho-card');
    card.classList.add('print-area'); window.print(); setTimeout(() => card.classList.remove('print-area'), 500);
  });

  let ally = 'Sara';
  $('#allyPick').addEventListener('click', e => { const b = e.target.closest('.ally'); if (!b) return; $$('#allyPick .ally').forEach(x => x.classList.toggle('is-on', x === b)); ally = b.dataset.ally; });
  $('#sendAlly').addEventListener('click', () => ERLY.toast(T(`Invite sent to ${ally} with the Support Playbook. Nothing about your indicators was shared.`, `أُرسلت الدعوة إلى ${ally} مع دليل الدعم. لم يُشارك شيء عن مؤشراتك.`)));

  const SLOTS = [['Mon', 'الإثنين', '09:30'], ['Tue', 'الثلاثاء', '10:30'], ['Tue', 'الثلاثاء', '14:00'], ['Wed', 'الأربعاء', '11:00'], ['Thu', 'الخميس', '13:30'], ['Thu', 'الخميس', '15:00']];
  let slot = null;
  function renderSlots() { $('#slots').innerHTML = SLOTS.map((s, i) => `<button class="slot ${slot === i ? 'is-on' : ''}" data-slot="${i}"><b>${AR() ? s[1] : s[0]} · ${s[2]}</b><small>${T('SAS counsellor', 'مرشد خدمات الطلبة')}</small></button>`).join(''); }
  $('#slots').addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (!b) return; slot = +b.dataset.slot; renderSlots(); $('#bookBtn').disabled = false; });
  $('#bookBtn').addEventListener('click', () => {
    const s = SLOTS[slot], card = $('#bookBtn').closest('.ho-card');
    const shared = $('#shareBook').checked;
    card.innerHTML = `<span class="ho-card__n mono">C</span><h3>${T('Booked', 'تم الحجز')} · ${AR() ? s[1] : s[0]} ${s[2]}</h3>
      <ul class="handoff">
        <li>${ICON('check')}<div><b>${T('Intake pre-filled', 'نموذج الاستقبال معبّأ')}</b><small>${shared ? T('From the Evidence Pack you approved.', 'من حزمة الأدلة التي وافقت عليها.') : T('Pack not attached — bring it if you like.', 'لم تُرفق الحزمة — أحضرها إن شئت.')}</small></div></li>
        <li>${ICON('check')}<div><b>${ally} ${T('invited to attend', 'مدعو للحضور')}</b><small>${T('Sent from your account.', 'أُرسلت من حسابك.')}</small></div></li>
        <li>${ICON('check')}<div><b>${T('Check-in 48 hours later', 'متابعة بعد ٤٨ ساعة')}</b><small>${T('One tap to dismiss.', 'نقرة واحدة للتجاهل.')}</small></div></li>
        <li>${ICON('check')}<div><b>${T('SAS confirms — not ERLY', 'خدمات الطلبة تؤكد — لا إيرلي')}</b><small>${T('A professional assessment decides what support you get.', 'التقييم المهني يحدد الدعم الذي تحصل عليه.')}</small></div></li>
      </ul>`;
    ERLY.toast(T('Booked. You won\'t walk in alone.', 'تم الحجز. لن تدخل وحدك.'));
  });
  $('#selfRef').addEventListener('click', () => { ERLY.emit('selfRef'); ERLY.toast(T('Self-referral noted. No tracking needed.', 'تم تسجيل الإحالة الذاتية. لا حاجة للتتبّع.')); $('#slots').scrollIntoView({ behavior: 'smooth', block: 'center' }); });

  I18N.onChange(() => { renderPack(); renderSlots(); });
  renderPack(); renderSlots();
})();
