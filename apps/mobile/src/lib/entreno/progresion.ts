// Progresión de cargas: qué hiciste la última vez y cuánto conviene levantar hoy.
// Doble progresión: con el mismo peso se suman reps hasta llegar al tope del rango
// en todas las series; ahí se sube el peso y se vuelve al mínimo. Funciones puras.
import type { Equipo } from '../../data/tipos';
import { claveDia } from '../pasosManuales';
import type { Rango } from './rangos';
import type { EjercicioHecho, SerieHecha, SesionGuardada } from './tipos';

// Cuánto se sube al llegar al tope del rango. null: el ejercicio no usa peso.
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

// El peso más alto de las series (null si ninguna tiene peso).
export function pesoMaximo(series: readonly SerieHecha[]): number | null {
  const pesos = series.map((s) => s.kg).filter((kg): kg is number => kg !== null && kg > 0);
  return pesos.length > 0 ? Math.max(...pesos) : null;
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

// Un tramo del aviso: normal, en negrita, o destacado (el peso nuevo a probar).
export interface ParteTexto {
  texto: string;
  estilo: 'normal' | 'fuerte' | 'acento';
}

const normal = (texto: string): ParteTexto => ({ texto, estilo: 'normal' });
const fuerte = (texto: string): ParteTexto => ({ texto, estilo: 'fuerte' });
const acento = (texto: string): ParteTexto => ({ texto, estilo: 'acento' });

// ── Doble progresión ──

// Llegó al tope si tildó todas las series y todas llegaron al máximo del rango.
export function llegoAlTope(ejercicio: EjercicioHecho): boolean {
  return (
    ejercicio.series.length > 0 &&
    ejercicio.series.length >= ejercicio.seriesTotales &&
    ejercicio.series.every((s) => s.reps >= ejercicio.rango.max)
  );
}

// ── 1RM estimado ──

// Fórmula de Epley: peso × (1 + reps / 30).
export function unoRMEstimado(kg: number, reps: number): number {
  return kg * (1 + reps / 30);
}

// El mejor 1RM estimado entre todas las series con peso del ejercicio.
export function mejor1RM(historial: readonly SesionGuardada[], ejercicioId: string): number | null {
  let mejor: number | null = null;
  for (const sesion of historial) {
    for (const e of sesion.ejercicios) {
      if (e.ejercicioId !== ejercicioId) continue;
      for (const s of e.series) {
        if (s.kg === null || s.kg <= 0) continue;
        const rm = unoRMEstimado(s.kg, s.reps);
        if (mejor === null || rm > mejor) mejor = rm;
      }
    }
  }
  return mejor;
}

// Peso para hacer `reps` repeticiones según el 1RM, redondeado hacia abajo a lo que
// se puede cargar (de a 2,5 kg con barra o máquina, de a 2 kg con mancuernas).
export function pesoParaReps(rm: number, reps: number, equipo: Equipo): number | null {
  const paso = INCREMENTO_KG[equipo];
  if (paso === null) return null;
  // El margen evita que 40 / 2,5 dé 15,999… por la coma flotante y baje un salto.
  const kg = Math.floor(rm / (1 + reps / 30) / paso + 1e-9) * paso;
  return Math.max(paso, Math.round(kg * 100) / 100);
}

// ── Sugerencia para hoy ──

// Pasado este tiempo, lo de la última vez ya no sirve para la doble progresión.
export const DIAS_HISTORIAL_RECIENTE = 42;

export type MotivoSugerencia =
  | 'primera-vez' // sin datos: se arranca por el mínimo del rango
  | 'subir-peso' // llegó al tope: más peso y vuelta al mínimo
  | 'sumar-reps' // mismo peso, una rep más en la primera serie que no llegó
  | 'tope-sin-peso' // sin peso y en el tope: variante más difícil o una serie más
  | 'desde-1rm'; // rango nuevo o sin historial reciente: peso según el 1RM estimado

export interface Sugerencia {
  motivo: MotivoSugerencia;
  kg: number | null; // peso a precargar (null: sin peso o sin datos)
  reps: number[]; // reps a precargar, una por serie
  serieConMasReps: number | null; // índice de la serie a la que se le sumó una rep
  ultima: UltimaVez | null;
  rm: number | null; // 1RM estimado usado (sólo en 'desde-1rm')
}

export interface DatosSugerencia {
  historial: readonly SesionGuardada[];
  ejercicioId: string;
  equipo: Equipo;
  rango: Rango;
  series: number; // cuántas series se van a hacer hoy
  ahora: Date;
}

const DIA_MS = 86_400_000;

export function sugerirProgresion({ historial, ejercicioId, equipo, rango, series, ahora }: DatosSugerencia): Sugerencia {
  const cantidad = Math.max(1, series);
  const todas = (reps: number) => Array.from({ length: cantidad }, () => reps);
  const ultima = ultimaVez(historial, ejercicioId);
  const conPeso = usaPeso(equipo);
  const base = { ultima, rm: null, serieConMasReps: null };

  const reciente =
    ultima !== null &&
    ahora.getTime() - ultima.fecha.getTime() <= DIAS_HISTORIAL_RECIENTE * DIA_MS &&
    ultima.ejercicio.rango.min === rango.min &&
    ultima.ejercicio.rango.max === rango.max;
  const anterior = ultima ? pesoMaximo(ultima.ejercicio.series) : null;

  // Con peso, la doble progresión necesita una sesión reciente, con el mismo rango y con peso.
  // Si no la hay, el peso sale del 1RM estimado.
  if (conPeso && !(reciente && anterior !== null)) {
    const rm = mejor1RM(historial, ejercicioId);
    if (rm === null) return { ...base, motivo: 'primera-vez', kg: null, reps: todas(rango.min) };
    return { ...base, motivo: 'desde-1rm', rm, kg: pesoParaReps(rm, rango.max, equipo), reps: todas(rango.min) };
  }
  // Sin peso alcanza con haberlo hecho alguna vez: las reps se comparan con el rango de hoy.
  if (!ultima) return { ...base, motivo: 'primera-vez', kg: null, reps: todas(rango.min) };

  const hechas = ultima.ejercicio.series;
  const tope = hechas.length >= ultima.ejercicio.seriesTotales && hechas.every((s) => s.reps >= rango.max);
  if (tope && conPeso && anterior !== null) {
    return { ...base, motivo: 'subir-peso', kg: anterior + (INCREMENTO_KG[equipo] ?? 0), reps: todas(rango.min) };
  }

  // Las reps de la última vez (sin pasarse del tope); las series que faltaron, por el mínimo.
  const reps = Array.from({ length: cantidad }, (_, i) => Math.min(hechas[i]?.reps ?? rango.min, rango.max));
  if (tope) return { ...base, motivo: 'tope-sin-peso', kg: null, reps };
  const serie = reps.findIndex((r) => r < rango.max);
  if (serie >= 0) reps[serie] += 1;
  return {
    ...base,
    motivo: 'sumar-reps',
    kg: conPeso ? anterior : null,
    reps,
    serieConMasReps: serie >= 0 ? serie : null,
  };
}

// Aviso de arriba de las series, en tramos para darles formato, o null si no hay
// nada que decir (primera vez).
// "La vez pasada: **3×10 con 12 kg**. Llegaste al tope: probá **14 kg × 6**."
export function partesSugerencia(sugerencia: Sugerencia): ParteTexto[] | null {
  const { motivo, ultima, kg, reps } = sugerencia;
  if (motivo === 'primera-vez') return null;
  const hecho: ParteTexto[] = [];
  if (ultima) {
    const series = resumirSeries(ultima.ejercicio.series);
    const peso = pesoMaximo(ultima.ejercicio.series);
    hecho.push(
      normal('La vez pasada: '),
      fuerte(peso === null ? series : `${series} con ${formatearKg(peso)} kg`),
      normal('. '),
    );
  }
  const nuevo = acento(`${formatearKg(kg ?? 0)} kg × ${reps[0]}`);
  if (motivo === 'subir-peso') return [...hecho, normal('Llegaste al tope: probá '), nuevo, normal('.')];
  if (motivo === 'desde-1rm') {
    const rm = formatearKg(Math.round(sugerencia.rm ?? 0));
    return [...hecho, normal(`Según tu 1RM estimado (${rm} kg): probá `), nuevo, normal('.')];
  }
  if (motivo === 'tope-sin-peso') {
    return [...hecho, normal('Llegaste al tope: probá una variante más difícil o sumá una serie.')];
  }
  // Sumar reps.
  const i = sugerencia.serieConMasReps;
  const peso = kg !== null ? [normal('Repetí '), fuerte(`${formatearKg(kg)} kg`)] : [];
  if (i === null) return [...hecho, ...peso, normal('.')];
  const buscar = kg !== null ? normal(' y buscá ') : normal('Buscá ');
  return [...hecho, ...peso, buscar, acento(`${reps[i]} reps`), normal(` en la serie ${i + 1}.`)];
}

// El mismo aviso como texto plano.
export function textoSugerencia(sugerencia: Sugerencia): string | null {
  const partes = partesSugerencia(sugerencia);
  return partes ? partes.map((p) => p.texto).join('') : null;
}

// ── Validación al cargar ──

export const REPS_ALTAS_CON_PESO = 30;

// "¿Seguro?" si los números parecen un error de tipeo. No impide guardar.
export function advertenciaSerie(kg: number | null, reps: number | null, mejorKg: number | null): string | null {
  if (kg !== null && kg > 0 && reps !== null && reps > REPS_ALTAS_CON_PESO) {
    return `¿Seguro? Son más de ${REPS_ALTAS_CON_PESO} reps con peso.`;
  }
  if (kg !== null && mejorKg !== null && mejorKg > 0 && kg > mejorKg * 2) {
    return `¿Seguro? Es más del doble de tu mejor marca (${formatearKg(mejorKg)} kg).`;
  }
  return null;
}
