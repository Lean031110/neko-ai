'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Fingerprint,
} from 'lucide-react';
import { useVoiceprint, averageSpectra } from '@/components/voice/useVoiceprint';
import { useSettings } from '@/store/settings';

interface VoiceprintTrainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PHRASES = [
  'Hola Neko, soy yo.',
  'Mi voz es la que estás aprendiendo ahora.',
  'Reconóceme cuando te hable, por favor.',
];

export function VoiceprintTrainer({
  open,
  onOpenChange,
}: VoiceprintTrainerProps) {
  const {
    voiceprintEnabled,
    voiceprintData,
    voiceprintLabel,
    set,
  } = useSettings();
  const { trainVoiceprint, capturing, hasMicPermission } = useVoiceprint();

  const [step, setStep] = useState<'idle' | 'training' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState(voiceprintLabel || 'Yo');

  const startTraining = async () => {
    setError(null);
    setStep('training');
    setProgress(0);
    const samples: number[][] = [];
    for (let i = 0; i < PHRASES.length; i++) {
      setPhraseIdx(i);
      try {
        const results = await trainVoiceprint(1, 2500);
        if (results[0]) samples.push(results[0].spectrum);
        setProgress(Math.round(((i + 1) / PHRASES.length) * 100));
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'No se pudo capturar audio',
        );
        setStep('idle');
        return;
      }
    }
    const avg = averageSpectra(samples);
    set({
      voiceprintData: avg,
      voiceprintLabel: labelInput.trim() || 'Yo',
      voiceprintEnabled: true,
    });
    setStep('done');
  };

  const deleteVoiceprint = () => {
    set({
      voiceprintData: null,
      voiceprintEnabled: false,
    });
    setStep('idle');
    setProgress(0);
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(() => {
      if (step === 'done') {
        setStep('idle');
        setProgress(0);
      }
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-cyan-400" />
            Reconocimiento de voz
          </DialogTitle>
          <DialogDescription>
            Entrena a Neko para que solo responda a tu voz. Repite 3 frases en
            voz alta cuando te lo pidamos. Cada muestra dura 2.5 segundos.
          </DialogDescription>
        </DialogHeader>

        {/* Estado actual */}
        <div className="space-y-3">
          {voiceprintData && voiceprintEnabled ? (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
              <div className="flex items-center gap-2 text-sm text-cyan-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Voiceprint activo para <strong>{voiceprintLabel}</strong>.
                  Neko solo te responderá a ti.
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Sin voiceprint activado, Neko responderá a cualquiera que
                hable. Actívalo para mayor privacidad.
              </div>
            </div>
          )}

          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="vp-label" className="text-xs">
              Nombre del hablante
            </Label>
            <Input
              id="vp-label"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="Ej. Yo, Carlos, María…"
              disabled={step === 'training'}
              className="bg-background/50"
            />
          </div>

          {/* Estado del permiso */}
          {hasMicPermission === false && (
            <div className="text-xs text-red-300 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" />
              Permiso de micrófono denegado. Habilítalo en el icono de la
              barra del navegador.
            </div>
          )}

          {/* Entrenamiento */}
          {step === 'training' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
                <div className="flex items-center gap-2 text-sm text-cyan-200 mb-2">
                  {capturing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    Muestra {phraseIdx + 1} de {PHRASES.length}
                  </span>
                </div>
                <p className="text-lg text-center text-foreground/90 italic">
                  &ldquo;{PHRASES[phraseIdx]}&rdquo;
                </p>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {step === 'done' && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              ¡Voiceprint entrenado! A partir de ahora Neko solo te escucha a
              ti.
            </div>
          )}

          {error && (
            <div className="text-xs text-red-300 flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Preview del espectro */}
          {voiceprintData && voiceprintData.length > 0 && (
            <div className="rounded-md bg-background/40 border border-border/40 p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Voiceprint ({voiceprintData.length} bins)
              </div>
              <div className="flex items-end gap-px h-12">
                {voiceprintData.slice(0, 64).map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-cyan-500/40 to-cyan-400 rounded-sm"
                    style={{ height: `${Math.max(2, v * 100 * 2)}%` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {voiceprintData && (
            <Button
              variant="outline"
              size="sm"
              onClick={deleteVoiceprint}
              disabled={step === 'training'}
              className="text-red-300 hover:bg-red-500/10 hover:text-red-200 hover:border-red-500/40"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Eliminar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={close}
            disabled={step === 'training'}
          >
            Cerrar
          </Button>
          <Button
            size="sm"
            onClick={startTraining}
            disabled={step === 'training'}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-100"
          >
            {step === 'training' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Entrenando…
              </>
            ) : voiceprintData ? (
              'Re-entrenar'
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 mr-1.5" />
                Entrenar voz
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
