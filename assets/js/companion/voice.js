/* ERLY AI Reading Companion — voice in and out (browser Web Speech APIs).

   Speaking uses speechSynthesis (on-device voices). Listening uses the
   browser's SpeechRecognition where it exists. It is only ever started by an
   explicit tap on the mic button, only after the student has agreed to the
   microphone consent card, and it stops after one answer. ERLY receives text
   only: no audio is recorded or kept. Note for the consent card: in Chrome and
   Edge the browser itself may send the audio to its vendor's speech service to
   transcribe it; Safari may do it on device. ERLY cannot change that, which is
   why typing is always available instead.

   This is turn-by-turn voice (listen, then reply). It is not a real-time
   conversational voice model. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_VOICE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // How human a voice sounds. Neural / "Natural" / "Premium" / Siri-class voices
  // are far more human than the classic ones, so they always win.
  const naturalScore = v => {
    let s = 0; const n = v.name || '';
    if (/natural|neural/i.test(n)) s += 8;
    if (/premium|enhanced|siri/i.test(n)) s += 7;
    if (/online/i.test(n)) s += 3;
    if (/google/i.test(n)) s += 3;
    if (/aria|jenny|sonia|libby|emma|michelle|ava|samantha|serena|allison|karen|moira|tessa|zoe|evan|nathan|ana|hamed|salma|zariyah|fatima|laila|maged|tarik|amina|hala/i.test(n)) s += 3;
    if (/^en-(GB|US|AU|IE|CA)/i.test(v.lang || '')) s += 1;
    if (v.localService === false) s += 1; // cloud voices are usually the neural ones
    if (/compact|espeak|robot|novelty|whisper|bells|zarvox|trinoids|cellos|bad news|boing|bubbles|jester|organ|superstar|wobble|albert|fred|junior|ralph/i.test(n)) s -= 12;
    return s;
  };
  const isNatural = v => naturalScore(v) >= 7;
  // the warmest voices we know of, best first (Edge/Windows, Chrome, Apple)
  const FAVOURITES = [/Ava.*(Multilingual|Natural)/i, /Emma.*(Multilingual|Natural)/i, /Jenny.*Natural/i, /Aria.*Natural/i, /Sonia.*Natural/i, /Libby.*Natural/i, /Google UK English Female/i, /Google US English/i, /Ava.*(Premium|Enhanced)/i, /Zoe.*(Premium|Enhanced)/i, /Serena.*(Premium|Enhanced)/i, /Samantha.*(Premium|Enhanced)/i, /Kate.*(Premium|Enhanced)/i, /Siri/i, /^Samantha$/i, /^Karen$/i, /^Moira$/i, /^Tessa$/i];
  const ARABIC = [/Salma|Zariyah|Fatima|Hala|Amina|Laila.*Natural/i, /Maged|Tarik|Hamed/i, /Google.*(عربي|Arabic)/i, /Majed|Laila/i];
  // Voices don't report gender, so it is guessed from well-known voice names.
  const FEMALE = /female|woman|\b(ava|emma|jenny|aria|sonia|libby|michelle|samantha|karen|moira|tessa|serena|zoe|allison|susan|victoria|fiona|kate|catherine|hazel|heera|zira|ana|clara|natasha|nancy|sara|sarah|elsa|isabella|olivia|amy|joanna|kimberly|salli|ivy|kendra|nicole|veena|lekha|rishi?a|salma|zariyah|fatima|hala|amina|laila|mariam|layla|nora|noura|yara|maryam|shakira|jane|joan|kathy|vicki|princess|agnes|alice|amelie|anna|ellen|ioana|joana|kyoko|lana|laura|luciana|mei-?jia|melina|milena|monica|nora|paulina|satu|sin-?ji|ting-?ting|yelda|yuna|zuzana|flo|grandma|sandy|shelley|aoife|neerja|molly|maisie|abbi|bella|hollie|elizabeth|jacqueline|ashley|cora|elena|jessa|sonia)\b/i;
  const MALE = /\bmale\b|\bman\b|\b(guy|ryan|davis|andrew|brian|christopher|eric|roger|steffan|thomas|daniel|alex|fred|arthur|oliver|aaron|evan|nathan|tom|rishi|hamed|maged|tarik|majed|shakir|omar|george|james|david|mark|matthew|justin|joey|russell|lee|gordon|rocko|reed|eddy|grandpa|ralph|albert|junior|diego|jorge|juan|luca|thomas|xander|yuri|aditya|prabhat|liam|william|jason|tony|ethan|noah|elliot|alfie|ollie|connor|duncan|kenny|kai|brandon|steffan|tariq|hamdan|prabhat|ravi|kumar|fahed|bassel|moaz|jamal|abdullah|ali|youssef|taim|rami|omar|zayd|karim|wayne|neil|tim|ken|duncan|darren)\b/i;
  function gender(v) {
    const n = (v && v.name) || '';
    if (/\bfemale\b/i.test(n)) return 'f';
    if (/\bmale\b/i.test(n)) return 'm';
    if (FEMALE.test(n)) return 'f';
    if (MALE.test(n)) return 'm';
    if (/Google (US|UK) English/i.test(n)) return 'f';
    return '';
  }
  function rank(v, lang) {
    const list = lang === 'ar' ? ARABIC : FAVOURITES;
    const i = list.findIndex(re => re.test(v.name || ''));
    return (i < 0 ? 0 : 100 - i) + naturalScore(v);
  }

  // Write the way people talk: contractions, no symbols, no abbreviations.
  const CONTRACT = [[/\bI am\b/g, "I'm"], [/\bI will\b/g, "I'll"], [/\bI have\b(?! to)/g, "I've"], [/\bdo not\b/gi, "don't"], [/\bdoes not\b/gi, "doesn't"], [/\bcannot\b/gi, "can't"], [/\bwill not\b/gi, "won't"], [/\bit is\b/g, "it's"], [/\bIt is\b/g, "It's"], [/\bthat is\b/g, "that's"], [/\byou are\b/g, "you're"], [/\bYou are\b/g, "You're"], [/\blet us\b/gi, "let's"], [/\bthere is\b/g, "there's"], [/\bwe are\b/g, "we're"], [/\bis not\b/g, "isn't"], [/\bare not\b/g, "aren't"]];
  function humanize(text, lang) {
    let t = String(text || '').replace(/<[^>]+>/g, ' ');
    t = t.replace(/[“”«»"]/g, '').replace(/[‘’]/g, "'").replace(/[★•●▸→←]/g, ' ').replace(/\p{Extended_Pictographic}/gu, '');
    t = t.replace(/\s*[—–]\s*/g, ', ').replace(/\s*…\s*/g, '... ').replace(/×/g, ' times ').replace(/&/g, lang === 'ar' ? ' و ' : ' and ');
    if (lang !== 'ar') {
      t = t.replace(/\be\.g\.\s*/gi, 'for example, ').replace(/\bi\.e\.\s*/gi, 'that is, ').replace(/\betc\.?/gi, 'and so on').replace(/(\d)\s?%/g, '$1 percent').replace(/\bSAS\b/g, 'S A S').replace(/\bERLY\b/g, 'Early').replace(/\bPDF\b/g, 'P D F');
      CONTRACT.forEach(([re, to]) => { t = t.replace(re, to); });
    } else t = t.replace(/(\d)\s?%/g, '$1 بالمئة').replace(/إيرلي|ERLY/g, 'إيرلي');
    return t.replace(/\s+/g, ' ').replace(/\s+([,.!?؟،])/g, '$1').trim();
  }
  // Break text into sentences with a short breath between them. Very long
  // single utterances sound flat (and Chrome cuts them off after ~15 s).
  const SP = () => (typeof self !== 'undefined' && self.ERLY_PROSODY) || null;
  function phrases(text, lang, dict) {
    const out = [];
    const sp = SP();
    const sents = humanize(sp ? sp.speechify(text, lang, dict) : text, lang).match(/[^.!?؟]+[.!?؟]*/g) || [];
    sents.forEach((sent, si) => {
      sent = sent.trim(); if (!sent) return;
      // Good voices phrase a whole sentence naturally, so only very long
      // sentences are split, at a comma, into chunks of 8+ words.
      const words = n => n.split(/\s+/).length;
      const merged = [];
      if (words(sent) <= 22) merged.push(sent);
      else sent.split(/(?<=[,;:،])\s+/).forEach(p => { const last = merged[merged.length - 1]; if (last && (words(p) < 8 || words(last) < 8)) merged[merged.length - 1] = last + ' ' + p; else merged.push(p); });
      merged.forEach((p, pi) => out.push({ text: p, sentence: si, last: pi === merged.length - 1, question: /[?؟]$/.test(sent) }));
    });
    return out;
  }

  function create(env) {
    env = env || {};
    const synth = env.synth !== undefined ? env.synth : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);
    const Utter = env.Utterance || (typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : null);
    const Rec = env.Recognition !== undefined ? env.Recognition : (typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition || null) : null);
    const getConsent = env.getConsent || (() => false);
    const getVoiceName = env.getVoiceName || (() => '');
    // the student's voice settings: speed, pitch, volume, preferred gender
    const getSettings = env.getSettings || (() => ({}));
    const state = { queue: [], idx: 0, speaking: false, paused: false, lastText: '', lang: 'en', rec: null, listening: false, onState: env.onState || (() => {}) };
    const set = (k, v) => { state[k] = v; state.onState(snapshot()); };
    const snapshot = () => ({ speaking: state.speaking, paused: state.paused, listening: state.listening });

    function voices(lang) {
      if (!synth || !synth.getVoices) return [];
      const want = lang === 'ar' ? /^ar/i : /^en/i;
      return synth.getVoices().filter(v => want.test(v.lang)).sort((a, b) => rank(b, lang) - rank(a, lang));
    }
    function pickVoice(lang, override) {
      const vs = voices(lang), name = override || getVoiceName(lang), g = getSettings().gender;
      return (name && vs.find(v => v.name === name)) || (g && vs.find(v => gender(v) === g)) || vs[0] || null;
    }
    let token = 0, gapT = null;
    /* ---- optional expressive cloud voice (ElevenLabs via ERLY's server) ---- */
    const getCloud = env.getCloud || (() => null);
    let cloudDown = 0, timers = [];
    const ttsCache = new Map();
    // emotion → a gentle eleven_v3 audio tag; real "haha" becomes a natural laugh from the voice model itself
    function tagify(text, emo) {
      let t = String(text).replace(/\b(haha|ha ha|hehe)\b[!.]*/gi, '[laughs]');
      const pre = { enthusiastic: '[excited] ', excited: '[excited] ', happy: '[cheerfully] ', empathetic: '[gently] ', sympathetic: '[gently] ', reassuring: '[warmly] ', thoughtful: '[thoughtfully] ', curious: '[curious] ', serious: '[seriously] ', playful: '[playfully] ' }[emo] || '';
      return pre + t;
    }
    function fetchTTS(cloud, text, emo, g) {
      const key = g + '|' + emo + '|' + text;
      if (ttsCache.has(key)) return ttsCache.get(key);
      const p = fetch(cloud.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: cloud.tags === false ? text : tagify(text, emo), voice: (cloud.voices || {})[g] || (cloud.voices || {}).f, model: cloud.model }) })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error('tts-' + r.status))));
      ttsCache.set(key, p); if (ttsCache.size > 40) ttsCache.delete(ttsCache.keys().next().value);
      p.catch(() => ttsCache.delete(key));
      return p;
    }
    function advance(i, item, opts, my) {
      phraseHook('end');
      const next = state.queue[i + 1];
      const gap = !next ? 0 : next.sentence !== item.sentence ? 300 + (item.question ? 80 : 0) + ((opts.prosody && opts.prosody.pause) || 0) : 110;
      const go = () => { if (my !== token) return; if (state.paused) { state.resumeAt = i + 1; return; } speakFrom(i + 1, opts); };
      if (gap) gapT = setTimeout(go, gap); else go();
    }
    function cloudSpeak(i, opts, my, cloud) {
      const item = state.queue[i], cfg = getSettings(), g = cfg.gender || 'f';
      fetchTTS(cloud, item.text, opts.emotion, g).then(j => {
        if (my !== token) return;
        const audio = new Audio('data:audio/mpeg;base64,' + j.audio);
        state.audio = audio;
        audio.volume = Math.max(0, Math.min(1, (cfg.volume != null ? cfg.volume : 1)));
        audio.playbackRate = Math.max(0.7, Math.min(1.5, cfg.rate || 1));
        // word starts from the voice's own character timestamps (tags are skipped)
        const words = []; const re = /\S+/g; let m; while ((m = re.exec(item.text))) words.push(m.index);
        let starts = [];
        const al = j.alignment;
        if (al && al.characters) { let inW = false, inTag = false; al.characters.forEach((ch, k) => { if (ch === '[') inTag = true; if (inTag) { if (ch === ']') inTag = false; return; } if (/\S/.test(ch) && !inW) { starts.push(al.character_start_times_seconds[k]); inW = true; } else if (/\s/.test(ch)) inW = false; }); }
        if (starts.length > words.length) starts = starts.slice(starts.length - words.length);
        audio.onplaying = () => {
          if (my !== token) return;
          set('speaking', true); opts.onstart && opts.onstart(item.sentence, i);
          phraseHook('start', item.text, 1, null, opts.emotion);
          timers.forEach(clearTimeout);
          timers = words.map((ci, k) => setTimeout(() => { if (my === token) phraseHook('boundary', ci); }, ((starts[k] != null ? starts[k] : k * 0.3) * 1000) / audio.playbackRate));
        };
        audio.onended = () => { timers.forEach(clearTimeout); if (my === token) advance(i, item, opts, my); };
        audio.onerror = () => { cloudDown = Date.now(); if (my === token) speakFrom(i, opts); };
        if (state.queue[i + 1]) fetchTTS(cloud, state.queue[i + 1].text, opts.emotion, g); // prefetch: no gap waiting for audio
        audio.play().catch(() => { cloudDown = Date.now(); if (my === token) speakFrom(i, opts); });
      }).catch(() => { cloudDown = Date.now(); if (my === token) speakFrom(i, opts); });
    }

    function speakFrom(i, opts) {
      const my = ++token;
      clearTimeout(gapT);
      if (state.audio) { try { state.audio.pause(); } catch (e) { /* ignore */ } state.audio = null; }
      const cloud = getCloud();
      if (cloud && cloud.url && Date.now() - cloudDown > 60000 && i < state.queue.length && !opts.voiceName) { if (synth) synth.cancel(); state.idx = i; return cloudSpeak(i, opts, my, cloud); }
      if (!synth || !Utter) return;
      synth.cancel();
      state.idx = i;
      if (i >= state.queue.length) { set('speaking', false); opts.onend && opts.onend(); return; }
      const item = state.queue[i];
      const u = new Utter(item.text);
      const v = pickVoice(state.lang, opts.voiceName);
      if (v) u.voice = v;
      u.lang = v ? v.lang : (state.lang === 'ar' ? 'ar-SA' : 'en-GB');
      // gentle, human-like prosody: a relaxed pace, tiny variation between
      // phrases, a slightly slower phrase end and a small lift on questions
      const nat = v && isNatural(v);
      const cfg = getSettings();
      // emotion: each sentence's tone nudges pace, pitch and volume (prosody.js)
      const pr = opts.prosody || {};
      const baseRate = (opts.rate || (nat ? 1.02 : 0.97)) * (cfg.rate || 1) * (opts.baseRate || cfg.baseRate || 1) * (pr.rate || 1);
      const basePitch = (opts.pitch || 1.0) * (cfg.pitch || 1) * (opts.basePitch || cfg.basePitch || 1) * (pr.pitch || 1);
      u.rate = baseRate - (item.last ? 0.02 : 0);
      u.pitch = basePitch + (item.question && item.last ? 0.05 : 0);
      u.volume = Math.max(0, Math.min(1, (cfg.volume != null ? cfg.volume : 1) * (pr.volume || 1)));
      u.rate = Math.max(0.5, Math.min(2, u.rate)); u.pitch = Math.max(0.5, Math.min(2, u.pitch));
      // some browsers (Safari especially) occasionally never fire onend: move on anyway
      clearTimeout(state.watch);
      state.watch = setTimeout(() => { if (my === token && state.speaking && !state.paused) { try { synth.cancel(); } catch (e) { /* ignore */ } u.onend(); } }, 2500 + item.text.split(/\s+/).length * 520 / baseRate);
      u.onstart = () => { if (my === token) { set('speaking', true); opts.onstart && opts.onstart(item.sentence, i); phraseHook('start', item.text, u.rate, v, opts.emotion); } };
      u.onboundary = e => { if (my !== token) return; if (opts.onboundary) opts.onboundary(e); if (!e || e.name === 'word' || e.name == null) phraseHook('boundary', e ? e.charIndex : 0); };
      u.onend = () => {
        if (my !== token) return;
        clearTimeout(state.watch);
        if (u.done) return; u.done = true;
        // natural pauses: a breath between phrases, longer between sentences, plus the tone's own pause
        advance(i, item, opts, my);
      };
      u.onerror = e => { if (my !== token) return; if (e && (e.error === 'interrupted' || e.error === 'canceled')) return; set('speaking', false); opts.onerror && opts.onerror(e && e.error); };
      synth.speak(u);
      if (synth.paused && !state.paused && synth.resume) synth.resume();
    }
    // lets an avatar follow each spoken phrase (lip-sync)
    const hooks = new Set();
    function phraseHook(type, a, b, c) { hooks.forEach(f => { try { f(type, a, b, c); } catch (e) { /* ignore */ } }); }
    let lastOpts = {};
    const api = {
      supported: { tts: !!(synth && Utter), stt: !!Rec },
      state: snapshot,
      speak(text, opts) {
        opts = opts || {};
        if (!synth || !Utter) { opts.onend && opts.onend(); return false; }
        state.lastText = text; state.lang = opts.lang || 'en'; state.queue = phrases(text, state.lang, getSettings().dict); state.paused = false; state.resumeAt = null;
        lastOpts = opts;
        set('speaking', true);
        speakFrom(0, opts);
        return true;
      },
      voices,
      voiceFor: lang => pickVoice(lang),
      onPhrase(f) { hooks.add(f); return () => hooks.delete(f); },
      stop() { token++; clearTimeout(gapT); clearTimeout(state.watch); timers.forEach(clearTimeout); if (state.audio) { try { state.audio.pause(); } catch (e) { /* ignore */ } state.audio = null; } state.queue = []; state.paused = false; if (synth) synth.cancel(); phraseHook('end'); set('speaking', false); },
      pause() { if (!state.speaking) return; state.paused = true; if (state.audio) state.audio.pause(); else if (synth && synth.pause) synth.pause(); phraseHook('end'); set('paused', true); },
      resume() {
        if (!state.paused) return;
        state.paused = false;
        if (state.resumeAt != null) { const i = state.resumeAt; state.resumeAt = null; speakFrom(i, lastOpts); } else if (state.audio) state.audio.play().catch(() => {}); else if (synth && synth.resume) synth.resume();
        set('paused', false);
      },
      repeat() { if (state.lastText) api.speak(state.lastText, lastOpts); },
      // skip to the start of the next sentence
      skip() {
        if (!state.speaking) return;
        const cur = state.queue[state.idx];
        const n = state.queue.findIndex((q, k) => k > state.idx && (!cur || q.sentence !== cur.sentence));
        speakFrom(n < 0 ? state.queue.length : n, lastOpts);
      },
      // One answer per tap. Returns false when not allowed / unsupported.
      listen(opts) {
        opts = opts || {};
        if (!Rec) { opts.onerror && opts.onerror('unsupported'); return false; }
        if (!getConsent()) { opts.onerror && opts.onerror('no-consent'); return false; }
        api.stop();
        if (state.rec) try { state.rec.abort(); } catch (e) { /* ignore */ }
        const r = new Rec();
        const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
        r.lang = opts.lang === 'ar' ? 'ar-AE' : (/^en-/i.test(nav) ? nav : 'en-US');
        r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
        let final = '', interim = '', ended = false, quietT = null, heard = false;
        const finish = () => { try { r.stop(); } catch (e) { /* ignore */ } };
        r.onresult = e => {
          let fin = '', mid = '';
          for (let i = 0; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) fin += t; else mid += t;
          }
          final = fin; interim = mid; heard = true;
          const text = (final + ' ' + interim).replace(/\s+/g, ' ').trim();
          opts.onresult && opts.onresult(text, !interim);
          // end of turn: ~1.1 s without new words (Safari never decides on its own)
          const q = opts.quietMs || 1100;
          clearTimeout(quietT); quietT = setTimeout(finish, interim ? q + 200 : Math.max(500, q - 400));
        };
        r.onspeechstart = () => { opts.onspeech && opts.onspeech(); };
        r.onstart = r.onaudiostart = () => { if (!r.began) { r.began = true; opts.onstart && opts.onstart(); } };
        r.onerror = e => { const code = e && e.error || 'error'; if (code === 'aborted') return; opts.onerror && opts.onerror(code); };
        const guard = setTimeout(finish, opts.maxMs || 20000); // never listen indefinitely
        const noStart = setTimeout(() => { if (!heard) finish(); }, opts.waitMs || 9000); // nobody spoke
        r.onend = () => {
          if (ended) return; ended = true;
          clearTimeout(guard); clearTimeout(noStart); clearTimeout(quietT);
          state.rec = null; set('listening', false);
          // Safari often ends with only "interim" results: they are what was said
          opts.onend && opts.onend((final + ' ' + interim).replace(/\s+/g, ' ').trim());
        };
        state.rec = r;
        try { r.start(); set('listening', true); return true; }
        catch (e) { state.rec = null; opts.onerror && opts.onerror('start-failed'); return false; }
      },
      stopListening() { if (state.rec) { try { state.rec.stop(); } catch (e) { /* ignore */ } } },
      abortListening() { if (state.rec) { try { state.rec.abort(); } catch (e) { /* ignore */ } state.rec = null; set('listening', false); } }
    };
    return api;
  }
  return { create, naturalScore, isNatural, humanize, phrases, gender };
});
