import type { TotalesDia } from './historial';
import { armarSemana, minutosActivos } from './semana';

const AHORA = new Date(2026, 10, 25, 15); // miércoles

const totales: Record<string, TotalesDia> = {
  '2026-11-22': { pasos: 12000, minutos: 60 }, // domingo anterior
  '2026-11-23': { pasos: 6000, minutos: 35 },
  '2026-11-24': { pasos: 11000, minutos: 40 },
  '2026-11-25': { pasos: 7842, minutos: 28 },
};
const totalDelDia = (clave: string) => totales[clave] ?? { pasos: 0, minutos: 0 };

describe('armarSemana', () => {
  const semana = armarSemana(AHORA, totalDelDia);

  test('lunes a domingo, con hoy y los días que faltan marcados', () => {
    expect(semana.dias).toHaveLength(7);
    expect(semana.dias[0].fecha).toEqual(new Date(2026, 10, 23));
    expect(semana.dias.map((d) => d.esHoy)).toEqual([false, false, true, false, false, false, false]);
    expect(semana.dias.map((d) => d.futuro)).toEqual([false, false, false, true, true, true, true]);
  });

  test('pasos de cada día; los futuros quedan en 0', () => {
    expect(semana.dias.map((d) => d.pasos)).toEqual([6000, 11000, 7842, 0, 0, 0, 0]);
  });

  test('promedio de lunes a hoy', () => {
    expect(semana.promedio).toBe(8281);
  });
});

describe('minutosActivos', () => {
  test('hoy y la semana de lunes a hoy, sin el domingo anterior', () => {
    expect(minutosActivos(AHORA, totalDelDia)).toEqual({ hoy: 28, semana: 103 });
  });

  test('sin datos da 0', () => {
    expect(minutosActivos(AHORA, () => ({ pasos: 0, minutos: 0 }))).toEqual({ hoy: 0, semana: 0 });
  });
});
