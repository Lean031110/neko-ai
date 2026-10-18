'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LLMProvider = 'auto' | 'groq' | 'ollama';

export interface UserSettings {
  // --- LLM ---
  provider: LLMProvider;
  /** API key del usuario (opcional). Si vacía, usa la del servidor. */
  groqApiKey: string;
  groqModel: string;
  ollamaUrl: string;
  ollamaModel: string;

  // --- Voz ---
  lang: string;
  speakRate: number;
  speakPitch: number;
  voiceURI: string;

  // --- Voiceprint (Fase 2) ---
  voiceprintEnabled: boolean;
  voiceprintData: number[] | null; // FFT magnitude spectrum promedio
  voiceprintLabel: string; // nombre del hablante
}

interface SettingsStore extends UserSettings {
  set: (patch: Partial<UserSettings>) => void;
  reset: () => void;
}

const DEFAULTS: UserSettings = {
  provider: 'auto',
  groqApiKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',

  lang: 'es-ES',
  speakRate: 1.05,
  speakPitch: 1.0,
  voiceURI: '',

  voiceprintEnabled: false,
  voiceprintData: null,
  voiceprintLabel: 'Yo',
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'neko-settings',
      version: 1,
    },
  ),
);
