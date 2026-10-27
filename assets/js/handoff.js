/* ERLY — the warm hand-off: Evidence Pack, an ally with a playbook, one-tap
   SAS booking with a 48-hour check-in, and an accommodation request drafted
   on the device for the student to send. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const AR = () => I18N.lang === 'ar';
  let tr = ERLY.getTrack ? ERLY.getTrack() : null;
  ERLY.on('track', t => { tr = t; renderPack(); renderLetter(); syncAlly(); });
  ERLY.on('pact', () => { tr = ERLY.getTrack(); syncAlly(); });

  function packData() {
    const s = tr && tr.summary;
    return {
      tool: 'ERLY by SAS', generated: new Date().toISOString(),
      note: 'Screening evidence to support a referral. Not a diagnosis. LMS-side indicators are synthetic in this demo.',
      status: tr ? tr.status : 'none', selfReferral: !!(tr && tr.selfRef),
      window: { baselineWeek: 'days 1-7', watched: 'days 8-14' },
      month: s ? {
        domainsPersisted: s.dims, convergenceRuleMet: s.dims.length >= 3, strongEnoughForReferral: s.strong, crisisFork: s.crisis,
        areasFlagged: s.flaggedAreas, perLanguage: s.lang, englishOnly: s.englishOnly,
        signalCluster: s.signals.map(x => ({ id: x.id, name: x.en, persisted: x.on })),
        indicatorsAboveNormal: s.per.filter(p => p.frac >= .5).map(p => ({ id: p.id, name: p.en, daysAbove: p.up, of: s.judged })),
        frictionFingerprint: s.fp,
        whatHelped: (tr.helped || []).reduce((o, h) => { o[h.tool] = o[h.tool] || { helped: 0, tried: 0 }; o[h.tool].helped += h.ok; o[h.tool].tried++; return o; }, {})
      } : null,
      rawDataDeleted: tr ? tr.status === 'ended' : false
    };
  }
  function renderPack() {
    const s = tr && tr.summary, d = packData();
    const row = (k, v) => `<div class="pack__row"><span>${k}</span><span>${v}</span></div>`;
    $('#packMini').innerHTML =
      row(T('Tracking', 'التتبّع'), !tr || tr.status === 'none' ? T('not started', 'لم يبدأ') : tr.status === 'active' ? T(`day ${tr.day} of 14`, `اليوم ${tr.day} من ١٤`) : tr.status === 'ended' ? T('complete · raw data deleted', 'مكتمل · حُذفت البيانات الخام') : T('stopped', 'متوقف')) +
      row(T('Domains persisted', 'مجالات مستمرة'), s ? `${s.dims.length} / 10` : '—') +
      row(T('Areas flagged', 'المجالات المنبّه عليها'), s && s.flaggedAreas.length ? s.flaggedAreas.map(a => T(...ERLY.AREA_N[a])).join(', ') : '—') +
      row(T('Arabic vs English', 'العربية مقابل الإنجليزية'), s ? (s.englishOnly ? T('English only', 'الإنجليزية فقط') : s.lang.ar > .3 ? T('both', 'كلتاهما') : '—') : '—') +
      row(T('Self-referral', 'إحالة ذاتية'), d.selfReferral ? T('yes', 'نعم') : T('no', 'لا'));
  }
  $('#dlPack').addEventListener('click', () => { download('erly-evidence-pack.json', JSON.stringify(packData(), null, 2), 'application/json'); });
  $('#printPack').addEventListener('click', () => {
    const card = $('#packMini').closest('.ho-card');
    card.classList.add('print-area'); window.print(); setTimeout(() => card.classList.remove('print-area'), 500);
  });
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ERLY.toast(T('Saved to your device. Nothing was uploaded.', 'حُفظت على جهازك. لم يُرفع شيء.'));
  }

  // ally — preselected from the Support Pact
  // the student's own person from the Support Pact, plus the usual family roles
  const escH = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let ally = '';
  function syncAlly() {
    const p = (tr && tr.pact) || {}, R = (ERLY.RELY || []).filter(r => r[0] !== 'none');
    const mine = p.rely && p.rely !== 'none' ? R.find(r => r[0] === p.rely) : null;
    const opts = [];
    if (mine) opts.push({ id: 'mine', name: (p.relyName || '').trim() || T(mine[1], mine[2]), rel: T(mine[1], mine[2]) });
    R.filter(r => !mine || r[0] !== mine[0]).slice(0, mine ? 2 : 3).forEach(r => opts.push({ id: r[0], name: T(r[1], r[2]), rel: T('from your circle', 'من محيطك') }));
    if (!opts.find(o => o.name === ally)) ally = opts[0] ? opts[0].name : '';
    $('#allyPick').innerHTML = opts.map(o => `<button class="ally ${o.name === ally ? 'is-on' : ''}" data-ally="${escH(o.name)}"><span class="avatar">${escH(o.name.charAt(0).toUpperCase())}</span><span><b>${escH(o.name)}</b><small>${escH(o.rel)}</small></span></button>`).join('');
    renderSlots && slotsReady && renderSlots();
  }
  $('#allyPick').addEventListener('click', e => { const b = e.target.closest('.ally'); if (!b) return; $$('#allyPick .ally').forEach(x => x.classList.toggle('is-on', x === b)); ally = b.dataset.ally; });
  $('#sendAlly').addEventListener('click', () => { ERLY.track && ERLY.track('H09'); if (!ally) return ERLY.toast(T('Choose someone first.', 'اختر شخصاً أولاً.')); ERLY.toast(T(`Invite sent to ${ally} with the Support Playbook. Nothing about your indicators was shared.`, `أُرسلت الدعوة إلى ${ally} مع دليل الدعم. لم يُشارك شيء عن مؤشراتك.`)); });

  // booking
  const SLOTS = [['Mon', 'الإثنين', '09:30'], ['Tue', 'الثلاثاء', '10:30'], ['Tue', 'الثلاثاء', '14:00'], ['Wed', 'الأربعاء', '11:00'], ['Thu', 'الخميس', '13:30'], ['Thu', 'الخميس', '15:00']];
  let slot = null, slotsReady = false;
  const myCounselor = () => { const id = tr && tr.pact && tr.pact.counselor, c = (ERLY.COUNSELORS || []).find(x => x.id === id); return c ? c.name : ''; };
  function renderSlots() { $('#slots').innerHTML = SLOTS.map((s, i) => `<button class="slot ${slot === i ? 'is-on' : ''}" data-slot="${i}"><b>${AR() ? s[1] : s[0]} · ${s[2]}</b><small>${myCounselor() ? escH(myCounselor()) : tr && tr.summary && tr.summary.crisis ? T('Counsellor', 'مرشد') : T('SAS counsellor', 'مرشد خدمات الطلبة')}</small></button>`).join(''); }
  $('#slots').addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (!b) return; slot = +b.dataset.slot; renderSlots(); $('#bookBtn').disabled = false; ERLY.track && ERLY.track('H06'); });
  $('#bookBtn').addEventListener('click', () => {
    const s = SLOTS[slot], card = $('#bookBtn').closest('.ho-card');
    const shared = $('#shareBook').checked;
    card.innerHTML = `<span class="ho-card__n mono">C</span><h3>${T('Booked', 'تم الحجز')} · ${AR() ? s[1] : s[0]} ${s[2]}</h3>
      <ul class="handoff">
        <li>${ICON('check')}<div><b>${T('Intake pre-filled', 'نموذج الاستقبال معبّأ')}</b><small>${shared ? T('From the Evidence Pack you approved.', 'من حزمة الأدلة التي وافقت عليها.') : T('Pack not attached — bring it if you like.', 'لم تُرفق الحزمة — أحضرها إن شئت.')}</small></div></li>
        ${ally ? `<li>${ICON('check')}<div><b>${escH(ally)} ${T('invited to attend', 'مدعو للحضور')}</b><small>${T('Sent from your account.', 'أُرسلت من حسابك.')}</small></div></li>` : ''}
        <li>${ICON('check')}<div><b>${T('Check-in 48 hours later', 'متابعة بعد ٤٨ ساعة')}</b><small>${T('One tap to dismiss.', 'نقرة واحدة للتجاهل.')}</small></div></li>
        <li>${ICON('check')}<div><b>${T('Accommodation request drafted', 'طلب التسهيلات جاهز كمسودة')}</b><small>${T('Below — you edit and send it.', 'في الأسفل — أنت تعدّله وترسله.')}</small></div></li>
      </ul>`;
    ERLY.toast(T('Booked. You won\'t walk in alone.', 'تم الحجز. لن تدخل وحدك.'));
  });
  $('#selfRef').addEventListener('click', () => { ERLY.emit('selfRef'); ERLY.toast(T('Self-referral noted. No tracking needed.', 'تم تسجيل الإحالة الذاتية. لا حاجة للتتبّع.')); $('#slots').scrollIntoView({ behavior: 'smooth', block: 'center' }); });

  // accommodation request (the SAS Bridge Letter) — templated on the device
  const ASKS = {
    reading: ['25% extra time in timed assessments', 'Text-to-speech and a reading-friendly font in exams', 'Course readings released one week in advance'],
    language: ['A bilingual glossary of course terms', 'Referral to the English writing centre', 'Extra reading time for English-language exams'],
    executive: ['A distraction-reduced testing room', 'A 48-hour extension policy for major projects, by arrangement', 'Assignment briefs broken into dated milestones'],
    strain: ['A temporary reduced course load', 'Flexible deadlines while I work with a counsellor', 'Recorded lectures for missed sessions']
  };
  const FRICTION = { reading: 'persistent visual-decoding friction (re-reading loops and slow pace on dense pages, in both Arabic and English)', language: 'reading friction on English-language material only', executive: 'deadline-proximity paralysis and abandoned submissions', strain: 'a sudden, broad drop in study endurance and routine' };
  let edited = false;
  $('#letter').addEventListener('input', () => { edited = true; });
  function renderLetter() {
    if (edited) return;
    const s = tr && tr.summary;
    const areas = s && s.flaggedAreas.length ? s.flaggedAreas : ['reading'];
    const asks = [...new Set(areas.flatMap(a => ASKS[a]))].slice(0, 4);
    $('#letterNote').textContent = s && s.flaggedAreas.length ? T('Drafted from your profile. Edit anything before you send it.', 'مسودة من ملفك. عدّل ما تشاء قبل الإرسال.') : T('Sample draft — it personalises after your insight.', 'مسودة نموذجية — تتخصّص بعد رؤيتك.');
    $('#letter').value = `Dear Student Accessibility Services,

Following my assessment with SAS, I am writing to formally request academic accommodations for this semester.

Over two weeks, ERLY (with my consent, on my own device) recorded ${areas.map(a => FRICTION[a]).join(', and ')}, measured only against my own baseline. My confirmed assessment outcome is attached separately.

I would like to request:
${asks.map(a => '  • ' + a).join('\n')}

I am happy to discuss these at my next appointment${ally ? `, where ${ally} may join me` : ''}.

Kind regards,
Acubins
Student ID 2026-0417`;
  }

  I18N.onChange(() => { renderPack(); renderSlots(); syncAlly(); });
  $('#copyLetter').addEventListener('click', () => { const t = $('#letter'); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => ERLY.toast(T('Copied. You send it — ERLY never does.', 'نُسخت. أنت ترسلها — إيرلي لا يفعل أبداً.'))).catch(() => { t.select(); document.execCommand('copy'); ERLY.toast(T('Copied.', 'نُسخت.')); }); });
  $('#dlLetter').addEventListener('click', () => download('accommodation-request.txt', $('#letter').value, 'text/plain'));
  slotsReady = true; renderPack(); renderSlots(); renderLetter(); syncAlly();
})();
