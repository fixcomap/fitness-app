// Guardado en el celu con AsyncStorage. Lo que se lee pasa siempre por las
// funciones de validación, así un dato corrupto no rompe la app.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { leerHistorialGuardado, type RegistroDia } from './actividad/historial';
import { leerDiarioGuardado, type RegistroComida } from './comida/diario';
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
