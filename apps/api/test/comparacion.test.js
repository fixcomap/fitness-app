const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const precios = require('../scripts/precios-ia.json');
const { leerArgumentos, estaDentro, costoEstimado, formatoCosto, resumir } = require('../scripts/comparacion');

test('lee la carpeta, los candidatos y --solo', () => {
  assert.deepStrictEqual(
    leerArgumentos([
      '/fotos',
      '--con',
      'gemini:gemini-3.8-flash',
      '--con',
      'claude:claude-opus-5-5',
      '--solo',
      'fotos',
    ]),
    {
      carpeta: '/fotos',
      candidatos: [
        { proveedor: 'gemini', modelo: 'gemini-3.8-flash' },
        { proveedor: 'claude', modelo: 'claude-opus-5-5' },
      ],
      solo: 'fotos',
    },
  );
  assert.strictEqual(leerArgumentos(['--con', 'gemini:x', '--solo', 'coach']).carpeta, null);
});

test('argumentos inválidos dan un error', () => {
  const casos = [
    [],
    ['/fotos'],
    ['--con', 'gemini:m'],
    ['/fotos', '--con', 'gemini'],
    ['/fotos', '--con', 'gemini:'],
    ['/fotos', '--con', 'gemini:m', '--solo', 'todo'],
    ['/fotos', '/otra', '--con', 'gemini:m'],
    ['/fotos', '--con', 'gemini:m', '--rapido'],
  ];
  for (const argv of casos) assert.ok(leerArgumentos(argv).error, argv.join(' '));
});

test('detecta si la carpeta de fotos está dentro del repo', () => {
  const raiz = path.resolve('/repo');
  assert.strictEqual(estaDentro(path.join(raiz, 'fotos'), raiz), true);
  assert.strictEqual(estaDentro(raiz, raiz), true);
  assert.strictEqual(estaDentro(path.resolve('/repo-fotos'), raiz), false);
  assert.strictEqual(estaDentro(path.resolve('/otra/fotos'), raiz), false);
});

test('costo = tokens × precio por millón', () => {
  assert.strictEqual(costoEstimado({ entrada: 1_000_000, salida: 0 }, { entrada: 4, salida: 20 }), 4);
  assert.strictEqual(costoEstimado({ entrada: 2000, salida: 500 }, { entrada: 4, salida: 20 }), 0.018);
  assert.strictEqual(costoEstimado({ entrada: 2000, salida: 500 }, undefined), null);
  assert.strictEqual(formatoCosto(0.018), 'US$ 0.01800');
  assert.strictEqual(formatoCosto(null), 'sin precio');
});

test('el resumen promedia el tiempo de los que salieron y suma el costo', () => {
  const r = resumir([
    { ms: 1000, costo: 0.01 },
    { ms: 3000, costo: 0.02 },
    { ms: 500, error: 'timeout' },
  ]);
  assert.strictEqual(r.pedidos, 3);
  assert.strictEqual(r.errores, 1);
  assert.strictEqual(r.msPromedio, 2000);
  assert.ok(Math.abs(r.costoTotal - 0.03) < 1e-12);
  assert.strictEqual(resumir([{ ms: 1, costo: null }]).costoTotal, null);
});

test('precios-ia.json: cada modelo tiene precio de entrada y de salida', () => {
  for (const [modelo, precio] of Object.entries(precios.modelos)) {
    assert.ok(precio.entrada > 0 && precio.salida > 0, modelo);
  }
  assert.ok(precios.modelos['claude-opus-5-5']);
  assert.ok(precios.modelos['gemini-3.8-flash']);
});
