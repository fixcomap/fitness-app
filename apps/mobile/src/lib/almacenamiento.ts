// Guardado en el celu con AsyncStorage. Lo que se lee pasa siempre por las
// funciones de validación, así un dato corrupto no rompe la app.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { leerHistorialGuardado, type RegistroDia } from './actividad/historial';
import { leerConfiguracion, type Configuracion } from './configuracion';
import { leerCargasGuardadas, type CargaPasos } from './pasosManuales';

const CLAVE_CARGAS = 'pasosManuales:v1';
const CLAVE_CONFIGURACION = 'configuracion:v1';
const CLAVE_HISTORIAL = 'historialActividad:v1';

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
