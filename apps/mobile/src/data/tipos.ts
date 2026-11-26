// Tipos del catálogo de ejercicios.

// Slugs de músculos de react-native-body-highlighter que usa la app.
export const MUSCULOS = [
  'chest',
  'deltoids',
  'triceps',
  'biceps',
  'trapezius',
  'upper-back',
  'lower-back',
  'abs',
  'obliques',
  'quadriceps',
  'hamstring',
  'gluteal',
  'calves',
  'adductors',
  'forearm',
] as const;
export type Musculo = (typeof MUSCULOS)[number];

export const GRUPOS = ['hombros', 'pecho', 'espalda', 'brazos', 'piernas', 'gluteos', 'abdomen'] as const;
export type Grupo = (typeof GRUPOS)[number];

export const EQUIPOS = [
  'peso-corporal',
  'mancuernas',
  'barra',
  'bandas',
  'kettlebell',
  'barra-z',
  'maquina',
  'polea',
] as const;
export type Equipo = (typeof EQUIPOS)[number];

export const NIVELES = ['principiante', 'intermedio', 'avanzado'] as const;
export type Nivel = (typeof NIVELES)[number];

export interface Ejercicio {
  id: string;
  nombre: string;
  grupo: Grupo;
  equipo: Equipo;
  nivel: Nivel;
  musculoPrincipal: Musculo;
  musculosSecundarios: Musculo[];
  tecnica: string[]; // pasos en orden
  erroresComunes: string[];
  youtubeId: string; // vacío si todavía no hay video
  videoCanal?: string; // author_name del video en YouTube (oEmbed)
  videoFormato?: FormatoVideo; // vertical para Shorts
  fuente?: string; // de dónde salen los datos, si no son propios
  // Corrige la clasificación automática (ver lib/entreno/rangos) en casos puntuales.
  tipo?: TipoEjercicio;
}

// Compuesto: varias articulaciones (press, sentadilla, remo…). Aislamiento: una sola.
export const TIPOS_EJERCICIO = ['compuesto', 'aislamiento'] as const;
export type TipoEjercicio = (typeof TIPOS_EJERCICIO)[number];

export const FORMATOS_VIDEO = ['vertical', 'horizontal'] as const;
export type FormatoVideo = (typeof FORMATOS_VIDEO)[number];
