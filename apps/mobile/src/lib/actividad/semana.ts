// Semana de lunes a domingo para la pantalla Actividad: junta los pasos del
// sensor con las cargas manuales. Función pura.
import { claveDia, type CargaPasos } from '../pasosManuales';
import { inicioDeSemana, mismoDia, sumarDias } from '../fechas';
import type { PasosDelDia } from './consultas';

export interface DiaSemana {
  fecha: Date;
  pasos: number; // sensor + manuales (0 en días que no llegaron)
  esHoy: boolean;
  futuro: boolean;
}

export interface Semana {
  dias: DiaSemana[]; // lunes a domingo
  promedio: number; // pasos por día de lunes a hoy
  minutosManuales: number; // minutos activos cargados a mano esta semana
}

export function armarSemana(ahora: Date, sensor: readonly PasosDelDia[], cargas: readonly CargaPasos[]): Semana {
  const lunes = inicioDeSemana(ahora);
  const manualPorDia = new Map<string, { pasos: number; minutos: number }>();
  for (const c of cargas) {
    const actual = manualPorDia.get(c.dia) ?? { pasos: 0, minutos: 0 };
    manualPorDia.set(c.dia, { pasos: actual.pasos + c.pasos, minutos: actual.minutos + c.minutos });
  }

  const dias = Array.from({ length: 7 }, (_, i): DiaSemana => {
    const fecha = sumarDias(lunes, i);
    const esHoy = mismoDia(fecha, ahora);
    const futuro = !esHoy && fecha.getTime() > ahora.getTime();
    if (futuro) return { fecha, pasos: 0, esHoy, futuro };
    const delSensor = sensor.find((d) => mismoDia(d.dia, fecha))?.pasos ?? 0;
    const manual = manualPorDia.get(claveDia(fecha))?.pasos ?? 0;
    return { fecha, pasos: delSensor + manual, esHoy, futuro };
  });

  const hastaHoy = dias.filter((d) => !d.futuro);
  const minutosManuales = hastaHoy.reduce((t, d) => t + (manualPorDia.get(claveDia(d.fecha))?.minutos ?? 0), 0);
  const promedio = hastaHoy.length === 0 ? 0 : Math.round(hastaHoy.reduce((t, d) => t + d.pasos, 0) / hastaHoy.length);
  return { dias, promedio, minutosManuales };
}

// Pasos por día de los últimos días (sensor + manuales), del más viejo a hoy, para la racha.
export function pasosRecientes(sensor: readonly PasosDelDia[], cargas: readonly CargaPasos[]): number[] {
  return sensor.map(({ dia, pasos }) => {
    const clave = claveDia(dia);
    return pasos + cargas.filter((c) => c.dia === clave).reduce((t, c) => t + c.pasos, 0);
  });
}
