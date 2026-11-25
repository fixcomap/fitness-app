// Paleta y medidas compartidas de la app (modo oscuro).
export const colores = {
  fondo: '#0E0E0E',
  tarjeta: '#1C1C1C',
  tarjetaElevada: '#262626',
  borde: '#2A2A2A',
  acento: '#E8341C',
  acentoSuave: '#F4A08F',
  texto: '#FFFFFF',
  textoSecundario: '#9A9A9A',
  pista: '#2E2E2E', // fondo de barras y anillos
  textoSobreAcento: '#111111',
  oro: '#D9A94A', // premium
  oroFondo: '#1D1910',
  oroBorde: '#6B5526',
} as const;

export const radios = {
  chico: 10,
  medio: 16,
  grande: 24,
  pill: 999,
} as const;

export const espacios = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;
