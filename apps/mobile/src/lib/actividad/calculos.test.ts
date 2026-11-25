import {
  etiquetaMiles,
  formatearKm,
  horasCandidatas,
  inicialDia,
  kcalCaminata,
  kmDesdePasos,
  mensajeOms,
  minutosActivosDeIntervalos,
  porcentajeOms,
  promedio,
  racha,
} from './calculos';

describe('kmDesdePasos', () => {
  test('pasos × altura × 0,415', () => {
    // 10.000 pasos × 72,625 cm = 7,2625 km
    expect(kmDesdePasos(10000, 175)).toBeCloseTo(7.2625);
  });

  test('sin pasos o sin altura da 0', () => {
    expect(kmDesdePasos(0, 175)).toBe(0);
    expect(kmDesdePasos(5000, 0)).toBe(0);
  });
});

describe('kcalCaminata', () => {
  test('km × peso × 0,5', () => {
    // 7,2625 km × 75 kg × 0,5 = 272,3
    expect(kcalCaminata(10000, 175, 75)).toBe(272);
  });

  test('sin peso o sin pasos da 0', () => {
    expect(kcalCaminata(10000, 175, 0)).toBe(0);
    expect(kcalCaminata(0, 175, 75)).toBe(0);
  });
});

describe('minutosActivosDeIntervalos', () => {
  test('cuenta 10 min por cada intervalo con ≥ 100 pasos/min', () => {
    expect(minutosActivosDeIntervalos([1000, 999, 1500, 0, 1200])).toBe(30);
  });

  test('sin intervalos da 0', () => {
    expect(minutosActivosDeIntervalos([])).toBe(0);
  });
});

test('horasCandidatas: sólo las horas con al menos 1000 pasos', () => {
  expect(horasCandidatas([0, 1000, 999, 4000])).toEqual([1, 3]);
});

describe('mensajeOms', () => {
  test('debajo de 150: cuánto falta y cuánto por día', () => {
    expect(mensajeOms(110, 4)).toEqual({
      tipo: 'falta',
      titulo: 'Te faltan 40 min esta semana',
      texto: 'Son 10 min por día hasta el domingo. Una caminata rápida después de comer alcanza.',
    });
  });

  test('redondea para arriba los minutos por día', () => {
    expect(mensajeOms(100, 3).texto).toContain('Son 17 min por día');
  });

  test('el domingo no divide por cero', () => {
    expect(mensajeOms(100, 0).texto).toContain('último día');
  });

  test('entre 150 y 299: cumplió el mínimo', () => {
    expect(mensajeOms(185, 2)).toEqual({
      tipo: 'minimo',
      titulo: 'Cumpliste el mínimo de la OMS',
      texto: 'Si sumás 115 min más llegás al ideal.',
    });
    expect(mensajeOms(150, 2).tipo).toBe('minimo');
  });

  test('300 o más: excelente', () => {
    expect(mensajeOms(300, 2).titulo).toBe('Superaste los 300 min, excelente');
  });
});

test('porcentajeOms en escala de 0 a 300', () => {
  expect(porcentajeOms(150)).toBe(50);
  expect(porcentajeOms(450)).toBe(100);
  expect(porcentajeOms(0)).toBe(0);
});

describe('racha', () => {
  test('días seguidos cumpliendo la meta hasta hoy', () => {
    expect(racha([12000, 4000, 10000, 11000, 10500], 10000)).toBe(3);
  });

  test('si hoy todavía no llegó, cuenta desde ayer', () => {
    expect(racha([10000, 11000, 3000], 10000)).toBe(2);
  });

  test('si ayer no se cumplió, la racha es 0', () => {
    expect(racha([10000, 2000, 3000], 10000)).toBe(0);
  });

  test('sin días da 0', () => {
    expect(racha([], 10000)).toBe(0);
  });
});

test('promedio', () => {
  expect(promedio([6000, 11000, 7842])).toBe(8281);
  expect(promedio([])).toBe(0);
});

test('inicialDia', () => {
  expect(inicialDia(new Date(2026, 10, 23))).toBe('L');
  expect(inicialDia(new Date(2026, 10, 25))).toBe('M');
  expect(inicialDia(new Date(2026, 10, 29))).toBe('D');
});

test('etiquetaMiles', () => {
  expect(etiquetaMiles(10000)).toBe('10 mil');
  expect(etiquetaMiles(7500)).toBe('7,5 mil');
  expect(etiquetaMiles(800)).toBe('800');
});

test('formatearKm', () => {
  expect(formatearKm(5.6925)).toBe('5,7');
  expect(formatearKm(7)).toBe('7,0');
});
