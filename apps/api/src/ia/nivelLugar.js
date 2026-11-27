// Nivel del usuario y dónde entrena: qué equipos puede usar el coach. Funciones puras.
// Mismos valores que la app (apps/mobile/src/lib/perfil.ts: NIVELES y LUGARES).

const NIVELES = ['principiante', 'intermedio', 'avanzado'];
const LUGARES = ['gym', 'casa-mancuernas', 'peso-corporal'];
// Perfiles de antes (sin estos datos) o apps viejas que no los mandan.
const NIVEL_POR_DEFECTO = 'intermedio';
const LUGAR_POR_DEFECTO = 'gym';

// Equipos del catálogo (campo `equipo`) que hay en cada lugar; null = todos.
const EQUIPOS_POR_LUGAR = {
  gym: null,
  'casa-mancuernas': ['mancuernas', 'peso-corporal', 'bandas'],
  'peso-corporal': ['peso-corporal', 'bandas'],
};

// true si un ejercicio con ese equipo se puede hacer en ese lugar (sin lugar, el de por defecto).
function equipoDisponible(equipo, lugar = LUGAR_POR_DEFECTO) {
  const equipos = EQUIPOS_POR_LUGAR[lugar] ?? EQUIPOS_POR_LUGAR[LUGAR_POR_DEFECTO];
  return equipos === null || equipos.includes(equipo);
}

module.exports = {
  NIVELES,
  LUGARES,
  NIVEL_POR_DEFECTO,
  LUGAR_POR_DEFECTO,
  EQUIPOS_POR_LUGAR,
  equipoDisponible,
};
