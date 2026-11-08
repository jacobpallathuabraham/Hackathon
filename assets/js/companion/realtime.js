/* ERLY — premium real-time voice (OpenAI Realtime over WebRTC).

   Only active when ERLY_AI_CONFIG.realtime.url points at ERLY's server
   (server/cloudflare-worker.mjs → /realtime/session), which holds the API key
   and returns a short-lived client secret. The browser then talks to the
   model directly over WebRTC: the student's microphone streams in, the
   model's voice streams back, the server detects when the student starts and
   stops speaking (so there's no tapping, and talking over the companion
   interrupts it), and live transcripts arrive for captions.

   Privacy: it starts only from an explicit "Start conversation" with the
   microphone consent; audio goes to OpenAI (a remote service) while the
   session is open — the UI says so; closing the session stops the
   microphone and the connection. Nothing here is on-device. */
(function () {
  'use strict';
  const conf = () => ((window.ERLY_AI_CONFIG || {}).realtime) || null;
  const available = () => !!(conf() && conf().url && window.RTCPeerConnection && navigator.mediaDevices);

  async function connect(o) {
    o = o || {};
    const c = conf(); if (!c || !c.url) throw new Error('not-configured');
    const t0 = performance.now(), m = { session: 0, connected: 0 };
    const s = await fetch(c.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ instructions: o.instructions || '', voice: o.voice || 'marin' }) });
    if (!s.ok) throw new Error('session-' + s.status);
    const { value } = await s.json();
    m.session = performance.now() - t0;
    const pc = new RTCPeerConnection();
    const audio = new Audio(); audio.autoplay = true; audio.playsInline = true;
    let ac = null, an = null, buf = null, raf = 0, closed = false;
    pc.ontrack = e => {
      audio.srcObject = e.streams[0];
      try { const AC = window.AudioContext || window.webkitAudioContext; ac = new AC(); const src = ac.createMediaStreamSource(e.streams[0]); an = ac.createAnalyser(); an.fftSize = 512; src.connect(an); buf = new Uint8Array(an.fftSize); level(); } catch (err) { /* level meter optional */ }
    };
    function level() {
      if (closed) return;
      if (an) { an.getByteTimeDomainData(buf); let sum = 0; for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x; } o.onAudioLevel && o.onAudioLevel(Math.min(1, Math.sqrt(sum / buf.length) * 5)); }
      raf = requestAnimationFrame(level);
    }
    const mic = o.mic || await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    mic.getTracks().forEach(t => pc.addTrack(t, mic));
    const dc = pc.createDataChannel('oai-events');
    const send = ev => { if (dc.readyState === 'open') dc.send(JSON.stringify(ev)); };
    let turnStart = 0, assistant = '';
    dc.onopen = () => {
      // semantic turn detection: waits for the student to finish a thought, not just a pause
      send({ type: 'session.update', session: { type: 'realtime', audio: { input: { transcription: { model: c.transcribeModel || 'gpt-4o-mini-transcribe' }, turn_detection: { type: 'semantic_vad', eagerness: c.eagerness || 'auto', interrupt_response: true } } } } });
      m.connected = performance.now() - t0;
      o.onState && o.onState('listening');
    };
    dc.onmessage = e => {
      let ev; try { ev = JSON.parse(e.data); } catch (err) { return; }
      switch (ev.type) {
        case 'input_audio_buffer.speech_started': o.onState && o.onState('hearing'); o.onBargeIn && o.onBargeIn(); break;
        case 'input_audio_buffer.speech_stopped': turnStart = performance.now(); o.onState && o.onState('thinking'); break;
        case 'conversation.item.input_audio_transcription.completed': o.onUserText && o.onUserText(ev.transcript || ''); break;
        case 'response.output_audio_transcript.delta': assistant += ev.delta || ''; o.onAssistantDelta && o.onAssistantDelta(assistant, ev.delta || ''); break;
        case 'response.output_audio_transcript.done': o.onAssistantDone && o.onAssistantDone(ev.transcript || assistant); assistant = ''; break;
        case 'output_audio_buffer.started': if (turnStart) { o.onLatency && o.onLatency(performance.now() - turnStart); turnStart = 0; } o.onState && o.onState('speaking'); break;
        case 'output_audio_buffer.stopped': case 'output_audio_buffer.cleared': o.onState && o.onState('listening'); break;
        case 'error': o.onError && o.onError(ev.error && ev.error.message || 'error'); break;
      }
    };
    pc.onconnectionstatechange = () => { if (/failed|disconnected/.test(pc.connectionState) && !closed) o.onState && o.onState(pc.connectionState === 'failed' ? 'error' : 'reconnecting'); };
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    const r = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', body: offer.sdp, headers: { authorization: 'Bearer ' + value, 'content-type': 'application/sdp' } });
    if (!r.ok) { mic.getTracks().forEach(t => t.stop()); pc.close(); throw new Error('sdp-' + r.status); }
    await pc.setRemoteDescription({ type: 'answer', sdp: await r.text() });
    return {
      metrics: m,
      // typed text in the same live conversation
      sendText(t) { send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: t }] } }); send({ type: 'response.create' }); turnStart = performance.now(); },
      // stop the current answer at once (tap to interrupt)
      cancel() { send({ type: 'response.cancel' }); send({ type: 'output_audio_buffer.clear' }); },
      mute(on) { mic.getAudioTracks().forEach(t => { t.enabled = !on; }); },
      close() { closed = true; cancelAnimationFrame(raf); try { dc.close(); } catch (e) { /* ignore */ } pc.getSenders().forEach(s => s.track && s.track.stop()); mic.getTracks().forEach(t => t.stop()); pc.close(); audio.srcObject = null; if (ac) ac.close(); }
    };
  }
  window.ERLY = window.ERLY || {};
  ERLY.realtime = { available, connect };
})();
