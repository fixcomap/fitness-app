import { caloriasObjetivo, metabolismoBasal, MINIMO_KCAL, type Perfil } from './calorias';

const base: Perfil = {
  sexo: 'hombre',
  edad: 24,
  pesoKg: 75,
  alturaCm: 175,
  diasEntrenoPorSemana: 4,
  objetivo: 'mantener',
};

test('metabolismo basal de Mifflin-St Jeor', () => {
  // 10*75 + 6.25*175 - 5*24 + 5 = 1728.75
  expect(metabolismoBasal(base)).toBeCloseTo(1728.75);
});

test('mantener = basal x factor de actividad', () => {
  expect(caloriasObjetivo(base)).toBe(Math.round(1728.75 * 1.55));
});

test('bajar resta y subir suma un ajuste moderado', () => {
  const mantener = caloriasObjetivo(base);
  expect(caloriasObjetivo({ ...base, objetivo: 'bajar' })).toBe(mantener - 400);
  expect(caloriasObjetivo({ ...base, objetivo: 'subir' })).toBe(mantener + 250);
});

test('nunca baja del mínimo de seguridad', () => {
  const chica: Perfil = { ...base, sexo: 'mujer', pesoKg: 40, alturaCm: 150, edad: 60, diasEntrenoPorSemana: 0, objetivo: 'bajar' };
  expect(caloriasObjetivo(chica)).toBe(MINIMO_KCAL.mujer);
});
