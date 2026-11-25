// Pasos cargados a mano: lo que caminaste sin el celu encima.
// Todo lo de este archivo son funciones puras; el guardado está en almacenamiento.ts.
import type { Sexo } from './calorias';

export type TipoCarga = 'km' | 'minutos';

export interface CargaPasos {
  id: string;
  dia: string; // 'AAAA-MM-DD' en hora local
  hora: string; // 'HH:MM' en hora local
  tipo: TipoCarga;
  valor: number; // km o minutos, según el tipo
  pasos: number;
  minutos: number; // minutos activos que suma
}

// Largo de paso como fracción de la altura.
export const FACTOR_LARGO_PASO: Record<Sexo, number> = { hombre: 0.415, mujer: 0.413 };
export const PASOS_POR_MINUTO = 100;
// Velocidad para estimar los minutos cuando se carga en km (caminata a paso normal).
export const VELOCIDAD_CAMINATA_KM_H = 5;

export const MAXIMO: Record<TipoCarga, number> = { km: 50, minutos: 600 };

export function largoPasoCm(alturaCm: number, sexo: Sexo): number {
  return alturaCm * FACTOR_LARGO_PASO[sexo];
}

export function pasosDesdeKm(km: number, alturaCm: number, sexo: Sexo): number {
  const largo = largoPasoCm(alturaCm, sexo);
  if (!(km > 0) || !(largo > 0)) return 0;
  return Math.round((km * 100000) / largo);
}

export function pasosDesdeMinutos(minutos: number): number {
  return minutos > 0 ? Math.round(minutos * PASOS_POR_MINUTO) : 0;
}

export function minutosDesdeKm(km: number): number {
  return km > 0 ? Math.round((km / VELOCIDAD_CAMINATA_KM_H) * 60) : 0;
}

// Convierte lo que escribió el usuario ("2,5", "30") en un número válido para el tipo, o null.
export function leerValor(texto: string, tipo: TipoCarga): number | null {
  const normalizado = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalizado)) return null;
  const valor = Number(normalizado);
  if (!(valor > 0) || valor > MAXIMO[tipo]) return null;
  return valor;
}

export interface DatosPaso {
  alturaCm: number;
  sexo: Sexo;
}

// Calcula pasos y minutos de una carga (sin fecha ni id).
export function convertir(tipo: TipoCarga, valor: number, perfil: DatosPaso): { pasos: number; minutos: number } {
  if (tipo === 'km') {
    return { pasos: pasosDesdeKm(valor, perfil.alturaCm, perfil.sexo), minutos: minutosDesdeKm(valor) };
  }
  return { pasos: pasosDesdeMinutos(valor), minutos: Math.round(valor) };
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

export function claveDia(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

export function crearCarga(tipo: TipoCarga, valor: number, perfil: DatosPaso, ahora: Date, id: string): CargaPasos {
  return {
    id,
    dia: claveDia(ahora),
    hora: `${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}`,
    tipo,
    valor,
    ...convertir(tipo, valor, perfil),
  };
}

export function cargasDelDia(cargas: readonly CargaPasos[], dia: string): CargaPasos[] {
  return cargas.filter((c) => c.dia === dia);
}

export function totalesCargas(cargas: readonly CargaPasos[]): { pasos: number; minutos: number } {
  return cargas.reduce((t, c) => ({ pasos: t.pasos + c.pasos, minutos: t.minutos + c.minutos }), { pasos: 0, minutos: 0 });
}

export function borrarCarga(cargas: readonly CargaPasos[], id: string): CargaPasos[] {
  return cargas.filter((c) => c.id !== id);
}

// Para no acumular para siempre: se guardan sólo los últimos días.
export function podarCargasViejas(cargas: readonly CargaPasos[], hoy: Date, dias = 30): CargaPasos[] {
  const limite = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dias);
  const claveLimite = claveDia(limite);
  return cargas.filter((c) => c.dia >= claveLimite);
}

// Valida lo leído del celu: descarta lo que no tenga la forma esperada.
export function leerCargasGuardadas(datos: unknown): CargaPasos[] {
  if (!Array.isArray(datos)) return [];
  return datos.filter(
    (c): c is CargaPasos =>
      !!c &&
      typeof c === 'object' &&
      typeof c.id === 'string' &&
      typeof c.dia === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(c.dia) &&
      typeof c.hora === 'string' &&
      (c.tipo === 'km' || c.tipo === 'minutos') &&
      Number.isFinite(c.valor) &&
      Number.isFinite(c.pasos) &&
      c.pasos >= 0 &&
      Number.isFinite(c.minutos) &&
      c.minutos >= 0,
  );
}
