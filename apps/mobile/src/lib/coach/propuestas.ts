// Lo que el coach propuso antes, para que lo vea en la charla: cada mensaje suyo con acciones lleva al
// final un resumen corto y el estado de cada una ("[Propuse: crear "Piernas" (lunes, 5 ejercicios,
// pendiente); borrar "Full body A" (pendiente)]"). Así, si el usuario solo confirma, el coach sabe que
// las tarjetas ya están y no arma otro plan. Funciones puras.
import { NOMBRE_COMIDA } from '../comida/diario';
import { NOMBRE_DIA, type Rutina } from '../entreno/rutinas';
import type { AccionGuardada, MensajeGuardado } from './chat';
import { MAXIMO_TEXTO_MENSAJE, type MensajeChat } from './contexto';

const MAXIMO_RESUMEN = 600;

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function lineaPropuesta({ accion, estado }: AccionGuardada, rutinas: readonly Rutina[]): string {
  const rutina = (id: string) => {
    const r = rutinas.find((x) => x.id === id);
    return r ? `"${r.nombre}"` : 'una rutina que ya no está';
  };
  switch (accion.tipo) {
    case 'crear_rutina': {
      const dia = accion.dia === null ? 'sin día' : NOMBRE_DIA[accion.dia];
      return `crear "${accion.nombre}" (${dia}, ${plural(accion.ejercicios.length, 'ejercicio', 'ejercicios')}, ${estado})`;
    }
    case 'agregar_ejercicios':
      return `agregar ${plural(accion.ejercicios.length, 'ejercicio', 'ejercicios')} a ${rutina(accion.rutinaId)} (${estado})`;
    case 'quitar_ejercicios':
      return `quitar ${plural(accion.ejercicioIds.length, 'ejercicio', 'ejercicios')} de ${rutina(accion.rutinaId)} (${estado})`;
    case 'borrar_rutinas':
      return `borrar ${accion.rutinaIds.map(rutina).join(', ')} (${estado})`;
    case 'registrar_comida':
      return `registrar ${NOMBRE_COMIDA[accion.comida].toLowerCase()} del ${accion.dia} (${plural(accion.items.length, 'alimento', 'alimentos')}, ${estado})`;
    case 'cargar_pasos':
      return `cargar ${accion.valor} ${accion.unidad} del ${accion.dia} (${estado})`;
  }
}

// El resumen de las acciones de un mensaje del coach, o null si no tiene.
export function resumenPropuestas(acciones: readonly AccionGuardada[], rutinas: readonly Rutina[]): string | null {
  if (acciones.length === 0) return null;
  const resumen = `[Propuse: ${acciones.map((a) => lineaPropuesta(a, rutinas)).join('; ')}]`;
  return resumen.length <= MAXIMO_RESUMEN ? resumen : `${resumen.slice(0, MAXIMO_RESUMEN - 2)}…]`;
}

// La charla para el pedido: a los mensajes del coach con acciones se les suma el resumen al final (el
// texto se recorta antes, para que el resumen siempre entre en el máximo que acepta la API).
export function mensajesConPropuestas(historial: readonly MensajeGuardado[], rutinas: readonly Rutina[]): MensajeChat[] {
  return historial.map((m) => {
    const resumen = m.rol === 'coach' ? resumenPropuestas(m.acciones, rutinas) : null;
    if (!resumen) return { rol: m.rol, texto: m.texto };
    const texto = m.texto.trim().slice(0, MAXIMO_TEXTO_MENSAJE - resumen.length - 2);
    return { rol: m.rol, texto: `${texto}\n\n${resumen}` };
  });
}
