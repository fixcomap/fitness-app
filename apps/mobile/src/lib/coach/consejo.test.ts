import pedidoEsperado from './__fixtures__/pedido-consejo.json';
import {
  agregarConsejo,
  armarPedidoConsejo,
  comidasQueQuedan,
  consejoDelDia,
  consejoLocal,
  leerConsejosGuardados,
  leerRespuestaConsejo,
  MAXIMO_CONSEJOS_GUARDADOS,
  momentoDelDia,
  type ConsejoGuardado,
} from './consejo';
import type { ContextoCoach, DiaResumen } from './contexto';

const consejo = (fecha: string, texto = `Consejo del ${fecha}`): ConsejoGuardado => ({
  fecha,
  texto,
  destino: 'coach',
});

const dia = (fecha: string, cambios: Partial<DiaResumen> = {}): DiaResumen => ({
  fecha,
  kcal: 0,
  proteinas: 0,
  carbos: 0,
  grasas: 0,
  comidas: [],
  entrenos: [],
  pasos: 0,
  kcalActividad: 0,
  ...cambios,
});

// Jueves 26/11/2026, con "Piernas" los lunes y jueves.
const contexto = (hoy: Partial<DiaResumen> = {}): ContextoCoach => ({
  hoy: '2026-11-26',
  perfil: {
    sexo: 'hombre',
    edad: 30,
    alturaCm: 178,
    pesoKg: 80,
    objetivoPeso: 'mantener',
    objetivo: 'hipertrofia',
    diasEntrenoPorSemana: 3,
    kcalObjetivo: 2500,
    proteinasObjetivo: 144,
    metaPasos: 8000,
  },
  ultimos7Dias: [dia('2026-11-25', { proteinas: 150 }), dia('2026-11-26', hoy)],
  rutinas: [
    {
      id: 'piernas',
      nombre: 'Piernas',
      dias: [0, 3],
      ejercicios: [
        { ejercicioId: 'sentadilla-barra', series: 4, rango: { min: 6, max: 10 } },
        { ejercicioId: 'prensa', series: 3, rango: { min: 10, max: 12 } },
      ],
    },
  ],
});

describe('leerRespuestaConsejo', () => {
  test('texto y destino; un destino desconocido va al coach', () => {
    expect(leerRespuestaConsejo({ texto: ' Hoy te toca Piernas. ', destino: 'entreno' })).toEqual({
      texto: 'Hoy te toca Piernas.',
      destino: 'entreno',
    });
    expect(leerRespuestaConsejo({ texto: 'Dale', destino: 'perfil' })).toEqual({ texto: 'Dale', destino: 'coach' });
  });

  test('sin texto es null', () => {
    for (const datos of [null, 'hola', {}, { texto: '  ' }, { texto: 3, destino: 'comida' }]) {
      expect(leerRespuestaConsejo(datos)).toBeNull();
    }
  });
});

describe('lo guardado', () => {
  test('descarta lo que no es un consejo y deja los últimos 3 ordenados', () => {
    const guardado = [
      consejo('2026-11-25'),
      { texto: 'sin fecha', destino: 'coach' },
      consejo('2026-11-22'),
      { fecha: '2026-11-24', texto: '' },
      consejo('2026-11-24'),
      consejo('2026-11-23'),
    ];
    expect(leerConsejosGuardados(guardado).map((c) => c.fecha)).toEqual(['2026-11-23', '2026-11-24', '2026-11-25']);
    expect(leerConsejosGuardados(null)).toEqual([]);
    expect(leerConsejosGuardados({ fecha: '2026-11-25' })).toEqual([]);
  });

  test('agregarConsejo reemplaza el del mismo día y deja los últimos 3', () => {
    const guardados = ['2026-11-23', '2026-11-24', '2026-11-25'].map((f) => consejo(f));
    const nuevos = agregarConsejo(guardados, consejo('2026-11-26', 'Nuevo'));
    expect(nuevos).toHaveLength(MAXIMO_CONSEJOS_GUARDADOS);
    expect(nuevos.map((c) => c.fecha)).toEqual(['2026-11-24', '2026-11-25', '2026-11-26']);
    expect(agregarConsejo(nuevos, consejo('2026-11-26', 'Otro')).at(-1)?.texto).toBe('Otro');
  });

  test('consejoDelDia: el guardado de hoy o null si hay que pedirlo', () => {
    const guardados = [consejo('2026-11-25'), { ...consejo('2026-11-26', 'Hoy'), destino: 'comida' as const }];
    expect(consejoDelDia(guardados, '2026-11-26')).toEqual({ texto: 'Hoy', destino: 'comida' });
    expect(consejoDelDia(guardados, '2026-11-27')).toBeNull();
  });
});

describe('armarPedidoConsejo', () => {
  test('manda solo los consejos de días anteriores, recortados', () => {
    const largo = 'x'.repeat(500);
    const pedido = armarPedidoConsejo(contexto(), [consejo('2026-11-24', largo), consejo('2026-11-26')], 8);
    expect(pedido.consejosAnteriores).toEqual([{ fecha: '2026-11-24', texto: 'x'.repeat(400) }]);
    expect(pedido.hora).toBe(8);
  });

  // La API valida este mismo archivo con su esquema (apps/api/test/pedidoApp.test.js).
  test('el pedido de ejemplo que valida la API tiene esta forma', () => {
    const {
      contexto: c,
      hora,
      consejosAnteriores,
    } = pedidoEsperado as unknown as {
      contexto: ContextoCoach;
      hora: number;
      consejosAnteriores: { fecha: string; texto: string }[];
    };
    const guardados = consejosAnteriores.map((a) => ({ ...a, destino: 'comida' as const }));
    expect(armarPedidoConsejo(c, guardados, hora)).toEqual(pedidoEsperado);
  });
});

describe('momento del día', () => {
  test('mañana antes de las 14 o sin comidas cargadas hoy', () => {
    const conComida = dia('2026-11-26', { kcal: 400, comidas: ['Tostadas'] });
    expect(momentoDelDia(8, conComida)).toBe('mañana');
    expect(momentoDelDia(18, dia('2026-11-26'))).toBe('mañana');
    expect(momentoDelDia(18, undefined)).toBe('mañana');
    expect(momentoDelDia(14, conComida)).toBe('tarde');
  });

  test('comidas que quedan: merienda y cena, solo la cena o ninguna', () => {
    expect([14, 16, 17, 21, 22].map(comidasQueQuedan)).toEqual([2, 2, 1, 1, 0]);
  });
});

describe('consejoLocal', () => {
  const entrenado = { nombre: 'Piernas', ejercicios: 2, duracionMin: 50 };

  test('si hoy toca una rutina y no entrenó, el entreno (a cualquier hora)', () => {
    for (const hora of [8, 19]) {
      expect(consejoLocal(contexto(), hora)).toEqual({
        texto: 'Hoy te toca Piernas: 2 ejercicios. Arrancalo cuando puedas y anotá cada serie.',
        destino: 'entreno',
      });
    }
  });

  test('a la mañana habla de la proteína de ayer, nunca de lo que falta hoy', () => {
    const c = { ...contexto(), rutinas: [] };
    c.ultimos7Dias[0] = dia('2026-11-25', { proteinas: 70, kcal: 1800, comidas: ['Fideos'] });
    expect(consejoLocal(c, 8)).toEqual({
      texto:
        'Ayer llegaste a 70 g de proteína de 144. Hoy sumá una porción de pollo, huevos o yogur en el desayuno y otra en el almuerzo.',
      destino: 'comida',
    });
    // Ayer bien (150 g): no hay nada que corregir, solo arrancar el día.
    expect(consejoLocal({ ...contexto(), rutinas: [] }, 8).texto).toMatch(/^Anotá el desayuno/);
    // A las 18 pero sin nada cargado hoy sigue siendo la mañana.
    expect(consejoLocal({ ...contexto(), rutinas: [] }, 18).texto).not.toMatch(/faltan|apuntá/);
  });

  test('a la tarde, solo lo que se puede sumar en las comidas que quedan', () => {
    const hoy = { proteinas: 60, kcal: 900, comidas: ['Milanesa'], entrenos: [entrenado] };
    expect(consejoLocal(contexto(hoy), 18)).toEqual({
      texto: 'Para lo que queda del día, apuntá a 40 g de proteína: pollo, huevos, atún o yogur en la cena.',
      destino: 'comida',
    });
    expect(consejoLocal(contexto(hoy), 15).texto).toMatch(/apuntá a 80 g .* en la merienda y la cena\.$/);
    const sinRutina = { ...contexto({ proteinas: 100, kcal: 1200, comidas: ['Pollo'] }), rutinas: [] };
    expect(consejoLocal(sinRutina, 15).texto).toMatch(/apuntá a 44 g/);
  });

  test('si le falta poca proteína o ya no quedan comidas, invita a charlar con el coach', () => {
    const casi = { ...contexto({ proteinas: 130, kcal: 2000, comidas: ['Asado'] }), rutinas: [] };
    expect(consejoLocal(casi, 16).destino).toBe('coach');
    const tarde = { ...contexto({ proteinas: 60, kcal: 1500, comidas: ['Asado'] }), rutinas: [] };
    expect(consejoLocal(tarde, 23).destino).toBe('coach');
  });
});
