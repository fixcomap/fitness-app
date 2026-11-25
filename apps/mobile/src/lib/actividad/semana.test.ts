import type { CargaPasos } from '../pasosManuales';
import { armarSemana, minutosActivos, pasosRecientes } from './semana';

const AHORA = new Date(2026, 10, 25, 15); // miércoles

// Últimos 7 días del sensor: jue 19 a mié 25.
const sensor = [19, 20, 21, 22, 23, 24, 25].map((d, i) => ({
  dia: new Date(2026, 10, d),
  pasos: [9000, 8000, 7000, 12000, 6000, 11000, 7000][i],
}));

const carga = (dia: string, pasos: number, minutos: number): CargaPasos => ({
  id: dia + pasos,
  dia,
  hora: '10:00',
  tipo: 'minutos',
  valor: minutos,
  pasos,
  minutos,
});

const cargas = [carga('2026-11-25', 842, 8), carga('2026-11-23', 0, 5), carga('2026-11-21', 500, 5)];

describe('armarSemana', () => {
  const semana = armarSemana(AHORA, sensor, cargas);

  test('lunes a domingo, con hoy y los días que faltan marcados', () => {
    expect(semana.dias).toHaveLength(7);
    expect(semana.dias[0].fecha).toEqual(new Date(2026, 10, 23));
    expect(semana.dias.map((d) => d.esHoy)).toEqual([false, false, true, false, false, false, false]);
    expect(semana.dias.map((d) => d.futuro)).toEqual([false, false, false, true, true, true, true]);
  });

  test('suma sensor y manuales; los días futuros quedan en 0', () => {
    expect(semana.dias.map((d) => d.pasos)).toEqual([6000, 11000, 7842, 0, 0, 0, 0]);
  });

  test('promedio de lunes a hoy', () => {
    expect(semana.promedio).toBe(8281);
  });
});

test('pasosRecientes junta sensor y manuales por día', () => {
  expect(pasosRecientes(sensor, cargas)).toEqual([9000, 8000, 7500, 12000, 6000, 11000, 7842]);
});

describe('minutosActivos', () => {
  const sensorMin = { '2026-11-22': 60, '2026-11-23': 30, '2026-11-24': 40, '2026-11-25': 20 };

  test('hoy: sensor + manuales de hoy', () => {
    expect(minutosActivos(AHORA, sensorMin, cargas).hoy).toBe(28);
  });

  test('semana: de lunes a hoy, sin el domingo anterior', () => {
    // sensor 30 + 40 + 20, manuales 5 (lun) + 8 (hoy)
    expect(minutosActivos(AHORA, sensorMin, cargas).semana).toBe(103);
  });

  test('sin sensor quedan sólo los manuales', () => {
    expect(minutosActivos(AHORA, {}, cargas)).toEqual({ hoy: 8, semana: 13 });
  });
});
