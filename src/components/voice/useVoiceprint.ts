'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook para extracción y comparación de voiceprints.
 *
 * Estrategia (simple pero efectiva para filtrar hablantes):
 *  1. Capturar audio del micrófono con AudioContext + AnalyserNode
 *  2. Calcular la magnitud promedio del espectro FFT durante una ventana
 *  3. Almacenar como vector de características (256 bins)
 *  4. Para verificar, calcular el mismo vector y comparar con similitud coseno
 *
 * No es tan preciso como un modelo neuronal (wav2vec2 / ECAPA-TDNN),
 * pero es suficiente para distinguir "el usuario" vs "otra persona"
 * sin descargar modelos pesados. En una futura iteración se puede
 * cambiar a transformers.js con un modelo ONNX.
 *
 * El voiceprint se guarda como array de números en localStorage
 * a través del store de settings.
 */

const FFT_SIZE = 512; // FFT → 256 bins de magnitud
const SAMPLE_MS = 2500; // duración del muestreo por defecto

export interface VoiceprintResult {
  spectrum: number[];
  energy: number;
}

export interface VerificationResult {
  similarity: number; // 0..1
  matched: boolean;
}

/**
 * Calcula el espectro promedio a partir de un stream de micrófono.
 * Devuelve un vector normalizado de 256 bins.
 */
async function captureSpectrum(
  stream: MediaStream,
  durationMs: number,
): Promise<VoiceprintResult> {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AC();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);

  const bins = analyser.frequencyBinCount; // 256
  const data = new Uint8Array(bins);
  const accum = new Float32Array(bins);
  let frames = 0;
  let totalEnergy = 0;

  return new Promise((resolve) => {
    const startTime = performance.now();
    const tick = () => {
      analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
      let frameEnergy = 0;
      for (let i = 0; i < bins; i++) {
        accum[i] += data[i];
        frameEnergy += data[i] * data[i];
      }
      totalEnergy += Math.sqrt(frameEnergy / bins);
      frames++;
      if (performance.now() - startTime >= durationMs) {
        // Promedio y normaliza
        const spectrum = Array.from(accum).map((v) => v / frames / 255);
        ctx.close();
        resolve({
          spectrum,
          energy: totalEnergy / frames,
        });
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Similitud coseno entre dos vectores.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

export interface UseVoiceprintReturn {
  /** Estado del micrófono (capturando o no) */
  capturing: boolean;
  /** Lista de streams activos (para mostrar niveles) */
  hasMicPermission: boolean | null;

  /** Captura N muestras y devuelve un voiceprint promedio */
  trainVoiceprint: (
    samples?: number,
    sampleMs?: number,
  ) => Promise<VoiceprintResult[]>;

  /** Verifica una muestra corta contra un voiceprint guardado */
  verifyAgainst: (
    voiceprint: number[],
    sampleMs?: number,
    threshold?: number,
  ) => Promise<VerificationResult>;

  /** Detiene cualquier captura activa */
  stop: () => void;
}

export function useVoiceprint(): UseVoiceprintReturn {
  const [capturing, setCapturing] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(
    null,
  );
  const streamRef = useRef<MediaStream | null>(null);
  const stopRef = useRef(false);

  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;
    setHasMicPermission(true);
    return stream;
  }, []);

  const stop = useCallback(() => {
    stopRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCapturing(false);
  }, []);

  const trainVoiceprint = useCallback(
    async (samples = 3, sampleMs = SAMPLE_MS): Promise<VoiceprintResult[]> => {
      setCapturing(true);
      stopRef.current = false;
      const results: VoiceprintResult[] = [];
      try {
        const stream = await ensureStream();
        for (let i = 0; i < samples; i++) {
          if (stopRef.current) break;
          // pequeña pausa entre muestras
          await new Promise((r) => setTimeout(r, 300));
          if (stopRef.current) break;
          const r = await captureSpectrum(stream, sampleMs);
          results.push(r);
        }
      } finally {
        setCapturing(false);
      }
      return results;
    },
    [ensureStream],
  );

  const verifyAgainst = useCallback(
    async (
      voiceprint: number[],
      sampleMs = 1500,
      threshold = 0.85,
    ): Promise<VerificationResult> => {
      setCapturing(true);
      try {
        const stream = await ensureStream();
        const r = await captureSpectrum(stream, sampleMs);
        const sim = cosineSimilarity(r.spectrum, voiceprint);
        return { similarity: sim, matched: sim >= threshold };
      } finally {
        setCapturing(false);
      }
    },
    [ensureStream],
  );

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      stopRef.current = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    capturing,
    hasMicPermission,
    trainVoiceprint,
    verifyAgainst,
    stop,
  };
}

/**
 * Promedia varios espectros en uno solo (el voiceprint canónico).
 */
export function averageSpectra(spectra: number[][]): number[] {
  if (spectra.length === 0) return [];
  const len = spectra[0].length;
  const out = new Array(len).fill(0);
  for (const s of spectra) {
    for (let i = 0; i < len; i++) out[i] += s[i] ?? 0;
  }
  return out.map((v) => v / spectra.length);
}
