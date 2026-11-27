// Consejo del día de Inicio (POST /coach/consejo): lo que se calcula para la IA y la lectura de su respuesta.
// Funciones puras.
const { ErrorIa } = require('./proveedor');
const { DESTINOS_CONSEJO } = require('./esquemas');
const { contextoCoach } = require('./prompts');

// Lo que se ve en la tarjeta: una o dos frases. Si la IA se pasa, se corta.
const MAXIMO_TEXTO_CONSEJO = 300;
// El "mensaje del usuario" del pedido: la charla con la IA tiene que empezar por uno.
const PEDIDO_CONSEJO = 'Dame el consejo de hoy.';

// "2026-11-26" -> 3 (0 = lunes … 6 = domingo, como los días de las rutinas). null si no es una fecha.
function indiceDia(fecha) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha ?? '');
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return (d.getUTCDay() + 6) % 7;
}

// Lo que falta para el objetivo del día. Una diferencia chica cuenta como cumplido (0): si no, la IA le pide
// "28 kcal más" a alguien que ya cerró el día.
const MARGEN_CUMPLIDO = { proteinas: 10, kcal: 100, pasos: 500 };
function restante(objetivo, hecho, margen) {
  const falta = Math.round(objetivo - (hecho ?? 0));
  return falta < margen ? 0 : falta;
}

// Días seguidos con alguna comida registrada, contando hacia atrás desde hoy (si hoy todavía no registró
// nada, desde ayer: el día no terminó).
function rachaComidas(dias, hoy) {
  const conComida = new Set(dias.filter((d) => (d.comidas?.length ?? 0) > 0 || d.kcal > 0).map((d) => d.fecha));
  const ordenadas = dias.map((d) => d.fecha).sort((a, b) => b.localeCompare(a));
  let racha = 0;
  for (const fecha of ordenadas) {
    if (conComida.has(fecha)) racha += 1;
    else if (fecha !== hoy) break;
  }
  return racha;
}

// La mañana (antes de las 14 h, o mientras no haya comidas cargadas hoy): el consejo se basa en ayer, la
// semana y lo planeado hoy, nunca en "te faltan X hoy". Después, en lo del día con metas realistas.
const HORA_TARDE = 14;
// Proteína por comida: unos 0,4 g por kg de peso (30-40 g para la mayoría). Es lo que conviene sumar en cada
// comida y lo que se puede sumar sin forzar en las que quedan.
const PROTEINA_G_POR_KG_COMIDA = 0.4;
const proteinaPorComida = (pesoKg) => Math.round(pesoKg * PROTEINA_G_POR_KG_COMIDA);
// Pasos que se pueden sumar sin forzar en lo que queda del día.
const PASOS_POR_HORA = 1500;
const HORA_FIN_DIA = 22;

// Comidas que quedan en el día a esa hora: merienda y cena, solo la cena o ninguna.
function comidasQueQuedan(hora) {
  if (hora < 17) return 2;
  if (hora < HORA_FIN_DIA) return 1;
  return 0;
}

const tieneComidas = (dia) => !!dia && ((dia.comidas?.length ?? 0) > 0 || dia.kcal > 0);
const promedio = (valores) =>
  valores.length ? Math.round(valores.reduce((total, x) => total + x, 0) / valores.length) : null;

function objetivosDe(perfil) {
  return {
    ...(perfil.proteinasObjetivo !== undefined ? { proteinas: perfil.proteinasObjetivo } : {}),
    ...(perfil.kcalObjetivo !== undefined ? { kcal: perfil.kcalObjetivo } : {}),
    ...(perfil.metaPasos !== undefined ? { pasos: perfil.metaPasos } : {}),
  };
}

// Lo que faltó (o falta) de cada objetivo, con el margen de cumplido.
function faltantes(objetivos, dia) {
  return Object.fromEntries(
    Object.entries(objetivos).map(([clave, objetivo]) => [
      clave,
      restante(objetivo, dia?.[clave], MARGEN_CUMPLIDO[clave]),
    ]),
  );
}

function resumenDia(dia) {
  return {
    proteinas: dia?.proteinas ?? 0,
    kcal: dia?.kcal ?? 0,
    pasos: dia?.pasos ?? 0,
    comidasRegistradas: dia?.comidas?.length ?? 0,
    entrenos: (dia?.entrenos ?? []).map((e) => e.nombre),
  };
}

// 'mañana' o 'tarde' (ver HORA_TARDE).
function momentoDelDia(hora, hoy) {
  return hora < HORA_TARDE || !tieneComidas(hoy) ? 'mañana' : 'tarde';
}

// Lo que calcula la API para que la IA no tenga que hacer cuentas (y errarle). Siempre: el momento, lo
// planeado hoy (rutina y si ya entrenó), ayer, el promedio de la semana y la racha. A la tarde, además, lo que
// falta hoy y una meta realista para lo que queda del día.
function datosDeHoy(contexto, hora) {
  const indice = indiceDia(contexto?.hoy);
  const dias = contexto?.ultimos7Dias ?? [];
  const hoy = dias.find((d) => d.fecha === contexto?.hoy);
  const anteriores = dias.filter((d) => d.fecha < (contexto?.hoy ?? ''));
  const ayer = anteriores.at(-1) ?? null;
  const objetivos = objetivosDe(contexto?.perfil ?? {});
  const conComidas = anteriores.filter(tieneComidas);
  const momento = momentoDelDia(hora, hoy);
  const porComida = proteinaPorComida(contexto?.perfil?.pesoKg ?? 0);

  const datos = {
    momento,
    hora,
    rutinasDeHoy: (contexto?.rutinas ?? []).filter((r) => r.dias.includes(indice)).map((r) => r.nombre),
    entrenoDeHoyHecho: (hoy?.entrenos?.length ?? 0) > 0,
    objetivos,
    proteinaPorComida: porComida,
    ayer: ayer ? { fecha: ayer.fecha, ...resumenDia(ayer), faltaron: faltantes(objetivos, ayer) } : null,
    promedioSemana: {
      diasConComidas: conComidas.length,
      proteinas: promedio(conComidas.map((d) => d.proteinas ?? 0)),
      kcal: promedio(conComidas.map((d) => d.kcal)),
      pasos: promedio(anteriores.map((d) => d.pasos ?? 0)),
    },
    entrenosUltimos7Dias: dias.reduce((total, d) => total + (d.entrenos?.length ?? 0), 0),
    rachaComidas: rachaComidas(dias, contexto?.hoy),
  };
  if (momento === 'mañana') return datos;

  const faltanHoy = faltantes(objetivos, hoy);
  const comidas = comidasQueQuedan(hora);
  const horas = Math.max(0, HORA_FIN_DIA - hora);
  return {
    ...datos,
    hoy: resumenDia(hoy),
    faltanHoy,
    paraLoQueQueda: {
      comidasQueQuedan: comidas,
      ...(faltanHoy.proteinas !== undefined ? { proteinas: Math.min(faltanHoy.proteinas, comidas * porComida) } : {}),
      ...(faltanHoy.pasos !== undefined ? { pasos: Math.min(faltanHoy.pasos, horas * PASOS_POR_HORA) } : {}),
    },
  };
}

// El contexto del coach y, al final, lo calculado para el consejo y los consejos que ya recibió.
function contextoConsejo(contexto, { consejosAnteriores = [], hora }) {
  const extra = { ...datosDeHoy(contexto, hora), consejosAnteriores };
  return `${contextoCoach(contexto)}

Para el consejo de hoy (calculado por la app, en JSON):
${JSON.stringify(extra)}`;
}

// { texto, destino }. Tira ErrorIa si no vino el texto; un destino desconocido pasa a "coach".
function leerConsejo(datos) {
  const texto = typeof datos?.texto === 'string' ? datos.texto.trim().replace(/\s+/g, ' ') : '';
  if (!texto) throw new ErrorIa('formato', 'La IA no devolvió el consejo');
  const destino = DESTINOS_CONSEJO.includes(datos.destino) ? datos.destino : 'coach';
  return { texto: texto.slice(0, MAXIMO_TEXTO_CONSEJO).trim(), destino };
}

module.exports = {
  MAXIMO_TEXTO_CONSEJO,
  MARGEN_CUMPLIDO,
  HORA_TARDE,
  PROTEINA_G_POR_KG_COMIDA,
  proteinaPorComida,
  PEDIDO_CONSEJO,
  indiceDia,
  rachaComidas,
  comidasQueQuedan,
  momentoDelDia,
  datosDeHoy,
  contextoConsejo,
  leerConsejo,
};
