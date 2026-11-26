// Funciones puras de probar-ia.mjs (argumentos, costo y resumen), con tests.
const path = require('path');

const USO = `Uso: node scripts/probar-ia.mjs <carpeta-de-fotos> --con <proveedor>:<modelo> [--con ...] [--solo fotos|coach]

  <carpeta-de-fotos>  carpeta con fotos .jpg, .jpeg, .png o .heic (fuera del repo)
  --con               proveedor y modelo a probar; se puede repetir. Proveedores: gemini, claude,
                      vertex-gemini, vertex-claude. Ej.: --con gemini:gemini-3.8-flash --con claude:claude-haiku-5-5
  --solo              probar solo las fotos o solo el coach`;

// { carpeta, candidatos: [{ proveedor, modelo }], solo } o { error }.
function leerArgumentos(argv) {
  const candidatos = [];
  let carpeta = null;
  let solo = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--con') {
      const valor = argv[++i] ?? '';
      const separador = valor.indexOf(':');
      if (separador < 1 || separador === valor.length - 1) {
        return { error: `--con espera proveedor:modelo (vino "${valor}")` };
      }
      candidatos.push({ proveedor: valor.slice(0, separador), modelo: valor.slice(separador + 1) });
    } else if (arg === '--solo') {
      solo = argv[++i];
      if (!['fotos', 'coach'].includes(solo)) return { error: '--solo espera fotos o coach' };
    } else if (arg.startsWith('--')) {
      return { error: `Opción desconocida: ${arg}` };
    } else if (carpeta) {
      return { error: `Sobra el argumento: ${arg}` };
    } else {
      carpeta = arg;
    }
  }
  if (!carpeta && solo !== 'coach') return { error: 'Falta la carpeta de fotos' };
  if (candidatos.length === 0) return { error: 'Falta al menos un --con proveedor:modelo' };
  return { carpeta, candidatos, solo };
}

// true si `ruta` está dentro de `raiz` (o es la misma).
function estaDentro(ruta, raiz) {
  const relativa = path.relative(path.resolve(raiz), path.resolve(ruta));
  return relativa === '' || (!relativa.startsWith('..') && !path.isAbsolute(relativa));
}

// Costo en USD de un pedido, o null si no hay precio para el modelo. uso.entrada es el total de entrada;
// la parte leída o escrita en caché se cobra a su precio (si el modelo no lo tiene, al de entrada).
function costoEstimado(uso, precio) {
  if (!precio) return null;
  const lectura = uso.cacheLectura ?? 0;
  const escritura = uso.cacheEscritura ?? 0;
  const normal = uso.entrada - lectura - escritura;
  const usd =
    normal * precio.entrada +
    lectura * (precio.cacheLectura ?? precio.entrada) +
    escritura * (precio.cacheEscritura ?? precio.entrada) +
    uso.salida * precio.salida;
  return usd / 1e6;
}

// "26166 de entrada (24000 leídos de caché, 0 escritos), 698 de salida"
function formatoTokens(uso) {
  const cache = ` (${uso.cacheLectura ?? 0} leídos de caché, ${uso.cacheEscritura ?? 0} escritos)`;
  return `${uso.entrada} de entrada${cache}, ${uso.salida} de salida`;
}

const formatoCosto = (usd) => (usd === null ? 'sin precio' : `US$ ${usd.toFixed(5)}`);

// Totales por candidato: pedidos, errores, tiempo promedio y costo total (null si falta algún precio).
function resumir(resultados) {
  const ok = resultados.filter((r) => !r.error);
  const costos = ok.map((r) => r.costo);
  return {
    pedidos: resultados.length,
    errores: resultados.length - ok.length,
    msPromedio: ok.length ? Math.round(ok.reduce((t, r) => t + r.ms, 0) / ok.length) : null,
    costoTotal: costos.some((c) => c === null) ? null : costos.reduce((t, c) => t + c, 0),
  };
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MOTIVOS = {
  'no-existe': 'no existen en el catálogo',
  'fuera-de-rango': 'series o repeticiones fuera de rango',
  repetido: 'repetidos en la misma rutina',
  'de-mas': 'sobraban (máximo por rutina)',
};

// Lo que muestra el script de una respuesta del coach: texto, rutinas (con los nombres del catálogo)
// y los ejercicios descartados, agrupados por motivo.
function lineasCoach(salida, catalogo) {
  const nombres = new Map(catalogo.map((e) => [e.id, e.nombre]));
  const lineas = salida.texto.split('\n').map((l) => `│ ${l}`);
  for (const r of salida.rutinas) {
    lineas.push(`Rutina "${r.nombre}" (${r.dias.map((d) => DIAS[d]).join(', ') || 'sin día'}):`);
    for (const e of r.ejercicios) {
      lineas.push(`  ${nombres.get(e.ejercicioId)} [${e.ejercicioId}]: ${e.series} × ${e.rango.min}-${e.rango.max}`);
    }
  }
  for (const [motivo, texto] of Object.entries(MOTIVOS)) {
    const ids = salida.descartados.filter((d) => d.motivo === motivo).map((d) => `${d.ejercicioId} (${d.rutina})`);
    if (ids.length) lineas.push(`Descartados, ${texto}: ${ids.join(', ')}`);
  }
  return lineas;
}

module.exports = { USO, leerArgumentos, estaDentro, costoEstimado, formatoCosto, formatoTokens, resumir, lineasCoach };
