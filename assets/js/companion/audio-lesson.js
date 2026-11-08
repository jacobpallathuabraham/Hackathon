/* ERLY — Audio lessons: two original AI hosts talk a topic through.

   Inspired by conversational audio overviews, built ERLY's way:
   - Maya and Sami are two original hosts with two DIFFERENT real voices on
     the device (picked from the voice library; never cloned from anyone).
   - Grounded: from the open reading, the built-in script only uses sentences
     and glossary entries that are actually in it; from a topic with a
     verified visual, it follows that visual's checked steps. With an AI brain
     connected, the AI writes a richer script but is told to stay inside the
     source and say so when something isn't covered.
   - Player: chapters, live transcript (tap a line to jump), captions,
     speed, pause/resume, previous/next line. */
(function () {
  'use strict';
  const C = ERLY.companion; if (!C || !C._ui) return;
  const U = C._ui, { T, pick, esc } = U;
  const HOSTS = { A: { name: 'Maya', g: 'f', col: '#8b5cf6' }, B: { name: 'Sami', g: 'm', col: '#0ea5e9' } };
  const firstSentences = (t, n) => (String(t).replace(/\[([^\]]+)\]/g, '$1').match(/[^.!?]+[.!?]+/g) || [t]).slice(0, n).join(' ').trim();
  const BRIDGE = [['So where does it all start?', 'إذن من أين يبدأ كل شيء؟'], ['Okay — and then what happens?', 'حسناً — وماذا يحدث بعد ذلك؟'], ['Wait, why does that matter?', 'لحظة، لماذا هذا مهم؟'], ['That’s neat. What comes next?', 'رائع. ما التالي؟'], ['And how does it finish?', 'وكيف ينتهي؟']];

  /* ---------- scripts that only use the source ---------- */
  function fromScene(id) {
    const S = ERLY.visuals && ERLY.visuals.scenes[id]; if (!S) return null;
    const L = [], title = pick(S.title[0], S.title[1]);
    L.push({ ch: T('Introduction', 'مقدمة') });
    L.push({ s: 'A', t: T(`Welcome to ERLY audio lessons. Today Sami and I are talking about ${title.toLowerCase()}.`, `أهلاً بكم في دروس إيرلي الصوتية. اليوم نتحدث أنا وسامي عن ${title}.`) });
    L.push({ s: 'B', t: T('I’ve always wanted this explained properly. Let’s take it one step at a time.', 'لطالما أردت أن يُشرح هذا جيداً. لنأخذه خطوة بخطوة.') });
    S.stages.forEach((st, i) => {
      L.push({ ch: pick(st.title[0], st.title[1]), stage: i });
      L.push({ s: 'B', t: pick(...BRIDGE[i % BRIDGE.length]) });
      L.push({ s: 'A', t: pick(st.text[0], st.text[1]), stage: i });
    });
    L.push({ ch: T('Recap', 'ملخص') });
    L.push({ s: 'B', t: T('Let me try to sum it up.', 'دعيني أحاول أن ألخص.') });
    L.push({ s: 'B', t: S.stages.map(st => pick(st.title[0], st.title[1])).join(', then ') + '.' });
    L.push({ s: 'A', t: T('Exactly. If you want to see it, open the interactive visual and play with it yourself.', 'تماماً. إن أردت رؤيته، افتح الشرح المرئي التفاعلي وجرّبه بنفسك.') });
    return { title, source: T('From ERLY’s checked visual lesson', 'من درس إيرلي المرئي المُراجَع'), lines: L, visual: id };
  }
  function fromReading() {
    const R = ERLY.reader; if (!R || !R.isOpen || !R.isOpen() || !R.doc) return null;
    const d = R.doc, L = [];
    L.push({ ch: T('Introduction', 'مقدمة') });
    L.push({ s: 'A', t: T(`Welcome back. Today we’re going through “${d.title}”, using only what the reading itself says.`, `أهلاً بعودتكم. اليوم نمر على «${d.title}» مستخدمين ما يقوله النص فقط.`) });
    L.push({ s: 'B', t: T('Sounds good — walk me through it.', 'رائع — اشرحيه لي.') });
    const gl = Object.entries(d.terms || {}).map(([term, v]) => ({ term, def: Array.isArray(v) ? v[0] : String(v) }));
    d.pages.slice(0, 6).forEach((p, i) => {
      const body = p.paras.map(x => x.text).join(' ');
      L.push({ ch: p.h });
      L.push({ s: 'B', t: T(`What’s the section on ${p.h.toLowerCase()} about?`, `عمّ يتحدث قسم «${p.h}»؟`) });
      L.push({ s: 'A', t: firstSentences(p.paras[0] ? p.paras[0].text : body, 2) });
      if (p.paras[1]) { L.push({ s: 'B', t: pick(...BRIDGE[(i + 1) % BRIDGE.length]) }); L.push({ s: 'A', t: firstSentences(p.paras[1].text, 2) }); }
      const term = gl.find(g => new RegExp('\\b' + g.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(body));
      if (term) { L.push({ s: 'B', t: T(`There’s a key term here — ${term.term}. What does it mean?`, `هناك مصطلح مهم هنا — ${term.term}. ماذا يعني؟`) }); L.push({ s: 'A', t: term.def }); }
    });
    L.push({ ch: T('Recap', 'ملخص') });
    L.push({ s: 'B', t: T(`So the big sections were: ${d.pages.slice(0, 6).map(p => p.h).join(', ')}.`, `إذن الأقسام الرئيسية كانت: ${d.pages.slice(0, 6).map(p => p.h).join('، ')}.`) });
    L.push({ s: 'A', t: T('That’s it. Everything you heard came straight from the reading — open it to read any part in full.', 'هذا كل شيء. كل ما سمعته جاء من القراءة مباشرة — افتحها لقراءة أي جزء كاملاً.') });
    return { title: d.title, source: T('Built only from your open reading', 'مبني فقط من قراءتك المفتوحة'), lines: L };
  }
  async function fromAI(topic, reading) {
    const ai = U.ai; if (!ai || !ai.ready()) return null;
    const src = reading ? reading.pages.slice(0, 6).map(p => '## ' + p.h + '\n' + p.paras.map(x => x.text.replace(/\[([^\]]+)\]/g, '$1')).join('\n')).join('\n\n').slice(0, 6000) : '';
    const prompt = `Write a lively but accurate educational audio dialogue between two hosts, Maya (A, explains) and Sami (B, curious, asks good questions, sometimes recaps). Topic: ${reading ? reading.title : topic}.
${src ? 'Use ONLY facts from this source. If something isn\'t in it, the hosts say the reading doesn\'t cover it.\nSOURCE:\n<<<' + src + '>>>' : 'Stick to well-established facts; say when something is uncertain.'}
Format: one line per turn, "A: text" or "B: text". Start chapters with a line "# Chapter title". 3–5 chapters, 18–30 turns, short spoken sentences, no stage directions, no markdown besides chapter lines. Reply in ${U.lang() === 'ar' ? 'Arabic' : 'English'}.`;
    let out = '';
    try { out = await ai.generate([{ role: 'system', content: 'You write accurate spoken educational dialogues.' }, { role: 'user', content: prompt }], { onToken: () => {} }); } catch (e) { return null; }
    const lines = [];
    String(out).split('\n').forEach(l => { l = l.trim(); if (!l) return; const ch = l.match(/^#+\s*(.+)/); if (ch) return lines.push({ ch: ch[1] }); const m = l.match(/^\**\s*(A|B|Maya|Sami)\s*\**\s*[:：]\s*(.+)/i); if (m) lines.push({ s: /^(A|Maya)$/i.test(m[1]) ? 'A' : 'B', t: m[2].replace(/\*\*/g, '') }); });
    if (lines.filter(l => l.s).length < 6) return null;
    return { title: reading ? reading.title : topic, source: reading ? T('AI-written from your open reading only', 'كتبه الذكاء الاصطناعي من قراءتك المفتوحة فقط') : T('AI-written — check key facts', 'كتبه الذكاء الاصطناعي — تحقق من الحقائق المهمة'), lines };
  }

  /* ---------- voices: two different real voices ---------- */
  function voicesFor() {
    const VL = window.ERLY_VOICELIB, VX = window.ERLY_VOICE;
    const all = window.speechSynthesis && speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
    const lang = U.lang();
    const lib = VL && VX ? VL.resolve(all, { score: VX.naturalScore, gender: VX.gender }).available.filter(x => x.profile.lang === lang) : [];
    const f = lib.find(x => x.profile.g === 'f'), m = lib.find(x => x.profile.g === 'm' && (!f || x.voice.name !== f.voice.name));
    const any = U.voice.voices(lang);
    return {
      A: f ? { voiceName: f.voice.name, baseRate: f.profile.rate, basePitch: f.profile.pitch } : { voiceName: any[0] && any[0].name, basePitch: 1.08 },
      B: m ? { voiceName: m.voice.name, baseRate: m.profile.rate, basePitch: m.profile.pitch } : { voiceName: (any[1] || any[0] || {}).name, basePitch: 0.9 },
      distinct: !!(f && m)
    };
  }

  /* ---------- player ---------- */
  let cur = null;
  function open(script) {
    if (cur) cur.close();
    const PR = window.ERLY_PROSODY, v = U.voice;
    const VO = voicesFor();
    const el = document.createElement('section'); el.className = 'alx'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', T('Audio lesson', 'درس صوتي'));
    const lines = script.lines;
    const chapters = lines.map((l, i) => l.ch ? { i, t: l.ch } : null).filter(Boolean);
    el.innerHTML = `<div class="alx__card">
      <header class="alx__h"><div><span class="alx__k">${T('Audio lesson · two hosts', 'درس صوتي · مقدمان')}</span><b>${esc(script.title)}</b><small>${esc(script.source)}${VO.distinct ? '' : ' · ' + T('only one voice on this device — Sami uses a lower pitch', 'صوت واحد فقط على هذا الجهاز — سامي بطبقة أخفض')}</small></div><button type="button" class="alx__x" data-a="close" aria-label="${T('Close', 'إغلاق')}">✕</button></header>
      <div class="alx__hosts">${['A', 'B'].map(k => `<div class="alx__host" data-host="${k}" style="--c:${HOSTS[k].col}"><i>${HOSTS[k].name[0]}</i><b>${HOSTS[k].name}</b><span class="alx__eq"><em></em><em></em><em></em><em></em></span></div>`).join('')}</div>
      <p class="alx__now" aria-live="polite"></p>
      <nav class="alx__ch">${chapters.map((c, k) => `<button type="button" data-ch="${c.i}">${k + 1}. ${esc(c.t)}</button>`).join('')}</nav>
      <ol class="alx__tr">${lines.map((l, i) => l.ch ? `<li class="alx__chl" data-i="${i}">${esc(l.ch)}</li>` : `<li data-i="${i}" class="is-${l.s}"><b>${HOSTS[l.s].name}</b> ${esc(l.t)}</li>`).join('')}</ol>
      <footer class="alx__ctl"><button type="button" data-a="prev" aria-label="${T('Previous line', 'السطر السابق')}">⟨</button><button type="button" data-a="play" class="alx__play" aria-label="${T('Play', 'تشغيل')}">▶</button><button type="button" data-a="next" aria-label="${T('Next line', 'السطر التالي')}">⟩</button>${[0.75, 1, 1.25, 1.5].map(s => `<button type="button" data-sp="${s}" aria-pressed="${s === 1}">${s}×</button>`).join('')}${script.visual ? `<button type="button" data-a="visual">${T('Show the visual', 'اعرض الشرح المرئي')}</button>` : ''}</footer></div>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('is-in'));
    let i = lines.findIndex(l => l.s), playing = false, speed = 1, gapT = null, dead = false;
    const mark = () => {
      el.querySelectorAll('.alx__tr li').forEach(li => li.classList.toggle('is-now', +li.dataset.i === i));
      const li = el.querySelector(`.alx__tr li[data-i="${i}"]`); if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const l = lines[i]; el.querySelectorAll('.alx__host').forEach(h => h.classList.toggle('is-on', playing && l && h.dataset.host === l.s));
      el.querySelector('.alx__now').textContent = l && l.s ? `${HOSTS[l.s].name}: ${l.t}` : '';
      const chIdx = chapters.filter(c => c.i <= i).length - 1; el.querySelectorAll('.alx__ch button').forEach((b, k) => b.classList.toggle('is-on', k === chIdx));
    };
    function speak() {
      clearTimeout(gapT);
      while (i < lines.length && !lines[i].s) i++;
      if (i >= lines.length) { playing = false; setPlay(); mark(); return; }
      const l = lines[i]; mark();
      const tone = PR ? PR.classify(l.t, {}) : 'neutral';
      const vo = VO[l.s];
      v.speak(l.t, Object.assign({ lang: U.lang(), emotion: tone, prosody: PR ? PR.prosody(tone, 1.1) : null, onend: () => { if (!playing || dead) return; i++; gapT = setTimeout(speak, l.s === (lines[i] && lines[i].s) ? 150 : 320); }, onerror: () => { if (!playing || dead) return; i++; gapT = setTimeout(speak, 200); } }, vo, { baseRate: (vo.baseRate || 1) * speed }));
      if (script.visual && l.stage != null && ERLY.companion.tools && ERLY.companion.tools.visual) { const vz = ERLY.companion.tools.visual.current(); if (vz) vz.show(l.stage); }
    }
    const setPlay = () => { const b = el.querySelector('.alx__play'); b.textContent = playing ? '❚❚' : '▶'; b.setAttribute('aria-label', playing ? T('Pause', 'إيقاف مؤقت') : T('Play', 'تشغيل')); };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-a],[data-ch],[data-sp],.alx__tr li[data-i]'); if (!b) return;
      if (b.dataset.sp) { speed = +b.dataset.sp; el.querySelectorAll('[data-sp]').forEach(x => x.setAttribute('aria-pressed', x === b)); if (playing) { v.stop(); speak(); } return; }
      if (b.dataset.ch != null) { i = +b.dataset.ch; v.stop(); if (playing) speak(); else { while (i < lines.length && !lines[i].s) i++; mark(); } return; }
      if (b.dataset.i != null) { i = +b.dataset.i; v.stop(); if (playing) speak(); else mark(); return; }
      const a = b.dataset.a;
      if (a === 'close') return ctrl.close();
      if (a === 'play') { playing = !playing; setPlay(); if (playing) speak(); else { v.stop(); clearTimeout(gapT); mark(); } }
      if (a === 'next' || a === 'prev') { do { i += a === 'next' ? 1 : -1; } while (i > 0 && i < lines.length && !lines[i].s); i = Math.max(0, Math.min(lines.length - 1, i)); v.stop(); if (playing) speak(); else mark(); }
      if (a === 'visual' && C.tools && C.tools.visual) C.tools.visual.open({ id: script.visual, scene: ERLY.visuals.scenes[script.visual] });
    });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') ctrl.close(); });
    mark();
    const ctrl = { el, script, play: () => { if (!playing) el.querySelector('.alx__play').click(); }, index: () => i, playing: () => playing, close() { if (dead) return; dead = true; playing = false; clearTimeout(gapT); v.stop(); el.classList.remove('is-in'); setTimeout(() => el.remove(), 300); cur = null; } };
    cur = ctrl;
    return ctrl;
  }

  async function start(topic) {
    const R = ERLY.reader, reading = R && R.isOpen && R.isOpen() ? R.doc : null;
    const VZ = ERLY.visuals;
    const NAMES = { photosynthesis: /photosynth|plant/i, heart: /heart|blood|circulat/i, gravity: /gravit|orbit|planet|solar/i, circuit: /circuit|electric|current|ohm/i, cylinder: /cylinder/i, tectonics: /tectonic|plate|earthquake|volcano/i, newton: /newton|motion|force/i, graph: /graph|parabola|quadratic|function/i };
    const named = Object.keys(NAMES).find(k => NAMES[k].test(topic || ''));
    const want = VZ && (VZ.detect(topic || '') || (named ? { id: named } : null));
    let script = null;
    if (U.ai && U.ai.ready()) {
      await U.aiSays('Writing your audio lesson — Maya and Sami will be ready in a moment…', 'أكتب درسك الصوتي — ستكون مايا وسامي جاهزَين بعد لحظة…', { speak: false });
      script = await fromAI(topic, reading);
    }
    if (!script) script = reading && !want ? fromReading() : want ? fromScene(want.id) : fromReading();
    if (!script) { await U.aiSays('I can make an audio lesson from the reading you have open, or about a topic I have a checked visual for (photosynthesis, the heart, gravity, circuits, cylinders, tectonic plates, Newton’s laws, graphs). With Noor Online on, I can do almost any topic.', 'يمكنني إعداد درس صوتي من القراءة المفتوحة، أو عن موضوع لديّ له شرح مرئي مُراجَع. مع نور أونلاين يمكنني تناول أي موضوع تقريباً.'); return null; }
    await U.aiSays(`Here’s your audio lesson: “${script.title}”. ${script.source}. Press play whenever you’re ready.`, `إليك درسك الصوتي: «${script.title}». ${script.source}. اضغط تشغيل عندما تكون جاهزاً.`, { speak: false });
    return open(script);
  }

  ERLY.audioLesson = { start, open, fromScene, fromReading, current: () => cur };
})();
