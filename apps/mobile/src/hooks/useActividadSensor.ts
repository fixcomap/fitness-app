import { useEffect, useRef, useState } from 'react';

import { minutosActivosDelDia, pasosPorDia, type PasosDelDia } from '../lib/actividad/consultas';
import type { FuenteActividad } from '../lib/actividad/FuenteActividad';
import { inicioDelDia, mismoDia, sumarDias } from '../lib/fechas';
import { claveDia } from '../lib/pasosManuales';

export const DIAS_SENSOR = 7; // el podómetro de iOS guarda 7 días

export interface ActividadSensor {
  pasosPorDia: PasosDelDia[]; // últimos 7 días, del más viejo a hoy
  minutosPorDia: Record<string, number>; // 'AAAA-MM-DD' → minutos activos
}

const SIN_DATOS: ActividadSensor = { pasosPorDia: [], minutosPorDia: {} };

// Pasos y minutos activos de los últimos 7 días según la fuente. Se recalcula
// cuando cambian los pasos de hoy; los minutos de los días pasados se calculan una vez.
export function useActividadSensor(fuente: FuenteActividad, activa: boolean, pasosHoy: number): ActividadSensor {
  const [datos, setDatos] = useState<ActividadSensor>(SIN_DATOS);
  const minutosPasados = useRef(new Map<string, number>());

  useEffect(() => {
    if (!activa) return;
    let vigente = true;
    const ahora = new Date();
    const hoy = inicioDelDia(ahora);
    const dias = Array.from({ length: DIAS_SENSOR }, (_, i) => sumarDias(hoy, i - (DIAS_SENSOR - 1)));

    const minutos = Promise.all(
      dias.map(async (dia): Promise<[string, number]> => {
        const clave = claveDia(dia);
        const esHoy = mismoDia(dia, ahora);
        const guardado = minutosPasados.current.get(clave);
        if (!esHoy && guardado !== undefined) return [clave, guardado];
        const valor = await minutosActivosDelDia(fuente, dia, ahora);
        if (!esHoy) minutosPasados.current.set(clave, valor);
        return [clave, valor];
      }),
    );

    Promise.all([pasosPorDia(fuente, ahora, DIAS_SENSOR), minutos]).then(([pasos, porDia]) => {
      if (vigente) setDatos({ pasosPorDia: pasos, minutosPorDia: Object.fromEntries(porDia) });
    });
    return () => {
      vigente = false;
    };
  }, [activa, fuente, pasosHoy]);

  return activa ? datos : SIN_DATOS;
}
