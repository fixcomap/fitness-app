import { medioDeEjercicio } from './medio';

test('con youtubeId muestra el video', () => {
  expect(medioDeEjercicio({ youtubeId: ' abc123 ' })).toEqual({ tipo: 'youtube', videoId: 'abc123' });
});

test('sin youtubeId no hay medio', () => {
  expect(medioDeEjercicio({ youtubeId: '' })).toEqual({ tipo: 'ninguno' });
  expect(medioDeEjercicio({ youtubeId: '   ' })).toEqual({ tipo: 'ninguno' });
});
