// Pedidos a Open Food Facts. La lectura de las respuestas está en openFoodFacts.ts (con tests).
import type { Alimento } from './alimentos';
import {
  leerRespuestaBusqueda,
  leerRespuestaProducto,
  urlBusqueda,
  urlProducto,
  USER_AGENT_OFF,
  type ResultadoCodigo,
} from './openFoodFacts';

const ESPERA_MS = 10000;

async function pedirJson(url: string, senal?: AbortSignal): Promise<unknown> {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), ESPERA_MS);
  const cancelar = () => control.abort();
  senal?.addEventListener('abort', cancelar);
  try {
    const respuesta = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT_OFF, Accept: 'application/json' },
      signal: control.signal,
    });
    // 404 también trae JSON (producto inexistente); otros errores, no.
    if (!respuesta.ok && respuesta.status !== 404) throw new Error(`HTTP ${respuesta.status}`);
    return await respuesta.json();
  } finally {
    clearTimeout(corte);
    senal?.removeEventListener('abort', cancelar);
  }
}

// Tira error si no hay conexión o el servidor no responde.
export async function pedirProducto(codigo: string, senal?: AbortSignal): Promise<ResultadoCodigo> {
  return leerRespuestaProducto(await pedirJson(urlProducto(codigo), senal));
}

// Los de Argentina y los del resto del mundo (los dos pedidos a la vez).
// Tira error sólo si fallan los dos pedidos.
export async function pedirBusqueda(
  texto: string,
  senal?: AbortSignal,
): Promise<{ argentina: Alimento[]; mundo: Alimento[] }> {
  const [ar, mundo] = await Promise.allSettled([
    pedirJson(urlBusqueda(texto, true), senal).then(leerRespuestaBusqueda),
    pedirJson(urlBusqueda(texto, false), senal).then(leerRespuestaBusqueda),
  ]);
  if (ar.status === 'rejected' && mundo.status === 'rejected') throw ar.reason;
  return {
    argentina: ar.status === 'fulfilled' ? ar.value : [],
    mundo: mundo.status === 'fulfilled' ? mundo.value : [],
  };
}
