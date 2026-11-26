import {
  completoTodo,
  cuandoFue,
  formatearKg,
  partesProgresion,
  pesoMaximo,
  pesoSugerido,
  resumirSeries,
  textoProgresion,
  textoSeries,
  ultimaVez,
  usaPeso,
} from './progresion';
import type { EjercicioHecho, SesionGuardada } from './tipos';

const series = (kg: number | null, ...reps: number[]) => reps.map((r) => ({ kg, reps: r, repsObjetivo: 10 }));

const hecho = (s: EjercicioHecho['series'], seriesTotales = s.length): EjercicioHecho => ({
  ejercicioId: 'press',
  series: s,
  seriesTotales,
});

const sesion = (id: string, fin: string, ejercicios: EjercicioHecho[]): SesionGuardada => ({
  id,
  nombre: 'Pecho',
  inicio: fin,
  fin,
  kcal: 0,
  ejercicios,
});

describe('completoTodo', () => {
  test('todas las series tildadas con las reps objetivo', () => {
    expect(completoTodo(hecho(series(12, 10, 10, 10)))).toBe(true);
    expect(completoTodo(hecho(series(12, 12, 11, 10)))).toBe(true);
  });

  test('una serie por debajo del objetivo', () => {
    expect(completoTodo(hecho(series(12, 10, 10, 8)))).toBe(false);
  });

  test('quedó una serie sin tildar', () => {
    expect(completoTodo(hecho(series(12, 10, 10), 3))).toBe(false);
  });

  test('sin series no está completo', () => {
    expect(completoTodo(hecho([], 0))).toBe(false);
  });
});

describe('pesoSugerido', () => {
  test('completo con barra o máquina: +2,5 kg', () => {
    expect(pesoSugerido(hecho(series(40, 10, 10, 10)), 'barra')).toBe(42.5);
    expect(pesoSugerido(hecho(series(40, 10, 10, 10)), 'maquina')).toBe(42.5);
  });

  test('completo con mancuernas o kettlebell: +2 kg', () => {
    expect(pesoSugerido(hecho(series(12, 10, 10, 10)), 'mancuernas')).toBe(14);
    expect(pesoSugerido(hecho(series(16, 10, 10, 10)), 'kettlebell')).toBe(18);
  });

  test('incompleto: mismo peso', () => {
    expect(pesoSugerido(hecho(series(12, 10, 9, 8)), 'mancuernas')).toBe(12);
  });

  test('toma el peso más alto de las series', () => {
    const mezcla = [...series(10, 10), ...series(12, 10, 10)];
    expect(pesoSugerido(hecho(mezcla), 'mancuernas')).toBe(14);
  });

  test('sin peso no hay sugerencia', () => {
    expect(pesoSugerido(hecho(series(null, 10, 10, 10)), 'peso-corporal')).toBeNull();
    expect(pesoSugerido(hecho(series(null, 10, 10, 10)), 'barra')).toBeNull();
  });
});

test('usaPeso: peso corporal y bandas no tienen KG', () => {
  expect(usaPeso('peso-corporal')).toBe(false);
  expect(usaPeso('bandas')).toBe(false);
  expect(usaPeso('mancuernas')).toBe(true);
  expect(usaPeso('polea')).toBe(true);
});

test('pesoMaximo ignora series sin peso', () => {
  expect(pesoMaximo([...series(null, 10), ...series(20, 8)])).toBe(20);
  expect(pesoMaximo(series(null, 10))).toBeNull();
});

test('formatearKg usa coma decimal', () => {
  expect(formatearKg(12)).toBe('12');
  expect(formatearKg(42.5)).toBe('42,5');
});

test('textoSeries', () => {
  expect(textoSeries([...series(12, 10), ...series(12.5, 9)])).toBe('12 × 10 · 12,5 × 9');
  expect(textoSeries(series(null, 15, 12))).toBe('15 · 12 reps');
});

test('resumirSeries', () => {
  expect(resumirSeries(series(12, 10, 10, 10))).toBe('3×10');
  expect(resumirSeries(series(12, 10, 9, 8))).toBe('3 series (10, 9, 8)');
});

describe('cuandoFue', () => {
  const ahora = new Date(2026, 10, 25, 18, 0);
  test.each([
    [new Date(2026, 10, 25, 8, 0), 'Hoy'],
    [new Date(2026, 10, 24, 23, 0), 'Ayer'],
    [new Date(2026, 10, 22, 10, 0), 'Hace 3 días'],
    [new Date(2026, 10, 18, 10, 0), 'La semana pasada'],
    [new Date(2026, 10, 3, 10, 0), 'El 3 nov'],
  ])('%s → %s', (fecha, texto) => {
    expect(cuandoFue(fecha, ahora)).toBe(texto);
  });
});

describe('ultimaVez', () => {
  test('la sesión más reciente que tiene el ejercicio con series', () => {
    const historial = [
      sesion('a', '2026-11-10T10:00:00Z', [hecho(series(10, 10, 10, 10))]),
      sesion('b', '2026-11-18T10:00:00Z', [hecho(series(12, 10, 10, 10))]),
      sesion('c', '2026-11-20T10:00:00Z', [{ ejercicioId: 'otro', series: series(5, 10), seriesTotales: 1 }]),
    ];
    expect(ultimaVez(historial, 'press')?.ejercicio.series[0].kg).toBe(12);
    expect(ultimaVez(historial, 'nunca')).toBeNull();
  });
});

describe('textoProgresion', () => {
  const ahora = new Date(2026, 10, 25, 18, 0);
  const haceUnaSemana = new Date(2026, 10, 18, 18, 0);

  test('completo: sugiere subir', () => {
    expect(
      textoProgresion({ fecha: haceUnaSemana, ejercicio: hecho(series(12, 10, 10, 10)) }, 'mancuernas', ahora),
    ).toBe('La semana pasada: 3×10 con 12 kg. Probá 14 kg.');
  });

  test('incompleto: mismo peso', () => {
    expect(textoProgresion({ fecha: haceUnaSemana, ejercicio: hecho(series(40, 10, 10, 8)) }, 'barra', ahora)).toBe(
      'La semana pasada: 3 series (10, 10, 8) con 40 kg. Repetí 40 kg.',
    );
  });

  test('peso corporal: habla de repeticiones', () => {
    expect(
      textoProgresion({ fecha: haceUnaSemana, ejercicio: hecho(series(null, 10, 10, 10)) }, 'peso-corporal', ahora),
    ).toBe('La semana pasada: 3×10. Completaste todo: probá sumar una repetición.');
    expect(
      textoProgresion({ fecha: haceUnaSemana, ejercicio: hecho(series(null, 10, 7), 3) }, 'peso-corporal', ahora),
    ).toBe('La semana pasada: 2 series (10, 7). Buscá completar 3×10.');
  });

  test('sin historial no hay aviso', () => {
    expect(textoProgresion(null, 'barra', ahora)).toBeNull();
    expect(partesProgresion(null, 'barra', ahora)).toBeNull();
  });

  test('en tramos: lo hecho en negrita y el peso nuevo destacado', () => {
    expect(
      partesProgresion({ fecha: haceUnaSemana, ejercicio: hecho(series(12, 10, 10, 10)) }, 'mancuernas', ahora),
    ).toEqual([
      { texto: 'La semana pasada: ', estilo: 'normal' },
      { texto: '3×10 con 12 kg', estilo: 'fuerte' },
      { texto: '. Probá ', estilo: 'normal' },
      { texto: '14 kg', estilo: 'acento' },
      { texto: '.', estilo: 'normal' },
    ]);
  });

  test('en tramos: si repite el peso, no se destaca', () => {
    const partes = partesProgresion({ fecha: haceUnaSemana, ejercicio: hecho(series(40, 10, 10, 8)) }, 'barra', ahora);
    expect(partes?.some((p) => p.estilo === 'acento')).toBe(false);
    expect(partes?.[3]).toEqual({ texto: '40 kg', estilo: 'fuerte' });
  });
});
