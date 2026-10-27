/* ERLY AI Reading Companion — deployment configuration.

   Leave `endpoint` empty to run the built-in rule-based demo (no network, the
   UI says replies are simulated). To use a real language model, deploy
   server/llm-proxy.mjs somewhere that can hold a secret and put its public URL
   here, e.g. 'https://erly-ai.example.org/api/companion'.

   NEVER put an API key in this file: everything in assets/ is public. */
window.ERLY_AI_CONFIG = {
  endpoint: ''
};
