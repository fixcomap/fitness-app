import { buscarEjercicioPorId, EJERCICIOS } from './ejercicios';
import { FORMATOS_VIDEO, GRUPOS, MUSCULOS, NIVELES, TIPOS_EJERCICIO } from './tipos';

// Lista explícita a propósito: si se agrega un equipo, hay que sumarlo acá también.
const EQUIPOS_VALIDOS = [
  'peso-corporal',
  'mancuernas',
  'barra',
  'bandas',
  'kettlebell',
  'barra-z',
  'maquina',
  'polea',
];

test('hay unos 200 ejercicios', () => {
  expect(EJERCICIOS.length).toBeGreaterThanOrEqual(180);
  expect(EJERCICIOS.length).toBeLessThanOrEqual(220);
});

test('los ids son únicos', () => {
  const ids = EJERCICIOS.map((e) => e.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test.each(GRUPOS)('el grupo %s tiene al menos 15 ejercicios', (grupo) => {
  expect(EJERCICIOS.filter((e) => e.grupo === grupo).length).toBeGreaterThanOrEqual(15);
});

test('mantiene los 21 ejercicios originales', () => {
  const originales = EJERCICIOS.filter((e) => e.fuente === undefined).map((e) => e.id);
  expect(originales).toHaveLength(21);
  expect(originales).toEqual(expect.arrayContaining(['flexiones', 'dominadas', 'hip-thrust-barra', 'pallof-press-banda']));
});

test('como mucho unos 10 ejercicios avanzados', () => {
  expect(EJERCICIOS.filter((e) => e.nivel === 'avanzado').length).toBeLessThanOrEqual(10);
});

test.each(EJERCICIOS)('$id tiene datos válidos', (e) => {
  expect(e.nombre.trim()).not.toBe('');
  expect(GRUPOS).toContain(e.grupo);
  expect(EQUIPOS_VALIDOS).toContain(e.equipo);
  expect(NIVELES).toContain(e.nivel);
  expect(MUSCULOS).toContain(e.musculoPrincipal);
  for (const m of e.musculosSecundarios) expect(MUSCULOS).toContain(m);
  expect(e.musculosSecundarios).not.toContain(e.musculoPrincipal);
  expect(e.tecnica.length).toBeGreaterThan(0);
  expect(e.tecnica.length).toBeLessThanOrEqual(5);
  expect(e.erroresComunes.length).toBeGreaterThan(0);
  if (e.youtubeId !== '') {
    expect(e.youtubeId).toMatch(/^[\w-]{11}$/);
    expect(e.videoCanal?.trim()).toBeTruthy();
    expect(FORMATOS_VIDEO).toContain(e.videoFormato);
  } else {
    expect(e.videoCanal).toBeUndefined();
    expect(e.videoFormato).toBeUndefined();
  }
  if (e.tipo !== undefined) expect(TIPOS_EJERCICIO).toContain(e.tipo);
  if (e.fuente !== undefined) expect(e.fuente).toBe('free-exercise-db (Unlicense)');
});

test('busca un ejercicio por id', () => {
  expect(buscarEjercicioPorId('flexiones')?.nombre).toBe('Flexiones de brazos');
  expect(buscarEjercicioPorId('no-existe')).toBeUndefined();
});
