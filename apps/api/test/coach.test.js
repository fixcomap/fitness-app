const test = require('node:test');
const assert = require('node:assert');
const {
  MAXIMO_NOMBRE_RUTINA,
  MAXIMO_MENSAJES_IA,
  mensajesParaIa,
  esquemaPedidoCoach,
  recortarNombre,
  limpiarRutina,
} = require('../src/ia/coach');
const { SISTEMA_COACH } = require('../src/ia/prompts');
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

test('el prompt pide una rutina por día, nombres cortos y no repetir los días en el texto', () => {
  assert.match(SISTEMA_COACH, /Una rutina por cada día de entrenamiento/);
  assert.match(SISTEMA_COACH, /3 acciones crear_rutina/);
  assert.match(SISTEMA_COACH, /"Empuje", "Tirón", "Piernas"/);
  assert.match(SISTEMA_COACH, /No repitas los días/);
});

test('el prompt: conceptos generales con libertad, sin inventar números y sin nombrar las guías siempre', () => {
  assert.match(SISTEMA_COACH, /conceptos generales de entrenamiento y nutrición respondelos con libertad y directo/);
  assert.match(SISTEMA_COACH, /qué es un músculo grande/);
  assert.match(SISTEMA_COACH, /La regla de no inventar es para los números/);
  assert.match(SISTEMA_COACH, /No menciones el manual ni "tus guías" en cada respuesta/);
  assert.doesNotMatch(SISTEMA_COACH, /decí que tus guías no lo tienen/);
});

test('el prompt: plan nuevo sobre días ocupados pregunta una vez si reemplaza o suma; si reemplaza, borra las viejas', () => {
  assert.match(SISTEMA_COACH, /si no dijo si reemplaza las que tiene o suma las nuevas, preguntáselo una sola vez/);
  assert.match(SISTEMA_COACH, /un borrar_rutinas con los ids de las rutinas viejas que se reemplazan/);
  assert.match(SISTEMA_COACH, /Si suma, mandá solo las crear_rutina/);
});

test('el prompt: los días que dice el usuario mandan por sobre los del perfil', () => {
  assert.match(SISTEMA_COACH, /eso manda por sobre diasEntrenoPorSemana del perfil/);
  assert.match(SISTEMA_COACH, /Si el usuario dice otra cosa en la charla, vale lo que dijo/);
});

test('el prompt de acciones: solo si pide un cambio, sin decir que ya lo hizo y preguntando si es ambiguo', () => {
  assert.match(SISTEMA_COACH, /Si solo pregunta algo, "acciones" va vacía/);
  assert.match(SISTEMA_COACH, /Nunca digas que ya lo hiciste ni que lo vas a hacer vos/);
  assert.match(SISTEMA_COACH, /"Te dejo la propuesta abajo, tocá Aplicar para guardarla"/);
  assert.match(
    SISTEMA_COACH,
    /Así no: "Listo", "Listo para borrar", "Anotado", "Sumé los 40 minutos", "Ya lo cargué", "Decime cuál y lo registro", "Decime cuál y la borro"/,
  );
  assert.match(SISTEMA_COACH, /preguntá y dejá "acciones" vacía/);
  assert.match(SISTEMA_COACH, /"borrá la rutina" cuando tiene 3/);
  assert.match(SISTEMA_COACH, /Nunca propongas borrar o quitar algo que el usuario no nombró/);
  assert.match(SISTEMA_COACH, /usá su "id" del contexto/);
  assert.match(SISTEMA_COACH, /acciones de distinto tipo/);
});

test('el prompt de comidas y pasos: días permitidos, crudo o cocido asumido y la unidad del usuario', () => {
  assert.match(SISTEMA_COACH, /Solo hoy o los 6 días anteriores, nunca un día futuro/);
  assert.match(SISTEMA_COACH, /en platos listos para comer .* asumí cocido, poné "estadoAsumido" en true y decilo/);
  assert.match(SISTEMA_COACH, /Preguntá solo si cambia mucho el resultado/);
  assert.match(SISTEMA_COACH, /"gramosPorUnidad" estimado/);
  assert.match(SISTEMA_COACH, /por 100 g/);
  assert.match(SISTEMA_COACH, /Usá la unidad que dijo el usuario \(km, minutos o pasos\), sin convertir/);
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

test('responde el texto y las acciones validadas contra el catálogo y el contexto', async () => {
  const nueva = (nombre, dia, ...ids) => ({
    tipo: 'crear_rutina',
    nombre,
    dia,
    ejercicios: ids.map((ejercicioId) => ({ ejercicioId, series: 3 })),
  });
  const ia = iaFalsa({
    coach: {
      texto: 'Te dejo empuje, tirón y piernas para que las apliques.',
      acciones: [
        nueva('Empuje', 0, 'press-banca-barra'),
        nueva('Tirón', 2, 'remo-barra', 'hip-thrust-inventado'),
        nueva('Piernas', 4, 'sentadilla-barra'),
        { tipo: 'borrar_rutinas', rutinaIds: ['rutina-full-body'] },
        { tipo: 'borrar_rutinas', rutinaIds: ['rutina-inventada'] },
      ],
    },
  });
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/coach', json(pedidoValido()));
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.texto, 'Te dejo empuje, tirón y piernas para que las apliques.');
    assert.strictEqual(r.body.rutinas, undefined);
    assert.deepStrictEqual(
      r.body.acciones.map((a) => [a.tipo, a.nombre ?? a.rutinaIds, a.dia, a.ejercicios?.length]),
      [
        ['crear_rutina', 'Empuje', 0, 1],
        ['crear_rutina', 'Tirón', 2, 1],
        ['crear_rutina', 'Piernas', 4, 1],
        ['borrar_rutinas', ['rutina-full-body'], undefined, undefined],
      ],
    );
    for (const accion of r.body.acciones) assert.match(accion.id, /^[0-9a-f-]{36}$/);
    assert.deepStrictEqual(r.body.descartados, [
      { accion: 'crear_rutina', rutina: 'Tirón', ejercicioId: 'hip-thrust-inventado', motivo: 'no-existe' },
      { accion: 'borrar_rutinas', rutinaId: 'rutina-inventada', motivo: 'no-existe-rutina' },
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
  const ia = iaFalsa({ coach: { texto: 'Dale', acciones: [] } });
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

test('POST /coach deja borrar todas las rutinas aunque el mensaje no diga "todas" (confirma la tarjeta)', async () => {
  const ia = iaFalsa({
    coach: {
      texto: 'Te dejo el borrado',
      acciones: [{ tipo: 'borrar_rutinas', rutinaIds: ['rutina-full-body', 'r2'] }],
    },
  });
  const pedido = (texto) => {
    const p = pedidoValido();
    p.contexto.rutinas.push({ ...p.contexto.rutinas[0], id: 'r2', nombre: 'Otra', dias: [4] });
    p.mensajes[1].texto = texto;
    return p;
  };
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/coach', json(pedido('sí, reemplazalas')));
    assert.deepStrictEqual(r.body.acciones[0].rutinaIds, ['rutina-full-body', 'r2']);
    assert.deepStrictEqual(r.body.descartados, []);
  });
});

test('pedido inválido: 400 con detalles y sin llamar a la IA', async () => {
  const ia = iaFalsa({ coach: { texto: 'hola', acciones: [] } });
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
  const ia = iaFalsa({ coach: { texto: 'Dale', acciones: [] } });
  await conApp({ ia, uso: usoEnMemoria(), limitesDiarios: { fotos: 10, mensajes: 1 } }, async (pedir) => {
    assert.strictEqual((await pedir('POST', '/coach', json(pedidoValido()))).status, 200);
    const r = await pedir('POST', '/coach', json(pedidoValido()));
    assert.strictEqual(r.status, 429);
    assert.strictEqual(r.body.error, 'Llegaste al límite de 1 mensaje por hoy. Mañana tenés 1 mensaje de nuevo.');
    assert.strictEqual(r.body.quedanManana, 1);
  });
});

test('si la IA falla o responde sin texto: 502 y no cuenta el mensaje', async () => {
  for (const ia of [iaFalsa({ error: new Error('caída') }), iaFalsa({ coach: { acciones: [] } })]) {
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
