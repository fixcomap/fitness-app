// Capa de IA con clientes falsos: no se llama a ninguna IA real.
const test = require('node:test');
const assert = require('node:assert');
const { leerConfigIa, MODELOS_POR_DEFECTO } = require('../src/ia/config');
const { crearProveedor } = require('../src/ia');
const { crearProveedorGemini } = require('../src/ia/gemini');
const { crearClientesClaude, crearProveedorClaude } = require('../src/ia/claude');
const { ErrorIa, historialDesdeUsuario } = require('../src/ia/proveedor');
const {
  MINIMO_KCAL,
  SISTEMA_COACH,
  SISTEMA_FOTO,
  MANUAL_COACH,
  textoFoto,
  contextoCoach,
  diaDeSemana,
} = require('../src/ia/prompts');
const { TEXTO_CATALOGO } = require('../src/ia/catalogo');

const imagen = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const contexto = { perfil: { sexo: 'mujer' }, rutinas: [{ nombre: 'Piernas' }] };
const mensajes = [
  { rol: 'coach', texto: '¡Hola! ¿En qué te ayudo?' },
  { rol: 'usuario', texto: 'Armame una rutina' },
  { rol: 'coach', texto: '¿Cuántos días?' },
  { rol: 'usuario', texto: 'Tres' },
];

// ── Configuración ──

test('sin IA_PROVEEDOR la IA queda apagada, con los límites diarios por defecto', () => {
  const c = leerConfigIa({});
  assert.strictEqual(c.proveedor, null);
  assert.deepStrictEqual(c.limitesDiarios, { fotos: 10, mensajes: 30, consejos: 2 });
});

test('gemini con clave usa los modelos por defecto o los de las variables', () => {
  const c = leerConfigIa({ IA_PROVEEDOR: 'gemini', GEMINI_API_KEY: 'x', IA_MODELO_COACH: 'otro' });
  assert.strictEqual(c.proveedor, 'gemini');
  assert.strictEqual(c.modeloFoto, MODELOS_POR_DEFECTO.gemini);
  assert.strictEqual(c.modeloCoach, 'otro');
  assert.strictEqual(c.vertex, null);
});

test('Claude usa Haiku por defecto para la foto y el coach; Opus solo si se elige por variable', () => {
  const porDefecto = leerConfigIa({ IA_PROVEEDOR: 'claude', ANTHROPIC_API_KEY: 'x' });
  assert.strictEqual(porDefecto.modeloFoto, 'claude-haiku-5-5');
  assert.strictEqual(porDefecto.modeloCoach, 'claude-haiku-5-5');
  const vertex = leerConfigIa({ IA_PROVEEDOR: 'vertex-claude', IA_VERTEX_PROYECTO: 'p' });
  assert.strictEqual(vertex.modeloFoto, 'claude-haiku-5-5');
  assert.strictEqual(vertex.modeloCoach, 'claude-haiku-5-5');

  const elegido = leerConfigIa({ IA_PROVEEDOR: 'claude', ANTHROPIC_API_KEY: 'x', IA_MODELO_COACH: 'claude-opus-5-5' });
  assert.strictEqual(elegido.modeloFoto, 'claude-haiku-5-5');
  assert.strictEqual(elegido.modeloCoach, 'claude-opus-5-5');
});

test('Claude sin reintento con otro modelo: un solo cliente, sin middleware de respaldo', () => {
  const clientePara = crearClientesClaude({ clave: 'x', vertex: null });
  const cliente = clientePara('claude-opus-5-5');
  assert.strictEqual(clientePara('claude-haiku-5-5'), cliente);
  assert.deepStrictEqual(cliente.middleware, []);
});

test('claude sin ANTHROPIC_API_KEY queda apagado sin romper', () => {
  const c = leerConfigIa({ IA_PROVEEDOR: 'claude' });
  assert.strictEqual(c.proveedor, null);
  assert.match(c.motivo, /ANTHROPIC_API_KEY/);
});

test('los proveedores con clave no se aceptan en producción', () => {
  assert.throws(() => leerConfigIa({ IA_PROVEEDOR: 'gemini', GEMINI_API_KEY: 'x' }, { esProduccion: true }));
});

test('Vertex: sin claves, con proyecto obligatorio y región global por defecto', () => {
  assert.throws(() => leerConfigIa({ IA_PROVEEDOR: 'vertex-claude' }), /IA_VERTEX_PROYECTO/);
  const c = leerConfigIa({ IA_PROVEEDOR: 'vertex-claude', IA_VERTEX_PROYECTO: 'p' }, { esProduccion: true });
  assert.strictEqual(c.familia, 'claude');
  assert.deepStrictEqual(c.vertex, { proyecto: 'p', region: 'global' });
  assert.strictEqual(c.clave, null);
});

test('proveedor desconocido o límites inválidos: la API no arranca', () => {
  assert.throws(() => leerConfigIa({ IA_PROVEEDOR: 'otro' }));
  assert.throws(() => leerConfigIa({ IA_LIMITE_FOTOS_DIA: '0' }));
  assert.throws(() => leerConfigIa({ IA_LIMITE_MENSAJES_DIA: 'muchos' }));
  assert.deepStrictEqual(leerConfigIa({ IA_LIMITE_FOTOS_DIA: '3' }).limitesDiarios, {
    fotos: 3,
    mensajes: 30,
    consejos: 2,
  });
  assert.strictEqual(leerConfigIa({ IA_LIMITE_CONSEJOS_DIA: '5' }).limitesDiarios.consejos, 5);
  assert.throws(() => leerConfigIa({ IA_LIMITE_CONSEJOS_DIA: '0' }), /IA_LIMITE_CONSEJOS_DIA/);
});

test('crearProveedor: null si está apagada; arma el pedido sin conectarse', () => {
  assert.strictEqual(crearProveedor(leerConfigIa({})), null);
  const gemini = crearProveedor(leerConfigIa({ IA_PROVEEDOR: 'gemini', GEMINI_API_KEY: 'x' }));
  assert.strictEqual(gemini.nombre, 'gemini');
  const claude = crearProveedor(leerConfigIa({ IA_PROVEEDOR: 'claude', ANTHROPIC_API_KEY: 'x' }));
  assert.strictEqual(claude.nombre, 'claude');
});

// ── Prompts ──

test('el prompt de la foto pide comida argentina, porciones conservadoras y no inventar', () => {
  assert.match(SISTEMA_FOTO, /milanesa/);
  assert.match(SISTEMA_FOTO, /empanada/);
  assert.match(SISTEMA_FOTO, /conservadoras/);
  assert.match(SISTEMA_FOTO, /No agregues nada que no se vea/);
  assert.strictEqual(textoFoto('almuerzo'), 'Estimá qué hay en esta foto y cuánto. Es el almuerzo.');
  assert.strictEqual(textoFoto(null), 'Estimá qué hay en esta foto y cuánto.');
});

test('el prompt del coach tiene los mínimos de kcal y la derivación a un profesional', () => {
  assert.deepStrictEqual(MINIMO_KCAL, { hombre: 1500, mujer: 1200 });
  assert.match(SISTEMA_COACH, /1500 kcal por día a un hombre/);
  assert.match(SISTEMA_COACH, /1200 kcal a una mujer/);
  assert.match(SISTEMA_COACH, /déficits extremos/);
  assert.match(SISTEMA_COACH, /consultar a un profesional/);
  assert.match(SISTEMA_COACH, /rioplatense/);
});

test('diaDeSemana: el día de una fecha AAAA-MM-DD, o null si no existe', () => {
  assert.strictEqual(diaDeSemana('2026-11-21'), 'sábado');
  assert.strictEqual(diaDeSemana('2026-11-23'), 'lunes');
  assert.strictEqual(diaDeSemana('2024-02-29'), 'jueves');
  for (const mala of ['2026-02-30', '2026-13-01', '21/11/2026', '', undefined]) {
    assert.strictEqual(diaDeSemana(mala), null);
  }
});

test('el contexto del coach suma el día de la semana a hoy', () => {
  const datos = (texto) => JSON.parse(texto.slice(texto.indexOf('\n') + 1));
  assert.deepStrictEqual(datos(contextoCoach({ hoy: '2026-11-26', perfil: {} })), {
    hoy: '2026-11-26',
    perfil: {},
    diaHoy: 'jueves',
    equiposDisponibles: 'todos',
  });
  assert.strictEqual(datos(contextoCoach({ hoy: '2026-02-30' })).diaHoy, undefined);
});

test('el contexto del coach suma el día de la semana a cada día de ultimos7Dias', () => {
  const datos = (texto) => JSON.parse(texto.slice(texto.indexOf('{')));
  const r = datos(
    contextoCoach({
      perfil: { sexo: 'hombre' },
      ultimos7Dias: [
        { fecha: '2026-11-21', kcal: 2150 },
        { fecha: '2026-11-22', kcal: 1980, pasos: 3900 },
      ],
    }),
  );
  assert.deepStrictEqual(r.ultimos7Dias, [
    { fecha: '2026-11-21', dia: 'sábado', kcal: 2150 },
    { fecha: '2026-11-22', dia: 'domingo', kcal: 1980, pasos: 3900 },
  ]);
  assert.deepStrictEqual(r.perfil, { sexo: 'hombre' });
  // Sin ultimos7Dias el contexto va igual.
  assert.deepStrictEqual(datos(contextoCoach({ perfil: {} })), { perfil: {}, equiposDisponibles: 'todos' });
});

test('el contexto del coach dice qué equipos hay donde entrena', () => {
  const equipos = (lugar) => {
    const texto = contextoCoach({ perfil: lugar ? { lugar } : {} });
    return JSON.parse(texto.slice(texto.indexOf('{'))).equiposDisponibles;
  };
  assert.strictEqual(equipos('gym'), 'todos');
  assert.deepStrictEqual(equipos('casa-mancuernas'), ['mancuernas', 'peso-corporal', 'bandas']);
  assert.deepStrictEqual(equipos('peso-corporal'), ['peso-corporal', 'bandas']);
  // Perfiles de antes, sin lugar: gym completo.
  assert.strictEqual(equipos(null), 'todos');
});

test('el prompt del coach ajusta por nivel y pide nivel y lugar si faltan', () => {
  assert.match(SISTEMA_COACH, /principiante: 4 o 5 ejercicios por día, nunca más/);
  assert.match(SISTEMA_COACH, /de 2 a 3 series por ejercicio/);
  assert.match(SISTEMA_COACH, /no lleve las series al fallo/);
  assert.match(SISTEMA_COACH, /más de 10 series semanales por cada músculo grande/);
  assert.match(SISTEMA_COACH, /al menos 2 veces por semana/);
  assert.match(SISTEMA_COACH, /cerca del fallo/);
  assert.match(SISTEMA_COACH, /Si el perfil no trae "nivel" o "lugar"/);
  assert.match(SISTEMA_COACH, /Usá únicamente ejercicios con esos equipos/);
});

test('el prompt del coach: sin cifras fuera del manual o del contexto; alimentos con peso crudo o cocido', () => {
  assert.match(SISTEMA_COACH, /Esos salen del manual o del contexto/);
  assert.match(SISTEMA_COACH, /si el peso es crudo o cocido/);
});

test('el prompt del coach: el aviso de salud solo cuando la pregunta lo amerita', () => {
  assert.match(
    SISTEMA_COACH,
    /El aviso de consultar a un profesional va solo si la pregunta toca suplementos, una dieta restrictiva .*, dolor o una lesión, o medicación/,
  );
  assert.match(SISTEMA_COACH, /no agregues avisos genéricos/);
});

test('el prompt del coach: no pregunta datos que ya están en el perfil', () => {
  assert.match(SISTEMA_COACH, /No preguntes datos que ya están en el perfil/);
  assert.match(SISTEMA_COACH, /no preguntes si la prioridad es bajar grasa o ganar músculo/);
});

test('el prompt del coach: si el usuario dice cuánto duran sus sesiones, lo comenta', () => {
  assert.match(SISTEMA_COACH, /Si el usuario menciona cuánto duran sus sesiones/);
  assert.match(SISTEMA_COACH, /comentalo en la misma respuesta/);
  assert.match(SISTEMA_COACH, /No inventes una duración ideal/);
});

test('el prompt del coach: suplementos sin dosis personalizadas, menores derivados y el manual primero', () => {
  assert.match(SISTEMA_COACH, /No des dosis personalizadas/);
  assert.match(SISTEMA_COACH, /menor de 18 años/);
  assert.match(SISTEMA_COACH, /embarazo, la lactancia o una medicación/);
  assert.match(SISTEMA_COACH, /priorizá el manual/);
  assert.match(SISTEMA_COACH, /nombrá la fuente/);
  assert.match(MANUAL_COACH, /^# Manual del coach de UnaMás/);
});

test('el historial para la IA arranca con un mensaje del usuario', () => {
  assert.deepStrictEqual(historialDesdeUsuario(mensajes), mensajes.slice(1));
  assert.deepStrictEqual(historialDesdeUsuario([{ rol: 'coach', texto: 'hola' }]), []);
});

// ── Gemini ──

function clienteGemini(respuesta) {
  const pedidos = [];
  return {
    pedidos,
    models: {
      generateContent: async (pedido) => {
        pedidos.push(pedido);
        return respuesta;
      },
    },
  };
}

const respuestaGemini = (texto, finishReason = 'STOP') => ({
  candidates: [{ finishReason }],
  text: texto,
  usageMetadata: {
    promptTokenCount: 1000,
    cachedContentTokenCount: 600,
    candidatesTokenCount: 200,
    thoughtsTokenCount: 50,
  },
});

test('Gemini: manda la foto con el prompt y lee JSON y tokens (con los de razonamiento)', async () => {
  const cliente = clienteGemini(respuestaGemini('{"items":[]}'));
  const ia = crearProveedorGemini({ cliente, modeloFoto: 'm-foto', modeloCoach: 'm-coach' });
  const r = await ia.analizarFoto(imagen, { comida: 'cena' });
  assert.deepStrictEqual(r, {
    datos: { items: [] },
    uso: { entrada: 1000, cacheLectura: 600, cacheEscritura: 0, salida: 250 },
    modelo: 'm-foto',
  });

  const [pedido] = cliente.pedidos;
  assert.strictEqual(pedido.model, 'm-foto');
  assert.strictEqual(pedido.config.systemInstruction, SISTEMA_FOTO);
  assert.strictEqual(pedido.config.responseMimeType, 'application/json');
  assert.strictEqual(pedido.config.responseJsonSchema.type, 'object');
  assert.strictEqual(pedido.config.responseJsonSchema.$schema, undefined);
  const [foto, texto] = pedido.contents[0].parts;
  assert.deepStrictEqual(foto, { inlineData: { mimeType: 'image/jpeg', data: imagen.toString('base64') } });
  assert.strictEqual(texto.text, textoFoto('cena'));
});

test('Gemini: el coach manda el historial con roles user/model y el contexto en las instrucciones', async () => {
  const cliente = clienteGemini(respuestaGemini('{"texto":"Dale","acciones":[]}'));
  const ia = crearProveedorGemini({ cliente, modeloFoto: 'm-foto', modeloCoach: 'm-coach' });
  const r = await ia.responderCoach(mensajes, contexto);
  assert.deepStrictEqual(r.datos, { texto: 'Dale', acciones: [] });

  const [pedido] = cliente.pedidos;
  assert.strictEqual(pedido.model, 'm-coach');
  assert.deepStrictEqual(
    pedido.contents.map((c) => c.role),
    ['user', 'model', 'user'],
  );
  // Lo fijo primero (instrucciones, manual y catálogo) y el contexto al final.
  const sistema = pedido.config.systemInstruction;
  assert.ok(sistema.startsWith(`${SISTEMA_COACH}\n\n${MANUAL_COACH}\n\n${TEXTO_CATALOGO}\n\n`));
  assert.ok(sistema.endsWith(contextoCoach(contexto)));
});

test('Gemini: bloqueo, respuesta cortada o JSON inválido son ErrorIa', async () => {
  const casos = [
    [respuestaGemini('', 'SAFETY'), 'rechazo'],
    [{ candidates: [] }, 'rechazo'],
    [respuestaGemini('{"items":', 'MAX_TOKENS'), 'incompleta'],
    [respuestaGemini('no es json'), 'formato'],
  ];
  for (const [respuesta, tipo] of casos) {
    const ia = crearProveedorGemini({ cliente: clienteGemini(respuesta), modeloFoto: 'm', modeloCoach: 'm' });
    await assert.rejects(ia.analizarFoto(imagen), (e) => e instanceof ErrorIa && e.tipo === tipo);
  }
});

// ── Claude ──

function clientesClaude(respuesta) {
  const pedidos = [];
  const clientePara = (modelo) => ({
    messages: {
      parse: async (pedido) => {
        pedidos.push({ cliente: modelo, ...pedido });
        return respuesta;
      },
    },
  });
  return { pedidos, clientePara };
}

const respuestaClaude = (parsed_output, stop_reason = 'end_turn') => ({
  model: 'claude-x',
  stop_reason,
  parsed_output,
  usage: { input_tokens: 800, cache_read_input_tokens: 200, cache_creation_input_tokens: 100, output_tokens: 300 },
});

test('Claude: manda la foto en base64 con salida estructurada y lee tokens', async () => {
  const { pedidos, clientePara } = clientesClaude(respuestaClaude({ items: [] }));
  const ia = crearProveedorClaude({ clientePara, modeloFoto: 'm-foto', modeloCoach: 'm-coach' });
  const r = await ia.analizarFoto(imagen, { comida: 'desayuno' });
  assert.deepStrictEqual(r, {
    datos: { items: [] },
    uso: { entrada: 1100, cacheLectura: 200, cacheEscritura: 100, salida: 300 },
    modelo: 'claude-x',
  });

  const [pedido] = pedidos;
  assert.strictEqual(pedido.cliente, 'm-foto');
  assert.strictEqual(pedido.model, 'm-foto');
  assert.strictEqual(pedido.system, SISTEMA_FOTO);
  assert.ok(pedido.output_config.format);
  const [foto, texto] = pedido.messages[0].content;
  assert.deepStrictEqual(foto.source, { type: 'base64', media_type: 'image/jpeg', data: imagen.toString('base64') });
  assert.strictEqual(texto.text, textoFoto('desayuno'));
});

test('Claude: el coach manda el historial, el manual cacheado y el contexto aparte', async () => {
  const { pedidos, clientePara } = clientesClaude(respuestaClaude({ texto: 'Dale', acciones: [] }));
  const ia = crearProveedorClaude({ clientePara, modeloFoto: 'm-foto', modeloCoach: 'm-coach' });
  await ia.responderCoach(mensajes, contexto);
  const [pedido] = pedidos;
  assert.deepStrictEqual(
    pedido.messages.map((m) => m.role),
    ['user', 'assistant', 'user'],
  );
  // Un solo punto de caché, al final del catálogo: cubre instrucciones, manual y catálogo.
  assert.deepStrictEqual(pedido.system.slice(0, 3), [
    { type: 'text', text: SISTEMA_COACH },
    { type: 'text', text: MANUAL_COACH },
    { type: 'text', text: TEXTO_CATALOGO, cache_control: { type: 'ephemeral' } },
  ]);
  // El contexto va después del punto de caché y sin cache_control: cambia en cada pedido.
  assert.strictEqual(pedido.system.length, 4);
  assert.ok(pedido.system[3].text.includes('"Piernas"'));
  assert.strictEqual(pedido.system[3].cache_control, undefined);
});

test('Claude: rechazo, respuesta cortada o sin JSON son ErrorIa', async () => {
  const casos = [
    [respuestaClaude(null, 'refusal'), 'rechazo'],
    [respuestaClaude(null, 'max_tokens'), 'incompleta'],
    [respuestaClaude(null), 'formato'],
  ];
  for (const [respuesta, tipo] of casos) {
    const { clientePara } = clientesClaude(respuesta);
    const ia = crearProveedorClaude({ clientePara, modeloFoto: 'm', modeloCoach: 'm' });
    await assert.rejects(ia.analizarFoto(imagen), (e) => e instanceof ErrorIa && e.tipo === tipo);
  }
});
