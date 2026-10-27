/* ERLY — the insight. After day 14, the tracker's summary becomes a gentle,
   pictorial page: the month as weather, illustrations of what each area
   may feel like, where it showed up, what went well, and what helps.
   It describes friction; it never names a condition. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const T = (en, ar) => I18N.t(en, ar);
  const box = $('#insightBox');
  let tr = ERLY.getTrack ? ERLY.getTrack() : null;
  ERLY.on('track', t => { tr = t; render(); });

  const W_ICON = {
    sun: '<svg viewBox="0 0 48 48"><g class="wx-sun"><circle cx="24" cy="24" r="9" fill="#F5C443"/><g stroke="#F5C443" stroke-width="3" stroke-linecap="round">' + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${24 + Math.cos(a) * 14}" y1="${24 + Math.sin(a) * 14}" x2="${24 + Math.cos(a) * 19}" y2="${24 + Math.sin(a) * 19}"/>`; }).join('') + '</g></g></svg>',
    part: '<svg viewBox="0 0 48 48"><circle cx="18" cy="18" r="8" fill="#F5C443"/><path class="wx-cloud" d="M14 36h22a7 7 0 0 0 0-14 10 10 0 0 0-19 2 6 6 0 0 0-3 12z" fill="#E4E2EE" stroke="#B9B5CC" stroke-width="1.5"/></svg>',
    cloud: '<svg viewBox="0 0 48 48"><path class="wx-cloud" d="M11 34h26a8 8 0 0 0 0-16 11 11 0 0 0-21 2 7 7 0 0 0-5 14z" fill="#CFCBE0" stroke="#A29DBA" stroke-width="1.5"/></svg>',
    rain: '<svg viewBox="0 0 48 48"><path d="M11 28h26a8 8 0 0 0 0-16 11 11 0 0 0-21 2 7 7 0 0 0-5 14z" fill="#B9B4D0" stroke="#8F89AD" stroke-width="1.5"/><g class="wx-rain" stroke="#6E9BD6" stroke-width="2.4" stroke-linecap="round"><line x1="17" y1="33" x2="15" y2="39"/><line x1="25" y1="33" x2="23" y2="39"/><line x1="33" y1="33" x2="31" y2="39"/></g></svg>',
    sprout: '<svg viewBox="0 0 48 48"><path d="M24 40V22" stroke="#4DB3A8" stroke-width="3" stroke-linecap="round"/><path d="M24 26c-8 0-12-5-12-11 7 0 12 4 12 11zM24 22c0-7 5-11 12-11 0 6-4 11-12 11z" fill="#4DB3A8"/><path d="M14 40h20" stroke="#A3875E" stroke-width="3" stroke-linecap="round"/></svg>'
  };
  const W_LABEL = { sprout: ['baseline week', 'أسبوع الأساس'], sun: ['clear', 'صافٍ'], part: ['a little friction', 'احتكاك خفيف'], cloud: ['harder day', 'يوم أصعب'], rain: ['heavy day', 'يوم ثقيل'] };

  const ILLO = {
    reading: `<svg viewBox="0 0 320 200" class="illo" aria-hidden="true"><rect x="40" y="18" width="170" height="168" rx="10" fill="var(--surface)" stroke="var(--line-2)"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<g>${[0, 1, 2].map(j => `<rect x="${58 + j * 48 + (i % 2) * 6}" y="${40 + i * 18}" width="${36 + ((i + j) % 3) * 6}" height="7" rx="3.5" fill="var(--line-2)" class="${(i * 3 + j) % 5 === 2 ? 'il-drift' : ''}"/>`).join('')}</g>`).join('')}<g class="il-loupe"><circle cx="236" cy="104" r="44" fill="var(--bg)" stroke="var(--ink)" stroke-width="5"/><line x1="268" y1="136" x2="296" y2="166" stroke="var(--ink)" stroke-width="9" stroke-linecap="round"/><text x="212" y="116" font-size="34" font-family="Fraunces, serif" fill="var(--accent)" class="il-b">b</text><text x="242" y="116" font-size="34" font-family="Fraunces, serif" fill="var(--teal)" class="il-d">d</text></g></svg>`,
    attention: `<svg viewBox="0 0 320 200" class="illo" aria-hidden="true"><line x1="30" y1="170" x2="300" y2="170" stroke="var(--line-2)" stroke-width="2"/><path class="il-curve" d="M30 160 C 90 158, 150 160, 200 154 S 250 70, 268 40 L 282 160" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/><g transform="translate(272 22)"><line x1="0" y1="0" x2="0" y2="150" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 4"/><path d="M0 0h22l-6 7 6 7H0z" fill="var(--accent)"/></g><g class="il-door"><rect x="60" y="74" width="54" height="84" rx="4" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2.5"/><circle cx="104" cy="118" r="3" fill="var(--ink)"/></g><g class="il-push"><circle cx="40" cy="104" r="9" fill="var(--s3)"/><path d="M40 113v26M40 120l18-6M40 139l-8 18M40 139l10 18" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></g></svg>`,
    language: `<svg viewBox="0 0 320 200" class="illo" aria-hidden="true"><g transform="translate(46 30)"><rect width="100" height="130" rx="8" fill="var(--teal)" opacity=".85"/><rect x="10" y="12" width="80" height="106" rx="4" fill="var(--surface)"/><text x="50" y="72" font-size="34" text-anchor="middle" font-family="IBM Plex Sans Arabic" fill="var(--teal)">ع</text></g><g transform="translate(174 30)" class="il-heavy"><rect width="100" height="130" rx="8" fill="var(--accent)" opacity=".85"/><rect x="10" y="12" width="80" height="106" rx="4" fill="var(--surface)"/><text x="50" y="74" font-size="34" text-anchor="middle" font-family="Fraunces" fill="var(--accent)">Aa</text></g></svg>`,
    strain: `<svg viewBox="0 0 320 200" class="illo" aria-hidden="true"><rect x="60" y="64" width="170" height="80" rx="16" fill="none" stroke="var(--ink)" stroke-width="5"/><rect x="232" y="88" width="16" height="32" rx="4" fill="var(--ink)"/><rect x="72" y="76" width="50" height="56" rx="8" fill="var(--accent)" class="il-batt"/><path d="M150 44c8 10 8 18 0 26M176 34c12 16 12 30 0 46" fill="none" stroke="var(--s3)" stroke-width="4" stroke-linecap="round" class="il-zz"/><text x="64" y="176" font-size="12" fill="var(--muted)" font-family="JetBrains Mono">recharge, then restart</text></svg>`
  };
  ILLO.executive = ILLO.attention;
  ILLO.strain = ILLO.strain.replace('recharge, then restart', '');
  const FEEL = {
    reading: { h: ['Words that won\'t sit still', 'كلمات لا تهدأ في مكانها'], p: ['Reading took more passes and more time than your own normal — in both Arabic and English. That pattern is worth a closer look; it isn\'t about effort or intelligence.', 'تطلّبت القراءة قراءات أكثر ووقتاً أطول من معدلك — بالعربية والإنجليزية معاً. هذا النمط يستحق نظرة أقرب؛ ولا علاقة له بالجهد أو الذكاء.'] },
    executive: { h: ['The heavy door', 'الباب الثقيل'], p: ['Starting felt like pushing a heavy door — then work bunched up near deadlines and some drafts were left behind. That\'s friction, not laziness.', 'بدا البدء كدفع باب ثقيل — ثم تكدّس العمل قرب المواعيد وتُركت بعض المسودات. هذا احتكاك، لا كسل.'] },
    language: { h: ['One language feels heavier', 'لغة تبدو أثقل'], p: ['Reading friction showed up on English pages but hardly on Arabic ones. That points to language load rather than a learning difference — English support may help most.', 'ظهر احتكاك القراءة في الصفحات الإنجليزية وبالكاد في العربية. هذا يشير إلى عبء لغة لا إلى صعوبة تعلّم — وقد يفيد دعم الإنجليزية أكثر.'] },
    strain: { h: ['Running low', 'طاقة منخفضة'], p: ['Many unrelated things shifted at once — later nights, shorter sessions, slower replies. Sometimes that\'s workload; sometimes it\'s life.', 'تغيّرت أشياء كثيرة غير مترابطة دفعة واحدة — ليالٍ أطول، وجلسات أقصر، وردود أبطأ. أحياناً يكون العبء، وأحياناً الحياة.'] }
  };
  // Help options, ordered by the Learning Blueprint
  const HELP = {
    listen: ['volume', 'Read-aloud with a friendly voice', 'القراءة الصوتية بصوت ودود'],
    read: ['file', 'Plain-words summaries', 'ملخصات بكلمات بسيطة'],
    see: ['layers', 'Mind-maps of each reading', 'خرائط ذهنية لكل قراءة'],
    do: ['rocket', 'Micro-tasks you can tick off', 'مهام صغيرة تنجزها'],
    font: ['text', 'Dyslexia-friendly font & spacing', 'خط وتباعد مناسبان لعسر القراءة'],
    focus: ['ruler', 'Line focus', 'تركيز السطر'],
    time: ['hourglass', 'Extra time — ask SAS', 'وقت إضافي — اسأل الخدمات'],
    ramp: ['rocket', 'Start-Ramp: 5-minute first steps', 'منحدر البدء: خطوات أولى من ٥ دقائق'],
    sprint: ['timer', 'Focus sprints', 'جولات تركيز'],
    nudge: ['clock', 'Deadline nudges at 72 h and 24 h', 'تذكيرات قبل ٧٢ و٢٤ ساعة'],
    room: ['users', 'Body-doubling study room', 'غرفة دراسة مع رفيق'],
    gloss: ['globe', 'Glossary with Arabic meanings', 'مسرد بالمعاني العربية'],
    write: ['pen', 'English writing centre', 'مركز الكتابة الإنجليزية'],
    talk: ['chat', 'Talk to a counsellor', 'تحدّث مع مرشد'],
    rest: ['cup', 'Planned rest days', 'أيام راحة مخططة'],
    load: ['calendar', 'Course-load conversation', 'نقاش العبء الدراسي']
  };
  const HELPS_FOR = { reading: ['listen', 'font', 'focus', 'read', 'see', 'time'], language: ['gloss', 'read', 'write', 'listen'], executive: ['ramp', 'sprint', 'nudge', 'room', 'do'], strain: ['talk', 'rest', 'load', 'room'] };
  function helpsFor(area, bp) {
    let list = HELPS_FOR[area].slice();
    const pref = bp.learn === 'listen' ? 'listen' : bp.learn === 'see' ? 'see' : bp.learn === 'read' ? 'read' : bp.learn === 'do' ? 'do' : null;
    if (pref) { if (!list.includes(pref)) list.unshift(pref); else list = [pref, ...list.filter(x => x !== pref)]; }
    if (bp.focus === 'sprint' && area === 'executive') list = ['sprint', ...list.filter(x => x !== 'sprint')];
    return list.slice(0, 4);
  }
  const TOOL_N = { tts: ['Read-aloud', 'القراءة الصوتية'], summary: ['3-line summary', 'ملخص من ٣ أسطر'], focus: ['Line focus', 'تركيز السطر'], font: ['Calmer font & spacing', 'خط وتباعد أهدأ'], terms: ['Key words', 'الكلمات المهمة'], diagram: ['Diagram walk-through', 'شرح الرسم'], quiz: ['Check question', 'سؤال فهم'], breather: ['Breathing break', 'استراحة تنفّس'] };
  const weatherOf = (d, total) => d.n <= tr.BLIND ? 'sprout' : d.paused ? 'sprout' : d.flags === 0 ? 'sun' : d.flags / total <= .06 ? 'part' : d.flags / total <= .16 ? 'cloud' : 'rain';

  function samples() {
    return `<div class="sample-row">${[['reading', 'Profile A', 'النمط أ'], ['executive', 'Profile B', 'النمط ب'], ['strain', 'Profile C', 'النمط ج'], ['language', 'English only', 'الإنجليزية فقط'], ['typical', 'Typical', 'عادي']].map(([k, en, ar]) => `<button class="chip" data-demo="${k}">${T(en, ar)}</button>`).join('')}</div>`;
  }
  function render() {
    if (!box) return;
    const ended = tr && tr.status === 'ended' && tr.summary;
    if (!ended) {
      box.innerHTML = `<div class="ins-empty">
        <div class="ins-empty__ic">${ICON('sparkle')}</div>
        <h3>${tr && tr.status === 'active' ? T(`Your picture appears after day 14 — you're on day ${tr.day}.`, `تظهر صورتك بعد اليوم ١٤ — أنت في اليوم ${tr.day}.`) : T('Your picture appears after the two weeks of your Support Pact.', 'تظهر صورتك بعد أسبوعي ميثاق الدعم.')}</h3>
        <p>${T('It brings together all 100 indicators — drawn gently, never as a label. Preview a sample:', 'تجمع المؤشرات المئة — مرسومة بلطف، ولا تصنيف أبداً. عاين مثالاً:')}</p>
        ${samples()}</div>`;
      return;
    }
    const sum = tr.summary;
    const bp = tr.blueprint || {};
    const areas = sum.flaggedAreas;
    const top = sum.per.filter(p => p.frac >= .5).sort((a, b) => b.frac - a.frac).slice(0, 6);
    const calm = Object.entries(sum.cats).filter(([, v]) => v != null && v < .15).map(([k]) => k).slice(0, 3);
    const totalFlag = Math.max(1, sum.per.length);
    const worked = {};
    (tr.helped || []).forEach(h => { worked[h.tool] = worked[h.tool] || [0, 0]; worked[h.tool][0] += h.ok; worked[h.tool][1]++; });
    const bar = (l, v, c) => `<div class="fp__r"><span>${l}</span><span class="fp__b"><i style="--w:${Math.round(v * 100)}%;--c:${c}"></i></span><b class="mono">${Math.round(v * 100)}%</b></div>`;
    box.innerHTML = `
      <div class="ins-hero">
        <div>
          <p class="contract__k mono">${T('Your picture · 14 days · only you can see this', 'صورتك · ١٤ يوماً · أنت فقط من يراها')}</p>
          <h3>${sum.crisis ? T('A lot changed at once. You don’t have to sort it out alone.', 'تغيّر الكثير دفعة واحدة. لست مضطراً لترتيب ذلك وحدك.') : areas.length ? T('Here\'s what we noticed — and what it might feel like.', 'إليك ما لاحظناه — وكيف قد يبدو الشعور.') : T('A steady month. Nothing stood out against your normal.', 'شهر مستقر. لم يبرز شيء مقارنةً بمعدلك.')}</h3>
          <p>${T('This isn\'t a diagnosis. It\'s a picture you can take to someone who can help — or keep to yourself.', 'هذا ليس تشخيصاً. إنها صورة يمكنك أخذها لمن يستطيع المساعدة — أو الاحتفاظ بها لنفسك.')}</p>
          ${samples()}
        </div>
        <div class="ins-hero__stat"><b>${sum.dims.length}<small>/10</small></b><span>${T('domains stayed above your normal for the watched week · 3+ needed', 'مجالات بقيت فوق معدلك طوال أسبوع المراقبة · يلزم ٣ أو أكثر')}</span></div>
      </div>
      <button class="rep-cta" data-report>
        <span class="rep-cta__doc" aria-hidden="true"><i></i><i></i><i></i><i></i><b>PDF</b></span>
        <span class="rep-cta__txt"><small class="mono">${T('Your screening report is ready', 'تقرير الفحص جاهز')}</small><b>${sum.crisis ? T('Acquired strain — talk to a counsellor first', 'ضغط مكتسب — تحدّث مع مرشد أولاً') : !sum.strong ? T('No persistent pattern', 'لا يوجد نمط مستمر') : T(...({ reading: ['Most likely: dyslexia-type reading difficulty', 'الأرجح: صعوبة قراءة من نوع عسر القراءة'], executive: ['Most likely: ADHD-type executive difficulty', 'الأرجح: صعوبة تنفيذية من نوع فرط الحركة'], language: ['Most likely: English language load, not a disability', 'الأرجح: عبء اللغة الإنجليزية، لا إعاقة'], strain: ['Acquired strain — talk to a counsellor first', 'ضغط مكتسب — تحدّث مع مرشد أولاً'] }[sum.flaggedAreas[0]] || ['Your month, explained', 'شهرك، مشروحاً']))}</b><span>${T('3 pages · likely explanation, evidence, next steps · download as PDF', '٣ صفحات · التفسير الأرجح، والأدلة، والخطوات التالية · نزّله PDF')}</span></span>
        <span class="rep-cta__go">${ICON('arrow')}</span>
      </button>
      ${sum.crisis ? `<div class="crisis"><span class="crisis__ic">${ICON('hand')}</span><div><h4>${T('Talk to a person first', 'تحدّث مع إنسان أولاً')}</h4><p>${T('When almost everything shifts at once, it is usually not a learning difference — it can be burnout, anxiety or something heavy happening in life. ERLY won’t suggest tools here. A counsellor can talk with you today, confidentially.', 'عندما يتغيّر كل شيء تقريباً دفعة واحدة، فغالباً ليس صعوبة تعلّم — قد يكون إرهاقاً أو قلقاً أو أمراً ثقيلاً في الحياة. لن يقترح إيرلي أدوات هنا. يمكن لمرشد التحدث معك اليوم، بسرية.')}</p><div class="row-btns"><a href="#handoff" class="btn btn--accent">${T('Book a counsellor today', 'احجز مرشداً اليوم')}</a><button class="btn btn--ghost" data-call>${T('Call the 24/7 line', 'اتصل بالخط المتاح دائماً')}</button></div></div></div>` : ''}
      ${areas.length ? `<div class="evcard">
        <div class="evcard__head"><span class="evcard__k mono">${T('Evidence card', 'بطاقة الأدلة')} · ${T('on this device', 'على هذا الجهاز')}</span><span class="honesty honesty--live">${T('you see it first', 'أنت تراها أولاً')}</span></div>
        <div class="evcard__cols">
          <div dir="ltr" lang="en"><b>Over days 8–14, these stayed above your own normal:</b><ol>${sum.top3.map(p => `<li><span class="mono">${p.id}</span>${p.en}<em>${p.up}/${sum.judged} days</em></li>`).join('')}</ol><small>Not a diagnosis. Compared only with you.</small></div>
          <div dir="rtl" lang="ar"><b>خلال الأيام ٨–١٤، بقيت هذه فوق معدلك:</b><ol>${sum.top3.map(p => `<li><span class="mono">${p.id}</span>${p.ar}<em>${p.up}/${sum.judged} يوماً</em></li>`).join('')}</ol><small>ليس تشخيصاً. مقارنة بك أنت فقط.</small></div>
        </div></div>` : ''}
      <div class="ins-card ins-weather">
        <div class="ins-card__head"><h4>${T('Your month, as weather', 'شهرك، كطقس')}</h4><span class="small muted">${T('Sprouts = baseline week, learning your normal · more cloud = more indicators above it', 'البراعم = أسبوع الأساس · غيوم أكثر = مؤشرات أكثر فوق معدلك')}</span></div>
        <ol class="wx wx--28">${sum.daily.map((d, i) => { const w = weatherOf(d, totalFlag); return `<li class="wx__d ${d.exam ? 'is-exam' : ''}" style="--i:${i}" title="${T('Day', 'اليوم')} ${d.n} · ${T(...W_LABEL[w])}${d.exam ? ' · ' + T('exam week', 'أسبوع امتحانات') : ''}"><span class="mono">${d.n}</span>${W_ICON[w]}</li>`; }).join('')}</ol>
        <div class="wx__legend">${Object.keys(W_LABEL).map(k => `<span>${W_ICON[k]}${T(...W_LABEL[k])}</span>`).join('')}</div>
      </div>
      ${areas.length && !sum.crisis ? `<div class="ins-feel">${areas.map(a => `<article class="ins-card ins-feel__c ${areas.length === 1 ? 'is-wide' : ''}"><div class="ins-illo">${ILLO[a === 'language' ? 'language' : a]}</div><h4>${T(...FEEL[a].h)}</h4><p>${T(...FEEL[a].p)}</p></article>`).join('')}</div>` : ''}
      <div class="ins-grid">
        <div class="ins-card">
          <h4>${T('Friction fingerprint', 'بصمة الاحتكاك')}</h4>
          <p class="small muted">${T('Where strain happened — metadata only.', 'أين حدث الضغط — بيانات وصفية فقط.')}</p>
          <div class="fp">${sum.fp.lang.map(r => bar(T(r[0], r[1]), r[2], 'var(--c-R)')).join('')}<hr>${sum.fp.format.map(r => bar(T(r[0], r[1]), r[2], 'var(--c-R)')).join('')}<hr>${sum.fp.time.map(r => bar(T(r[0], r[1]), r[2], 'var(--c-W)')).join('')}<hr>${sum.fp.deadline.map(r => bar(T(r[0], r[1]), r[2], 'var(--c-L)')).join('')}</div>
          <p class="small fp__note">${sum.englishOnly ? T('Strain showed up in English only — more like language load than a learning difference.', 'ظهر الضغط في الإنجليزية فقط — أقرب إلى عبء اللغة منه إلى صعوبة تعلّم.') : sum.lang.ar > .3 ? T('Strain showed up in both languages — the pattern worth a closer look.', 'ظهر الضغط في اللغتين — وهذا النمط يستحق نظرة أقرب.') : T('No clear language difference.', 'لا فرق واضح بين اللغتين.')}</p>
        </div>
        <div class="ins-card">
          <h4>${T('Where it showed up', 'أين ظهر')}</h4>
          ${top.length ? `<div class="ins-where">${top.map(p => `<div class="ins-where__r" style="--c:var(--accent)"><span>${T(p.en, p.ar)}</span><span class="ins-where__b">${Array.from({ length: sum.judged }, (_, k) => `<i class="${k < p.up ? 'is-on' : ''}"></i>`).join('')}</span><b class="mono">${p.up}/${sum.judged}</b></div>`).join('')}</div>` : `<p class="muted">${T('No indicator stayed above your normal on most days.', 'لم يبقَ أي مؤشر فوق معدلك في معظم الأيام.')}</p>`}
          <h4 class="ins-sub">${T('What stayed steady', 'ما بقي ثابتاً')}</h4>
          <ul class="ins-steady">${(calm.length ? calm : ['H']).map(c => `<li><span>${ICON(tr.CATS[c].icon)}</span>${T(tr.CATS[c].en, tr.CATS[c].ar)}</li>`).join('')}</ul>
        </div>
        <div class="ins-card">
          <h4>${sum.crisis ? T('What helps first', 'ما يساعد أولاً') : T('Picked for you', 'مختارة لك')}</h4>
          <p class="small muted">${bp.learn ? T('Ordered by your Learning Blueprint.', 'مرتبة حسب مخطط تعلّمك.') : T('Fill in your Learning Blueprint to personalise these.', 'املأ مخطط تعلّمك لتخصيص هذه.')}</p>
          <div class="ins-helps">${(sum.crisis ? ['talk', 'rest', 'load', 'room'] : helpsFor(areas[0] || 'reading', bp)).map(k => `<div><span>${ICON(HELP[k][0])}</span>${T(HELP[k][1], HELP[k][2])}</div>`).join('')}</div>
          <h4 class="ins-sub">${T('What worked for you', 'ما نجح معك')}</h4>
          ${Object.keys(worked).length ? `<ul class="ins-worked">${Object.entries(worked).map(([k, [ok, n]]) => `<li><span>${T(...(TOOL_N[k] || [k, k]))}</span><b class="mono">${Math.round(ok / n * 100)}%</b><small>${T(`helped ${ok.toFixed(ok % 1 ? 1 : 0)} of ${n}`, `ساعد ${ok} من ${n}`)}</small></li>`).join('')}</ul>` : `<p class="small muted">${T('Use a tool in the Reading Studio and answer Noor’s “Did that help?” — ERLY learns what works for you.', 'استخدم أداة في استوديو القراءة وأجب عن سؤال نور «هل ساعد ذلك؟» — يتعلّم إيرلي ما يناسبك.')}</p>`}
        </div>
      </div>
      <div class="ins-next">
        <p>${sum.crisis ? T('A counsellor first. If you want, SAS can look at learning support later — there’s no rush.', 'المرشد أولاً. وإن أردت، يمكن لخدمات الطلبة النظر في دعم التعلّم لاحقاً — لا عجلة.') : sum.strong ? T('Your month points clearly in one direction. That\'s enough to talk to SAS — they can tell you <b>why</b>, and what support you\'re entitled to.', 'شهرك يشير بوضوح إلى اتجاه واحد. هذا كافٍ للحديث مع خدمات الطلبة — يمكنهم إخبارك <b>لماذا</b>، وما الدعم الذي يحق لك.') : T('You can take this picture to SAS whenever you like — or keep using your tools.', 'يمكنك أخذ هذه الصورة إلى خدمات الطلبة متى شئت — أو الاستمرار في استخدام أدواتك.')}</p>
        <div class="row-btns"><button class="btn btn--accent" data-report>${T('View my report (PDF)', 'اعرض تقريري (PDF)')}</button><a href="#handoff" class="btn btn--ghost">${sum.crisis ? T('Talk to a counsellor', 'تحدّث مع مرشد') : T('Take it to SAS', 'خذها إلى خدمات الطلبة')}</a><button class="btn btn--ghost" data-studio>${T('Open the Reading Studio', 'افتح استوديو القراءة')}</button></div>
      </div>`;
  }
  box && box.addEventListener('click', e => {
    const d = e.target.closest('[data-demo]');
    if (d) { ERLY.emit('trackDemo', d.dataset.demo); setTimeout(() => $('#insight').scrollIntoView({ behavior: 'smooth' }), 120); }
    if (e.target.closest('[data-call]')) ERLY.toast(T('Demo: this would dial the university’s 24/7 counselling line.', 'عرض: سيتصل هذا بخط الإرشاد الجامعي المتاح دائماً.'));
  });
  I18N.onChange(render);
  render();
})();
