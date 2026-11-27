import { ALIMENTOS_CASEROS, esAproximado, leerAlimento, type Alimento } from '../comida/alimentos';
import { alimentosRecientes, nuevoRegistro } from '../comida/diario';
import { gramosDe, nutrientesCantidad } from '../comida/porciones';
import { aplicar, type ItemComida } from './acciones';
import { alimentoEstimado, alimentoParaAcciones, buscarAlimentoDeItem, cantidadEn, palabrasDeMas } from './alimentoDeAccion';

const casera = (id: string) => ALIMENTOS_CASEROS.find((a) => a.id === `casera:${id}`)!;
const item = (cambios: Partial<ItemComida> = {}): ItemComida => ({
  busqueda: 'empanada de carne',
  estado: 'cocido',
  estadoAsumido: true,
  cantidad: { unidades: 2, porcion: 'empanada', gramosPorUnidad: 80 },
  estimado: { kcal: 270, proteinas: 10, carbos: 25, grasas: 14 },
  ...cambios,
});
const vacia = { recientes: [], propios: [] };

describe('buscarAlimentoDeItem', () => {
  test('una casera, en sus unidades: usa sus gramos, no los que estimó el coach', () => {
    const r = buscarAlimentoDeItem(item(), vacia);
    expect(r.donde).toBe('casera');
    expect(r.alimento).toBe(casera('empanada-carne'));
    expect(r.cantidad).toEqual({ modo: 'unidades', unidades: 2, porcion: 0 });
    expect(gramosDe(r.alimento, r.cantidad)).toBe(180); // 2 × 90 g de la base
  });

  test('primero recientes, después propios, después caseras', () => {
    const propia: Alimento = { ...casera('empanada-carne'), id: 'propio:1', origen: 'propio', nombre: 'Empanada de carne' };
    const reciente: Alimento = { ...propia, id: 'off:1', origen: 'envasado' };
    expect(buscarAlimentoDeItem(item(), { recientes: [reciente], propios: [propia] }).donde).toBe('reciente');
    expect(buscarAlimentoDeItem(item(), { recientes: [], propios: [propia] }).alimento).toBe(propia);
  });

  test('el nombre exacto gana aunque esté en una lista que se mira después', () => {
    const conPollo: Alimento = { ...casera('arroz'), id: 'propio:2', origen: 'propio', nombre: 'Arroz blanco con pollo' };
    const arroz = item({ busqueda: 'arroz blanco', cantidad: { gramos: 150 } });
    const r = buscarAlimentoDeItem(arroz, { recientes: [conPollo], propios: [] });
    expect(r.alimento.nombre).toBe('Arroz blanco');
    expect(r.donde).toBe('casera');
    // Si no hay uno exacto, sirve el parecido.
    expect(buscarAlimentoDeItem(item({ busqueda: 'arroz con pollo' }), { recientes: [conPollo], propios: [] }).alimento).toBe(conPollo);
  });

  test('entre parecidos gana el de menos palabras de más; en empate, recientes → propios → caseras', () => {
    const conPollo: Alimento = { ...casera('arroz'), id: 'propio:2', origen: 'propio', nombre: 'Arroz blanco con pollo' };
    const r = buscarAlimentoDeItem(item({ busqueda: 'arroz', cantidad: { gramos: 150 } }), { recientes: [conPollo], propios: [] });
    expect(r.alimento).toBe(casera('arroz'));
    expect(r.donde).toBe('casera');
    // Empate (una palabra de más cada uno): gana el reciente.
    const integral: Alimento = { ...casera('arroz'), id: 'propio:4', origen: 'propio', nombre: 'Arroz integral' };
    expect(buscarAlimentoDeItem(item({ busqueda: 'arroz' }), { recientes: [integral], propios: [] }).alimento).toBe(integral);
    expect(palabrasDeMas('Arroz blanco con pollo', 'arroz')).toBe(3);
    expect(palabrasDeMas('Pechuga a la plancha', 'pechuga plancha')).toBe(2);
  });

  test('no usa uno que dice lo contrario de crudo o cocido', () => {
    const crudo: Alimento = { ...casera('arroz'), id: 'propio:3', origen: 'propio', nombre: 'Arroz blanco crudo' };
    const base = { recientes: [], propios: [crudo], caseras: [] };
    expect(buscarAlimentoDeItem(item({ busqueda: 'arroz blanco', estado: 'cocido' }), base).donde).toBe('estimado');
    expect(buscarAlimentoDeItem(item({ busqueda: 'arroz blanco', estado: 'crudo' }), base).alimento).toBe(crudo);
  });

  test('si no está en la base crea uno estimado, marcado aproximado, con los gramos por unidad del coach', () => {
    const r = buscarAlimentoDeItem(item({ busqueda: 'empanada de osobuco' }), vacia);
    expect(r.donde).toBe('estimado');
    expect(esAproximado(r.alimento)).toBe(true);
    expect(r.alimento).toMatchObject({
      id: 'estimado:empanada de osobuco (cocido)',
      nombre: 'Empanada de osobuco (cocido)',
      kcal: 270,
      porciones: [{ nombre: 'empanada', plural: 'empanadas', gramos: 80, estimada: true }],
    });
    expect(r.cantidad).toEqual({ modo: 'unidades', unidades: 2, porcion: 0 });
    // 2 × 80 g a 270 kcal cada 100 g.
    expect(nutrientesCantidad(r.alimento, r.cantidad).kcal).toBe(432);
    // Se guarda y se lee como cualquier alimento.
    expect(leerAlimento(r.alimento)).toEqual(r.alimento);
  });

  test('un estimado en gramos, sin porciones; y sin crudo/cocido si no aplica o ya lo dice', () => {
    expect(alimentoEstimado(item({ busqueda: 'mburucuyá', estado: 'no-aplica', cantidad: { gramos: 120 } }))).toMatchObject({
      nombre: 'Mburucuyá',
      porciones: [],
    });
    expect(alimentoEstimado(item({ busqueda: 'quinoa cocida' })).nombre).toBe('Quinoa cocida');
  });

  test('la segunda vez encuentra el estimado en recientes en vez de crear otro', () => {
    const primero = buscarAlimentoDeItem(item({ busqueda: 'empanada de osobuco' }), vacia);
    const diario = [nuevoRegistro('2026-11-25', 'cena', primero.alimento, primero.cantidad, new Date(2026, 10, 25, 21), 'r1')];
    const segundo = buscarAlimentoDeItem(item({ busqueda: 'empanada de osobuco', estimado: { kcal: 400, proteinas: 1, carbos: 1, grasas: 1 } }), {
      recientes: alimentosRecientes(diario),
      propios: [],
    });
    expect(segundo.donde).toBe('reciente');
    expect(segundo.alimento).toEqual(primero.alimento);
  });
});

describe('cantidadEn', () => {
  const pizza = casera('pizza-muzzarella');

  test('en unidades si el alimento tiene esa porción (singular o plural, sin tildes)', () => {
    expect(cantidadEn(pizza, { unidades: 3, porcion: 'porcion', gramosPorUnidad: 100 })).toEqual({ modo: 'unidades', unidades: 3, porcion: 0 });
    expect(cantidadEn(pizza, { unidades: 3, porcion: 'Porciones', gramosPorUnidad: 100 })).toEqual({ modo: 'unidades', unidades: 3, porcion: 0 });
  });

  test('si no tiene esa porción, en gramos con los gramos por unidad del coach', () => {
    expect(cantidadEn(pizza, { unidades: 2, porcion: 'pizza entera', gramosPorUnidad: 650 })).toEqual({ modo: 'gramos', gramos: 1300 });
    expect(cantidadEn(pizza, { gramos: 250 })).toEqual({ modo: 'gramos', gramos: 250 });
  });
});

test('con aplicar: registra la casera y crea el estimado de lo que no está', () => {
  const r = aplicar(
    {
      id: 'a1',
      tipo: 'registrar_comida',
      dia: '2026-11-26',
      comida: 'almuerzo',
      items: [item(), item({ busqueda: 'chipá', estado: 'no-aplica', cantidad: { unidades: 4, porcion: 'chipá', gramosPorUnidad: 15 } })],
    },
    { rutinas: [], diario: [], cargas: [] },
    {
      ahora: new Date(2026, 10, 26, 14),
      perfil: { alturaCm: 175, sexo: 'hombre' },
      crearId: (() => {
        let n = 0;
        return () => `r${++n}`;
      })(),
      alimentoPara: alimentoParaAcciones(vacia),
    },
  );
  if (!r.ok) throw new Error(r.problema.mensaje);
  expect(r.estadoNuevo.diario.map((x) => [x.alimento.nombre, x.alimento.origen, gramosDe(x.alimento, x.cantidad)])).toEqual([
    ['Empanada de carne', 'casera', 180],
    ['Chipá', 'estimado', 60],
  ]);
});
