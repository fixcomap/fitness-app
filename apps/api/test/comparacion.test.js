const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const precios = require('../scripts/precios-ia.json');
const {
  leerArgumentos,
  estaDentro,
  costoEstimado,
  formatoCosto,
  formatoTokens,
  resumir,
  lineasCoach,
  restarDias,
  contextoDeDiaConsejo,
} = require('../scripts/comparacion');

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

test('los tokens de caché se cobran a su precio (o al de entrada si el modelo no lo tiene)', () => {
  const precio = { entrada: 1, salida: 5, cacheLectura: 0.1, cacheEscritura: 1.25 };
  // 1M de entrada: 0,2M normales, 0,7M leídos y 0,1M escritos; 0,1M de salida.
  const uso = { entrada: 1_000_000, cacheLectura: 700_000, cacheEscritura: 100_000, salida: 100_000 };
  assert.ok(Math.abs(costoEstimado(uso, precio) - (0.2 + 0.07 + 0.125 + 0.5)) < 1e-12);
  assert.ok(Math.abs(costoEstimado(uso, { entrada: 1, salida: 5 }) - 1.5) < 1e-12);
  assert.strictEqual(
    formatoTokens({ entrada: 26166, cacheLectura: 24000, cacheEscritura: 0, salida: 698 }),
    '26166 de entrada (24000 leídos de caché, 0 escritos), 698 de salida',
  );
  assert.strictEqual(
    formatoTokens({ entrada: 10, salida: 2 }),
    '10 de entrada (0 leídos de caché, 0 escritos), 2 de salida',
  );
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
    // Si tiene precios de caché: leer es más barato que la entrada y escribir, más caro.
    if ('cacheLectura' in precio) assert.ok(precio.cacheLectura > 0 && precio.cacheLectura < precio.entrada, modelo);
    if ('cacheEscritura' in precio) assert.ok(precio.cacheEscritura > precio.entrada, modelo);
  }
  for (const modelo of ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']) {
    assert.ok(precios.modelos[modelo].cacheLectura && precios.modelos[modelo].cacheEscritura, modelo);
  }
  assert.ok(precios.modelos['claude-opus-5-5']);
  assert.ok(precios.modelos['gemini-3.8-flash']);
});

test('el script muestra las acciones con los nombres del catálogo y de las rutinas, y lo descartado por motivo', () => {
  const catalogo = [
    { id: 'press-banca', nombre: 'Press de banca' },
    { id: 'remo-barra', nombre: 'Remo con barra' },
  ];
  const rutinas = [{ id: 'r1', nombre: 'Piernas' }];
  const salida = {
    texto: 'Arrancamos.\nTres días.',
    acciones: [
      {
        id: 'a',
        tipo: 'crear_rutina',
        nombre: 'Empuje',
        dia: 0,
        ejercicios: [{ ejercicioId: 'press-banca', series: 4, rango: { min: 8, max: 10 } }],
      },
      {
        id: 'b',
        tipo: 'agregar_ejercicios',
        rutinaId: 'r1',
        ejercicios: [{ ejercicioId: 'remo-barra', series: 3, rango: { min: 6, max: 10 } }],
      },
      { id: 'c', tipo: 'quitar_ejercicios', rutinaId: 'r1', ejercicioIds: ['press-banca'] },
      { id: 'd', tipo: 'borrar_rutinas', rutinaIds: ['r1', 'r9'] },
      {
        id: 'e',
        tipo: 'registrar_comida',
        dia: '2026-11-26',
        comida: 'cena',
        items: [
          {
            busqueda: 'empanada de carne',
            estado: 'cocido',
            estadoAsumido: true,
            cantidad: { unidades: 2, porcion: 'empanada', gramosPorUnidad: 90 },
            estimado: { kcal: 300, proteinas: 11, carbos: 28, grasas: 16 },
          },
          {
            busqueda: 'manzana',
            estado: 'no-aplica',
            estadoAsumido: false,
            cantidad: { gramos: 150 },
            estimado: { kcal: 52, proteinas: 0.3, carbos: 14, grasas: 0.2 },
          },
        ],
      },
      { id: 'f', tipo: 'cargar_pasos', dia: '2026-11-25', unidad: 'km', valor: 2.5, hora: '18:30' },
      { id: 'g', tipo: 'crear_rutina', nombre: 'Tirón', dia: null, ejercicios: [] },
    ],
    descartados: [
      { accion: 'crear_rutina', rutina: 'Tirón', ejercicioId: 'jalon-inventado', motivo: 'no-existe' },
      { accion: 'crear_rutina', rutina: 'Empuje', ejercicioId: 'fondos-inventado', motivo: 'no-existe' },
      { accion: 'borrar_rutinas', rutinaId: 'r7', motivo: 'no-existe-rutina' },
      { accion: 'registrar_comida', dia: '2026-11-27', motivo: 'fecha-no-permitida' },
      { accion: 'mandar_mail', motivo: 'invalida' },
    ],
  };
  assert.deepStrictEqual(lineasCoach(salida, catalogo, rutinas), [
    '│ Arrancamos.',
    '│ Tres días.',
    'Crear rutina "Empuje" (lunes):',
    '  Press de banca [press-banca]: 4 × 8-10',
    'Agregar a "Piernas":',
    '  Remo con barra [remo-barra]: 3 × 6-10',
    'Quitar de "Piernas": Press de banca',
    'Borrar rutinas: "Piernas", r9',
    'Registrar cena del 2026-11-26:',
    '  empanada de carne (cocido, asumido): 2 × empanada ~90 g c/u · estimado c/100 g: 300 kcal, P 11 C 28 G 16',
    '  manzana: 150 g · estimado c/100 g: 52 kcal, P 0.3 C 14 G 0.2',
    'Cargar pasos del 2026-11-25: 2.5 km (18:30)',
    'Crear rutina "Tirón" (sin día):',
    'Descartados, acciones mal formadas: mandar_mail',
    'Descartados, no existen en el catálogo: jalon-inventado (Tirón), fondos-inventado (Empuje)',
    'Descartados, rutinas que no existen: r7 (borrar_rutinas)',
    'Descartados, fecha fuera de los últimos 7 días: 2026-11-27 (registrar_comida)',
  ]);
});

test('--solo consejo no pide carpeta de fotos', () => {
  assert.strictEqual(leerArgumentos(['--con', 'claude:m', '--solo', 'consejo']).solo, 'consejo');
});

test('restarDias cruza meses', () => {
  assert.strictEqual(restarDias('2026-12-02', 6), '2026-11-26');
});

test('contextoDeDiaConsejo: semana que termina en el día de prueba, con los días ya corridos', () => {
  const base = {
    hoy: '2026-11-26',
    perfil: { pesoKg: 78 },
    ultimos7Dias: ['20', '21', '22', '23', '24', '25', '26'].map((d) => ({ fecha: `2026-11-${d}`, kcal: 1 })),
    rutinas: [],
  };
  const corrido = { fecha: '2026-11-26', kcal: 2 };
  const c = contextoDeDiaConsejo(
    base,
    { metaPasos: 10000 },
    { hoy: '2026-11-27', dia: { fecha: '2026-11-27', kcal: 3 } },
    [corrido],
  );
  assert.strictEqual(c.hoy, '2026-11-27');
  assert.deepStrictEqual(c.perfil, { pesoKg: 78, metaPasos: 10000 });
  assert.deepStrictEqual(
    c.ultimos7Dias.map((d) => [d.fecha.slice(8), d.kcal]),
    [
      ['21', 1],
      ['22', 1],
      ['23', 1],
      ['24', 1],
      ['25', 1],
      ['26', 2],
      ['27', 3],
    ],
  );
});
