import {
  duracionMs,
  formatearCronometro,
  formatearDuracion,
  kcalEntreno,
  kcalEntrenoDelDia,
  mejorPeso,
  recordsNuevos,
  seriesTotales,
  volumenTotal,
} from './resumen';
import type { SesionGuardada } from './tipos';

type SinRango = Omit<SesionGuardada['ejercicios'][number], 'rango'>;
const sesion = (id: string, fin: string, ejercicios: SinRango[], kcal = 0): SesionGuardada => ({
  id,
  nombre: 'Pecho',
  inicio: '2026-11-25T18:00:00Z',
  fin,
  kcal,
  ejercicios: ejercicios.map((e) => ({ ...e, rango: { min: 8, max: 12 } })),
});

const hoy = sesion('hoy', '2026-11-25T19:00:00Z', [
  {
    ejercicioId: 'press',
    seriesTotales: 3,
    series: [
      { kg: 14, reps: 10, repsObjetivo: 10 },
      { kg: 14, reps: 8, repsObjetivo: 10 },
    ],
  },
  { ejercicioId: 'flexiones', seriesTotales: 2, series: [{ kg: null, reps: 15, repsObjetivo: 12 }] },
  { ejercicioId: 'remo', seriesTotales: 1, series: [{ kg: 40, reps: 10, repsObjetivo: 10 }] },
]);

const anteriores = [
  sesion('a', '2026-11-11T19:00:00Z', [{ ejercicioId: 'press', seriesTotales: 1, series: [{ kg: 10, reps: 10, repsObjetivo: 10 }] }]),
  sesion('b', '2026-11-18T19:00:00Z', [
    { ejercicioId: 'press', seriesTotales: 1, series: [{ kg: 12, reps: 10, repsObjetivo: 10 }] },
    { ejercicioId: 'remo', seriesTotales: 1, series: [{ kg: 45, reps: 10, repsObjetivo: 10 }] },
  ]),
];

describe('kcalEntreno', () => {
  test('MET 5 × peso × horas', () => {
    expect(kcalEntreno(75, 3_600_000)).toBe(375);
    expect(kcalEntreno(80, 45 * 60_000)).toBe(300);
  });

  test('sin peso o sin duración da 0', () => {
    expect(kcalEntreno(0, 3_600_000)).toBe(0);
    expect(kcalEntreno(75, -5)).toBe(0);
  });
});

test('volumen: kg × reps, las series sin peso no suman', () => {
  expect(volumenTotal(hoy)).toBe(14 * 10 + 14 * 8 + 40 * 10);
});

test('series y duración', () => {
  expect(seriesTotales(hoy)).toBe(4);
  expect(duracionMs(hoy)).toBe(3_600_000);
});

test('mejorPeso en todo el historial', () => {
  expect(mejorPeso(anteriores, 'press')).toBe(12);
  expect(mejorPeso(anteriores, 'nunca')).toBeNull();
});

describe('recordsNuevos', () => {
  test('sólo cuando supera el mejor peso anterior', () => {
    expect(recordsNuevos(hoy, anteriores)).toEqual([{ ejercicioId: 'press', kg: 14, anterior: 12 }]);
  });

  test('la primera vez no es récord y la propia sesión no cuenta', () => {
    expect(recordsNuevos(hoy, [])).toEqual([]);
    expect(recordsNuevos(hoy, [hoy])).toEqual([]);
  });
});

test('kcalEntrenoDelDia suma las sesiones que terminaron ese día', () => {
  const fin = new Date(2026, 10, 25, 19, 0).toISOString();
  const ayer = new Date(2026, 10, 24, 19, 0).toISOString();
  const historial = [sesion('x', fin, [], 300), sesion('y', fin, [], 120), sesion('z', ayer, [], 500)];
  expect(kcalEntrenoDelDia(historial, '2026-11-25')).toBe(420);
});

test('formatearCronometro', () => {
  expect(formatearCronometro(0)).toBe('0:00');
  expect(formatearCronometro(245_000)).toBe('4:05');
  expect(formatearCronometro(3_723_000)).toBe('1:02:03');
});

test('formatearDuracion', () => {
  expect(formatearDuracion(20_000)).toBe('1 min');
  expect(formatearDuracion(45 * 60_000)).toBe('45 min');
  expect(formatearDuracion(65 * 60_000)).toBe('1 h 5 min');
  expect(formatearDuracion(120 * 60_000)).toBe('2 h');
});
