// El alimento de un ítem de registrar_comida: primero en la base del celu (recientes, propios y caseras,
// en ese orden) y, si no está, uno nuevo con lo que estimó el coach, marcado como aproximado.
// Funciones puras.
import { ALIMENTOS_CASEROS, buscarCaseras, normalizar, type Alimento } from '../comida/alimentos';
import { LIMITES_ALIMENTO } from '../comida/propios';
import type { Cantidad } from '../comida/porciones';
import { plural, type CantidadAccion, type ItemComida } from './acciones';

export interface BaseLocal {
  recientes: readonly Alimento[]; // alimentosRecientes(diario): incluye los estimados de antes
  propios: readonly Alimento[];
  caseras?: readonly Alimento[]; // por defecto, las de la app
}

export type DondeSeEncontro = 'reciente' | 'propio' | 'casera' | 'estimado';

export interface AlimentoEncontrado {
  alimento: Alimento;
  cantidad: Cantidad;
  donde: DondeSeEncontro;
}

const CRUDO = /\bcrud[oa]s?\b/;
const COCIDO = /\b(cocid[oa]s?|hervid[oa]s?|al horno|a la plancha|fritos?|fritas?)\b/;

// Un alimento que dice lo contrario de lo que comió (arroz "crudo" si comió cocido) no sirve.
function contradiceEstado(alimento: Alimento, item: ItemComida): boolean {
  const nombre = normalizar(alimento.nombre);
  if (item.estado === 'cocido') return CRUDO.test(nombre);
  if (item.estado === 'crudo') return COCIDO.test(nombre);
  return false;
}

// Con el mismo nombre que lo buscado.
function exactoEn(lista: readonly Alimento[], item: ItemComida): Alimento | null {
  const buscado = normalizar(item.busqueda);
  return lista.find((a) => normalizar(a.nombre) === buscado && !contradiceEstado(a, item)) ?? null;
}

// Los que tienen todas las palabras buscadas (en el orden de buscarCaseras) y no contradicen crudo/cocido.
function parecidosEn(lista: readonly Alimento[], item: ItemComida): Alimento[] {
  return buscarCaseras(item.busqueda, lista, lista.length).filter((a) => !contradiceEstado(a, item));
}

const palabras = (texto: string) => normalizar(texto).split(/[^a-z0-9ñ]+/).filter(Boolean);

// Cuántas palabras del nombre no están en lo buscado: "Arroz blanco con pollo" para "arroz" tiene 3.
export function palabrasDeMas(nombre: string, busqueda: string): number {
  const buscadas = new Set(palabras(busqueda));
  return palabras(nombre).filter((p) => !buscadas.has(p)).length;
}

const esPorcion = (nombre: string, buscada: string) => normalizar(nombre) === normalizar(buscada);

// La cantidad en el alimento encontrado: en sus unidades si tiene esa porción; si no, en gramos
// con los gramos por unidad que estimó el coach.
export function cantidadEn(alimento: Alimento, c: CantidadAccion): Cantidad {
  if ('gramos' in c) return { modo: 'gramos', gramos: c.gramos };
  const porcion = alimento.porciones.findIndex((p) => esPorcion(p.nombre, c.porcion) || esPorcion(p.plural, c.porcion));
  if (porcion >= 0) return { modo: 'unidades', unidades: c.unidades, porcion };
  return { modo: 'gramos', gramos: Math.round(c.unidades * c.gramosPorUnidad) };
}

// "empanada de carne" → "Empanada de carne"; con crudo/cocido si no lo dice: "Arroz integral (cocido)".
function nombreEstimado(item: ItemComida): string {
  const base = item.busqueda.trim().replace(/\s+/g, ' ');
  const conMayuscula = base.charAt(0).toUpperCase() + base.slice(1);
  const dice = CRUDO.test(normalizar(base)) || COCIDO.test(normalizar(base));
  const nombre = item.estado === 'no-aplica' || dice ? conMayuscula : `${conMayuscula} (${item.estado})`;
  return nombre.slice(0, LIMITES_ALIMENTO.nombre);
}

// Un alimento nuevo con los valores por 100 g del coach. Si vino en unidades, su porción es la que dijo
// el usuario con los gramos por unidad que estimó el coach.
export function alimentoEstimado(item: ItemComida): Alimento {
  const nombre = nombreEstimado(item);
  const c = item.cantidad;
  return {
    id: `estimado:${normalizar(nombre)}`,
    nombre,
    origen: 'estimado',
    marca: null,
    codigo: null,
    imagen: null,
    ...item.estimado,
    porciones:
      'gramos' in c
        ? []
        : [{ nombre: c.porcion.trim(), plural: plural(c.porcion.trim()), gramos: c.gramosPorUnidad, estimada: true }],
    fuente: 'Estimación del coach: valores aproximados.',
  };
}

export function buscarAlimentoDeItem(item: ItemComida, base: BaseLocal): AlimentoEncontrado {
  const listas: [DondeSeEncontro, readonly Alimento[]][] = [
    ['reciente', base.recientes],
    ['propio', base.propios],
    ['casera', base.caseras ?? ALIMENTOS_CASEROS],
  ];
  const encontrado = (alimento: Alimento, donde: DondeSeEncontro): AlimentoEncontrado => ({
    alimento,
    cantidad: cantidadEn(alimento, item.cantidad),
    donde,
  });
  // 1) El nombre exacto, en el orden de las listas.
  for (const [donde, lista] of listas) {
    const alimento = exactoEn(lista, item);
    if (alimento) return encontrado(alimento, donde);
  }
  // 2) Entre los parecidos de las tres listas, el que tenga menos palabras de más; en empate, el de la lista
  // que se mira antes. Así "arroz" va a la casera "Arroz blanco" y no a un reciente "Arroz blanco con pollo".
  let mejor: { alimento: Alimento; donde: DondeSeEncontro; deMas: number } | null = null;
  for (const [donde, lista] of listas) {
    for (const alimento of parecidosEn(lista, item)) {
      const deMas = palabrasDeMas(alimento.nombre, item.busqueda);
      if (!mejor || deMas < mejor.deMas) mejor = { alimento, donde, deMas };
    }
  }
  if (mejor) return encontrado(mejor.alimento, mejor.donde);
  const alimento = alimentoEstimado(item);
  return { alimento, cantidad: cantidadEn(alimento, item.cantidad), donde: 'estimado' };
}

// Para EntornoAcciones.alimentoPara.
export function alimentoParaAcciones(base: BaseLocal): (item: ItemComida) => { alimento: Alimento; cantidad: Cantidad } {
  return (item) => {
    const { alimento, cantidad } = buscarAlimentoDeItem(item, base);
    return { alimento, cantidad };
  };
}
