const test = require('node:test');
const assert = require('node:assert');
const { crearApp } = require('../src/app');
const { LIMITES, MENSAJE_LIMITE } = require('../src/limites');

const baseOk = { query: async () => ({ rows: [{ '?column?': 1 }] }) };
const MINUTO_MS = 60 * 1000;
const limitesChicos = {
  general: { ventanaMs: MINUTO_MS, maximo: 5 },
  salud: { ventanaMs: MINUTO_MS, maximo: 2 },
};

// Levanta la app y devuelve una función para pedirle rutas (con headers opcionales).
async function conApp(limites, prueba) {
  const servidor = crearApp({ pool: baseOk, limites }).listen(0);
  try {
    const { port } = servidor.address();
    await prueba(async (ruta, headers = {}) => {
      const res = await fetch(`http://127.0.0.1:${port}${ruta}`, { headers });
      return { status: res.status, headers: res.headers, body: await res.json() };
    });
  } finally {
    servidor.close();
  }
}

test('/salud tiene un límite más estricto que el general', () => {
  assert.ok(LIMITES.salud.maximo < LIMITES.general.maximo);
});

test('/salud da 429 al pasarse del límite, con el mensaje y los headers RateLimit-*', async () => {
  await conApp(limitesChicos, async (pedir) => {
    assert.strictEqual((await pedir('/salud')).status, 200);
    const segundo = await pedir('/salud');
    assert.strictEqual(segundo.status, 200);
    assert.strictEqual(segundo.headers.get('ratelimit-limit'), '2');
    assert.strictEqual(segundo.headers.get('ratelimit-remaining'), '0');

    const r = await pedir('/salud');
    assert.strictEqual(r.status, 429);
    assert.deepStrictEqual(r.body, MENSAJE_LIMITE);
    assert.strictEqual(r.headers.get('ratelimit-limit'), '2');
    assert.strictEqual(r.headers.get('ratelimit-remaining'), '0');
    assert.ok(r.headers.get('ratelimit-reset'));
    assert.strictEqual(r.headers.get('x-ratelimit-limit'), null);
  });
});

test('/vivo no tiene límite', async () => {
  await conApp(limitesChicos, async (pedir) => {
    for (let i = 0; i < 20; i++) {
      const r = await pedir('/vivo');
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.headers.get('ratelimit-limit'), null);
    }
  });
});

test('el resto de las rutas tiene el límite general', async () => {
  await conApp(limitesChicos, async (pedir) => {
    for (let i = 0; i < 5; i++) assert.strictEqual((await pedir('/no-existe')).status, 404);
    const r = await pedir('/no-existe');
    assert.strictEqual(r.status, 429);
    assert.deepStrictEqual(r.body, MENSAJE_LIMITE);
  });
});

test('cada cliente detrás del balanceador tiene su propio límite', async () => {
  await conApp(limitesChicos, async (pedir) => {
    const clienteA = { 'X-Forwarded-For': '203.0.113.1' };
    const clienteB = { 'X-Forwarded-For': '203.0.113.2' };
    await pedir('/salud', clienteA);
    await pedir('/salud', clienteA);
    assert.strictEqual((await pedir('/salud', clienteA)).status, 429);
    assert.strictEqual((await pedir('/salud', clienteB)).status, 200);
  });
});

test('se confía en un solo salto: agregar IPs falsas a X-Forwarded-For no saltea el límite', async () => {
  await conApp(limitesChicos, async (pedir) => {
    // El balanceador agrega la IP real al final; lo de antes lo puede poner el cliente.
    await pedir('/salud', { 'X-Forwarded-For': '198.51.100.1, 203.0.113.1' });
    await pedir('/salud', { 'X-Forwarded-For': '198.51.100.2, 203.0.113.1' });
    const r = await pedir('/salud', { 'X-Forwarded-For': '198.51.100.3, 203.0.113.1' });
    assert.strictEqual(r.status, 429);
  });
});
