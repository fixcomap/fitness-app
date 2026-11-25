import { buscarEjercicioPorId, EJERCICIOS } from './ejercicios';
import { EQUIPOS, GRUPOS, MUSCULOS, NIVELES } from './tipos';

test('hay unos 20 ejercicios', () => {
  expect(EJERCICIOS.length).toBeGreaterThanOrEqual(18);
  expect(EJERCICIOS.length).toBeLessThanOrEqual(24);
});

test('los ids son únicos', () => {
  const ids = EJERCICIOS.map((e) => e.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('cada grupo muscular tiene al menos un ejercicio', () => {
  for (const grupo of GRUPOS) {
    expect(EJERCICIOS.some((e) => e.grupo === grupo)).toBe(true);
  }
});

test.each(EJERCICIOS)('$id tiene datos válidos', (e) => {
  expect(e.nombre.trim()).not.toBe('');
  expect(GRUPOS).toContain(e.grupo);
  expect(EQUIPOS).toContain(e.equipo); // sin máquinas
  expect(NIVELES).toContain(e.nivel);
  expect(MUSCULOS).toContain(e.musculoPrincipal);
  for (const m of e.musculosSecundarios) expect(MUSCULOS).toContain(m);
  expect(e.musculosSecundarios).not.toContain(e.musculoPrincipal);
  expect(e.tecnica.length).toBeGreaterThan(0);
  expect(e.erroresComunes.length).toBeGreaterThan(0);
  expect(typeof e.youtubeId).toBe('string');
});

test('busca un ejercicio por id', () => {
  expect(buscarEjercicioPorId('flexiones')?.nombre).toBe('Flexiones de brazos');
  expect(buscarEjercicioPorId('no-existe')).toBeUndefined();
});
