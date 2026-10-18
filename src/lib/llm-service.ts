'use client';

import { NEKO_SYSTEM_PROMPT } from '@/lib/neko-prompt';
import { chatWithOllama, pingOllama } from '@/lib/ollama';
import { useSettings } from '@/store/settings';
import type { LLMMessage } from '@/types';

/**
 * Cliente Groq que llama DIRECTAMENTE a la API desde el navegador.
 * Usado en GitHub Pages (no hay servidor).
 */
interface GroqChatParams {
  apiKey: string;
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  signal?: AbortSignal;
}

interface GroqChatResponse {
  choices: { message: { content: string } }[];
}

async function chatWithGroqDirect(params: GroqChatParams): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: params.temperature ?? 0.7,
      max_tokens: 512,
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    let msg = `Groq API error ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      msg =
        'Tu API key de Groq no es válida o ha expirado. Consigue una nueva en https://console.groq.com/keys';
    }
    throw new Error(`${msg}: ${txt.slice(0, 200)}`);
  }

  const json = (await res.json()) as GroqChatResponse;
  return (json.choices?.[0]?.message?.content ?? '').trim();
}

/**
 * Llama al endpoint del servidor (Next.js dev server o hosting con servidor).
 * Devuelve null si el servidor no está disponible (ej: GitHub Pages).
 */
async function chatWithGroqViaServer(
  messages: LLMMessage[],
  apiKeyOverride?: string,
  modelOverride?: string,
): Promise<string | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKeyOverride) headers['x-groq-key'] = apiKeyOverride;
  if (modelOverride) headers['x-groq-model'] = modelOverride;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages }),
      // Timeout corto para no bloquear la UI si no hay servidor
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { reply: string };
    return json.reply;
  } catch {
    return null; // no hay servidor disponible
  }
}

/**
 * Detecta si estamos en un entorno con servidor (/api/chat disponible).
 * GitHub Pages → false. Dev server o hosting con Node → true.
 */
let cachedHasServer: boolean | null = null;
async function hasServerEndpoint(): Promise<boolean> {
  if (cachedHasServer !== null) return cachedHasServer;
  try {
    const res = await fetch('/api/chat', {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    cachedHasServer = res.ok;
  } catch {
    cachedHasServer = false;
  }
  return cachedHasServer;
}

// ===================== Servicio unificado =====================

export interface ChatResult {
  reply: string;
  provider: 'groq' | 'ollama';
}

export async function resolveProvider(): Promise<'groq' | 'ollama'> {
  const s = useSettings.getState();
  if (s.provider === 'ollama') return 'ollama';
  if (s.provider === 'groq') return 'groq';
  // auto: probar Ollama primero si está configurado
  if (s.ollamaUrl) {
    const ok = await pingOllama(s.ollamaUrl).catch(() => false);
    if (ok) return 'ollama';
  }
  return 'groq';
}

/**
 * Llama al LLM con la configuración actual del usuario.
 *
 * Estrategia para máxima compatibilidad:
 *  - Si hay servidor Next.js (/api/chat) → usarlo (oculta API key)
 *  - Si no (GitHub Pages) → llamada directa a Groq con la key del usuario
 */
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

  // Groq: preferir servidor si existe
  const serverAvailable = await hasServerEndpoint();
  if (serverAvailable) {
    const reply = await chatWithGroqViaServer(messages, s.groqApiKey, s.groqModel);
    if (reply !== null) return { reply, provider: 'groq' };
    // fallthrough to direct
  }

  // Llamada directa al navegador (GitHub Pages o fallback)
  if (!s.groqApiKey) {
    throw new Error(
      'Necesitas configurar tu API key de Groq. Pulsa el icono ⚙️ arriba a la derecha y pega tu key de https://console.groq.com/keys',
    );
  }
  const reply = await chatWithGroqDirect({
    apiKey: s.groqApiKey,
    model: s.groqModel || 'llama-3.3-70b-versatile',
    messages: fullMessages,
  });
  return { reply, provider: 'groq' };
}

/**
 * Llamada "pequeña" para extracción de hechos (sin system prompt de Neko).
 * Usado por el extractor de memoria.
 */
export async function extractJSON(
  prompt: string,
  userText: string,
): Promise<string> {
  const s = useSettings.getState();
  const provider = await resolveProvider();
  const messages: LLMMessage[] = [
    { role: 'system', content: prompt },
    { role: 'user', content: userText },
  ];

  if (provider === 'ollama') {
    return chatWithOllama({
      baseUrl: s.ollamaUrl,
      model: s.ollamaModel || 'llama3.2',
      messages,
      temperature: 0.2,
    });
  }

  // Preferir servidor si existe
  const serverAvailable = await hasServerEndpoint();
  if (serverAvailable) {
    const reply = await chatWithGroqViaServer(messages, s.groqApiKey, s.groqModel);
    if (reply !== null) return reply;
  }

  if (!s.groqApiKey) {
    throw new Error('Falta API key de Groq para extracción de memoria');
  }
  return chatWithGroqDirect({
    apiKey: s.groqApiKey,
    model: s.groqModel || 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.2,
  });
}
