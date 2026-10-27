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

  const naturalScore = v => {
    let s = 0; const n = v.name || '';
    if (/natural|neural/i.test(n)) s += 6; if (/online/i.test(n)) s += 3; if (/google/i.test(n)) s += 2;
    if (/aria|jenny|sonia|libby|emma|michelle|ava|samantha|serena|allison|karen|moira|tessa|hamed|salma|zariyah|laila|maged|tarik/i.test(n)) s += 3;
    if (/compact|espeak|robot|novelty|whisper|bells|zarvox|trinoids|cellos/i.test(n)) s -= 8;
    return s;
  };

  function create(env) {
    env = env || {};
    const synth = env.synth !== undefined ? env.synth : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);
    const Utter = env.Utterance || (typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : null);
    const Rec = env.Recognition !== undefined ? env.Recognition : (typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition || null) : null);
    const getConsent = env.getConsent || (() => false);
    const state = { queue: [], idx: 0, speaking: false, paused: false, lastText: '', lang: 'en', rec: null, listening: false, onState: env.onState || (() => {}) };
    const set = (k, v) => { state[k] = v; state.onState(snapshot()); };
    const snapshot = () => ({ speaking: state.speaking, paused: state.paused, listening: state.listening });

    function pickVoice(lang) {
      if (!synth || !synth.getVoices) return null;
      const want = lang === 'ar' ? /^ar/i : /^en/i;
      const vs = synth.getVoices().filter(v => want.test(v.lang));
      vs.sort((a, b) => naturalScore(b) - naturalScore(a));
      return vs[0] || null;
    }
    function sentences(text) {
      const plain = String(text).replace(/<[^>]+>/g, ' ').replace(/\s*—\s*/g, ', ').replace(/\s+/g, ' ').trim();
      return plain.match(/[^.!?؟]+[.!?؟]*/g) || (plain ? [plain] : []);
    }
    let token = 0;
    function speakFrom(i, opts) {
      const my = ++token;
      if (!synth || !Utter) return;
      synth.cancel();
      state.idx = i;
      if (i >= state.queue.length) { set('speaking', false); opts.onend && opts.onend(); return; }
      const u = new Utter(state.queue[i]);
      const v = pickVoice(state.lang);
      if (v) u.voice = v;
      u.lang = v ? v.lang : (state.lang === 'ar' ? 'ar-SA' : 'en-GB');
      u.rate = opts.rate || 0.98; u.pitch = opts.pitch || 1.04;
      u.onstart = () => { if (my === token) { set('speaking', true); opts.onstart && opts.onstart(i); } };
      u.onboundary = e => { if (my === token && opts.onboundary) opts.onboundary(e); };
      u.onend = () => { if (my === token && !state.paused) speakFrom(i + 1, opts); };
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
        state.lastText = text; state.lang = opts.lang || 'en'; state.queue = sentences(text); state.paused = false;
        lastOpts = opts;
        set('speaking', true);
        speakFrom(0, opts);
        return true;
      },
      stop() { token++; state.queue = []; state.paused = false; if (synth) synth.cancel(); set('speaking', false); },
      pause() { if (!state.speaking) return; state.paused = true; if (synth && synth.pause) synth.pause(); set('paused', true); },
      resume() { if (!state.paused) return; state.paused = false; if (synth && synth.resume) synth.resume(); set('paused', false); },
      repeat() { if (state.lastText) api.speak(state.lastText, lastOpts); },
      skip() { if (state.speaking) speakFrom(state.idx + 1, lastOpts); },
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
  return { create, naturalScore };
});
