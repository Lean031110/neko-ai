'use client';

import { NEKO_SYSTEM_PROMPT } from '@/lib/neko-prompt';
import { chatWithOllama, pingOllama } from '@/lib/ollama';
import { useSettings } from '@/store/settings';
import type { LLMMessage } from '@/types';

/**
 * Servicio LLM unificado para el cliente.
 *
 * Decide automáticamente el proveedor según la configuración del usuario:
 *  - provider === 'ollama' → fetch directo a Ollama (IA local del usuario)
 *  - provider === 'groq'   → POST a /api/chat (servidor)
 *  - provider === 'auto'   → si hay URL de Ollama configurada y responde,
 *                            usa Ollama; si no, usa Groq
 */

export interface ChatResult {
  reply: string;
  provider: 'groq' | 'ollama';
}

export async function resolveProvider(): Promise<'groq' | 'ollama'> {
  const s = useSettings.getState();
  if (s.provider === 'ollama') return 'ollama';
  if (s.provider === 'groq') return 'groq';
  // auto: probar Ollama primero si está configurada
  if (s.ollamaUrl) {
    const ok = await pingOllama(s.ollamaUrl).catch(() => false);
    if (ok) return 'ollama';
  }
  return 'groq';
}

export async function chat(messages: LLMMessage[]): Promise<ChatResult> {
  const s = useSettings.getState();
  const provider = await resolveProvider();
  const fullMessages: LLMMessage[] = [NEKO_SYSTEM_PROMPT, ...messages];

  if (provider === 'ollama') {
    const reply = await chatWithOllama({
      baseUrl: s.ollamaUrl,
      model: s.ollamaModel || 'llama3.2',
      messages: fullMessages,
    });
    return { reply, provider: 'ollama' };
  }

  // Groq via servidor
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (s.groqApiKey) headers['x-groq-key'] = s.groqApiKey;
  if (s.groqModel) headers['x-groq-model'] = s.groqModel;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error ?? `HTTP ${res.status}`);
  }
  const json = (await res.json()) as { reply: string };
  return { reply: json.reply, provider: 'groq' };
}
