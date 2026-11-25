import { useEffect, useMemo, useState } from 'react';

import { actualizarHistorial, registrosCerrados, type RegistroDia, type TotalesDia } from '../lib/actividad/historial';
import { guardarHistorial, leerHistorial } from '../lib/almacenamiento';

const VACIO: readonly RegistroDia[] = [];

interface Opciones {
  vivos: ReadonlyMap<string, TotalesDia>; // totales de los últimos días (sensor + manuales)
  listoParaCerrar: boolean; // ya se leyó todo lo necesario para que los totales sean confiables
  conSensor: boolean;
}

// Historial de días cerrados guardado en el celu. Cada vez que hay totales nuevos
// de días que ya terminaron, se suman al historial y se guarda.
export function useHistorialActividad({ vivos, listoParaCerrar, conSensor }: Opciones): readonly RegistroDia[] {
  const [guardado, setGuardado] = useState<readonly RegistroDia[] | null>(null);

  useEffect(() => {
    let vigente = true;
    leerHistorial().then((h) => {
      if (vigente) setGuardado(h);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const historial = useMemo(() => {
    if (guardado === null) return VACIO;
    if (!listoParaCerrar) return guardado;
    const hoy = new Date();
    return actualizarHistorial(guardado, registrosCerrados(vivos, hoy, conSensor), hoy);
  }, [guardado, listoParaCerrar, vivos, conSensor]);

  // Guarda sólo si cambió algo (actualizarHistorial devuelve el mismo arreglo si no).
  useEffect(() => {
    if (guardado === null || historial === guardado) return;
    let vigente = true;
    guardarHistorial(historial)
      .then(() => {
        if (vigente) setGuardado(historial);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [historial, guardado]);

  return historial;
}
