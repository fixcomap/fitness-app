import {
  borrarCarga,
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
} from './pasosManuales';

const HOMBRE = { alturaCm: 175, sexo: 'hombre' as const };
const MUJER = { alturaCm: 165, sexo: 'mujer' as const };

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

test('crearCarga guarda día, hora y la conversión', () => {
  const carga = crearCarga('minutos', 27, HOMBRE, new Date(2026, 10, 25, 9, 5), 'a1');
  expect(carga).toEqual({ id: 'a1', dia: '2026-11-25', hora: '09:05', tipo: 'minutos', valor: 27, pasos: 2700, minutos: 27 });
});

describe('listas de cargas', () => {
  const hoy = new Date(2026, 10, 25, 12);
  const c1 = crearCarga('minutos', 27, HOMBRE, hoy, 'c1');
  const c2 = crearCarga('km', 2, HOMBRE, hoy, 'c2');
  const ayer = crearCarga('minutos', 10, HOMBRE, new Date(2026, 10, 24, 18), 'c3');
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
  const valida = crearCarga('km', 1, HOMBRE, new Date(2026, 10, 25, 8), 'ok');

  test('se queda con las cargas bien formadas', () => {
    expect(leerCargasGuardadas([valida])).toEqual([valida]);
  });

  test('descarta datos corruptos', () => {
    expect(leerCargasGuardadas(null)).toEqual([]);
    expect(leerCargasGuardadas('hola')).toEqual([]);
    expect(leerCargasGuardadas([valida, { id: 'x' }, { ...valida, tipo: 'nadar' }, { ...valida, pasos: -5 }])).toEqual([valida]);
  });
});
