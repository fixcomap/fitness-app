// Catálogo de ejercicios de la app, copiado en la API: la imagen de Cloud Run se construye solo con apps/api.
// catalogo.json se regenera con scripts/sincronizar-catalogo.js y un test avisa si quedó viejo.
const { tipoDe } = require('./rangos');

// De los ejercicios de la app (apps/mobile/src/data/ejercicios.json) a lo que usa la API:
// id, nombre, equipo y el tipo que usa la app (el del catálogo o, si no tiene, el de la regla por nombre).
function catalogoParaApi(ejercicios) {
  return ejercicios.map(({ id, nombre, equipo, tipo }) => ({ id, nombre, equipo, tipo: tipoDe({ nombre, tipo }) }));
}

// Una línea por ejercicio, más corto que JSON: "press-banca-barra | Press de banca con barra | barra | compuesto".
function textoCatalogo(catalogo) {
  const lineas = catalogo.map((e) => `${e.id} | ${e.nombre} | ${e.equipo} | ${e.tipo}`);
  return `Catálogo de ejercicios de la app (id | nombre | equipo | tipo):\n${lineas.join('\n')}`;
}

const CATALOGO = require('./catalogo.json');
const TEXTO_CATALOGO = textoCatalogo(CATALOGO);

module.exports = { CATALOGO, TEXTO_CATALOGO, catalogoParaApi, textoCatalogo };
