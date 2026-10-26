/* ERLY — the insight. A gentle, pictorial picture of what the games and the
   two weeks showed: "friction weather" for each day, illustrations of what it
   may feel like, where it shows up, strengths, and what helps. Not a diagnosis. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const T = (en, ar) => I18N.t(en, ar);
  const AR = () => I18N.lang === 'ar';
  const F = window.FUN;
  const box = $('#insightBox');

  let result = ERLY.state.result || null;
  let watch = ERLY.getWatch ? ERLY.getWatch() : null;
  ERLY.on('result', r => { result = r; render(); });
  ERLY.on('watch', w => { watch = w; render(); });

  /* ---------- weather icons ---------- */
  const W_ICON = {
    sun: '<svg viewBox="0 0 48 48"><g class="wx-sun"><circle cx="24" cy="24" r="9" fill="#F5C443"/><g stroke="#F5C443" stroke-width="3" stroke-linecap="round">' + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${24 + Math.cos(a) * 14}" y1="${24 + Math.sin(a) * 14}" x2="${24 + Math.cos(a) * 19}" y2="${24 + Math.sin(a) * 19}"/>`; }).join('') + '</g></g></svg>',
    part: '<svg viewBox="0 0 48 48"><circle cx="18" cy="18" r="8" fill="#F5C443"/><path class="wx-cloud" d="M14 36h22a7 7 0 0 0 0-14 10 10 0 0 0-19 2 6 6 0 0 0-3 12z" fill="#E4E2EE" stroke="#B9B5CC" stroke-width="1.5"/></svg>',
    cloud: '<svg viewBox="0 0 48 48"><path class="wx-cloud" d="M11 34h26a8 8 0 0 0 0-16 11 11 0 0 0-21 2 7 7 0 0 0-5 14z" fill="#CFCBE0" stroke="#A29DBA" stroke-width="1.5"/></svg>',
    rain: '<svg viewBox="0 0 48 48"><path d="M11 28h26a8 8 0 0 0 0-16 11 11 0 0 0-21 2 7 7 0 0 0-5 14z" fill="#B9B4D0" stroke="#8F89AD" stroke-width="1.5"/><g class="wx-rain" stroke="#6E9BD6" stroke-width="2.4" stroke-linecap="round"><line x1="17" y1="33" x2="15" y2="39"/><line x1="25" y1="33" x2="23" y2="39"/><line x1="33" y1="33" x2="31" y2="39"/></g></svg>',
    sprout: '<svg viewBox="0 0 48 48"><path d="M24 40V22" stroke="#4DB3A8" stroke-width="3" stroke-linecap="round"/><path d="M24 26c-8 0-12-5-12-11 7 0 12 4 12 11zM24 22c0-7 5-11 12-11 0 6-4 11-12 11z" fill="#4DB3A8"/><path d="M14 40h20" stroke="#A3875E" stroke-width="3" stroke-linecap="round"/></svg>'
  };
  const W_LABEL = { sun: ['clear', 'صافٍ'], part: ['a little friction', 'احتكاك خفيف'], cloud: ['harder day', 'يوم أصعب'], rain: ['heavy day', 'يوم ثقيل'], sprout: ['learning your normal', 'تعلّم معدلك'] };

  /* ---------- gentle illustrations ---------- */
  const ILLO = {
    reading: `<svg viewBox="0 0 320 200" class="illo illo--read" aria-hidden="true">
      <rect x="40" y="18" width="170" height="168" rx="10" fill="var(--surface)" stroke="var(--line-2)"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<g class="il-line" style="--d:${i * 0.25}s">${[0, 1, 2].map(j => `<rect x="${58 + j * 48 + (i % 2) * 6}" y="${40 + i * 18}" width="${36 + ((i + j) % 3) * 6}" height="7" rx="3.5" fill="var(--line-2)" class="${(i * 3 + j) % 5 === 2 ? 'il-drift' : ''}"/>`).join('')}</g>`).join('')}
      <g class="il-loupe"><circle cx="236" cy="104" r="44" fill="var(--bg)" stroke="var(--ink)" stroke-width="5"/><line x1="268" y1="136" x2="296" y2="166" stroke="var(--ink)" stroke-width="9" stroke-linecap="round"/>
        <text x="212" y="116" font-size="34" font-family="Fraunces, serif" fill="var(--accent)" class="il-b">b</text><text x="242" y="116" font-size="34" font-family="Fraunces, serif" fill="var(--teal)" class="il-d">d</text></g>
    </svg>`,
    attention: `<svg viewBox="0 0 320 200" class="illo illo--att" aria-hidden="true">
      <line x1="30" y1="170" x2="300" y2="170" stroke="var(--line-2)" stroke-width="2"/>
      <path class="il-curve" d="M30 160 C 90 158, 150 160, 200 154 S 250 70, 268 40 L 282 160" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>
      <g transform="translate(272 22)"><line x1="0" y1="0" x2="0" y2="150" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 4"/><path d="M0 0h22l-6 7 6 7H0z" fill="var(--accent)"/></g>
      <g class="il-door"><rect x="60" y="74" width="54" height="84" rx="4" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2.5"/><circle cx="104" cy="118" r="3" fill="var(--ink)"/></g>
      <g class="il-push"><circle cx="40" cy="104" r="9" fill="var(--s3)"/><path d="M40 113v26M40 120l18-6M40 139l-8 18M40 139l10 18" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></g>
      <text x="200" y="190" font-size="11" fill="var(--muted)" font-family="JetBrains Mono, monospace">deadline</text>
    </svg>`,
    number: `<svg viewBox="0 0 320 200" class="illo illo--num" aria-hidden="true">
      <line x1="30" y1="150" x2="290" y2="150" stroke="var(--ink)" stroke-width="3"/>
      ${[0, 25, 50, 75, 100].map((t, i) => `<line x1="${30 + i * 65}" y1="142" x2="${30 + i * 65}" y2="158" stroke="var(--ink)" stroke-width="2"/>`).join('')}
      ${[['7', 70, 60, 0], ['31', 140, 40, 0.6], ['4', 200, 80, 1.2], ['58', 250, 50, 1.8], ['12', 110, 100, 2.4]].map(([n, x, y, d]) => `<text x="${x}" y="${y}" font-size="30" font-weight="600" font-family="Instrument Sans, sans-serif" fill="var(--s4)" class="il-float" style="--d:${d}s">${n}</text>`).join('')}
    </svg>`,
    bilingual: `<svg viewBox="0 0 320 200" class="illo" aria-hidden="true">
      <g transform="translate(46 30)"><rect width="100" height="130" rx="8" fill="var(--teal)" opacity=".85"/><rect x="10" y="12" width="80" height="106" rx="4" fill="var(--surface)"/><text x="50" y="72" font-size="34" text-anchor="middle" font-family="IBM Plex Sans Arabic" fill="var(--teal)">ع</text></g>
      <g transform="translate(174 30)" class="il-heavy"><rect width="100" height="130" rx="8" fill="var(--accent)" opacity=".85"/><rect x="10" y="12" width="80" height="106" rx="4" fill="var(--surface)"/><text x="50" y="74" font-size="34" text-anchor="middle" font-family="Fraunces" fill="var(--accent)">Aa</text></g>
      <path d="M96 176h0" /><text x="96" y="186" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="JetBrains Mono">light</text><text x="224" y="186" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="JetBrains Mono">heavier</text>
    </svg>`
  };
  const FEEL = {
    reading: { h: ['Words that won\'t sit still', 'كلمات لا تهدأ في مكانها'], p: ['Reading can take more energy than it should — lines need a second or third pass, and similar letters can trade places when you\'re tired. It isn\'t about effort or intelligence.', 'قد تتطلب القراءة طاقة أكثر مما ينبغي — تحتاج الأسطر قراءة ثانية أو ثالثة، وقد تتبادل الحروف المتشابهة أماكنها حين تتعب. الأمر لا علاقة له بالجهد أو الذكاء.'] },
    attention: { h: ['The heavy door', 'الباب الثقيل'], p: ['Starting can feel like pushing a heavy door — then everything happens at once near the deadline. That\'s friction, not laziness.', 'قد يبدو البدء كدفع باب ثقيل — ثم يحدث كل شيء دفعة واحدة قرب الموعد. هذا احتكاك، لا كسل.'] },
    number: { h: ['Numbers that drift', 'أرقام تنجرف'], p: ['Placing and comparing quantities can take extra steps, like the number line is a little blurry. Visual tools and worked examples help a lot.', 'قد يتطلب وضع الكميات ومقارنتها خطوات إضافية، كأن خط الأعداد ضبابي قليلاً. الأدوات البصرية والأمثلة المحلولة تساعد كثيراً.'] },
    bilingual: { h: ['One language feels heavier', 'لغة تبدو أثقل'], p: ['English pages cost you noticeably more than Arabic ones. That can be second-language load — English support may help most.', 'تكلّفك الصفحات الإنجليزية أكثر بوضوح من العربية. قد يكون ذلك عبء لغة ثانية — وقد يفيد دعم اللغة الإنجليزية أكثر.'] }
  };
  const STRENGTH = {
    'Sound skills': ['You hear the shape of words really well — audio tools will feel natural.', 'تسمع شكل الكلمات جيداً جداً — ستبدو لك الأدوات الصوتية طبيعية.', '👂'],
    'Focus': ['Once you start, your focus is steady.', 'حين تبدأ، يكون تركيزك ثابتاً.', '🎯'],
    'Working memory': ['You can hold a lot in your head at once.', 'تستطيع الاحتفاظ بالكثير في ذهنك دفعة واحدة.', '🧠'],
    'Number sense': ['Numbers make sense to you.', 'الأرقام منطقية بالنسبة لك.', '🔢'],
    'Naming speed': ['You recognise things quickly.', 'تتعرّف على الأشياء بسرعة.', '⚡'],
    'Reading speed · Arabic': ['Arabic reading flows for you.', 'القراءة بالعربية سلسة لديك.', '📖']
  };
  const HELPS = {
    reading: [['🔊', 'Read-aloud on every PDF', 'القراءة الصوتية لكل PDF'], ['🔠', 'Bigger, airier text', 'نص أكبر وأوسع'], ['📏', 'Line focus', 'تركيز السطر'], ['⏳', 'Extra time — ask SAS', 'وقت إضافي — اسأل الخدمات']],
    attention: [['🚀', '5-minute first steps', 'خطوات أولى من ٥ دقائق'], ['⏱️', 'Focus sprints', 'جولات تركيز'], ['🔔', 'Deadline nudges', 'تذكيرات المواعيد'], ['👥', 'Study with a buddy', 'ادرس مع رفيق']],
    number: [['📐', 'Worked examples first', 'أمثلة محلولة أولاً'], ['📊', 'Diagrams & number lines', 'رسوم وخطوط أعداد'], ['🧮', 'Calculator-friendly practice', 'تمارين مع الآلة الحاسبة'], ['🏫', 'Maths support centre', 'مركز دعم الرياضيات']]
  };

  function weatherOf(d, calibrating) {
    if (calibrating) return 'sprout';
    const n = ['s1', 's2', 's3', 's4'].filter(k => d && d[k]).length;
    return n === 0 ? 'sun' : n === 1 ? 'part' : n === 2 ? 'cloud' : 'rain';
  }

  function render() {
    const closer = result && result.outcome === 'closer';
    const ended = watch && watch.status === 'ended';
    if (!closer) {
      box.innerHTML = `<div class="ins-empty">
        ${F.mascot('happy', 'm-idle m-big')}
        <h3>${result ? T('Your result was “doing fine” — so there\'s nothing to picture here.', 'كانت نتيجتك «أنت بخير» — لذلك لا شيء لتصويره هنا.') : T('Your picture appears after a “closer look” result.', 'تظهر صورتك بعد نتيجة «تستحق نظرة أقرب».')}</h3>
        <p>${T('It brings together your games and, if you chose it, your two weeks — drawn gently, never as a label.', 'تجمع ألعابك و — إن اخترت — أسبوعيك، مرسومة بلطف، ولا تصنيف أبداً.')}</p>
        <button class="btn btn--accent" id="insDemo">${T('Preview a sample insight', 'عاين رؤية نموذجية')}</button></div>`;
      $('#insDemo').onclick = () => { ERLY.emit('sample', 'closer'); setTimeout(() => ERLY.emit('watchFF'), 50); setTimeout(() => $('#insight').scrollIntoView({ behavior: 'smooth' }), 150); };
      return;
    }
    const areas = result.areas.slice();
    if (result.lang === 'en' && !areas.includes('bilingual')) areas.push('bilingual');
    const sum = ended ? watch.summary : null;
    const strengths = result.domains.filter(d => d[2] >= 60 && STRENGTH[d[0]]).slice(0, 3);
    const days = ended ? watch.data : [];
    const helps = (areas.filter(a => HELPS[a])[0]) || 'reading';

    box.innerHTML = `
      <div class="ins-hero">
        <div class="ins-hero__copy">
          <p class="contract__k mono">${ended ? T('Your picture · games + 2 weeks', 'صورتك · الألعاب + أسبوعان') : T('Early picture · games only', 'صورة أولية · الألعاب فقط')}</p>
          <h3>${T('Here\'s what we noticed — and what it might feel like.', 'إليك ما لاحظناه — وكيف قد يبدو الشعور.')}</h3>
          <p>${T('This isn\'t a diagnosis. It\'s a picture you can take to someone who can help — or keep to yourself.', 'هذا ليس تشخيصاً. إنها صورة يمكنك أخذها لمن يستطيع المساعدة — أو الاحتفاظ بها لنفسك.')}</p>
        </div>
        ${F.mascot('happy', 'm-idle m-big')}
      </div>

      ${ended ? `<div class="ins-card ins-weather">
        <div class="ins-card__head"><h4>${T('Your two weeks, as weather', 'أسبوعاك، كطقس')}</h4><span class="small muted">${T('More clouds = more friction than your own normal that day', 'غيوم أكثر = احتكاك أكثر من معدلك ذلك اليوم')}</span></div>
        <ol class="wx">${days.map((d, i) => { const w = weatherOf(d, i < watch.CALIBRATE); return `<li class="wx__d" style="--i:${i}" title="${T(...W_LABEL[w])}"><span class="mono">${i + 1}</span>${W_ICON[w]}</li>`; }).join('')}</ol>
        <div class="wx__legend">${['sprout', 'sun', 'part', 'cloud', 'rain'].map(k => `<span>${W_ICON[k]}${T(...W_LABEL[k])}</span>`).join('')}</div>
      </div>` : `<div class="ins-card ins-pending"><span>⏳</span><p>${T('The full picture — with your two weeks drawn as weather — appears on day 14 of the watch, if you choose to do it.', 'تظهر الصورة الكاملة — مع أسبوعيك مرسومين كطقس — في اليوم ١٤ من المتابعة، إن اخترتها.')}</p><a href="#watch" class="btn btn--sm btn--ghost">${T('About the watch', 'عن المتابعة')}</a></div>`}

      <div class="ins-feel">
        ${areas.map(a => FEEL[a] ? `<article class="ins-card ins-feel__c ${areas.filter(x => FEEL[x]).length === 1 ? 'is-wide' : ''}">
          <div class="ins-illo">${ILLO[a]}</div>
          <h4>${T(...FEEL[a].h)}</h4>
          <p>${T(...FEEL[a].p)}</p>
          ${a === 'reading' ? `<button class="btn btn--sm btn--ghost ins-try" data-feel>${T('Feel it for a moment', 'جرّب الإحساس للحظة')}</button><p class="ins-sample" id="feelSample" hidden>${'The control volume keeps mass and energy in balance as the fluid moves through it.'.split('').map((c, i) => c === ' ' ? ' ' : `<span style="--r:${(i * 37) % 7 - 3}deg;--y:${(i * 13) % 5 - 2}px;--d:${(i % 9) * 0.13}s">${c}</span>`).join('')}<small>${T('One impression — not everyone experiences it this way.', 'انطباع واحد — ليس الجميع يمرّ به بهذه الطريقة.')}</small></p>` : ''}
        </article>` : '').join('')}
      </div>

      <div class="ins-grid">
        ${sum ? `<div class="ins-card">
          <h4>${T('Where it showed up', 'أين ظهر')}</h4>
          <div class="ins-where">${sum.rows.map(r => { const sig = watch.SIGS.find(s => s.id === r.id); return `<div class="ins-where__r" style="--c:var(--${r.id})"><span>${T(sig.en, sig.ar)}</span><span class="ins-where__b">${Array.from({ length: 11 }, (_, k) => `<i class="${k < r.up ? 'is-on' : ''}"></i>`).join('')}</span><b class="mono">${r.up}/11</b></div>`; }).join('')}</div>
          <div class="ins-chips"><span>🌙 ${T('late at night', 'في وقت متأخر ليلاً')}</span><span>📄 ${T('dense PDFs', 'ملفات PDF كثيفة')}</span><span>🇬🇧 ${T('English pages', 'صفحات إنجليزية')}</span><span>⏰ ${T('close to deadlines', 'قرب المواعيد')}</span></div>
          <p class="small muted">${T('Pattern shown in the demo is synthetic.', 'النمط المعروض في العرض اصطناعي.')}</p>
        </div>` : ''}
        <div class="ins-card ins-strong">
          <h4>${T('What you\'re good at', 'ما تجيده')}</h4>
          <ul>${(strengths.length ? strengths.map(d => `<li><span>${STRENGTH[d[0]][2]}</span>${T(STRENGTH[d[0]][0], STRENGTH[d[0]][1])}</li>`) : [`<li><span>🔥</span>${T('You showed up five days in a row. That counts.', 'حضرت خمسة أيام متتالية. وهذا مهم.')}</li>`]).join('')}
            <li><span>🧭</span>${T('You noticed something and looked into it. That takes courage.', 'لاحظت شيئاً وبحثت فيه. هذا يتطلب شجاعة.')}</li></ul>
        </div>
        <div class="ins-card">
          <h4>${T('What tends to help', 'ما يساعد عادةً')}</h4>
          <div class="ins-helps">${HELPS[helps].map(h => `<div><span>${h[0]}</span>${T(h[1], h[2])}</div>`).join('')}</div>
        </div>
      </div>

      <div class="ins-next">
        <p>${sum && sum.strong ? T('Your games and your two weeks point the same way. That\'s enough to talk to SAS — they can tell you <b>why</b>, and what support you\'re entitled to.', 'ألعابك وأسبوعاك يشيران إلى الاتجاه نفسه. هذا كافٍ للحديث مع خدمات الطلبة — يمكنهم إخبارك <b>لماذا</b>، وما الدعم الذي يحق لك.') : T('You can take this picture to SAS whenever you like — or keep using the tools.', 'يمكنك أخذ هذه الصورة إلى خدمات الطلبة متى شئت — أو الاستمرار في استخدام الأدوات.')}</p>
        <div class="row-btns"><a href="#handoff" class="btn btn--accent">${T('Take it to SAS', 'خذها إلى خدمات الطلبة')}</a><a href="#try" class="btn btn--ghost">${T('Open my tools', 'افتح أدواتي')}</a></div>
      </div>`;
    const ft = $('[data-feel]', box);
    if (ft) ft.onclick = () => { const s = $('#feelSample'); s.hidden = !s.hidden; ft.textContent = s.hidden ? T('Feel it for a moment', 'جرّب الإحساس للحظة') : T('Make it stop', 'أوقفه'); };
  }

  I18N.onChange(render);
  render();
})();
