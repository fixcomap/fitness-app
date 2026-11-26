const test = require('node:test');
const assert = require('node:assert');
const { leerDispositivo, respuestaLimiteDiario, crearUsoDiario } = require('../src/uso');

const ID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';

test('el ID de dispositivo tiene que ser un UUID', () => {
  assert.strictEqual(leerDispositivo(ID), ID);
  assert.strictEqual(leerDispositivo(` ${ID.toUpperCase()} `), ID);
  assert.strictEqual(leerDispositivo(undefined), null);
  assert.strictEqual(leerDispositivo(''), null);
  assert.strictEqual(leerDispositivo('mi-celu'), null);
  assert.strictEqual(leerDispositivo(`${ID}' OR 1=1`), null);
});

test('al llegar al límite: mensaje claro y cuántos quedan mañana', () => {
  assert.deepStrictEqual(respuestaLimiteDiario('fotos', 10), {
    error: 'Llegaste al límite de 10 fotos por hoy. Mañana tenés 10 fotos de nuevo.',
    limite: 10,
    quedanHoy: 0,
    quedanManana: 10,
  });
  assert.match(respuestaLimiteDiario('mensajes', 1).error, /límite de 1 mensaje por hoy/);
});

// Pool falso: guarda las consultas y responde con las filas que se le pasen.
function poolFalso(filas) {
  const consultas = [];
  return {
    consultas,
    query: async (sql, params) => {
      consultas.push({ sql, params });
      return { rows: sql.startsWith('INSERT INTO uso_diario') ? filas : [] };
    },
  };
}

test('consumir: crea el usuario si no existe y suma uno solo si no pasó el límite', async () => {
  const pool = poolFalso([{ usados: 3 }]);
  const r = await crearUsoDiario(pool).consumir(ID, 'fotos', 10);
  assert.deepStrictEqual(r, { permitido: true, usados: 3 });

  const [usuario, uso] = pool.consultas;
  assert.match(usuario.sql, /INSERT INTO usuarios .* ON CONFLICT DO NOTHING/);
  assert.deepStrictEqual(usuario.params, [ID]);
  assert.match(uso.sql, /SET fotos = uso_diario\.fotos \+ 1\s+WHERE uso_diario\.fotos < \$2/);
  assert.match(uso.sql, /America\/Argentina\/Buenos_Aires/);
  assert.deepStrictEqual(uso.params, [ID, 10]);
});

test('consumir: sin fila devuelta es que ya llegó al límite', async () => {
  const r = await crearUsoDiario(poolFalso([])).consumir(ID, 'mensajes', 30);
  assert.deepStrictEqual(r, { permitido: false, usados: 30 });
});

test('devolver resta uno sin bajar de cero', async () => {
  const pool = poolFalso([]);
  await crearUsoDiario(pool).devolver(ID, 'mensajes');
  assert.match(pool.consultas[0].sql, /SET mensajes = mensajes - 1 .* AND mensajes > 0/);
});

test('un tipo de uso desconocido no llega al SQL', async () => {
  const pool = poolFalso([]);
  await assert.rejects(crearUsoDiario(pool).consumir(ID, 'fotos = 0; --', 10));
  assert.strictEqual(pool.consultas.length, 0);
});
