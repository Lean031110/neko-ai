import type { LLMMessage } from '@/types';

/**
 * Cliente de Ollama (IA local).
 *
 * IMPORTANTE: Ollama corre en la máquina del usuario (típicamente
 * http://localhost:11434). Por tanto, este cliente se ejecuta
 * DESDE EL NAVEGADOR, no desde el servidor Next.js.
 *
 * Requisitos:
 *  - Ollama instalado localmente: https://ollama.com
 *  - Modelo descargado: `ollama pull llama3.2`
 *  - CORS habilitado en Ollama: `OLLAMA_ORIGINS=* ollama serve`
 *    (o el origen específico de Neko, ej: https://preview-xxx.space-z.ai)
 */

export interface OllamaChatOptions {
  baseUrl: string;
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  signal?: AbortSignal;
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export class OllamaError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'OllamaError';
  }
}

/**
 * Lista los modelos disponibles en la instancia de Ollama.
 */
export async function listOllamaModels(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<OllamaModel[]> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/tags`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new OllamaError(
      `No se pudo conectar con Ollama (${res.status}). Verifica que esté corriendo en ${baseUrl} y que tenga CORS habilitado.`,
    );
  }
  const json = (await res.json()) as { models?: OllamaModel[] };
  return json.models ?? [];
}

/**
 * Verifica que la instancia de Ollama responde.
 */
export async function pingOllama(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, {
      signal,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Llama a Ollama para generar una respuesta de chat.
 *
 * El system prompt de Neko se inyecta aquí (mismo que en /api/chat del servidor).
 */
export async function chatWithOllama(
  opts: OllamaChatOptions,
): Promise<string> {
  const url = `${opts.baseUrl.replace(/\/$/, '')}/api/chat`;
  const body = {
    model: opts.model,
    stream: false,
    options: {
      temperature: opts.temperature ?? 0.7,
    },
    messages: opts.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new OllamaError(
      `Ollama respondió ${res.status}: ${txt.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as {
    message?: { content?: string };
    error?: string;
  };
  if (json.error) {
    throw new OllamaError(`Ollama error: ${json.error}`);
  }
  return (json.message?.content ?? '').trim();
}
