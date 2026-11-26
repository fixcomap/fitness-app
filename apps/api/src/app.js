// La app de Express, sin escuchar en un puerto: así los tests la usan directo.
const express = require('express');
const helmet = require('helmet');
const { LIMITES, SALTOS_PROXY, crearLimitador } = require('./limites');

// limites: para que los tests usen otros números; por defecto, los de limites.js.
function crearApp({ pool, limites = LIMITES }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', SALTOS_PROXY);
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  // Uptime: no toca la base (Neon se suspende entre sondas). Sin límite de pedidos.
  app.get('/vivo', (_req, res) => res.json({ ok: true }));

  // De acá para abajo, todo con el límite general.
  app.use(crearLimitador(limites.general));

  // Health del deploy: si la API no ve la base, el deploy falla
  app.get('/salud', crearLimitador(limites.salud), async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ ok: true, base: true });
    } catch {
      res.status(503).json({ ok: false, base: false });
    }
  });

  app.use((_req, res) => res.status(404).json({ error: 'No encontrado' }));
  return app;
}

module.exports = { crearApp };
