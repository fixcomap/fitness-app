import {
  AVISO_KCAL_BAJAS,
  avisoKcal,
  caloriasObjetivo,
  leerKcalPersonalizadas,
  metabolismoBasal,
  MINIMO_KCAL,
  type Perfil,
} from './calorias';

const base: Perfil = {
  sexo: 'hombre',
  edad: 24,
  pesoKg: 75,
  alturaCm: 175,
  objetivo: 'mantener',
};

test('metabolismo basal de Mifflin-St Jeor', () => {
  // 10*75 + 6.25*175 - 5*24 + 5 = 1728.75
  expect(metabolismoBasal(base)).toBeCloseTo(1728.75);
});

test('mantener = basal × 1,2 (sedentario): la actividad del día se suma aparte', () => {
  expect(caloriasObjetivo(base)).toBe(Math.round(1728.75 * 1.2));
});

test('bajar resta y subir suma un ajuste moderado', () => {
  const mantener = caloriasObjetivo(base);
  expect(caloriasObjetivo({ ...base, objetivo: 'bajar' })).toBe(mantener - 400);
  expect(caloriasObjetivo({ ...base, objetivo: 'subir' })).toBe(mantener + 250);
});

test('hombre, 24 años, 180 cm, 78 kg, bajar: unas 1.750 kcal', () => {
  // (780 + 1125 − 120 + 5) × 1,2 − 400 = 1748
  expect(caloriasObjetivo({ ...base, alturaCm: 180, pesoKg: 78, objetivo: 'bajar' })).toBe(1748);
});

test('nunca baja del mínimo de seguridad', () => {
  const chica: Perfil = { ...base, sexo: 'mujer', pesoKg: 40, alturaCm: 150, edad: 60, objetivo: 'bajar' };
  expect(caloriasObjetivo(chica)).toBe(MINIMO_KCAL.mujer);
});

describe('kcal personalizadas', () => {
  test('enteros entre 1.000 y 5.000, con o sin punto de miles', () => {
    expect(leerKcalPersonalizadas('1800')).toBe(1800);
    expect(leerKcalPersonalizadas(' 2.100 ')).toBe(2100);
    expect(leerKcalPersonalizadas('1000')).toBe(1000);
    expect(leerKcalPersonalizadas('5000')).toBe(5000);
  });

  test('fuera de rango o no numérico, null', () => {
    expect(leerKcalPersonalizadas('999')).toBeNull();
    expect(leerKcalPersonalizadas('5001')).toBeNull();
    expect(leerKcalPersonalizadas('1800,5')).toBeNull();
    expect(leerKcalPersonalizadas('')).toBeNull();
    expect(leerKcalPersonalizadas('mucho')).toBeNull();
  });

  test('aviso por debajo del mínimo de seguridad (1.500 hombre / 1.200 mujer)', () => {
    expect(avisoKcal(1499, 'hombre')).toBe(AVISO_KCAL_BAJAS);
    expect(avisoKcal(1500, 'hombre')).toBeNull();
    expect(avisoKcal(1300, 'mujer')).toBeNull();
    expect(avisoKcal(1199, 'mujer')).toBe(AVISO_KCAL_BAJAS);
  });
});
