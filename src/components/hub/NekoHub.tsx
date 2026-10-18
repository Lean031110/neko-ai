'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNekoStore } from '@/store/neko';
import { useSettings } from '@/store/settings';
import { useSpeechRecognition } from '@/components/voice/useSpeechRecognition';
import { useSpeechSynthesis } from '@/components/voice/useSpeechSynthesis';
import { VoiceSpectrum } from '@/components/hub/VoiceSpectrum';
import { ChatPanel } from '@/components/hub/ChatPanel';
import { ClockWidget } from '@/components/hub/ClockWidget';
import { WeatherWidget } from '@/components/hub/WeatherWidget';
import { SystemWidget } from '@/components/hub/SystemWidget';
import { QuickActionsWidget } from '@/components/hub/QuickActionsWidget';
import { SettingsDialog } from '@/components/hub/SettingsDialog';
import { VoiceprintTrainer } from '@/components/voice/VoiceprintTrainer';
import { useVoiceprint } from '@/components/voice/useVoiceprint';
import { NEKO_GREETING } from '@/lib/neko-prompt';
import { chat, resolveProvider } from '@/lib/llm-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertTriangle,
  Loader2,
  Cat,
  Settings,
  Fingerprint,
  Cloud,
  HardDrive,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NekoHub() {
  const {
    messages,
    pushMessage,
    state,
    setState,
    setInterim,
    micEnabled,
    setMicEnabled,
    ttsEnabled,
    setTtsEnabled,
    error,
    setError,
    isLoading,
    setLoading,
    clearMessages,
  } = useNekoStore();

  const settings = useSettings();
  const tts = useSpeechSynthesis();
  const voiceprint = useVoiceprint();
  const greetedRef = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceprintOpen, setVoiceprintOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<'groq' | 'ollama'>(
    'groq',
  );
  const [voiceprintCheck, setVoiceprintCheck] = useState<{
    status: 'idle' | 'checking' | 'ok' | 'rejected';
    similarity?: number;
  }>({ status: 'idle' });

  // Aplicar configuración de voz del store de settings al TTS
  useEffect(() => {
    if (tts.selectedVoice && settings.voiceURI) {
      // si está configurada una voz específica, buscarla
      // (por ahora solo guardamos en settings; el hook TTS ya elige la mejor)
    }
  }, [settings.voiceURI, tts.selectedVoice]);

  // Actualiza provider activo
  useEffect(() => {
    let mounted = true;
    void resolveProvider().then((p) => {
      if (mounted) setActiveProvider(p);
    });
    return () => {
      mounted = false;
    };
  }, [settings.provider, settings.ollamaUrl]);

  // --- Verifica voiceprint del hablante antes de aceptar el transcript ---
  const verifySpeaker = useCallback(async (): Promise<boolean> => {
    if (!settings.voiceprintEnabled || !settings.voiceprintData) {
      return true; // sin voiceprint activo, todos pasan
    }
    setVoiceprintCheck({ status: 'checking' });
    try {
      const result = await voiceprint.verifyAgainst(
        settings.voiceprintData,
        1500,
        0.78, // umbral más permisivo para no rechazar al usuario legítimo
      );
      setVoiceprintCheck({
        status: result.matched ? 'ok' : 'rejected',
        similarity: result.similarity,
      });
      if (!result.matched) {
        // Limpiar el estado tras un rato
        setTimeout(() => setVoiceprintCheck({ status: 'idle' }), 3000);
      } else {
        setTimeout(() => setVoiceprintCheck({ status: 'idle' }), 1500);
      }
      return result.matched;
    } catch {
      setVoiceprintCheck({ status: 'idle' });
      return true; // en caso de error, permitir (no bloquear al usuario)
    }
  }, [settings.voiceprintData, settings.voiceprintEnabled, voiceprint]);

  // --- Reconocimiento de voz ---
  const handleFinal = useCallback(
    (text: string) => {
      // Si Neko está hablando, ignoramos la entrada (evita auto-escucharse)
      if (tts.speaking) return;

      // Verificar voiceprint (si está activo, hace la verificación)
      void (async () => {
        const ok = await verifySpeaker();
        if (!ok) {
          // Voz no autorizada: no procesar
          setInterim('');
          return;
        }
        pushMessage('user', text);
        setInterim('');
        void sendToNeko(text);
      })();
    },
    [tts.speaking, verifySpeaker, pushMessage, setInterim],
  );

  const handleInterim = useCallback(
    (text: string) => {
      setInterim(text);
    },
    [setInterim],
  );

  const recognition = useSpeechRecognition({
    lang: settings.lang,
    enabled: micEnabled,
    onFinal: handleFinal,
    onInterim: handleInterim,
  });

  // --- Llamada al LLM (vía llm-service: Groq u Ollama) ---
  const sendToNeko = useCallback(
    async (text: string) => {
      setState('thinking');
      setLoading(true);
      setError(null);
      const history = [
        ...messages
          .filter((m) => m.role !== 'system')
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text },
      ];
      try {
        const { reply, provider } = await chat(history);
        setActiveProvider(provider);
        pushMessage('assistant', reply);
        setLoading(false);

        if (ttsEnabled && tts.supported) {
          setState('speaking');
          tts.speak(reply, {
            onEnd: () => setState('listening'),
          });
        } else {
          setState('listening');
        }
      } catch (e) {
        setLoading(false);
        const msg =
          e instanceof Error ? e.message : 'Error al hablar con Neko';
        setError(msg);
        setState('listening');
      }
    },
    [messages, pushMessage, setLoading, setState, setError, tts, ttsEnabled],
  );

  // --- Estado de escucha según el reconocimiento ---
  useEffect(() => {
    if (micEnabled && recognition.listening && state === 'idle') {
      setState('listening');
    }
    if (!micEnabled && (state === 'listening' || state === 'idle')) {
      setState('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micEnabled, recognition.listening]);

  // --- Saludo inicial cuando se activa el micrófono por primera vez ---
  useEffect(() => {
    if (micEnabled && !greetedRef.current) {
      greetedRef.current = true;
      setTimeout(() => {
        pushMessage('assistant', NEKO_GREETING);
        if (ttsEnabled && tts.supported) {
          setState('speaking');
          tts.speak(NEKO_GREETING, {
            onEnd: () => setState('listening'),
          });
        } else {
          setState('listening');
        }
      }, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micEnabled]);

  const handleQuickAction = (text: string) => {
    if (
      text.toLowerCase().includes('cállate') ||
      text.toLowerCase().includes('silencio')
    ) {
      tts.cancel();
      setState('listening');
      return;
    }
    pushMessage('user', text);
    void sendToNeko(text);
  };

  const enableMic = () => {
    setMicEnabled(true);
  };

  const spectrumMode = state === 'speaking' ? 'output' : 'input';
  const spectrumActive = state !== 'idle';

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.08),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(232,121,249,0.08),transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,211,238,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-border/30 bg-background/40 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 flex items-center justify-center border border-cyan-500/30">
                <Cat className="w-5 h-5 text-cyan-300" />
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-background ${
                  state === 'listening'
                    ? 'bg-cyan-400 animate-pulse'
                    : state === 'speaking'
                      ? 'bg-fuchsia-400 animate-pulse'
                      : state === 'thinking'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-muted-foreground/50'
                }`}
              />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight">
                Neko AI
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                {state === 'listening'
                  ? 'Escuchando…'
                  : state === 'thinking'
                    ? 'Pensando…'
                    : state === 'speaking'
                      ? 'Hablando…'
                      : 'En reposo'}
                <span className="text-cyan-400/70">·</span>
                <span className="flex items-center gap-1">
                  {activeProvider === 'ollama' ? (
                    <>
                      <HardDrive className="w-2.5 h-2.5" /> Ollama
                    </>
                  ) : (
                    <>
                      <Cloud className="w-2.5 h-2.5" /> Groq
                    </>
                  )}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {settings.voiceprintEnabled && settings.voiceprintData && (
              <Badge
                variant="outline"
                className="hidden sm:flex bg-cyan-500/10 border-cyan-500/40 text-cyan-300 text-[10px]"
              >
                <Fingerprint className="w-3 h-3 mr-1" />
                {settings.voiceprintLabel}
              </Badge>
            )}
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 bg-background/30"
              onClick={() => setVoiceprintOpen(true)}
              title="Entrenar mi voz"
            >
              <Fingerprint
                className={`w-4 h-4 ${
                  settings.voiceprintEnabled
                    ? 'text-cyan-400'
                    : 'text-muted-foreground'
                }`}
              />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 bg-background/30"
              onClick={() => setSettingsOpen(true)}
              title="Configuración"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 bg-background/30"
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? 'Silenciar voz' : 'Activar voz'}
            >
              {ttsEnabled ? (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 bg-background/30"
              onClick={() => setMicEnabled(!micEnabled)}
              title={micEnabled ? 'Pausar micrófono' : 'Activar micrófono'}
            >
              {micEnabled ? (
                <Mic className="w-4 h-4 text-cyan-400" />
              ) : (
                <MicOff className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={clearMessages}
            >
              Limpiar
            </Button>
          </div>
        </div>
      </header>

      {/* Banner de voiceprint check */}
      <AnimatePresence>
        {voiceprintCheck.status === 'checking' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-40"
          >
            <Badge className="bg-cyan-500/20 border-cyan-500/40 text-cyan-200 backdrop-blur-md">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Verificando tu voz…
            </Badge>
          </motion.div>
        )}
        {voiceprintCheck.status === 'rejected' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-40"
          >
            <Badge className="bg-red-500/20 border-red-500/40 text-red-200 backdrop-blur-md">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Voz no reconocida{' '}
              {voiceprintCheck.similarity
                ? `(${(voiceprintCheck.similarity * 100).toFixed(0)}%)`
                : ''}
            </Badge>
          </motion.div>
        )}
        {voiceprintCheck.status === 'ok' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-40"
          >
            <Badge className="bg-emerald-500/20 border-emerald-500/40 text-emerald-200 backdrop-blur-md">
              <Fingerprint className="w-3 h-3 mr-1" />
              Voz verificada
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 lg:gap-6">
        {/* Columna izquierda: widgets informativos */}
        <aside className="space-y-4 order-2 lg:order-1">
          <ClockWidget />
          <WeatherWidget />
          <SystemWidget />
        </aside>

        {/* Columna central: espectro + estado */}
        <section className="order-1 lg:order-2 flex flex-col items-center justify-start gap-6">
          <div className="relative flex flex-col items-center">
            <VoiceSpectrum
              mode={spectrumMode}
              active={spectrumActive}
              size={320}
            />
            <div className="mt-4 text-center max-w-md">
              {!micEnabled ? (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Soy Neko. Activa el micrófono para que pueda escucharte.
                  </p>
                  <Button
                    onClick={enableMic}
                    className="bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-200"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Activar micrófono
                  </Button>
                </>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.p
                    key={state}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-sm text-muted-foreground"
                  >
                    {state === 'listening' &&
                      'Te estoy escuchando. Puedes hablarme cuando quieras…'}
                    {state === 'thinking' && 'Procesando lo que dijiste…'}
                    {state === 'speaking' && 'Te estoy respondiendo…'}
                    {state === 'idle' && 'En espera.'}
                  </motion.p>
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Indicadores de soporte */}
          {!recognition.supported && micEnabled && (
            <Card className="p-4 bg-amber-500/10 border-amber-500/40 max-w-md">
              <div className="flex items-start gap-2 text-amber-200 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">
                    Reconocimiento no soportado
                  </p>
                  <p className="text-amber-200/80 text-xs">
                    Tu navegador no soporta Web Speech API. Usa Chrome o Edge
                    para que Neko pueda escucharte.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {!tts.supported && (
            <Card className="p-4 bg-amber-500/10 border-amber-500/40 max-w-md">
              <div className="flex items-start gap-2 text-amber-200 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Voz no soportada</p>
                  <p className="text-amber-200/80 text-xs">
                    Tu navegador no soporta síntesis de voz. Las respuestas se
                    mostrarán en texto.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {error && (
            <Card className="p-4 bg-red-500/10 border-red-500/40 max-w-md">
              <div className="flex items-start gap-2 text-red-200 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Error</p>
                  <p className="text-red-200/80 text-xs">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {recognition.error && (
            <Card className="p-4 bg-red-500/10 border-red-500/40 max-w-md">
              <div className="flex items-start gap-2 text-red-200 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs">{recognition.error}</p>
              </div>
            </Card>
          )}

          {/* Widget de acciones rápidas */}
          <div className="w-full max-w-md">
            <QuickActionsWidget onAction={handleQuickAction} />
          </div>
        </section>

        {/* Columna derecha: chat */}
        <aside className="order-3 lg:order-3 h-[50vh] lg:h-[calc(100vh-7rem)]">
          <ChatPanel />
        </aside>
      </main>

      {/* Footer sutil */}
      <footer className="border-t border-border/30 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-2">
            Neko AI · Fase 2
            <span className="text-cyan-400/50">·</span>
            <span className="flex items-center gap-1">
              {activeProvider === 'ollama' ? (
                <>
                  <HardDrive className="w-2.5 h-2.5" /> Ollama (local)
                </>
              ) : (
                <>
                  <Cloud className="w-2.5 h-2.5" /> Groq (cloud)
                </>
              )}
            </span>
            {settings.voiceprintEnabled && (
              <>
                <span className="text-cyan-400/50">·</span>
                <span className="flex items-center gap-1 text-cyan-300">
                  <Fingerprint className="w-2.5 h-2.5" /> Voiceprint
                </span>
              </>
            )}
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            <span>{messages.length} mensajes</span>
          </span>
        </div>
      </footer>

      {/* Diálogos */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <VoiceprintTrainer
        open={voiceprintOpen}
        onOpenChange={setVoiceprintOpen}
      />
    </div>
  );
}
