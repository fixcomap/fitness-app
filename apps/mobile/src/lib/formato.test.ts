import { formatearFechaCorta, formatearNumero, inicial } from './formato';

describe('formatearNumero', () => {
  test('separa los miles con punto', () => {
    expect(formatearNumero(7842)).toBe('7.842');
    expect(formatearNumero(10000)).toBe('10.000');
    expect(formatearNumero(1234567)).toBe('1.234.567');
  });

  test('números chicos y redondeo', () => {
    expect(formatearNumero(0)).toBe('0');
    expect(formatearNumero(999)).toBe('999');
    expect(formatearNumero(1189.6)).toBe('1.190');
  });

  test('negativos', () => {
    expect(formatearNumero(-2500)).toBe('-2.500');
  });
});

test('formatearFechaCorta como en el diseño', () => {
  expect(formatearFechaCorta(new Date(2026, 10, 25))).toBe('Miércoles 25 nov');
  expect(formatearFechaCorta(new Date(2026, 0, 4))).toBe('Domingo 4 ene');
});

test('inicial del nombre', () => {
  expect(inicial('Elías')).toBe('E');
  expect(inicial('  martina ')).toBe('M');
  expect(inicial('')).toBe('?');
});
