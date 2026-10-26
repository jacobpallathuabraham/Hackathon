/* ERLY — the end-of-pact screening report. After day 28 the student can open
   a report of what the month showed and the most likely explanation to
   explore with SAS, in a full-screen viewer, and download it as a PDF built on
   the device. It names a likely explanation; it never claims a diagnosis. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = (en, ar) => I18N.t(en, ar);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const LIKELY = {
    reading: {
      title: 'Dyslexia — a specific learning difficulty in reading',
      profile: 'Profile A · visual decoding',
      why: 'Re-reading loops, slow complexity-adjusted reading pace and early switches to read-aloud stayed above this student’s own normal through the watched fortnight — in both Arabic and English. Friction in both languages is the pattern most consistent with dyslexia, rather than a language barrier.',
      assess: ['Psycho-educational assessment at SAS: word reading, decoding, phonological processing and rapid naming, in Arabic and English', 'Vision screening to rule out a visual cause'],
      accom: ['25% extra time in timed assessments', 'Text-to-speech and a reading-friendly font in exams', 'Course readings released one week in advance', 'Recorded lectures']
    },
    executive: {
      title: 'ADHD — attention and executive-function difficulty',
      profile: 'Profile B · executive friction',
      why: 'Work repeatedly bunched up in the final hours before deadlines, submissions were started and abandoned, and starting each task took far longer than this student’s own normal. Together these are the pattern most consistent with ADHD or an executive-function difficulty.',
      assess: ['ADHD assessment at SAS: clinical interview and validated adult rating scales (e.g. ASRS), with developmental history', 'Screen for anxiety and sleep problems, which can look similar'],
      accom: ['A distraction-reduced testing room', 'A 48-hour extension policy for major projects, by arrangement', 'Assignment briefs broken into dated milestones', 'Focus-sprint coaching']
    },
    strain: {
      title: 'Acquired strain — burnout, anxiety or stress',
      profile: 'Profile C · sudden strain across baselines',
      why: 'Almost every baseline dropped at once — later nights, shorter sessions, slower replies and lower endurance. A sudden, broad change like this is more consistent with burnout, anxiety or a heavy life event than with a learning disability.',
      assess: ['A confidential conversation with a university counsellor first', 'Wellbeing and mental-health screening; learning support can be considered later'],
      accom: ['Counselling sessions', 'A temporary reduced course load', 'Flexible deadlines while working with a counsellor', 'Recorded lectures for missed sessions']
    },
    language: {
      title: 'Second-language (English) load — not a learning disability',
      profile: 'Language load · English pages only',
      why: 'Reading friction appeared on English pages but hardly on Arabic ones. Measured against per-language baselines, that points to second-language load rather than a learning difficulty.',
      assess: ['English language support review; a learning-disability assessment is not indicated by this pattern alone'],
      accom: ['A bilingual glossary of course terms', 'Referral to the English writing centre', 'Extra reading time for English-language exams']
    },
    none: {
      title: 'No persistent pattern',
      profile: 'A steady month',
      why: 'Nothing stayed above this student’s own normal across three or more domains for the watched fortnight. ERLY does not suggest a learning difficulty — but self-referral to SAS is always open.',
      assess: ['None indicated by this screening. The student can self-refer at any time.'],
      accom: ['Keep using the Reading Studio and Start-Ramp tools that helped']
    }
  };
  const DOM_SHORT = { V: 'Visual & reading', U: 'Auditory & video', M: 'Working memory', E: 'Executive & starting', P: 'Endurance & pacing', O: 'Output & drafting', N: 'Navigation', Q: 'Assessment', H: 'Help-seeking', C: 'Collaboration' };
  const TOOL = { tts: 'Read-aloud', summary: '3-line summary', focus: 'Line focus', font: 'Calmer font & spacing', terms: 'Key words', diagram: 'Diagram walk-through', quiz: 'Check question', breather: 'Breathing break' };

  function data() {
    const tr = ERLY.getTrack(), s = tr.summary;
    if (!s || tr.status !== 'ended') return null;
    const order = ['strain', 'language', 'reading', 'executive'];
    const areas = s.flaggedAreas.slice().sort((a, b) => (s.crisis ? order.indexOf(a) - order.indexOf(b) : ((s.areas[b] || {}).score || 0) - ((s.areas[a] || {}).score || 0)));
    const primary = s.crisis ? 'strain' : (s.strong && areas[0]) || 'none';
    const also = s.crisis ? [] : areas.filter(a => a !== primary);
    const start = new Date(tr.start), end = new Date(start.getTime() + 28 * 864e5);
    const strength = !s.strong ? 'Not met' : s.dims.length >= 6 ? 'Strong' : s.dims.length >= 4 ? 'Clear' : 'Moderate';
    const helped = {};
    (tr.helped || []).forEach(h => { helped[h.tool] = helped[h.tool] || [0, 0]; helped[h.tool][0] += h.ok; helped[h.tool][1]++; });
    return {
      tr, s, primary, also, L: LIKELY[primary], strength, start, end,
      generated: new Date(),
      domains: Object.keys(tr.CATS).map(c => ({ k: c, name: tr.CATS[c].en, n: s.catsN[c], persisted: s.dims.includes(c), support: s.catsN[c] == null })),
      top: s.per.filter(p => p.frac >= .5).sort((a, b) => b.frac - a.frac).slice(0, 8),
      helped: Object.entries(helped).map(([k, [ok, n]]) => ({ tool: TOOL[k] || k, pct: Math.round(ok / n * 100), n })),
      ally: tr.pact && tr.pact.ally
    };
  }
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ---------- the viewer ---------- */
  const root = document.createElement('div');
  root.className = 'report'; root.id = 'report'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'ERLY screening report');
  document.body.appendChild(root);

  function pageShell(n, total, body) {
    return `<article class="rpage" style="--pi:${n}"><div class="rpage__in">
      <header class="rp-top"><span class="rp-brand"><b>ERLY</b> by SAS</span><span>Screening report · confidential</span></header>
      ${body}
      <footer class="rp-foot"><span>Screening indication, not a diagnosis. Generated on the student’s device; raw data deleted on day 28.</span><span>Page ${n} of ${total}</span></footer>
    </div></article>`;
  }
  function render(D) {
    const s = D.s;
    const p1 = `
      <section class="rp-hero">
        <p class="rp-k">ERLY screening report</p>
        <h1>What four weeks showed</h1>
        <dl class="rp-meta"><div><dt>Student</dt><dd>Acubins</dd></div><div><dt>Student ID</dt><dd>2026-0417</dd></div><div><dt>Support Pact</dt><dd>${fmt(D.start)} – ${fmt(D.end)}</dd></div><div><dt>Generated</dt><dd>${fmt(D.generated)}</dd></div></dl>
      </section>
      <section class="rp-likely ${D.primary === 'strain' ? 'is-crisis' : D.primary === 'none' ? 'is-none' : ''}">
        <p class="rp-k">${D.primary === 'none' ? 'Result' : 'Most likely explanation to explore'}</p>
        <h2>${esc(D.L.title)}</h2>
        <p class="rp-prof">${esc(D.L.profile)} · pattern strength: <b>${D.strength}</b> (${s.dims.length} of 9 flagging domains persisted)</p>
        <p>${esc(D.L.why)}</p>
        ${D.also.length ? `<p class="rp-also">Also present: ${D.also.map(a => esc(LIKELY[a].profile)).join(' · ')}</p>` : ''}
        <p class="rp-note">This is a screening indication based on behaviour measured only against the student’s own normal. It is not a diagnosis. Only a qualified professional at SAS can confirm a learning disability.</p>
      </section>
      <section class="rp-grid2">
        <div><p class="rp-k">Convergence rule</p><div class="rp-conv">${D.domains.map(d => `<span class="${d.persisted ? 'is-on' : ''} ${d.support ? 'is-na' : ''}" title="${esc(d.name)}">${d.k}</span>`).join('')}</div><p class="rp-small">${s.dims.length >= 3 ? 'Met' : 'Not met'} — an insight needs 3+ domains with 3+ indicators above normal for the whole watched fortnight.</p></div>
        <div><p class="rp-k">Four-signal cluster</p><div class="rp-sig">${s.signals.map(g => `<div class="${g.on ? 'is-on' : ''}"><small>${g.id}</small><b>${esc(g.en)}</b><span>${g.on ? 'persisted' : 'steady'}</span></div>`).join('')}</div></div>
      </section>`;
    const p2 = `
      <section><p class="rp-k">Domains of the 100-point matrix · indicators that persisted</p>
        <div class="rp-bars">${D.domains.map((d, i) => `<div class="rp-bar ${d.persisted ? 'is-on' : ''}" style="--i:${i}"><span>${esc(DOM_SHORT[d.k])}</span><i><b style="--w:${d.support ? 0 : (d.n || 0) * 10}%"></b><em style="left:30%"></em></i><strong>${d.support ? 'support' : (d.n || 0) + '/10'}</strong></div>`).join('')}</div>
        <p class="rp-small">Dashed line = 3 indicators, the level at which a domain persists. Help-seeking never flags; it personalises support.</p></section>
      <section><p class="rp-k">Indicators above the student’s normal on most watched days</p>
        <table class="rp-table"><thead><tr><th>ID</th><th>Indicator</th><th>Days above normal</th></tr></thead><tbody>${D.top.map(p => `<tr><td>${p.id}</td><td>${esc(p.en)}</td><td><span class="rp-dots">${Array.from({ length: s.judged }, (_, k) => `<i class="${k < p.up ? 'is-on' : ''}"></i>`).join('')}</span> ${p.up}/${s.judged}</td></tr>`).join('') || '<tr><td colspan="3">None</td></tr>'}</tbody></table></section>
      <section class="rp-grid2">
        <div><p class="rp-k">Per-language baselines</p>${s.fp.lang.map(r => `<div class="rp-mini"><span>${r[0]}</span><i><b style="--w:${Math.round(r[2] * 100)}%"></b></i><strong>${Math.round(r[2] * 100)}%</strong></div>`).join('')}<p class="rp-small">${s.englishOnly ? 'English only — points to language load.' : s.lang.ar > .3 ? 'Both languages — consistent with a reading difficulty.' : 'No clear language difference.'}</p></div>
        <div><p class="rp-k">Friction fingerprint</p>${s.fp.time.concat(s.fp.deadline).map(r => `<div class="rp-mini"><span>${r[0]}</span><i><b style="--w:${Math.round(Math.min(1, r[2]) * 100)}%"></b></i><strong>${Math.round(Math.min(1, r[2]) * 100)}%</strong></div>`).join('')}</div>
      </section>`;
    const p3 = `
      <section><p class="rp-k">Recommended next steps</p><ol class="rp-steps">${D.L.assess.map(a => `<li>${esc(a)}</li>`).join('')}${D.primary !== 'none' ? '<li>Bring this report and the Evidence Pack to the SAS intake. ' + (D.ally ? esc(D.ally) + ' may attend, as named in the Support Pact.' : 'An ally may attend if the student wishes.') + '</li>' : ''}</ol></section>
      <section><p class="rp-k">${D.primary === 'none' ? 'What to keep doing' : 'Accommodations to discuss — if SAS confirms'}</p><ul class="rp-accom">${D.L.accom.map(a => `<li>${esc(a)}</li>`).join('')}</ul></section>
      <section><p class="rp-k">What helped during the month</p>${D.helped.length ? `<ul class="rp-helped">${D.helped.map(h => `<li><span>${esc(h.tool)}</span><b>${h.pct}%</b><small>helped in ${h.n} tr${h.n === 1 ? 'y' : 'ies'}</small></li>`).join('')}</ul>` : '<p class="rp-small">No “Did that help?” answers were recorded.</p>'}</section>
      <section class="rp-sign"><p class="rp-k">For SAS use</p><div><span>Reviewed by (SAS counsellor)</span><i></i></div><div><span>Assessment outcome</span><i></i></div><div><span>Date</span><i></i></div></section>
      <p class="rp-small">ERLY triages; it never diagnoses. Sensitivity is ERLY’s job; specificity belongs to validated assessments and clinicians. Processed on-device under the student’s Support Pact (UAE PDPL, Federal Decree-Law 45/2021).</p>`;
    root.innerHTML = `
      <header class="report__bar">
        <button class="report__back" data-close-report>${ICON('arrow')}<span>${T('Back to my insight', 'العودة إلى رؤيتي')}</span></button>
        <div class="report__title"><b>ERLY_Screening_Report.pdf</b><small>${T('3 pages · generated on this device', '٣ صفحات · أُنشئ على هذا الجهاز')}</small></div>
        <div class="report__acts"><button class="btn btn--sm btn--ghost" id="rpPrint">${T('Print', 'طباعة')}</button><button class="btn btn--sm btn--accent" id="rpPdf">${ICON('file')}<span>${T('Download PDF', 'تنزيل PDF')}</span></button></div>
      </header>
      <div class="report__scroll" id="rpScroll">
        <p class="report__lang">${I18N.lang === 'ar' ? 'التقرير باللغة الإنجليزية لاستخدامه مع خدمات الطلبة.' : ''}</p>
        ${pageShell(1, 3, p1)}${pageShell(2, 3, p2)}${pageShell(3, 3, p3)}
      </div>`;
    $('#rpPdf', root).onclick = () => pdf(D);
    $('#rpPrint', root).onclick = () => { root.classList.add('is-print'); print(); setTimeout(() => root.classList.remove('is-print'), 400); };
  }

  let lastBtn = null;
  function open(btn) {
    const D = data();
    if (!D) return ERLY.toast(T('Your report is ready after day 28.', 'تقريرك جاهز بعد اليوم ٢٨.'));
    render(D);
    lastBtn = btn;
    const r = btn ? btn.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    root.style.setProperty('--ox', (r.left + r.width / 2) + 'px'); root.style.setProperty('--oy', (r.top + r.height / 2) + 'px');
    root.hidden = false;
    document.documentElement.classList.add('studio-open');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
    setTimeout(() => $('.report__back', root).focus({ preventScroll: true }), 500);
  }
  function close() {
    if (root.hidden) return;
    root.classList.remove('is-open');
    document.documentElement.classList.remove('studio-open');
    setTimeout(() => { if (!root.classList.contains('is-open')) root.hidden = true; if (lastBtn) lastBtn.focus({ preventScroll: true }); }, reduce ? 0 : 620);
  }
  ERLY.openReport = open;
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-report]'); if (b) { e.preventDefault(); open(b); return; }
    if (e.target.closest('[data-close-report]')) close();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) close(); });

  /* ---------- the PDF, drawn as vectors on the device ---------- */
  function hex(c, fb) { c = (c || '').trim(); if (/^#[0-9a-f]{6}$/i.test(c)) return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; return fb; }
  function pdf(D) {
    if (!window.jspdf) return ERLY.toast('PDF library failed to load.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const cs = getComputedStyle(document.documentElement);
    const ACC = hex(cs.getPropertyValue('--accent'), [193, 80, 43]);
    const INK = [27, 25, 21], MUT = [110, 103, 91], LINE = [221, 212, 196], SOFT = [241, 235, 224], GOOD = [46, 125, 79], VIO = [91, 75, 138];
    const W = 210, M = 18, CW = W - 2 * M;
    let y = 0;
    const s = D.s;
    const text = (t, x, yy, o = {}) => { doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(o.size || 10); doc.setTextColor(...(o.color || INK)); const lines = doc.splitTextToSize(String(t), o.w || CW); doc.text(lines, x, yy, { lineHeightFactor: o.lh || 1.35, align: o.align }); return lines.length * (o.size || 10) * 0.3528 * (o.lh || 1.35); };
    const label = (t, yy) => { text(t.toUpperCase(), M, yy, { size: 7.5, bold: true, color: MUT }); return yy + 5; };
    const head = n => {
      doc.setFillColor(...ACC); doc.rect(0, 0, W, 3, 'F');
      text('ERLY', M, 12, { size: 11, bold: true }); text('by SAS', M + 11, 12, { size: 9, color: MUT });
      text('Screening report · confidential', W - M, 12, { size: 8, color: MUT, align: 'right' });
      doc.setDrawColor(...LINE); doc.line(M, 16, W - M, 16);
      doc.setDrawColor(...LINE); doc.line(M, 282, W - M, 282);
      text('Screening indication, not a diagnosis. Generated on the student’s device; raw data deleted on day 28.', M, 287, { size: 7, color: MUT, w: 140 });
      text(`Page ${n} of 3`, W - M, 287, { size: 7, color: MUT, align: 'right' });
      return 26;
    };
    const bar = (x, yy, w, frac, col) => { doc.setFillColor(...SOFT); doc.roundedRect(x, yy, w, 3.2, 1.6, 1.6, 'F'); if (frac > 0) { doc.setFillColor(...col); doc.roundedRect(x, yy, Math.max(3.2, w * Math.min(1, frac)), 3.2, 1.6, 1.6, 'F'); } };

    // page 1
    y = head(1);
    text('ERLY SCREENING REPORT', M, y, { size: 8, bold: true, color: ACC }); y += 9;
    text('What four weeks showed', M, y, { size: 24, bold: true }); y += 10;
    [['Student', 'Acubins'], ['Student ID', '2026-0417'], ['Support Pact', `${fmt(D.start)} – ${fmt(D.end)}`], ['Generated', fmt(D.generated)]].forEach(([k, v], i) => {
      const x = M + (i % 2) * (CW / 2), yy = y + Math.floor(i / 2) * 11;
      text(k.toUpperCase(), x, yy, { size: 7, bold: true, color: MUT }); text(v, x, yy + 5, { size: 10.5 });
    });
    y += 26;
    const boxCol = D.primary === 'strain' ? VIO : D.primary === 'none' ? GOOD : ACC;
    const bodyH = doc.splitTextToSize(D.L.why, CW - 16).length * 4.7 + (D.also.length ? 7 : 0);
    const boxH = 36 + bodyH;
    doc.setFillColor(...boxCol); doc.roundedRect(M, y, CW, boxH, 4, 4, 'F');
    doc.setFillColor(255, 255, 255); doc.setGState && doc.setGState(new doc.GState({ opacity: .9 })); doc.roundedRect(M + 1.2, y + 1.2, CW - 2.4, boxH - 2.4, 3.4, 3.4, 'F'); doc.setGState && doc.setGState(new doc.GState({ opacity: 1 }));
    doc.setFillColor(...boxCol); doc.rect(M + 1.2, y + 1.2, 2.6, boxH - 2.4, 'F');
    let by = y + 9;
    text(D.primary === 'none' ? 'RESULT' : 'MOST LIKELY EXPLANATION TO EXPLORE', M + 8, by, { size: 7.5, bold: true, color: boxCol }); by += 8;
    by += text(D.L.title, M + 8, by, { size: 15, bold: true, w: CW - 16, lh: 1.2 }) + 1;
    by += text(`${D.L.profile} · pattern strength: ${D.strength} (${s.dims.length} of 9 flagging domains persisted)`, M + 8, by, { size: 8.5, color: MUT, w: CW - 16 }) + 2;
    by += text(D.L.why, M + 8, by, { size: 9.5, w: CW - 16, lh: 1.4 });
    if (D.also.length) by += text('Also present: ' + D.also.map(a => LIKELY[a].profile).join(' · '), M + 8, by + 2, { size: 8.5, color: MUT, w: CW - 16 }) + 2;
    y += boxH + 6;
    y += text('This is a screening indication based on behaviour measured only against the student’s own normal. It is not a diagnosis. Only a qualified professional at SAS can confirm a learning disability.', M, y, { size: 8.5, color: MUT, lh: 1.4 }) + 6;
    y = label('Convergence rule', y);
    D.domains.forEach((d, i) => { const x = M + i * 9; doc.setFillColor(...(d.persisted ? ACC : SOFT)); doc.roundedRect(x, y, 7.5, 7.5, 1.8, 1.8, 'F'); text(d.k, x + 3.75, y + 5, { size: 8, bold: true, color: d.persisted ? [255, 255, 255] : MUT, align: 'center' }); });
    text(`${s.dims.length >= 3 ? 'Met' : 'Not met'} — ${s.dims.length} domains persisted; an insight needs 3+.`, M + 95, y + 5, { size: 8.5, color: MUT, w: CW - 95 });
    y += 15;
    y = label('Four-signal cluster', y);
    s.signals.forEach((g, i) => { const w = (CW - 9) / 4, x = M + i * (w + 3); doc.setDrawColor(...(g.on ? ACC : LINE)); doc.setFillColor(...(g.on ? [252, 241, 235] : [250, 248, 242])); doc.roundedRect(x, y, w, 22, 2.5, 2.5, 'FD'); text(g.id, x + 3, y + 5, { size: 7, color: MUT }); text(g.en, x + 3, y + 10, { size: 8.5, bold: true, w: w - 6, lh: 1.15 }); text(g.on ? 'persisted' : 'steady', x + 3, y + 19, { size: 7.5, color: g.on ? ACC : MUT }); });

    // page 2
    doc.addPage(); y = head(2);
    y = label('Domains of the 100-point matrix · indicators that persisted', y);
    D.domains.forEach(d => {
      text(DOM_SHORT[d.k], M, y + 2.6, { size: 9 });
      bar(M + 48, y, 100, d.support ? 0 : (d.n || 0) / 10, d.persisted ? ACC : [190, 180, 165]);
      doc.setDrawColor(...INK); doc.setLineDashPattern([0.8, 0.8], 0); doc.line(M + 48 + 30, y - 1, M + 48 + 30, y + 4.2); doc.setLineDashPattern([], 0);
      text(d.support ? 'support' : `${d.n || 0}/10`, W - M, y + 2.6, { size: 8.5, color: d.persisted ? ACC : MUT, align: 'right', bold: d.persisted });
      y += 7.5;
    });
    y += text('Dashed line = 3 indicators, the level at which a domain persists. Help-seeking never flags; it personalises support.', M, y, { size: 7.5, color: MUT }) + 6;
    y = label('Indicators above the student’s normal on most watched days', y);
    doc.setFillColor(...SOFT); doc.rect(M, y - 3.5, CW, 6, 'F');
    text('ID', M + 2, y + 0.6, { size: 7.5, bold: true, color: MUT }); text('Indicator', M + 16, y + 0.6, { size: 7.5, bold: true, color: MUT }); text('Days above normal', W - M - 2, y + 0.6, { size: 7.5, bold: true, color: MUT, align: 'right' });
    y += 7;
    (D.top.length ? D.top : [{ id: '—', en: 'None', up: 0 }]).forEach(p => {
      text(p.id, M + 2, y, { size: 8.5, color: ACC }); text(p.en, M + 16, y, { size: 9, w: 90 });
      for (let k = 0; k < s.judged; k++) { doc.setFillColor(...(k < p.up ? ACC : LINE)); doc.rect(M + 112 + k * 3.2, y - 2.8, 2.4, 3.6, 'F'); }
      text(`${p.up}/${s.judged}`, W - M - 2, y, { size: 8.5, align: 'right' });
      doc.setDrawColor(...LINE); doc.line(M, y + 2.6, W - M, y + 2.6);
      y += 7.5;
    });
    y += 4;
    const colW = CW / 2 - 4;
    let ly = label('Per-language baselines', y), ry = y;
    s.fp.lang.forEach(r => { text(r[0], M, ly + 2.6, { size: 9 }); bar(M + 30, ly, colW - 44, r[2], [42, 120, 214]); text(Math.round(r[2] * 100) + '%', M + colW, ly + 2.6, { size: 8.5, align: 'right' }); ly += 7; });
    ly += text(s.englishOnly ? 'English only — points to language load.' : s.lang.ar > .3 ? 'Both languages — consistent with a reading difficulty.' : 'No clear language difference.', M, ly + 1, { size: 8, color: MUT, w: colW });
    text('FRICTION FINGERPRINT', M + colW + 8, ry, { size: 7.5, bold: true, color: MUT }); ry += 5;
    s.fp.time.concat(s.fp.deadline).forEach(r => { const v = Math.min(1, r[2]); text(r[0], M + colW + 8, ry + 2.6, { size: 9 }); bar(M + colW + 40, ry, colW - 50, v, [27, 175, 122]); text(Math.round(v * 100) + '%', W - M, ry + 2.6, { size: 8.5, align: 'right' }); ry += 7; });

    // page 3
    doc.addPage(); y = head(3);
    y = label('Recommended next steps', y);
    const steps = D.L.assess.concat(D.primary !== 'none' ? ['Bring this report and the Evidence Pack to the SAS intake. ' + (D.ally ? D.ally + ' may attend, as named in the Support Pact.' : 'An ally may attend if the student wishes.')] : []);
    steps.forEach((a, i) => { doc.setFillColor(...ACC); doc.circle(M + 2.5, y - 1.2, 2.5, 'F'); text(String(i + 1), M + 2.5, y, { size: 7.5, bold: true, color: [255, 255, 255], align: 'center' }); y += text(a, M + 8, y, { size: 9.5, w: CW - 8 }) + 3; });
    y += 4;
    y = label(D.primary === 'none' ? 'What to keep doing' : 'Accommodations to discuss — if SAS confirms', y);
    D.L.accom.forEach(a => { doc.setFillColor(...GOOD); doc.circle(M + 1.5, y - 1.2, 1.1, 'F'); y += text(a, M + 6, y, { size: 9.5, w: CW - 6 }) + 2; });
    y += 5;
    y = label('What helped during the month', y);
    if (D.helped.length) D.helped.forEach(h => { text(h.tool, M, y + 2.6, { size: 9 }); bar(M + 50, y, 90, h.pct / 100, GOOD); text(`${h.pct}% · ${h.n} tr${h.n === 1 ? 'y' : 'ies'}`, W - M, y + 2.6, { size: 8.5, align: 'right' }); y += 7; });
    else y += text('No “Did that help?” answers were recorded.', M, y, { size: 9, color: MUT }) + 2;
    y += 8;
    y = label('For SAS use', y);
    ['Reviewed by (SAS counsellor)', 'Assessment outcome', 'Date'].forEach(k => { text(k, M, y + 6, { size: 9, color: MUT }); doc.setDrawColor(...INK); doc.line(M + 60, y + 6.5, W - M, y + 6.5); y += 12; });
    y += 6;
    text('ERLY triages; it never diagnoses. Sensitivity is ERLY’s job; specificity belongs to validated assessments and clinicians. Processed on-device under the student’s Support Pact (UAE PDPL, Federal Decree-Law 45/2021).', M, y, { size: 8, color: MUT, lh: 1.4 });

    doc.setProperties({ title: 'ERLY Screening Report — Acubins', subject: 'Screening indication, not a diagnosis', creator: 'ERLY by SAS' });
    doc.save('ERLY_Screening_Report.pdf');
    ERLY.toast(T('PDF saved to your device. Nothing was uploaded.', 'حُفظ ملف PDF على جهازك. لم يُرفع شيء.'));
  }
  ERLY.reportPdf = () => { const D = data(); if (D) pdf(D); };
})();
