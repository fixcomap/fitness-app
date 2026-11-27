// Configuración de la IA a partir de las variables de entorno. Función pura: recibe el env.
//
// IA_PROVEEDOR:
//   gemini         Gemini API con GEMINI_API_KEY (solo desarrollo local)
//   claude         Claude con ANTHROPIC_API_KEY (solo desarrollo local)
//   vertex-gemini  Gemini en Vertex AI (producción: cuenta de servicio de Cloud Run, sin claves)
//   vertex-claude  Claude en Vertex AI (ídem)
//   falso          respuestas fijas, sin red ni costo, para probar la app (solo desarrollo, ver falso.js)
//   vacío          IA apagada: las rutas de IA responden 503
// En producción solo se aceptan los de Vertex.

const PROVEEDORES = ['gemini', 'claude', 'vertex-gemini', 'vertex-claude', 'falso'];
const SOLO_DESARROLLO = ['gemini', 'claude', 'falso'];
const CON_CLAVE = { gemini: 'GEMINI_API_KEY', claude: 'ANTHROPIC_API_KEY' };

// Modelos por defecto si no se indican IA_MODELO_FOTO / IA_MODELO_COACH.
const MODELOS_POR_DEFECTO = {
  gemini: 'gemini-3.8-flash',
  claude: 'claude-haiku-5-5',
  falso: 'falso',
};

// consejos: el consejo del día de Inicio (la app lo pide una vez; el segundo es por si falla algo).
const LIMITES_DIARIOS_POR_DEFECTO = { fotos: 10, mensajes: 30, consejos: 2 };

function familia(proveedor) {
  if (proveedor === 'falso') return 'falso';
  return proveedor.endsWith('claude') ? 'claude' : 'gemini';
}

function enteroPositivo(texto, porDefecto, nombre) {
  if (texto === undefined || texto === '') return porDefecto;
  const n = Number(texto);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${nombre} tiene que ser un entero mayor que 0`);
  return n;
}

// Vertex AI: IA_VERTEX_PROYECTO (obligatorio) e IA_VERTEX_REGION (vacía: global). Sin claves: se autentica
// con Application Default Credentials (en Cloud Run, la cuenta de servicio; en local, gcloud auth
// application-default login). La región es la del endpoint de Vertex, no la de Cloud Run:
//   global        cualquier región con capacidad (recomendado, el más barato)
//   us / eu       multi-región: los datos quedan en EE. UU. o en la UE (10 % más caro)
//   europe-west1  región puntual (10 % más caro). Claude ahí solo sirve Sonnet 4.6 y anteriores: Haiku 5.5
//                 y los modelos nuevos de Claude solo están en global, us y eu. Gemini sí la acepta.
const MULTI_REGIONES = ['global', 'us', 'eu'];
const FORMATO_REGION = /^[a-z]+-[a-z]+\d+$/;

function leerVertex(env, proveedor) {
  const proyecto = (env.IA_VERTEX_PROYECTO || '').trim();
  const region = (env.IA_VERTEX_REGION || '').trim() || 'global';
  if (!proyecto) throw new Error('Falta IA_VERTEX_PROYECTO para usar Vertex AI');
  const esRegionPuntual = FORMATO_REGION.test(region);
  if (!MULTI_REGIONES.includes(region) && !esRegionPuntual) {
    throw new Error(`IA_VERTEX_REGION inválida: ${region} (global, us, eu o una región como europe-west1)`);
  }
  if (proveedor === 'vertex-claude' && esRegionPuntual) {
    throw new Error(
      `IA_VERTEX_REGION=${region} no sirve con vertex-claude: Haiku 5.5 y los modelos nuevos de Claude solo ` +
        'están en global, us o eu (para que los datos queden en Europa, usá eu)',
    );
  }
  return { proyecto, region };
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
    consejos: enteroPositivo(
      env.IA_LIMITE_CONSEJOS_DIA,
      LIMITES_DIARIOS_POR_DEFECTO.consejos,
      'IA_LIMITE_CONSEJOS_DIA',
    ),
  };
  const proveedor = (env.IA_PROVEEDOR || '').trim();
  if (!proveedor) return { proveedor: null, motivo: 'IA_PROVEEDOR vacío', limitesDiarios };
  if (!PROVEEDORES.includes(proveedor)) {
    throw new Error(`IA_PROVEEDOR inválido: ${proveedor} (opciones: ${PROVEEDORES.join(', ')})`);
  }

  const variableClave = CON_CLAVE[proveedor];
  if (SOLO_DESARROLLO.includes(proveedor) && esProduccion) {
    throw new Error(`IA_PROVEEDOR=${proveedor} es solo para desarrollo: en producción se usa Vertex AI`);
  }
  // Sin la clave, ese proveedor queda apagado sin romper la API.
  if (variableClave && !env[variableClave]) {
    return { proveedor: null, motivo: `falta ${variableClave}`, limitesDiarios };
  }

  const vertex = proveedor.startsWith('vertex-') ? leerVertex(env, proveedor) : null;

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
