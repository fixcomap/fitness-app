import { estadoFuente, leerEstadoFuente, leerPasos, pasosDeHoy, pasosPorDia } from './consultas';
import { crearFuenteFalsa } from './fuenteFalsa';

const AHORA = new Date(2026, 10, 25, 15, 0); // miércoles 15:00

describe('estadoFuente', () => {
  test('sin fuente disponible no importa el permiso', () => {
    expect(estadoFuente(false, 'concedido')).toBe('no-disponible');
  });

  test('disponible: depende del permiso', () => {
    expect(estadoFuente(true, 'concedido')).toBe('activa');
    expect(estadoFuente(true, 'sin-preguntar')).toBe('sin-preguntar');
    expect(estadoFuente(true, 'denegado')).toBe('denegado');
  });
});

test('leerEstadoFuente no consulta el permiso si no está disponible', async () => {
  expect(await leerEstadoFuente(crearFuenteFalsa({ disponible: false }).fuente)).toBe('no-disponible');
  expect(await leerEstadoFuente(crearFuenteFalsa({ permiso: 'sin-preguntar' }).fuente)).toBe('sin-preguntar');
});

describe('leerPasos', () => {
  test('suma los pasos del rango', async () => {
    const { fuente } = crearFuenteFalsa({
      muestras: [
        { fecha: new Date(2026, 10, 25, 9), pasos: 1000 },
        { fecha: new Date(2026, 10, 25, 12), pasos: 500 },
      ],
    });
    expect(await leerPasos(fuente, new Date(2026, 10, 25, 8), new Date(2026, 10, 25, 10))).toBe(1000);
  });

  test('si la fuente falla devuelve null en vez de tirar error', async () => {
    const { fuente } = crearFuenteFalsa({ falla: true });
    expect(await leerPasos(fuente, new Date(2026, 10, 25, 8), AHORA)).toBeNull();
  });
});

test('pasosDeHoy cuenta desde la medianoche hasta ahora', async () => {
  const { fuente, consultas } = crearFuenteFalsa({
    muestras: [
      { fecha: new Date(2026, 10, 24, 23, 50), pasos: 300 }, // ayer
      { fecha: new Date(2026, 10, 25, 7), pasos: 2000 },
      { fecha: new Date(2026, 10, 25, 14), pasos: 1500 },
    ],
  });
  expect(await pasosDeHoy(fuente, AHORA)).toBe(3500);
  expect(consultas[0]).toEqual([new Date(2026, 10, 25), AHORA]);
});

describe('pasosPorDia', () => {
  test('últimos 7 días, del más viejo a hoy', async () => {
    const { fuente } = crearFuenteFalsa({
      muestras: [
        { fecha: new Date(2026, 10, 19, 10), pasos: 4000 }, // jueves anterior (día 1 de 7)
        { fecha: new Date(2026, 10, 24, 10), pasos: 9000 }, // ayer
        { fecha: new Date(2026, 10, 25, 10), pasos: 7842 }, // hoy
        { fecha: new Date(2026, 10, 25, 18), pasos: 999 }, // hoy, pero más tarde que "ahora"
      ],
    });
    const dias = await pasosPorDia(fuente, AHORA);
    expect(dias).toHaveLength(7);
    expect(dias[0]).toEqual({ dia: new Date(2026, 10, 19), pasos: 4000 });
    expect(dias.map((d) => d.pasos)).toEqual([4000, 0, 0, 0, 0, 9000, 7842]);
  });

  test('si la fuente falla, los días quedan en 0', async () => {
    const { fuente } = crearFuenteFalsa({ falla: true });
    expect((await pasosPorDia(fuente, AHORA, 3)).map((d) => d.pasos)).toEqual([0, 0, 0]);
  });
});
