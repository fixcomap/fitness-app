// Formato de lo que se le pide a la IA. Son esquemas "sueltos" (solo tipos, sin rangos):
// se mandan al proveedor como salida estructurada, y los rangos se validan después,
// del lado del servidor, en foto.js y coach.js.
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

const esquemaRutina = z.object({
  nombre: z.string().describe('Nombre corto, de una o dos palabras: "Empuje", "Tirón", "Piernas"'),
  dias: z.array(z.number().int()).describe('El día de esta rutina: 0 = lunes … 6 = domingo'),
  ejercicios: z.array(
    z.object({
      ejercicioId: z.string().describe('id exacto del catálogo'),
      series: z.number().int(),
      rango: z.object({ min: z.number().int(), max: z.number().int() }).describe('Rango de repeticiones'),
    }),
  ),
});

const esquemaSalidaCoach = z.object({
  texto: z.string().describe('La respuesta para el usuario'),
  rutinas: z
    .array(esquemaRutina)
    .describe('Una rutina por día de entrenamiento, solo si el usuario pidió una rutina; si no, lista vacía'),
});

// JSON Schema para los proveedores que lo piden así (Gemini).
function jsonSchema(esquema) {
  const resultado = z.toJSONSchema(esquema);
  delete resultado.$schema;
  return resultado;
}

module.exports = { esquemaSalidaFoto, esquemaSalidaCoach, esquemaRutina, jsonSchema };
