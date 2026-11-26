// Límites de pedidos por IP. Cada grupo de rutas tiene el suyo: para sumar uno nuevo
// (por ejemplo, los endpoints de IA) se agrega acá y se usa con crearLimitador().
// El conteo es en memoria, por instancia de Cloud Run.
const { rateLimit } = require('express-rate-limit');

const MINUTO_MS = 60 * 1000;

const LIMITES = {
  // Todas las rutas salvo /vivo
  general: { ventanaMs: MINUTO_MS, maximo: 120 },
  // /salud consulta la base
  salud: { ventanaMs: MINUTO_MS, maximo: 30 },
};

const MENSAJE_LIMITE = { error: 'Demasiados pedidos, probá en un momento' };

// Cloud Run pone un balanceador adelante: se confía sólo en ese salto, así req.ip es la IP
// del cliente (la última de X-Forwarded-For) y no se puede falsear agregando IPs antes.
const SALTOS_PROXY = 1;

function crearLimitador({ ventanaMs, maximo }) {
  return rateLimit({
    windowMs: ventanaMs,
    limit: maximo,
    // RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset y RateLimit-Policy
    standardHeaders: 'draft-6',
    legacyHeaders: false,
    handler: (_req, res, _next, opciones) => res.status(opciones.statusCode).json(MENSAJE_LIMITE),
  });
}

module.exports = { LIMITES, MENSAJE_LIMITE, SALTOS_PROXY, crearLimitador };
