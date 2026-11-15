/* ERLY — natural neural voices for Noor (v18), running ON THIS DEVICE.

   Engine: Kokoro-82M (Apache-2.0, by hexgrad), through kokoro-js and transformers.js / ONNX Runtime Web (both
   hosted on this site under assets/vendor). It is a real neural text-to-speech model, not the operating system's
   voices: one download of the model (~92 MB, quantised q8) from Hugging Face's model hosting, cached by the browser;
   after that, speech is generated locally — no text is sent anywhere to be spoken.

   Voices: the 28 voices the model card lists, with the language and gender the model card gives (American and
   British English, female and male). Kokoro speaks English only; Arabic keeps the device's own voices.

   Honest limits: generation runs on the CPU (WebAssembly), single-threaded on GitHub Pages (no cross-origin
   isolation), so the first sentence takes a moment; later sentences are generated while the previous one plays.
   Older phones may be slow — the device voices remain available as a fallback.

   speechText(text) also prepares any text for listening: Markdown, code and links removed; maths and units read the
   way a teacher says them ("x²" → "x squared", "m/s²" → "metres per second squared", "≤" → "is less than or equal
   to"), so no voice reads raw notation aloud. */
(function (root) {
  'use strict';
  const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
  const BASE = (() => { try { return new URL('assets/', document.baseURI).href; } catch (e) { return 'assets/'; } })();
  const VOICES = [
    ['af_heart', 'Heart', 'American English', 'Female', 'A'], ['af_bella', 'Bella', 'American English', 'Female', 'A-'], ['af_nicole', 'Nicole', 'American English', 'Female', 'B-'], ['af_aoede', 'Aoede', 'American English', 'Female', 'C+'], ['af_kore', 'Kore', 'American English', 'Female', 'C+'], ['af_sarah', 'Sarah', 'American English', 'Female', 'C+'], ['af_nova', 'Nova', 'American English', 'Female', 'C'], ['af_sky', 'Sky', 'American English', 'Female', 'C-'], ['af_alloy', 'Alloy', 'American English', 'Female', 'C'], ['af_jessica', 'Jessica', 'American English', 'Female', 'D'], ['af_river', 'River', 'American English', 'Female', 'D'],
    ['am_michael', 'Michael', 'American English', 'Male', 'C+'], ['am_fenrir', 'Fenrir', 'American English', 'Male', 'C+'], ['am_puck', 'Puck', 'American English', 'Male', 'C+'], ['am_echo', 'Echo', 'American English', 'Male', 'D'], ['am_eric', 'Eric', 'American English', 'Male', 'D'], ['am_liam', 'Liam', 'American English', 'Male', 'D'], ['am_onyx', 'Onyx', 'American English', 'Male', 'D'], ['am_adam', 'Adam', 'American English', 'Male', 'F+'],
    ['bf_emma', 'Emma', 'British English', 'Female', 'B-'], ['bf_isabella', 'Isabella', 'British English', 'Female', 'C'], ['bf_alice', 'Alice', 'British English', 'Female', 'D'], ['bf_lily', 'Lily', 'British English', 'Female', 'D'],
    ['bm_george', 'George', 'British English', 'Male', 'C'], ['bm_fable', 'Fable', 'British English', 'Male', 'C'], ['bm_lewis', 'Lewis', 'British English', 'Male', 'D+'], ['bm_daniel', 'Daniel', 'British English', 'Male', 'D']
  ].map(([id, name, accent, gender, grade]) => ({ id, name, accent, gender, grade, lang: id[0] === 'b' ? 'en-GB' : 'en-US' }));
  // the model card's overall quality grade (A best): offered first, the rest kept for variety
  const RECOMMENDED = ['af_heart', 'af_bella', 'bf_emma', 'am_michael', 'am_fenrir', 'bm_george', 'bm_fable', 'af_nicole'];

  let tts = null, loading = null, status = 'idle', progress = 0, err = null; const subs = new Set();
  const emit = () => subs.forEach(f => { try { f({ status, progress, err }); } catch (e) { /* listener */ } });
  const supported = () => typeof WebAssembly === 'object' && typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  async function load(onProgress) {
    if (tts) return tts; if (loading) return loading;
    status = 'loading'; progress = 0; err = null; emit();
    loading = (async () => {
      const mod = await import(BASE + 'vendor/kokoro/kokoro.web.js');
      mod.env.wasmPaths = BASE + 'vendor/transformers/';
      const files = {};
      const t = await mod.KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm', progress_callback: p => { if (p && p.file && p.total) { files[p.file] = [p.loaded || 0, p.total]; const L = Object.values(files).reduce((a, x) => a + x[0], 0), Tt = Object.values(files).reduce((a, x) => a + x[1], 0); progress = Tt ? L / Tt : 0; emit(); onProgress && onProgress(progress); } } });
      tts = t; status = 'ready'; progress = 1; emit(); return t;
    })().catch(e => { status = 'error'; err = String(e && e.message || e).slice(0, 200); loading = null; emit(); throw e; });
    return loading;
  }
  // Float32 PCM → 16-bit WAV blob URL (plays through a normal <audio> element: pause/resume/seek all work)
  function wavURL(samples, rate) {
    const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  const cache = new Map(); // text|voice|speed → { url, duration } (this page only; revoked when evicted)
  async function synth(text, voice, speed) {
    const t = speechText(text); if (!t) return null;
    const key = t + '|' + voice + '|' + (speed || 1);
    if (cache.has(key)) return cache.get(key);
    const engine = await load();
    const audio = await engine.generate(t, { voice: voice || 'af_heart', speed: speed || 1 });
    const data = audio.audio || audio.data, rate = audio.sampling_rate || 24000;
    let peak = 0, sum = 0; for (let i = 0; i < data.length; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; sum += data[i] * data[i]; }
    const out = { url: wavURL(data, rate), duration: data.length / rate, rate, samples: data.length, peak, rms: Math.sqrt(sum / Math.max(1, data.length)), text: t };
    cache.set(key, out); if (cache.size > 120) { const k = cache.keys().next().value; try { URL.revokeObjectURL(cache.get(k).url); } catch (e) { /* ok */ } cache.delete(k); }
    return out;
  }

  /* ---------- text prepared for listening ---------- */
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+', 'ⁿ': 'n' };
  const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
  const UNITS = [[/\bm\/s²|m\/s\^2|m s⁻²/g, 'metres per second squared'], [/\bm\/s\b/g, 'metres per second'], [/\bkm\/h\b/g, 'kilometres per hour'], [/\bN·m\b|\bN m\b/g, 'newton metres'], [/\bkg·m²|kg m²/g, 'kilogram metres squared'], [/\bm²/g, 'square metres'], [/\bm³/g, 'cubic metres'], [/\bcm³/g, 'cubic centimetres'], [/\bmmHg\b/g, 'millimetres of mercury'], [/\bmL\b/g, 'millilitres'], [/\bL\/min\b/g, 'litres per minute'], [/\bkHz\b/g, 'kilohertz'], [/\bMHz\b/g, 'megahertz'], [/\bGHz\b/g, 'gigahertz'], [/\bHz\b/g, 'hertz'], [/\bμC|µC\b/g, 'microcoulombs'], [/\bnC\b/g, 'nanocoulombs'], [/\bN\/C\b/g, 'newtons per coulomb'], [/\bkJ\b/g, 'kilojoules'], [/\bkW\b/g, 'kilowatts'], [/\brpm\b/g, 'revolutions per minute'], [/\brad\/s\b/g, 'radians per second'], [/°C\b/g, ' degrees Celsius'], [/°/g, ' degrees'], [/\bΩ|\bohms?\b/g, 'ohms'], [/(\d)\s?V\b/g, '$1 volts'], [/(\d)\s?A\b/g, '$1 amps'], [/(\d)\s?N\b/g, '$1 newtons'], [/(\d)\s?J\b/g, '$1 joules'], [/(\d)\s?W\b/g, '$1 watts'], [/(\d)\s?kg\b/g, '$1 kilograms'], [/(\d)\s?g\b(?!\s*=)/g, '$1 grams'], [/(\d)\s?cm\b/g, '$1 centimetres'], [/(\d)\s?mm\b/g, '$1 millimetres'], [/(\d)\s?km\b/g, '$1 kilometres'], [/(\d)\s?m\b/g, '$1 metres'], [/(\d)\s?s\b/g, '$1 seconds'], [/(\d)\s?T\b/g, '$1 tesla'], [/(\d)\s?K\b/g, '$1 kelvin'], [/(\d)\s?%/g, '$1 percent']];
  const SYM = [[/≤/g, ' is less than or equal to '], [/≥/g, ' is greater than or equal to '], [/≠/g, ' is not equal to '], [/≈/g, ' is approximately '], [/→/g, ' tends to '], [/⇒/g, ', so '], [/∞/g, ' infinity '], [/√\s*\(([^)]+)\)/g, ' the square root of $1 '], [/√\s*(\w+)/g, ' the square root of $1 '], [/∫/g, ' the integral of '], [/Σ/g, ' the sum of '], [/∂/g, ' partial '], [/∇/g, ' grad '], [/Δ/g, ' delta '], [/π/g, ' pi '], [/θ/g, ' theta '], [/φ/g, ' phi '], [/ω/g, ' omega '], [/λ/g, ' lambda '], [/μ/g, ' mu '], [/α/g, ' alpha '], [/β/g, ' beta '], [/γ/g, ' gamma '], [/ε/g, ' epsilon '], [/ρ/g, ' rho '], [/σ/g, ' sigma '], [/τ/g, ' tau '], [/×/g, ' times '], [/÷/g, ' divided by '], [/·/g, ' times '], [/±/g, ' plus or minus '], [/−/g, ' minus '], [/′/g, ' prime ']];
  function powers(t) { return t.replace(/\^\(?\s*2\s*\)?/g, ' squared').replace(/\^\(?\s*3\s*\)?/g, ' cubed').replace(/\^\(?\s*(-?\d+)\s*\)?/g, ' to the power $1').replace(/\^\(?\s*([a-z])\s*\)?/gi, ' to the power $1'); }
  function speechText(input) {
    let t = String(input || '');
    t = t.replace(/```[\s\S]*?```/g, ' (code is shown on screen) ').replace(/`([^`]+)`/g, '$1').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, ' ').replace(/^#+\s*/gm, '').replace(/^\s*[-*]\s+/gm, '').replace(/\*\*|__|\*|_/g, '').replace(/\\\(|\\\)|\\\[|\\\]|\$\$?/g, ' ');
    t = t.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 over $2').replace(/\\sqrt\{([^}]*)\}/g, ' the square root of $1 ').replace(/\\(cdot|times)/g, ' times ').replace(/\\([a-zA-Z]+)/g, ' $1 ').replace(/[{}]/g, '');
    t = t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ]+/g, m => '^' + [...m].map(c => SUP[c]).join('')).replace(/[₀₁₂₃₄₅₆₇₈₉]/g, c => ' ' + SUB[c]);
    UNITS.forEach(([re, w]) => { t = t.replace(re, w); });
    t = powers(t);
    t = t.replace(/\bsin\b/g, 'sine').replace(/\bcos\b/g, 'cos').replace(/\btan\b/g, 'tan').replace(/\bln\b/g, 'natural log').replace(/(\w)′\s*\(/g, '$1 prime of (');
    t = t.replace(/\b([a-zA-Z])\s*\(\s*([a-z])\s*\)/g, '$1 of $2').replace(/(\d)\s*\/\s*(\d)/g, '$1 over $2').replace(/\s=\s/g, ' equals ').replace(/\s\+\s/g, ' plus ').replace(/(\s|^)-\s(?=\d|[a-z])/g, '$1minus ').replace(/\s\/\s/g, ' divided by ');
    SYM.forEach(([re, w]) => { t = t.replace(re, w); });
    t = t.replace(/(\d),(\d{3})/g, '$1$2').replace(/(\d)\.(\d+)e([+-]?\d+)/gi, (m, a, b, e) => `${a} point ${b} times ten to the power ${+e}`).replace(/\s{2,}/g, ' ').trim();
    return t;
  }

  const api = { supported, load, synth, speechText, VOICES, RECOMMENDED, voice: id => VOICES.find(v => v.id === id) || null, status: () => ({ status, progress, err }), ready: () => !!tts, on: f => { subs.add(f); return () => subs.delete(f); }, model: MODEL, licence: 'Apache-2.0' };
  if (typeof module === 'object' && module.exports) module.exports = api; else { root.ERLY = root.ERLY || {}; root.ERLY.neuralVoice = api; }
})(typeof self !== 'undefined' ? self : this);
