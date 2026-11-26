// Rutinas: plantillas de entreno con sus ejercicios (series y rango de reps) y los
// días de la semana en que se hacen. Un día tiene como mucho una rutina.
// Funciones puras: cada una devuelve un objeto nuevo y no toca el que recibe.
import { inicioDeSemana, sumarDias } from '../fechas';
import { DESCANSO_POR_DEFECTO_S, SERIES_POR_DEFECTO, type PlanEjercicio } from './sesion';
import { ajustarRango, rangoValido, type Rango } from './rangos';
import type { Ejercicio } from '../../data/tipos';

// Día de la semana: 0 = lunes … 6 = domingo.
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const DIAS_SEMANA: readonly DiaSemana[] = [0, 1, 2, 3, 4, 5, 6];
export const INICIAL_DIA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
export const NOMBRE_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;

export const SERIES_MIN = 1;
export const SERIES_MAX = 10;

export interface EjercicioRutina {
  ejercicioId: string;
  series: number;
  rango: Rango;
}

export interface Rutina {
  id: string;
  nombre: string;
  dias: DiaSemana[]; // ordenados
  ejercicios: EjercicioRutina[];
}

// ── Fechas ──

export function diaDeSemana(fecha: Date): DiaSemana {
  return ((fecha.getDay() + 6) % 7) as DiaSemana;
}

// Los 7 días (de lunes a domingo) de la semana de `fecha`.
export function semanaDe(fecha: Date): Date[] {
  const lunes = inicioDeSemana(fecha);
  return DIAS_SEMANA.map((d) => sumarDias(lunes, d));
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "23 – 29 nov" o, si cambia el mes, "30 nov – 6 dic".
export function textoSemana(semana: readonly Date[]): string {
  const desde = semana[0];
  const hasta = semana[semana.length - 1];
  const fin = `${hasta.getDate()} ${MESES[hasta.getMonth()]}`;
  return desde.getMonth() === hasta.getMonth()
    ? `${desde.getDate()} – ${fin}`
    : `${desde.getDate()} ${MESES[desde.getMonth()]} – ${fin}`;
}

// ── Consultas ──

export function rutinaDeDia(rutinas: readonly Rutina[], dia: DiaSemana): Rutina | null {
  return rutinas.find((r) => r.dias.includes(dia)) ?? null;
}

export function rutinaDelDia(rutinas: readonly Rutina[], fecha: Date): Rutina | null {
  return rutinaDeDia(rutinas, diaDeSemana(fecha));
}

// La otra rutina que ya tiene ese día (para preguntar si se reemplaza), o null.
export function conflictoDeDia(rutinas: readonly Rutina[], rutinaId: string, dia: DiaSemana): Rutina | null {
  return rutinas.find((r) => r.id !== rutinaId && r.dias.includes(dia)) ?? null;
}

// "lunes", "lunes y miércoles", "lunes, miércoles y viernes".
function listaDias(dias: readonly DiaSemana[]): string {
  const nombres = [...dias].sort((a, b) => a - b).map((d) => NOMBRE_DIA[d]);
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

// "Se repite cada lunes y miércoles".
export function textoDias(dias: readonly DiaSemana[]): string {
  if (dias.length === 0) return 'Sin días: elegí cuándo la hacés';
  if (dias.length === 7) return 'Se repite todos los días';
  return `Se repite cada ${listaDias(dias)}`;
}

// Segundos por rep y descanso entre series, para estimar la duración.
const SEGUNDOS_POR_REP = 4;

// Duración estimada en minutos, redondeada a 5: cada serie son las reps (promedio
// del rango) más el descanso.
export function duracionEstimadaMin(rutina: Pick<Rutina, 'ejercicios'>): number {
  const segundos = rutina.ejercicios.reduce(
    (total, e) => total + e.series * (((e.rango.min + e.rango.max) / 2) * SEGUNDOS_POR_REP + DESCANSO_POR_DEFECTO_S),
    0,
  );
  if (segundos === 0) return 0;
  return Math.max(5, Math.round(segundos / 60 / 5) * 5);
}

// "6 ejercicios · ~40 min".
export function textoResumenRutina(rutina: Pick<Rutina, 'ejercicios'>): string {
  const n = rutina.ejercicios.length;
  const ejercicios = n === 1 ? '1 ejercicio' : `${n} ejercicios`;
  return n === 0 ? 'Sin ejercicios' : `${ejercicios} · ~${duracionEstimadaMin(rutina)} min`;
}

// ── Editar una rutina ──

export function nuevaRutina(id: string, dias: readonly DiaSemana[] = []): Rutina {
  return { id, nombre: '', dias: [...dias].sort((a, b) => a - b), ejercicios: [] };
}

// Agrega al final los que no estén, con 3 series y el rango que se le pase.
export function agregarEjercicios(rutina: Rutina, nuevos: readonly { ejercicioId: string; rango: Rango }[]): Rutina {
  const ya = new Set(rutina.ejercicios.map((e) => e.ejercicioId));
  const agregados: EjercicioRutina[] = [];
  for (const { ejercicioId, rango } of nuevos) {
    if (ya.has(ejercicioId)) continue;
    ya.add(ejercicioId);
    agregados.push({ ejercicioId, rango, series: SERIES_POR_DEFECTO });
  }
  return agregados.length === 0 ? rutina : { ...rutina, ejercicios: [...rutina.ejercicios, ...agregados] };
}

export function quitarEjercicio(rutina: Rutina, indice: number): Rutina {
  return { ...rutina, ejercicios: rutina.ejercicios.filter((_, i) => i !== indice) };
}

// Mueve un ejercicio `delta` lugares (−1 sube, +1 baja), sin salirse de la lista.
export function moverEjercicio(rutina: Rutina, indice: number, delta: number): Rutina {
  const destino = indice + delta;
  const n = rutina.ejercicios.length;
  if (indice < 0 || indice >= n || destino < 0 || destino >= n) return rutina;
  const ejercicios = [...rutina.ejercicios];
  const [movido] = ejercicios.splice(indice, 1);
  ejercicios.splice(destino, 0, movido);
  return { ...rutina, ejercicios };
}

function cambiarEjercicio(rutina: Rutina, indice: number, cambio: (e: EjercicioRutina) => EjercicioRutina): Rutina {
  const actual = rutina.ejercicios[indice];
  if (!actual) return rutina;
  const nuevo = cambio(actual);
  return nuevo === actual
    ? rutina
    : { ...rutina, ejercicios: rutina.ejercicios.map((e, i) => (i === indice ? nuevo : e)) };
}

// Series ± 1, entre 1 y 10.
export function ajustarSeries(rutina: Rutina, indice: number, delta: number): Rutina {
  return cambiarEjercicio(rutina, indice, (e) => {
    const series = e.series + delta;
    return series >= SERIES_MIN && series <= SERIES_MAX ? { ...e, series } : e;
  });
}

// Reps mínimas o máximas ± 1 (ver ajustarRango).
export function ajustarRepsDe(rutina: Rutina, indice: number, extremo: keyof Rango, delta: number): Rutina {
  return cambiarEjercicio(rutina, indice, (e) => {
    const rango = ajustarRango(e.rango, extremo, delta);
    return rango === e.rango ? e : { ...e, rango };
  });
}

// Marca o desmarca un día en la rutina (sin mirar las otras: ver conflictoDeDia).
export function alternarDia(rutina: Rutina, dia: DiaSemana): Rutina {
  const dias = rutina.dias.includes(dia) ? rutina.dias.filter((d) => d !== dia) : [...rutina.dias, dia];
  return { ...rutina, dias: dias.sort((a, b) => a - b) };
}

// Qué le falta para poder guardarla, o null si está lista.
export function errorRutina(rutina: Pick<Rutina, 'nombre' | 'ejercicios'>): string | null {
  if (rutina.nombre.trim() === '') return 'Ponele un nombre a la rutina.';
  if (rutina.ejercicios.length === 0) return 'Agregá al menos un ejercicio.';
  return null;
}

// ── La lista de rutinas ──

// Guarda (agrega o reemplaza) la rutina. Sus días se sacan de las demás: un día,
// una rutina.
export function guardarRutina(rutinas: readonly Rutina[], rutina: Rutina): Rutina[] {
  const limpia = { ...rutina, nombre: rutina.nombre.trim() };
  const sinEsosDias = (r: Rutina) =>
    r.dias.some((d) => limpia.dias.includes(d)) ? { ...r, dias: r.dias.filter((d) => !limpia.dias.includes(d)) } : r;
  const resto = rutinas.map((r) => (r.id === rutina.id ? limpia : sinEsosDias(r)));
  return rutinas.some((r) => r.id === rutina.id) ? resto : [...resto, limpia];
}

export function borrarRutina(rutinas: readonly Rutina[], id: string): Rutina[] {
  return rutinas.filter((r) => r.id !== id);
}

// Asigna el día a la rutina (y se lo saca a la que lo tuviera).
export function asignarDia(rutinas: readonly Rutina[], rutinaId: string, dia: DiaSemana): Rutina[] {
  const rutina = rutinas.find((r) => r.id === rutinaId);
  if (!rutina || rutina.dias.includes(dia)) return [...rutinas];
  return guardarRutina(rutinas, alternarDia(rutina, dia));
}

// Lo que hay que hacer de cada ejercicio para empezar la sesión. Los ejercicios que
// ya no están en el catálogo se saltean.
export function planesDeRutina(
  rutina: Rutina,
  buscar: (id: string) => Pick<Ejercicio, 'id' | 'equipo' | 'grupo'> | undefined,
): PlanEjercicio[] {
  return rutina.ejercicios.flatMap((e) => {
    const ejercicio = buscar(e.ejercicioId);
    return ejercicio ? [{ ejercicio, rango: e.rango, series: e.series }] : [];
  });
}

// ── Lo guardado ──

const esObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const esDia = (x: unknown): x is DiaSemana => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 6;

function esEjercicioRutina(e: unknown): e is EjercicioRutina {
  return (
    esObjeto(e) &&
    typeof e.ejercicioId === 'string' &&
    e.ejercicioId !== '' &&
    Number.isInteger(e.series) &&
    (e.series as number) >= SERIES_MIN &&
    (e.series as number) <= SERIES_MAX &&
    rangoValido(e.rango)
  );
}

function esRutina(r: unknown): r is Rutina {
  return (
    esObjeto(r) &&
    typeof r.id === 'string' &&
    r.id !== '' &&
    typeof r.nombre === 'string' &&
    Array.isArray(r.dias) &&
    r.dias.every(esDia) &&
    Array.isArray(r.ejercicios) &&
    r.ejercicios.every(esEjercicioRutina)
  );
}

// Valida lo guardado: descarta las rutinas mal formadas o con id repetido, y si dos
// tienen el mismo día, se lo queda la primera.
export function leerRutinasGuardadas(datos: unknown): Rutina[] {
  if (!Array.isArray(datos)) return [];
  const ids = new Set<string>();
  const ocupados = new Set<DiaSemana>();
  const rutinas: Rutina[] = [];
  for (const r of datos) {
    if (!esRutina(r) || ids.has(r.id)) continue;
    ids.add(r.id);
    const dias = [...new Set(r.dias)].filter((d) => !ocupados.has(d)).sort((a, b) => a - b);
    dias.forEach((d) => ocupados.add(d));
    rutinas.push({
      id: r.id,
      nombre: r.nombre,
      dias,
      ejercicios: r.ejercicios.map((e) => ({ ejercicioId: e.ejercicioId, series: e.series, rango: { ...e.rango } })),
    });
  }
  return rutinas;
}
