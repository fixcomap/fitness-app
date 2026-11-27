// La respuesta de POST /comida/foto ({ items, total }), leída sin confiar en lo que llega.
// Aparte de fotoIa.ts para que el cliente de la API (api.ts) la use sin importar a quien lo importa.
// Funciones puras.

// Un alimento de la foto, con los valores de la porción que se ve (no por 100 g).
export interface ItemFoto {
  nombre: string;
  gramos: number;
  kcal: number;
  proteinas: number;
  carbos: number;
  grasas: number;
  confianza: number; // de 0 a 1
}

const numero = (x: unknown, min: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= min;

function leerItem(x: unknown): ItemFoto | null {
  if (!x || typeof x !== 'object') return null;
  const i = x as Record<string, unknown>;
  const nombre = typeof i.nombre === 'string' ? i.nombre.trim() : '';
  if (!nombre || !numero(i.gramos, 0) || i.gramos === 0) return null;
  if (!numero(i.kcal, 0) || !numero(i.proteinas, 0) || !numero(i.carbos, 0) || !numero(i.grasas, 0)) return null;
  const confianza = numero(i.confianza, 0) ? Math.min(i.confianza, 1) : 0;
  return {
    nombre,
    gramos: i.gramos,
    kcal: i.kcal,
    proteinas: i.proteinas,
    carbos: i.carbos,
    grasas: i.grasas,
    confianza,
  };
}

// Los alimentos de la respuesta ({ items, total }); los que no se entienden se saltean. null si no vino la
// lista. Una lista vacía es que no hay comida en la foto.
export function leerResultadoFoto(datos: unknown): ItemFoto[] | null {
  if (!datos || typeof datos !== 'object' || !Array.isArray((datos as { items?: unknown }).items)) return null;
  return (datos as { items: unknown[] }).items.map(leerItem).filter((i): i is ItemFoto => i !== null);
}
