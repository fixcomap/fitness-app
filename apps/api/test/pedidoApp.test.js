// El pedido que arma la app (apps/mobile/src/lib/coach/contexto.ts) pasa la validación de la API.
// El archivo lo genera el test de la app: si cambia el formato de un lado, falla uno de los dos.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { esquemaPedidoCoach, esquemaPedidoConsejo, erroresPedido } = require('../src/ia/coach');

test('el pedido de ejemplo de la app pasa esquemaPedidoCoach sin perder campos', () => {
  const pedido = require(path.join(__dirname, '../../mobile/src/lib/coach/__fixtures__/pedido-coach.json'));
  const r = esquemaPedidoCoach.safeParse(pedido);
  assert.ok(r.success, r.success ? '' : erroresPedido(r.error).join('; '));
  // zod saca lo que no conoce: si la app mandara un campo de más, acá se notaría.
  assert.deepStrictEqual(r.data, pedido);
});

test('el pedido de consejo del día de la app pasa esquemaPedidoConsejo sin perder campos', () => {
  const pedido = require(path.join(__dirname, '../../mobile/src/lib/coach/__fixtures__/pedido-consejo.json'));
  const r = esquemaPedidoConsejo.safeParse(pedido);
  assert.ok(r.success, r.success ? '' : erroresPedido(r.error).join('; '));
  assert.deepStrictEqual(r.data, pedido);
});
