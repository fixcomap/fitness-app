// Lo que la app le manda a /coach: los últimos mensajes de la charla y un resumen de los datos del
// celular (perfil, últimos 7 días y rutinas). El catálogo de ejercicios no va: lo tiene la API.
// Tiene que pasar la validación de la API (apps/api/src/ia/coach.js, esquemaPedidoCoach).
// Funciones puras.
import { kcalCaminata } from '../actividad/calculos';
import type { TotalDelDia } from '../actividad/semana';
import { nutrientesRegistro, type RegistroComida } from '../comida/diario';
import { sumarNutrientes, textoCantidad } from '../comida/porciones';
import { duracionMs } from '../entreno/resumen';
import type { Rutina } from '../entreno/rutinas';
import type { SesionGuardada } from '../entreno/tipos';
import { sumarDias } from '../fechas';
import { claveDia } from '../pasosManuales';
import { metasNutricion, type ObjetivoEntreno, type PerfilUsuario } from '../perfil';
import type { Objetivo, Sexo } from '../calorias';

// El chat guarda 40 mensajes en el celular; a la API van solo los últimos 10.
export const MAXIMO_MENSAJES_GUARDADOS = 40;
export const MAXIMO_MENSAJES_API = 10;
// Límites de la API (si se pasan, el pedido entero da 400).
export const MAXIMO_TEXTO_MENSAJE = 2000;
const MAXIMO_COMIDAS_DIA = 40;
const MAXIMO_TEXTO_COMIDA = 80;
const MAXIMO_ENTRENOS_DIA = 5;
const MAXIMO_NOMBRE_ENTRENO = 60;
const MAXIMO_RUTINAS = 14;
const MAXIMO_EJERCICIOS_RUTINA = 30;
const MAXIMO_NOMBRE_RUTINA = 40;
const MAXIMO_PASOS_DIA = 200_000;
const MAXIMO_DURACION_MIN = 600;
const DIAS_RESUMEN = 7;

export interface MensajeChat {
  rol: 'usuario' | 'coach';
  texto: string;
}

export interface DiaResumen {
  fecha: string; // 'AAAA-MM-DD'
  kcal: number;
  proteinas: number;
  carbos: number;
  grasas: number;
  comidas: string[]; // "Empanada de carne (2 empanadas)"
  entrenos: { nombre: string; ejercicios: number; duracionMin: number }[];
  pasos: number;
  kcalActividad: number; // caminata + entrenos, como en el resumen del día
}

export interface ContextoCoach {
  hoy: string; // 'AAAA-MM-DD' en hora local del celular
  perfil: {
    nombre?: string;
    sexo: Sexo;
    edad: number;
    alturaCm: number;
    pesoKg: number;
    objetivoPeso: Objetivo;
    objetivo: ObjetivoEntreno;
    diasEntrenoPorSemana: number;
    kcalObjetivo: number;
  };
  ultimos7Dias: DiaResumen[]; // hoy y los 6 días anteriores, del más viejo al más nuevo
  rutinas: Rutina[];
}

export interface PedidoCoach {
  mensajes: MensajeChat[];
  contexto: ContextoCoach;
}

export interface DatosCoach {
  ahora: Date;
  perfil: PerfilUsuario;
  diario: readonly RegistroComida[];
  sesiones: readonly SesionGuardada[];
  rutinas: readonly Rutina[];
  totalDelDia: TotalDelDia; // pasos del día (historial + sensor + cargas manuales)
}

const recortar = (texto: string, maximo: number) => texto.trim().slice(0, maximo);
const redondear = (x: number) => Math.max(0, Math.round(x));

// Los últimos 10 mensajes con texto. Si al recortar queda primero uno del coach, se saca:
// la charla tiene que empezar por el usuario (Claude lo exige).
export function mensajesParaApi(mensajes: readonly MensajeChat[]): MensajeChat[] {
  const conTexto = mensajes
    .map((m) => ({ rol: m.rol, texto: recortar(m.texto, MAXIMO_TEXTO_MENSAJE) }))
    .filter((m) => m.texto.length > 0);
  const ultimos = conTexto.slice(-MAXIMO_MENSAJES_API);
  const primero = ultimos.findIndex((m) => m.rol === 'usuario');
  return primero < 0 ? [] : ultimos.slice(primero);
}

function resumenDia(fecha: string, d: DatosCoach): DiaResumen {
  const registros = d.diario.filter((r) => r.dia === fecha);
  const total = sumarNutrientes(registros.map(nutrientesRegistro));
  const sesiones = d.sesiones.filter((s) => claveDia(new Date(s.fin)) === fecha);
  const pasos = Math.min(redondear(d.totalDelDia(fecha).pasos), MAXIMO_PASOS_DIA);
  const kcalEntrenos = sesiones.reduce((t, s) => t + s.kcal, 0);
  return {
    fecha,
    kcal: redondear(total.kcal),
    proteinas: redondear(total.proteinas),
    carbos: redondear(total.carbos),
    grasas: redondear(total.grasas),
    comidas: registros
      .slice(0, MAXIMO_COMIDAS_DIA)
      .map((r) => recortar(`${r.alimento.nombre} (${textoCantidad(r.alimento, r.cantidad)})`, MAXIMO_TEXTO_COMIDA)),
    entrenos: sesiones.slice(0, MAXIMO_ENTRENOS_DIA).map((s) => ({
      nombre: recortar(s.nombre, MAXIMO_NOMBRE_ENTRENO),
      ejercicios: s.ejercicios.length,
      duracionMin: Math.min(redondear(duracionMs(s) / 60_000), MAXIMO_DURACION_MIN),
    })),
    pasos,
    kcalActividad: kcalCaminata(pasos, d.perfil.alturaCm, d.perfil.pesoKg) + redondear(kcalEntrenos),
  };
}

export function armarContexto(d: DatosCoach): ContextoCoach {
  const { perfil } = d;
  const dias = Array.from({ length: DIAS_RESUMEN }, (_, i) => claveDia(sumarDias(d.ahora, i - (DIAS_RESUMEN - 1))));
  return {
    hoy: claveDia(d.ahora),
    perfil: {
      ...(perfil.nombre.trim() ? { nombre: perfil.nombre.trim() } : {}),
      sexo: perfil.sexo,
      edad: perfil.edad,
      alturaCm: perfil.alturaCm,
      pesoKg: perfil.pesoKg,
      objetivoPeso: perfil.objetivoPeso,
      objetivo: perfil.objetivo,
      diasEntrenoPorSemana: perfil.diasEntrenoPorSemana,
      kcalObjetivo: metasNutricion(perfil).kcal,
    },
    ultimos7Dias: dias.map((fecha) => resumenDia(fecha, d)),
    rutinas: d.rutinas.slice(0, MAXIMO_RUTINAS).map((r) => ({
      id: r.id,
      nombre: recortar(r.nombre, MAXIMO_NOMBRE_RUTINA),
      dias: [...r.dias],
      ejercicios: r.ejercicios.slice(0, MAXIMO_EJERCICIOS_RUTINA).map((e) => ({ ...e, rango: { ...e.rango } })),
    })),
  };
}

// null si no hay ningún mensaje del usuario para mandar (la API pide que el último sea suyo).
export function armarPedido(mensajes: readonly MensajeChat[], datos: DatosCoach): PedidoCoach | null {
  const recortados = mensajesParaApi(mensajes);
  if (recortados.at(-1)?.rol !== 'usuario') return null;
  return { mensajes: recortados, contexto: armarContexto(datos) };
}
