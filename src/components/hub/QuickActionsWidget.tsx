'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Mic, Volume2, Sparkles } from 'lucide-react';

interface QuickActionsWidgetProps {
  onAction: (text: string) => void;
}

const ACTIONS: { label: string; text: string; icon: typeof Zap }[] = [
  { label: 'Hola Neko', text: 'Hola Neko, ¿cómo estás?', icon: Sparkles },
  { label: 'Qué hora es', text: 'Neko, ¿qué hora es?', icon: Zap },
  { label: 'Qué día es', text: 'Neko, ¿qué día es hoy?', icon: Zap },
  { label: 'Quién eres', text: 'Neko, ¿quién eres tú?', icon: Sparkles },
  { label: 'Cuéntame algo', text: 'Neko, cuéntame algo interesante', icon: Sparkles },
  { label: 'Silencio', text: 'Neko, cállate', icon: Mic },
];

export function QuickActionsWidget({ onAction }: QuickActionsWidgetProps) {
  return (
    <Card className="p-4 bg-card/40 backdrop-blur-md border-border/40 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-center gap-2 mb-3 text-cyan-400">
        <Volume2 className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium">
          Accesos rápidos
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Button
              key={a.label}
              variant="outline"
              size="sm"
              className="justify-start text-xs h-9 bg-background/30 hover:bg-cyan-500/10 hover:border-cyan-500/40 hover:text-cyan-300 transition-all"
              onClick={() => onAction(a.text)}
            >
              <Icon className="w-3 h-3 mr-2 shrink-0" />
              <span className="truncate">{a.label}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
