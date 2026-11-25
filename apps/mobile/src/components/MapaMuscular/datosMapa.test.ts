import { COLOR_PRINCIPAL, COLOR_SECUNDARIO, esMusculo, resaltarMusculos } from './datosMapa';

test('pinta principales en rojo y secundarios en rojo claro', () => {
  expect(resaltarMusculos(['chest'], ['triceps', 'deltoids'])).toEqual(
    expect.arrayContaining([
      { slug: 'chest', color: COLOR_PRINCIPAL },
      { slug: 'triceps', color: COLOR_SECUNDARIO },
      { slug: 'deltoids', color: COLOR_SECUNDARIO },
    ]),
  );
});

test('si un músculo está en las dos listas gana el principal', () => {
  expect(resaltarMusculos(['abs'], ['abs'])).toEqual([{ slug: 'abs', color: COLOR_PRINCIPAL }]);
});

test('sin músculos no pinta nada', () => {
  expect(resaltarMusculos([], [])).toEqual([]);
});

test('reconoce sólo los slugs que usa la app', () => {
  expect(esMusculo('gluteal')).toBe(true);
  expect(esMusculo('head')).toBe(false);
  expect(esMusculo(undefined)).toBe(false);
});
