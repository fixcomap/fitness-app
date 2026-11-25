// Textos del aviso sobre la fuente de actividad (permiso, Android, etc.).
import type { EstadoFuente } from './consultas';

// Nombre de un ícono de Ionicons.
export type IconoAviso = 'walk-outline' | 'lock-closed-outline' | 'information-circle-outline';

export interface Aviso {
  icono: IconoAviso;
  titulo: string;
  texto: string;
  boton?: { texto: string; accion: 'permitir' | 'ajustes' };
}

// Textos del aviso según el estado de la fuente. null = no hace falta avisar nada.
export function avisoPara(estado: EstadoFuente, plataforma: string): Aviso | null {
  switch (estado) {
    case 'sin-preguntar':
      return {
        icono: 'walk-outline',
        titulo: 'Contá tus pasos solo',
        texto:
          'Usamos el sensor de movimiento del celu para contar tus pasos y tus minutos activos. ' +
          'Los datos no salen de tu teléfono.',
        boton: { texto: 'Permitir', accion: 'permitir' },
      };
    case 'denegado':
      return {
        icono: 'lock-closed-outline',
        titulo: 'El permiso de movimiento está apagado',
        texto:
          'Para contar tus pasos, andá a Ajustes › Privacidad y seguridad › Movimiento y forma física ' +
          'y activalo para esta app. Mientras tanto, cargá tus caminatas a mano.',
        boton: { texto: 'Abrir Ajustes', accion: 'ajustes' },
      };
    case 'no-disponible':
      return {
        icono: 'information-circle-outline',
        titulo: 'Este celu no nos pasa los pasos',
        texto:
          plataforma === 'android'
            ? 'En Android todavía no podemos leer los pasos del celu. Cargá tus caminatas a mano y las sumamos.'
            : 'Tu celu no tiene el podómetro disponible. Cargá tus caminatas a mano y las sumamos.',
      };
    default:
      return null;
  }
}
