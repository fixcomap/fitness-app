import { diasRestantesDeSemana, inicioDelDia, inicioDeSemana, mismoDia, sumarDias, sumarMinutos } from './fechas';

// 25/11/2026 es miércoles.
const MIERCOLES = new Date(2026, 10, 25, 15, 30);

test('inicioDelDia', () => {
  expect(inicioDelDia(MIERCOLES)).toEqual(new Date(2026, 10, 25));
});

test('sumarDias cruza meses y conserva la hora', () => {
  expect(sumarDias(MIERCOLES, 7)).toEqual(new Date(2026, 11, 2, 15, 30));
  expect(sumarDias(MIERCOLES, -25)).toEqual(new Date(2026, 9, 31, 15, 30));
});

test('sumarMinutos', () => {
  expect(sumarMinutos(MIERCOLES, -60)).toEqual(new Date(2026, 10, 25, 14, 30));
});

describe('inicioDeSemana (lunes)', () => {
  test('un miércoles vuelve al lunes', () => {
    expect(inicioDeSemana(MIERCOLES)).toEqual(new Date(2026, 10, 23));
  });

  test('el domingo pertenece a la semana que empezó el lunes anterior', () => {
    expect(inicioDeSemana(new Date(2026, 10, 29, 10))).toEqual(new Date(2026, 10, 23));
  });

  test('el lunes es su propio inicio', () => {
    expect(inicioDeSemana(new Date(2026, 10, 23, 8))).toEqual(new Date(2026, 10, 23));
  });
});

test('diasRestantesDeSemana', () => {
  expect(diasRestantesDeSemana(MIERCOLES)).toBe(4);
  expect(diasRestantesDeSemana(new Date(2026, 10, 23))).toBe(6);
  expect(diasRestantesDeSemana(new Date(2026, 10, 29))).toBe(0);
});

test('mismoDia', () => {
  expect(mismoDia(MIERCOLES, new Date(2026, 10, 25, 1))).toBe(true);
  expect(mismoDia(MIERCOLES, new Date(2026, 10, 26, 1))).toBe(false);
});
