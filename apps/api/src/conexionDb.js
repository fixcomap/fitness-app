// Opciones de conexión de pg a partir de DATABASE_URL.
// Remota (Neon): SSL con certificado verificado. Local (localhost, 127.0.0.1, ::1
// o socket) o con sslmode=disable: sin SSL, como el Postgres de servicio del CI
// o el del docker-compose. sslmode=require/verify-ca/verify-full fuerzan SSL
// verificado aunque el host sea local.

const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const MODOS_CON_SSL = new Set(['require', 'verify-ca', 'verify-full']);

function esHostLocal(host) {
  // Sin host (o con una ruta) la conexión va por socket unix: es local.
  return !host || host.startsWith('/') || HOSTS_LOCALES.has(host.toLowerCase());
}

function conexionDb(databaseUrl) {
  const url = new URL(databaseUrl);
  const sslmode = url.searchParams.get('sslmode');
  const host = url.hostname || url.searchParams.get('host');

  let ssl;
  if (sslmode === 'disable') ssl = false;
  else if (MODOS_CON_SSL.has(sslmode)) ssl = { rejectUnauthorized: true };
  else ssl = esHostLocal(host) ? false : { rejectUnauthorized: true };

  // pg aplica el sslmode de la URL por encima de la opción ssl: se saca para
  // que mande la decisión de acá.
  url.searchParams.delete('sslmode');
  return { connectionString: url.toString(), ssl };
}

module.exports = { conexionDb };
