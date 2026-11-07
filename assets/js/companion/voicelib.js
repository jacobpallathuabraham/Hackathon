/* ERLY — Noor's voice library.

   An original set of voice profiles (names, descriptions and delivery are
   ERLY's own — nothing is copied from any other product). Each profile is
   played by a REAL voice installed in the student's browser or device,
   chosen to fit its accent and character, plus its own pace and pitch.

   Honesty rules:
   - a profile is only offered when this device has a suitable voice for it;
   - two profiles never share the same underlying voice, so every choice
     really sounds different;
   - the card always says which device voice it uses.
   The best variety comes from Microsoft Edge (dozens of neural voices,
   including Indian, British, Australian and Gulf Arabic) and from Apple's
   downloadable Premium/Enhanced voices on iPad and Mac. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ERLY_VOICELIB = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const US = /^en[-_]US/i, GB = /^en[-_]GB/i, IN = /^en[-_]IN/i, AU = /^en[-_]AU/i, EN = /^en/i, GULF = /^ar[-_](AE|SA|QA|KW|BH|OM)/i, AR = /^ar/i;
  // id, name, gender, accent, languages wanted (best first), rate, pitch, expressiveness, en description, ar description, tags
  const P = [
    ['amber', 'Amber', 'f', 'American', [US, EN], 1.0, 1.03, 1.0, 'Warm and friendly — like a favourite tutor.', 'دافئة وودودة — كمعلمة مفضلة.', ['warm']],
    ['cedar', 'Cedar', 'm', 'American', [US, EN], 1.0, 1.0, 1.0, 'Warm and friendly, easy to listen to.', 'دافئ وودود وسهل الاستماع.', ['warm']],
    ['fern', 'Fern', 'f', 'British', [GB, EN], 0.93, 0.98, 0.8, 'Calm and soothing, unhurried.', 'هادئة ومريحة وغير مستعجلة.', ['calm']],
    ['harbor', 'Harbor', 'm', 'British', [GB, EN], 0.94, 0.96, 0.8, 'Calm and reassuring.', 'هادئ ومطمئن.', ['calm']],
    ['sol', 'Sol', 'f', 'American', [US, AU, EN], 1.07, 1.08, 1.25, 'Bright and energetic.', 'مشرقة ونشيطة.', ['energetic']],
    ['rio', 'Rio', 'm', 'American', [US, EN], 1.07, 1.05, 1.25, 'Energetic and expressive.', 'نشيط ومعبّر.', ['energetic']],
    ['iris', 'Iris', 'f', 'British', [GB, US, EN], 1.0, 1.0, 0.9, 'Professional and articulate.', 'مهنية وفصيحة.', ['professional']],
    ['rowan', 'Rowan', 'm', 'British', [GB, US, EN], 1.0, 0.98, 0.9, 'Professional and articulate.', 'مهني وفصيح.', ['professional']],
    ['atlas', 'Atlas', 'm', 'American', [US, GB, EN], 0.96, 0.9, 0.9, 'Deep and confident.', 'عميق وواثق.', ['deep']],
    ['mira', 'Mira', 'f', 'Australian', [AU, US, EN], 1.02, 1.02, 1.05, 'Natural and conversational.', 'طبيعية وحوارية.', ['conversational']],
    ['leo', 'Leo', 'm', 'American', [US, AU, EN], 1.04, 1.04, 1.1, 'Young and conversational.', 'شاب وحواري.', ['conversational']],
    ['clara', 'Clara', 'f', 'British', [GB, US, EN], 0.95, 1.0, 0.95, 'Gentle and educational — explains clearly.', 'لطيفة وتعليمية — تشرح بوضوح.', ['educational']],
    ['theo', 'Theo', 'm', 'British', [GB, US, EN], 0.95, 0.98, 0.95, 'Gentle and educational.', 'لطيف وتعليمي.', ['educational']],
    ['willow', 'Willow', 'f', 'American', [US, GB, EN], 0.97, 1.04, 1.35, 'Expressive storyteller.', 'راوية معبّرة.', ['storytelling']],
    ['meera', 'Meera', 'f', 'Indian English', [IN], 0.98, 1.0, 1.0, 'Natural Indian English — clear and warm.', 'إنجليزية هندية طبيعية — واضحة ودافئة.', ['regional']],
    ['arjun', 'Arjun', 'm', 'Indian English', [IN], 0.98, 1.0, 1.0, 'Natural Indian English — friendly and clear.', 'إنجليزية هندية طبيعية — ودود وواضح.', ['regional']],
    ['matilda', 'Matilda', 'f', 'Australian', [AU], 1.0, 1.02, 1.0, 'Australian English, relaxed and friendly.', 'إنجليزية أسترالية، مرتاحة وودودة.', ['regional']],
    ['kai', 'Kai', 'm', 'Australian', [AU], 1.0, 1.0, 1.0, 'Australian English, easy-going.', 'إنجليزية أسترالية، هادئ الطباع.', ['regional']],
    ['noura', 'Noura', 'f', 'Gulf Arabic', [GULF], 0.97, 1.0, 1.0, 'Gulf Arabic — warm and clear.', 'عربية خليجية — دافئة وواضحة.', ['arabic']],
    ['fahd', 'Fahd', 'm', 'Gulf Arabic', [GULF], 0.97, 0.98, 1.0, 'Gulf Arabic — calm and friendly.', 'عربية خليجية — هادئ وودود.', ['arabic']],
    ['lina', 'Lina', 'f', 'Arabic (MSA / Egyptian)', [/^ar[-_](EG|JO|LB|SY|MA|TN|DZ)/i, AR], 0.97, 1.02, 1.0, 'Arabic — bright and articulate.', 'عربية — مشرقة وفصيحة.', ['arabic']],
    ['sami', 'Sami', 'm', 'Arabic (MSA / Egyptian)', [/^ar[-_](EG|JO|LB|SY|MA|TN|DZ)/i, AR], 0.96, 0.97, 1.0, 'Arabic — steady and clear.', 'عربية — ثابت وواضح.', ['arabic']]
  ].map(([id, name, g, accent, langs, rate, pitch, expr, en, ar, tags]) => ({ id, name, g, accent, langs, rate, pitch, expr, en, ar, tags, lang: tags.includes('arabic') ? 'ar' : 'en' }));

  // assign each profile a different real voice; returns [{ profile, voice }] and the unavailable ones
  function resolve(voices, opts) {
    opts = opts || {};
    const score = opts.score || (() => 0);
    const gender = opts.gender || (() => '');
    const used = new Set(), out = [], missing = [];
    // regional voices first so general profiles don't take them
    const order = P.slice().sort((a, b) => (b.tags.includes('regional') || b.tags.includes('arabic') ? 1 : 0) - (a.tags.includes('regional') || a.tags.includes('arabic') ? 1 : 0));
    order.forEach(p => {
      let pick = null;
      for (let li = 0; li < p.langs.length && !pick; li++) {
        const cands = voices.filter(v => p.langs[li].test(v.lang || '') && !used.has(v.name) && gender(v) === p.g);
        cands.sort((a, b) => score(b) - score(a));
        pick = cands[0] || null;
      }
      if (pick) { used.add(pick.name); out.push({ profile: p, voice: pick }); } else missing.push(p);
    });
    out.sort((a, b) => P.indexOf(a.profile) - P.indexOf(b.profile));
    return { available: out, missing };
  }
  return { profiles: P, resolve, get: id => P.find(p => p.id === id) || null };
});
