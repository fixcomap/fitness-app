// Progresión de cargas: qué hiciste la última vez y cuánto conviene levantar hoy.
// Funciones puras.
import type { Equipo } from '../../data/tipos';
import { claveDia } from '../pasosManuales';
import type { EjercicioHecho, SerieHecha, SesionGuardada } from './tipos';

// Cuánto se sube cuando se completaron todas las series. null: el ejercicio no usa peso.
export const INCREMENTO_KG: Record<Equipo, number | null> = {
  barra: 2.5,
  'barra-z': 2.5,
  maquina: 2.5,
  polea: 2.5,
  mancuernas: 2,
  kettlebell: 2,
  'peso-corporal': null,
  bandas: null,
};

// Los ejercicios sin peso (peso corporal y bandas) no tienen columna KG.
export function usaPeso(equipo: Equipo): boolean {
  return INCREMENTO_KG[equipo] !== null;
}

// 12 → "12"; 12.5 → "12,5".
export function formatearKg(kg: number): string {
  return String(Math.round(kg * 100) / 100).replace('.', ',');
}

export interface UltimaVez {
  fecha: Date; // cuándo terminó esa sesión
  ejercicio: EjercicioHecho;
}

// La sesión más reciente en la que se hizo el ejercicio (con al menos una serie).
export function ultimaVez(historial: readonly SesionGuardada[], ejercicioId: string): UltimaVez | null {
  let mejor: UltimaVez | null = null;
  for (const sesion of historial) {
    const ejercicio = sesion.ejercicios.find((e) => e.ejercicioId === ejercicioId && e.series.length > 0);
    if (!ejercicio) continue;
    const fecha = new Date(sesion.fin);
    if (!mejor || fecha > mejor.fecha) mejor = { fecha, ejercicio };
  }
  return mejor;
}

// Se completó si se tildaron todas las series y todas llegaron a las reps objetivo.
export function completoTodo(ejercicio: EjercicioHecho): boolean {
  return (
    ejercicio.series.length > 0 &&
    ejercicio.series.length >= ejercicio.seriesTotales &&
    ejercicio.series.every((s) => s.reps >= s.repsObjetivo)
  );
}

// El peso más alto de las series (null si ninguna tiene peso).
export function pesoMaximo(series: readonly SerieHecha[]): number | null {
  const pesos = series.map((s) => s.kg).filter((kg): kg is number => kg !== null && kg > 0);
  return pesos.length > 0 ? Math.max(...pesos) : null;
}

// Peso sugerido para hoy: +incremento si se completó todo, si no el mismo.
// null si el ejercicio no usa peso o la última vez no hubo peso.
export function pesoSugerido(ejercicio: EjercicioHecho, equipo: Equipo): number | null {
  const incremento = INCREMENTO_KG[equipo];
  const anterior = pesoMaximo(ejercicio.series);
  if (incremento === null || anterior === null) return null;
  return completoTodo(ejercicio) ? anterior + incremento : anterior;
}

// Series de una sesión pasada: "12 × 10 · 12 × 9" o, sin peso, "15 · 12 reps".
export function textoSeries(series: readonly SerieHecha[]): string {
  if (series.every((s) => s.kg === null)) return `${series.map((s) => s.reps).join(' · ')} reps`;
  return series.map((s) => (s.kg === null ? String(s.reps) : `${formatearKg(s.kg)} × ${s.reps}`)).join(' · ');
}

// "3×10" si todas tienen las mismas reps; si no, "3 series (10, 9, 8)".
export function resumirSeries(series: readonly { reps: number }[]): string {
  if (series.length === 0) return '0 series';
  const reps = series.map((s) => s.reps);
  if (reps.every((r) => r === reps[0])) return `${series.length}×${reps[0]}`;
  return `${series.length} series (${reps.join(', ')})`;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Cuándo fue, contado en días de calendario: "Hoy", "Ayer", "Hace 3 días",
// "La semana pasada" (7 a 13 días) o la fecha ("El 3 nov").
export function cuandoFue(fecha: Date, ahora: Date): string {
  const dias = Math.round(
    (new Date(`${claveDia(ahora)}T00:00:00`).getTime() - new Date(`${claveDia(fecha)}T00:00:00`).getTime()) / 86_400_000,
  );
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  if (dias < 14) return 'La semana pasada';
  return `El ${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
}

// Aviso que se muestra arriba de las series, o null si nunca se hizo el ejercicio.
// "La semana pasada: 3×10 con 12 kg. Probá 14 kg."
export function textoProgresion(ultima: UltimaVez | null, equipo: Equipo, ahora: Date): string | null {
  if (!ultima) return null;
  const { ejercicio, fecha } = ultima;
  const cuando = cuandoFue(fecha, ahora);
  const series = resumirSeries(ejercicio.series);
  const anterior = pesoMaximo(ejercicio.series);
  const sugerido = pesoSugerido(ejercicio, equipo);

  if (sugerido === null || anterior === null) {
    const objetivo = `${ejercicio.seriesTotales}×${ejercicio.series[0].repsObjetivo}`;
    return completoTodo(ejercicio)
      ? `${cuando}: ${series}. Completaste todo: probá sumar una repetición.`
      : `${cuando}: ${series}. Buscá completar ${objetivo}.`;
  }
  const hecho = `${cuando}: ${series} con ${formatearKg(anterior)} kg.`;
  return sugerido > anterior ? `${hecho} Probá ${formatearKg(sugerido)} kg.` : `${hecho} Repetí ${formatearKg(sugerido)} kg.`;
}
