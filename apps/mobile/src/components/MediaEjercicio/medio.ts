// Qué se muestra en el detalle de un ejercicio: un video de YouTube o, si no
// tiene, dos imágenes locales que se alternan. Para sumar otro tipo se agrega una
// variante acá y su vista en MediaEjercicio.tsx, sin tocar las pantallas.
import { IMAGENES_EJERCICIOS, type ParImagenes } from '../../data/imagenesEjercicios';
import type { Ejercicio, FormatoVideo } from '../../data/tipos';

export type Medio =
  | { tipo: 'youtube'; videoId: string; formato: FormatoVideo }
  | { tipo: 'imagenes'; imagenes: ParImagenes }
  | { tipo: 'ninguno' };

// El video tiene prioridad; las imágenes son para los ejercicios sin video.
export function medioDeEjercicio(
  ejercicio: Pick<Ejercicio, 'id' | 'youtubeId' | 'videoFormato'>,
  imagenes: Readonly<Record<string, ParImagenes>> = IMAGENES_EJERCICIOS,
): Medio {
  const videoId = ejercicio.youtubeId.trim();
  if (!videoId) {
    const par = imagenes[ejercicio.id];
    return par ? { tipo: 'imagenes', imagenes: par } : { tipo: 'ninguno' };
  }
  // Sin formato guardado se asume horizontal (16:9), como los videos comunes.
  return { tipo: 'youtube', videoId, formato: ejercicio.videoFormato === 'vertical' ? 'vertical' : 'horizontal' };
}

// Cada cuánto se cambia de imagen en un medio de tipo 'imagenes'.
export const INTERVALO_IMAGENES_MS = 1000;

// Índice de la imagen que sigue a `actual` (0 → 1 → 0 …).
export function siguienteImagen(actual: 0 | 1): 0 | 1 {
  return actual === 0 ? 1 : 0;
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
