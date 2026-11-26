// Alimentos propios: los que crea el usuario cuando algo no aparece en la búsqueda ni en el
// escáner, copiando la tabla nutricional de la etiqueta (cada 100 g o por porción).
import { leerAlimento, type Alimento } from './alimentos';
import { codigoValido } from './openFoodFacts';

export type BaseEtiqueta = '100g' | 'porcion';

// Lo que se escribe en el formulario (texto, para validar mientras se escribe).
export interface BorradorAlimento {
  nombre: string;
  marca: string; // opcional
  base: BaseEtiqueta; // cómo viene la tabla de la etiqueta
  porcionGramos: string; // obligatoria si base es 'porcion'; opcional si es '100g'
  porcionNombre: string; // "alfajor", "galletita"… vacío: "porción"
  kcal: string;
  proteinas: string;
  carbos: string;
  grasas: string;
  codigo: string; // código de barras; vacío si no hay
}

// Lo que llega precargado: lo buscado, o el producto de Open Food Facts sin datos.
export interface DatosIniciales {
  nombre?: string;
  marca?: string;
  codigo?: string;
}

export type CampoAlimento = keyof BorradorAlimento;
export type ErroresAlimento = Partial<Record<CampoAlimento, string>>;

export const BORRADOR_ALIMENTO_VACIO: BorradorAlimento = {
  nombre: '',
  marca: '',
  base: '100g',
  porcionGramos: '',
  porcionNombre: '',
  kcal: '',
  proteinas: '',
  carbos: '',
  grasas: '',
  codigo: '',
};

export const LIMITES_ALIMENTO = {
  nombre: 60,
  marca: 40,
  porcionGramos: { min: 1, max: 2000 },
  kcal100: 900, // ni el aceite puro llega a más de 900 kcal cada 100 g
} as const;

// "12,5" o "12.5" → 12.5; vacío o inválido → null.
export function leerValor(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  return Number(limpio);
}

// Pasa un valor de la etiqueta a "cada 100 g".
const cada100 = (valor: number, gramosPorcion: number) => (valor * 100) / gramosPorcion;

export function erroresAlimento(b: BorradorAlimento): ErroresAlimento {
  const e: ErroresAlimento = {};
  const nombre = b.nombre.trim();
  if (!nombre) e.nombre = 'Escribí el nombre.';
  else if (nombre.length > LIMITES_ALIMENTO.nombre) e.nombre = `Hasta ${LIMITES_ALIMENTO.nombre} letras.`;

  if (b.marca.trim().length > LIMITES_ALIMENTO.marca) e.marca = `Hasta ${LIMITES_ALIMENTO.marca} letras.`;

  const gramos = leerValor(b.porcionGramos);
  const { min, max } = LIMITES_ALIMENTO.porcionGramos;
  if (b.porcionGramos.trim() !== '' || b.base === 'porcion') {
    if (gramos === null) e.porcionGramos = 'Escribí cuántos gramos tiene la porción.';
    else if (gramos < min || gramos > max) e.porcionGramos = `Entre ${min} y ${max} g.`;
  }

  // Los límites se revisan cada 100 g, sea cual sea la base.
  const base = b.base === 'porcion' && !e.porcionGramos && gramos !== null ? gramos : 100;
  const kcal = leerValor(b.kcal);
  if (kcal === null) e.kcal = 'Escribí las kcal (puede ser 0).';
  else if (cada100(kcal, base) > LIMITES_ALIMENTO.kcal100) e.kcal = 'Son demasiadas kcal: revisá el número.';

  const macros = (['proteinas', 'carbos', 'grasas'] as const).map((campo) => {
    const texto = b[campo];
    if (texto.trim() === '') return 0; // si la etiqueta no lo dice, 0
    const valor = leerValor(texto);
    if (valor === null) e[campo] = 'Escribí un número.';
    else if (cada100(valor, base) > 100) e[campo] = 'No puede pasar los gramos del alimento.';
    return valor ?? 0;
  });
  if (!e.proteinas && !e.carbos && !e.grasas && cada100(macros[0] + macros[1] + macros[2], base) > 100) {
    e.grasas = 'Proteínas, carbos y grasas suman más que el alimento: revisá los números.';
  }

  const codigo = b.codigo.trim();
  if (codigo && !codigoValido(codigo)) e.codigo = 'El código tiene entre 8 y 14 números.';
  return e;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

// El alimento listo para guardar (valores cada 100 g), o null si hay errores.
export function alimentoDesdeBorrador(b: BorradorAlimento, id: string): Alimento | null {
  if (Object.keys(erroresAlimento(b)).length > 0) return null;
  const gramos = leerValor(b.porcionGramos);
  const base = b.base === 'porcion' && gramos !== null ? gramos : 100;
  const valor = (texto: string) => cada100(leerValor(texto) ?? 0, base);
  const nombrePorcion = b.porcionNombre.trim().toLowerCase();
  return {
    id: `propio:${id}`,
    nombre: b.nombre.trim(),
    origen: 'propio',
    marca: b.marca.trim() || null,
    codigo: b.codigo.trim() || null,
    imagen: null,
    kcal: Math.round(valor(b.kcal)),
    proteinas: r1(valor(b.proteinas)),
    carbos: r1(valor(b.carbos)),
    grasas: r1(valor(b.grasas)),
    porciones:
      gramos === null
        ? []
        : [
            {
              nombre: nombrePorcion || 'porción',
              plural: nombrePorcion ? plural(nombrePorcion) : 'porciones',
              gramos,
              estimada: false, // la dice la etiqueta
            },
          ],
    fuente: 'Etiqueta del producto, cargada por vos',
  };
}

// "alfajor" → "alfajores"; "galletita" → "galletitas".
export function plural(nombre: string): string {
  return /[aeiouáéó]$/.test(nombre) ? `${nombre}s` : `${nombre}es`;
}

// ── Guardados ──

// El último creado va primero. Con el mismo código de barras, reemplaza al anterior.
export function guardarPropio(propios: readonly Alimento[], nuevo: Alimento): Alimento[] {
  return [nuevo, ...propios.filter((a) => a.id !== nuevo.id && !(nuevo.codigo && a.codigo === nuevo.codigo))];
}

export function leerPropiosGuardados(datos: unknown): Alimento[] {
  if (!Array.isArray(datos)) return [];
  return datos.map(leerAlimento).filter((a): a is Alimento => a !== null && a.origen === 'propio');
}
