import datos from './ejercicios.json';
import type { Ejercicio } from './tipos';

// Catálogo local. La forma la valida ejercicios.test.ts.
export const EJERCICIOS = datos as Ejercicio[];

export function buscarEjercicioPorId(id: string): Ejercicio | undefined {
  return EJERCICIOS.find((e) => e.id === id);
}
