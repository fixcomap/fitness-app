// Conversión de fotos del script probar-ia.mjs. El decodificador de HEIC es falso: no hay archivos de prueba.
const test = require('node:test');
const assert = require('node:assert');
const sharp = require('sharp');
const { esFoto, fotoAJpeg } = require('../scripts/fotos');
const { ErrorImagen, tipoImagen } = require('../src/imagen');

// Lo mínimo para que tipoImagen la reconozca como HEIC.
const heic = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic\0\0\0\0mif1heic', 'latin1')]);

test('acepta .jpg, .jpeg, .png y .heic, en mayúsculas o minúsculas', () => {
  for (const nombre of ['a.jpg', 'b.JPEG', 'c.png', 'IMG_0001.HEIC']) assert.strictEqual(esFoto(nombre), true);
  for (const nombre of ['d.gif', 'e.webp', 'f.heic.txt', 'notas']) assert.strictEqual(esFoto(nombre), false);
});

test('HEIC: decodifica los píxeles y arma un JPEG', async () => {
  const llamadas = [];
  const decodificarHeic = async ({ buffer }) => {
    llamadas.push(buffer);
    return { width: 6, height: 4, data: new Uint8ClampedArray(6 * 4 * 4).fill(200) };
  };
  const salida = await fotoAJpeg(heic, { decodificarHeic });
  assert.deepStrictEqual(llamadas, [heic]);
  const { width, height, format } = await sharp(salida).metadata();
  assert.deepStrictEqual({ width, height, format }, { width: 6, height: 4, format: 'jpeg' });
});

test('PNG y JPEG también salen como JPEG preparado, sin usar el decodificador de HEIC', async () => {
  const noUsar = async () => assert.fail('no tenía que decodificar HEIC');
  const png = await sharp({ create: { width: 30, height: 20, channels: 3, background: '#88aa44' } })
    .png()
    .toBuffer();
  const jpeg = await sharp(png).jpeg().toBuffer();
  for (const foto of [png, jpeg]) {
    assert.strictEqual(tipoImagen(await fotoAJpeg(foto, { decodificarHeic: noUsar })), 'jpeg');
  }
});

test('otro formato: ErrorImagen', async () => {
  await assert.rejects(fotoAJpeg(Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00')), (e) => e instanceof ErrorImagen);
});
