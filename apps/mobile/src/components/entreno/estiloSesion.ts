// Colores y medidas de la pantalla de sesión en curso, tomados del diseño.
// El rojo y el blanco son los de la app (tema.ts); acá van los tonos propios del diseño.
import { colores } from '../../theme/tema';

export const coloresSesion = {
  fondo: '#0F0E0E',
  superficie: '#1C1A19', // botón ✕, Terminar, tarjeta "Siguiente"
  superficieAlta: '#242221', // barra de descanso
  campo: '#262423', // casillas de KG y REPS
  botonDescanso: '#33302F', // −15 y +15
  pista: '#2F2C2B', // segmentos de ejercicios pendientes
  pistaAnillo: '#3A3736', // anillo del descanso y borde del ✓ sin tildar
  checkApagado: '#5A5756',
  avisoFondo: '#2A1511', // aviso de progresión
  serieHecha: '#25120F', // fondo de una serie tildada
  bordeDiscontinuo: '#343333', // "Agregar serie"
  textoTenue: '#8C8988', // etiquetas, "Anterior", "Siguiente"
  textoBoton: '#D8D6D5', // "Agregar serie"
  rojo: colores.acento,
  rojoSuave: colores.acentoSuave, // el peso nuevo a probar
  blanco: colores.texto,
  textoSobreBlanco: colores.textoSobreAcento,
} as const;

export const medidasSesion = {
  margen: 16,
  botonRedondo: 40,
  miniatura: 62,
  alturaFila: 56,
  anchoCasilla: 70,
  altoCasilla: 42,
  check: 42,
  anillo: 56,
} as const;
