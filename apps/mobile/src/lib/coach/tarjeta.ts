// Lo que muestra la tarjeta de una acción del coach: título, líneas, avisos y si todavía se puede aplicar.
// Funciones puras.
import {
  conflictos,
  describir,
  lineaItem,
  validarContraEstado,
  type AccionCoach,
  type AccionDe,
  type Conflicto,
  type EntornoAcciones,
  type EstadoApp,
  type ProblemaAccion,
} from './acciones';
import { buscarAlimentoDeItem, type BaseLocal } from './alimentoDeAccion';

export interface LineaTarjeta {
  texto: string;
  aproximado: boolean; // no está en la base: los valores los estimó el coach
  // Gramos por unidad que se pueden corregir (comida en unidades que no está en la base con esa porción).
  gramosPorUnidad: number | null;
}

export interface VistaTarjeta {
  titulo: string;
  lineas: LineaTarjeta[];
  avisos: Conflicto[];
  problema: ProblemaAccion | null; // "ya no aplica": Aplicar deshabilitado
}

export const GRAMOS_POR_UNIDAD = { min: 1, max: 1000, paso: 5 } as const;

// Cada ítem como se va a cargar: si el alimento de la base tiene esa porción se usan sus gramos;
// si no, los que estimó el coach (y esos se pueden corregir).
export function lineasComida(accion: AccionDe<'registrar_comida'>, base: BaseLocal): LineaTarjeta[] {
  return accion.items.map((item) => {
    const { alimento, cantidad, donde } = buscarAlimentoDeItem(item, base);
    const aproximado = donde === 'estimado';
    const c = item.cantidad;
    if ('gramos' in c) return { texto: lineaItem(item), aproximado, gramosPorUnidad: null };
    const deLaBase = !aproximado && cantidad.modo === 'unidades' ? alimento.porciones[cantidad.porcion] : undefined;
    const gramos = deLaBase ? deLaBase.gramos : c.gramosPorUnidad;
    return {
      texto: lineaItem({ ...item, cantidad: { ...c, gramosPorUnidad: gramos } }),
      aproximado,
      gramosPorUnidad: deLaBase ? null : gramos,
    };
  });
}

export function vistaTarjeta(
  accion: AccionCoach,
  estado: EstadoApp,
  entorno: Pick<EntornoAcciones, 'ahora' | 'perfil'>,
  base: BaseLocal,
): VistaTarjeta {
  const { titulo, lineas } = describir(accion, estado, entorno);
  return {
    titulo,
    lineas:
      accion.tipo === 'registrar_comida'
        ? lineasComida(accion, base)
        : lineas.map((texto) => ({ texto, aproximado: false, gramosPorUnidad: null })),
    avisos: conflictos(accion, estado),
    problema: validarContraEstado(accion, estado, entorno.ahora),
  };
}

// − o + en los gramos por unidad de un ítem: de a 5 g, entre 1 y 1.000. La misma acción si no aplica.
export function cambiarGramosPorUnidad(accion: AccionCoach, indice: number, sentido: 1 | -1): AccionCoach {
  if (accion.tipo !== 'registrar_comida') return accion;
  const item = accion.items[indice];
  if (!item || 'gramos' in item.cantidad) return accion;
  const { min, max, paso } = GRAMOS_POR_UNIDAD;
  const actual = item.cantidad.gramosPorUnidad;
  const siguiente = sentido > 0 ? Math.floor(actual / paso + 1e-9) * paso + paso : Math.ceil(actual / paso - 1e-9) * paso - paso;
  const gramosPorUnidad = Math.min(max, Math.max(min, siguiente));
  if (gramosPorUnidad === actual) return accion;
  const items = accion.items.map((it, i) => (i === indice ? { ...it, cantidad: { ...item.cantidad, gramosPorUnidad } } : it));
  return { ...accion, items };
}
