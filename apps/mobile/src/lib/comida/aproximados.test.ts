import { alimentoEstimado, buscarAlimentoDeItem } from '../coach/alimentoDeAccion';
import type { ItemComida } from '../coach/acciones';
import { ALIMENTOS_CASEROS } from './alimentos';
import { borradorDeValores, corregirAproximado, erroresValores, FUENTE_CORREGIDA, valoresDesdeBorrador } from './aproximados';
import { alimentosRecientes, nuevoRegistro, type RegistroComida } from './diario';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));

const ahora = new Date(2026, 10, 26, 21, 30);
const item: ItemComida = {
  busqueda: 'tarta de acelga',
  estado: 'cocido',
  estadoAsumido: true,
  cantidad: { gramos: 200 },
  estimado: { kcal: 400, proteinas: 5, carbos: 40, grasas: 25 },
};
const tarta = alimentoEstimado(item);
const casera = ALIMENTOS_CASEROS[0];
const registros: RegistroComida[] = [
  nuevoRegistro('2026-11-25', 'cena', tarta, { modo: 'gramos', gramos: 200 }, new Date(2026, 10, 25, 21), 'r1'),
  nuevoRegistro('2026-11-26', 'almuerzo', tarta, { modo: 'gramos', gramos: 150 }, ahora, 'r2'),
  nuevoRegistro('2026-11-26', 'almuerzo', casera, { modo: 'gramos', gramos: 100 }, ahora, 'r3'),
];
const buenos = { kcal: 220, proteinas: 7.5, carbos: 22, grasas: 11 };

describe('corregir un alimento aproximado', () => {
  test('cambia los valores en todos sus registros y nada más', () => {
    const corregidos = corregirAproximado(registros, tarta.id, buenos);
    expect(corregidos[0].alimento).toMatchObject({ ...buenos, origen: 'estimado', fuente: FUENTE_CORREGIDA });
    expect(corregidos[1].alimento).toMatchObject(buenos);
    expect(corregidos[0].cantidad).toEqual(registros[0].cantidad);
    expect(corregidos[2]).toBe(registros[2]);
  });

  test('no toca alimentos que no son aproximados', () => {
    expect(corregirAproximado(registros, casera.id, buenos)[2]).toBe(registros[2]);
  });

  test('la próxima vez el coach reusa los valores corregidos', () => {
    const corregidos = corregirAproximado(registros, tarta.id, buenos);
    const encontrado = buscarAlimentoDeItem(item, { recientes: alimentosRecientes(corregidos), propios: [] });
    expect(encontrado.donde).toBe('reciente');
    expect(encontrado.alimento).toMatchObject(buenos);
  });
});

describe('formulario de valores', () => {
  test('ida y vuelta con coma decimal', () => {
    const b = borradorDeValores(buenos);
    expect(b).toEqual({ kcal: '220', proteinas: '7,5', carbos: '22', grasas: '11' });
    expect(valoresDesdeBorrador(b)).toEqual(buenos);
  });

  test('macros vacíos son 0', () => {
    expect(valoresDesdeBorrador({ kcal: '100', proteinas: '', carbos: '', grasas: '' })).toEqual({
      kcal: 100,
      proteinas: 0,
      carbos: 0,
      grasas: 0,
    });
  });

  test('errores con los límites de cada 100 g', () => {
    expect(erroresValores({ kcal: '', proteinas: '0', carbos: '0', grasas: '0' }).kcal).toBeDefined();
    expect(erroresValores({ kcal: '950', proteinas: '0', carbos: '0', grasas: '0' }).kcal).toBeDefined();
    expect(erroresValores({ kcal: '300', proteinas: '60', carbos: '50', grasas: '0' }).grasas).toBeDefined();
    expect(valoresDesdeBorrador({ kcal: 'x', proteinas: '0', carbos: '0', grasas: '0' })).toBeNull();
  });
});
