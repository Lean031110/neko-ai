import { NextRequest, NextResponse } from 'next/server';
import { llmClient, getProviderInfo } from '@/lib/groq';
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
 * Body: { messages: LLMMessage[] } — los últimos mensajes del usuario (sin system prompt)
 * Respuesta: { reply: string }
 *
 * El system prompt de Neko se inyecta aquí, en el servidor.
 */
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

    const reply = await llmClient.chat([NEKO_SYSTEM_PROMPT, ...sanitized]);

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[/api/chat] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, name: 'Neko', ...getProviderInfo() });
}
