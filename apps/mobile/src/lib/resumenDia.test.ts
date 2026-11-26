import {
  armarResumenDia,
  kcalRestantes,
  META_MINUTOS_SEMANA_OMS,
  pasosTotales,
  porcentaje,
  porcentajeKcal,
  resumenDeEjemplo,
  segmentosLlenos,
} from './resumenDia';

describe('kcalRestantes', () => {
  test('objetivo + actividad − comido', () => {
    expect(kcalRestantes({ objetivo: 2200, actividad: 350, comidas: 1430 })).toBe(1120);
  });

  test('sin actividad', () => {
    expect(kcalRestantes({ objetivo: 2000, actividad: 0, comidas: 500 })).toBe(1500);
  });

  test('nunca baja de 0 aunque te pases', () => {
    expect(kcalRestantes({ objetivo: 2000, actividad: 100, comidas: 2600 })).toBe(0);
  });
});

describe('porcentaje', () => {
  test('proporción sobre la meta', () => {
    expect(porcentaje(96, 150)).toBeCloseTo(64);
    expect(porcentaje(0, 150)).toBe(0);
  });

  test('tope de 100%', () => {
    expect(porcentaje(12000, 10000)).toBe(100);
  });

  test('sin meta válida o con valores negativos queda en 0', () => {
    expect(porcentaje(50, 0)).toBe(0);
    expect(porcentaje(50, -10)).toBe(0);
    expect(porcentaje(-5, 100)).toBe(0);
    expect(porcentaje(Number.NaN, 100)).toBe(0);
  });
});

test('porcentajeKcal usa lo comido sobre objetivo + actividad', () => {
  expect(porcentajeKcal({ objetivo: 1500, actividad: 500, comidas: 500 })).toBe(25);
  expect(porcentajeKcal({ objetivo: 1500, actividad: 500, comidas: 3000 })).toBe(100);
});

test('segmentosLlenos pinta sólo los segmentos completos', () => {
  expect(segmentosLlenos(78.42, 4)).toBe(3); // 7.842 / 10.000, como en el diseño
  expect(segmentosLlenos(100, 4)).toBe(4);
  expect(segmentosLlenos(150, 4)).toBe(4);
  expect(segmentosLlenos(24, 4)).toBe(0);
  expect(segmentosLlenos(0, 4)).toBe(0);
  expect(segmentosLlenos(50, 0)).toBe(0);
});

test('pasosTotales suma automáticos y manuales', () => {
  expect(pasosTotales({ automaticos: 5600, manuales: 2700, meta: 10000 })).toBe(8300);
});

describe('resumenDeEjemplo', () => {
  test('con los datos del diseño restan 1190 kcal', () => {
    expect(kcalRestantes(resumenDeEjemplo(10000).kcal)).toBe(1190);
  });

  test('usa la meta de pasos que recibe', () => {
    expect(resumenDeEjemplo(8000).pasos.meta).toBe(8000);
  });

  test('la meta semanal de minutos es la de la OMS', () => {
    expect(resumenDeEjemplo(10000).minutosActivos.metaSemana).toBe(META_MINUTOS_SEMANA_OMS);
    expect(META_MINUTOS_SEMANA_OMS).toBe(150);
  });
});

describe('armarResumenDia', () => {
  const perfil = { alturaCm: 175, pesoKg: 75 };

  test('usa los pasos del sensor y suma los manuales', () => {
    const r = armarResumenDia({ metaPasos: 10000, pasosAutomaticos: 6000, pasosManuales: 2700, minutos: { hoy: 34, semana: 110 }, perfil });
    expect(r.pasos).toEqual({ automaticos: 6000, manuales: 2700, meta: 10000 });
    expect(pasosTotales(r.pasos)).toBe(8700);
  });

  test('la actividad en kcal sale de los pasos totales (km × peso × 0,5)', () => {
    // 10.000 pasos → 7,2625 km × 75 × 0,5 = 272
    const r = armarResumenDia({ metaPasos: 10000, pasosAutomaticos: 7300, pasosManuales: 2700, minutos: { hoy: 34, semana: 110 }, perfil });
    expect(r.kcal.actividad).toBe(272);
    // objetivo y comido siguen de ejemplo: 2350 + 272 − 1480
    expect(kcalRestantes(r.kcal)).toBe(1142);
  });

  test('sin pasos no hay actividad', () => {
    const r = armarResumenDia({ metaPasos: 10000, pasosAutomaticos: 0, pasosManuales: 0, minutos: { hoy: 0, semana: 0 }, perfil });
    expect(r.kcal.actividad).toBe(0);
  });

  test('las kcal del entreno se suman a la actividad', () => {
    const r = armarResumenDia({
      metaPasos: 10000,
      pasosAutomaticos: 7300,
      pasosManuales: 2700,
      minutos: { hoy: 34, semana: 110 },
      perfil,
      kcalEntreno: 375,
    });
    expect(r.kcal.actividad).toBe(272 + 375);
  });

  test('entreno de hoy: la sesión armada o nada', () => {
    const datos = { metaPasos: 10000, pasosAutomaticos: 0, pasosManuales: 0, minutos: { hoy: 0, semana: 0 }, perfil };
    expect(armarResumenDia(datos).entreno).toBeNull();
    const entreno = { nombre: 'Pecho y hombros', ejercicios: 4, enCurso: false, rutinaId: null };
    expect(armarResumenDia({ ...datos, entreno }).entreno).toEqual(entreno);
  });

  test('usa los minutos activos reales y la meta de la OMS', () => {
    const r = armarResumenDia({ metaPasos: 10000, pasosAutomaticos: 0, pasosManuales: 0, minutos: { hoy: 12, semana: 47 }, perfil });
    expect(r.minutosActivos).toEqual({ hoy: 12, semana: 47, metaSemana: META_MINUTOS_SEMANA_OMS });
  });
});
