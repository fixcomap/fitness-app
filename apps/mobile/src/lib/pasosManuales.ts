// Pasos cargados a mano: lo que caminaste sin el celu encima.
// Todo lo de este archivo son funciones puras; el guardado está en almacenamiento.ts.
import type { Sexo } from './calorias';
import { inicioDelDia, sumarMinutos } from './fechas';
import { formatearNumero } from './formato';

export type TipoCarga = 'km' | 'minutos';

export interface CargaPasos {
  id: string;
  dia: string; // 'AAAA-MM-DD' en hora local
  hora: string; // 'HH:MM' en hora local (fin de la caminata)
  tipo: TipoCarga;
  valor: number; // km o minutos, según el tipo
  pasos: number; // los que se suman: estimado − lo que ya contó el celu
  minutos: number; // minutos activos que suma
  // Desde la carga inteligente (las cargas viejas no los tienen):
  inicio?: string; // 'HH:MM'
  estimado?: number; // pasos estimados por km o minutos
  registrado?: number; // pasos que el celu ya había contado en esa franja
}

export interface Franja {
  inicio: Date;
  fin: Date;
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

export function horaMinutos(fecha: Date): string {
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

// ── Franja horaria de la caminata ──

export const PASO_FRANJA_MIN = 15;
export const FRANJA_MINIMA_MIN = 5;

const sinSegundos = (fecha: Date) =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), fecha.getHours(), fecha.getMinutes());

// Por defecto: la última hora.
export function franjaPorDefecto(ahora: Date): Franja {
  const fin = sinSegundos(ahora);
  const inicio = sumarMinutos(fin, -60);
  // Pasada la medianoche no se puede ir al día anterior.
  return { inicio: inicio < inicioDelDia(fin) ? inicioDelDia(fin) : inicio, fin };
}

export function duracionMin(franja: Franja): number {
  return Math.round((franja.fin.getTime() - franja.inicio.getTime()) / 60_000);
}

// Mueve el inicio o el fin, sin salir de hoy, sin pasar de ahora y dejando al menos 5 minutos.
export function moverFranja(franja: Franja, extremo: 'inicio' | 'fin', deltaMin: number, ahora: Date): Franja {
  const piso = inicioDelDia(ahora);
  const techo = sinSegundos(ahora);
  const limitar = (fecha: Date, min: Date, max: Date) => new Date(Math.min(Math.max(fecha.getTime(), min.getTime()), max.getTime()));
  if (extremo === 'inicio') {
    const max = sumarMinutos(franja.fin, -FRANJA_MINIMA_MIN);
    return { ...franja, inicio: limitar(sumarMinutos(franja.inicio, deltaMin), piso, max) };
  }
  const min = sumarMinutos(franja.inicio, FRANJA_MINIMA_MIN);
  return { ...franja, fin: limitar(sumarMinutos(franja.fin, deltaMin), min, techo) };
}

// Mensaje de error si la carga no entra en la franja, o null si está bien.
export function validarCarga(tipo: TipoCarga, valor: number, franja: Franja): string | null {
  const duracion = duracionMin(franja);
  if (duracion < FRANJA_MINIMA_MIN) return 'El horario tiene que durar al menos 5 minutos.';
  if (tipo === 'minutos' && valor > duracion) return `En ese horario entran como mucho ${duracion} min.`;
  return null;
}

// ── Descuento de lo que ya contó el celu ──

export interface Descuento {
  estimado: number;
  registrado: number;
  suma: number; // estimado − registrado, mínimo 0
}

export function descontarRegistrado(estimado: number, registrado: number): Descuento {
  const est = Math.max(0, Math.round(estimado));
  const reg = Math.max(0, Math.round(registrado));
  return { estimado: est, registrado: reg, suma: Math.max(0, est - reg) };
}

// Los minutos activos se reducen en la misma proporción que los pasos
// (si el celu ya contó la mitad de la caminata, también contó la mitad del tiempo).
export function minutosProporcionales(minutos: number, { estimado, suma }: Descuento): number {
  if (!(estimado > 0)) return 0;
  return Math.round((minutos * suma) / estimado);
}

// "Estimado 4.100 · el celu ya contó 1.300 · se suman 2.800"
export function textoDescuento({ estimado, registrado, suma }: Descuento, conPodometro: boolean): string {
  const partes = [`Estimado ${formatearNumero(estimado)}`];
  if (conPodometro) partes.push(`el celu ya contó ${formatearNumero(registrado)}`);
  partes.push(`se suman ${formatearNumero(suma)}`);
  return partes.join(' · ');
}

export interface NuevaCarga {
  tipo: TipoCarga;
  valor: number;
  franja: Franja;
  registrado: number; // 0 si no hay podómetro
}

export function crearCarga({ tipo, valor, franja, registrado }: NuevaCarga, perfil: DatosPaso, id: string): CargaPasos {
  const { pasos: estimado, minutos } = convertir(tipo, valor, perfil);
  const descuento = descontarRegistrado(estimado, registrado);
  return {
    id,
    dia: claveDia(franja.fin),
    hora: horaMinutos(franja.fin),
    inicio: horaMinutos(franja.inicio),
    tipo,
    valor,
    pasos: descuento.suma,
    minutos: minutosProporcionales(minutos, descuento),
    estimado: descuento.estimado,
    registrado: descuento.registrado,
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
      c.minutos >= 0 &&
      (c.inicio === undefined || typeof c.inicio === 'string') &&
      (c.estimado === undefined || Number.isFinite(c.estimado)) &&
      (c.registrado === undefined || Number.isFinite(c.registrado)),
  );
}
