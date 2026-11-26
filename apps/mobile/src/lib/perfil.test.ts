import {
  BORRADOR_VACIO,
  borradorDe,
  erroresDe,
  erroresPerfil,
  kcalRecomendadas,
  leerPerfilGuardado,
  metasNutricion,
  perfilDesdeBorrador,
  type BorradorPerfil,
  type PerfilUsuario,
} from './perfil';

const perfil: PerfilUsuario = {
  nombre: 'Ana',
  sexo: 'hombre',
  edad: 30,
  alturaCm: 175,
  pesoKg: 75,
  objetivoPeso: 'mantener',
  objetivo: 'hipertrofia',
  diasEntrenoPorSemana: 3,
  kcalPersonalizadas: null,
  esPremium: false,
};

const borrador: BorradorPerfil = {
  nombre: ' Ana ',
  sexo: 'hombre',
  edad: '30',
  alturaCm: '175',
  pesoKg: '75',
  objetivoPeso: 'mantener',
  objetivo: 'hipertrofia',
  diasEntrenoPorSemana: 3,
};

describe('erroresPerfil', () => {
  test('un borrador completo no tiene errores', () => {
    expect(erroresPerfil(borrador)).toEqual({});
  });

  test('el borrador vacío pide todo lo que falta', () => {
    expect(Object.keys(erroresPerfil(BORRADOR_VACIO)).sort()).toEqual(
      ['alturaCm', 'edad', 'nombre', 'objetivoPeso', 'pesoKg', 'sexo'].sort(),
    );
  });

  test.each([
    ['edad', '13'],
    ['edad', '101'],
    ['edad', '30,5'],
    ['alturaCm', '119'],
    ['alturaCm', '231'],
    ['pesoKg', '29'],
    ['pesoKg', '301'],
    ['pesoKg', '75,55'],
    ['pesoKg', 'abc'],
  ] as const)('%s = %s está fuera de rango o no es un número', (campo, valor) => {
    expect(erroresPerfil({ ...borrador, [campo]: valor })[campo]).toBeDefined();
  });

  test('mensajes', () => {
    expect(erroresPerfil({ ...borrador, edad: '' }).edad).toBe('Escribí un número.');
    expect(erroresPerfil({ ...borrador, edad: '120' }).edad).toBe('Tiene que estar entre 14 y 100 años.');
    expect(erroresPerfil({ ...borrador, nombre: 'x'.repeat(31) }).nombre).toBe('Hasta 30 letras.');
  });

  test('días de entreno entre 0 y 7', () => {
    expect(erroresPerfil({ ...borrador, diasEntrenoPorSemana: 0 })).toEqual({});
    expect(erroresPerfil({ ...borrador, diasEntrenoPorSemana: 8 }).diasEntrenoPorSemana).toBeDefined();
  });

  test('erroresDe filtra por campos (un paso del onboarding)', () => {
    const errores = erroresPerfil(BORRADOR_VACIO);
    expect(Object.keys(erroresDe(errores, ['nombre', 'objetivo']))).toEqual(['nombre']);
  });
});

describe('perfilDesdeBorrador', () => {
  test('convierte los textos y limpia el nombre; acepta coma decimal en el peso', () => {
    expect(perfilDesdeBorrador({ ...borrador, pesoKg: '75,5' })).toEqual({ ...perfil, pesoKg: 75.5 });
  });

  test('con errores, null', () => {
    expect(perfilDesdeBorrador({ ...borrador, edad: '' })).toBeNull();
  });

  test('conserva lo que no se edita en el formulario', () => {
    const extras = { esPremium: true, kcalPersonalizadas: 1900 };
    expect(perfilDesdeBorrador(borrador, extras)).toEqual({ ...perfil, ...extras });
  });

  test('ida y vuelta con borradorDe', () => {
    const conDecimal = { ...perfil, pesoKg: 80.5 };
    expect(borradorDe(conDecimal).pesoKg).toBe('80,5');
    expect(perfilDesdeBorrador(borradorDe(conDecimal))).toEqual(conDecimal);
  });
});

describe('metasNutricion', () => {
  test('kcal recomendadas (basal × 1,2), proteína 1,8 g/kg, grasas 25 %, carbos el resto', () => {
    // Basal 1698,75 × 1,2 = 2039 kcal; 135 g prot (540 kcal), 57 g grasas (513 kcal), 986 kcal → 247 g carbos.
    expect(metasNutricion(perfil)).toEqual({ kcal: 2039, proteinas: 135, grasas: 57, carbos: 247 });
  });

  test('usa el objetivo de peso', () => {
    expect(metasNutricion({ ...perfil, objetivoPeso: 'bajar' })).toEqual({
      kcal: 1639,
      proteinas: 135,
      grasas: 46,
      carbos: 171,
    });
  });

  test('los días de entreno ya no cambian las kcal', () => {
    expect(kcalRecomendadas({ ...perfil, diasEntrenoPorSemana: 0 })).toBe(
      kcalRecomendadas({ ...perfil, diasEntrenoPorSemana: 7 }),
    );
  });

  test('con kcal personalizadas, las macros se calculan con esas', () => {
    expect(metasNutricion({ ...perfil, kcalPersonalizadas: 1800 })).toEqual({
      kcal: 1800,
      proteinas: 135,
      grasas: 50,
      carbos: 203,
    });
    expect(kcalRecomendadas({ ...perfil, kcalPersonalizadas: 1800 })).toBe(2039);
  });

  test('los carbos nunca son negativos', () => {
    expect(metasNutricion({ ...perfil, pesoKg: 300, kcalPersonalizadas: 1000 }).carbos).toBe(0);
  });
});

describe('leerPerfilGuardado', () => {
  test('se lee tal cual', () => {
    expect(leerPerfilGuardado(JSON.parse(JSON.stringify(perfil)))).toEqual(perfil);
  });

  test('sin perfil o con datos fuera de rango, null (se vuelve a pedir)', () => {
    expect(leerPerfilGuardado(null)).toBeNull();
    expect(leerPerfilGuardado([])).toBeNull();
    expect(leerPerfilGuardado({ ...perfil, edad: 5 })).toBeNull();
    expect(leerPerfilGuardado({ ...perfil, pesoKg: '75' })).toBeNull();
    expect(leerPerfilGuardado({ ...perfil, sexo: 'otro' })).toBeNull();
    expect(leerPerfilGuardado({ ...perfil, objetivo: 'cardio' })).toBeNull();
    expect(leerPerfilGuardado({ ...perfil, nombre: '  ' })).toBeNull();
    expect(leerPerfilGuardado({ ...perfil, diasEntrenoPorSemana: 2.5 })).toBeNull();
  });

  test('kcal personalizadas: se conservan si son válidas; si faltan (perfiles de antes) o no, null', () => {
    expect(leerPerfilGuardado({ ...perfil, kcalPersonalizadas: 1800 })?.kcalPersonalizadas).toBe(1800);
    const { kcalPersonalizadas: _, ...viejo } = perfil;
    expect(leerPerfilGuardado(viejo)).toEqual(perfil);
    expect(leerPerfilGuardado({ ...perfil, kcalPersonalizadas: 900 })).toEqual(perfil);
    expect(leerPerfilGuardado({ ...perfil, kcalPersonalizadas: 1800.5 })).toEqual(perfil);
  });

  test('esPremium sólo si está en true', () => {
    expect(leerPerfilGuardado({ ...perfil, esPremium: 'si' })?.esPremium).toBe(false);
  });
});
