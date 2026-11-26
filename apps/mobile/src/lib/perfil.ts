// Perfil del usuario: sus datos, la validación de lo que escribe y las metas que
// salen de ahí (kcal y macros). Funciones puras.
import { caloriasObjetivo, type Objetivo, type Sexo } from './calorias';

export const SEXOS: readonly Sexo[] = ['hombre', 'mujer'];
export const OBJETIVOS_PESO: readonly Objetivo[] = ['bajar', 'mantener', 'subir'];

// Para qué entrena: cambia el rango de reps por defecto de los ejercicios compuestos.
export const OBJETIVOS_ENTRENO = ['hipertrofia', 'fuerza'] as const;
export type ObjetivoEntreno = (typeof OBJETIVOS_ENTRENO)[number];

export interface PerfilUsuario {
  nombre: string;
  sexo: Sexo;
  edad: number; // años
  alturaCm: number;
  pesoKg: number;
  objetivoPeso: Objetivo;
  objetivo: ObjetivoEntreno; // objetivo de entrenamiento
  diasEntrenoPorSemana: number; // 0 a 7
  esPremium: boolean;
}

// ── Rangos razonables ──

export const LIMITES = {
  nombre: { min: 1, max: 30 }, // caracteres
  edad: { min: 14, max: 100 },
  alturaCm: { min: 120, max: 230 },
  pesoKg: { min: 30, max: 300 },
  diasEntrenoPorSemana: { min: 0, max: 7 },
} as const;

// Lo que se escribe en el formulario: los números como texto, tal cual.
export interface BorradorPerfil {
  nombre: string;
  sexo: Sexo | null;
  edad: string;
  alturaCm: string;
  pesoKg: string;
  objetivoPeso: Objetivo | null;
  objetivo: ObjetivoEntreno | null;
  diasEntrenoPorSemana: number;
}

export type CampoPerfil = keyof BorradorPerfil;
export type ErroresPerfil = Partial<Record<CampoPerfil, string>>;

export const BORRADOR_VACIO: BorradorPerfil = {
  nombre: '',
  sexo: null,
  edad: '',
  alturaCm: '',
  pesoKg: '',
  objetivoPeso: null,
  objetivo: 'hipertrofia',
  diasEntrenoPorSemana: 3,
};

export function borradorDe(perfil: PerfilUsuario): BorradorPerfil {
  return {
    nombre: perfil.nombre,
    sexo: perfil.sexo,
    edad: String(perfil.edad),
    alturaCm: String(perfil.alturaCm),
    pesoKg: String(perfil.pesoKg).replace('.', ','),
    objetivoPeso: perfil.objetivoPeso,
    objetivo: perfil.objetivo,
    diasEntrenoPorSemana: perfil.diasEntrenoPorSemana,
  };
}

// "75,5" → 75.5. Vacío o inválido → null.
function leerNumero(texto: string, decimales: boolean): number | null {
  const limpio = texto.trim().replace(',', '.');
  const patron = decimales ? /^\d+(\.\d)?$/ : /^\d+$/;
  return patron.test(limpio) ? Number(limpio) : null;
}

function errorNumero(valor: number | null, { min, max }: { min: number; max: number }, unidad: string): string | null {
  if (valor === null) return 'Escribí un número.';
  if (valor < min || valor > max) return `Tiene que estar entre ${min} y ${max} ${unidad}.`;
  return null;
}

// Errores por campo (vacío si está todo bien).
export function erroresPerfil(b: BorradorPerfil): ErroresPerfil {
  const errores: ErroresPerfil = {};
  const nombre = b.nombre.trim();
  if (nombre.length < LIMITES.nombre.min) errores.nombre = 'Escribí tu nombre.';
  else if (nombre.length > LIMITES.nombre.max) errores.nombre = `Hasta ${LIMITES.nombre.max} letras.`;
  if (!b.sexo) errores.sexo = 'Elegí una opción.';
  const edad = errorNumero(leerNumero(b.edad, false), LIMITES.edad, 'años');
  if (edad) errores.edad = edad;
  const altura = errorNumero(leerNumero(b.alturaCm, false), LIMITES.alturaCm, 'cm');
  if (altura) errores.alturaCm = altura;
  const peso = errorNumero(leerNumero(b.pesoKg, true), LIMITES.pesoKg, 'kg');
  if (peso) errores.pesoKg = peso;
  if (!b.objetivoPeso) errores.objetivoPeso = 'Elegí una opción.';
  if (!b.objetivo) errores.objetivo = 'Elegí una opción.';
  const { min, max } = LIMITES.diasEntrenoPorSemana;
  if (!Number.isInteger(b.diasEntrenoPorSemana) || b.diasEntrenoPorSemana < min || b.diasEntrenoPorSemana > max) {
    errores.diasEntrenoPorSemana = `Entre ${min} y ${max} días.`;
  }
  return errores;
}

// Sólo los errores de esos campos (para validar un paso del onboarding).
export function erroresDe(errores: ErroresPerfil, campos: readonly CampoPerfil[]): ErroresPerfil {
  return Object.fromEntries(campos.flatMap((c) => (errores[c] ? [[c, errores[c]]] : [])));
}

// El perfil listo para guardar, o null si algo no es válido.
export function perfilDesdeBorrador(b: BorradorPerfil, esPremium = false): PerfilUsuario | null {
  if (Object.keys(erroresPerfil(b)).length > 0) return null;
  return {
    nombre: b.nombre.trim(),
    sexo: b.sexo as Sexo,
    edad: leerNumero(b.edad, false) as number,
    alturaCm: leerNumero(b.alturaCm, false) as number,
    pesoKg: leerNumero(b.pesoKg, true) as number,
    objetivoPeso: b.objetivoPeso as Objetivo,
    objetivo: b.objetivo as ObjetivoEntreno,
    diasEntrenoPorSemana: b.diasEntrenoPorSemana,
    esPremium,
  };
}

// ── Metas de kcal y macros ──

export const PROTEINA_G_POR_KG = 1.8;
export const FRACCION_GRASAS = 0.25; // de las kcal
const KCAL_POR_G = { proteinas: 4, carbos: 4, grasas: 9 } as const;

export interface MetasNutricion {
  kcal: number;
  proteinas: number; // g
  carbos: number; // g
  grasas: number; // g
}

// kcal con caloriasObjetivo(); proteína 1,8 g/kg; grasas 25 % de las kcal; carbos el resto.
export function metasNutricion(perfil: PerfilUsuario): MetasNutricion {
  const kcal = caloriasObjetivo({
    sexo: perfil.sexo,
    edad: perfil.edad,
    pesoKg: perfil.pesoKg,
    alturaCm: perfil.alturaCm,
    diasEntrenoPorSemana: perfil.diasEntrenoPorSemana,
    objetivo: perfil.objetivoPeso,
  });
  const proteinas = Math.round(perfil.pesoKg * PROTEINA_G_POR_KG);
  const grasas = Math.round((kcal * FRACCION_GRASAS) / KCAL_POR_G.grasas);
  const resto = kcal - proteinas * KCAL_POR_G.proteinas - grasas * KCAL_POR_G.grasas;
  return { kcal, proteinas, grasas, carbos: Math.max(0, Math.round(resto / KCAL_POR_G.carbos)) };
}

// ── Lo guardado ──

const enRango = (x: unknown, { min, max }: { min: number; max: number }, entero: boolean) =>
  typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max && (!entero || Number.isInteger(x));

// El perfil guardado, o null si no hay o algo no cierra (se vuelve a pedir).
export function leerPerfilGuardado(datos: unknown): PerfilUsuario | null {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null;
  const d = datos as Record<string, unknown>;
  const nombre = typeof d.nombre === 'string' ? d.nombre.trim() : '';
  if (
    nombre.length < LIMITES.nombre.min ||
    nombre.length > LIMITES.nombre.max ||
    !SEXOS.includes(d.sexo as Sexo) ||
    !enRango(d.edad, LIMITES.edad, true) ||
    !enRango(d.alturaCm, LIMITES.alturaCm, true) ||
    !enRango(d.pesoKg, LIMITES.pesoKg, false) ||
    !OBJETIVOS_PESO.includes(d.objetivoPeso as Objetivo) ||
    !OBJETIVOS_ENTRENO.includes(d.objetivo as ObjetivoEntreno) ||
    !enRango(d.diasEntrenoPorSemana, LIMITES.diasEntrenoPorSemana, true)
  ) {
    return null;
  }
  return {
    nombre,
    sexo: d.sexo as Sexo,
    edad: d.edad as number,
    alturaCm: d.alturaCm as number,
    pesoKg: d.pesoKg as number,
    objetivoPeso: d.objetivoPeso as Objetivo,
    objetivo: d.objetivo as ObjetivoEntreno,
    diasEntrenoPorSemana: d.diasEntrenoPorSemana as number,
    esPremium: d.esPremium === true,
  };
}

// Perfil de ejemplo, hasta que haya uno guardado.
export const PERFIL_EJEMPLO: PerfilUsuario = {
  nombre: 'Elías',
  sexo: 'hombre',
  edad: 30,
  alturaCm: 175,
  pesoKg: 75,
  objetivoPeso: 'mantener',
  objetivo: 'hipertrofia',
  diasEntrenoPorSemana: 3,
  esPremium: false,
};
