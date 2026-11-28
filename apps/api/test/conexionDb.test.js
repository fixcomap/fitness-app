// SSL de la conexión a la base según DATABASE_URL.
const test = require('node:test');
const assert = require('node:assert');
const ConnectionParameters = require('pg/lib/connection-parameters');
const { conexionDb } = require('../src/conexionDb');

const VERIFICADO = { rejectUnauthorized: true };

// El ssl con el que pg se conectaría de verdad (la URL puede pisar la opción).
const sslEfectivo = (url) => new ConnectionParameters(conexionDb(url)).ssl;

test('una base remota va con SSL verificado', () => {
  assert.deepStrictEqual(sslEfectivo('postgres://u:p@ep-algo.neon.tech/base'), VERIFICADO);
  assert.deepStrictEqual(sslEfectivo('postgresql://u:p@db.ejemplo.com:6543/base'), VERIFICADO);
});

test('localhost, 127.0.0.1, ::1 y socket van sin SSL', () => {
  for (const url of [
    'postgres://pruebas:pruebas@localhost:5432/pruebas',
    'postgres://u:p@LOCALHOST/base',
    'postgres://u:p@127.0.0.1:5432/base',
    'postgres://u:p@[::1]:5432/base',
    'postgres:///base?host=/var/run/postgresql',
  ]) {
    assert.strictEqual(sslEfectivo(url), false, url);
  }
});

test('sslmode=disable apaga el SSL aunque la base sea remota', () => {
  assert.strictEqual(sslEfectivo('postgres://u:p@ep-algo.neon.tech/base?sslmode=disable'), false);
  assert.strictEqual(sslEfectivo('postgres://pruebas:pruebas@localhost:5432/pruebas?sslmode=disable'), false);
});

test('sslmode=require (y verify-*) fuerza SSL verificado, también en local', () => {
  for (const modo of ['require', 'verify-ca', 'verify-full']) {
    assert.deepStrictEqual(sslEfectivo(`postgres://u:p@localhost/base?sslmode=${modo}`), VERIFICADO, modo);
    assert.deepStrictEqual(sslEfectivo(`postgres://u:p@ep-algo.neon.tech/base?sslmode=${modo}`), VERIFICADO, modo);
  }
});

test('se saca sslmode de la URL y se conservan los demás parámetros', () => {
  const { connectionString } = conexionDb(
    'postgres://u:p@ep-algo.neon.tech/base?sslmode=require&channel_binding=require',
  );
  const url = new URL(connectionString);
  assert.strictEqual(url.searchParams.has('sslmode'), false);
  assert.strictEqual(url.searchParams.get('channel_binding'), 'require');
  assert.strictEqual(url.hostname, 'ep-algo.neon.tech');
});
