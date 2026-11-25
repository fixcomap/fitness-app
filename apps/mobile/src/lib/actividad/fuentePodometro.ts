// Fuente de actividad basada en el podómetro de expo-sensors.
// En iOS (también en Expo Go) se pueden pedir los pasos entre dos fechas, de los
// últimos 7 días. En Android getStepCountAsync por rango no está soportado, así
// que ahí la fuente no está disponible y la app usa sólo cargas manuales.
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

import type { EstadoPermiso, FuenteActividad } from './FuenteActividad';

function aEstado(respuesta: Pedometer.PermissionResponse): EstadoPermiso {
  if (respuesta.granted) return 'concedido';
  // Si todavía se puede preguntar, el usuario no dijo que no de forma definitiva.
  return respuesta.status === 'undetermined' ? 'sin-preguntar' : 'denegado';
}

export function crearFuentePodometro(): FuenteActividad {
  return {
    nombre: 'Podómetro',

    async disponible() {
      if (Platform.OS !== 'ios') return false;
      try {
        return await Pedometer.isAvailableAsync();
      } catch {
        return false;
      }
    },

    async permiso() {
      try {
        return aEstado(await Pedometer.getPermissionsAsync());
      } catch {
        return 'denegado';
      }
    },

    async pedirPermiso() {
      try {
        return aEstado(await Pedometer.requestPermissionsAsync());
      } catch {
        return 'denegado';
      }
    },

    async pasosEntre(inicio, fin) {
      if (fin.getTime() <= inicio.getTime()) return 0;
      const { steps } = await Pedometer.getStepCountAsync(inicio, fin);
      return steps;
    },
  };
}
