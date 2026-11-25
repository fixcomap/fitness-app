// Configuración del usuario. Los valores por defecto viven acá; los que el
// usuario cambia se guardan en el celu (ver almacenamiento).

export interface Configuracion {
  metaPasos: number;
}

export const CONFIGURACION_POR_DEFECTO: Configuracion = { metaPasos: 10000 };

export const META_PASOS_MINIMA = 1000;
export const META_PASOS_MAXIMA = 50000;

// Devuelve la meta redondeada a la centena, o null si no es válida.
export function validarMetaPasos(valor: number): number | null {
  if (!Number.isFinite(valor)) return null;
  const redondeada = Math.round(valor / 100) * 100;
  if (redondeada < META_PASOS_MINIMA || redondeada > META_PASOS_MAXIMA) return null;
  return redondeada;
}

// Combina lo guardado con los valores por defecto, descartando lo que no sea válido.
export function leerConfiguracion(guardada: unknown): Configuracion {
  const config = { ...CONFIGURACION_POR_DEFECTO };
  if (guardada && typeof guardada === 'object' && 'metaPasos' in guardada) {
    const meta = validarMetaPasos(Number((guardada as { metaPasos: unknown }).metaPasos));
    if (meta !== null) config.metaPasos = meta;
  }
  return config;
}
