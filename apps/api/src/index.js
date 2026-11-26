const config = require('./config');
const pool = require('./db');
const { crearApp } = require('./app');

const { crearProveedor } = require('./ia');

const app = crearApp({ pool, ia: crearProveedor(config.ia), limitesDiarios: config.ia.limitesDiarios });

const servidor = app.listen(config.puerto, () => {
  console.log(`API escuchando en el puerto ${config.puerto}`);
  const { ia } = config;
  console.log(
    ia.proveedor
      ? `IA: ${ia.proveedor} (foto: ${ia.modeloFoto}, coach: ${ia.modeloCoach})`
      : `IA apagada: ${ia.motivo}`,
  );
});

// Cloud Run manda SIGTERM antes de apagar la instancia: cerrar ordenado
process.on('SIGTERM', () => {
  servidor.close(() => pool.end().finally(() => process.exit(0)));
});
