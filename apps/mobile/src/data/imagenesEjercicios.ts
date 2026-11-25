import type { ImageSourcePropType } from 'react-native';

// Par de imágenes locales (inicio y fin del movimiento) que se muestran
// alternándose en el detalle de un ejercicio sin video.
export type ParImagenes = readonly [ImageSourcePropType, ImageSourcePropType];

// Por id de ejercicio. Las imágenes van en assets/ejercicios/ y se cargan con
// require para que las empaquete Metro, por ejemplo:
//   'dominadas-triangulo': [require('../../assets/ejercicios/dominadas-triangulo-1.png'), require('../../assets/ejercicios/dominadas-triangulo-2.png')],
export const IMAGENES_EJERCICIOS: Readonly<Record<string, ParImagenes>> = {};
