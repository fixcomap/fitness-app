// Números de una sesión terminada: duración, volumen, récords y kcal. Funciones puras.
import { claveDia } from '../pasosManuales';
import { pesoMaximo } from './progresion';
import type { SesionGuardada } from './tipos';

// MET de un entrenamiento de fuerza a intensidad moderada.
export const MET_ENTRENO = 5;

// kcal = MET × peso (kg) × horas. Es una estimación.
export function kcalEntreno(pesoKg: number, duracionMs: number): number {
  if (!(pesoKg > 0) || !(duracionMs > 0)) return 0;
  return Math.round(MET_ENTRENO * pesoKg * (duracionMs / 3_600_000));
}

export function duracionMs(sesion: Pick<SesionGuardada, 'inicio' | 'fin'>): number {
  return Math.max(0, Date.parse(sesion.fin) - Date.parse(sesion.inicio));
}

// Suma de kg × reps de todas las series. Las series sin peso no suman.
export function volumenTotal(sesion: Pick<SesionGuardada, 'ejercicios'>): number {
  let total = 0;
  for (const e of sesion.ejercicios) for (const s of e.series) total += (s.kg ?? 0) * s.reps;
  return Math.round(total * 10) / 10;
}

export function seriesTotales(sesion: Pick<SesionGuardada, 'ejercicios'>): number {
  return sesion.ejercicios.reduce((total, e) => total + e.series.length, 0);
}

// El mayor peso con que se hizo un ejercicio en todo el historial (null si nunca con peso).
export function mejorPeso(historial: readonly SesionGuardada[], ejercicioId: string): number | null {
  let mejor: number | null = null;
  for (const sesion of historial) {
    for (const e of sesion.ejercicios) {
      if (e.ejercicioId !== ejercicioId) continue;
      const peso = pesoMaximo(e.series);
      if (peso !== null && (mejor === null || peso > mejor)) mejor = peso;
    }
  }
  return mejor;
}

export interface RecordNuevo {
  ejercicioId: string;
  kg: number;
  anterior: number;
}

// Ejercicios en los que se superó el mayor peso de las sesiones anteriores.
// La primera vez que se hace un ejercicio no cuenta como récord: no hay con qué comparar.
export function recordsNuevos(sesion: SesionGuardada, anteriores: readonly SesionGuardada[]): RecordNuevo[] {
  const previas = anteriores.filter((s) => s.id !== sesion.id);
  const records: RecordNuevo[] = [];
  for (const e of sesion.ejercicios) {
    const kg = pesoMaximo(e.series);
    const anterior = mejorPeso(previas, e.ejercicioId);
    if (kg !== null && anterior !== null && kg > anterior) records.push({ ejercicioId: e.ejercicioId, kg, anterior });
  }
  return records;
}

// kcal de los entrenamientos terminados en un día ('AAAA-MM-DD').
export function kcalEntrenoDelDia(historial: readonly SesionGuardada[], dia: string): number {
  return historial.filter((s) => claveDia(new Date(s.fin)) === dia).reduce((total, s) => total + s.kcal, 0);
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

// Cronómetro: "4:05", "45:10", "1:02:03".
export function formatearCronometro(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  return horas > 0 ? `${horas}:${dosDigitos(minutos)}:${dosDigitos(segundos)}` : `${minutos}:${dosDigitos(segundos)}`;
}

// Duración para leer: "45 min", "1 h 5 min". Menos de un minuto cuenta como 1.
export function formatearDuracion(ms: number): string {
  const minutos = Math.max(1, Math.round(ms / 60_000));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto > 0 ? `${horas} h ${resto} min` : `${horas} h`;
}
