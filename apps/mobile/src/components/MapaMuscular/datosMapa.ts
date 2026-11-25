// Lógica pura del mapa muscular, sin depender de la librería de dibujo.
import { MUSCULOS, type Musculo } from '../../data/tipos';

export const COLOR_PRINCIPAL = '#E8341C';
export const COLOR_SECUNDARIO = '#F4A08F';

export interface MusculoResaltado {
  slug: Musculo;
  color: string;
}

// Arma la lista de músculos a pintar. Si un músculo aparece en las dos listas,
// gana el color de principal.
export function resaltarMusculos(principales: readonly Musculo[], secundarios: readonly Musculo[]): MusculoResaltado[] {
  const colores = new Map<Musculo, string>();
  for (const m of secundarios) colores.set(m, COLOR_SECUNDARIO);
  for (const m of principales) colores.set(m, COLOR_PRINCIPAL);
  return [...colores].map(([slug, color]) => ({ slug, color }));
}

// La librería también dibuja partes que la app no usa (cabeza, manos, rodillas…).
export function esMusculo(slug: string | undefined): slug is Musculo {
  return slug !== undefined && (MUSCULOS as readonly string[]).includes(slug);
}
