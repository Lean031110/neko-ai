'use client';

import {
  addMemory,
  getAllMemories,
  type Memory,
  type MemoryType,
} from '@/lib/memory-db';
import { extractJSON } from '@/lib/llm-service';
import type { LLMMessage } from '@/types';

/**
 * Servicio de memoria persistente de Neko.
 *
 * Tras cada mensaje del usuario, se llama a un LLM "barato" para extraer
 * hechos dignos de recordar. Los hechos se guardan en IndexedDB.
 *
 * Antes de responder, se cargan los recuerdos relevantes (por similitud
 * de palabras clave) y se inyectan en el contexto del LLM principal.
 */

interface ExtractedFact {
  content: string;
  type: MemoryType;
  tags: string[];
  importance: number;
}

interface ExtractionResult {
  facts: ExtractedFact[];
}

const EXTRACTION_PROMPT = `Eres un extractor de memoria para un asistente llamado Neko.
Tu tarea es identificar hechos que valga la pena recordar sobre el usuario
a partir de sus mensajes. Responde SOLO en JSON válido, sin texto adicional.

Formato esperado:
{
  "facts": [
    {
      "content": "El usuario trabaja como ingeniero",
      "type": "fact",
      "tags": ["trabajo", "profesion"],
      "importance": 0.7
    }
  ]
}

Categorías (type) válidas:
- "fact": hechos concretos sobre el usuario
- "preference": gustos o disgustos ("me gusta X", "odio Y")
- "event": eventos con tiempo ("mañana tengo reunión")
- "person": personas mencionadas ("mi hermano X")
- "note": notas generales
- "task": tareas pendientes

Reglas:
- Solo extrae hechos EXPLÍCITOS del mensaje.
- Si no hay nada digno de recordar, devuelve {"facts": []}.
- 1-3 facts por mensaje (no más).
- "importance" entre 0.3 y 1.0 (1.0 = crítico, 0.3 = trivia).
- "content" debe ser una frase en tercera persona ("El usuario...").
- "tags" debe contener 1-3 palabras clave en minúscula, sin espacios.
- Devuelve SOLO JSON, sin explicaciones ni markdown.`;

/**
 * Extrae hechos de un mensaje del usuario y los guarda en memoria.
 */
export async function extractAndStoreMemories(
  userMessage: string,
): Promise<Memory[]> {
  // No extraer de mensajes triviales o muy cortos
  if (userMessage.length < 10) return [];
  if (/^(hola|buenas|hey|qué tal|cómo estás|silencio|cállate)/i.test(userMessage)) {
    return [];
  }

  try {
    const raw = await extractJSON(
      EXTRACTION_PROMPT,
      userMessage,
    );
    const json = parseJSONLoose<ExtractionResult>(raw);
    if (!json?.facts?.length) return [];

    const stored: Memory[] = [];
    for (const fact of json.facts) {
      if (!fact.content || !fact.type) continue;
      try {
        const mem = await addMemory({
          content: fact.content,
          type: fact.type,
          tags: Array.isArray(fact.tags) ? fact.tags : [],
          importance: clamp(Number(fact.importance) || 0.5, 0, 1),
        });
        stored.push(mem);
      } catch {
        // skip duplicates / errors
      }
    }
    return stored;
  } catch (e) {
    console.warn('[memory] extracción falló:', e);
    return [];
  }
}

/**
 * Carga los recuerdos más relevantes para un mensaje del usuario.
 * Versión 1: keyword matching (búsqueda simple por tags + palabras).
 * Versión futura: embeddings + cosine similarity.
 */
export async function getRelevantMemories(
  userMessage: string,
  limit = 5,
): Promise<Memory[]> {
  const all = await getAllMemories();
  if (all.length === 0) return [];

  const words = userMessage
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  const wordSet = new Set(words);

  const scored = all.map((m) => {
    let score = m.importance;
    // Score por tags que coincidan con palabras del mensaje
    for (const tag of m.tags) {
      if (wordSet.has(tag.toLowerCase())) score += 1.5;
    }
    // Score por palabras del contenido
    const contentWords = m.content.toLowerCase().split(/\W+/);
    for (const cw of contentWords) {
      if (cw.length > 3 && wordSet.has(cw)) score += 0.3;
    }
    // Recuerdos recientes boost
    const ageDays = (Date.now() - m.createdAt) / (1000 * 60 * 60 * 24);
    if (ageDays < 1) score += 0.2;
    return { memory: m, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.memory);
}

/**
 * Construye el system prompt con la memoria inyectada.
 * Se coloca DESPUÉS del prompt de Neko, con contexto adicional.
 */
export async function buildMemoryContext(
  userMessage: string,
): Promise<LLMMessage | null> {
  const memories = await getRelevantMemories(userMessage);
  if (memories.length === 0) return null;

  const memoryText = memories
    .map(
      (m) =>
        `- ${m.content} [tipo: ${m.type}]`,
    )
    .join('\n');

  return {
    role: 'system',
    content: `Contexto del usuario (memoria a largo plazo):
${memoryText}

Usa esta información para personalizar tu respuesta. NO menciones explícitamente que tienes estos recuerdos salvo que sea natural en la conversación.`,
  };
}

// ===================== Utilidades =====================

function parseJSONLoose<T>(raw: string): T | null {
  // Los LLMs a veces devuelven JSON con markdown alrededor
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
