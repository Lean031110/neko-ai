# 🗺️ Fases de implementación de Neko AI

Este documento describe, fase por fase, qué se construye, cómo se construye y los criterios de aceptación. Cada fase es **autocontenida y desplegable**.

---

## 🟦 Fase 1 — Hub base + escucha + voz + Groq + widgets
**Estado:** ✅ En desarrollo

### Objetivo
Tener un hub web funcional tipo JARVIS donde Neko escucha, responde y muestra visualizaciones + widgets útiles.

### Tareas
1. **Setup Next.js 16 + TypeScript + Tailwind + shadcn/ui**
   - Verificar `bun install` y `bun run dev`
   - Asegurar tema oscuro por defecto
2. **Integración con Groq**
   - Instalar `groq-sdk` (o usar `fetch` directo)
   - Crear `src/lib/groq.ts` con cliente tipado
   - Crear `src/app/api/chat/route.ts` (POST handler)
   - Definir system prompt de Neko en `src/lib/neko-prompt.ts`
3. **Reconocimiento de voz (STT)**
   - Hook `useSpeechRecognition` (`webkitSpeechRecognition`)
   - Auto-restart en modo continuo
   - Permiso de micrófono con UX clara
4. **Síntesis de voz (TTS)**
   - Hook `useSpeechSynthesis`
   - Selección automática de la voz en español más natural
   - Configuración de `rate`, `pitch`, `volume`
5. **Estado global (Zustand)**
   - `useNekoStore` con messages, isListening, isSpeaking, transcript
6. **UI del hub**
   - Layout grid responsive con: VoiceSpectrum (centro), WidgetGrid (laterales), ChatPanel (abajo)
   - Tema cyberpunk/HUD
   - Animaciones Framer Motion
7. **Espectro de voz**
   - `AudioContext` + `AnalyserNode` + `getUserMedia`
   - Canvas con barras FFT animadas
   - Color cian cuando escucha, magenta cuando Neko habla
8. **Widgets funcionales**
   - ClockWidget (reloj + fecha)
   - WeatherWidget (clima vía `wttr.in` o `open-meteo.com`, sin API key)
   - SystemWidget (batería, idioma, online/offline)
   - QuickActionsWidget (botones: "Hola Neko", "Qué hora es", etc.)
9. **ChatPanel**
   - Burbujas usuario/asistente
   - Auto-scroll
   - Indicador "Neko está escribiendo…"
10. **Preparar GitHub**
    - `.gitignore` (node_modules, .env, .next, dev.log)
    - `LICENSE` (MIT)
    - `README.md`, `docs/`
    - Estructura de carpetas limpia

### Criterios de aceptación
- ✅ Al abrir la web, Neko saluda por voz: "Hola, soy Neko…"
- ✅ El usuario habla y el espectro reacciona
- ✅ Al decir "Hola Neko, ¿qué hora es?" responde correctamente
- ✅ Los widgets muestran datos reales (hora, clima, batería)
- ✅ La API key nunca aparece en el bundle del cliente
- ✅ `bun run lint` pasa sin errores
- ✅ La app funciona en Chrome/Edge (móvil y desktop)

---

## 🟨 Fase 2 — Reconocimiento de speaker (solo tu voz)
**Estado:** ⏳ Pendiente

### Objetivo
Que Neko solo responda a la voz del usuario registrado. Otras voces se ignoran o se desestiman.

### Tareas
1. **Migrar STT a Whisper (Groq Whisper o local)**
   - Grabar chunks de audio con `MediaRecorder`
   - Enviar a `/api/transcribe` que llama a Groq Whisper
   - Reemplazar progresivamente `SpeechRecognition` por Whisper
2. **Extracción de embeddings de voz**
   - Evaluar opciones: `transformers.js` con modelo `wav2vec` o `speechbrain`
   - Alternativa: API externa (e.g. Hume, Speechmatics)
   - Almacenar vector de referencia del usuario
3. **Registro inicial**
   - Pantalla de onboarding: "Di 'Hola Neko, soy yo' tres veces"
   - Calcular embedding promedio
   - Guardar en `localStorage` (Fase 2) o Prisma (Fase 3)
4. **Verificación en runtime**
   - Cada utterance reconocido genera embedding
   - Coseno similitud con el vector de referencia
   - Si similitud > 0.85 → procesar; si no → ignorar
5. **UI de configuración de voces adicionales**
   - Sección "Voces autorizadas" en panel de ajustes
   - Añadir/eliminar voces

### Criterios de aceptación
- ✅ Otra persona habla y Neko no responde
- ✅ El usuario habla y Neko responde normalmente
- ✅ Se pueden añadir voces adicionales desde la UI
- ✅ El onboarding toma < 30 segundos

---

## 🟩 Fase 3 — Memoria persistente y aprendizaje
**Estado:** ⏳ Pendiente

### Objetivo
Que Neko recuerde cosas importantes entre sesiones y aprenda del usuario.

### Tareas
1. **Base de datos Prisma + SQLite**
   - Modelo `Memory` (id, type, content, createdAt, importance, tags[])
   - Modelo `UserProfile` (name, preferences JSON, voiceEmbedding)
2. **Extracción automática de hechos**
   - Tras cada mensaje del usuario, un segundo LLM call extrae "hechos dignos de recordar"
   - Ej: "trabajo en Madrid", "mi perro se llama Loki", "odio el pescado"
3. **Inyección de memoria en el prompt**
   - Antes de responder, cargar top-K recuerdos relevantes (RAG básico)
   - Embeddings de texto (Groq embeddings) + cosine similarity
4. **Consolidación**
   - Tarea periódica: agrupar recuerdos similares, descartar antiguos
5. **Panel "Lo que Neko recuerda"**
   - Lista visual de recuerdos
   - Editar / borrar individualmente

### Criterios de aceptación
- ✅ El usuario dice "mi perro se llama Loki" y al día siguiente Neko lo recuerda
- ✅ El usuario puede ver y borrar lo que Neko recuerda
- ✅ Los recuerdos relevantes se inyectan en el contexto

---

## 🟧 Fase 4 — Iniciativa de conversación
**Estado:** ⏳ Pendiente

### Objetivo
Neko toma la iniciativa: da reportes, recuerda cosas importantes o inicia charla sin que se le hable.

### Tareas
1. **Scheduler de tareas**
   - Cron interno que dispara eventos (cada mañana, cada hora, etc.)
2. **Tipos de iniciativas**
   - **Reporte matutino**: hora, clima, agenda, recordatorios
   - **Recordatorios**: "mencionaste que tenías reunión a las 15:00"
   - **Charla casual**: cada X minutos de silencio, Neko comenta algo
3. **Proactividad basada en memoria**
   - Si aprendió que te gusta el café, puede comentar algo al respecto
4. **UI de notificaciones tipo "heads-up"**
   - Aparece sutilmente, no bloquea la pantalla
   - Botón "dime más" para conversar
5. **Configuración**
   - Activar/desactivar proactividad
   - Definir horarios "no molestar"

### Criterios de aceptación
- ✅ Neko saluda sola por la mañana con el reporte del día
- ✅ Respeta los horarios "no molestar"
- ✅ El usuario puede apagar la proactividad por completo

---

## 🟪 Fase 5 — Scripts, información personal y widgets avanzados
**Estado:** ⏳ Pendiente

### Objetivo
Ampliar capacidades: ejecutar scripts, gestionar información del usuario, más widgets.

### Tareas
1. **Sistema de plugins/scripts**
   - Widgets que ejecutan lógica personalizada (e.g. "abrir Spotify", "enviar mail")
   - Definir API interna `neko.run(action, params)`
2. **Widgets avanzados**
   - Calendario (Google Calendar API o .ics local)
   - Notas rápidas
   - Tareas pendientes (todo list)
   - Control de música (Spotify Web API)
   - Visor de notificaciones del sistema
3. **Información personal del usuario**
   - Sección "Sobre mí" con datos editables
   - Neko los usa como contexto
4. **Búsqueda web**
   - Integrar DuckDuckGo o Brave Search API
   - Cuando el usuario pregunta algo actual, Neko busca primero
5. **Dashboard configurable**
   - Arrastrar y soltar widgets
   - Persistencia del layout

### Criterios de aceptación
- ✅ Se pueden añadir widgets de un catálogo
- ✅ Neko puede buscar información actual en la web
- ✅ Los scripts pueden ejecutarse desde la conversación

---

## 🟥 Fase 6 — Migración a Ollama (IA 100% local)
**Estado:** ⏳ Pendiente

### Objetivo
Que Neko funcione sin tocar la nube: LLM, STT y TTS locales.

### Tareas
1. **LLM local con Ollama**
   - `OllamaClient` implementando `LLMClient`
   - Modelos recomendados: `llama3.2`, `qwen2.5`, `phi4`
   - Selector de modelo en UI
2. **STT local con Whisper.cpp o whisper.cpp WASM**
   - Transcripción en el navegador o en un servicio local
3. **TTS local con Piper o Coqui TTS**
   - Voces mucho más naturales que `SpeechSynthesis`
   - Soporte para clonar voz del usuario
4. **Selector de proveedor**
   - `LLM_PROVIDER=ollama | groq`
   - Comparativa lado a lado en UI
5. **Docker compose** para despliegue local
   - Servicio `neko-web` + `neko-ollama` + `neko-whisper` + `neko-tts`

### Criterios de aceptación
- ✅ Apagando internet, Neko sigue funcionando
- ✅ La latencia total (input → output) es < 3 s en hardware medio
- ✅ Las voces suenan más naturales que las del navegador

---

## 📊 Resumen

| Fase | Estimación | Dependencia |
|------|------------|-------------|
| 1 — Hub base | 1 sesión | — |
| 2 — Speaker ID | 1-2 sesiones | Fase 1 |
| 3 — Memoria | 2 sesiones | Fase 1 |
| 4 — Iniciativa | 1 sesión | Fase 3 |
| 5 — Plugins + widgets | 2-3 sesiones | Fase 3 |
| 6 — Ollama local | 2 sesiones | Fase 1 |

> Cada fase termina con un commit etiquetado (`v1.0`, `v2.0`, …) y un release en GitHub.
