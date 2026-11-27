// El catálogo de ejercicios que la API pone en el prompt.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { CATALOGO, TEXTO_CATALOGO, catalogoParaApi, textoCatalogo } = require('../src/ia/catalogo');
const { rangoDeLaApp } = require('../src/ia/rangos');

test('catalogo.json está al día con el de la app (si falla: node scripts/sincronizar-catalogo.js)', () => {
  const app = require(path.join(__dirname, '../../mobile/src/data/ejercicios.json'));
  assert.deepStrictEqual(CATALOGO, catalogoParaApi(app));
});

test('cada ejercicio queda con id, nombre, equipo y el tipo que usa la app', () => {
  const ejercicios = [
    { id: 'curl-barra', nombre: 'Curl de bíceps con barra', equipo: 'barra', nivel: 'principiante', tecnica: [] },
    { id: 'jalon', nombre: 'Jalón al pecho', equipo: 'polea' },
    { id: 'pallof', nombre: 'Press Pallof', equipo: 'polea', tipo: 'aislamiento' },
  ];
  assert.deepStrictEqual(catalogoParaApi(ejercicios), [
    { id: 'curl-barra', nombre: 'Curl de bíceps con barra', equipo: 'barra', tipo: 'aislamiento' },
    { id: 'jalon', nombre: 'Jalón al pecho', equipo: 'polea', tipo: 'compuesto' },
    { id: 'pallof', nombre: 'Press Pallof', equipo: 'polea', tipo: 'aislamiento' },
  ]);
});

test('el texto del prompt tiene una línea por ejercicio', () => {
  assert.strictEqual(
    textoCatalogo([{ id: 'jalon', nombre: 'Jalón al pecho', equipo: 'polea', tipo: 'compuesto' }]),
    'Catálogo de ejercicios de la app (id | nombre | equipo | tipo):\njalon | Jalón al pecho | polea | compuesto',
  );
  assert.strictEqual(TEXTO_CATALOGO.split('\n').length, CATALOGO.length + 1);
});

test('todos los ejercicios del catálogo tienen rango de la app', () => {
  for (const e of CATALOGO) {
    for (const objetivo of ['hipertrofia', 'fuerza']) assert.ok(rangoDeLaApp(e, objetivo), e.id);
  }
});
