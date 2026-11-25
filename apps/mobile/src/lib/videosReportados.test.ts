import { estaReportado, leerReportesGuardados, reportarVideo, type VideoReportado } from './videosReportados';

const AHORA = new Date('2026-11-25T15:00:00.000Z');

describe('reportarVideo', () => {
  test('agrega la marca con el video y la fecha', () => {
    expect(reportarVideo([], 'flexiones', 'zrDwwnY5GBc', AHORA)).toEqual([
      { ejercicioId: 'flexiones', youtubeId: 'zrDwwnY5GBc', fecha: '2026-11-25T15:00:00.000Z' },
    ]);
  });

  test('no duplica: si ya estaba devuelve la misma lista', () => {
    const una = reportarVideo([], 'flexiones', 'zrDwwnY5GBc', AHORA);
    expect(reportarVideo(una, 'flexiones', 'zrDwwnY5GBc', AHORA)).toBe(una);
  });

  test('sin video no marca nada', () => {
    const vacia: VideoReportado[] = [];
    expect(reportarVideo(vacia, 'flexiones', ' ', AHORA)).toBe(vacia);
  });
});

test('estaReportado depende del ejercicio y del video', () => {
  const reportes = reportarVideo([], 'flexiones', 'viejo', AHORA);
  expect(estaReportado(reportes, 'flexiones', 'viejo')).toBe(true);
  // Si se cambió el video del ejercicio, la marca vieja no cuenta.
  expect(estaReportado(reportes, 'flexiones', 'nuevo')).toBe(false);
  expect(estaReportado(reportes, 'plancha', 'viejo')).toBe(false);
});

describe('leerReportesGuardados', () => {
  test('cualquier cosa que no sea una lista da vacío', () => {
    expect(leerReportesGuardados(null)).toEqual([]);
    expect(leerReportesGuardados('hola')).toEqual([]);
  });

  test('descarta los mal formados', () => {
    const bueno = { ejercicioId: 'flexiones', youtubeId: 'abc', fecha: '2026-11-25T15:00:00.000Z' };
    expect(
      leerReportesGuardados([
        bueno,
        { ejercicioId: '', youtubeId: 'abc', fecha: bueno.fecha },
        { ejercicioId: 'x', youtubeId: 'abc', fecha: 'ayer' },
        { ejercicioId: 'x', fecha: bueno.fecha },
        null,
      ]),
    ).toEqual([bueno]);
  });
});
