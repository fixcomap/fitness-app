// Búsqueda y filtros del catálogo de ejercicios. Funciones puras.
import { NOMBRE_GRUPO, NOMBRE_MUSCULO } from '../data/nombres';
import { GRUPOS, type Ejercicio, type Equipo, type Grupo, type Musculo } from '../data/tipos';

export type FiltroEquipo = Equipo | 'todos';

export interface Filtros {
  texto: string;
  equipo: FiltroEquipo;
  musculo: Musculo | null;
}

export const FILTROS_VACIOS: Filtros = { texto: '', equipo: 'todos', musculo: null };

// Minúsculas, sin tildes y sin espacios de más: "  Glúteos " → "gluteos".
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Busca en el nombre, el grupo y el músculo principal. Todas las palabras tienen que aparecer.
export function filtrarPorTexto(ejercicios: readonly Ejercicio[], texto: string): Ejercicio[] {
  const palabras = normalizar(texto).split(' ').filter(Boolean);
  if (palabras.length === 0) return [...ejercicios];
  return ejercicios.filter((e) => {
    const donde = normalizar([e.nombre, NOMBRE_GRUPO[e.grupo], NOMBRE_MUSCULO[e.musculoPrincipal]].join(' '));
    return palabras.every((p) => donde.includes(p));
  });
}

export function filtrarPorEquipo(ejercicios: readonly Ejercicio[], equipo: FiltroEquipo): Ejercicio[] {
  if (equipo === 'todos') return [...ejercicios];
  return ejercicios.filter((e) => e.equipo === equipo);
}

// Un ejercicio trabaja un músculo si lo tiene como principal o como secundario.
export function filtrarPorMusculo(ejercicios: readonly Ejercicio[], musculo: Musculo | null): Ejercicio[] {
  if (musculo === null) return [...ejercicios];
  return ejercicios.filter((e) => e.musculoPrincipal === musculo || e.musculosSecundarios.includes(musculo));
}

export function filtrarEjercicios(ejercicios: readonly Ejercicio[], filtros: Filtros): Ejercicio[] {
  const porTexto = filtrarPorTexto(ejercicios, filtros.texto);
  const porEquipo = filtrarPorEquipo(porTexto, filtros.equipo);
  return filtrarPorMusculo(porEquipo, filtros.musculo);
}

export interface GrupoDeEjercicios {
  grupo: Grupo;
  ejercicios: Ejercicio[];
}

// Agrupa en el orden fijo de GRUPOS y omite los grupos vacíos.
export function agruparPorGrupo(ejercicios: readonly Ejercicio[]): GrupoDeEjercicios[] {
  return GRUPOS.map((grupo) => ({ grupo, ejercicios: ejercicios.filter((e) => e.grupo === grupo) })).filter(
    (g) => g.ejercicios.length > 0,
  );
}

export function hayFiltrosActivos(filtros: Filtros): boolean {
  return normalizar(filtros.texto) !== '' || filtros.equipo !== 'todos' || filtros.musculo !== null;
}
