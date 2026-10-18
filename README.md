<div align="center">

# 🐱 NEKO AI
### Asistente personal con IA — Hub tipo JARVIS

</div>

<p align="center">
  <em>Una interfaz conversacional always-listening con espectro de voz, widgets funcionales y personalidad propia.</em>
</p>

---

## 📖 Visión General

**Neko** es un asistente web construido con Next.js 16 que funciona como un hub tipo JARVIS: siempre escuchando, con visualización de espectro de voz en tiempo real, widgets funcionales y la capacidad de responder con voz humana. La IA se llama **Neko** y responde por ese nombre.

En esta etapa inicial se integra la **API gratuita de Groq** para pruebas. La arquitectura está diseñada para migrar posteriormente a **Ollama** (IA local) sin reescribir la aplicación.

## ✨ Características (Fase 1)

- 🎙️ **Escucha continua**: no requiere palabra de activación, siempre está escuchando.
- 🔊 **Espectro de voz en tiempo real**: visualización FFT del micrófono y de la voz sintetizada.
- 🗣️ **Voz humana natural**: síntesis de voz con `SpeechSynthesis` y selección de la voz más natural disponible.
- 🤖 **IA "Neko"**: personalidad definida en system prompt; responde por su nombre.
- 🧩 **Widgets funcionales**: reloj, fecha, clima (público), estado del sistema, accesos rápidos.
- 💬 **Chat histórico**: registro de la conversación con scroll automático.
- 🔌 **API de Groq integrada**: servidor Next.js (route handler) que oculta la API key.
- 🎨 **UI estilo HUD cyberpunk**: tema oscuro, acentos cian/magenta, animaciones con Framer Motion.
- 📱 **Responsive**: adaptado a móvil y escritorio.

## 🗺️ Roadmap de Fases

| Fase | Estado | Descripción |
|------|--------|-------------|
| **Fase 1** | ✅ En desarrollo | Hub base + escucha + voz + Groq + widgets |
| **Fase 2** | ⏳ Pendiente | Reconocimiento de speaker (solo tu voz) |
| **Fase 3** | ⏳ Pendiente | Memoria persistente y aprendizaje del usuario |
| **Fase 4** | ⏳ Pendiente | Iniciativa de conversación (Neko te habla solo) |
| **Fase 5** | ⏳ Pendiente | Scripts, información personal y扩展 widgets |
| **Fase 6** | ⏳ Pendiente | Migración a Ollama (IA 100% local) |

📄 Detalle completo en [`docs/PHASES.md`](docs/PHASES.md).

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Estilos**: Tailwind CSS 4 + shadcn/ui
- **Estado**: Zustand
- **Animaciones**: Framer Motion
- **Voz entrada**: Web Speech API (`SpeechRecognition`)
- **Voz salida**: Web Audio API + `SpeechSynthesis`
- **LLM**: Groq API (`llama-3.3-70b-versatile`)
- **Base de datos (futuro)**: Prisma + SQLite

## 🚀 Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/<tu-usuario>/neko-ai.git
cd neko-ai

# 2. Instalar dependencias
bun install   # o: npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local y añade tu GROQ_API_KEY (https://console.groq.com/keys)

# 4. Ejecutar en desarrollo
bun run dev

# 5. Abrir http://localhost:3000
```

> ⚠️ **Requisitos del navegador**: el micrófono solo funciona en `localhost` o sobre **HTTPS**. Chrome/Edge recomendados para `SpeechRecognition`.

## 🔑 Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GROQ_API_KEY` | API key gratuita de Groq | `gsk_abc...` |
| `GROQ_MODEL` | Modelo a usar | `llama-3.3-70b-versatile` |
| `NEKO_VOICE_URI` | (Opcional) URI de la voz preferida para TTS | auto-detect |

## 📁 Estructura del proyecto

```
neko-ai/
├── docs/                    # Documentación
│   ├── ARCHITECTURE.md
│   ├── PHASES.md
│   └── VOICE.md
├── src/
│   ├── app/
│   │   ├── page.tsx         # Hub principal (única ruta visible)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       └── chat/route.ts # Endpoint que habla con Groq
│   ├── components/
│   │   ├── ui/              # shadcn/ui
│   │   ├── hub/             # Componentes del hub
│   │   │   ├── VoiceSpectrum.tsx
│   │   │   ├── WidgetGrid.tsx
│   │   │   ├── ClockWidget.tsx
│   │   │   ├── WeatherWidget.tsx
│   │   │   ├── SystemWidget.tsx
│   │   │   └── ChatPanel.tsx
│   │   └── voice/           # Hooks de voz
│   │       ├── useSpeechRecognition.ts
│   │       └── useSpeechSynthesis.ts
│   ├── hooks/
│   ├── lib/
│   │   ├── groq.ts          # Cliente de Groq
│   │   ├── neko-prompt.ts   # Personalidad de Neko
│   │   └── utils.ts
│   └── types/
├── prisma/
├── public/
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

## 🔒 Privacidad

- La API key de Groq **nunca** se expone al cliente: vive solo en el servidor Next.js.
- El audio del micrófono se procesa **100% en el navegador**; nunca se sube crudo, solo se envía la transcripción a Groq.
- En la **Fase 6** (Ollama) todo el razonamiento de la IA será local, sin enviar nada a la nube.

## 📜 Licencia

MIT — libre uso, modificación y distribución. Ver [`LICENSE`](LICENSE).

## 🤝 Contribuir

Este es un proyecto personal, pero los issues y PRs son bienvenidos. Por favor lee [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) antes de proponer cambios estructurales.

---

<p align="center">
  <sub>Hecho con 🐱 por un humano, para humanos que hablan con máquinas.</sub>
</p>
