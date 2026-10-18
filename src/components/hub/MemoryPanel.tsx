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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Trash2,
  Brain,
  Loader2,
  Search,
  Database,
  MessageSquare,
} from 'lucide-react';
import {
  getAllMemories,
  deleteMemory,
  clearMemories,
  getStats,
  type Memory,
} from '@/lib/memory-db';
import type { MemoryType } from '@/lib/memory-db';

interface MemoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_COLORS: Record<MemoryType, string> = {
  fact: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  preference: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
  event: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  person: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  note: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  task: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

const TYPE_LABELS: Record<MemoryType, string> = {
  fact: 'Hecho',
  preference: 'Preferencia',
  event: 'Evento',
  person: 'Persona',
  note: 'Nota',
  task: 'Tarea',
};

export function MemoryPanel({ open, onOpenChange }: MemoryPanelProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<{
    memoriesCount: number;
    messagesCount: number;
    oldestMemoryAt: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const [mems, s] = await Promise.all([getAllMemories(), getStats()]);
      setMemories(mems);
      setStats(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  const filtered = query
    ? memories.filter((m) => {
        const q = query.toLowerCase();
        return (
          m.content.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q)) ||
          TYPE_LABELS[m.type].toLowerCase().includes(q)
        );
      })
    : memories;

  const handleDelete = async (id: string) => {
    await deleteMemory(id);
    void refresh();
  };

  const handleClear = async () => {
    if (
      !confirm(
        '¿Borrar todos los recuerdos? Esta acción no se puede deshacer.',
      )
    )
      return;
    await clearMemories();
    void refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-md border-border/60 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            Lo que Neko recuerda
          </DialogTitle>
          <DialogDescription>
            Neko extrae automáticamente hechos importantes de tus
            conversaciones y los guarda en este navegador (IndexedDB). Tu
            privacidad: estos datos nunca salen de tu equipo.
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-border/40 bg-background/30 p-2">
              <Brain className="w-3 h-3 mx-auto mb-1 text-cyan-400" />
              <div className="text-lg font-bold tabular-nums">
                {stats.memoriesCount}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Recuerdos
              </div>
            </div>
            <div className="rounded-md border border-border/40 bg-background/30 p-2">
              <MessageSquare className="w-3 h-3 mx-auto mb-1 text-fuchsia-400" />
              <div className="text-lg font-bold tabular-nums">
                {stats.messagesCount}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Mensajes
              </div>
            </div>
            <div className="rounded-md border border-border/40 bg-background/30 p-2">
              <Database className="w-3 h-3 mx-auto mb-1 text-amber-400" />
              <div className="text-lg font-bold tabular-nums">
                {stats.oldestMemoryAt
                  ? new Date(stats.oldestMemoryAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground">Desde</div>
            </div>
          </div>
        )}

        {/* Buscador */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar recuerdos…"
            className="pl-9 bg-background/50"
          />
        </div>

        {/* Lista de recuerdos */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-[40vh] pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {query
                  ? 'No hay recuerdos que coincidan.'
                  : 'Aún no hay recuerdos. Habla con Neko y se irán guardando.'}
              </p>
            </div>
          ) : (
            filtered.map((m) => (
              <div
                key={m.id}
                className="rounded-md border border-border/40 bg-background/30 p-2.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/90 break-words">
                      {m.content}
                    </p>
                    <div className="flex items-center flex-wrap gap-1 mt-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 ${TYPE_COLORS[m.type]}`}
                      >
                        {TYPE_LABELS[m.type]}
                      </Badge>
                      {m.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[9px] text-muted-foreground font-mono"
                        >
                          #{t}
                        </span>
                      ))}
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {new Date(m.createdAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleDelete(m.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={memories.length === 0}
            className="text-red-300 hover:bg-red-500/10 hover:text-red-200 hover:border-red-500/40"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Borrar todo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            className="text-xs"
          >
            <Loader2 className="w-3.5 h-3.5 mr-1.5" />
            Refrescar
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-100"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
