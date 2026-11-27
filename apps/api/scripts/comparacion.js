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
  invalida: 'acciones mal formadas',
  'de-mas': 'sobraban',
  'no-existe': 'no existen en el catálogo',
  'fuera-de-rango': 'fuera de rango',
  repetido: 'repetidos en la rutina',
  'sin-ejercicios': 'sin ejercicios válidos',
  'no-existe-rutina': 'rutinas que no existen',
  'no-esta-en-la-rutina': 'no están en la rutina',
  'rutina-vacia': 'dejaban la rutina vacía',
  'fecha-no-permitida': 'fecha fuera de los últimos 7 días',
  'item-invalido': 'alimentos mal formados',
};

// "Pechuga a la plancha (cocido): 150 g" o "Empanada de carne (cocido, asumido): 2 × empanada ~90 g c/u",
// más lo estimado por 100 g.
function lineaAlimento(item) {
  const estado = item.estado === 'no-aplica' ? '' : ` (${item.estado}${item.estadoAsumido ? ', asumido' : ''})`;
  const c = item.cantidad;
  const cantidad = 'gramos' in c ? `${c.gramos} g` : `${c.unidades} × ${c.porcion} ~${c.gramosPorUnidad} g c/u`;
  const e = item.estimado;
  return `  ${item.busqueda}${estado}: ${cantidad} · estimado c/100 g: ${e.kcal} kcal, P ${e.proteinas} C ${e.carbos} G ${e.grasas}`;
}

// Lo que muestra el script de una respuesta del coach: texto, acciones (con los nombres del catálogo y de las
// rutinas del contexto) y lo descartado, agrupado por motivo.
function lineasCoach(salida, catalogo, rutinas = []) {
  const ejercicio = new Map(catalogo.map((e) => [e.id, e.nombre]));
  const rutina = new Map(rutinas.map((r) => [r.id, r.nombre]));
  const nombreRutina = (id) => (rutina.has(id) ? `"${rutina.get(id)}"` : id);
  const lineaEjercicio = (e) =>
    `  ${ejercicio.get(e.ejercicioId)} [${e.ejercicioId}]: ${e.series} × ${e.rango.min}-${e.rango.max}`;
  const lineas = salida.texto.split('\n').map((l) => `│ ${l}`);
  for (const a of salida.acciones) {
    if (a.tipo === 'crear_rutina') {
      lineas.push(
        `Crear rutina "${a.nombre}" (${a.dia === null ? 'sin día' : DIAS[a.dia]}):`,
        ...a.ejercicios.map(lineaEjercicio),
      );
    } else if (a.tipo === 'agregar_ejercicios') {
      lineas.push(`Agregar a ${nombreRutina(a.rutinaId)}:`, ...a.ejercicios.map(lineaEjercicio));
    } else if (a.tipo === 'quitar_ejercicios') {
      lineas.push(
        `Quitar de ${nombreRutina(a.rutinaId)}: ${a.ejercicioIds.map((id) => ejercicio.get(id) ?? id).join(', ')}`,
      );
    } else if (a.tipo === 'borrar_rutinas') {
      lineas.push(`Borrar rutinas: ${a.rutinaIds.map(nombreRutina).join(', ')}`);
    } else if (a.tipo === 'registrar_comida') {
      lineas.push(`Registrar ${a.comida} del ${a.dia}:`, ...a.items.map(lineaAlimento));
    } else if (a.tipo === 'cargar_pasos') {
      lineas.push(`Cargar pasos del ${a.dia}: ${a.valor} ${a.unidad}${a.hora ? ` (${a.hora})` : ''}`);
    }
  }
  for (const [motivo, texto] of Object.entries(MOTIVOS)) {
    const de = salida.descartados.filter((d) => d.motivo === motivo);
    const detalle = (d) => {
      const que = d.ejercicioId ?? d.busqueda ?? d.rutinaId ?? d.dia;
      return que ? `${que} (${d.rutina ?? d.accion})` : d.accion;
    };
    if (de.length) lineas.push(`Descartados, ${texto}: ${de.map(detalle).join(', ')}`);
  }
  return lineas;
}

module.exports = { USO, leerArgumentos, estaDentro, costoEstimado, formatoCosto, formatoTokens, resumir, lineasCoach };
