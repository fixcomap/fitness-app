// Tipos de la sesión de entreno: la que se arma, la que está en curso y las
// que quedan guardadas en el historial.

// Ejercicios elegidos para entrenar hoy, en orden.
export interface SesionArmada {
  dia: string; // 'AAAA-MM-DD' en hora local
  ejercicios: string[]; // ids del catálogo
}

// Mientras se entrena, KG y REPS se guardan como texto, tal como se escriben.
export interface SerieEnCurso {
  kg: string; // vacío en los ejercicios sin peso
  reps: string;
  repsObjetivo: number;
  hecha: boolean;
}

export interface EjercicioEnCurso {
  ejercicioId: string;
  series: SerieEnCurso[];
}

export interface Descanso {
  inicio: string; // ISO: cuándo empezó (para mostrar cuánto falta en proporción)
  fin: string; // ISO: cuándo termina
}

export interface SesionEnCurso {
  id: string;
  nombre: string;
  inicio: string; // ISO
  actual: number; // índice del ejercicio que se está haciendo
  ejercicios: EjercicioEnCurso[];
  descanso: Descanso | null;
}

// Una serie terminada, ya con números.
export interface SerieHecha {
  kg: number | null; // null en los ejercicios sin peso
  reps: number;
  repsObjetivo: number;
}

export interface EjercicioHecho {
  ejercicioId: string;
  series: SerieHecha[]; // sólo las tildadas
  seriesTotales: number; // las que había en la sesión, tildadas o no
}

export interface SesionGuardada {
  id: string;
  nombre: string;
  inicio: string; // ISO
  fin: string; // ISO
  ejercicios: EjercicioHecho[];
  kcal: number; // estimadas
}
