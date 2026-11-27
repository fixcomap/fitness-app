// Proveedor de IA falso (IA_PROVEEDOR=falso): solo para desarrollo.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { leerConfigIa } = require('../src/ia/config');
const { crearProveedor } = require('../src/ia');
const { crearProveedorFalso, respuestaCoach } = require('../src/ia/falso');
const { leerRespuestaCoach } = require('../src/ia/acciones');
const { leerResultadoFoto } = require('../src/ia/foto');
const { DISPOSITIVO, usoEnMemoria, conApp } = require('./ayudas');

const contexto = {
  hoy: '2026-11-26',
  perfil: { objetivo: 'hipertrofia' },
  rutinas: [
    {
      id: 'r1',
      nombre: 'Empuje',
      dias: [0],
      ejercicios: [
        { ejercicioId: 'press-banca-barra', series: 4, rango: { min: 6, max: 10 } },
        { ejercicioId: 'press-militar-mancuernas', series: 3, rango: { min: 6, max: 10 } },
      ],
    },
    {
      id: 'r2',
      nombre: 'Piernas',
      dias: [4],
      ejercicios: [{ ejercicioId: 'sentadilla-barra', series: 4, rango: { min: 6, max: 10 } }],
    },
  ],
};
const pedir = (texto, ctx = contexto) => respuestaCoach([{ rol: 'usuario', texto }], ctx);

test('IA_PROVEEDOR=falso anda en desarrollo y no en producción', () => {
  const c = leerConfigIa({ IA_PROVEEDOR: 'falso' });
  assert.strictEqual(c.proveedor, 'falso');
  assert.strictEqual(c.familia, 'falso');
  assert.strictEqual(crearProveedor(c).nombre, 'falso');
  assert.throws(() => leerConfigIa({ IA_PROVEEDOR: 'falso' }, { esProduccion: true }), /solo para desarrollo/);
});

test('la API no arranca con IA_PROVEEDOR=falso y NODE_ENV=production', () => {
  // Un proceso aparte que carga la configuración como al arrancar, con lo mínimo de producción.
  const arrancar = (ia) =>
    spawnSync(process.execPath, ['-e', "require('./src/config')"], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      env: {
        ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
        NODE_ENV: 'production',
        API_URL: 'https://api.ejemplo',
        DATABASE_URL: 'postgres://usuario@ejemplo/base',
        ...ia,
      },
    });
  const falso = arrancar({ IA_PROVEEDOR: 'falso' });
  assert.notStrictEqual(falso.status, 0);
  assert.match(falso.stderr, /IA_PROVEEDOR=falso es solo para desarrollo/);
  // Con un proveedor de producción la misma configuración carga bien.
  assert.strictEqual(arrancar({ IA_PROVEEDOR: 'vertex-gemini', IA_VERTEX_PROYECTO: 'p' }).status, 0);
});

test('cada pedido de prueba da acciones que pasan la validación sin descartes', () => {
  const casos = [
    ['armame una rutina', ['crear_rutina', 'crear_rutina', 'crear_rutina']],
    ['agregá curl a mi rutina', ['agregar_ejercicios']],
    ['sacá un ejercicio', ['quitar_ejercicios']],
    ['borrá todas las rutinas', ['borrar_rutinas']],
    ['Comí 2 empanadas', ['registrar_comida']],
    ['caminé 3 km', ['cargar_pasos']],
    ['hola', []],
  ];
  for (const [texto, tipos] of casos) {
    const r = leerRespuestaCoach(pedir(texto), contexto);
    assert.deepStrictEqual(
      r.acciones.map((a) => a.tipo),
      tipos,
      texto,
    );
    assert.deepStrictEqual(r.descartados, [], texto);
  }
});

test('si el pedido es ambiguo pregunta, y sin rutinas lo dice', () => {
  const ambiguo = pedir('borrá la rutina');
  assert.deepStrictEqual(ambiguo.acciones, []);
  assert.match(ambiguo.texto, /¿Cuál querés borrar\? Tenés "Empuje", "Piernas"/);
  assert.deepStrictEqual(pedir('borrá la rutina', { ...contexto, rutinas: [] }).acciones, []);
  assert.deepStrictEqual(pedir('agregá curl', { ...contexto, rutinas: [] }).acciones, []);
});

test('la foto falsa es una milanesa con los valores de la base de la app y pasa la validación', async () => {
  const { datos } = await crearProveedorFalso().analizarFoto(Buffer.alloc(0), { comida: null });
  const r = leerResultadoFoto(datos);
  assert.strictEqual(r.items.length, 1);
  // 150 g de "Milanesa de carne frita" (238 kcal, 27,3 P, 9,9 C y 9,2 G cada 100 g).
  assert.deepStrictEqual(datos.items[0], {
    nombre: 'Milanesa de carne frita',
    gramos: 150,
    kcal: 357,
    proteinas: 41,
    carbos: 14.9,
    grasas: 13.8,
    confianza: 0.5,
  });
});

test('POST /coach con el proveedor falso', async () => {
  const cuerpo = {
    mensajes: [{ rol: 'usuario', texto: 'caminé 3 km' }],
    contexto: {
      ...contexto,
      perfil: {
        sexo: 'hombre',
        edad: 24,
        alturaCm: 180,
        pesoKg: 78,
        objetivoPeso: 'bajar',
        objetivo: 'hipertrofia',
        diasEntrenoPorSemana: 3,
      },
      ultimos7Dias: [],
    },
  };
  await conApp({ ia: crearProveedorFalso(), uso: usoEnMemoria() }, async (pedirHttp) => {
    const r = await pedirHttp('POST', '/coach', {
      headers: { 'X-Dispositivo': DISPOSITIVO, 'Content-Type': 'application/json' },
      cuerpo: JSON.stringify(cuerpo),
    });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(
      r.body.acciones.map(({ tipo, dia, unidad, valor }) => [tipo, dia, unidad, valor]),
      [['cargar_pasos', '2026-11-26', 'km', 3]],
    );
  });
});
