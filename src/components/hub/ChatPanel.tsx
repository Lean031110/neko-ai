'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { useNekoStore } from '@/store/neko';
import { Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatPanel() {
  const messages = useNekoStore((s) => s.messages);
  const isLoading = useNekoStore((s) => s.isLoading);
  const interim = useNekoStore((s) => s.interimTranscript);
  const state = useNekoStore((s) => s.state);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, interim, isLoading]);

  return (
    <Card className="flex flex-col h-full p-0 bg-card/40 backdrop-blur-md border-border/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40">
        <Bot className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-cyan-400">
          Conversación
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">
          {messages.length} mensajes
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[40vh] lg:max-h-none">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 ${
                m.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  m.role === 'user'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-fuchsia-500/15 text-fuchsia-400'
                }`}
              >
                {m.role === 'user' ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-emerald-500/10 text-emerald-50 rounded-tr-sm'
                    : 'bg-fuchsia-500/10 text-fuchsia-50 rounded-tl-sm'
                }`}
              >
                {m.content}
                <div
                  className={`mt-1 text-[9px] text-muted-foreground font-mono ${
                    m.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  {new Date(m.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="flex gap-2">
            <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-fuchsia-500/15 text-fuchsia-400">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-fuchsia-500/10 rounded-2xl rounded-tl-sm px-3.5 py-2 flex items-center gap-2 text-sm text-fuchsia-200">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Neko está pensando…</span>
            </div>
          </div>
        )}

        {interim && state === 'listening' && (
          <div className="flex gap-2 opacity-60">
            <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-emerald-500/15 text-emerald-400">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="bg-emerald-500/5 border border-dashed border-emerald-500/30 rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm text-emerald-200/80 italic">
              {interim}…
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </Card>
  );
}
