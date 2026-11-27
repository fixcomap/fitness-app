// Cliente de la API propia (apps/api). La URL sale de EXPO_PUBLIC_API_URL (apps/mobile/.env, que no va
// al repo; en EXPO_PUBLIC_ solo va la URL, nunca claves: Expo la mete en el código de la app).
// Cada pedido lleva X-Dispositivo: un UUID que genera la app la primera vez y guarda en el celu.
// La lectura de respuestas y errores son funciones puras (con tests); crearClienteApi recibe fetch.
import { randomUUID } from 'expo-crypto';

import { leerRespuestaCoach, type RespuestaCoach } from './coach/acciones';
import type { PedidoCoach } from './coach/contexto';

export const URL_API = process.env.EXPO_PUBLIC_API_URL ?? '';
// El coach tarda unos segundos; con mala señal, un poco más.
export const ESPERA_MS = 30_000;

export type TipoErrorApi =
  | 'sin-url' // falta EXPO_PUBLIC_API_URL
  | 'red' // sin conexión o la API no responde
  | 'tiempo' // tardó más de ESPERA_MS
  | 'limite' // 429: límite diario o demasiados pedidos seguidos
  | 'no-disponible' // 503: la IA está apagada
  | 'pedido' // 4xx: lo que mandó la app no es válido
  | 'servidor' // 5xx
  | 'respuesta'; // respondió 200 con algo que no se entiende

export class ErrorApi extends Error {
  constructor(
    readonly tipo: TipoErrorApi,
    mensaje: string,
    readonly status: number | null = null,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

const MENSAJES: Record<TipoErrorApi, string> = {
  'sin-url': 'Falta configurar la dirección de la API.',
  red: 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.',
  tiempo: 'El coach tardó demasiado en responder. Probá de nuevo.',
  limite: 'Llegaste al límite por ahora. Probá más tarde.',
  'no-disponible': 'El coach no está disponible en este momento.',
  pedido: 'No pudimos mandar el mensaje.',
  servidor: 'Algo falló del lado del coach. Probá de nuevo.',
  respuesta: 'No entendimos la respuesta del coach. Probá de nuevo.',
};

// "http://192.168.0.10:3000/" + "/coach" → "http://192.168.0.10:3000/coach". null si la base no es http(s).
export function urlDe(base: string, ruta: string): string | null {
  const limpia = base.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^\s/]+/.test(limpia)) return null;
  return `${limpia}/${ruta.replace(/^\/+/, '')}`;
}

// El error para un status que no es 2xx. Usa el mensaje de la API si lo trae (por ejemplo el del límite
// diario: "Llegaste al límite de 30 mensajes por hoy…") en los casos en que está escrito para el usuario.
export function errorDeRespuesta(status: number, cuerpo: unknown): ErrorApi {
  const tipo: TipoErrorApi =
    status === 429 ? 'limite' : status === 503 ? 'no-disponible' : status >= 500 ? 'servidor' : 'pedido';
  const deLaApi =
    typeof cuerpo === 'object' && cuerpo !== null && typeof (cuerpo as { error?: unknown }).error === 'string'
      ? (cuerpo as { error: string }).error.trim()
      : '';
  const paraElUsuario = tipo === 'limite' || tipo === 'no-disponible' || status === 422;
  return new ErrorApi(tipo, paraElUsuario && deLaApi ? deLaApi : MENSAJES[tipo], status);
}

// ── ID de dispositivo ──

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function esIdDispositivo(x: unknown): x is string {
  return typeof x === 'string' && UUID.test(x);
}

// UUID v4 con el generador criptográfico del sistema (expo-crypto).
export function nuevoIdDispositivo(): string {
  return randomUUID();
}

// ── Cliente ──

export interface OpcionesCliente {
  url?: string; // por defecto URL_API
  fetch?: typeof fetch;
  dispositivo: () => Promise<string>; // leerIdDispositivo de almacenamiento.ts
  esperaMs?: number;
}

export interface ClienteApi {
  coach: (pedido: PedidoCoach, senal?: AbortSignal) => Promise<RespuestaCoach>;
}

export function crearClienteApi({ url = URL_API, fetch: pedir = fetch, dispositivo, esperaMs = ESPERA_MS }: OpcionesCliente): ClienteApi {
  async function postJson(ruta: string, cuerpo: unknown, senal?: AbortSignal): Promise<unknown> {
    const destino = urlDe(url, ruta);
    if (!destino) throw new ErrorApi('sin-url', MENSAJES['sin-url']);
    const control = new AbortController();
    let porTiempo = false;
    const corte = setTimeout(() => {
      porTiempo = true;
      control.abort();
    }, esperaMs);
    const cancelar = () => control.abort();
    if (senal?.aborted) control.abort();
    senal?.addEventListener('abort', cancelar);
    try {
      let respuesta: Response;
      try {
        respuesta = await pedir(destino, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Dispositivo': await dispositivo() },
          body: JSON.stringify(cuerpo),
          signal: control.signal,
        });
      } catch (e) {
        if (senal?.aborted) throw e; // lo canceló quien pidió: no es un error para mostrar
        throw new ErrorApi(porTiempo ? 'tiempo' : 'red', MENSAJES[porTiempo ? 'tiempo' : 'red']);
      }
      const datos: unknown = await respuesta.json().catch(() => null);
      if (!respuesta.ok) throw errorDeRespuesta(respuesta.status, datos);
      return datos;
    } finally {
      clearTimeout(corte);
      senal?.removeEventListener('abort', cancelar);
    }
  }

  return {
    async coach(pedido, senal) {
      const respuesta = leerRespuestaCoach(await postJson('/coach', pedido, senal));
      if (!respuesta) throw new ErrorApi('respuesta', MENSAJES.respuesta, 200);
      return respuesta;
    },
  };
}
