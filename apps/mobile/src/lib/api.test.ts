import ejemplo from './coach/__fixtures__/respuesta-coach.json';
import pedido from './coach/__fixtures__/pedido-coach.json';
import type { PedidoCoach } from './coach/contexto';
import { randomUUID } from 'expo-crypto';

import { crearClienteApi, ErrorApi, errorDeRespuesta, esIdDispositivo, nuevoIdDispositivo, urlDe } from './api';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));
const randomUUIDFalso = randomUUID as jest.MockedFunction<typeof randomUUID>;

const ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e';
const URL = 'http://192.168.0.10:3000';

// Un fetch falso que responde lo que se le pase y guarda lo que le pidieron.
function fetchFalso(status: number, cuerpo: unknown) {
  const pedidos: { url: string; init: RequestInit }[] = [];
  const falso = (async (url: string, init: RequestInit) => {
    pedidos.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (cuerpo === undefined) throw new SyntaxError('no es JSON');
        return cuerpo;
      },
    } as Response;
  }) as unknown as typeof fetch;
  return { falso, pedidos };
}
const cliente = (f: typeof fetch, url = URL, esperaMs?: number) => crearClienteApi({ url, fetch: f, dispositivo: async () => ID, esperaMs });
const coach = (f: typeof fetch, url?: string) => cliente(f, url).coach(pedido as PedidoCoach);
const errorDe = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error('no falló');
};

test('urlDe: une la base con la ruta, sin barras de más; sin http(s) no hay URL', () => {
  expect(urlDe('http://192.168.0.10:3000/', '/coach')).toBe('http://192.168.0.10:3000/coach');
  expect(urlDe(' https://api.ejemplo.com ', 'coach')).toBe('https://api.ejemplo.com/coach');
  expect(urlDe('', '/coach')).toBeNull();
  expect(urlDe('192.168.0.10:3000', '/coach')).toBeNull();
});

describe('errorDeRespuesta', () => {
  test('cada status con su tipo', () => {
    expect([429, 503, 500, 502, 400, 413].map((s) => errorDeRespuesta(s, null).tipo)).toEqual([
      'limite',
      'no-disponible',
      'servidor',
      'servidor',
      'pedido',
      'pedido',
    ]);
  });

  test('usa el mensaje de la API solo cuando está escrito para el usuario', () => {
    const limite = { error: 'Llegaste al límite de 30 mensajes por hoy. Mañana tenés 30 mensajes de nuevo.' };
    expect(errorDeRespuesta(429, limite).message).toBe(limite.error);
    expect(errorDeRespuesta(422, { error: 'No puedo ayudarte con eso.' }).message).toBe('No puedo ayudarte con eso.');
    // Un 400 trae detalles técnicos ("contexto.hoy: …"): no se muestran.
    expect(errorDeRespuesta(400, { error: 'Pedido inválido', detalles: ['contexto.hoy'] }).message).toBe('No pudimos mandar el mensaje.');
    expect(errorDeRespuesta(429, 'hola').message).toBe('Llegaste al límite por ahora. Probá más tarde.');
    expect(errorDeRespuesta(503, null).status).toBe(503);
  });
});

describe('ID de dispositivo', () => {
  test('el id nuevo es el randomUUID() de expo-crypto', () => {
    randomUUIDFalso.mockReturnValueOnce(ID).mockReturnValueOnce('9b1d0c3a-7e2f-4a6b-b5c4-1d2e3f4a5b6c');
    expect(nuevoIdDispositivo()).toBe(ID);
    expect(nuevoIdDispositivo()).toBe('9b1d0c3a-7e2f-4a6b-b5c4-1d2e3f4a5b6c');
    expect(randomUUIDFalso).toHaveBeenCalledTimes(2);
  });

  test('esIdDispositivo descarta lo que no es un UUID v4', () => {
    expect(esIdDispositivo(ID)).toBe(true);
    expect(esIdDispositivo('hola')).toBe(false);
    expect(esIdDispositivo(null)).toBe(false);
    expect(esIdDispositivo(ID.toUpperCase())).toBe(false);
  });
});

describe('cliente', () => {
  test('POST /coach con JSON y X-Dispositivo; devuelve la respuesta leída', async () => {
    const { falso, pedidos } = fetchFalso(200, ejemplo.respuesta);
    const r = await coach(falso);
    expect(r.acciones).toHaveLength(7);
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].url).toBe('http://192.168.0.10:3000/coach');
    expect(pedidos[0].init.method).toBe('POST');
    expect(pedidos[0].init.headers).toEqual({ 'Content-Type': 'application/json', 'X-Dispositivo': ID });
    expect(JSON.parse(pedidos[0].init.body as string)).toEqual(pedido);
  });

  test('sin URL configurada no pide nada', async () => {
    const { falso, pedidos } = fetchFalso(200, ejemplo.respuesta);
    const e = await errorDe(coach(falso, ''));
    expect(e).toBeInstanceOf(ErrorApi);
    expect((e as ErrorApi).tipo).toBe('sin-url');
    expect(pedidos).toHaveLength(0);
  });

  test('los errores de la API, de red y de respuesta', async () => {
    const limite = { error: 'Llegaste al límite de 30 mensajes por hoy. Mañana tenés 30 mensajes de nuevo.' };
    expect(await errorDe(coach(fetchFalso(429, limite).falso))).toMatchObject({ tipo: 'limite', message: limite.error, status: 429 });
    expect(await errorDe(coach(fetchFalso(502, undefined).falso))).toMatchObject({ tipo: 'servidor', status: 502 });
    expect(await errorDe(coach(fetchFalso(200, { acciones: [] }).falso))).toMatchObject({ tipo: 'respuesta' });
    const sinRed = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    expect(await errorDe(coach(sinRed))).toMatchObject({ tipo: 'red' });
  });

  test('corta si tarda más de lo permitido', async () => {
    const lento = ((_url: string, init: RequestInit) =>
      new Promise((_resolver, rechazar) => {
        if (init.signal?.aborted) rechazar(new Error('abortado'));
        init.signal?.addEventListener('abort', () => rechazar(new Error('abortado')));
      })) as unknown as typeof fetch;
    const e = await errorDe(cliente(lento, URL, 10).coach(pedido as PedidoCoach));
    expect(e).toMatchObject({ tipo: 'tiempo' });
  });

  test('si lo cancela quien pidió, no lo convierte en un error para mostrar', async () => {
    const lento = ((_url: string, init: RequestInit) =>
      new Promise((_resolver, rechazar) => {
        if (init.signal?.aborted) rechazar(new Error('abortado'));
        init.signal?.addEventListener('abort', () => rechazar(new Error('abortado')));
      })) as unknown as typeof fetch;
    const control = new AbortController();
    const p = cliente(lento).coach(pedido as PedidoCoach, control.signal);
    control.abort();
    const e = await errorDe(p);
    expect(e).not.toBeInstanceOf(ErrorApi);
  });
});
