/* ERLY — expressive speech: what each sentence should sound like, and text
   that reads well aloud.

   Browser voices (Web Speech) accept rate, pitch and volume per utterance,
   and ERLY controls the pauses between phrases. So emotion is expressed the
   way people do it with the same voice: a little faster and brighter when
   happy, slower and softer when reassuring, a beat of silence before a
   thoughtful point. The tone is chosen from what the sentence says and from
   the conversation (a student who says they're confused gets a calmer,
   slower answer) — never from the student's voice, face or accent. Changes
   are deliberately small: expressive, not theatrical.

   speechify() turns written text into speakable text (dates, units, symbols,
   maths, abbreviations, the student's own pronunciations) without changing
   its meaning. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_PROSODY = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // rate, pitch, volume multipliers and extra pause after the sentence (ms)
  const TONE = {
    neutral: [1, 1, 1, 0], happy: [1.04, 1.06, 1, 40], excited: [1.07, 1.1, 1, 40], enthusiastic: [1.06, 1.09, 1, 40],
    curious: [1.0, 1.05, 1, 60], surprised: [1.02, 1.12, 1, 80], empathetic: [0.91, 0.96, 0.9, 160], sympathetic: [0.9, 0.95, 0.88, 180],
    reassuring: [0.93, 0.98, 0.94, 130], calm: [0.94, 0.98, 0.94, 100], confident: [1.0, 0.99, 1, 30], thoughtful: [0.94, 0.97, 0.95, 170],
    serious: [0.95, 0.95, 1, 120], encouraging: [1.02, 1.05, 1, 60], playful: [1.04, 1.07, 1, 50]
  };
  const CUES = [
    ['enthusiastic', /\b(congrat\w*|well done|great job|nice work|amazing|awesome|fantastic|brilliant|you did it|proud of you|that's huge|incredible)\b|مبروك|أحسنت|رائع/i],
    ['empathetic', /\b(sorry (to hear|that)|that sounds (really |so |very |pretty )?(hard|tough|difficult|stressful|frustrating|overwhelming|exhausting)|that must (be|have)|i understand|it's (okay|ok|normal|understandable) to|you're not alone|that's a lot)\b|أتفهم|آسفة/i],
    ['reassuring', /\b(don't worry|no worries|it's okay|it's fine|you've got this|take your time|step by step|we can (do|work)|no rush|that's completely normal)\b|لا تقلق|خذ وقتك/i],
    ['serious', /\b(important|warning|careful|be sure to|must not|never|emergency|999|deadline|plagiarism|danger)\b|مهم|تحذير|طوارئ/i],
    ['surprised', /^(wow|whoa|oh!|oh wow)\b|\b(believe it or not|surprisingly|it turns out|amazingly)\b/i],
    ['playful', /\b(haha|ha ha|just kidding|fun fact|plot twist)\b|😄|😂/i],
    ['encouraging', /\b(you can do|keep going|give it a try|let's (try|do|go)|try (this|it)|you're (close|almost)|good question|great question)\b|هيا|حاول/i],
    ['thoughtful', /\b(i think|perhaps|probably|it depends|on the other hand|not sure|might|one way to see)\b|ربما|أعتقد/i],
    ['curious', /\?$|\b(interesting(ly)?|imagine|what if|have you ever|did you know)\b|هل تعلم|تخيل/i],
    ['confident', /\b(because|which means|so the|the answer is|equals|for example|first|second|then|finally|in short)\b|لأن|مثلاً|أولاً/i]
  ];
  const CONFUSED = /\b(i don'?t (get|understand)|confus\w*|lost|makes no sense|what\?|huh|explain (it )?again|too (hard|complicated))\b|لم أفهم|لا أفهم|محتار/i;
  const CELEBRATE = /\b(i (did it|passed|finished|got (an? )?(a|b|\d+))|we won|i made it|finally done|aced)\b|نجحت|خلصت/i;
  const SAD = /\b(stressed|anxious|overwhelmed|sad|tired|exhausted|failed|struggling|worried)\b|متوتر|قلق|تعبان/i;

  // the tone of one sentence, given what the student last said
  function classify(sentence, ctx) {
    const s = String(sentence || '').trim();
    ctx = ctx || {};
    const user = String(ctx.user || '');
    if (ctx.first && CELEBRATE.test(user)) return 'enthusiastic';
    for (const [tone, re] of CUES) if (re.test(s)) {
      if (tone === 'confident' && CONFUSED.test(user)) return 'reassuring';
      return tone;
    }
    if (/!$/.test(s)) return 'happy';
    if (CONFUSED.test(user)) return 'calm';
    if (SAD.test(user)) return 'reassuring';
    return 'neutral';
  }
  // voice settings for a tone, scaled by how expressive the student wants Noor to be (0 … 1.5)
  function prosody(tone, expressiveness) {
    const e = expressiveness == null ? 1 : expressiveness;
    const t = TONE[tone] || TONE.neutral;
    return { rate: 1 + (t[0] - 1) * e, pitch: 1 + (t[1] - 1) * e, volume: Math.min(1, 1 + (t[2] - 1) * e), pause: Math.round(t[3] * e) };
  }

  /* ---------------- speech formatting ---------------- */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const UNITS = [[/(\d)\s?km\/h\b/g, '$1 kilometres per hour'], [/(\d)\s?m\/s²/g, '$1 metres per second squared'], [/(\d)\s?m\/s\b/g, '$1 metres per second'], [/(\d)\s?°C\b/g, '$1 degrees Celsius'], [/(\d)\s?°F\b/g, '$1 degrees Fahrenheit'], [/(\d)\s?°/g, '$1 degrees'],
    [/(\d)\s?km\b/g, '$1 kilometres'], [/(\d)\s?cm\b/g, '$1 centimetres'], [/(\d)\s?mm\b/g, '$1 millimetres'], [/(\d)\s?kg\b/g, '$1 kilograms'], [/(\d)\s?mg\b/g, '$1 milligrams'], [/(\d)\s?ml\b/gi, '$1 millilitres'], [/(\d)\s?kWh\b/g, '$1 kilowatt hours'], [/(\d)\s?kW\b/g, '$1 kilowatts'], [/(\d)\s?MW\b/g, '$1 megawatts'], [/(\d)\s?GB\b/g, '$1 gigabytes'], [/(\d)\s?MB\b/g, '$1 megabytes'], [/(\d)\s?Hz\b/g, '$1 hertz'], [/(\d)\s?mol\b/g, '$1 moles'], [/(\d)\s?AED\b/g, '$1 dirhams'], [/\bAED\s?(\d)/g, '$1 dirhams']];
  const ABBR = [[/\bDr\.\s/g, 'Doctor '], [/\bProf\.\s/g, 'Professor '], [/\bapprox\.\s?/gi, 'approximately '], [/\bvs\.?\s/gi, 'versus '], [/\bFig\.\s?/g, 'figure '], [/\bNo\.\s?(\d)/g, 'number $1'], [/\bmins?\b/g, 'minutes'], [/\bhrs?\b/g, 'hours'], [/\bw\/o\b/g, 'without'], [/\bw\/\s/g, 'with '], [/\betc\.?/g, 'and so on']];
  const SYMS = [[/≈/g, ' approximately '], [/≠/g, ' is not equal to '], [/≤/g, ' is less than or equal to '], [/≥/g, ' is greater than or equal to '], [/±/g, ' plus or minus '], [/÷/g, ' divided by '], [/√\s?\(?/g, ' the square root of '], [/π/g, ' pi '], [/Δ/g, ' delta '], [/∞/g, ' infinity '], [/→|⟶|⇒/g, ' gives '], [/⇌/g, ' is in equilibrium with '], [/²/g, ' squared'], [/³/g, ' cubed'], [/\^2\b/g, ' squared'], [/\^3\b/g, ' cubed'], [/\^(\d+)/g, ' to the power of $1'], [/(\w)\s?=\s?(\w)/g, '$1 equals $2'], [/(\d)\s?\/\s?(\d)/g, '$1 over $2']];

  // text → speakable text. dict = [{ word, say }] from the student
  function speechify(text, lang, dict) {
    let t = String(text || '');
    (dict || []).forEach(d => { if (d && d.word && d.say) t = t.replace(new RegExp('\\b' + d.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), d.say); });
    if (lang === 'ar') return t;
    t = t.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m, y, mo, d) => (+mo >= 1 && +mo <= 12) ? `${+d} ${MONTHS[+mo - 1]} ${y}` : m);
    t = t.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (m, d, mo, y) => (+mo >= 1 && +mo <= 12) ? `${+d} ${MONTHS[+mo - 1]} ${y}` : m); // UAE order: day/month/year
    t = t.replace(/\b(\d+)\s?[-–]\s?(\d+)\b(?!\s?[-–]\d)/g, '$1 to $2');
    UNITS.forEach(([re, to]) => { t = t.replace(re, to); });
    ABBR.forEach(([re, to]) => { t = t.replace(re, to); });
    SYMS.forEach(([re, to]) => { t = t.replace(re, to); });
    return t.replace(/\s{2,}/g, ' ');
  }
  // split a reply into sentences (keeps the punctuation for natural phrasing)
  function sentences(text) {
    return (String(text || '').match(/[^.!?؟]+[.!?؟]*["')\]]*\s*/g) || []).map(s => s.trim()).filter(Boolean);
  }
  return { classify, prosody, speechify, sentences, TONE, tones: Object.keys(TONE) };
});
