// Historial de sesiones y validación de lo que se lee del almacenamiento.
// Funciones puras: un dato corrupto se descarta en vez de romper la app.
import type {
  EjercicioEnCurso,
  EjercicioHecho,
  SerieEnCurso,
  SerieHecha,
  SesionArmada,
  SesionEnCurso,
  SesionGuardada,
} from './tipos';

// Para no crecer sin límite: se guardan las últimas sesiones.
export const MAXIMO_SESIONES = 1000;

const esObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const esFecha = (x: unknown): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x));
const esTexto = (x: unknown): x is string => typeof x === 'string' && x !== '';
const esEnteroNoNegativo = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;

function esSerieHecha(s: unknown): s is SerieHecha {
  return (
    esObjeto(s) &&
    (s.kg === null || (typeof s.kg === 'number' && Number.isFinite(s.kg) && s.kg >= 0)) &&
    esEnteroNoNegativo(s.reps) &&
    (s.reps as number) > 0 &&
    esEnteroNoNegativo(s.repsObjetivo)
  );
}

function esEjercicioHecho(e: unknown): e is EjercicioHecho {
  return (
    esObjeto(e) &&
    esTexto(e.ejercicioId) &&
    Array.isArray(e.series) &&
    e.series.every(esSerieHecha) &&
    esEnteroNoNegativo(e.seriesTotales)
  );
}

function esSesionGuardada(s: unknown): s is SesionGuardada {
  return (
    esObjeto(s) &&
    esTexto(s.id) &&
    typeof s.nombre === 'string' &&
    esFecha(s.inicio) &&
    esFecha(s.fin) &&
    typeof s.kcal === 'number' &&
    Number.isFinite(s.kcal) &&
    s.kcal >= 0 &&
    Array.isArray(s.ejercicios) &&
    s.ejercicios.every(esEjercicioHecho)
  );
}

export function leerSesionesGuardadas(datos: unknown): SesionGuardada[] {
  if (!Array.isArray(datos)) return [];
  return datos.filter(esSesionGuardada);
}

export function leerArmadaGuardada(datos: unknown): SesionArmada | null {
  if (!esObjeto(datos) || typeof datos.dia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(datos.dia)) return null;
  if (!Array.isArray(datos.ejercicios) || !datos.ejercicios.every(esTexto)) return null;
  return { dia: datos.dia, ejercicios: [...new Set(datos.ejercicios as string[])] };
}

function esSerieEnCurso(s: unknown): s is SerieEnCurso {
  return (
    esObjeto(s) &&
    typeof s.kg === 'string' &&
    typeof s.reps === 'string' &&
    esEnteroNoNegativo(s.repsObjetivo) &&
    typeof s.hecha === 'boolean'
  );
}

function esEjercicioEnCurso(e: unknown): e is EjercicioEnCurso {
  return esObjeto(e) && esTexto(e.ejercicioId) && Array.isArray(e.series) && e.series.every(esSerieEnCurso);
}

// La sesión en curso entera o nada: si algo no cierra, no se retoma.
export function leerEnCursoGuardada(datos: unknown): SesionEnCurso | null {
  if (
    !esObjeto(datos) ||
    !esTexto(datos.id) ||
    typeof datos.nombre !== 'string' ||
    !esFecha(datos.inicio) ||
    !Array.isArray(datos.ejercicios) ||
    datos.ejercicios.length === 0 ||
    !datos.ejercicios.every(esEjercicioEnCurso) ||
    !esEnteroNoNegativo(datos.actual) ||
    (datos.actual as number) >= datos.ejercicios.length ||
    !(datos.descanso === null || (esObjeto(datos.descanso) && esFecha(datos.descanso.fin)))
  ) {
    return null;
  }
  return datos as unknown as SesionEnCurso;
}

// Agrega una sesión al historial, de la más nueva a la más vieja.
export function agregarAlHistorial(historial: readonly SesionGuardada[], sesion: SesionGuardada): SesionGuardada[] {
  return ordenarHistorial([sesion, ...historial.filter((s) => s.id !== sesion.id)]).slice(0, MAXIMO_SESIONES);
}

export function ordenarHistorial(historial: readonly SesionGuardada[]): SesionGuardada[] {
  return [...historial].sort((a, b) => Date.parse(b.fin) - Date.parse(a.fin));
}

export interface SesionDeEjercicio {
  sesionId: string;
  fecha: Date;
  series: SerieHecha[];
}

// Las últimas veces que se hizo un ejercicio, de la más nueva a la más vieja.
export function ultimasSesionesDe(historial: readonly SesionGuardada[], ejercicioId: string, cantidad = 5): SesionDeEjercicio[] {
  const resultado: SesionDeEjercicio[] = [];
  for (const sesion of ordenarHistorial(historial)) {
    const ejercicio = sesion.ejercicios.find((e) => e.ejercicioId === ejercicioId && e.series.length > 0);
    if (ejercicio) resultado.push({ sesionId: sesion.id, fecha: new Date(sesion.fin), series: ejercicio.series });
    if (resultado.length >= cantidad) break;
  }
  return resultado;
}
