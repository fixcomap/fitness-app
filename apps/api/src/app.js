// La app de Express, sin escuchar en un puerto: así los tests la usan directo.
const express = require('express');
const helmet = require('helmet');

function crearApp({ pool }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  // Uptime: no toca la base (Neon se suspende entre sondas)
  app.get('/vivo', (_req, res) => res.json({ ok: true }));

  // Health del deploy: si la API no ve la base, el deploy falla
  app.get('/salud', async (_req, res) => {
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
