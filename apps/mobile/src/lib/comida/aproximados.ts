// Corregir los valores (cada 100 g) de un alimento aproximado: los que estimó el coach porque no estaban
// en la base. Se corrigen en todos los registros del diario que lo tienen, así "Recientes" y la búsqueda
// del coach (que reusa los recientes) toman los valores buenos y una mala primera estimación no se repite.
// Funciones puras.
import { esAproximado, type Nutrientes } from './alimentos';
import type { RegistroComida } from './diario';
import { BORRADOR_ALIMENTO_VACIO, erroresAlimento, leerValor } from './propios';

export const FUENTE_CORREGIDA = 'Estimación del coach, corregida por vos.';

export type CampoValor = keyof Nutrientes;
export const CAMPOS_VALOR: readonly CampoValor[] = ['kcal', 'proteinas', 'carbos', 'grasas'];
export type BorradorValores = Record<CampoValor, string>;
export type ErroresValores = Partial<Record<CampoValor, string>>;

// 12.5 → "12,5".
const texto = (x: number) => String(x).replace('.', ',');

export function borradorDeValores(n: Nutrientes): BorradorValores {
  return { kcal: texto(n.kcal), proteinas: texto(n.proteinas), carbos: texto(n.carbos), grasas: texto(n.grasas) };
}

// Los mismos límites que al crear un alimento con la etiqueta cada 100 g.
export function erroresValores(b: BorradorValores): ErroresValores {
  const e = erroresAlimento({ ...BORRADOR_ALIMENTO_VACIO, nombre: 'x', base: '100g', ...b });
  const errores: ErroresValores = {};
  for (const campo of CAMPOS_VALOR) if (e[campo]) errores[campo] = e[campo];
  return errores;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

// Los valores listos para guardar, o null si hay errores. Vacío en un macro es 0, como en la etiqueta.
export function valoresDesdeBorrador(b: BorradorValores): Nutrientes | null {
  if (Object.keys(erroresValores(b)).length > 0) return null;
  const valor = (campo: CampoValor) => leerValor(b[campo]) ?? 0;
  return { kcal: Math.round(valor('kcal')), proteinas: r1(valor('proteinas')), carbos: r1(valor('carbos')), grasas: r1(valor('grasas')) };
}

// Cambia los valores del alimento aproximado en todos los registros que lo tienen. Los demás no se tocan:
// solo se corrige lo que estimó el coach.
export function corregirAproximado(registros: readonly RegistroComida[], alimentoId: string, valores: Nutrientes): RegistroComida[] {
  return registros.map((r) =>
    r.alimento.id === alimentoId && esAproximado(r.alimento)
      ? { ...r, alimento: { ...r.alimento, ...valores, fuente: FUENTE_CORREGIDA } }
      : r,
  );
}
