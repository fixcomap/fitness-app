// Rangos de repeticiones de la app aplicados a las rutinas del coach.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { tipoDe, rangoDeLaApp } = require('../src/ia/rangos');
const { esquemaPedidoCoach } = require('../src/ia/coach');
const { limpiarAcciones } = require('../src/ia/acciones');
const { DISPOSITIVO, iaFalsa, usoEnMemoria, conApp } = require('./ayudas');

const ej = (ejercicioId, series = 3, min = 8, max = 12) => ({ ejercicioId, series, rango: { min, max } });
const contexto = { hoy: '2026-11-26', perfil: { objetivo: 'hipertrofia' }, rutinas: [] };

const catalogo = [
  { id: 'press-banca-barra', nombre: 'Press de banca con barra', equipo: 'barra' },
  { id: 'curl-barra', nombre: 'Curl de bíceps con barra', equipo: 'barra' },
  { id: 'jalon-al-pecho', nombre: 'Jalón al pecho', equipo: 'polea' },
  { id: 'dominadas', nombre: 'Dominadas', equipo: 'peso-corporal' },
  { id: 'face-pull-banda', nombre: 'Face pull con banda', equipo: 'bandas' },
  // El catálogo corrige la regla por nombre: "press" sería compuesto.
  { id: 'press-pallof', nombre: 'Press Pallof', equipo: 'polea', tipo: 'aislamiento' },
  { id: 'viejo', nombre: 'Sin equipo (app vieja)' },
];

test('tipoDe: el tipo del catálogo o, si no, la regla por nombre (sin tildes)', () => {
  assert.strictEqual(tipoDe({ nombre: 'Jalón al pecho' }), 'compuesto');
  assert.strictEqual(tipoDe({ nombre: 'Buenos días con barra' }), 'compuesto');
  assert.strictEqual(tipoDe({ nombre: 'Curl de bíceps' }), 'aislamiento');
  assert.strictEqual(tipoDe({ nombre: 'Press Pallof', tipo: 'aislamiento' }), 'aislamiento');
});

test('rangoDeLaApp: compuesto 6–10 (fuerza 4–6), aislamiento 10–15, peso corporal y bandas 8–15', () => {
  const rango = (id, objetivo = 'hipertrofia') =>
    rangoDeLaApp(
      catalogo.find((e) => e.id === id),
      objetivo,
    );
  assert.deepStrictEqual(rango('press-banca-barra'), { min: 6, max: 10 });
  assert.deepStrictEqual(rango('press-banca-barra', 'fuerza'), { min: 4, max: 6 });
  assert.deepStrictEqual(rango('jalon-al-pecho', 'fuerza'), { min: 4, max: 6 });
  assert.deepStrictEqual(rango('curl-barra'), { min: 10, max: 15 });
  assert.deepStrictEqual(rango('curl-barra', 'fuerza'), { min: 10, max: 15 });
  assert.deepStrictEqual(rango('press-pallof'), { min: 10, max: 15 });
  assert.deepStrictEqual(rango('dominadas'), { min: 8, max: 15 });
  assert.deepStrictEqual(rango('dominadas', 'fuerza'), { min: 8, max: 15 });
  assert.deepStrictEqual(rango('face-pull-banda'), { min: 8, max: 15 });
  // Sin equipo no se puede saber.
  assert.strictEqual(rango('viejo'), null);
  assert.strictEqual(rangoDeLaApp(undefined, 'fuerza'), null);
});

test('las rutinas del coach salen con los rangos de la app según el objetivo', () => {
  const acciones = [
    {
      tipo: 'crear_rutina',
      nombre: 'Full body',
      dia: 0,
      ejercicios: ['press-banca-barra', 'curl-barra', 'dominadas', 'jalon-al-pecho', 'press-pallof'].map(
        (ejercicioId) => ({ ejercicioId, series: 3 }),
      ),
    },
  ];
  const fuerza = limpiarAcciones(acciones, { ...contexto, perfil: { objetivo: 'fuerza' } }, { catalogo });
  assert.deepStrictEqual(fuerza.acciones[0].ejercicios, [
    ej('press-banca-barra', 3, 4, 6),
    ej('curl-barra', 3, 10, 15),
    ej('dominadas', 3, 8, 15),
    ej('jalon-al-pecho', 3, 4, 6),
    ej('press-pallof', 3, 10, 15),
  ]);
  const hipertrofia = limpiarAcciones(acciones, contexto, { catalogo });
  assert.deepStrictEqual(hipertrofia.acciones[0].ejercicios[0], ej('press-banca-barra', 3, 6, 10));
  // Sin equipo en el catálogo no hay rango de la app: el ejercicio se descarta.
  const viejo = limpiarAcciones(
    [{ tipo: 'crear_rutina', nombre: 'A', dia: 0, ejercicios: [{ ejercicioId: 'viejo', series: 3 }] }],
    contexto,
    { catalogo },
  );
  assert.deepStrictEqual(
    viejo.descartados.map((d) => d.motivo),
    ['fuera-de-rango', 'sin-ejercicios'],
  );
});

test('las series fuera de rango se siguen descartando', () => {
  const r = limpiarAcciones(
    [{ tipo: 'crear_rutina', nombre: 'A', dia: 0, ejercicios: [{ ejercicioId: 'curl-barra', series: 11 }] }],
    contexto,
    { catalogo },
  );
  assert.deepStrictEqual(r.descartados, [
    { accion: 'crear_rutina', rutina: 'A', ejercicioId: 'curl-barra', motivo: 'fuera-de-rango' },
    { accion: 'crear_rutina', motivo: 'sin-ejercicios' },
  ]);
});

test('el pedido ya no lleva catálogo: si una app vieja lo manda, se ignora', () => {
  const pedido = {
    mensajes: [{ rol: 'usuario', texto: 'Hola' }],
    contexto: {
      hoy: '2026-11-26',
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
      rutinas: [],
    },
  };
  assert.ok(esquemaPedidoCoach.safeParse(pedido).success);
  const conCatalogo = esquemaPedidoCoach.safeParse({ ...pedido, contexto: { ...pedido.contexto, catalogo } });
  assert.ok(conCatalogo.success);
  assert.strictEqual(conCatalogo.data.contexto.catalogo, undefined);
});

test('POST /coach aplica los rangos con el objetivo del perfil', async () => {
  const ia = iaFalsa({
    coach: {
      texto: 'Dale',
      acciones: [
        {
          tipo: 'crear_rutina',
          nombre: 'Empuje',
          dia: 0,
          ejercicios: ['press-banca-barra', 'press-militar-mancuernas', 'fondos-paralelas', 'triceps-polea'].map((ejercicioId) => ({
            ejercicioId,
            series: 4,
          })),
        },
      ],
    },
  });
  const cuerpo = {
    mensajes: [{ rol: 'usuario', texto: 'Armame una rutina' }],
    contexto: {
      hoy: '2026-11-26',
      perfil: {
        sexo: 'hombre',
        edad: 24,
        alturaCm: 180,
        pesoKg: 78,
        objetivoPeso: 'bajar',
        objetivo: 'fuerza',
        diasEntrenoPorSemana: 3,
      },
      ultimos7Dias: [],
      rutinas: [],
    },
  };
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/coach', {
      headers: { 'X-Dispositivo': DISPOSITIVO, 'Content-Type': 'application/json' },
      cuerpo: JSON.stringify(cuerpo),
    });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.body.acciones[0].ejercicios[0], ej('press-banca-barra', 4, 4, 6));
  });
});

test('todo el catálogo real de la app tiene rango (equipo conocido)', () => {
  const real = require(path.join(__dirname, '../../mobile/src/data/ejercicios.json'));
  for (const e of real) {
    for (const objetivo of ['hipertrofia', 'fuerza']) assert.ok(rangoDeLaApp(e, objetivo), e.id);
  }
});
