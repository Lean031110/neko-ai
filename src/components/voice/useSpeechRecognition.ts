'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

// Tipos para la Web Speech API (no están en TS por defecto)
type SRResultAlt = { transcript: string; confidence: number };
type SRResult = {
  isFinal: boolean;
  length: number;
  0: SRResultAlt;
  [index: number]: SRResultAlt;
};
interface SRResultList {
  length: number;
  [index: number]: SRResult;
}
interface SREvent extends Event {
  resultIndex: number;
  results: SRResultList;
}
interface SR extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SRConstructor = new () => SR;

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onFinal?: (text: string) => void;
  onInterim?: (text: string) => void;
  enabled: boolean; // si false, no arranca
}

interface UseSpeechRecognitionReturn {
  supported: boolean;
  listening: boolean;
  start: () => void;
  stop: () => void;
  error: string | null;
}

export function useSpeechRecognition(
  opts: UseSpeechRecognitionOptions,
): UseSpeechRecognitionReturn {
  const {
    lang = 'es-ES',
    continuous = true,
    interimResults = true,
    onFinal,
    onInterim,
    enabled,
  } = opts;

  const [supported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const ctor = window as unknown as {
      SpeechRecognition?: SRConstructor;
      webkitSpeechRecognition?: SRConstructor;
    };
    return Boolean(ctor.SpeechRecognition ?? ctor.webkitSpeechRecognition);
  });
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SR | null>(null);
  const shouldListenRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mantener refs actualizadas sin reiniciar el reconocimiento
  useEffect(() => {
    onFinalRef.current = onFinal;
    onInterimRef.current = onInterim;
  }, [onFinal, onInterim]);

  // Inicializar reconocimiento
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ctor = window as unknown as {
      SpeechRecognition?: SRConstructor;
      webkitSpeechRecognition?: SRConstructor;
    };
    const Ctor = ctor.SpeechRecognition ?? ctor.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = interimResults;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      setError(null);
    };
    rec.onresult = (event: SREvent) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          const text = res[0].transcript.trim();
          if (text) onFinalRef.current?.(text);
        } else {
          interimText += res[0].transcript;
        }
      }
      if (interimText) onInterimRef.current?.(interimText);
    };
    rec.onerror = (e) => {
      const err = (e as Event & { error?: string }).error;
      if (err === 'no-speech' || err === 'aborted') return; // ruido normal
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setError('Permiso de micrófono denegado. Actívalo en el navegador.');
        shouldListenRef.current = false;
      } else if (err === 'network') {
        setError('Error de red en el reconocimiento de voz.');
      } else if (err) {
        setError(`Error de reconocimiento: ${err}`);
      }
    };
    rec.onend = () => {
      setListening(false);
      // Auto-restart si seguimos queriendo escuchar
      if (shouldListenRef.current) {
        if (restartTimer.current) clearTimeout(restartTimer.current);
        restartTimer.current = setTimeout(() => {
          try {
            rec.start();
          } catch {
            // ya arrancado
          }
        }, 250);
      }
    };
    recRef.current = rec;

    return () => {
      shouldListenRef.current = false;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      try {
        recRef.current?.abort();
      } catch {
        // noop
      }
      recRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    if (!recRef.current) return;
    shouldListenRef.current = true;
    try {
      recRef.current.start();
    } catch {
      // ya arrancado
    }
  }, []);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    try {
      recRef.current?.stop();
    } catch {
      // noop
    }
  }, []);

  // Activar/desactivar según `enabled`
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
  }, [enabled, start, stop]);

  return { supported, listening, start, stop, error };
}
