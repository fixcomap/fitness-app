// La charla con el coach que se guarda en el celu (chatCoach:v1): los últimos 40 mensajes y, en los del
// coach, las acciones que propuso con su estado. El estado se guarda para que una acción no se aplique
// dos veces (ni al volver a abrir la app).
// Funciones puras.
import { ErrorApi } from '../api';
import { leerAccion, type AccionCoach, type RespuestaCoach } from './acciones';
import { MAXIMO_MENSAJES_GUARDADOS, type MensajeChat } from './contexto';

// pendiente: se puede aplicar. aplicada / cancelada: ya se decidió. caducada: pasó demasiado tiempo
// (la propuesta era para lo que había en ese momento).
export const ESTADOS_ACCION = ['pendiente', 'aplicada', 'cancelada', 'caducada'] as const;
export type EstadoAccion = (typeof ESTADOS_ACCION)[number];

export interface AccionGuardada {
  accion: AccionCoach;
  estado: EstadoAccion;
}

export interface MensajeGuardado extends MensajeChat {
  id: string;
  creado: string; // ISO
  acciones: AccionGuardada[]; // solo en los del coach
}

// Una propuesta que no se tocó en 24 h ya no se ofrece.
export const CADUCA_MS = 24 * 60 * 60 * 1000;

export function mensajeUsuario(texto: string, ahora: Date, id: string): MensajeGuardado {
  return { id, rol: 'usuario', texto: texto.trim(), creado: ahora.toISOString(), acciones: [] };
}

export function mensajeCoach(respuesta: RespuestaCoach, ahora: Date, id: string): MensajeGuardado {
  return {
    id,
    rol: 'coach',
    texto: respuesta.texto,
    creado: ahora.toISOString(),
    acciones: respuesta.acciones.map((accion) => ({ accion, estado: 'pendiente' })),
  };
}

// Agrega al final y se queda con los últimos 40.
export function agregarMensajes(historial: readonly MensajeGuardado[], nuevos: readonly MensajeGuardado[]): MensajeGuardado[] {
  return [...historial, ...nuevos].slice(-MAXIMO_MENSAJES_GUARDADOS);
}

// Las pendientes de hace más de 24 h pasan a caducadas. Devuelve el mismo historial si no cambió nada.
export function caducarViejas(historial: MensajeGuardado[], ahora: Date): MensajeGuardado[] {
  const limite = ahora.getTime() - CADUCA_MS;
  let cambio = false;
  const nuevo = historial.map((m) => {
    if (Date.parse(m.creado) >= limite || !m.acciones.some((a) => a.estado === 'pendiente')) return m;
    cambio = true;
    return { ...m, acciones: m.acciones.map((a) => (a.estado === 'pendiente' ? { ...a, estado: 'caducada' as const } : a)) };
  });
  return cambio ? nuevo : historial;
}

export function buscarAccion(historial: readonly MensajeGuardado[], mensajeId: string, accionId: string): AccionGuardada | null {
  return historial.find((m) => m.id === mensajeId)?.acciones.find((a) => a.accion.id === accionId) ?? null;
}

// Qué cambios de estado se permiten: solo se decide sobre una pendiente, y deshacer vuelve una aplicada
// a pendiente. Así una acción aplicada no se puede aplicar de nuevo.
const PERMITIDOS: Record<EstadoAccion, readonly EstadoAccion[]> = {
  pendiente: ['aplicada', 'cancelada', 'caducada'],
  aplicada: ['pendiente'],
  cancelada: [],
  caducada: [],
};

export function puedeCambiar(de: EstadoAccion, a: EstadoAccion): boolean {
  return PERMITIDOS[de].includes(a);
}

// El historial con la acción en el estado nuevo, o null si no existe o ese cambio no se permite.
// `accion` reemplaza a la guardada (por ejemplo, la versión editada que se aplicó).
export function cambiarEstadoAccion(
  historial: readonly MensajeGuardado[],
  mensajeId: string,
  accionId: string,
  estado: EstadoAccion,
  accion?: AccionCoach,
): MensajeGuardado[] | null {
  const actual = buscarAccion(historial, mensajeId, accionId);
  if (!actual || !puedeCambiar(actual.estado, estado)) return null;
  return historial.map((m) =>
    m.id !== mensajeId
      ? m
      : {
          ...m,
          acciones: m.acciones.map((a) =>
            a.accion.id === accionId ? { accion: accion ? { ...accion, id: accionId } : a.accion, estado } : a,
          ),
        },
  );
}

// ── Errores ──

export interface ErrorChat {
  mensaje: string;
  reintentar: boolean; // vale la pena volver a mandar lo mismo
}

const NO_DISPONIBLE = 'El coach no está disponible en este momento.';
const DESCONOCIDO = 'Algo falló. Probá de nuevo.';

// 429: el mensaje de la API (límite diario o demasiados seguidos). 503: el coach no está disponible.
// Sin red o si tardó demasiado: que pruebe de nuevo.
export function errorDeChat(e: unknown): ErrorChat {
  if (!(e instanceof ErrorApi)) return { mensaje: DESCONOCIDO, reintentar: true };
  switch (e.tipo) {
    case 'limite':
      return { mensaje: e.message, reintentar: false };
    case 'no-disponible':
      return { mensaje: NO_DISPONIBLE, reintentar: true };
    case 'red':
    case 'tiempo':
    case 'servidor':
    case 'respuesta':
      return { mensaje: e.message, reintentar: true };
    default:
      return { mensaje: e.message, reintentar: false };
  }
}

// ── Candado premium ──

// El coach es premium. En desarrollo (Expo Go) se puede desbloquear para probarlo; en un build de
// producción __DEV__ es false y el desbloqueo no cuenta nunca.
export function coachHabilitado(esPremium: boolean, desbloqueoDev: boolean, esDesarrollo: boolean = __DEV__): boolean {
  return esPremium || (esDesarrollo && desbloqueoDev);
}

// ── Lo guardado ──

type Objeto = Record<string, unknown>;
const esObjeto = (x: unknown): x is Objeto => typeof x === 'object' && x !== null && !Array.isArray(x);

function leerAccionGuardada(x: unknown): AccionGuardada | null {
  if (!esObjeto(x) || !ESTADOS_ACCION.includes(x.estado as EstadoAccion)) return null;
  const accion = leerAccion(x.accion);
  return accion ? { accion, estado: x.estado as EstadoAccion } : null;
}

function leerMensaje(x: unknown): MensajeGuardado | null {
  if (!esObjeto(x) || typeof x.id !== 'string' || (x.rol !== 'usuario' && x.rol !== 'coach')) return null;
  if (typeof x.texto !== 'string' || !x.texto.trim() || typeof x.creado !== 'string' || Number.isNaN(Date.parse(x.creado))) {
    return null;
  }
  const acciones =
    x.rol === 'coach' && Array.isArray(x.acciones)
      ? x.acciones.map(leerAccionGuardada).filter((a): a is AccionGuardada => a !== null)
      : [];
  return { id: x.id, rol: x.rol, texto: x.texto, creado: x.creado, acciones };
}

// Lo guardado en el celu: se descartan los mensajes (o las acciones) que no sean válidos.
export function leerChatGuardado(datos: unknown): MensajeGuardado[] {
  if (!Array.isArray(datos)) return [];
  return datos
    .map(leerMensaje)
    .filter((m): m is MensajeGuardado => m !== null)
    .slice(-MAXIMO_MENSAJES_GUARDADOS);
}
