'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceURI?: string;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: SpeechSynthesisErrorEvent) => void;
}

interface UseSpeechSynthesisReturn {
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  speaking: boolean;
  speak: (
    text: string | string[],
    opts?: SpeakOptions,
  ) => void;
  cancel: () => void;
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  preferredURI?: string,
  lang = 'es',
): SpeechSynthesisVoice | null {
  if (preferredURI) {
    const found = voices.find((v) => v.voiceURI === preferredURI);
    if (found) return found;
  }
  const langMatches = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(lang.toLowerCase()),
  );
  const candidates = langMatches.length > 0 ? langMatches : voices;
  const ranked = [...candidates].sort((a, b) => {
    const score = (v: SpeechSynthesisVoice) => {
      let s = 0;
      const n = v.name.toLowerCase();
      if (/natural|premium|enhanced|neural/.test(n)) s += 5;
      if (/google/.test(n)) s += 3;
      if (/microsoft/.test(n)) s += 2;
      if (/amazon/.test(n)) s += 2;
      // Penalizar voces claramente robóticas si las conocemos
      if (/bad|robot|basic/.test(n)) s -= 3;
      // Preferir locales de España si el usuario pidió es-ES, o latam si es-419
      if (lang === 'es-ES' && v.lang === 'es-ES') s += 2;
      return s;
    };
    return score(b) - score(a);
  });
  return ranked[0] ?? null;
}

/**
 * Limpia el texto para que se sintetice bien en voz:
 * - quita markdown básico
 * - separa en frases para encadenarlas con pausas naturales
 */
function cleanForTTS(input: string): string[] {
  return input
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[(.+?)\]\([^)]+\)/g, '$1')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  // Ref para permitir que speakNext se autollame sin recrearse
  const speakNextRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      if (vs.length === 0) return;
      setVoices(vs);
      setSelectedVoice((prev) => {
        if (prev) return prev;
        const preferredURI = process.env.NEXT_PUBLIC_NEKO_VOICE_URI;
        const lang = process.env.NEXT_PUBLIC_NEKO_LANG ?? 'es-ES';
        return pickBestVoice(vs, preferredURI, lang);
      });
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      try {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      } catch {
        // noop
      }
    };
  }, []);

  const speakNext = useCallback(() => {
    if (!supported || speakingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) {
      setSpeaking(false);
      speakingRef.current = false;
      return;
    }
    const u = new SpeechSynthesisUtterance(next);
    if (selectedVoice) {
      u.voice = selectedVoice;
      u.lang = selectedVoice.lang;
    } else {
      u.lang = process.env.NEXT_PUBLIC_NEKO_LANG ?? 'es-ES';
    }
    u.rate = Number(process.env.NEXT_PUBLIC_NEKO_SPEAK_RATE ?? 1.05);
    u.pitch = Number(process.env.NEXT_PUBLIC_NEKO_SPEAK_PITCH ?? 1.0);
    u.volume = 1.0;
    u.onstart = () => {
      speakingRef.current = true;
      setSpeaking(true);
    };
    u.onend = () => {
      speakingRef.current = false;
      // pequeña pausa natural entre frases
      setTimeout(() => {
        speakNextRef.current();
      }, 80);
    };
    u.onerror = () => {
      speakingRef.current = false;
      setTimeout(() => speakNextRef.current(), 80);
    };
    window.speechSynthesis.speak(u);
  }, [supported, selectedVoice]);

  // Ref para permitir que speakNext se autollame sin recrearse
  useEffect(() => {
    speakNextRef.current = speakNext;
  }, [speakNext]);

  const speak = useCallback(
    (text: string | string[], opts?: SpeakOptions) => {
      if (!supported) {
        opts?.onStart?.();
        opts?.onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      queueRef.current = [];
      const chunks = Array.isArray(text)
        ? text.flatMap(cleanForTTS)
        : cleanForTTS(text);
      queueRef.current = chunks;
      opts?.onStart?.();
      speakNextRef.current();
      // onEnd real se dispara cuando se vacía la cola
      if (opts?.onEnd) {
        const checkEnd = () => {
          if (queueRef.current.length === 0 && !speakingRef.current) {
            opts.onEnd?.();
          } else {
            setTimeout(checkEnd, 100);
          }
        };
        setTimeout(checkEnd, 100);
      }
    },
    [supported],
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    queueRef.current = [];
    speakingRef.current = false;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return {
    supported,
    voices,
    selectedVoice,
    speaking,
    speak,
    cancel,
  };
}
