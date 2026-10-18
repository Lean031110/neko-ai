'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface VoiceSpectrumProps {
  /** 'input' usa el micrófono real, 'output' usa una onda sintética basada en speaking */
  mode: 'input' | 'output';
  /** true cuando hay actividad (escuchando o hablando) */
  active: boolean;
  size?: number;
  bars?: number;
}

/**
 * Espectro de voz en tiempo real.
 *
 * En modo 'input': lee el flujo del micrófono con AnalyserNode y dibuja la FFT.
 * En modo 'output': genera una onda sintética animada (la Web Speech API no
 * expone su audio al AnalyserNode, así que simulamos el ritmo).
 */
export function VoiceSpectrum({
  mode,
  active,
  size = 280,
  bars = 64,
}: VoiceSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const phaseRef = useRef(0);

  // Color según modo
  const color = mode === 'input' ? '#22d3ee' : '#e879f9'; // cyan / magenta
  const colorAlt = mode === 'input' ? '#0ea5e9' : '#d946ef';

  // Inicializar micrófono en modo input
  useEffect(() => {
    if (mode !== 'input' || !active) {
      // limpiar
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      dataRef.current = null;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AC();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      } catch {
        // permiso denegado u otro error: el componente simplemente no mostrará FFT real
      }
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [mode, active]);

  // Loop de render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      // Fondo: glow radial central
      const cx = size / 2;
      const cy = size / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
      grad.addColorStop(0, active ? `${color}33` : `${color}11`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Anillo exterior
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 - 8, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}33`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Anillo medio
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 - 24, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}22`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Barras radiales
      const radius = size / 2 - 32;
      const barWidth = (Math.PI * 2) / bars;
      let values: number[] = [];

      if (mode === 'input' && analyserRef.current && dataRef.current) {
        analyserRef.current.getByteFrequencyData(
          dataRef.current as Uint8Array<ArrayBuffer>,
        );
        const data = dataRef.current;
        const step = Math.floor(data.length / bars) || 1;
        for (let i = 0; i < bars; i++) {
          const v = data[i * step] ?? 0;
          values.push(v / 255);
        }
      } else {
        // Síntesis: onda basada en fase
        phaseRef.current += 0.06;
        const amp = active ? 0.6 : 0.08;
        for (let i = 0; i < bars; i++) {
          const base =
            0.5 +
            0.5 *
              Math.sin(phaseRef.current + (i / bars) * Math.PI * 4) *
              Math.cos(phaseRef.current * 0.7 + i * 0.3);
          values.push(Math.max(0.05, base * amp));
        }
      }

      for (let i = 0; i < bars; i++) {
        const angle = i * barWidth - Math.PI / 2;
        const v = values[i] ?? 0;
        const len = 6 + v * (radius - 8);
        const x1 = cx + Math.cos(angle) * (radius - len);
        const y1 = cy + Math.sin(angle) * (radius - len);
        const x2 = cx + Math.cos(angle) * radius;
        const y2 = cy + Math.sin(angle) * radius;
        const lg = ctx.createLinearGradient(x1, y1, x2, y2);
        lg.addColorStop(0, `${colorAlt}88`);
        lg.addColorStop(1, color);
        ctx.strokeStyle = lg;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Pulso central
      const pulseRadius = active ? 18 + Math.sin(Date.now() / 200) * 3 : 12;
      const pulseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseRadius + 12);
      pulseGrad.addColorStop(0, color);
      pulseGrad.addColorStop(0.6, `${color}66`);
      pulseGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = pulseGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius + 12, 0, Math.PI * 2);
      ctx.fill();

      // Punto central sólido
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, active, color, colorAlt, size, bars]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block"
      />
      <motion.div
        className="absolute pointer-events-none select-none text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? 1 : 0.55 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="text-[11px] uppercase tracking-[0.3em] font-medium"
          style={{ color }}
        >
          {mode === 'input' ? 'Escuchando' : 'Neko'}
        </div>
      </motion.div>
    </div>
  );
}
