const test = require('node:test');
const assert = require('node:assert');
const { crearApp } = require('../src/app');

async function pedir(pool, ruta) {
  const servidor = crearApp({ pool }).listen(0);
  try {
    const { port } = servidor.address();
    const res = await fetch(`http://127.0.0.1:${port}${ruta}`);
    return { status: res.status, body: await res.json() };
  } finally {
    servidor.close();
  }
}

const baseOk = { query: async () => ({ rows: [{ '?column?': 1 }] }) };
const baseCaida = { query: async () => { throw new Error('sin conexión'); } };

test('/vivo responde sin tocar la base', async () => {
  const r = await pedir(baseCaida, '/vivo');
  assert.strictEqual(r.status, 200);
});

test('/salud da 200 si la base responde', async () => {
  const r = await pedir(baseOk, '/salud');
  assert.deepStrictEqual(r, { status: 200, body: { ok: true, base: true } });
});

test('/salud da 503 si la base no responde', async () => {
  const r = await pedir(baseCaida, '/salud');
  assert.strictEqual(r.status, 503);
});
