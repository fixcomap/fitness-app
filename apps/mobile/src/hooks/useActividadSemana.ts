import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useDatosDelDia } from '../estado/DatosDelDia';
import { minutosActivosDelDia, pasosPorDia, type PasosDelDia } from '../lib/actividad/consultas';
import { armarSemana, pasosRecientes } from '../lib/actividad/semana';
import { inicioDelDia, inicioDeSemana, mismoDia, sumarDias } from '../lib/fechas';
import { claveDia } from '../lib/pasosManuales';

// Datos de la semana para la pantalla Actividad: pasos por día (sensor + manuales),
// minutos activos de lunes a hoy y lo necesario para la racha.
export function useActividadSemana() {
  const { fuente, estadoFuente, cargas, pasosSensorHoy } = useDatosDelDia();
  const activa = estadoFuente === 'activa';
  const [sensorDias, setSensorDias] = useState<PasosDelDia[]>([]);
  const [minutosSensor, setMinutosSensor] = useState(0);
  // Los minutos de días pasados no cambian: se calculan una sola vez.
  const minutosPasados = useRef(new Map<string, number>());

  const cargar = useCallback(() => {
    if (!activa) return;
    const ahora = new Date();
    pasosPorDia(fuente, ahora, 7).then(setSensorDias);

    const lunes = inicioDeSemana(ahora);
    const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).filter((d) => d.getTime() <= ahora.getTime());
    Promise.all(
      dias.map(async (dia) => {
        const clave = claveDia(dia);
        const esHoy = mismoDia(dia, ahora);
        const guardado = minutosPasados.current.get(clave);
        if (!esHoy && guardado !== undefined) return guardado;
        const minutos = await minutosActivosDelDia(fuente, dia, ahora);
        if (!esHoy) minutosPasados.current.set(clave, minutos);
        return minutos;
      }),
    ).then((porDia) => setMinutosSensor(porDia.reduce((a, b) => a + b, 0)));
    // pasosSensorHoy: se vuelve a cargar cada vez que cambian los pasos de hoy.
  }, [activa, fuente, pasosSensorHoy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al entrar a la pestaña y mientras está abierta, cada vez que cambian los pasos de hoy.
  useFocusEffect(cargar);

  return useMemo(() => {
    const ahora = new Date();
    // Sin fuente activa (o mientras carga), los días pasados van en 0 y quedan las cargas manuales.
    // Hoy siempre usa los pasos del contexto, los mismos que muestra Inicio.
    const base = activa && sensorDias.length > 0 ? sensorDias : ultimosSieteDiasVacios(ahora);
    const sensor = base.map((d) => (mismoDia(d.dia, ahora) ? { ...d, pasos: pasosSensorHoy } : d));
    const semana = armarSemana(ahora, sensor, cargas);
    return {
      semana,
      minutosSemana: (activa ? minutosSensor : 0) + semana.minutosManuales,
      pasosParaRacha: pasosRecientes(sensor, cargas),
    };
  }, [activa, sensorDias, pasosSensorHoy, minutosSensor, cargas]);
}

// Últimos 7 días sin pasos del sensor: la racha se arma igual con las cargas manuales.
function ultimosSieteDiasVacios(ahora: Date): PasosDelDia[] {
  const hoy = inicioDelDia(ahora);
  return Array.from({ length: 7 }, (_, i) => ({ dia: sumarDias(hoy, i - 6), pasos: 0 }));
}
