// Fotos en PNG y HEIC: las imágenes se generan con sharp en el momento (no hay archivos de prueba).
const test = require('node:test');
const assert = require('node:assert');
const sharp = require('sharp');
const { LADO_MAXIMO, ErrorImagen, tipoImagen, prepararJpeg } = require('../src/imagen');
const { DISPOSITIVO, iaFalsa, usoEnMemoria, conApp, jpeg } = require('./ayudas');

const crear = (width, height, background, channels = 3) => sharp({ create: { width, height, channels, background } });
const png = (width = 40, height = 30, background = { r: 200, g: 120, b: 40 }) =>
  crear(width, height, background).png().toBuffer();

// Encabezado de un archivo ISO-BMFF (HEIC, AVIF) con su caja ftyp y las marcas dadas.
function ftyp(principal, compatibles) {
  const marcas = [principal, '\0\0\0\0', ...compatibles].join('');
  const caja = Buffer.alloc(8 + marcas.length);
  caja.writeUInt32BE(caja.length, 0);
  caja.write('ftyp', 4, 'latin1');
  caja.write(marcas, 8, 'latin1');
  return Buffer.concat([caja, Buffer.alloc(16)]);
}

test('reconoce el formato por los primeros bytes', async () => {
  assert.strictEqual(tipoImagen(jpeg()), 'jpeg');
  assert.strictEqual(tipoImagen(await png()), 'png');
  assert.strictEqual(tipoImagen(ftyp('heic', ['mif1', 'heic'])), 'heic');
  assert.strictEqual(tipoImagen(ftyp('mif1', ['mif1', 'heic', 'hevc'])), 'heic');
  assert.strictEqual(tipoImagen(ftyp('avif', ['mif1', 'avif'])), null);
  assert.strictEqual(tipoImagen(Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00')), null);
  assert.strictEqual(tipoImagen(Buffer.from('\x89PNG')), null);
  assert.strictEqual(tipoImagen('hola'), null);
  assert.strictEqual(tipoImagen([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]), null);
  assert.strictEqual(tipoImagen({ length: 12, 0: 0xff, 1: 0xd8, 2: 0xff }), null);
});

test('PNG a JPEG, del mismo tamaño si es chico', async () => {
  const salida = await prepararJpeg(await png(40, 30));
  assert.strictEqual(tipoImagen(salida), 'jpeg');
  const { width, height, format } = await sharp(salida).metadata();
  assert.deepStrictEqual({ width, height, format }, { width: 40, height: 30, format: 'jpeg' });
});

test('achica hasta LADO_MAXIMO sin deformar', async () => {
  const salida = await prepararJpeg(await png(3200, 2000));
  const { width, height } = await sharp(salida).metadata();
  assert.deepStrictEqual({ width, height }, { width: LADO_MAXIMO, height: 1000 });
});

test('lo transparente queda blanco (no negro)', async () => {
  const transparente = await crear(10, 10, { r: 0, g: 0, b: 0, alpha: 0 }, 4).png().toBuffer();
  const { data } = await sharp(await prepararJpeg(transparente))
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.ok(data[0] > 245 && data[1] > 245 && data[2] > 245, `vino ${data[0]},${data[1]},${data[2]}`);
});

test('acepta píxeles crudos (así llega una HEIC ya decodificada)', async () => {
  const data = Buffer.alloc(8 * 6 * 4, 255);
  const salida = await prepararJpeg({ data, raw: { width: 8, height: 6, channels: 4 } });
  const { width, height, format } = await sharp(salida).metadata();
  assert.deepStrictEqual({ width, height, format }, { width: 8, height: 6, format: 'jpeg' });
});

test('imagen ilegible o con demasiados píxeles: ErrorImagen', async () => {
  const roto = Buffer.concat([(await png()).subarray(0, 16), Buffer.alloc(50)]);
  await assert.rejects(prepararJpeg(roto), (e) => e instanceof ErrorImagen && e.tipo === 'ilegible');
  await assert.rejects(
    prepararJpeg(await png(40, 30), { maximoPixeles: 100 }),
    (e) => e instanceof ErrorImagen && e.tipo === 'grande',
  );
});

// ── POST /comida/foto con PNG ──

const conPng = { 'X-Dispositivo': DISPOSITIVO, 'Content-Type': 'image/png' };

test('un PNG se convierte a JPEG antes de mandarlo a la IA', async () => {
  const ia = iaFalsa({ foto: { items: [] } });
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const r = await pedir('POST', '/comida/foto', { headers: conPng, cuerpo: await png(2400, 1800) });
    assert.strictEqual(r.status, 200);
    const enviada = ia.llamadas[0].imagen;
    assert.strictEqual(tipoImagen(enviada), 'jpeg');
    assert.strictEqual((await sharp(enviada).metadata()).width, LADO_MAXIMO);
  });
});

test('un JPEG se manda tal cual aunque diga image/png', async () => {
  const ia = iaFalsa({ foto: { items: [] } });
  await conApp({ ia, uso: usoEnMemoria() }, async (pedir) => {
    const foto = jpeg();
    const r = await pedir('POST', '/comida/foto', { headers: conPng, cuerpo: foto });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(ia.llamadas[0].imagen, foto);
  });
});

test('un PNG roto da 415 sin llamar a la IA ni contar el uso', async () => {
  const ia = iaFalsa({ foto: { items: [] } });
  const uso = usoEnMemoria();
  await conApp({ ia, uso }, async (pedir) => {
    const roto = Buffer.concat([(await png()).subarray(0, 16), Buffer.alloc(50)]);
    const r = await pedir('POST', '/comida/foto', { headers: conPng, cuerpo: roto });
    assert.strictEqual(r.status, 415);
    assert.deepStrictEqual(r.body, { error: 'No pudimos leer la foto' });
    assert.strictEqual(ia.llamadas.length, 0);
    assert.strictEqual(uso.usados(DISPOSITIVO, 'fotos'), 0);
  });
});
