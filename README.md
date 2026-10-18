<div align="center">

# 🐱 NEKO AI
### Asistente personal con IA — Hub tipo JARVIS

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![Groq](https://img.shields.io/badge/Groq-LLM-orange)
![Ollama](https://img.shields.io/badge/Ollama-local-blue)
![License](https://img.shields.io/badge/license-MIT-green)

![CI](https://github.com/Lean031110/neko-ai/actions/workflows/ci.yml/badge.svg)

</div>

<p align="center">
  <em>Una interfaz conversacional always-listening con espectro de voz, widgets funcionales y personalidad propia. Soporta Groq (cloud) y Ollama (IA 100% local).</em>
</p>

---

## 📖 Visión General

**Neko** es un asistente web construido con Next.js 16 que funciona como un hub tipo JARVIS: siempre escuchando, con visualización de espectro de voz en tiempo real, widgets funcionales y la capacidad de responder con voz humana. La IA se llama **Neko** y responde por ese nombre.

La aplicación puede funcionar con **dos backends de IA intercambiables desde la UI**:

| Backend | Descripción | Cuándo usarlo |
|---------|-------------|---------------|
| ☁️ **Groq** | Cloud, gratuito, latencia baja (~0.5s) | Pruebas, uso diario sin infraestructura |
| 💻 **Ollama** | 100% local, privado, sin internet | Privacidad total, control del modelo |
| 🔄 **Auto** | Detecta Ollama, si no responde usa Groq | Recomendado para usuarios con Ollama |

## ✨ Características

### Fase 1 — Hub base ✅
- 🎙️ **Escucha continua**: no requiere palabra de activación, siempre está escuchando
- 🔊 **Espectro de voz en tiempo real**: visualización FFT del micrófono
- 🗣️ **Voz humana natural**: síntesis con `SpeechSynthesis`, selección automática de la voz más natural
- 🤖 **IA "Neko"**: personalidad definida en system prompt; responde por su nombre
- 🧩 **Widgets funcionales**: reloj, fecha, clima (sin API key), estado del sistema, accesos rápidos
- 💬 **Chat histórico**: registro de la conversación con scroll automático
- 🎨 **UI cyberpunk**: tema oscuro, acentos cian/magenta, animaciones con Framer Motion
- 📱 **Responsive**: adaptado a móvil y escritorio

### Fase 2 — Voiceprint ✅
- 🔐 **Solo tu voz**: entrena a Neko con 3 muestras y responde únicamente a ti
- 🎛️ **Selector de proveedor de IA en la UI**: Groq, Ollama o Auto
- 🔌 **Ollama integrado**: detección automática, lista de modelos, prueba de conexión
- 🔑 **API key de Groq configurable** sin tocar código (guardada en localStorage)
- 🎚️ **Ajustes de voz**: velocidad, tono, idioma

## 🗺️ Roadmap

| Fase | Estado | Descripción |
|------|--------|-------------|
| **1** | ✅ Listo | Hub base + escucha + voz + Groq/Ollama + widgets |
| **2** | ✅ Listo | Voiceprint + selector de proveedor IA |
| **3** | ⏳ Pendiente | Memoria persistente y aprendizaje del usuario |
| **4** | ⏳ Pendiente | Iniciativa de conversación (Neko te habla solo) |
| **5** | ⏳ Pendiente | Scripts, información personal, widgets avanzados |
| **6** | ⏳ Pendiente | STT local con Whisper, TTS con Piper |

📄 Detalle completo en [`docs/PHASES.md`](docs/PHASES.md).

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Estilos**: Tailwind CSS 4 + shadcn/ui
- **Estado**: Zustand (con persistencia para settings)
- **Animaciones**: Framer Motion
- **Voz entrada**: Web Speech API (`SpeechRecognition`)
- **Voz salida**: Web Audio API + `SpeechSynthesis`
- **LLM Cloud**: Groq SDK (`groq-sdk`) con `llama-3.3-70b-versatile`
- **LLM Local**: Ollama (`/api/chat` directo desde el navegador)
- **CI/CD**: GitHub Actions

## 🚀 Instalación local

```bash
# 1. Clonar
git clone https://github.com/Lean031110/neko-ai.git
cd neko-ai

# 2. Instalar dependencias
bun install   # o: npm install

# 3. (Opcional) Configurar Groq por defecto en el servidor
cp .env.example .env.local
# Edita .env.local con tu GROQ_API_KEY (https://console.groq.com/keys)
# Si no lo haces, podrás meterla igualmente desde la UI de Neko.

# 4. Ejecutar
bun run dev

# 5. Abrir http://localhost:3000
```

### Activar Ollama (opcional, IA 100% local)

1. Instala Ollama: <https://ollama.com>
2. Descarga un modelo: `ollama pull llama3.2`
3. Inicia Ollama con CORS habilitado:
   ```bash
   OLLAMA_ORIGINS="*" ollama serve
   ```
4. En Neko, abre ⚙️ Configuración → pestaña "IA" → selecciona "Ollama"
5. Pulsa "Probar conexión" y selecciona el modelo

> ⚠️ **Requisitos del navegador**: el micrófono solo funciona en `localhost` o sobre **HTTPS**. Chrome/Edge recomendados para `SpeechRecognition`.

## 🔑 Variables de entorno

| Variable | Dónde | Descripción |
|----------|-------|-------------|
| `GROQ_API_KEY` | server | API key de Groq (opcional si se introduce en la UI) |
| `GROQ_MODEL` | server | Modelo por defecto |
| `LLM_PROVIDER` | server | `auto` \| `groq` (Ollama siempre es cliente) |
| `NEXT_PUBLIC_NEKO_LANG` | client | Idioma para STT/TTS |
| `NEXT_PUBLIC_NEKO_SPEAK_RATE` | client | Velocidad de TTS |
| `NEXT_PUBLIC_NEKO_SPEAK_PITCH` | client | Tono de TTS |

## 📁 Estructura del proyecto

```
neko-ai/
├── .github/workflows/        # CI: lint + build
├── docs/                      # Documentación
│   ├── ARCHITECTURE.md
│   ├── PHASES.md
│   └── VOICE.md
├── src/
│   ├── app/
│   │   ├── page.tsx           # Hub principal (única ruta visible)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/chat/route.ts  # Endpoint Groq (oculta API key)
│   ├── components/
│   │   ├── ui/                # shadcn/ui
│   │   ├── hub/               # Componentes del hub
│   │   │   ├── NekoHub.tsx
│   │   │   ├── VoiceSpectrum.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ClockWidget.tsx
│   │   │   ├── WeatherWidget.tsx
│   │   │   ├── SystemWidget.tsx
│   │   │   ├── QuickActionsWidget.tsx
│   │   │   └── SettingsDialog.tsx
│   │   └── voice/
│   │       ├── useSpeechRecognition.ts
│   │       ├── useSpeechSynthesis.ts
│   │       ├── useVoiceprint.ts
│   │       └── VoiceprintTrainer.tsx
│   ├── lib/
│   │   ├── groq.ts            # Cliente Groq (server-side)
│   │   ├── ollama.ts          # Cliente Ollama (browser-side)
│   │   ├── llm-service.ts     # Selector unificado de proveedor
│   │   ├── neko-prompt.ts     # Personalidad de Neko
│   │   └── utils.ts
│   ├── store/
│   │   ├── neko.ts            # Estado de la conversación
│   │   └── settings.ts        # Settings persistentes (localStorage)
│   └── types/index.ts
├── prisma/
├── public/
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

## 🔒 Privacidad

- La API key de Groq **nunca** se expone al cliente: vive solo en el servidor Next.js.
- Si introduces tu API key en la UI, se guarda solo en **localStorage** del navegador y se envía únicamente a tu propio servidor (`/api/chat`) por header.
- Cuando usas **Ollama**, las peticiones van directas del navegador a tu instancia local. No pasan por ningún servidor.
- El voiceprint (tu firma de voz) se guarda en **localStorage**, nunca se sube a ninguna nube.
- El audio del micrófono se procesa **100% en el navegador**; nunca se sube crudo, solo se envía la transcripción a Groq.

## 🧪 CI/CD

El proyecto incluye un workflow de GitHub Actions (`.github/workflows/ci.yml`) que en cada push/PR:
1. Instala dependencias con Bun
2. Ejecuta ESLint (`bun run lint`)
3. Compila el proyecto (`bun run build`)

## 📜 Licencia

MIT — libre uso, modificación y distribución. Ver [`LICENSE`](LICENSE).

---

<p align="center">
  <sub>Hecho con 🐱 por un humano, para humanos que hablan con máquinas.</sub>
</p>
