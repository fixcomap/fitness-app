// Pedidos a Open Food Facts. La lectura de las respuestas está en openFoodFacts.ts (con tests).
import { normalizar } from './alimentos';
import {
  BUSQUEDA_VACIA,
  DURACION_CACHE_BUSQUEDA_MS,
  duracionCacheCodigo,
  errorLimite,
  esErrorLimite,
  esRespuestaLimite,
  guardarCache,
  leerCache,
  leerRespuestaBusqueda,
  leerRespuestaProducto,
  PAUSA_LIMITE_MS,
  urlBusqueda,
  urlProducto,
  USER_AGENT_OFF,
  type CacheOff,
  type ResultadoBusquedaOff,
  type ResultadoCodigo,
} from './openFoodFacts';

const ESPERA_MS = 10000;

type ResultadoBusqueda = { argentina: ResultadoBusquedaOff; mundo: ResultadoBusquedaOff };

// En memoria, mientras la app está abierta.
let pausaHasta = 0;
let cacheCodigos: CacheOff<ResultadoCodigo> = new Map();
let cacheBusquedas: CacheOff<ResultadoBusqueda> = new Map();

// Tira errorLimite() si Open Food Facts cortó por muchos pedidos (o si cortó hace poco).
async function pedirJson(url: string, senal?: AbortSignal): Promise<unknown> {
  if (Date.now() < pausaHasta) throw errorLimite();
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), ESPERA_MS);
  const cancelar = () => control.abort();
  senal?.addEventListener('abort', cancelar);
  try {
    const respuesta = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT_OFF, Accept: 'application/json' },
      signal: control.signal,
    });
    const cuerpo = await respuesta.text();
    if (esRespuestaLimite(respuesta.status, cuerpo)) {
      pausaHasta = Date.now() + PAUSA_LIMITE_MS;
      throw errorLimite();
    }
    // 404 también trae JSON (producto inexistente); otros errores, no.
    if (!respuesta.ok && respuesta.status !== 404) throw new Error(`HTTP ${respuesta.status}`);
    return JSON.parse(cuerpo);
  } finally {
    clearTimeout(corte);
    senal?.removeEventListener('abort', cancelar);
  }
}

// Tira error si no hay conexión, si el servidor no responde o si cortó por muchos pedidos.
export async function pedirProducto(codigo: string, senal?: AbortSignal): Promise<ResultadoCodigo> {
  const guardado = leerCache(cacheCodigos, codigo, Date.now());
  if (guardado) return guardado;
  const resultado = leerRespuestaProducto(await pedirJson(urlProducto(codigo), senal));
  cacheCodigos = guardarCache(cacheCodigos, codigo, resultado, Date.now() + duracionCacheCodigo(resultado));
  return resultado;
}

// Los de Argentina y los del resto del mundo (los dos pedidos a la vez).
// Tira error sólo si fallan los dos pedidos (el de límite, si alguno lo fue).
export async function pedirBusqueda(texto: string, senal?: AbortSignal): Promise<ResultadoBusqueda> {
  const clave = normalizar(texto);
  const guardado = leerCache(cacheBusquedas, clave, Date.now());
  if (guardado) return guardado;
  const [ar, mundo] = await Promise.allSettled([
    pedirJson(urlBusqueda(texto, true), senal).then(leerRespuestaBusqueda),
    pedirJson(urlBusqueda(texto, false), senal).then(leerRespuestaBusqueda),
  ]);
  if (ar.status === 'rejected' && mundo.status === 'rejected') {
    throw esErrorLimite(mundo.reason) ? mundo.reason : ar.reason;
  }
  const resultado = {
    argentina: ar.status === 'fulfilled' ? ar.value : BUSQUEDA_VACIA,
    mundo: mundo.status === 'fulfilled' ? mundo.value : BUSQUEDA_VACIA,
  };
  // Sólo se guarda si salieron los dos.
  if (ar.status === 'fulfilled' && mundo.status === 'fulfilled') {
    cacheBusquedas = guardarCache(cacheBusquedas, clave, resultado, Date.now() + DURACION_CACHE_BUSQUEDA_MS);
  }
  return resultado;
}
