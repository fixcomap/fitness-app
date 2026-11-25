import type { ParImagenes } from '../../data/imagenesEjercicios';
import { dimensionesVideo, INTERVALO_IMAGENES_MS, medioDeEjercicio, miniaturaVideo, siguienteImagen } from './medio';

describe('medioDeEjercicio', () => {
  // En la app son números que devuelve require(); acá alcanza con cualquier fuente.
  const par: ParImagenes = [{ uri: 'inicio.png' }, { uri: 'fin.png' }];
  const imagenes = { 'con-imagenes': par };

  test('con youtubeId muestra el video con su formato', () => {
    expect(medioDeEjercicio({ id: 'x', youtubeId: ' abc123 ', videoFormato: 'vertical' })).toEqual({
      tipo: 'youtube',
      videoId: 'abc123',
      formato: 'vertical',
    });
  });

  test('sin formato guardado es horizontal', () => {
    expect(medioDeEjercicio({ id: 'x', youtubeId: 'abc123' })).toEqual({ tipo: 'youtube', videoId: 'abc123', formato: 'horizontal' });
  });

  test('sin youtubeId ni imágenes no hay medio', () => {
    expect(medioDeEjercicio({ id: 'x', youtubeId: '' }, imagenes)).toEqual({ tipo: 'ninguno' });
    expect(medioDeEjercicio({ id: 'x', youtubeId: '   ', videoFormato: 'vertical' }, imagenes)).toEqual({ tipo: 'ninguno' });
  });

  test('sin youtubeId y con imágenes muestra las dos imágenes', () => {
    expect(medioDeEjercicio({ id: 'con-imagenes', youtubeId: '' }, imagenes)).toEqual({ tipo: 'imagenes', imagenes: par });
  });

  test('si tiene video, el video gana sobre las imágenes', () => {
    expect(medioDeEjercicio({ id: 'con-imagenes', youtubeId: 'abc123' }, imagenes).tipo).toBe('youtube');
  });

  test('por ahora ningún ejercicio del catálogo tiene imágenes', () => {
    expect(medioDeEjercicio({ id: 'dominadas-triangulo', youtubeId: '' })).toEqual({ tipo: 'ninguno' });
  });
});

describe('alternancia de imágenes', () => {
  test('cambia cada 1 segundo', () => {
    expect(INTERVALO_IMAGENES_MS).toBe(1000);
  });

  test('va de una imagen a la otra y vuelve', () => {
    expect(siguienteImagen(0)).toBe(1);
    expect(siguienteImagen(1)).toBe(0);
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

test('miniaturaVideo arma la URL de la miniatura de YouTube', () => {
  expect(miniaturaVideo('Hbt2fEa2cTU')).toBe('https://i.ytimg.com/vi/Hbt2fEa2cTU/hqdefault.jpg');
});
