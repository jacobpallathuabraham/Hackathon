// Interactive Visual Learning Engine + audio lessons + premium engines (with simulated providers).
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tests/e2e/visuals.e2e.js
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const watch = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/GL Driver|Failed to load resource/.test(m.text())) errors.push(m.text()); }); };

  /* ---------- every scene: opens, steps, controls ---------- */
  const p = await browser.newPage({ viewport: { width: 1100, height: 760 } }); watch(p);
  for (const id of ['photosynthesis', 'heart', 'circuit', 'tectonics', 'newton', 'graph', 'gravity', 'cylinder']) {
    await p.goto(`${BASE}tests/fixtures/visuals.html?id=${id}`);
    await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
    const n = await p.evaluate(() => v.stages);
    await p.click('[data-v="next"]'); assert.equal(await p.evaluate(() => v.stageIndex), 1, id + ' next');
    await p.click('[data-v="prev"]'); assert.equal(await p.evaluate(() => v.stageIndex), 0, id + ' prev');
    await p.click(`[data-st="${n - 1}"]`); assert.match(await p.textContent('.vz__t'), new RegExp('^' + n + '\\.'), id + ' jump to last step');
    await p.keyboard.press('ArrowLeft'); assert.equal(await p.evaluate(() => v.stageIndex), n - 2, id + ' keyboard');
    await p.click('[data-v="play"]'); await p.click('[data-v="play"]');
    await p.click('[data-speed="2"]');
  }
  // the companion's sentences move the visual to the matching step
  await p.goto(`${BASE}tests/fixtures/visuals.html?id=heart`); await p.waitForFunction(() => window.ready);
  assert.equal(await p.evaluate(() => v.sync('Blood then leaves the left ventricle through the aorta to the rest of the body.')), 5, 'sync: aorta → last step');
  assert.equal(await p.evaluate(() => v.sync('In the lungs it picks up oxygen.')), 3, 'sync: lungs');
  // circuit: Ohm's law is computed, not faked
  await p.goto(`${BASE}tests/fixtures/visuals.html?id=circuit&s=2`); await p.waitForFunction(() => window.ready); await p.waitForTimeout(200);
  assert.match(await p.textContent('#cI'), /I = 0\.60 A/, 'closed circuit: 6 V / 10 Ω');
  await p.evaluate(() => v.setVar('v', 9)); await p.waitForTimeout(100); assert.match(await p.textContent('#cI'), /0\.90 A/, '9 V → 0.9 A');
  await p.evaluate(() => v.setVar('two', 1)); await p.waitForTimeout(100); assert.match(await p.textContent('#cI'), /0\.45 A/, 'two bulbs in series halve the current');
  await p.click('#cSw'); await p.waitForTimeout(100); assert.match(await p.textContent('#cI'), /0\.00 A/, 'switch opens the circuit');
  // cylinder: V = πr²h updates with the sliders
  await p.goto(`${BASE}tests/fixtures/visuals.html?id=cylinder&s=3`); await p.waitForFunction(() => window.ready);
  assert.match(await p.textContent('.vz__formula'), /169\.6 cm³/, 'π·3²·6');
  await p.evaluate(() => v.setVar('r', 6)); await p.waitForTimeout(80); assert.match(await p.textContent('.vz__formula'), /678\.6 cm³/, 'doubling r quadruples V');
  // graph: safe expression parser
  const ev = await p.evaluate(() => { const f = ERLY.visuals.parseExpr; return [f('2x^2 - 3')(2), f('sin(pi/2)')(0), f('sqrt(16)+abs(-2)')(0)]; });
  assert.deepEqual(ev.map(x => +x.toFixed(6)), [5, 1, 6], 'expression parser');
  assert.equal(await p.evaluate(() => { try { ERLY.visuals.parseExpr('alert(1)'); return 'ran'; } catch (e) { return 'rejected'; } }), 'rejected', 'parser rejects code');
  // detection + AI tags
  const det = await p.evaluate(() => ['Explain photosynthesis', 'How does the human heart work?', 'Explain gravity', 'How does an electric circuit work?', 'volume of a cylinder', 'How do tectonic plates move', "Explain Newton's laws", 'plot y = x^2 - 4', 'What is the capital of France?'].map(q => (ERLY.visuals.detect(q) || {}).id || null));
  assert.deepEqual(det, ['photosynthesis', 'heart', 'gravity', 'circuit', 'cylinder', 'tectonics', 'newton', 'graph', null], 'detection');
  const tag = await p.evaluate(() => { const t = 'The water cycle has four stages. [[visual:flow|The water cycle|Evaporation > Condensation > Precipitation > Collection]]'; const r = ERLY.visuals.fromTag(t); return [r.id, r.scene.stages.length, ERLY.visuals.stripTags(t)]; });
  assert.deepEqual(tag, ['flow', 4, 'The water cycle has four stages. '], 'AI flow tag → 4-step visual, tag stripped');
  await p.close();

  /* ---------- in the app: built-in brain teaches with a narrated visual; audio lesson ---------- */
  const app = await browser.newPage({ viewport: { width: 1440, height: 860 } }); watch(app);
  await app.addInitScript(() => {
    sessionStorage.setItem('acubins-role', 'student');
    localStorage.setItem('erly-companion-v1', JSON.stringify({ consent: { mic: true, monitoring: false }, asked: { monitoring: true }, prefs: { vs: { setup: true, avatar: 'yasmin' } } }));
    const V = ['Microsoft Ava Online (Natural) - English (United States)|en-US', 'Microsoft Andrew Online (Natural) - English (United States)|en-US'].map(x => { const [n, l] = x.split('|'); return { name: n, lang: l, localService: false }; });
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    window.__said = [];
    const synth = { getVoices: () => V, cancel() { synth.g = (synth.g || 0) + 1; }, pause() {}, resume() {}, addEventListener() {}, speak(u) { const g = synth.g; window.__said.push({ v: u.voice && u.voice.name, t: u.text }); setTimeout(() => { if (g !== synth.g) return; u.onstart && u.onstart({}); setTimeout(() => { if (g === synth.g) u.onend && u.onend({}); }, 60); }, 5); } };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.SpeechRecognition = window.webkitSpeechRecognition = class { start() {} stop() {} abort() {} };
  });
  await app.goto(BASE + 'student.html'); await app.waitForTimeout(700);
  await app.click('.cmp-launch'); await app.waitForTimeout(900);
  await app.fill('#cmpText', 'How does an electric circuit work?'); await app.press('#cmpText', 'Enter');
  // v8: visuals are offered first and open only with the student's consent
  await app.waitForSelector('.cvoffer [data-vo="yes"]', { timeout: 10000 });
  assert.equal(await app.locator('.vz').count(), 0, 'nothing opens before the student agrees');
  await app.click('.cvoffer [data-vo="yes"]');
  await app.waitForSelector('.vz.is-touring', { timeout: 10000 });
  await app.waitForFunction(() => ERLY.companion.tools.visual.current().stageIndex >= 2, null, { timeout: 15000 });
  assert.ok(await app.evaluate(() => window.__said.some(s => /switch/i.test(s.t))), 'the tour is narrated');
  await app.evaluate(() => ERLY.companion.tools.visual.close()); await app.waitForTimeout(300);
  // audio lesson from a topic: two different real voices take turns
  await app.evaluate(() => { window.__said.length = 0; });
  await app.fill('#cmpText', 'make an audio lesson about the heart'); await app.press('#cmpText', 'Enter');
  await app.waitForSelector('.alx.is-in'); await app.click('.alx__play'); await app.waitForTimeout(1500);
  const voices = await app.evaluate(() => [...new Set(window.__said.map(s => s.v))]);
  assert.equal(voices.length, 2, 'two distinct voices: ' + voices);
  await app.click('.alx [data-a="close"]');

  /* ---------- premium engines with simulated providers (no keys in tests) ---------- */
  // ElevenLabs path: the voice plays the cloud audio, lips follow its timestamps, and failure falls back
  const res = await app.evaluate(async () => {
    window.ERLY_AI_CONFIG.cloudVoice = { url: 'https://example.invalid/tts', voices: { f: 'voiceF000', m: 'voiceM000' } };
    { const st = ERLY.companion._ui.store; st.setPref('vs', Object.assign({}, st.prefs().vs, { cloudVoice: true })); }
    const posted = [];
    const realFetch = window.fetch;
    window.fetch = async (u, o) => { if (String(u).includes('/tts')) { const b = JSON.parse(o.body); posted.push(b); const words = b.text.split(''); return new Response(JSON.stringify({ audio: 'AAAA', alignment: { characters: words, character_start_times_seconds: words.map((_, k) => k * 0.01), character_end_times_seconds: words.map((_, k) => k * 0.01 + 0.01) } }), { status: 200 }); } return realFetch(u, o); };
    const played = [];
    window.Audio = class { constructor(src) { this.src = src; this.playbackRate = 1; if (src) played.push(String(src).slice(0, 22)); } play() { setTimeout(() => { this.onplaying && this.onplaying(); setTimeout(() => this.onended && this.onended(), 900); }, 5); return Promise.resolve(); } pause() {} };
    const v = ERLY.companion._ui.voice;
    const hooks = []; const off = v.onPhrase((t, x) => hooks.push(t));
    window.__said.length = 0;
    await new Promise(done => v.speak('Haha, that is a brilliant question! Let me explain.', { lang: 'en', emotion: 'playful', onend: done }));
    off();
    return { posted, played: played.length, hooks: [...new Set(hooks)], browserTTS: window.__said.length };
  });
  assert.ok(res.posted.length >= 1 && /\[laughs\]/.test(res.posted[0].text), 'real laughter is requested from the voice model: ' + (res.posted[0] || {}).text);
  assert.equal(res.posted[0].voice, 'voiceF000', 'female voice for a female companion');
  assert.ok(res.played >= 1 && res.browserTTS === 0, 'cloud audio played, browser voice unused');
  assert.ok(res.hooks.includes('boundary'), 'lip-sync boundaries from the cloud timestamps');
  // Realtime path: server VAD events drive the conversation states, transcript and captions
  const rt = await app.evaluate(async () => {
    window.ERLY_AI_CONFIG.cloudVoice = null;
    window.ERLY_AI_CONFIG.realtime = { url: 'https://example.invalid/realtime/session' };
    let dcRef = null;
    window.RTCPeerConnection = class { constructor() { this.connectionState = 'new'; } addTrack() {} getSenders() { return []; } createDataChannel() { dcRef = { readyState: 'open', sent: [], send(x) { this.sent.push(JSON.parse(x)); }, close() {} }; setTimeout(() => dcRef.onopen && dcRef.onopen(), 10); return dcRef; } async createOffer() { return { sdp: 'v=0' }; } async setLocalDescription() {} async setRemoteDescription() {} close() {} };
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop() {} }], getAudioTracks: () => [{ enabled: true }] });
    const realFetch = window.fetch;
    window.fetch = async (u, o) => { if (String(u).includes('/realtime/session')) return new Response(JSON.stringify({ value: 'ek_test', expires_at: 0 }), { status: 200 }); if (String(u).includes('api.openai.com/v1/realtime/calls')) return new Response('v=0 answer', { status: 200 }); return realFetch(u, o); };
    const P = ERLY.companion._ui.store.prefs().vs; ERLY.companion._ui.store.setPref('vs', Object.assign({}, P, { engine: 'realtime' }));
    ERLY.emit('noor:call');
    await new Promise(r => setTimeout(r, 900));
    const fire = ev => dcRef.onmessage({ data: JSON.stringify(ev) });
    const states = [];
    const snap = () => states.push(document.querySelector('.ncall').dataset.s);
    fire({ type: 'input_audio_buffer.speech_started' }); snap();
    fire({ type: 'input_audio_buffer.speech_stopped' }); snap();
    fire({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'What is osmosis?' });
    fire({ type: 'response.output_audio_transcript.delta', delta: 'Osmosis is water moving ' });
    fire({ type: 'output_audio_buffer.started' }); snap();
    fire({ type: 'response.output_audio_transcript.delta', delta: 'across a membrane.' });
    fire({ type: 'response.output_audio_transcript.done', transcript: 'Osmosis is water moving across a membrane.' });
    fire({ type: 'output_audio_buffer.stopped' }); snap();
    const sent = dcRef.sent.map(x => x.type);
    document.querySelector('#ncOrb').click(); // tap to interrupt → cancel
    const after = dcRef.sent.map(x => x.type);
    const log = document.querySelector('#ncLogList').textContent;
    ERLY.companion.call.end();
    return { states, sent, after, log, cap: document.querySelector('#ncNoor') ? document.querySelector('#ncNoor').textContent : '' };
  });
  assert.deepEqual(rt.states, ['hearing', 'thinking', 'speaking', 'listening'], 'realtime states: ' + rt.states);
  assert.ok(rt.sent.includes('session.update'), 'semantic turn detection configured');
  assert.ok(rt.after.includes('response.cancel') && rt.after.includes('output_audio_buffer.clear'), 'tap interrupts immediately');
  assert.match(rt.log, /What is osmosis\?[\s\S]*Osmosis is water moving across a membrane\./, 'live transcript');

  await browser.close();
  assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  console.log('visuals + audio lessons + premium engines e2e: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
