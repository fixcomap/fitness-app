import { avisoPara } from './avisos';

test('activa o cargando: no hay aviso', () => {
  expect(avisoPara('activa', 'ios')).toBeNull();
  expect(avisoPara('cargando', 'ios')).toBeNull();
});

test('sin preguntar: explica para qué es y ofrece permitir', () => {
  const aviso = avisoPara('sin-preguntar', 'ios');
  expect(aviso?.texto).toContain('sensor de movimiento');
  expect(aviso?.boton?.accion).toBe('permitir');
});

test('denegado: explica cómo activarlo y lleva a Ajustes', () => {
  const aviso = avisoPara('denegado', 'ios');
  expect(aviso?.texto).toContain('Ajustes');
  expect(aviso?.texto).toContain('a mano');
  expect(aviso?.boton?.accion).toBe('ajustes');
});

test('no disponible en Android: avisa que se usan cargas manuales, sin botón', () => {
  const aviso = avisoPara('no-disponible', 'android');
  expect(aviso?.texto).toContain('Android');
  expect(aviso?.texto).toContain('a mano');
  expect(aviso?.boton).toBeUndefined();
});
