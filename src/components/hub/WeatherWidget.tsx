'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Cloud, CloudRain, Sun, CloudSnow, Wind, Loader2 } from 'lucide-react';

interface WeatherData {
  temp: number;
  code: number;
  wind: number;
  location: string;
  description: string;
}

const WMO_CODES: Record<number, { label: string; icon: typeof Cloud }> = {
  0: { label: 'Despejado', icon: Sun },
  1: { label: 'Mayormente despejado', icon: Sun },
  2: { label: 'Parcialmente nublado', icon: Cloud },
  3: { label: 'Nublado', icon: Cloud },
  45: { label: 'Niebla', icon: Cloud },
  48: { label: 'Niebla helada', icon: Cloud },
  51: { label: 'Llovizna ligera', icon: CloudRain },
  53: { label: 'Llovizna', icon: CloudRain },
  55: { label: 'Llovizna densa', icon: CloudRain },
  61: { label: 'Lluvia ligera', icon: CloudRain },
  63: { label: 'Lluvia', icon: CloudRain },
  65: { label: 'Lluvia fuerte', icon: CloudRain },
  71: { label: 'Nieve ligera', icon: CloudSnow },
  73: { label: 'Nieve', icon: CloudSnow },
  75: { label: 'Nieve fuerte', icon: CloudSnow },
  80: { label: 'Chubascos', icon: CloudRain },
  81: { label: 'Chubascos fuertes', icon: CloudRain },
  82: { label: 'Chubascos violentos', icon: CloudRain },
  95: { label: 'Tormenta', icon: CloudRain },
  96: { label: 'Tormenta con granizo', icon: CloudRain },
  99: { label: 'Tormenta severa', icon: CloudRain },
};

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather(lat: number, lon: number) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('No se pudo obtener el clima');
        const json = await res.json();

        // Geocodificación inversa con BigDataCloud (sin API key)
        let location = 'Tu ubicación';
        try {
          const geo = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`,
          );
          const geoJson = await geo.json();
          if (geoJson.city || geoJson.locality) {
            location = geoJson.city ?? geoJson.locality;
          } else if (geoJson.countryName) {
            location = geoJson.countryName;
          }
        } catch {
          // mantener "Tu ubicación"
        }

        const code = Number(json.current.weather_code);
        const info = WMO_CODES[code] ?? { label: 'Desconocido', icon: Cloud };
        if (cancelled) return;
        setData({
          temp: Math.round(json.current.temperature_2m),
          code,
          wind: Math.round(json.current.wind_speed_10m),
          location,
          description: info.label,
        });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!('geolocation' in navigator)) {
      setError('Geolocalización no disponible');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Si falla, usar una ciudad por defecto (Madrid)
        fetchWeather(40.4168, -3.7038);
      },
      { timeout: 5000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const info = data ? WMO_CODES[data.code] ?? { label: '—', icon: Cloud } : null;
  const Icon = info?.icon ?? Cloud;

  return (
    <Card className="p-4 bg-card/40 backdrop-blur-md border-border/40 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-center gap-2 mb-2 text-cyan-400">
        <Cloud className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium">
          Clima
        </span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Obteniendo…
        </div>
      ) : error ? (
        <div className="text-sm text-muted-foreground">{error}</div>
      ) : data ? (
        <>
          <div className="flex items-center gap-3">
            <Icon className="w-9 h-9 text-cyan-400" />
            <div>
              <div className="text-3xl font-bold tabular-nums">
                {data.temp}°C
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {data.description}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate max-w-[60%]">{data.location}</span>
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3" /> {data.wind} km/h
            </span>
          </div>
        </>
      ) : null}
    </Card>
  );
}
