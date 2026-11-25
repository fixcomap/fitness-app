// Fuente de actividad que usa la app. Para pasar a Apple Salud / Health Connect,
// se crea otra implementación de FuenteActividad y se cambia sólo esta línea.
import type { FuenteActividad } from './FuenteActividad';
import { crearFuentePodometro } from './fuentePodometro';

export const fuenteActividad: FuenteActividad = crearFuentePodometro();
