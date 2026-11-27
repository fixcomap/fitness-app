// Acciones que propone el coach y la app aplica con confirmación del usuario. Funciones puras.
// La API las valida contra el contexto del pedido (rutinas, hoy) y el catálogo; la app las vuelve a
// validar contra lo que tenga guardado al aplicarlas.
const { randomUUID } = require('crypto');
const { z } = require('zod');
const { MAXIMO_EJERCICIOS_RUTINA, MAXIMO_TEXTO, SERIES, limpiarRutina } = require('./coach');
const { ErrorIa } = require('./proveedor');
const { CATALOGO } = require('./catalogo');
const { rangoDeLaApp } = require('./rangos');
const { COMIDAS, MAXIMO_ITEMS } = require('./foto');

const TIPOS_ACCION = [
  'crear_rutina',
  'agregar_ejercicios',
  'quitar_ejercicios',
  'borrar_rutinas',
  'registrar_comida',
  'cargar_pasos',
];
const MAXIMO_ACCIONES = 7;
// Comidas y pasos: hoy y los 6 días anteriores, nunca días futuros.
const DIAS_ATRAS = 6;
// Mismos límites que la app.
const CANTIDAD = { unidades: { min: 0.5, max: 20 }, gramos: { min: 5, max: 2000 } }; // lib/comida/porciones.ts
const GRAMOS_POR_UNIDAD = { min: 1, max: 1000 };
const MAXIMO_POR_100G = { kcal: 1000, macros: 100 }; // leerAlimento en lib/comida/alimentos.ts
// lib/pasosManuales.ts: MAXIMO = { km: 50, minutos: 600 }; en pasos, 600 minutos × PASOS_POR_MINUTO (100).
const MAXIMO_PASOS = { km: 50, minutos: 600, pasos: 60000 };
const ESTADOS = ['crudo', 'cocido', 'no-aplica'];

const texto = (max) => z.string().trim().max(max);
const entero = (min, max) => z.number().int().min(min).max(max);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const ids = z.array(texto(80).min(1)).min(1).max(30);

const ejercicioNuevo = z.object({ ejercicioId: texto(80).min(1), series: entero(SERIES.min, SERIES.max) });

const porCien = z.object({
  kcal: z.number().min(0).max(MAXIMO_POR_100G.kcal),
  proteinas: z.number().min(0).max(MAXIMO_POR_100G.macros),
  carbos: z.number().min(0).max(MAXIMO_POR_100G.macros),
  grasas: z.number().min(0).max(MAXIMO_POR_100G.macros),
});

const itemComida = z.object({
  busqueda: texto(80).min(1), // lo que la app busca en su base: "pechuga a la plancha"
  estado: z.enum(ESTADOS),
  // true si el usuario no dijo crudo o cocido y el coach lo supuso (la tarjeta lo muestra).
  estadoAsumido: z.boolean().default(false),
  cantidad: z.union([
    z.object({ gramos: z.number().min(CANTIDAD.gramos.min).max(CANTIDAD.gramos.max) }).strict(),
    z
      .object({
        unidades: z.number().min(CANTIDAD.unidades.min).max(CANTIDAD.unidades.max),
        porcion: texto(40).min(1), // "empanada"
        // Estimado por el coach: si la app no encuentra el alimento, calcula con esto (la tarjeta lo muestra
        // para poder editarlo: "2 empanadas · ~90 g c/u").
        gramosPorUnidad: z.number().min(GRAMOS_POR_UNIDAD.min).max(GRAMOS_POR_UNIDAD.max),
      })
      .strict(),
  ]),
  estimado: porCien, // por 100 g: se usa solo si la app no encuentra el alimento
});

// Lo que puede mandar la IA. Lo de adentro (ejercicios, ítems) se valida uno por uno, para descartar solo lo malo.
const accionIa = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('crear_rutina'),
    nombre: z.string(),
    dia: entero(0, 6).nullable(),
    ejercicios: z.array(z.unknown()),
  }),
  z.object({
    tipo: z.literal('agregar_ejercicios'),
    rutinaId: texto(80).min(1),
    ejercicios: z.array(z.unknown()).min(1),
  }),
  z.object({ tipo: z.literal('quitar_ejercicios'), rutinaId: texto(80).min(1), ejercicioIds: ids }),
  z.object({ tipo: z.literal('borrar_rutinas'), rutinaIds: ids }),
  z.object({
    tipo: z.literal('registrar_comida'),
    dia: fecha,
    comida: z.enum(COMIDAS),
    items: z.array(z.unknown()).min(1),
  }),
  z.object({
    tipo: z.literal('cargar_pasos'),
    dia: fecha,
    unidad: z.enum(['km', 'minutos', 'pasos']),
    valor: z.number().positive(),
    hora: hora.nullish(),
  }),
]);

// "2026-11-26" menos 6 días → "2026-11-20".
function restarDias(dia, dias) {
  const [anio, mes, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, d - dias)).toISOString().slice(0, 10);
}

// Entre hoy y 6 días antes (las fechas AAAA-MM-DD se comparan como texto).
function diaPermitido(dia, hoy) {
  return dia <= hoy && dia >= restarDias(hoy, DIAS_ATRAS);
}

function crearRutina(a, { diasOcupados, idsCatalogo, rangoPara }) {
  const { rutina, descartados } = limpiarRutina(
    { nombre: a.nombre, dias: a.dia === null ? [] : [a.dia], ejercicios: a.ejercicios },
    idsCatalogo,
    // El id de la rutina lo pone la app al aplicarla: acá no se usa.
    { crearId: () => '', diasOcupados, rangoPara },
  );
  const sueltos = descartados.map((d) => ({ accion: a.tipo, ...d }));
  if (!rutina) return { descartados: [...sueltos, { accion: a.tipo, motivo: 'sin-ejercicios' }] };
  for (const d of rutina.dias) diasOcupados.add(d);
  return {
    accion: { tipo: a.tipo, nombre: rutina.nombre, dia: rutina.dias[0] ?? null, ejercicios: rutina.ejercicios },
    descartados: sueltos,
  };
}

function agregarEjercicios(a, { rutinas, idsCatalogo, rangoPara }) {
  const rutina = rutinas.get(a.rutinaId);
  if (!rutina) return { descartados: [{ accion: a.tipo, rutinaId: a.rutinaId, motivo: 'no-existe-rutina' }] };
  const usados = new Set(rutina.ejercicios.map((e) => e.ejercicioId));
  const descartados = [];
  const ejercicios = [];
  for (const crudo of a.ejercicios) {
    const r = ejercicioNuevo.safeParse(crudo);
    const id = r.success ? r.data.ejercicioId : String(crudo?.ejercicioId ?? '?');
    const rango = idsCatalogo.has(id) ? rangoPara(id) : null;
    const descartar = (motivo) => descartados.push({ accion: a.tipo, rutinaId: a.rutinaId, ejercicioId: id, motivo });
    if (!idsCatalogo.has(id)) descartar('no-existe');
    else if (!r.success || !rango) descartar('fuera-de-rango');
    else if (usados.has(id)) descartar('repetido');
    else if (usados.size >= MAXIMO_EJERCICIOS_RUTINA) descartar('de-mas');
    else {
      usados.add(id);
      ejercicios.push({ ejercicioId: id, series: r.data.series, rango });
    }
  }
  if (ejercicios.length === 0) {
    return { descartados: [...descartados, { accion: a.tipo, rutinaId: a.rutinaId, motivo: 'sin-ejercicios' }] };
  }
  return { accion: { tipo: a.tipo, rutinaId: a.rutinaId, ejercicios }, descartados };
}

function quitarEjercicios(a, { rutinas }) {
  const rutina = rutinas.get(a.rutinaId);
  if (!rutina) return { descartados: [{ accion: a.tipo, rutinaId: a.rutinaId, motivo: 'no-existe-rutina' }] };
  const tiene = new Set(rutina.ejercicios.map((e) => e.ejercicioId));
  const quitar = [...new Set(a.ejercicioIds)];
  const descartados = quitar
    .filter((id) => !tiene.has(id))
    .map((ejercicioId) => ({ accion: a.tipo, rutinaId: a.rutinaId, ejercicioId, motivo: 'no-esta-en-la-rutina' }));
  const ejercicioIds = quitar.filter((id) => tiene.has(id));
  if (ejercicioIds.length === 0) return { descartados };
  // La app no guarda rutinas sin ejercicios: para eso está borrar la rutina.
  if (ejercicioIds.length === tiene.size) {
    return { descartados: [...descartados, { accion: a.tipo, rutinaId: a.rutinaId, motivo: 'rutina-vacia' }] };
  }
  return { accion: { tipo: a.tipo, rutinaId: a.rutinaId, ejercicioIds }, descartados };
}

function borrarRutinas(a, { rutinas }) {
  const pedidas = [...new Set(a.rutinaIds)];
  const descartados = pedidas
    .filter((id) => !rutinas.has(id))
    .map((rutinaId) => ({ accion: a.tipo, rutinaId, motivo: 'no-existe-rutina' }));
  const rutinaIds = pedidas.filter((id) => rutinas.has(id));
  return rutinaIds.length ? { accion: { tipo: a.tipo, rutinaIds }, descartados } : { descartados };
}

function registrarComida(a, { hoy }) {
  if (!diaPermitido(a.dia, hoy)) return { descartados: [{ accion: a.tipo, dia: a.dia, motivo: 'fecha-no-permitida' }] };
  const descartados = [];
  const items = [];
  for (const crudo of a.items) {
    const r = itemComida.safeParse(crudo);
    const busqueda = typeof crudo?.busqueda === 'string' ? crudo.busqueda : '?';
    if (!r.success) descartados.push({ accion: a.tipo, busqueda, motivo: 'item-invalido' });
    else if (items.length >= MAXIMO_ITEMS) descartados.push({ accion: a.tipo, busqueda, motivo: 'de-mas' });
    else items.push(r.data);
  }
  if (items.length === 0) return { descartados };
  return { accion: { tipo: a.tipo, dia: a.dia, comida: a.comida, items }, descartados };
}

function cargarPasos(a, { hoy }) {
  const descartar = (motivo) => ({ descartados: [{ accion: a.tipo, dia: a.dia, motivo }] });
  if (!diaPermitido(a.dia, hoy)) return descartar('fecha-no-permitida');
  if (a.valor > MAXIMO_PASOS[a.unidad] || (a.unidad === 'pasos' && !Number.isInteger(a.valor))) {
    return descartar('fuera-de-rango');
  }
  const accion = { tipo: a.tipo, dia: a.dia, unidad: a.unidad, valor: a.valor, ...(a.hora ? { hora: a.hora } : {}) };
  return { accion, descartados: [] };
}

const LIMPIAR = {
  crear_rutina: crearRutina,
  agregar_ejercicios: agregarEjercicios,
  quitar_ejercicios: quitarEjercicios,
  borrar_rutinas: borrarRutinas,
  registrar_comida: registrarComida,
  cargar_pasos: cargarPasos,
};

// "todas", "todo", "todos" o "toda" en lo que escribió el usuario (sin importar tildes ni mayúsculas).
function pideTodo(texto) {
  const limpio = (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return /(^|[^a-z])tod[oa]s?($|[^a-z])/.test(limpio);
}

// Red de seguridad: si entre todas las borrar_rutinas de la respuesta se borrarían todas las rutinas
// (y tiene más de una), el usuario lo tuvo que pedir con "todas" o "todo". Si no, se descartan.
function sinBorrarTodo(acciones, contexto, ultimoMensaje) {
  const rutinas = contexto.rutinas ?? [];
  const borradas = new Set(acciones.filter((a) => a.tipo === 'borrar_rutinas').flatMap((a) => a.rutinaIds));
  if (rutinas.length < 2 || borradas.size < rutinas.length || pideTodo(ultimoMensaje)) {
    return { acciones, descartados: [] };
  }
  return {
    acciones: acciones.filter((a) => a.tipo !== 'borrar_rutinas'),
    descartados: [{ accion: 'borrar_rutinas', motivo: 'ambiguo' }],
  };
}

// Las acciones de la IA validadas contra el contexto del pedido. Cada una sale con un id nuevo.
// ultimoMensaje: lo último que escribió el usuario (para no borrar todas las rutinas si no lo pidió).
// contexto: { hoy, perfil: { objetivo }, rutinas: [{ id, ejercicios }] } (ya validado por esquemaPedidoCoach).
// { acciones, descartados }
function limpiarAcciones(lista, contexto, { catalogo = CATALOGO, crearId = randomUUID, ultimoMensaje = '' } = {}) {
  const porId = new Map(catalogo.map((e) => [e.id, e]));
  const entorno = {
    hoy: contexto.hoy,
    rutinas: new Map((contexto.rutinas ?? []).map((r) => [r.id, r])),
    idsCatalogo: new Set(porId.keys()),
    rangoPara: (id) => rangoDeLaApp(porId.get(id), contexto.perfil?.objetivo),
    diasOcupados: new Set(), // días que ya pidió otra crear_rutina de esta misma respuesta
    crearId,
  };
  const acciones = [];
  const descartados = [];
  for (const cruda of Array.isArray(lista) ? lista : []) {
    const r = accionIa.safeParse(cruda);
    const tipo = TIPOS_ACCION.includes(cruda?.tipo) ? cruda.tipo : String(cruda?.tipo ?? '?');
    if (!r.success) {
      descartados.push({ accion: tipo, motivo: 'invalida' });
      continue;
    }
    if (acciones.length >= MAXIMO_ACCIONES) {
      descartados.push({ accion: tipo, motivo: 'de-mas' });
      continue;
    }
    const limpia = LIMPIAR[r.data.tipo](r.data, entorno);
    descartados.push(...limpia.descartados);
    if (limpia.accion) acciones.push({ id: crearId(), ...limpia.accion });
  }
  const seguras = sinBorrarTodo(acciones, contexto, ultimoMensaje);
  return { acciones: seguras.acciones, descartados: [...descartados, ...seguras.descartados] };
}

// La respuesta de la IA: { texto, acciones, descartados }. Tira ErrorIa si no vino el texto.
// contexto: el del pedido (para validar las acciones). catalogo y crearId: los de la API salvo en los tests.
function leerRespuestaCoach(datos, contexto, opciones) {
  const textoIa = typeof datos?.texto === 'string' ? datos.texto.trim() : '';
  if (!textoIa) throw new ErrorIa('formato', 'La IA no devolvió el texto');
  const { acciones, descartados } = limpiarAcciones(datos.acciones, contexto, opciones);
  return { texto: textoIa.slice(0, MAXIMO_TEXTO), acciones, descartados };
}

module.exports = {
  TIPOS_ACCION,
  MAXIMO_ACCIONES,
  MAXIMO_PASOS,
  restarDias,
  diaPermitido,
  pideTodo,
  limpiarAcciones,
  leerRespuestaCoach,
};
