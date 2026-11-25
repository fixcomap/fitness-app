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

// El músculo es secundario en el ejercicio ("también trabaja").
export function trabajaComoSecundario(ejercicio: Ejercicio, musculo: Musculo): boolean {
  return ejercicio.musculoPrincipal !== musculo && ejercicio.musculosSecundarios.includes(musculo);
}

// Un ejercicio trabaja un músculo si lo tiene como principal o como secundario.
// Primero van los que lo tienen como principal y después los secundarios,
// respetando el orden original dentro de cada parte.
export function filtrarPorMusculo(ejercicios: readonly Ejercicio[], musculo: Musculo | null): Ejercicio[] {
  if (musculo === null) return [...ejercicios];
  const principales = ejercicios.filter((e) => e.musculoPrincipal === musculo);
  const secundarios = ejercicios.filter((e) => trabajaComoSecundario(e, musculo));
  return [...principales, ...secundarios];
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

// Con un músculo elegido, primero los grupos que tienen algún ejercicio donde es
// principal; el resto mantiene el orden que traía.
export function ordenarGruposPorMusculo(grupos: readonly GrupoDeEjercicios[], musculo: Musculo | null): GrupoDeEjercicios[] {
  if (musculo === null) return [...grupos];
  const tienePrincipal = (g: GrupoDeEjercicios) => g.ejercicios.some((e) => e.musculoPrincipal === musculo);
  return [...grupos.filter(tienePrincipal), ...grupos.filter((g) => !tienePrincipal(g))];
}

export function hayFiltrosActivos(filtros: Filtros): boolean {
  return normalizar(filtros.texto) !== '' || filtros.equipo !== 'todos' || filtros.musculo !== null;
}
