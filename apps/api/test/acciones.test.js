// Acciones del coach validadas contra el contexto del pedido y el catálogo.
const test = require('node:test');
const assert = require('node:assert');
const {
  MAXIMO_ACCIONES,
  MAXIMO_PASOS,
  restarDias,
  diaPermitido,
  pideTodo,
  limpiarAcciones,
  leerRespuestaCoach,
} = require('../src/ia/acciones');
const { ErrorIa } = require('../src/ia/proveedor');

const catalogo = [
  { id: 'press-banca-barra', nombre: 'Press de banca con barra', equipo: 'barra', tipo: 'compuesto' },
  { id: 'remo-barra', nombre: 'Remo con barra', equipo: 'barra', tipo: 'compuesto' },
  { id: 'curl-barra', nombre: 'Curl de bíceps con barra', equipo: 'barra', tipo: 'aislamiento' },
  { id: 'dominadas', nombre: 'Dominadas', equipo: 'peso-corporal', tipo: 'compuesto' },
  { id: 'sentadilla-barra', nombre: 'Sentadilla con barra', equipo: 'barra', tipo: 'compuesto' },
];

const contexto = {
  hoy: '2026-11-26',
  perfil: { objetivo: 'hipertrofia' },
  rutinas: [
    {
      id: 'r-empuje',
      nombre: 'Empuje',
      dias: [0],
      ejercicios: [{ ejercicioId: 'press-banca-barra', series: 4, rango: { min: 6, max: 10 } }],
    },
    {
      id: 'r-piernas',
      nombre: 'Piernas',
      dias: [4],
      ejercicios: [
        { ejercicioId: 'sentadilla-barra', series: 4, rango: { min: 6, max: 10 } },
        { ejercicioId: 'curl-barra', series: 3, rango: { min: 10, max: 15 } },
      ],
    },
  ],
};

// Ids previsibles: a1, a2…
const ids = () => {
  let n = 0;
  return () => `a${++n}`;
};
const limpiar = (lista, ctx = contexto) => limpiarAcciones(lista, ctx, { catalogo, crearId: ids() });

const pechuga = {
  busqueda: 'pechuga a la plancha',
  estado: 'cocido',
  cantidad: { gramos: 150 },
  estimado: { kcal: 165, proteinas: 31, carbos: 0, grasas: 3.6 },
};

test('restarDias y diaPermitido: hoy y los 6 días anteriores, nunca futuros', () => {
  assert.strictEqual(restarDias('2026-11-26', 6), '2026-11-20');
  assert.strictEqual(restarDias('2026-03-02', 6), '2026-02-24');
  assert.strictEqual(restarDias('2027-01-03', 6), '2026-12-28');
  assert.strictEqual(diaPermitido('2026-11-26', '2026-11-26'), true);
  assert.strictEqual(diaPermitido('2026-11-20', '2026-11-26'), true);
  assert.strictEqual(diaPermitido('2026-11-19', '2026-11-26'), false);
  assert.strictEqual(diaPermitido('2026-11-27', '2026-11-26'), false);
});

test('crear_rutina: ejercicios del catálogo con el rango de la app y el día pedido', () => {
  const r = limpiar([
    {
      tipo: 'crear_rutina',
      nombre: 'Tirón',
      dia: 2,
      ejercicios: [
        { ejercicioId: 'remo-barra', series: 4 },
        { ejercicioId: 'dominadas', series: 3 },
        { ejercicioId: 'curl-barra', series: 3 },
        { ejercicioId: 'jalon-inventado', series: 3 },
      ],
    },
  ]);
  assert.deepStrictEqual(r.acciones, [
    {
      id: 'a1',
      tipo: 'crear_rutina',
      nombre: 'Tirón',
      dia: 2,
      ejercicios: [
        { ejercicioId: 'remo-barra', series: 4, rango: { min: 6, max: 10 } },
        { ejercicioId: 'dominadas', series: 3, rango: { min: 8, max: 15 } },
        { ejercicioId: 'curl-barra', series: 3, rango: { min: 10, max: 15 } },
      ],
    },
  ]);
  assert.deepStrictEqual(r.descartados, [
    { accion: 'crear_rutina', rutina: 'Tirón', ejercicioId: 'jalon-inventado', motivo: 'no-existe' },
  ]);
});

test('crear_rutina: dos rutinas de la misma respuesta no comparten día; sin ejercicios válidos se descarta', () => {
  const r = limpiar([
    { tipo: 'crear_rutina', nombre: 'A', dia: 1, ejercicios: [{ ejercicioId: 'remo-barra', series: 3 }] },
    { tipo: 'crear_rutina', nombre: 'B', dia: 1, ejercicios: [{ ejercicioId: 'dominadas', series: 3 }] },
    { tipo: 'crear_rutina', nombre: 'C', dia: null, ejercicios: [{ ejercicioId: 'inventado', series: 3 }] },
  ]);
  assert.deepStrictEqual(
    r.acciones.map((a) => [a.nombre, a.dia]),
    [
      ['A', 1],
      ['B', null],
    ],
  );
  assert.deepStrictEqual(
    r.descartados.map((d) => d.motivo),
    ['no-existe', 'sin-ejercicios'],
  );
});

test('agregar_ejercicios: a una rutina que existe, sin repetir y con el rango de la app', () => {
  const r = limpiar([
    {
      tipo: 'agregar_ejercicios',
      rutinaId: 'r-empuje',
      ejercicios: [
        { ejercicioId: 'curl-barra', series: 3 },
        { ejercicioId: 'press-banca-barra', series: 3 },
        { ejercicioId: 'curl-barra', series: 2 },
        { ejercicioId: 'inventado', series: 3 },
        { ejercicioId: 'dominadas', series: 11 },
      ],
    },
    { tipo: 'agregar_ejercicios', rutinaId: 'r-no-existe', ejercicios: [{ ejercicioId: 'remo-barra', series: 3 }] },
  ]);
  assert.deepStrictEqual(r.acciones, [
    {
      id: 'a1',
      tipo: 'agregar_ejercicios',
      rutinaId: 'r-empuje',
      ejercicios: [{ ejercicioId: 'curl-barra', series: 3, rango: { min: 10, max: 15 } }],
    },
  ]);
  assert.deepStrictEqual(
    r.descartados.map((d) => [d.ejercicioId ?? d.rutinaId, d.motivo]),
    [
      ['press-banca-barra', 'repetido'],
      ['curl-barra', 'repetido'],
      ['inventado', 'no-existe'],
      ['dominadas', 'fuera-de-rango'],
      ['r-no-existe', 'no-existe-rutina'],
    ],
  );
});

test('agregar_ejercicios: no pasa de 15 ejercicios por rutina', () => {
  const llena = {
    id: 'r-llena',
    nombre: 'Llena',
    dias: [],
    ejercicios: Array.from({ length: 15 }, (_, i) => ({ ejercicioId: `e${i}`, series: 3, rango: { min: 8, max: 12 } })),
  };
  const r = limpiar(
    [{ tipo: 'agregar_ejercicios', rutinaId: 'r-llena', ejercicios: [{ ejercicioId: 'remo-barra', series: 3 }] }],
    {
      ...contexto,
      rutinas: [llena],
    },
  );
  assert.deepStrictEqual(r.acciones, []);
  assert.deepStrictEqual(
    r.descartados.map((d) => d.motivo),
    ['de-mas', 'sin-ejercicios'],
  );
});

test('quitar_ejercicios: solo los que están; dejar la rutina vacía no (para eso está borrarla)', () => {
  const r = limpiar([
    { tipo: 'quitar_ejercicios', rutinaId: 'r-piernas', ejercicioIds: ['curl-barra', 'remo-barra', 'curl-barra'] },
    { tipo: 'quitar_ejercicios', rutinaId: 'r-empuje', ejercicioIds: ['press-banca-barra'] },
  ]);
  assert.deepStrictEqual(r.acciones, [
    { id: 'a1', tipo: 'quitar_ejercicios', rutinaId: 'r-piernas', ejercicioIds: ['curl-barra'] },
  ]);
  assert.deepStrictEqual(
    r.descartados.map((d) => [d.ejercicioId ?? d.rutinaId, d.motivo]),
    [
      ['remo-barra', 'no-esta-en-la-rutina'],
      ['r-empuje', 'rutina-vacia'],
    ],
  );
});

test('borrar_rutinas: solo las que existen, sin repetir', () => {
  const r = limpiar([{ tipo: 'borrar_rutinas', rutinaIds: ['r-empuje', 'r-empuje', 'r-inventada'] }]);
  assert.deepStrictEqual(r.acciones, [{ id: 'a1', tipo: 'borrar_rutinas', rutinaIds: ['r-empuje'] }]);
  assert.deepStrictEqual(r.descartados, [
    { accion: 'borrar_rutinas', rutinaId: 'r-inventada', motivo: 'no-existe-rutina' },
  ]);
  assert.deepStrictEqual(limpiar([{ tipo: 'borrar_rutinas', rutinaIds: ['r-inventada'] }]).acciones, []);
});

test('registrar_comida: ítems con estado, cantidad en gramos o unidades y estimado por 100 g', () => {
  const empanada = {
    busqueda: 'empanada de carne',
    estado: 'cocido',
    estadoAsumido: true,
    cantidad: { unidades: 2, porcion: 'empanada', gramosPorUnidad: 90 },
    estimado: { kcal: 300, proteinas: 11, carbos: 28, grasas: 16 },
  };
  const r = limpiar([
    {
      tipo: 'registrar_comida',
      dia: '2026-11-26',
      comida: 'cena',
      items: [
        pechuga,
        empanada,
        { ...pechuga, busqueda: 'sin estado', estado: undefined },
        { ...pechuga, busqueda: 'muchas kcal', estimado: { ...pechuga.estimado, kcal: 1200 } },
        { ...pechuga, busqueda: 'demasiado', cantidad: { gramos: 3000 } },
        { ...pechuga, busqueda: 'las dos', cantidad: { gramos: 100, unidades: 1, porcion: 'x', gramosPorUnidad: 50 } },
      ],
    },
  ]);
  assert.deepStrictEqual(r.acciones, [
    {
      id: 'a1',
      tipo: 'registrar_comida',
      dia: '2026-11-26',
      comida: 'cena',
      items: [{ ...pechuga, estadoAsumido: false }, empanada],
    },
  ]);
  assert.deepStrictEqual(
    r.descartados.map((d) => [d.busqueda, d.motivo]),
    [
      ['sin estado', 'item-invalido'],
      ['muchas kcal', 'item-invalido'],
      ['demasiado', 'item-invalido'],
      ['las dos', 'item-invalido'],
    ],
  );
});

test('registrar_comida en unidades: gramosPorUnidad obligatorio, de 1 a 1000', () => {
  const empanadas = (cantidad) => ({
    busqueda: `empanadas ${JSON.stringify(cantidad)}`,
    estado: 'cocido',
    cantidad: { unidades: 2, porcion: 'empanada', ...cantidad },
    estimado: { kcal: 300, proteinas: 11, carbos: 28, grasas: 16 },
  });
  const r = limpiar([
    {
      tipo: 'registrar_comida',
      dia: '2026-11-26',
      comida: 'almuerzo',
      items: [
        empanadas({ gramosPorUnidad: 90 }),
        empanadas({ gramosPorUnidad: 1 }),
        empanadas({ gramosPorUnidad: 1000 }),
        empanadas({}),
        empanadas({ gramosPorUnidad: 0 }),
        empanadas({ gramosPorUnidad: 1001 }),
        empanadas({ gramosPorUnidad: '90' }),
      ],
    },
  ]);
  assert.deepStrictEqual(
    r.acciones[0].items.map((i) => i.cantidad),
    [
      { unidades: 2, porcion: 'empanada', gramosPorUnidad: 90 },
      { unidades: 2, porcion: 'empanada', gramosPorUnidad: 1 },
      { unidades: 2, porcion: 'empanada', gramosPorUnidad: 1000 },
    ],
  );
  assert.deepStrictEqual(
    r.descartados.map((d) => d.motivo),
    ['item-invalido', 'item-invalido', 'item-invalido', 'item-invalido'],
  );
});

test('registrar_comida y cargar_pasos: solo hoy y los 6 días anteriores', () => {
  const comida = (dia) => ({ tipo: 'registrar_comida', dia, comida: 'almuerzo', items: [pechuga] });
  const pasos = (dia) => ({ tipo: 'cargar_pasos', dia, unidad: 'km', valor: 3 });
  const r = limpiar([
    comida('2026-11-20'),
    comida('2026-11-19'),
    comida('2026-11-27'),
    pasos('2026-11-25'),
    pasos('2026-12-01'),
  ]);
  assert.deepStrictEqual(
    r.acciones.map((a) => [a.tipo, a.dia]),
    [
      ['registrar_comida', '2026-11-20'],
      ['cargar_pasos', '2026-11-25'],
    ],
  );
  assert.deepStrictEqual(
    r.descartados.map((d) => [d.dia, d.motivo]),
    [
      ['2026-11-19', 'fecha-no-permitida'],
      ['2026-11-27', 'fecha-no-permitida'],
      ['2026-12-01', 'fecha-no-permitida'],
    ],
  );
});

test('cargar_pasos: km, minutos o pasos dentro de los límites de la app; la hora es opcional', () => {
  assert.deepStrictEqual(MAXIMO_PASOS, { km: 50, minutos: 600, pasos: 60000 });
  const pasos = (unidad, valor, extra = {}) => ({ tipo: 'cargar_pasos', dia: '2026-11-26', unidad, valor, ...extra });
  const r = limpiar([
    pasos('km', 2.5, { hora: '18:30' }),
    pasos('minutos', 45),
    pasos('pasos', 4000, { hora: null }),
    pasos('km', 51),
    pasos('pasos', 1500.5),
    pasos('minutos', 0),
    pasos('km', 3, { hora: '25:00' }),
  ]);
  assert.deepStrictEqual(
    r.acciones.map(({ unidad, valor, hora }) => [unidad, valor, hora]),
    [
      ['km', 2.5, '18:30'],
      ['minutos', 45, undefined],
      ['pasos', 4000, undefined],
    ],
  );
  assert.deepStrictEqual(
    r.descartados.map((d) => d.motivo),
    ['fuera-de-rango', 'fuera-de-rango', 'invalida', 'invalida'],
  );
});

test('acciones de distinto tipo en la misma respuesta, hasta 7; lo que no se entiende se descarta', () => {
  const pasos = { tipo: 'cargar_pasos', dia: '2026-11-26', unidad: 'pasos', valor: 1000 };
  const r = limpiar([
    { tipo: 'borrar_rutinas', rutinaIds: ['r-empuje'] },
    { tipo: 'registrar_comida', dia: '2026-11-26', comida: 'cena', items: [pechuga] },
    { tipo: 'mandar_mail', a: 'alguien' },
    null,
    ...Array.from({ length: 6 }, () => pasos),
  ]);
  assert.strictEqual(MAXIMO_ACCIONES, 7);
  assert.deepStrictEqual(
    r.acciones.map((a) => a.tipo),
    [
      'borrar_rutinas',
      'registrar_comida',
      'cargar_pasos',
      'cargar_pasos',
      'cargar_pasos',
      'cargar_pasos',
      'cargar_pasos',
    ],
  );
  assert.deepStrictEqual(r.descartados, [
    { accion: 'mandar_mail', motivo: 'invalida' },
    { accion: '?', motivo: 'invalida' },
    { accion: 'cargar_pasos', motivo: 'de-mas' },
  ]);
  assert.deepStrictEqual(limpiarAcciones(undefined, contexto, { catalogo }), { acciones: [], descartados: [] });
});

test('con el catálogo real de la API (por defecto) y objetivo fuerza', () => {
  const r = limpiarAcciones(
    [{ tipo: 'crear_rutina', nombre: 'Fuerza', dia: 0, ejercicios: [{ ejercicioId: 'press-banca-barra', series: 5 }] }],
    { ...contexto, perfil: { objetivo: 'fuerza' } },
  );
  assert.deepStrictEqual(r.acciones[0].ejercicios, [
    { ejercicioId: 'press-banca-barra', series: 5, rango: { min: 4, max: 6 } },
  ]);
  assert.match(r.acciones[0].id, /^[0-9a-f-]{36}$/);
});

test('la respuesta del coach trae texto y acciones; sin texto es un error de formato', () => {
  const pasos = { tipo: 'cargar_pasos', dia: '2026-11-26', unidad: 'km', valor: 2 };
  assert.deepStrictEqual(
    leerRespuestaCoach({ texto: ' Dale con todo ', acciones: [pasos] }, contexto, { catalogo, crearId: ids() }),
    { texto: 'Dale con todo', acciones: [{ id: 'a1', ...pasos }], descartados: [] },
  );
  assert.deepStrictEqual(leerRespuestaCoach({ texto: 'Hola' }, contexto, { catalogo }), {
    texto: 'Hola',
    acciones: [],
    descartados: [],
  });
  for (const datos of [null, {}, { texto: '' }, { texto: 3 }]) {
    assert.throws(
      () => leerRespuestaCoach(datos, contexto, { catalogo }),
      (e) => e instanceof ErrorIa && e.tipo === 'formato',
    );
  }
});

test('pideTodo: "todas", "todo", "todos" o "toda", sin importar tildes ni mayúsculas', () => {
  for (const texto of ['Borrá todas', 'borra TODO', 'sacá todas las rutinas', 'Tódas', 'borrá todos.']) {
    assert.strictEqual(pideTodo(texto), true, texto);
  }
  for (const texto of ['borrá la rutina', 'todavía no', 'método', '', undefined]) {
    assert.strictEqual(pideTodo(texto), false, String(texto));
  }
});

test('reemplazar el plan: borrar todas las rutinas junto con las nuevas pasa entero (confirma la tarjeta)', () => {
  const nueva = (nombre, dia) => ({ tipo: 'crear_rutina', nombre, dia, ejercicios: [{ ejercicioId: 'sentadilla-barra', series: 3 }] });
  const r = limpiarAcciones(
    [{ tipo: 'borrar_rutinas', rutinaIds: ['r-empuje', 'r-piernas'] }, nueva('Piernas', 0), nueva('Pecho', 1)],
    contexto,
    { catalogo, crearId: ids() },
  );
  assert.deepStrictEqual(
    r.acciones.map((a) => a.tipo),
    ['borrar_rutinas', 'crear_rutina', 'crear_rutina'],
  );
  assert.deepStrictEqual(r.acciones[0].rutinaIds, ['r-empuje', 'r-piernas']);
  assert.deepStrictEqual(r.descartados, []);
});
