import type { Alimento } from './alimentos';
import {
  cambiarCantidad,
  cambiarModo,
  cantidadInicial,
  detalleCantidad,
  gramosDe,
  leerCantidad,
  leerGramos,
  nutrientesCantidad,
  nutrientesDe,
  sumarNutrientes,
  textoCantidad,
  type Cantidad,
} from './porciones';

// Los valores del diseño (milanesa de carne al horno, 245 kcal cada 100 g).
const milanesa: Alimento = {
  id: 'casera:prueba',
  nombre: 'Milanesa de carne al horno',
  origen: 'casera',
  marca: null,
  codigo: null,
  imagen: null,
  kcal: 245,
  proteinas: 22,
  carbos: 14,
  grasas: 11.3,
  porciones: [{ nombre: 'milanesa', plural: 'milanesas', gramos: 150, estimada: true }],
  fuente: 'prueba',
};
const sinPorciones: Alimento = { ...milanesa, porciones: [] };
const una: Cantidad = { modo: 'unidades', unidades: 1, porcion: 0 };

test('cantidad inicial: 1 unidad, o 100 g si no hay porciones', () => {
  expect(cantidadInicial(milanesa)).toEqual(una);
  expect(cantidadInicial(sinPorciones)).toEqual({ modo: 'gramos', gramos: 100 });
});

test('gramos de unidades y de gramos', () => {
  expect(gramosDe(milanesa, { ...una, unidades: 1.5 })).toBe(225);
  expect(gramosDe(milanesa, { modo: 'gramos', gramos: 80 })).toBe(80);
  expect(gramosDe(sinPorciones, una)).toBe(0);
});

test('kcal y macros de la porción (1 milanesa = 368 kcal, como en el diseño)', () => {
  expect(nutrientesCantidad(milanesa, una)).toEqual({ kcal: 368, proteinas: 33, carbos: 21, grasas: 17 });
  expect(nutrientesDe(milanesa, 0)).toEqual({ kcal: 0, proteinas: 0, carbos: 0, grasas: 0 });
  expect(nutrientesDe(milanesa, 33).proteinas).toBe(7.3);
});

test('sumar nutrientes', () => {
  expect(
    sumarNutrientes([
      { kcal: 90, proteinas: 4.1, carbos: 10, grasas: 3.2 },
      { kcal: 220, proteinas: 3.2, carbos: 24.1, grasas: 12 },
    ]),
  ).toEqual({ kcal: 310, proteinas: 7.3, carbos: 34.1, grasas: 15.2 });
  expect(sumarNutrientes([])).toEqual({ kcal: 0, proteinas: 0, carbos: 0, grasas: 0 });
});

describe('cambiarCantidad', () => {
  test('unidades de a media, entre 0,5 y 20', () => {
    expect(cambiarCantidad(una, 1)).toEqual({ ...una, unidades: 1.5 });
    expect(cambiarCantidad({ ...una, unidades: 0.5 }, -1)).toEqual({ ...una, unidades: 0.5 });
    expect(cambiarCantidad({ ...una, unidades: 20 }, 1)).toEqual({ ...una, unidades: 20 });
  });

  test('gramos de a 10, al múltiplo siguiente', () => {
    expect(cambiarCantidad({ modo: 'gramos', gramos: 100 }, 1)).toEqual({ modo: 'gramos', gramos: 110 });
    expect(cambiarCantidad({ modo: 'gramos', gramos: 155 }, 1)).toEqual({ modo: 'gramos', gramos: 160 });
    expect(cambiarCantidad({ modo: 'gramos', gramos: 155 }, -1)).toEqual({ modo: 'gramos', gramos: 150 });
    expect(cambiarCantidad({ modo: 'gramos', gramos: 10 }, -1)).toEqual({ modo: 'gramos', gramos: 5 });
    expect(cambiarCantidad({ modo: 'gramos', gramos: 5 }, 1)).toEqual({ modo: 'gramos', gramos: 10 });
  });
});

describe('cambiarModo', () => {
  test('de unidades a gramos y vuelta', () => {
    expect(cambiarModo(milanesa, { ...una, unidades: 1.5 }, 'gramos')).toEqual({ modo: 'gramos', gramos: 225 });
    expect(cambiarModo(milanesa, { modo: 'gramos', gramos: 230 }, 'unidades')).toEqual({ ...una, unidades: 1.5 });
    expect(cambiarModo(milanesa, { modo: 'gramos', gramos: 20 }, 'unidades')).toEqual({ ...una, unidades: 0.5 });
  });

  test('sin porciones, se queda en gramos', () => {
    const g: Cantidad = { modo: 'gramos', gramos: 100 };
    expect(cambiarModo(sinPorciones, g, 'unidades')).toBe(g);
  });
});

test('leer gramos escritos a mano', () => {
  expect(leerGramos('150')).toBe(150);
  expect(leerGramos('1.200')).toBe(1200);
  expect(leerGramos('4')).toBeNull();
  expect(leerGramos('2001')).toBeNull();
  expect(leerGramos('12,5')).toBeNull();
});

test('textos de la cantidad', () => {
  expect(textoCantidad(milanesa, una)).toBe('1 milanesa');
  expect(textoCantidad(milanesa, { ...una, unidades: 1.5 })).toBe('1,5 milanesas');
  expect(textoCantidad(milanesa, { modo: 'gramos', gramos: 1200 })).toBe('1.200 g');
  expect(detalleCantidad(milanesa, una)).toBe('1 milanesa · 150 g');
  expect(detalleCantidad(milanesa, { modo: 'gramos', gramos: 200 })).toBe('200 g');
});

test('leer la cantidad guardada', () => {
  expect(leerCantidad(una, milanesa)).toEqual(una);
  expect(leerCantidad({ modo: 'gramos', gramos: 200 }, milanesa)).toEqual({ modo: 'gramos', gramos: 200 });
  expect(leerCantidad({ ...una, porcion: 3 }, milanesa)).toBeNull();
  expect(leerCantidad({ ...una, unidades: 0 }, milanesa)).toBeNull();
  expect(leerCantidad({ modo: 'gramos', gramos: 9000 }, milanesa)).toBeNull();
  expect(leerCantidad('x', milanesa)).toBeNull();
});
