// Datos del día compartidos por todas las pantallas: perfil, configuración,
// fuente de actividad, pasos del sensor y cargas manuales.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useConfiguracion } from '../hooks/useConfiguracion';
import { useActividadSensor } from '../hooks/useActividadSensor';
import { useEstadoFuente } from '../hooks/useEstadoFuente';
import { useHistorialActividad } from '../hooks/useHistorialActividad';
import { usePasosManuales } from '../hooks/usePasosManuales';
import { leerPasos, pasosDeHoy, type EstadoFuente } from '../lib/actividad/consultas';
import { fuenteActividad } from '../lib/actividad/fuente';
import { crearTotalDelDia, serieDePasos, totalesVivos } from '../lib/actividad/historial';
import { minutosActivos, type MinutosActivos, type TotalDelDia } from '../lib/actividad/semana';
import { inicioDelDia, mismoDia } from '../lib/fechas';
import type { FuenteActividad } from '../lib/actividad/FuenteActividad';
import type { CargaPasos, Franja, TipoCarga } from '../lib/pasosManuales';
import { PERFIL_EJEMPLO, type PerfilUsuario } from '../lib/perfil';

// Cada cuánto se vuelven a pedir los pasos de hoy mientras la app está abierta.
const REFRESCO_MS = 60_000;

type Configuracion = ReturnType<typeof useConfiguracion>;
type PasosManuales = ReturnType<typeof usePasosManuales>;

export interface DatosDelDiaValor extends Configuracion, Omit<PasosManuales, 'agregar' | 'listo'> {
  perfil: PerfilUsuario;
  fuente: FuenteActividad;
  estadoFuente: EstadoFuente;
  pedirPermiso: () => Promise<void>;
  pasosSensorHoy: number; // 0 si la fuente no está activa
  refrescarPasos: () => void;
  // Total de pasos y minutos de un día ('AAAA-MM-DD'): historial + sensor + manuales.
  totalDelDia: TotalDelDia;
  // Pasos por día desde el más viejo del historial hasta hoy, para la racha.
  serieDePasos: number[];
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

  const { cargas, listo: manualesListos, cargasDeHoy, totalesDeHoy, borrar } = manuales;
  const actividadSensor = useActividadSensor(fuente, activa, pasosSensorHoy);

  // Totales en vivo de los últimos días. Hoy siempre usa los pasos de pasosSensorHoy.
  const vivos = useMemo(() => {
    const ahora = new Date();
    const sinHoy = actividadSensor.pasosPorDia.filter((d) => !mismoDia(d.dia, ahora));
    const pasos = [...sinHoy, { dia: inicioDelDia(ahora), pasos: pasosSensorHoy }];
    return totalesVivos(pasos, actividadSensor.minutosPorDia, cargas);
  }, [actividadSensor, pasosSensorHoy, cargas]);

  // Sólo se cierran días cuando los datos son confiables: cargas leídas, fuente
  // resuelta y, si hay podómetro, con su respuesta ya recibida.
  const historial = useHistorialActividad({
    vivos,
    conSensor: activa,
    listoParaCerrar: manualesListos && estadoFuente !== 'cargando' && (!activa || actividadSensor.pasosPorDia.length > 0),
  });

  const { totalDelDia, minutos, serie } = useMemo(() => {
    const ahora = new Date();
    const total = crearTotalDelDia(ahora, historial, vivos);
    return { totalDelDia: total, minutos: minutosActivos(ahora, total), serie: serieDePasos(ahora, historial, total) };
  }, [historial, vivos]);

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
      totalDelDia,
      serieDePasos: serie,
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
      totalDelDia,
      serie,
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
