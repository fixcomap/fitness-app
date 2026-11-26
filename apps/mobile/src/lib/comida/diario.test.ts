import type { Alimento } from './alimentos';
import {
  agregarRegistro,
  alimentosRecientes,
  borrarRegistro,
  diaComidas,
  editarRegistro,
  etiquetaDia,
  leerDiarioGuardado,
  nuevoRegistro,
  restarDias,
  textoAgregarA,
  type RegistroComida,
} from './diario';

const alimento = (id: string, kcal: number): Alimento => ({
  id,
  nombre: id,
  origen: 'casera',
  marca: null,
  codigo: null,
  imagen: null,
  kcal,
  proteinas: 10,
  carbos: 20,
  grasas: 5,
  porciones: [{ nombre: 'unidad', plural: 'unidades', gramos: 50, estimada: true }],
  fuente: 'prueba',
});

const mate = alimento('mate', 36);
const medialuna = alimento('medialuna', 406);
const hora = (h: number) => new Date(2026, 10, 25, h);

const r1 = nuevoRegistro('2026-11-25', 'desayuno', mate, { modo: 'gramos', gramos: 250 }, hora(8), 'a');
const r2 = nuevoRegistro(
  '2026-11-25',
  'desayuno',
  medialuna,
  { modo: 'unidades', unidades: 2, porcion: 0 },
  hora(9),
  'b',
);
const r3 = nuevoRegistro('2026-11-24', 'cena', medialuna, { modo: 'gramos', gramos: 100 }, hora(21), 'c');
const registros: RegistroComida[] = [r2, r1, r3];

test('textos para agregar', () => {
  expect(textoAgregarA('almuerzo')).toBe('Agregar al almuerzo');
  expect(textoAgregarA('merienda')).toBe('Agregar a la merienda');
  expect(textoAgregarA('snacks')).toBe('Agregar a los snacks');
});

describe('diaComidas', () => {
  const dia = diaComidas(registros, '2026-11-25');

  test('las 5 secciones en orden, con lo de ese día en el orden en que se cargó', () => {
    expect(dia.secciones.map((s) => s.comida)).toEqual(['desayuno', 'almuerzo', 'merienda', 'cena', 'snacks']);
    expect(dia.secciones[0].registros.map((r) => r.id)).toEqual(['a', 'b']);
    expect(dia.secciones[3].registros).toEqual([]);
  });

  test('totales por sección y del día', () => {
    // 250 g de mate (90 kcal) + 2 × 50 g de medialuna (406 kcal)
    expect(dia.secciones[0].totales).toEqual({ kcal: 496, proteinas: 35, carbos: 70, grasas: 17.5 });
    expect(dia.secciones[1].totales.kcal).toBe(0);
    expect(dia.totales).toEqual(dia.secciones[0].totales);
  });

  test('un día sin nada', () => {
    expect(diaComidas(registros, '2026-01-01').totales).toEqual({ kcal: 0, proteinas: 0, carbos: 0, grasas: 0 });
  });
});

test('editar y borrar', () => {
  const editados = editarRegistro(registros, 'a', { cantidad: { modo: 'gramos', gramos: 500 }, comida: 'merienda' });
  expect(editados.find((r) => r.id === 'a')).toMatchObject({ comida: 'merienda', cantidad: { gramos: 500 } });
  expect(editados.find((r) => r.id === 'b')).toBe(r2);
  expect(borrarRegistro(registros, 'a').map((r) => r.id)).toEqual(['b', 'c']);
});

test('agregar guarda sólo los últimos 120 días (con hoy)', () => {
  const viejo = { ...r3, id: 'viejo', dia: '2026-07-28' };
  const limite = { ...r3, id: 'limite', dia: '2026-07-29' }; // hoy y los 119 días anteriores
  const nuevos = agregarRegistro([viejo, limite, r1], r2, '2026-11-25');
  expect(nuevos.map((r) => r.id)).toEqual(['limite', 'a', 'b']);
});

test('etiqueta del día', () => {
  expect(etiquetaDia('2026-11-25', '2026-11-25')).toBe('Hoy, mié 25');
  expect(etiquetaDia('2026-11-24', '2026-11-25')).toBe('Ayer, mar 24');
  expect(etiquetaDia('2026-11-23', '2026-11-25')).toBe('lun 23 nov');
  expect(etiquetaDia('2026-02-28', '2026-03-01')).toBe('Ayer, sáb 28');
});

test('restar días cruza meses y años', () => {
  expect(restarDias('2026-12-31', -1)).toBe('2027-01-01');
  expect(restarDias('2026-03-01', 1)).toBe('2026-02-28');
  expect(restarDias('2026-01-05', 10)).toBe('2025-12-26');
});

test('recientes: sin repetir, del más nuevo al más viejo', () => {
  expect(alimentosRecientes(registros).map((a) => a.id)).toEqual(['medialuna', 'mate']);
  expect(alimentosRecientes(registros, 1).map((a) => a.id)).toEqual(['medialuna']);
});

describe('leerDiarioGuardado', () => {
  test('ida y vuelta por JSON', () => {
    expect(leerDiarioGuardado(JSON.parse(JSON.stringify(registros)))).toEqual(registros);
  });

  test('descarta los registros rotos', () => {
    expect(leerDiarioGuardado(null)).toEqual([]);
    expect(
      leerDiarioGuardado([
        r1,
        { ...r1, dia: 'ayer' },
        { ...r1, comida: 'brunch' },
        { ...r1, creado: 'nunca' },
        { ...r1, alimento: { ...mate, kcal: 'mucho' } },
        { ...r1, cantidad: { modo: 'unidades', unidades: 1, porcion: 5 } },
      ]),
    ).toEqual([r1]);
  });
});
