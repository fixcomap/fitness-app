// Formato de lo que se le pide a la IA. Son esquemas "sueltos" (solo tipos, sin rangos):
// se mandan al proveedor como salida estructurada, y los rangos se validan después,
// del lado del servidor, en foto.js y acciones.js.
const { z } = require('zod');

const esquemaSalidaFoto = z.object({
  items: z.array(
    z.object({
      nombre: z.string().describe('Nombre de la comida, en español rioplatense'),
      gramos: z.number().describe('Porción estimada en gramos'),
      kcal: z.number().describe('Kcal de esa porción'),
      proteinas: z.number().describe('Gramos de proteínas de esa porción'),
      carbos: z.number().describe('Gramos de carbohidratos de esa porción'),
      grasas: z.number().describe('Gramos de grasas de esa porción'),
      confianza: z.number().describe('Qué tan seguro estás de este ítem, de 0 a 1'),
    }),
  ),
});

const dia = z.number().int().describe('0 = lunes … 6 = domingo');
const fechaDia = z.string().describe('AAAA-MM-DD: hoy o uno de los 6 días anteriores');
const ejercicioNuevo = z.object({
  ejercicioId: z.string().describe('id exacto del catálogo'),
  series: z.number().int(),
});

const accionesCoach = [
  z.object({
    tipo: z.literal('crear_rutina'),
    nombre: z.string().describe('Nombre corto, de una o dos palabras: "Empuje", "Tirón", "Piernas"'),
    dia: dia.nullable().describe('El día de esta rutina (0 = lunes … 6 = domingo), o null si no tiene'),
    ejercicios: z.array(ejercicioNuevo),
  }),
  z.object({
    tipo: z.literal('agregar_ejercicios'),
    rutinaId: z.string().describe('id de una rutina del contexto'),
    ejercicios: z.array(ejercicioNuevo),
  }),
  z.object({
    tipo: z.literal('quitar_ejercicios'),
    rutinaId: z.string().describe('id de una rutina del contexto'),
    ejercicioIds: z.array(z.string()).describe('ids de ejercicios que están en esa rutina'),
  }),
  z.object({
    tipo: z.literal('borrar_rutinas'),
    rutinaIds: z.array(z.string()).describe('ids de rutinas del contexto que el usuario nombró'),
  }),
  z.object({
    tipo: z.literal('registrar_comida'),
    dia: fechaDia,
    comida: z.enum(['desayuno', 'almuerzo', 'merienda', 'cena', 'snacks']),
    items: z.array(
      z.object({
        busqueda: z.string().describe('Nombre corto para buscar en la base de alimentos: "pechuga a la plancha"'),
        estado: z.enum(['crudo', 'cocido', 'no-aplica']).describe('Si el peso es del alimento crudo o cocido'),
        estadoAsumido: z.boolean().describe('true si el usuario no dijo crudo o cocido y lo supusiste'),
        cantidad: z.union([
          z.object({ gramos: z.number() }),
          z.object({
            unidades: z.number(),
            porcion: z.string().describe('En singular: "empanada"'),
            gramosPorUnidad: z.number().describe('Gramos estimados de una unidad'),
          }),
        ]),
        estimado: z
          .object({ kcal: z.number(), proteinas: z.number(), carbos: z.number(), grasas: z.number() })
          .describe('Valores aproximados por 100 g, según el estado'),
      }),
    ),
  }),
  z.object({
    tipo: z.literal('cargar_pasos'),
    dia: fechaDia,
    unidad: z.enum(['km', 'minutos', 'pasos']).describe('La que usó el usuario'),
    valor: z.number(),
    hora: z.string().nullable().describe('HH:MM en que terminó la caminata, o null si no la dijo'),
  }),
];

const esquemaSalidaCoach = z.object({
  texto: z.string().describe('La respuesta para el usuario'),
  acciones: z
    .array(z.union(accionesCoach))
    .describe(
      'Cambios que la app le propone aplicar al usuario; lista vacía si no pidió ninguno o si hay que preguntar',
    ),
});

// El consejo del día de Inicio. destino: a qué pantalla lleva el botón de la tarjeta.
const DESTINOS_CONSEJO = ['entreno', 'comida', 'actividad', 'coach'];
const esquemaSalidaConsejo = z.object({
  texto: z.string().describe('El consejo: una o dos frases, para hacer hoy'),
  destino: z.enum(DESTINOS_CONSEJO).describe('La pantalla del tema del consejo'),
});

// JSON Schema para los proveedores que lo piden así (Gemini).
function jsonSchema(esquema) {
  const resultado = z.toJSONSchema(esquema);
  delete resultado.$schema;
  return resultado;
}

module.exports = { esquemaSalidaFoto, esquemaSalidaCoach, esquemaSalidaConsejo, DESTINOS_CONSEJO, jsonSchema };
