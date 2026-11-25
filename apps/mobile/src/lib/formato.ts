// Formatos de texto para mostrar en pantalla (sin depender de Intl, que varía según el motor).

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// 7842 → "7.842"; redondea al entero.
export function formatearNumero(valor: number): string {
  const entero = Math.round(valor);
  const signo = entero < 0 ? '-' : '';
  return signo + String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// → "Miércoles 25 nov"
export function formatearFechaCorta(fecha: Date): string {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
}

// "Elías" → "E"; sin nombre, un signo de pregunta.
export function inicial(nombre: string): string {
  const limpio = nombre.trim();
  return limpio ? limpio[0].toUpperCase() : '?';
}
