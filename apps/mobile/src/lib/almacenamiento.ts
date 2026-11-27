// Guardado en el celu con AsyncStorage. Lo que se lee pasa siempre por las
// funciones de validación, así un dato corrupto no rompe la app.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { leerHistorialGuardado, type RegistroDia } from './actividad/historial';
import { esIdDispositivo, nuevoIdDispositivo } from './api';
import { leerChatGuardado, type MensajeGuardado } from './coach/chat';
import { leerConsejosGuardados, type ConsejoGuardado } from './coach/consejo';
import type { Alimento } from './comida/alimentos';
import { leerDiarioGuardado, type RegistroComida } from './comida/diario';
import { leerProductosGuardados } from './comida/openFoodFacts';
import { leerPropiosGuardados } from './comida/propios';
import { leerConfiguracion, type Configuracion } from './configuracion';
import { leerPerfilGuardado, type PerfilUsuario } from './perfil';
import { leerArmadaGuardada, leerEnCursoGuardada, leerSesionesGuardadas } from './entreno/historial';
import { leerRutinasGuardadas, type Rutina } from './entreno/rutinas';
import type { SesionArmada, SesionEnCurso, SesionGuardada } from './entreno/tipos';
import { leerCargasGuardadas, type CargaPasos } from './pasosManuales';
import { leerReportesGuardados, type VideoReportado } from './videosReportados';

const CLAVE_CARGAS = 'pasosManuales:v1';
const CLAVE_CONFIGURACION = 'configuracion:v1';
const CLAVE_HISTORIAL = 'historialActividad:v1';
const CLAVE_VIDEOS_REPORTADOS = 'videosReportados:v1';
const CLAVE_SESION_ARMADA = 'sesionArmada:v1';
const CLAVE_SESION_EN_CURSO = 'sesionEnCurso:v1';
const CLAVE_HISTORIAL_ENTRENO = 'historialEntreno:v1';
const CLAVE_RUTINAS = 'rutinas:v1';
const CLAVE_PERFIL = 'perfil:v1';
const CLAVE_DIARIO_COMIDAS = 'diarioComidas:v1';
const CLAVE_PRODUCTOS_OFF = 'productosOff:v1';
const CLAVE_ALIMENTOS_PROPIOS = 'alimentosPropios:v1';
const CLAVE_DISPOSITIVO = 'dispositivo:v1';
const CLAVE_CHAT_COACH = 'chatCoach:v1';
const CLAVE_DESBLOQUEO_DEV = 'coachDesbloqueoDev:v1';
const CLAVE_CONSEJOS_COACH = 'consejosCoach:v1';

async function leerJson(clave: string): Promise<unknown> {
  try {
    const texto = await AsyncStorage.getItem(clave);
    return texto === null ? null : JSON.parse(texto);
  } catch {
    return null;
  }
}

export async function leerCargas(): Promise<CargaPasos[]> {
  return leerCargasGuardadas(await leerJson(CLAVE_CARGAS));
}

export async function guardarCargas(cargas: readonly CargaPasos[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_CARGAS, JSON.stringify(cargas));
}

export async function leerConfiguracionGuardada(): Promise<Configuracion> {
  return leerConfiguracion(await leerJson(CLAVE_CONFIGURACION));
}

export async function guardarConfiguracion(config: Configuracion): Promise<void> {
  await AsyncStorage.setItem(CLAVE_CONFIGURACION, JSON.stringify(config));
}

export async function leerHistorial(): Promise<RegistroDia[]> {
  return leerHistorialGuardado(await leerJson(CLAVE_HISTORIAL));
}

export async function guardarHistorial(historial: readonly RegistroDia[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(historial));
}

export async function leerVideosReportados(): Promise<VideoReportado[]> {
  return leerReportesGuardados(await leerJson(CLAVE_VIDEOS_REPORTADOS));
}

export async function guardarVideosReportados(reportes: readonly VideoReportado[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_VIDEOS_REPORTADOS, JSON.stringify(reportes));
}

export async function leerSesionArmada(): Promise<SesionArmada | null> {
  return leerArmadaGuardada(await leerJson(CLAVE_SESION_ARMADA));
}

export async function guardarSesionArmada(armada: SesionArmada): Promise<void> {
  await AsyncStorage.setItem(CLAVE_SESION_ARMADA, JSON.stringify(armada));
}

export async function leerSesionEnCurso(): Promise<SesionEnCurso | null> {
  return leerEnCursoGuardada(await leerJson(CLAVE_SESION_EN_CURSO));
}

// null borra la sesión en curso (se terminó o se descartó).
export async function guardarSesionEnCurso(sesion: SesionEnCurso | null): Promise<void> {
  if (sesion === null) await AsyncStorage.removeItem(CLAVE_SESION_EN_CURSO);
  else await AsyncStorage.setItem(CLAVE_SESION_EN_CURSO, JSON.stringify(sesion));
}

export async function leerHistorialEntreno(): Promise<SesionGuardada[]> {
  return leerSesionesGuardadas(await leerJson(CLAVE_HISTORIAL_ENTRENO));
}

export async function guardarHistorialEntreno(historial: readonly SesionGuardada[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_HISTORIAL_ENTRENO, JSON.stringify(historial));
}

// null si todavía no hay perfil (primera vez) o el guardado no es válido.
export async function leerPerfil(): Promise<PerfilUsuario | null> {
  return leerPerfilGuardado(await leerJson(CLAVE_PERFIL));
}

export async function guardarPerfil(perfil: PerfilUsuario): Promise<void> {
  await AsyncStorage.setItem(CLAVE_PERFIL, JSON.stringify(perfil));
}

export async function leerRutinas(): Promise<Rutina[]> {
  return leerRutinasGuardadas(await leerJson(CLAVE_RUTINAS));
}

export async function guardarRutinas(rutinas: readonly Rutina[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_RUTINAS, JSON.stringify(rutinas));
}

export async function leerDiarioComidas(): Promise<RegistroComida[]> {
  return leerDiarioGuardado(await leerJson(CLAVE_DIARIO_COMIDAS));
}

export async function guardarDiarioComidas(registros: readonly RegistroComida[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_DIARIO_COMIDAS, JSON.stringify(registros));
}

// Productos envasados ya usados (para escanearlos o buscarlos sin internet).
export async function leerProductosOff(): Promise<Alimento[]> {
  return leerProductosGuardados(await leerJson(CLAVE_PRODUCTOS_OFF));
}

export async function guardarProductosOff(productos: readonly Alimento[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_PRODUCTOS_OFF, JSON.stringify(productos));
}

// Alimentos creados por el usuario.
export async function leerAlimentosPropios(): Promise<Alimento[]> {
  return leerPropiosGuardados(await leerJson(CLAVE_ALIMENTOS_PROPIOS));
}

export async function guardarAlimentosPropios(propios: readonly Alimento[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_ALIMENTOS_PROPIOS, JSON.stringify(propios));
}

// ID de dispositivo para la API (X-Dispositivo): se crea la primera vez y queda guardado.
// Se recuerda la promesa para que dos pedidos a la vez no creen dos IDs distintos.
let idDispositivo: Promise<string> | null = null;

export function leerIdDispositivo(): Promise<string> {
  idDispositivo ??= (async () => {
    const guardado = await leerJson(CLAVE_DISPOSITIVO);
    if (esIdDispositivo(guardado)) return guardado;
    const nuevo = nuevoIdDispositivo();
    await AsyncStorage.setItem(CLAVE_DISPOSITIVO, JSON.stringify(nuevo));
    return nuevo;
  })().catch((e) => {
    idDispositivo = null; // que el próximo pedido lo vuelva a intentar
    throw e;
  });
  return idDispositivo;
}

// La charla con el coach (los últimos 40 mensajes, con el estado de cada acción).
export async function leerChatCoach(): Promise<MensajeGuardado[]> {
  return leerChatGuardado(await leerJson(CLAVE_CHAT_COACH));
}

export async function guardarChatCoach(mensajes: readonly MensajeGuardado[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_CHAT_COACH, JSON.stringify(mensajes));
}

// Solo en desarrollo: el coach desbloqueado sin premium para probarlo en Expo Go (ver coachHabilitado).
export async function leerDesbloqueoDev(): Promise<boolean> {
  return (await leerJson(CLAVE_DESBLOQUEO_DEV)) === true;
}

export async function guardarDesbloqueoDev(desbloqueado: boolean): Promise<void> {
  await AsyncStorage.setItem(CLAVE_DESBLOQUEO_DEV, JSON.stringify(desbloqueado));
}

// Los últimos consejos del día que dio la IA (el de hoy incluido), con su fecha.
export async function leerConsejosCoach(): Promise<ConsejoGuardado[]> {
  return leerConsejosGuardados(await leerJson(CLAVE_CONSEJOS_COACH));
}

export async function guardarConsejosCoach(consejos: readonly ConsejoGuardado[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_CONSEJOS_COACH, JSON.stringify(consejos));
}
