import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { NEKO_SYSTEM_PROMPT } from '@/lib/neko-prompt';
import type { LLMMessage } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatRequestBody {
  messages: LLMMessage[];
}

const MAX_HISTORY = 12;

/**
 * POST /api/chat
 *
 * Headers opcionales:
 *   x-groq-key:   API key del usuario (sobreescribe la del .env)
 *   x-groq-model: Modelo de Groq a usar
 *
 * Si el cliente elige Ollama, NO se llama a este endpoint: el navegador
 * hace fetch directamente a la URL local de Ollama (ver src/lib/ollama.ts).
 *
 * El system prompt de Neko se inyecta aquí, en el servidor.
 */
async function chatWithGroq(
  messages: LLMMessage[],
  apiKeyOverride?: string,
  modelOverride?: string,
): Promise<string> {
  const apiKey = apiKeyOverride || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY no configurada. Pídela en .env.local o envíala con el header x-groq-key.',
    );
  }
  const client = new Groq({ apiKey });
  const model =
    modelOverride || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const completion = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: 0.7,
    max_tokens: 512,
  });

  return (completion.choices?.[0]?.message?.content ?? '').trim();
}

async function chatWithZai(messages: LLMMessage[]): Promise<string> {
  const { default: ZAI } = await import('z-ai-web-dev-sdk');
  const zai = await ZAI.create();
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'messages es requerido y debe ser un array' },
        { status: 400 },
      );
    }

    const sanitized = body.messages
      .slice(-MAX_HISTORY)
      .filter(
        (m) =>
          m &&
          typeof m.content === 'string' &&
          ['user', 'assistant', 'system'].includes(m.role),
      ) as LLMMessage[];

    // Override desde el cliente (opcional)
    const groqKey = req.headers.get('x-groq-key') || undefined;
    const groqModel = req.headers.get('x-groq-model') || undefined;

    let reply: string;
    try {
      reply = await chatWithGroq([NEKO_SYSTEM_PROMPT, ...sanitized], groqKey, groqModel);
    } catch (e) {
      console.warn('[/api/chat] Groq falló, fallback a z-ai:', e);
      reply = await chatWithZai([NEKO_SYSTEM_PROMPT, ...sanitized]);
    }

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/chat] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: 'Neko',
    provider: process.env.GROQ_API_KEY ? 'Groq' : 'z-ai-fallback',
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
  });
}
