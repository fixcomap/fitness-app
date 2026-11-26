// La app de Express, sin escuchar en un puerto: así los tests la usan directo.
const express = require('express');
const helmet = require('helmet');
const { LIMITES, SALTOS_PROXY, crearLimitador } = require('./limites');
const { crearUsoDiario } = require('./uso');
const { crearRutasIa } = require('./rutasIa');
const { LIMITES_DIARIOS_POR_DEFECTO } = require('./ia/config');

// limites: para que los tests usen otros números; por defecto, los de limites.js.
// ia: el proveedor de IA (ia/index.js), o null si está apagada.
// uso: el uso diario de la IA (uso.js); por defecto, en la base.
function crearApp({
  pool,
  limites = {},
  ia = null,
  uso = crearUsoDiario(pool),
  limitesDiarios = LIMITES_DIARIOS_POR_DEFECTO,
}) {
  const todosLosLimites = { ...LIMITES, ...limites };
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', SALTOS_PROXY);
  app.use(helmet());

  // Uptime: no toca la base (Neon se suspende entre sondas). Sin límite de pedidos.
  app.get('/vivo', (_req, res) => res.json({ ok: true }));

  // De acá para abajo, todo con el límite general.
  app.use(crearLimitador(todosLosLimites.general));

  // Las rutas de IA leen su propio cuerpo (la foto pesa más que el límite general).
  app.use(crearRutasIa({ ia, uso, limitesDiarios, limites: todosLosLimites }));

  app.use(express.json({ limit: '10kb' }));

  // Health del deploy: si la API no ve la base, el deploy falla
  app.get('/salud', crearLimitador(todosLosLimites.salud), async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ ok: true, base: true });
    } catch {
      res.status(503).json({ ok: false, base: false });
    }
  });

  app.use((_req, res) => res.status(404).json({ error: 'No encontrado' }));

  // Cualquier otro error, siempre en JSON y sin detalles internos.
  app.use((error, _req, res, _next) => {
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: status === 500 ? 'Error interno' : 'Pedido inválido' });
  });
  return app;
}

module.exports = { crearApp };
