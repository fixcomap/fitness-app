const test = require('node:test');
const assert = require('node:assert');
const { esquemaPedidoCoach, limpiarRutina, leerRespuestaCoach } = require('../src/ia/coach');
const { ErrorIa } = require('../src/ia/proveedor');
const { DISPOSITIVO, iaFalsa, usoEnMemoria, conApp } = require('./ayudas');

const catalogo = [
  { id: 'sentadilla-barra', nombre: 'Sentadilla con barra' },
  { id: 'press-banca', nombre: 'Press de banca' },
  { id: 'remo-barra', nombre: 'Remo con barra' },
];
const ids = new Set(catalogo.map((e) => e.id));
const idFijo = () => 'rutina-1';

const pedidoValido = () => ({
  mensajes: [
    { rol: 'coach', texto: '¡Hola! ¿En qué te ayudo?' },
    { rol: 'usuario', texto: 'Armame una rutina de 3 días' },
  ],
  contexto: {
    perfil: {
      sexo: 'mujer',
      edad: 30,
      alturaCm: 165,
      pesoKg: 62,
      objetivoPeso: 'bajar',
      objetivo: 'hipertrofia',
      diasEntrenoPorSemana: 3,
      kcalObjetivo: 1700,
    },
    ultimos7Dias: [
      {
        fecha: '2026-11-25',
        kcal: 1650,
        proteinas: 90,
        comidas: ['Milanesa con puré'],
        entrenos: [{ nombre: 'Piernas', ejercicios: 5 }],
        pasos: 8000,
      },
    ],
    rutinas: [
      {
        nombre: 'Full body',
        dias: [0, 2],
        ejercicios: [{ ejercicioId: 'press-banca', series: 3, rango: { min: 8, max: 10 } }],
      },
    ],
    catalogo,
  },
});

// ── Pedido ──

test('acepta un pedido válido', () => {
  assert.strictEqual(esquemaPedidoCoach.safeParse(pedidoValido()).success, true);
});

test('rechaza pedidos sin mensajes, con el último del coach o sin catálogo', () => {
  const casos = [
    (p) => (p.mensajes = []),
    (p) => p.mensajes.push({ rol: 'coach', texto: 'Listo' }),
    (p) => (p.mensajes[1].texto = '   '),
    (p) => (p.contexto.catalogo = []),
    (p) => (p.contexto.perfil.sexo = 'otro'),
    (p) => (p.contexto.ultimos7Dias = Array.from({ length: 8 }, () => p.contexto.ultimos7Dias[0])),
  ];
  for (const cambiar of casos) {
    const pedido = pedidoValido();
    cambiar(pedido);
    assert.strictEqual(esquemaPedidoCoach.safeParse(pedido).success, false);
  }
});

// ── Rutina ──

test('arma la rutina en el formato de Mis rutinas', () => {
  const r = limpiarRutina(
    {
      nombre: '  Fuerza 3 días ',
      dias: [4, 0, 2, 2],
      ejercicios: [
        { ejercicioId: 'sentadilla-barra', series: 4, rango: { min: 5, max: 6 } },
        { ejercicioId: 'press-banca', series: 3, rango: { min: 6, max: 8 } },
      ],
    },
    ids,
    idFijo,
  );
  assert.deepStrictEqual(r, {
    rutina: {
      id: 'rutina-1',
      nombre: 'Fuerza 3 días',
      dias: [0, 2, 4],
      ejercicios: [
        { ejercicioId: 'sentadilla-barra', series: 4, rango: { min: 5, max: 6 } },
        { ejercicioId: 'press-banca', series: 3, rango: { min: 6, max: 8 } },
      ],
    },
    descartados: [],
  });
});

test('descarta ejercicios que no están en el catálogo o fuera de rango', () => {
  const r = limpiarRutina(
    {
      nombre: 'Rutina',
      dias: [1, 7, -1, 1.5],
      ejercicios: [
        { ejercicioId: 'curl-inventado', series: 3, rango: { min: 8, max: 12 } },
        { ejercicioId: 'press-banca', series: 11, rango: { min: 8, max: 12 } },
        { ejercicioId: 'remo-barra', series: 3, rango: { min: 12, max: 8 } },
        { ejercicioId: 'sentadilla-barra', series: 3, rango: { min: 0, max: 8 } },
        { ejercicioId: 'sentadilla-barra', series: 3, rango: { min: 8, max: 10 } },
        { ejercicioId: 'sentadilla-barra', series: 2, rango: { min: 8, max: 10 } },
        null,
      ],
    },
    ids,
    idFijo,
  );
  assert.deepStrictEqual(r.rutina.ejercicios, [
    { ejercicioId: 'sentadilla-barra', series: 3, rango: { min: 8, max: 10 } },
  ]);
  assert.deepStrictEqual(r.rutina.dias, [1]);
  assert.deepStrictEqual(r.descartados, [
    'curl-inventado',
    'press-banca',
    'remo-barra',
    'sentadilla-barra',
    'sentadilla-barra',
    '?',
  ]);
});

test('sin ejercicios válidos no hay rutina; sin nombre usa uno por defecto', () => {
  const sinValidos = limpiarRutina({ nombre: 'X', dias: [0], ejercicios: [{ ejercicioId: 'nada' }] }, ids, idFijo);
  assert.deepStrictEqual(sinValidos, { rutina: null, descartados: ['nada'] });
  assert.deepStrictEqual(limpiarRutina(null, ids), { rutina: null, descartados: [] });

  const sinNombre = limpiarRutina(
    { nombre: ' ', dias: [], ejercicios: [{ ejercicioId: 'remo-barra', series: 3, rango: { min: 8, max: 12 } }] },
    ids,
    idFijo,
  );
  assert.strictEqual(sinNombre.rutina.nombre, 'Rutina del coach');
});

test('la respuesta tiene que traer texto', () => {
  assert.deepStrictEqual(leerRespuestaCoach({ texto: ' Dale con todo ', rutina: null }, catalogo), {
    texto: 'Dale con todo',
    rutina: null,
    descartados: [],
  });
  for (const datos of [null, {}, { texto: '' }, { texto: 3 }]) {
    assert.throws(
      () => leerRespuestaCoach(datos, catalogo),
      (e) => e instanceof ErrorIa && e.tipo === 'formato',
    );
  }
});

// ── POST /coach ──

const json = (cuerpo, id = DISPOSITIVO) => ({
  headers: { 'X-Dispositivo': id, 'Content-Type': 'application/json' },
  cuerpo: JSON.stringify(cuerpo),
});

test('responde el texto y la rutina validada contra el catálogo', async () => {
  const ia = iaFalsa({
    coach: {
      texto: 'Te armé una rutina de 3 días.',
      rutina: {
        nombre: 'Full body 3 días',
        dias: [0, 2, 4],
        ejercicios: [
          { ejercicioId: 'sentadilla-barra', series: 4, rango: { min: 8, max: 10 } },
          { ejercicioId: 'hip-thrust-inventado', series: 3, rango: { min: 10, max: 12 } },
        ],
      },
    },
  });
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/coach', json(pedidoValido()));
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.texto, 'Te armé una rutina de 3 días.');
    assert.deepStrictEqual(r.body.rutina.ejercicios, [
      { ejercicioId: 'sentadilla-barra', series: 4, rango: { min: 8, max: 10 } },
    ]);
    assert.match(r.body.rutina.id, /^[0-9a-f-]{36}$/);
    assert.deepStrictEqual(r.body.descartados, ['hip-thrust-inventado']);

    const [llamada] = ia.llamadas;
    assert.strictEqual(llamada.mensajes.length, 2);
    assert.deepStrictEqual(llamada.contexto.catalogo, catalogo);
  });
});

test('pedido inválido: 400 con detalles y sin llamar a la IA', async () => {
  const ia = iaFalsa({ coach: { texto: 'hola', rutina: null } });
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const pedido = pedidoValido();
    pedido.mensajes = [];
    const r = await pedir('POST', '/coach', json(pedido));
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.detalles.length > 0);

    const roto = await pedir('POST', '/coach', {
      headers: { 'X-Dispositivo': DISPOSITIVO, 'Content-Type': 'application/json' },
      cuerpo: '{"mensajes": [',
    });
    assert.strictEqual(roto.status, 400);
    assert.deepStrictEqual(roto.body, { error: 'El cuerpo no es JSON válido' });

    const sinDispositivo = await pedir('POST', '/coach', json(pedidoValido(), 'celu'));
    assert.strictEqual(sinDispositivo.status, 400);
    assert.strictEqual(ia.llamadas.length, 0);
  });
});

test('pedido de más de 100 KB: 413', async () => {
  await conApp({ ia: iaFalsa(), uso: usoEnMemoria() }, async (pedir) => {
    const pedido = pedidoValido();
    pedido.relleno = 'x'.repeat(101 * 1024);
    const r = await pedir('POST', '/coach', json(pedido));
    assert.strictEqual(r.status, 413);
  });
});

test('límite diario de mensajes: 429 con cuántos quedan mañana', async () => {
  const ia = iaFalsa({ coach: { texto: 'Dale', rutina: null } });
  await conApp({ ia, uso: usoEnMemoria(), limitesDiarios: { fotos: 10, mensajes: 1 } }, async (pedir) => {
    assert.strictEqual((await pedir('POST', '/coach', json(pedidoValido()))).status, 200);
    const r = await pedir('POST', '/coach', json(pedidoValido()));
    assert.strictEqual(r.status, 429);
    assert.strictEqual(r.body.error, 'Llegaste al límite de 1 mensaje por hoy. Mañana tenés 1 mensaje de nuevo.');
    assert.strictEqual(r.body.quedanManana, 1);
  });
});

test('si la IA falla o responde sin texto: 502 y no cuenta el mensaje', async () => {
  for (const ia of [iaFalsa({ error: new Error('caída') }), iaFalsa({ coach: { rutina: null } })]) {
    const uso = usoEnMemoria();
    await conApp({ ia, uso }, async (pedir) => {
      const r = await pedir('POST', '/coach', json(pedidoValido()));
      assert.strictEqual(r.status, 502);
      assert.strictEqual(uso.usados(DISPOSITIVO, 'mensajes'), 0);
    });
  }
});

test('con la IA apagada responde 503', async () => {
  await conApp({ ia: null, uso: usoEnMemoria() }, async (pedir) => {
    assert.strictEqual((await pedir('POST', '/coach', json(pedidoValido()))).status, 503);
  });
});
