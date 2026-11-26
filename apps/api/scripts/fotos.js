// Fotos para probar-ia.mjs: las pasa a JPEG como lo va a hacer la app antes de mandarlas a la API.
// HEIC (iPhone): el sharp que se instala con npm no trae el decodificador de HEVC, así que se
// decodifica con heic-decode (dependencia de desarrollo) y sharp arma el JPEG.
const path = require('path');
const { ErrorImagen, prepararJpeg, tipoImagen } = require('../src/imagen');

const EXTENSIONES = ['.jpg', '.jpeg', '.png', '.heic'];

const esFoto = (nombre) => EXTENSIONES.includes(path.extname(nombre).toLowerCase());

// Cualquier foto (JPEG, PNG o HEIC) a JPEG preparado. decodificarHeic se reemplaza en los tests.
async function fotoAJpeg(datos, { decodificarHeic = require('heic-decode') } = {}) {
  const tipo = tipoImagen(datos);
  if (tipo === 'heic') {
    const { width, height, data } = await decodificarHeic({ buffer: datos });
    const pixeles = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    return prepararJpeg({ data: pixeles, raw: { width, height, channels: 4 } });
  }
  if (tipo === 'jpeg' || tipo === 'png') return prepararJpeg(datos);
  throw new ErrorImagen('ilegible', 'No es JPEG, PNG ni HEIC');
}

module.exports = { EXTENSIONES, esFoto, fotoAJpeg };
