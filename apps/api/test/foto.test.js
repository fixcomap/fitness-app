const test = require('node:test');
const assert = require('node:assert');
const { leerResultadoFoto, MAXIMO_ITEMS } = require('../src/ia/foto');
const { ErrorIa } = require('../src/ia/proveedor');
const { DISPOSITIVO, OTRO_DISPOSITIVO, iaFalsa, usoEnMemoria, conApp, jpeg } = require('./ayudas');

const milanesa = {
  nombre: 'Milanesa de carne',
  gramos: 150.4,
  kcal: 380.6,
  proteinas: 28.04,
  carbos: 18.26,
  grasas: 21.55,
  confianza: 0.8456,
};
const pure = { nombre: 'Puré de papas', gramos: 200, kcal: 220, proteinas: 4, carbos: 32, grasas: 8.2, confianza: 0.7 };

// ── Validación ──

test('redondea los ítems y calcula el total del lado del servidor', () => {
  const r = leerResultadoFoto({ items: [milanesa, pure], total: { kcal: 99999 } });
  assert.deepStrictEqual(r.items[0], {
    nombre: 'Milanesa de carne',
    gramos: 150,
    kcal: 381,
    proteinas: 28,
    carbos: 18.3,
    grasas: 21.6,
    confianza: 0.85,
  });
  assert.deepStrictEqual(r.total, { gramos: 350, kcal: 601, proteinas: 32, carbos: 50.3, grasas: 29.8 });
});

test('descarta los ítems inválidos o fuera de rango', () => {
  const malos = [
    { ...pure, nombre: '' },
    { ...pure, gramos: 0 },
    { ...pure, kcal: -10 },
    { ...pure, grasas: 900 },
    { ...pure, confianza: 1.5 },
    { ...pure, kcal: '220' },
    null,
  ];
  const r = leerResultadoFoto({ items: [...malos, milanesa] });
  assert.deepStrictEqual(
    r.items.map((i) => i.nombre),
    ['Milanesa de carne'],
  );
});

test('sin comida en la foto: lista vacía y total en cero', () => {
  assert.deepStrictEqual(leerResultadoFoto({ items: [] }), {
    items: [],
    total: { gramos: 0, kcal: 0, proteinas: 0, carbos: 0, grasas: 0 },
  });
});

test('como mucho MAXIMO_ITEMS ítems', () => {
  const r = leerResultadoFoto({ items: Array.from({ length: MAXIMO_ITEMS + 5 }, () => pure) });
  assert.strictEqual(r.items.length, MAXIMO_ITEMS);
});

test('si no vino una lista de ítems es un error de formato', () => {
  for (const datos of [null, {}, { items: 'milanesa' }]) {
    assert.throws(
      () => leerResultadoFoto(datos),
      (e) => e instanceof ErrorIa && e.tipo === 'formato',
    );
  }
});

// ── POST /comida/foto ──

const conDispositivo = (id = DISPOSITIVO) => ({ 'X-Dispositivo': id, 'Content-Type': 'image/jpeg' });

test('analiza la foto y devuelve los ítems y el total', async () => {
  const ia = iaFalsa({ foto: { items: [milanesa] } });
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const foto = jpeg();
    const r = await pedir('POST', '/comida/foto?comida=almuerzo', { headers: conDispositivo(), cuerpo: foto });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.items[0].nombre, 'Milanesa de carne');
    assert.strictEqual(r.body.total.kcal, 381);
    assert.deepStrictEqual(ia.llamadas[0].contexto, { comida: 'almuerzo' });
    assert.deepStrictEqual(ia.llamadas[0].imagen, foto);
  });
});

test('la comida es opcional', async () => {
  const ia = iaFalsa({ foto: { items: [] } });
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/comida/foto', { headers: conDispositivo(), cuerpo: jpeg() });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(ia.llamadas[0].contexto, { comida: null });
  });
});

test('pedidos inválidos: sin dispositivo, otra comida, ni JPEG ni PNG, o más de 2 MB', async () => {
  const ia = iaFalsa({ foto: { items: [] } });
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const sinDispositivo = await pedir('POST', '/comida/foto', {
      headers: { 'Content-Type': 'image/jpeg' },
      cuerpo: jpeg(),
    });
    assert.strictEqual(sinDispositivo.status, 400);
    assert.match(sinDispositivo.body.error, /X-Dispositivo/);

    const otraComida = await pedir('POST', '/comida/foto?comida=brunch', { headers: conDispositivo(), cuerpo: jpeg() });
    assert.strictEqual(otraComida.status, 400);

    const gif = await pedir('POST', '/comida/foto', {
      headers: { 'X-Dispositivo': DISPOSITIVO, 'Content-Type': 'image/gif' },
      cuerpo: Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00'),
    });
    assert.strictEqual(gif.status, 415);
    assert.match(gif.body.error, /JPEG o PNG/);

    const disfrazado = await pedir('POST', '/comida/foto', { headers: conDispositivo(), cuerpo: Buffer.from('hola') });
    assert.strictEqual(disfrazado.status, 415);

    const grande = await pedir('POST', '/comida/foto', {
      headers: conDispositivo(),
      cuerpo: jpeg(2 * 1024 * 1024 + 1),
    });
    assert.strictEqual(grande.status, 413);
    assert.deepStrictEqual(grande.body, { error: 'La foto pesa más de 2 MB' });

    assert.strictEqual(ia.llamadas.length, 0);
  });
});

test('con la IA apagada responde 503', async () => {
  await conApp({ ia: null, uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/comida/foto', { headers: conDispositivo(), cuerpo: jpeg() });
    assert.strictEqual(r.status, 503);
  });
});

test('límite diario por usuario: 429 con el mensaje y cuántos quedan mañana', async () => {
  const ia = iaFalsa({ foto: { items: [] } });
  const uso = usoEnMemoria();
  await conApp({ ia, uso, limitesDiarios: { fotos: 2, mensajes: 30 } }, async (pedir) => {
    const pedirFoto = (id) => pedir('POST', '/comida/foto', { headers: conDispositivo(id), cuerpo: jpeg() });
    assert.strictEqual((await pedirFoto()).status, 200);
    assert.strictEqual((await pedirFoto()).status, 200);
    const r = await pedirFoto();
    assert.strictEqual(r.status, 429);
    assert.deepStrictEqual(r.body, {
      error: 'Llegaste al límite de 2 fotos por hoy. Mañana tenés 2 fotos de nuevo.',
      limite: 2,
      quedanHoy: 0,
      quedanManana: 2,
    });
    assert.strictEqual(ia.llamadas.length, 2);
    // Otro dispositivo tiene su propio límite.
    assert.strictEqual((await pedirFoto(OTRO_DISPOSITIVO)).status, 200);
  });
});

test('si la IA falla responde 502 y no cuenta el uso', async () => {
  const uso = usoEnMemoria();
  await conApp({ ia: iaFalsa({ error: new Error('timeout') }), uso }, async (pedir) => {
    const r = await pedir('POST', '/comida/foto', { headers: conDispositivo(), cuerpo: jpeg() });
    assert.strictEqual(r.status, 502);
    assert.deepStrictEqual(r.body, { error: 'No pudimos analizar la foto, probá de nuevo en un momento' });
    assert.strictEqual(uso.usados(DISPOSITIVO, 'fotos'), 0);
  });
});

test('si la IA no quiere analizar la foto responde 422', async () => {
  await conApp({ ia: iaFalsa({ error: new ErrorIa('rechazo', 'no') }), uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/comida/foto', { headers: conDispositivo(), cuerpo: jpeg() });
    assert.strictEqual(r.status, 422);
  });
});

test('si la IA devuelve algo sin forma responde 502', async () => {
  await conApp({ ia: iaFalsa({ foto: { platos: [] } }), uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/comida/foto', { headers: conDispositivo(), cuerpo: jpeg() });
    assert.strictEqual(r.status, 502);
  });
});

test('límite por IP de las rutas de IA', async () => {
  const ia = iaFalsa({ foto: { items: [] } });
  const limites = { ia: { ventanaMs: 60000, maximo: 2 } };
  await conApp({ ia, uso: usoEnMemoria(), limites }, async (pedir) => {
    const pedirFoto = () => pedir('POST', '/comida/foto', { headers: conDispositivo(), cuerpo: jpeg() });
    await pedirFoto();
    await pedirFoto();
    const r = await pedirFoto();
    assert.strictEqual(r.status, 429);
    assert.deepStrictEqual(r.body, { error: 'Demasiados pedidos, probá en un momento' });
    assert.strictEqual(ia.llamadas.length, 2);
  });
});
