// El consejo del día de la tarjeta "Tu coach" (Inicio): se pide a POST /coach/consejo una vez por día y se
// guarda con la fecha. Si no se puede (sin internet, error o límite), se arma uno simple en el celular.
// Funciones puras.
import type { ContextoCoach, DiaResumen } from './contexto';

export const DESTINOS_CONSEJO = ['entreno', 'comida', 'actividad', 'coach'] as const;
export type DestinoConsejo = (typeof DESTINOS_CONSEJO)[number];

export interface Consejo {
  texto: string;
  destino: DestinoConsejo;
}

// Lo que se guarda: los últimos consejos de la IA, cada uno con su día ('AAAA-MM-DD').
export interface ConsejoGuardado extends Consejo {
  fecha: string;
}

// Los últimos 3 van a la API para que no repita el tema (la API acepta hasta 3).
export const MAXIMO_CONSEJOS_GUARDADOS = 3;
const MAXIMO_TEXTO_CONSEJO = 400; // el de la API para los consejos anteriores
// Por debajo de esto no vale la pena hablar de la proteína que falta.
const PROTEINA_MINIMA_PARA_AVISAR = 20;

export interface PedidoConsejo {
  contexto: ContextoCoach;
  hora: number; // local, 0-23
  consejosAnteriores: { fecha: string; texto: string }[];
}

const esObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const esDestino = (x: unknown): x is DestinoConsejo => DESTINOS_CONSEJO.includes(x as DestinoConsejo);
const esFecha = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);

// La respuesta de la API: { texto, destino }. null si no tiene texto; un destino desconocido va al coach.
export function leerRespuestaConsejo(datos: unknown): Consejo | null {
  if (!esObjeto(datos) || typeof datos.texto !== 'string' || !datos.texto.trim()) return null;
  return { texto: datos.texto.trim(), destino: esDestino(datos.destino) ? datos.destino : 'coach' };
}

// Lo guardado en el celular, descartando lo que no tenga forma de consejo. Del más viejo al más nuevo.
export function leerConsejosGuardados(guardado: unknown): ConsejoGuardado[] {
  if (!Array.isArray(guardado)) return [];
  return guardado
    .flatMap((c): ConsejoGuardado[] => {
      const consejo = leerRespuestaConsejo(c);
      return consejo && esObjeto(c) && esFecha(c.fecha) ? [{ ...consejo, fecha: c.fecha }] : [];
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(-MAXIMO_CONSEJOS_GUARDADOS);
}

// Suma el consejo de un día (si ya había uno ese día, lo reemplaza) y deja los últimos 3.
export function agregarConsejo(guardados: readonly ConsejoGuardado[], nuevo: ConsejoGuardado): ConsejoGuardado[] {
  return [...guardados.filter((c) => c.fecha !== nuevo.fecha), nuevo]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(-MAXIMO_CONSEJOS_GUARDADOS);
}

// El consejo ya pedido hoy, o null si hay que pedirlo.
export function consejoDelDia(guardados: readonly ConsejoGuardado[], hoy: string): Consejo | null {
  const deHoy = guardados.find((c) => c.fecha === hoy);
  return deHoy ? { texto: deHoy.texto, destino: deHoy.destino } : null;
}

// El pedido a /coach/consejo: el contexto del coach, la hora local (0-23) y los consejos de días anteriores.
export function armarPedidoConsejo(
  contexto: ContextoCoach,
  guardados: readonly ConsejoGuardado[],
  hora: number,
): PedidoConsejo {
  return {
    contexto,
    hora,
    consejosAnteriores: guardados
      .filter((c) => c.fecha < contexto.hoy)
      .slice(-MAXIMO_CONSEJOS_GUARDADOS)
      .map((c) => ({ fecha: c.fecha, texto: c.texto.slice(0, MAXIMO_TEXTO_CONSEJO) })),
  };
}

// 'AAAA-MM-DD' -> 0 (lunes) … 6 (domingo), como los días de las rutinas.
function diaDeSemana(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  return (new Date(a, m - 1, d).getDay() + 6) % 7;
}

// Igual que la API (apps/api/src/ia/consejo.js): a la mañana (antes de las 14 o sin comidas cargadas hoy) no se
// habla de lo que falta hoy; después, solo de lo que se puede sumar sin forzar en lo que queda.
export const HORA_TARDE = 14;
const PROTEINA_POR_COMIDA = 40; // g

export function momentoDelDia(hora: number, hoy: DiaResumen | undefined): 'mañana' | 'tarde' {
  const conComidas = !!hoy && (hoy.comidas.length > 0 || hoy.kcal > 0);
  return hora < HORA_TARDE || !conComidas ? 'mañana' : 'tarde';
}

// Merienda y cena, solo la cena o ninguna.
export function comidasQueQuedan(hora: number): number {
  if (hora < 17) return 2;
  if (hora < 22) return 1;
  return 0;
}

const COMIDAS_QUE_QUEDAN = ['', 'la cena', 'la merienda y la cena'];

// El de repuesto, sin IA: el entreno que toca hoy (si no lo hizo) o la proteína. A la mañana, la de ayer;
// más tarde, la que se puede sumar en las comidas que quedan.
export function consejoLocal(contexto: ContextoCoach, hora: number): Consejo {
  const hoy = contexto.ultimos7Dias.find((d) => d.fecha === contexto.hoy);
  const indice = diaDeSemana(contexto.hoy);
  const rutina = contexto.rutinas.find(
    (r) => (r.dias as readonly number[]).includes(indice) && r.ejercicios.length > 0,
  );
  if (rutina && (hoy?.entrenos.length ?? 0) === 0) {
    const n = rutina.ejercicios.length;
    return {
      texto: `Hoy te toca ${rutina.nombre}: ${n} ${n === 1 ? 'ejercicio' : 'ejercicios'}. Arrancalo cuando puedas y anotá cada serie.`,
      destino: 'entreno',
    };
  }
  const objetivo = contexto.perfil.proteinasObjetivo;

  if (momentoDelDia(hora, hoy) === 'mañana') {
    const ayer = contexto.ultimos7Dias.filter((d) => d.fecha < contexto.hoy).at(-1);
    const conComidas = !!ayer && (ayer.comidas.length > 0 || ayer.kcal > 0);
    if (ayer && conComidas && objetivo - ayer.proteinas >= PROTEINA_MINIMA_PARA_AVISAR) {
      return {
        texto: `Ayer llegaste a ${ayer.proteinas} g de proteína de ${objetivo}. Hoy sumá una porción de pollo, huevos o yogur en el desayuno y otra en el almuerzo.`,
        destino: 'comida',
      };
    }
    return {
      texto: 'Anotá el desayuno apenas lo comas: con eso el coach te ayuda a armar el resto del día.',
      destino: 'comida',
    };
  }

  const comidas = comidasQueQuedan(hora);
  const meta = Math.min(Math.round(objetivo - (hoy?.proteinas ?? 0)), comidas * PROTEINA_POR_COMIDA);
  if (meta >= PROTEINA_MINIMA_PARA_AVISAR) {
    return {
      texto: `Para lo que queda del día, apuntá a ${meta} g de proteína: pollo, huevos, atún o yogur en ${COMIDAS_QUE_QUEDAN[comidas]}.`,
      destino: 'comida',
    };
  }
  return {
    texto: 'Hoy venís bien con la proteína. Si querés, contame cómo te sentís y vemos qué sigue.',
    destino: 'coach',
  };
}
