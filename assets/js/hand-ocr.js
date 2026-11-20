/* ERLY — Handwriting Studio recognition service (v22). One interface, replaceable engines:

     recognize(canvas, { lang, engine, onProgress }) → { engine, text, conf, words:[{text, conf}], lines:[{text, conf, suspect}], ms }

   Engines (both run IN THIS PAGE — the image is never uploaded):
     'trocr'     TrOCR-small-handwritten via transformers.js (assets/js/hand-rec.js). Trained on English handwriting.
                 Its model files (~64 MB) are DOWNLOADED from Hugging Face the first time, and only after the student
                 agrees; they are cached by the browser. Measured on 150 real IAM handwritten lines: 15.2% CER per
                 line, 6.5% on 3-line pages (docs/bench/handwriting-bench.md).
     'tesseract' Tesseract 5, vendored in this site (assets/vendor/tesseract). Built for printed text; much weaker on
                 handwriting (50% CER on the same IAM lines) but it has Arabic.
   Confidence values are the engine's own (per word), never invented. Arabic uses Tesseract and is labelled
   experimental. A new engine only needs to implement the same recognize() shape and register itself here. */
(function () {
  'use strict';
  const VENDOR = 'assets/vendor/tesseract/';
  const HW = () => window.ERLY_HAND;
  let worker = null, workerLang = null;
  function loadScript(src) { return new Promise((res, rej) => { if (window.Tesseract) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }

  const ENGINES = {
    trocr: {
      id: 'trocr', label: ['Handwriting model (TrOCR)', 'نموذج الكتابة اليدوية (TrOCR)'], langs: ['en'], needsDownload: true, sizeMB: 64,
      available: () => !!(window.ERLY.handRec && ERLY.handRec.supported && ERLY.handRec.supported()),
      ready: () => !!(window.ERLY.handRec && ERLY.handRec.ready()),
      load: p => ERLY.handRec.load(p),
      async recognize(canvas, o) {
        const r = await ERLY.handRec.readPage(canvas, o.onProgress);
        return { text: r.text, conf: r.conf, words: r.words.map(w => ({ text: w.text, conf: Math.round(w.conf) })), lines: r.lines.map(l => ({ text: l.text, conf: l.conf, suspect: !!l.suspect })) };
      }
    },
    tesseract: {
      id: 'tesseract', label: ['Quick reader (Tesseract)', 'القارئ السريع (Tesseract)'], langs: ['en', 'ar'], needsDownload: false,
      available: () => typeof WebAssembly === 'object', ready: () => true, load: () => Promise.resolve(true),
      async recognize(canvas, o) {
        await loadScript(VENDOR + 'tesseract.min.js');
        const lang = o.lang === 'ar' ? 'ara' : 'eng';
        if (!worker || workerLang !== lang) { if (worker) await worker.terminate(); worker = await Tesseract.createWorker(lang, 1, { workerPath: VENDOR + 'worker.min.js', corePath: VENDOR + 'core', langPath: VENDOR + 'lang', gzip: true, workerBlobURL: false, logger: m => { if (m.progress != null && o.onProgress && /recogn/.test(m.status || '')) o.onProgress(m.progress); } }); workerLang = lang; }
        // prepared copy: grey, levelled, binarised, scaled to the size Tesseract reads best (the original is untouched)
        const H = HW(), d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height), img = { gray: H.toGray(d.data, canvas.width, canvas.height), width: canvas.width, height: canvas.height };
        const q = H.quality(img), prep = H.prepare(img, o.deskew ? q.stats.skew : 0, { source: true, uneven: q.stats.uneven > 0.2, letterHeight: q.stats.letterHeight });
        const c = document.createElement('canvas'); c.width = prep.width; c.height = prep.height; const id = c.getContext('2d').createImageData(prep.width, prep.height);
        for (let i = 0; i < prep.gray.length; i++) { const v = prep.gray[i]; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
        c.getContext('2d').putImageData(id, 0, 0);
        const { data } = await worker.recognize(c, {}, { text: true, blocks: true });
        const lines = (data.blocks || []).flatMap(b => b.paragraphs || []).flatMap(p => p.lines || []);
        const words = lines.flatMap(l => l.words || []).map(w => ({ text: String(w.text || '').trim(), conf: Math.round(w.confidence || 0) })).filter(w => w.text);
        return { text: (data.text || '').trim(), conf: Math.round(data.confidence || 0), words, lines: lines.map(l => ({ text: String(l.text || '').trim(), conf: Math.round(l.confidence || 0) })) };
      }
    }
  };

  // which engine to use: the student's choice, else the best available for the language
  function pick(lang, choice) {
    if (choice && ENGINES[choice] && ENGINES[choice].langs.includes(lang)) return ENGINES[choice];
    if (lang === 'en' && ENGINES.trocr.available() && ENGINES.trocr.ready()) return ENGINES.trocr;
    return ENGINES.tesseract;
  }
  async function recognize(canvas, o) {
    o = Object.assign({ lang: 'en' }, o || {}); const E = pick(o.lang, o.engine), t0 = performance.now();
    const r = await E.recognize(canvas, o);
    return Object.assign({ engine: E.id, ms: Math.round(performance.now() - t0) }, r);
  }
  // per-word flags from the engine's own confidence: ≥80 sure, 50–79 uncertain, <50 unreadable
  const flag = c => (c >= 80 ? 'ok' : c >= 50 ? 'uncertain' : 'low');
  async function stop() { if (worker) { await worker.terminate(); worker = null; workerLang = null; } }
  window.ERLY = window.ERLY || {};
  window.ERLY.handOCR = { ENGINES, pick, recognize, flag, stop, register: (id, engine) => { ENGINES[id] = engine; } };
})();
