// Fechas en hora local, sin librerías. Todas devuelven fechas nuevas.

export function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias, fecha.getHours(), fecha.getMinutes(), fecha.getSeconds(), fecha.getMilliseconds());
}

export function sumarMinutos(fecha: Date, minutos: number): Date {
  return new Date(fecha.getTime() + minutos * 60_000);
}

// La semana arranca el lunes.
export function inicioDeSemana(fecha: Date): Date {
  const dia = inicioDelDia(fecha);
  const desdeLunes = (dia.getDay() + 6) % 7;
  return sumarDias(dia, -desdeLunes);
}

// Días que quedan de la semana después de hoy (el domingo da 0).
export function diasRestantesDeSemana(fecha: Date): number {
  return 6 - ((fecha.getDay() + 6) % 7);
}

export function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
