// La foto del plato lista para la API: JPEG, lado mayor 1600 px y calidad 80, hecho en el celu.
// Siempre se vuelve a guardar como JPEG, aunque sea chica: las del iPhone vienen en HEIC (y las capturas,
// en PNG). La cuenta del tamaño está en fotoIa.ts (redimension), con tests; esto es solo lo nativo.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { CALIDAD_JPEG, redimension } from './fotoIa';

export interface FotoLista {
  uri: string; // el JPEG achicado (para mostrarlo)
  jpeg: Blob; // lo que se manda a la API
}

// ancho y alto: los que da el selector de fotos. Si no se saben (0), se manda sin achicar.
export async function prepararFoto(uri: string, ancho: number, alto: number): Promise<FotoLista> {
  const contexto = ImageManipulator.manipulate(uri);
  const tamano = redimension(ancho, alto);
  if (tamano) contexto.resize(tamano);
  const imagen = await contexto.renderAsync();
  const guardada = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: CALIDAD_JPEG });
  // fetch de un archivo local da su contenido como Blob, que es lo que se manda en el cuerpo.
  const jpeg = await (await fetch(guardada.uri)).blob();
  return { uri: guardada.uri, jpeg };
}
