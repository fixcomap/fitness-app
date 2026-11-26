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

export type ResultadoCodigo =
  { tipo: 'encontrado'; alimento: Alimento } | { tipo: 'no-encontrado' } | { tipo: 'sin-kcal' };

// La respuesta de /api/v2/product/<codigo>.json.
export function leerRespuestaProducto(json: unknown): ResultadoCodigo {
  if (typeof json !== 'object' || json === null) return { tipo: 'no-encontrado' };
  const r = json as Record<string, unknown>;
  if (r.status !== 1 || typeof r.product !== 'object' || r.product === null) return { tipo: 'no-encontrado' };
  const alimento = alimentoDesdeOff({ code: r.code, ...(r.product as object) });
  return alimento ? { tipo: 'encontrado', alimento } : { tipo: 'sin-kcal' };
}

// La respuesta de la búsqueda: sólo los productos válidos, sin repetir.
export function leerRespuestaBusqueda(json: unknown): Alimento[] {
  if (typeof json !== 'object' || json === null) return [];
  const hits = (json as Record<string, unknown>).hits;
  if (!Array.isArray(hits)) return [];
  return sinRepetidos(hits.map(alimentoDesdeOff).filter((a): a is Alimento => a !== null));
}

function sinRepetidos(alimentos: readonly Alimento[]): Alimento[] {
  const vistos = new Set<string>();
  return alimentos.filter((a) => !vistos.has(a.id) && vistos.add(a.id));
}

// Resultados del buscador: primero las caseras, después los envasados de Argentina y
// después los del resto del mundo.
export function combinarResultados(
  caseras: readonly Alimento[],
  argentina: readonly Alimento[],
  mundo: readonly Alimento[],
): Alimento[] {
  return sinRepetidos([...caseras, ...argentina, ...mundo]);
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
