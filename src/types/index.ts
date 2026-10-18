// Tipos compartidos de Neko AI

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface LLMMessage {
  role: MessageRole;
  content: string;
}

// Voces autorizadas (Fase 2 — por ahora solo metadata)
export interface AuthorizedVoice {
  id: string;
  label: string;
  embedding?: number[];
  createdAt: number;
}

export type ListeningState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface WidgetDef {
  id: string;
  type: 'clock' | 'weather' | 'system' | 'quick-actions' | 'custom';
  title: string;
  enabled: boolean;
}
