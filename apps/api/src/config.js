// Configuración de la API a partir de variables de entorno (ver .env.example).
// En producción no hay valores por defecto: si falta una obligatoria, la API no arranca.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env'), quiet: true });
const { leerConfigIa } = require('./ia/config');
const { conexionDb } = require('./conexionDb');

const esProduccion = process.env.NODE_ENV === 'production';

function obligatoria(nombre, porDefecto) {
  const valor = process.env[nombre];
  if (valor) return valor;
  if (esProduccion) throw new Error(`Falta la variable ${nombre}`);
  return porDefecto;
}

const databaseUrl = process.env.DATABASE_URL;

module.exports = {
  esProduccion,
  puerto: Number(process.env.PORT) || 3000,
  apiUrl: obligatoria('API_URL', 'http://localhost:3000'),
  ia: leerConfigIa(process.env, { esProduccion }),
  // Con DATABASE_URL, SSL verificado salvo conexión local o sslmode=disable
  // (ver conexionDb.js); sin ella, el Postgres del docker-compose.
  db: databaseUrl
    ? conexionDb(databaseUrl)
    : {
        host: 'localhost',
        port: 5432,
        user: 'fitness',
        password: obligatoria('POSTGRES_PASSWORD', ''),
        database: 'fitness',
      },
};
