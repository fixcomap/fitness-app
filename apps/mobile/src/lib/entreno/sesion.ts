// Armado de la sesión y edición de la sesión en curso. Funciones puras: cada
// una devuelve un objeto nuevo y no toca el que recibe.
import { NOMBRE_GRUPO } from '../../data/nombres';
import type { Ejercicio, Grupo } from '../../data/tipos';
import { claveDia } from '../pasosManuales';
import { formatearKg, ultimaVez, usaPeso } from './progresion';
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

const serieVacia = (): SerieEnCurso => ({
  kg: '',
  reps: String(REPS_POR_DEFECTO),
  repsObjetivo: REPS_POR_DEFECTO,
  hecha: false,
});

// Series precargadas con lo de la última vez; si nunca se hizo, 3×10 sin peso cargado.
export function seriesIniciales(historial: readonly SesionGuardada[], ejercicio: Pick<Ejercicio, 'id' | 'equipo'>): SerieEnCurso[] {
  const ultima = ultimaVez(historial, ejercicio.id);
  if (!ultima) return Array.from({ length: SERIES_POR_DEFECTO }, serieVacia);
  const conPeso = usaPeso(ejercicio.equipo);
  const series: SerieEnCurso[] = ultima.ejercicio.series.map((s) => ({
    kg: conPeso && s.kg !== null ? formatearKg(s.kg) : '',
    reps: String(s.reps),
    repsObjetivo: s.repsObjetivo,
    hecha: false,
  }));
  // Si la última vez quedaron series sin tildar, se vuelven a proponer.
  while (series.length < ultima.ejercicio.seriesTotales) series.push({ ...series[series.length - 1] });
  return series;
}

export function empezarSesion(
  ejercicios: readonly Pick<Ejercicio, 'id' | 'equipo' | 'grupo'>[],
  historial: readonly SesionGuardada[],
  ahora: Date,
  id: string,
): SesionEnCurso {
  return {
    id,
    nombre: nombreSesion(ejercicios),
    inicio: ahora.toISOString(),
    actual: 0,
    ejercicios: ejercicios.map((e) => ({ ejercicioId: e.id, series: seriesIniciales(historial, e) })),
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

// Copia la última serie (sin tildar); si no hay ninguna, una de 10 reps.
export function agregarSerie(sesion: SesionEnCurso, indiceEjercicio: number): SesionEnCurso {
  return cambiarEjercicio(sesion, indiceEjercicio, (e) => {
    const ultima = e.series[e.series.length - 1];
    const nueva: SerieEnCurso = ultima ? { ...ultima, hecha: false } : serieVacia();
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
  return { ...tildada, descanso: { fin: new Date(ahora.getTime() + descansoS * 1000).toISOString() } };
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

// Suma o resta segundos al descanso. Si queda en 0 o menos, se termina.
export function ajustarDescanso(sesion: SesionEnCurso, deltaS: number, ahora: Date): SesionEnCurso {
  if (!sesion.descanso) return sesion;
  const fin = Date.parse(sesion.descanso.fin) + deltaS * 1000;
  if (fin <= ahora.getTime()) return { ...sesion, descanso: null };
  return { ...sesion, descanso: { fin: new Date(fin).toISOString() } };
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

// "3×12" si todas las series tienen el mismo objetivo; si no, "4 series".
export function objetivoDe(ejercicio: EjercicioEnCurso): string {
  const { series } = ejercicio;
  if (series.length === 0) return 'sin series';
  const objetivo = series[0].repsObjetivo;
  return series.every((s) => s.repsObjetivo === objetivo) ? `${series.length}×${objetivo}` : `${series.length} series`;
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
        seriesTotales: e.series.length,
        series: e.series
          .filter((s) => s.hecha)
          .map((s) => ({ kg: leerKg(s.kg), reps: leerReps(s.reps) ?? 0, repsObjetivo: s.repsObjetivo }))
          .filter((s) => s.reps > 0),
      }))
      .filter((e) => e.series.length > 0),
  };
}
