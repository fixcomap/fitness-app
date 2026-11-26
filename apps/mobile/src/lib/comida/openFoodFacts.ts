// Productos envasados de Open Food Facts (base pública, sin clave).
// Acá sólo se arman las direcciones y se leen las respuestas; el pedido está en clienteOff.ts.
import { leerAlimento, normalizar, type Alimento, type Porcion } from './alimentos';

// Lo pide su documentación: un User-Agent que identifique a la app.
export const USER_AGENT_OFF = 'FitnessApp/0.1 (fixcomap.com)';

const CAMPOS = [
  'code',
  'product_name',
  'product_name_es',
  'brands',
  'nutriments',
  'serving_size',
  'serving_quantity',
  'image_front_small_url',
].join(',');

// Código de barras: de 8 a 14 dígitos (EAN-8, UPC, EAN-13, GTIN-14).
export function codigoValido(texto: string): boolean {
  return /^\d{8,14}$/.test(texto.trim());
}

export function urlProducto(codigo: string): string {
  return `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo.trim())}.json?fields=${CAMPOS}`;
}

// La marca como la guarda Open Food Facts en brands: "La Serenísima" → "la-serenisima", "Lay's" → "lay-s".
export function etiquetaMarca(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const MAXIMO_PALABRAS = 5;

// La consulta de búsqueda. Como la búsqueda exige todas las palabras en el nombre, se busca
// también (con OR):
// - sin apóstrofos ni espacios: "lay's" → "lays";
// - como marca: brands:"lay-s";
// - partido en producto + marca: "manteca la serenisima" → manteca brands:"la-serenisima".
export function consultaBusqueda(texto: string): string {
  // Sin los caracteres que la búsqueda usa como operadores; en minúsculas, para que "or" no sea OR.
  const limpio = texto
    .toLowerCase()
    .replace(/["\\():*?~^[\]{}!+\-/<>=&|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!limpio) return '';
  // Con muchas palabras, partirla daría demasiadas combinaciones.
  const palabras = limpio.split(' ');
  const cortes = palabras.length <= MAXIMO_PALABRAS ? palabras.length : 1;
  const junto = limpio.replace(/['’\s]/g, '');
  const partes = new Set([`(${limpio})`]);
  if (junto && junto !== limpio) partes.add(`(${junto})`);
  for (const marca of [etiquetaMarca(limpio), etiquetaMarca(junto)]) if (marca) partes.add(`brands:"${marca}"`);
  for (let corte = 1; corte < cortes; corte++) {
    const antes = palabras.slice(0, corte).join(' ');
    const despues = palabras.slice(corte).join(' ');
    partes.add(`(${antes} brands:"${etiquetaMarca(despues)}")`);
    partes.add(`(${despues} brands:"${etiquetaMarca(antes)}")`);
  }
  return [...partes].join(' OR ');
}

// Búsqueda por texto (search-a-licious). Con soloArgentina, filtra los productos de Argentina.
export function urlBusqueda(texto: string, soloArgentina: boolean, cantidad = 20): string {
  const consulta = consultaBusqueda(texto);
  const q = soloArgentina ? `(${consulta}) AND countries:"en:argentina"` : consulta;
  return `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=${cantidad}&fields=${CAMPOS}`;
}

const numero = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null);
const texto = (x: unknown): string => (typeof x === 'string' ? x.trim() : '');

// "Arcor, Prestopronta" → "Arcor"; ["xx:bon-o-bon", "xx:Arcor"] → "Bon o bon".
export function leerMarca(brands: unknown): string | null {
  const primera = Array.isArray(brands) ? texto(brands[0]) : texto(brands).split(',')[0].trim();
  const limpia = primera
    .replace(/^[a-z]{2}:/, '')
    .replace(/-/g, ' ')
    .trim();
  return limpia ? limpia[0].toUpperCase() + limpia.slice(1) : null;
}

// La porción que declara el envase: "1 alfajor (40 g)" → 1 alfajor ≈ 40 g; "60.0g" → 1 porción ≈ 60 g.
export function leerPorcionOff(servingSize: unknown, servingQuantity: unknown): Porcion | null {
  const gramos = numero(typeof servingQuantity === 'string' ? Number(servingQuantity) : servingQuantity);
  if (gramos === null || gramos <= 0 || gramos > 2000) return null;
  const nombre = /^1\s+([a-záéíóúñü ]+?)\s*\(/i.exec(texto(servingSize))?.[1].toLowerCase();
  if (!nombre) return { nombre: 'porción', plural: 'porciones', gramos, estimada: false };
  return { nombre, plural: /[aeiou]$/.test(nombre) ? `${nombre}s` : `${nombre}es`, gramos, estimada: false };
}

// Un producto de Open Food Facts como alimento. null si no tiene nombre o no tiene kcal.
export function alimentoDesdeOff(producto: unknown): Alimento | null {
  if (typeof producto !== 'object' || producto === null) return null;
  const p = producto as Record<string, unknown>;
  const codigo = texto(p.code);
  const nombre = texto(p.product_name_es) || texto(p.product_name);
  const n = (typeof p.nutriments === 'object' && p.nutriments !== null ? p.nutriments : {}) as Record<string, unknown>;
  const kcal = numero(n['energy-kcal_100g']);
  if (!codigo || !nombre || kcal === null) return null;
  const porcion = leerPorcionOff(p.serving_size, p.serving_quantity);
  // Valida rangos (por ejemplo, macros de más de 100 g cada 100 g).
  return leerAlimento({
    id: `off:${codigo}`,
    nombre,
    origen: 'envasado',
    marca: leerMarca(p.brands),
    codigo,
    imagen: texto(p.image_front_small_url) || null,
    kcal: Math.round(kcal),
    proteinas: redondear(numero(n.proteins_100g) ?? 0),
    carbos: redondear(numero(n.carbohydrates_100g) ?? 0),
    grasas: redondear(numero(n.fat_100g) ?? 0),
    porciones: porcion ? [porcion] : [],
    fuente: 'Open Food Facts',
  });
}

const redondear = (x: number) => Math.round(x * 10) / 10;

// Un producto que está en Open Food Facts pero sin kcal (o con valores imposibles). No se
// esconde: se muestra para completarlo con los datos de la etiqueta.
export interface ProductoSinDatos {
  codigo: string;
  nombre: string; // puede venir vacío
  marca: string | null;
  imagen: string | null;
}

export function productoSinDatosDesdeOff(producto: unknown): ProductoSinDatos | null {
  if (typeof producto !== 'object' || producto === null) return null;
  const p = producto as Record<string, unknown>;
  const codigo = texto(p.code);
  if (!codigoValido(codigo)) return null;
  return {
    codigo,
    nombre: texto(p.product_name_es) || texto(p.product_name),
    marca: leerMarca(p.brands),
    imagen: texto(p.image_front_small_url) || null,
  };
}

export type ResultadoCodigo =
  | { tipo: 'encontrado'; alimento: Alimento }
  | { tipo: 'no-encontrado' }
  | { tipo: 'sin-kcal'; producto: ProductoSinDatos };

// La respuesta de /api/v2/product/<codigo>.json.
export function leerRespuestaProducto(json: unknown): ResultadoCodigo {
  if (typeof json !== 'object' || json === null) return { tipo: 'no-encontrado' };
  const r = json as Record<string, unknown>;
  if (r.status !== 1 || typeof r.product !== 'object' || r.product === null) return { tipo: 'no-encontrado' };
  const producto = { code: r.code, ...(r.product as object) };
  const alimento = alimentoDesdeOff(producto);
  if (alimento) return { tipo: 'encontrado', alimento };
  const sinDatos = productoSinDatosDesdeOff(producto);
  return sinDatos ? { tipo: 'sin-kcal', producto: sinDatos } : { tipo: 'no-encontrado' };
}

export interface ResultadoBusquedaOff {
  alimentos: Alimento[]; // con kcal
  sinDatos: ProductoSinDatos[]; // con nombre pero sin kcal
}

export const BUSQUEDA_VACIA: ResultadoBusquedaOff = { alimentos: [], sinDatos: [] };

// La respuesta de la búsqueda: los productos con kcal y, aparte, los que tienen nombre pero no kcal.
export function leerRespuestaBusqueda(json: unknown): ResultadoBusquedaOff {
  if (typeof json !== 'object' || json === null) return BUSQUEDA_VACIA;
  const hits = (json as Record<string, unknown>).hits;
  if (!Array.isArray(hits)) return BUSQUEDA_VACIA;
  const alimentos: Alimento[] = [];
  const sinDatos: ProductoSinDatos[] = [];
  for (const hit of hits) {
    const alimento = alimentoDesdeOff(hit);
    const producto = alimento ? null : productoSinDatosDesdeOff(hit);
    if (alimento) alimentos.push(alimento);
    else if (producto?.nombre) sinDatos.push(producto);
  }
  return { alimentos, sinDatos };
}

export type ItemResultado =
  { tipo: 'alimento'; alimento: Alimento } | { tipo: 'sin-datos'; producto: ProductoSinDatos };

export const claveItem = (item: ItemResultado) =>
  item.tipo === 'alimento' ? item.alimento.id : `sin-datos:${item.producto.codigo}`;

// Resultados del buscador: primero los locales (propios y caseras), después Argentina y después
// el resto del mundo; en cada uno, primero los que tienen datos. Sin repetir productos (por id ni
// por código). Un producto sin datos que ya está guardado (creado por el usuario o pedido por
// código) aparece con sus datos.
export function armarResultados(
  locales: readonly Alimento[],
  argentina: ResultadoBusquedaOff,
  mundo: ResultadoBusquedaOff,
  guardados: readonly Alimento[] = [],
): ItemResultado[] {
  const items: ItemResultado[] = [];
  const ids = new Set<string>();
  const codigos = new Set<string>();
  const agregarAlimento = (alimento: Alimento) => {
    if (ids.has(alimento.id) || (alimento.codigo && codigos.has(alimento.codigo))) return;
    ids.add(alimento.id);
    if (alimento.codigo) codigos.add(alimento.codigo);
    items.push({ tipo: 'alimento', alimento });
  };
  const agregarSinDatos = (producto: ProductoSinDatos) => {
    if (codigos.has(producto.codigo)) return;
    const guardado = buscarPorCodigo(guardados, producto.codigo);
    if (guardado) return agregarAlimento(guardado);
    codigos.add(producto.codigo);
    items.push({ tipo: 'sin-datos', producto });
  };
  locales.forEach(agregarAlimento);
  for (const grupo of [argentina, mundo]) {
    grupo.alimentos.forEach(agregarAlimento);
    grupo.sinDatos.forEach(agregarSinDatos);
  }
  return items;
}

// ── Productos ya usados (para escanear sin internet) ──

export const MAXIMO_PRODUCTOS_GUARDADOS = 200;

export function recordarProducto(guardados: readonly Alimento[], producto: Alimento): Alimento[] {
  return [producto, ...guardados.filter((a) => a.id !== producto.id)].slice(0, MAXIMO_PRODUCTOS_GUARDADOS);
}

export function buscarPorCodigo(guardados: readonly Alimento[], codigo: string): Alimento | null {
  return guardados.find((a) => a.codigo === codigo.trim()) ?? null;
}

// Entre los guardados, los que tienen todas las palabras (para buscar sin internet).
export function buscarGuardados(guardados: readonly Alimento[], consulta: string): Alimento[] {
  const palabras = normalizar(consulta).split(' ').filter(Boolean);
  if (palabras.length === 0) return [];
  return guardados.filter((a) => {
    const textoA = normalizar(`${a.nombre} ${a.marca ?? ''}`);
    return palabras.every((p) => textoA.includes(p));
  });
}

export function leerProductosGuardados(datos: unknown): Alimento[] {
  if (!Array.isArray(datos)) return [];
  return datos
    .map(leerAlimento)
    .filter((a): a is Alimento => a !== null && a.origen === 'envasado')
    .slice(0, MAXIMO_PRODUCTOS_GUARDADOS);
}

// ── Límites de Open Food Facts ──
// Pide no hacer muchos pedidos seguidos: si corta, se espera un rato antes de volver a pedir,
// y lo ya pedido se guarda un tiempo en memoria.

export const NOMBRE_ERROR_LIMITE = 'ErrorLimiteOff';

export function errorLimite(): Error {
  const error = new Error('Open Food Facts recibió demasiados pedidos');
  error.name = NOMBRE_ERROR_LIMITE;
  return error;
}

export function esErrorLimite(error: unknown): boolean {
  return error instanceof Error && error.name === NOMBRE_ERROR_LIMITE;
}

// 429 (demasiados pedidos) o 503 (no da abasto); a veces corta con una página HTML en vez de JSON.
export function esRespuestaLimite(status: number, cuerpo: string): boolean {
  return status === 429 || status === 503 || cuerpo.trimStart().startsWith('<');
}

// Después de un corte, no se pide nada por este tiempo.
export const PAUSA_LIMITE_MS = 30 * 1000;

const HORA_MS = 60 * 60 * 1000;
// Lo encontrado vale un día; lo que no está o no tiene kcal, una hora (alguien lo puede completar).
export function duracionCacheCodigo(r: ResultadoCodigo): number {
  return r.tipo === 'encontrado' ? 24 * HORA_MS : HORA_MS;
}
export const DURACION_CACHE_BUSQUEDA_MS = 10 * 60 * 1000;
export const MAXIMO_CACHE = 100;

export type CacheOff<T> = ReadonlyMap<string, { valor: T; vence: number }>;

export function leerCache<T>(cache: CacheOff<T>, clave: string, ahora: number): T | undefined {
  const entrada = cache.get(clave);
  return entrada && entrada.vence > ahora ? entrada.valor : undefined;
}

// Agrega (o renueva) una entrada; si se pasa del máximo, saca las más viejas.
export function guardarCache<T>(cache: CacheOff<T>, clave: string, valor: T, vence: number): CacheOff<T> {
  const nuevo = new Map(cache);
  nuevo.delete(clave);
  nuevo.set(clave, { valor, vence });
  for (const vieja of nuevo.keys()) {
    if (nuevo.size <= MAXIMO_CACHE) break;
    nuevo.delete(vieja);
  }
  return nuevo;
}
