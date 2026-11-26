// Funciones puras de probar-ia.mjs (argumentos, costo y resumen), con tests.
const path = require('path');

const USO = `Uso: node scripts/probar-ia.mjs <carpeta-de-fotos> --con <proveedor>:<modelo> [--con ...] [--solo fotos|coach]

  <carpeta-de-fotos>  carpeta con fotos .jpg (fuera del repo)
  --con               proveedor y modelo a probar; se puede repetir. Proveedores: gemini, claude,
                      vertex-gemini, vertex-claude. Ej.: --con gemini:gemini-3.8-flash --con claude:claude-opus-5-5
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

// Costo en USD de un pedido, o null si no hay precio para el modelo.
function costoEstimado(uso, precio) {
  if (!precio) return null;
  return (uso.entrada * precio.entrada + uso.salida * precio.salida) / 1e6;
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

module.exports = { USO, leerArgumentos, estaDentro, costoEstimado, formatoCosto, resumir };
