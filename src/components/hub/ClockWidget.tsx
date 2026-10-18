'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Calendar } from 'lucide-react';

export function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <Card className="p-4 bg-card/40 backdrop-blur-md border-border/40">
        <div className="h-16" />
      </Card>
    );
  }

  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');
  const dateStr = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Card className="p-4 bg-card/40 backdrop-blur-md border-border/40 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-center gap-2 mb-2 text-cyan-400">
        <Clock className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium">
          Hora local
        </span>
      </div>
      <div className="font-mono text-3xl font-bold tracking-tight tabular-nums">
        {hh}
        <span className="text-cyan-400 animate-pulse">:</span>
        {mm}
        <span className="text-foreground/40 text-2xl">:{ss}</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
        <Calendar className="w-3 h-3" />
        <span>{dateStr}</span>
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground/70 font-mono">
        {tz}
      </div>
    </Card>
  );
}
