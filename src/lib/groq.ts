import type { LLMMessage } from '@/types';

/**
 * Cliente de LLM genérico.
 *
 * La API key NUNCA se expone al cliente: este archivo solo se usa
 * en route handlers (server-side).
 *
 * En la Fase 1:
 *   - Si GROQ_API_KEY está definida → usa Groq SDK.
 *   - Si NO está definida → usa z-ai-web-dev-sdk (entorno de pruebas).
 *
 * En la Fase 6 se reemplazará/añadirá `OllamaClient` con la misma interfaz.
 */
export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<string>;
}

interface GroqLikeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// --- Cliente z-ai-web-dev-sdk (fallback cuando no hay Groq key) ---
async function chatWithZai(messages: LLMMessage[]): Promise<string> {
  const { default: ZAI } = await import('z-ai-web-dev-sdk');
  const zai = await ZAI.create();

  // El SDK de z-ai usa su propio formato. Convertimos.
  const systemMsg = messages.find((m) => m.role === 'system');
  const history = messages.filter((m) => m.role !== 'system');

  const response = await zai.chat.completions.create({
    messages: history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    system: systemMsg?.content,
    temperature: 0.7,
    max_tokens: 512,
  });

  return (response.choices?.[0]?.message?.content ?? '').trim();
}

// --- Cliente Groq ---
async function chatWithGroq(messages: LLMMessage[]): Promise<string> {
  const { Groq } = await import('groq-sdk');
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no configurada');
  }
  const client = new Groq({ apiKey });
  const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

  const completion = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })) as GroqLikeMessage[],
    temperature: 0.7,
    max_tokens: 512,
  });

  return (completion.choices?.[0]?.message?.content ?? '').trim();
}

export const llmClient: LLMClient = {
  async chat(messages: LLMMessage[]): Promise<string> {
    const provider = (process.env.LLM_PROVIDER ?? 'auto').toLowerCase();

    if (provider === 'ollama') {
      // Fase 6
      console.warn(
        '[Neko] Ollama provider aún no implementado (Fase 6). Fallback a auto.',
      );
    }

    if (provider === 'groq' && process.env.GROQ_API_KEY) {
      return chatWithGroq(messages);
    }

    if (provider === 'zai') {
      return chatWithZai(messages);
    }

    // Auto: preferir Groq si hay API key, si no, z-ai-web-dev-sdk
    if (process.env.GROQ_API_KEY) {
      try {
        return await chatWithGroq(messages);
      } catch (e) {
        console.warn('[Neko] Groq falló, fallback a z-ai:', e);
      }
    }
    return chatWithZai(messages);
  },
};

/**
 * Información del proveedor activo (para el endpoint GET /api/chat).
 */
export function getProviderInfo() {
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const provider = (process.env.LLM_PROVIDER ?? 'auto').toLowerCase();
  let active = 'z-ai-web-dev-sdk (fallback)';
  if (provider === 'groq' && hasGroq) active = 'Groq';
  else if (provider === 'zai') active = 'z-ai-web-dev-sdk';
  else if (hasGroq) active = 'Groq';

  return {
    provider: active,
    model: hasGroq
      ? (process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile')
      : 'z-ai-default',
    groqConfigured: hasGroq,
  };
}
