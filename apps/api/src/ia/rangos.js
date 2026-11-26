// Rango de repeticiones por defecto de la app según el ejercicio y el objetivo. Funciones puras.
// Misma regla que apps/mobile/src/lib/entreno/rangos.ts (rangoPorDefecto): si cambia allá, cambiar acá.

// Equipos sin peso (sin columna KG en la app): apps/mobile/src/lib/entreno/progresion.ts (INCREMENTO_KG null).
const SIN_PESO = ['peso-corporal', 'bandas'];
const EQUIPOS = ['barra', 'barra-z', 'mancuernas', 'kettlebell', 'maquina', 'polea', ...SIN_PESO];
const TIPOS = ['compuesto', 'aislamiento'];

// Palabras del nombre que indican un ejercicio compuesto (sin tildes, en minúscula).
const PALABRAS_COMPUESTO = [
  'press',
  'sentadilla',
  'peso muerto',
  'remo',
  'jalon',
  'dominada',
  'prensa',
  'hip thrust',
  'estocada',
  'zancada',
  'fondos',
  'buenos dias',
  'cargada',
  'subidas al cajon',
];

const sinTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Compuesto o aislamiento: lo que diga el catálogo (campo `tipo`) o, si no, la regla por nombre.
function tipoDe({ nombre, tipo }) {
  if (TIPOS.includes(tipo)) return tipo;
  const n = sinTildes(nombre ?? '');
  return PALABRAS_COMPUESTO.some((p) => n.includes(p)) ? 'compuesto' : 'aislamiento';
}

// - peso corporal y bandas: 8–15
// - compuestos con peso: 6–10 (4–6 si el objetivo es fuerza)
// - aislamiento con peso: 10–15
// null si el catálogo no dice el equipo (no se puede saber).
function rangoDeLaApp(ejercicio, objetivo) {
  if (!EQUIPOS.includes(ejercicio?.equipo)) return null;
  if (SIN_PESO.includes(ejercicio.equipo)) return { min: 8, max: 15 };
  if (tipoDe(ejercicio) === 'aislamiento') return { min: 10, max: 15 };
  return objetivo === 'fuerza' ? { min: 4, max: 6 } : { min: 6, max: 10 };
}

module.exports = { EQUIPOS, TIPOS, tipoDe, rangoDeLaApp };
