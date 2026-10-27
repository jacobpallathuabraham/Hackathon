/* ERLY AI Reading Companion — deployment configuration.

   Leave `endpoint` empty to run the built-in rule-based demo (no network, the
   UI says replies are simulated). To use a real language model, deploy
   server/llm-proxy.mjs somewhere that can hold a secret and put its public URL
   here, e.g. 'https://erly-ai.example.org/api/companion'.

   NEVER put an API key in this file: everything in assets/ is public. */
window.ERLY_AI_CONFIG = {
  endpoint: '',
  // "Noor Online" (works on every device, used only after the student agrees).
  // Leave null for the free, key-less Pollinations text API, or point it at
  // your own OpenAI-compatible endpoint that needs no browser-side key, e.g.
  // { name: 'Acubins AI', site: 'ai.acubins.example', url: 'https://…/v1/chat/completions', get: '', model: 'gpt-4o-mini' }
  online: null
};
