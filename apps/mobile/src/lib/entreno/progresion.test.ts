import {
  advertenciaSerie,
  cuandoFue,
  formatearKg,
  llegoAlTope,
  mejor1RM,
  partesSugerencia,
  pesoMaximo,
  pesoParaReps,
  resumirSeries,
  sugerirProgresion,
  textoSeries,
  textoSugerencia,
  ultimaVez,
  unoRMEstimado,
  usaPeso,
  type DatosSugerencia,
} from './progresion';
import type { Rango } from './rangos';
import type { EjercicioHecho, SesionGuardada } from './tipos';

const RANGO: Rango = { min: 6, max: 10 };

const series = (kg: number | null, ...reps: number[]) => reps.map((r) => ({ kg, reps: r, repsObjetivo: 10 }));

const hecho = (s: EjercicioHecho['series'], seriesTotales = s.length, rango = RANGO): EjercicioHecho => ({
  ejercicioId: 'press',
  rango,
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

const ahora = new Date(2026, 10, 25, 18, 0);
const haceUnaSemana = new Date(2026, 10, 18, 18, 0).toISOString();
const haceDosMeses = new Date(2026, 8, 20, 18, 0).toISOString();

// Sugerencia para hoy con una sola sesión anterior.
const sugerir = (ejercicio: EjercicioHecho | null, cambios: Partial<DatosSugerencia> = {}) =>
  sugerirProgresion({
    historial: ejercicio ? [sesion('a', haceUnaSemana, [ejercicio])] : [],
    ejercicioId: 'press',
    equipo: 'mancuernas',
    rango: RANGO,
    series: 3,
    ahora,
    ...cambios,
  });

describe('llegoAlTope', () => {
  test('todas las series tildadas y en el máximo del rango', () => {
    expect(llegoAlTope(hecho(series(12, 10, 10, 10)))).toBe(true);
    expect(llegoAlTope(hecho(series(12, 12, 11, 10)))).toBe(true);
  });

  test('una serie por debajo del máximo, una sin tildar o ninguna', () => {
    expect(llegoAlTope(hecho(series(12, 10, 10, 8)))).toBe(false);
    expect(llegoAlTope(hecho(series(12, 10, 10), 3))).toBe(false);
    expect(llegoAlTope(hecho([], 0))).toBe(false);
  });
});

describe('sugerirProgresion: doble progresión', () => {
  test('llegó al tope con mancuernas: +2 kg y vuelta al mínimo del rango', () => {
    const s = sugerir(hecho(series(12, 10, 10, 10)));
    expect(s).toMatchObject({ motivo: 'subir-peso', kg: 14, reps: [6, 6, 6] });
    expect(textoSugerencia(s)).toBe('La vez pasada: 3×10 con 12 kg. Llegaste al tope: probá 14 kg × 6.');
  });

  test('llegó al tope con barra, máquina, polea o barra Z: +2,5 kg', () => {
    for (const equipo of ['barra', 'maquina', 'polea', 'barra-z'] as const) {
      expect(sugerir(hecho(series(40, 10, 10, 10)), { equipo }).kg).toBe(42.5);
    }
    expect(sugerir(hecho(series(16, 10, 10, 10)), { equipo: 'kettlebell' }).kg).toBe(18);
  });

  test('no llegó: mismo peso y +1 rep en la primera serie que no llegó al tope', () => {
    const s = sugerir(hecho(series(12, 10, 8, 7)));
    expect(s).toMatchObject({ motivo: 'sumar-reps', kg: 12, reps: [10, 9, 7], serieConMasReps: 1 });
    expect(textoSugerencia(s)).toBe(
      'La vez pasada: 3 series (10, 8, 7) con 12 kg. Repetí 12 kg y buscá 9 reps en la serie 2.',
    );
  });

  test('las series que faltaron arrancan por el mínimo; no se pasa del tope', () => {
    expect(sugerir(hecho(series(12, 12, 10), 3)).reps).toEqual([10, 10, 7]);
    expect(sugerir(hecho(series(12, 10), 2), { series: 2 }).reps).toEqual([10, 7]);
  });

  test('toma el peso más alto de las series', () => {
    expect(sugerir(hecho([...series(10, 10), ...series(12, 10, 10)])).kg).toBe(14);
  });
});

describe('sugerirProgresion: 1RM estimado', () => {
  test('si el rango cambió, el peso sale del 1RM (redondeado a lo que se puede cargar)', () => {
    // 1RM = 12 × (1 + 10/30) = 16 → para 15 reps: 16 / 1,5 = 10,67 → 10 kg (de a 2).
    const s = sugerir(hecho(series(12, 10, 10, 10)), { rango: { min: 10, max: 15 } });
    expect(s).toMatchObject({ motivo: 'desde-1rm', kg: 10, reps: [10, 10, 10] });
    expect(textoSugerencia(s)).toBe('La vez pasada: 3×10 con 12 kg. Según tu 1RM estimado (16 kg): probá 10 kg × 10.');
  });

  test('si la última vez fue hace más de 6 semanas, también', () => {
    const historial = [sesion('a', haceDosMeses, [hecho(series(40, 10, 10, 10))])];
    expect(sugerir(null, { historial, equipo: 'barra' })).toMatchObject({
      motivo: 'desde-1rm',
      kg: 40,
      reps: [6, 6, 6],
    });
  });

  test('usa el mejor 1RM de todo el historial', () => {
    const historial = [
      sesion('a', haceDosMeses, [hecho(series(50, 5))]), // 58,3
      sesion('b', haceDosMeses, [hecho(series(40, 12))]), // 56
    ];
    expect(mejor1RM(historial, 'press')).toBeCloseTo(58.33, 1);
    expect(mejor1RM(historial, 'otro')).toBeNull();
  });

  test('Epley y peso para N reps', () => {
    expect(unoRMEstimado(100, 0)).toBe(100);
    expect(unoRMEstimado(60, 10)).toBe(80);
    expect(pesoParaReps(80, 10, 'barra')).toBe(60);
    expect(pesoParaReps(80, 10, 'mancuernas')).toBe(60);
    expect(pesoParaReps(81, 10, 'barra')).toBe(60);
    expect(pesoParaReps(3, 15, 'barra')).toBe(2.5); // nunca menos que un salto
    expect(pesoParaReps(80, 10, 'peso-corporal')).toBeNull();
  });
});

describe('sugerirProgresion: peso corporal y bandas', () => {
  const sinPeso = { equipo: 'peso-corporal' as const, rango: { min: 8, max: 15 } };

  test('en el tope: variante más difícil o una serie más', () => {
    const s = sugerir(hecho(series(null, 15, 15, 15)), sinPeso);
    expect(s).toMatchObject({ motivo: 'tope-sin-peso', kg: null, reps: [15, 15, 15] });
    expect(textoSugerencia(s)).toBe(
      'La vez pasada: 3×15. Llegaste al tope: probá una variante más difícil o sumá una serie.',
    );
  });

  test('si no, +1 rep', () => {
    const s = sugerir(hecho(series(null, 12, 10, 9)), sinPeso);
    expect(s).toMatchObject({ motivo: 'sumar-reps', kg: null, reps: [13, 10, 9] });
    expect(textoSugerencia(s)).toBe('La vez pasada: 3 series (12, 10, 9). Buscá 13 reps en la serie 1.');
  });

  test('sirve aunque el rango haya cambiado (no hay peso que calcular)', () => {
    expect(sugerir(hecho(series(null, 12, 12, 12), 3, { min: 10, max: 12 }), sinPeso).motivo).toBe('sumar-reps');
  });
});

describe('sugerirProgresion: primera vez', () => {
  test('sin historial: el mínimo del rango, sin peso y sin aviso', () => {
    const s = sugerir(null);
    expect(s).toMatchObject({ motivo: 'primera-vez', kg: null, reps: [6, 6, 6] });
    expect(partesSugerencia(s)).toBeNull();
  });
});

test('el aviso en tramos: lo hecho en negrita y lo nuevo destacado', () => {
  expect(partesSugerencia(sugerir(hecho(series(12, 10, 10, 10))))).toEqual([
    { texto: 'La vez pasada: ', estilo: 'normal' },
    { texto: '3×10 con 12 kg', estilo: 'fuerte' },
    { texto: '. ', estilo: 'normal' },
    { texto: 'Llegaste al tope: probá ', estilo: 'normal' },
    { texto: '14 kg × 6', estilo: 'acento' },
    { texto: '.', estilo: 'normal' },
  ]);
});

describe('advertenciaSerie', () => {
  test('más de 30 reps con peso', () => {
    expect(advertenciaSerie(20, 31, null)).toBe('¿Seguro? Son más de 30 reps con peso.');
    expect(advertenciaSerie(20, 30, null)).toBeNull();
    expect(advertenciaSerie(null, 50, null)).toBeNull();
    expect(advertenciaSerie(0, 50, null)).toBeNull();
  });

  test('más del doble del mejor registro', () => {
    expect(advertenciaSerie(41, 10, 20)).toBe('¿Seguro? Es más del doble de tu mejor marca (20 kg).');
    expect(advertenciaSerie(40, 10, 20)).toBeNull();
    expect(advertenciaSerie(400, 10, null)).toBeNull();
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
      sesion('c', '2026-11-20T10:00:00Z', [{ ...hecho(series(5, 10)), ejercicioId: 'otro' }]),
    ];
    expect(ultimaVez(historial, 'press')?.ejercicio.series[0].kg).toBe(12);
    expect(ultimaVez(historial, 'nunca')).toBeNull();
  });
});
