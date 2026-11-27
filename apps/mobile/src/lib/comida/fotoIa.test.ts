import { ErrorApi } from '../api';
import { ALIMENTOS_CASEROS, esAproximado, type Alimento } from './alimentos';
import { nuevoRegistro } from './diario';
import {
  errorFoto,
  FUENTE_ESTIMADO_FOTO,
  itemComidaDeFoto,
  leerResultadoFoto,
  redimension,
  registrosConFoto,
  resolverItemsFoto,
  SIN_COMIDA,
  type ItemFoto,
} from './fotoIa';
import { gramosDe } from './porciones';

const casera = (id: string) => ALIMENTOS_CASEROS.find((a) => a.id === `casera:${id}`)!;
const foto = (cambios: Partial<ItemFoto> = {}): ItemFoto => ({
  nombre: 'Arroz blanco',
  gramos: 150,
  kcal: 195,
  proteinas: 4,
  carbos: 42,
  grasas: 0.5,
  confianza: 0.8,
  ...cambios,
});
const vacia = { recientes: [], propios: [] };

describe('redimension', () => {
  test('el lado mayor queda en 1600 px, conservando la proporción', () => {
    expect(redimension(4032, 3024)).toEqual({ width: 1600 }); // iPhone horizontal
    expect(redimension(3024, 4032)).toEqual({ height: 1600 }); // iPhone vertical
    expect(redimension(2000, 2000)).toEqual({ width: 1600 });
  });

  test('si ya es chica, o no se sabe el tamaño, no se toca', () => {
    expect(redimension(1600, 1200)).toBeNull();
    expect(redimension(800, 600)).toBeNull();
    expect(redimension(0, 0)).toBeNull();
    expect(redimension(NaN, 3000)).toBeNull();
  });
});

describe('leerResultadoFoto', () => {
  test('lee los alimentos y saltea los que no se entienden', () => {
    expect(leerResultadoFoto({ items: [foto(), { nombre: '' }, { ...foto(), gramos: 0 }, 'x'], total: {} })).toEqual([
      foto(),
    ]);
  });

  test('sin lista, null; una lista vacía es que no hay comida', () => {
    expect(leerResultadoFoto(null)).toBeNull();
    expect(leerResultadoFoto({ total: {} })).toBeNull();
    expect(leerResultadoFoto({ items: [] })).toEqual([]);
  });

  test('la confianza queda entre 0 y 1', () => {
    expect(leerResultadoFoto({ items: [foto({ confianza: 3 })] })?.[0].confianza).toBe(1);
    expect(leerResultadoFoto({ items: [{ ...foto(), confianza: 'alta' }] })?.[0].confianza).toBe(0);
  });
});

describe('itemComidaDeFoto', () => {
  test('como un ítem del coach: busca por nombre, en gramos, con lo estimado pasado a 100 g', () => {
    expect(itemComidaDeFoto(foto())).toEqual({
      busqueda: 'Arroz blanco',
      estado: 'no-aplica',
      estadoAsumido: false,
      cantidad: { gramos: 150 },
      estimado: { kcal: 130, proteinas: 2.7, carbos: 28, grasas: 0.3 },
    });
  });

  test('una porción chiquita no pasa los máximos de la app por 100 g', () => {
    const aceite = itemComidaDeFoto(
      foto({ nombre: 'Aceite', gramos: 5, kcal: 50, grasas: 6, carbos: 0, proteinas: 0 }),
    );
    expect(aceite.estimado.kcal).toBe(900);
    expect(aceite.estimado.grasas).toBe(100);
  });
});

describe('resolverItemsFoto', () => {
  test('lo que está en la base usa sus valores; lo que no, lo estimado por la IA como aproximado', () => {
    const [arroz, raro] = resolverItemsFoto(
      [foto(), foto({ nombre: 'Guiso de lentejas con chorizo', confianza: 0.3 })],
      vacia,
    );
    expect(arroz.donde).toBe('casera');
    expect(arroz.alimento).toBe(casera('arroz'));
    expect(gramosDe(arroz.alimento, arroz.cantidad)).toBe(150);
    expect(arroz.confianza).toBe(0.8);
    expect(raro.donde).toBe('estimado');
    expect(esAproximado(raro.alimento)).toBe(true);
    expect(raro.alimento.fuente).toBe(FUENTE_ESTIMADO_FOTO);
    expect(raro.alimento.kcal).toBe(130);
    expect(raro.confianza).toBe(0.3);
  });

  test('primero lo que ya comió (recientes), como el coach', () => {
    const propio: Alimento = { ...casera('arroz'), id: 'propio:1', origen: 'propio' };
    expect(resolverItemsFoto([foto()], { recientes: [propio], propios: [] })[0]).toMatchObject({
      alimento: propio,
      donde: 'reciente',
    });
  });
});

describe('registrosConFoto', () => {
  test('agrega cada alimento a esa comida y ese día, sin tocar lo que había', () => {
    const ahora = new Date(2026, 10, 27, 13, 0);
    const antes = [
      nuevoRegistro('2026-11-27', 'desayuno', casera('arroz'), { modo: 'gramos', gramos: 50 }, ahora, 'r0'),
    ];
    const ids = ['r1', 'r2'];
    const items = resolverItemsFoto([foto(), foto({ nombre: 'Empanada de carne', gramos: 90 })], vacia);
    const despues = registrosConFoto(antes, '2026-11-27', 'almuerzo', items, ahora, '2026-11-27', () => ids.shift()!);
    expect(despues.map((r) => [r.id, r.comida, r.dia, r.alimento.nombre])).toEqual([
      ['r0', 'desayuno', '2026-11-27', 'Arroz blanco'],
      ['r1', 'almuerzo', '2026-11-27', 'Arroz blanco'],
      ['r2', 'almuerzo', '2026-11-27', 'Empanada de carne'],
    ]);
    expect(antes).toHaveLength(1);
  });
});

describe('errorFoto', () => {
  test('429 y 503: el mensaje de la API, sin reintentar', () => {
    const limite = 'Llegaste al límite de 10 fotos por hoy. Mañana tenés 10 fotos de nuevo.';
    expect(errorFoto(new ErrorApi('limite', limite, 429))).toEqual({ mensaje: limite, reintentar: false });
    expect(errorFoto(new ErrorApi('no-disponible', 'La IA no está disponible', 503)).reintentar).toBe(false);
  });

  test('422: no encontró comida', () => {
    expect(errorFoto(new ErrorApi('pedido', 'x', 422))).toEqual({ mensaje: SIN_COMIDA, reintentar: false });
  });

  test('red o tiempo: probá de nuevo, con la misma foto', () => {
    for (const tipo of ['red', 'tiempo'] as const) {
      const r = errorFoto(new ErrorApi(tipo, 'x'));
      expect(r.reintentar).toBe(true);
      expect(r.mensaje).toMatch(/probá de nuevo/);
    }
  });

  test('foto ilegible (413/415), servidor u otro error', () => {
    expect(errorFoto(new ErrorApi('pedido', 'x', 413))).toEqual({
      mensaje: 'No pudimos leer la foto. Probá con otra.',
      reintentar: false,
    });
    expect(errorFoto(new ErrorApi('servidor', 'x', 502)).reintentar).toBe(true);
    expect(errorFoto(new Error('raro')).reintentar).toBe(true);
  });
});
