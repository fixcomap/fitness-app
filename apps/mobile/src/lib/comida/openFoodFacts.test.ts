// Con respuestas reales de Open Food Facts guardadas en __fixtures__ (sin internet).
import busquedaAlfajor from './__fixtures__/off-busqueda-alfajor.json';
import productoBonobon from './__fixtures__/off-producto-bonobon.json';
import productoNoExiste from './__fixtures__/off-producto-no-existe.json';
import productoOk from './__fixtures__/off-producto-ok.json';
import { ALIMENTOS_CASEROS, type Alimento } from './alimentos';
import {
  alimentoDesdeOff,
  buscarGuardados,
  duracionCacheCodigo,
  errorLimite,
  esErrorLimite,
  esRespuestaLimite,
  guardarCache,
  leerCache,
  MAXIMO_CACHE,
  type CacheOff,
  buscarPorCodigo,
  codigoValido,
  combinarResultados,
  consultaBusqueda,
  etiquetaMarca,
  leerMarca,
  leerPorcionOff,
  leerProductosGuardados,
  leerRespuestaBusqueda,
  leerRespuestaProducto,
  recordarProducto,
  urlBusqueda,
  urlProducto,
} from './openFoodFacts';

test('código de barras válido', () => {
  expect(codigoValido('7790040613607')).toBe(true);
  expect(codigoValido('77958341')).toBe(true);
  expect(codigoValido('1234')).toBe(false);
  expect(codigoValido('77958a41')).toBe(false);
});

test('direcciones', () => {
  expect(urlProducto('7790040613607')).toMatch(
    /^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/7790040613607\.json\?fields=code,/,
  );
  const ar = new URL(urlBusqueda('alfajor', true));
  expect(ar.host).toBe('search.openfoodfacts.org');
  expect(ar.searchParams.get('q')).toBe('((alfajor) OR brands:"alfajor") AND countries:"en:argentina"');
  expect(new URL(urlBusqueda('alfajor', false)).searchParams.get('q')).toBe('(alfajor) OR brands:"alfajor"');
});

test('marca como la guarda Open Food Facts', () => {
  expect(etiquetaMarca('La Serenísima')).toBe('la-serenisima');
  expect(etiquetaMarca("Lay's")).toBe('lay-s');
  expect(etiquetaMarca('  ')).toBe('');
});

describe('consulta de búsqueda', () => {
  test('una palabra: también como marca', () => {
    expect(consultaBusqueda('Casancrem')).toBe('(casancrem) OR brands:"casancrem"');
  });

  test('sin apóstrofos ni espacios', () => {
    expect(consultaBusqueda("Lay's")).toBe(`(lay's) OR (lays) OR brands:"lay-s" OR brands:"lays"`);
    expect(consultaBusqueda('lay s').split(' OR ')).toEqual(expect.arrayContaining(['(lays)', 'brands:"lays"']));
  });

  test('producto + marca, en los dos órdenes', () => {
    const partes = consultaBusqueda('manteca la serenisima').split(' OR ');
    expect(partes[0]).toBe('(manteca la serenisima)');
    expect(partes).toContain('(manteca brands:"la-serenisima")');
    expect(partes).toContain('(la serenisima brands:"manteca")');
    expect(partes).toContain('(manteca la brands:"serenisima")');
    expect(consultaBusqueda('papas krachitos').split(' OR ')).toContain('(papas brands:"krachitos")');
  });

  test('sin operadores de la búsqueda', () => {
    expect(consultaBusqueda('alfajor "x"').startsWith('(alfajor x)')).toBe(true);
    expect(consultaBusqueda('coca-cola:*').startsWith('(coca cola)')).toBe(true);
    expect(consultaBusqueda('a\\b (c)').startsWith('(a b c)')).toBe(true);
    // "or" escrito por el usuario queda en minúsculas: no es un operador
    expect(consultaBusqueda('pan OR queso').startsWith('(pan or queso)')).toBe(true);
    expect(consultaBusqueda(' "" ')).toBe('');
  });

  test('con más de 5 palabras no se parte', () => {
    expect(consultaBusqueda('uno dos tres cuatro cinco').split(' OR ')).toHaveLength(12);
    expect(consultaBusqueda('uno dos tres cuatro cinco seis').split(' OR ')).toHaveLength(4);
  });
});

test('marca', () => {
  expect(leerMarca('Arcor, Prestopronta')).toBe('Arcor');
  expect(leerMarca(['xx:bon-o-bon', 'xx:Arcor'])).toBe('Bon o bon');
  expect(leerMarca(['vimar'])).toBe('Vimar');
  expect(leerMarca(undefined)).toBeNull();
});

test('porción declarada en el envase', () => {
  expect(leerPorcionOff('1 alfajor (40 g)', 40)).toEqual({
    nombre: 'alfajor',
    plural: 'alfajores',
    gramos: 40,
    estimada: false,
  });
  expect(leerPorcionOff('1 galletita (8 g)', '8')).toEqual({
    nombre: 'galletita',
    plural: 'galletitas',
    gramos: 8,
    estimada: false,
  });
  expect(leerPorcionOff('60.0g', 60)).toEqual({ nombre: 'porción', plural: 'porciones', gramos: 60, estimada: false });
  expect(leerPorcionOff('60.0g', 0)).toBeNull();
  expect(leerPorcionOff(undefined, undefined)).toBeNull();
});

describe('producto por código', () => {
  test('encontrado: kcal y macros cada 100 g, con su porción', () => {
    expect(leerRespuestaProducto(productoOk)).toEqual({
      tipo: 'encontrado',
      alimento: {
        id: 'off:77958341',
        nombre: 'Alfajor',
        origen: 'envasado',
        marca: 'Vimar',
        codigo: '77958341',
        imagen: null,
        kcal: 355,
        proteinas: 5.8,
        carbos: 60,
        grasas: 10.3,
        porciones: [{ nombre: 'porción', plural: 'porciones', gramos: 60, estimada: false }],
        fuente: 'Open Food Facts',
      },
    });
  });

  test('con nombre en castellano, imagen y porción con nombre', () => {
    const r = leerRespuestaProducto(productoBonobon);
    expect(r.tipo).toBe('encontrado');
    if (r.tipo !== 'encontrado') return;
    expect(r.alimento).toMatchObject({ nombre: 'Alfajor Blanco', marca: 'Bon o Bon', kcal: 507 });
    expect(r.alimento.imagen).toMatch(/^https:\/\/images\.openfoodfacts\.org\//);
    expect(r.alimento.porciones[0]).toMatchObject({ nombre: 'alfajor', gramos: 40 });
  });

  test('no existe', () => {
    expect(leerRespuestaProducto(productoNoExiste)).toEqual({ tipo: 'no-encontrado' });
    expect(leerRespuestaProducto('<html>')).toEqual({ tipo: 'no-encontrado' });
  });

  test('sin kcal no es válido', () => {
    const sinKcal = structuredClone(productoOk);
    delete (sinKcal.product.nutriments as Record<string, unknown>)['energy-kcal_100g'];
    expect(leerRespuestaProducto(sinKcal)).toEqual({ tipo: 'sin-kcal' });
  });

  test('sin nombre o con valores imposibles no es válido', () => {
    expect(alimentoDesdeOff({ ...productoOk.product, product_name: ' ' })).toBeNull();
    expect(
      alimentoDesdeOff({ ...productoOk.product, nutriments: { ...productoOk.product.nutriments, fat_100g: 150 } }),
    ).toBeNull();
  });
});

describe('búsqueda', () => {
  test('sólo los productos con kcal', () => {
    // De los 6 resultados, 2 vienen sin kcal (Milka Oreo y Bon o Bon).
    const r = leerRespuestaBusqueda(busquedaAlfajor);
    expect(r.map((a) => a.codigo)).toEqual(['77965134', '77958341', '7798196060047', '77957023']);
    expect(r[1]).toMatchObject({ nombre: 'Alfajor', marca: 'Vimar', kcal: 355 });
  });

  test('respuesta rota o con error', () => {
    expect(leerRespuestaBusqueda(null)).toEqual([]);
    expect(leerRespuestaBusqueda({ errors: [{ title: 'QueryCheckError' }] })).toEqual([]);
  });

  test('caseras primero, después Argentina y después el mundo, sin repetir', () => {
    const [casera] = ALIMENTOS_CASEROS;
    const [a, b, c] = leerRespuestaBusqueda(busquedaAlfajor);
    expect(combinarResultados([casera], [a, b], [b, c]).map((x) => x.id)).toEqual([casera.id, a.id, b.id, c.id]);
  });
});

describe('productos guardados', () => {
  const [a, b] = leerRespuestaBusqueda(busquedaAlfajor);

  test('el último usado va primero, sin repetir', () => {
    expect(recordarProducto([a, b], b).map((x) => x.id)).toEqual([b.id, a.id]);
  });

  test('buscar por código y por texto sin internet', () => {
    expect(buscarPorCodigo([a, b], '77958341')).toBe(b);
    expect(buscarPorCodigo([a, b], '1')).toBeNull();
    expect(buscarGuardados([a, b], 'alfajor vimar')).toEqual([b]);
    expect(buscarGuardados([a, b], '')).toEqual([]);
  });

  test('leer lo guardado descarta lo inválido y las caseras', () => {
    const [casera] = ALIMENTOS_CASEROS;
    expect(leerProductosGuardados([a, { ...b, kcal: null }, casera])).toEqual([a] as Alimento[]);
    expect(leerProductosGuardados('x')).toEqual([]);
  });
});

describe('límites de Open Food Facts', () => {
  test('respuestas de corte', () => {
    expect(esRespuestaLimite(429, '')).toBe(true);
    expect(esRespuestaLimite(503, '')).toBe(true);
    expect(esRespuestaLimite(200, '\n<html><h1>Too many requests</h1>')).toBe(true);
    expect(esRespuestaLimite(200, '{"status":1}')).toBe(false);
    expect(esRespuestaLimite(404, '{"status":0}')).toBe(false);
  });

  test('error de límite', () => {
    expect(esErrorLimite(errorLimite())).toBe(true);
    expect(esErrorLimite(new Error('Network request failed'))).toBe(false);
    expect(esErrorLimite('ErrorLimiteOff')).toBe(false);
  });

  test('caché: vence y se renueva', () => {
    let cache: CacheOff<string> = new Map();
    cache = guardarCache(cache, 'a', 'uno', 1000);
    expect(leerCache(cache, 'a', 999)).toBe('uno');
    expect(leerCache(cache, 'a', 1000)).toBeUndefined();
    expect(leerCache(cache, 'b', 0)).toBeUndefined();
    cache = guardarCache(cache, 'a', 'dos', 2000);
    expect(leerCache(cache, 'a', 1500)).toBe('dos');
  });

  test('caché: a lo sumo el máximo, se van las más viejas', () => {
    let cache: CacheOff<number> = new Map();
    for (let i = 0; i <= MAXIMO_CACHE; i++) cache = guardarCache(cache, `c${i}`, i, 10);
    expect(cache.size).toBe(MAXIMO_CACHE);
    expect(leerCache(cache, 'c0', 0)).toBeUndefined();
    expect(leerCache(cache, `c${MAXIMO_CACHE}`, 0)).toBe(MAXIMO_CACHE);
  });

  test('lo que no se encontró dura menos', () => {
    expect(duracionCacheCodigo({ tipo: 'no-encontrado' })).toBeLessThan(
      duracionCacheCodigo(leerRespuestaProducto(productoOk)),
    );
  });
});
