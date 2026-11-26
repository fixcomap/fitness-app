// Compara proveedores y modelos de IA con fotos reales y preguntas de ejemplo para el coach.
// Muestra, para cada uno: resultado, tiempo y costo estimado (tokens × precios-ia.json).
// Acepta fotos .jpg, .jpeg, .png y .heic: las pasa a JPEG (como la app) antes de mandarlas.
// Llama a la IA de verdad (y gasta): no es un test.
//
//   node scripts/probar-ia.mjs ~/fotos-platos --con gemini:gemini-3.8-flash --con claude:claude-haiku-5-5
//
// Las claves salen del .env de la raíz (GEMINI_API_KEY, ANTHROPIC_API_KEY). Vertex usa las credenciales
// de gcloud (gcloud auth application-default login) e IA_VERTEX_PROYECTO.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const raizRepo = path.resolve(aqui, '../../..');
require('dotenv').config({ path: path.join(raizRepo, '.env'), quiet: true });

const { leerConfigIa } = require('../src/ia/config');
const { crearProveedor } = require('../src/ia');
const { leerResultadoFoto } = require('../src/ia/foto');
const { EXTENSIONES, esFoto, fotoAJpeg } = require('./fotos');
const { leerRespuestaCoach } = require('../src/ia/coach');
const {
  USO,
  leerArgumentos,
  estaDentro,
  costoEstimado,
  formatoCosto,
  formatoTokens,
  resumir,
  lineasCoach,
} = require('./comparacion');

const MAXIMO_FOTO = 2 * 1024 * 1024;
const precios = JSON.parse(fs.readFileSync(path.join(aqui, 'precios-ia.json'), 'utf8')).modelos;
const ejemplo = JSON.parse(fs.readFileSync(path.join(aqui, 'preguntas-coach.json'), 'utf8'));
// El catálogo real de la app (ids + nombres), como lo va a mandar la app.
const catalogo = JSON.parse(fs.readFileSync(path.join(raizRepo, 'apps/mobile/src/data/ejercicios.json'), 'utf8')).map(
  ({ id, nombre }) => ({ id, nombre }),
);
console.log(`Catálogo: ${catalogo.length} ejercicios de apps/mobile/src/data/ejercicios.json`);
const contexto = { ...ejemplo.contexto, catalogo };

function salir(mensaje) {
  console.error(`${mensaje}\n\n${USO}`);
  process.exit(1);
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

// Lee las fotos y las pasa a JPEG una sola vez (se usan para todos los candidatos).
async function leerFotos(carpeta) {
  if (estaDentro(carpeta, raizRepo)) salir('Las fotos van en una carpeta fuera del repo.');
  if (!fs.existsSync(carpeta)) salir(`No existe la carpeta ${carpeta}`);
  const nombres = fs.readdirSync(carpeta).filter(esFoto).sort();
  console.log(`Fotos (${nombres.length}), pasadas a JPEG:`);
  const fotos = [];
  for (const nombre of nombres) {
    const original = fs.readFileSync(path.join(carpeta, nombre));
    try {
      const datos = await fotoAJpeg(original);
      const grande = datos.length > MAXIMO_FOTO;
      console.log(`  ${nombre}: ${kb(original.length)} → ${kb(datos.length)}${grande ? ' (más de 2 MB)' : ''}`);
      fotos.push({ nombre, datos, error: grande ? 'pesa más de 2 MB: la API la rechazaría' : null });
    } catch (error) {
      console.log(`  ${nombre}: no se pudo convertir (${error.message})`);
      fotos.push({ nombre, datos: null, error: error.message });
    }
  }
  return fotos;
}

async function medir(pedido) {
  const inicio = performance.now();
  try {
    const resultado = await pedido();
    return { ...resultado, ms: Math.round(performance.now() - inicio) };
  } catch (error) {
    return { error: error.message, ms: Math.round(performance.now() - inicio) };
  }
}

function mostrar(titulo, r, detalle) {
  console.log(`\n  ▸ ${titulo}  (${r.ms} ms, ${r.error ? 'error' : formatoCosto(r.costo)})`);
  if (r.error) return console.log(`    Error: ${r.error}`);
  console.log(`    Tokens: ${formatoTokens(r.uso)}`);
  for (const linea of detalle(r)) console.log(`    ${linea}`);
}

function detalleFoto({ salida }) {
  return [
    ...salida.items.map(
      (i) =>
        `${i.nombre}: ${i.gramos} g, ${i.kcal} kcal (P ${i.proteinas} / C ${i.carbos} / G ${i.grasas}), confianza ${i.confianza}`,
    ),
    `Total: ${salida.total.kcal} kcal, P ${salida.total.proteinas} / C ${salida.total.carbos} / G ${salida.total.grasas}`,
  ];
}

const detalleCoach = ({ salida }) => lineasCoach(salida, catalogo);

async function probar({ proveedor, modelo }, fotos, solo) {
  const env = { ...process.env, IA_PROVEEDOR: proveedor, IA_MODELO_FOTO: modelo, IA_MODELO_COACH: modelo };
  let config;
  try {
    config = leerConfigIa(env);
  } catch (error) {
    console.log(`\n=== ${proveedor}:${modelo} — se saltea: ${error.message}`);
    return null;
  }
  if (!config.proveedor) {
    console.log(`\n=== ${proveedor}:${modelo} — se saltea: ${config.motivo}`);
    return null;
  }
  const ia = crearProveedor(config);
  const precio = precios[modelo];
  const conCosto = (r) => (r.error ? r : { ...r, costo: costoEstimado(r.uso, precio) });
  console.log(`\n=== ${proveedor}:${modelo}${precio ? '' : ' (sin precio en precios-ia.json)'}`);

  const resultados = { fotos: [], coach: [] };
  if (solo !== 'coach') {
    for (const foto of fotos) {
      if (foto.error) {
        console.log(`\n  ▸ ${foto.nombre}: se saltea (${foto.error})`);
        continue;
      }
      const r = conCosto(
        await medir(async () => {
          const respuesta = await ia.analizarFoto(foto.datos, { comida: null });
          return { ...respuesta, salida: leerResultadoFoto(respuesta.datos) };
        }),
      );
      mostrar(foto.nombre, r, detalleFoto);
      resultados.fotos.push(r);
    }
  }
  if (solo !== 'fotos') {
    for (const pregunta of ejemplo.preguntas) {
      const r = conCosto(
        await medir(async () => {
          const respuesta = await ia.responderCoach([{ rol: 'usuario', texto: pregunta }], contexto);
          return { ...respuesta, salida: leerRespuestaCoach(respuesta.datos, catalogo) };
        }),
      );
      mostrar(`"${pregunta}"`, r, detalleCoach);
      resultados.coach.push(r);
    }
  }
  return resultados;
}

const args = leerArgumentos(process.argv.slice(2));
if (args.error) salir(args.error);
const fotos = args.solo === 'coach' ? [] : await leerFotos(path.resolve(args.carpeta));
if (args.solo !== 'coach' && fotos.length === 0) salir(`No hay fotos (${EXTENSIONES.join(', ')}) en la carpeta`);

const resumen = [];
for (const candidato of args.candidatos) {
  const resultados = await probar(candidato, fotos, args.solo);
  if (!resultados) continue;
  for (const tipo of ['fotos', 'coach']) {
    if (resultados[tipo].length === 0) continue;
    const r = resumir(resultados[tipo]);
    resumen.push({
      candidato: `${candidato.proveedor}:${candidato.modelo}`,
      tipo,
      pedidos: r.pedidos,
      errores: r.errores,
      'ms promedio': r.msPromedio ?? '-',
      'costo total': formatoCosto(r.costoTotal),
    });
  }
}
console.log('\n=== Resumen');
if (resumen.length) console.table(resumen);
else console.log('No se probó ningún candidato.');
