// Qué se muestra arriba del detalle de un ejercicio. Hoy sólo hay videos de
// YouTube; para sumar GIFs o imágenes se agrega una variante acá y su vista en
// MediaEjercicio.tsx, sin tocar las pantallas.
import type { Ejercicio, FormatoVideo } from '../../data/tipos';

export type Medio = { tipo: 'youtube'; videoId: string; formato: FormatoVideo } | { tipo: 'ninguno' };

export function medioDeEjercicio(ejercicio: Pick<Ejercicio, 'youtubeId' | 'videoFormato'>): Medio {
  const videoId = ejercicio.youtubeId.trim();
  if (!videoId) return { tipo: 'ninguno' };
  // Sin formato guardado se asume horizontal (16:9), como los videos comunes.
  return { tipo: 'youtube', videoId, formato: ejercicio.videoFormato === 'vertical' ? 'vertical' : 'horizontal' };
}

// Proporción ancho / alto de cada formato.
export const PROPORCION: Record<FormatoVideo, number> = { horizontal: 16 / 9, vertical: 9 / 16 };

// Fracción del alto de la pantalla que puede ocupar un video vertical.
export const FRACCION_ALTO_MAXIMO = 0.55;

export interface Dimensiones {
  ancho: number;
  alto: number;
}

// Tamaño del recuadro del video. Los horizontales ocupan todo el ancho en 16:9.
// Los verticales van en 9:16 sin pasar de `altoMaximo`; si no entran, se achican
// manteniendo la proporción (y quedan centrados).
export function dimensionesVideo(anchoDisponible: number, formato: FormatoVideo, altoMaximo: number): Dimensiones {
  if (!(anchoDisponible > 0)) return { ancho: 0, alto: 0 };
  const proporcion = PROPORCION[formato];
  if (formato === 'horizontal') return { ancho: anchoDisponible, alto: Math.round(anchoDisponible / proporcion) };
  const alto = Math.min(anchoDisponible / proporcion, altoMaximo > 0 ? altoMaximo : Infinity);
  return { ancho: Math.round(alto * proporcion), alto: Math.round(alto) };
}

// Miniatura que muestra YouTube para el video. hqdefault existe siempre; en los
// Shorts trae el cuadro vertical centrado, que con "cover" llena el recuadro 9:16.
export function miniaturaVideo(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}
