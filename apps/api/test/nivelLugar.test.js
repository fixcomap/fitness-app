// Qué equipos hay en cada lugar donde entrena el usuario.
const test = require('node:test');
const assert = require('node:assert');
const { CATALOGO } = require('../src/ia/catalogo');
const { EQUIPOS_POR_LUGAR, LUGARES, equipoDisponible } = require('../src/ia/nivelLugar');

test('equipoDisponible: gym todo; casa con mancuernas y solo peso corporal, lo suyo', () => {
  assert.ok(['barra', 'maquina', 'polea', 'kettlebell', 'mancuernas'].every((e) => equipoDisponible(e, 'gym')));
  assert.ok(['mancuernas', 'peso-corporal', 'bandas'].every((e) => equipoDisponible(e, 'casa-mancuernas')));
  assert.ok(
    !['barra', 'barra-z', 'maquina', 'polea', 'kettlebell'].some((e) => equipoDisponible(e, 'casa-mancuernas')),
  );
  assert.ok(['peso-corporal', 'bandas'].every((e) => equipoDisponible(e, 'peso-corporal')));
  assert.ok(!equipoDisponible('mancuernas', 'peso-corporal'));
  // Sin lugar (perfiles de antes) o uno que no existe: gym completo.
  assert.ok(equipoDisponible('barra', undefined));
  assert.ok(equipoDisponible('barra', 'otro'));
});

test('cada lugar tiene equipos que existen en el catálogo y suficientes ejercicios para un día', () => {
  const equipos = new Set(CATALOGO.map((e) => e.equipo));
  for (const lugar of LUGARES) {
    for (const e of EQUIPOS_POR_LUGAR[lugar] ?? []) assert.ok(equipos.has(e), `${lugar}: ${e}`);
    const disponibles = CATALOGO.filter((e) => equipoDisponible(e.equipo, lugar));
    assert.ok(disponibles.length >= 20, `${lugar}: ${disponibles.length} ejercicios`);
  }
});
