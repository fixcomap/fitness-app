// Copia el catálogo de ejercicios de la app a la API (src/ia/catalogo.json).
// Uso, desde apps/api: node scripts/sincronizar-catalogo.js
const fs = require('fs');
const path = require('path');
const { catalogoParaApi } = require('../src/ia/catalogo');

const origen = path.join(__dirname, '../../mobile/src/data/ejercicios.json');
const destino = path.join(__dirname, '../src/ia/catalogo.json');

const catalogo = catalogoParaApi(JSON.parse(fs.readFileSync(origen, 'utf8')));
fs.writeFileSync(destino, `${JSON.stringify(catalogo, null, 2)}\n`);
console.log(`${catalogo.length} ejercicios en src/ia/catalogo.json`);
