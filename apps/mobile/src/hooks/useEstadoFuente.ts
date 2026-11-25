import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { estadoFuente, leerEstadoFuente, type EstadoFuente } from '../lib/actividad/consultas';
import type { FuenteActividad } from '../lib/actividad/FuenteActividad';

// Estado de la fuente de actividad (disponible y con permiso). Se vuelve a leer
// cuando la app vuelve al frente, por si el usuario activó el permiso en Ajustes.
export function useEstadoFuente(fuente: FuenteActividad) {
  const [estado, setEstado] = useState<EstadoFuente>('cargando');

  const refrescar = useCallback(() => {
    leerEstadoFuente(fuente).then(setEstado);
  }, [fuente]);

  useEffect(() => {
    refrescar();
    const suscripcion = AppState.addEventListener('change', (s) => {
      if (s === 'active') refrescar();
    });
    return () => suscripcion.remove();
  }, [refrescar]);

  const pedirPermiso = useCallback(async () => {
    const permiso = await fuente.pedirPermiso();
    setEstado(estadoFuente(true, permiso));
  }, [fuente]);

  return { estado, pedirPermiso, refrescar };
}
