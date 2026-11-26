import { leerAlimento } from './alimentos';
import { nutrientesCantidad } from './porciones';
import {
  alimentoDesdeBorrador,
  BORRADOR_ALIMENTO_VACIO,
  erroresAlimento,
  guardarPropio,
  leerPropiosGuardados,
  leerValor,
  plural,
  type BorradorAlimento,
} from './propios';

// La etiqueta de un alfajor: por porción de 50 g.
const alfajor: BorradorAlimento = {
  ...BORRADOR_ALIMENTO_VACIO,
  nombre: 'Alfajor de la cooperativa',
  base: 'porcion',
  porcionGramos: '50',
  porcionNombre: 'Alfajor',
  kcal: '220',
  proteinas: '2,5',
  carbos: '30',
  grasas: '10',
  codigo: '7791234567890',
};

const cada100: BorradorAlimento = {
  ...BORRADOR_ALIMENTO_VACIO,
  nombre: 'Granola casera',
  kcal: '450',
  proteinas: '10',
  carbos: '60',
  grasas: '18',
};

test('leer valores con coma o punto', () => {
  expect(leerValor('2,5')).toBe(2.5);
  expect(leerValor(' 30 ')).toBe(30);
  expect(leerValor('')).toBeNull();
  expect(leerValor('-3')).toBeNull();
  expect(leerValor('1,2,3')).toBeNull();
});

test('plural', () => {
  expect(plural('alfajor')).toBe('alfajores');
  expect(plural('galletita')).toBe('galletitas');
});

describe('erroresAlimento', () => {
  test('válidos', () => {
    expect(erroresAlimento(alfajor)).toEqual({});
    expect(erroresAlimento(cada100)).toEqual({});
  });

  test('nombre y kcal obligatorios; los macros vacíos cuentan como 0', () => {
    const e = erroresAlimento(BORRADOR_ALIMENTO_VACIO);
    expect(Object.keys(e).sort()).toEqual(['kcal', 'nombre']);
    expect(erroresAlimento({ ...cada100, proteinas: '', grasas: '' })).toEqual({});
  });

  test('por porción, los gramos de la porción son obligatorios', () => {
    expect(erroresAlimento({ ...alfajor, porcionGramos: '' }).porcionGramos).toBeDefined();
    expect(erroresAlimento({ ...alfajor, porcionGramos: '3000' }).porcionGramos).toBe('Entre 1 y 2000 g.');
    // cada 100 g, la porción es opcional
    expect(erroresAlimento({ ...cada100, porcionGramos: '' })).toEqual({});
  });

  test('valores imposibles, revisados cada 100 g', () => {
    expect(erroresAlimento({ ...cada100, kcal: '950' }).kcal).toBeDefined();
    // 500 kcal en una porción de 50 g = 1000 kcal cada 100 g
    expect(erroresAlimento({ ...alfajor, kcal: '500' }).kcal).toBeDefined();
    expect(erroresAlimento({ ...alfajor, carbos: '60' }).carbos).toBeDefined();
    expect(erroresAlimento({ ...cada100, proteinas: '40', carbos: '40', grasas: '30' }).grasas).toMatch(/suman más/);
    expect(erroresAlimento({ ...cada100, carbos: 'mucho' }).carbos).toBe('Escribí un número.');
  });

  test('código de barras opcional, pero válido', () => {
    expect(erroresAlimento({ ...cada100, codigo: '123' }).codigo).toBeDefined();
    expect(erroresAlimento({ ...cada100, codigo: '' })).toEqual({});
  });
});

describe('alimentoDesdeBorrador', () => {
  test('por porción: pasa los valores a cada 100 g y guarda la porción de la etiqueta', () => {
    const a = alimentoDesdeBorrador(alfajor, 'x1');
    expect(a).toEqual({
      id: 'propio:x1',
      nombre: 'Alfajor de la cooperativa',
      origen: 'propio',
      marca: null,
      codigo: '7791234567890',
      imagen: null,
      kcal: 440,
      proteinas: 5,
      carbos: 60,
      grasas: 20,
      porciones: [{ nombre: 'alfajor', plural: 'alfajores', gramos: 50, estimada: false }],
      fuente: 'Etiqueta del producto, cargada por vos',
    });
    // 1 alfajor vuelve a dar lo que dice la etiqueta
    expect(nutrientesCantidad(a!, { modo: 'unidades', unidades: 1, porcion: 0 })).toEqual({
      kcal: 220,
      proteinas: 2.5,
      carbos: 30,
      grasas: 10,
    });
  });

  test('cada 100 g: sin porción, o con porción genérica si se indica', () => {
    expect(alimentoDesdeBorrador(cada100, 'x2')).toMatchObject({
      kcal: 450,
      proteinas: 10,
      porciones: [],
      codigo: null,
    });
    expect(alimentoDesdeBorrador({ ...cada100, porcionGramos: '40' }, 'x3')?.porciones).toEqual([
      { nombre: 'porción', plural: 'porciones', gramos: 40, estimada: false },
    ]);
  });

  test('con errores, null', () => {
    expect(alimentoDesdeBorrador({ ...alfajor, nombre: '' }, 'x4')).toBeNull();
  });

  test('pasa la validación de lo guardado', () => {
    const a = alimentoDesdeBorrador(alfajor, 'x5');
    expect(leerAlimento(a)).toEqual(a);
  });
});

describe('guardados', () => {
  const a = alimentoDesdeBorrador(alfajor, 'a')!;
  const b = alimentoDesdeBorrador(cada100, 'b')!;

  test('el último creado va primero', () => {
    expect(guardarPropio([a], b).map((x) => x.id)).toEqual(['propio:b', 'propio:a']);
  });

  test('leer descarta lo inválido y lo que no es propio', () => {
    expect(leerPropiosGuardados([a, { ...b, kcal: -1 }, { ...b, origen: 'casera' }])).toEqual([a]);
    expect(leerPropiosGuardados(null)).toEqual([]);
  });
});
