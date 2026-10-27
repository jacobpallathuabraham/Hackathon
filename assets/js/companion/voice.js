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
  function phrases(text, lang) {
    const out = [];
    const sents = humanize(text, lang).match(/[^.!?؟]+[.!?؟]*/g) || [];
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
    const state = { queue: [], idx: 0, speaking: false, paused: false, lastText: '', lang: 'en', rec: null, listening: false, onState: env.onState || (() => {}) };
    const set = (k, v) => { state[k] = v; state.onState(snapshot()); };
    const snapshot = () => ({ speaking: state.speaking, paused: state.paused, listening: state.listening });

    function voices(lang) {
      if (!synth || !synth.getVoices) return [];
      const want = lang === 'ar' ? /^ar/i : /^en/i;
      return synth.getVoices().filter(v => want.test(v.lang)).sort((a, b) => naturalScore(b) - naturalScore(a));
    }
    function pickVoice(lang) {
      const vs = voices(lang), name = getVoiceName(lang);
      return (name && vs.find(v => v.name === name)) || vs[0] || null;
    }
    let token = 0, gapT = null;
    function speakFrom(i, opts) {
      const my = ++token;
      clearTimeout(gapT);
      if (!synth || !Utter) return;
      synth.cancel();
      state.idx = i;
      if (i >= state.queue.length) { set('speaking', false); opts.onend && opts.onend(); return; }
      const item = state.queue[i];
      const u = new Utter(item.text);
      const v = pickVoice(state.lang);
      if (v) u.voice = v;
      u.lang = v ? v.lang : (state.lang === 'ar' ? 'ar-SA' : 'en-GB');
      // gentle, human-like prosody: a relaxed pace, tiny variation between
      // phrases, a slightly slower phrase end and a small lift on questions
      const nat = v && isNatural(v);
      const baseRate = opts.rate || (nat ? 1.0 : 0.95), basePitch = opts.pitch || (nat ? 1.0 : 1.02);
      const jitter = () => (Math.random() - 0.5) * 0.05;
      u.rate = Math.max(0.6, baseRate + jitter() - (item.last ? 0.03 : 0));
      u.pitch = Math.max(0.5, basePitch + jitter() + (item.question && item.last ? 0.06 : 0));
      u.onstart = () => { if (my === token) { set('speaking', true); opts.onstart && opts.onstart(item.sentence, i); } };
      u.onboundary = e => { if (my === token && opts.onboundary) opts.onboundary(e); };
      u.onend = () => {
        if (my !== token) return;
        const next = state.queue[i + 1];
        const gap = !next ? 0 : next.sentence !== item.sentence ? 260 + Math.random() * 140 : 90 + Math.random() * 80;
        const go = () => { if (my !== token) return; if (state.paused) { state.resumeAt = i + 1; return; } speakFrom(i + 1, opts); };
        if (gap) gapT = setTimeout(go, gap); else go();
      };
      u.onerror = e => { if (my !== token) return; if (e && (e.error === 'interrupted' || e.error === 'canceled')) return; set('speaking', false); opts.onerror && opts.onerror(e && e.error); };
      synth.speak(u);
    }
    let lastOpts = {};
    const api = {
      supported: { tts: !!(synth && Utter), stt: !!Rec },
      state: snapshot,
      speak(text, opts) {
        opts = opts || {};
        if (!synth || !Utter) { opts.onend && opts.onend(); return false; }
        state.lastText = text; state.lang = opts.lang || 'en'; state.queue = phrases(text, state.lang); state.paused = false; state.resumeAt = null;
        lastOpts = opts;
        set('speaking', true);
        speakFrom(0, opts);
        return true;
      },
      voices,
      voiceFor: lang => pickVoice(lang),
      stop() { token++; clearTimeout(gapT); state.queue = []; state.paused = false; if (synth) synth.cancel(); set('speaking', false); },
      pause() { if (!state.speaking) return; state.paused = true; if (synth && synth.pause) synth.pause(); set('paused', true); },
      resume() {
        if (!state.paused) return;
        state.paused = false;
        if (state.resumeAt != null) { const i = state.resumeAt; state.resumeAt = null; speakFrom(i, lastOpts); } else if (synth && synth.resume) synth.resume();
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
        r.lang = opts.lang === 'ar' ? 'ar-AE' : 'en-GB';
        r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
        let final = '';
        r.onresult = e => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) final += t; else interim += t;
          }
          opts.onresult && opts.onresult((final + interim).trim(), !!final && !interim);
        };
        r.onerror = e => { opts.onerror && opts.onerror(e && e.error || 'error'); };
        const guard = setTimeout(() => { try { r.stop(); } catch (e) { /* ignore */ } }, opts.maxMs || 15000); // never listen indefinitely
        r.onend = () => { clearTimeout(guard); state.rec = null; set('listening', false); opts.onend && opts.onend(final.trim()); };
        state.rec = r;
        try { r.start(); set('listening', true); return true; }
        catch (e) { state.rec = null; opts.onerror && opts.onerror('start-failed'); return false; }
      },
      stopListening() { if (state.rec) { try { state.rec.stop(); } catch (e) { /* ignore */ } } },
      abortListening() { if (state.rec) { try { state.rec.abort(); } catch (e) { /* ignore */ } state.rec = null; set('listening', false); } }
    };
    return api;
  }
  return { create, naturalScore, isNatural, humanize, phrases };
});
