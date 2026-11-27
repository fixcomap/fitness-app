import type { Rutina } from '../entreno/rutinas';
import type { AccionCoach, AccionDe } from './acciones';
import { accionDePasos, accionDeRutina, editorDe, itemsPropuestos, pasosPropuestos, rutinaPropuesta } from './editar';

const ahora = new Date(2026, 10, 26, 21, 30);
const perfil = { alturaCm: 180, sexo: 'hombre' as const };
const rango = { min: 8, max: 12 };
const rutina: Rutina = {
  id: 'r1',
  nombre: 'Full body A',
  dias: [2],
  ejercicios: [
    { ejercicioId: 'sentadilla-barra', series: 4, rango },
    { ejercicioId: 'prensa', series: 3, rango },
  ],
};
const pasos: AccionDe<'cargar_pasos'> = { id: 'p', tipo: 'cargar_pasos', dia: '2026-11-26', unidad: 'minutos', valor: 30, hora: '20:00' };

describe('qué se edita', () => {
  test('cada tipo abre su pantalla', () => {
    expect(editorDe({ id: 'a', tipo: 'crear_rutina', nombre: 'X', dia: null, ejercicios: [] }, ahora)).toBe('rutina');
    expect(editorDe({ id: 'a', tipo: 'quitar_ejercicios', rutinaId: 'r1', ejercicioIds: ['prensa'] }, ahora)).toBe('rutina');
    expect(editorDe({ id: 'a', tipo: 'registrar_comida', dia: '2026-11-26', comida: 'cena', items: [] }, ahora)).toBe('comida');
    expect(editorDe(pasos, ahora)).toBe('pasos');
  });

  test('borrar rutinas y pasos de otro día no se editan', () => {
    expect(editorDe({ id: 'a', tipo: 'borrar_rutinas', rutinaIds: ['r1'] }, ahora)).toBeNull();
    expect(editorDe({ ...pasos, dia: '2026-11-25' }, ahora)).toBeNull();
  });
});

describe('rutina propuesta', () => {
  test('crear: una rutina nueva con el id que da la app', () => {
    const accion: AccionCoach = { id: 'a', tipo: 'crear_rutina', nombre: 'Piernas', dia: 5, ejercicios: [{ ejercicioId: 'prensa', series: 4, rango }] };
    expect(rutinaPropuesta(accion, [rutina], () => 'nueva')).toEqual({
      id: 'nueva',
      nombre: 'Piernas',
      dias: [5],
      ejercicios: [{ ejercicioId: 'prensa', series: 4, rango }],
    });
  });

  test('agregar respeta las series de la acción', () => {
    const accion: AccionCoach = { id: 'a', tipo: 'agregar_ejercicios', rutinaId: 'r1', ejercicios: [{ ejercicioId: 'remo-barra', series: 5, rango }] };
    expect(rutinaPropuesta(accion, [rutina], () => 'x')?.ejercicios.at(-1)).toEqual({ ejercicioId: 'remo-barra', series: 5, rango });
  });

  test('quitar; null si la rutina no existe o quedaría vacía', () => {
    const quitar: AccionCoach = { id: 'a', tipo: 'quitar_ejercicios', rutinaId: 'r1', ejercicioIds: ['prensa'] };
    expect(rutinaPropuesta(quitar, [rutina], () => 'x')?.ejercicios.map((e) => e.ejercicioId)).toEqual(['sentadilla-barra']);
    expect(rutinaPropuesta(quitar, [], () => 'x')).toBeNull();
    expect(rutinaPropuesta({ ...quitar, ejercicioIds: ['prensa', 'sentadilla-barra'] }, [rutina], () => 'x')).toBeNull();
  });

  test('crear guarda lo que quedó en el editor', () => {
    const accion: AccionCoach = { id: 'a', tipo: 'crear_rutina', nombre: 'Piernas', dia: 5, ejercicios: [] };
    expect(accionDeRutina(accion, { ...rutina, nombre: ' Piernas 2 ', dias: [] })).toEqual({
      ...accion,
      nombre: 'Piernas 2',
      dia: null,
      ejercicios: rutina.ejercicios,
    });
  });
});

describe('comida y pasos', () => {
  test('los ítems con el alimento de la base y su cantidad', () => {
    const accion: AccionDe<'registrar_comida'> = {
      id: 'c',
      tipo: 'registrar_comida',
      dia: '2026-11-26',
      comida: 'cena',
      items: [
        {
          busqueda: 'empanada de carne',
          estado: 'no-aplica',
          estadoAsumido: false,
          cantidad: { unidades: 2, porcion: 'empanada', gramosPorUnidad: 90 },
          estimado: { kcal: 300, proteinas: 10, carbos: 30, grasas: 15 },
        },
      ],
    };
    const [item] = itemsPropuestos(accion, { recientes: [], propios: [] });
    expect(item.alimento.id).toBe('casera:empanada-carne');
    expect(item.cantidad).toEqual({ modo: 'unidades', unidades: 2, porcion: 0 });
  });

  test('la franja de la caminata y la acción editada', () => {
    const propuesto = pasosPropuestos(pasos, { ahora, perfil });
    expect(propuesto.tipo).toBe('minutos');
    expect(propuesto.franja.inicio).toEqual(new Date(2026, 10, 26, 19, 30));
    expect(propuesto.franja.fin).toEqual(new Date(2026, 10, 26, 20, 0));
    const editada = accionDePasos(pasos, { tipo: 'km', valor: 2.5, franja: { inicio: new Date(2026, 10, 26, 18, 0), fin: new Date(2026, 10, 26, 18, 40) } });
    expect(editada).toEqual({ ...pasos, unidad: 'km', valor: 2.5, hora: '18:40' });
  });
});
