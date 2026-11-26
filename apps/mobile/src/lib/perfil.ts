// Perfil del usuario. Por ahora es de ejemplo; después va a salir del registro.
import type { Sexo } from './calorias';

// Para qué entrena: cambia el rango de reps por defecto de los ejercicios compuestos.
export const OBJETIVOS_ENTRENO = ['hipertrofia', 'fuerza'] as const;
export type ObjetivoEntreno = (typeof OBJETIVOS_ENTRENO)[number];

export interface PerfilUsuario {
  nombre: string;
  sexo: Sexo;
  alturaCm: number;
  pesoKg: number;
  objetivo: ObjetivoEntreno;
  esPremium: boolean;
}

export const PERFIL_EJEMPLO: PerfilUsuario = {
  nombre: 'Elías',
  sexo: 'hombre',
  alturaCm: 175,
  pesoKg: 75,
  objetivo: 'hipertrofia',
  esPremium: false,
};
