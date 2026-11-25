import { useCallback, useEffect, useState } from 'react';

import { guardarConfiguracion, leerConfiguracionGuardada } from '../lib/almacenamiento';
import { CONFIGURACION_POR_DEFECTO, validarMetaPasos, type Configuracion } from '../lib/configuracion';

// Configuración del usuario guardada en el celu (por ahora, la meta de pasos).
export function useConfiguracion() {
  const [config, setConfig] = useState<Configuracion>(CONFIGURACION_POR_DEFECTO);

  useEffect(() => {
    let vigente = true;
    leerConfiguracionGuardada().then((leida) => {
      if (vigente) setConfig(leida);
    });
    return () => {
      vigente = false;
    };
  }, []);

  // Devuelve la meta guardada, o null si no es válida.
  const cambiarMetaPasos = useCallback((valor: number) => {
    const meta = validarMetaPasos(valor);
    if (meta === null) return null;
    setConfig((actual) => {
      const nueva = { ...actual, metaPasos: meta };
      guardarConfiguracion(nueva).catch(() => {});
      return nueva;
    });
    return meta;
  }, []);

  return { config, cambiarMetaPasos };
}
