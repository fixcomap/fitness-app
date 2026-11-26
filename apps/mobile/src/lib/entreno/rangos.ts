// Rango de repeticiones de cada ejercicio (por ejemplo 8–10) y su valor por
// defecto según el tipo de ejercicio y el objetivo. Funciones puras.
import type { Ejercicio, TipoEjercicio } from '../../data/tipos';
import type { ObjetivoEntreno } from '../perfil';
import { usaPeso } from './progresion';

export interface Rango {
  min: number;
  max: number;
}

export const REPS_MIN = 1;
export const REPS_MAX = 30;

// Palabras del nombre que indican un ejercicio compuesto (sin tildes, en minúscula).
const PALABRAS_COMPUESTO = [
  'press',
  'sentadilla',
  'peso muerto',
  'remo',
  'jalon',
  'dominada',
  'prensa',
  'hip thrust',
  'estocada',
  'zancada',
  'fondos',
  'buenos dias',
  'cargada',
  'subidas al cajon',
];

const sinTildes = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Compuesto o aislamiento: lo que diga el catálogo (campo `tipo`) o, si no, la regla por nombre.
export function tipoDe(ejercicio: Pick<Ejercicio, 'nombre' | 'tipo'>): TipoEjercicio {
  if (ejercicio.tipo) return ejercicio.tipo;
  const nombre = sinTildes(ejercicio.nombre);
  return PALABRAS_COMPUESTO.some((p) => nombre.includes(p)) ? 'compuesto' : 'aislamiento';
}

// Rango por defecto:
// - peso corporal y bandas: 8–15
// - compuestos con peso: 6–10 (4–6 si el objetivo es fuerza)
// - aislamiento con peso: 10–15
export function rangoPorDefecto(
  ejercicio: Pick<Ejercicio, 'nombre' | 'tipo' | 'equipo'>,
  objetivo: ObjetivoEntreno,
): Rango {
  if (!usaPeso(ejercicio.equipo)) return { min: 8, max: 15 };
  if (tipoDe(ejercicio) === 'aislamiento') return { min: 10, max: 15 };
  return objetivo === 'fuerza' ? { min: 4, max: 6 } : { min: 6, max: 10 };
}

// Sube o baja un extremo del rango, sin salirse de 1–30 y sin cruzar el otro extremo.
export function ajustarRango(rango: Rango, extremo: keyof Rango, delta: number): Rango {
  const valor = rango[extremo] + delta;
  if (extremo === 'min') return valor >= REPS_MIN && valor <= rango.max ? { ...rango, min: valor } : rango;
  return valor <= REPS_MAX && valor >= rango.min ? { ...rango, max: valor } : rango;
}

export function rangoValido(x: unknown): x is Rango {
  if (!x || typeof x !== 'object') return false;
  const { min, max } = x as Record<string, unknown>;
  return (
    Number.isInteger(min) &&
    Number.isInteger(max) &&
    (min as number) >= REPS_MIN &&
    (max as number) <= REPS_MAX &&
    (min as number) <= (max as number)
  );
}

export const mismoRango = (a: Rango, b: Rango) => a.min === b.min && a.max === b.max;

// "8–10" o, si es un número fijo, "10".
export function textoRango(rango: Rango): string {
  return rango.min === rango.max ? String(rango.min) : `${rango.min}–${rango.max}`;
}
