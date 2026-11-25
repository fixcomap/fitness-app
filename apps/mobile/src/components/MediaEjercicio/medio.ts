// Qué se muestra arriba del detalle de un ejercicio. Hoy sólo hay videos de
// YouTube; para sumar GIFs o imágenes se agrega una variante acá y su vista en
// MediaEjercicio.tsx, sin tocar las pantallas.
import type { Ejercicio } from '../../data/tipos';

export type Medio = { tipo: 'youtube'; videoId: string } | { tipo: 'ninguno' };

export function medioDeEjercicio(ejercicio: Pick<Ejercicio, 'youtubeId'>): Medio {
  const videoId = ejercicio.youtubeId.trim();
  return videoId ? { tipo: 'youtube', videoId } : { tipo: 'ninguno' };
}
