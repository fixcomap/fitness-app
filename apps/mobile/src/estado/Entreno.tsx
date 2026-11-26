// Estado del entreno compartido por todas las pantallas: la sesión armada de hoy,
// la sesión en curso (se guarda en cada cambio, así se retoma si se cierra la app)
// y el historial de sesiones terminadas.
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { buscarEjercicioPorId } from '../data/ejercicios';
import type { Ejercicio } from '../data/tipos';
import {
  guardarHistorialEntreno,
  guardarSesionArmada,
  guardarSesionEnCurso,
  leerHistorialEntreno,
  leerSesionArmada,
  leerSesionEnCurso,
} from '../lib/almacenamiento';
import { cancelarAvisoDescanso, pedirPermisoAvisos, programarAvisoDescanso } from '../lib/avisoDescanso';
import { agregarAlHistorial, ordenarHistorial } from '../lib/entreno/historial';
import { duracionMs, kcalEntreno } from '../lib/entreno/resumen';
import {
  agregarALaSesion,
  armadaDeHoy,
  cerrarSesion,
  empezarSesion,
  moverEnLaSesion,
  planPorDefecto,
  quitarDeLaSesion,
  sesionVacia,
} from '../lib/entreno/sesion';
import type { SesionArmada, SesionEnCurso, SesionGuardada } from '../lib/entreno/tipos';
import { useDatosDelDia } from './DatosDelDia';

// Si el descanso terminó hace más que esto (la app estaba en segundo plano), no se vibra.
const MARGEN_VIBRACION_MS = 3000;

const nuevoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface EntrenoValor {
  listo: boolean;
  armada: SesionArmada;
  ejerciciosArmados: Ejercicio[];
  enCurso: SesionEnCurso | null;
  historial: SesionGuardada[];
  agregar: (ejercicioId: string) => void;
  quitar: (ejercicioId: string) => void;
  mover: (indice: number, delta: number) => void;
  // Arma la sesión en curso con los ejercicios de la armada. false si no hay ninguno.
  empezar: () => boolean;
  actualizar: (cambio: (sesion: SesionEnCurso) => SesionEnCurso) => void;
  // Guarda la sesión en el historial y devuelve lo guardado (null si no había sesión).
  terminar: () => SesionGuardada | null;
  descartar: () => void;
}

const Contexto = createContext<EntrenoValor | null>(null);

export function ProveedorEntreno({ children }: { children: ReactNode }) {
  const { perfil } = useDatosDelDia();
  const [armada, setArmada] = useState<SesionArmada>(() => sesionVacia(new Date()));
  const [enCurso, setEnCurso] = useState<SesionEnCurso | null>(null);
  const [historial, setHistorial] = useState<SesionGuardada[]>([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([leerSesionArmada(), leerSesionEnCurso(), leerHistorialEntreno()]).then(([a, c, h]) => {
      if (!vigente) return;
      setArmada(armadaDeHoy(a, new Date()));
      setEnCurso(c);
      setHistorial(ordenarHistorial(h));
      setListo(true);
    });
    return () => {
      vigente = false;
    };
  }, []);

  // Se guarda cada cambio, pero no antes de haber leído (si no, pisaría lo guardado).
  useEffect(() => {
    if (listo) guardarSesionArmada(armada).catch(() => {});
  }, [armada, listo]);
  useEffect(() => {
    if (listo) guardarSesionEnCurso(enCurso).catch(() => {});
  }, [enCurso, listo]);
  useEffect(() => {
    if (listo) guardarHistorialEntreno(historial).catch(() => {});
  }, [historial, listo]);

  // Fin del descanso: notificación programada por si la app pasa a segundo plano y,
  // con la app abierta, vibración al llegar a 0. El descanso no se borra al terminar:
  // la pantalla muestra "¡Dale!" hasta la próxima serie o hasta que se toque Saltar.
  const finDescanso = enCurso?.descanso?.fin ?? null;
  useEffect(() => {
    if (!finDescanso) {
      cancelarAvisoDescanso();
      return;
    }
    const fin = Date.parse(finDescanso);
    programarAvisoDescanso(new Date(fin));
    if (fin <= Date.now()) return;
    const temporizador = setTimeout(() => {
      if (AppState.currentState === 'active' && Date.now() - fin < MARGEN_VIBRACION_MS) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, fin - Date.now());
    return () => clearTimeout(temporizador);
  }, [finDescanso]);

  const agregar = useCallback(
    (id: string) => setArmada((a) => agregarALaSesion(armadaDeHoy(a, new Date()), id)),
    [],
  );
  const quitar = useCallback((id: string) => setArmada((a) => quitarDeLaSesion(a, id)), []);
  const mover = useCallback((indice: number, delta: number) => setArmada((a) => moverEnLaSesion(a, indice, delta)), []);

  const ejerciciosArmados = useMemo(
    () => armada.ejercicios.map(buscarEjercicioPorId).filter((e): e is Ejercicio => e !== undefined),
    [armada],
  );

  const empezar = useCallback(() => {
    if (ejerciciosArmados.length === 0) return false;
    const planes = ejerciciosArmados.map((e) => planPorDefecto(e, historial, perfil.objetivo));
    setEnCurso((actual) => actual ?? empezarSesion(planes, historial, new Date(), nuevoId()));
    pedirPermisoAvisos();
    return true;
  }, [ejerciciosArmados, historial, perfil.objetivo]);

  const actualizar = useCallback((cambio: (s: SesionEnCurso) => SesionEnCurso) => {
    setEnCurso((s) => (s ? cambio(s) : s));
  }, []);

  const terminar = useCallback(() => {
    if (!enCurso) return null;
    const ahora = new Date();
    const kcal = kcalEntreno(perfil.pesoKg, duracionMs({ inicio: enCurso.inicio, fin: ahora.toISOString() }));
    const guardada = cerrarSesion(enCurso, ahora, kcal);
    setHistorial((h) => agregarAlHistorial(h, guardada));
    setEnCurso(null);
    // Se vacía la armada, salvo lo que se agregó durante la sesión y no estaba en ella.
    const hechos = new Set(enCurso.ejercicios.map((e) => e.ejercicioId));
    setArmada((a) => ({ ...sesionVacia(ahora), ejercicios: a.ejercicios.filter((id) => !hechos.has(id)) }));
    return guardada;
  }, [enCurso, perfil.pesoKg]);

  const descartar = useCallback(() => setEnCurso(null), []);

  const valor = useMemo<EntrenoValor>(
    () => ({
      listo,
      armada,
      ejerciciosArmados,
      enCurso,
      historial,
      agregar,
      quitar,
      mover,
      empezar,
      actualizar,
      terminar,
      descartar,
    }),
    [listo, armada, ejerciciosArmados, enCurso, historial, agregar, quitar, mover, empezar, actualizar, terminar, descartar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEntreno(): EntrenoValor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useEntreno tiene que usarse dentro de ProveedorEntreno');
  return valor;
}
