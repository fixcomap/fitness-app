import ejemplo from './__fixtures__/respuesta-coach.json';
import { leerRespuestaCoach } from './acciones';
import { mensajeCoach, mensajeUsuario, type MensajeGuardado } from './chat';
import { MAXIMO_TEXTO_MENSAJE } from './contexto';
import { mensajesConPropuestas, resumenPropuestas } from './propuestas';
import type { Rutina } from '../entreno/rutinas';

const respuesta = leerRespuestaCoach(ejemplo.respuesta)!;
const rutinas = ejemplo.contexto.rutinas as Rutina[];
const ahora = new Date(2026, 10, 26, 10);

describe('resumen de lo que propuso el coach', () => {
  test('cada acción en pocas palabras, con su estado', () => {
    const acciones = mensajeCoach(respuesta, ahora, 'c1').acciones;
    acciones[0] = { ...acciones[0], estado: 'aplicada' };
    expect(resumenPropuestas(acciones, rutinas)).toBe(
      '[Propuse: crear "Piernas" (sábado, 4 ejercicios, aplicada); agregar 2 ejercicios a "Full body A" (pendiente); ' +
        'quitar 1 ejercicio de "Full body A" (pendiente); borrar "Full body B" (pendiente); ' +
        'registrar almuerzo del 2026-11-26 (2 alimentos, pendiente); cargar 5 km del 2026-11-25 (pendiente); ' +
        'cargar 3000 pasos del 2026-11-26 (pendiente)]',
    );
  });

  test('sin acciones no hay resumen; una rutina que ya no está se nombra igual', () => {
    expect(resumenPropuestas([], rutinas)).toBeNull();
    const borrar = mensajeCoach(respuesta, ahora, 'c1').acciones.filter((a) => a.accion.tipo === 'borrar_rutinas');
    expect(resumenPropuestas(borrar, [])).toBe('[Propuse: borrar una rutina que ya no está (pendiente)]');
  });
});

describe('la charla que va en el pedido', () => {
  test('los mensajes del coach con acciones llevan el resumen al final; el resto, igual', () => {
    const charla: MensajeGuardado[] = [
      mensajeUsuario('armame una rutina', ahora, 'u1'),
      mensajeCoach({ ...respuesta, texto: 'Te dejo el plan.', acciones: respuesta.acciones.slice(0, 1) }, ahora, 'c1'),
      mensajeUsuario('sí, dale', ahora, 'u2'),
    ];
    expect(mensajesConPropuestas(charla, rutinas)).toEqual([
      { rol: 'usuario', texto: 'armame una rutina' },
      { rol: 'coach', texto: 'Te dejo el plan.\n\n[Propuse: crear "Piernas" (sábado, 4 ejercicios, pendiente)]' },
      { rol: 'usuario', texto: 'sí, dale' },
    ]);
  });

  test('un texto largo se recorta para que el resumen entre en el máximo', () => {
    const largo = mensajeCoach({ ...respuesta, texto: 'x'.repeat(MAXIMO_TEXTO_MENSAJE) }, ahora, 'c1');
    const [m] = mensajesConPropuestas([largo], rutinas);
    expect(m.texto.length).toBeLessThanOrEqual(MAXIMO_TEXTO_MENSAJE);
    expect(m.texto.endsWith('(pendiente)]')).toBe(true);
  });
});
