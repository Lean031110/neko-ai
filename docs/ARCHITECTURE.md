# 📐 Arquitectura de Neko AI

## Visión general del sistema

Neko AI es una SPA (single-page application) construida sobre Next.js 16 con App Router. Toda la interacción ocurre en la ruta `/`. El backend expone un único endpoint (`/api/chat`) que actúa como proxy seguro hacia Groq.

```
┌──────────────────────────────────────────────────────────────┐
│                       NAVEGADOR (Cliente)                     │
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────────┐   │
│  │  Microphone │──▶│ SpeechRecog │──▶│  useNekoStore    │   │
│  │  (AudioIn)  │   │ (Web API)   │   │  (Zustand)       │   │
│  └─────────────┘   └─────────────┘   └────────┬─────────┘   │
│                                                │             │
│  ┌─────────────┐   ┌─────────────┐           │             │
│  │ AnalyserNode│◀──│ AudioContext │           ▼             │
│  │ (FFT)       │   │  + micStream │   ┌──────────────────┐  │
│  └─────────────┘   └─────────────┘   │  fetch /api/chat │  │
│         │                            └────────┬─────────┘  │
│         ▼                                     │            │
│  ┌─────────────┐                              ▼            │
│  │  VoiceSpec  │                     ┌──────────────────┐  │
│  │  (Canvas)   │                     │  SpeechSynthesis  │  │
│  └─────────────┘                     │  (Web API)        │  │
│                                      └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                                                │
                                                ▼ (HTTPS, POST)
┌──────────────────────────────────────────────────────────────┐
│                    SERVIDOR NEXT.JS (Route Handler)          │
│                                                              │
│   POST /api/chat  ──▶  groq.chat.completions.create()        │
│   - Inyecta system prompt "Neko"                             │
│   - Adjunta historial reciente                               │
│   - Oculta GROQ_API_KEY                                      │
└──────────────────────────────────────────────────────────────┘
                                                │
                                                ▼ (HTTPS)
┌──────────────────────────────────────────────────────────────┐
│                      GROQ API (Cloud)                        │
│         Modelo: llama-3.3-70b-versatile (o el configurado)   │
└──────────────────────────────────────────────────────────────┘
```

## Componentes principales

### 1. `useNekoStore` (Zustand)
Estado global de la conversación:
- `messages: Message[]` — historial del chat
- `isListening: boolean` — micrófono activo
- `isSpeaking: boolean` — Neko hablando
- `transcript: string` — texto parcial reconocido
- `addWidget(widget)` — para widgets dinámicos
- `pushUserMessage(text)` / `pushAssistantMessage(text)` — acciones

### 2. `useSpeechRecognition` (hook)
Envoltorio de `webkitSpeechRecognition`:
- Lanza el reconocimiento al montar
- Re-inicia automáticamente cuando termina (modo continuo)
- Emite el texto final a través de callback
- Filtra ruido y mensajes vacíos

### 3. `useSpeechSynthesis` (hook)
- Carga las voces disponibles al iniciar
- Selecciona la voz más "humana" (preferencia: español neutro o configurable)
- Sintetiza texto con `SpeechSynthesisUtterance`
- Ajusta `rate`, `pitch` y `volume` para sonar natural

### 4. `VoiceSpectrum` (componente)
- Canvas que dibuja barras FFT en tiempo real
- Modos: `input` (micrófono) y `output` (voz de Neko)
- Animación fluida con `requestAnimationFrame`
- Acentos cian/magenta según el modo

### 5. `WidgetGrid` (componente)
Grid responsive (CSS Grid) con widgets:
- **ClockWidget**: hora, fecha, zona horaria
- **WeatherWidget**: clima vía API pública (sin key)
- **SystemWidget**: batería, red, idioma del navegador
- **QuickActionsWidget**: botones para "Hola Neko", "Qué hora es", etc.

### 6. `ChatPanel` (componente)
- Lista scrollable de mensajes con burbujas user/assistant
- Indicador de "Neko está escribiendo…"
- Auto-scroll al último mensaje
- Transcripción parcial en la parte inferior mientras escuchas

### 7. `/api/chat` (route handler server-side)
```ts
// Pseudocódigo
export async function POST(req: Request) {
  const { messages } = await req.json();
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    messages: [NEKO_SYSTEM_PROMPT, ...messages],
    temperature: 0.7,
  });
  return Response.json({ reply: completion.choices[0].message.content });
}
```

## Personalidad de Neko (`lib/neko-prompt.ts`)

Neko se define con un system prompt que fija:
- **Nombre**: Neko (responde siempre presentándose como tal)
- **Tono**: cercano, curioso, ligeramente juguetón (gatuno), pero servicial y técnico cuando hace falta
- **Idioma**: español nativo del usuario
- **Estilo de respuesta**: frases cortas y claras para síntesis de voz; evita markdown pesado en respuestas habladas
- **Autoconciencia**: sabe que es un asistente y por qué existe

## Decisiones de diseño

### ¿Por qué Web Speech API en lugar de Whisper?
- **Fase 1** prioriza velocidad de iteración. `SpeechRecognition` ya viene en Chrome y no requiere servidor.
- En **Fase 2** migraremos a Whisper (local o Groq) para mejorar precisión y poder hacer speaker recognition.

### ¿Por qué Groq y no OpenAI?
- Groq es **gratuito** y suficientemente rápido para conversación en tiempo real.
- La abstracción del cliente (`lib/groq.ts`) permite cambiar el proveedor en una sola línea.

### ¿Por qué un endpoint `/api/chat`?
- Para mantener la API key en el servidor, nunca en el cliente.
- Facilita migrar a Ollama: solo cambia la URL base y el modelo.

### ¿Por qué Zustand y no Context API?
- Mejor rendimiento (no re-render innecesario).
- Acciones simples, sin providers anidados.

## Migración a Ollama (Fase 6)

El cliente `lib/groq.ts` expondrá una interfaz:
```ts
interface LLMClient {
  chat(messages: Message[]): Promise<string>;
}
```
- Fase 1: `GroqClient` implementa `LLMClient`
- Fase 6: `OllamaClient` implementa `LLMClient` (URL: `http://localhost:11434/api/chat`)
- El endpoint `/api/chat` selecciona el cliente según `process.env.LLM_PROVIDER`

## Seguridad

- ✅ API key solo en servidor
- ✅ CORS estricto en `/api/chat`
- ✅ Rate limit básico (futuro: Fase 3)
- ⚠️ El navegador pedirá permiso explícito al micrófono (no se puede saltar)

## Limitaciones conocidas (Fase 1)

- `SpeechRecognition` no está soportado en Firefox (usar Chrome/Edge)
- La calidad de la síntesis de voz depende del SO (mejor en Windows y macOS que en Linux)
- No distingue hablantes: responderá a cualquiera que hable (se resuelve en Fase 2)
- No tiene memoria entre sesiones (se resuelve en Fase 3)
