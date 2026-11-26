import caseras from '../../data/alimentosCaseros.json';
import {
  ALIMENTOS_CASEROS,
  buscarCaseras,
  leerAlimento,
  normalizar,
  subtituloAlimento,
  type Alimento,
} from './alimentos';

const nombres = (lista: readonly Alimento[]) => lista.map((a) => a.nombre);

describe('base de comidas caseras', () => {
  test('alrededor de 100 comidas, con ids únicos', () => {
    expect(ALIMENTOS_CASEROS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(ALIMENTOS_CASEROS.map((a) => a.id)).size).toBe(ALIMENTOS_CASEROS.length);
  });

  test('cada una cita su alimento de USDA FoodData Central', () => {
    for (const c of caseras) {
      expect(c.fuente.base).toBe('USDA FoodData Central');
      expect(c.fuente.alimentos.length).toBeGreaterThan(0);
      for (const a of c.fuente.alimentos) {
        expect(Number.isInteger(a.fdcId)).toBe(true);
        expect(a.descripcion).not.toBe('');
      }
    }
  });

  test('las porciones por unidad están marcadas como estimadas', () => {
    for (const a of ALIMENTOS_CASEROS) {
      expect(a.porciones.length).toBeGreaterThan(0);
      for (const p of a.porciones) {
        expect(p.estimada).toBe(true);
        expect(p.gramos).toBeGreaterThan(0);
      }
    }
  });

  test('las kcal cuadran con los macros (4·P + 4·C + 9·G, ±20 %)', () => {
    for (const a of ALIMENTOS_CASEROS.filter((x) => x.kcal >= 50)) {
      const atwater = 4 * a.proteinas + 4 * a.carbos + 9 * a.grasas;
      expect(Math.abs(atwater - a.kcal) / a.kcal).toBeLessThan(0.2);
    }
  });

  test('pasan la validación de lo guardado', () => {
    for (const a of ALIMENTOS_CASEROS) expect(leerAlimento(a)).toEqual(a);
  });

  test('tiene las comidas pedidas', () => {
    const todos = normalizar(nombres(ALIMENTOS_CASEROS).join(' | '));
    for (const n of [
      'milanesa de carne frita',
      'milanesa de pollo al horno',
      'empanada de humita',
      'fugazzeta',
      'noquis',
      'vacio',
      'morcilla',
      'choripan',
      'pure de papas',
      'medialuna',
      'alfajor',
      'dulce de leche',
      'mate cocido con leche',
      'cafe con leche',
    ]) {
      expect(todos).toContain(n);
    }
  });
});

describe('buscarCaseras', () => {
  test('sin importar tildes ni mayúsculas', () => {
    expect(nombres(buscarCaseras('ÑOQUIS'))).toEqual(['Ñoquis de papa']);
    expect(nombres(buscarCaseras('pure'))).toContain('Puré de papas');
  });

  test('todas las palabras, en cualquier orden', () => {
    expect(nombres(buscarCaseras('pollo milanesa'))).toEqual(['Milanesa de pollo al horno', 'Milanesa de pollo frita']);
  });

  test('primero las que empiezan con lo buscado', () => {
    const r = nombres(buscarCaseras('queso'));
    expect(r[0].startsWith('Queso')).toBe(true);
    expect(r).toContain('Tarta de queso');
  });

  test('vacío o sin coincidencias', () => {
    expect(buscarCaseras('  ')).toEqual([]);
    expect(buscarCaseras('sushi')).toEqual([]);
  });
});

test('subtítulo: origen y kcal cada 100 g', () => {
  const [milanesa] = buscarCaseras('milanesa de carne al horno');
  expect(subtituloAlimento(milanesa)).toBe('Casera · 216 kcal / 100 g');
  expect(subtituloAlimento({ ...milanesa, origen: 'envasado', marca: 'Arcor' })).toBe('Arcor · 216 kcal / 100 g');
  expect(subtituloAlimento({ ...milanesa, origen: 'propio' })).toBe('Creado por vos · 216 kcal / 100 g');
});

describe('leerAlimento', () => {
  const [base] = ALIMENTOS_CASEROS;
  test('descarta lo que no es válido', () => {
    expect(leerAlimento(null)).toBeNull();
    expect(leerAlimento({ ...base, nombre: ' ' })).toBeNull();
    expect(leerAlimento({ ...base, origen: 'otro' })).toBeNull();
    expect(leerAlimento({ ...base, kcal: -1 })).toBeNull();
    expect(leerAlimento({ ...base, proteinas: 120 })).toBeNull();
    expect(leerAlimento({ ...base, porciones: [{ nombre: 'x', plural: 'xs', gramos: 0 }] })).toBeNull();
  });
});
