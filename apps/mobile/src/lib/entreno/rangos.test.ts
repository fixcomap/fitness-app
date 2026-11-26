import { buscarEjercicioPorId, EJERCICIOS } from '../../data/ejercicios';
import type { Ejercicio } from '../../data/tipos';
import { ajustarRango, rangoPorDefecto, rangoValido, textoRango, tipoDe } from './rangos';

const ej = (id: string): Ejercicio => {
  const e = buscarEjercicioPorId(id);
  if (!e) throw new Error(`falta ${id}`);
  return e;
};

describe('tipoDe', () => {
  test.each([
    'press-banca-barra',
    'sentadilla-barra',
    'peso-muerto',
    'remo-barra',
    'jalon-al-pecho',
    'prensa',
    'hip-thrust-barra',
  ])('%s es compuesto', (id) => expect(tipoDe(ej(id))).toBe('compuesto'));

  test.each([
    'elevaciones-laterales',
    'curl-barra',
    'triceps-polea',
    'peck-deck',
    'gemelos-de-pie-maquina',
    'crunch-polea',
  ])('%s es aislamiento', (id) => expect(tipoDe(ej(id))).toBe('aislamiento'));

  test('el campo tipo del catálogo corrige la regla', () => {
    expect(tipoDe(ej('press-frances-barra-z'))).toBe('aislamiento');
    expect(tipoDe(ej('gemelos-en-prensa'))).toBe('aislamiento');
    expect(tipoDe(ej('levantada-turca'))).toBe('compuesto');
    expect(tipoDe({ nombre: 'Press raro', tipo: 'aislamiento' })).toBe('aislamiento');
  });

  test('no importan las tildes ni las mayúsculas', () => {
    expect(tipoDe({ nombre: 'JALÓN al pecho' })).toBe('compuesto');
  });
});

describe('rangoPorDefecto', () => {
  test('compuestos con peso: 6–10, o 4–6 si el objetivo es fuerza', () => {
    expect(rangoPorDefecto(ej('press-banca-barra'), 'hipertrofia')).toEqual({ min: 6, max: 10 });
    expect(rangoPorDefecto(ej('press-banca-barra'), 'fuerza')).toEqual({ min: 4, max: 6 });
  });

  test('aislamiento: 10–15 con cualquier objetivo', () => {
    expect(rangoPorDefecto(ej('elevaciones-laterales'), 'hipertrofia')).toEqual({ min: 10, max: 15 });
    expect(rangoPorDefecto(ej('elevaciones-laterales'), 'fuerza')).toEqual({ min: 10, max: 15 });
  });

  test('peso corporal y bandas: 8–15, aunque sean compuestos', () => {
    expect(rangoPorDefecto(ej('dominadas'), 'fuerza')).toEqual({ min: 8, max: 15 });
    expect(rangoPorDefecto(ej('flexiones'), 'hipertrofia')).toEqual({ min: 8, max: 15 });
    expect(rangoPorDefecto({ nombre: 'Remo con banda', equipo: 'bandas' }, 'hipertrofia')).toEqual({ min: 8, max: 15 });
  });

  test('todos los ejercicios del catálogo tienen un rango válido', () => {
    for (const e of EJERCICIOS) {
      expect(rangoValido(rangoPorDefecto(e, 'hipertrofia'))).toBe(true);
      expect(rangoValido(rangoPorDefecto(e, 'fuerza'))).toBe(true);
    }
  });
});

describe('ajustarRango', () => {
  const r = { min: 8, max: 10 };

  test('sube y baja de a uno', () => {
    expect(ajustarRango(r, 'min', -1)).toEqual({ min: 7, max: 10 });
    expect(ajustarRango(r, 'max', 1)).toEqual({ min: 8, max: 11 });
  });

  test('min ≥ 1, max ≤ 30 y min ≤ max', () => {
    expect(ajustarRango({ min: 1, max: 5 }, 'min', -1)).toEqual({ min: 1, max: 5 });
    expect(ajustarRango({ min: 10, max: 30 }, 'max', 1)).toEqual({ min: 10, max: 30 });
    expect(ajustarRango({ min: 10, max: 10 }, 'min', 1)).toEqual({ min: 10, max: 10 });
    expect(ajustarRango({ min: 10, max: 10 }, 'max', -1)).toEqual({ min: 10, max: 10 });
  });
});

test('rangoValido', () => {
  expect(rangoValido({ min: 6, max: 10 })).toBe(true);
  expect(rangoValido({ min: 10, max: 6 })).toBe(false);
  expect(rangoValido({ min: 0, max: 6 })).toBe(false);
  expect(rangoValido({ min: 6, max: 31 })).toBe(false);
  expect(rangoValido({ min: 6.5, max: 10 })).toBe(false);
  expect(rangoValido(null)).toBe(false);
});

test('textoRango', () => {
  expect(textoRango({ min: 8, max: 10 })).toBe('8–10');
  expect(textoRango({ min: 12, max: 12 })).toBe('12');
});
