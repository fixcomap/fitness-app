// Configuración de la IA a partir de las variables de entorno. Función pura: recibe el env.
//
// IA_PROVEEDOR:
//   gemini         Gemini API con GEMINI_API_KEY (solo desarrollo local)
//   claude         Claude con ANTHROPIC_API_KEY (solo desarrollo local)
//   vertex-gemini  Gemini en Vertex AI (producción: cuenta de servicio de Cloud Run, sin claves)
//   vertex-claude  Claude en Vertex AI (ídem)
//   vacío          IA apagada: las rutas de IA responden 503
// En producción solo se aceptan los de Vertex.

const PROVEEDORES = ['gemini', 'claude', 'vertex-gemini', 'vertex-claude'];
const CON_CLAVE = { gemini: 'GEMINI_API_KEY', claude: 'ANTHROPIC_API_KEY' };

// Modelos por defecto si no se indican IA_MODELO_FOTO / IA_MODELO_COACH.
const MODELOS_POR_DEFECTO = {
  gemini: 'gemini-3.8-flash',
  claude: 'claude-haiku-5-5',
};

const LIMITES_DIARIOS_POR_DEFECTO = { fotos: 10, mensajes: 30 };

function familia(proveedor) {
  return proveedor.endsWith('claude') ? 'claude' : 'gemini';
}

function enteroPositivo(texto, porDefecto, nombre) {
  if (texto === undefined || texto === '') return porDefecto;
  const n = Number(texto);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${nombre} tiene que ser un entero mayor que 0`);
  return n;
}

// Devuelve { proveedor, familia, modeloFoto, modeloCoach, ... } o { proveedor: null, motivo } si la IA queda apagada.
// Tira error si la configuración es inválida (la API no arranca).
function leerConfigIa(env, { esProduccion = false } = {}) {
  const limitesDiarios = {
    fotos: enteroPositivo(env.IA_LIMITE_FOTOS_DIA, LIMITES_DIARIOS_POR_DEFECTO.fotos, 'IA_LIMITE_FOTOS_DIA'),
    mensajes: enteroPositivo(
      env.IA_LIMITE_MENSAJES_DIA,
      LIMITES_DIARIOS_POR_DEFECTO.mensajes,
      'IA_LIMITE_MENSAJES_DIA',
    ),
  };
  const proveedor = (env.IA_PROVEEDOR || '').trim();
  if (!proveedor) return { proveedor: null, motivo: 'IA_PROVEEDOR vacío', limitesDiarios };
  if (!PROVEEDORES.includes(proveedor)) {
    throw new Error(`IA_PROVEEDOR inválido: ${proveedor} (opciones: ${PROVEEDORES.join(', ')})`);
  }

  const variableClave = CON_CLAVE[proveedor];
  if (variableClave && esProduccion) {
    throw new Error(`IA_PROVEEDOR=${proveedor} es solo para desarrollo: en producción se usa Vertex AI`);
  }
  // Sin la clave, ese proveedor queda apagado sin romper la API.
  if (variableClave && !env[variableClave]) {
    return { proveedor: null, motivo: `falta ${variableClave}`, limitesDiarios };
  }

  const vertex = proveedor.startsWith('vertex-')
    ? { proyecto: env.IA_VERTEX_PROYECTO || '', region: env.IA_VERTEX_REGION || 'global' }
    : null;
  if (vertex && !vertex.proyecto) throw new Error('Falta IA_VERTEX_PROYECTO para usar Vertex AI');

  const porDefecto = MODELOS_POR_DEFECTO[familia(proveedor)];
  return {
    proveedor,
    familia: familia(proveedor),
    modeloFoto: env.IA_MODELO_FOTO || porDefecto,
    modeloCoach: env.IA_MODELO_COACH || porDefecto,
    clave: variableClave ? env[variableClave] : null,
    vertex,
    limitesDiarios,
  };
}

module.exports = { PROVEEDORES, MODELOS_POR_DEFECTO, LIMITES_DIARIOS_POR_DEFECTO, leerConfigIa };
