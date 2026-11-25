// Datos del día compartidos por todas las pantallas: perfil, configuración,
// fuente de actividad, pasos del sensor y cargas manuales.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useConfiguracion } from '../hooks/useConfiguracion';
import { useActividadSensor, type ActividadSensor } from '../hooks/useActividadSensor';
import { useEstadoFuente } from '../hooks/useEstadoFuente';
import { usePasosManuales } from '../hooks/usePasosManuales';
import { leerPasos, pasosDeHoy, type EstadoFuente } from '../lib/actividad/consultas';
import { fuenteActividad } from '../lib/actividad/fuente';
import { minutosActivos, type MinutosActivos } from '../lib/actividad/semana';
import type { FuenteActividad } from '../lib/actividad/FuenteActividad';
import type { CargaPasos, Franja, TipoCarga } from '../lib/pasosManuales';
import { PERFIL_EJEMPLO, type PerfilUsuario } from '../lib/perfil';

// Cada cuánto se vuelven a pedir los pasos de hoy mientras la app está abierta.
const REFRESCO_MS = 60_000;

type Configuracion = ReturnType<typeof useConfiguracion>;
type PasosManuales = ReturnType<typeof usePasosManuales>;

export interface DatosDelDiaValor extends Configuracion, Omit<PasosManuales, 'agregar'> {
  perfil: PerfilUsuario;
  fuente: FuenteActividad;
  estadoFuente: EstadoFuente;
  pedirPermiso: () => Promise<void>;
  pasosSensorHoy: number; // 0 si la fuente no está activa
  refrescarPasos: () => void;
  // Pasos y minutos de los últimos 7 días según la fuente (vacío si no está activa).
  actividadSensor: ActividadSensor;
  // Minutos activos reales (sensor + manuales), los mismos en Inicio y en Actividad.
  minutos: MinutosActivos;
  // Carga manual inteligente: le pregunta a la fuente cuántos pasos ya contó en
  // esa franja y suma sólo la diferencia.
  agregarCarga: (tipo: TipoCarga, valor: number, franja: Franja) => Promise<CargaPasos>;
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

  const { agregar } = manuales;
  const agregarCarga = useCallback(
    async (tipo: TipoCarga, valor: number, franja: Franja) => {
      const registrado = activa ? ((await leerPasos(fuente, franja.inicio, franja.fin)) ?? 0) : 0;
      const carga = agregar({ tipo, valor, franja, registrado });
      refrescarPasos();
      return carga;
    },
    [activa, fuente, agregar, refrescarPasos],
  );

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

  const { cargas, cargasDeHoy, totalesDeHoy, borrar } = manuales;
  const actividadSensor = useActividadSensor(fuente, activa, pasosSensorHoy);
  const minutos = useMemo(
    () => minutosActivos(new Date(), actividadSensor.minutosPorDia, cargas),
    [actividadSensor, cargas],
  );
  const valor = useMemo<DatosDelDiaValor>(
    () => ({
      ...configuracion,
      cargas,
      cargasDeHoy,
      totalesDeHoy,
      borrar,
      agregarCarga,
      perfil,
      fuente,
      estadoFuente,
      pedirPermiso,
      pasosSensorHoy,
      refrescarPasos,
      actividadSensor,
      minutos,
    }),
    [
      configuracion,
      cargas,
      cargasDeHoy,
      totalesDeHoy,
      borrar,
      agregarCarga,
      perfil,
      fuente,
      estadoFuente,
      pedirPermiso,
      pasosSensorHoy,
      refrescarPasos,
      actividadSensor,
      minutos,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDatosDelDia(): DatosDelDiaValor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useDatosDelDia tiene que usarse dentro de ProveedorDatosDelDia');
  return valor;
}
