import { useCallback, useEffect, useMemo, useState } from 'react';

import { guardarCargas, leerCargas } from '../lib/almacenamiento';
import {
  borrarCarga,
  cargasDelDia,
  claveDia,
  crearCarga,
  podarCargasViejas,
  totalesCargas,
  type CargaPasos,
  type DatosPaso,
  type TipoCarga,
} from '../lib/pasosManuales';

const nuevoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Cargas de pasos manuales guardadas en el celu.
export function usePasosManuales(perfil: DatosPaso) {
  const [cargas, setCargas] = useState<CargaPasos[]>([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vigente = true;
    leerCargas().then((leidas) => {
      if (!vigente) return;
      setCargas(podarCargasViejas(leidas, new Date()));
      setListo(true);
    });
    return () => {
      vigente = false;
    };
  }, []);

  // Guarda cada cambio, pero no antes de haber leído (si no, pisaría lo guardado con []).
  useEffect(() => {
    if (listo) guardarCargas(cargas).catch(() => {});
  }, [cargas, listo]);

  const agregar = useCallback(
    (tipo: TipoCarga, valor: number) => {
      const carga = crearCarga(tipo, valor, perfil, new Date(), nuevoId());
      setCargas((actuales) => [...actuales, carga]);
      return carga;
    },
    [perfil],
  );

  const borrar = useCallback((id: string) => setCargas((actuales) => borrarCarga(actuales, id)), []);

  const dia = claveDia(new Date());
  const cargasDeHoy = useMemo(() => cargasDelDia(cargas, dia), [cargas, dia]);
  const totalesDeHoy = useMemo(() => totalesCargas(cargasDeHoy), [cargasDeHoy]);
  return useMemo(
    () => ({ cargas, cargasDeHoy, totalesDeHoy, agregar, borrar }),
    [cargas, cargasDeHoy, totalesDeHoy, agregar, borrar],
  );
}
