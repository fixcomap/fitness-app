import type { AccionCoach, AccionDe, EstadoApp, ItemComida } from './acciones';
import { cambiarGramosPorUnidad, lineasComida, vistaTarjeta } from './tarjeta';

const ahora = new Date(2026, 10, 26, 21, 30);
const perfil = { alturaCm: 180, sexo: 'hombre' as const };
const vacio: EstadoApp = { rutinas: [], diario: [], cargas: [] };
const base = { recientes: [], propios: [] };
const estimado = { kcal: 250, proteinas: 10, carbos: 30, grasas: 10 };

const item = (busqueda: string, cantidad: ItemComida['cantidad'], extra: Partial<ItemComida> = {}): ItemComida => ({
  busqueda,
  estado: 'no-aplica',
  estadoAsumido: false,
  cantidad,
  estimado,
  ...extra,
});
const comida = (...items: ItemComida[]): AccionDe<'registrar_comida'> => ({
  id: 'a1',
  tipo: 'registrar_comida',
  dia: '2026-11-26',
  comida: 'almuerzo',
  items,
});

describe('líneas de comida', () => {
  test('en unidades con la porción de la base: sus gramos, sin editar ni aproximado', () => {
    const [linea] = lineasComida(comida(item('empanada de carne', { unidades: 2, porcion: 'empanada', gramosPorUnidad: 100 })), base);
    expect(linea).toEqual({ texto: 'Empanada de carne · 2 empanadas · ~90 g c/u', aproximado: false, gramosPorUnidad: null });
  });

  test('si no está en la base: aproximado, con los gramos del coach para corregir', () => {
    const [linea] = lineasComida(
      comida(item('tarta de acelga', { unidades: 1, porcion: 'porción', gramosPorUnidad: 180 }, { estado: 'cocido', estadoAsumido: true })),
      base,
    );
    expect(linea).toEqual({ texto: 'Tarta de acelga · 1 porción · ~180 g · cocido (supuesto)', aproximado: true, gramosPorUnidad: 180 });
  });

  test('en la base pero sin esa porción: se usan los gramos del coach y se pueden corregir', () => {
    const [linea] = lineasComida(comida(item('empanada de carne', { unidades: 3, porcion: 'docena', gramosPorUnidad: 1000 })), base);
    expect(linea.aproximado).toBe(false);
    expect(linea.gramosPorUnidad).toBe(1000);
  });

  test('en gramos: nada para corregir', () => {
    const [linea] = lineasComida(comida(item('tarta de acelga', { gramos: 200 })), base);
    expect(linea).toEqual({ texto: 'Tarta de acelga · 200 g', aproximado: true, gramosPorUnidad: null });
  });
});

describe('vista de la tarjeta', () => {
  test('ya no aplica si la rutina no existe', () => {
    const accion: AccionCoach = { id: 'q', tipo: 'quitar_ejercicios', rutinaId: 'nada', ejercicioIds: ['prensa'] };
    expect(vistaTarjeta(accion, vacio, { ahora, perfil }, base).problema?.mensaje).toBe('Esa rutina ya no existe.');
  });

  test('con avisos de conflictos', () => {
    const accion: AccionCoach = { id: 'p', tipo: 'cargar_pasos', dia: '2026-11-26', unidad: 'pasos', valor: 3000, hora: '10:00' };
    const cargas = [{ id: 'c', dia: '2026-11-26', hora: '09:00', tipo: 'pasos' as const, valor: 100, pasos: 100, minutos: 1 }];
    const vista = vistaTarjeta(accion, { ...vacio, cargas }, { ahora, perfil }, base);
    expect(vista.titulo).toBe('Caminata · Hoy, jue 26');
    expect(vista.lineas.map((l) => l.texto)).toEqual(['3.000 pasos · hasta las 10:00']);
    expect(vista.avisos.map((a) => a.tipo)).toEqual(['ya-cargado']);
    expect(vista.problema).toBeNull();
  });
});

describe('cambiar gramos por unidad', () => {
  const accion = comida(item('tarta de acelga', { unidades: 1, porcion: 'porción', gramosPorUnidad: 182 }), item('pan', { gramos: 50 }));
  const gramos = (a: AccionCoach) => {
    const c = (a as AccionDe<'registrar_comida'>).items[0].cantidad;
    return 'gramos' in c ? null : c.gramosPorUnidad;
  };

  test('de a 5 g, al múltiplo siguiente', () => {
    expect(gramos(cambiarGramosPorUnidad(accion, 0, 1))).toBe(185);
    expect(gramos(cambiarGramosPorUnidad(accion, 0, -1))).toBe(180);
  });

  test('entre 1 y 1.000', () => {
    const chico = comida(item('x', { unidades: 1, porcion: 'u', gramosPorUnidad: 3 }));
    expect(gramos(cambiarGramosPorUnidad(chico, 0, -1))).toBe(1);
    const grande = comida(item('x', { unidades: 1, porcion: 'u', gramosPorUnidad: 1000 }));
    expect(cambiarGramosPorUnidad(grande, 0, 1)).toBe(grande);
  });

  test('en gramos o fuera de rango no cambia', () => {
    expect(cambiarGramosPorUnidad(accion, 1, 1)).toBe(accion);
    expect(cambiarGramosPorUnidad(accion, 5, 1)).toBe(accion);
  });
});
