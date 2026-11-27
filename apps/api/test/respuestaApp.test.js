// La API devuelve las acciones con la forma que lee la app (apps/mobile/src/lib/coach/acciones.ts).
// La app lee este mismo archivo en su test: si cambia el formato de un lado, falla uno de los dos.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { limpiarAcciones } = require('../src/ia/acciones');

test('las acciones de la respuesta de ejemplo de la app son las que arma la API', () => {
  const { contexto, respuesta } = require(
    path.join(__dirname, '../../mobile/src/lib/coach/__fixtures__/respuesta-coach.json'),
  );
  // Lo que mandaría la IA: sin ids (los pone la API) ni rangos (los pone la API según el catálogo).
  const deLaIa = respuesta.acciones.map(({ id: _id, ...accion }) =>
    accion.ejercicios ? { ...accion, ejercicios: accion.ejercicios.map(({ rango: _rango, ...e }) => e) } : accion,
  );
  const ids = respuesta.acciones.map((a) => a.id);
  const r = limpiarAcciones(deLaIa, contexto, { crearId: () => ids.shift() });
  assert.deepStrictEqual(r.descartados, []);
  assert.deepStrictEqual(r.acciones, respuesta.acciones);
});
