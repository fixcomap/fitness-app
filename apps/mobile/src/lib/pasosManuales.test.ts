import {
  borrarCarga,
  descontarRegistrado,
  duracionMin,
  franjaPorDefecto,
  minutosProporcionales,
  moverFranja,
  textoDescuento,
  validarCarga,
  cargasDelDia,
  claveDia,
  convertir,
  crearCarga,
  largoPasoCm,
  leerCargasGuardadas,
  leerValor,
  minutosDesdeKm,
  pasosDesdeKm,
  pasosDesdeMinutos,
  podarCargasViejas,
  totalesCargas,
  type CargaPasos,
  type Franja,
} from './pasosManuales';

const HOMBRE = { alturaCm: 175, sexo: 'hombre' as const };
const MUJER = { alturaCm: 165, sexo: 'mujer' as const };

// Franja de una hora que termina en la fecha dada.
const horaHasta = (fin: Date): Franja => ({ inicio: new Date(fin.getTime() - 3_600_000), fin });
// Carga sin podómetro (nada registrado).
const carga = (tipo: 'km' | 'minutos', valor: number, fin: Date, id: string) =>
  crearCarga({ tipo, valor, franja: horaHasta(fin), registrado: 0 }, HOMBRE, id);

describe('largo de paso', () => {
  test('altura × 0,415 en hombres y × 0,413 en mujeres', () => {
    expect(largoPasoCm(175, 'hombre')).toBeCloseTo(72.625);
    expect(largoPasoCm(165, 'mujer')).toBeCloseTo(68.145);
  });
});

describe('pasosDesdeKm', () => {
  test('km ÷ largo de paso', () => {
    // 200.000 cm / 72,625 cm = 2753,9
    expect(pasosDesdeKm(2, 175, 'hombre')).toBe(2754);
    // 100.000 / 68,145 = 1467,5
    expect(pasosDesdeKm(1, 165, 'mujer')).toBe(1467);
  });

  test('valores no válidos dan 0', () => {
    expect(pasosDesdeKm(0, 175, 'hombre')).toBe(0);
    expect(pasosDesdeKm(-1, 175, 'hombre')).toBe(0);
    expect(pasosDesdeKm(2, 0, 'hombre')).toBe(0);
  });
});

test('pasosDesdeMinutos: 100 pasos por minuto', () => {
  expect(pasosDesdeMinutos(27)).toBe(2700);
  expect(pasosDesdeMinutos(0)).toBe(0);
});

test('minutosDesdeKm: a 5 km/h', () => {
  expect(minutosDesdeKm(5)).toBe(60);
  expect(minutosDesdeKm(2)).toBe(24);
  expect(minutosDesdeKm(0)).toBe(0);
});

describe('convertir', () => {
  test('en km estima los minutos a 5 km/h', () => {
    expect(convertir('km', 2, HOMBRE)).toEqual({ pasos: 2754, minutos: 24 });
  });

  test('en minutos los minutos son los cargados', () => {
    expect(convertir('minutos', 27, MUJER)).toEqual({ pasos: 2700, minutos: 27 });
  });
});

describe('leerValor', () => {
  test('acepta coma o punto decimal', () => {
    expect(leerValor('2,5', 'km')).toBe(2.5);
    expect(leerValor(' 2.5 ', 'km')).toBe(2.5);
    expect(leerValor('30', 'minutos')).toBe(30);
  });

  test('rechaza vacío, texto, cero, negativos y valores exagerados', () => {
    expect(leerValor('', 'km')).toBeNull();
    expect(leerValor('abc', 'km')).toBeNull();
    expect(leerValor('0', 'minutos')).toBeNull();
    expect(leerValor('-3', 'km')).toBeNull();
    expect(leerValor('51', 'km')).toBeNull();
    expect(leerValor('601', 'minutos')).toBeNull();
  });
});

test('claveDia usa la fecha local', () => {
  expect(claveDia(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
});

describe('crearCarga', () => {
  test('sin podómetro suma todo lo estimado', () => {
    expect(carga('minutos', 27, new Date(2026, 10, 25, 9, 5), 'a1')).toEqual({
      id: 'a1',
      dia: '2026-11-25',
      hora: '09:05',
      inicio: '08:05',
      tipo: 'minutos',
      valor: 27,
      pasos: 2700,
      minutos: 27,
      estimado: 2700,
      registrado: 0,
    });
  });

  test('descuenta lo que el celu ya contó en la franja', () => {
    const c = crearCarga(
      { tipo: 'minutos', valor: 41, franja: horaHasta(new Date(2026, 10, 25, 10)), registrado: 1300 },
      HOMBRE,
      'b1',
    );
    expect(c.estimado).toBe(4100);
    expect(c.registrado).toBe(1300);
    expect(c.pasos).toBe(2800);
    // 41 min × 2800 / 4100 = 28 min
    expect(c.minutos).toBe(28);
  });

  test('el día es el del fin de la franja', () => {
    expect(carga('km', 1, new Date(2026, 10, 26, 0, 30), 'c').dia).toBe('2026-11-26');
  });
});

describe('franja horaria', () => {
  const AHORA = new Date(2026, 10, 25, 15, 42, 37);

  test('por defecto es la última hora, sin segundos', () => {
    expect(franjaPorDefecto(AHORA)).toEqual({ inicio: new Date(2026, 10, 25, 14, 42), fin: new Date(2026, 10, 25, 15, 42) });
  });

  test('pasada la medianoche no arranca el día anterior', () => {
    expect(franjaPorDefecto(new Date(2026, 10, 25, 0, 20)).inicio).toEqual(new Date(2026, 10, 25));
  });

  test('duracionMin', () => {
    expect(duracionMin(franjaPorDefecto(AHORA))).toBe(60);
  });

  test('moverFranja corre el inicio o el fin', () => {
    const f = franjaPorDefecto(AHORA);
    expect(moverFranja(f, 'inicio', -15, AHORA).inicio).toEqual(new Date(2026, 10, 25, 14, 27));
    expect(moverFranja(f, 'fin', -15, AHORA).fin).toEqual(new Date(2026, 10, 25, 15, 27));
  });

  test('el fin no pasa de ahora ni el inicio de la medianoche', () => {
    const f = franjaPorDefecto(AHORA);
    expect(moverFranja(f, 'fin', 15, AHORA).fin).toEqual(new Date(2026, 10, 25, 15, 42));
    const temprano = { inicio: new Date(2026, 10, 25, 0, 10), fin: new Date(2026, 10, 25, 1) };
    expect(moverFranja(temprano, 'inicio', -15, AHORA).inicio).toEqual(new Date(2026, 10, 25));
  });

  test('deja al menos 5 minutos entre inicio y fin', () => {
    const corta = { inicio: new Date(2026, 10, 25, 14, 0), fin: new Date(2026, 10, 25, 14, 10) };
    expect(moverFranja(corta, 'inicio', 15, AHORA).inicio).toEqual(new Date(2026, 10, 25, 14, 5));
    expect(moverFranja(corta, 'fin', -15, AHORA).fin).toEqual(new Date(2026, 10, 25, 14, 5));
  });
});

describe('validarCarga', () => {
  const hora = horaHasta(new Date(2026, 10, 25, 10));

  test('los minutos tienen que entrar en el horario', () => {
    expect(validarCarga('minutos', 45, hora)).toBeNull();
    expect(validarCarga('minutos', 90, hora)).toBe('En ese horario entran como mucho 60 min.');
  });

  test('los km no se limitan por el horario', () => {
    expect(validarCarga('km', 10, hora)).toBeNull();
  });
});

describe('descuento de lo que ya contó el celu', () => {
  test('suma la diferencia', () => {
    expect(descontarRegistrado(4100, 1300)).toEqual({ estimado: 4100, registrado: 1300, suma: 2800 });
  });

  test('nunca suma negativo', () => {
    expect(descontarRegistrado(2000, 3500)).toEqual({ estimado: 2000, registrado: 3500, suma: 0 });
  });

  test('minutos en la misma proporción', () => {
    expect(minutosProporcionales(40, { estimado: 4000, registrado: 1000, suma: 3000 })).toBe(30);
    expect(minutosProporcionales(40, { estimado: 0, registrado: 0, suma: 0 })).toBe(0);
  });

  test('texto como en la hoja', () => {
    expect(textoDescuento(descontarRegistrado(4100, 1300), true)).toBe(
      'Estimado 4.100 · el celu ya contó 1.300 · se suman 2.800',
    );
    expect(textoDescuento(descontarRegistrado(4100, 0), false)).toBe('Estimado 4.100 · se suman 4.100');
  });
});

describe('listas de cargas', () => {
  const hoy = new Date(2026, 10, 25, 12);
  const c1 = carga('minutos', 27, hoy, 'c1');
  const c2 = carga('km', 2, hoy, 'c2');
  const ayer = carga('minutos', 10, new Date(2026, 10, 24, 18), 'c3');
  const todas: CargaPasos[] = [c1, c2, ayer];

  test('cargasDelDia filtra por día', () => {
    expect(cargasDelDia(todas, '2026-11-25')).toEqual([c1, c2]);
  });

  test('totalesCargas suma pasos y minutos', () => {
    expect(totalesCargas([c1, c2])).toEqual({ pasos: 2700 + 2754, minutos: 27 + 24 });
    expect(totalesCargas([])).toEqual({ pasos: 0, minutos: 0 });
  });

  test('borrarCarga saca sólo la elegida', () => {
    expect(borrarCarga(todas, 'c2')).toEqual([c1, ayer]);
  });

  test('podarCargasViejas deja los últimos días', () => {
    const vieja = { ...c1, id: 'vieja', dia: '2026-10-01' };
    expect(podarCargasViejas([vieja, ...todas], hoy, 30).map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });
});

describe('leerCargasGuardadas', () => {
  const valida = carga('km', 1, new Date(2026, 10, 25, 8), 'ok');
  const vieja = { id: 'v', dia: '2026-11-20', hora: '10:00', tipo: 'km', valor: 1, pasos: 1377, minutos: 12 };

  test('se queda con las cargas bien formadas', () => {
    expect(leerCargasGuardadas([valida])).toEqual([valida]);
  });

  test('acepta cargas guardadas antes de la carga inteligente (sin franja)', () => {
    expect(leerCargasGuardadas([vieja])).toEqual([vieja]);
  });

  test('descarta datos corruptos', () => {
    expect(leerCargasGuardadas(null)).toEqual([]);
    expect(leerCargasGuardadas('hola')).toEqual([]);
    expect(leerCargasGuardadas([valida, { id: 'x' }, { ...valida, tipo: 'nadar' }, { ...valida, pasos: -5 }])).toEqual([valida]);
  });
});
