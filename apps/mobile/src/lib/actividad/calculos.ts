// Cuentas de actividad. Funciones puras.

// Largo de paso como fracción de la altura para estimar distancia.
export const FACTOR_LARGO_PASO_DISTANCIA = 0.415;
// kcal por km y por kg de peso al caminar (estimación).
export const KCAL_POR_KM_Y_KG = 0.5;

// km recorridos: pasos × largo de paso (altura × 0,415).
export function kmDesdePasos(pasos: number, alturaCm: number): number {
  if (!(pasos > 0) || !(alturaCm > 0)) return 0;
  return (pasos * alturaCm * FACTOR_LARGO_PASO_DISTANCIA) / 100000;
}

// kcal por caminar (estimación): km × peso × 0,5.
export function kcalCaminata(pasos: number, alturaCm: number, pesoKg: number): number {
  if (!(pesoKg > 0)) return 0;
  return Math.round(kmDesdePasos(pasos, alturaCm) * pesoKg * KCAL_POR_KM_Y_KG);
}

// ── Minutos activos ──

export const MINUTOS_INTERVALO = 10;
export const PASOS_POR_MINUTO_ACTIVO = 100;
export const OMS_MINIMO_SEMANA = 150;
export const OMS_IDEAL_SEMANA = 300;

// Cada intervalo de 10 min cuenta si promedia ≥ 100 pasos por minuto.
export function minutosActivosDeIntervalos(
  pasosPorIntervalo: readonly number[],
  minutosIntervalo = MINUTOS_INTERVALO,
  pasosPorMinuto = PASOS_POR_MINUTO_ACTIVO,
): number {
  return pasosPorIntervalo.filter((p) => p / minutosIntervalo >= pasosPorMinuto).length * minutosIntervalo;
}

// Una hora sólo puede tener un intervalo activo si sumó al menos 10 × 100 pasos.
// Sirve para pedirle al podómetro el detalle de 10 min sólo en esas horas.
export function horasCandidatas(pasosPorHora: readonly number[]): number[] {
  const umbral = MINUTOS_INTERVALO * PASOS_POR_MINUTO_ACTIVO;
  return pasosPorHora.flatMap((p, hora) => (p >= umbral ? [hora] : []));
}

export type TipoMensajeOms = 'falta' | 'minimo' | 'ideal';

export interface MensajeOms {
  tipo: TipoMensajeOms;
  titulo: string;
  texto: string;
}

// Mensaje según los minutos de la semana y los días que quedan después de hoy.
export function mensajeOms(minutosSemana: number, diasRestantes: number): MensajeOms {
  const minutos = Math.max(0, Math.round(minutosSemana));
  if (minutos < OMS_MINIMO_SEMANA) {
    const faltan = OMS_MINIMO_SEMANA - minutos;
    const texto =
      diasRestantes > 0
        ? `Son ${Math.ceil(faltan / diasRestantes)} min por día hasta el domingo. Una caminata rápida después de comer alcanza.`
        : 'Hoy es el último día de la semana. Una caminata rápida después de comer suma.';
    return { tipo: 'falta', titulo: `Te faltan ${faltan} min esta semana`, texto };
  }
  if (minutos < OMS_IDEAL_SEMANA) {
    return {
      tipo: 'minimo',
      titulo: 'Cumpliste el mínimo de la OMS',
      texto: `Si sumás ${OMS_IDEAL_SEMANA - minutos} min más llegás al ideal.`,
    };
  }
  return {
    tipo: 'ideal',
    titulo: 'Superaste los 300 min, excelente',
    texto: 'Estás en el rango ideal de la OMS para esta semana.',
  };
}

// Porcentaje de la barra de la OMS (escala de 0 a 300 min).
export function porcentajeOms(minutosSemana: number): number {
  if (!(minutosSemana > 0)) return 0;
  return Math.min(100, (minutosSemana / OMS_IDEAL_SEMANA) * 100);
}

// ── Pasos por día ──

// Días seguidos cumpliendo la meta, contando hacia atrás desde hoy.
// Si hoy todavía no se cumplió, no corta la racha: se empieza a contar desde ayer.
export function racha(pasosPorDia: readonly number[], meta: number): number {
  if (!(meta > 0) || pasosPorDia.length === 0) return 0;
  const dias = [...pasosPorDia];
  if (dias[dias.length - 1] < meta) dias.pop();
  let cuenta = 0;
  for (let i = dias.length - 1; i >= 0 && dias[i] >= meta; i--) cuenta++;
  return cuenta;
}

export function promedio(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

const INICIALES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// Inicial del día de la semana: L M M J V S D.
export function inicialDia(fecha: Date): string {
  return INICIALES[fecha.getDay()];
}

// "10 mil", "7,5 mil", "800"
export function etiquetaMiles(valor: number): string {
  if (valor < 1000) return String(Math.round(valor));
  const miles = Math.round(valor / 100) / 10;
  return `${String(miles).replace('.', ',')} mil`;
}

// "5,9" con una decimal y coma.
export function formatearKm(km: number): string {
  return (Math.round(km * 10) / 10).toFixed(1).replace('.', ',');
}
