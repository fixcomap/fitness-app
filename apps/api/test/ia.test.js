// Capa de IA con clientes falsos: no se llama a ninguna IA real.
const test = require('node:test');
const assert = require('node:assert');
const { leerConfigIa, MODELOS_POR_DEFECTO } = require('../src/ia/config');
const { crearProveedor } = require('../src/ia');
const { crearProveedorGemini } = require('../src/ia/gemini');
const { crearClientesClaude, crearProveedorClaude } = require('../src/ia/claude');
const { ErrorIa, historialDesdeUsuario } = require('../src/ia/proveedor');
const { MINIMO_KCAL, SISTEMA_COACH, SISTEMA_FOTO, textoFoto } = require('../src/ia/prompts');

const imagen = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const contexto = { perfil: { sexo: 'mujer' }, catalogo: [{ id: 'sentadilla', nombre: 'Sentadilla' }] };
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
  assert.deepStrictEqual(c.limitesDiarios, { fotos: 10, mensajes: 30 });
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
  assert.deepStrictEqual(leerConfigIa({ IA_LIMITE_FOTOS_DIA: '3' }).limitesDiarios, { fotos: 3, mensajes: 30 });
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
  usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 50 },
});

test('Gemini: manda la foto con el prompt y lee JSON y tokens (con los de razonamiento)', async () => {
  const cliente = clienteGemini(respuestaGemini('{"items":[]}'));
  const ia = crearProveedorGemini({ cliente, modeloFoto: 'm-foto', modeloCoach: 'm-coach' });
  const r = await ia.analizarFoto(imagen, { comida: 'cena' });
  assert.deepStrictEqual(r, { datos: { items: [] }, uso: { entrada: 1000, salida: 250 }, modelo: 'm-foto' });

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
  const cliente = clienteGemini(respuestaGemini('{"texto":"Dale","rutinas":[]}'));
  const ia = crearProveedorGemini({ cliente, modeloFoto: 'm-foto', modeloCoach: 'm-coach' });
  const r = await ia.responderCoach(mensajes, contexto);
  assert.deepStrictEqual(r.datos, { texto: 'Dale', rutinas: [] });

  const [pedido] = cliente.pedidos;
  assert.strictEqual(pedido.model, 'm-coach');
  assert.deepStrictEqual(
    pedido.contents.map((c) => c.role),
    ['user', 'model', 'user'],
  );
  assert.ok(pedido.config.systemInstruction.startsWith(SISTEMA_COACH));
  assert.ok(pedido.config.systemInstruction.includes('"sentadilla"'));
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
  usage: { input_tokens: 800, cache_read_input_tokens: 200, output_tokens: 300 },
});

test('Claude: manda la foto en base64 con salida estructurada y lee tokens', async () => {
  const { pedidos, clientePara } = clientesClaude(respuestaClaude({ items: [] }));
  const ia = crearProveedorClaude({ clientePara, modeloFoto: 'm-foto', modeloCoach: 'm-coach' });
  const r = await ia.analizarFoto(imagen, { comida: 'desayuno' });
  assert.deepStrictEqual(r, { datos: { items: [] }, uso: { entrada: 1000, salida: 300 }, modelo: 'claude-x' });

  const [pedido] = pedidos;
  assert.strictEqual(pedido.cliente, 'm-foto');
  assert.strictEqual(pedido.model, 'm-foto');
  assert.strictEqual(pedido.system, SISTEMA_FOTO);
  assert.ok(pedido.output_config.format);
  const [foto, texto] = pedido.messages[0].content;
  assert.deepStrictEqual(foto.source, { type: 'base64', media_type: 'image/jpeg', data: imagen.toString('base64') });
  assert.strictEqual(texto.text, textoFoto('desayuno'));
});

test('Claude: el coach manda el historial con roles user/assistant y el contexto aparte', async () => {
  const { pedidos, clientePara } = clientesClaude(respuestaClaude({ texto: 'Dale', rutinas: [] }));
  const ia = crearProveedorClaude({ clientePara, modeloFoto: 'm-foto', modeloCoach: 'm-coach' });
  await ia.responderCoach(mensajes, contexto);
  const [pedido] = pedidos;
  assert.deepStrictEqual(
    pedido.messages.map((m) => m.role),
    ['user', 'assistant', 'user'],
  );
  assert.strictEqual(pedido.system[0].text, SISTEMA_COACH);
  assert.ok(pedido.system[1].text.includes('"sentadilla"'));
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
