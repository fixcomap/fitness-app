// Fuente de actividad en memoria, para tests (y para probar pantallas sin sensor).
import type { EstadoPermiso, FuenteActividad } from './FuenteActividad';

export interface Muestra {
  fecha: Date; // momento en que se registraron los pasos
  pasos: number;
}

export interface OpcionesFuenteFalsa {
  muestras?: Muestra[];
  disponible?: boolean;
  permiso?: EstadoPermiso;
  permisoAlPedir?: EstadoPermiso;
  falla?: boolean; // pasosEntre tira error
}

export function crearFuenteFalsa(opciones: OpcionesFuenteFalsa = {}) {
  const { muestras = [], disponible = true, permisoAlPedir = 'concedido', falla = false } = opciones;
  let permiso = opciones.permiso ?? 'concedido';
  const consultas: [Date, Date][] = [];

  const fuente: FuenteActividad = {
    nombre: 'Falsa',
    disponible: async () => disponible,
    permiso: async () => permiso,
    pedirPermiso: async () => {
      permiso = permisoAlPedir;
      return permiso;
    },
    pasosEntre: async (inicio, fin) => {
      consultas.push([inicio, fin]);
      if (falla) throw new Error('sensor no disponible');
      return muestras
        .filter((m) => m.fecha.getTime() >= inicio.getTime() && m.fecha.getTime() < fin.getTime())
        .reduce((total, m) => total + m.pasos, 0);
    },
  };
  return { fuente, consultas };
}
