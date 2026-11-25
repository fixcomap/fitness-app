// Perfil del usuario. Por ahora es de ejemplo; después va a salir del registro.
import type { Sexo } from './calorias';

export interface PerfilUsuario {
  nombre: string;
  sexo: Sexo;
  alturaCm: number;
  esPremium: boolean;
}

export const PERFIL_EJEMPLO: PerfilUsuario = {
  nombre: 'Elías',
  sexo: 'hombre',
  alturaCm: 175,
  esPremium: false,
};
