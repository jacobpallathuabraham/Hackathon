'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../../assets/js/companion/dialogue.js');
const Sum = require('../../assets/js/companion/summary.js');

const obs = [{ id: 'regression', count: 3, label: 'page 1, paragraph 2' }];
const conv = (signal, extra) => { const c = D.create(Object.assign({ trigger: { type: 'invite', signal }, observations: signal === 'regression' ? obs : [] }, extra)); const first = D.start(c); return { c, first }; };
const chip = id => ({ chip: id, label: id });
const allText = c => c.turns.map(t => t.en + ' ' + t.ar).join(' ') + ' ' + c.entries.map(e => e.en + ' ' + e.ar).join(' ');

test('classify understands free text in English and Arabic', () => {
  assert.ok(D.classify('I kept losing my place').includes('lost_place'));
  assert.ok(D.classify('the words were too technical').includes('vocab'));
  assert.ok(D.classify('I was just checking something on purpose').includes('intentional'));
  assert.ok(D.classify('The text looks blurry').includes('blurry'));
  assert.ok(D.classify('أضعت مكاني في السطر').includes('lost_place'));
  assert.ok(D.classify('كنت متعب جداً').includes('tired'));
  assert.ok(D.classify('both').includes('lang_both'));
  assert.deepEqual(D.classify('it didn’t help').filter(x => x === 'helped'), []);
});

test('scroll regression opens with a non-leading “why did you go back” question and shows the observation', () => {
  const { c, first } = conv('regression');
  assert.equal(first.qid, 'why_return');
  assert.match(first.en, /not a doctor/);
  assert.match(first.en, /returned to page 1, paragraph 2 3 times/);
  assert.equal(c.entries[0].type, 'observation');
});

test('zoom / format friction asks about small, crowded, blurry or tracking', () => {
  assert.equal(conv('zoom').first.qid, 'zoom_why');
  assert.equal(conv('format').first.qid, 'zoom_why');
});

test('intentional navigation is accepted as not friction and the chat ends quickly', () => {
  const { c } = conv('regression');
  const t = D.answer(c, 'I was just checking a detail on purpose');
  assert.equal(t.qid, 'anything_else');
  const end = D.answer(c, chip('no'));
  assert.equal(end.done, true);
  assert.equal(c.conclusion, 'intentional');
  assert.ok(c.entries.some(e => e.type === 'interpretation' && /not reading friction/.test(e.en)));
  assert.ok(!c.entries.some(e => e.type === 'referral'));
});

test('lost place -> place-keeping tools -> did it help -> context questions', () => {
  const { c } = conv('regression');
  const offer = D.answer(c, 'I lost my place');
  assert.equal(offer.kind, 'offer');
  assert.deepEqual(offer.chips.map(x => x.id).slice(0, 3), ['tool:focus', 'tool:spacing', 'tool:tts']);
  const act = D.answer(c, chip('tool:focus'));
  assert.deepEqual(act.actions, [{ type: 'support', tool: 'focus' }]);
  assert.equal(act.follow.qid, 'check_helped');
  const scope = D.answer(c, chip('helped'));
  assert.equal(scope.qid, 'scope');
  assert.deepEqual(c.tried, [{ tool: 'focus', helped: 1 }]);
});

test('a tool that did not help leads to a different one', () => {
  const { c } = conv('regression');
  D.answer(c, 'I lost my place'); D.answer(c, chip('tool:focus'));
  const alt = D.answer(c, chip('not_helped'));
  assert.equal(alt.kind, 'offer');
  assert.ok(!alt.chips.some(x => x.id === 'tool:focus'));
});

test('vocabulary difficulty offers terms and is explicitly not a sign of a reading difficulty', () => {
  const { c } = conv('regression');
  const o = D.answer(c, 'there were a lot of unfamiliar words');
  assert.equal(o.group, 'vocab');
  assert.ok(c.entries.some(e => e.type === 'interpretation' && /doesn’t suggest a reading difficulty/.test(e.en)));
});

test('blurry text asks about screen, lighting and fatigue first', () => {
  const { c } = conv('zoom');
  assert.equal(D.answer(c, chip('blurry')).qid, 'env');
});

test('read-aloud is a preference, never evidence', () => {
  const { c, first } = conv('tts');
  assert.equal(first.qid, 'tts_why');
  const t = D.answer(c, chip('audio_preference'));
  assert.equal(t.qid, 'tts_helps');
  D.answer(c, chip('helped'));
  assert.ok(c.entries.some(e => e.type === 'interpretation' && /learning preference/.test(e.en)));
  assert.ok(!c.entries.some(e => e.type === 'referral'));
});

test('situational explanations are considered and no referral is made from one session', () => {
  const { c } = conv('regression');
  D.answer(c, 'honestly I am just really tired today');
  D.answer(c, chip('tool:break'));
  let t = D.answer(c, chip('helped'));
  while (t && !t.done) t = D.answer(c, chip('no'));
  assert.ok(c.entries.some(e => e.type === 'interpretation' && /situational/.test(e.en)));
  assert.ok(!c.entries.some(e => e.type === 'referral'));
});

test('a referral is only suggested when the student reports it across documents and contexts', () => {
  const { c } = conv('regression');
  D.answer(c, 'I keep losing my place'); D.answer(c, chip('decline'));
  assert.equal(c.current, 'scope');
  D.answer(c, chip('other_docs'));
  D.answer(c, chip('lang_both'));
  D.answer(c, chip('yes'));     // crowded
  D.answer(c, chip('yes'));     // outside the website
  let t = D.answer(c, chip('no')); // not tired etc.
  while (t && !t.done) t = D.answer(c, chip('no'));
  const ref = c.entries.find(e => e.type === 'referral');
  assert.ok(ref, 'referral offered');
  assert.match(ref.en, /your choice/i);
});

test('mainly this document: no referral', () => {
  const { c } = conv('regression');
  D.answer(c, 'I keep losing my place'); D.answer(c, chip('decline'));
  let t = D.answer(c, chip('this_doc'));
  while (t && !t.done) t = D.answer(c, chip('no'));
  assert.ok(!c.entries.some(e => e.type === 'referral'));
});

test('unclear answers end with “not enough information”', () => {
  const { c } = conv('regression');
  D.answer(c, 'hmm');
  const t = D.answer(c, 'whatever');
  assert.equal(t.done, true);
  assert.equal(c.conclusion, 'insufficient');
  assert.ok(c.entries.some(e => /enough information/.test(e.en)));
});

test('the student can skip and stop at any time', () => {
  let { c } = conv('regression');
  assert.equal(D.answer(c, chip('skip')).qid, 'open_general');
  assert.equal(D.answer(c, chip('skip')).done, true);
  ({ c } = conv('regression'));
  const t = D.answer(c, 'stop');
  assert.equal(t.done, true); assert.equal(c.conclusion, 'stopped');
});

test('not every question is asked, and never more than the maximum', () => {
  const { c } = conv('regression');
  let t = D.answer(c, 'I lost my place'); t = D.answer(c, chip('decline'));
  while (t && !t.done) t = D.answer(c, chip('unsure'));
  assert.ok(c.questionsAsked <= D.MAX_QUESTIONS);
  assert.ok(c.asked.length < Object.keys(D.Q).length);
});

test('entries keep observations, reports, interpretations, recommendations and referrals apart', () => {
  const { c } = conv('regression');
  D.answer(c, 'I lost my place'); D.answer(c, chip('tool:focus')); D.answer(c, chip('helped'));
  let t = D.answer(c, chip('other_docs')); t = D.answer(c, chip('lang_both')); t = D.answer(c, chip('yes')); t = D.answer(c, chip('yes'));
  while (t && !t.done) t = D.answer(c, chip('no'));
  const types = new Set(c.entries.map(e => e.type));
  ['observation', 'report', 'tried', 'interpretation', 'recommendation', 'referral'].forEach(x => assert.ok(types.has(x), x));
  c.entries.filter(e => e.type === 'interpretation').forEach(e => assert.match(e.en, /may|looks like|isn’t|not enough|preference|doesn’t/i));
});

test('no path ever produces a disability label or a probability', () => {
  const answers = ['I lost my place', 'words', 'blurry', 'tired', 'on purpose', 'hmm', 'both', 'yes', 'no', 'other documents', 'not really', 'skip', 'I prefer listening'];
  ['regression', 'zoom', 'format', 'tts', undefined].forEach(sig => {
    for (let seed = 0; seed < 40; seed++) {
      const c = D.create({ trigger: sig ? { type: 'invite', signal: sig } : { type: 'student' }, observations: sig === 'regression' ? obs : [], multiple: seed % 2 === 0 });
      let t = D.start(c), i = seed;
      while (t && !t.done && i < seed + 20) {
        const ch = t.chips && t.chips.length && i % 2 ? t.chips[i % t.chips.length] : null;
        t = D.answer(c, ch ? { chip: ch.id, label: ch.en } : answers[i % answers.length]);
        i++;
      }
      const txt = allText(c).replace(/“[^”]*”/g, '');
      assert.ok(D.isSafe(txt), `unsafe text for ${sig}/${seed}: ${txt.match(D.BANNED)}`);
      const sum = Sum.build({ entries: c.entries, signals: [], lang: seed % 3 ? 'en' : 'ar' });
      ['observed', 'context', 'tried', 'helpful', 'next'].forEach(k => sum.sections[k].forEach(l => assert.ok(!Sum.BANNED.test(l), l)));
    }
  });
});

test('summary: all sections present, editable plain text, limitations included', () => {
  const { c } = conv('regression');
  D.answer(c, 'I lost my place'); D.answer(c, chip('tool:focus')); D.answer(c, chip('helped'));
  const s = Sum.build({ entries: c.entries, signals: [{ id: 'pan', available: false }, { id: 'tts', available: true, value: 2 }], lab: { ratings: { spacing: 'easier', font: 'harder' } }, lang: 'en' });
  Sum.SECTIONS.forEach(([k]) => assert.ok(s.sections[k].length > 0, k));
  assert.ok(s.sections.observed.some(l => /not available/.test(l)));
  assert.ok(s.sections.observed.some(l => /a tool, not a sign/.test(l)));
  assert.ok(s.sections.helpful.some(l => /Extra spacing/.test(l) && /preferences, not a test/.test(l)));
  assert.ok(s.sections.limitations.some(l => /not a diagnosis/.test(l)));
  assert.ok(s.sections.next.some(l => /self-refer/.test(l)));
  s.sections.reported = ['My own edited words'];
  const txt = Sum.toText(s);
  assert.match(txt, /My own edited words/);
  assert.match(txt, /never diagnoses disability/);
});
