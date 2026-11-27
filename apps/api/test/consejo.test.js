// Consejo del día de Inicio: lo que se calcula para la IA, el pedido, la ruta y los proveedores.
const test = require('node:test');
const assert = require('node:assert');
const {
  MAXIMO_TEXTO_CONSEJO,
  PEDIDO_CONSEJO,
  indiceDia,
  rachaComidas,
  comidasQueQuedan,
  momentoDelDia,
  HORA_TARDE,
  PROTEINA_POR_COMIDA,
  datosDeHoy,
  contextoConsejo,
  leerConsejo,
} = require('../src/ia/consejo');
const { esquemaPedidoConsejo } = require('../src/ia/coach');
const { ErrorIa } = require('../src/ia/proveedor');
const { SISTEMA_COACH, SISTEMA_CONSEJO, MANUAL_COACH, contextoCoach } = require('../src/ia/prompts');
const { TEXTO_CATALOGO } = require('../src/ia/catalogo');
const { crearProveedorClaude } = require('../src/ia/claude');
const { crearProveedorGemini } = require('../src/ia/gemini');
const { crearProveedorFalso, CONSEJO } = require('../src/ia/falso');
const { DISPOSITIVO, iaFalsa, usoEnMemoria, conApp } = require('./ayudas');

// Jueves 26/11/2026: le toca "Piernas" (lunes y jueves), todavía no entrenó y le faltan 70 g de proteína.
const contexto = () => ({
  hoy: '2026-11-26',
  perfil: {
    sexo: 'hombre',
    edad: 28,
    alturaCm: 178,
    pesoKg: 80,
    objetivoPeso: 'mantener',
    objetivo: 'hipertrofia',
    diasEntrenoPorSemana: 4,
    kcalObjetivo: 2600,
    proteinasObjetivo: 160,
    metaPasos: 8000,
  },
  ultimos7Dias: [
    { fecha: '2026-11-24', kcal: 2400, proteinas: 150, comidas: ['Pollo con arroz'], pasos: 9000 },
    {
      fecha: '2026-11-25',
      kcal: 2550,
      proteinas: 140,
      comidas: ['Milanesa con puré'],
      entrenos: [{ nombre: 'Torso', ejercicios: 6 }],
      pasos: 7000,
    },
    { fecha: '2026-11-26', kcal: 900, proteinas: 90, comidas: ['Tostadas con huevo'], pasos: 3000 },
  ],
  rutinas: [
    {
      id: 'piernas',
      nombre: 'Piernas',
      dias: [0, 3],
      ejercicios: [{ ejercicioId: 'sentadilla-barra', series: 4, rango: { min: 6, max: 10 } }],
    },
    {
      id: 'torso',
      nombre: 'Torso',
      dias: [1, 4],
      ejercicios: [{ ejercicioId: 'press-banca-barra', series: 4, rango: { min: 6, max: 10 } }],
    },
  ],
});

const json = (cuerpo, dispositivo = DISPOSITIVO) => ({
  headers: { 'Content-Type': 'application/json', 'X-Dispositivo': dispositivo },
  cuerpo: JSON.stringify(cuerpo),
});

// ── Lo calculado para la IA ──

test('indiceDia: 0 es lunes y 6 domingo, como las rutinas', () => {
  assert.strictEqual(indiceDia('2026-11-23'), 0); // lunes
  assert.strictEqual(indiceDia('2026-11-26'), 3); // jueves
  assert.strictEqual(indiceDia('2026-11-29'), 6); // domingo
  assert.strictEqual(indiceDia('ayer'), null);
  assert.strictEqual(indiceDia(undefined), null);
});

// A la mañana: ayer, la semana y lo planeado hoy. Nunca lo que falta hoy.
const MANANA = {
  momento: 'mañana',
  hora: 8,
  rutinasDeHoy: ['Piernas'],
  entrenoDeHoyHecho: false,
  objetivos: { proteinas: 160, kcal: 2600, pasos: 8000 },
  ayer: {
    fecha: '2026-11-25',
    proteinas: 140,
    kcal: 2550,
    pasos: 7000,
    comidasRegistradas: 1,
    entrenos: ['Torso'],
    faltaron: { proteinas: 20, kcal: 0, pasos: 1000 },
  },
  promedioSemana: { diasConComidas: 2, proteinas: 145, kcal: 2475, pasos: 8000 },
  entrenosUltimos7Dias: 1,
  rachaComidas: 3,
};

test('datosDeHoy a la mañana (antes de las 14): ayer, la semana y lo planeado, sin lo que falta hoy', () => {
  const d = datosDeHoy(contexto(), 8);
  assert.deepStrictEqual(d, MANANA);
  assert.ok(!('faltanHoy' in d) && !('hoy' in d));
});

test('datosDeHoy: más tarde pero sin comidas cargadas hoy sigue siendo la mañana', () => {
  const c = contexto();
  c.ultimos7Dias[2] = { fecha: '2026-11-26', kcal: 0, comidas: [], pasos: 4000 };
  assert.strictEqual(momentoDelDia(18, c.ultimos7Dias[2]), 'mañana');
  assert.strictEqual(datosDeHoy(c, 18).momento, 'mañana');
  assert.ok(!('faltanHoy' in datosDeHoy(c, 18)));
  assert.strictEqual(momentoDelDia(HORA_TARDE, contexto().ultimos7Dias[2]), 'tarde');
});

test('datosDeHoy a la tarde: lo que falta hoy y una meta realista para lo que queda', () => {
  const d = datosDeHoy(contexto(), 18);
  assert.deepStrictEqual(
    { ...d, ayer: undefined, promedioSemana: undefined },
    {
      ...MANANA,
      momento: 'tarde',
      hora: 18,
      ayer: undefined,
      promedioSemana: undefined,
      hoy: { proteinas: 90, kcal: 900, pasos: 3000, comidasRegistradas: 1, entrenos: [] },
      faltanHoy: { proteinas: 70, kcal: 1700, pasos: 5000 },
      // A las 18 queda la cena: 40 g de proteína, no 70. Pasos: 4 horas hasta las 22 alcanzan.
      paraLoQueQueda: { comidasQueQuedan: 1, proteinas: PROTEINA_POR_COMIDA, pasos: 5000 },
    },
  );
  assert.deepStrictEqual(datosDeHoy(contexto(), 15).paraLoQueQueda, {
    comidasQueQuedan: 2,
    proteinas: 70,
    pasos: 5000,
  });
  assert.deepStrictEqual(datosDeHoy(contexto(), 21).paraLoQueQueda, {
    comidasQueQuedan: 1,
    proteinas: 40,
    pasos: 1500,
  });
  assert.deepStrictEqual(datosDeHoy(contexto(), 23).paraLoQueQueda, { comidasQueQuedan: 0, proteinas: 0, pasos: 0 });
});

test('comidasQueQuedan: merienda y cena, solo la cena o ninguna', () => {
  assert.deepStrictEqual([14, 16, 17, 21, 22].map(comidasQueQuedan), [2, 2, 1, 1, 0]);
});

test('datosDeHoy: lo pasado del objetivo no da negativo y ya entrenado se marca', () => {
  const c = contexto();
  c.ultimos7Dias[2] = {
    fecha: '2026-11-26',
    kcal: 2700,
    proteinas: 170,
    comidas: ['Asado'],
    entrenos: [{ nombre: 'Piernas' }],
  };
  const d = datosDeHoy(c, 20);
  assert.deepStrictEqual(d.faltanHoy, { proteinas: 0, kcal: 0, pasos: 8000 });
  assert.strictEqual(d.entrenoDeHoyHecho, true);
  assert.strictEqual(d.entrenosUltimos7Dias, 2);
});

test('datosDeHoy: una diferencia chica cuenta como cumplido', () => {
  const c = contexto();
  c.ultimos7Dias[2] = { fecha: '2026-11-26', kcal: 2520, proteinas: 152, pasos: 7600 };
  assert.deepStrictEqual(datosDeHoy(c, 20).faltanHoy, { proteinas: 0, kcal: 0, pasos: 0 });
  c.ultimos7Dias[2] = { fecha: '2026-11-26', kcal: 2500, proteinas: 150, pasos: 7500 };
  assert.deepStrictEqual(datosDeHoy(c, 20).faltanHoy, { proteinas: 10, kcal: 100, pasos: 500 });
});

test('datosDeHoy: sin objetivos ni datos no inventa nada', () => {
  const c = contexto();
  delete c.perfil.proteinasObjetivo;
  delete c.perfil.kcalObjetivo;
  delete c.perfil.metaPasos;
  c.ultimos7Dias = [];
  c.rutinas = [];
  assert.deepStrictEqual(datosDeHoy(c, 10), {
    momento: 'mañana',
    hora: 10,
    rutinasDeHoy: [],
    entrenoDeHoyHecho: false,
    objetivos: {},
    ayer: null,
    promedioSemana: { diasConComidas: 0, proteinas: null, kcal: null, pasos: null },
    entrenosUltimos7Dias: 0,
    rachaComidas: 0,
  });
});

test('rachaComidas: hoy sin comidas no la corta, un día vacío antes sí', () => {
  const dia = (fecha, kcal) => ({ fecha, kcal });
  assert.strictEqual(rachaComidas([dia('2026-11-24', 2000), dia('2026-11-25', 1800)], '2026-11-26'), 2);
  assert.strictEqual(
    rachaComidas(
      [dia('2026-11-23', 2000), dia('2026-11-24', 0), dia('2026-11-25', 1800), dia('2026-11-26', 0)],
      '2026-11-26',
    ),
    1,
  );
  assert.strictEqual(rachaComidas([], '2026-11-26'), 0);
});

test('contextoConsejo: el contexto del coach y, al final, lo calculado con los consejos anteriores', () => {
  const anteriores = [{ fecha: '2026-11-25', texto: 'Sumá proteína en la cena.' }];
  const texto = contextoConsejo(contexto(), { consejosAnteriores: anteriores, hora: 21 });
  assert.ok(texto.startsWith(contextoCoach(contexto())));
  const extra = JSON.parse(texto.slice(texto.lastIndexOf('\n') + 1));
  assert.deepStrictEqual(extra.consejosAnteriores, anteriores);
  assert.deepStrictEqual(extra.rutinasDeHoy, ['Piernas']);
  assert.strictEqual(extra.momento, 'tarde');
});

test('el prompt del consejo pide lo acordado', () => {
  for (const regla of [
    /una o dos frases/,
    /HOY/,
    /tomá agua/,
    /No inventes cifras/,
    /Nada médico/,
    /consejosAnteriores/,
    /"mañana"/,
    /Nunca digas cuánto le falta hoy/,
    /paraLoQueQueda/,
    /nada de 100 g de proteína en una cena/,
  ]) {
    assert.match(SISTEMA_CONSEJO, regla);
  }
  for (const destino of ['"entreno"', '"comida"', '"actividad"', '"coach"'])
    assert.ok(SISTEMA_CONSEJO.includes(destino));
});

// ── Respuesta ──

test('leerConsejo: limpia espacios, corta lo largo y un destino desconocido va al coach', () => {
  assert.deepStrictEqual(leerConsejo({ texto: '  Hoy te toca\n Piernas.  ', destino: 'entreno' }), {
    texto: 'Hoy te toca Piernas.',
    destino: 'entreno',
  });
  assert.strictEqual(leerConsejo({ texto: 'Dale', destino: 'perfil' }).destino, 'coach');
  assert.strictEqual(leerConsejo({ texto: 'x'.repeat(500), destino: 'coach' }).texto.length, MAXIMO_TEXTO_CONSEJO);
  for (const datos of [null, {}, { texto: '   ' }, { texto: 3 }]) {
    assert.throws(
      () => leerConsejo(datos),
      (e) => e instanceof ErrorIa && e.tipo === 'formato',
    );
  }
});

// ── Pedido ──

test('pedido: los consejos anteriores son opcionales y como mucho 3', () => {
  const sin = esquemaPedidoConsejo.safeParse({ contexto: contexto(), hora: 8 });
  assert.ok(sin.success);
  assert.deepStrictEqual(sin.data.consejosAnteriores, []);

  const consejo = (dia) => ({ fecha: `2026-11-2${dia}`, texto: 'Algo' });
  assert.ok(
    esquemaPedidoConsejo.safeParse({ contexto: contexto(), hora: 8, consejosAnteriores: [1, 2, 3].map(consejo) })
      .success,
  );
  assert.ok(
    !esquemaPedidoConsejo.safeParse({ contexto: contexto(), hora: 8, consejosAnteriores: [1, 2, 3, 4].map(consejo) })
      .success,
  );
  assert.ok(
    !esquemaPedidoConsejo.safeParse({
      contexto: contexto(),
      hora: 8,
      consejosAnteriores: [{ fecha: 'ayer', texto: 'x' }],
    }).success,
  );
});

test('pedido: los objetivos de proteína y pasos son opcionales pero se validan', () => {
  const c = contexto();
  c.perfil.metaPasos = -1;
  assert.ok(!esquemaPedidoConsejo.safeParse({ contexto: c, hora: 21 }).success);
});

test('pedido: la hora local es obligatoria y de 0 a 23', () => {
  assert.ok(!esquemaPedidoConsejo.safeParse({ contexto: contexto() }).success);
  for (const hora of [-1, 24, 8.5, '8'])
    assert.ok(!esquemaPedidoConsejo.safeParse({ contexto: contexto(), hora }).success);
  assert.ok(esquemaPedidoConsejo.safeParse({ contexto: contexto(), hora: 0 }).success);
});

// ── Ruta ──

test('POST /coach/consejo: responde { texto, destino } y pasa el contexto y los anteriores', async () => {
  const ia = iaFalsa({ consejo: { texto: 'Hoy te toca Piernas.', destino: 'entreno' } });
  const uso = usoEnMemoria();
  await conApp({ ia, uso }, async (pedir) => {
    const anteriores = [{ fecha: '2026-11-25', texto: 'Sumá proteína.' }];
    const r = await pedir(
      'POST',
      '/coach/consejo',
      json({ contexto: contexto(), hora: 21, consejosAnteriores: anteriores }),
    );
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.body, { texto: 'Hoy te toca Piernas.', destino: 'entreno' });
    assert.deepStrictEqual(ia.llamadas[0].consejosAnteriores, anteriores);
    assert.strictEqual(ia.llamadas[0].hora, 21);
    assert.strictEqual(ia.llamadas[0].contexto.hoy, '2026-11-26');
    // Cuenta como consejo, no como mensaje del chat.
    assert.strictEqual(uso.usados(DISPOSITIVO, 'consejos'), 1);
    assert.strictEqual(uso.usados(DISPOSITIVO, 'mensajes'), 0);
  });
});

test('POST /coach/consejo: pedido inválido o sin dispositivo no llama a la IA', async () => {
  const ia = iaFalsa({ consejo: { texto: 'x', destino: 'coach' } });
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/coach/consejo', json({ contexto: { hoy: 'ayer' } }));
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.body.error, 'Pedido inválido');
    assert.strictEqual(
      (await pedir('POST', '/coach/consejo', json({ contexto: contexto(), hora: 8 }, 'celu'))).status,
      400,
    );
    assert.strictEqual(ia.llamadas.length, 0);
  });
});

test('POST /coach/consejo: 2 por día por defecto y después 429', async () => {
  const ia = iaFalsa({ consejo: { texto: 'Dale', destino: 'coach' } });
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    for (let i = 0; i < 2; i++)
      assert.strictEqual((await pedir('POST', '/coach/consejo', json({ contexto: contexto(), hora: 8 }))).status, 200);
    const r = await pedir('POST', '/coach/consejo', json({ contexto: contexto(), hora: 8 }));
    assert.strictEqual(r.status, 429);
    assert.strictEqual(r.body.error, 'Llegaste al límite de 2 consejos por hoy. Mañana tenés 2 consejos de nuevo.');
  });
});

test('POST /coach/consejo: si la IA falla o no da texto, 502 y no cuenta', async () => {
  for (const ia of [iaFalsa({ error: new Error('caída') }), iaFalsa({ consejo: { destino: 'coach' } })]) {
    const uso = usoEnMemoria();
    await conApp({ ia, uso }, async (pedir) => {
      const r = await pedir('POST', '/coach/consejo', json({ contexto: contexto(), hora: 8 }));
      assert.strictEqual(r.status, 502);
      assert.strictEqual(r.body.error, 'No pudimos armar el consejo de hoy, probá de nuevo en un momento');
      assert.strictEqual(uso.usados(DISPOSITIVO, 'consejos'), 0);
    });
  }
});

test('POST /coach/consejo: con la IA apagada, 503', async () => {
  await conApp({ ia: null, uso: usoEnMemoria() }, async (pedir) => {
    assert.strictEqual((await pedir('POST', '/coach/consejo', json({ contexto: contexto(), hora: 8 }))).status, 503);
  });
});

// ── Proveedores ──

test('Claude: el consejo reusa el prefijo cacheado del coach y agrega sus reglas y el contexto después', async () => {
  const pedidos = [];
  const clientePara = () => ({
    messages: {
      parse: async (pedido) => {
        pedidos.push(pedido);
        return {
          model: 'claude-x',
          stop_reason: 'end_turn',
          parsed_output: { texto: 'Dale', destino: 'coach' },
          usage: { input_tokens: 10, output_tokens: 5 },
        };
      },
    },
  });
  const ia = crearProveedorClaude({ clientePara, modeloFoto: 'm-foto', modeloCoach: 'm-coach' });
  const r = await ia.darConsejo(contexto(), { consejosAnteriores: [], hora: 9 });
  assert.deepStrictEqual(r.datos, { texto: 'Dale', destino: 'coach' });

  const [pedido] = pedidos;
  assert.strictEqual(pedido.model, 'm-coach');
  assert.deepStrictEqual(pedido.system.slice(0, 3), [
    { type: 'text', text: SISTEMA_COACH },
    { type: 'text', text: MANUAL_COACH },
    { type: 'text', text: TEXTO_CATALOGO, cache_control: { type: 'ephemeral' } },
  ]);
  assert.deepStrictEqual(pedido.system.slice(3), [
    { type: 'text', text: SISTEMA_CONSEJO },
    { type: 'text', text: contextoConsejo(contexto(), { consejosAnteriores: [], hora: 9 }) },
  ]);
  assert.deepStrictEqual(pedido.messages, [{ role: 'user', content: PEDIDO_CONSEJO }]);
});

test('Gemini: el consejo arranca con el mismo prefijo que el chat', async () => {
  const pedidos = [];
  const cliente = {
    models: {
      generateContent: async (pedido) => {
        pedidos.push(pedido);
        return {
          candidates: [{ finishReason: 'STOP' }],
          text: '{"texto":"Dale","destino":"comida"}',
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        };
      },
    },
  };
  const ia = crearProveedorGemini({ cliente, modeloFoto: 'm-foto', modeloCoach: 'm-coach' });
  const r = await ia.darConsejo(contexto(), { consejosAnteriores: [], hora: 9 });
  assert.deepStrictEqual(r.datos, { texto: 'Dale', destino: 'comida' });
  const sistema = pedidos[0].config.systemInstruction;
  assert.ok(sistema.startsWith(`${SISTEMA_COACH}\n\n${MANUAL_COACH}\n\n${TEXTO_CATALOGO}\n\n${SISTEMA_CONSEJO}`));
  assert.ok(sistema.endsWith(contextoConsejo(contexto(), { consejosAnteriores: [], hora: 9 })));
});

test('falso: siempre el mismo consejo, válido', async () => {
  const r = await crearProveedorFalso().darConsejo(contexto(), { consejosAnteriores: [], hora: 9 });
  assert.deepStrictEqual(r.datos, CONSEJO);
  assert.deepStrictEqual(leerConsejo(r.datos), CONSEJO);
});
