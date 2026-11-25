// Datos del día compartidos por todas las pantallas: perfil, configuración,
// fuente de actividad, pasos del sensor y cargas manuales.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useConfiguracion } from '../hooks/useConfiguracion';
import { useEstadoFuente } from '../hooks/useEstadoFuente';
import { usePasosManuales } from '../hooks/usePasosManuales';
import { pasosDeHoy, type EstadoFuente } from '../lib/actividad/consultas';
import { fuenteActividad } from '../lib/actividad/fuente';
import type { FuenteActividad } from '../lib/actividad/FuenteActividad';
import { PERFIL_EJEMPLO, type PerfilUsuario } from '../lib/perfil';

// Cada cuánto se vuelven a pedir los pasos de hoy mientras la app está abierta.
const REFRESCO_MS = 60_000;

type Configuracion = ReturnType<typeof useConfiguracion>;
type PasosManuales = ReturnType<typeof usePasosManuales>;

export interface DatosDelDiaValor extends Configuracion, PasosManuales {
  perfil: PerfilUsuario;
  fuente: FuenteActividad;
  estadoFuente: EstadoFuente;
  pedirPermiso: () => Promise<void>;
  pasosSensorHoy: number; // 0 si la fuente no está activa
  refrescarPasos: () => void;
}

const Contexto = createContext<DatosDelDiaValor | null>(null);

export function ProveedorDatosDelDia({ children }: { children: ReactNode }) {
  const perfil = PERFIL_EJEMPLO;
  const fuente = fuenteActividad;
  const configuracion = useConfiguracion();
  const manuales = usePasosManuales(perfil);
  const { estado: estadoFuente, pedirPermiso } = useEstadoFuente(fuente);
  const [pasosLeidos, setPasosLeidos] = useState(0);
  const activa = estadoFuente === 'activa';
  // Sin fuente activa, el sensor no aporta pasos.
  const pasosSensorHoy = activa ? pasosLeidos : 0;

  const refrescarPasos = useCallback(() => {
    if (!activa) return;
    pasosDeHoy(fuente, new Date()).then((pasos) => {
      if (pasos !== null) setPasosLeidos(pasos);
    });
  }, [activa, fuente]);

  useEffect(() => {
    refrescarPasos();
    const intervalo = setInterval(refrescarPasos, REFRESCO_MS);
    const suscripcion = AppState.addEventListener('change', (s) => {
      if (s === 'active') refrescarPasos();
    });
    return () => {
      clearInterval(intervalo);
      suscripcion.remove();
    };
  }, [refrescarPasos]);

  const valor = useMemo<DatosDelDiaValor>(
    () => ({
      ...configuracion,
      ...manuales,
      perfil,
      fuente,
      estadoFuente,
      pedirPermiso,
      pasosSensorHoy,
      refrescarPasos,
    }),
    [configuracion, manuales, perfil, fuente, estadoFuente, pedirPermiso, pasosSensorHoy, refrescarPasos],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDatosDelDia(): DatosDelDiaValor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useDatosDelDia tiene que usarse dentro de ProveedorDatosDelDia');
  return valor;
}
