// Coach: validación del pedido de la app y de las rutinas que arma la IA. Funciones puras.
const { randomUUID } = require('crypto');
const { z } = require('zod');
const { historialDesdeUsuario } = require('./proveedor');
const { diaDeSemana } = require('./prompts');

// Mismos rangos que la app (apps/mobile/src/lib/entreno/rutinas.ts y rangos.ts).
const SERIES = { min: 1, max: 10 };
const REPS = { min: 1, max: 30 };
const MAXIMO_EJERCICIOS_RUTINA = 15;
const MAXIMO_NOMBRE_RUTINA = 40;
const NOMBRE_RUTINA_POR_DEFECTO = 'Rutina del coach';
const MAXIMO_TEXTO = 4000;
// La app guarda más, pero a la IA van solo los últimos: alcanza para la charla y acota el costo.
const MAXIMO_MENSAJES_IA = 10;

const entero = (min, max) => z.number().int().min(min).max(max);
const dia = entero(0, 6);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const fechaReal = fecha.refine((f) => diaDeSemana(f) !== null, 'La fecha no existe');
const texto = (max) => z.string().trim().max(max);

const ejercicioRutina = z.object({
  ejercicioId: texto(80).min(1),
  series: entero(SERIES.min, SERIES.max),
  rango: z.object({ min: entero(REPS.min, REPS.max), max: entero(REPS.min, REPS.max) }),
});

// Los datos del celu que van con cada pedido del coach (y del consejo del día).
const esquemaContexto = z.object({
  // La fecha del celular ("AAAA-MM-DD"): así no depende de la zona horaria del servidor.
  hoy: fechaReal,
  perfil: z.object({
    nombre: texto(30).optional(),
    sexo: z.enum(['hombre', 'mujer']),
    edad: entero(14, 100),
    alturaCm: z.number().min(120).max(230),
    pesoKg: z.number().min(30).max(300),
    objetivoPeso: z.enum(['bajar', 'mantener', 'subir']),
    objetivo: z.enum(['hipertrofia', 'fuerza']),
    diasEntrenoPorSemana: entero(0, 7),
    kcalObjetivo: z.number().min(0).max(10000).optional(),
    // Opcionales (las apps viejas no los mandan): para hablar de lo que le falta con números reales.
    proteinasObjetivo: z.number().min(0).max(1000).optional(),
    metaPasos: entero(0, 100000).optional(),
  }),
  ultimos7Dias: z
    .array(
      z.object({
        fecha,
        kcal: z.number().min(0).max(20000),
        proteinas: z.number().min(0).max(2000).optional(),
        carbos: z.number().min(0).max(2000).optional(),
        grasas: z.number().min(0).max(2000).optional(),
        comidas: z.array(texto(80)).max(40).optional(),
        entrenos: z
          .array(
            z.object({
              nombre: texto(60),
              ejercicios: entero(0, 100).optional(),
              duracionMin: z.number().min(0).max(600).optional(),
            }),
          )
          .max(5)
          .optional(),
        pasos: entero(0, 200000).optional(),
        kcalActividad: z.number().min(0).max(10000).optional(),
      }),
    )
    .max(7),
  rutinas: z
    .array(
      z.object({
        // Para que el coach pueda nombrar una rutina en sus acciones.
        id: texto(80).min(1),
        nombre: texto(MAXIMO_NOMBRE_RUTINA),
        dias: z.array(dia).max(7),
        ejercicios: z.array(ejercicioRutina).max(30),
      }),
    )
    .max(14)
    .refine((rutinas) => new Set(rutinas.map((r) => r.id)).size === rutinas.length, 'Hay rutinas con el mismo id'),
  // El catálogo de ejercicios no lo manda la app: lo tiene la API (src/ia/catalogo.json).
});

// Lo que manda la app.
const esquemaPedidoCoach = z.object({
  mensajes: z
    .array(z.object({ rol: z.enum(['usuario', 'coach']), texto: texto(2000).min(1) }))
    .min(1)
    .max(40)
    .refine((mensajes) => mensajes.at(-1)?.rol === 'usuario', 'El último mensaje tiene que ser del usuario'),
  contexto: esquemaContexto,
});

// El consejo del día de Inicio: el mismo contexto y los últimos consejos que ya recibió (para no repetir tema).
const MAXIMO_CONSEJOS_ANTERIORES = 3;
const esquemaPedidoConsejo = z.object({
  contexto: esquemaContexto,
  // La hora local del celular (0-23): a la mañana el consejo no habla de lo que falta hoy.
  hora: entero(0, 23),
  consejosAnteriores: z
    .array(z.object({ fecha, texto: texto(400).min(1) }))
    .max(MAXIMO_CONSEJOS_ANTERIORES)
    .default([]),
});

// Los últimos mensajes de la charla, los que van a la IA. Si al recortar queda primero uno del coach,
// se saca: la charla tiene que empezar por el usuario (Claude lo exige).
function mensajesParaIa(mensajes) {
  return historialDesdeUsuario(mensajes.slice(-MAXIMO_MENSAJES_IA));
}

// Lista corta de qué está mal en el pedido, para el 400.
function erroresPedido(error) {
  return error.issues.slice(0, 5).map((i) => `${i.path.join('.') || 'cuerpo'}: ${i.message}`);
}

// Recorta el nombre en una palabra completa (sin dejar separadores colgando al final).
// "Hipertrofia 3 días - Empuje, Tirón, Piernas" con 40 → "Hipertrofia 3 días - Empuje, Tirón".
function recortarNombre(nombre, maximo = MAXIMO_NOMBRE_RUTINA) {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  if (limpio.length <= maximo) return limpio;
  const corte = limpio.slice(0, maximo + 1).lastIndexOf(' ');
  const recortado = corte > 0 ? limpio.slice(0, corte) : limpio.slice(0, maximo);
  return recortado.replace(/[\s,;:/\-–—·|+&(]+$/u, '');
}

// Una rutina de la IA en el formato de Mis rutinas, solo con ejercicios del catálogo y en rango.
// diasOcupados: días que ya tiene otra rutina de la lista (en la app, un día tiene una sola rutina).
// rangoPara: id -> rango de la app para ese ejercicio, o null (se queda el que dio la IA).
// { rutina, descartados } — rutina es null si no queda ningún ejercicio válido.
function limpiarRutina(
  rutina,
  idsCatalogo,
  { crearId = randomUUID, diasOcupados = new Set(), rangoPara = () => null } = {},
) {
  if (!rutina || typeof rutina !== 'object') return { rutina: null, descartados: [] };
  const nombre = recortarNombre(typeof rutina.nombre === 'string' ? rutina.nombre : '') || NOMBRE_RUTINA_POR_DEFECTO;
  const descartados = [];
  const descartar = (ejercicioId, motivo) => descartados.push({ rutina: nombre, ejercicioId, motivo });
  const usados = new Set();
  const ejercicios = [];
  for (const crudo of Array.isArray(rutina.ejercicios) ? rutina.ejercicios : []) {
    const rangoApp = typeof crudo?.ejercicioId === 'string' ? rangoPara(crudo.ejercicioId) : null;
    const r = ejercicioRutina.safeParse(rangoApp ? { ...crudo, rango: rangoApp } : crudo);
    const id = r.success ? r.data.ejercicioId : String(crudo?.ejercicioId ?? '?');
    if (!idsCatalogo.has(id)) descartar(id, 'no-existe');
    else if (!r.success || r.data.rango.min > r.data.rango.max) descartar(id, 'fuera-de-rango');
    else if (usados.has(id)) descartar(id, 'repetido');
    else if (ejercicios.length >= MAXIMO_EJERCICIOS_RUTINA) descartar(id, 'de-mas');
    else {
      usados.add(id);
      ejercicios.push({
        ejercicioId: id,
        series: r.data.series,
        rango: { min: r.data.rango.min, max: r.data.rango.max },
      });
    }
  }
  if (ejercicios.length === 0) return { rutina: null, descartados };

  const dias = [...new Set((Array.isArray(rutina.dias) ? rutina.dias : []).filter((d) => dia.safeParse(d).success))]
    .filter((d) => !diasOcupados.has(d))
    .sort((a, b) => a - b);
  return { rutina: { id: crearId(), nombre, dias, ejercicios }, descartados };
}

module.exports = {
  MAXIMO_TEXTO,
  MAXIMO_NOMBRE_RUTINA,
  MAXIMO_EJERCICIOS_RUTINA,
  SERIES,
  MAXIMO_MENSAJES_IA,
  mensajesParaIa,
  esquemaPedidoCoach,
  esquemaPedidoConsejo,
  MAXIMO_CONSEJOS_ANTERIORES,
  erroresPedido,
  recortarNombre,
  limpiarRutina,
};
