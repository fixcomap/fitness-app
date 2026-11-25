// Nombres en español para mostrar en pantalla.
import type { Equipo, Grupo, Musculo, Nivel } from './tipos';

export const NOMBRE_MUSCULO: Record<Musculo, string> = {
  chest: 'Pecho',
  deltoids: 'Hombros',
  triceps: 'Tríceps',
  biceps: 'Bíceps',
  trapezius: 'Trapecio',
  'upper-back': 'Espalda alta',
  'lower-back': 'Zona lumbar',
  abs: 'Abdominales',
  obliques: 'Oblicuos',
  quadriceps: 'Cuádriceps',
  hamstring: 'Isquiotibiales',
  gluteal: 'Glúteos',
  calves: 'Gemelos',
  adductors: 'Aductores',
  forearm: 'Antebrazos',
};

export const NOMBRE_GRUPO: Record<Grupo, string> = {
  hombros: 'Hombros',
  pecho: 'Pecho',
  espalda: 'Espalda',
  brazos: 'Brazos',
  piernas: 'Piernas',
  gluteos: 'Glúteos',
  abdomen: 'Abdomen',
};

export const NOMBRE_EQUIPO: Record<Equipo, string> = {
  'peso-corporal': 'Peso corporal',
  mancuernas: 'Mancuernas',
  barra: 'Barra',
  bandas: 'Bandas',
};

export const NOMBRE_NIVEL: Record<Nivel, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};
