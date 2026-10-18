'use client';

/**
 * Cliente IndexedDB para la memoria persistente de Neko.
 *
 * GitHub Pages sirve contenido estático, sin servidor, así que la memoria
 * vive en el navegador del usuario con IndexedDB. Esto tiene una ventaja
 * enorme para la privacidad: NUNCA se sube nada a la nube.
 *
 * Schema (3 stores):
 *  - memories: hechos extraídos de la conversación
 *      { id, content, type, tags[], importance, createdAt, lastAccessedAt }
 *  - messages: historial completo de chat (para contexto)
 *      { id, role, content, timestamp }
 *  - facts: tabla auxiliar indexada por tag (para búsquedas rápidas)
 */

const DB_NAME = 'neko-memory';
const DB_VERSION = 1;

export type MemoryType =
  | 'fact' // hecho concreto ("trabajo en Madrid")
  | 'preference' // gusto/odio ("me gusta el café")
  | 'event' // evento futuro/pasado ("reunión el viernes")
  | 'person' // persona mencionada ("mi hermano se llama Luis")
  | 'note' // nota general
  | 'task'; // tarea pendiente

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  tags: string[];
  importance: number; // 0..1
  createdAt: number;
  lastAccessedAt: number;
}

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este navegador'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('memories')) {
        const store = db.createObjectStore('memories', { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('importance', 'importance', { unique: false });
      }
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}

// ===================== MEMORIES =====================

export async function addMemory(
  memory: Omit<Memory, 'id' | 'createdAt' | 'lastAccessedAt'>,
): Promise<Memory> {
  const now = Date.now();
  const full: Memory = {
    ...memory,
    id: uid(),
    createdAt: now,
    lastAccessedAt: now,
  };
  await tx('memories', 'readwrite', (s) => s.add(full));
  return full;
}

export async function getAllMemories(): Promise<Memory[]> {
  return tx('memories', 'readonly', (s) => s.getAll() as IDBRequest<Memory[]>)
    .then((arr) => arr.sort((a, b) => b.createdAt - a.createdAt));
}

export async function deleteMemory(id: string): Promise<void> {
  await tx('memories', 'readwrite', (s) => s.delete(id));
}

export async function clearMemories(): Promise<void> {
  await tx('memories', 'readwrite', (s) => s.clear());
}

export async function touchMemory(id: string): Promise<void> {
  const mem = await tx('memories', 'readonly', (s) => s.get(id) as IDBRequest<Memory | undefined>);
  if (mem) {
    mem.lastAccessedAt = Date.now();
    await tx('memories', 'readwrite', (s) => s.put(mem));
  }
}

// ===================== MESSAGES =====================

export async function addMessage(
  msg: Omit<ChatMessageRecord, 'id'>,
): Promise<ChatMessageRecord> {
  const full: ChatMessageRecord = { ...msg, id: uid() };
  await tx('messages', 'readwrite', (s) => s.add(full));
  return full;
}

export async function getRecentMessages(
  limit = 20,
): Promise<ChatMessageRecord[]> {
  const all = await tx('messages', 'readonly', (s) => s.getAll() as IDBRequest<ChatMessageRecord[]>);
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit).reverse();
}

export async function clearMessages(): Promise<void> {
  await tx('messages', 'readwrite', (s) => s.clear());
}

// ===================== STATS =====================

export async function getStats(): Promise<{
  memoriesCount: number;
  messagesCount: number;
  oldestMemoryAt: number | null;
}> {
  const [memories, messages] = await Promise.all([
    getAllMemories(),
    getRecentMessages(1000),
  ]);
  return {
    memoriesCount: memories.length,
    messagesCount: messages.length,
    oldestMemoryAt: memories.length
      ? Math.min(...memories.map((m) => m.createdAt))
      : null,
  };
}
