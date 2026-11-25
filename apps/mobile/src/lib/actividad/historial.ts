// Historial propio de actividad: total de pasos y minutos activos de cada día
// cerrado (ya terminado). Sirve para que la racha y el promedio no dependan de
// los 7 días que guarda el podómetro. Funciones puras.
import { inicioDelDia, sumarDias } from '../fechas';
import { claveDia, type CargaPasos } from '../pasosManuales';
import type { PasosDelDia } from './consultas';

export const MAX_DIAS_HISTORIAL = 400;

export interface TotalesDia {
  pasos: number;
  minutos: number;
}

export interface RegistroDia extends TotalesDia {
  dia: string; // 'AAAA-MM-DD'
  // true: el total incluye el podómetro y ya no cambia.
  // false: sólo cargas manuales (Android o sin permiso); se puede corregir si aparece el sensor.
  conSensor: boolean;
}

export const CERO: TotalesDia = { pasos: 0, minutos: 0 };

const FORMATO_DIA = /^\d{4}-\d{2}-\d{2}$/;
const esCantidad = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

// Valida lo leído del almacenamiento: descarta registros mal formados, deja uno
// por día (el último), ordena del más viejo al más nuevo y se queda con 400 días.
export function leerHistorialGuardado(datos: unknown): RegistroDia[] {
  if (!Array.isArray(datos)) return [];
  const porDia = new Map<string, RegistroDia>();
  for (const r of datos) {
    if (
      r &&
      typeof r === 'object' &&
      typeof r.dia === 'string' &&
      FORMATO_DIA.test(r.dia) &&
      esCantidad(r.pasos) &&
      esCantidad(r.minutos) &&
      typeof r.conSensor === 'boolean'
    ) {
      porDia.set(r.dia, { dia: r.dia, pasos: Math.round(r.pasos), minutos: Math.round(r.minutos), conSensor: r.conSensor });
    }
  }
  return recortar([...porDia.values()]);
}

function recortar(registros: RegistroDia[]): RegistroDia[] {
  return registros.sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0)).slice(-MAX_DIAS_HISTORIAL);
}

// Suma registros nuevos al historial:
// - sólo días cerrados (antes de hoy);
// - un día con sensor es definitivo y no se pisa;
// - un día sin sensor se reemplaza por el dato nuevo.
// Devuelve el mismo arreglo si no cambió nada (para no guardar de más).
export function actualizarHistorial(historial: readonly RegistroDia[], nuevos: readonly RegistroDia[], hoy: Date): readonly RegistroDia[] {
  const claveHoy = claveDia(hoy);
  const porDia = new Map(historial.map((r) => [r.dia, r]));
  let cambio = false;
  for (const nuevo of nuevos) {
    if (nuevo.dia >= claveHoy) continue;
    const actual = porDia.get(nuevo.dia);
    if (actual?.conSensor) continue;
    if (actual && actual.pasos === nuevo.pasos && actual.minutos === nuevo.minutos && actual.conSensor === nuevo.conSensor) continue;
    porDia.set(nuevo.dia, nuevo);
    cambio = true;
  }
  return cambio ? recortar([...porDia.values()]) : historial;
}

// Totales "en vivo" de los últimos días: sensor + cargas manuales, por día.
export function totalesVivos(
  pasosSensor: readonly PasosDelDia[],
  minutosSensor: Readonly<Record<string, number>>,
  cargas: readonly CargaPasos[],
): Map<string, TotalesDia> {
  const vivos = new Map<string, TotalesDia>();
  for (const { dia, pasos } of pasosSensor) {
    const clave = claveDia(dia);
    vivos.set(clave, { pasos, minutos: minutosSensor[clave] ?? 0 });
  }
  for (const c of cargas) {
    const actual = vivos.get(c.dia) ?? CERO;
    vivos.set(c.dia, { pasos: actual.pasos + c.pasos, minutos: actual.minutos + c.minutos });
  }
  return vivos;
}

// Registros para guardar: los días cerrados de los totales en vivo.
export function registrosCerrados(vivos: ReadonlyMap<string, TotalesDia>, hoy: Date, conSensor: boolean): RegistroDia[] {
  const claveHoy = claveDia(hoy);
  return [...vivos.entries()]
    .filter(([dia]) => dia < claveHoy)
    .map(([dia, t]) => ({ dia, pasos: t.pasos, minutos: t.minutos, conSensor }));
}

// Total de un día: hoy sale de lo vivo; un día cerrado, del historial si está
// (con sensor es definitivo), si no de lo vivo.
export function crearTotalDelDia(
  hoy: Date,
  historial: readonly RegistroDia[],
  vivos: ReadonlyMap<string, TotalesDia>,
): (clave: string) => TotalesDia {
  const claveHoy = claveDia(hoy);
  const guardados = new Map(historial.map((r) => [r.dia, r]));
  return (clave) => {
    if (clave === claveHoy) return vivos.get(clave) ?? CERO;
    const registro = guardados.get(clave);
    if (registro?.conSensor) return registro;
    return vivos.get(clave) ?? registro ?? CERO;
  };
}

// Pasos por día desde el día más viejo que se conoce hasta hoy (máximo 400 días),
// del más viejo a hoy. Los días sin datos van en 0. Es la serie para la racha.
export function serieDePasos(hoy: Date, historial: readonly RegistroDia[], totalDelDia: (clave: string) => TotalesDia, minimoDias = 7): number[] {
  const inicioHoy = inicioDelDia(hoy);
  const masViejo = historial[0]?.dia;
  let dias = minimoDias;
  if (masViejo) {
    const [a, m, d] = masViejo.split('-').map(Number);
    const desde = Math.round((inicioHoy.getTime() - new Date(a, m - 1, d).getTime()) / 86_400_000) + 1;
    dias = Math.max(dias, desde);
  }
  dias = Math.min(dias, MAX_DIAS_HISTORIAL + 1);
  return Array.from({ length: dias }, (_, i) => totalDelDia(claveDia(sumarDias(inicioHoy, i - (dias - 1)))).pasos);
}
