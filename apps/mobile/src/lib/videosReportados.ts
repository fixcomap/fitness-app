// Videos que el usuario marcó como "no sirve", para revisarlos después.
// Se guarda el video junto al ejercicio: si más adelante se cambia el video,
// la marca vieja no se aplica al nuevo. Funciones puras.

export interface VideoReportado {
  ejercicioId: string;
  youtubeId: string;
  fecha: string; // ISO
}

export function estaReportado(reportes: readonly VideoReportado[], ejercicioId: string, youtubeId: string): boolean {
  return reportes.some((r) => r.ejercicioId === ejercicioId && r.youtubeId === youtubeId);
}

// Agrega la marca; si ya estaba, devuelve la misma lista.
export function reportarVideo(
  reportes: readonly VideoReportado[],
  ejercicioId: string,
  youtubeId: string,
  ahora: Date,
): readonly VideoReportado[] {
  if (!ejercicioId || !youtubeId.trim() || estaReportado(reportes, ejercicioId, youtubeId)) return reportes;
  return [...reportes, { ejercicioId, youtubeId, fecha: ahora.toISOString() }];
}

// Valida lo leído del almacenamiento y descarta lo mal formado.
export function leerReportesGuardados(datos: unknown): VideoReportado[] {
  if (!Array.isArray(datos)) return [];
  return datos.filter(
    (r): r is VideoReportado =>
      !!r &&
      typeof r === 'object' &&
      typeof r.ejercicioId === 'string' &&
      r.ejercicioId !== '' &&
      typeof r.youtubeId === 'string' &&
      r.youtubeId !== '' &&
      typeof r.fecha === 'string' &&
      !Number.isNaN(Date.parse(r.fecha)),
  );
}
