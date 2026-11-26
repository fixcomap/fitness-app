// Cuánto se come de un alimento (en unidades o en gramos) y sus kcal y macros.
import type { Alimento, Nutrientes } from './alimentos';

export type Cantidad =
  | { modo: 'unidades'; unidades: number; porcion: number } // porcion: índice en alimento.porciones
  | { modo: 'gramos'; gramos: number };

export const LIMITES_CANTIDAD = {
  unidades: { min: 0.5, max: 20, paso: 0.5 },
  gramos: { min: 5, max: 2000, paso: 10 },
} as const;

const redondear = (x: number, paso: number) => Math.round(x / paso) * paso;
const acotar = (x: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, x));
// El siguiente múltiplo de paso hacia arriba o hacia abajo: 155 g + → 160 g, − → 150 g.
const siguiente = (x: number, paso: number, sentido: 1 | -1) =>
  sentido > 0 ? (Math.floor(x / paso + 1e-9) + 1) * paso : (Math.ceil(x / paso - 1e-9) - 1) * paso;

// Lo que se propone al elegir un alimento: 1 unidad si tiene porciones, si no 100 g.
export function cantidadInicial(alimento: Alimento): Cantidad {
  return alimento.porciones.length > 0
    ? { modo: 'unidades', unidades: 1, porcion: 0 }
    : { modo: 'gramos', gramos: 100 };
}

export function gramosDe(alimento: Alimento, cantidad: Cantidad): number {
  if (cantidad.modo === 'gramos') return cantidad.gramos;
  const porcion = alimento.porciones[cantidad.porcion];
  return porcion ? cantidad.unidades * porcion.gramos : 0;
}

// kcal enteras y macros con un decimal, para los gramos indicados.
export function nutrientesDe(alimento: Alimento, gramos: number): Nutrientes {
  const f = Math.max(0, gramos) / 100;
  return {
    kcal: Math.round(alimento.kcal * f),
    proteinas: Math.round(alimento.proteinas * f * 10) / 10,
    carbos: Math.round(alimento.carbos * f * 10) / 10,
    grasas: Math.round(alimento.grasas * f * 10) / 10,
  };
}

export function nutrientesCantidad(alimento: Alimento, cantidad: Cantidad): Nutrientes {
  return nutrientesDe(alimento, gramosDe(alimento, cantidad));
}

export function sumarNutrientes(lista: readonly Nutrientes[]): Nutrientes {
  const total = lista.reduce(
    (t, n) => ({
      kcal: t.kcal + n.kcal,
      proteinas: t.proteinas + n.proteinas,
      carbos: t.carbos + n.carbos,
      grasas: t.grasas + n.grasas,
    }),
    { kcal: 0, proteinas: 0, carbos: 0, grasas: 0 },
  );
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    kcal: Math.round(total.kcal),
    proteinas: r1(total.proteinas),
    carbos: r1(total.carbos),
    grasas: r1(total.grasas),
  };
}

// El botón − o +: de a media unidad o de a 10 g, dentro de los límites.
export function cambiarCantidad(cantidad: Cantidad, sentido: 1 | -1): Cantidad {
  if (cantidad.modo === 'unidades') {
    const l = LIMITES_CANTIDAD.unidades;
    return { ...cantidad, unidades: acotar(siguiente(cantidad.unidades, l.paso, sentido), l) };
  }
  const l = LIMITES_CANTIDAD.gramos;
  return { modo: 'gramos', gramos: acotar(siguiente(cantidad.gramos, l.paso, sentido), l) };
}

// Pasar de unidades a gramos (o al revés) manteniendo más o menos lo mismo.
export function cambiarModo(alimento: Alimento, cantidad: Cantidad, modo: Cantidad['modo']): Cantidad {
  if (cantidad.modo === modo) return cantidad;
  if (modo === 'gramos') {
    return { modo: 'gramos', gramos: acotar(redondear(gramosDe(alimento, cantidad), 5), LIMITES_CANTIDAD.gramos) };
  }
  const porcion = alimento.porciones[0];
  if (!porcion) return cantidad; // sin porciones, sólo gramos
  const unidades = acotar(redondear(gramosDe(alimento, cantidad) / porcion.gramos, 0.5), LIMITES_CANTIDAD.unidades);
  return { modo: 'unidades', unidades, porcion: 0 };
}

// Los gramos escritos a mano: entero entre 5 y 2.000, o null.
export function leerGramos(texto: string): number | null {
  const limpio = texto.trim().replace(/\./g, '');
  if (!/^\d+$/.test(limpio)) return null;
  const g = Number(limpio);
  return g >= LIMITES_CANTIDAD.gramos.min && g <= LIMITES_CANTIDAD.gramos.max ? g : null;
}

// 1.5 → "1,5"; 2 → "2".
export function formatearDecimal(x: number): string {
  return String(Math.round(x * 10) / 10).replace('.', ',');
}

// "1 milanesa", "1,5 milanesas", "200 g".
export function textoCantidad(alimento: Alimento, cantidad: Cantidad): string {
  if (cantidad.modo === 'gramos') return `${formatearNumeroGramos(cantidad.gramos)} g`;
  const porcion = alimento.porciones[cantidad.porcion];
  if (!porcion) return `${formatearNumeroGramos(gramosDe(alimento, cantidad))} g`;
  return `${formatearDecimal(cantidad.unidades)} ${cantidad.unidades === 1 ? porcion.nombre : porcion.plural}`;
}

// Lo que se ve debajo del nombre en el diario: "1 milanesa · 150 g" o "200 g".
export function detalleCantidad(alimento: Alimento, cantidad: Cantidad): string {
  const texto = textoCantidad(alimento, cantidad);
  return cantidad.modo === 'gramos' ? texto : `${texto} · ${formatearNumeroGramos(gramosDe(alimento, cantidad))} g`;
}

function formatearNumeroGramos(g: number): string {
  return String(Math.round(g)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function leerCantidad(x: unknown, alimento: Alimento): Cantidad | null {
  if (typeof x !== 'object' || x === null) return null;
  const c = x as Record<string, unknown>;
  const enRango = (v: unknown, l: { min: number; max: number }) => typeof v === 'number' && v >= l.min && v <= l.max;
  if (c.modo === 'gramos' && enRango(c.gramos, LIMITES_CANTIDAD.gramos))
    return { modo: 'gramos', gramos: c.gramos as number };
  if (
    c.modo === 'unidades' &&
    enRango(c.unidades, LIMITES_CANTIDAD.unidades) &&
    Number.isInteger(c.porcion) &&
    alimento.porciones[c.porcion as number] !== undefined
  ) {
    return { modo: 'unidades', unidades: c.unidades as number, porcion: c.porcion as number };
  }
  return null;
}
