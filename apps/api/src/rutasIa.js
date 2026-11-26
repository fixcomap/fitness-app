// Rutas de IA: la foto del plato y el coach. La app nunca llama a la IA directo: siempre por acá.
// Cada ruta tiene, en orden: límite por IP, ID de dispositivo, IA disponible, cuerpo, límite diario.
const express = require('express');
const { z } = require('zod');
const { crearLimitador } = require('./limites');
const { exigirDispositivo, respuestaLimiteDiario } = require('./uso');
const { COMIDAS, esJpeg, leerResultadoFoto } = require('./ia/foto');
const { ErrorIa } = require('./ia/proveedor');

const MAXIMO_FOTO = '2mb';
const esquemaComida = z.enum(COMIDAS).optional();

const MENSAJES_ERROR = {
  foto: 'No pudimos analizar la foto, probá de nuevo en un momento',
  rechazoFoto: 'No pudimos analizar esta foto. Probá con otra',
};

function crearRutasIa({ ia, uso, limitesDiarios, limites }) {
  const router = express.Router();
  const limitadorIa = crearLimitador(limites.ia);

  function iaDisponible(_req, res, next) {
    if (!ia) return res.status(503).json({ error: 'La IA no está disponible en este momento' });
    next();
  }

  // Suma un uso del día y corre `pedido`. Si la IA falla, el uso se devuelve.
  async function conUsoDiario(req, res, tipo, pedido, mensajeError) {
    const limite = limitesDiarios[tipo];
    const { permitido } = await uso.consumir(req.usuario, tipo, limite);
    if (!permitido) return res.status(429).json(respuestaLimiteDiario(tipo, limite));
    try {
      res.json(await pedido());
    } catch (error) {
      await uso.devolver(req.usuario, tipo).catch(() => {});
      console.error(`IA (${ia.nombre}, ${tipo}): ${error.message}`);
      const rechazo = error instanceof ErrorIa && error.tipo === 'rechazo';
      res.status(rechazo ? 422 : 502).json({ error: rechazo ? mensajeError.rechazo : mensajeError.otro });
    }
  }

  router.post(
    '/comida/foto',
    limitadorIa,
    exigirDispositivo,
    iaDisponible,
    express.raw({ type: 'image/jpeg', limit: MAXIMO_FOTO }),
    async (req, res) => {
      if (!esJpeg(req.body)) {
        return res.status(415).json({ error: 'Mandá la foto como JPEG (Content-Type: image/jpeg)' });
      }
      const comida = esquemaComida.safeParse(req.query.comida || undefined);
      if (!comida.success) return res.status(400).json({ error: `comida tiene que ser: ${COMIDAS.join(', ')}` });

      await conUsoDiario(
        req,
        res,
        'fotos',
        async () => leerResultadoFoto((await ia.analizarFoto(req.body, { comida: comida.data ?? null })).datos),
        { rechazo: MENSAJES_ERROR.rechazoFoto, otro: MENSAJES_ERROR.foto },
      );
    },
  );

  // Errores al leer el cuerpo (muy grande o mal formado).
  router.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') {
      const foto = req.path === '/comida/foto';
      return res.status(413).json({ error: foto ? 'La foto pesa más de 2 MB' : 'El pedido es demasiado grande' });
    }
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo no es JSON válido' });
    next(error);
  });

  return router;
}

module.exports = { crearRutasIa };
