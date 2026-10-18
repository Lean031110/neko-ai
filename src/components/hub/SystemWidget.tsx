'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Battery,
  BatteryLow,
  BatteryFull,
  Wifi,
  WifiOff,
  Globe,
  Cpu,
} from 'lucide-react';

interface SystemData {
  battery: number | null;
  charging: boolean | null;
  online: boolean;
  language: string;
  cores: number;
  platform: string;
}

export function SystemWidget() {
  const [data, setData] = useState<SystemData>({
    battery: null,
    charging: null,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    language: typeof navigator !== 'undefined' ? navigator.language : 'es-ES',
    cores: 0,
    platform: '',
  });

  useEffect(() => {
    const update = async () => {
      let battery: number | null = null;
      let charging: boolean | null = null;
      try {
        const nav = navigator as Navigator & {
          getBattery?: () => Promise<{
            level: number;
            charging: boolean;
          }>;
        };
        if (nav.getBattery) {
          const b = await nav.getBattery();
          battery = Math.round(b.level * 100);
          charging = b.charging;
        }
      } catch {
        // No disponible
      }
      const nav = navigator as Navigator & {
        deviceMemory?: number;
        hardwareConcurrency?: number;
        userAgentData?: { platform?: string };
      };
      setData({
        battery,
        charging,
        online: navigator.onLine,
        language: navigator.language,
        cores: nav.hardwareConcurrency ?? 0,
        platform: nav.userAgentData?.platform ?? '',
      });
    };
    update();

    const onOnline = () => setData((d) => ({ ...d, online: true }));
    const onOffline = () => setData((d) => ({ ...d, online: false }));
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const BatteryIcon =
    data.battery === null
      ? Battery
      : data.battery < 20
        ? BatteryLow
        : BatteryFull;

  return (
    <Card className="p-4 bg-card/40 backdrop-blur-md border-border/40 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-center gap-2 mb-2 text-cyan-400">
        <Cpu className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium">
          Sistema
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground">
            <BatteryIcon
              className={`w-4 h-4 ${data.charging ? 'text-emerald-400' : ''}`}
            />
            Batería
          </span>
          <span className="font-mono">
            {data.battery === null ? '—' : `${data.battery}%`}
            {data.charging ? ' ⚡' : ''}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground">
            {data.online ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            Red
          </span>
          <span className="font-mono">{data.online ? 'Online' : 'Offline'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Globe className="w-4 h-4" />
            Idioma
          </span>
          <span className="font-mono text-xs">{data.language}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Cpu className="w-4 h-4" />
            CPU
          </span>
          <span className="font-mono text-xs">
            {data.cores ? `${data.cores} cores` : '—'}
          </span>
        </div>
      </div>
    </Card>
  );
}
