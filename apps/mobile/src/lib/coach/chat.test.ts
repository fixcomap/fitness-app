import { ErrorApi, errorDeRespuesta } from '../api';
import ejemplo from './__fixtures__/respuesta-coach.json';
import { leerRespuestaCoach, type AccionCoach } from './acciones';
import {
  agregarMensajes,
  CADUCA_MS,
  caducarViejas,
  cambiarEstadoAccion,
  coachHabilitado,
  errorDeChat,
  leerChatGuardado,
  mensajeCoach,
  mensajeUsuario,
  type MensajeGuardado,
} from './chat';
import { mensajesParaApi } from './contexto';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));

const ahora = new Date(2026, 10, 26, 21, 30);
const respuesta = leerRespuestaCoach(ejemplo.respuesta)!;
const pasos: AccionCoach = { id: 'p1', tipo: 'cargar_pasos', dia: '2026-11-26', unidad: 'km', valor: 3 };
const conPasos = mensajeCoach({ texto: 'Cargo la caminata.', acciones: [pasos], descartados: [] }, ahora, 'c1');

describe('mensajes', () => {
  test('los del coach traen sus acciones pendientes', () => {
    const m = mensajeCoach(respuesta, ahora, 'c1');
    expect(m.rol).toBe('coach');
    expect(m.acciones.length).toBe(respuesta.acciones.length);
    expect(m.acciones.every((a) => a.estado === 'pendiente')).toBe(true);
  });

  test('el del usuario sin espacios de más y sin acciones', () => {
    expect(mensajeUsuario('  hola  ', ahora, 'u1')).toEqual({
      id: 'u1',
      rol: 'usuario',
      texto: 'hola',
      creado: ahora.toISOString(),
      acciones: [],
    });
  });

  test('se guardan los últimos 40', () => {
    const muchos = Array.from({ length: 45 }, (_, i) => mensajeUsuario(`m${i}`, ahora, `u${i}`));
    const historial = agregarMensajes(muchos.slice(0, 39), muchos.slice(39));
    expect(historial).toHaveLength(40);
    expect(historial[0].id).toBe('u5');
    expect(historial.at(-1)?.id).toBe('u44');
  });

  test('a la API van rol y texto (los últimos 10)', () => {
    const muchos = Array.from({ length: 40 }, (_, i) =>
      i % 2 === 0 ? mensajeUsuario(`u${i}`, ahora, `u${i}`) : mensajeCoach({ ...respuesta, texto: `c${i}` }, ahora, `c${i}`),
    );
    const enviados = mensajesParaApi(muchos);
    expect(enviados).toHaveLength(10);
    expect(enviados[0]).toEqual({ rol: 'usuario', texto: 'u30' }); // sin id, fecha ni acciones
  });
});

describe('estado de cada acción', () => {
  const historial = [mensajeUsuario('caminé 3 km', ahora, 'u1'), conPasos];

  test('pendiente → aplicada, y no se puede aplicar dos veces', () => {
    const aplicado = cambiarEstadoAccion(historial, 'c1', 'p1', 'aplicada')!;
    expect(aplicado[1].acciones[0].estado).toBe('aplicada');
    expect(cambiarEstadoAccion(aplicado, 'c1', 'p1', 'aplicada')).toBeNull();
    expect(cambiarEstadoAccion(aplicado, 'c1', 'p1', 'cancelada')).toBeNull();
  });

  test('deshacer vuelve una aplicada a pendiente', () => {
    const aplicado = cambiarEstadoAccion(historial, 'c1', 'p1', 'aplicada')!;
    expect(cambiarEstadoAccion(aplicado, 'c1', 'p1', 'pendiente')?.[1].acciones[0].estado).toBe('pendiente');
  });

  test('cancelada y caducada ya no cambian', () => {
    const cancelado = cambiarEstadoAccion(historial, 'c1', 'p1', 'cancelada')!;
    expect(cambiarEstadoAccion(cancelado, 'c1', 'p1', 'aplicada')).toBeNull();
    const caducado = cambiarEstadoAccion(historial, 'c1', 'p1', 'caducada')!;
    expect(cambiarEstadoAccion(caducado, 'c1', 'p1', 'aplicada')).toBeNull();
  });

  test('guarda la versión editada con el mismo id', () => {
    const editada: AccionCoach = { ...pasos, id: 'otro', valor: 5 };
    const aplicado = cambiarEstadoAccion(historial, 'c1', 'p1', 'aplicada', editada)!;
    expect(aplicado[1].acciones[0].accion).toEqual({ ...pasos, valor: 5 });
  });

  test('null si no existe', () => {
    expect(cambiarEstadoAccion(historial, 'c1', 'nada', 'aplicada')).toBeNull();
    expect(cambiarEstadoAccion(historial, 'nada', 'p1', 'aplicada')).toBeNull();
  });

  test('las pendientes de más de 24 h caducan; las decididas no cambian', () => {
    const viejo = new Date(ahora.getTime() - CADUCA_MS - 1);
    const otro: AccionCoach = { ...pasos, id: 'p2' };
    const m: MensajeGuardado = {
      ...mensajeCoach({ texto: 'x', acciones: [pasos, otro], descartados: [] }, viejo, 'c0'),
    };
    const conUnaAplicada = cambiarEstadoAccion([m], 'c0', 'p2', 'aplicada')!;
    const caducado = caducarViejas([...conUnaAplicada, conPasos], ahora);
    expect(caducado[0].acciones.map((a) => a.estado)).toEqual(['caducada', 'aplicada']);
    expect(caducado[1]).toBe(conPasos);
  });

  test('sin nada para caducar devuelve el mismo historial', () => {
    expect(caducarViejas(historial, ahora)).toBe(historial);
  });
});

describe('errores', () => {
  test('429 con el mensaje de la API, sin reintentar', () => {
    const e = errorDeRespuesta(429, { error: 'Llegaste al límite de 30 mensajes por hoy.' });
    expect(errorDeChat(e)).toEqual({ mensaje: 'Llegaste al límite de 30 mensajes por hoy.', reintentar: false });
  });

  test('503: el coach no está disponible', () => {
    const e = errorDeRespuesta(503, { error: 'La IA no está disponible en este momento' });
    expect(errorDeChat(e).mensaje).toBe('El coach no está disponible en este momento.');
  });

  test('sin red o si tarda: probá de nuevo', () => {
    expect(errorDeChat(new ErrorApi('red', 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.'))).toEqual({
      mensaje: 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.',
      reintentar: true,
    });
    expect(errorDeChat(new ErrorApi('tiempo', 'El coach tardó demasiado en responder. Probá de nuevo.')).reintentar).toBe(true);
  });

  test('un error que no es de la API', () => {
    expect(errorDeChat(new TypeError('x'))).toEqual({ mensaje: 'Algo falló. Probá de nuevo.', reintentar: true });
  });
});

describe('candado premium', () => {
  test('premium siempre puede', () => {
    expect(coachHabilitado(true, false, false)).toBe(true);
  });

  test('en desarrollo se puede desbloquear', () => {
    expect(coachHabilitado(false, true, true)).toBe(true);
    expect(coachHabilitado(false, false, true)).toBe(false);
  });

  test('en un build de producción el desbloqueo no cuenta', () => {
    expect(coachHabilitado(false, true, false)).toBe(false);
  });
});

describe('lo guardado', () => {
  test('ida y vuelta', () => {
    const historial = [mensajeUsuario('hola', ahora, 'u1'), mensajeCoach(respuesta, ahora, 'c1')];
    expect(leerChatGuardado(JSON.parse(JSON.stringify(historial)))).toEqual(historial);
  });

  test('descarta mensajes y acciones inválidos', () => {
    const guardado = [
      { id: 'u1', rol: 'usuario', texto: 'hola', creado: ahora.toISOString(), acciones: [] },
      { id: 'x', rol: 'otro', texto: 'hola', creado: ahora.toISOString() },
      { id: 'y', rol: 'coach', texto: '', creado: ahora.toISOString() },
      {
        id: 'c1',
        rol: 'coach',
        texto: 'ok',
        creado: ahora.toISOString(),
        acciones: [
          { accion: pasos, estado: 'aplicada' },
          { accion: pasos, estado: 'rara' },
          { accion: { id: 'z', tipo: 'inventada' }, estado: 'pendiente' },
        ],
      },
    ];
    const leido = leerChatGuardado(guardado);
    expect(leido.map((m) => m.id)).toEqual(['u1', 'c1']);
    expect(leido[1].acciones).toEqual([{ accion: pasos, estado: 'aplicada' }]);
  });

  test('cualquier otra cosa: vacío', () => {
    expect(leerChatGuardado(null)).toEqual([]);
    expect(leerChatGuardado({})).toEqual([]);
  });
});
