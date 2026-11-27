// Foto del plato con IA (POST /comida/foto): cómo se achica la foto, cómo se lee la respuesta, cómo se
// buscan los alimentos en la base del celu (igual que las comidas del coach) y cómo se cargan al diario.
// Funciones puras.
import { buscarAlimentoDeItem, type BaseLocal, type DondeSeEncontro } from '../coach/alimentoDeAccion';
import type { ItemComida } from '../coach/acciones';
import { ErrorApi } from '../api';
import type { Alimento } from './alimentos';
import { agregarRegistro, nuevoRegistro, type Comida, type RegistroComida } from './diario';
import type { Cantidad } from './porciones';
import { LIMITES_ALIMENTO } from './propios';
import type { ItemFoto } from './respuestaFoto';

export { leerResultadoFoto, type ItemFoto } from './respuestaFoto';

// La foto se achica en el celu antes de mandarla: JPEG (las del iPhone vienen en HEIC), lado mayor
// 1600 px y calidad 80. Así pesa unos cientos de KB y entra en el máximo de la API (2 MB).
export const LADO_MAYOR = 1600;
export const CALIDAD_JPEG = 0.8;

export const FUENTE_ESTIMADO_FOTO = 'Estimación de la foto: valores aproximados.';
// Debajo de esto, la tarjeta avisa que la IA no está segura de ese alimento.
export const CONFIANZA_BAJA = 0.5;

// Cuánto achicar una foto de ancho × alto para que el lado mayor no pase de `maximo` (se conserva la
// proporción). null si ya es chica.
export function redimension(
  ancho: number,
  alto: number,
  maximo: number = LADO_MAYOR,
): { width: number } | { height: number } | null {
  if (!(ancho > 0) || !(alto > 0) || Math.max(ancho, alto) <= maximo) return null;
  return ancho >= alto ? { width: maximo } : { height: maximo };
}

// ── Los alimentos en la base del celu ──

const porCien = (valor: number, gramos: number, maximo: number) =>
  Math.min(maximo, Math.round((valor / gramos) * 1000) / 10);

// Como un ítem de registrar_comida del coach: se busca por nombre y, si no está, se usa lo que estimó
// la IA pasado a 100 g. Es la porción de un plato servido: el peso es el que se ve (no aplica crudo/cocido).
export function itemComidaDeFoto(item: ItemFoto): ItemComida {
  const { gramos } = item;
  return {
    busqueda: item.nombre,
    estado: 'no-aplica',
    estadoAsumido: false,
    cantidad: { gramos: Math.round(gramos) },
    estimado: {
      kcal: porCien(item.kcal, gramos, LIMITES_ALIMENTO.kcal100),
      proteinas: porCien(item.proteinas, gramos, 100),
      carbos: porCien(item.carbos, gramos, 100),
      grasas: porCien(item.grasas, gramos, 100),
    },
  };
}

export interface ItemResultado {
  alimento: Alimento;
  cantidad: Cantidad; // editable en la pantalla
  donde: DondeSeEncontro; // 'estimado' = no estaba en la base: valores aproximados de la IA
  confianza: number;
}

export function resolverItemsFoto(items: readonly ItemFoto[], base: BaseLocal): ItemResultado[] {
  return items.map((item) => {
    const { alimento, cantidad, donde } = buscarAlimentoDeItem(itemComidaDeFoto(item), base, FUENTE_ESTIMADO_FOTO);
    return { alimento, cantidad, donde, confianza: item.confianza };
  });
}

// El diario con los alimentos de la foto agregados a esa comida (para "Agregar al diario"; el diario
// anterior queda para el Deshacer).
export function registrosConFoto(
  registros: readonly RegistroComida[],
  dia: string,
  comida: Comida,
  items: readonly Pick<ItemResultado, 'alimento' | 'cantidad'>[],
  ahora: Date,
  hoy: string,
  crearId?: () => string,
): RegistroComida[] {
  return items.reduce<RegistroComida[]>(
    (diario, { alimento, cantidad }) =>
      agregarRegistro(diario, nuevoRegistro(dia, comida, alimento, cantidad, ahora, crearId?.()), hoy),
    [...registros],
  );
}

// ── Errores ──

export const SIN_COMIDA = 'No encontré comida en la foto. Probá con otra en la que se vea bien el plato.';
const PROBA_DE_NUEVO = 'No pudimos analizar la foto. Revisá tu conexión y probá de nuevo.';
const FALLO = 'No pudimos analizar la foto. Probá de nuevo en un momento.';

// Qué mostrar si falla el pedido. reintentar: si tiene sentido mandar la misma foto de nuevo (si no,
// conviene otra foto o esperar).
export function errorFoto(error: unknown): { mensaje: string; reintentar: boolean } {
  if (!(error instanceof ErrorApi)) return { mensaje: FALLO, reintentar: true };
  switch (error.tipo) {
    case 'limite': // 429: el mensaje de la API ("Llegaste al límite de 10 fotos por hoy…")
    case 'no-disponible':
    case 'sin-url':
      return { mensaje: error.message, reintentar: false };
    case 'red':
    case 'tiempo':
      return { mensaje: PROBA_DE_NUEVO, reintentar: true };
    case 'pedido':
      // 422: la IA no quiso analizarla. 400, 413 o 415: la foto no se pudo leer.
      return error.status === 422
        ? { mensaje: SIN_COMIDA, reintentar: false }
        : { mensaje: 'No pudimos leer la foto. Probá con otra.', reintentar: false };
    default:
      return { mensaje: FALLO, reintentar: true };
  }
}
