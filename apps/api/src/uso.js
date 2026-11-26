// Usuarios (por ID de dispositivo) y su uso diario de la IA, guardado en la base.
const { z } = require('zod');

// tipo de uso -> columna de uso_diario (nunca se arma SQL con texto que venga de afuera)
const COLUMNAS = { fotos: 'fotos', mensajes: 'mensajes' };
const NOMBRES = { fotos: ['foto', 'fotos'], mensajes: ['mensaje', 'mensajes'] };

// El día cambia a la medianoche de Argentina.
const HOY = `(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`;

const esquemaDispositivo = z.uuid();

// El ID de dispositivo del header X-Dispositivo (un UUID que genera la app), o null si no es válido.
function leerDispositivo(valor) {
  if (typeof valor !== 'string') return null;
  const id = valor.trim().toLowerCase();
  return esquemaDispositivo.safeParse(id).success ? id : null;
}

// Middleware: deja el usuario en req.usuario o corta con 400.
function exigirDispositivo(req, res, next) {
  const usuario = leerDispositivo(req.get('X-Dispositivo'));
  if (!usuario) return res.status(400).json({ error: 'Falta el identificador del dispositivo (X-Dispositivo)' });
  req.usuario = usuario;
  next();
}

function columna(tipo) {
  const col = COLUMNAS[tipo];
  if (!col) throw new Error(`Tipo de uso desconocido: ${tipo}`);
  return col;
}

// La respuesta 429 al llegar al límite del día.
function respuestaLimiteDiario(tipo, limite) {
  const [singular, plural] = NOMBRES[tipo];
  const nombre = limite === 1 ? singular : plural;
  return {
    error: `Llegaste al límite de ${limite} ${nombre} por hoy. Mañana tenés ${limite} ${nombre} de nuevo.`,
    limite,
    quedanHoy: 0,
    quedanManana: limite,
  };
}

function crearUsoDiario(pool) {
  return {
    // Suma un uso si no llegó al límite. { permitido, usados }
    async consumir(usuario, tipo, limite) {
      const col = columna(tipo);
      await pool.query('INSERT INTO usuarios (id) VALUES ($1) ON CONFLICT DO NOTHING', [usuario]);
      const { rows } = await pool.query(
        `INSERT INTO uso_diario (usuario, fecha, ${col}) VALUES ($1, ${HOY}, 1)
         ON CONFLICT (usuario, fecha) DO UPDATE SET ${col} = uso_diario.${col} + 1
         WHERE uso_diario.${col} < $2
         RETURNING ${col} AS usados`,
        [usuario, limite],
      );
      return rows.length > 0 ? { permitido: true, usados: rows[0].usados } : { permitido: false, usados: limite };
    },
    // Devuelve un uso (cuando la IA falló y no fue culpa del usuario).
    async devolver(usuario, tipo) {
      const col = columna(tipo);
      await pool.query(
        `UPDATE uso_diario SET ${col} = ${col} - 1 WHERE usuario = $1 AND fecha = ${HOY} AND ${col} > 0`,
        [usuario],
      );
    },
  };
}

module.exports = { leerDispositivo, exigirDispositivo, respuestaLimiteDiario, crearUsoDiario };
