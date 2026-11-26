// Alimentos: las comidas caseras (JSON local con valores de USDA FoodData Central) y los
// productos envasados de Open Food Facts. Los valores son siempre cada 100 g.
import caseras from '../../data/alimentosCaseros.json';

export interface Nutrientes {
  kcal: number;
  proteinas: number; // gramos
  carbos: number;
  grasas: number;
}

// Una unidad del alimento: "1 empanada ≈ 90 g".
export interface Porcion {
  nombre: string; // singular: "empanada"
  plural: string; // "empanadas"
  gramos: number;
  estimada: boolean; // true: estimación nuestra; false: la declara el fabricante
}

export type OrigenAlimento = 'casera' | 'envasado';

export interface Alimento extends Nutrientes {
  id: string; // "casera:milanesa-carne-horno" o "off:7790040613607"
  nombre: string;
  origen: OrigenAlimento;
  marca: string | null;
  codigo: string | null; // código de barras (envasados)
  imagen: string | null;
  porciones: Porcion[];
  fuente: string; // de dónde salen los valores
}

interface CaseraJson {
  id: string;
  nombre: string;
  kcal: number;
  proteinas: number;
  carbos: number;
  grasas: number;
  porciones: Porcion[];
  fuente: { base: string; equivalente: boolean; alimentos: { fdcId: number; descripcion: string }[] };
}

function alimentoCasero(c: CaseraJson): Alimento {
  const descripciones = c.fuente.alimentos.map((a) => `${a.descripcion} (FDC ${a.fdcId})`).join(' + ');
  return {
    id: `casera:${c.id}`,
    nombre: c.nombre,
    origen: 'casera',
    marca: null,
    codigo: null,
    imagen: null,
    kcal: c.kcal,
    proteinas: c.proteinas,
    carbos: c.carbos,
    grasas: c.grasas,
    porciones: c.porciones,
    fuente: `${c.fuente.base}${c.fuente.equivalente ? ', alimento equivalente' : ''}: ${descripciones}`,
  };
}

export const ALIMENTOS_CASEROS: readonly Alimento[] = (caseras as CaseraJson[]).map(alimentoCasero);

// "Milanesa" → "milanesa"; "Ñoquis" → "noquis". Para buscar sin importar tildes ni mayúsculas.
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Las caseras que tienen todas las palabras buscadas. Primero las que empiezan con lo
// buscado, después por dónde aparece y por nombre.
export function buscarCaseras(
  texto: string,
  alimentos: readonly Alimento[] = ALIMENTOS_CASEROS,
  limite = 30,
): Alimento[] {
  const consulta = normalizar(texto);
  if (!consulta) return [];
  const palabras = consulta.split(' ');
  return alimentos
    .map((a) => ({ a, nombre: normalizar(a.nombre) }))
    .filter(({ nombre }) => palabras.every((p) => nombre.includes(p)))
    .sort(
      (x, y) =>
        Number(!x.nombre.startsWith(consulta)) - Number(!y.nombre.startsWith(consulta)) ||
        x.nombre.indexOf(palabras[0]) - y.nombre.indexOf(palabras[0]) ||
        x.nombre.localeCompare(y.nombre),
    )
    .slice(0, limite)
    .map(({ a }) => a);
}

// "Casera · 245 kcal / 100 g" o "Arcor · 443 kcal / 100 g".
export function subtituloAlimento(a: Alimento): string {
  const origen = a.origen === 'casera' ? 'Casera' : (a.marca ?? 'Envasado');
  return `${origen} · ${Math.round(a.kcal)} kcal / 100 g`;
}

// ── Validación de lo guardado ──

const esTexto = (x: unknown): x is string => typeof x === 'string';
const esNumero = (x: unknown, max: number): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max;

function leerPorcion(x: unknown): Porcion | null {
  if (typeof x !== 'object' || x === null) return null;
  const p = x as Record<string, unknown>;
  if (!esTexto(p.nombre) || !esTexto(p.plural) || !esNumero(p.gramos, 5000) || p.gramos === 0) return null;
  return { nombre: p.nombre, plural: p.plural, gramos: p.gramos, estimada: p.estimada !== false };
}

export function leerAlimento(x: unknown): Alimento | null {
  if (typeof x !== 'object' || x === null) return null;
  const a = x as Record<string, unknown>;
  if (!esTexto(a.id) || !esTexto(a.nombre) || !a.nombre.trim()) return null;
  if (a.origen !== 'casera' && a.origen !== 'envasado') return null;
  if (!esNumero(a.kcal, 1000) || !esNumero(a.proteinas, 100) || !esNumero(a.carbos, 100) || !esNumero(a.grasas, 100)) {
    return null;
  }
  const porciones = Array.isArray(a.porciones) ? a.porciones.map(leerPorcion) : [];
  if (porciones.some((p) => p === null)) return null;
  return {
    id: a.id,
    nombre: a.nombre,
    origen: a.origen,
    marca: esTexto(a.marca) ? a.marca : null,
    codigo: esTexto(a.codigo) ? a.codigo : null,
    imagen: esTexto(a.imagen) ? a.imagen : null,
    kcal: a.kcal,
    proteinas: a.proteinas,
    carbos: a.carbos,
    grasas: a.grasas,
    porciones: porciones as Porcion[],
    fuente: esTexto(a.fuente) ? a.fuente : '',
  };
}
