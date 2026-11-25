import { useFocusEffect } from '@react-navigation/native';
import { useMemo } from 'react';

import { useDatosDelDia } from '../estado/DatosDelDia';
import type { PasosDelDia } from '../lib/actividad/consultas';
import { armarSemana, pasosRecientes } from '../lib/actividad/semana';
import { inicioDelDia, mismoDia, sumarDias } from '../lib/fechas';

// Datos de la semana para la pantalla Actividad: pasos por día (sensor + manuales)
// y lo necesario para la racha. Los minutos activos vienen del estado compartido.
export function useActividadSemana() {
  const { cargas, pasosSensorHoy, actividadSensor, minutos, refrescarPasos } = useDatosDelDia();

  // Al entrar a la pestaña pedimos los pasos de hoy; si cambiaron, se recalcula todo.
  useFocusEffect(refrescarPasos);

  return useMemo(() => {
    const ahora = new Date();
    // Sin fuente activa (o mientras carga), los días pasados van en 0 y quedan las cargas manuales.
    // Hoy siempre usa los pasos del contexto, los mismos que muestra Inicio.
    const base = actividadSensor.pasosPorDia.length > 0 ? actividadSensor.pasosPorDia : ultimosSieteDiasVacios(ahora);
    const sensor = base.map((d) => (mismoDia(d.dia, ahora) ? { ...d, pasos: pasosSensorHoy } : d));
    return {
      semana: armarSemana(ahora, sensor, cargas),
      minutosSemana: minutos.semana,
      pasosParaRacha: pasosRecientes(sensor, cargas),
    };
  }, [actividadSensor, pasosSensorHoy, minutos, cargas]);
}

// Últimos 7 días sin pasos del sensor: la racha se arma igual con las cargas manuales.
function ultimosSieteDiasVacios(ahora: Date): PasosDelDia[] {
  const hoy = inicioDelDia(ahora);
  return Array.from({ length: 7 }, (_, i) => ({ dia: sumarDias(hoy, i - 6), pasos: 0 }));
}
