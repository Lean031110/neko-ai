'use client';

import { create } from 'zustand';
import type { ChatMessage, ListeningState } from '@/types';

interface NekoState {
  // --- Mensajes ---
  messages: ChatMessage[];
  pushMessage: (role: ChatMessage['role'], content: string) => void;
  clearMessages: () => void;

  // --- Estado de escucha ---
  state: ListeningState;
  setState: (s: ListeningState) => void;

  // --- Transcripción parcial ---
  interimTranscript: string;
  setInterim: (t: string) => void;

  // --- Micrófono ---
  micEnabled: boolean;
  setMicEnabled: (v: boolean) => void;

  // --- TTS ---
  ttsEnabled: boolean;
  setTtsEnabled: (v: boolean) => void;

  // --- Errores ---
  error: string | null;
  setError: (e: string | null) => void;

  // --- Cargando respuesta del LLM ---
  isLoading: boolean;
  setLoading: (v: boolean) => void;
}

function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

export const useNekoStore = create<NekoState>((set) => ({
  messages: [],
  pushMessage: (role, content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: uid(), role, content, timestamp: Date.now() },
      ],
    })),
  clearMessages: () => set({ messages: [] }),

  state: 'idle',
  setState: (state) => set({ state }),

  interimTranscript: '',
  setInterim: (interimTranscript) => set({ interimTranscript }),

  micEnabled: false,
  setMicEnabled: (micEnabled) => set({ micEnabled }),

  ttsEnabled: true,
  setTtsEnabled: (ttsEnabled) => set({ ttsEnabled }),

  error: null,
  setError: (error) => set({ error }),

  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
}));
