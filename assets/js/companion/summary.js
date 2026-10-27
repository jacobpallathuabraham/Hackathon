/* ERLY AI Reading Companion — Layer 6: the student-facing summary.

   Built from the typed conversation entries, the measured signals and the
   Reading Lab, in plain language, with fixed sections. The student can edit
   every line before keeping, copying or downloading it; nothing is sent
   anywhere. A diagnostic-wording check runs on the generated text (the
   student's own edits are theirs). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_SUMMARY = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SECTIONS = [
    ['observed', 'What ERLY observed', 'ما لاحظه إيرلي'],
    ['reported', 'What you reported', 'ما أخبرتنا به'],
    ['context', 'Possible context', 'سياق محتمل'],
    ['tried', 'Tools tried', 'الأدوات التي جرّبتها'],
    ['helpful', 'What seemed helpful', 'ما بدا مفيداً'],
    ['limitations', 'Limitations', 'حدود هذا الملخص'],
    ['next', 'Optional next steps', 'خطوات تالية اختيارية']
  ];
  const BANNED = /dyslexi|adhd|attention[- ]deficit|disorder|diagnos|disabilit|dyscalcul|dysgraph|autis|probabilit|likelihood|\b\d{1,3}\s?%|عسر القراءة|اضطراب|إعاقة/i;

  // short context for each answer, so “yes” still makes sense when read later
  const QLABEL = {
    why_return: ['Why you went back', 'سبب العودة'], open_general: ['How the reading was going', 'كيف كانت القراءة'], clarify: ['Place or meaning', 'المكان أم المعنى'],
    zoom_why: ['Why the zoom/text changed', 'سبب تغيير التكبير/النص'], tts_why: ['Why you listen', 'سبب الاستماع'], env: ['Your setup', 'محيطك'],
    scope: ['Other documents too?', 'مستندات أخرى أيضاً؟'], lang: ['Which language', 'أي لغة'], crowded_q: ['Page feels crowded?', 'الصفحة مزدحمة؟'],
    outside: ['Outside this website?', 'خارج هذا الموقع؟'], situational: ['Tired, distracted or rushed?', 'متعب أو مشتت أو مستعجل؟'],
    broader: ['Broader questions?', 'أسئلة أوسع؟'], anything_else: ['Anything else?', 'شيء آخر؟']
  };
  const LAB_LABEL = { spacing: ['Extra spacing', 'تباعد إضافي'], font: ['Reading-friendly font', 'خط مريح'], bigger: ['Bigger text', 'نص أكبر'], highlight: ['Line highlight', 'إبراز السطر'], listen: ['Listening along', 'الاستماع أثناء القراءة'], tint: ['Softer page colour', 'لون صفحة ألطف'] };

  function signalLine(s) {
    if (!s.available) return [`${s.id === 'pan' ? 'Sideways panning' : s.id}: not available in this reader.`, `${s.id === 'pan' ? 'التحريك الجانبي' : s.id}: غير متاح في هذا القارئ.`];
    const base = s.compared === 'no-baseline' ? [' (no personal baseline yet)', ' (لا يوجد خط أساس شخصي بعد)'] : s.compared === 'above' ? [' — more than your usual', ' — أكثر من المعتاد لك'] : [' — within your usual range', ' — ضمن نطاقك المعتاد'];
    if (s.id === 'regression') return s.value ? [`Returned to an earlier section ${s.value} time${s.value === 1 ? '' : 's'}${base[0]}.`, `العودة إلى قسم سابق ${s.value} مرة${base[1]}.`] : null;
    if (s.id === 'zoom') return s.value ? [`Changed zoom ${s.value} time${s.value === 1 ? '' : 's'}${base[0]}.`, `تغيير التكبير ${s.value} مرة${base[1]}.`] : null;
    if (s.id === 'pan') return s.value ? [`Panned sideways ${s.value} time${s.value === 1 ? '' : 's'}${base[0]}.`, `التحريك الجانبي ${s.value} مرة${base[1]}.`] : null;
    if (s.id === 'format') return s.value ? [`Changed text settings ${s.value} time${s.value === 1 ? '' : 's'}${base[0]}.`, `تغيير إعدادات النص ${s.value} مرة${base[1]}.`] : null;
    if (s.id === 'tts') return s.value ? [`Used read-aloud ${s.value} time${s.value === 1 ? '' : 's'} (a tool, not a sign of anything).`, `استخدام القراءة الصوتية ${s.value} مرة (أداة، وليست علامة على شيء).`] : null;
    if (s.id === 'session') return [`Read for about ${Math.max(1, Math.round(s.minutes))} minute${Math.round(s.minutes) > 1 ? 's' : ''}.`, `القراءة لنحو ${Math.max(1, Math.round(s.minutes))} دقيقة.`];
    return null;
  }

  // build({ entries, signals, lab, lang }) -> { id, created, sections: { key: [lines] } }
  function build(input) {
    const lang = input.lang === 'ar' ? 1 : 0;
    const pick = pair => pair[lang];
    const out = {}; SECTIONS.forEach(([k]) => { out[k] = []; });
    const entries = input.entries || [];
    (input.signals || []).forEach(s => { const l = signalLine(s); if (l) out.observed.push(pick(l)); });
    entries.filter(e => e.type === 'observation').forEach(e => { const t = lang ? e.ar : e.en; if (!out.observed.includes(t)) out.observed.push(t); });
    entries.filter(e => e.type === 'report' && e.data && !/^(offer:|check_helped|tts_helps)/.test(e.data.question || '') && !(e.data.intents || []).some(i => i === 'stop' || i === 'skip')).forEach(e => {
      const q = QLABEL[e.data.question];
      out.reported.push((q ? pick(q) + ': ' : '') + '“' + (lang ? e.ar : e.en) + '”');
    });
    entries.filter(e => e.type === 'interpretation').forEach(e => out.context.push(lang ? e.ar : e.en));
    const talked = entries.filter(e => e.type === 'interview').map(e => lang ? e.ar : e.en); // careful screening wording from interview.js
    entries.filter(e => e.type === 'tried').forEach(e => out.tried.push(lang ? e.ar : e.en));
    entries.filter(e => e.type === 'recommendation').forEach(e => out.helpful.push(lang ? e.ar : e.en));
    if (input.lab && input.lab.ratings) {
      const easier = Object.keys(input.lab.ratings).filter(k => input.lab.ratings[k] === 'easier');
      if (easier.length) out.helpful.push(pick([`In the Reading Lab you said these felt easier: ${easier.map(k => (LAB_LABEL[k] || [k])[0]).join(', ')} (preferences, not a test result).`, `في مختبر القراءة قلت إن هذه بدت أسهل: ${easier.map(k => (LAB_LABEL[k] || [k, k])[1]).join('، ')} (تفضيلات، وليست نتيجة اختبار).`]));
    }
    if (!out.reported.length) out.reported.push(pick(['You didn’t share anything in a conversation this time.', 'لم تشارك شيئاً في محادثة هذه المرة.']));
    if (!out.context.length) out.context.push(pick(['Not enough information to suggest a context.', 'لا توجد معلومات كافية لاقتراح سياق.']));
    if (!out.tried.length) out.tried.push(pick(['None yet.', 'لا شيء بعد.']));
    if (!out.helpful.length) out.helpful.push(pick(['Not known yet.', 'غير معروف بعد.']));
    out.limitations.push(
      pick(['This is not a diagnosis or a clinical assessment, and it can’t confirm or rule out any condition.', 'هذا ليس تشخيصاً ولا تقييماً سريرياً، ولا يمكنه تأكيد أي حالة أو نفيها.']),
      pick(['ERLY only sees how you used this reader (scrolling, zoom, settings, read-aloud). It does not measure eye movement, attention, comprehension or reading accuracy.', 'يرى إيرلي فقط كيف استخدمت هذا القارئ (التمرير والتكبير والإعدادات والقراءة الصوتية). ولا يقيس حركة العين أو الانتباه أو الفهم أو دقة القراءة.']),
      pick(['Thresholds are starting values for this prototype, not clinically validated. Tiredness, a small screen or a hard topic can explain the same patterns.', 'العتبات قيم أولية لهذا النموذج وليست معتمدة سريرياً. التعب أو شاشة صغيرة أو موضوع صعب قد يفسر الأنماط نفسها.'])
    );
    entries.filter(e => e.type === 'referral').forEach(e => out.next.push(lang ? e.ar : e.en));
    out.next.push(pick(['Keep the tools that helped switched on — they’re saved on this device only.', 'أبقِ الأدوات التي ساعدتك مفعّلة — فهي محفوظة على هذا الجهاز فقط.']));
    if (!entries.some(e => e.type === 'referral')) out.next.push(pick(['If reading keeps feeling harder than you’d like, you can self-refer to Student Accessibility Services at any time. That’s always your choice.', 'إذا استمرت القراءة أصعب مما تريد، يمكنك التواصل بنفسك مع خدمات الطلبة في أي وقت. هذا قرارك دائماً.']));
    // safety net on generated text (the fixed limitation lines name what ERLY is NOT, so they're exempt)
    Object.keys(out).forEach(k => { if (k === 'limitations') return; out[k] = out[k].filter(line => !BANNED.test(line) || /^“/.test(line)); });
    if (talked.length) out.context = out.context.filter(l => !/Not enough information to suggest|لا توجد معلومات كافية لاقتراح/.test(l));
    talked.forEach(t => out.context.unshift(t)); // added after the wording filter: it names what to explore, never a verdict
    return { id: 's' + Date.now().toString(36), created: new Date().toISOString(), lang: lang ? 'ar' : 'en', sections: out };
  }

  function toText(sum) {
    const lang = sum.lang === 'ar' ? 2 : 1;
    const head = lang === 2 ? 'ملخص القراءة من إيرلي — للطالب فقط' : 'ERLY reading summary — for the student';
    const lines = [head, (lang === 2 ? 'أُنشئ: ' : 'Created: ') + new Date(sum.created).toLocaleString(), ''];
    SECTIONS.forEach(s => {
      lines.push(s[lang].toUpperCase());
      (sum.sections[s[0]] || []).forEach(l => lines.push('• ' + l));
      lines.push('');
    });
    lines.push(lang === 2 ? 'إيرلي يحدد الاحتكاك ويدعم الطلبة. لا يشخّص أي إعاقة أبداً.' : 'ERLY identifies friction and supports students. It never diagnoses disability.');
    return lines.join('\n');
  }
  return { build, toText, SECTIONS, BANNED };
});
