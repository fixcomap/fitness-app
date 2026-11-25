// Consultas a la fuente de actividad, independientes de cuál sea.
import { inicioDelDia, sumarDias } from '../fechas';
import { horasCandidatas, minutosActivosDeIntervalos, MINUTOS_INTERVALO } from './calculos';
import type { EstadoPermiso, FuenteActividad } from './FuenteActividad';

// Estado de la fuente para la interfaz.
export type EstadoFuente = 'cargando' | 'no-disponible' | 'sin-preguntar' | 'denegado' | 'activa';

export function estadoFuente(disponible: boolean, permiso: EstadoPermiso): Exclude<EstadoFuente, 'cargando'> {
  if (!disponible) return 'no-disponible';
  if (permiso === 'concedido') return 'activa';
  return permiso;
}

export async function leerEstadoFuente(fuente: FuenteActividad): Promise<Exclude<EstadoFuente, 'cargando'>> {
  const disponible = await fuente.disponible();
  if (!disponible) return 'no-disponible';
  return estadoFuente(true, await fuente.permiso());
}

// Pasos entre dos fechas, o null si la fuente falló. Nunca tira error.
export async function leerPasos(fuente: FuenteActividad, inicio: Date, fin: Date): Promise<number | null> {
  try {
    const pasos = await fuente.pasosEntre(inicio, fin);
    return Number.isFinite(pasos) && pasos >= 0 ? Math.round(pasos) : null;
  } catch {
    return null;
  }
}

export function pasosDeHoy(fuente: FuenteActividad, ahora: Date): Promise<number | null> {
  return leerPasos(fuente, inicioDelDia(ahora), ahora);
}

export interface PasosDelDia {
  dia: Date; // inicio del día
  pasos: number; // 0 si la fuente no respondió
}

// Pasos de los últimos `dias` días, del más viejo a hoy (hoy hasta `ahora`).
export async function pasosPorDia(fuente: FuenteActividad, ahora: Date, dias = 7): Promise<PasosDelDia[]> {
  const hoy = inicioDelDia(ahora);
  const consultas = Array.from({ length: dias }, (_, i) => {
    const dia = sumarDias(hoy, i - (dias - 1));
    const fin = i === dias - 1 ? ahora : sumarDias(dia, 1);
    return leerPasos(fuente, dia, fin).then((pasos) => ({ dia, pasos: pasos ?? 0 }));
  });
  return Promise.all(consultas);
}

// Minutos activos de un día según el podómetro, hasta `fin` (o el día entero).
// Primero pide los pasos por hora y después el detalle de 10 min sólo en las horas
// que pueden tener intervalos activos, para no hacer 144 consultas por día.
export async function minutosActivosDelDia(fuente: FuenteActividad, dia: Date, fin: Date): Promise<number> {
  const inicio = inicioDelDia(dia);
  const limite = Math.min(fin.getTime(), sumarDias(inicio, 1).getTime());
  const horas = Math.max(0, Math.ceil((limite - inicio.getTime()) / 3_600_000));
  const desde = (minutos: number) => new Date(inicio.getTime() + minutos * 60_000);
  const hasta = (minutos: number) => new Date(Math.min(inicio.getTime() + minutos * 60_000, limite));

  const porHora = await Promise.all(
    Array.from({ length: horas }, (_, h) => leerPasos(fuente, desde(h * 60), hasta((h + 1) * 60)).then((p) => p ?? 0)),
  );
  const intervalos = await Promise.all(
    horasCandidatas(porHora).flatMap((h) =>
      Array.from({ length: 60 / MINUTOS_INTERVALO }, (_, i) => {
        const m = h * 60 + i * MINUTOS_INTERVALO;
        if (desde(m).getTime() >= limite) return Promise.resolve(0);
        return leerPasos(fuente, desde(m), hasta(m + MINUTOS_INTERVALO)).then((p) => p ?? 0);
      }),
    ),
  );
  return minutosActivosDeIntervalos(intervalos);
}
