// Armado de la sesión y edición de la sesión en curso. Funciones puras: cada
// una devuelve un objeto nuevo y no toca el que recibe.
import { NOMBRE_GRUPO } from '../../data/nombres';
import type { Ejercicio, Grupo } from '../../data/tipos';
import { claveDia } from '../pasosManuales';
import type { ObjetivoEntreno } from '../perfil';
import { formatearKg, sugerirProgresion, ultimaVez, usaPeso } from './progresion';
import { rangoPorDefecto, textoRango, type Rango } from './rangos';
import type { EjercicioEnCurso, SerieEnCurso, SesionArmada, SesionEnCurso, SesionGuardada } from './tipos';

export const SERIES_POR_DEFECTO = 3;
export const REPS_POR_DEFECTO = 10;
export const DESCANSO_POR_DEFECTO_S = 90;
export const AJUSTE_DESCANSO_S = 15;
export const KG_MAXIMO = 500;
export const REPS_MAXIMAS = 100;

// ── Sesión armada ──

export function sesionVacia(hoy: Date): SesionArmada {
  return { dia: claveDia(hoy), ejercicios: [] };
}

// La sesión armada es la de hoy: si quedó una de otro día, se empieza de cero.
export function armadaDeHoy(armada: SesionArmada | null, hoy: Date): SesionArmada {
  return armada && armada.dia === claveDia(hoy) ? armada : sesionVacia(hoy);
}

export function agregarALaSesion(armada: SesionArmada, ejercicioId: string): SesionArmada {
  if (armada.ejercicios.includes(ejercicioId)) return armada;
  return { ...armada, ejercicios: [...armada.ejercicios, ejercicioId] };
}

export function quitarDeLaSesion(armada: SesionArmada, ejercicioId: string): SesionArmada {
  return { ...armada, ejercicios: armada.ejercicios.filter((id) => id !== ejercicioId) };
}

// Mueve un ejercicio `delta` lugares (−1 sube, +1 baja), sin salirse de la lista.
export function moverEnLaSesion(armada: SesionArmada, indice: number, delta: number): SesionArmada {
  const destino = indice + delta;
  if (indice < 0 || indice >= armada.ejercicios.length || destino < 0 || destino >= armada.ejercicios.length) {
    return armada;
  }
  const ejercicios = [...armada.ejercicios];
  const [movido] = ejercicios.splice(indice, 1);
  ejercicios.splice(destino, 0, movido);
  return { ...armada, ejercicios };
}

// Nombre a partir de los grupos, en el orden en que aparecen:
// "Pecho", "Pecho y hombros", "Pecho, hombros y brazos". Con más de 3, "Cuerpo completo".
export function nombreSesion(ejercicios: readonly Pick<Ejercicio, 'grupo'>[]): string {
  const grupos: Grupo[] = [];
  for (const e of ejercicios) if (!grupos.includes(e.grupo)) grupos.push(e.grupo);
  if (grupos.length === 0) return 'Sesión de hoy';
  if (grupos.length > 3) return 'Cuerpo completo';
  const nombres = grupos.map((g, i) => (i === 0 ? NOMBRE_GRUPO[g] : NOMBRE_GRUPO[g].toLowerCase()));
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

// ── Empezar ──

const serieNueva = (reps: number): SerieEnCurso => ({ kg: '', reps: String(reps), repsObjetivo: reps, hecha: false });

// Qué se va a hacer de cada ejercicio: cuántas series y en qué rango de reps.
export interface PlanEjercicio {
  ejercicio: Pick<Ejercicio, 'id' | 'equipo' | 'grupo'>;
  rango: Rango;
  series: number;
}

// Plan de un ejercicio suelto (sin rutina): las series de la última vez (o 3) y el
// rango de la última vez si era un rango; si no, el de por defecto.
export function planPorDefecto(
  ejercicio: Pick<Ejercicio, 'id' | 'equipo' | 'grupo' | 'nombre' | 'tipo'>,
  historial: readonly SesionGuardada[],
  objetivo: ObjetivoEntreno,
): PlanEjercicio {
  const ultima = ultimaVez(historial, ejercicio.id)?.ejercicio;
  const rango = ultima && ultima.rango.min < ultima.rango.max ? ultima.rango : rangoPorDefecto(ejercicio, objetivo);
  return { ejercicio, rango, series: ultima?.seriesTotales || SERIES_POR_DEFECTO };
}

// Series precargadas según la doble progresión (ver sugerirProgresion).
export function seriesIniciales(historial: readonly SesionGuardada[], plan: PlanEjercicio, ahora: Date): SerieEnCurso[] {
  const { ejercicio, rango, series } = plan;
  const sugerencia = sugerirProgresion({ historial, ejercicioId: ejercicio.id, equipo: ejercicio.equipo, rango, series, ahora });
  const kg = usaPeso(ejercicio.equipo) && sugerencia.kg !== null ? formatearKg(sugerencia.kg) : '';
  return sugerencia.reps.map((reps) => ({ ...serieNueva(reps), kg }));
}

export function empezarSesion(
  planes: readonly PlanEjercicio[],
  historial: readonly SesionGuardada[],
  ahora: Date,
  id: string,
  nombre = nombreSesion(planes.map((p) => p.ejercicio)),
): SesionEnCurso {
  return {
    id,
    nombre,
    inicio: ahora.toISOString(),
    actual: 0,
    ejercicios: planes.map((p) => ({
      ejercicioId: p.ejercicio.id,
      rango: p.rango,
      series: seriesIniciales(historial, p, ahora),
    })),
    descanso: null,
  };
}

// ── Valores escritos ──

// "12,5" → 12.5. Vacío o inválido → null. Acepta 0 (barra sola, máquina sin placas).
export function leerKg(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalizado)) return null;
  const kg = Number(normalizado);
  return kg <= KG_MAXIMO ? kg : null;
}

// Reps: entero entre 1 y 100.
export function leerReps(texto: string): number | null {
  const limpio = texto.trim();
  if (!/^\d+$/.test(limpio)) return null;
  const reps = Number(limpio);
  return reps >= 1 && reps <= REPS_MAXIMAS ? reps : null;
}

// Se puede tildar si tiene reps válidas y, si el ejercicio usa peso, un peso válido.
export function serieValida(serie: SerieEnCurso, conPeso: boolean): boolean {
  return leerReps(serie.reps) !== null && (!conPeso || leerKg(serie.kg) !== null);
}

// ── Series ──

function cambiarEjercicio(
  sesion: SesionEnCurso,
  indice: number,
  cambio: (e: EjercicioEnCurso) => EjercicioEnCurso,
): SesionEnCurso {
  if (indice < 0 || indice >= sesion.ejercicios.length) return sesion;
  return { ...sesion, ejercicios: sesion.ejercicios.map((e, i) => (i === indice ? cambio(e) : e)) };
}

export function editarSerie(
  sesion: SesionEnCurso,
  indiceEjercicio: number,
  indiceSerie: number,
  cambios: Partial<Pick<SerieEnCurso, 'kg' | 'reps'>>,
): SesionEnCurso {
  return cambiarEjercicio(sesion, indiceEjercicio, (e) => ({
    ...e,
    series: e.series.map((s, i) => (i === indiceSerie ? { ...s, ...cambios } : s)),
  }));
}

// Copia la última serie (sin tildar); si no hay ninguna, una con el mínimo del rango.
export function agregarSerie(sesion: SesionEnCurso, indiceEjercicio: number): SesionEnCurso {
  return cambiarEjercicio(sesion, indiceEjercicio, (e) => {
    const ultima = e.series[e.series.length - 1];
    const nueva: SerieEnCurso = ultima ? { ...ultima, hecha: false } : serieNueva(e.rango.min);
    return { ...e, series: [...e.series, nueva] };
  });
}

export function borrarSerie(sesion: SesionEnCurso, indiceEjercicio: number, indiceSerie: number): SesionEnCurso {
  return cambiarEjercicio(sesion, indiceEjercicio, (e) => ({ ...e, series: e.series.filter((_, i) => i !== indiceSerie) }));
}

// Tilda o destilda una serie. Al tildarla arranca el descanso.
// Si no es válida (falta reps o peso), no cambia nada.
export function tildarSerie(
  sesion: SesionEnCurso,
  indiceEjercicio: number,
  indiceSerie: number,
  conPeso: boolean,
  ahora: Date,
  descansoS = DESCANSO_POR_DEFECTO_S,
): SesionEnCurso {
  const serie = sesion.ejercicios[indiceEjercicio]?.series[indiceSerie];
  if (!serie) return sesion;
  if (serie.hecha) {
    return cambiarEjercicio(sesion, indiceEjercicio, (e) => ({
      ...e,
      series: e.series.map((s, i) => (i === indiceSerie ? { ...s, hecha: false } : s)),
    }));
  }
  if (!serieValida(serie, conPeso)) return sesion;
  const tildada = cambiarEjercicio(sesion, indiceEjercicio, (e) => ({
    ...e,
    series: e.series.map((s, i) => (i === indiceSerie ? { ...s, hecha: true } : s)),
  }));
  return {
    ...tildada,
    descanso: { inicio: ahora.toISOString(), fin: new Date(ahora.getTime() + descansoS * 1000).toISOString() },
  };
}

export function irAEjercicio(sesion: SesionEnCurso, indice: number): SesionEnCurso {
  if (indice < 0 || indice >= sesion.ejercicios.length) return sesion;
  return { ...sesion, actual: indice };
}

// ── Descanso ──

export function segundosRestantes(sesion: Pick<SesionEnCurso, 'descanso'>, ahora: Date): number {
  if (!sesion.descanso) return 0;
  return Math.max(0, Math.ceil((Date.parse(sesion.descanso.fin) - ahora.getTime()) / 1000));
}

// Qué parte del descanso falta, entre 0 y 1 (para el anillo). Sin descanso, 0.
export function fraccionDescanso(sesion: Pick<SesionEnCurso, 'descanso'>, ahora: Date): number {
  if (!sesion.descanso) return 0;
  const total = Date.parse(sesion.descanso.fin) - Date.parse(sesion.descanso.inicio);
  if (!(total > 0)) return 0;
  return Math.min(1, Math.max(0, (Date.parse(sesion.descanso.fin) - ahora.getTime()) / total));
}

// Suma o resta segundos al descanso. Si queda en 0 o menos, se termina.
export function ajustarDescanso(sesion: SesionEnCurso, deltaS: number, ahora: Date): SesionEnCurso {
  if (!sesion.descanso) return sesion;
  const fin = Date.parse(sesion.descanso.fin) + deltaS * 1000;
  if (fin <= ahora.getTime()) return { ...sesion, descanso: null };
  return { ...sesion, descanso: { ...sesion.descanso, fin: new Date(fin).toISOString() } };
}

export function terminarDescanso(sesion: SesionEnCurso): SesionEnCurso {
  return sesion.descanso ? { ...sesion, descanso: null } : sesion;
}

// ── Progreso ──

export function seriesHechasDe(ejercicio: EjercicioEnCurso): number {
  return ejercicio.series.filter((s) => s.hecha).length;
}

// Fracción hecha de cada ejercicio, entre 0 y 1 (para la barra de arriba).
export function progresoPorEjercicio(sesion: SesionEnCurso): number[] {
  return sesion.ejercicios.map((e) => (e.series.length > 0 ? seriesHechasDe(e) / e.series.length : 0));
}

export function totalSeriesHechas(sesion: SesionEnCurso): number {
  return sesion.ejercicios.reduce((total, e) => total + seriesHechasDe(e), 0);
}

// "3×8–10": series y rango de reps.
export function objetivoDe(ejercicio: EjercicioEnCurso): string {
  if (ejercicio.series.length === 0) return 'sin series';
  return `${ejercicio.series.length}×${textoRango(ejercicio.rango)}`;
}

// ── Terminar ──

// Pasa la sesión en curso al formato del historial: sólo las series tildadas, ya
// como números, y sin los ejercicios que no se hicieron.
export function cerrarSesion(sesion: SesionEnCurso, ahora: Date, kcal: number): SesionGuardada {
  return {
    id: sesion.id,
    nombre: sesion.nombre,
    inicio: sesion.inicio,
    fin: ahora.toISOString(),
    kcal,
    ejercicios: sesion.ejercicios
      .map((e) => ({
        ejercicioId: e.ejercicioId,
        rango: e.rango,
        seriesTotales: e.series.length,
        series: e.series
          .filter((s) => s.hecha)
          .map((s) => ({ kg: leerKg(s.kg), reps: leerReps(s.reps) ?? 0, repsObjetivo: s.repsObjetivo }))
          .filter((s) => s.reps > 0),
      }))
      .filter((e) => e.series.length > 0),
  };
}
