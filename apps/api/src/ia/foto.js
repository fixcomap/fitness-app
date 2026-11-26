// Validación de lo que devuelve la IA para la foto de un plato. Funciones puras.
const { z } = require('zod');
const { ErrorIa } = require('./proveedor');

// Mismas comidas que la app (apps/mobile/src/lib/comida/diario.ts).
const COMIDAS = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snacks'];

const MAXIMO_ITEMS = 20;

// Rangos razonables para una porción: lo que se sale de acá se descarta.
const esquemaItem = z.object({
  nombre: z.string().trim().min(1).max(60),
  gramos: z.number().positive().max(3000),
  kcal: z.number().min(0).max(5000),
  proteinas: z.number().min(0).max(500),
  carbos: z.number().min(0).max(500),
  grasas: z.number().min(0).max(500),
  confianza: z.number().min(0).max(1),
});

const redondear = (n, decimales) => Math.round(n * 10 ** decimales) / 10 ** decimales;

function redondearItem(item) {
  return {
    nombre: item.nombre,
    gramos: Math.round(item.gramos),
    kcal: Math.round(item.kcal),
    proteinas: redondear(item.proteinas, 1),
    carbos: redondear(item.carbos, 1),
    grasas: redondear(item.grasas, 1),
    confianza: redondear(item.confianza, 2),
  };
}

// El total se calcula acá (no se le cree a la IA): suma de los ítems ya redondeados.
function totalFoto(items) {
  const suma = (campo) => items.reduce((total, item) => total + item[campo], 0);
  return {
    gramos: suma('gramos'),
    kcal: suma('kcal'),
    proteinas: redondear(suma('proteinas'), 1),
    carbos: redondear(suma('carbos'), 1),
    grasas: redondear(suma('grasas'), 1),
  };
}

// { items, total }. Descarta los ítems inválidos; tira ErrorIa si no vino una lista.
function leerResultadoFoto(datos) {
  if (!datos || !Array.isArray(datos.items)) throw new ErrorIa('formato', 'La IA no devolvió la lista de ítems');
  const items = datos.items
    .map((item) => esquemaItem.safeParse(item))
    .filter((r) => r.success)
    .map((r) => redondearItem(r.data))
    .slice(0, MAXIMO_ITEMS);
  return { items, total: totalFoto(items) };
}

module.exports = { COMIDAS, MAXIMO_ITEMS, leerResultadoFoto, totalFoto };
