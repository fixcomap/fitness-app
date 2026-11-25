import { dimensionesVideo, medioDeEjercicio } from './medio';

describe('medioDeEjercicio', () => {
  test('con youtubeId muestra el video con su formato', () => {
    expect(medioDeEjercicio({ youtubeId: ' abc123 ', videoFormato: 'vertical' })).toEqual({
      tipo: 'youtube',
      videoId: 'abc123',
      formato: 'vertical',
    });
  });

  test('sin formato guardado es horizontal', () => {
    expect(medioDeEjercicio({ youtubeId: 'abc123' })).toEqual({ tipo: 'youtube', videoId: 'abc123', formato: 'horizontal' });
  });

  test('sin youtubeId no hay medio', () => {
    expect(medioDeEjercicio({ youtubeId: '' })).toEqual({ tipo: 'ninguno' });
    expect(medioDeEjercicio({ youtubeId: '   ', videoFormato: 'vertical' })).toEqual({ tipo: 'ninguno' });
  });
});

describe('dimensionesVideo', () => {
  test('horizontal: todo el ancho en 16:9', () => {
    expect(dimensionesVideo(360, 'horizontal', 400)).toEqual({ ancho: 360, alto: 203 });
  });

  test('vertical: 9:16 limitado por el alto máximo, más angosto que el ancho', () => {
    // 360 de ancho daría 640 de alto; con máximo 448 queda 252 × 448.
    expect(dimensionesVideo(360, 'vertical', 448)).toEqual({ ancho: 252, alto: 448 });
  });

  test('vertical en un espacio angosto: usa todo el ancho', () => {
    expect(dimensionesVideo(180, 'vertical', 448)).toEqual({ ancho: 180, alto: 320 });
  });

  test('sin ancho medido todavía da 0', () => {
    expect(dimensionesVideo(0, 'vertical', 448)).toEqual({ ancho: 0, alto: 0 });
  });
});
