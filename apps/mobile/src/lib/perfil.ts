// Perfil del usuario: sus datos, la validación de lo que escribe y las metas que
// salen de ahí (kcal y macros). Funciones puras.
import { caloriasObjetivo, KCAL_PERSONALIZADAS, type Objetivo, type Sexo } from './calorias';

export const SEXOS: readonly Sexo[] = ['hombre', 'mujer'];
export const OBJETIVOS_PESO: readonly Objetivo[] = ['bajar', 'mantener', 'subir'];

// Para qué entrena: cambia el rango de reps por defecto de los ejercicios compuestos.
export const OBJETIVOS_ENTRENO = ['hipertrofia', 'fuerza'] as const;
export type ObjetivoEntreno = (typeof OBJETIVOS_ENTRENO)[number];

// Cuánto hace que entrena: el coach ajusta el volumen y la complejidad de las rutinas.
// Mismos valores que la API (apps/api/src/ia/nivelLugar.js).
export const NIVELES = ['principiante', 'intermedio', 'avanzado'] as const;
export type Nivel = (typeof NIVELES)[number];

// Dónde entrena: el coach solo usa ejercicios con el equipo que hay ahí (lo valida la API).
export const LUGARES = ['gym', 'casa-mancuernas', 'peso-corporal'] as const;
export type Lugar = (typeof LUGARES)[number];

// Lo que asume el coach si el perfil no los tiene (perfiles de antes de que existieran).
export const NIVEL_POR_DEFECTO: Nivel = 'intermedio';
export const LUGAR_POR_DEFECTO: Lugar = 'gym';

export interface PerfilUsuario {
  nombre: string;
  sexo: Sexo;
  edad: number; // años
  alturaCm: number;
  pesoKg: number;
  objetivoPeso: Objetivo;
  objetivo: ObjetivoEntreno; // objetivo de entrenamiento
  diasEntrenoPorSemana: number; // 0 a 7 (lo usan las rutinas; no cambia las kcal)
  // null: perfil de antes, sin elegir (el coach asume los de por defecto y los pregunta si arma una rutina).
  nivel: Nivel | null;
  lugar: Lugar | null;
  kcalPersonalizadas: number | null; // si el usuario eligió otro objetivo de kcal
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
  nivel: Nivel | null;
  lugar: Lugar | null;
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
  nivel: null,
  lugar: null,
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
    nivel: perfil.nivel,
    lugar: perfil.lugar,
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

export interface OpcionesValidacion {
  // En Perfil, un perfil de antes puede seguir sin nivel ni lugar; en el onboarding hay que elegirlos.
  nivelYLugarOpcionales?: boolean;
}

// Errores por campo (vacío si está todo bien).
export function erroresPerfil(b: BorradorPerfil, opciones: OpcionesValidacion = {}): ErroresPerfil {
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
  if (!opciones.nivelYLugarOpcionales) {
    if (!b.nivel) errores.nivel = 'Elegí una opción.';
    if (!b.lugar) errores.lugar = 'Elegí una opción.';
  }
  return errores;
}

// Sólo los errores de esos campos (para validar un paso del onboarding).
export function erroresDe(errores: ErroresPerfil, campos: readonly CampoPerfil[]): ErroresPerfil {
  return Object.fromEntries(campos.flatMap((c) => (errores[c] ? [[c, errores[c]]] : [])));
}

// Lo que no se edita en el formulario y se conserva al guardar.
export type ExtrasPerfil = Pick<PerfilUsuario, 'esPremium' | 'kcalPersonalizadas'>;
const SIN_EXTRAS: ExtrasPerfil = { esPremium: false, kcalPersonalizadas: null };

// El perfil listo para guardar, o null si algo no es válido.
export function perfilDesdeBorrador(
  b: BorradorPerfil,
  extras: ExtrasPerfil = SIN_EXTRAS,
  opciones: OpcionesValidacion = {},
): PerfilUsuario | null {
  if (Object.keys(erroresPerfil(b, opciones)).length > 0) return null;
  return {
    nombre: b.nombre.trim(),
    sexo: b.sexo as Sexo,
    edad: leerNumero(b.edad, false) as number,
    alturaCm: leerNumero(b.alturaCm, false) as number,
    pesoKg: leerNumero(b.pesoKg, true) as number,
    objetivoPeso: b.objetivoPeso as Objetivo,
    objetivo: b.objetivo as ObjetivoEntreno,
    diasEntrenoPorSemana: b.diasEntrenoPorSemana,
    nivel: b.nivel,
    lugar: b.lugar,
    kcalPersonalizadas: extras.kcalPersonalizadas,
    esPremium: extras.esPremium,
  };
}

// "Repetir bienvenida" (solo en desarrollo): lo que se contestó en el onboarding, sin perder lo que no se
// pregunta ahí (kcal personalizadas y plan).
export function perfilDeBienvenidaRepetida(nuevo: PerfilUsuario, actual: PerfilUsuario): PerfilUsuario {
  return { ...nuevo, kcalPersonalizadas: actual.kcalPersonalizadas, esPremium: actual.esPremium };
}

// ── Metas de kcal y macros ──

export const PROTEINA_G_POR_KG = 1.8;
export const FRACCION_GRASAS = 0.25; // de las kcal
const KCAL_POR_G = { proteinas: 4, carbos: 4, grasas: 9 } as const;

export interface MetasNutricion {
  kcal: number; // las que se usan: personalizadas o recomendadas
  proteinas: number; // g
  carbos: number; // g
  grasas: number; // g
}

// Las kcal recomendadas: caloriasObjetivo() con el objetivo de peso.
export function kcalRecomendadas(perfil: PerfilUsuario): number {
  return caloriasObjetivo({
    sexo: perfil.sexo,
    edad: perfil.edad,
    pesoKg: perfil.pesoKg,
    alturaCm: perfil.alturaCm,
    objetivo: perfil.objetivoPeso,
  });
}

// kcal: las personalizadas si hay, si no las recomendadas. Proteína 1,8 g/kg; grasas
// 25 % de las kcal; carbos el resto.
export function metasNutricion(perfil: PerfilUsuario): MetasNutricion {
  const kcal = perfil.kcalPersonalizadas ?? kcalRecomendadas(perfil);
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
    // Si faltan (perfiles de antes) o no son válidos, quedan sin elegir.
    nivel: NIVELES.includes(d.nivel as Nivel) ? (d.nivel as Nivel) : null,
    lugar: LUGARES.includes(d.lugar as Lugar) ? (d.lugar as Lugar) : null,
    // Si falta (perfiles de antes) o no es válido, se usan las recomendadas.
    kcalPersonalizadas: enRango(d.kcalPersonalizadas, KCAL_PERSONALIZADAS, true)
      ? (d.kcalPersonalizadas as number)
      : null,
    esPremium: d.esPremium === true,
  };
}
