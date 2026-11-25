// Cuentas de actividad. Funciones puras.

// Largo de paso como fracción de la altura para estimar distancia.
export const FACTOR_LARGO_PASO_DISTANCIA = 0.415;
// kcal por km y por kg de peso al caminar (estimación).
export const KCAL_POR_KM_Y_KG = 0.5;

// km recorridos: pasos × largo de paso (altura × 0,415).
export function kmDesdePasos(pasos: number, alturaCm: number): number {
  if (!(pasos > 0) || !(alturaCm > 0)) return 0;
  return (pasos * alturaCm * FACTOR_LARGO_PASO_DISTANCIA) / 100000;
}

// kcal por caminar (estimación): km × peso × 0,5.
export function kcalCaminata(pasos: number, alturaCm: number, pesoKg: number): number {
  if (!(pesoKg > 0)) return 0;
  return Math.round(kmDesdePasos(pasos, alturaCm) * pesoKg * KCAL_POR_KM_Y_KG);
}
