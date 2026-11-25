import { kcalCaminata, kmDesdePasos } from './calculos';

describe('kmDesdePasos', () => {
  test('pasos × altura × 0,415', () => {
    // 10.000 pasos × 72,625 cm = 7,2625 km
    expect(kmDesdePasos(10000, 175)).toBeCloseTo(7.2625);
  });

  test('sin pasos o sin altura da 0', () => {
    expect(kmDesdePasos(0, 175)).toBe(0);
    expect(kmDesdePasos(5000, 0)).toBe(0);
  });
});

describe('kcalCaminata', () => {
  test('km × peso × 0,5', () => {
    // 7,2625 km × 75 kg × 0,5 = 272,3
    expect(kcalCaminata(10000, 175, 75)).toBe(272);
  });

  test('sin peso o sin pasos da 0', () => {
    expect(kcalCaminata(10000, 175, 0)).toBe(0);
    expect(kcalCaminata(0, 175, 75)).toBe(0);
  });
});
