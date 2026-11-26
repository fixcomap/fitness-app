// Calorías diarias objetivo a partir del perfil del usuario.
// Metabolismo basal con Mifflin-St Jeor, multiplicado por el factor sedentario y
// ajustado según el objetivo. La actividad real del día (pasos y entrenos) no va
// acá: se suma aparte en el resumen del día ("+ Actividad"), así no se cuenta dos veces.

export type Sexo = 'hombre' | 'mujer';
export type Objetivo = 'bajar' | 'mantener' | 'subir';

export interface Perfil {
  sexo: Sexo;
  edad: number; // años
  pesoKg: number;
  alturaCm: number;
  objetivo: Objetivo;
}

// Factor de actividad sedentario: el gasto de un día sin ejercicio.
export const FACTOR_SEDENTARIO = 1.2;

export function metabolismoBasal({
  sexo,
  edad,
  pesoKg,
  alturaCm,
}: Pick<Perfil, 'sexo' | 'edad' | 'pesoKg' | 'alturaCm'>): number {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * edad;
  return sexo === 'hombre' ? base + 5 : base - 161;
}

// Ajuste moderado: nunca déficits ni superávits extremos
const AJUSTE: Record<Objetivo, number> = { bajar: -400, mantener: 0, subir: 250 };

// Piso de seguridad: la app nunca propone menos que esto
export const MINIMO_KCAL: Record<Sexo, number> = { hombre: 1500, mujer: 1200 };

export function caloriasObjetivo(perfil: Perfil): number {
  const base = metabolismoBasal(perfil) * FACTOR_SEDENTARIO;
  const objetivo = base + AJUSTE[perfil.objetivo];
  return Math.round(Math.max(objetivo, MINIMO_KCAL[perfil.sexo]));
}

// ── Kcal personalizadas ──

export const KCAL_PERSONALIZADAS = { min: 1000, max: 5000 } as const;

// "1.800" o "1800" → 1800. null si no es un entero entre 1.000 y 5.000.
export function leerKcalPersonalizadas(texto: string): number | null {
  const limpio = texto.trim().replace(/\./g, '');
  if (!/^\d+$/.test(limpio)) return null;
  const kcal = Number(limpio);
  return kcal >= KCAL_PERSONALIZADAS.min && kcal <= KCAL_PERSONALIZADAS.max ? kcal : null;
}

export const AVISO_KCAL_BAJAS =
  'Está por debajo de lo recomendado. Comer muy poco por mucho tiempo puede afectar tu salud y tu rendimiento; consultá con un profesional.';

// Aviso si las kcal están por debajo del mínimo de seguridad (se pueden guardar igual).
export function avisoKcal(kcal: number, sexo: Sexo): string | null {
  return kcal < MINIMO_KCAL[sexo] ? AVISO_KCAL_BAJAS : null;
}
