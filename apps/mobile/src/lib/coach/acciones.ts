// Acciones que propone el coach (respuesta de /coach) y que la app aplica cuando el usuario confirma.
// Los tipos son los de la API (apps/api/src/ia/acciones.js). La API ya las validó contra el contexto que
// mandó la app, pero hasta que el usuario toca Aplicar los datos pueden cambiar: por eso se vuelven a
// validar contra lo guardado (validarContraEstado) antes de aplicarlas.
// Funciones puras: no tocan lo que reciben ni guardan nada.
import { buscarEjercicioPorId } from '../../data/ejercicios';
import { normalizar, type Alimento, type Nutrientes } from '../comida/alimentos';
import { agregarRegistro, COMIDAS, etiquetaDia, NOMBRE_COMIDA, nuevoRegistro, restarDias, type Comida, type RegistroComida } from '../comida/diario';
import { formatearDecimal, type Cantidad } from '../comida/porciones';
import { rangoValido, type Rango } from '../entreno/rangos';
import {
  agregarEjercicios,
  borrarRutina,
  guardarRutina,
  NOMBRE_DIA,
  rutinaDeDia,
  SERIES_MAX,
  SERIES_MIN,
  type DiaSemana,
  type Rutina,
} from '../entreno/rutinas';
import { inicioDelDia, sumarMinutos } from '../fechas';
import { formatearNumero } from '../formato';
import {
  claveDia,
  convertir,
  crearCarga,
  FRANJA_MINIMA_MIN,
  MAXIMO,
  type CargaPasos,
  type DatosPaso,
  type Franja,
  type TipoCarga,
} from '../pasosManuales';

// ── Tipos (los mismos que devuelve la API) ──

export const TIPOS_ACCION = [
  'crear_rutina',
  'agregar_ejercicios',
  'quitar_ejercicios',
  'borrar_rutinas',
  'registrar_comida',
  'cargar_pasos',
] as const;
export type TipoAccion = (typeof TIPOS_ACCION)[number];

export interface EjercicioAccion {
  ejercicioId: string;
  series: number;
  rango: Rango;
}

export type CantidadAccion = { gramos: number } | { unidades: number; porcion: string; gramosPorUnidad: number };
export type EstadoAlimento = 'crudo' | 'cocido' | 'no-aplica';

export interface ItemComida {
  busqueda: string; // lo que se busca en la base: "empanada de carne"
  estado: EstadoAlimento;
  estadoAsumido: boolean; // el usuario no dijo crudo o cocido y el coach lo supuso
  cantidad: CantidadAccion;
  estimado: Nutrientes; // por 100 g: se usa solo si no está en la base
}

export type AccionCoach =
  | { id: string; tipo: 'crear_rutina'; nombre: string; dia: DiaSemana | null; ejercicios: EjercicioAccion[] }
  | { id: string; tipo: 'agregar_ejercicios'; rutinaId: string; ejercicios: EjercicioAccion[] }
  | { id: string; tipo: 'quitar_ejercicios'; rutinaId: string; ejercicioIds: string[] }
  | { id: string; tipo: 'borrar_rutinas'; rutinaIds: string[] }
  | { id: string; tipo: 'registrar_comida'; dia: string; comida: Comida; items: ItemComida[] }
  | { id: string; tipo: 'cargar_pasos'; dia: string; unidad: TipoCarga; valor: number; hora?: string };

export type AccionDe<T extends TipoAccion> = Extract<AccionCoach, { tipo: T }>;

// Lo que la API descartó, con el motivo ("no-existe", "ambiguo"…). Para depurar; la app no lo muestra.
export interface Descartado {
  accion: string;
  motivo: string;
  [dato: string]: unknown;
}

export interface RespuestaCoach {
  texto: string;
  acciones: AccionCoach[];
  descartados: Descartado[];
}

// ── Leer la respuesta de la API ──

const MAXIMO_ACCIONES = 7;
const MAXIMO_ITEMS = 20;
// Lo mismo que valida la API y que acepta la app al cargar a mano.
const CANTIDAD = { unidades: { min: 0.5, max: 20 }, gramos: { min: 5, max: 2000 } };
const GRAMOS_POR_UNIDAD = { min: 1, max: 1000 };
const MAXIMO_POR_100G = { kcal: 1000, macros: 100 };
const DIAS_ATRAS = 6;

type Objeto = Record<string, unknown>;
const esObjeto = (x: unknown): x is Objeto => typeof x === 'object' && x !== null && !Array.isArray(x);
const esTexto = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
const enRango = (x: unknown, min: number, max: number): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const esDia = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const esHora = (x: unknown): x is string => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const textos = (x: unknown): string[] | null => (Array.isArray(x) && x.length > 0 && x.every(esTexto) ? x : null);

function leerEjercicio(x: unknown): EjercicioAccion | null {
  if (!esObjeto(x) || !esTexto(x.ejercicioId) || !Number.isInteger(x.series) || !rangoValido(x.rango)) return null;
  if (!enRango(x.series, SERIES_MIN, SERIES_MAX)) return null;
  return { ejercicioId: x.ejercicioId, series: x.series, rango: { min: x.rango.min, max: x.rango.max } };
}

function leerEjercicios(x: unknown): EjercicioAccion[] | null {
  if (!Array.isArray(x) || x.length === 0) return null;
  const ejercicios = x.map(leerEjercicio);
  return ejercicios.every((e) => e !== null) ? (ejercicios as EjercicioAccion[]) : null;
}

function leerCantidad(x: unknown): CantidadAccion | null {
  if (!esObjeto(x)) return null;
  if ('gramos' in x) return enRango(x.gramos, CANTIDAD.gramos.min, CANTIDAD.gramos.max) ? { gramos: x.gramos } : null;
  if (
    !enRango(x.unidades, CANTIDAD.unidades.min, CANTIDAD.unidades.max) ||
    !esTexto(x.porcion) ||
    !enRango(x.gramosPorUnidad, GRAMOS_POR_UNIDAD.min, GRAMOS_POR_UNIDAD.max)
  ) {
    return null;
  }
  return { unidades: x.unidades, porcion: x.porcion, gramosPorUnidad: x.gramosPorUnidad };
}

function leerItem(x: unknown): ItemComida | null {
  if (!esObjeto(x) || !esTexto(x.busqueda)) return null;
  if (x.estado !== 'crudo' && x.estado !== 'cocido' && x.estado !== 'no-aplica') return null;
  const cantidad = leerCantidad(x.cantidad);
  const e = x.estimado;
  if (!cantidad || !esObjeto(e)) return null;
  const { kcal, macros } = MAXIMO_POR_100G;
  if (!enRango(e.kcal, 0, kcal) || !enRango(e.proteinas, 0, macros) || !enRango(e.carbos, 0, macros) || !enRango(e.grasas, 0, macros)) {
    return null;
  }
  return {
    busqueda: x.busqueda.trim(),
    estado: x.estado,
    estadoAsumido: x.estadoAsumido === true,
    cantidad,
    estimado: { kcal: e.kcal, proteinas: e.proteinas, carbos: e.carbos, grasas: e.grasas },
  };
}

// Una acción con la forma que manda la API, o null.
export function leerAccion(x: unknown): AccionCoach | null {
  if (!esObjeto(x) || !esTexto(x.id)) return null;
  const id = x.id;
  switch (x.tipo) {
    case 'crear_rutina': {
      const ejercicios = leerEjercicios(x.ejercicios);
      const dia = x.dia === null ? null : Number.isInteger(x.dia) && enRango(x.dia, 0, 6) ? (x.dia as DiaSemana) : undefined;
      if (!esTexto(x.nombre) || dia === undefined || !ejercicios) return null;
      return { id, tipo: x.tipo, nombre: x.nombre.trim(), dia, ejercicios };
    }
    case 'agregar_ejercicios': {
      const ejercicios = leerEjercicios(x.ejercicios);
      return esTexto(x.rutinaId) && ejercicios ? { id, tipo: x.tipo, rutinaId: x.rutinaId, ejercicios } : null;
    }
    case 'quitar_ejercicios': {
      const ejercicioIds = textos(x.ejercicioIds);
      return esTexto(x.rutinaId) && ejercicioIds ? { id, tipo: x.tipo, rutinaId: x.rutinaId, ejercicioIds } : null;
    }
    case 'borrar_rutinas': {
      const rutinaIds = textos(x.rutinaIds);
      return rutinaIds ? { id, tipo: x.tipo, rutinaIds } : null;
    }
    case 'registrar_comida': {
      if (!esDia(x.dia) || !COMIDAS.includes(x.comida as Comida) || !Array.isArray(x.items) || x.items.length === 0) return null;
      const items = x.items.slice(0, MAXIMO_ITEMS).map(leerItem);
      if (items.some((i) => i === null)) return null;
      return { id, tipo: x.tipo, dia: x.dia, comida: x.comida as Comida, items: items as ItemComida[] };
    }
    case 'cargar_pasos': {
      if (!esDia(x.dia) || (x.unidad !== 'km' && x.unidad !== 'minutos' && x.unidad !== 'pasos')) return null;
      if (!enRango(x.valor, Number.MIN_VALUE, MAXIMO[x.unidad])) return null;
      if (x.unidad === 'pasos' && !Number.isInteger(x.valor)) return null;
      if (x.hora !== undefined && x.hora !== null && !esHora(x.hora)) return null;
      return { id, tipo: x.tipo, dia: x.dia, unidad: x.unidad, valor: x.valor, ...(esHora(x.hora) ? { hora: x.hora } : {}) };
    }
    default:
      return null;
  }
}

// La respuesta de /coach, o null si no tiene texto. Las acciones mal formadas se descartan (motivo "invalida").
export function leerRespuestaCoach(x: unknown): RespuestaCoach | null {
  if (!esObjeto(x) || !esTexto(x.texto)) return null;
  const crudas = Array.isArray(x.acciones) ? x.acciones : [];
  const acciones: AccionCoach[] = [];
  const descartados: Descartado[] = Array.isArray(x.descartados)
    ? x.descartados.filter((d): d is Descartado => esObjeto(d) && typeof d.accion === 'string' && typeof d.motivo === 'string')
    : [];
  for (const cruda of crudas) {
    const accion = leerAccion(cruda);
    if (accion && acciones.length < MAXIMO_ACCIONES) acciones.push(accion);
    else descartados.push({ accion: esObjeto(cruda) && typeof cruda.tipo === 'string' ? cruda.tipo : '?', motivo: 'invalida' });
  }
  return { texto: x.texto.trim(), acciones, descartados };
}

// ── Estado de la app que tocan las acciones ──

// Cada acción toca una sola de estas claves (lo que se guarda en el celu: rutinas, diario y cargas de pasos).
export interface EstadoApp {
  rutinas: Rutina[];
  diario: RegistroComida[];
  cargas: CargaPasos[];
}
export type ClaveEstado = keyof EstadoApp;

export const CLAVE_DE_ACCION: Record<TipoAccion, ClaveEstado> = {
  crear_rutina: 'rutinas',
  agregar_ejercicios: 'rutinas',
  quitar_ejercicios: 'rutinas',
  borrar_rutinas: 'rutinas',
  registrar_comida: 'diario',
  cargar_pasos: 'cargas',
};

// Lo que hace falta para aplicar (y describir) acciones, además del estado.
export interface EntornoAcciones {
  ahora: Date;
  perfil: DatosPaso; // altura y sexo: para pasar km a pasos
  crearId: () => string; // ids de rutinas nuevas, registros y cargas: los genera la app
  // El alimento de la base (o uno estimado) y la cantidad para un ítem de registrar_comida.
  alimentoPara: (item: ItemComida) => { alimento: Alimento; cantidad: Cantidad };
  // Pasos que el celu ya contó en esa franja (para no contarlos dos veces). Sin podómetro: 0.
  pasosRegistrados?: (franja: Franja) => number;
}

// ── Validar contra lo guardado ──

export type MotivoProblema =
  | 'no-existe'
  | 'no-existe-rutina'
  | 'ya-estan'
  | 'no-esta-en-la-rutina'
  | 'rutina-vacia'
  | 'fecha-no-permitida'
  | 'hora-futura';

export interface ProblemaAccion {
  motivo: MotivoProblema;
  mensaje: string; // para la tarjeta
}

const problema = (motivo: MotivoProblema, mensaje: string): ProblemaAccion => ({ motivo, mensaje });

// Hoy o los 6 días anteriores (las fechas AAAA-MM-DD se comparan como texto).
export function diaPermitido(dia: string, hoy: string): boolean {
  return dia <= hoy && dia >= restarDias(hoy, DIAS_ATRAS);
}

const nombreEjercicio = (id: string) => buscarEjercicioPorId(id)?.nombre ?? id;
const rutinaPorId = (estado: EstadoApp, id: string) => estado.rutinas.find((r) => r.id === id);

// El fin de la caminata: la hora que dijo, o ahora si es hoy, o el final de ese día.
function finCaminata(accion: AccionDe<'cargar_pasos'>, ahora: Date): Date {
  const [a, m, d] = accion.dia.split('-').map(Number);
  if (accion.hora) {
    const [h, min] = accion.hora.split(':').map(Number);
    return new Date(a, m - 1, d, h, min);
  }
  if (accion.dia === claveDia(ahora)) return new Date(a, m - 1, d, ahora.getHours(), ahora.getMinutes());
  return new Date(a, m - 1, d, 23, 59);
}

// null si se puede aplicar tal cual está guardado ahora; si no, por qué.
export function validarContraEstado(accion: AccionCoach, estado: EstadoApp, ahora: Date): ProblemaAccion | null {
  const hoy = claveDia(ahora);
  switch (accion.tipo) {
    case 'crear_rutina':
    case 'agregar_ejercicios': {
      const inventado = accion.ejercicios.find((e) => !buscarEjercicioPorId(e.ejercicioId));
      if (inventado) return problema('no-existe', `"${inventado.ejercicioId}" no está en el catálogo.`);
      if (accion.tipo === 'crear_rutina') return null;
      const rutina = rutinaPorId(estado, accion.rutinaId);
      if (!rutina) return problema('no-existe-rutina', 'Esa rutina ya no existe.');
      const tiene = new Set(rutina.ejercicios.map((e) => e.ejercicioId));
      if (accion.ejercicios.every((e) => tiene.has(e.ejercicioId))) {
        return problema('ya-estan', `"${rutina.nombre}" ya tiene esos ejercicios.`);
      }
      return null;
    }
    case 'quitar_ejercicios': {
      const rutina = rutinaPorId(estado, accion.rutinaId);
      if (!rutina) return problema('no-existe-rutina', 'Esa rutina ya no existe.');
      const quedan = rutina.ejercicios.filter((e) => !accion.ejercicioIds.includes(e.ejercicioId));
      if (quedan.length === rutina.ejercicios.length) {
        return problema('no-esta-en-la-rutina', `"${rutina.nombre}" ya no tiene esos ejercicios.`);
      }
      if (quedan.length === 0) {
        return problema('rutina-vacia', `"${rutina.nombre}" quedaría sin ejercicios: si querés, borrala.`);
      }
      return null;
    }
    case 'borrar_rutinas':
      return accion.rutinaIds.some((id) => rutinaPorId(estado, id))
        ? null
        : problema('no-existe-rutina', accion.rutinaIds.length === 1 ? 'Esa rutina ya no existe.' : 'Esas rutinas ya no existen.');
    case 'registrar_comida':
    case 'cargar_pasos': {
      if (!diaPermitido(accion.dia, hoy)) {
        return problema('fecha-no-permitida', 'Solo se puede cargar hoy o en los 6 días anteriores.');
      }
      if (accion.tipo === 'cargar_pasos' && finCaminata(accion, ahora) > ahora) {
        return problema('hora-futura', `Las ${accion.hora} de hoy todavía no llegaron.`);
      }
      return null;
    }
  }
}

// ── Conflictos: se puede aplicar, pero el usuario tiene que saberlo antes ──

export type TipoConflicto = 'borrado' | 'dia-ocupado' | 'algunos-ya-estan' | 'algunos-no-estan' | 'ya-cargado';

export interface Conflicto {
  tipo: TipoConflicto;
  mensaje: string;
}

// Lo que la tarjeta tiene que mostrar antes de Aplicar. Con "borrado" pide confirmación explícita.
export function conflictos(accion: AccionCoach, estado: EstadoApp): Conflicto[] {
  switch (accion.tipo) {
    case 'crear_rutina': {
      const otra = accion.dia === null ? null : rutinaDeDia(estado.rutinas, accion.dia);
      return otra && accion.dia !== null
        ? [{ tipo: 'dia-ocupado', mensaje: `El ${NOMBRE_DIA[accion.dia]} ya es de "${otra.nombre}": pasa a la rutina nueva.` }]
        : [];
    }
    case 'agregar_ejercicios': {
      const rutina = rutinaPorId(estado, accion.rutinaId);
      const ya = accion.ejercicios.filter((e) => rutina?.ejercicios.some((r) => r.ejercicioId === e.ejercicioId));
      if (!rutina || ya.length === 0 || ya.length === accion.ejercicios.length) return [];
      const nombres = ya.map((e) => nombreEjercicio(e.ejercicioId)).join(', ');
      return [{ tipo: 'algunos-ya-estan', mensaje: `Ya están en "${rutina.nombre}" y no se repiten: ${nombres}.` }];
    }
    case 'quitar_ejercicios': {
      const rutina = rutinaPorId(estado, accion.rutinaId);
      const faltan = accion.ejercicioIds.filter((id) => !rutina?.ejercicios.some((e) => e.ejercicioId === id));
      if (!rutina || faltan.length === 0 || faltan.length === accion.ejercicioIds.length) return [];
      return [{ tipo: 'algunos-no-estan', mensaje: `No están en "${rutina.nombre}": ${faltan.map(nombreEjercicio).join(', ')}.` }];
    }
    case 'borrar_rutinas': {
      const existen = estado.rutinas.filter((r) => accion.rutinaIds.includes(r.id));
      const lista = existen.map((r) => `"${r.nombre}"`).join(', ');
      const mensaje = existen.length === 1 ? `Se borra ${lista}.` : `Se borran ${lista}.`;
      return existen.length ? [{ tipo: 'borrado', mensaje }] : [];
    }
    case 'registrar_comida': {
      const ese = estado.diario.filter((r) => r.dia === accion.dia && r.comida === accion.comida);
      const repetidos = ese.filter((r) => accion.items.some((i) => normalizar(r.alimento.nombre).includes(normalizar(i.busqueda))));
      if (repetidos.length === 0) return [];
      const nombres = [...new Set(repetidos.map((r) => r.alimento.nombre))].join(', ');
      return [{ tipo: 'ya-cargado', mensaje: `Ya hay ${nombres} en ${NOMBRE_COMIDA[accion.comida].toLowerCase()}: se suma otra vez.` }];
    }
    case 'cargar_pasos': {
      const delDia = estado.cargas.filter((c) => c.dia === accion.dia).length;
      if (delDia === 0) return [];
      return [{ tipo: 'ya-cargado', mensaje: `Ese día ya tiene ${delDia === 1 ? '1 carga manual' : `${delDia} cargas manuales`}: esta se suma.` }];
    }
  }
}

// ── Aplicar y deshacer ──

// Cuánto dura el botón Deshacer después de aplicar.
export const DESHACER_MS = 6000;

// Lo que había en la clave que tocó la acción, para volverlo atrás. accionId: la tarjeta que muestra el botón.
export type Deshacer = {
  [C in ClaveEstado]: { accionId: string; clave: C; anterior: EstadoApp[C]; vence: number };
}[ClaveEstado];

export type ResultadoAplicar =
  | { ok: true; estadoNuevo: EstadoApp; deshacer: Deshacer }
  | { ok: false; problema: ProblemaAccion };

function franjaCaminata(accion: AccionDe<'cargar_pasos'>, entorno: EntornoAcciones): Franja {
  const fin = finCaminata(accion, entorno.ahora);
  const { minutos } = convertir(accion.unidad, accion.valor, entorno.perfil);
  const inicio = sumarMinutos(fin, -Math.max(minutos, FRANJA_MINIMA_MIN));
  // La franja no se pasa al día anterior.
  return { inicio: inicio < inicioDelDia(fin) ? inicioDelDia(fin) : inicio, fin };
}

function rutinasNuevas(accion: AccionCoach, rutinas: Rutina[], crearId: () => string): Rutina[] {
  switch (accion.tipo) {
    case 'crear_rutina':
      return guardarRutina(rutinas, {
        id: crearId(),
        nombre: accion.nombre,
        dias: accion.dia === null ? [] : [accion.dia],
        ejercicios: accion.ejercicios.map((e) => ({ ...e, rango: { ...e.rango } })),
      });
    case 'agregar_ejercicios':
      return rutinas.map((r) => (r.id === accion.rutinaId ? agregarEjercicios(r, accion.ejercicios) : r));
    case 'quitar_ejercicios':
      return rutinas.map((r) =>
        r.id === accion.rutinaId ? { ...r, ejercicios: r.ejercicios.filter((e) => !accion.ejercicioIds.includes(e.ejercicioId)) } : r,
      );
    case 'borrar_rutinas':
      return accion.rutinaIds.reduce(borrarRutina, rutinas);
    default:
      return rutinas;
  }
}

// Aplica la acción si sigue siendo válida. Devuelve el estado nuevo (solo cambia la clave de la acción)
// y cómo deshacerla durante DESHACER_MS.
export function aplicar(accion: AccionCoach, estado: EstadoApp, entorno: EntornoAcciones): ResultadoAplicar {
  const error = validarContraEstado(accion, estado, entorno.ahora);
  if (error) return { ok: false, problema: error };
  const vence = entorno.ahora.getTime() + DESHACER_MS;
  const clave = CLAVE_DE_ACCION[accion.tipo];
  const accionId = accion.id;

  if (clave === 'rutinas') {
    const rutinas = rutinasNuevas(accion, estado.rutinas, entorno.crearId);
    return { ok: true, estadoNuevo: { ...estado, rutinas }, deshacer: { accionId, clave, anterior: estado.rutinas, vence } };
  }
  if (accion.tipo === 'registrar_comida') {
    const hoy = claveDia(entorno.ahora);
    const diario = accion.items.reduce((registros, item) => {
      const { alimento, cantidad } = entorno.alimentoPara(item);
      const registro = nuevoRegistro(accion.dia, accion.comida, alimento, cantidad, entorno.ahora, entorno.crearId());
      return agregarRegistro(registros, registro, hoy);
    }, estado.diario);
    return { ok: true, estadoNuevo: { ...estado, diario }, deshacer: { accionId, clave: 'diario', anterior: estado.diario, vence } };
  }
  if (accion.tipo === 'cargar_pasos') {
    const franja = franjaCaminata(accion, entorno);
    const registrado = entorno.pasosRegistrados?.(franja) ?? 0;
    const carga = crearCarga({ tipo: accion.unidad, valor: accion.valor, franja, registrado }, entorno.perfil, entorno.crearId());
    const cargas = [...estado.cargas, carga];
    return { ok: true, estadoNuevo: { ...estado, cargas }, deshacer: { accionId, clave: 'cargas', anterior: estado.cargas, vence } };
  }
  return { ok: false, problema: problema('no-existe', 'Acción desconocida.') };
}

// El estado y el único deshacer que puede estar pendiente. Aplicar otra acción hace caducar el anterior:
// así deshacer nunca restaura una clave que después cambió otra tarjeta.
export interface EstadoConDeshacer {
  estado: EstadoApp;
  pendiente: Deshacer | null;
}

export type ResultadoAplicarAccion = { ok: true; siguiente: EstadoConDeshacer } | { ok: false; problema: ProblemaAccion };

// Aplica la acción y deja su deshacer como el pendiente (el anterior caduca). Si no se puede, no cambia nada.
export function aplicarAccion(actual: EstadoConDeshacer, accion: AccionCoach, entorno: EntornoAcciones): ResultadoAplicarAccion {
  const r = aplicar(accion, actual.estado, entorno);
  return r.ok ? { ok: true, siguiente: { estado: r.estadoNuevo, pendiente: r.deshacer } } : r;
}

// Si la tarjeta de esa acción puede mostrar Deshacer: es la última aplicada y no pasaron los 6 s.
export function puedeDeshacer(actual: EstadoConDeshacer, accionId: string, ahora: Date): boolean {
  return actual.pendiente?.accionId === accionId && ahora.getTime() <= actual.pendiente.vence;
}

// Vuelve la clave de la última acción aplicada a como estaba, o null si no hay nada que deshacer
// (ya pasaron los 6 s o no se aplicó nada).
// Restaura la clave entera: si en esos segundos cambió otra cosa en la misma clave (fuera del coach), también vuelve atrás.
export function deshacerPendiente(actual: EstadoConDeshacer, ahora: Date): EstadoConDeshacer | null {
  const d = actual.pendiente;
  if (!d || ahora.getTime() > d.vence) return null;
  return { estado: { ...actual.estado, [d.clave]: d.anterior }, pendiente: null };
}

// ── Describir (lo que dice la tarjeta) ──

export interface Descripcion {
  titulo: string;
  lineas: string[];
}

const textoRepeticiones = ({ min, max }: Rango) => (min === max ? `${min}` : `${min}-${max}`);
const lineaEjercicio = (e: EjercicioAccion) => `${nombreEjercicio(e.ejercicioId)} · ${e.series} × ${textoRepeticiones(e.rango)}`;
const nombreDeRutina = (estado: EstadoApp, id: string) => {
  const rutina = rutinaPorId(estado, id);
  return rutina ? `"${rutina.nombre}"` : 'una rutina que ya no existe';
};

// "empanada" → "empanadas"; "porción" → "porciones".
export function plural(nombre: string): string {
  if (/[aeiouáéó]$/i.test(nombre)) return `${nombre}s`;
  if (/ón$/.test(nombre)) return `${nombre.slice(0, -2)}ones`;
  return `${nombre}es`;
}

// "2 empanadas · ~90 g c/u", "1 milanesa · ~150 g" o "150 g".
export function textoCantidadAccion(c: CantidadAccion): string {
  if ('gramos' in c) return `${formatearNumero(c.gramos)} g`;
  const nombre = c.unidades === 1 ? c.porcion : plural(c.porcion);
  return `${formatearDecimal(c.unidades)} ${nombre} · ~${formatearNumero(c.gramosPorUnidad)} g${c.unidades === 1 ? '' : ' c/u'}`;
}

// "Empanada de carne · 2 empanadas · ~90 g c/u · cocido (supuesto)".
export function lineaItem(item: ItemComida): string {
  const nombre = item.busqueda.charAt(0).toUpperCase() + item.busqueda.slice(1);
  const estado = item.estado === 'no-aplica' ? '' : ` · ${item.estado}${item.estadoAsumido ? ' (supuesto)' : ''}`;
  return `${nombre} · ${textoCantidadAccion(item.cantidad)}${estado}`;
}

const UNIDAD_PASOS: Record<TipoCarga, string> = { km: 'km', minutos: 'min', pasos: 'pasos' };

export function describir(accion: AccionCoach, estado: EstadoApp, entorno: Pick<EntornoAcciones, 'ahora' | 'perfil'>): Descripcion {
  const hoy = claveDia(entorno.ahora);
  switch (accion.tipo) {
    case 'crear_rutina':
      return {
        titulo: `Crear rutina "${accion.nombre}"`,
        lineas: [accion.dia === null ? 'Sin día asignado' : `Los ${NOMBRE_DIA[accion.dia]}${accion.dia >= 5 ? 's' : ''}`, ...accion.ejercicios.map(lineaEjercicio)],
      };
    case 'agregar_ejercicios':
      return { titulo: `Agregar a ${nombreDeRutina(estado, accion.rutinaId)}`, lineas: accion.ejercicios.map(lineaEjercicio) };
    case 'quitar_ejercicios':
      return { titulo: `Quitar de ${nombreDeRutina(estado, accion.rutinaId)}`, lineas: accion.ejercicioIds.map(nombreEjercicio) };
    case 'borrar_rutinas': {
      const nombres = accion.rutinaIds.map((id) => nombreDeRutina(estado, id));
      return { titulo: nombres.length === 1 ? `Borrar ${nombres[0]}` : `Borrar ${nombres.length} rutinas`, lineas: nombres };
    }
    case 'registrar_comida':
      return { titulo: `${NOMBRE_COMIDA[accion.comida]} · ${etiquetaDia(accion.dia, hoy)}`, lineas: accion.items.map(lineaItem) };
    case 'cargar_pasos': {
      const { pasos } = convertir(accion.unidad, accion.valor, entorno.perfil);
      const valor = `${formatearDecimal(accion.valor)} ${UNIDAD_PASOS[accion.unidad]}`;
      const linea = accion.unidad === 'pasos' ? `${formatearNumero(accion.valor)} pasos` : `${valor} · ≈ ${formatearNumero(pasos)} pasos`;
      return {
        titulo: `Caminata · ${etiquetaDia(accion.dia, hoy)}`,
        lineas: [accion.hora ? `${linea} · hasta las ${accion.hora}` : linea],
      };
    }
  }
}
