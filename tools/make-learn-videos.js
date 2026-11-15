// Builds the ERLY-made Learning Studio videos: narration (Kokoro-82M, Apache-2.0, run in the browser exactly as the
// site runs it) → timeline → frames painted by tools/learn-videos/stage.html → H.264/AAC MP4 with ffmpeg, plus a
// WebVTT caption file made from the same lines, a chapters/questions JSON and a poster.
//   python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tools/make-learn-videos.js [id …]
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const SCRIPTS = require('./learn-videos/scripts.js');
const BASE = process.env.ERLY_BASE || 'http://localhost:8765/', OUT = path.join(__dirname, '..', 'assets', 'media', 'learn'), FPS = 24;
const LEAD = 0.6, GAP = 0.45, CH_GAP = 0.9, TAIL = 1.4;

function readWav(buf) {
  const rate = buf.readUInt32LE(24), ch = buf.readUInt16LE(22), bits = buf.readUInt16LE(34);
  let p = 12; while (p < buf.length - 8) { const id = buf.toString('ascii', p, p + 4), sz = buf.readUInt32LE(p + 4); if (id === 'data') return { rate, ch, bits, pcm: buf.subarray(p + 8, p + 8 + sz) }; p += 8 + sz; }
  throw new Error('no data chunk');
}
function writeWav(file, rate, pcm) { const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40); fs.writeFileSync(file, Buffer.concat([h, pcm])); }
const vttTime = s => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = (s % 60).toFixed(3).padStart(6, '0'); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x}`; };
// long lines become two caption cues, split at a natural break, timed by word share
function cues(line) {
  const t = line.text; if (t.length <= 90) return [{ start: line.start, end: line.end, text: t }];
  const mid = t.length / 2; let cut = -1, best = 1e9; for (const m of t.matchAll(/[,:;—]\s|\s(?=and |which |because |so |as )/g)) { const d = Math.abs(m.index - mid); if (d < best) { best = d; cut = m.index + 1; } }
  if (cut < 0) { const sp = t.indexOf(' ', Math.floor(mid)); cut = sp > 0 ? sp : Math.floor(mid); }
  const a = t.slice(0, cut).trim(), b = t.slice(cut).trim(), share = a.split(/\s+/).length / t.split(/\s+/).length, tm = line.start + (line.end - line.start) * share;
  return [{ start: line.start, end: tm, text: a }, { start: tm, end: line.end, text: b }];
}

(async () => {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCRIPTS);
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1000, height: 700 } });
  await ctx.addInitScript(() => sessionStorage.setItem('acubins-role', 'student'));
  const tts = await ctx.newPage(); await tts.goto(BASE + 'student.html'); await tts.waitForTimeout(1500);
  console.log('loading the voice model…'); await tts.evaluate(() => ERLY.neuralVoice.load()); console.log('voice ready');
  const stage = await ctx.newPage(); await stage.setViewportSize({ width: 960, height: 540 }); await stage.goto(BASE + 'tools/learn-videos/stage.html'); await stage.waitForTimeout(500);
  for (const id of ids) {
    const S = SCRIPTS[id], tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'erlyvid-'));
    // 1 · narration, line by line
    const lines = []; let t = LEAD, rate = 24000; const parts = [];
    for (const [ci, ch] of S.chapters.entries()) {
      if (ci) t += CH_GAP - GAP;
      for (const [text, cue] of ch.lines) {
        const b64 = await tts.evaluate(async ([text, voice, speed]) => { const a = await ERLY.neuralVoice.synth(text, voice, speed); const buf = await (await fetch(a.url)).arrayBuffer(); let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }, [text, S.voice, S.speed]);
        const w = readWav(Buffer.from(b64, 'base64')); rate = w.rate; if (w.bits !== 16 || w.ch !== 1) throw new Error('expected 16-bit mono');
        const dur = w.pcm.length / 2 / w.rate;
        lines.push({ text, cue, chapter: ci, title: ch.title, start: +t.toFixed(3), end: +(t + dur).toFixed(3) }); parts.push({ at: t, pcm: w.pcm });
        t += dur + GAP; process.stdout.write('.');
      }
    }
    const total = t - GAP + TAIL;
    const pcm = Buffer.alloc(Math.ceil(total * rate) * 2); parts.forEach(p => p.pcm.copy(pcm, Math.round(p.at * rate) * 2));
    writeWav(path.join(tmp, 'a.wav'), rate, pcm);
    // timeline for the painter: each line runs until the next one starts (pauses keep the last picture moving)
    const tl = lines.map((l, i) => ({ cue: l.cue, chapter: l.chapter, title: l.title, start: i ? l.start : 0, end: i + 1 < lines.length ? lines[i + 1].start : total }));
    // 2 · frames
    const N = Math.ceil(total * FPS); console.log(`\n${id}: ${total.toFixed(1)} s, ${N} frames`);
    for (let i = 0; i < N; i += 48) {
      const shots = await stage.evaluate(([id, i, n, tl, fps]) => { const out = []; for (let k = i; k < Math.min(n, i + 48); k++) out.push(window.grab(id, k / fps, tl, 0.85)); return out; }, [id, i, N, tl, FPS]);
      shots.forEach((d, k) => fs.writeFileSync(path.join(tmp, `f${String(i + k).padStart(5, '0')}.jpg`), Buffer.from(d.split(',')[1], 'base64')));
    }
    // 3 · encode
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%05d.jpg'), '-i', path.join(tmp, 'a.wav'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-tune', 'animation', '-c:a', 'aac', '-b:a', '64k', '-ac', '1', '-movflags', '+faststart', '-shortest', path.join(OUT, id + '.mp4')]);
    const posterAt = lines.find(l => l.chapter === 1) || lines[1];
    fs.copyFileSync(path.join(tmp, `f${String(Math.min(N - 1, Math.round((posterAt.start + 1) * FPS))).padStart(5, '0')}.jpg`), path.join(OUT, id + '.jpg'));
    fs.writeFileSync(path.join(OUT, id + '.vtt'), 'WEBVTT\n\n' + [].concat(...lines.map(cues)).map((c, i) => `${i + 1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}\n`).join('\n'));
    const chStart = ci => lines.find(l => l.chapter === ci).start, chEnd = ci => { const ls = lines.filter(l => l.chapter === ci); return ls[ls.length - 1].end; };
    fs.writeFileSync(path.join(OUT, id + '.json'), JSON.stringify({ id, generated: new Date().toISOString().slice(0, 10), voice: S.voice + ' (Kokoro-82M, Apache-2.0)', duration: +total.toFixed(2), chapters: S.chapters.map((c, i) => ({ t: i ? chStart(i) : 0, title: c.title })), questions: S.questions.map(x => ({ at: +chEnd(x.chapter).toFixed(2), q: x.q })), cards: S.cards }, null, 1));
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`${id}: ${(fs.statSync(path.join(OUT, id + '.mp4')).size / 1e6).toFixed(2)} MB`);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
