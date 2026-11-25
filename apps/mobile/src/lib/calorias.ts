// Calorías diarias objetivo a partir del perfil del usuario.
// Metabolismo basal con Mifflin-St Jeor, multiplicado por el nivel de actividad
// y ajustado según el objetivo.

export type Sexo = 'hombre' | 'mujer';
export type Objetivo = 'bajar' | 'mantener' | 'subir';

export interface Perfil {
  sexo: Sexo;
  edad: number; // años
  pesoKg: number;
  alturaCm: number;
  diasEntrenoPorSemana: number; // 0 a 7
  objetivo: Objetivo;
}

// Factores de actividad estándar según días de entrenamiento
export function factorActividad(dias: number): number {
  if (dias <= 0) return 1.2;
  if (dias <= 2) return 1.375;
  if (dias <= 4) return 1.55;
  if (dias <= 6) return 1.725;
  return 1.9;
}

export function metabolismoBasal({ sexo, edad, pesoKg, alturaCm }: Perfil): number {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * edad;
  return sexo === 'hombre' ? base + 5 : base - 161;
}

// Ajuste moderado: nunca déficits ni superávits extremos
const AJUSTE: Record<Objetivo, number> = { bajar: -400, mantener: 0, subir: 250 };

// Piso de seguridad: la app nunca propone menos que esto
export const MINIMO_KCAL: Record<Sexo, number> = { hombre: 1500, mujer: 1200 };

export function caloriasObjetivo(perfil: Perfil): number {
  const mantenimiento = metabolismoBasal(perfil) * factorActividad(perfil.diasEntrenoPorSemana);
  const objetivo = mantenimiento + AJUSTE[perfil.objetivo];
  return Math.round(Math.max(objetivo, MINIMO_KCAL[perfil.sexo]));
}
