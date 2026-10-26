/* ERLY — the insight. After day 14, the tracker's summary becomes a gentle,
   pictorial page: the fortnight as weather, illustrations of what each area
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
  const W_LABEL = { sprout: ['learning your normal', 'تعلّم معدلك'], sun: ['clear', 'صافٍ'], part: ['a little friction', 'احتكاك خفيف'], cloud: ['harder day', 'يوم أصعب'], rain: ['heavy day', 'يوم ثقيل'] };

  const ILLO = {
    reading: `<svg viewBox="0 0 320 200" class="illo" aria-hidden="true"><rect x="40" y="18" width="170" height="168" rx="10" fill="var(--surface)" stroke="var(--line-2)"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<g>${[0, 1, 2].map(j => `<rect x="${58 + j * 48 + (i % 2) * 6}" y="${40 + i * 18}" width="${36 + ((i + j) % 3) * 6}" height="7" rx="3.5" fill="var(--line-2)" class="${(i * 3 + j) % 5 === 2 ? 'il-drift' : ''}"/>`).join('')}</g>`).join('')}<g class="il-loupe"><circle cx="236" cy="104" r="44" fill="var(--bg)" stroke="var(--ink)" stroke-width="5"/><line x1="268" y1="136" x2="296" y2="166" stroke="var(--ink)" stroke-width="9" stroke-linecap="round"/><text x="212" y="116" font-size="34" font-family="Fraunces, serif" fill="var(--accent)" class="il-b">b</text><text x="242" y="116" font-size="34" font-family="Fraunces, serif" fill="var(--teal)" class="il-d">d</text></g></svg>`,
    attention: `<svg viewBox="0 0 320 200" class="illo" aria-hidden="true"><line x1="30" y1="170" x2="300" y2="170" stroke="var(--line-2)" stroke-width="2"/><path class="il-curve" d="M30 160 C 90 158, 150 160, 200 154 S 250 70, 268 40 L 282 160" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/><g transform="translate(272 22)"><line x1="0" y1="0" x2="0" y2="150" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 4"/><path d="M0 0h22l-6 7 6 7H0z" fill="var(--accent)"/></g><g class="il-door"><rect x="60" y="74" width="54" height="84" rx="4" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2.5"/><circle cx="104" cy="118" r="3" fill="var(--ink)"/></g><g class="il-push"><circle cx="40" cy="104" r="9" fill="var(--s3)"/><path d="M40 113v26M40 120l18-6M40 139l-8 18M40 139l10 18" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></g></svg>`,
    language: `<svg viewBox="0 0 320 200" class="illo" aria-hidden="true"><g transform="translate(46 30)"><rect width="100" height="130" rx="8" fill="var(--teal)" opacity=".85"/><rect x="10" y="12" width="80" height="106" rx="4" fill="var(--surface)"/><text x="50" y="72" font-size="34" text-anchor="middle" font-family="IBM Plex Sans Arabic" fill="var(--teal)">ع</text></g><g transform="translate(174 30)" class="il-heavy"><rect width="100" height="130" rx="8" fill="var(--accent)" opacity=".85"/><rect x="10" y="12" width="80" height="106" rx="4" fill="var(--surface)"/><text x="50" y="74" font-size="34" text-anchor="middle" font-family="Fraunces" fill="var(--accent)">Aa</text></g></svg>`,
    strain: `<svg viewBox="0 0 320 200" class="illo" aria-hidden="true"><rect x="60" y="64" width="170" height="80" rx="16" fill="none" stroke="var(--ink)" stroke-width="5"/><rect x="232" y="88" width="16" height="32" rx="4" fill="var(--ink)"/><rect x="72" y="76" width="50" height="56" rx="8" fill="var(--accent)" class="il-batt"/><path d="M150 44c8 10 8 18 0 26M176 34c12 16 12 30 0 46" fill="none" stroke="var(--s3)" stroke-width="4" stroke-linecap="round" class="il-zz"/><text x="64" y="176" font-size="12" fill="var(--muted)" font-family="JetBrains Mono">recharge, then restart</text></svg>`
  };
  const FEEL = {
    reading: { h: ['Words that won\'t sit still', 'كلمات لا تهدأ في مكانها'], p: ['Reading took more passes and more time than your own normal, especially on dense English pages. It isn\'t about effort or intelligence.', 'تطلّبت القراءة قراءات أكثر ووقتاً أطول من معدلك، خاصة في الصفحات الإنجليزية الكثيفة. الأمر لا علاقة له بالجهد أو الذكاء.'] },
    attention: { h: ['The heavy door', 'الباب الثقيل'], p: ['Starting felt like pushing a heavy door — then work bunched up near deadlines and some drafts were left behind. That\'s friction, not laziness.', 'بدا البدء كدفع باب ثقيل — ثم تكدّس العمل قرب المواعيد وتُركت بعض المسودات. هذا احتكاك، لا كسل.'] },
    language: { h: ['One language feels heavier', 'لغة تبدو أثقل'], p: ['English pages cost noticeably more than Arabic ones. That can be second-language load — English support may help most.', 'كلّفتك الصفحات الإنجليزية أكثر بوضوح من العربية. قد يكون ذلك عبء لغة ثانية — وقد يفيد دعم الإنجليزية أكثر.'] },
    strain: { h: ['Running low', 'طاقة منخفضة'], p: ['Several unrelated things shifted at once — later nights, shorter sessions, fewer study days. Sometimes that\'s workload; sometimes it\'s life.', 'تغيّرت أشياء غير مترابطة دفعة واحدة — ليالٍ أطول، وجلسات أقصر، وأيام دراسة أقل. أحياناً يكون العبء، وأحياناً الحياة.'] }
  };
  const HELPS = {
    reading: [['volume', 'Read-aloud with your favourite voice', 'القراءة الصوتية بصوتك المفضل'], ['text', 'Bigger, airier text', 'نص أكبر وأوسع'], ['ruler', 'Line focus', 'تركيز السطر'], ['hourglass', 'Extra time — ask SAS', 'وقت إضافي — اسأل الخدمات']],
    attention: [['rocket', '5-minute first steps', 'خطوات أولى من ٥ دقائق'], ['timer', 'Focus sprints', 'جولات تركيز'], ['clock', 'Deadline nudges at 72h and 24h', 'تذكيرات قبل ٧٢ و٢٤ ساعة'], ['users', 'Study with a buddy', 'ادرس مع رفيق']],
    language: [['globe', 'Glossary with Arabic meanings', 'مسرد بالمعاني العربية'], ['file', 'Plain-words summaries', 'ملخصات بكلمات بسيطة'], ['pen', 'English writing centre', 'مركز الكتابة الإنجليزية'], ['chat', 'Ask Noor about any word', 'اسأل نور عن أي كلمة']],
    strain: [['chat', 'Talk to a counsellor', 'تحدّث مع مرشد'], ['cup', 'Planned rest days', 'أيام راحة مخططة'], ['calendar', 'Course-load conversation', 'نقاش العبء الدراسي'], ['users', 'Bring someone you trust', 'أحضر شخصاً تثق به']]
  };
  const weatherOf = (flags, cal) => cal ? 'sprout' : flags === 0 ? 'sun' : flags <= 3 ? 'part' : flags <= 7 ? 'cloud' : 'rain';

  function render() {
    if (!box) return;
    const ended = tr && tr.status === 'ended' && tr.summary;
    if (!ended) {
      box.innerHTML = `<div class="ins-empty">
        <div class="ins-empty__ic">${ICON('sparkle')}</div>
        <h3>${tr && tr.status === 'active' ? T(`Your picture appears on day 14 — you're on day ${tr.day}.`, `تظهر صورتك في اليوم ١٤ — أنت في اليوم ${tr.day}.`) : T('Your picture appears after 14 days of tracking.', 'تظهر صورتك بعد ١٤ يوماً من التتبّع.')}</h3>
        <p>${T('It brings together every indicator ERLY noticed — drawn gently, never as a label.', 'تجمع كل مؤشر لاحظه إيرلي — مرسومة بلطف، ولا تصنيف أبداً.')}</p>
        <div class="row-btns" style="justify-content:center"><button class="btn btn--accent" data-demo="reading">${T('Preview a sample insight', 'عاين رؤية نموذجية')}</button><a href="#tracking" class="btn btn--ghost">${T('About tracking', 'عن التتبّع')}</a></div></div>`;
      $('[data-demo]', box).onclick = () => { ERLY.emit('trackDemo', 'reading'); setTimeout(() => $('#insight').scrollIntoView({ behavior: 'smooth' }), 120); };
      return;
    }
    const sum = tr.summary;
    const areas = sum.flaggedAreas.length ? sum.flaggedAreas : [];
    const top = sum.per.filter(p => p.frac >= .5).sort((a, b) => b.frac - a.frac).slice(0, 6);
    const calm = Object.entries(sum.cats).filter(([, v]) => v < .2).map(([k]) => k).slice(0, 3);
    const helps = areas[0] || 'reading';
    box.innerHTML = `
      <div class="ins-hero">
        <div>
          <p class="contract__k mono">${T('Your picture · 14 days · only you can see this', 'صورتك · ١٤ يوماً · أنت فقط من يراها')}</p>
          <h3>${areas.length ? T('Here\'s what we noticed — and what it might feel like.', 'إليك ما لاحظناه — وكيف قد يبدو الشعور.') : T('A steady fortnight. Nothing stood out against your normal.', 'أسبوعان مستقران. لم يبرز شيء مقارنةً بمعدلك.')}</h3>
          <p>${T('This isn\'t a diagnosis. It\'s a picture you can take to someone who can help — or keep to yourself.', 'هذا ليس تشخيصاً. إنها صورة يمكنك أخذها لمن يستطيع المساعدة — أو الاحتفاظ بها لنفسك.')}</p>
        </div>
        <div class="ins-hero__stat"><b>${sum.per.filter(p => p.frac >= .5).length}</b><span>${T('of', 'من')} ${sum.per.length} ${T('indicators stayed above your normal', 'مؤشراً بقيت فوق معدلك')}</span></div>
      </div>
      <div class="ins-card ins-weather">
        <div class="ins-card__head"><h4>${T('Your fortnight, as weather', 'أسبوعاك، كطقس')}</h4><span class="small muted">${T('More cloud = more indicators above your own normal that day', 'غيوم أكثر = مؤشرات أكثر فوق معدلك ذلك اليوم')}</span></div>
        <ol class="wx">${sum.daily.map((d, i) => { const w = weatherOf(d.flags, d.n <= tr.CAL); return `<li class="wx__d" style="--i:${i}" title="${T(...W_LABEL[w])}"><span class="mono">${d.n}</span>${W_ICON[w]}</li>`; }).join('')}</ol>
        <div class="wx__legend">${Object.keys(W_LABEL).map(k => `<span>${W_ICON[k]}${T(...W_LABEL[k])}</span>`).join('')}</div>
      </div>
      ${areas.length ? `<div class="ins-feel">${areas.map(a => `<article class="ins-card ins-feel__c ${areas.length === 1 ? 'is-wide' : ''}"><div class="ins-illo">${ILLO[a]}</div><h4>${T(...FEEL[a].h)}</h4><p>${T(...FEEL[a].p)}</p></article>`).join('')}</div>` : ''}
      <div class="ins-grid">
        <div class="ins-card">
          <h4>${T('Where it showed up', 'أين ظهر')}</h4>
          ${top.length ? `<div class="ins-where">${top.map(p => `<div class="ins-where__r" style="--c:${tr.CATS[p.cat].color}"><span>${T(p.en, p.ar)}</span><span class="ins-where__b">${Array.from({ length: sum.judged }, (_, k) => `<i class="${k < p.up ? 'is-on' : ''}"></i>`).join('')}</span><b class="mono">${p.up}/${sum.judged}</b></div>`).join('')}</div>` : `<p class="muted">${T('No indicator stayed above your normal on most days.', 'لم يبقَ أي مؤشر فوق معدلك في معظم الأيام.')}</p>`}
          <p class="small muted">${T('LMS-side indicators are synthetic in this demo; Reading Studio indicators are your own.', 'مؤشرات نظام التعلّم اصطناعية في هذا العرض؛ أما مؤشرات استوديو القراءة فهي لك.')}</p>
        </div>
        <div class="ins-card ins-strong">
          <h4>${T('What stayed steady', 'ما بقي ثابتاً')}</h4>
          <ul>${(calm.length ? calm : ['S']).map(c => `<li><span>${ICON(tr.CATS[c].icon)}</span>${T(tr.CATS[c].en, tr.CATS[c].ar)} — ${T('close to your normal all fortnight.', 'قريب من معدلك طوال الأسبوعين.')}</li>`).join('')}
          <li><span>${ICON('compass')}</span>${T('You noticed something and looked into it. That takes courage.', 'لاحظت شيئاً وبحثت فيه. هذا يتطلب شجاعة.')}</li></ul>
        </div>
        <div class="ins-card">
          <h4>${T('What tends to help', 'ما يساعد عادةً')}</h4>
          <div class="ins-helps">${HELPS[helps].map(h => `<div><span>${ICON(h[0])}</span>${T(h[1], h[2])}</div>`).join('')}</div>
        </div>
      </div>
      <div class="ins-next">
        <p>${sum.strong ? T('Your two weeks point clearly in one direction. That\'s enough to talk to SAS — they can tell you <b>why</b>, and what support you\'re entitled to.', 'أسبوعاك يشيران بوضوح إلى اتجاه واحد. هذا كافٍ للحديث مع خدمات الطلبة — يمكنهم إخبارك <b>لماذا</b>، وما الدعم الذي يحق لك.') : T('You can take this picture to SAS whenever you like — or keep using the Reading Studio.', 'يمكنك أخذ هذه الصورة إلى خدمات الطلبة متى شئت — أو الاستمرار في استخدام استوديو القراءة.')}</p>
        <div class="row-btns"><a href="#handoff" class="btn btn--accent">${T('Take it to SAS', 'خذها إلى خدمات الطلبة')}</a><button class="btn btn--ghost" data-studio>${T('Open the Reading Studio', 'افتح استوديو القراءة')}</button></div>
      </div>`;
  }
  I18N.onChange(render);
  render();
})();
