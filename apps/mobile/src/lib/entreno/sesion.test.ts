import {
  agregarALaSesion,
  agregarSerie,
  ajustarDescanso,
  armadaDeHoy,
  borrarSerie,
  cerrarSesion,
  editarSerie,
  empezarSesion,
  fraccionDescanso,
  irAEjercicio,
  leerKg,
  leerReps,
  moverEnLaSesion,
  nombreSesion,
  objetivoDe,
  progresoPorEjercicio,
  quitarDeLaSesion,
  segundosRestantes,
  seriesIniciales,
  terminarDescanso,
  tildarSerie,
  totalSeriesHechas,
} from './sesion';
import type { SesionArmada, SesionEnCurso, SesionGuardada } from './tipos';

const hoy = new Date(2026, 10, 25, 18, 0);

describe('sesión armada', () => {
  const armada: SesionArmada = { dia: '2026-11-25', ejercicios: ['a', 'b', 'c'] };

  test('agregar no duplica', () => {
    expect(agregarALaSesion(armada, 'd').ejercicios).toEqual(['a', 'b', 'c', 'd']);
    expect(agregarALaSesion(armada, 'a')).toBe(armada);
  });

  test('quitar', () => {
    expect(quitarDeLaSesion(armada, 'b').ejercicios).toEqual(['a', 'c']);
  });

  test('mover arriba y abajo sin salirse', () => {
    expect(moverEnLaSesion(armada, 2, -1).ejercicios).toEqual(['a', 'c', 'b']);
    expect(moverEnLaSesion(armada, 0, 1).ejercicios).toEqual(['b', 'a', 'c']);
    expect(moverEnLaSesion(armada, 0, -1)).toBe(armada);
    expect(moverEnLaSesion(armada, 2, 1)).toBe(armada);
  });

  test('la de otro día se descarta', () => {
    expect(armadaDeHoy(armada, hoy)).toBe(armada);
    expect(armadaDeHoy({ ...armada, dia: '2026-11-24' }, hoy)).toEqual({ dia: '2026-11-25', ejercicios: [] });
    expect(armadaDeHoy(null, hoy)).toEqual({ dia: '2026-11-25', ejercicios: [] });
  });
});

describe('nombreSesion', () => {
  test.each([
    [[], 'Sesión de hoy'],
    [['pecho', 'pecho'], 'Pecho'],
    [['pecho', 'hombros', 'pecho'], 'Pecho y hombros'],
    [['pecho', 'hombros', 'brazos'], 'Pecho, hombros y brazos'],
    [['pecho', 'hombros', 'brazos', 'piernas'], 'Cuerpo completo'],
  ] as const)('%j → %s', (grupos, nombre) => {
    expect(nombreSesion(grupos.map((grupo) => ({ grupo })))).toBe(nombre);
  });
});

const historial: SesionGuardada[] = [
  {
    id: 'vieja',
    nombre: 'Pecho',
    inicio: '2026-11-18T18:00:00Z',
    fin: '2026-11-18T19:00:00Z',
    kcal: 300,
    ejercicios: [
      {
        ejercicioId: 'press',
        seriesTotales: 3,
        series: [
          { kg: 12.5, reps: 10, repsObjetivo: 10 },
          { kg: 12.5, reps: 9, repsObjetivo: 10 },
        ],
      },
    ],
  },
];

describe('empezar', () => {
  test('sin historial: 3×10 sin peso', () => {
    expect(seriesIniciales([], { id: 'nuevo', equipo: 'barra' })).toEqual([
      { kg: '', reps: '10', repsObjetivo: 10, hecha: false },
      { kg: '', reps: '10', repsObjetivo: 10, hecha: false },
      { kg: '', reps: '10', repsObjetivo: 10, hecha: false },
    ]);
  });

  test('precarga lo de la vez anterior y repite las series que faltaron', () => {
    expect(seriesIniciales(historial, { id: 'press', equipo: 'mancuernas' })).toEqual([
      { kg: '12,5', reps: '10', repsObjetivo: 10, hecha: false },
      { kg: '12,5', reps: '9', repsObjetivo: 10, hecha: false },
      { kg: '12,5', reps: '9', repsObjetivo: 10, hecha: false },
    ]);
  });

  test('arma la sesión en curso con nombre y ejercicios en orden', () => {
    const sesion = empezarSesion(
      [
        { id: 'press', equipo: 'mancuernas', grupo: 'pecho' },
        { id: 'vuelos', equipo: 'mancuernas', grupo: 'hombros' },
      ],
      historial,
      hoy,
      'id1',
    );
    expect(sesion.nombre).toBe('Pecho y hombros');
    expect(sesion.inicio).toBe(hoy.toISOString());
    expect(sesion.actual).toBe(0);
    expect(sesion.ejercicios.map((e) => e.ejercicioId)).toEqual(['press', 'vuelos']);
    expect(sesion.descanso).toBeNull();
  });
});

describe('leer valores escritos', () => {
  test('kg acepta coma, cero y hasta 500', () => {
    expect(leerKg('12,5')).toBe(12.5);
    expect(leerKg(' 20 ')).toBe(20);
    expect(leerKg('0')).toBe(0);
    expect(leerKg('')).toBeNull();
    expect(leerKg('abc')).toBeNull();
    expect(leerKg('501')).toBeNull();
  });

  test('reps: entero entre 1 y 100', () => {
    expect(leerReps('10')).toBe(10);
    expect(leerReps('0')).toBeNull();
    expect(leerReps('10,5')).toBeNull();
    expect(leerReps('101')).toBeNull();
  });
});

const base = (): SesionEnCurso => ({
  id: 's1',
  nombre: 'Pecho y hombros',
  inicio: hoy.toISOString(),
  actual: 0,
  descanso: null,
  ejercicios: [
    {
      ejercicioId: 'press',
      series: [
        { kg: '12', reps: '10', repsObjetivo: 10, hecha: false },
        { kg: '', reps: '10', repsObjetivo: 10, hecha: false },
      ],
    },
    { ejercicioId: 'flexiones', series: [{ kg: '', reps: '12', repsObjetivo: 12, hecha: false }] },
  ],
});

describe('series', () => {
  test('editar KG y REPS', () => {
    const s = editarSerie(base(), 0, 1, { kg: '14', reps: '8' });
    expect(s.ejercicios[0].series[1]).toEqual({ kg: '14', reps: '8', repsObjetivo: 10, hecha: false });
  });

  test('agregar copia la última sin tildar; borrar la saca', () => {
    const conTilde = tildarSerie(base(), 0, 0, true, hoy);
    const s = agregarSerie(editarSerie(conTilde, 0, 1, { kg: '14' }), 0);
    expect(s.ejercicios[0].series).toHaveLength(3);
    expect(s.ejercicios[0].series[2]).toEqual({ kg: '14', reps: '10', repsObjetivo: 10, hecha: false });
    expect(borrarSerie(s, 0, 0).ejercicios[0].series.map((x) => x.kg)).toEqual(['14', '14']);
  });

  test('tildar arranca el descanso de 90 s; destildar no lo toca', () => {
    const s = tildarSerie(base(), 0, 0, true, hoy);
    expect(s.ejercicios[0].series[0].hecha).toBe(true);
    expect(segundosRestantes(s, hoy)).toBe(90);
    const sin = tildarSerie(s, 0, 0, true, new Date(hoy.getTime() + 5000));
    expect(sin.ejercicios[0].series[0].hecha).toBe(false);
    expect(sin.descanso).toEqual(s.descanso);
  });

  test('no se puede tildar sin peso en un ejercicio con peso', () => {
    const s = base();
    expect(tildarSerie(s, 0, 1, true, hoy)).toBe(s);
  });

  test('en un ejercicio sin peso alcanza con las reps', () => {
    expect(tildarSerie(base(), 1, 0, false, hoy).ejercicios[1].series[0].hecha).toBe(true);
  });

  test('progreso y total de series', () => {
    const s = tildarSerie(base(), 0, 0, true, hoy);
    expect(progresoPorEjercicio(s)).toEqual([0.5, 0]);
    expect(totalSeriesHechas(s)).toBe(1);
  });

  test('irAEjercicio no se sale de la lista', () => {
    expect(irAEjercicio(base(), 1).actual).toBe(1);
    expect(irAEjercicio(base(), 5).actual).toBe(0);
  });

  test('objetivoDe', () => {
    expect(objetivoDe(base().ejercicios[1])).toBe('1×12');
    expect(objetivoDe({ ejercicioId: 'x', series: [] })).toBe('sin series');
  });
});

describe('descanso', () => {
  const conDescanso = tildarSerie(base(), 0, 0, true, hoy);

  test('+15 y −15', () => {
    expect(segundosRestantes(ajustarDescanso(conDescanso, 15, hoy), hoy)).toBe(105);
    expect(segundosRestantes(ajustarDescanso(conDescanso, -15, hoy), hoy)).toBe(75);
  });

  test('restar más de lo que queda lo termina', () => {
    const casiFin = new Date(hoy.getTime() + 80_000);
    expect(ajustarDescanso(conDescanso, -15, casiFin).descanso).toBeNull();
  });

  test('+15 mantiene el inicio: el anillo se calcula sobre el total nuevo', () => {
    const s = ajustarDescanso(conDescanso, 15, hoy);
    expect(s.descanso?.inicio).toBe(hoy.toISOString());
    expect(fraccionDescanso(s, new Date(hoy.getTime() + 52_500))).toBeCloseTo(0.5);
  });

  test('fraccionDescanso: de 1 a 0', () => {
    expect(fraccionDescanso(conDescanso, hoy)).toBe(1);
    expect(fraccionDescanso(conDescanso, new Date(hoy.getTime() + 45_000))).toBeCloseTo(0.5);
    expect(fraccionDescanso(conDescanso, new Date(hoy.getTime() + 200_000))).toBe(0);
    expect(fraccionDescanso(base(), hoy)).toBe(0);
  });

  test('cuenta regresiva y saltar', () => {
    expect(segundosRestantes(conDescanso, new Date(hoy.getTime() + 30_500))).toBe(60);
    expect(segundosRestantes(conDescanso, new Date(hoy.getTime() + 200_000))).toBe(0);
    expect(terminarDescanso(conDescanso).descanso).toBeNull();
  });
});

describe('cerrarSesion', () => {
  test('guarda sólo lo tildado, como números, y saca los ejercicios sin series', () => {
    const s = tildarSerie(base(), 0, 0, true, hoy);
    const fin = new Date(hoy.getTime() + 3_600_000);
    expect(cerrarSesion(s, fin, 375)).toEqual({
      id: 's1',
      nombre: 'Pecho y hombros',
      inicio: hoy.toISOString(),
      fin: fin.toISOString(),
      kcal: 375,
      ejercicios: [{ ejercicioId: 'press', seriesTotales: 2, series: [{ kg: 12, reps: 10, repsObjetivo: 10 }] }],
    });
  });
});
