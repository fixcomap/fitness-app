// Semana de lunes a domingo para la pantalla Actividad. Funciones puras que
// reciben el total de cada día (historial + sensor + cargas manuales).
import { inicioDeSemana, mismoDia, sumarDias } from '../fechas';
import { claveDia } from '../pasosManuales';
import type { TotalesDia } from './historial';

export type TotalDelDia = (clave: string) => TotalesDia;

export interface DiaSemana {
  fecha: Date;
  pasos: number; // 0 en días que no llegaron
  esHoy: boolean;
  futuro: boolean;
}

export interface Semana {
  dias: DiaSemana[]; // lunes a domingo
  promedio: number; // pasos por día de lunes a hoy
}

// Días de la semana que ya empezaron (lunes a hoy).
function diasHastaHoy(ahora: Date): Date[] {
  const lunes = inicioDeSemana(ahora);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).filter((d) => d.getTime() <= ahora.getTime());
}

export function armarSemana(ahora: Date, totalDelDia: TotalDelDia): Semana {
  const lunes = inicioDeSemana(ahora);
  const dias = Array.from({ length: 7 }, (_, i): DiaSemana => {
    const fecha = sumarDias(lunes, i);
    const esHoy = mismoDia(fecha, ahora);
    const futuro = !esHoy && fecha.getTime() > ahora.getTime();
    return { fecha, pasos: futuro ? 0 : totalDelDia(claveDia(fecha)).pasos, esHoy, futuro };
  });
  const hastaHoy = dias.filter((d) => !d.futuro);
  const promedio = hastaHoy.length === 0 ? 0 : Math.round(hastaHoy.reduce((t, d) => t + d.pasos, 0) / hastaHoy.length);
  return { dias, promedio };
}

export interface MinutosActivos {
  hoy: number;
  semana: number; // de lunes a hoy
}

export function minutosActivos(ahora: Date, totalDelDia: TotalDelDia): MinutosActivos {
  const semana = diasHastaHoy(ahora).reduce((t, d) => t + totalDelDia(claveDia(d)).minutos, 0);
  return { hoy: totalDelDia(claveDia(ahora)).minutos, semana };
}
