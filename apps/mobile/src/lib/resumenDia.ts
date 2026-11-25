// Resumen del día: lo que muestra la pantalla Inicio.
// Es el punto de encuentro de todas las secciones (Comida, Actividad, Entreno);
// por ahora arranca con datos de ejemplo y cada sección lo va a ir alimentando.

// Recomendación de la OMS para adultos: 150 minutos de actividad moderada por semana.
export const META_MINUTOS_SEMANA_OMS = 150;

export interface Meta {
  actual: number;
  meta: number;
}

export interface ResumenDia {
  kcal: {
    objetivo: number;
    actividad: number; // quemadas con actividad, se suman al objetivo
    comidas: number; // lo que ya comiste
  };
  macros: {
    proteinas: Meta; // gramos
    carbos: Meta;
    grasas: Meta;
  };
  pasos: {
    automaticos: number; // del sensor del celu
    manuales: number; // cargados a mano
    meta: number;
  };
  minutosActivos: {
    semana: number;
    hoy: number;
    metaSemana: number;
  };
  entreno: { nombre: string; duracionMin: number } | null;
}

// Datos de ejemplo hasta que cada sección cargue los reales.
export function resumenDeEjemplo(metaPasos: number): ResumenDia {
  return {
    kcal: { objetivo: 2350, actividad: 320, comidas: 1480 },
    macros: {
      proteinas: { actual: 96, meta: 150 },
      carbos: { actual: 160, meta: 280 },
      grasas: { actual: 48, meta: 75 },
    },
    pasos: { automaticos: 7842, manuales: 0, meta: metaPasos },
    minutosActivos: { semana: 110, hoy: 34, metaSemana: META_MINUTOS_SEMANA_OMS },
    entreno: { nombre: 'Empuje: pecho y hombros', duracionMin: 45 },
  };
}

// kcal restantes = objetivo + actividad − comido, sin bajar de 0.
export function kcalRestantes({ objetivo, actividad, comidas }: ResumenDia['kcal']): number {
  return Math.max(0, Math.round(objetivo + actividad - comidas));
}

// Porcentaje de una barra, entre 0 y 100. Sin meta válida, la barra queda vacía.
export function porcentaje(actual: number, meta: number): number {
  if (!(meta > 0) || !(actual > 0)) return 0;
  return Math.min(100, (actual / meta) * 100);
}

// Cuántos segmentos de una barra segmentada se pintan: sólo los completos.
export function segmentosLlenos(porcentajeActual: number, segmentos: number): number {
  if (!(segmentos > 0) || !(porcentajeActual > 0)) return 0;
  return Math.min(segmentos, Math.floor((Math.min(porcentajeActual, 100) / 100) * segmentos));
}

// Cuánto se llenó el anillo de kcal: lo comido sobre el total disponible del día.
export function porcentajeKcal(kcal: ResumenDia['kcal']): number {
  return porcentaje(kcal.comidas, kcal.objetivo + kcal.actividad);
}

export function pasosTotales({ automaticos, manuales }: ResumenDia['pasos']): number {
  return automaticos + manuales;
}

// Suma al resumen lo cargado a mano: los pasos y los minutos (que cuentan hoy y en la semana).
export function conCargasManuales(resumen: ResumenDia, manual: { pasos: number; minutos: number }): ResumenDia {
  return {
    ...resumen,
    pasos: { ...resumen.pasos, manuales: resumen.pasos.manuales + manual.pasos },
    minutosActivos: {
      ...resumen.minutosActivos,
      hoy: resumen.minutosActivos.hoy + manual.minutos,
      semana: resumen.minutosActivos.semana + manual.minutos,
    },
  };
}
