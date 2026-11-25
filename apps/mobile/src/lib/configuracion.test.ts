import { CONFIGURACION_POR_DEFECTO, leerConfiguracion, validarMetaPasos } from './configuracion';

test('la meta de pasos por defecto es 10.000', () => {
  expect(CONFIGURACION_POR_DEFECTO.metaPasos).toBe(10000);
});

describe('validarMetaPasos', () => {
  test('redondea a la centena', () => {
    expect(validarMetaPasos(8049)).toBe(8000);
    expect(validarMetaPasos(8050)).toBe(8100);
  });

  test('rechaza valores fuera de rango o no numéricos', () => {
    expect(validarMetaPasos(500)).toBeNull();
    expect(validarMetaPasos(60000)).toBeNull();
    expect(validarMetaPasos(Number.NaN)).toBeNull();
  });
});

describe('leerConfiguracion', () => {
  test('sin nada guardado usa los valores por defecto', () => {
    expect(leerConfiguracion(null)).toEqual(CONFIGURACION_POR_DEFECTO);
    expect(leerConfiguracion('basura')).toEqual(CONFIGURACION_POR_DEFECTO);
  });

  test('usa la meta guardada si es válida', () => {
    expect(leerConfiguracion({ metaPasos: 8000 })).toEqual({ metaPasos: 8000 });
  });

  test('descarta una meta guardada inválida', () => {
    expect(leerConfiguracion({ metaPasos: -3 })).toEqual(CONFIGURACION_POR_DEFECTO);
  });
});
