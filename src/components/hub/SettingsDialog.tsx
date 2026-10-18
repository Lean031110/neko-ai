'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Cloud,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Volume2,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useSettings, type LLMProvider } from '@/store/settings';
import { listOllamaModels, type OllamaModel } from '@/lib/ollama';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const s = useSettings();
  const [showKey, setShowKey] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<
    'idle' | 'checking' | 'ok' | 'fail'
  >('idle');
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  const checkOllama = async () => {
    setOllamaStatus('checking');
    setOllamaError(null);
    try {
      const models = await listOllamaModels(s.ollamaUrl);
      setOllamaModels(models);
      setOllamaStatus('ok');
    } catch (e) {
      setOllamaStatus('fail');
      setOllamaError(e instanceof Error ? e.message : 'Error desconocido');
      setOllamaModels([]);
    }
  };

  // Cuando se abre, comprobar Ollama automáticamente si está configurado
  useEffect(() => {
    if (open && s.ollamaUrl && ollamaStatus === 'idle') {
      void checkOllama();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-md border-border/60 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            Configuración de Neko
          </DialogTitle>
          <DialogDescription>
            Elige el proveedor de IA y personaliza la voz. Tus ajustes se
            guardan en este navegador (localStorage).
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="llm" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-background/40">
            <TabsTrigger value="llm" className="text-xs">
              IA
            </TabsTrigger>
            <TabsTrigger value="voice" className="text-xs">
              Voz
            </TabsTrigger>
            <TabsTrigger value="about" className="text-xs">
              Acerca de
            </TabsTrigger>
          </TabsList>

          {/* === Tab: LLM === */}
          <TabsContent value="llm" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Proveedor de IA
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      id: 'auto',
                      label: 'Auto',
                      desc: 'Ollama si responde, si no Groq',
                      icon: RefreshCw,
                    },
                    {
                      id: 'groq',
                      label: 'Groq',
                      desc: 'Nube (rápido y gratuito)',
                      icon: Cloud,
                    },
                    {
                      id: 'ollama',
                      label: 'Ollama',
                      desc: 'Local (privado)',
                      icon: HardDrive,
                    },
                  ] as { id: LLMProvider; label: string; desc: string; icon: typeof Cloud }[]
                ).map((opt) => {
                  const Icon = opt.icon;
                  const active = s.provider === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => s.set({ provider: opt.id })}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        active
                          ? 'border-cyan-500/60 bg-cyan-500/10'
                          : 'border-border/40 bg-background/30 hover:border-border/60'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mb-1.5 ${active ? 'text-cyan-400' : 'text-muted-foreground'}`}
                      />
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* === Groq settings === */}
            <div className="space-y-3 rounded-lg border border-border/40 p-3 bg-background/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                  Groq
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Cloud
                </Badge>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="groq-key" className="text-xs">
                  API key (opcional)
                </Label>
                <div className="relative">
                  <Input
                    id="groq-key"
                    type={showKey ? 'text' : 'password'}
                    value={s.groqApiKey}
                    onChange={(e) => s.set({ groqApiKey: e.target.value })}
                    placeholder="gsk_…  (si lo dejas vacío, usa el del servidor)"
                    className="bg-background/50 pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Consigue tu key gratuita en{' '}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline"
                  >
                    console.groq.com/keys
                  </a>
                  . Se guarda solo en tu navegador.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="groq-model" className="text-xs">
                  Modelo
                </Label>
                <Input
                  id="groq-model"
                  value={s.groqModel}
                  onChange={(e) => s.set({ groqModel: e.target.value })}
                  placeholder="llama-3.3-70b-versatile"
                  className="bg-background/50 font-mono text-xs"
                />
              </div>
            </div>

            {/* === Ollama settings === */}
            <div className="space-y-3 rounded-lg border border-border/40 p-3 bg-background/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <HardDrive className="w-3.5 h-3.5 text-fuchsia-400" />
                  Ollama (IA local)
                </div>
                <div className="flex items-center gap-2">
                  {ollamaStatus === 'ok' && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
                    </Badge>
                  )}
                  {ollamaStatus === 'fail' && (
                    <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[10px]">
                      <AlertCircle className="w-3 h-3 mr-1" /> Sin conexión
                    </Badge>
                  )}
                  {ollamaStatus === 'checking' && (
                    <Badge variant="outline" className="text-[10px]">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Comprobando…
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ollama-url" className="text-xs">
                  URL de Ollama
                </Label>
                <Input
                  id="ollama-url"
                  value={s.ollamaUrl}
                  onChange={(e) => s.set({ ollamaUrl: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="bg-background/50 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ollama-model" className="text-xs">
                  Modelo
                </Label>
                {ollamaModels.length > 0 ? (
                  <select
                    id="ollama-model"
                    value={s.ollamaModel}
                    onChange={(e) => s.set({ ollamaModel: e.target.value })}
                    className="w-full rounded-md border border-border/40 bg-background/50 px-3 py-2 text-xs font-mono"
                  >
                    {ollamaModels.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({(m.size / 1e9).toFixed(1)} GB)
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="ollama-model"
                    value={s.ollamaModel}
                    onChange={(e) => s.set({ ollamaModel: e.target.value })}
                    placeholder="llama3.2"
                    className="bg-background/50 font-mono text-xs"
                  />
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={checkOllama}
                disabled={ollamaStatus === 'checking'}
                className="w-full"
              >
                {ollamaStatus === 'checking' ? (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-2" />
                )}
                Probar conexión
              </Button>
              {ollamaError && (
                <p className="text-[10px] text-red-300 flex items-start gap-1.5">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  {ollamaError}
                </p>
              )}
              <details className="text-[10px] text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  ¿Cómo activar CORS en Ollama?
                </summary>
                <div className="mt-2 space-y-1.5 p-2 bg-background/40 rounded-md">
                  <p>
                    Para que el navegador pueda hablar con Ollama, debes
                    permitir CORS:
                  </p>
                  <pre className="text-[10px] bg-background/60 p-2 rounded font-mono overflow-x-auto">
{`# Linux/macOS
OLLAMA_ORIGINS="*" ollama serve

# O permanentemente en ~/.ollama/config.json
# Ver: https://ollama.com/blog/cors`}
                  </pre>
                  <p>Y descarga un modelo:</p>
                  <pre className="text-[10px] bg-background/60 p-2 rounded font-mono">
{`ollama pull llama3.2`}
                  </pre>
                </div>
              </details>
            </div>
          </TabsContent>

          {/* === Tab: Voz === */}
          <TabsContent value="voice" className="space-y-4 mt-4">
            <div className="space-y-3 rounded-lg border border-border/40 p-3 bg-background/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="tts-enabled" className="text-sm">
                  Síntesis de voz (TTS)
                </Label>
                <Badge variant="outline" className="text-[10px]">
                  Salida
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rate" className="text-xs">
                    Velocidad ({s.speakRate.toFixed(2)})
                  </Label>
                  <input
                    id="rate"
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={s.speakRate}
                    onChange={(e) =>
                      s.set({ speakRate: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pitch" className="text-xs">
                    Tono ({s.speakPitch.toFixed(2)})
                  </Label>
                  <input
                    id="pitch"
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={s.speakPitch}
                    onChange={(e) =>
                      s.set({ speakPitch: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lang" className="text-xs">
                  Idioma
                </Label>
                <Input
                  id="lang"
                  value={s.lang}
                  onChange={(e) => s.set({ lang: e.target.value })}
                  className="bg-background/50 font-mono text-xs"
                  placeholder="es-ES"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border/40 p-3 bg-background/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Voiceprint (Fase 2)</div>
                  <div className="text-[10px] text-muted-foreground">
                    Solo tu voz puede hablar con Neko
                  </div>
                </div>
                <Switch
                  checked={s.voiceprintEnabled}
                  onCheckedChange={(v) =>
                    s.set({
                      voiceprintEnabled: v,
                      // Si se desactiva sin voiceprint data, mantener null
                      voiceprintData: v ? s.voiceprintData : s.voiceprintData,
                    })
                  }
                  disabled={!s.voiceprintData}
                />
              </div>
              {!s.voiceprintData ? (
                <p className="text-[10px] text-muted-foreground">
                  Necesitas entrenar tu voiceprint primero (botón
                  &quot;Voz&quot; en la cabecera).
                </p>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Voiceprint de <strong>{s.voiceprintLabel}</strong> activo.
                </div>
              )}
            </div>
          </TabsContent>

          {/* === Tab: Acerca de === */}
          <TabsContent value="about" className="space-y-3 mt-4 text-sm">
            <div className="rounded-lg border border-border/40 p-3 bg-background/20">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Neko AI</strong> — Fase 2.
                Asistente personal con IA que puede funcionar en la nube
                (Groq) o 100% local (Ollama).
              </p>
              <p className="text-muted-foreground mt-2">
                <strong className="text-foreground">Privacidad:</strong> tu API
                key de Groq y tu voiceprint se guardan solo en este navegador.
                Nunca se suben a ningún servidor externo.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong className="text-foreground">Modo Ollama:</strong>{' '}
                cuando activas Ollama, las peticiones van directas desde tu
                navegador a tu instancia local. La IA corre en tu máquina.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            size="sm"
            variant="outline"
            onClick={() => s.reset()}
            className="text-xs"
          >
            Restaurar valores
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-100"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
