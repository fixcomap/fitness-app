import {
  agregarEjercicios,
  ajustarRepsDe,
  ajustarSeries,
  alternarDia,
  asignarDia,
  borrarRutina,
  conflictoDeDia,
  diaDeSemana,
  entrenoDeHoy,
  duracionEstimadaMin,
  errorRutina,
  guardarRutina,
  leerRutinasGuardadas,
  moverEjercicio,
  nuevaRutina,
  planesDeRutina,
  quitarEjercicio,
  rutinaDelDia,
  semanaDe,
  textoDias,
  textoResumenRutina,
  textoSemana,
  type Rutina,
} from './rutinas';

const R = (min: number, max: number) => ({ min, max });

const empuje: Rutina = {
  id: 'empuje',
  nombre: 'Empuje',
  dias: [0, 2],
  ejercicios: [
    { ejercicioId: 'press', series: 3, rango: R(6, 10) },
    { ejercicioId: 'vuelos', series: 3, rango: R(10, 15) },
    { ejercicioId: 'fondos', series: 3, rango: R(8, 15) },
  ],
};
const tiron: Rutina = {
  id: 'tiron',
  nombre: 'Tirón',
  dias: [1, 4],
  ejercicios: [{ ejercicioId: 'remo', series: 4, rango: R(6, 10) }],
};

describe('fechas', () => {
  test('diaDeSemana: 0 es lunes y 6 domingo', () => {
    expect(diaDeSemana(new Date(2026, 10, 23))).toBe(0);
    expect(diaDeSemana(new Date(2026, 10, 25))).toBe(2);
    expect(diaDeSemana(new Date(2026, 10, 29))).toBe(6);
  });

  test('semanaDe: de lunes a domingo', () => {
    const semana = semanaDe(new Date(2026, 10, 25, 18, 30));
    expect(semana.map((d) => d.getDate())).toEqual([23, 24, 25, 26, 27, 28, 29]);
    expect(textoSemana(semana)).toBe('23 – 29 nov');
  });

  test('textoSemana cuando cambia el mes', () => {
    expect(textoSemana(semanaDe(new Date(2026, 11, 2)))).toBe('30 nov – 6 dic');
  });
});

describe('consultas', () => {
  test('rutina del día', () => {
    expect(rutinaDelDia([empuje, tiron], new Date(2026, 10, 25))?.id).toBe('empuje');
    expect(rutinaDelDia([empuje, tiron], new Date(2026, 10, 27))?.id).toBe('tiron');
    expect(rutinaDelDia([empuje, tiron], new Date(2026, 10, 29))).toBeNull();
  });

  test('conflictoDeDia: otra rutina con ese día', () => {
    expect(conflictoDeDia([empuje, tiron], 'empuje', 1)?.id).toBe('tiron');
    expect(conflictoDeDia([empuje, tiron], 'empuje', 0)).toBeNull();
    expect(conflictoDeDia([empuje, tiron], 'empuje', 6)).toBeNull();
  });

  test.each([
    [[], 'Sin días: elegí cuándo la hacés'],
    [[0], 'Se repite cada lunes'],
    [[2, 0], 'Se repite cada lunes y miércoles'],
    [[0, 2, 4], 'Se repite cada lunes, miércoles y viernes'],
    [[0, 1, 2, 3, 4, 5, 6], 'Se repite todos los días'],
  ] as const)('textoDias(%j)', (dias, texto) => {
    expect(textoDias(dias)).toBe(texto);
  });

  test('duración estimada: reps promedio × 4 s + 90 s de descanso por serie, redondeada a 5', () => {
    // 6 ejercicios × 3 series de 8–10 → 18 × (9 × 4 + 90) = 2268 s ≈ 37,8 min → 40.
    const seis = {
      ejercicios: Array.from({ length: 6 }, (_, i) => ({ ejercicioId: `e${i}`, series: 3, rango: R(8, 10) })),
    };
    expect(duracionEstimadaMin(seis)).toBe(40);
    expect(textoResumenRutina(seis)).toBe('6 ejercicios · ~40 min');
    expect(duracionEstimadaMin({ ejercicios: [{ ejercicioId: 'x', series: 1, rango: R(5, 5) }] })).toBe(5);
    expect(textoResumenRutina({ ejercicios: [] })).toBe('Sin ejercicios');
  });
});

describe('editar', () => {
  test('nueva rutina con días elegidos', () => {
    expect(nuevaRutina('n', [4, 1])).toEqual({ id: 'n', nombre: '', dias: [1, 4], ejercicios: [] });
  });

  test('agregar: al final, 3 series, sin repetir', () => {
    const r = agregarEjercicios(empuje, [
      { ejercicioId: 'press', rango: R(6, 10) },
      { ejercicioId: 'curl', rango: R(10, 15) },
      { ejercicioId: 'curl', rango: R(10, 15) },
    ]);
    expect(r.ejercicios.map((e) => e.ejercicioId)).toEqual(['press', 'vuelos', 'fondos', 'curl']);
    expect(r.ejercicios[3]).toEqual({ ejercicioId: 'curl', series: 3, rango: R(10, 15) });
    expect(agregarEjercicios(empuje, [{ ejercicioId: 'press', rango: R(1, 2) }])).toBe(empuje);
  });

  test('agregar respeta las series que trae cada ejercicio, dentro de 1 a 10', () => {
    const r = agregarEjercicios(empuje, [
      { ejercicioId: 'curl', rango: R(10, 15), series: 4 },
      { ejercicioId: 'remo', rango: R(6, 10), series: 25 },
    ]);
    expect(r.ejercicios.slice(3).map((e) => [e.ejercicioId, e.series])).toEqual([
      ['curl', 4],
      ['remo', 10],
    ]);
  });

  test('quitar y mover sin salirse', () => {
    expect(quitarEjercicio(empuje, 1).ejercicios.map((e) => e.ejercicioId)).toEqual(['press', 'fondos']);
    expect(moverEjercicio(empuje, 2, -1).ejercicios.map((e) => e.ejercicioId)).toEqual(['press', 'fondos', 'vuelos']);
    expect(moverEjercicio(empuje, 0, -1)).toBe(empuje);
    expect(moverEjercicio(empuje, 2, 1)).toBe(empuje);
  });

  test('series entre 1 y 10', () => {
    expect(ajustarSeries(empuje, 0, 1).ejercicios[0].series).toBe(4);
    const una = { ...empuje, ejercicios: [{ ...empuje.ejercicios[0], series: 1 }] };
    expect(ajustarSeries(una, 0, -1)).toBe(una);
    const diez = { ...empuje, ejercicios: [{ ...empuje.ejercicios[0], series: 10 }] };
    expect(ajustarSeries(diez, 0, 1)).toBe(diez);
  });

  test('rango de reps: de a 1, min ≤ max', () => {
    expect(ajustarRepsDe(empuje, 0, 'max', 2).ejercicios[0].rango).toEqual(R(6, 12));
    expect(ajustarRepsDe(empuje, 0, 'min', -1).ejercicios[0].rango).toEqual(R(5, 10));
    const fijo = { ...empuje, ejercicios: [{ ...empuje.ejercicios[0], rango: R(8, 8) }] };
    expect(ajustarRepsDe(fijo, 0, 'min', 1)).toBe(fijo);
  });

  test('alternar un día', () => {
    expect(alternarDia(empuje, 4).dias).toEqual([0, 2, 4]);
    expect(alternarDia(empuje, 0).dias).toEqual([2]);
  });

  test('para guardar hace falta nombre y al menos un ejercicio', () => {
    expect(errorRutina(empuje)).toBeNull();
    expect(errorRutina({ ...empuje, nombre: '  ' })).toBe('Ponele un nombre a la rutina.');
    expect(errorRutina({ ...empuje, ejercicios: [] })).toBe('Agregá al menos un ejercicio.');
  });
});

describe('la lista de rutinas', () => {
  test('guardar una nueva la agrega al final', () => {
    const nueva = { ...nuevaRutina('n', [5]), nombre: ' Piernas ' };
    const rutinas = guardarRutina([empuje, tiron], nueva);
    expect(rutinas.map((r) => r.id)).toEqual(['empuje', 'tiron', 'n']);
    expect(rutinas[2].nombre).toBe('Piernas');
  });

  test('guardar reemplaza en el lugar y le saca los días a las otras (un día, una rutina)', () => {
    const editada = { ...empuje, dias: [0, 1, 2] as Rutina['dias'] };
    const rutinas = guardarRutina([empuje, tiron], editada);
    expect(rutinas.map((r) => r.id)).toEqual(['empuje', 'tiron']);
    expect(rutinas[0].dias).toEqual([0, 1, 2]);
    expect(rutinas[1].dias).toEqual([4]);
  });

  test('asignar un día', () => {
    const rutinas = asignarDia([empuje, tiron], 'tiron', 0);
    expect(rutinas.find((r) => r.id === 'tiron')?.dias).toEqual([0, 1, 4]);
    expect(rutinas.find((r) => r.id === 'empuje')?.dias).toEqual([2]);
    expect(asignarDia([empuje], 'nada', 0)).toEqual([empuje]);
  });

  test('borrar', () => {
    expect(borrarRutina([empuje, tiron], 'empuje')).toEqual([tiron]);
  });

  test('planes para empezar: saltea los ejercicios que ya no existen', () => {
    const buscar = (id: string) =>
      id === 'fondos' ? undefined : { id, equipo: 'barra' as const, grupo: 'pecho' as const };
    expect(planesDeRutina(empuje, buscar)).toEqual([
      { ejercicio: { id: 'press', equipo: 'barra', grupo: 'pecho' }, series: 3, rango: R(6, 10) },
      { ejercicio: { id: 'vuelos', equipo: 'barra', grupo: 'pecho' }, series: 3, rango: R(10, 15) },
    ]);
  });
});

describe('entrenoDeHoy (Inicio)', () => {
  const armados = [{ grupo: 'pecho' as const }, { grupo: 'hombros' as const }];

  test('primero la sesión en curso', () => {
    expect(entrenoDeHoy({ nombre: 'Empuje', ejercicios: [1, 2] }, empuje, armados)).toEqual({
      nombre: 'Empuje',
      ejercicios: 2,
      enCurso: true,
      rutinaId: null,
    });
  });

  test('después la rutina del día', () => {
    expect(entrenoDeHoy(null, empuje, armados)).toEqual({
      nombre: 'Empuje',
      ejercicios: 3,
      enCurso: false,
      rutinaId: 'empuje',
    });
  });

  test('después lo armado a mano; si no hay nada, null', () => {
    expect(entrenoDeHoy(null, null, armados)).toEqual({
      nombre: 'Pecho y hombros',
      ejercicios: 2,
      enCurso: false,
      rutinaId: null,
    });
    expect(entrenoDeHoy(null, { ...empuje, ejercicios: [] }, [])).toBeNull();
  });
});

describe('leerRutinasGuardadas', () => {
  test('se leen tal cual', () => {
    expect(leerRutinasGuardadas(JSON.parse(JSON.stringify([empuje, tiron])))).toEqual([empuje, tiron]);
  });

  test('descarta lo mal formado y los ids repetidos', () => {
    const datos = [
      empuje,
      { ...tiron, id: '' },
      { ...tiron, dias: [7] },
      { ...tiron, ejercicios: [{ ejercicioId: 'remo', series: 0, rango: R(6, 10) }] },
      { ...tiron, ejercicios: [{ ejercicioId: 'remo', series: 3, rango: R(10, 6) }] },
      { ...empuje, nombre: 'Otra con el mismo id' },
      null,
      'texto',
    ];
    expect(leerRutinasGuardadas(datos)).toEqual([empuje]);
    expect(leerRutinasGuardadas(null)).toEqual([]);
  });

  test('si dos rutinas tienen el mismo día, se lo queda la primera', () => {
    const pisada = { ...tiron, dias: [2, 4, 4] };
    expect(leerRutinasGuardadas([empuje, pisada])[1].dias).toEqual([4]);
  });
});
