# 🎙️ Documentación de Voz — Neko AI

Este documento cubre los detalles técnicos del pipeline de voz: entrada (STT), salida (TTS) y visualización (espectro).

---

## 1. Reconocimiento de voz (STT)

### Fase 1 — Web Speech API (`SpeechRecognition`)

#### Implementación
```ts
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'es-ES';
recognition.continuous = true;
recognition.interimResults = true;

recognition.onresult = (event) => {
  for (const result of event.results) {
    if (result.isFinal) {
      const transcript = result[0].transcript.trim();
      onFinal(transcript);
    } else {
      onInterim(result[0].transcript);
    }
  }
};

recognition.onend = () => {
  // Re-iniciar automáticamente para mantener el modo "always-on"
  if (shouldKeepListening) recognition.start();
};

recognition.start();
```

#### Limitaciones
- Solo Chrome/Edge (Firefox no soporta `SpeechRecognition`)
- Requiere HTTPS o `localhost`
- El navegador pausa el reconocimiento si el usuario cambia de pestaña
- No distingue hablantes (se resuelve en Fase 2 con Whisper)

### Fase 2+ — Whisper (Groq o local)

Cuando migremos a Whisper, el flujo será:
1. `MediaRecorder` captura audio en chunks de 3-5 s
2. POST del audio a `/api/transcribe`
3. El servidor lo envía a Groq Whisper (`whisper-large-v3`) o a un Whisper local
4. Devuelve el texto + embeddings de hablante (para speaker ID)

---

## 2. Síntesis de voz (TTS)

### Fase 1 — `SpeechSynthesis` (Web API)

#### Selección de la voz más humana
```ts
function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  // Prioridades:
  // 1. Voz en español
  // 2. Voz "premium" / "enhanced" (si la etiqueta lo indica)
  // 3. Voces conocidas por sonar naturales: Google, Microsoft, Amazon
  const spanish = voices.filter(v => v.lang.startsWith('es'));
  const ranked = spanish.sort((a, b) => {
    const score = (v: SpeechSynthesisVoice) =>
      (/google/i.test(v.name) ? 3 : 0) +
      (/microsoft/i.test(v.name) ? 2 : 0) +
      (/natural|premium|enhanced/i.test(v.name) ? 4 : 0);
    return score(b) - score(a);
  });
  return ranked[0] ?? null;
}
```

#### Configuración recomendada
```ts
const utterance = new SpeechSynthesisUtterance(text);
utterance.voice = bestVoice;
utterance.rate = 1.05;      // un poco más rápido para sonar "vivo"
utterance.pitch = 1.0;
utterance.volume = 1.0;
utterance.lang = 'es-ES';
```

#### Cómo hace Neko para sonar humana
- ✂️ **Trocea** las respuestas largas en frases y las sintetiza una a una con pequeña pausa
- 🎯 Usa **SSML ligero** si la voz lo soporta (pausas `<break>`)
- 🚫 Evita markdown en respuestas habladas: si la respuesta viene con `**bold**` o listas, se limpia antes de sintetizar
- ⏱️ Espera a que termine de hablar una frase antes de enviar la siguiente (cola)

### Fase 6 — Voces locales (Piper / Coqui)

Piper ofrece voces neuronales mucho más naturales que las del navegador y corre localmente en CPU. Soporta clonación de voz con pocos segundos de muestra.

---

## 3. Visualización del espectro

### Pipeline de audio
```
getUserMedia({ audio: true })
   │
   ▼
MediaStream ──▶ AudioContext
                       │
                       ▼
                MediaStreamSource
                       │
                       ▼
                 AnalyserNode (FFT size = 256)
                       │
                       ▼
            getByteFrequencyData(uint8Array)
                       │
                       ▼
                <canvas> dibujado en RAF loop
```

### Diseño visual
- 64 barras equiespaciadas, cada una con altura proporcional a la magnitud FFT
- Color base cian (`#22d3ee`) cuando Neko escucha
- Color magenta (`#e879f9`) cuando Neko habla (conectado al AnalyserNode de la voz sintetizada)
- Glow radial detrás del espectro
- Barra "central" pulsante con el logo de Neko

### Cuando Neko habla
- `SpeechSynthesis` no expone su audio al `AudioContext` del navegador.
- Solución: alternar visualmente con una animación de "forma de onda sintética" basada en el ritmo del texto (no es el audio real, pero el efecto visual es convincente).
- En **Fase 6** con Piper, sí tendremos acceso al stream PCM real y podremos hacer un espectro fiel.

---

## 4. Permisos y UX

- Al cargar la página, Neko explica brevemente que necesita el micrófono y muestra un botón **"Activar micrófono"**
- Si el usuario rechaza el permiso, se muestra un panel con instrucciones para rehabilitarlo
- Mientras escucha, el icono del micrófono pulsa en cian
- Cuando Neko habla, el icono cambia a magenta con un degradado

---

## 5. Configuración por entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `NEKO_VOICE_URI` | auto | URI de la voz preferida (`SpeechSynthesisVoice.voiceURI`) |
| `NEKO_LANG` | `es-ES` | Idioma de reconocimiento y síntesis |
| `NEKO_SPEAK_RATE` | `1.05` | Velocidad de TTS |
| `NEKO_SPEAK_PITCH` | `1.0` | Tono de TTS |

Estos valores serán ajustables desde un panel de configuración en la UI de la Fase 1.
