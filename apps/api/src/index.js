const config = require('./config');
const pool = require('./db');
const { crearApp } = require('./app');

const app = crearApp({ pool });

const servidor = app.listen(config.puerto, () => {
  console.log(`API escuchando en el puerto ${config.puerto}`);
});

// Cloud Run manda SIGTERM antes de apagar la instancia: cerrar ordenado
process.on('SIGTERM', () => {
  servidor.close(() => pool.end().finally(() => process.exit(0)));
});
