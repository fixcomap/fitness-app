const test = require('node:test');
const assert = require('node:assert');
const {
  MAXIMO_NOMBRE_RUTINA,
  MAXIMO_MENSAJES_IA,
  mensajesParaIa,
  esquemaPedidoCoach,
  recortarNombre,
  limpiarRutina,
  limpiarRutinas,
  leerRespuestaCoach,
} = require('../src/ia/coach');
const { SISTEMA_COACH } = require('../src/ia/prompts');
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
    hoy: '2026-11-26',
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
        id: 'rutina-full-body',
        nombre: 'Full body',
        dias: [0, 2],
        ejercicios: [{ ejercicioId: 'press-banca', series: 3, rango: { min: 8, max: 10 } }],
      },
    ],
  },
});

// ── Pedido ──

test('acepta un pedido válido', () => {
  assert.strictEqual(esquemaPedidoCoach.safeParse(pedidoValido()).success, true);
});

test('rechaza pedidos sin mensajes, con el último del coach o con datos inválidos (hoy, ids de rutina)', () => {
  const casos = [
    (p) => (p.mensajes = []),
    (p) => p.mensajes.push({ rol: 'coach', texto: 'Listo' }),
    (p) => (p.mensajes[1].texto = '   '),
    (p) => (p.contexto.perfil.sexo = 'otro'),
    (p) => delete p.contexto.hoy,
    (p) => (p.contexto.hoy = '2026-02-30'),
    (p) => (p.contexto.hoy = '26/11/2026'),
    (p) => delete p.contexto.rutinas[0].id,
    (p) => p.contexto.rutinas.push({ ...p.contexto.rutinas[0], nombre: 'Otra' }),
    (p) => (p.contexto.ultimos7Dias = Array.from({ length: 8 }, () => p.contexto.ultimos7Dias[0])),
  ];
  for (const cambiar of casos) {
    const pedido = pedidoValido();
    cambiar(pedido);
    assert.strictEqual(esquemaPedidoCoach.safeParse(pedido).success, false);
  }
});

// ── Rutinas ──

const ej = (ejercicioId, series = 3, min = 8, max = 12) => ({ ejercicioId, series, rango: { min, max } });

test('arma la rutina en el formato de Mis rutinas', () => {
  const r = limpiarRutina(
    { nombre: '  Empuje ', dias: [4, 4], ejercicios: [ej('press-banca', 4, 6, 8), ej('sentadilla-barra', 4, 5, 6)] },
    ids,
    { crearId: idFijo },
  );
  assert.deepStrictEqual(r, {
    rutina: {
      id: 'rutina-1',
      nombre: 'Empuje',
      dias: [4],
      ejercicios: [ej('press-banca', 4, 6, 8), ej('sentadilla-barra', 4, 5, 6)],
    },
    descartados: [],
  });
});

test('descarta ejercicios y dice por qué: no existe, fuera de rango, repetido', () => {
  const r = limpiarRutina(
    {
      nombre: 'Tirón',
      dias: [1, 7, -1, 1.5],
      ejercicios: [
        ej('curl-inventado'),
        ej('press-banca', 11),
        ej('remo-barra', 3, 12, 8),
        ej('sentadilla-barra', 3, 0, 8),
        ej('sentadilla-barra', 3, 8, 10),
        ej('sentadilla-barra', 2, 8, 10),
        null,
      ],
    },
    ids,
    { crearId: idFijo },
  );
  assert.deepStrictEqual(r.rutina.ejercicios, [ej('sentadilla-barra', 3, 8, 10)]);
  assert.deepStrictEqual(r.rutina.dias, [1]);
  assert.deepStrictEqual(
    r.descartados.map((d) => [d.ejercicioId, d.motivo]),
    [
      ['curl-inventado', 'no-existe'],
      ['press-banca', 'fuera-de-rango'],
      ['remo-barra', 'fuera-de-rango'],
      ['sentadilla-barra', 'fuera-de-rango'],
      ['sentadilla-barra', 'repetido'],
      ['?', 'no-existe'],
    ],
  );
  assert.ok(r.descartados.every((d) => d.rutina === 'Tirón'));
});

test('sin ejercicios válidos no hay rutina; sin nombre usa uno por defecto', () => {
  const sinValidos = limpiarRutina({ nombre: 'X', dias: [0], ejercicios: [{ ejercicioId: 'nada' }] }, ids);
  assert.deepStrictEqual(sinValidos, {
    rutina: null,
    descartados: [{ rutina: 'X', ejercicioId: 'nada', motivo: 'no-existe' }],
  });
  assert.deepStrictEqual(limpiarRutina(null, ids), { rutina: null, descartados: [] });

  const sinNombre = limpiarRutina({ nombre: ' ', dias: [], ejercicios: [ej('remo-barra')] }, ids);
  assert.strictEqual(sinNombre.rutina.nombre, 'Rutina del coach');
});

test('nombres largos se recortan en una palabra completa', () => {
  assert.strictEqual(MAXIMO_NOMBRE_RUTINA, 40);
  assert.strictEqual(
    recortarNombre('Hipertrofia 3 días - Empuje, Tirón, Piernas'),
    'Hipertrofia 3 días - Empuje, Tirón',
  );
  assert.strictEqual(recortarNombre('Empuje'), 'Empuje');
  assert.strictEqual(recortarNombre('  Torso   y   brazos  '), 'Torso y brazos');
  assert.strictEqual(recortarNombre('Piernas y glúteos - día pesado', 20), 'Piernas y glúteos');
  assert.strictEqual(recortarNombre('Uno dos tres', 7), 'Uno dos');
  assert.strictEqual(recortarNombre('Supercalifragilístico', 10), 'Supercalif');
  for (const largo of [5, 12, 25, 40]) {
    assert.ok(recortarNombre('Hipertrofia 3 días - Empuje, Tirón, Piernas', largo).length <= largo);
  }
});

test('una rutina por día: 3 días de empuje/tirón/piernas son 3 rutinas', () => {
  let n = 0;
  const r = limpiarRutinas(
    [
      { nombre: 'Empuje', dias: [0], ejercicios: [ej('press-banca')] },
      { nombre: 'Tirón', dias: [2], ejercicios: [ej('remo-barra'), ej('jalon-inventado')] },
      { nombre: 'Piernas', dias: [4], ejercicios: [ej('sentadilla-barra')] },
    ],
    ids,
    { crearId: () => `r${++n}` },
  );
  assert.deepStrictEqual(
    r.rutinas.map((x) => [x.id, x.nombre, x.dias, x.ejercicios.map((e) => e.ejercicioId)]),
    [
      ['r1', 'Empuje', [0], ['press-banca']],
      ['r2', 'Tirón', [2], ['remo-barra']],
      ['r3', 'Piernas', [4], ['sentadilla-barra']],
    ],
  );
  assert.deepStrictEqual(r.descartados, [{ rutina: 'Tirón', ejercicioId: 'jalon-inventado', motivo: 'no-existe' }]);
});

test('un día queda en la primera rutina que lo pide; las rutinas sin ejercicios válidos no van', () => {
  const r = limpiarRutinas(
    [
      { nombre: 'A', dias: [0, 2], ejercicios: [ej('press-banca')] },
      { nombre: 'B', dias: [2, 4], ejercicios: [ej('remo-barra')] },
      { nombre: 'C', dias: [5], ejercicios: [ej('nada')] },
      'cualquier cosa',
    ],
    ids,
  );
  assert.deepStrictEqual(
    r.rutinas.map((x) => [x.nombre, x.dias]),
    [
      ['A', [0, 2]],
      ['B', [4]],
    ],
  );
  assert.deepStrictEqual(limpiarRutinas(undefined, ids), { rutinas: [], descartados: [] });
});

test('como mucho 7 rutinas', () => {
  const lista = Array.from({ length: 9 }, (_, i) => ({
    nombre: `R${i}`,
    dias: [i % 7],
    ejercicios: [ej('remo-barra')],
  }));
  assert.strictEqual(limpiarRutinas(lista, ids).rutinas.length, 7);
});

test('la respuesta tiene que traer texto', () => {
  assert.deepStrictEqual(leerRespuestaCoach({ texto: ' Dale con todo ', rutinas: [] }, { catalogo }), {
    texto: 'Dale con todo',
    rutinas: [],
    descartados: [],
  });
  for (const datos of [null, {}, { texto: '' }, { texto: 3 }]) {
    assert.throws(
      () => leerRespuestaCoach(datos, { catalogo }),
      (e) => e instanceof ErrorIa && e.tipo === 'formato',
    );
  }
});

test('el prompt pide una rutina por día, nombres cortos y no repetir los días en el texto', () => {
  assert.match(SISTEMA_COACH, /Una rutina por cada día de entrenamiento/);
  assert.match(SISTEMA_COACH, /"Empuje", "Tirón", "Piernas"/);
  assert.match(SISTEMA_COACH, /No repitas los días/);
  assert.match(SISTEMA_COACH, /"rutinas" va vacía/);
});

// m0 usuario, m1 coach, m2 usuario… (los pares son del usuario).
const charla = (largo, primero = 'usuario') =>
  Array.from({ length: largo }, (_, i) => ({
    rol: i % 2 === 0 ? primero : primero === 'usuario' ? 'coach' : 'usuario',
    texto: `m${i}`,
  }));
const textos = (mensajes) => mensajes.map((m) => m.texto);

test('a la IA van solo los últimos 10 mensajes', () => {
  assert.strictEqual(MAXIMO_MENSAJES_IA, 10);
  // 12 mensajes: los últimos 10 arrancan en m2, del usuario.
  assert.deepStrictEqual(textos(mensajesParaIa(charla(12))), [
    'm2',
    'm3',
    'm4',
    'm5',
    'm6',
    'm7',
    'm8',
    'm9',
    'm10',
    'm11',
  ]);
  const corta = charla(3);
  assert.deepStrictEqual(mensajesParaIa(corta), corta);
});

test('si al recortar el primero queda del coach, se saca: siempre empieza el usuario', () => {
  // 13 mensajes: los últimos 10 arrancan en m3, del coach; queda desde m4.
  const recortados = mensajesParaIa(charla(13));
  assert.deepStrictEqual(textos(recortados), ['m4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12']);
  assert.strictEqual(recortados[0].rol, 'usuario');
  // Sin recortar también: si la charla arranca con el saludo del coach, se saca.
  assert.deepStrictEqual(textos(mensajesParaIa(charla(3, 'coach'))), ['m1', 'm2']);
});

// ── POST /coach ──

const json = (cuerpo, id = DISPOSITIVO) => ({
  headers: { 'X-Dispositivo': id, 'Content-Type': 'application/json' },
  cuerpo: JSON.stringify(cuerpo),
});

test('responde el texto y una rutina por día, validadas contra el catálogo', async () => {
  const ia = iaFalsa({
    coach: {
      texto: 'Te armé un plan de empuje, tirón y piernas.',
      rutinas: [
        { nombre: 'Empuje', dias: [0], ejercicios: [ej('press-banca-barra', 4, 6, 10)] },
        { nombre: 'Tirón', dias: [2], ejercicios: [ej('remo-barra'), ej('hip-thrust-inventado')] },
        { nombre: 'Piernas', dias: [4], ejercicios: [ej('sentadilla-barra', 4, 6, 8)] },
      ],
    },
  });
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/coach', json(pedidoValido()));
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.texto, 'Te armé un plan de empuje, tirón y piernas.');
    assert.deepStrictEqual(
      r.body.rutinas.map((x) => [x.nombre, x.dias, x.ejercicios.length]),
      [
        ['Empuje', [0], 1],
        ['Tirón', [2], 1],
        ['Piernas', [4], 1],
      ],
    );
    for (const rutina of r.body.rutinas) assert.match(rutina.id, /^[0-9a-f-]{36}$/);
    assert.deepStrictEqual(r.body.descartados, [
      { rutina: 'Tirón', ejercicioId: 'hip-thrust-inventado', motivo: 'no-existe' },
    ]);

    const [llamada] = ia.llamadas;
    // El saludo del coach no va: la charla con la IA arranca por el usuario.
    assert.deepStrictEqual(
      llamada.mensajes.map((m) => m.rol),
      ['usuario'],
    );
    // El catálogo no viaja en el contexto: lo pone la API en el prompt.
    assert.strictEqual(llamada.contexto.catalogo, undefined);
  });
});

test('POST /coach acepta 40 mensajes pero a la IA le pasa los últimos 10, empezando por el usuario', async () => {
  const ia = iaFalsa({ coach: { texto: 'Dale', rutinas: [] } });
  const pedido = pedidoValido();
  // Arranca el coach (m0) y termina el usuario (m39): los últimos 10 arrancan en m30, del coach.
  pedido.mensajes = charla(40, 'coach');
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/coach', json(pedido));
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(textos(ia.llamadas[0].mensajes), textos(pedido.mensajes.slice(-9)));
    assert.strictEqual(ia.llamadas[0].mensajes[0].rol, 'usuario');
    assert.strictEqual(ia.llamadas[0].contexto.hoy, '2026-11-26');
  });
});

test('pedido inválido: 400 con detalles y sin llamar a la IA', async () => {
  const ia = iaFalsa({ coach: { texto: 'hola', rutinas: [] } });
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
  const ia = iaFalsa({ coach: { texto: 'Dale', rutinas: [] } });
  await conApp({ ia, uso: usoEnMemoria(), limitesDiarios: { fotos: 10, mensajes: 1 } }, async (pedir) => {
    assert.strictEqual((await pedir('POST', '/coach', json(pedidoValido()))).status, 200);
    const r = await pedir('POST', '/coach', json(pedidoValido()));
    assert.strictEqual(r.status, 429);
    assert.strictEqual(r.body.error, 'Llegaste al límite de 1 mensaje por hoy. Mañana tenés 1 mensaje de nuevo.');
    assert.strictEqual(r.body.quedanManana, 1);
  });
});

test('si la IA falla o responde sin texto: 502 y no cuenta el mensaje', async () => {
  for (const ia of [iaFalsa({ error: new Error('caída') }), iaFalsa({ coach: { rutinas: [] } })]) {
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
