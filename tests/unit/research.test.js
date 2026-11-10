// Noor research engine — planning, connectors (with response shapes recorded from the real APIs on 2026-11-10),
// ranking, citations, and the AI-free answers. No network: fetch is a fake that serves recorded shapes.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../../assets/js/noor/research.js');

const WIKI_SEARCH = { query: { search: [{ title: 'Four-stroke engine' }] } };
const WIKI_PAGE = { query: { pages: { 1: { title: 'Four-stroke engine', fullurl: 'https://en.wikipedia.org/wiki/Four-stroke_engine', touched: '2026-10-30T10:00:00Z', extract: 'A four-stroke engine is an internal combustion engine in which the piston completes four separate strokes while turning the crankshaft.\n== Intake ==\nDuring the intake stroke the piston moves down and draws a fuel-air mixture into the cylinder through the intake valve.\n== Compression ==\nThe piston moves up and compresses the mixture, raising its temperature.\n== Advantages ==\nFour-stroke engines are more fuel efficient than two-stroke engines and produce fewer emissions.\n== Disadvantages ==\nThey are heavier and mechanically more complex than two-stroke engines, with more moving parts.' } } } };
const WB = c => [{ page: 1 }, [{ indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP (current US$)' }, country: { id: c.slice(0, 2), value: c === 'JPN' ? 'Japan' : 'Germany' }, countryiso3code: c, date: '2025', value: c === 'JPN' ? 4.03e12 : 4.66e12 }]];
const SDB_TEAM = { teams: [{ idTeam: '133604', strTeam: 'Arsenal', strSport: 'Soccer', strLeague: 'English Premier League', strCountry: 'England', intFormedYear: '1892', strStadium: 'Emirates Stadium' }] };
const SDB_LAST = { results: [{ dateEvent: '2026-11-07', strHomeTeam: 'Arsenal', strAwayTeam: 'Hull City', intHomeScore: '1', intAwayScore: '0', strLeague: 'English Premier League' }] };
function fake(map) { const calls = []; const f = async url => { calls.push(url); for (const [re, body, status] of map) if (re.test(url)) return { ok: (status || 200) < 400, status: status || 200, json: async () => (typeof body === 'function' ? body(url) : body) }; return { ok: false, status: 404, json: async () => ({}) }; }; f.calls = calls; return f; }

test('the planner recognises live, data, scholarly, sports, music and comparison questions', () => {
  assert.equal(R.plan('How does a four-stroke engine work?').freshness, 'stable');
  assert.equal(R.plan('Who won yesterday’s match?').freshness, 'live');
  assert.ok(R.plan('Arsenal latest results').kinds.includes('sports'));
  assert.ok(R.plan('Compare the economies of Japan and Germany').kinds.includes('data'));
  assert.deepEqual(R.plan('Compare the economies of Japan and Germany').compare, ['Japan', 'Germany']);
  assert.equal(R.plan('Compare the economies of Japan and Germany').aspect, 'economy');
  assert.ok(R.plan('What does research say about sleep and memory?').kinds.includes('scholarly'));
  assert.ok(R.plan('Who is Queen the band?').kinds.includes('music'));
  assert.deepEqual(R.plan('Python vs JavaScript').compare, ['Python', 'JavaScript']);
  assert.deepEqual(R.plan('Which is better, solar or wind?').compare, ['solar', 'wind']);
  assert.deepEqual(R.plan('Pros and cons of nuclear power').compare, ['nuclear power']);
  assert.deepEqual(R.plan('Compare classical and modern physics').compare, ['classical physics', 'modern physics']);
  assert.deepEqual(R.plan('What is the difference between AI and machine learning?').compare, ['AI', 'machine learning']);
  assert.equal(R.plan('What is photosynthesis?').compare, null);
});

test('only the redacted question is sent to sources', () => {
  assert.equal(R.redact('my email is sam@uni.ae and phone +971 50 123 4567, what is GDP?'), 'my email is [email] and phone [number], what is GDP?');
});

test('Wikipedia retrieval keeps sections, ranks passages and cites with licence and URL', async () => {
  const f = fake([[/list=search/, WIKI_SEARCH], [/prop=extracts/, WIKI_PAGE], [/wikidata/, { search: [] }]]);
  const r = await R.retrieve('How does the intake stroke work in a four-stroke engine?', { fetchFn: f });
  assert.equal(r.evidence, 'retrieved');
  assert.equal(r.passages[0].section, 'Intake', 'the most relevant section ranks first');
  assert.equal(r.passages[0].url, 'https://en.wikipedia.org/wiki/Four-stroke_engine');
  assert.equal(r.passages[0].licence, 'CC BY-SA 4.0');
  assert.ok(r.passages.every((p, i) => p.n === i + 1));
  assert.ok(f.calls.every(u => /origin=\*/.test(u)), 'browser CORS mode');
});

test('World Bank: one request per country (multi-country requests have no CORS), real numbers, dated', async () => {
  const f = fake([[/api.worldbank.org\/v2\/country\/JPN\//, WB('JPN')], [/api.worldbank.org\/v2\/country\/DEU\//, WB('DEU')], [/wikipedia/, { query: { search: [] } }]]);
  const r = await R.retrieve('Compare the GDP of Japan and Germany', { fetchFn: f });
  const wb = r.passages.find(p => p.sourceId === 'worldbank');
  assert.ok(wb, 'World Bank data is kept in a comparison');
  assert.match(wb.text, /Japan: GDP \(current US\$\) was 4\.03 trillion in 2025/); assert.match(wb.text, /Germany: .* 4\.66 trillion in 2025/);
  assert.equal(wb.data.rows.length, 2); assert.equal(wb.licence, 'CC BY 4.0');
  assert.ok(!f.calls.some(u => /JPN;DEU|DEU;JPN/.test(u)));
});

test('sports results are marked live and dated', async () => {
  const f = fake([[/searchteams/, SDB_TEAM], [/eventslast/, SDB_LAST], [/wiki/, { query: { search: [] }, search: [] }]]);
  const r = await R.retrieve('Arsenal latest results', { fetchFn: f });
  assert.equal(r.evidence, 'live');
  assert.match(r.passages.map(p => p.text).join(' '), /2026-11-07: Arsenal 1–0 Hull City \(English Premier League\)/);
});

test('a live question with no live source says so instead of passing old facts off as current', async () => {
  const f = fake([[/list=search/, WIKI_SEARCH], [/prop=extracts/, WIKI_PAGE], [/wikidata/, { search: [] }]]);
  const r = await R.retrieve('What is the latest news about four-stroke engines today?', { fetchFn: f });
  assert.equal(r.evidence, 'retrieved-not-live');
  assert.match(R.freshnessNote(r, 'en'), /could not reach a live source/);
});

test('failures and rate limits are reported per source, never thrown at the student', async () => {
  const f = fake([[/wikipedia/, {}, 429], [/wikidata/, {}, 500]]);
  const r = await R.retrieve('What is entropy?', { fetchFn: f });
  assert.deepEqual(r.status, { wikipedia: 'rate-limited', wikidata: 'failed' });
  assert.equal(r.evidence, 'none'); assert.equal(r.passages.length, 0);
});

test('citations: invented [n] are removed; unsupported ones are flagged', () => {
  const list = [{ n: 1, title: 'Four-stroke engine', text: 'The piston completes four strokes: intake, compression, power and exhaust.' }];
  const v = R.verifyCitations('An engine has four strokes [1]. Photosynthesis makes glucose in chloroplasts using sunlight energy [1]. It was invented in 1876 [7].', list);
  assert.deepEqual(v.invalid, [7]); assert.doesNotMatch(v.text, /\[7\]/);
  assert.deepEqual(v.weak, [1], 'a citation whose source shares nothing with the sentence is flagged');
});

test('AI-free answer quotes the sources with citations; AI-free comparison uses the sources’ own pros and cons', async () => {
  const f = fake([[/list=search/, WIKI_SEARCH], [/prop=extracts/, WIKI_PAGE], [/wikidata/, { search: [] }]]);
  const r = await R.retrieve('How does the compression stroke work?', { fetchFn: f });
  const x = R.extractive('How does the compression stroke work?', r);
  assert.match(x.md, /compresses the mixture, raising its temperature\. \[\d\]/); assert.match(x.md, /\*\*Sources\*\*\n(\[\d\])+ \[Four-stroke engine\]\(https:\/\/en\.wikipedia\.org/);
  const c = await R.retrieve('Pros and cons of four-stroke engines', { fetchFn: f });
  const rows = R.compareFromSources(c);
  assert.equal(rows.length, 1); assert.match(rows[0].pros[0].s, /more fuel efficient/); assert.match(rows[0].cons[0].s, /heavier and mechanically more complex/);
});

test('search queries use the topic, not the question scaffolding (found during live testing)', () => {
  assert.equal(R.topicQuery('Explain how a four-stroke engine works'), 'four-stroke engine'); // whole sentence returned "Chrysler Hemi engine"
  assert.equal(R.topicQuery('Explain quantum mechanics at an introductory level'), 'quantum mechanics');
  assert.equal(R.topicQuery('How do neural networks work?'), 'neural networks');
  assert.equal(R.topicQuery('What is photosynthesis?'), 'photosynthesis');
  assert.equal(R.scholarQuery('What does research say about sleep and memory?'), 'sleep and memory'); // returned League of Nations papers before
});
