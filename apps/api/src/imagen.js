// Fotos del plato: reconocer el formato y pasarlas a JPEG con sharp.
// La app manda JPEG ya preparado (como prepararJpeg); si manda PNG, se convierte acá.
const sharp = require('sharp');

// Lado más largo y calidad del JPEG que se manda a la IA: alcanza para reconocer la comida
// y deja la foto muy por debajo de los 2 MB.
const LADO_MAXIMO = 1600;
const CALIDAD = 80;
// Una imagen chica en bytes puede tener millones de píxeles (y llenar la memoria al abrirla).
const MAXIMO_PIXELES = 50_000_000;

const MARCAS_HEIC = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'];

class ErrorImagen extends Error {
  constructor(tipo, mensaje) {
    super(mensaje);
    this.name = 'ErrorImagen';
    this.tipo = tipo; // 'ilegible' | 'grande'
  }
}

// 'jpeg' | 'png' | 'heic' | null, mirando los primeros bytes (no la extensión ni el Content-Type).
function tipoImagen(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  // HEIC: caja "ftyp" con alguna marca de HEVC (la principal o las compatibles).
  if (buffer.toString('latin1', 4, 8) === 'ftyp') {
    const largo = Math.min(buffer.readUInt32BE(0), buffer.length);
    const marcas = [];
    for (let i = 8; i + 4 <= largo; i += 4) marcas.push(buffer.toString('latin1', i, i + 4));
    if (marcas.some((m) => MARCAS_HEIC.includes(m))) return 'heic';
  }
  return null;
}

// Cualquier imagen que lea sharp (o píxeles crudos: { data, raw: { width, height, channels } })
// a JPEG: respeta la orientación, achica hasta LADO_MAXIMO y pone fondo blanco a lo transparente.
async function prepararJpeg(entrada, { maximoPixeles = MAXIMO_PIXELES } = {}) {
  const crudo = !Buffer.isBuffer(entrada);
  try {
    return await sharp(crudo ? entrada.data : entrada, {
      limitInputPixels: maximoPixeles,
      ...(crudo ? { raw: entrada.raw } : {}),
    })
      .rotate()
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: CALIDAD })
      .toBuffer();
  } catch (error) {
    if (/pixel limit/i.test(error.message)) throw new ErrorImagen('grande', 'La imagen tiene demasiados píxeles');
    throw new ErrorImagen('ilegible', 'No se pudo leer la imagen');
  }
}

module.exports = { LADO_MAXIMO, CALIDAD, MAXIMO_PIXELES, ErrorImagen, tipoImagen, prepararJpeg };
