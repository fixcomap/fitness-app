import { useFocusEffect } from '@react-navigation/native';
import { useMemo } from 'react';

import { useDatosDelDia } from '../estado/DatosDelDia';
import { armarSemana } from '../lib/actividad/semana';

// Datos de la semana para la pantalla Actividad. Todo sale del estado compartido:
// historial de días cerrados + podómetro + cargas manuales.
export function useActividadSemana() {
  const { totalDelDia, serieDePasos, minutos, refrescarPasos } = useDatosDelDia();

  // Al entrar a la pestaña pedimos los pasos de hoy; si cambiaron, se recalcula todo.
  useFocusEffect(refrescarPasos);

  return useMemo(
    () => ({
      semana: armarSemana(new Date(), totalDelDia),
      minutosSemana: minutos.semana,
      pasosParaRacha: serieDePasos,
    }),
    [totalDelDia, minutos, serieDePasos],
  );
}
