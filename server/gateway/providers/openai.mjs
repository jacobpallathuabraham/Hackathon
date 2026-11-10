// OpenAI — optional, paid. Disabled unless OPENAI_CHAT_MODEL and OPENAI_API_KEY are both set.
import { openaiCompatible } from './openai-compat.mjs';
export function openaiChat(env) {
  if (!env.OPENAI_API_KEY || !env.OPENAI_CHAT_MODEL) return null;
  return openaiCompatible({ name: 'openai', url: 'https://api.openai.com/v1/chat/completions', key: env.OPENAI_API_KEY, model: env.OPENAI_CHAT_MODEL, vision: true });
}
