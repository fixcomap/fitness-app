import {
  agregarAlHistorial,
  leerArmadaGuardada,
  leerEnCursoGuardada,
  leerSesionesGuardadas,
  MAXIMO_SESIONES,
  ultimasSesionesDe,
} from './historial';
import type { SesionEnCurso, SesionGuardada } from './tipos';

const sesion = (id: string, fin: string, ejercicioId = 'press'): SesionGuardada => ({
  id,
  nombre: 'Pecho',
  inicio: fin,
  fin,
  kcal: 200,
  ejercicios: [{ ejercicioId, rango: { min: 8, max: 12 }, seriesTotales: 1, series: [{ kg: 10, reps: 10, repsObjetivo: 10 }] }],
});

describe('leerSesionesGuardadas', () => {
  test('acepta las válidas y descarta lo mal formado', () => {
    const buena = sesion('a', '2026-11-25T19:00:00Z');
    const datos = [
      buena,
      { ...buena, id: '' },
      { ...buena, fin: 'ayer' },
      { ...buena, kcal: -3 },
      { ...buena, ejercicios: [{ ejercicioId: 'x', seriesTotales: 1, series: [{ kg: 'diez', reps: 10, repsObjetivo: 10 }] }] },
      { ...buena, ejercicios: [{ ejercicioId: 'x', seriesTotales: 1, series: [{ kg: null, reps: 0, repsObjetivo: 10 }] }] },
      null,
      'texto',
    ];
    expect(leerSesionesGuardadas(datos)).toEqual([buena]);
  });

  test('las sesiones de antes de los rangos se migran: min = max = reps objetivo', () => {
    const vieja = {
      ...sesion('v', '2026-11-18T19:00:00Z'),
      ejercicios: [{ ejercicioId: 'press', seriesTotales: 2, series: [{ kg: 12, reps: 9, repsObjetivo: 10 }] }],
    };
    expect(leerSesionesGuardadas([vieja])[0].ejercicios[0].rango).toEqual({ min: 10, max: 10 });
    // Un rango roto también se reemplaza.
    const rota = { ...sesion('r', '2026-11-18T19:00:00Z'), ejercicios: [{ ...vieja.ejercicios[0], rango: { min: 12, max: 3 } }] };
    expect(leerSesionesGuardadas([rota])[0].ejercicios[0].rango).toEqual({ min: 10, max: 10 });
  });

  test('sin datos, vacío', () => {
    expect(leerSesionesGuardadas(null)).toEqual([]);
    expect(leerSesionesGuardadas({})).toEqual([]);
  });
});

describe('leerArmadaGuardada', () => {
  test('válida, sin repetidos', () => {
    expect(leerArmadaGuardada({ dia: '2026-11-25', ejercicios: ['a', 'b', 'a'] })).toEqual({
      dia: '2026-11-25',
      ejercicios: ['a', 'b'],
    });
  });

  test('inválida', () => {
    expect(leerArmadaGuardada({ dia: 'hoy', ejercicios: [] })).toBeNull();
    expect(leerArmadaGuardada({ dia: '2026-11-25', ejercicios: [1] })).toBeNull();
    expect(leerArmadaGuardada(null)).toBeNull();
  });
});

describe('leerEnCursoGuardada', () => {
  const enCurso: SesionEnCurso = {
    id: 's1',
    nombre: 'Pecho',
    inicio: '2026-11-25T18:00:00Z',
    actual: 0,
    descanso: { inicio: '2026-11-25T18:03:30Z', fin: '2026-11-25T18:05:00Z' },
    ejercicios: [
      { ejercicioId: 'press', rango: { min: 8, max: 12 }, series: [{ kg: '12', reps: '10', repsObjetivo: 10, hecha: true }] },
    ],
  };

  test('una guardada antes de los rangos toma el de las reps objetivo', () => {
    const vieja = { ...enCurso, ejercicios: [{ ejercicioId: 'press', series: enCurso.ejercicios[0].series }] };
    expect(leerEnCursoGuardada(vieja)?.ejercicios[0].rango).toEqual({ min: 10, max: 10 });
  });

  test('se retoma tal cual', () => {
    expect(leerEnCursoGuardada(JSON.parse(JSON.stringify(enCurso)))).toEqual(enCurso);
    expect(leerEnCursoGuardada({ ...enCurso, descanso: null })).toEqual({ ...enCurso, descanso: null });
  });

  test('una guardada sin inicio del descanso supone los 90 s por defecto', () => {
    expect(leerEnCursoGuardada({ ...enCurso, descanso: { fin: '2026-11-25T18:05:00Z' } })?.descanso).toEqual({
      inicio: '2026-11-25T18:03:30.000Z',
      fin: '2026-11-25T18:05:00Z',
    });
  });

  test('si algo no cierra, no se retoma', () => {
    expect(leerEnCursoGuardada({ ...enCurso, actual: 3 })).toBeNull();
    expect(leerEnCursoGuardada({ ...enCurso, ejercicios: [] })).toBeNull();
    expect(leerEnCursoGuardada({ ...enCurso, inicio: 'x' })).toBeNull();
    expect(leerEnCursoGuardada({ ...enCurso, descanso: { fin: 5 } })).toBeNull();
    expect(
      leerEnCursoGuardada({ ...enCurso, ejercicios: [{ ejercicioId: 'press', series: [{ kg: 12, reps: '10', repsObjetivo: 10, hecha: true }] }] }),
    ).toBeNull();
    expect(leerEnCursoGuardada(null)).toBeNull();
  });
});

describe('agregarAlHistorial', () => {
  test('de la más nueva a la más vieja, sin duplicar ids', () => {
    const historial = [sesion('a', '2026-11-10T10:00:00Z'), sesion('b', '2026-11-18T10:00:00Z')];
    const nueva = sesion('c', '2026-11-25T10:00:00Z');
    expect(agregarAlHistorial(historial, nueva).map((s) => s.id)).toEqual(['c', 'b', 'a']);
    expect(agregarAlHistorial([nueva], nueva)).toHaveLength(1);
  });

  test('no pasa del máximo', () => {
    const muchas = Array.from({ length: MAXIMO_SESIONES }, (_, i) => sesion(`s${i}`, new Date(2020, 0, 1, 0, i).toISOString()));
    const resultado = agregarAlHistorial(muchas, sesion('nueva', '2026-11-25T10:00:00Z'));
    expect(resultado).toHaveLength(MAXIMO_SESIONES);
    expect(resultado[0].id).toBe('nueva');
  });
});

test('ultimasSesionesDe: las más recientes con ese ejercicio', () => {
  const historial = [
    sesion('a', '2026-11-10T10:00:00Z'),
    sesion('b', '2026-11-18T10:00:00Z', 'otro'),
    sesion('c', '2026-11-20T10:00:00Z'),
    sesion('d', '2026-11-22T10:00:00Z'),
  ];
  expect(ultimasSesionesDe(historial, 'press', 2).map((s) => s.sesionId)).toEqual(['d', 'c']);
  expect(ultimasSesionesDe(historial, 'nunca')).toEqual([]);
});
