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
  async function fromAI(topic, reading, art) {
    const ai = U.ai; if (!ai || !ai.ready()) return null;
    const src = art ? art.sections.slice(0, 8).map(x => (x.h ? '## ' + x.h + '\n' : '') + x.text.slice(0, 900)).join('\n\n').slice(0, 6000) : reading ? reading.pages.slice(0, 6).map(p => '## ' + p.h + '\n' + p.paras.map(x => x.text.replace(/\[([^\]]+)\]/g, '$1')).join('\n')).join('\n\n').slice(0, 6000) : '';
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
      <footer class="alx__ctl"><button type="button" data-a="prev" aria-label="${T('Previous line', 'السطر السابق')}">⟨</button><button type="button" data-a="play" class="alx__play" aria-label="${T('Play', 'تشغيل')}">▶</button><button type="button" data-a="next" aria-label="${T('Next line', 'السطر التالي')}">⟩</button>${[0.75, 1, 1.25, 1.5].map(s => `<button type="button" data-sp="${s}" aria-pressed="${s === 1}">${s}×</button>`).join('')}${script.visual ? `<button type="button" data-a="visual">${T('Show the visual', 'اعرض الشرح المرئي')}</button>` : ''}</footer>
      <div class="alx__seek"><input type="range" min="0" max="${lines.length - 1}" value="0" step="1" data-a="seek" aria-label="${T('Position in the lesson', 'الموضع في الدرس')}"><span class="alx__pos"></span></div>
      <div class="alx__more">${script.sourceUrl ? `<a href="${esc(script.sourceUrl)}" target="_blank" rel="noopener">${T('Source', 'المصدر')} ↗</a>` : ''}<button type="button" data-a="v:revision">${T('Revision version', 'نسخة مراجعة')}</button><button type="button" data-a="v:detailed">${T('More detail', 'تفاصيل أكثر')}</button><button type="button" data-a="v:continue">${T('Continue', 'تابع')}</button><button type="button" data-a="ask">${T('Ask Noor about this lesson', 'اسأل نور عن الدرس')}</button></div></div>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('is-in'));
    let i = lines.findIndex(l => l.s), playing = false, speed = 1, gapT = null, dead = false;
    const mark = () => {
      el.querySelectorAll('.alx__tr li').forEach(li => li.classList.toggle('is-now', +li.dataset.i === i));
      const li = el.querySelector(`.alx__tr li[data-i="${i}"]`); if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const l = lines[i]; el.querySelectorAll('.alx__host').forEach(h => h.classList.toggle('is-on', playing && l && h.dataset.host === l.s));
      el.querySelector('.alx__now').textContent = l && l.s ? `${HOSTS[l.s].name}: ${l.t}` : '';
      const sk = el.querySelector('[data-a="seek"]'); if (sk) { sk.value = i; const spoken = lines.slice(0, i).filter(x => x.t).reduce((n2, x) => n2 + x.t.split(/\s+/).length, 0), total = lines.filter(x => x.t).reduce((n2, x) => n2 + x.t.split(/\s+/).length, 0); const mmss = w => { const sec = Math.round(w / (2.4 * speed)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }; el.querySelector('.alx__pos').textContent = `${mmss(spoken)} / ${mmss(total)}`; }
      const chIdx = chapters.filter(c => c.i <= i).length - 1; el.querySelectorAll('.alx__ch button').forEach((b, k) => b.classList.toggle('is-on', k === chIdx));
    };
    function speak() {
      clearTimeout(gapT);
      while (i < lines.length && !lines[i].s) i++;
      if (i >= lines.length) { playing = false; setPlay(); mark(); return; }
      const l = lines[i]; mark();
      const tone = PR ? PR.classify(l.t, {}) : 'neutral';
      const vo = VO[l.s]; const NV = window.ERLY && ERLY.neuralVoice, neural = NV && NV.ready() && (U.store.prefs() || {}).voiceEngine === 'neural';
      v.speak(l.t, Object.assign({ lang: U.lang(), emotion: tone, neuralVoice: neural ? (l.s === 'A' ? 'af_heart' : 'am_michael') : undefined, rate: speed, prosody: PR ? PR.prosody(tone, 1.1) : null, onend: () => { if (!playing || dead) return; i++; gapT = setTimeout(speak, l.s === (lines[i] && lines[i].s) ? 150 : 320); }, onerror: () => { if (!playing || dead) return; i++; gapT = setTimeout(speak, 200); } }, vo, { baseRate: (vo.baseRate || 1) * speed }));
      if (script.visual && l.stage != null && ERLY.companion.tools && ERLY.companion.tools.visual) { const vz = ERLY.companion.tools.visual.current(); if (vz) vz.show(l.stage); }
    }
    const setPlay = () => { const b = el.querySelector('.alx__play'); b.textContent = playing ? '❚❚' : '▶'; b.setAttribute('aria-label', playing ? T('Pause', 'إيقاف مؤقت') : T('Play', 'تشغيل')); };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-a],[data-ch],[data-sp],.alx__tr li[data-i]'); if (!b) return;
      if (b.dataset.sp) { speed = +b.dataset.sp; el.querySelectorAll('[data-sp]').forEach(x => x.setAttribute('aria-pressed', x === b)); if (playing) { v.stop(); speak(); } return; }
      if (b.dataset.ch != null) { i = +b.dataset.ch; v.stop(); if (playing) speak(); else { while (i < lines.length && !lines[i].s) i++; mark(); } return; }
      if (b.dataset.i != null) { i = +b.dataset.i; v.stop(); if (playing) speak(); else mark(); return; }
      const a = b.dataset.a;
      if (a === 'seek') return;
      if (a && a.startsWith('v:')) { const btn = e.target.closest('[data-a]'); btn.disabled = true; btn.setAttribute('aria-busy', 'true'); return variant(script, a.slice(2)).catch(() => null).then(r => { if (!r && !dead) { btn.disabled = false; btn.removeAttribute('aria-busy'); } }); } /* the lesson stays until the new version is ready; open() then replaces it */
      if (a === 'ask') { const box = document.getElementById('cmpText'); const at = lines[i] && lines[i].t; if (box) { box.value = T(`About the audio lesson on ${script.title}: `, `عن الدرس الصوتي ${script.title}: `) + (at ? `“${at.slice(0, 140)}” — ` : ''); box.focus(); } ERLY.companion.attach && ERLY.companion.attach({ title: script.title, page: T('audio lesson', 'درس صوتي'), heading: script.title, text: lines.filter(l => l.t).map(l => l.t).join(' ').slice(0, 3400), quote: at || '' }); ERLY.companion.open && ERLY.companion.open('chat'); return; }
      if (a === 'close') return ctrl.close();
      if (a === 'play') { playing = !playing; setPlay(); if (playing) speak(); else { v.stop(); clearTimeout(gapT); mark(); } }
      if (a === 'next' || a === 'prev') { do { i += a === 'next' ? 1 : -1; } while (i > 0 && i < lines.length && !lines[i].s); i = Math.max(0, Math.min(lines.length - 1, i)); v.stop(); if (playing) speak(); else mark(); }
      if (a === 'visual' && C.tools && C.tools.visual) C.tools.visual.open({ id: script.visual, scene: ERLY.visuals.scenes[script.visual] });
    });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') ctrl.close(); });
    el.querySelector('[data-a="seek"]').addEventListener('input', e => { i = +e.target.value; v.stop(); if (playing) speak(); else { while (i < lines.length && !lines[i].s) i++; mark(); } });
    mark();
    const ctrl = { el, script, play: () => { if (!playing) el.querySelector('.alx__play').click(); }, index: () => i, playing: () => playing, close() { if (dead) return; dead = true; playing = false; clearTimeout(gapT); v.stop(); el.classList.remove('is-in'); setTimeout(() => el.remove(), 300); cur = null; } };
    cur = ctrl;
    return ctrl;
  }

  /* ---------- v18: a lesson for ANY topic ----------
     Sources, in order: (1) an AI model when one is in use — told to stay with the retrieved source text;
     (2) the encyclopedia article for the topic (Wikipedia, fetched for the topic words only), organised into
     chapters from its own sections; (3) a Noor Lab model for the topic, whose computed explanation becomes a
     "Working it out" chapter and stays open as the lesson's visual companion. Nothing is invented: every
     sentence the hosts say comes from the source, and the source is named on the lesson. */
  const LEVELS = { school: { label: ['School', 'مدرسة'], sents: 2, chapters: 4 }, exam: { label: ['JEE / NEET / exam revision', 'مراجعة للامتحان'], sents: 3, chapters: 5 }, uni: { label: ['University', 'جامعة'], sents: 4, chapters: 7 } };
  const DEPTH = { revision: 0.5, standard: 1, detailed: 1.8 };
  const SKIP_SEC = /^(see also|references|external links|further reading|notes|bibliography|sources|citations|gallery|footnotes|works cited|in popular culture|trivia)$/i;
  // Wikipedia asks API clients to cache and back off: answers are kept for the page's life, and a 429 waits and retries
  const wcache = new Map();
  async function getJSON(url) {
    if (wcache.has(url)) return wcache.get(url);
    for (let k = 0; k < 4; k++) {
      const r = await fetch(url);
      if (r.status === 429 || r.status === 503) { const ra = +r.headers.get('retry-after') || 0; await new Promise(z => setTimeout(z, Math.min(8000, Math.max(ra * 1000, 1200 * 2 ** k)))); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); wcache.set(url, j); return j;
    }
    throw new Error('rate limited');
  }
  async function wikiArticle(topic, lang, headOnly) {
    const host = `https://${lang === 'ar' ? 'ar' : 'en'}.wikipedia.org/w/api.php?origin=*&format=json&`;
    const q = String(topic).replace(/^(an?|the)\s+/i, '').slice(0, 120);
    const sr = await getJSON(host + 'action=query&list=search&srlimit=6&srsearch=' + encodeURIComponent(q));
    const hits = (sr.query && sr.query.search) || []; if (!hits.length) return null;
    const words = q.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const stem = w => w.replace(/(ies|es|s)$/, '').slice(0, 6), keys = words.filter(w => !/^(with|from|over|under|into|their|that|this|about|between|types|basics|introduction)$/.test(w)).map(stem);
    const headQ = String(q).split(/\s*(?::|\s[—–-]\s)\s*/)[0], headKeys = headQ !== q ? headQ.toLowerCase().split(/\W+/).filter(w => w.length > 3).map(stem) : [];
    const qual = h => { const m = h.title.match(/\(([^)]+)\)/); return m && !m[1].toLowerCase().split(/\W+/).filter(w => w.length > 3 && !/^(device|instrument|tool|unit|physics|chemistry|biology|mathematics|science|process|concept|theory|law|equation)$/.test(w)).every(w => q.toLowerCase().includes(w.slice(0, 5))) ? 3 : 0; }; /* 'Rotation operator (quantum mechanics)' is a specialist page unless the topic says so */
    const score = h => keys.filter(k => h.title.toLowerCase().includes(k)).length * 2 + keys.filter(k => String(h.snippet || '').toLowerCase().includes(k)).length - qual(h);
    // try the best-matching hits in turn; skip disambiguation pages, lists and stubs (too little to teach from)
    const ranked = hits.slice().sort((a, b) => score(b) - score(a)).filter(h => !/^(list of|index of|outline of)\b/i.test(h.title) && !/\(disambiguation\)/i.test(h.title)).slice(0, 3);
    let fallback = null;
    for (const hit of ranked) {
      const ex = await getJSON(host + 'action=query&prop=extracts|pageprops&ppprop=disambiguation&explaintext=1&exsectionformat=wiki&redirects=1&titles=' + encodeURIComponent(hit.title));
      const pg = Object.values((ex.query && ex.query.pages) || {})[0]; if (!pg || !pg.extract) continue;
      if ((pg.pageprops && 'disambiguation' in pg.pageprops) || /\bmay (also )?refer to\b/i.test(pg.extract.slice(0, 400))) continue;
      const secs = []; let curS = { h: null, text: '' };
      pg.extract.split('\n').forEach(line => { const m = line.match(/^(={2,})\s*(.+?)\s*\1\s*$/); if (m) { secs.push(curS); curS = { h: m[2], level: m[1].length, text: '' }; } else curS.text += line + ' '; });
      secs.push(curS);
      const lead = (pg.title + ' ' + pg.extract.slice(0, 1500)).toLowerCase(), found = keys.filter(k => lead.includes(k)).length;
      const relevant = keys.length === 0 || (found >= Math.ceil(keys.length / 2) && keys.some(k => pg.title.toLowerCase().includes(k) || lead.slice(0, 400).includes(k)) && headKeys.every(k => lead.includes(k))); /* most of the topic's words, and all of its main phrase (the part before a colon) */
      const sections = secs.filter(x => x.text.trim().length > 80 && !(x.h && SKIP_SEC.test(x.h)));
      const art = { title: pg.title, url: `https://${lang === 'ar' ? 'ar' : 'en'}.wikipedia.org/wiki/${encodeURIComponent(pg.title.replace(/ /g, '_'))}`, sections, relevant };
      if (relevant && sections.length >= 3) return art; // enough material for a lesson with chapters
      if (relevant && !fallback) fallback = Object.assign(art, { relevant: false, thin: true }); // a stub is reported, not padded out
    }
    if (!fallback && !headOnly && headQ !== q && headQ.length > 3) return wikiArticle(headQ, lang, true); /* "Relative velocity: crossing a river" → the article on relative velocity */
    return fallback;
  }
  const sentencesOf = t => (String(t).replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+(\s|$)/g) || []).map(x => x.trim()).filter(x => x.length > 25 && x.length < 320 && !/\b(citation needed|isbn|doi)\b/i.test(x));
  function fromArticle(art, o) {
    const L = LEVELS[o.level] || LEVELS.school, k = DEPTH[o.depth] || 1, budget = Math.round((o.minutes || 6) * 140 * (o.depth === 'detailed' ? 1.4 : o.depth === 'revision' ? 0.6 : 1));
    const lines = [], used = o.skip || 0; let words = 0, chapters = 0;
    const say = (s, t, extra) => { lines.push(Object.assign({ s, t }, extra || {})); words += t.split(/\s+/).length; };
    const secs = art.sections.slice(used, used + Math.ceil(L.chapters * k) + 1);
    const intro = sentencesOf(art.sections[0] ? art.sections[0].text : '');
    lines.push({ ch: T('Introduction', 'مقدمة') });
    say('A', T(`Welcome to your ERLY audio lesson on ${art.title}.${o.skip ? ' This continues where the last part stopped.' : ''}`, `أهلاً بكم في درس إيرلي الصوتي عن ${art.title}.`));
    say('B', T(`I’d love to really understand ${art.title}. Where do we start?`, `أريد فهم ${art.title} حقاً. من أين نبدأ؟`));
    if (!o.skip) intro.slice(0, Math.max(2, Math.round(L.sents * k))).forEach(t => say('A', t));
    const keyIdeas = [];
    for (const sec of (o.skip ? secs : secs.slice(1))) {
      if (words > budget || chapters >= Math.ceil(L.chapters * k)) break;
      const ss = sentencesOf(sec.text); if (!ss.length) continue;
      chapters++; lines.push({ ch: sec.h || art.title });
      say('B', pick(...BRIDGE[chapters % BRIDGE.length]).replace(/\.$/, '') + (sec.h ? ` ${T('What about', 'وماذا عن')} ${sec.h.toLowerCase()}?` : ''));
      const n = Math.max(1, Math.round(L.sents * k));
      ss.slice(0, n).forEach((t, q) => { say('A', t); if (q === 0) keyIdeas.push(t); });
      if (ss.length > n && o.level !== 'school') say('B', T('So, in short: ', 'إذن باختصار: ') + firstSentences(ss[0], 1));
    }
    if (o.lab) { lines.push({ ch: T('Working it out', 'لنحسبها') }); say('B', T('Can we see it with real numbers?', 'هل نراها بأرقام حقيقية؟')); sentencesOf(o.lab).slice(0, 6).forEach(t => say('A', t, { src: 'model' })); /* from ERLY's model of this topic, not the article */ say('A', T('The model is open in the chat — try changing it while you listen.', 'النموذج مفتوح في المحادثة — جرّب تغييره أثناء الاستماع.')); }
    lines.push({ ch: T('Recap and check yourself', 'ملخص واختبر نفسك') });
    say('B', T('Let me try to sum it up.', 'دعيني أحاول أن ألخص.'));
    keyIdeas.slice(0, 3).forEach(t => say('B', firstSentences(t, 1)));
    const checks = keyIdeas.slice(0, 2).map(t => { const m = t.match(/^(.{3,60}?)\s+(is|are|was|were)\s+(.+)$/i); return m ? T(`Quick check: what ${m[2]} ${m[1].replace(/^(the|a|an)\s+/i, '').toLowerCase()}? Pause and answer, then listen again to this chapter.`, 'سؤال سريع: توقف وأجب.') : null; }).filter(Boolean);
    checks.forEach(c => say('A', c));
    say('A', T(`That’s the lesson. Everything we said came from the ${art.title} article on Wikipedia, which is linked on this lesson.`, `هذا هو الدرس. كل ما قيل جاء من مقالة ${art.title} في ويكيبيديا.`));
    return { art, title: art.title, source: T(`From the Wikipedia article “${art.title}” (quoted, then arranged into a dialogue)`, `من مقالة ويكيبيديا «${art.title}»`), sourceUrl: art.url, lines, opts: o, nextSkip: used + secs.length, words };
  }
  const sayL = t => U.aiSays(t, t, { speak: false });
  async function compose(topic, o) {
    o = Object.assign({ level: 'school', depth: 'standard', minutes: 6 }, o || {});
    const R = ERLY.reader, reading = R && R.isOpen && R.isOpen() && /\b(this|the) (reading|page|chapter|pdf)\b/i.test(topic) ? R.doc : null;
    if (reading) return fromReading();
    // a Noor Lab model for the topic: its computed explanation becomes a chapter and it stays open beside the lesson
    let lab = null;
    try { const L = window.ERLY_LAB, top = L && L.candidates(topic)[0]; if (top && top.score >= 0.9) { await L.open(top.id, top.params); const cur = L.current(); lab = (cur.inst.intro ? cur.inst.intro() : '') + ' ' + String(cur.inst.explain ? cur.inst.explain() : '').replace(/<details[\s\S]*$/i, '').replace(/<[^>]+>/g, ' ');
        // the model is the lesson's visual companion INSIDE the chat; with the chat closed it is not left on screen
        const log = document.getElementById('cmpLog'), open = ERLY.companion && ERLY.companion.isOpen && ERLY.companion.isOpen();
        if (log && open) { const card = document.createElement('div'); card.className = 'cvis'; log.appendChild(card); L.inline(card); } else L.close(); } } catch (e) { lab = null; }
    const pr = (U.store.prefs() || {}), deviceOnly = U.ai && U.ai.pref && (U.ai.pref() || {}).tier === 'local' && (U.ai.pref() || {}).chosen;
    let art = null;
    compose.lastError = null;
    if (pr.research !== 'off' && !deviceOnly) { try { art = await wikiArticle(topic, U.lang()); } catch (e) { art = null; compose.lastError = String(e.message || e); } }
    if (U.ai && U.ai.ready()) { const ai = await fromAI(topic + (art ? '' : ''), null, art); if (ai) return Object.assign(ai, { opts: o }); }
    if (art && art.relevant) return fromArticle(art, Object.assign({}, o, { lab }));
    const VZ = ERLY.visuals, want = VZ && VZ.detect(topic || '');
    if (want) { // a built-in scene only when it is about this topic ("atomic orbitals" is not "gravity and orbits")
      const sc = fromScene(want.id), stems = String(topic).toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3).map(w => w.slice(0, 5));
      if (sc && stems.length && stems.every(st => sc.title.toLowerCase().includes(st))) return sc; }
    return null;
  }
  async function start(topic, o) {
    topic = String(topic || '').replace(/^(please\s+)?(create|make|give me|generate|record)?\s*(me\s+)?(an?\s+)?(audio lesson|podcast|audio overview|audio explanation)\s*(about|on|for|of)?\s*/i, '').replace(/\b(as an audio lesson|in audio)\b/i, '').replace(/[?.!]+$/, '').trim() || topic;
    const lvl = /\b(university|undergraduate|degree|lecture)\b/i.test(topic) ? 'uni' : /\b(jee|neet|revision|exam)\b/i.test(topic) ? 'exam' : (o && o.level) || 'school';
    const depth = /\b(revision|quick|short)\b/i.test(topic) ? 'revision' : /\b(entire|whole|full|detailed|in depth|complete)\b/i.test(topic) ? 'detailed' : (o && o.depth) || 'standard';
    const clean = topic.replace(/\b(a |an |the )?(university[- ]level|jee advanced|jee main|jee|neet|revision|quick|short|entire|whole|full|detailed|in depth|complete) (lesson |lecture |chapter )?(on |about |of )?/gi, '').replace(/\b(lecture|lesson|chapter) (on|about|of)\b/gi, '').trim() || topic;
    await sayL(T(`Building your audio lesson on “${clean}”…`, `أبني درسك الصوتي عن «${clean}»…`));
    const script = await compose(clean, Object.assign({ level: lvl, depth }, o || {}));
    if (!script && compose.lastError) { await sayL(T(`The source I build lessons from (Wikipedia) didn’t answer just now (${compose.lastError}), so I won’t make one up. Please try again in a minute.`, 'لم يستجب المصدر الآن، لذا لن أختلق درساً. حاول بعد دقيقة.')); return null; }
    if (!script) { await sayL(T(`I couldn’t find a reliable source for “${clean}”, so I won’t make up a lesson. Try a more specific name for the topic (for example “photosynthesis” or “French Revolution”), or open a reading and ask for a lesson on it.`, 'لم أجد مصدراً موثوقاً، ولن أختلق درساً.')); return null; }
    await sayL(`${T('Here’s your audio lesson', 'إليك درسك الصوتي')}: “${script.title}”. ${script.source}. ${T('Press play whenever you’re ready.', 'اضغط تشغيل عندما تكون جاهزاً.')}`);
    return open(script);
  }
  async function variant(script, kind) { // revision / detailed / continuation of the same lesson
    const o = Object.assign({}, script.opts || {}); if (kind === 'revision') o.depth = 'revision'; if (kind === 'detailed') o.depth = 'detailed'; if (kind === 'continue') o.skip = script.nextSkip || 0;
    const art = script.art || await wikiArticle(script.title, U.lang()).catch(() => null); if (!art) return null; // the same article the lesson quoted
    const s2 = fromArticle(art, o); if (kind === 'continue' && s2.lines.filter(l => l.s).length < 6) { await sayL(T('That was the whole article — there is nothing more to continue with.', 'انتهت المقالة.')); return null; }
    return open(s2);
  }

  ERLY.audioLesson = { start, open, compose, variant, fromScene, fromReading, wikiArticle, current: () => cur, LEVELS };
})();
