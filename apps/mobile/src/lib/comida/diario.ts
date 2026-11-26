// Diario de comidas: lo que se comió cada día, por comida (desayuno, almuerzo…).
// Cada registro guarda una copia del alimento, así el diario y "Recientes" andan sin internet.
import { leerAlimento, type Alimento, type Nutrientes } from './alimentos';
import { leerCantidad, nutrientesCantidad, sumarNutrientes, type Cantidad } from './porciones';

export const COMIDAS = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snacks'] as const;
export type Comida = (typeof COMIDAS)[number];

export const NOMBRE_COMIDA: Record<Comida, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
  snacks: 'Snacks',
};

// "Agregar al almuerzo", "Agregar a la merienda".
const ARTICULO: Record<Comida, string> = {
  desayuno: 'al desayuno',
  almuerzo: 'al almuerzo',
  merienda: 'a la merienda',
  cena: 'a la cena',
  snacks: 'a los snacks',
};
export function textoAgregarA(comida: Comida): string {
  return `Agregar ${ARTICULO[comida]}`;
}

export interface RegistroComida {
  id: string;
  dia: string; // claveDia: "2026-11-25"
  comida: Comida;
  alimento: Alimento;
  cantidad: Cantidad;
  creado: string; // ISO
}

// Se guardan los últimos 120 días.
export const DIAS_GUARDADOS = 120;

export function nuevoRegistro(
  dia: string,
  comida: Comida,
  alimento: Alimento,
  cantidad: Cantidad,
  ahora: Date,
  id = `${ahora.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
): RegistroComida {
  return { id, dia, comida, alimento, cantidad, creado: ahora.toISOString() };
}

// Agrega el registro y descarta los días más viejos que DIAS_GUARDADOS.
export function agregarRegistro(
  registros: readonly RegistroComida[],
  nuevo: RegistroComida,
  hoy: string,
): RegistroComida[] {
  const limite = restarDias(hoy, DIAS_GUARDADOS);
  return [...registros.filter((r) => r.dia > limite), nuevo];
}

export function editarRegistro(
  registros: readonly RegistroComida[],
  id: string,
  cambios: Partial<Pick<RegistroComida, 'cantidad' | 'comida'>>,
): RegistroComida[] {
  return registros.map((r) => (r.id === id ? { ...r, ...cambios } : r));
}

export function borrarRegistro(registros: readonly RegistroComida[], id: string): RegistroComida[] {
  return registros.filter((r) => r.id !== id);
}

export function nutrientesRegistro(r: RegistroComida): Nutrientes {
  return nutrientesCantidad(r.alimento, r.cantidad);
}

export interface SeccionDiario {
  comida: Comida;
  registros: RegistroComida[]; // en el orden en que se cargaron
  totales: Nutrientes;
}

export interface DiaComidas {
  secciones: SeccionDiario[]; // siempre las 5, en orden
  totales: Nutrientes;
}

export function diaComidas(registros: readonly RegistroComida[], dia: string): DiaComidas {
  const delDia = registros.filter((r) => r.dia === dia).sort((a, b) => a.creado.localeCompare(b.creado));
  const secciones = COMIDAS.map((comida) => {
    const lista = delDia.filter((r) => r.comida === comida);
    return { comida, registros: lista, totales: sumarNutrientes(lista.map(nutrientesRegistro)) };
  });
  return { secciones, totales: sumarNutrientes(secciones.map((s) => s.totales)) };
}

// Los últimos alimentos cargados, sin repetir, del más nuevo al más viejo.
export function alimentosRecientes(registros: readonly RegistroComida[], limite = 30): Alimento[] {
  const vistos = new Set<string>();
  const recientes: Alimento[] = [];
  for (const r of [...registros].sort((a, b) => b.creado.localeCompare(a.creado))) {
    if (vistos.has(r.alimento.id)) continue;
    vistos.add(r.alimento.id);
    recientes.push(r.alimento);
    if (recientes.length >= limite) break;
  }
  return recientes;
}

// "2026-03-01" − 1 día → "2026-02-28" (sin problemas de horario de verano: se cuenta en UTC).
export function restarDias(dia: string, dias: number): string {
  const [a, m, d] = dia.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d - dias));
  return fecha.toISOString().slice(0, 10);
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Para navegar por días: "Hoy, mié 25", "Ayer, mar 24", "lun 23 nov".
export function etiquetaDia(dia: string, hoy: string): string {
  const [a, m, d] = dia.split('-').map(Number);
  const corto = `${DIAS_CORTOS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d}`;
  if (dia === hoy) return `Hoy, ${corto}`;
  if (dia === restarDias(hoy, 1)) return `Ayer, ${corto}`;
  return `${corto} ${MESES_CORTOS[m - 1]}`;
}

const DIA_VALIDO = /^\d{4}-\d{2}-\d{2}$/;

function leerRegistro(x: unknown): RegistroComida | null {
  if (typeof x !== 'object' || x === null) return null;
  const r = x as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.dia !== 'string' || !DIA_VALIDO.test(r.dia)) return null;
  if (!COMIDAS.includes(r.comida as Comida) || typeof r.creado !== 'string' || Number.isNaN(Date.parse(r.creado))) {
    return null;
  }
  const alimento = leerAlimento(r.alimento);
  const cantidad = alimento && leerCantidad(r.cantidad, alimento);
  if (!alimento || !cantidad) return null;
  return { id: r.id, dia: r.dia, comida: r.comida as Comida, alimento, cantidad, creado: r.creado };
}

// Lo guardado en el celu: se descartan los registros que no sean válidos.
export function leerDiarioGuardado(datos: unknown): RegistroComida[] {
  if (!Array.isArray(datos)) return [];
  return datos.map(leerRegistro).filter((r): r is RegistroComida => r !== null);
}
