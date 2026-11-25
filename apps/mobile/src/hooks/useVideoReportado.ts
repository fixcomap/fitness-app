import { useCallback, useEffect, useState } from 'react';

import { guardarVideosReportados, leerVideosReportados } from '../lib/almacenamiento';
import { estaReportado, reportarVideo } from '../lib/videosReportados';

// Si el usuario ya marcó este video como "no sirve", y cómo marcarlo.
export function useVideoReportado(ejercicioId: string, youtubeId: string) {
  const [reportado, setReportado] = useState(false);

  useEffect(() => {
    let vigente = true;
    leerVideosReportados().then((reportes) => {
      if (vigente) setReportado(estaReportado(reportes, ejercicioId, youtubeId));
    });
    return () => {
      vigente = false;
    };
  }, [ejercicioId, youtubeId]);

  const reportar = useCallback(async () => {
    setReportado(true);
    // Se lee lo guardado justo antes de escribir, para no pisar otras marcas.
    const reportes = await leerVideosReportados();
    const nuevos = reportarVideo(reportes, ejercicioId, youtubeId, new Date());
    if (nuevos !== reportes) await guardarVideosReportados(nuevos).catch(() => {});
  }, [ejercicioId, youtubeId]);

  return { reportado, reportar };
}
